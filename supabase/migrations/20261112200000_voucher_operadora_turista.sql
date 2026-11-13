-- EDA_VOUCHER_TURISTA_V1
-- Voucher = comprovante oficial de compra do turista, emitido pela operadora.
-- Regras validadas (12/11/2026):
--   * nasce só da reserva confirmada com pagamento registrado (sinal aceito);
--   * um voucher ativo por reserva (titular + dependentes na lista);
--   * dados congelados na emissão (snapshot); mudou a reserva → nova versão;
--   * check-in só pelo operador (admin/operador da empresa);
--   * sem voucher avulso, sem exclusão (histórico preservado).

-- ---------------------------------------------------------------------------
-- Estrutura
-- ---------------------------------------------------------------------------
alter table public.vouchers
  add column if not exists versao integer not null default 1,
  add column if not exists substitui_id uuid references public.vouchers(id) on delete restrict,
  add column if not exists snapshot jsonb,
  add column if not exists valor_pago numeric(12,2),
  add column if not exists saldo numeric(12,2),
  add column if not exists enviado_em timestamptz,
  add column if not exists reserva_alterada_em timestamptz,
  add column if not exists cancelado_em timestamptz,
  add column if not exists motivo_cancelamento text;

alter table public.vouchers alter column status set default 'Ativo';

-- Novos vouchers sempre ligados a uma reserva (históricos avulsos preservados).
alter table public.vouchers drop constraint if exists vouchers_reserva_obrigatoria;
alter table public.vouchers add constraint vouchers_reserva_obrigatoria
  check (reserva_id is not null) not valid;

alter table public.vouchers drop constraint if exists vouchers_status_eda_check;
alter table public.vouchers add constraint vouchers_status_eda_check
  check (status in ('Ativo', 'Utilizado', 'Cancelado', 'Substituído')) not valid;

-- Um único voucher ativo por reserva.
create unique index if not exists vouchers_um_ativo_por_reserva
  on public.vouchers (reserva_id)
  where reserva_id is not null and lower(coalesce(status, '')) in ('ativo', 'valido');

-- Emissão só pela função; exclusão bloqueada (histórico).
drop policy if exists vouchers_insert_empresa_plano on public.vouchers;
drop policy if exists vouchers_delete_empresa_plano on public.vouchers;

-- ---------------------------------------------------------------------------
-- Quem opera vouchers (emissão e check-in): admin/operador da empresa
-- ---------------------------------------------------------------------------
create or replace function public.eda_voucher_operador()
returns uuid language plpgsql stable security definer set search_path = public as $$
declare v_empresa uuid; v_role text;
begin
  select p.empresa_id, p.role into v_empresa, v_role from public.perfis p where p.id = auth.uid();
  if v_empresa is null or v_role not in ('admin_empresa', 'operador_empresa', 'admin_plataforma') then
    raise exception 'EDA_VOUCHER_SEM_PERMISSAO' using errcode = '42501';
  end if;
  if not public.eda_aal_ok() then raise exception 'EDA_VOUCHER_MFA' using errcode = '42501'; end if;
  if not public.ern_pode_acessar_modulo('vouchers') then raise exception 'EDA_VOUCHER_SEM_PERMISSAO' using errcode = '42501'; end if;
  if not public.empresa_tem_recurso(v_empresa, 'vouchers') then raise exception 'EDA_VOUCHER_PLANO' using errcode = '42501'; end if;
  return v_empresa;
end; $$;
revoke all on function public.eda_voucher_operador() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Proteção: dados emitidos são imutáveis; transições controladas
-- ---------------------------------------------------------------------------
create or replace function public.eda_voucher_imutavel()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_interno boolean := coalesce(current_setting('eda.voucher_interno', true), '') = '1';
  v_ant text := lower(coalesce(old.status, '')); v_novo text := lower(coalesce(new.status, ''));
begin
  if new.codigo is distinct from old.codigo or new.valor is distinct from old.valor
     or new.validade is distinct from old.validade or new.snapshot is distinct from old.snapshot
     or new.versao is distinct from old.versao or new.substitui_id is distinct from old.substitui_id
     or new.token_verificacao is distinct from old.token_verificacao
     or new.valor_pago is distinct from old.valor_pago or new.saldo is distinct from old.saldo
     or new.data_emissao is distinct from old.data_emissao then
    raise exception 'EDA_VOUCHER_IMUTAVEL: os dados emitidos não podem ser alterados. Emita uma nova versão pela reserva.';
  end if;
  if not v_interno and (new.utilizado_em is distinct from old.utilizado_em
     or new.utilizado_por is distinct from old.utilizado_por
     or new.reserva_alterada_em is distinct from old.reserva_alterada_em) then
    raise exception 'EDA_VOUCHER_IMUTAVEL';
  end if;
  if v_novo is distinct from v_ant then
    if v_ant in ('cancelado', 'utilizado', 'substituído', 'substituido') then
      raise exception 'EDA_VOUCHER_FINALIZADO: este voucher já foi encerrado.';
    end if;
    if v_novo = 'cancelado' then
      new.status := 'Cancelado';
      new.cancelado_em := now();
    elsif v_novo in ('utilizado', 'substituído') and v_interno then
      null;
    else
      raise exception 'EDA_VOUCHER_TRANSICAO: o voucher só pode ser cancelado manualmente.';
    end if;
  elsif new.cancelado_em is distinct from old.cancelado_em then
    raise exception 'EDA_VOUCHER_IMUTAVEL';
  end if;
  return new;
end; $$;
revoke all on function public.eda_voucher_imutavel() from public, anon, authenticated;
drop trigger if exists zzz_eda_voucher_imutavel on public.vouchers;
create trigger zzz_eda_voucher_imutavel before update on public.vouchers
  for each row execute function public.eda_voucher_imutavel();

-- ---------------------------------------------------------------------------
-- Emissão a partir da reserva
-- ---------------------------------------------------------------------------
create or replace function public.emitir_voucher_reserva_eda(p_reserva_id uuid, p_substituir boolean default false)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_empresa uuid := public.eda_voucher_operador();
  r public.reservas; v_ant public.vouchers; v_novo public.vouchers;
  v_total numeric; v_pago numeric; v_validade date; v_codigo text; v_snapshot jsonb;
  v_status text;
begin
  select * into r from public.reservas where id = p_reserva_id and empresa_id = v_empresa for update;
  if r.id is null then raise exception 'EDA_VOUCHER_RESERVA_NAO_ENCONTRADA'; end if;

  v_status := translate(lower(btrim(coalesce(r.status, ''))), 'áàâãéêíóôõúüç', 'aaaaeeiooouuc');
  if v_status <> 'confirmada' then raise exception 'EDA_VOUCHER_RESERVA_NAO_CONFIRMADA'; end if;

  v_total := coalesce(nullif(r.valor_total, 0), r.valor);
  if v_total is null or v_total <= 0 then raise exception 'EDA_VOUCHER_SEM_VALOR'; end if;

  select coalesce(sum(f.valor), 0) into v_pago from public.financeiro f
  where f.empresa_id = v_empresa and f.reserva_id = r.id
    and lower(btrim(coalesce(f.tipo, ''))) = 'receita'
    and lower(btrim(coalesce(f.status, ''))) = 'recebido' and f.valor > 0;
  if v_pago <= 0 then raise exception 'EDA_VOUCHER_SEM_PAGAMENTO'; end if;

  select * into v_ant from public.vouchers
  where reserva_id = r.id and empresa_id = v_empresa and lower(coalesce(status, '')) in ('ativo', 'valido')
  for update;
  if v_ant.id is not null and not p_substituir then raise exception 'EDA_VOUCHER_JA_EMITIDO'; end if;

  select coalesce(s.data_fim, r.data_fim_prevista, s.data_inicio, r.data_reserva)
  into v_validade from (select 1) x left join public.passeio_saidas s on s.id = r.saida_id;

  v_snapshot := (
    select jsonb_build_object(
      'operadora', jsonb_build_object('nome', e.nome, 'cnpj', e.cnpj, 'telefone', e.telefone, 'email', e.email,
        'cidade', e.cidade, 'endereco', e.endereco,
        'whatsapp', (select pp.whatsapp from public.perfis_publicos pp
          where pp.empresa_id = v_empresa and pp.origem_tipo = 'empresa' order by pp.publicado desc limit 1)),
      'titular', jsonb_build_object('nome', coalesce(c.nome, r.cliente), 'telefone', c.telefone),
      'passageiros', coalesce((select jsonb_agg(jsonb_build_object('nome', rp.nome, 'relacao', rp.relacao,
          'titular', rp.titular, 'nascimento', rp.data_nascimento) order by rp.titular desc, rp.criado_em)
        from public.reserva_participantes rp where rp.reserva_id = r.id), '[]'::jsonb),
      'quantidades', jsonb_build_object('total', r.quantidade_pessoas, 'criancas', coalesce(r.qtd_criancas, 0), 'colo', coalesce(r.qtd_colo, 0)),
      'passeio', jsonb_build_object('nome', coalesce(p.nome, r.pacote), 'inicio', coalesce(s.data_inicio, r.data_reserva),
        'horario', r.horario, 'fim', coalesce(s.data_fim, r.data_fim_prevista), 'horario_fim', r.horario_fim_previsto,
        'ponto_embarque', p.ponto_embarque, 'inclui', p.inclui, 'nao_inclui', p.nao_inclui, 'duracao', p.duracao,
        'guia', r.guia, 'embarcacao', em.nome),
      'financeiro', jsonb_build_object('total', v_total, 'pago', v_pago, 'saldo', greatest(v_total - v_pago, 0)),
      'fichas', jsonb_build_object(
        'participantes', (select count(*) from public.reserva_participantes rp where rp.reserva_id = r.id),
        'preenchidas', (select count(*) from public.reserva_participantes rp
          join public.participante_fichas pf on pf.participante_id = rp.id where rp.reserva_id = r.id)),
      'emitido_por', auth.uid(), 'emitido_em', now())
    from (select 1) x
    join public.empresa e on e.id = v_empresa
    left join public.clientes c on c.id = r.cliente_id
    left join public.passeios p on p.id = r.passeio_id
    left join public.passeio_saidas s on s.id = r.saida_id
    left join public.embarcacoes em on em.id = r.embarcacao_id
  );

  perform set_config('eda.voucher_interno', '1', true);
  if v_ant.id is not null then
    update public.vouchers set status = 'Substituído' where id = v_ant.id;
  end if;

  loop
    v_codigo := 'EDA-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
    exit when not exists (select 1 from public.vouchers where codigo = v_codigo);
  end loop;

  insert into public.vouchers (codigo, reserva_id, status, cliente_id, passeio_id, valor, validade, empresa_id,
    versao, substitui_id, snapshot, valor_pago, saldo)
  values (v_codigo, r.id, 'Ativo', r.cliente_id, r.passeio_id, v_total, v_validade, v_empresa,
    coalesce(v_ant.versao, 0) + 1, v_ant.id, v_snapshot, v_pago, greatest(v_total - v_pago, 0))
  returning * into v_novo;
  perform set_config('eda.voucher_interno', '', true);

  return jsonb_build_object('id', v_novo.id, 'codigo', v_novo.codigo, 'token', v_novo.token_verificacao, 'versao', v_novo.versao);
end; $$;
revoke all on function public.emitir_voucher_reserva_eda(uuid, boolean) from public, anon;
grant execute on function public.emitir_voucher_reserva_eda(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Check-in (embarque): só operador; não vale para cancelado/substituído
-- ---------------------------------------------------------------------------
create or replace function public.marcar_voucher_utilizado_eda(p_voucher_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_empresa uuid := public.eda_voucher_operador(); v public.vouchers;
begin
  select * into v from public.vouchers where id = p_voucher_id and empresa_id = v_empresa for update;
  if v.id is null then raise exception 'Voucher não encontrado.'; end if;
  if lower(coalesce(v.status, '')) = 'cancelado' then raise exception 'EDA_VOUCHER_CANCELADO'; end if;
  if lower(coalesce(v.status, '')) in ('substituído', 'substituido') then raise exception 'EDA_VOUCHER_SUBSTITUIDO'; end if;
  if v.utilizado_em is not null then raise exception 'EDA_VOUCHER_JA_UTILIZADO'; end if;
  perform set_config('eda.voucher_interno', '1', true);
  update public.vouchers set status = 'Utilizado', utilizado_em = now(), utilizado_por = auth.uid() where id = v.id;
  perform set_config('eda.voucher_interno', '', true);
end; $$;
revoke all on function public.marcar_voucher_utilizado_eda(uuid) from public, anon;
grant execute on function public.marcar_voucher_utilizado_eda(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Ciclo automático: reserva cancelada cancela o voucher; mudança marca
-- "reserva alterada" para o operador emitir nova versão.
-- ---------------------------------------------------------------------------
create or replace function public.eda_voucher_sinalizar_reserva(p_reserva_id uuid, p_cancelar boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_reserva_id is null then return; end if;
  perform set_config('eda.voucher_interno', '1', true);
  begin
    if p_cancelar then
      update public.vouchers set status = 'Cancelado', motivo_cancelamento = 'Reserva cancelada'
      where reserva_id = p_reserva_id and lower(coalesce(status, '')) in ('ativo', 'valido');
    else
      update public.vouchers set reserva_alterada_em = now()
      where reserva_id = p_reserva_id and lower(coalesce(status, '')) in ('ativo', 'valido');
    end if;
  exception when others then
    -- Nunca impedir a operação da reserva/financeiro por causa do voucher.
    raise warning 'EDA voucher não sinalizado (reserva %): %', p_reserva_id, sqlerrm;
  end;
  perform set_config('eda.voucher_interno', '', true);
end; $$;
revoke all on function public.eda_voucher_sinalizar_reserva(uuid, boolean) from public, anon, authenticated;

create or replace function public.eda_voucher_trg_reserva()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_novo text := translate(lower(btrim(coalesce(new.status, ''))), 'áàâãéêíóôõúüç', 'aaaaeeiooouuc');
begin
  if v_novo = 'cancelada' and lower(coalesce(old.status, '')) <> 'cancelada' then
    perform public.eda_voucher_sinalizar_reserva(new.id, true);
  elsif row(new.data_reserva, new.horario, new.quantidade_pessoas, new.qtd_criancas, new.qtd_colo, new.passeio_id,
            new.cliente_id, new.valor_total, new.valor, new.saida_id, new.embarcacao_id, new.guia_id,
            new.data_fim_prevista, new.horario_fim_previsto)
        is distinct from
        row(old.data_reserva, old.horario, old.quantidade_pessoas, old.qtd_criancas, old.qtd_colo, old.passeio_id,
            old.cliente_id, old.valor_total, old.valor, old.saida_id, old.embarcacao_id, old.guia_id,
            old.data_fim_prevista, old.horario_fim_previsto) then
    perform public.eda_voucher_sinalizar_reserva(new.id, false);
  end if;
  return null;
end; $$;
revoke all on function public.eda_voucher_trg_reserva() from public, anon, authenticated;
drop trigger if exists zzzzz_eda_voucher_reserva on public.reservas;
create trigger zzzzz_eda_voucher_reserva after update on public.reservas
  for each row execute function public.eda_voucher_trg_reserva();

create or replace function public.eda_voucher_trg_vinculo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then perform public.eda_voucher_sinalizar_reserva(old.reserva_id, false); end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or new.reserva_id is distinct from old.reserva_id) then
    perform public.eda_voucher_sinalizar_reserva(new.reserva_id, false);
  end if;
  return null;
end; $$;
revoke all on function public.eda_voucher_trg_vinculo() from public, anon, authenticated;
drop trigger if exists zzzzz_eda_voucher_participantes on public.reserva_participantes;
create trigger zzzzz_eda_voucher_participantes after insert or update or delete on public.reserva_participantes
  for each row execute function public.eda_voucher_trg_vinculo();
drop trigger if exists zzzzz_eda_voucher_financeiro on public.financeiro;
create trigger zzzzz_eda_voucher_financeiro after insert or update or delete on public.financeiro
  for each row execute function public.eda_voucher_trg_vinculo();

-- ---------------------------------------------------------------------------
-- Verificação pública: inclui "substituído"
-- ---------------------------------------------------------------------------
create or replace function public.verificar_voucher_eda(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v public.vouchers; v_hoje date := (now() at time zone 'America/Manaus')::date; v_sit text; v_nome text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{32}$' then return null; end if;
  select * into v from public.vouchers where token_verificacao = p_token;
  if v.id is null then return null; end if;
  v_sit := case
    when lower(coalesce(v.status, '')) = 'cancelado' then 'cancelado'
    when lower(coalesce(v.status, '')) in ('substituído', 'substituido') then 'substituido'
    when v.utilizado_em is not null or lower(coalesce(v.status, '')) = 'utilizado' then 'utilizado'
    when v.validade is not null and v.validade < v_hoje then 'vencido'
    else 'valido' end;
  v_nome := split_part(btrim(coalesce(v.cliente_nome, '')), ' ', 1)
    || coalesce(' ' || left(nullif(split_part(btrim(coalesce(v.cliente_nome, '')), ' ', 2), ''), 1) || '.', '');
  return jsonb_build_object(
    'codigo', v.codigo, 'situacao', v_sit, 'titular', nullif(v_nome, ''),
    'passeio', v.passeio_nome, 'data', v.data_passeio, 'horario', v.horario_passeio,
    'pessoas', v.quantidade_pessoas, 'validade', v.validade, 'utilizado_em', v.utilizado_em, 'versao', v.versao,
    'cancelamento', v.motivo_cancelamento,
    'operadora', (select pp.nome_publico from public.perfis_publicos pp
      where pp.empresa_id = v.empresa_id and pp.origem_tipo = 'empresa' and pp.publicado limit 1));
end; $$;
revoke all on function public.verificar_voucher_eda(text) from public;
grant execute on function public.verificar_voucher_eda(text) to anon, authenticated;

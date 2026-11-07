-- EDA_VOUCHERS_PARCEIROS_V1
-- Voucher: documento completo da viagem (saída, embarque, inclusos, hospedagem,
-- participantes) + verificação pública por QR/link e baixa de utilização.
-- Parceiros: reserva indicada/vendida por parceiro com comissão congelada.

-- ---------------------------------------------------------------------------
-- Vouchers
-- ---------------------------------------------------------------------------
-- default volátil preenche os vouchers existentes sem disparar triggers
alter table public.vouchers
  add column if not exists token_verificacao text not null default encode(extensions.gen_random_bytes(16), 'hex'),
  add column if not exists utilizado_em timestamptz,
  add column if not exists utilizado_por uuid;
create unique index if not exists vouchers_token_key on public.vouchers (token_verificacao);

-- Dados completos para o PDF (gestão).
create or replace function public.detalhes_voucher_eda(p_voucher_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_equipe(); v public.vouchers;
begin
  if v_empresa is null then raise exception 'Sem acesso.'; end if;
  select * into v from public.vouchers where id = p_voucher_id and empresa_id = v_empresa;
  if v.id is null then raise exception 'Voucher não encontrado.'; end if;
  return (
    select jsonb_build_object(
      'token', v.token_verificacao,
      'saida_inicio', s.data_inicio, 'saida_fim', coalesce(s.data_fim, r.data_fim_prevista),
      'ponto_embarque', p.ponto_embarque, 'inclui', p.inclui, 'nao_inclui', p.nao_inclui, 'duracao', p.duracao,
      'guia', r.guia, 'embarcacao', e.nome,
      'participantes', coalesce((select jsonb_agg(jsonb_build_object('nome', rp.nome, 'titular', rp.titular,
          'nascimento', rp.data_nascimento) order by rp.titular desc, rp.criado_em)
        from public.reserva_participantes rp where rp.reserva_id = r.id), '[]'::jsonb),
      'hospedagens', coalesce((select jsonb_agg(jsonb_build_object('hospedagem', h.nome, 'acomodacao', a.nome,
          'checkin', rh.checkin, 'checkout', rh.checkout, 'check_in_hora', h.check_in, 'check_out_hora', h.check_out,
          'endereco', h.endereco, 'hospedes', rh.hospedes) order by rh.checkin)
        from public.reserva_hospedagens rh
        join public.hospedagem_acomodacoes a on a.id = rh.acomodacao_id
        join public.hospedagens h on h.id = a.hospedagem_id
        where rh.reserva_id = r.id), '[]'::jsonb))
    from (select 1) x
    left join public.reservas r on r.id = v.reserva_id
    left join public.passeio_saidas s on s.id = r.saida_id
    left join public.passeios p on p.id = coalesce(r.passeio_id, v.passeio_id)
    left join public.embarcacoes e on e.id = r.embarcacao_id
  );
end; $$;

-- Baixa de utilização (embarque/check-in). Não desfaz cancelamento.
create or replace function public.marcar_voucher_utilizado_eda(p_voucher_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_equipe(); v public.vouchers;
begin
  if v_empresa is null then raise exception 'Sem acesso.'; end if;
  select * into v from public.vouchers where id = p_voucher_id and empresa_id = v_empresa for update;
  if v.id is null then raise exception 'Voucher não encontrado.'; end if;
  if lower(coalesce(v.status, '')) = 'cancelado' then raise exception 'EDA_VOUCHER_CANCELADO'; end if;
  if v.utilizado_em is not null then raise exception 'EDA_VOUCHER_JA_UTILIZADO'; end if;
  update public.vouchers set status = 'Utilizado', utilizado_em = now(), utilizado_por = auth.uid()
  where id = v.id;
end; $$;

-- Verificação pública (QR/link): só o necessário para conferir no embarque.
create or replace function public.verificar_voucher_eda(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v public.vouchers; v_hoje date := (now() at time zone 'America/Manaus')::date; v_sit text; v_nome text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{32}$' then return null; end if;
  select * into v from public.vouchers where token_verificacao = p_token;
  if v.id is null then return null; end if;
  v_sit := case
    when lower(coalesce(v.status, '')) = 'cancelado' then 'cancelado'
    when v.utilizado_em is not null or lower(coalesce(v.status, '')) = 'utilizado' then 'utilizado'
    when v.validade is not null and v.validade < v_hoje then 'vencido'
    else 'valido' end;
  -- Primeiro nome + inicial do sobrenome (sem expor o nome completo).
  v_nome := split_part(btrim(coalesce(v.cliente_nome, '')), ' ', 1)
    || coalesce(' ' || left(nullif(split_part(btrim(coalesce(v.cliente_nome, '')), ' ', 2), ''), 1) || '.', '');
  return jsonb_build_object(
    'codigo', v.codigo, 'situacao', v_sit, 'titular', nullif(v_nome, ''),
    'passeio', v.passeio_nome, 'data', v.data_passeio, 'horario', v.horario_passeio,
    'pessoas', v.quantidade_pessoas, 'validade', v.validade, 'utilizado_em', v.utilizado_em,
    'operadora', (select pp.nome_publico from public.perfis_publicos pp
      where pp.empresa_id = v.empresa_id and pp.origem_tipo = 'empresa' and pp.publicado limit 1));
end; $$;

revoke all on function public.detalhes_voucher_eda(uuid) from public, anon;
revoke all on function public.marcar_voucher_utilizado_eda(uuid) from public, anon;
revoke all on function public.verificar_voucher_eda(text) from public;
grant execute on function public.detalhes_voucher_eda(uuid) to authenticated;
grant execute on function public.marcar_voucher_utilizado_eda(uuid) to authenticated;
grant execute on function public.verificar_voucher_eda(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Parceiros: indicação/venda com comissão congelada na reserva
-- ---------------------------------------------------------------------------
alter table public.reservas
  add column if not exists parceiro_id uuid references public.parceiros(id) on delete set null,
  add column if not exists comissao_percentual numeric(5,2);
create index if not exists reservas_parceiro_idx on public.reservas (parceiro_id) where parceiro_id is not null;
alter table public.reservas drop constraint if exists reservas_comissao_check;
alter table public.reservas add constraint reservas_comissao_check check (comissao_percentual is null or comissao_percentual between 0 and 100);

create or replace function public.eda_comissao_parceiro_reserva()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_pct numeric; v_empresa uuid;
begin
  if new.parceiro_id is null then
    new.comissao_percentual := null;
    return new;
  end if;
  if tg_op = 'INSERT' or new.parceiro_id is distinct from old.parceiro_id then
    select comissao_porcentagem, empresa_id into v_pct, v_empresa from public.parceiros where id = new.parceiro_id;
    if v_empresa is distinct from new.empresa_id then
      raise exception 'O parceiro selecionado não pertence a esta empresa.';
    end if;
    -- percentual do momento da venda (mudanças futuras no parceiro não alteram)
    if tg_op = 'INSERT' and new.comissao_percentual is not null then return new; end if;
    new.comissao_percentual := coalesce(v_pct, 0);
  end if;
  return new;
end; $$;
revoke all on function public.eda_comissao_parceiro_reserva() from public, anon, authenticated;
drop trigger if exists zw_eda_comissao_parceiro_reserva on public.reservas;
create trigger zw_eda_comissao_parceiro_reserva before insert or update on public.reservas
  for each row execute function public.eda_comissao_parceiro_reserva();

-- Comissões por parceiro no período (data da viagem).
create or replace function public.comissoes_parceiros_eda(p_de date, p_ate date)
returns table (parceiro_id uuid, parceiro text, reservas integer, pessoas integer, vendido numeric, comissao numeric)
language plpgsql stable security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_equipe();
begin
  if v_empresa is null then raise exception 'Sem acesso.'; end if;
  if p_ate < p_de or p_ate - p_de > 400 then raise exception 'Período inválido.'; end if;
  return query
  select pa.id, pa.nome, count(r.id)::integer,
    coalesce(sum(greatest(coalesce(r.quantidade_pessoas, 1), 1)), 0)::integer,
    coalesce(sum(coalesce(nullif(r.valor_total, 0), r.valor, 0)), 0)::numeric,
    round(coalesce(sum(coalesce(nullif(r.valor_total, 0), r.valor, 0) * coalesce(r.comissao_percentual, 0) / 100), 0), 2)::numeric
  from public.parceiros pa
  join public.reservas r on r.parceiro_id = pa.id
  left join public.passeio_saidas s on s.id = r.saida_id
  where pa.empresa_id = v_empresa and lower(coalesce(r.status, '')) <> 'cancelada'
    and coalesce(s.data_inicio, r.data_reserva) between p_de and p_ate
  group by pa.id, pa.nome
  order by 6 desc;
end; $$;
revoke all on function public.comissoes_parceiros_eda(date, date) from public, anon;
grant execute on function public.comissoes_parceiros_eda(date, date) to authenticated;

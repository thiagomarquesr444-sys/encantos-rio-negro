-- EDA_FICHA_SAUDE_V1
-- Participantes da reserva + ficha de saúde e segurança por pessoa.
-- Dado de saúde é dado pessoal sensível (LGPD art. 11):
--   * tabela de fichas sem acesso direto: só via funções, que checam a função
--     do usuário (admin_empresa/operador_empresa) e registram cada acesso;
--   * consentimento obrigatório em toda gravação;
--   * exclusão automática 120 dias após o fim da viagem (pg_cron diário).
-- Preenchimento: operadora (gestão) e turista (link pré-viagem com token).

-- ---------------------------------------------------------------------------
-- Participantes
-- ---------------------------------------------------------------------------
create table if not exists public.reserva_participantes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresa(id) on delete cascade,
  reserva_id uuid not null references public.reservas(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  nome text not null,
  data_nascimento date,
  documento text,
  titular boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint reserva_participantes_nome_check check (char_length(btrim(nome)) between 2 and 120),
  constraint reserva_participantes_doc_check check (documento is null or char_length(documento) <= 40),
  constraint reserva_participantes_nasc_check check (data_nascimento is null or data_nascimento between date '1900-01-01' and current_date)
);
create index if not exists reserva_participantes_reserva_idx on public.reserva_participantes (reserva_id);
create unique index if not exists reserva_participantes_titular_key on public.reserva_participantes (reserva_id) where titular;

create or replace function public.eda_preparar_participante()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_empresa uuid; v_qtd integer; v_total integer;
begin
  select r.empresa_id, greatest(coalesce(r.quantidade_pessoas, 1), 1)
    into v_empresa, v_qtd
  from public.reservas r where r.id = new.reserva_id for update;
  if v_empresa is null then raise exception 'Reserva não encontrada.'; end if;
  if tg_op = 'UPDATE' and new.reserva_id <> old.reserva_id then
    raise exception 'O participante não pode trocar de reserva.';
  end if;
  new.empresa_id := v_empresa;
  new.nome := btrim(new.nome);
  new.atualizado_em := now();
  if tg_op = 'INSERT' then
    select count(*) into v_total from public.reserva_participantes where reserva_id = new.reserva_id;
    if v_total >= v_qtd then
      raise exception 'EDA_PARTICIPANTES_EXCEDEM: a reserva é para % pessoa(s).', v_qtd;
    end if;
  end if;
  return new;
end; $$;
revoke all on function public.eda_preparar_participante() from public, anon, authenticated;

drop trigger if exists trg_eda_preparar_participante on public.reserva_participantes;
create trigger trg_eda_preparar_participante before insert or update on public.reserva_participantes
  for each row execute function public.eda_preparar_participante();

alter table public.reserva_participantes enable row level security;
revoke all on public.reserva_participantes from anon;

create policy reserva_participantes_empresa on public.reserva_participantes for all to authenticated
  using (empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid())))
  with check (empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid())));
create policy reserva_participantes_equipe_restricao on public.reserva_participantes as restrictive for all to authenticated
  using (exists (select 1 from public.perfis p where p.id = (select auth.uid()) and p.empresa_id is not null
    and p.role = any (array['admin_empresa','operador_empresa','financeiro','admin_plataforma'])))
  with check (exists (select 1 from public.perfis p where p.id = (select auth.uid()) and p.empresa_id is not null
    and p.role = any (array['admin_empresa','operador_empresa','admin_plataforma'])));
create policy reserva_participantes_modulo_restricao on public.reserva_participantes as restrictive for all to authenticated
  using ((select public.ern_pode_acessar_modulo('reservas')))
  with check ((select public.ern_pode_acessar_modulo('reservas')));

-- ---------------------------------------------------------------------------
-- Ficha de saúde e segurança (sem acesso direto)
-- ---------------------------------------------------------------------------
create table if not exists public.participante_fichas (
  participante_id uuid primary key references public.reserva_participantes(id) on delete cascade,
  empresa_id uuid not null references public.empresa(id) on delete cascade,
  sem_restricoes boolean not null default false,
  restricoes_alimentares text[] not null default '{}',
  alergias text[] not null default '{}',
  alergia_gravidade text,
  alergias_detalhe text,
  condicoes text[] not null default '{}',
  condicoes_detalhe text,
  medicacao_continua text,
  sabe_nadar boolean,
  contato_emergencia_nome text,
  contato_emergencia_telefone text,
  plano_saude text,
  observacoes text,
  preenchido_por text not null,
  consentimento_em timestamptz not null,
  atualizado_por uuid,
  atualizado_em timestamptz not null default now(),
  constraint fichas_restricoes_check check (restricoes_alimentares <@ array['lactose','gluten','frutos_do_mar','peixe','amendoim_castanhas','ovo','soja','vegetariano','vegano','sem_carne_porco','outra']),
  constraint fichas_alergias_check check (alergias <@ array['alimento','medicamento','picada_inseto','latex','outra']),
  constraint fichas_condicoes_check check (condicoes <@ array['diabetes','cardiaca','hipertensao','respiratoria','epilepsia','gestante','mobilidade_reduzida','outra']),
  constraint fichas_gravidade_check check (alergia_gravidade is null or alergia_gravidade in ('leve','moderada','grave')),
  constraint fichas_origem_check check (preenchido_por in ('turista','operadora')),
  constraint fichas_textos_check check (
    coalesce(char_length(alergias_detalhe), 0) <= 500 and coalesce(char_length(condicoes_detalhe), 0) <= 500
    and coalesce(char_length(medicacao_continua), 0) <= 300 and coalesce(char_length(observacoes), 0) <= 500
    and coalesce(char_length(contato_emergencia_nome), 0) <= 120 and coalesce(char_length(contato_emergencia_telefone), 0) <= 30
    and coalesce(char_length(plano_saude), 0) <= 120)
);
alter table public.participante_fichas enable row level security;
revoke all on public.participante_fichas from anon, authenticated;

-- Registro de acessos (quem viu/gravou ficha de quem). Sobrevive à exclusão.
create table if not exists public.ficha_acessos (
  id bigint generated always as identity primary key,
  empresa_id uuid not null,
  reserva_id uuid,
  participante_id uuid,
  usuario_id uuid,
  origem text not null,
  acao text not null,
  em timestamptz not null default now()
);
create index if not exists ficha_acessos_empresa_idx on public.ficha_acessos (empresa_id, em desc);
alter table public.ficha_acessos enable row level security;
revoke all on public.ficha_acessos from anon, authenticated;
grant select on public.ficha_acessos to authenticated;
create policy ficha_acessos_admin on public.ficha_acessos for select to authenticated
  using (exists (select 1 from public.perfis p where p.id = (select auth.uid())
    and p.role = 'admin_empresa' and p.empresa_id = ficha_acessos.empresa_id));

-- Convite pré-viagem (link para o turista). Guarda só o hash do token.
create table if not exists public.reserva_convites (
  reserva_id uuid primary key references public.reservas(id) on delete cascade,
  empresa_id uuid not null references public.empresa(id) on delete cascade,
  token_hash text not null unique,
  criado_por uuid,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null
);
alter table public.reserva_convites enable row level security;
revoke all on public.reserva_convites from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Funções internas
-- ---------------------------------------------------------------------------

-- Empresa do usuário se ele pode ver saúde; senão erro.
create or replace function public.eda_empresa_saude()
returns uuid language plpgsql stable security definer set search_path = public as $$
declare v_empresa uuid;
begin
  select p.empresa_id into v_empresa from public.perfis p
  where p.id = auth.uid() and p.empresa_id is not null
    and p.role = any (array['admin_empresa','operador_empresa']);
  if v_empresa is null or not public.ern_pode_acessar_modulo('reservas') then
    raise exception 'EDA_SEM_PERMISSAO_SAUDE';
  end if;
  return v_empresa;
end; $$;

-- Fim da viagem de uma reserva (base dos 120 dias).
create or replace function public.eda_fim_viagem(p_reserva_id uuid)
returns date language sql stable security definer set search_path = public as $$
  select coalesce(s.data_fim, r.data_fim_prevista, s.data_inicio, r.data_reserva)
  from public.reservas r left join public.passeio_saidas s on s.id = r.saida_id
  where r.id = p_reserva_id;
$$;

create or replace function public.eda_rotulo_saude(p_codigo text)
returns text language sql immutable set search_path = public as $$
  select case p_codigo
    when 'lactose' then 'sem lactose' when 'gluten' then 'sem glúten'
    when 'frutos_do_mar' then 'sem frutos do mar' when 'peixe' then 'sem peixe'
    when 'amendoim_castanhas' then 'sem amendoim/castanhas' when 'ovo' then 'sem ovo'
    when 'soja' then 'sem soja' when 'vegetariano' then 'vegetariano' when 'vegano' then 'vegano'
    when 'sem_carne_porco' then 'sem carne de porco'
    when 'alimento' then 'alimento' when 'medicamento' then 'medicamento'
    when 'picada_inseto' then 'picada de inseto' when 'latex' then 'látex'
    when 'diabetes' then 'diabetes' when 'cardiaca' then 'cardíaca' when 'hipertensao' then 'hipertensão'
    when 'respiratoria' then 'respiratória/asma' when 'epilepsia' then 'epilepsia'
    when 'gestante' then 'gestante' when 'mobilidade_reduzida' then 'mobilidade reduzida'
    when 'outra' then 'outra' else p_codigo end;
$$;

-- Lista legível de alertas e nível (grave | atencao | ok | pendente).
create or replace function public.eda_alertas_ficha(f public.participante_fichas)
returns table (nivel text, alertas text[])
language plpgsql stable set search_path = public as $$
declare v text[] := '{}';
begin
  if f.participante_id is null then
    return query select 'pendente'::text, array['Ficha não preenchida']::text[];
    return;
  end if;
  if cardinality(f.alergias) > 0 then
    v := v || (case when f.alergia_gravidade = 'grave' then 'ALERGIA GRAVE: ' else 'Alergia: ' end
      || (select string_agg(public.eda_rotulo_saude(x), ', ') from unnest(f.alergias) x)
      || coalesce(' — ' || nullif(btrim(f.alergias_detalhe), ''), ''));
  end if;
  if cardinality(f.restricoes_alimentares) > 0 then
    v := v || ('Alimentação: ' || (select string_agg(public.eda_rotulo_saude(x), ', ') from unnest(f.restricoes_alimentares) x));
  end if;
  if cardinality(f.condicoes) > 0 then
    v := v || ('Saúde: ' || (select string_agg(public.eda_rotulo_saude(x), ', ') from unnest(f.condicoes) x)
      || coalesce(' — ' || nullif(btrim(f.condicoes_detalhe), ''), ''));
  end if;
  if nullif(btrim(f.medicacao_continua), '') is not null then
    v := v || ('Medicação contínua: ' || btrim(f.medicacao_continua));
  end if;
  if f.sabe_nadar is false then v := v || 'Não sabe nadar — colete obrigatório'::text;
  elsif f.sabe_nadar is null then v := v || 'Natação não informada'::text; end if;
  if nullif(btrim(f.contato_emergencia_telefone), '') is null then v := v || 'Sem contato de emergência'::text; end if;

  return query select
    case when f.alergia_gravidade = 'grave' or f.sabe_nadar is false
              or f.condicoes && array['cardiaca','epilepsia','gestante'] then 'grave'
         when cardinality(v) > 0 then 'atencao' else 'ok' end,
    v;
end; $$;

create or replace function public.eda_registrar_acesso(p_empresa uuid, p_reserva uuid, p_participante uuid, p_origem text, p_acao text)
returns void language sql security definer set search_path = public as $$
  insert into public.ficha_acessos (empresa_id, reserva_id, participante_id, usuario_id, origem, acao)
  values (p_empresa, p_reserva, p_participante, auth.uid(), p_origem, p_acao);
$$;

-- Normaliza e grava a ficha (usada pela operadora e pelo turista).
create or replace function public.eda_gravar_ficha(p_participante uuid, p_empresa uuid, p_dados jsonb, p_origem text)
returns void language plpgsql security definer set search_path = public as $$
declare
  arr text[];
begin
  if coalesce((p_dados->>'consentimento')::boolean, false) is not true then
    raise exception 'EDA_CONSENTIMENTO_OBRIGATORIO';
  end if;
  insert into public.participante_fichas as f (
    participante_id, empresa_id, sem_restricoes, restricoes_alimentares, alergias, alergia_gravidade,
    alergias_detalhe, condicoes, condicoes_detalhe, medicacao_continua, sabe_nadar,
    contato_emergencia_nome, contato_emergencia_telefone, plano_saude, observacoes,
    preenchido_por, consentimento_em, atualizado_por, atualizado_em)
  values (
    p_participante, p_empresa,
    coalesce((p_dados->>'sem_restricoes')::boolean, false),
    coalesce(array(select jsonb_array_elements_text(p_dados->'restricoes_alimentares')), '{}'),
    coalesce(array(select jsonb_array_elements_text(p_dados->'alergias')), '{}'),
    nullif(p_dados->>'alergia_gravidade', ''),
    nullif(btrim(p_dados->>'alergias_detalhe'), ''),
    coalesce(array(select jsonb_array_elements_text(p_dados->'condicoes')), '{}'),
    nullif(btrim(p_dados->>'condicoes_detalhe'), ''),
    nullif(btrim(p_dados->>'medicacao_continua'), ''),
    case when p_dados ? 'sabe_nadar' and jsonb_typeof(p_dados->'sabe_nadar') = 'boolean' then (p_dados->>'sabe_nadar')::boolean end,
    nullif(btrim(p_dados->>'contato_emergencia_nome'), ''),
    nullif(btrim(p_dados->>'contato_emergencia_telefone'), ''),
    nullif(btrim(p_dados->>'plano_saude'), ''),
    nullif(btrim(p_dados->>'observacoes'), ''),
    p_origem, now(), auth.uid(), now())
  on conflict (participante_id) do update set
    sem_restricoes = excluded.sem_restricoes, restricoes_alimentares = excluded.restricoes_alimentares,
    alergias = excluded.alergias, alergia_gravidade = excluded.alergia_gravidade,
    alergias_detalhe = excluded.alergias_detalhe, condicoes = excluded.condicoes,
    condicoes_detalhe = excluded.condicoes_detalhe, medicacao_continua = excluded.medicacao_continua,
    sabe_nadar = excluded.sabe_nadar, contato_emergencia_nome = excluded.contato_emergencia_nome,
    contato_emergencia_telefone = excluded.contato_emergencia_telefone, plano_saude = excluded.plano_saude,
    observacoes = excluded.observacoes, preenchido_por = excluded.preenchido_por,
    consentimento_em = excluded.consentimento_em, atualizado_por = excluded.atualizado_por, atualizado_em = now();
  -- Alergia sem gravidade vira "moderada" (nunca some o alerta).
  update public.participante_fichas set alergia_gravidade = 'moderada'
  where participante_id = p_participante and cardinality(alergias) > 0 and alergia_gravidade is null;
end; $$;

-- ---------------------------------------------------------------------------
-- API da gestão (authenticated)
-- ---------------------------------------------------------------------------

-- Fichas completas de uma reserva (tela da reserva). Registra acesso.
create or replace function public.fichas_reserva_eda(p_reserva_id uuid)
returns table (
  participante_id uuid, nome text, data_nascimento date, documento text, titular boolean, cliente_id uuid,
  ficha jsonb, nivel text, alertas text[], expira_em date, quantidade_pessoas integer
)
language plpgsql security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_saude();
begin
  if not exists (select 1 from public.reservas r where r.id = p_reserva_id and r.empresa_id = v_empresa) then
    raise exception 'Reserva não encontrada.';
  end if;
  insert into public.ficha_acessos (empresa_id, reserva_id, participante_id, usuario_id, origem, acao)
  select v_empresa, p_reserva_id, rp.id, auth.uid(), 'operadora', 'ver'
  from public.reserva_participantes rp where rp.reserva_id = p_reserva_id;

  return query
  select rp.id, rp.nome, rp.data_nascimento, rp.documento, rp.titular, rp.cliente_id,
    case when f.participante_id is null then null
      else to_jsonb(f) - 'empresa_id' - 'atualizado_por' end,
    a.nivel, a.alertas,
    public.eda_fim_viagem(p_reserva_id) + 120,
    greatest(coalesce(r.quantidade_pessoas, 1), 1)::integer
  from public.reserva_participantes rp
  join public.reservas r on r.id = rp.reserva_id
  left join public.participante_fichas f on f.participante_id = rp.id
  cross join lateral public.eda_alertas_ficha(f) a
  where rp.reserva_id = p_reserva_id
  order by rp.titular desc, rp.criado_em;
end; $$;

create or replace function public.salvar_ficha_eda(p_participante_id uuid, p_dados jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_saude(); v_reserva uuid;
begin
  select rp.reserva_id into v_reserva from public.reserva_participantes rp
  where rp.id = p_participante_id and rp.empresa_id = v_empresa;
  if v_reserva is null then raise exception 'Participante não encontrado.'; end if;
  perform public.eda_gravar_ficha(p_participante_id, v_empresa, p_dados, 'operadora');
  perform public.eda_registrar_acesso(v_empresa, v_reserva, p_participante_id, 'operadora', 'salvar');
end; $$;

-- Gera (ou renova) o link pré-viagem. Devolve o token uma única vez.
create or replace function public.gerar_convite_ficha_eda(p_reserva_id uuid)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare v_empresa uuid := public.eda_empresa_saude(); v_token text; v_fim date;
begin
  if not exists (select 1 from public.reservas r where r.id = p_reserva_id and r.empresa_id = v_empresa) then
    raise exception 'Reserva não encontrada.';
  end if;
  v_fim := coalesce(public.eda_fim_viagem(p_reserva_id), (now() at time zone 'America/Manaus')::date + 30);
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.reserva_convites (reserva_id, empresa_id, token_hash, criado_por, expira_em)
  values (p_reserva_id, v_empresa, encode(extensions.digest(v_token, 'sha256'), 'hex'), auth.uid(),
          (v_fim + 1)::timestamp at time zone 'America/Manaus')
  on conflict (reserva_id) do update set token_hash = excluded.token_hash, criado_por = excluded.criado_por,
    criado_em = now(), expira_em = excluded.expira_em;
  return v_token;
end; $$;

-- Resumo de segurança por saída ou por reserva (agenda, demandas, painel).
create or replace function public.resumo_seguranca_eda(p_saida_id uuid default null, p_reserva_id uuid default null)
returns table (reserva_id uuid, reserva_cliente text, participante_id uuid, participante_nome text, nivel text, alertas text[])
language plpgsql security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_saude();
begin
  if p_saida_id is null and p_reserva_id is null then raise exception 'Informe a saída ou a reserva.'; end if;

  create temp table if not exists _eda_res (id uuid, cliente text, qtd integer) on commit drop;
  truncate _eda_res;
  insert into _eda_res
  select r.id, r.cliente, greatest(coalesce(r.quantidade_pessoas, 1), 1)
  from public.reservas r
  where r.empresa_id = v_empresa and lower(coalesce(r.status, '')) <> 'cancelada'
    and ((p_saida_id is not null and r.saida_id = p_saida_id) or (p_reserva_id is not null and r.id = p_reserva_id));

  insert into public.ficha_acessos (empresa_id, reserva_id, participante_id, usuario_id, origem, acao)
  select v_empresa, rp.reserva_id, rp.id, auth.uid(), 'operadora', 'resumo'
  from public.reserva_participantes rp join _eda_res x on x.id = rp.reserva_id;

  return query
  select x.id, x.cliente, rp.id, rp.nome, a.nivel, a.alertas
  from _eda_res x
  join public.reserva_participantes rp on rp.reserva_id = x.id
  left join public.participante_fichas f on f.participante_id = rp.id
  cross join lateral public.eda_alertas_ficha(f) a
  union all
  -- Pessoas da reserva ainda sem cadastro de participante.
  select x.id, x.cliente, null::uuid, null::text, 'pendente'::text,
    array[(x.qtd - count(rp.id))::text || ' pessoa(s) sem cadastro na reserva']
  from _eda_res x left join public.reserva_participantes rp on rp.reserva_id = x.id
  group by x.id, x.cliente, x.qtd
  having count(rp.id) < x.qtd;
end; $$;

-- Contagens das próximas saídas/reservas (painel inicial). Sem detalhe clínico.
create or replace function public.alertas_proximas_viagens_eda(p_dias integer default 7)
returns table (data_inicio date, passeio text, saida_id uuid, reserva_id uuid, pessoas integer, graves integer, atencao integer, pendentes integer)
language plpgsql security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_saude(); v_hoje date := (now() at time zone 'America/Manaus')::date;
begin
  return query
  with base as (
    select r.id, coalesce(s.data_inicio, r.data_reserva) as d, r.saida_id,
      coalesce(p.nome, r.pacote) as passeio, greatest(coalesce(r.quantidade_pessoas, 1), 1) as qtd
    from public.reservas r
    left join public.passeio_saidas s on s.id = r.saida_id
    left join public.passeios p on p.id = r.passeio_id
    where r.empresa_id = v_empresa
      and lower(coalesce(r.status, '')) not in ('cancelada', 'concluída', 'concluida', 'não compareceu')
      and coalesce(s.data_inicio, r.data_reserva) between v_hoje and v_hoje + least(greatest(p_dias, 1), 60)
  ),
  por_reserva as (
    select b.id, b.d, b.saida_id, b.passeio, b.qtd,
      count(*) filter (where a.nivel = 'grave') as g,
      count(*) filter (where a.nivel = 'atencao') as at,
      count(*) filter (where a.nivel = 'pendente') as pe,
      count(rp.id) as cadastrados
    from base b
    left join public.reserva_participantes rp on rp.reserva_id = b.id
    left join public.participante_fichas f on f.participante_id = rp.id
    left join lateral public.eda_alertas_ficha(f) a on rp.id is not null
    group by b.id, b.d, b.saida_id, b.passeio, b.qtd
  )
  select min(x.d), min(x.passeio), x.saida_id,
    case when x.saida_id is null then (array_agg(x.id))[1] end,
    sum(x.qtd)::integer, sum(x.g)::integer, sum(x.at)::integer,
    sum(x.pe + greatest(x.qtd - x.cadastrados, 0))::integer
  from por_reserva x
  group by x.saida_id, case when x.saida_id is null then x.id end
  order by 1;
end; $$;

-- ---------------------------------------------------------------------------
-- API do turista (anon, via token do link)
-- ---------------------------------------------------------------------------
create or replace function public.eda_convite_por_token(p_token text)
returns public.reserva_convites language sql stable security definer set search_path = public, extensions as $$
  select c.* from public.reserva_convites c
  where c.token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and c.expira_em > now();
$$;

-- O turista vê só o necessário: passeio, datas, nomes e se cada ficha já foi enviada.
create or replace function public.convite_ficha_eda(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c public.reserva_convites;
begin
  if p_token !~ '^[0-9a-f]{48}$' then return null; end if;
  c := public.eda_convite_por_token(p_token);
  if c.reserva_id is null then return null; end if;
  return (
    select jsonb_build_object(
      'passeio', coalesce(p.nome, r.pacote),
      'data_inicio', coalesce(s.data_inicio, r.data_reserva),
      'data_fim', coalesce(s.data_fim, r.data_fim_prevista),
      'operadora', coalesce(pp.nome_publico, 'Operadora'),
      'pessoas', greatest(coalesce(r.quantidade_pessoas, 1), 1),
      'exclusao_em', public.eda_fim_viagem(r.id) + 120,
      'participantes', coalesce((
        select jsonb_agg(jsonb_build_object('id', rp.id, 'nome', rp.nome,
          'enviada', exists (select 1 from public.participante_fichas f where f.participante_id = rp.id))
          order by rp.titular desc, rp.criado_em)
        from public.reserva_participantes rp where rp.reserva_id = r.id), '[]'::jsonb))
    from public.reservas r
    left join public.passeio_saidas s on s.id = r.saida_id
    left join public.passeios p on p.id = r.passeio_id
    left join public.perfis_publicos pp on pp.empresa_id = r.empresa_id and pp.origem_tipo = 'empresa' and pp.publicado
    where r.id = c.reserva_id
    limit 1);
end; $$;

create or replace function public.enviar_ficha_convite_eda(
  p_token text, p_participante_id uuid, p_nome text, p_data_nascimento date, p_dados jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare c public.reserva_convites; v_id uuid := p_participante_id;
begin
  if p_token !~ '^[0-9a-f]{48}$' then raise exception 'EDA_CONVITE_INVALIDO'; end if;
  c := public.eda_convite_por_token(p_token);
  if c.reserva_id is null then raise exception 'EDA_CONVITE_INVALIDO'; end if;

  if v_id is null then
    insert into public.reserva_participantes (empresa_id, reserva_id, nome, data_nascimento)
    values (c.empresa_id, c.reserva_id, p_nome, p_data_nascimento)
    returning id into v_id;
  elsif not exists (select 1 from public.reserva_participantes rp where rp.id = v_id and rp.reserva_id = c.reserva_id) then
    raise exception 'EDA_CONVITE_INVALIDO';
  elsif p_data_nascimento is not null then
    update public.reserva_participantes set data_nascimento = p_data_nascimento where id = v_id;
  end if;

  perform public.eda_gravar_ficha(v_id, c.empresa_id, p_dados, 'turista');
  insert into public.ficha_acessos (empresa_id, reserva_id, participante_id, usuario_id, origem, acao)
  values (c.empresa_id, c.reserva_id, v_id, null, 'turista', 'salvar');
  return v_id;
end; $$;

-- ---------------------------------------------------------------------------
-- Exclusão automática: 120 dias após o fim da viagem
-- ---------------------------------------------------------------------------
create or replace function public.eda_expurgar_fichas_saude()
returns integer language plpgsql security definer set search_path = public as $$
declare v_total integer;
begin
  with alvo as (
    select f.participante_id, f.empresa_id, rp.reserva_id
    from public.participante_fichas f
    join public.reserva_participantes rp on rp.id = f.participante_id
    where public.eda_fim_viagem(rp.reserva_id) + 120 < (now() at time zone 'America/Manaus')::date
  ), apagadas as (
    delete from public.participante_fichas f using alvo a
    where f.participante_id = a.participante_id
    returning a.empresa_id, a.reserva_id, a.participante_id
  )
  insert into public.ficha_acessos (empresa_id, reserva_id, participante_id, usuario_id, origem, acao)
  select empresa_id, reserva_id, participante_id, null, 'sistema', 'excluida_120_dias' from apagadas;
  get diagnostics v_total = row_count;

  delete from public.reserva_convites where expira_em < now() - interval '1 day';
  return v_total;
end; $$;

create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'eda_expurgar_fichas_saude';
select cron.schedule('eda_expurgar_fichas_saude', '30 7 * * *', 'select public.eda_expurgar_fichas_saude()');

-- ---------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------
revoke all on function public.eda_empresa_saude() from public, anon, authenticated;
revoke all on function public.eda_fim_viagem(uuid) from public, anon, authenticated;
revoke all on function public.eda_alertas_ficha(public.participante_fichas) from public, anon, authenticated;
revoke all on function public.eda_registrar_acesso(uuid, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.eda_gravar_ficha(uuid, uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.eda_convite_por_token(text) from public, anon, authenticated;
revoke all on function public.eda_expurgar_fichas_saude() from public, anon, authenticated;

revoke all on function public.fichas_reserva_eda(uuid) from public, anon;
revoke all on function public.salvar_ficha_eda(uuid, jsonb) from public, anon;
revoke all on function public.gerar_convite_ficha_eda(uuid) from public, anon;
revoke all on function public.resumo_seguranca_eda(uuid, uuid) from public, anon;
revoke all on function public.alertas_proximas_viagens_eda(integer) from public, anon;
grant execute on function public.fichas_reserva_eda(uuid) to authenticated;
grant execute on function public.salvar_ficha_eda(uuid, jsonb) to authenticated;
grant execute on function public.gerar_convite_ficha_eda(uuid) to authenticated;
grant execute on function public.resumo_seguranca_eda(uuid, uuid) to authenticated;
grant execute on function public.alertas_proximas_viagens_eda(integer) to authenticated;

revoke all on function public.convite_ficha_eda(text) from public;
revoke all on function public.enviar_ficha_convite_eda(text, uuid, text, date, jsonb) from public;
grant execute on function public.convite_ficha_eda(text) to anon, authenticated;
grant execute on function public.enviar_ficha_convite_eda(text, uuid, text, date, jsonb) to anon, authenticated;

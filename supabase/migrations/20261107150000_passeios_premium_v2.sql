-- EDA_PASSEIOS_PREMIUM_V2
-- Contrato de dados único para o passeio: a gestão grava, o portal mostra,
-- a reserva consome vagas e o Concierge consulta — todos a partir da mesma fonte.
--
-- 1. Passeio com dados estruturados (preço único, duração numérica, slug, inclusos).
-- 2. Saídas (datas reais com vagas) — base da disponibilidade real.
-- 3. Reserva vinculada à saída, com bloqueio de overbooking no banco.
-- 4. Funções públicas para portal e Concierge (só dados seguros).

-- ---------------------------------------------------------------------------
-- 1. PASSEIO: contrato de dados
-- ---------------------------------------------------------------------------

-- empresa_id passa a ser imutável após o cadastro (antes era reatribuída em
-- todo UPDATE pela empresa de quem editava).
create or replace function public.definir_empresa_passeio()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_empresa_id uuid;
begin
  if tg_op = 'UPDATE' then
    new.empresa_id := old.empresa_id;
    return new;
  end if;

  select empresa_id into v_empresa_id
  from public.perfis
  where id = auth.uid();

  if v_empresa_id is null then
    raise exception 'Usuário autenticado não possui empresa vinculada.';
  end if;

  new.empresa_id := v_empresa_id;
  return new;
end;
$function$;

alter table public.passeios
  add column if not exists slug text,
  add column if not exists preco_modalidade text not null default 'por_pessoa',
  add column if not exists capacidade_minima integer not null default 1,
  add column if not exists duracao_dias integer,
  add column if not exists duracao_horas numeric(4,1),
  add column if not exists idiomas text[] not null default array['pt']::text[],
  add column if not exists inclui text[] not null default '{}'::text[],
  add column if not exists nao_inclui text[] not null default '{}'::text[],
  add column if not exists ponto_embarque text,
  add column if not exists atualizado_em timestamptz not null default now();

alter table public.passeios alter column situacao set default 'Ativo';
alter table public.passeios alter column empresa_id set not null;

create or replace function public.eda_slug(p_texto text)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(both '-' from regexp_replace(
    lower(translate(coalesce(p_texto, ''),
      'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
      'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn')),
    '[^a-z0-9]+', '-', 'g'));
$$;

-- Normaliza tudo que antes dependia do frontend.
create or replace function public.eda_normalizar_passeio()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_base text;
  v_slug text;
  v_n integer := 1;
  v_txt text;
begin
  -- Preço: valor é a fonte; preco espelha (compatibilidade).
  if new.valor is null and coalesce(new.preco, 0) > 0 then
    new.valor := new.preco;
  end if;
  new.preco := coalesce(new.valor, 0);

  -- Fotos: fotos[] é a fonte; foto_url é sempre a capa.
  if cardinality(new.fotos) = 0 and nullif(btrim(new.foto_url), '') is not null then
    new.fotos := array[btrim(new.foto_url)];
  end if;
  new.foto_url := new.fotos[1];

  -- Situação: grafia única.
  new.situacao := case lower(btrim(coalesce(new.situacao, '')))
    when 'inativo' then 'Inativo'
    when 'em breve' then 'Em Breve'
    else 'Ativo' end;

  -- Duração: extrai números do texto legado ("7 Dias", "4h") quando faltarem.
  v_txt := lower(coalesce(new.duracao, ''));
  if new.duracao_dias is null and new.duracao_horas is null then
    if v_txt ~ '\d+\s*(dia|diaria|noite)' then
      new.duracao_dias := substring(v_txt from '(\d+)\s*(?:dia|diaria|noite)')::integer;
    elsif v_txt ~ '\d+([.,]\d+)?\s*(h|hora)' then
      new.duracao_horas := replace(substring(v_txt from '(\d+(?:[.,]\d+)?)\s*(?:h|hora)'), ',', '.')::numeric;
    end if;
  end if;
  if nullif(btrim(coalesce(new.duracao, '')), '') is null then
    new.duracao := case
      when new.duracao_dias is not null then new.duracao_dias || case when new.duracao_dias = 1 then ' dia' else ' dias' end
      when new.duracao_horas is not null then trim(to_char(new.duracao_horas, 'FM990.9')) || 'h'
      else null end;
  end if;

  -- Slug público estável (gerado uma vez; não muda se o nome mudar).
  if new.slug is null or btrim(new.slug) = '' then
    v_base := left(nullif(public.eda_slug(new.nome), ''), 60);
    v_base := coalesce(v_base, 'passeio');
    v_slug := v_base;
    while exists (select 1 from public.passeios p where p.slug = v_slug and p.id <> new.id) loop
      v_n := v_n + 1;
      v_slug := v_base || '-' || v_n;
    end loop;
    new.slug := v_slug;
  end if;

  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists trg_eda_normalizar_passeio on public.passeios;
create trigger trg_eda_normalizar_passeio
  before insert or update on public.passeios
  for each row execute function public.eda_normalizar_passeio();

-- Backfill dos registros existentes (o trigger faz o trabalho).
update public.passeios set atualizado_em = now();

alter table public.passeios alter column slug set not null;
create unique index if not exists passeios_slug_key on public.passeios (slug);

alter table public.passeios
  drop constraint if exists passeios_situacao_check,
  drop constraint if exists passeios_valor_check,
  drop constraint if exists passeios_vagas_check,
  drop constraint if exists passeios_modalidade_check,
  drop constraint if exists passeios_capacidade_min_check,
  drop constraint if exists passeios_duracao_check,
  drop constraint if exists passeios_listas_check;
alter table public.passeios
  add constraint passeios_situacao_check check (situacao in ('Ativo', 'Inativo', 'Em Breve')),
  add constraint passeios_valor_check check (valor is null or valor >= 0),
  add constraint passeios_vagas_check check (vagas is null or vagas >= 0),
  add constraint passeios_modalidade_check check (preco_modalidade in ('por_pessoa', 'por_grupo', 'sob_consulta')),
  add constraint passeios_capacidade_min_check check (capacidade_minima between 1 and 500),
  add constraint passeios_duracao_check check (
    (duracao_dias is null or duracao_dias between 1 and 60)
    and (duracao_horas is null or (duracao_horas > 0 and duracao_horas <= 24))),
  add constraint passeios_listas_check check (
    cardinality(idiomas) <= 10 and cardinality(inclui) <= 30 and cardinality(nao_inclui) <= 30);

-- ---------------------------------------------------------------------------
-- 2. SAÍDAS: datas reais com vagas (disponibilidade real)
-- ---------------------------------------------------------------------------

create table if not exists public.passeio_saidas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresa(id) on delete cascade,
  passeio_id uuid not null references public.passeios(id) on delete cascade,
  data_inicio date not null,
  data_fim date,
  horario time,
  vagas_total integer not null,
  status text not null default 'aberta',
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint passeio_saidas_vagas_check check (vagas_total between 1 and 1000),
  constraint passeio_saidas_status_check check (status in ('aberta', 'fechada', 'cancelada')),
  constraint passeio_saidas_datas_check check (data_fim is null or data_fim >= data_inicio),
  constraint passeio_saidas_obs_check check (observacao is null or char_length(observacao) <= 500)
);

create index if not exists passeio_saidas_passeio_data_idx
  on public.passeio_saidas (passeio_id, data_inicio);
create index if not exists passeio_saidas_empresa_data_idx
  on public.passeio_saidas (empresa_id, data_inicio);

-- empresa da saída = empresa do passeio (nunca vem do cliente).
create or replace function public.eda_preparar_saida()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid;
  v_dias integer;
begin
  select p.empresa_id, p.duracao_dias into v_empresa, v_dias
  from public.passeios p where p.id = new.passeio_id;

  if v_empresa is null then
    raise exception 'Passeio não encontrado para esta saída.';
  end if;
  if tg_op = 'UPDATE' and new.passeio_id <> old.passeio_id then
    raise exception 'Uma saída não pode trocar de passeio.';
  end if;

  new.empresa_id := v_empresa;
  if new.data_fim is null and v_dias is not null and v_dias > 1 then
    new.data_fim := new.data_inicio + (v_dias - 1);
  end if;
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists trg_eda_preparar_saida on public.passeio_saidas;
create trigger trg_eda_preparar_saida
  before insert or update on public.passeio_saidas
  for each row execute function public.eda_preparar_saida();

alter table public.passeio_saidas enable row level security;
revoke all on public.passeio_saidas from anon;

drop policy if exists passeio_saidas_select_empresa on public.passeio_saidas;
drop policy if exists passeio_saidas_insert_empresa on public.passeio_saidas;
drop policy if exists passeio_saidas_update_empresa on public.passeio_saidas;
drop policy if exists passeio_saidas_delete_empresa on public.passeio_saidas;
drop policy if exists passeio_saidas_equipe_restricao on public.passeio_saidas;
drop policy if exists passeio_saidas_modulo_restricao on public.passeio_saidas;

create policy passeio_saidas_select_empresa on public.passeio_saidas
  for select to authenticated
  using (empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid())));
create policy passeio_saidas_insert_empresa on public.passeio_saidas
  for insert to authenticated
  with check (empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid())));
create policy passeio_saidas_update_empresa on public.passeio_saidas
  for update to authenticated
  using (empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid())))
  with check (empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid())));
create policy passeio_saidas_delete_empresa on public.passeio_saidas
  for delete to authenticated
  using (empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid())));

create policy passeio_saidas_equipe_restricao on public.passeio_saidas
  as restrictive for all to authenticated
  using (exists (select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.empresa_id is not null
      and p.role = any (array['admin_empresa','operador_empresa','financeiro','admin_plataforma'])))
  with check (exists (select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.empresa_id is not null
      and p.role = any (array['admin_empresa','operador_empresa','financeiro','admin_plataforma'])));

create policy passeio_saidas_modulo_restricao on public.passeio_saidas
  as restrictive for all to authenticated
  using ((select public.ern_pode_acessar_modulo('passeios')))
  with check ((select public.ern_pode_acessar_modulo('passeios')));

-- ---------------------------------------------------------------------------
-- 3. RESERVA ↔ SAÍDA: consumo de vagas com trava de overbooking
-- ---------------------------------------------------------------------------

alter table public.reservas
  add column if not exists saida_id uuid references public.passeio_saidas(id) on delete set null;
create index if not exists reservas_saida_idx on public.reservas (saida_id) where saida_id is not null;

create or replace function public.eda_vagas_ocupadas_saida(p_saida_id uuid, p_ignorar uuid default null)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(greatest(coalesce(r.quantidade_pessoas, 1), 1)), 0)::integer
  from public.reservas r
  where r.saida_id = p_saida_id
    and lower(coalesce(r.status, '')) <> 'cancelada'
    and (p_ignorar is null or r.id <> p_ignorar);
$$;
revoke all on function public.eda_vagas_ocupadas_saida(uuid, uuid) from public, anon, authenticated;

create or replace function public.eda_validar_saida_reserva()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_saida public.passeio_saidas%rowtype;
  v_ocupadas integer;
  v_pessoas integer;
begin
  if new.saida_id is null then
    return new;
  end if;

  -- Revalida só quando algo que afeta vagas mudou.
  if tg_op = 'UPDATE'
     and new.saida_id is not distinct from old.saida_id
     and new.quantidade_pessoas is not distinct from old.quantidade_pessoas
     and lower(coalesce(new.status, '')) is not distinct from lower(coalesce(old.status, '')) then
    return new;
  end if;

  -- Trava a saída: duas reservas simultâneas não passam do limite.
  select * into v_saida from public.passeio_saidas where id = new.saida_id for update;

  if not found or v_saida.empresa_id is distinct from new.empresa_id then
    raise exception 'A saída selecionada não pertence a esta empresa.';
  end if;

  if new.passeio_id is null then
    new.passeio_id := v_saida.passeio_id;
  elsif new.passeio_id <> v_saida.passeio_id then
    raise exception 'A saída selecionada é de outro passeio.';
  end if;

  if new.data_reserva is null or new.data_reserva <> v_saida.data_inicio then
    new.data_reserva := v_saida.data_inicio;
  end if;
  if new.horario is null then
    new.horario := v_saida.horario;
  end if;

  if lower(coalesce(new.status, '')) = 'cancelada' then
    return new;
  end if;

  if v_saida.status <> 'aberta' and (tg_op = 'INSERT' or new.saida_id is distinct from old.saida_id) then
    raise exception 'Esta saída não está aberta para novas reservas.';
  end if;

  v_pessoas := greatest(coalesce(new.quantidade_pessoas, 1), 1);
  v_ocupadas := public.eda_vagas_ocupadas_saida(new.saida_id, new.id);

  if v_ocupadas + v_pessoas > v_saida.vagas_total then
    raise exception 'EDA_SAIDA_LOTADA: restam % vaga(s) nesta saída.',
      greatest(v_saida.vagas_total - v_ocupadas, 0);
  end if;

  return new;
end;
$$;

-- Nome "zz_eda" roda depois de trg_definir_empresa_reserva e antes de
-- zz_ern_validar_vinculos_reserva (que valida o passeio_id preenchido aqui).
drop trigger if exists zz_eda_validar_saida_reserva on public.reservas;
create trigger zz_eda_validar_saida_reserva
  before insert or update on public.reservas
  for each row execute function public.eda_validar_saida_reserva();

-- ---------------------------------------------------------------------------
-- 4. CONTRATO PÚBLICO (portal + Concierge): só colunas seguras
-- ---------------------------------------------------------------------------

drop function if exists public.passeios_publicos_eda(text);

create function public.passeios_publicos_eda(p_slug text default null)
returns table (
  id uuid,
  nome text,
  categoria text,
  cidade text,
  duracao text,
  preco numeric,
  vagas integer,
  descricao text,
  fotos text[],
  destaque boolean,
  situacao text,
  criado_em timestamptz,
  operadora_slug text,
  operadora_nome text,
  operadora_logo text,
  operadora_whatsapp text,
  operadora_verificada boolean,
  slug text,
  preco_modalidade text,
  capacidade_minima integer,
  duracao_dias integer,
  duracao_horas numeric,
  idiomas text[],
  inclui text[],
  nao_inclui text[],
  ponto_embarque text,
  proxima_saida date,
  proxima_saida_vagas integer,
  saidas_abertas integer
)
language sql
stable
security definer
set search_path = public
as $$
  with hoje as (select (now() at time zone 'America/Manaus')::date as d),
  saidas as (
    select s.passeio_id, s.data_inicio,
           greatest(s.vagas_total - public.eda_vagas_ocupadas_saida(s.id), 0) as restantes
    from public.passeio_saidas s, hoje
    where s.status = 'aberta' and s.data_inicio >= hoje.d
  ),
  resumo as (
    select passeio_id,
           min(data_inicio) filter (where restantes > 0) as proxima,
           count(*) filter (where restantes > 0)::integer as abertas
    from saidas group by passeio_id
  )
  select
    ps.id, ps.nome, ps.categoria, ps.cidade, ps.duracao,
    case when ps.preco_modalidade = 'sob_consulta' then null else ps.valor end,
    ps.vagas, ps.descricao, ps.fotos,
    coalesce(ps.destaque, false), ps.situacao, ps.created_at,
    pp.slug, pp.nome_publico, pp.logo_url, pp.whatsapp, pp.verificado,
    ps.slug, ps.preco_modalidade, ps.capacidade_minima,
    ps.duracao_dias, ps.duracao_horas, ps.idiomas, ps.inclui, ps.nao_inclui,
    ps.ponto_embarque,
    r.proxima,
    (select max(sa.restantes) from saidas sa
      where sa.passeio_id = ps.id and sa.data_inicio = r.proxima)::integer,
    coalesce(r.abertas, 0)
  from public.passeios ps
  join public.perfis_publicos pp
    on pp.empresa_id = ps.empresa_id
   and pp.origem_tipo = 'empresa'
   and pp.categoria = 'operadora'
   and pp.publicado
  left join resumo r on r.passeio_id = ps.id
  where ps.publicado_portal
    and ps.situacao in ('Ativo', 'Em Breve')
    and (p_slug is null or pp.slug = p_slug)
  order by coalesce(ps.destaque, false) desc, (r.proxima is null), r.proxima, ps.created_at desc
  limit 200;
$$;

revoke all on function public.passeios_publicos_eda(text) from public;
grant execute on function public.passeios_publicos_eda(text) to anon, authenticated;

-- Agenda pública de um passeio: o que o portal mostra e o Concierge consulta.
-- Nunca inventa disponibilidade: só saídas abertas cadastradas pela operadora.
create or replace function public.disponibilidade_passeio_eda(
  p_passeio_id uuid,
  p_de date default null,
  p_ate date default null
)
returns table (
  saida_id uuid,
  data_inicio date,
  data_fim date,
  horario time,
  vagas_total integer,
  vagas_restantes integer
)
language sql
stable
security definer
set search_path = public
as $$
  with hoje as (select (now() at time zone 'America/Manaus')::date as d)
  select s.id, s.data_inicio, s.data_fim, s.horario, s.vagas_total,
         greatest(s.vagas_total - public.eda_vagas_ocupadas_saida(s.id), 0)
  from public.passeio_saidas s
  join public.passeios ps on ps.id = s.passeio_id
  join public.perfis_publicos pp
    on pp.empresa_id = ps.empresa_id and pp.origem_tipo = 'empresa'
   and pp.categoria = 'operadora' and pp.publicado
  , hoje
  where s.passeio_id = p_passeio_id
    and ps.publicado_portal
    and ps.situacao = 'Ativo'
    and s.status = 'aberta'
    and s.data_inicio >= greatest(coalesce(p_de, hoje.d), hoje.d)
    and s.data_inicio <= least(coalesce(p_ate, hoje.d + 365), hoje.d + 365)
  order by s.data_inicio, s.horario nulls first
  limit 60;
$$;

revoke all on function public.disponibilidade_passeio_eda(uuid, date, date) from public;
grant execute on function public.disponibilidade_passeio_eda(uuid, date, date) to anon, authenticated;

-- Funções de trigger não são API: ninguém chama via /rpc.
revoke all on function public.eda_preparar_saida() from public, anon, authenticated;
revoke all on function public.eda_validar_saida_reserva() from public, anon, authenticated;
revoke all on function public.eda_normalizar_passeio() from public, anon, authenticated;
revoke all on function public.eda_slug(text) from anon;

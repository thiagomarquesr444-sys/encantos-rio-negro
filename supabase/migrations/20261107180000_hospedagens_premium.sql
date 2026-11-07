-- EDA_HOSPEDAGENS_PREMIUM_V1
-- Hospedagem = propriedade; acomodações = unidades com capacidade;
-- reserva_hospedagens = noites ocupadas por reserva (com trava de overbooking).
-- A situação "Disponível/Reservada/Ocupada" deixa de ser manual e passa a vir
-- da ocupação real. Hóspedes continuam com a ficha de saúde da reserva.

-- ---------------------------------------------------------------------------
-- 1. Hospedagem: contrato de dados
-- ---------------------------------------------------------------------------
create or replace function public.definir_empresa_hospedagem()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare v_empresa_id uuid;
begin
  if tg_op = 'UPDATE' then new.empresa_id := old.empresa_id; return new; end if;
  if auth.uid() is not null then
    select empresa_id into v_empresa_id from public.perfis where id = auth.uid();
    if v_empresa_id is null then raise exception 'Usuário autenticado não possui empresa vinculada.'; end if;
    new.empresa_id := v_empresa_id;
  elsif new.empresa_id is null then
    raise exception 'Hospedagem precisa possuir empresa vinculada.';
  end if;
  return new;
end; $function$;

alter table public.hospedagens
  add column if not exists slug text,
  add column if not exists cidade text,
  add column if not exists descricao text,
  add column if not exists comodidades text[] not null default '{}',
  add column if not exists check_in time default '14:00',
  add column if not exists check_out time default '11:00',
  add column if not exists propria boolean not null default true,
  add column if not exists fotos text[] not null default '{}',
  add column if not exists atualizado_em timestamptz not null default now();

alter table public.hospedagens alter column empresa_id set not null;

create or replace function public.eda_normalizar_hospedagem()
returns trigger language plpgsql set search_path = public as $$
declare v_base text; v_slug text; v_n integer := 1;
begin
  new.nome := btrim(new.nome);
  new.valor_diaria := greatest(coalesce(new.valor_diaria, 0), 0);
  -- status manual antigo vira situação cadastral (ocupação é calculada).
  new.status := case when lower(coalesce(new.status, '')) in ('inativa', 'inativo') then 'Inativa' else 'Ativa' end;
  if new.slug is null or btrim(new.slug) = '' then
    v_base := coalesce(left(nullif(public.eda_slug(new.nome), ''), 60), 'hospedagem');
    v_slug := v_base;
    while exists (select 1 from public.hospedagens h where h.slug = v_slug and h.id <> new.id) loop
      v_n := v_n + 1; v_slug := v_base || '-' || v_n;
    end loop;
    new.slug := v_slug;
  end if;
  new.atualizado_em := now();
  return new;
end; $$;
revoke all on function public.eda_normalizar_hospedagem() from public, anon, authenticated;

drop trigger if exists trg_eda_normalizar_hospedagem on public.hospedagens;
create trigger trg_eda_normalizar_hospedagem before insert or update on public.hospedagens
  for each row execute function public.eda_normalizar_hospedagem();

alter table public.hospedagens alter column status set default 'Ativa';
update public.hospedagens set atualizado_em = now();
alter table public.hospedagens alter column slug set not null;
create unique index if not exists hospedagens_slug_key on public.hospedagens (slug);

alter table public.hospedagens
  drop constraint if exists hospedagens_status_check,
  drop constraint if exists hospedagens_tipo_check,
  drop constraint if exists hospedagens_textos_check;
alter table public.hospedagens
  add constraint hospedagens_status_check check (status in ('Ativa', 'Inativa')),
  add constraint hospedagens_textos_check check (
    char_length(nome) between 2 and 120 and coalesce(char_length(descricao), 0) <= 3000
    and cardinality(comodidades) <= 30 and cardinality(fotos) <= 12);

-- ---------------------------------------------------------------------------
-- 2. Acomodações (unidades)
-- ---------------------------------------------------------------------------
create table if not exists public.hospedagem_acomodacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresa(id) on delete cascade,
  hospedagem_id uuid not null references public.hospedagens(id) on delete cascade,
  nome text not null,
  tipo text not null default 'quarto',
  capacidade integer not null default 2,
  quantidade integer not null default 1,
  valor_diaria numeric(10,2),
  status text not null default 'ativa',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint acomodacoes_nome_check check (char_length(btrim(nome)) between 2 and 80),
  constraint acomodacoes_tipo_check check (tipo in ('quarto','suite','chale','cabine','redario','dormitorio','casa','barraca')),
  constraint acomodacoes_capacidade_check check (capacidade between 1 and 50),
  constraint acomodacoes_quantidade_check check (quantidade between 1 and 200),
  constraint acomodacoes_valor_check check (valor_diaria is null or valor_diaria >= 0),
  constraint acomodacoes_status_check check (status in ('ativa','manutencao','inativa'))
);
create index if not exists acomodacoes_hospedagem_idx on public.hospedagem_acomodacoes (hospedagem_id);

create or replace function public.eda_preparar_acomodacao()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_empresa uuid;
begin
  select empresa_id into v_empresa from public.hospedagens where id = new.hospedagem_id;
  if v_empresa is null then raise exception 'Hospedagem não encontrada.'; end if;
  if tg_op = 'UPDATE' and new.hospedagem_id <> old.hospedagem_id then
    raise exception 'A acomodação não pode trocar de hospedagem.';
  end if;
  new.empresa_id := v_empresa;
  new.nome := btrim(new.nome);
  new.atualizado_em := now();
  return new;
end; $$;
revoke all on function public.eda_preparar_acomodacao() from public, anon, authenticated;
drop trigger if exists trg_eda_preparar_acomodacao on public.hospedagem_acomodacoes;
create trigger trg_eda_preparar_acomodacao before insert or update on public.hospedagem_acomodacoes
  for each row execute function public.eda_preparar_acomodacao();

-- ---------------------------------------------------------------------------
-- 3. Noites reservadas (reserva ↔ acomodação)
-- ---------------------------------------------------------------------------
create table if not exists public.reserva_hospedagens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresa(id) on delete cascade,
  reserva_id uuid not null references public.reservas(id) on delete cascade,
  acomodacao_id uuid not null references public.hospedagem_acomodacoes(id) on delete restrict,
  checkin date not null,
  checkout date not null,
  unidades integer not null default 1,
  hospedes integer not null default 1,
  observacao text,
  criado_em timestamptz not null default now(),
  constraint reserva_hosp_datas_check check (checkout > checkin and checkout - checkin <= 90),
  constraint reserva_hosp_unidades_check check (unidades between 1 and 200),
  constraint reserva_hosp_hospedes_check check (hospedes between 1 and 500),
  constraint reserva_hosp_obs_check check (observacao is null or char_length(observacao) <= 300)
);
create index if not exists reserva_hosp_acomodacao_idx on public.reserva_hospedagens (acomodacao_id, checkin, checkout);
create index if not exists reserva_hosp_reserva_idx on public.reserva_hospedagens (reserva_id);

-- Unidades ocupadas por noite (reservas não canceladas).
create or replace function public.eda_ocupacao_noites(p_acomodacao uuid, p_de date, p_ate date, p_ignorar uuid default null)
returns table (noite date, ocupadas integer)
language sql stable security definer set search_path = public as $$
  select d::date, coalesce(sum(rh.unidades), 0)::integer
  from generate_series(p_de, p_ate - 1, interval '1 day') d
  left join public.reserva_hospedagens rh
    on rh.acomodacao_id = p_acomodacao and rh.checkin <= d::date and rh.checkout > d::date
   and (p_ignorar is null or rh.id <> p_ignorar)
   and exists (select 1 from public.reservas r where r.id = rh.reserva_id and lower(coalesce(r.status, '')) <> 'cancelada')
  group by d order by d;
$$;
revoke all on function public.eda_ocupacao_noites(uuid, date, date, uuid) from public, anon, authenticated;

create or replace function public.eda_validar_reserva_hospedagem()
returns trigger language plpgsql security definer set search_path = public as $$
declare a public.hospedagem_acomodacoes; v_res_empresa uuid; v_pior integer; v_noite date;
begin
  select * into a from public.hospedagem_acomodacoes where id = new.acomodacao_id for update;
  select empresa_id into v_res_empresa from public.reservas where id = new.reserva_id;
  if a.id is null or v_res_empresa is null or a.empresa_id <> v_res_empresa then
    raise exception 'Acomodação ou reserva inválida para esta empresa.';
  end if;
  if a.status <> 'ativa' then raise exception 'Esta acomodação está em manutenção ou inativa.'; end if;
  if new.hospedes > a.capacidade * new.unidades then
    raise exception 'EDA_CAPACIDADE_ACOMODACAO: % unidade(s) comportam até % hóspede(s).', new.unidades, a.capacidade * new.unidades;
  end if;
  new.empresa_id := a.empresa_id;

  select o.noite, o.ocupadas into v_noite, v_pior
  from public.eda_ocupacao_noites(a.id, new.checkin, new.checkout, new.id) o
  order by o.ocupadas desc, o.noite limit 1;
  if v_pior + new.unidades > a.quantidade then
    raise exception 'EDA_HOSPEDAGEM_LOTADA: em % restam % unidade(s).',
      to_char(v_noite, 'DD/MM'), greatest(a.quantidade - v_pior, 0);
  end if;
  return new;
end; $$;
revoke all on function public.eda_validar_reserva_hospedagem() from public, anon, authenticated;
drop trigger if exists trg_eda_validar_reserva_hospedagem on public.reserva_hospedagens;
create trigger trg_eda_validar_reserva_hospedagem before insert or update on public.reserva_hospedagens
  for each row execute function public.eda_validar_reserva_hospedagem();

-- ---------------------------------------------------------------------------
-- 4. RLS (mesmo padrão de passeios; módulo hospedagens)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['hospedagem_acomodacoes', 'reserva_hospedagens'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('drop policy if exists %I on public.%I', t || '_empresa', t);
    execute format('drop policy if exists %I on public.%I', t || '_equipe', t);
    execute format($p$create policy %I on public.%I for all to authenticated
      using (empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid())))
      with check (empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid())))$p$, t || '_empresa', t);
    execute format($p$create policy %I on public.%I as restrictive for all to authenticated
      using (exists (select 1 from public.perfis p where p.id = (select auth.uid()) and p.empresa_id is not null
        and p.role = any (array['admin_empresa','operador_empresa','financeiro','admin_plataforma'])))
      with check (exists (select 1 from public.perfis p where p.id = (select auth.uid()) and p.empresa_id is not null
        and p.role = any (array['admin_empresa','operador_empresa','admin_plataforma'])))$p$, t || '_equipe', t);
  end loop;
end $$;

drop policy if exists hospedagem_acomodacoes_modulo on public.hospedagem_acomodacoes;
create policy hospedagem_acomodacoes_modulo on public.hospedagem_acomodacoes as restrictive for all to authenticated
  using ((select public.ern_pode_acessar_modulo('hospedagens')))
  with check ((select public.ern_pode_acessar_modulo('hospedagens')));
-- reserva_hospedagens é lida tanto em Reservas quanto em Hospedagens.
drop policy if exists reserva_hospedagens_modulo on public.reserva_hospedagens;
create policy reserva_hospedagens_modulo on public.reserva_hospedagens as restrictive for all to authenticated
  using ((select public.ern_pode_acessar_modulo('reservas')) or (select public.ern_pode_acessar_modulo('hospedagens')))
  with check ((select public.ern_pode_acessar_modulo('reservas')) or (select public.ern_pode_acessar_modulo('hospedagens')));

-- ---------------------------------------------------------------------------
-- 5. Consultas da gestão
-- ---------------------------------------------------------------------------
create or replace function public.eda_empresa_equipe()
returns uuid language sql stable security definer set search_path = public as $$
  select p.empresa_id from public.perfis p
  where p.id = auth.uid() and p.empresa_id is not null
    and p.role = any (array['admin_empresa','operador_empresa','financeiro','admin_plataforma']);
$$;
revoke all on function public.eda_empresa_equipe() from public, anon, authenticated;

-- Disponibilidade por acomodação num período (mínimo livre entre as noites).
create or replace function public.disponibilidade_hospedagem_eda(p_hospedagem_id uuid, p_checkin date, p_checkout date, p_ignorar uuid default null)
returns table (acomodacao_id uuid, nome text, tipo text, capacidade integer, quantidade integer, valor_diaria numeric, status text, livres integer)
language plpgsql stable security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_equipe();
begin
  if v_empresa is null then raise exception 'Sem acesso.'; end if;
  if p_checkout <= p_checkin or p_checkout - p_checkin > 90 then raise exception 'Período inválido.'; end if;
  return query
  select a.id, a.nome, a.tipo, a.capacidade, a.quantidade,
    coalesce(a.valor_diaria, h.valor_diaria), a.status,
    case when a.status <> 'ativa' then 0 else
      greatest(a.quantidade - coalesce((select max(o.ocupadas) from public.eda_ocupacao_noites(a.id, p_checkin, p_checkout, p_ignorar) o), 0), 0) end
  from public.hospedagem_acomodacoes a join public.hospedagens h on h.id = a.hospedagem_id
  where a.hospedagem_id = p_hospedagem_id and a.empresa_id = v_empresa
  order by a.nome;
end; $$;

-- Ocupação de hoje por hospedagem (substitui o status manual na listagem).
create or replace function public.ocupacao_hospedagens_eda(p_data date default null)
returns table (hospedagem_id uuid, unidades integer, ocupadas integer, hospedes integer, proxima_entrada date)
language plpgsql stable security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_equipe();
  v_dia date := coalesce(p_data, (now() at time zone 'America/Manaus')::date);
begin
  if v_empresa is null then raise exception 'Sem acesso.'; end if;
  return query
  with ativas as (
    select rh.*, a.hospedagem_id from public.reserva_hospedagens rh
    join public.hospedagem_acomodacoes a on a.id = rh.acomodacao_id
    join public.reservas r on r.id = rh.reserva_id
    where rh.empresa_id = v_empresa and lower(coalesce(r.status, '')) <> 'cancelada'
  )
  select h.id,
    coalesce((select sum(a.quantidade) from public.hospedagem_acomodacoes a where a.hospedagem_id = h.id and a.status = 'ativa'), 0)::integer,
    coalesce((select sum(x.unidades) from ativas x where x.hospedagem_id = h.id and x.checkin <= v_dia and x.checkout > v_dia), 0)::integer,
    coalesce((select sum(x.hospedes) from ativas x where x.hospedagem_id = h.id and x.checkin <= v_dia and x.checkout > v_dia), 0)::integer,
    (select min(x.checkin) from ativas x where x.hospedagem_id = h.id and x.checkin > v_dia)
  from public.hospedagens h where h.empresa_id = v_empresa;
end; $$;

-- Mapa de ocupação: noites × acomodações + estadias do período.
create or replace function public.mapa_hospedagem_eda(p_hospedagem_id uuid, p_de date, p_dias integer default 14)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_equipe(); v_ate date;
begin
  if v_empresa is null then raise exception 'Sem acesso.'; end if;
  v_ate := p_de + least(greatest(p_dias, 1), 60);
  return jsonb_build_object(
    'noites', (select jsonb_agg(d::date order by d) from generate_series(p_de, v_ate - 1, interval '1 day') d),
    'acomodacoes', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'nome', a.nome, 'quantidade', a.quantidade, 'status', a.status,
        'ocupacao', (select jsonb_agg(o.ocupadas order by o.noite) from public.eda_ocupacao_noites(a.id, p_de, v_ate) o))
        order by a.nome)
      from public.hospedagem_acomodacoes a where a.hospedagem_id = p_hospedagem_id and a.empresa_id = v_empresa), '[]'::jsonb),
    'estadias', coalesce((
      select jsonb_agg(jsonb_build_object('id', rh.id, 'reserva_id', rh.reserva_id, 'cliente', r.cliente,
        'acomodacao', a.nome, 'checkin', rh.checkin, 'checkout', rh.checkout, 'unidades', rh.unidades,
        'hospedes', rh.hospedes, 'status', r.status) order by rh.checkin)
      from public.reserva_hospedagens rh
      join public.hospedagem_acomodacoes a on a.id = rh.acomodacao_id
      join public.reservas r on r.id = rh.reserva_id
      where a.hospedagem_id = p_hospedagem_id and rh.empresa_id = v_empresa
        and rh.checkin < v_ate and rh.checkout > p_de and lower(coalesce(r.status, '')) <> 'cancelada'), '[]'::jsonb)
  );
end; $$;

revoke all on function public.disponibilidade_hospedagem_eda(uuid, date, date, uuid) from public, anon;
revoke all on function public.ocupacao_hospedagens_eda(date) from public, anon;
revoke all on function public.mapa_hospedagem_eda(uuid, date, integer) from public, anon;
grant execute on function public.disponibilidade_hospedagem_eda(uuid, date, date, uuid) to authenticated;
grant execute on function public.ocupacao_hospedagens_eda(date) to authenticated;
grant execute on function public.mapa_hospedagem_eda(uuid, date, integer) to authenticated;

-- Fim da viagem considera também o checkout da hospedagem (base dos 120 dias da ficha).
create or replace function public.eda_fim_viagem(p_reserva_id uuid)
returns date language sql stable security definer set search_path = public as $$
  select greatest(
    coalesce(s.data_fim, r.data_fim_prevista, s.data_inicio, r.data_reserva),
    (select max(rh.checkout) from public.reserva_hospedagens rh where rh.reserva_id = r.id))
  from public.reservas r left join public.passeio_saidas s on s.id = r.saida_id
  where r.id = p_reserva_id;
$$;
revoke all on function public.eda_fim_viagem(uuid) from public, anon, authenticated;

-- EDA_RECURSOS_AGENDA_V1
-- Embarcações e guias com agenda real e aviso de conflito.
-- * reservas.guia_id (antes só o nome em texto, sem como checar conflito);
-- * período da reserva = saída (ou data/fim previsto);
-- * conflito = mesmo barco ou guia em reservas com períodos sobrepostos,
--   exceto quando são da MESMA saída (grupo que viaja junto);
-- * excesso de lotação do barco por dia;
-- * situação "Reservada / Em Tour" deixa de ser manual: vem da agenda.

-- Empresa imutável na edição (mesmo defeito corrigido em passeios/hospedagens).
create or replace function public.definir_empresa_embarcacao()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare v_empresa_id uuid;
begin
  if tg_op = 'UPDATE' then new.empresa_id := old.empresa_id; return new; end if;
  if auth.uid() is not null then
    select empresa_id into v_empresa_id from public.perfis where id = auth.uid();
    if v_empresa_id is null then raise exception 'Usuário autenticado não possui empresa vinculada.'; end if;
    new.empresa_id := v_empresa_id;
  elsif new.empresa_id is null then
    raise exception 'Embarcação precisa possuir empresa vinculada.';
  end if;
  return new;
end; $function$;

-- ---------------------------------------------------------------------------
-- Guia vinculado por id
-- ---------------------------------------------------------------------------
alter table public.reservas add column if not exists guia_id uuid references public.guias(id) on delete set null;
create index if not exists reservas_guia_idx on public.reservas (guia_id) where guia_id is not null;
create index if not exists reservas_embarcacao_idx on public.reservas (embarcacao_id) where embarcacao_id is not null;

-- guia_id manda; o texto "guia" acompanha (compatibilidade com telas/PDFs).
create or replace function public.eda_sincronizar_guia_reserva()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nome text; v_empresa uuid;
begin
  if new.guia_id is not null and (tg_op = 'INSERT' or new.guia_id is distinct from old.guia_id) then
    -- escolheu pelo cadastro: o nome acompanha
    select nome, empresa_id into v_nome, v_empresa from public.guias where id = new.guia_id;
    if v_empresa is distinct from new.empresa_id then
      raise exception 'O guia selecionado não pertence a esta empresa.';
    end if;
    new.guia := v_nome;
  elsif tg_op = 'INSERT' or new.guia is distinct from old.guia then
    -- telas antigas mandam só o nome: vincula ao cadastro quando existir
    new.guia_id := null;
    if nullif(btrim(new.guia), '') is not null then
      select id into new.guia_id from public.guias
      where empresa_id = new.empresa_id and lower(btrim(nome)) = lower(btrim(new.guia)) limit 1;
    end if;
  end if;
  return new;
end; $$;
revoke all on function public.eda_sincronizar_guia_reserva() from public, anon, authenticated;
drop trigger if exists zy_eda_sincronizar_guia_reserva on public.reservas;
create trigger zy_eda_sincronizar_guia_reserva before insert or update on public.reservas
  for each row execute function public.eda_sincronizar_guia_reserva();

-- Backfill: liga reservas antigas pelo nome do guia.
update public.reservas r set guia_id = g.id
from public.guias g
where r.guia_id is null and g.empresa_id = r.empresa_id
  and lower(btrim(g.nome)) = lower(btrim(r.guia));

-- ---------------------------------------------------------------------------
-- Período e conflitos
-- ---------------------------------------------------------------------------
create or replace view public.eda_reservas_periodo with (security_invoker = true) as
select r.id, r.empresa_id, r.cliente, r.status, r.saida_id, r.embarcacao_id, r.guia_id,
  greatest(coalesce(r.quantidade_pessoas, 1), 1) as pessoas,
  coalesce(p.nome, r.pacote) as passeio,
  coalesce(s.data_inicio, r.data_reserva) as inicio,
  greatest(coalesce(s.data_fim, r.data_fim_prevista, s.data_inicio, r.data_reserva), coalesce(s.data_inicio, r.data_reserva)) as fim,
  r.horario, r.horario_fim_previsto
from public.reservas r
left join public.passeio_saidas s on s.id = r.saida_id
left join public.passeios p on p.id = r.passeio_id
where lower(coalesce(r.status, '')) not in ('cancelada', 'não compareceu', 'nao compareceu');
revoke all on public.eda_reservas_periodo from anon;

-- Duas reservas disputam o recurso? (mesma saída = viajam juntas = não conflita)
create or replace function public.eda_sobrepoe(a public.eda_reservas_periodo, b public.eda_reservas_periodo)
returns boolean language sql immutable as $$
  select a.id <> b.id
    and (a.saida_id is null or b.saida_id is null or a.saida_id <> b.saida_id)
    and a.inicio <= b.fim and b.inicio <= a.fim
    and not (
      -- mesmo dia, horários conhecidos e sem cruzamento (ex.: manhã e tarde)
      a.inicio = a.fim and b.inicio = b.fim and a.inicio = b.inicio
      and a.horario is not null and b.horario is not null
      and a.horario_fim_previsto is not null and b.horario_fim_previsto is not null
      and (a.horario_fim_previsto <= b.horario or b.horario_fim_previsto <= a.horario)
    );
$$;

-- Conflitos de uma reserva (tela da reserva) ou da empresa num período (painel).
create or replace function public.conflitos_recursos_eda(p_reserva_id uuid default null, p_dias integer default 30)
returns table (recurso text, recurso_id uuid, recurso_nome text, reserva_id uuid, reserva_cliente text,
               outra_reserva_id uuid, outra_cliente text, outra_passeio text, inicio date, fim date)
language plpgsql stable security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_equipe(); v_hoje date := (now() at time zone 'America/Manaus')::date;
begin
  if v_empresa is null then raise exception 'Sem acesso.'; end if;
  return query
  with base as (
    select rp.* from public.eda_reservas_periodo rp
    where rp.empresa_id = v_empresa
      and (p_reserva_id is not null or rp.fim >= v_hoje and rp.inicio <= v_hoje + least(greatest(p_dias, 1), 120))
  )
  select 'embarcacao', a.embarcacao_id, e.nome, a.id, a.cliente, b.id, b.cliente, b.passeio,
         greatest(a.inicio, b.inicio), least(a.fim, b.fim)
  from base a join public.eda_reservas_periodo b
    on b.empresa_id = v_empresa and b.embarcacao_id = a.embarcacao_id and public.eda_sobrepoe(a, b)
  join public.embarcacoes e on e.id = a.embarcacao_id
  where a.embarcacao_id is not null and (p_reserva_id is null and a.id < b.id or a.id = p_reserva_id)
  union all
  select 'guia', a.guia_id, g.nome, a.id, a.cliente, b.id, b.cliente, b.passeio,
         greatest(a.inicio, b.inicio), least(a.fim, b.fim)
  from base a join public.eda_reservas_periodo b
    on b.empresa_id = v_empresa and b.guia_id = a.guia_id and public.eda_sobrepoe(a, b)
  join public.guias g on g.id = a.guia_id
  where a.guia_id is not null and (p_reserva_id is null and a.id < b.id or a.id = p_reserva_id)
  order by 9;
end; $$;

-- Pessoas por dia no barco (grupos da mesma saída somam) x capacidade.
create or replace function public.lotacao_embarcacoes_eda(p_dias integer default 30)
returns table (embarcacao_id uuid, nome text, capacidade integer, dia date, pessoas integer)
language plpgsql stable security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_equipe(); v_hoje date := (now() at time zone 'America/Manaus')::date;
begin
  if v_empresa is null then raise exception 'Sem acesso.'; end if;
  return query
  select e.id, e.nome, e.capacidade, d::date, sum(r.pessoas)::integer
  from public.eda_reservas_periodo r
  join public.embarcacoes e on e.id = r.embarcacao_id
  cross join lateral generate_series(greatest(r.inicio, v_hoje), least(r.fim, v_hoje + least(greatest(p_dias, 1), 120)), interval '1 day') d
  where r.empresa_id = v_empresa and e.capacidade is not null and e.capacidade > 0
  group by e.id, e.nome, e.capacidade, d
  having sum(r.pessoas) > e.capacidade
  order by d;
end; $$;

-- Agenda de um barco ou guia + situação calculada.
create or replace function public.agenda_recurso_eda(p_tipo text, p_id uuid, p_dias integer default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_equipe(); v_hoje date := (now() at time zone 'America/Manaus')::date; v jsonb;
begin
  if v_empresa is null then raise exception 'Sem acesso.'; end if;
  if p_tipo not in ('embarcacao', 'guia') then raise exception 'Tipo inválido.'; end if;
  select jsonb_build_object(
    'em_uso_hoje', exists (select 1 from public.eda_reservas_periodo r where r.empresa_id = v_empresa
      and (case when p_tipo = 'embarcacao' then r.embarcacao_id else r.guia_id end) = p_id
      and v_hoje between r.inicio and r.fim),
    'itens', coalesce(jsonb_agg(jsonb_build_object('reserva_id', r.id, 'cliente', r.cliente, 'passeio', r.passeio,
      'inicio', r.inicio, 'fim', r.fim, 'horario', r.horario, 'pessoas', r.pessoas, 'saida_id', r.saida_id,
      'status', r.status) order by r.inicio, r.horario nulls first), '[]'::jsonb))
  into v
  from public.eda_reservas_periodo r
  where r.empresa_id = v_empresa
    and (case when p_tipo = 'embarcacao' then r.embarcacao_id else r.guia_id end) = p_id
    and r.fim >= v_hoje and r.inicio <= v_hoje + least(greatest(p_dias, 1), 120);
  return v;
end; $$;

-- Situação de hoje de todos os barcos/guias (listagens).
create or replace function public.uso_recursos_hoje_eda()
returns table (recurso text, recurso_id uuid, em_uso_hoje boolean, proxima date)
language plpgsql stable security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_equipe(); v_hoje date := (now() at time zone 'America/Manaus')::date;
begin
  if v_empresa is null then raise exception 'Sem acesso.'; end if;
  return query
  select 'embarcacao', e.id,
    exists (select 1 from public.eda_reservas_periodo r where r.embarcacao_id = e.id and v_hoje between r.inicio and r.fim),
    (select min(r.inicio) from public.eda_reservas_periodo r where r.embarcacao_id = e.id and r.inicio > v_hoje)
  from public.embarcacoes e where e.empresa_id = v_empresa
  union all
  select 'guia', g.id,
    exists (select 1 from public.eda_reservas_periodo r where r.guia_id = g.id and v_hoje between r.inicio and r.fim),
    (select min(r.inicio) from public.eda_reservas_periodo r where r.guia_id = g.id and r.inicio > v_hoje)
  from public.guias g where g.empresa_id = v_empresa;
end; $$;

revoke all on function public.conflitos_recursos_eda(uuid, integer) from public, anon;
revoke all on function public.lotacao_embarcacoes_eda(integer) from public, anon;
revoke all on function public.agenda_recurso_eda(text, uuid, integer) from public, anon;
revoke all on function public.uso_recursos_hoje_eda() from public, anon;
grant execute on function public.conflitos_recursos_eda(uuid, integer) to authenticated;
grant execute on function public.lotacao_embarcacoes_eda(integer) to authenticated;
grant execute on function public.agenda_recurso_eda(text, uuid, integer) to authenticated;
grant execute on function public.uso_recursos_hoje_eda() to authenticated;

-- "Reservada"/"Em Tour" passam a ser calculados pela agenda; o banco guarda só a situação cadastral.
create or replace function public.eda_status_cadastral_recurso()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_table_name = 'embarcacoes' then
    if lower(coalesce(new.status, '')) in ('reservada', 'reservado', 'em uso', '') then new.status := 'Disponível'; end if;
  else
    if lower(coalesce(new.status, '')) in ('em tour', 'em_tour', '') then new.status := 'Ativo'; end if;
  end if;
  return new;
end; $$;
revoke all on function public.eda_status_cadastral_recurso() from public, anon, authenticated;
drop trigger if exists trg_eda_status_cadastral on public.embarcacoes;
create trigger trg_eda_status_cadastral before insert or update on public.embarcacoes for each row execute function public.eda_status_cadastral_recurso();
drop trigger if exists trg_eda_status_cadastral on public.guias;
create trigger trg_eda_status_cadastral before insert or update on public.guias for each row execute function public.eda_status_cadastral_recurso();
update public.embarcacoes set status = status where lower(coalesce(status,'')) in ('reservada','reservado','em uso','');
update public.guias set status = status where lower(coalesce(status,'')) in ('em tour','em_tour','');

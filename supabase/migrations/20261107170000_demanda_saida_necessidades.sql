-- EDA_DEMANDA_SAIDA_V1
-- Demanda ligada à saída: pessoas e dias reais + necessidades das fichas,
-- sempre AGREGADAS (contagens, sem nomes nem diagnósticos) — minimização LGPD.

alter table public.demandas
  add column if not exists saida_id uuid references public.passeio_saidas(id) on delete set null;
create index if not exists demandas_saida_idx on public.demandas (saida_id) where saida_id is not null;

-- Saídas futuras/recentes para o seletor da demanda.
create or replace function public.saidas_para_demanda_eda()
returns table (saida_id uuid, passeio text, data_inicio date, data_fim date, horario time, pessoas integer, status text)
language plpgsql stable security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_saude(); v_hoje date := (now() at time zone 'America/Manaus')::date;
begin
  return query
  select s.id, p.nome, s.data_inicio, s.data_fim, s.horario,
    public.eda_vagas_ocupadas_saida(s.id), s.status
  from public.passeio_saidas s join public.passeios p on p.id = s.passeio_id
  where s.empresa_id = v_empresa and s.status <> 'cancelada'
    and coalesce(s.data_fim, s.data_inicio) >= v_hoje - 7
  order by s.data_inicio limit 100;
end; $$;

create or replace function public.necessidades_saida_eda(p_saida_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_saude(); s public.passeio_saidas; v jsonb;
begin
  select * into s from public.passeio_saidas where id = p_saida_id and empresa_id = v_empresa;
  if s.id is null then raise exception 'Saída não encontrada.'; end if;

  with res as (
    select r.id, greatest(coalesce(r.quantidade_pessoas, 1), 1) as qtd
    from public.reservas r
    where r.saida_id = s.id and lower(coalesce(r.status, '')) <> 'cancelada'
  ), part as (
    select rp.id, rp.reserva_id, f.*
    from public.reserva_participantes rp
    join res on res.id = rp.reserva_id
    left join public.participante_fichas f on f.participante_id = rp.id
  )
  select jsonb_build_object(
    'passeio', (select nome from public.passeios where id = s.passeio_id),
    'data_inicio', s.data_inicio,
    'data_fim', coalesce(s.data_fim, s.data_inicio),
    'dias', coalesce(s.data_fim, s.data_inicio) - s.data_inicio + 1,
    'pessoas', coalesce((select sum(qtd) from res), 0),
    'fichas', (select count(*) from part where participante_id is not null),
    'restricoes', coalesce((select jsonb_object_agg(x, n) from (
        select x, count(*) n from part, unnest(part.restricoes_alimentares) x group by x) t), '{}'::jsonb),
    'alergias_graves', (select count(*) from part where alergia_gravidade = 'grave'),
    'alergias', (select count(*) from part where cardinality(alergias) > 0),
    'alergia_alimentar', (select count(*) from part where 'alimento' = any (alergias)),
    'nao_nadam', (select count(*) from part where sabe_nadar is false),
    'natacao_nao_informada', (select count(*) from part where participante_id is not null and sabe_nadar is null),
    'condicoes', (select count(*) from part where cardinality(condicoes) > 0),
    'medicacao', (select count(*) from part where nullif(btrim(medicacao_continua), '') is not null)
  ) into v;

  insert into public.ficha_acessos (empresa_id, reserva_id, participante_id, usuario_id, origem, acao)
  values (v_empresa, null, null, auth.uid(), 'operadora', 'necessidades_saida');

  return v;
end; $$;

create or replace function public.vincular_demanda_saida_eda(p_demanda_id uuid, p_saida_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_saude();
begin
  if p_saida_id is not null and not exists (
    select 1 from public.passeio_saidas where id = p_saida_id and empresa_id = v_empresa) then
    raise exception 'Saída não encontrada.';
  end if;
  update public.demandas set saida_id = p_saida_id
  where id = p_demanda_id and empresa_id = v_empresa;
  if not found then raise exception 'Demanda não encontrada.'; end if;
end; $$;

revoke all on function public.saidas_para_demanda_eda() from public, anon;
revoke all on function public.necessidades_saida_eda(uuid) from public, anon;
revoke all on function public.vincular_demanda_saida_eda(uuid, uuid) from public, anon;
grant execute on function public.saidas_para_demanda_eda() to authenticated;
grant execute on function public.necessidades_saida_eda(uuid) to authenticated;
grant execute on function public.vincular_demanda_saida_eda(uuid, uuid) to authenticated;

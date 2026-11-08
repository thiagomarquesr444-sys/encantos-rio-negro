-- EDA_ALERTA_SAUDE_RESERVA_V1
-- O alerta de saúde do painel sempre aponta para uma reserva (antes, em saídas
-- agrupadas, vinha sem reserva e o painel abria Passeios).
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
    -- Sempre devolve uma reserva (a que mais precisa de atenção na saída), para o
    -- painel abrir Gerenciar reserva → Participantes e saúde.
    (array_agg(x.id order by x.g desc, (x.pe + greatest(x.qtd - x.cadastrados, 0)) desc, x.d))[1],
    sum(x.qtd)::integer, sum(x.g)::integer, sum(x.at)::integer,
    sum(x.pe + greatest(x.qtd - x.cadastrados, 0))::integer
  from por_reserva x
  group by x.saida_id, case when x.saida_id is null then x.id end
  order by 1;
end; $$;
revoke all on function public.alertas_proximas_viagens_eda(integer) from public, anon;
grant execute on function public.alertas_proximas_viagens_eda(integer) to authenticated;

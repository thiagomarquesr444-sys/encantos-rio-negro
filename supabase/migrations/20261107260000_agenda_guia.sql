-- EDA_AGENDA_GUIA_V1: o guia (conta própria) vê as viagens em que foi escalado
-- pelas operadoras. Saúde só em contagem; detalhes ficam com a operadora.
create or replace function public.minhas_viagens_guia_eda(p_dias integer default 60)
returns table (reserva_id uuid, operadora text, passeio text, inicio date, fim date, horario time,
               pessoas integer, ponto_embarque text, embarcacao text, alertas_graves integer, fichas_pendentes integer)
language plpgsql stable security definer set search_path = public as $$
declare v_hoje date := (now() at time zone 'America/Manaus')::date;
begin
  if auth.uid() is null then raise exception 'Sem acesso.'; end if;
  return query
  select r.id,
    coalesce((select pp.nome_publico from public.perfis_publicos pp where pp.empresa_id = r.empresa_id and pp.origem_tipo = 'empresa' limit 1),
             (select e.nome from public.empresa e where e.id = r.empresa_id)),
    r.passeio, r.inicio, r.fim, r.horario, r.pessoas, p.ponto_embarque, em.nome,
    (select count(*) from public.reserva_participantes rp join public.participante_fichas f on f.participante_id = rp.id
      where rp.reserva_id = r.id and (f.alergia_gravidade = 'grave' or f.sabe_nadar is false or f.condicoes && array['cardiaca','epilepsia','gestante']))::integer,
    greatest(r.pessoas - (select count(*) from public.reserva_participantes rp join public.participante_fichas f on f.participante_id = rp.id where rp.reserva_id = r.id), 0)::integer
  from public.eda_reservas_periodo r
  join public.guias g on g.id = r.guia_id and g.usuario_id = auth.uid()
  left join public.reservas rr on rr.id = r.id
  left join public.passeios p on p.id = rr.passeio_id
  left join public.embarcacoes em on em.id = r.embarcacao_id
  where r.fim >= v_hoje and r.inicio <= v_hoje + least(greatest(p_dias, 1), 180)
  order by r.inicio, r.horario nulls first;
end; $$;
revoke all on function public.minhas_viagens_guia_eda(integer) from public, anon;
grant execute on function public.minhas_viagens_guia_eda(integer) to authenticated;

-- EDA_MAPA_OPERACAO_V1
-- Camada "Minha operação" do Mapa EDA: cadastros da operadora com a movimentação
-- dos próximos dias (saídas, pessoas, hóspedes, demandas abertas).
-- Sem coordenada, o front posiciona pela cidade/localidade do catálogo.

create or replace function public.mapa_operacao_eda(p_dias int default 7)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_empresa uuid;
  v_hoje date := (now() at time zone 'America/Manaus')::date;
  v_ate date;
begin
  select p.empresa_id into v_empresa from public.perfis p where p.id = auth.uid();
  if v_empresa is null or not public.ern_pode_acessar_modulo('mapa') then raise exception 'ERN_SEM_PERMISSAO'; end if;
  v_ate := v_hoje + least(greatest(coalesce(p_dias, 7), 1), 60);

  return jsonb_build_object('de', v_hoje, 'ate', v_ate, 'pontos', coalesce((
    select jsonb_agg(x) from (
      select jsonb_build_object('tipo', 'passeio', 'id', pa.id, 'nome', pa.nome, 'local', coalesce(nullif(pa.ponto_embarque, ''), pa.cidade),
        'cidade', pa.cidade, 'lat', pa.latitude, 'lng', pa.longitude, 'href', '/passeios',
        'saidas', (select count(*) from public.passeio_saidas s where s.passeio_id = pa.id and s.empresa_id = v_empresa
                    and s.data_inicio between v_hoje and v_ate and coalesce(s.status, '') not in ('cancelada')),
        'pessoas', (select coalesce(sum(rp.pessoas), 0) from public.eda_reservas_periodo rp join public.reservas r on r.id = rp.id
                     where rp.empresa_id = v_empresa and r.passeio_id = pa.id and rp.inicio between v_hoje and v_ate),
        'proxima', (select min(s.data_inicio) from public.passeio_saidas s where s.passeio_id = pa.id and s.empresa_id = v_empresa
                     and s.data_inicio >= v_hoje and coalesce(s.status, '') not in ('cancelada'))) as x
        from public.passeios pa where pa.empresa_id = v_empresa and coalesce(pa.situacao, 'ativo') not in ('inativo', 'arquivado')
      union all
      select jsonb_build_object('tipo', 'hospedagem', 'id', h.id, 'nome', h.nome, 'local', coalesce(nullif(h.endereco, ''), h.cidade),
        'cidade', h.cidade, 'lat', h.latitude, 'lng', h.longitude, 'href', '/hospedagens',
        'hospedes', (select coalesce(sum(rh.hospedes), 0) from public.reserva_hospedagens rh
                       join public.hospedagem_acomodacoes a on a.id = rh.acomodacao_id
                      where rh.empresa_id = v_empresa and a.hospedagem_id = h.id
                        and rh.checkin <= v_ate and rh.checkout > v_hoje))
        from public.hospedagens h where h.empresa_id = v_empresa and coalesce(h.status, 'ativo') not in ('inativo', 'inativa')
      union all
      select jsonb_build_object('tipo', 'parceiro', 'id', pr.id, 'nome', pr.nome, 'local', coalesce(nullif(pr.endereco, ''), pr.cidade),
        'cidade', pr.cidade, 'lat', pr.latitude, 'lng', pr.longitude, 'href', '/parceiros', 'categoria', pr.tipo)
        from public.parceiros pr where pr.empresa_id = v_empresa and coalesce(pr.status, 'ativo') not in ('inativo')
      union all
      select jsonb_build_object('tipo', 'demanda', 'id', d.id, 'nome', d.titulo, 'local', d.localidade,
        'cidade', d.localidade, 'lat', d.latitude, 'lng', d.longitude, 'href', '/demandas/editar/' || d.id,
        'inicio', d.data_inicio, 'status', d.status)
        from public.demandas d where d.empresa_id = v_empresa
         and lower(coalesce(d.status, '')) not in ('concluida','concluída','cancelada','entregue')
         and (d.data_fim is null or d.data_fim >= v_hoje)
    ) t), '[]'::jsonb));
end $$;
revoke all on function public.mapa_operacao_eda(int) from public, anon;
grant execute on function public.mapa_operacao_eda(int) to authenticated;

-- EDA_RELATORIO_COMPLEMENTOS_V1
-- Seções novas do relatório de operação: famílias (adultos/crianças/colo),
-- recebimentos por forma de pagamento, documentos, recebido sem nota e
-- prontidão das viagens de pesca. Complementa relatorio_operacao_eda.

create or replace function public.relatorio_complementos_eda(p_de date, p_ate date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_empresa uuid := public.eda_empresa_equipe();
  v_hoje date := (now() at time zone 'America/Manaus')::date;
begin
  if v_empresa is null then raise exception 'Sem acesso.'; end if;
  if p_ate < p_de or p_ate - p_de > 400 then raise exception 'Período inválido.'; end if;
  return (
    with ativas as (
      select rp.*, r.qtd_criancas, r.qtd_colo, r.valor_total, r.passeio_id
        from public.eda_reservas_periodo rp join public.reservas r on r.id = rp.id
       where rp.empresa_id = v_empresa and rp.inicio between p_de and p_ate
    ),
    receb as (
      select f.reserva_id, f.valor,
             coalesce(nullif(btrim(split_part(f.descricao, ' · ', 2)), ''), 'Não informada') as forma
        from public.financeiro f
       where f.empresa_id = v_empresa and lower(f.tipo) = 'receita'
         and lower(coalesce(f.status, '')) in ('pago','recebido')
         and coalesce(f.data_liquidacao, f.data_vencimento) between p_de and p_ate
    ),
    pesca as (
      select a.*,
        a.embarcacao_id is null or a.guia_id is null
        or not exists (select 1 from public.vouchers v where v.reserva_id = a.id)
        or coalesce(a.valor_total, 0) > coalesce((select sum(f.valor) from public.financeiro f where f.reserva_id = a.id
             and lower(f.tipo) = 'receita' and lower(coalesce(f.status, '')) in ('pago','recebido')), 0) + 0.009 as pendente
        from ativas a join public.passeios pa on pa.id = a.passeio_id
       where pa.categoria ilike '%pesca%' or pa.nome ilike '%pesca%'
    )
    select jsonb_build_object(
      'status', jsonb_build_object(
        'confirmadas', (select count(*) from ativas where lower(coalesce(status, '')) in ('confirmada','confirmado','concluida','concluída','realizada')),
        'pendentes', (select count(*) from ativas where lower(coalesce(status, '')) in ('pendente','', 'aguardando')),
        'outras', (select count(*) from ativas where lower(coalesce(status, '')) not in ('confirmada','confirmado','concluida','concluída','realizada','pendente','','aguardando'))),
      'familias', jsonb_build_object(
        'pessoas', (select coalesce(sum(pessoas), 0) from ativas),
        'criancas', (select coalesce(sum(qtd_criancas), 0) from ativas),
        'colo', (select coalesce(sum(qtd_colo), 0) from ativas),
        'adultos', (select coalesce(sum(greatest(pessoas - qtd_criancas - qtd_colo, 0)), 0) from ativas)),
      'formas_pagamento', coalesce((select jsonb_agg(jsonb_build_object('forma', forma, 'valor', total, 'n', n) order by total desc)
        from (select forma, sum(valor) total, count(*) n from receb group by forma) x), '[]'::jsonb),
      'documentos', jsonb_build_object(
        'vencidos', (select count(*) from public.documentos_operacao d where d.empresa_id = v_empresa and d.validade < v_hoje),
        'vencendo_30', (select count(*) from public.documentos_operacao d where d.empresa_id = v_empresa and d.validade between v_hoje and v_hoje + 30),
        'cadastrados', (select count(*) from public.documentos_operacao d where d.empresa_id = v_empresa)),
      'fiscal', jsonb_build_object(
        'recebido', (select coalesce(sum(valor), 0) from receb),
        'recebido_sem_nota', (select coalesce(sum(x.valor), 0) from receb x where x.reserva_id is null
          or not exists (select 1 from public.nfse_solicitacoes n where n.reserva_id = x.reserva_id and n.empresa_id = v_empresa))),
      'pesca', jsonb_build_object(
        'viagens', (select count(distinct coalesce(saida_id::text, id::text)) from pesca),
        'reservas', (select count(*) from pesca),
        'pescadores', (select coalesce(sum(pessoas), 0) from pesca),
        'reservas_pendentes', (select count(*) from pesca where pendente))
    )
  );
end; $$;
revoke all on function public.relatorio_complementos_eda(date, date) from public, anon;
grant execute on function public.relatorio_complementos_eda(date, date) to authenticated;

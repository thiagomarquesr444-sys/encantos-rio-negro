-- EDA_RELATORIO_OPERACAO_V1
-- Relatório gerencial único que lê a operação estruturada (saídas, reservas,
-- recebimentos, demandas, comissões, hospedagem, clientes, vouchers).
-- Dados de saúde só em contagem.

create or replace function public.relatorio_operacao_eda(p_de date, p_ate date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_equipe();
begin
  if v_empresa is null then raise exception 'Sem acesso.'; end if;
  if p_ate < p_de or p_ate - p_de > 400 then raise exception 'Período inválido.'; end if;
  return (
    with r as (
      select r.*, coalesce(s.data_inicio, r.data_reserva) as inicio,
        public.eda_valor_reserva(r) as valor_calc, coalesce(p.nome, r.pacote) as passeio_nome
      from public.reservas r
      left join public.passeio_saidas s on s.id = r.saida_id
      left join public.passeios p on p.id = r.passeio_id
      where r.empresa_id = v_empresa and coalesce(s.data_inicio, r.data_reserva) between p_de and p_ate
    ), ativas as (select * from r where lower(coalesce(status, '')) <> 'cancelada'),
    rec as (
      select coalesce(sum(f.valor) filter (where lower(coalesce(f.status, '')) in ('recebido', 'pago')), 0) recebido
      from public.financeiro f join ativas a on a.id = f.reserva_id where f.tipo = 'receita'
    ),
    sa as (
      select s.id, s.vagas_total, public.eda_vagas_ocupadas_saida(s.id) ocupadas
      from public.passeio_saidas s
      where s.empresa_id = v_empresa and s.status <> 'cancelada' and s.data_inicio between p_de and p_ate
    ),
    rent as (select * from public.rentabilidade_saidas_eda(p_de, p_ate)),
    hosp as (
      select coalesce(sum(rh.unidades * (least(rh.checkout, p_ate + 1) - greatest(rh.checkin, p_de))), 0) noites
      from public.reserva_hospedagens rh join public.reservas rr on rr.id = rh.reserva_id
      where rh.empresa_id = v_empresa and lower(coalesce(rr.status, '')) <> 'cancelada'
        and rh.checkin <= p_ate and rh.checkout > p_de
    ),
    cap as (
      select coalesce(sum(a.quantidade), 0) * (p_ate - p_de + 1) noites
      from public.hospedagem_acomodacoes a where a.empresa_id = v_empresa and a.status = 'ativa'
    ),
    cli as (
      select a.cliente_id,
        exists (select 1 from public.reservas o left join public.passeio_saidas os on os.id = o.saida_id
          where o.cliente_id = a.cliente_id and o.empresa_id = v_empresa and lower(coalesce(o.status, '')) <> 'cancelada'
            and coalesce(os.data_inicio, o.data_reserva) < p_de) retorno
      from ativas a where a.cliente_id is not null group by a.cliente_id
    )
    select jsonb_build_object(
      'periodo', jsonb_build_object('inicio', p_de, 'fim', p_ate),
      'reservas', jsonb_build_object(
        'ativas', (select count(*) from ativas),
        'canceladas', (select count(*) from r where lower(coalesce(status, '')) = 'cancelada'),
        'pessoas', (select coalesce(sum(greatest(coalesce(quantidade_pessoas, 1), 1)), 0) from ativas),
        'valor', (select coalesce(sum(valor_calc), 0) from ativas),
        'ticket_medio', (select coalesce(round(avg(valor_calc), 2), 0) from ativas where valor_calc > 0),
        'sem_cliente_vinculado', (select count(*) from ativas where cliente_id is null)),
      'recebimentos', jsonb_build_object(
        'recebido', (select recebido from rec),
        'a_receber', greatest((select coalesce(sum(valor_calc), 0) from ativas) - (select recebido from rec), 0)),
      'saidas', jsonb_build_object(
        'total', (select count(*) from sa),
        'vagas', (select coalesce(sum(vagas_total), 0) from sa),
        'ocupadas', (select coalesce(sum(ocupadas), 0) from sa),
        'ocupacao_pct', (select case when coalesce(sum(vagas_total), 0) > 0 then round(100.0 * sum(ocupadas) / sum(vagas_total), 1) else 0 end from sa)),
      'resultado', jsonb_build_object(
        'receita_saidas', (select coalesce(sum(receita), 0) from rent),
        'custos', (select coalesce(sum(greatest(custo_realizado, custo_estimado)), 0) from rent),
        'comissoes', (select coalesce(sum(valor_calc * coalesce(comissao_percentual, 0) / 100), 0) from ativas),
        'margem_saidas', (select coalesce(sum(margem), 0) from rent)),
      'hospedagem', jsonb_build_object(
        'noites_ocupadas', (select noites from hosp),
        'noites_disponiveis', (select noites from cap),
        'ocupacao_pct', (select case when c.noites > 0 then round(100.0 * h.noites / c.noites, 1) else 0 end from hosp h, cap c)),
      'clientes', jsonb_build_object(
        'atendidos', (select count(*) from cli),
        'retorno', (select count(*) from cli where retorno),
        'novos', (select count(*) from cli where not retorno),
        'origens', coalesce((select jsonb_agg(jsonb_build_object('origem', o, 'n', n) order by n desc)
          from (select coalesce(c.origem, 'Não informado') o, count(*) n from cli join public.clientes c on c.id = cli.cliente_id group by 1) t), '[]'::jsonb)),
      'top_passeios', coalesce((select jsonb_agg(x.t) from (
          select jsonb_build_object('passeio', passeio_nome, 'reservas', count(*),
            'pessoas', sum(greatest(coalesce(quantidade_pessoas, 1), 1)), 'valor', sum(valor_calc)) t
          from ativas group by passeio_nome order by sum(valor_calc) desc limit 8) x), '[]'::jsonb),
      'top_parceiros', coalesce((select jsonb_agg(to_jsonb(c)) from (select * from public.comissoes_parceiros_eda(p_de, p_ate) limit 8) c), '[]'::jsonb),
      'seguranca', jsonb_build_object(
        'participantes', (select count(*) from public.reserva_participantes rp join ativas a on a.id = rp.reserva_id),
        'fichas', (select count(*) from public.participante_fichas f join public.reserva_participantes rp on rp.id = f.participante_id join ativas a on a.id = rp.reserva_id)),
      'vouchers', jsonb_build_object(
        'emitidos', (select count(*) from public.vouchers v join ativas a on a.id = v.reserva_id),
        'utilizados', (select count(*) from public.vouchers v join ativas a on a.id = v.reserva_id where v.utilizado_em is not null or lower(coalesce(v.status, '')) = 'utilizado'))
    )
  );
end; $$;

revoke all on function public.relatorio_operacao_eda(date, date) from public, anon;
grant execute on function public.relatorio_operacao_eda(date, date) to authenticated;

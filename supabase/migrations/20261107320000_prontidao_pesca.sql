-- EDA_PRONTIDAO_PESCA_V1
-- Central de pesca: a lista de conferência deixa de ser manual (apagava ao
-- recarregar) e passa a ser calculada a partir dos dados de cada viagem de pesca.
-- Agrupa por saída (ou pela reserva avulsa). Fichas de saúde: só contagem (LGPD).

create or replace function public.prontidao_pesca_eda(p_dias int default 60)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_empresa uuid;
  v_hoje date := (now() at time zone 'America/Manaus')::date;
  v_ate date;
begin
  select p.empresa_id into v_empresa from public.perfis p
   where p.id = auth.uid() and p.role = any (array['admin_empresa','operador_empresa','financeiro','admin_plataforma']);
  if v_empresa is null or not (public.ern_pode_acessar_modulo('reservas') or public.ern_pode_acessar_modulo('passeios')) then
    raise exception 'ERN_SEM_PERMISSAO';
  end if;
  v_ate := v_hoje + least(greatest(coalesce(p_dias, 60), 1), 365);

  return jsonb_build_object(
    'licenca_operadora', (select jsonb_build_object('titulo', d.titulo, 'validade', d.validade)
                            from public.documentos_operacao d
                           where d.empresa_id = v_empresa and d.categoria = 'licenca_pesca'
                           order by d.validade desc nulls last limit 1),
    'passeios_pesca', (select count(*) from public.passeios pa where pa.empresa_id = v_empresa
                         and (pa.categoria ilike '%pesca%' or pa.nome ilike '%pesca%')),
    'viagens', coalesce((
    with base as (
      select rp.*, r.passeio_id, r.valor_total, coalesce(rp.saida_id::text, 'r:' || rp.id::text) as viagem
        from public.eda_reservas_periodo rp
        join public.reservas r on r.id = rp.id
        join public.passeios pa on pa.id = r.passeio_id
       where rp.empresa_id = v_empresa and rp.inicio between v_hoje and v_ate
         and (pa.categoria ilike '%pesca%' or pa.nome ilike '%pesca%')
    ),
    por_reserva as (
      select b.*,
        (select count(*) from public.reserva_participantes p where p.reserva_id = b.id) as participantes,
        (select count(*) from public.reserva_participantes p join public.participante_fichas f on f.participante_id = p.id
          where p.reserva_id = b.id and f.consentimento_em is not null) as fichas,
        exists (select 1 from public.vouchers v where v.reserva_id = b.id) as tem_voucher,
        coalesce(b.valor_total, 0) - coalesce((select sum(f.valor) from public.financeiro f where f.reserva_id = b.id
          and lower(f.tipo) = 'receita' and lower(coalesce(f.status, '')) in ('pago','recebido')), 0) as saldo,
        exists (select 1 from public.documentos_operacao d where d.empresa_id = v_empresa and d.embarcacao_id = b.embarcacao_id
          and d.categoria in ('tie_embarcacao','vistoria_marinha') and d.validade is not null and d.validade < b.fim) as emb_doc_vencido,
        exists (select 1 from public.documentos_operacao d where d.empresa_id = v_empresa and d.guia_id = b.guia_id
          and d.validade is not null and d.validade < b.fim) as guia_doc_vencido
      from base b
    )
    select jsonb_agg(v order by v->>'inicio') from (
      select jsonb_build_object(
        'viagem', viagem,
        'saida_id', max(saida_id::text),
        'reserva_id', case when count(*) = 1 then max(id::text) end,
        'passeio', max(passeio), 'inicio', min(inicio), 'fim', max(fim),
        'reservas', count(*), 'pessoas', sum(pessoas),
        'sem_embarcacao', count(*) filter (where embarcacao_id is null),
        'embarcacao', (select string_agg(distinct e.nome, ', ') from public.embarcacoes e where e.id in (select pr.embarcacao_id from por_reserva pr where pr.viagem = x.viagem)),
        'sem_guia', count(*) filter (where guia_id is null),
        'guia', (select string_agg(distinct g.nome, ', ') from public.guias g where g.id in (select pr.guia_id from por_reserva pr where pr.viagem = x.viagem)),
        'emb_doc_vencido', bool_or(emb_doc_vencido), 'guia_doc_vencido', bool_or(guia_doc_vencido),
        'participantes', sum(participantes), 'fichas', sum(fichas),
        'sem_voucher', count(*) filter (where not tem_voucher),
        'saldo', sum(greatest(saldo, 0)),
        'demandas', (select count(*) from public.demandas d where d.empresa_id = v_empresa and d.saida_id::text = max(x.saida_id::text))
      ) as v
      from por_reserva x group by viagem
    ) t), '[]'::jsonb));
end $$;
revoke all on function public.prontidao_pesca_eda(int) from public, anon;
grant execute on function public.prontidao_pesca_eda(int) to authenticated;

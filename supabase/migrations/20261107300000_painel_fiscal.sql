-- EDA_PAINEL_FISCAL_V1
-- Uma consulta para o Painel Fiscal: indicadores do mês (antes eram 5 contagens
-- sem filtro de mês), conciliação recebido x nota solicitada e reservas do
-- período com cliente/passeio (antes o seletor mostrava só o id).
-- p_mes nulo = histórico completo (limitado).

create or replace function public.painel_fiscal_eda(p_mes date default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_empresa uuid;
  v_ini timestamptz;
  v_fim timestamptz;
  r jsonb;
begin
  select p.empresa_id into v_empresa from public.perfis p
   where p.id = auth.uid() and p.role = any (array['admin_empresa','financeiro','admin_plataforma']);
  if v_empresa is null or not (public.ern_pode_acessar_modulo('financeiro') or public.ern_pode_acessar_modulo('relatorios')) then
    raise exception 'ERN_SEM_PERMISSAO';
  end if;
  if p_mes is not null then
    v_ini := (date_trunc('month', p_mes)::date)::timestamp at time zone 'America/Manaus';
    v_fim := ((date_trunc('month', p_mes) + interval '1 month')::date)::timestamp at time zone 'America/Manaus';
  end if;

  with sol as (
    select n.* from public.nfse_solicitacoes n
     where n.empresa_id = v_empresa and n.ambiente = 'simulacao'
       and (p_mes is null or (n.criado_em >= v_ini and n.criado_em < v_fim))
  ),
  receb as (
    -- Receitas efetivamente recebidas, pela data de liquidação.
    select f.reserva_id, f.valor, coalesce(f.data_liquidacao, f.data_vencimento) as dia
      from public.financeiro f
     where f.empresa_id = v_empresa and lower(f.tipo) = 'receita'
       and lower(coalesce(f.status, '')) in ('pago','recebido')
  ),
  receb_periodo as (
    select * from receb
     where p_mes is null or (dia >= (v_ini at time zone 'America/Manaus')::date and dia < (v_fim at time zone 'America/Manaus')::date)
  ),
  res as (
    select rp.id, rp.cliente, r0.cliente_id, rp.passeio, rp.inicio::date as inicio, r0.status,
           coalesce(r0.valor_total, 0)::numeric as valor_total,
           coalesce((select sum(x.valor) from receb x where x.reserva_id = rp.id), 0)::numeric as recebido,
           exists (select 1 from public.nfse_solicitacoes n where n.reserva_id = rp.id and n.empresa_id = v_empresa) as tem_solicitacao
      from public.eda_reservas_periodo rp
      join public.reservas r0 on r0.id = rp.id
     where rp.empresa_id = v_empresa
       and (p_mes is null
            or (rp.inicio >= (v_ini at time zone 'America/Manaus')::date and rp.inicio < (v_fim at time zone 'America/Manaus')::date)
            or exists (select 1 from receb_periodo x where x.reserva_id = rp.id))
     order by rp.inicio desc
     limit 200
  )
  select jsonb_build_object(
    'indicadores', jsonb_build_object(
      'total', (select count(*) from sol),
      'rascunho', (select count(*) from sol where status = 'rascunho'),
      'pendentes', (select count(*) from sol where status = 'validacao_pendente'),
      'simuladas', (select count(*) from sol where status = 'simulada'),
      'erros', (select count(*) from sol where status = 'erro_simulacao'),
      'valor_solicitado', (select coalesce(sum(valor_servico), 0) from sol where status <> 'erro_simulacao'),
      'recebido', (select coalesce(sum(valor), 0) from receb_periodo),
      'recebido_sem_nota', (select coalesce(sum(x.valor), 0) from receb_periodo x
                             where x.reserva_id is null or not exists
                               (select 1 from public.nfse_solicitacoes n where n.reserva_id = x.reserva_id and n.empresa_id = v_empresa)),
      'reservas_sem_nota', (select count(*) from res where recebido > 0 and not tem_solicitacao)),
    'solicitacoes', coalesce((select jsonb_agg(jsonb_build_object(
        'id', s.id, 'reserva_id', s.reserva_id, 'ambiente', s.ambiente, 'status', s.status,
        'valor_servico', s.valor_servico, 'criado_em', s.criado_em,
        'cliente', rp.cliente, 'passeio', rp.passeio) order by s.criado_em desc)
      from (select * from sol order by criado_em desc limit case when p_mes is null then 50 else 200 end) s
      left join public.eda_reservas_periodo rp on rp.id = s.reserva_id), '[]'::jsonb),
    'reservas', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'cliente', cliente, 'cliente_id', cliente_id, 'passeio', passeio, 'inicio', inicio,
        'status', status, 'valor_total', valor_total, 'recebido', recebido, 'tem_solicitacao', tem_solicitacao)
        order by (recebido > 0 and not tem_solicitacao) desc, inicio desc) from res), '[]'::jsonb)
  ) into r;
  return r;
end $$;
revoke all on function public.painel_fiscal_eda(date) from public, anon;
grant execute on function public.painel_fiscal_eda(date) to authenticated;

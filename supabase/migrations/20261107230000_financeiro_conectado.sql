-- EDA_FINANCEIRO_CONECTADO_V1
-- O financeiro passa a nascer da operação:
-- * contas a receber = valor das reservas − recebimentos vinculados;
-- * rentabilidade por saída = reservas − custos (demandas) − comissões;
-- * comissões do mês viram despesas a pagar, sem lançar duas vezes.

alter table public.financeiro
  add column if not exists demanda_id uuid references public.demandas(id) on delete set null,
  add column if not exists parceiro_id uuid references public.parceiros(id) on delete set null,
  add column if not exists referencia_mes date;
create index if not exists financeiro_reserva_idx on public.financeiro (reserva_id) where reserva_id is not null;
create index if not exists financeiro_demanda_idx on public.financeiro (demanda_id) where demanda_id is not null;
-- uma despesa de comissão por parceiro e mês
create unique index if not exists financeiro_comissao_mes_key on public.financeiro (empresa_id, parceiro_id, referencia_mes)
  where parceiro_id is not null and referencia_mes is not null;

create or replace function public.eda_valor_reserva(r public.reservas)
returns numeric language sql immutable as $$
  select coalesce(nullif(r.valor_total, 0), r.valor, 0)::numeric;
$$;

-- Contas a receber das reservas no período (data da viagem).
create or replace function public.contas_receber_eda(p_de date, p_ate date)
returns table (reserva_id uuid, cliente text, passeio text, inicio date, status text,
               valor numeric, recebido numeric, pendente_lancado numeric, saldo numeric)
language plpgsql stable security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_equipe();
begin
  if v_empresa is null then raise exception 'Sem acesso.'; end if;
  if p_ate < p_de or p_ate - p_de > 400 then raise exception 'Período inválido.'; end if;
  return query
  select r.id, r.cliente, coalesce(p.nome, r.pacote), coalesce(s.data_inicio, r.data_reserva), r.status,
    public.eda_valor_reserva(r),
    coalesce((select sum(f.valor) from public.financeiro f where f.reserva_id = r.id and f.tipo = 'receita'
      and lower(coalesce(f.status, '')) in ('recebido', 'pago')), 0)::numeric,
    coalesce((select sum(f.valor) from public.financeiro f where f.reserva_id = r.id and f.tipo = 'receita'
      and lower(coalesce(f.status, '')) not in ('recebido', 'pago', 'cancelado')), 0)::numeric,
    greatest(public.eda_valor_reserva(r) - coalesce((select sum(f.valor) from public.financeiro f where f.reserva_id = r.id
      and f.tipo = 'receita' and lower(coalesce(f.status, '')) in ('recebido', 'pago')), 0), 0)::numeric
  from public.reservas r
  left join public.passeio_saidas s on s.id = r.saida_id
  left join public.passeios p on p.id = r.passeio_id
  where r.empresa_id = v_empresa and lower(coalesce(r.status, '')) <> 'cancelada'
    and coalesce(s.data_inicio, r.data_reserva) between p_de and p_ate
  order by 4, 2;
end; $$;

-- Rentabilidade das saídas no período.
create or replace function public.rentabilidade_saidas_eda(p_de date, p_ate date)
returns table (saida_id uuid, passeio text, data_inicio date, data_fim date, pessoas integer, reservas integer,
               receita numeric, recebido numeric, custo_estimado numeric, custo_realizado numeric,
               comissoes numeric, margem numeric)
language plpgsql stable security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_equipe();
begin
  if v_empresa is null then raise exception 'Sem acesso.'; end if;
  if p_ate < p_de or p_ate - p_de > 400 then raise exception 'Período inválido.'; end if;
  return query
  with sa as (
    select s.* from public.passeio_saidas s
    where s.empresa_id = v_empresa and s.status <> 'cancelada' and s.data_inicio between p_de and p_ate
  ), res as (
    select r.saida_id, count(*) n, sum(greatest(coalesce(r.quantidade_pessoas, 1), 1)) pessoas,
      sum(public.eda_valor_reserva(r)) receita,
      sum(public.eda_valor_reserva(r) * coalesce(r.comissao_percentual, 0) / 100) comissoes,
      sum(coalesce((select sum(f.valor) from public.financeiro f where f.reserva_id = r.id and f.tipo = 'receita'
        and lower(coalesce(f.status, '')) in ('recebido', 'pago')), 0)) recebido
    from public.reservas r join sa on sa.id = r.saida_id
    where lower(coalesce(r.status, '')) <> 'cancelada'
    group by r.saida_id
  ), cus as (
    select d.saida_id,
      sum(coalesce((select sum(coalesce(i.total_estimado, 0)) from public.demanda_itens i where i.demanda_id = d.id), 0)) estimado,
      sum(coalesce((select sum(f.valor) from public.financeiro f where f.demanda_id = d.id and f.tipo = 'despesa'
        and lower(coalesce(f.status, '')) <> 'cancelado'), 0)) realizado
    from public.demandas d join sa on sa.id = d.saida_id
    group by d.saida_id
  )
  select sa.id, p.nome, sa.data_inicio, sa.data_fim,
    coalesce(res.pessoas, 0)::integer, coalesce(res.n, 0)::integer,
    round(coalesce(res.receita, 0), 2), round(coalesce(res.recebido, 0), 2),
    round(coalesce(cus.estimado, 0), 2), round(coalesce(cus.realizado, 0), 2),
    round(coalesce(res.comissoes, 0), 2),
    round(coalesce(res.receita, 0) - greatest(coalesce(cus.realizado, 0), coalesce(cus.estimado, 0)) - coalesce(res.comissoes, 0), 2)
  from sa join public.passeios p on p.id = sa.passeio_id
  left join res on res.saida_id = sa.id
  left join cus on cus.saida_id = sa.id
  order by sa.data_inicio;
end; $$;

-- Recebimento de uma reserva (sinal, parcela ou quitação).
create or replace function public.registrar_recebimento_eda(p_reserva_id uuid, p_valor numeric, p_data date, p_descricao text default null, p_recebido boolean default true)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_equipe(); r public.reservas; v_rec numeric; v_id uuid;
begin
  if v_empresa is null then raise exception 'Sem acesso.'; end if;
  if not exists (select 1 from public.perfis where id = auth.uid() and role in ('admin_empresa', 'operador_empresa', 'financeiro', 'admin_plataforma')) then
    raise exception 'Sem acesso.';
  end if;
  select * into r from public.reservas where id = p_reserva_id and empresa_id = v_empresa for update;
  if r.id is null then raise exception 'Reserva não encontrada.'; end if;
  if p_valor is null or p_valor <= 0 or p_valor > 10000000 then raise exception 'Valor inválido.'; end if;
  select coalesce(sum(valor), 0) into v_rec from public.financeiro
  where reserva_id = r.id and tipo = 'receita' and lower(coalesce(status, '')) <> 'cancelado';
  if public.eda_valor_reserva(r) > 0 and v_rec + p_valor > public.eda_valor_reserva(r) + 0.01 then
    raise exception 'EDA_RECEBIMENTO_EXCEDE: saldo da reserva é %.', round(greatest(public.eda_valor_reserva(r) - v_rec, 0), 2);
  end if;
  insert into public.financeiro (descricao, tipo, valor, categoria, data_vencimento, status, reserva_id, user_id, empresa_id, data_liquidacao)
  values (coalesce(nullif(btrim(p_descricao), ''), 'Recebimento · ' || coalesce(r.cliente, 'reserva')),
    'receita', round(p_valor, 2), 'Turismo / Pacotes', coalesce(p_data, (now() at time zone 'America/Manaus')::date),
    case when p_recebido then 'Recebido' else 'Pendente' end, r.id, auth.uid(), v_empresa,
    case when p_recebido then coalesce(p_data, (now() at time zone 'America/Manaus')::date) end)
  returning id into v_id;
  return v_id;
end; $$;

-- Comissões do mês viram despesas a pagar (uma por parceiro; não duplica).
create or replace function public.lancar_comissoes_mes_eda(p_mes date)
returns integer language plpgsql security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_equipe(); v_ini date := date_trunc('month', p_mes)::date;
  v_fim date := (date_trunc('month', p_mes) + interval '1 month - 1 day')::date; v_n integer := 0; c record;
begin
  if v_empresa is null then raise exception 'Sem acesso.'; end if;
  if not exists (select 1 from public.perfis where id = auth.uid() and role in ('admin_empresa', 'financeiro', 'admin_plataforma')) then
    raise exception 'Sem acesso.';
  end if;
  for c in select * from public.comissoes_parceiros_eda(v_ini, v_fim) where comissao > 0 loop
    insert into public.financeiro (descricao, tipo, valor, categoria, data_vencimento, status, user_id, empresa_id, parceiro_id, referencia_mes)
    values ('Comissão · ' || c.parceiro || ' · ' || to_char(v_ini, 'MM/YYYY'), 'despesa', c.comissao, 'Comissões',
      (v_fim + 10), 'Pendente', auth.uid(), v_empresa, c.parceiro_id, v_ini)
    on conflict do nothing;
    if found then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end; $$;

revoke all on function public.contas_receber_eda(date, date) from public, anon;
revoke all on function public.rentabilidade_saidas_eda(date, date) from public, anon;
revoke all on function public.registrar_recebimento_eda(uuid, numeric, date, text, boolean) from public, anon;
revoke all on function public.lancar_comissoes_mes_eda(date) from public, anon;
grant execute on function public.contas_receber_eda(date, date) to authenticated;
grant execute on function public.rentabilidade_saidas_eda(date, date) to authenticated;
grant execute on function public.registrar_recebimento_eda(uuid, numeric, date, text, boolean) to authenticated;
grant execute on function public.lancar_comissoes_mes_eda(date) to authenticated;

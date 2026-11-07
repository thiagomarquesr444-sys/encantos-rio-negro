-- EDA_DOCUMENTOS_OPERACAO_V1
-- Central de Documentos passa a acompanhar a documentação legal da operação
-- (Cadastur, TIE/vistoria das embarcações, habilitação de arrais, seguro de
-- passageiros, alvarás, licenças) com validade, e cruza vencimentos com as
-- viagens já escaladas.

create table if not exists public.documentos_operacao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresa(id) on delete cascade,
  categoria text not null check (categoria in (
    'cadastur_empresa','cadastur_guia','tie_embarcacao','vistoria_marinha','habilitacao_arrais',
    'seguro_passageiros','alvara_funcionamento','licenca_ambiental','licenca_pesca','contrato_parceiro','outro')),
  titulo text not null check (char_length(btrim(titulo)) between 2 and 120),
  numero text check (numero is null or char_length(numero) <= 80),
  orgao_emissor text check (orgao_emissor is null or char_length(orgao_emissor) <= 80),
  embarcacao_id uuid references public.embarcacoes(id) on delete cascade,
  guia_id uuid references public.guias(id) on delete cascade,
  parceiro_id uuid references public.parceiros(id) on delete cascade,
  emissao date,
  validade date,
  observacao text check (observacao is null or char_length(observacao) <= 500),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint documentos_operacao_datas check (validade is null or emissao is null or validade >= emissao),
  constraint documentos_operacao_um_vinculo check (num_nonnulls(embarcacao_id, guia_id, parceiro_id) <= 1)
);
create index if not exists documentos_operacao_empresa_validade on public.documentos_operacao (empresa_id, validade);

-- Empresa vem do perfil e é imutável; vínculos precisam ser da mesma empresa.
create or replace function public.eda_preparar_documento_operacao()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_empresa uuid;
begin
  select p.empresa_id into v_empresa from public.perfis p where p.id = auth.uid();
  if tg_op = 'INSERT' then
    if v_empresa is null then raise exception 'ERN_USUARIO_SEM_EMPRESA'; end if;
    new.empresa_id := v_empresa;
  else
    new.empresa_id := old.empresa_id;
    new.criado_em := old.criado_em;
  end if;
  new.titulo := btrim(new.titulo);
  new.numero := nullif(btrim(coalesce(new.numero, '')), '');
  new.orgao_emissor := nullif(btrim(coalesce(new.orgao_emissor, '')), '');
  new.observacao := nullif(btrim(coalesce(new.observacao, '')), '');
  new.atualizado_em := now();
  if new.embarcacao_id is not null and not exists (select 1 from public.embarcacoes e where e.id = new.embarcacao_id and e.empresa_id = new.empresa_id)
     or new.guia_id is not null and not exists (select 1 from public.guias g where g.id = new.guia_id and g.empresa_id = new.empresa_id)
     or new.parceiro_id is not null and not exists (select 1 from public.parceiros pa where pa.id = new.parceiro_id and pa.empresa_id = new.empresa_id) then
    raise exception 'EDA_DOCUMENTO_VINCULO_INVALIDO';
  end if;
  return new;
end $$;
revoke all on function public.eda_preparar_documento_operacao() from public, anon, authenticated;
drop trigger if exists eda_preparar_documento_operacao on public.documentos_operacao;
create trigger eda_preparar_documento_operacao before insert or update on public.documentos_operacao
  for each row execute function public.eda_preparar_documento_operacao();

alter table public.documentos_operacao enable row level security;
revoke all on public.documentos_operacao from anon;
drop policy if exists documentos_operacao_empresa on public.documentos_operacao;
create policy documentos_operacao_empresa on public.documentos_operacao for all to authenticated
  using (empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid())))
  with check (empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid())));
drop policy if exists documentos_operacao_equipe on public.documentos_operacao;
create policy documentos_operacao_equipe on public.documentos_operacao as restrictive for all to authenticated
  using (exists (select 1 from public.perfis p where p.id = (select auth.uid()) and p.empresa_id is not null
    and p.role = any (array['admin_empresa','operador_empresa','financeiro','admin_plataforma'])))
  with check (exists (select 1 from public.perfis p where p.id = (select auth.uid()) and p.empresa_id is not null
    and p.role = any (array['admin_empresa','operador_empresa','admin_plataforma'])));
drop policy if exists documentos_operacao_modulo on public.documentos_operacao;
create policy documentos_operacao_modulo on public.documentos_operacao as restrictive for all to authenticated
  using ((select public.ern_pode_acessar_modulo('vouchers')) or (select public.ern_pode_acessar_modulo('relatorios'))
      or (select public.ern_pode_acessar_modulo('financeiro')))
  with check ((select public.ern_pode_acessar_modulo('vouchers')) or (select public.ern_pode_acessar_modulo('relatorios'))
      or (select public.ern_pode_acessar_modulo('financeiro')));

-- Painel da Central: mês escolhido + situação documental atual.
create or replace function public.painel_documentos_eda(p_mes date default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_empresa uuid;
  v_ini date := date_trunc('month', coalesce(p_mes, (now() at time zone 'America/Manaus')::date))::date;
  v_fim date;
  v_hoje date := (now() at time zone 'America/Manaus')::date;
  r jsonb;
begin
  select p.empresa_id into v_empresa from public.perfis p
   where p.id = auth.uid() and p.role = any (array['admin_empresa','operador_empresa','financeiro','admin_plataforma']);
  if v_empresa is null or not (public.ern_pode_acessar_modulo('vouchers') or public.ern_pode_acessar_modulo('relatorios')
      or public.ern_pode_acessar_modulo('financeiro')) then raise exception 'ERN_SEM_PERMISSAO'; end if;
  v_fim := (v_ini + interval '1 month')::date;

  with docs as (
    select d.*, case when d.validade is null then 'sem_validade'
                     when d.validade < v_hoje then 'vencido'
                     when d.validade <= v_hoje + 30 then 'vencendo' else 'em_dia' end as situacao
      from public.documentos_operacao d where d.empresa_id = v_empresa
  ),
  proximas as (
    select r.id, r.embarcacao_id, r.guia_id, r.cliente, r.passeio, r.inicio::date as dia, r.fim::date as fim
      from public.eda_reservas_periodo r
     where r.empresa_id = v_empresa and r.inicio::date between v_hoje and v_hoje + 30
  )
  select jsonb_build_object(
    'mes', v_ini,
    'documentos', coalesce((select jsonb_agg(jsonb_build_object(
        'id', d.id, 'categoria', d.categoria, 'titulo', d.titulo, 'numero', d.numero, 'orgao_emissor', d.orgao_emissor,
        'emissao', d.emissao, 'validade', d.validade, 'observacao', d.observacao, 'situacao', d.situacao,
        'embarcacao_id', d.embarcacao_id, 'guia_id', d.guia_id, 'parceiro_id', d.parceiro_id,
        'vinculo', coalesce(e.nome, g.nome, pa.nome))
        order by (d.situacao = 'vencido') desc, (d.situacao = 'vencendo') desc, d.validade nulls last, d.titulo)
      from docs d
      left join public.embarcacoes e on e.id = d.embarcacao_id
      left join public.guias g on g.id = d.guia_id
      left join public.parceiros pa on pa.id = d.parceiro_id), '[]'::jsonb),
    'resumo', jsonb_build_object(
      'vencidos', (select count(*) from docs where situacao = 'vencido'),
      'vencendo', (select count(*) from docs where situacao = 'vencendo'),
      'em_dia', (select count(*) from docs where situacao = 'em_dia'),
      'vouchers_mes', (select count(*) from public.vouchers v where v.empresa_id = v_empresa
                        and v.created_at >= v_ini and v.created_at < v_fim),
      'reservas_sem_voucher', (select count(*) from proximas p where not exists
                        (select 1 from public.vouchers v where v.reserva_id = p.id)),
      -- Valor financeiro só para quem tem o módulo Financeiro.
      'receber_mes', case when public.ern_pode_acessar_modulo('financeiro') then
                      (select coalesce(sum(f.valor), 0) from public.financeiro f where f.empresa_id = v_empresa
                        and lower(f.tipo) = 'receita' and lower(coalesce(f.status, '')) not in ('pago','recebido','cancelado','cancelada')
                        and f.data_vencimento >= v_ini and f.data_vencimento < v_fim) end),
    -- Viagens dos próximos 30 dias com embarcação/guia cujo documento vence antes da data.
    'riscos', coalesce((select jsonb_agg(distinct jsonb_build_object(
        'reserva_id', p.id, 'dia', p.dia, 'cliente', p.cliente, 'passeio', p.passeio, 'documento', d.titulo, 'validade', d.validade,
        'recurso', coalesce(e.nome, g.nome)))
      from proximas p
      join docs d on d.validade is not null and d.validade < p.fim
                 and ((d.embarcacao_id is not null and d.embarcacao_id = p.embarcacao_id)
                   or (d.guia_id is not null and d.guia_id = p.guia_id))
      left join public.embarcacoes e on e.id = d.embarcacao_id
      left join public.guias g on g.id = d.guia_id), '[]'::jsonb)
  ) into r;
  return r;
end $$;
revoke all on function public.painel_documentos_eda(date) from public, anon;
grant execute on function public.painel_documentos_eda(date) to authenticated;

-- EDA_PLANOS_PRO_PLUS_V1 (12/11/2026)
-- 1) Planos Pro e Plus com os novos preços.
-- 2) Carência de 5 dias para pagamento vencido; depois volta ao Grátis.
-- 3) Teste grátis concedido manualmente pelo CEO (uma vez por CNPJ/CPF, até 8 dias).
-- 4) Painel CEO exclusivo do Comando EDA.

-- ============================================================
-- 1. NOMES E PREÇOS
-- ============================================================
update public.planos set nome = 'Pro',  preco_mensal = 59.99 where codigo = 'pro';
update public.planos set nome = 'Plus', preco_mensal = 99.99 where codigo = 'premium';

update public.precos_planos pp
set valor = v.valor, updated_at = now()
from (values
  ('pro', 'mensal', 59.99), ('pro', 'trimestral', 161.97), ('pro', 'anual', 599.90),
  ('premium', 'mensal', 99.99), ('premium', 'trimestral', 269.97), ('premium', 'anual', 999.90)
) as v(codigo, ciclo, valor)
join public.planos p on p.codigo = v.codigo
where pp.plano_id = p.id and pp.ciclo_cobranca = v.ciclo;

-- ============================================================
-- 2. CARÊNCIA (o plano segue ativo durante os 5 dias)
-- ============================================================
alter table public.assinaturas_empresas
  add column if not exists inadimplente_desde timestamptz;

create or replace function public.ern_sincronizar_inadimplencia_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text := upper(coalesce(new.status, ''));
begin
  if new.assinatura_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and upper(coalesce(old.status, '')) = v_status then
    return new;
  end if;

  if v_status = 'OVERDUE' then
    update public.assinaturas_empresas a
       set inadimplente_desde = coalesce(a.inadimplente_desde, now()),
           updated_at = now()
     where a.id = new.assinatura_id
       and a.status = 'ativo'
       and a.provedor_assinatura_id is not null
       and a.provedor_assinatura_id = new.provedor_assinatura_id;
  elsif v_status in ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH') then
    update public.assinaturas_empresas a
       set inadimplente_desde = null,
           updated_at = now()
     where a.id = new.assinatura_id
       and a.inadimplente_desde is not null
       and not exists (
         select 1 from public.cobrancas_assinaturas c
          where c.assinatura_id = a.id
            and c.id <> new.id
            and c.provedor_assinatura_id = a.provedor_assinatura_id
            and upper(c.status) = 'OVERDUE'
       );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ern_inadimplencia_v1 on public.cobrancas_assinaturas;
create trigger trg_ern_inadimplencia_v1
after insert or update of status on public.cobrancas_assinaturas
for each row execute function public.ern_sincronizar_inadimplencia_v1();

-- Troca de assinatura no provedor encerra a carência da assinatura antiga.
create or replace function public.ern_limpar_carencia_na_troca_v1()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.provedor_assinatura_id is distinct from old.provedor_assinatura_id then
    new.inadimplente_desde := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ern_carencia_troca_v1 on public.assinaturas_empresas;
create trigger trg_ern_carencia_troca_v1
before update of provedor_assinatura_id on public.assinaturas_empresas
for each row execute function public.ern_limpar_carencia_na_troca_v1();

-- Usadas somente pelo cron (service_role).
create or replace function public.ern_limpar_inadimplencia_v1(p_assinatura_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.assinaturas_empresas
     set inadimplente_desde = null, updated_at = now()
   where id = p_assinatura_id;
$$;

create or replace function public.ern_rebaixar_inadimplente_v1(
  p_assinatura_id uuid,
  p_provedor_assinatura_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_a public.assinaturas_empresas%rowtype;
  v_free uuid;
begin
  select * into v_a from public.assinaturas_empresas
   where id = p_assinatura_id for update;
  if not found
     or v_a.provedor_assinatura_id is distinct from p_provedor_assinatura_id
     or v_a.inadimplente_desde is null
     or v_a.inadimplente_desde > now() - interval '5 days' then
    return jsonb_build_object('ok', false, 'codigo', 'ERN_FORA_DA_REGRA');
  end if;

  select id into v_free from public.planos where codigo = 'free';
  if v_free is null then
    raise exception 'Plano grátis não encontrado.';
  end if;

  update public.assinaturas_empresas
     set plano_id = v_free,
         status = 'ativo',
         ciclo_cobranca = null,
         renovacao_automatica = false,
         provedor_assinatura_id = null,
         provedor_assinatura_anterior_id = null,
         inadimplente_desde = null,
         trial_ate = null,
         updated_at = now()
   where id = p_assinatura_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- ============================================================
-- 3. CEO DO COMANDO EDA (exclusivo)
-- ============================================================
create table if not exists public.ern_comando_ceo_v1 (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);
alter table public.ern_comando_ceo_v1 enable row level security;
revoke all on public.ern_comando_ceo_v1 from anon, authenticated;

insert into public.ern_comando_ceo_v1 (usuario_id)
select id from auth.users where lower(email) = 'thiagomarquesr444@gmail.com'
on conflict do nothing;

create or replace function public.ern_eh_ceo_v1()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.ern_comando_ceo_v1 where usuario_id = (select auth.uid())
  );
$$;

-- ============================================================
-- 4. TESTE GRÁTIS (uma vez por empresa e por CNPJ/CPF)
-- ============================================================
create table if not exists public.ern_testes_concedidos_v1 (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null unique references public.empresa(id) on delete cascade,
  documento text not null unique check (documento ~ '^[0-9]{11}$|^[0-9]{14}$'),
  plano_id uuid not null references public.planos(id),
  dias integer not null check (dias between 1 and 8),
  inicio_em timestamptz not null default now(),
  fim_em timestamptz not null,
  concedido_por uuid not null references auth.users(id),
  encerrado_em timestamptz,
  criado_em timestamptz not null default now()
);
alter table public.ern_testes_concedidos_v1 enable row level security;
revoke all on public.ern_testes_concedidos_v1 from anon, authenticated;

create or replace function public.ern_comando_conceder_teste_v1(
  p_empresa_id uuid,
  p_plano_codigo text,
  p_dias integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_a public.assinaturas_empresas%rowtype;
  v_plano public.planos%rowtype;
  v_doc text;
  v_fim timestamptz;
begin
  if not public.ern_eh_ceo_v1() then
    raise exception 'SEM_PERMISSAO' using errcode = '42501';
  end if;
  if p_dias is null or p_dias < 1 or p_dias > 8 then
    return jsonb_build_object('ok', false, 'codigo', 'ERN_DIAS_INVALIDOS');
  end if;

  select * into v_plano from public.planos
   where codigo = p_plano_codigo and codigo in ('pro', 'premium') and ativo;
  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'ERN_PLANO_INVALIDO');
  end if;

  select regexp_replace(coalesce(cnpj, ''), '\D', '', 'g') into v_doc
    from public.empresa where id = p_empresa_id;
  if v_doc is null or length(v_doc) not in (11, 14) then
    return jsonb_build_object('ok', false, 'codigo', 'ERN_SEM_DOCUMENTO');
  end if;

  if exists (select 1 from public.ern_testes_concedidos_v1
              where empresa_id = p_empresa_id or documento = v_doc) then
    return jsonb_build_object('ok', false, 'codigo', 'ERN_TESTE_JA_USADO');
  end if;

  select * into v_a from public.assinaturas_empresas
   where empresa_id = p_empresa_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'ERN_ASSINATURA_NAO_ENCONTRADA');
  end if;

  if v_a.status <> 'ativo'
     or v_a.plano_id is distinct from (select id from public.planos where codigo = 'free')
     or v_a.provedor_assinatura_id is not null
     or v_a.provedor_assinatura_pendente_id is not null
     or v_a.plano_pendente_id is not null
     or exists (select 1 from public.ern_operacoes_assinatura_v1 o
                 where o.empresa_id = p_empresa_id
                   and o.estado in ('reservado', 'em_envio', 'aguardando_pagamento', 'reconciliar')) then
    return jsonb_build_object('ok', false, 'codigo', 'ERN_EMPRESA_NAO_ELEGIVEL');
  end if;

  v_fim := now() + make_interval(days => p_dias);

  insert into public.ern_testes_concedidos_v1
    (empresa_id, documento, plano_id, dias, fim_em, concedido_por)
  values (p_empresa_id, v_doc, v_plano.id, p_dias, v_fim, auth.uid());

  update public.assinaturas_empresas
     set plano_id = v_plano.id, status = 'trial', trial_ate = v_fim,
         ciclo_cobranca = null, updated_at = now()
   where id = v_a.id;

  return jsonb_build_object('ok', true, 'fim_em', v_fim);
end;
$$;

create or replace function public.ern_comando_encerrar_teste_v1(p_empresa_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.ern_eh_ceo_v1() then
    raise exception 'SEM_PERMISSAO' using errcode = '42501';
  end if;

  update public.assinaturas_empresas
     set plano_id = (select id from public.planos where codigo = 'free'),
         status = 'ativo', trial_ate = null, updated_at = now()
   where empresa_id = p_empresa_id and status = 'trial'
     and provedor_assinatura_id is null and provedor_assinatura_pendente_id is null;
  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'ERN_SEM_TESTE_ATIVO');
  end if;

  update public.ern_testes_concedidos_v1
     set encerrado_em = now()
   where empresa_id = p_empresa_id and encerrado_em is null;
  return jsonb_build_object('ok', true);
end;
$$;

-- Cron: testes vencidos voltam ao Grátis.
create or replace function public.ern_expirar_testes_v1()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  update public.assinaturas_empresas
     set plano_id = (select id from public.planos where codigo = 'free'),
         status = 'ativo', trial_ate = null, updated_at = now()
   where status = 'trial' and trial_ate <= now()
     and provedor_assinatura_id is null and provedor_assinatura_pendente_id is null;
  get diagnostics v_n = row_count;

  update public.ern_testes_concedidos_v1
     set encerrado_em = now()
   where encerrado_em is null and fim_em <= now();
  return v_n;
end;
$$;

-- ============================================================
-- 5. PAINEL CEO
-- ============================================================
create or replace function public.ern_comando_painel_planos_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.ern_eh_ceo_v1() then
    raise exception 'SEM_PERMISSAO' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'resumo', (
      select jsonb_build_object(
        'empresas', count(*),
        'pagantes', count(*) filter (where x.pagante),
        'em_teste', count(*) filter (where x.status = 'trial'),
        'em_carencia', count(*) filter (where x.inadimplente_desde is not null),
        'mrr', coalesce(round(sum(x.mensal) filter (where x.pagante), 2), 0),
        'recebido_30d', (select coalesce(sum(c.valor), 0) from public.cobrancas_assinaturas c
                          where upper(c.status) in ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH')
                            and c.pago_em >= now() - interval '30 days')
      )
      from (
        select a.status, a.inadimplente_desde,
               (a.status = 'ativo' and a.provedor_assinatura_id is not null and p.codigo <> 'free') as pagante,
               ult.valor / case a.ciclo_cobranca when 'trimestral' then 3 when 'anual' then 12 else 1 end as mensal
          from public.assinaturas_empresas a
          join public.planos p on p.id = a.plano_id
          left join lateral (
            select c.valor from public.cobrancas_assinaturas c
             where c.assinatura_id = a.id and c.provedor_assinatura_id = a.provedor_assinatura_id
             order by c.vencimento desc nulls last limit 1
          ) ult on true
      ) x
    ),
    'empresas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'nome', e.nome, 'cidade', e.cidade,
        'tem_documento', length(regexp_replace(coalesce(e.cnpj, ''), '\D', '', 'g')) in (11, 14),
        'plano', p.nome, 'plano_codigo', p.codigo, 'status', a.status,
        'ciclo', a.ciclo_cobranca, 'trial_ate', a.trial_ate,
        'inadimplente_desde', a.inadimplente_desde,
        'pagante', (a.status = 'ativo' and a.provedor_assinatura_id is not null and p.codigo <> 'free'),
        'teste_usado', exists (select 1 from public.ern_testes_concedidos_v1 t where t.empresa_id = e.id),
        'criada_em', e.created_at
      ) order by e.created_at desc)
      from public.empresa e
      join public.assinaturas_empresas a on a.empresa_id = e.id
      join public.planos p on p.id = a.plano_id
    ), '[]'::jsonb),
    'cobrancas', coalesce((
      select jsonb_agg(z) from (
        select e.nome as empresa, c.valor, c.status, c.vencimento, c.pago_em, c.ciclo_cobranca as ciclo
          from public.cobrancas_assinaturas c
          join public.empresa e on e.id = c.empresa_id
         order by c.created_at desc limit 20
      ) z
    ), '[]'::jsonb)
  );
end;
$$;

-- ============================================================
-- 6. PERMISSÕES
-- ============================================================
revoke all on function public.ern_sincronizar_inadimplencia_v1() from public, anon, authenticated;
revoke all on function public.ern_limpar_carencia_na_troca_v1() from public, anon, authenticated;
revoke all on function public.ern_limpar_inadimplencia_v1(uuid) from public, anon, authenticated;
revoke all on function public.ern_rebaixar_inadimplente_v1(uuid, text) from public, anon, authenticated;
revoke all on function public.ern_expirar_testes_v1() from public, anon, authenticated;
grant execute on function public.ern_limpar_inadimplencia_v1(uuid) to service_role;
grant execute on function public.ern_rebaixar_inadimplente_v1(uuid, text) to service_role;
grant execute on function public.ern_expirar_testes_v1() to service_role;

revoke all on function public.ern_eh_ceo_v1() from public, anon;
revoke all on function public.ern_comando_conceder_teste_v1(uuid, text, integer) from public, anon;
revoke all on function public.ern_comando_encerrar_teste_v1(uuid) from public, anon;
revoke all on function public.ern_comando_painel_planos_v1() from public, anon;
grant execute on function public.ern_eh_ceo_v1() to authenticated;
grant execute on function public.ern_comando_conceder_teste_v1(uuid, text, integer) to authenticated;
grant execute on function public.ern_comando_encerrar_teste_v1(uuid) to authenticated;
grant execute on function public.ern_comando_painel_planos_v1() to authenticated;

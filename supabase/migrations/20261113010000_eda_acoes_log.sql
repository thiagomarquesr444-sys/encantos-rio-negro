-- EDA_ACOES_LOG_V1: registro de tudo que a EDA executou com autorização do operador
-- (quem autorizou, quando, o que mudou) e base do "Desfazer" (arco e flecha).
create table if not exists public.eda_acoes_log (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  usuario_id uuid not null default auth.uid(),
  tabela text not null check (char_length(tabela) between 2 and 40),
  registro_id uuid,
  tipo text not null check (tipo in ('criar', 'alterar', 'lancar', 'baixar', 'demanda')),
  resumo text not null check (char_length(resumo) <= 500),
  antes jsonb,
  depois jsonb,
  extras jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  desfeito_em timestamptz
);

create index if not exists eda_acoes_log_empresa_idx on public.eda_acoes_log (empresa_id, criado_em desc);

alter table public.eda_acoes_log enable row level security;

drop policy if exists eda_acoes_log_mfa on public.eda_acoes_log;
create policy eda_acoes_log_mfa on public.eda_acoes_log as restrictive for all to authenticated
  using ((select public.eda_aal_ok())) with check ((select public.eda_aal_ok()));

drop policy if exists eda_acoes_log_ler on public.eda_acoes_log;
create policy eda_acoes_log_ler on public.eda_acoes_log for select to authenticated
  using (empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid())));

drop policy if exists eda_acoes_log_registrar on public.eda_acoes_log;
create policy eda_acoes_log_registrar on public.eda_acoes_log for insert to authenticated
  with check (
    usuario_id = (select auth.uid())
    and empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid()))
  );

-- Só quem executou marca como desfeito, e só a coluna desfeito_em (o resto é imutável).
drop policy if exists eda_acoes_log_desfazer on public.eda_acoes_log;
create policy eda_acoes_log_desfazer on public.eda_acoes_log for update to authenticated
  using (usuario_id = (select auth.uid()) and desfeito_em is null)
  with check (usuario_id = (select auth.uid()));

revoke all on public.eda_acoes_log from anon;
revoke update, delete, truncate on public.eda_acoes_log from authenticated;
grant select, insert on public.eda_acoes_log to authenticated;
grant update (desfeito_em) on public.eda_acoes_log to authenticated;

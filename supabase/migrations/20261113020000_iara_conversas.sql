-- IARA_MEMORIA_V1: conversa da Iara de quem está logado (uma por conta).
-- Aplicada no projeto em 13/11/2026.
create table if not exists public.iara_conversas (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  mensagens jsonb not null default '[]'::jsonb,
  ficha jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now(),
  constraint iara_conversas_tamanho check (pg_column_size(mensagens) < 120000 and jsonb_typeof(mensagens) = 'array' and jsonb_typeof(ficha) = 'object')
);
alter table public.iara_conversas enable row level security;
revoke all on public.iara_conversas from anon;
grant select, insert, update, delete on public.iara_conversas to authenticated;
create policy iara_conversas_select on public.iara_conversas for select to authenticated using ((select auth.uid()) = usuario_id);
create policy iara_conversas_insert on public.iara_conversas for insert to authenticated with check ((select auth.uid()) = usuario_id);
create policy iara_conversas_update on public.iara_conversas for update to authenticated using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);
create policy iara_conversas_delete on public.iara_conversas for delete to authenticated using ((select auth.uid()) = usuario_id);

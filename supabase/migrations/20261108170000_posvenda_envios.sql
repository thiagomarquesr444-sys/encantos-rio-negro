-- EDA_FASE_C_V1: registro das mensagens de pós-venda enviadas (sem o texto,
-- só o fato: quem, quando, qual reserva e qual tipo). Visível para toda a equipe
-- da operadora, em qualquer aparelho.
create table if not exists public.posvenda_envios (
  reserva_id uuid not null references public.reservas(id) on delete cascade,
  tipo text not null check (tipo in ('pre','vespera','pos')),
  empresa_id uuid not null references public.empresa(id) on delete cascade,
  enviado_em timestamptz not null default now(),
  enviado_por uuid references auth.users(id) on delete set null default auth.uid(),
  primary key (reserva_id, tipo)
);
alter table public.posvenda_envios enable row level security;
revoke all on table public.posvenda_envios from public, anon;
grant select, insert on table public.posvenda_envios to authenticated;

create policy posvenda_envios_ler on public.posvenda_envios for select to authenticated
  using (empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid())));
create policy posvenda_envios_gravar on public.posvenda_envios for insert to authenticated
  with check (
    empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid()))
    and (enviado_por is null or enviado_por = (select auth.uid()))
    and exists (select 1 from public.reservas r where r.id = reserva_id and r.empresa_id = posvenda_envios.empresa_id)
  );

-- EDA_FASE_B_V1
-- Pedidos de visitantes enviados pela Iara, somente com consentimento (LGPD).
-- Inserção só pelo servidor (service_role, via /api/pedido-visitante).
-- Leitura/atualização: a operadora dona do passeio; pedidos sem operadora
-- ficam com a administração da Encantos (tem_acesso_editorial_ern).
-- Retenção: todo pedido é apagado em 90 dias (convertido vira cliente/reserva).

create table if not exists public.pedidos_visitante (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  empresa_id uuid references public.empresa(id) on delete cascade,
  passeio_id uuid references public.passeios(id) on delete set null,
  passeio_nome text,
  nome text not null check (char_length(nome) between 2 and 80),
  contato_whatsapp text check (contato_whatsapp is null or char_length(contato_whatsapp) between 8 and 20),
  contato_email text check (contato_email is null or char_length(contato_email) between 5 and 254),
  idioma text not null default 'PT' check (idioma in ('PT','EN','ES')),
  periodo text check (periodo is null or char_length(periodo) <= 60),
  adultos smallint not null default 1 check (adultos between 1 and 99),
  criancas smallint not null default 0 check (criancas between 0 and 99),
  mensagem text check (mensagem is null or char_length(mensagem) <= 800),
  resumo_iara text check (resumo_iara is null or char_length(resumo_iara) <= 800),
  consentimento_em timestamptz not null,
  consentimento_texto text not null,
  status text not null default 'novo' check (status in ('novo','em_contato','convertido','descartado')),
  atualizado_em timestamptz not null default now(),
  expira_em timestamptz not null default now() + interval '90 days',
  constraint pedido_tem_contato check (contato_whatsapp is not null or contato_email is not null)
);
create index if not exists pedidos_visitante_empresa_idx on public.pedidos_visitante (empresa_id, status, criado_em desc);

alter table public.pedidos_visitante enable row level security;
revoke all on table public.pedidos_visitante from public, anon, authenticated;
grant select, update (status, atualizado_em) on table public.pedidos_visitante to authenticated;

drop policy if exists pedidos_visitante_ler on public.pedidos_visitante;
create policy pedidos_visitante_ler on public.pedidos_visitante for select to authenticated
  using (
    (empresa_id is not null and empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid())))
    or (empresa_id is null and public.tem_acesso_editorial_ern())
  );

drop policy if exists pedidos_visitante_status on public.pedidos_visitante;
create policy pedidos_visitante_status on public.pedidos_visitante for update to authenticated
  using (
    (empresa_id is not null and empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid())))
    or (empresa_id is null and public.tem_acesso_editorial_ern())
  )
  with check (status in ('novo','em_contato','convertido','descartado'));

-- Remove pedidos vencidos (chamada a cada novo pedido).
create or replace function public.limpar_pedidos_visitante_vencidos()
returns void language sql security definer set search_path = public as $$
  delete from public.pedidos_visitante where expira_em < now();
$$;
revoke all on function public.limpar_pedidos_visitante_vencidos() from public, anon, authenticated;
grant execute on function public.limpar_pedidos_visitante_vencidos() to service_role;

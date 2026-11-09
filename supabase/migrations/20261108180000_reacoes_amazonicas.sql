-- EDA_REACOES_V1: reações amazônicas no feed (uma por pessoa por publicação).
-- São apenas reações: medem interesse e destacam o que é mais procurado.
-- Não são reservas nem pedidos. Contagens públicas são só totais (sem quem reagiu).

create table if not exists public.reacoes_publicacoes (
  usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  publicacao_id uuid not null references public.publicacoes(id) on delete cascade,
  reacao text not null check (reacao in ('quero_ir','lindeza','encantei','pai_degua','cultura')),
  created_at timestamptz not null default now(),
  primary key (usuario_id, publicacao_id)
);
create index if not exists reacoes_publicacoes_pub_idx on public.reacoes_publicacoes (publicacao_id, reacao);

alter table public.reacoes_publicacoes enable row level security;
revoke all on table public.reacoes_publicacoes from public, anon;
grant select, insert, update, delete on table public.reacoes_publicacoes to authenticated;

create policy reacoes_ler_proprias on public.reacoes_publicacoes for select to authenticated
  using (usuario_id = (select auth.uid()));
create policy reacoes_inserir on public.reacoes_publicacoes for insert to authenticated
  with check (
    usuario_id = (select auth.uid())
    and exists (select 1 from public.publicacoes p where p.id = publicacao_id and p.status = 'publicado'
      and p.publicado_em is not null and p.publicado_em <= now() and p.permitir_interacoes = true)
  );
create policy reacoes_trocar on public.reacoes_publicacoes for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (
    usuario_id = (select auth.uid())
    and exists (select 1 from public.publicacoes p where p.id = publicacao_id and p.status = 'publicado'
      and p.publicado_em is not null and p.publicado_em <= now() and p.permitir_interacoes = true)
  );
create policy reacoes_apagar on public.reacoes_publicacoes for delete to authenticated
  using (usuario_id = (select auth.uid()));

-- Migra as interações antigas: "curtida" (arco) vira "lindeza"; "quero_ir" continua.
insert into public.reacoes_publicacoes (usuario_id, publicacao_id, reacao, created_at)
select distinct on (usuario_id, publicacao_id) usuario_id, publicacao_id,
  case when tipo = 'quero_ir' then 'quero_ir' else 'lindeza' end, created_at
from public.interacoes_publicacoes where tipo in ('curtida','quero_ir')
order by usuario_id, publicacao_id, (tipo = 'quero_ir') desc
on conflict do nothing;

-- Totais por publicação (somente publicadas). Sem identificar ninguém.
create or replace function public.contagem_reacoes_eda(p_ids uuid[])
returns table (publicacao_id uuid, reacao text, total integer)
language sql stable security definer set search_path = public as $$
  select r.publicacao_id, r.reacao, count(*)::int
  from public.reacoes_publicacoes r
  join public.publicacoes p on p.id = r.publicacao_id and p.status = 'publicado'
  where r.publicacao_id = any (p_ids[1:200])
  group by 1, 2;
$$;
revoke all on function public.contagem_reacoes_eda(uuid[]) from public;
grant execute on function public.contagem_reacoes_eda(uuid[]) to anon, authenticated;

-- Ranking dos últimos dias (destaques "mais procurados"), só publicações publicadas.
create or replace function public.ranking_reacoes_eda(p_dias integer default 7)
returns table (publicacao_id uuid, titulo text, slug text, passeio_id uuid, empresa_id uuid, autor text, quero_ir integer, total integer)
language sql stable security definer set search_path = public as $$
  select p.id, p.titulo, p.slug, p.passeio_id, pp.empresa_id, pp.nome_publico,
    count(*) filter (where r.reacao = 'quero_ir')::int, count(*)::int
  from public.reacoes_publicacoes r
  join public.publicacoes p on p.id = r.publicacao_id and p.status = 'publicado'
  left join public.perfis_publicos pp on pp.id = p.autor_perfil_id
  where r.created_at >= now() - make_interval(days => least(greatest(coalesce(p_dias, 7), 1), 90))
  group by 1, 2, 3, 4, 5, 6
  order by 7 desc, 8 desc
  limit 20;
$$;
revoke all on function public.ranking_reacoes_eda(integer) from public, anon, authenticated;
grant execute on function public.ranking_reacoes_eda(integer) to service_role;

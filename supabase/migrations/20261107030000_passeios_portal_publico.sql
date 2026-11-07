-- EDA_PASSEIOS_PORTAL_V1: passeios da operadora expostos no portal público.

alter table public.passeios
  add column if not exists publicado_portal boolean not null default false,
  add column if not exists fotos text[] not null default '{}'::text[];

alter table public.passeios
  drop constraint if exists passeios_fotos_limite_check;
alter table public.passeios
  add constraint passeios_fotos_limite_check check (cardinality(fotos) <= 8);

create index if not exists passeios_portal_idx
  on public.passeios (empresa_id)
  where publicado_portal;

-- Fotos do passeio: enviadas pela equipe (admin/operador) para
-- rede-publica/<empresa_id>/passeios/<arquivo>.
drop policy if exists passeios_fotos_insert_eda on storage.objects;
create policy passeios_fotos_insert_eda on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'rede-publica'
    and (storage.foldername(name))[2] = 'passeios'
    and lower(storage.extension(name)) = any (array['jpg','jpeg','png','webp'])
    and exists (
      select 1 from public.perfis p
      where p.id = (select auth.uid())
        and p.role = any (array['admin_empresa','operador_empresa'])
        and p.empresa_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists passeios_fotos_delete_eda on storage.objects;
create policy passeios_fotos_delete_eda on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'rede-publica'
    and (storage.foldername(name))[2] = 'passeios'
    and exists (
      select 1 from public.perfis p
      where p.id = (select auth.uid())
        and p.role = any (array['admin_empresa','operador_empresa'])
        and p.empresa_id::text = (storage.foldername(name))[1]
    )
  );

-- Leitura pública: só passeios marcados para o portal, ativos/em breve,
-- de operadoras com perfil público publicado. Expõe apenas colunas seguras.
create or replace function public.passeios_publicos_eda(p_slug text default null)
returns table (
  id uuid,
  nome text,
  categoria text,
  cidade text,
  duracao text,
  preco numeric,
  vagas integer,
  descricao text,
  fotos text[],
  destaque boolean,
  situacao text,
  criado_em timestamptz,
  operadora_slug text,
  operadora_nome text,
  operadora_logo text,
  operadora_whatsapp text,
  operadora_verificada boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ps.id, ps.nome, ps.categoria, ps.cidade, ps.duracao,
    coalesce(nullif(ps.preco, 0), ps.valor),
    ps.vagas, ps.descricao,
    case when cardinality(ps.fotos) > 0 then ps.fotos
         when ps.foto_url is not null then array[ps.foto_url]
         else '{}'::text[] end,
    coalesce(ps.destaque, false), ps.situacao, ps.created_at,
    pp.slug, pp.nome_publico, pp.logo_url, pp.whatsapp, pp.verificado
  from public.passeios ps
  join public.perfis_publicos pp
    on pp.empresa_id = ps.empresa_id
   and pp.origem_tipo = 'empresa'
   and pp.categoria = 'operadora'
   and pp.publicado
  where ps.publicado_portal
    and ps.situacao in ('Ativo', 'Em Breve')
    and (p_slug is null or pp.slug = p_slug)
  order by coalesce(ps.destaque, false) desc, ps.created_at desc
  limit 200;
$$;

revoke all on function public.passeios_publicos_eda(text) from public;
grant execute on function public.passeios_publicos_eda(text) to anon, authenticated;

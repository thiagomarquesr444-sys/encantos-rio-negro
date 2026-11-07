-- EDA_PUBLICACAO_OFERTA_V1
-- Publicação do tipo "oferta" pode apontar para um passeio publicado da própria
-- operadora: no feed, o visitante vê preço, próximas datas e vagas reais.

alter table public.publicacoes
  add column if not exists passeio_id uuid references public.passeios(id) on delete set null;

create or replace function public.eda_validar_passeio_publicacao()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_empresa_perfil uuid; v_ok boolean;
begin
  if new.passeio_id is null then return new; end if;
  select empresa_id into v_empresa_perfil from public.perfis_publicos where id = new.autor_perfil_id;
  select exists (select 1 from public.passeios p where p.id = new.passeio_id
    and p.empresa_id = v_empresa_perfil and p.publicado_portal) into v_ok;
  if not coalesce(v_ok, false) then
    raise exception 'EDA_PASSEIO_PUBLICACAO_INVALIDO: escolha um passeio publicado da sua operadora.';
  end if;
  return new;
end; $$;
revoke all on function public.eda_validar_passeio_publicacao() from public, anon, authenticated;
drop trigger if exists trg_eda_validar_passeio_publicacao on public.publicacoes;
create trigger trg_eda_validar_passeio_publicacao before insert or update of passeio_id, autor_perfil_id on public.publicacoes
  for each row execute function public.eda_validar_passeio_publicacao();

create or replace view public.rede_publicacoes_consulta_ern with (security_invoker = true) as
 SELECT id, autor_perfil_id, territorio_id, categoria_id, slug, tipo, titulo, resumo, conteudo, idioma_original,
    destino_slug, localidade_texto, data_evento_inicio, data_evento_fim, destaque, permitir_interacoes, publicado_em,
    (EXISTS ( SELECT 1 FROM publicacao_midias m
          WHERE m.publicacao_id = p.id AND m.tipo = 'video'::text AND m.consentimento_confirmado = true)) AS tem_video,
    passeio_id
   FROM publicacoes p
  WHERE status = 'publicado'::text AND publicado_em IS NOT NULL AND publicado_em <= now() AND (EXISTS ( SELECT 1
           FROM perfis_publicos perfil
          WHERE perfil.id = p.autor_perfil_id AND perfil.publicado = true));

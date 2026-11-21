-- EDA_POSTAR_REDE_V1 — publicação rápida na Rede (operadora, Comando EDA e Guia/Prático)
-- 1) Guia/Prático publica na Rede em nome próprio (perfil público "profissional/guia").
-- 2) Novo tipo "disponibilidade": agenda livre do guia, sem conflito com escalas.
-- 3) Publicar aceita só vídeo (antes exigia sempre uma foto); fotos seguem com descrição.
-- 4) Limite anti-spam: 12 publicações por dia por perfil.

alter table public.publicacoes drop constraint if exists publicacoes_tipo_check;
alter table public.publicacoes add constraint publicacoes_tipo_check
  check (tipo = any (array['conteudo','oferta','roteiro','evento','aviso','dica','disponibilidade']));

create index if not exists perfis_publicos_usuario_guia_idx
  on public.perfis_publicos (usuario_id) where origem_tipo = 'profissional';

-- Quem administra um perfil público: operadora (admin), editorial (Comando EDA) ou o próprio guia.
create or replace function public.ern_administra_perfil_publico(perfil_id uuid)
returns boolean language sql stable set search_path to '' as $$
  select
    exists (
      select 1 from public.perfis_publicos pp
      join public.perfis p on p.empresa_id = pp.empresa_id and p.empresa_id = pp.empresa_gestora_id
      where pp.id = perfil_id and pp.origem_tipo = 'empresa' and pp.categoria = 'operadora'
        and p.id = auth.uid() and p.role = 'admin_empresa'
    )
    or exists (
      select 1 from public.perfis_publicos pp
      where pp.id = perfil_id and pp.id = '6d2be2c2-31f7-4f5a-b62b-db262177bdd3'
        and pp.origem_tipo = 'editorial' and pp.categoria = 'ern_editorial'
        and public.tem_acesso_editorial_ern()
    )
    or exists (
      select 1 from public.perfis_publicos pp
      where pp.id = perfil_id and pp.origem_tipo = 'profissional' and pp.categoria = 'guia'
        and pp.usuario_id = auth.uid()
    );
$$;

-- Cria/sincroniza o perfil da Rede do guia a partir do perfil profissional.
create or replace function public.garantir_perfil_rede_guia_eda()
returns jsonb language plpgsql security definer set search_path to public as $$
declare
  v_uid uuid := auth.uid();
  v_pro record;
  v_id uuid;
  v_slug text;
begin
  if v_uid is null then raise exception 'Entre novamente.' using errcode = '42501'; end if;

  select nome, cidade, descricao, idiomas into v_pro
  from public.perfis_profissionais where usuario_id = v_uid and tipo = 'guia';
  if not found or btrim(coalesce(v_pro.nome, '')) = '' then
    raise exception 'EDA_GUIA_SEM_PERFIL: complete seu nome profissional em Meu perfil antes de postar.';
  end if;

  select id, slug into v_id, v_slug from public.perfis_publicos
  where usuario_id = v_uid and origem_tipo = 'profissional' and categoria = 'guia' limit 1;

  if v_id is null then
    v_slug := 'guia-' || substr(replace(v_uid::text, '-', ''), 1, 12);
    insert into public.perfis_publicos (origem_tipo, categoria, usuario_id, slug, nome_publico, cidade, uf, descricao_curta, publicado)
    values ('profissional', 'guia', v_uid, v_slug, left(btrim(v_pro.nome), 120),
            coalesce(nullif(btrim(v_pro.cidade), ''), 'Barcelos'), 'AM',
            nullif(left(btrim(coalesce(v_pro.descricao, '')), 280), ''), true)
    returning id into v_id;
  else
    update public.perfis_publicos
    set nome_publico = left(btrim(v_pro.nome), 120),
        cidade = coalesce(nullif(btrim(v_pro.cidade), ''), cidade),
        descricao_curta = coalesce(nullif(left(btrim(coalesce(v_pro.descricao, '')), 280), ''), descricao_curta),
        publicado = true,
        updated_at = now()
    where id = v_id;
  end if;

  return jsonb_build_object('id', v_id, 'slug', v_slug, 'nome', left(btrim(v_pro.nome), 120));
end; $$;
revoke all on function public.garantir_perfil_rede_guia_eda() from public, anon;
grant execute on function public.garantir_perfil_rede_guia_eda() to authenticated;

-- Regras do tipo disponibilidade + limite diário.
create or replace function public.eda_validar_postagem_rede()
returns trigger language plpgsql security definer set search_path to public as $$
declare
  v_perfil record;
  v_hoje date := (now() at time zone 'America/Manaus')::date;
begin
  select categoria, origem_tipo, usuario_id into v_perfil from public.perfis_publicos where id = new.autor_perfil_id;

  if tg_op = 'INSERT' and auth.role() = 'authenticated' then
    if (select count(*) from public.publicacoes
        where autor_perfil_id = new.autor_perfil_id and created_at > now() - interval '24 hours') >= 12 then
      raise exception 'EDA_LIMITE_DIARIO: limite de 12 publicações por dia atingido. Tente amanhã.';
    end if;
  end if;

  if v_perfil.categoria = 'guia' and new.tipo not in ('conteudo', 'dica', 'aviso', 'disponibilidade') then
    raise exception 'EDA_TIPO_GUIA: o guia publica conteúdo, dica, aviso ou disponibilidade.';
  end if;

  if new.tipo = 'disponibilidade' then
    if v_perfil.categoria is distinct from 'guia' then
      raise exception 'EDA_DISPONIBILIDADE: só o Guia/Prático publica disponibilidade.';
    end if;
    if new.data_evento_inicio is null or new.data_evento_fim is null then
      raise exception 'EDA_DISPONIBILIDADE: informe as datas livres.';
    end if;
    if new.status = 'publicado' then
      if (new.data_evento_fim at time zone 'America/Manaus')::date < v_hoje then
        raise exception 'EDA_DISPONIBILIDADE: as datas livres já passaram.';
      end if;
      if new.data_evento_fim > new.data_evento_inicio + interval '60 days' then
        raise exception 'EDA_DISPONIBILIDADE: publique no máximo 60 dias por vez.';
      end if;
      -- Não pode anunciar livre um dia em que já está escalado (em qualquer operadora).
      if exists (
        select 1 from public.eda_reservas_periodo r
        join public.guias g on g.id = r.guia_id and g.usuario_id = v_perfil.usuario_id
        where coalesce(r.status, '') not in ('cancelada', 'cancelado')
          and r.inicio <= (new.data_evento_fim at time zone 'America/Manaus')::date
          and r.fim >= (new.data_evento_inicio at time zone 'America/Manaus')::date
      ) then
        raise exception 'EDA_DISPONIBILIDADE_CONFLITO: você já está escalado em parte dessas datas. Ajuste o período.';
      end if;
    end if;
  end if;

  return new;
end; $$;

drop trigger if exists trg_eda_validar_postagem_rede on public.publicacoes;
create trigger trg_eda_validar_postagem_rede
  before insert or update on public.publicacoes
  for each row execute function public.eda_validar_postagem_rede();

-- Publicar: aceita foto OU vídeo autorizado; fotos exigem descrição.
create or replace function public.alterar_status_publicacao_ern(publicacao_id uuid, acao text, versao_esperada timestamp with time zone)
returns uuid language plpgsql set search_path to '' as $$
declare
  registro public.publicacoes%rowtype;
  perfil_ativo boolean;
  novo_status text;
begin
  if auth.uid() is null or auth.role() is distinct from 'authenticated' then
    raise exception 'Entre novamente para administrar publicacoes.' using errcode = '42501';
  end if;
  if acao is null or acao not in ('publicar', 'arquivar', 'rascunho') then
    raise exception 'Acao invalida.';
  end if;

  select p.* into registro from public.publicacoes p
  where p.id = publicacao_id and public.ern_administra_perfil_publico(p.autor_perfil_id)
  for update;
  if not found then
    raise exception 'Publicacao nao encontrada ou acesso nao permitido.' using errcode = '42501';
  end if;
  if registro.status not in ('rascunho', 'publicado', 'arquivado') then
    raise exception 'Esta publicacao esta sob controle de moderacao.' using errcode = '42501';
  end if;
  if versao_esperada is null or registro.updated_at is distinct from versao_esperada then
    raise exception 'A publicacao mudou. Atualize a listagem antes de continuar.';
  end if;

  if acao = 'publicar' then
    if registro.status <> 'rascunho' then raise exception 'Abra um rascunho para publicar.'; end if;

    select pp.publicado into perfil_ativo from public.perfis_publicos pp where pp.id = registro.autor_perfil_id;
    if perfil_ativo is distinct from true then
      raise exception 'Publique primeiro o seu perfil publico.';
    end if;
    if btrim(coalesce(registro.resumo, '')) = '' and btrim(coalesce(registro.conteudo, '')) = '' then
      raise exception 'Escreva uma legenda antes de publicar.';
    end if;
    if not exists (
      select 1 from public.publicacao_midias m
      where m.publicacao_id = registro.id and m.consentimento_confirmado = true
        and (m.tipo = 'video' or btrim(coalesce(m.alt_text, '')) <> '')
    ) then
      raise exception 'Adicione pelo menos uma foto ou um video.';
    end if;
    if exists (
      select 1 from public.publicacao_midias m
      where m.publicacao_id = registro.id
        and (m.consentimento_confirmado = false or (m.tipo = 'imagem' and btrim(coalesce(m.alt_text, '')) = ''))
    ) then
      raise exception 'Revise a autorizacao e a descricao das fotos.';
    end if;
    novo_status := 'publicado';
  elsif acao = 'arquivar' then
    if registro.status = 'arquivado' then raise exception 'Esta publicacao ja esta arquivada.'; end if;
    novo_status := 'arquivado';
  else
    if registro.status = 'rascunho' then raise exception 'Esta publicacao ja e um rascunho.'; end if;
    novo_status := 'rascunho';
  end if;

  update public.publicacoes set status = novo_status where id = registro.id;
  return registro.id;
end; $$;
revoke all on function public.eda_validar_postagem_rede() from public, anon, authenticated;

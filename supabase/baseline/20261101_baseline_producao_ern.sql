-- =====================================================================
-- ENCANTOS RIO NEGRO (ERN) - BASELINE DO BANCO DE PRODUÇÃO
-- Fotografia da estrutura em 01/11/2026 (America/Manaus)
-- Projeto Supabase: encantos-rio-negro (sa-east-1), PostgreSQL 17
--
-- ATENÇÃO: NÃO EXECUTAR NO BANCO DE PRODUÇÃO.
-- Produção já contém tudo o que está aqui. Este arquivo serve para:
--   1. registrar no Git o estado real do banco (auditoria/histórico);
--   2. reconstruir a estrutura em um projeto NOVO e VAZIO, se necessário.
--
-- Conteúdo: somente estrutura. Nenhum dado de cliente, reserva ou
-- financeiro. Nenhuma senha ou chave (varredura feita antes de gravar).
--
-- Fidelidade: cada seção foi conferida por checksum MD5 contra o banco
-- no momento da extração (ver supabase/baseline/README.md).
-- Não inclui: dados, configurações do Auth, schemas internos auth/storage,
-- privilégios padrão (default ACL) do Supabase, segredos do Vault.
-- =====================================================================

set check_function_bodies = false;
set client_min_messages = warning;

begin;

-- ---------------------------------------------------------------------
-- 01. Extensões [4]
-- ---------------------------------------------------------------------
create extension if not exists pg_stat_statements with schema extensions;

create extension if not exists pgcrypto with schema extensions;

create extension if not exists supabase_vault with schema vault;

create extension if not exists "uuid-ossp" with schema extensions;


-- ---------------------------------------------------------------------
-- 02. Tabelas (colunas, padrões, identidade, colunas geradas) [46]
-- ---------------------------------------------------------------------
create table public.acessos_profissionais (
  usuario_id uuid default auth.uid() not null,
  tipo text not null,
  criado_em timestamp with time zone default now() not null
);

create table public.administradores_editoriais_ern (
  usuario_id uuid not null,
  ativo boolean default true not null,
  criado_em timestamp with time zone default now() not null
);

create table public.assinaturas_empresas (
  id uuid default gen_random_uuid() not null,
  empresa_id uuid not null,
  plano_id uuid not null,
  status text default 'ativo'::text not null,
  inicio_em timestamp with time zone default now() not null,
  fim_em timestamp with time zone,
  trial_ate timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  ciclo_cobranca text,
  renovacao_automatica boolean default false not null,
  provedor_pagamento text,
  provedor_cliente_id text,
  provedor_assinatura_id text,
  plano_pendente_id uuid,
  ciclo_pendente text,
  checkout_iniciado_em timestamp with time zone,
  provedor_assinatura_anterior_id text,
  provedor_assinatura_pendente_id text,
  cancelamento_solicitado_em timestamp with time zone,
  cancelamento_efetivo_em timestamp with time zone,
  plano_pos_cancelamento_id uuid
);

create table public.categorias_publicacoes (
  id uuid default gen_random_uuid() not null,
  slug text not null,
  nome text not null,
  familia text not null,
  descricao text,
  icone text,
  ativo boolean default true not null,
  ordem integer default 0 not null,
  created_at timestamp with time zone default now() not null
);

create table public.clientes (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now(),
  empresa_id uuid,
  nome text not null,
  documento text,
  telefone text,
  email text,
  cidade text,
  nacionalidade text,
  observacoes text,
  situacao text default 'ativo'::text
);

create table public.cliques_publicos (
  id bigint not null generated always as identity,
  perfil_id uuid,
  publicacao_id uuid,
  usuario_id uuid,
  sessao_id text,
  tipo text not null,
  created_at timestamp with time zone default now() not null
);

create table public.cobrancas_assinaturas (
  id uuid default gen_random_uuid() not null,
  empresa_id uuid not null,
  assinatura_id uuid,
  plano_id uuid not null,
  ciclo_cobranca text not null,
  provedor text not null,
  provedor_cobranca_id text not null,
  provedor_assinatura_id text,
  status text not null,
  valor numeric(12,2) not null,
  moeda text default 'BRL'::text not null,
  vencimento date,
  pago_em timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.configuracoes (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  nome_sistema text default 'Encantos Rio Negro'::text,
  tema text default 'grafite'::text,
  moeda text default 'BRL'::text,
  fuso_horario text default 'America/Manaus'::text,
  permitir_reservas_mesmo_dia boolean default true,
  antecedencia_minima_horas integer default 2,
  porcentagem_sinal numeric(5,2) default 50.00,
  enviar_email_confirmacao boolean default true,
  enviar_whatsapp_confirmacao boolean default false,
  chave_api_pix text,
  outras_configuracoes jsonb default '{}'::jsonb,
  empresa_id uuid not null
);

create table public.demanda_itens (
  id uuid default gen_random_uuid() not null,
  demanda_id uuid not null,
  descricao text not null,
  categoria text not null,
  quantidade numeric(12,3) not null,
  unidade text not null,
  preco_unitario_estimado numeric(12,2),
  total_estimado numeric generated always as (round((quantidade * preco_unitario_estimado), 2)) stored,
  situacao text default 'pendente'::text not null,
  observacoes text,
  ordem integer default 0 not null,
  created_at timestamp with time zone default now() not null
);

create table public.demandas (
  id uuid default gen_random_uuid() not null,
  empresa_id uuid not null,
  criado_por uuid default auth.uid(),
  created_at timestamp with time zone default now() not null,
  titulo text not null,
  descricao text,
  categoria text not null,
  localidade text not null,
  data_inicio date,
  data_fim date,
  quantidade numeric(12,2) default 1 not null,
  unidade text default 'unidade'::text not null,
  status text default 'rascunho'::text not null,
  metodo_estimativa text default 'manual'::text not null,
  publico_alvo text,
  pessoas_estimadas integer,
  dias_estimados integer,
  consumo_pessoa_dia numeric(12,2),
  tipo_combustivel text,
  horas_motor_dia numeric(10,2),
  consumo_litros_hora numeric(10,2),
  margem_percentual numeric(5,2) default 10 not null,
  itens_versao integer default 0 not null
);

create table public.embarcacoes (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now(),
  nome text not null,
  tipo text,
  capacidade integer default 0,
  marinheiro text,
  status text default 'ativo'::text,
  motor text,
  situacao text,
  proximareserva text,
  empresa_id uuid
);

create table public.empresa (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now(),
  nome text not null,
  cidade text default 'Barcelos/AM'::text,
  situacao text default 'ativo'::text,
  cnpj text,
  telefone text,
  email text,
  endereco text
);

create table public.empresa_capacidades (
  empresa_id uuid not null,
  capacidade text not null,
  created_at timestamp with time zone default now() not null
);

create table public.empresa_configuracao_fiscal (
  id uuid default gen_random_uuid() not null,
  empresa_id uuid not null,
  cnpj_prestador text,
  inscricao_municipal text,
  municipio_codigo_ibge text,
  regime_tributario text,
  codigo_servico text,
  provedor text,
  modo_emissao text default 'manual'::text not null,
  ambiente text default 'simulacao'::text not null,
  emissao_real_habilitada boolean default false not null,
  criado_em timestamp with time zone default now() not null,
  atualizado_em timestamp with time zone default now() not null
);

create table public.empresa_fiscal_ern (
  empresa_id uuid not null,
  razao_social text default ''::text not null,
  cnpj text default ''::text not null,
  inscricao_municipal text default ''::text not null,
  municipio text default ''::text not null,
  uf text default ''::text not null,
  codigo_municipio_ibge text default ''::text not null,
  cep text default ''::text not null,
  logradouro text default ''::text not null,
  numero text default ''::text not null,
  complemento text default ''::text not null,
  bairro text default ''::text not null,
  email_fiscal text default ''::text not null,
  telefone_fiscal text default ''::text not null,
  criado_em timestamp with time zone default now() not null,
  atualizado_em timestamp with time zone default now() not null
);

create table public.ern_feedback_limites_v1 (
  identificador text not null,
  janela timestamp with time zone not null,
  quantidade integer not null
);

create table public.ern_feedbacks_v1 (
  id uuid default gen_random_uuid() not null,
  criado_em timestamp with time zone default now() not null,
  usuario_id uuid,
  origem text not null,
  categoria text not null,
  caminho text not null,
  mensagem text not null,
  contato_email text,
  estado text default 'novo'::text not null
);

create table public.ern_operacoes_assinatura_v1 (
  id uuid default gen_random_uuid() not null,
  empresa_id uuid not null,
  assinatura_id uuid not null,
  solicitado_por uuid not null,
  tipo text default 'checkout'::text not null,
  estado text default 'reservado'::text not null,
  plano_id uuid not null,
  ciclo text,
  valor numeric,
  moeda text not null,
  provedor text default 'asaas'::text not null,
  provedor_cliente_id text,
  provedor_assinatura_id text,
  assinatura_anterior_id text,
  criado_em timestamp with time zone default now() not null,
  atualizado_em timestamp with time zone default now() not null,
  plano_destino_id uuid,
  cancelamento_efetivo_em timestamp with time zone
);

create table public.ern_revisoes_fiscais (
  id uuid default gen_random_uuid() not null,
  empresa_id uuid not null,
  reserva_id uuid not null,
  estado text default 'em_preparacao'::text not null,
  observacoes text default ''::text not null,
  created_by uuid not null,
  updated_by uuid not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.financeiro (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now(),
  descricao text not null,
  tipo text,
  valor numeric(10,2) default 0.00 not null,
  categoria text,
  data_vencimento date,
  status text default 'pendente'::text,
  reserva_id uuid,
  user_id uuid default auth.uid() not null,
  empresa_id uuid,
  data_liquidacao date
);

create table public.guias (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now(),
  nome text not null,
  cpf text,
  telefone text,
  idiomas text,
  cadastur text,
  status text default 'ativo'::text,
  usuario_id uuid default auth.uid(),
  empresa_id uuid not null
);

create table public.hospedagens (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now(),
  nome text not null,
  tipo text,
  endereco text,
  telefone text,
  valor_diaria numeric(10,2) default 0.00,
  status text default 'ativo'::text,
  empresa_id uuid
);

create table public.interacoes_publicacoes (
  usuario_id uuid not null,
  publicacao_id uuid not null,
  tipo text not null,
  created_at timestamp with time zone default now() not null
);

create table public.nfse_eventos (
  id uuid default gen_random_uuid() not null,
  empresa_id uuid not null,
  solicitacao_id uuid not null,
  ambiente text default 'simulacao'::text not null,
  tipo_evento text not null,
  identificador_evento text,
  dados_evento jsonb default '{}'::jsonb not null,
  criado_em timestamp with time zone default now() not null
);

create table public.nfse_solicitacoes (
  id uuid default gen_random_uuid() not null,
  empresa_id uuid not null,
  reserva_id uuid,
  cliente_id uuid,
  criado_por uuid,
  chave_idempotencia text not null,
  ambiente text default 'simulacao'::text not null,
  status text default 'rascunho'::text not null,
  valor_servico numeric(15,2),
  dados_prestador jsonb default '{}'::jsonb not null,
  dados_tomador jsonb default '{}'::jsonb not null,
  dados_servico jsonb default '{}'::jsonb not null,
  referencia_externa text,
  mensagem_validacao text,
  criado_em timestamp with time zone default now() not null,
  atualizado_em timestamp with time zone default now() not null
);

create table public.parceiros (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now(),
  nome text not null,
  comissao_porcentagem numeric(5,2) default 0.00,
  telefone text,
  email text,
  status text default 'ativo'::text,
  empresa_id uuid not null,
  tipo text,
  tipo_pessoa text,
  documento text,
  whatsapp text,
  cidade text,
  endereco text,
  observacoes text,
  updated_at timestamp with time zone default now() not null
);

create table public.passeios (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now(),
  empresa_id uuid,
  nome text not null,
  categoria text,
  valor numeric(10,2),
  situacao text default 'ativo'::text,
  descricao text default ''::text,
  cidade text,
  duracao text,
  foto_url text,
  destaque boolean default false,
  preco numeric(10,2) default 0,
  vagas integer default 0
);

create table public.perfis (
  id uuid not null,
  nome text,
  cpf text,
  role text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  empresa_id uuid
);

create table public.perfis_profissionais (
  usuario_id uuid default auth.uid() not null,
  tipo text not null,
  nome text not null,
  telefone text,
  cidade text,
  descricao text,
  idiomas text,
  cadastur text,
  categoria text,
  criado_em timestamp with time zone default now() not null,
  atualizado_em timestamp with time zone default now() not null
);

create table public.perfis_publicos (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  empresa_gestora_id uuid,
  origem_tipo text default 'manual'::text not null,
  empresa_id uuid,
  parceiro_id uuid,
  slug text not null,
  nome_publico text not null,
  categoria text not null,
  cidade text default 'Barcelos'::text not null,
  uf text default 'AM'::text not null,
  descricao_curta text,
  descricao_completa text,
  logo_url text,
  capa_url text,
  whatsapp text,
  instagram text,
  site text,
  idiomas text[] default ARRAY[]::text[] not null,
  especialidades text[] default ARRAY[]::text[] not null,
  publicado boolean default false not null,
  verificado boolean default false not null,
  destaque boolean default false not null,
  ordem_destaque integer default 0 not null,
  usuario_id uuid,
  territorio_id uuid
);

create table public.planos (
  id uuid default gen_random_uuid() not null,
  codigo text not null,
  nome text not null,
  descricao text,
  ativo boolean default true not null,
  preco_mensal numeric(10,2),
  limite_usuarios integer,
  limite_clientes integer,
  limite_reservas_mes integer,
  limite_passeios integer,
  recursos jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null
);

create table public.posts (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  titulo text not null,
  conteudo text,
  autor text,
  status text default 'publicado'::text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.precos_planos (
  id uuid default gen_random_uuid() not null,
  plano_id uuid not null,
  ciclo_cobranca text not null,
  valor numeric(10,2),
  moeda text default 'BRL'::text not null,
  ativo boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.publicacao_midias (
  id uuid default gen_random_uuid() not null,
  publicacao_id uuid not null,
  tipo text not null,
  url text not null,
  thumbnail_url text,
  alt_text text,
  credito text,
  consentimento_confirmado boolean default false not null,
  ordem integer default 0 not null,
  created_at timestamp with time zone default now() not null
);

create table public.publicacao_traducoes (
  publicacao_id uuid not null,
  idioma text not null,
  titulo text not null,
  resumo text,
  conteudo text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.publicacoes (
  id uuid default gen_random_uuid() not null,
  autor_perfil_id uuid not null,
  territorio_id uuid,
  categoria_id uuid,
  slug text not null,
  tipo text default 'conteudo'::text not null,
  titulo text not null,
  resumo text,
  conteudo text,
  idioma_original text default 'pt'::text not null,
  localidade_texto text,
  data_evento_inicio timestamp with time zone,
  data_evento_fim timestamp with time zone,
  destaque boolean default false not null,
  permitir_interacoes boolean default true not null,
  status text default 'rascunho'::text not null,
  publicado_em timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  destino_slug text
);

create table public.relatorios (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now(),
  titulo text not null,
  tipo text,
  filtros jsonb default '{}'::jsonb,
  gerado_por text,
  status text default 'Concluído'::text,
  data_geracao date default CURRENT_DATE,
  empresa_id uuid
);

create table public.reservas (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now(),
  cliente_id uuid,
  passeio_id uuid,
  embarcacao_id uuid,
  parceiro_id uuid,
  data_reserva date not null,
  horario time without time zone,
  quantidade_pessoas integer default 1,
  valor_total numeric(10,2) default 0.00,
  status text default 'confirmada'::text,
  cliente text,
  pacote text,
  data text,
  agencia text,
  guia text,
  valor numeric default 0,
  observacoes text,
  empresa_id uuid,
  data_fim_prevista date,
  horario_fim_previsto time without time zone
);

create table public.reservas_historico_ciclo (
  id uuid default gen_random_uuid() not null,
  empresa_id uuid not null,
  reserva_id uuid not null,
  evento text not null,
  ocorrido_em timestamp with time zone default now() not null,
  usuario_id uuid,
  antes jsonb,
  depois jsonb not null
);

create table public.seguidores_perfis (
  seguidor_usuario_id uuid not null,
  perfil_seguido_id uuid not null,
  created_at timestamp with time zone default now() not null
);

create table public.territorios (
  id uuid default gen_random_uuid() not null,
  pai_id uuid,
  slug text not null,
  nome text not null,
  tipo text not null,
  descricao text,
  ativo boolean default true not null,
  ordem integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.transacoes (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  descricao text not null,
  tipo text not null,
  categoria text,
  valor numeric(10,2) not null,
  status text default 'pago'::text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.visualizacoes_perfis (
  id bigint not null generated always as identity,
  perfil_id uuid not null,
  usuario_id uuid,
  sessao_id text,
  origem text,
  created_at timestamp with time zone default now() not null
);

create table public.visualizacoes_publicacoes (
  id bigint not null generated always as identity,
  publicacao_id uuid not null,
  usuario_id uuid,
  sessao_id text,
  origem text,
  created_at timestamp with time zone default now() not null
);

create table public.vouchers (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now(),
  codigo text not null,
  reserva_id uuid,
  status text default 'valido'::text,
  data_emissao timestamp with time zone default now(),
  cliente_id uuid,
  passeio_id uuid,
  valor numeric,
  validade date,
  empresa_id uuid,
  cliente_nome text,
  passeio_nome text,
  quantidade_pessoas integer,
  data_passeio date,
  horario_passeio time without time zone
);

create table public.webhook_eventos (
  id uuid default gen_random_uuid() not null,
  provedor text not null,
  evento_id text not null,
  tipo_evento text not null,
  status text default 'processando'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  tentativa_id uuid,
  pagamento_id text,
  ultimo_erro_codigo text
);


-- ---------------------------------------------------------------------
-- 03. Funções (check_function_bodies desligado: ordem independe de dependências) [50]
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.alterar_status_publicacao_ern(publicacao_id uuid, acao text, versao_esperada timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  registro public.publicacoes%ROWTYPE;
  perfil_ativo boolean;
  novo_status text;
BEGIN
  IF auth.uid() IS NULL
    OR auth.role() IS DISTINCT FROM 'authenticated'
  THEN
    RAISE EXCEPTION 'Entre novamente para administrar publicacoes.'
      USING ERRCODE = '42501';
  END IF;

  IF acao IS NULL
    OR acao NOT IN ('publicar', 'arquivar', 'rascunho')
  THEN
    RAISE EXCEPTION 'Acao invalida.';
  END IF;

  SELECT p.*
  INTO registro
  FROM public.publicacoes p
  WHERE p.id = publicacao_id
    AND public.ern_administra_perfil_publico(p.autor_perfil_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Publicacao nao encontrada ou acesso nao permitido.'
      USING ERRCODE = '42501';
  END IF;

  IF registro.status NOT IN ('rascunho', 'publicado', 'arquivado') THEN
    RAISE EXCEPTION 'Esta publicacao esta sob controle de moderacao.'
      USING ERRCODE = '42501';
  END IF;

  IF versao_esperada IS NULL
    OR registro.updated_at IS DISTINCT FROM versao_esperada
  THEN
    RAISE EXCEPTION
      'A publicacao mudou. Atualize a listagem antes de continuar.';
  END IF;

  IF acao = 'publicar' THEN
    IF registro.status <> 'rascunho' THEN
      RAISE EXCEPTION 'Abra um rascunho para publicar.';
    END IF;

    SELECT pp.publicado
    INTO perfil_ativo
    FROM public.perfis_publicos pp
    WHERE pp.id = registro.autor_perfil_id;

    IF perfil_ativo IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Publique primeiro o perfil publico da operadora.';
    END IF;

    IF btrim(coalesce(registro.resumo, '')) = ''
      AND btrim(coalesce(registro.conteudo, '')) = ''
    THEN
      RAISE EXCEPTION 'Preencha o resumo ou o texto antes de publicar.';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.publicacao_midias m
      WHERE m.publicacao_id = registro.id
        AND m.tipo = 'imagem'
        AND m.consentimento_confirmado = true
        AND btrim(coalesce(m.alt_text, '')) <> ''
    ) THEN
      RAISE EXCEPTION
        'Adicione uma imagem autorizada e com descricao.';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.publicacao_midias m
      WHERE m.publicacao_id = registro.id
        AND (
          m.consentimento_confirmado = false
          OR btrim(coalesce(m.alt_text, '')) = ''
        )
    ) THEN
      RAISE EXCEPTION
        'Revise a autorizacao e a descricao de todas as midias.';
    END IF;

    novo_status := 'publicado';

  ELSIF acao = 'arquivar' THEN
    IF registro.status = 'arquivado' THEN
      RAISE EXCEPTION 'Esta publicacao ja esta arquivada.';
    END IF;

    novo_status := 'arquivado';

  ELSE
    IF registro.status = 'rascunho' THEN
      RAISE EXCEPTION 'Esta publicacao ja e um rascunho.';
    END IF;

    novo_status := 'rascunho';
  END IF;

  UPDATE public.publicacoes
  SET status = novo_status
  WHERE id = registro.id;

  RETURN registro.id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.atualizar_data_perfil_profissional()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.criar_assinatura_free_empresa()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plano_id uuid;
begin

  select id
  into v_plano_id
  from public.planos
  where codigo = 'free'
  limit 1;

  if v_plano_id is not null then

    insert into public.assinaturas_empresas (
      empresa_id,
      plano_id,
      status
    )
    values (
      new.id,
      v_plano_id,
      'ativo'
    )
    on conflict (empresa_id) do nothing;

  end if;

  return new;

end;
$function$
;

CREATE OR REPLACE FUNCTION public.definir_empresa_cliente()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_empresa_id uuid;
begin

  select empresa_id
  into v_empresa_id
  from public.perfis
  where id = auth.uid();

  if v_empresa_id is null then
    raise exception
      'Usuário autenticado não possui empresa vinculada.';
  end if;

  new.empresa_id := v_empresa_id;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.definir_empresa_embarcacao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_empresa_id uuid;
begin
  if auth.uid() is not null then
    select empresa_id
    into v_empresa_id
    from public.perfis
    where id = auth.uid();

    if v_empresa_id is null then
      raise exception 'Usuário autenticado não possui empresa vinculada.';
    end if;

    new.empresa_id := v_empresa_id;
  elsif new.empresa_id is null then
    raise exception 'Embarcação precisa possuir empresa vinculada.';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.definir_empresa_hospedagem()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_empresa_id uuid;
begin
  if auth.uid() is not null then
    select empresa_id
    into v_empresa_id
    from public.perfis
    where id = auth.uid();

    if v_empresa_id is null then
      raise exception 'Usuário autenticado não possui empresa vinculada.';
    end if;

    new.empresa_id := v_empresa_id;
  elsif new.empresa_id is null then
    raise exception 'Hospedagem precisa possuir empresa vinculada.';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.definir_empresa_passeio()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_empresa_id uuid;
begin

  select empresa_id
  into v_empresa_id
  from public.perfis
  where id = auth.uid();

  if v_empresa_id is null then
    raise exception
      'Usuário autenticado não possui empresa vinculada.';
  end if;

  new.empresa_id := v_empresa_id;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.definir_empresa_registro()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_empresa_id uuid;
begin
  select p.empresa_id
  into v_empresa_id
  from public.perfis p
  where p.id = auth.uid();

  if v_empresa_id is null then
    raise exception 'ERN_USUARIO_SEM_EMPRESA';
  end if;

  new.empresa_id := v_empresa_id;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.definir_empresa_reserva()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_empresa_id uuid;
begin
  if auth.uid() is not null then
    select empresa_id
    into v_empresa_id
    from public.perfis
    where id = auth.uid();

    if v_empresa_id is null then
      raise exception 'Usuário autenticado não possui empresa vinculada.';
    end if;

    new.empresa_id := v_empresa_id;
  elsif new.empresa_id is null then
    raise exception 'Reserva precisa possuir empresa vinculada.';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.empresa_tem_recurso(p_empresa_id uuid, p_recurso text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.perfis as pf

    join public.assinaturas_empresas as ae
      on ae.empresa_id = pf.empresa_id

    join public.planos as pl
      on pl.id = ae.plano_id

    where pf.id = (select auth.uid())
      and pf.empresa_id = p_empresa_id
      and pf.empresa_id is not null

      and pf.role in (
        'admin_empresa',
        'operador_empresa',
        'financeiro',
        'admin_plataforma'
      )

      and ae.status in ('ativo', 'trial')
      and p_recurso is not null

      and pl.recursos @> jsonb_build_object(
        p_recurso,
        true
      )
  );
$function$
;

CREATE OR REPLACE FUNCTION public.ern_administra_perfil_publico(perfil_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.perfis_publicos pp
      JOIN public.perfis p
        ON p.empresa_id = pp.empresa_id
       AND p.empresa_id = pp.empresa_gestora_id
      WHERE pp.id = perfil_id
        AND pp.origem_tipo = 'empresa'
        AND pp.categoria = 'operadora'
        AND p.id = auth.uid()
        AND p.role = 'admin_empresa'
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.perfis_publicos pp
      WHERE pp.id = perfil_id
        AND pp.id = '6d2be2c2-31f7-4f5a-b62b-db262177bdd3'
        AND pp.origem_tipo = 'editorial'
        AND pp.categoria = 'ern_editorial'
        AND public.tem_acesso_editorial_ern()
    );
$function$
;

CREATE OR REPLACE FUNCTION public.ern_concluir_evento_asaas_v1(p_evento_id text, p_tentativa_id uuid, p_concluir_checkout boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_evento public.webhook_eventos%rowtype;
  v_cobranca public.cobrancas_assinaturas%rowtype;
  v_assinatura public.assinaturas_empresas%rowtype;
  v_operacao public.ern_operacoes_assinatura_v1%rowtype;
  v_concluiu boolean := false;
begin
  select e.*
  into v_evento
  from public.webhook_eventos e
  where e.provedor = 'asaas'
    and e.evento_id = p_evento_id
  for update;

  if not found then
    raise exception 'ERN_EVENTO_NAO_ENCONTRADO';
  end if;

  if p_tentativa_id is null
     or v_evento.tentativa_id is distinct from p_tentativa_id then
    raise exception using
      errcode = '42501',
      message = 'ERN_TENTATIVA_NAO_AUTORIZADA';
  end if;

  if v_evento.status = 'processado' then
    return jsonb_build_object(
      'ok', true,
      'ja_processado', true
    );
  end if;

  if v_evento.status <> 'processando' then
    raise exception 'ERN_EVENTO_FORA_DE_PROCESSAMENTO';
  end if;

  if p_concluir_checkout then
    if v_evento.tipo_evento not in (
      'PAYMENT_CONFIRMED',
      'PAYMENT_RECEIVED'
    ) then
      raise exception 'ERN_EVENTO_NAO_CONFIRMA_PAGAMENTO';
    end if;

    select c.*
    into v_cobranca
    from public.cobrancas_assinaturas c
    where c.provedor = 'asaas'
      and c.provedor_cobranca_id = v_evento.pagamento_id
    for share;

    if not found then
      raise exception 'ERN_COBRANCA_NAO_ENCONTRADA';
    end if;

    if v_cobranca.status not in ('CONFIRMED', 'RECEIVED') then
      raise exception 'ERN_COBRANCA_NAO_CONFIRMADA';
    end if;

    select a.*
    into v_assinatura
    from public.assinaturas_empresas a
    where a.id = v_cobranca.assinatura_id
    for update;

    if not found then
      raise exception 'ERN_ASSINATURA_NAO_ENCONTRADA';
    end if;

    if v_assinatura.empresa_id is distinct from v_cobranca.empresa_id
       or v_assinatura.plano_id is distinct from v_cobranca.plano_id
       or v_assinatura.ciclo_cobranca is distinct from
          v_cobranca.ciclo_cobranca
       or v_assinatura.status <> 'ativo'
       or v_assinatura.provedor_pagamento is distinct from 'asaas'
       or v_cobranca.provedor_assinatura_id is null
       or v_assinatura.provedor_assinatura_id is distinct from
          v_cobranca.provedor_assinatura_id
       or v_assinatura.plano_pendente_id is not null
       or v_assinatura.provedor_assinatura_pendente_id is not null then
      raise exception 'ERN_ATIVACAO_AINDA_NAO_CONFIRMADA';
    end if;

    -- Contratações antigas podem não possuir operação registrada.
    -- Para as novas, a operação deve corresponder à assinatura paga.
    for v_operacao in
      select o.*
      from public.ern_operacoes_assinatura_v1 o
      where o.assinatura_id = v_assinatura.id
        and o.tipo = 'checkout'
        and o.provedor = 'asaas'
        and o.provedor_assinatura_id =
            v_cobranca.provedor_assinatura_id
      order by o.id
      for update
    loop
      if v_operacao.empresa_id is distinct from v_cobranca.empresa_id
         or v_operacao.plano_id is distinct from v_cobranca.plano_id
         or v_operacao.ciclo is distinct from v_cobranca.ciclo_cobranca
         or v_operacao.valor is distinct from v_cobranca.valor
         or v_operacao.moeda is distinct from v_cobranca.moeda then
        raise exception 'ERN_OPERACAO_PAGAMENTO_DIVERGENTE';
      end if;

      if v_operacao.estado not in (
        'em_envio',
        'aguardando_pagamento',
        'reconciliar',
        'concluido'
      ) then
        raise exception 'ERN_OPERACAO_EXIGE_CONFERENCIA';
      end if;

      update public.ern_operacoes_assinatura_v1
      set
        estado = 'concluido',
        atualizado_em = now()
      where id = v_operacao.id;

      v_concluiu := true;
    end loop;
  end if;

  update public.webhook_eventos
  set
    status = 'processado',
    ultimo_erro_codigo = null,
    updated_at = now()
  where id = v_evento.id
    and tentativa_id = p_tentativa_id;

  return jsonb_build_object(
    'ok', true,
    'checkout_concluido', v_concluiu
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ern_confirmar_cancelamento_v1(p_operacao_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_assinatura_id uuid;
  v_operacao public.ern_operacoes_assinatura_v1%rowtype;
  v_assinatura public.assinaturas_empresas%rowtype;
begin
  select o.assinatura_id
  into v_assinatura_id
  from public.ern_operacoes_assinatura_v1 o
  where o.id = p_operacao_id
    and o.tipo = 'cancelamento';

  if not found then
    raise exception 'ERN_OPERACAO_NAO_ENCONTRADA';
  end if;

  -- Mesma ordem de bloqueio usada pelas reservas:
  -- primeiro assinatura, depois operação.
  select a.*
  into v_assinatura
  from public.assinaturas_empresas a
  where a.id = v_assinatura_id
  for update;

  if not found then
    raise exception 'ERN_ASSINATURA_NAO_ENCONTRADA';
  end if;

  select o.*
  into strict v_operacao
  from public.ern_operacoes_assinatura_v1 o
  where o.id = p_operacao_id
    and o.tipo = 'cancelamento'
  for update;

  if v_operacao.estado = 'concluido' then
    return jsonb_build_object(
      'ok', true,
      'ja_concluido', true,
      'operacao_id', v_operacao.id
    );
  end if;

  if v_operacao.estado not in ('em_envio', 'reconciliar') then
    raise exception 'ERN_CANCELAMENTO_FORA_DE_CONFIRMACAO';
  end if;

  if v_operacao.cancelamento_efetivo_em is null
     or v_operacao.plano_destino_id is null
     or v_operacao.provedor_assinatura_id is null
     or v_operacao.provedor_cliente_id is null then
    raise exception 'ERN_CANCELAMENTO_SEM_DADOS_CONFIRMAVEIS';
  end if;

  if not exists (
    select 1
    from public.planos p
    where p.id = v_operacao.plano_destino_id
      and p.codigo = 'free'
      and p.ativo = true
  ) then
    raise exception 'ERN_PLANO_DESTINO_INVALIDO';
  end if;

  if v_assinatura.empresa_id is distinct from v_operacao.empresa_id
     or v_assinatura.provedor_cliente_id is distinct from
        v_operacao.provedor_cliente_id
     or v_assinatura.provedor_pagamento is distinct from 'asaas' then
    raise exception 'ERN_CANCELAMENTO_EMPRESA_DIVERGENTE';
  end if;

  if v_assinatura.plano_pendente_id is not null
     or v_assinatura.provedor_assinatura_pendente_id is not null then
    raise exception 'ERN_CANCELAMENTO_CONFLITA_COM_CHECKOUT';
  end if;

  -- O cron pode já ter concluído uma transição previamente agendada.
  if v_assinatura.plano_id = v_operacao.plano_destino_id
     and v_assinatura.provedor_assinatura_id is null
     and v_assinatura.provedor_assinatura_anterior_id =
         v_operacao.provedor_assinatura_id
     and v_operacao.cancelamento_efetivo_em <= now() then

    update public.ern_operacoes_assinatura_v1
    set estado = 'concluido', atualizado_em = now()
    where id = v_operacao.id;

    return jsonb_build_object(
      'ok', true,
      'transicao_ja_aplicada', true,
      'operacao_id', v_operacao.id
    );
  end if;

  if v_assinatura.plano_id is distinct from v_operacao.plano_id
     or v_assinatura.provedor_assinatura_id is distinct from
        v_operacao.provedor_assinatura_id then
    raise exception 'ERN_ASSINATURA_MUDOU_DURANTE_CANCELAMENTO';
  end if;

  if (
    v_assinatura.plano_pos_cancelamento_id is not null
    and v_assinatura.plano_pos_cancelamento_id <>
        v_operacao.plano_destino_id
  ) or (
    v_assinatura.plano_pos_cancelamento_id is not null
    and v_assinatura.cancelamento_efetivo_em is distinct from
        v_operacao.cancelamento_efetivo_em
  ) then
    raise exception 'ERN_AGENDAMENTO_CANCELAMENTO_DIVERGENTE';
  end if;

  update public.assinaturas_empresas
  set
    renovacao_automatica = false,
    cancelamento_solicitado_em = v_operacao.criado_em,
    cancelamento_efetivo_em = v_operacao.cancelamento_efetivo_em,
    plano_pos_cancelamento_id = v_operacao.plano_destino_id,
    fim_em = v_operacao.cancelamento_efetivo_em,
    updated_at = now()
  where id = v_assinatura.id;

  update public.ern_operacoes_assinatura_v1
  set
    estado = 'concluido',
    atualizado_em = now()
  where id = v_operacao.id;

  return jsonb_build_object(
    'ok', true,
    'operacao_id', v_operacao.id,
    'efetivo_em', v_operacao.cancelamento_efetivo_em
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ern_criar_demanda_com_itens(p_dados jsonb, p_itens jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
    v_usuario_id uuid := auth.uid();
    v_empresa_id uuid;
    v_demanda public.demandas%ROWTYPE;
BEGIN
    IF v_usuario_id IS NULL THEN
        RAISE EXCEPTION
            'Entre novamente para criar a demanda.';
    END IF;

    SELECT p.empresa_id
      INTO v_empresa_id
      FROM public.perfis AS p
     WHERE p.id = v_usuario_id
       AND p.role IN (
           'admin_empresa',
           'operador_empresa'
       );

    IF v_empresa_id IS NULL THEN
        RAISE EXCEPTION
            'Seu perfil não permite criar demandas nesta empresa.';
    END IF;

    IF p_dados IS NULL
       OR jsonb_typeof(p_dados) <> 'object' THEN
        RAISE EXCEPTION 'Os dados da demanda são inválidos.';
    END IF;

    IF p_itens IS NULL
       OR jsonb_typeof(p_itens) <> 'array' THEN
        RAISE EXCEPTION 'A lista de materiais é inválida.';
    END IF;

    IF jsonb_array_length(p_itens) > 200 THEN
        RAISE EXCEPTION
            'Cada demanda permite até 200 itens.';
    END IF;

    IF COALESCE(p_dados ->> 'status', '') NOT IN (
        'rascunho',
        'aberta'
    ) THEN
        RAISE EXCEPTION
            'Uma nova demanda deve começar como rascunho ou aberta.';
    END IF;

    INSERT INTO public.demandas (
        empresa_id,
        titulo,
        descricao,
        categoria,
        localidade,
        data_inicio,
        data_fim,
        quantidade,
        unidade,
        status,
        metodo_estimativa,
        publico_alvo,
        pessoas_estimadas,
        dias_estimados,
        consumo_pessoa_dia,
        tipo_combustivel,
        horas_motor_dia,
        consumo_litros_hora,
        margem_percentual
    )
    SELECT
        v_empresa_id,
        btrim(d.titulo),
        NULLIF(btrim(d.descricao), ''),
        d.categoria,
        btrim(d.localidade),
        d.data_inicio,
        d.data_fim,
        d.quantidade,
        btrim(d.unidade),
        d.status,
        d.metodo_estimativa,
        d.publico_alvo,
        d.pessoas_estimadas,
        d.dias_estimados,
        d.consumo_pessoa_dia,
        d.tipo_combustivel,
        d.horas_motor_dia,
        d.consumo_litros_hora,
        COALESCE(d.margem_percentual, 10)
    FROM jsonb_to_record(p_dados) AS d(
        titulo text,
        descricao text,
        categoria text,
        localidade text,
        data_inicio date,
        data_fim date,
        quantidade numeric,
        unidade text,
        status text,
        metodo_estimativa text,
        publico_alvo text,
        pessoas_estimadas integer,
        dias_estimados integer,
        consumo_pessoa_dia numeric,
        tipo_combustivel text,
        horas_motor_dia numeric,
        consumo_litros_hora numeric,
        margem_percentual numeric
    )
    RETURNING * INTO v_demanda;

    -- Reutiliza as validações e o salvamento da lista.
    -- Uma falha aqui também desfaz a criação acima.
    PERFORM public.ern_salvar_demanda_itens(
        v_demanda.id,
        0,
        p_itens
    );

    SELECT *
      INTO v_demanda
      FROM public.demandas
     WHERE id = v_demanda.id;

    RETURN to_jsonb(v_demanda);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ern_criar_minha_operadora(p_nome_empresa text, p_nome_responsavel text, p_cidade text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_usuario_id uuid := auth.uid();
  v_usuario auth.users%rowtype;
  v_perfil public.perfis%rowtype;
  v_tem_perfil boolean;
  v_empresa_id uuid;

  v_nome_empresa text := btrim(p_nome_empresa);
  v_nome_responsavel text := btrim(p_nome_responsavel);
  v_cidade text := btrim(p_cidade);

  v_plano_id uuid;
  v_limite_usuarios integer;
begin
  if v_usuario_id is null
     or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true'
  then
    raise exception 'Entre com sua conta para cadastrar a empresa.'
      using errcode = '42501';
  end if;

  -- Serializa cadastro, convites e mudanças de modalidade
  -- que utilizam o mesmo bloqueio de usuário.
  select u.*
    into v_usuario
    from auth.users as u
   where u.id = v_usuario_id
   for no key update;

  if not found then
    raise exception 'Não foi possível confirmar sua conta.'
      using errcode = '42501';
  end if;

  if v_usuario.email_confirmed_at is null
     or nullif(btrim(v_usuario.email), '') is null
  then
    raise exception 'Confirme seu e-mail antes de cadastrar a empresa.'
      using errcode = '42501';
  end if;

  select p.*
    into v_perfil
    from public.perfis as p
   where p.id = v_usuario_id
   for update;

  v_tem_perfil := found;

  -- Repetir a solicitação não cria outra empresa.
  if v_tem_perfil and v_perfil.empresa_id is not null then
    if v_perfil.role = 'admin_empresa' then
      return jsonb_build_object(
        'ok', true,
        'criada', false,
        'empresa_id', v_perfil.empresa_id,
        'destino', '/dashboard'
      );
    end if;

    raise exception
      'Sua conta já integra uma empresa. Utilize o acesso recebido.'
      using errcode = '42501';
  end if;

  -- Não promove perfis existentes com função atribuída.
  if v_tem_perfil and v_perfil.role is not null then
    raise exception
      'Esta conta já possui uma função. O vínculo precisa ser revisado.'
      using errcode = '42501';
  end if;

  if exists (
    select 1
      from public.acessos_profissionais as a
     where a.usuario_id = v_usuario_id
  ) then
    raise exception
      'Esta conta possui cadastro profissional independente.'
      using errcode = '42501';
  end if;

  -- Uma conta convidada sem vínculo confirmado não deve
  -- criar uma empresa durante uma falha de provisionamento.
  if v_usuario.invited_at is not null then
    raise exception
      'Esta conta recebeu um convite. Peça ao administrador para conferir seu vínculo.'
      using errcode = '42501';
  end if;

  if v_nome_empresa is null
     or char_length(v_nome_empresa) not between 3 and 120
     or v_nome_empresa ~ '[[:cntrl:]]'
  then
    raise exception 'Informe o nome da empresa com 3 a 120 caracteres.';
  end if;

  if v_nome_responsavel is null
     or char_length(v_nome_responsavel) not between 3 and 100
     or v_nome_responsavel ~ '[[:cntrl:]]'
  then
    raise exception 'Informe seu nome com 3 a 100 caracteres.';
  end if;

  if v_cidade is null
     or char_length(v_cidade) not between 2 and 100
     or v_cidade ~ '[[:cntrl:]]'
  then
    raise exception 'Informe a cidade e o estado da empresa.';
  end if;

  select pl.id, pl.limite_usuarios
    into v_plano_id, v_limite_usuarios
    from public.planos as pl
   where pl.codigo = 'free'
     and pl.ativo = true;

  if not found then
    raise exception
      'O plano inicial não está disponível. Tente novamente mais tarde.';
  end if;

  if v_limite_usuarios is not null and v_limite_usuarios < 1 then
    raise exception
      'O plano inicial precisa permitir o administrador da empresa.';
  end if;

  insert into public.empresa (
    nome,
    cidade,
    situacao,
    email
  )
  values (
    v_nome_empresa,
    v_cidade,
    'ativo',
    v_usuario.email
  )
  returning id into v_empresa_id;

  -- O gatilho existente deve criar a assinatura gratuita.
  -- Se isso falhar, toda a operação é desfeita.
  if not exists (
    select 1
      from public.assinaturas_empresas as ae
     where ae.empresa_id = v_empresa_id
       and ae.plano_id = v_plano_id
       and ae.status = 'ativo'
  ) then
    raise exception
      'Não foi possível preparar o plano inicial. Nenhuma empresa foi criada.';
  end if;

  if v_tem_perfil then
    update public.perfis
       set nome = v_nome_responsavel,
           role = 'admin_empresa',
           empresa_id = v_empresa_id
     where id = v_usuario_id;
  else
    insert into public.perfis (
      id,
      nome,
      role,
      empresa_id
    )
    values (
      v_usuario_id,
      v_nome_responsavel,
      'admin_empresa',
      v_empresa_id
    );
  end if;

  insert into public.configuracoes (empresa_id)
  values (v_empresa_id);

  return jsonb_build_object(
    'ok', true,
    'criada', true,
    'empresa_id', v_empresa_id,
    'destino', '/dashboard'
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ern_encerrar_reserva(p_reserva_id uuid, p_resultado text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
    v_reserva public.reservas%ROWTYPE;
    v_status text;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION
            'Entre novamente na plataforma para encerrar a reserva.'
            USING ERRCODE = '42501';
    END IF;

    IF p_resultado IS NULL
       OR p_resultado NOT IN ('Concluída', 'Não compareceu')
    THEN
        RAISE EXCEPTION
            'Selecione Concluída ou Não compareceu.'
            USING ERRCODE = '22023';
    END IF;

    SELECT *
    INTO v_reserva
    FROM public.reservas
    WHERE id = p_reserva_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Reserva não encontrada ou sem permissão de acesso.'
            USING ERRCODE = '42501';
    END IF;

    -- Uma repetição da mesma solicitação não duplica o evento.
    IF v_reserva.status = p_resultado THEN
        RETURN jsonb_build_object(
            'reserva_id', v_reserva.id,
            'status', v_reserva.status,
            'alterada', false
        );
    END IF;

    IF lower(btrim(coalesce(v_reserva.status, ''))) <> 'confirmada' THEN
        RAISE EXCEPTION
            'A reserva não está mais confirmada. Atualize a página.'
            USING ERRCODE = '23514';
    END IF;

    UPDATE public.reservas
    SET status = p_resultado
    WHERE id = v_reserva.id
      AND empresa_id = v_reserva.empresa_id
    RETURNING status INTO v_status;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Não foi possível encerrar a reserva com as permissões atuais.'
            USING ERRCODE = '42501';
    END IF;

    RETURN jsonb_build_object(
        'reserva_id', v_reserva.id,
        'status', v_status,
        'alterada', true
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ern_enviar_feedback_v1(p_identificador text, p_usuario_id uuid, p_origem text, p_categoria text, p_caminho text, p_mensagem text, p_contato_email text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_janela timestamptz;
  v_quantidade integer;
  v_id uuid;
begin
  if p_identificador is null
     or p_identificador !~ '^[0-9a-f]{64}$' then
    raise exception 'Identificador inválido.'
      using errcode = '22023';
  end if;

  if p_origem = 'operadora' then
    if p_usuario_id is null or not exists (
      select 1
      from public.perfis p
      where p.id = p_usuario_id
        and p.empresa_id is not null
    ) then
      raise exception 'Acesso da operadora não confirmado.'
        using errcode = '42501';
    end if;
  end if;

  v_janela := date_trunc('hour', now());

  insert into public.ern_feedback_limites_v1 as limites (
    identificador,
    janela,
    quantidade
  )
  values (
    p_identificador,
    v_janela,
    1
  )
  on conflict (identificador, janela)
  do update
    set quantidade = limites.quantidade + 1
    where limites.quantidade < 5
  returning quantidade into v_quantidade;

  if v_quantidade is null then
    return null;
  end if;

  insert into public.ern_feedbacks_v1 (
    usuario_id,
    origem,
    categoria,
    caminho,
    mensagem,
    contato_email
  )
  values (
    p_usuario_id,
    p_origem,
    p_categoria,
    p_caminho,
    btrim(p_mensagem),
    nullif(btrim(p_contato_email), '')
  )
  returning id into v_id;

  delete from public.ern_feedback_limites_v1
  where janela < now() - interval '48 hours';

  return v_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ern_falhar_evento_asaas_v1(p_evento_id text, p_tentativa_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  update public.webhook_eventos
  set
    status = 'falhou',
    ultimo_erro_codigo = 'ERN_PROCESSAMENTO_FALHOU',
    updated_at = now()
  where provedor = 'asaas'
    and evento_id = p_evento_id
    and tentativa_id = p_tentativa_id
    and status = 'processando';

  return found;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ern_fiscal_simular_reserva_v1(p_usuario_id uuid, p_reserva_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_empresa_id uuid;
  v_empresa public.empresa%ROWTYPE;
  v_reserva public.reservas%ROWTYPE;
  v_cliente public.clientes%ROWTYPE;
  v_existente public.nfse_solicitacoes%ROWTYPE;
  v_nova_id uuid;
  v_valor numeric(15,2);
  v_chave text;
  v_prestador jsonb;
  v_tomador jsonb;
  v_servico jsonb;
BEGIN
  IF p_usuario_id IS NULL OR p_reserva_id IS NULL THEN
    RAISE EXCEPTION 'Parametros fiscais invalidos.';
  END IF;

  -- 1. Identidade empresarial.
  -- O endpoint deve autenticar o token antes de
  -- fornecer p_usuario_id. A funcao revalida o perfil.

  SELECT p.empresa_id
    INTO v_empresa_id
  FROM public.perfis p
  WHERE p.id = p_usuario_id
    AND p.role = 'admin_empresa'
    AND p.empresa_id IS NOT NULL;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Operacao fiscal nao autorizada.';
  END IF;

  -- 2. Bloquear a empresa para obter snapshot estavel.

  SELECT e.*
    INTO v_empresa
  FROM public.empresa e
  WHERE e.id = v_empresa_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa nao encontrada.';
  END IF;

  -- 3. Bloquear a reserva durante a validacao.

  SELECT r.*
    INTO v_reserva
  FROM public.reservas r
  WHERE r.id = p_reserva_id
    AND r.empresa_id = v_empresa_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reserva nao encontrada para a empresa.';
  END IF;

  IF lower(coalesce(v_reserva.status, ''))
     LIKE '%cancelad%' THEN
    RAISE EXCEPTION 'Reserva cancelada.';
  END IF;

  IF v_reserva.cliente_id IS NULL THEN
    RAISE EXCEPTION
      'Reserva sem cliente formalmente vinculado.';
  END IF;

  IF v_reserva.valor_total IS NULL
     OR v_reserva.valor_total <= 0
     OR v_reserva.valor_total <> round(v_reserva.valor_total, 2)
  THEN
    RAISE EXCEPTION
      'Valor da reserva invalido para simulacao.';
  END IF;

  v_valor := v_reserva.valor_total;

  -- 4. Validar e bloquear o cliente da mesma empresa.

  SELECT c.*
    INTO v_cliente
  FROM public.clientes c
  WHERE c.id = v_reserva.cliente_id
    AND c.empresa_id = v_empresa_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Cliente nao pertence a empresa da reserva.';
  END IF;

  -- 5. Criar snapshots de dados operacionais.
  -- Estes documentos NAO possuem validade fiscal.

  v_prestador := jsonb_build_object(
    'nome', v_empresa.nome,
    'cnpj', v_empresa.cnpj
  );

  v_tomador := jsonb_build_object(
    'nome', v_cliente.nome
  );

  v_servico := jsonb_build_object(
    'descricao',
      coalesce(v_reserva.pacote, 'Servico da reserva'),
    'data_reserva', v_reserva.data_reserva
  );

  v_chave := 'simulacao:reserva:' || p_reserva_id::text;

  -- 6. Conferir solicitacao anterior.
  -- O lock na reserva serializa as tentativas
  -- desta funcao para a mesma reserva.

  SELECT n.*
    INTO v_existente
  FROM public.nfse_solicitacoes n
  WHERE n.empresa_id = v_empresa_id
    AND n.chave_idempotencia = v_chave
  FOR UPDATE;

  IF FOUND THEN
    IF v_existente.ambiente <> 'simulacao'
       OR v_existente.status <> 'simulada'
       OR v_existente.reserva_id IS DISTINCT FROM p_reserva_id
       OR v_existente.cliente_id IS DISTINCT FROM v_cliente.id
       OR v_existente.valor_servico IS DISTINCT FROM v_valor
       OR v_existente.dados_prestador IS DISTINCT FROM v_prestador
       OR v_existente.dados_tomador IS DISTINCT FROM v_tomador
       OR v_existente.dados_servico IS DISTINCT FROM v_servico
    THEN
      RAISE EXCEPTION
        'Simulacao desatualizada. Revisao necessaria.';
    END IF;

    RETURN jsonb_build_object(
      'ok', true,
      'simulacao', true,
      'valor_fiscal', false,
      'reutilizada', true,
      'id', v_existente.id,
      'status', v_existente.status,
      'ambiente', v_existente.ambiente
    );
  END IF;

  -- 7. Criar nova solicitacao exclusivamente simulada.

  INSERT INTO public.nfse_solicitacoes (
    empresa_id,
    reserva_id,
    cliente_id,
    criado_por,
    chave_idempotencia,
    ambiente,
    status,
    valor_servico,
    dados_prestador,
    dados_tomador,
    dados_servico
  )
  VALUES (
    v_empresa_id,
    p_reserva_id,
    v_cliente.id,
    p_usuario_id,
    v_chave,
    'simulacao',
    'simulada',
    v_valor,
    v_prestador,
    v_tomador,
    v_servico
  )
  RETURNING id INTO v_nova_id;

  -- 8. Registrar evento da simulacao
  -- na mesma transacao.

  INSERT INTO public.nfse_eventos (
    empresa_id,
    solicitacao_id,
    ambiente,
    tipo_evento,
    identificador_evento,
    dados_evento
  )
  VALUES (
    v_empresa_id,
    v_nova_id,
    'simulacao',
    'SIMULACAO_CRIADA',
    'simulada:' || p_reserva_id::text,
    jsonb_build_object(
      'simulacao', true,
      'valor_fiscal', false
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'simulacao', true,
    'valor_fiscal', false,
    'reutilizada', false,
    'id', v_nova_id,
    'status', 'simulada',
    'ambiente', 'simulacao'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ern_listar_meus_modulos()
 RETURNS TABLE(modulo text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select m.modulo
  from unnest(
    array[
      'painel',
      'mapa',
      'clientes',
      'reservas',
      'passeios',
      'vouchers',
      'hospedagens',
      'embarcacoes',
      'guias',
      'parceiros',
      'demandas',
      'financeiro',
      'relatorios',
      'publicacoes',
      'perfil_publico',
      'configuracoes',
      'equipe',
      'planos'
    ]::text[]
  ) as m(modulo)
  where public.ern_pode_acessar_modulo(m.modulo);
$function$
;

CREATE OR REPLACE FUNCTION public.ern_pode_acessar_modulo(p_modulo text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.perfis as p
    where p.id = (select auth.uid())
      and p.empresa_id is not null

      -- Módulos desconhecidos nunca são autorizados.
      and p_modulo = any (
        array[
          'painel',
          'mapa',
          'clientes',
          'reservas',
          'passeios',
          'vouchers',
          'hospedagens',
          'embarcacoes',
          'guias',
          'parceiros',
          'demandas',
          'financeiro',
          'relatorios',
          'publicacoes',
          'perfil_publico',
          'configuracoes',
          'equipe',
          'planos'
        ]::text[]
      )

      and (
        case
          when p.role in (
            'admin_empresa',
            'admin_plataforma'
          ) then true

          when p.role = 'operador_empresa' then
            p_modulo = any (
              array[
                'painel',
                'mapa',
                'clientes',
                'reservas',
                'passeios',
                'vouchers',
                'hospedagens',
                'embarcacoes',
                'guias',
                'parceiros',
                'demandas'
              ]::text[]
            )

          when p.role = 'financeiro' then
            p_modulo = any (
              array[
                'painel',
                'mapa',
                'financeiro',
                'relatorios'
              ]::text[]
            )

          when p.role in (
            'guia',
            'piloteiro'
          ) then
            p_modulo = any (
              array[
                'painel',
                'mapa'
              ]::text[]
            )

          else false
        end
      )
  );
$function$
;

CREATE OR REPLACE FUNCTION public.ern_preparar_voucher_reserva()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_empresa uuid;
  v_reserva public.reservas%rowtype;
  v_emitir boolean := false;
  v_status_reserva text;
  v_status_anterior text;
  v_status_novo text;
  v_reserva_operacional boolean;
BEGIN
  SELECT p.empresa_id
  INTO v_empresa
  FROM public.perfis p
  WHERE p.id = auth.uid();

  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'ERN_USUARIO_SEM_EMPRESA';
  END IF;

  IF new.empresa_id IS DISTINCT FROM v_empresa THEN
    RAISE EXCEPTION
      'O voucher precisa pertencer à empresa autenticada.';
  END IF;

  IF tg_op = 'INSERT' THEN
    v_emitir := new.reserva_id IS NOT NULL;
  ELSE
    IF old.empresa_id IS DISTINCT FROM new.empresa_id THEN
      RAISE EXCEPTION
        'Não é permitido transferir vouchers entre empresas.';
    END IF;

    IF old.reserva_id IS NOT NULL THEN
      IF new.reserva_id IS DISTINCT FROM old.reserva_id THEN
        RAISE EXCEPTION
          'O vínculo de um voucher emitido não pode ser removido ou trocado. Cancele o voucher e emita outro se necessário.';
      END IF;

      IF new.cliente_id IS DISTINCT FROM old.cliente_id
         OR new.passeio_id IS DISTINCT FROM old.passeio_id
         OR new.cliente_nome IS DISTINCT FROM old.cliente_nome
         OR new.passeio_nome IS DISTINCT FROM old.passeio_nome
         OR new.quantidade_pessoas IS DISTINCT FROM old.quantidade_pessoas
         OR new.data_passeio IS DISTINCT FROM old.data_passeio
         OR new.horario_passeio IS DISTINCT FROM old.horario_passeio
      THEN
        RAISE EXCEPTION
          'Os dados da emissão do voucher vinculado à reserva devem ser preservados. Cancele e emita outro para corrigir esses dados.';
      END IF;
    ELSE
      v_emitir := new.reserva_id IS NOT NULL;
    END IF;
  END IF;

  IF new.reserva_id IS NOT NULL THEN
    -- Bloqueia alteracoes concorrentes da reserva
    -- ate o encerramento da transacao.
    SELECT r.*
    INTO v_reserva
    FROM public.reservas r
    WHERE r.id = new.reserva_id
      AND r.empresa_id = v_empresa
    FOR SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'A reserva selecionada não está disponível para esta empresa.';
    END IF;

    v_status_reserva := translate(
      lower(btrim(coalesce(v_reserva.status, ''))),
      'áàâãéêíóôõúüç',
      'aaaaeeiooouuc'
    );

    v_reserva_operacional := v_status_reserva
      IN ('pendente', 'confirmada');

    IF v_emitir THEN
      IF NOT v_reserva_operacional THEN
        RAISE EXCEPTION
          'ERN_VOUCHER_RESERVA_NAO_OPERACIONAL: Somente reservas pendentes ou confirmadas permitem nova emissão.'
          USING ERRCODE = '23514';
      END IF;

      IF nullif(btrim(v_reserva.cliente), '') IS NULL
         OR nullif(btrim(v_reserva.pacote), '') IS NULL
         OR v_reserva.quantidade_pessoas IS NULL
         OR v_reserva.quantidade_pessoas < 1
      THEN
        RAISE EXCEPTION
          'Complete cliente, passeio e quantidade de pessoas na reserva antes de emitir o voucher.';
      END IF;

      IF new.cliente_id IS NOT NULL
         AND new.cliente_id IS DISTINCT FROM v_reserva.cliente_id
      THEN
        RAISE EXCEPTION
          'O cliente do voucher não corresponde ao vínculo da reserva.';
      END IF;

      IF new.passeio_id IS NOT NULL
         AND new.passeio_id IS DISTINCT FROM v_reserva.passeio_id
      THEN
        RAISE EXCEPTION
          'O passeio do voucher não corresponde ao vínculo da reserva.';
      END IF;

      new.cliente_id := v_reserva.cliente_id;
      new.passeio_id := v_reserva.passeio_id;
      new.cliente_nome := btrim(v_reserva.cliente);
      new.passeio_nome := btrim(v_reserva.pacote);
      new.quantidade_pessoas := v_reserva.quantidade_pessoas;
      new.data_passeio := v_reserva.data_reserva;
      new.horario_passeio := v_reserva.horario;

    ELSIF tg_op = 'UPDATE' THEN
      v_status_anterior := translate(
        lower(btrim(coalesce(old.status, ''))),
        'áàâãéêíóôõúüç',
        'aaaaeeiooouuc'
      );

      v_status_novo := translate(
        lower(btrim(coalesce(new.status, ''))),
        'áàâãéêíóôõúüç',
        'aaaaeeiooouuc'
      );

      -- Nao permite a reativacao em uma reserva
      -- cancelada, encerrada ou com estado desconhecido.
      -- Preserva a possibilidade de consultar e manter
      -- registros historicos sem reativa-los.
      IF v_status_novo IN ('ativo', 'valido')
         AND v_status_anterior NOT IN ('ativo', 'valido')
         AND NOT v_reserva_operacional
      THEN
        RAISE EXCEPTION
          'ERN_VOUCHER_REATIVACAO_BLOQUEADA: A reserva não está operacional.'
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  -- Valida novos vinculos cadastrais.
  -- Mantem os dados historicos ja emitidos.
  IF tg_op = 'INSERT' THEN
    v_emitir := true;
  ELSE
    v_emitir := v_emitir
      OR new.cliente_id IS DISTINCT FROM old.cliente_id
      OR new.passeio_id IS DISTINCT FROM old.passeio_id;
  END IF;

  IF v_emitir THEN
    IF new.cliente_id IS NOT NULL THEN
      PERFORM c.id
      FROM public.clientes c
      WHERE c.id = new.cliente_id
        AND c.empresa_id = v_empresa
      FOR SHARE;

      IF NOT FOUND THEN
        RAISE EXCEPTION
          'O cliente selecionado não está disponível para esta empresa.';
      END IF;
    END IF;

    IF new.passeio_id IS NOT NULL THEN
      PERFORM p.id
      FROM public.passeios p
      WHERE p.id = new.passeio_id
        AND p.empresa_id = v_empresa
      FOR SHARE;

      IF NOT FOUND THEN
        RAISE EXCEPTION
          'O passeio selecionado não está disponível para esta empresa.';
      END IF;
    END IF;
  END IF;

  RETURN new;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ern_proteger_historico_reserva()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.financeiro
    WHERE reserva_id = OLD.id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'Esta reserva possui lançamentos financeiros vinculados e não pode ser excluída. Utilize o cancelamento e revise os lançamentos separadamente.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.vouchers
    WHERE reserva_id = OLD.id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'Esta reserva possui vouchers vinculados e não pode ser excluída. Utilize o cancelamento para preservar o histórico.';
  END IF;

  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ern_recuperar_vinculo_checkout_v1(p_operacao_id uuid, p_assinatura_asaas_id text, p_cliente_asaas_id text, p_referencia_externa text, p_valor numeric, p_ciclo_asaas text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_assinatura_id uuid;
  v_operacao public.ern_operacoes_assinatura_v1%rowtype;
  v_assinatura public.assinaturas_empresas%rowtype;
  v_ciclo_esperado text;
begin
  if p_operacao_id is null
     or nullif(btrim(p_assinatura_asaas_id), '') is null
     or nullif(btrim(p_cliente_asaas_id), '') is null
     or p_referencia_externa is distinct from p_operacao_id::text then
    raise exception 'ERN_IDENTIFICACAO_CHECKOUT_INVALIDA';
  end if;

  select o.assinatura_id
  into v_assinatura_id
  from public.ern_operacoes_assinatura_v1 o
  where o.id = p_operacao_id
    and o.tipo = 'checkout'
    and o.provedor = 'asaas';

  if not found then
    raise exception 'ERN_OPERACAO_NAO_ENCONTRADA';
  end if;

  select a.*
  into v_assinatura
  from public.assinaturas_empresas a
  where a.id = v_assinatura_id
  for update;

  if not found then
    raise exception 'ERN_ASSINATURA_NAO_ENCONTRADA';
  end if;

  select o.*
  into strict v_operacao
  from public.ern_operacoes_assinatura_v1 o
  where o.id = p_operacao_id
    and o.tipo = 'checkout'
    and o.provedor = 'asaas'
  for update;

  v_ciclo_esperado := case v_operacao.ciclo
    when 'mensal' then 'MONTHLY'
    when 'trimestral' then 'QUARTERLY'
    when 'anual' then 'YEARLY'
    else null
  end;

  if v_operacao.empresa_id is distinct from v_assinatura.empresa_id
     or v_operacao.provedor_cliente_id is null
     or v_operacao.provedor_cliente_id is distinct from p_cliente_asaas_id
     or v_operacao.valor is distinct from p_valor
     or v_operacao.moeda is distinct from 'BRL'
     or v_ciclo_esperado is null
     or v_ciclo_esperado is distinct from p_ciclo_asaas then
    raise exception 'ERN_DADOS_PROVEDOR_DIVERGENTES';
  end if;

  if v_operacao.provedor_assinatura_id is not null
     and v_operacao.provedor_assinatura_id <> p_assinatura_asaas_id then
    raise exception 'ERN_ASSINATURA_PROVEDOR_DIVERGENTE';
  end if;

  if v_operacao.estado = 'concluido' then
    return jsonb_build_object(
      'ok', true,
      'ja_concluido', true
    );
  end if;

  if v_operacao.estado not in (
    'em_envio',
    'reconciliar',
    'aguardando_pagamento'
  ) then
    raise exception 'ERN_OPERACAO_FORA_DE_RECUPERACAO';
  end if;

  if v_assinatura.provedor_assinatura_id = p_assinatura_asaas_id then
    return jsonb_build_object(
      'ok', true,
      'ja_vinculada_como_ativa', true
    );
  end if;

  if v_assinatura.provedor_assinatura_id is distinct from
       v_operacao.assinatura_anterior_id
     or v_assinatura.provedor_cliente_id is distinct from
       p_cliente_asaas_id then
    raise exception 'ERN_ASSINATURA_ATUAL_MUDOU';
  end if;

  if v_assinatura.plano_pos_cancelamento_id is not null
     or (
       v_assinatura.cancelamento_solicitado_em is not null
       and (
         v_assinatura.cancelamento_efetivo_em is null
         or v_assinatura.cancelamento_efetivo_em > now()
       )
     ) then
    raise exception 'ERN_CANCELAMENTO_EM_ANDAMENTO';
  end if;

  if (
    v_assinatura.provedor_assinatura_pendente_id is not null
    and v_assinatura.provedor_assinatura_pendente_id <>
        p_assinatura_asaas_id
  ) or (
    v_assinatura.plano_pendente_id is not null
    and v_assinatura.plano_pendente_id <> v_operacao.plano_id
  ) or (
    v_assinatura.ciclo_pendente is not null
    and v_assinatura.ciclo_pendente <> v_operacao.ciclo
  ) then
    raise exception 'ERN_OUTRO_CHECKOUT_PENDENTE';
  end if;

  update public.assinaturas_empresas
  set
    provedor_pagamento = 'asaas',
    provedor_assinatura_anterior_id = v_operacao.assinatura_anterior_id,
    provedor_assinatura_pendente_id = p_assinatura_asaas_id,
    plano_pendente_id = v_operacao.plano_id,
    ciclo_pendente = v_operacao.ciclo,
    checkout_iniciado_em = coalesce(
      checkout_iniciado_em,
      v_operacao.criado_em
    ),
    updated_at = now()
  where id = v_assinatura.id;

  update public.ern_operacoes_assinatura_v1
  set
    provedor_assinatura_id = p_assinatura_asaas_id,
    estado = 'aguardando_pagamento',
    atualizado_em = now()
  where id = v_operacao.id;

  return jsonb_build_object(
    'ok', true,
    'vinculo_recuperado', true,
    'operacao_id', v_operacao.id
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ern_registrar_historico_ciclo_reserva()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_antes jsonb;
    v_depois jsonb;
BEGIN
    v_depois := jsonb_build_object(
        'status', NEW.status,
        'data_reserva', NEW.data_reserva,
        'horario', NEW.horario,
        'data_fim_prevista', NEW.data_fim_prevista,
        'horario_fim_previsto', NEW.horario_fim_previsto
    );

    IF TG_OP = 'UPDATE' THEN
        v_antes := jsonb_build_object(
            'status', OLD.status,
            'data_reserva', OLD.data_reserva,
            'horario', OLD.horario,
            'data_fim_prevista', OLD.data_fim_prevista,
            'horario_fim_previsto', OLD.horario_fim_previsto
        );

        -- Salvar outros campos não gera evento de ciclo.
        IF v_antes IS NOT DISTINCT FROM v_depois THEN
            RETURN NEW;
        END IF;
    END IF;

    INSERT INTO public.reservas_historico_ciclo (
        empresa_id,
        reserva_id,
        evento,
        usuario_id,
        antes,
        depois
    )
    VALUES (
        NEW.empresa_id,
        NEW.id,
        CASE
            WHEN TG_OP = 'INSERT' THEN 'criacao'
            ELSE 'alteracao'
        END,
        auth.uid(),
        v_antes,
        v_depois
    );

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ern_reservar_cancelamento_v1(p_usuario_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_empresa_id uuid;
  v_assinatura public.assinaturas_empresas%rowtype;
  v_operacao public.ern_operacoes_assinatura_v1%rowtype;
  v_free_id uuid;
begin
  select p.empresa_id
  into v_empresa_id
  from public.perfis p
  where p.id = p_usuario_id
    and p.role = 'admin_empresa'
    and p.empresa_id is not null
  for share;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'ERN_SEM_PERMISSAO'
    );
  end if;

  select a.*
  into v_assinatura
  from public.assinaturas_empresas a
  where a.empresa_id = v_empresa_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'ERN_ASSINATURA_NAO_ENCONTRADA'
    );
  end if;

  -- O checkout usa o mesmo bloqueio e o mesmo índice de operação aberta.
  if exists (
    select 1
    from public.ern_operacoes_assinatura_v1 o
    where o.empresa_id = v_empresa_id
      and o.estado in (
        'reservado',
        'em_envio',
        'aguardando_pagamento',
        'reconciliar'
      )
  ) then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'ERN_OPERACAO_EM_ANDAMENTO'
    );
  end if;

  if v_assinatura.plano_pendente_id is not null
     or v_assinatura.provedor_assinatura_pendente_id is not null
     or v_assinatura.ciclo_pendente is not null
     or v_assinatura.checkout_iniciado_em is not null then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'ERN_CHECKOUT_PENDENTE'
    );
  end if;

  
if v_assinatura.plano_pos_cancelamento_id is not null
     or (
       v_assinatura.cancelamento_solicitado_em is not null
       and (
         v_assinatura.cancelamento_efetivo_em is null
         or v_assinatura.cancelamento_efetivo_em > now()
       )
     )
     or (
       v_assinatura.cancelamento_solicitado_em is null
       and v_assinatura.cancelamento_efetivo_em is not null
     ) then

    return jsonb_build_object(
      'ok', false,
      'codigo', 'ERN_CANCELAMENTO_JA_REGISTRADO'
    );
  end if;

  select p.id
  into v_free_id
  from public.planos p
  where p.codigo = 'free'
    and p.ativo = true
  for share;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'ERN_FREE_NAO_CONFIGURADO'
    );
  end if;

  if v_assinatura.plano_id = v_free_id then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'ERN_JA_E_FREE'
    );
  end if;

  if v_assinatura.provedor_pagamento is distinct from 'asaas'
     or nullif(btrim(v_assinatura.provedor_assinatura_id), '') is null
     or nullif(btrim(v_assinatura.provedor_cliente_id), '') is null then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'ERN_ASSINATURA_ASAAS_INVALIDA'
    );
  end if;

  insert into public.ern_operacoes_assinatura_v1 (
    empresa_id,
    assinatura_id,
    solicitado_por,
    tipo,
    estado,
    plano_id,
    plano_destino_id,
    ciclo,
    valor,
    moeda,
    provedor_cliente_id,
    provedor_assinatura_id
  )
  values (
    v_empresa_id,
    v_assinatura.id,
    p_usuario_id,
    'cancelamento',
    'reservado',
    v_assinatura.plano_id,
    v_free_id,
    v_assinatura.ciclo_cobranca,
    null,
    'BRL',
    v_assinatura.provedor_cliente_id,
    v_assinatura.provedor_assinatura_id
  )
  returning * into v_operacao;

  return jsonb_build_object(
    'ok', true,
    'operacao_id', v_operacao.id,
    'empresa_id', v_empresa_id,
    'assinatura_id', v_assinatura.id,
    'plano_atual_id', v_assinatura.plano_id,
    'plano_destino_id', v_free_id,
    'provedor_cliente_id', v_assinatura.provedor_cliente_id,
    'provedor_assinatura_id', v_assinatura.provedor_assinatura_id
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ern_reservar_checkout_v1(p_usuario_id uuid, p_plano_codigo text, p_ciclo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_empresa_id uuid;
  v_assinatura public.assinaturas_empresas%rowtype;
  v_plano public.planos%rowtype;
  v_preco public.precos_planos%rowtype;
  v_operacao public.ern_operacoes_assinatura_v1%rowtype;
begin
  if p_usuario_id is null then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'ERN_NAO_AUTENTICADO'
    );
  end if;

  if p_plano_codigo is null
     or p_plano_codigo not in ('pro', 'premium')
     or p_ciclo is null
     or p_ciclo not in ('mensal', 'trimestral', 'anual') then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'ERN_CONTRATACAO_INVALIDA'
    );
  end if;

  -- O usuário será autenticado pela API antes desta chamada.
  -- Aqui sua função e empresa são conferidas novamente.
  select p.empresa_id
  into v_empresa_id
  from public.perfis p
  where p.id = p_usuario_id
    and p.role = 'admin_empresa'
    and p.empresa_id is not null
  for share;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'ERN_SEM_PERMISSAO'
    );
  end if;

  -- Serializa as reservas da mesma assinatura.
  select a.*
  into v_assinatura
  from public.assinaturas_empresas a
  where a.empresa_id = v_empresa_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'ERN_ASSINATURA_NAO_ENCONTRADA'
    );
  end if;

  select o.*
  into v_operacao
  from public.ern_operacoes_assinatura_v1 o
  where o.empresa_id = v_empresa_id
    and o.estado in (
      'reservado',
      'em_envio',
      'aguardando_pagamento',
      'reconciliar'
    );

  if found then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'ERN_OPERACAO_EM_ANDAMENTO',
      'operacao_id', v_operacao.id,
      'estado', v_operacao.estado
    );
  end if;

  -- Respeita contratações iniciadas pela versão anterior.
  if v_assinatura.plano_pendente_id is not null
     or v_assinatura.provedor_assinatura_pendente_id is not null
     or v_assinatura.ciclo_pendente is not null
     or v_assinatura.checkout_iniciado_em is not null then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'ERN_CHECKOUT_PENDENTE'
    );
  end if;

  
if v_assinatura.plano_pos_cancelamento_id is not null
     or (
       v_assinatura.cancelamento_solicitado_em is not null
       and (
         v_assinatura.cancelamento_efetivo_em is null
         or v_assinatura.cancelamento_efetivo_em > now()
       )
     )
     or (
       v_assinatura.cancelamento_solicitado_em is null
       and v_assinatura.cancelamento_efetivo_em is not null
     ) then

    return jsonb_build_object(
      'ok', false,
      'codigo', 'ERN_CANCELAMENTO_EM_ANDAMENTO'
    );
  end if;

  select p.*
  into v_plano
  from public.planos p
  where p.codigo = p_plano_codigo
    and p.ativo = true
  for share;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'ERN_PLANO_NAO_ENCONTRADO'
    );
  end if;

  if v_assinatura.plano_id = v_plano.id
     and v_assinatura.ciclo_cobranca = p_ciclo
     and v_assinatura.status in ('ativo', 'trial') then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'ERN_PLANO_JA_ATIVO'
    );
  end if;

  select p.*
  into v_preco
  from public.precos_planos p
  where p.plano_id = v_plano.id
    and p.ciclo_cobranca = p_ciclo
    and p.ativo = true
  for share;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'ERN_PRECO_NAO_CONFIGURADO'
    );
  end if;

  if v_preco.valor is null
     or v_preco.valor <= 0
     or v_preco.valor::text in ('NaN', 'Infinity', '-Infinity')
     or v_preco.valor <> round(v_preco.valor, 2)
     or v_preco.moeda is distinct from 'BRL' then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'ERN_PRECO_INVALIDO'
    );
  end if;

  insert into public.ern_operacoes_assinatura_v1 (
    empresa_id,
    assinatura_id,
    solicitado_por,
    plano_id,
    ciclo,
    valor,
    moeda,
    provedor_cliente_id,
    assinatura_anterior_id
  )
  values (
    v_empresa_id,
    v_assinatura.id,
    p_usuario_id,
    v_plano.id,
    p_ciclo,
    v_preco.valor,
    v_preco.moeda,
    v_assinatura.provedor_cliente_id,
    v_assinatura.provedor_assinatura_id
  )
  returning * into v_operacao;

  return jsonb_build_object(
    'ok', true,
    'operacao_id', v_operacao.id,
    'empresa_id', v_empresa_id,
    'assinatura_id', v_assinatura.id,
    'plano_id', v_plano.id,
    'plano_codigo', v_plano.codigo,
    'plano_nome', v_plano.nome,
    'ciclo', v_operacao.ciclo,
    'valor', v_operacao.valor,
    'moeda', v_operacao.moeda,
    'estado', v_operacao.estado,
    'provedor_cliente_id', v_operacao.provedor_cliente_id,
    'assinatura_anterior_id', v_operacao.assinatura_anterior_id
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ern_reservar_evento_asaas_v1(p_evento_id text, p_tipo_evento text, p_pagamento_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_evento public.webhook_eventos%rowtype;
  v_tentativa uuid;
begin
  if p_evento_id is null
     or length(btrim(p_evento_id)) = 0
     or length(p_evento_id) > 200
     or p_tipo_evento is null
     or length(p_tipo_evento) > 100
     or p_tipo_evento !~ '^PAYMENT_[A-Z_]+$'
     or p_pagamento_id is null
     or length(btrim(p_pagamento_id)) = 0
     or length(p_pagamento_id) > 200 then
    raise exception using
      errcode = '22023',
      message = 'ERN_EVENTO_INVALIDO';
  end if;

  insert into public.webhook_eventos (
    provedor,
    evento_id,
    tipo_evento,
    pagamento_id,
    status,
    updated_at
  )
  values (
    'asaas',
    p_evento_id,
    p_tipo_evento,
    p_pagamento_id,
    'falhou',
    now()
  )
  on conflict (provedor, evento_id) do nothing;

  select e.*
  into strict v_evento
  from public.webhook_eventos e
  where e.provedor = 'asaas'
    and e.evento_id = p_evento_id
  for update;

  if v_evento.tipo_evento is distinct from p_tipo_evento
     or (
       v_evento.pagamento_id is not null
       and v_evento.pagamento_id <> p_pagamento_id
     ) then
    raise exception using
      errcode = '22023',
      message = 'ERN_EVENTO_DIVERGENTE';
  end if;

  if v_evento.status = 'processado' then
    return jsonb_build_object(
      'resultado', 'processado'
    );
  end if;

  if v_evento.status = 'processando' then
    return jsonb_build_object(
      'resultado', 'ocupado'
    );
  end if;

  if v_evento.status <> 'falhou' then
    raise exception 'ERN_ESTADO_EVENTO_INVALIDO';
  end if;

  v_tentativa := gen_random_uuid();

  update public.webhook_eventos
  set
    status = 'processando',
    tentativa_id = v_tentativa,
    pagamento_id = p_pagamento_id,
    ultimo_erro_codigo = null,
    updated_at = now()
  where id = v_evento.id;

  return jsonb_build_object(
    'resultado', 'processar',
    'tentativa_id', v_tentativa
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ern_reservas_financeiro(p_finalidade text DEFAULT 'referencias'::text, p_reserva_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_usuario uuid := auth.uid();
  v_empresa uuid;
  v_total bigint;
  v_registros jsonb;
begin
  if v_usuario is null
     or coalesce(
       auth.jwt() ->> 'is_anonymous',
       'false'
     ) = 'true'
  then
    raise exception 'Entre novamente para consultar as reservas.'
      using errcode = '42501';
  end if;

  if p_finalidade is null
     or p_finalidade not in ('referencias', 'analise')
  then
    raise exception 'Finalidade de consulta inválida.'
      using errcode = '22023';
  end if;

  select p.empresa_id
    into v_empresa
  from public.perfis as p
  where p.id = v_usuario;

  if v_empresa is null then
    raise exception 'Sua conta não possui uma empresa vinculada.'
      using errcode = '42501';
  end if;

  if public.ern_pode_acessar_modulo('financeiro')
     is distinct from true
  then
    raise exception 'Seu perfil não permite esta consulta financeira.'
      using errcode = '42501';
  end if;

  if public.empresa_tem_recurso(v_empresa, 'financeiro')
     is distinct from true
  then
    raise exception 'O plano não disponibiliza o recurso financeiro.'
      using errcode = '42501';
  end if;

  if p_finalidade = 'analise' then
    if public.ern_pode_acessar_modulo('relatorios')
       is distinct from true
       or public.empresa_tem_recurso(
         v_empresa,
         'relatorios'
       ) is distinct from true
    then
      raise exception
        'A análise integrada exige acesso a relatórios no perfil e no plano.'
        using errcode = '42501';
    end if;
  end if;

  select count(*)
    into v_total
  from public.reservas as r
  where r.empresa_id = v_empresa
    and (
      p_reserva_id is null
      or r.id = p_reserva_id
    );

  if v_total > 10000 then
    raise exception
      'O volume de reservas exige filtros no servidor. Nenhum resultado parcial será apresentado.'
      using errcode = '22023';
  end if;

  if p_finalidade = 'referencias' then
    -- Campos utilizados na seleção de uma reserva para receita.
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'cliente', r.cliente,
          'pacote', r.pacote,
          'data_reserva', r.data_reserva,
          'status', r.status,
          'valor_total', r.valor_total::text
        )
        order by r.id
      ),
      '[]'::jsonb
    )
    into v_registros
    from public.reservas as r
    where r.empresa_id = v_empresa
      and (
        p_reserva_id is null
        or r.id = p_reserva_id
      );

  else
    -- Campos necessários aos cálculos existentes dos relatórios.
    -- Não inclui nomes, contatos ou documentos de clientes.
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'empresa_id', r.empresa_id,
          'data_reserva', r.data_reserva,
          'data', to_jsonb(r) -> 'data',
          'valor_total', r.valor_total::text,
          'valor', to_jsonb(r) ->> 'valor',
          'quantidade_pessoas', r.quantidade_pessoas,
          'status', r.status
        )
        order by r.id
      ),
      '[]'::jsonb
    )
    into v_registros
    from public.reservas as r
    where r.empresa_id = v_empresa
      and (
        p_reserva_id is null
        or r.id = p_reserva_id
      );
  end if;

  return jsonb_build_object(
    'empresa_id', v_empresa,
    'finalidade', p_finalidade,
    'total', v_total,
    'registros', v_registros
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ern_salvar_demanda_itens(p_demanda_id uuid, p_versao integer, p_itens jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_empresa_id uuid;
    v_status text;
    v_versao integer;
    v_usuario_id uuid := auth.uid();
BEGIN
    IF v_usuario_id IS NULL THEN
        RAISE EXCEPTION 'Entre novamente para salvar a lista.';
    END IF;

    IF p_versao IS NULL OR p_versao < 0 THEN
        RAISE EXCEPTION 'Versão da lista inválida.';
    END IF;

    IF p_itens IS NULL
       OR jsonb_typeof(p_itens) <> 'array' THEN
        RAISE EXCEPTION 'A lista de itens é inválida.';
    END IF;

    IF jsonb_array_length(p_itens) > 200 THEN
        RAISE EXCEPTION 'Cada demanda permite até 200 itens.';
    END IF;

    SELECT d.empresa_id, d.status, d.itens_versao
      INTO v_empresa_id, v_status, v_versao
      FROM public.demandas AS d
     WHERE d.id = p_demanda_id
       AND EXISTS (
           SELECT 1
             FROM public.perfis AS p
            WHERE p.id = v_usuario_id
              AND p.empresa_id = d.empresa_id
              AND p.role IN (
                  'admin_empresa',
                  'operador_empresa'
              )
       )
     FOR UPDATE OF d;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Demanda indisponível ou sem permissão para editar.';
    END IF;

    IF v_status NOT IN ('rascunho', 'aberta') THEN
        RAISE EXCEPTION
            'Demandas encerradas ou canceladas não permitem alterar itens.';
    END IF;

    IF v_versao <> p_versao THEN
        RAISE EXCEPTION
            'A lista foi alterada por outro acesso. Recarregue antes de salvar.';
    END IF;

    IF EXISTS (
        SELECT 1
          FROM jsonb_array_elements(p_itens) AS elemento(valor)
         WHERE jsonb_typeof(elemento.valor) <> 'object'
    ) THEN
        RAISE EXCEPTION 'A lista contém um item inválido.';
    END IF;

    DELETE FROM public.demanda_itens
     WHERE demanda_id = p_demanda_id;

    INSERT INTO public.demanda_itens (
        demanda_id,
        descricao,
        categoria,
        quantidade,
        unidade,
        preco_unitario_estimado,
        situacao,
        observacoes,
        ordem
    )
    SELECT
        p_demanda_id,
        btrim(item.descricao),
        item.categoria,
        item.quantidade,
        btrim(item.unidade),
        item.preco_unitario_estimado,
        COALESCE(item.situacao, 'pendente'),
        NULLIF(btrim(item.observacoes), ''),
        (elemento.posicao - 1)::integer
    FROM jsonb_array_elements(p_itens)
         WITH ORDINALITY AS elemento(valor, posicao)
    CROSS JOIN LATERAL jsonb_to_record(elemento.valor) AS item(
        descricao text,
        categoria text,
        quantidade numeric,
        unidade text,
        preco_unitario_estimado numeric,
        situacao text,
        observacoes text
    );

    UPDATE public.demandas
       SET itens_versao = itens_versao + 1
     WHERE id = p_demanda_id
     RETURNING itens_versao INTO v_versao;

    RETURN v_versao;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ern_validar_encerramento_reserva()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
    v_anterior text;
    v_novo text;
BEGIN
    v_novo := translate(
        lower(btrim(coalesce(NEW.status, ''))),
        'í',
        'i'
    );

    IF TG_OP = 'INSERT' THEN
        IF v_novo IN ('concluida', 'nao compareceu', 'não compareceu') THEN
            RAISE EXCEPTION
                'Cadastre a reserva antes de registrar seu encerramento.'
                USING ERRCODE = '23514';
        END IF;

        RETURN NEW;
    END IF;

    v_anterior := translate(
        lower(btrim(coalesce(OLD.status, ''))),
        'í',
        'i'
    );

    IF v_anterior IN ('concluida', 'nao compareceu', 'não compareceu') THEN
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION
                'A reserva está encerrada. A reabertura exige um procedimento específico.'
                USING ERRCODE = '23514';
        END IF;

        IF NEW.data_reserva IS DISTINCT FROM OLD.data_reserva
           OR NEW.horario IS DISTINCT FROM OLD.horario
           OR NEW.data_fim_prevista IS DISTINCT FROM OLD.data_fim_prevista
           OR NEW.horario_fim_previsto IS DISTINCT FROM OLD.horario_fim_previsto
        THEN
            RAISE EXCEPTION
                'Não é permitido remarcar uma reserva encerrada.'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    IF v_novo IN ('concluida', 'nao compareceu', 'não compareceu')
       AND NEW.status IS DISTINCT FROM OLD.status
    THEN
        IF v_anterior <> 'confirmada' THEN
            RAISE EXCEPTION
                'Somente uma reserva confirmada pode ser encerrada.'
                USING ERRCODE = '23514';
        END IF;

        -- Padroniza o valor gravado.
        NEW.status := CASE
            WHEN v_novo = 'concluida' THEN 'Concluída'
            ELSE 'Não compareceu'
        END;

        IF NEW.data_reserva >
            (statement_timestamp() AT TIME ZONE 'America/Manaus')::date
        THEN
            RAISE EXCEPTION
                'Não é permitido encerrar uma reserva com início em data futura.'
                USING ERRCODE = '23514';
        END IF;

        IF NEW.data_reserva =
            (statement_timestamp() AT TIME ZONE 'America/Manaus')::date
           AND NEW.horario IS NOT NULL
           AND NEW.horario >
            (statement_timestamp() AT TIME ZONE 'America/Manaus')::time
        THEN
            RAISE EXCEPTION
                'O horário de início da reserva ainda não chegou.'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ern_validar_reserva_financeiro()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_empresa uuid;
begin
  if new.reserva_id is null then
    return new;
  end if;

  select p.empresa_id into v_empresa
  from public.perfis p where p.id = auth.uid();

  if v_empresa is null then
    raise exception 'ERN_USUARIO_SEM_EMPRESA';
  end if;
  if new.empresa_id is distinct from v_empresa then
    raise exception 'O lançamento precisa pertencer à empresa autenticada.';
  end if;

  -- Mantem a reserva estavel enquanto o lancamento e gravado.
  perform r.id
  from public.reservas r
  where r.id = new.reserva_id and r.empresa_id = v_empresa
  for share;

  if not found then
    raise exception 'A reserva selecionada não está disponível para esta empresa.';
  end if;

  -- Cancelamento da reserva nao comprova devolucao ou recebimento.
  -- O vinculo nao altera valor, tipo, status ou datas do lancamento.
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ern_validar_vinculos_reserva()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_validar_todos boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_validar_todos := true;
  ELSE
    v_validar_todos :=
      NEW.empresa_id IS DISTINCT FROM OLD.empresa_id;
  END IF;

  IF NEW.empresa_id IS NULL THEN
    RAISE EXCEPTION
      'A reserva precisa estar vinculada a uma empresa.';
  END IF;

  IF NEW.cliente_id IS NOT NULL THEN
    IF v_validar_todos
       OR NEW.cliente_id IS DISTINCT FROM OLD.cliente_id THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.clientes AS c
        WHERE c.id = NEW.cliente_id
          AND c.empresa_id = NEW.empresa_id
      ) THEN
        RAISE EXCEPTION
          'O cliente selecionado não está disponível para esta empresa.';
      END IF;
    END IF;
  END IF;

  IF NEW.passeio_id IS NOT NULL THEN
    IF v_validar_todos
       OR NEW.passeio_id IS DISTINCT FROM OLD.passeio_id THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.passeios AS p
        WHERE p.id = NEW.passeio_id
          AND p.empresa_id = NEW.empresa_id
      ) THEN
        RAISE EXCEPTION
          'O passeio selecionado não está disponível para esta empresa.';
      END IF;
    END IF;
  END IF;

  IF NEW.parceiro_id IS NOT NULL THEN
    IF v_validar_todos
       OR NEW.parceiro_id IS DISTINCT FROM OLD.parceiro_id THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.parceiros AS p
        WHERE p.id = NEW.parceiro_id
          AND p.empresa_id = NEW.empresa_id
      ) THEN
        RAISE EXCEPTION
          'O parceiro selecionado não está disponível para esta empresa.';
      END IF;
    END IF;
  END IF;

  IF NEW.embarcacao_id IS NOT NULL THEN
    IF v_validar_todos
       OR NEW.embarcacao_id IS DISTINCT FROM OLD.embarcacao_id THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.embarcacoes AS e
        WHERE e.id = NEW.embarcacao_id
          AND e.empresa_id = NEW.empresa_id
      ) THEN
        RAISE EXCEPTION
          'A embarcação selecionada não está disponível para esta empresa.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_catalogo_planos()
 RETURNS TABLE(plano_id uuid, codigo text, nome text, descricao text, limite_usuarios integer, limite_clientes integer, limite_reservas_mes integer, limite_passeios integer, recursos jsonb, ciclo_cobranca text, valor numeric, moeda text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    pl.id,
    pl.codigo,
    pl.nome,
    pl.descricao,
    pl.limite_usuarios,
    pl.limite_clientes,
    pl.limite_reservas_mes,
    pl.limite_passeios,
    pl.recursos,
    pp.ciclo_cobranca,
    pp.valor,
    pp.moeda
  from public.planos pl

  left join public.precos_planos pp
    on pp.plano_id = pl.id
   and pp.ativo = true

  where pl.ativo = true

  order by
    case pl.codigo
      when 'free' then 1
      when 'pro' then 2
      when 'premium' then 3
      else 99
    end,
    case pp.ciclo_cobranca
      when 'mensal' then 1
      when 'trimestral' then 2
      when 'anual' then 3
      else 99
    end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_meu_plano()
 RETURNS TABLE(empresa_id uuid, empresa_nome text, plano_id uuid, plano_codigo text, plano_nome text, assinatura_status text, limite_usuarios integer, limite_clientes integer, limite_reservas_mes integer, limite_passeios integer, recursos jsonb)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select
    e.id as empresa_id,
    e.nome as empresa_nome,
    p.id as plano_id,
    p.codigo as plano_codigo,
    p.nome as plano_nome,
    ae.status as assinatura_status,
    p.limite_usuarios,
    p.limite_clientes,
    p.limite_reservas_mes,
    p.limite_passeios,
    p.recursos
  from public.perfis pf
  join public.empresa e
    on e.id = pf.empresa_id
  join public.assinaturas_empresas ae
    on ae.empresa_id = e.id
  join public.planos p
    on p.id = ae.plano_id
  where pf.id = auth.uid()
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_meu_tema_ern()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(
    (
      select case
        when c.tema in (
          'verde',
          'azul',
          'amarelo',
          'branco',
          'grafite'
        )
          then c.tema
        else 'grafite'
      end
      from public.perfis as p
      join public.configuracoes as c
        on c.empresa_id = p.empresa_id
      where p.id = (select auth.uid())
      limit 1
    ),
    'grafite'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.get_meu_uso_clientes()
 RETURNS TABLE(plano_codigo text, plano_nome text, total_clientes bigint, limite_clientes integer, ilimitado boolean, percentual_uso numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select
    pl.codigo,
    pl.nome,
    count(c.id)::bigint,
    pl.limite_clientes,

    (pl.limite_clientes is null) as ilimitado,

    case
      when pl.limite_clientes is null then null

      when pl.limite_clientes = 0 then 100

      else round(
        (
          count(c.id)::numeric
          / pl.limite_clientes::numeric
        ) * 100,
        1
      )
    end as percentual_uso

  from public.perfis pf

  join public.assinaturas_empresas ae
    on ae.empresa_id = pf.empresa_id

  join public.planos pl
    on pl.id = ae.plano_id

  left join public.clientes c
    on c.empresa_id = pf.empresa_id

  where pf.id = auth.uid()
    and ae.status in ('ativo', 'trial')

  group by
    pl.codigo,
    pl.nome,
    pl.limite_clientes

  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_meu_uso_passeios()
 RETURNS TABLE(plano_codigo text, plano_nome text, total_passeios bigint, limite_passeios integer, ilimitado boolean, percentual_uso numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select
    pl.codigo,
    pl.nome,
    count(ps.id)::bigint,
    pl.limite_passeios,

    (
      pl.limite_passeios is null
    ) as ilimitado,

    case
      when pl.limite_passeios is null then null

      when pl.limite_passeios = 0 then 100

      else round(
        (
          count(ps.id)::numeric
          /
          pl.limite_passeios::numeric
        ) * 100,
        1
      )
    end as percentual_uso

  from public.perfis pf

  join public.assinaturas_empresas ae
    on ae.empresa_id = pf.empresa_id

  join public.planos pl
    on pl.id = ae.plano_id

  left join public.passeios ps
    on ps.empresa_id = pf.empresa_id

  where pf.id = auth.uid()
    and ae.status in ('ativo', 'trial')

  group by
    pl.codigo,
    pl.nome,
    pl.limite_passeios

  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_meu_uso_reservas_mes()
 RETURNS TABLE(plano_codigo text, plano_nome text, total_reservas_mes bigint, limite_reservas_mes integer, ilimitado boolean, percentual_uso numeric, inicio_periodo date, fim_periodo date)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$

  with contexto as (
    select
      pf.empresa_id,

      date_trunc(
        'month',
        timezone(
          'America/Manaus',
          now()
        )
      ) as inicio_mes

    from public.perfis pf
    where pf.id = auth.uid()
    limit 1
  )

  select
    pl.codigo,
    pl.nome,

    count(r.id)::bigint,

    pl.limite_reservas_mes,

    (
      pl.limite_reservas_mes
      is null
    ) as ilimitado,

    case
      when pl.limite_reservas_mes
        is null
        then null

      when pl.limite_reservas_mes = 0
        then 100

      else round(
        (
          count(r.id)::numeric
          /
          pl.limite_reservas_mes::numeric
        ) * 100,
        1
      )
    end,

    c.inicio_mes::date,

    (
      c.inicio_mes
      + interval '1 month'
      - interval '1 day'
    )::date

  from contexto c

  join public.assinaturas_empresas ae
    on ae.empresa_id = c.empresa_id

  join public.planos pl
    on pl.id = ae.plano_id

  left join public.reservas r
    on r.empresa_id = c.empresa_id

    and timezone(
      'America/Manaus',
      r.created_at
    ) >= c.inicio_mes

    and timezone(
      'America/Manaus',
      r.created_at
    ) <
      c.inicio_mes
      + interval '1 month'

  where ae.status in (
    'ativo',
    'trial'
  )

  group by
    pl.codigo,
    pl.nome,
    pl.limite_reservas_mes,
    c.inicio_mes

  limit 1;

$function$
;

CREATE OR REPLACE FUNCTION public.get_meu_uso_usuarios()
 RETURNS TABLE(plano_codigo text, plano_nome text, total_usuarios bigint, limite_usuarios integer, ilimitado boolean, percentual_uso numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    pl.codigo,
    pl.nome,
    uso.total,
    pl.limite_usuarios,
    pl.limite_usuarios is null,

    case
      when pl.limite_usuarios is null
        then null::numeric

      when pl.limite_usuarios = 0
        then 100::numeric

      else round(
        (
          uso.total::numeric
          / pl.limite_usuarios::numeric
        ) * 100,
        1
      )
    end

  from public.perfis as pf

  join public.assinaturas_empresas as ae
    on ae.empresa_id = pf.empresa_id

  join public.planos as pl
    on pl.id = ae.plano_id

  cross join lateral (
    select count(*)::bigint as total
    from public.perfis as integrante
    where integrante.empresa_id = pf.empresa_id
  ) as uso

  where pf.id = (select auth.uid())
    and pf.empresa_id is not null
    and ae.status in ('ativo', 'trial')
    and public.ern_pode_acessar_modulo('equipe')

  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.proteger_perfil_publico_operadora_ern()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_empresa uuid;
  v_papel text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'authenticated' THEN
    RETURN NEW;
  END IF;

  -- Exceção limitada ao perfil editorial oficial existente.
  IF TG_OP = 'UPDATE' THEN
    IF OLD.id = '6d2be2c2-31f7-4f5a-b62b-db262177bdd3'::uuid
      AND OLD.origem_tipo = 'editorial'
      AND OLD.categoria = 'ern_editorial'
    THEN
      IF NOT public.tem_acesso_editorial_ern() THEN
        RAISE EXCEPTION 'Acesso editorial nao autorizado.'
          USING ERRCODE = '42501';
      END IF;

      -- Apenas apresentação, contatos e visibilidade podem mudar.
      -- Todos os outros campos ficam protegidos.
      IF (
        to_jsonb(NEW) - ARRAY[
          'nome_publico',
          'cidade',
          'uf',
          'descricao_curta',
          'descricao_completa',
          'logo_url',
          'capa_url',
          'whatsapp',
          'instagram',
          'site',
          'idiomas',
          'especialidades',
          'territorio_id',
          'publicado',
          'updated_at'
        ]::text[]
      ) IS DISTINCT FROM (
        to_jsonb(OLD) - ARRAY[
          'nome_publico',
          'cidade',
          'uf',
          'descricao_curta',
          'descricao_completa',
          'logo_url',
          'capa_url',
          'whatsapp',
          'instagram',
          'site',
          'idiomas',
          'especialidades',
          'territorio_id',
          'publicado',
          'updated_at'
        ]::text[]
      ) THEN
        RAISE EXCEPTION
          'A identidade e os campos reservados do editorial nao podem mudar.'
          USING ERRCODE = '42501';
      END IF;

      NEW.updated_at := now();
      RETURN NEW;
    END IF;
  END IF;

  -- Gestão dos perfis das operadoras.
  SELECT p.empresa_id, p.role
  INTO v_empresa, v_papel
  FROM public.perfis p
  WHERE p.id = auth.uid();

  IF v_empresa IS NULL
    OR v_papel IS DISTINCT FROM 'admin_empresa'
  THEN
    RAISE EXCEPTION
      'Somente administradores da operadora podem gerenciar este perfil.'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.origem_tipo IS DISTINCT FROM 'empresa'
      OR NEW.categoria IS DISTINCT FROM 'operadora'
      OR NEW.empresa_id IS DISTINCT FROM v_empresa
      OR NEW.empresa_gestora_id IS DISTINCT FROM v_empresa
      OR NEW.usuario_id IS NOT NULL
      OR NEW.parceiro_id IS NOT NULL
    THEN
      RAISE EXCEPTION
        'O perfil publico deve representar a propria operadora.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.verificado IS DISTINCT FROM false
      OR NEW.destaque IS DISTINCT FROM false
      OR NEW.ordem_destaque IS DISTINCT FROM 0
    THEN
      RAISE EXCEPTION
        'Verificacao e destaque sao administrados pela plataforma.'
        USING ERRCODE = '42501';
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.origem_tipo IS DISTINCT FROM 'empresa'
      OR OLD.categoria IS DISTINCT FROM 'operadora'
      OR OLD.empresa_id IS DISTINCT FROM v_empresa
      OR OLD.empresa_gestora_id IS DISTINCT FROM v_empresa
    THEN
      RAISE EXCEPTION 'Este perfil nao pertence a sua operadora.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.origem_tipo IS DISTINCT FROM OLD.origem_tipo
      OR NEW.categoria IS DISTINCT FROM OLD.categoria
      OR NEW.empresa_id IS DISTINCT FROM OLD.empresa_id
      OR NEW.empresa_gestora_id IS DISTINCT FROM OLD.empresa_gestora_id
      OR NEW.usuario_id IS DISTINCT FROM OLD.usuario_id
      OR NEW.parceiro_id IS DISTINCT FROM OLD.parceiro_id
    THEN
      RAISE EXCEPTION
        'A identidade e os vinculos do perfil nao podem ser alterados.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.verificado IS DISTINCT FROM OLD.verificado
      OR NEW.destaque IS DISTINCT FROM OLD.destaque
      OR NEW.ordem_destaque IS DISTINCT FROM OLD.ordem_destaque
    THEN
      RAISE EXCEPTION
        'Verificacao e destaque sao administrados pela plataforma.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.proteger_publicacao_operadora_ern()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF auth.role() IS DISTINCT FROM 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'publicacoes' THEN
    IF TG_OP = 'UPDATE' THEN
      IF NEW.id IS DISTINCT FROM OLD.id
        OR NEW.autor_perfil_id IS DISTINCT FROM OLD.autor_perfil_id
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
        OR NEW.destaque IS DISTINCT FROM OLD.destaque
      THEN
        RAISE EXCEPTION 'Autoria e campos reservados nao podem ser alterados.'
          USING ERRCODE = '42501';
      END IF;

      IF OLD.status NOT IN ('rascunho', 'publicado', 'arquivado') THEN
        RAISE EXCEPTION 'Publicacao sob controle de moderacao.'
          USING ERRCODE = '42501';
      END IF;
    ELSE
      NEW.destaque := false;
      NEW.created_at := now();
    END IF;

    IF NEW.status NOT IN ('rascunho', 'publicado', 'arquivado') THEN
      RAISE EXCEPTION 'Situacao nao permitida para a operadora.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.status = 'publicado' THEN
      IF TG_OP = 'INSERT' THEN
        NEW.publicado_em := now();
      ELSIF OLD.status IS DISTINCT FROM 'publicado' THEN
        NEW.publicado_em := now();
      ELSE
        NEW.publicado_em := OLD.publicado_em;
      END IF;
    ELSE
      NEW.publicado_em := NULL;
    END IF;

    NEW.updated_at := now();

  ELSIF TG_TABLE_NAME = 'publicacao_midias' THEN
    IF TG_OP = 'UPDATE' THEN
      IF NEW.id IS DISTINCT FROM OLD.id
        OR NEW.publicacao_id IS DISTINCT FROM OLD.publicacao_id
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
      THEN
        RAISE EXCEPTION 'A imagem nao pode ser transferida para outra publicacao.'
          USING ERRCODE = '42501';
      END IF;
    ELSE
      NEW.created_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.tem_acesso_editorial_ern()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.administradores_editoriais_ern a
    WHERE a.usuario_id = auth.uid()
      AND a.ativo = true
  );
$function$
;

CREATE OR REPLACE FUNCTION public.tem_recurso_plano(p_recurso text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce(
    (
      select public.empresa_tem_recurso(
        pf.empresa_id,
        p_recurso
      )
      from public.perfis as pf
      where pf.id = (select auth.uid())
      limit 1
    ),
    false
  );
$function$
;

CREATE OR REPLACE FUNCTION public.usuario_tem_recurso_plano(p_recurso text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select public.tem_recurso_plano(p_recurso);
$function$
;

CREATE OR REPLACE FUNCTION public.validar_limite_clientes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_empresa_id uuid;
  v_limite integer;
  v_total integer;
  v_plano text;
begin

  -- ----------------------------------------------------------
  -- IDENTIFICA A EMPRESA DO USUÁRIO AUTENTICADO
  -- ----------------------------------------------------------

  select p.empresa_id
  into v_empresa_id
  from public.perfis p
  where p.id = auth.uid();

  if v_empresa_id is null then
    raise exception
      'ERN_USUARIO_SEM_EMPRESA';
  end if;


  -- ----------------------------------------------------------
  -- TRAVA POR EMPRESA DURANTE A TRANSAÇÃO
  --
  -- Evita dois cadastros simultâneos ultrapassarem o limite.
  -- ----------------------------------------------------------

  perform pg_advisory_xact_lock(
    hashtextextended(v_empresa_id::text, 0)
  );


  -- ----------------------------------------------------------
  -- BUSCA O PLANO E O LIMITE
  -- ----------------------------------------------------------

  select
    pl.nome,
    pl.limite_clientes
  into
    v_plano,
    v_limite
  from public.assinaturas_empresas ae
  join public.planos pl
    on pl.id = ae.plano_id
  where ae.empresa_id = v_empresa_id
    and ae.status in ('ativo', 'trial')
  limit 1;


  if not found then
    raise exception
      'ERN_ASSINATURA_NAO_ENCONTRADA';
  end if;


  -- ----------------------------------------------------------
  -- NULL = ILIMITADO
  -- ----------------------------------------------------------

  if v_limite is null then
    return new;
  end if;


  -- ----------------------------------------------------------
  -- CONTA OS CLIENTES DA EMPRESA
  -- ----------------------------------------------------------

  select count(*)
  into v_total
  from public.clientes c
  where c.empresa_id = v_empresa_id;


  -- ----------------------------------------------------------
  -- BLOQUEIA AO ATINGIR O LIMITE
  -- ----------------------------------------------------------

  if v_total >= v_limite then
    raise exception
      'ERN_LIMITE_CLIENTES_ATINGIDO|plano=%|uso=%|limite=%',
      v_plano,
      v_total,
      v_limite;
  end if;


  return new;

end;
$function$
;

CREATE OR REPLACE FUNCTION public.validar_limite_passeios()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_empresa_id uuid;
  v_limite integer;
  v_total bigint;
  v_plano text;
begin

  -- Empresa do usuário autenticado
  select p.empresa_id
  into v_empresa_id
  from public.perfis p
  where p.id = auth.uid();

  if v_empresa_id is null then
    raise exception
      'ERN_USUARIO_SEM_EMPRESA';
  end if;


  -- Evita dois cadastros simultâneos ultrapassarem o limite
  perform pg_advisory_xact_lock(
    hashtextextended(
      v_empresa_id::text || ':passeios',
      0
    )
  );


  -- Plano atual
  select
    pl.nome,
    pl.limite_passeios
  into
    v_plano,
    v_limite
  from public.assinaturas_empresas ae
  join public.planos pl
    on pl.id = ae.plano_id
  where ae.empresa_id = v_empresa_id
    and ae.status in ('ativo', 'trial')
  limit 1;


  if not found then
    raise exception
      'ERN_ASSINATURA_NAO_ENCONTRADA';
  end if;


  -- NULL = ilimitado
  if v_limite is null then
    return new;
  end if;


  -- Total de passeios da empresa
  select count(*)
  into v_total
  from public.passeios p
  where p.empresa_id = v_empresa_id;


  -- Bloqueio
  if v_total >= v_limite then
    raise exception
      'ERN_LIMITE_PASSEIOS_ATINGIDO|plano=%|uso=%|limite=%',
      v_plano,
      v_total,
      v_limite;
  end if;


  return new;

end;
$function$
;

CREATE OR REPLACE FUNCTION public.validar_limite_reservas_mes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_empresa_id uuid;
  v_limite integer;
  v_total bigint;
  v_plano text;
  v_inicio_mes timestamp;
  v_inicio_proximo_mes timestamp;
begin

  -- ----------------------------------------------------------
  -- EMPRESA DO USUÁRIO AUTENTICADO
  -- ----------------------------------------------------------

  select p.empresa_id
  into v_empresa_id
  from public.perfis p
  where p.id = auth.uid();

  if v_empresa_id is null then
    raise exception
      'ERN_USUARIO_SEM_EMPRESA';
  end if;


  -- ----------------------------------------------------------
  -- EVITA CADASTROS SIMULTÂNEOS ULTRAPASSAREM A FRANQUIA
  -- ----------------------------------------------------------

  perform pg_advisory_xact_lock(
    hashtextextended(
      v_empresa_id::text || ':reservas',
      0
    )
  );


  -- ----------------------------------------------------------
  -- PLANO ATUAL
  -- ----------------------------------------------------------

  select
    pl.nome,
    pl.limite_reservas_mes
  into
    v_plano,
    v_limite
  from public.assinaturas_empresas ae
  join public.planos pl
    on pl.id = ae.plano_id
  where ae.empresa_id = v_empresa_id
    and ae.status in ('ativo', 'trial')
  limit 1;


  if not found then
    raise exception
      'ERN_ASSINATURA_NAO_ENCONTRADA';
  end if;


  -- ----------------------------------------------------------
  -- NULL = ILIMITADO
  -- ----------------------------------------------------------

  if v_limite is null then
    return new;
  end if;


  -- ----------------------------------------------------------
  -- INÍCIO/FIM DO MÊS EM AMERICA/MANAUS
  -- ----------------------------------------------------------

  v_inicio_mes :=
    date_trunc(
      'month',
      timezone(
        'America/Manaus',
        now()
      )
    );

  v_inicio_proximo_mes :=
    v_inicio_mes + interval '1 month';


  -- ----------------------------------------------------------
  -- RESERVAS CRIADAS NESTE MÊS
  -- ----------------------------------------------------------

  select count(*)
  into v_total
  from public.reservas r
  where r.empresa_id = v_empresa_id
    and timezone(
      'America/Manaus',
      r.created_at
    ) >= v_inicio_mes
    and timezone(
      'America/Manaus',
      r.created_at
    ) < v_inicio_proximo_mes;


  -- ----------------------------------------------------------
  -- BLOQUEIO
  -- ----------------------------------------------------------

  if v_total >= v_limite then
    raise exception
      'ERN_LIMITE_RESERVAS_MES_ATINGIDO|plano=%|uso=%|limite=%',
      v_plano,
      v_total,
      v_limite;
  end if;


  return new;

end;
$function$
;

CREATE OR REPLACE FUNCTION public.validar_limite_usuarios_empresa()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_limite integer;
  v_total bigint;
  v_plano text;
begin

  -- Perfis de plataforma podem não possuir empresa.
  -- Neste caso não entram no limite comercial.
  if new.empresa_id is null then
    return new;
  end if;


  -- Serializa novas inclusões por empresa para evitar
  -- dois cadastros simultâneos ultrapassarem o limite.
  perform pg_advisory_xact_lock(
    hashtextextended(
      new.empresa_id::text || ':usuarios',
      0
    )
  );


  -- Busca a assinatura ativa/trial da empresa.
  select
    pl.nome,
    pl.limite_usuarios
  into
    v_plano,
    v_limite
  from public.assinaturas_empresas ae
  join public.planos pl
    on pl.id = ae.plano_id
  where ae.empresa_id = new.empresa_id
    and ae.status in ('ativo', 'trial')
  limit 1;


  if not found then
    raise exception
      'ERN_ASSINATURA_NAO_ENCONTRADA';
  end if;


  -- NULL representa ilimitado.
  if v_limite is null then
    return new;
  end if;


  -- Quantidade atual de perfis vinculados à empresa.
  select count(*)
  into v_total
  from public.perfis p
  where p.empresa_id = new.empresa_id;


  if v_total >= v_limite then
    raise exception
      'ERN_LIMITE_USUARIOS_ATINGIDO|plano=%|uso=%|limite=%',
      v_plano,
      v_total,
      v_limite;
  end if;


  return new;

end;
$function$
;

CREATE OR REPLACE FUNCTION public.validar_separacao_acessos_ern()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  usuario uuid;
BEGIN
  IF TG_TABLE_SCHEMA <> 'public' THEN
    RAISE EXCEPTION 'Tabela não autorizada.';
  END IF;

  IF TG_TABLE_NAME = 'perfis' THEN
    -- Um perfil sem empresa não constitui vínculo empresarial.
    IF NEW.empresa_id IS NULL THEN
      RETURN NEW;
    END IF;

    usuario := NEW.id;

  ELSIF TG_TABLE_NAME = 'acessos_profissionais' THEN
    usuario := NEW.usuario_id;

  ELSE
    RAISE EXCEPTION 'Tabela não autorizada.';
  END IF;

  -- As operações sobre a mesma conta usam o mesmo bloqueio.
  -- Não altera os dados do usuário no Supabase Auth.
  PERFORM u.id
  FROM auth.users AS u
  WHERE u.id = usuario
  FOR NO KEY UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.'
      USING ERRCODE = '23503';
  END IF;

  IF TG_TABLE_NAME = 'acessos_profissionais' THEN
    IF EXISTS (
      SELECT 1
      FROM public.perfis AS p
      WHERE p.id = usuario
        AND p.empresa_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION
        'Contas vinculadas a operadoras não podem ativar modalidades profissionais independentes.'
        USING ERRCODE = '23514';
    END IF;

  ELSE
    IF EXISTS (
      SELECT 1
      FROM public.acessos_profissionais AS a
      WHERE a.usuario_id = usuario
    ) THEN
      RAISE EXCEPTION
        'Esta conta possui uma modalidade profissional independente. Revise o cadastro antes de vinculá-la a uma operadora.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;


-- ---------------------------------------------------------------------
-- 04. Views [2]
-- ---------------------------------------------------------------------
create or replace view public.rede_publicacoes_consulta_ern with (security_invoker=true) as
 SELECT id,
    autor_perfil_id,
    territorio_id,
    categoria_id,
    slug,
    tipo,
    titulo,
    resumo,
    conteudo,
    idioma_original,
    destino_slug,
    localidade_texto,
    data_evento_inicio,
    data_evento_fim,
    destaque,
    permitir_interacoes,
    publicado_em,
    (EXISTS ( SELECT 1
           FROM publicacao_midias m
          WHERE ((m.publicacao_id = p.id) AND (m.tipo = 'video'::text) AND (m.consentimento_confirmado = true)))) AS tem_video
   FROM publicacoes p
  WHERE ((status = 'publicado'::text) AND (publicado_em IS NOT NULL) AND (publicado_em <= now()) AND (EXISTS ( SELECT 1
           FROM perfis_publicos perfil
          WHERE ((perfil.id = p.autor_perfil_id) AND (perfil.publicado = true)))));

create or replace view public.vw_rede_publica with (security_invoker=true) as
 SELECT id,
    slug,
    nome_publico,
    categoria,
    cidade,
    uf,
    descricao_curta,
    descricao_completa,
    logo_url,
    capa_url,
    whatsapp,
    instagram,
    site,
    idiomas,
    especialidades,
    verificado,
    destaque,
    ordem_destaque
   FROM perfis_publicos
  WHERE (publicado = true);


-- ---------------------------------------------------------------------
-- 05. Restrições (PK, UNIQUE, CHECK e por último FKs) [272]
-- ---------------------------------------------------------------------
alter table public.acessos_profissionais add constraint acessos_profissionais_pkey PRIMARY KEY (usuario_id, tipo);

alter table public.acessos_profissionais add constraint acessos_profissionais_tipo_check CHECK ((tipo = ANY (ARRAY['guia'::text, 'fornecedor'::text])));

alter table public.acessos_profissionais add constraint acessos_profissionais_usuario_unico UNIQUE (usuario_id);

alter table public.administradores_editoriais_ern add constraint administradores_editoriais_ern_pkey PRIMARY KEY (usuario_id);

alter table public.assinaturas_empresas add constraint assinaturas_ciclo_cobranca_check CHECK (((ciclo_cobranca IS NULL) OR (ciclo_cobranca = ANY (ARRAY['mensal'::text, 'trimestral'::text, 'anual'::text]))));

alter table public.assinaturas_empresas add constraint assinaturas_empresas_ciclo_pendente_check CHECK (((ciclo_pendente IS NULL) OR (ciclo_pendente = ANY (ARRAY['mensal'::text, 'trimestral'::text, 'anual'::text]))));

alter table public.assinaturas_empresas add constraint assinaturas_empresas_empresa_id_key UNIQUE (empresa_id);

alter table public.assinaturas_empresas add constraint assinaturas_empresas_pkey PRIMARY KEY (id);

alter table public.assinaturas_empresas add constraint assinaturas_status_check CHECK ((status = ANY (ARRAY['ativo'::text, 'trial'::text, 'cancelado'::text, 'suspenso'::text])));

alter table public.categorias_publicacoes add constraint categorias_publicacoes_descricao_check CHECK (((descricao IS NULL) OR (char_length(descricao) <= 1000)));

alter table public.categorias_publicacoes add constraint categorias_publicacoes_familia_check CHECK ((familia = ANY (ARRAY['cultura_territorio'::text, 'natureza'::text, 'experiencia'::text, 'utilidade'::text])));

alter table public.categorias_publicacoes add constraint categorias_publicacoes_nome_check CHECK (((char_length(btrim(nome)) >= 2) AND (char_length(btrim(nome)) <= 120)));

alter table public.categorias_publicacoes add constraint categorias_publicacoes_pkey PRIMARY KEY (id);

alter table public.categorias_publicacoes add constraint categorias_publicacoes_slug_check CHECK (((char_length(btrim(slug)) >= 2) AND (char_length(btrim(slug)) <= 100)));

alter table public.categorias_publicacoes add constraint categorias_publicacoes_slug_key UNIQUE (slug);

alter table public.clientes add constraint clientes_id_empresa_fiscal_key UNIQUE (id, empresa_id);

alter table public.clientes add constraint clientes_pkey PRIMARY KEY (id);

alter table public.cliques_publicos add constraint cliques_publicos_destino_check CHECK (((perfil_id IS NOT NULL) OR (publicacao_id IS NOT NULL)));

alter table public.cliques_publicos add constraint cliques_publicos_pkey PRIMARY KEY (id);

alter table public.cliques_publicos add constraint cliques_publicos_tipo_check CHECK ((tipo = ANY (ARRAY['whatsapp'::text, 'telefone'::text, 'email'::text, 'site'::text, 'instagram'::text, 'compartilhar'::text, 'ver_perfil'::text, 'ver_roteiro'::text, 'reservar'::text, 'contato'::text])));

alter table public.cobrancas_assinaturas add constraint cobrancas_assinaturas_ciclo_cobranca_check CHECK ((ciclo_cobranca = ANY (ARRAY['mensal'::text, 'trimestral'::text, 'anual'::text])));

alter table public.cobrancas_assinaturas add constraint cobrancas_assinaturas_pkey PRIMARY KEY (id);

alter table public.cobrancas_assinaturas add constraint cobrancas_assinaturas_provedor_id_unique UNIQUE (provedor, provedor_cobranca_id);

alter table public.cobrancas_assinaturas add constraint cobrancas_assinaturas_valor_check CHECK ((valor >= (0)::numeric));

alter table public.configuracoes add constraint configuracoes_empresa_id_key UNIQUE (empresa_id);

alter table public.configuracoes add constraint configuracoes_pkey PRIMARY KEY (id);

alter table public.demanda_itens add constraint demanda_itens_categoria_check CHECK ((categoria = ANY (ARRAY['alimentacao'::text, 'bebidas'::text, 'limpeza'::text, 'combustivel'::text, 'equipamentos'::text, 'outros'::text])));

alter table public.demanda_itens add constraint demanda_itens_descricao_check CHECK (((char_length(btrim(descricao)) >= 2) AND (char_length(btrim(descricao)) <= 200)));

alter table public.demanda_itens add constraint demanda_itens_observacoes_check CHECK (((observacoes IS NULL) OR (char_length(observacoes) <= 2000)));

alter table public.demanda_itens add constraint demanda_itens_ordem_check CHECK ((ordem >= 0));

alter table public.demanda_itens add constraint demanda_itens_pkey PRIMARY KEY (id);

alter table public.demanda_itens add constraint demanda_itens_preco_unitario_estimado_check CHECK (((preco_unitario_estimado IS NULL) OR ((preco_unitario_estimado >= (0)::numeric) AND (preco_unitario_estimado <> 'NaN'::numeric))));

alter table public.demanda_itens add constraint demanda_itens_quantidade_check CHECK (((quantidade > (0)::numeric) AND (quantidade <> 'NaN'::numeric)));

alter table public.demanda_itens add constraint demanda_itens_situacao_check CHECK ((situacao = ANY (ARRAY['pendente'::text, 'em_separacao'::text, 'atendido'::text])));

alter table public.demanda_itens add constraint demanda_itens_unidade_check CHECK (((char_length(btrim(unidade)) >= 1) AND (char_length(btrim(unidade)) <= 40)));

alter table public.demandas add constraint demandas_categoria_check CHECK ((categoria = ANY (ARRAY['alimentacao'::text, 'bebidas'::text, 'combustivel'::text, 'hospedagem'::text, 'transporte_fluvial'::text, 'guiamento'::text, 'passeios'::text, 'outros'::text])));

alter table public.demandas add constraint demandas_consumo_litros_hora_check CHECK (((consumo_litros_hora IS NULL) OR (consumo_litros_hora > (0)::numeric)));

alter table public.demandas add constraint demandas_consumo_pessoa_dia_check CHECK (((consumo_pessoa_dia IS NULL) OR (consumo_pessoa_dia > (0)::numeric)));

alter table public.demandas add constraint demandas_descricao_check CHECK (((descricao IS NULL) OR (char_length(descricao) <= 5000)));

alter table public.demandas add constraint demandas_dias_estimados_check CHECK (((dias_estimados IS NULL) OR (dias_estimados > 0)));

alter table public.demandas add constraint demandas_estimativa_combustivel_check CHECK (((metodo_estimativa <> 'combustivel_hora'::text) OR ((tipo_combustivel IS NOT NULL) AND (dias_estimados IS NOT NULL) AND (horas_motor_dia IS NOT NULL) AND (consumo_litros_hora IS NOT NULL))));

alter table public.demandas add constraint demandas_estimativa_pessoa_dia_check CHECK (((metodo_estimativa <> 'pessoa_dia'::text) OR ((pessoas_estimadas IS NOT NULL) AND (dias_estimados IS NOT NULL) AND (consumo_pessoa_dia IS NOT NULL))));

alter table public.demandas add constraint demandas_horas_motor_dia_check CHECK (((horas_motor_dia IS NULL) OR ((horas_motor_dia > (0)::numeric) AND (horas_motor_dia <= (24)::numeric))));

alter table public.demandas add constraint demandas_itens_versao_check CHECK ((itens_versao >= 0));

alter table public.demandas add constraint demandas_localidade_check CHECK (((char_length(btrim(localidade)) >= 2) AND (char_length(btrim(localidade)) <= 200)));

alter table public.demandas add constraint demandas_margem_percentual_check CHECK (((margem_percentual >= (0)::numeric) AND (margem_percentual <= (100)::numeric)));

alter table public.demandas add constraint demandas_metodo_estimativa_check CHECK ((metodo_estimativa = ANY (ARRAY['manual'::text, 'pessoa_dia'::text, 'combustivel_hora'::text])));

alter table public.demandas add constraint demandas_periodo_check CHECK ((((data_inicio IS NULL) AND (data_fim IS NULL)) OR ((data_inicio IS NOT NULL) AND (data_fim IS NOT NULL) AND (data_fim >= data_inicio))));

alter table public.demandas add constraint demandas_pessoas_estimadas_check CHECK (((pessoas_estimadas IS NULL) OR (pessoas_estimadas > 0)));

alter table public.demandas add constraint demandas_pkey PRIMARY KEY (id);

alter table public.demandas add constraint demandas_publico_alvo_check CHECK (((publico_alvo IS NULL) OR (publico_alvo = ANY (ARRAY['turistas'::text, 'tripulacao'::text, 'ambos'::text, 'operacao'::text]))));

alter table public.demandas add constraint demandas_quantidade_check CHECK (((quantidade > (0)::numeric) AND (quantidade <> 'NaN'::numeric)));

alter table public.demandas add constraint demandas_status_check CHECK ((status = ANY (ARRAY['rascunho'::text, 'aberta'::text, 'encerrada'::text, 'cancelada'::text])));

alter table public.demandas add constraint demandas_tipo_combustivel_check CHECK (((tipo_combustivel IS NULL) OR (tipo_combustivel = ANY (ARRAY['gasolina'::text, 'diesel'::text]))));

alter table public.demandas add constraint demandas_titulo_check CHECK (((char_length(btrim(titulo)) >= 3) AND (char_length(btrim(titulo)) <= 160)));

alter table public.demandas add constraint demandas_unidade_check CHECK (((char_length(btrim(unidade)) >= 1) AND (char_length(btrim(unidade)) <= 40)));

alter table public.embarcacoes add constraint embarcacoes_pkey PRIMARY KEY (id);

alter table public.empresa add constraint empresa_pkey PRIMARY KEY (id);

alter table public.empresa_capacidades add constraint empresa_capacidades_codigo_check CHECK ((capacidade = ANY (ARRAY['agenciamento'::text, 'operacao_turistica'::text, 'hospedagem'::text, 'transporte_fluvial'::text, 'guiamento'::text, 'passeios'::text])));

alter table public.empresa_capacidades add constraint empresa_capacidades_pkey PRIMARY KEY (empresa_id, capacidade);

alter table public.empresa_configuracao_fiscal add constraint empresa_configuracao_fiscal_ambiente_check CHECK ((ambiente = 'simulacao'::text));

alter table public.empresa_configuracao_fiscal add constraint empresa_configuracao_fiscal_cnpj_prestador_check CHECK (((cnpj_prestador IS NULL) OR (cnpj_prestador ~ '^[0-9]{14}$'::text)));

alter table public.empresa_configuracao_fiscal add constraint empresa_configuracao_fiscal_emissao_real_habilitada_check CHECK ((emissao_real_habilitada = false));

alter table public.empresa_configuracao_fiscal add constraint empresa_configuracao_fiscal_empresa_id_key UNIQUE (empresa_id);

alter table public.empresa_configuracao_fiscal add constraint empresa_configuracao_fiscal_modo_emissao_check CHECK ((modo_emissao = ANY (ARRAY['manual'::text, 'assistida'::text])));

alter table public.empresa_configuracao_fiscal add constraint empresa_configuracao_fiscal_municipio_codigo_ibge_check CHECK (((municipio_codigo_ibge IS NULL) OR (municipio_codigo_ibge ~ '^[0-9]{7}$'::text)));

alter table public.empresa_configuracao_fiscal add constraint empresa_configuracao_fiscal_pkey PRIMARY KEY (id);

alter table public.empresa_fiscal_ern add constraint empresa_fiscal_ern_pkey PRIMARY KEY (empresa_id);

alter table public.empresa_fiscal_ern add constraint ern_fiscal_bairro_limite CHECK ((length(bairro) <= 120));

alter table public.empresa_fiscal_ern add constraint ern_fiscal_cep_formato CHECK (((cep = ''::text) OR (cep ~ '^[0-9]{8}$'::text)));

alter table public.empresa_fiscal_ern add constraint ern_fiscal_cnpj_formato CHECK (((cnpj = ''::text) OR (cnpj ~ '^[0-9]{14}$'::text)));

alter table public.empresa_fiscal_ern add constraint ern_fiscal_complemento_limite CHECK ((length(complemento) <= 120));

alter table public.empresa_fiscal_ern add constraint ern_fiscal_email_limite CHECK ((length(email_fiscal) <= 180));

alter table public.empresa_fiscal_ern add constraint ern_fiscal_ibge_formato CHECK (((codigo_municipio_ibge = ''::text) OR (codigo_municipio_ibge ~ '^[0-9]{7}$'::text)));

alter table public.empresa_fiscal_ern add constraint ern_fiscal_inscricao_limite CHECK ((length(inscricao_municipal) <= 40));

alter table public.empresa_fiscal_ern add constraint ern_fiscal_logradouro_limite CHECK ((length(logradouro) <= 180));

alter table public.empresa_fiscal_ern add constraint ern_fiscal_municipio_limite CHECK ((length(municipio) <= 120));

alter table public.empresa_fiscal_ern add constraint ern_fiscal_numero_limite CHECK ((length(numero) <= 25));

alter table public.empresa_fiscal_ern add constraint ern_fiscal_razao_limite CHECK ((length(razao_social) <= 180));

alter table public.empresa_fiscal_ern add constraint ern_fiscal_telefone_limite CHECK ((length(telefone_fiscal) <= 30));

alter table public.empresa_fiscal_ern add constraint ern_fiscal_uf_formato CHECK (((uf = ''::text) OR (uf ~ '^[A-Z]{2}$'::text)));

alter table public.ern_feedback_limites_v1 add constraint ern_feedback_limites_v1_identificador_check CHECK ((identificador ~ '^[0-9a-f]{64}$'::text));

alter table public.ern_feedback_limites_v1 add constraint ern_feedback_limites_v1_pkey PRIMARY KEY (identificador, janela);

alter table public.ern_feedback_limites_v1 add constraint ern_feedback_limites_v1_quantidade_check CHECK (((quantidade >= 1) AND (quantidade <= 5)));

alter table public.ern_feedbacks_v1 add constraint ern_feedbacks_v1_caminho_check CHECK ((((char_length(caminho) >= 1) AND (char_length(caminho) <= 256)) AND ("left"(caminho, 1) = '/'::text) AND (POSITION(('?'::text) IN (caminho)) = 0) AND (POSITION(('#'::text) IN (caminho)) = 0)));

alter table public.ern_feedbacks_v1 add constraint ern_feedbacks_v1_categoria_check CHECK ((categoria = ANY (ARRAY['problema'::text, 'sugestao'::text, 'experiencia'::text])));

alter table public.ern_feedbacks_v1 add constraint ern_feedbacks_v1_contato_email_check CHECK (((contato_email IS NULL) OR ((char_length(btrim(contato_email)) >= 3) AND (char_length(btrim(contato_email)) <= 254))));

alter table public.ern_feedbacks_v1 add constraint ern_feedbacks_v1_estado_check CHECK ((estado = ANY (ARRAY['novo'::text, 'em_analise'::text, 'resolvido'::text, 'arquivado'::text])));

alter table public.ern_feedbacks_v1 add constraint ern_feedbacks_v1_mensagem_check CHECK (((char_length(btrim(mensagem)) >= 10) AND (char_length(btrim(mensagem)) <= 3000)));

alter table public.ern_feedbacks_v1 add constraint ern_feedbacks_v1_origem_check CHECK ((origem = ANY (ARRAY['portal'::text, 'operadora'::text])));

alter table public.ern_feedbacks_v1 add constraint ern_feedbacks_v1_pkey PRIMARY KEY (id);

alter table public.ern_operacoes_assinatura_v1 add constraint ern_checkout_campos_obrigatorios_v1 CHECK (((tipo <> 'checkout'::text) OR ((valor IS NOT NULL) AND (valor > (0)::numeric) AND (ciclo IS NOT NULL))));

alter table public.ern_operacoes_assinatura_v1 add constraint ern_operacoes_assinatura_v1_ciclo_check CHECK ((ciclo = ANY (ARRAY['mensal'::text, 'trimestral'::text, 'anual'::text])));

alter table public.ern_operacoes_assinatura_v1 add constraint ern_operacoes_assinatura_v1_estado_check CHECK ((estado = ANY (ARRAY['reservado'::text, 'em_envio'::text, 'aguardando_pagamento'::text, 'reconciliar'::text, 'concluido'::text, 'cancelado'::text, 'falhou_confirmado'::text])));

alter table public.ern_operacoes_assinatura_v1 add constraint ern_operacoes_assinatura_v1_moeda_check CHECK ((moeda = 'BRL'::text));

alter table public.ern_operacoes_assinatura_v1 add constraint ern_operacoes_assinatura_v1_pkey PRIMARY KEY (id);

alter table public.ern_operacoes_assinatura_v1 add constraint ern_operacoes_assinatura_v1_provedor_check CHECK ((provedor = 'asaas'::text));

alter table public.ern_operacoes_assinatura_v1 add constraint ern_operacoes_assinatura_v1_tipo_check CHECK ((tipo = ANY (ARRAY['checkout'::text, 'cancelamento'::text])));

alter table public.ern_operacoes_assinatura_v1 add constraint ern_operacoes_assinatura_v1_valor_check CHECK ((valor > (0)::numeric));

alter table public.ern_revisoes_fiscais add constraint ern_revisoes_fiscais_estado_check CHECK ((estado = ANY (ARRAY['em_preparacao'::text, 'com_pendencias'::text, 'revisado_internamente'::text])));

alter table public.ern_revisoes_fiscais add constraint ern_revisoes_fiscais_observacoes_check CHECK ((char_length(observacoes) <= 1200));

alter table public.ern_revisoes_fiscais add constraint ern_revisoes_fiscais_pkey PRIMARY KEY (id);

alter table public.ern_revisoes_fiscais add constraint ern_revisoes_fiscais_unica UNIQUE (empresa_id, reserva_id);

alter table public.financeiro add constraint financeiro_pkey PRIMARY KEY (id);

alter table public.financeiro add constraint financeiro_tipo_check CHECK ((tipo = ANY (ARRAY['receita'::text, 'despesa'::text])));

alter table public.guias add constraint guias_pkey PRIMARY KEY (id);

alter table public.hospedagens add constraint hospedagens_pkey PRIMARY KEY (id);

alter table public.interacoes_publicacoes add constraint interacoes_publicacoes_pkey PRIMARY KEY (usuario_id, publicacao_id, tipo);

alter table public.interacoes_publicacoes add constraint interacoes_publicacoes_tipo_check CHECK ((tipo = ANY (ARRAY['curtida'::text, 'salvo'::text, 'quero_ir'::text])));

alter table public.nfse_eventos add constraint nfse_eventos_ambiente_check CHECK ((ambiente = 'simulacao'::text));

alter table public.nfse_eventos add constraint nfse_eventos_pkey PRIMARY KEY (id);

alter table public.nfse_eventos add constraint nfse_eventos_tipo_evento_check CHECK ((length(btrim(tipo_evento)) > 0));

alter table public.nfse_solicitacoes add constraint nfse_solicitacoes_ambiente_check CHECK ((ambiente = 'simulacao'::text));

alter table public.nfse_solicitacoes add constraint nfse_solicitacoes_chave_idempotencia_check CHECK ((length(btrim(chave_idempotencia)) > 0));

alter table public.nfse_solicitacoes add constraint nfse_solicitacoes_chave_unica UNIQUE (empresa_id, chave_idempotencia);

alter table public.nfse_solicitacoes add constraint nfse_solicitacoes_id_empresa_unico UNIQUE (id, empresa_id);

alter table public.nfse_solicitacoes add constraint nfse_solicitacoes_pkey PRIMARY KEY (id);

alter table public.nfse_solicitacoes add constraint nfse_solicitacoes_referencia_externa_check CHECK ((referencia_externa IS NULL));

alter table public.nfse_solicitacoes add constraint nfse_solicitacoes_status_check CHECK ((status = ANY (ARRAY['rascunho'::text, 'validacao_pendente'::text, 'simulada'::text, 'erro_simulacao'::text])));

alter table public.nfse_solicitacoes add constraint nfse_solicitacoes_valor_servico_check CHECK (((valor_servico IS NULL) OR (valor_servico >= (0)::numeric)));

alter table public.parceiros add constraint parceiros_pkey PRIMARY KEY (id);

alter table public.passeios add constraint passeios_pkey PRIMARY KEY (id);

alter table public.perfis add constraint perfis_cpf_key UNIQUE (cpf);

alter table public.perfis add constraint perfis_pkey PRIMARY KEY (id);

alter table public.perfis add constraint perfis_role_check CHECK ((role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'guia'::text, 'piloteiro'::text, 'admin_plataforma'::text])));

alter table public.perfis_profissionais add constraint perfis_profissionais_cadastur_check CHECK ((char_length(cadastur) <= 100));

alter table public.perfis_profissionais add constraint perfis_profissionais_campos_tipo_check CHECK ((((tipo = 'guia'::text) AND (categoria IS NULL)) OR ((tipo = 'fornecedor'::text) AND (idiomas IS NULL) AND (cadastur IS NULL))));

alter table public.perfis_profissionais add constraint perfis_profissionais_categoria_check CHECK ((char_length(categoria) <= 120));

alter table public.perfis_profissionais add constraint perfis_profissionais_cidade_check CHECK ((char_length(cidade) <= 120));

alter table public.perfis_profissionais add constraint perfis_profissionais_descricao_check CHECK ((char_length(descricao) <= 2000));

alter table public.perfis_profissionais add constraint perfis_profissionais_idiomas_check CHECK ((char_length(idiomas) <= 300));

alter table public.perfis_profissionais add constraint perfis_profissionais_nome_check CHECK (((char_length(btrim(nome)) >= 2) AND (char_length(btrim(nome)) <= 120)));

alter table public.perfis_profissionais add constraint perfis_profissionais_pkey PRIMARY KEY (usuario_id, tipo);

alter table public.perfis_profissionais add constraint perfis_profissionais_telefone_check CHECK ((char_length(telefone) <= 30));

alter table public.perfis_profissionais add constraint perfis_profissionais_tipo_check CHECK ((tipo = ANY (ARRAY['guia'::text, 'fornecedor'::text])));

alter table public.perfis_publicos add constraint perfis_publicos_categoria_check CHECK ((categoria = ANY (ARRAY['operadora'::text, 'guia'::text, 'fornecedor'::text, 'ern_editorial'::text, 'comunidade'::text, 'instituicao'::text, 'artesao'::text, 'evento'::text])));

alter table public.perfis_publicos add constraint perfis_publicos_origem_consistente_check CHECK ((((origem_tipo = 'empresa'::text) AND (categoria = 'operadora'::text) AND (empresa_id IS NOT NULL) AND (usuario_id IS NULL)) OR ((origem_tipo = 'profissional'::text) AND (categoria = ANY (ARRAY['guia'::text, 'fornecedor'::text])) AND (usuario_id IS NOT NULL) AND (empresa_id IS NULL) AND (parceiro_id IS NULL) AND (empresa_gestora_id IS NULL)) OR (origem_tipo = ANY (ARRAY['editorial'::text, 'manual'::text]))));

alter table public.perfis_publicos add constraint perfis_publicos_origem_tipo_check CHECK ((origem_tipo = ANY (ARRAY['empresa'::text, 'profissional'::text, 'editorial'::text, 'manual'::text])));

alter table public.perfis_publicos add constraint perfis_publicos_pkey PRIMARY KEY (id);

alter table public.perfis_publicos add constraint perfis_publicos_slug_key UNIQUE (slug);

alter table public.planos add constraint planos_codigo_key UNIQUE (codigo);

alter table public.planos add constraint planos_pkey PRIMARY KEY (id);

alter table public.posts add constraint posts_pkey PRIMARY KEY (id);

alter table public.precos_planos add constraint precos_planos_ciclo_check CHECK ((ciclo_cobranca = ANY (ARRAY['mensal'::text, 'trimestral'::text, 'anual'::text])));

alter table public.precos_planos add constraint precos_planos_pkey PRIMARY KEY (id);

alter table public.precos_planos add constraint precos_planos_unico UNIQUE (plano_id, ciclo_cobranca);

alter table public.precos_planos add constraint precos_planos_valor_check CHECK (((valor IS NULL) OR (valor >= (0)::numeric)));

alter table public.publicacao_midias add constraint publicacao_midias_alt_check CHECK (((alt_text IS NULL) OR (char_length(alt_text) <= 500)));

alter table public.publicacao_midias add constraint publicacao_midias_credito_check CHECK (((credito IS NULL) OR (char_length(credito) <= 300)));

alter table public.publicacao_midias add constraint publicacao_midias_imagem_alt_obrigatorio_ern CHECK (((tipo <> 'imagem'::text) OR ((alt_text IS NOT NULL) AND (alt_text ~ '[^[:space:]]'::text))));

alter table public.publicacao_midias add constraint publicacao_midias_pkey PRIMARY KEY (id);

alter table public.publicacao_midias add constraint publicacao_midias_tipo_check CHECK ((tipo = ANY (ARRAY['imagem'::text, 'video'::text])));

alter table public.publicacao_midias add constraint publicacao_midias_url_check CHECK (((char_length(btrim(url)) >= 3) AND (char_length(btrim(url)) <= 2000)));

alter table public.publicacao_traducoes add constraint publicacao_traducoes_conteudo_check CHECK (((conteudo IS NULL) OR (char_length(conteudo) <= 50000)));

alter table public.publicacao_traducoes add constraint publicacao_traducoes_idioma_check CHECK ((idioma = ANY (ARRAY['pt'::text, 'en'::text, 'es'::text])));

alter table public.publicacao_traducoes add constraint publicacao_traducoes_pkey PRIMARY KEY (publicacao_id, idioma);

alter table public.publicacao_traducoes add constraint publicacao_traducoes_resumo_check CHECK (((resumo IS NULL) OR (char_length(resumo) <= 600)));

alter table public.publicacao_traducoes add constraint publicacao_traducoes_titulo_check CHECK (((char_length(btrim(titulo)) >= 3) AND (char_length(btrim(titulo)) <= 220)));

alter table public.publicacoes add constraint publicacoes_conteudo_check CHECK (((conteudo IS NULL) OR (char_length(conteudo) <= 50000)));

alter table public.publicacoes add constraint publicacoes_datas_evento_check CHECK (((data_evento_inicio IS NULL) OR (data_evento_fim IS NULL) OR (data_evento_fim >= data_evento_inicio)));

alter table public.publicacoes add constraint publicacoes_destino_slug_formato_ern CHECK (((destino_slug IS NULL) OR (((char_length(destino_slug) >= 1) AND (char_length(destino_slug) <= 100)) AND (destino_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))));

alter table public.publicacoes add constraint publicacoes_idioma_check CHECK ((idioma_original = ANY (ARRAY['pt'::text, 'en'::text, 'es'::text])));

alter table public.publicacoes add constraint publicacoes_pkey PRIMARY KEY (id);

alter table public.publicacoes add constraint publicacoes_resumo_check CHECK (((resumo IS NULL) OR (char_length(resumo) <= 600)));

alter table public.publicacoes add constraint publicacoes_slug_check CHECK (((char_length(btrim(slug)) >= 3) AND (char_length(btrim(slug)) <= 180)));

alter table public.publicacoes add constraint publicacoes_slug_key UNIQUE (slug);

alter table public.publicacoes add constraint publicacoes_status_check CHECK ((status = ANY (ARRAY['rascunho'::text, 'em_revisao'::text, 'publicado'::text, 'arquivado'::text, 'rejeitado'::text])));

alter table public.publicacoes add constraint publicacoes_tipo_check CHECK ((tipo = ANY (ARRAY['conteudo'::text, 'oferta'::text, 'roteiro'::text, 'evento'::text, 'aviso'::text, 'dica'::text])));

alter table public.publicacoes add constraint publicacoes_titulo_check CHECK (((char_length(btrim(titulo)) >= 3) AND (char_length(btrim(titulo)) <= 220)));

alter table public.relatorios add constraint relatorios_pkey PRIMARY KEY (id);

alter table public.reservas add constraint ern_reservas_fim_data_check CHECK (((data_fim_prevista IS NULL) OR (data_fim_prevista >= data_reserva)));

alter table public.reservas add constraint ern_reservas_fim_horario_check CHECK (((horario_fim_previsto IS NULL) OR (data_fim_prevista IS NOT NULL)));

alter table public.reservas add constraint ern_reservas_fim_ordem_check CHECK (((data_fim_prevista IS NULL) OR (data_fim_prevista > data_reserva) OR (horario IS NULL) OR (horario_fim_previsto IS NULL) OR (horario_fim_previsto >= horario)));

alter table public.reservas add constraint reservas_id_empresa_fiscal_key UNIQUE (id, empresa_id);

alter table public.reservas add constraint reservas_pkey PRIMARY KEY (id);

alter table public.reservas_historico_ciclo add constraint reservas_historico_ciclo_evento_check CHECK ((evento = ANY (ARRAY['criacao'::text, 'alteracao'::text])));

alter table public.reservas_historico_ciclo add constraint reservas_historico_ciclo_pkey PRIMARY KEY (id);

alter table public.seguidores_perfis add constraint seguidores_perfis_pkey PRIMARY KEY (seguidor_usuario_id, perfil_seguido_id);

alter table public.territorios add constraint territorios_descricao_check CHECK (((descricao IS NULL) OR (char_length(descricao) <= 3000)));

alter table public.territorios add constraint territorios_nome_check CHECK (((char_length(btrim(nome)) >= 2) AND (char_length(btrim(nome)) <= 160)));

alter table public.territorios add constraint territorios_pkey PRIMARY KEY (id);

alter table public.territorios add constraint territorios_slug_check CHECK (((char_length(btrim(slug)) >= 2) AND (char_length(btrim(slug)) <= 120)));

alter table public.territorios add constraint territorios_slug_key UNIQUE (slug);

alter table public.territorios add constraint territorios_tipo_check CHECK ((tipo = ANY (ARRAY['regiao'::text, 'municipio'::text, 'comunidade'::text, 'localidade'::text, 'atracao'::text])));

alter table public.transacoes add constraint transacoes_pkey PRIMARY KEY (id);

alter table public.transacoes add constraint transacoes_tipo_check CHECK ((tipo = ANY (ARRAY['receita'::text, 'despesa'::text])));

alter table public.visualizacoes_perfis add constraint visualizacoes_perfis_origem_check CHECK (((origem IS NULL) OR (origem = ANY (ARRAY['feed'::text, 'busca'::text, 'explorar'::text, 'colecao'::text, 'compartilhamento'::text, 'direto'::text, 'outro'::text]))));

alter table public.visualizacoes_perfis add constraint visualizacoes_perfis_pkey PRIMARY KEY (id);

alter table public.visualizacoes_perfis add constraint visualizacoes_perfis_sessao_check CHECK (((sessao_id IS NULL) OR (char_length(sessao_id) <= 180)));

alter table public.visualizacoes_publicacoes add constraint visualizacoes_publicacoes_origem_check CHECK (((origem IS NULL) OR (origem = ANY (ARRAY['feed'::text, 'perfil'::text, 'busca'::text, 'explorar'::text, 'colecao'::text, 'compartilhamento'::text, 'direto'::text, 'outro'::text]))));

alter table public.visualizacoes_publicacoes add constraint visualizacoes_publicacoes_pkey PRIMARY KEY (id);

alter table public.visualizacoes_publicacoes add constraint visualizacoes_publicacoes_sessao_check CHECK (((sessao_id IS NULL) OR (char_length(sessao_id) <= 180)));

alter table public.vouchers add constraint vouchers_codigo_key UNIQUE (codigo);

alter table public.vouchers add constraint vouchers_pkey PRIMARY KEY (id);

alter table public.webhook_eventos add constraint webhook_eventos_pkey PRIMARY KEY (id);

alter table public.webhook_eventos add constraint webhook_eventos_provedor_evento_unique UNIQUE (provedor, evento_id);

alter table public.webhook_eventos add constraint webhook_eventos_status_check CHECK ((status = ANY (ARRAY['processando'::text, 'processado'::text, 'falhou'::text])));

alter table public.acessos_profissionais add constraint acessos_profissionais_usuario_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.administradores_editoriais_ern add constraint administradores_editoriais_ern_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.assinaturas_empresas add constraint assinaturas_empresas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON DELETE CASCADE;

alter table public.assinaturas_empresas add constraint assinaturas_empresas_plano_id_fkey FOREIGN KEY (plano_id) REFERENCES planos(id);

alter table public.assinaturas_empresas add constraint assinaturas_empresas_plano_pendente_id_fkey FOREIGN KEY (plano_pendente_id) REFERENCES planos(id);

alter table public.assinaturas_empresas add constraint assinaturas_empresas_plano_pos_cancelamento_id_fkey FOREIGN KEY (plano_pos_cancelamento_id) REFERENCES planos(id);

alter table public.clientes add constraint clientes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON DELETE CASCADE;

alter table public.cliques_publicos add constraint cliques_publicos_perfil_id_fkey FOREIGN KEY (perfil_id) REFERENCES perfis_publicos(id) ON DELETE CASCADE;

alter table public.cliques_publicos add constraint cliques_publicos_publicacao_id_fkey FOREIGN KEY (publicacao_id) REFERENCES publicacoes(id) ON DELETE CASCADE;

alter table public.cliques_publicos add constraint cliques_publicos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.cobrancas_assinaturas add constraint cobrancas_assinaturas_assinatura_id_fkey FOREIGN KEY (assinatura_id) REFERENCES assinaturas_empresas(id) ON DELETE SET NULL;

alter table public.cobrancas_assinaturas add constraint cobrancas_assinaturas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON DELETE CASCADE;

alter table public.cobrancas_assinaturas add constraint cobrancas_assinaturas_plano_id_fkey FOREIGN KEY (plano_id) REFERENCES planos(id);

alter table public.configuracoes add constraint configuracoes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON DELETE RESTRICT;

alter table public.demanda_itens add constraint demanda_itens_demanda_id_fkey FOREIGN KEY (demanda_id) REFERENCES demandas(id) ON DELETE CASCADE;

alter table public.demandas add constraint demandas_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.demandas add constraint demandas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON DELETE CASCADE;

alter table public.embarcacoes add constraint embarcacoes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON UPDATE CASCADE ON DELETE RESTRICT;

alter table public.empresa_capacidades add constraint empresa_capacidades_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON DELETE CASCADE;

alter table public.empresa_configuracao_fiscal add constraint empresa_configuracao_fiscal_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON DELETE RESTRICT;

alter table public.empresa_fiscal_ern add constraint empresa_fiscal_ern_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON DELETE CASCADE;

alter table public.ern_feedbacks_v1 add constraint ern_feedbacks_v1_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.ern_operacoes_assinatura_v1 add constraint ern_operacoes_assinatura_v1_assinatura_id_fkey FOREIGN KEY (assinatura_id) REFERENCES assinaturas_empresas(id) ON DELETE RESTRICT;

alter table public.ern_operacoes_assinatura_v1 add constraint ern_operacoes_assinatura_v1_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON DELETE RESTRICT;

alter table public.ern_operacoes_assinatura_v1 add constraint ern_operacoes_assinatura_v1_plano_destino_id_fkey FOREIGN KEY (plano_destino_id) REFERENCES planos(id) ON DELETE RESTRICT;

alter table public.ern_operacoes_assinatura_v1 add constraint ern_operacoes_assinatura_v1_plano_id_fkey FOREIGN KEY (plano_id) REFERENCES planos(id) ON DELETE RESTRICT;

alter table public.ern_revisoes_fiscais add constraint ern_revisoes_fiscais_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

alter table public.ern_revisoes_fiscais add constraint ern_revisoes_fiscais_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresa(id);

alter table public.ern_revisoes_fiscais add constraint ern_revisoes_fiscais_reserva_id_fkey FOREIGN KEY (reserva_id) REFERENCES reservas(id);

alter table public.ern_revisoes_fiscais add constraint ern_revisoes_fiscais_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);

alter table public.financeiro add constraint financeiro_reserva_id_fkey FOREIGN KEY (reserva_id) REFERENCES reservas(id) ON DELETE SET NULL;

alter table public.financeiro add constraint financeiro_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

alter table public.guias add constraint guias_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON DELETE RESTRICT;

alter table public.guias add constraint guias_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.hospedagens add constraint hospedagens_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON UPDATE CASCADE ON DELETE RESTRICT;

alter table public.interacoes_publicacoes add constraint interacoes_publicacoes_publicacao_id_fkey FOREIGN KEY (publicacao_id) REFERENCES publicacoes(id) ON DELETE CASCADE;

alter table public.interacoes_publicacoes add constraint interacoes_publicacoes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.nfse_eventos add constraint nfse_evento_solicitacao_empresa_fk FOREIGN KEY (solicitacao_id, empresa_id) REFERENCES nfse_solicitacoes(id, empresa_id) ON DELETE RESTRICT;

alter table public.nfse_solicitacoes add constraint nfse_cliente_empresa_fkey FOREIGN KEY (cliente_id, empresa_id) REFERENCES clientes(id, empresa_id) ON UPDATE RESTRICT ON DELETE RESTRICT;

alter table public.nfse_solicitacoes add constraint nfse_reserva_empresa_fkey FOREIGN KEY (reserva_id, empresa_id) REFERENCES reservas(id, empresa_id) ON UPDATE RESTRICT ON DELETE RESTRICT;

alter table public.nfse_solicitacoes add constraint nfse_solicitacoes_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT;

alter table public.nfse_solicitacoes add constraint nfse_solicitacoes_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.nfse_solicitacoes add constraint nfse_solicitacoes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON DELETE RESTRICT;

alter table public.nfse_solicitacoes add constraint nfse_solicitacoes_reserva_id_fkey FOREIGN KEY (reserva_id) REFERENCES reservas(id) ON DELETE RESTRICT;

alter table public.parceiros add constraint parceiros_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON DELETE CASCADE;

alter table public.passeios add constraint passeios_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON DELETE CASCADE;

alter table public.perfis add constraint perfis_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON UPDATE CASCADE ON DELETE SET NULL;

alter table public.perfis add constraint perfis_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.perfis_profissionais add constraint perfis_profissionais_acesso_fkey FOREIGN KEY (usuario_id, tipo) REFERENCES acessos_profissionais(usuario_id, tipo) ON DELETE CASCADE;

alter table public.perfis_publicos add constraint perfis_publicos_empresa_gestora_id_fkey FOREIGN KEY (empresa_gestora_id) REFERENCES empresa(id) ON DELETE CASCADE;

alter table public.perfis_publicos add constraint perfis_publicos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON DELETE SET NULL;

alter table public.perfis_publicos add constraint perfis_publicos_parceiro_id_fkey FOREIGN KEY (parceiro_id) REFERENCES parceiros(id) ON DELETE SET NULL;

alter table public.perfis_publicos add constraint perfis_publicos_territorio_id_fkey FOREIGN KEY (territorio_id) REFERENCES territorios(id) ON DELETE SET NULL;

alter table public.perfis_publicos add constraint perfis_publicos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.posts add constraint posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.precos_planos add constraint precos_planos_plano_id_fkey FOREIGN KEY (plano_id) REFERENCES planos(id) ON DELETE CASCADE;

alter table public.publicacao_midias add constraint publicacao_midias_publicacao_id_fkey FOREIGN KEY (publicacao_id) REFERENCES publicacoes(id) ON DELETE CASCADE;

alter table public.publicacao_traducoes add constraint publicacao_traducoes_publicacao_id_fkey FOREIGN KEY (publicacao_id) REFERENCES publicacoes(id) ON DELETE CASCADE;

alter table public.publicacoes add constraint publicacoes_autor_perfil_id_fkey FOREIGN KEY (autor_perfil_id) REFERENCES perfis_publicos(id) ON DELETE CASCADE;

alter table public.publicacoes add constraint publicacoes_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES categorias_publicacoes(id) ON DELETE SET NULL;

alter table public.publicacoes add constraint publicacoes_territorio_id_fkey FOREIGN KEY (territorio_id) REFERENCES territorios(id) ON DELETE SET NULL;

alter table public.reservas add constraint reservas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;

alter table public.reservas add constraint reservas_embarcacao_id_fkey FOREIGN KEY (embarcacao_id) REFERENCES embarcacoes(id) ON DELETE SET NULL;

alter table public.reservas add constraint reservas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON UPDATE CASCADE ON DELETE RESTRICT;

alter table public.reservas add constraint reservas_parceiro_id_fkey FOREIGN KEY (parceiro_id) REFERENCES parceiros(id) ON DELETE SET NULL;

alter table public.reservas add constraint reservas_passeio_id_fkey FOREIGN KEY (passeio_id) REFERENCES passeios(id) ON DELETE SET NULL;

alter table public.seguidores_perfis add constraint seguidores_perfis_perfil_seguido_id_fkey FOREIGN KEY (perfil_seguido_id) REFERENCES perfis_publicos(id) ON DELETE CASCADE;

alter table public.seguidores_perfis add constraint seguidores_perfis_seguidor_usuario_id_fkey FOREIGN KEY (seguidor_usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.territorios add constraint territorios_pai_id_fkey FOREIGN KEY (pai_id) REFERENCES territorios(id) ON DELETE SET NULL;

alter table public.transacoes add constraint transacoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.visualizacoes_perfis add constraint visualizacoes_perfis_perfil_id_fkey FOREIGN KEY (perfil_id) REFERENCES perfis_publicos(id) ON DELETE CASCADE;

alter table public.visualizacoes_perfis add constraint visualizacoes_perfis_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.visualizacoes_publicacoes add constraint visualizacoes_publicacoes_publicacao_id_fkey FOREIGN KEY (publicacao_id) REFERENCES publicacoes(id) ON DELETE CASCADE;

alter table public.visualizacoes_publicacoes add constraint visualizacoes_publicacoes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.vouchers add constraint vouchers_reserva_id_fkey FOREIGN KEY (reserva_id) REFERENCES reservas(id) ON DELETE RESTRICT;


-- ---------------------------------------------------------------------
-- 06. Índices (exceto os criados pelas restrições) [65]
-- ---------------------------------------------------------------------
CREATE INDEX cliques_publicos_perfil_idx ON public.cliques_publicos USING btree (perfil_id, created_at DESC);

CREATE INDEX cliques_publicos_publicacao_idx ON public.cliques_publicos USING btree (publicacao_id, created_at DESC);

CREATE INDEX demanda_itens_demanda_ordem_idx ON public.demanda_itens USING btree (demanda_id, ordem, id);

CREATE INDEX demandas_empresa_created_at_idx ON public.demandas USING btree (empresa_id, created_at DESC);

CREATE INDEX demandas_empresa_status_idx ON public.demandas USING btree (empresa_id, status);

CREATE INDEX ern_feedback_limites_v1_janela_idx ON public.ern_feedback_limites_v1 USING btree (janela);

CREATE INDEX ern_feedbacks_v1_estado_data_idx ON public.ern_feedbacks_v1 USING btree (estado, criado_em DESC);

CREATE INDEX ern_financeiro_reserva_id_idx ON public.financeiro USING btree (reserva_id) WHERE (reserva_id IS NOT NULL);

CREATE UNIQUE INDEX ern_operacao_assinatura_aberta_v1 ON public.ern_operacoes_assinatura_v1 USING btree (empresa_id) WHERE (estado = ANY (ARRAY['reservado'::text, 'em_envio'::text, 'aguardando_pagamento'::text, 'reconciliar'::text]));

CREATE INDEX ern_operacao_assinatura_historico_v1 ON public.ern_operacoes_assinatura_v1 USING btree (assinatura_id, criado_em DESC);

CREATE INDEX ern_reservas_empresa_data_id_idx ON public.reservas USING btree (empresa_id, data_reserva, id);

CREATE INDEX ern_reservas_historico_empresa_reserva_data_idx ON public.reservas_historico_ciclo USING btree (empresa_id, reserva_id, ocorrido_em DESC, id);

CREATE INDEX ern_revisoes_fiscais_empresa_atualizacao ON public.ern_revisoes_fiscais USING btree (empresa_id, updated_at DESC);

CREATE INDEX ern_vouchers_reserva_id_idx ON public.vouchers USING btree (reserva_id) WHERE (reserva_id IS NOT NULL);

CREATE INDEX guias_empresa_id_idx ON public.guias USING btree (empresa_id);

CREATE INDEX idx_assinaturas_cancelamento_efetivo ON public.assinaturas_empresas USING btree (cancelamento_efetivo_em) WHERE (cancelamento_efetivo_em IS NOT NULL);

CREATE INDEX idx_assinaturas_empresas_provedor_assinatura ON public.assinaturas_empresas USING btree (provedor_pagamento, provedor_assinatura_id);

CREATE INDEX idx_cobrancas_assinaturas_assinatura ON public.cobrancas_assinaturas USING btree (assinatura_id);

CREATE INDEX idx_cobrancas_assinaturas_empresa ON public.cobrancas_assinaturas USING btree (empresa_id);

CREATE INDEX idx_cobrancas_assinaturas_status ON public.cobrancas_assinaturas USING btree (status);

CREATE INDEX idx_embarcacoes_empresa_id ON public.embarcacoes USING btree (empresa_id);

CREATE INDEX idx_hospedagens_empresa_id ON public.hospedagens USING btree (empresa_id);

CREATE INDEX idx_parceiros_empresa_id ON public.parceiros USING btree (empresa_id);

CREATE INDEX idx_parceiros_empresa_status ON public.parceiros USING btree (empresa_id, status);

CREATE INDEX idx_parceiros_empresa_tipo ON public.parceiros USING btree (empresa_id, tipo);

CREATE INDEX idx_perfis_empresa_id ON public.perfis USING btree (empresa_id);

CREATE INDEX idx_perfis_publicos_categoria ON public.perfis_publicos USING btree (categoria);

CREATE INDEX idx_perfis_publicos_cidade ON public.perfis_publicos USING btree (cidade);

CREATE INDEX idx_perfis_publicos_destaque ON public.perfis_publicos USING btree (destaque);

CREATE INDEX idx_perfis_publicos_empresa_gestora ON public.perfis_publicos USING btree (empresa_gestora_id);

CREATE INDEX idx_perfis_publicos_publicado ON public.perfis_publicos USING btree (publicado);

CREATE INDEX idx_precos_planos_plano ON public.precos_planos USING btree (plano_id);

CREATE INDEX idx_reservas_empresa_id ON public.reservas USING btree (empresa_id);

CREATE INDEX idx_webhook_eventos_evento ON public.webhook_eventos USING btree (evento_id);

CREATE INDEX idx_webhook_eventos_status ON public.webhook_eventos USING btree (status);

CREATE INDEX interacoes_publicacao_idx ON public.interacoes_publicacoes USING btree (publicacao_id, tipo);

CREATE INDEX interacoes_usuario_idx ON public.interacoes_publicacoes USING btree (usuario_id, tipo);

CREATE UNIQUE INDEX nfse_eventos_deduplicacao_idx ON public.nfse_eventos USING btree (empresa_id, identificador_evento) WHERE (identificador_evento IS NOT NULL);

CREATE INDEX nfse_eventos_empresa_data_idx ON public.nfse_eventos USING btree (empresa_id, criado_em DESC);

CREATE INDEX nfse_eventos_solicitacao_idx ON public.nfse_eventos USING btree (solicitacao_id);

CREATE INDEX nfse_solicitacoes_empresa_status_idx ON public.nfse_solicitacoes USING btree (empresa_id, status);

CREATE INDEX nfse_solicitacoes_reserva_idx ON public.nfse_solicitacoes USING btree (reserva_id);

CREATE INDEX perfis_publicos_categoria_idx ON public.perfis_publicos USING btree (categoria);

CREATE UNIQUE INDEX perfis_publicos_operadora_empresa_unica_ern ON public.perfis_publicos USING btree (empresa_id) WHERE ((origem_tipo = 'empresa'::text) AND (categoria = 'operadora'::text));

CREATE UNIQUE INDEX perfis_publicos_operadora_empresa_unique ON public.perfis_publicos USING btree (empresa_id) WHERE ((empresa_id IS NOT NULL) AND (categoria = 'operadora'::text));

CREATE UNIQUE INDEX perfis_publicos_profissional_usuario_unique ON public.perfis_publicos USING btree (usuario_id) WHERE ((usuario_id IS NOT NULL) AND (categoria = ANY (ARRAY['guia'::text, 'fornecedor'::text])));

CREATE INDEX perfis_publicos_publicado_idx ON public.perfis_publicos USING btree (publicado);

CREATE INDEX perfis_publicos_territorio_idx ON public.perfis_publicos USING btree (territorio_id);

CREATE INDEX perfis_publicos_usuario_idx ON public.perfis_publicos USING btree (usuario_id);

CREATE INDEX publicacao_midias_publicacao_idx ON public.publicacao_midias USING btree (publicacao_id, ordem);

CREATE INDEX publicacao_midias_video_publicacao_ern ON public.publicacao_midias USING btree (publicacao_id) WHERE ((tipo = 'video'::text) AND (consentimento_confirmado = true));

CREATE INDEX publicacoes_autor_idx ON public.publicacoes USING btree (autor_perfil_id);

CREATE INDEX publicacoes_categoria_idx ON public.publicacoes USING btree (categoria_id);

CREATE INDEX publicacoes_destino_publicado_ern ON public.publicacoes USING btree (destino_slug, publicado_em DESC, id) WHERE ((status = 'publicado'::text) AND (destino_slug IS NOT NULL));

CREATE INDEX publicacoes_feed_idx ON public.publicacoes USING btree (status, destaque DESC, publicado_em DESC);

CREATE INDEX publicacoes_publicado_em_idx ON public.publicacoes USING btree (publicado_em DESC);

CREATE INDEX publicacoes_status_idx ON public.publicacoes USING btree (status);

CREATE INDEX publicacoes_territorio_idx ON public.publicacoes USING btree (territorio_id);

CREATE INDEX seguidores_perfil_idx ON public.seguidores_perfis USING btree (perfil_seguido_id);

CREATE INDEX seguidores_usuario_idx ON public.seguidores_perfis USING btree (seguidor_usuario_id);

CREATE INDEX territorios_ativo_idx ON public.territorios USING btree (ativo);

CREATE INDEX territorios_pai_idx ON public.territorios USING btree (pai_id);

CREATE INDEX territorios_tipo_idx ON public.territorios USING btree (tipo);

CREATE INDEX visualizacoes_perfis_perfil_idx ON public.visualizacoes_perfis USING btree (perfil_id, created_at DESC);

CREATE INDEX visualizacoes_publicacoes_post_idx ON public.visualizacoes_publicacoes USING btree (publicacao_id, created_at DESC);


-- ---------------------------------------------------------------------
-- 07. Gatilhos [26]
-- ---------------------------------------------------------------------
CREATE TRIGGER validar_modalidade_independente_ern BEFORE INSERT OR UPDATE ON public.acessos_profissionais FOR EACH ROW EXECUTE FUNCTION validar_separacao_acessos_ern();

CREATE TRIGGER trg_definir_empresa_cliente BEFORE INSERT OR UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION definir_empresa_cliente();

CREATE TRIGGER trg_validar_limite_clientes BEFORE INSERT ON public.clientes FOR EACH ROW EXECUTE FUNCTION validar_limite_clientes();

CREATE TRIGGER trg_definir_empresa_embarcacao BEFORE INSERT OR UPDATE ON public.embarcacoes FOR EACH ROW EXECUTE FUNCTION definir_empresa_embarcacao();

CREATE TRIGGER trigger_criar_assinatura_free_empresa AFTER INSERT ON public.empresa FOR EACH ROW EXECUTE FUNCTION criar_assinatura_free_empresa();

CREATE TRIGGER trg_definir_empresa_financeiro BEFORE INSERT OR UPDATE ON public.financeiro FOR EACH ROW EXECUTE FUNCTION definir_empresa_registro();

CREATE TRIGGER zz_ern_validar_reserva_financeiro BEFORE INSERT OR UPDATE ON public.financeiro FOR EACH ROW EXECUTE FUNCTION ern_validar_reserva_financeiro();

CREATE TRIGGER trg_definir_empresa_hospedagem BEFORE INSERT OR UPDATE ON public.hospedagens FOR EACH ROW EXECUTE FUNCTION definir_empresa_hospedagem();

CREATE TRIGGER trg_definir_empresa_parceiro BEFORE INSERT OR UPDATE ON public.parceiros FOR EACH ROW EXECUTE FUNCTION definir_empresa_registro();

CREATE TRIGGER trg_definir_empresa_passeio BEFORE INSERT OR UPDATE ON public.passeios FOR EACH ROW EXECUTE FUNCTION definir_empresa_passeio();

CREATE TRIGGER trg_validar_limite_passeios BEFORE INSERT ON public.passeios FOR EACH ROW EXECUTE FUNCTION validar_limite_passeios();

CREATE TRIGGER trg_validar_limite_usuarios_empresa BEFORE INSERT ON public.perfis FOR EACH ROW EXECUTE FUNCTION validar_limite_usuarios_empresa();

CREATE TRIGGER validar_vinculo_empresarial_ern BEFORE INSERT OR UPDATE ON public.perfis FOR EACH ROW EXECUTE FUNCTION validar_separacao_acessos_ern();

CREATE TRIGGER perfis_profissionais_atualizar_data BEFORE UPDATE ON public.perfis_profissionais FOR EACH ROW EXECUTE FUNCTION atualizar_data_perfil_profissional();

CREATE TRIGGER proteger_perfil_publico_operadora_ern BEFORE INSERT OR UPDATE ON public.perfis_publicos FOR EACH ROW EXECUTE FUNCTION proteger_perfil_publico_operadora_ern();

CREATE TRIGGER proteger_midia_operadora_ern BEFORE INSERT OR UPDATE ON public.publicacao_midias FOR EACH ROW EXECUTE FUNCTION proteger_publicacao_operadora_ern();

CREATE TRIGGER proteger_publicacao_operadora_ern BEFORE INSERT OR UPDATE ON public.publicacoes FOR EACH ROW EXECUTE FUNCTION proteger_publicacao_operadora_ern();

CREATE TRIGGER trg_definir_empresa_relatorio BEFORE INSERT OR UPDATE ON public.relatorios FOR EACH ROW EXECUTE FUNCTION definir_empresa_registro();

CREATE TRIGGER ern_registrar_historico_ciclo_reserva AFTER INSERT OR UPDATE ON public.reservas FOR EACH ROW EXECUTE FUNCTION ern_registrar_historico_ciclo_reserva();

CREATE TRIGGER trg_definir_empresa_reserva BEFORE INSERT OR UPDATE ON public.reservas FOR EACH ROW EXECUTE FUNCTION definir_empresa_reserva();

CREATE TRIGGER trg_ern_proteger_historico_reserva BEFORE DELETE ON public.reservas FOR EACH ROW EXECUTE FUNCTION ern_proteger_historico_reserva();

CREATE TRIGGER trg_validar_limite_reservas_mes BEFORE INSERT ON public.reservas FOR EACH ROW EXECUTE FUNCTION validar_limite_reservas_mes();

CREATE TRIGGER zz_ern_validar_vinculos_reserva BEFORE INSERT OR UPDATE ON public.reservas FOR EACH ROW EXECUTE FUNCTION ern_validar_vinculos_reserva();

CREATE TRIGGER zzz_ern_validar_encerramento_reserva BEFORE INSERT OR UPDATE ON public.reservas FOR EACH ROW EXECUTE FUNCTION ern_validar_encerramento_reserva();

CREATE TRIGGER trg_definir_empresa_voucher BEFORE INSERT OR UPDATE ON public.vouchers FOR EACH ROW EXECUTE FUNCTION definir_empresa_registro();

CREATE TRIGGER zz_ern_preparar_voucher_reserva BEFORE INSERT OR UPDATE ON public.vouchers FOR EACH ROW EXECUTE FUNCTION ern_preparar_voucher_reserva();


-- ---------------------------------------------------------------------
-- 08. Row Level Security [46]
-- ---------------------------------------------------------------------
alter table public.acessos_profissionais enable row level security;

alter table public.administradores_editoriais_ern enable row level security;

alter table public.assinaturas_empresas enable row level security;

alter table public.categorias_publicacoes enable row level security;

alter table public.clientes enable row level security;

alter table public.cliques_publicos enable row level security;

alter table public.cobrancas_assinaturas enable row level security;

alter table public.configuracoes enable row level security;

alter table public.demanda_itens enable row level security;

alter table public.demandas enable row level security;

alter table public.embarcacoes enable row level security;

alter table public.empresa enable row level security;

alter table public.empresa_capacidades enable row level security;

alter table public.empresa_configuracao_fiscal enable row level security;

alter table public.empresa_fiscal_ern enable row level security;

alter table public.ern_feedback_limites_v1 enable row level security;

alter table public.ern_feedbacks_v1 enable row level security;

alter table public.ern_operacoes_assinatura_v1 enable row level security;

alter table public.ern_revisoes_fiscais enable row level security;

alter table public.financeiro enable row level security;

alter table public.guias enable row level security;

alter table public.hospedagens enable row level security;

alter table public.interacoes_publicacoes enable row level security;

alter table public.nfse_eventos enable row level security;

alter table public.nfse_solicitacoes enable row level security;

alter table public.parceiros enable row level security;

alter table public.passeios enable row level security;

alter table public.perfis enable row level security;

alter table public.perfis_profissionais enable row level security;

alter table public.perfis_publicos enable row level security;

alter table public.planos enable row level security;

alter table public.posts enable row level security;

alter table public.precos_planos enable row level security;

alter table public.publicacao_midias enable row level security;

alter table public.publicacao_traducoes enable row level security;

alter table public.publicacoes enable row level security;

alter table public.relatorios enable row level security;

alter table public.reservas enable row level security;

alter table public.reservas_historico_ciclo enable row level security;

alter table public.seguidores_perfis enable row level security;

alter table public.territorios enable row level security;

alter table public.transacoes enable row level security;

alter table public.visualizacoes_perfis enable row level security;

alter table public.visualizacoes_publicacoes enable row level security;

alter table public.vouchers enable row level security;

alter table public.webhook_eventos enable row level security;


-- ---------------------------------------------------------------------
-- 09. Políticas RLS (schema public) [139]
-- ---------------------------------------------------------------------
create policy acessos_profissionais_insert_proprio on public.acessos_profissionais as permissive for insert to authenticated
  with check (((usuario_id = ( SELECT auth.uid() AS uid)) AND (tipo = ANY (ARRAY['guia'::text, 'fornecedor'::text])) AND (COALESCE(( SELECT (auth.jwt() ->> 'is_anonymous'::text)), 'false'::text) = 'false'::text)));

create policy acessos_profissionais_select_proprio on public.acessos_profissionais as permissive for select to authenticated
  using ((usuario_id = ( SELECT auth.uid() AS uid)));

create policy acessos_profissionais_separacao_empresa on public.acessos_profissionais as restrictive for all to authenticated
  using (((usuario_id = ( SELECT auth.uid() AS uid)) AND (NOT (EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL)))))))
  with check (((usuario_id = ( SELECT auth.uid() AS uid)) AND (NOT (EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL)))))));

create policy editorial_consultar_proprio_acesso on public.administradores_editoriais_ern as permissive for select to authenticated
  using ((usuario_id = ( SELECT auth.uid() AS uid)));

create policy assinaturas_select_empresa on public.assinaturas_empresas as permissive for select to authenticated
  using ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy ern_equipe_campo_restricao_v1 on public.assinaturas_empresas as restrictive for all to authenticated
  using ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))))
  with check ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))));

create policy categorias_publicacoes_public_select on public.categorias_publicacoes as permissive for select to anon, authenticated
  using ((ativo = true));

create policy clientes_delete_empresa on public.clientes as permissive for delete to authenticated
  using ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy clientes_insert_empresa on public.clientes as permissive for insert to authenticated
  with check ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy clientes_select_empresa on public.clientes as permissive for select to authenticated
  using ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy clientes_update_empresa on public.clientes as permissive for update to authenticated
  using ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))))
  with check ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy ern_equipe_campo_restricao_v1 on public.clientes as restrictive for all to authenticated
  using ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))))
  with check ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))));

create policy ern_modulo_funcao_restricao_v1 on public.clientes as restrictive for all to authenticated
  using (( SELECT ern_pode_acessar_modulo('clientes'::text) AS ern_pode_acessar_modulo))
  with check (( SELECT ern_pode_acessar_modulo('clientes'::text) AS ern_pode_acessar_modulo));

create policy cobrancas_select_empresa on public.cobrancas_assinaturas as permissive for select to authenticated
  using ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy ern_equipe_campo_restricao_v1 on public.cobrancas_assinaturas as restrictive for all to authenticated
  using ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))))
  with check ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))));

create policy ern_modulo_funcao_restricao_v1 on public.cobrancas_assinaturas as restrictive for all to authenticated
  using (( SELECT ern_pode_acessar_modulo('planos'::text) AS ern_pode_acessar_modulo))
  with check (( SELECT ern_pode_acessar_modulo('planos'::text) AS ern_pode_acessar_modulo));

create policy configuracoes_insert_admin_empresa on public.configuracoes as permissive for insert to authenticated
  with check ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id = configuracoes.empresa_id) AND (p.role = 'admin_empresa'::text)))));

create policy configuracoes_select_admin_empresa on public.configuracoes as permissive for select to authenticated
  using ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id = configuracoes.empresa_id) AND (p.role = 'admin_empresa'::text)))));

create policy configuracoes_update_admin_empresa on public.configuracoes as permissive for update to authenticated
  using ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id = configuracoes.empresa_id) AND (p.role = 'admin_empresa'::text)))))
  with check ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id = configuracoes.empresa_id) AND (p.role = 'admin_empresa'::text)))));

create policy demanda_itens_delete_operacao on public.demanda_itens as permissive for delete to authenticated
  using ((EXISTS ( SELECT 1
   FROM (demandas d
     JOIN perfis p ON ((p.empresa_id = d.empresa_id)))
  WHERE ((d.id = demanda_itens.demanda_id) AND (p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text])) AND (d.status = ANY (ARRAY['rascunho'::text, 'aberta'::text]))))));

create policy demanda_itens_insert_operacao on public.demanda_itens as permissive for insert to authenticated
  with check ((EXISTS ( SELECT 1
   FROM (demandas d
     JOIN perfis p ON ((p.empresa_id = d.empresa_id)))
  WHERE ((d.id = demanda_itens.demanda_id) AND (p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text])) AND (d.status = ANY (ARRAY['rascunho'::text, 'aberta'::text]))))));

create policy demanda_itens_select_empresa on public.demanda_itens as permissive for select to authenticated
  using ((EXISTS ( SELECT 1
   FROM demandas d
  WHERE (d.id = demanda_itens.demanda_id))));

create policy demanda_itens_update_operacao on public.demanda_itens as permissive for update to authenticated
  using ((EXISTS ( SELECT 1
   FROM (demandas d
     JOIN perfis p ON ((p.empresa_id = d.empresa_id)))
  WHERE ((d.id = demanda_itens.demanda_id) AND (p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text])) AND (d.status = ANY (ARRAY['rascunho'::text, 'aberta'::text]))))))
  with check ((EXISTS ( SELECT 1
   FROM (demandas d
     JOIN perfis p ON ((p.empresa_id = d.empresa_id)))
  WHERE ((d.id = demanda_itens.demanda_id) AND (p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text])) AND (d.status = ANY (ARRAY['rascunho'::text, 'aberta'::text]))))));

create policy ern_equipe_campo_restricao_v1 on public.demanda_itens as restrictive for all to authenticated
  using ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))))
  with check ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))));

create policy ern_modulo_funcao_restricao_v1 on public.demanda_itens as restrictive for all to authenticated
  using (( SELECT ern_pode_acessar_modulo('demandas'::text) AS ern_pode_acessar_modulo))
  with check (( SELECT ern_pode_acessar_modulo('demandas'::text) AS ern_pode_acessar_modulo));

create policy demandas_delete_operacao on public.demandas as permissive for delete to authenticated
  using ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text]))))));

create policy demandas_insert_operacao on public.demandas as permissive for insert to authenticated
  with check (((criado_por = ( SELECT auth.uid() AS uid)) AND (empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text])))))));

create policy demandas_select_propria on public.demandas as permissive for select to authenticated
  using ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = ( SELECT auth.uid() AS uid)))));

create policy demandas_update_operacao on public.demandas as permissive for update to authenticated
  using ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text]))))))
  with check ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text]))))));

create policy ern_equipe_campo_restricao_v1 on public.demandas as restrictive for all to authenticated
  using ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))))
  with check ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))));

create policy ern_modulo_funcao_restricao_v1 on public.demandas as restrictive for all to authenticated
  using (( SELECT ern_pode_acessar_modulo('demandas'::text) AS ern_pode_acessar_modulo))
  with check (( SELECT ern_pode_acessar_modulo('demandas'::text) AS ern_pode_acessar_modulo));

create policy embarcacoes_delete_empresa on public.embarcacoes as permissive for delete to authenticated
  using ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy embarcacoes_insert_empresa on public.embarcacoes as permissive for insert to authenticated
  with check ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy embarcacoes_select_empresa on public.embarcacoes as permissive for select to authenticated
  using ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy embarcacoes_update_empresa on public.embarcacoes as permissive for update to authenticated
  using ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))))
  with check ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy ern_equipe_campo_restricao_v1 on public.embarcacoes as restrictive for all to authenticated
  using ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))))
  with check ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))));

create policy ern_modulo_funcao_restricao_v1 on public.embarcacoes as restrictive for all to authenticated
  using (( SELECT ern_pode_acessar_modulo('embarcacoes'::text) AS ern_pode_acessar_modulo))
  with check (( SELECT ern_pode_acessar_modulo('embarcacoes'::text) AS ern_pode_acessar_modulo));

create policy empresa_select_propria on public.empresa as permissive for select to authenticated
  using ((id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = ( SELECT auth.uid() AS uid)))));

create policy empresa_update_admin on public.empresa as permissive for update to authenticated
  using ((id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin_empresa'::text)))))
  with check ((id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin_empresa'::text)))));

create policy capacidades_admin_propria on public.empresa_capacidades as permissive for all to authenticated
  using ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin_empresa'::text)))))
  with check ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin_empresa'::text)))));

create policy capacidades_select_propria on public.empresa_capacidades as permissive for select to authenticated
  using ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = ( SELECT auth.uid() AS uid)))));

create policy ern_equipe_campo_restricao_v1 on public.empresa_capacidades as restrictive for all to authenticated
  using ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))))
  with check ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))));

create policy ern_modulo_funcao_restricao_v1 on public.empresa_capacidades as restrictive for all to authenticated
  using (( SELECT ern_pode_acessar_modulo('demandas'::text) AS ern_pode_acessar_modulo))
  with check (( SELECT ern_pode_acessar_modulo('demandas'::text) AS ern_pode_acessar_modulo));

create policy empresa_fiscal_select_admin_v1 on public.empresa_configuracao_fiscal as permissive for select to authenticated
  using ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id = empresa_configuracao_fiscal.empresa_id) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'admin_plataforma'::text]))))));

create policy ern_empresa_fiscal_insert_v479 on public.empresa_fiscal_ern as permissive for insert to authenticated
  with check (((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id = empresa_fiscal_ern.empresa_id) AND (p.role = 'admin_empresa'::text)))) AND (ern_pode_acessar_modulo('financeiro'::text) OR ern_pode_acessar_modulo('relatorios'::text))));

create policy ern_empresa_fiscal_select_v479 on public.empresa_fiscal_ern as permissive for select to authenticated
  using (((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id = empresa_fiscal_ern.empresa_id) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))) AND (ern_pode_acessar_modulo('financeiro'::text) OR ern_pode_acessar_modulo('relatorios'::text))));

create policy ern_empresa_fiscal_update_v479 on public.empresa_fiscal_ern as permissive for update to authenticated
  using (((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id = empresa_fiscal_ern.empresa_id) AND (p.role = 'admin_empresa'::text)))) AND (ern_pode_acessar_modulo('financeiro'::text) OR ern_pode_acessar_modulo('relatorios'::text))))
  with check (((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id = empresa_fiscal_ern.empresa_id) AND (p.role = 'admin_empresa'::text)))) AND (ern_pode_acessar_modulo('financeiro'::text) OR ern_pode_acessar_modulo('relatorios'::text))));

create policy ern_rev_fiscal_atualizar on public.ern_revisoes_fiscais as permissive for update to authenticated
  using (((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id = ern_revisoes_fiscais.empresa_id) AND (p.role = 'admin_empresa'::text)))) AND (ern_pode_acessar_modulo('financeiro'::text) OR ern_pode_acessar_modulo('relatorios'::text))))
  with check (((updated_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id = ern_revisoes_fiscais.empresa_id) AND (p.role = 'admin_empresa'::text)))) AND (ern_pode_acessar_modulo('financeiro'::text) OR ern_pode_acessar_modulo('relatorios'::text)) AND (EXISTS ( SELECT 1
   FROM reservas r
  WHERE ((r.id = ern_revisoes_fiscais.reserva_id) AND (r.empresa_id = ern_revisoes_fiscais.empresa_id))))));

create policy ern_rev_fiscal_inserir on public.ern_revisoes_fiscais as permissive for insert to authenticated
  with check (((created_by = ( SELECT auth.uid() AS uid)) AND (updated_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id = ern_revisoes_fiscais.empresa_id) AND (p.role = 'admin_empresa'::text)))) AND (ern_pode_acessar_modulo('financeiro'::text) OR ern_pode_acessar_modulo('relatorios'::text)) AND (EXISTS ( SELECT 1
   FROM reservas r
  WHERE ((r.id = ern_revisoes_fiscais.reserva_id) AND (r.empresa_id = ern_revisoes_fiscais.empresa_id))))));

create policy ern_rev_fiscal_ler on public.ern_revisoes_fiscais as permissive for select to authenticated
  using (((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id = ern_revisoes_fiscais.empresa_id) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))) AND (ern_pode_acessar_modulo('financeiro'::text) OR ern_pode_acessar_modulo('relatorios'::text))));

create policy ern_equipe_campo_restricao_v1 on public.financeiro as restrictive for all to authenticated
  using ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))))
  with check ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))));

create policy ern_modulo_funcao_restricao_v1 on public.financeiro as restrictive for all to authenticated
  using (( SELECT ern_pode_acessar_modulo('financeiro'::text) AS ern_pode_acessar_modulo))
  with check (( SELECT ern_pode_acessar_modulo('financeiro'::text) AS ern_pode_acessar_modulo));

create policy financeiro_delete_empresa_plano on public.financeiro as permissive for delete to authenticated
  using (((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))) AND empresa_tem_recurso(empresa_id, 'financeiro'::text)));

create policy financeiro_insert_empresa_plano on public.financeiro as permissive for insert to authenticated
  with check (((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))) AND empresa_tem_recurso(empresa_id, 'financeiro'::text)));

create policy financeiro_select_empresa_plano on public.financeiro as permissive for select to authenticated
  using (((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))) AND empresa_tem_recurso(empresa_id, 'financeiro'::text)));

create policy financeiro_update_empresa_plano on public.financeiro as permissive for update to authenticated
  using (((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))) AND empresa_tem_recurso(empresa_id, 'financeiro'::text)))
  with check (((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))) AND empresa_tem_recurso(empresa_id, 'financeiro'::text)));

create policy ern_equipe_campo_restricao_v1 on public.guias as restrictive for all to authenticated
  using ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))))
  with check ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))));

create policy ern_modulo_funcao_restricao_v1 on public.guias as restrictive for all to authenticated
  using (( SELECT ern_pode_acessar_modulo('guias'::text) AS ern_pode_acessar_modulo))
  with check (( SELECT ern_pode_acessar_modulo('guias'::text) AS ern_pode_acessar_modulo));

create policy guias_delete_empresa on public.guias as permissive for delete to authenticated
  using ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id = guias.empresa_id) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text]))))));

create policy guias_insert_empresa on public.guias as permissive for insert to authenticated
  with check (((usuario_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id = guias.empresa_id) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text])))))));

create policy guias_select_empresa on public.guias as permissive for select to authenticated
  using ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id = guias.empresa_id)))));

create policy guias_update_empresa on public.guias as permissive for update to authenticated
  using ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id = guias.empresa_id) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text]))))))
  with check ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id = guias.empresa_id) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text]))))));

create policy ern_equipe_campo_restricao_v1 on public.hospedagens as restrictive for all to authenticated
  using ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))))
  with check ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))));

create policy ern_modulo_funcao_restricao_v1 on public.hospedagens as restrictive for all to authenticated
  using (( SELECT ern_pode_acessar_modulo('hospedagens'::text) AS ern_pode_acessar_modulo))
  with check (( SELECT ern_pode_acessar_modulo('hospedagens'::text) AS ern_pode_acessar_modulo));

create policy hospedagens_delete_empresa on public.hospedagens as permissive for delete to authenticated
  using ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy hospedagens_insert_empresa on public.hospedagens as permissive for insert to authenticated
  with check ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy hospedagens_select_empresa on public.hospedagens as permissive for select to authenticated
  using ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy hospedagens_update_empresa on public.hospedagens as permissive for update to authenticated
  using ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))))
  with check ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy interacoes_publicacoes_delete_proprio on public.interacoes_publicacoes as permissive for delete to authenticated
  using ((usuario_id = auth.uid()));

create policy interacoes_publicacoes_insert_proprio on public.interacoes_publicacoes as permissive for insert to authenticated
  with check (((usuario_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM publicacoes p
  WHERE ((p.id = interacoes_publicacoes.publicacao_id) AND (p.status = 'publicado'::text) AND (p.publicado_em IS NOT NULL) AND (p.publicado_em <= now()) AND (p.permitir_interacoes = true))))));

create policy interacoes_publicacoes_select_proprio on public.interacoes_publicacoes as permissive for select to authenticated
  using ((usuario_id = auth.uid()));

create policy nfse_eventos_select_v1 on public.nfse_eventos as permissive for select to authenticated
  using (((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id = nfse_eventos.empresa_id) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'admin_plataforma'::text, 'financeiro'::text]))))) AND (( SELECT ern_pode_acessar_modulo('financeiro'::text) AS ern_pode_acessar_modulo) OR ( SELECT ern_pode_acessar_modulo('relatorios'::text) AS ern_pode_acessar_modulo))));

create policy nfse_solicitacoes_select_v1 on public.nfse_solicitacoes as permissive for select to authenticated
  using (((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id = nfse_solicitacoes.empresa_id) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'admin_plataforma'::text, 'financeiro'::text]))))) AND (( SELECT ern_pode_acessar_modulo('financeiro'::text) AS ern_pode_acessar_modulo) OR ( SELECT ern_pode_acessar_modulo('relatorios'::text) AS ern_pode_acessar_modulo))));

create policy ern_equipe_campo_restricao_v1 on public.parceiros as restrictive for all to authenticated
  using ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))))
  with check ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))));

create policy ern_modulo_funcao_restricao_v1 on public.parceiros as restrictive for all to authenticated
  using (( SELECT ern_pode_acessar_modulo('parceiros'::text) AS ern_pode_acessar_modulo))
  with check (( SELECT ern_pode_acessar_modulo('parceiros'::text) AS ern_pode_acessar_modulo));

create policy parceiros_delete_empresa on public.parceiros as permissive for delete to authenticated
  using ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy parceiros_insert_empresa on public.parceiros as permissive for insert to authenticated
  with check ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy parceiros_select_empresa on public.parceiros as permissive for select to authenticated
  using ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy parceiros_update_empresa on public.parceiros as permissive for update to authenticated
  using ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))))
  with check ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy ern_equipe_campo_restricao_v1 on public.passeios as restrictive for all to authenticated
  using ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))))
  with check ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))));

create policy ern_modulo_funcao_restricao_v1 on public.passeios as restrictive for all to authenticated
  using (( SELECT ern_pode_acessar_modulo('passeios'::text) AS ern_pode_acessar_modulo))
  with check (( SELECT ern_pode_acessar_modulo('passeios'::text) AS ern_pode_acessar_modulo));

create policy passeios_delete_empresa on public.passeios as permissive for delete to authenticated
  using ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy passeios_insert_empresa on public.passeios as permissive for insert to authenticated
  with check ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy passeios_select_empresa on public.passeios as permissive for select to authenticated
  using ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy passeios_update_empresa on public.passeios as permissive for update to authenticated
  using ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))))
  with check ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy "Usuários podem ver o próprio perfil" on public.perfis as permissive for select to authenticated
  using ((auth.uid() = id));

create policy perfis_profissionais_insert_proprio on public.perfis_profissionais as permissive for insert to authenticated
  with check (((usuario_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM acessos_profissionais a
  WHERE ((a.usuario_id = ( SELECT auth.uid() AS uid)) AND (a.tipo = perfis_profissionais.tipo))))));

create policy perfis_profissionais_select_proprio on public.perfis_profissionais as permissive for select to authenticated
  using ((usuario_id = ( SELECT auth.uid() AS uid)));

create policy perfis_profissionais_separacao_empresa on public.perfis_profissionais as restrictive for all to authenticated
  using (((usuario_id = ( SELECT auth.uid() AS uid)) AND (NOT (EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL)))))))
  with check (((usuario_id = ( SELECT auth.uid() AS uid)) AND (NOT (EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL)))))));

create policy perfis_profissionais_update_proprio on public.perfis_profissionais as permissive for update to authenticated
  using (((usuario_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM acessos_profissionais a
  WHERE ((a.usuario_id = ( SELECT auth.uid() AS uid)) AND (a.tipo = perfis_profissionais.tipo))))))
  with check (((usuario_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM acessos_profissionais a
  WHERE ((a.usuario_id = ( SELECT auth.uid() AS uid)) AND (a.tipo = perfis_profissionais.tipo))))));

create policy perfil_editorial_select_administrador on public.perfis_publicos as permissive for select to authenticated
  using (((id = '6d2be2c2-31f7-4f5a-b62b-db262177bdd3'::uuid) AND (origem_tipo = 'editorial'::text) AND (categoria = 'ern_editorial'::text) AND ( SELECT tem_acesso_editorial_ern() AS tem_acesso_editorial_ern)));

create policy perfil_editorial_update_administrador on public.perfis_publicos as permissive for update to authenticated
  using (((id = '6d2be2c2-31f7-4f5a-b62b-db262177bdd3'::uuid) AND (origem_tipo = 'editorial'::text) AND (categoria = 'ern_editorial'::text) AND ( SELECT tem_acesso_editorial_ern() AS tem_acesso_editorial_ern)))
  with check (((id = '6d2be2c2-31f7-4f5a-b62b-db262177bdd3'::uuid) AND (origem_tipo = 'editorial'::text) AND (categoria = 'ern_editorial'::text) AND ( SELECT tem_acesso_editorial_ern() AS tem_acesso_editorial_ern)));

create policy perfis_publicos_insert_empresa on public.perfis_publicos as permissive for insert to authenticated
  with check (((origem_tipo = 'empresa'::text) AND (categoria = 'operadora'::text) AND (usuario_id IS NULL) AND (parceiro_id IS NULL) AND (EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin_empresa'::text) AND (p.empresa_id = perfis_publicos.empresa_id) AND (p.empresa_id = perfis_publicos.empresa_gestora_id))))));

create policy perfis_publicos_rede_select on public.perfis_publicos as permissive for select to anon, authenticated
  using ((publicado = true));

create policy perfis_publicos_select_empresa on public.perfis_publicos as permissive for select to authenticated
  using ((empresa_gestora_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy perfis_publicos_select_publicado on public.perfis_publicos as permissive for select to anon
  using ((publicado = true));

create policy perfis_publicos_update_empresa on public.perfis_publicos as permissive for update to authenticated
  using (((origem_tipo = 'empresa'::text) AND (categoria = 'operadora'::text) AND (EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin_empresa'::text) AND (p.empresa_id = perfis_publicos.empresa_id) AND (p.empresa_id = perfis_publicos.empresa_gestora_id))))))
  with check (((origem_tipo = 'empresa'::text) AND (categoria = 'operadora'::text) AND (EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin_empresa'::text) AND (p.empresa_id = perfis_publicos.empresa_id) AND (p.empresa_id = perfis_publicos.empresa_gestora_id))))));

create policy planos_select_authenticated on public.planos as permissive for select to authenticated
  using ((ativo = true));

create policy ern_posts_bloqueio_legado on public.posts as restrictive for all to anon, authenticated
  using (false)
  with check (false);

create policy precos_planos_select_authenticated on public.precos_planos as permissive for select to authenticated
  using ((ativo = true));

create policy publicacao_midias_operadora_delete on public.publicacao_midias as permissive for delete to authenticated
  using ((EXISTS ( SELECT 1
   FROM publicacoes p
  WHERE ((p.id = publicacao_midias.publicacao_id) AND (p.status = ANY (ARRAY['rascunho'::text, 'publicado'::text, 'arquivado'::text])) AND ern_administra_perfil_publico(p.autor_perfil_id)))));

create policy publicacao_midias_operadora_insert on public.publicacao_midias as permissive for insert to authenticated
  with check ((EXISTS ( SELECT 1
   FROM publicacoes p
  WHERE ((p.id = publicacao_midias.publicacao_id) AND (p.status = ANY (ARRAY['rascunho'::text, 'publicado'::text, 'arquivado'::text])) AND ern_administra_perfil_publico(p.autor_perfil_id)))));

create policy publicacao_midias_operadora_select on public.publicacao_midias as permissive for select to authenticated
  using ((EXISTS ( SELECT 1
   FROM publicacoes p
  WHERE ((p.id = publicacao_midias.publicacao_id) AND ern_administra_perfil_publico(p.autor_perfil_id)))));

create policy publicacao_midias_operadora_update on public.publicacao_midias as permissive for update to authenticated
  using ((EXISTS ( SELECT 1
   FROM publicacoes p
  WHERE ((p.id = publicacao_midias.publicacao_id) AND (p.status = ANY (ARRAY['rascunho'::text, 'publicado'::text, 'arquivado'::text])) AND ern_administra_perfil_publico(p.autor_perfil_id)))))
  with check ((EXISTS ( SELECT 1
   FROM publicacoes p
  WHERE ((p.id = publicacao_midias.publicacao_id) AND (p.status = ANY (ARRAY['rascunho'::text, 'publicado'::text, 'arquivado'::text])) AND ern_administra_perfil_publico(p.autor_perfil_id)))));

create policy publicacao_midias_public_select on public.publicacao_midias as permissive for select to anon, authenticated
  using ((EXISTS ( SELECT 1
   FROM publicacoes p
  WHERE ((p.id = publicacao_midias.publicacao_id) AND (p.status = 'publicado'::text) AND (p.publicado_em IS NOT NULL) AND (p.publicado_em <= now())))));

create policy publicacao_traducoes_public_select on public.publicacao_traducoes as permissive for select to anon, authenticated
  using ((EXISTS ( SELECT 1
   FROM publicacoes p
  WHERE ((p.id = publicacao_traducoes.publicacao_id) AND (p.status = 'publicado'::text) AND (p.publicado_em IS NOT NULL) AND (p.publicado_em <= now())))));

create policy publicacoes_operadora_insert on public.publicacoes as permissive for insert to authenticated
  with check ((ern_administra_perfil_publico(autor_perfil_id) AND (destaque = false) AND (status = ANY (ARRAY['rascunho'::text, 'publicado'::text, 'arquivado'::text]))));

create policy publicacoes_operadora_select on public.publicacoes as permissive for select to authenticated
  using (ern_administra_perfil_publico(autor_perfil_id));

create policy publicacoes_operadora_update on public.publicacoes as permissive for update to authenticated
  using ((ern_administra_perfil_publico(autor_perfil_id) AND (status = ANY (ARRAY['rascunho'::text, 'publicado'::text, 'arquivado'::text]))))
  with check ((ern_administra_perfil_publico(autor_perfil_id) AND (status = ANY (ARRAY['rascunho'::text, 'publicado'::text, 'arquivado'::text]))));

create policy publicacoes_public_select on public.publicacoes as permissive for select to anon, authenticated
  using (((status = 'publicado'::text) AND (publicado_em IS NOT NULL) AND (publicado_em <= now()) AND (EXISTS ( SELECT 1
   FROM perfis_publicos perfil
  WHERE ((perfil.id = publicacoes.autor_perfil_id) AND (perfil.publicado = true))))));

create policy ern_equipe_campo_restricao_v1 on public.relatorios as restrictive for all to authenticated
  using ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))))
  with check ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))));

create policy ern_modulo_funcao_restricao_v1 on public.relatorios as restrictive for all to authenticated
  using (( SELECT ern_pode_acessar_modulo('relatorios'::text) AS ern_pode_acessar_modulo))
  with check (( SELECT ern_pode_acessar_modulo('relatorios'::text) AS ern_pode_acessar_modulo));

create policy relatorios_delete_empresa_plano on public.relatorios as permissive for delete to authenticated
  using (((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))) AND empresa_tem_recurso(empresa_id, 'relatorios'::text)));

create policy relatorios_insert_empresa_plano on public.relatorios as permissive for insert to authenticated
  with check (((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))) AND empresa_tem_recurso(empresa_id, 'relatorios'::text)));

create policy relatorios_select_empresa_plano on public.relatorios as permissive for select to authenticated
  using (((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))) AND empresa_tem_recurso(empresa_id, 'relatorios'::text)));

create policy relatorios_update_empresa_plano on public.relatorios as permissive for update to authenticated
  using (((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))) AND empresa_tem_recurso(empresa_id, 'relatorios'::text)))
  with check (((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))) AND empresa_tem_recurso(empresa_id, 'relatorios'::text)));

create policy ern_equipe_campo_restricao_v1 on public.reservas as restrictive for all to authenticated
  using ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))))
  with check ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))));

create policy ern_modulo_funcao_restricao_v1 on public.reservas as restrictive for all to authenticated
  using (( SELECT ern_pode_acessar_modulo('reservas'::text) AS ern_pode_acessar_modulo))
  with check (( SELECT ern_pode_acessar_modulo('reservas'::text) AS ern_pode_acessar_modulo));

create policy reservas_delete_empresa on public.reservas as permissive for delete to authenticated
  using ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy reservas_insert_empresa on public.reservas as permissive for insert to authenticated
  with check ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy reservas_select_empresa on public.reservas as permissive for select to authenticated
  using ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy reservas_update_empresa on public.reservas as permissive for update to authenticated
  using ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))))
  with check ((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))));

create policy ern_historico_ciclo_leitura on public.reservas_historico_ciclo as permissive for select to authenticated
  using ((EXISTS ( SELECT 1
   FROM reservas r
  WHERE ((r.id = reservas_historico_ciclo.reserva_id) AND (r.empresa_id = reservas_historico_ciclo.empresa_id)))));

create policy seguidores_perfis_delete_proprio on public.seguidores_perfis as permissive for delete to authenticated
  using ((seguidor_usuario_id = auth.uid()));

create policy seguidores_perfis_insert_proprio on public.seguidores_perfis as permissive for insert to authenticated
  with check (((seguidor_usuario_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM perfis_publicos perfil
  WHERE ((perfil.id = seguidores_perfis.perfil_seguido_id) AND (perfil.publicado = true))))));

create policy seguidores_perfis_select_proprio on public.seguidores_perfis as permissive for select to authenticated
  using ((seguidor_usuario_id = auth.uid()));

create policy territorios_public_select on public.territorios as permissive for select to anon, authenticated
  using ((ativo = true));

create policy ern_equipe_campo_restricao_v1 on public.transacoes as restrictive for all to authenticated
  using ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))))
  with check ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))));

create policy ern_modulo_funcao_restricao_v1 on public.transacoes as restrictive for all to authenticated
  using (( SELECT ern_pode_acessar_modulo('financeiro'::text) AS ern_pode_acessar_modulo))
  with check (( SELECT ern_pode_acessar_modulo('financeiro'::text) AS ern_pode_acessar_modulo));

create policy transacoes_delete_proprio on public.transacoes as permissive for delete to authenticated
  using ((user_id = ( SELECT auth.uid() AS uid)));

create policy transacoes_insert_proprio on public.transacoes as permissive for insert to authenticated
  with check ((user_id = ( SELECT auth.uid() AS uid)));

create policy transacoes_select_proprio on public.transacoes as permissive for select to authenticated
  using ((user_id = ( SELECT auth.uid() AS uid)));

create policy transacoes_update_proprio on public.transacoes as permissive for update to authenticated
  using ((user_id = ( SELECT auth.uid() AS uid)))
  with check ((user_id = ( SELECT auth.uid() AS uid)));

create policy ern_equipe_campo_restricao_v1 on public.vouchers as restrictive for all to authenticated
  using ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))))
  with check ((EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.empresa_id IS NOT NULL) AND (p.role = ANY (ARRAY['admin_empresa'::text, 'operador_empresa'::text, 'financeiro'::text, 'admin_plataforma'::text]))))));

create policy ern_modulo_funcao_restricao_v1 on public.vouchers as restrictive for all to authenticated
  using (( SELECT ern_pode_acessar_modulo('vouchers'::text) AS ern_pode_acessar_modulo))
  with check (( SELECT ern_pode_acessar_modulo('vouchers'::text) AS ern_pode_acessar_modulo));

create policy vouchers_delete_empresa_plano on public.vouchers as permissive for delete to authenticated
  using (((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))) AND empresa_tem_recurso(empresa_id, 'vouchers'::text)));

create policy vouchers_insert_empresa_plano on public.vouchers as permissive for insert to authenticated
  with check (((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))) AND empresa_tem_recurso(empresa_id, 'vouchers'::text)));

create policy vouchers_select_empresa_plano on public.vouchers as permissive for select to authenticated
  using (((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))) AND empresa_tem_recurso(empresa_id, 'vouchers'::text)));

create policy vouchers_update_empresa_plano on public.vouchers as permissive for update to authenticated
  using (((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))) AND empresa_tem_recurso(empresa_id, 'vouchers'::text)))
  with check (((empresa_id = ( SELECT p.empresa_id
   FROM perfis p
  WHERE (p.id = auth.uid()))) AND empresa_tem_recurso(empresa_id, 'vouchers'::text)));


-- ---------------------------------------------------------------------
-- 10. Storage: buckets [2]
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('rede-publica', 'rede-publica', true, 5242880, '{image/jpeg,image/png,image/webp}'::text[]) on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('vivencias-ern', 'vivencias-ern', false, 52428800, '{image/jpeg,image/png,image/webp,video/mp4,video/webm}'::text[]) on conflict (id) do nothing;


-- ---------------------------------------------------------------------
-- 11. Storage: políticas [9]
-- ---------------------------------------------------------------------
create policy editorial_imagens_insert_ern on storage.objects as permissive for insert to authenticated
  with check (((bucket_id = 'rede-publica'::text) AND ((storage.foldername(name))[1] = 'editorial'::text) AND ((storage.foldername(name))[2] = '6d2be2c2-31f7-4f5a-b62b-db262177bdd3'::text) AND (lower(storage.extension(name)) = ANY (ARRAY['jpg'::text, 'jpeg'::text, 'png'::text, 'webp'::text])) AND ( SELECT tem_acesso_editorial_ern() AS tem_acesso_editorial_ern)));

create policy editorial_imagens_select_ern on storage.objects as permissive for select to authenticated
  using (((bucket_id = 'rede-publica'::text) AND ((storage.foldername(name))[1] = 'editorial'::text) AND ((storage.foldername(name))[2] = '6d2be2c2-31f7-4f5a-b62b-db262177bdd3'::text) AND ( SELECT tem_acesso_editorial_ern() AS tem_acesso_editorial_ern)));

create policy rede_imagens_delete_admin_empresa_ern on storage.objects as permissive for delete to authenticated
  using (((bucket_id = 'rede-publica'::text) AND (EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin_empresa'::text) AND ((p.empresa_id)::text = (storage.foldername(objects.name))[1]))))));

create policy rede_imagens_insert_admin_empresa_ern on storage.objects as permissive for insert to authenticated
  with check (((bucket_id = 'rede-publica'::text) AND (EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin_empresa'::text) AND ((p.empresa_id)::text = (storage.foldername(objects.name))[1])))) AND (lower(storage.extension(name)) = ANY (ARRAY['jpg'::text, 'jpeg'::text, 'png'::text, 'webp'::text]))));

create policy rede_imagens_select_admin_empresa_ern on storage.objects as permissive for select to authenticated
  using (((bucket_id = 'rede-publica'::text) AND (EXISTS ( SELECT 1
   FROM perfis p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin_empresa'::text) AND ((p.empresa_id)::text = (storage.foldername(objects.name))[1]))))));

create policy vivencias_delete_sem_vinculo_ern on storage.objects as permissive for delete to authenticated
  using (((bucket_id = 'vivencias-ern'::text) AND (split_part(name, '/'::text, 1) = 'publicacoes'::text) AND (EXISTS ( SELECT 1
   FROM publicacoes p
  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 2)) AND (p.status = 'rascunho'::text) AND ern_administra_perfil_publico(p.autor_perfil_id) AND (NOT (EXISTS ( SELECT 1
           FROM publicacao_midias m
          WHERE ((m.publicacao_id = p.id) AND ((m.url = ('vivencias-ern/'::text || objects.name)) OR (m.thumbnail_url = ('vivencias-ern/'::text || objects.name))))))))))));

create policy vivencias_insert_rascunho_ern on storage.objects as permissive for insert to authenticated
  with check (((bucket_id = 'vivencias-ern'::text) AND (name ~ '^publicacoes/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|mp4|webm)$'::text) AND (EXISTS ( SELECT 1
   FROM publicacoes p
  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 2)) AND (p.status = 'rascunho'::text) AND ern_administra_perfil_publico(p.autor_perfil_id))))));

create policy vivencias_select_autor_ern on storage.objects as permissive for select to authenticated
  using (((bucket_id = 'vivencias-ern'::text) AND (split_part(name, '/'::text, 1) = 'publicacoes'::text) AND (EXISTS ( SELECT 1
   FROM publicacoes p
  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 2)) AND ern_administra_perfil_publico(p.autor_perfil_id))))));

create policy vivencias_select_publicado_ern on storage.objects as permissive for select to anon, authenticated
  using (((bucket_id = 'vivencias-ern'::text) AND (split_part(name, '/'::text, 1) = 'publicacoes'::text) AND (EXISTS ( SELECT 1
   FROM (publicacoes p
     JOIN perfis_publicos perfil ON ((perfil.id = p.autor_perfil_id)))
  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 2)) AND (p.status = 'publicado'::text) AND (p.publicado_em IS NOT NULL) AND (p.publicado_em <= now()) AND (perfil.publicado = true) AND (EXISTS ( SELECT 1
           FROM publicacao_midias m
          WHERE ((m.publicacao_id = p.id) AND (m.consentimento_confirmado = true) AND ((m.url = ('vivencias-ern/'::text || objects.name)) OR (m.thumbnail_url = ('vivencias-ern/'::text || objects.name)))))))))));


-- ---------------------------------------------------------------------
-- 12. Permissões de tabelas (anon, authenticated, service_role) [48]
-- ---------------------------------------------------------------------
revoke all on table public.acessos_profissionais from anon, authenticated, service_role;
grant SELECT on table public.acessos_profissionais to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.acessos_profissionais to service_role;

revoke all on table public.administradores_editoriais_ern from anon, authenticated, service_role;
grant SELECT on table public.administradores_editoriais_ern to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.administradores_editoriais_ern to service_role;

revoke all on table public.assinaturas_empresas from anon, authenticated, service_role;
grant MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE on table public.assinaturas_empresas to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.assinaturas_empresas to service_role;

revoke all on table public.categorias_publicacoes from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.categorias_publicacoes to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.categorias_publicacoes to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.categorias_publicacoes to service_role;

revoke all on table public.clientes from anon, authenticated, service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.clientes to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.clientes to service_role;

revoke all on table public.cliques_publicos from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.cliques_publicos to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.cliques_publicos to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.cliques_publicos to service_role;

revoke all on table public.cobrancas_assinaturas from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.cobrancas_assinaturas to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.cobrancas_assinaturas to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.cobrancas_assinaturas to service_role;

revoke all on table public.configuracoes from anon, authenticated, service_role;
grant INSERT, SELECT, UPDATE on table public.configuracoes to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.configuracoes to service_role;

revoke all on table public.demanda_itens from anon, authenticated, service_role;
grant SELECT on table public.demanda_itens to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.demanda_itens to service_role;

revoke all on table public.demandas from anon, authenticated, service_role;
grant DELETE, SELECT on table public.demandas to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.demandas to service_role;

revoke all on table public.embarcacoes from anon, authenticated, service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.embarcacoes to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.embarcacoes to service_role;

revoke all on table public.empresa from anon, authenticated, service_role;
grant SELECT, UPDATE on table public.empresa to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.empresa to service_role;

revoke all on table public.empresa_capacidades from anon, authenticated, service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.empresa_capacidades to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.empresa_capacidades to service_role;

revoke all on table public.empresa_configuracao_fiscal from anon, authenticated, service_role;
grant SELECT on table public.empresa_configuracao_fiscal to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.empresa_configuracao_fiscal to service_role;

revoke all on table public.empresa_fiscal_ern from anon, authenticated, service_role;
grant INSERT, SELECT, UPDATE on table public.empresa_fiscal_ern to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.empresa_fiscal_ern to service_role;

revoke all on table public.ern_feedback_limites_v1 from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.ern_feedback_limites_v1 to service_role;

revoke all on table public.ern_feedbacks_v1 from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.ern_feedbacks_v1 to service_role;

revoke all on table public.ern_operacoes_assinatura_v1 from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.ern_operacoes_assinatura_v1 to service_role;

revoke all on table public.ern_revisoes_fiscais from anon, authenticated, service_role;
grant SELECT on table public.ern_revisoes_fiscais to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.ern_revisoes_fiscais to service_role;

revoke all on table public.financeiro from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, SELECT, UPDATE on table public.financeiro to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.financeiro to service_role;

revoke all on table public.guias from anon, authenticated, service_role;
grant DELETE, INSERT, SELECT on table public.guias to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.guias to service_role;

revoke all on table public.hospedagens from anon, authenticated, service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.hospedagens to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.hospedagens to service_role;

revoke all on table public.interacoes_publicacoes from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.interacoes_publicacoes to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.interacoes_publicacoes to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.interacoes_publicacoes to service_role;

revoke all on table public.nfse_eventos from anon, authenticated, service_role;
grant SELECT on table public.nfse_eventos to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.nfse_eventos to service_role;

revoke all on table public.nfse_solicitacoes from anon, authenticated, service_role;
grant SELECT on table public.nfse_solicitacoes to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.nfse_solicitacoes to service_role;

revoke all on table public.parceiros from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.parceiros to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.parceiros to service_role;

revoke all on table public.passeios from anon, authenticated, service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.passeios to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.passeios to service_role;

revoke all on table public.perfis from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, SELECT, UPDATE on table public.perfis to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.perfis to service_role;

revoke all on table public.perfis_profissionais from anon, authenticated, service_role;
grant SELECT on table public.perfis_profissionais to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.perfis_profissionais to service_role;

revoke all on table public.perfis_publicos from anon, authenticated, service_role;
grant SELECT on table public.perfis_publicos to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.perfis_publicos to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.perfis_publicos to service_role;

revoke all on table public.planos from anon, authenticated, service_role;
grant MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE on table public.planos to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.planos to service_role;

revoke all on table public.posts from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.posts to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.posts to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.posts to service_role;

revoke all on table public.precos_planos from anon, authenticated, service_role;
grant MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE on table public.precos_planos to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.precos_planos to service_role;

revoke all on table public.publicacao_midias from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.publicacao_midias to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.publicacao_midias to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.publicacao_midias to service_role;

revoke all on table public.publicacao_traducoes from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.publicacao_traducoes to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.publicacao_traducoes to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.publicacao_traducoes to service_role;

revoke all on table public.publicacoes from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.publicacoes to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.publicacoes to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.publicacoes to service_role;

revoke all on table public.rede_publicacoes_consulta_ern from anon, authenticated, service_role;
grant SELECT on table public.rede_publicacoes_consulta_ern to anon;
grant SELECT on table public.rede_publicacoes_consulta_ern to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.rede_publicacoes_consulta_ern to service_role;

revoke all on table public.relatorios from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.relatorios to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.relatorios to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.relatorios to service_role;

revoke all on table public.reservas from anon, authenticated, service_role;
grant DELETE, INSERT, SELECT, UPDATE on table public.reservas to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.reservas to service_role;

revoke all on table public.reservas_historico_ciclo from anon, authenticated, service_role;
grant SELECT on table public.reservas_historico_ciclo to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.reservas_historico_ciclo to service_role;

revoke all on table public.seguidores_perfis from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.seguidores_perfis to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.seguidores_perfis to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.seguidores_perfis to service_role;

revoke all on table public.territorios from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.territorios to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.territorios to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.territorios to service_role;

revoke all on table public.transacoes from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.transacoes to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.transacoes to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.transacoes to service_role;

revoke all on table public.visualizacoes_perfis from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.visualizacoes_perfis to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.visualizacoes_perfis to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.visualizacoes_perfis to service_role;

revoke all on table public.visualizacoes_publicacoes from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.visualizacoes_publicacoes to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.visualizacoes_publicacoes to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.visualizacoes_publicacoes to service_role;

revoke all on table public.vouchers from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.vouchers to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.vouchers to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.vouchers to service_role;

revoke all on table public.vw_rede_publica from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.vw_rede_publica to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.vw_rede_publica to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.vw_rede_publica to service_role;

revoke all on table public.webhook_eventos from anon, authenticated, service_role;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.webhook_eventos to anon;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.webhook_eventos to authenticated;
grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.webhook_eventos to service_role;


-- ---------------------------------------------------------------------
-- 13. Permissões por coluna [76]
-- ---------------------------------------------------------------------
grant INSERT (tipo) on table public.acessos_profissionais to authenticated;

grant INSERT (categoria) on table public.demandas to authenticated;

grant UPDATE (categoria) on table public.demandas to authenticated;

grant INSERT (consumo_litros_hora) on table public.demandas to authenticated;

grant UPDATE (consumo_litros_hora) on table public.demandas to authenticated;

grant INSERT (consumo_pessoa_dia) on table public.demandas to authenticated;

grant UPDATE (consumo_pessoa_dia) on table public.demandas to authenticated;

grant INSERT (data_fim) on table public.demandas to authenticated;

grant UPDATE (data_fim) on table public.demandas to authenticated;

grant INSERT (data_inicio) on table public.demandas to authenticated;

grant UPDATE (data_inicio) on table public.demandas to authenticated;

grant INSERT (descricao) on table public.demandas to authenticated;

grant UPDATE (descricao) on table public.demandas to authenticated;

grant INSERT (dias_estimados) on table public.demandas to authenticated;

grant UPDATE (dias_estimados) on table public.demandas to authenticated;

grant INSERT (empresa_id) on table public.demandas to authenticated;

grant INSERT (horas_motor_dia) on table public.demandas to authenticated;

grant UPDATE (horas_motor_dia) on table public.demandas to authenticated;

grant INSERT (localidade) on table public.demandas to authenticated;

grant UPDATE (localidade) on table public.demandas to authenticated;

grant INSERT (margem_percentual) on table public.demandas to authenticated;

grant UPDATE (margem_percentual) on table public.demandas to authenticated;

grant INSERT (metodo_estimativa) on table public.demandas to authenticated;

grant UPDATE (metodo_estimativa) on table public.demandas to authenticated;

grant INSERT (pessoas_estimadas) on table public.demandas to authenticated;

grant UPDATE (pessoas_estimadas) on table public.demandas to authenticated;

grant INSERT (publico_alvo) on table public.demandas to authenticated;

grant UPDATE (publico_alvo) on table public.demandas to authenticated;

grant INSERT (quantidade) on table public.demandas to authenticated;

grant UPDATE (quantidade) on table public.demandas to authenticated;

grant INSERT (status) on table public.demandas to authenticated;

grant UPDATE (status) on table public.demandas to authenticated;

grant INSERT (tipo_combustivel) on table public.demandas to authenticated;

grant UPDATE (tipo_combustivel) on table public.demandas to authenticated;

grant INSERT (titulo) on table public.demandas to authenticated;

grant UPDATE (titulo) on table public.demandas to authenticated;

grant INSERT (unidade) on table public.demandas to authenticated;

grant UPDATE (unidade) on table public.demandas to authenticated;

grant INSERT (created_by) on table public.ern_revisoes_fiscais to authenticated;

grant INSERT (empresa_id) on table public.ern_revisoes_fiscais to authenticated;

grant INSERT (estado) on table public.ern_revisoes_fiscais to authenticated;

grant UPDATE (estado) on table public.ern_revisoes_fiscais to authenticated;

grant INSERT (observacoes) on table public.ern_revisoes_fiscais to authenticated;

grant UPDATE (observacoes) on table public.ern_revisoes_fiscais to authenticated;

grant INSERT (reserva_id) on table public.ern_revisoes_fiscais to authenticated;

grant UPDATE (updated_at) on table public.ern_revisoes_fiscais to authenticated;

grant INSERT (updated_by) on table public.ern_revisoes_fiscais to authenticated;

grant UPDATE (updated_by) on table public.ern_revisoes_fiscais to authenticated;

grant INSERT (cadastur) on table public.guias to authenticated;

grant UPDATE (cadastur) on table public.guias to authenticated;

grant INSERT (cpf) on table public.guias to authenticated;

grant UPDATE (cpf) on table public.guias to authenticated;

grant INSERT (empresa_id) on table public.guias to authenticated;

grant INSERT (idiomas) on table public.guias to authenticated;

grant UPDATE (idiomas) on table public.guias to authenticated;

grant INSERT (nome) on table public.guias to authenticated;

grant UPDATE (nome) on table public.guias to authenticated;

grant INSERT (status) on table public.guias to authenticated;

grant UPDATE (status) on table public.guias to authenticated;

grant INSERT (telefone) on table public.guias to authenticated;

grant UPDATE (telefone) on table public.guias to authenticated;

grant INSERT (cadastur) on table public.perfis_profissionais to authenticated;

grant UPDATE (cadastur) on table public.perfis_profissionais to authenticated;

grant INSERT (categoria) on table public.perfis_profissionais to authenticated;

grant UPDATE (categoria) on table public.perfis_profissionais to authenticated;

grant INSERT (cidade) on table public.perfis_profissionais to authenticated;

grant UPDATE (cidade) on table public.perfis_profissionais to authenticated;

grant INSERT (descricao) on table public.perfis_profissionais to authenticated;

grant UPDATE (descricao) on table public.perfis_profissionais to authenticated;

grant INSERT (idiomas) on table public.perfis_profissionais to authenticated;

grant UPDATE (idiomas) on table public.perfis_profissionais to authenticated;

grant INSERT (nome) on table public.perfis_profissionais to authenticated;

grant UPDATE (nome) on table public.perfis_profissionais to authenticated;

grant INSERT (telefone) on table public.perfis_profissionais to authenticated;

grant UPDATE (telefone) on table public.perfis_profissionais to authenticated;

grant INSERT (tipo) on table public.perfis_profissionais to authenticated;


-- ---------------------------------------------------------------------
-- 14. Permissões de execução de funções [50]
-- ---------------------------------------------------------------------
revoke all on function public.alterar_status_publicacao_ern(publicacao_id uuid, acao text, versao_esperada timestamp with time zone) from public, anon, authenticated, service_role;
grant execute on function public.alterar_status_publicacao_ern(publicacao_id uuid, acao text, versao_esperada timestamp with time zone) to authenticated;
grant execute on function public.alterar_status_publicacao_ern(publicacao_id uuid, acao text, versao_esperada timestamp with time zone) to service_role;

revoke all on function public.atualizar_data_perfil_profissional() from public, anon, authenticated, service_role;
grant execute on function public.atualizar_data_perfil_profissional() to service_role;

revoke all on function public.criar_assinatura_free_empresa() from public, anon, authenticated, service_role;
grant execute on function public.criar_assinatura_free_empresa() to anon;
grant execute on function public.criar_assinatura_free_empresa() to authenticated;
grant execute on function public.criar_assinatura_free_empresa() to public;
grant execute on function public.criar_assinatura_free_empresa() to service_role;

revoke all on function public.definir_empresa_cliente() from public, anon, authenticated, service_role;
grant execute on function public.definir_empresa_cliente() to anon;
grant execute on function public.definir_empresa_cliente() to authenticated;
grant execute on function public.definir_empresa_cliente() to public;
grant execute on function public.definir_empresa_cliente() to service_role;

revoke all on function public.definir_empresa_embarcacao() from public, anon, authenticated, service_role;
grant execute on function public.definir_empresa_embarcacao() to anon;
grant execute on function public.definir_empresa_embarcacao() to authenticated;
grant execute on function public.definir_empresa_embarcacao() to public;
grant execute on function public.definir_empresa_embarcacao() to service_role;

revoke all on function public.definir_empresa_hospedagem() from public, anon, authenticated, service_role;
grant execute on function public.definir_empresa_hospedagem() to anon;
grant execute on function public.definir_empresa_hospedagem() to authenticated;
grant execute on function public.definir_empresa_hospedagem() to public;
grant execute on function public.definir_empresa_hospedagem() to service_role;

revoke all on function public.definir_empresa_passeio() from public, anon, authenticated, service_role;
grant execute on function public.definir_empresa_passeio() to anon;
grant execute on function public.definir_empresa_passeio() to authenticated;
grant execute on function public.definir_empresa_passeio() to public;
grant execute on function public.definir_empresa_passeio() to service_role;

revoke all on function public.definir_empresa_registro() from public, anon, authenticated, service_role;
grant execute on function public.definir_empresa_registro() to anon;
grant execute on function public.definir_empresa_registro() to authenticated;
grant execute on function public.definir_empresa_registro() to public;
grant execute on function public.definir_empresa_registro() to service_role;

revoke all on function public.definir_empresa_reserva() from public, anon, authenticated, service_role;
grant execute on function public.definir_empresa_reserva() to anon;
grant execute on function public.definir_empresa_reserva() to authenticated;
grant execute on function public.definir_empresa_reserva() to public;
grant execute on function public.definir_empresa_reserva() to service_role;

revoke all on function public.empresa_tem_recurso(p_empresa_id uuid, p_recurso text) from public, anon, authenticated, service_role;
grant execute on function public.empresa_tem_recurso(p_empresa_id uuid, p_recurso text) to authenticated;
grant execute on function public.empresa_tem_recurso(p_empresa_id uuid, p_recurso text) to service_role;

revoke all on function public.ern_administra_perfil_publico(perfil_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.ern_administra_perfil_publico(perfil_id uuid) to authenticated;
grant execute on function public.ern_administra_perfil_publico(perfil_id uuid) to service_role;

revoke all on function public.ern_concluir_evento_asaas_v1(p_evento_id text, p_tentativa_id uuid, p_concluir_checkout boolean) from public, anon, authenticated, service_role;
grant execute on function public.ern_concluir_evento_asaas_v1(p_evento_id text, p_tentativa_id uuid, p_concluir_checkout boolean) to service_role;

revoke all on function public.ern_confirmar_cancelamento_v1(p_operacao_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.ern_confirmar_cancelamento_v1(p_operacao_id uuid) to service_role;

revoke all on function public.ern_criar_demanda_com_itens(p_dados jsonb, p_itens jsonb) from public, anon, authenticated, service_role;
grant execute on function public.ern_criar_demanda_com_itens(p_dados jsonb, p_itens jsonb) to authenticated;
grant execute on function public.ern_criar_demanda_com_itens(p_dados jsonb, p_itens jsonb) to service_role;

revoke all on function public.ern_criar_minha_operadora(p_nome_empresa text, p_nome_responsavel text, p_cidade text) from public, anon, authenticated, service_role;
grant execute on function public.ern_criar_minha_operadora(p_nome_empresa text, p_nome_responsavel text, p_cidade text) to authenticated;
grant execute on function public.ern_criar_minha_operadora(p_nome_empresa text, p_nome_responsavel text, p_cidade text) to service_role;

revoke all on function public.ern_encerrar_reserva(p_reserva_id uuid, p_resultado text) from public, anon, authenticated, service_role;
grant execute on function public.ern_encerrar_reserva(p_reserva_id uuid, p_resultado text) to service_role;

revoke all on function public.ern_enviar_feedback_v1(p_identificador text, p_usuario_id uuid, p_origem text, p_categoria text, p_caminho text, p_mensagem text, p_contato_email text) from public, anon, authenticated, service_role;
grant execute on function public.ern_enviar_feedback_v1(p_identificador text, p_usuario_id uuid, p_origem text, p_categoria text, p_caminho text, p_mensagem text, p_contato_email text) to service_role;

revoke all on function public.ern_falhar_evento_asaas_v1(p_evento_id text, p_tentativa_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.ern_falhar_evento_asaas_v1(p_evento_id text, p_tentativa_id uuid) to service_role;

revoke all on function public.ern_fiscal_simular_reserva_v1(p_usuario_id uuid, p_reserva_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.ern_fiscal_simular_reserva_v1(p_usuario_id uuid, p_reserva_id uuid) to service_role;

revoke all on function public.ern_listar_meus_modulos() from public, anon, authenticated, service_role;
grant execute on function public.ern_listar_meus_modulos() to authenticated;
grant execute on function public.ern_listar_meus_modulos() to service_role;

revoke all on function public.ern_pode_acessar_modulo(p_modulo text) from public, anon, authenticated, service_role;
grant execute on function public.ern_pode_acessar_modulo(p_modulo text) to authenticated;
grant execute on function public.ern_pode_acessar_modulo(p_modulo text) to service_role;

revoke all on function public.ern_preparar_voucher_reserva() from public, anon, authenticated, service_role;
grant execute on function public.ern_preparar_voucher_reserva() to service_role;

revoke all on function public.ern_proteger_historico_reserva() from public, anon, authenticated, service_role;
grant execute on function public.ern_proteger_historico_reserva() to service_role;

revoke all on function public.ern_recuperar_vinculo_checkout_v1(p_operacao_id uuid, p_assinatura_asaas_id text, p_cliente_asaas_id text, p_referencia_externa text, p_valor numeric, p_ciclo_asaas text) from public, anon, authenticated, service_role;
grant execute on function public.ern_recuperar_vinculo_checkout_v1(p_operacao_id uuid, p_assinatura_asaas_id text, p_cliente_asaas_id text, p_referencia_externa text, p_valor numeric, p_ciclo_asaas text) to service_role;

revoke all on function public.ern_registrar_historico_ciclo_reserva() from public, anon, authenticated, service_role;
grant execute on function public.ern_registrar_historico_ciclo_reserva() to service_role;

revoke all on function public.ern_reservar_cancelamento_v1(p_usuario_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.ern_reservar_cancelamento_v1(p_usuario_id uuid) to service_role;

revoke all on function public.ern_reservar_checkout_v1(p_usuario_id uuid, p_plano_codigo text, p_ciclo text) from public, anon, authenticated, service_role;
grant execute on function public.ern_reservar_checkout_v1(p_usuario_id uuid, p_plano_codigo text, p_ciclo text) to service_role;

revoke all on function public.ern_reservar_evento_asaas_v1(p_evento_id text, p_tipo_evento text, p_pagamento_id text) from public, anon, authenticated, service_role;
grant execute on function public.ern_reservar_evento_asaas_v1(p_evento_id text, p_tipo_evento text, p_pagamento_id text) to service_role;

revoke all on function public.ern_reservas_financeiro(p_finalidade text, p_reserva_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.ern_reservas_financeiro(p_finalidade text, p_reserva_id uuid) to authenticated;
grant execute on function public.ern_reservas_financeiro(p_finalidade text, p_reserva_id uuid) to service_role;

revoke all on function public.ern_salvar_demanda_itens(p_demanda_id uuid, p_versao integer, p_itens jsonb) from public, anon, authenticated, service_role;
grant execute on function public.ern_salvar_demanda_itens(p_demanda_id uuid, p_versao integer, p_itens jsonb) to authenticated;
grant execute on function public.ern_salvar_demanda_itens(p_demanda_id uuid, p_versao integer, p_itens jsonb) to service_role;

revoke all on function public.ern_validar_encerramento_reserva() from public, anon, authenticated, service_role;
grant execute on function public.ern_validar_encerramento_reserva() to service_role;

revoke all on function public.ern_validar_reserva_financeiro() from public, anon, authenticated, service_role;
grant execute on function public.ern_validar_reserva_financeiro() to service_role;

revoke all on function public.ern_validar_vinculos_reserva() from public, anon, authenticated, service_role;
grant execute on function public.ern_validar_vinculos_reserva() to service_role;

revoke all on function public.get_catalogo_planos() from public, anon, authenticated, service_role;
grant execute on function public.get_catalogo_planos() to anon;
grant execute on function public.get_catalogo_planos() to authenticated;
grant execute on function public.get_catalogo_planos() to service_role;

revoke all on function public.get_meu_plano() from public, anon, authenticated, service_role;
grant execute on function public.get_meu_plano() to authenticated;
grant execute on function public.get_meu_plano() to service_role;

revoke all on function public.get_meu_tema_ern() from public, anon, authenticated, service_role;
grant execute on function public.get_meu_tema_ern() to authenticated;
grant execute on function public.get_meu_tema_ern() to service_role;

revoke all on function public.get_meu_uso_clientes() from public, anon, authenticated, service_role;
grant execute on function public.get_meu_uso_clientes() to authenticated;
grant execute on function public.get_meu_uso_clientes() to service_role;

revoke all on function public.get_meu_uso_passeios() from public, anon, authenticated, service_role;
grant execute on function public.get_meu_uso_passeios() to authenticated;
grant execute on function public.get_meu_uso_passeios() to service_role;

revoke all on function public.get_meu_uso_reservas_mes() from public, anon, authenticated, service_role;
grant execute on function public.get_meu_uso_reservas_mes() to authenticated;
grant execute on function public.get_meu_uso_reservas_mes() to service_role;

revoke all on function public.get_meu_uso_usuarios() from public, anon, authenticated, service_role;
grant execute on function public.get_meu_uso_usuarios() to authenticated;
grant execute on function public.get_meu_uso_usuarios() to service_role;

revoke all on function public.proteger_perfil_publico_operadora_ern() from public, anon, authenticated, service_role;
grant execute on function public.proteger_perfil_publico_operadora_ern() to anon;
grant execute on function public.proteger_perfil_publico_operadora_ern() to authenticated;
grant execute on function public.proteger_perfil_publico_operadora_ern() to public;
grant execute on function public.proteger_perfil_publico_operadora_ern() to service_role;

revoke all on function public.proteger_publicacao_operadora_ern() from public, anon, authenticated, service_role;
grant execute on function public.proteger_publicacao_operadora_ern() to anon;
grant execute on function public.proteger_publicacao_operadora_ern() to authenticated;
grant execute on function public.proteger_publicacao_operadora_ern() to public;
grant execute on function public.proteger_publicacao_operadora_ern() to service_role;

revoke all on function public.tem_acesso_editorial_ern() from public, anon, authenticated, service_role;
grant execute on function public.tem_acesso_editorial_ern() to authenticated;
grant execute on function public.tem_acesso_editorial_ern() to service_role;

revoke all on function public.tem_recurso_plano(p_recurso text) from public, anon, authenticated, service_role;
grant execute on function public.tem_recurso_plano(p_recurso text) to authenticated;
grant execute on function public.tem_recurso_plano(p_recurso text) to service_role;

revoke all on function public.usuario_tem_recurso_plano(p_recurso text) from public, anon, authenticated, service_role;
grant execute on function public.usuario_tem_recurso_plano(p_recurso text) to authenticated;
grant execute on function public.usuario_tem_recurso_plano(p_recurso text) to service_role;

revoke all on function public.validar_limite_clientes() from public, anon, authenticated, service_role;
grant execute on function public.validar_limite_clientes() to anon;
grant execute on function public.validar_limite_clientes() to authenticated;
grant execute on function public.validar_limite_clientes() to public;
grant execute on function public.validar_limite_clientes() to service_role;

revoke all on function public.validar_limite_passeios() from public, anon, authenticated, service_role;
grant execute on function public.validar_limite_passeios() to anon;
grant execute on function public.validar_limite_passeios() to authenticated;
grant execute on function public.validar_limite_passeios() to public;
grant execute on function public.validar_limite_passeios() to service_role;

revoke all on function public.validar_limite_reservas_mes() from public, anon, authenticated, service_role;
grant execute on function public.validar_limite_reservas_mes() to anon;
grant execute on function public.validar_limite_reservas_mes() to authenticated;
grant execute on function public.validar_limite_reservas_mes() to public;
grant execute on function public.validar_limite_reservas_mes() to service_role;

revoke all on function public.validar_limite_usuarios_empresa() from public, anon, authenticated, service_role;
grant execute on function public.validar_limite_usuarios_empresa() to anon;
grant execute on function public.validar_limite_usuarios_empresa() to authenticated;
grant execute on function public.validar_limite_usuarios_empresa() to public;
grant execute on function public.validar_limite_usuarios_empresa() to service_role;

revoke all on function public.validar_separacao_acessos_ern() from public, anon, authenticated, service_role;
grant execute on function public.validar_separacao_acessos_ern() to service_role;


-- ---------------------------------------------------------------------
-- 15. Comentários de documentação [14]
-- ---------------------------------------------------------------------
comment on function public.ern_criar_minha_operadora(p_nome_empresa text, p_nome_responsavel text, p_cidade text) is 'ERN: cadastro transacional da própria operadora; identidade obtida por auth.uid(); sem aprovação manual.';

comment on function public.ern_pode_acessar_modulo(p_modulo text) is 'Permissão por função da conta autenticada. Não substitui isolamento por empresa, limites do plano ou regras de cada operação.';

comment on table public.acessos_profissionais is 'Adesões individuais aos espaços de guia e fornecedor. Não concedem acesso empresarial nem representam verificação profissional.';

comment on table public.ern_feedbacks_v1 is 'Feedback privado da ERN. Envio e administração exclusivamente por API autorizada.';

comment on table public.ern_operacoes_assinatura_v1 is 'Operações persistentes de assinatura. Não liberar uma operação incerta sem reconciliar com o provedor.';

comment on column public.financeiro.data_liquidacao is 'Data efetiva do recebimento ou pagamento. NULL significa não informada; não deve ser substituída automaticamente pelo vencimento.';

comment on column public.guias.empresa_id is 'Operadora responsável por este registro operacional.';

comment on column public.guias.usuario_id is 'Autor do cadastro operacional; não representa o titular de um perfil individual de guia.';

comment on table public.perfis_profissionais is 'Cadastros individuais de guia e fornecedor. Dados privados do titular; publicação e verificação profissional exigem fluxos próprios.';

comment on column public.perfis_profissionais.cadastur is 'Registro informado pelo usuário. Seu preenchimento não representa verificação pela ERN.';

comment on column public.reservas.data_fim_prevista is 'Data prevista de término da operação. NULL significa não informada. Não comprova realização ou encerramento.';

comment on column public.reservas.horario_fim_previsto is 'Horário local previsto de término, seguindo a referência operacional America/Manaus. Exige data_fim_prevista.';

comment on table public.reservas_historico_ciclo is 'Histórico de status e período das reservas a partir da instalação. Não reconstrói alterações anteriores.';

comment on column public.reservas_historico_ciclo.usuario_id is 'Identificador retornado por auth.uid(). NULL indica execução sem usuário autenticado identificado, como manutenção administrativa.';

commit;

import { supabase } from '@/lib/supabase';

export type ContextoPerfilPublicoERN = {
  usuarioId: string;
  empresaId: string;
};

export type PerfilPublicoOperadoraERN = {
  id: string;
  slug: string;
  nome_publico: string;
  cidade: string;
  uf: string;
  descricao_curta: string | null;
  descricao_completa: string | null;
  logo_url: string | null;
  capa_url: string | null;
  whatsapp: string | null;
  instagram: string | null;
  site: string | null;
  idiomas: string[];
  especialidades: string[];
  publicado: boolean;
  verificado: boolean;
  destaque: boolean;
  territorio_id: string | null;
};

export type DadosPerfilPublicoERN = Omit<
  PerfilPublicoOperadoraERN,
  'id' | 'verificado' | 'destaque'
>;

const COLUNAS = 'id,slug,nome_publico,cidade,uf,descricao_curta,descricao_completa,logo_url,capa_url,whatsapp,instagram,site,idiomas,especialidades,publicado,verificado,destaque,territorio_id' as const;

export function erroPerfilPublicoERN(erro: unknown): string {
  if (erro instanceof Error) return erro.message;

  if (typeof erro === 'object' && erro !== null) {
    const falha = erro as { code?: string; message?: string };

    if (falha.code === '23505') {
      return (
        'O endereço público já está em uso ou a empresa já possui um perfil. ' +
        'Recarregue o cadastro antes de tentar novamente.'
      );
    }

    if (falha.code === '42501') {
      return 'Sua conta não tem permissão para realizar esta operação.';
    }

    if (falha.message) return falha.message;
  }

  return 'Não foi possível concluir a operação. Tente novamente.';
}

export async function contextoPerfilPublicoERN():
Promise<ContextoPerfilPublicoERN> {
  const { data: auth, error: erroAuth } = await supabase.auth.getUser();

  if (erroAuth || !auth.user) {
    throw new Error('Entre novamente para administrar o perfil público.');
  }

  const { data: perfil, error } = await supabase
    .from('perfis')
    .select('empresa_id,role')
    .eq('id', auth.user.id)
    .single();

  if (error || !perfil?.empresa_id) {
    throw new Error('Não foi possível identificar sua operadora.');
  }

  if (perfil.role !== 'admin_empresa') {
    throw new Error(
      'Somente administradores podem editar o perfil público da operadora.',
    );
  }

  return {
    usuarioId: auth.user.id,
    empresaId: String(perfil.empresa_id),
  };
}

async function validarContexto(
  esperado: ContextoPerfilPublicoERN,
): Promise<ContextoPerfilPublicoERN> {
  const atual = await contextoPerfilPublicoERN();

  if (
    atual.usuarioId !== esperado.usuarioId ||
    atual.empresaId !== esperado.empresaId
  ) {
    throw new Error(
      'A conta ou a empresa mudou. Recarregue a página antes de continuar.',
    );
  }

  return atual;
}

export async function carregarPerfilPublicoOperadoraERN(
  contexto: ContextoPerfilPublicoERN,
): Promise<PerfilPublicoOperadoraERN | null> {
  await validarContexto(contexto);

  const { data, error } = await supabase
    .from('perfis_publicos')
    .select(COLUNAS)
    .eq('empresa_id', contexto.empresaId)
    .eq('empresa_gestora_id', contexto.empresaId)
    .eq('origem_tipo', 'empresa')
    .eq('categoria', 'operadora')
    .limit(2);

  if (error) throw error;

  if ((data?.length ?? 0) > 1) {
    throw new Error('Há mais de um perfil para esta operadora.');
  }

  await validarContexto(contexto);

  return data?.length
    ? (data[0] as unknown as PerfilPublicoOperadoraERN)
    : null;
}

function textoLimitado(
  valor: string | null,
  nome: string,
  limite: number,
  obrigatorio = false,
): string {
  const texto = (valor ?? '').trim();

  if (obrigatorio && texto.length < 2) {
    throw new Error(`Preencha o campo ${nome}.`);
  }

  if (texto.length > limite) {
    throw new Error(`${nome}: utilize até ${limite} caracteres.`);
  }

  return texto;
}

function urlHttps(valor: string | null, nome: string): string | null {
  const texto = (valor ?? '').trim();
  if (!texto) return null;

  let url: URL;

  try {
    url = new URL(texto);
  } catch {
    throw new Error(`${nome}: informe um endereço completo com https://.`);
  }

  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    texto.length > 2000
  ) {
    throw new Error(`${nome}: informe um endereço HTTPS válido.`);
  }

  return url.href;
}

export function normalizarWhatsAppERN(valor: string | null): string | null {
  const texto = (valor ?? '').trim();
  if (!texto) return null;

  if (!/^\+?[\d\s().-]+$/.test(texto)) {
    throw new Error('WhatsApp: utilize somente o número, com DDI e DDD.');
  }

  const numero = texto.replace(/\D/g, '');

  if (!/^[1-9]\d{7,14}$/.test(numero)) {
    throw new Error('Informe o WhatsApp com DDI e DDD. Ex.: 5592999999999.');
  }

  return numero;
}

function listaValidada(valores: string[], nome: string): string[] {
  const lista = [...new Set(valores.map(valor => valor.trim()).filter(Boolean))];

  if (lista.length > 20 || lista.some(valor => valor.length > 100)) {
    throw new Error(`${nome}: use até 20 itens, com até 100 caracteres cada.`);
  }

  return lista;
}

export async function salvarPerfilPublicoOperadoraERN(
  contexto: ContextoPerfilPublicoERN,
  id: string,
  existente: boolean,
  dados: DadosPerfilPublicoERN,
): Promise<PerfilPublicoOperadoraERN> {
  await validarContexto(contexto);

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    throw new Error('Identificador do perfil inválido. Recarregue a página.');
  }

  const slug = dados.slug.trim().toLowerCase();

  if (
    slug.length < 3 ||
    slug.length > 100 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    throw new Error(
      'Endereço público: use de 3 a 100 caracteres, com letras sem acentos, números e hífens.',
    );
  }

  const uf = dados.uf.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(uf)) {
    throw new Error('Informe a UF com duas letras.');
  }

  const whatsapp = normalizarWhatsAppERN(dados.whatsapp);

  if (dados.publicado && !whatsapp) {
    throw new Error('Informe o WhatsApp comercial antes de publicar o perfil.');
  }

  const payload = {
    slug,
    nome_publico: textoLimitado(dados.nome_publico, 'Nome público', 150, true),
    cidade: textoLimitado(dados.cidade, 'Cidade', 120, true),
    uf,
    descricao_curta:
      textoLimitado(dados.descricao_curta, 'Apresentação curta', 300) || null,
    descricao_completa:
      textoLimitado(dados.descricao_completa, 'Apresentação completa', 5000) ||
      null,
    logo_url: urlHttps(dados.logo_url, 'Logo'),
    capa_url: urlHttps(dados.capa_url, 'Capa'),
    whatsapp,
    instagram: urlHttps(dados.instagram, 'Instagram'),
    site: urlHttps(dados.site, 'Site'),
    idiomas: listaValidada(dados.idiomas, 'Idiomas'),
    especialidades: listaValidada(dados.especialidades, 'Especialidades'),
    publicado: dados.publicado,
    territorio_id: dados.territorio_id || null,
  };

  const consulta = existente
    ? supabase
        .from('perfis_publicos')
        .update(payload)
        .eq('id', id)
        .eq('empresa_id', contexto.empresaId)
        .eq('empresa_gestora_id', contexto.empresaId)
        .eq('origem_tipo', 'empresa')
        .eq('categoria', 'operadora')
    : supabase.from('perfis_publicos').insert({
        ...payload,
        id,
        empresa_id: contexto.empresaId,
        empresa_gestora_id: contexto.empresaId,
        origem_tipo: 'empresa',
        categoria: 'operadora',
      });

  const { data, error } = await consulta.select(COLUNAS).single();

  if (error) throw error;

  if (!data || data.id !== id) {
    throw new Error(
      'Não foi possível confirmar a gravação. Recarregue o perfil antes de repetir.',
    );
  }

  await validarContexto(contexto);

  return data as unknown as PerfilPublicoOperadoraERN;
}

export async function enviarImagemPerfilPublicoERN(
  contexto: ContextoPerfilPublicoERN,
  arquivo: File,
  finalidade: 'logo' | 'capa',
): Promise<string> {
  await validarContexto(contexto);

  const formatos: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };

  const extensao = formatos[arquivo.type];

  if (!extensao || arquivo.size === 0 || arquivo.size > 5 * 1024 * 1024) {
    throw new Error('Escolha uma imagem JPEG, PNG ou WebP de até 5 MB.');
  }

  const caminho =
    `${contexto.empresaId}/${finalidade}-${crypto.randomUUID()}.${extensao}`;

  const { error } = await supabase.storage
    .from('rede-publica')
    .upload(caminho, arquivo, {
      upsert: false,
      contentType: arquivo.type,
      cacheControl: '3600',
    });

  if (error) throw error;

  await validarContexto(contexto);

  const { data } = supabase.storage
    .from('rede-publica')
    .getPublicUrl(caminho);

  return data.publicUrl;
}

export function linkWhatsAppPerfilERN(
  numero: string | null,
  nomeOperadora: string,
): string | null {
  const normalizado = normalizarWhatsAppERN(numero);
  if (!normalizado) return null;

  const mensagem =
    `Olá! Encontrei a ${nomeOperadora} na Rede ERN ` +
    'e gostaria de informações sobre suas experiências no Rio Negro.';

  return `https://wa.me/${normalizado}?text=${encodeURIComponent(mensagem)}`;
}
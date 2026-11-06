import type { Metadata } from 'next';

// Prévia de compartilhamento (WhatsApp, Facebook, Google) das páginas da Rede.
// Usa a chave pública: o RLS só devolve perfis e publicações publicados.

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
const CHAVE = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
const SLUG_VALIDO = /^[a-z0-9-]{1,120}$/;

async function consultar<T>(caminho: string): Promise<T | null> {
  if (!URL_BASE || !CHAVE) return null;
  try {
    const resposta = await fetch(`${URL_BASE}/rest/v1/${caminho}`, {
      headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` },
      next: { revalidate: 300 },
    });
    if (!resposta.ok) return null;
    const linhas = (await resposta.json()) as T[];
    return linhas[0] ?? null;
  } catch {
    return null;
  }
}

function resumir(texto: string | null | undefined, limite = 180): string | undefined {
  const limpo = texto?.replace(/\s+/g, ' ').trim();
  if (!limpo) return undefined;
  return limpo.length > limite ? `${limpo.slice(0, limite - 1)}…` : limpo;
}

function imagemSegura(url: string | null | undefined): string | undefined {
  return url && url.startsWith('https://') ? url : undefined;
}

// Mídias da Rede ficam no bucket privado "vivencias-ern". O RLS do Storage só
// permite assinar arquivos de publicações publicadas; o link vale 7 dias e é
// renovado junto com a página (revalidate).
const PREFIXO_PRIVADO = 'vivencias-ern/';

async function resolverImagem(url: string | null | undefined): Promise<string | undefined> {
  if (!url) return undefined;
  if (!url.startsWith(PREFIXO_PRIVADO)) return imagemSegura(url);
  if (!URL_BASE || !CHAVE) return undefined;
  try {
    const caminho = url.slice(PREFIXO_PRIVADO.length).split('/').map(encodeURIComponent).join('/');
    const resposta = await fetch(`${URL_BASE}/storage/v1/object/sign/vivencias-ern/${caminho}`, {
      method: 'POST',
      headers: {
        apikey: CHAVE,
        Authorization: `Bearer ${CHAVE}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: 604800 }),
      next: { revalidate: 300 },
    });
    if (!resposta.ok) return undefined;
    const { signedURL } = (await resposta.json()) as { signedURL?: string };
    return signedURL ? `${URL_BASE}/storage/v1${signedURL}` : undefined;
  } catch {
    return undefined;
  }
}

// Versão leve (≈100 KB) da foto para a prévia, via otimizador de imagens.
function imagemLeve(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return `/_next/image?url=${encodeURIComponent(url)}&w=640&q=75`;
}

function montar(
  titulo: string,
  descricao: string | undefined,
  imagem: string | undefined,
  caminho: string,
  tipo: 'article' | 'profile',
): Metadata {
  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: caminho },
    openGraph: {
      type: tipo,
      title: titulo,
      description: descricao,
      url: caminho,
      siteName: 'Encantos da Amazônia',
      locale: 'pt_BR',
      images: imagem ? [{ url: imagemLeve(imagem)!, width: 640 }] : undefined,
    },
    twitter: {
      card: imagem ? 'summary_large_image' : 'summary',
      title: titulo,
      description: descricao,
      images: imagem ? [imagemLeve(imagem)!] : undefined,
    },
  };
}

type Perfil = {
  nome_publico: string | null;
  descricao_curta: string | null;
  cidade: string | null;
  uf: string | null;
  capa_url: string | null;
  logo_url: string | null;
};

export async function metadadosPerfilRede(slug: string): Promise<Metadata> {
  if (!SLUG_VALIDO.test(slug)) return { title: 'Perfil da Rede EDA' };
  const p = await consultar<Perfil>(
    `perfis_publicos?select=nome_publico,descricao_curta,cidade,uf,capa_url,logo_url&slug=eq.${slug}&publicado=eq.true&limit=1`,
  );
  if (!p?.nome_publico) return { title: 'Perfil da Rede EDA' };
  const local = [p.cidade, p.uf].filter(Boolean).join(' - ');
  const descricao =
    resumir(p.descricao_curta) ??
    `${p.nome_publico}${local ? ` em ${local}` : ''} na Rede Encantos da Amazônia.`;
  return montar(
    p.nome_publico,
    descricao,
    (await resolverImagem(p.capa_url)) ?? (await resolverImagem(p.logo_url)),
    `/rede/perfil/${slug}`,
    'profile',
  );
}

type Publicacao = {
  titulo: string | null;
  resumo: string | null;
  conteudo: string | null;
  autor: { nome_publico: string | null } | null;
  publicacao_midias: { url: string | null; thumbnail_url: string | null; tipo: string | null; ordem: number | null }[] | null;
};

export async function metadadosPublicacaoRede(slug: string): Promise<Metadata> {
  if (!SLUG_VALIDO.test(slug)) return { title: 'Publicação da Rede EDA' };
  const p = await consultar<Publicacao>(
    `publicacoes?select=titulo,resumo,conteudo,autor:perfis_publicos!autor_perfil_id(nome_publico),publicacao_midias(url,thumbnail_url,tipo,ordem)&slug=eq.${slug}&status=eq.publicado&limit=1`,
  );
  if (!p?.titulo) return { title: 'Publicação da Rede EDA' };
  const midias = [...(p.publicacao_midias ?? [])].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const origem =
    midias.find((m) => m.tipo === 'imagem' && m.url)?.url ??
    midias.map((m) => m.thumbnail_url).find(Boolean);
  const capa = await resolverImagem(origem);
  const autor = p.autor?.nome_publico;
  const descricao = resumir(p.resumo) ?? resumir(p.conteudo);
  return montar(
    autor ? `${p.titulo} · ${autor}` : p.titulo,
    descricao,
    capa,
    `/rede/publicacao/${slug}`,
    'article',
  );
}

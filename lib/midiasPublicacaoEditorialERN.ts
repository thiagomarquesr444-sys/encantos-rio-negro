import { supabase } from '@/lib/supabase';
import {
  carregarPerfilPublicoEditorialERN,
  type ContextoPerfilPublicoERN,
} from '@/lib/perfilPublicoEditorialERN';

export type MidiaPublicacaoERN = {
  id: string;
  publicacao_id: string;
  tipo: 'imagem' | 'video';
  url: string;
  thumbnail_url: string | null;
  alt_text: string | null;
  credito: string | null;
  consentimento_confirmado: boolean;
  ordem: number;
};

const COLUNAS =
  'id,publicacao_id,tipo,url,thumbnail_url,alt_text,credito,consentimento_confirmado,ordem' as const;

async function validarPublicacao(
  contexto: ContextoPerfilPublicoERN,
  publicacaoId: string,
  exigirRascunho: boolean,
) {
  const perfil = await carregarPerfilPublicoEditorialERN(contexto);

  if (!perfil) {
    throw new Error('Perfil público do editorial não encontrado.');
  }

  const { data, error } = await supabase
    .from('publicacoes')
    .select('id,status')
    .eq('id', publicacaoId)
    .eq('autor_perfil_id', perfil.id)
    .single();

  if (error) throw error;

  if (!data || (exigirRascunho && data.status !== 'rascunho')) {
    throw new Error('Selecione um rascunho salvo para adicionar imagens.');
  }

  return data;
}

export async function listarMidiasPublicacaoEditorialERN(
  contexto: ContextoPerfilPublicoERN,
  publicacaoId: string,
): Promise<MidiaPublicacaoERN[]> {
  await validarPublicacao(contexto, publicacaoId, false);

  const { data, error } = await supabase
    .from('publicacao_midias')
    .select(COLUNAS)
    .eq('publicacao_id', publicacaoId)
    .order('ordem', { ascending: true })
    .order('id', { ascending: true })
    .limit(101);

  if (error) throw error;

  if ((data?.length ?? 0) > 100) {
    throw new Error('Esta publicação exige uma galeria paginada.');
  }

  await validarPublicacao(contexto, publicacaoId, false);

  return (data ?? []) as MidiaPublicacaoERN[];
}

export async function enviarImagemPublicacaoERN(
  contexto: ContextoPerfilPublicoERN,
  publicacaoId: string,
  arquivo: File,
  descricao: string,
  credito: string,
  consentimento: boolean,
): Promise<MidiaPublicacaoERN> {
  const formatos: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };

  const extensao = formatos[arquivo.type];
  const alt = descricao.trim();
  const autoria = credito.trim();

  if (!extensao || arquivo.size <= 0 || arquivo.size > 5 * 1024 * 1024) {
    throw new Error('Escolha uma imagem JPEG, PNG ou WebP de até 5 MB.');
  }

  if (!alt || alt.length > 500) {
    throw new Error('Descreva a imagem em até 500 caracteres.');
  }

  if (autoria.length > 300) {
    throw new Error('Informe os créditos em até 300 caracteres.');
  }

  if (!consentimento) {
    throw new Error('Confirme que possui autorização para divulgar a imagem.');
  }

  await validarPublicacao(contexto, publicacaoId, true);

  const id = crypto.randomUUID();
  const caminho =
    `${contexto.pastaMidias}/publicacoes/${publicacaoId}/${id}.${extensao}`;

  const { error: erroUpload } = await supabase.storage
    .from('rede-publica')
    .upload(caminho, arquivo, {
      upsert: false,
      contentType: arquivo.type,
      cacheControl: '3600',
    });

  if (erroUpload) throw erroUpload;

  try {
    await validarPublicacao(contexto, publicacaoId, true);

    const { data: endereco } = supabase.storage
      .from('rede-publica')
      .getPublicUrl(caminho);

    const { data, error } = await supabase
      .from('publicacao_midias')
      .insert({
        id,
        publicacao_id: publicacaoId,
        tipo: 'imagem',
        url: endereco.publicUrl,
        alt_text: alt,
        credito: autoria || null,
        consentimento_confirmado: true,
        ordem: 0,
      })
      .select(COLUNAS)
      .single();

    if (error) throw error;

    if (!data || data.id !== id) {
      throw new Error('Não foi possível confirmar a imagem.');
    }

    await validarPublicacao(contexto, publicacaoId, true);

    return data as MidiaPublicacaoERN;
  } catch {
    // Uma falha na resposta não comprova que a inserção falhou.
    // Preserva o arquivo para não quebrar uma imagem já registrada.
    throw new Error(
      'O arquivo foi enviado, mas não foi possível confirmar seu vínculo. ' +
      'Atualize a galeria antes de tentar novamente.',
    );
  }
}
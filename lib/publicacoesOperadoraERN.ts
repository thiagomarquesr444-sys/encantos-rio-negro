import { supabase } from '@/lib/supabase';
import {
  carregarPerfilPublicoOperadoraERN,
  type ContextoPerfilPublicoERN,
} from '@/lib/perfilPublicoOperadoraERN';

export type TipoPublicacaoERN =
  | 'conteudo'
  | 'oferta'
  | 'roteiro'
  | 'evento'
  | 'aviso'
  | 'dica';

export type StatusPublicacaoERN =
  | 'rascunho'
  | 'em_revisao'
  | 'publicado'
  | 'arquivado'
  | 'rejeitado';

export type PublicacaoOperadoraERN = {
  id: string;
  autor_perfil_id: string;
  slug: string;
  tipo: TipoPublicacaoERN;
  titulo: string;
  resumo: string | null;
  conteudo: string | null;
  idioma_original: 'pt' | 'en' | 'es';
  localidade_texto: string | null;
  status: StatusPublicacaoERN;
  permitir_interacoes: boolean;
  publicado_em: string | null;
  created_at: string;
  updated_at: string;
};

export type DadosPublicacaoOperadoraERN = {
  titulo: string;
  resumo: string;
  conteudo: string;
  tipo: TipoPublicacaoERN;
  idioma_original: 'pt' | 'en' | 'es';
  localidade_texto: string;
  permitir_interacoes: boolean;
};

const COLUNAS =
  'id,autor_perfil_id,slug,tipo,titulo,resumo,conteudo,idioma_original,localidade_texto,status,permitir_interacoes,publicado_em,created_at,updated_at' as const;

const TIPOS: TipoPublicacaoERN[] = [
  'conteudo', 'oferta', 'roteiro', 'evento', 'aviso', 'dica',
];

async function obterPerfil(contexto: ContextoPerfilPublicoERN) {
  const perfil = await carregarPerfilPublicoOperadoraERN(contexto);

  if (!perfil) {
    throw new Error('Salve o perfil público da operadora primeiro.');
  }

  return perfil;
}

function texto(
  valor: string,
  nome: string,
  limite: number,
  minimo = 0,
): string {
  const resultado = valor.trim();

  if (resultado.length < minimo || resultado.length > limite) {
    throw new Error(
      `${nome}: utilize entre ${minimo} e ${limite} caracteres.`,
    );
  }

  return resultado;
}

export function erroPublicacaoERN(erro: unknown): string {
  if (erro instanceof Error) return erro.message;

  if (typeof erro === 'object' && erro !== null) {
    const falha = erro as { code?: string };

    if (falha.code === '42501') {
      return 'Sua conta não tem permissão para alterar esta publicação.';
    }

    if (falha.code === '23505') {
      return 'Este registro já existe. Atualize a listagem antes de repetir.';
    }
  }

  return 'Não foi possível concluir. Confira a listagem antes de tentar novamente.';
}

export async function listarPublicacoesOperadoraERN(
  contexto: ContextoPerfilPublicoERN,
  pagina = 0,
) {
  if (!Number.isSafeInteger(pagina) || pagina < 0) {
    throw new Error('Página inválida.');
  }

  const perfil = await obterPerfil(contexto);
  const inicio = pagina * 20;

  const { data, error } = await supabase
    .from('publicacoes')
    .select(COLUNAS)
    .eq('autor_perfil_id', perfil.id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(inicio, inicio + 20);

  if (error) throw error;

  await obterPerfil(contexto);

  return {
    itens: (data ?? []).slice(0, 20) as PublicacaoOperadoraERN[],
    temProxima: (data?.length ?? 0) > 20,
  };
}

export async function salvarRascunhoOperadoraERN(
  contexto: ContextoPerfilPublicoERN,
  id: string,
  existente: boolean,
  dados: DadosPublicacaoOperadoraERN,
): Promise<PublicacaoOperadoraERN> {
  const perfil = await obterPerfil(contexto);

  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error('Identificador inválido. Reabra a publicação.');
  }

  if (
    !TIPOS.includes(dados.tipo) ||
    !['pt', 'en', 'es'].includes(dados.idioma_original)
  ) {
    throw new Error('Tipo ou idioma inválido.');
  }

  const payload = {
    titulo: texto(dados.titulo, 'Título', 220, 3),
    resumo: texto(dados.resumo, 'Resumo', 600) || null,
    conteudo: texto(dados.conteudo, 'Texto', 50000) || null,
    localidade_texto:
      texto(dados.localidade_texto, 'Localidade', 300) || null,
    tipo: dados.tipo,
    idioma_original: dados.idioma_original,
    permitir_interacoes: dados.permitir_interacoes,
    status: 'rascunho',
  };

  const consulta = existente
    ? supabase
        .from('publicacoes')
        .update(payload)
        .eq('id', id)
        .eq('autor_perfil_id', perfil.id)
        .eq('status', 'rascunho')
    : supabase.from('publicacoes').insert({
        ...payload,
        id,
        autor_perfil_id: perfil.id,
        slug: `publicacao-${id}`,
      });

  const { data, error } = await consulta.select(COLUNAS).single();

  if (error) throw error;

  if (!data || data.id !== id) {
    throw new Error('Não foi possível confirmar o rascunho. Consulte a listagem.');
  }

  await obterPerfil(contexto);

  return data as PublicacaoOperadoraERN;
}
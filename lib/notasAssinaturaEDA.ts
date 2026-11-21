// EDA_NOTAS_ASSINATURA_V1: NFS-e da Encantos da Amazônia AI (CNPJ próprio)
// sobre as assinaturas Pro/Plus pagas. A nota só é enviada ao Asaas depois
// do aval do CEO (Tupã pede o aval). Escrita apenas no servidor.

import type { SupabaseClient } from '@supabase/supabase-js';

export type StatusNotaAssinaturaEDA =
  | 'aguardando_aval'
  | 'enviando'
  | 'agendada'
  | 'autorizada'
  | 'erro'
  | 'cancelada'
  | 'recusada';

export const ROTULO_STATUS_NOTA_EDA: Record<StatusNotaAssinaturaEDA, string> = {
  aguardando_aval: 'Aguardando seu aval',
  enviando: 'Enviando ao emissor',
  agendada: 'Em emissão',
  autorizada: 'Autorizada',
  erro: 'Falha na emissão',
  cancelada: 'Cancelada',
  recusada: 'Não emitida',
};

const ROTULO_CICLO: Record<string, string> = {
  mensal: 'mensal',
  trimestral: 'trimestral',
  anual: 'anual',
};

/** Mapeia o status da nota no Asaas para o status interno. */
export function statusNotaPorAsaasEDA(statusAsaas: unknown): StatusNotaAssinaturaEDA | null {
  switch (String(statusAsaas ?? '').toUpperCase()) {
    case 'AUTHORIZED':
      return 'autorizada';
    case 'ERROR':
      return 'erro';
    case 'CANCELED':
    case 'CANCELLED':
      return 'cancelada';
    case 'SCHEDULED':
    case 'SYNCHRONIZED':
    case 'PROCESSING_CANCELLATION':
    case 'CANCELLATION_DENIED':
      return 'agendada';
    default:
      return null;
  }
}

/** Só aceita links https do próprio Asaas para PDF/XML da nota. */
export function linkSeguroAsaasEDA(valor: unknown): string | null {
  if (typeof valor !== 'string' || valor.length > 1000) return null;
  try {
    const url = new URL(valor);
    if (url.protocol !== 'https:') return null;
    if (url.hostname !== 'asaas.com' && !url.hostname.endsWith('.asaas.com')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

type CobrancaPaga = {
  id: string;
  empresa_id: string;
  plano_id?: string | null;
  valor: unknown;
  ciclo_cobranca?: string | null;
};

/**
 * Registra a nota "aguardando aval" de uma cobrança de assinatura paga.
 * Idempotente (uma nota por cobrança). Nunca derruba o webhook: falha só é registrada no log.
 */
export async function registrarNotaAssinaturaEDA(
  admin: SupabaseClient,
  cobranca: CobrancaPaga,
  provedorCobrancaId: string
): Promise<void> {
  try {
    const valor = Number(cobranca.valor);
    if (!Number.isFinite(valor) || valor <= 0 || !provedorCobrancaId) return;

    let nomePlano = 'Pro';
    if (cobranca.plano_id) {
      const { data: plano } = await admin
        .from('planos')
        .select('nome')
        .eq('id', cobranca.plano_id)
        .maybeSingle();
      if (plano?.nome) nomePlano = String(plano.nome).slice(0, 60);
    }

    const ciclo = ROTULO_CICLO[String(cobranca.ciclo_cobranca ?? '')] ?? 'mensal';
    const descricao =
      `Assinatura da plataforma Encantos da Amazônia AI – plano ${nomePlano} (${ciclo}). ` +
      'Licenciamento de direito de uso de programa de computação.';

    const { error } = await admin
      .from('eda_notas_assinatura_v1')
      .upsert(
        {
          empresa_id: cobranca.empresa_id,
          cobranca_id: cobranca.id,
          provedor_cobranca_id: provedorCobrancaId,
          valor: Math.round(valor * 100) / 100,
          descricao,
        },
        { onConflict: 'cobranca_id', ignoreDuplicates: true }
      );

    if (error) console.error('[EDA NOTAS] Não foi possível registrar a nota pendente.', error.code);
  } catch {
    console.error('[EDA NOTAS] Falha inesperada ao registrar a nota pendente.');
  }
}

type PayloadNotaAsaas = {
  id?: unknown;
  status?: unknown;
  number?: unknown;
  pdfUrl?: unknown;
  xmlUrl?: unknown;
  statusDescription?: unknown;
};

/** Atualiza a nota a partir de um evento INVOICE_* do Asaas. */
export async function atualizarNotaPorEventoAsaasEDA(
  admin: SupabaseClient,
  nota: PayloadNotaAsaas | null | undefined
): Promise<{ atualizada: boolean }> {
  const notaId = typeof nota?.id === 'string' ? nota.id : null;
  const status = statusNotaPorAsaasEDA(nota?.status);
  if (!notaId || !status) return { atualizada: false };

  const atualizacao: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (typeof nota?.number === 'string' || typeof nota?.number === 'number') {
    atualizacao.numero = String(nota.number).slice(0, 40);
  }
  const pdf = linkSeguroAsaasEDA(nota?.pdfUrl);
  const xml = linkSeguroAsaasEDA(nota?.xmlUrl);
  if (pdf) atualizacao.pdf_url = pdf;
  if (xml) atualizacao.xml_url = xml;
  atualizacao.erro_mensagem =
    status === 'erro' && typeof nota?.statusDescription === 'string'
      ? nota.statusDescription.slice(0, 500)
      : null;

  const { data, error } = await admin
    .from('eda_notas_assinatura_v1')
    .update(atualizacao)
    .eq('asaas_nota_id', notaId)
    .select('id');

  if (error) throw new Error('Não foi possível atualizar a nota fiscal.');
  return { atualizada: (data?.length ?? 0) > 0 };
}

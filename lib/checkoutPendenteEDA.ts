/*
  EDA_CHECKOUT_PENDENTE_V1
  Uso exclusivo no servidor (rotas de API e cron): usa a chave do Asaas.
  - buscarCheckoutPendenteEDA: contratação aguardando pagamento + link da fatura.
  - desistirCheckoutEDA: remove a assinatura pendente no Asaas e libera a empresa.
*/
import type { SupabaseClient } from '@supabase/supabase-js';

const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_API_URL = (
  process.env.ASAAS_API_URL ?? 'https://api-sandbox.asaas.com/v3'
).replace(/\/+$/, '');

const ESTADOS_PENDENTES = ['reservado', 'em_envio', 'aguardando_pagamento', 'reconciliar'];
const STATUS_NAO_PAGOS = ['PENDING', 'OVERDUE'];

type CobrancaAsaasEDA = {
  id?: string;
  status?: string;
  value?: number;
  dueDate?: string;
  invoiceUrl?: string;
};

export type CheckoutPendenteEDA = {
  operacao_id: string;
  assinatura_asaas_id: string | null;
  plano_id: string;
  plano_nome: string | null;
  ciclo: string;
  valor: number;
  criado_em: string;
  vencimento: string | null;
  link_pagamento: string | null;
};

function cabecalhosAsaas() {
  if (!ASAAS_API_KEY) throw new Error('ASAAS_API_KEY não configurada.');
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'EncantosRioNegro/1.0',
    access_token: ASAAS_API_KEY,
  };
}

function linkAsaasSeguro(url: unknown) {
  const texto = String(url ?? '');
  return /^https:\/\/([a-z0-9-]+\.)*asaas\.com\//i.test(texto) ? texto : null;
}

async function listarCobrancasAssinatura(assinaturaAsaasId: string) {
  const r = await fetch(
    `${ASAAS_API_URL}/subscriptions/${encodeURIComponent(assinaturaAsaasId)}/payments`,
    { method: 'GET', headers: cabecalhosAsaas(), cache: 'no-store' }
  );
  if (r.status === 404) return { encontrada: false, cobrancas: [] as CobrancaAsaasEDA[] };
  if (!r.ok) throw new Error(`Asaas indisponível ao listar cobranças (${r.status}).`);
  const corpo = (await r.json()) as { data?: CobrancaAsaasEDA[] };
  return { encontrada: true, cobrancas: Array.isArray(corpo.data) ? corpo.data : [] };
}

export async function buscarCheckoutPendenteEDA(
  admin: SupabaseClient,
  empresaId: string
): Promise<CheckoutPendenteEDA | null> {
  const { data: op, error } = await admin
    .from('ern_operacoes_assinatura_v1')
    .select('id, plano_id, ciclo, valor, provedor_assinatura_id, criado_em')
    .eq('empresa_id', empresaId)
    .eq('tipo', 'checkout')
    .in('estado', ESTADOS_PENDENTES)
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error('Não foi possível consultar a contratação pendente.');
  if (!op) return null;

  const { data: plano } = await admin
    .from('planos')
    .select('nome')
    .eq('id', op.plano_id)
    .maybeSingle();

  let link: string | null = null;
  let vencimento: string | null = null;
  if (op.provedor_assinatura_id) {
    const { cobrancas } = await listarCobrancasAssinatura(op.provedor_assinatura_id);
    const aberta = cobrancas.find((c) =>
      STATUS_NAO_PAGOS.includes(String(c.status ?? '').toUpperCase())
    );
    link = linkAsaasSeguro(aberta?.invoiceUrl);
    vencimento = aberta?.dueDate ?? null;
  }

  return {
    operacao_id: op.id,
    assinatura_asaas_id: op.provedor_assinatura_id ?? null,
    plano_id: op.plano_id,
    plano_nome: plano?.nome ?? null,
    ciclo: op.ciclo,
    valor: Number(op.valor),
    criado_em: op.criado_em,
    vencimento,
    link_pagamento: link,
  };
}

export type ResultadoDesistenciaEDA =
  | { ok: true }
  | { ok: false; codigo: string; mensagem: string };

export async function desistirCheckoutEDA(
  admin: SupabaseClient,
  pendente: Pick<CheckoutPendenteEDA, 'operacao_id' | 'assinatura_asaas_id'>
): Promise<ResultadoDesistenciaEDA> {
  const assinaturaId = pendente.assinatura_asaas_id;

  // Sem assinatura no Asaas, o checkout ainda está sendo criado (ou em
  // recuperação pelo cron). Não interfere para não gerar cobrança órfã.
  if (!assinaturaId) {
    return {
      ok: false,
      codigo: 'ERN_CHECKOUT_EM_PROCESSAMENTO',
      mensagem: 'A contratação ainda está sendo processada. Tente novamente em alguns minutos.',
    };
  }

  {
    // Nunca desfaz uma contratação com pagamento em andamento ou concluído.
    const { encontrada, cobrancas } = await listarCobrancasAssinatura(assinaturaId);
    const emPagamento = cobrancas.some(
      (c) => !STATUS_NAO_PAGOS.includes(String(c.status ?? '').toUpperCase())
    );
    if (emPagamento) {
      return {
        ok: false,
        codigo: 'ERN_PAGAMENTO_EM_ANDAMENTO',
        mensagem:
          'O pagamento desta contratação já foi iniciado. Aguarde a confirmação; o plano será liberado automaticamente.',
      };
    }

    if (encontrada) {
      const r = await fetch(
        `${ASAAS_API_URL}/subscriptions/${encodeURIComponent(assinaturaId)}`,
        { method: 'DELETE', headers: cabecalhosAsaas(), cache: 'no-store' }
      );
      if (!r.ok && r.status !== 404) {
        throw new Error(`Asaas recusou a remoção da assinatura pendente (${r.status}).`);
      }
    }
  }

  const { data, error } = await admin.rpc('ern_desistir_checkout_v1', {
    p_operacao_id: pendente.operacao_id,
    p_provedor_assinatura_id: assinaturaId,
  });
  if (error || data?.ok !== true) {
    throw new Error(
      `Cobrança removida no Asaas, mas a liberação local falhou (${data?.codigo ?? error?.message ?? 'desconhecido'}).`
    );
  }
  return { ok: true };
}

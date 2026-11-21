// EDA_NOTAS_ASSINATURA_V1: aval do CEO para emitir (ou não) a NFS-e da
// Encantos sobre uma assinatura paga. Só a conta do CEO (Comando EDA) opera.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { linkSeguroAsaasEDA, statusNotaPorAsaasEDA } from '@/lib/notasAssinaturaEDA';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LIMITE_BYTES = 1024;

const ASAAS_API_KEY = process.env.ASAAS_API_KEY?.trim();
const ASAAS_API_URL = (process.env.ASAAS_API_URL ?? 'https://api-sandbox.asaas.com/v3').replace(/\/+$/, '');

// Trava: nada vai ao Asaas até a configuração fiscal (Portal Nacional) estar pronta.
const EMISSAO_HABILITADA = process.env.NFSE_CASA_HABILITADA?.trim() === 'true';
const CODIGO_SERVICO = process.env.ASAAS_NFSE_CODIGO_SERVICO?.trim() || '01.05.01';
const NOME_SERVICO =
  process.env.ASAAS_NFSE_NOME_SERVICO?.trim() ||
  'Licenciamento ou cessão de direito de uso de programas de computação';
const ALIQUOTA_ISS = (() => {
  const n = Number(process.env.ASAAS_NFSE_ALIQUOTA_ISS ?? '2');
  return Number.isFinite(n) && n >= 0 && n <= 5 ? n : 2;
})();

class Falha extends Error {
  constructor(msg: string, readonly status: number, readonly codigo: string) {
    super(msg);
  }
}

function responder(dados: Record<string, unknown>, status = 200) {
  return NextResponse.json(dados, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' },
  });
}

function hojeManaus(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Manaus' }).format(new Date());
}

async function lerCorpo(request: NextRequest): Promise<{ nota_id: string; acao: 'emitir' | 'recusar' }> {
  const tipo = request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  if (tipo !== 'application/json') throw new Falha('Envie um objeto JSON.', 415, 'EDA_NOTA_TIPO');
  const texto = await request.text();
  if (texto.length > LIMITE_BYTES) throw new Falha('Requisição grande demais.', 413, 'EDA_NOTA_CORPO');
  let corpo: unknown;
  try {
    corpo = JSON.parse(texto);
  } catch {
    throw new Falha('JSON inválido.', 400, 'EDA_NOTA_JSON');
  }
  const c = (corpo ?? {}) as Record<string, unknown>;
  if (
    typeof c.nota_id !== 'string' ||
    !UUID_RE.test(c.nota_id) ||
    (c.acao !== 'emitir' && c.acao !== 'recusar') ||
    Object.keys(c).length !== 2
  ) {
    throw new Falha('Pedido inválido.', 400, 'EDA_NOTA_PEDIDO');
  }
  return { nota_id: c.nota_id.toLowerCase(), acao: c.acao };
}

export async function POST(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !anon || !service) throw new Falha('Configuração indisponível.', 503, 'EDA_NOTA_CONFIG');

    const token = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) throw new Falha('Sessão não informada.', 401, 'EDA_NOTA_SESSAO');

    const opcoes = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
    const usuarioCliente = createClient(url, anon, {
      ...opcoes,
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const admin = createClient(url, service, opcoes);

    const { data: auth, error: erroAuth } = await usuarioCliente.auth.getUser(token);
    if (erroAuth || !auth.user) throw new Falha('Sessão inválida ou expirada.', 401, 'EDA_NOTA_SESSAO');

    // Só o CEO (conta da casa / Comando EDA) dá o aval.
    const { data: ehCeo, error: erroCeo } = await usuarioCliente.rpc('ern_eh_ceo_v1');
    if (erroCeo || ehCeo !== true) throw new Falha('Operação restrita ao Comando EDA.', 403, 'EDA_NOTA_PERMISSAO');

    const { nota_id, acao } = await lerCorpo(request);
    const agora = new Date().toISOString();

    if (acao === 'recusar') {
      const { data, error } = await admin
        .from('eda_notas_assinatura_v1')
        .update({ status: 'recusada', aval_por: auth.user.id, aval_em: agora, updated_at: agora })
        .eq('id', nota_id)
        .in('status', ['aguardando_aval', 'erro'])
        .is('asaas_nota_id', null)
        .select('id');
      if (error) throw new Falha('Não foi possível registrar a decisão.', 503, 'EDA_NOTA_BANCO');
      if (!data?.length) throw new Falha('Esta nota não está mais aguardando aval.', 409, 'EDA_NOTA_ESTADO');
      return responder({ ok: true, status: 'recusada' });
    }

    if (!EMISSAO_HABILITADA || !ASAAS_API_KEY) {
      throw new Falha(
        'A emissão ainda está desligada: falta concluir a configuração fiscal no Asaas.',
        503,
        'EDA_NOTA_DESLIGADA'
      );
    }

    // Trava atômica contra clique duplo: só uma requisição passa de aguardando/erro para enviando.
    const { data: travada, error: erroTrava } = await admin
      .from('eda_notas_assinatura_v1')
      .update({ status: 'enviando', aval_por: auth.user.id, aval_em: agora, erro_mensagem: null, updated_at: agora })
      .eq('id', nota_id)
      .in('status', ['aguardando_aval', 'erro'])
      .is('asaas_nota_id', null)
      .select('id, provedor_cobranca_id, valor, descricao')
      .maybeSingle();
    if (erroTrava) throw new Falha('Não foi possível reservar a emissão.', 503, 'EDA_NOTA_BANCO');
    if (!travada) throw new Falha('Esta nota não está mais aguardando aval.', 409, 'EDA_NOTA_ESTADO');

    const corpoAsaas = {
      payment: travada.provedor_cobranca_id,
      serviceDescription: travada.descricao,
      observations: 'Nota emitida pela Encantos da Amazônia AI.',
      value: Number(travada.valor),
      deductions: 0,
      effectiveDate: hojeManaus(),
      municipalServiceCode: CODIGO_SERVICO,
      municipalServiceName: NOME_SERVICO,
      externalReference: travada.id,
      taxes: { retainIss: false, iss: ALIQUOTA_ISS, cofins: 0, csll: 0, inss: 0, ir: 0, pis: 0 },
    };

    let resposta: Response;
    try {
      resposta = await fetch(`${ASAAS_API_URL}/invoices`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'EncantosDaAmazonia/1.0',
          access_token: ASAAS_API_KEY,
        },
        body: JSON.stringify(corpoAsaas),
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      await admin
        .from('eda_notas_assinatura_v1')
        .update({ status: 'erro', erro_mensagem: 'Sem resposta do Asaas. Tente de novo.', updated_at: new Date().toISOString() })
        .eq('id', travada.id);
      throw new Falha('O Asaas não respondeu. A nota ficou para nova tentativa.', 502, 'EDA_NOTA_ASAAS');
    }

    const dados = (await resposta.json().catch(() => null)) as Record<string, unknown> | null;

    if (!resposta.ok || !dados || typeof dados.id !== 'string') {
      const errosAsaas = Array.isArray(dados?.errors) ? (dados?.errors as { description?: unknown }[]) : [];
      const motivo =
        errosAsaas.map((e) => (typeof e.description === 'string' ? e.description : '')).filter(Boolean).join(' ').slice(0, 500) ||
        'O Asaas recusou a nota.';
      await admin
        .from('eda_notas_assinatura_v1')
        .update({ status: 'erro', erro_mensagem: motivo, updated_at: new Date().toISOString() })
        .eq('id', travada.id);
      throw new Falha(motivo, 422, 'EDA_NOTA_RECUSADA_ASAAS');
    }

    const statusInterno = statusNotaPorAsaasEDA(dados.status) ?? 'agendada';
    await admin
      .from('eda_notas_assinatura_v1')
      .update({
        asaas_nota_id: dados.id,
        status: statusInterno,
        numero: typeof dados.number === 'string' || typeof dados.number === 'number' ? String(dados.number) : null,
        pdf_url: linkSeguroAsaasEDA(dados.pdfUrl),
        xml_url: linkSeguroAsaasEDA(dados.xmlUrl),
        updated_at: new Date().toISOString(),
      })
      .eq('id', travada.id);

    return responder({ ok: true, status: statusInterno });
  } catch (error) {
    if (error instanceof Falha) return responder({ ok: false, codigo: error.codigo, erro: error.message }, error.status);
    console.error('[EDA NOTAS] Falha inesperada.');
    return responder({ ok: false, codigo: 'EDA_NOTA_INTERNO', erro: 'Não foi possível concluir.' }, 500);
  }
}

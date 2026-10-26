import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const LIMITE = 16 * 1024;
const CATEGORIAS = new Set(['problema', 'sugestao', 'experiencia']);

const ROTAS_OPERADORA = [
  '/dashboard', '/clientes', '/reservas', '/passeios',
  '/vouchers', '/hospedagens', '/embarcacoes', '/guias',
  '/parceiros', '/demandas', '/financeiro', '/relatorios',
  '/configuracoes', '/planos', '/comando',
];

class FalhaFeedback extends Error {
  constructor(public status: number, mensagem: string) {
    super(mensagem);
  }
}

function resposta(status: number, dados: Record<string, unknown>) {
  return NextResponse.json(dados, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(status === 429 ? { 'Retry-After': '3600' } : {}),
    },
  });
}

async function lerJSON(req: NextRequest): Promise<Record<string, unknown>> {
  const tipo = req.headers.get('content-type')?.split(';')[0].trim();
  if (tipo !== 'application/json') {
    throw new FalhaFeedback(415, 'Envie os dados em JSON.');
  }

  const tamanho = req.headers.get('content-length');
  if (tamanho && (!/^\d+$/.test(tamanho) || Number(tamanho) > LIMITE)) {
    throw new FalhaFeedback(413, 'A mensagem excedeu o tamanho permitido.');
  }

  if (!req.body) throw new FalhaFeedback(400, 'Informe seu feedback.');

  const leitor = req.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const resultado = await leitor.read();
      if (resultado.done) break;

      total += resultado.value.byteLength;
      if (total > LIMITE) {
        await leitor.cancel();
        throw new FalhaFeedback(413, 'A mensagem excedeu o tamanho permitido.');
      }
      partes.push(resultado.value);
    }
  } finally {
    leitor.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let posicao = 0;
  for (const parte of partes) {
    bytes.set(parte, posicao);
    posicao += parte.byteLength;
  }

  let dados: unknown;
  try {
    dados = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new FalhaFeedback(400, 'Dados inválidos.');
  }

  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    throw new FalhaFeedback(400, 'Dados inválidos.');
  }
  return dados as Record<string, unknown>;
}

function texto(valor: unknown, minimo: number, maximo: number): string {
  if (typeof valor !== 'string') {
    throw new FalhaFeedback(400, 'Confira os campos do formulário.');
  }

  const resultado = valor.trim();
  if (resultado.length < minimo || resultado.length > maximo) {
    throw new FalhaFeedback(400, 'Confira o tamanho dos campos.');
  }
  return resultado;
}

export async function POST(req: NextRequest) {
  try {
    const origem = req.headers.get('origin');
    if (!origem || origem !== req.nextUrl.origin) {
      throw new FalhaFeedback(403, 'Origem da solicitação não permitida.');
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    const chave = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!url || !anon || !chave) {
      throw new FalhaFeedback(503, 'Feedback temporariamente indisponível.');
    }

    const dados = await lerJSON(req);
    const campos = new Set([
      'categoria', 'caminho', 'mensagem', 'contato_email',
    ]);

    if (Object.keys(dados).some(campo => !campos.has(campo))) {
      throw new FalhaFeedback(400, 'O formulário contém campos desconhecidos.');
    }

    const categoria = texto(dados.categoria, 1, 20);
    const caminho = texto(dados.caminho, 1, 256);
    const mensagem = texto(dados.mensagem, 10, 3000);

    if (!CATEGORIAS.has(categoria)) {
      throw new FalhaFeedback(400, 'Categoria inválida.');
    }

    if (
      !caminho.startsWith('/') ||
      caminho.startsWith('//') ||
      /[?#\\\u0000-\u001f\u007f]/.test(caminho)
    ) {
      throw new FalhaFeedback(400, 'Página de origem inválida.');
    }

    let email: string | null = null;
    if (dados.contato_email !== undefined &&
        dados.contato_email !== null &&
        dados.contato_email !== '') {
      email = texto(dados.contato_email, 3, 254);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new FalhaFeedback(400, 'Informe um e-mail válido ou deixe vazio.');
      }
    }

    const options = {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    };

    const admin = createClient(url, chave, options);
    let usuarioId: string | null = null;

    const autorizacao = req.headers.get('authorization');
    if (autorizacao) {
      const resultado = /^Bearer ([^\s]+)$/i.exec(autorizacao);
      if (!resultado || resultado[1].length > 8192) {
        throw new FalhaFeedback(401, 'Entre novamente para enviar.');
      }

      const auth = createClient(url, anon, options);
      const { data, error } = await auth.auth.getUser(resultado[1]);

      if (error || !data.user) {
        throw new FalhaFeedback(401, 'Entre novamente para enviar.');
      }

      usuarioId = data.user.id;
    }

    // Esta informação descreve a página; nunca concede acesso.
    const operadora = ROTAS_OPERADORA.some(
      rota => caminho === rota || caminho.startsWith(rota + '/')
    );

    if (operadora) {
      if (!usuarioId) {
        throw new FalhaFeedback(401, 'Entre na operadora para enviar.');
      }

      const { data: perfil, error } = await admin
        .from('perfis')
        .select('empresa_id')
        .eq('id', usuarioId)
        .maybeSingle();

      if (error) {
        throw new FalhaFeedback(503, 'Não foi possível conferir sua conta.');
      }
      if (!perfil?.empresa_id) {
        throw new FalhaFeedback(403, 'Vínculo com a operadora não encontrado.');
      }
    }

    let endereco: string;
    if (process.env.VERCEL === '1') {
      const recebido = req.headers.get('x-vercel-forwarded-for')
        ?.split(',')[0]?.trim();

      if (!recebido || !isIP(recebido)) {
        throw new FalhaFeedback(503, 'Não foi possível validar o envio.');
      }
      endereco = recebido;
    } else {
      // Desenvolvimento local: todos os envios compartilham a mesma cota.
      endereco = 'desenvolvimento-local';
    }

    const identificador = createHmac('sha256', chave)
      .update('ern-feedback-v1:')
      .update(endereco)
      .digest('hex');

    const { data: protocolo, error } = await admin.rpc(
      'ern_enviar_feedback_v1',
      {
        p_identificador: identificador,
        p_usuario_id: usuarioId,
        p_origem: operadora ? 'operadora' : 'portal',
        p_categoria: categoria,
        p_caminho: caminho,
        p_mensagem: mensagem,
        p_contato_email: email,
      }
    );

    if (error) {
      throw new FalhaFeedback(503, 'Não foi possível registrar. Tente novamente.');
    }

    if (protocolo === null) {
      throw new FalhaFeedback(
        429,
        'Limite de envios atingido. Tente novamente em até uma hora.'
      );
    }

    if (typeof protocolo !== 'string') {
      throw new FalhaFeedback(503, 'Não foi possível confirmar o registro.');
    }

    return resposta(201, { ok: true, protocolo });
  } catch (erro) {
    if (erro instanceof FalhaFeedback) {
      return resposta(erro.status, { ok: false, erro: erro.message });
    }
    return resposta(503, {
      ok: false,
      erro: 'Feedback temporariamente indisponível. Tente novamente.',
    });
  }
}
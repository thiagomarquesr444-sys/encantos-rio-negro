import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const LIMITE_BYTES = 4096;

class FalhaFiscalERN extends Error {
  constructor(
    mensagem: string,
    readonly statusHttp: number,
    readonly codigo: string,
  ) {
    super(mensagem);
  }
}

function responder(
  dados: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(dados, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      Pragma: 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function criarClientes() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !anon || !service) {
    throw new FalhaFiscalERN(
      'Configuracao fiscal indisponivel.',
      503,
      'ERN_FISCAL_CONFIGURACAO',
    );
  }

  const options = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  };

  return {
    autenticacao: createClient(url, anon, options),
    administrativo: createClient(url, service, options),
  };
}

async function lerJsonLimitado(request: NextRequest): Promise<unknown> {
  const leitor = request.body?.getReader();

  if (!leitor) {
    throw new FalhaFiscalERN(
      'Corpo JSON obrigatorio.',
      400,
      'ERN_FISCAL_CORPO_AUSENTE',
    );
  }

  const partes: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await leitor.read();

      if (done) break;

      total += value.byteLength;

      if (total > LIMITE_BYTES) {
        await leitor.cancel().catch(() => undefined);

        throw new FalhaFiscalERN(
          'Requisicao excede 4 KB.',
          413,
          'ERN_FISCAL_CORPO_EXCESSIVO',
        );
      }

      partes.push(value);
    }

    const combinado = new Uint8Array(total);
    let posicao = 0;

    for (const parte of partes) {
      combinado.set(parte, posicao);
      posicao += parte.byteLength;
    }

    return JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(combinado),
    ) as unknown;
  } catch (error) {
    if (error instanceof FalhaFiscalERN) throw error;

    throw new FalhaFiscalERN(
      'JSON invalido.',
      400,
      'ERN_FISCAL_JSON_INVALIDO',
    );
  } finally {
    leitor.releaseLock();
  }
}

function validarReservaId(corpo: unknown): string {
  if (
    !corpo ||
    typeof corpo !== 'object' ||
    Array.isArray(corpo)
  ) {
    throw new FalhaFiscalERN(
      'Corpo da requisicao invalido.',
      400,
      'ERN_FISCAL_CORPO_INVALIDO',
    );
  }

  const campos = corpo as Record<string, unknown>;

  if (
    Object.keys(campos).length !== 1 ||
    !Object.prototype.hasOwnProperty.call(campos, 'reserva_id')
  ) {
    throw new FalhaFiscalERN(
      'A simulacao aceita somente reserva_id.',
      400,
      'ERN_FISCAL_CAMPOS_INVALIDOS',
    );
  }

  if (
    typeof campos.reserva_id !== 'string' ||
    !UUID_RE.test(campos.reserva_id)
  ) {
    throw new FalhaFiscalERN(
      'Identificador da reserva invalido.',
      400,
      'ERN_FISCAL_RESERVA_INVALIDA',
    );
  }

  return campos.reserva_id.toLowerCase();
}

function traduzirFalhaTransacional(
  mensagem: string,
): FalhaFiscalERN | null {
  if (mensagem.includes('Simulacao desatualizada')) {
    return new FalhaFiscalERN(
      'Simulacao anterior desatualizada. Revisao necessaria.',
      409,
      'ERN_FISCAL_SIMULACAO_DESATUALIZADA',
    );
  }

  if (mensagem.includes('Reserva nao encontrada para a empresa')) {
    return new FalhaFiscalERN(
      'Reserva nao encontrada para esta empresa.',
      404,
      'ERN_FISCAL_RESERVA_NAO_ENCONTRADA',
    );
  }

  if (mensagem.includes('Operacao fiscal nao autorizada')) {
    return new FalhaFiscalERN(
      'Operacao fiscal nao autorizada.',
      403,
      'ERN_FISCAL_SEM_PERMISSAO',
    );
  }

  if (
    mensagem.includes('Reserva cancelada') ||
    mensagem.includes('Reserva sem cliente') ||
    mensagem.includes('Cliente nao pertence') ||
    mensagem.includes('Valor da reserva invalido')
  ) {
    return new FalhaFiscalERN(
      'A reserva nao atende aos requisitos da simulacao.',
      422,
      'ERN_FISCAL_RESERVA_INELEGIVEL',
    );
  }

  return null;
}

type ResultadoTransacional = {
  ok: boolean;
  simulacao: boolean;
  valor_fiscal: boolean;
  reutilizada: boolean;
  id: string;
  status: string;
  ambiente: string;
};

function resultadoValido(
  valor: unknown,
): valor is ResultadoTransacional {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    return false;
  }

  const item = valor as Record<string, unknown>;

  return (
    item.ok === true &&
    item.simulacao === true &&
    item.valor_fiscal === false &&
    typeof item.reutilizada === 'boolean' &&
    typeof item.id === 'string' &&
    UUID_RE.test(item.id) &&
    item.status === 'simulada' &&
    item.ambiente === 'simulacao'
  );
}

export async function POST(request: NextRequest) {
  try {
    // Trava absoluta da V1: nao operar em producao ou preview.
    if (process.env.NODE_ENV !== 'development') {
      return responder({
        ok: false,
        codigo: 'ERN_FISCAL_AMBIENTE_BLOQUEADO',
        erro: 'Modulo fiscal em homologacao. Operacao indisponivel.',
      }, 503);
    }

    const tipo = request.headers.get('content-type')
      ?.split(';')[0]?.trim().toLowerCase();

    if (tipo !== 'application/json') {
      throw new FalhaFiscalERN(
        'Envie um objeto JSON.',
        415,
        'ERN_FISCAL_TIPO_INVALIDO',
      );
    }

    const authorization = request.headers.get('authorization');
    const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];

    if (!token) {
      throw new FalhaFiscalERN(
        'Sessao nao informada.',
        401,
        'ERN_FISCAL_NAO_AUTENTICADO',
      );
    }

    const { autenticacao, administrativo } = criarClientes();

    const { data: usuario, error: erroAuth } =
      await autenticacao.auth.getUser(token);

    if (erroAuth || !usuario.user) {
      throw new FalhaFiscalERN(
        'Sessao invalida ou expirada.',
        401,
        'ERN_FISCAL_SESSAO_INVALIDA',
      );
    }

    const { data: perfil, error: erroPerfil } =
      await administrativo
        .from('perfis')
        .select('empresa_id,role')
        .eq('id', usuario.user.id)
        .single();

    if (
      erroPerfil ||
      !perfil?.empresa_id ||
      perfil.role !== 'admin_empresa'
    ) {
      throw new FalhaFiscalERN(
        'Operacao restrita ao administrador da empresa.',
        403,
        'ERN_FISCAL_SEM_PERMISSAO',
      );
    }

    const reservaId = validarReservaId(
      await lerJsonLimitado(request),
    );

    // A service_role nao e entregue ao navegador.
    // A funcao SQL revalida perfil, empresa e reserva.
    const { data: resultado, error: erroRpc } =
      await administrativo.rpc('ern_fiscal_simular_reserva_v1', {
        p_usuario_id: usuario.user.id,
        p_reserva_id: reservaId,
      });

    if (erroRpc) {
      const reconhecida = traduzirFalhaTransacional(
        erroRpc.message,
      );

      if (reconhecida) throw reconhecida;

      console.error('[ERN fiscal RPC]', {
        codigo: erroRpc.code,
      });

      throw new FalhaFiscalERN(
        'Nao foi possivel processar a simulacao fiscal.',
        503,
        'ERN_FISCAL_TRANSACAO',
      );
    }

    if (!resultadoValido(resultado)) {
      throw new FalhaFiscalERN(
        'Resposta fiscal inesperada.',
        503,
        'ERN_FISCAL_RESPOSTA_INVALIDA',
      );
    }

    return responder({
      ok: true,
      simulacao: true,
      valor_fiscal: false,
      reutilizada: resultado.reutilizada,
      aviso: 'SIMULACAO SEM VALOR FISCAL. NENHUMA NFS-e FOI EMITIDA.',
      solicitacao: {
        id: resultado.id,
        status: resultado.status,
        ambiente: resultado.ambiente,
      },
    }, resultado.reutilizada ? 200 : 201);

  } catch (error) {
    if (error instanceof FalhaFiscalERN) {
      return responder({
        ok: false,
        codigo: error.codigo,
        erro: error.message,
      }, error.statusHttp);
    }

    console.error('[ERN fiscal: falha inesperada]');

    return responder({
      ok: false,
      codigo: 'ERN_FISCAL_ERRO_INTERNO',
      erro: 'Nao foi possivel processar a simulacao.',
    }, 500);
  }
}
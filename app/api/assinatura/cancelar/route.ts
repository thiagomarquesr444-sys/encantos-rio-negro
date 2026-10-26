import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  createClient,
} from '@supabase/supabase-js';

import {
  createServerClient,
} from '@supabase/ssr';

/*
  ============================================================
  CONFIGURAÇÃO
  ============================================================
*/

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const ASAAS_API_KEY =
  process.env.ASAAS_API_KEY;

const ASAAS_API_URL = (
  process.env.ASAAS_API_URL ??
  'https://api-sandbox.asaas.com/v3'
).replace(/\/+$/, '');

/*
  ============================================================
  TIPOS
  ============================================================
*/

type AssinaturaAsaas = {
  id?: string;
  customer?: string;
  value?: number;
  cycle?: string;
  status?: string;
  deleted?: boolean;

  nextDueDate?:
    | string
    | null;

  externalReference?:
    | string
    | null;
};

type AssinaturaERN = {
  id: string;
  empresa_id: string;
  plano_id: string;
  status: string;

  ciclo_cobranca:
    | 'mensal'
    | 'trimestral'
    | 'anual'
    | null;

  renovacao_automatica:
    boolean;

  provedor_pagamento:
    | string
    | null;

  provedor_cliente_id:
    | string
    | null;

  provedor_assinatura_id:
    | string
    | null;

  provedor_assinatura_anterior_id:
    | string
    | null;

  provedor_assinatura_pendente_id:
    | string
    | null;

  plano_pendente_id:
    | string
    | null;

  ciclo_pendente:
    | string
    | null;

  checkout_iniciado_em:
    | string
    | null;

  cancelamento_solicitado_em:
    | string
    | null;

  cancelamento_efetivo_em:
    | string
    | null;

  plano_pos_cancelamento_id:
    | string
    | null;

  fim_em:
    | string
    | null;
};

/*
  ============================================================
  RESPOSTA DE ERRO
  ============================================================
*/

function respostaErro(
  mensagem: string,
  status = 400,
  codigo?: string
) {
  return NextResponse.json(
    {
      ok: false,
      erro: mensagem,
      codigo: codigo ?? null,
    },
    {
      status,
    }
  );
}

/*
  ============================================================
  SUPABASE ADMIN
  ============================================================
*/

function criarAdminClient() {
  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error(
      'Configuração administrativa do Supabase ausente.'
    );
  }

  return createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

/*
  ============================================================
  SUPABASE SERVER AUTH

  Usa os cookies enviados pelo navegador.
  ============================================================
*/

function criarServerAuthClient(
  request: NextRequest
) {
  if (
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY
  ) {
    throw new Error(
      'Configuração pública do Supabase ausente.'
    );
  }

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll() {
          /*
            Esta rota só precisa LER a sessão.

            O refresh/escrita de cookies é tratado
            pelo fluxo normal do ERN/proxy.
          */
        },
      },
    }
  );
}

async function obterUsuario(
  request: NextRequest
) {
  const supabase =
    criarServerAuthClient(
      request
    );

  const {
    data,
    error,
  } =
    await supabase.auth.getUser();

  if (
    error ||
    !data.user
  ) {
    throw new Error(
      'ERN_NAO_AUTENTICADO'
    );
  }

  return data.user;
}

/*
  ============================================================
  ASAAS
  ============================================================
*/

async function chamarAsaas(
  endpoint: string,
  init: RequestInit
) {
  if (!ASAAS_API_KEY) {
    throw new Error(
      'ASAAS_API_KEY não configurada.'
    );
  }

  const response =
    await fetch(
      `${ASAAS_API_URL}${endpoint}`,
      {
        ...init,

        headers: {
          Accept:
            'application/json',

          'Content-Type':
            'application/json',

          'User-Agent':
            'EncantosRioNegro/1.0',

          access_token:
            ASAAS_API_KEY,

          ...(init.headers ?? {}),
        },

        cache: 'no-store',
      }
    );

  let data: any =
    null;

  try {
    const texto =
      await response.text();

    if (texto) {
      try {
        data =
          JSON.parse(texto);
      } catch {
        data =
          texto;
      }
    }
  } catch {
    data = null;
  }

  if (
    init.method === 'DELETE' &&
    response.status === 404
  ) {
    return {
      ok: true,
      ja_removida: true,
    };
  }

  if (!response.ok) {
    console.error(
      '[ERN CANCELAMENTO ASAAS]',
      {
        endpoint,

        metodo:
          init.method ?? 'GET',

        status:
          response.status,

        resposta:
          data,
      }
    );

    throw new Error(
      data?.errors?.[0]
        ?.description ??
        'Erro na comunicação com o Asaas.'
    );
  }

  return data;
}

/*
  ============================================================
  CONVERSÃO DE DATA ASAAS -> UTC

  O Asaas devolve nextDueDate em YYYY-MM-DD.
  A ERN trabalha com America/Manaus (UTC-4).
  ============================================================
*/

function transformarDataManausEmIso(
  data:
    | string
    | null
    | undefined
) {
  if (!data) {
    return null;
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      data
    )
  ) {
    return null;
  }

  const instante =
    new Date(
      `${data}T00:00:00-04:00`
    );

  if (
    Number.isNaN(
      instante.getTime()
    )
  ) {
    return null;
  }

  return instante.toISOString();
}

/*
  ============================================================
  POST
  ============================================================
*/

type ContextoCancelamentoERN = {
  operacaoId: string | null;
  enviouCancelamento: boolean;
  concluiuLocal: boolean;
};

async function executarCancelamentoERN(
  request: NextRequest,
  contextoERN: ContextoCancelamentoERN
) {
  try {
    /*
      =========================================================
      1. USUÁRIO AUTENTICADO
      =========================================================
    */

    const usuario =
      await obterUsuario(
        request
      );

    const admin =
      criarAdminClient();

    /*
      =========================================================
      2. PERFIL
      =========================================================
    */

    const {
      data: perfil,
      error: perfilError,
    } = await admin
      .from(
        'perfis'
      )
      .select(
        'id, nome, role, empresa_id'
      )
      .eq(
        'id',
        usuario.id
      )
      .single();

    if (
      perfilError ||
      !perfil
    ) {
      return respostaErro(
        'Perfil do usuário não encontrado.',
        403,
        'ERN_PERFIL_NAO_ENCONTRADO'
      );
    }

    if (
      perfil.role !==
      'admin_empresa'
    ) {
      return respostaErro(
        'Somente o administrador da empresa pode cancelar o plano.',
        403,
        'ERN_SEM_PERMISSAO'
      );
    }

    if (
      !perfil.empresa_id
    ) {
      return respostaErro(
        'Usuário sem empresa vinculada.',
        403,
        'ERN_USUARIO_SEM_EMPRESA'
      );
    }

    /*
      =========================================================
      3. PLANO FREE
      =========================================================
    */

    const {
      data: planoFree,
      error: planoFreeError,
    } = await admin
      .from(
        'planos'
      )
      .select(
        'id, codigo, nome, ativo'
      )
      .eq(
        'codigo',
        'free'
      )
      .eq(
        'ativo',
        true
      )
      .single();

    if (
      planoFreeError ||
      !planoFree
    ) {
      return respostaErro(
        'Plano Grátis não está configurado.',
        500,
        'ERN_FREE_NAO_CONFIGURADO'
      );
    }

    /*
      =========================================================
      4. ASSINATURA ATUAL
      =========================================================
    */

    const {
      data: assinatura,
      error: assinaturaError,
    } = await admin
      .from(
        'assinaturas_empresas'
      )
      .select(
        `
          id,
          empresa_id,
          plano_id,
          status,
          ciclo_cobranca,
          renovacao_automatica,
          provedor_pagamento,
          provedor_cliente_id,
          provedor_assinatura_id,
          provedor_assinatura_anterior_id,
          provedor_assinatura_pendente_id,
          plano_pendente_id,
          ciclo_pendente,
          checkout_iniciado_em,
          cancelamento_solicitado_em,
          cancelamento_efetivo_em,
          plano_pos_cancelamento_id,
          fim_em
        `
      )
      .eq(
        'empresa_id',
        perfil.empresa_id
      )
      .single();

    if (
      assinaturaError ||
      !assinatura
    ) {
      return respostaErro(
        'Assinatura da empresa não encontrada.',
        404,
        'ERN_ASSINATURA_NAO_ENCONTRADA'
      );
    }

    const assinaturaERN =
      assinatura as
        AssinaturaERN;

    /*
      =========================================================
      5. JÁ ESTÁ NO FREE
      =========================================================
    */

    if (
      assinaturaERN.plano_id ===
      planoFree.id
    ) {
      return respostaErro(
        'A empresa já utiliza o plano Grátis.',
        409,
        'ERN_JA_E_FREE'
      );
    }

    /*
      =========================================================
      6. TROCA DE PLANO EM ANDAMENTO
      =========================================================
    */

    if (
      assinaturaERN
        .plano_pendente_id ||
      assinaturaERN
        .provedor_assinatura_pendente_id
    ) {
      return respostaErro(
        'Existe uma alteração de plano em andamento. Finalize ou cancele essa operação antes de solicitar o downgrade.',
        409,
        'ERN_CHECKOUT_PENDENTE'
      );
    }

    /*
      =========================================================
      7. CANCELAMENTO JÁ AGENDADO
      =========================================================
    */

    if (
      assinaturaERN
        .cancelamento_solicitado_em &&
      assinaturaERN
        .cancelamento_efetivo_em &&
      assinaturaERN
        .plano_pos_cancelamento_id
    ) {
      return NextResponse.json(
        {
          ok: true,

          ja_agendado:
            true,

          mensagem:
            'O cancelamento já está agendado.',

          cancelamento: {
            solicitado_em:
              assinaturaERN
                .cancelamento_solicitado_em,

            efetivo_em:
              assinaturaERN
                .cancelamento_efetivo_em,

            plano_atual_id:
              assinaturaERN
                .plano_id,

            plano_destino_id:
              assinaturaERN
                .plano_pos_cancelamento_id,

            plano_destino:
              'free',

            renovacao_automatica:
              false,
          },
        },
        {
          status: 200,
        }
      );
    }

    /*
      =========================================================
      8. PROVEDOR
      =========================================================
    */

    if (
      assinaturaERN
        .provedor_pagamento !==
      'asaas'
    ) {
      return respostaErro(
        'A assinatura atual não utiliza o provedor Asaas.',
        409,
        'ERN_PROVEDOR_NAO_SUPORTADO'
      );
    }

    const assinaturaAsaasId =
      assinaturaERN
        .provedor_assinatura_id;

    if (!assinaturaAsaasId) {
      return respostaErro(
        'Assinatura paga sem identificador da recorrência no Asaas.',
        409,
        'ERN_ASSINATURA_ASAAS_AUSENTE'
      );
    }

    /*
      =========================================================
      9. CONSULTA ASSINATURA ASAAS
      =========================================================
    */

    // ERN_CANCELAMENTO_RESERVA_V1
    const { data: reservaERN, error: erroReservaERN } = await admin.rpc(
      'ern_reservar_cancelamento_v1',
      { p_usuario_id: usuario.id }
    );

    if (erroReservaERN || !reservaERN || typeof reservaERN !== 'object') {
      return respostaErro(
        'Não foi possível confirmar a reserva do cancelamento.',
        503,
        'ERN_RESERVA_INDISPONIVEL'
      );
    }

    if (reservaERN.ok !== true) {
      return respostaErro(
        'O cancelamento não pôde ser iniciado. Existe uma operação em andamento ou a assinatura precisa ser conferida.',
        409,
        String(reservaERN.codigo ?? 'ERN_CANCELAMENTO_NAO_RESERVADO')
      );
    }

    if (
      typeof reservaERN.operacao_id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        reservaERN.operacao_id
      )
    ) {
      throw new Error('Resposta da reserva de cancelamento inválida.');
    }

    contextoERN.operacaoId = reservaERN.operacao_id;

    if (
      reservaERN.empresa_id !== perfil.empresa_id ||
      reservaERN.assinatura_id !== assinaturaERN.id ||
      reservaERN.plano_atual_id !== assinaturaERN.plano_id ||
      reservaERN.plano_destino_id !== planoFree.id ||
      reservaERN.provedor_assinatura_id !== assinaturaAsaasId ||
      reservaERN.provedor_cliente_id !== assinaturaERN.provedor_cliente_id
    ) {
      throw new Error('A assinatura mudou durante a solicitação de cancelamento.');
    }

    const assinaturaAsaas =
      await chamarAsaas(
        `/subscriptions/${encodeURIComponent(
          assinaturaAsaasId
        )}`,
        {
          method: 'GET',
        }
      ) as
        AssinaturaAsaas;

    if (
      !assinaturaAsaas?.id
    ) {
      throw new Error(
        'Asaas não retornou os dados da assinatura.'
      );
    }

    if (
      assinaturaAsaas.id !==
      assinaturaAsaasId
    ) {
      throw new Error(
        'A assinatura retornada pelo Asaas não corresponde ao registro ERN.'
      );
    }

    /*
      =========================================================
      10. DATA FINAL DO PERÍODO PAGO
      =========================================================
    */

    const cancelamentoEfetivoEm =
      transformarDataManausEmIso(
        assinaturaAsaas
          .nextDueDate
      );

    if (
      !cancelamentoEfetivoEm
    ) {
      return respostaErro(
        'Não foi possível determinar o final do período já contratado.',
        409,
        'ERN_DATA_CANCELAMENTO_INDISPONIVEL'
      );
    }

    if (
      new Date(
        cancelamentoEfetivoEm
      ).getTime() <=
      Date.now()
    ) {
      return respostaErro(
        'A data do próximo ciclo retornada pelo provedor não é válida para um cancelamento futuro.',
        409,
        'ERN_DATA_CANCELAMENTO_INVALIDA'
      );
    }

    if (
      assinaturaAsaas.customer !== reservaERN.provedor_cliente_id ||
      assinaturaAsaas.id !== reservaERN.provedor_assinatura_id
    ) {
      throw new Error('A recorrência retornada não corresponde ao cliente da assinatura.');
    }

    const agora = new Date().toISOString();

    const {
      data: intencaoERN,
      error: erroIntencaoERN,
    } = await admin
      .from('ern_operacoes_assinatura_v1')
      .update({
        estado: 'em_envio',
        cancelamento_efetivo_em: cancelamentoEfetivoEm,
        atualizado_em: agora,
      })
      .eq('id', contextoERN.operacaoId)
      .eq('tipo', 'cancelamento')
      .eq('estado', 'reservado')
      .select('id')
      .single();

    if (erroIntencaoERN || !intencaoERN) {
      throw new Error('Não foi possível registrar a intenção e a data do cancelamento.');
    }

    /*
      =========================================================
      11. CANCELA RECORRÊNCIA ASAAS
      =========================================================
    */

    contextoERN.enviouCancelamento = true;

    await chamarAsaas(
      `/subscriptions/${encodeURIComponent(
        assinaturaAsaasId
      )}`,
      {
        method:
          'DELETE',
      }
    );

    /*
      =========================================================
      12. AGENDA TRANSIÇÃO PARA FREE
      =========================================================
    */

    // ERN_CANCELAMENTO_ATOMICO_V1
    // O envio ao Asaas já retornou sucesso.
    // Agendamento e conclusão passam a ocorrer na mesma transação.
    const {
      data: confirmacaoLocalERN,
      error: erroConfirmacaoLocalERN,
    } = await admin.rpc(
      'ern_confirmar_cancelamento_v1',
      { p_operacao_id: contextoERN.operacaoId }
    );

    if (
      erroConfirmacaoLocalERN ||
      confirmacaoLocalERN?.ok !== true
    ) {
      throw new Error(
        'A recorrência foi removida no provedor, mas a confirmação local precisa ser recuperada.'
      );
    }

    // Uma falha posterior de leitura não deve alterar a operação concluída.
    contextoERN.concluiuLocal = true;

    const {
      data: assinaturaAtualizada,
      error: erroLeituraConfirmacaoERN,
    } = await admin
      .from('assinaturas_empresas')
      .select(`
        id,
        plano_id,
        status,
        ciclo_cobranca,
        renovacao_automatica,
        provedor_assinatura_id,
        cancelamento_solicitado_em,
        cancelamento_efetivo_em,
        plano_pos_cancelamento_id,
        fim_em
      `)
      .eq('id', assinaturaERN.id)
      .eq('empresa_id', perfil.empresa_id)
      .single();

    if (erroLeituraConfirmacaoERN || !assinaturaAtualizada) {
      return respostaErro(
        'O cancelamento foi registrado, mas não foi possível atualizar sua exibição. Recarregue a página de planos.',
        503,
        'ERN_CANCELAMENTO_REGISTRADO'
      );
    }
    /*
      =========================================================
      13. SUCESSO
      =========================================================
    */

    return NextResponse.json(
      {
        ok: true,

        mensagem:
          'Renovação automática cancelada. O plano atual continuará disponível até o fim do período contratado e depois será convertido para o plano Grátis.',

        cancelamento: {
          assinatura_ern_id:
            assinaturaERN.id,

          assinatura_asaas_id:
            assinaturaAsaasId,

          plano_atual_id:
            assinaturaERN.plano_id,

          plano_destino_id:
            planoFree.id,

          plano_destino:
            planoFree.codigo,

          renovacao_automatica:
            false,

          solicitado_em:
            agora,

          efetivo_em:
            cancelamentoEfetivoEm,

          proximo_vencimento_original:
            assinaturaAsaas
              .nextDueDate ??
            null,
        },

        assinatura:
          assinaturaAtualizada,
      },
      {
        status: 200,
      }
    );
  } catch (
    error: any
  ) {
    console.error(
      '[ERN CANCELAMENTO]',
      error
    );

    if (
      error?.message ===
      'ERN_NAO_AUTENTICADO'
    ) {
      return respostaErro(
        'Não autenticado.',
        401,
        'ERN_NAO_AUTENTICADO'
      );
    }

    return respostaErro(
      error?.message ??
        'Erro interno ao cancelar assinatura.',
      500,
      'ERN_CANCELAMENTO_ERRO'
    );
  }
}

export async function POST(request: NextRequest) {
  const contextoERN: ContextoCancelamentoERN = {
    operacaoId: null,
    enviouCancelamento: false,
    concluiuLocal: false,
  };

  let resultadoERN: NextResponse;

  try {
    resultadoERN = await executarCancelamentoERN(request, contextoERN);
  } catch {
    resultadoERN = respostaErro(
      'Não foi possível concluir o cancelamento.',
      500,
      'ERN_CANCELAMENTO_ERRO'
    );
  }

  if (contextoERN.operacaoId && !contextoERN.concluiuLocal) {
    const estadoERN = resultadoERN.ok
      ? 'concluido'
      : contextoERN.enviouCancelamento
        ? 'reconciliar'
        : 'falhou_confirmado';

    try {
      const { data: gravadaERN, error: erroGravacaoERN } =
        await criarAdminClient()
          .from('ern_operacoes_assinatura_v1')
          .update({
            estado: estadoERN,
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', contextoERN.operacaoId)
          .eq('tipo', 'cancelamento')
          .in('estado', ['reservado', 'em_envio'])
          .select('id')
          .single();

      if (erroGravacaoERN || !gravadaERN) {
        return respostaErro(
          'Não foi possível confirmar todos os registros. O cancelamento permanece reservado para conferência.',
          503,
          'ERN_CANCELAMENTO_EM_CONFERENCIA'
        );
      }
    } catch {
      return respostaErro(
        'O cancelamento precisa ser conferido antes de outra operação.',
        503,
        'ERN_CANCELAMENTO_EM_CONFERENCIA'
      );
    }
  }

  if (resultadoERN.status >= 500 && !contextoERN.concluiuLocal) {
    return respostaErro(
      contextoERN.enviouCancelamento
        ? 'A solicitação foi enviada, mas não foi possível confirmar todo o resultado. O cancelamento será conferido antes de uma nova operação.'
        : 'Não foi possível concluir a solicitação. O cancelamento não foi enviado ao provedor nesta tentativa.',
      resultadoERN.status,
      contextoERN.enviouCancelamento
        ? 'ERN_CANCELAMENTO_EM_CONFERENCIA'
        : 'ERN_CANCELAMENTO_ERRO'
    );
  }

  resultadoERN.headers.set('Cache-Control', 'no-store');
  return resultadoERN;
}

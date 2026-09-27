import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  createClient,
} from '@supabase/supabase-js';

/*
  ============================================================
  CONFIGURAÇÃO
  ============================================================
*/

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const ASAAS_API_KEY =
  process.env.ASAAS_API_KEY;

const ASAAS_API_URL =
  (
    process.env.ASAAS_API_URL ??
    'https://api-sandbox.asaas.com/v3'
  ).replace(/\/+$/, '');

/*
  Na Vercel, o Cron usa oficialmente CRON_SECRET.

  Localmente mantemos compatibilidade com ERN_CRON_SECRET.
*/
const CRON_SECRET =
  process.env.CRON_SECRET ??
  process.env.ERN_CRON_SECRET;

/*
  Um checkout que ficou sem conclusão por mais de 24 horas
  passa a ser candidato à limpeza.

  A limpeza NÃO ocorre apenas pela idade.

  Antes disso, o ERN consulta o estado financeiro diretamente
  no Asaas.
*/
const CHECKOUT_EXPIRADO_HORAS =
  24;

/*
  ============================================================
  TIPOS
  ============================================================
*/

type AssinaturaParaCancelar = {
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
    string;

  plano_pos_cancelamento_id:
    string;

  fim_em:
    | string
    | null;
};

type CheckoutPendente = {
  id: string;

  empresa_id: string;

  plano_id: string;

  status: string;

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
    string;
};

type AsaasPayment = {
  id?:
    string;

  status?:
    string;

  value?:
    number;

  subscription?:
    string | null;

  dueDate?:
    string | null;

  paymentDate?:
    string | null;

  clientPaymentDate?:
    string | null;
};

type AsaasPaymentsResponse = {
  object?:
    string;

  hasMore?:
    boolean;

  totalCount?:
    number;

  limit?:
    number;

  offset?:
    number;

  data?:
    AsaasPayment[];
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
      ok:
        false,

      erro:
        mensagem,

      codigo:
        codigo ?? null,
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
        persistSession:
          false,

        autoRefreshToken:
          false,
      },
    }
  );
}

/*
  ============================================================
  SEGURANÇA DO CRON
  ============================================================
*/

function validarCron(
  request: NextRequest
) {
  if (!CRON_SECRET) {
    throw new Error(
      'CRON_SECRET não configurado.'
    );
  }

  const authorization =
    request.headers.get(
      'authorization'
    );

  if (!authorization) {
    return false;
  }

  const esperado =
    `Bearer ${CRON_SECRET}`;

  return authorization ===
    esperado;
}

/*
  ============================================================
  ASAAS
  ============================================================
*/

function validarConfiguracaoAsaas() {
  if (!ASAAS_API_KEY) {
    throw new Error(
      'ASAAS_API_KEY não configurada.'
    );
  }
}

async function lerRespostaAsaas(
  response: Response
) {
  const texto =
    await response
      .text();

  if (!texto) {
    return null;
  }

  try {
    return JSON.parse(
      texto
    );
  } catch {
    return {
      raw:
        texto,
    };
  }
}

/*
  Lista as cobranças geradas pela assinatura.

  É uma verificação de segurança antes de considerar
  o checkout abandonado.
*/
async function listarCobrancasAssinaturaAsaas(
  assinaturaAsaasId: string
): Promise<{
  encontrada:
    boolean;

  cobrancas:
    AsaasPayment[];
}> {
  validarConfiguracaoAsaas();

  const response =
    await fetch(
      `${ASAAS_API_URL}/subscriptions/${encodeURIComponent(
        assinaturaAsaasId
      )}/payments`,
      {
        method:
          'GET',

        headers: {
          Accept:
            'application/json',

          'Content-Type':
            'application/json',

          'User-Agent':
            'EncantosRioNegro/1.0',

          access_token:
            ASAAS_API_KEY!,
        },

        cache:
          'no-store',
      }
    );

  /*
    A assinatura já pode ter sido removida manualmente
    ou por alguma tentativa anterior.

    Nesse caso tratamos como inexistente e permitimos
    corrigir somente o estado local.
  */
  if (
    response.status ===
    404
  ) {
    return {
      encontrada:
        false,

      cobrancas:
        [],
    };
  }

  const body =
    await lerRespostaAsaas(
      response
    );

  if (!response.ok) {
    console.error(
      '[ERN CRON CHECKOUT] Erro ao consultar cobranças Asaas:',
      {
        assinatura_asaas_id:
          assinaturaAsaasId,

        status:
          response.status,

        body,
      }
    );

    throw new Error(
      `Não foi possível consultar as cobranças da assinatura Asaas. HTTP ${response.status}.`
    );
  }

  const dados =
    (
      body ??
      {}
    ) as
      AsaasPaymentsResponse;

  return {
    encontrada:
      true,

    cobrancas:
      Array.isArray(
        dados.data
      )
        ? dados.data
        : [],
  };
}

/*
  Remove definitivamente apenas a assinatura Asaas
  identificada como checkout abandonado.

  404 é tratado como sucesso idempotente.
*/
async function removerAssinaturaAsaas(
  assinaturaAsaasId: string
) {
  validarConfiguracaoAsaas();

  const response =
    await fetch(
      `${ASAAS_API_URL}/subscriptions/${encodeURIComponent(
        assinaturaAsaasId
      )}`,
      {
        method:
          'DELETE',

        headers: {
          Accept:
            'application/json',

          'Content-Type':
            'application/json',

          'User-Agent':
            'EncantosRioNegro/1.0',

          access_token:
            ASAAS_API_KEY!,
        },

        cache:
          'no-store',
      }
    );

  /*
    Já removida anteriormente.

    Consideramos sucesso para garantir idempotência.
  */
  if (
    response.status ===
    404
  ) {
    return;
  }

  const body =
    await lerRespostaAsaas(
      response
    );

  if (!response.ok) {
    console.error(
      '[ERN CRON CHECKOUT] Erro ao remover assinatura Asaas:',
      {
        assinatura_asaas_id:
          assinaturaAsaasId,

        status:
          response.status,

        body,
      }
    );

    throw new Error(
      `Não foi possível remover a assinatura abandonada no Asaas. HTTP ${response.status}.`
    );
  }
}

/*
  ============================================================
  STATUS FINANCEIRO SEGURO PARA LIMPEZA
  ============================================================

  Somente estes estados são tratados como claramente
  não pagos.

  Qualquer outro status é protegido.

  Isso é propositalmente conservador.
  ============================================================
*/

function cobrancaEhClaramenteNaoPaga(
  status:
    | string
    | null
    | undefined
) {
  if (!status) {
    return false;
  }

  const normalizado =
    status
      .trim()
      .toUpperCase();

  return [
    'PENDING',
    'OVERDUE',
    'DELETED',
  ].includes(
    normalizado
  );
}

/*
  ============================================================
  LIMPEZA DE CHECKOUTS ABANDONADOS
  ============================================================
*/

async function limparCheckoutsAbandonados(
  admin: ReturnType<
    typeof criarAdminClient
  >,
  agora: string
) {
  const limite =
    new Date(
      Date.now() -
      CHECKOUT_EXPIRADO_HORAS *
        60 *
        60 *
        1000
    )
      .toISOString();

  const {
    data:
      checkouts,

    error:
      checkoutsError,
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
        provedor_pagamento,
        provedor_cliente_id,
        provedor_assinatura_id,
        provedor_assinatura_anterior_id,
        provedor_assinatura_pendente_id,
        plano_pendente_id,
        ciclo_pendente,
        checkout_iniciado_em
      `
    )
    .not(
      'checkout_iniciado_em',
      'is',
      null
    )
    .lte(
      'checkout_iniciado_em',
      limite
    )
    .or(
      'plano_pendente_id.not.is.null,provedor_assinatura_pendente_id.not.is.null,ciclo_pendente.not.is.null'
    )
    .limit(
      100
    );

  if (
    checkoutsError
  ) {
    console.error(
      '[ERN CRON CHECKOUT] Erro ao localizar checkouts expirados:',
      checkoutsError
    );

    throw new Error(
      'Não foi possível localizar checkouts abandonados.'
    );
  }

  const pendentes =
    (
      checkouts ??
      []
    ) as
      CheckoutPendente[];

  const limpos:
    Array<{
      assinatura_id:
        string;

      empresa_id:
        string;

      checkout_iniciado_em:
        string;

      assinatura_asaas_removida:
        string | null;
    }> = [];

  const protegidos:
    Array<{
      assinatura_id:
        string;

      empresa_id:
        string;

      motivo:
        string;

      statuses:
        string[];
    }> = [];

  const falhas:
    Array<{
      assinatura_id:
        string;

      empresa_id:
        string;

      erro:
        string;
    }> = [];

  for (
    const checkout
    of pendentes
  ) {
    try {
      const assinaturaPendenteId =
        checkout
          .provedor_assinatura_pendente_id;

      /*
        ======================================================
        CASO 1:
        EXISTE ASSINATURA ASAAS PENDENTE
        ======================================================
      */

      if (
        assinaturaPendenteId
      ) {
        const {
          encontrada,
          cobrancas,
        } =
          await listarCobrancasAssinaturaAsaas(
            assinaturaPendenteId
          );

        if (
          encontrada &&
          cobrancas.length >
            0
        ) {
          const statuses =
            cobrancas
              .map(
                (
                  cobranca
                ) =>
                  String(
                    cobranca.status ??
                    ''
                  )
                    .trim()
                    .toUpperCase()
              )
              .filter(
                Boolean
              );

          /*
            Se existir qualquer cobrança cujo status
            NÃO seja claramente um estado não pago,
            paramos.

            Isso protege contra:
            - pagamento confirmado ainda não refletido;
            - webhook atrasado;
            - chargeback;
            - estorno;
            - estados financeiros intermediários;
            - novos estados futuros do Asaas.
          */
          const existeEstadoProtegido =
            cobrancas.some(
              (
                cobranca
              ) =>
                !cobrancaEhClaramenteNaoPaga(
                  cobranca.status
                )
            );

          if (
            existeEstadoProtegido
          ) {
            protegidos.push({
              assinatura_id:
                checkout.id,

              empresa_id:
                checkout
                  .empresa_id,

              motivo:
                'Checkout expirado possui cobrança em estado que exige conciliação antes da limpeza.',

              statuses,
            });

            continue;
          }
        }

        /*
          Não há cobrança paga/protegida.

          Podemos encerrar a assinatura pendente.
        */
        await removerAssinaturaAsaas(
          assinaturaPendenteId
        );
      }

      /*
        ======================================================
        LIMPEZA LOCAL

        Nunca alteramos:
        - plano_id ativo;
        - ciclo_cobranca ativo;
        - provedor_assinatura_id ativo;
        - renovacao_automatica;
        - status;
        - datas do plano ativo.

        Limpamos somente o estado transitório do checkout.
        ======================================================
      */

      const update: {
        provedor_assinatura_pendente_id:
          null;

        plano_pendente_id:
          null;

        ciclo_pendente:
          null;

        checkout_iniciado_em:
          null;

        updated_at:
          string;

        provedor_assinatura_anterior_id?:
          null;
      } = {
        provedor_assinatura_pendente_id:
          null,

        plano_pendente_id:
          null,

        ciclo_pendente:
          null,

        checkout_iniciado_em:
          null,

        updated_at:
          agora,
      };

      /*
        Durante uma troca paga -> paga, algumas versões
        do fluxo podem ter preservado a assinatura ativa
        também em provedor_assinatura_anterior_id.

        Se ambos forem exatamente iguais, esse campo
        é apenas estado transitório redundante e pode
        ser limpo.

        Se forem diferentes, preservamos o histórico.
      */
      if (
        checkout
          .provedor_assinatura_anterior_id &&
        checkout
          .provedor_assinatura_id &&
        checkout
          .provedor_assinatura_anterior_id ===
          checkout
            .provedor_assinatura_id
      ) {
        update
          .provedor_assinatura_anterior_id =
          null;
      }

      let query =
        admin
          .from(
            'assinaturas_empresas'
          )
          .update(
            update
          )
          .eq(
            'id',
            checkout.id
          )
          .eq(
            'empresa_id',
            checkout
              .empresa_id
          )
          .eq(
            'checkout_iniciado_em',
            checkout
              .checkout_iniciado_em
          );

      /*
        Proteção extra contra concorrência.

        Se havia ID pendente, ele ainda precisa ser o mesmo.
      */
      if (
        assinaturaPendenteId
      ) {
        query =
          query.eq(
            'provedor_assinatura_pendente_id',
            assinaturaPendenteId
          );
      }

      const {
        data:
          atualizado,

        error:
          atualizarError,
      } = await query
        .select(
          `
            id,
            empresa_id,
            plano_id,
            status,
            provedor_assinatura_id,
            provedor_assinatura_anterior_id,
            provedor_assinatura_pendente_id,
            plano_pendente_id,
            ciclo_pendente,
            checkout_iniciado_em,
            updated_at
          `
        )
        .maybeSingle();

      if (
        atualizarError
      ) {
        throw atualizarError;
      }

      /*
        Outro processo pode ter resolvido o checkout
        depois da nossa busca.

        Nesse caso não tratamos como falha.
      */
      if (
        !atualizado
      ) {
        continue;
      }

      limpos.push({
        assinatura_id:
          checkout.id,

        empresa_id:
          checkout
            .empresa_id,

        checkout_iniciado_em:
          checkout
            .checkout_iniciado_em,

        assinatura_asaas_removida:
          assinaturaPendenteId ??
          null,
      });
    } catch (
      error: any
    ) {
      console.error(
        '[ERN CRON CHECKOUT] Falha individual:',
        {
          assinatura_id:
            checkout.id,

          empresa_id:
            checkout
              .empresa_id,

          erro:
            error,
        }
      );

      falhas.push({
        assinatura_id:
          checkout.id,

        empresa_id:
          checkout
            .empresa_id,

        erro:
          error?.message ??
          'Erro desconhecido.',
      });
    }
  }

  return {
    limite_checkout:
      limite,

    encontrados:
      pendentes.length,

    limpos:
      limpos.length,

    protegidos:
      protegidos.length,

    falhas:
      falhas.length,

    checkouts_limpos:
      limpos,

    checkouts_protegidos:
      protegidos,

    checkouts_com_falha:
      falhas,
  };
}

/*
  ============================================================
  PROCESSAMENTO DE CANCELAMENTOS PAGOS -> FREE
  ============================================================
*/

async function processarCancelamentos(
  admin: ReturnType<
    typeof criarAdminClient
  >,
  agora: string
) {
  /*
    ==========================================================
    PLANO FREE
    ==========================================================
  */

  const {
    data:
      planoFree,

    error:
      planoFreeError,
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
    throw new Error(
      'Plano Grátis não está configurado.'
    );
  }

  /*
    ==========================================================
    BUSCA CANCELAMENTOS VENCIDOS
    ==========================================================
  */

  const {
    data:
      assinaturas,

    error:
      assinaturasError,
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
    .lte(
      'cancelamento_efetivo_em',
      agora
    )
    .eq(
      'plano_pos_cancelamento_id',
      planoFree.id
    )
    .limit(
      100
    );

  if (
    assinaturasError
  ) {
    console.error(
      '[ERN CRON CANCELAMENTOS] Erro ao buscar assinaturas:',
      assinaturasError
    );

    throw new Error(
      'Não foi possível localizar os cancelamentos pendentes.'
    );
  }

  const pendentes =
    (
      assinaturas ??
      []
    ) as
      AssinaturaParaCancelar[];

  const processados:
    Array<{
      assinatura_id:
        string;

      empresa_id:
        string;

      plano_anterior_id:
        string;

      plano_atual_id:
        string;

      cancelamento_efetivo_em:
        string;
    }> = [];

  const falhas:
    Array<{
      assinatura_id:
        string;

      empresa_id:
        string;

      erro:
        string;
    }> = [];

  for (
    const assinatura
    of pendentes
  ) {
    try {
      const ultimaAssinaturaPaga =
        assinatura
          .provedor_assinatura_id ??
        assinatura
          .provedor_assinatura_anterior_id ??
        null;

      const {
        data:
          assinaturaAtualizada,

        error:
          atualizarError,
      } = await admin
        .from(
          'assinaturas_empresas'
        )
        .update({
          plano_id:
            planoFree.id,

          ciclo_cobranca:
            null,

          renovacao_automatica:
            false,

          inicio_em:
            assinatura
              .cancelamento_efetivo_em,

          fim_em:
            null,

          provedor_assinatura_anterior_id:
            ultimaAssinaturaPaga,

          provedor_assinatura_id:
            null,

          provedor_assinatura_pendente_id:
            null,

          plano_pendente_id:
            null,

          ciclo_pendente:
            null,

          checkout_iniciado_em:
            null,

          plano_pos_cancelamento_id:
            null,

          status:
            'ativo',

          updated_at:
            agora,
        })
        .eq(
          'id',
          assinatura.id
        )
        .eq(
          'empresa_id',
          assinatura
            .empresa_id
        )
        .eq(
          'plano_pos_cancelamento_id',
          planoFree.id
        )
        .lte(
          'cancelamento_efetivo_em',
          agora
        )
        .select(
          `
            id,
            empresa_id,
            plano_id,
            status,
            ciclo_cobranca,
            renovacao_automatica,
            inicio_em,
            fim_em,
            provedor_pagamento,
            provedor_cliente_id,
            provedor_assinatura_id,
            provedor_assinatura_anterior_id,
            cancelamento_solicitado_em,
            cancelamento_efetivo_em,
            plano_pos_cancelamento_id,
            updated_at
          `
        )
        .maybeSingle();

      if (
        atualizarError
      ) {
        throw atualizarError;
      }

      if (
        !assinaturaAtualizada
      ) {
        continue;
      }

      processados.push({
        assinatura_id:
          assinatura.id,

        empresa_id:
          assinatura
            .empresa_id,

        plano_anterior_id:
          assinatura
            .plano_id,

        plano_atual_id:
          planoFree.id,

        cancelamento_efetivo_em:
          assinatura
            .cancelamento_efetivo_em,
      });
    } catch (
      error: any
    ) {
      console.error(
        '[ERN CRON CANCELAMENTOS] Falha individual:',
        {
          assinatura_id:
            assinatura.id,

          empresa_id:
            assinatura
              .empresa_id,

          erro:
            error,
        }
      );

      falhas.push({
        assinatura_id:
          assinatura.id,

        empresa_id:
          assinatura
            .empresa_id,

        erro:
          error?.message ??
          'Erro desconhecido.',
      });
    }
  }

  return {
    plano_destino: {
      id:
        planoFree.id,

      codigo:
        planoFree.codigo,

      nome:
        planoFree.nome,
    },

    encontrados:
      pendentes.length,

    processados:
      processados.length,

    falhas:
      falhas.length,

    assinaturas_processadas:
      processados,

    assinaturas_com_falha:
      falhas,
  };
}

/*
  ============================================================
  PROCESSAMENTO GERAL
  ============================================================
*/

async function processar(
  request: NextRequest
) {
  try {
    /*
      ========================================================
      1. AUTORIZAÇÃO INTERNA
      ========================================================
    */

    if (
      !validarCron(
        request
      )
    ) {
      return respostaErro(
        'Não autorizado.',
        401,
        'ERN_CRON_NAO_AUTORIZADO'
      );
    }

    const admin =
      criarAdminClient();

    const agora =
      new Date()
        .toISOString();

    /*
      ========================================================
      2. LIMPA CHECKOUTS ABANDONADOS
      ========================================================
    */

    const checkouts =
      await limparCheckoutsAbandonados(
        admin,
        agora
      );

    /*
      ========================================================
      3. PROCESSA CANCELAMENTOS PAGOS -> FREE
      ========================================================
    */

    const cancelamentos =
      await processarCancelamentos(
        admin,
        agora
      );

    /*
      ========================================================
      4. RESULTADO GERAL
      ========================================================
    */

    const totalFalhas =
      checkouts.falhas +
      cancelamentos.falhas;

    const houveTrabalho =
      checkouts.encontrados >
        0 ||
      cancelamentos.encontrados >
        0;

    let mensagem =
      'Nenhuma operação pendente encontrada.';

    if (
      houveTrabalho &&
      totalFalhas ===
        0
    ) {
      mensagem =
        'Processamento automático concluído.';
    }

    if (
      totalFalhas >
      0
    ) {
      mensagem =
        'Processamento concluído com algumas falhas.';
    }

    return NextResponse.json(
      {
        ok:
          totalFalhas ===
          0,

        mensagem,

        executado_em:
          agora,

        checkouts_abandonados:
          checkouts,

        cancelamentos:
          cancelamentos,

        resumo: {
          checkouts_encontrados:
            checkouts
              .encontrados,

          checkouts_limpos:
            checkouts
              .limpos,

          checkouts_protegidos:
            checkouts
              .protegidos,

          checkouts_falhas:
            checkouts
              .falhas,

          cancelamentos_encontrados:
            cancelamentos
              .encontrados,

          cancelamentos_processados:
            cancelamentos
              .processados,

          cancelamentos_falhas:
            cancelamentos
              .falhas,
        },
      },
      {
        status:
          totalFalhas ===
          0
            ? 200
            : 207,
      }
    );
  } catch (
    error: any
  ) {
    console.error(
      '[ERN CRON ASSINATURAS]',
      error
    );

    return respostaErro(
      error?.message ??
        'Erro interno no processador automático de assinaturas.',
      500,
      'ERN_CRON_ASSINATURAS_ERRO'
    );
  }
}

/*
  ============================================================
  GET

  Utilizado pelo Cron da Vercel.
  ============================================================
*/

export async function GET(
  request: NextRequest
) {
  return processar(
    request
  );
}

/*
  ============================================================
  POST

  Mantido para testes administrativos controlados.
  ============================================================
*/

export async function POST(
  request: NextRequest
) {
  return processar(
    request
  );
}
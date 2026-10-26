import { POST as retomarWebhookAsaasERN } from '@/app/api/webhooks/asaas/route';

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
      // ERN_CRON_PROTEGE_OPERACOES_V1
      // A limpeza legada não deve remover recorrências do fluxo novo.
      // Inclui operações concluídas: o snapshot do cron pode ser anterior
      // à ativação pelo webhook.
      const {
        data: operacoesRegistradasERN,
        error: erroOperacoesERN,
      } = await admin
        .from('ern_operacoes_assinatura_v1')
        .select('id')
        .eq('assinatura_id', checkout.id)
        .limit(1);

      if (erroOperacoesERN || !Array.isArray(operacoesRegistradasERN)) {
        throw new Error(
          'Não foi possível conferir as operações. Limpeza desta assinatura suspensa.'
        );
      }

      if (operacoesRegistradasERN.length > 0) {
        protegidos.push({
          assinatura_id: checkout.id,
          empresa_id: checkout.empresa_id,
          motivo:
            'Assinatura acompanhada pelo novo registro de operações; exige conciliação específica.',
          statuses: [],
        });
        continue;
      }

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

async function recuperarCancelamentosERN(
  admin: ReturnType<typeof criarAdminClient>
) {
  // ERN_RECUPERAR_CANCELAMENTOS_V1
  const prazoERN = Date.now() + 10000;
  const limiteAntigoERN = new Date(Date.now() - 15 * 60000).toISOString();

  const { data: operacoesERN, error: erroBuscaERN } = await admin
    .from('ern_operacoes_assinatura_v1')
    .select(
      'id, estado, atualizado_em, provedor_cliente_id, provedor_assinatura_id'
    )
    .eq('tipo', 'cancelamento')
    .eq('provedor', 'asaas')
    .in('estado', ['em_envio', 'reconciliar'])
    .not('cancelamento_efetivo_em', 'is', null)
    .lte('atualizado_em', limiteAntigoERN)
    .order('atualizado_em', { ascending: true })
    .limit(4);

  if (erroBuscaERN || !Array.isArray(operacoesERN)) {
    throw new Error('Não foi possível consultar cancelamentos para recuperação.');
  }

  let recuperadosERN = 0;
  let pendentesERN = 0;
  let falhasERN = 0;

  const itensERN: Array<{
    operacao_id: string;
    resultado: string;
  }> = [];

  for (const operacaoERN of operacoesERN.slice(0, 3)) {
    if (Date.now() >= prazoERN) break;

    try {
      if (
        !ASAAS_API_KEY ||
        !operacaoERN.provedor_cliente_id ||
        !operacaoERN.provedor_assinatura_id
      ) {
        throw new Error('Configuração ou identificação incompleta.');
      }

      let confirmouRemocaoERN = false;

      // Consulta limitada a três páginas, sem remover ou criar assinaturas.
      for (let paginaERN = 0; paginaERN < 3; paginaERN++) {
        const restanteERN = prazoERN - Date.now();
        if (restanteERN <= 0) break;

        const parametrosERN = new URLSearchParams({
          customer: operacaoERN.provedor_cliente_id,
          deletedOnly: 'true',
          limit: '100',
          offset: String(paginaERN * 100),
        });

        const respostaERN = await fetch(
          `${ASAAS_API_URL}/subscriptions?${parametrosERN}`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'User-Agent': 'EncantosRioNegro/1.0',
              access_token: ASAAS_API_KEY,
            },
            cache: 'no-store',
            signal: AbortSignal.timeout(Math.min(4000, restanteERN)),
          }
        );

        if (!respostaERN.ok) {
          throw new Error('Consulta ao provedor indisponível.');
        }

        const paginaDadosERN = await respostaERN.json();

        if (
          !paginaDadosERN ||
          !Array.isArray(paginaDadosERN.data) ||
          paginaDadosERN.data.length > 100 ||
          typeof paginaDadosERN.hasMore !== 'boolean'
        ) {
          throw new Error('Resposta de listagem inválida.');
        }

        const removidaERN = paginaDadosERN.data.find(
          (itemERN: unknown) =>
            itemERN !== null &&
            typeof itemERN === 'object' &&
            'id' in itemERN &&
            itemERN.id === operacaoERN.provedor_assinatura_id
        );

        if (removidaERN) {
          if (
            removidaERN.customer !== operacaoERN.provedor_cliente_id ||
            removidaERN.deleted !== true
          ) {
            throw new Error('Dados da assinatura removida divergentes.');
          }
          confirmouRemocaoERN = true;
          break;
        }

        if (!paginaDadosERN.hasMore) break;

        if (paginaDadosERN.data.length === 0) {
          throw new Error('Paginação inconsistente.');
        }
      }

      if (confirmouRemocaoERN) {
        const { data: confirmacaoERN, error: erroConfirmacaoERN } =
          await admin.rpc('ern_confirmar_cancelamento_v1', {
            p_operacao_id: operacaoERN.id,
          });

        if (erroConfirmacaoERN || confirmacaoERN?.ok !== true) {
          throw new Error('Confirmação local não concluída.');
        }

        recuperadosERN += 1;
        itensERN.push({
          operacao_id: operacaoERN.id,
          resultado: 'cancelamento_recuperado',
        });
      } else {
        pendentesERN += 1;
        itensERN.push({
          operacao_id: operacaoERN.id,
          resultado: 'remocao_nao_confirmada',
        });
      }
    } catch {
      falhasERN += 1;
      itensERN.push({
        operacao_id: operacaoERN.id,
        resultado: 'exige_nova_consulta_ou_conferencia',
      });
    }

    // Rotacionar tentativas ainda abertas, sem liberar a reserva.
    const { error: erroRotacaoERN } = await admin
      .from('ern_operacoes_assinatura_v1')
      .update({ atualizado_em: new Date().toISOString() })
      .eq('id', operacaoERN.id)
      .eq('estado', operacaoERN.estado)
      .eq('atualizado_em', operacaoERN.atualizado_em);

    if (erroRotacaoERN) {
      throw new Error('Não foi possível registrar a passagem do conciliador.');
    }
  }

  return {
    encontrados: operacoesERN.length,
    examinados: itensERN.length,
    recuperados: recuperadosERN,
    pendentes: pendentesERN,
    falhas: falhasERN,
    lote_incompleto: operacoesERN.length > itensERN.length,
    itens: itensERN,
  };
}

async function recuperarVinculosCheckoutERN(
  admin: ReturnType<typeof criarAdminClient>
) {
  // ERN_RECUPERAR_CHECKOUTS_V1
  const prazoERN = Date.now() + 10000;
  const limiteERN = new Date(Date.now() - 15 * 60000).toISOString();

  const { data: operacoesERN, error: erroBuscaERN } = await admin
    .from('ern_operacoes_assinatura_v1')
    .select(
      'id, estado, atualizado_em, provedor_cliente_id, provedor_assinatura_id, valor, ciclo, moeda'
    )
    .eq('tipo', 'checkout')
    .eq('provedor', 'asaas')
    .in('estado', ['em_envio', 'reconciliar'])
    .lte('atualizado_em', limiteERN)
    .order('atualizado_em', { ascending: true })
    .limit(4);

  if (erroBuscaERN || !Array.isArray(operacoesERN)) {
    throw new Error('Não foi possível consultar checkouts para recuperação.');
  }

  let recuperadosERN = 0;
  let pendentesERN = 0;
  let falhasERN = 0;

  const itensERN: Array<{
    operacao_id: string;
    resultado: string;
  }> = [];

  for (const operacaoERN of operacoesERN.slice(0, 3)) {
    const restanteERN = prazoERN - Date.now();
    if (restanteERN <= 0) break;

    try {
      if (!ASAAS_API_KEY || !operacaoERN.provedor_cliente_id) {
        throw new Error('Configuração ou cliente da operação ausente.');
      }

      // Não filtrar por cliente aqui: a referência deve ser única
      // inclusive se existir uma assinatura divergente no provedor.
      const parametrosERN = new URLSearchParams({
        externalReference: operacaoERN.id,
        includeDeleted: 'true',
        limit: '2',
        offset: '0',
      });

      const respostaERN = await fetch(
        `${ASAAS_API_URL}/subscriptions?${parametrosERN}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'User-Agent': 'EncantosRioNegro/1.0',
            access_token: ASAAS_API_KEY,
          },
          cache: 'no-store',
          signal: AbortSignal.timeout(Math.min(4000, restanteERN)),
        }
      );

      if (!respostaERN.ok) {
        throw new Error('Consulta ao provedor indisponível.');
      }

      const listagemERN = await respostaERN.json();

      if (
        !listagemERN ||
        !Array.isArray(listagemERN.data) ||
        listagemERN.data.length > 2 ||
        typeof listagemERN.hasMore !== 'boolean'
      ) {
        throw new Error('Listagem de assinaturas inválida.');
      }

      if (listagemERN.hasMore || listagemERN.data.length > 1) {
        throw new Error('Mais de uma assinatura associada à operação.');
      }

      if (listagemERN.data.length === 0) {
        pendentesERN += 1;
        itensERN.push({
          operacao_id: operacaoERN.id,
          resultado: 'assinatura_nao_localizada_reserva_preservada',
        });
      } else {
        const assinaturaERN = listagemERN.data[0];

        const ciclosERN: Record<string, string> = {
          mensal: 'MONTHLY',
          trimestral: 'QUARTERLY',
          anual: 'YEARLY',
        };

        if (
          !assinaturaERN ||
          typeof assinaturaERN !== 'object' ||
          typeof assinaturaERN.id !== 'string' ||
          !assinaturaERN.id.startsWith('sub_') ||
          assinaturaERN.externalReference !== operacaoERN.id ||
          assinaturaERN.customer !== operacaoERN.provedor_cliente_id ||
          assinaturaERN.deleted !== false ||
          assinaturaERN.status !== 'ACTIVE' ||
          typeof assinaturaERN.value !== 'number' ||
          !Number.isFinite(assinaturaERN.value) ||
          assinaturaERN.value <= 0 ||
          assinaturaERN.value !== Number(operacaoERN.valor) ||
          operacaoERN.moeda !== 'BRL' ||
          assinaturaERN.cycle !== ciclosERN[String(operacaoERN.ciclo)] ||
          (
            operacaoERN.provedor_assinatura_id &&
            operacaoERN.provedor_assinatura_id !== assinaturaERN.id
          )
        ) {
          throw new Error('A assinatura encontrada não corresponde à operação.');
        }

        const { data: recuperacaoERN, error: erroRecuperacaoERN } =
          await admin.rpc('ern_recuperar_vinculo_checkout_v1', {
            p_operacao_id: operacaoERN.id,
            p_assinatura_asaas_id: assinaturaERN.id,
            p_cliente_asaas_id: assinaturaERN.customer,
            p_referencia_externa: assinaturaERN.externalReference,
            p_valor: assinaturaERN.value,
            p_ciclo_asaas: assinaturaERN.cycle,
          });

        if (erroRecuperacaoERN || recuperacaoERN?.ok !== true) {
          throw new Error('O vínculo local não pôde ser confirmado.');
        }

        if (recuperacaoERN.vinculo_recuperado === true) {
          recuperadosERN += 1;
          itensERN.push({
            operacao_id: operacaoERN.id,
            resultado: 'vinculo_recuperado_aguardando_confirmacao_pagamento',
          });
        } else {
          pendentesERN += 1;
          itensERN.push({
            operacao_id: operacaoERN.id,
            resultado: 'vinculo_ja_existente',
          });
        }
      }
    } catch {
      falhasERN += 1;
      itensERN.push({
        operacao_id: operacaoERN.id,
        resultado: 'exige_nova_consulta_ou_conferencia',
      });
    }

    // Rotacionar a consulta sem liberar nem sobrescrever outro estado.
    const { error: erroRotacaoERN } = await admin
      .from('ern_operacoes_assinatura_v1')
      .update({ atualizado_em: new Date().toISOString() })
      .eq('id', operacaoERN.id)
      .eq('estado', operacaoERN.estado)
      .eq('atualizado_em', operacaoERN.atualizado_em);

    if (erroRotacaoERN) {
      throw new Error('Não foi possível registrar a passagem da recuperação.');
    }
  }

  return {
    encontrados: operacoesERN.length,
    examinados: itensERN.length,
    recuperados: recuperadosERN,
    pendentes: pendentesERN,
    falhas: falhasERN,
    lote_incompleto: operacoesERN.length > itensERN.length,
    itens: itensERN,
  };
}

async function retomarEventosPagamentoERN(
  admin: ReturnType<typeof criarAdminClient>
) {
  // ERN_RETOMAR_EVENTOS_V1
  const prazoERN = Date.now() + 10000;
  const limiteERN = new Date(Date.now() - 15 * 60000).toISOString();

  const { data: eventosERN, error: erroBuscaERN } = await admin
    .from('webhook_eventos')
    .select('evento_id, tipo_evento, pagamento_id, created_at, updated_at')
    .eq('provedor', 'asaas')
    .eq('status', 'falhou')
    .in('tipo_evento', ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'])
    .not('pagamento_id', 'is', null)
    .lte('updated_at', limiteERN)
    .order('updated_at', { ascending: true })
    .limit(3);

  if (erroBuscaERN || !Array.isArray(eventosERN)) {
    throw new Error('Não foi possível consultar eventos para retomada.');
  }

  let concluidosERN = 0;
  let pendentesERN = 0;
  let falhasERN = 0;

  const itensERN: Array<{
    evento_id: string;
    resultado: string;
  }> = [];

  for (const eventoERN of eventosERN.slice(0, 2)) {
    const restanteERN = prazoERN - Date.now();
    if (restanteERN <= 0) break;

    try {
      const tokenWebhookERN = process.env.ASAAS_WEBHOOK_TOKEN;

      if (!ASAAS_API_KEY || !tokenWebhookERN || !eventoERN.pagamento_id) {
        throw new Error('Configuração da retomada incompleta.');
      }

      const consultaERN = await fetch(
        `${ASAAS_API_URL}/payments/${encodeURIComponent(eventoERN.pagamento_id)}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'User-Agent': 'EncantosRioNegro/1.0',
            access_token: ASAAS_API_KEY,
          },
          cache: 'no-store',
          signal: AbortSignal.timeout(Math.min(4000, restanteERN)),
        }
      );

      if (!consultaERN.ok) {
        throw new Error('Consulta atual do pagamento indisponível.');
      }

      const pagamentoERN = await consultaERN.json();

      if (
        !pagamentoERN ||
        typeof pagamentoERN !== 'object' ||
        pagamentoERN.id !== eventoERN.pagamento_id
      ) {
        throw new Error('Resposta de pagamento inválida.');
      }

      if (
        !['CONFIRMED', 'RECEIVED'].includes(pagamentoERN.status) ||
        pagamentoERN.deleted !== false
      ) {
        pendentesERN += 1;
        itensERN.push({
          evento_id: eventoERN.evento_id,
          resultado: 'estado_atual_nao_permite_ativacao',
        });
      } else {
        if (
          typeof pagamentoERN.customer !== 'string' ||
          typeof pagamentoERN.subscription !== 'string' ||
          typeof pagamentoERN.value !== 'number' ||
          !Number.isFinite(pagamentoERN.value) ||
          pagamentoERN.value <= 0
        ) {
          throw new Error('Identificação do pagamento incompleta.');
        }

        // Chamada direta ao handler: não faz uma requisição HTTP à ERN.
        // Mantém o identificador original e envia apenas os campos necessários.
        const requisicaoERN = new NextRequest(
          'http://ern.internal/api/webhooks/asaas',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'asaas-access-token': tokenWebhookERN,
            },
            body: JSON.stringify({
              id: eventoERN.evento_id,
              event: eventoERN.tipo_evento,
              dateCreated: eventoERN.created_at,
              payment: {
                id: pagamentoERN.id,
                status: pagamentoERN.status,
                value: pagamentoERN.value,
                customer: pagamentoERN.customer,
                subscription: pagamentoERN.subscription,
                externalReference: pagamentoERN.externalReference,
                dueDate: pagamentoERN.dueDate,
                paymentDate: pagamentoERN.paymentDate,
                clientPaymentDate: pagamentoERN.clientPaymentDate,
                deleted: pagamentoERN.deleted,
              },
            }),
          }
        );

        const respostaERN = await retomarWebhookAsaasERN(requisicaoERN);
        const resultadoERN = await respostaERN.json().catch(() => null);

        if (!respostaERN.ok || resultadoERN?.ok !== true) {
          throw new Error('O webhook não concluiu a retomada.');
        }

        if (resultadoERN.ignorado === true) {
          pendentesERN += 1;
          itensERN.push({
            evento_id: eventoERN.evento_id,
            resultado: 'evento_ignorado_pelo_handler',
          });
        } else {
          concluidosERN += 1;
          itensERN.push({
            evento_id: eventoERN.evento_id,
            resultado: 'evento_concluido',
          });
        }
      }
    } catch {
      falhasERN += 1;
      itensERN.push({
        evento_id: eventoERN.evento_id,
        resultado: 'retomada_nao_concluida',
      });
    }

    // Não modificar um evento assumido ou concluído por outra execução.
    const { error: erroRotacaoERN } = await admin
      .from('webhook_eventos')
      .update({ updated_at: new Date().toISOString() })
      .eq('provedor', 'asaas')
      .eq('evento_id', eventoERN.evento_id)
      .eq('status', 'falhou')
      .eq('updated_at', eventoERN.updated_at);

    if (erroRotacaoERN) {
      throw new Error('Não foi possível registrar a passagem da retomada.');
    }
  }

  return {
    encontrados: eventosERN.length,
    examinados: itensERN.length,
    concluidos: concluidosERN,
    pendentes: pendentesERN,
    falhas: falhasERN,
    lote_incompleto: eventosERN.length > itensERN.length,
    itens: itensERN,
  };
}

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

    const recuperacaoCancelamentosERN = await recuperarCancelamentosERN(admin);

    const recuperacaoCheckoutsERN = await recuperarVinculosCheckoutERN(admin);

    const retomadaEventosERN = await retomarEventosPagamentoERN(admin);

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
      checkouts.falhas + cancelamentos.falhas + recuperacaoCancelamentosERN.falhas + recuperacaoCheckoutsERN.falhas + retomadaEventosERN.falhas;

    const houveTrabalho = retomadaEventosERN.encontrados > 0 || recuperacaoCheckoutsERN.encontrados > 0 || recuperacaoCancelamentosERN.encontrados > 0 ||
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

        cancelamentos: cancelamentos,
        recuperacao_cancelamentos: recuperacaoCancelamentosERN,
        recuperacao_checkouts: recuperacaoCheckoutsERN,
        retomada_eventos: retomadaEventosERN,

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
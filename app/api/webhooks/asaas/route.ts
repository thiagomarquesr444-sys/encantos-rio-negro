import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  createClient,
} from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const ASAAS_WEBHOOK_TOKEN =
  process.env.ASAAS_WEBHOOK_TOKEN;

const ASAAS_API_KEY =
  process.env.ASAAS_API_KEY;

const ASAAS_API_URL = (
  process.env.ASAAS_API_URL ??
  'https://api-sandbox.asaas.com/v3'
).replace(/\/+$/, '');

type CicloERN =
  | 'mensal'
  | 'trimestral'
  | 'anual';

type AsaasPayment = {
  id?: string;
  status?: string;

  value?: number;
  netValue?: number;

  customer?: string;

  subscription?:
    | string
    | null;

  dueDate?:
    | string
    | null;

  paymentDate?:
    | string
    | null;

  clientPaymentDate?:
    | string
    | null;

  externalReference?:
    | string
    | null;

  deleted?: boolean;
};

type AsaasWebhookPayload = {
  id?: string;
  event?: string;
  dateCreated?: string;
  payment?: AsaasPayment;
};

type AssinaturaERN = {
  id: string;
  empresa_id: string;
  plano_id: string;
  status: string;

  ciclo_cobranca:
    | CicloERN
    | null;

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
    | CicloERN
    | null;

  renovacao_automatica:
    boolean;
};

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

function resposta(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,
    }
  );
}

function eventoEhPagamento(
  evento: string
) {
  return evento.startsWith(
    'PAYMENT_'
  );
}

function eventoAtivaPlano(
  evento: string
) {
  return (
    evento === 'PAYMENT_CONFIRMED' ||
    evento === 'PAYMENT_RECEIVED'
  );
}

function eventoCancelaOuReverte(
  evento: string
) {
  return [
    'PAYMENT_REFUNDED',
    'PAYMENT_DELETED',
    'PAYMENT_CHARGEBACK_REQUESTED',
  ].includes(evento);
}

function resolverStatusFinanceiro(
  evento: string,
  payment: AsaasPayment
) {
  switch (evento) {
    case 'PAYMENT_DELETED':
      return 'DELETED';

    case 'PAYMENT_REFUNDED':
      return 'REFUNDED';

    case 'PAYMENT_CHARGEBACK_REQUESTED':
      return 'CHARGEBACK_REQUESTED';

    default: {
      const status =
        String(
          payment.status ?? ''
        ).trim();

      if (status) {
        return status;
      }

      const statusPeloEvento =
        evento.replace(
          /^PAYMENT_/,
          ''
        );

      return (
        statusPeloEvento ||
        'PENDING'
      );
    }
  }
}

function ehUuid(
  valor:
    | string
    | null
    | undefined
) {
  if (!valor) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor
  );
}

function normalizarDataHoraExata(
  valor:
    | string
    | null
    | undefined
) {
  if (!valor) {
    return null;
  }

  const possuiHora =
    valor.includes('T') ||
    /\d{2}:\d{2}/.test(valor);

  if (!possuiHora) {
    return null;
  }

  const data =
    new Date(valor);

  if (
    Number.isNaN(
      data.getTime()
    )
  ) {
    return null;
  }

  return data.toISOString();
}

function obterDataPagamento(
  payload: AsaasWebhookPayload,
  payment: AsaasPayment
) {
  const paymentDate =
    normalizarDataHoraExata(
      payment.paymentDate
    );

  if (paymentDate) {
    return paymentDate;
  }

  const clientPaymentDate =
    normalizarDataHoraExata(
      payment.clientPaymentDate
    );

  if (clientPaymentDate) {
    return clientPaymentDate;
  }

  const eventoCriadoEm =
    normalizarDataHoraExata(
      payload.dateCreated
    );

  if (eventoCriadoEm) {
    return eventoCriadoEm;
  }

  return new Date()
    .toISOString();
}

async function cancelarAssinaturaAsaas(
  assinaturaId: string
) {
  if (!ASAAS_API_KEY) {
    throw new Error(
      'ASAAS_API_KEY não configurada.'
    );
  }

  const response =
    await fetch(
      `${ASAAS_API_URL}/subscriptions/${encodeURIComponent(
        assinaturaId
      )}`,
      {
        method: 'DELETE',

        headers: {
          Accept:
            'application/json',

          'Content-Type':
            'application/json',

          'User-Agent':
            'EncantosRioNegro/1.0',

          access_token:
            ASAAS_API_KEY,
        },

        cache: 'no-store',
      }
    );

  if (
    response.status === 404
  ) {
    return {
      ok: true,
      ja_removida: true,
    };
  }

  let data: any =
    null;

  try {
    data =
      await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    console.error(
      '[ASAAS WEBHOOK] Falha ao cancelar assinatura anterior:',
      {
        assinaturaId,
        status:
          response.status,
        resposta:
          data,
      }
    );

    throw new Error(
      data?.errors?.[0]
        ?.description ??
        'Não foi possível cancelar a assinatura anterior no Asaas.'
    );
  }

  return {
    ok: true,
    ja_removida: false,
    data,
  };
}

async function marcarEventoProcessado(
  admin: ReturnType<
    typeof criarAdminClient
  >,
  eventoId: string
) {
  const {
    error,
  } = await admin
    .from(
      'webhook_eventos'
    )
    .update({
      status:
        'processado',

      updated_at:
        new Date()
          .toISOString(),
    })
    .eq(
      'provedor',
      'asaas'
    )
    .eq(
      'evento_id',
      eventoId
    );

  if (error) {
    console.error(
      '[ASAAS WEBHOOK] Falha ao marcar evento como processado:',
      error
    );
  }
}

async function buscarAssinaturaPorCampo(
  admin: ReturnType<
    typeof criarAdminClient
  >,

  campo:
    | 'provedor_assinatura_id'
    | 'provedor_assinatura_pendente_id'
    | 'provedor_assinatura_anterior_id',

  valor: string
) {
  const {
    data,
    error,
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
        provedor_pagamento,
        provedor_cliente_id,
        provedor_assinatura_id,
        provedor_assinatura_anterior_id,
        provedor_assinatura_pendente_id,
        plano_pendente_id,
        ciclo_pendente,
        renovacao_automatica
      `
    )
    .eq(
      campo,
      valor
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return data as AssinaturaERN;
}

async function localizarAssinaturaPorPagamento(
  admin: ReturnType<
    typeof criarAdminClient
  >,

  payment: AsaasPayment
): Promise<
  AssinaturaERN | null
> {
  if (
    payment.subscription
  ) {
    const ativa =
      await buscarAssinaturaPorCampo(
        admin,
        'provedor_assinatura_id',
        payment.subscription
      );

    if (ativa) {
      return ativa;
    }

    const pendente =
      await buscarAssinaturaPorCampo(
        admin,
        'provedor_assinatura_pendente_id',
        payment.subscription
      );

    if (pendente) {
      return pendente;
    }

    const anterior =
      await buscarAssinaturaPorCampo(
        admin,
        'provedor_assinatura_anterior_id',
        payment.subscription
      );

    if (anterior) {
      return anterior;
    }

    return null;
  }

  if (
    payment.externalReference &&
    ehUuid(
      payment.externalReference
    )
  ) {
    const {
      data,
      error,
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
          provedor_pagamento,
          provedor_cliente_id,
          provedor_assinatura_id,
          provedor_assinatura_anterior_id,
          provedor_assinatura_pendente_id,
          plano_pendente_id,
          ciclo_pendente,
          renovacao_automatica
        `
      )
      .eq(
        'id',
        payment.externalReference
      )
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data as AssinaturaERN;
    }
  }

  return null;
}

async function localizarOuCriarCobranca(
  admin: ReturnType<
    typeof criarAdminClient
  >,

  payment: AsaasPayment,

  evento: string
) {
  if (!payment.id) {
    throw new Error(
      'Cobrança Asaas sem ID.'
    );
  }

  const {
    data: existente,
    error: existenteError,
  } = await admin
    .from(
      'cobrancas_assinaturas'
    )
    .select(
      `
        id,
        empresa_id,
        assinatura_id,
        plano_id,
        ciclo_cobranca,
        provedor_cobranca_id,
        provedor_assinatura_id,
        status,
        valor,
        moeda,
        vencimento,
        pago_em
      `
    )
    .eq(
      'provedor',
      'asaas'
    )
    .eq(
      'provedor_cobranca_id',
      payment.id
    )
    .maybeSingle();

  if (existenteError) {
    throw existenteError;
  }

  if (existente) {
    return existente;
  }

  const assinatura =
    await localizarAssinaturaPorPagamento(
      admin,
      payment
    );

  if (!assinatura) {
    return null;
  }

  const pertenceAoCheckoutPendente =
    Boolean(
      payment.subscription &&
      assinatura
        .provedor_assinatura_pendente_id ===
        payment.subscription
    );

  const planoId =
    pertenceAoCheckoutPendente
      ? assinatura
          .plano_pendente_id
      : assinatura.plano_id;

  const ciclo =
    pertenceAoCheckoutPendente
      ? assinatura
          .ciclo_pendente
      : assinatura
          .ciclo_cobranca;

  if (!planoId) {
    throw new Error(
      'Não foi possível determinar o plano da cobrança.'
    );
  }

  if (!ciclo) {
    throw new Error(
      'Não foi possível determinar o ciclo da cobrança.'
    );
  }

  const valor =
    Number(
      payment.value
    );

  if (
    !Number.isFinite(valor) ||
    valor <= 0
  ) {
    throw new Error(
      'Cobrança Asaas com valor inválido.'
    );
  }

  const statusInicial =
    resolverStatusFinanceiro(
      evento,
      payment
    );

  const {
    error: inserirError,
  } = await admin
    .from(
      'cobrancas_assinaturas'
    )
    .upsert(
      {
        empresa_id:
          assinatura.empresa_id,

        assinatura_id:
          assinatura.id,

        plano_id:
          planoId,

        ciclo_cobranca:
          ciclo,

        provedor:
          'asaas',

        provedor_cobranca_id:
          payment.id,

        provedor_assinatura_id:
          payment.subscription ??
          assinatura
            .provedor_assinatura_id,

        status:
          statusInicial,

        valor,

        moeda:
          'BRL',

        vencimento:
          payment.dueDate ??
          null,

        updated_at:
          new Date()
            .toISOString(),
      },
      {
        onConflict:
          'provedor,provedor_cobranca_id',

        ignoreDuplicates:
          false,
      }
    );

  if (inserirError) {
    throw inserirError;
  }

  const {
    data: criada,
    error: criadaError,
  } = await admin
    .from(
      'cobrancas_assinaturas'
    )
    .select(
      `
        id,
        empresa_id,
        assinatura_id,
        plano_id,
        ciclo_cobranca,
        provedor_cobranca_id,
        provedor_assinatura_id,
        status,
        valor,
        moeda,
        vencimento,
        pago_em
      `
    )
    .eq(
      'provedor',
      'asaas'
    )
    .eq(
      'provedor_cobranca_id',
      payment.id
    )
    .single();

  if (
    criadaError ||
    !criada
  ) {
    throw (
      criadaError ??
      new Error(
        'Cobrança ERN não encontrada após registro.'
      )
    );
  }

  return criada;
}

export async function POST(
  request: NextRequest
) {
  let admin:
    | ReturnType<
        typeof criarAdminClient
      >
    | null =
    null;

  let eventoId:
    | string
    | null =
    null;

  try {
    if (
      !ASAAS_WEBHOOK_TOKEN
    ) {
      console.error(
        '[ASAAS WEBHOOK] ASAAS_WEBHOOK_TOKEN ausente.'
      );

      return resposta(
        {
          ok: false,
          erro:
            'Webhook não configurado.',
        },
        500
      );
    }

    const tokenRecebido =
      request.headers.get(
        'asaas-access-token'
      );

    if (
      !tokenRecebido ||
      tokenRecebido !==
        ASAAS_WEBHOOK_TOKEN
    ) {
      console.warn(
        '[ASAAS WEBHOOK] Token inválido.'
      );

      return resposta(
        {
          ok: false,
          erro:
            'Não autorizado.',
        },
        401
      );
    }

    admin =
      criarAdminClient();

    const payload =
      (await request.json()) as
        AsaasWebhookPayload;

    eventoId =
      payload.id ??
      null;

    const evento =
      String(
        payload.event ?? ''
      );

    const payment =
      payload.payment;

    if (
      !eventoId ||
      !evento
    ) {
      return resposta(
        {
          ok: false,
          erro:
            'Evento inválido.',
        },
        400
      );
    }

    if (
      !eventoEhPagamento(
        evento
      )
    ) {
      return resposta({
        ok: true,
        ignorado: true,
        motivo:
          'Evento não tratado por este endpoint.',
      });
    }

    if (
      !payment?.id
    ) {
      return resposta(
        {
          ok: false,
          erro:
            'Cobrança não informada.',
        },
        400
      );
    }

    const {
      error:
        reservarError,
    } = await admin
      .from(
        'webhook_eventos'
      )
      .insert({
        provedor:
          'asaas',

        evento_id:
          eventoId,

        tipo_evento:
          evento,

        status:
          'processando',

        updated_at:
          new Date()
            .toISOString(),
      });

    if (reservarError) {
      if (
        reservarError.code ===
        '23505'
      ) {
        return resposta({
          ok: true,
          duplicado: true,
        });
      }

      throw reservarError;
    }

    const cobranca =
      await localizarOuCriarCobranca(
        admin,
        payment,
        evento
      );

    if (!cobranca) {
      await marcarEventoProcessado(
        admin,
        eventoId
      );

      return resposta({
        ok: true,
        ignorado: true,
        motivo:
          'Cobrança não pertence a uma assinatura ERN reconhecida.',
      });
    }

    if (
      cobranca
        .provedor_assinatura_id &&
      payment.subscription &&
      cobranca
        .provedor_assinatura_id !==
        payment.subscription
    ) {
      throw new Error(
        'Assinatura Asaas da cobrança não corresponde ao registro ERN.'
      );
    }

    const statusFinanceiro =
      resolverStatusFinanceiro(
        evento,
        payment
      );

    const atualizacao: {
      status: string;
      updated_at: string;

      vencimento?:
        | string
        | null;

      pago_em?: string;
    } = {
      status:
        statusFinanceiro,

      updated_at:
        new Date()
          .toISOString(),
    };

    if (
      payment.dueDate !==
      undefined
    ) {
      atualizacao.vencimento =
        payment.dueDate ??
        null;
    }

    if (
      eventoAtivaPlano(
        evento
      )
    ) {
      atualizacao.pago_em =
        obterDataPagamento(
          payload,
          payment
        );
    }

    const {
      error:
        atualizarError,
    } = await admin
      .from(
        'cobrancas_assinaturas'
      )
      .update(
        atualizacao
      )
      .eq(
        'id',
        cobranca.id
      );

    if (
      atualizarError
    ) {
      throw atualizarError;
    }

    if (
      !eventoAtivaPlano(
        evento
      )
    ) {
      if (
        eventoCancelaOuReverte(
          evento
        )
      ) {
        console.warn(
          '[ASAAS WEBHOOK] Evento financeiro definitivo:',
          evento,
          payment.id,
          '=>',
          statusFinanceiro
        );
      }

      await marcarEventoProcessado(
        admin,
        eventoId
      );

      return resposta({
        ok: true,
        evento,

        cobranca_registrada:
          true,

        status:
          statusFinanceiro,

        ativou_plano:
          false,
      });
    }

    if (
      !cobranca
        .assinatura_id
    ) {
      throw new Error(
        'Cobrança sem assinatura ERN vinculada.'
      );
    }

    const {
      data: assinatura,
      error:
        assinaturaError,
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
          provedor_pagamento,
          provedor_cliente_id,
          provedor_assinatura_id,
          provedor_assinatura_anterior_id,
          provedor_assinatura_pendente_id,
          plano_pendente_id,
          ciclo_pendente,
          renovacao_automatica
        `
      )
      .eq(
        'id',
        cobranca
          .assinatura_id
      )
      .single();

    if (
      assinaturaError ||
      !assinatura
    ) {
      throw (
        assinaturaError ??
        new Error(
          'Assinatura ERN não encontrada.'
        )
      );
    }

    if (
      assinatura
        .empresa_id !==
      cobranca
        .empresa_id
    ) {
      throw new Error(
        'Empresa da assinatura não corresponde à cobrança.'
      );
    }

    /*
      ==========================================================
      TROCA DE PLANO PENDENTE
      ==========================================================
    */

    if (
      assinatura
        .plano_pendente_id
    ) {
      if (
        assinatura
          .plano_pendente_id !==
        cobranca.plano_id
      ) {
        throw new Error(
          'Plano pendente não corresponde ao plano da cobrança.'
        );
      }

      if (
        assinatura
          .ciclo_pendente !==
        cobranca
          .ciclo_cobranca
      ) {
        throw new Error(
          'Ciclo pendente não corresponde ao ciclo da cobrança.'
        );
      }

      const novaAssinaturaId =
        assinatura
          .provedor_assinatura_pendente_id;

      if (
        !novaAssinaturaId
      ) {
        throw new Error(
          'Checkout pendente sem assinatura Asaas pendente.'
        );
      }

      if (
        payment.subscription &&
        payment.subscription !==
          novaAssinaturaId
      ) {
        throw new Error(
          'Pagamento não pertence à nova assinatura pendente.'
        );
      }

      if (
        cobranca
          .provedor_assinatura_id &&
        cobranca
          .provedor_assinatura_id !==
          novaAssinaturaId
      ) {
        throw new Error(
          'Cobrança não pertence à nova assinatura pendente.'
        );
      }

      const assinaturaAnteriorId =
        assinatura
          .provedor_assinatura_anterior_id ??
        (
          assinatura
            .provedor_assinatura_id &&
          assinatura
            .provedor_assinatura_id !==
            novaAssinaturaId
            ? assinatura
                .provedor_assinatura_id
            : null
        );

      if (
        assinaturaAnteriorId &&
        assinaturaAnteriorId !==
          novaAssinaturaId
      ) {
        await cancelarAssinaturaAsaas(
          assinaturaAnteriorId
        );
      }

      const agora =
        new Date()
          .toISOString();

      const {
        error:
          ativarPlanoError,
      } = await admin
        .from(
          'assinaturas_empresas'
        )
        .update({
          plano_id:
            assinatura
              .plano_pendente_id,

          ciclo_cobranca:
            assinatura
              .ciclo_pendente,

          status:
            'ativo',

          inicio_em:
            agora,

          fim_em:
            null,

          provedor_pagamento:
            'asaas',

          provedor_assinatura_id:
            novaAssinaturaId,

          /*
            Assinaturas pagas criadas pelo Asaas
            possuem recorrência automática.
          */

          renovacao_automatica:
            true,

          provedor_assinatura_anterior_id:
            null,

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
        })
        .eq(
          'id',
          assinatura.id
        );

      if (
        ativarPlanoError
      ) {
        throw ativarPlanoError;
      }

      await marcarEventoProcessado(
        admin,
        eventoId
      );

      return resposta({
        ok: true,
        evento,

        cobranca_registrada:
          true,

        ativou_plano:
          true,

        renovacao:
          false,

        renovacao_automatica:
          true,

        assinatura_anterior_cancelada:
          Boolean(
            assinaturaAnteriorId &&
            assinaturaAnteriorId !==
              novaAssinaturaId
          ),

        assinatura_ativa:
          novaAssinaturaId,
      });
    }

    /*
      ==========================================================
      RENOVAÇÃO NORMAL
      ==========================================================
    */

    if (
      assinatura
        .plano_id !==
      cobranca.plano_id
    ) {
      throw new Error(
        'Plano da cobrança não corresponde ao plano ativo da assinatura.'
      );
    }

    if (
      assinatura
        .ciclo_cobranca !==
      cobranca
        .ciclo_cobranca
    ) {
      throw new Error(
        'Ciclo da cobrança não corresponde ao ciclo ativo da assinatura.'
      );
    }

    if (
      payment.subscription &&
      assinatura
        .provedor_assinatura_id &&
      payment.subscription !==
        assinatura
          .provedor_assinatura_id
    ) {
      await marcarEventoProcessado(
        admin,
        eventoId
      );

      return resposta({
        ok: true,
        evento,

        cobranca_registrada:
          true,

        ativou_plano:
          false,

        renovacao:
          false,

        ignorado:
          true,

        motivo:
          'Pagamento pertence a uma assinatura Asaas que não é mais a assinatura ativa.',
      });
    }

    /*
      Uma cobrança confirmada/recebida da própria
      assinatura recorrente ativa comprova que a
      renovação automática continua vigente.

      Também recuperamos status ativo caso necessário.

      Não alteramos inicio_em.
    */

    if (
      assinatura.status !==
        'ativo' ||
      assinatura
        .renovacao_automatica !==
        true
    ) {
      const {
        error:
          restaurarAssinaturaError,
      } = await admin
        .from(
          'assinaturas_empresas'
        )
        .update({
          status:
            'ativo',

          renovacao_automatica:
            true,

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          'id',
          assinatura.id
        );

      if (
        restaurarAssinaturaError
      ) {
        throw restaurarAssinaturaError;
      }
    }

    await marcarEventoProcessado(
      admin,
      eventoId
    );

    return resposta({
      ok: true,
      evento,

      cobranca_registrada:
        true,

      ativou_plano:
        false,

      renovacao:
        true,

      renovacao_automatica:
        true,

      motivo:
        'Pagamento processado para assinatura recorrente já ativa.',
    });
  } catch (
    error: any
  ) {
    console.error(
      '[ASAAS WEBHOOK]',
      error
    );

    if (
      admin &&
      eventoId
    ) {
      try {
        await admin
          .from(
            'webhook_eventos'
          )
          .delete()
          .eq(
            'provedor',
            'asaas'
          )
          .eq(
            'evento_id',
            eventoId
          );
      } catch (
        cleanupError
      ) {
        console.error(
          '[ASAAS WEBHOOK] Falha ao liberar evento:',
          cleanupError
        );
      }
    }

    return resposta(
      {
        ok: false,

        erro:
          error?.message ??
          'Erro interno ao processar webhook.',
      },
      500
    );
  }
}
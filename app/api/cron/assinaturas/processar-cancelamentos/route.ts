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

/*
  Na Vercel, o Cron usa oficialmente CRON_SECRET.

  Em ambiente local, mantemos compatibilidade com
  ERN_CRON_SECRET para não quebrar os testes já realizados.
*/
const CRON_SECRET =
  process.env.CRON_SECRET ??
  process.env.ERN_CRON_SECRET;

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

  return authorization === esperado;
}

/*
  ============================================================
  PROCESSAMENTO
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

    if (!validarCron(request)) {
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
      2. LOCALIZA O PLANO FREE
      ========================================================
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
      return respostaErro(
        'Plano Grátis não está configurado.',
        500,
        'ERN_FREE_NAO_CONFIGURADO'
      );
    }

    /*
      ========================================================
      3. BUSCA CANCELAMENTOS VENCIDOS
      ========================================================

      Somente processamos:

      - data efetiva já alcançada;
      - destino definido;
      - destino igual ao plano Free atual.

      LIMIT 100 evita processamentos excessivos em uma única
      execução. Futuramente podemos adicionar paginação caso
      a ERN tenha grande volume.
      ========================================================
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

      return respostaErro(
        'Não foi possível localizar os cancelamentos pendentes.',
        500,
        'ERN_CRON_BUSCA_ERRO'
      );
    }

    const pendentes =
      (
        assinaturas ??
        []
      ) as
        AssinaturaParaCancelar[];

    /*
      ========================================================
      4. NENHUM CANCELAMENTO VENCIDO
      ========================================================
    */

    if (
      pendentes.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok:
            true,

          mensagem:
            'Nenhum cancelamento vencido encontrado.',

          executado_em:
            agora,

          encontrados:
            0,

          processados:
            0,

          falhas:
            0,
        },
        {
          status:
            200,
        }
      );
    }

    /*
      ========================================================
      5. PROCESSA CADA ASSINATURA
      ========================================================
    */

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
        /*
          ====================================================
          HISTÓRICO DA ÚLTIMA ASSINATURA PAGA

          provedor_assinatura_id representa a recorrência
          ATUAL.

          Como o plano passará a ser Free, não pode continuar
          parecendo existir uma recorrência ativa.

          Antes de limpar, preservamos esse identificador em
          provedor_assinatura_anterior_id.
          ====================================================
        */

        const ultimaAssinaturaPaga =
          assinatura
            .provedor_assinatura_id ??
          assinatura
            .provedor_assinatura_anterior_id ??
          null;

        /*
          ====================================================
          TRANSIÇÃO DEFINITIVA PARA FREE
          ====================================================
        */

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
            /*
              Plano atual passa a ser Free.
            */
            plano_id:
              planoFree.id,

            /*
              O Free não possui ciclo de cobrança.
            */
            ciclo_cobranca:
              null,

            /*
              Não existe renovação automática no Free.
            */
            renovacao_automatica:
              false,

            /*
              O acesso ao Free inicia exatamente quando
              terminou o período pago.
            */
            inicio_em:
              assinatura
                .cancelamento_efetivo_em,

            /*
              Free não possui data final programada.
            */
            fim_em:
              null,

            /*
              A recorrência paga anterior deixa de ser a
              assinatura atual.
            */
            provedor_assinatura_anterior_id:
              ultimaAssinaturaPaga,

            provedor_assinatura_id:
              null,

            /*
              Qualquer alteração paga pendente deve estar
              limpa após a conclusão do cancelamento.
            */
            provedor_assinatura_pendente_id:
              null,

            plano_pendente_id:
              null,

            ciclo_pendente:
              null,

            checkout_iniciado_em:
              null,

            /*
              Mantemos:
              - cancelamento_solicitado_em
              - cancelamento_efetivo_em

              como histórico da operação.

              Limpamos somente o destino pendente para que
              este registro não seja processado novamente.
            */
            plano_pos_cancelamento_id:
              null,

            /*
              O status continua ativo porque a empresa
              continua cliente da ERN, agora no Free.
            */
            status:
              'ativo',

            updated_at:
              agora,
          })

          /*
            ==================================================
            PROTEÇÕES DE IDEMPOTÊNCIA / CONCORRÊNCIA

            Só atualiza se:

            - ainda for este registro;
            - ainda estiver direcionado ao Free;
            - sua data já tiver chegado.

            Assim duas execuções simultâneas não devem
            converter repetidamente o mesmo registro.
            ==================================================
          */

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

        /*
          Se não retornou linha, outro processo pode ter
          concluído esta assinatura entre a busca e o update.

          Isso não deve ser tratado como erro financeiro.
        */

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

    /*
      ========================================================
      6. RESULTADO
      ========================================================
    */

    return NextResponse.json(
      {
        ok:
          falhas.length ===
          0,

        mensagem:
          falhas.length ===
          0
            ? 'Processamento de cancelamentos concluído.'
            : 'Processamento concluído com algumas falhas.',

        executado_em:
          agora,

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
      },
      {
        status:
          falhas.length ===
          0
            ? 200
            : 207,
      }
    );
  } catch (
    error: any
  ) {
    console.error(
      '[ERN CRON CANCELAMENTOS]',
      error
    );

    return respostaErro(
      error?.message ??
        'Erro interno no processador de cancelamentos.',
      500,
      'ERN_CRON_CANCELAMENTO_ERRO'
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
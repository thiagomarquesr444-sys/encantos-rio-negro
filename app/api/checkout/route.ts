import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  createClient,
} from '@supabase/supabase-js';

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

type CicloERN =
  | 'mensal'
  | 'trimestral'
  | 'anual';

type PlanoPermitido =
  | 'pro'
  | 'premium';

type AsaasPayment = {
  id?: string;
  status?: string;
  value?: number;

  dueDate?:
    | string
    | null;

  customer?: string;

  subscription?:
    | string
    | null;

  invoiceUrl?:
    | string
    | null;

  bankSlipUrl?:
    | string
    | null;

  externalReference?:
    | string
    | null;
};

type AsaasPaymentsResponse = {
  object?: string;
  hasMore?: boolean;
  totalCount?: number;
  limit?: number;
  offset?: number;
  data?: AsaasPayment[];
};

const CICLOS_ASAAS: Record<
  CicloERN,
  'MONTHLY' | 'QUARTERLY' | 'YEARLY'
> = {
  mensal: 'MONTHLY',
  trimestral: 'QUARTERLY',
  anual: 'YEARLY',
};

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

function criarAuthClient() {
  if (
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY
  ) {
    throw new Error(
      'Configuração pública do Supabase ausente.'
    );
  }

  return createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
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
  ASAAS

  Esta versão lê primeiro o corpo como texto.

  Isso evita perder:
  - status HTTP;
  - resposta não JSON;
  - respostas vazias;
  - mensagens de proxy/CDN/API.

  A API Key nunca é impressa no terminal.
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

  const url =
    `${ASAAS_API_URL}${endpoint}`;

  let response: Response;

  try {
    response =
      await fetch(
        url,
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

          cache:
            'no-store',
        }
      );
  } catch (error) {
    console.error(
      '[ASAAS HTTP DIAGNOSTICO]',
      {
        url,

        metodo:
          init.method ??
          'GET',

        tipo:
          'FALHA_DE_REDE',

        erro:
          error instanceof Error
            ? error.message
            : String(error),
      }
    );

    throw new Error(
      'Não foi possível conectar ao Asaas.'
    );
  }

  const texto =
    await response.text();

  let data: any = null;

  if (texto) {
    try {
      data =
        JSON.parse(texto);
    } catch {
      data =
        texto;
    }
  }

  if (!response.ok) {
    console.error(
      '[ASAAS HTTP DIAGNOSTICO]',
      {
        url,

        metodo:
          init.method ??
          'GET',

        status:
          response.status,

        statusText:
          response.statusText,

        contentType:
          response.headers.get(
            'content-type'
          ),

        resposta:
          data,
      }
    );

    let mensagem =
      `Asaas respondeu HTTP ${response.status}.`;

    if (
      data &&
      typeof data ===
        'object'
    ) {
      mensagem =
        data?.errors?.[0]
          ?.description ??
        data?.message ??
        mensagem;
    } else if (
      typeof data ===
        'string' &&
      data.trim()
    ) {
      mensagem =
        data.trim();
    }

    throw new Error(
      mensagem
    );
  }

  return data;
}

async function obterUsuario(
  request: NextRequest
) {
  const authorization =
    request.headers.get(
      'authorization'
    );

  if (
    !authorization ||
    !authorization.startsWith(
      'Bearer '
    )
  ) {
    throw new Error(
      'ERN_NAO_AUTENTICADO'
    );
  }

  const token =
    authorization.substring(7);

  const authClient =
    criarAuthClient();

  const {
    data,
    error,
  } =
    await authClient.auth.getUser(
      token
    );

  if (
    error ||
    !data.user
  ) {
    throw new Error(
      'ERN_SESSAO_INVALIDA'
    );
  }

  return data.user;
}

function dataHojeManaus() {
  const partes =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone:
          'America/Manaus',

        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit',
      }
    ).formatToParts(
      new Date()
    );

  const ano =
    partes.find(
      (parte) =>
        parte.type ===
        'year'
    )?.value;

  const mes =
    partes.find(
      (parte) =>
        parte.type ===
        'month'
    )?.value;

  const dia =
    partes.find(
      (parte) =>
        parte.type ===
        'day'
    )?.value;

  if (
    !ano ||
    !mes ||
    !dia
  ) {
    throw new Error(
      'Não foi possível calcular a data de cobrança.'
    );
  }

  return `${ano}-${mes}-${dia}`;
}

function esperar(
  milissegundos: number
) {
  return new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        milissegundos
      );
    }
  );
}

async function buscarPrimeiraCobranca(
  assinaturaAsaasId: string
) {
  /*
    A cobrança pode levar alguns instantes
    para aparecer após a criação da assinatura.
  */

  const intervalos = [
    0,
    400,
    800,
    1200,
  ];

  for (
    let tentativa = 0;
    tentativa <
    intervalos.length;
    tentativa++
  ) {
    const espera =
      intervalos[
        tentativa
      ];

    if (
      espera > 0
    ) {
      await esperar(
        espera
      );
    }

    const resposta =
      (await chamarAsaas(
        `/subscriptions/${encodeURIComponent(
          assinaturaAsaasId
        )}/payments`,
        {
          method:
            'GET',
        }
      )) as AsaasPaymentsResponse;

    const cobrancas =
      Array.isArray(
        resposta?.data
      )
        ? resposta.data
        : [];

    const primeira =
      cobrancas.find(
        (item) =>
          Boolean(
            item?.id
          )
      );

    if (
      primeira?.id
    ) {
      return primeira;
    }
  }

  return null;
}

export async function POST(
  request: NextRequest
) {
  try {
    /*
      ========================================================
      1. AUTENTICAÇÃO
      ========================================================
    */

    const usuario =
      await obterUsuario(
        request
      );

    const body =
      await request.json();

    const planoCodigo =
      String(
        body?.plano ?? ''
      ) as PlanoPermitido;

    const ciclo =
      String(
        body?.ciclo ?? ''
      ) as CicloERN;

    if (
      ![
        'pro',
        'premium',
      ].includes(
        planoCodigo
      )
    ) {
      return respostaErro(
        'Plano inválido.',
        400,
        'ERN_PLANO_INVALIDO'
      );
    }

    if (
      ![
        'mensal',
        'trimestral',
        'anual',
      ].includes(
        ciclo
      )
    ) {
      return respostaErro(
        'Ciclo inválido.',
        400,
        'ERN_CICLO_INVALIDO'
      );
    }

    const admin =
      criarAdminClient();

    /*
      ========================================================
      2. PERFIL
      ========================================================
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
        'Somente o administrador da empresa pode alterar o plano.',
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
      ========================================================
      3. EMPRESA
      ========================================================
    */

    const {
      data: empresa,
      error: empresaError,
    } = await admin
      .from(
        'empresa'
      )
      .select(
        'id, nome, cnpj, telefone, email'
      )
      .eq(
        'id',
        perfil.empresa_id
      )
      .single();

    if (
      empresaError ||
      !empresa
    ) {
      return respostaErro(
        'Empresa não encontrada.',
        404,
        'ERN_EMPRESA_NAO_ENCONTRADA'
      );
    }

    /*
      ========================================================
      4. ASSINATURA ERN ATUAL
      ========================================================
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
      .eq(
        'empresa_id',
        empresa.id
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

    /*
      ========================================================
      5. BLOQUEIA OUTRO CHECKOUT PENDENTE
      ========================================================
    */

    if (
      assinatura
        .plano_pendente_id ||
      assinatura
        .provedor_assinatura_pendente_id
    ) {
      return respostaErro(
        'Já existe uma contratação em andamento para esta empresa.',
        409,
        'ERN_CHECKOUT_PENDENTE'
      );
    }

    /*
      ========================================================
      6. PLANO ESCOLHIDO
      ========================================================
    */

    const {
      data: plano,
      error: planoError,
    } = await admin
      .from(
        'planos'
      )
      .select(
        'id, codigo, nome, ativo'
      )
      .eq(
        'codigo',
        planoCodigo
      )
      .eq(
        'ativo',
        true
      )
      .single();

    if (
      planoError ||
      !plano
    ) {
      return respostaErro(
        'Plano não encontrado.',
        404,
        'ERN_PLANO_NAO_ENCONTRADO'
      );
    }

    /*
      ========================================================
      7. NÃO RECOMPRA PLANO + CICLO IDÊNTICOS
      ========================================================
    */

    if (
      assinatura.plano_id ===
        plano.id &&
      assinatura.ciclo_cobranca ===
        ciclo
    ) {
      return respostaErro(
        'Este já é o plano e ciclo atuais da empresa.',
        409,
        'ERN_PLANO_JA_ATIVO'
      );
    }

    /*
      ========================================================
      8. PREÇO REAL DO BANCO
      ========================================================
    */

    const {
      data: preco,
      error: precoError,
    } = await admin
      .from(
        'precos_planos'
      )
      .select(
        'valor, moeda, ativo'
      )
      .eq(
        'plano_id',
        plano.id
      )
      .eq(
        'ciclo_cobranca',
        ciclo
      )
      .eq(
        'ativo',
        true
      )
      .single();

    if (
      precoError ||
      !preco ||
      preco.valor ===
        null
    ) {
      return respostaErro(
        'Preço não configurado para este plano.',
        409,
        'ERN_PRECO_NAO_CONFIGURADO'
      );
    }

    const valor =
      Number(
        preco.valor
      );

    if (
      !Number.isFinite(
        valor
      ) ||
      valor <= 0
    ) {
      return respostaErro(
        'Preço inválido.',
        500,
        'ERN_PRECO_INVALIDO'
      );
    }

    /*
      ========================================================
      9. CLIENTE ASAAS
      ========================================================
    */

    let asaasCustomerId =
      assinatura
        .provedor_cliente_id;

    if (
      !asaasCustomerId
    ) {
      if (
        !empresa.nome
      ) {
        return respostaErro(
          'Nome da empresa não cadastrado.',
          400,
          'ERN_EMPRESA_SEM_NOME'
        );
      }

      if (
        !empresa.cnpj
      ) {
        return respostaErro(
          'A empresa precisa ter CPF/CNPJ cadastrado para iniciar a contratação.',
          400,
          'ERN_EMPRESA_SEM_DOCUMENTO'
        );
      }

      const customer =
        await chamarAsaas(
          '/customers',
          {
            method:
              'POST',

            body:
              JSON.stringify({
                name:
                  empresa.nome,

                cpfCnpj:
                  empresa.cnpj,

                email:
                  empresa.email ||
                  undefined,

                mobilePhone:
                  empresa.telefone ||
                  undefined,

                externalReference:
                  empresa.id,
              }),
          }
        );

      if (
        !customer?.id
      ) {
        throw new Error(
          'Asaas não retornou o ID do cliente.'
        );
      }

      asaasCustomerId =
        String(
          customer.id
        );

      const {
        error:
          salvarClienteError,
      } = await admin
        .from(
          'assinaturas_empresas'
        )
        .update({
          provedor_pagamento:
            'asaas',

          provedor_cliente_id:
            asaasCustomerId,

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          'id',
          assinatura.id
        );

      if (
        salvarClienteError
      ) {
        throw new Error(
          'Não foi possível salvar o cliente Asaas na assinatura.'
        );
      }
    }

    /*
      ========================================================
      10. CRIA NOVA ASSINATURA ASAAS

      IMPORTANTE:

      - assinatura ERN atual permanece ativa;
      - plano atual permanece ativo;
      - assinatura Asaas antiga permanece ativa;
      - nova assinatura fica pendente até pagamento.
      ========================================================
    */

    const assinaturaAsaas =
      await chamarAsaas(
        '/subscriptions',
        {
          method:
            'POST',

          body:
            JSON.stringify({
              customer:
                asaasCustomerId,

              billingType:
                'UNDEFINED',

              value:
                valor,

              nextDueDate:
                dataHojeManaus(),

              cycle:
                CICLOS_ASAAS[
                  ciclo
                ],

              description:
                `ERN Gestão - ${plano.nome}`,

              externalReference:
                assinatura.id,
            }),
        }
      );

    if (
      !assinaturaAsaas?.id
    ) {
      throw new Error(
        'Asaas não retornou o ID da nova assinatura.'
      );
    }

    const novaAssinaturaAsaasId =
      String(
        assinaturaAsaas.id
      );

    /*
      ========================================================
      11. REGISTRA TROCA COMO PENDENTE

      provedor_assinatura_id
      = assinatura atualmente ativa

      provedor_assinatura_anterior_id
      = assinatura ativa a ser cancelada após pagamento

      provedor_assinatura_pendente_id
      = nova assinatura aguardando pagamento
      ========================================================
    */

    const agora =
      new Date()
        .toISOString();

    const {
      error:
        pendenciaError,
    } = await admin
      .from(
        'assinaturas_empresas'
      )
      .update({
        provedor_pagamento:
          'asaas',

        provedor_cliente_id:
          asaasCustomerId,

        provedor_assinatura_anterior_id:
          assinatura
            .provedor_assinatura_id ??
          null,

        provedor_assinatura_pendente_id:
          novaAssinaturaAsaasId,

        plano_pendente_id:
          plano.id,

        ciclo_pendente:
          ciclo,

        checkout_iniciado_em:
          agora,

        updated_at:
          agora,
      })
      .eq(
        'id',
        assinatura.id
      );

    if (
      pendenciaError
    ) {
      console.error(
        '[ERN CHECKOUT] Falha ao registrar checkout pendente:',
        pendenciaError
      );

      throw new Error(
        'A nova assinatura foi criada no Asaas, mas não foi possível registrar a troca no ERN.'
      );
    }

    /*
      ========================================================
      12. BUSCA PRIMEIRA COBRANÇA
      ========================================================
    */

    const primeiraCobranca =
      await buscarPrimeiraCobranca(
        novaAssinaturaAsaasId
      );

    if (
      !primeiraCobranca?.id
    ) {
      return NextResponse.json(
        {
          ok:
            true,

          mensagem:
            'Checkout iniciado. A cobrança ainda está sendo gerada pelo Asaas.',

          checkout: {
            provedor:
              'asaas',

            assinatura_id:
              novaAssinaturaAsaasId,

            cobranca_id:
              null,

            plano:
              plano.codigo,

            plano_nome:
              plano.nome,

            ciclo,

            valor,

            moeda:
              preco.moeda ??
              'BRL',

            status:
              assinaturaAsaas
                .status ??
              null,

            cobranca_registrada:
              false,
          },
        },
        {
          status:
            202,
        }
      );
    }

    /*
      ========================================================
      13. VALIDA PRIMEIRA COBRANÇA
      ========================================================
    */

    const valorCobranca =
      Number(
        primeiraCobranca
          .value
      );

    if (
      !Number.isFinite(
        valorCobranca
      ) ||
      valorCobranca <=
        0
    ) {
      throw new Error(
        'Asaas retornou uma cobrança com valor inválido.'
      );
    }

    if (
      primeiraCobranca
        .subscription &&
      primeiraCobranca
        .subscription !==
        novaAssinaturaAsaasId
    ) {
      throw new Error(
        'A cobrança retornada não pertence à nova assinatura.'
      );
    }

    /*
      Conferência adicional.

      Não aceitamos uma cobrança com preço
      diferente do preço escolhido no ERN.
    */

    if (
      Math.abs(
        valorCobranca -
        valor
      ) > 0.009
    ) {
      throw new Error(
        'O valor da cobrança Asaas não corresponde ao preço do plano no ERN.'
      );
    }

    /*
      ========================================================
      14. GRAVA COBRANÇA AUTOMATICAMENTE
      ========================================================
    */

    const {
      error:
        cobrancaError,
    } = await admin
      .from(
        'cobrancas_assinaturas'
      )
      .upsert(
        {
          empresa_id:
            empresa.id,

          assinatura_id:
            assinatura.id,

          plano_id:
            plano.id,

          ciclo_cobranca:
            ciclo,

          provedor:
            'asaas',

          provedor_cobranca_id:
            primeiraCobranca
              .id,

          provedor_assinatura_id:
            novaAssinaturaAsaasId,

          status:
            primeiraCobranca
              .status ??
            'PENDING',

          valor:
            valorCobranca,

          moeda:
            preco.moeda ??
            'BRL',

          vencimento:
            primeiraCobranca
              .dueDate ??
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

    if (
      cobrancaError
    ) {
      console.error(
        '[ERN CHECKOUT] Falha ao registrar cobrança:',
        cobrancaError
      );

      throw new Error(
        'A cobrança foi criada no Asaas, mas não pôde ser registrada no ERN.'
      );
    }

    /*
      ========================================================
      15. RETORNO
      ========================================================
    */

    return NextResponse.json(
      {
        ok:
          true,

        mensagem:
          'Checkout iniciado e cobrança registrada com sucesso.',

        checkout: {
          provedor:
            'asaas',

          assinatura_id:
            novaAssinaturaAsaasId,

          cobranca_id:
            primeiraCobranca
              .id,

          plano:
            plano.codigo,

          plano_nome:
            plano.nome,

          ciclo,

          valor:
            valorCobranca,

          moeda:
            preco.moeda ??
            'BRL',

          status:
            primeiraCobranca
              .status ??
            'PENDING',

          vencimento:
            primeiraCobranca
              .dueDate ??
            null,

          invoice_url:
            primeiraCobranca
              .invoiceUrl ??
            null,

          boleto_url:
            primeiraCobranca
              .bankSlipUrl ??
            null,

          cobranca_registrada:
            true,
        },
      },
      {
        status:
          201,
      }
    );
  } catch (
    error: any
  ) {
    console.error(
      '[ERN CHECKOUT]',
      error
    );

    const mensagem =
      String(
        error?.message ??
        ''
      );

    if (
      mensagem ===
      'ERN_NAO_AUTENTICADO'
    ) {
      return respostaErro(
        'Usuário não autenticado.',
        401,
        mensagem
      );
    }

    if (
      mensagem ===
      'ERN_SESSAO_INVALIDA'
    ) {
      return respostaErro(
        'Sessão inválida ou expirada.',
        401,
        mensagem
      );
    }

    return respostaErro(
      mensagem ||
        'Erro interno no checkout.',
      500,
      'ERN_CHECKOUT_ERRO'
    );
  }
}
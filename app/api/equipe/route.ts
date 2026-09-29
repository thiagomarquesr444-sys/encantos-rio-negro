import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const ROLES_PERMITIDOS = [
  'admin_empresa',
  'operador_empresa',
  'financeiro',
  'guia',
] as const;

type RolePermitido =
  (typeof ROLES_PERMITIDOS)[number];

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

function criarClienteAuth() {
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

function criarClienteAdmin() {
  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY não configurada.'
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

async function autenticarAdministrador(
  request: NextRequest
) {
  const authorization =
    request.headers.get('authorization');

  if (
    !authorization ||
    !authorization.startsWith(
      'Bearer '
    )
  ) {
    return {
      erro: respostaErro(
        'Sessão não informada.',
        401,
        'ERN_NAO_AUTENTICADO'
      ),
    };
  }

  const token =
    authorization.substring(7);

  const authClient =
    criarClienteAuth();

  const {
    data: userData,
    error: userError,
  } =
    await authClient.auth.getUser(
      token
    );

  if (
    userError ||
    !userData.user
  ) {
    return {
      erro: respostaErro(
        'Sessão inválida ou expirada.',
        401,
        'ERN_SESSAO_INVALIDA'
      ),
    };
  }

  const admin =
    criarClienteAdmin();

  const {
    data: perfil,
    error: perfilError,
  } = await admin
    .from('perfis')
    .select(
      'id, nome, role, empresa_id'
    )
    .eq(
      'id',
      userData.user.id
    )
    .single();

  if (
    perfilError ||
    !perfil
  ) {
    return {
      erro: respostaErro(
        'Perfil do usuário não encontrado.',
        403,
        'ERN_PERFIL_NAO_ENCONTRADO'
      ),
    };
  }

  if (!perfil.empresa_id) {
    return {
      erro: respostaErro(
        'Usuário sem empresa vinculada.',
        403,
        'ERN_USUARIO_SEM_EMPRESA'
      ),
    };
  }

  /*
    admin_plataforma fica reservado
    à administração central da ERN.

    Dentro de uma empresa, quem
    gerencia a equipe é admin_empresa.
  */
  if (
    perfil.role !==
    'admin_empresa'
  ) {
    return {
      erro: respostaErro(
        'Somente administradores da empresa podem gerenciar a equipe.',
        403,
        'ERN_SEM_PERMISSAO_EQUIPE'
      ),
    };
  }

  return {
    admin,
    usuario: userData.user,
    perfil,
  };
}

/*
  ============================================================
  GET /api/equipe
  Lista a equipe da própria empresa.
  ============================================================
*/

export async function GET(
  request: NextRequest
) {
  try {
    const autenticacao =
      await autenticarAdministrador(
        request
      );

    if ('erro' in autenticacao) {
      return autenticacao.erro;
    }

    const {
      admin,
      perfil,
    } = autenticacao;

    const {
      data: assinatura,
      error: assinaturaError,
    } = await admin
      .from(
        'assinaturas_empresas'
      )
      .select(`
        status,
        planos (
          codigo,
          nome,
          limite_usuarios
        )
      `)
      .eq(
        'empresa_id',
        perfil.empresa_id
      )
      .in(
        'status',
        ['ativo', 'trial']
      )
      .single();

    if (
      assinaturaError ||
      !assinatura
    ) {
      return respostaErro(
        'Assinatura ativa não encontrada.',
        403,
        'ERN_ASSINATURA_NAO_ENCONTRADA'
      );
    }

    const {
      data: membros,
      error: membrosError,
    } = await admin
      .from('perfis')
      .select(
        'id, nome, role, created_at'
      )
      .eq(
        'empresa_id',
        perfil.empresa_id
      )
      .order(
        'created_at',
        {
          ascending: true,
        }
      );

    if (membrosError) {
      return respostaErro(
        'Não foi possível carregar a equipe.',
        500,
        'ERN_ERRO_EQUIPE'
      );
    }

    /*
      Buscamos o e-mail no Auth apenas
      para os IDs que pertencem à empresa.

      Os perfis continuam sendo a fonte
      de vínculo empresa/role.
    */

    const membrosComEmail =
      await Promise.all(
        (membros ?? []).map(
          async (membro) => {
            const {
              data: authData,
            } =
              await admin.auth.admin.getUserById(
                membro.id
              );

            return {
              ...membro,
              email:
                authData.user
                  ?.email ?? null,
            };
          }
        )
      );

    const planosRelacionados =
      assinatura.planos as
        | {
            codigo: string;
            nome: string;
            limite_usuarios:
              | number
              | null;
          }
        | {
            codigo: string;
            nome: string;
            limite_usuarios:
              | number
              | null;
          }[]
        | null;

    const plano =
      Array.isArray(
        planosRelacionados
      )
        ? planosRelacionados[0]
        : planosRelacionados;

    if (!plano) {
      return respostaErro(
        'Plano da assinatura não encontrado.',
        500,
        'ERN_PLANO_NAO_ENCONTRADO'
      );
    }

    const total =
      membrosComEmail.length;

    const limite =
      plano.limite_usuarios;

    return NextResponse.json({
      ok: true,

      plano: {
        codigo: plano.codigo,
        nome: plano.nome,
        limite_usuarios:
          limite,
      },

      uso: {
        total_usuarios: total,

        ilimitado:
          limite === null,

        restante:
          limite === null
            ? null
            : Math.max(
                limite - total,
                0
              ),

        limite_atingido:
          limite !== null &&
          total >= limite,
      },

      membros:
        membrosComEmail,
    });
  } catch (error) {
    console.error(
      '[ERN /api/equipe GET]',
      error
    );

    return respostaErro(
      'Erro interno ao carregar a equipe.',
      500,
      'ERN_ERRO_INTERNO'
    );
  }
}

/*
  ============================================================
  POST /api/equipe
  Convida novo usuário para a empresa.
  ============================================================
*/

export async function POST(
  request: NextRequest
) {
  let usuarioAuthCriado:
    | string
    | null = null;

  try {
    const autenticacao =
      await autenticarAdministrador(
        request
      );

    if ('erro' in autenticacao) {
      return autenticacao.erro;
    }

    const {
      admin,
      perfil,
    } = autenticacao;

    const body =
      await request.json();

    const nome =
      String(
        body?.nome ?? ''
      ).trim();

    const email =
      String(
        body?.email ?? ''
      )
        .trim()
        .toLowerCase();

    const role =
      String(
        body?.role ?? ''
      ) as RolePermitido;

    if (!nome) {
      return respostaErro(
        'Informe o nome do usuário.',
        400,
        'ERN_NOME_OBRIGATORIO'
      );
    }

    if (
      !email ||
      !email.includes('@')
    ) {
      return respostaErro(
        'Informe um e-mail válido.',
        400,
        'ERN_EMAIL_INVALIDO'
      );
    }

    if (
      !ROLES_PERMITIDOS.includes(
        role
      )
    ) {
      return respostaErro(
        'Perfil de acesso inválido.',
        400,
        'ERN_ROLE_INVALIDA'
      );
    }

    /*
      ----------------------------------------------------------
      1. CONFERE PLANO ANTES DE CRIAR NO AUTH
      ----------------------------------------------------------
    */

    const {
      data: assinatura,
      error: assinaturaError,
    } = await admin
      .from(
        'assinaturas_empresas'
      )
      .select(`
        status,
        planos (
          codigo,
          nome,
          limite_usuarios
        )
      `)
      .eq(
        'empresa_id',
        perfil.empresa_id
      )
      .in(
        'status',
        ['ativo', 'trial']
      )
      .single();

    if (
      assinaturaError ||
      !assinatura
    ) {
      return respostaErro(
        'Assinatura ativa não encontrada.',
        403,
        'ERN_ASSINATURA_NAO_ENCONTRADA'
      );
    }

    const planosRelacionados =
      assinatura.planos as
        | {
            codigo: string;
            nome: string;
            limite_usuarios:
              | number
              | null;
          }
        | {
            codigo: string;
            nome: string;
            limite_usuarios:
              | number
              | null;
          }[]
        | null;

    const plano =
      Array.isArray(
        planosRelacionados
      )
        ? planosRelacionados[0]
        : planosRelacionados;

    if (!plano) {
      return respostaErro(
        'Plano da empresa não encontrado.',
        500,
        'ERN_PLANO_NAO_ENCONTRADO'
      );
    }

    const {
      count: totalUsuarios,
      error: countError,
    } = await admin
      .from('perfis')
      .select(
        'id',
        {
          count: 'exact',
          head: true,
        }
      )
      .eq(
        'empresa_id',
        perfil.empresa_id
      );

    if (countError) {
      return respostaErro(
        'Não foi possível verificar o limite de usuários.',
        500,
        'ERN_ERRO_LIMITE_USUARIOS'
      );
    }

    const total =
      totalUsuarios ?? 0;

    const limite =
      plano.limite_usuarios;

    if (
      limite !== null &&
      total >= limite
    ) {
      return respostaErro(
        `O plano ${plano.nome} atingiu o limite de ${limite} usuário${limite === 1 ? '' : 's'}.`,
        409,
        'ERN_LIMITE_USUARIOS_ATINGIDO'
      );
    }

    /*
      ----------------------------------------------------------
      2. CONVIDA NO SUPABASE AUTH
      ----------------------------------------------------------
    */

    const redirectTo =
      new URL(
        '/login',
        request.nextUrl.origin
      ).toString();

    const {
      data: convite,
      error: conviteError,
    } =
      await admin.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo,

          data: {
            nome,
            empresa_id:
              perfil.empresa_id,
          },
        }
      );

    if (
      conviteError ||
      !convite.user
    ) {
      const mensagem =
        conviteError?.message ??
        'Não foi possível criar o usuário no Auth.';

      return respostaErro(
        mensagem,
        400,
        'ERN_ERRO_CONVITE_USUARIO'
      );
    }

    usuarioAuthCriado =
      convite.user.id;

    /*
      ----------------------------------------------------------
      3. CRIA PERFIL DA EMPRESA

      Aqui o trigger do banco faz a segunda
      validação de limite.
      ----------------------------------------------------------
    */

    const {
      error: perfilNovoError,
    } = await admin
      .from('perfis')
      .insert({
        id: convite.user.id,
        nome,
        role,
        empresa_id:
          perfil.empresa_id,
      });

    if (perfilNovoError) {
      /*
        Rollback do usuário criado no Auth.
        Não queremos Auth órfão sem perfil.
      */

      await admin.auth.admin.deleteUser(
        convite.user.id
      );

      usuarioAuthCriado =
        null;

      const mensagem =
        perfilNovoError.message ??
        '';

      if (
        mensagem.includes(
          'ERN_LIMITE_USUARIOS_ATINGIDO'
        )
      ) {
        return respostaErro(
          'O limite de usuários do plano foi atingido.',
          409,
          'ERN_LIMITE_USUARIOS_ATINGIDO'
        );
      }

      if (
        mensagem.includes(
          'ERN_ASSINATURA_NAO_ENCONTRADA'
        )
      ) {
        return respostaErro(
          'A empresa não possui uma assinatura ativa.',
          403,
          'ERN_ASSINATURA_NAO_ENCONTRADA'
        );
      }

      return respostaErro(
        'Não foi possível vincular o usuário à empresa.',
        500,
        'ERN_ERRO_CRIAR_PERFIL'
      );
    }

    return NextResponse.json(
      {
        ok: true,

        mensagem:
          'Convite enviado com sucesso.',

        usuario: {
          id: convite.user.id,
          nome,
          email,
          role,
        },

        uso: {
          total_usuarios:
            total + 1,

          limite_usuarios:
            limite,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      '[ERN /api/equipe POST]',
      error
    );

    /*
      Defesa adicional caso uma exceção
      inesperada ocorra depois da criação.
    */

    if (
      usuarioAuthCriado &&
      SUPABASE_URL &&
      SUPABASE_SERVICE_ROLE_KEY
    ) {
      try {
        const admin =
          criarClienteAdmin();

        await admin.auth.admin.deleteUser(
          usuarioAuthCriado
        );
      } catch (rollbackError) {
        console.error(
          '[ERN rollback Auth]',
          rollbackError
        );
      }
    }

    return respostaErro(
      'Erro interno ao adicionar usuário.',
      500,
      'ERN_ERRO_INTERNO'
    );
  }
}
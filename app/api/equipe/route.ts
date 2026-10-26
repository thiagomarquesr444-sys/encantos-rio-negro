import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ROLES_PERMITIDOS = [
  'admin_empresa',
  'operador_empresa',
  'financeiro',
  'guia',
  'piloteiro',
] as const;

type RolePermitido = (typeof ROLES_PERMITIDOS)[number];

type Plano = {
  codigo: string;
  nome: string;
  limite_usuarios: number | null;
};

class FalhaEquipe extends Error {
  constructor(
    mensagem: string,
    readonly status: number,
    readonly codigo: string,
  ) {
    super(mensagem);
  }
}

function resposta(
  dados: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(dados, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'Pragma': 'no-cache',
    },
  });
}

function respostaErro(
  mensagem: string,
  status = 400,
  codigo = 'ERN_ERRO_EQUIPE',
) {
  return resposta(
    { ok: false, erro: mensagem, codigo },
    status,
  );
}

function tratarFalha(error: unknown) {
  if (error instanceof FalhaEquipe) {
    return respostaErro(
      error.message,
      error.status,
      error.codigo,
    );
  }

  console.error('[ERN equipe: falha inesperada]', {
    tipo: error instanceof Error ? error.name : typeof error,
  });

  return respostaErro(
    'Não foi possível concluir a operação. Atualize a equipe antes de tentar novamente.',
    500,
    'ERN_ERRO_INTERNO',
  );
}

function criarClientes() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !anon || !service) {
    throw new FalhaEquipe(
      'O serviço de equipe está temporariamente indisponível.',
      503,
      'ERN_CONFIGURACAO_INCOMPLETA',
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
    auth: createClient(url, anon, options),
    admin: createClient(url, service, options),
  };
}

async function autenticarAdministrador(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];

  if (!token) {
    throw new FalhaEquipe(
      'Sessão não informada.',
      401,
      'ERN_NAO_AUTENTICADO',
    );
  }

  const { auth, admin } = criarClientes();

  const { data, error } = await auth.auth.getUser(token);

  if (error || !data.user) {
    throw new FalhaEquipe(
      'Sua sessão expirou. Entre novamente.',
      401,
      'ERN_SESSAO_INVALIDA',
    );
  }

  const { data: perfil, error: perfilError } = await admin
    .from('perfis')
    .select('id,role,empresa_id')
    .eq('id', data.user.id)
    .single();

  if (
    perfilError ||
    !perfil?.empresa_id ||
    perfil.role !== 'admin_empresa'
  ) {
    throw new FalhaEquipe(
      'Somente administradores da empresa podem gerenciar a equipe.',
      403,
      'ERN_SEM_PERMISSAO_EQUIPE',
    );
  }

  return {
    admin,
    empresaId: String(perfil.empresa_id),
  };
}

type ClienteAdmin = ReturnType<typeof criarClientes>['admin'];

async function consultarPlano(
  admin: ClienteAdmin,
  empresaId: string,
): Promise<Plano> {
  const { data, error } = await admin
    .from('assinaturas_empresas')
    .select(`
      status,
      planos!assinaturas_empresas_plano_id_fkey (
        codigo,
        nome,
        limite_usuarios
      )
    `)
    .eq('empresa_id', empresaId)
    .in('status', ['ativo', 'trial'])
    .maybeSingle();

  if (error) {
    console.error('[ERN equipe: consulta assinatura]', {
      codigo: error.code,
    });

    throw new FalhaEquipe(
      'Não foi possível consultar a assinatura da empresa.',
      503,
      'ERN_ERRO_CONSULTAR_ASSINATURA',
    );
  }

  if (!data) {
    throw new FalhaEquipe(
      'A empresa não possui uma assinatura ativa.',
      403,
      'ERN_ASSINATURA_NAO_ENCONTRADA',
    );
  }

  const relacionado = data.planos as unknown;
  const candidato = Array.isArray(relacionado)
    ? relacionado.length === 1
      ? relacionado[0]
      : null
    : relacionado;

  if (
    !candidato ||
    typeof candidato !== 'object' ||
    !('codigo' in candidato) ||
    !('nome' in candidato) ||
    !('limite_usuarios' in candidato) ||
    typeof candidato.codigo !== 'string' ||
    typeof candidato.nome !== 'string' ||
    (
      candidato.limite_usuarios !== null &&
      (
        typeof candidato.limite_usuarios !== 'number' ||
        !Number.isSafeInteger(candidato.limite_usuarios) ||
        candidato.limite_usuarios < 0
      )
    )
  ) {
    throw new FalhaEquipe(
      'Não foi possível validar o plano da empresa.',
      503,
      'ERN_PLANO_INVALIDO',
    );
  }

  return {
    codigo: candidato.codigo,
    nome: candidato.nome,
    limite_usuarios: candidato.limite_usuarios,
  };
}

async function contarUsuarios(
  admin: ClienteAdmin,
  empresaId: string,
) {
  const { count, error } = await admin
    .from('perfis')
    .select('id', { count: 'exact', head: true })
    .eq('empresa_id', empresaId);

  if (error || count === null) {
    throw new FalhaEquipe(
      'Não foi possível verificar o uso de usuários.',
      503,
      'ERN_ERRO_LIMITE_USUARIOS',
    );
  }

  return count;
}

export async function GET(request: NextRequest) {
  try {
    const { admin, empresaId } =
      await autenticarAdministrador(request);

    const plano = await consultarPlano(admin, empresaId);

    const { data, count, error } = await admin
      .from('perfis')
      .select('id,nome,role,created_at', { count: 'exact' })
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(0, 999);

    if (
      error ||
      count === null ||
      !data ||
      data.length !== count ||
      new Set(data.map((item) => item.id)).size !== data.length
    ) {
      throw new FalhaEquipe(
        'Não foi possível carregar a equipe completa. Atualize os dados.',
        503,
        'ERN_EQUIPE_INCOMPLETA',
      );
    }

    const membros: Array<{
      id: string;
      nome: string | null;
      role: string;
      created_at: string | null;
      email: string | null;
    }> = [];

    // Limita a quantidade de consultas simultâneas ao Auth.
    for (let inicio = 0; inicio < data.length; inicio += 5) {
      const lote = await Promise.all(
        data.slice(inicio, inicio + 5).map(async (membro) => {
          const { data: conta, error: contaError } =
            await admin.auth.admin.getUserById(membro.id);

          if (contaError || !conta.user) {
            throw new FalhaEquipe(
              'Não foi possível consultar todas as contas da equipe. Atualize os dados.',
              503,
              'ERN_ERRO_CONSULTAR_CONTAS',
            );
          }

          return {
            ...membro,
            email: conta.user.email ?? null,
          };
        }),
      );

      membros.push(...lote);
    }

    const limite = plano.limite_usuarios;

    return resposta({
      ok: true,
      plano,
      uso: {
        total_usuarios: count,
        ilimitado: limite === null,
        restante: limite === null
          ? null
          : Math.max(limite - count, 0),
        limite_atingido: limite !== null && count >= limite,
      },
      membros,
    });
  } catch (error) {
    return tratarFalha(error);
  }
}

async function lerConviteEquipeERN(request: NextRequest): Promise<unknown> {
  const limite = 4096;
  const tipo = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();

  if (tipo !== 'application/json') {
    throw new FalhaEquipe('Envie os dados no formato JSON.', 415, 'ERN_FORMATO_INVALIDO');
  }

  const tamanhoInformado = request.headers.get('content-length');
  if (tamanhoInformado !== null && Number(tamanhoInformado) > limite) {
    throw new FalhaEquipe('Os dados do convite excedem o tamanho permitido.', 413, 'ERN_CORPO_MUITO_GRANDE');
  }

  const leitor = request.body?.getReader();
  if (!leitor) {
    throw new FalhaEquipe('Os dados enviados não são válidos.', 400, 'ERN_CORPO_INVALIDO');
  }

  const partes: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await leitor.read();
      if (done) break;
      total += value.byteLength;

      if (total > limite) {
        await leitor.cancel().catch(() => undefined);
        throw new FalhaEquipe('Os dados do convite excedem o tamanho permitido.', 413, 'ERN_CORPO_MUITO_GRANDE');
      }

      partes.push(value);
    }
  } catch (falha) {
    if (falha instanceof FalhaEquipe) throw falha;

    throw new FalhaEquipe(
      'A leitura do convite foi interrompida. Tente novamente.',
      400,
      'ERN_CORPO_INVALIDO',
    );
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
    const texto = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    dados = JSON.parse(texto);
  } catch {
    throw new FalhaEquipe('Os dados enviados não são válidos.', 400, 'ERN_CORPO_INVALIDO');
  }

  if (
    dados !== null &&
    typeof dados === 'object' &&
    !Array.isArray(dados) &&
    Object.keys(dados).some(
      campo => !['nome', 'email', 'role'].includes(campo),
    )
  ) {
    throw new FalhaEquipe(
      'Envie somente nome, e-mail e função do integrante.',
      400,
      'ERN_CAMPO_NAO_PERMITIDO',
    );
  }

  return dados;
}

export async function POST(request: NextRequest) {
  let conviteIniciado = false;
  let usuarioId: string | null = null;

  try {
    const { admin, empresaId } =
      await autenticarAdministrador(request);

    const body: unknown = await lerConviteEquipeERN(request);

    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body)
    ) {
      return respostaErro(
        'Os dados enviados não são válidos.',
        400,
        'ERN_CORPO_INVALIDO',
      );
    }

    const campos = body as Record<string, unknown>;
    const nome = typeof campos.nome === 'string'
      ? campos.nome.trim()
      : '';
    const email = typeof campos.email === 'string'
      ? campos.email.trim().toLowerCase()
      : '';
    const role = typeof campos.role === 'string'
      ? campos.role
      : '';

    if (
      nome.length < 3 ||
      nome.length > 100 ||
      /[\u0000-\u001f\u007f]/.test(nome)
    ) {
      return respostaErro(
        'Informe um nome entre 3 e 100 caracteres.',
        400,
        'ERN_NOME_INVALIDO',
      );
    }

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return respostaErro(
        'Informe um e-mail válido.',
        400,
        'ERN_EMAIL_INVALIDO',
      );
    }

    if (!ROLES_PERMITIDOS.includes(role as RolePermitido)) {
      return respostaErro(
        'Perfil de acesso inválido.',
        400,
        'ERN_ROLE_INVALIDA',
      );
    }

    const plano = await consultarPlano(admin, empresaId);
    const total = await contarUsuarios(admin, empresaId);
    const limite = plano.limite_usuarios;

    if (limite !== null && total >= limite) {
      return respostaErro(
        `O plano ${plano.nome} atingiu o limite de ${limite} usuário(s).`,
        409,
        'ERN_LIMITE_USUARIOS_ATINGIDO',
      );
    }

    const redirectTo = new URL(
      '/auth/nova-senha',
      request.nextUrl.origin,
    ).toString();

    conviteIniciado = true;

    const { data: convite, error: conviteError } =
      await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
          nome,
          empresa_id: empresaId,
        },
      });

    if (conviteError || !convite.user) {
      console.error('[ERN equipe: convite não concluído]', {
        codigo: conviteError?.code,
        status: conviteError?.status,
      });

      return respostaErro(
        'O serviço não confirmou o convite. Confira a equipe e o cadastro no Supabase antes de repetir. Uma conta existente ou uma restrição no envio de e-mails pode impedir a operação.',
        409,
        'ERN_CONVITE_NAO_CONFIRMADO',
      );
    }

    usuarioId = convite.user.id;

    if (convite.user.email?.toLowerCase() !== email) {
      return respostaErro(
        'Não foi possível validar a conta retornada pelo serviço. O vínculo empresarial não foi criado.',
        502,
        'ERN_CONTA_CONVITE_INVALIDA',
      );
    }

    // Um convite aceito pelo Auth não comprova que a conta
    // foi criada exclusivamente por esta requisição.
    // Não excluímos nem sobrescrevemos contas existentes.
    const { data: existente, error: existenteError } = await admin
      .from('perfis')
      .select('id,empresa_id,role,nome')
      .eq('id', usuarioId)
      .maybeSingle();

    if (existenteError) {
      return respostaErro(
        'O convite foi aceito pelo serviço, mas não foi possível verificar o vínculo. Confira o cadastro antes de repetir.',
        503,
        'ERN_VERIFICACAO_VINCULO_PENDENTE',
      );
    }

    if (existente) {
      return respostaErro(
        'Esta conta já possui um perfil. Nenhum vínculo ou papel existente foi alterado. Atualize a equipe antes de continuar.',
        409,
        'ERN_CONTA_COM_PERFIL',
      );
    }

    const { error: perfilError } = await admin
      .from('perfis')
      .insert({
        id: usuarioId,
        nome,
        role,
        empresa_id: empresaId,
      });

    // Confere o resultado mesmo quando a gravação retorna erro:
    // a conexão pode falhar depois de o banco confirmar o INSERT.
    const { data: gravado, error: verificacaoError } = await admin
      .from('perfis')
      .select('id,empresa_id,role,nome')
      .eq('id', usuarioId)
      .maybeSingle();

    const vinculoConfirmado =
      !verificacaoError &&
      gravado?.empresa_id === empresaId &&
      gravado.role === role &&
      gravado.nome === nome;

    if (!vinculoConfirmado) {
      console.error('[ERN equipe: vínculo não confirmado]', {
        usuario_id: usuarioId,
        codigo_gravacao: perfilError?.code,
        codigo_verificacao: verificacaoError?.code,
      });

      if (!verificacaoError && !gravado) {
        const mensagem = perfilError?.message ?? '';

        if (mensagem.includes('ERN_LIMITE_USUARIOS_ATINGIDO')) {
          return respostaErro(
            'O limite foi atingido durante a operação. O convite já foi solicitado, mas o vínculo não foi criado. A conta foi preservada; revise o cadastro antes de reenviar.',
            409,
            'ERN_LIMITE_USUARIOS_ATINGIDO',
          );
        }

        if (mensagem.includes('ERN_ASSINATURA_NAO_ENCONTRADA')) {
          return respostaErro(
            'A assinatura deixou de estar ativa. O convite já foi solicitado, mas o vínculo não foi criado. Revise o cadastro antes de reenviar.',
            409,
            'ERN_ASSINATURA_NAO_ENCONTRADA',
          );
        }
      }

      return respostaErro(
        'O convite foi aceito pelo serviço, mas o vínculo empresarial não foi confirmado. A conta foi preservada. Confira a equipe e o cadastro no Supabase antes de repetir.',
        503,
        'ERN_VINCULO_NAO_CONFIRMADO',
      );
    }

    return resposta(
      {
        ok: true,
        mensagem:
          'Vínculo criado e convite aceito pelo serviço de e-mail. Confira o recebimento, inclusive na caixa de spam.',
        usuario: {
          id: usuarioId,
          nome,
          email,
          role,
        },
      },
      201,
    );
  } catch (error) {
    if (conviteIniciado) {
      console.error('[ERN equipe: resultado pendente]', {
        usuario_id: usuarioId,
        tipo: error instanceof Error ? error.name : typeof error,
      });

      return respostaErro(
        'A operação foi interrompida após iniciar o convite. A conta foi preservada. Atualize a equipe e confira o cadastro no Supabase antes de tentar novamente.',
        503,
        'ERN_RESULTADO_CONVITE_PENDENTE',
      );
    }

    return tratarFalha(error);
  }
}
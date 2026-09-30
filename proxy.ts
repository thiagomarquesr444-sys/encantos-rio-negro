import { createServerClient } from '@supabase/ssr';
import {
  NextResponse,
  type NextRequest,
} from 'next/server';

const ROTAS_EMPRESA = [
  '/dashboard',
  '/financeiro',
  '/clientes',
  '/reservas',
  '/hospedagens',
  '/passeios',
  '/configuracoes',
  '/embarcacoes',
  '/guias',
  '/parceiros',
  '/relatorios',
  '/vouchers',
  '/planos',
  '/demandas',
] as const;

const PAPEIS_EMPRESA = [
  'admin_empresa',
  'operador_empresa',
  'financeiro',
  'guia',
  'admin_plataforma',
] as const;

type TipoAcesso = 'operadora' | 'guia' | 'fornecedor';

function pertenceARota(
  pathname: string,
  rota: string,
): boolean {
  return (
    pathname === rota ||
    pathname.startsWith(`${rota}/`)
  );
}

function interpretarAcesso(
  valor: string | null,
): TipoAcesso | null {
  if (
    valor === 'operadora' ||
    valor === 'guia' ||
    valor === 'fornecedor'
  ) {
    return valor;
  }

  return null;
}

function impedirCache(response: NextResponse): void {
  response.headers.set(
    'Cache-Control',
    'private, no-store, max-age=0',
  );
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // O webhook valida sua autenticação no próprio endpoint.
  if (pertenceARota(pathname, '/api/webhooks/asaas')) {
    return NextResponse.next();
  }

  // O callback precisa funcionar antes de existir uma sessão.
  if (pertenceARota(pathname, '/auth/callback')) {
    return NextResponse.next();
  }

  const rotaEmpresa = ROTAS_EMPRESA.some((rota) =>
    pertenceARota(pathname, rota),
  );

  // /guia é independente; /guias pertence à operadora.
  const rotaGuia = pertenceARota(pathname, '/guia');

  const rotaFornecedor = pertenceARota(
    pathname,
    '/fornecedor',
  );

  const rotaAcesso = pertenceARota(pathname, '/acesso');

  const rotaNovaSenha = pertenceARota(
    pathname,
    '/auth/nova-senha',
  );

  const exigeVerificacao =
    rotaEmpresa ||
    rotaGuia ||
    rotaFornecedor ||
    rotaAcesso ||
    rotaNovaSenha;

  // Portal e login continuam públicos.
  // As APIs verificam autenticação e autorização no endpoint.
  if (!exigeVerificacao) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  impedirCache(response);

  function transferirCookies(
    destino: NextResponse,
  ): NextResponse {
    for (const cookie of response.cookies.getAll()) {
      destino.cookies.set(cookie);
    }

    impedirCache(destino);

    return destino;
  }

  function redirecionar(destino: string): NextResponse {
    return transferirCookies(
      NextResponse.redirect(
        new URL(destino, request.url),
      ),
    );
  }

  function indisponivel(): NextResponse {
    return transferirCookies(
      new NextResponse(
        'Não foi possível verificar seu acesso agora. Atualize a página em alguns instantes.',
        {
          status: 503,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Retry-After': '10',
          },
        },
      ),
    );
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return indisponivel();
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(cookiesToSet) {
            const cookiesAnteriores =
              response.cookies.getAll();

            for (const { name, value } of cookiesToSet) {
              request.cookies.set(name, value);
            }

            response = NextResponse.next({ request });

            for (const cookie of cookiesAnteriores) {
              response.cookies.set(cookie);
            }

            for (const {
              name,
              value,
              options,
            } of cookiesToSet) {
              response.cookies.set(name, value, options);
            }

            impedirCache(response);
          },
        },
      },
    );

    const {
      data: { user },
      error: erroUsuario,
    } = await supabase.auth.getUser();

    if (
      erroUsuario &&
      (
        (erroUsuario.status ?? 0) >= 500 ||
        erroUsuario.status === 429 ||
        erroUsuario.name === 'AuthRetryableFetchError'
      )
    ) {
      return indisponivel();
    }

    if (erroUsuario || !user || user.is_anonymous) {
      // A página orienta sobre sessão ausente ou link inválido.
      // A alteração da senha exige autenticação no Supabase.
      if (rotaNovaSenha) {
        return response;
      }

      const solicitado: TipoAcesso | null =
        rotaEmpresa
          ? 'operadora'
          : rotaGuia
            ? 'guia'
            : rotaFornecedor
              ? 'fornecedor'
              : interpretarAcesso(
                  request.nextUrl.searchParams.get('acesso'),
                );

      return redirecionar(
        solicitado
          ? `/login?acesso=${solicitado}`
          : '/login',
      );
    }

    // Recuperação e definição de senha não dependem
    // de vínculo empresarial ou cadastro profissional.
    if (rotaNovaSenha) {
      return response;
    }

    // O vínculo empresarial é verificado antes
    // de qualquer acesso profissional independente.
    const {
      data: perfil,
      error: erroPerfil,
    } = await supabase
      .from('perfis')
      .select('empresa_id,role')
      .eq('id', user.id)
      .maybeSingle();

    if (erroPerfil) {
      return indisponivel();
    }

    const possuiEmpresa = Boolean(perfil?.empresa_id);

    const papelEmpresaPermitido = PAPEIS_EMPRESA.some(
      (papel) => papel === perfil?.role,
    );

    if (possuiEmpresa) {
      if (!papelEmpresaPermitido) {
        // A página de acesso explica o vínculo pendente.
        // Não redireciona para si mesma.
        if (rotaAcesso) {
          return response;
        }

        return redirecionar('/acesso?acesso=operadora');
      }

      if (rotaEmpresa) {
        // Permissões específicas continuam sendo
        // verificadas pelos módulos, APIs e RLS.
        return response;
      }

      // Conta da equipe não entra no painel independente
      // de guia ou fornecedor nem no seletor de atividades.
      return redirecionar('/dashboard');
    }

    // Contas sem empresa podem concluir seu cadastro aqui.
    // A página verifica a modalidade já existente.
    if (rotaAcesso) {
      return response;
    }

    const {
      data: adesoes,
      error: erroAdesoes,
    } = await supabase
      .from('acessos_profissionais')
      .select('tipo')
      .eq('usuario_id', user.id)
      .limit(2);

    if (erroAdesoes) {
      return indisponivel();
    }

    // A restrição no banco admite uma modalidade por conta.
    // Se houver inconsistência, não escolhe uma arbitrariamente.
    if ((adesoes?.length ?? 0) > 1) {
      return redirecionar('/acesso');
    }

    const modalidade = adesoes?.[0]?.tipo;

    if (
      modalidade !== undefined &&
      modalidade !== 'guia' &&
      modalidade !== 'fornecedor'
    ) {
      return redirecionar('/acesso');
    }

    if (modalidade === 'guia') {
      if (rotaGuia) {
        return response;
      }

      return redirecionar('/guia');
    }

    if (modalidade === 'fornecedor') {
      if (rotaFornecedor) {
        return response;
      }

      return redirecionar('/fornecedor');
    }

    // Usuário autenticado, mas ainda sem vínculo.
    // A URL informa a intenção; não concede permissão.
    if (rotaEmpresa) {
      return redirecionar('/acesso?acesso=operadora');
    }

    if (rotaGuia) {
      return redirecionar('/acesso?acesso=guia');
    }

    if (rotaFornecedor) {
      return redirecionar('/acesso?acesso=fornecedor');
    }

    return redirecionar('/acesso');
  } catch {
    return indisponivel();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
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

function pertenceARota(
  pathname: string,
  rota: string
): boolean {
  return (
    pathname === rota ||
    pathname.startsWith(`${rota}/`)
  );
}

function impedirCache(response: NextResponse) {
  response.headers.set(
    'Cache-Control',
    'private, no-store, max-age=0'
  );
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // O webhook mantém sua autenticação no próprio endpoint.
  if (
    pertenceARota(pathname, '/api/webhooks/asaas')
  ) {
    return NextResponse.next();
  }

  // O callback valida o código e grava a sessão.
  // Não pode exigir uma sessão anterior à confirmação.
  if (pertenceARota(pathname, '/auth/callback')) {
    return NextResponse.next();
  }

  const rotaEmpresa = ROTAS_EMPRESA.some((rota) =>
    pertenceARota(pathname, rota)
  );

  // A comparação distingue /guia de /guias.
  const rotaGuia = pertenceARota(pathname, '/guia');

  const rotaFornecedor = pertenceARota(
    pathname,
    '/fornecedor'
  );

  const rotaAcesso = pertenceARota(
    pathname,
    '/acesso'
  );

  const rotaNovaSenha = pertenceARota(
    pathname,
    '/auth/nova-senha'
  );

  const exigeVerificacao =
    rotaEmpresa ||
    rotaGuia ||
    rotaFornecedor ||
    rotaAcesso ||
    rotaNovaSenha;

  // Portal e login permanecem acessíveis.
  // APIs continuam responsáveis pela própria autorização.
  if (!exigeVerificacao) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  impedirCache(response);

  function transferirCookies(destino: NextResponse) {
    for (const cookie of response.cookies.getAll()) {
      destino.cookies.set(cookie);
    }

    impedirCache(destino);

    return destino;
  }

  function redirecionar(destino: string) {
    return transferirCookies(
      NextResponse.redirect(
        new URL(destino, request.url)
      )
    );
  }

  function indisponivel() {
    return transferirCookies(
      new NextResponse(
        'Não foi possível verificar seu acesso agora. Atualize a página em alguns instantes.',
        {
          status: 503,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Retry-After': '10',
          },
        }
      )
    );
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return indisponivel();
  }

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

          // Atualiza a sessão que seguirá para o servidor.
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          response = NextResponse.next({ request });

          // Preserva cookies de atualizações anteriores.
          for (const cookie of cookiesAnteriores) {
            response.cookies.set(cookie);
          }

          // Envia a sessão atualizada ao navegador.
          for (const {
            name,
            value,
            options,
          } of cookiesToSet) {
            response.cookies.set(
              name,
              value,
              options
            );
          }

          impedirCache(response);
        },
      },
    }
  );

  try {
    const {
      data: { user },
      error: erroUsuario,
    } = await supabase.auth.getUser();

    if (
      erroUsuario &&
      (
        (erroUsuario.status ?? 0) >= 500 ||
        erroUsuario.name === 'AuthRetryableFetchError'
      )
    ) {
      return indisponivel();
    }

    if (erroUsuario || !user || user.is_anonymous) {
      // Esta página mostra a orientação para sessão
      // ausente ou link inválido. A alteração da senha
      // continua exigindo autenticação no Supabase.
      if (rotaNovaSenha) {
        return response;
      }

      if (rotaGuia) {
        return redirecionar('/login?acesso=guia');
      }

      if (rotaFornecedor) {
        return redirecionar(
          '/login?acesso=fornecedor'
        );
      }

      if (rotaEmpresa) {
        return redirecionar(
          '/login?acesso=operadora'
        );
      }

      const solicitado =
        request.nextUrl.searchParams.get('acesso');

      if (
        solicitado === 'operadora' ||
        solicitado === 'guia' ||
        solicitado === 'fornecedor'
      ) {
        return redirecionar(
          `/login?acesso=${solicitado}`
        );
      }

      return redirecionar('/login');
    }

    // Qualquer conta autenticada pode consultar seus
    // acessos ou definir senha, mesmo sem empresa.
    if (rotaAcesso || rotaNovaSenha) {
      return response;
    }

    if (rotaEmpresa) {
      const { data: perfil, error } = await supabase
        .from('perfis')
        .select('empresa_id,role')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        return indisponivel();
      }

      const papelPermitido =
        PAPEIS_EMPRESA.some(
          (papel) => papel === perfil?.role
        );

      if (!perfil?.empresa_id || !papelPermitido) {
        return redirecionar(
          '/acesso?acesso=operadora'
        );
      }

      // A entrada na área empresarial não concede
      // permissão para todas as operações.
      // Cada módulo e o RLS aplicam suas restrições.
      return response;
    }

    if (rotaGuia || rotaFornecedor) {
      const tipo = rotaGuia
        ? 'guia'
        : 'fornecedor';

      const { data: adesao, error } = await supabase
        .from('acessos_profissionais')
        .select('tipo')
        .eq('usuario_id', user.id)
        .eq('tipo', tipo)
        .maybeSingle();

      if (error) {
        return indisponivel();
      }

      if (!adesao) {
        return redirecionar(
          `/acesso?acesso=${tipo}`
        );
      }

      return response;
    }

    return response;
  } catch {
    return indisponivel();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
import { createServerClient } from '@supabase/ssr';
import {
  NextResponse,
  type NextRequest,
} from 'next/server';

export async function proxy(
  request: NextRequest
) {
  const pathname =
    request.nextUrl.pathname;

  /*
    ============================================================
    WEBHOOK ASAAS

    Esta rota possui autenticação própria através do cabeçalho
    asaas-access-token.

    Ela não depende da sessão Supabase do usuário e não deve
    passar pelo fluxo de autenticação das páginas privadas.
    ============================================================
  */

  if (
    pathname ===
    '/api/webhooks/asaas'
  ) {
    return NextResponse.next();
  }

  let response =
    NextResponse.next({
      request,
    });

  const supabase =
    createServerClient(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(
            cookiesToSet
          ) {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                request.cookies.set(
                  name,
                  value
                );

                response.cookies.set(
                  name,
                  value,
                  options
                );
              }
            );
          },
        },
      }
    );

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  const rotasPrivadas = [
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
  ];

  const rotaPrivada =
    rotasPrivadas.some(
      (rota) =>
        pathname === rota ||
        pathname.startsWith(
          `${rota}/`
        )
    );

  /*
    ============================================================
    ROTAS PRIVADAS
    ============================================================
  */

  if (
    rotaPrivada &&
    !user
  ) {
    return NextResponse.redirect(
      new URL(
        '/login',
        request.url
      )
    );
  }

  /*
    ============================================================
    LOGIN

    Usuário autenticado continua sendo enviado ao dashboard.
    ============================================================
  */

  if (
    pathname ===
      '/login' &&
    user
  ) {
    return NextResponse.redirect(
      new URL(
        '/dashboard',
        request.url
      )
    );
  }

  /*
    ============================================================
    HOME E DEMAIS ROTAS PÚBLICAS
    ============================================================
  */

  return response;
}

export const config = {
  matcher: [
    /*
      O webhook do Asaas é excluído do Proxy.

      Todo o restante continua com o comportamento
      atual do projeto.
    */
    '/((?!api/webhooks/asaas|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
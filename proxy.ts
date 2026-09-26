import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

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
  ];

  const rotaPrivada = rotasPrivadas.some(
    (rota) =>
      pathname === rota || pathname.startsWith(`${rota}/`)
  );

  // ============================================================
  // ROTAS PRIVADAS
  // ============================================================

  if (rotaPrivada && !user) {
    return NextResponse.redirect(
      new URL('/login', request.url)
    );
  }

  // ============================================================
  // LOGIN
  // Usuário autenticado continua sendo enviado ao dashboard
  // ============================================================

  if (pathname === '/login' && user) {
    return NextResponse.redirect(
      new URL('/dashboard', request.url)
    );
  }

  // ============================================================
  // HOME PÚBLICA
  // "/" permanece pública para qualquer visitante,
  // autenticado ou não.
  // ============================================================

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
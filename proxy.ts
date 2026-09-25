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

  // Impede acesso às páginas privadas sem autenticação
  if (rotaPrivada && !user) {
    return NextResponse.redirect(
      new URL('/login', request.url)
    );
  }

  // Usuário autenticado não precisa retornar ao login
  if (pathname === '/login' && user) {
    return NextResponse.redirect(
      new URL('/dashboard', request.url)
    );
  }

  // Redireciona a página inicial para o login
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL('/login', request.url)
    );
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
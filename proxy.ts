import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  
  // Para fins de desenvolvimento e auditoria visual:
  // Sempre que acessar a raiz (/), direciona obrigatoriamente para a tela de login.
  if (url.pathname === '/') {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
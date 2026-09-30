import { createServerClient } from '@supabase/ssr';
import {
  NextResponse,
  type NextRequest,
} from 'next/server';

export const dynamic = 'force-dynamic';

const DESTINOS_PERMITIDOS = new Set([
  '/acesso',
  '/acesso?acesso=operadora',
  '/acesso?acesso=guia',
  '/acesso?acesso=fornecedor',
  '/auth/nova-senha',
]);

function destinoSeguro(valor: string | null): string {
  if (valor && DESTINOS_PERMITIDOS.has(valor)) {
    return valor;
  }

  return '/acesso';
}

function impedirCache(response: NextResponse) {
  response.headers.set(
    'Cache-Control',
    'private, no-store, max-age=0'
  );
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('Referrer-Policy', 'no-referrer');
}

function respostaFalha(
  anterior?: NextResponse,
  status = 400
) {
  // Conteúdo fixo: nenhum parâmetro da URL é inserido no HTML.
  const response = new NextResponse(
    `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Verificação de acesso • Encantos Rio Negro</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: #07110e;
      color: #edede3;
      font-family: system-ui, sans-serif;
    }
    main {
      width: 100%;
      max-width: 460px;
      padding: 28px;
      border: 1px solid #ffffff18;
      border-radius: 24px;
      background: #0d1b16;
    }
    h1 { font-size: 24px; line-height: 1.3; }
    p { color: #bec6be; line-height: 1.7; }
    a {
      display: inline-block;
      margin-top: 16px;
      padding: 14px 20px;
      border-radius: 12px;
      background: #e3a144;
      color: #07130f;
      font-weight: 700;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <main>
    <h1>Não foi possível validar este link</h1>
    <p>
      Ele pode ter expirado, já ter sido utilizado ou não ter
      sido recebido por completo. Uma falha de conexão também
      pode impedir a validação.
    </p>
    <p>
      Tente entrar na sua conta. Para recuperar a senha,
      solicite um novo link na tela de login. Para um convite,
      peça orientação ao administrador da operadora.
    </p>
    <a href="/login">Voltar ao login</a>
  </main>
</body>
</html>`,
    {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy':
          "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
      },
    }
  );

  if (anterior) {
    for (const cookie of anterior.cookies.getAll()) {
      response.cookies.set(cookie);
    }
  }

  impedirCache(response);

  return response;
}

export async function GET(request: NextRequest) {
  const parametros = request.nextUrl.searchParams;

  const code = parametros.get('code');
  const tokenHash = parametros.get('token_hash');
  const tipo = parametros.get('type');

  if (
    parametros.has('error') ||
    parametros.has('error_code')
  ) {
    return respostaFalha();
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return respostaFalha(undefined, 503);
  }

  let destino = destinoSeguro(parametros.get('next'));

  // Convites e recuperação seguem para definição de senha.
  // A validação do token continua obrigatória abaixo.
  if (tipo === 'invite' || tipo === 'recovery') {
    destino = '/auth/nova-senha';
  }

  const response = NextResponse.redirect(
    new URL(destino, request.url),
    303
  );

  impedirCache(response);

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  try {
    // Fluxo PKCE: retorno após autenticação pelo Supabase.
    if (code && !tokenHash) {
      const { data, error } =
        await supabase.auth.exchangeCodeForSession(code);

      if (error || !data.session || !data.user) {
        return respostaFalha(response);
      }

      return response;
    }

    // Fluxo de e-mail com token_hash.
    // Os modelos de e-mail serão configurados para esta rota.
    const tipoPermitido =
      tipo === 'email' ||
      tipo === 'signup' ||
      tipo === 'invite' ||
      tipo === 'recovery';

    if (tokenHash && !code && tipoPermitido) {
      const { data, error } =
        await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: tipo,
        });

      if (error || !data.session || !data.user) {
        return respostaFalha(response);
      }

      return response;
    }

    return respostaFalha(response);
  } catch {
    return respostaFalha(response, 503);
  }
}
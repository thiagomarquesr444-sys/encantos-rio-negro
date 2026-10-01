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

  // O webhook mantém sua autenticação no próprio endpoint.
  if (pertenceARota(pathname, '/api/webhooks/asaas')) {
    return NextResponse.next();
  }

  // O callback valida o código ou token e cria a sessão.
  if (pertenceARota(pathname, '/auth/callback')) {
    return NextResponse.next();
  }

  const rotaEmpresa = ROTAS_EMPRESA.some((rota) =>
    pertenceARota(pathname, rota),
  );

  // /guias pertence à operadora.
  // /guia pertence ao guia independente da Rede ERN.
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
  // As APIs devem validar suas próprias permissões.
  if (!exigeVerificacao) {
    return NextResponse.next();
  }

  // Nas páginas dos painéis, a modalidade vem da rota.
  // Um parâmetro na URL não pode mudar essa exigência.
  const acessoSolicitado: TipoAcesso | null =
    rotaEmpresa
      ? 'operadora'
      : rotaGuia
        ? 'guia'
        : rotaFornecedor
          ? 'fornecedor'
          : interpretarAcesso(
              request.nextUrl.searchParams.get('acesso'),
            );

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

  function orientarAcesso(): NextResponse {
    return redirecionar(
      acessoSolicitado
        ? `/acesso?acesso=${acessoSolicitado}`
        : '/acesso',
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

            // Atualiza a sessão utilizada pelo servidor.
            for (const { name, value } of cookiesToSet) {
              request.cookies.set(name, value);
            }

            response = NextResponse.next({ request });

            for (const cookie of cookiesAnteriores) {
              response.cookies.set(cookie);
            }

            // Atualiza a sessão enviada ao navegador.
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
      // A página explica quando o link ou a sessão
      // não permitem definir uma nova senha.
      if (rotaNovaSenha) {
        return response;
      }

      return redirecionar(
        acessoSolicitado
          ? `/login?acesso=${acessoSolicitado}`
          : '/login',
      );
    }

    // Definir senha não exige modalidade profissional.
    if (rotaNovaSenha) {
      return response;
    }

    // A página /acesso precisa aparecer também para contas
    // incompatíveis, sem redirecionamento automático.
    // Ela consulta os vínculos e apresenta a orientação.
    // Liberar essa página não libera nenhum painel.
    if (rotaAcesso) {
      return response;
    }

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
      // Usuário empresarial só pode entrar nas rotas
      // da operadora e com papel empresarial permitido.
      if (rotaEmpresa && papelEmpresaPermitido) {
        return response;
      }

      // Mantém a intenção original: guia, fornecedor
      // ou operadora com acesso ainda não habilitado.
      return orientarAcesso();
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

    // Cada conta independente possui uma modalidade.
    // Inconsistências não liberam nenhum painel.
    if ((adesoes?.length ?? 0) > 1) {
      return orientarAcesso();
    }

    const modalidade = adesoes?.[0]?.tipo;

    if (
      modalidade !== undefined &&
      modalidade !== 'guia' &&
      modalidade !== 'fornecedor'
    ) {
      return orientarAcesso();
    }

    if (rotaGuia && modalidade === 'guia') {
      return response;
    }

    if (
      rotaFornecedor &&
      modalidade === 'fornecedor'
    ) {
      return response;
    }

    // Inclui:
    // - guia tentando entrar na operadora ou fornecedor;
    // - fornecedor tentando entrar na operadora ou guia;
    // - conta ainda sem vínculo.
    //
    // Não troca o painel automaticamente.
    // A URL indica a intenção, nunca concede permissão.
    return orientarAcesso();
  } catch {
    return indisponivel();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
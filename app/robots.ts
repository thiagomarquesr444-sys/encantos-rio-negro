import type { MetadataRoute } from 'next';

const SITE = 'https://encantos-rio-negro.vercel.app';

// Áreas internas (gestão, login, API) ficam fora do Google.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/', '/login', '/acesso', '/auth/', '/dashboard', '/financeiro',
        '/clientes', '/reservas', '/hospedagens', '/passeios', '/configuracoes',
        '/embarcacoes', '/guias', '/parceiros', '/relatorios', '/vouchers',
        '/documentos', '/fiscal', '/planos', '/demandas', '/comando',
        '/guia', '/fornecedor',
      ],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}

import type { MetadataRoute } from 'next';

const SITE = 'https://os-rio-negro.vercel.app';

const PAGINAS: { rota: string; prioridade: number }[] = [
  { rota: '', prioridade: 1 },
  { rota: '/destinos', prioridade: 0.9 },
  { rota: '/experiencias', prioridade: 0.9 },
  { rota: '/rede', prioridade: 0.8 },
  { rota: '/operadores', prioridade: 0.7 },
  { rota: '/precos', prioridade: 0.6 },
  { rota: '/contato', prioridade: 0.5 },
  { rota: '/termos', prioridade: 0.2 },
  { rota: '/privacidade', prioridade: 0.2 },
  { rota: '/reembolso', prioridade: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();
  return PAGINAS.map(({ rota, prioridade }) => ({
    url: `${SITE}${rota}`,
    lastModified: agora,
    changeFrequency: 'weekly',
    priority: prioridade,
  }));
}

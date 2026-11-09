'use client';

// EDA_EXPERIENCIA_LINK_V1: link direto de um passeio (/experiencias/<slug>).
// Usado pelos botões da Iara ("Ver <passeio>"). Abre a página Experiências
// já com o detalhe do passeio aberto na vitrine. Se o passeio não existir
// mais, mostra a página normal (nunca 404).
import { useParams } from 'next/navigation';
import ExperienciasPremiumERN from '@/app/components/ExperienciasPremiumERN';

export default function ExperienciaPasseioPage() {
  const { slug } = useParams<{ slug: string }>();
  const seguro = typeof slug === 'string' && /^[a-z0-9-]{1,120}$/.test(slug) ? slug : undefined;
  return <ExperienciasPremiumERN abrirPasseio={seguro} />;
}

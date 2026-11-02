import type { Metadata } from 'next';
import ExperienciasPremiumERN from '@/app/components/ExperienciasPremiumERN';

export const metadata: Metadata = {
  title: 'Experiências na Amazônia: pesca esportiva, rios, cultura e história | Encantos da Amazônia',
  description:
    'Pesca esportiva, navegação, natureza, festivais, sabores e a história dos municípios do Rio Negro. Planeje com o Concierge e fale com operadores da Rede EDA.',
};

export default function ExperienciasPage() {
  return <ExperienciasPremiumERN />;
}

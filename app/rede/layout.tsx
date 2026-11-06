import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Rede EDA: histórias e vivências da Amazônia',
  description:
    'Publicações de operadores, guias e comunidades do Amazonas: cultura, natureza, pesca esportiva e o dia a dia nos rios.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}

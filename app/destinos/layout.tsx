import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Destinos do Amazonas',
  description:
    'Conheça os destinos do Amazonas, do Rio Negro a Parintins: cidades, rios, cachoeiras, cultura e pesca esportiva.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}

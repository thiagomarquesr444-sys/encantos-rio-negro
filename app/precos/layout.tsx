import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Planos e preços',
  description:
    'Compare os planos da Encantos da Amazônia para operadoras de turismo: comece grátis e cresça com mais clientes, passeios e recursos.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}

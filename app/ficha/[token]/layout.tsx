import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Link pessoal com dados de saúde: nunca indexar nem vazar a URL por referência.
export const metadata: Metadata = {
  title: 'Ficha de saúde e segurança · Encantos da Amazônia',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Link pessoal de avaliação: não indexar nem vazar a URL por referência.
export const metadata: Metadata = {
  title: 'Avalie sua experiência · Encantos da Amazônia',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}

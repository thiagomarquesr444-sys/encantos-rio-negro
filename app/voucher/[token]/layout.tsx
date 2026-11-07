import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Link de verificação: nunca indexar nem vazar a URL por referência.
export const metadata: Metadata = {
  title: 'Verificação de voucher · Encantos da Amazônia',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}

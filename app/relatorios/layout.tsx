import type { ReactNode } from 'react';

import PlanoGate from '@/app/components/PlanoGate';

export default function RelatoriosLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PlanoGate recurso="relatorios">
      {children}
    </PlanoGate>
  );
}
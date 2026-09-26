import type { ReactNode } from 'react';

import PlanoGate from '@/app/components/PlanoGate';

type FinanceiroLayoutProps = {
  children: ReactNode;
};

export default function FinanceiroLayout({
  children,
}: FinanceiroLayoutProps) {
  return (
    <PlanoGate recurso="financeiro">
      {children}
    </PlanoGate>
  );
}
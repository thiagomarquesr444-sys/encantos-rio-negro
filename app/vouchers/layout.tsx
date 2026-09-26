import type { ReactNode } from 'react';

import PlanoGate from '@/app/components/PlanoGate';

type VouchersLayoutProps = {
  children: ReactNode;
};

export default function VouchersLayout({
  children,
}: VouchersLayoutProps) {
  return (
    <PlanoGate recurso="vouchers">
      {children}
    </PlanoGate>
  );
}
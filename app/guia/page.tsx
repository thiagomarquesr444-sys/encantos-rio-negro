import type { Metadata } from 'next';

import PainelProfissional from '@/app/components/PainelProfissional';

export const metadata: Metadata = {
  title: 'Painel do Guia',
  robots: {
    index: false,
    follow: false,
  },
};

export default function GuiaPage() {
  return (
    <PainelProfissional tipo="guia" />
  );
}
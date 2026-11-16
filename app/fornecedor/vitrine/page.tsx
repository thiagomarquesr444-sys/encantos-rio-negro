import type { Metadata } from 'next';

import VitrinePaginaFornecedorEDA from '@/app/components/VitrinePaginaFornecedorEDA';

export const metadata: Metadata = {
  title: 'Minha vitrine',
  robots: {
    index: false,
    follow: false,
  },
};

export default function FornecedorVitrinePage() {
  return <VitrinePaginaFornecedorEDA />;
}

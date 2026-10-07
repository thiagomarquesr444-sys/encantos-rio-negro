import type { Metadata } from 'next';

import PainelProfissional from '@/app/components/PainelProfissional';

export const metadata: Metadata = {
  title: 'Painel do Fornecedor',
  robots: {
    index: false,
    follow: false,
  },
};

export default function FornecedorPage() {
  return (
    <PainelProfissional tipo="fornecedor" />
  );
}
import type { Metadata } from 'next';

import InicioFornecedorEDA from '@/app/components/InicioFornecedorEDA';

export const metadata: Metadata = {
  title: 'Espaço do fornecedor',
  robots: {
    index: false,
    follow: false,
  },
};

export default function FornecedorPage() {
  return <InicioFornecedorEDA />;
}

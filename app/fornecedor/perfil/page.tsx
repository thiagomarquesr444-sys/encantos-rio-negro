import type { Metadata } from 'next';

import PerfilProfissional from '@/app/components/PerfilProfissional';

export const metadata: Metadata = {
  title: 'Meu perfil de fornecedor',
  robots: {
    index: false,
    follow: false,
  },
};

export default function FornecedorPerfilPage() {
  return (
    <PerfilProfissional tipo="fornecedor" />
  );
}
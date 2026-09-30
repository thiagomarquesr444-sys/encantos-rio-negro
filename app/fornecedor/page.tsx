import type { Metadata } from 'next';
import PerfilProfissional from '@/app/components/PerfilProfissional';

export const metadata: Metadata = {
  title: 'Meu cadastro de fornecedor',
  robots: {
    index: false,
    follow: false,
  },
};

export default function FornecedorPage() {
  return <PerfilProfissional tipo="fornecedor" />;
}
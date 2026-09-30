import type { Metadata } from 'next';
import PerfilProfissional from '@/app/components/PerfilProfissional';

export const metadata: Metadata = {
  title: 'Meu cadastro de guia',
  robots: {
    index: false,
    follow: false,
  },
};

export default function GuiaPage() {
  return <PerfilProfissional tipo="guia" />;
}
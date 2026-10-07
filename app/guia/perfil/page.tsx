import type { Metadata } from 'next';

import PerfilProfissional from '@/app/components/PerfilProfissional';

export const metadata: Metadata = {
  title: 'Meu perfil de guia',
  robots: {
    index: false,
    follow: false,
  },
};

export default function GuiaPerfilPage() {
  return (
    <PerfilProfissional tipo="guia" />
  );
}
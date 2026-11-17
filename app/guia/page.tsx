import type { Metadata } from 'next';

import InicioGuiaEDA from '@/app/components/InicioGuiaEDA';

export const metadata: Metadata = {
  title: 'Espaço do guia e do prático',
  robots: {
    index: false,
    follow: false,
  },
};

export default function GuiaPage() {
  return <InicioGuiaEDA />;
}

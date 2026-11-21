import type { Metadata } from 'next';

import MinhasPublicacoesGuiaEDA from '@/app/components/MinhasPublicacoesGuiaEDA';

export const metadata: Metadata = {
  title: 'Publicar na Rede EDA',
  robots: { index: false, follow: false },
};

export default function GuiaPublicacoesPage() {
  return <MinhasPublicacoesGuiaEDA />;
}

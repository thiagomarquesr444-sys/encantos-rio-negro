import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { metadadosPublicacaoRede } from '@/lib/metadadosRedeEDA';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return metadadosPublicacaoRede(decodeURIComponent(slug));
}

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}

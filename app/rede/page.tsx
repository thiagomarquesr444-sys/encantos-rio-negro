'use client';

import PublicHeader from '@/app/components/PublicHeader';
import FeedRedeVisitanteERN from '@/app/components/FeedRedeVisitanteERN';

export default function RedePage() {
  return <div style={{ minHeight: '100vh', background: 'var(--ern-fundo, #fff7db)', color: 'var(--ern-texto, #30260d)' }}>
    <PublicHeader />
    <main><FeedRedeVisitanteERN /></main>
  </div>;
}

'use client';

import PublicHeader from '@/app/components/PublicHeader';
import ExploradorDestinosERN from '@/app/components/ExploradorDestinosERN';

export default function DestinosPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ern-fundo, #fff7db)', color: 'var(--ern-texto, #30260d)' }}>
      <PublicHeader />
      <main><ExploradorDestinosERN /></main>
    </div>
  );
}

'use client';

import PublicHeader from '@/app/components/PublicHeader';
import FeedRedeVisitanteERN from '@/app/components/FeedRedeVisitanteERN';
import TemaPortalERN from '@/app/components/TemaPortalERN';

export default function RedePage() {
  return (
    <TemaPortalERN>
      <PublicHeader />
      <main><FeedRedeVisitanteERN /></main>
    </TemaPortalERN>
  );
}
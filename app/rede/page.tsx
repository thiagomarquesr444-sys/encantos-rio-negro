'use client';

import PublicHeader from '@/app/components/PublicHeader';
import FeedRedeVisitanteERN from '@/app/components/FeedRedeVisitanteERN';
import RodapePublicoEDA from '@/app/components/RodapePublicoEDA';

// ERN_REDE_PREMIUM_V1: tema fixo verde-noite (sem alternância de modo).
export default function RedePage() {
  return (
    <div className="min-h-dvh bg-[#07110E] text-[#EDEDE3]">
      <PublicHeader />
      <main><FeedRedeVisitanteERN /></main>
      <RodapePublicoEDA />
    </div>
  );
}

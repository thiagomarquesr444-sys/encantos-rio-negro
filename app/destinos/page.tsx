'use client';

import PublicHeader from '@/app/components/PublicHeader';
import ExploradorDestinosERN from '@/app/components/ExploradorDestinosERN';
import RodapePublicoEDA from '@/app/components/RodapePublicoEDA';

// ERN_DESTINOS_PREMIUM_V1: tema fixo verde-noite (sem alternância de modo).
export default function DestinosPage() {
  return (
    <div className="min-h-dvh bg-[#07110E] text-[#EDEDE3]">
      <PublicHeader />
      <main><ExploradorDestinosERN /></main>
      <RodapePublicoEDA />
    </div>
  );
}

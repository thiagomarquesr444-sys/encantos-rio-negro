'use client';

import PublicHeader from '@/app/components/PublicHeader';
import ExploradorDestinosERN from '@/app/components/ExploradorDestinosERN';
import TemaPortalERN from '@/app/components/TemaPortalERN';

export default function DestinosPage() {
  return (
    <TemaPortalERN>
      <PublicHeader />
      <main><ExploradorDestinosERN /></main>
    </TemaPortalERN>
  );
}
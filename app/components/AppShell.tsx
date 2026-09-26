'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  /*
    ============================================================
    FACE PÚBLICA / COMERCIAL
    ============================================================
  */

  const rotasPublicas = [
    '/',
    '/operadores',
    '/descubra',
    '/experiencias',
    '/destinos',
    '/rede',
    '/login',
  ];

  const rotaPublica = rotasPublicas.some((rota) => {
    if (rota === '/') {
      return pathname === '/';
    }

    return (
      pathname === rota ||
      pathname.startsWith(`${rota}/`)
    );
  });

  if (rotaPublica) {
    return (
      <main className="min-h-screen w-full bg-[#0B1512]">
        {children}
      </main>
    );
  }

  /*
    ============================================================
    ERN GESTÃO
    ============================================================

    A antiga Sidebar lateral foi substituída por uma
    navegação superior central.

    O conteúdo da área privada passa a utilizar toda
    a largura disponível.
  */

  return (
    <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      <Sidebar />

      <main className="min-h-screen w-full pt-[82px]">
        {children}
      </main>
    </div>
  );
}
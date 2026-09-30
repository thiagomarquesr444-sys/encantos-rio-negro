'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';

const ROTAS_GESTAO = [
  '/dashboard',
  '/financeiro',
  '/clientes',
  '/reservas',
  '/hospedagens',
  '/passeios',
  '/configuracoes',
  '/embarcacoes',
  '/guias',
  '/parceiros',
  '/relatorios',
  '/vouchers',
  '/planos',
  '/demandas',
] as const;

function pertenceARota(
  pathname: string,
  rota: string
): boolean {
  return (
    pathname === rota ||
    pathname.startsWith(`${rota}/`)
  );
}

export default function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  const rotaGestao =
    pathname !== null &&
    ROTAS_GESTAO.some((rota) =>
      pertenceARota(pathname, rota)
    );

  // Portal, autenticação e áreas com navegação própria.
  if (!rotaGestao) {
    return (
      <div className="min-h-screen w-full bg-[#0B1512]">
        {children}
      </div>
    );
  }

  // Navegação da gestão das operadoras.
  return (
    <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      <Sidebar />

      <div className="min-h-screen w-full pt-[82px]">
        {children}
      </div>
    </div>
  );
}
'use client';

import type { ReactNode } from 'react';

import { usePathname } from 'next/navigation';

import Sidebar from '@/app/components/Sidebar';
import SidebarProfissional from '@/app/components/SidebarProfissional';

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
  rota: string,
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
      pertenceARota(
        pathname,
        rota,
      ),
    );

  const rotaGuia =
    pathname !== null &&
    pertenceARota(
      pathname,
      '/guia',
    );

  const rotaFornecedor =
    pathname !== null &&
    pertenceARota(
      pathname,
      '/fornecedor',
    );

  if (rotaGestao) {
    return (
      <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
        <Sidebar />

        <div className="min-h-screen w-full pt-[82px]">
          {children}
        </div>
      </div>
    );
  }

  if (rotaGuia) {
    return (
      <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
        <SidebarProfissional tipo="guia" />

        <div className="min-h-screen w-full pt-[82px]">
          {children}
        </div>
      </div>
    );
  }

  if (rotaFornecedor) {
    return (
      <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
        <SidebarProfissional tipo="fornecedor" />

        <div className="min-h-screen w-full pt-[82px]">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0B1512]">
      {children}
    </div>
  );
}
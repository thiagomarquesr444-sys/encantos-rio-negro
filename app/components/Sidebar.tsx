'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppConfig } from '@/app/context/AppContext';

interface MenuItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { config } = useAppConfig();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Ícones vetoriais robustos e profissionais (SVG)
  const menuItems: MenuItem[] = [
    { 
      label: 'Painel', 
      href: '/dashboard', 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> 
    },
    { 
      label: 'Clientes', 
      href: '/clientes', 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> 
    },
    { 
      label: 'Passeios', 
      href: '/passeios', 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> 
    },
    { 
      label: 'Reservas', 
      href: '/reservas', 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> 
    },
    { 
      label: 'Vouchers', 
      href: '/vouchers', 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg> 
    },
    { 
      label: 'Embarcações', 
      href: '/embarcacoes', 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2zM6 10h12M6 14h12" /></svg> 
    },
    { 
      label: 'Hospedagens', 
      href: '/hospedagens', 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> 
    },
    { 
      label: 'Guias', 
      href: '/guias', 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg> 
    },
    { 
      label: 'Parceiros', 
      href: '/parceiros', 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> 
    },
    { 
      label: 'Financeiro', 
      href: '/financeiro', 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> 
    },
    { 
      label: 'Relatórios', 
      href: '/relatorios', 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> 
    },
    { 
      label: 'Configurações', 
      href: '/configuracoes', 
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> 
    },
  ];

  return (
    <>
      {/* Botão de Menu Hambúrguer Flutuante (Aparece APENAS no Celular) */}
      <div className="md:hidden fixed top-3 left-3 z-50">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2.5 rounded-xl bg-[#0a3a33] text-emerald-300 border border-emerald-700/50 shadow-lg flex items-center justify-center cursor-pointer"
          title="Abrir Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            {isMobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Fundo escurecido (Backdrop) com transição suave */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Principal com Slide-in / Slide-out no Mobile e Estabilidade Total no Desktop */}
      <aside className={`
        bg-[#0a3a33] border-r border-[#072a25] flex flex-col justify-between p-4 text-slate-100 select-none transition-all duration-300 z-50
        fixed md:relative inset-y-0 left-0
        ${isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'md:w-20' : 'md:w-64'}
        min-h-screen shadow-2xl md:shadow-none
      `}>
        <div>
          {/* Topo com Logo */}
          <div className="flex items-center justify-between mb-3 px-1 pt-10 md:pt-0">
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex-1 text-center">
                <div className="w-20 h-20 mx-auto rounded-full border-2 border-amber-300/60 bg-[#05221e] flex items-center justify-center shadow-2xl overflow-hidden mb-2 p-1">
                  <img
                    src="/logo.png"
                    alt="Logo do Sistema"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <h2 className="text-sm font-bold tracking-tight text-white drop-shadow-sm truncate">
                  {config.nome_sistema || 'Encantos Rio Negro'}
                </h2>
                <p className="text-[9px] font-medium text-emerald-200/90 mt-0.5 leading-tight">
                  Plataforma para Operadoras
                </p>
              </div>
            )}

            {isCollapsed && !isMobileOpen && (
              <div className="w-full hidden md:flex flex-col items-center">
                <div className="w-10 h-10 rounded-full border border-amber-300/60 bg-[#05221e] flex items-center justify-center shadow-xl overflow-hidden p-0.5 mb-2">
                  <img
                    src="/logo.png"
                    alt="Logo"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Botão de Alternância (Apenas no Computador) */}
          <div className="hidden md:flex justify-center mb-4 px-1">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2.5 rounded-xl bg-[#0e433b] hover:bg-[#12544a] text-emerald-300 transition-all border border-emerald-700/30 shadow-md cursor-pointer flex items-center justify-center"
              title={isCollapsed ? 'Expandir Menu' : 'Minimizar Menu'}
            >
              <svg 
                className={`w-4 h-4 transform transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Lista de Navegação */}
          <nav className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/');

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  title={isCollapsed && !isMobileOpen ? item.label : undefined}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isCollapsed && !isMobileOpen ? 'md:justify-center md:px-2' : ''
                  } ${
                    isActive
                      ? 'bg-[#12544a] text-white shadow-md border-l-4 border-emerald-400 font-bold'
                      : 'text-emerald-100/75 hover:text-white hover:bg-[#0e433b]'
                  }`}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {(!isCollapsed || isMobileOpen) && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Rodapé do Menu */}
        <div className="pt-3 border-t border-[#072a25] px-2">
          <div className={`flex items-center gap-3 ${isCollapsed && !isMobileOpen ? 'md:justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-slate-900 border border-emerald-400/40 flex items-center justify-center text-xs font-bold text-white shadow-inner flex-shrink-0">
              N
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">Barcelos • AM</p>
                <p className="text-[10px] text-emerald-300 font-medium">Operação Integrada</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
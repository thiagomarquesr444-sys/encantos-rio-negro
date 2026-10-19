'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { supabase } from '@/lib/supabase';
import Sidebar from '@/app/components/Sidebar';
import SidebarProfissional from '@/app/components/SidebarProfissional';

type Tema = 'verde' | 'azul' | 'amarelo' | 'branco';

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

function pertenceARota(pathname: string, rota: string): boolean {
  return pathname === rota || pathname.startsWith(`${rota}/`);
}

function normalizarTema(valor: unknown): Tema {
  return valor === 'azul' ||
    valor === 'amarelo' ||
    valor === 'branco'
    ? valor
    : 'verde';
}


function ApresentacaoPaginaERN({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const recipiente = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elemento = recipiente.current;

    // O perfil publico ja possui sua propria composicao animada.
    if (
      !elemento ||
      pathname?.startsWith('/rede/perfil/') ||
      typeof elemento.animate !== 'function'
    ) {
      return;
    }

    const preferencia = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    );

    if (preferencia.matches) return;

    const animacao = elemento.animate(
      [
        { opacity: 0.35 },
        { opacity: 1 },
      ],
      {
        duration: 360,
        easing: 'ease-out',
        iterations: 1,
      },
    );

    function reduzirMovimento() {
      if (preferencia.matches) animacao.cancel();
    }

    preferencia.addEventListener('change', reduzirMovimento);

    return () => {
      animacao.cancel();
      preferencia.removeEventListener('change', reduzirMovimento);
    };
  }, [pathname]);

  return (
    <div ref={recipiente} className="min-w-0">
      {children}
    </div>
  );
}

export default function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [tema, setTema] = useState<Tema>('verde');

  const rotaGestao =
    pathname !== null &&
    ROTAS_GESTAO.some((rota) => pertenceARota(pathname, rota));

  const rotaGuia =
    pathname !== null && pertenceARota(pathname, '/guia');

  const rotaFornecedor =
    pathname !== null && pertenceARota(pathname, '/fornecedor');

  useEffect(() => {
    if (!rotaGestao) return;

    let ativo = true;
    let versao = 0;
    let tarefaAutenticacao: ReturnType<typeof setTimeout> | undefined;

    async function carregarTema(redefinir = false) {
      const requisicao = ++versao;

      if (redefinir && ativo) {
        setTema('verde');
      }

      try {
        const { data: sessao, error: erroSessao } =
          await supabase.auth.getSession();

        if (!ativo || requisicao !== versao) return;

        if (erroSessao || !sessao.session) {
          setTema('verde');
          return;
        }

        const { data, error } =
          await supabase.rpc('get_meu_tema_ern');

        if (!ativo || requisicao !== versao) return;

        if (error) {
          console.error('Não foi possível carregar o tema da empresa.');
          return;
        }

        setTema(normalizarTema(data));
      } catch {
        if (ativo && requisicao === versao) {
          console.error('Não foi possível carregar o tema da empresa.');
        }
      }
    }

    function atualizarTema() {
      // Reconsulta o banco em vez de confiar nos dados do evento.
      void carregarTema();
    }

    function aoRetornarParaPagina() {
      if (document.visibilityState === 'visible') {
        void carregarTema();
      }
    }

    void carregarTema(true);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((evento) => {
      if (!ativo) return;

      if (evento === 'SIGNED_OUT') {
        versao += 1;
        setTema('verde');
        return;
      }

      if (evento === 'SIGNED_IN' || evento === 'USER_UPDATED') {
        versao += 1;
        setTema('verde');

        // Executa a consulta fora do callback de autenticação.
        if (tarefaAutenticacao !== undefined) {
          clearTimeout(tarefaAutenticacao);
        }

        tarefaAutenticacao = setTimeout(() => {
          if (ativo) void carregarTema();
        }, 0);
      }
    });

    window.addEventListener('ern:tema-salvo', atualizarTema);
    document.addEventListener(
      'visibilitychange',
      aoRetornarParaPagina,
    );

    return () => {
      ativo = false;
      versao += 1;

      if (tarefaAutenticacao !== undefined) {
        clearTimeout(tarefaAutenticacao);
      }

      subscription.unsubscribe();
      window.removeEventListener('ern:tema-salvo', atualizarTema);
      document.removeEventListener(
        'visibilitychange',
        aoRetornarParaPagina,
      );
    };
  }, [rotaGestao]);

  if (rotaGestao) {
    return (
      <div className="ern-gestao" data-ern-tema={tema}>
        <Sidebar />

        <div className="min-h-screen w-full min-w-0 pt-[82px]">
          <ApresentacaoPaginaERN>{children}</ApresentacaoPaginaERN>
        </div>
      </div>
    );
  }

  if (rotaGuia) {
    return (
      <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
        <SidebarProfissional tipo="guia" />

        <div className="min-h-screen w-full pt-[82px]">
          <ApresentacaoPaginaERN>{children}</ApresentacaoPaginaERN>
        </div>
      </div>
    );
  }

  if (rotaFornecedor) {
    return (
      <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
        <SidebarProfissional tipo="fornecedor" />

        <div className="min-h-screen w-full pt-[82px]">
          <ApresentacaoPaginaERN>{children}</ApresentacaoPaginaERN>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        pathname === '/' || ['/rede', '/experiencias', '/destinos'].some(rota => pathname === rota || pathname?.startsWith(rota + '/'))
          ? 'ern-publico min-h-screen w-full'
          : 'min-h-screen w-full bg-[#0B1512]'
      }
    >
      <ApresentacaoPaginaERN>{children}</ApresentacaoPaginaERN>
    </div>
  );
}
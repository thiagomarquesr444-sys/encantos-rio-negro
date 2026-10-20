'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  const [tema, setTema] = useState<Tema | null>(null);
  const [erroTema, setErroTema] = useState(false);

  const rotaGestao =
    pathname !== null &&
    ROTAS_GESTAO.some((rota) => pertenceARota(pathname, rota));

  const rotaGuia =
    pathname !== null && pertenceARota(pathname, '/guia');

  const rotaFornecedor =
    pathname !== null && pertenceARota(pathname, '/fornecedor');


  useLayoutEffect(() => {
    if (!rotaGestao) return;

    try {
      const salvo = localStorage.getItem('ern-tema-visual-v1');
      if (['verde', 'azul', 'amarelo', 'branco'].includes(salvo ?? '')) {
        setTema(normalizarTema(salvo));
      }
    } catch {
      // O tema continua sendo consultado no banco.
    }
  }, [rotaGestao]);

  useEffect(() => {
    if (!rotaGestao) return;

    let ativo = true;
    let versao = 0;
    let tarefa: ReturnType<typeof setTimeout> | undefined;

    async function carregarTema() {
      const requisicao = ++versao;

      try {
        const { data: sessao, error: erroSessao } =
          await supabase.auth.getSession();

        if (!ativo || requisicao !== versao) return;

        if (erroSessao || !sessao.session) {
          setTema(null);
          setErroTema(true);
          return;
        }

        const { data, error } = await supabase.rpc('get_meu_tema_ern');

        if (!ativo || requisicao !== versao) return;
        if (error) throw error;

        const escolhido = normalizarTema(data);
        setTema(escolhido);
        setErroTema(false);

        try {
          localStorage.setItem('ern-tema-visual-v1', escolhido);
          const cores = {
            verde: '#07110e',
            azul: '#081525',
            amarelo: '#fff7db',
            branco: '#f4f6f5',
          };
          document.documentElement.style.setProperty(
            '--ern-fundo-inicial',
            cores[escolhido],
          );
        } catch {
          // Falha no armazenamento local nao impede o uso.
        }
      } catch {
        if (ativo && requisicao === versao) setErroTema(true);
      }
    }

    function atualizarTema() {
      void carregarTema();
    }

    function aoRetornar() {
      if (!document.hidden) void carregarTema();
    }

    void carregarTema();

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange(evento => {
        if (!ativo) return;

        if (evento === 'SIGNED_OUT') {
          versao += 1;
          clearTimeout(tarefa);
          setTema(null);
          setErroTema(false);
          try {
            localStorage.removeItem('ern-tema-visual-v1');
          } catch {}
          return;
        }

        if (evento === 'SIGNED_IN' || evento === 'USER_UPDATED') {
          versao += 1;
          clearTimeout(tarefa);
          tarefa = setTimeout(() => {
            if (ativo) void carregarTema();
          }, 0);
        }
      });

    window.addEventListener('ern:tema-salvo', atualizarTema);
    document.addEventListener('visibilitychange', aoRetornar);

    return () => {
      ativo = false;
      versao += 1;
      clearTimeout(tarefa);
      subscription.unsubscribe();
      window.removeEventListener('ern:tema-salvo', atualizarTema);
      document.removeEventListener('visibilitychange', aoRetornar);
    };
  }, [rotaGestao]);

  if (rotaGestao && tema === null) {
    return (
      <main
        className="flex min-h-screen items-center justify-center px-6"
        style={{
          background: 'var(--ern-fundo-inicial, #fff7db)',
          color: 'var(--ern-texto-inicial, #30260d)',
        }}
      >
        {erroTema ? (
          <div role="alert" className="max-w-md text-center">
            <p>Não foi possível carregar sua preferência visual.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 min-h-12 rounded-xl border border-current px-5 font-semibold"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <p role="status" className="text-sm">Carregando seu painel…</p>
        )}
      </main>
    );
  }

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
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAppConfig } from '@/app/context/AppContext';
import { supabase } from '@/lib/supabase';
import LogoERN from '@/app/components/LogoERN';

type NavItem = {
  label: string;
  href: string;
  descricao?: string;
};

type NavGroup = {
  id: string;
  label: string;
  itens: NavItem[];
};

const PRINCIPAIS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    descricao: 'Visão geral da sua empresa',
  },
  {
    label: 'Demandas',
    href: '/demandas',
    descricao: 'Serviços que sua empresa precisa contratar',
  },
];

const GRUPOS: NavGroup[] = [
  {
    id: 'operacao',
    label: 'Operação',
    itens: [
      {
        label: 'Clientes',
        href: '/clientes',
        descricao: 'Cadastro e relacionamento com viajantes',
      },
      {
        label: 'Reservas',
        href: '/reservas',
        descricao: 'Solicitações, confirmações e operação',
      },
      {
        label: 'Passeios',
        href: '/passeios',
        descricao: 'Roteiros, experiências e catálogo',
      },
      {
        label: 'Vouchers',
        href: '/vouchers',
        descricao: 'Documentos vinculados às reservas',
      },
    ],
  },
  {
    id: 'estrutura',
    label: 'Estrutura',
    itens: [
      {
        label: 'Hospedagens',
        href: '/hospedagens',
        descricao: 'Hotéis, pousadas e unidades',
      },
      {
        label: 'Embarcações',
        href: '/embarcacoes',
        descricao: 'Barcos e capacidade operacional',
      },
      {
        label: 'Guias',
        href: '/guias',
        descricao: 'Profissionais e disponibilidade',
      },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    itens: [
      {
        label: 'Visão geral',
        href: '/financeiro',
        descricao: 'Saldo, recebimentos e pagamentos',
      },
      {
        label: 'Nova receita',
        href: '/financeiro/receita/novo',
        descricao: 'Registrar uma entrada financeira',
      },
      {
        label: 'Nova despesa',
        href: '/financeiro/despesa/novo',
        descricao: 'Registrar uma saída financeira',
      },
      {
        label: 'Exportar relatório',
        href: '/financeiro/exportar',
        descricao: 'Gerar relatório financeiro em CSV',
      },
    ],
  },
  {
    id: 'relacionamento',
    label: 'Relacionamento',
    itens: [
      {
        label: 'Parceiros',
        href: '/parceiros',
        descricao: 'Rede operacional e fornecedores',
      },
      {
        label: 'Relatórios',
        href: '/relatorios',
        descricao: 'Informações consolidadas',
      },
    ],
  },
];

const CONTA: NavItem[] = [
  { label: 'Configurações', href: '/configuracoes' },
  { label: 'Planos', href: '/planos' },
  { label: 'Ver portal público', href: '/' },
];

const FOCO =
  'focus-visible:outline focus-visible:outline-2 ' +
  'focus-visible:outline-offset-2 focus-visible:outline-[#E3A144]';

const BOTAO_TOPO =
  'inline-flex min-h-11 items-center justify-center gap-2 ' +
  'rounded-xl px-3 text-[13px] font-semibold transition-colors ' +
  'motion-reduce:transition-none ' +
  FOCO;

function rotaAtiva(pathname: string, href: string): boolean {
  if (
    href === '/' ||
    href === '/dashboard' ||
    href === '/financeiro'
  ) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function Seta({ aberta }: { aberta: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ${
        aberta ? 'rotate-180' : ''
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m6 9 6 6 6-6"
      />
    </svg>
  );
}

type LinkNavegacaoProps = {
  item: NavItem;
  pathname: string;
  aoNavegar: () => void;
};

function LinkNavegacao({
  item,
  pathname,
  aoNavegar,
}: LinkNavegacaoProps) {
  const ativo = rotaAtiva(pathname, item.href);

  return (
    <Link
      href={item.href}
      onClick={aoNavegar}
      aria-current={ativo ? 'page' : undefined}
      className={`block min-h-12 rounded-xl px-4 py-3 transition-colors motion-reduce:transition-none ${FOCO} ${
        ativo
          ? 'bg-[#E3A144]/10 text-[#F4C77E]'
          : 'text-[#EDEDE3] hover:bg-white/5'
      }`}
    >
      <span className="block text-sm font-semibold">{item.label}</span>

      {item.descricao && (
        <span className="mt-1 block text-xs leading-5 text-[#A8BCAF]">
          {item.descricao}
        </span>
      )}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { config } = useAppConfig();

  const [mobileAberto, setMobileAberto] = useState(false);
  const [dropdown, setDropdown] = useState<string | null>(null);
  const [saindo, setSaindo] = useState(false);
  const [erroSaida, setErroSaida] = useState<string | null>(null);

  const headerRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const acionadorDropdownRef = useRef<HTMLButtonElement | null>(null);
  const saidaEmAndamento = useRef(false);

  const nomeSistema = config.nome_sistema || 'Encantos Rio Negro';

  function fecharMenus(): void {
    setDropdown(null);
    setMobileAberto(false);
  }

  useEffect(() => {
    setDropdown(null);
    setMobileAberto(false);
  }, [pathname]);

  useEffect(() => {
    function aoPressionar(evento: KeyboardEvent): void {
      if (evento.key !== 'Escape') return;

      setDropdown(null);
      acionadorDropdownRef.current?.focus();
    }

    function aoTocarFora(evento: PointerEvent): void {
      if (
        evento.target instanceof Node &&
        !headerRef.current?.contains(evento.target)
      ) {
        setDropdown(null);
      }
    }

    document.addEventListener('keydown', aoPressionar);
    document.addEventListener('pointerdown', aoTocarFora);

    return () => {
      document.removeEventListener('keydown', aoPressionar);
      document.removeEventListener('pointerdown', aoTocarFora);
    };
  }, []);

  useEffect(() => {
    // Mesmo breakpoint usado pela navegação desktop.
    const media = window.matchMedia('(min-width: 1280px)');

    function ajustarMenus(): void {
      setDropdown(null);

      if (media.matches) {
        setMobileAberto(false);
      }
    }

    media.addEventListener('change', ajustarMenus);

    return () => {
      media.removeEventListener('change', ajustarMenus);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (!mobileAberto) {
      if (dialog.open) dialog.close();
      return;
    }

    const overflowAnterior = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      document.body.style.overflow = overflowAnterior;

      if (dialog.open) {
        dialog.close();
      }
    };
  }, [mobileAberto]);

  function alternarDropdown(
    id: string,
    acionador: HTMLButtonElement,
  ): void {
    acionadorDropdownRef.current = acionador;
    setDropdown((atual) => (atual === id ? null : id));
  }

  async function sair(): Promise<void> {
    if (saidaEmAndamento.current) return;

    saidaEmAndamento.current = true;
    setSaindo(true);
    setErroSaida(null);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      window.location.assign('/login');
    } catch {
      setErroSaida(
        'Não foi possível sair da conta. Verifique sua conexão e tente novamente.',
      );
    } finally {
      saidaEmAndamento.current = false;
      setSaindo(false);
    }
  }

  function grupoAtivo(grupo: NavGroup): boolean {
    if (
      grupo.id === 'financeiro' &&
      (pathname === '/financeiro' ||
        pathname.startsWith('/financeiro/'))
    ) {
      return true;
    }

    return grupo.itens.some((item) => rotaAtiva(pathname, item.href));
  }

  function botaoSair() {
    return (
      <button
        type="button"
        disabled={saindo}
        onClick={() => void sair()}
        className={`mt-2 min-h-12 w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-400/10 disabled:cursor-wait disabled:opacity-50 motion-reduce:transition-none ${FOCO}`}
      >
        {saindo ? 'Saindo...' : 'Sair da conta'}
      </button>
    );
  }

  return (
    <>
      <header
        ref={headerRef}
        className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#07110E]/95 text-[#EDEDE3] backdrop-blur-xl"
        onBlur={(evento) => {
          const destino = evento.relatedTarget;

          if (
            !(destino instanceof Node) ||
            !evento.currentTarget.contains(destino)
          ) {
            setDropdown(null);
          }
        }}
      >
        <div className="mx-auto flex h-[82px] max-w-[1600px] items-center justify-between gap-3 px-4 md:px-6">
          <Link
            href="/dashboard"
            onClick={fecharMenus}
            className={`flex min-w-0 items-center gap-3 rounded-xl xl:max-w-[240px] ${FOCO}`}
          >
            <LogoERN prioridade />

            <span className="min-w-0">
              <span
                className="block truncate text-sm font-semibold text-[#F0F0E8] sm:text-base"
                style={{
                  fontFamily: 'var(--font-fraunces), serif',
                }}
              >
                {nomeSistema}
              </span>

              <span className="mt-1 block text-[10px] uppercase tracking-widest text-[#B4C8BB]">
                Gestão integrada
              </span>
            </span>
          </Link>

          <nav
            aria-label="Navegação principal"
            className="hidden shrink-0 items-center gap-1 xl:flex"
          >
            {PRINCIPAIS.map((item) => {
              const ativo = rotaAtiva(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={fecharMenus}
                  aria-current={ativo ? 'page' : undefined}
                  className={`${BOTAO_TOPO} ${
                    ativo
                      ? 'bg-[#E3A144]/10 text-[#F4C77E]'
                      : 'text-[#B4C8BB] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {GRUPOS.map((grupo) => {
              const aberto = dropdown === grupo.id;
              const ativo = grupoAtivo(grupo);
              const painelId = `nav-desktop-${grupo.id}`;

              return (
                <div key={grupo.id} className="relative">
                  <button
                    type="button"
                    aria-expanded={aberto}
                    aria-controls={painelId}
                    onClick={(evento) =>
                      alternarDropdown(grupo.id, evento.currentTarget)
                    }
                    className={`${BOTAO_TOPO} ${
                      aberto || ativo
                        ? 'bg-white/5 text-[#F4C77E]'
                        : 'text-[#B4C8BB] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {grupo.label}
                    <Seta aberta={aberto} />
                  </button>

                  <div
                    id={painelId}
                    hidden={!aberto}
                    className="absolute right-0 top-[calc(100%+12px)] w-72 rounded-2xl border border-white/10 bg-[#0A1713] p-2 shadow-2xl"
                  >
                    {grupo.itens.map((item) => (
                      <LinkNavegacao
                        key={item.href}
                        item={item}
                        pathname={pathname}
                        aoNavegar={fecharMenus}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="hidden shrink-0 xl:block">
            <div className="relative">
              <button
                type="button"
                aria-expanded={dropdown === 'conta'}
                aria-controls="nav-conta"
                onClick={(evento) =>
                  alternarDropdown('conta', evento.currentTarget)
                }
                className={`${BOTAO_TOPO} border border-white/10 text-[#EDEDE3] hover:bg-white/5`}
              >
                Conta
                <Seta aberta={dropdown === 'conta'} />
              </button>

              <div
                id="nav-conta"
                hidden={dropdown !== 'conta'}
                className="absolute right-0 top-[calc(100%+12px)] w-72 rounded-2xl border border-white/10 bg-[#0A1713] p-2 shadow-2xl"
              >
                <p className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#E3A144]">
                  Minha conta
                </p>

                {CONTA.map((item) => (
                  <LinkNavegacao
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    aoNavegar={fecharMenus}
                  />
                ))}

                {botaoSair()}

                {erroSaida && (
                  <p
                    role="alert"
                    className="px-4 py-3 text-sm leading-6 text-rose-300"
                  >
                    {erroSaida}
                  </p>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            aria-label="Abrir menu de navegação"
            aria-expanded={mobileAberto}
            aria-controls="menu-mobile-ern"
            aria-haspopup="dialog"
            onClick={() => {
              setDropdown(null);
              acionadorDropdownRef.current = null;
              setMobileAberto(true);
            }}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-[#EDEDE3] xl:hidden ${FOCO}`}
          >
            <svg
              aria-hidden="true"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      <dialog
        ref={dialogRef}
        id="menu-mobile-ern"
        aria-labelledby="titulo-menu-mobile"
        className="menu-mobile"
        onCancel={(evento) => {
          evento.preventDefault();
          setMobileAberto(false);
        }}
        onClick={(evento) => {
          if (evento.target !== evento.currentTarget) return;

          const limites = evento.currentTarget.getBoundingClientRect();

          if (
            evento.clientX < limites.left ||
            evento.clientX > limites.right ||
            evento.clientY < limites.top ||
            evento.clientY > limites.bottom
          ) {
            setMobileAberto(false);
          }
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div>
              <h2
                id="titulo-menu-mobile"
                className="text-lg font-semibold text-[#F0F0E8]"
              >
                Navegação
              </h2>

              <p className="mt-1 text-xs text-[#B4C8BB]">
                Encantos Rio Negro
              </p>
            </div>

            <button
              type="button"
              aria-label="Fechar menu de navegação"
              onClick={() => setMobileAberto(false)}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 text-[#EDEDE3] hover:bg-white/5 ${FOCO}`}
            >
              <svg
                aria-hidden="true"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  d="m6 6 12 12M6 18 18 6"
                />
              </svg>
            </button>
          </div>

          <nav
            aria-label="Navegação mobile"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"
            style={{
              paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
            }}
          >
            <div className="space-y-1">
              {PRINCIPAIS.map((item) => (
                <LinkNavegacao
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  aoNavegar={fecharMenus}
                />
              ))}
            </div>

            {GRUPOS.map((grupo) => (
              <section
                key={grupo.id}
                aria-labelledby={`titulo-mobile-${grupo.id}`}
                className="mt-4 border-t border-white/10 pt-4"
              >
                <h3
                  id={`titulo-mobile-${grupo.id}`}
                  className="px-4 pb-2 text-xs font-semibold uppercase tracking-widest text-[#E3A144]"
                >
                  {grupo.label}
                </h3>

                <div className="space-y-1">
                  {grupo.itens.map((item) => (
                    <LinkNavegacao
                      key={item.href}
                      item={item}
                      pathname={pathname}
                      aoNavegar={fecharMenus}
                    />
                  ))}
                </div>
              </section>
            ))}

            <section
              aria-labelledby="titulo-mobile-conta"
              className="mt-4 border-t border-white/10 pt-4"
            >
              <h3
                id="titulo-mobile-conta"
                className="px-4 pb-2 text-xs font-semibold uppercase tracking-widest text-[#E3A144]"
              >
                Minha conta
              </h3>

              {CONTA.map((item) => (
                <LinkNavegacao
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  aoNavegar={fecharMenus}
                />
              ))}

              {botaoSair()}

              {erroSaida && (
                <p
                  role="alert"
                  className="px-4 py-3 text-sm leading-6 text-rose-300"
                >
                  {erroSaida}
                </p>
              )}
            </section>
          </nav>
        </div>
      </dialog>

      <style jsx>{`
        .menu-mobile {
          position: fixed;
          inset: 0 0 0 auto;
          box-sizing: border-box;
          width: min(92vw, 400px);
          max-width: none;
          height: 100dvh;
          max-height: none;
          margin: 0;
          padding: 0;
          overflow: hidden;
          border: 0;
          border-left: 1px solid rgb(255 255 255 / 10%);
          background: #091510;
          color: #edede3;
          box-shadow: -20px 0 80px rgb(0 0 0 / 35%);
          opacity: 0;
          transform: translateX(28px);
          transition:
            opacity 180ms ease,
            transform 180ms ease,
            display 180ms allow-discrete,
            overlay 180ms allow-discrete;
        }

        .menu-mobile[open] {
          opacity: 1;
          transform: translateX(0);
        }

        .menu-mobile::backdrop {
          background: rgb(0 0 0 / 0%);
          backdrop-filter: blur(3px);
          transition:
            background 180ms ease,
            display 180ms allow-discrete,
            overlay 180ms allow-discrete;
        }

        .menu-mobile[open]::backdrop {
          background: rgb(0 0 0 / 65%);
        }

        @starting-style {
          .menu-mobile[open] {
            opacity: 0;
            transform: translateX(28px);
          }

          .menu-mobile[open]::backdrop {
            background: rgb(0 0 0 / 0%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .menu-mobile,
          .menu-mobile::backdrop {
            transition: none;
          }

          .menu-mobile {
            transform: none;
          }
        }
      `}</style>
    </>
  );
}
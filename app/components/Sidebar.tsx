'use client';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAppConfig } from '@/app/context/AppContext';
import { supabase } from '@/lib/supabase';

type NavItem = {
  label: string;
  href: string;
  descricao?: string;
};

type NavGroup = {
  label: string;
  itens: NavItem[];
};

const grupos: NavGroup[] = [
  {
    label: 'Operação',

    itens: [
      {
        label: 'Clientes',
        href: '/clientes',
        descricao:
          'Cadastro e relacionamento com viajantes',
      },

      {
        label: 'Reservas',
        href: '/reservas',
        descricao:
          'Solicitações, confirmações e operação',
      },

      {
        label: 'Passeios',
        href: '/passeios',
        descricao:
          'Roteiros, experiências e catálogo',
      },

      {
        label: 'Vouchers',
        href: '/vouchers',
        descricao:
          'Documentos vinculados às reservas',
      },
    ],
  },

  {
    label: 'Estrutura',

    itens: [
      {
        label: 'Hospedagens',
        href: '/hospedagens',
        descricao:
          'Hotéis, pousadas e unidades',
      },

      {
        label: 'Embarcações',
        href: '/embarcacoes',
        descricao:
          'Barcos e capacidade operacional',
      },

      {
        label: 'Guias',
        href: '/guias',
        descricao:
          'Profissionais e disponibilidade',
      },
    ],
  },

  {
    label: 'Financeiro',

    itens: [
      {
        label: 'Visão geral',
        href: '/financeiro',
        descricao:
          'Saldo, recebimentos, pagamentos e pendências',
      },

      {
        label: 'Nova receita',
        href: '/financeiro/receita/novo',
        descricao:
          'Registrar uma entrada financeira',
      },

      {
        label: 'Nova despesa',
        href: '/financeiro/despesa/novo',
        descricao:
          'Registrar uma saída financeira',
      },

      {
        label: 'Exportar relatório',
        href: '/financeiro/exportar',
        descricao:
          'Gerar relatório financeiro em CSV',
      },
    ],
  },

  {
    label: 'Relacionamento',

    itens: [
      {
        label: 'Parceiros',
        href: '/parceiros',
        descricao:
          'Rede operacional e fornecedores',
      },

      {
        label: 'Relatórios',
        href: '/relatorios',
        descricao:
          'Informações consolidadas',
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const { config } =
    useAppConfig();

  const [
    menuMobileAberto,
    setMenuMobileAberto,
  ] = useState(false);

  const [
    grupoAberto,
    setGrupoAberto,
  ] =
    useState<string | null>(
      null
    );

  const [
    perfilAberto,
    setPerfilAberto,
  ] = useState(false);

  const navegacaoRef =
    useRef<HTMLDivElement>(
      null
    );

  /*
    ============================================================
    FECHA MENUS AO TROCAR DE ROTA
    ============================================================
  */

  useEffect(() => {
    setMenuMobileAberto(false);
    setGrupoAberto(null);
    setPerfilAberto(false);
  }, [pathname]);

  /*
    ============================================================
    FECHAR DROPDOWNS AO CLICAR FORA
    ============================================================
  */

  useEffect(() => {
    function fecharFora(
      event: MouseEvent
    ) {
      if (
        navegacaoRef.current &&
        !navegacaoRef.current.contains(
          event.target as Node
        )
      ) {
        setGrupoAberto(null);
        setPerfilAberto(false);
      }
    }

    document.addEventListener(
      'mousedown',
      fecharFora
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        fecharFora
      );
    };
  }, []);

  /*
    ============================================================
    CONTROLE DO BODY NO MOBILE
    ============================================================
  */

  useEffect(() => {
    if (menuMobileAberto) {
      document.body.style.overflow =
        'hidden';
    } else {
      document.body.style.overflow =
        '';
    }

    return () => {
      document.body.style.overflow =
        '';
    };
  }, [menuMobileAberto]);

  /*
    ============================================================
    HELPERS
    ============================================================
  */

  const rotaAtiva = (
    href: string
  ) => {
    if (
      href === '/dashboard'
    ) {
      return (
        pathname === '/dashboard'
      );
    }

    /*
      Visão geral do Financeiro
      deve ficar ativa somente na
      página principal.

      Isso evita que:
      /financeiro
      e
      /financeiro/receita/novo

      apareçam ativos ao mesmo
      tempo.
    */

    if (
      href === '/financeiro'
    ) {
      return (
        pathname === '/financeiro'
      );
    }

    return (
      pathname === href ||
      pathname.startsWith(
        `${href}/`
      )
    );
  };

  const grupoAtivo = (
    grupo: NavGroup
  ) => {
    /*
      O grupo Financeiro precisa
      permanecer destacado também
      em qualquer subrota financeira.
    */

    if (
      grupo.label ===
        'Financeiro' &&
      pathname.startsWith(
        '/financeiro'
      )
    ) {
      return true;
    }

    return grupo.itens.some(
      (item) =>
        rotaAtiva(item.href)
    );
  };

  const toggleGrupo = (
    label: string
  ) => {
    setPerfilAberto(false);

    setGrupoAberto(
      (atual) =>
        atual === label
          ? null
          : label
    );
  };

  async function sair() {
    await supabase.auth.signOut();

    window.location.href =
      '/login';
  }

  return (
    <>
      {/* =======================================================
          HEADER PRINCIPAL
      ======================================================== */}

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-[#07110E]/94 backdrop-blur-2xl">
        <div
          ref={navegacaoRef}
          className="relative mx-auto flex h-[82px] max-w-[1440px] items-center justify-between px-4 md:px-6 xl:px-8"
        >
          {/* ===================================================
              IDENTIDADE
          ==================================================== */}

          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-3"
          >
            <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[#E3A144]/35 bg-[#0D1B16] shadow-[0_0_30px_rgba(227,161,68,0.08)]">
              <img
                src="/logo.png"
                alt="Encantos Rio Negro"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span
                  className="text-[17px] font-medium tracking-[-0.02em] text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  {config.nome_sistema ||
                    'Encantos Rio Negro'}
                </span>

                <span className="rounded-full border border-[#E3A144]/20 bg-[#E3A144]/8 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-[#E3A144]">
                  Gestão
                </span>
              </div>

              <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-[#EDEDE3]/32">
                Operação turística
                integrada
              </p>
            </div>
          </Link>

          {/* ===================================================
              NAVEGAÇÃO CENTRAL — DESKTOP
          ==================================================== */}

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 lg:flex">
            <Link
              href="/dashboard"
              className={`rounded-xl px-4 py-2.5 text-[13px] font-semibold transition ${
                rotaAtiva(
                  '/dashboard'
                )
                  ? 'bg-white/[0.07] text-[#F4C77E]'
                  : 'text-[#EDEDE3]/58 hover:bg-white/[0.04] hover:text-[#EDEDE3]'
              }`}
            >
              Dashboard
            </Link>

            {grupos.map(
              (grupo) => {
                const aberto =
                  grupoAberto ===
                  grupo.label;

                const ativo =
                  grupoAtivo(
                    grupo
                  );

                return (
                  <div
                    key={
                      grupo.label
                    }
                    className="relative"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        toggleGrupo(
                          grupo.label
                        )
                      }
                      className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition ${
                        ativo ||
                        aberto
                          ? 'bg-white/[0.07] text-[#F4C77E]'
                          : 'text-[#EDEDE3]/58 hover:bg-white/[0.04] hover:text-[#EDEDE3]'
                      }`}
                    >
                      {
                        grupo.label
                      }

                      <svg
                        className={`h-3.5 w-3.5 transition-transform ${
                          aberto
                            ? 'rotate-180'
                            : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {aberto && (
                      <div className="absolute left-1/2 top-[calc(100%+14px)] w-[310px] -translate-x-1/2 overflow-hidden rounded-[20px] border border-white/[0.09] bg-[#0A1713]/98 p-2 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
                        <div className="px-3 pb-2 pt-2">
                          <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                            {
                              grupo.label
                            }
                          </span>
                        </div>

                        {grupo.itens.map(
                          (
                            item
                          ) => {
                            const ativoItem =
                              rotaAtiva(
                                item.href
                              );

                            return (
                              <Link
                                key={
                                  item.href
                                }
                                href={
                                  item.href
                                }
                                className={`block rounded-2xl px-4 py-3 transition ${
                                  ativoItem
                                    ? 'bg-[#E3A144]/10'
                                    : 'hover:bg-white/[0.04]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p
                                      className={`text-[13px] font-semibold ${
                                        ativoItem
                                          ? 'text-[#F4C77E]'
                                          : 'text-[#EDEDE3]/85'
                                      }`}
                                    >
                                      {
                                        item.label
                                      }
                                    </p>

                                    {item.descricao && (
                                      <p className="mt-1 text-[10px] leading-4 text-[#EDEDE3]/32">
                                        {
                                          item.descricao
                                        }
                                      </p>
                                    )}
                                  </div>

                                  <span className="text-[#EDEDE3]/20">
                                    →
                                  </span>
                                </div>
                              </Link>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </nav>

          {/* ===================================================
              ÁREA DIREITA
          ==================================================== */}

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden min-h-[40px] items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 text-[11px] font-semibold text-[#EDEDE3]/52 transition hover:border-white/[0.15] hover:text-[#EDEDE3] xl:flex"
            >
              Ver portal

              <span>↗</span>
            </Link>

            {/* PERFIL */}

            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => {
                  setPerfilAberto(
                    (atual) =>
                      !atual
                  );

                  setGrupoAberto(
                    null
                  );
                }}
                className="flex h-10 items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.025] px-2.5 transition hover:bg-white/[0.05]"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E3A144]/25 bg-[#E3A144]/10 text-[9px] font-bold text-[#F4C77E]">
                  ERN
                </div>

                <div className="hidden text-left xl:block">
                  <p className="text-[10px] font-semibold leading-none text-[#EDEDE3]/75">
                    Gestão
                  </p>

                  <p className="mt-1 text-[8px] text-[#EDEDE3]/30">
                    Barcelos • AM
                  </p>
                </div>

                <svg
                  className={`h-3 w-3 text-[#EDEDE3]/35 transition-transform ${
                    perfilAberto
                      ? 'rotate-180'
                      : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {perfilAberto && (
                <div className="absolute right-0 top-[calc(100%+12px)] w-[220px] rounded-[18px] border border-white/[0.09] bg-[#0A1713]/98 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
                  <div className="border-b border-white/[0.07] px-3 py-3">
                    <p className="text-[11px] font-semibold text-[#EDEDE3]">
                      ERN Gestão
                    </p>

                    <p className="mt-1 text-[9px] text-[#EDEDE3]/35">
                      Operação
                      Integrada
                    </p>
                  </div>

                  <Link
                    href="/configuracoes"
                    className="mt-1 block rounded-xl px-3 py-2.5 text-[11px] font-medium text-[#EDEDE3]/55 transition hover:bg-white/[0.04] hover:text-[#EDEDE3]"
                  >
                    Configurações
                  </Link>

                  <button
                    type="button"
                    onClick={sair}
                    className="w-full rounded-xl px-3 py-2.5 text-left text-[11px] font-medium text-red-300/70 transition hover:bg-red-500/[0.07] hover:text-red-300"
                  >
                    Sair da conta
                  </button>
                </div>
              )}
            </div>

            {/* MOBILE */}

            <button
              type="button"
              onClick={() =>
                setMenuMobileAberto(
                  (atual) =>
                    !atual
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.035] text-[#EDEDE3] lg:hidden"
              aria-label="Abrir menu"
            >
              {menuMobileAberto ? (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 7h16M4 12h16M4 17h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* =======================================================
          MENU MOBILE
      ======================================================== */}

      {menuMobileAberto && (
        <>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() =>
              setMenuMobileAberto(
                false
              )
            }
            className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm lg:hidden"
          />

          <div className="fixed inset-x-3 top-[94px] z-50 max-h-[calc(100vh-110px)] overflow-y-auto rounded-[26px] border border-white/[0.09] bg-[#091510]/98 p-4 shadow-[0_30px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl lg:hidden">
            <Link
              href="/dashboard"
              className={`block rounded-2xl px-4 py-3.5 text-sm font-semibold ${
                rotaAtiva(
                  '/dashboard'
                )
                  ? 'bg-[#E3A144]/10 text-[#F4C77E]'
                  : 'text-[#EDEDE3]/70'
              }`}
            >
              Dashboard
            </Link>

            {grupos.map(
              (grupo) => (
                <div
                  key={
                    grupo.label
                  }
                  className="mt-3 border-t border-white/[0.06] pt-3"
                >
                  <p className="px-4 pb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                    {
                      grupo.label
                    }
                  </p>

                  {grupo.itens.map(
                    (
                      item
                    ) => (
                      <Link
                        key={
                          item.href
                        }
                        href={
                          item.href
                        }
                        className={`block rounded-2xl px-4 py-3 ${
                          rotaAtiva(
                            item.href
                          )
                            ? 'bg-white/[0.06] text-[#F4C77E]'
                            : 'text-[#EDEDE3]/62'
                        }`}
                      >
                        <p className="text-sm font-semibold">
                          {
                            item.label
                          }
                        </p>

                        {item.descricao && (
                          <p className="mt-1 text-[10px] leading-4 text-[#EDEDE3]/30">
                            {
                              item.descricao
                            }
                          </p>
                        )}
                      </Link>
                    )
                  )}
                </div>
              )
            )}

            <div className="mt-4 border-t border-white/[0.07] pt-4">
              <Link
                href="/configuracoes"
                className="block rounded-2xl px-4 py-3 text-sm font-semibold text-[#EDEDE3]/60"
              >
                Configurações
              </Link>

              <Link
                href="/"
                className="block rounded-2xl px-4 py-3 text-sm font-semibold text-[#EDEDE3]/60"
              >
                Ver portal público
              </Link>

              <button
                type="button"
                onClick={sair}
                className="w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold text-red-300/70"
              >
                Sair da conta
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
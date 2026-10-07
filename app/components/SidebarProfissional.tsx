'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import LogoERN from '@/app/components/LogoERN';
import { supabase } from '@/lib/supabase';

import type {
  TipoAcessoProfissional,
} from '@/lib/acessos';

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

type SidebarProfissionalProps = {
  tipo: TipoAcessoProfissional;
};

const FOCO =
  'focus-visible:outline focus-visible:outline-2 ' +
  'focus-visible:outline-offset-2 focus-visible:outline-[#E3A144]';

const BOTAO_TOPO =
  'inline-flex min-h-11 items-center justify-center gap-2 ' +
  'rounded-xl px-3 text-[13px] font-semibold transition-colors ' +
  'motion-reduce:transition-none ' +
  FOCO;

function rotaAtiva(
  pathname: string,
  href: string,
): boolean {
  if (
    href === '/guia' ||
    href === '/fornecedor'
  ) {
    return pathname === href;
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

function configuracaoNavegacao(
  tipo: TipoAcessoProfissional,
): {
  inicio: NavItem[];
  grupos: NavGroup[];
  conta: NavItem[];
  subtitulo: string;
  raiz: string;
} {
  if (tipo === 'guia') {
    return {
      raiz: '/guia',

      subtitulo: 'Guia independente',

      inicio: [
        {
          label: 'Início',
          href: '/guia',
          descricao:
            'Visão geral da sua atividade na Rede ERN',
        },
        {
          label: 'Oportunidades',
          href: '/guia/oportunidades',
          descricao:
            'Demandas e oportunidades compatíveis',
        },
      ],

      grupos: [
        {
          id: 'atividade',
          label: 'Minha atividade',
          itens: [
            {
              label: 'Disponibilidade',
              href: '/guia/disponibilidade',
              descricao:
                'Informe quando e onde você pode atuar',
            },
            {
              label: 'Serviços e experiências',
              href: '/guia/servicos',
              descricao:
                'Organize o que você oferece aos parceiros',
            },
            {
              label: 'Meu perfil',
              href: '/guia/perfil',
              descricao:
                'Dados profissionais e apresentação',
            },
          ],
        },
        {
          id: 'rede',
          label: 'Rede ERN',
          itens: [
            {
              label: 'Demandas',
              href: '/guia/demandas',
              descricao:
                'Necessidades publicadas pela rede',
            },
            {
              label: 'Minhas publicações',
              href: '/guia/publicacoes',
              descricao:
                'Conteúdos que poderão alimentar o feed público',
            },
            {
              label: 'Portal público',
              href: '/',
              descricao:
                'Visualizar a Encantos Rio Negro como visitante',
            },
          ],
        },
      ],

      conta: [
        {
          label: 'Minha conta',
          href: '/acesso?acesso=guia',
          descricao:
            'Consultar o acesso conectado',
        },
      ],
    };
  }

  return {
    raiz: '/fornecedor',

    subtitulo: 'Fornecedor independente',

    inicio: [
      {
        label: 'Início',
        href: '/fornecedor',
        descricao:
          'Visão geral do seu negócio na Rede ERN',
      },
      {
        label: 'Demandas',
        href: '/fornecedor/demandas',
        descricao:
          'Necessidades de operadoras e parceiros',
      },
    ],

    grupos: [
      {
        id: 'negocio',
        label: 'Meu negócio',
        itens: [
          {
            label: 'Minha oferta',
            href: '/fornecedor/ofertas',
            descricao:
              'Produtos e serviços disponíveis',
          },
          {
            label: 'Produtos e serviços',
            href: '/fornecedor/produtos',
            descricao:
              'Organize o que seu negócio oferece',
          },
          {
            label: 'Meu perfil',
            href: '/fornecedor/perfil',
            descricao:
              'Dados comerciais e apresentação',
          },
        ],
      },
      {
        id: 'rede',
        label: 'Rede ERN',
        itens: [
          {
            label: 'Oportunidades',
            href: '/fornecedor/oportunidades',
            descricao:
              'Possibilidades de negócio dentro da rede',
          },
          {
            label: 'Minhas publicações',
            href: '/fornecedor/publicacoes',
            descricao:
              'Conteúdos que poderão alimentar o feed público',
          },
          {
            label: 'Portal público',
            href: '/',
            descricao:
              'Visualizar a Encantos Rio Negro como visitante',
          },
        ],
      },
    ],

    conta: [
      {
        label: 'Minha conta',
        href: '/acesso?acesso=fornecedor',
        descricao:
          'Consultar o acesso conectado',
      },
    ],
  };
}

function Seta({
  aberta,
}: {
  aberta: boolean;
}) {
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
  const ativo = rotaAtiva(
    pathname,
    item.href,
  );

  return (
    <Link
      href={item.href}
      onClick={aoNavegar}
      aria-current={
        ativo ? 'page' : undefined
      }
      className={`block min-h-12 rounded-xl px-4 py-3 transition-colors motion-reduce:transition-none ${FOCO} ${
        ativo
          ? 'bg-[#E3A144]/10 text-[#F4C77E]'
          : 'text-[#EDEDE3] hover:bg-white/5'
      }`}
    >
      <span className="block text-sm font-semibold">
        {item.label}
      </span>

      {item.descricao && (
        <span className="mt-1 block text-xs leading-5 text-[#A8BCAF]">
          {item.descricao}
        </span>
      )}
    </Link>
  );
}

export default function SidebarProfissional({
  tipo,
}: SidebarProfissionalProps) {
  const pathname =
    usePathname() ?? '';

  const navegacao =
    configuracaoNavegacao(tipo);

  const [
    mobileAberto,
    setMobileAberto,
  ] = useState(false);

  const [
    dropdown,
    setDropdown,
  ] = useState<string | null>(
    null,
  );

  const [
    saindo,
    setSaindo,
  ] = useState(false);

  const [
    erroSaida,
    setErroSaida,
  ] = useState<string | null>(
    null,
  );

  const headerRef =
    useRef<HTMLElement>(null);

  const dialogRef =
    useRef<HTMLDialogElement>(null);

  const acionadorDropdownRef =
    useRef<HTMLButtonElement | null>(
      null,
    );

  const saidaEmAndamento =
    useRef(false);

  function fecharMenus(): void {
    setDropdown(null);
    setMobileAberto(false);
  }

  useEffect(() => {
    setDropdown(null);
    setMobileAberto(false);
  }, [pathname]);

  useEffect(() => {
    function aoPressionar(
      evento: KeyboardEvent,
    ): void {
      if (
        evento.key !== 'Escape'
      ) {
        return;
      }

      setDropdown(null);

      acionadorDropdownRef.current?.focus();
    }

    function aoTocarFora(
      evento: PointerEvent,
    ): void {
      if (
        evento.target instanceof
          Node &&
        !headerRef.current?.contains(
          evento.target,
        )
      ) {
        setDropdown(null);
      }
    }

    document.addEventListener(
      'keydown',
      aoPressionar,
    );

    document.addEventListener(
      'pointerdown',
      aoTocarFora,
    );

    return () => {
      document.removeEventListener(
        'keydown',
        aoPressionar,
      );

      document.removeEventListener(
        'pointerdown',
        aoTocarFora,
      );
    };
  }, []);

  useEffect(() => {
    const media =
      window.matchMedia(
        '(min-width: 1280px)',
      );

    function ajustarMenus(): void {
      setDropdown(null);

      if (media.matches) {
        setMobileAberto(false);
      }
    }

    media.addEventListener(
      'change',
      ajustarMenus,
    );

    return () => {
      media.removeEventListener(
        'change',
        ajustarMenus,
      );
    };
  }, []);

  useEffect(() => {
    const dialog =
      dialogRef.current;

    if (!dialog) {
      return;
    }

    if (!mobileAberto) {
      if (dialog.open) {
        dialog.close();
      }

      return;
    }

    const overflowAnterior =
      document.body.style.overflow;

    document.body.style.overflow =
      'hidden';

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      document.body.style.overflow =
        overflowAnterior;

      if (dialog.open) {
        dialog.close();
      }
    };
  }, [mobileAberto]);

  function alternarDropdown(
    id: string,
    acionador: HTMLButtonElement,
  ): void {
    acionadorDropdownRef.current =
      acionador;

    setDropdown((atual) =>
      atual === id ? null : id,
    );
  }

  async function sair(): Promise<void> {
    if (
      saidaEmAndamento.current
    ) {
      return;
    }

    saidaEmAndamento.current =
      true;

    setSaindo(true);
    setErroSaida(null);

    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      window.location.assign(
        `/login?acesso=${tipo}`,
      );
    } catch {
      setErroSaida(
        'Não foi possível sair da conta. Verifique sua conexão e tente novamente.',
      );
    } finally {
      saidaEmAndamento.current =
        false;

      setSaindo(false);
    }
  }

  function grupoAtivo(
    grupo: NavGroup,
  ): boolean {
    return grupo.itens.some(
      (item) =>
        rotaAtiva(
          pathname,
          item.href,
        ),
    );
  }

  function botaoSair() {
    return (
      <button
        type="button"
        disabled={saindo}
        onClick={() =>
          void sair()
        }
        className={`mt-2 min-h-12 w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-400/10 disabled:cursor-wait disabled:opacity-50 motion-reduce:transition-none ${FOCO}`}
      >
        {saindo
          ? 'Saindo...'
          : 'Sair da conta'}
      </button>
    );
  }

  return (
    <>
      <header
        ref={headerRef}
        className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#07110E]/95 text-[#EDEDE3] backdrop-blur-xl"
        onBlur={(evento) => {
          const destino =
            evento.relatedTarget;

          if (
            !(
              destino instanceof Node
            ) ||
            !evento.currentTarget.contains(
              destino,
            )
          ) {
            setDropdown(null);
          }
        }}
      >
        <div className="mx-auto flex h-[82px] max-w-[1600px] items-center justify-between gap-3 px-4 md:px-6">
          <Link
            href={navegacao.raiz}
            onClick={fecharMenus}
            className={`flex min-w-0 items-center gap-3 rounded-xl xl:max-w-[250px] ${FOCO}`}
          >
            <LogoERN prioridade />

            <span className="min-w-0">
              <span
                className="block truncate text-sm font-semibold text-[#F0F0E8] sm:text-base"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Encantos Rio Negro
              </span>

              <span className="mt-1 block truncate text-[10px] uppercase tracking-widest text-[#B4C8BB]">
                {navegacao.subtitulo}
              </span>
            </span>
          </Link>

          <nav
            aria-label={`Navegação ${
              tipo === 'guia'
                ? 'do guia'
                : 'do fornecedor'
            }`}
            className="hidden shrink-0 items-center gap-1 xl:flex"
          >
            {navegacao.inicio.map(
              (item) => {
                const ativo =
                  rotaAtiva(
                    pathname,
                    item.href,
                  );

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={
                      fecharMenus
                    }
                    aria-current={
                      ativo
                        ? 'page'
                        : undefined
                    }
                    className={`${BOTAO_TOPO} ${
                      ativo
                        ? 'bg-[#E3A144]/10 text-[#F4C77E]'
                        : 'text-[#B4C8BB] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              },
            )}

            {navegacao.grupos.map(
              (grupo) => {
                const aberto =
                  dropdown === grupo.id;

                const ativo =
                  grupoAtivo(grupo);

                const painelId =
                  `nav-profissional-${grupo.id}`;

                return (
                  <div
                    key={grupo.id}
                    className="relative"
                  >
                    <button
                      type="button"
                      aria-expanded={
                        aberto
                      }
                      aria-controls={
                        painelId
                      }
                      onClick={(
                        evento,
                      ) =>
                        alternarDropdown(
                          grupo.id,
                          evento.currentTarget,
                        )
                      }
                      className={`${BOTAO_TOPO} ${
                        aberto ||
                        ativo
                          ? 'bg-white/5 text-[#F4C77E]'
                          : 'text-[#B4C8BB] hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {grupo.label}

                      <Seta
                        aberta={
                          aberto
                        }
                      />
                    </button>

                    <div
                      id={painelId}
                      hidden={!aberto}
                      className="absolute right-0 top-[calc(100%+12px)] w-80 rounded-2xl border border-white/10 bg-[#0A1713] p-2 shadow-2xl"
                    >
                      {grupo.itens.map(
                        (item) => (
                          <LinkNavegacao
                            key={
                              item.href
                            }
                            item={
                              item
                            }
                            pathname={
                              pathname
                            }
                            aoNavegar={
                              fecharMenus
                            }
                          />
                        ),
                      )}
                    </div>
                  </div>
                );
              },
            )}
          </nav>

          <div className="hidden shrink-0 xl:block">
            <div className="relative">
              <button
                type="button"
                aria-expanded={
                  dropdown === 'conta'
                }
                aria-controls="nav-profissional-conta"
                onClick={(
                  evento,
                ) =>
                  alternarDropdown(
                    'conta',
                    evento.currentTarget,
                  )
                }
                className={`${BOTAO_TOPO} border border-white/10 text-[#EDEDE3] hover:bg-white/5`}
              >
                Conta

                <Seta
                  aberta={
                    dropdown ===
                    'conta'
                  }
                />
              </button>

              <div
                id="nav-profissional-conta"
                hidden={
                  dropdown !==
                  'conta'
                }
                className="absolute right-0 top-[calc(100%+12px)] w-80 rounded-2xl border border-white/10 bg-[#0A1713] p-2 shadow-2xl"
              >
                <p className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#E3A144]">
                  Minha conta
                </p>

                {navegacao.conta.map(
                  (item) => (
                    <LinkNavegacao
                      key={
                        item.href
                      }
                      item={item}
                      pathname={
                        pathname
                      }
                      aoNavegar={
                        fecharMenus
                      }
                    />
                  ),
                )}

                {botaoSair()}

                {erroSaida && (
                  <p
                    role="alert"
                    className="px-4 py-3 text-sm leading-6 text-rose-300"
                  >
                    {
                      erroSaida
                    }
                  </p>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            aria-label="Abrir menu de navegação"
            aria-expanded={
              mobileAberto
            }
            aria-controls="menu-mobile-profissional"
            aria-haspopup="dialog"
            onClick={() => {
              setDropdown(null);

              acionadorDropdownRef.current =
                null;

              setMobileAberto(
                true,
              );
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
              <path
                strokeLinecap="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </header>

      <dialog
        ref={dialogRef}
        id="menu-mobile-profissional"
        aria-labelledby="titulo-menu-mobile-profissional"
        className="menu-mobile-profissional"
        onCancel={(evento) => {
          evento.preventDefault();

          setMobileAberto(false);
        }}
        onClick={(evento) => {
          if (
            evento.target !==
            evento.currentTarget
          ) {
            return;
          }

          const limites =
            evento.currentTarget.getBoundingClientRect();

          if (
            evento.clientX <
              limites.left ||
            evento.clientX >
              limites.right ||
            evento.clientY <
              limites.top ||
            evento.clientY >
              limites.bottom
          ) {
            setMobileAberto(
              false,
            );
          }
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div className="min-w-0">
              <h2
                id="titulo-menu-mobile-profissional"
                className="text-lg font-semibold text-[#F0F0E8]"
              >
                Navegação
              </h2>

              <p className="mt-1 truncate text-xs text-[#B4C8BB]">
                {
                  navegacao.subtitulo
                }
              </p>
            </div>

            <button
              type="button"
              aria-label="Fechar menu de navegação"
              onClick={() =>
                setMobileAberto(
                  false,
                )
              }
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
            aria-label="Navegação mobile profissional"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"
            style={{
              paddingBottom:
                'max(24px, env(safe-area-inset-bottom))',
            }}
          >
            <div className="space-y-1">
              {navegacao.inicio.map(
                (item) => (
                  <LinkNavegacao
                    key={
                      item.href
                    }
                    item={item}
                    pathname={
                      pathname
                    }
                    aoNavegar={
                      fecharMenus
                    }
                  />
                ),
              )}
            </div>

            {navegacao.grupos.map(
              (grupo) => (
                <section
                  key={grupo.id}
                  aria-labelledby={`titulo-mobile-profissional-${grupo.id}`}
                  className="mt-4 border-t border-white/10 pt-4"
                >
                  <h3
                    id={`titulo-mobile-profissional-${grupo.id}`}
                    className="px-4 pb-2 text-xs font-semibold uppercase tracking-widest text-[#E3A144]"
                  >
                    {
                      grupo.label
                    }
                  </h3>

                  <div className="space-y-1">
                    {grupo.itens.map(
                      (item) => (
                        <LinkNavegacao
                          key={
                            item.href
                          }
                          item={
                            item
                          }
                          pathname={
                            pathname
                          }
                          aoNavegar={
                            fecharMenus
                          }
                        />
                      ),
                    )}
                  </div>
                </section>
              ),
            )}

            <section
              aria-labelledby="titulo-mobile-profissional-conta"
              className="mt-4 border-t border-white/10 pt-4"
            >
              <h3
                id="titulo-mobile-profissional-conta"
                className="px-4 pb-2 text-xs font-semibold uppercase tracking-widest text-[#E3A144]"
              >
                Minha conta
              </h3>

              {navegacao.conta.map(
                (item) => (
                  <LinkNavegacao
                    key={
                      item.href
                    }
                    item={item}
                    pathname={
                      pathname
                    }
                    aoNavegar={
                      fecharMenus
                    }
                  />
                ),
              )}

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
        .menu-mobile-profissional {
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
          border-left: 1px solid
            rgb(255 255 255 / 10%);
          background: #091510;
          color: #edede3;
          box-shadow: -20px 0 80px
            rgb(0 0 0 / 35%);
          opacity: 0;
          transform: translateX(28px);
          transition:
            opacity 180ms ease,
            transform 180ms ease,
            display 180ms allow-discrete,
            overlay 180ms allow-discrete;
        }

        .menu-mobile-profissional[open] {
          opacity: 1;
          transform: translateX(0);
        }

        .menu-mobile-profissional::backdrop {
          background: rgb(
            0 0 0 / 0%
          );
          backdrop-filter: blur(3px);
          transition:
            background 180ms ease,
            display 180ms allow-discrete,
            overlay 180ms allow-discrete;
        }

        .menu-mobile-profissional[open]::backdrop {
          background: rgb(
            0 0 0 / 65%
          );
        }

        @starting-style {
          .menu-mobile-profissional[open] {
            opacity: 0;
            transform: translateX(
              28px
            );
          }

          .menu-mobile-profissional[open]::backdrop {
            background: rgb(
              0 0 0 / 0%
            );
          }
        }

        @media (
          prefers-reduced-motion:
            reduce
        ) {
          .menu-mobile-profissional,
          .menu-mobile-profissional::backdrop {
            transition: none;
          }

          .menu-mobile-profissional {
            transform: none;
          }
        }
      `}</style>
    </>
  );
}
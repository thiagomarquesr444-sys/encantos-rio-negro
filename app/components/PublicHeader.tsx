'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  useLanguage,
  type Idioma,
} from '@/app/components/LanguageProvider';

const idiomas: Idioma[] = ['PT', 'EN', 'ES'];

const textos = {
  PT: {
    discover: 'Descubra',
    experiences: 'Experiências',
    destinations: 'Destinos',
    network: 'Rede',
    operators: 'Para operadores',
    plan: 'Planejar viagem',
    language: 'Idioma',
    menu: 'Menu',
    closeMenu: 'Fechar menu',
  },

  EN: {
    discover: 'Discover',
    experiences: 'Experiences',
    destinations: 'Destinations',
    network: 'Network',
    operators: 'For operators',
    plan: 'Plan your trip',
    language: 'Language',
    menu: 'Menu',
    closeMenu: 'Close menu',
  },

  ES: {
    discover: 'Descubre',
    experiences: 'Experiencias',
    destinations: 'Destinos',
    network: 'Red',
    operators: 'Para operadores',
    plan: 'Planificar viaje',
    language: 'Idioma',
    menu: 'Menú',
    closeMenu: 'Cerrar menú',
  },
};

export default function PublicHeader() {
  const pathname = usePathname();

  /*
    IDIOMA GLOBAL

    Agora o Header não possui mais um idioma próprio.
    Ele usa o mesmo idioma compartilhado por toda a Face 1.
  */
  const { idioma, setIdioma } = useLanguage();

  const [menuAberto, setMenuAberto] = useState(false);
  const [idiomaAberto, setIdiomaAberto] = useState(false);
  const [rolouPagina, setRolouPagina] = useState(false);

  const idiomaRef = useRef<HTMLDivElement>(null);

  const t = textos[idioma];

  /* =========================================================
      DETECÇÃO DE ROTAS ATIVAS
  ========================================================== */

  const paginaInicial = pathname === '/';

  const paginaExperiencias =
    pathname === '/experiencias' ||
    pathname.startsWith('/experiencias/');

  const paginaDestinos =
    pathname === '/destinos' ||
    pathname.startsWith('/destinos/');

  const paginaRede =
    pathname === '/rede' ||
    pathname.startsWith('/rede/');

  const paginaOperadores =
    pathname === '/operadores' ||
    pathname.startsWith('/operadores/');

  /* =========================================================
      SCROLL DO HEADER
  ========================================================== */

  useEffect(() => {
    const handleScroll = () => {
      setRolouPagina(window.scrollY > 24);
    };

    handleScroll();

    window.addEventListener('scroll', handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  /* =========================================================
      FECHAR MENUS AO TROCAR DE ROTA
  ========================================================== */

  useEffect(() => {
    setMenuAberto(false);
    setIdiomaAberto(false);
  }, [pathname]);

  /* =========================================================
      FECHAR SELETOR AO CLICAR FORA
  ========================================================== */

  useEffect(() => {
    const fecharAoClicarFora = (event: MouseEvent) => {
      if (
        idiomaRef.current &&
        !idiomaRef.current.contains(event.target as Node)
      ) {
        setIdiomaAberto(false);
      }
    };

    document.addEventListener(
      'mousedown',
      fecharAoClicarFora
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        fecharAoClicarFora
      );
    };
  }, []);

  /* =========================================================
      BLOQUEAR SCROLL NO MENU MOBILE
  ========================================================== */

  useEffect(() => {
    if (menuAberto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [menuAberto]);

  /* =========================================================
      ATUALIZAR LANG DO HTML
  ========================================================== */

  useEffect(() => {
    const idiomasHtml: Record<Idioma, string> = {
      PT: 'pt-BR',
      EN: 'en',
      ES: 'es',
    };

    document.documentElement.lang =
      idiomasHtml[idioma];
  }, [idioma]);

  /* =========================================================
      ALTERAÇÃO GLOBAL DE IDIOMA
  ========================================================== */

  const selecionarIdioma = (
    novoIdioma: Idioma
  ) => {
    setIdioma(novoIdioma);
    setIdiomaAberto(false);
  };

  /* =========================================================
      ESTILOS
  ========================================================== */

  const classeLinkDesktop = (ativo: boolean) =>
    `relative rounded-lg px-3.5 py-2 text-[13px] font-medium transition ${
      ativo
        ? 'bg-white/[0.055] text-[#F0F0E8]'
        : 'text-[#EDEDE3]/62 hover:bg-white/[0.04] hover:text-[#F0F0E8]'
    }`;

  const classeLinkMobile = (ativo: boolean) =>
    `flex items-center justify-between rounded-xl px-4 py-3.5 text-sm font-medium transition ${
      ativo
        ? 'bg-[#E3A144]/10 text-[#F4C77E]'
        : 'text-[#EDEDE3]/75 hover:bg-white/[0.05]'
    }`;

  return (
    <>
      {/* =========================================================
          HEADER
      ========================================================== */}

      <header
        className={`fixed inset-x-0 top-0 z-[100] transition-all duration-500 ${
          rolouPagina
            ? 'border-b border-white/10 bg-[#08130F]/92 shadow-[0_14px_45px_rgba(0,0,0,0.22)] backdrop-blur-2xl'
            : 'border-b border-white/[0.07] bg-[#08130F]/72 backdrop-blur-xl'
        }`}
      >
        <div className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between gap-6 px-5 md:px-8">

          {/* =====================================================
              IDENTIDADE
          ====================================================== */}

          <Link
            href="/"
            aria-label="Encantos Rio Negro"
            className="group flex shrink-0 items-center gap-3 no-underline"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#E3A144]/35 bg-[#E3A144]/10">
              <span className="text-[15px] text-[#E3A144] transition-transform duration-500 group-hover:rotate-12">
                ✦
              </span>

              <span className="absolute inset-[-4px] rounded-full border border-[#E3A144]/0 transition duration-500 group-hover:border-[#E3A144]/20" />
            </div>

            <div className="leading-none">
              <p
                className="text-[17px] font-medium tracking-[-0.02em] text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Encantos
              </p>

              <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.3em] text-[#E3A144]/80">
                Rio Negro
              </p>
            </div>
          </Link>

          {/* =====================================================
              NAVEGAÇÃO DESKTOP
          ====================================================== */}

          <nav className="hidden items-center gap-1 xl:flex">
            <Link
              href="/"
              className={classeLinkDesktop(
                paginaInicial
              )}
            >
              {t.discover}

              {paginaInicial && (
                <span className="absolute inset-x-3 -bottom-[18px] h-px bg-[#E3A144]" />
              )}
            </Link>

            <Link
              href="/experiencias"
              className={classeLinkDesktop(
                paginaExperiencias
              )}
            >
              {t.experiences}

              {paginaExperiencias && (
                <span className="absolute inset-x-3 -bottom-[18px] h-px bg-[#E3A144]" />
              )}
            </Link>

            <Link
              href="/destinos"
              className={classeLinkDesktop(
                paginaDestinos
              )}
            >
              {t.destinations}

              {paginaDestinos && (
                <span className="absolute inset-x-3 -bottom-[18px] h-px bg-[#E3A144]" />
              )}
            </Link>

            <Link
              href="/rede"
              className={classeLinkDesktop(
                paginaRede
              )}
            >
              {t.network}

              {paginaRede && (
                <span className="absolute inset-x-3 -bottom-[18px] h-px bg-[#E3A144]" />
              )}
            </Link>
          </nav>

          {/* =====================================================
              AÇÕES DESKTOP
          ====================================================== */}

          <div className="hidden items-center gap-2 md:flex">

            {/* OPERADORES */}

            <Link
              href="/operadores"
              className={`group inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-[12px] font-semibold transition ${
                paginaOperadores
                  ? 'border-[#E3A144]/30 bg-[#E3A144]/10 text-[#F4C77E]'
                  : 'border-white/10 bg-white/[0.025] text-[#EDEDE3]/72 hover:border-[#7C9C87]/30 hover:bg-white/[0.055] hover:text-[#F0F0E8]'
              }`}
            >
              <span className="hidden lg:inline">
                {t.operators}
              </span>

              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              >
                <path
                  d="M5 12H19M13 6L19 12L13 18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>

            {/* =================================================
                IDIOMA
            ================================================== */}

            <div
              ref={idiomaRef}
              className="relative"
            >
              <button
                type="button"
                aria-label={t.language}
                aria-expanded={idiomaAberto}
                onClick={() =>
                  setIdiomaAberto(
                    (estado) => !estado
                  )
                }
                className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-[11px] font-semibold transition ${
                  idiomaAberto
                    ? 'border-[#E3A144]/35 bg-[#E3A144]/10 text-[#F4C77E]'
                    : 'border-white/10 bg-white/[0.025] text-[#EDEDE3]/65 hover:border-white/20 hover:bg-white/[0.05]'
                }`}
              >
                <span className="text-[13px]">
                  {idioma === 'PT'
                    ? '🇧🇷'
                    : idioma === 'EN'
                    ? '🇺🇸'
                    : '🇪🇸'}
                </span>

                <span>{idioma}</span>

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className={`h-3 w-3 transition-transform ${
                    idiomaAberto
                      ? 'rotate-180'
                      : ''
                  }`}
                >
                  <path
                    d="M6 9L12 15L18 9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {idiomaAberto && (
                <div className="absolute right-0 top-[48px] w-[170px] overflow-hidden rounded-2xl border border-white/10 bg-[#0A1713]/98 p-1.5 shadow-2xl backdrop-blur-2xl">
                  <p className="px-3 pb-1.5 pt-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#EDEDE3]/30">
                    {t.language}
                  </p>

                  {idiomas.map((item) => {
                    const ativo =
                      idioma === item;

                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() =>
                          selecionarIdioma(
                            item
                          )
                        }
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition ${
                          ativo
                            ? 'bg-[#E3A144]/10 text-[#F4C77E]'
                            : 'text-[#EDEDE3]/65 hover:bg-white/[0.05] hover:text-[#F0F0E8]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span>
                            {item === 'PT'
                              ? '🇧🇷'
                              : item === 'EN'
                              ? '🇺🇸'
                              : '🇪🇸'}
                          </span>

                          <span>
                            {item === 'PT'
                              ? 'Português'
                              : item === 'EN'
                              ? 'English'
                              : 'Español'}
                          </span>
                        </span>

                        {ativo && (
                          <span className="text-[#E3A144]">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* =================================================
                CTA PRINCIPAL
            ================================================== */}

            <Link
              href="/#concierge"
              className="group relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#E3A144] px-5 text-[12px] font-bold text-[#07130F] shadow-[0_8px_30px_rgba(227,161,68,0.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#F0B35C] hover:shadow-[0_12px_36px_rgba(227,161,68,0.26)]"
            >
              <span className="relative z-10">
                {t.plan}
              </span>

              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="relative z-10 h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
              >
                <path
                  d="M5 12H19M13 6L19 12L13 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <span className="absolute inset-y-0 -left-20 w-14 rotate-[20deg] bg-white/25 blur-lg transition-all duration-700 group-hover:left-[120%]" />
            </Link>
          </div>

          {/* =====================================================
              BOTÃO MOBILE
          ====================================================== */}

          <button
            type="button"
            aria-label={t.menu}
            aria-expanded={menuAberto}
            onClick={() =>
              setMenuAberto(
                (estado) => !estado
              )
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-[#EDEDE3] transition hover:bg-white/[0.06] md:hidden"
          >
            <div className="relative h-4 w-5">
              <span
                className={`absolute left-0 top-0 h-px w-5 bg-current transition-all duration-300 ${
                  menuAberto
                    ? 'top-[7px] rotate-45'
                    : ''
                }`}
              />

              <span
                className={`absolute left-0 top-[7px] h-px w-5 bg-current transition-all duration-300 ${
                  menuAberto
                    ? 'opacity-0'
                    : 'opacity-100'
                }`}
              />

              <span
                className={`absolute left-0 top-[14px] h-px w-5 bg-current transition-all duration-300 ${
                  menuAberto
                    ? 'top-[7px] -rotate-45'
                    : ''
                }`}
              />
            </div>
          </button>
        </div>
      </header>

      {/* =========================================================
          MENU MOBILE
      ========================================================== */}

      <div
        className={`fixed inset-0 z-[90] transition ${
          menuAberto
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        } md:hidden`}
      >
        <button
          type="button"
          aria-label={t.closeMenu}
          onClick={() =>
            setMenuAberto(false)
          }
          className="absolute inset-0 bg-[#030806]/80 backdrop-blur-md"
        />

        <div
          className={`absolute inset-x-3 top-[88px] overflow-hidden rounded-[26px] border border-white/10 bg-[#0A1713]/98 shadow-2xl transition-all duration-300 ${
            menuAberto
              ? 'translate-y-0 scale-100'
              : '-translate-y-3 scale-[0.98]'
          }`}
        >
          <div className="p-4">

            {/* =================================================
                NAVEGAÇÃO MOBILE
            ================================================== */}

            <nav className="space-y-1">
              <Link
                href="/"
                onClick={() =>
                  setMenuAberto(false)
                }
                className={classeLinkMobile(
                  paginaInicial
                )}
              >
                {t.discover}

                <span className="text-[#E3A144]">
                  →
                </span>
              </Link>

              <Link
                href="/experiencias"
                onClick={() =>
                  setMenuAberto(false)
                }
                className={classeLinkMobile(
                  paginaExperiencias
                )}
              >
                {t.experiences}

                <span className="text-[#E3A144]">
                  →
                </span>
              </Link>

              <Link
                href="/destinos"
                onClick={() =>
                  setMenuAberto(false)
                }
                className={classeLinkMobile(
                  paginaDestinos
                )}
              >
                {t.destinations}

                <span className="text-[#E3A144]">
                  →
                </span>
              </Link>

              <Link
                href="/rede"
                onClick={() =>
                  setMenuAberto(false)
                }
                className={classeLinkMobile(
                  paginaRede
                )}
              >
                {t.network}

                <span className="text-[#E3A144]">
                  →
                </span>
              </Link>
            </nav>

            <div className="my-4 h-px bg-white/[0.07]" />

            {/* =================================================
                IDIOMAS MOBILE
            ================================================== */}

            <div>
              <p className="px-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#EDEDE3]/30">
                {t.language}
              </p>

              <div className="mt-2 grid grid-cols-3 gap-2">
                {idiomas.map((item) => {
                  const ativo =
                    idioma === item;

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        selecionarIdioma(
                          item
                        )
                      }
                      className={`rounded-xl border px-3 py-3 text-xs font-semibold transition ${
                        ativo
                          ? 'border-[#E3A144]/40 bg-[#E3A144]/10 text-[#F4C77E]'
                          : 'border-white/10 bg-white/[0.025] text-[#EDEDE3]/55'
                      }`}
                    >
                      <span className="mr-1.5">
                        {item === 'PT'
                          ? '🇧🇷'
                          : item === 'EN'
                          ? '🇺🇸'
                          : '🇪🇸'}
                      </span>

                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="my-4 h-px bg-white/[0.07]" />

            {/* =================================================
                OPERADORES
            ================================================== */}

            <Link
              href="/operadores"
              onClick={() =>
                setMenuAberto(false)
              }
              className={`flex min-h-[50px] items-center justify-between rounded-xl border px-4 text-sm font-semibold transition ${
                paginaOperadores
                  ? 'border-[#E3A144]/35 bg-[#E3A144]/10 text-[#F4C77E]'
                  : 'border-white/10 bg-white/[0.025] text-[#EDEDE3]/75'
              }`}
            >
              {t.operators}

              <span className="text-[#7C9C87]">
                →
              </span>
            </Link>

            {/* =================================================
                CTA MOBILE
            ================================================== */}

            <Link
              href="/#concierge"
              onClick={() =>
                setMenuAberto(false)
              }
              className="mt-2 flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#E3A144] px-5 text-sm font-bold text-[#07130F]"
            >
              {t.plan}

              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import LogoERN from '@/app/components/LogoERN';
import {
  useLanguage,
  type Idioma,
} from '@/app/components/LanguageProvider';

const idiomas: Idioma[] = ['PT', 'EN', 'ES'];

const nomesIdiomas: Record<Idioma, string> = {
  PT: 'Português',
  EN: 'English',
  ES: 'Español',
};

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
    navigation: 'Navegação do portal',
    home: 'Encantos Rio Negro — início',
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
    navigation: 'Portal navigation',
    home: 'Encantos Rio Negro — home',
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
    navigation: 'Navegación del portal',
    home: 'Encantos Rio Negro — inicio',
  },
};

const FOCO =
  'focus-visible:outline-2 focus-visible:outline-offset-4 ' +
  'focus-visible:outline-[#E3A144]';

function rotaAtiva(pathname: string, href: string) {
  if (href === '/') return pathname === '/';

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

function IconeMenu({ fechar = false }: { fechar?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className="h-6 w-6 shrink-0"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={
          fechar
            ? 'M6 6l12 12M6 18L18 6'
            : 'M4 6h16M4 12h16M4 18h16'
        }
      />
    </svg>
  );
}

export default function PublicHeader() {
  const pathname = usePathname();
  const { idioma, setIdioma } = useLanguage();

  const [menuAberto, setMenuAberto] = useState(false);
  const [rolouPagina, setRolouPagina] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const fecharRef = useRef<HTMLButtonElement>(null);

  const t = textos[idioma];

  const links = [
    { href: '/', titulo: t.discover },
    { href: '/experiencias', titulo: t.experiences },
    { href: '/destinos', titulo: t.destinations },
    { href: '/rede', titulo: t.network },
  ];

  const paginaOperadores = rotaAtiva(
    pathname,
    '/operadores',
  );

  function fecharMenu() {
    // Fecha imediatamente para permitir também a navegação
    // por âncoras dentro da mesma página.
    dialogRef.current?.close();
    setMenuAberto(false);
  }

  useEffect(() => {
    function atualizarScroll() {
      setRolouPagina(window.scrollY > 24);
    }

    atualizarScroll();

    window.addEventListener('scroll', atualizarScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener('scroll', atualizarScroll);
    };
  }, []);

  useEffect(() => {
    dialogRef.current?.close();
    setMenuAberto(false);
  }, [pathname]);

  useEffect(() => {
    const media = window.matchMedia(
      '(min-width: 1280px)',
    );

    function ajustarNavegacao() {
      if (media.matches) {
        dialogRef.current?.close();
        setMenuAberto(false);
      }
    }

    ajustarNavegacao();
    media.addEventListener('change', ajustarNavegacao);

    return () => {
      media.removeEventListener('change', ajustarNavegacao);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (!menuAberto) {
      if (dialog.open) dialog.close();
      return;
    }

    const overflowAnterior = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    if (!dialog.open) {
      dialog.showModal();
    }

    fecharRef.current?.focus();

    return () => {
      document.body.style.overflow = overflowAnterior;

      if (dialog.open) {
        dialog.close();
      }
    };
  }, [menuAberto]);

  useEffect(() => {
    const idiomasHtml: Record<Idioma, string> = {
      PT: 'pt-BR',
      EN: 'en',
      ES: 'es',
    };

    document.documentElement.lang = idiomasHtml[idioma];
  }, [idioma]);

  function classeLink(ativo: boolean) {
    return `inline-flex min-h-12 items-center rounded-xl px-3 text-sm font-medium transition-colors motion-reduce:transition-none ${FOCO} ${
      ativo
        ? 'bg-[#E3A144]/10 text-[#F4C77E]'
        : 'text-[#EDEDE3]/80 hover:bg-white/5 hover:text-white'
    }`;
  }

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-[100] border-b text-[#EDEDE3] transition-colors duration-300 motion-reduce:transition-none ${
          rolouPagina
            ? 'border-white/15 bg-[#08130F]/95 shadow-lg backdrop-blur-xl'
            : 'border-white/10 bg-[#08130F]/85 backdrop-blur-xl'
        }`}
      >
        <div className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between gap-3 px-4 sm:px-6 xl:px-8">
          <Link
            href="/"
            aria-label={t.home}
            onClick={fecharMenu}
            className={`flex min-w-0 items-center gap-2.5 rounded-xl xl:shrink-0 ${FOCO}`}
          >
            <LogoERN tamanho={48} prioridade />

            <span className="min-w-0 leading-none">
              <span
                className="block text-base font-medium text-[#F0F0E8] sm:text-lg"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Encantos
              </span>

              <span className="mt-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F4C77E]">
                Rio Negro
              </span>
            </span>
          </Link>

          <nav
            aria-label={t.navigation}
            className="hidden items-center gap-1 xl:flex"
          >
            {links.map((item) => {
              const ativo = rotaAtiva(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={ativo ? 'page' : undefined}
                  className={classeLink(ativo)}
                >
                  {item.titulo}
                </Link>
              );
            })}
          </nav>

          <div className="hidden shrink-0 items-center gap-2 xl:flex">
            <Link
              href="/operadores"
              aria-current={
                paginaOperadores ? 'page' : undefined
              }
              className={`${classeLink(paginaOperadores)} border border-white/15`}
            >
              {t.operators}
            </Link>

            <label className="relative">
              <span className="sr-only">{t.language}</span>

              <select
                value={idioma}
                onChange={(event) => {
                  const selecionado = idiomas.find(
                    (item) => item === event.target.value,
                  );

                  if (selecionado) {
                    setIdioma(selecionado);
                  }
                }}
                className={`min-h-12 rounded-xl border border-white/15 bg-[#0A1713] px-3 text-sm font-semibold text-[#EDEDE3] ${FOCO}`}
              >
                {idiomas.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <Link
              href="/#concierge"
              className={`inline-flex min-h-12 items-center justify-center rounded-xl bg-[#E3A144] px-4 text-sm font-bold text-[#07130F] transition-colors hover:bg-[#F0B35C] ${FOCO}`}
            >
              {t.plan}
            </Link>
          </div>

          <button
            type="button"
            aria-label={t.menu}
            aria-expanded={menuAberto}
            aria-controls="menu-publico-ern"
            aria-haspopup="dialog"
            onClick={() => setMenuAberto(true)}
            className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/5 text-[#EDEDE3] xl:hidden ${FOCO}`}
          >
            <IconeMenu />
          </button>
        </div>
      </header>

      <dialog
        ref={dialogRef}
        id="menu-publico-ern"
        aria-labelledby="titulo-menu-publico"
        className="menu-publico"
        onCancel={(event) => {
          event.preventDefault();
          fecharMenu();
        }}
        onClose={(event) => {
          // Evita que um evento de fechamento anterior
          // feche novamente um diálogo que já foi reaberto.
          if (!event.currentTarget.open) {
            setMenuAberto(false);
          }
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;

          const limites =
            event.currentTarget.getBoundingClientRect();

          if (
            event.clientX < limites.left ||
            event.clientX > limites.right ||
            event.clientY < limites.top ||
            event.clientY > limites.bottom
          ) {
            fecharMenu();
          }
        }}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div
            className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 pb-4"
            style={{
              paddingTop:
                'max(1rem, env(safe-area-inset-top, 0px))',
            }}
          >
            <div className="min-w-0">
              <h2
                id="titulo-menu-publico"
                className="text-lg font-semibold text-[#F0F0E8]"
              >
                {t.menu}
              </h2>

              <p className="mt-1 text-sm text-[#EDEDE3]/70">
                Encantos Rio Negro
              </p>
            </div>

            <button
              ref={fecharRef}
              type="button"
              aria-label={t.closeMenu}
              onClick={fecharMenu}
              className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/20 text-[#EDEDE3] hover:bg-white/5 ${FOCO}`}
            >
              <IconeMenu fechar />
            </button>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"
            style={{
              paddingBottom:
                'max(1.5rem, env(safe-area-inset-bottom, 0px))',
            }}
          >
            <nav
              aria-label={t.navigation}
              className="space-y-2"
            >
              {links.map((item) => {
                const ativo = rotaAtiva(
                  pathname,
                  item.href,
                );

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={fecharMenu}
                    aria-current={
                      ativo ? 'page' : undefined
                    }
                    className={`flex min-h-[52px] items-center justify-between gap-3 rounded-xl px-4 py-3 text-base font-medium ${FOCO} ${
                      ativo
                        ? 'bg-[#E3A144]/10 text-[#F4C77E]'
                        : 'text-[#EDEDE3] hover:bg-white/5'
                    }`}
                  >
                    <span>{item.titulo}</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                );
              })}
            </nav>

            <fieldset className="mt-6 min-w-0 border-t border-white/10 pt-4">
              <legend className="px-2 text-sm font-medium text-[#EDEDE3]/75">
                {t.language}
              </legend>

              <div className="grid grid-cols-3 gap-2">
                {idiomas.map((item) => {
                  const ativo = idioma === item;

                  return (
                    <button
                      key={item}
                      type="button"
                      aria-label={nomesIdiomas[item]}
                      aria-pressed={ativo}
                      onClick={() => setIdioma(item)}
                      className={`min-h-12 rounded-xl border px-2 text-sm font-semibold ${FOCO} ${
                        ativo
                          ? 'border-[#E3A144]/60 bg-[#E3A144]/10 text-[#F4C77E]'
                          : 'border-white/20 text-[#EDEDE3]/80 hover:bg-white/5'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
              <Link
                href="/operadores"
                onClick={fecharMenu}
                aria-current={
                  paginaOperadores ? 'page' : undefined
                }
                className={`flex min-h-[52px] items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${FOCO} ${
                  paginaOperadores
                    ? 'border-[#E3A144]/50 bg-[#E3A144]/10 text-[#F4C77E]'
                    : 'border-white/20 text-[#EDEDE3] hover:bg-white/5'
                }`}
              >
                <span>{t.operators}</span>
                <span aria-hidden="true">→</span>
              </Link>

              <Link
                href="/#concierge"
                onClick={fecharMenu}
                className={`flex min-h-[52px] items-center justify-center rounded-xl bg-[#E3A144] px-4 py-3 text-center text-sm font-bold text-[#07130F] hover:bg-[#F0B35C] ${FOCO}`}
              >
                {t.plan}
              </Link>
            </div>
          </div>
        </div>
      </dialog>

      <style jsx>{`
        .menu-publico {
          position: fixed;
          inset: 0 0 0 auto;
          box-sizing: border-box;
          width: min(92vw, 400px);
          max-width: none;
          height: 100vh;
          height: 100dvh;
          max-height: none;
          margin: 0;
          padding: 0;
          overflow: hidden;
          border: 0;
          border-left: 1px solid rgb(255 255 255 / 12%);
          background: #0a1713;
          color: #edede3;
          box-shadow: -20px 0 70px rgb(0 0 0 / 35%);
        }

        .menu-publico::backdrop {
          background: rgb(0 0 0 / 65%);
          backdrop-filter: blur(3px);
        }
      `}</style>
    </>
  );
}
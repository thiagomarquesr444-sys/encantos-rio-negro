'use client';


import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import SeletorIdiomaERN from '@/app/components/SeletorIdiomaERN';
import BandeiraIdiomaERN from '@/app/components/BandeiraIdiomaERN';
import LogoERN from '@/app/components/LogoERN';
import SeloAIEDA from '@/app/components/SeloAIEDA';
import IconeIara from '@/app/components/IconeIara';
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
    subs: ['Início, destaques e a Iara', 'Passeios publicados pelas operadoras', 'Os 62 municípios no mapa', 'Quem vive a Amazônia mostra a Amazônia'],
    tagline: 'Do Rio Negro ao Solimões',
    planSub: 'A Iara responde na hora',
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
    home: 'Encantos da Amazônia — início',
  },
  EN: {
    subs: ['Home, highlights and Iara', 'Tours published by local operators', 'All 62 towns on the map', 'Stories from people who live the Amazon'],
    tagline: 'From the Rio Negro to the Solimões',
    planSub: 'Iara answers right away',
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
    home: 'Encantos da Amazônia — home',
  },
  ES: {
    subs: ['Inicio, destacados e Iara', 'Paseos publicados por los operadores', 'Los 62 municipios en el mapa', 'Historias de quienes viven la Amazonía'],
    tagline: 'Del Río Negro al Solimões',
    planSub: 'Iara responde al instante',
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
    home: 'Encantos da Amazônia — inicio',
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

  // EDA_IARA_PONTE_V1: "Planejar viagem" abre a conversa com a Iara na hora.
  // Em páginas sem a Iara montada, o link segue para a Descubra, que já abre a conversa.
  function abrirIara(evento: { preventDefault: () => void }) {
    if (!document.getElementById('ern-conversa')) return;
    evento.preventDefault();
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('iara:abrir', { detail: {} })), 0);
  }

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
    // EDA_MENU_LETREIRO_V1: menu sem caixa, fonte condensada em maiúsculas;
    // o item ativo fica verde com sublinhado fino.
    return `eda-menu-link inline-flex items-center border-b-2 pb-1 transition-colors motion-reduce:transition-none ${FOCO} ${
      ativo
        ? 'border-[#47B087] text-[#47B087]'
        : 'border-transparent text-white hover:text-[#47B087]'
    }`;
  }

  return (
    <>
      {/* ERN_CABECALHO_RIO_NEGRO_V1: verde-noite translúcido, sem ilustrações.
          Na home, fica transparente sobre a abertura até a pessoa rolar. */}
      <header
        className={`ern-navegacao-ilustrada ern-publico-hero fixed inset-x-0 top-0 z-[100] border-b text-[#EDEDE3] transition-[background-color,box-shadow,border-color] duration-300 motion-reduce:transition-none ${
          rolouPagina
            ? 'border-white/10 bg-[#08130F]/95 shadow-[0_10px_30px_rgb(0_0_0/25%)] backdrop-blur-xl'
            : pathname === '/'
              ? 'border-white/10 bg-[#07110E]/25 backdrop-blur-[2px]'
              : 'border-white/10 bg-[#08130F]/95 backdrop-blur-xl'
        }`}
      >
        <div className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between gap-3 px-4 sm:px-6 xl:px-8">
          <Link
            href="/"
            aria-label={t.home}
            onClick={fecharMenu}
            className={`flex min-w-0 items-center gap-2.5 rounded-xl xl:shrink-0 ${FOCO}`}
          >
            <LogoERN tamanho={44} prioridade />

            <span className="min-w-0 leading-none">
              <span className="block text-lg font-semibold tracking-[-0.02em] text-[#F0F0E8] sm:text-xl">
                Encantos
              </span>

              <span className="mt-1 block text-[9.5px] font-semibold uppercase tracking-[0.24em] text-[#F0F0E8]">
                da Amazônia <SeloAIEDA />
              </span>
            </span>
          </Link>

          <nav
            aria-label={t.navigation}
            className="hidden items-center gap-8 xl:flex"
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
              className={`eda-menu-link inline-flex items-center gap-2 border-b-2 pb-1 transition-colors motion-reduce:transition-none ${FOCO} ${
                paginaOperadores
                  ? 'border-[#47B087] text-[#47B087]'
                  : 'border-transparent text-white hover:text-[#47B087]'
              }`}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21V8l9-5 9 5v13M9 21v-7h6v7" />
              </svg>
              {t.operators}
            </Link>

            <SeletorIdiomaERN idioma={idioma} aoMudar={setIdioma} rotulo={t.language} />

            <Link
              href="/#concierge"
              onClick={abrirIara}
              className={`ern-botao-ouro group inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#F7D595] to-[#E3A144] px-5 text-sm font-bold text-[#07130F] shadow-[0_10px_26px_rgb(227_161_68/35%),inset_0_1px_0_rgb(255_255_255/55%)] transition hover:brightness-105 ${FOCO}`}
            >
              {t.plan}
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none">→</span>
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
        className="menu-publico ern-publico-hero"
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
        {/* EDA_MENU_MOBILE_PREMIUM_V1: menu letreiro no celular — itens grandes em
            fonte condensada, numerados, com subtítulo; ativo em verde; Iara em destaque. */}
        <div className="mp-miolo flex h-full min-h-0 flex-col">
          <div
            className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3"
            style={{ paddingTop: 'max(1.1rem, env(safe-area-inset-top, 0px))' }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <LogoERN tamanho={38} />
              <div className="min-w-0 leading-tight">
                <h2 id="titulo-menu-publico" className="sr-only">{t.menu}</h2>
                <span className="flex items-center gap-1.5 text-[15px] font-semibold text-white">Encantos da Amazônia <SeloAIEDA /></span>
                <span className="mp-tag block text-[10.5px] uppercase tracking-[0.18em] text-[#F4C77E]">{t.tagline}</span>
              </div>
            </div>
            <button
              ref={fecharRef}
              type="button"
              aria-label={t.closeMenu}
              onClick={fecharMenu}
              className={`mp-fechar inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-[#EDEDE3] ${FOCO}`}
            >
              <IconeMenu fechar />
            </button>
          </div>
          <span aria-hidden="true" className="mx-5 block h-px shrink-0 bg-gradient-to-r from-[#E3A144]/70 via-white/10 to-transparent" />

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2">
            <nav aria-label={t.navigation}>
              <ol className="mp-lista">
                {links.map((item, i) => {
                  const ativo = rotaAtiva(pathname, item.href);
                  return (
                    <li key={item.href} style={{ animationDelay: `${90 + i * 55}ms` }}>
                      <Link
                        href={item.href}
                        onClick={fecharMenu}
                        aria-current={ativo ? 'page' : undefined}
                        data-ativo={ativo || undefined}
                        className={`mp-item group ${FOCO}`}
                      >
                        <span className="mp-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                        <span className="min-w-0 flex-1">
                          <span className="mp-nome">{item.titulo}</span>
                          <span className="mp-sub">{t.subs[i]}</span>
                        </span>
                        <span className="mp-seta" aria-hidden="true">→</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </nav>

            <Link
              href="/operadores"
              onClick={fecharMenu}
              aria-current={paginaOperadores ? 'page' : undefined}
              data-ativo={paginaOperadores || undefined}
              className={`mp-oper mt-4 flex min-h-[48px] items-center justify-between gap-3 rounded-2xl border px-4 text-sm font-semibold ${FOCO}`}
            >
              <span>{t.operators}</span>
              <span aria-hidden="true">→</span>
            </Link>

            <fieldset className="mt-5 min-w-0">
              <legend className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#8FA79A]">{t.language}</legend>
              <div className="mp-idiomas grid grid-cols-3 gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
                {idiomas.map((item) => {
                  const ativo = idioma === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      aria-label={nomesIdiomas[item]}
                      aria-pressed={ativo}
                      onClick={() => setIdioma(item)}
                      className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition-colors ${FOCO} ${
                        ativo ? 'bg-gradient-to-b from-[#F7D595] to-[#E3A144] text-[#07110E]' : 'text-[#EDEDE3]/80'
                      }`}
                    >
                      <BandeiraIdiomaERN idioma={item} />
                      {item}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <div
            className="shrink-0 border-t border-white/10 bg-[#07110E]/80 px-5 pt-4 backdrop-blur"
            style={{ paddingBottom: 'max(1.1rem, env(safe-area-inset-bottom, 0px))' }}
          >
            <Link
              href="/#concierge"
              onClick={(evento) => { fecharMenu(); abrirIara(evento); }}
              className={`mp-iara flex min-h-[60px] items-center gap-3 rounded-full bg-gradient-to-b from-[#F7D595] to-[#E3A144] py-2 pl-2 pr-5 text-[#07110E] shadow-[0_14px_32px_rgb(227_161_68/28%),inset_0_1px_0_rgb(255_255_255/55%)] ${FOCO}`}
            >
              <span aria-hidden="true" className="block h-11 w-11 shrink-0 overflow-hidden rounded-full shadow-[0_4px_12px_rgb(0_0_0/30%)]"><IconeIara /></span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-[15px] font-bold">{t.plan}</span>
                <span className="block text-[11.5px] font-medium text-[#07110E]/70">{t.planSub}</span>
              </span>
              <span aria-hidden="true" className="text-lg">→</span>
            </Link>
          </div>
        </div>
      </dialog>

      <style jsx>{`
        /* EDA: identidade amazonica */
        .ern-navegacao-ilustrada,
        .menu-publico {
          isolation: isolate;
        }

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

        .eda-menu-link {
          font-family: var(--font-bebas), 'Bebas Neue', Impact, sans-serif;
          font-size: 1.45rem;
          line-height: 1;
          letter-spacing: 0.01em;
          text-transform: uppercase;
        }

        .menu-publico {
          background:
            radial-gradient(120% 60% at 100% 0%, rgb(227 161 68 / 13%), transparent 60%),
            radial-gradient(90% 50% at 0% 100%, rgb(71 176 135 / 12%), transparent 65%),
            linear-gradient(180deg, #0b1914, #06100c);
          width: min(94vw, 420px);
        }
        .menu-publico[open] { animation: mp-entra .34s cubic-bezier(.2, .9, .3, 1) both; }
        @keyframes mp-entra { from { transform: translateX(28px); opacity: 0; } }
        .mp-lista { margin: 0; padding: 0; list-style: none; counter-reset: none; }
        .mp-lista > li { border-bottom: 1px solid rgb(255 255 255 / 7%); animation: mp-item .42s cubic-bezier(.2, .9, .3, 1) both; }
        @keyframes mp-item { from { opacity: 0; transform: translateX(18px); } }
        :global(.mp-item) { position: relative; display: flex; align-items: center; gap: 14px; min-height: 76px; padding: 12px 4px 12px 14px; color: #f5f3ea; }
        :global(.mp-item)::before { content: ''; position: absolute; left: 0; top: 18px; bottom: 18px; width: 3px; border-radius: 3px; background: transparent; transition: background .2s; }
        :global(.mp-item[data-ativo])::before { background: #47b087; box-shadow: 0 0 12px rgb(71 176 135 / 60%); }
        :global(.mp-num) { align-self: flex-start; margin-top: 6px; font-size: 11px; font-weight: 700; letter-spacing: .08em; color: #e3a144; font-variant-numeric: tabular-nums; }
        :global(.mp-nome) { display: block; font-family: var(--font-bebas), 'Bebas Neue', Impact, sans-serif; font-size: 2.15rem; line-height: .95; letter-spacing: .01em; text-transform: uppercase; transition: color .2s; }
        :global(.mp-item[data-ativo]) :global(.mp-nome) { color: #47b087; }
        :global(.mp-sub) { display: block; margin-top: 4px; font-size: 12px; line-height: 1.35; color: #8fa79a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        :global(.mp-seta) { flex: none; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 999px; border: 1px solid rgb(255 255 255 / 12%); font-size: 14px; color: #f4c77e; transition: transform .2s, background .2s; }
        :global(.mp-item:active) :global(.mp-seta), :global(.mp-item:hover) :global(.mp-seta) { transform: translateX(3px); background: rgb(227 161 68 / 15%); }
        :global(.mp-item[data-ativo]) :global(.mp-seta) { border-color: rgb(71 176 135 / 55%); color: #47b087; }
        :global(.mp-oper) { border-color: rgb(244 199 126 / 30%); background: rgb(244 199 126 / 6%); color: #f7d595; }
        :global(.mp-oper[data-ativo]) { border-color: #47b087; color: #47b087; }
        @media (prefers-reduced-motion: reduce) {
          .menu-publico[open], .mp-lista > li { animation: none; }
        }
        :global(html[data-eda-sinal='fraco']) .menu-publico[open],
        :global(html[data-eda-sinal='fraco']) .mp-lista > li { animation: none; }

        .menu-publico::backdrop {
          background: rgb(0 0 0 / 65%);
          backdrop-filter: blur(3px);
        }
      `}</style>
    </>
  );
}
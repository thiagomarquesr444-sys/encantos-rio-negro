'use client';

import { useEffect, useRef, useState } from 'react';

import PublicHeader from '@/app/components/PublicHeader';
import FeedDescubraERN from '@/app/components/FeedDescubraERN';
import CulturaAmazonicaERN from '@/app/components/CulturaAmazonicaERN';
import VitrineGestaoERN from '@/app/components/VitrineGestaoERN';
import { useLanguage } from '@/app/components/LanguageProvider';

import {
  homeTranslations,
  type HomeTranslation,
} from '@/lib/i18n/home';

const FOCO =
  'focus-visible:outline-2 focus-visible:outline-offset-4 ' +
  'focus-visible:outline-[#F4C77E]';

const avisosConcierge = {
  PT: {
    status: 'Em preparação',
    descricao:
      'Prévia do futuro concierge. O planejamento de viagens ainda não está disponível.',
    campo: 'Como você imagina sua viagem?',
    botao: 'Planejamento em breve',
    aviso:
      'Esta prévia não envia nem salva suas informações.',
  },
  EN: {
    status: 'Coming soon',
    descricao:
      'Preview of the future concierge. Trip planning is not available yet.',
    campo: 'How do you imagine your trip?',
    botao: 'Trip planning coming soon',
    aviso:
      'This preview does not send or save your information.',
  },
  ES: {
    status: 'En preparación',
    descricao:
      'Vista previa del futuro concierge. La planificación de viajes aún no está disponible.',
    campo: '¿Cómo imaginas tu viaje?',
    botao: 'Planificación próximamente',
    aviso:
      'Esta vista previa no envía ni guarda tu información.',
  },
};

function VideoHeroERN() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const movimentoReduzido = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    );

    let encerrado = false;
    let visivel = false;
    let emPausaProgramada = false;
    let bloqueado = false;
    let versao = 0;

    let tarefa: ReturnType<typeof setTimeout> | undefined;
    let tempoReproducao = 0;
    let inicioReproducao: number | null = null;

    function limparTarefa() {
      clearTimeout(tarefa);
      tarefa = undefined;
    }

    function podeReproduzir() {
      return (
        !encerrado &&
        !document.hidden &&
        visivel &&
        !movimentoReduzido.matches &&
        !bloqueado &&
        !emPausaProgramada
      );
    }

    function registrarTempo() {
      if (inicioReproducao !== null) {
        tempoReproducao += performance.now() - inicioReproducao;
        inicioReproducao = null;
      }
    }

    function pausar() {
      versao += 1;
      limparTarefa();
      registrarTempo();
      video?.pause();
    }

    function iniciarPausaProgramada() {
      pausar();
      emPausaProgramada = true;
      tempoReproducao = 0;

      tarefa = setTimeout(() => {
        tarefa = undefined;
        emPausaProgramada = false;
        sincronizar();
      }, 5000);
    }

    function aoReproduzir() {
      if (!podeReproduzir()) {
        video?.pause();
        return;
      }

      if (inicioReproducao === null) {
        inicioReproducao = performance.now();
      }

      limparTarefa();

      const restante = Math.max(0, 15000 - tempoReproducao);
      tarefa = setTimeout(iniciarPausaProgramada, restante);
    }

    function aoInterromper() {
      registrarTempo();

      if (!emPausaProgramada) {
        limparTarefa();
      }
    }

    function sincronizar() {
      if (encerrado || emPausaProgramada) return;

      if (!podeReproduzir()) {
        pausar();
        return;
      }

      if (tempoReproducao >= 15000) {
        iniciarPausaProgramada();
        return;
      }

      if (!video || !video.paused) return;

      const tentativa = ++versao;

      void video.play().then(
        () => {
          if (encerrado || tentativa !== versao) return;
          if (!podeReproduzir()) pausar();
        },
        () => {
          if (encerrado || tentativa !== versao) return;
          bloqueado = true;
          pausar();
        },
      );
    }

    function aoMudarPreferencia() {
      if (movimentoReduzido.matches) {
        pausar();
        emPausaProgramada = false;
        tempoReproducao = 0;
      } else {
        bloqueado = false;
        sincronizar();
      }
    }

    function aoMudarVisibilidade() {
      if (document.hidden) {
        pausar();
        emPausaProgramada = false;
      } else {
        sincronizar();
      }
    }

    const observador = new IntersectionObserver(
      ([entrada]) => {
        visivel = entrada?.isIntersecting ?? false;

        if (!visivel) {
          pausar();
          emPausaProgramada = false;
        } else {
          sincronizar();
        }
      },
      { threshold: 0 },
    );

    video.addEventListener('playing', aoReproduzir);
    video.addEventListener('waiting', aoInterromper);
    video.addEventListener('pause', aoInterromper);

    document.addEventListener(
      'visibilitychange',
      aoMudarVisibilidade,
    );

    movimentoReduzido.addEventListener(
      'change',
      aoMudarPreferencia,
    );

    observador.observe(video);

    return () => {
      encerrado = true;
      pausar();
      observador.disconnect();

      video.removeEventListener('playing', aoReproduzir);
      video.removeEventListener('waiting', aoInterromper);
      video.removeEventListener('pause', aoInterromper);

      document.removeEventListener(
        'visibilitychange',
        aoMudarVisibilidade,
      );

      movimentoReduzido.removeEventListener(
        'change',
        aoMudarPreferencia,
      );
    };
  }, []);

  return (
    <video
      ref={videoRef}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
      className="absolute inset-0 h-full w-full object-cover object-center"
    >
      <source
        src="/videos/serra-araca-hero.mp4"
        type="video/mp4"
      />
    </video>
  );
}

export default function Home() {
  const { idioma } = useLanguage();

  const [interesseSelecionado, setInteresseSelecionado] =
    useState<string>('');

  const t = homeTranslations[idioma] as HomeTranslation;
  const aviso = avisosConcierge[idioma];

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[#0B1512] text-[#EDEDE3]"
      style={{
        fontFamily: 'var(--font-work-sans), sans-serif',
      }}
    >
      <PublicHeader />

      <section className="ern-publico-hero ern-descubra-abertura relative overflow-hidden bg-[#07130F]">
        <VideoHeroERN />

        <div className="ern-descubra-contraste" aria-hidden="true" />



        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 top-24 h-[620px] w-[620px] opacity-25"
          viewBox="0 0 500 500"
          fill="none"
        >
          <path
            d="M530 30C400 90 450 160 330 210C210 260 270 330 160 380C80 420 100 470 10 520"
            stroke="#E3A144"
            strokeWidth="1"
          />
          <path
            d="M560 80C430 140 480 210 360 260C240 310 300 380 190 430C110 470 130 510 40 560"
            stroke="#E3A144"
            strokeWidth="1"
            opacity=".45"
          />
          <path
            d="M500 -20C370 40 420 110 300 160C180 210 240 280 130 330C50 370 70 420 -20 470"
            stroke="#7C9C87"
            strokeWidth="1"
            opacity=".65"
          />
        </svg>

        <div className="relative z-10 mx-auto flex min-h-0 max-w-[1280px] items-center px-5 pb-12 pt-28 md:px-8 md:pb-16 md:pt-32 lg:min-h-[clamp(560px,76svh,760px)]">
          <div className="grid w-full min-w-0 items-center gap-8 lg:grid-cols-[1.16fr_0.84fr] lg:gap-12">
            <div className="max-w-[680px]">
              <div className="mb-7 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-px w-8 bg-[#E3A144]"
                />
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E3A144]">
                  {t.hero.location}
                </span>
              </div>

              <h1
                className="max-w-[680px] text-[clamp(2.125rem,4.5vw,4rem)] font-medium leading-[1.08] tracking-[-0.035em] text-[#F0F0E8]"
                style={{
                  fontFamily: 'var(--font-fraunces), serif',
                }}
              >
                {t.hero.title}
              </h1>

              <p className="mt-8 max-w-[590px] text-base leading-7 text-[#EDEDE3] md:text-lg md:leading-8">
                {t.hero.description}
              </p>

              <p className="mt-4 max-w-[570px] text-sm leading-7 text-[#EDEDE3]">
                {t.hero.description2}
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href="#concierge"
                  className={`ern-portal-cta ern-portal-cta--principal ${FOCO}`}
                >
                  {t.hero.plan}
                </a>

                <a
                  href="/destinos"
                  className={`ern-portal-cta ern-portal-cta--secundario ${FOCO}`}
                >
                  {t.hero.explore}
                  <span aria-hidden="true">→</span>
                </a>
              </div>

              <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-xs text-[#EDEDE3]">
                {[
                  t.hero.localService,
                  t.hero.personalized,
                  t.hero.connectedOperators,
                ].map((texto) => (
                  <span key={texto} className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full bg-[#7C9C87]"
                    />
                    {texto}
                  </span>
                ))}
              </div>
            </div>

            <div
              id="concierge"
              className="relative mx-auto w-full min-w-0 max-w-[420px] scroll-mt-28 lg:mx-0 lg:ml-auto"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-6 rounded-[36px] bg-[#E3A144]/10 blur-3xl"
              />

              <div className="relative overflow-hidden rounded-[22px] border border-white/15 bg-[#0A1713]/82 shadow-2xl backdrop-blur-2xl">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      aria-hidden="true"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E3A144]/30 bg-[#E3A144]/10 text-base text-[#E3A144]"
                    >
                      ✦
                    </div>

                    <div>
                      <p
                        className="text-[15px] font-medium text-[#F0F0E8]"
                        style={{
                          fontFamily: 'var(--font-fraunces), serif',
                        }}
                      >
                        {t.concierge.title}
                      </p>

                      <p className="mt-0.5 text-xs text-[#F4C77E]">
                        {aviso.status}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-semibold uppercase tracking-wider text-[#EDEDE3]">
                    ERN
                  </span>
                </div>

                <div className="p-5">
                  <h2
                    className="text-[21px] leading-[1.2] text-[#F0F0E8]"
                    style={{
                      fontFamily: 'var(--font-fraunces), serif',
                    }}
                  >
                    {t.concierge.question}
                  </h2>

                  <p
                    id="concierge-disponibilidade"
                    className="mt-2.5 text-xs leading-5 text-[#EDEDE3]/75"
                  >
                    {aviso.descricao}
                  </p>

                  <div
                    role="group"
                    aria-label={t.concierge.question}
                    className="mt-5 grid gap-2 sm:grid-cols-2"
                  >
                    {t.interests.map((interesse) => {
                      const ativo =
                        interesseSelecionado === interesse.id;

                      return (
                        <button
                          key={interesse.id}
                          type="button"
                          aria-pressed={ativo}
                          onClick={() =>
                            setInteresseSelecionado(
                              ativo ? '' : interesse.id,
                            )
                          }
                          className={`flex min-h-[44px] items-center gap-2.5 rounded-xl border px-3 text-left text-xs transition ${FOCO} ${
                            ativo
                              ? 'border-[#E3A144] bg-[#E3A144]/10 text-[#F4C77E]'
                              : 'border-white/20 bg-white/[0.035] text-[#EDEDE3] hover:border-white/40 hover:bg-white/[0.06]'
                          }`}
                        >
                          <span aria-hidden="true" className="text-sm">
                            {interesse.emoji}
                          </span>
                          <span>{interesse.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4">
                    <label
                      htmlFor="concierge-previa"
                      className="mb-2 block text-xs font-medium text-[#EDEDE3]"
                    >
                      {aviso.campo}
                    </label>

                    <textarea
                      id="concierge-previa"
                      rows={2}
                      disabled
                      aria-describedby="concierge-disponibilidade concierge-privacidade"
                      placeholder={t.concierge.placeholder}
                      className="w-full resize-none rounded-xl border border-white/20 bg-[#07110E]/75 px-3.5 py-3 text-xs leading-5 text-[#EDEDE3] placeholder:text-[#B8C7BE] disabled:cursor-not-allowed disabled:opacity-100"
                    />
                  </div>

                  <button
                    type="button"
                    disabled
                    aria-describedby="concierge-disponibilidade"
                    className="mt-3 flex min-h-[46px] w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-[#E3A144] px-5 text-xs font-semibold text-[#0B1512]"
                  >
                    {aviso.botao}
                  </button>

                  <p
                    id="concierge-privacidade"
                    className="mt-3 text-center text-xs leading-5 text-[#EDEDE3]/75"
                  >
                    {aviso.aviso}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#EDEDE3] lg:flex"
        >
          <span>{t.hero.discover}</span>
          <span className="h-8 w-px bg-gradient-to-b from-white/60 to-transparent" />
        </div>
      </section>

      <CulturaAmazonicaERN />
      <FeedDescubraERN />

      <section
        id="descubra"
        className="scroll-mt-20 border-t border-white/[0.07] bg-[#0B1512] px-5 py-24 md:px-8 md:py-32"
      >
        <div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
              {t.discovery.eyebrow}
            </span>

            <h2
              className="mt-5 max-w-[430px] text-4xl leading-[1.05] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily: 'var(--font-fraunces), serif',
              }}
            >
              {t.discovery.title}
            </h2>
          </div>

          <div className="flex items-end">
            <p className="max-w-[600px] text-base leading-8 text-[#C8D6CD] md:text-lg">
              {t.discovery.description}
            </p>
          </div>
        </div>
      </section>

      <VitrineGestaoERN />

      <section
        id="experiencias"
        className="scroll-mt-20 border-t border-white/[0.07] bg-[#101C17] px-5 py-20 md:px-8"
      >
        <div className="mx-auto max-w-[1180px]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A9C9B4]">
            {t.experiences.eyebrow}
          </p>

          <h2
            className="mt-4 text-3xl text-[#EDEDE3] md:text-4xl"
            style={{
              fontFamily: 'var(--font-fraunces), serif',
            }}
          >
            {t.experiences.title}
          </h2>

          <p className="mt-4 max-w-xl text-sm leading-7 text-[#C8D6CD]">
            {t.experiences.description}
          </p>
        </div>
      </section>

      <section className="border-t border-white/[0.07] bg-[#0E1B16] px-5 py-24 md:px-8 md:py-28">
        <div className="mx-auto grid max-w-[1180px] gap-10 rounded-[28px] border border-white/[0.08] bg-[#0A1713] p-7 md:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
              {t.management.eyebrow}
            </span>

            <h2
              className="mt-5 max-w-[600px] text-4xl leading-[1.08] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily: 'var(--font-fraunces), serif',
              }}
            >
              {t.management.title}
            </h2>

            <p className="mt-6 max-w-[620px] text-base leading-8 text-[#C8D6CD]">
              {t.management.description}
            </p>

            <a
              href="/operadores"
              className={`mt-8 inline-flex min-h-[50px] items-center gap-2 rounded-xl border border-[#E3A144]/30 bg-[#E3A144]/10 px-6 text-sm font-semibold text-[#F4C77E] transition hover:bg-[#E3A144]/15 ${FOCO}`}
            >
              {t.management.button}
              <span aria-hidden="true">→</span>
            </a>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {t.management.modules.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-sm font-medium text-[#EDEDE3]"
              >
                <span
                  aria-hidden="true"
                  className="mr-2 text-[#E3A144]"
                >
                  ✦
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.07] bg-[#08110E] px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-3 text-xs text-[#EDEDE3]/75 sm:flex-row sm:items-center sm:justify-between">
          <span>{t.footer.left}</span>
          <span>{t.footer.right}</span>
          <a
            href="/contato"
            className={`inline-flex min-h-12 items-center rounded-lg px-2 font-semibold underline underline-offset-4 ${FOCO}`}
          >
            {idioma === 'EN'
              ? 'Support and privacy'
              : idioma === 'ES'
                ? 'Atención y privacidad'
                : 'Atendimento e privacidade'}
          </a>
        </div>
      </footer>
    </div>
  );
}
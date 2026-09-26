'use client';

import { useState } from 'react';

import PublicHeader from '@/app/components/PublicHeader';
import { useLanguage } from '@/app/components/LanguageProvider';

import {
  homeTranslations,
  type HomeTranslation,
} from '@/lib/i18n/home';

export default function Home() {
  const { idioma } = useLanguage();

  const [interesseSelecionado, setInteresseSelecionado] =
    useState<string>('');

  const t =
    homeTranslations[idioma] as HomeTranslation;

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[#0B1512] text-[#EDEDE3]"
      style={{
        fontFamily:
          'var(--font-work-sans), sans-serif',
      }}
    >
      <PublicHeader />

      {/* =========================================================
          HERO
      ========================================================== */}

      <section className="relative min-h-screen overflow-hidden bg-[#07130F]">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
        >
          <source
            src="/videos/serra-araca-hero.mp4"
            type="video/mp4"
          />
        </video>

        <div className="absolute inset-0 bg-[#07130F]/35" />

        <div className="absolute inset-0 bg-gradient-to-r from-[#08130F]/95 via-[#08130F]/70 to-[#08130F]/35" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1512] via-transparent to-[#0B1512]/25" />

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

        <div className="relative z-10 mx-auto flex min-h-screen max-w-[1280px] items-center px-5 pb-20 pt-32 md:px-8 md:pt-36">
          <div className="grid w-full items-center gap-12 lg:grid-cols-[1.16fr_0.84fr] lg:gap-16">
            <div className="max-w-[680px]">
              <div className="mb-7 flex items-center gap-3">
                <span className="h-px w-8 bg-[#E3A144]" />

                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E3A144]">
                  {t.hero.location}
                </span>
              </div>

              <h1
                className="max-w-[680px] text-[clamp(3rem,6vw,5.8rem)] font-medium leading-[0.98] tracking-[-0.035em] text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {t.hero.title}
              </h1>

              <p className="mt-8 max-w-[590px] text-base leading-7 text-[#EDEDE3]/80 md:text-lg md:leading-8">
                {t.hero.description}
              </p>

              <p className="mt-4 max-w-[570px] text-sm leading-7 text-[#EDEDE3]/52">
                {t.hero.description2}
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href="#concierge"
                  className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-[#E3A144] px-7 text-sm font-semibold text-[#0B1512] transition hover:-translate-y-0.5 hover:bg-[#F0B35C]"
                >
                  {t.hero.plan}
                </a>

                <a
                  href="#territorio"
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-7 text-sm font-medium text-[#EDEDE3] backdrop-blur transition hover:bg-white/[0.08]"
                >
                  {t.hero.explore}
                  <span aria-hidden="true">
                    →
                  </span>
                </a>
              </div>

              <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-xs text-[#EDEDE3]/55">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#7C9C87]" />
                  {t.hero.localService}
                </span>

                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#7C9C87]" />
                  {t.hero.personalized}
                </span>

                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#7C9C87]" />
                  {t.hero.connectedOperators}
                </span>
              </div>
            </div>

            {/* =================================================
                CONCIERGE
            ================================================== */}

            <div
              id="concierge"
              className="relative mx-auto mt-8 w-full max-w-[380px] scroll-mt-28 lg:mx-0 lg:ml-auto lg:mt-8"
            >
              <div className="absolute -inset-6 rounded-[36px] bg-[#E3A144]/10 blur-3xl" />

              <div className="relative overflow-hidden rounded-[22px] border border-white/15 bg-[#0A1713]/82 shadow-2xl backdrop-blur-2xl">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E3A144]/30 bg-[#E3A144]/10 text-base text-[#E3A144]">
                      ✦
                    </div>

                    <div>
                      <p
                        className="text-[15px] font-medium text-[#F0F0E8]"
                        style={{
                          fontFamily:
                            'var(--font-fraunces), serif',
                        }}
                      >
                        {t.concierge.title}
                      </p>

                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[#EDEDE3]/45">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        {t.concierge.status}
                      </div>
                    </div>
                  </div>

                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-[#EDEDE3]/40">
                    ERN
                  </span>
                </div>

                <div className="p-5">
                  <p
                    className="text-[21px] leading-[1.2] text-[#F0F0E8]"
                    style={{
                      fontFamily:
                        'var(--font-fraunces), serif',
                    }}
                  >
                    {t.concierge.question}
                  </p>

                  <p className="mt-2.5 text-xs leading-5 text-[#EDEDE3]/50">
                    {t.concierge.description}
                  </p>

                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {t.interests.map(
                      (interesse) => {
                        const ativo =
                          interesseSelecionado ===
                          interesse.id;

                        return (
                          <button
                            key={interesse.id}
                            type="button"
                            onClick={() =>
                              setInteresseSelecionado(
                                interesse.id
                              )
                            }
                            className={`flex min-h-[44px] items-center gap-2.5 rounded-xl border px-3 text-left text-xs transition ${
                              ativo
                                ? 'border-[#E3A144]/70 bg-[#E3A144]/10 text-[#F4C77E]'
                                : 'border-white/10 bg-white/[0.035] text-[#EDEDE3]/70 hover:border-white/20 hover:bg-white/[0.06]'
                            }`}
                          >
                            <span className="text-sm">
                              {interesse.emoji}
                            </span>

                            <span>
                              {interesse.label}
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>

                  <div className="mt-4">
                    <textarea
                      rows={2}
                      placeholder={
                        t.concierge.placeholder
                      }
                      className="w-full resize-none rounded-xl border border-white/10 bg-[#07110E]/75 px-3.5 py-3 text-xs leading-5 text-[#EDEDE3] outline-none transition placeholder:text-[#EDEDE3]/25 focus:border-[#E3A144]/45"
                    />
                  </div>

                  <button
                    type="button"
                    className="mt-3 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#E3A144] px-5 text-xs font-semibold text-[#0B1512] transition hover:bg-[#F0B35C]"
                  >
                    {t.concierge.button}
                    <span aria-hidden="true">
                      →
                    </span>
                  </button>

                  <p className="mt-3 text-center text-[10px] leading-4 text-[#EDEDE3]/30">
                    {t.concierge.disclaimer}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-7 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/35 md:flex">
          <span>{t.hero.discover}</span>

          <span className="h-8 w-px bg-gradient-to-b from-white/40 to-transparent" />
        </div>
      </section>

      {/* =========================================================
          DESCOBRINDO O TERRITÓRIO
      ========================================================== */}

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
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              {t.discovery.title}
            </h2>
          </div>

          <div className="flex items-end">
            <p className="max-w-[600px] text-base leading-8 text-[#EDEDE3]/60 md:text-lg">
              {t.discovery.description}
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================
          TERRITÓRIO
      ========================================================== */}

      <section
        id="territorio"
        className="scroll-mt-20 border-t border-white/[0.07] bg-[#0D1814] px-5 py-24 md:px-8 md:py-32"
      >
        <div className="mx-auto max-w-[1180px]">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E3A144]">
                {t.territory.eyebrow}
              </span>

              <h2
                className="mt-5 max-w-[560px] text-4xl leading-[1.05] text-[#F0F0E8] md:text-5xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {t.territory.title}
              </h2>
            </div>

            <div>
              <p className="max-w-[620px] text-base leading-8 text-[#EDEDE3]/60 md:text-lg">
                {t.territory.description}
              </p>
            </div>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {t.territories.map(
              (territorio) => (
                <article
                  key={territorio.id}
                  className="group relative min-h-[430px] overflow-hidden rounded-[24px] border border-white/10 bg-[#0A1713]"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{
                      backgroundImage: `url('${territorio.imagem}')`,
                    }}
                  />

                  <div className="absolute inset-0 bg-gradient-to-br from-[#173025]/65 via-transparent to-[#08110E]/45" />

                  <div className="absolute inset-0 bg-gradient-to-t from-[#07110E] via-[#07110E]/45 to-[#07110E]/5" />

                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                      {territorio.local}
                    </span>

                    <h3
                      className="mt-2 text-2xl leading-tight text-[#F0F0E8]"
                      style={{
                        fontFamily:
                          'var(--font-fraunces), serif',
                      }}
                    >
                      {territorio.titulo}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-[#EDEDE3]/65">
                      {territorio.descricao}
                    </p>

                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#E3A144] transition group-hover:gap-3">
                      {territorio.acao}
                      <span aria-hidden="true">
                        →
                      </span>
                    </span>
                  </div>
                </article>
              )
            )}
          </div>

          <div className="mt-14 flex flex-col gap-5 rounded-[24px] border border-[#E3A144]/20 bg-[#111F19] px-6 py-7 md:flex-row md:items-center md:justify-between md:px-8">
            <div>
              <p
                className="text-2xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {t.territory.unsure}
              </p>

              <p className="mt-2 max-w-[680px] text-sm leading-6 text-[#EDEDE3]/55">
                {t.territory.unsureDescription}
              </p>
            </div>

            <a
              href="#concierge"
              className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-xl bg-[#E3A144] px-6 text-sm font-semibold text-[#0B1512] transition hover:bg-[#F0B35C]"
            >
              {t.territory.conciergeButton}
            </a>
          </div>
        </div>
      </section>

      {/* =========================================================
          EXPERIÊNCIAS
      ========================================================== */}

      <section
        id="experiencias"
        className="scroll-mt-20 border-t border-white/[0.07] bg-[#101C17] px-5 py-20 md:px-8"
      >
        <div className="mx-auto max-w-[1180px]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7C9C87]">
            {t.experiences.eyebrow}
          </p>

          <h2
            className="mt-4 text-3xl text-[#EDEDE3] md:text-4xl"
            style={{
              fontFamily:
                'var(--font-fraunces), serif',
            }}
          >
            {t.experiences.title}
          </h2>

          <p className="mt-4 max-w-xl text-sm leading-7 text-[#EDEDE3]/55">
            {t.experiences.description}
          </p>
        </div>
      </section>

      {/* =========================================================
          REDE
      ========================================================== */}

      <section
        id="rede"
        className="scroll-mt-20 border-t border-white/[0.07] bg-[#0B1512] px-5 py-20 md:px-8"
      >
        <div className="mx-auto max-w-[1180px]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7C9C87]">
            {t.network.eyebrow}
          </p>

          <h2
            className="mt-4 text-3xl text-[#EDEDE3] md:text-4xl"
            style={{
              fontFamily:
                'var(--font-fraunces), serif',
            }}
          >
            {t.network.title}
          </h2>

          <p className="mt-4 max-w-[620px] text-sm leading-7 text-[#EDEDE3]/55">
            {t.network.description}
          </p>
        </div>
      </section>

      {/* =========================================================
          ERN GESTÃO
      ========================================================== */}

      <section className="border-t border-white/[0.07] bg-[#0E1B16] px-5 py-24 md:px-8 md:py-28">
        <div className="mx-auto grid max-w-[1180px] gap-10 rounded-[28px] border border-white/[0.08] bg-[#0A1713] p-7 md:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
              {t.management.eyebrow}
            </span>

            <h2
              className="mt-5 max-w-[600px] text-4xl leading-[1.08] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              {t.management.title}
            </h2>

            <p className="mt-6 max-w-[620px] text-base leading-8 text-[#EDEDE3]/60">
              {t.management.description}
            </p>

            <a
              href="/operadores"
              className="mt-8 inline-flex min-h-[50px] items-center gap-2 rounded-xl border border-[#E3A144]/30 bg-[#E3A144]/10 px-6 text-sm font-semibold text-[#F4C77E] transition hover:bg-[#E3A144]/15"
            >
              {t.management.button}
              <span>→</span>
            </a>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {t.management.modules.map(
              (item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-sm font-medium text-[#EDEDE3]/65"
                >
                  <span className="mr-2 text-[#E3A144]">
                    ✦
                  </span>

                  {item}
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* =========================================================
          FOOTER
      ========================================================== */}

      <footer className="border-t border-white/[0.07] bg-[#08110E] px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-3 text-xs text-[#EDEDE3]/35 sm:flex-row sm:items-center sm:justify-between">
          <span>{t.footer.left}</span>
          <span>{t.footer.right}</span>
        </div>
      </footer>
    </div>
  );
}
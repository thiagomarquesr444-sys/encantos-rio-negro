'use client';

import { useState } from 'react';

import PublicHeader from '@/app/components/PublicHeader';
import ConciergePublicoERN from '@/app/components/ConciergePublicoERN';
import FeedDescubraERN from '@/app/components/FeedDescubraERN';
import CulturaAmazonicaERN from '@/app/components/CulturaAmazonicaERN';
import VitrineGestaoERN from '@/app/components/VitrineGestaoERN';
import VideoFundoAberturaERN from '@/app/components/VideoFundoAberturaERN';
import HeroImersivoERN from '@/app/components/HeroImersivoERN';
import VitrineDestinosERN from '@/app/components/VitrineDestinosERN';
import { useLanguage } from '@/app/components/LanguageProvider';

import {
  homeTranslations,
  type HomeTranslation,
} from '@/lib/i18n/home';

// ERN_PORTAL_V2
// Abertura imersiva com paisagem local (Serra do Aracá), busca de destinos,
// Concierge sobre a mesma paisagem e vitrine de destinos por região.

const FOCO =
  'focus-visible:outline-2 focus-visible:outline-offset-4 ' +
  'focus-visible:outline-[#F4C77E]';

const faixaOperador = {
  PT: { destaque: 'Trabalha com turismo no Rio Negro?', texto: 'Organize reservas, vouchers e o financeiro da sua operação e apareça para quem procura o território.', link: 'Conhecer a ERN para operadores', precos: 'Ver planos e preços' },
  EN: { destaque: 'Do you work in tourism on the Rio Negro?', texto: 'Organize bookings, vouchers and finances, and be found by people looking for the region.', link: 'ERN for operators', precos: 'See plans and pricing' },
  ES: { destaque: '¿Trabajas con turismo en el Río Negro?', texto: 'Organiza reservas, vouchers y finanzas, y aparece para quienes buscan el territorio.', link: 'ERN para operadores', precos: 'Ver planes y precios' },
};

export default function Home() {
  const { idioma } = useLanguage();
  const t = homeTranslations[idioma] as HomeTranslation;
  const faixa = faixaOperador[idioma];
  const [busca, setBusca] = useState('');

  function buscarDestino(texto: string) {
    setBusca(texto);
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const alvo = () => document.getElementById('destinos');

    // Espera a vitrine aplicar o filtro antes de rolar.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        alvo()?.scrollIntoView({ behavior: reduzido ? 'auto' : 'smooth', block: 'start' });
      });
    });

    // Garante a chegada aos resultados se a rolagem suave for interrompida.
    window.setTimeout(() => {
      const secao = alvo();
      if (secao && Math.abs(secao.getBoundingClientRect().top) > 160) {
        secao.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }, 1200);
  }

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[#07110E] text-[#EDEDE3]"
      style={{
        fontFamily: 'var(--font-work-sans), sans-serif',
      }}
    >
      <PublicHeader />

      <section className="ern-publico-hero relative overflow-hidden bg-[#07110E]">
        <VideoFundoAberturaERN />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgb(7 17 14 / 62%) 0%, rgb(7 17 14 / 58%) 38%, rgb(7 17 14 / 88%) 72%, #07110E 100%)',
          }}
        />

        <HeroImersivoERN onBuscar={buscarDestino} />

        <div
          id="concierge"
          className="relative z-10 mx-auto grid max-w-[1180px] scroll-mt-28 items-center gap-10 px-5 pb-20 md:px-8 lg:grid-cols-[1fr_420px] lg:gap-16 lg:pb-24"
        >
          <div className="max-w-[520px]">
            <h2
              className="text-[clamp(1.875rem,3.4vw,2.75rem)] leading-[1.1] tracking-[-0.03em] text-[#F0F0E8]"
              style={{ fontFamily: 'var(--font-fraunces), serif' }}
            >
              {t.territory.unsure}
            </h2>
            <p className="mt-5 text-base leading-7 text-[#D6DFD9]">
              {t.territory.unsureDescription}
            </p>
          </div>
          <div className="w-full min-w-0">
            <ConciergePublicoERN />
          </div>
        </div>

        <div className="relative z-10 border-t border-[#355043] bg-[#07110E]/90">
          <div className="mx-auto flex max-w-[1180px] flex-col gap-3 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-8">
            <p className="text-sm leading-6 text-[#EDEDE3]">
              <strong className="font-semibold text-[#F4C77E]">{faixa.destaque}</strong>{' '}
              {faixa.texto}
            </p>
            <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-1">
              <a
                href="/precos"
                className={`inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-[#F4C77E] hover:underline hover:underline-offset-4 ${FOCO}`}
              >
                {faixa.precos} <span aria-hidden="true">→</span>
              </a>
              <a
                href="/operadores"
                className={`inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-[#EDEDE3] hover:underline hover:underline-offset-4 ${FOCO}`}
              >
                {faixa.link}
              </a>
            </div>
          </div>
        </div>
      </section>

      <VitrineDestinosERN busca={busca} onLimparBusca={() => setBusca('')} />

      <FeedDescubraERN />

      <CulturaAmazonicaERN />

      <VitrineGestaoERN />

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
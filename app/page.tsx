'use client';

import { useState } from 'react';

import PublicHeader from '@/app/components/PublicHeader';
import ConciergePublicoERN from '@/app/components/ConciergePublicoERN';
import FeedDescubraERN from '@/app/components/FeedDescubraERN';
import CulturaAmazonicaERN from '@/app/components/CulturaAmazonicaERN';
import PreviaGestaoEDA from '@/app/components/PreviaGestaoEDA';
import RodapePublicoEDA from '@/app/components/RodapePublicoEDA';
import HeroImersivoERN from '@/app/components/HeroImersivoERN';
import VitrineDestinosERN from '@/app/components/VitrineDestinosERN';
import IconeIara from '@/app/components/IconeIara';
import { useLanguage } from '@/app/components/LanguageProvider';

import {
  homeTranslations,
  type HomeTranslation,
} from '@/lib/i18n/home';

// ERN_PORTAL_V2
// Abertura imersiva com paisagem local (Serra do Aracá), busca de destinos,
// Concierge sobre a mesma paisagem e vitrine de destinos por região.

const conciergeCta = {
  PT: 'Conversar com a Iara',
  EN: 'Talk to Iara',
  ES: 'Hablar con Iara',
} as const;

const FOCO =
  'focus-visible:outline-2 focus-visible:outline-offset-4 ' +
  'focus-visible:outline-[#F4C77E]';

const faixaOperador = {
  PT: { destaque: 'Trabalha com turismo no Rio Negro?', texto: 'Organize reservas, vouchers e o financeiro da sua operação e apareça para quem procura o território.', link: 'Conhecer a EDA para operadores', precos: 'Ver planos e preços' },
  EN: { destaque: 'Do you work in tourism on the Rio Negro?', texto: 'Organize bookings, vouchers and finances, and be found by people looking for the region.', link: 'EDA for operators', precos: 'See plans and pricing' },
  ES: { destaque: '¿Trabajas con turismo en el Río Negro?', texto: 'Organiza reservas, vouchers y finanzas, y aparece para quienes buscan el territorio.', link: 'EDA para operadores', precos: 'Ver planes y precios' },
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
        {/* ERN_FUNDO_ENCONTRO_AGUAS_V1: Encontro das Águas (Canva), 1920×1080 no
            computador e versão vertical no celular. */}
        <picture>
          <source media="(min-width: 768px)" srcSet="/images/fundo/encontro-das-aguas-1920.jpg" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/fundo/encontro-das-aguas-celular.jpg"
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            decoding="async"
            className="ern-fundo-respira absolute inset-0 h-full w-full object-cover object-[50%_35%]"
          />
        </picture>
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 32%, rgb(3 16 11 / 62%), rgb(3 16 11 / 25%) 60%, rgb(3 16 11 / 10%) 80%), linear-gradient(180deg, rgb(3 16 11 / 55%) 0%, rgb(3 16 11 / 25%) 30%, rgb(7 17 14 / 70%) 70%, #07110E 100%)',
          }}
        />

        <HeroImersivoERN onBuscar={buscarDestino} onFiltrar={setBusca} />

        <div
          id="concierge"
          className="relative z-10 mx-auto flex max-w-[1180px] scroll-mt-28 flex-col items-start gap-8 px-5 pb-20 md:px-8 lg:flex-row lg:items-center lg:justify-between lg:pb-24"
        >
          <div className="max-w-[560px]">
            <h2 className="text-[clamp(1.875rem,3.4vw,2.75rem)] leading-[1.1] tracking-[-0.03em] text-[#F5F3EA]">
              {t.territory.unsure}
            </h2>
            <p className="mt-5 text-base leading-7 text-[#DBE3DE]">
              {t.territory.unsureDescription}
            </p>
          </div>
          {/* ERN_CONCIERGE_LATERAL_V1: o Concierge abre no painel lateral direito
              (botão flutuante EDA, que continua podendo ser arrastado). */}
          <a
            href="#concierge"
            className={`group inline-flex min-h-[54px] shrink-0 items-center gap-3 rounded-full bg-gradient-to-b from-[#F7D595] to-[#E3A144] py-2 pl-2 pr-6 text-sm font-bold text-[#07110E] shadow-[0_14px_32px_rgb(227_161_68/30%),inset_0_1px_0_rgb(255_255_255/55%)] transition hover:brightness-105 ${FOCO}`}
          >
            <span aria-hidden="true" className="block h-10 w-10 overflow-hidden rounded-full shadow-[0_4px_12px_rgb(0_0_0/35%)]"><IconeIara /></span>
            {conciergeCta[idioma]}
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none">→</span>
          </a>
          <ConciergePublicoERN />
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

      <section id="vitrine-gestao" className="ern-publico-hero relative scroll-mt-28 overflow-hidden border-t border-white/[0.07] bg-[#07110E] px-5 py-24 md:px-8 md:py-28">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_10%,rgb(227_161_68/10%),transparent_55%),radial-gradient(ellipse_at_10%_90%,rgb(71_176_135/8%),transparent_50%)]" />
        <div className="relative mx-auto grid max-w-[1180px] gap-12 rounded-[28px] border border-white/[0.08] bg-gradient-to-br from-[#0E1F19] to-[#08130F] p-7 shadow-[0_30px_80px_rgb(0_0_0/30%),inset_0_1px_0_rgb(255_255_255/5%)] md:p-12 lg:grid-cols-[1fr_1.05fr] lg:items-center">
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

            <ul className="mt-8 flex flex-wrap gap-2">
              {t.management.modules.map((item) => (
                <li
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-[#DBE3DE]"
                >
                  <span aria-hidden="true" className="text-[#E3A144]">✦</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <PreviaGestaoEDA />
        </div>
      </section>

      <RodapePublicoEDA />
    </div>
  );
}
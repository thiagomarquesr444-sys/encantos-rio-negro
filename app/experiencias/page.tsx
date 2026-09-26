'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

import PublicHeader from '@/app/components/PublicHeader';

import { useLanguage } from '@/app/components/LanguageProvider';

import {
  experienciasTranslations,
  type ExperienciasTranslation,
} from '@/lib/i18n/experiencias';

type Categoria =
  | 'todas'
  | 'pesca'
  | 'natureza'
  | 'cultura'
  | 'navegacao'
  | 'hospedagem'
  | 'gastronomia';

type ExperienciaBase = {
  id: string;
  categoria: Categoria;
  imagem: string;
  grande?: boolean;
};

const experienciasBase: ExperienciaBase[] = [
  {
    id: 'pesca-esportiva',
    categoria: 'pesca',
    imagem: '/images/experiencias/pesca-esportiva.jpg',
    grande: true,
  },
  {
    id: 'navegacao-rio-negro',
    categoria: 'navegacao',
    imagem: '/images/experiencias/navegacao.jpg',
  },
  {
    id: 'anavilhanas',
    categoria: 'natureza',
    imagem: '/images/anavilhanas-aereo.jpg',
  },
  {
    id: 'jau',
    categoria: 'natureza',
    imagem: '/images/jau-arvore-monumental.jpg',
  },
  {
    id: 'cultura-ribeirinha',
    categoria: 'cultura',
    imagem: '/images/experiencias/cultura-ribeirinha.jpg',
  },
  {
    id: 'festival-ornamental',
    categoria: 'cultura',
    imagem: '/images/festival-peixe-ornamental.jpg',
  },
  {
    id: 'festival-peixe-boi',
    categoria: 'cultura',
    imagem: '/images/festival-peixe-boi.jpg',
  },
  {
    id: 'hospedagem',
    categoria: 'hospedagem',
    imagem: '/images/experiencias/hospedagem.jpg',
  },
  {
    id: 'gastronomia',
    categoria: 'gastronomia',
    imagem: '/images/experiencias/gastronomia.jpg',
  },
];



export default function ExperienciasPage() {
  const { idioma } = useLanguage();

  const [categoriaAtiva, setCategoriaAtiva] =
    useState<Categoria>('todas');

  const t =
    experienciasTranslations[
      idioma
    ] as ExperienciasTranslation;

  const experiencias = useMemo(() => {
    return experienciasBase.map((experiencia) => {
      const conteudo =
        t.experiences[
          experiencia.id as keyof typeof t.experiences
        ];

      return {
        ...experiencia,
        ...conteudo,
      };
    });
  }, [t]);

  const filtradas = useMemo(() => {
    if (categoriaAtiva === 'todas') {
      return experiencias;
    }

    return experiencias.filter(
      (experiencia) =>
        experiencia.categoria === categoriaAtiva
    );
  }, [categoriaAtiva, experiencias]);

  const categorias: {
    id: Categoria;
    label: string;
  }[] = [
    {
      id: 'todas',
      label: t.filters.todas,
    },
    {
      id: 'pesca',
      label: t.filters.pesca,
    },
    {
      id: 'natureza',
      label: t.filters.natureza,
    },
    {
      id: 'cultura',
      label: t.filters.cultura,
    },
    {
      id: 'navegacao',
      label: t.filters.navegacao,
    },
    {
      id: 'hospedagem',
      label: t.filters.hospedagem,
    },
    {
      id: 'gastronomia',
      label: t.filters.gastronomia,
    },
  ];

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

      <section className="relative min-h-[86vh] overflow-hidden border-b border-white/[0.07] bg-[#07130F]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('/images/experiencias/experiencias-hero.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#06100D]/96 via-[#06100D]/70 to-[#06100D]/30" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1512] via-transparent to-[#07130F]/30" />

        <div className="relative z-10 mx-auto flex min-h-[86vh] max-w-[1280px] items-end px-5 pb-20 pt-36 md:px-8 md:pb-24">
          <div className="grid w-full gap-12 lg:grid-cols-[1fr_0.72fr] lg:items-end">
            <div>
              <div className="flex items-center gap-3">
                <span className="h-px w-9 bg-[#E3A144]" />

                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[#E3A144]">
                  {t.hero.eyebrow}
                </span>
              </div>

              <h1
                className="mt-7 max-w-[840px] text-[clamp(3.4rem,7vw,7rem)] font-medium leading-[0.92] tracking-[-0.045em] text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {t.hero.title}
              </h1>

              <p className="mt-8 max-w-[690px] text-base leading-8 text-[#EDEDE3]/68 md:text-lg">
                {t.hero.description}
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#explorar"
                  className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-[#E3A144] px-7 text-sm font-bold text-[#07130F] transition hover:-translate-y-0.5 hover:bg-[#F0B35C]"
                >
                  {t.hero.explore}
                </a>

                <Link
                  href="/#concierge"
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-7 text-sm font-semibold text-[#EDEDE3] backdrop-blur transition hover:bg-white/[0.08]"
                >
                  {t.hero.plan}
                  <span>→</span>
                </Link>
              </div>
            </div>

            <div className="max-w-[430px] lg:ml-auto">
              <div className="border-l border-[#E3A144]/35 pl-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                  {t.hero.sideEyebrow}
                </p>

                <p
                  className="mt-4 text-2xl leading-[1.25] text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  {t.hero.sideTitle}
                </p>

                <p className="mt-4 text-sm leading-7 text-[#EDEDE3]/48">
                  {t.hero.sideDescription}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          FILTROS
      ========================================================== */}

      <section className="sticky top-[76px] z-30 border-b border-white/[0.07] bg-[#0A1713]/95 px-5 py-4 backdrop-blur-xl md:px-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs text-[#EDEDE3]/38">
            {t.filters.label}
          </p>

          <div className="flex flex-wrap gap-2">
            {categorias.map((categoria) => {
              const ativa =
                categoriaAtiva === categoria.id;

              return (
                <button
                  key={categoria.id}
                  type="button"
                  onClick={() =>
                    setCategoriaAtiva(
                      categoria.id
                    )
                  }
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                    ativa
                      ? 'border-[#E3A144]/45 bg-[#E3A144]/12 text-[#F4C77E]'
                      : 'border-white/10 bg-white/[0.025] text-[#EDEDE3]/50 hover:border-white/20 hover:text-[#EDEDE3]/75'
                  }`}
                >
                  {categoria.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          INTRODUÇÃO
      ========================================================== */}

      <section
        id="explorar"
        className="scroll-mt-36 bg-[#0B1512] px-5 py-24 md:px-8 md:py-32"
      >
        <div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-24">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7C9C87]">
              {t.intro.eyebrow}
            </span>

            <h2
              className="mt-5 max-w-[500px] text-4xl leading-[1.05] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              {t.intro.title}
            </h2>
          </div>

          <div>
            <p className="max-w-[650px] text-base leading-8 text-[#EDEDE3]/60 md:text-lg">
              {t.intro.paragraph1}
            </p>

            <p className="mt-5 max-w-[650px] text-sm leading-7 text-[#EDEDE3]/42">
              {t.intro.paragraph2}
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================
          EXPERIÊNCIAS
      ========================================================== */}

      <section className="bg-[#0D1814] px-5 pb-24 md:px-8 md:pb-32">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtradas.map((experiencia) => (
              <article
                key={experiencia.id}
                className={`group relative overflow-hidden rounded-[26px] border border-white/[0.09] bg-[#07110E] ${
                  experiencia.grande
                    ? 'min-h-[540px] md:col-span-2 xl:col-span-2'
                    : 'min-h-[430px]'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#173025] via-[#0D1B16] to-[#07110E]" />

                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-[900ms] group-hover:scale-[1.035]"
                  style={{
                    backgroundImage: `url('${experiencia.imagem}')`,
                  }}
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#06100D] via-[#06100D]/50 to-[#06100D]/5" />

                <div className="absolute left-5 top-5">
                  <span className="rounded-full border border-white/15 bg-[#07110E]/65 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#EDEDE3]/75 backdrop-blur-md">
                    {experiencia.selo}
                  </span>
                </div>

                <div className="absolute inset-x-0 bottom-0 p-6 md:p-7">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                    {experiencia.local}
                  </p>

                  <h3
                    className={`mt-2 leading-[1.03] text-[#F0F0E8] ${
                      experiencia.grande
                        ? 'text-4xl md:text-5xl'
                        : 'text-3xl'
                    }`}
                    style={{
                      fontFamily:
                        'var(--font-fraunces), serif',
                    }}
                  >
                    {experiencia.titulo}
                  </h3>

                  <p
                    className={`mt-4 leading-7 text-[#EDEDE3]/60 ${
                      experiencia.grande
                        ? 'max-w-[660px] text-base'
                        : 'max-w-[480px] text-sm'
                    }`}
                  >
                    {experiencia.descricao}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-4">
                    <span className="text-xs text-[#EDEDE3]/35">
                      {experiencia.destaque}
                    </span>

                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#E3A144] transition group-hover:gap-3">
                      {t.more}
                      <span>→</span>
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          PERFIL DO VISITANTE
      ========================================================== */}

      <section className="border-y border-white/[0.07] bg-[#101D17] px-5 py-24 md:px-8 md:py-32">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                {t.profiles.eyebrow}
              </span>

              <h2
                className="mt-5 max-w-[520px] text-4xl leading-[1.05] text-[#F0F0E8] md:text-5xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {t.profiles.title}
              </h2>

              <p className="mt-6 max-w-[520px] text-sm leading-7 text-[#EDEDE3]/50">
                {t.profiles.description}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {t.profiles.items.map(
                (perfil, index) => (
                  <article
                    key={perfil.titulo}
                    className="rounded-[24px] border border-white/[0.08] bg-[#0A1713] p-6"
                  >
                    <span className="text-[10px] font-semibold text-[#E3A144]">
                      {String(index + 1).padStart(
                        2,
                        '0'
                      )}
                    </span>

                    <h3
                      className="mt-5 text-2xl text-[#F0F0E8]"
                      style={{
                        fontFamily:
                          'var(--font-fraunces), serif',
                      }}
                    >
                      {perfil.titulo}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-[#EDEDE3]/50">
                      {perfil.texto}
                    </p>
                  </article>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          CONEXÃO
      ========================================================== */}

      <section className="bg-[#0B1512] px-5 py-24 md:px-8 md:py-32">
        <div className="mx-auto max-w-[1180px] overflow-hidden rounded-[30px] border border-[#E3A144]/18 bg-[#0D1B16]">
          <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
            <div className="p-7 md:p-10 lg:p-12">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                {t.connection.eyebrow}
              </span>

              <h2
                className="mt-5 max-w-[610px] text-4xl leading-[1.05] text-[#F0F0E8] md:text-5xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {t.connection.title}
              </h2>

              <p className="mt-6 max-w-[590px] text-base leading-8 text-[#EDEDE3]/58">
                {t.connection.description}
              </p>

              <Link
                href="/#concierge"
                className="mt-8 inline-flex min-h-[50px] items-center gap-2 rounded-xl bg-[#E3A144] px-6 text-sm font-bold text-[#07130F] transition hover:bg-[#F0B35C]"
              >
                {t.connection.button}
                <span>→</span>
              </Link>
            </div>

            <div className="border-t border-white/[0.07] bg-[#08130F] p-7 md:p-10 lg:border-l lg:border-t-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#EDEDE3]/35">
                {t.connection.example}
              </p>

              <div className="mt-5 space-y-3">
                {t.connection.steps.map(
                  (item, index) => (
                    <div
                      key={item}
                      className="flex items-center gap-4 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#E3A144]/20 bg-[#E3A144]/8 text-[9px] font-semibold text-[#E3A144]">
                        {index + 1}
                      </span>

                      <span className="text-sm text-[#EDEDE3]/58">
                        {item}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          OPERADORES
      ========================================================== */}

      <section className="border-t border-white/[0.07] bg-[#091510] px-5 py-20 md:px-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7C9C87]">
              {t.operators.eyebrow}
            </span>

            <h2
              className="mt-3 max-w-[700px] text-3xl leading-tight text-[#F0F0E8] md:text-4xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              {t.operators.title}
            </h2>
          </div>

          <Link
            href="/operadores"
            className="inline-flex min-h-[50px] shrink-0 items-center justify-center gap-2 rounded-xl border border-[#E3A144]/30 bg-[#E3A144]/10 px-6 text-sm font-semibold text-[#F4C77E] transition hover:bg-[#E3A144]/15"
          >
            {t.operators.button}
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* =========================================================
          FOOTER
      ========================================================== */}

      <footer className="border-t border-white/[0.07] bg-[#07100D] px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-3 text-xs text-[#EDEDE3]/35 sm:flex-row sm:items-center sm:justify-between">
          <span>
            ERN Concierge — Rio Negro, Amazonas.
          </span>

          <span>Encantos Rio Negro</span>
        </div>
      </footer>
    </div>
  );
}
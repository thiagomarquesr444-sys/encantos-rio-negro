'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

import PublicHeader from '@/app/components/PublicHeader';

import {
  useLanguage,
} from '@/app/components/LanguageProvider';

type Categoria =
  | 'todos'
  | 'barcelos'
  | 'novo-airao'
  | 'natureza'
  | 'cultura';

type DestinoBase = {
  id: string;
  categoria: Categoria[];
  imagem: string;
  grande?: boolean;
};

const destinosBase: DestinoBase[] = [
  {
    id: 'barcelos',
    categoria: ['barcelos', 'cultura', 'natureza'],
    imagem: '/images/destinos/barcelos.jpg',
    grande: true,
  },
  {
    id: 'serra-do-araca',
    categoria: ['barcelos', 'natureza'],
    imagem: '/images/serra-araca.jpg',
  },
  {
    id: 'mariua',
    categoria: ['barcelos', 'natureza'],
    imagem: '/images/mariua.jpg',
  },
  {
    id: 'praia-grande',
    categoria: ['barcelos', 'natureza', 'cultura'],
    imagem: '/images/destinos/praia-grande.jpg',
  },
  {
    id: 'festival-peixe-ornamental',
    categoria: ['barcelos', 'cultura'],
    imagem: '/images/festival-peixe-ornamental.jpg',
  },
  {
    id: 'novo-airao',
    categoria: ['novo-airao', 'cultura', 'natureza'],
    imagem: '/images/destinos/novo-airao.jpg',
    grande: true,
  },
  {
    id: 'anavilhanas',
    categoria: ['novo-airao', 'natureza'],
    imagem: '/images/anavilhanas-aereo.jpg',
  },
  {
    id: 'jau',
    categoria: ['novo-airao', 'barcelos', 'natureza'],
    imagem: '/images/jau-arvore-monumental.jpg',
  },
  {
    id: 'festival-peixe-boi',
    categoria: ['novo-airao', 'cultura'],
    imagem: '/images/festival-peixe-boi.jpg',
  },
];

import {
  destinosTranslations,
  type DestinosTranslation,
} from '@/lib/i18n/destinos';

export default function DestinosPage() {
  const { idioma } = useLanguage();

  const [categoriaAtiva, setCategoriaAtiva] =
    useState<Categoria>('todos');

  const t =
    destinosTranslations[idioma] as DestinosTranslation;

  const destinos = useMemo(() => {
    return destinosBase.map((destino) => {
      const conteudo =
        t.destinations[
          destino.id as keyof typeof t.destinations
        ];

      return {
        ...destino,
        ...conteudo,
      };
    });
  }, [t]);

  const destinosFiltrados = useMemo(() => {
    if (categoriaAtiva === 'todos') {
      return destinos;
    }

    return destinos.filter((destino) =>
      destino.categoria.includes(categoriaAtiva)
    );
  }, [categoriaAtiva, destinos]);

  const categorias: {
    id: Categoria;
    label: string;
  }[] = [
    {
      id: 'todos',
      label: t.categories.todos,
    },
    {
      id: 'barcelos',
      label: t.categories.barcelos,
    },
    {
      id: 'novo-airao',
      label: t.categories['novo-airao'],
    },
    {
      id: 'natureza',
      label: t.categories.natureza,
    },
    {
      id: 'cultura',
      label: t.categories.cultura,
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

      <section className="relative min-h-[88vh] overflow-hidden border-b border-white/[0.07] bg-[#07130F]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('/images/destinos/rio-negro-destinos.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#06100D]/95 via-[#06100D]/68 to-[#06100D]/25" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1512] via-transparent to-[#07130F]/35" />

        <div className="absolute inset-0 bg-[#07130F]/20" />

        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 top-20 h-[620px] w-[620px] opacity-25"
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
            stroke="#7C9C87"
            strokeWidth="1"
            opacity=".6"
          />
        </svg>

        <div className="relative z-10 mx-auto flex min-h-[88vh] max-w-[1280px] items-end px-5 pb-20 pt-36 md:px-8 md:pb-24">
          <div className="grid w-full gap-12 lg:grid-cols-[1fr_0.75fr] lg:items-end">
            <div>
              <div className="flex items-center gap-3">
                <span className="h-px w-9 bg-[#E3A144]" />

                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[#E3A144]">
                  {t.hero.eyebrow}
                </span>
              </div>

              <h1
                className="mt-7 max-w-[800px] text-[clamp(3.4rem,7vw,7rem)] font-medium leading-[0.92] tracking-[-0.045em] text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {t.hero.title}
              </h1>

              <p className="mt-8 max-w-[680px] text-base leading-8 text-[#EDEDE3]/68 md:text-lg">
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
                  {t.hero.region}
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
          BARRA DE DESCOBERTA
      ========================================================== */}

      <section className="border-b border-white/[0.07] bg-[#0A1713] px-5 py-5 md:px-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs font-medium text-[#EDEDE3]/42">
            {t.discovery.title}
          </p>

          <div className="flex flex-wrap gap-2">
            {categorias.map((categoria) => {
              const ativo =
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
                    ativo
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
        className="scroll-mt-24 bg-[#0B1512] px-5 py-24 md:px-8 md:py-32"
      >
        <div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-24">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7C9C87]">
              {t.intro.eyebrow}
            </span>

            <h2
              className="mt-5 max-w-[480px] text-4xl leading-[1.05] text-[#F0F0E8] md:text-5xl"
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
          GRID DE DESTINOS
      ========================================================== */}

      <section className="bg-[#0D1814] px-5 pb-24 md:px-8 md:pb-32">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {destinosFiltrados.map((destino) => (
              <article
                key={destino.id}
                className={`group relative overflow-hidden rounded-[26px] border border-white/[0.09] bg-[#07110E] ${
                  destino.grande
                    ? 'min-h-[540px] md:col-span-2 xl:col-span-2'
                    : 'min-h-[430px]'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#173025] via-[#0D1B16] to-[#07110E]" />

                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-[900ms] group-hover:scale-[1.035]"
                  style={{
                    backgroundImage: `url('${destino.imagem}')`,
                  }}
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#06100D] via-[#06100D]/48 to-[#06100D]/5" />

                <div className="absolute inset-0 bg-gradient-to-r from-[#06100D]/28 to-transparent" />

                <div className="absolute left-5 top-5">
                  <span className="rounded-full border border-white/15 bg-[#07110E]/65 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#EDEDE3]/75 backdrop-blur-md">
                    {destino.etiqueta}
                  </span>
                </div>

                <div className="absolute inset-x-0 bottom-0 p-6 md:p-7">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                    {destino.local}
                  </p>

                  <h3
                    className={`mt-2 leading-[1.02] text-[#F0F0E8] ${
                      destino.grande
                        ? 'text-4xl md:text-5xl'
                        : 'text-3xl'
                    }`}
                    style={{
                      fontFamily:
                        'var(--font-fraunces), serif',
                    }}
                  >
                    {destino.titulo}
                  </h3>

                  <p
                    className={`mt-4 leading-7 text-[#EDEDE3]/62 ${
                      destino.grande
                        ? 'max-w-[660px] text-base'
                        : 'max-w-[480px] text-sm'
                    }`}
                  >
                    {destino.descricao}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-4">
                    <span className="text-xs text-[#EDEDE3]/38">
                      {destino.destaque}
                    </span>

                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#E3A144] transition group-hover:gap-3">
                      {t.explore}
                      <span>→</span>
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {destinosFiltrados.length ===
            0 && (
            <div className="rounded-[24px] border border-white/[0.08] bg-[#0A1713] px-6 py-16 text-center">
              <p
                className="text-3xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {t.empty}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================
          EXPERIÊNCIA POR PERFIL
      ========================================================== */}

      <section className="border-y border-white/[0.07] bg-[#101D17] px-5 py-24 md:px-8 md:py-32">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                {t.experienceSection.eyebrow}
              </span>

              <h2
                className="mt-5 max-w-[500px] text-4xl leading-[1.05] text-[#F0F0E8] md:text-5xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {t.experienceSection.title}
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {t.experiences.map((item) => (
                <article
                  key={item.numero}
                  className="rounded-[22px] border border-white/[0.08] bg-[#0A1713] p-6"
                >
                  <span className="text-[10px] font-semibold tracking-[0.18em] text-[#E3A144]">
                    {item.numero}
                  </span>

                  <h3
                    className="mt-5 text-2xl text-[#F0F0E8]"
                    style={{
                      fontFamily:
                        'var(--font-fraunces), serif',
                    }}
                  >
                    {item.titulo}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-[#EDEDE3]/50">
                    {item.descricao}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          DOIS TERRITÓRIOS-BASE
      ========================================================== */}

      <section className="bg-[#0B1512] px-5 py-24 md:px-8 md:py-32">
        <div className="mx-auto max-w-[1180px]">
          <div className="max-w-[720px]">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7C9C87]">
              {t.bases.eyebrow}
            </span>

            <h2
              className="mt-5 text-4xl leading-[1.05] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              {t.bases.title}
            </h2>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-2">

            {/* BARCELOS */}

            <article className="relative min-h-[480px] overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0A1713]">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage:
                    "url('/images/destinos/barcelos.jpg')",
                }}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#06100D] via-[#06100D]/50 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-7">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                  {t.bases.barcelosRegion}
                </span>

                <h3
                  className="mt-2 text-4xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Barcelos
                </h3>

                <p className="mt-4 max-w-[520px] text-sm leading-7 text-[#EDEDE3]/60">
                  {t.bases.barcelosDescription}
                </p>

                <div className="mt-6 flex gap-3">
                  <a
                    href="#explorar"
                    onClick={() =>
                      setCategoriaAtiva(
                        'barcelos'
                      )
                    }
                    className="inline-flex min-h-[44px] items-center rounded-xl bg-[#E3A144] px-5 text-xs font-bold text-[#07130F]"
                  >
                    {t.bases.barcelosButton}
                  </a>
                </div>
              </div>
            </article>

            {/* NOVO AIRÃO */}

            <article className="relative min-h-[480px] overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0A1713]">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage:
                    "url('/images/destinos/novo-airao.jpg')",
                }}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#06100D] via-[#06100D]/50 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-7">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                  {t.bases.novoAiraoRegion}
                </span>

                <h3
                  className="mt-2 text-4xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Novo Airão
                </h3>

                <p className="mt-4 max-w-[520px] text-sm leading-7 text-[#EDEDE3]/60">
                  {t.bases.novoAiraoDescription}
                </p>

                <div className="mt-6 flex gap-3">
                  <a
                    href="#explorar"
                    onClick={() =>
                      setCategoriaAtiva(
                        'novo-airao'
                      )
                    }
                    className="inline-flex min-h-[44px] items-center rounded-xl bg-[#E3A144] px-5 text-xs font-bold text-[#07130F]"
                  >
                    {t.bases.novoAiraoButton}
                  </a>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* =========================================================
          CICLO DAS ÁGUAS
      ========================================================== */}

      <section className="border-y border-white/[0.07] bg-[#0E1A15] px-5 py-24 md:px-8 md:py-32">
        <div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
              {t.waters.eyebrow}
            </span>

            <h2
              className="mt-5 max-w-[520px] text-4xl leading-[1.05] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              {t.waters.title}
            </h2>

            <p className="mt-6 max-w-[540px] text-sm leading-7 text-[#EDEDE3]/50">
              {t.waters.description}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-[24px] border border-white/[0.08] bg-[#0A1713] p-6">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                {t.waters.highLabel}
              </span>

              <h3
                className="mt-5 text-3xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {t.waters.highTitle}
              </h3>

              <p className="mt-4 text-sm leading-7 text-[#EDEDE3]/50">
                {t.waters.highDescription}
              </p>
            </article>

            <article className="rounded-[24px] border border-white/[0.08] bg-[#0A1713] p-6">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                {t.waters.lowLabel}
              </span>

              <h3
                className="mt-5 text-3xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {t.waters.lowTitle}
              </h3>

              <p className="mt-4 text-sm leading-7 text-[#EDEDE3]/50">
                {t.waters.lowDescription}
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* =========================================================
          PLANEJAMENTO
      ========================================================== */}

      <section className="bg-[#0B1512] px-5 py-24 md:px-8 md:py-32">
        <div className="mx-auto max-w-[1180px] overflow-hidden rounded-[30px] border border-[#E3A144]/18 bg-[#0D1B16]">
          <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
            <div className="p-7 md:p-10 lg:p-12">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                {t.planning.eyebrow}
              </span>

              <h2
                className="mt-5 max-w-[620px] text-4xl leading-[1.05] text-[#F0F0E8] md:text-5xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {t.planning.title}
              </h2>

              <p className="mt-6 max-w-[590px] text-base leading-8 text-[#EDEDE3]/58">
                {t.planning.description}
              </p>

              <Link
                href="/#concierge"
                className="mt-8 inline-flex min-h-[50px] items-center gap-2 rounded-xl bg-[#E3A144] px-6 text-sm font-bold text-[#07130F] transition hover:bg-[#F0B35C]"
              >
                {t.planning.button}
                <span>→</span>
              </Link>
            </div>

            <div className="border-t border-white/[0.07] bg-[#08130F] p-7 md:p-10 lg:border-l lg:border-t-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#EDEDE3]/35">
                {t.planning.questionsTitle}
              </p>

              <div className="mt-5 space-y-3">
                {t.planning.questions.map(
                  (pergunta) => (
                    <div
                      key={pergunta}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5"
                    >
                      <span className="text-[#E3A144]">
                        ✦
                      </span>

                      <span className="text-sm text-[#EDEDE3]/58">
                        {pergunta}
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
          CTA OPERADORES
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
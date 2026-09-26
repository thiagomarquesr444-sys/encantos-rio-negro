'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

import PublicHeader from '@/app/components/PublicHeader';

import { useLanguage } from '@/app/components/LanguageProvider';

import {
  redeTranslations,
  type RedeTranslation,
} from '@/lib/i18n/rede';

type CategoriaRede =
  | 'todos'
  | 'operadores'
  | 'guias'
  | 'hospedagens'
  | 'embarcacoes'
  | 'agencias'
  | 'experiencias';

type MembroBase = {
  id: string;
  tipo: CategoriaRede;
  imagem: string;
  destaque?: boolean;
};

const membrosBase: MembroBase[] = [
  {
    id: 'operadores',
    tipo: 'operadores',
    imagem: '/images/rede/operadores.jpg',
    destaque: true,
  },
  {
    id: 'guias',
    tipo: 'guias',
    imagem: '/images/rede/guias.jpg',
  },
  {
    id: 'hospedagens',
    tipo: 'hospedagens',
    imagem: '/images/rede/hospedagens.jpg',
  },
  {
    id: 'embarcacoes',
    tipo: 'embarcacoes',
    imagem: '/images/rede/embarcacoes.jpg',
  },
  {
    id: 'agencias',
    tipo: 'agencias',
    imagem: '/images/rede/agencias.jpg',
  },
  {
    id: 'experiencias',
    tipo: 'experiencias',
    imagem: '/images/rede/experiencias.jpg',
  },
];

export default function RedePage() {
  const { idioma } = useLanguage();

  const [categoriaAtiva, setCategoriaAtiva] =
    useState<CategoriaRede>('todos');

  const [busca, setBusca] = useState('');

  const t =
    redeTranslations[
      idioma
    ] as RedeTranslation;

  const membros = useMemo(() => {
    return membrosBase.map((membro) => {
      const conteudo =
        t.members[
          membro.id as keyof typeof t.members
        ];

      return {
        ...membro,
        ...conteudo,
      };
    });
  }, [t]);

  const membrosFiltrados = useMemo(() => {
    const textoBusca =
      busca.trim().toLowerCase();

    return membros.filter((membro) => {
      const categoriaValida =
        categoriaAtiva === 'todos' ||
        membro.tipo === categoriaAtiva;

      const buscaValida =
        textoBusca.length === 0 ||
        membro.nome
          .toLowerCase()
          .includes(textoBusca) ||
        membro.local
          .toLowerCase()
          .includes(textoBusca) ||
        membro.descricao
          .toLowerCase()
          .includes(textoBusca);

      return categoriaValida && buscaValida;
    });
  }, [categoriaAtiva, busca, membros]);

  const categorias: {
    id: CategoriaRede;
    label: string;
  }[] = [
    {
      id: 'todos',
      label: t.categories.todos,
    },
    {
      id: 'operadores',
      label: t.categories.operadores,
    },
    {
      id: 'guias',
      label: t.categories.guias,
    },
    {
      id: 'hospedagens',
      label: t.categories.hospedagens,
    },
    {
      id: 'embarcacoes',
      label: t.categories.embarcacoes,
    },
    {
      id: 'agencias',
      label: t.categories.agencias,
    },
    {
      id: 'experiencias',
      label: t.categories.experiencias,
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
        <div className="absolute inset-0 bg-gradient-to-br from-[#14271F] via-[#091711] to-[#06100D]" />

        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('/images/rede/rede-rio-negro-hero.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#06100D]/97 via-[#06100D]/76 to-[#06100D]/36" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1512] via-transparent to-[#07130F]/28" />

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
                className="mt-7 max-w-[860px] text-[clamp(3.4rem,7vw,7rem)] font-medium leading-[0.92] tracking-[-0.045em] text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {t.hero.title}
              </h1>

              <p className="mt-8 max-w-[700px] text-base leading-8 text-[#EDEDE3]/68 md:text-lg">
                {t.hero.description}
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#explorar-rede"
                  className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-[#E3A144] px-7 text-sm font-bold text-[#07130F] transition hover:-translate-y-0.5 hover:bg-[#F0B35C]"
                >
                  {t.hero.explore}
                </a>

                <Link
                  href="/operadores"
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-7 text-sm font-semibold text-[#EDEDE3] backdrop-blur transition hover:bg-white/[0.08]"
                >
                  {t.hero.join}
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
          INTRODUÇÃO
      ========================================================== */}

      <section className="bg-[#0B1512] px-5 py-24 md:px-8 md:py-32">
        <div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
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
            <p className="max-w-[660px] text-base leading-8 text-[#EDEDE3]/60 md:text-lg">
              {t.intro.paragraph1}
            </p>

            <p className="mt-5 max-w-[660px] text-sm leading-7 text-[#EDEDE3]/42">
              {t.intro.paragraph2}
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================
          FLUXO DA REDE
      ========================================================== */}

      <section className="border-y border-white/[0.07] bg-[#101D17] px-5 py-24 md:px-8 md:py-32">
        <div className="mx-auto max-w-[1180px]">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
            {t.flow.eyebrow}
          </span>

          <h2
            className="mt-5 max-w-[740px] text-4xl leading-[1.05] text-[#F0F0E8] md:text-5xl"
            style={{
              fontFamily:
                'var(--font-fraunces), serif',
            }}
          >
            {t.flow.title}
          </h2>

          <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {t.flow.items.map((pilar) => (
              <article
                key={pilar.numero}
                className="rounded-[24px] border border-white/[0.08] bg-[#0A1713] p-6"
              >
                <span className="text-[10px] font-semibold text-[#E3A144]">
                  {pilar.numero}
                </span>

                <h3
                  className="mt-8 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  {pilar.titulo}
                </h3>

                <p className="mt-4 text-sm leading-7 text-[#EDEDE3]/50">
                  {pilar.descricao}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          EXPLORAR REDE
      ========================================================== */}

      <section
        id="explorar-rede"
        className="scroll-mt-28 bg-[#0B1512] px-5 py-24 md:px-8 md:py-32"
      >
        <div className="mx-auto max-w-[1180px]">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7C9C87]">
            {t.explore.eyebrow}
          </span>

          <h2
            className="mt-5 max-w-[650px] text-4xl leading-[1.05] text-[#F0F0E8] md:text-5xl"
            style={{
              fontFamily:
                'var(--font-fraunces), serif',
            }}
          >
            {t.explore.title}
          </h2>

          <p className="mt-6 max-w-[700px] text-sm leading-7 text-[#EDEDE3]/46">
            {t.explore.description}
          </p>

          <div className="mt-10 rounded-[22px] border border-white/[0.08] bg-[#0A1713] p-4">
            <input
              value={busca}
              onChange={(event) =>
                setBusca(event.target.value)
              }
              placeholder={t.explore.searchPlaceholder}
              className="h-[50px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#EDEDE3] outline-none placeholder:text-[#EDEDE3]/25 focus:border-[#E3A144]/35"
            />

            <div className="mt-4 flex flex-wrap gap-2">
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
                    className={`rounded-full border px-4 py-2 text-xs font-semibold ${
                      ativo
                        ? 'border-[#E3A144]/45 bg-[#E3A144]/12 text-[#F4C77E]'
                        : 'border-white/10 bg-white/[0.025] text-[#EDEDE3]/50'
                    }`}
                  >
                    {categoria.label}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-xs text-[#EDEDE3]/30">
              {membrosFiltrados.length}{' '}
              {membrosFiltrados.length === 1
                ? t.explore.resultSingular
                : t.explore.resultPlural}
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {membrosFiltrados.map((membro) => (
              <article
                key={membro.id}
                className={`overflow-hidden rounded-[26px] border border-white/[0.08] bg-[#0A1713] ${
                  membro.destaque
                    ? 'md:col-span-2 xl:col-span-2'
                    : ''
                }`}
              >
                <div className="relative min-h-[280px] overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#173025] via-[#0D1B16] to-[#07110E]" />

                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: `url('${membro.imagem}')`,
                    }}
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-[#07110E] via-[#07110E]/40 to-transparent" />

                  <span className="absolute left-5 top-5 rounded-full border border-[#E3A144]/20 bg-[#07110E]/70 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#F4C77E]">
                    {t.explore.forming}
                  </span>

                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                      {membro.local}
                    </p>

                    <h3
                      className="mt-2 text-3xl text-[#F0F0E8]"
                      style={{
                        fontFamily:
                          'var(--font-fraunces), serif',
                      }}
                    >
                      {membro.nome}
                    </h3>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-sm leading-7 text-[#EDEDE3]/52">
                    {membro.descricao}
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-5">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-[#EDEDE3]/28">
                      {t.explore.realProfiles}
                    </span>

                    <span className="text-sm font-semibold text-[#E3A144]">
                      {t.explore.soon}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {membrosFiltrados.length === 0 && (
            <div className="mt-8 rounded-[24px] border border-white/[0.08] bg-[#0A1713] px-6 py-16 text-center">
              <h3
                className="text-3xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {t.explore.emptyTitle}
              </h3>

              <p className="mt-3 text-sm text-[#EDEDE3]/40">
                {t.explore.emptyDescription}
              </p>

              <button
                type="button"
                onClick={() => {
                  setBusca('');
                  setCategoriaAtiva('todos');
                }}
                className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-xs font-semibold text-[#EDEDE3]/70"
              >
                {t.explore.clear}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================
          PARTICIPAR DA REDE
      ========================================================== */}

      <section className="border-y border-white/[0.07] bg-[#101D17] px-5 py-24 md:px-8 md:py-32">
        <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
              {t.join.eyebrow}
            </span>

            <h2
              className="mt-5 max-w-[520px] text-4xl leading-[1.05] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              {t.join.title}
            </h2>

            <p className="mt-6 max-w-[510px] text-sm leading-7 text-[#EDEDE3]/48">
              {t.join.description}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {t.join.profiles.map((perfil) => (
              <article
                key={perfil.titulo}
                className="rounded-[22px] border border-white/[0.08] bg-[#0A1713] p-6"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E3A144]/20 bg-[#E3A144]/8 text-xs text-[#E3A144]">
                  ✦
                </div>

                <h3
                  className="mt-6 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  {perfil.titulo}
                </h3>

                <p className="mt-3 text-sm leading-7 text-[#EDEDE3]/48">
                  {perfil.descricao}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          DIFERENCIAL
      ========================================================== */}

      <section className="bg-[#0B1512] px-5 py-24 md:px-8 md:py-32">
        <div className="mx-auto max-w-[1180px] overflow-hidden rounded-[30px] border border-[#E3A144]/18 bg-[#0D1B16]">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div className="p-7 md:p-10 lg:p-12">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                {t.difference.eyebrow}
              </span>

              <h2
                className="mt-5 max-w-[610px] text-4xl leading-[1.05] text-[#F0F0E8] md:text-5xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {t.difference.title}
              </h2>

              <p className="mt-6 max-w-[590px] text-base leading-8 text-[#EDEDE3]/58">
                {t.difference.description}
              </p>

              <Link
                href="/operadores"
                className="mt-8 inline-flex min-h-[50px] items-center gap-2 rounded-xl bg-[#E3A144] px-6 text-sm font-bold text-[#07130F]"
              >
                {t.difference.button}
                <span>→</span>
              </Link>
            </div>

            <div className="border-t border-white/[0.07] bg-[#08130F] p-7 md:p-10 lg:border-l lg:border-t-0">
              <div className="rounded-2xl border border-[#E3A144]/15 bg-[#E3A144]/5 p-5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E3A144]">
                  {t.difference.publicLabel}
                </span>

                <h3
                  className="mt-3 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  {t.difference.publicTitle}
                </h3>

                <p className="mt-3 text-sm text-[#EDEDE3]/45">
                  {t.difference.publicDescription}
                </p>
              </div>

              <div className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7C9C87]">
                  {t.difference.managementLabel}
                </span>

                <h3
                  className="mt-3 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  {t.difference.managementTitle}
                </h3>

                <p className="mt-3 text-sm text-[#EDEDE3]/45">
                  {t.difference.managementDescription}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          CTA FINAL
      ========================================================== */}

      <section className="border-t border-white/[0.07] bg-[#091510] px-5 py-24 md:px-8">
        <div className="mx-auto grid max-w-[1180px] gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
              {t.finalCta.eyebrow}
            </span>

            <h2
              className="mt-4 max-w-[760px] text-4xl leading-[1.05] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              {t.finalCta.title}
            </h2>

            <p className="mt-5 max-w-[680px] text-sm leading-7 text-[#EDEDE3]/45">
              {t.finalCta.description}
            </p>
          </div>

          <Link
            href="/#concierge"
            className="inline-flex min-h-[52px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#E3A144] px-7 text-sm font-bold text-[#07130F]"
          >
            {t.finalCta.button}
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
            Rede Encantos — Rio Negro, Amazonas.
          </span>

          <span>Encantos Rio Negro</span>
        </div>
      </footer>
    </div>
  );
}
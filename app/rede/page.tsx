'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';

import Link from 'next/link';

import PublicHeader from '@/app/components/PublicHeader';

import {
  useLanguage,
} from '@/app/components/LanguageProvider';

import {
  redeTranslations,
  type RedeTranslation,
} from '@/lib/i18n/rede';

import {
  alternarInteracaoPublicacao,
  alternarSeguirPerfil,
  listarCategoriasPublicas,
  listarFeedPublico,
  listarTerritoriosPublicos,
  mensagemErroRedePublica,
  obterEstadoSocialRede,
  type CategoriaPublicacao,
  type EstadoSocialRede,
  type PublicacaoPublica,
  type TerritorioPublico,
  type TipoInteracaoPublicacao,
} from '@/lib/redePublica';

type EstadoFeed =
  | {
      tipo: 'carregando';
    }
  | {
      tipo: 'erro';
      mensagem: string;
    }
  | {
      tipo: 'pronto';
      publicacoes: PublicacaoPublica[];
      categorias: CategoriaPublicacao[];
      territorios: TerritorioPublico[];
      social: EstadoSocialRede;
    };

const SOCIAL_VAZIO: EstadoSocialRede = {
  autenticado: false,

  perfisSeguidos:
    new Set(),

  interacoes: {},
};

function formatarDataPublicacao(
  valor: string,
  idioma: string,
): string {
  const data =
    new Date(valor);

  if (
    !Number.isFinite(
      data.getTime(),
    )
  ) {
    return '';
  }

  const locale =
    idioma === 'EN'
      ? 'en-US'
      : idioma === 'ES'
        ? 'es-ES'
        : 'pt-BR';

  return new Intl.DateTimeFormat(
    locale,
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  ).format(data);
}

function iniciais(
  nome: string,
): string {
  const partes =
    nome
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    partes.length === 0
  ) {
    return 'ER';
  }

  if (
    partes.length === 1
  ) {
    return partes[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${partes[0][0]}${
    partes[
      partes.length - 1
    ][0]
  }`.toUpperCase();
}

function imagemPrincipal(
  publicacao: PublicacaoPublica,
): string | null {
  const imagem =
    publicacao.midias.find(
      (midia) =>
        midia.tipo ===
        'imagem',
    );

  if (imagem) {
    return imagem.url;
  }

  const video =
    publicacao.midias.find(
      (midia) =>
        midia.tipo ===
          'video' &&
        Boolean(
          midia.thumbnail_url,
        ),
    );

  return (
    video?.thumbnail_url ??
    null
  );
}

function localPublicacao(
  publicacao: PublicacaoPublica,
): string {
  if (
    publicacao.localidade_texto
  ) {
    return (
      publicacao.localidade_texto
    );
  }

  if (
    publicacao.territorio
  ) {
    return (
      publicacao.territorio.nome
    );
  }

  const localPerfil =
    [
      publicacao.autor.cidade,
      publicacao.autor.uf,
    ]
      .filter(Boolean)
      .join(' • ');

  return (
    localPerfil ||
    'Rio Negro'
  );
}

export default function RedePage() {
  const {
    idioma,
  } = useLanguage();

  const t =
    redeTranslations[
      idioma
    ] as RedeTranslation;

  const [
    estado,
    setEstado,
  ] =
    useState<EstadoFeed>({
      tipo: 'carregando',
    });

  const [
    buscaDigitada,
    setBuscaDigitada,
  ] = useState('');

  const [
    buscaAplicada,
    setBuscaAplicada,
  ] = useState('');

  const [
    categoriaAtiva,
    setCategoriaAtiva,
  ] = useState('');

  const [
    territorioAtivo,
    setTerritorioAtivo,
  ] = useState('');

  const [
    revisao,
    setRevisao,
  ] = useState(0);

  const [
    avisoSocial,
    setAvisoSocial,
  ] = useState<
    string | null
  >(null);

  const [
    compartilhadoId,
    setCompartilhadoId,
  ] = useState<
    string | null
  >(null);

  const carregar =
    useCallback(
      async () => {
        setEstado({
          tipo: 'carregando',
        });

        setAvisoSocial(null);

        try {
          const [
            categorias,
            territorios,
            publicacoes,
          ] =
            await Promise.all([
              listarCategoriasPublicas(),

              listarTerritoriosPublicos(),

              listarFeedPublico(
                idioma,
                {
                  busca:
                    buscaAplicada,

                  categoriaId:
                    categoriaAtiva ||
                    undefined,

                  territorioId:
                    territorioAtivo ||
                    undefined,

                  limite: 40,
                },
              ),
            ]);

          const social =
            publicacoes.length >
            0
              ? await obterEstadoSocialRede(
                  publicacoes.map(
                    (item) =>
                      item.id,
                  ),
                )
              : SOCIAL_VAZIO;

          setEstado({
            tipo: 'pronto',

            publicacoes,

            categorias,

            territorios,

            social,
          });
        } catch (
          erro: unknown
        ) {
          setEstado({
            tipo: 'erro',

            mensagem:
              mensagemErroRedePublica(
                erro,
              ),
          });
        }
      },
      [
        idioma,
        buscaAplicada,
        categoriaAtiva,
        territorioAtivo,
        revisao,
      ],
    );

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const publicacoes =
    estado.tipo ===
    'pronto'
      ? estado.publicacoes
      : [];

  const destaque =
    useMemo(
      () =>
        publicacoes.find(
          (item) =>
            item.destaque,
        ) ??
        publicacoes[0] ??
        null,
      [publicacoes],
    );

  const demaisPublicacoes =
    useMemo(
      () =>
        destaque
          ? publicacoes.filter(
              (item) =>
                item.id !==
                destaque.id,
            )
          : publicacoes,
      [
        publicacoes,
        destaque,
      ],
    );

  function aplicarBusca(
    evento: FormEvent<HTMLFormElement>,
  ): void {
    evento.preventDefault();

    setBuscaAplicada(
      buscaDigitada.trim(),
    );
  }

  function limparFiltros():
  void {
    setBuscaDigitada('');
    setBuscaAplicada('');
    setCategoriaAtiva('');
    setTerritorioAtivo('');
  }

  function nomeCategoria(
    categoria: CategoriaPublicacao,
  ): string {
    const traducoes =
      t.categories as Record<
        string,
        string
      >;

    return (
      traducoes[
        categoria.slug
      ] ??
      categoria.nome
    );
  }

  async function alternarSeguir(
    perfilId: string,
  ): Promise<void> {
    if (
      estado.tipo !==
      'pronto'
    ) {
      return;
    }

    setAvisoSocial(null);

    const seguindo =
      estado.social.perfisSeguidos.has(
        perfilId,
      );

    try {
      const novoEstado =
        await alternarSeguirPerfil(
          perfilId,
          seguindo,
        );

      setEstado(
        (anterior) => {
          if (
            anterior.tipo !==
            'pronto'
          ) {
            return anterior;
          }

          const novos =
            new Set(
              anterior.social
                .perfisSeguidos,
            );

          if (novoEstado) {
            novos.add(
              perfilId,
            );
          } else {
            novos.delete(
              perfilId,
            );
          }

          return {
            ...anterior,

            social: {
              ...anterior.social,

              autenticado:
                true,

              perfisSeguidos:
                novos,
            },
          };
        },
      );
    } catch (
      erro: unknown
    ) {
      const mensagem =
        mensagemErroRedePublica(
          erro,
        );

      setAvisoSocial(
        mensagem ===
          'Entre na ERN para seguir perfis.'
          ? t.feed
              .followRequired
          : mensagem,
      );
    }
  }

  async function alternarInteracao(
    publicacaoId: string,
    tipo: TipoInteracaoPublicacao,
  ): Promise<void> {
    if (
      estado.tipo !==
      'pronto'
    ) {
      return;
    }

    setAvisoSocial(null);

    const atual =
      estado.social.interacoes[
        publicacaoId
      ] ?? {
        curtida: false,
        salvo: false,
        quero_ir: false,
      };

    try {
      const novoEstado =
        await alternarInteracaoPublicacao(
          publicacaoId,
          tipo,
          atual[tipo],
        );

      setEstado(
        (anterior) => {
          if (
            anterior.tipo !==
            'pronto'
          ) {
            return anterior;
          }

          const anteriorPublicacao =
            anterior.social
              .interacoes[
                publicacaoId
              ] ?? {
                curtida: false,
                salvo: false,
                quero_ir: false,
              };

          return {
            ...anterior,

            social: {
              ...anterior.social,

              autenticado:
                true,

              interacoes: {
                ...anterior.social
                  .interacoes,

                [publicacaoId]: {
                  ...anteriorPublicacao,

                  [tipo]:
                    novoEstado,
                },
              },
            },
          };
        },
      );
    } catch (
      erro: unknown
    ) {
      const mensagem =
        mensagemErroRedePublica(
          erro,
        );

      setAvisoSocial(
        mensagem ===
          'Entre na ERN para interagir com publicações.'
          ? t.feed
              .interactionRequired
          : mensagem,
      );
    }
  }

  async function compartilhar(
    publicacao: PublicacaoPublica,
  ): Promise<void> {
    const url =
      `${window.location.origin}/rede#${publicacao.slug}`;

    try {
      if (
        navigator.share
      ) {
        await navigator.share({
          title:
            publicacao.titulo,

          text:
            publicacao.resumo ??
            undefined,

          url,
        });
      } else {
        await navigator.clipboard.writeText(
          url,
        );

        setCompartilhadoId(
          publicacao.id,
        );

        window.setTimeout(
          () => {
            setCompartilhadoId(
              null,
            );
          },
          1800,
        );
      }
    } catch {
      // O visitante pode cancelar o compartilhamento.
    }
  }

  function renderAutor(
    publicacao: PublicacaoPublica,
    compacto = false,
  ) {
    const seguindo =
      estado.tipo ===
        'pronto' &&
      estado.social
        .perfisSeguidos.has(
          publicacao.autor.id,
        );

    return (
      <div className="flex min-w-0 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {publicacao.autor
            .logo_url ? (
            <img
              src={
                publicacao.autor
                  .logo_url
              }
              alt=""
              className={`shrink-0 rounded-full border border-white/10 object-cover ${
                compacto
                  ? 'h-10 w-10'
                  : 'h-12 w-12'
              }`}
            />
          ) : (
            <div
              className={`flex shrink-0 items-center justify-center rounded-full border border-[#E3A144]/20 bg-[#E3A144]/10 font-semibold text-[#E3A144] ${
                compacto
                  ? 'h-10 w-10 text-xs'
                  : 'h-12 w-12 text-sm'
              }`}
            >
              {iniciais(
                publicacao.autor
                  .nome_publico,
              )}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-semibold text-[#F0F0E8]">
                {
                  publicacao.autor
                    .nome_publico
                }
              </p>

              {publicacao.autor
                .verificado && (
                <span
                  title={
                    t.feed
                      .verified
                  }
                  aria-label={
                    t.feed
                      .verified
                  }
                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#E3A144] text-[9px] font-black text-[#07130F]"
                >
                  ✓
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#EDEDE3]/42">
              <span>
                {publicacao.autor
                  .categoria ===
                'ern_editorial'
                  ? t.feed
                      .editorial
                  : localPublicacao(
                      publicacao,
                    )}
              </span>

              <span aria-hidden="true">
                •
              </span>

              <span>
                {formatarDataPublicacao(
                  publicacao.publicado_em,
                  idioma,
                )}
              </span>
            </div>
          </div>
        </div>

        {publicacao.autor
          .categoria !==
          'ern_editorial' && (
          <button
            type="button"
            onClick={() =>
              void alternarSeguir(
                publicacao.autor
                  .id,
              )
            }
            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${
              seguindo
                ? 'border-white/10 bg-white/[0.04] text-[#EDEDE3]/60'
                : 'border-[#E3A144]/30 bg-[#E3A144]/10 text-[#F4C77E] hover:bg-[#E3A144]/15'
            }`}
          >
            {seguindo
              ? t.feed
                  .following
              : t.feed
                  .follow}
          </button>
        )}
      </div>
    );
  }

  function renderAcoes(
    publicacao: PublicacaoPublica,
  ) {
    const interacoes =
      estado.tipo ===
      'pronto'
        ? estado.social
            .interacoes[
              publicacao.id
            ] ?? {
              curtida: false,
              salvo: false,
              quero_ir: false,
            }
        : {
            curtida: false,
            salvo: false,
            quero_ir: false,
          };

    return (
      <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.07] pt-4">
        <button
          type="button"
          disabled={
            !publicacao.permitir_interacoes
          }
          onClick={() =>
            void alternarInteracao(
              publicacao.id,
              'curtida',
            )
          }
          className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
            interacoes.curtida
              ? 'border-[#E3A144]/35 bg-[#E3A144]/12 text-[#F4C77E]'
              : 'border-white/10 bg-white/[0.025] text-[#EDEDE3]/55 hover:bg-white/[0.05]'
          }`}
        >
          ♡ {t.feed.like}
        </button>

        <button
          type="button"
          disabled={
            !publicacao.permitir_interacoes
          }
          onClick={() =>
            void alternarInteracao(
              publicacao.id,
              'salvo',
            )
          }
          className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
            interacoes.salvo
              ? 'border-[#7C9C87]/40 bg-[#7C9C87]/10 text-[#AFCBB8]'
              : 'border-white/10 bg-white/[0.025] text-[#EDEDE3]/55 hover:bg-white/[0.05]'
          }`}
        >
          ▢ {t.feed.save}
        </button>

        <button
          type="button"
          disabled={
            !publicacao.permitir_interacoes
          }
          onClick={() =>
            void alternarInteracao(
              publicacao.id,
              'quero_ir',
            )
          }
          className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
            interacoes.quero_ir
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
              : 'border-white/10 bg-white/[0.025] text-[#EDEDE3]/55 hover:bg-white/[0.05]'
          }`}
        >
          ✦ {t.feed.wantGo}
        </button>

        <button
          type="button"
          onClick={() =>
            void compartilhar(
              publicacao,
            )
          }
          className="ml-auto rounded-full border border-white/10 bg-white/[0.025] px-3.5 py-2 text-xs font-semibold text-[#EDEDE3]/55 transition hover:bg-white/[0.05]"
        >
          ↗{' '}
          {compartilhadoId ===
          publicacao.id
            ? t.feed.shared
            : t.feed.share}
        </button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[#0B1512] text-[#EDEDE3]"
      style={{
        fontFamily:
          'var(--font-work-sans), sans-serif',
      }}
    >
      <PublicHeader />

      {/* HERO */}
      <section className="relative min-h-[78vh] overflow-hidden border-b border-white/[0.07] bg-[#07130F]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#14271F] via-[#091711] to-[#06100D]" />

        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('/images/rede/rede-rio-negro-hero.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#06100D]/97 via-[#06100D]/76 to-[#06100D]/38" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1512] via-transparent to-[#07130F]/25" />

        <div className="relative z-10 mx-auto flex min-h-[78vh] max-w-[1280px] items-end px-5 pb-20 pt-36 md:px-8 md:pb-24">
          <div className="grid w-full gap-12 lg:grid-cols-[1fr_0.68fr] lg:items-end">
            <div>
              <div className="flex items-center gap-3">
                <span className="h-px w-9 bg-[#E3A144]" />

                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[#E3A144]">
                  {t.hero.eyebrow}
                </span>
              </div>

              <h1
                className="mt-7 max-w-[900px] text-[clamp(3.2rem,6.8vw,6.8rem)] font-medium leading-[0.93] tracking-[-0.045em] text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {t.hero.title}
              </h1>

              <p className="mt-8 max-w-[710px] text-base leading-8 text-[#EDEDE3]/68 md:text-lg">
                {t.hero.description}
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#feed"
                  className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-[#E3A144] px-7 text-sm font-bold text-[#07130F] transition hover:-translate-y-0.5 hover:bg-[#F0B35C]"
                >
                  {t.hero.explore}
                </a>

                <Link
                  href="/acesso"
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

      {/* FEED */}
      <section
        id="feed"
        className="scroll-mt-24 bg-[#0B1512] px-5 py-20 md:px-8 md:py-28"
      >
        <div className="mx-auto max-w-[1180px]">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
            {t.feed.eyebrow}
          </span>

          <div className="mt-5 grid gap-7 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <h2
              className="max-w-[600px] text-4xl leading-[1.05] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              {t.feed.title}
            </h2>

            <p className="max-w-[650px] text-sm leading-7 text-[#EDEDE3]/52 md:text-base">
              {t.feed.description}
            </p>
          </div>

          {/* FILTROS */}
          <div className="mt-10 rounded-[22px] border border-white/[0.08] bg-[#0A1713] p-4 md:p-5">
            <form
              onSubmit={
                aplicarBusca
              }
              className="grid gap-3 lg:grid-cols-[1fr_auto_auto]"
            >
              <input
                type="search"
                value={
                  buscaDigitada
                }
                onChange={(
                  evento,
                ) =>
                  setBuscaDigitada(
                    evento.target
                      .value,
                  )
                }
                maxLength={160}
                placeholder={
                  t.feed
                    .searchPlaceholder
                }
                className="min-h-[50px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#EDEDE3] outline-none placeholder:text-[#EDEDE3]/25 focus:border-[#E3A144]/35"
              />

              <select
                value={
                  territorioAtivo
                }
                onChange={(
                  evento,
                ) =>
                  setTerritorioAtivo(
                    evento.target
                      .value,
                  )
                }
                className="min-h-[50px] rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#EDEDE3] outline-none focus:border-[#E3A144]/35"
              >
                <option value="">
                  {
                    t.feed
                      .allTerritories
                  }
                </option>

                {estado.tipo ===
                  'pronto' &&
                  estado.territorios.map(
                    (
                      territorio,
                    ) => (
                      <option
                        key={
                          territorio.id
                        }
                        value={
                          territorio.id
                        }
                      >
                        {
                          territorio.nome
                        }
                      </option>
                    ),
                  )}
              </select>

              <button
                type="submit"
                className="min-h-[50px] rounded-xl bg-[#E3A144] px-6 text-sm font-bold text-[#07130F] transition hover:bg-[#F0B35C]"
              >
                Buscar
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setCategoriaAtiva(
                    '',
                  )
                }
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  categoriaAtiva ===
                  ''
                    ? 'border-[#E3A144]/45 bg-[#E3A144]/12 text-[#F4C77E]'
                    : 'border-white/10 bg-white/[0.025] text-[#EDEDE3]/50 hover:bg-white/[0.05]'
                }`}
              >
                {
                  t.feed
                    .allCategories
                }
              </button>

              {estado.tipo ===
                'pronto' &&
                estado.categorias.map(
                  (
                    categoria,
                  ) => (
                    <button
                      key={
                        categoria.id
                      }
                      type="button"
                      onClick={() =>
                        setCategoriaAtiva(
                          categoria.id,
                        )
                      }
                      className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                        categoriaAtiva ===
                        categoria.id
                          ? 'border-[#E3A144]/45 bg-[#E3A144]/12 text-[#F4C77E]'
                          : 'border-white/10 bg-white/[0.025] text-[#EDEDE3]/50 hover:bg-white/[0.05]'
                      }`}
                    >
                      {nomeCategoria(
                        categoria,
                      )}
                    </button>
                  ),
                )}
            </div>

            {(buscaAplicada ||
              categoriaAtiva ||
              territorioAtivo) && (
              <button
                type="button"
                onClick={
                  limparFiltros
                }
                className="mt-4 text-xs font-semibold text-[#E3A144] hover:underline"
              >
                {
                  t.feed.clear
                }
              </button>
            )}
          </div>

          {avisoSocial && (
            <div
              role="status"
              className="mt-5 flex flex-col gap-3 rounded-xl border border-[#E3A144]/20 bg-[#E3A144]/[0.05] px-4 py-3 text-sm text-[#F4C77E] sm:flex-row sm:items-center sm:justify-between"
            >
              <span>
                {avisoSocial}
              </span>

              <Link
                href="/acesso"
                className="shrink-0 font-semibold underline underline-offset-4"
              >
                {t.hero.join}
              </Link>
            </div>
          )}

          {/* CARREGANDO */}
          {estado.tipo ===
            'carregando' && (
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {Array.from(
                {
                  length: 4,
                },
                (
                  _,
                  indice,
                ) => (
                  <div
                    key={
                      indice
                    }
                    className="overflow-hidden rounded-[26px] border border-white/[0.08] bg-[#0A1713] motion-safe:animate-pulse"
                  >
                    <div className="aspect-[16/10] bg-white/[0.05]" />

                    <div className="p-6">
                      <div className="h-4 w-32 rounded bg-white/[0.07]" />

                      <div className="mt-5 h-7 w-4/5 rounded bg-white/[0.07]" />

                      <div className="mt-3 h-4 w-full rounded bg-white/[0.04]" />

                      <div className="mt-2 h-4 w-3/4 rounded bg-white/[0.04]" />
                    </div>
                  </div>
                ),
              )}
            </div>
          )}

          {/* ERRO */}
          {estado.tipo ===
            'erro' && (
            <div className="mt-10 rounded-[24px] border border-rose-400/20 bg-[#0A1713] p-7">
              <h3
                className="text-2xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {
                  t.feed
                    .errorTitle
                }
              </h3>

              <p className="mt-3 text-sm leading-6 text-[#EDEDE3]/48">
                {estado.mensagem}
              </p>

              <button
                type="button"
                onClick={() =>
                  setRevisao(
                    (
                      valor,
                    ) =>
                      valor + 1,
                  )
                }
                className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-xs font-semibold text-[#EDEDE3]/70"
              >
                {
                  t.feed.retry
                }
              </button>
            </div>
          )}

          {/* VAZIO */}
          {estado.tipo ===
            'pronto' &&
            estado.publicacoes
              .length === 0 && (
              <div className="mt-10 overflow-hidden rounded-[28px] border border-[#E3A144]/18 bg-[#0A1713]">
                <div className="grid lg:grid-cols-[1fr_0.7fr]">
                  <div className="p-7 md:p-10">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                      {
                        t.feed
                          .editorial
                      }
                    </span>

                    <h3
                      className="mt-4 max-w-[620px] text-3xl leading-[1.1] text-[#F0F0E8] md:text-4xl"
                      style={{
                        fontFamily:
                          'var(--font-fraunces), serif',
                      }}
                    >
                      {
                        t.feed
                          .noPostsTitle
                      }
                    </h3>

                    <p className="mt-5 max-w-[620px] text-sm leading-7 text-[#EDEDE3]/50">
                      {
                        t.feed
                          .noPostsDescription
                      }
                    </p>
                  </div>

                  <div className="flex min-h-[240px] items-center justify-center border-t border-white/[0.07] bg-gradient-to-br from-[#173025] to-[#08130F] p-8 lg:border-l lg:border-t-0">
                    <div className="text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#E3A144]/25 bg-[#E3A144]/10 text-2xl text-[#E3A144]">
                        ✦
                      </div>

                      <p className="mt-4 text-sm font-semibold text-[#F0F0E8]">
                        Encantos Rio
                        Negro
                      </p>

                      <p className="mt-1 text-xs text-[#EDEDE3]/35">
                        Perfil editorial
                        verificado
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* DESTAQUE */}
          {estado.tipo ===
            'pronto' &&
            destaque && (
              <article
                id={
                  destaque.slug
                }
                className="mt-10 scroll-mt-28 overflow-hidden rounded-[30px] border border-[#E3A144]/18 bg-[#0A1713]"
              >
                <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
                  <div className="relative min-h-[360px] overflow-hidden bg-gradient-to-br from-[#173025] via-[#0D1B16] to-[#07110E] lg:min-h-[620px]">
                    {imagemPrincipal(
                      destaque,
                    ) && (
                      <img
                        src={
                          imagemPrincipal(
                            destaque,
                          ) ??
                          ''
                        }
                        alt={
                          destaque
                            .midias[0]
                            ?.alt_text ??
                          ''
                        }
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#07110E]/80 via-transparent to-transparent" />

                    <div className="absolute left-5 top-5 rounded-full border border-[#E3A144]/25 bg-[#07110E]/75 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#F4C77E] backdrop-blur">
                      {
                        t.feed
                          .featured
                      }
                    </div>

                    {!imagemPrincipal(
                      destaque,
                    ) && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#E3A144]/20 bg-[#E3A144]/10 text-3xl text-[#E3A144]">
                            ✦
                          </div>

                          <p className="mt-4 text-sm text-[#EDEDE3]/35">
                            Rio Negro
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col p-6 md:p-8 lg:p-10">
                    {renderAutor(
                      destaque,
                    )}

                    <div className="mt-8 flex flex-wrap items-center gap-2">
                      {destaque.categoria && (
                        <span className="rounded-full border border-[#E3A144]/20 bg-[#E3A144]/8 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F4C77E]">
                          {nomeCategoria(
                            destaque.categoria,
                          )}
                        </span>
                      )}

                      {destaque.territorio && (
                        <span className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-[#EDEDE3]/40">
                          {
                            destaque
                              .territorio
                              .nome
                          }
                        </span>
                      )}
                    </div>

                    <h2
                      className="mt-6 text-4xl leading-[1.06] text-[#F0F0E8]"
                      style={{
                        fontFamily:
                          'var(--font-fraunces), serif',
                      }}
                    >
                      {
                        destaque.titulo
                      }
                    </h2>

                    {destaque.resumo && (
                      <p className="mt-5 text-sm leading-7 text-[#EDEDE3]/55">
                        {
                          destaque.resumo
                        }
                      </p>
                    )}

                    {destaque.conteudo && (
                      <p className="mt-5 line-clamp-5 text-sm leading-7 text-[#EDEDE3]/42">
                        {
                          destaque.conteudo
                        }
                      </p>
                    )}

                    <div className="mt-auto pt-8">
                      {renderAcoes(
                        destaque,
                      )}
                    </div>
                  </div>
                </div>
              </article>
            )}

          {/* PUBLICAÇÕES */}
          {estado.tipo ===
            'pronto' &&
            demaisPublicacoes
              .length > 0 && (
              <div className="mt-16">
                <h3
                  className="text-3xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  {t.feed.latest}
                </h3>

                <div className="mt-7 grid gap-5 md:grid-cols-2">
                  {demaisPublicacoes.map(
                    (
                      publicacao,
                    ) => {
                      const imagem =
                        imagemPrincipal(
                          publicacao,
                        );

                      return (
                        <article
                          key={
                            publicacao.id
                          }
                          id={
                            publicacao.slug
                          }
                          className="scroll-mt-28 overflow-hidden rounded-[26px] border border-white/[0.08] bg-[#0A1713]"
                        >
                          {imagem && (
                            <div className="relative aspect-[16/10] overflow-hidden bg-[#07110E]">
                              <img
                                src={
                                  imagem
                                }
                                alt={
                                  publicacao
                                    .midias[0]
                                    ?.alt_text ??
                                  ''
                                }
                                className="h-full w-full object-cover transition duration-700 hover:scale-[1.025]"
                              />

                              <div className="absolute inset-0 bg-gradient-to-t from-[#07110E]/65 via-transparent to-transparent" />
                            </div>
                          )}

                          <div className="p-5 md:p-6">
                            {renderAutor(
                              publicacao,
                              true,
                            )}

                            <div className="mt-5 flex flex-wrap gap-2">
                              {publicacao.categoria && (
                                <span className="rounded-full border border-[#E3A144]/15 bg-[#E3A144]/[0.06] px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#E3A144]">
                                  {nomeCategoria(
                                    publicacao.categoria,
                                  )}
                                </span>
                              )}

                              {publicacao.territorio && (
                                <span className="rounded-full border border-white/[0.07] px-3 py-1 text-[9px] uppercase tracking-[0.12em] text-[#EDEDE3]/35">
                                  {
                                    publicacao
                                      .territorio
                                      .nome
                                  }
                                </span>
                              )}
                            </div>

                            <h3
                              className="mt-5 text-2xl leading-tight text-[#F0F0E8]"
                              style={{
                                fontFamily:
                                  'var(--font-fraunces), serif',
                              }}
                            >
                              {
                                publicacao.titulo
                              }
                            </h3>

                            {publicacao.resumo && (
                              <p className="mt-3 line-clamp-3 text-sm leading-7 text-[#EDEDE3]/50">
                                {
                                  publicacao.resumo
                                }
                              </p>
                            )}

                            <div className="mt-6">
                              {renderAcoes(
                                publicacao,
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    },
                  )}
                </div>
              </div>
            )}
        </div>
      </section>

      {/* ENTRAR NA REDE */}
      <section className="border-y border-white/[0.07] bg-[#101D17] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
              {t.join.eyebrow}
            </span>

            <h2
              className="mt-5 max-w-[540px] text-4xl leading-[1.05] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              {t.join.title}
            </h2>

            <p className="mt-6 max-w-[540px] text-sm leading-7 text-[#EDEDE3]/50">
              {t.join.description}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Link
              href="/acesso?acesso=operadora"
              className="group rounded-[22px] border border-white/[0.08] bg-[#0A1713] p-6 transition hover:border-[#E3A144]/25"
            >
              <span className="text-xl text-[#E3A144]">
                ◇
              </span>

              <h3
                className="mt-7 text-2xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {
                  t.join
                    .operator
                }
              </h3>

              <span className="mt-7 inline-flex text-sm font-semibold text-[#E3A144] transition group-hover:translate-x-1">
                →
              </span>
            </Link>

            <Link
              href="/acesso?acesso=guia"
              className="group rounded-[22px] border border-white/[0.08] bg-[#0A1713] p-6 transition hover:border-[#E3A144]/25"
            >
              <span className="text-xl text-[#E3A144]">
                ◇
              </span>

              <h3
                className="mt-7 text-2xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {
                  t.join.guide
                }
              </h3>

              <span className="mt-7 inline-flex text-sm font-semibold text-[#E3A144] transition group-hover:translate-x-1">
                →
              </span>
            </Link>

            <Link
              href="/acesso?acesso=fornecedor"
              className="group rounded-[22px] border border-white/[0.08] bg-[#0A1713] p-6 transition hover:border-[#E3A144]/25"
            >
              <span className="text-xl text-[#E3A144]">
                ◇
              </span>

              <h3
                className="mt-7 text-2xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {
                  t.join
                    .supplier
                }
              </h3>

              <span className="mt-7 inline-flex text-sm font-semibold text-[#E3A144] transition group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.07] bg-[#07100D] px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-3 text-xs text-[#EDEDE3]/35 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {t.footer.left}
          </span>

          <span>
            {t.footer.right}
          </span>
        </div>
      </footer>
    </div>
  );
}
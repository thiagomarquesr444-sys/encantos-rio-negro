'use client';

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import { supabase } from '@/lib/supabase';

import {
  CATEGORIAS_DEMANDA,
  PUBLICOS_ALVO,
  STATUS_DEMANDA,
  TIPOS_COMBUSTIVEL,
  ehCategoriaDemanda,
  ehStatusDemanda,
  listarDemandas,
  mensagemErroDemandas,
  obterContextoDemandas,
  type CategoriaDemanda,
  type ContextoDemandas,
  type Demanda,
  type PaginaDemandas,
  type StatusDemanda,
} from '@/lib/demandas';

type Consulta = {
  data_inicio_de?: string;
  data_inicio_ate?: string;
  busca: string;
  categoria: CategoriaDemanda | '';
  status: StatusDemanda | '';
  pagina: number;
};

type Estado =
  | { tipo: 'carregando' }
  | {
      tipo: 'erro';
      mensagem: string;
    }
  | {
      tipo: 'pronto';
      contexto: ContextoDemandas;
      resultado: PaginaDemandas;
    };

const CONSULTA_INICIAL: Consulta = {
  busca: '',
  categoria: '',
  status: '',
  pagina: 0,
};

const ESTILOS_STATUS: Record<
  StatusDemanda,
  string
> = {
  rascunho:
    'border-slate-400/20 bg-slate-400/10 text-[var(--ern-secundario)]',

  aberta:
    'border-emerald-400/20 bg-emerald-400/10 text-[var(--ern-sucesso)]',

  encerrada:
    'border-cyan-400/20 bg-cyan-400/10 text-[var(--ern-destaque)]',

  cancelada:
    'border-rose-400/20 bg-rose-400/10 text-[var(--ern-erro)]',
};

const CAMPO =
  'min-h-12 w-full rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] ' +
  'px-4 text-sm text-[var(--ern-texto)] outline-none transition-colors ' +
  'placeholder:text-[var(--ern-secundario)] focus:border-[var(--ern-destaque)] ' +
  'focus:ring-2 focus:ring-[var(--ern-destaque)] motion-reduce:transition-none';

const BOTAO =
  'inline-flex min-h-12 items-center justify-center rounded-xl ' +
  'border border-[var(--ern-borda)] px-5 text-sm font-semibold text-[var(--ern-texto)] ' +
  'transition-colors hover:bg-[var(--ern-suave)] [&:focus-visible]:[outline-style:solid] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-4 ' +
  'focus-visible:outline-[var(--ern-destaque)] disabled:cursor-not-allowed ' +
  'disabled:opacity-40 motion-reduce:transition-none';

const formatadorQuantidade =
  new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
  });

function formatarData(
  data: string | null,
): string {
  if (!data) {
    return 'Não informado';
  }

  const partes = data.split('-');

  if (partes.length !== 3) {
    return 'Data indisponível';
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function detalheEstimativa(
  demanda: Demanda,
): string | null {
  if (
    demanda.metodo_estimativa ===
      'pessoa_dia' &&
    demanda.pessoas_estimadas !==
      null &&
    demanda.dias_estimados !==
      null &&
    demanda.consumo_pessoa_dia !==
      null
  ) {
    const publico =
      demanda.publico_alvo
        ? PUBLICOS_ALVO[
            demanda.publico_alvo
          ]
        : 'Público não informado';

    return `${publico} • ${demanda.pessoas_estimadas} pessoas × ${demanda.dias_estimados} dias × ${formatadorQuantidade.format(
      demanda.consumo_pessoa_dia,
    )} ${demanda.unidade}/pessoa/dia`;
  }

  if (
    demanda.metodo_estimativa ===
      'combustivel_hora' &&
    demanda.tipo_combustivel &&
    demanda.dias_estimados !==
      null &&
    demanda.horas_motor_dia !==
      null &&
    demanda.consumo_litros_hora !==
      null
  ) {
    return `${
      TIPOS_COMBUSTIVEL[
        demanda.tipo_combustivel
      ]
    } • ${demanda.dias_estimados} dias × ${formatadorQuantidade.format(
      demanda.horas_motor_dia,
    )} h/dia × ${formatadorQuantidade.format(
      demanda.consumo_litros_hora,
    )} L/h + ${formatadorQuantidade.format(
      demanda.margem_percentual,
    )}% de margem`;
  }

  return null;
}

function SkeletonDemandas() {
  return (
    <div
      role="status"
      aria-label="Carregando demandas"
    >
      <span className="sr-only">
        Carregando demandas...
      </span>

      <div
        aria-hidden="true"
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {Array.from(
          { length: 6 },
          (_, indice) => (
            <div
              key={indice}
              className="rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-6 motion-safe:animate-pulse"
            >
              <div className="h-5 w-24 rounded bg-[var(--ern-suave)]" />
              <div className="mt-6 h-6 w-3/4 rounded bg-[var(--ern-suave)]" />
              <div className="mt-3 h-4 w-1/2 rounded bg-[var(--ern-suave)]" />
              <div className="mt-6 h-4 w-full rounded bg-[var(--ern-suave)]" />
              <div className="mt-3 h-4 w-4/5 rounded bg-[var(--ern-suave)]" />
              <div className="mt-6 h-12 rounded-xl bg-[var(--ern-suave)]" />
            </div>
          ),
        )}
      </div>
    </div>
  );
}

// ERN_DEMANDAS_FILTRO_DASHBOARD
function consultaDaURL(parametros: string): Consulta {
  const url = new URLSearchParams(parametros);
  const status = url.get('status') ?? '';

  return {
    ...CONSULTA_INICIAL,
    status: ehStatusDemanda(status) ? status : '',
    data_inicio_de: url.get('inicio') || undefined,
    data_inicio_ate: url.get('fim') || undefined,
  };
}

export default function DemandasPage() {
  return (
    <Suspense fallback={<p role="status" className="p-6">Carregando demandas…</p>}>
      <DemandasComParametros />
    </Suspense>
  );
}

function DemandasComParametros() {
  const parametros = useSearchParams().toString();

  return (
    <DemandasConteudo
      key={parametros}
      parametros={parametros}
    />
  );
}

function DemandasConteudo({ parametros }: { parametros: string }) {
  const [
    rascunhoBusca,
    setRascunhoBusca,
  ] = useState('');

  const [
    consulta,
    setConsulta,
  ] = useState<Consulta>(() => consultaDaURL(parametros));

  const [estado, setEstado] =
    useState<Estado>({
      tipo: 'carregando',
    });

  const [revisao, setRevisao] =
    useState(0);

  const requisicaoAtual =
    useRef<AbortController | null>(
      null,
    );

  useEffect(() => {
    const { data } =
      supabase.auth.onAuthStateChange(
        (evento) => {
          if (
            evento ===
              'SIGNED_OUT' ||
            evento ===
              'SIGNED_IN' ||
            evento ===
              'USER_UPDATED'
          ) {
            requisicaoAtual.current?.abort();

            setEstado({
              tipo: 'carregando',
            });

            setRevisao(
              (valor) => valor + 1,
            );
          }
        },
      );

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const controller =
      new AbortController();

    requisicaoAtual.current =
      controller;

    let ativo = true;

    setEstado({
      tipo: 'carregando',
    });

    const timeout =
      window.setTimeout(() => {
        if (
          !ativo ||
          controller.signal.aborted
        ) {
          return;
        }

        controller.abort();

        setEstado({
          tipo: 'erro',
          mensagem:
            'A consulta demorou mais que o esperado. Verifique sua conexão e tente novamente.',
        });
      }, 20000);

    async function carregar(): Promise<void> {
      try {
        const contexto =
          await obterContextoDemandas(
            controller.signal,
          );

        if (
          !ativo ||
          controller.signal.aborted
        ) {
          return;
        }

        const resultado =
          await listarDemandas(
            contexto,
            consulta,
            controller.signal,
          );

        if (
          !ativo ||
          controller.signal.aborted
        ) {
          return;
        }

        const ultimaPagina =
          Math.max(
            resultado.total_paginas -
              1,
            0,
          );

        if (
          consulta.pagina >
          ultimaPagina
        ) {
          setConsulta(
            (anterior) => ({
              ...anterior,
              pagina:
                ultimaPagina,
            }),
          );

          return;
        }

        setEstado({
          tipo: 'pronto',
          contexto,
          resultado,
        });
      } catch (erro: unknown) {
        if (
          !ativo ||
          controller.signal.aborted
        ) {
          return;
        }

        setEstado({
          tipo: 'erro',
          mensagem:
            mensagemErroDemandas(
              erro,
            ),
        });
      } finally {
        window.clearTimeout(
          timeout,
        );
      }
    }

    void carregar();

    return () => {
      ativo = false;

      controller.abort();

      window.clearTimeout(timeout);

      if (
        requisicaoAtual.current ===
        controller
      ) {
        requisicaoAtual.current =
          null;
      }
    };
  }, [consulta, revisao]);

  function alterarConsulta(
    proxima: Consulta,
  ): void {
    requisicaoAtual.current?.abort();

    setEstado({
      tipo: 'carregando',
    });

    setConsulta(proxima);
  }

  function atualizar(): void {
    requisicaoAtual.current?.abort();

    setEstado({
      tipo: 'carregando',
    });

    setRevisao(
      (valor) => valor + 1,
    );
  }

  function buscar(
    evento: FormEvent<HTMLFormElement>,
  ): void {
    evento.preventDefault();

    alterarConsulta({
      ...consulta,
      busca:
        rascunhoBusca.trim(),
      pagina: 0,
    });
  }

  function limparFiltros(): void {
    setRascunhoBusca('');

    alterarConsulta({
      ...CONSULTA_INICIAL,
    });
  }

  const carregando =
    estado.tipo ===
    'carregando';

  const resultado =
    estado.tipo === 'pronto'
      ? estado.resultado
      : null;

  const podeGerenciar =
    estado.tipo === 'pronto' &&
    estado.contexto
      .pode_gerenciar;

  const temFiltros =
    consulta.busca !== '' ||
    consulta.categoria !== '' ||
    consulta.status !== '' ||
    Boolean(consulta.data_inicio_de || consulta.data_inicio_ate);

  return (
    <main className="min-h-screen bg-[var(--ern-fundo)] text-[var(--ern-texto)]">
      <header className="border-b border-[var(--ern-borda)] bg-[var(--ern-painel)]">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-5 md:px-8 md:py-10">
          <Link
            href="/dashboard"
            className="text-sm text-[var(--ern-secundario)] transition-colors hover:text-[var(--ern-texto)] [&:focus-visible]:[outline-style:solid] focus-visible:outline-2 focus-visible:outline-[var(--ern-destaque)]"
          >
            ← Dashboard
          </Link>

          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--ern-destaque)]">
                Oferta e demanda
              </p>

              <h1
                className="mt-2 text-4xl tracking-tight md:text-5xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Demandas
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ern-secundario)]">
                Planeje alimentação,
                bebidas, combustível e
                os demais recursos
                necessários para a
                operação turística.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={atualizar}
                disabled={carregando}
                className={BOTAO}
              >
                {carregando
                  ? 'Carregando...'
                  : 'Atualizar'}
              </button>

              {podeGerenciar && (
                <Link
                  href="/demandas/nova"
                  className={`${BOTAO} border-[var(--ern-destaque)] bg-[var(--ern-botao)] text-[var(--ern-sobre-botao)] hover:bg-[var(--ern-botao)]`}
                >
                  <span
                    aria-hidden="true"
                    className="mr-2 text-lg leading-none"
                  >
                    +
                  </span>
                  Nova demanda
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-5 md:px-8 md:py-8">
        {(consulta.data_inicio_de || consulta.data_inicio_ate) && (
          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--ern-destaque)] bg-[var(--ern-suave)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-[var(--ern-texto)]">
              Filtro do dashboard — início da demanda:
              {' '}{formatarData(consulta.data_inicio_de ?? null)}
              {' até '}
              {formatarData(consulta.data_inicio_ate ?? null)}.
            </p>
            <button
              type="button"
              className={BOTAO}
              onClick={() => alterarConsulta({
                ...consulta,
                data_inicio_de: undefined,
                data_inicio_ate: undefined,
                pagina: 0,
              })}
            >
              Remover período
            </button>
          </div>
        )}

        <form
          onSubmit={buscar}
          aria-label="Filtrar demandas"
          className="rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-4 sm:p-5"
        >
          <div className="grid items-end gap-4 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_auto]">
            <div>
              <label
                htmlFor="busca-demanda"
                className="mb-2 block text-sm text-[var(--ern-secundario)]"
              >
                Buscar por título
              </label>

              <input
                id="busca-demanda"
                type="search"
                maxLength={160}
                value={rascunhoBusca}
                onChange={(
                  evento,
                ) =>
                  setRascunhoBusca(
                    evento.target
                      .value,
                  )
                }
                placeholder="Ex.: combustível da viagem"
                className={CAMPO}
              />
            </div>

            <div>
              <label
                htmlFor="categoria-demanda"
                className="mb-2 block text-sm text-[var(--ern-secundario)]"
              >
                Categoria
              </label>

              <select
                id="categoria-demanda"
                value={
                  consulta.categoria
                }
                onChange={(
                  evento,
                ) => {
                  const valor =
                    evento.target
                      .value;

                  if (
                    valor === '' ||
                    ehCategoriaDemanda(
                      valor,
                    )
                  ) {
                    alterarConsulta({
                      ...consulta,
                      categoria:
                        valor,
                      pagina: 0,
                    });
                  }
                }}
                className={CAMPO}
              >
                <option value="">
                  Todas as categorias
                </option>

                {Object.entries(
                  CATEGORIAS_DEMANDA,
                ).map(
                  ([valor, nome]) => (
                    <option
                      key={valor}
                      value={valor}
                    >
                      {nome}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="status-demanda"
                className="mb-2 block text-sm text-[var(--ern-secundario)]"
              >
                Status
              </label>

              <select
                id="status-demanda"
                value={consulta.status}
                onChange={(
                  evento,
                ) => {
                  const valor =
                    evento.target
                      .value;

                  if (
                    valor === '' ||
                    ehStatusDemanda(
                      valor,
                    )
                  ) {
                    alterarConsulta({
                      ...consulta,
                      status:
                        valor,
                      pagina: 0,
                    });
                  }
                }}
                className={CAMPO}
              >
                <option value="">
                  Todos os status
                </option>

                {Object.entries(
                  STATUS_DEMANDA,
                ).map(
                  ([valor, nome]) => (
                    <option
                      key={valor}
                      value={valor}
                    >
                      {nome}
                    </option>
                  ),
                )}
              </select>
            </div>

            <button
              type="submit"
              className={`${BOTAO} border-[var(--ern-destaque)] bg-[var(--ern-suave)] text-[var(--ern-destaque)] hover:bg-[var(--ern-suave)]`}
            >
              Buscar
            </button>
          </div>

          {temFiltros && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[var(--ern-secundario)]">
                {consulta.busca
                  ? `Busca aplicada: “${consulta.busca}”`
                  : 'Filtros aplicados à consulta.'}
              </p>

              <button
                type="button"
                onClick={limparFiltros}
                className="rounded px-2 py-2 text-sm font-semibold text-[var(--ern-destaque)] hover:underline"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </form>

        <section
          aria-label="Resultados da consulta"
          aria-busy={carregando}
        >
          {carregando && (
            <SkeletonDemandas />
          )}

          {estado.tipo ===
            'erro' && (
            <div className="rounded-2xl border border-rose-400/20 bg-[var(--ern-painel)] p-6 md:p-8">
              <h2 className="text-xl font-semibold text-[var(--ern-erro)]">
                Não foi possível
                carregar as demandas
              </h2>

              <p className="mt-3 text-sm leading-6 text-[var(--ern-secundario)]">
                {estado.mensagem}
              </p>

              <button
                type="button"
                onClick={atualizar}
                className={`${BOTAO} mt-6`}
              >
                Tentar novamente
              </button>
            </div>
          )}

          {estado.tipo ===
            'pronto' &&
            resultado && (
              <div>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-[var(--ern-secundario)]">
                    <strong className="text-[var(--ern-texto)]">
                      {resultado.total}
                    </strong>{' '}
                    {resultado.total ===
                    1
                      ? 'demanda encontrada'
                      : 'demandas encontradas'}
                  </p>

                  {!estado.contexto
                    .pode_gerenciar && (
                    <span className="rounded-full border border-[var(--ern-borda)] px-3 py-1 text-xs text-[var(--ern-secundario)]">
                      Seu perfil permite
                      apenas consulta
                    </span>
                  )}
                </div>

                {resultado.registros
                  .length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--ern-borda)] bg-[var(--ern-painel)] px-6 py-14 text-center">
                    <h2
                      className="text-2xl text-[var(--ern-texto)]"
                      style={{
                        fontFamily:
                          'var(--font-fraunces), serif',
                      }}
                    >
                      Nenhuma demanda
                      encontrada
                    </h2>

                    <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--ern-secundario)]">
                      Registre as
                      necessidades da
                      próxima operação
                      para reduzir
                      imprevistos durante
                      a viagem.
                    </p>
                  </div>
                ) : (
                  <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {resultado.registros.map(
                      (demanda) => {
                        const detalhe =
                          detalheEstimativa(
                            demanda,
                          );

                        return (
                          <li
                            key={
                              demanda.id
                            }
                            className="min-w-0"
                          >
                            <article className="flex h-full flex-col rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-5 transition-colors hover:border-[var(--ern-destaque)] sm:p-6">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <span className="text-xs font-semibold text-[var(--ern-destaque)]">
                                  {
                                    CATEGORIAS_DEMANDA[
                                      demanda
                                        .categoria
                                    ]
                                  }
                                </span>

                                <span
                                  className={`rounded-full border px-3 py-1 text-xs ${
                                    ESTILOS_STATUS[
                                      demanda
                                        .status
                                    ]
                                  }`}
                                >
                                  {
                                    STATUS_DEMANDA[
                                      demanda
                                        .status
                                    ]
                                  }
                                </span>
                              </div>

                              <h2 className="mt-5 break-words text-xl font-semibold text-[var(--ern-texto)]">
                                {
                                  demanda.titulo
                                }
                              </h2>

                              <p className="mt-2 text-sm text-[var(--ern-secundario)]">
                                {
                                  demanda.localidade
                                }
                              </p>

                              <p className="mt-5 line-clamp-3 text-sm leading-6 text-[var(--ern-secundario)]">
                                {demanda.descricao ||
                                  'Sem descrição adicional.'}
                              </p>

                              {detalhe && (
                                <div className="mt-5 rounded-xl border border-[var(--ern-destaque)] bg-[var(--ern-suave)] p-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ern-destaque)]">
                                    Previsão
                                    calculada
                                  </p>

                                  <p className="mt-2 text-xs leading-5 text-[var(--ern-secundario)]">
                                    {
                                      detalhe
                                    }
                                  </p>
                                </div>
                              )}

                              <dl className="mt-auto space-y-3 pt-6">
                                <div className="rounded-xl bg-[var(--ern-suave)] px-4 py-3">
                                  <dt className="text-xs text-[var(--ern-secundario)]">
                                    Quantidade
                                    prevista
                                  </dt>

                                  <dd className="mt-1 text-sm font-semibold">
                                    {formatadorQuantidade.format(
                                      demanda.quantidade,
                                    )}{' '}
                                    {
                                      demanda.unidade
                                    }
                                  </dd>
                                </div>

                                <div className="rounded-xl bg-[var(--ern-suave)] px-4 py-3">
                                  <dt className="text-xs text-[var(--ern-secundario)]">
                                    Período
                                  </dt>

                                  <dd className="mt-1 text-sm">
                                    {demanda.data_inicio &&
                                    demanda.data_fim
                                      ? `${formatarData(
                                          demanda.data_inicio,
                                        )} a ${formatarData(
                                          demanda.data_fim,
                                        )}`
                                      : 'Não informado'}
                                  </dd>
                                </div>
                              </dl>

                              {estado.contexto
                                .pode_gerenciar && (
                                <Link
                                  href={`/demandas/editar/${demanda.id}`}
                                  className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--ern-destaque)] bg-[var(--ern-suave)] px-4 text-sm font-semibold text-[var(--ern-destaque)] transition hover:bg-[var(--ern-suave)]"
                                >
                                  Gerenciar
                                  demanda →
                                </Link>
                              )}
                            </article>
                          </li>
                        );
                      },
                    )}
                  </ul>
                )}

                {resultado.total >
                  0 && (
                  <nav className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <p className="text-sm text-[var(--ern-secundario)]">
                      Página{' '}
                      {resultado.pagina +
                        1}{' '}
                      de{' '}
                      {
                        resultado.total_paginas
                      }
                    </p>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        disabled={
                          resultado.pagina ===
                          0
                        }
                        onClick={() =>
                          alterarConsulta({
                            ...consulta,
                            pagina:
                              Math.max(
                                resultado.pagina -
                                  1,
                                0,
                              ),
                          })
                        }
                        className={
                          BOTAO
                        }
                      >
                        Anterior
                      </button>

                      <button
                        type="button"
                        disabled={
                          resultado.pagina +
                            1 >=
                          resultado.total_paginas
                        }
                        onClick={() =>
                          alterarConsulta({
                            ...consulta,
                            pagina:
                              resultado.pagina +
                              1,
                          })
                        }
                        className={
                          BOTAO
                        }
                      >
                        Próxima
                      </button>
                    </div>
                  </nav>
                )}
              </div>
            )}
        </section>
      </div>
    </main>
  );
}
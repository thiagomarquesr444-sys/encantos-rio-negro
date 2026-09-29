'use client';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';

import { supabase } from '@/lib/supabase';

type StatusRelatorio =
  | 'Concluído'
  | 'Pendente'
  | 'Em Análise';

interface Relatorio {
  id?: string;
  titulo?: string | null;
  tipo?: string | null;
  data_geracao?: string | null;
  gerado_por?: string | null;
  status?: string | null;
  created_at?: string | null;
}

type Feedback = {
  tipo:
    | 'sucesso'
    | 'erro';

  texto: string;
};

/*
  ============================================================
  STATUS
  ============================================================
*/

function removerAcentos(
  valor: string
) {
  return valor
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    );
}

function normalizarStatus(
  valor?: string | null
): StatusRelatorio {
  const status =
    removerAcentos(
      (
        valor ||
        ''
      )
        .trim()
        .toLowerCase()
    );

  if (
    status ===
      'pendente'
  ) {
    return 'Pendente';
  }

  if (
    status ===
      'em analise'
  ) {
    return 'Em Análise';
  }

  return 'Concluído';
}

/*
  ============================================================
  DATA
  ============================================================
*/

function formatarData(
  valor?: string | null
) {
  if (!valor) {
    return '—';
  }

  const data =
    valor.split(
      'T'
    )[0];

  const partes =
    data.split('-');

  if (
    partes.length !== 3
  ) {
    return valor;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

/*
  ============================================================
  CSV
  ============================================================
*/

function escaparCSV(
  valor:
    | string
    | null
    | undefined
) {
  return `"${String(
    valor || ''
  ).replace(
    /"/g,
    '""'
  )}"`;
}

export default function RelatoriosPage() {
  const [
    relatorios,
    setRelatorios,
  ] =
    useState<Relatorio[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    busca,
    setBusca,
  ] =
    useState('');

  const [
    filtroStatus,
    setFiltroStatus,
  ] =
    useState<
      '' | StatusRelatorio
    >('');

  const [
    feedback,
    setFeedback,
  ] =
    useState<Feedback | null>(
      null
    );

  const [
    itemVisualizar,
    setItemVisualizar,
  ] =
    useState<Relatorio | null>(
      null
    );

  const [
    itemEditar,
    setItemEditar,
  ] =
    useState<Relatorio | null>(
      null
    );

  const [
    itemExcluir,
    setItemExcluir,
  ] =
    useState<Relatorio | null>(
      null
    );

  const [
    salvando,
    setSalvando,
  ] =
    useState(false);

  const [
    excluindo,
    setExcluindo,
  ] =
    useState(false);

  const inputClass =
    'w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm text-[#EDEDE3] outline-none transition placeholder:text-[#EDEDE3]/20 focus:border-[#E3A144]/40 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-50';

  const labelClass =
    'mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/34';

  /*
    ============================================================
    CARREGAMENTO
    ============================================================
  */

  async function fetchRelatorios() {
    setLoading(true);
    setFeedback(null);

    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            'relatorios'
          )
          .select('*')
          .order(
            'created_at',
            {
              ascending:
                false,
            }
          );

      if (error) {
        throw error;
      }

      setRelatorios(
        (
          data ||
          []
        ) as Relatorio[]
      );
    } catch (error) {
      console.error(
        'Erro ao buscar relatórios:',
        error
      );

      setRelatorios([]);

      setFeedback({
        tipo:
          'erro',

        texto:
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os relatórios.',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRelatorios();
  }, []);

  function mostrarSucesso(
    texto: string
  ) {
    setFeedback({
      tipo:
        'sucesso',

      texto,
    });

    window.setTimeout(
      () => {
        setFeedback(
          (
            atual
          ) =>
            atual?.tipo ===
            'sucesso'
              ? null
              : atual
        );
      },
      3000
    );
  }

  /*
    ============================================================
    MÉTRICAS
    ============================================================
  */

  const total =
    relatorios.length;

  const concluidos =
    relatorios.filter(
      (
        item
      ) =>
        normalizarStatus(
          item.status
        ) ===
        'Concluído'
    ).length;

  const pendentes =
    relatorios.filter(
      (
        item
      ) =>
        normalizarStatus(
          item.status
        ) ===
        'Pendente'
    ).length;

  const emAnalise =
    relatorios.filter(
      (
        item
      ) =>
        normalizarStatus(
          item.status
        ) ===
        'Em Análise'
    ).length;

  /*
    ============================================================
    FILTROS
    ============================================================
  */

  const relatoriosFiltrados =
    useMemo(() => {
      const termo =
        busca
          .trim()
          .toLowerCase();

      return relatorios.filter(
        (
          item
        ) => {
          const status =
            normalizarStatus(
              item.status
            );

          const atendeBusca =
            !termo ||
            String(
              item.titulo ||
              ''
            )
              .toLowerCase()
              .includes(
                termo
              ) ||
            String(
              item.tipo ||
              ''
            )
              .toLowerCase()
              .includes(
                termo
              ) ||
            String(
              item.gerado_por ||
              ''
            )
              .toLowerCase()
              .includes(
                termo
              ) ||
            status
              .toLowerCase()
              .includes(
                termo
              );

          const atendeStatus =
            !filtroStatus ||
            status ===
              filtroStatus;

          return (
            atendeBusca &&
            atendeStatus
          );
        }
      );
    }, [
      relatorios,
      busca,
      filtroStatus,
    ]);

  function alternarFiltro(
    status:
      StatusRelatorio
  ) {
    setFiltroStatus(
      (
        atual
      ) =>
        atual === status
          ? ''
          : status
    );
  }

  /*
    ============================================================
    EXPORTAÇÃO
    ============================================================
  */

  function exportarCSV() {
    if (
      relatoriosFiltrados.length ===
      0
    ) {
      setFeedback({
        tipo:
          'erro',

        texto:
          'Não existem relatórios para exportar com os filtros atuais.',
      });

      return;
    }

    const cabecalho = [
      'ID',
      'Título',
      'Tipo',
      'Data',
      'Responsável',
      'Status',
    ];

    const linhas =
      relatoriosFiltrados.map(
        (
          item
        ) => [
          escaparCSV(
            item.id
          ),

          escaparCSV(
            item.titulo
          ),

          escaparCSV(
            item.tipo
          ),

          escaparCSV(
            item.data_geracao
          ),

          escaparCSV(
            item.gerado_por
          ),

          escaparCSV(
            normalizarStatus(
              item.status
            )
          ),
        ]
      );

    const conteudo =
      [
        cabecalho.join(
          ';'
        ),

        ...linhas.map(
          (
            linha
          ) =>
            linha.join(
              ';'
            )
        ),
      ].join(
        '\n'
      );

    /*
      BOM melhora a abertura
      do CSV UTF-8 no Excel.
    */

    const blob =
      new Blob(
        [
          '\uFEFF',
          conteudo,
        ],
        {
          type:
            'text/csv;charset=utf-8;',
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        'a'
      );

    link.href =
      url;

    link.download =
      'relatorios-ern.csv';

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(
      url
    );

    mostrarSucesso(
      'Arquivo CSV gerado com sucesso.'
    );
  }

  /*
    ============================================================
    EDIÇÃO
    ============================================================
  */

  async function salvarEdicao(
    event:
      React.FormEvent
  ) {
    event.preventDefault();

    if (
      !itemEditar?.id
    ) {
      return;
    }

    const titulo =
      itemEditar.titulo
        ?.trim();

    if (!titulo) {
      setFeedback({
        tipo:
          'erro',

        texto:
          'Informe o título do relatório.',
      });

      return;
    }

    setSalvando(true);
    setFeedback(null);

    try {
      const {
        error,
      } =
        await supabase
          .from(
            'relatorios'
          )
          .update({
            titulo,

            tipo:
              itemEditar.tipo?.trim() ||
              null,

            data_geracao:
              itemEditar.data_geracao ||
              null,

            gerado_por:
              itemEditar.gerado_por?.trim() ||
              null,

            status:
              normalizarStatus(
                itemEditar.status
              ),
          })
          .eq(
            'id',
            itemEditar.id
          );

      if (error) {
        throw error;
      }

      setItemEditar(
        null
      );

      mostrarSucesso(
        'Relatório atualizado com sucesso.'
      );

      await fetchRelatorios();
    } catch (error) {
      console.error(
        'Erro ao atualizar relatório:',
        error
      );

      setFeedback({
        tipo:
          'erro',

        texto:
          error instanceof Error
            ? error.message
            : 'Não foi possível atualizar o relatório.',
      });
    } finally {
      setSalvando(false);
    }
  }

  /*
    ============================================================
    EXCLUSÃO
    ============================================================
  */

  async function confirmarExclusao() {
    if (
      !itemExcluir?.id ||
      excluindo
    ) {
      return;
    }

    setExcluindo(true);
    setFeedback(null);

    try {
      const {
        error,
      } =
        await supabase
          .from(
            'relatorios'
          )
          .delete()
          .eq(
            'id',
            itemExcluir.id
          );

      if (error) {
        throw error;
      }

      setRelatorios(
        (
          atuais
        ) =>
          atuais.filter(
            (
              item
            ) =>
              item.id !==
              itemExcluir.id
          )
      );

      setItemExcluir(
        null
      );

      mostrarSucesso(
        'Relatório excluído com sucesso.'
      );
    } catch (error) {
      console.error(
        'Erro ao excluir relatório:',
        error
      );

      setFeedback({
        tipo:
          'erro',

        texto:
          error instanceof Error
            ? error.message
            : 'Não foi possível excluir o relatório.',
      });
    } finally {
      setExcluindo(false);
    }
  }

  /*
    ============================================================
    STATUS VISUAL
    ============================================================
  */

  function statusClasses(
    status:
      StatusRelatorio
  ) {
    if (
      status ===
      'Concluído'
    ) {
      return 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300';
    }

    if (
      status ===
      'Em Análise'
    ) {
      return 'border-sky-500/20 bg-sky-500/[0.07] text-sky-300';
    }

    return 'border-amber-500/20 bg-amber-500/[0.07] text-amber-300';
  }

  function statusDot(
    status:
      StatusRelatorio
  ) {
    if (
      status ===
      'Concluído'
    ) {
      return 'bg-emerald-400';
    }

    if (
      status ===
      'Em Análise'
    ) {
      return 'bg-sky-400';
    }

    return 'bg-amber-400';
  }

  const cards = [
    {
      titulo:
        'Relatórios',

      valor:
        loading
          ? '—'
          : String(
              total
            ),

      detalhe:
        'registros da empresa',

      filtro:
        null,
    },

    {
      titulo:
        'Concluídos',

      valor:
        loading
          ? '—'
          : String(
              concluidos
            ),

      detalhe:
        'processos concluídos',

      filtro:
        'Concluído' as StatusRelatorio,
    },

    {
      titulo:
        'Pendentes',

      valor:
        loading
          ? '—'
          : String(
              pendentes
            ),

      detalhe:
        'aguardando conclusão',

      filtro:
        'Pendente' as StatusRelatorio,
    },

    {
      titulo:
        'Em análise',

      valor:
        loading
          ? '—'
          : String(
              emAnalise
            ),

      detalhe:
        'em acompanhamento',

      filtro:
        'Em Análise' as StatusRelatorio,
    },
  ];

  return (
    <div className="min-h-screen bg-[#07110E] pb-16 text-[#EDEDE3]">
      {/* =====================================================
          FEEDBACK
      ====================================================== */}

      {feedback?.tipo ===
        'sucesso' && (
        <div className="fixed left-1/2 top-[100px] z-[90] -translate-x-1/2 rounded-2xl border border-emerald-500/20 bg-[#0B2119] px-5 py-3 text-xs font-semibold text-emerald-300 shadow-2xl">
          {
            feedback.texto
          }
        </div>
      )}

      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <section className="border-b border-white/[0.07] bg-[#091510]">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-8 px-5 py-10 md:px-8 md:py-12 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-[#E3A144]" />

              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                Gestão • Relatórios
              </span>
            </div>

            <h1
              className="mt-4 text-4xl leading-none tracking-[-0.035em] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Relatórios
            </h1>

            <p className="mt-4 max-w-[720px] text-sm leading-7 text-[#EDEDE3]/42">
              Organize registros operacionais e
              gerenciais da empresa em um ambiente
              centralizado e protegido pelo seu plano.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={
                exportarCSV
              }
              disabled={
                loading
              }
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.025] px-5 text-xs font-semibold text-[#EDEDE3]/55 transition hover:bg-white/[0.055] disabled:opacity-50"
            >
              Exportar CSV
            </button>

            <Link
              href="/relatorios/novo"
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[#E3A144] px-6 text-sm font-bold text-[#07130F] transition hover:-translate-y-0.5 hover:bg-[#F0B35C]"
            >
              <span className="text-lg">
                +
              </span>

              Novo relatório
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1360px] px-5 py-8 md:px-8 md:py-10">
        {feedback?.tipo ===
          'erro' && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-5 py-4 text-xs text-red-300">
            <span>
              {
                feedback.texto
              }
            </span>

            <button
              type="button"
              onClick={() =>
                setFeedback(
                  null
                )
              }
            >
              ✕
            </button>
          </div>
        )}

        {/* ===================================================
            INDICADORES
        ==================================================== */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(
            (
              card
            ) => {
              const ativo =
                card.filtro !==
                  null &&
                filtroStatus ===
                  card.filtro;

              return (
                <button
                  type="button"
                  key={
                    card.titulo
                  }
                  onClick={() => {
                    if (
                      card.filtro
                    ) {
                      alternarFiltro(
                        card.filtro
                      );
                    }
                  }}
                  className={`rounded-[22px] border p-5 text-left transition ${
                    card.filtro
                      ? 'cursor-pointer'
                      : 'cursor-default'
                  } ${
                    ativo
                      ? 'border-[#E3A144]/35 bg-[#E3A144]/[0.08]'
                      : 'border-white/[0.075] bg-[#0A1713]'
                  }`}
                >
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                    {
                      card.titulo
                    }
                  </p>

                  <strong
                    className="mt-5 block text-4xl font-medium tracking-[-0.04em] text-[#F0F0E8]"
                    style={{
                      fontFamily:
                        'var(--font-fraunces), serif',
                    }}
                  >
                    {
                      card.valor
                    }
                  </strong>

                  <p className="mt-2 text-[11px] text-[#EDEDE3]/28">
                    {
                      card.detalhe
                    }
                  </p>
                </button>
              );
            }
          )}
        </div>

        {/* ===================================================
            LISTAGEM
        ==================================================== */}

        <section className="mt-6 overflow-hidden rounded-[26px] border border-white/[0.075] bg-[#0A1713]">
          <div className="border-b border-white/[0.065] p-5 md:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  Controle gerencial
                </p>

                <h2
                  className="mt-2 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Registros da empresa
                </h2>

                <p className="mt-2 text-xs text-[#EDEDE3]/30">
                  {
                    relatoriosFiltrados.length
                  }{' '}
                  de{' '}
                  {
                    relatorios.length
                  }{' '}
                  relatório
                  {relatorios.length !==
                  1
                    ? 's'
                    : ''}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  placeholder="Buscar título, tipo ou responsável..."
                  value={
                    busca
                  }
                  onChange={(
                    event
                  ) =>
                    setBusca(
                      event.target
                        .value
                    )
                  }
                  className="h-[44px] min-w-[310px] rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-xs text-[#EDEDE3] outline-none placeholder:text-[#EDEDE3]/22 focus:border-[#E3A144]/35"
                />

                <select
                  value={
                    filtroStatus
                  }
                  onChange={(
                    event
                  ) =>
                    setFiltroStatus(
                      event.target
                        .value as
                        | ''
                        | StatusRelatorio
                    )
                  }
                  className="h-[44px] rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-xs text-[#EDEDE3]/70 outline-none focus:border-[#E3A144]/35"
                >
                  <option value="">
                    Todos os status
                  </option>

                  <option value="Concluído">
                    Concluídos
                  </option>

                  <option value="Pendente">
                    Pendentes
                  </option>

                  <option value="Em Análise">
                    Em análise
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <Loading />
            ) : relatoriosFiltrados.length ===
              0 ? (
              <div className="flex min-h-[330px] items-center justify-center px-5 text-center">
                <div>
                  <h3
                    className="text-2xl text-[#F0F0E8]"
                    style={{
                      fontFamily:
                        'var(--font-fraunces), serif',
                    }}
                  >
                    Nenhum relatório encontrado.
                  </h3>

                  <p className="mt-2 text-xs text-[#EDEDE3]/30">
                    Ajuste os filtros ou registre um novo relatório.
                  </p>
                </div>
              </div>
            ) : (
              <table className="w-full min-w-[1000px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.012]">
                    {[
                      'Título',
                      'Tipo',
                      'Data',
                      'Responsável',
                      'Status',
                      'Ações',
                    ].map(
                      (
                        titulo
                      ) => (
                        <th
                          key={
                            titulo
                          }
                          className={`px-5 py-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/28 ${
                            titulo ===
                            'Ações'
                              ? 'text-center'
                              : ''
                          }`}
                        >
                          {
                            titulo
                          }
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.055]">
                  {relatoriosFiltrados.map(
                    (
                      item,
                      index
                    ) => {
                      const status =
                        normalizarStatus(
                          item.status
                        );

                      return (
                        <tr
                          key={
                            item.id ||
                            index
                          }
                          className="transition hover:bg-white/[0.018]"
                        >
                          <td className="px-5 py-4">
                            <p className="text-xs font-semibold text-[#EDEDE3]/82">
                              {item.titulo ||
                                '—'}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[9px] text-[#EDEDE3]/50">
                              {item.tipo ||
                                'Geral'}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/42">
                            {formatarData(
                              item.data_geracao
                            )}
                          </td>

                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/48">
                            {item.gerado_por ||
                              '—'}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[9px] font-semibold ${statusClasses(
                                status
                              )}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${statusDot(
                                  status
                                )}`}
                              />

                              {
                                status
                              }
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                title="Visualizar"
                                onClick={() =>
                                  setItemVisualizar(
                                    item
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-[#EDEDE3]/38 transition hover:text-[#E3A144]"
                              >
                                ◉
                              </button>

                              <button
                                type="button"
                                title="Editar"
                                onClick={() =>
                                  setItemEditar({
                                    ...item,

                                    status:
                                      normalizarStatus(
                                        item.status
                                      ),
                                  })
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-[#EDEDE3]/38 transition hover:text-sky-300"
                              >
                                ✎
                              </button>

                              <button
                                type="button"
                                title="Excluir"
                                onClick={() =>
                                  setItemExcluir(
                                    item
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-[#EDEDE3]/38 transition hover:text-red-300"
                              >
                                ×
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>

      {/* =====================================================
          VISUALIZAÇÃO
      ====================================================== */}

      {itemVisualizar && (
        <ModalBase
          etiqueta="Relatório"
          titulo={
            itemVisualizar.titulo ||
            'Relatório'
          }
          onClose={() =>
            setItemVisualizar(
              null
            )
          }
        >
          <div className="grid gap-3 p-6 sm:grid-cols-2">
            <Detalhe
              label="Tipo"
              valor={
                itemVisualizar.tipo ||
                'Geral'
              }
            />

            <Detalhe
              label="Status"
              valor={normalizarStatus(
                itemVisualizar.status
              )}
            />

            <Detalhe
              label="Responsável"
              valor={
                itemVisualizar.gerado_por ||
                'Não informado'
              }
            />

            <Detalhe
              label="Data"
              valor={formatarData(
                itemVisualizar.data_geracao
              )}
            />
          </div>

          <div className="flex justify-end border-t border-white/[0.07] px-6 py-4">
            <button
              type="button"
              onClick={() =>
                setItemVisualizar(
                  null
                )
              }
              className="rounded-xl bg-[#E3A144] px-5 py-2.5 text-xs font-bold text-[#07130F]"
            >
              Fechar
            </button>
          </div>
        </ModalBase>
      )}

      {/* =====================================================
          EDIÇÃO
      ====================================================== */}

      {itemEditar && (
        <ModalBase
          etiqueta="Gestão • Edição"
          titulo="Editar relatório"
          onClose={() =>
            !salvando &&
            setItemEditar(
              null
            )
          }
        >
          <form
            onSubmit={
              salvarEdicao
            }
            className="space-y-5 p-6"
          >
            <div>
              <label className={labelClass}>
                Título *
              </label>

              <input
                type="text"
                required
                disabled={
                  salvando
                }
                value={
                  itemEditar.titulo ||
                  ''
                }
                onChange={(
                  event
                ) =>
                  setItemEditar({
                    ...itemEditar,

                    titulo:
                      event.target
                        .value,
                  })
                }
                className={
                  inputClass
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Tipo
                </label>

                <input
                  type="text"
                  disabled={
                    salvando
                  }
                  value={
                    itemEditar.tipo ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    setItemEditar({
                      ...itemEditar,

                      tipo:
                        event.target
                          .value,
                    })
                  }
                  className={
                    inputClass
                  }
                />
              </div>

              <div>
                <label className={labelClass}>
                  Responsável
                </label>

                <input
                  type="text"
                  disabled={
                    salvando
                  }
                  value={
                    itemEditar.gerado_por ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    setItemEditar({
                      ...itemEditar,

                      gerado_por:
                        event.target
                          .value,
                    })
                  }
                  className={
                    inputClass
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Status
                </label>

                <select
                  disabled={
                    salvando
                  }
                  value={
                    normalizarStatus(
                      itemEditar.status
                    )
                  }
                  onChange={(
                    event
                  ) =>
                    setItemEditar({
                      ...itemEditar,

                      status:
                        event.target
                          .value,
                    })
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="Concluído">
                    Concluído
                  </option>

                  <option value="Pendente">
                    Pendente
                  </option>

                  <option value="Em Análise">
                    Em Análise
                  </option>
                </select>
              </div>

              <div>
                <label className={labelClass}>
                  Data
                </label>

                <input
                  type="date"
                  disabled={
                    salvando
                  }
                  value={
                    itemEditar.data_geracao?.split(
                      'T'
                    )[0] ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    setItemEditar({
                      ...itemEditar,

                      data_geracao:
                        event.target
                          .value,
                    })
                  }
                  className={
                    inputClass
                  }
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={
                  salvando
                }
                onClick={() =>
                  setItemEditar(
                    null
                  )
                }
                className="rounded-xl border border-white/[0.08] px-5 py-3 text-xs font-semibold text-[#EDEDE3]/55"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={
                  salvando
                }
                className="rounded-xl bg-[#E3A144] px-6 py-3 text-xs font-bold text-[#07130F] disabled:opacity-50"
              >
                {salvando
                  ? 'Salvando...'
                  : 'Salvar alterações'}
              </button>
            </div>
          </form>
        </ModalBase>
      )}

      {/* =====================================================
          EXCLUSÃO
      ====================================================== */}

      {itemExcluir && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[430px] rounded-[26px] border border-white/[0.09] bg-[#091510] p-6 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-red-500/20 bg-red-500/[0.08] text-red-300">
              !
            </div>

            <h3
              className="mt-4 text-2xl text-[#F0F0E8]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Excluir relatório?
            </h3>

            <p className="mt-3 text-xs leading-6 text-[#EDEDE3]/38">
              O relatório{' '}
              <strong className="text-[#EDEDE3]/70">
                {itemExcluir.titulo ||
                  'selecionado'}
              </strong>{' '}
              será removido permanentemente.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={
                  excluindo
                }
                onClick={() =>
                  setItemExcluir(
                    null
                  )
                }
                className="rounded-xl border border-white/[0.09] px-4 py-3 text-xs font-semibold text-[#EDEDE3]/60 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={
                  excluindo
                }
                onClick={
                  confirmarExclusao
                }
                className="rounded-xl border border-red-500/20 bg-red-500/[0.1] px-4 py-3 text-xs font-semibold text-red-300 disabled:opacity-50"
              >
                {excluindo
                  ? 'Excluindo...'
                  : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/*
  ============================================================
  COMPONENTES
  ============================================================
*/

function Loading() {
  return (
    <div className="flex min-h-[330px] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/[0.08] border-t-[#E3A144]" />

        <p className="mt-4 text-xs text-[#EDEDE3]/35">
          Carregando relatórios...
        </p>
      </div>
    </div>
  );
}

function Detalhe({
  label,
  valor,
}: {
  label: string;
  valor: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.065] bg-white/[0.018] p-4">
      <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/28">
        {label}
      </p>

      <p className="mt-2 text-xs font-medium text-[#EDEDE3]/72">
        {valor}
      </p>
    </div>
  );
}

function ModalBase({
  etiqueta,
  titulo,
  onClose,
  children,
}: {
  etiqueta: string;
  titulo: string;
  onClose: () => void;
  children:
    React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-[680px] overflow-y-auto rounded-[26px] border border-white/[0.09] bg-[#091510] shadow-[0_35px_100px_rgba(0,0,0,0.65)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-6 py-5">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
              {etiqueta}
            </p>

            <h3
              className="mt-2 text-2xl text-[#F0F0E8]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              {titulo}
            </h3>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-[#EDEDE3]/45"
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
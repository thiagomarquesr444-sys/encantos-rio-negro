'use client';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

type Passeio = {
  id?: string;
  nome: string;
  categoria?: string | null;
  duracao?: string | null;
  valor?: number | string | null;
  preco?: number | string | null;
  vagas?: number | string | null;
  descricao?: string | null;
  cidade?: string | null;
  foto_url?: string | null;
  destaque?: boolean | null;
  situacao?: string | null;
  created_at?: string;
};

type Feedback = {
  tipo: 'sucesso' | 'erro';
  texto: string;
};

/*
  ============================================================
  VALORES

  Aceita:
  3500
  3500,00
  3.500
  3.500,00
  3500.00
  3,500.00
  R$ 3.500,00

  Não existe multiplicação artificial.
  ============================================================
*/

function converterValor(
  valor:
    | number
    | string
    | null
    | undefined
): number {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return 0;
  }

  if (
    typeof valor === 'number'
  ) {
    return Number.isFinite(valor)
      ? valor
      : 0;
  }

  let texto = String(valor)
    .trim()
    .replace(/\s/g, '')
    .replace(/R\$/gi, '')
    .replace(
      /[^0-9.,-]/g,
      ''
    );

  if (!texto) {
    return 0;
  }

  const temVirgula =
    texto.includes(',');

  const temPonto =
    texto.includes('.');

  if (
    temVirgula &&
    temPonto
  ) {
    const ultimaVirgula =
      texto.lastIndexOf(',');

    const ultimoPonto =
      texto.lastIndexOf('.');

    texto =
      ultimaVirgula >
      ultimoPonto
        ? texto
            .replace(
              /\./g,
              ''
            )
            .replace(
              ',',
              '.'
            )
        : texto.replace(
            /,/g,
            ''
          );
  } else if (
    temVirgula
  ) {
    texto =
      /^\d{1,3}(,\d{3})+$/.test(
        texto
      )
        ? texto.replace(
            /,/g,
            ''
          )
        : texto.replace(
            ',',
            '.'
          );
  } else if (
    temPonto &&
    /^\d{1,3}(\.\d{3})+$/.test(
      texto
    )
  ) {
    texto =
      texto.replace(
        /\./g,
        ''
      );
  }

  const numero =
    Number(texto);

  return Number.isFinite(numero)
    ? numero
    : 0;
}

function formatarMoeda(
  valor:
    | number
    | string
    | null
    | undefined
) {
  return converterValor(
    valor
  ).toLocaleString(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
    }
  );
}

function formatarValorCampo(
  valor:
    | number
    | string
    | null
    | undefined
) {
  return converterValor(
    valor
  ).toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    }
  );
}

/*
  valor é a fonte principal.

  preco continua somente como
  compatibilidade temporária
  para registros legados.
*/

function obterValorPasseio(
  passeio: Passeio
) {
  if (
    passeio.valor !==
      undefined &&
    passeio.valor !== null
  ) {
    return converterValor(
      passeio.valor
    );
  }

  return converterValor(
    passeio.preco
  );
}

function estiloSituacao(
  situacao?: string | null
) {
  const valor =
    (
      situacao ||
      'Ativo'
    ).toLowerCase();

  if (
    valor.includes(
      'inativo'
    )
  ) {
    return {
      bolinha:
        'bg-[#EDEDE3]/35',

      container:
        'border-white/[0.08] bg-white/[0.025] text-[#EDEDE3]/45',
    };
  }

  if (
    valor.includes(
      'breve'
    )
  ) {
    return {
      bolinha:
        'bg-[#E3A144]',

      container:
        'border-[#E3A144]/20 bg-[#E3A144]/[0.07] text-[#F4C77E]',
    };
  }

  return {
    bolinha:
      'bg-emerald-400',

    container:
      'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300',
  };
}

export default function PasseiosPage() {
  const router =
    useRouter();

  const [
    passeios,
    setPasseios,
  ] =
    useState<Passeio[]>(
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
    filtroCategoria,
    setFiltroCategoria,
  ] =
    useState('');

  const [
    feedback,
    setFeedback,
  ] =
    useState<Feedback | null>(
      null
    );

  const [
    passeioSelecionado,
    setPasseioSelecionado,
  ] =
    useState<Passeio | null>(
      null
    );

  const [
    modoEdicao,
    setModoEdicao,
  ] =
    useState(false);

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

  const [
    idParaExcluir,
    setIdParaExcluir,
  ] =
    useState<string | null>(
      null
    );

  /*
    ============================================================
    CARREGAMENTO
    ============================================================
  */

  async function fetchPasseios() {
    setLoading(true);

    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            'passeios'
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

      setPasseios(
        (
          data ||
          []
        ) as Passeio[]
      );
    } catch (error) {
      console.error(
        'Erro ao carregar passeios:',
        error
      );

      setFeedback({
        tipo:
          'erro',

        texto:
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os passeios.',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPasseios();
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
      2500
    );
  }

  /*
    ============================================================
    MÉTRICAS
    ============================================================
  */

  const totalPasseios =
    passeios.length;

  const totalVagas =
    passeios.reduce(
      (
        total,
        passeio
      ) => {
        const vagas =
          Number(
            passeio.vagas
          );

        return (
          total +
          (
            Number.isFinite(
              vagas
            )
              ? vagas
              : 0
          )
        );
      },
      0
    );

  const categoriasUnicas =
    useMemo(
      () =>
        Array.from(
          new Set(
            passeios
              .map(
                (
                  passeio
                ) =>
                  passeio.categoria?.trim()
              )
              .filter(
                (
                  categoria
                ): categoria is string =>
                  Boolean(
                    categoria
                  )
              )
          )
        ).sort(),
      [
        passeios,
      ]
    );

  const precoMedio =
    totalPasseios > 0
      ? passeios.reduce(
          (
            total,
            passeio
          ) =>
            total +
            obterValorPasseio(
              passeio
            ),
          0
        ) /
        totalPasseios
      : 0;

  const ativos =
    passeios.filter(
      (
        passeio
      ) =>
        (
          passeio.situacao ||
          'Ativo'
        ).toLowerCase() ===
        'ativo'
    ).length;

  /*
    ============================================================
    FILTROS
    ============================================================
  */

  const passeiosFiltrados =
    useMemo(() => {
      const termo =
        busca
          .trim()
          .toLowerCase();

      return passeios.filter(
        (
          passeio
        ) => {
          const atendeBusca =
            !termo ||
            passeio.nome
              ?.toLowerCase()
              .includes(
                termo
              ) ||
            passeio.categoria
              ?.toLowerCase()
              .includes(
                termo
              ) ||
            passeio.cidade
              ?.toLowerCase()
              .includes(
                termo
              ) ||
            passeio.descricao
              ?.toLowerCase()
              .includes(
                termo
              );

          const atendeCategoria =
            !filtroCategoria ||
            (
              passeio.categoria ||
              ''
            ).toLowerCase() ===
              filtroCategoria.toLowerCase();

          return (
            atendeBusca &&
            atendeCategoria
          );
        }
      );
    }, [
      passeios,
      busca,
      filtroCategoria,
    ]);

  /*
    ============================================================
    VISUALIZAÇÃO
    ============================================================
  */

  function abrirVisualizacao(
    passeio: Passeio
  ) {
    setFeedback(null);

    setPasseioSelecionado({
      ...passeio,
    });

    setModoEdicao(
      false
    );
  }

  /*
    ============================================================
    EDIÇÃO
    ============================================================
  */

  function abrirEdicao(
    passeio: Passeio
  ) {
    setFeedback(null);

    setPasseioSelecionado({
      ...passeio,

      valor:
        formatarValorCampo(
          obterValorPasseio(
            passeio
          )
        ),
    });

    setModoEdicao(
      true
    );
  }

  async function handleSalvarEdicao(
    event:
      React.FormEvent
  ) {
    event.preventDefault();

    if (
      !passeioSelecionado?.id
    ) {
      return;
    }

    if (
      !passeioSelecionado.nome.trim()
    ) {
      setFeedback({
        tipo:
          'erro',

        texto:
          'Informe o nome do passeio.',
      });

      return;
    }

    const valorNumerico =
      converterValor(
        passeioSelecionado.valor
      );

    if (
      !Number.isFinite(
        valorNumerico
      ) ||
      valorNumerico < 0
    ) {
      setFeedback({
        tipo:
          'erro',

        texto:
          'Informe um valor válido para o passeio.',
      });

      return;
    }

    const vagasNumericas =
      passeioSelecionado.vagas ===
        '' ||
      passeioSelecionado.vagas ===
        null ||
      passeioSelecionado.vagas ===
        undefined
        ? 0
        : Number(
            passeioSelecionado.vagas
          );

    if (
      !Number.isFinite(
        vagasNumericas
      ) ||
      !Number.isInteger(
        vagasNumericas
      ) ||
      vagasNumericas < 0
    ) {
      setFeedback({
        tipo:
          'erro',

        texto:
          'Informe uma quantidade inteira e válida de vagas.',
      });

      return;
    }

    setSalvando(true);
    setFeedback(null);

    try {
      /*
        Enquanto valor e preco
        coexistirem no banco,
        ambos recebem exatamente
        o mesmo valor.
      */

      const payload = {
        nome:
          passeioSelecionado.nome.trim(),

        categoria:
          passeioSelecionado.categoria?.trim() ||
          null,

        duracao:
          passeioSelecionado.duracao?.trim() ||
          null,

        cidade:
          passeioSelecionado.cidade?.trim() ||
          null,

        valor:
          valorNumerico,

        preco:
          valorNumerico,

        vagas:
          vagasNumericas,

        descricao:
          passeioSelecionado.descricao?.trim() ||
          null,

        foto_url:
          passeioSelecionado.foto_url?.trim() ||
          null,

        destaque:
          Boolean(
            passeioSelecionado.destaque
          ),

        situacao:
          passeioSelecionado.situacao ||
          'Ativo',
      };

      const {
        error,
      } =
        await supabase
          .from(
            'passeios'
          )
          .update(
            payload
          )
          .eq(
            'id',
            passeioSelecionado.id
          );

      if (error) {
        throw error;
      }

      setPasseioSelecionado(
        null
      );

      setModoEdicao(
        false
      );

      mostrarSucesso(
        'Passeio atualizado com sucesso.'
      );

      await fetchPasseios();
    } catch (error) {
      console.error(
        'Erro ao atualizar passeio:',
        error
      );

      setFeedback({
        tipo:
          'erro',

        texto:
          error instanceof Error
            ? error.message
            : 'Não foi possível atualizar o passeio.',
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

  async function executarExclusao() {
    if (
      !idParaExcluir ||
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
            'passeios'
          )
          .delete()
          .eq(
            'id',
            idParaExcluir
          );

      if (error) {
        throw error;
      }

      setIdParaExcluir(
        null
      );

      mostrarSucesso(
        'Passeio excluído com sucesso.'
      );

      await fetchPasseios();
    } catch (error) {
      console.error(
        'Erro ao excluir passeio:',
        error
      );

      setFeedback({
        tipo:
          'erro',

        texto:
          error instanceof Error
            ? error.message
            : 'Não foi possível excluir o passeio.',
      });
    } finally {
      setExcluindo(false);
    }
  }

  const cards = [
    {
      titulo:
        'Passeios',

      valor:
        loading
          ? '—'
          : String(
              totalPasseios
            ),

      detalhe:
        'registros no catálogo',
    },

    {
      titulo:
        'Ativos',

      valor:
        loading
          ? '—'
          : String(
              ativos
            ),

      detalhe:
        'disponíveis na operação',
    },

    {
      titulo:
        'Capacidade',

      valor:
        loading
          ? '—'
          : String(
              totalVagas
            ),

      detalhe:
        'vagas cadastradas',
    },

    {
      titulo:
        'Preço médio',

      valor:
        loading
          ? '—'
          : formatarMoeda(
              precoMedio
            ),

      detalhe:
        'média real do catálogo',
    },
  ];

  return (
    <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
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
                Operação • Passeios
              </span>
            </div>

            <h1
              className="mt-4 text-4xl leading-none tracking-[-0.035em] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Passeios
            </h1>

            <p className="mt-4 max-w-[700px] text-sm leading-7 text-[#EDEDE3]/42">
              Organize experiências, preços,
              capacidade e informações operacionais
              do catálogo da empresa.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={
                fetchPasseios
              }
              disabled={
                loading
              }
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.025] px-5 text-xs font-semibold text-[#EDEDE3]/55 transition hover:bg-white/[0.055] disabled:cursor-not-allowed disabled:opacity-50"
            >
              ↻ Atualizar
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  '/passeios/novo'
                )
              }
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[#E3A144] px-6 text-sm font-bold text-[#07130F] transition hover:-translate-y-0.5 hover:bg-[#F0B35C]"
            >
              <span className="text-lg">
                +
              </span>

              Novo passeio
            </button>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1360px] px-5 py-8 md:px-8 md:py-10">
        {/* ===================================================
            ERROS
        ==================================================== */}

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
              className="text-red-300/60 transition hover:text-red-200"
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
            ) => (
              <div
                key={
                  card.titulo
                }
                className="rounded-[22px] border border-white/[0.075] bg-[#0A1713] p-5"
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                  {
                    card.titulo
                  }
                </p>

                <strong
                  className={`mt-5 block font-medium tracking-[-0.04em] text-[#F0F0E8] ${
                    card.titulo ===
                    'Preço médio'
                      ? 'text-2xl md:text-3xl'
                      : 'text-4xl'
                  }`}
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
              </div>
            )
          )}
        </div>

        {/* ===================================================
            CATÁLOGO
        ==================================================== */}

        <section className="mt-6 overflow-hidden rounded-[26px] border border-white/[0.075] bg-[#0A1713]">
          <div className="border-b border-white/[0.065] p-5 md:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  Catálogo operacional
                </p>

                <h2
                  className="mt-2 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Experiências cadastradas
                </h2>

                <p className="mt-2 text-xs text-[#EDEDE3]/30">
                  {
                    passeiosFiltrados.length
                  }{' '}
                  de{' '}
                  {
                    passeios.length
                  }{' '}
                  passeio
                  {passeios.length !==
                  1
                    ? 's'
                    : ''}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <svg
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#EDEDE3]/25"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>

                  <input
                    type="text"
                    placeholder="Buscar passeio..."
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
                    className="h-[44px] min-w-[260px] rounded-xl border border-white/[0.08] bg-[#07110E] pl-10 pr-4 text-xs text-[#EDEDE3] outline-none placeholder:text-[#EDEDE3]/22 focus:border-[#E3A144]/35"
                  />
                </div>

                <select
                  value={
                    filtroCategoria
                  }
                  onChange={(
                    event
                  ) =>
                    setFiltroCategoria(
                      event.target
                        .value
                    )
                  }
                  className="h-[44px] rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-xs text-[#EDEDE3]/70 outline-none focus:border-[#E3A144]/35"
                >
                  <option value="">
                    Todas as categorias
                  </option>

                  {categoriasUnicas.map(
                    (
                      categoria
                    ) => (
                      <option
                        key={
                          categoria
                        }
                        value={
                          categoria
                        }
                      >
                        {
                          categoria
                        }
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex min-h-[330px] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/[0.08] border-t-[#E3A144]" />

                  <p className="mt-4 text-xs text-[#EDEDE3]/35">
                    Carregando passeios...
                  </p>
                </div>
              </div>
            ) : passeiosFiltrados.length ===
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
                    Nenhum passeio encontrado.
                  </h3>

                  <p className="mt-2 text-xs text-[#EDEDE3]/30">
                    Ajuste os filtros ou cadastre uma nova experiência.
                  </p>
                </div>
              </div>
            ) : (
              <table className="w-full min-w-[1050px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.012]">
                    {[
                      'Passeio',
                      'Categoria',
                      'Duração',
                      'Preço',
                      'Vagas',
                      'Situação',
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
                  {passeiosFiltrados.map(
                    (
                      passeio,
                      index
                    ) => {
                      const situacao =
                        estiloSituacao(
                          passeio.situacao
                        );

                      return (
                        <tr
                          key={
                            passeio.id ||
                            index
                          }
                          className="transition hover:bg-white/[0.018]"
                        >
                          <td className="px-5 py-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-semibold text-[#EDEDE3]/82">
                                  {
                                    passeio.nome
                                  }
                                </p>

                                {passeio.destaque && (
                                  <span
                                    title="Destaque"
                                    className="text-[10px] text-[#E3A144]"
                                  >
                                    ★
                                  </span>
                                )}
                              </div>

                              {passeio.cidade && (
                                <p className="mt-1 text-[9px] text-[#EDEDE3]/25">
                                  {
                                    passeio.cidade
                                  }
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[9px] text-[#EDEDE3]/50">
                              {passeio.categoria ||
                                'Geral'}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/42">
                            {passeio.duracao ||
                              '—'}
                          </td>

                          <td className="px-5 py-4 text-xs font-semibold text-[#F4C77E]">
                            {formatarMoeda(
                              obterValorPasseio(
                                passeio
                              )
                            )}
                          </td>

                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/42">
                            {Number(
                              passeio.vagas
                            ) || 0}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[9px] ${situacao.container}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${situacao.bolinha}`}
                              />

                              {passeio.situacao ||
                                'Ativo'}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                title="Visualizar"
                                onClick={() =>
                                  abrirVisualizacao(
                                    passeio
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-[#EDEDE3]/38 transition hover:border-[#E3A144]/20 hover:text-[#E3A144]"
                              >
                                👁
                              </button>

                              <button
                                type="button"
                                title="Editar"
                                onClick={() =>
                                  abrirEdicao(
                                    passeio
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-[#EDEDE3]/38 transition hover:border-sky-400/20 hover:text-sky-300"
                              >
                                ✎
                              </button>

                              <button
                                type="button"
                                title="Excluir"
                                onClick={() =>
                                  passeio.id &&
                                  setIdParaExcluir(
                                    passeio.id
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-[#EDEDE3]/38 transition hover:border-red-400/20 hover:text-red-300"
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
          MODAL: VISUALIZAÇÃO / EDIÇÃO
      ====================================================== */}

      {passeioSelecionado && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-[690px] overflow-y-auto rounded-[26px] border border-white/[0.09] bg-[#091510] shadow-[0_35px_100px_rgba(0,0,0,0.65)]">
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-6 py-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  {modoEdicao
                    ? 'Editar passeio'
                    : 'Detalhes do passeio'}
                </p>

                <h3
                  className="mt-2 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  {
                    passeioSelecionado.nome
                  }
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPasseioSelecionado(
                    null
                  );

                  setModoEdicao(
                    false
                  );
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-[#EDEDE3]/45 transition hover:bg-white/[0.05]"
              >
                ✕
              </button>
            </div>

            {modoEdicao ? (
              <form
                onSubmit={
                  handleSalvarEdicao
                }
                className="space-y-5 p-6"
              >
                <CampoTexto
                  label="Nome *"
                  value={
                    passeioSelecionado.nome
                  }
                  disabled={
                    salvando
                  }
                  onChange={(
                    valor
                  ) =>
                    setPasseioSelecionado({
                      ...passeioSelecionado,

                      nome:
                        valor,
                    })
                  }
                  required
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <CampoTexto
                    label="Categoria"
                    value={
                      passeioSelecionado.categoria ||
                      ''
                    }
                    disabled={
                      salvando
                    }
                    onChange={(
                      valor
                    ) =>
                      setPasseioSelecionado({
                        ...passeioSelecionado,

                        categoria:
                          valor,
                      })
                    }
                  />

                  <CampoTexto
                    label="Duração"
                    value={
                      passeioSelecionado.duracao ||
                      ''
                    }
                    disabled={
                      salvando
                    }
                    onChange={(
                      valor
                    ) =>
                      setPasseioSelecionado({
                        ...passeioSelecionado,

                        duracao:
                          valor,
                      })
                    }
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <CampoTexto
                    label="Cidade"
                    value={
                      passeioSelecionado.cidade ||
                      ''
                    }
                    disabled={
                      salvando
                    }
                    onChange={(
                      valor
                    ) =>
                      setPasseioSelecionado({
                        ...passeioSelecionado,

                        cidade:
                          valor,
                      })
                    }
                  />

                  <div>
                    <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/34">
                      Situação
                    </label>

                    <select
                      disabled={
                        salvando
                      }
                      value={
                        passeioSelecionado.situacao ||
                        'Ativo'
                      }
                      onChange={(
                        event
                      ) =>
                        setPasseioSelecionado({
                          ...passeioSelecionado,

                          situacao:
                            event.target
                              .value,
                        })
                      }
                      className="w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm text-[#EDEDE3] outline-none focus:border-[#E3A144]/40 disabled:opacity-50"
                    >
                      <option value="Ativo">
                        Ativo
                      </option>

                      <option value="Inativo">
                        Inativo
                      </option>

                      <option value="Em Breve">
                        Em Breve
                      </option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/34">
                      Valor (R$)
                    </label>

                    <input
                      type="text"
                      inputMode="decimal"
                      disabled={
                        salvando
                      }
                      value={
                        passeioSelecionado.valor ??
                        ''
                      }
                      onChange={(
                        event
                      ) =>
                        setPasseioSelecionado({
                          ...passeioSelecionado,

                          valor:
                            event.target
                              .value,
                        })
                      }
                      placeholder="Ex.: 3.500,00"
                      className="w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm text-[#EDEDE3] outline-none focus:border-[#E3A144]/40 disabled:opacity-50"
                    />

                    <p className="mt-2 text-[9px] text-[#EDEDE3]/22">
                      Aceita 3500, 3.500 ou 3.500,00.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/34">
                      Vagas
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      disabled={
                        salvando
                      }
                      value={
                        passeioSelecionado.vagas ??
                        ''
                      }
                      onChange={(
                        event
                      ) =>
                        setPasseioSelecionado({
                          ...passeioSelecionado,

                          vagas:
                            event.target
                              .value,
                        })
                      }
                      className="w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm text-[#EDEDE3] outline-none focus:border-[#E3A144]/40 disabled:opacity-50"
                    />
                  </div>
                </div>

                <CampoTexto
                  label="URL da foto"
                  value={
                    passeioSelecionado.foto_url ||
                    ''
                  }
                  disabled={
                    salvando
                  }
                  onChange={(
                    valor
                  ) =>
                    setPasseioSelecionado({
                      ...passeioSelecionado,

                      foto_url:
                        valor,
                    })
                  }
                  type="url"
                  placeholder="https://..."
                />

                <label
                  className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${
                    passeioSelecionado.destaque
                      ? 'border-[#E3A144]/25 bg-[#E3A144]/[0.05]'
                      : 'border-white/[0.08] bg-[#07110E]'
                  }`}
                >
                  <div>
                    <p className="text-xs font-semibold text-[#EDEDE3]/65">
                      Destaque
                    </p>

                    <p className="mt-1 text-[9px] text-[#EDEDE3]/24">
                      Marcar esta experiência como destaque.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={
                      Boolean(
                        passeioSelecionado.destaque
                      )
                    }
                    onChange={(
                      event
                    ) =>
                      setPasseioSelecionado({
                        ...passeioSelecionado,

                        destaque:
                          event.target
                            .checked,
                      })
                    }
                    disabled={
                      salvando
                    }
                    className="h-4 w-4 accent-[#E3A144]"
                  />
                </label>

                <div>
                  <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/34">
                    Descrição
                  </label>

                  <textarea
                    rows={5}
                    disabled={
                      salvando
                    }
                    value={
                      passeioSelecionado.descricao ||
                      ''
                    }
                    onChange={(
                      event
                    ) =>
                      setPasseioSelecionado({
                        ...passeioSelecionado,

                        descricao:
                          event.target
                            .value,
                      })
                    }
                    className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm leading-6 text-[#EDEDE3] outline-none focus:border-[#E3A144]/40 disabled:opacity-50"
                  />
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={
                      salvando
                    }
                    onClick={() => {
                      setPasseioSelecionado(
                        null
                      );

                      setModoEdicao(
                        false
                      );
                    }}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 py-3 text-xs font-semibold text-[#EDEDE3]/55 disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={
                      salvando
                    }
                    className="rounded-xl bg-[#E3A144] px-6 py-3 text-xs font-bold text-[#07130F] transition hover:bg-[#F0B35C] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {salvando
                      ? 'Salvando...'
                      : 'Salvar alterações'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Detalhe
                    label="Categoria"
                    valor={
                      passeioSelecionado.categoria ||
                      'Geral'
                    }
                  />

                  <Detalhe
                    label="Duração"
                    valor={
                      passeioSelecionado.duracao ||
                      '—'
                    }
                  />

                  <Detalhe
                    label="Preço"
                    valor={formatarMoeda(
                      obterValorPasseio(
                        passeioSelecionado
                      )
                    )}
                  />

                  <Detalhe
                    label="Vagas"
                    valor={String(
                      Number(
                        passeioSelecionado.vagas
                      ) || 0
                    )}
                  />

                  <Detalhe
                    label="Cidade"
                    valor={
                      passeioSelecionado.cidade ||
                      'Não informada'
                    }
                  />

                  <Detalhe
                    label="Situação"
                    valor={
                      passeioSelecionado.situacao ||
                      'Ativo'
                    }
                  />

                  <Detalhe
                    label="Destaque"
                    valor={
                      passeioSelecionado.destaque
                        ? 'Sim'
                        : 'Não'
                    }
                  />
                </div>

                <div className="mt-4">
                  <p className="mb-2 text-[8px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/28">
                    Descrição
                  </p>

                  <div className="min-h-[100px] rounded-2xl border border-white/[0.065] bg-[#07110E] p-4 text-xs leading-6 text-[#EDEDE3]/50">
                    {passeioSelecionado.descricao ||
                      'Nenhuma descrição informada.'}
                  </div>
                </div>

                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      abrirEdicao(
                        passeioSelecionado
                      )
                    }
                    className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 py-3 text-xs font-semibold text-[#EDEDE3]/55 transition hover:bg-white/[0.05]"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPasseioSelecionado(
                        null
                      )
                    }
                    className="rounded-xl bg-[#E3A144] px-6 py-3 text-xs font-bold text-[#07130F] transition hover:bg-[#F0B35C]"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          EXCLUSÃO
      ====================================================== */}

      {idParaExcluir && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[430px] rounded-[26px] border border-white/[0.09] bg-[#091510] p-6 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-red-500/20 bg-red-500/[0.08] text-lg text-red-300">
              !
            </div>

            <h3
              className="mt-4 text-2xl text-[#F0F0E8]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Excluir passeio?
            </h3>

            <p className="mt-3 text-xs leading-6 text-[#EDEDE3]/38">
              O passeio será removido permanentemente do catálogo.
              Esta ação não pode ser desfeita.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={
                  excluindo
                }
                onClick={() =>
                  setIdParaExcluir(
                    null
                  )
                }
                className="rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-3 text-xs font-semibold text-[#EDEDE3]/60 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={
                  excluindo
                }
                onClick={
                  executarExclusao
                }
                className="rounded-xl border border-red-500/20 bg-red-500/[0.1] px-4 py-3 text-xs font-semibold text-red-300 transition hover:bg-red-500/[0.15] disabled:cursor-not-allowed disabled:opacity-50"
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
  COMPONENTES INTERNOS
  ============================================================
*/

function CampoTexto({
  label,
  value,
  onChange,
  disabled,
  required = false,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (
    valor: string
  ) => void;
  disabled?: boolean;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/34">
        {label}
      </label>

      <input
        type={
          type
        }
        required={
          required
        }
        disabled={
          disabled
        }
        value={
          value
        }
        onChange={(
          event
        ) =>
          onChange(
            event.target
              .value
          )
        }
        placeholder={
          placeholder
        }
        className="w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm text-[#EDEDE3] outline-none focus:border-[#E3A144]/40 disabled:opacity-50"
      />
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
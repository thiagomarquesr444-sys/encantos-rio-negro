'use client';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';

import { supabase } from '@/lib/supabase';

type TipoLancamento =
  | 'receita'
  | 'despesa';

type StatusLancamento =
  | 'Recebido'
  | 'Pago'
  | 'Pendente';

interface LancamentoFinanceiro {
  id?: string;

  descricao?: string | null;
  descrição?: string | null;

  tipo?: string | null;

  valor?:
    | number
    | string
    | null;

  Valor?:
    | number
    | string
    | null;

  categoria?: string | null;

  data_vencimento?: string | null;

  status?: string | null;
  Status?: string | null;

  user_id?: string | null;

  created_at?: string | null;
}

type FiltroPeriodo =
  | 'mes_atual'
  | 'todos'
  | 'receitas'
  | 'despesas'
  | 'pendentes';

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

function normalizarTipo(
  valor?: string | null
): TipoLancamento {
  const tipo = removerAcentos(
    (valor || '')
      .trim()
      .toLowerCase()
  );

  return tipo === 'despesa'
    ? 'despesa'
    : 'receita';
}

function normalizarStatus(
  tipo: TipoLancamento,
  valor?: string | null
): StatusLancamento {
  const status = removerAcentos(
    (valor || '')
      .trim()
      .toLowerCase()
  );

  if (
    status === 'pendente'
  ) {
    return 'Pendente';
  }

  if (
    tipo === 'despesa'
  ) {
    return status === 'pago'
      ? 'Pago'
      : 'Pendente';
  }

  return status === 'recebido'
    ? 'Recebido'
    : 'Pendente';
}

/*
  ============================================================
  CONVERSÃO MONETÁRIA
  ============================================================

  3500      -> 3500
  3.500     -> 3500
  3500.50   -> 3500.50
  3.500,50  -> 3500.50
*/

function converterValor(
  entrada: unknown
): number {
  if (
    entrada === null ||
    entrada === undefined ||
    entrada === ''
  ) {
    return 0;
  }

  if (
    typeof entrada === 'number'
  ) {
    return Number.isFinite(entrada)
      ? entrada
      : 0;
  }

  let valor = String(entrada)
    .trim()
    .replace(/R\$/gi, '')
    .replace(/\s/g, '');

  if (!valor) {
    return 0;
  }

  if (
    valor.includes('.') &&
    valor.includes(',')
  ) {
    valor = valor
      .replace(/\./g, '')
      .replace(',', '.');
  } else if (
    /^\d{1,3}(\.\d{3})+$/.test(
      valor
    )
  ) {
    valor = valor.replace(
      /\./g,
      ''
    );
  } else if (
    valor.includes(',')
  ) {
    valor = valor.replace(
      ',',
      '.'
    );
  }

  const numero =
    Number(valor);

  return Number.isFinite(numero)
    ? numero
    : 0;
}

function obterValor(
  item: LancamentoFinanceiro
) {
  return converterValor(
    item.valor !== undefined
      ? item.valor
      : item.Valor
  );
}

function obterDescricao(
  item: LancamentoFinanceiro
) {
  return (
    item.descricao ||
    item.descrição ||
    ''
  );
}

function obterStatus(
  item: LancamentoFinanceiro
) {
  const tipo =
    normalizarTipo(
      item.tipo
    );

  return normalizarStatus(
    tipo,
    item.status !== undefined
      ? item.status
      : item.Status
  );
}

function formatarMoeda(
  valor: number
) {
  return valor.toLocaleString(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
    }
  );
}

function formatarData(
  data?: string | null
) {
  if (!data) {
    return '—';
  }

  const parte =
    data.split('T')[0];

  const partes =
    parte.split('-');

  if (
    partes.length !== 3
  ) {
    return data;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

export default function FinanceiroPage() {
  const [
    lancamentos,
    setLancamentos,
  ] =
    useState<
      LancamentoFinanceiro[]
    >([]);

  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  const [
    filtroPeriodo,
    setFiltroPeriodo,
  ] =
    useState<FiltroPeriodo>(
      'mes_atual'
    );

  const [
    busca,
    setBusca,
  ] = useState('');

  const [
    itemVisualizar,
    setItemVisualizar,
  ] =
    useState<LancamentoFinanceiro | null>(
      null
    );

  const [
    itemEditar,
    setItemEditar,
  ] =
    useState<LancamentoFinanceiro | null>(
      null
    );

  const [
    valorEdicao,
    setValorEdicao,
  ] = useState('');

  const [
    itemExcluir,
    setItemExcluir,
  ] =
    useState<LancamentoFinanceiro | null>(
      null
    );

  const [
    salvandoEdicao,
    setSalvandoEdicao,
  ] = useState(false);

  const [
    excluindo,
    setExcluindo,
  ] = useState(false);

  const [
    mensagemSucesso,
    setMensagemSucesso,
  ] =
    useState<string | null>(
      null
    );

  function mostrarToast(
    mensagem: string
  ) {
    setMensagemSucesso(
      mensagem
    );

    setTimeout(() => {
      setMensagemSucesso(
        null
      );
    }, 3000);
  }

  /*
    ============================================================
    CARREGAR
    ============================================================
  */

  async function carregarFinanceiro() {
    setCarregando(true);
    setError(null);

    try {
      const {
        data,
        error: supabaseError,
      } = await supabase
        .from('financeiro')
        .select('*')
        .order(
          'data_vencimento',
          {
            ascending: false,
          }
        );

      if (supabaseError) {
        throw supabaseError;
      }

      setLancamentos(
        (data || []) as
          LancamentoFinanceiro[]
      );
    } catch (err) {
      console.error(
        'Erro ao carregar financeiro:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar os lançamentos financeiros.'
      );

      setLancamentos([]);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarFinanceiro();
  }, []);

  /*
    ============================================================
    INDICADORES FINANCEIROS
    ============================================================
  */

  const financeiro =
    useMemo(() => {
      let recebido = 0;
      let pago = 0;
      let receber = 0;
      let pagar = 0;

      lancamentos.forEach(
        (item) => {
          const tipo =
            normalizarTipo(
              item.tipo
            );

          const status =
            obterStatus(item);

          const valor =
            obterValor(item);

          if (
            tipo === 'receita'
          ) {
            if (
              status ===
              'Recebido'
            ) {
              recebido += valor;
            } else {
              receber += valor;
            }
          } else {
            if (
              status === 'Pago'
            ) {
              pago += valor;
            } else {
              pagar += valor;
            }
          }
        }
      );

      return {
        recebido,
        pago,
        receber,
        pagar,
        saldo:
          recebido - pago,
      };
    }, [lancamentos]);

  /*
    ============================================================
    FILTRO
    ============================================================
  */

  const lancamentosFiltrados =
    useMemo(() => {
      const hoje =
        new Date();

      const mes =
        hoje.getMonth();

      const ano =
        hoje.getFullYear();

      const termo =
        busca
          .trim()
          .toLowerCase();

      return lancamentos.filter(
        (item) => {
          const tipo =
            normalizarTipo(
              item.tipo
            );

          const status =
            obterStatus(item);

          let atendeFiltro =
            true;

          if (
            filtroPeriodo ===
            'mes_atual'
          ) {
            if (
              !item.data_vencimento
            ) {
              atendeFiltro =
                false;
            } else {
              const partes =
                item.data_vencimento
                  .split('T')[0]
                  .split('-');

              if (
                partes.length ===
                3
              ) {
                atendeFiltro =
                  Number(
                    partes[1]
                  ) -
                    1 ===
                    mes &&
                  Number(
                    partes[0]
                  ) === ano;
              } else {
                atendeFiltro =
                  false;
              }
            }
          }

          if (
            filtroPeriodo ===
            'receitas'
          ) {
            atendeFiltro =
              tipo ===
              'receita';
          }

          if (
            filtroPeriodo ===
            'despesas'
          ) {
            atendeFiltro =
              tipo ===
              'despesa';
          }

          if (
            filtroPeriodo ===
            'pendentes'
          ) {
            atendeFiltro =
              status ===
              'Pendente';
          }

          const atendeBusca =
            !termo ||
            obterDescricao(item)
              .toLowerCase()
              .includes(termo) ||
            (
              item.categoria ||
              ''
            )
              .toLowerCase()
              .includes(termo) ||
            tipo.includes(
              termo
            ) ||
            status
              .toLowerCase()
              .includes(termo);

          return (
            atendeFiltro &&
            atendeBusca
          );
        }
      );
    }, [
      lancamentos,
      filtroPeriodo,
      busca,
    ]);

  /*
    ============================================================
    EDIÇÃO
    ============================================================
  */

  function abrirEdicao(
    item: LancamentoFinanceiro
  ) {
    setItemEditar({
      ...item,

      descricao:
        obterDescricao(item),

      status:
        obterStatus(item),
    });

    setValorEdicao(
      String(
        obterValor(item)
      )
    );

    setError(null);
  }

  async function salvarEdicao(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!itemEditar?.id) {
      return;
    }

    const descricao =
      obterDescricao(
        itemEditar
      ).trim();

    if (!descricao) {
      setError(
        'Informe a descrição do lançamento.'
      );

      return;
    }

    const valor =
      converterValor(
        valorEdicao
      );

    if (
      !Number.isFinite(valor) ||
      valor <= 0
    ) {
      setError(
        'Informe um valor válido maior que zero.'
      );

      return;
    }

    const tipo =
      normalizarTipo(
        itemEditar.tipo
      );

    const status =
      normalizarStatus(
        tipo,
        itemEditar.status
      );

    setSalvandoEdicao(
      true
    );

    setError(null);

    try {
      const {
        error: updateError,
      } = await supabase
        .from('financeiro')
        .update({
          descricao,

          valor,

          categoria:
            itemEditar.categoria
              ?.trim() ||
            null,

          data_vencimento:
            itemEditar.data_vencimento,

          status,

          /*
            O tipo não será trocado
            durante a edição.

            Receita continua receita.
            Despesa continua despesa.
          */
          tipo,
        })
        .eq(
          'id',
          itemEditar.id
        );

      if (updateError) {
        throw updateError;
      }

      setItemEditar(null);

      mostrarToast(
        'Lançamento atualizado com sucesso.'
      );

      await carregarFinanceiro();
    } catch (err) {
      console.error(
        'Erro ao atualizar lançamento:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível atualizar o lançamento.'
      );
    } finally {
      setSalvandoEdicao(
        false
      );
    }
  }

  /*
    ============================================================
    EXCLUSÃO
    ============================================================
  */

  async function confirmarExclusao() {
    if (!itemExcluir?.id) {
      return;
    }

    setExcluindo(true);
    setError(null);

    try {
      const {
        error: deleteError,
      } = await supabase
        .from('financeiro')
        .delete()
        .eq(
          'id',
          itemExcluir.id
        );

      if (deleteError) {
        throw deleteError;
      }

      setLancamentos(
        (atuais) =>
          atuais.filter(
            (item) =>
              item.id !==
              itemExcluir.id
          )
      );

      setItemExcluir(null);

      mostrarToast(
        'Lançamento excluído com sucesso.'
      );
    } catch (err) {
      console.error(
        'Erro ao excluir lançamento:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível excluir o lançamento.'
      );
    } finally {
      setExcluindo(false);
    }
  }

  /*
    ============================================================
    VISUAL
    ============================================================
  */

  function tipoClasses(
    tipo: TipoLancamento
  ) {
    return tipo === 'receita'
      ? 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300'
      : 'border-red-500/20 bg-red-500/[0.07] text-red-300';
  }

  function statusClasses(
    status: StatusLancamento
  ) {
    if (
      status ===
      'Pendente'
    ) {
      return 'border-amber-500/20 bg-amber-500/[0.07] text-amber-300';
    }

    return 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300';
  }

  const inputClass =
    'w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm text-[#EDEDE3] outline-none transition placeholder:text-[#EDEDE3]/20 focus:border-[#E3A144]/40';

  const labelClass =
    'mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/34';

  const cards = [
    {
      titulo:
        'Receitas recebidas',

      valor:
        financeiro.recebido,

      detalhe:
        'entradas realizadas',
    },

    {
      titulo:
        'Despesas pagas',

      valor:
        financeiro.pago,

      detalhe:
        'saídas realizadas',
    },

    {
      titulo:
        'Saldo realizado',

      valor:
        financeiro.saldo,

      detalhe:
        'recebido − pago',
    },

    {
      titulo:
        'A receber',

      valor:
        financeiro.receber,

      detalhe:
        'receitas pendentes',
    },

    {
      titulo:
        'A pagar',

      valor:
        financeiro.pagar,

      detalhe:
        'despesas pendentes',
    },
  ];

  return (
    <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      {/* TOAST */}

      {mensagemSucesso && (
        <div className="fixed left-1/2 top-[100px] z-[80] -translate-x-1/2 rounded-2xl border border-emerald-500/20 bg-[#0B2119] px-5 py-3 text-xs font-semibold text-emerald-300 shadow-2xl">
          {mensagemSucesso}
        </div>
      )}

      {/* CABEÇALHO */}

      <section className="border-b border-white/[0.07] bg-[#091510]">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-8 px-5 py-10 md:px-8 md:py-12 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-[#E3A144]" />

              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                Financeiro • Controle
              </span>
            </div>

            <h1
              className="mt-4 text-4xl leading-none tracking-[-0.035em] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Financeiro
            </h1>

            <p className="mt-4 max-w-[720px] text-sm leading-7 text-[#EDEDE3]/42">
              Controle entradas,
              despesas, valores
              pendentes e o saldo
              financeiro efetivamente
              realizado.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/financeiro/receita/novo"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#E3A144] px-5 text-xs font-bold text-[#07130F] transition hover:bg-[#F0B35C]"
            >
              + Nova receita
            </Link>

            <Link
              href="/financeiro/despesa/novo"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-5 text-xs font-semibold text-red-300 transition hover:bg-red-500/[0.12]"
            >
              − Nova despesa
            </Link>

            <Link
              href="/financeiro/exportar"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.025] px-5 text-xs font-semibold text-[#EDEDE3]/55 transition hover:bg-white/[0.05]"
            >
              Exportar
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1360px] px-5 py-8 md:px-8 md:py-10">
        {error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-5 py-4 text-xs text-red-300">
            <span>{error}</span>

            <button
              type="button"
              onClick={() =>
                setError(null)
              }
            >
              ✕
            </button>
          </div>
        )}

        {/* INDICADORES */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {cards.map(
            (card) => (
              <div
                key={
                  card.titulo
                }
                className="rounded-[22px] border border-white/[0.075] bg-[#0A1713] p-5"
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#7C9C87]">
                  {card.titulo}
                </p>

                <strong
                  className={`mt-5 block text-2xl font-medium tracking-[-0.04em] ${
                    card.titulo ===
                      'Despesas pagas' ||
                    card.titulo ===
                      'A pagar' ||
                    (
                      card.titulo ===
                        'Saldo realizado' &&
                      card.valor < 0
                    )
                      ? 'text-red-300'
                      : card.titulo ===
                          'A receber'
                        ? 'text-amber-300'
                        : 'text-[#F0F0E8]'
                  }`}
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  {carregando
                    ? '—'
                    : formatarMoeda(
                        card.valor
                      )}
                </strong>

                <p className="mt-2 text-[10px] text-[#EDEDE3]/28">
                  {card.detalhe}
                </p>
              </div>
            )
          )}
        </div>

        {/* FILTROS */}

        <section className="mt-6 rounded-[22px] border border-white/[0.075] bg-[#0A1713] p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                {
                  chave:
                    'mes_atual',
                  label:
                    'Mês atual',
                },

                {
                  chave:
                    'todos',
                  label:
                    'Histórico',
                },

                {
                  chave:
                    'receitas',
                  label:
                    'Receitas',
                },

                {
                  chave:
                    'despesas',
                  label:
                    'Despesas',
                },

                {
                  chave:
                    'pendentes',
                  label:
                    'Pendentes',
                },
              ].map((filtro) => {
                const ativo =
                  filtroPeriodo ===
                  filtro.chave;

                return (
                  <button
                    key={
                      filtro.chave
                    }
                    type="button"
                    onClick={() =>
                      setFiltroPeriodo(
                        filtro.chave as FiltroPeriodo
                      )
                    }
                    className={`rounded-xl border px-4 py-2.5 text-[10px] font-semibold transition ${
                      ativo
                        ? 'border-[#E3A144]/30 bg-[#E3A144]/10 text-[#F4C77E]'
                        : 'border-white/[0.07] bg-white/[0.02] text-[#EDEDE3]/40 hover:bg-white/[0.045]'
                    }`}
                  >
                    {filtro.label}
                  </button>
                );
              })}
            </div>

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
                value={busca}
                onChange={(
                  event
                ) =>
                  setBusca(
                    event.target
                      .value
                  )
                }
                placeholder="Buscar lançamento..."
                className="h-[44px] w-full min-w-[280px] rounded-xl border border-white/[0.08] bg-[#07110E] pl-10 pr-4 text-xs text-[#EDEDE3] outline-none placeholder:text-[#EDEDE3]/22 focus:border-[#E3A144]/35"
              />
            </div>
          </div>
        </section>

        {/* LANÇAMENTOS */}

        <section className="mt-6 overflow-hidden rounded-[26px] border border-white/[0.075] bg-[#0A1713]">
          <div className="flex flex-col gap-3 border-b border-white/[0.065] p-5 md:flex-row md:items-end md:justify-between md:p-6">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                Movimentações
              </p>

              <h2
                className="mt-2 text-2xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Lançamentos financeiros
              </h2>
            </div>

            <p className="text-[10px] text-[#EDEDE3]/30">
              {
                lancamentosFiltrados.length
              }{' '}
              de{' '}
              {
                lancamentos.length
              }{' '}
              registro
              {lancamentos.length !==
              1
                ? 's'
                : ''}
            </p>
          </div>

          <div className="overflow-x-auto">
            {carregando ? (
              <div className="flex min-h-[330px] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/[0.08] border-t-[#E3A144]" />

                  <p className="mt-4 text-xs text-[#EDEDE3]/35">
                    Carregando financeiro...
                  </p>
                </div>
              </div>
            ) : lancamentosFiltrados.length ===
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
                    Nenhum lançamento encontrado.
                  </h3>

                  <p className="mt-2 text-xs text-[#EDEDE3]/30">
                    Ajuste os filtros ou
                    registre uma nova
                    movimentação.
                  </p>
                </div>
              </div>
            ) : (
              <table className="min-w-[1120px] w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.012]">
                    {[
                      'Data',
                      'Tipo',
                      'Descrição',
                      'Categoria',
                      'Valor',
                      'Status',
                      'Ações',
                    ].map((titulo) => (
                      <th
                        key={titulo}
                        className={`px-5 py-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/28 ${
                          titulo ===
                          'Ações'
                            ? 'text-center'
                            : ''
                        }`}
                      >
                        {titulo}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.055]">
                  {lancamentosFiltrados.map(
                    (
                      item,
                      index
                    ) => {
                      const tipo =
                        normalizarTipo(
                          item.tipo
                        );

                      const status =
                        obterStatus(
                          item
                        );

                      const valor =
                        obterValor(
                          item
                        );

                      return (
                        <tr
                          key={
                            item.id ||
                            index
                          }
                          className="transition hover:bg-white/[0.018]"
                        >
                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/42">
                            {formatarData(
                              item.data_vencimento
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold ${tipoClasses(
                                tipo
                              )}`}
                            >
                              {tipo ===
                              'receita'
                                ? 'Receita'
                                : 'Despesa'}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-xs font-semibold text-[#EDEDE3]/82">
                              {obterDescricao(
                                item
                              ) ||
                                '—'}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/42">
                            {item.categoria ||
                              '—'}
                          </td>

                          <td
                            className={`px-5 py-4 text-xs font-semibold ${
                              tipo ===
                              'receita'
                                ? 'text-emerald-300'
                                : 'text-red-300'
                            }`}
                          >
                            {tipo ===
                            'receita'
                              ? '+ '
                              : '− '}

                            {formatarMoeda(
                              valor
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold ${statusClasses(
                                status
                              )}`}
                            >
                              {status}
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
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-[#EDEDE3]/38 transition hover:border-[#E3A144]/20 hover:text-[#E3A144]"
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"
                                  />

                                  <circle
                                    cx="12"
                                    cy="12"
                                    r="3"
                                  />
                                </svg>
                              </button>

                              <button
                                type="button"
                                title="Editar"
                                onClick={() =>
                                  abrirEdicao(
                                    item
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
                                  setItemExcluir(
                                    item
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

      {/* VISUALIZAÇÃO */}

      {itemVisualizar && (() => {
        const tipo =
          normalizarTipo(
            itemVisualizar.tipo
          );

        const status =
          obterStatus(
            itemVisualizar
          );

        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-[620px] overflow-hidden rounded-[26px] border border-white/[0.09] bg-[#091510] shadow-[0_35px_100px_rgba(0,0,0,0.65)]">
              <div className="flex items-start justify-between gap-5 border-b border-white/[0.07] px-6 py-5">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                    Detalhes financeiros
                  </p>

                  <h3
                    className="mt-2 text-2xl text-[#F0F0E8]"
                    style={{
                      fontFamily:
                        'var(--font-fraunces), serif',
                    }}
                  >
                    {obterDescricao(
                      itemVisualizar
                    ) ||
                      'Lançamento'}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setItemVisualizar(
                      null
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-[#EDEDE3]/45"
                >
                  ✕
                </button>
              </div>

              <div className="grid gap-3 p-6 sm:grid-cols-2">
                {[
                  {
                    label:
                      'Tipo',
                    valor:
                      tipo ===
                      'receita'
                        ? 'Receita'
                        : 'Despesa',
                  },

                  {
                    label:
                      'Valor',
                    valor:
                      formatarMoeda(
                        obterValor(
                          itemVisualizar
                        )
                      ),
                  },

                  {
                    label:
                      'Categoria',
                    valor:
                      itemVisualizar.categoria ||
                      'Não informada',
                  },

                  {
                    label:
                      'Vencimento',
                    valor:
                      formatarData(
                        itemVisualizar.data_vencimento
                      ),
                  },

                  {
                    label:
                      'Status',
                    valor:
                      status,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/[0.065] bg-white/[0.018] p-4"
                  >
                    <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/28">
                      {item.label}
                    </p>

                    <p className="mt-2 text-xs font-medium text-[#EDEDE3]/72">
                      {item.valor}
                    </p>
                  </div>
                ))}
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
            </div>
          </div>
        );
      })()}

      {/* EDIÇÃO */}

      {itemEditar && (() => {
        const tipo =
          normalizarTipo(
            itemEditar.tipo
          );

        const status =
          obterStatus(
            itemEditar
          );

        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-[680px] overflow-y-auto rounded-[26px] border border-white/[0.09] bg-[#091510] shadow-[0_35px_100px_rgba(0,0,0,0.65)]">
              <div className="flex items-start justify-between gap-5 border-b border-white/[0.07] px-6 py-5">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                    Financeiro • Edição
                  </p>

                  <h3
                    className="mt-2 text-2xl text-[#F0F0E8]"
                    style={{
                      fontFamily:
                        'var(--font-fraunces), serif',
                    }}
                  >
                    Editar lançamento
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setItemEditar(
                      null
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-[#EDEDE3]/45"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={
                  salvarEdicao
                }
                className="space-y-5 p-6"
              >
                <div>
                  <label
                    className={
                      labelClass
                    }
                  >
                    Natureza
                  </label>

                  <div
                    className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-semibold ${tipoClasses(
                      tipo
                    )}`}
                  >
                    {tipo ===
                    'receita'
                      ? 'Receita'
                      : 'Despesa'}
                  </div>
                </div>

                <div>
                  <label
                    className={
                      labelClass
                    }
                  >
                    Descrição *
                  </label>

                  <input
                    type="text"
                    required
                    value={
                      itemEditar.descricao ||
                      itemEditar.descrição ||
                      ''
                    }
                    onChange={(
                      event
                    ) =>
                      setItemEditar({
                        ...itemEditar,

                        descricao:
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
                    <label
                      className={
                        labelClass
                      }
                    >
                      Valor (R$) *
                    </label>

                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      value={
                        valorEdicao
                      }
                      onChange={(
                        event
                      ) =>
                        setValorEdicao(
                          event.target
                            .value
                        )
                      }
                      placeholder="Ex.: 3.500"
                      className={
                        inputClass
                      }
                    />
                  </div>

                  <div>
                    <label
                      className={
                        labelClass
                      }
                    >
                      Categoria
                    </label>

                    <input
                      type="text"
                      value={
                        itemEditar.categoria ||
                        ''
                      }
                      onChange={(
                        event
                      ) =>
                        setItemEditar({
                          ...itemEditar,

                          categoria:
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
                    <label
                      className={
                        labelClass
                      }
                    >
                      Data de vencimento *
                    </label>

                    <input
                      type="date"
                      required
                      value={
                        itemEditar.data_vencimento
                          ?.split(
                            'T'
                          )[0] ||
                        ''
                      }
                      onChange={(
                        event
                      ) =>
                        setItemEditar({
                          ...itemEditar,

                          data_vencimento:
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
                    <label
                      className={
                        labelClass
                      }
                    >
                      Status
                    </label>

                    <select
                      value={status}
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
                      {tipo ===
                      'receita' ? (
                        <>
                          <option value="Recebido">
                            Recebido
                          </option>

                          <option value="Pendente">
                            Pendente
                          </option>
                        </>
                      ) : (
                        <>
                          <option value="Pago">
                            Pago
                          </option>

                          <option value="Pendente">
                            Pendente
                          </option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setItemEditar(
                        null
                      )
                    }
                    className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 py-3 text-xs font-semibold text-[#EDEDE3]/55"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={
                      salvandoEdicao
                    }
                    className="rounded-xl bg-[#E3A144] px-6 py-3 text-xs font-bold text-[#07130F] disabled:opacity-50"
                  >
                    {salvandoEdicao
                      ? 'Salvando...'
                      : 'Salvar alterações'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* EXCLUSÃO */}

      {itemExcluir && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[430px] rounded-[26px] border border-white/[0.09] bg-[#091510] p-6 text-center">
            <h3
              className="text-2xl text-[#F0F0E8]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Excluir lançamento?
            </h3>

            <p className="mt-3 text-xs leading-6 text-[#EDEDE3]/38">
              O lançamento{' '}
              <strong className="text-[#EDEDE3]/70">
                {obterDescricao(
                  itemExcluir
                ) ||
                  'selecionado'}
              </strong>{' '}
              será removido
              permanentemente.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={excluindo}
                onClick={() =>
                  setItemExcluir(null)
                }
                className="rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-3 text-xs font-semibold text-[#EDEDE3]/60"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={excluindo}
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
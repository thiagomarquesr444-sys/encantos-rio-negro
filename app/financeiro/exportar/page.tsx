'use client';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';

import { supabase } from '@/lib/supabase';

interface Lancamento {
  id?: string;

  data_vencimento?: string | null;

  tipo?: string | null;

  descricao?: string | null;
  descrição?: string | null;

  categoria?: string | null;

  valor?:
    | number
    | string
    | null;

  Valor?:
    | number
    | string
    | null;

  status?: string | null;
  Status?: string | null;
}

function converterValor(
  entrada: unknown
) {
  const numero =
    Number(entrada);

  return Number.isFinite(numero)
    ? numero
    : 0;
}

function obterValor(
  item: Lancamento
) {
  return converterValor(
    item.valor !== undefined
      ? item.valor
      : item.Valor
  );
}

function obterDescricao(
  item: Lancamento
) {
  return (
    item.descricao ||
    item.descrição ||
    ''
  );
}

function obterStatus(
  item: Lancamento
) {
  return (
    item.status ||
    item.Status ||
    ''
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

function formatarValorCSV(
  valor: number
) {
  return valor.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

function formatarData(
  data?: string | null
) {
  if (!data) {
    return '';
  }

  const partes =
    data
      .split('T')[0]
      .split('-');

  if (
    partes.length !== 3
  ) {
    return data;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function protegerCSV(
  entrada: unknown
) {
  let valor = String(
    entrada ?? ''
  );

  /*
    Reduz risco de interpretação
    como fórmula no Excel.
  */

  if (
    /^[=+\-@]/.test(valor)
  ) {
    valor = `'${valor}`;
  }

  return `"${valor.replace(
    /"/g,
    '""'
  )}"`;
}

export default function ExportarRelatorioPage() {
  const [
    carregando,
    setCarregando,
  ] = useState(false);

  const [
    dados,
    setDados,
  ] =
    useState<Lancamento[]>(
      []
    );

  const [
    mensagem,
    setMensagem,
  ] = useState('');

  async function buscarDadosFinanceiros() {
    setCarregando(true);
    setMensagem('');

    try {
      const {
        data,
        error,
      } = await supabase
        .from('financeiro')
        .select('*')
        .order(
          'data_vencimento',
          {
            ascending: false,
          }
        );

      if (error) {
        throw error;
      }

      setDados(
        (data ||
          []) as Lancamento[]
      );
    } catch (err) {
      console.error(
        'Erro ao buscar dados financeiros:',
        err
      );

      setMensagem(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar os dados para exportação.'
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    buscarDadosFinanceiros();
  }, []);

  const totais =
    useMemo(() => {
      let receitas = 0;
      let despesas = 0;

      dados.forEach(
        (item) => {
          const tipo =
            String(
              item.tipo || ''
            )
              .trim()
              .toLowerCase();

          const valor =
            obterValor(
              item
            );

          if (
            tipo ===
            'receita'
          ) {
            receitas += valor;
          }

          if (
            tipo ===
            'despesa'
          ) {
            despesas += valor;
          }
        }
      );

      return {
        receitas,
        despesas,
      };
    }, [dados]);

  function baixarCSV() {
    if (
      dados.length === 0
    ) {
      setMensagem(
        'Não há dados para exportar.'
      );

      return;
    }

    const cabecalho = [
      'ID',
      'Data',
      'Tipo',
      'Descrição',
      'Categoria',
      'Valor (R$)',
      'Status',
    ];

    const linhas =
      dados.map(
        (item) => [
          protegerCSV(
            item.id || ''
          ),

          protegerCSV(
            formatarData(
              item.data_vencimento
            )
          ),

          protegerCSV(
            item.tipo || ''
          ),

          protegerCSV(
            obterDescricao(
              item
            )
          ),

          protegerCSV(
            item.categoria ||
              ''
          ),

          protegerCSV(
            formatarValorCSV(
              obterValor(
                item
              )
            )
          ),

          protegerCSV(
            obterStatus(
              item
            )
          ),
        ]
      );

    const conteudoCSV = [
      cabecalho
        .map(protegerCSV)
        .join(';'),

      ...linhas.map(
        (linha) =>
          linha.join(';')
      ),
    ].join('\r\n');

    /*
      BOM UTF-8 ajuda Excel
      com caracteres acentuados.
    */

    const blob =
      new Blob(
        [
          '\uFEFF',
          conteudoCSV,
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

    link.href = url;

    link.download =
      `relatorio_financeiro_ern_${
        new Date()
          .toISOString()
          .split('T')[0]
      }.csv`;

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
  }

  return (
    <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      <section className="border-b border-white/[0.07] bg-[#091510]">
        <div className="mx-auto max-w-[1360px] px-5 py-10 md:px-8 md:py-12">
          <Link
            href="/financeiro"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#EDEDE3]/38 transition hover:text-[#E3A144]"
          >
            ← Financeiro
          </Link>

          <div className="mt-7">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
              Financeiro • Relatório
            </p>

            <h1
              className="mt-3 text-4xl tracking-[-0.035em] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Exportar financeiro
            </h1>

            <p className="mt-4 max-w-[680px] text-sm leading-7 text-[#EDEDE3]/40">
              Visualize os
              lançamentos disponíveis
              e gere um arquivo CSV
              para análise ou
              arquivamento.
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1360px] px-5 py-8 md:px-8 md:py-10">
        {mensagem && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-5 py-4 text-xs text-red-300">
            {mensagem}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[22px] border border-white/[0.075] bg-[#0A1713] p-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#7C9C87]">
              Lançamentos
            </p>

            <p
              className="mt-4 text-3xl text-[#F0F0E8]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              {carregando
                ? '—'
                : dados.length}
            </p>
          </div>

          <div className="rounded-[22px] border border-white/[0.075] bg-[#0A1713] p-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-300/60">
              Receitas lançadas
            </p>

            <p
              className="mt-4 text-2xl text-emerald-300"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              {carregando
                ? '—'
                : formatarMoeda(
                    totais.receitas
                  )}
            </p>
          </div>

          <div className="rounded-[22px] border border-white/[0.075] bg-[#0A1713] p-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-red-300/60">
              Despesas lançadas
            </p>

            <p
              className="mt-4 text-2xl text-red-300"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              {carregando
                ? '—'
                : formatarMoeda(
                    totais.despesas
                  )}
            </p>
          </div>
        </div>

        <section className="mt-6 overflow-hidden rounded-[26px] border border-white/[0.075] bg-[#0A1713]">
          <div className="flex flex-col gap-5 border-b border-white/[0.065] p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                Pré-visualização
              </p>

              <h2
                className="mt-2 text-2xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Dados para exportação
              </h2>

              <p className="mt-2 text-[10px] text-[#EDEDE3]/30">
                {carregando
                  ? 'Carregando lançamentos...'
                  : `${dados.length} registro(s) disponível(is).`}
              </p>
            </div>

            <button
              type="button"
              onClick={baixarCSV}
              disabled={
                carregando ||
                dados.length === 0
              }
              className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-[#E3A144] px-6 text-xs font-bold text-[#07130F] transition hover:bg-[#F0B35C] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Exportar CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            {carregando ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/[0.08] border-t-[#E3A144]" />
              </div>
            ) : dados.length ===
              0 ? (
              <div className="flex min-h-[300px] items-center justify-center text-xs text-[#EDEDE3]/30">
                Nenhum lançamento encontrado.
              </div>
            ) : (
              <table className="min-w-[1050px] w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.012]">
                    {[
                      'Data',
                      'Tipo',
                      'Descrição',
                      'Categoria',
                      'Valor',
                      'Status',
                    ].map((titulo) => (
                      <th
                        key={titulo}
                        className="px-5 py-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/28"
                      >
                        {titulo}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.055]">
                  {dados.map(
                    (
                      item,
                      index
                    ) => {
                      const tipo =
                        String(
                          item.tipo ||
                            ''
                        )
                          .trim()
                          .toLowerCase();

                      const receita =
                        tipo ===
                        'receita';

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
                            ) ||
                              '—'}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold ${
                                receita
                                  ? 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300'
                                  : 'border-red-500/20 bg-red-500/[0.07] text-red-300'
                              }`}
                            >
                              {receita
                                ? 'Receita'
                                : 'Despesa'}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-xs font-semibold text-[#EDEDE3]/75">
                            {obterDescricao(
                              item
                            ) ||
                              '—'}
                          </td>

                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/42">
                            {item.categoria ||
                              '—'}
                          </td>

                          <td
                            className={`px-5 py-4 text-xs font-semibold ${
                              receita
                                ? 'text-emerald-300'
                                : 'text-red-300'
                            }`}
                          >
                            {formatarMoeda(
                              obterValor(
                                item
                              )
                            )}
                          </td>

                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/50">
                            {obterStatus(
                              item
                            ) ||
                              '—'}
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
    </div>
  );
}
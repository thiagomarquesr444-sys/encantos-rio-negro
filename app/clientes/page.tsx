'use client';

import React, {
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  supabase,
  isSupabaseConfigured,
} from '@/lib/supabase';

interface Cliente {
  id?: string | number;
  nome: string;
  documento?: string;
  telefone?: string;
  email?: string;
  cidade?: string;
  nacionalidade?: string;
  situacao?: string;
  situação?: string;
  created_at?: string;
  observacoes?: string;
}

export default function ClientesPage() {
  const router = useRouter();

  const [clientes, setClientes] =
    useState<Cliente[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [busca, setBusca] =
    useState('');

  const [
    filtroSituacao,
    setFiltroSituacao,
  ] = useState('');

  const [
    modalVisualizarAberto,
    setModalVisualizarAberto,
  ] = useState(false);

  const [
    clienteSelecionado,
    setClienteSelecionado,
  ] = useState<Cliente | null>(null);

  const [
    modalExcluirAberto,
    setModalExcluirAberto,
  ] = useState(false);

  const [
    idParaExcluir,
    setIdParaExcluir,
  ] = useState<string | number | null>(
    null
  );

  /*
    ============================================================
    CARREGAMENTO
    ============================================================
  */

  const fetchClientes = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } =
        await supabase
          .from('clientes')
          .select('*')
          .order('created_at', {
            ascending: false,
          });

      if (error) {
        console.warn(
          '[Clientes] Erro:',
          error.message
        );

        return;
      }

      if (data) {
        const clientesFormatados =
          data.map((item: any) => ({
            ...item,
            situacao:
              item.situacao ||
              item.situação ||
              'Ativo',
          }));

        setClientes(
          clientesFormatados
        );
      }
    } catch (err) {
      console.warn(
        '[Clientes] Falha de rede:',
        err
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  /*
    ============================================================
    FILTROS
    ============================================================
  */

  const clientesFiltrados =
    clientes.filter((cliente) => {
      const termo =
        busca.trim().toLowerCase();

      const atendeBusca =
        termo.length === 0 ||
        cliente.nome
          ?.toLowerCase()
          .includes(termo) ||
        cliente.documento
          ?.toLowerCase()
          .includes(termo) ||
        cliente.email
          ?.toLowerCase()
          .includes(termo) ||
        cliente.cidade
          ?.toLowerCase()
          .includes(termo);

      const situacaoAtual =
        cliente.situacao || 'Ativo';

      const atendeSituacao =
        filtroSituacao.length === 0 ||
        situacaoAtual.toLowerCase() ===
          filtroSituacao.toLowerCase();

      return (
        atendeBusca &&
        atendeSituacao
      );
    });

  const totalClientes =
    clientes.length;

  const ativos = clientes.filter(
    (cliente) =>
      (
        cliente.situacao || 'Ativo'
      ).toLowerCase() === 'ativo'
  ).length;

  const inativos = clientes.filter(
    (cliente) =>
      (
        cliente.situacao || ''
      ).toLowerCase() === 'inativo'
  ).length;

  const alternarFiltro = (
    situacao: string
  ) => {
    setFiltroSituacao((atual) =>
      atual === situacao
        ? ''
        : situacao
    );
  };

  /*
    ============================================================
    VISUALIZAÇÃO
    ============================================================
  */

  const abrirVisualizacao = (
    cliente: Cliente
  ) => {
    setClienteSelecionado(cliente);
    setModalVisualizarAberto(true);
  };

  /*
    ============================================================
    EXCLUSÃO
    ============================================================
  */

  const confirmarExclusao = (
    id: string | number | undefined
  ) => {
    if (!id) return;

    setIdParaExcluir(id);
    setModalExcluirAberto(true);
  };

  const executarExclusao =
    async () => {
      if (!idParaExcluir) return;

      try {
        const { error } =
          await supabase
            .from('clientes')
            .delete()
            .eq('id', idParaExcluir);

        if (error) {
          throw error;
        }

        setClientes((atuais) =>
          atuais.filter(
            (cliente) =>
              cliente.id !==
              idParaExcluir
          )
        );

        setModalExcluirAberto(
          false
        );

        setIdParaExcluir(null);
      } catch (err) {
        const mensagem =
          err instanceof Error
            ? err.message
            : 'Erro desconhecido';

        alert(
          'Erro ao excluir cliente: ' +
            mensagem
        );
      }
    };

  const indicadores = [
    {
      titulo: 'Todos',
      valor: totalClientes,
      detalhe:
        'clientes cadastrados',
      filtro: '',
    },
    {
      titulo: 'Ativos',
      valor: ativos,
      detalhe:
        'cadastros regulares',
      filtro: 'Ativo',
    },
    {
      titulo: 'Inativos',
      valor: inativos,
      detalhe:
        'requerem atenção',
      filtro: 'Inativo',
    },
  ];

  return (
    <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      {/* =======================================================
          CABEÇALHO
      ======================================================== */}

      <section className="border-b border-white/[0.07] bg-[#091510]">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-8 px-5 py-10 md:px-8 md:py-12 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-[#E3A144]" />

              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                Operação • Clientes
              </span>
            </div>

            <h1
              className="mt-4 text-4xl leading-none tracking-[-0.035em] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Clientes
            </h1>

            <p className="mt-4 max-w-[650px] text-sm leading-7 text-[#EDEDE3]/42">
              Consulte, organize e
              mantenha atualizadas as
              informações dos viajantes
              atendidos pela sua operação.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                '/clientes/novo'
              )
            }
            className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[#E3A144] px-6 text-sm font-bold text-[#07130F] transition hover:-translate-y-0.5 hover:bg-[#F0B35C]"
          >
            <span className="text-lg">
              +
            </span>
            Novo cliente
          </button>
        </div>
      </section>

      <main className="mx-auto max-w-[1360px] px-5 py-8 md:px-8 md:py-10">
        {/* =====================================================
            INDICADORES
        ====================================================== */}

        <div className="grid gap-4 md:grid-cols-3">
          {indicadores.map(
            (indicador) => {
              const ativo =
                indicador.filtro !==
                  '' &&
                filtroSituacao ===
                  indicador.filtro;

              return (
                <button
                  key={
                    indicador.titulo
                  }
                  type="button"
                  onClick={() => {
                    if (
                      indicador.filtro
                    ) {
                      alternarFiltro(
                        indicador.filtro
                      );
                    } else {
                      setFiltroSituacao(
                        ''
                      );
                    }
                  }}
                  className={`rounded-[22px] border p-5 text-left transition ${
                    ativo
                      ? 'border-[#E3A144]/35 bg-[#E3A144]/8'
                      : 'border-white/[0.075] bg-[#0A1713] hover:border-white/[0.14] hover:bg-[#0C1B16]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                      {
                        indicador.titulo
                      }
                    </span>

                    {ativo && (
                      <span className="rounded-full bg-[#E3A144]/10 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-[#E3A144]">
                        Filtrando
                      </span>
                    )}
                  </div>

                  <strong
                    className="mt-5 block text-4xl font-medium tracking-[-0.04em] text-[#F0F0E8]"
                    style={{
                      fontFamily:
                        'var(--font-fraunces), serif',
                    }}
                  >
                    {loading
                      ? '—'
                      : indicador.valor}
                  </strong>

                  <p className="mt-2 text-[11px] text-[#EDEDE3]/28">
                    {
                      indicador.detalhe
                    }
                  </p>
                </button>
              );
            }
          )}
        </div>

        {/* =====================================================
            BASE DE CLIENTES
        ====================================================== */}

        <section className="mt-6 overflow-hidden rounded-[26px] border border-white/[0.075] bg-[#0A1713]">
          {/* CABEÇALHO */}

          <div className="border-b border-white/[0.065] p-5 md:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  Base operacional
                </p>

                <h2
                  className="mt-2 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Carteira de clientes
                </h2>

                <p className="mt-2 text-xs text-[#EDEDE3]/30">
                  {
                    clientesFiltrados.length
                  }{' '}
                  registro
                  {clientesFiltrados.length !==
                  1
                    ? 's'
                    : ''}{' '}
                  encontrado
                  {clientesFiltrados.length !==
                  1
                    ? 's'
                    : ''}
                  .
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
                    value={busca}
                    onChange={(event) =>
                      setBusca(
                        event.target.value
                      )
                    }
                    placeholder="Buscar cliente..."
                    className="h-[44px] w-full min-w-[260px] rounded-xl border border-white/[0.08] bg-[#07110E] pl-10 pr-4 text-xs text-[#EDEDE3] outline-none placeholder:text-[#EDEDE3]/22 focus:border-[#E3A144]/35 sm:w-[300px]"
                  />
                </div>

                <select
                  value={
                    filtroSituacao
                  }
                  onChange={(event) =>
                    setFiltroSituacao(
                      event.target.value
                    )
                  }
                  className="h-[44px] rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-xs text-[#EDEDE3]/70 outline-none focus:border-[#E3A144]/35"
                >
                  <option value="">
                    Todas as situações
                  </option>

                  <option value="Ativo">
                    Ativos
                  </option>

                  <option value="Inativo">
                    Inativos
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* TABELA */}

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex min-h-[320px] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/[0.08] border-t-[#E3A144]" />

                  <p className="mt-4 text-xs text-[#EDEDE3]/35">
                    Carregando clientes...
                  </p>
                </div>
              </div>
            ) : clientesFiltrados.length ===
              0 ? (
              <div className="flex min-h-[320px] items-center justify-center px-5 text-center">
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.025] text-[#E3A144]">
                    ✦
                  </div>

                  <h3
                    className="mt-5 text-2xl text-[#F0F0E8]"
                    style={{
                      fontFamily:
                        'var(--font-fraunces), serif',
                    }}
                  >
                    Nenhum cliente
                    encontrado.
                  </h3>

                  <p className="mt-2 text-xs text-[#EDEDE3]/30">
                    Ajuste os filtros ou
                    faça um novo cadastro.
                  </p>
                </div>
              </div>
            ) : (
              <table className="min-w-[1050px] w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.012]">
                    {[
                      'Cliente',
                      'Documento',
                      'Telefone',
                      'E-mail',
                      'Cidade',
                      'Situação',
                      'Ações',
                    ].map((item) => (
                      <th
                        key={item}
                        className={`px-5 py-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/28 ${
                          item ===
                          'Ações'
                            ? 'text-center'
                            : ''
                        }`}
                      >
                        {item}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.055]">
                  {clientesFiltrados.map(
                    (
                      cliente,
                      index
                    ) => {
                      const inativo =
                        (
                          cliente.situacao ||
                          ''
                        ).toLowerCase() ===
                        'inativo';

                      const iniciais =
                        cliente.nome
                          ?.split(' ')
                          .filter(
                            Boolean
                          )
                          .slice(0, 2)
                          .map((parte) =>
                            parte
                              .charAt(0)
                              .toUpperCase()
                          )
                          .join('') ||
                        'CL';

                      return (
                        <tr
                          key={
                            cliente.id ||
                            index
                          }
                          className="transition hover:bg-white/[0.018]"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E3A144]/15 bg-[#E3A144]/7 text-[10px] font-bold text-[#E3A144]">
                                {
                                  iniciais
                                }
                              </div>

                              <div>
                                <p className="text-xs font-semibold text-[#EDEDE3]/82">
                                  {
                                    cliente.nome
                                  }
                                </p>

                                {cliente.nacionalidade && (
                                  <p className="mt-1 text-[9px] text-[#EDEDE3]/25">
                                    {
                                      cliente.nacionalidade
                                    }
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-xs font-mono text-[#EDEDE3]/42">
                            {cliente.documento ||
                              '—'}
                          </td>

                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/42">
                            {cliente.telefone ||
                              '—'}
                          </td>

                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/42">
                            {cliente.email ||
                              '—'}
                          </td>

                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/42">
                            {cliente.cidade ||
                              '—'}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[9px] font-semibold ${
                                inativo
                                  ? 'border-red-500/20 bg-red-500/[0.07] text-red-300'
                                  : 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  inativo
                                    ? 'bg-red-400'
                                    : 'bg-emerald-400'
                                }`}
                              />

                              {cliente.situacao ||
                                'Ativo'}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  abrirVisualizacao(
                                    cliente
                                  )
                                }
                                title="Visualizar"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-[#EDEDE3]/38 transition hover:border-[#E3A144]/20 hover:bg-[#E3A144]/7 hover:text-[#E3A144]"
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

                              <Link
                                href={`/clientes/editar/${cliente.id}`}
                                title="Editar"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-[#EDEDE3]/38 transition hover:border-sky-400/20 hover:bg-sky-400/[0.06] hover:text-sky-300"
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
                                    d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L8 18l-4 1 1-4L16.5 3.5z"
                                  />
                                </svg>
                              </Link>

                              <button
                                type="button"
                                onClick={() =>
                                  confirmarExclusao(
                                    cliente.id
                                  )
                                }
                                title="Excluir"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-[#EDEDE3]/38 transition hover:border-red-400/20 hover:bg-red-400/[0.06] hover:text-red-300"
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
                                    d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v5m4-5v5"
                                  />
                                </svg>
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

      {/* =======================================================
          MODAL DETALHES
      ======================================================== */}

      {modalVisualizarAberto &&
        clienteSelecionado && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-[640px] overflow-hidden rounded-[26px] border border-white/[0.09] bg-[#091510] shadow-[0_35px_100px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                    Perfil do cliente
                  </p>

                  <h3
                    className="mt-1 text-2xl text-[#F0F0E8]"
                    style={{
                      fontFamily:
                        'var(--font-fraunces), serif',
                    }}
                  >
                    {
                      clienteSelecionado.nome
                    }
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setModalVisualizarAberto(
                      false
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-[#EDEDE3]/45 transition hover:bg-white/[0.06] hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="grid gap-4 p-6 sm:grid-cols-2">
                {[
                  {
                    label: 'Documento',
                    valor:
                      clienteSelecionado.documento,
                  },
                  {
                    label:
                      'Telefone / WhatsApp',
                    valor:
                      clienteSelecionado.telefone,
                  },
                  {
                    label: 'E-mail',
                    valor:
                      clienteSelecionado.email,
                  },
                  {
                    label: 'Cidade',
                    valor:
                      clienteSelecionado.cidade,
                  },
                  {
                    label:
                      'Nacionalidade',
                    valor:
                      clienteSelecionado.nacionalidade,
                  },
                  {
                    label: 'Situação',
                    valor:
                      clienteSelecionado.situacao ||
                      'Ativo',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/[0.065] bg-white/[0.018] p-4"
                  >
                    <p className="text-[8px] font-semibold uppercase tracking-[0.17em] text-[#EDEDE3]/28">
                      {item.label}
                    </p>

                    <p className="mt-2 break-words text-xs font-medium text-[#EDEDE3]/75">
                      {item.valor ||
                        'Não informado'}
                    </p>
                  </div>
                ))}

                <div className="sm:col-span-2">
                  <p className="mb-2 text-[8px] font-semibold uppercase tracking-[0.17em] text-[#EDEDE3]/28">
                    Observações
                  </p>

                  <div className="min-h-[90px] rounded-2xl border border-white/[0.065] bg-[#07110E] p-4 text-xs leading-6 text-[#EDEDE3]/50">
                    {clienteSelecionado.observacoes ||
                      'Nenhuma observação registrada para este cliente.'}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-white/[0.07] px-6 py-4">
                <Link
                  href={`/clientes/editar/${clienteSelecionado.id}`}
                  className="rounded-xl border border-white/[0.09] bg-white/[0.03] px-5 py-2.5 text-xs font-semibold text-[#EDEDE3]/65 transition hover:bg-white/[0.06]"
                >
                  Editar cliente
                </Link>

                <button
                  type="button"
                  onClick={() =>
                    setModalVisualizarAberto(
                      false
                    )
                  }
                  className="rounded-xl bg-[#E3A144] px-5 py-2.5 text-xs font-bold text-[#07130F]"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

      {/* =======================================================
          MODAL EXCLUSÃO
      ======================================================== */}

      {modalExcluirAberto && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[430px] rounded-[26px] border border-white/[0.09] bg-[#091510] p-6 text-center shadow-[0_35px_100px_rgba(0,0,0,0.65)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-red-500/20 bg-red-500/[0.08] text-red-300">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.3 4.3L2.8 17.3A2 2 0 004.5 20h15a2 2 0 001.7-2.7L13.7 4.3a2 2 0 00-3.4 0z"
                />
              </svg>
            </div>

            <h3
              className="mt-5 text-2xl text-[#F0F0E8]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Excluir cliente?
            </h3>

            <p className="mx-auto mt-3 max-w-[320px] text-xs leading-6 text-[#EDEDE3]/38">
              Este registro será removido
              da base. A ação não poderá
              ser desfeita.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setModalExcluirAberto(
                    false
                  );
                  setIdParaExcluir(null);
                }}
                className="rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-3 text-xs font-semibold text-[#EDEDE3]/60 transition hover:bg-white/[0.05]"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={
                  executarExclusao
                }
                className="rounded-xl border border-red-500/20 bg-red-500/[0.1] px-4 py-3 text-xs font-semibold text-red-300 transition hover:bg-red-500/[0.16]"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';

import { supabase } from '@/lib/supabase';

type StatusEmbarcacao =
  | 'Disponível'
  | 'Reservada'
  | 'Manutenção'
  | 'Inativa';

interface Embarcacao {
  id?: string;

  nome: string;

  tipo?: string | null;

  capacidade?:
    | number
    | string
    | null;

  marinheiro?: string | null;

  motor?: string | null;

  situacao?: string | null;

  status?: string | null;

  created_at?: string | null;
}

/*
  ============================================================
  NORMALIZAÇÃO DE STATUS
  ============================================================

  Compatibilidade com registros antigos:

  Ativo     -> Disponível
  Inativo   -> Inativa

  Registros novos usam:
  Disponível
  Reservada
  Manutenção
  Inativa
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
): StatusEmbarcacao {
  const status = removerAcentos(
    (valor || '')
      .trim()
      .toLowerCase()
  );

  if (
    status ===
      'reservada' ||
    status ===
      'reservado'
  ) {
    return 'Reservada';
  }

  if (
    status ===
      'manutencao' ||
    status ===
      'em manutencao'
  ) {
    return 'Manutenção';
  }

  if (
    status ===
      'inativo' ||
    status ===
      'inativa'
  ) {
    return 'Inativa';
  }

  /*
    "Ativo" é um status legado.
    Operacionalmente ele equivale
    a uma embarcação disponível.
  */

  return 'Disponível';
}

function obterCapacidade(
  valor: unknown
) {
  const numero =
    Number(valor);

  if (
    !Number.isFinite(numero) ||
    numero < 0
  ) {
    return 0;
  }

  return Math.trunc(numero);
}

export default function EmbarcacoesPage() {
  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  const [
    embarcacoes,
    setEmbarcacoes,
  ] = useState<Embarcacao[]>([]);

  const [
    busca,
    setBusca,
  ] = useState('');

  const [
    filtroTipo,
    setFiltroTipo,
  ] = useState('');

  const [
    filtroStatus,
    setFiltroStatus,
  ] =
    useState<
      '' | StatusEmbarcacao
    >('');

  const [
    embarcacaoVisualizando,
    setEmbarcacaoVisualizando,
  ] =
    useState<Embarcacao | null>(
      null
    );

  const [
    embarcacaoEditando,
    setEmbarcacaoEditando,
  ] =
    useState<Embarcacao | null>(
      null
    );

  const [
    statusEdicao,
    setStatusEdicao,
  ] =
    useState<StatusEmbarcacao>(
      'Disponível'
    );

  const [
    embarcacaoExcluindo,
    setEmbarcacaoExcluindo,
  ] =
    useState<Embarcacao | null>(
      null
    );

  const [
    salvandoEdicao,
    setSalvandoEdicao,
  ] = useState(false);

  const [
    excluindoItem,
    setExcluindoItem,
  ] = useState(false);

  const [
    toast,
    setToast,
  ] = useState<{
    mensagem: string;
    tipo: 'sucesso' | 'erro';
  } | null>(null);

  /*
    ============================================================
    FEEDBACK
    ============================================================
  */

  function mostrarToast(
    mensagem: string,
    tipo: 'sucesso' | 'erro'
  ) {
    setToast({
      mensagem,
      tipo,
    });

    setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  /*
    ============================================================
    CARREGAMENTO
    ============================================================
  */

  async function fetchEmbarcacoes() {
    setLoading(true);
    setError(null);

    try {
      const {
        data,
        error: supabaseError,
      } = await supabase
        .from('embarcacoes')
        .select('*')
        .order('created_at', {
          ascending: false,
        });

      if (supabaseError) {
        throw supabaseError;
      }

      setEmbarcacoes(
        (data ||
          []) as Embarcacao[]
      );
    } catch (err) {
      console.error(
        'Erro ao carregar embarcações:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar a frota.'
      );

      setEmbarcacoes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEmbarcacoes();
  }, []);

  /*
    ============================================================
    ABRIR EDIÇÃO
    ============================================================
  */

  function abrirEdicao(
    embarcacao: Embarcacao
  ) {
    setEmbarcacaoEditando({
      ...embarcacao,

      capacidade:
        embarcacao.capacidade ??
        '',
    });

    setStatusEdicao(
      normalizarStatus(
        embarcacao.status
      )
    );

    setError(null);
  }

  /*
    ============================================================
    SALVAR EDIÇÃO
    ============================================================
  */

  async function handleSalvarEdicao(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (
      !embarcacaoEditando?.id
    ) {
      mostrarToast(
        'ID da embarcação não encontrado.',
        'erro'
      );

      return;
    }

    const nome =
      embarcacaoEditando.nome
        ?.trim();

    if (!nome) {
      setError(
        'Informe o nome da embarcação.'
      );

      return;
    }

    const capacidade =
      obterCapacidade(
        embarcacaoEditando.capacidade
      );

    if (
      capacidade <= 0
    ) {
      setError(
        'Informe uma capacidade válida e maior que zero.'
      );

      return;
    }

    setSalvandoEdicao(
      true
    );

    setError(null);

    try {
      const payload = {
        nome,

        tipo:
          embarcacaoEditando.tipo
            ?.trim() ||
          null,

        capacidade,

        marinheiro:
          embarcacaoEditando.marinheiro
            ?.trim() ||
          null,

        motor:
          embarcacaoEditando.motor
            ?.trim() ||
          null,

        situacao:
          embarcacaoEditando.situacao
            ?.trim() ||
          null,

        status:
          statusEdicao,
      };

      const {
        error: updateError,
      } = await supabase
        .from('embarcacoes')
        .update(payload)
        .eq(
          'id',
          embarcacaoEditando.id
        );

      if (updateError) {
        throw updateError;
      }

      setEmbarcacaoEditando(
        null
      );

      mostrarToast(
        'Embarcação atualizada com sucesso.',
        'sucesso'
      );

      await fetchEmbarcacoes();
    } catch (err) {
      console.error(
        'Erro ao atualizar embarcação:',
        err
      );

      mostrarToast(
        err instanceof Error
          ? `Erro ao atualizar: ${err.message}`
          : 'Não foi possível atualizar a embarcação.',
        'erro'
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

  async function handleExcluirConfirmado() {
    if (
      !embarcacaoExcluindo?.id
    ) {
      return;
    }

    setExcluindoItem(true);

    try {
      const {
        error: deleteError,
      } = await supabase
        .from('embarcacoes')
        .delete()
        .eq(
          'id',
          embarcacaoExcluindo.id
        );

      if (deleteError) {
        throw deleteError;
      }

      setEmbarcacoes(
        (atuais) =>
          atuais.filter(
            (embarcacao) =>
              embarcacao.id !==
              embarcacaoExcluindo.id
          )
      );

      setEmbarcacaoExcluindo(
        null
      );

      mostrarToast(
        'Embarcação excluída com sucesso.',
        'sucesso'
      );
    } catch (err) {
      mostrarToast(
        err instanceof Error
          ? `Erro ao excluir: ${err.message}`
          : 'Não foi possível excluir a embarcação.',
        'erro'
      );
    } finally {
      setExcluindoItem(false);
    }
  }

  /*
    ============================================================
    MÉTRICAS
    ============================================================
  */

  const totalEmbarcacoes =
    embarcacoes.length;

  const disponiveis =
    embarcacoes.filter(
      (embarcacao) =>
        normalizarStatus(
          embarcacao.status
        ) === 'Disponível'
    ).length;

  const reservadas =
    embarcacoes.filter(
      (embarcacao) =>
        normalizarStatus(
          embarcacao.status
        ) === 'Reservada'
    ).length;

  const emManutencao =
    embarcacoes.filter(
      (embarcacao) =>
        normalizarStatus(
          embarcacao.status
        ) === 'Manutenção'
    ).length;

  const inativas =
    embarcacoes.filter(
      (embarcacao) =>
        normalizarStatus(
          embarcacao.status
        ) === 'Inativa'
    ).length;

  const capacidadeTotal =
    embarcacoes.reduce(
      (
        total,
        embarcacao
      ) =>
        total +
        obterCapacidade(
          embarcacao.capacidade
        ),
      0
    );

  /*
    ============================================================
    TIPOS DINÂMICOS
    ============================================================
  */

  const tiposDisponiveis =
    useMemo(() => {
      return Array.from(
        new Set(
          embarcacoes
            .map((item) =>
              item.tipo?.trim()
            )
            .filter(
              (
                tipo
              ): tipo is string =>
                Boolean(tipo)
            )
        )
      ).sort();
    }, [embarcacoes]);

  /*
    ============================================================
    FILTROS
    ============================================================
  */

  const embarcacoesFiltradas =
    useMemo(() => {
      const termo =
        busca
          .trim()
          .toLowerCase();

      return embarcacoes.filter(
        (item) => {
          const atendeBusca =
            !termo ||
            item.nome
              ?.toLowerCase()
              .includes(termo) ||
            item.tipo
              ?.toLowerCase()
              .includes(termo) ||
            item.marinheiro
              ?.toLowerCase()
              .includes(termo) ||
            item.motor
              ?.toLowerCase()
              .includes(termo) ||
            item.situacao
              ?.toLowerCase()
              .includes(termo);

          const atendeTipo =
            !filtroTipo ||
            item.tipo ===
              filtroTipo;

          const status =
            normalizarStatus(
              item.status
            );

          const atendeStatus =
            !filtroStatus ||
            status ===
              filtroStatus;

          return (
            atendeBusca &&
            atendeTipo &&
            atendeStatus
          );
        }
      );
    }, [
      embarcacoes,
      busca,
      filtroTipo,
      filtroStatus,
    ]);

  function alternarStatus(
    status: StatusEmbarcacao
  ) {
    setFiltroStatus(
      (atual) =>
        atual === status
          ? ''
          : status
    );
  }

  const cards = [
    {
      titulo:
        'Total da frota',
      valor: loading
        ? '—'
        : String(
            totalEmbarcacoes
          ),
      detalhe:
        'embarcações cadastradas',
      filtro: null,
    },

    {
      titulo: 'Disponíveis',
      valor: loading
        ? '—'
        : String(disponiveis),
      detalhe:
        'prontas para operação',
      filtro:
        'Disponível' as StatusEmbarcacao,
    },

    {
      titulo:
        'Em manutenção',
      valor: loading
        ? '—'
        : String(
            emManutencao
          ),
      detalhe:
        'fora de operação',
      filtro:
        'Manutenção' as StatusEmbarcacao,
    },

    {
      titulo:
        'Capacidade total',
      valor: loading
        ? '—'
        : String(
            capacidadeTotal
          ),
      detalhe:
        'passageiros cadastrados',
      filtro: null,
    },
  ];

  /*
    ============================================================
    STATUS VISUAL
    ============================================================
  */

  function statusClasses(
    status: StatusEmbarcacao
  ) {
    if (
      status ===
      'Disponível'
    ) {
      return 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300';
    }

    if (
      status ===
      'Reservada'
    ) {
      return 'border-sky-500/20 bg-sky-500/[0.07] text-sky-300';
    }

    if (
      status ===
      'Manutenção'
    ) {
      return 'border-amber-500/20 bg-amber-500/[0.07] text-amber-300';
    }

    return 'border-white/[0.09] bg-white/[0.035] text-[#EDEDE3]/45';
  }

  function statusDot(
    status: StatusEmbarcacao
  ) {
    if (
      status ===
      'Disponível'
    ) {
      return 'bg-emerald-400';
    }

    if (
      status ===
      'Reservada'
    ) {
      return 'bg-sky-400';
    }

    if (
      status ===
      'Manutenção'
    ) {
      return 'bg-amber-400';
    }

    return 'bg-[#EDEDE3]/30';
  }

  const inputClass =
    'w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm text-[#EDEDE3] outline-none transition placeholder:text-[#EDEDE3]/20 focus:border-[#E3A144]/40';

  const labelClass =
    'mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/34';

  return (
    <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      {/* =====================================================
          TOAST
      ====================================================== */}

      {toast && (
        <div
          className={`fixed left-1/2 top-[100px] z-[80] -translate-x-1/2 rounded-2xl border px-5 py-3 text-xs font-semibold shadow-2xl ${
            toast.tipo ===
            'sucesso'
              ? 'border-emerald-500/20 bg-[#0B2119] text-emerald-300'
              : 'border-red-500/20 bg-[#25100F] text-red-300'
          }`}
        >
          {toast.mensagem}
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
                Estrutura • Frota
              </span>
            </div>

            <h1
              className="mt-4 text-4xl leading-none tracking-[-0.035em] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Embarcações
            </h1>

            <p className="mt-4 max-w-[720px] text-sm leading-7 text-[#EDEDE3]/42">
              Gerencie barcos, lanchas
              e estruturas fluviais
              utilizadas em passeios,
              deslocamentos e
              expedições.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={
                fetchEmbarcacoes
              }
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.025] px-5 text-xs font-semibold text-[#EDEDE3]/55 transition hover:bg-white/[0.055]"
            >
              ↻ Atualizar
            </button>

            <Link
              href="/embarcacoes/novo"
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[#E3A144] px-6 text-sm font-bold text-[#07130F] transition hover:-translate-y-0.5 hover:bg-[#F0B35C]"
            >
              <span className="text-lg">
                +
              </span>

              Nova embarcação
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

        {/* ===================================================
            INDICADORES
        ==================================================== */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(
            (card) => {
              const ativo =
                card.filtro !==
                  null &&
                filtroStatus ===
                  card.filtro;

              return (
                <button
                  key={
                    card.titulo
                  }
                  type="button"
                  onClick={() => {
                    if (
                      card.filtro
                    ) {
                      alternarStatus(
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
                      ? 'border-[#E3A144]/35 bg-[#E3A144]/8'
                      : 'border-white/[0.075] bg-[#0A1713] hover:border-white/[0.13]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                      {card.titulo}
                    </span>

                    {ativo && (
                      <span className="rounded-full bg-[#E3A144]/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-[#E3A144]">
                        filtrando
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
                    {card.valor}
                  </strong>

                  <p className="mt-2 text-[11px] text-[#EDEDE3]/28">
                    {card.detalhe}
                  </p>
                </button>
              );
            }
          )}
        </div>

        {/* RESUMO SECUNDÁRIO */}

        {!loading && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-sky-500/15 bg-sky-500/[0.05] px-3 py-1.5 text-[9px] font-semibold text-sky-300/75">
              {reservadas}{' '}
              reservada
              {reservadas !== 1
                ? 's'
                : ''}
            </span>

            <span className="rounded-full border border-white/[0.07] bg-white/[0.02] px-3 py-1.5 text-[9px] font-semibold text-[#EDEDE3]/35">
              {inativas}{' '}
              inativa
              {inativas !== 1
                ? 's'
                : ''}
            </span>
          </div>
        )}

        {/* ===================================================
            FROTA
        ==================================================== */}

        <section className="mt-6 overflow-hidden rounded-[26px] border border-white/[0.075] bg-[#0A1713]">
          <div className="border-b border-white/[0.065] p-5 md:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  Frota operacional
                </p>

                <h2
                  className="mt-2 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Embarcações cadastradas
                </h2>

                <p className="mt-2 text-xs text-[#EDEDE3]/30">
                  {
                    embarcacoesFiltradas.length
                  }{' '}
                  de{' '}
                  {
                    embarcacoes.length
                  }{' '}
                  embarcação
                  {embarcacoes.length !==
                  1
                    ? 'ões'
                    : ''}
                </p>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row">
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
                    placeholder="Buscar embarcação..."
                    className="h-[44px] min-w-[250px] rounded-xl border border-white/[0.08] bg-[#07110E] pl-10 pr-4 text-xs text-[#EDEDE3] outline-none placeholder:text-[#EDEDE3]/22 focus:border-[#E3A144]/35"
                  />
                </div>

                <select
                  value={
                    filtroTipo
                  }
                  onChange={(
                    event
                  ) =>
                    setFiltroTipo(
                      event.target
                        .value
                    )
                  }
                  className="h-[44px] rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-xs text-[#EDEDE3]/70 outline-none focus:border-[#E3A144]/35"
                >
                  <option value="">
                    Todos os tipos
                  </option>

                  {tiposDisponiveis.map(
                    (tipo) => (
                      <option
                        key={tipo}
                        value={tipo}
                      >
                        {tipo}
                      </option>
                    )
                  )}
                </select>

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
                        | StatusEmbarcacao
                    )
                  }
                  className="h-[44px] rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-xs text-[#EDEDE3]/70 outline-none focus:border-[#E3A144]/35"
                >
                  <option value="">
                    Todos os status
                  </option>

                  <option value="Disponível">
                    Disponíveis
                  </option>

                  <option value="Reservada">
                    Reservadas
                  </option>

                  <option value="Manutenção">
                    Em manutenção
                  </option>

                  <option value="Inativa">
                    Inativas
                  </option>
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
                    Carregando frota...
                  </p>
                </div>
              </div>
            ) : embarcacoesFiltradas.length ===
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
                    Nenhuma embarcação encontrada.
                  </h3>

                  <p className="mt-2 text-xs text-[#EDEDE3]/30">
                    Ajuste os filtros ou
                    cadastre uma nova
                    embarcação.
                  </p>
                </div>
              </div>
            ) : (
              <table className="min-w-[1220px] w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.012]">
                    {[
                      'Embarcação',
                      'Tipo',
                      'Capacidade',
                      'Responsável',
                      'Motor',
                      'Situação',
                      'Status',
                      'Ações',
                    ].map((titulo) => (
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
                        {titulo}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.055]">
                  {embarcacoesFiltradas.map(
                    (
                      embarcacao,
                      index
                    ) => {
                      const status =
                        normalizarStatus(
                          embarcacao.status
                        );

                      return (
                        <tr
                          key={
                            embarcacao.id ||
                            index
                          }
                          className="transition hover:bg-white/[0.018]"
                        >
                          <td className="px-5 py-4">
                            <p className="text-xs font-semibold text-[#EDEDE3]/82">
                              {
                                embarcacao.nome
                              }
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[9px] text-[#EDEDE3]/50">
                              {embarcacao.tipo ||
                                'Não informado'}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/45">
                            {obterCapacidade(
                              embarcacao.capacidade
                            ) > 0
                              ? `${obterCapacidade(
                                  embarcacao.capacidade
                                )} passageiros`
                              : '—'}
                          </td>

                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/42">
                            {embarcacao.marinheiro ||
                              '—'}
                          </td>

                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/42">
                            {embarcacao.motor ||
                              '—'}
                          </td>

                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/42">
                            {embarcacao.situacao ||
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

                              {status}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                title="Visualizar"
                                onClick={() =>
                                  setEmbarcacaoVisualizando(
                                    embarcacao
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
                                    embarcacao
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-[#EDEDE3]/38 transition hover:border-sky-400/20 hover:text-sky-300"
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
                              </button>

                              <button
                                type="button"
                                title="Excluir"
                                onClick={() =>
                                  setEmbarcacaoExcluindo(
                                    embarcacao
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-[#EDEDE3]/38 transition hover:border-red-400/20 hover:text-red-300"
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

      {/* =====================================================
          VISUALIZAÇÃO
      ====================================================== */}

      {embarcacaoVisualizando && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[680px] overflow-hidden rounded-[26px] border border-white/[0.09] bg-[#091510] shadow-[0_35px_100px_rgba(0,0,0,0.65)]">
            <div className="flex items-start justify-between gap-5 border-b border-white/[0.07] px-6 py-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  Detalhes da embarcação
                </p>

                <h3
                  className="mt-2 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  {
                    embarcacaoVisualizando.nome
                  }
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEmbarcacaoVisualizando(
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
                  label: 'Tipo',
                  valor:
                    embarcacaoVisualizando.tipo ||
                    'Não informado',
                },

                {
                  label:
                    'Capacidade',
                  valor:
                    obterCapacidade(
                      embarcacaoVisualizando.capacidade
                    ) > 0
                      ? `${obterCapacidade(
                          embarcacaoVisualizando.capacidade
                        )} passageiros`
                      : 'Não informada',
                },

                {
                  label:
                    'Marinheiro / Responsável',
                  valor:
                    embarcacaoVisualizando.marinheiro ||
                    'Não informado',
                },

                {
                  label: 'Motor',
                  valor:
                    embarcacaoVisualizando.motor ||
                    'Não informado',
                },

                {
                  label: 'Situação',
                  valor:
                    embarcacaoVisualizando.situacao ||
                    'Não informada',
                },

                {
                  label: 'Status',
                  valor:
                    normalizarStatus(
                      embarcacaoVisualizando.status
                    ),
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
                  setEmbarcacaoVisualizando(
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
      )}

      {/* =====================================================
          EDIÇÃO
      ====================================================== */}

      {embarcacaoEditando && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-[720px] overflow-y-auto rounded-[26px] border border-white/[0.09] bg-[#091510] shadow-[0_35px_100px_rgba(0,0,0,0.65)]">
            <div className="flex items-start justify-between gap-5 border-b border-white/[0.07] px-6 py-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  Estrutura • Edição
                </p>

                <h3
                  className="mt-2 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Editar embarcação
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEmbarcacaoEditando(
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
                handleSalvarEdicao
              }
              className="space-y-5 p-6"
            >
              <div>
                <label
                  className={
                    labelClass
                  }
                >
                  Nome da embarcação *
                </label>

                <input
                  type="text"
                  required
                  value={
                    embarcacaoEditando.nome
                  }
                  onChange={(
                    event
                  ) =>
                    setEmbarcacaoEditando({
                      ...embarcacaoEditando,

                      nome:
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
                    Tipo
                  </label>

                  <input
                    type="text"
                    value={
                      embarcacaoEditando.tipo ||
                      ''
                    }
                    onChange={(
                      event
                    ) =>
                      setEmbarcacaoEditando({
                        ...embarcacaoEditando,

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
                  <label
                    className={
                      labelClass
                    }
                  >
                    Capacidade *
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={
                      embarcacaoEditando.capacidade ??
                      ''
                    }
                    onChange={(
                      event
                    ) =>
                      setEmbarcacaoEditando({
                        ...embarcacaoEditando,

                        capacidade:
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
                    Marinheiro / Responsável
                  </label>

                  <input
                    type="text"
                    value={
                      embarcacaoEditando.marinheiro ||
                      ''
                    }
                    onChange={(
                      event
                    ) =>
                      setEmbarcacaoEditando({
                        ...embarcacaoEditando,

                        marinheiro:
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
                    Motor
                  </label>

                  <input
                    type="text"
                    value={
                      embarcacaoEditando.motor ||
                      ''
                    }
                    onChange={(
                      event
                    ) =>
                      setEmbarcacaoEditando({
                        ...embarcacaoEditando,

                        motor:
                          event.target
                            .value,
                      })
                    }
                    placeholder="Ex.: Yamaha 90 HP"
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
                    Situação
                  </label>

                  <input
                    type="text"
                    value={
                      embarcacaoEditando.situacao ||
                      ''
                    }
                    onChange={(
                      event
                    ) =>
                      setEmbarcacaoEditando({
                        ...embarcacaoEditando,

                        situacao:
                          event.target
                            .value,
                      })
                    }
                    placeholder="Ex.: Regular"
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
                    Status operacional
                  </label>

                  <select
                    value={
                      statusEdicao
                    }
                    onChange={(
                      event
                    ) =>
                      setStatusEdicao(
                        event.target
                          .value as StatusEmbarcacao
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="Disponível">
                      Disponível
                    </option>

                    <option value="Reservada">
                      Reservada
                    </option>

                    <option value="Manutenção">
                      Manutenção
                    </option>

                    <option value="Inativa">
                      Inativa
                    </option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setEmbarcacaoEditando(
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
      )}

      {/* =====================================================
          EXCLUSÃO
      ====================================================== */}

      {embarcacaoExcluindo && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
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
              Excluir embarcação?
            </h3>

            <p className="mt-3 text-xs leading-6 text-[#EDEDE3]/38">
              A embarcação{' '}
              <strong className="text-[#EDEDE3]/70">
                {
                  embarcacaoExcluindo.nome
                }
              </strong>{' '}
              será removida
              permanentemente da frota.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={
                  excluindoItem
                }
                onClick={() =>
                  setEmbarcacaoExcluindo(
                    null
                  )
                }
                className="rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-3 text-xs font-semibold text-[#EDEDE3]/60"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={
                  excluindoItem
                }
                onClick={
                  handleExcluirConfirmado
                }
                className="rounded-xl border border-red-500/20 bg-red-500/[0.1] px-4 py-3 text-xs font-semibold text-red-300 disabled:opacity-50"
              >
                {excluindoItem
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
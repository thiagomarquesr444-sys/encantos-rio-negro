'use client';
import './embarcacoes-premium.css';

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

  const contextoFrotaERN = React.useRef<{
    usuarioId: string;
    empresaId: string;
  } | null>(null);

  const consultaFrotaERN = React.useRef(0);

  async function identificarEmpresaFrotaERN() {
    const { data: auth, error: erroAuth } =
      await supabase.auth.getUser();

    if (erroAuth || !auth.user) {
      throw new Error('Entre novamente para acessar a frota.');
    }

    const { data: perfil, error: erroPerfil } = await supabase
      .from('perfis')
      .select('empresa_id')
      .eq('id', auth.user.id)
      .single();

    if (erroPerfil || !perfil?.empresa_id) {
      throw new Error('Nao foi possivel identificar sua empresa.');
    }

    return {
      usuarioId: auth.user.id,
      empresaId: String(perfil.empresa_id),
    };
  }

  async function validarEmpresaFrotaERN(id: string) {
    const esperado = contextoFrotaERN.current;

    if (!esperado || !embarcacoes.some(item => item.id === id)) {
      throw new Error('Atualize a frota antes de continuar.');
    }

    const atual = await identificarEmpresaFrotaERN();

    if (
      atual.usuarioId !== esperado.usuarioId ||
      atual.empresaId !== esperado.empresaId
    ) {
      throw new Error('Sua conta mudou. Atualize a pagina.');
    }

    return atual.empresaId;
  }

  async function fetchEmbarcacoes() {
    const consulta = ++consultaFrotaERN.current;
    setLoading(true);
    setError(null);
    contextoFrotaERN.current = null;

    try {
      const contexto = await identificarEmpresaFrotaERN();
      const lista: Embarcacao[] = [];
      let esperado: number | null = null;

      for (let inicio = 0; inicio < 10000; inicio += 200) {
        const { data, error, count } = await supabase
          .from('embarcacoes')
          .select('*', { count: 'exact' })
          .eq('empresa_id', contexto.empresaId)
          .order('created_at', { ascending: false, nullsFirst: false })
          .order('id', { ascending: true })
          .range(inicio, inicio + 199);

        if (error) throw error;
        if (count === null || count > 10000) {
          throw new Error('A frota exige filtros no servidor.');
        }
        if (esperado !== null && esperado !== count) {
          throw new Error('A frota mudou durante a consulta. Atualize.');
        }

        esperado = count;
        lista.push(...((data ?? []) as Embarcacao[]));

        if (lista.length >= count) break;
        if (!data?.length) {
          throw new Error('A consulta da frota ficou incompleta.');
        }
      }

      if (
        lista.length !== esperado ||
        lista.some(item => !item.id) ||
        new Set(lista.map(item => item.id)).size !== lista.length
      ) {
        throw new Error('Nao foi possivel carregar a frota completa.');
      }

      const atual = await identificarEmpresaFrotaERN();
      if (
        atual.usuarioId !== contexto.usuarioId ||
        atual.empresaId !== contexto.empresaId
      ) {
        throw new Error('Sua conta mudou. Atualize a pagina.');
      }

      if (consulta !== consultaFrotaERN.current) return;
      contextoFrotaERN.current = contexto;
      setEmbarcacoes(lista);
    } catch (falha) {
      if (consulta !== consultaFrotaERN.current) return;
      setEmbarcacoes([]);
      setError(
        falha instanceof Error
          ? falha.message
          : 'Nao foi possivel carregar a frota.'
      );
    } finally {
      if (consulta === consultaFrotaERN.current) setLoading(false);
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

    const capacidade = Number(embarcacaoEditando.capacidade);

    if (
    !Number.isInteger(capacidade) ||
    capacidade <= 0 ||
    capacidade > 2147483647
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
        .eq('id', embarcacaoEditando.id)
       .eq('empresa_id', await validarEmpresaFrotaERN(embarcacaoEditando.id))
       .select('id')
       .single();

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
        .eq('id', embarcacaoExcluindo.id)
       .eq('empresa_id', await validarEmpresaFrotaERN(embarcacaoExcluindo.id))
       .select('id')
       .single();

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
      return 'border-emerald-500/20 bg-emerald-500/[0.07] text-[var(--ern-sucesso)]';
    }

    if (
      status ===
      'Reservada'
    ) {
      return 'border-sky-500/20 bg-sky-500/[0.07] text-[var(--ern-destaque)]';
    }

    if (
      status ===
      'Manutenção'
    ) {
      return 'border-amber-500/20 bg-amber-500/[0.07] text-[var(--ern-destaque)]';
    }

    return 'border-[var(--ern-borda)] bg-[var(--ern-suave)] text-[var(--ern-secundario)]';
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

    return 'bg-[var(--ern-suave)]';
  }

  const inputClass =
    'w-full rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 py-3 text-sm text-[var(--ern-texto)] outline-none transition placeholder:text-[var(--ern-secundario)] focus:border-[var(--ern-destaque)]';

  const labelClass =
    'mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--ern-secundario)]';

  return (
    <div className="ern-embarcacoes-premium min-h-screen bg-[var(--ern-fundo)] text-[var(--ern-texto)]">
      {/* =====================================================
          TOAST
      ====================================================== */}

      {toast && (
        <div
          className={`fixed left-1/2 top-[100px] z-[100] -translate-x-1/2 rounded-2xl border px-5 py-3 text-xs font-semibold shadow-2xl ${
            toast.tipo ===
            'sucesso'
              ? 'border-emerald-500/20 bg-[var(--ern-painel)] text-[var(--ern-sucesso)]'
              : 'border-red-500/20 bg-[var(--ern-painel)] text-[var(--ern-erro)]'
          }`}
        >
          {toast.mensagem}
        </div>
      )}

      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <section className="border-b border-[var(--ern-borda)] bg-[var(--ern-painel)]">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-8 px-5 py-10 md:px-8 md:py-12 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-[var(--ern-botao)]" />

              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ern-destaque)]">
                Estrutura • Frota
              </span>
            </div>

            <h1
              className="mt-4 text-4xl leading-none tracking-[-0.035em] text-[var(--ern-texto)] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Embarcações
            </h1>

            <p className="mt-4 max-w-[720px] text-sm leading-7 text-[var(--ern-secundario)]">
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
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-5 text-xs font-semibold text-[var(--ern-secundario)] transition hover:bg-[var(--ern-suave)]"
            >
              ↻ Atualizar
            </button>

            <Link
              href="/embarcacoes/novo"
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[var(--ern-botao)] px-6 text-sm font-bold text-[var(--ern-sobre-botao)] transition hover:-translate-y-0.5 hover:bg-[var(--ern-botao)]"
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
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-5 py-4 text-xs text-[var(--ern-erro)]">
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

        <div className="ern-embarcacoes-bento grid grid-cols-2 gap-3 xl:grid-cols-12">
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
                  className={`min-w-0 rounded-2xl border p-3 text-left transition md:rounded-[22px] md:p-5 ${
                    card.filtro
                      ? 'cursor-pointer'
                      : 'cursor-default'
                  } ${
                    ativo
                      ? 'border-[var(--ern-destaque)] bg-[var(--ern-suave)]'
                      : 'border-[var(--ern-borda)] bg-[var(--ern-painel)] hover:border-[var(--ern-borda)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--ern-secundario)]">
                      {card.titulo}
                    </span>

                    {ativo && (
                      <span className="rounded-full bg-[var(--ern-suave)] px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-[var(--ern-destaque)]">
                        filtrando
                      </span>
                    )}
                  </div>

                  <strong
                    className="mt-3 block break-words text-2xl font-medium md:mt-5 md:text-4xl tracking-[-0.04em] text-[var(--ern-texto)]"
                    style={{
                      fontFamily:
                        'var(--font-fraunces), serif',
                    }}
                  >
                    {card.valor}
                  </strong>

                  <p className="mt-2 text-[11px] text-[var(--ern-secundario)]">
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
            <span className="rounded-full border border-sky-500/15 bg-sky-500/[0.05] px-3 py-1.5 text-[9px] font-semibold text-[var(--ern-destaque)]">
              {reservadas}{' '}
              reservada
              {reservadas !== 1
                ? 's'
                : ''}
            </span>

            <span className="rounded-full border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-3 py-1.5 text-[9px] font-semibold text-[var(--ern-secundario)]">
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

        <section className="ern-embarcacoes-catalogo mt-6 overflow-hidden rounded-[26px] border border-[var(--ern-borda)] bg-[var(--ern-painel)]">
          <div className="border-b border-[var(--ern-borda)] p-5 md:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--ern-destaque)]">
                  Frota operacional
                </p>

                <h2
                  className="mt-2 text-2xl text-[var(--ern-texto)]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Embarcações cadastradas
                </h2>

                <p className="mt-2 text-xs text-[var(--ern-secundario)]">
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
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ern-secundario)]"
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
                    className="h-[44px] w-full min-w-0 lg:w-[250px] rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] pl-10 pr-4 text-xs text-[var(--ern-texto)] outline-none placeholder:text-[var(--ern-secundario)] focus:border-[var(--ern-destaque)]"
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
                  className="h-[44px] rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 text-xs text-[var(--ern-secundario)] outline-none focus:border-[var(--ern-destaque)]"
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
                  className="h-[44px] rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 text-xs text-[var(--ern-secundario)] outline-none focus:border-[var(--ern-destaque)]"
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
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--ern-borda)] border-t-[var(--ern-destaque)]" />

                  <p className="mt-4 text-xs text-[var(--ern-secundario)]">
                    Carregando frota...
                  </p>
                </div>
              </div>
            ) : embarcacoesFiltradas.length ===
              0 ? (
              <div className="flex min-h-[330px] items-center justify-center px-5 text-center">
                <div>
                  <h3
                    className="text-2xl text-[var(--ern-texto)]"
                    style={{
                      fontFamily:
                        'var(--font-fraunces), serif',
                    }}
                  >
                    Nenhuma embarcação encontrada.
                  </h3>

                  <p className="mt-2 text-xs text-[var(--ern-secundario)]">
                    Ajuste os filtros ou
                    cadastre uma nova
                    embarcação.
                  </p>
                </div>
              </div>
            ) : (
              
<>
  <div className="grid min-w-0 gap-4 p-4 md:grid-cols-2 xl:hidden">
    {embarcacoesFiltradas.map((embarcacao) => {
      const status = normalizarStatus(embarcacao.status);

      return (
        <article
          key={embarcacao.id}
          className="min-w-0 rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-4"
        >
          <h3 className="break-words text-lg font-semibold text-[var(--ern-texto)]">
            {embarcacao.nome}
          </h3>

          <span
            className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(status)}`}
          >
            {status}
          </span>

          <dl className="mt-4 grid min-w-0 grid-cols-2 gap-4 text-sm">
            {[
              ['Tipo', embarcacao.tipo || 'Nao informado'],
              [
                'Capacidade',
                obterCapacidade(embarcacao.capacidade) > 0
                  ? obterCapacidade(embarcacao.capacidade) + ' passageiros'
                  : 'Nao informada',
              ],
              ['Responsavel', embarcacao.marinheiro || 'Nao informado'],
              ['Motor', embarcacao.motor || 'Nao informado'],
              ['Situacao', embarcacao.situacao || 'Nao informada'],
            ].map(([rotulo, valor]) => (
              <div key={rotulo} className="min-w-0">
                <dt className="text-xs text-[var(--ern-secundario)]">
                  {rotulo}
                </dt>
                <dd className="mt-1 break-words text-[var(--ern-texto)]">
                  {valor}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setEmbarcacaoVisualizando(embarcacao)}
              className="min-h-11 rounded-xl border border-[var(--ern-borda)] px-3 text-sm text-[var(--ern-texto)]"
            >
              Detalhes
            </button>
            <button
              type="button"
              onClick={() => abrirEdicao(embarcacao)}
              className="min-h-11 rounded-xl border border-[var(--ern-borda)] px-3 text-sm text-[var(--ern-destaque)]"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => setEmbarcacaoExcluindo(embarcacao)}
              className="min-h-11 rounded-xl border border-[var(--ern-borda)] px-3 text-sm text-[var(--ern-erro)]"
            >
              Excluir
            </button>
          </div>
        </article>
      );
    })}
  </div>

  <table className="hidden min-w-[1220px] w-full border-collapse text-left xl:table">

                <thead>
                  <tr className="border-b border-[var(--ern-borda)] bg-[var(--ern-suave)]">
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
                        className={`px-5 py-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--ern-secundario)] ${
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
                          className="transition hover:bg-[var(--ern-suave)]"
                        >
                          <td className="px-5 py-4">
                            <p className="text-xs font-semibold text-[var(--ern-secundario)]">
                              {
                                embarcacao.nome
                              }
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-full border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-2.5 py-1 text-[9px] text-[var(--ern-secundario)]">
                              {embarcacao.tipo ||
                                'Não informado'}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-xs text-[var(--ern-secundario)]">
                            {obterCapacidade(
                              embarcacao.capacidade
                            ) > 0
                              ? `${obterCapacidade(
                                  embarcacao.capacidade
                                )} passageiros`
                              : '—'}
                          </td>

                          <td className="px-5 py-4 text-xs text-[var(--ern-secundario)]">
                            {embarcacao.marinheiro ||
                              '—'}
                          </td>

                          <td className="px-5 py-4 text-xs text-[var(--ern-secundario)]">
                            {embarcacao.motor ||
                              '—'}
                          </td>

                          <td className="px-5 py-4 text-xs text-[var(--ern-secundario)]">
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
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--ern-borda)] bg-[var(--ern-suave)] text-[var(--ern-secundario)] transition hover:border-[var(--ern-destaque)] hover:text-[var(--ern-destaque)]"
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
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--ern-borda)] bg-[var(--ern-suave)] text-[var(--ern-secundario)] transition hover:border-sky-400/20 hover:text-[var(--ern-destaque)]"
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
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--ern-borda)] bg-[var(--ern-suave)] text-[var(--ern-secundario)] transition hover:border-red-400/20 hover:text-[var(--ern-erro)]"
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
</>
            )}
          </div>
        </section>
      </main>

      {/* =====================================================
          VISUALIZAÇÃO
      ====================================================== */}

      {embarcacaoVisualizando && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90dvh] w-full max-w-[680px] overflow-y-auto rounded-[26px] border border-[var(--ern-borda)] bg-[var(--ern-painel)] shadow-[0_35px_100px_rgba(0,0,0,0.65)]">
            <div className="flex items-start justify-between gap-5 border-b border-[var(--ern-borda)] px-6 py-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--ern-destaque)]">
                  Detalhes da embarcação
                </p>

                <h3
                  className="mt-2 text-2xl text-[var(--ern-texto)]"
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
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] text-[var(--ern-secundario)]"
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
                  className="rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] p-4"
                >
                  <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[var(--ern-secundario)]">
                    {item.label}
                  </p>

                  <p className="mt-2 text-xs font-medium text-[var(--ern-secundario)]">
                    {item.valor}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-end border-t border-[var(--ern-borda)] px-6 py-4">
              <button
                type="button"
                onClick={() =>
                  setEmbarcacaoVisualizando(
                    null
                  )
                }
                className="rounded-xl bg-[var(--ern-botao)] px-5 py-2.5 text-xs font-bold text-[var(--ern-sobre-botao)]"
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
          <div className="max-h-[92vh] w-full max-w-[720px] overflow-y-auto rounded-[26px] border border-[var(--ern-borda)] bg-[var(--ern-painel)] shadow-[0_35px_100px_rgba(0,0,0,0.65)]">
            <div className="flex items-start justify-between gap-5 border-b border-[var(--ern-borda)] px-6 py-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--ern-destaque)]">
                  Estrutura • Edição
                </p>

                <h3
                  className="mt-2 text-2xl text-[var(--ern-texto)]"
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
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] text-[var(--ern-secundario)]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarEdicao} className="space-y-5 p-6">
    {error && (
      <p role="alert" className="rounded-xl border border-[var(--ern-borda)] p-3 text-sm text-[var(--ern-erro)]">
        {error}
      </p>
    )}
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

              <div className="flex flex-col-reverse gap-3 border-t border-[var(--ern-borda)] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setEmbarcacaoEditando(
                      null
                    )
                  }
                  className="rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-5 py-3 text-xs font-semibold text-[var(--ern-secundario)]"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    salvandoEdicao
                  }
                  className="rounded-xl bg-[var(--ern-botao)] px-6 py-3 text-xs font-bold text-[var(--ern-sobre-botao)] disabled:opacity-50"
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
          <div className="w-full max-w-[430px] rounded-[26px] border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-6 text-center shadow-[0_35px_100px_rgba(0,0,0,0.65)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-red-500/20 bg-red-500/[0.08] text-[var(--ern-erro)]">
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
              className="mt-5 text-2xl text-[var(--ern-texto)]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Excluir embarcação?
            </h3>

            <p className="mt-3 text-xs leading-6 text-[var(--ern-secundario)]">
              A embarcação{' '}
              <strong className="text-[var(--ern-secundario)]">
                {
                  embarcacaoExcluindo.nome
                }
              </strong>{' '}
              será removida
              permanentemente da frota. As reservas existentes permanecem,
              mas perdem o vinculo com esta embarcacao.
              Para preservar o vinculo, prefira marcar como Inativa.
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
                className="rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-4 py-3 text-xs font-semibold text-[var(--ern-secundario)]"
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
                className="rounded-xl border border-red-500/20 bg-red-500/[0.1] px-4 py-3 text-xs font-semibold text-[var(--ern-erro)] disabled:opacity-50"
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
'use client';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';

import { supabase } from '@/lib/supabase';

type StatusGuia =
  | 'Ativo'
  | 'Em Tour'
  | 'Férias'
  | 'Inativo';

interface Guia {
  id?: string;

  nome?: string | null;

  cpf?: string | null;

  telefone?: string | null;

  idiomas?: string | null;

  cadastur?: string | null;

  status?: string | null;

  created_at?: string | null;
}

/*
  ============================================================
  NORMALIZAÇÃO
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
): StatusGuia {
  const status = removerAcentos(
    (valor || '')
      .trim()
      .toLowerCase()
  );

  if (
    status.includes(
      'inativo'
    )
  ) {
    return 'Inativo';
  }

  if (
    status.includes(
      'ferias'
    )
  ) {
    return 'Férias';
  }

  if (
    status.includes('tour') ||
    status.includes(
      'ocupado'
    )
  ) {
    return 'Em Tour';
  }

  return 'Ativo';
}

/*
  ============================================================
  CPF
  ============================================================
*/

function somenteNumeros(
  valor: string
) {
  return valor.replace(
    /\D/g,
    ''
  );
}

function formatarCPF(
  valor?: string | null
) {
  const numeros =
    somenteNumeros(
      valor || ''
    ).slice(0, 11);

  if (!numeros) {
    return '';
  }

  return numeros
    .replace(
      /^(\d{3})(\d)/,
      '$1.$2'
    )
    .replace(
      /^(\d{3})\.(\d{3})(\d)/,
      '$1.$2.$3'
    )
    .replace(
      /\.(\d{3})(\d)/,
      '.$1-$2'
    );
}

/*
  ============================================================
  TELEFONE
  ============================================================
*/

function formatarTelefone(
  valor?: string | null
) {
  const numeros =
    somenteNumeros(
      valor || ''
    ).slice(0, 11);

  if (!numeros) {
    return '';
  }

  if (
    numeros.length <= 10
  ) {
    return numeros
      .replace(
        /^(\d{2})(\d)/,
        '($1) $2'
      )
      .replace(
        /(\d{4})(\d)/,
        '$1-$2'
      );
  }

  return numeros
    .replace(
      /^(\d{2})(\d)/,
      '($1) $2'
    )
    .replace(
      /(\d{5})(\d)/,
      '$1-$2'
    );
}

export default function GuiasPage() {
  const [
    guias,
    setGuias,
  ] = useState<Guia[]>([]);

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
    busca,
    setBusca,
  ] = useState('');

  const [
    filtroStatus,
    setFiltroStatus,
  ] =
    useState<
      '' | StatusGuia
    >('');

  const [
    itemVisualizar,
    setItemVisualizar,
  ] =
    useState<Guia | null>(
      null
    );

  const [
    itemEditar,
    setItemEditar,
  ] =
    useState<Guia | null>(
      null
    );

  const [
    statusEdicao,
    setStatusEdicao,
  ] =
    useState<StatusGuia>(
      'Ativo'
    );

  const [
    itemExcluir,
    setItemExcluir,
  ] =
    useState<Guia | null>(
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

  /*
    ============================================================
    FEEDBACK
    ============================================================
  */

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
    CARREGAMENTO
    ============================================================
  */

  async function fetchGuias() {
    setLoading(true);
    setError(null);

    try {
      const {
        data,
        error: supabaseError,
      } = await supabase
        .from('guias')
        .select('*')
        .order('created_at', {
          ascending: false,
        });

      if (supabaseError) {
        throw supabaseError;
      }

      const normalizados: Guia[] =
        (data || []).map(
          (item: Guia) => ({
            id: item.id,

            nome:
              item.nome || '',

            cpf:
              item.cpf || '',

            telefone:
              item.telefone || '',

            idiomas:
              item.idiomas || '',

            cadastur:
              item.cadastur || '',

            status:
              normalizarStatus(
                item.status
              ),

            created_at:
              item.created_at,
          })
        );

      setGuias(
        normalizados
      );
    } catch (err) {
      console.error(
        'Erro ao carregar guias:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar os guias.'
      );

      setGuias([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchGuias();
  }, []);

  /*
    ============================================================
    ABRIR EDIÇÃO
    ============================================================
  */

  function abrirEdicao(
    guia: Guia
  ) {
    setItemEditar({
      ...guia,

      cpf: formatarCPF(
        guia.cpf
      ),

      telefone:
        formatarTelefone(
          guia.telefone
        ),
    });

    setStatusEdicao(
      normalizarStatus(
        guia.status
      )
    );

    setError(null);
  }

  /*
    ============================================================
    SALVAR EDIÇÃO
    ============================================================
  */

  async function salvarEdicao(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!itemEditar?.id) {
      return;
    }

    const nome =
      itemEditar.nome
        ?.trim() || '';

    const cpf =
      formatarCPF(
        itemEditar.cpf
      );

    const telefone =
      formatarTelefone(
        itemEditar.telefone
      );

    const cadastur =
      itemEditar.cadastur
        ?.trim() || '';

    if (!nome) {
      setError(
        'Informe o nome do guia.'
      );

      return;
    }

    if (
      somenteNumeros(cpf)
        .length !== 11
    ) {
      setError(
        'Informe um CPF com 11 dígitos.'
      );

      return;
    }

    if (
      somenteNumeros(
        telefone
      ).length < 10
    ) {
      setError(
        'Informe um telefone válido.'
      );

      return;
    }

    if (!cadastur) {
      setError(
        'Informe o registro CADASTUR.'
      );

      return;
    }

    setSalvandoEdicao(
      true
    );

    setError(null);

    try {
      const {
        error: updateError,
      } = await supabase
        .from('guias')
        .update({
          nome,

          cpf,

          telefone,

          idiomas:
            itemEditar.idiomas
              ?.trim() ||
            'Português',

          cadastur,

          status:
            statusEdicao,
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
        'Guia atualizado com sucesso.'
      );

      await fetchGuias();
    } catch (err) {
      console.error(
        'Erro ao atualizar guia:',
        err
      );

      setError(
        err instanceof Error
          ? `Erro ao atualizar: ${err.message}`
          : 'Não foi possível atualizar o guia.'
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
    if (
      !itemExcluir?.id
    ) {
      return;
    }

    setExcluindo(true);
    setError(null);

    try {
      const {
        error: deleteError,
      } = await supabase
        .from('guias')
        .delete()
        .eq(
          'id',
          itemExcluir.id
        );

      if (deleteError) {
        throw deleteError;
      }

      setGuias(
        (atuais) =>
          atuais.filter(
            (guia) =>
              guia.id !==
              itemExcluir.id
          )
      );

      setItemExcluir(null);

      mostrarToast(
        'Guia excluído com sucesso.'
      );
    } catch (err) {
      console.error(
        'Erro ao excluir guia:',
        err
      );

      setError(
        err instanceof Error
          ? `Erro ao excluir: ${err.message}`
          : 'Não foi possível excluir o guia.'
      );
    } finally {
      setExcluindo(false);
    }
  }

  /*
    ============================================================
    MÉTRICAS
    ============================================================
  */

  const totalGuias =
    guias.length;

  const ativos =
    guias.filter(
      (guia) =>
        normalizarStatus(
          guia.status
        ) === 'Ativo'
    ).length;

  const emTour =
    guias.filter(
      (guia) =>
        normalizarStatus(
          guia.status
        ) === 'Em Tour'
    ).length;

  const emFerias =
    guias.filter(
      (guia) =>
        normalizarStatus(
          guia.status
        ) === 'Férias'
    ).length;

  const inativos =
    guias.filter(
      (guia) =>
        normalizarStatus(
          guia.status
        ) === 'Inativo'
    ).length;

  /*
    ============================================================
    FILTROS
    ============================================================
  */

  const guiasFiltrados =
    useMemo(() => {
      const termo =
        busca
          .trim()
          .toLowerCase();

      return guias.filter(
        (guia) => {
          const atendeBusca =
            !termo ||
            (
              guia.nome || ''
            )
              .toLowerCase()
              .includes(termo) ||
            (
              guia.cpf || ''
            )
              .toLowerCase()
              .includes(termo) ||
            (
              guia.telefone ||
              ''
            )
              .toLowerCase()
              .includes(termo) ||
            (
              guia.idiomas || ''
            )
              .toLowerCase()
              .includes(termo) ||
            (
              guia.cadastur || ''
            )
              .toLowerCase()
              .includes(termo);

          const status =
            normalizarStatus(
              guia.status
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
      guias,
      busca,
      filtroStatus,
    ]);

  function alternarStatus(
    status: StatusGuia
  ) {
    setFiltroStatus(
      (atual) =>
        atual === status
          ? ''
          : status
    );
  }

  /*
    ============================================================
    INDICADORES
    ============================================================
  */

  const cards = [
    {
      titulo:
        'Total de guias',

      valor: loading
        ? '—'
        : String(totalGuias),

      detalhe:
        'profissionais cadastrados',

      filtro: null,
    },

    {
      titulo: 'Ativos',

      valor: loading
        ? '—'
        : String(ativos),

      detalhe:
        'disponíveis para escala',

      filtro:
        'Ativo' as StatusGuia,
    },

    {
      titulo: 'Em tour',

      valor: loading
        ? '—'
        : String(emTour),

      detalhe:
        'em operação no momento',

      filtro:
        'Em Tour' as StatusGuia,
    },

    {
      titulo: 'Em férias',

      valor: loading
        ? '—'
        : String(emFerias),

      detalhe:
        'temporariamente indisponíveis',

      filtro:
        'Férias' as StatusGuia,
    },
  ];

  /*
    ============================================================
    STATUS VISUAL
    ============================================================
  */

  function statusClasses(
    status: StatusGuia
  ) {
    if (status === 'Ativo') {
      return 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300';
    }

    if (
      status === 'Em Tour'
    ) {
      return 'border-sky-500/20 bg-sky-500/[0.07] text-sky-300';
    }

    if (
      status === 'Férias'
    ) {
      return 'border-amber-500/20 bg-amber-500/[0.07] text-amber-300';
    }

    return 'border-red-500/20 bg-red-500/[0.07] text-red-300';
  }

  function statusDot(
    status: StatusGuia
  ) {
    if (status === 'Ativo') {
      return 'bg-emerald-400';
    }

    if (
      status === 'Em Tour'
    ) {
      return 'bg-sky-400';
    }

    if (
      status === 'Férias'
    ) {
      return 'bg-amber-400';
    }

    return 'bg-red-400';
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

      {mensagemSucesso && (
        <div className="fixed left-1/2 top-[100px] z-[80] -translate-x-1/2 rounded-2xl border border-emerald-500/20 bg-[#0B2119] px-5 py-3 text-xs font-semibold text-emerald-300 shadow-2xl">
          {mensagemSucesso}
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
                Estrutura • Guias
              </span>
            </div>

            <h1
              className="mt-4 text-4xl leading-none tracking-[-0.035em] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Guias
            </h1>

            <p className="mt-4 max-w-[720px] text-sm leading-7 text-[#EDEDE3]/42">
              Organize profissionais,
              contatos, idiomas,
              registros CADASTUR e
              disponibilidade da equipe.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={fetchGuias}
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.025] px-5 text-xs font-semibold text-[#EDEDE3]/55 transition hover:bg-white/[0.055]"
            >
              ↻ Atualizar
            </button>

            <Link
              href="/guias/novo"
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[#E3A144] px-6 text-sm font-bold text-[#07130F] transition hover:-translate-y-0.5 hover:bg-[#F0B35C]"
            >
              <span className="text-lg">
                +
              </span>

              Novo guia
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

        {!loading && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() =>
                alternarStatus(
                  'Inativo'
                )
              }
              className={`rounded-full border px-3 py-1.5 text-[9px] font-semibold transition ${
                filtroStatus ===
                'Inativo'
                  ? 'border-red-500/30 bg-red-500/[0.08] text-red-300'
                  : 'border-white/[0.07] bg-white/[0.02] text-[#EDEDE3]/35'
              }`}
            >
              {inativos}{' '}
              inativo
              {inativos !== 1
                ? 's'
                : ''}
            </button>
          </div>
        )}

        {/* ===================================================
            EQUIPE
        ==================================================== */}

        <section className="mt-6 overflow-hidden rounded-[26px] border border-white/[0.075] bg-[#0A1713]">
          <div className="border-b border-white/[0.065] p-5 md:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  Equipe operacional
                </p>

                <h2
                  className="mt-2 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Guias cadastrados
                </h2>

                <p className="mt-2 text-xs text-[#EDEDE3]/30">
                  {
                    guiasFiltrados.length
                  }{' '}
                  de{' '}
                  {guias.length}{' '}
                  profissional
                  {guias.length !==
                  1
                    ? 'is'
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
                    placeholder="Buscar guia..."
                    value={busca}
                    onChange={(
                      event
                    ) =>
                      setBusca(
                        event.target
                          .value
                      )
                    }
                    className="h-[44px] min-w-[280px] rounded-xl border border-white/[0.08] bg-[#07110E] pl-10 pr-4 text-xs text-[#EDEDE3] outline-none placeholder:text-[#EDEDE3]/22 focus:border-[#E3A144]/35"
                  />
                </div>

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
                        | StatusGuia
                    )
                  }
                  className="h-[44px] rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-xs text-[#EDEDE3]/70 outline-none focus:border-[#E3A144]/35"
                >
                  <option value="">
                    Todos os status
                  </option>

                  <option value="Ativo">
                    Ativos
                  </option>

                  <option value="Em Tour">
                    Em tour
                  </option>

                  <option value="Férias">
                    Em férias
                  </option>

                  <option value="Inativo">
                    Inativos
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
                    Carregando guias...
                  </p>
                </div>
              </div>
            ) : guiasFiltrados.length ===
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
                    Nenhum guia encontrado.
                  </h3>

                  <p className="mt-2 text-xs text-[#EDEDE3]/30">
                    Ajuste a busca ou
                    cadastre um novo
                    profissional.
                  </p>
                </div>
              </div>
            ) : (
              <table className="min-w-[1160px] w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.012]">
                    {[
                      'Guia',
                      'CPF',
                      'Telefone',
                      'Idiomas',
                      'CADASTUR',
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
                  {guiasFiltrados.map(
                    (
                      guia,
                      index
                    ) => {
                      const status =
                        normalizarStatus(
                          guia.status
                        );

                      return (
                        <tr
                          key={
                            guia.id ||
                            index
                          }
                          className="transition hover:bg-white/[0.018]"
                        >
                          <td className="px-5 py-4">
                            <p className="text-xs font-semibold text-[#EDEDE3]/82">
                              {guia.nome ||
                                '—'}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/42">
                            {formatarCPF(
                              guia.cpf
                            ) || '—'}
                          </td>

                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/42">
                            {formatarTelefone(
                              guia.telefone
                            ) || '—'}
                          </td>

                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/42">
                            {guia.idiomas ||
                              '—'}
                          </td>

                          <td className="px-5 py-4 text-xs font-semibold text-[#F4C77E]">
                            {guia.cadastur ||
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
                                  setItemVisualizar(
                                    guia
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
                                    guia
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
                                  setItemExcluir(
                                    guia
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

      {itemVisualizar && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[680px] overflow-hidden rounded-[26px] border border-white/[0.09] bg-[#091510] shadow-[0_35px_100px_rgba(0,0,0,0.65)]">
            <div className="flex items-start justify-between gap-5 border-b border-white/[0.07] px-6 py-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  Dados profissionais
                </p>

                <h3
                  className="mt-2 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  {itemVisualizar.nome ||
                    'Guia'}
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
                  label: 'CPF',
                  valor:
                    formatarCPF(
                      itemVisualizar.cpf
                    ) ||
                    'Não informado',
                },

                {
                  label:
                    'Telefone / WhatsApp',
                  valor:
                    formatarTelefone(
                      itemVisualizar.telefone
                    ) ||
                    'Não informado',
                },

                {
                  label:
                    'Idiomas',
                  valor:
                    itemVisualizar.idiomas ||
                    'Não informado',
                },

                {
                  label:
                    'CADASTUR',
                  valor:
                    itemVisualizar.cadastur ||
                    'Não informado',
                },

                {
                  label:
                    'Status',
                  valor:
                    normalizarStatus(
                      itemVisualizar.status
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
      )}

      {/* =====================================================
          EDIÇÃO
      ====================================================== */}

      {itemEditar && (
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
                  Editar guia
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setItemEditar(null)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-[#EDEDE3]/45"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={salvarEdicao}
              className="space-y-5 p-6"
            >
              <div>
                <label
                  className={
                    labelClass
                  }
                >
                  Nome completo *
                </label>

                <input
                  type="text"
                  required
                  value={
                    itemEditar.nome ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    setItemEditar({
                      ...itemEditar,

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
                    CPF *
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={
                      itemEditar.cpf ||
                      ''
                    }
                    onChange={(
                      event
                    ) =>
                      setItemEditar({
                        ...itemEditar,

                        cpf:
                          formatarCPF(
                            event.target
                              .value
                          ),
                      })
                    }
                    placeholder="000.000.000-00"
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
                    Telefone / WhatsApp *
                  </label>

                  <input
                    type="text"
                    inputMode="tel"
                    required
                    value={
                      itemEditar.telefone ||
                      ''
                    }
                    onChange={(
                      event
                    ) =>
                      setItemEditar({
                        ...itemEditar,

                        telefone:
                          formatarTelefone(
                            event.target
                              .value
                          ),
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
                    Idiomas
                  </label>

                  <input
                    type="text"
                    value={
                      itemEditar.idiomas ||
                      ''
                    }
                    onChange={(
                      event
                    ) =>
                      setItemEditar({
                        ...itemEditar,

                        idiomas:
                          event.target
                            .value,
                      })
                    }
                    placeholder="Ex.: Português, Inglês"
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
                    CADASTUR *
                  </label>

                  <input
                    type="text"
                    required
                    value={
                      itemEditar.cadastur ||
                      ''
                    }
                    onChange={(
                      event
                    ) =>
                      setItemEditar({
                        ...itemEditar,

                        cadastur:
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

              <div>
                <label
                  className={
                    labelClass
                  }
                >
                  Status
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
                        .value as StatusGuia
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="Ativo">
                    Ativo
                  </option>

                  <option value="Em Tour">
                    Em Tour
                  </option>

                  <option value="Férias">
                    Férias
                  </option>

                  <option value="Inativo">
                    Inativo
                  </option>
                </select>
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
      )}

      {/* =====================================================
          EXCLUSÃO
      ====================================================== */}

      {itemExcluir && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[430px] rounded-[26px] border border-white/[0.09] bg-[#091510] p-6 text-center shadow-[0_35px_100px_rgba(0,0,0,0.65)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-red-500/20 bg-red-500/[0.08] text-red-300">
              !
            </div>

            <h3
              className="mt-5 text-2xl text-[#F0F0E8]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Excluir guia?
            </h3>

            <p className="mt-3 text-xs leading-6 text-[#EDEDE3]/38">
              O profissional{' '}
              <strong className="text-[#EDEDE3]/70">
                {itemExcluir.nome ||
                  'selecionado'}
              </strong>{' '}
              será removido
              permanentemente da base.
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
'use client';

export const dynamic = 'force-dynamic';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';

import { supabase } from '@/lib/supabase';

type StatusHospedagem =
  | 'Disponível'
  | 'Ocupada'
  | 'Reservada';

interface Hospedagem {
  id?: string;

  nome?: string | null;
  Nome?: string | null;

  tipo?: string | null;

  endereco?: string | null;
  Endereco?: string | null;

  telefone?: string | null;

  valor_diaria?:
    | number
    | string
    | null;

  status?: string | null;
  Status?: string | null;

  created_at?: string | null;
}

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
): StatusHospedagem {
  const status = removerAcentos(
    (valor || '')
      .trim()
      .toLowerCase()
  );

  if (
    status === 'ocupada' ||
    status === 'ocupado'
  ) {
    return 'Ocupada';
  }

  if (
    status === 'reservada' ||
    status === 'reservado'
  ) {
    return 'Reservada';
  }

  return 'Disponível';
}

function obterStatus(
  hospedagem: Hospedagem
) {
  return normalizarStatus(
    hospedagem.status ||
      hospedagem.Status
  );
}

function obterNome(
  hospedagem: Hospedagem
) {
  return (
    hospedagem.nome ||
    hospedagem.Nome ||
    ''
  );
}

function obterEndereco(
  hospedagem: Hospedagem
) {
  return (
    hospedagem.endereco ||
    hospedagem.Endereco ||
    ''
  );
}

/*
  ============================================================
  CONVERSÃO MONETÁRIA
  ============================================================

  Padrão adotado na ERN:

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

  /*
    Formato brasileiro completo:
    3.500,50
  */

  if (
    valor.includes('.') &&
    valor.includes(',')
  ) {
    valor = valor
      .replace(/\./g, '')
      .replace(',', '.');
  }

  /*
    Ponto como separador de milhar:
    3.500
    12.500
    1.500.000
  */

  else if (
    /^\d{1,3}(\.\d{3})+$/.test(
      valor
    )
  ) {
    valor = valor.replace(
      /\./g,
      ''
    );
  }

  /*
    Vírgula decimal ainda é aceita
    por compatibilidade.
  */

  else if (
    valor.includes(',')
  ) {
    valor = valor.replace(
      ',',
      '.'
    );
  }

  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero
    : 0;
}

function formatarMoeda(
  valor: unknown
) {
  return converterValor(
    valor
  ).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function HospedagensPage() {
  const [
    hospedagens,
    setHospedagens,
  ] = useState<Hospedagem[]>([]);

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
  ] = useState<
    '' | StatusHospedagem | 'indisponiveis'
  >('');

  const [
    itemVisualizar,
    setItemVisualizar,
  ] =
    useState<Hospedagem | null>(
      null
    );

  const [
    itemEditar,
    setItemEditar,
  ] =
    useState<Hospedagem | null>(
      null
    );

  const [
    valorEdicao,
    setValorEdicao,
  ] = useState('');

  const [
    statusEdicao,
    setStatusEdicao,
  ] =
    useState<StatusHospedagem>(
      'Disponível'
    );

  const [
    itemExcluir,
    setItemExcluir,
  ] =
    useState<Hospedagem | null>(
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
    HELPERS DE FEEDBACK
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

  async function fetchHospedagens() {
    setLoading(true);
    setError(null);

    try {
      const {
        data,
        error: supabaseError,
      } = await supabase
        .from('hospedagens')
        .select('*')
        .order('created_at', {
          ascending: false,
        });

      if (supabaseError) {
        throw supabaseError;
      }

      setHospedagens(
        (data ||
          []) as Hospedagem[]
      );
    } catch (err) {
      console.error(
        'Erro ao carregar hospedagens:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar as hospedagens.'
      );

      setHospedagens([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHospedagens();
  }, []);

  /*
    ============================================================
    ABRIR EDIÇÃO
    ============================================================
  */

  function abrirEdicao(
    hospedagem: Hospedagem
  ) {
    setItemEditar({
      ...hospedagem,

      nome:
        obterNome(
          hospedagem
        ),

      endereco:
        obterEndereco(
          hospedagem
        ),
    });

    setValorEdicao(
      String(
        converterValor(
          hospedagem.valor_diaria
        )
      )
    );

    setStatusEdicao(
      obterStatus(
        hospedagem
      )
    );

    setError(null);
  }

  /*
    ============================================================
    ATUALIZAÇÃO
    ============================================================
  */

  async function salvarEdicao(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (
      !itemEditar?.id
    ) {
      return;
    }

    const nome =
      obterNome(
        itemEditar
      ).trim();

    if (!nome) {
      setError(
        'Informe o nome da hospedagem.'
      );

      return;
    }

    const diaria =
      converterValor(
        valorEdicao
      );

    if (
      !Number.isFinite(
        diaria
      ) ||
      diaria < 0
    ) {
      setError(
        'Informe um valor válido para a diária.'
      );

      return;
    }

    setSalvandoEdicao(
      true
    );

    setError(null);

    try {
      const payloadBase = {
        nome,

        tipo:
          itemEditar.tipo?.trim() ||
          null,

        endereco:
          obterEndereco(
            itemEditar
          ).trim() || null,

        telefone:
          itemEditar.telefone?.trim() ||
          null,

        valor_diaria:
          diaria,
      };

      /*
        Há código histórico usando
        "status" e outro usando
        "Status".

        Primeiro usamos a versão
        minúscula, que é a usada
        pelo formulário de criação.

        Se a base antiga exigir a
        coluna com maiúscula,
        tentamos a compatibilidade.
      */

      let resultado =
        await supabase
          .from('hospedagens')
          .update({
            ...payloadBase,
            status:
              statusEdicao,
          })
          .eq(
            'id',
            itemEditar.id
          );

      if (resultado.error) {
        resultado =
          await supabase
            .from(
              'hospedagens'
            )
            .update({
              ...payloadBase,
              Status:
                statusEdicao,
            })
            .eq(
              'id',
              itemEditar.id
            );
      }

      if (resultado.error) {
        throw resultado.error;
      }

      setItemEditar(null);

      mostrarToast(
        'Hospedagem atualizada com sucesso.'
      );

      await fetchHospedagens();
    } catch (err) {
      console.error(
        'Erro ao atualizar hospedagem:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível atualizar a hospedagem.'
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
        .from('hospedagens')
        .delete()
        .eq(
          'id',
          itemExcluir.id
        );

      if (deleteError) {
        throw deleteError;
      }

      setHospedagens(
        (atuais) =>
          atuais.filter(
            (hospedagem) =>
              hospedagem.id !==
              itemExcluir.id
          )
      );

      setItemExcluir(null);

      mostrarToast(
        'Hospedagem excluída com sucesso.'
      );
    } catch (err) {
      console.error(
        'Erro ao excluir hospedagem:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível excluir a hospedagem.'
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

  const totalHospedagens =
    hospedagens.length;

  const disponiveis =
    hospedagens.filter(
      (hospedagem) =>
        obterStatus(
          hospedagem
        ) === 'Disponível'
    ).length;

  const ocupadas =
    hospedagens.filter(
      (hospedagem) =>
        obterStatus(
          hospedagem
        ) === 'Ocupada'
    ).length;

  const reservadas =
    hospedagens.filter(
      (hospedagem) =>
        obterStatus(
          hospedagem
        ) === 'Reservada'
    ).length;

  const indisponiveis =
    ocupadas +
    reservadas;

  const mediaDiaria =
    totalHospedagens > 0
      ? hospedagens.reduce(
          (
            total,
            hospedagem
          ) =>
            total +
            converterValor(
              hospedagem.valor_diaria
            ),
          0
        ) /
        totalHospedagens
      : 0;

  /*
    ============================================================
    FILTROS
    ============================================================
  */

  const hospedagensFiltradas =
    useMemo(() => {
      const termo = busca
        .trim()
        .toLowerCase();

      return hospedagens.filter(
        (hospedagem) => {
          const nome =
            obterNome(
              hospedagem
            ).toLowerCase();

          const endereco =
            obterEndereco(
              hospedagem
            ).toLowerCase();

          const tipo =
            (
              hospedagem.tipo ||
              ''
            ).toLowerCase();

          const telefone =
            (
              hospedagem.telefone ||
              ''
            ).toLowerCase();

          const atendeBusca =
            !termo ||
            nome.includes(
              termo
            ) ||
            endereco.includes(
              termo
            ) ||
            tipo.includes(
              termo
            ) ||
            telefone.includes(
              termo
            );

          const status =
            obterStatus(
              hospedagem
            );

          let atendeStatus =
            true;

          if (
            filtroStatus ===
            'indisponiveis'
          ) {
            atendeStatus =
              status ===
                'Ocupada' ||
              status ===
                'Reservada';
          } else if (
            filtroStatus
          ) {
            atendeStatus =
              status ===
              filtroStatus;
          }

          return (
            atendeBusca &&
            atendeStatus
          );
        }
      );
    }, [
      hospedagens,
      busca,
      filtroStatus,
    ]);

  function filtrarPorStatus(
    status:
      | ''
      | StatusHospedagem
      | 'indisponiveis'
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
        'Total de unidades',
      valor: loading
        ? '—'
        : String(
            totalHospedagens
          ),
      detalhe:
        'hospedagens cadastradas',
      filtro: '' as const,
    },

    {
      titulo: 'Disponíveis',
      valor: loading
        ? '—'
        : String(disponiveis),
      detalhe:
        'disponíveis no momento',
      filtro:
        'Disponível' as const,
    },

    {
      titulo:
        'Ocupadas / Reservadas',
      valor: loading
        ? '—'
        : String(
            indisponiveis
          ),
      detalhe: `${ocupadas} ocupada${
        ocupadas === 1
          ? ''
          : 's'
      } • ${reservadas} reservada${
        reservadas === 1
          ? ''
          : 's'
      }`,
      filtro:
        'indisponiveis' as const,
    },

    {
      titulo:
        'Média da diária',
      valor: loading
        ? '—'
        : formatarMoeda(
            mediaDiaria
          ),
      detalhe:
        'média real da base',
      filtro: null,
    },
  ];

  /*
    ============================================================
    STATUS VISUAL
    ============================================================
  */

  function statusClasses(
    status: StatusHospedagem
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

    return 'border-amber-500/20 bg-amber-500/[0.07] text-amber-300';
  }

  function statusDot(
    status: StatusHospedagem
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

    return 'bg-amber-400';
  }

  const inputClass =
    'w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm text-[#EDEDE3] outline-none transition placeholder:text-[#EDEDE3]/20 focus:border-[#E3A144]/40';

  const labelClass =
    'mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/34';

  return (
    <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      {/* TOAST */}

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
                Estrutura • Hospedagens
              </span>
            </div>

            <h1
              className="mt-4 text-4xl leading-none tracking-[-0.035em] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Hospedagens
            </h1>

            <p className="mt-4 max-w-[700px] text-sm leading-7 text-[#EDEDE3]/42">
              Organize pousadas,
              hotéis, barcos-hotel e
              outras unidades ligadas
              à operação turística.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={
                fetchHospedagens
              }
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.025] px-5 text-xs font-semibold text-[#EDEDE3]/55 transition hover:bg-white/[0.055]"
            >
              ↻ Atualizar
            </button>

            <Link
              href="/hospedagens/novo"
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[#E3A144] px-6 text-sm font-bold text-[#07130F] transition hover:-translate-y-0.5 hover:bg-[#F0B35C]"
            >
              <span className="text-lg">
                +
              </span>

              Nova hospedagem
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
                      card.filtro !==
                      null
                    ) {
                      filtrarPorStatus(
                        card.filtro
                      );
                    }
                  }}
                  className={`rounded-[22px] border p-5 text-left transition ${
                    card.filtro ===
                    null
                      ? 'cursor-default'
                      : 'cursor-pointer'
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
                    className={`mt-5 block font-medium tracking-[-0.04em] text-[#F0F0E8] ${
                      card.titulo ===
                      'Média da diária'
                        ? 'text-2xl md:text-3xl'
                        : 'text-4xl'
                    }`}
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

        {/* ===================================================
            TABELA
        ==================================================== */}

        <section className="mt-6 overflow-hidden rounded-[26px] border border-white/[0.075] bg-[#0A1713]">
          <div className="border-b border-white/[0.065] p-5 md:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  Estrutura operacional
                </p>

                <h2
                  className="mt-2 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Unidades cadastradas
                </h2>

                <p className="mt-2 text-xs text-[#EDEDE3]/30">
                  {
                    hospedagensFiltradas.length
                  }{' '}
                  de{' '}
                  {
                    hospedagens.length
                  }{' '}
                  unidade
                  {hospedagens.length !==
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
                    value={busca}
                    onChange={(
                      event
                    ) =>
                      setBusca(
                        event.target
                          .value
                      )
                    }
                    placeholder="Buscar hospedagem..."
                    className="h-[44px] min-w-[270px] rounded-xl border border-white/[0.08] bg-[#07110E] pl-10 pr-4 text-xs text-[#EDEDE3] outline-none placeholder:text-[#EDEDE3]/22 focus:border-[#E3A144]/35"
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
                        | StatusHospedagem
                        | 'indisponiveis'
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

                  <option value="Ocupada">
                    Ocupadas
                  </option>

                  <option value="indisponiveis">
                    Ocupadas ou reservadas
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
                    Carregando hospedagens...
                  </p>
                </div>
              </div>
            ) : hospedagensFiltradas.length ===
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
                    Nenhuma hospedagem encontrada.
                  </h3>

                  <p className="mt-2 text-xs text-[#EDEDE3]/30">
                    Ajuste os filtros ou
                    cadastre uma nova
                    unidade.
                  </p>
                </div>
              </div>
            ) : (
              <table className="min-w-[1120px] w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.012]">
                    {[
                      'Hospedagem',
                      'Endereço',
                      'Tipo',
                      'Telefone',
                      'Diária',
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
                  {hospedagensFiltradas.map(
                    (
                      hospedagem,
                      index
                    ) => {
                      const status =
                        obterStatus(
                          hospedagem
                        );

                      return (
                        <tr
                          key={
                            hospedagem.id ||
                            index
                          }
                          className="transition hover:bg-white/[0.018]"
                        >
                          <td className="px-5 py-4">
                            <p className="text-xs font-semibold text-[#EDEDE3]/82">
                              {obterNome(
                                hospedagem
                              ) ||
                                '—'}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/42">
                            {obterEndereco(
                              hospedagem
                            ) ||
                              '—'}
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[9px] text-[#EDEDE3]/50">
                              {hospedagem.tipo ||
                                'Não informado'}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/42">
                            {hospedagem.telefone ||
                              '—'}
                          </td>

                          <td className="px-5 py-4 text-xs font-semibold text-[#F4C77E]">
                            {formatarMoeda(
                              hospedagem.valor_diaria
                            )}
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
                                    hospedagem
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
                                    hospedagem
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
                                    hospedagem
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
          MODAL VISUALIZAR
      ====================================================== */}

      {itemVisualizar && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[640px] overflow-hidden rounded-[26px] border border-white/[0.09] bg-[#091510] shadow-[0_35px_100px_rgba(0,0,0,0.65)]">
            <div className="flex items-start justify-between gap-5 border-b border-white/[0.07] px-6 py-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  Detalhes da hospedagem
                </p>

                <h3
                  className="mt-2 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  {obterNome(
                    itemVisualizar
                  ) || 'Hospedagem'}
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
                  label: 'Tipo',
                  valor:
                    itemVisualizar.tipo ||
                    'Não informado',
                },

                {
                  label: 'Status',
                  valor:
                    obterStatus(
                      itemVisualizar
                    ),
                },

                {
                  label:
                    'Telefone',
                  valor:
                    itemVisualizar.telefone ||
                    'Não informado',
                },

                {
                  label:
                    'Valor da diária',
                  valor:
                    formatarMoeda(
                      itemVisualizar.valor_diaria
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

              <div className="sm:col-span-2 rounded-2xl border border-white/[0.065] bg-white/[0.018] p-4">
                <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/28">
                  Localização / Endereço
                </p>

                <p className="mt-2 text-xs font-medium text-[#EDEDE3]/72">
                  {obterEndereco(
                    itemVisualizar
                  ) ||
                    'Não informado'}
                </p>
              </div>
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
          MODAL EDITAR
      ====================================================== */}

      {itemEditar && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-[650px] overflow-y-auto rounded-[26px] border border-white/[0.09] bg-[#091510] shadow-[0_35px_100px_rgba(0,0,0,0.65)]">
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
                  Editar hospedagem
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
                  Nome da hospedagem *
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
                    Tipo
                  </label>

                  <input
                    type="text"
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
                    placeholder="Ex.: Pousada"
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
                    Diária (R$) *
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
                    placeholder="Ex.: 350 ou 1.500"
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
                  Localização / Endereço
                </label>

                <input
                  type="text"
                  value={
                    itemEditar.endereco ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    setItemEditar({
                      ...itemEditar,

                      endereco:
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
                    Telefone
                  </label>

                  <input
                    type="text"
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
                    value={
                      statusEdicao
                    }
                    onChange={(
                      event
                    ) =>
                      setStatusEdicao(
                        event.target
                          .value as StatusHospedagem
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

                    <option value="Ocupada">
                      Ocupada
                    </option>
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
      )}

      {/* =====================================================
          MODAL EXCLUIR
      ====================================================== */}

      {itemExcluir && (
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
              Excluir hospedagem?
            </h3>

            <p className="mt-3 text-xs leading-6 text-[#EDEDE3]/38">
              A unidade{' '}
              <strong className="text-[#EDEDE3]/70">
                {obterNome(
                  itemExcluir
                ) ||
                  'selecionada'}
              </strong>{' '}
              será removida
              permanentemente da base.
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
                className="rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-3 text-xs font-semibold text-[#EDEDE3]/60"
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
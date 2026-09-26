'use client';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';

import {
  isSupabaseConfigured,
  supabase,
} from '@/lib/supabase';

type StatusVoucher =
  | 'Ativo'
  | 'Utilizado'
  | 'Cancelado';

interface Voucher {
  id?: string;

  created_at?: string | null;

  codigo?: string | null;

  reserva_id?: string | null;

  status?: string | null;

  data_emissao?: string | null;

  cliente_id?: string | null;

  cliente_nome?: string | null;

  passeio_id?: string | null;

  passeio_nome?: string | null;

  valor?:
    | number
    | string
    | null;

  validade?: string | null;
}

interface Cliente {
  id: string;
  nome?: string | null;
  nome_completo?: string | null;
}

interface Passeio {
  id: string;
  nome?: string | null;
  titulo?: string | null;
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
): StatusVoucher {
  const status = removerAcentos(
    (valor || '')
      .trim()
      .toLowerCase()
  );

  if (
    status === 'utilizado'
  ) {
    return 'Utilizado';
  }

  if (
    status === 'cancelado'
  ) {
    return 'Cancelado';
  }

  return 'Ativo';
}

/*
  ============================================================
  VALORES

  Convenção ERN:

  3500      -> 3500
  3.500     -> 3500
  3500.50   -> 3500.50
  3.500,50  -> 3500.50
  ============================================================
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

function formatarMoeda(
  valor: unknown
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

/*
  Evita deslocamento de data
  causado por UTC/new Date().
*/

function formatarData(
  valor?: string | null
) {
  if (!valor) {
    return '—';
  }

  const data =
    valor.split('T')[0];

  const partes =
    data.split('-');

  if (
    partes.length !== 3
  ) {
    return valor;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function dataExpirada(
  validade?: string | null
) {
  if (!validade) {
    return false;
  }

  const hoje =
    new Date();

  const ano = hoje.getFullYear();

  const mes = String(
    hoje.getMonth() + 1
  ).padStart(2, '0');

  const dia = String(
    hoje.getDate()
  ).padStart(2, '0');

  const hojeTexto =
    `${ano}-${mes}-${dia}`;

  const validadeTexto =
    validade.split('T')[0];

  return (
    validadeTexto <
    hojeTexto
  );
}

export default function VouchersPage() {
  const [
    vouchers,
    setVouchers,
  ] = useState<Voucher[]>([]);

  const [
    clientes,
    setClientes,
  ] =
    useState<Cliente[]>([]);

  const [
    passeios,
    setPasseios,
  ] =
    useState<Passeio[]>([]);

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
      '' | StatusVoucher
    >('');

  const [
    itemVisualizar,
    setItemVisualizar,
  ] =
    useState<Voucher | null>(
      null
    );

  const [
    itemEditar,
    setItemEditar,
  ] =
    useState<Voucher | null>(
      null
    );

  const [
    editCodigo,
    setEditCodigo,
  ] = useState('');

  const [
    editClienteId,
    setEditClienteId,
  ] = useState('');

  const [
    editPasseioId,
    setEditPasseioId,
  ] = useState('');

  const [
    editValor,
    setEditValor,
  ] = useState('');

  const [
    editStatus,
    setEditStatus,
  ] =
    useState<StatusVoucher>(
      'Ativo'
    );

  const [
    editValidade,
    setEditValidade,
  ] = useState('');

  const [
    itemExcluir,
    setItemExcluir,
  ] =
    useState<Voucher | null>(
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
    toast,
    setToast,
  ] = useState<string | null>(
    null
  );

  function mostrarToast(
    mensagem: string
  ) {
    setToast(mensagem);

    setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  /*
    ============================================================
    CARREGAMENTO
    ============================================================
  */

  async function fetchVouchers() {
    if (
      !isSupabaseConfigured
    ) {
      setLoading(false);

      setError(
        'Supabase não está configurado.'
      );

      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [
        vouchersResultado,
        clientesResultado,
        passeiosResultado,
      ] =
        await Promise.all([
          supabase
            .from('vouchers')
            .select('*')
            .order(
              'created_at',
              {
                ascending:
                  false,
              }
            ),

          supabase
            .from('clientes')
            .select(
              'id, nome'
            ),

          supabase
            .from('passeios')
            .select('*'),
        ]);

      if (
        vouchersResultado.error
      ) {
        throw vouchersResultado.error;
      }

      const clientesData =
        (clientesResultado.data ||
          []) as Cliente[];

      const passeiosData =
        (passeiosResultado.data ||
          []) as Passeio[];

      setClientes(
        clientesData
      );

      setPasseios(
        passeiosData
      );

      const mapaClientes =
        new Map<
          string,
          string
        >();

      clientesData.forEach(
        (cliente) => {
          mapaClientes.set(
            cliente.id,
            cliente.nome ||
              cliente.nome_completo ||
              'Cliente'
          );
        }
      );

      const mapaPasseios =
        new Map<
          string,
          string
        >();

      passeiosData.forEach(
        (passeio) => {
          mapaPasseios.set(
            passeio.id,
            passeio.nome ||
              passeio.titulo ||
              'Passeio'
          );
        }
      );

      const registros =
        (
          vouchersResultado.data ||
          []
        ).map(
          (
            item: any
          ): Voucher => ({
            ...item,

            status:
              normalizarStatus(
                item.status
              ),

            valor:
              converterValor(
                item.valor
              ),

            cliente_nome:
              (
                item.cliente_id &&
                mapaClientes.get(
                  item.cliente_id
                )
              ) ||
              item.cliente_nome ||
              item.nome_cliente ||
              '—',

            passeio_nome:
              (
                item.passeio_id &&
                mapaPasseios.get(
                  item.passeio_id
                )
              ) ||
              item.passeio_nome ||
              item.nome_passeio ||
              '—',
          })
        );

      setVouchers(registros);
    } catch (err) {
      console.error(
        'Erro ao carregar vouchers:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar os vouchers.'
      );

      setVouchers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchVouchers();
  }, []);

  /*
    ============================================================
    MÉTRICAS
    ============================================================
  */

  const total =
    vouchers.length;

  const ativos =
    vouchers.filter(
      (voucher) =>
        normalizarStatus(
          voucher.status
        ) === 'Ativo'
    ).length;

  const utilizados =
    vouchers.filter(
      (voucher) =>
        normalizarStatus(
          voucher.status
        ) === 'Utilizado'
    ).length;

  const cancelados =
    vouchers.filter(
      (voucher) =>
        normalizarStatus(
          voucher.status
        ) === 'Cancelado'
    ).length;

  const valorAtivo =
    vouchers.reduce(
      (
        totalValor,
        voucher
      ) => {
        if (
          normalizarStatus(
            voucher.status
          ) !== 'Ativo'
        ) {
          return totalValor;
        }

        return (
          totalValor +
          converterValor(
            voucher.valor
          )
        );
      },
      0
    );

  /*
    ============================================================
    FILTROS
    ============================================================
  */

  const vouchersFiltrados =
    useMemo(() => {
      const termo =
        busca
          .trim()
          .toLowerCase();

      return vouchers.filter(
        (voucher) => {
          const status =
            normalizarStatus(
              voucher.status
            );

          const atendeBusca =
            !termo ||
            String(
              voucher.codigo ||
                ''
            )
              .toLowerCase()
              .includes(termo) ||
            String(
              voucher.cliente_nome ||
                ''
            )
              .toLowerCase()
              .includes(termo) ||
            String(
              voucher.passeio_nome ||
                ''
            )
              .toLowerCase()
              .includes(termo) ||
            status
              .toLowerCase()
              .includes(termo);

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
      vouchers,
      busca,
      filtroStatus,
    ]);

  function alternarStatus(
    status: StatusVoucher
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
    EDIÇÃO
    ============================================================
  */

  function abrirEdicao(
    voucher: Voucher
  ) {
    setItemEditar(voucher);

    setEditCodigo(
      voucher.codigo || ''
    );

    setEditClienteId(
      voucher.cliente_id || ''
    );

    setEditPasseioId(
      voucher.passeio_id || ''
    );

    setEditValor(
      String(
        converterValor(
          voucher.valor
        )
      )
    );

    setEditStatus(
      normalizarStatus(
        voucher.status
      )
    );

    setEditValidade(
      voucher.validade
        ? voucher.validade.split(
            'T'
          )[0]
        : ''
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

    const codigo =
      editCodigo.trim();

    if (!codigo) {
      setError(
        'Informe o código do voucher.'
      );

      return;
    }

    if (!editClienteId) {
      setError(
        'Selecione o cliente.'
      );

      return;
    }

    if (!editPasseioId) {
      setError(
        'Selecione o passeio.'
      );

      return;
    }

    const valor =
      converterValor(
        editValor
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

    setSalvandoEdicao(
      true
    );

    setError(null);

    try {
      const {
        error: updateError,
      } = await supabase
        .from('vouchers')
        .update({
          codigo,

          cliente_id:
            editClienteId,

          passeio_id:
            editPasseioId,

          valor,

          status:
            editStatus,

          validade:
            editValidade ||
            null,
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
        'Voucher atualizado com sucesso.'
      );

      await fetchVouchers();
    } catch (err) {
      console.error(
        'Erro ao atualizar voucher:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível atualizar o voucher.'
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
        .from('vouchers')
        .delete()
        .eq(
          'id',
          itemExcluir.id
        );

      if (deleteError) {
        throw deleteError;
      }

      setVouchers(
        (atuais) =>
          atuais.filter(
            (voucher) =>
              voucher.id !==
              itemExcluir.id
          )
      );

      setItemExcluir(null);

      mostrarToast(
        'Voucher excluído com sucesso.'
      );
    } catch (err) {
      console.error(
        'Erro ao excluir voucher:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível excluir o voucher.'
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

  function statusClasses(
    status: StatusVoucher
  ) {
    if (
      status === 'Ativo'
    ) {
      return 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300';
    }

    if (
      status ===
      'Utilizado'
    ) {
      return 'border-amber-500/20 bg-amber-500/[0.07] text-amber-300';
    }

    return 'border-red-500/20 bg-red-500/[0.07] text-red-300';
  }

  function statusDot(
    status: StatusVoucher
  ) {
    if (
      status === 'Ativo'
    ) {
      return 'bg-emerald-400';
    }

    if (
      status ===
      'Utilizado'
    ) {
      return 'bg-amber-400';
    }

    return 'bg-red-400';
  }

  const inputClass =
    'w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm text-[#EDEDE3] outline-none transition placeholder:text-[#EDEDE3]/20 focus:border-[#E3A144]/40';

  const labelClass =
    'mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/34';

  const cards = [
    {
      titulo:
        'Total de vouchers',
      valor: loading
        ? '—'
        : String(total),
      detalhe:
        'documentos cadastrados',
      filtro: null,
    },

    {
      titulo:
        'Vouchers ativos',
      valor: loading
        ? '—'
        : String(ativos),
      detalhe:
        'disponíveis para utilização',
      filtro:
        'Ativo' as StatusVoucher,
    },

    {
      titulo: 'Utilizados',
      valor: loading
        ? '—'
        : String(
            utilizados
          ),
      detalhe:
        'já utilizados',
      filtro:
        'Utilizado' as StatusVoucher,
    },

    {
      titulo:
        'Valor ativo',
      valor: loading
        ? '—'
        : formatarMoeda(
            valorAtivo
          ),
      detalhe:
        'soma dos vouchers ativos',
      filtro: null,
    },
  ];

  return (
    <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      {toast && (
        <div className="fixed left-1/2 top-[100px] z-[80] -translate-x-1/2 rounded-2xl border border-emerald-500/20 bg-[#0B2119] px-5 py-3 text-xs font-semibold text-emerald-300 shadow-2xl">
          {toast}
        </div>
      )}

      {/* HEADER */}

      <section className="border-b border-white/[0.07] bg-[#091510]">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-8 px-5 py-10 md:px-8 md:py-12 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-[#E3A144]" />

              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                Operação • Vouchers
              </span>
            </div>

            <h1
              className="mt-4 text-4xl leading-none tracking-[-0.035em] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Vouchers
            </h1>

            <p className="mt-4 max-w-[720px] text-sm leading-7 text-[#EDEDE3]/42">
              Organize comprovantes,
              clientes, experiências,
              valores, validade e
              utilização dos vouchers.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={
                fetchVouchers
              }
              className="inline-flex min-h-[50px] items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.025] px-5 text-xs font-semibold text-[#EDEDE3]/55 transition hover:bg-white/[0.055]"
            >
              ↻ Atualizar
            </button>

            <Link
              href="/vouchers/novo"
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[#E3A144] px-6 text-sm font-bold text-[#07130F] transition hover:-translate-y-0.5 hover:bg-[#F0B35C]"
            >
              <span className="text-lg">
                +
              </span>

              Novo voucher
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

        {/* CARDS */}

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
                  type="button"
                  key={
                    card.titulo
                  }
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
                      : 'border-white/[0.075] bg-[#0A1713]'
                  }`}
                >
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                    {card.titulo}
                  </p>

                  <strong
                    className={`mt-5 block font-medium tracking-[-0.04em] text-[#F0F0E8] ${
                      card.titulo ===
                      'Valor ativo'
                        ? 'text-2xl'
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

        <div className="mt-4">
          <button
            type="button"
            onClick={() =>
              alternarStatus(
                'Cancelado'
              )
            }
            className={`rounded-full border px-3 py-1.5 text-[9px] font-semibold transition ${
              filtroStatus ===
              'Cancelado'
                ? 'border-red-500/30 bg-red-500/[0.08] text-red-300'
                : 'border-white/[0.07] bg-white/[0.02] text-[#EDEDE3]/35'
            }`}
          >
            {cancelados}{' '}
            cancelado
            {cancelados !== 1
              ? 's'
              : ''}
          </button>
        </div>

        {/* TABELA */}

        <section className="mt-6 overflow-hidden rounded-[26px] border border-white/[0.075] bg-[#0A1713]">
          <div className="border-b border-white/[0.065] p-5 md:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  Controle operacional
                </p>

                <h2
                  className="mt-2 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Vouchers cadastrados
                </h2>

                <p className="mt-2 text-xs text-[#EDEDE3]/30">
                  {
                    vouchersFiltrados.length
                  }{' '}
                  de{' '}
                  {
                    vouchers.length
                  }{' '}
                  registro
                  {vouchers.length !==
                  1
                    ? 's'
                    : ''}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
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
                    placeholder="Buscar código, cliente ou passeio..."
                    className="h-[44px] min-w-[310px] rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-xs text-[#EDEDE3] outline-none placeholder:text-[#EDEDE3]/22 focus:border-[#E3A144]/35"
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
                        | StatusVoucher
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

                  <option value="Utilizado">
                    Utilizados
                  </option>

                  <option value="Cancelado">
                    Cancelados
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
                    Carregando vouchers...
                  </p>
                </div>
              </div>
            ) : vouchersFiltrados.length ===
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
                    Nenhum voucher encontrado.
                  </h3>

                  <p className="mt-2 text-xs text-[#EDEDE3]/30">
                    Ajuste os filtros ou
                    cadastre um novo
                    voucher.
                  </p>
                </div>
              </div>
            ) : (
              <table className="min-w-[1180px] w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.012]">
                    {[
                      'Código',
                      'Cliente',
                      'Passeio',
                      'Validade',
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
                  {vouchersFiltrados.map(
                    (
                      voucher,
                      index
                    ) => {
                      const status =
                        normalizarStatus(
                          voucher.status
                        );

                      const vencido =
                        status ===
                          'Ativo' &&
                        dataExpirada(
                          voucher.validade
                        );

                      return (
                        <tr
                          key={
                            voucher.id ||
                            index
                          }
                          className="transition hover:bg-white/[0.018]"
                        >
                          <td className="px-5 py-4 font-mono text-xs font-semibold text-[#F4C77E]">
                            {voucher.codigo ||
                              '—'}
                          </td>

                          <td className="px-5 py-4 text-xs font-semibold text-[#EDEDE3]/78">
                            {voucher.cliente_nome ||
                              '—'}
                          </td>

                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/42">
                            {voucher.passeio_nome ||
                              '—'}
                          </td>

                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/42">
                            <div>
                              {formatarData(
                                voucher.validade
                              )}

                              {vencido && (
                                <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.1em] text-red-300">
                                  Validade expirada
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-xs font-semibold text-emerald-300">
                            {formatarMoeda(
                              voucher.valor
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
                                    voucher
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
                                  abrirEdicao(
                                    voucher
                                  )
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
                                    voucher
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

      {/* VISUALIZAÇÃO */}

      {itemVisualizar && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[680px] overflow-hidden rounded-[26px] border border-white/[0.09] bg-[#091510]">
            <div className="flex items-start justify-between border-b border-white/[0.07] px-6 py-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  Detalhes do voucher
                </p>

                <h3
                  className="mt-2 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  {itemVisualizar.codigo ||
                    'Voucher'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setItemVisualizar(
                    null
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-[#EDEDE3]/45"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3 p-6 sm:grid-cols-2">
              {[
                {
                  label: 'Cliente',
                  valor:
                    itemVisualizar.cliente_nome ||
                    'Não informado',
                },

                {
                  label: 'Passeio',
                  valor:
                    itemVisualizar.passeio_nome ||
                    'Não informado',
                },

                {
                  label: 'Valor',
                  valor:
                    formatarMoeda(
                      itemVisualizar.valor
                    ),
                },

                {
                  label: 'Validade',
                  valor:
                    formatarData(
                      itemVisualizar.validade
                    ),
                },

                {
                  label: 'Status',
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

      {/* EDIÇÃO */}

      {itemEditar && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-[720px] overflow-y-auto rounded-[26px] border border-white/[0.09] bg-[#091510]">
            <div className="flex items-start justify-between border-b border-white/[0.07] px-6 py-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  Operação • Edição
                </p>

                <h3
                  className="mt-2 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Editar voucher
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setItemEditar(null)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-[#EDEDE3]/45"
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
                  Código *
                </label>

                <input
                  type="text"
                  required
                  value={editCodigo}
                  onChange={(
                    event
                  ) =>
                    setEditCodigo(
                      event.target
                        .value
                    )
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
                  Cliente *
                </label>

                <select
                  required
                  value={
                    editClienteId
                  }
                  onChange={(
                    event
                  ) =>
                    setEditClienteId(
                      event.target
                        .value
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    Selecione...
                  </option>

                  {clientes.map(
                    (cliente) => (
                      <option
                        key={
                          cliente.id
                        }
                        value={
                          cliente.id
                        }
                      >
                        {cliente.nome ||
                          cliente.nome_completo ||
                          cliente.id}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label
                  className={
                    labelClass
                  }
                >
                  Passeio *
                </label>

                <select
                  required
                  value={
                    editPasseioId
                  }
                  onChange={(
                    event
                  ) =>
                    setEditPasseioId(
                      event.target
                        .value
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    Selecione...
                  </option>

                  {passeios.map(
                    (passeio) => (
                      <option
                        key={
                          passeio.id
                        }
                        value={
                          passeio.id
                        }
                      >
                        {passeio.nome ||
                          passeio.titulo ||
                          passeio.id}
                      </option>
                    )
                  )}
                </select>
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
                      editValor
                    }
                    onChange={(
                      event
                    ) =>
                      setEditValor(
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
                    Validade
                  </label>

                  <input
                    type="date"
                    value={
                      editValidade
                    }
                    onChange={(
                      event
                    ) =>
                      setEditValidade(
                        event.target
                          .value
                      )
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
                    editStatus
                  }
                  onChange={(
                    event
                  ) =>
                    setEditStatus(
                      event.target
                        .value as StatusVoucher
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="Ativo">
                    Ativo
                  </option>

                  <option value="Utilizado">
                    Utilizado
                  </option>

                  <option value="Cancelado">
                    Cancelado
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
                  className="rounded-xl border border-white/[0.08] px-5 py-3 text-xs font-semibold text-[#EDEDE3]/55"
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
              Excluir voucher?
            </h3>

            <p className="mt-3 text-xs leading-6 text-[#EDEDE3]/38">
              O voucher{' '}
              <strong className="text-[#EDEDE3]/70">
                {itemExcluir.codigo ||
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
                className="rounded-xl border border-white/[0.09] px-4 py-3 text-xs font-semibold text-[#EDEDE3]/60"
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
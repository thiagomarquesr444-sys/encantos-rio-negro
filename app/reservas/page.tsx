'use client';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import { supabase } from '@/lib/supabase';
import GraficosReservas from '@/app/components/GraficosReservas';

type StatusReserva =
  | 'Pendente'
  | 'Confirmada'
  | 'Cancelada';

interface Reserva {
  horario?: string | null;
  embarcacao_id?: string | null;
  guiaInformado?: boolean;
  statusOriginal?: string;
  id?: string | number;
  cliente: string;
  pacote: string;
  data: string;
  dataOriginal?: string;
  agencia: string;
  guia: string;
  valor: number;
  status: StatusReserva;
  observacoes: string;
}

interface ReservaBanco {
  horario?: string | null;
  embarcacao_id?: string | null;
  id?: string | number;

  cliente?: string | null;
  nome_cliente?: string | null;

  pacote?: string | null;
  passeio?: string | null;

  data_reserva?: string | null;
  data?: string | null;

  agencia?: string | null;
  parceiro?: string | null;

  guia?: string | null;

  valor?: number | string | null;
  valor_total?: number | string | null;

  status?: string | null;
  Status?: string | null;

  observacoes?: string | null;
}

function normalizarStatus(
  status?: string | null
): StatusReserva {
  const valor = (
    status || ''
  )
    .trim()
    .toLowerCase();

  if (
    valor.includes('confirmad')
  ) {
    return 'Confirmada';
  }

  if (
    valor.includes('cancelad')
  ) {
    return 'Cancelada';
  }

  return 'Pendente';
}

function normalizarValor(
  valor: unknown
) {
  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero
    : 0;
}

function formatarData(
  valor?: string | null
) {
  if (!valor) {
    return '—';
  }

  const dataLimpa =
    valor.split('T')[0];

  const partes =
    dataLimpa.split('-');

  if (partes.length !== 3) {
    return valor;
  }

  const [
    ano,
    mes,
    dia,
  ] = partes;

  if (
    !ano ||
    !mes ||
    !dia
  ) {
    return valor;
  }

  return `${dia}/${mes}/${ano}`;
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

function escaparCSV(valor: unknown) {
  let texto = String(valor ?? '');

  // Evita interpretar conteúdo exportado como fórmula de planilha.
  if (/^[\s\uFEFF]*[=+\-@]/u.test(texto) || /^[\t\r\n]/.test(texto)) {
    texto = "'" + texto;
  }

  return `"${texto.replace(/"/g, '""')}"`;
}
// ERN_RESERVAS_FILTRO_DASHBOARD
function dataFiltroReservaValida(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T12:00:00Z`);
  return Number.isFinite(data.getTime()) &&
    data.toISOString().slice(0, 10) === valor;
}

export default function ReservasPage() {
  return (
    <Suspense fallback={<p role="status" className="p-6">Carregando reservas…</p>}>
      <ReservasComParametros />
    </Suspense>
  );
}

function ReservasComParametros() {
  const parametros = useSearchParams().toString();
  return <ReservasConteudo key={parametros} parametros={parametros} />;
}

function ReservasConteudo({ parametros }: { parametros: string }) {
  const urlOperacional = new URLSearchParams(parametros);
  const alertaOperacional = urlOperacional.get('alerta') ?? '';
  const inicioOperacional = urlOperacional.get('inicio') ?? '';
  const fimOperacional = urlOperacional.get('fim') ?? '';

  const nomesAlertas: Record<string, string> = {
    pendentes: 'Reservas pendentes',
    sem_horario: 'Sem horário',
    sem_guia: 'Sem guia',
    sem_embarcacao: 'Sem embarcação',
  };

  const filtroOperacionalValido =
    Object.prototype.hasOwnProperty.call(nomesAlertas, alertaOperacional) &&
    dataFiltroReservaValida(inicioOperacional) &&
    dataFiltroReservaValida(fimOperacional) &&
    inicioOperacional <= fimOperacional;
  const [
    reservas,
    setReservas,
  ] = useState<Reserva[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    busca,
    setBusca,
  ] = useState('');

  const [
    filtroStatus,
    setFiltroStatus,
  ] = useState<
    '' | StatusReserva
  >('');

  const [
    mensagemErro,
    setMensagemErro,
  ] = useState('');

  const [
    modalObsAberto,
    setModalObsAberto,
  ] = useState(false);

  const [
    reservaSelecionada,
    setReservaSelecionada,
  ] =
    useState<Reserva | null>(
      null
    );

  const [
    modalExcluirAberto,
    setModalExcluirAberto,
  ] = useState(false);

  const [
    idParaExcluir,
    setIdParaExcluir,
  ] = useState<
    string | number | null
  >(null);

  const [
    excluindo,
    setExcluindo,
  ] = useState(false);

  /*
    ============================================================
    CARREGAMENTO
    ============================================================
  */

  useEffect(() => {
    carregarReservas();
  }, []);

  async function carregarReservas() {
    setLoading(true);
    setMensagemErro('');

    try {
      // ERN_CONSULTA_RESERVAS_COMPLETA
      const { data: autenticacao, error: erroAuth } =
        await supabase.auth.getUser();

      if (erroAuth || !autenticacao.user) {
        throw new Error('Entre novamente para consultar suas reservas.');
      }

      const { data: perfil, error: erroPerfil } = await supabase
        .from('perfis')
        .select('empresa_id')
        .eq('id', autenticacao.user.id)
        .single();

      if (erroPerfil || !perfil?.empresa_id) {
        throw new Error('Não foi possível identificar sua empresa.');
      }

      const registros: ReservaBanco[] = [];
      let totalEsperado: number | null = null;

      for (let inicio = 0; inicio < 10000; inicio += 200) {
        const { data, error, count } = await supabase
          .from('reservas')
          .select('*', { count: 'exact' })
          .eq('empresa_id', perfil.empresa_id)
          .order('id', { ascending: false })
          .range(inicio, inicio + 199);

        if (error) throw error;

        if (count === null || count > 10000) {
          throw new Error(
            'O volume de reservas exige uma consulta por período. Nenhum resultado parcial será apresentado.',
          );
        }

        if (totalEsperado !== null && totalEsperado !== count) {
          throw new Error(
            'As reservas mudaram durante a consulta. Atualize a página.',
          );
        }

        totalEsperado = count;
        registros.push(...((data ?? []) as ReservaBanco[]));

        if (registros.length >= count) break;

        if (!data?.length) {
          throw new Error('A consulta ficou incompleta. Atualize a página.');
        }
      }

      if (
        registros.length !== totalEsperado ||
        registros.some((registro) => registro.id == null) ||
        new Set(registros.map((registro) => registro.id)).size !== registros.length
      ) {
        throw new Error('Não foi possível obter uma lista consistente de reservas.');
      }

      const reservasFormatadas =
        registros.map(
          (
            item
          ): Reserva => {
            /*
              valor_total é usado primeiro
              porque o cadastro atual já
              grava esse campo como total
              comercial da reserva.

              valor permanece como fallback
              para registros antigos.
            */

            const valorBruto =
              item.valor_total !==
                undefined &&
              item.valor_total !==
                null
                ? item.valor_total
                : item.valor;

            const dataOriginal =
              item.data_reserva ||
              item.data ||
              '';

            return {
              id: item.id,
              horario: item.horario ?? null,
              embarcacao_id: item.embarcacao_id ?? null,
              guiaInformado: Boolean(item.guia?.trim()),
              statusOriginal: (item.status || item.Status || '').trim().toLowerCase(),

              cliente:
                item.cliente ||
                item.nome_cliente ||
                'Cliente não informado',

              pacote:
                item.pacote ||
                item.passeio ||
                'Passeio não informado',

              data:
                formatarData(
                  dataOriginal
                ),

              dataOriginal,

              agencia:
                item.agencia ||
                item.parceiro ||
                'Particular',

              guia:
                item.guia ||
                'Não atribuído',

              valor:
                normalizarValor(
                  valorBruto
                ),

              status:
                normalizarStatus(
                  item.status ||
                    item.Status
                ),

              observacoes:
                item.observacoes ||
                '',
            };
          }
        );

      setReservas(
        reservasFormatadas
      );
    } catch (error) {
      console.error('Erro ao buscar reservas:', error);
      setReservas([]);

      setMensagemErro(
        error && typeof error === 'object' && 'message' in error ? String(error.message)
          : 'Não foi possível carregar as reservas.'
      );
    } finally {
      setLoading(false);
    }
  }

  /*
    ============================================================
    INDICADORES
    ============================================================
  */

  const reservasDoDashboard = useMemo(() => {
    if (!alertaOperacional) return reservas;
    if (!filtroOperacionalValido) return [];

    return reservas.filter((reserva) => {
      const data = (reserva.dataOriginal ?? '').split('T')[0];

      if (
        !dataFiltroReservaValida(data) ||
        data < inicioOperacional ||
        data > fimOperacional ||
        reserva.statusOriginal === 'cancelada'
      ) {
        return false;
      }

      switch (alertaOperacional) {
        case 'pendentes':
          return reserva.statusOriginal === 'pendente';
        case 'sem_horario':
          return !reserva.horario;
        case 'sem_guia':
          return !reserva.guiaInformado;
        case 'sem_embarcacao':
          return !reserva.embarcacao_id;
        default:
          return false;
      }
    });
  }, [
    reservas,
    alertaOperacional,
    inicioOperacional,
    fimOperacional,
    filtroOperacionalValido,
  ]);

  const confirmadas =
    reservasDoDashboard.filter(
      (reserva) =>
        reserva.status ===
        'Confirmada'
    );

  const pendentes =
    reservasDoDashboard.filter(
      (reserva) =>
        reserva.status ===
        'Pendente'
    );

  const canceladas =
    reservasDoDashboard.filter(
      (reserva) =>
        reserva.status ===
        'Cancelada'
    );

  /*
    Não chamamos mais isso de
    "Receita Total".

    Este indicador representa a
    soma comercial das reservas
    cujo status está Confirmada.

    Isso evita somar reservas
    canceladas ou pendentes como
    se já fossem receita.
  */

  const valorConfirmado =
    confirmadas.reduce(
      (total, reserva) =>
        total +
        reserva.valor,
      0
    );

  const indicadores = [
    {
      titulo: 'Confirmadas',
      valor: loading
        ? '—'
        : String(
            confirmadas.length
          ),
      detalhe:
        'reservas confirmadas',
      filtro:
        'Confirmada' as const,
    },

    {
      titulo: 'Pendentes',
      valor: loading
        ? '—'
        : String(
            pendentes.length
          ),
      detalhe:
        'aguardando definição',
      filtro:
        'Pendente' as const,
    },

    {
      titulo: 'Canceladas',
      valor: loading
        ? '—'
        : String(
            canceladas.length
          ),
      detalhe:
        'reservas canceladas',
      filtro:
        'Cancelada' as const,
    },

    {
      titulo:
        'Valor confirmado',
      valor: loading
        ? '—'
        : formatarMoeda(
            valorConfirmado
          ),
      detalhe:
        'somente reservas confirmadas',
      filtro: null,
    },
  ];

  /*
    ============================================================
    FILTROS
    ============================================================
  */

  const reservasFiltradas =
    useMemo(() => {
      const termo =
        busca
          .trim()
          .toLowerCase();

      return reservasDoDashboard.filter(
        (reserva) => {
          const atendeBusca =
            termo.length === 0 ||
            reserva.cliente
              .toLowerCase()
              .includes(termo) ||
            reserva.pacote
              .toLowerCase()
              .includes(termo) ||
            reserva.agencia
              .toLowerCase()
              .includes(termo) ||
            reserva.guia
              .toLowerCase()
              .includes(termo) ||
            reserva.status
              .toLowerCase()
              .includes(termo);

          const atendeStatus =
            !filtroStatus ||
            reserva.status ===
              filtroStatus;

          return (
            atendeBusca &&
            atendeStatus
          );
        }
      );
    }, [reservasDoDashboard, busca, filtroStatus]);

  function alternarFiltro(
    status: StatusReserva
  ) {
    setFiltroStatus(
      filtroStatus === status
        ? ''
        : status
    );
  }

  /*
    ============================================================
    DETALHES
    ============================================================
  */

  function abrirObservacoes(
    reserva: Reserva
  ) {
    setReservaSelecionada(
      reserva
    );

    setModalObsAberto(true);
  }

  /*
    ============================================================
    EXCLUSÃO
    ============================================================
  */

  function confirmarExclusao(
    id:
      | string
      | number
      | undefined
  ) {
    if (
      id === undefined ||
      id === null
    ) {
      return;
    }

    setIdParaExcluir(id);
    setModalExcluirAberto(
      true
    );
  }

  async function executarExclusao() {
    if (
      idParaExcluir === null
    ) {
      return;
    }

    setExcluindo(true);
    setMensagemErro('');

    try {
      const { error } =
        await supabase
          .from('reservas')
          .delete().eq('id', idParaExcluir).select('id').single();

      if (error) {
        throw error;
      }

      setReservas(
        (atuais) =>
          atuais.filter(
            (reserva) =>
              reserva.id !==
              idParaExcluir
          )
      );

      setModalExcluirAberto(
        false
      );

      setIdParaExcluir(null);
    } catch (error) {
      console.error(
        'Erro ao excluir reserva:',
        error
      );

      setMensagemErro(
        error && typeof error === 'object' && 'message' in error ? String(error.message)
          : 'Não foi possível excluir a reserva.'
      );
    } finally {
      setExcluindo(false);
    }
  }

  /*
    ============================================================
    EXPORTAÇÃO CSV
    ============================================================
  */

  function exportarRelatorio() {
    if (
      reservasFiltradas.length ===
      0
    ) {
      setMensagemErro(
        'Não existem reservas para exportar com os filtros atuais.'
      );

      return;
    }

    setMensagemErro('');

    const cabecalho = [
      'ID',
      'Cliente',
      'Passeio',
      'Data do passeio',
      'Agência / Parceiro',
      'Guia',
      'Valor total',
      'Status',
      'Observações',
    ];

    const linhas =
      reservasFiltradas.map(
        (reserva) => [
          escaparCSV(
            reserva.id
          ),

          escaparCSV(
            reserva.cliente
          ),

          escaparCSV(
            reserva.pacote
          ),

          escaparCSV(
            reserva.data
          ),

          escaparCSV(
            reserva.agencia
          ),

          escaparCSV(
            reserva.guia
          ),

          escaparCSV(
            reserva.valor
              .toFixed(2)
              .replace('.', ',')
          ),

          escaparCSV(
            reserva.status
          ),

          escaparCSV(
            reserva.observacoes
          ),
        ]
      );

    const conteudo =
      [
        cabecalho
          .map(escaparCSV)
          .join(';'),

        ...linhas.map(
          (linha) =>
            linha.join(';')
        ),
      ].join('\n');

    const blob =
      new Blob(
        [
          '\uFEFF' +
            conteudo,
        ],
        {
          type: 'text/csv;charset=utf-8;',
        }
      );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement(
        'a'
      );

    link.href = url;

    link.download =
      `reservas_${new Date()
        .toISOString()
        .slice(
          0,
          10
        )}.csv`;

    document.body.appendChild(
      link
    );

    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <section className="border-b border-white/[0.07] bg-[#091510]">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-8 px-5 py-10 md:px-8 md:py-12 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-[#E3A144]" />

              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                Operação • Reservas
              </span>
            </div>

            <h1
              className="mt-4 text-4xl leading-none tracking-[-0.035em] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Reservas
            </h1>

            <p className="mt-4 max-w-[680px] text-sm leading-7 text-[#EDEDE3]/42">
              Acompanhe atendimentos,
              status, passeios, valores
              e detalhes operacionais
              da jornada do cliente.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={
                exportarRelatorio
              }
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.025] px-5 text-xs font-semibold text-[#EDEDE3]/60 transition hover:bg-white/[0.055] hover:text-[#EDEDE3]"
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
                  d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"
                />
              </svg>

              Exportar CSV
            </button>

            <Link
              href="/reservas/nova"
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[#E3A144] px-6 text-sm font-bold text-[#07130F] transition hover:-translate-y-0.5 hover:bg-[#F0B35C]"
            >
              <span className="text-lg">
                +
              </span>

              Nova reserva
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1360px] px-5 py-8 md:px-8 md:py-10">
        {mensagemErro && (
          <p role="alert" className="mb-5 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">
            {mensagemErro}
          </p>
        )}
        <div hidden={Boolean(mensagemErro)}>
{alertaOperacional && (
  <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#E3A144]/25 bg-[#E3A144]/5 p-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="text-sm font-semibold text-[#F4C77E]">
        {filtroOperacionalValido
          ? `Filtro do dashboard: ${nomesAlertas[alertaOperacional]}`
          : 'O link contém um filtro operacional inválido.'}
      </p>
      {filtroOperacionalValido && (
        <p className="mt-2 text-xs leading-6 text-[#EDEDE3]/70">
          {formatarData(inicioOperacional)} até {formatarData(fimOperacional)}.
          Reservas canceladas ficam fora deste recorte.
          Os indicadores, gráficos e a exportação respeitam este recorte;
          a busca e o filtro de status refinam a listagem.
        </p>
      )}
    </div>
    <Link
      href="/reservas"
      className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 px-4 text-sm"
    >
      Ver todas as reservas
    </Link>
  </div>
)}
<GraficosReservas reservas={reservasDoDashboard} carregando={loading} />
        {mensagemErro && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-5 py-4 text-xs text-red-300">
            <span>
              {mensagemErro}
            </span>

            <button
              type="button"
              onClick={() =>
                setMensagemErro('')
              }
              className="text-red-300/50 transition hover:text-red-300"
            >
              ✕
            </button>
          </div>
        )}

        {/* ===================================================
            INDICADORES
        ==================================================== */}

        <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">
          {indicadores.map(
            (indicador) => {
              const ativo =
                indicador.filtro !==
                  null &&
                filtroStatus ===
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
                    }
                  }}
                  className={`rounded-[22px] border p-5 text-left transition ${
                    indicador.filtro
                      ? 'cursor-pointer'
                      : 'cursor-default'
                  } ${
                    ativo
                      ? 'border-[#E3A144]/35 bg-[#E3A144]/8'
                      : 'border-white/[0.075] bg-[#0A1713] hover:border-white/[0.13]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                      {
                        indicador.titulo
                      }
                    </span>

                    {ativo && (
                      <span className="rounded-full bg-[#E3A144]/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-[#E3A144]">
                        filtrando
                      </span>
                    )}
                  </div>

                  <strong
                    className={`mt-5 block font-medium tracking-[-0.04em] text-[#F0F0E8] ${
                      indicador.filtro ===
                      null
                        ? 'text-2xl md:text-3xl'
                        : 'text-4xl'
                    }`}
                    style={{
                      fontFamily:
                        'var(--font-fraunces), serif',
                    }}
                  >
                    {
                      indicador.valor
                    }
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

        {/* ===================================================
            LISTA
        ==================================================== */}

        <section className="mt-6 overflow-hidden rounded-[26px] border border-white/[0.075] bg-[#0A1713]">
          <div className="border-b border-white/[0.065] p-5 md:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  Carteira operacional
                </p>

                <h2
                  className="mt-2 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Reservas cadastradas
                </h2>

                <p className="mt-2 text-xs text-[#EDEDE3]/30">
                  {
                    reservasFiltradas.length
                  }{' '}
                  de{' '}
                  {reservas.length}{' '}
                  reserva
                  {reservas.length !==
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
                    placeholder="Buscar reserva..."
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
                        | StatusReserva
                    )
                  }
                  className="h-[44px] rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-xs text-[#EDEDE3]/70 outline-none focus:border-[#E3A144]/35"
                >
                  <option value="">
                    Todos os status
                  </option>

                  <option value="Pendente">
                    Pendentes
                  </option>

                  <option value="Confirmada">
                    Confirmadas
                  </option>

                  <option value="Cancelada">
                    Canceladas
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
                    Carregando reservas...
                  </p>
                </div>
              </div>
            ) : reservasFiltradas.length ===
              0 ? (
              <div className="flex min-h-[330px] items-center justify-center px-5 text-center">
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
                    Nenhuma reserva
                    encontrada.
                  </h3>

                  <p className="mt-2 text-xs text-[#EDEDE3]/30">
                    Ajuste os filtros
                    ou registre uma
                    nova reserva.
                  </p>
                </div>
              </div>
            ) : (
              <>
  {/* ERN_RESERVAS_MOBILE */}
  <div className="grid min-w-0 gap-2 p-3 sm:grid-cols-2 lg:hidden">
    {reservasFiltradas.map((reserva, indice) => (
      <article
        key={reserva.id ?? indice}
        className="min-w-0 rounded-2xl border border-white/10 bg-[#07110E] p-3"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-sm font-semibold text-[#F0F0E8]">
              {reserva.cliente}
            </h3>
            <p className="mt-1 break-words text-xs leading-4 text-[#EDEDE3]/70">
              {reserva.pacote}
            </p>
          </div>

          <span
            className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
              reserva.status === 'Confirmada'
                ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
                : reserva.status === 'Cancelada'
                  ? 'border-red-400/25 bg-red-400/10 text-red-200'
                  : 'border-amber-400/25 bg-amber-400/10 text-amber-200'
            }`}
          >
            {reserva.status}
          </span>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <div className="min-w-0">
            <dt className="text-[10px] text-[#EDEDE3]/60">Data do passeio</dt>
            <dd className="mt-1 break-words">{reserva.data}</dd>
          </div>

          <div className="min-w-0">
            <dt className="text-[10px] text-[#EDEDE3]/60">Valor comercial</dt>
            <dd className="mt-1 break-words font-semibold text-[#F4C77E]">
              {formatarMoeda(reserva.valor)}
            </dd>
          </div>

          <div className="min-w-0">
            <dt className="text-[10px] text-[#EDEDE3]/60">Agência / Parceiro</dt>
            <dd className="mt-1 break-words">{reserva.agencia}</dd>
          </div>

          <div className="min-w-0">
            <dt className="text-[10px] text-[#EDEDE3]/60">Guia</dt>
            <dd className="mt-1 break-words">{reserva.guia}</dd>
          </div>
        </dl>

        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-2">
          <button
            type="button"
            onClick={() => abrirObservacoes(reserva)}
            className="min-h-11 rounded-xl border border-white/15 px-2 text-xs font-semibold"
          >
            Detalhes
          </button>

          {reserva.id != null && (
            <>
              <Link
                href={`/reservas/editar/${reserva.id}`}
                className="flex min-h-11 items-center justify-center rounded-xl border border-sky-400/25 px-2 text-xs font-semibold text-sky-200"
              >
                Editar
              </Link>

              <button
                type="button"
                disabled={excluindo}
                onClick={() => confirmarExclusao(reserva.id)}
                className="min-h-11 rounded-xl border border-red-400/25 px-2 text-xs font-semibold text-red-200 disabled:opacity-50"
              >
                Excluir
              </button>
            </>
          )}
        </div>
      </article>
    ))}
  </div>

<table className="hidden lg:table min-w-[1180px] w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.012]">
                    {[
                      'Cliente',
                      'Passeio',
                      'Data',
                      'Agência / Parceiro',
                      'Guia',
                      'Valor',
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
                  {reservasFiltradas.map(
                    (
                      reserva,
                      index
                    ) => {
                      const statusClass =
                        reserva.status ===
                        'Confirmada'
                          ? 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300'
                          : reserva.status ===
                            'Cancelada'
                          ? 'border-red-500/20 bg-red-500/[0.07] text-red-300'
                          : 'border-amber-500/20 bg-amber-500/[0.07] text-amber-300';

                      const statusDot =
                        reserva.status ===
                        'Confirmada'
                          ? 'bg-emerald-400'
                          : reserva.status ===
                            'Cancelada'
                          ? 'bg-red-400'
                          : 'bg-amber-400';

                      return (
                        <tr
                          key={
                            reserva.id ??
                            index
                          }
                          className="transition hover:bg-white/[0.018]"
                        >
                          <td className="px-5 py-4">
                            <p className="text-xs font-semibold text-[#EDEDE3]/82">
                              {
                                reserva.cliente
                              }
                            </p>
                          </td>

                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/44">
                            {
                              reserva.pacote
                            }
                          </td>

                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/44">
                            {
                              reserva.data
                            }
                          </td>

                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/44">
                            {
                              reserva.agencia
                            }
                          </td>

                          <td className="px-5 py-4 text-xs text-[#EDEDE3]/44">
                            {
                              reserva.guia
                            }
                          </td>

                          <td className="px-5 py-4 text-xs font-semibold text-[#F4C77E]">
                            {formatarMoeda(
                              reserva.valor
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[9px] font-semibold ${statusClass}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${statusDot}`}
                              />

                              {
                                reserva.status
                              }
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  abrirObservacoes(
                                    reserva
                                  )
                                }
                                title="Ver detalhes"
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
                                href={`/reservas/editar/${reserva.id}`}
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
                                    reserva.id
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
</>
            )}
          </div>
        </section>
              </div>
      </main>

      {/* =====================================================
          MODAL DETALHES
      ====================================================== */}

      {modalObsAberto &&
        reservaSelecionada && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="max-h-[90dvh] w-full max-w-[680px] overflow-y-auto rounded-[26px] border border-white/[0.09] bg-[#091510] shadow-[0_35px_100px_rgba(0,0,0,0.6)]">
              <div className="flex items-start justify-between gap-5 border-b border-white/[0.07] px-6 py-5">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                    Detalhes da reserva
                  </p>

                  <h3
                    className="mt-2 text-2xl text-[#F0F0E8]"
                    style={{
                      fontFamily:
                        'var(--font-fraunces), serif',
                    }}
                  >
                    {
                      reservaSelecionada.cliente
                    }
                  </h3>

                  <p className="mt-1 text-xs text-[#EDEDE3]/35">
                    {
                      reservaSelecionada.pacote
                    }
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setModalObsAberto(
                      false
                    )
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-[#EDEDE3]/45 transition hover:bg-white/[0.06]"
                >
                  ✕
                </button>
              </div>

              <div className="grid gap-3 p-6 sm:grid-cols-2">
                {[
                  {
                    label:
                      'Data do passeio',
                    valor:
                      reservaSelecionada.data,
                  },
                  {
                    label: 'Status',
                    valor:
                      reservaSelecionada.status,
                  },
                  {
                    label:
                      'Agência / Parceiro',
                    valor:
                      reservaSelecionada.agencia,
                  },
                  {
                    label: 'Guia',
                    valor:
                      reservaSelecionada.guia,
                  },
                  {
                    label:
                      'Valor total',
                    valor:
                      formatarMoeda(
                        reservaSelecionada.valor
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

                <div className="sm:col-span-2">
                  <p className="mb-2 text-[8px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/28">
                    Observações
                  </p>

                  <div className="min-h-[90px] rounded-2xl border border-white/[0.065] bg-[#07110E] p-4 text-xs leading-6 text-[#EDEDE3]/50">
                    {reservaSelecionada.observacoes ||
                      'Nenhuma observação registrada para esta reserva.'}
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-white/[0.07] px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setModalObsAberto(
                      false
                    )
                  }
                  className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 py-2.5 text-xs font-semibold text-[#EDEDE3]/55"
                >
                  Fechar
                </button>

                <Link
                  href={`/reservas/editar/${reservaSelecionada.id}`}
                  className="rounded-xl bg-[#E3A144] px-5 py-2.5 text-center text-xs font-bold text-[#07130F]"
                >
                  Editar reserva
                </Link>
              </div>
            </div>
          </div>
        )}

      {/* =====================================================
          MODAL EXCLUSÃO
      ====================================================== */}

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
              Excluir reserva?
            </h3>

            <p className="mt-3 text-xs leading-6 text-[#EDEDE3]/38">
              A reserva será removida
              permanentemente da base.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={excluindo}
                onClick={() => {
                  setModalExcluirAberto(
                    false
                  );

                  setIdParaExcluir(
                    null
                  );
                }}
                className="rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-3 text-xs font-semibold text-[#EDEDE3]/60"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={excluindo}
                onClick={
                  executarExclusao
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
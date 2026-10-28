'use client';
import './reservas-premium.css';

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import GraficosReservas from '@/app/components/GraficosReservas';
import SituacaoPeriodoReservaERN, {
  referenciaManausERN,
} from '@/app/components/SituacaoPeriodoReservaERN';

import {
  normalizarStatusReservaERN,
  reservaEncerradaERN,
  reservaOperacionalERN,
  type StatusReservaERN as StatusReserva,
} from '@/lib/reservasStatusERN';

interface Reserva {
  id?: string | number;
  empresa_id?: string | null;
  quantidade_pessoas: number | null;
  horario?: string | null;
  data_fim_prevista?: string | null;
  horario_fim_previsto?: string | null;
  embarcacao_id?: string | null;
  guiaInformado?: boolean;
  statusOriginal?: string;
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
  id?: string | number;
  empresa_id?: string | null;
  quantidade_pessoas?: number | null;
  horario?: string | null;
  data_fim_prevista?: string | null;
  horario_fim_previsto?: string | null;
  embarcacao_id?: string | null;
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

type ModalAberto = {
  tipo: 'detalhes' | 'excluir';
  reserva: Reserva;
} | null;

type BloqueioExclusao = 'voucher' | 'vinculo' | null;

const buttonClass =
  'inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-[#D6E2D9] transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50';

const inputClass =
  'min-h-12 w-full min-w-0 rounded-xl border border-white/15 bg-[#07110E] px-4 py-3 text-sm text-[#EDEDE3] outline-none placeholder:text-[#B4C8BB]/60 focus:border-[#E3A144]';

const headingStyle = {
  fontFamily: 'var(--font-fraunces), serif',
};

const nomesAlertas: Record<string, string> = {
  pendentes: 'Reservas pendentes',
  sem_horario: 'Sem horário',
  sem_guia: 'Sem guia',
  sem_embarcacao: 'Sem embarcação',
};

function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

const normalizarStatus = normalizarStatusReservaERN;

function normalizarQuantidadePessoas(valor: unknown): number | null {
  return (
    typeof valor === 'number' &&
    Number.isInteger(valor) &&
    valor >= 1 &&
    valor <= 2147483647
  )
    ? valor
    : null;
}

function formatarQuantidadePessoas(valor: number | null): string {
  return valor === null ? 'Não informada' : valor.toLocaleString('pt-BR');
}

function normalizarValor(valor: unknown): number {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

function apenasData(valor?: string | null): string {
  return valor?.split('T')[0] ?? '';
}

function dataValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;

  const data = new Date(`${valor}T12:00:00Z`);

  return (
    Number.isFinite(data.getTime()) &&
    data.toISOString().slice(0, 10) === valor
  );
}

function formatarData(valor?: string | null): string {
  const data = apenasData(valor);
  if (!data) return '—';

  const partes = data.split('-');
  if (partes.length !== 3) return valor ?? '—';

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function hojeManaus(): string {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Manaus',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const obter = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';

  return `${obter('year')}-${obter('month')}-${obter('day')}`;
}

function escaparCSV(valor: unknown): string {
  let texto = String(valor ?? '');

  if (/^[\s\uFEFF]*[=+\-@]/u.test(texto) || /^[\t\r\n]/.test(texto)) {
    texto = "'" + texto;
  }

  return `"${texto.replace(/"/g, '""')}"`;
}

function mensagemDoErro(erro: unknown, padrao: string): string {
  if (erro instanceof Error) return erro.message;

  if (
    typeof erro === 'object' &&
    erro !== null &&
    'message' in erro &&
    typeof erro.message === 'string'
  ) {
    return erro.message;
  }

  return padrao;
}

function identificarBloqueio(erro: unknown): BloqueioExclusao {
  if (typeof erro !== 'object' || erro === null) return null;

  const dados = erro as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };

  if (dados.code !== '23503') return null;

  const texto = `${dados.message ?? ''} ${dados.details ?? ''}`;

  return texto.includes('vouchers_reserva_id_fkey')
    ? 'voucher'
    : 'vinculo';
}

async function obterEmpresa(): Promise<string> {
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

  return String(perfil.empresa_id);
}

function StatusBadge({ status }: { status: StatusReserva }) {
  const classes: Record<StatusReserva, string> = {
    Pendente: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
    Confirmada: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
    Cancelada: 'border-red-400/25 bg-red-400/10 text-red-200',
    Concluída: 'border-sky-400/25 bg-sky-400/10 text-sky-200',
    'Não compareceu': 'border-orange-400/25 bg-orange-400/10 text-orange-200',
    Desconhecido: 'border-white/25 bg-white/10 text-white',
  };
  const classe = classes[status];

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${classe}`}>
      {status}
    </span>
  );
}

function Modal({
  titulo,
  bloqueado,
  aoFechar,
  children,
}: {
  titulo: string;
  bloqueado: boolean;
  aoFechar: () => void;
  children: React.ReactNode;
}) {
  const tituloId = React.useId();
  const container = useRef<HTMLDivElement>(null);
  const fecharRef = useRef(aoFechar);
  const bloqueadoRef = useRef(bloqueado);

  fecharRef.current = aoFechar;
  bloqueadoRef.current = bloqueado;

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const overflowAnterior = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    container.current?.focus();

    function teclado(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!bloqueadoRef.current) fecharRef.current();
      }

      if (event.key !== 'Tab' || !container.current) return;

      const elementos = Array.from(
        container.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]'
        )
      ).filter((elemento) => elemento.getClientRects().length > 0);

      const primeiro = elementos[0];
      const ultimo = elementos[elementos.length - 1];

      if (!primeiro || !ultimo) {
        event.preventDefault();
        container.current.focus();
        return;
      }

      if (
        event.shiftKey &&
        (document.activeElement === primeiro ||
          document.activeElement === container.current)
      ) {
        event.preventDefault();
        ultimo.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === ultimo ||
          document.activeElement === container.current)
      ) {
        event.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener('keydown', teclado);

    return () => {
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener('keydown', teclado);
      anterior?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-5">
      <div
        ref={container}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-busy={bloqueado}
        tabIndex={-1}
        className="max-h-[90dvh] w-full max-w-[720px] overflow-y-auto rounded-2xl border border-white/15 bg-[#091510] shadow-2xl outline-none"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <h2 id={tituloId} className="min-w-0 break-words text-2xl" style={headingStyle}>
            {titulo}
          </h2>
          <button
            type="button"
            aria-label="Fechar janela"
            disabled={bloqueado}
            onClick={aoFechar}
            className={`${buttonClass} shrink-0`}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
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

  const filtroOperacionalValido =
    Object.prototype.hasOwnProperty.call(nomesAlertas, alertaOperacional) &&
    dataValida(inicioOperacional) &&
    dataValida(fimOperacional) &&
    inicioOperacional <= fimOperacional;

  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [referenciaPeriodoERN, setReferenciaPeriodoERN] = useState('');

  useEffect(() => {
    const atualizar = () => {
      setReferenciaPeriodoERN(referenciaManausERN());
    };

    atualizar();
    const intervalo = window.setInterval(atualizar, 60000);
    window.addEventListener('focus', atualizar);

    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener('focus', atualizar);
    };
  }, []);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'' | StatusReserva>('');
  const [erroConsulta, setErroConsulta] = useState('');
  const [erroExportacao, setErroExportacao] = useState('');
  const [erroExclusao, setErroExclusao] = useState('');
  const [bloqueioExclusao, setBloqueioExclusao] =
    useState<BloqueioExclusao>(null);
  const [modal, setModal] = useState<ModalAberto>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [sucesso, setSucesso] = useState('');

  const exclusaoEmAndamento = useRef(false);
  const versaoConsulta = useRef(0);

  const carregarReservas = useCallback(async () => {
    const versao = ++versaoConsulta.current;

    setLoading(true);
    setErroConsulta('');
    setErroExportacao('');

    try {
      const empresaId = await obterEmpresa();
      const registros: ReservaBanco[] = [];
      let totalEsperado: number | null = null;

      for (let inicio = 0; inicio < 10000; inicio += 200) {
        const { data, error, count } = await supabase
          .from('reservas')
          .select('*', { count: 'exact' })
          .eq('empresa_id', empresaId)
          .order('id', { ascending: false })
          .range(inicio, inicio + 199);

        if (error) throw error;

        if (count === null || count > 10000) {
          throw new Error(
            'O volume de reservas exige uma consulta por período. Nenhum resultado parcial será apresentado.'
          );
        }

        if (totalEsperado !== null && totalEsperado !== count) {
          throw new Error(
            'As reservas mudaram durante a consulta. Atualize a página.'
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

      if (versao !== versaoConsulta.current) return;

      const formatadas = registros.map((item): Reserva => {
        const valorBruto = item.valor_total ?? item.valor;
        const dataOriginal = item.data_reserva || item.data || '';

        return {
          id: item.id,
          empresa_id: item.empresa_id ?? empresaId,
          horario: item.horario ?? null,
          data_fim_prevista: item.data_fim_prevista ?? null,
          horario_fim_previsto: item.horario_fim_previsto ?? null,
          embarcacao_id: item.embarcacao_id ?? null,
          guiaInformado: Boolean(item.guia?.trim()),
          statusOriginal: (item.status || item.Status || '').trim().toLowerCase(),
          cliente: item.cliente || item.nome_cliente || 'Cliente não informado',
          quantidade_pessoas: normalizarQuantidadePessoas(item.quantidade_pessoas),
          pacote: item.pacote || item.passeio || 'Passeio não informado',
          data: formatarData(dataOriginal),
          dataOriginal,
          agencia: item.agencia || item.parceiro || 'Particular',
          guia: item.guia || 'Não atribuído',
          valor: normalizarValor(valorBruto),
          status: normalizarStatus(item.status || item.Status),
          observacoes: item.observacoes || '',
        };
      });

      setReservas(formatadas);
    } catch (erro) {
      if (versao !== versaoConsulta.current) return;

      setReservas([]);
      setErroConsulta(
        mensagemDoErro(erro, 'Não foi possível carregar as reservas.')
      );
    } finally {
      if (versao === versaoConsulta.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregarReservas();

    return () => {
      versaoConsulta.current += 1;
    };
  }, [carregarReservas]);

  useEffect(() => {
    if (!sucesso) return;
    const timer = window.setTimeout(() => setSucesso(''), 4000);
    return () => window.clearTimeout(timer);
  }, [sucesso]);

  const reservasDoDashboard = useMemo(() => {
    if (!alertaOperacional) return reservas;
    if (!filtroOperacionalValido) return [];

    return reservas.filter((reserva) => {
      const data = apenasData(reserva.dataOriginal);

      if (
        !dataValida(data) ||
        data < inicioOperacional ||
        data > fimOperacional ||
        !reservaOperacionalERN(reserva.status)
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

  const confirmadas = reservasDoDashboard.filter(
    (reserva) => reserva.status === 'Confirmada'
  );
  const pendentes = reservasDoDashboard.filter(
    (reserva) => reserva.status === 'Pendente'
  );
  const canceladas = reservasDoDashboard.filter(
    (reserva) => reserva.status === 'Cancelada'
  );

  const valorConfirmado = confirmadas.reduce(
    (total, reserva) => total + reserva.valor,
    0
  );

  const indicadores: {
    titulo: string;
    valor: string;
    detalhe: string;
    filtro: StatusReserva | null;
  }[] = [
    {
      titulo: 'Confirmadas',
      valor: String(confirmadas.length),
      detalhe: 'Reservas confirmadas',
      filtro: 'Confirmada',
    },
    {
      titulo: 'Pendentes',
      valor: String(pendentes.length),
      detalhe: 'Aguardando definição',
      filtro: 'Pendente',
    },
    {
      titulo: 'Canceladas',
      valor: String(canceladas.length),
      detalhe: 'Reservas canceladas',
      filtro: 'Cancelada',
    },
    {
      titulo: 'Valor confirmado',
      valor: formatarMoeda(valorConfirmado),
      detalhe: 'Valor comercial, não receita recebida',
      filtro: null,
    },
  ];

  const reservasFiltradas = useMemo(() => {
    const termo = normalizarTexto(busca);

    return reservasDoDashboard.filter((reserva) => {
      const texto = normalizarTexto(
        `${reserva.cliente} ${reserva.pacote} ${reserva.agencia} ${reserva.guia} ${reserva.status}`
      );

      return (
        (!termo || texto.includes(termo)) &&
        (!filtroStatus || reserva.status === filtroStatus)
      );
    });
  }, [reservasDoDashboard, busca, filtroStatus]);

  function abrirModal(tipo: 'detalhes' | 'excluir', reserva: Reserva) {
    if (exclusaoEmAndamento.current) return;

    setErroExclusao('');
    setBloqueioExclusao(null);
    setModal({ tipo, reserva });
  }

  function fecharModal() {
    if (exclusaoEmAndamento.current) return;

    setModal(null);
    setErroExclusao('');
    setBloqueioExclusao(null);
  }

  async function executarExclusao() {
    if (
      modal?.tipo !== 'excluir' ||
      modal.reserva.id == null ||
      exclusaoEmAndamento.current
    ) {
      return;
    }

    const reserva = modal.reserva;
    const id = reserva.id;

    exclusaoEmAndamento.current = true;
    setExcluindo(true);
    setErroExclusao('');
    setBloqueioExclusao(null);

    try {
      const empresaId = await obterEmpresa();

      if (!reserva.empresa_id || reserva.empresa_id !== empresaId) {
        throw new Error(
          'A empresa da sessão mudou. Feche esta janela e atualize as reservas.'
        );
      }

      const { data, error } = await supabase
        .from('reservas')
        .delete()
        .eq('id', id)
        .eq('empresa_id', empresaId)
        .select('id')
        .single();

      if (error) throw error;

      if (!data?.id) {
        throw new Error(
          'Não foi possível confirmar a exclusão. Atualize a lista antes de tentar novamente.'
        );
      }

      setReservas((atuais) => atuais.filter((item) => item.id !== id));
      setModal(null);
      setSucesso('Reserva excluída com sucesso.');
    } catch (erro) {
      const bloqueio = identificarBloqueio(erro);
      setBloqueioExclusao(bloqueio);

      if (bloqueio === 'voucher') {
        setErroExclusao(
          'Esta reserva possui voucher vinculado e não pode ser excluída. Edite a reserva e altere o status para Cancelada para preservar o histórico. O voucher deve ser revisado separadamente.'
        );
      } else if (bloqueio === 'vinculo') {
        setErroExclusao(
          'Esta reserva possui registros vinculados e não pode ser excluída. Revise os vínculos ou cancele a reserva para preservar o histórico.'
        );
      } else {
        setErroExclusao(
          mensagemDoErro(erro, 'Não foi possível excluir a reserva.')
        );
      }
    } finally {
      exclusaoEmAndamento.current = false;
      setExcluindo(false);
    }
  }

  function exportarRelatorio() {
    if (loading || erroConsulta) return;

    if (!reservasFiltradas.length) {
      setErroExportacao(
        'Não existem reservas para exportar com os filtros atuais.'
      );
      return;
    }

    setErroExportacao('');

    const cabecalho = [
      'ID',
      'Cliente',
      'Passeio',
      'Quantidade de pessoas',
      'Data do passeio',
      'Horário',
      'Agência / Parceiro',
      'Guia',
      'Valor total',
      'Status',
      'Observações',
    ];

    const linhas = reservasFiltradas.map((reserva) => [
      reserva.id,
      reserva.cliente,
      reserva.pacote,
      reserva.quantidade_pessoas ?? '',
      reserva.data,
      reserva.horario?.slice(0, 5) || '',
      reserva.agencia,
      reserva.guia,
      reserva.valor.toFixed(2).replace('.', ','),
      reserva.status,
      reserva.observacoes,
    ]);

    const conteudo = [cabecalho, ...linhas]
      .map((linha) => linha.map(escaparCSV).join(';'))
      .join('\r\n');

    const blob = new Blob(['\uFEFF' + conteudo], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `reservas_${hojeManaus()}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function acoes(reserva: Reserva) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={excluindo}
          onClick={() => abrirModal('detalhes', reserva)}
          className={buttonClass}
        >
          Ver
        </button>

        {reserva.id != null && (
          <Link
            href={`/reservas/editar/${encodeURIComponent(String(reserva.id))}`}
            className={buttonClass}
          >
            {reservaEncerradaERN(reserva.status) ? 'Consultar' : 'Editar'}
          </Link>
        )}

        <button
          type="button"
          disabled={excluindo || reserva.id == null || reservaEncerradaERN(reserva.status)}
          onClick={() => abrirModal('excluir', reserva)}
          className={`${buttonClass} border-red-400/25 text-red-300`}
        >
          Excluir
        </button>
      </div>
    );
  }

  const selecionada = modal?.reserva;
  const idSelecionado = selecionada?.id;
  const idURL = idSelecionado == null
    ? ''
    : encodeURIComponent(String(idSelecionado));

  return (
    <div className="ern-reservas-premium min-h-screen bg-[#0C1112] text-[#F1F4EF]">
      {sucesso && (
        <div
          role="status"
          className="fixed left-3 right-3 top-24 z-[90] mx-auto max-w-lg rounded-2xl border border-emerald-400/25 bg-[#0B2119] p-4 text-sm text-emerald-200 shadow-2xl"
        >
          {sucesso}
        </div>
      )}

      <header className="border-b border-white/10 bg-[#091510]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
              Operação · Reservas
            </p>
            <h1 className="mt-3 text-4xl sm:text-5xl" style={headingStyle}>
              Reservas
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#B4C8BB]">
              Acompanhe clientes, passeios, participantes, status e detalhes
              operacionais de cada reserva.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={loading || excluindo}
              onClick={() => void carregarReservas()}
              className={buttonClass}
            >
              {loading ? 'Atualizando…' : 'Atualizar'}
            </button>
            <button
              type="button"
              disabled={loading || Boolean(erroConsulta)}
              onClick={exportarRelatorio}
              className={buttonClass}
            >
              Exportar CSV
            </button>
            <Link
              href="/reservas/nova"
              className={`${buttonClass} border-[#E3A144] bg-[#E3A144] font-bold text-[#07130F] hover:bg-[#F0B35C]`}
            >
              + Nova reserva
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        {erroConsulta && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200"
          >
            <p>{erroConsulta}</p>
            <button
              type="button"
              disabled={loading}
              onClick={() => void carregarReservas()}
              className={`${buttonClass} mt-4`}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {erroExportacao && (
          <p role="alert" className="mb-5 rounded-xl border border-amber-400/25 p-4 text-sm text-amber-200">
            {erroExportacao}
          </p>
        )}

        {alertaOperacional && (
          <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-[#E3A144]/25 bg-[#E3A144]/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#F4C77E]">
                {filtroOperacionalValido
                  ? `Filtro do dashboard: ${nomesAlertas[alertaOperacional]}`
                  : 'O link contém um filtro operacional inválido.'}
              </p>
              {filtroOperacionalValido && (
                <p className="mt-2 text-xs leading-6 text-[#C5D4CA]">
                  {formatarData(inicioOperacional)} até {formatarData(fimOperacional)}.
                  {' '}Reservas canceladas ficam fora deste recorte.
                  Indicadores, gráficos e exportação respeitam esse recorte;
                  a busca e o status refinam a listagem e a exportação.
                </p>
              )}
            </div>
            <Link href="/reservas" className={`${buttonClass} shrink-0`}>
              Ver todas as reservas
            </Link>
          </div>
        )}

        {!erroConsulta && (
          <>
            <div className="min-w-0">
              <GraficosReservas
                reservas={reservasDoDashboard}
                carregando={loading}
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
              {indicadores.map((indicador) => {
                const ativo =
                  indicador.filtro !== null &&
                  filtroStatus === indicador.filtro;

                const conteudo = (
                  <>
                    <span className="block text-sm text-[#B4C8BB]">
                      {indicador.titulo}
                    </span>
                    <strong className="mt-3 block break-words text-xl tabular-nums text-[#F4C77E] sm:text-2xl">
                      {loading ? '—' : indicador.valor}
                    </strong>
                    <span className="mt-2 block text-xs leading-5 text-[#B4C8BB]">
                      {indicador.detalhe}
                    </span>
                  </>
                );

                return indicador.filtro ? (
                  <button
                    key={indicador.titulo}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => {
                      const status = indicador.filtro;
                      if (status) {
                        setFiltroStatus((atual) => atual === status ? '' : status);
                      }
                    }}
                    className={`min-w-0 rounded-2xl border p-4 text-left ${
                      ativo
                        ? 'border-[#E3A144]/50 bg-[#E3A144]/10'
                        : 'border-white/10 bg-[#0A1713]'
                    }`}
                  >
                    {conteudo}
                  </button>
                ) : (
                  <div
                    key={indicador.titulo}
                    className="min-w-0 rounded-2xl border border-white/10 bg-[#0A1713] p-4"
                  >
                    {conteudo}
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-xs leading-6 text-[#B4C8BB]">
              Os indicadores seguem o recorte operacional do dashboard, quando
              presente. Busca e status filtram a listagem e o CSV.
              Valor confirmado representa o valor comercial das reservas.
            </p>
          </>
        )}

        <section
          aria-label="Filtros das reservas"
          className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-[#0A1713] p-4 sm:grid-cols-[1fr_220px]"
        >
          <div className="min-w-0">
            <label htmlFor="reserva-busca" className="mb-2 block text-sm text-[#C5D4CA]">
              Buscar
            </label>
            <input
              id="reserva-busca"
              type="search"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Cliente, passeio, agência ou guia"
              className={inputClass}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="reserva-status" className="mb-2 block text-sm text-[#C5D4CA]">
              Status
            </label>
            <select
              id="reserva-status"
              value={filtroStatus}
              onChange={(event) => setFiltroStatus(event.target.value as '' | StatusReserva)}
              className={inputClass}
            >
              <option value="">Todos os status</option>
              <option value="Pendente">Pendentes</option>
              <option value="Confirmada">Confirmadas</option>
              <option value="Cancelada">Canceladas</option>
              <option value="Concluída">Concluídas</option>
              <option value="Não compareceu">Não compareceu</option>
              <option value="Desconhecido">Status não reconhecido</option>
            </select>
          </div>
        </section>

        <section
          aria-busy={loading}
          className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#0A1713]"
        >
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[#E3A144]">
                Carteira operacional
              </p>
              <h2 className="mt-2 text-2xl" style={headingStyle}>
                Reservas cadastradas
              </h2>
            </div>
            <p className="text-sm text-[#B4C8BB]">
              {loading || erroConsulta
                ? '—'
                : `${reservasFiltradas.length} de ${reservasDoDashboard.length} no recorte · ${reservas.length} no histórico`}
            </p>
          </div>

          {loading ? (
            <p role="status" className="p-10 text-center text-sm text-[#B4C8BB]">
              Carregando reservas…
            </p>
          ) : erroConsulta ? (
            <p className="p-10 text-center text-sm text-red-200">
              A listagem está indisponível. Atualize os dados.
            </p>
          ) : reservasFiltradas.length === 0 ? (
            <div className="p-10 text-center">
              <h3 className="text-xl" style={headingStyle}>
                Nenhuma reserva encontrada
              </h3>
              <p className="mt-3 text-sm text-[#B4C8BB]">
                Ajuste os filtros ou registre uma nova reserva.
              </p>
            </div>
          ) : (
            <>
              <div className="grid min-w-0 gap-3 p-3 sm:grid-cols-2 lg:hidden">
                {reservasFiltradas.map((reserva, index) => (
                  <article
                    key={reserva.id ?? index}
                    className="min-w-0 rounded-2xl border border-white/10 bg-[#07110E] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-base font-semibold">
                          {reserva.cliente}
                        </h3>
                        <p className="mt-2 break-words text-sm leading-6 text-[#C5D4CA]">
                          {reserva.pacote}
                        </p>
                      </div>
                      <div className="flex min-w-0 flex-col items-start gap-2">
                        <StatusBadge status={reserva.status} />
                        <SituacaoPeriodoReservaERN
                          status={reserva.statusOriginal ?? reserva.status}
                          inicio={reserva.dataOriginal}
                          fim={reserva.data_fim_prevista}
                          horarioFim={reserva.horario_fim_previsto}
                          referencia={referenciaPeriodoERN}
                        />
                      </div>
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      {[
                        ['Pessoas', formatarQuantidadePessoas(reserva.quantidade_pessoas)],
                        ['Data do passeio', reserva.data],
                        ['Horário', reserva.horario?.slice(0, 5) || 'Não informado'],
                        ['Valor comercial', formatarMoeda(reserva.valor)],
                        ['Agência / Parceiro', reserva.agencia],
                        ['Guia', reserva.guia],
                      ].map(([label, valor]) => (
                        <div key={label} className="min-w-0">
                          <dt className="text-xs text-[#B4C8BB]">{label}</dt>
                          <dd className="mt-1 break-words">{valor}</dd>
                        </div>
                      ))}
                    </dl>

                    <div className="mt-4 border-t border-white/10 pt-4">
                      {acoes(reserva)}
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
                  <thead className="border-b border-white/10 text-xs text-[#B4C8BB]">
                    <tr>
                      {['Cliente / Passeio', 'Pessoas', 'Data / Horário', 'Agência / Parceiro', 'Guia', 'Valor comercial', 'Status', 'Ações'].map((titulo) => (
                        <th key={titulo} scope="col" className="px-4 py-4">
                          {titulo}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {reservasFiltradas.map((reserva, index) => (
                      <tr key={reserva.id ?? index} className="hover:bg-white/[0.02]">
                        <td className="min-w-[200px] max-w-xs px-4 py-4">
                          <p className="break-words font-medium">{reserva.cliente}</p>
                          <p className="mt-2 break-words text-[#B4C8BB]">{reserva.pacote}</p>
                        </td>
                        <td className="px-4 py-4">{formatarQuantidadePessoas(reserva.quantidade_pessoas)}</td>
                        <td className="whitespace-nowrap px-4 py-4">
                          <p>{reserva.data}</p>
                          <p className="mt-2 text-xs text-[#B4C8BB]">
                            {reserva.horario?.slice(0, 5) || 'Sem horário'}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-[#C5D4CA]">{reserva.agencia}</td>
                        <td className="px-4 py-4 text-[#C5D4CA]">{reserva.guia}</td>
                        <td className="whitespace-nowrap px-4 py-4 font-semibold tabular-nums text-[#F4C77E]">
                          {formatarMoeda(reserva.valor)}
                        </td>
                        <td className="px-4 py-4"><div className="flex min-w-0 flex-col items-start gap-2">
                        <StatusBadge status={reserva.status} />
                        <SituacaoPeriodoReservaERN
                          status={reserva.statusOriginal ?? reserva.status}
                          inicio={reserva.dataOriginal}
                          fim={reserva.data_fim_prevista}
                          horarioFim={reserva.horario_fim_previsto}
                          referencia={referenciaPeriodoERN}
                        />
                      </div></td>
                        <td className="min-w-[240px] px-4 py-4">{acoes(reserva)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </main>

      {modal && selecionada && (
        <Modal
          titulo={modal.tipo === 'excluir' ? 'Excluir reserva?' : 'Detalhes da reserva'}
          bloqueado={excluindo}
          aoFechar={fecharModal}
        >
          {modal.tipo === 'detalhes' ? (
            <div className="p-5">
              <h3 className="break-words text-xl font-semibold">{selecionada.cliente}</h3>
              <p className="mt-2 break-words text-sm text-[#B4C8BB]">{selecionada.pacote}</p>

              {idSelecionado != null && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {reservaOperacionalERN(selecionada.status) && (
                    <Link
                      href={`/vouchers/novo?reserva_id=${idURL}`}
                      className={`${buttonClass} border-[#E3A144]/40 text-[#F4C77E]`}
                    >
                      Emitir voucher
                    </Link>
                  )}
                  <Link href={`/vouchers?reserva_id=${idURL}`} className={buttonClass}>
                    Consultar vouchers
                  </Link>
                  <Link href={`/financeiro/receita/novo?reserva_id=${idURL}`} className={buttonClass}>
                    Registrar receita
                  </Link>
                  <Link href={`/financeiro?reserva_id=${idURL}`} className={buttonClass}>
                    Consultar financeiro
                  </Link>
                </div>
              )}

              <div className="mt-4">
                <SituacaoPeriodoReservaERN
                  status={selecionada.statusOriginal ?? selecionada.status}
                  inicio={selecionada.dataOriginal}
                  fim={selecionada.data_fim_prevista}
                  horarioFim={selecionada.horario_fim_previsto}
                  referencia={referenciaPeriodoERN}
                  detalhado
                />
              </div>

              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ['Quantidade de pessoas', formatarQuantidadePessoas(selecionada.quantidade_pessoas)],
                  ['Data do passeio', selecionada.data],
                  ['Horário', selecionada.horario?.slice(0, 5) || 'Não informado'],
                  ['Status', selecionada.status],
                  ['Término previsto', selecionada.data_fim_prevista ? formatarData(selecionada.data_fim_prevista) : 'Não informado'],
                  ['Horário de término', selecionada.horario_fim_previsto?.slice(0, 5) || 'Não informado'],
                  ['Agência / Parceiro', selecionada.agencia],
                  ['Guia', selecionada.guia],
                  ['Embarcação vinculada', selecionada.embarcacao_id ? 'Sim' : 'Não'],
                  ['Valor comercial', formatarMoeda(selecionada.valor)],
                ].map(([label, valor]) => (
                  <div key={label} className="min-w-0 rounded-xl border border-white/10 p-4">
                    <dt className="text-xs text-[#B4C8BB]">{label}</dt>
                    <dd className="mt-2 break-words text-sm">{valor}</dd>
                  </div>
                ))}
                <div className="min-w-0 rounded-xl border border-white/10 p-4 sm:col-span-2">
                  <dt className="text-xs text-[#B4C8BB]">Observações</dt>
                  <dd className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">
                    {selecionada.observacoes || 'Nenhuma observação registrada.'}
                  </dd>
                </div>
              </dl>

              <div className="mt-5 flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={fecharModal} className={buttonClass}>Fechar</button>
                {idSelecionado != null && (
                  <Link href={`/reservas/editar/${idURL}`} className={buttonClass}>
                    Editar reserva
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="p-5">
              <p className="break-words text-sm leading-7 text-[#C5D4CA]">
                A reserva de <strong>{selecionada.cliente}</strong>,
                para <strong>{selecionada.pacote}</strong>,
                será removida permanentemente.
              </p>
              <p className="mt-3 text-sm leading-7 text-[#B4C8BB]">
                Reservas com vouchers ou lançamentos financeiros vinculados têm a exclusão bloqueada.
                Use a exclusão apenas para cadastros indevidos. Uma data passada não significa cancelamento: confira o resultado da operação antes de alterar o status.
              </p>

              {erroExclusao && (
                <p role="alert" className="mt-4 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm leading-7 text-red-200">
                  {erroExclusao}
                </p>
              )}

              {bloqueioExclusao && idSelecionado != null && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Link href={`/reservas/editar/${idURL}`} className={buttonClass}>
                    Editar reserva
                  </Link>
                  {bloqueioExclusao === 'voucher' && (
                    <Link href={`/vouchers?reserva_id=${idURL}`} className={buttonClass}>
                      Consultar vouchers
                    </Link>
                  )}
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
                <button type="button" disabled={excluindo} onClick={fecharModal} className={buttonClass}>
                  Voltar
                </button>
                {!bloqueioExclusao && (
                  <button
                    type="button"
                    disabled={excluindo}
                    onClick={() => void executarExclusao()}
                    className={`${buttonClass} border-red-400/30 bg-red-400/10 text-red-200`}
                  >
                    {excluindo ? 'Excluindo…' : 'Excluir permanentemente'}
                  </button>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
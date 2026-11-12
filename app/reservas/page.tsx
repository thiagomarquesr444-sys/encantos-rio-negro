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
import { useAoVivoEDA } from '@/lib/aoVivoEDA';
import GraficosReservas from '@/app/components/GraficosReservas';
import { SeletorPeriodoMensalERN } from '@/app/components/PeriodoMensalERN';
import { HISTORICO_ERN, dataNoPeriodoERN, periodoDaURLERN, type PeriodoMensalERN } from '@/lib/periodoMensalERN';
import {
  BuscaEDA,
  CabecalhoEDA,
  ChipsEDA,
  DadoEDA,
  PaginaEDA,
  PainelLateralEDA,
  PillEDA,
  VazioEDA,
  type TomEDA,
} from '@/app/components/PadraoPaginaEDA';
import { ResumoChegadaEDA } from '@/app/components/ChegadaReservaEDA';
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

const TOM_STATUS: Record<StatusReserva, TomEDA> = {
  Pendente: 'at',
  Confirmada: 'ok',
  Cancelada: 'er',
  Concluída: 'info',
  'Não compareceu': 'at',
  Desconhecido: 'nt',
};

function StatusBadge({ status }: { status: StatusReserva }) {
  return <PillEDA tom={TOM_STATUS[status]}>{status}</PillEDA>;
}

type PagamentoReserva = { total: number; recebido: number; pendente: number; lancamentos: number };

type VinculoReservaEDA = { passeio: string | null; saida_inicio: string | null; saida_horario: string | null; demanda_id: string | null; demanda_titulo: string | null; demanda_status: string | null };

function VinculosDaReserva({ v, detalhado = false }: { v?: VinculoReservaEDA; detalhado?: boolean }) {
  if (!v) return null;
  const dia = (d: string | null) => (d ? d.split('-').reverse().slice(0, 2).join('/') : '');
  return (
    <span className="eda-res-vinculos">
      <span>
        <i aria-hidden="true">⛵</i> {v.passeio ?? 'Sem passeio'}
        {v.saida_inicio ? ` · saída ${dia(v.saida_inicio)}${v.saida_horario ? ` ${v.saida_horario.slice(0, 5)}` : ''}` : ''}
      </span>
      {v.demanda_id ? (
        detalhado
          ? <Link href={`/demandas/editar/${v.demanda_id}`}><i aria-hidden="true">📦</i> Demanda: {v.demanda_titulo}</Link>
          : <span><i aria-hidden="true">📦</i> Demanda: {v.demanda_titulo}</span>
      ) : (
        <span className="eda-res-sem-demanda"><i aria-hidden="true">📦</i> Sem demanda{v.saida_inicio ? ' para esta saída' : ''}</span>
      )}
    </span>
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
  // ERN_PERIODO_MENSAL_V1: abre no mês atual; alertas do painel usam o próprio intervalo.
  const [periodo, setPeriodo] = useState<PeriodoMensalERN>(() =>
    alertaOperacional ? HISTORICO_ERN : periodoDaURLERN(urlOperacional.get('mes'))
  );
  const inicioOperacional = urlOperacional.get('inicio') ?? '';
  const fimOperacional = urlOperacional.get('fim') ?? '';

  const filtroOperacionalValido =
    Object.prototype.hasOwnProperty.call(nomesAlertas, alertaOperacional) &&
    dataValida(inicioOperacional) &&
    dataValida(fimOperacional) &&
    inicioOperacional <= fimOperacional;

  const [reservas, setReservas] = useState<Reserva[]>([]);
  // EDA_RESERVA_VINCULOS_V1: passeio, saída e demanda de cada reserva, numa consulta só.
  const [vinculos, setVinculos] = useState<Record<string, VinculoReservaEDA>>({});
  useEffect(() => {
    const ids = reservas.map((r) => String(r.id ?? '')).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    if (!ids.length) return;
    let ativo = true;
    void (async () => {
      const mapa: Record<string, VinculoReservaEDA> = {};
      for (let i = 0; i < ids.length; i += 100) {
        const { data } = await supabase.rpc('vinculos_reservas_eda', { p_ids: ids.slice(i, i + 100) });
        if (!ativo || !Array.isArray(data)) return;
        for (const v of data as (VinculoReservaEDA & { reserva_id: string })[]) mapa[v.reserva_id] = v;
      }
      if (ativo) setVinculos(mapa);
    })();
    return () => { ativo = false; };
  }, [reservas]);
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
  // EDA_FASE_B_V1: atalho para os pedidos que chegam da Iara.
  const [pedidosPortal, setPedidosPortal] = useState(0);
  useEffect(() => {
    let ativo = true;
    supabase.from('pedidos_visitante').select('id', { count: 'exact', head: true }).in('status', ['novo', 'em_contato'])
      .then(({ count, error }) => { if (ativo && !error) setPedidosPortal(count ?? 0); });
    return () => { ativo = false; };
  }, []);
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

  const carregarReservas = useCallback(async (silencioso = false) => {
    const versao = ++versaoConsulta.current;

    if (!silencioso) setLoading(true);
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

  // EDA_AO_VIVO_V1
  useAoVivoEDA(['reservas', 'demandas', 'passeio_saidas', 'financeiro', 'reserva_participantes'], () => void carregarReservas(true));

  useEffect(() => {
    if (!sucesso) return;
    const timer = window.setTimeout(() => setSucesso(''), 4000);
    return () => window.clearTimeout(timer);
  }, [sucesso]);

  const reservasDoDashboard = useMemo(() => {
    if (!alertaOperacional) {
      return reservas.filter((reserva) => dataNoPeriodoERN(reserva.dataOriginal, periodo));
    }
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
    periodo,
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


  // ERN_PADRAO_PAGINAS_EDA_V1: pagamento da reserva aberta no painel lateral.
  const [pagamento, setPagamento] = useState<PagamentoReserva | null>(null);
  const [erroPagamento, setErroPagamento] = useState('');
  const idAberto = modal?.reserva.id;

  useEffect(() => {
    setPagamento(null);
    setErroPagamento('');
    if (idAberto == null) return;
    let ativo = true;

    void (async () => {
      try {
        const empresaId = await obterEmpresa();
        const { data, error } = await supabase
          .from('financeiro')
          .select('tipo,status,valor')
          .eq('empresa_id', empresaId)
          .eq('reserva_id', String(idAberto))
          .limit(500);
        if (error) throw error;
        if (!ativo) return;
        const resumo: PagamentoReserva = { total: 0, recebido: 0, pendente: 0, lancamentos: 0 };
        for (const item of data ?? []) {
          if (String(item.tipo ?? '').trim().toLowerCase() !== 'receita') continue;
          const valor = normalizarValor(item.valor);
          if (valor <= 0) continue;
          const status = String(item.status ?? '').trim().toLowerCase();
          resumo.lancamentos += 1;
          resumo.total += valor;
          if (status === 'recebido') resumo.recebido += valor;
          else if (status === 'pendente') resumo.pendente += valor;
        }
        setPagamento(resumo);
      } catch {
        if (ativo) setErroPagamento('Não foi possível consultar os recebimentos desta reserva.');
      }
    })();

    return () => { ativo = false; };
  }, [idAberto]);

  const contagem = (status: StatusReserva) =>
    reservasDoDashboard.filter((reserva) => reserva.status === status).length;

  const opcoesStatus: { valor: '' | StatusReserva; rotulo: string; qtd: number }[] = [
    { valor: '', rotulo: 'Todas', qtd: reservasDoDashboard.length },
    { valor: 'Confirmada', rotulo: 'Confirmadas', qtd: confirmadas.length },
    { valor: 'Pendente', rotulo: 'Pendentes', qtd: pendentes.length },
    { valor: 'Concluída', rotulo: 'Concluídas', qtd: contagem('Concluída') },
    { valor: 'Cancelada', rotulo: 'Canceladas', qtd: canceladas.length },
    ...(contagem('Não compareceu') ? [{ valor: 'Não compareceu' as const, rotulo: 'Não compareceu', qtd: contagem('Não compareceu') }] : []),
    ...(contagem('Desconhecido') ? [{ valor: 'Desconhecido' as const, rotulo: 'Sem status', qtd: contagem('Desconhecido') }] : []),
  ];

  const selecionada = modal?.reserva;
  const idSelecionado = selecionada?.id;
  const idURL = idSelecionado == null
    ? ''
    : encodeURIComponent(String(idSelecionado));

  const resumoCabecalho = loading
    ? 'Carregando reservas…'
    : erroConsulta
      ? 'Listagem indisponível no momento.'
      : <><b>{reservasDoDashboard.length}</b> {reservasDoDashboard.length === 1 ? 'reserva' : 'reservas'} no recorte · <b>{formatarMoeda(valorConfirmado)}</b> em reservas confirmadas</>;

  return (
    <PaginaEDA>
      {sucesso && <div role="status" className="eda-pg-toast">{sucesso}</div>}

      <div className="eda-pg-miolo">
        <CabecalhoEDA
          capa
          etiqueta="Operação"
          titulo="Reservas"
          resumo={resumoCabecalho}
          acoes={<>
            <button type="button" disabled={loading || excluindo} onClick={() => void carregarReservas()} className="eda-pg-bt">
              {loading ? 'Atualizando…' : 'Atualizar'}
            </button>
            <button type="button" disabled={loading || Boolean(erroConsulta)} onClick={exportarRelatorio} className="eda-pg-bt">
              Exportar CSV
            </button>
            <Link href="/reservas/pos-venda" className="eda-pg-bt">Pós-venda</Link>
            <Link href="/reservas/pedidos" className="eda-pg-bt">
              Pedidos do portal{pedidosPortal ? <span className="eda-pg-num" style={{ marginLeft: 6 }}>{pedidosPortal}</span> : null}
            </Link>
            <Link href="/reservas/nova" className="eda-pg-bt eda-pg-bt-ouro">+ Nova reserva</Link>
          </>}
        />

        {erroConsulta && (
          <div role="alert" className="eda-pg-aviso eda-pg-aviso-er">
            <p style={{ margin: 0 }}>{erroConsulta}</p>
            <button type="button" disabled={loading} onClick={() => void carregarReservas()} className="eda-pg-bt eda-pg-bt-p" style={{ marginTop: 10 }}>
              Tentar novamente
            </button>
          </div>
        )}

        {erroExportacao && <p role="alert" className="eda-pg-aviso eda-pg-aviso-at">{erroExportacao}</p>}

        {alertaOperacional && (
          <div className="eda-pg-aviso eda-pg-aviso-ouro">
            <div>
              <b>
                {filtroOperacionalValido
                  ? `Filtro do painel: ${nomesAlertas[alertaOperacional]}`
                  : 'O link contém um filtro operacional inválido.'}
              </b>
              {filtroOperacionalValido && (
                <p>{formatarData(inicioOperacional)} até {formatarData(fimOperacional)} · reservas canceladas ficam fora deste recorte.</p>
              )}
            </div>
            <Link href="/reservas" className="eda-pg-bt eda-pg-bt-p">Ver todas as reservas</Link>
          </div>
        )}

        {!alertaOperacional && (
          <SeletorPeriodoMensalERN valor={periodo} aoMudar={setPeriodo} rotulo="Período das reservas (data da reserva)" total={reservasDoDashboard.length} />
        )}

        <section aria-label="Filtros das reservas" className="eda-pg-filtros">
          <BuscaEDA id="reserva-busca" rotulo="Buscar reservas" valor={busca} aoMudar={setBusca} placeholder="Cliente, passeio, agência ou guia" />
          <ChipsEDA rotulo="Filtrar por status" opcoes={opcoesStatus} valor={filtroStatus} aoMudar={setFiltroStatus} />
        </section>

        <section aria-busy={loading} aria-label="Lista de reservas" className="eda-pg-tabela-caixa">
          <div className="eda-pg-tabela-topo">
            <span>
              {loading || erroConsulta
                ? '—'
                : <>Mostrando <b>{reservasFiltradas.length}</b> de {reservasDoDashboard.length} no recorte · {reservas.length} no histórico</>}
            </span>
            <span>Clique numa reserva para ver o resumo</span>
          </div>

          {loading ? (
            <p role="status" className="eda-pg-estado">Carregando reservas…</p>
          ) : erroConsulta ? (
            <p className="eda-pg-estado">A listagem está indisponível. Atualize os dados.</p>
          ) : reservasFiltradas.length === 0 ? (
            reservas.length === 0 ? (
              <VazioEDA
                titulo="Nenhuma reserva ainda"
                texto="Registre a primeira reserva para acompanhar saídas, pagamentos e vouchers por aqui."
                acao={<Link href="/reservas/nova" className="eda-pg-bt eda-pg-bt-ouro">+ Nova reserva</Link>}
              />
            ) : (
              <VazioEDA
                titulo="Nenhuma reserva encontrada"
                texto="Ajuste a busca ou o status para ver outras reservas."
                acao={<button type="button" className="eda-pg-bt" onClick={() => { setBusca(''); setFiltroStatus(''); }}>Limpar filtros</button>}
              />
            )
          ) : (
            <>
              <div className="eda-pg-cartoes">
                {reservasFiltradas.map((reserva, index) => (
                  <button
                    key={reserva.id ?? index}
                    type="button"
                    className="eda-pg-cartao"
                    disabled={excluindo}
                    onClick={() => abrirModal('detalhes', reserva)}
                  >
                    <span className="eda-pg-cartao-topo">
                      <span style={{ minWidth: 0 }}>
                        <b>{reserva.cliente}</b>
                        <small>{reserva.pacote}</small>
                        <VinculosDaReserva v={vinculos[String(reserva.id)]} />
                      </span>
                      <strong className="eda-pg-num">{formatarMoeda(reserva.valor)}</strong>
                    </span>
                    <span className="eda-pg-cartao-info">
                      <span>{reserva.data}{reserva.horario ? ` · ${reserva.horario.slice(0, 5)}` : ''}</span>
                      <span>{formatarQuantidadePessoas(reserva.quantidade_pessoas)} {reserva.quantidade_pessoas === 1 ? 'pessoa' : 'pessoas'}</span>
                      <span>Guia: {reserva.guia}</span>
                    </span>
                    <span className="eda-pg-cartao-pills">
                      <StatusBadge status={reserva.status} />
                      <SituacaoPeriodoReservaERN
                        status={reserva.statusOriginal ?? reserva.status}
                        inicio={reserva.dataOriginal}
                        fim={reserva.data_fim_prevista}
                        horarioFim={reserva.horario_fim_previsto}
                        referencia={referenciaPeriodoERN}
                      />
                    </span>
                  </button>
                ))}
              </div>

              <div className="eda-pg-rolagem">
                <table className="eda-pg-tabela">
                  <thead>
                    <tr>
                      {['Cliente / Passeio', 'Data', 'Pessoas', 'Agência', 'Guia', 'Valor', 'Status', ''].map((titulo, i) => (
                        <th key={titulo || i} scope="col">{titulo || <span className="eda-pg-sr">Ações</span>}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reservasFiltradas.map((reserva, index) => (
                      <tr key={reserva.id ?? index} aria-selected={selecionada?.id === reserva.id && reserva.id != null}>
                        <td style={{ minWidth: 220 }}>
                          <button type="button" className="eda-pg-linha-bt" disabled={excluindo} onClick={() => abrirModal('detalhes', reserva)}>
                            <b>{reserva.cliente}</b>
                            <small>{reserva.pacote}</small>
                            <VinculosDaReserva v={vinculos[String(reserva.id)]} />
                          </button>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {reserva.data}
                          <small>{reserva.horario?.slice(0, 5) || 'Sem horário'}</small>
                        </td>
                        <td>{formatarQuantidadePessoas(reserva.quantidade_pessoas)}</td>
                        <td className="eda-pg-mut">{reserva.agencia}</td>
                        <td className={reserva.guiaInformado ? 'eda-pg-mut' : ''}>
                          {reserva.guiaInformado ? reserva.guia : <PillEDA tom="er">Sem guia</PillEDA>}
                        </td>
                        <td className="eda-pg-num">{formatarMoeda(reserva.valor)}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                            <StatusBadge status={reserva.status} />
                            <SituacaoPeriodoReservaERN
                              status={reserva.statusOriginal ?? reserva.status}
                              inicio={reserva.dataOriginal}
                              fim={reserva.data_fim_prevista}
                              horarioFim={reserva.horario_fim_previsto}
                              referencia={referenciaPeriodoERN}
                            />
                          </div>
                        </td>
                        <td>
                          <div className="eda-pg-acoes-linha">
                            <button type="button" className="eda-pg-bt eda-pg-bt-p" disabled={excluindo} onClick={() => abrirModal('detalhes', reserva)}>Ver</button>
                            {reserva.id != null && (
                              <Link href={`/reservas/editar/${encodeURIComponent(String(reserva.id))}`} className="eda-pg-bt eda-pg-bt-p">
                                {reservaEncerradaERN(reserva.status) ? 'Consultar' : 'Gerenciar'}
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {!erroConsulta && (
          <details className="eda-pg-analises">
            <summary>Análises das reservas</summary>
            <div>
              <GraficosReservas reservas={reservasDoDashboard} carregando={loading} />
            </div>
          </details>
        )}
      </div>

      {modal && selecionada && (
        <PainelLateralEDA
          etiqueta={modal.tipo === 'excluir' ? 'Excluir reserva' : 'Reserva'}
          titulo={modal.tipo === 'excluir' ? 'Excluir esta reserva?' : selecionada.pacote}
          subtitulo={`${selecionada.cliente} · ${selecionada.data}${selecionada.horario ? ` às ${selecionada.horario.slice(0, 5)}` : ''}`}
          bloqueado={excluindo}
          aoFechar={fecharModal}
          rodape={modal.tipo === 'detalhes' ? (
            <>
              {idSelecionado != null && (
                <Link href={`/reservas/editar/${idURL}`} className="eda-pg-bt eda-pg-bt-ouro">
                  {reservaEncerradaERN(selecionada.status) ? 'Consultar reserva' : 'Gerenciar reserva'}
                </Link>
              )}
              <button
                type="button"
                className="eda-pg-bt eda-pg-bt-perigo"
                disabled={excluindo || idSelecionado == null || reservaEncerradaERN(selecionada.status)}
                onClick={() => abrirModal('excluir', selecionada)}
              >
                Excluir
              </button>
            </>
          ) : (
            <>
              <button type="button" disabled={excluindo} onClick={() => abrirModal('detalhes', selecionada)} className="eda-pg-bt">Voltar</button>
              {!bloqueioExclusao && (
                <button type="button" disabled={excluindo} onClick={() => void executarExclusao()} className="eda-pg-bt eda-pg-bt-perigo">
                  {excluindo ? 'Excluindo…' : 'Excluir permanentemente'}
                </button>
              )}
            </>
          )}
        >
          {modal.tipo === 'detalhes' ? (
            <>
              <div className="eda-pg-pills" style={{ marginTop: 0 }}>
                <StatusBadge status={selecionada.status} />
                {pagamento && pagamento.pendente > 0 && <PillEDA tom="at">Pagamento pendente</PillEDA>}
                {pagamento && pagamento.lancamentos > 0 && pagamento.pendente === 0 && <PillEDA tom="ok">Pago</PillEDA>}
                {!selecionada.guiaInformado && <PillEDA tom="er">Sem guia</PillEDA>}
              </div>

              <div className="eda-pg-bloco" style={{ marginTop: 16 }}>
                <p className="eda-pg-bloco-titulo">Passeio e demanda</p>
                <VinculosDaReserva v={vinculos[String(selecionada.id)]} detalhado />
              </div>

              <div className="eda-pg-bloco" style={{ marginTop: 16 }}>
                <p className="eda-pg-bloco-titulo">Pagamento</p>
                <div className="eda-pg-linha-valor"><span>Valor da reserva</span><b>{formatarMoeda(selecionada.valor)}</b></div>
                {erroPagamento ? (
                  <p className="eda-pg-texto-mut" style={{ marginTop: 8 }}>{erroPagamento}</p>
                ) : !pagamento ? (
                  <p className="eda-pg-texto-mut" style={{ marginTop: 8 }}>Consultando recebimentos…</p>
                ) : pagamento.lancamentos === 0 ? (
                  <p className="eda-pg-texto-mut" style={{ marginTop: 8 }}>Nenhum recebimento lançado para esta reserva.</p>
                ) : (
                  <>
                    <div className="eda-pg-trilho" role="img" aria-label={`Recebido ${formatarMoeda(pagamento.recebido)} de ${formatarMoeda(pagamento.total)}`}>
                      <div style={{ width: `${pagamento.total > 0 ? Math.min(100, (pagamento.recebido / pagamento.total) * 100) : 0}%` }} />
                    </div>
                    <div className="eda-pg-linha-valor"><span>Recebido</span><b style={{ color: 'var(--p-verde)' }}>{formatarMoeda(pagamento.recebido)}</b></div>
                    <div className="eda-pg-linha-valor"><span>A receber</span><b style={{ color: pagamento.pendente > 0 ? 'var(--p-amar)' : undefined }}>{formatarMoeda(pagamento.pendente)}</b></div>
                  </>
                )}
              </div>

              {idSelecionado != null && <ResumoChegadaEDA reservaId={String(idSelecionado)} linkEditar={`/reservas/editar/${idURL}`} />}

              <div className="eda-pg-bloco">
                <p className="eda-pg-bloco-titulo">Operação</p>
                <SituacaoPeriodoReservaERN
                  status={selecionada.statusOriginal ?? selecionada.status}
                  inicio={selecionada.dataOriginal}
                  fim={selecionada.data_fim_prevista}
                  horarioFim={selecionada.horario_fim_previsto}
                  referencia={referenciaPeriodoERN}
                  detalhado
                />
                <dl className="eda-pg-dados" style={{ marginTop: 12 }}>
                  <DadoEDA rotulo="Pessoas">{formatarQuantidadePessoas(selecionada.quantidade_pessoas)}</DadoEDA>
                  <DadoEDA rotulo="Horário">{selecionada.horario?.slice(0, 5) || 'Não informado'}</DadoEDA>
                  <DadoEDA rotulo="Término previsto">{selecionada.data_fim_prevista ? formatarData(selecionada.data_fim_prevista) : 'Não informado'}</DadoEDA>
                  <DadoEDA rotulo="Horário de término">{selecionada.horario_fim_previsto?.slice(0, 5) || 'Não informado'}</DadoEDA>
                  <DadoEDA rotulo="Guia">{selecionada.guia}</DadoEDA>
                  <DadoEDA rotulo="Embarcação">{selecionada.embarcacao_id ? 'Vinculada' : 'Não vinculada'}</DadoEDA>
                  <DadoEDA rotulo="Agência / Parceiro" largo>{selecionada.agencia}</DadoEDA>
                  <DadoEDA rotulo="Observações" largo>{selecionada.observacoes || 'Nenhuma observação registrada.'}</DadoEDA>
                </dl>
              </div>

              {idSelecionado != null && (
                <div className="eda-pg-bloco">
                  <p className="eda-pg-bloco-titulo">Atalhos</p>
                  <div className="eda-pg-atalhos">
                    {reservaOperacionalERN(selecionada.status) && (
                      <Link href={`/vouchers/novo?reserva_id=${idURL}`} className="eda-pg-bt eda-pg-bt-p">Emitir voucher</Link>
                    )}
                    <Link href={`/vouchers?reserva_id=${idURL}`} className="eda-pg-bt eda-pg-bt-p">Vouchers</Link>
                    <Link href={`/financeiro/receita/novo?reserva_id=${idURL}`} className="eda-pg-bt eda-pg-bt-p">Registrar receita</Link>
                    <Link href={`/financeiro?reserva_id=${idURL}`} className="eda-pg-bt eda-pg-bt-p">Ver financeiro</Link>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="eda-pg-texto-mut">
                A reserva de <b style={{ color: 'var(--p-texto)' }}>{selecionada.cliente}</b>, para <b style={{ color: 'var(--p-texto)' }}>{selecionada.pacote}</b>, será removida permanentemente.
              </p>
              <p className="eda-pg-texto-mut" style={{ marginTop: 12 }}>
                Reservas com vouchers ou lançamentos financeiros vinculados têm a exclusão bloqueada. Use a exclusão apenas para cadastros indevidos. Uma data passada não significa cancelamento: confira o resultado da operação antes de alterar o status.
              </p>
              {erroExclusao && <p role="alert" className="eda-pg-aviso eda-pg-aviso-er">{erroExclusao}</p>}
              {bloqueioExclusao && idSelecionado != null && (
                <div className="eda-pg-atalhos" style={{ marginTop: 14 }}>
                  <Link href={`/reservas/editar/${idURL}`} className="eda-pg-bt eda-pg-bt-p">Gerenciar reserva</Link>
                  {bloqueioExclusao === 'voucher' && (
                    <Link href={`/vouchers?reserva_id=${idURL}`} className="eda-pg-bt eda-pg-bt-p">Consultar vouchers</Link>
                  )}
                </div>
              )}
            </>
          )}
        </PainelLateralEDA>
      )}
    </PaginaEDA>
  );
}

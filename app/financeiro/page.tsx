'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  consultarFinanceiroERN,
  filtrarFinanceiroERN,
  periodoFinanceiroERN,
  statusFinanceiroERN,
  type FiltroPeriodoFinanceiroERN,
  type RegistroFinanceiroERN,
} from '@/lib/financeiroConsultaERN';
import GraficosFinanceiros from '@/app/components/GraficosFinanceiros';

type LancamentoFinanceiro = RegistroFinanceiroERN & {
  user_id?: string | null;
  created_at?: string | null;
};

type TipoLancamento = 'receita' | 'despesa';

const FILTROS: {
  chave: FiltroPeriodoFinanceiroERN;
  label: string;
}[] = [
  { chave: 'mes_atual', label: 'Mês atual' },
  { chave: 'todos', label: 'Histórico' },
  { chave: 'receitas', label: 'Receitas' },
  { chave: 'despesas', label: 'Despesas' },
  { chave: 'pendentes', label: 'Pendentes' },
  { chave: 'com_reserva', label: 'Com reserva' },
];

const inputClass =
  'min-h-12 w-full min-w-0 rounded-xl border border-white/15 bg-[#07110E] px-4 py-3 text-sm text-[#EDEDE3] outline-none transition placeholder:text-[#EDEDE3]/45 focus:border-[#E3A144] disabled:opacity-60';

const labelClass =
  'mb-2 block text-sm font-medium text-[#C5D4CA]';

const buttonClass =
  'inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-[#D6E2D9] transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50';

const headingStyle = {
  fontFamily: 'var(--font-fraunces), serif',
};

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function obterTipo(
  item: LancamentoFinanceiro
): TipoLancamento | null {
  const tipo = normalizar(item.tipo ?? '');
  return tipo === 'receita' || tipo === 'despesa'
    ? tipo
    : null;
}

function obterDescricao(item: LancamentoFinanceiro): string {
  return item.descricao || item.descrição || '';
}

function converterValor(entrada: unknown): number {
  if (typeof entrada === 'number') {
    return Number.isFinite(entrada) ? entrada : NaN;
  }

  if (typeof entrada !== 'string') return NaN;

  let valor = entrada
    .trim()
    .replace(/^R\$\s*/i, '')
    .replace(/\s/g, '');

  if (!valor) return NaN;

  if (valor.includes(',')) {
    if (!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(valor)) {
      return NaN;
    }
    valor = valor.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(?:\.\d{3})+$/.test(valor)) {
    valor = valor.replace(/\./g, '');
  } else if (!/^-?\d+(?:\.\d{1,2})?$/.test(valor)) {
    return NaN;
  }

  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : NaN;
}

function obterValor(item: LancamentoFinanceiro): number {
  const valor = converterValor(item.valor ?? item.Valor);
  return Number.isFinite(valor) ? valor : 0;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
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
  if (!dataValida(data)) return 'Data inválida';

  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
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

function tipoClasses(tipo: TipoLancamento | null): string {
  if (tipo === 'receita') {
    return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300';
  }
  if (tipo === 'despesa') {
    return 'border-red-400/25 bg-red-400/10 text-red-300';
  }
  return 'border-white/20 bg-white/5 text-[#D6E2D9]';
}

function statusClasses(status: string): string {
  return status === 'Pendente'
    ? 'border-amber-400/25 bg-amber-400/10 text-amber-300'
    : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300';
}

function rotuloTipo(tipo: TipoLancamento | null): string {
  return tipo === 'receita'
    ? 'Receita'
    : tipo === 'despesa'
      ? 'Despesa'
      : 'Tipo inválido';
}

function mensagemErro(erro: unknown, padrao: string): string {
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

function Modal({
  titulo,
  aoFechar,
  bloqueado = false,
  children,
}: {
  titulo: string;
  aoFechar: () => void;
  bloqueado?: boolean;
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

    const seletor =
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';

    function teclado(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!bloqueadoRef.current) fecharRef.current();
      }

      if (event.key !== 'Tab' || !container.current) return;

      const elementos = Array.from(
        container.current.querySelectorAll<HTMLElement>(seletor)
      ).filter((elemento) => elemento.getClientRects().length > 0);

      const primeiro = elementos[0];
      const ultimo = elementos[elementos.length - 1];

      if (!primeiro || !ultimo) {
        event.preventDefault();
        container.current.focus();
        return;
      }

      if (event.shiftKey) {
        if (
          document.activeElement === primeiro ||
          document.activeElement === container.current
        ) {
          event.preventDefault();
          ultimo.focus();
        }
      } else if (
        document.activeElement === ultimo ||
        document.activeElement === container.current
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
        className="max-h-[90dvh] w-full max-w-[680px] overflow-y-auto rounded-2xl border border-white/15 bg-[#091510] shadow-2xl outline-none"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <h2
            id={tituloId}
            className="text-2xl text-[#F0F0E8]"
            style={headingStyle}
          >
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

export default function FinanceiroPage() {
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroConsulta, setErroConsulta] = useState<string | null>(null);
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const [filtroPeriodo, setFiltroPeriodo] =
    useState<FiltroPeriodoFinanceiroERN>('mes_atual');
  const [busca, setBusca] = useState('');
  const [reservaFiltro, setReservaFiltro] = useState('');

  const [itemVisualizar, setItemVisualizar] =
    useState<LancamentoFinanceiro | null>(null);
  const [itemEditar, setItemEditar] =
    useState<LancamentoFinanceiro | null>(null);
  const [itemExcluir, setItemExcluir] =
    useState<LancamentoFinanceiro | null>(null);
  const [valorEdicao, setValorEdicao] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const mutacaoEmAndamento = useRef(false);
  const versaoConsulta = useRef(0);
  const ocupado = salvandoEdicao || excluindo;

  const carregarFinanceiro = useCallback(async () => {
    const versao = ++versaoConsulta.current;
    setCarregando(true);
    setErroConsulta(null);

    try {
      const dados = await consultarFinanceiroERN<LancamentoFinanceiro>();
      if (versao !== versaoConsulta.current) return;
      setLancamentos(dados);
    } catch (erro) {
      if (versao !== versaoConsulta.current) return;
      setLancamentos([]);
      setErroConsulta(
        mensagemErro(erro, 'Não foi possível carregar os lançamentos.')
      );
    } finally {
      if (versao === versaoConsulta.current) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    const reserva = parametros.get('reserva_id') ?? '';

    setReservaFiltro(reserva);

    if (parametros.has('periodo')) {
      setFiltroPeriodo(periodoFinanceiroERN(parametros.get('periodo')));
    } else if (reserva) {
      setFiltroPeriodo('todos');
    }

    setBusca(parametros.get('busca') ?? '');
    void carregarFinanceiro();

    return () => {
      versaoConsulta.current += 1;
    };
  }, [carregarFinanceiro]);

  useEffect(() => {
    if (!mensagemSucesso) return;
    const timer = window.setTimeout(() => setMensagemSucesso(null), 4000);
    return () => window.clearTimeout(timer);
  }, [mensagemSucesso]);

  const financeiro = useMemo(() => {
    let recebido = 0;
    let pago = 0;
    let receber = 0;
    let pagar = 0;

    for (const item of lancamentos) {
      const tipo = obterTipo(item);
      const status = statusFinanceiroERN(item);
      const valor = obterValor(item);

      if (tipo === 'receita') {
        if (status === 'Recebido') recebido += valor;
        else receber += valor;
      } else if (tipo === 'despesa') {
        if (status === 'Pago') pago += valor;
        else pagar += valor;
      }
    }

    return { recebido, pago, receber, pagar, saldo: recebido - pago };
  }, [lancamentos]);

  const lancamentosFiltrados = useMemo(
    () =>
      filtrarFinanceiroERN(
        lancamentos,
        filtroPeriodo,
        busca,
        reservaFiltro
      ),
    [lancamentos, filtroPeriodo, busca, reservaFiltro]
  );

  const parametrosExportacao = new URLSearchParams({
    periodo: filtroPeriodo,
    busca,
  });

  if (reservaFiltro) {
    parametrosExportacao.set('reserva_id', reservaFiltro);
  }

  const linkExportacao =
    `/financeiro/exportar?${parametrosExportacao.toString()}`;

  const cards = [
    { titulo: 'Receitas recebidas', valor: financeiro.recebido, detalhe: 'Entradas realizadas' },
    { titulo: 'Despesas pagas', valor: financeiro.pago, detalhe: 'Saídas realizadas' },
    { titulo: 'Saldo realizado', valor: financeiro.saldo, detalhe: 'Recebido menos pago' },
    { titulo: 'A receber', valor: financeiro.receber, detalhe: 'Receitas pendentes' },
    { titulo: 'A pagar', valor: financeiro.pagar, detalhe: 'Despesas pendentes' },
  ];

  function abrirEdicao(item: LancamentoFinanceiro) {
    if (mutacaoEmAndamento.current) return;

    setErroModal(null);
    setItemEditar({
      ...item,
      descricao: obterDescricao(item),
      status: statusFinanceiroERN(item),
      data_vencimento: apenasData(item.data_vencimento),
      data_liquidacao: apenasData(item.data_liquidacao) || null,
    });

    setValorEdicao(
      obterValor(item).toLocaleString('pt-BR', {
        useGrouping: false,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  async function salvarEdicao(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!itemEditar?.id || mutacaoEmAndamento.current) return;

    setErroModal(null);

    const descricao = obterDescricao(itemEditar).trim();
    const valor = converterValor(valorEdicao);
    const tipo = obterTipo(itemEditar);
    const vencimento = apenasData(itemEditar.data_vencimento);
    const status = statusFinanceiroERN(itemEditar);
    const liquidacao =
      status === 'Pendente'
        ? null
        : apenasData(itemEditar.data_liquidacao) || null;

    if (!descricao) {
      setErroModal('Informe a descrição do lançamento.');
      return;
    }

    if (
      !Number.isFinite(valor) ||
      valor <= 0 ||
      !Number.isSafeInteger(Math.round(valor * 100))
    ) {
      setErroModal('Informe um valor válido maior que zero, com até duas casas decimais.');
      return;
    }

    if (!tipo) {
      setErroModal('Este lançamento tem um tipo inválido e precisa ser revisado.');
      return;
    }

    if (!dataValida(vencimento)) {
      setErroModal('Informe uma data de vencimento válida.');
      return;
    }

    if (
      status !== 'Pendente' &&
      (!liquidacao || !dataValida(liquidacao))
    ) {
      setErroModal('Informe a data efetiva do recebimento ou pagamento.');
      return;
    }

    if (liquidacao && liquidacao > hojeManaus()) {
      setErroModal('A data de um recebimento ou pagamento realizado não pode ser futura.');
      return;
    }

    const id = itemEditar.id;
    const empresaId = itemEditar.empresa_id;

    if (!empresaId) {
      setErroModal('Não foi possível identificar a empresa deste lançamento. Atualize a lista.');
      return;
    }

    mutacaoEmAndamento.current = true;
    setSalvandoEdicao(true);

    try {
      const { data, error } = await supabase
        .from('financeiro')
        .update({
          descricao,
          valor,
          categoria: itemEditar.categoria?.trim() || null,
          data_vencimento: vencimento,
          data_liquidacao: liquidacao,
          status,
          tipo,
        })
        .eq('id', id)
        .eq('empresa_id', empresaId)
        .select('id')
        .single();

      if (error) throw error;
      if (!data?.id) {
        throw new Error('Não foi possível confirmar a atualização. Atualize a lista.');
      }

      setItemEditar(null);
      setMensagemSucesso('Lançamento atualizado com sucesso.');
      await carregarFinanceiro();
    } catch (erro) {
      setErroModal(mensagemErro(erro, 'Não foi possível atualizar o lançamento.'));
    } finally {
      mutacaoEmAndamento.current = false;
      setSalvandoEdicao(false);
    }
  }

  async function confirmarExclusao() {
    if (!itemExcluir?.id || mutacaoEmAndamento.current) return;

    const id = itemExcluir.id;
    const empresaId = itemExcluir.empresa_id;

    if (!empresaId) {
      setErroModal('Não foi possível identificar a empresa deste lançamento. Atualize a lista.');
      return;
    }

    mutacaoEmAndamento.current = true;
    setExcluindo(true);
    setErroModal(null);

    try {
      const { data, error } = await supabase
        .from('financeiro')
        .delete()
        .eq('id', id)
        .eq('empresa_id', empresaId)
        .select('id')
        .single();

      if (error) throw error;
      if (!data?.id) {
        throw new Error('Não foi possível confirmar a exclusão. Atualize a lista.');
      }

      setLancamentos((atuais) => atuais.filter((item) => item.id !== id));
      setItemExcluir(null);
      setMensagemSucesso('Lançamento excluído com sucesso.');
    } catch (erro) {
      setErroModal(mensagemErro(erro, 'Não foi possível excluir o lançamento.'));
    } finally {
      mutacaoEmAndamento.current = false;
      setExcluindo(false);
    }
  }

  function acoes(item: LancamentoFinanceiro) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={ocupado}
          onClick={() => {
            setErroModal(null);
            setItemVisualizar(item);
          }}
          className={buttonClass}
          aria-label={`Ver ${obterDescricao(item) || 'lançamento'}`}
        >
          Ver
        </button>
        <button
          type="button"
          disabled={ocupado || !item.id}
          onClick={() => abrirEdicao(item)}
          className={buttonClass}
          aria-label={`Editar ${obterDescricao(item) || 'lançamento'}`}
        >
          Editar
        </button>
        <button
          type="button"
          disabled={ocupado || !item.id}
          onClick={() => {
            setErroModal(null);
            setItemExcluir(item);
          }}
          className={`${buttonClass} border-red-400/25 text-red-300`}
          aria-label={`Excluir ${obterDescricao(item) || 'lançamento'}`}
        >
          Excluir
        </button>
      </div>
    );
  }

  function vinculoReserva(item: LancamentoFinanceiro) {
    if (!item.reserva_id) return null;

    return (
      <div className="mt-3 space-y-2 text-xs text-[#F4C77E]">
        <p className="break-all">Reserva: {item.reserva_id}</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="min-h-11 underline underline-offset-4"
            onClick={() => {
              setReservaFiltro(item.reserva_id!);
              setFiltroPeriodo('todos');
              setBusca('');
            }}
          >
            Filtrar esta reserva
          </button>
          <Link
            className="inline-flex min-h-11 items-center underline underline-offset-4"
            href={`/reservas/editar/${encodeURIComponent(item.reserva_id)}`}
          >
            Abrir reserva
          </Link>
        </div>
      </div>
    );
  }

  function etiquetaTipo(item: LancamentoFinanceiro) {
    const tipo = obterTipo(item);
    return (
      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tipoClasses(tipo)}`}>
        {rotuloTipo(tipo)}
      </span>
    );
  }

  function etiquetaStatus(item: LancamentoFinanceiro) {
    const status = statusFinanceiroERN(item);
    return (
      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(status)}`}>
        {status}
      </span>
    );
  }

  function valorFormatado(item: LancamentoFinanceiro) {
    const tipo = obterTipo(item);
    return (
      <span className={`font-semibold tabular-nums ${tipo === 'receita' ? 'text-emerald-300' : tipo === 'despesa' ? 'text-red-300' : 'text-[#EDEDE3]'}`}>
        {tipo === 'receita' ? '+ ' : tipo === 'despesa' ? '− ' : ''}
        {formatarMoeda(obterValor(item))}
      </span>
    );
  }

  const statusEdicao = itemEditar
    ? statusFinanceiroERN(itemEditar)
    : 'Pendente';

  return (
    <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      {mensagemSucesso && (
        <div
          role="status"
          className="fixed left-3 right-3 top-24 z-[90] mx-auto max-w-lg rounded-2xl border border-emerald-400/25 bg-[#0B2119] px-5 py-4 text-sm text-emerald-200 shadow-2xl"
        >
          {mensagemSucesso}
        </div>
      )}

      <section className="border-b border-white/10 bg-[#091510]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
              Financeiro · Controle
            </p>
            <h1 className="mt-3 text-4xl sm:text-5xl" style={headingStyle}>
              Financeiro
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#B4C8BB]">
              Controle entradas, despesas, pendências e o saldo efetivamente realizado.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/financeiro/receita/novo"
              className={`${buttonClass} border-[#E3A144] bg-[#E3A144] font-bold text-[#07130F] hover:bg-[#F0B35C]`}
            >
              + Nova receita
            </Link>
            <Link
              href="/financeiro/despesa/novo"
              className={`${buttonClass} border-red-400/25 text-red-300`}
            >
              − Nova despesa
            </Link>
            <Link href={linkExportacao} className={buttonClass}>
              Exportar
            </Link>
            <button
              type="button"
              disabled={carregando || ocupado}
              onClick={() => void carregarFinanceiro()}
              className={buttonClass}
            >
              {carregando ? 'Atualizando…' : 'Atualizar'}
            </button>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        <p className="mb-5 text-xs leading-6 text-[#B4C8BB]">
          Os filtros selecionam a listagem e a exportação. O filtro Mês atual
          considera o vencimento no calendário de Manaus. Os gráficos possuem
          sua própria seleção de período.
        </p>

        {reservaFiltro && (
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-[#E3A144]/30 p-4 text-sm">
            <span className="min-w-0 break-all">
              Reserva filtrada: {reservaFiltro}
            </span>
            <button
              type="button"
              className={buttonClass}
              onClick={() => setReservaFiltro('')}
            >
              Limpar filtro de reserva
            </button>
          </div>
        )}

        {erroConsulta && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-red-400/25 bg-red-400/10 p-5 text-sm text-red-200"
          >
            <p>{erroConsulta}</p>
            <button
              type="button"
              disabled={carregando || ocupado}
              onClick={() => void carregarFinanceiro()}
              className={`${buttonClass} mt-4`}
            >
              Tentar novamente
            </button>
          </div>
        )}

        <GraficosFinanceiros
          registros={lancamentos}
          carregando={carregando}
          erro={erroConsulta || ''}
          aoAtualizar={carregarFinanceiro}
        />

        <details className="mt-5 rounded-2xl border border-white/10 bg-[#0A1713] p-4 sm:p-5">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-[#F4C77E]">
            Consultar todo o histórico financeiro
          </summary>
          <p className="mb-4 text-xs leading-6 text-[#B4C8BB]">
            Estes totais abrangem todo o histórico acessível à sua conta.
            Não seguem o período dos gráficos nem os filtros da listagem.
            O saldo realizado representa receitas recebidas menos despesas pagas;
            não representa saldo bancário nem lucro.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {cards.map((card) => (
              <div
                key={card.titulo}
                className="min-w-0 rounded-2xl border border-white/10 p-4"
              >
                <p className="text-sm text-[#B4C8BB]">{card.titulo}</p>
                <strong className="mt-3 block break-words text-2xl tabular-nums text-[#F4C77E]">
                  {carregando || erroConsulta ? '—' : formatarMoeda(card.valor)}
                </strong>
                <p className="mt-2 text-xs text-[#B4C8BB]">{card.detalhe}</p>
              </div>
            ))}
          </div>
        </details>

        <section
          aria-label="Filtros dos lançamentos"
          className="mt-6 rounded-2xl border border-white/10 bg-[#0A1713] p-4"
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {FILTROS.map((filtro) => (
                <button
                  key={filtro.chave}
                  type="button"
                  aria-pressed={filtroPeriodo === filtro.chave}
                  onClick={() => setFiltroPeriodo(filtro.chave)}
                  className={`${buttonClass} ${
                    filtroPeriodo === filtro.chave
                      ? 'border-[#E3A144]/50 bg-[#E3A144]/10 text-[#F4C77E]'
                      : ''
                  }`}
                >
                  {filtro.label}
                </button>
              ))}
            </div>
            <div className="w-full xl:max-w-xs">
              <label htmlFor="ern-busca-financeiro" className="sr-only">
                Buscar lançamento
              </label>
              <input
                id="ern-busca-financeiro"
                type="search"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar lançamento…"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section
          aria-busy={carregando}
          className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#0A1713]"
        >
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[#E3A144]">
                Movimentações
              </p>
              <h2 className="mt-2 text-2xl" style={headingStyle}>
                Lançamentos financeiros
              </h2>
            </div>
            <p className="text-sm text-[#B4C8BB]">
              {carregando || erroConsulta
                ? '—'
                : `${lancamentosFiltrados.length} de ${lancamentos.length} registros`}
            </p>
          </div>

          {carregando ? (
            <p role="status" className="p-10 text-center text-sm text-[#B4C8BB]">
              Carregando financeiro…
            </p>
          ) : erroConsulta ? (
            <p className="p-10 text-center text-sm text-red-200">
              A listagem está indisponível. Tente atualizar os dados.
            </p>
          ) : lancamentosFiltrados.length === 0 ? (
            <div className="p-10 text-center">
              <h3 className="text-xl" style={headingStyle}>
                Nenhum lançamento encontrado
              </h3>
              <p className="mt-3 text-sm text-[#B4C8BB]">
                Ajuste os filtros ou registre uma nova movimentação.
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-white/10 lg:hidden">
                {lancamentosFiltrados.map((item, index) => (
                  <article key={item.id || index} className="min-w-0 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {etiquetaTipo(item)}
                      {etiquetaStatus(item)}
                    </div>
                    <h3 className="mt-4 break-words text-base font-semibold">
                      {obterDescricao(item) || 'Sem descrição'}
                    </h3>
                    <p className="mt-2 text-xl">{valorFormatado(item)}</p>
                    <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-[#B4C8BB]">Vencimento</dt>
                        <dd className="mt-1">{formatarData(item.data_vencimento)}</dd>
                      </div>
                      <div>
                        <dt className="text-[#B4C8BB]">
                          {obterTipo(item) === 'receita' ? 'Recebimento' : 'Pagamento'}
                        </dt>
                        <dd className="mt-1">
                          {statusFinanceiroERN(item) === 'Pendente'
                            ? 'Ainda pendente'
                            : formatarData(item.data_liquidacao)}
                        </dd>
                      </div>
                      <div className="col-span-2 min-w-0">
                        <dt className="text-[#B4C8BB]">Categoria</dt>
                        <dd className="mt-1 break-words">{item.categoria || '—'}</dd>
                      </div>
                    </dl>
                    {vinculoReserva(item)}
                    <div className="mt-4 border-t border-white/10 pt-4">
                      {acoes(item)}
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
                  <thead className="border-b border-white/10 text-xs text-[#B4C8BB]">
                    <tr>
                      {['Vencimento', 'Tipo', 'Descrição', 'Categoria', 'Valor', 'Status / Liquidação', 'Ações'].map((titulo) => (
                        <th key={titulo} scope="col" className="px-4 py-4 font-semibold">
                          {titulo}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {lancamentosFiltrados.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-white/[0.02]">
                        <td className="whitespace-nowrap px-4 py-4 text-[#C5D4CA]">
                          {formatarData(item.data_vencimento)}
                        </td>
                        <td className="px-4 py-4">{etiquetaTipo(item)}</td>
                        <td className="min-w-[220px] max-w-sm px-4 py-4">
                          <p className="break-words font-medium">
                            {obterDescricao(item) || 'Sem descrição'}
                          </p>
                          {vinculoReserva(item)}
                        </td>
                        <td className="px-4 py-4 text-[#C5D4CA]">
                          {item.categoria || '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          {valorFormatado(item)}
                        </td>
                        <td className="px-4 py-4">
                          {etiquetaStatus(item)}
                          {statusFinanceiroERN(item) !== 'Pendente' && (
                            <p className="mt-2 text-xs text-[#B4C8BB]">
                              {obterTipo(item) === 'receita' ? 'Recebido em ' : 'Pago em '}
                              {formatarData(item.data_liquidacao)}
                            </p>
                          )}
                        </td>
                        <td className="min-w-[240px] px-4 py-4">{acoes(item)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </main>

      {itemVisualizar && (
        <Modal
          titulo="Detalhes do lançamento"
          aoFechar={() => setItemVisualizar(null)}
        >
          <dl className="grid gap-4 p-5 sm:grid-cols-2">
            {[
              { label: 'Descrição', valor: obterDescricao(itemVisualizar) || '—' },
              { label: 'Tipo', valor: rotuloTipo(obterTipo(itemVisualizar)) },
              { label: 'Valor', valor: formatarMoeda(obterValor(itemVisualizar)) },
              { label: 'Categoria', valor: itemVisualizar.categoria || '—' },
              { label: 'Vencimento', valor: formatarData(itemVisualizar.data_vencimento) },
              { label: 'Status', valor: statusFinanceiroERN(itemVisualizar) },
              {
                label: obterTipo(itemVisualizar) === 'receita'
                  ? 'Data efetiva do recebimento'
                  : 'Data efetiva do pagamento',
                valor: statusFinanceiroERN(itemVisualizar) === 'Pendente'
                  ? 'Ainda pendente'
                  : formatarData(itemVisualizar.data_liquidacao),
              },
              { label: 'Reserva vinculada', valor: itemVisualizar.reserva_id || 'Sem reserva vinculada' },
            ].map((campo) => (
              <div key={campo.label} className="min-w-0 rounded-xl border border-white/10 p-4">
                <dt className="text-xs text-[#B4C8BB]">{campo.label}</dt>
                <dd className="mt-2 break-words text-sm">{campo.valor}</dd>
              </div>
            ))}
          </dl>
          <div className="flex justify-end border-t border-white/10 p-5">
            <button type="button" className={buttonClass} onClick={() => setItemVisualizar(null)}>
              Fechar
            </button>
          </div>
        </Modal>
      )}

      {itemEditar && (
        <Modal
          titulo="Editar lançamento"
          bloqueado={salvandoEdicao}
          aoFechar={() => {
            if (mutacaoEmAndamento.current) return;
            setItemEditar(null);
            setErroModal(null);
          }}
        >
          <form onSubmit={salvarEdicao} className="p-5">
            <fieldset disabled={salvandoEdicao} className="min-w-0 space-y-5">
              <div>
                <p className={labelClass}>Natureza</p>
                {etiquetaTipo(itemEditar)}
              </div>

              <div>
                <label htmlFor="ern-descricao" className={labelClass}>
                  Descrição *
                </label>
                <input
                  id="ern-descricao"
                  required
                  value={itemEditar.descricao ?? ''}
                  onChange={(event) => setItemEditar({
                    ...itemEditar,
                    descricao: event.target.value,
                  })}
                  className={inputClass}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="ern-valor" className={labelClass}>Valor (R$) *</label>
                  <input
                    id="ern-valor"
                    type="text"
                    inputMode="decimal"
                    required
                    value={valorEdicao}
                    onChange={(event) => setValorEdicao(event.target.value)}
                    placeholder="Ex.: 1.500,00"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="ern-categoria" className={labelClass}>Categoria</label>
                  <input
                    id="ern-categoria"
                    value={itemEditar.categoria ?? ''}
                    onChange={(event) => setItemEditar({
                      ...itemEditar,
                      categoria: event.target.value,
                    })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="ern-vencimento" className={labelClass}>Vencimento *</label>
                  <input
                    id="ern-vencimento"
                    type="date"
                    required
                    value={itemEditar.data_vencimento ?? ''}
                    onChange={(event) => setItemEditar({
                      ...itemEditar,
                      data_vencimento: event.target.value,
                    })}
                    className={`${inputClass} [color-scheme:dark]`}
                  />
                </div>
                <div>
                  <label htmlFor="ern-status" className={labelClass}>Status</label>
                  <select
                    id="ern-status"
                    value={statusEdicao}
                    onChange={(event) => setItemEditar({
                      ...itemEditar,
                      status: event.target.value,
                      data_liquidacao: event.target.value === 'Pendente'
                        ? null
                        : itemEditar.data_liquidacao,
                    })}
                    className={inputClass}
                  >
                    <option value="Pendente">Pendente</option>
                    {obterTipo(itemEditar) === 'receita' ? (
                      <option value="Recebido">Recebido</option>
                    ) : (
                      <option value="Pago">Pago</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 p-4">
                {statusEdicao === 'Pendente' ? (
                  <p className="text-sm leading-6 text-[#B4C8BB]">
                    Pendências são analisadas pelo vencimento. Ao salvar como
                    pendente, a data de liquidação será removida.
                  </p>
                ) : (
                  <>
                    <label htmlFor="ern-liquidacao" className={labelClass}>
                      {obterTipo(itemEditar) === 'receita'
                        ? 'Data efetiva do recebimento *'
                        : 'Data efetiva do pagamento *'}
                    </label>
                    <input
                      id="ern-liquidacao"
                      type="date"
                      required
                      max={hojeManaus()}
                      value={itemEditar.data_liquidacao ?? ''}
                      onChange={(event) => setItemEditar({
                        ...itemEditar,
                        data_liquidacao: event.target.value,
                      })}
                      className={`${inputClass} [color-scheme:dark]`}
                    />
                    <p className="mt-3 text-xs leading-6 text-[#B4C8BB]">
                      Informe quando o dinheiro realmente entrou ou saiu.
                      Essa data determina o mês nos gráficos realizados.
                    </p>
                  </>
                )}
              </div>

              {erroModal && (
                <p role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">
                  {erroModal}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => {
                    if (mutacaoEmAndamento.current) return;
                    setItemEditar(null);
                    setErroModal(null);
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`${buttonClass} border-[#E3A144] bg-[#E3A144] font-bold text-[#07130F] hover:bg-[#F0B35C]`}
                >
                  {salvandoEdicao ? 'Salvando…' : 'Salvar alterações'}
                </button>
              </div>
            </fieldset>
          </form>
        </Modal>
      )}

      {itemExcluir && (
        <Modal
          titulo="Excluir lançamento?"
          bloqueado={excluindo}
          aoFechar={() => {
            if (mutacaoEmAndamento.current) return;
            setItemExcluir(null);
            setErroModal(null);
          }}
        >
          <div className="p-5">
            <p className="break-words text-sm leading-7 text-[#C5D4CA]">
              O lançamento <strong>{obterDescricao(itemExcluir) || 'selecionado'}</strong>,
              no valor de <strong>{formatarMoeda(obterValor(itemExcluir))}</strong>,
              será removido permanentemente.
            </p>
            {erroModal && (
              <p role="alert" className="mt-4 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">
                {erroModal}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={excluindo}
                className={buttonClass}
                onClick={() => {
                  if (mutacaoEmAndamento.current) return;
                  setItemExcluir(null);
                  setErroModal(null);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={excluindo}
                onClick={() => void confirmarExclusao()}
                className={`${buttonClass} border-red-400/30 bg-red-400/10 text-red-200`}
              >
                {excluindo ? 'Excluindo…' : 'Excluir lançamento'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
'use client';
import './financeiro-premium.css';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { BuscaEDA, CabecalhoEDA, ChipsEDA, PaginaEDA, PainelLateralEDA, PillEDA, VazioEDA, type TomEDA } from '@/app/components/PadraoPaginaEDA';
import { supabase } from '@/lib/supabase';
import { useModulosEquipeERN } from '@/app/components/ModulosEquipeERN';
import { SeletorPeriodoMensalERN, SeloExpiracaoERN } from '@/app/components/PeriodoMensalERN';
import { HISTORICO_ERN, dataNoPeriodoERN, mesAtualERN, periodoDaURLERN, type PeriodoMensalERN } from '@/lib/periodoMensalERN';
import {
  consultarFinanceiroERN,
  filtrarFinanceiroERN,
  periodoFinanceiroERN,
  statusFinanceiroERN,
  type FiltroPeriodoFinanceiroERN,
  type RegistroFinanceiroERN,
} from '@/lib/financeiroConsultaERN';
import GraficosFinanceiros from '@/app/components/GraficosFinanceiros';
import { PainelOperacaoFinanceiraEDA } from '@/app/components/FinanceiroConectadoEDA';

type LancamentoFinanceiro = RegistroFinanceiroERN & {
  user_id?: string | null;
  created_at?: string | null;
};

type TipoLancamento = 'receita' | 'despesa';

const FILTROS: {
  chave: FiltroPeriodoFinanceiroERN;
  label: string;
}[] = [
  { chave: 'todos', label: 'Todos' },
  { chave: 'receitas', label: 'Receitas' },
  { chave: 'despesas', label: 'Despesas' },
  { chave: 'pendentes', label: 'Pendentes' },
  { chave: 'com_reserva', label: 'Com reserva' },
];

// ERN_PADRAO_PAGINAS_EDA_V1: campos e botões no padrão da gestão.
const inputClass = 'eda-pg-input w-full min-w-0 px-4 py-3';
const labelClass = 'mb-2 block';
const buttonClass = 'eda-pg-bt';

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

function tomTipo(tipo: TipoLancamento | null): TomEDA {
  return tipo === 'receita' ? 'ok' : tipo === 'despesa' ? 'er' : 'nt';
}

function tomStatus(status: string): TomEDA {
  return status === 'Pendente' ? 'at' : 'ok';
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

// ERN_PADRAO_PAGINAS_EDA_V1: detalhes, edição e exclusão abrem no painel lateral.
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
  return (
    <PainelLateralEDA etiqueta="Lançamento" titulo={titulo} aoFechar={aoFechar} bloqueado={bloqueado}>
      <div className="eda-pg-auto eda-pg-modal-corpo">{children}</div>
    </PainelLateralEDA>
  );
}

export default function FinanceiroPage() {
  const { modulos: modulosFinanceiroERN } = useModulosEquipeERN();
  const podeAbrirReservaERN = modulosFinanceiroERN.has('reservas');
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroConsulta, setErroConsulta] = useState<string | null>(null);
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const [filtroPeriodo, setFiltroPeriodo] =
    useState<FiltroPeriodoFinanceiroERN>('todos');
  // ERN_PERIODO_MENSAL_V1: abre no mês atual (vencimento); histórico a um clique.
  const [periodoMes, setPeriodoMes] = useState<PeriodoMensalERN>(mesAtualERN);
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
      const p = periodoFinanceiroERN(parametros.get('periodo'));
      // Links antigos: "mes_atual" vira o seletor de mês; "todos" = histórico.
      if (p === 'mes_atual') {
        setFiltroPeriodo('todos');
        setPeriodoMes(mesAtualERN());
      } else {
        setFiltroPeriodo(p);
        if (!parametros.has('mes')) setPeriodoMes(HISTORICO_ERN);
      }
    } else if (reserva) {
      setFiltroPeriodo('todos');
    }
    if (parametros.has('mes')) setPeriodoMes(periodoDaURLERN(parametros.get('mes')));
    else if (reserva) setPeriodoMes(HISTORICO_ERN);

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

  const lancamentosDoPeriodo = useMemo(
    () => lancamentos.filter((item) => dataNoPeriodoERN(item.data_vencimento, periodoMes)),
    [lancamentos, periodoMes]
  );

  const financeiro = useMemo(() => {
    let recebido = 0;
    let pago = 0;
    let receber = 0;
    let pagar = 0;

    for (const item of lancamentosDoPeriodo) {
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
        lancamentosDoPeriodo,
        filtroPeriodo,
        busca,
        reservaFiltro
      ),
    [lancamentosDoPeriodo, filtroPeriodo, busca, reservaFiltro]
  );

  const parametrosExportacao = new URLSearchParams({
    periodo: filtroPeriodo,
    busca,
    mes: periodoMes,
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
      <div className="eda-pg-acoes-linha">
        <button
          type="button"
          disabled={ocupado}
          onClick={() => {
            setErroModal(null);
            setItemVisualizar(item);
          }}
          className="eda-pg-bt eda-pg-bt-p"
          aria-label={`Ver ${obterDescricao(item) || 'lançamento'}`}
        >
          Ver
        </button>
        <button
          type="button"
          disabled={ocupado || !item.id}
          onClick={() => abrirEdicao(item)}
          className="eda-pg-bt eda-pg-bt-p"
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
          className="eda-pg-bt eda-pg-bt-p eda-pg-bt-perigo"
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
      <div style={{ display: 'grid', gap: 4, marginTop: 6 }}>
        <small style={{ overflowWrap: 'anywhere' }}>Reserva vinculada</small>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <button
            type="button"
            className="eda-pg-link"
            onClick={() => {
              setReservaFiltro(item.reserva_id!);
              setFiltroPeriodo('todos');
              setPeriodoMes(HISTORICO_ERN);
              setBusca('');
            }}
          >
            Filtrar esta reserva
          </button>
          {podeAbrirReservaERN && (
            <Link
              className="eda-pg-link"
              href={`/reservas/editar/${encodeURIComponent(item.reserva_id)}`}
            >
              Abrir reserva
            </Link>
          )}
        </div>
      </div>
    );
  }

  function etiquetaTipo(item: LancamentoFinanceiro) {
    const tipo = obterTipo(item);
    return (
      <PillEDA tom={tomTipo(tipo)}>{rotuloTipo(tipo)}</PillEDA>
    );
  }

  function etiquetaStatus(item: LancamentoFinanceiro) {
    const status = statusFinanceiroERN(item);
    return (
      <PillEDA tom={tomStatus(status)}>{status}</PillEDA>
    );
  }

  function valorFormatado(item: LancamentoFinanceiro) {
    const tipo = obterTipo(item);
    return (
      <span className="eda-pg-num" style={{ color: tipo === 'receita' ? 'var(--p-verde)' : tipo === 'despesa' ? 'var(--p-verm)' : undefined }}>
        {tipo === 'receita' ? '+ ' : tipo === 'despesa' ? '− ' : ''}
        {formatarMoeda(obterValor(item))}
      </span>
    );
  }

  const statusEdicao = itemEditar
    ? statusFinanceiroERN(itemEditar)
    : 'Pendente';

  const filtrosChips = FILTROS.map((filtro) => ({ valor: filtro.chave, rotulo: filtro.label }));

  return (
    <PaginaEDA className="eda-pg-auto">
      {mensagemSucesso && <div role="status" className="eda-pg-toast">{mensagemSucesso}</div>}

      <div className="eda-pg-miolo">
        <CabecalhoEDA
          capa
          etiqueta="Financeiro"
          titulo="Financeiro"
          resumo={carregando || erroConsulta
            ? 'Receitas, despesas e pendências da operação.'
            : <>Saldo realizado <b>{formatarMoeda(financeiro.saldo)}</b> · <b>{formatarMoeda(financeiro.receber)}</b> a receber · <b>{formatarMoeda(financeiro.pagar)}</b> a pagar</>}
          acoes={<>
            <button type="button" disabled={carregando || ocupado} onClick={() => void carregarFinanceiro()} className="eda-pg-bt">
              {carregando ? 'Atualizando…' : 'Atualizar'}
            </button>
            <Link href={linkExportacao} className="eda-pg-bt">Exportar</Link>
            <Link href="/financeiro/despesa/novo" className="eda-pg-bt">− Nova despesa</Link>
            <Link href="/financeiro/receita/novo" className="eda-pg-bt eda-pg-bt-ouro">+ Nova receita</Link>
          </>}
        />

        <section className="eda-pg-kpis" aria-label="Resumo de todo o histórico">
          {cards.slice(0, 4).map((card) => (
            <div key={card.titulo} className={`eda-pg-kpi ${card.titulo === 'Saldo realizado' ? (financeiro.saldo >= 0 ? 'eda-pg-kpi-ok' : 'eda-pg-kpi-er') : ''}`}>
              <small>{card.titulo}</small>
              <b>{carregando || erroConsulta ? '—' : formatarMoeda(card.valor)}</b>
              <span>{card.detalhe}</span>
            </div>
          ))}
        </section>
        <p className="eda-pg-nota">
          Totais de todo o histórico acessível à sua conta. O saldo realizado é receitas recebidas menos despesas pagas; não é saldo bancário nem lucro. A pagar: <b>{carregando || erroConsulta ? '—' : formatarMoeda(financeiro.pagar)}</b>.
        </p>

        {/* EDA_FINANCEIRO_CONECTADO_V1: o que as viagens do mês geram e custam. */}
        <PainelOperacaoFinanceiraEDA />

        {reservaFiltro && (
          <div className="eda-pg-aviso eda-pg-aviso-ouro">
            <div>
              <b>Filtro de reserva ativo</b>
              <p style={{ overflowWrap: 'anywhere' }}>Mostrando só os lançamentos da reserva {reservaFiltro}.</p>
            </div>
            <button type="button" className="eda-pg-bt eda-pg-bt-p" onClick={() => setReservaFiltro('')}>Limpar filtro</button>
          </div>
        )}

        {erroConsulta && (
          <div role="alert" className="eda-pg-aviso eda-pg-aviso-er">
            <p style={{ margin: 0 }}>{erroConsulta}</p>
            <button type="button" disabled={carregando || ocupado} onClick={() => void carregarFinanceiro()} className="eda-pg-bt eda-pg-bt-p" style={{ marginTop: 10 }}>
              Tentar novamente
            </button>
          </div>
        )}

        <section aria-label="Filtros dos lançamentos" className="eda-pg-filtros">
          <BuscaEDA id="ern-busca-financeiro" rotulo="Buscar lançamento" valor={busca} aoMudar={setBusca} placeholder="Descrição, categoria ou reserva" />
          <SeletorPeriodoMensalERN valor={periodoMes} aoMudar={setPeriodoMes} rotulo="Mês de vencimento" total={lancamentosDoPeriodo.length} />
          <ChipsEDA rotulo="Filtrar lançamentos" opcoes={filtrosChips} valor={filtroPeriodo} aoMudar={setFiltroPeriodo} />
        </section>

        <section aria-busy={carregando} aria-label="Lançamentos financeiros" className="eda-pg-tabela-caixa">
          <div className="eda-pg-tabela-topo">
            <span>
              {carregando || erroConsulta ? '—' : <>Mostrando <b>{lancamentosFiltrados.length}</b> de {lancamentos.length} lançamentos</>}
            </span>
            <span>“Mês atual” considera o vencimento no calendário de Manaus</span>
          </div>

          {carregando ? (
            <p role="status" className="eda-pg-estado">Carregando financeiro…</p>
          ) : erroConsulta ? (
            <p className="eda-pg-estado">A listagem está indisponível. Tente atualizar os dados.</p>
          ) : lancamentosFiltrados.length === 0 ? (
            lancamentos.length === 0 ? (
              <VazioEDA
                titulo="Nenhum lançamento ainda"
                texto="Registre a primeira receita ou despesa para acompanhar o caixa da operação."
                acao={<Link href="/financeiro/receita/novo" className="eda-pg-bt eda-pg-bt-ouro">+ Nova receita</Link>}
              />
            ) : (
              <VazioEDA
                titulo="Nenhum lançamento encontrado"
                texto="Ajuste o filtro ou a busca para ver outros lançamentos."
                acao={<button type="button" className="eda-pg-bt" onClick={() => { setBusca(''); setFiltroPeriodo('todos'); setReservaFiltro(''); setPeriodoMes(HISTORICO_ERN); }}>Ver todos</button>}
              />
            )
          ) : (
            <>
              <div className="eda-pg-cartoes">
                {lancamentosFiltrados.map((item, index) => (
                  <button
                    key={item.id || index}
                    type="button"
                    className="eda-pg-cartao"
                    disabled={ocupado}
                    onClick={() => { setErroModal(null); setItemVisualizar(item); }}
                  >
                    <span className="eda-pg-cartao-topo">
                      <span style={{ minWidth: 0 }}>
                        <b>{obterDescricao(item) || 'Sem descrição'}</b>
                        <small>{item.categoria || 'Sem categoria'} · vence {formatarData(item.data_vencimento)}</small>
                        {statusFinanceiroERN(item) === 'Pendente' && item.data_vencimento && <SeloExpiracaoERN data={apenasData(item.data_vencimento)} rotulo="Vence" rotuloExpirado="Vencido em" />}
                      </span>
                      {valorFormatado(item)}
                    </span>
                    <span className="eda-pg-cartao-pills">
                      {etiquetaTipo(item)}
                      {etiquetaStatus(item)}
                      {item.reserva_id && <PillEDA tom="nt" ponto={false}>Com reserva</PillEDA>}
                    </span>
                  </button>
                ))}
              </div>

              <div className="eda-pg-rolagem">
                <table className="eda-pg-tabela">
                  <thead>
                    <tr>
                      {['Vencimento', 'Descrição', 'Tipo', 'Categoria', 'Valor', 'Situação', ''].map((titulo, i) => (
                        <th key={titulo || i} scope="col">{titulo || <span className="eda-pg-sr">Ações</span>}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lancamentosFiltrados.map((item, index) => (
                      <tr key={item.id || index} aria-selected={itemVisualizar?.id === item.id && Boolean(item.id)}>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatarData(item.data_vencimento)}{statusFinanceiroERN(item) === 'Pendente' && item.data_vencimento && <div style={{ marginTop: 4 }}><SeloExpiracaoERN data={apenasData(item.data_vencimento)} rotulo="Vence" rotuloExpirado="Vencido em" /></div>}</td>
                        <td style={{ minWidth: 220, maxWidth: 360 }}>
                          <button type="button" className="eda-pg-linha-bt" disabled={ocupado} onClick={() => { setErroModal(null); setItemVisualizar(item); }}>
                            <b>{obterDescricao(item) || 'Sem descrição'}</b>
                          </button>
                          {vinculoReserva(item)}
                        </td>
                        <td>{etiquetaTipo(item)}</td>
                        <td className="eda-pg-mut">{item.categoria || '—'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{valorFormatado(item)}</td>
                        <td>
                          {etiquetaStatus(item)}
                          {statusFinanceiroERN(item) !== 'Pendente' && (
                            <small>{obterTipo(item) === 'receita' ? 'Recebido em ' : 'Pago em '}{formatarData(item.data_liquidacao)}</small>
                          )}
                        </td>
                        <td>{acoes(item)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <details className="eda-pg-analises">
          <summary>Gráficos do financeiro</summary>
          <div>
            <GraficosFinanceiros
              registros={lancamentos}
              carregando={carregando}
              erro={erroConsulta || ''}
              aoAtualizar={carregarFinanceiro}
            />
          </div>
        </details>
      </div>

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
    </PaginaEDA>
  );
}

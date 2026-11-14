'use client';

// EDA_RELATORIO_OPERACAO_V1: relatório completo da operação no período.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { baixarDocumentoPremiumERN } from '@/lib/pdfSobDemandaEDA'; // EDA_PDF_SOB_DEMANDA_V1
import { baixarCsvRelatorioERN } from '@/lib/relatoriosERN';

type Op = {
  periodo: { inicio: string; fim: string };
  reservas: { ativas: number; canceladas: number; pessoas: number; valor: number; ticket_medio: number; sem_cliente_vinculado: number };
  recebimentos: { recebido: number; a_receber: number };
  saidas: { total: number; vagas: number; ocupadas: number; ocupacao_pct: number };
  resultado: { receita_saidas: number; custos: number; comissoes: number; margem_saidas: number };
  hospedagem: { noites_ocupadas: number; noites_disponiveis: number; ocupacao_pct: number };
  clientes: { atendidos: number; retorno: number; novos: number; origens: { origem: string; n: number }[] };
  top_passeios: { passeio: string; reservas: number; pessoas: number; valor: number }[];
  top_parceiros: { parceiro: string; reservas: number; vendido: number; comissao: number }[];
  seguranca: { participantes: number; fichas: number };
  vouchers: { emitidos: number; utilizados: number };
};

// EDA_RELATORIO_COMPLEMENTOS_V1
type Extra = {
  status: { confirmadas: number; pendentes: number; outras: number };
  familias: { pessoas: number; adultos: number; criancas: number; colo: number };
  formas_pagamento: { forma: string; valor: number; n: number }[];
  documentos: { vencidos: number; vencendo_30: number; cadastrados: number };
  fiscal: { recebido: number; recebido_sem_nota: number };
  pesca: { viagens: number; reservas: number; pescadores: number; reservas_pendentes: number };
};

const moeda = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dt = (d: string) => d.split('-').reverse().join('/');

export default function RelatorioOperacaoEDA({ inicio, fim, titulo }: { inicio: string; fim: string; titulo: string }) {
  const [op, setOp] = useState<Op | null>(null);
  const [ex, setEx] = useState<Extra | null>(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setOp(null); setEx(null); setErro('');
    const [base, extra] = await Promise.all([
      supabase.rpc('relatorio_operacao_eda', { p_de: inicio, p_ate: fim }),
      supabase.rpc('relatorio_complementos_eda', { p_de: inicio, p_ate: fim }),
    ]);
    if (base.error) { setErro('Não foi possível calcular o relatório.'); return; }
    setEx(extra.error ? null : (extra.data as Extra));
    setOp(base.data as Op);
  }, [inicio, fim]);

  useEffect(() => { void carregar(); }, [carregar]);

  if (erro) return <p role="alert" className="mt-4 text-sm text-red-300">{erro}</p>;
  if (!op) return <p role="status" className="mt-4 text-sm">Lendo saídas, reservas, financeiro, hospedagem e clientes…</p>;

  const fichaPct = op.seguranca.participantes ? Math.round((op.seguranca.fichas / op.seguranca.participantes) * 100) : 0;
  const blocos: { t: string; itens: [string, string][] }[] = [
    { t: 'Vendas', itens: [['Reservas (não canceladas)', String(op.reservas.ativas)],
      ...(ex ? [['Confirmadas', String(ex.status.confirmadas)], ['Pendentes', String(ex.status.pendentes)]] as [string, string][] : []),
      ['Canceladas', String(op.reservas.canceladas)], ['Pessoas', String(op.reservas.pessoas)], ['Valor vendido', moeda(op.reservas.valor)], ['Ticket médio', moeda(op.reservas.ticket_medio)]] },
    { t: 'Caixa das viagens', itens: [['Recebido', moeda(op.recebimentos.recebido)], ['A receber', moeda(op.recebimentos.a_receber)]] },
    { t: 'Saídas', itens: [['Saídas', String(op.saidas.total)], ['Ocupação', `${op.saidas.ocupacao_pct}% (${op.saidas.ocupadas}/${op.saidas.vagas})`]] },
    { t: 'Resultado das saídas', itens: [['Receita', moeda(op.resultado.receita_saidas)], ['Custos', moeda(op.resultado.custos)], ['Comissões', moeda(op.resultado.comissoes)], ['Margem', moeda(op.resultado.margem_saidas)]] },
    { t: 'Hospedagem', itens: [['Noites ocupadas', String(op.hospedagem.noites_ocupadas)], ['Ocupação', `${op.hospedagem.ocupacao_pct}%`]] },
    { t: 'Clientes', itens: [['Atendidos', String(op.clientes.atendidos)], ['Novos', String(op.clientes.novos)], ['De retorno', String(op.clientes.retorno)]] },
    ...(ex ? [
      { t: 'Quem viajou', itens: [['Adultos', String(ex.familias.adultos)], ['Crianças', String(ex.familias.criancas)], ['De colo', String(ex.familias.colo)]] as [string, string][] },
      { t: 'Recebido por forma', itens: (ex.formas_pagamento.length ? ex.formas_pagamento.map((f) => [`${f.forma} (${f.n})`, moeda(f.valor)]) : [['Sem recebimentos', moeda(0)]]) as [string, string][] },
      { t: 'Fiscal', itens: [['Recebido no período', moeda(ex.fiscal.recebido)], ['Sem nota solicitada', moeda(ex.fiscal.recebido_sem_nota)]] as [string, string][] },
      { t: 'Documentos (hoje)', itens: [['Vencidos', String(ex.documentos.vencidos)], ['Vencem em 30 dias', String(ex.documentos.vencendo_30)], ['Cadastrados', String(ex.documentos.cadastrados)]] as [string, string][] },
      ...(ex.pesca.reservas > 0 ? [{ t: 'Pesca esportiva', itens: [['Viagens', String(ex.pesca.viagens)], ['Pescadores', String(ex.pesca.pescadores)], ['Reservas com pendência', `${ex.pesca.reservas_pendentes}/${ex.pesca.reservas}`]] as [string, string][] }] : []),
    ] : []),
    { t: 'Segurança e embarque', itens: [['Fichas de saúde', `${op.seguranca.fichas}/${op.seguranca.participantes} (${fichaPct}%)`], ['Vouchers utilizados', `${op.vouchers.utilizados}/${op.vouchers.emitidos}`]] },
  ];
  const avisos = [
    op.reservas.sem_cliente_vinculado > 0 && `${op.reservas.sem_cliente_vinculado} reserva(s) sem cadastro de cliente vinculado.`,
    op.saidas.total === 0 && 'Nenhuma saída aberta no período: ocupação e margem por saída ficam zeradas.',
    ex && ex.status.pendentes > 0 && `${ex.status.pendentes} reserva(s) ainda pendente(s) de confirmação.`,
    op.seguranca.participantes > 0 && fichaPct < 100 && `${100 - fichaPct}% dos participantes ainda sem ficha de saúde.`,
    ex && ex.documentos.vencidos > 0 && `${ex.documentos.vencidos} documento(s) da operação vencido(s).`,
    ex && ex.documentos.cadastrados === 0 && 'Nenhum documento da operação cadastrado (Cadastur, TIE, seguro).',
    ex && ex.fiscal.recebido_sem_nota > 0 && `${moeda(ex.fiscal.recebido_sem_nota)} recebido sem nota fiscal solicitada.`,
    ex && ex.pesca.reservas_pendentes > 0 && `${ex.pesca.reservas_pendentes} reserva(s) de pesca com pendência (barco, guia, voucher ou pagamento).`,
  ].filter(Boolean) as string[];

  function pdf() {
    baixarDocumentoPremiumERN({
      titulo, subtitulo: `Operação de ${dt(op!.periodo.inicio)} a ${dt(op!.periodo.fim)}`, tipo: 'Relatório',
      nomeArquivo: `EDA-relatorio-operacao-${op!.periodo.inicio}.pdf`,
      dados: blocos.flatMap((b) => b.itens.map(([c, v]) => ({ campo: `${b.t} · ${c}`, valor: v }))),
      tabela: { titulo: 'Passeios que mais venderam', colunas: ['Passeio', 'Reservas', 'Pessoas', 'Valor'], linhas: op!.top_passeios.map((p) => [p.passeio, p.reservas, p.pessoas, moeda(p.valor)]) },
      observacoes: [
        ...avisos,
        'Datas pela viagem (saída) ou pela data da reserva quando não há saída. Reservas contam pela data da viagem, não pela data da venda.',
        'Margem = receita das reservas da saída − custos (realizado ou estimado nas demandas) − comissões. Não é lucro contábil.',
        'Dados de saúde aparecem apenas em contagem.',
        'Forma de pagamento vem da descrição do recebimento (ex.: "Sinal 30% · Pix"); lançamentos antigos aparecem como "Não informada".',
      ],
    });
  }

  function csv() {
    baixarCsvRelatorioERN(`relatorio-operacao-${op!.periodo.inicio}.csv`, [
      ['Relatório', titulo], ['Início', op!.periodo.inicio], ['Fim', op!.periodo.fim], [],
      ['Grupo', 'Indicador', 'Valor'], ...blocos.flatMap((b) => b.itens.map(([c, v]) => [b.t, c, v])), [],
      ['Passeio', 'Reservas', 'Pessoas', 'Valor'], ...op!.top_passeios.map((p) => [p.passeio, p.reservas, p.pessoas, Number(p.valor).toFixed(2)]), [],
      ['Parceiro', 'Reservas', 'Vendido', 'Comissão'], ...op!.top_parceiros.map((p) => [p.parceiro, p.reservas, Number(p.vendido).toFixed(2), Number(p.comissao).toFixed(2)]), [],
      ['Origem do cliente', 'Clientes'], ...op!.clientes.origens.map((o) => [o.origem, o.n]),
    ]);
  }

  return (
    <section className="ro">
      <div className="ro-acoes">
        <button type="button" onClick={pdf}>Baixar PDF</button>
        <button type="button" onClick={csv}>Exportar CSV</button>
        <button type="button" onClick={() => void carregar()}>Recalcular</button>
      </div>
      {avisos.length > 0 && <ul className="ro-avisos">{avisos.map((a) => <li key={a}>{a}</li>)}</ul>}
      <div className="ro-grade">
        {blocos.map((b) => (
          <div key={b.t} className="ro-bloco">
            <p>{b.t}</p>
            {b.itens.map(([c, v]) => <div key={c}><span>{c}</span><b>{v}</b></div>)}
          </div>
        ))}
      </div>
      {op.top_passeios.length > 0 && (
        <div className="ro-bloco">
          <p>Passeios que mais venderam</p>
          {op.top_passeios.map((p) => <div key={p.passeio}><span>{p.passeio} · {p.reservas} res. · {p.pessoas} pess.</span><b>{moeda(p.valor)}</b></div>)}
        </div>
      )}
      {op.top_parceiros.length > 0 && (
        <div className="ro-bloco">
          <p>Parceiros</p>
          {op.top_parceiros.map((p) => <div key={p.parceiro}><span>{p.parceiro} · vendido {moeda(p.vendido)}</span><b>{moeda(p.comissao)}</b></div>)}
        </div>
      )}
      {op.clientes.origens.length > 0 && (
        <div className="ro-bloco">
          <p>Como os clientes chegaram</p>
          {op.clientes.origens.map((o) => <div key={o.origem}><span>{o.origem}</span><b>{o.n}</b></div>)}
        </div>
      )}
      <style jsx>{`
        .ro { margin-top: 16px; display: grid; gap: 12px; }
        .ro-acoes { display: flex; flex-wrap: wrap; gap: 8px; }
        .ro-acoes button { min-height: 40px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--ern-borda); background: transparent; color: inherit; cursor: pointer; }
        .ro-acoes button:first-child { background: var(--ern-destaque); border-color: var(--ern-destaque); color: #10140f; font-weight: 700; }
        .ro-avisos { margin: 0; padding: 10px 14px 10px 28px; border-radius: 12px; border: 1px solid var(--ern-destaque); font-size: 13px; }
        .ro-grade { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
        .ro-bloco { display: grid; gap: 6px; padding: 14px; border-radius: 14px; border: 1px solid var(--ern-borda); }
        .ro-bloco > p { margin: 0 0 4px; font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--ern-destaque); }
        .ro-bloco > div { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; }
        .ro-bloco span { color: var(--ern-secundario); }
      `}</style>
    </section>
  );
}

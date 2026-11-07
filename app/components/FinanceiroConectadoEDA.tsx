'use client';

// EDA_FINANCEIRO_CONECTADO_V1: financeiro nascido da operação.

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { dataCurtaEDA } from '@/lib/passeiosPublicosEDA';
import { hojeManausEDA } from '@/lib/saidasGestaoEDA';

const moeda = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function mensagem(e: { message?: string } | null) {
  const m = e?.message ?? '';
  const excede = m.match(/EDA_RECEBIMENTO_EXCEDE: saldo da reserva é ([\d.]+)/);
  if (excede) return `O valor passa do saldo da reserva (${moeda(Number(excede[1]))}).`;
  if (m.includes('Sem acesso')) return 'Sua função não pode lançar no financeiro.';
  return 'Não foi possível concluir. Tente novamente.';
}

// ---------------------------------------------------------------------------
// Na reserva: quanto vale, quanto entrou, quanto falta.
// ---------------------------------------------------------------------------
type Lancamento = { id: string; descricao: string | null; valor: number; status: string | null; data_vencimento: string | null; data_liquidacao: string | null };

export function FinanceiroReservaEDA({ reservaId, bloqueado }: { reservaId?: string; bloqueado: boolean }) {
  const [valor, setValor] = useState(0);
  const [lancs, setLancs] = useState<Lancamento[] | null>(null);
  const [form, setForm] = useState({ valor: '', data: hojeManausEDA(), recebido: true, descricao: '' });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!reservaId) return;
    const [r, f] = await Promise.all([
      supabase.from('reservas').select('valor_total,valor').eq('id', reservaId).maybeSingle(),
      supabase.from('financeiro').select('id,descricao,valor,status,data_vencimento,data_liquidacao')
        .eq('reserva_id', reservaId).eq('tipo', 'receita').order('data_vencimento'),
    ]);
    setValor(Number(r.data?.valor_total) || Number(r.data?.valor) || 0);
    setLancs((f.data ?? []) as Lancamento[]);
  }, [reservaId]);

  useEffect(() => { void carregar(); }, [carregar]);
  if (!reservaId) return null;

  const recebido = (lancs ?? []).filter((l) => ['recebido', 'pago'].includes((l.status ?? '').toLowerCase())).reduce((n, l) => n + Number(l.valor), 0);
  const previsto = (lancs ?? []).filter((l) => !['recebido', 'pago', 'cancelado'].includes((l.status ?? '').toLowerCase())).reduce((n, l) => n + Number(l.valor), 0);
  const saldo = Math.max(valor - recebido, 0);
  const pct = valor > 0 ? Math.min(100, Math.round((recebido / valor) * 100)) : 0;

  async function registrar(e: FormEvent) {
    e.preventDefault();
    const v = Number(form.valor.replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(v) || v <= 0) { setErro('Informe um valor válido.'); return; }
    setSalvando(true); setErro('');
    const { error } = await supabase.rpc('registrar_recebimento_eda', {
      p_reserva_id: reservaId, p_valor: v, p_data: form.data, p_descricao: form.descricao || null, p_recebido: form.recebido,
    });
    setSalvando(false);
    if (error) { setErro(mensagem(error)); return; }
    setForm({ ...form, valor: '', descricao: '' });
    void carregar();
  }

  return (
    <section className="eda-pg-secao eda-pg-largo fr">
      <p className="eda-pg-secao-eb">Financeiro</p>
      <h2>Pagamentos desta reserva</h2>
      <div className="fr-kpis">
        <div><span>Valor</span><b>{moeda(valor)}</b></div>
        <div><span>Recebido</span><b style={{ color: '#4ade80' }}>{moeda(recebido)}</b></div>
        <div><span>Previsto</span><b>{moeda(previsto)}</b></div>
        <div><span>Saldo</span><b style={{ color: saldo > 0 ? 'var(--ern-destaque)' : '#4ade80' }}>{saldo > 0 ? moeda(saldo) : 'Quitada'}</b></div>
      </div>
      <i className="fr-barra" aria-hidden="true"><b style={{ width: `${pct}%` }} /></i>

      {lancs && lancs.length > 0 && (
        <ul className="fr-lista">
          {lancs.map((l) => (
            <li key={l.id}>
              <span>{l.descricao || 'Recebimento'}</span>
              <span>{dataCurtaEDA(l.data_liquidacao || l.data_vencimento)} · {l.status}</span>
              <b>{moeda(Number(l.valor))}</b>
            </li>
          ))}
        </ul>
      )}

      {saldo > 0 && (
        <form className="fr-form" onSubmit={registrar}>
          <label>Valor<input inputMode="decimal" placeholder={saldo.toFixed(2).replace('.', ',')} value={form.valor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })} disabled={bloqueado || salvando} /></label>
          <label>Data<input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} disabled={bloqueado || salvando} /></label>
          <label>Descrição<input maxLength={120} placeholder="Ex.: Sinal 30% · Pix" value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })} disabled={bloqueado || salvando} /></label>
          <label className="fr-check"><input type="checkbox" checked={form.recebido} onChange={(e) => setForm({ ...form, recebido: e.target.checked })} disabled={bloqueado || salvando} />Já recebido</label>
          <button type="submit" className="eda-pg-bt eda-pg-bt-ouro" disabled={bloqueado || salvando}>{salvando ? 'Lançando…' : form.recebido ? 'Registrar recebimento' : 'Lançar a receber'}</button>
          <button type="button" className="eda-pg-bt" disabled={bloqueado || salvando}
            onClick={() => setForm({ ...form, valor: saldo.toFixed(2).replace('.', ',') })}>Quitar saldo</button>
        </form>
      )}
      {erro && <p role="alert" className="fr-erro">{erro}</p>}

      <style jsx>{`
        .fr h2 { margin: 4px 0 10px; }
        .fr-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; }
        .fr-kpis div { display: grid; gap: 2px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--ern-borda); }
        .fr-kpis span { font-size: 11px; color: var(--ern-secundario, #b4c8bb); } .fr-kpis b { font-size: 17px; }
        .fr-barra { display: block; height: 6px; margin: 10px 0; border-radius: 6px; background: var(--ern-borda); overflow: hidden; }
        .fr-barra b { display: block; height: 100%; background: #22c55e; }
        .fr-lista { list-style: none; margin: 0 0 10px; padding: 0; display: grid; gap: 4px; }
        .fr-lista li { display: grid; grid-template-columns: 1fr auto; gap: 0 12px; padding: 8px 12px; border-radius: 10px; border: 1px solid var(--ern-borda); font-size: 13px; }
        .fr-lista li span:nth-child(2) { font-size: 11px; color: var(--ern-secundario, #b4c8bb); }
        .fr-lista li b { grid-column: 2; grid-row: 1 / span 2; align-self: center; }
        .fr-form { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end; }
        .fr-form label { display: grid; gap: 4px; font-size: 11px; color: var(--ern-secundario, #b4c8bb); }
        .fr-form input:not([type='checkbox']) { min-height: 40px; padding: 0 10px; border-radius: 12px; border: 1px solid var(--ern-borda); background: transparent; color: inherit; }
        .fr-check { display: flex !important; align-items: center; gap: 6px; min-height: 40px; color: inherit !important; font-size: 13px !important; }
        .fr-erro { color: var(--ern-erro, #f87171); font-size: 13px; }
      `}</style>
    </section>
  );
}

// ---------------------------------------------------------------------------
// No Financeiro: a receber das reservas + rentabilidade das saídas do mês.
// ---------------------------------------------------------------------------
type Receber = { reserva_id: string; cliente: string | null; passeio: string | null; inicio: string; status: string | null; valor: number; recebido: number; pendente_lancado: number; saldo: number };
type Rent = { saida_id: string; passeio: string; data_inicio: string; data_fim: string | null; pessoas: number; reservas: number; receita: number; recebido: number; custo_estimado: number; custo_realizado: number; comissoes: number; margem: number };

export function PainelOperacaoFinanceiraEDA() {
  const hoje = new Date();
  const [mes, setMes] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [aba, setAba] = useState<'receber' | 'saidas'>('receber');
  const [receber, setReceber] = useState<Receber[] | null>(null);
  const [rent, setRent] = useState<Rent[] | null>(null);
  const [aviso, setAviso] = useState('');

  const carregar = useCallback(async () => {
    const de = iso(new Date(mes.getFullYear(), mes.getMonth(), 1));
    const ate = iso(new Date(mes.getFullYear(), mes.getMonth() + 1, 0));
    setReceber(null); setRent(null);
    const [a, b] = await Promise.all([
      supabase.rpc('contas_receber_eda', { p_de: de, p_ate: ate }),
      supabase.rpc('rentabilidade_saidas_eda', { p_de: de, p_ate: ate }),
    ]);
    setReceber(a.error ? [] : (a.data ?? []) as Receber[]);
    setRent(b.error ? [] : (b.data ?? []) as Rent[]);
  }, [mes]);

  useEffect(() => { void carregar(); }, [carregar]);

  async function lancarComissoes() {
    setAviso('');
    const { data, error } = await supabase.rpc('lancar_comissoes_mes_eda', { p_mes: iso(mes) });
    if (error) { setAviso(error.message.includes('Sem acesso') ? 'Só administrador ou financeiro lança comissões.' : 'Não foi possível lançar as comissões.'); return; }
    setAviso(Number(data) > 0 ? `${data} despesa(s) de comissão lançada(s) como pendentes.` : 'As comissões deste mês já estavam lançadas (ou não há comissão).');
  }

  const aReceber = (receber ?? []).reduce((n, r) => n + Number(r.saldo), 0);
  const recebidoMes = (receber ?? []).reduce((n, r) => n + Number(r.recebido), 0);
  const margem = (rent ?? []).reduce((n, r) => n + Number(r.margem), 0);
  const rotulo = mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <section className="po">
      <header>
        <div>
          <p className="po-eb">Operação do mês · viagens</p>
          <div className="po-kpis">
            <div><span>A receber</span><b style={{ color: 'var(--ern-destaque)' }}>{moeda(aReceber)}</b></div>
            <div><span>Recebido das reservas</span><b style={{ color: '#4ade80' }}>{moeda(recebidoMes)}</b></div>
            <div><span>Margem das saídas</span><b>{moeda(margem)}</b></div>
          </div>
        </div>
        <div className="po-nav">
          <button type="button" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} aria-label="Mês anterior">‹</button>
          <span>{rotulo}</span>
          <button type="button" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} aria-label="Próximo mês">›</button>
        </div>
      </header>

      <div className="po-abas" role="tablist">
        <button type="button" role="tab" aria-selected={aba === 'receber'} onClick={() => setAba('receber')}>A receber das reservas</button>
        <button type="button" role="tab" aria-selected={aba === 'saidas'} onClick={() => setAba('saidas')}>Rentabilidade das saídas</button>
        <button type="button" className="po-acao" onClick={() => void lancarComissoes()}>Lançar comissões do mês</button>
      </div>
      {aviso && <p className="po-mut">{aviso}</p>}

      {aba === 'receber' && (receber === null ? <p className="po-mut">Calculando…</p> : receber.length === 0 ? (
        <p className="po-mut">Nenhuma reserva com viagem neste mês.</p>
      ) : (
        <ul>
          {receber.map((r) => (
            <li key={r.reserva_id}>
              <Link href={`/reservas/editar/${r.reserva_id}`}>{r.cliente || 'Reserva'}</Link>
              <span>{r.passeio || '—'} · {dataCurtaEDA(r.inicio)} · recebido {moeda(r.recebido)} de {moeda(r.valor)}{Number(r.pendente_lancado) > 0 ? ` · ${moeda(r.pendente_lancado)} lançado a receber` : ''}</span>
              <strong style={{ color: Number(r.saldo) > 0 ? 'var(--ern-destaque)' : '#4ade80' }}>{Number(r.saldo) > 0 ? moeda(r.saldo) : 'Quitada'}</strong>
            </li>
          ))}
        </ul>
      ))}

      {aba === 'saidas' && (rent === null ? <p className="po-mut">Calculando…</p> : rent.length === 0 ? (
        <p className="po-mut">Nenhuma saída neste mês. As saídas são abertas na página Passeios.</p>
      ) : (
        <ul>
          {rent.map((s) => (
            <li key={s.saida_id}>
              <b>{s.passeio} · {dataCurtaEDA(s.data_inicio)}</b>
              <span>{s.pessoas} pessoa(s) · receita {moeda(s.receita)} · custos {moeda(Math.max(Number(s.custo_realizado), Number(s.custo_estimado)))}{Number(s.custo_realizado) > 0 ? ' (realizado)' : Number(s.custo_estimado) > 0 ? ' (estimado nas demandas)' : ''} · comissões {moeda(s.comissoes)}</span>
              <strong style={{ color: Number(s.margem) >= 0 ? '#4ade80' : '#f87171' }}>{moeda(s.margem)}</strong>
            </li>
          ))}
        </ul>
      ))}

      <style jsx>{`
        .po { border-radius: 18px; border: 1px solid var(--ern-borda); background: var(--ern-painel); padding: 20px; display: grid; gap: 12px; color: var(--ern-texto); }
        header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .po-eb { margin: 0 0 8px; font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--ern-destaque); }
        .po-kpis { display: flex; flex-wrap: wrap; gap: 16px; }
        .po-kpis div { display: grid; } .po-kpis span { font-size: 11px; color: var(--ern-secundario); } .po-kpis b { font-size: 22px; }
        .po-nav { display: flex; align-items: center; gap: 8px; text-transform: capitalize; font-size: 14px; }
        .po-nav button, .po-abas button { min-height: 36px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--ern-borda); background: transparent; color: inherit; cursor: pointer; }
        .po-abas { display: flex; flex-wrap: wrap; gap: 6px; }
        .po-abas button[aria-selected='true'] { border-color: var(--ern-destaque); background: rgb(227 161 68 / 14%); font-weight: 600; }
        .po-abas .po-acao { margin-left: auto; }
        .po-mut { margin: 0; font-size: 13px; color: var(--ern-secundario); }
        ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
        li { display: grid; grid-template-columns: 1fr auto; gap: 2px 12px; padding: 10px 14px; border-radius: 12px; border: 1px solid var(--ern-borda); }
        li :global(a) { color: var(--ern-destaque); font-weight: 600; }
        li span { grid-column: 1; font-size: 12px; color: var(--ern-secundario); }
        li strong { grid-column: 2; grid-row: 1 / span 2; align-self: center; }
      `}</style>
    </section>
  );
}

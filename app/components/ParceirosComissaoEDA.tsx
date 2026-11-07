'use client';

// EDA_VOUCHERS_PARCEIROS_V1: parceiro que indicou/vendeu a reserva + comissão.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Na reserva: escolher o parceiro (salva na hora; a % fica congelada).
export function ParceiroReservaEDA({ reservaId, bloqueado }: { reservaId?: string; bloqueado: boolean }) {
  const [parceiros, setParceiros] = useState<{ id: string; nome: string; comissao_porcentagem: number | null }[]>([]);
  const [atual, setAtual] = useState<{ parceiro_id: string | null; comissao_percentual: number | null; valor: number } | null>(null);
  const [aviso, setAviso] = useState('');

  const carregar = useCallback(async () => {
    if (!reservaId) return;
    const [p, r] = await Promise.all([
      supabase.from('parceiros').select('id,nome,comissao_porcentagem,status').order('nome'),
      supabase.from('reservas').select('parceiro_id,comissao_percentual,valor_total,valor').eq('id', reservaId).maybeSingle(),
    ]);
    setParceiros(((p.data ?? []) as { id: string; nome: string; comissao_porcentagem: number | null; status: string | null }[])
      .filter((x) => (x.status ?? '').toLowerCase() !== 'inativo'));
    if (r.data) setAtual({
      parceiro_id: r.data.parceiro_id, comissao_percentual: r.data.comissao_percentual,
      valor: Number(r.data.valor_total) || Number(r.data.valor) || 0,
    });
  }, [reservaId]);

  useEffect(() => { void carregar(); }, [carregar]);

  if (!reservaId || !atual) return null;

  async function escolher(id: string) {
    setAviso('');
    const { error } = await supabase.from('reservas').update({ parceiro_id: id || null }).eq('id', reservaId);
    if (error) { setAviso('Não foi possível vincular o parceiro.'); return; }
    void carregar();
  }

  const pct = Number(atual.comissao_percentual) || 0;

  return (
    <section className="eda-pg-secao eda-pg-largo">
      <p className="eda-pg-secao-eb">Parceiro</p>
      <h2>Quem indicou ou vendeu</h2>
      <p className="eda-pg-secao-txt">A comissão fica congelada com o percentual do dia da venda.</p>
      <select value={atual.parceiro_id ?? ''} disabled={bloqueado} onChange={(e) => void escolher(e.target.value)}
        style={{ minHeight: 44, width: '100%', marginTop: 10, borderRadius: 12, border: '1px solid var(--ern-borda)', background: 'transparent', color: 'inherit', padding: '0 12px' }}>
        <option value="">Venda direta (sem parceiro)</option>
        {parceiros.map((p) => <option key={p.id} value={p.id}>{p.nome}{p.comissao_porcentagem ? ` · ${p.comissao_porcentagem}%` : ''}</option>)}
      </select>
      {atual.parceiro_id && (
        <p style={{ marginTop: 10, fontSize: 14 }}>
          Comissão: <b>{pct}%</b> de {moeda(atual.valor)} = <b style={{ color: 'var(--ern-destaque)' }}>{moeda(atual.valor * pct / 100)}</b>
        </p>
      )}
      {aviso && <p role="alert" style={{ color: 'var(--ern-erro)', fontSize: 13 }}>{aviso}</p>}
    </section>
  );
}

// Na página de parceiros: comissões do mês (abre no mês atual, com histórico).
export function ComissoesParceirosEDA() {
  const hoje = new Date();
  const [mes, setMes] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [linhas, setLinhas] = useState<{ parceiro_id: string; parceiro: string; reservas: number; pessoas: number; vendido: number; comissao: number }[] | null>(null);

  useEffect(() => {
    let vivo = true;
    const ini = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const fim = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setLinhas(null);
    supabase.rpc('comissoes_parceiros_eda', { p_de: iso(ini), p_ate: iso(fim) })
      .then(({ data, error }) => { if (vivo) setLinhas(error ? [] : (data ?? []) as never); });
    return () => { vivo = false; };
  }, [mes]);

  const total = (linhas ?? []).reduce((n, l) => n + Number(l.comissao), 0);
  const rotulo = mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <section className="cp">
      <header>
        <div>
          <p className="cp-eb">Comissões por viagem do mês</p>
          <h2>{moeda(total)} <small>a repassar</small></h2>
        </div>
        <div className="cp-nav">
          <button type="button" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} aria-label="Mês anterior">‹</button>
          <span>{rotulo}</span>
          <button type="button" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} aria-label="Próximo mês">›</button>
        </div>
      </header>
      {linhas === null ? <p className="cp-mut">Calculando…</p> : linhas.length === 0 ? (
        <p className="cp-mut">Nenhuma reserva com parceiro neste mês. Vincule o parceiro na tela da reserva.</p>
      ) : (
        <ul>
          {linhas.map((l) => (
            <li key={l.parceiro_id}>
              <b>{l.parceiro}</b>
              <span>{l.reservas} reserva(s) · {l.pessoas} pessoa(s) · vendido {moeda(Number(l.vendido))}</span>
              <strong>{moeda(Number(l.comissao))}</strong>
            </li>
          ))}
        </ul>
      )}
      <style jsx>{`
        .cp { border-radius: 18px; border: 1px solid var(--ern-borda); background: var(--ern-painel); padding: 20px; display: grid; gap: 12px; color: var(--ern-texto); }
        header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 12px; }
        .cp-eb { margin: 0; font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--ern-destaque); }
        h2 { margin: 4px 0 0; font-size: 26px; } h2 small { font-size: 13px; color: var(--ern-secundario); font-weight: 400; }
        .cp-nav { display: flex; align-items: center; gap: 8px; text-transform: capitalize; font-size: 14px; }
        .cp-nav button { width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--ern-borda); background: transparent; color: inherit; cursor: pointer; font-size: 18px; }
        .cp-mut { margin: 0; font-size: 13px; color: var(--ern-secundario); }
        ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
        li { display: grid; grid-template-columns: 1fr auto; gap: 2px 12px; padding: 10px 14px; border-radius: 12px; border: 1px solid var(--ern-borda); }
        li span { grid-column: 1; font-size: 12px; color: var(--ern-secundario); }
        li strong { grid-column: 2; grid-row: 1 / span 2; align-self: center; color: var(--ern-destaque); }
      `}</style>
    </section>
  );
}

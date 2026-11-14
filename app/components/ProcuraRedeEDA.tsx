'use client';

// EDA_PROCURA_REDE_V1 — no card "Rede EDA" do painel: flechas recebidas
// (cada "Quero ir!" do visitante é uma flecha lançada), passeios mais
// procurados e reações por tipo, com filtro de período. Só números agregados
// da própria empresa (RPC minhas_reacoes_eda) — nenhum dado do visitante.

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArcoLancaEDA, IconeReacao } from './ReacoesEDA';
import type { Reacao } from '@/lib/reacoesEDA';
import './reacoes-eda.css';

type Linha = { publicacao_id: string; titulo: string | null; passeio_id: string | null; passeio_nome: string | null; reacao: string; total: number };
const ROT: Record<Reacao, string> = { quero_ir: 'Quero ir!', lindeza: 'Que lindeza', encantei: 'Me encantei', pai_degua: "Pai d'égua!", cultura: 'Cultura viva' };
const ORDEM: Reacao[] = ['quero_ir', 'lindeza', 'encantei', 'pai_degua', 'cultura'];
const PERIODOS = [7, 30, 90] as const;
const CHAVE = 'eda.rede.flechas.vistas';

export default function ProcuraRedeEDA() {
  const [dias, setDias] = useState<(typeof PERIODOS)[number]>(30);
  const [aba, setAba] = useState<'procurados' | 'reacoes'>('procurados');
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [erro, setErro] = useState(false);
  const [voando, setVoando] = useState(false);

  useEffect(() => {
    let ativo = true;
    setErro(false);
    void supabase.rpc('minhas_reacoes_eda', { p_dias: dias }).then(({ data, error }) => {
      if (!ativo) return;
      if (error) { setErro(true); setLinhas([]); return; }
      setLinhas((data ?? []) as Linha[]);
    });
    return () => { ativo = false; };
  }, [dias]);

  const flechas = useMemo(() => (linhas ?? []).filter(l => l.reacao === 'quero_ir').reduce((n, l) => n + l.total, 0), [linhas]);

  // Flecha nova desde a última visita: o arco dispara uma vez (compara os últimos 90 dias).
  useEffect(() => {
    if (!voando) return;
    const t = window.setTimeout(() => setVoando(false), 1400);
    return () => window.clearTimeout(t);
  }, [voando]);
  const [comparou, setComparou] = useState(false);
  useEffect(() => {
    if (comparou) return;
    let ativo = true;
    void supabase.rpc('minhas_reacoes_eda', { p_dias: 90 }).then(({ data }) => {
      if (!ativo) return;
      setComparou(true);
      const n = ((data ?? []) as Linha[]).filter(l => l.reacao === 'quero_ir').reduce((s, l) => s + l.total, 0);
      try {
        const vistas = Number(localStorage.getItem(CHAVE) || 0);
        if (n > vistas) setVoando(true);
        localStorage.setItem(CHAVE, String(n));
      } catch { /* sem armazenamento */ }
    });
    return () => { ativo = false; };
  }, [comparou]);

  const procurados = useMemo(() => {
    const mapa = new Map<string, { nome: string; quero: number; total: number }>();
    for (const l of linhas ?? []) {
      const chave = l.passeio_id ?? l.publicacao_id;
      const nome = l.passeio_nome?.trim() || l.titulo?.trim() || 'Publicação';
      const atual = mapa.get(chave) ?? { nome, quero: 0, total: 0 };
      atual.total += l.total;
      if (l.reacao === 'quero_ir') atual.quero += l.total;
      mapa.set(chave, atual);
    }
    return [...mapa.values()].sort((a, b) => b.quero - a.quero || b.total - a.total).slice(0, 5);
  }, [linhas]);

  const porTipo = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of linhas ?? []) c[l.reacao] = (c[l.reacao] ?? 0) + l.total;
    return ORDEM.map(r => ({ r, n: c[r] ?? 0 }));
  }, [linhas]);
  const maior = Math.max(1, ...procurados.map(p => p.quero || p.total), ...porTipo.map(p => p.n));

  return (
    <div className="eda-procura">
      <div className="eda-procura-flechas" aria-live="polite">
        <span className={`eda-procura-arco${voando ? ' eda-procura-voo' : ''}`}><ArcoLancaEDA ativo={voando} tamanho={34} /></span>
        <div>
          <b>{linhas === null ? '—' : flechas}</b>
          <small>{flechas === 1 ? 'flecha recebida' : 'flechas recebidas'} · “Quero ir!” em {dias} dias</small>
        </div>
      </div>

      <div className="eda-procura-filtros">
        <div role="group" aria-label="Ver" className="eda-procura-chips">
          <button type="button" aria-pressed={aba === 'procurados'} onClick={() => setAba('procurados')}>Mais procurados</button>
          <button type="button" aria-pressed={aba === 'reacoes'} onClick={() => setAba('reacoes')}>Reações</button>
        </div>
        <div role="group" aria-label="Período" className="eda-procura-chips">
          {PERIODOS.map(p => <button key={p} type="button" aria-pressed={dias === p} onClick={() => setDias(p)}>{p}d</button>)}
        </div>
      </div>

      {erro && <p className="eda-procura-vazio">Não deu para carregar as reações agora.</p>}
      {!erro && linhas !== null && aba === 'procurados' && (
        procurados.length === 0
          ? <p className="eda-procura-vazio">Nenhuma reação neste período. Publique seus passeios na Rede para receber flechas.</p>
          : <ol className="eda-procura-lista">
              {procurados.map((p, i) => (
                <li key={p.nome + i}>
                  <span className="eda-procura-pos">{i + 1}</span>
                  <span className="eda-procura-nome">{p.nome}</span>
                  <span className="eda-procura-barra" aria-hidden="true"><i style={{ width: `${((p.quero || p.total) / maior) * 100}%` }} /></span>
                  <b title={`${p.quero} “Quero ir!” · ${p.total} reações`}>{p.quero}<small>🏹</small></b>
                </li>
              ))}
            </ol>
      )}
      {!erro && linhas !== null && aba === 'reacoes' && (
        <ul className="eda-procura-lista eda-procura-tipos">
          {porTipo.map(({ r, n }) => (
            <li key={r}>
              <span className="eda-procura-ic"><IconeReacao r={r} ativo={false} /></span>
              <span className="eda-procura-nome">{ROT[r]}</span>
              <span className="eda-procura-barra" aria-hidden="true"><i style={{ width: `${(n / maior) * 100}%` }} /></span>
              <b>{n}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

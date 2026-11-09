'use client';

// EDA_IARA_FUNIL_V1: painel do funil da Iara (sem dados pessoais).
// geral=true → visão de toda a plataforma (só administração da Encantos).
// geral=false → só os passeios da operadora logada.

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CabecalhoEDA, PaginaEDA, VazioEDA } from '@/app/components/PadraoPaginaEDA';

type Linha = { etapa: string; total: number; passeio: string; idioma: string };
const ETAPAS: [string, string, string][] = [
  ['conversa', 'Conversas', 'visitantes que falaram com a Iara'],
  ['inspiracao', 'Inspiração', 'viram experiências e curiosidades'],
  ['qualificacao', 'Qualificação', 'informaram datas, grupo ou estilo'],
  ['proposta', 'Proposta', 'receberam vagas e valores'],
  ['fechamento', 'Fechamento', 'abriram o pedido para a operadora'],
  ['pedido', 'Pedidos', 'enviaram o pedido com consentimento'],
];

export default function FunilIaraEDA({ geral }: { geral: boolean }) {
  const [dias, setDias] = useState(30);
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    setLinhas(null); setErro('');
    supabase.rpc('funil_iara_eda', { p_dias: dias, p_geral: geral }).then(({ data, error }) => {
      if (!ativo) return;
      if (error) { setErro('Não foi possível carregar o funil.'); setLinhas([]); return; }
      setLinhas((data ?? []) as Linha[]);
    });
    return () => { ativo = false; };
  }, [dias, geral]);

  const { porEtapa, porPasseio, porIdioma } = useMemo(() => {
    const porEtapa: Record<string, number> = {};
    const porPasseio = new Map<string, Record<string, number>>();
    const porIdioma: Record<string, number> = {};
    for (const l of linhas ?? []) {
      porEtapa[l.etapa] = (porEtapa[l.etapa] ?? 0) + l.total;
      const p = porPasseio.get(l.passeio) ?? {};
      p[l.etapa] = (p[l.etapa] ?? 0) + l.total;
      porPasseio.set(l.passeio, p);
      if (l.etapa === 'conversa') porIdioma[l.idioma] = (porIdioma[l.idioma] ?? 0) + l.total;
    }
    return { porEtapa, porPasseio: [...porPasseio].sort((a, b) => (b[1].pedido ?? 0) - (a[1].pedido ?? 0) || (b[1].proposta ?? 0) - (a[1].proposta ?? 0)), porIdioma };
  }, [linhas]);

  const base = porEtapa.conversa ?? 0;
  const pct = (n: number) => (base ? `${Math.round((n / base) * 100)}%` : '—');

  return (
    <PaginaEDA>
      <CabecalhoEDA
        etiqueta={geral ? 'Comando EDA · Iara' : 'Relatórios · Iara'}
        titulo={geral ? 'Funil da Iara — plataforma' : 'Funil da Iara — seus passeios'}
        resumo="Quantos visitantes avançam em cada etapa da conversa com a Iara. Sem nomes nem conversas: só números (LGPD)."
        acoes={
          <div className="eda-pg-acoes">
            {[7, 30, 90].map(d => (
              <button key={d} type="button" className={`eda-pg-bt${dias === d ? ' eda-pg-bt-ouro' : ''}`} aria-pressed={dias === d} onClick={() => setDias(d)}>{d} dias</button>
            ))}
          </div>
        }
      />
      {erro && <p className="eda-pg-aviso eda-pg-aviso-er" role="alert">{erro}</p>}
      {linhas === null ? (
        <p className="eda-pg-estado">Carregando funil…</p>
      ) : !base ? (
        <VazioEDA titulo="Ainda sem conversas no período" texto={geral ? 'Quando visitantes conversarem com a Iara, o funil aparece aqui.' : 'Quando visitantes conversarem com a Iara sobre os seus passeios, o funil aparece aqui.'} />
      ) : (
        <>
          <section className="eda-pg-tabela-caixa" style={{ padding: 14, display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            {ETAPAS.map(([id, nome, desc]) => (
              <article key={id} className="eda-pg-cartao" style={{ display: 'grid', gap: 4 }}>
                <span className="eda-pg-texto-mut" style={{ fontSize: 12 }}>{nome}</span>
                <strong style={{ fontSize: 26 }}>{porEtapa[id] ?? 0}</strong>
                <span className="eda-pg-texto-mut" style={{ fontSize: 11.5 }}>{id === 'conversa' ? desc : `${pct(porEtapa[id] ?? 0)} · ${desc}`}</span>
              </article>
            ))}
          </section>
          <section className="eda-pg-tabela-caixa" style={{ padding: 14 }}>
            <h2 className="eda-pg-bloco-titulo" style={{ margin: '0 0 10px' }}>Por passeio</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="eda-pg-tabela" style={{ width: '100%' }}>
                <thead><tr><th>Passeio</th>{ETAPAS.map(([id, nome]) => <th key={id}>{nome}</th>)}</tr></thead>
                <tbody>
                  {porPasseio.map(([nome, e]) => (
                    <tr key={nome}><td>{nome === '—' ? 'Interesse geral' : nome}</td>{ETAPAS.map(([id]) => <td key={id}>{e[id] ?? 0}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="eda-pg-texto-mut" style={{ fontSize: 12, marginTop: 10 }}>
              Idiomas das conversas: {Object.entries(porIdioma).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}
            </p>
          </section>
        </>
      )}
    </PaginaEDA>
  );
}

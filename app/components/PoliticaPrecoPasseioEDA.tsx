'use client';

// EDA_FAMILIA_RESERVA_V1: regra comercial do passeio que a reserva herda:
// como o preço é cobrado, mínimo de pessoas, criança paga % e colo não paga.
// Salva à parte do formulário do passeio (como a agenda de saídas).

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Politica = {
  preco_modalidade: 'por_pessoa' | 'por_grupo' | 'sob_consulta';
  capacidade_minima: string;
  crianca_ativa: boolean;
  crianca_idade_max: string;
  crianca_percentual: string;
  colo_ativo: boolean;
  colo_idade_max: string;
};

export default function PoliticaPrecoPasseioEDA({ passeioId }: { passeioId: string }) {
  const [p, setP] = useState<Politica | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativo = true;
    setP(null); setAviso(null);
    supabase.from('passeios')
      .select('preco_modalidade,capacidade_minima,crianca_idade_max,crianca_percentual,colo_idade_max')
      .eq('id', passeioId).maybeSingle()
      .then(({ data }) => {
        if (!ativo || !data) return;
        setP({
          preco_modalidade: (data.preco_modalidade ?? 'por_pessoa') as Politica['preco_modalidade'],
          capacidade_minima: String(data.capacidade_minima ?? 1),
          crianca_ativa: data.crianca_idade_max != null,
          crianca_idade_max: String(data.crianca_idade_max ?? 11),
          crianca_percentual: String(data.crianca_percentual ?? 50),
          colo_ativo: data.colo_idade_max != null,
          colo_idade_max: String(data.colo_idade_max ?? 2),
        });
      });
    return () => { ativo = false; };
  }, [passeioId]);

  if (!p) return null;
  const set = (c: Partial<Politica>) => { setP({ ...p, ...c }); setAviso(null); };

  async function salvar() {
    if (!p) return;
    const crianca = Number(p.crianca_idade_max), pct = Number(p.crianca_percentual), colo = Number(p.colo_idade_max);
    if (p.crianca_ativa && (!(crianca >= 1 && crianca <= 17) || !(pct >= 0 && pct <= 100))) {
      setAviso({ tipo: 'erro', texto: 'Criança: idade de 1 a 17 anos e percentual de 0 a 100.' }); return;
    }
    if (p.colo_ativo && (!(colo >= 0 && colo <= 6) || (p.crianca_ativa && colo >= crianca))) {
      setAviso({ tipo: 'erro', texto: 'Colo: até 6 anos e menor que a idade de criança.' }); return;
    }
    setSalvando(true);
    const { error } = await supabase.from('passeios').update({
      preco_modalidade: p.preco_modalidade,
      capacidade_minima: Math.max(1, Math.floor(Number(p.capacidade_minima) || 1)),
      crianca_idade_max: p.crianca_ativa ? crianca : null,
      crianca_percentual: p.crianca_ativa ? pct : null,
      colo_idade_max: p.colo_ativo ? colo : null,
    }).eq('id', passeioId).select('id').single();
    setSalvando(false);
    setAviso(error ? { tipo: 'erro', texto: 'Não foi possível salvar a política de preço.' } : { tipo: 'ok', texto: 'Política salva. Novas reservas já usam essa regra.' });
  }

  const porPessoa = p.preco_modalidade === 'por_pessoa';
  return (
    <section className="eda-pol" aria-label="Política de preço">
      <p className="eda-pol-tit">Política de preço</p>
      <span className="eda-pol-nota">A reserva herda esta regra para sugerir o valor. Todos ocupam vaga no barco, inclusive crianças de colo.</span>
      <div className="eda-pol-grade">
        <label>Cobrança
          <select value={p.preco_modalidade} onChange={(e) => set({ preco_modalidade: e.target.value as Politica['preco_modalidade'] })}>
            <option value="por_pessoa">Por pessoa</option>
            <option value="por_grupo">Por grupo (preço fechado)</option>
            <option value="sob_consulta">Sob consulta</option>
          </select>
        </label>
        <label>Mínimo de pessoas
          <input type="number" min={1} max={500} value={p.capacidade_minima} onChange={(e) => set({ capacidade_minima: e.target.value })} />
        </label>
      </div>
      {porPessoa && <>
        <label className="eda-pol-check"><input type="checkbox" checked={p.crianca_ativa} onChange={(e) => set({ crianca_ativa: e.target.checked })} /> Criança paga valor diferente</label>
        {p.crianca_ativa && (
          <div className="eda-pol-grade">
            <label>Até quantos anos<input type="number" min={1} max={17} value={p.crianca_idade_max} onChange={(e) => set({ crianca_idade_max: e.target.value })} /></label>
            <label>Paga (% do adulto)<input type="number" min={0} max={100} value={p.crianca_percentual} onChange={(e) => set({ crianca_percentual: e.target.value })} /></label>
          </div>
        )}
        <label className="eda-pol-check"><input type="checkbox" checked={p.colo_ativo} onChange={(e) => set({ colo_ativo: e.target.checked })} /> Criança de colo não paga</label>
        {p.colo_ativo && (
          <div className="eda-pol-grade">
            <label>Colo até quantos anos<input type="number" min={0} max={6} value={p.colo_idade_max} onChange={(e) => set({ colo_idade_max: e.target.value })} /></label>
          </div>
        )}
      </>}
      {aviso && <span role={aviso.tipo === 'erro' ? 'alert' : 'status'} className={aviso.tipo === 'erro' ? 'eda-pol-erro' : 'eda-pol-ok'}>{aviso.texto}</span>}
      <button type="button" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar política'}</button>
      <style jsx>{`
        .eda-pol { display: grid; gap: 10px; margin-bottom: 18px; padding: 18px; border-radius: 18px; border: 1px solid var(--ern-borda, #00000018); }
        .eda-pol-tit { margin: 0; font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--ern-destaque, #b8761c); }
        .eda-pol-nota { font-size: 12px; line-height: 1.6; color: var(--ern-secundario, #6b756f); }
        .eda-pol-grade { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
        label { display: grid; gap: 4px; font-size: 12px; }
        .eda-pol-check { display: flex; align-items: center; gap: 8px; font-size: 13px; }
        input:not([type='checkbox']), select { min-height: 42px; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--ern-borda, #00000022); background: transparent; color: inherit; font-size: 14px; }
        .eda-pol-erro { font-size: 12px; color: var(--ern-erro, #dc2626); }
        .eda-pol-ok { font-size: 12px; color: #15803d; }
        button { justify-self: start; min-height: 40px; padding: 0 16px; border-radius: 999px; border: 0; background: #8a4b12; color: #fff; font-weight: 700; font-size: 13px; cursor: pointer; }
        button:disabled { opacity: .5; }
      `}</style>
    </section>
  );
}

'use client';

// EDA_CLIENTES_RELACIONAMENTO_V1: o cliente como aliança duradoura.
// Histórico real das reservas + preferências, idioma, origem e consentimento.
// Salvo à parte do formulário de contato.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import CampoOpcoesEDA, { CampoChipsEDA } from '@/app/components/CampoOpcoesEDA';
import { IDIOMAS, ORIGENS_CLIENTE, PREFERENCIAS_CLIENTE } from '@/lib/opcoesEDA';
import { dataCurtaEDA } from '@/lib/passeiosPublicosEDA';

type Historico = {
  viagens: number; proximas: number; canceladas: number; valor_total: number;
  primeira: string | null; ultima: string | null; proxima: string | null; categoria_favorita: string | null;
  reservas: { id: string; passeio: string | null; inicio: string; fim: string; status: string | null; pessoas: number | null; valor: number }[];
};

type Rel = { idioma_preferido: string; data_nascimento: string; origem: string; preferencias: string; aceita_novidades: boolean };

const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function RelacionamentoClienteEDA({ clienteId, bloqueado }: { clienteId: string; bloqueado?: boolean }) {
  const [hist, setHist] = useState<Historico | null>(null);
  const [rel, setRel] = useState<Rel | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');

  const carregar = useCallback(async () => {
    const [h, c] = await Promise.all([
      supabase.rpc('historico_cliente_eda', { p_cliente_id: clienteId }),
      supabase.from('clientes').select('idioma_preferido,data_nascimento,origem,preferencias,aceita_novidades').eq('id', clienteId).maybeSingle(),
    ]);
    if (!h.error) setHist(h.data as Historico);
    if (c.data) setRel({
      idioma_preferido: c.data.idioma_preferido ?? '',
      data_nascimento: c.data.data_nascimento ?? '',
      origem: c.data.origem ?? '',
      preferencias: (c.data.preferencias ?? []).join(', '),
      aceita_novidades: Boolean(c.data.aceita_novidades),
    });
  }, [clienteId]);

  useEffect(() => { void carregar(); }, [carregar]);

  async function salvar() {
    if (!rel) return;
    setSalvando(true); setAviso('');
    const { error } = await supabase.from('clientes').update({
      idioma_preferido: rel.idioma_preferido || null,
      data_nascimento: rel.data_nascimento || null,
      origem: rel.origem || null,
      preferencias: rel.preferencias.split(',').map((p) => p.trim()).filter(Boolean),
      aceita_novidades: rel.aceita_novidades,
    }).eq('id', clienteId);
    setSalvando(false);
    setAviso(error ? 'Não foi possível salvar o relacionamento.' : 'Relacionamento salvo.');
  }

  const aniversario = (() => {
    if (!rel?.data_nascimento) return null;
    const [, m, d] = rel.data_nascimento.split('-').map(Number);
    const hoje = new Date(); const prox = new Date(hoje.getFullYear(), m - 1, d);
    if (prox < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) prox.setFullYear(prox.getFullYear() + 1);
    const dias = Math.round((prox.getTime() - new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime()) / 86_400_000);
    return dias <= 30 ? (dias === 0 ? 'Aniversário hoje' : `Aniversário em ${dias} dia(s)`) : null;
  })();

  return (
    <section className="rc">
      <p className="rc-eb">Relacionamento</p>
      <h2>Histórico com a operadora</h2>

      {hist && (
        <div className="rc-kpis">
          <div><b>{hist.viagens}</b><span>viagem(ns) feita(s)</span></div>
          <div><b>{hist.proximas}</b><span>próxima(s)</span></div>
          <div><b>{moeda(Number(hist.valor_total) || 0)}</b><span>em reservas</span></div>
          <div><b>{hist.ultima ? dataCurtaEDA(hist.ultima) : '—'}</b><span>última viagem</span></div>
        </div>
      )}
      {hist && (hist.viagens > 0 || aniversario || hist.categoria_favorita) && (
        <p className="rc-dica">
          {hist.viagens > 0 && `Cliente de retorno desde ${dataCurtaEDA(hist.primeira)}. `}
          {hist.categoria_favorita && `Prefere ${hist.categoria_favorita.toLowerCase()}. `}
          {aniversario && <b>{aniversario}.</b>}
        </p>
      )}

      {hist && hist.reservas.length > 0 && (
        <ul className="rc-lista">
          {hist.reservas.map((r) => (
            <li key={r.id} data-cancelada={(r.status ?? '').toLowerCase() === 'cancelada' || undefined}>
              <Link href={`/reservas/editar/${r.id}`}>{r.passeio || 'Reserva'}</Link>
              <span>{r.inicio === r.fim ? dataCurtaEDA(r.inicio) : `${dataCurtaEDA(r.inicio)} – ${dataCurtaEDA(r.fim)}`}
                {' · '}{r.pessoas ?? 1} pessoa(s) · {moeda(Number(r.valor) || 0)}{r.status ? ` · ${r.status}` : ''}</span>
            </li>
          ))}
        </ul>
      )}
      {hist && hist.reservas.length === 0 && <p className="rc-nota">Nenhuma reserva vinculada a este cadastro ainda.</p>}

      {rel && (
        <div className="rc-form">
          <label>Idioma de atendimento
            <CampoOpcoesEDA valor={rel.idioma_preferido} opcoes={IDIOMAS} disabled={bloqueado || salvando} className="rc-campo"
              onChange={(v) => setRel({ ...rel, idioma_preferido: v })} />
          </label>
          <label>Como conheceu
            <CampoOpcoesEDA valor={rel.origem} opcoes={ORIGENS_CLIENTE} disabled={bloqueado || salvando} className="rc-campo"
              onChange={(v) => setRel({ ...rel, origem: v })} />
          </label>
          <label>Data de nascimento
            <input type="date" className="rc-campo" value={rel.data_nascimento} disabled={bloqueado || salvando}
              onChange={(e) => setRel({ ...rel, data_nascimento: e.target.value })} />
          </label>
          <div className="rc-largo">
            <span>Interesses</span>
            <CampoChipsEDA valor={rel.preferencias} opcoes={PREFERENCIAS_CLIENTE} disabled={bloqueado || salvando}
              onChange={(v) => setRel({ ...rel, preferencias: v })} />
          </div>
          <label className="rc-check rc-largo">
            <input type="checkbox" checked={rel.aceita_novidades} disabled={bloqueado || salvando}
              onChange={(e) => setRel({ ...rel, aceita_novidades: e.target.checked })} />
            O cliente autorizou receber novidades e ofertas da operadora (registramos a data do aceite).
          </label>
          <div className="rc-acoes rc-largo">
            {aviso && <span className="rc-nota">{aviso}</span>}
            <button type="button" onClick={salvar} disabled={bloqueado || salvando}>{salvando ? 'Salvando…' : 'Salvar relacionamento'}</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .rc { min-width: 0; border-radius: 16px; border: 1px solid var(--ern-borda); background: var(--ern-painel); padding: 24px; display: grid; gap: 14px; color: var(--ern-texto); }
        .rc h2 { margin: 0; font-size: 22px; }
        .rc-eb { margin: 0; font-size: 11px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--ern-destaque); }
        .rc-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; }
        .rc-kpis div { display: grid; gap: 2px; padding: 12px; border-radius: 14px; border: 1px solid var(--ern-borda); background: var(--ern-fundo); }
        .rc-kpis b { font-size: 18px; } .rc-kpis span { font-size: 11px; color: var(--ern-secundario); }
        .rc-dica { margin: 0; font-size: 14px; color: var(--ern-secundario); } .rc-dica b { color: var(--ern-destaque); }
        .rc-nota { font-size: 12px; color: var(--ern-secundario); }
        .rc-lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
        .rc-lista li { display: flex; flex-wrap: wrap; gap: 4px 10px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--ern-borda); font-size: 13px; }
        .rc-lista li[data-cancelada] { opacity: .55; }
        .rc-lista :global(a) { color: var(--ern-destaque); font-weight: 600; }
        .rc-lista span { color: var(--ern-secundario); font-size: 12px; }
        .rc-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; padding-top: 12px; border-top: 1px solid var(--ern-borda); }
        .rc-form label, .rc-largo > span { display: grid; gap: 6px; font-size: 12px; color: var(--ern-secundario); }
        .rc-largo { grid-column: 1 / -1; }
        .rc-form :global(.rc-campo) { min-height: 44px; width: 100%; border-radius: 12px; border: 1px solid var(--ern-borda); background: var(--ern-fundo); color: var(--ern-texto); padding: 0 12px; font-size: 14px; }
        .rc-check { display: flex !important; grid-template-columns: none; align-items: flex-start; gap: 10px !important; font-size: 13px !important; color: var(--ern-texto) !important; }
        .rc-check input { margin-top: 3px; width: 18px; height: 18px; accent-color: var(--ern-destaque); }
        .rc-acoes { display: flex; justify-content: flex-end; align-items: center; gap: 12px; }
        .rc-acoes button { min-height: 44px; padding: 0 18px; border-radius: 12px; border: 1px solid var(--ern-destaque); background: var(--ern-destaque); color: #10140f; font-weight: 700; cursor: pointer; }
        .rc-acoes button:disabled { opacity: .5; }
      `}</style>
    </section>
  );
}

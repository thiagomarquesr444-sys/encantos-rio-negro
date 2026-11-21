'use client';

// EDA_MEMORIA_TRECHOS_V1: tempo real de ida, volta e viagem completa deste passeio,
// medido nas viagens da própria operadora (registros do guia e GPS do barco).

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MIN_VIAGENS_HISTORICO, type HistoricoTrechoEDA } from '@/lib/operacaoAoVivoEDA';

type Historico = Partial<Record<'ida' | 'volta' | 'completa', HistoricoTrechoEDA>>;

const ROTULO = { ida: 'Ida', volta: 'Volta', completa: 'Viagem completa' } as const;
const hm = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${String(Math.round(m % 60)).padStart(2, '0')}` : `${Math.round(m)} min`);

export default function HistoricoTrechosEDA({ passeioId }: { passeioId: string }) {
  const [h, setH] = useState<Historico | null>(null);
  useEffect(() => {
    let vivo = true;
    supabase.rpc('historico_trechos_passeio_eda', { p_passeio_id: passeioId })
      .then(({ data, error }) => { if (vivo) setH(error ? {} : (data ?? {}) as Historico); });
    return () => { vivo = false; };
  }, [passeioId]);

  if (!h) return null;
  const itens = (['ida', 'volta', 'completa'] as const).filter((k) => h[k]);

  return (
    <section className="ht" aria-label="Tempo real das viagens">
      <p className="ht-eb">Tempo real das viagens</p>
      {!itens.length ? (
        <p className="ht-vazio">
          Ainda sem viagens medidas. O tempo aparece aqui depois que o guia marcar Partiu, Chegou ao destino e Retornou no painel de bordo.
          Com embarque e destino marcados no mapa da logística, o GPS do barco também mede.
        </p>
      ) : (
        <div className="ht-grade">
          {itens.map((k) => {
            const t = h[k]!;
            const pouco = t.n < MIN_VIAGENS_HISTORICO;
            return (
              <div key={k} className="ht-card">
                <small>{ROTULO[k]}</small>
                <b>{hm(t.mediana_min)}</b>
                <span>{t.n > 1 ? `de ${hm(t.p25_min)} a ${hm(t.p75_min)}` : 'uma medição'}</span>
                <em>{t.n} viagem(ns){pouco ? ' · ainda indicativo' : ''}</em>
              </div>
            );
          })}
        </div>
      )}
      <style jsx>{`
        .ht { margin-top: 14px; padding: 14px; border-radius: 16px; border: 1px solid var(--ern-borda, rgba(255,255,255,.12)); }
        .ht-eb { margin: 0 0 8px; font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--ern-secundario, #b4c8bb); }
        .ht-vazio { margin: 0; font-size: 13px; line-height: 1.5; color: var(--ern-secundario, #b4c8bb); }
        .ht-grade { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
        .ht-card { display: grid; gap: 2px; padding: 10px 12px; border-radius: 12px; background: rgb(255 255 255 / 4%); min-width: 0; }
        .ht-card small { font-size: 11px; color: var(--ern-secundario, #b4c8bb); }
        .ht-card b { font-size: 20px; font-variant-numeric: tabular-nums; }
        .ht-card span, .ht-card em { font-size: 11.5px; font-style: normal; color: var(--ern-secundario, #b4c8bb); }
        @media (max-width: 639px) {
          .ht { padding: 10px; border-radius: 12px; }
          .ht-grade { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
          .ht-card { padding: 8px; } .ht-card b { font-size: 16px; }
        }
      `}</style>
    </section>
  );
}

'use client';

// EDA_OPERADORES_NUMEROS_V1: números reais da Rede (passeios publicados,
// operadoras, cidades e saídas abertas). Só aparece quando há dados.

import { useEffect, useState } from 'react';
import { listarPasseiosPublicosEDA } from '@/lib/passeiosPublicosEDA';

type Lang = 'PT' | 'EN' | 'ES';
const T = {
  PT: { titulo: 'A Rede EDA hoje', passeios: 'passeios publicados', operadoras: 'operadoras', cidades: 'cidades', saidas: 'saídas abertas' },
  EN: { titulo: 'The EDA Network today', passeios: 'published tours', operadoras: 'operators', cidades: 'cities', saidas: 'open departures' },
  ES: { titulo: 'La Red EDA hoy', passeios: 'paseos publicados', operadoras: 'operadoras', cidades: 'ciudades', saidas: 'salidas abiertas' },
};

export default function NumerosRedeEDA({ lang = 'PT' }: { lang?: Lang }) {
  const [n, setN] = useState<{ passeios: number; operadoras: number; cidades: number; saidas: number } | null>(null);
  useEffect(() => {
    let ativo = true;
    listarPasseiosPublicosEDA().then(l => {
      if (!ativo || !l.length) return;
      const cidade = (c: string | null) => (c ?? '').split(/\s*-\s*/)[0].trim().toLowerCase();
      setN({
        passeios: l.length,
        operadoras: new Set(l.map(p => p.operadora_slug)).size,
        cidades: new Set(l.map(p => cidade(p.cidade)).filter(Boolean)).size,
        saidas: l.reduce((s, p) => s + (Number(p.saidas_abertas) || 0), 0),
      });
    }).catch(() => undefined);
    return () => { ativo = false; };
  }, []);
  if (!n) return null;
  const t = T[lang];
  const itens: [number, string][] = [[n.passeios, t.passeios], [n.operadoras, t.operadoras], [n.cidades, t.cidades], [n.saidas, t.saidas]];
  return (
    <section aria-label={t.titulo} className="border-t border-white/[0.06] px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-10 gap-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F4C77E]">{t.titulo}</p>
        {itens.filter(([v]) => v > 0).map(([v, r]) => (
          <p key={r} className="text-[#B8C9BF]"><strong className="mr-1.5 text-2xl font-semibold tabular-nums text-[#F5F3EA]">{v}</strong>{r}</p>
        ))}
      </div>
    </section>
  );
}

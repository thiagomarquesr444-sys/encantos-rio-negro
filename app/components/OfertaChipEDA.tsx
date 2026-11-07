'use client';

// EDA_REDE_OFERTA_V1: no feed da Rede, a publicação ligada a um passeio
// mostra preço e próxima saída reais (mesma fonte do portal, em cache).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { dataCurtaEDA, listarPasseiosPublicosEDA, precoPasseioEDA, type PasseioPublicoEDA } from '@/lib/passeiosPublicosEDA';

export default function OfertaChipEDA({ passeioId, href }: { passeioId: string; href: string }) {
  const [p, setP] = useState<PasseioPublicoEDA | null>(null);
  useEffect(() => {
    let ativo = true;
    listarPasseiosPublicosEDA().then(l => { if (ativo) setP(l.find(x => x.id === passeioId) ?? null); }).catch(() => undefined);
    return () => { ativo = false; };
  }, [passeioId]);
  if (!p) return null;
  const preco = p.preco_modalidade === 'sob_consulta' ? null : precoPasseioEDA(p.preco);
  return (
    <Link href={href} className="eda-oferta-chip">
      <span aria-hidden="true">✦</span>
      <span>
        <strong>{p.nome}</strong>
        <small>{[preco ?? 'Sob consulta', p.proxima_saida && `próxima saída ${dataCurtaEDA(p.proxima_saida)}`, p.proxima_saida_vagas != null && `${p.proxima_saida_vagas} vagas`].filter(Boolean).join(' · ')}</small>
      </span>
      <style jsx>{`
        :global(.eda-oferta-chip) { display: flex; align-items: center; gap: 10px; margin-top: 10px; padding: 10px 12px; border-radius: 14px; border: 1px solid #e3a14466; background: #e3a14412; color: inherit; text-decoration: none; }
        :global(.eda-oferta-chip) > span:first-child { color: #f4c77e; }
        :global(.eda-oferta-chip) strong { display: block; font-size: 13px; }
        :global(.eda-oferta-chip) small { display: block; font-size: 12px; opacity: .8; }
      `}</style>
    </Link>
  );
}

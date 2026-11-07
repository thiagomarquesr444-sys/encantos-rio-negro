'use client';

// EDA_PUBLICACAO_OFERTA_V1: card da oferta na publicação — preço, próxima saída
// e vagas reais do passeio, com pedido direto à operadora.

import { useEffect, useState } from 'react';
import {
  dataCurtaEDA, listarPasseiosPublicosEDA, precoPasseioEDA, rotuloModalidadeEDA, whatsappPasseioEDA,
  type PasseioPublicoEDA,
} from '@/lib/passeiosPublicosEDA';

export default function OfertaPasseioEDA({ passeioId, operadoraSlug }: { passeioId: string; operadoraSlug: string }) {
  const [p, setP] = useState<PasseioPublicoEDA | null>(null);

  useEffect(() => {
    let vivo = true;
    listarPasseiosPublicosEDA(operadoraSlug)
      .then((lista) => { if (vivo) setP(lista.find((x) => x.id === passeioId) ?? null); })
      .catch(() => { /* sem card */ });
    return () => { vivo = false; };
  }, [passeioId, operadoraSlug]);

  if (!p) return null;
  const preco = precoPasseioEDA(p.preco);
  const zap = whatsappPasseioEDA(p);

  return (
    <aside className="op">
      {p.fotos?.[0] && <img src={p.fotos[0]} alt="" loading="lazy" />}
      <div>
        <small>Oferta · {p.categoria || 'Experiência'}</small>
        <b>{p.nome}</b>
        <span>
          {preco ? `${preco} ${rotuloModalidadeEDA(p.preco_modalidade)}` : 'Valor sob consulta'}
          {p.duracao ? ` · ${p.duracao}` : ''}
        </span>
        <span className="op-data">
          {p.proxima_saida
            ? `Próxima saída ${dataCurtaEDA(p.proxima_saida)} · ${p.proxima_saida_vagas} vaga${p.proxima_saida_vagas === 1 ? '' : 's'}`
            : 'Datas sob consulta'}
        </span>
        {zap && <a href={zap} target="_blank" rel="noopener noreferrer">Quero esta experiência</a>}
      </div>
      <style jsx>{`
        .op { display: grid; grid-template-columns: minmax(0, 160px) 1fr; gap: 16px; margin: 32px auto 0; max-width: 768px; padding: 14px; border-radius: 20px; border: 1px solid #d6d2c8; background: #fffaf2; color: #0f1c17; }
        @media (max-width: 560px) { .op { grid-template-columns: 1fr; } }
        img { width: 100%; height: 100%; min-height: 120px; object-fit: cover; border-radius: 14px; }
        div { display: grid; gap: 4px; align-content: center; }
        small { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #8a4b12; font-weight: 700; }
        b { font-size: 20px; } span { font-size: 14px; color: #3d4a43; }
        .op-data { color: #0f5132; font-weight: 600; }
        a { justify-self: start; margin-top: 8px; padding: 10px 18px; border-radius: 999px; background: #8a4b12; color: #fff; font-weight: 700; text-decoration: none; }
      `}</style>
    </aside>
  );
}

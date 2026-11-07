'use client';

// EDA_DESTINOS_CONECTADOS_V1: o destino mostra os passeios reais das operadoras
// naquela cidade, com a próxima saída cadastrada (sem disponibilidade inventada).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  dataCurtaEDA, listarPasseiosPublicosEDA, precoPasseioEDA, whatsappPasseioEDA, type PasseioPublicoEDA,
} from '@/lib/passeiosPublicosEDA';

type Lang = 'PT' | 'EN' | 'ES';
const T = {
  PT: { titulo: 'Passeios disponíveis aqui', nenhum: 'Ainda não há passeios publicados nesta cidade. Fale com a Rede para montar o seu.', proxima: 'Próxima saída', sob: 'Sob consulta', vagas: 'vagas', falar: 'Chamar no WhatsApp', perfil: 'Ver operadora', verificada: 'Verificada' },
  EN: { titulo: 'Tours available here', nenhum: 'No tours published in this city yet. Contact the Network to plan yours.', proxima: 'Next departure', sob: 'On request', vagas: 'seats', falar: 'Message on WhatsApp', perfil: 'View operator', verificada: 'Verified' },
  ES: { titulo: 'Paseos disponibles aquí', nenhum: 'Aún no hay paseos publicados en esta ciudad. Hable con la Red para armar el suyo.', proxima: 'Próxima salida', sob: 'A consultar', vagas: 'plazas', falar: 'Escribir por WhatsApp', perfil: 'Ver operadora', verificada: 'Verificada' },
};

let cache: Promise<PasseioPublicoEDA[]> | null = null;
const norm = (s: string | null | undefined) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// "Santa Isabel - AM" também casa com "Santa Isabel do Rio Negro".
function contida(cidade: string | null, alvo: string) {
  const c = norm(cidade).replace(/\s*-\s*am\b.*$/, '').trim();
  return c.length >= 5 && alvo.startsWith(c);
}

export default function PasseiosDestinoEDA({ cidade, lang = 'PT', somentePesca = false }: { cidade: string; lang?: Lang; somentePesca?: boolean }) {
  const [lista, setLista] = useState<PasseioPublicoEDA[] | null>(null);
  const t = T[lang];

  useEffect(() => {
    let ativo = true;
    cache ??= listarPasseiosPublicosEDA().catch(() => { cache = null; return []; });
    cache.then(todos => {
      if (!ativo) return;
      const alvo = norm(cidade);
      setLista(todos.filter(p =>
        (norm(p.cidade).includes(alvo) || norm(p.ponto_embarque).includes(alvo) || contida(p.cidade, alvo)) &&
        (!somentePesca || norm(`${p.categoria} ${p.nome}`).includes('pesca')))
        // Com saída aberta primeiro, depois destaque.
        .sort((a, b) => (b.saidas_abertas > 0 ? 1 : 0) - (a.saidas_abertas > 0 ? 1 : 0) || Number(b.destaque) - Number(a.destaque))
        .slice(0, 6));
    });
    return () => { ativo = false; };
  }, [cidade, somentePesca]);

  if (lista === null) return null;
  return (
    <section className="eda-pd" aria-label={t.titulo}>
      <h3>{t.titulo}</h3>
      {lista.length === 0 ? <p className="eda-pd-vazio">{t.nenhum}</p> : (
        <ul>
          {lista.map(p => {
            const preco = precoPasseioEDA(p.preco);
            const zap = whatsappPasseioEDA(p);
            return (
              <li key={p.id}>
                <strong>{p.nome}</strong>
                <span>{p.operadora_nome}{p.operadora_verificada ? ` · ${t.verificada}` : ''}{p.duracao ? ` · ${p.duracao}` : ''}</span>
                <span>
                  {p.preco_modalidade === 'sob_consulta' || !preco ? t.sob : preco}
                  {p.proxima_saida ? ` · ${t.proxima} ${dataCurtaEDA(p.proxima_saida)}${p.proxima_saida_vagas != null ? ` (${p.proxima_saida_vagas} ${t.vagas})` : ''}` : ''}
                </span>
                <div>
                  {zap && <a href={zap} target="_blank" rel="noopener noreferrer">{t.falar}</a>}
                  <Link href={`/rede/perfil/${encodeURIComponent(p.operadora_slug)}`}>{t.perfil}</Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <style jsx>{`
        .eda-pd { margin-top: 18px; display: grid; gap: 10px; }
        .eda-pd h3 { font-size: 15px; font-weight: 650; }
        .eda-pd-vazio { font-size: 13px; opacity: .75; }
        .eda-pd ul { display: grid; gap: 8px; }
        .eda-pd li { display: grid; gap: 3px; padding: 12px; border-radius: 14px; border: 1px solid #ffffff1f; background: #ffffff08; }
        .eda-pd li span { font-size: 12px; opacity: .8; }
        .eda-pd li div { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 4px; font-size: 12px; font-weight: 600; }
        .eda-pd li div :global(a) { color: #f4c77e; text-decoration: underline; }
      `}</style>
    </section>
  );
}

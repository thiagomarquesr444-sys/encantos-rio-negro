'use client';

// IARA_PASSEIO_RUAS_V1: a Iara conduz o visitante pelas ruas da cidade até o
// ponto pedido — paradas na Vista da rua com narração, avanço automático,
// pausa, voltar/avançar e troca para satélite onde não há imagem de rua.

import { useEffect, useRef, useState } from 'react';
import { chaveEmbedGoogle } from './SateliteCidadeERN';
import { roteiroPontoRua, urlRuaEmbed, type PontoRua } from '@/lib/pontosRuaIara';

const TEMPO = 8000;
const T = {
  PT: { de: 'Passeio pelas ruas', pausar: 'Pausar', seguir: 'Continuar', ant: 'Parada anterior', prox: 'Próxima parada', sat: 'Ver satélite', rua: 'Ver rua', fechar: 'Encerrar passeio', chegou: 'Chegamos', google: 'Abrir no Google Maps', semRua: 'Se a imagem de rua não aparecer, o Google ainda não passou por aqui: use “Ver satélite”.', iara: 'Iara' },
  EN: { de: 'Street tour', pausar: 'Pause', seguir: 'Resume', ant: 'Previous stop', prox: 'Next stop', sat: 'Satellite', rua: 'Street', fechar: 'End tour', chegou: 'We have arrived', google: 'Open in Google Maps', semRua: 'If the street image does not load, Google has not mapped this street yet: use “Satellite”.', iara: 'Iara' },
  ES: { de: 'Paseo por las calles', pausar: 'Pausar', seguir: 'Continuar', ant: 'Parada anterior', prox: 'Siguiente parada', sat: 'Satélite', rua: 'Calle', fechar: 'Terminar paseo', chegou: 'Llegamos', google: 'Abrir en Google Maps', semRua: 'Si la imagen de calle no aparece, Google aún no pasó por aquí: use “Satélite”.', iara: 'Iara' },
};

export default function PasseioRuasIaraEDA({ ponto, idioma, aoFechar }: { ponto: PontoRua; idioma: 'PT' | 'EN' | 'ES'; aoFechar: () => void }) {
  const t = T[idioma];
  const chave = chaveEmbedGoogle();
  const paradas = roteiroPontoRua(ponto);
  const [i, setI] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [modo, setModo] = useState<'rua' | 'satelite'>('rua');
  const [texto, setTexto] = useState('');
  const fecharRef = useRef<HTMLButtonElement>(null);
  const ultima = i === paradas.length - 1;
  const atual = paradas[i];
  const lingua = idioma === 'EN' ? 'en' : idioma === 'ES' ? 'es' : 'pt-BR';

  // Narração letra a letra (respeita "reduzir movimento").
  useEffect(() => {
    const fala = atual?.fala || atual?.nome || '';
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setTexto(fala); return; }
    setTexto('');
    let n = 0;
    const id = window.setInterval(() => { n += 2; setTexto(fala.slice(0, n)); if (n >= fala.length) window.clearInterval(id); }, 28);
    return () => window.clearInterval(id);
  }, [atual?.fala, atual?.nome]);

  // Avanço automático até o ponto final.
  useEffect(() => {
    if (pausado || ultima) return;
    const id = window.setTimeout(() => setI((v) => Math.min(v + 1, paradas.length - 1)), TEMPO);
    return () => window.clearTimeout(id);
  }, [i, pausado, ultima, paradas.length]);

  useEffect(() => {
    fecharRef.current?.focus({ preventScroll: true });
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); aoFechar(); } };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [aoFechar]);

  if (!chave || !atual) return null;
  const externo = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${atual.lat},${atual.lng}&heading=${atual.heading ?? 0}`;

  return (
    <section className="pr-iara" data-esc-fecha aria-label={`${t.de}: ${ponto.nome}, ${ponto.municipio}`}>
      <iframe
        key={`${i}-${modo}`}
        title={`${atual.nome} · ${ponto.municipio}`}
        src={urlRuaEmbed(chave, atual, modo, lingua)}
        loading="eager"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="pr-topo">
        <span className="pr-selo">✦ {t.de} · {ponto.municipio}</span>
        <button ref={fecharRef} type="button" className="pr-x" onClick={aoFechar} aria-label={t.fechar}>×</button>
      </div>
      <div className="pr-painel" role="status" aria-live="polite">
        <p className="pr-quem"><span aria-hidden="true">◈</span> {t.iara} · {ultima ? `${t.chegou}: ${ponto.nome}` : `${i + 1}/${paradas.length} · ${atual.nome}`}</p>
        <p className="pr-fala">{texto}</p>
        <div className="pr-trilha" aria-hidden="true">
          {paradas.map((p, k) => (
            <i key={`${p.nome}-${k}`} data-feito={k < i || undefined} data-atual={k === i || undefined}>
              {k === i && !pausado && !ultima && <b style={{ animationDuration: `${TEMPO}ms` }} />}
            </i>
          ))}
        </div>
        <div className="pr-acoes">
          <button type="button" onClick={() => setI((v) => Math.max(v - 1, 0))} disabled={i === 0} aria-label={t.ant}>‹</button>
          {!ultima && <button type="button" onClick={() => setPausado((v) => !v)}>{pausado ? `▶ ${t.seguir}` : `❚❚ ${t.pausar}`}</button>}
          <button type="button" onClick={() => setI((v) => Math.min(v + 1, paradas.length - 1))} disabled={ultima} aria-label={t.prox}>›</button>
          <button type="button" onClick={() => setModo((m) => (m === 'rua' ? 'satelite' : 'rua'))}>{modo === 'rua' ? t.sat : t.rua}</button>
          <a href={externo} target="_blank" rel="noopener noreferrer">{t.google} ↗</a>
        </div>
        <small>{t.semRua}</small>
      </div>
      <style jsx>{`
        .pr-iara { position: absolute; inset: 0; z-index: 570; overflow: hidden; border-radius: inherit; background: #05100c; }
        .pr-iara iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; animation: pr-in .6s ease both; }
        @keyframes pr-in { from { opacity: 0; transform: scale(1.03); } }
        .pr-topo { position: absolute; top: 12px; left: 12px; right: 12px; display: flex; justify-content: space-between; align-items: center; pointer-events: none; }
        .pr-selo { pointer-events: auto; padding: 8px 14px; border-radius: 999px; background: rgb(7 17 14 / 82%); border: 1px solid rgb(244 199 126 / 45%); color: #f4c77e; font-size: 12px; font-weight: 700; letter-spacing: .04em; backdrop-filter: blur(8px); }
        .pr-x { pointer-events: auto; width: 42px; height: 42px; border-radius: 50%; border: 1px solid rgb(255 255 255 / 25%); background: rgb(7 17 14 / 82%); color: #fff; font-size: 22px; cursor: pointer; }
        .pr-painel { position: absolute; left: 12px; right: 12px; bottom: 12px; max-width: 560px; padding: 14px 16px; border-radius: 20px; background: linear-gradient(160deg, rgb(10 23 19 / 94%), rgb(5 16 12 / 94%)); border: 1px solid rgb(244 199 126 / 40%); color: #edede3; box-shadow: 0 20px 50px rgb(0 0 0 / 45%); backdrop-filter: blur(10px); }
        .pr-quem { margin: 0; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #f4c77e; }
        .pr-fala { margin: 6px 0 10px; min-height: 2.9em; font-size: 15px; line-height: 1.45; }
        .pr-trilha { display: flex; gap: 6px; margin-bottom: 10px; }
        .pr-trilha i { position: relative; flex: 1; height: 4px; border-radius: 4px; background: rgb(255 255 255 / 18%); overflow: hidden; }
        .pr-trilha i[data-feito], .pr-trilha i[data-atual] { background: rgb(227 161 68 / 45%); }
        .pr-trilha i[data-feito] { background: #e3a144; }
        .pr-trilha b { position: absolute; inset: 0; background: #e3a144; transform-origin: left; animation: pr-barra linear both; }
        @keyframes pr-barra { from { transform: scaleX(0); } }
        .pr-acoes { display: flex; flex-wrap: wrap; gap: 6px; }
        .pr-acoes button, .pr-acoes a { min-height: 38px; padding: 0 12px; display: inline-flex; align-items: center; border-radius: 999px; border: 1px solid rgb(255 255 255 / 20%); background: rgb(255 255 255 / 6%); color: #edede3; font-size: 13px; font-weight: 600; cursor: pointer; }
        .pr-acoes button:disabled { opacity: .4; cursor: default; }
        .pr-painel small { display: block; margin-top: 8px; font-size: 11px; color: #9fb3a9; }
        @media (prefers-reduced-motion: reduce) { .pr-iara iframe, .pr-trilha b { animation: none; } }
        @media (max-width: 640px) { .pr-fala { font-size: 14px; } .pr-painel small { display: none; } }
      `}</style>
    </section>
  );
}

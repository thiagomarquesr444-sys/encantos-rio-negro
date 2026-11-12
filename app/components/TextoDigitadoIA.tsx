'use client';

// EDA_FASE_A_V1: revela a resposta da IA aos poucos, como alguém digitando.
// Respeita "reduzir movimento" do sistema e pode ser pulado com um clique.

import { useEffect, useState, type ReactNode } from 'react';

export default function TextoDigitadoIA({
  texto,
  animar,
  render,
  aoTerminar,
  msPorLetra,
}: {
  texto: string;
  animar: boolean;
  /** EDA_SAUDACAO_V3: letra a letra, no ritmo da recepção do painel. */
  msPorLetra?: number;
  render: (parcial: string) => ReactNode;
  aoTerminar?: () => void;
}) {
  const [n, setN] = useState(animar ? 0 : texto.length);

  useEffect(() => {
    if (!animar) { setN(texto.length); return; }
    const reduzir = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduzir) { setN(texto.length); aoTerminar?.(); return; }
    setN(0);
    const passo = msPorLetra ? 1 : Math.max(1, Math.round(texto.length / 220));
    const id = window.setInterval(() => {
      setN(atual => {
        const prox = Math.min(texto.length, atual + passo);
        if (prox >= texto.length) { window.clearInterval(id); aoTerminar?.(); }
        return prox;
      });
    }, msPorLetra ?? 16);
    return () => window.clearInterval(id);
    // aoTerminar muda a cada render; o efeito só depende do texto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, animar]);

  const terminou = n >= texto.length;
  return (
    <span onClick={() => { if (!terminou) { setN(texto.length); aoTerminar?.(); } }}>
      {/* Leitores de tela recebem o texto completo de uma vez. */}
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>{texto}</span>
      <span aria-hidden="true">{render(texto.slice(0, n))}</span>
    </span>
  );
}

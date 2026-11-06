'use client';

// ERN_DIGITACAO_V1
// Texto que aparece uma letra por vez, como se a plataforma estivesse
// escrevendo para a pessoa. Leitores de tela recebem o texto completo de uma
// vez; com "reduzir movimento" o texto aparece pronto.

import { useEffect, useMemo, useRef, useState } from 'react';

export type TrechoDigitado = { texto: string; forte?: boolean };

export default function DigitacaoEDA({
  trechos,
  atraso = 0,
  velocidade = 22,
  iniciar = true,
  aoTerminar,
  cursorFinal = false,
  cursorEspera = false,
  pularAoClicar = false,
}: {
  trechos: TrechoDigitado[];
  atraso?: number;
  velocidade?: number;
  iniciar?: boolean;
  aoTerminar?: () => void;
  cursorFinal?: boolean;
  cursorEspera?: boolean;
  pularAoClicar?: boolean;
}) {
  const completo = useMemo(() => trechos.map((t) => t.texto).join(''), [trechos]);
  const total = completo.length;
  const [mostrados, setMostrados] = useState(0);
  const [terminou, setTerminou] = useState(false);
  const pulou = useRef(false);

  useEffect(() => {
    setMostrados(0);
    setTerminou(false);
    pulou.current = false;
    if (!iniciar) return;

    const reduzir = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduzir || total === 0) {
      setMostrados(total);
      setTerminou(true);
      aoTerminar?.();
      return;
    }

    let n = 0;
    let temporizador = 0;
    function proxima() {
      if (pulou.current) return;
      n += 1;
      setMostrados(n);
      if (n >= total) {
        setTerminou(true);
        aoTerminar?.();
        return;
      }
      const letra = completo[n - 1];
      // Pausa natural em pontuação, como quem pensa antes de continuar.
      const pausa = letra === '\n' ? 520 : /[.!?]/.test(letra) ? 320 : /[,;:—]/.test(letra) ? 140 : 0;
      temporizador = window.setTimeout(proxima, velocidade + pausa + Math.random() * 18);
    }
    temporizador = window.setTimeout(proxima, atraso);
    return () => window.clearTimeout(temporizador);
    // aoTerminar fica fora das dependências para não reiniciar a digitação.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completo, iniciar, atraso, velocidade, total]);

  let restante = mostrados;
  const visiveis = trechos.map((t, i) => {
    const parte = t.texto.slice(0, Math.max(0, restante));
    restante -= t.texto.length;
    if (!parte) return null;
    if (parte === '\n') return <span key={i} className="eda-dig-quebra" />;
    return t.forte ? <b key={i}>{parte}</b> : <span key={i}>{parte}</span>;
  });

  const digitando = (iniciar || cursorEspera) && !terminou;

  return (
    <>
      <span className="eda-dig-sr">{completo}</span>
      <span
        aria-hidden="true"
        className="eda-dig"
        onClick={pularAoClicar && !terminou ? () => { pulou.current = true; setMostrados(total); setTerminou(true); aoTerminar?.(); } : undefined}
        title={pularAoClicar && !terminou ? 'Clique para ver tudo' : undefined}
      >
        {visiveis}
        {(digitando || (terminou && cursorFinal)) && <i className={`eda-dig-cursor${terminou ? ' eda-dig-cursor-fim' : ''}`} />}
      </span>
    </>
  );
}

'use client';
// SPELL_EDA_V1: texto que se revela palavra por palavra ao entrar na tela.
// Leitores de tela recebem a frase inteira; as palavras soltas ficam ocultas.
// Use `texto` para frase simples ou `partes` quando houver trecho em destaque
// (ex.: palavra dourada) ou quebra de linha ('br').
import { Fragment, useEffect, useRef, useState, type ElementType } from 'react';
import './spell-eda.css';

export type ParteRevelar = { texto: string; className?: string } | 'br';

type Props = {
  texto?: string;
  partes?: ParteRevelar[];
  como?: ElementType;
  className?: string;
};

export default function RevelarTextoEDA({ texto, partes, como: Tag = 'span', className = '' }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisivel(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setVisivel(true);
          obs.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const lista: ParteRevelar[] = partes ?? [{ texto: texto ?? '' }];
  const completo = lista
    .map((p) => (p === 'br' ? ' ' : p.texto))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

  let indice = 0;
  return (
    <Tag ref={ref} className={`eda-revelar ${visivel ? 'eda-revelar-visivel' : ''} ${className}`}>
      <span className="sr-only">{completo}</span>
      {lista.map((parte, n) => {
        if (parte === 'br') return <br key={`br-${n}`} aria-hidden="true" />;
        const palavras = parte.texto.split(/(\s+)/).filter(Boolean);
        return (
          <Fragment key={n}>
            {palavras.map((p, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={`eda-revelar-palavra ${parte.className ?? ''}`}
                style={{ ['--i' as string]: indice++ }}
              >
                {p}
              </span>
            ))}
          </Fragment>
        );
      })}
    </Tag>
  );
}

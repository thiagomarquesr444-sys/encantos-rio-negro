'use client';
// SPELL_EDA_V1: texto que se revela palavra por palavra ao entrar na tela.
// Leitores de tela recebem a frase inteira; as palavras soltas ficam ocultas.
import { useEffect, useRef, useState, type ElementType } from 'react';
import './spell-eda.css';

type Props = {
  texto: string;
  como?: ElementType;
  className?: string;
};

export default function RevelarTextoEDA({ texto, como: Tag = 'span', className = '' }: Props) {
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

  const palavras = texto.split(/(\s+)/).filter(Boolean);

  return (
    <Tag
      ref={ref}
      aria-label={texto}
      className={`eda-revelar ${visivel ? 'eda-revelar-visivel' : ''} ${className}`}
    >
      {palavras.map((p, i) => (
        <span key={i} aria-hidden="true" className="eda-revelar-palavra" style={{ ['--i' as string]: i }}>
          {p}
        </span>
      ))}
    </Tag>
  );
}

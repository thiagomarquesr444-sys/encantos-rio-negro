'use client';

// ERN_CARTAO_MAGNETICO_V1
// Cartão flutuante que "puxa" levemente em direção ao cursor e acende um
// brilho dourado onde o mouse passa. Sem efeito em toque ou com
// "reduzir movimento" ativo (tratado no CSS).

import './cartao-magnetico-eda.css';
import { useRef, type CSSProperties, type ReactNode, type PointerEvent } from 'react';

export default function CartaoMagneticoEDA({
  children,
  className = '',
  forca = 8,
  style,
  as: Tag = 'div',
  ...resto
}: {
  children: ReactNode;
  className?: string;
  forca?: number;
  style?: CSSProperties;
  as?: 'div' | 'section' | 'article';
  'aria-label'?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const quadro = useRef<number | null>(null);

  function mover(evento: PointerEvent<HTMLElement>) {
    if (evento.pointerType !== 'mouse') return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (evento.clientX - r.left) / r.width;
    const y = (evento.clientY - r.top) / r.height;
    if (quadro.current) cancelAnimationFrame(quadro.current);
    quadro.current = requestAnimationFrame(() => {
      el.style.setProperty('--mg-x', `${((x - 0.5) * forca).toFixed(2)}px`);
      el.style.setProperty('--mg-y', `${((y - 0.5) * forca).toFixed(2)}px`);
      el.style.setProperty('--mg-rx', `${((0.5 - y) * 4).toFixed(2)}deg`);
      el.style.setProperty('--mg-ry', `${((x - 0.5) * 4).toFixed(2)}deg`);
      el.style.setProperty('--mg-luz-x', `${(x * 100).toFixed(1)}%`);
      el.style.setProperty('--mg-luz-y', `${(y * 100).toFixed(1)}%`);
    });
  }

  function sair() {
    const el = ref.current;
    if (!el) return;
    if (quadro.current) cancelAnimationFrame(quadro.current);
    ['--mg-x', '--mg-y', '--mg-rx', '--mg-ry'].forEach((v) => el.style.removeProperty(v));
  }

  return (
    <Tag
      ref={(no: HTMLElement | null) => { ref.current = no; }}
      className={`eda-mg ${className}`}
      style={style}
      onPointerMove={mover}
      onPointerLeave={sair}
      {...resto}
    >
      <span className="eda-mg-luz" aria-hidden="true" />
      {children}
    </Tag>
  );
}

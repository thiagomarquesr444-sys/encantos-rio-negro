'use client';

import { useEffect, useRef, useState } from 'react';
import { aoMudarSinalEDA, sinalFracoEDA } from '@/lib/conexaoEDA';

// EDA_CARDS_VIDEO_V1 — trecho curto e mudo sobre a foto do cartão.
// Só carrega/roda quando o cartão está visível, com sinal normal e sem
// "reduzir movimento". Com sinal fraco fica só a foto (promessa de leveza).
export default function VideoCartaoEDA({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [permitido, setPermitido] = useState(false);
  const [rodando, setRodando] = useState(false);

  useEffect(() => {
    const movimento = window.matchMedia('(prefers-reduced-motion: reduce)');
    const avaliar = () => setPermitido(!movimento.matches && !sinalFracoEDA());
    avaliar();
    const parar = aoMudarSinalEDA(avaliar);
    movimento.addEventListener('change', avaliar);
    return () => { parar(); movimento.removeEventListener('change', avaliar); };
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!permitido || !v) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) void v.play().catch(() => {});
      else v.pause();
    }, { threshold: 0.35 });
    obs.observe(v);
    return () => { obs.disconnect(); v.pause(); };
  }, [permitido]);

  if (!permitido) return null;
  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      tabIndex={-1}
      onPlaying={() => setRodando(true)}
      className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${rodando ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}

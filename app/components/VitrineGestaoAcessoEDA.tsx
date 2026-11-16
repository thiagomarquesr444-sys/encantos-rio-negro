'use client';

// EDA_VITRINE_ACESSO_V1 — prévia real da Encantos Gestão na tela de acesso.
// Janela no estilo da vitrine "Para operadores" com um vídeo curto (sem som)
// feito de telas reais da gestão — nomes de pessoas borrados (LGPD).
// Só carrega/roda quando visível, com sinal normal e sem "reduzir movimento";
// do contrário fica a imagem parada (promessa de leveza da plataforma).

import { useEffect, useRef, useState } from 'react';
import { aoMudarSinalEDA, sinalFracoEDA } from '@/lib/conexaoEDA';

const VIDEO = '/videos/gestao/amostra-gestao.mp4';
const CAPA = '/videos/gestao/amostra-gestao.jpg';

// EDA_VIDEO_OPERADORES_V1: a tela com o vídeo agora vive na vitrine "Para operadores".
export function TelaVideoGestaoEDA({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [permitido, setPermitido] = useState(false);

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
    }, { threshold: 0.3 });
    obs.observe(v);
    return () => { obs.disconnect(); v.pause(); };
  }, [permitido]);

  return (
      <div className={className}>
        {permitido ? (
          <video
            ref={ref}
            src={VIDEO}
            poster={CAPA}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
            tabIndex={-1}
            className="block h-full w-full object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={CAPA} alt="" loading="lazy" decoding="async" className="block h-full w-full object-cover" />
        )}
      </div>
  );
}

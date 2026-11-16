'use client';

// EDA_VITRINE_ACESSO_V2 — prévia real da Encantos Gestão (vídeo de telas reais,
// nomes borrados por LGPD). Roda sozinho, mudo e em laço, só quando visível,
// com sinal normal e sem "reduzir movimento". Caso contrário mostra a foto
// com um botão de play: o vídeo só é baixado quando a pessoa toca.

import { useEffect, useRef, useState } from 'react';
import { aoMudarSinalEDA, sinalFracoEDA } from '@/lib/conexaoEDA';
import { useLanguage } from '@/app/components/LanguageProvider';

const VIDEO = '/videos/gestao/amostra-gestao.mp4';
const CAPA = '/videos/gestao/amostra-gestao.jpg';

const textos = {
  PT: { play: 'Reproduzir vídeo de demonstração da Encantos Gestão', video: 'Demonstração da Encantos Gestão: telas reais da plataforma', capa: 'Tela da Encantos Gestão com painel de reservas e financeiro' },
  EN: { play: 'Play Encantos Gestão demo video', video: 'Encantos Gestão demo: real platform screens', capa: 'Encantos Gestão screen with bookings and finance dashboard' },
  ES: { play: 'Reproducir video de demostración de Encantos Gestão', video: 'Demostración de Encantos Gestão: pantallas reales de la plataforma', capa: 'Pantalla de Encantos Gestão con panel de reservas y finanzas' },
} as const;

export function TelaVideoGestaoEDA({ className = '' }: { className?: string }) {
  const { idioma } = useLanguage();
  const t = textos[idioma === 'EN' || idioma === 'ES' ? idioma : 'PT'];
  const ref = useRef<HTMLVideoElement>(null);
  const [automatico, setAutomatico] = useState(false);
  const [tocado, setTocado] = useState(false);

  useEffect(() => {
    const movimento = window.matchMedia('(prefers-reduced-motion: reduce)');
    const avaliar = () => setAutomatico(!movimento.matches && !sinalFracoEDA());
    avaliar();
    const parar = aoMudarSinalEDA(avaliar);
    movimento.addEventListener('change', avaliar);
    return () => { parar(); movimento.removeEventListener('change', avaliar); };
  }, []);

  // Automático: toca só enquanto visível.
  useEffect(() => {
    const v = ref.current;
    if (!automatico || tocado || !v) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) void v.play().catch(() => {});
      else v.pause();
    }, { threshold: 0.3 });
    obs.observe(v);
    return () => { obs.disconnect(); v.pause(); };
  }, [automatico, tocado]);

  // Manual: depois do toque, inicia e entrega o foco ao player.
  useEffect(() => {
    const v = ref.current;
    if (!tocado || !v) return;
    v.focus();
    void v.play().catch(() => {});
  }, [tocado]);

  if (automatico || tocado) {
    return (
      <div className={className}>
        <video
          ref={ref}
          src={VIDEO}
          poster={CAPA}
          muted
          loop
          playsInline
          preload={tocado ? 'auto' : 'none'}
          controls={tocado}
          aria-label={t.video}
          className="block h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={CAPA} alt={t.capa} loading="lazy" decoding="async" className="block h-full w-full object-cover" />
      <button
        type="button"
        onClick={() => setTocado(true)}
        aria-label={t.play}
        className="absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full bg-[#07110E]/80 text-[#F4C77E] shadow-[0_10px_30px_rgb(0_0_0/45%)] ring-1 ring-[#F4C77E]/50 transition hover:bg-[#07110E] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F4C77E]"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
      </button>
    </div>
  );
}

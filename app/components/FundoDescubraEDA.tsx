'use client';

// DESCUBRA_FAM_V1: fundo do hero da Descubra com fotos que se revezam
// (padrão FAM). A primeira é o Encontro das Águas de sempre; as outras só
// carregam depois que a página abre. Com sinal fraco ou "reduzir movimento"
// fica só a primeira foto, parada.
import { useEffect, useState } from 'react';

export type SlideDescubra = { src: string; alt: string };

// DESCUBRA_FAM_V3: fotos em alta resolução (Unsplash/Pexels) + o igarapé da canoa, escolhido pelo Thiago.
export const SLIDES_DESCUBRA: SlideDescubra[] = [
  { src: '/images/fundo/encontro-das-aguas-1920.jpg', alt: '' },
  { src: '/images/descubra/slide-praias-rio-negro.webp', alt: '' },
  { src: '/images/descubra/slide-igarape.webp', alt: '' },
  { src: '/images/descubra/slide-pesca.webp', alt: '' },
  { src: '/images/descubra/slide-igapo.webp', alt: '' },
  { src: '/images/descubra/slide-rio-aereo.webp', alt: '' },
  { src: '/images/descubra/slide-rio-negro-hd.webp', alt: '' },
  { src: '/images/descubra/slide-lago.webp', alt: '' },
]

const INTERVALO = 7000;

function podeAnimar() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  return document.documentElement.dataset.edaSinal !== 'fraco';
}

export default function FundoDescubraEDA({ onTroca }: { onTroca?: (indice: number) => void }) {
  const [atual, setAtual] = useState(0);
  const [carregar, setCarregar] = useState(false);
  // Baixa uma foto por vez (a atual e a próxima), para não pesar no Starlink.
  const [ate, setAte] = useState(1);
  useEffect(() => { setAte((v) => Math.max(v, atual + 1)); }, [atual]);

  useEffect(() => {
    if (!podeAnimar()) return;
    // Só busca as outras fotos depois que a primeira já está na tela.
    const espera = window.setTimeout(() => setCarregar(true), 1800);
    return () => window.clearTimeout(espera);
  }, []);

  useEffect(() => {
    if (!carregar) return;
    const id = window.setInterval(() => {
      if (document.hidden || !podeAnimar()) return;
      setAtual((i) => (i + 1) % SLIDES_DESCUBRA.length);
    }, INTERVALO);
    return () => window.clearInterval(id);
  }, [carregar]);

  useEffect(() => { onTroca?.(atual); }, [atual, onTroca]);

  return (
    <div aria-hidden="true" className="eda-fundo-descubra absolute inset-0">
      <picture>
        <source media="(min-width: 768px)" srcSet="/images/fundo/encontro-das-aguas-1920.jpg" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/fundo/encontro-das-aguas-celular.jpg"
          alt=""
          fetchPriority="high"
          decoding="async"
          className={`eda-fundo-slide ern-fundo-descubra object-[50%_35%] ${atual === 0 ? 'eda-fundo-on' : ''}`}
        />
      </picture>
      {carregar && SLIDES_DESCUBRA.slice(1, ate + 1).map((s, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={s.src}
          src={s.src}
          alt=""
          decoding="async"
          className={`eda-fundo-slide ${atual === i + 1 ? 'eda-fundo-on' : ''}`}
        />
      ))}
    </div>
  );
}

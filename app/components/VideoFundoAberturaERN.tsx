'use client';

import { useEffect, useState } from 'react';

// ERN_VIDEO_ABERTURA_V1
// Fundo da abertura: canais, praias e água-preta de Anavilhanas (sem letreiros).
// A foto (poster) aparece sempre; o vídeo só carrega quando a pessoa
// não pediu menos movimento nem economia de dados, e a conexão não é 2G.
// Há uma versão horizontal (computador) e uma vertical (celular).

type ConexaoNavegador = { saveData?: boolean; effectiveType?: string };

const VIDEOS = {
  desktop: {
    video: '/videos/abertura/descubra-desktop.mp4',
    poster: '/videos/abertura/descubra-desktop.jpg',
  },
  mobile: {
    video: '/videos/abertura/descubra-mobile.mp4',
    poster: '/videos/abertura/descubra-mobile.jpg',
  },
};

export default function VideoFundoAberturaERN() {
  const [formato, setFormato] = useState<'desktop' | 'mobile' | null>(null);

  useEffect(() => {
    const conexao = (navigator as Navigator & { connection?: ConexaoNavegador }).connection;
    const poupar =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      conexao?.saveData === true ||
      ['slow-2g', '2g'].includes(conexao?.effectiveType ?? '');
    if (poupar) return;
    setFormato(window.matchMedia('(min-width: 768px)').matches ? 'desktop' : 'mobile');
  }, []);

  return (
    <>
      <picture>
        <source media="(min-width: 768px)" srcSet={VIDEOS.desktop.poster} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={VIDEOS.mobile.poster}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>
      {formato && (
        <video
          key={formato}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          src={VIDEOS[formato].video}
          poster={VIDEOS[formato].poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
        />
      )}
    </>
  );
}

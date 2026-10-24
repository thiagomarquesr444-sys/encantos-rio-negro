'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from './LanguageProvider';

type Props = {
  title: string;
  poster: string;
  videos: string[];
};

const copy = {
  PT: {
    title: 'Veja esta aventura',
    play: 'Assistir ao vídeo',
    view: 'Vídeo',
    back: 'Voltar à capa',
    loading: 'Carregando vídeo…',
    error: 'Não foi possível reproduzir o vídeo. Tente novamente ou abra o arquivo.',
    retry: 'Tentar novamente',
    open: 'Abrir vídeo',
    note: 'Use os controles para pausar, ajustar o som ou ampliar a imagem.',
    paused: 'A reprodução não começou automaticamente. Use o botão de reprodução do vídeo.',
  },
  EN: {
    title: 'Watch this adventure',
    play: 'Play video',
    view: 'Video',
    back: 'Back to cover',
    loading: 'Loading video…',
    error: 'The video could not play. Try again or open the file.',
    retry: 'Try again',
    open: 'Open video',
    note: 'Use the controls to pause, adjust sound or enlarge the video.',
    paused: 'Playback did not start automatically. Use the video play control.',
  },
  ES: {
    title: 'Vea esta aventura',
    play: 'Reproducir video',
    view: 'Video',
    back: 'Volver a la portada',
    loading: 'Cargando video…',
    error: 'No se pudo reproducir el video. Intente de nuevo o abra el archivo.',
    retry: 'Intentar de nuevo',
    open: 'Abrir video',
    note: 'Use los controles para pausar, ajustar el sonido o ampliar el video.',
    paused: 'La reproducción no comenzó automáticamente. Use el control del video.',
  },
};

export default function VideoDestinoERN({ title, poster, videos }: Props) {
  const { idioma } = useLanguage();
  const t = copy[idioma];
  const [selecionado, setSelecionado] = useState(0);
  const [iniciado, setIniciado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const capaRef = useRef<HTMLButtonElement>(null);
  const src = videos[selecionado];

  useEffect(() => {
    const video = videoRef.current;
    if (!iniciado || !video) return;

    let encerrado = false;

    video.focus({ preventScroll: true });

    const tentativa = video.play();
    if (tentativa) {
      void tentativa.catch(() => {
        if (!encerrado) {
          setCarregando(false);
          setBloqueado(true);
        }
      });
    }

    const pausarOculto = () => {
      if (document.hidden) video.pause();
    };

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada?.isIntersecting) video.pause();
      },
      { threshold: 0 }
    );

    observador.observe(video);
    document.addEventListener('visibilitychange', pausarOculto);

    return () => {
      encerrado = true;
      video.pause();
      observador.disconnect();
      document.removeEventListener('visibilitychange', pausarOculto);
    };
  }, [iniciado, selecionado]);

  function assistir() {
    setErro(false);
    setBloqueado(false);
    setCarregando(true);
    setIniciado(true);
  }

  function trocar(indice: number) {
    videoRef.current?.pause();
    setSelecionado(indice);
    setIniciado(false);
    setErro(false);
    setBloqueado(false);
    setCarregando(false);
  }

  function voltar() {
    videoRef.current?.pause();
    setIniciado(false);
    setErro(false);
    setBloqueado(false);
    setCarregando(false);
    requestAnimationFrame(() => capaRef.current?.focus({ preventScroll: true }));
  }

  if (!src) return null;

  return (
    <section className="ern-video-destino" aria-label={`${t.title}: ${title}`}>
      <div className="cabecalho">
        <h3>{t.title}</h3>
        <span aria-hidden="true">▶</span>
      </div>

      {!iniciado ? (
        <button
          ref={capaRef}
          type="button"
          className="capa"
          onClick={assistir}
          aria-label={`${t.play}: ${title}, ${selecionado + 1}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster} alt="" loading="lazy" decoding="async" />
          <span className="capa-conteudo">
            <span className="play" aria-hidden="true">▶</span>
            <span>{t.play}</span>
          </span>
        </button>
      ) : (
        <div className="reprodutor">
          <video
            key={src}
            ref={videoRef}
            src={src}
            controls
            playsInline
            preload="none"
            tabIndex={0}
            aria-label={`${title} · ${t.view} ${selecionado + 1}`}
            onPlaying={() => {
              setCarregando(false);
              setBloqueado(false);
            }}
            onCanPlay={() => setCarregando(false)}
            onWaiting={() => setCarregando(true)}
            onPause={() => setCarregando(false)}
            onError={() => {
              setErro(true);
              setCarregando(false);
            }}
            onPlay={(evento) => {
              const atual = evento.currentTarget;
              document.querySelectorAll('video').forEach((outro) => {
                if (outro !== atual) outro.pause();
              });
            }}
          />
          {carregando && <p role="status">{t.loading}</p>}
          {bloqueado && !erro && <p role="status">{t.paused}</p>}
          {erro && (
            <div role="alert" className="falha">
              <p>{t.error}</p>
              <button type="button" onClick={voltar}>{t.retry}</button>
              <a href={src} target="_blank" rel="noopener noreferrer">{t.open} ↗</a>
            </div>
          )}
        </div>
      )}

      <div className="opcoes" role="group" aria-label={t.title}>
        {videos.length > 1 && videos.map((item, indice) => (
          <button
            key={item}
            type="button"
            aria-pressed={selecionado === indice}
            onClick={() => trocar(indice)}
          >
            {t.view} {indice + 1}
          </button>
        ))}
        {iniciado && (
          <button type="button" onClick={voltar}>{t.back}</button>
        )}
      </div>

      <p className="nota">{t.note}</p>

      <style jsx>{`
        .ern-video-destino {
          margin: 20px 0;
          overflow: hidden;
          border: 1px solid #d5bf81;
          border-radius: 16px;
          background: #fffcf0;
          color: #30260d;
        }
        .cabecalho {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px;
          background: #fff3cf;
        }
        .cabecalho h3 {
          margin: 0;
          font-family: var(--font-fraunces), serif;
          font-size: 22px;
          line-height: 1.2;
          color: #30260d;
        }
        .cabecalho > span { color: #805600; }
        .capa {
          position: relative;
          display: block;
          width: 100%;
          aspect-ratio: 16 / 10;
          padding: 0;
          border: 0;
          background: #10241e;
          cursor: pointer;
          overflow: hidden;
        }
        .capa img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }
        .capa-conteudo {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 10px;
          background: rgb(0 0 0 / 25%);
          color: white;
          font-size: 13px;
          font-weight: 700;
          text-shadow: 0 1px 4px #000;
        }
        .play {
          display: grid;
          place-items: center;
          width: 52px;
          height: 52px;
          padding-left: 3px;
          border: 1px solid #f3d5a0;
          border-radius: 50%;
          background: #805600;
          color: white;
          box-sizing: border-box;
          font-size: 20px;
        }
        .reprodutor { background: #07130f; }
        video {
          display: block;
          width: 100%;
          height: auto;
          max-height: 360px;
          object-fit: contain;
          background: #07130f;
        }
        .reprodutor > p, .falha {
          padding: 12px;
          margin: 0;
          color: #fffaf0;
          font-size: 12px;
          line-height: 1.6;
        }
        .falha p { color: inherit; }
        .falha a { color: #ffdc93; }
        .falha button { margin-right: 12px; }
        .opcoes {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 12px 14px 0;
        }
        .opcoes button, .falha button {
          min-height: 44px;
          padding: 9px 12px;
          border: 1px solid #a58b48;
          border-radius: 10px;
          background: #fffcf0;
          color: #805600;
          font: inherit;
          font-size: 12px;
          cursor: pointer;
        }
        .opcoes button[aria-pressed="true"] {
          background: #805600;
          color: white;
        }
        .nota {
          margin: 0;
          padding: 10px 14px 14px;
          color: #695727;
          font-size: 11px;
          line-height: 1.6;
        }
        button:focus-visible, a:focus-visible, video:focus-visible {
          outline: 3px solid #805600;
          outline-offset: -3px;
        }
      `}</style>
    </section>
  );
}
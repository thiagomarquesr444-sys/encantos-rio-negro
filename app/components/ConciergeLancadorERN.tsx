'use client';

import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import IconeIara from './IconeIara';

type PontoERN = { x: number; y: number };

type Props = {
  idioma: string;
  aberto: boolean;
  pausado: boolean;
  aoAbrir: () => void;
  aoPausar: () => void;
};

const textos = {
  PT: {
    abrir: 'Iara — conversar e planejar a viagem',
    opcoes: 'Opções do assistente',
    esquerda: 'Mover para esquerda',
    direita: 'Mover para direita',
    restaurar: 'Restaurar posição',
    pausar: 'Pausar efeitos',
    retomar: 'Retomar efeitos',
  },
  EN: {
    abrir: 'Iara — chat and plan your trip',
    opcoes: 'Assistant options',
    esquerda: 'Move to the left',
    direita: 'Move to the right',
    restaurar: 'Reset position',
    pausar: 'Pause effects',
    retomar: 'Resume effects',
  },
  ES: {
    abrir: 'Iara — conversar y planear tu viaje',
    opcoes: 'Opciones del asistente',
    esquerda: 'Mover a la izquierda',
    direita: 'Mover a la derecha',
    restaurar: 'Restablecer posición',
    pausar: 'Pausar efectos',
    retomar: 'Reanudar efectos',
  },
};

export default function ConciergeLancadorERN({
  idioma, aberto, pausado, aoAbrir,
}: Props) {
  const t = textos[idioma === 'EN' ? 'EN' : idioma === 'ES' ? 'ES' : 'PT'];
  const [montado, setMontado] = useState(false);
  const [posicao, setPosicao] = useState<PontoERN | null>(null);
  const [arrastando, setArrastando] = useState(false);

  const caixaRef = useRef<HTMLDivElement>(null);
  const posicaoRef = useRef<PontoERN | null>(null);
  const movidoRef = useRef(false);
  const suprimirCliqueRef = useRef(false);
  const inicioRef = useRef<{
    id: number; x: number; y: number; origem: PontoERN;
  } | null>(null);

  function limitar(ponto: PontoERN): PontoERN {
    const largura = caixaRef.current?.offsetWidth || 58;
    const altura = caixaRef.current?.offsetHeight || 58;

    return {
      x: Math.max(12, Math.min(
        ponto.x, Math.max(12, window.innerWidth - largura - 12),
      )),
      y: Math.max(12, Math.min(
        ponto.y, Math.max(12, window.innerHeight - altura - 12),
      )),
    };
  }

  function posicionar(ponto: PontoERN) {
    const ajustado = limitar(ponto);
    posicaoRef.current = ajustado;
    setPosicao(ajustado);
  }

  // EDA_FLUTUANTES_V1: Concierge fica no canto superior direito, logo abaixo
  // do cabeçalho público (Libras segue embaixo à direita; Feedback vai ao rodapé).
  function padrao(): PontoERN {
    const cabecalho = document.querySelector('.ern-navegacao-ilustrada');
    const topo = cabecalho ? Math.max(0, cabecalho.getBoundingClientRect().bottom) : 0;
    return {
      x: window.innerWidth - (caixaRef.current?.offsetWidth || 58) - 16,
      y: topo + 16,
    };
  }

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    if (!montado) return;

    posicionar(padrao());

    function redimensionar() {
      const anterior = posicaoRef.current;
      if (!anterior) return;

      const largura = caixaRef.current?.offsetWidth || 58;
      const direita = anterior.x + largura / 2 > window.innerWidth / 2;

      posicionar({
        x: direita ? window.innerWidth - largura - 16 : 16,
        y: anterior.y,
      });
    }

    window.addEventListener('resize', redimensionar);
    return () => window.removeEventListener('resize', redimensionar);
    // A posição inicial é definida somente ao montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [montado]);

  function iniciar(evento: ReactPointerEvent<HTMLButtonElement>) {
    if (!evento.isPrimary || evento.button !== 0) return;

    const retangulo = caixaRef.current?.getBoundingClientRect();
    if (!retangulo) return;

    inicioRef.current = {
      id: evento.pointerId,
      x: evento.clientX,
      y: evento.clientY,
      origem: { x: retangulo.left, y: retangulo.top },
    };

    movidoRef.current = false;
    suprimirCliqueRef.current = false;
    evento.currentTarget.setPointerCapture(evento.pointerId);
  }

  function mover(evento: ReactPointerEvent<HTMLButtonElement>) {
    const inicio = inicioRef.current;
    if (!inicio || inicio.id !== evento.pointerId) return;

    const dx = evento.clientX - inicio.x;
    const dy = evento.clientY - inicio.y;

    if (!movidoRef.current && Math.hypot(dx, dy) < 7) return;

    movidoRef.current = true;
    setArrastando(true);

    posicionar({
      x: inicio.origem.x + dx,
      y: inicio.origem.y + dy,
    });
  }

  function terminar(evento: ReactPointerEvent<HTMLButtonElement>) {
    const inicio = inicioRef.current;
    if (!inicio || inicio.id !== evento.pointerId) return;

    suprimirCliqueRef.current = movidoRef.current;

    if (movidoRef.current && posicaoRef.current) {
      const atual = posicaoRef.current;
      const largura = caixaRef.current?.offsetWidth || 58;

      posicionar({
        x: atual.x + largura / 2 < window.innerWidth / 2
          ? 16
          : window.innerWidth - largura - 16,
        y: atual.y,
      });
    }

    inicioRef.current = null;
    setArrastando(false);
  }

  if (!montado) return null;

  return createPortal(
    <div
      ref={caixaRef}
      className="ern-lancador"
      data-pausado={pausado}
      data-arrastando={arrastando}
      style={{
        left: posicao?.x,
        right: posicao ? 'auto' : 16,
        top: posicao ? posicao.y : 92,
        bottom: 'auto',
        visibility: aberto ? 'hidden' : 'visible',
      }}
    >
      <button
        id="ern-abrir-concierge"
        type="button"
        className="abrir"
        title={t.abrir}
        aria-label={t.abrir}
        aria-haspopup="dialog"
        aria-controls="ern-conversa"
        aria-expanded={aberto}
        onPointerDown={iniciar}
        onPointerMove={mover}
        onPointerUp={terminar}
        onPointerCancel={evento => {
          terminar(evento);
          suprimirCliqueRef.current = true;
        }}
        onLostPointerCapture={() => {
          inicioRef.current = null;
          setArrastando(false);
        }}
        onClick={evento => {
          if (suprimirCliqueRef.current && evento.detail !== 0) {
            suprimirCliqueRef.current = false;
            return;
          }
          aoAbrir();
        }}
      >
        <span className="estrela" aria-hidden="true"><IconeIara /></span>
      </button>

      <style jsx>{`
        .ern-lancador {
          position: fixed;
          z-index: 90;
          width: 58px;
          height: 58px;
          user-select: none;
        }
        .abrir {
          position: relative;
          display: grid;
          place-items: center;
          width: 58px;
          height: 58px;
          padding: 0;
          border: 2px solid rgb(244 199 126 / 85%);
          border-radius: 50%;
          background: #07140f;
          overflow: hidden;
          color: #ffffff;
          box-shadow: 0 10px 28px rgb(0 0 0 / 38%), 0 0 0 4px rgb(244 199 126 / 12%), inset 0 1px 0 rgb(255 255 255 / 18%);
          transition: box-shadow .25s, border-color .25s;
          cursor: grab;
          touch-action: none;
        }
        .abrir::after {
          content: '';
          position: absolute;
          inset: -3px;
          border: 2px solid #f4c77e;
          border-radius: 50%;
          opacity: 0;
          pointer-events: none;
        }
        .abrir:hover { border-color: #f7d595; box-shadow: 0 14px 34px rgb(0 0 0 / 42%), 0 0 0 6px rgb(244 199 126 / 20%), inset 0 1px 0 rgb(255 255 255 / 22%); }
        [data-arrastando='true'] .abrir { cursor: grabbing; }
        .estrela {
          display: block;
          width: 100%;
          height: 100%;
        }
        .abrir:focus-visible {
          outline: 3px solid #287b72;
          outline-offset: 3px;
        }
        @keyframes ern-lancador-pulsar {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes ern-lancador-onda {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @media (prefers-reduced-motion: no-preference) {
          .abrir {
            animation: ern-lancador-pulsar 3.2s ease-in-out infinite;
          }
          .abrir::after {
            animation: ern-lancador-onda 3.2s ease-out infinite;
          }
        }
        [data-pausado='true'] .abrir,
        [data-pausado='true'] .abrir::after {
          animation-play-state: paused;
        }
      `}</style>
    </div>,
    document.body,
  );
}
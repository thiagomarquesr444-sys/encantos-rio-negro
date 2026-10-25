'use client';

import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';

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
    abrir: 'ERN — Assistente de viagem',
    opcoes: 'Opções do assistente',
    esquerda: 'Mover para esquerda',
    direita: 'Mover para direita',
    restaurar: 'Restaurar posição',
    pausar: 'Pausar efeitos',
    retomar: 'Retomar efeitos',
  },
  EN: {
    abrir: 'ERN — Travel assistant',
    opcoes: 'Assistant options',
    esquerda: 'Move to the left',
    direita: 'Move to the right',
    restaurar: 'Reset position',
    pausar: 'Pause effects',
    retomar: 'Resume effects',
  },
  ES: {
    abrir: 'ERN — Asistente de viaje',
    opcoes: 'Opciones del asistente',
    esquerda: 'Mover a la izquierda',
    direita: 'Mover a la derecha',
    restaurar: 'Restablecer posición',
    pausar: 'Pausar efectos',
    retomar: 'Reanudar efectos',
  },
};

export default function ConciergeLancadorERN({
  idioma, aberto, pausado, aoAbrir, aoPausar,
}: Props) {
  const t = textos[idioma === 'EN' ? 'EN' : idioma === 'ES' ? 'ES' : 'PT'];
  const [montado, setMontado] = useState(false);
  const [posicao, setPosicao] = useState<PontoERN | null>(null);
  const [menu, setMenu] = useState(false);
  const [arrastando, setArrastando] = useState(false);

  const caixaRef = useRef<HTMLDivElement>(null);
  const posicaoRef = useRef<PontoERN | null>(null);
  const movidoRef = useRef(false);
  const suprimirCliqueRef = useRef(false);
  const inicioRef = useRef<{
    id: number; x: number; y: number; origem: PontoERN;
  } | null>(null);

  function limitar(ponto: PontoERN): PontoERN {
    const largura = caixaRef.current?.offsetWidth || 148;
    const altura = caixaRef.current?.offsetHeight || 52;

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

  function padrao(): PontoERN {
    return {
      x: window.innerWidth - (caixaRef.current?.offsetWidth || 148) - 16,
      y: window.innerHeight - (caixaRef.current?.offsetHeight || 52) - 104,
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

      const largura = caixaRef.current?.offsetWidth || 148;
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

  useEffect(() => {
    if (!menu) return;

    function fecharFora(evento: Event) {
      if (
        evento.target instanceof Node &&
        !caixaRef.current?.contains(evento.target)
      ) setMenu(false);
    }

    function teclado(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        setMenu(false);
        document.getElementById('ern-opcoes-concierge')?.focus();
      }
    }

    document.addEventListener('pointerdown', fecharFora);
    document.addEventListener('keydown', teclado);

    return () => {
      document.removeEventListener('pointerdown', fecharFora);
      document.removeEventListener('keydown', teclado);
    };
  }, [menu]);

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
    setMenu(false);

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
      const largura = caixaRef.current?.offsetWidth || 148;

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

  function moverLateral(direita: boolean) {
    const largura = caixaRef.current?.offsetWidth || 148;
    posicionar({
      x: direita ? window.innerWidth - largura - 16 : 16,
      y: posicaoRef.current?.y ?? padrao().y,
    });
    setMenu(false);
  }

  if (!montado) return null;

  const menuDireita = !posicao || posicao.x > window.innerWidth / 2;
  const menuAbaixo = posicao !== null && posicao.y < 230;

  return createPortal(
    <div
      ref={caixaRef}
      className="ern-lancador"
      data-pausado={pausado}
      data-arrastando={arrastando}
      style={{
        left: posicao?.x,
        top: posicao?.y,
        right: posicao ? 'auto' : 16,
        bottom: posicao ? 'auto' : 104,
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
          setMenu(false);
          aoAbrir();
        }}
      >
        <span className="orbe" aria-hidden="true">✦</span>
        <span>ERN</span>
      </button>

      <button
        id="ern-opcoes-concierge"
        type="button"
        className="opcoes"
        aria-label={t.opcoes}
        aria-expanded={menu}
        aria-controls="ern-posicao-concierge"
        onClick={() => setMenu(valor => !valor)}
      >
        <span aria-hidden="true">⋮</span>
      </button>

      {menu && (
        <div
          id="ern-posicao-concierge"
          className="painel"
          role="group"
          aria-label={t.opcoes}
          style={{
            right: menuDireita ? 0 : 'auto',
            left: menuDireita ? 'auto' : 0,
            top: menuAbaixo ? 'calc(100% + 10px)' : 'auto',
            bottom: menuAbaixo ? 'auto' : 'calc(100% + 10px)',
          }}
        >
          <button type="button" onClick={() => moverLateral(false)}>
            {t.esquerda}
          </button>
          <button type="button" onClick={() => moverLateral(true)}>
            {t.direita}
          </button>
          <button type="button" onClick={() => {
            posicionar(padrao());
            setMenu(false);
          }}>
            {t.restaurar}
          </button>
          <button type="button" onClick={aoPausar}>
            {pausado ? t.retomar : t.pausar}
          </button>
        </div>
      )}

      <style jsx>{`
        .ern-lancador {
          position: fixed;
          z-index: 90;
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 4px;
          border: 1px solid #c4ae72;
          border-radius: 999px;
          background: #fffcf0;
          color: #30260d;
          box-shadow: 0 5px 22px rgb(0 0 0 / 22%);
          font-family: var(--font-work-sans), sans-serif;
          user-select: none;
        }
        .ern-lancador::before {
          content: '';
          position: absolute;
          inset: 0;
          padding: 2px;
          border-radius: inherit;
          pointer-events: none;
          background: conic-gradient(
            from var(--ern-lancador-angulo, 0deg),
            #e3a144, #35d4c4, #4b8fff, #f4c77e, #e3a144
          );
          -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          mask-composite: exclude;
        }
        button {
          font: inherit;
          color: inherit;
          cursor: pointer;
        }
        .abrir {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 44px;
          padding: 4px 12px 4px 4px;
          border: 0;
          border-radius: 999px;
          background: transparent;
          font-size: 14px;
          font-weight: 700;
          touch-action: none;
          cursor: grab;
        }
        [data-arrastando='true'] .abrir { cursor: grabbing; }
        .orbe {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border: 1px solid #c4ae72;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 25%, #287b72, #102b35);
          color: #fff3cf;
          font-size: 23px;
        }
        .opcoes {
          display: grid;
          place-items: center;
          width: 44px;
          height: 44px;
          padding: 0;
          border: 0;
          border-left: 1px solid #dfcf9e;
          border-radius: 0 999px 999px 0;
          background: transparent;
          font-size: 24px;
        }
        button:focus-visible {
          outline: 3px solid #287b72;
          outline-offset: 2px;
        }
        .painel {
          position: absolute;
          width: min(220px, calc(100vw - 24px));
          max-height: calc(100dvh - 90px);
          overflow-y: auto;
          box-sizing: border-box;
          padding: 6px;
          border: 1px solid #c4ae72;
          border-radius: 14px;
          background: #fffcf0;
          box-shadow: 0 8px 24px rgb(0 0 0 / 20%);
        }
        .painel button {
          display: block;
          width: 100%;
          min-height: 44px;
          padding: 9px 12px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          font-size: 13px;
          text-align: left;
        }
        .painel button:hover { background: #f5ecd2; }
        @keyframes ern-lancador-girar {
          to { --ern-lancador-angulo: 360deg; }
        }
        @keyframes ern-lancador-pulsar {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .ern-lancador::before {
            animation: ern-lancador-girar 5s linear infinite;
          }
          .orbe {
            animation: ern-lancador-pulsar 2.8s ease-in-out infinite;
          }
        }
        [data-pausado='true']::before,
        [data-pausado='true'] .orbe {
          animation-play-state: paused;
        }
      `}</style>
    </div>,
    document.body,
  );
}
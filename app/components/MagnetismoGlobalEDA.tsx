'use client';

// ERN_MAGNETISMO_GLOBAL_V1
// Dá o efeito magnético a qualquer elemento com data-eda-mg (cabeçalhos das
// páginas antigas), sem precisar reescrever cada página. Um único ouvinte.

import { useEffect } from 'react';

const VARS = ['--mg-x', '--mg-y', '--mg-rx', '--mg-ry'];

export default function MagnetismoGlobalEDA() {
  useEffect(() => {
    let atual: HTMLElement | null = null;
    let quadro = 0;

    function limpar(el: HTMLElement | null) {
      if (el) VARS.forEach((v) => el.style.removeProperty(v));
    }

    function mover(evento: PointerEvent) {
      if (evento.pointerType !== 'mouse') return;
      const alvo = evento.target instanceof Element
        ? evento.target.closest<HTMLElement>('[data-eda-mg]')
        : null;
      if (alvo !== atual) { limpar(atual); atual = alvo; }
      if (!alvo) return;
      const r = alvo.getBoundingClientRect();
      const x = (evento.clientX - r.left) / r.width;
      const y = (evento.clientY - r.top) / r.height;
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => {
        alvo.style.setProperty('--mg-x', `${((x - 0.5) * 4).toFixed(2)}px`);
        alvo.style.setProperty('--mg-y', `${((y - 0.5) * 4).toFixed(2)}px`);
        alvo.style.setProperty('--mg-rx', `${((0.5 - y) * 2).toFixed(2)}deg`);
        alvo.style.setProperty('--mg-ry', `${((x - 0.5) * 2).toFixed(2)}deg`);
      });
    }

    function sair() { cancelAnimationFrame(quadro); limpar(atual); atual = null; }

    document.addEventListener('pointermove', mover, { passive: true });
    document.documentElement.addEventListener('pointerleave', sair);
    return () => {
      cancelAnimationFrame(quadro);
      document.removeEventListener('pointermove', mover);
      document.documentElement.removeEventListener('pointerleave', sair);
      limpar(atual);
    };
  }, []);

  return null;
}

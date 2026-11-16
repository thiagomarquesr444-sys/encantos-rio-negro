'use client';

// EDA_ESC_VOLTAR_V1: a tecla Esc volta para a página anterior em toda a plataforma
// (portal e gestão). Esc continua fechando primeiro o que estiver aberto: janelas,
// painéis, conversas da Iara/EDA, mapa de rua, campos de texto em edição.
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const ABERTOS = [
  'dialog[open]', '[role="dialog"]', '[role="alertdialog"]', '[aria-modal="true"]',
  '.ern-v-drawer', '.ern-v-satelite', '.ern-v-muni-card', '[data-esc-fecha]',
].join(',');

function algoAberto() {
  if (document.fullscreenElement) return true;
  return Array.from(document.querySelectorAll<HTMLElement>(ABERTOS)).some((el) => {
    if (el.closest('[hidden], [aria-hidden="true"]')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  });
}

function editando(alvo: EventTarget | null) {
  const el = alvo as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

export default function EscVoltarEDA() {
  const router = useRouter();
  const pathname = usePathname() ?? '/';

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      // Decide ANTES dos outros atalhos fecharem algo (fase de captura).
      if (editando(e.target) || algoAberto()) return;
      window.setTimeout(() => {
        if (e.defaultPrevented) return;
        if (window.history.length > 1) router.back();
        else if (pathname !== '/' && pathname !== '/dashboard') router.push('/');
      }, 0);
    };
    window.addEventListener('keydown', aoTeclar, true);
    return () => window.removeEventListener('keydown', aoTeclar, true);
  }, [router, pathname]);

  return null;
}

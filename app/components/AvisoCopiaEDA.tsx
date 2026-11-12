'use client';

// EDA_AVISO_COPIA_V1: aviso flutuante "Link copiado" com o monograma EDA.

import { useEffect, useRef, useState } from 'react';
import { EVENTO_COPIA_EDA, type DetalheCopiaEDA } from '@/lib/copiarEDA';

export default function AvisoCopiaEDA() {
  const [aviso, setAviso] = useState<(DetalheCopiaEDA & { n: number }) | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const ouvir = (e: Event) => {
      const d = (e as CustomEvent<DetalheCopiaEDA>).detail;
      if (!d) return;
      setAviso({ ...d, n: Date.now() });
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setAviso(null), 2600);
    };
    // EDA_AVISO_COPIA_V2: o copiar/colar do próprio teclado ou do toque longo também ganha a marca.
    const nativo = (mensagem: string) => () => {
      if (mensagem === 'Copiado' && !String(window.getSelection?.() ?? '').trim()) {
        const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
        const temSelecao = !!el && typeof el.selectionStart === 'number' && el.selectionStart !== el.selectionEnd;
        if (!temSelecao) return;
      }
      window.dispatchEvent(new CustomEvent<DetalheCopiaEDA>(EVENTO_COPIA_EDA, { detail: { mensagem, ok: true } }));
    };
    const aoCopiar = nativo('Copiado');
    const aoRecortar = nativo('Recortado');
    const aoColar = nativo('Colado');
    window.addEventListener(EVENTO_COPIA_EDA, ouvir);
    document.addEventListener('copy', aoCopiar);
    document.addEventListener('cut', aoRecortar);
    document.addEventListener('paste', aoColar);
    return () => {
      window.removeEventListener(EVENTO_COPIA_EDA, ouvir);
      document.removeEventListener('copy', aoCopiar);
      document.removeEventListener('cut', aoRecortar);
      document.removeEventListener('paste', aoColar);
      window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <div className="eda-copia-regiao" role="status" aria-live="polite">
      {aviso && (
        <div key={aviso.n} className={`eda-copia ${aviso.ok ? '' : 'eda-copia-erro'}`}>
          <span className="eda-copia-marca" aria-hidden="true">E</span>
          <span className="eda-copia-txt"><b>{aviso.mensagem}</b><small>Encantos da Amazônia</small></span>
          {aviso.ok && (
            <svg className="eda-copia-ok" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      )}
      <style>{`
        .eda-copia-regiao{position:fixed;left:50%;bottom:calc(22px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:9999;pointer-events:none}
        .eda-copia{display:flex;align-items:center;gap:10px;padding:9px 14px 9px 9px;border-radius:999px;
          background:rgba(7,17,14,.94);color:#edede3;border:1px solid rgba(227,161,68,.55);
          box-shadow:0 14px 40px rgba(0,0,0,.35);backdrop-filter:blur(10px);font-family:var(--font-geist),system-ui,sans-serif;
          animation:eda-copia-in .28s cubic-bezier(.2,.9,.3,1.2) both, eda-copia-out .3s ease 2.3s both}
        .eda-copia-erro{border-color:rgba(248,113,113,.7)}
        .eda-copia-marca{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;
          background:linear-gradient(135deg,#e3a144,#b5762a);color:#07110e;font-weight:800;font-family:var(--font-fraunces),Georgia,serif;font-size:16px}
        .eda-copia-txt{display:grid;line-height:1.15}.eda-copia-txt b{font-size:13.5px}.eda-copia-txt small{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#e3a144}
        .eda-copia-ok{color:#4ade80}
        @keyframes eda-copia-in{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:none}}
        @keyframes eda-copia-out{to{opacity:0;transform:translateY(8px)}}
        @media (prefers-reduced-motion:reduce){.eda-copia{animation:none}}
      `}</style>
    </div>
  );
}

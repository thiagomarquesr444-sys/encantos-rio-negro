'use client';

import { useEffect, useRef, useState } from 'react';

type ConviteInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
};

export default function InstalarERN() {
  const convite = useRef<ConviteInstalacao | null>(null);
  const ocupado = useRef(false);
  const montado = useRef(false);
  const [disponivel, setDisponivel] = useState(false);
  const [instalando, setInstalando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    montado.current = true;
    const modoApp = window.matchMedia('(display-mode: standalone)');

    function receberConvite(evento: Event) {
      if (modoApp.matches) return;
      evento.preventDefault();
      convite.current = evento as ConviteInstalacao;
      setDisponivel(true);
    }

    function instalado() {
      convite.current = null;
      setDisponivel(false);
      setErro('');
    }

    function mudarModo() {
      if (modoApp.matches) instalado();
    }

    window.addEventListener('beforeinstallprompt', receberConvite);
    window.addEventListener('appinstalled', instalado);
    modoApp.addEventListener('change', mudarModo);

    return () => {
      montado.current = false;
      convite.current = null;
      window.removeEventListener('beforeinstallprompt', receberConvite);
      window.removeEventListener('appinstalled', instalado);
      modoApp.removeEventListener('change', mudarModo);
    };
  }, []);

  async function instalar() {
    const evento = convite.current;
    if (!evento || ocupado.current) return;

    ocupado.current = true;
    setInstalando(true);
    setErro('');

    try {
      await evento.prompt();
      await evento.userChoice;
    } catch {
      if (montado.current) {
        setErro('Use a op\u00e7\u00e3o de instalar no menu do navegador.');
      }
    } finally {
      convite.current = null;
      ocupado.current = false;

      if (montado.current) {
        setInstalando(false);
        setDisponivel(false);
      }
    }
  }

  if (!disponivel && !erro) return null;

  return (
    <aside aria-label="Instalar ERN" className="instalar-ern">
      {erro ? (
        <p role="status">{erro}</p>
      ) : (
        <button
          type="button"
          disabled={instalando}
          onClick={() => void instalar()}
        >
          {instalando ? 'Abrindo\u2026' : 'Instalar ERN'}
          <span aria-hidden="true"> ↗</span>
        </button>
      )}

      <button
        type="button"
        className="fechar"
        aria-label="Fechar convite de instala\u00e7\u00e3o"
        disabled={instalando}
        onClick={() => {
          setDisponivel(false);
          setErro('');
        }}
      >
        ×
      </button>

      <style jsx>{`
        .instalar-ern {
          position: fixed;
          right: 16px;
          bottom: calc(16px + env(safe-area-inset-bottom, 0px));
          z-index: 60;
          display: flex;
          align-items: center;
          max-width: calc(100vw - 32px);
          border: 1px solid #cdba7a;
          border-radius: 16px;
          background: #fffcf0;
          color: #30260d;
          box-shadow: 0 8px 28px #0003;
        }
        button {
          min-height: 48px;
          padding: 10px 16px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        }
        .fechar { min-width: 48px; font-size: 22px; }
        p { padding: 12px 16px; font-size: 13px; }
        button:disabled { opacity: .6; cursor: default; }
        button:focus-visible {
          outline: 3px solid #805600;
          outline-offset: 3px;
        }
      `}</style>
    </aside>
  );
}
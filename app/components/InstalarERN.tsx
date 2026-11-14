'use client';

import { useEffect, useRef, useState } from 'react';

type ConviteInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
};

// ERN_FLUTUANTES_CELULAR_V1: o convite aparece uma vez; fechado, some por 30 dias.
const CHAVE_DISPENSA = 'ern-instalar-dispensado-v1';
const TRINTA_DIAS = 30 * 24 * 3600 * 1000;

function dispensadoRecentemente(): boolean {
  try {
    const em = Number(localStorage.getItem(CHAVE_DISPENSA) || 0);
    return em > 0 && Date.now() - em < TRINTA_DIAS;
  } catch {
    return false;
  }
}

function registrarDispensa(): void {
  try { localStorage.setItem(CHAVE_DISPENSA, String(Date.now())); } catch { /* sem armazenamento */ }
}

export default function InstalarERN() {
  const convite = useRef<ConviteInstalacao | null>(null);
  const ocupado = useRef(false);
  const montado = useRef(false);
  const [disponivel, setDisponivel] = useState(false);
  const [instalando, setInstalando] = useState(false);
  const [erro, setErro] = useState('');
  const iosRef = useRef(false);

  useEffect(() => {
    montado.current = true;
    const modoApp = window.matchMedia('(display-mode: standalone)');

    function receberConvite(evento: Event) {
      if (modoApp.matches) return;
      evento.preventDefault();
      if (dispensadoRecentemente()) { convite.current = evento as ConviteInstalacao; return; }
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

    // EDA_IOS_V1: iPhone não tem o convite automático; mostramos o passo a passo.
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
    const jaInstalado = modoApp.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (ios && !jaInstalado && !dispensadoRecentemente()) {
      iosRef.current = true;
      setDisponivel(true);
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
    if (iosRef.current) {
      setErro('No Safari, toque em Compartilhar (quadrado com seta) e depois em \u201cAdicionar \u00e0 Tela de In\u00edcio\u201d.');
      return;
    }
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
    <aside aria-label="Instalar EDA" className="instalar-ern">
      {erro ? (
        <p role="status">{erro}</p>
      ) : (
        <button
          type="button"
          disabled={instalando}
          onClick={() => void instalar()}
        >
          {instalando ? 'Abrindo\u2026' : 'Instalar EDA'}
          <span aria-hidden="true"> ↗</span>
        </button>
      )}

      <button
        type="button"
        className="fechar"
        aria-label="Fechar convite de instala\u00e7\u00e3o"
        disabled={instalando}
        onClick={() => {
          registrarDispensa();
          setDisponivel(false);
          setErro('');
        }}
      >
        ×
      </button>

      <style jsx>{`
        .instalar-ern {
          position: fixed;
          left: 16px;
          bottom: calc(16px + env(safe-area-inset-bottom, 0px));
          z-index: 60;
          display: flex;
          align-items: center;
          max-width: calc(100vw - 32px);
          border: 1px solid #d6d2c8;
          border-radius: 16px;
          background: #ffffff;
          color: #0f1c17;
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
          outline: 3px solid #8a4b12;
          outline-offset: 3px;
        }
      `}</style>
    </aside>
  );
}
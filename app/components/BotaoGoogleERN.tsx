'use client';

// ERN_GOOGLE_GIS_V1
// Login com o botão oficial do Google (Google Identity Services).
// O Google mostra o site da EDA (não o domínio *.supabase.co) e devolve um
// ID token, que é validado pelo Supabase via signInWithIdToken.
// Nonce: o Google recebe o hash SHA-256; o Supabase recebe o valor bruto
// e confere que batem (impede reuso do token).

import { useEffect, useRef, useState } from 'react';

type CredencialGoogle = { credential?: string };
type GoogleId = {
  initialize: (cfg: Record<string, unknown>) => void;
  renderButton: (el: HTMLElement, opcoes: Record<string, unknown>) => void;
  cancel?: () => void;
};
declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } };
  }
}

const SCRIPT_GIS = 'https://accounts.google.com/gsi/client';

function carregarScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  const existente = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_GIS}"]`);
  return new Promise((resolve, reject) => {
    const s = existente ?? document.createElement('script');
    s.addEventListener('load', () => resolve(), { once: true });
    s.addEventListener('error', () => reject(new Error('gis')), { once: true });
    if (!existente) {
      s.src = SCRIPT_GIS;
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    } else if (window.google?.accounts?.id) {
      resolve();
    }
  });
}

async function gerarNonce(): Promise<{ bruto: string; hash: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const bruto = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(bruto));
  const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return { bruto, hash };
}

export default function BotaoGoogleERN({
  clientId,
  texto,
  desabilitado,
  aoCredencial,
  aoFalhar,
}: {
  clientId: string;
  texto: 'signin_with' | 'signup_with' | 'continue_with';
  desabilitado: boolean;
  aoCredencial: (token: string, nonce: string) => void;
  aoFalhar: () => void;
}) {
  const alvo = useRef<HTMLDivElement>(null);
  const callback = useRef(aoCredencial);
  const falha = useRef(aoFalhar);
  const [pronto, setPronto] = useState(false);
  callback.current = aoCredencial;
  falha.current = aoFalhar;

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const [{ bruto, hash }] = await Promise.all([gerarNonce(), carregarScript()]);
        const gis = window.google?.accounts?.id;
        if (!ativo || !gis || !alvo.current) return;
        gis.initialize({
          client_id: clientId,
          nonce: hash,
          ux_mode: 'popup',
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_button: true,
          callback: (r: CredencialGoogle) => {
            if (r.credential) callback.current(r.credential, bruto);
          },
        });
        const largura = Math.min(400, Math.max(200, Math.floor(alvo.current.getBoundingClientRect().width)));
        gis.renderButton(alvo.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: texto,
          logo_alignment: 'center',
          locale: 'pt-BR',
          width: largura,
        });
        setPronto(true);
      } catch {
        if (ativo) falha.current();
      }
    })();
    return () => {
      ativo = false;
      window.google?.accounts?.id?.cancel?.();
    };
  }, [clientId, texto]);

  return (
    <div
      aria-busy={!pronto}
      aria-disabled={desabilitado}
      className={`flex min-h-[44px] w-full justify-center ${desabilitado ? 'pointer-events-none opacity-60' : ''}`}
    >
      <div ref={alvo} className="w-full max-w-[400px]" />
    </div>
  );
}

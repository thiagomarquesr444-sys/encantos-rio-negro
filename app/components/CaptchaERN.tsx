'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

type ApiTurnstile = {
  render: (container: HTMLElement, options: {
    sitekey: string; theme: 'dark'; language: string;
    size: 'flexible' | 'compact'; action: string;
    'response-field': boolean;
    callback: (token: string) => void;
    'error-callback': () => void;
    'expired-callback': () => void;
    'timeout-callback': () => void;
    'unsupported-callback': () => void;
  }) => string | undefined;
  remove: (id: string) => void;
};

export default function CaptchaERN({ sitekey, acao, revisao, onToken }: {
  sitekey: string;
  acao: string;
  revisao: number;
  onToken: (token: string | null) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [pronto, setPronto] = useState(false);
  const [estado, setEstado] = useState('Carregando verificação de segurança…');
  const [falhou, setFalhou] = useState(false);
  const [novaTentativa, setNovaTentativa] = useState(0);
  const [falhaScript, setFalhaScript] = useState(false);

  useEffect(() => {
    onToken(null);
    if (!pronto || !sitekey || !container.current) return;
    const api = (window as Window & { turnstile?: ApiTurnstile }).turnstile;
    if (!api) return;
    let ativo = true;
    setFalhou(false);
    setEstado('Conclua a verificação de segurança.');
    const invalidar = (mensagem: string, erro = false) => {
      if (!ativo) return;
      onToken(null);
      setEstado(mensagem);
      setFalhou(erro);
    };
    let id: string | undefined;
    try {
      id = api.render(container.current, {
        sitekey, theme: 'dark', language: 'pt-br', action: acao,
        size: container.current.clientWidth >= 300 ? 'flexible' : 'compact',
        'response-field': false,
        callback: (token) => {
          if (!ativo) return;
          onToken(token);
          setFalhou(false);
          setEstado('Verificação concluída. Você pode continuar.');
        },
        'expired-callback': () => invalidar('Verificação expirada. Aguarde a renovação.'),
        'timeout-callback': () => invalidar('O tempo da verificação terminou. Tente novamente.', true),
        'error-callback': () => invalidar('Não foi possível verificar. Confira sua conexão e tente novamente.', true),
        'unsupported-callback': () => invalidar('Use um navegador atualizado para concluir a verificação.', true),
      });
      if (!id) invalidar('Não foi possível iniciar a verificação. Tente novamente.', true);
    } catch {
      invalidar('Não foi possível iniciar a verificação. Tente novamente.', true);
    }
    return () => {
      ativo = false;
      onToken(null);
      if (id) { try { api.remove(id); } catch { /* Instância já removida. */ } }
    };
  }, [pronto, sitekey, acao, revisao, novaTentativa, onToken]);

  if (!sitekey) return <p role="alert" className="text-sm text-amber-200">Verificação de segurança indisponível. Tente novamente mais tarde.</p>;

  return <div className="min-w-0 rounded-xl border border-white/10 bg-black/10 p-3">
    <Script id="ern-turnstile" src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      strategy="afterInteractive" onReady={() => setPronto(true)}
      onError={() => {
        onToken(null); setFalhaScript(true); setFalhou(true);
        setEstado('A verificação não carregou. Confira sua conexão e recarregue a página.');
      }} />
    <div ref={container} className="flex min-h-[65px] justify-center" />
    <p role="status" aria-live="polite" className="mt-2 text-xs leading-5 text-[#EDEDE3]/75">{estado}</p>
    {falhou && <button type="button" className="mt-1 min-h-11 rounded-lg px-2 text-sm text-[#F4C77E] underline focus-visible:outline-2"
      onClick={() => {
        onToken(null);
        if (falhaScript) window.location.reload();
        else setNovaTentativa((atual) => atual + 1);
      }}>{falhaScript ? 'Recarregar página' : 'Tentar verificação novamente'}</button>}
    <p className="mt-1 text-[11px] leading-5 text-[#EDEDE3]/60">Proteção contra abuso por Cloudflare Turnstile.{' '}
      <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" className="underline">Privacidade</a>
    </p>
  </div>;
}

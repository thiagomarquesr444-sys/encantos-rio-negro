// EDA_SELO_ASSINATURA_V1: selo da assinatura — o Encontro das Águas
// (Rio Negro escuro encontrando o Solimões barrento), sem sigla.
// Variação por plano:
//   Grátis  → só o traço dos rios, em contorno (sem preenchimento)
//   Pro     → rios preenchidos, aro verde-floresta
//   Plus    → rios preenchidos, aro dourado fosco (código interno 'premium')
import { useId } from 'react';

type Nivel = 'gratis' | 'pro' | 'plus';

function nivelDoPlano(codigo?: string | null): Nivel {
  const c = (codigo ?? '').toLowerCase();
  if (c === 'premium' || c === 'plus') return 'plus';
  if (c === 'pro') return 'pro';
  return 'gratis';
}

export default function SeloAssinaturaEDA({ plano, tamanho = 32 }: { plano?: string | null; tamanho?: number | string }) {
  const id = useId().replace(/:/g, '');
  const nivel = nivelDoPlano(plano);
  const cheio = nivel !== 'gratis';
  const aro = nivel === 'plus' ? `url(#o${id})` : nivel === 'pro' ? '#3f9a73' : 'rgba(241,234,216,.55)';
  const rotulo = nivel === 'plus' ? 'Plus' : nivel === 'pro' ? 'Pro' : 'Grátis';

  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 48 48" role="img" aria-label={`Selo da assinatura ${rotulo} — Encontro das Águas`} style={{ display: 'block', flex: 'none' }}>
      <defs>
        <linearGradient id={`o${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e9cf98" />
          <stop offset=".5" stopColor="#b98a45" />
          <stop offset="1" stopColor="#6e4f22" />
        </linearGradient>
        <linearGradient id={`n${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a221d" />
          <stop offset="1" stopColor="#120e0b" />
        </linearGradient>
        <linearGradient id={`s${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b8794a" />
          <stop offset="1" stopColor="#8a542c" />
        </linearGradient>
        <clipPath id={`c${id}`}><circle cx="24" cy="24" r="21" /></clipPath>
      </defs>

      <circle cx="24" cy="24" r="23.5" fill="#06100c" />
      <g clipPath={`url(#c${id})`}>
        {cheio && (
          <>
            {/* Rio Negro */}
            <rect width="48" height="48" fill={`url(#n${id})`} />
            {/* Solimões */}
            <path d="M0 48 L0 22 C10 18 14 30 24 26 C34 22 38 32 48 28 L48 48Z" fill={`url(#s${id})`} />
            {/* correntezas */}
            <path d="M5 13 C11 11 14 16 21 14 M26 17 C32 14 36 19 43 16 M9 8 C14 6 17 10 23 9" fill="none" stroke="#4a3e35" strokeWidth=".6" strokeLinecap="round" />
            <path d="M5 32 C11 30 14 35 21 33 M25 37 C31 34 35 39 42 36 M10 41 C16 39 19 43 26 41" fill="none" stroke="#d29a62" strokeWidth=".6" strokeLinecap="round" opacity=".7" />
          </>
        )}
        {/* linha do encontro das águas */}
        <path d="M0 22 C10 18 14 30 24 26 C34 22 38 32 48 28" fill="none" stroke={cheio ? '#e6b67f' : 'rgba(241,234,216,.8)'} strokeWidth={cheio ? '.8' : '1.3'} strokeLinecap="round" />
        {!cheio && (
          <path d="M5 13 C11 11 14 16 21 14 M26 17 C32 14 36 19 43 16 M5 33 C11 31 14 36 21 34 M26 37 C32 34 36 39 43 36" fill="none" stroke="rgba(241,234,216,.45)" strokeWidth=".8" strokeLinecap="round" />
        )}
      </g>
      <circle cx="24" cy="24" r="22.3" fill="none" stroke={aro} strokeWidth="1.5" />
    </svg>
  );
}

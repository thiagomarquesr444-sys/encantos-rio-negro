// EDA_IARA_ICONE_V1: emblema da Iara (guardiã das águas).
// Círculo verde-floresta com aro dourado fino, gota d'água e duas ondas do rio.
// Substitui o "✦" em todos os pontos da conversa e no botão flutuante.
import { useId } from 'react';

export default function IconeIara({ tamanho = '100%' }: { tamanho?: number | string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 48 48" aria-hidden="true" focusable="false" style={{ display: 'block' }}>
      <defs>
        <radialGradient id={`f${id}`} cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#1f5a47" />
          <stop offset="60%" stopColor="#0d2a21" />
          <stop offset="100%" stopColor="#07140f" />
        </radialGradient>
        <linearGradient id={`o${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8dca0" />
          <stop offset="100%" stopColor="#d99a3e" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="23" fill={`url(#f${id})`} />
      <circle cx="24" cy="24" r="21.6" fill="none" stroke={`url(#o${id})`} strokeWidth="1.1" opacity=".9" />
      {/* gota */}
      <path d="M24 10.5c3.6 4.6 6.4 8.4 6.4 11.6a6.4 6.4 0 0 1-12.8 0c0-3.2 2.8-7 6.4-11.6Z" fill={`url(#o${id})`} />
      <path d="M21.4 21.6a2.9 2.9 0 0 0 2 3.1" fill="none" stroke="#0d2a21" strokeWidth="1.2" strokeLinecap="round" opacity=".55" />
      {/* ondas do rio */}
      <path d="M12.5 32.2c2.3-1.6 4.6-1.6 6.9 0s4.6 1.6 6.9 0 4.6-1.6 6.9 0 2.3 1.6 2.3 1.6" fill="none" stroke={`url(#o${id})`} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M16 36.6c2-1.3 4-1.3 6 0s4 1.3 6 0 4-1.3 6 0" fill="none" stroke={`url(#o${id})`} strokeWidth="1.4" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}

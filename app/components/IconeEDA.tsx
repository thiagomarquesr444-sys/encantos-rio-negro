// EDA_ICONE_V1: emblema da EDA (assistente da gestão), irmão do emblema da Iara.
// Mesmo círculo verde-floresta com aro dourado; no centro, o "E" dos rios
// três ondas douradas (os rios), ligadas à identidade Encantos da Amazônia.
import { useId } from 'react';

export default function IconeEDA({ tamanho = '100%' }: { tamanho?: number | string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="eda-ic" width={tamanho} height={tamanho} viewBox="0 0 48 48" aria-hidden="true" focusable="false" style={{ display: 'block' }}>
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
      {/* três braços em onda (os rios) */}
      <path d="M16 14.5c2.6-1.6 5.2-1.6 7.8 0s5.2 1.6 7.8 0" fill="none" stroke={`url(#o${id})`} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16 24c2.2-1.4 4.4-1.4 6.6 0s4.4 1.4 6.6 0" fill="none" stroke={`url(#o${id})`} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16 33.5c2.6-1.6 5.2-1.6 7.8 0s5.2 1.6 7.8 0" fill="none" stroke={`url(#o${id})`} strokeWidth="2.2" strokeLinecap="round" />
      {/* brilho */}
      <circle cx="34.5" cy="22.5" r="1.4" fill="#f8dca0" opacity=".85" />
    </svg>
  );
}

// EDA_ICONE_V2: selo premium da EDA (assistente da gestão), irmão do selo da Iara.
// Usa a marca da plataforma — o "E" dos rios em três cores (sol dourado,
// Solimões laranja, floresta verde) — dentro de um selo redondo verde-noite
// com aro dourado duplo. Redondo de propósito: não se confunde com a logo
// quadrada do menu. Os elementos ficam dentro de <g> para que os temas claros
// não recolorem a marca (o selo escuro é mantido em qualquer tema).
import { useId } from 'react';

export default function IconeEDA({ tamanho = '100%' }: { tamanho?: number | string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="eda-ic" width={tamanho} height={tamanho} viewBox="0 0 48 48" aria-hidden="true" focusable="false" style={{ display: 'block' }}>
      <defs>
        <radialGradient id={`f${id}`} cx="32%" cy="26%" r="82%">
          <stop offset="0%" stopColor="#1d5442" />
          <stop offset="55%" stopColor="#0f2c22" />
          <stop offset="100%" stopColor="#07110e" />
        </radialGradient>
        <linearGradient id={`o${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbe5b0" />
          <stop offset="45%" stopColor="#d99a3e" />
          <stop offset="100%" stopColor="#8a5a1c" />
        </linearGradient>
        <radialGradient id={`b${id}`} cx="30%" cy="20%" r="65%">
          <stop offset="0%" stopColor="#fff" stopOpacity=".16" />
          <stop offset="60%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g>
        <circle cx="24" cy="24" r="23.6" fill={`url(#f${id})`} />
        {/* "E" dos rios — mesmas cores da logo Encantos da Amazônia */}
        <g fill="none" strokeWidth="3.3" strokeLinecap="round">
          <path d="M16.4 15.6c5.4-2.2 8.6 2.2 14.6-.3" stroke="#F4C77E" />
          <path d="M16.4 24c4.4-1.9 7.6 2 12.4-.2" stroke="#D2873F" />
          <path d="M16.4 32.4c5.4-2.2 8.6 2.2 14.6-.3" stroke="#47B087" />
          <path d="M16.4 15.6v16.8" stroke="#F0F0E8" />
        </g>
        <circle cx="24" cy="24" r="21.2" fill={`url(#b${id})`} />
        {/* aro dourado duplo, igual ao selo da Iara */}
        <circle cx="24" cy="24" r="22.4" fill="none" stroke={`url(#o${id})`} strokeWidth="1.9" />
        <circle cx="24" cy="24" r="21.2" fill="none" stroke="#fbe5b0" strokeWidth=".45" opacity=".6" />
      </g>
    </svg>
  );
}

// EDA_JURUPARI_V1: selo do Jurupari — o legislador e organizador do folclore
// do Rio Negro — como rosto da EDA (assistente da gestão da operadora).
// Mesmo padrão do selo da Iara: retrato em círculo, aro dourado duplo e brilho.
// Arte vetorial própria (sem flautas/ritual sagrado: só o retrato do sábio).
// Cocar nas três cores da marca (sol, Solimões, floresta). O selo escuro é
// mantido em qualquer tema.
import { useId } from 'react';

export default function IconeEDA({ tamanho = '100%' }: { tamanho?: number | string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="eda-ic" width={tamanho} height={tamanho} viewBox="0 0 48 48" aria-hidden="true" focusable="false" style={{ display: 'block' }}>
      <defs>
    <radialGradient id={`f${id}`} cx="50%" cy="34%" r="80%">
      <stop offset="0%" stopColor="#1d5442"/>
      <stop offset="55%" stopColor="#0f2c22"/>
      <stop offset="100%" stopColor="#07110e"/>
    </radialGradient>
    <linearGradient id={`o${id}`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#fbe5b0"/>
      <stop offset="45%" stopColor="#d99a3e"/>
      <stop offset="100%" stopColor="#8a5a1c"/>
    </linearGradient>
    <linearGradient id={`pele${id}`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#b8784a"/>
      <stop offset="100%" stopColor="#7a4a2c"/>
    </linearGradient>
    <radialGradient id={`b${id}`} cx="30%" cy="20%" r="65%">
      <stop offset="0%" stopColor="#fff" stopOpacity=".16"/>
      <stop offset="60%" stopColor="#fff" stopOpacity="0"/>
    </radialGradient>
    <clipPath id={`c${id}`}><circle cx="24" cy="24" r="21.2"/></clipPath>
  </defs>
  <circle cx="24" cy="24" r="23.6" fill={`url(#f${id})`}/>
  <g clipPath={`url(#c${id})`}>
    {/* cocar: penas (sol, Solimoes, floresta) */}
    <g>
      <g transform="rotate(74 24 18.5)"><path d="M24 18.5 C21.9 13.6 22 7.6 24 3.4 C26 7.6 26.1 13.6 24 18.5Z" fill="#D2873F"/><path d="M24 17.5 V5.4" stroke="#3a2412" strokeWidth=".35" opacity=".55"/></g>
      <g transform="rotate(-74 24 18.5)"><path d="M24 18.5 C21.9 13.6 22 7.6 24 3.4 C26 7.6 26.1 13.6 24 18.5Z" fill="#D2873F"/><path d="M24 17.5 V5.4" stroke="#3a2412" strokeWidth=".35" opacity=".55"/></g>
      <g transform="rotate(56 24 18.5)"><path d="M24 18.5 C21.9 13.6 22 7.6 24 3.4 C26 7.6 26.1 13.6 24 18.5Z" fill="#F4C77E"/><path d="M24 17.5 V5.4" stroke="#3a2412" strokeWidth=".35" opacity=".55"/></g>
      <g transform="rotate(-56 24 18.5)"><path d="M24 18.5 C21.9 13.6 22 7.6 24 3.4 C26 7.6 26.1 13.6 24 18.5Z" fill="#F4C77E"/><path d="M24 17.5 V5.4" stroke="#3a2412" strokeWidth=".35" opacity=".55"/></g>
      <g transform="rotate(36 24 18.5)"><path d="M24 18.5 C21.9 13.6 22 7.6 24 3.4 C26 7.6 26.1 13.6 24 18.5Z" fill="#47B087"/><path d="M24 17.5 V5.4" stroke="#3a2412" strokeWidth=".35" opacity=".55"/></g>
      <g transform="rotate(-36 24 18.5)"><path d="M24 18.5 C21.9 13.6 22 7.6 24 3.4 C26 7.6 26.1 13.6 24 18.5Z" fill="#47B087"/><path d="M24 17.5 V5.4" stroke="#3a2412" strokeWidth=".35" opacity=".55"/></g>
      <g transform="rotate(18 24 18.5)"><path d="M24 18.5 C21.9 13.6 22 7.6 24 3.4 C26 7.6 26.1 13.6 24 18.5Z" fill="#D2873F"/><path d="M24 17.5 V5.4" stroke="#3a2412" strokeWidth=".35" opacity=".55"/></g>
      <g transform="rotate(-18 24 18.5)"><path d="M24 18.5 C21.9 13.6 22 7.6 24 3.4 C26 7.6 26.1 13.6 24 18.5Z" fill="#D2873F"/><path d="M24 17.5 V5.4" stroke="#3a2412" strokeWidth=".35" opacity=".55"/></g>
      <g transform="rotate(0 24 18.5)"><path d="M24 18.5 C21.9 13.6 22 7.6 24 3.4 C26 7.6 26.1 13.6 24 18.5Z" fill="#F4C77E"/><path d="M24 17.5 V5.4" stroke="#3a2412" strokeWidth=".35" opacity=".55"/></g>
    </g>
    {/* ombros / corpo */}
    <path d="M7 48 C8 37 15 34.2 24 34.2 C33 34.2 40 37 41 48 Z" fill="#6e4127"/>
    {/* colar de sementes */}
    <path d="M14.2 37.4 Q24 43.6 33.8 37.4" fill="none" stroke="#c9862f" strokeWidth="1.5" strokeDasharray="1.1 .7"/>
    <path d="M16.4 39.6 Q24 45 31.6 39.6" fill="none" stroke="#7b2c3a" strokeWidth="1.3" strokeDasharray="1 .7"/>
    {/* pescoço */}
    <path d="M20.6 30 h6.8 v5.2 q-3.4 1.6 -6.8 0z" fill="#7a4a2c"/>
    {/* cabelo */}
    <path d="M15.2 22.4 C15 15.6 19 13 24 13 C29 13 33 15.6 32.8 22.4 L32.6 27 C31.4 25 31 22 30.4 19.6 L17.6 19.6 C17 22 16.6 25 15.4 27 Z" fill="#141010"/>
    {/* rosto */}
    <path d="M17.2 20.2 C17.2 16.8 20 16 24 16 C28 16 30.8 16.8 30.8 20.2 C30.8 26.4 27.6 31.2 24 31.2 C20.4 31.2 17.2 26.4 17.2 20.2 Z" fill={`url(#pele${id})`}/>
    {/* franja reta */}
    <path d="M17 19.4 C17.4 16.2 20.4 15 24 15 C27.6 15 30.6 16.2 31 19.4 Z" fill="#141010"/>
    {/* faixa da testa (tiara do cocar) */}
    <path d="M16.6 18.4 Q24 15.6 31.4 18.4" fill="none" stroke={`url(#o${id})`} strokeWidth="1.3"/>
    {/* sobrancelhas firmes */}
    <path d="M19.6 21.3 l3 .5 M28.4 21.3 l-3 .5" stroke="#141010" strokeWidth=".8" strokeLinecap="round"/>
    {/* olhos */}
    <ellipse cx="21.3" cy="22.9" rx="1.15" ry=".6" fill="#120c0a"/>
    <ellipse cx="26.7" cy="22.9" rx="1.15" ry=".6" fill="#120c0a"/>
    {/* pintura de urucum */}
    <path d="M19 24.9 h3.4 M19.4 26 h2.8 M25.6 24.9 h3.4 M25.8 26 h2.8" stroke="#c2412d" strokeWidth=".55" strokeLinecap="round"/>
    {/* nariz e boca */}
    <path d="M24 23.4 v3 l-.8 .5" fill="none" stroke="#5c341f" strokeWidth=".45" strokeLinecap="round"/>
    <path d="M22.4 28.6 h3.2" stroke="#4a2a18" strokeWidth=".6" strokeLinecap="round"/>
  </g>
  <circle cx="24" cy="24" r="21.2" fill={`url(#b${id})`}/>
  <circle cx="24" cy="24" r="22.4" fill="none" stroke={`url(#o${id})`} strokeWidth="1.9"/>
  <circle cx="24" cy="24" r="21.2" fill="none" stroke="#fbe5b0" strokeWidth=".45" opacity=".6"/>
    </svg>
  );
}

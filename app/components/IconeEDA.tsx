// EDA_JURUPARI_V2: selo do Jurupari (legislador e organizador do folclore do
// Rio Negro) como rosto da EDA, assistente da gestão. Retrato realista próprio
// recortado em círculo, aro dourado duplo e brilho — mesmo padrão da Iara.
import { useId } from 'react';

export default function IconeEDA({ tamanho = '100%' }: { tamanho?: number | string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="eda-ic" width={tamanho} height={tamanho} viewBox="0 0 48 48" aria-hidden="true" focusable="false" style={{ display: 'block' }}>
      <defs>
        <clipPath id={`c${id}`}>
          <circle cx="24" cy="24" r="21.2" />
        </clipPath>
        <linearGradient id={`o${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbe5b0" />
          <stop offset="45%" stopColor="#d99a3e" />
          <stop offset="100%" stopColor="#8a5a1c" />
        </linearGradient>
        <radialGradient id={`b${id}`} cx="30%" cy="22%" r="70%">
          <stop offset="0%" stopColor="#fff" stopOpacity=".22" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`v${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="72%" stopColor="#07140f" stopOpacity="0" />
          <stop offset="100%" stopColor="#07140f" stopOpacity=".55" />
        </radialGradient>
      </defs>
      <g>
        {/* base verde-floresta */}
        <circle cx="24" cy="24" r="23.6" fill="#07140f" />
        {/* retrato */}
        <image
          href="/images/marcos/jurupari-avatar.webp"
          x="2.8" y="2.8" width="42.4" height="42.4"
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#c${id})`}
        />
        {/* vinheta e brilho premium */}
        <circle cx="24" cy="24" r="21.2" fill={`url(#v${id})`} />
        <circle cx="24" cy="24" r="21.2" fill={`url(#b${id})`} />
        {/* aro dourado duplo */}
        <circle cx="24" cy="24" r="22.4" fill="none" stroke={`url(#o${id})`} strokeWidth="1.9" />
        <circle cx="24" cy="24" r="21.2" fill="none" stroke="#fbe5b0" strokeWidth=".45" opacity=".7" />
      </g>
    </svg>
  );
}

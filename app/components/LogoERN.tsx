// ERN_LOGO_MONOGRAMA_V1
// Nova marca: "E" de Encantos desenhado por três rios
// (sol, Solimões e floresta) em um ícone verde-noite.
// Vetor leve, sem WebGL: nítido em qualquer tamanho e rápido no interior.
// A versão anterior (3D) foi guardada em C:\Users\thiag\ERN-backups\marca-v1.

type LogoERNProps = {
  tamanho?: number;
  /** Mantido por compatibilidade; o vetor não precisa de pré-carregamento. */
  prioridade?: boolean;
};

export default function LogoERN({ tamanho = 48 }: LogoERNProps) {
  // Mesmo id em todas as instâncias: o degradê é idêntico, então não há conflito.
  const fundo = 'ern-logo-fundo';

  return (
    <svg
      role="img"
      aria-label="Encantos da Amazônia"
      width={tamanho}
      height={tamanho}
      viewBox="0 0 120 120"
      className="shrink-0 drop-shadow-[0_6px_16px_rgba(0,0,0,0.28)]"
    >
      <defs>
        <linearGradient id={fundo} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#143F31" />
          <stop offset="1" stopColor="#07110E" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="112" height="112" rx="30" fill={`url(#${fundo})`} />
      <rect x="4.5" y="4.5" width="111" height="111" rx="29.5" fill="none" stroke="#F4C77E" strokeOpacity="0.22" />
      <g fill="none" strokeWidth="10" strokeLinecap="round">
        <path d="M34 32 C 54 24, 66 40, 88 31" stroke="#F4C77E" />
        {/* Barra do meio = Rio Negro: preto predominante, com veios de Solimões (marrom) e floresta (verde). */}
        <path d="M34 60 C 50 53, 62 67, 80 59" stroke="#F0F0E8" strokeOpacity="0.3" strokeWidth="12.5" />
        <path d="M34 60 C 50 53, 62 67, 80 59" stroke="#050806" />
        <path d="M34 58 C 50 51, 62 65, 80 57" stroke="#D2873F" strokeWidth="1.8" strokeDasharray="12 9 4 14" />
        <path d="M34 62 C 50 55, 62 69, 80 61" stroke="#47B087" strokeWidth="1.8" strokeDasharray="5 11 14 7" />
        <path d="M34 88 C 54 80, 66 96, 88 87" stroke="#47B087" />
        <path d="M34 32 V88" stroke="#F0F0E8" />
      </g>
    </svg>
  );
}

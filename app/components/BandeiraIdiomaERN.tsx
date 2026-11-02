import type { Idioma } from '@/lib/i18n/types';

// ERN_BANDEIRAS_V1: bandeiras em SVG (o Windows não exibe bandeiras em emoji).
// PT = Brasil, EN = Estados Unidos, ES = Espanha.

export default function BandeiraIdiomaERN({ idioma, tamanho = 20 }: { idioma: Idioma; tamanho?: number }) {
  const altura = Math.round(tamanho * 0.7);
  const comum = {
    width: tamanho,
    height: altura,
    'aria-hidden': true,
    className: 'shrink-0 overflow-hidden rounded-[3px] shadow-[0_0_0_1px_rgb(255_255_255/25%)]',
  } as const;

  if (idioma === 'PT') {
    return (
      <svg viewBox="0 0 20 14" {...comum}>
        <rect width="20" height="14" fill="#009B3A" />
        <path d="M10 1.6 18 7l-8 5.4L2 7z" fill="#FEDF00" />
        <circle cx="10" cy="7" r="3.1" fill="#002776" />
        <path d="M7 6.3c2-.6 4.2-.4 6 .7" stroke="#fff" strokeWidth=".6" fill="none" />
      </svg>
    );
  }

  if (idioma === 'EN') {
    return (
      <svg viewBox="0 0 20 14" {...comum}>
        <rect width="20" height="14" fill="#fff" />
        {[0, 2, 4, 6, 8, 10, 12].map((y) => (
          <rect key={y} y={y * (14 / 13) * 1} width="20" height={14 / 13} fill="#B22234" />
        ))}
        <rect width="8.6" height={(14 / 13) * 7} fill="#3C3B6E" />
        {[1.2, 3.4, 5.6].map((y) =>
          [1.2, 3.1, 5, 6.9].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r=".42" fill="#fff" />),
        )}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 14" {...comum}>
      <rect width="20" height="14" fill="#AA151B" />
      <rect y="3.5" width="20" height="7" fill="#F1BF00" />
    </svg>
  );
}

import type { ReactNode } from 'react';

// IARA_ICONES_PREMIUM_V1: no lugar dos emojis comuns, a Iara usa ícones
// próprios da marca (traço dourado). Qualquer emoji conhecido no texto vira
// o ícone correspondente; os demais emojis são removidos.

const TRACOS: Record<string, string> = {
  onda: 'M2 10c3-3 5 3 8 0s5 3 8 0 3 0 4 0M2 16c3-3 5 3 8 0s5 3 8 0 3 0 4 0',
  mapa: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  estrela: 'M12 3l2.4 5.6L20 9.3l-4.4 3.9 1.3 5.8L12 16l-4.9 3 1.3-5.8L4 9.3l5.6-.7z',
  lua: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  canoa: 'M2 14h20l-3 4H5zM12 4v10M12 5l5 7h-5',
  peixe: 'M3 12c4-5 10-5 14 0-4 5-10 5-14 0zM17 12l4-3v6zM8 11.5h.01',
  folha: 'M5 19c0-8 5-14 15-14 0 10-6 15-14 15M5 19l7-7',
};

const EMOJIS: [RegExp, string][] = [
  [/🌊/gu, 'onda'], [/🗺️?/gu, 'mapa'], [/🎉|✨|⭐|🌟/gu, 'estrela'], [/🌙/gu, 'lua'],
  [/🛶|⛵|🚤/gu, 'canoa'], [/🐟|🎣|🐠/gu, 'peixe'], [/🌿|🌳|🍃|🌴/gu, 'folha'],
];

export function IconeIaraEDA({ nome }: { nome: string }) {
  const d = TRACOS[nome];
  if (!d) return null;
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="1.05em" height="1.05em" fill="none"
      stroke="url(#iara-ouro)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'inline-block', verticalAlign: '-0.16em', margin: '0 0.12em', filter: 'drop-shadow(0 0 4px rgb(244 199 126 / 45%))' }}>
      <defs>
        <linearGradient id="iara-ouro" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F7D595" /><stop offset="1" stopColor="#E3A144" />
        </linearGradient>
      </defs>
      <path d={d} />
    </svg>
  );
}

const MARCA = '\u0000';

/** Texto da Iara com os emojis trocados pelos ícones da marca. */
export function comIconesIara(texto: string): ReactNode {
  let t = texto;
  const ordem: string[] = [];
  for (const [re, nome] of EMOJIS) t = t.replace(re, () => { ordem.push(nome); return MARCA + nome + MARCA; });
  // Demais emojis: fora.
  t = t.replace(/\p{Extended_Pictographic}️?/gu, '');
  if (!ordem.length) return t;
  return t.split(MARCA).map((parte, i) => (i % 2 === 1 ? <IconeIaraEDA key={i} nome={parte} /> : parte));
}

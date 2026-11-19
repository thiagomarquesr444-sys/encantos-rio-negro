'use client';
// SPELL_EDA_V1: faixa rolante discreta (estilo marquee). Pausa ao tocar/passar o
// mouse; com "reduzir movimento" ou sinal fraco vira lista parada.
import type { ReactNode } from 'react';
import './spell-eda.css';

type Props = {
  itens: readonly string[];
  render: (item: string) => ReactNode;
  duracaoSegundos?: number;
  rotulo?: string;
};

export default function FaixaRolanteEDA({ itens, render, duracaoSegundos = 40, rotulo }: Props) {
  return (
    <div className="eda-faixa" aria-label={rotulo}>
      <ul className="eda-faixa-trilho" style={{ ['--duracao' as string]: `${duracaoSegundos}s` }}>
        {itens.map((item) => (
          <li key={item} className="shrink-0">{render(item)}</li>
        ))}
        {itens.map((item) => (
          <li key={`copia-${item}`} aria-hidden="true" inert className="eda-faixa-copia shrink-0">{render(item)}</li>
        ))}
      </ul>
    </div>
  );
}

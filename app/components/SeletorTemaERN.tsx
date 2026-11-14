'use client';

import { useRef } from 'react';

// EDA_TEMAS_V3: só Noite e Claro (Automático removido).
export type TemaERN = 'verde' | 'branco';

export const OPCOES_TEMA_ERN: {
  valor: TemaERN;
  nome: string;
  cor: string;
}[] = [
  { valor: 'verde', nome: 'Noite', cor: '#07110E' },
  { valor: 'branco', nome: 'Claro', cor: '#F4F6F5' },
];

export default function SeletorTemaERN({
  valor,
  onEscolher,
  bloqueado = false,
}: {
  valor: TemaERN;
  onEscolher: (tema: TemaERN) => void;
  bloqueado?: boolean;
}) {
  const recipiente = useRef<HTMLDetailsElement>(null);
  const atual = OPCOES_TEMA_ERN.find(item => item.valor === valor)
    ?? OPCOES_TEMA_ERN[0];

  return (
    <details ref={recipiente} className="ern-tema-seletor"
      onKeyDown={event => {
        if (event.key === 'Escape' && recipiente.current) {
          recipiente.current.open = false;
          recipiente.current.querySelector('summary')?.focus();
        }
      }}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          if (recipiente.current) recipiente.current.open = false;
        }
      }}>
      <summary>
        <span className="ern-tema-amostra" aria-hidden="true"
          style={{ background: atual.cor }} />
        Tema · {atual.nome}
        <span aria-hidden="true">⌃</span>
      </summary>
      <div className="ern-tema-opcoes" role="group" aria-label="Tema da operadora">
        {OPCOES_TEMA_ERN.map(item => (
          <button key={item.valor} type="button"
            disabled={bloqueado}
            aria-pressed={valor === item.valor}
            onClick={() => {
              if (bloqueado) return;
              onEscolher(item.valor);
              if (recipiente.current) {
                recipiente.current.open = false;
                recipiente.current.querySelector('summary')?.focus();
              }
            }}>
            <span className="ern-tema-amostra" aria-hidden="true"
              style={{ background: item.cor }} />
            {item.nome}
            {valor === item.valor && <span aria-hidden="true">✓</span>}
          </button>
        ))}
      </div>
    </details>
  );
}
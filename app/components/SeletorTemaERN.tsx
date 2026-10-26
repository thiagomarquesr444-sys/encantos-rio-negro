'use client';

import { useRef } from 'react';

export type TemaERN = 'verde' | 'azul' | 'amarelo' | 'branco' | 'grafite';

export const OPCOES_TEMA_ERN: {
  valor: TemaERN;
  nome: string;
  cor: string;
}[] = [
  { valor: 'grafite', nome: 'Grafite', cor: '#101214' },
  { valor: 'verde', nome: 'Verde Rio Negro', cor: '#10231b' },
  { valor: 'azul', nome: 'Azul', cor: '#10263d' },
  { valor: 'amarelo', nome: 'Amarelo', cor: '#fff7db' },
  { valor: 'branco', nome: 'Branco', cor: '#ffffff' },
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
    ?? OPCOES_TEMA_ERN[1];

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
'use client';

// ERN_ESTILO_PAINEL_V1: atalho no menu lateral para cada pessoa escolher o estilo visual.

import { useEffect, useState } from 'react';
import {
  EVENTO_ESTILO_PAINEL,
  lerEstiloPainel,
  salvarEstiloPainel,
  type EstiloPainelERN,
} from '@/lib/estiloPainelERN';

const OPCOES: { valor: EstiloPainelERN; rotulo: string; dica: string }[] = [
  { valor: 'encantos', rotulo: 'Encantos', dica: 'Capa com grafismo amazônico e cartões magnéticos' },
  { valor: 'sobrio', rotulo: 'Sóbrio', dica: 'Cartões limpos, sem grafismo nem movimento' },
];

export default function EstiloPainelSeletorERN() {
  const [estilo, setEstilo] = useState<EstiloPainelERN>('encantos');

  useEffect(() => {
    setEstilo(lerEstiloPainel());
    const aoMudar = () => setEstilo(lerEstiloPainel());
    window.addEventListener(EVENTO_ESTILO_PAINEL, aoMudar);
    window.addEventListener('storage', aoMudar);
    return () => {
      window.removeEventListener(EVENTO_ESTILO_PAINEL, aoMudar);
      window.removeEventListener('storage', aoMudar);
    };
  }, []);

  return (
    <div role="group" aria-label="Estilo do painel" className="flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
      {OPCOES.map(({ valor, rotulo, dica }) => {
        const ativo = estilo === valor;
        return (
          <button
            key={valor}
            type="button"
            title={dica}
            aria-pressed={ativo}
            onClick={() => { salvarEstiloPainel(valor); setEstilo(valor); }}
            className={`min-h-9 flex-1 rounded-full text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E3A144] ${ativo ? 'bg-gradient-to-b from-[#F7D595] to-[#E3A144] text-[#07110E]' : 'text-[#CDD8D2] hover:text-white'}`}
          >
            {rotulo}
          </button>
        );
      })}
    </div>
  );
}

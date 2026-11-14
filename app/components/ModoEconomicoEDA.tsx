'use client';

import { useEffect, useState } from 'react';

import { useSinalFracoEDA } from '@/app/components/SinalEDA';
import { lerPreferenciaModoLeve, salvarPreferenciaModoLeve, type PreferenciaModoLeve } from '@/lib/conexaoEDA';

// EDA_MODO_LEVE_V1: escolha manual do Modo econômico.
// Automático (padrão): liga sozinho só quando o sinal está fraco.
const OPCOES: Array<{ valor: PreferenciaModoLeve; rotulo: string }> = [
  { valor: 'auto', rotulo: 'Automático' },
  { valor: 'ligado', rotulo: 'Sempre ligado' },
  { valor: 'desligado', rotulo: 'Desligado' },
];

export default function ModoEconomicoEDA({ variante = 'rodape' }: { variante?: 'rodape' | 'painel' }) {
  const [valor, setValor] = useState<PreferenciaModoLeve>('auto');
  const ativo = useSinalFracoEDA();

  useEffect(() => setValor(lerPreferenciaModoLeve()), []);

  const escolher = (novo: PreferenciaModoLeve) => {
    setValor(novo);
    salvarPreferenciaModoLeve(novo);
  };

  const estado = ativo ? 'ativo agora' : 'desligado agora';

  if (variante === 'rodape') {
    return (
      <label className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#EDEDE3]">
        <span>Modo econômico</span>
        <select
          value={valor}
          onChange={(e) => escolher(e.target.value as PreferenciaModoLeve)}
          aria-describedby="eda-modo-eco-estado"
          className="rounded-md border border-white/20 bg-[#0c1714] px-2 py-1 text-sm text-[#EDEDE3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E3A144]"
        >
          {OPCOES.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
        </select>
        <span id="eda-modo-eco-estado" className="text-xs font-normal text-[#8FA79A]">({estado})</span>
      </label>
    );
  }

  return (
    <div className="mt-5" role="group" aria-labelledby="eda-modo-eco-titulo">
      <p id="eda-modo-eco-titulo" className="text-sm font-semibold">Modo econômico (internet fraca)</p>
      <p className="mt-1 text-xs opacity-75">
        No automático, a plataforma fica mais leve só quando o sinal está fraco: vídeos e fotos em versão
        reduzida, sem animações e com check-ins guardados no aparelho se a internet cair. Com sinal normal,
        tudo funciona como sempre. Agora: {estado}.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {OPCOES.map((o) => (
          <button
            key={o.valor}
            type="button"
            aria-pressed={valor === o.valor}
            onClick={() => escolher(o.valor)}
            className="eda-pg-bt"
            style={valor === o.valor ? { borderColor: '#e3b567', color: '#e3b567' } : undefined}
          >
            {o.rotulo}
          </button>
        ))}
      </div>
    </div>
  );
}

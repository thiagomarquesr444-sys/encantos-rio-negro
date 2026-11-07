'use client';

// EDA_OPCOES_PADRAO_V1: lista padronizada + "Outro" (o que o cliente especificar).
// Valores antigos fora da lista aparecem como "Outro" já preenchido.

import { useEffect, useState } from 'react';
import { montarDuracao, separarDuracao, UNIDADES_DURACAO, type OpcaoEDA } from '@/lib/opcoesEDA';

const OUTRO = '__outro__';

type Props = {
  id?: string;
  valor: string;
  opcoes: readonly OpcaoEDA[];
  onChange: (valor: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  permitirOutro?: boolean;
};

export default function CampoOpcoesEDA({
  id, valor, opcoes, onChange, className, placeholder = 'Selecione', disabled, required, permitirOutro = true,
}: Props) {
  const naLista = opcoes.some(([v]) => v === valor);
  const [outro, setOutro] = useState(Boolean(valor) && !naLista);
  // Dados carregados depois (edição): valor fora da lista abre "Outro".
  useEffect(() => { if (valor && !naLista) setOutro(true); }, [valor, naLista]);
  const selecionado = outro ? OUTRO : naLista ? valor : '';

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <select
        id={id}
        className={className}
        value={selecionado}
        disabled={disabled}
        required={required && !outro}
        onChange={(e) => {
          if (e.target.value === OUTRO) { setOutro(true); onChange(''); return; }
          setOutro(false);
          onChange(e.target.value);
        }}
      >
        <option value="">{placeholder}</option>
        {opcoes.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        {permitirOutro && <option value={OUTRO}>Outro (especificar)…</option>}
      </select>
      {outro && (
        <input
          className={className}
          value={valor}
          maxLength={80}
          required={required}
          disabled={disabled}
          autoFocus
          placeholder="Especifique"
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

// Seleção múltipla em chips (ex.: idiomas). Valor salvo como texto "A, B, C".
export function CampoChipsEDA({ valor, opcoes, onChange, disabled }: {
  valor: string; opcoes: readonly OpcaoEDA[]; onChange: (valor: string) => void; disabled?: boolean;
}) {
  const marcados = valor.split(',').map((s) => s.trim()).filter(Boolean);
  const extras = marcados.filter((m) => !opcoes.some(([v]) => v === m));
  const [texto, setTexto] = useState('');
  const alternar = (v: string) => {
    const nova = marcados.includes(v) ? marcados.filter((m) => m !== v) : [...marcados, v];
    onChange(nova.join(', '));
  };
  return (
    <div className="eda-chips">
      {[...opcoes.map(([v, r]) => [v, r] as const), ...extras.map((e) => [e, e] as const)].map(([v, r]) => (
        <button key={v} type="button" aria-pressed={marcados.includes(v)} disabled={disabled} onClick={() => alternar(v)}>{r}</button>
      ))}
      <input
        value={texto}
        disabled={disabled}
        maxLength={40}
        placeholder="+ outro"
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          const t = texto.trim();
          if (t && !marcados.includes(t)) onChange([...marcados, t].join(', '));
          setTexto('');
        }}
      />
      <style jsx>{`
        .eda-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .eda-chips button, .eda-chips input { min-height: 38px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--ern-borda); background: transparent; color: var(--ern-texto); font-size: 13px; }
        .eda-chips button { cursor: pointer; }
        .eda-chips button[aria-pressed='true'] { border-color: var(--ern-destaque); background: rgb(227 161 68 / 16%); font-weight: 600; }
        .eda-chips input { width: 120px; }
      `}</style>
    </div>
  );
}

// Duração do passeio: número + unidade, gravada como "4h" ou "3 dias"
// (o banco converte para duracao_horas / duracao_dias).
export function CampoDuracaoEDA({ valor, onChange, className, disabled }: {
  valor: string; onChange: (valor: string) => void; className?: string; disabled?: boolean;
}) {
  const inicial = separarDuracao(valor);
  const [numero, setNumero] = useState(inicial.numero);
  const [unidade, setUnidade] = useState<'horas' | 'dias'>(inicial.unidade);
  const atualizar = (n: string, u: 'horas' | 'dias') => { setNumero(n); setUnidade(u); onChange(montarDuracao(n, u)); };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 1fr) minmax(110px, 1fr)', gap: 8 }}>
      <input className={className} type="number" min={unidade === 'horas' ? 0.5 : 1} max={unidade === 'horas' ? 24 : 60} step={unidade === 'horas' ? 0.5 : 1}
        inputMode="decimal" value={numero} disabled={disabled} placeholder="Ex.: 3" aria-label="Duração"
        onChange={(e) => atualizar(e.target.value, unidade)} />
      <select className={className} value={unidade} disabled={disabled} aria-label="Unidade da duração"
        onChange={(e) => atualizar(numero, e.target.value as 'horas' | 'dias')}>
        {UNIDADES_DURACAO.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
      </select>
    </div>
  );
}

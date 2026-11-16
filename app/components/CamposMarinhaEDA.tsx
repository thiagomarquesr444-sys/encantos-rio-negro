'use client';

/*
  EDA_CONFORMIDADE_V1 — documentação da embarcação junto à Marinha.
  Todos opcionais: não travam o operador pequeno. A EDA avisa vencimentos.
*/

export type MarinhaEDA = {
  inscricao_capitania: string;
  seguro_dpem_validade: string;
  condutor_habilitacao: string;
  condutor_habilitacao_validade: string;
};

export const MARINHA_VAZIA_EDA: MarinhaEDA = {
  inscricao_capitania: '',
  seguro_dpem_validade: '',
  condutor_habilitacao: '',
  condutor_habilitacao_validade: '',
};

export function marinhaDoRegistroEDA(r: Partial<Record<keyof MarinhaEDA, string | null>>): MarinhaEDA {
  return {
    inscricao_capitania: r.inscricao_capitania ?? '',
    seguro_dpem_validade: r.seguro_dpem_validade ?? '',
    condutor_habilitacao: r.condutor_habilitacao ?? '',
    condutor_habilitacao_validade: r.condutor_habilitacao_validade ?? '',
  };
}

export function marinhaParaSalvarEDA(m: MarinhaEDA) {
  const texto = (v: string, max: number) => v.trim().slice(0, max) || null;
  const data = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  return {
    inscricao_capitania: texto(m.inscricao_capitania, 60),
    seguro_dpem_validade: data(m.seguro_dpem_validade),
    condutor_habilitacao: texto(m.condutor_habilitacao, 60),
    condutor_habilitacao_validade: m.condutor_habilitacao.trim() ? data(m.condutor_habilitacao_validade) : null,
  };
}

type Props = {
  valor: MarinhaEDA;
  onChange: (novo: MarinhaEDA) => void;
  inputClass: string;
  labelClass: string;
};

export default function CamposMarinhaEDA({ valor, onChange, inputClass, labelClass }: Props) {
  const hoje = new Date().toISOString().slice(0, 10);
  const mudar = (campo: keyof MarinhaEDA, v: string) => onChange({ ...valor, [campo]: v });
  const vencida = (d: string) => Boolean(d) && d < hoje;

  return (
    <fieldset className="mt-2 rounded-2xl border border-white/10 p-4">
      <legend className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ern-destaque)]">
        Documentação na Marinha (opcional)
      </legend>
      <p className="mb-4 text-[11px] leading-5 text-[var(--ern-secundario)]">
        Organiza o que a Capitania dos Portos pede na fiscalização. A EDA avisa antes de vencer.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Inscrição na Capitania (TIE)</label>
          <input
            value={valor.inscricao_capitania}
            maxLength={60}
            onChange={(e) => mudar('inscricao_capitania', e.target.value)}
            placeholder="Número de inscrição da embarcação"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Seguro obrigatório (DPEM) válido até</label>
          <input
            type="date"
            value={valor.seguro_dpem_validade}
            onChange={(e) => mudar('seguro_dpem_validade', e.target.value)}
            className={inputClass}
          />
          {vencida(valor.seguro_dpem_validade) && (
            <p className="mt-1 text-[10px] font-semibold text-red-400">Seguro vencido.</p>
          )}
        </div>
        <div>
          <label className={labelClass}>Habilitação do condutor</label>
          <input
            value={valor.condutor_habilitacao}
            maxLength={60}
            onChange={(e) => mudar('condutor_habilitacao', e.target.value)}
            placeholder="Categoria e número (ex.: Arrais-Amador)"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Habilitação válida até</label>
          <input
            type="date"
            value={valor.condutor_habilitacao_validade}
            disabled={!valor.condutor_habilitacao.trim()}
            onChange={(e) => mudar('condutor_habilitacao_validade', e.target.value)}
            className={inputClass}
          />
          {vencida(valor.condutor_habilitacao_validade) && (
            <p className="mt-1 text-[10px] font-semibold text-red-400">Habilitação vencida.</p>
          )}
        </div>
      </div>
      <p className="mt-3 text-[10px] leading-5 text-[var(--ern-secundario)]">
        A capacidade acima é tratada como a lotação autorizada: a plataforma não deixa reservar
        mais pessoas que isso na mesma embarcação e no mesmo dia.
      </p>
    </fieldset>
  );
}

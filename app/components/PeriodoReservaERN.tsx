'use client';

import { useEffect, useId, useState } from 'react';
import SituacaoPeriodoReservaERN, {
  referenciaManausERN,
} from '@/app/components/SituacaoPeriodoReservaERN';

interface CamposPeriodo {
  data_fim_prevista: string;
  horario_fim_previsto: string;
}

interface Props {
  inicio: string;
  horarioInicio: string;
  fim: string;
  horarioFim: string;
  status: string;
  bloqueado: boolean;
  onChange: (campos: CamposPeriodo) => void;
}

function dataValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T12:00:00Z`);
  return Number.isFinite(data.getTime()) &&
    data.toISOString().slice(0, 10) === valor;
}

export function validarPeriodoReservaERN(
  inicio: string,
  horarioInicio: string,
  fim: string,
  horarioFim: string
): string | null {
  if (horarioFim && !fim) {
    return 'Informe a data de término antes do horário de término.';
  }

  if (fim && !dataValida(fim)) {
    return 'Informe uma data válida para o término previsto.';
  }

  if (horarioFim && !/^([01]\d|2[0-3]):[0-5]\d$/.test(horarioFim)) {
    return 'Informe um horário de término válido entre 00:00 e 23:59.';
  }

  if (fim && dataValida(inicio) && fim < inicio) {
    return 'O término previsto não pode ocorrer antes da data inicial.';
  }

  if (
    fim &&
    fim === inicio &&
    horarioInicio &&
    horarioFim &&
    horarioFim < horarioInicio
  ) {
    return 'No mesmo dia, o horário de término não pode ser anterior ao de saída.';
  }

  return null;
}

export default function PeriodoReservaERN({
  inicio,
  horarioInicio,
  fim,
  horarioFim,
  status,
  bloqueado,
  onChange,
}: Props) {
  const id = useId();
  const [referencia, setReferencia] = useState('');

  useEffect(() => {
    const atualizar = () => setReferencia(referenciaManausERN());
    atualizar();

    const intervalo = window.setInterval(atualizar, 60000);
    window.addEventListener('focus', atualizar);

    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener('focus', atualizar);
    };
  }, []);

  const erro = validarPeriodoReservaERN(
    inicio, horarioInicio, fim, horarioFim
  );

  const campo =
    'mt-2 min-h-12 w-full min-w-0 rounded-xl border border-white/15 bg-[#07110E] px-3 py-3 text-base text-[#EDEDE3] outline-none focus:border-[#E3A144] disabled:opacity-60 [color-scheme:dark] sm:text-sm';

  return (
    <fieldset
      disabled={bloqueado}
      className="mb-5 min-w-0 rounded-xl border border-white/15 p-4"
    >
      <legend className="px-2 text-sm font-semibold text-[#F4C77E]">
        Término previsto
      </legend>

      <p id={`${id}-ajuda`} className="text-xs leading-6 text-[#C5D4CA]">
        Opcional. Informe quando o passeio deve terminar, no horário
        de Manaus. Esta previsão não encerra a reserva.
      </p>

      <div className="mt-3 grid min-w-0 gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor={`${id}-data`} className="text-sm text-[#C5D4CA]">
            Data de término
          </label>
          <input
            id={`${id}-data`}
            type="date"
            value={fim}
            min={dataValida(inicio) ? inicio : undefined}
            aria-describedby={`${id}-ajuda${erro ? ` ${id}-erro` : ''}`}
            aria-invalid={Boolean(erro)}
            onChange={(event) => onChange({
              data_fim_prevista: event.target.value,
              horario_fim_previsto: event.target.value ? horarioFim : '',
            })}
            className={campo}
          />
        </div>

        <div className="min-w-0">
          <label htmlFor={`${id}-hora`} className="text-sm text-[#C5D4CA]">
            Horário de término
          </label>
          <input
            id={`${id}-hora`}
            type="time"
            step={60}
            value={horarioFim}
            disabled={bloqueado || !fim}
            aria-describedby={`${id}-ajuda${erro ? ` ${id}-erro` : ''}`}
            aria-invalid={Boolean(erro)}
            onChange={(event) => onChange({
              data_fim_prevista: fim,
              horario_fim_previsto: event.target.value,
            })}
            className={campo}
          />
        </div>
      </div>

      {erro && (
        <p id={`${id}-erro`} className="mt-3 text-sm text-red-200">
          {erro}
        </p>
      )}

      <div className="mt-3" aria-live="polite">
        <SituacaoPeriodoReservaERN
          status={status}
          inicio={inicio}
          fim={fim}
          horarioFim={horarioFim}
          referencia={referencia}
          detalhado
        />
      </div>
    </fieldset>
  );
}
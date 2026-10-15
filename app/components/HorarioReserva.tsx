'use client';

import { useId, useRef, useState } from 'react';

type Props = {
  value: string;
  disabled?: boolean;
  onChange: (valor: string) => void;
};

const horas = Array.from({ length: 24 }, (_, indice) =>
  String(indice).padStart(2, '0'),
);

function normalizar(valor: string) {
  return /^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(valor)
    ? valor.slice(0, 5)
    : '';
}

export default function HorarioReserva({
  value,
  disabled = false,
  onChange,
}: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);
  const tituloId = useId();
  const ajudaId = useId();
  const erroId = useId();
  const [rascunho, setRascunho] = useState('');
  const [erro, setErro] = useState('');

  const atual = normalizar(value);
  const partes = rascunho.split(':');
  const horaSelecionada = partes[0] ?? '';
  const minutoSelecionado = partes[1] ?? '';

  function abrir() {
    if (disabled) return;
    setRascunho(atual);
    setErro('');
    dialogo.current?.showModal();
    entrada.current?.focus();
  }

  function fechar() {
    dialogo.current?.close();
  }

  function confirmar() {
    const valido = normalizar(rascunho.trim());

    if (!valido) {
      setErro('Informe um horário entre 00:00 e 23:59.');
      entrada.current?.focus();
      return;
    }

    if (disabled) return;
    onChange(valido);
    fechar();
  }

  function escolherHora(hora: string) {
    const minuto = /^[0-5]\d$/.test(minutoSelecionado)
      ? minutoSelecionado
      : '00';

    setRascunho(`${hora}:${minuto}`);
    setErro('');
  }

  function escolherMinuto(minuto: string) {
    const hora = /^([01]\d|2[0-3])$/.test(horaSelecionada)
      ? horaSelecionada
      : '00';

    setRascunho(`${hora}:${minuto}`);
    setErro('');
  }

  const opcao =
    'min-h-11 rounded-xl border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C77E] disabled:opacity-50';

  const selecionado =
    'border-[#E3A144] bg-[#E3A144] font-semibold text-[#07110E]';

  const neutro =
    'border-white/10 bg-white/[0.03] text-[#EDEDE3] hover:border-[#E3A144]/60 hover:bg-white/[0.07]';

  return (
    <span className="mt-2 block min-w-0">
      <button
        ref={gatilho}
        type="button"
        disabled={disabled}
        aria-label={`Horário de saída: ${atual || 'não informado'}. Escolher horário`}
        aria-haspopup="dialog"
        onClick={abrir}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-white/15 bg-[#07110E] px-3 text-left text-sm text-[#EDEDE3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C77E] disabled:opacity-50"
      >
        <span className={atual ? 'font-semibold tabular-nums' : 'text-[#EDEDE3]/60'}>
          {atual || 'Selecionar horário'}
        </span>
        <svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className="shrink-0 text-[#F4C77E]"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </button>

      <dialog
        ref={dialogo}
        aria-labelledby={tituloId}
        aria-describedby={ajudaId}
        onClose={() => gatilho.current?.focus()}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const caixa = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < caixa.left ||
            event.clientX > caixa.right ||
            event.clientY < caixa.top ||
            event.clientY > caixa.bottom
          ) {
            fechar();
          }
        }}
        className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border border-[#E3A144]/25 bg-[#0C1C16] p-5 text-[#EDEDE3] shadow-2xl backdrop:bg-black/70 sm:inset-0 sm:m-auto sm:w-[440px] sm:max-w-[calc(100vw-2rem)] sm:rounded-3xl sm:p-6"
      >
        <span className="flex items-start justify-between gap-3">
          <span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F4C77E]">
              Logística da operação
            </span>
            <span
              id={tituloId}
              className="mt-1 block text-xl font-semibold"
            >
              Horário de saída
            </span>
          </span>
          <button
            type="button"
            aria-label="Fechar seleção de horário"
            onClick={fechar}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/10 text-xl hover:bg-white/5"
          >
            ×
          </button>
        </span>

        <span id={ajudaId} className="mt-2 block text-xs leading-5 text-[#EDEDE3]/65">
          Horário local de Manaus · formato de 24 horas.
        </span>

        <span className="mt-5 block">
          <span className="mb-2 block text-xs text-[#EDEDE3]/75">
            Digite o horário completo
          </span>
          <input
            ref={entrada}
            type="text"
            inputMode="text"
            autoComplete="off"
            aria-label="Horário de saída em horas e minutos"
            aria-describedby={erro ? `${ajudaId} ${erroId}` : ajudaId}
            aria-invalid={Boolean(erro)}
            placeholder="05:30"
            maxLength={5}
            value={rascunho}
            disabled={disabled}
            onChange={(event) => {
              setRascunho(event.target.value);
              setErro('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                confirmar();
              }
            }}
            className="min-h-16 w-full rounded-2xl border border-[#E3A144]/40 bg-[#07110E] px-4 text-center text-3xl font-semibold tabular-nums tracking-wider outline-none focus:ring-2 focus:ring-[#F4C77E] disabled:opacity-50"
          />
        </span>

        <span className="mt-5 block text-xs font-semibold text-[#EDEDE3]/75">
          Hora
        </span>
        <span className="mt-2 grid grid-cols-6 gap-2">
          {horas.map((hora) => (
            <button
              key={hora}
              type="button"
              disabled={disabled}
              aria-label={`${hora} horas`}
              aria-pressed={horaSelecionada === hora}
              onClick={() => escolherHora(hora)}
              className={`${opcao} ${horaSelecionada === hora ? selecionado : neutro}`}
            >
              {hora}
            </button>
          ))}
        </span>

        <span className="mt-5 block text-xs font-semibold text-[#EDEDE3]/75">
          Atalhos de minutos
        </span>
        <span className="mt-2 grid grid-cols-4 gap-2">
          {['00', '15', '30', '45'].map((minuto) => (
            <button
              key={minuto}
              type="button"
              disabled={disabled}
              aria-label={`${minuto} minutos`}
              aria-pressed={minutoSelecionado === minuto}
              onClick={() => escolherMinuto(minuto)}
              className={`${opcao} ${minutoSelecionado === minuto ? selecionado : neutro}`}
            >
              :{minuto}
            </button>
          ))}
        </span>

        <span className="mt-2 block text-xs leading-5 text-[#EDEDE3]/60">
          Para outros minutos, digite o horário no campo acima.
        </span>

        {erro && (
          <span
            id={erroId}
            role="alert"
            className="mt-3 block text-sm text-red-300"
          >
            {erro}
          </span>
        )}

        <span className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onChange('');
              fechar();
            }}
            className="min-h-12 rounded-xl border border-white/15 text-sm font-semibold disabled:opacity-50"
          >
            Limpar horário
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={confirmar}
            className="min-h-12 rounded-xl bg-[#E3A144] px-3 text-sm font-semibold text-[#07110E] hover:bg-[#F4C77E] disabled:opacity-50"
          >
            Confirmar
          </button>
        </span>
      </dialog>
    </span>
  );
}
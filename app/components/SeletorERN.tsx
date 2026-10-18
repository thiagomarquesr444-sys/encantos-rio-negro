'use client';

import { useId, useRef, useState } from 'react';

type Opcao = {
  value: string;
  label: string;
};

type Props = {
  label: string;
  value: string;
  options: Opcao[];
  disabled?: boolean;
  onChange: (valor: string) => void;
};

export default function SeletorERN({
  label,
  value,
  options,
  disabled = false,
  onChange,
}: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const buscaRef = useRef<HTMLInputElement>(null);
  const tituloId = useId();
  const [busca, setBusca] = useState('');

  const normalizar = (texto: string) =>
    texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const filtradas = options.filter((opcao) =>
    normalizar(opcao.label).includes(normalizar(busca.trim())),
  );

  return (
    <div className="min-w-0">
      <span className="mb-2 block text-xs text-[var(--ern-secundario)]">
        {label}
      </span>
      <button
        ref={botao}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-label={`${label}: ${options.find((opcao) => opcao.value === value)?.label ?? 'Selecionar'}`}
        onClick={() => {
          setBusca('');
          dialogo.current?.showModal();
          buscaRef.current?.focus();
        }}
        className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ern-destaque)] disabled:opacity-50"
      >
        <span className="min-w-0 break-words">
          {options.find((opcao) => opcao.value === value)?.label ?? 'Selecionar'}
        </span>
        <span aria-hidden="true" className="text-[var(--ern-destaque)]">⌄</span>
      </button>

      <dialog
        ref={dialogo}
        aria-labelledby={tituloId}
        onClose={() => botao.current?.focus()}
        className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border border-[var(--ern-destaque)] bg-[var(--ern-painel)] p-5 text-[var(--ern-texto)] shadow-2xl backdrop:bg-black/70 sm:inset-0 sm:m-auto sm:w-[440px] sm:max-w-[calc(100vw-2rem)] sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 id={tituloId} className="text-lg font-semibold">{label}</h3>
          <button
            type="button"
            aria-label="Fechar seleção"
            onClick={() => dialogo.current?.close()}
            className="min-h-11 min-w-11 rounded-xl border border-[var(--ern-borda)]"
          >
            ×
          </button>
        </div>

        <input
          ref={buscaRef}
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          aria-label={`Buscar opções de ${label.toLowerCase()}`}
          placeholder="Buscar opção..."
          className="mt-4 min-h-12 w-full rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-3 text-base outline-none focus:ring-2 focus:ring-[var(--ern-destaque)]"
        />

        <div className="mt-3 grid gap-2">
          {filtradas.map((opcao) => (
            <button
              key={opcao.value}
              type="button"
              disabled={disabled}
              aria-pressed={opcao.value === value}
              onClick={() => {
                onChange(opcao.value);
                dialogo.current?.close();
              }}
              className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ern-destaque)] disabled:opacity-50 ${
                opcao.value === value
                  ? 'border-[var(--ern-destaque)] bg-[var(--ern-suave)] text-[var(--ern-destaque)]'
                  : 'border-[var(--ern-borda)] bg-[var(--ern-suave)] hover:bg-[var(--ern-suave)]'
              }`}
            >
              <span>{opcao.label}</span>
              {opcao.value === value && <span aria-hidden="true">✓</span>}
            </button>
          ))}
          {!filtradas.length && (
            <p role="status" className="py-4 text-sm text-[var(--ern-secundario)]">
              Nenhuma opção encontrada.
            </p>
          )}
        </div>
      </dialog>
    </div>
  );
}
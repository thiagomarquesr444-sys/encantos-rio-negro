'use client';

import { useEffect, useRef, useState } from 'react';
import type { Idioma } from '@/lib/i18n/types';
import BandeiraIdiomaERN from '@/app/components/BandeiraIdiomaERN';

// ERN_SELETOR_IDIOMA_V1: seletor de idioma com bandeira, no padrão do menu.
// Teclado: Enter/Espaço abre, setas navegam, Esc fecha.

const NOMES: Record<Idioma, string> = { PT: 'Português', EN: 'English', ES: 'Español' };
const IDIOMAS: Idioma[] = ['PT', 'EN', 'ES'];

const FOCO =
  'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F4C77E]';

export default function SeletorIdiomaERN({
  idioma,
  aoMudar,
  rotulo,
}: {
  idioma: Idioma;
  aoMudar: (idioma: Idioma) => void;
  rotulo: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [foco, setFoco] = useState(IDIOMAS.indexOf(idioma));
  const raiz = useRef<HTMLDivElement>(null);
  const opcoes = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!aberto) return;
    opcoes.current[foco]?.focus();
  }, [aberto, foco]);

  useEffect(() => {
    if (!aberto) return;
    function fora(evento: PointerEvent) {
      if (!raiz.current?.contains(evento.target as Node)) setAberto(false);
    }
    document.addEventListener('pointerdown', fora);
    return () => document.removeEventListener('pointerdown', fora);
  }, [aberto]);

  function escolher(item: Idioma) {
    aoMudar(item);
    setAberto(false);
  }

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-label={`${rotulo}: ${NOMES[idioma]}`}
        onClick={() => {
          setFoco(IDIOMAS.indexOf(idioma));
          setAberto((valor) => !valor);
        }}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] pl-3 pr-3.5 text-sm font-semibold text-[#EDEDE3] backdrop-blur-md transition hover:border-[#F4C77E]/60 ${FOCO}`}
      >
        <BandeiraIdiomaERN idioma={idioma} />
        {idioma}
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={`transition-transform ${aberto ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {aberto && (
        <ul
          role="listbox"
          aria-label={rotulo}
          onKeyDown={(evento) => {
            if (evento.key === 'Escape') { setAberto(false); return; }
            if (evento.key === 'ArrowDown') { evento.preventDefault(); setFoco((i) => (i + 1) % IDIOMAS.length); }
            if (evento.key === 'ArrowUp') { evento.preventDefault(); setFoco((i) => (i + IDIOMAS.length - 1) % IDIOMAS.length); }
          }}
          className="absolute right-0 top-[calc(100%+8px)] z-[120] w-48 overflow-hidden rounded-2xl border border-white/12 bg-[#0A1713]/95 p-1.5 shadow-[0_20px_50px_rgb(0_0_0/40%)] backdrop-blur-xl"
        >
          {IDIOMAS.map((item, indice) => {
            const ativo = item === idioma;
            return (
              <li key={item} role="presentation">
                <button
                  ref={(no) => { opcoes.current[indice] = no; }}
                  type="button"
                  role="option"
                  aria-selected={ativo}
                  onClick={() => escolher(item)}
                  className={`flex w-full min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm transition ${FOCO} ${
                    ativo ? 'bg-[#E3A144]/15 text-[#F4C77E]' : 'text-[#EDEDE3] hover:bg-white/[0.07]'
                  }`}
                >
                  <BandeiraIdiomaERN idioma={item} tamanho={22} />
                  <span className="flex-1 font-medium">{NOMES[item]}</span>
                  <span className="text-xs font-semibold opacity-70">{item}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import type { ReactNode } from 'react';
import Link from 'next/link';

import PublicHeader from '@/app/components/PublicHeader';
import RodapePublicoEDA from '@/app/components/RodapePublicoEDA';
import MenuInstitucionalERN from '@/app/components/MenuInstitucionalERN';
import { EMPRESA_EDA } from '@/lib/empresaEDA';

// ERN_INSTITUCIONAL_PREMIUM_V1
// Modelo das páginas de Atendimento, Privacidade, Termos e Reembolso no
// padrão Encantos da Amazônia: cabeçalho limpo (sem banner), menu lateral
// entre as páginas, cartões modernos e rodapé verde-noite.

type Props = {
  titulo: string;
  descricao: string;
  children: ReactNode;
};

const FOCO =
  'focus-visible:outline-2 focus-visible:outline-offset-4 ' +
  'focus-visible:outline-[#E3A144]';

export const EMAIL_ATENDIMENTO_ERN = EMPRESA_EDA.email;

export function SecaoInstitucionalERN({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section className="ern-revela-rolagem relative min-w-0 overflow-hidden rounded-[22px] border border-[#e3dfd6] bg-white p-6 shadow-[0_1px_2px_rgb(15_28_23/5%),0_12px_32px_rgb(15_28_23/5%)] sm:p-8">
      <span aria-hidden="true" className="absolute left-0 top-7 h-8 w-1 rounded-r-full bg-gradient-to-b from-[#F7D595] to-[#E3A144]" />
      <h2 className="text-xl font-semibold leading-snug tracking-[-0.02em] text-[#0f1c17] sm:text-2xl">
        {titulo}
      </h2>
      <div className="mt-4 space-y-4 break-words text-base leading-7 text-[#4b5a53]">
        {children}
      </div>
    </section>
  );
}

export function LinkInstitucionalERN({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={`inline-flex min-h-12 max-w-full items-center gap-2 rounded-full border border-[#E3A144]/50 bg-[#fffaf0] px-4 py-2 font-semibold text-[#6e3a0c] transition hover:border-[#E3A144] hover:bg-[#F7D595] ${FOCO}`}
    >
      <span className="break-all">{children}</span>
      <span aria-hidden="true">→</span>
    </a>
  );
}

export default function PaginaInstitucionalERN({
  titulo,
  descricao,
  children,
}: Props) {
  return (
    <div className="ern-publico min-h-dvh bg-[#f3f1ec] text-[#0f1c17]">
      <PublicHeader />

      <header className="mx-auto max-w-[1180px] px-5 pb-2 pt-32 sm:px-8 sm:pt-36">
        <nav aria-label="Localização na página" className="flex flex-wrap items-center gap-2 text-sm text-[#4b5a53]">
          <Link href="/" className={`inline-flex min-h-10 items-center rounded-full font-semibold text-[#8a4b12] hover:underline ${FOCO}`}>
            Início
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{titulo}</span>
        </nav>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-[#8a4b12]">
          Central de atendimento
        </p>
        <h1 className="mt-3 max-w-[820px] text-[clamp(2rem,4vw,3rem)] leading-[1.08] tracking-[-0.035em] text-[#0f1c17]">
          {titulo}
        </h1>
        <p className="mt-4 max-w-[680px] text-base leading-7 text-[#4b5a53] md:text-lg md:leading-8">
          {descricao}
        </p>
      </header>

      <main
        id="conteudo-institucional-ern"
        lang="pt-BR"
        className="mx-auto grid max-w-[1180px] gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12 lg:py-12"
      >
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <MenuInstitucionalERN />
          <a
            href={`mailto:${EMAIL_ATENDIMENTO_ERN}`}
            className={`ern-publico-hero mt-4 flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#F7D595] to-[#E3A144] px-5 text-sm font-bold text-[#07110E] shadow-[0_10px_26px_rgb(227_161_68/30%),inset_0_1px_0_rgb(255_255_255/55%)] transition hover:brightness-105 ${FOCO}`}
          >
            Escrever para a equipe <span aria-hidden="true">→</span>
          </a>
          <div className="mt-4 rounded-[18px] border border-[#e3dfd6] bg-white p-4 text-sm leading-6 text-[#4b5a53]">
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-[#e3a144] to-[#b5762a] font-[family-name:var(--font-fraunces)] text-sm font-extrabold text-[#07110e]">E</span>
              <strong className="text-[#0f1c17]">{EMPRESA_EDA.nomeFantasia}</strong>
            </span>
            <span className="mt-1 block">CNPJ {EMPRESA_EDA.cnpj}</span>
          </div>
        </aside>

        <div className="min-w-0 space-y-6">{children}</div>
      </main>

      <RodapePublicoEDA />
    </div>
  );
}

import type { ReactNode } from 'react';
import Link from 'next/link';

import PublicHeader from '@/app/components/PublicHeader';

type Props = {
  titulo: string;
  descricao: string;
  children: ReactNode;
};

const FOCO =
  'focus-visible:outline-2 focus-visible:outline-offset-4 ' +
  'focus-visible:outline-[#805600]';

export const EMAIL_ATENDIMENTO_ERN =
  'contato.encantosrionegro@gmail.com';

export function SecaoInstitucionalERN({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section
      className="min-w-0 rounded-2xl border p-5 sm:p-7"
      style={{
        backgroundColor: '#FFFCF0',
        borderColor: '#CDBA7A',
      }}
    >
      <h2
        className="text-xl font-semibold leading-snug"
        style={{ color: '#30260D' }}
      >
        {titulo}
      </h2>

      <div
        className="mt-4 space-y-4 break-words text-base leading-7"
        style={{ color: '#695727' }}
      >
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
      className={`inline-flex min-h-12 max-w-full items-center rounded-lg px-2 py-2 font-semibold underline underline-offset-4 ${FOCO}`}
      style={{ color: '#805600' }}
    >
      <span className="break-all">{children}</span>
    </a>
  );
}

export default function PaginaInstitucionalERN({
  titulo,
  descricao,
  children,
}: Props) {
  return (
    <div
      className="ern-publico min-h-dvh"
      style={{
        backgroundColor: '#FFF7DB',
        color: '#30260D',
      }}
    >
      <PublicHeader />

      <main
        id="conteudo-institucional-ern"
        lang="pt-BR"
        className="mx-auto max-w-4xl px-5 pb-12 pt-28 sm:px-8 sm:pt-32"
      >
        <nav
          aria-label="Localização na página"
          className="flex flex-wrap items-center gap-2 text-sm"
        >
          <Link
            href="/"
            className={`inline-flex min-h-12 items-center rounded-lg px-2 font-semibold underline underline-offset-4 ${FOCO}`}
            style={{ color: '#805600' }}
          >
            Início
          </Link>

          <span aria-hidden="true">/</span>
          <span aria-current="page">{titulo}</span>
        </nav>

        <header className="mb-8 mt-5">
          <p
            className="text-sm font-semibold"
            style={{ color: '#805600' }}
          >
            Encantos Rio Negro
          </p>

          <h1
            className="mt-3 text-3xl leading-tight sm:text-5xl"
            style={{
              fontFamily: 'var(--font-fraunces), serif',
              color: '#30260D',
            }}
          >
            {titulo}
          </h1>

          <p
            className="mt-5 text-base leading-7"
            style={{ color: '#695727' }}
          >
            {descricao}
          </p>
        </header>

        <div className="space-y-5">{children}</div>

        <footer
          className="mt-10 border-t pt-5"
          style={{ borderColor: '#CDBA7A' }}
        >
          <nav
            aria-label="Informações e atendimento"
            className="flex flex-wrap gap-x-5 gap-y-2"
          >
            {[
              { href: '/', nome: 'Voltar ao portal' },
              { href: '/contato', nome: 'Atendimento' },
              {
                href: '/privacidade',
                nome: 'Política de Privacidade',
              },
              {
                href: '/termos',
                nome: 'Termos de Serviço',
              },
              {
                href: '/reembolso',
                nome: 'Cancelamento e reembolso',
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex min-h-12 items-center rounded-lg px-2 text-sm font-semibold underline underline-offset-4 ${FOCO}`}
                style={{ color: '#805600' }}
              >
                {item.nome}
              </Link>
            ))}
          </nav>

          <p
            className="mt-4 text-sm leading-6"
            style={{ color: '#695727' }}
          >
            Encantos Rio Negro — Barcelos, Amazonas.
          </p>
        </footer>
      </main>
    </div>
  );
}
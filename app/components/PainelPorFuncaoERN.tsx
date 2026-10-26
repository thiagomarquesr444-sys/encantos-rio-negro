'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import MapaTerritorioERN from '@/app/components/MapaTerritorioERN';
import {
  useModulosEquipeERN,
  permiteLinkEquipeERN,
} from '@/app/components/ModulosEquipeERN';

const ATALHOS = [
  {
    titulo: 'Clientes',
    descricao: 'Cadastro e relacionamento com viajantes.',
    href: '/clientes',
  },
  {
    titulo: 'Reservas',
    descricao: 'Organização das reservas da operadora.',
    href: '/reservas',
  },
  {
    titulo: 'Passeios',
    descricao: 'Roteiros e experiências da empresa.',
    href: '/passeios',
  },
  {
    titulo: 'Vouchers',
    descricao: 'Documentos vinculados às reservas.',
    href: '/vouchers',
  },
  {
    titulo: 'Demandas',
    descricao: 'Solicitações de apoio à operação.',
    href: '/demandas',
  },
  {
    titulo: 'Embarcações',
    descricao: 'Estrutura e capacidade operacional.',
    href: '/embarcacoes',
  },
  {
    titulo: 'Hospedagens',
    descricao: 'Unidades cadastradas pela operadora.',
    href: '/hospedagens',
  },
  {
    titulo: 'Guias',
    descricao: 'Profissionais cadastrados na operação.',
    href: '/guias',
  },
  {
    titulo: 'Parceiros',
    descricao: 'Rede de apoio da empresa.',
    href: '/parceiros',
  },
  {
    titulo: 'Financeiro',
    descricao: 'Recebimentos, pagamentos e lançamentos.',
    href: '/financeiro',
  },
  {
    titulo: 'Relatórios',
    descricao: 'Consulte os relatórios disponíveis.',
    href: '/relatorios',
  },
];

const FOCO =
  'focus-visible:outline-2 focus-visible:outline-offset-4 ' +
  'focus-visible:outline-[#F4C77E]';

export default function PainelPorFuncaoERN({
  children,
}: {
  children: ReactNode;
}) {
  const { modulos, carregando, erro } = useModulosEquipeERN();

  if (carregando) {
    return (
      <main
        className="flex min-h-[60vh] items-center justify-center px-5"
        style={{
          background: 'var(--ern-fundo, #07110E)',
          color: 'var(--ern-texto, #EDEDE3)',
        }}
      >
        <p role="status" className="text-sm">
          Preparando seu Painel…
        </p>
      </main>
    );
  }

  if (erro || !modulos.has('painel')) {
    return (
      <main
        className="flex min-h-[60vh] items-center justify-center px-5"
        style={{
          background: 'var(--ern-fundo, #07110E)',
          color: 'var(--ern-texto, #EDEDE3)',
        }}
      >
        <div role="alert" className="max-w-md text-center">
          <p className="text-sm leading-7">
            {erro
              ? 'Não foi possível verificar seus acessos.'
              : 'Seu perfil não possui acesso ao Painel da operadora.'}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className={`mt-5 min-h-11 rounded-xl border border-current px-5 text-sm font-semibold ${FOCO}`}
          >
            Tentar novamente
          </button>

          <Link
            href="/acesso?acesso=operadora"
            className={`mt-3 flex min-h-11 items-center justify-center text-sm underline ${FOCO}`}
          >
            Consultar meu acesso
          </Link>
        </div>
      </main>
    );
  }

  // O componente administrativo só é montado nesta condição.
  // Nas demais funções, seus efeitos e consultas não são executados.
  if (
    modulos.has('equipe') &&
    modulos.has('configuracoes') &&
    modulos.has('planos')
  ) {
    return <>{children}</>;
  }

  const atalhos = ATALHOS.filter((item) =>
    permiteLinkEquipeERN(item.href, modulos),
  );

  return (
    <main
      className="min-h-screen min-w-0 px-4 py-6 sm:px-6 sm:py-8"
      style={{
        background: 'var(--ern-fundo, #07110E)',
        color: 'var(--ern-texto, #EDEDE3)',
      }}
    >
      <div className="mx-auto w-full min-w-0 max-w-[1360px]">
        <header
          className="rounded-2xl border p-5 sm:p-8"
          style={{
            background: 'var(--ern-painel, #0A1713)',
            borderColor: 'var(--ern-borda, #ffffff20)',
          }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: 'var(--ern-destaque, #F4C77E)' }}
          >
            Encantos Rio Negro · equipe
          </p>

          <h1
            className="mt-3 text-3xl leading-tight sm:text-4xl"
            style={{ fontFamily: 'var(--font-fraunces), serif' }}
          >
            Seu trabalho conectado ao Rio Negro.
          </h1>

          <p
            className="mt-4 max-w-2xl text-sm leading-7"
            style={{ color: 'var(--ern-secundario, #B4C8BB)' }}
          >
            {atalhos.length > 0
              ? 'Acesse suas ferramentas de trabalho e explore as referências do território no mapa ERN.'
              : 'Explore o território, consulte localidades e use as referências do mapa ERN para apoiar seu trabalho.'}
          </p>

          {modulos.has('mapa') && (
            <a
              href="/dashboard/mapa"
              className={`mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border px-5 text-sm font-semibold ${FOCO}`}
              style={{
                color: 'var(--ern-destaque, #F4C77E)',
                borderColor: 'var(--ern-borda, #ffffff30)',
              }}
            >
              Abrir mapa ERN ↓
            </a>
          )}
        </header>

        {atalhos.length > 0 && (
          <section className="mt-6" aria-labelledby="ferramentas-equipe-ern">
            <h2 id="ferramentas-equipe-ern" className="text-xl font-semibold">
              Suas ferramentas
            </h2>

            <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {atalhos.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`min-w-0 rounded-2xl border p-5 transition-colors hover:border-[#E3A144] ${FOCO}`}
                  style={{
                    background: 'var(--ern-painel, #0A1713)',
                    borderColor: 'var(--ern-borda, #ffffff20)',
                  }}
                >
                  <h3 className="text-base font-semibold">
                    {item.titulo}
                    <span aria-hidden="true" className="ml-2">→</span>
                  </h3>

                  <p
                    className="mt-2 text-xs leading-6"
                    style={{ color: 'var(--ern-secundario, #B4C8BB)' }}
                  >
                    {item.descricao}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {modulos.has('mapa') && (
          <section id="mapa-ern" className="mt-7 min-w-0 scroll-mt-28">
            <MapaTerritorioERN mostrarDemandas={false} />
          </section>
        )}
      </div>
    </main>
  );
}
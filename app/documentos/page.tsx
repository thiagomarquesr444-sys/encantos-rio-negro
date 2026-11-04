'use client';
import '@/app/components/padrao-paginas-eda.css';
import '@/app/components/padrao-formularios-eda.css';
import './documentos-eda.css';

import Link from 'next/link';
import { useModulosEquipeERN } from
  '@/app/components/ModulosEquipeERN';

const documentos = [
  {
    titulo: 'Vouchers turísticos',
    descricao:
      'Consulte os vouchers emitidos e gere documentos Premium com os dados da operadora.',
    href: '/vouchers',
    modulo: 'vouchers',
    icone: '01',
  },
  {
    titulo: 'Relatórios gerenciais',
    descricao:
      'Acesse indicadores de reservas, financeiro e análises exportáveis em PDF e CSV.',
    href: '/relatorios',
    modulo: 'relatorios',
    icone: '02',
  },
  {
    titulo: 'Demonstrativos financeiros',
    descricao:
      'Exporte lançamentos e movimentações com filtros, em PDF Premium ou CSV.',
    href: '/financeiro/exportar',
    modulo: 'financeiro',
    icone: '03',
  },
  {
    titulo: 'Painel Fiscal',
    descricao:
      'Consulte solicitações fiscais simuladas da operadora. Não realiza emissão de NFS-e.',
    href: '/fiscal',
    modulo: 'financeiro',
    icone: '04',
  },
] as const;

export default function CentralDocumentosERN() {
  const { modulos, carregando, erro } = useModulosEquipeERN();

  const permitidos = documentos.filter(
    item =>
      item.href === '/fiscal'
        ? modulos.has('__ern_fiscal_perfil_autorizado') &&
          (modulos.has('financeiro') || modulos.has('relatorios'))
        : modulos.has(item.modulo)
  );

  return (
    <main className="eda-pg eda-pg-auto eda-pg-legado min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="rounded-3xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-6 sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ern-destaque)]">
            Gestão da operadora
          </p>

          <h1
            className="mt-4 text-3xl font-semibold sm:text-4xl"
            style={{ fontFamily: 'var(--font-fraunces), serif' }}
          >
            Central de Documentos
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--ern-secundario)]">
            Uma entrada única para documentos turísticos e
            gerenciais da Encantos Gestão. Acesse apenas os
            recursos autorizados para sua conta.
          </p>
        </header>

        {carregando ? (
          <p role="status" className="text-sm">
            Verificando permissões dos documentos…
          </p>
        ) : erro ? (
          <div
            role="alert"
            className="rounded-2xl border border-[var(--ern-borda)] p-5"
          >
            <p>Não foi possível verificar seus acessos.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 min-h-11 rounded-xl border border-[var(--ern-borda)] px-5"
            >
              Tentar novamente
            </button>
          </div>
        ) : permitidos.length === 0 ? (
          <p role="alert" className="rounded-2xl border border-[var(--ern-borda)] p-5">
            Sua conta não possui módulos documentais habilitados.
          </p>
        ) : (
          <section
            aria-label="Tipos de documentos disponíveis"
            className="eda-doc-grade"
          >
            {permitidos.map(item => (
              <article
                key={item.href}
                className="eda-doc-card"
              >
                <span className="eda-pg-eb">
                  DOCUMENTOS / {item.icone}
                </span>

                <h2 className="mt-5 text-xl font-semibold">
                  {item.titulo}
                </h2>

                <p className="mt-3 flex-1 text-sm leading-7 text-[var(--ern-secundario)]">
                  {item.descricao}
                </p>

                <Link
                  href={item.href}
                  className="eda-pg-bt eda-doc-acao"
                >
                  Acessar documentos
                </Link>
              </article>
            ))}
          </section>
        )}

        <section className="rounded-2xl border border-[var(--ern-borda)] p-5">
          <h2 className="font-semibold">Sobre os documentos</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--ern-secundario)]">
            Os PDFs são gerados sob demanda nos módulos de origem.
            Esta Central não arquiva cópias nem modifica registros.
            Vouchers, relatórios gerenciais e demonstrativos não
            substituem notas fiscais ou documentos fiscais autorizados.
          </p>
        </section>
      </div>
    </main>
  );
}
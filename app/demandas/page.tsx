'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';

import { supabase } from '@/lib/supabase';

import {
  CATEGORIAS_DEMANDA,
  STATUS_DEMANDA,
  ehCategoriaDemanda,
  ehStatusDemanda,
  listarDemandas,
  mensagemErroDemandas,
  obterContextoDemandas,
  type CategoriaDemanda,
  type ContextoDemandas,
  type PaginaDemandas,
  type StatusDemanda,
} from '@/lib/demandas';

type Consulta = {
  busca: string;
  categoria: CategoriaDemanda | '';
  status: StatusDemanda | '';
  pagina: number;
};

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | {
      tipo: 'pronto';
      contexto: ContextoDemandas;
      resultado: PaginaDemandas;
    };

const CONSULTA_INICIAL: Consulta = {
  busca: '',
  categoria: '',
  status: '',
  pagina: 0,
};

const ESTILOS_STATUS: Record<StatusDemanda, string> = {
  rascunho: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
  aberta: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  encerrada: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
  cancelada: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
};

const CAMPO =
  'min-h-12 w-full rounded-xl border border-white/10 bg-[#07110E] ' +
  'px-4 text-sm text-[#F0F0E8] outline-none transition-colors ' +
  'placeholder:text-white/30 focus:border-[#E3A144] ' +
  'focus:ring-2 focus:ring-[#E3A144]/20 motion-reduce:transition-none';

const BOTAO =
  'inline-flex min-h-12 items-center justify-center rounded-xl ' +
  'border border-white/15 px-5 text-sm font-semibold text-[#EDEDE3] ' +
  'transition-colors hover:bg-white/5 focus-visible:outline ' +
  'focus-visible:outline-2 focus-visible:outline-offset-4 ' +
  'focus-visible:outline-[#E3A144] disabled:cursor-not-allowed ' +
  'disabled:opacity-40 motion-reduce:transition-none';

const formatadorQuantidade = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
});

function formatarData(data: string | null): string {
  if (!data) return 'Não informado';

  const partes = data.split('-');

  if (partes.length !== 3) return 'Data indisponível';

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function SkeletonDemandas() {
  return (
    <div role="status" aria-label="Carregando demandas">
      <span className="sr-only">Carregando demandas...</span>

      <div
        aria-hidden="true"
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {Array.from({ length: 6 }, (_, indice) => (
          <div
            key={indice}
            className="rounded-2xl border border-white/10 bg-[#0A1713] p-6 motion-safe:animate-pulse"
          >
            <div className="h-5 w-24 rounded bg-white/10" />
            <div className="mt-6 h-6 w-3/4 rounded bg-white/10" />
            <div className="mt-3 h-4 w-1/2 rounded bg-white/5" />
            <div className="mt-6 h-4 w-full rounded bg-white/5" />
            <div className="mt-3 h-4 w-4/5 rounded bg-white/5" />
            <div className="mt-6 h-12 rounded-xl bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DemandasPage() {
  const [rascunhoBusca, setRascunhoBusca] = useState('');
  const [consulta, setConsulta] = useState<Consulta>(CONSULTA_INICIAL);
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  const [revisao, setRevisao] = useState(0);

  const requisicaoAtual = useRef<AbortController | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (
        evento === 'SIGNED_OUT' ||
        evento === 'SIGNED_IN' ||
        evento === 'USER_UPDATED'
      ) {
        requisicaoAtual.current?.abort();
        setEstado({ tipo: 'carregando' });
        setRevisao((valor) => valor + 1);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    requisicaoAtual.current = controller;

    let ativo = true;

    setEstado({ tipo: 'carregando' });

    const timeout = window.setTimeout(() => {
      if (!ativo || controller.signal.aborted) return;

      controller.abort();

      setEstado({
        tipo: 'erro',
        mensagem:
          'A consulta demorou mais que o esperado. Verifique sua conexão e tente novamente.',
      });
    }, 20000);

    async function carregar(): Promise<void> {
      try {
        const contexto = await obterContextoDemandas(controller.signal);

        if (!ativo || controller.signal.aborted) return;

        const resultado = await listarDemandas(
          contexto,
          consulta,
          controller.signal,
        );

        if (!ativo || controller.signal.aborted) return;

        // Corrige a página caso a quantidade de registros tenha diminuído.
        const ultimaPagina = Math.max(resultado.total_paginas - 1, 0);

        if (consulta.pagina > ultimaPagina) {
          setConsulta((anterior) => ({
            ...anterior,
            pagina: ultimaPagina,
          }));
          return;
        }

        setEstado({
          tipo: 'pronto',
          contexto,
          resultado,
        });
      } catch (erro: unknown) {
        if (!ativo || controller.signal.aborted) return;

        setEstado({
          tipo: 'erro',
          mensagem: mensagemErroDemandas(erro),
        });
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void carregar();

    return () => {
      ativo = false;
      controller.abort();
      window.clearTimeout(timeout);

      if (requisicaoAtual.current === controller) {
        requisicaoAtual.current = null;
      }
    };
  }, [consulta, revisao]);

  function alterarConsulta(proxima: Consulta): void {
    requisicaoAtual.current?.abort();
    setEstado({ tipo: 'carregando' });
    setConsulta(proxima);
  }

  function atualizar(): void {
    requisicaoAtual.current?.abort();
    setEstado({ tipo: 'carregando' });
    setRevisao((valor) => valor + 1);
  }

  function buscar(evento: FormEvent<HTMLFormElement>): void {
    evento.preventDefault();

    alterarConsulta({
      ...consulta,
      busca: rascunhoBusca.trim(),
      pagina: 0,
    });
  }

  function limparFiltros(): void {
    setRascunhoBusca('');
    alterarConsulta({ ...CONSULTA_INICIAL });
  }

  const carregando = estado.tipo === 'carregando';
  const resultado = estado.tipo === 'pronto' ? estado.resultado : null;

  const temFiltros =
    consulta.busca !== '' ||
    consulta.categoria !== '' ||
    consulta.status !== '';

  return (
    <main className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      <header className="border-b border-white/10 bg-[#091510]">
        <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
          <Link
            href="/dashboard"
            className="text-sm text-[#B4C8BB] transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E3A144]"
          >
            ← Dashboard
          </Link>

          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#E3A144]">
                Oferta e demanda
              </p>

              <h1
                className="mt-2 text-4xl tracking-tight md:text-5xl"
                style={{
                  fontFamily: 'var(--font-fraunces), serif',
                }}
              >
                Demandas
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#B4C8BB]">
                Acompanhe os serviços que sua empresa precisa contratar.
                As demandas desta área são privadas da sua empresa.
              </p>
            </div>

            <button
              type="button"
              onClick={atualizar}
              disabled={carregando}
              className={BOTAO}
            >
              {carregando ? 'Carregando...' : 'Atualizar'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-5 py-6 md:px-8 md:py-8">
        <form
          onSubmit={buscar}
          aria-label="Filtrar demandas"
          className="rounded-2xl border border-white/10 bg-[#0A1713] p-5"
        >
          <div className="grid items-end gap-4 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_auto]">
            <div>
              <label
                htmlFor="busca-demanda"
                className="mb-2 block text-sm text-[#B4C8BB]"
              >
                Buscar por título
              </label>

              <input
                id="busca-demanda"
                type="search"
                maxLength={160}
                value={rascunhoBusca}
                onChange={(evento) => setRascunhoBusca(evento.target.value)}
                placeholder="Ex.: hospedagem para grupo"
                className={CAMPO}
              />
            </div>

            <div>
              <label
                htmlFor="categoria-demanda"
                className="mb-2 block text-sm text-[#B4C8BB]"
              >
                Categoria
              </label>

              <select
                id="categoria-demanda"
                value={consulta.categoria}
                onChange={(evento) => {
                  const valor = evento.target.value;

                  if (valor === '' || ehCategoriaDemanda(valor)) {
                    alterarConsulta({
                      ...consulta,
                      categoria: valor,
                      pagina: 0,
                    });
                  }
                }}
                className={CAMPO}
              >
                <option value="">Todas as categorias</option>

                {Object.entries(CATEGORIAS_DEMANDA).map(([valor, nome]) => (
                  <option key={valor} value={valor}>
                    {nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="status-demanda"
                className="mb-2 block text-sm text-[#B4C8BB]"
              >
                Status
              </label>

              <select
                id="status-demanda"
                value={consulta.status}
                onChange={(evento) => {
                  const valor = evento.target.value;

                  if (valor === '' || ehStatusDemanda(valor)) {
                    alterarConsulta({
                      ...consulta,
                      status: valor,
                      pagina: 0,
                    });
                  }
                }}
                className={CAMPO}
              >
                <option value="">Todos os status</option>

                {Object.entries(STATUS_DEMANDA).map(([valor, nome]) => (
                  <option key={valor} value={valor}>
                    {nome}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className={`${BOTAO} border-[#E3A144]/40 bg-[#E3A144]/10 text-[#F4C77E] hover:bg-[#E3A144]/20`}
            >
              Buscar
            </button>
          </div>

          {temFiltros && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[#B4C8BB]">
                {consulta.busca
                  ? `Busca aplicada: “${consulta.busca}”`
                  : 'Filtros aplicados à consulta.'}
              </p>

              <button
                type="button"
                onClick={limparFiltros}
                className="rounded px-2 py-2 text-sm font-semibold text-[#F4C77E] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E3A144]"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </form>

        <section aria-label="Resultados da consulta" aria-busy={carregando}>
          {carregando && <SkeletonDemandas />}

          {estado.tipo === 'erro' && (
            <div
              role="alert"
              className="entrada rounded-2xl border border-rose-400/20 bg-[#0A1713] p-6 md:p-8"
            >
              <h2 className="text-xl font-semibold text-rose-200">
                Não foi possível carregar as demandas
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#B4C8BB]">
                {estado.mensagem}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={atualizar} className={BOTAO}>
                  Tentar novamente
                </button>

                <Link href="/login" className={BOTAO}>
                  Ir para o login
                </Link>
              </div>
            </div>
          )}

          {estado.tipo === 'pronto' && resultado && (
            <div className="entrada">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <p role="status" className="text-sm text-[#B4C8BB]">
                  <strong className="text-[#F0F0E8]">
                    {resultado.total}
                  </strong>{' '}
                  {resultado.total === 1
                    ? 'demanda encontrada'
                    : 'demandas encontradas'}
                </p>

                {!estado.contexto.pode_gerenciar && (
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#B4C8BB]">
                    Seu perfil permite apenas consulta
                  </span>
                )}
              </div>

              {resultado.registros.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-[#0A1713] px-6 py-14 text-center">
                  <h2
                    className="text-2xl text-[#F0F0E8]"
                    style={{
                      fontFamily: 'var(--font-fraunces), serif',
                    }}
                  >
                    {temFiltros
                      ? 'Nenhuma demanda corresponde aos filtros'
                      : 'Sua empresa ainda não tem demandas'}
                  </h2>

                  <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#B4C8BB]">
                    {temFiltros
                      ? 'Experimente outro título, categoria ou status.'
                      : 'As necessidades de contratação da sua empresa aparecerão aqui.'}
                  </p>

                  {temFiltros && (
                    <button
                      type="button"
                      onClick={limparFiltros}
                      className={`${BOTAO} mt-6`}
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              ) : (
                <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {resultado.registros.map((demanda) => (
                    <li key={demanda.id} className="min-w-0">
                      <article className="flex h-full flex-col rounded-2xl border border-white/10 bg-[#0A1713] p-6 transition-colors hover:border-[#E3A144]/30 motion-reduce:transition-none">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="text-xs font-semibold text-[#E3A144]">
                            {CATEGORIAS_DEMANDA[demanda.categoria]}
                          </span>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs ${ESTILOS_STATUS[demanda.status]}`}
                          >
                            {STATUS_DEMANDA[demanda.status]}
                          </span>
                        </div>

                        <h2 className="mt-5 break-words text-xl font-semibold text-[#F0F0E8]">
                          {demanda.titulo}
                        </h2>

                        <p className="mt-2 break-words text-sm text-[#B4C8BB]">
                          {demanda.localidade}
                        </p>

                        <p className="mt-5 line-clamp-3 break-words text-sm leading-6 text-[#B4C8BB]">
                          {demanda.descricao || 'Sem descrição adicional.'}
                        </p>

                        <dl className="mt-auto space-y-3 pt-6">
                          <div className="rounded-xl bg-white/[0.03] px-4 py-3">
                            <dt className="text-xs text-[#B4C8BB]">
                              Quantidade
                            </dt>
                            <dd className="mt-1 break-words text-sm font-semibold">
                              {formatadorQuantidade.format(demanda.quantidade)}{' '}
                              {demanda.unidade}
                            </dd>
                          </div>

                          <div className="rounded-xl bg-white/[0.03] px-4 py-3">
                            <dt className="text-xs text-[#B4C8BB]">
                              Período
                            </dt>
                            <dd className="mt-1 text-sm">
                              {demanda.data_inicio && demanda.data_fim
                                ? `${formatarData(demanda.data_inicio)} a ${formatarData(demanda.data_fim)}`
                                : 'Não informado'}
                            </dd>
                          </div>
                        </dl>
                      </article>
                    </li>
                  ))}
                </ul>
              )}

              {resultado.total > 0 && (
                <nav
                  aria-label="Paginação de demandas"
                  className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row"
                >
                  <p className="text-sm text-[#B4C8BB]">
                    Página {resultado.pagina + 1} de {resultado.total_paginas}
                  </p>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={resultado.pagina === 0}
                      onClick={() =>
                        alterarConsulta({
                          ...consulta,
                          pagina: Math.max(resultado.pagina - 1, 0),
                        })
                      }
                      className={BOTAO}
                    >
                      Anterior
                    </button>

                    <button
                      type="button"
                      disabled={
                        resultado.pagina + 1 >= resultado.total_paginas
                      }
                      onClick={() =>
                        alterarConsulta({
                          ...consulta,
                          pagina: resultado.pagina + 1,
                        })
                      }
                      className={BOTAO}
                    >
                      Próxima
                    </button>
                  </div>
                </nav>
              )}
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        @keyframes aparecer {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: no-preference) {
          .entrada {
            animation: aparecer 180ms ease-out both;
          }
        }
      `}</style>
    </main>
  );
}
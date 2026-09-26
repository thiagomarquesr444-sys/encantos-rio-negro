'use client';

import React, {
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';
import { BANNER_REGIONAL } from '@/lib/bannerImagens';

type Stats = {
  clientes: number;
  reservas: number;
  roteiros: number;
  embarcacoes: number;
};

export default function DashboardPage() {
  const router = useRouter();

  const [stats, setStats] =
    useState<Stats>({
      clientes: 0,
      reservas: 0,
      roteiros: 0,
      embarcacoes: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  /*
    ============================================================
    ESTATÍSTICAS REAIS
    ============================================================
  */

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);

      try {
        const [
          resClientes,
          resReservas,
          resPasseios,
          resEmbarcacoes,
        ] = await Promise.all([
          supabase
            .from('clientes')
            .select('id', {
              count: 'exact',
              head: true,
            }),

          supabase
            .from('reservas')
            .select('id', {
              count: 'exact',
              head: true,
            }),

          supabase
            .from('passeios')
            .select('id', {
              count: 'exact',
              head: true,
            }),

          supabase
            .from('embarcacoes')
            .select('id', {
              count: 'exact',
              head: true,
            }),
        ]);

        if (resClientes.error) {
          throw new Error(
            `Erro em clientes: ${resClientes.error.message}`
          );
        }

        if (resReservas.error) {
          throw new Error(
            `Erro em reservas: ${resReservas.error.message}`
          );
        }

        if (resPasseios.error) {
          throw new Error(
            `Erro em passeios: ${resPasseios.error.message}`
          );
        }

        if (resEmbarcacoes.error) {
          throw new Error(
            `Erro em embarcações: ${resEmbarcacoes.error.message}`
          );
        }

        setStats({
          clientes:
            resClientes.count || 0,
          reservas:
            resReservas.count || 0,
          roteiros:
            resPasseios.count || 0,
          embarcacoes:
            resEmbarcacoes.count || 0,
        });
      } catch (err) {
        console.error(
          'Erro ao carregar estatísticas:',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Ocorreu um erro inesperado ao carregar o dashboard.'
        );
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const indicadores = [
    {
      titulo: 'Clientes',
      valor: stats.clientes,
      href: '/clientes',
      detalhe:
        'viajantes cadastrados',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm13 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
          />
        </svg>
      ),
    },

    {
      titulo: 'Reservas',
      valor: stats.reservas,
      href: '/reservas',
      detalhe:
        'registros na operação',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },

    {
      titulo: 'Passeios',
      valor: stats.roteiros,
      href: '/passeios',
      detalhe:
        'experiências cadastradas',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 21a9 9 0 100-18 9 9 0 000 18zm0-14l3 5-3 5-3-5 3-5z"
          />
        </svg>
      ),
    },

    {
      titulo: 'Embarcações',
      valor: stats.embarcacoes,
      href: '/embarcacoes',
      detalhe:
        'unidades cadastradas',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 18l2-5h14l2 5M5 13l2-6h10l2 6M12 7V3m-6 17c1.5 1 3 1 4.5 0 1.5 1 3 1 4.5 0 1.5 1 3 1 4.5 0"
          />
        </svg>
      ),
    },
  ];

  const atalhos = [
    {
      titulo: 'Novo cliente',
      descricao:
        'Cadastrar um novo viajante.',
      href: '/clientes/novo',
    },
    {
      titulo: 'Nova reserva',
      descricao:
        'Registrar uma nova operação.',
      href: '/reservas/novo',
    },
    {
      titulo: 'Novo passeio',
      descricao:
        'Adicionar uma experiência.',
      href: '/passeios/novo',
    },
    {
      titulo: 'Financeiro',
      descricao:
        'Acompanhar movimentações.',
      href: '/financeiro',
    },
  ];

  return (
    <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      {/* =========================================================
          APRESENTAÇÃO
      ========================================================== */}

      <section className="relative overflow-hidden border-b border-white/[0.07] bg-[#091510]">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-35"
          style={{
            backgroundImage: `url('${BANNER_REGIONAL.modulos.dashboard}')`,
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#06100D] via-[#07110E]/94 to-[#07110E]/70" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#07110E] via-transparent to-transparent" />

        <div className="pointer-events-none absolute -right-24 -top-36 h-[420px] w-[420px] rounded-full border border-[#E3A144]/10" />

        <div className="relative mx-auto max-w-[1360px] px-5 py-12 md:px-8 md:py-16">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-[#E3A144]" />

                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#E3A144]">
                  ERN Gestão
                </span>
              </div>

              <h1
                className="mt-5 max-w-[760px] text-4xl font-medium leading-[1.02] tracking-[-0.035em] text-[#F0F0E8] md:text-5xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Sua operação,
                <br className="hidden sm:block" /> em
                um só lugar.
              </h1>

              <p className="mt-5 max-w-[670px] text-sm leading-7 text-[#EDEDE3]/48 md:text-base">
                Clientes, reservas, passeios,
                estrutura e financeiro conectados
                para organizar a operação turística
                no Rio Negro.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  router.push('/clientes/novo')
                }
                className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[#E3A144] px-6 text-sm font-bold text-[#07130F] transition hover:-translate-y-0.5 hover:bg-[#F0B35C]"
              >
                <span className="text-lg leading-none">
                  +
                </span>
                Novo cliente
              </button>

              <Link
                href="/reservas"
                className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.035] px-6 text-sm font-semibold text-[#EDEDE3]/75 backdrop-blur transition hover:bg-white/[0.07]"
              >
                Ver reservas
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          CONTEÚDO
      ========================================================== */}

      <main className="mx-auto max-w-[1360px] px-5 py-8 md:px-8 md:py-10">
        {/* ERRO */}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-5 py-4 text-sm text-red-200">
            <span className="font-semibold">
              Não foi possível carregar alguns
              dados.
            </span>

            <span className="ml-2 text-red-200/65">
              {error}
            </span>
          </div>
        )}

        {/* =====================================================
            CABEÇALHO DOS INDICADORES
        ====================================================== */}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
              Visão geral
            </p>

            <h2
              className="mt-2 text-2xl text-[#F0F0E8]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Operação agora
            </h2>
          </div>

          <p className="max-w-[420px] text-xs leading-5 text-[#EDEDE3]/30">
            Indicadores calculados diretamente a
            partir dos registros da operação.
          </p>
        </div>

        {/* =====================================================
            INDICADORES
        ====================================================== */}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {indicadores.map((item) => (
            <Link
              key={item.titulo}
              href={item.href}
              className="group rounded-[22px] border border-white/[0.075] bg-[#0A1713] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-[#E3A144]/20 hover:bg-[#0C1B16]"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E3A144]/15 bg-[#E3A144]/7 text-[#E3A144]">
                  {item.icon}
                </div>

                <span className="text-sm text-[#EDEDE3]/18 transition group-hover:translate-x-0.5 group-hover:text-[#E3A144]">
                  →
                </span>
              </div>

              <div className="mt-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/32">
                  {item.titulo}
                </p>

                <div className="mt-2 flex items-end gap-2">
                  <strong
                    className="text-4xl font-medium tracking-[-0.04em] text-[#F0F0E8]"
                    style={{
                      fontFamily:
                        'var(--font-fraunces), serif',
                    }}
                  >
                    {loading ? '—' : item.valor}
                  </strong>
                </div>

                <p className="mt-2 text-[11px] text-[#EDEDE3]/28">
                  {item.detalhe}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* =====================================================
            ÁREA INFERIOR
        ====================================================== */}

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          {/* ATALHOS */}

          <section className="rounded-[26px] border border-white/[0.075] bg-[#0A1713] p-5 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  Acesso rápido
                </p>

                <h2
                  className="mt-2 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Comece uma operação
                </h2>
              </div>

              <span className="hidden rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1 text-[9px] uppercase tracking-[0.15em] text-[#EDEDE3]/30 sm:block">
                ERN
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {atalhos.map((atalho) => (
                <Link
                  key={atalho.titulo}
                  href={atalho.href}
                  className="group flex min-h-[110px] items-start justify-between rounded-[18px] border border-white/[0.065] bg-white/[0.018] p-4 transition hover:border-white/[0.12] hover:bg-white/[0.035]"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#EDEDE3]/80">
                      {atalho.titulo}
                    </p>

                    <p className="mt-2 max-w-[200px] text-[11px] leading-5 text-[#EDEDE3]/30">
                      {atalho.descricao}
                    </p>
                  </div>

                  <span className="text-sm text-[#EDEDE3]/20 transition group-hover:translate-x-1 group-hover:text-[#E3A144]">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* ESTRUTURA */}

          <section className="overflow-hidden rounded-[26px] border border-white/[0.075] bg-[#0A1713]">
            <div className="border-b border-white/[0.065] px-5 py-5 md:px-6">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                Estrutura da operação
              </p>

              <h2
                className="mt-2 text-2xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Gestão conectada
              </h2>
            </div>

            <div>
              {[
                {
                  label: 'Hospedagens',
                  href: '/hospedagens',
                },
                {
                  label: 'Embarcações',
                  href: '/embarcacoes',
                },
                {
                  label: 'Guias',
                  href: '/guias',
                },
                {
                  label: 'Parceiros',
                  href: '/parceiros',
                },
                {
                  label: 'Financeiro',
                  href: '/financeiro',
                },
              ].map((item, index, array) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center justify-between px-5 py-4 transition hover:bg-white/[0.025] md:px-6 ${
                    index !== array.length - 1
                      ? 'border-b border-white/[0.055]'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7C9C87]/70" />

                    <span className="text-sm font-medium text-[#EDEDE3]/57 transition group-hover:text-[#EDEDE3]">
                      {item.label}
                    </span>
                  </div>

                  <span className="text-xs text-[#EDEDE3]/15 transition group-hover:translate-x-1 group-hover:text-[#E3A144]">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* =====================================================
            RODAPÉ INTERNO
        ====================================================== */}

        <div className="mt-10 flex flex-col gap-2 border-t border-white/[0.06] pt-6 text-[10px] text-[#EDEDE3]/22 sm:flex-row sm:items-center sm:justify-between">
          <span>
            ERN Gestão — Encantos Rio Negro
          </span>

          <span>
            Operação turística integrada
          </span>
        </div>
      </main>
    </div>
  );
}
'use client';

import React, {
  type ReactNode,
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';

import { supabase } from '@/lib/supabase';

import {
  possuiRecurso,
  RECURSOS_PLANOS,
  type PlanoAtual,
  type RecursoPlano,
} from '@/lib/plano';

type PlanoGateProps = {
  recurso: RecursoPlano;
  children: ReactNode;
};

export default function PlanoGate({
  recurso,
  children,
}: PlanoGateProps) {
  const [plano, setPlano] =
    useState<PlanoAtual | null>(null);

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] =
    useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregarPlano() {
      setCarregando(true);
      setErro(null);

      try {
        const { data, error } =
          await supabase.rpc('get_meu_plano');

        if (error) {
          throw error;
        }

        const resultado = Array.isArray(data)
          ? data[0]
          : data;

        if (!ativo) {
          return;
        }

        if (!resultado) {
          setPlano(null);
          setErro(
            'Não foi possível identificar o plano desta empresa.'
          );

          return;
        }

        setPlano(resultado as PlanoAtual);
      } catch (err) {
        console.error(
          'Erro ao verificar plano:',
          err
        );

        if (!ativo) {
          return;
        }

        setErro(
          err instanceof Error
            ? err.message
            : 'Não foi possível verificar a assinatura.'
        );
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarPlano();

    return () => {
      ativo = false;
    };
  }, []);

  const configuracao =
    RECURSOS_PLANOS[recurso];

  if (carregando) {
    return (
      <div className="flex min-h-[calc(100vh-82px)] items-center justify-center bg-[#07110E] px-5 text-[#EDEDE3]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#E3A144]" />

          <p className="mt-4 text-xs uppercase tracking-[0.16em] text-[#EDEDE3]/35">
            Verificando assinatura
          </p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex min-h-[calc(100vh-82px)] items-center justify-center bg-[#07110E] px-5 text-[#EDEDE3]">
        <div className="w-full max-w-[560px] rounded-[26px] border border-red-400/15 bg-[#0A1713] p-6 md:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-300">
            Assinatura
          </p>

          <h1
            className="mt-3 text-3xl text-[#F0F0E8]"
            style={{
              fontFamily:
                'var(--font-fraunces), serif',
            }}
          >
            Não foi possível verificar seu plano.
          </h1>

          <p className="mt-4 text-sm leading-7 text-[#EDEDE3]/45">
            {erro}
          </p>

          <Link
            href="/dashboard"
            className="mt-7 inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/10 px-5 text-sm font-semibold text-[#EDEDE3]/70 transition hover:bg-white/[0.04]"
          >
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (possuiRecurso(plano, recurso)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[calc(100vh-82px)] bg-[#07110E] px-5 py-10 text-[#EDEDE3] md:px-8 md:py-16">
      <div className="mx-auto max-w-[980px]">
        <div className="overflow-hidden rounded-[30px] border border-[#E3A144]/16 bg-[#0A1713]">
          <div className="relative p-6 md:p-10">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-[#E3A144]/10" />

            <div className="relative">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-[#E3A144]/20 bg-[#E3A144]/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#F4C77E]">
                  Recurso {configuracao.planoMinimo}
                </span>

                {plano && (
                  <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/35">
                    Seu plano: {plano.plano_nome}
                  </span>
                )}
              </div>

              <h1
                className="mt-7 max-w-[700px] text-4xl leading-[1.02] tracking-[-0.035em] text-[#F0F0E8] md:text-5xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {configuracao.nome} faz parte de uma
                operação mais completa.
              </h1>

              <p className="mt-6 max-w-[680px] text-sm leading-7 text-[#EDEDE3]/48 md:text-base">
                {configuracao.descricao}
              </p>

              <div className="mt-9 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[18px] border border-white/[0.065] bg-white/[0.018] p-4">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#7C9C87]">
                    Plano atual
                  </span>

                  <strong className="mt-2 block text-lg text-[#F0F0E8]">
                    {plano?.plano_nome || '—'}
                  </strong>
                </div>

                <div className="rounded-[18px] border border-white/[0.065] bg-white/[0.018] p-4">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#7C9C87]">
                    Recurso
                  </span>

                  <strong className="mt-2 block text-lg text-[#F0F0E8]">
                    {configuracao.nome}
                  </strong>
                </div>

                <div className="rounded-[18px] border border-[#E3A144]/12 bg-[#E3A144]/[0.035] p-4">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#E3A144]">
                    Disponível em
                  </span>

                  <strong className="mt-2 block text-lg text-[#F4C77E]">
                    {configuracao.planoMinimo}
                  </strong>
                </div>
              </div>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard"
                  className="inline-flex min-h-[50px] items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.025] px-6 text-sm font-semibold text-[#EDEDE3]/70 transition hover:bg-white/[0.05]"
                >
                  Voltar ao Dashboard
                </Link>

                <button
                  type="button"
                  disabled
                  className="inline-flex min-h-[50px] cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-[#E3A144] px-6 text-sm font-bold text-[#07130F] opacity-70"
                  title="A contratação online será adicionada em uma próxima etapa."
                >
                  Conhecer planos
                  <span>→</span>
                </button>
              </div>

              <p className="mt-4 text-[10px] leading-5 text-[#EDEDE3]/25">
                A contratação online ainda não está
                habilitada. Estamos preparando essa
                etapa do ERN Gestão.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import React, {
  useState,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

type StatusRelatorio =
  | 'Concluído'
  | 'Pendente'
  | 'Em Análise';

type FormRelatorio = {
  titulo: string;
  tipo: string;
  data_geracao: string;
  gerado_por: string;
  status: StatusRelatorio;
};

function dataLocalHoje() {
  const hoje =
    new Date();

  const ano =
    hoje.getFullYear();

  const mes =
    String(
      hoje.getMonth() + 1
    ).padStart(
      2,
      '0'
    );

  const dia =
    String(
      hoje.getDate()
    ).padStart(
      2,
      '0'
    );

  return `${ano}-${mes}-${dia}`;
}

const estadoInicial:
  FormRelatorio = {
    titulo: '',
    tipo: 'Operacional',
    data_geracao:
      dataLocalHoje(),
    gerado_por: '',
    status: 'Concluído',
  };

export default function NovoRelatorioPage() {
  const router =
    useRouter();

  const [
    form,
    setForm,
  ] =
    useState<FormRelatorio>(
      estadoInicial
    );

  const [
    salvando,
    setSalvando,
  ] =
    useState(false);

  const [
    erro,
    setErro,
  ] =
    useState<string | null>(
      null
    );

  const [
    sucesso,
    setSucesso,
  ] =
    useState<string | null>(
      null
    );

  const inputClass =
    'w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm text-[#EDEDE3] outline-none transition placeholder:text-[#EDEDE3]/20 focus:border-[#E3A144]/40 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-50';

  const labelClass =
    'mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/34';

  function alterarCampo<
    K extends keyof FormRelatorio,
  >(
    campo: K,
    valor:
      FormRelatorio[K]
  ) {
    setForm(
      (
        atual
      ) => ({
        ...atual,

        [campo]:
          valor,
      })
    );
  }

  function limpar() {
    if (
      salvando
    ) {
      return;
    }

    setForm(
      estadoInicial
    );

    setErro(null);
    setSucesso(null);
  }

  async function handleSubmit(
    event:
      React.FormEvent
  ) {
    event.preventDefault();

    if (
      salvando
    ) {
      return;
    }

    setErro(null);
    setSucesso(null);

    const titulo =
      form.titulo.trim();

    if (!titulo) {
      setErro(
        'Informe o título do relatório.'
      );

      return;
    }

    setSalvando(true);

    try {
      const {
        error,
      } =
        await supabase
          .from(
            'relatorios'
          )
          .insert([
            {
              titulo,

              tipo:
                form.tipo.trim() ||
                null,

              data_geracao:
                form.data_geracao ||
                null,

              gerado_por:
                form.gerado_por.trim() ||
                null,

              status:
                form.status,
            },
          ]);

      if (error) {
        throw error;
      }

      setSucesso(
        'Relatório cadastrado com sucesso.'
      );

      window.setTimeout(
        () => {
          router.push(
            '/relatorios'
          );

          router.refresh();
        },
        1000
      );
    } catch (error) {
      console.error(
        'Erro ao cadastrar relatório:',
        error
      );

      const mensagem =
        String(
          error instanceof Error
            ? error.message
            : ''
        );

      if (
        mensagem.includes(
          'ERN_USUARIO_SEM_EMPRESA'
        )
      ) {
        setErro(
          'Seu usuário não possui uma empresa vinculada.'
        );

        return;
      }

      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível cadastrar o relatório.'
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#07110E] pb-16 text-[#EDEDE3]">
      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <section className="border-b border-white/[0.07] bg-[#091510]">
        <div className="mx-auto max-w-[1180px] px-5 py-10 md:px-8 md:py-12">
          <Link
            href="/relatorios"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#EDEDE3]/38 transition hover:text-[#E3A144]"
          >
            ← Relatórios
          </Link>

          <div className="mt-7">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-[#E3A144]" />

              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                Gestão • Registro
              </p>
            </div>

            <h1
              className="mt-4 text-4xl tracking-[-0.035em] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Novo relatório
            </h1>

            <p className="mt-4 max-w-[680px] text-sm leading-7 text-[#EDEDE3]/40">
              Registre um documento operacional ou
              gerencial vinculado à sua empresa.
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 md:py-10">
        {erro && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-5 py-4 text-xs text-red-300">
            {erro}
          </div>
        )}

        {sucesso && (
          <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] px-5 py-4 text-xs text-emerald-300">
            {sucesso}
          </div>
        )}

        <form
          onSubmit={
            handleSubmit
          }
          className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"
        >
          <section className="rounded-[26px] border border-white/[0.075] bg-[#0A1713] p-5 md:p-7">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
              Identificação
            </p>

            <h2
              className="mt-2 text-2xl text-[#F0F0E8]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Dados do relatório
            </h2>

            <div className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="titulo"
                  className={
                    labelClass
                  }
                >
                  Título *
                </label>

                <input
                  id="titulo"
                  type="text"
                  required
                  disabled={
                    salvando
                  }
                  placeholder="Ex.: Fechamento operacional de setembro"
                  value={
                    form.titulo
                  }
                  onChange={(
                    event
                  ) =>
                    alterarCampo(
                      'titulo',
                      event.target
                        .value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="tipo"
                  className={
                    labelClass
                  }
                >
                  Tipo
                </label>

                <input
                  id="tipo"
                  type="text"
                  disabled={
                    salvando
                  }
                  placeholder="Ex.: Operacional, Financeiro"
                  value={
                    form.tipo
                  }
                  onChange={(
                    event
                  ) =>
                    alterarCampo(
                      'tipo',
                      event.target
                        .value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="responsavel"
                  className={
                    labelClass
                  }
                >
                  Responsável
                </label>

                <input
                  id="responsavel"
                  type="text"
                  disabled={
                    salvando
                  }
                  placeholder="Nome do responsável pelo registro"
                  value={
                    form.gerado_por
                  }
                  onChange={(
                    event
                  ) =>
                    alterarCampo(
                      'gerado_por',
                      event.target
                        .value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="data"
                  className={
                    labelClass
                  }
                >
                  Data de geração
                </label>

                <input
                  id="data"
                  type="date"
                  disabled={
                    salvando
                  }
                  value={
                    form.data_geracao
                  }
                  onChange={(
                    event
                  ) =>
                    alterarCampo(
                      'data_geracao',
                      event.target
                        .value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </div>
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-[26px] border border-white/[0.075] bg-[#0A1713] p-5 md:p-6">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                Acompanhamento
              </p>

              <h2
                className="mt-2 text-2xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Status
              </h2>

              <p className="mt-4 text-xs leading-6 text-[#EDEDE3]/35">
                Defina a situação atual do registro.
                Ela poderá ser alterada posteriormente.
              </p>

              <div className="mt-6">
                <label
                  htmlFor="status"
                  className={
                    labelClass
                  }
                >
                  Situação
                </label>

                <select
                  id="status"
                  disabled={
                    salvando
                  }
                  value={
                    form.status
                  }
                  onChange={(
                    event
                  ) =>
                    alterarCampo(
                      'status',
                      event.target
                        .value as StatusRelatorio
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="Concluído">
                    Concluído
                  </option>

                  <option value="Pendente">
                    Pendente
                  </option>

                  <option value="Em Análise">
                    Em Análise
                  </option>
                </select>
              </div>
            </section>

            <section className="rounded-[20px] border border-emerald-500/10 bg-emerald-500/[0.025] p-5">
              <div className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />

                <p className="text-[10px] leading-5 text-[#EDEDE3]/32">
                  O relatório será vinculado à empresa
                  autenticada. A disponibilidade deste
                  módulo é controlada pelo plano contratado.
                </p>
              </div>
            </section>
          </div>

          <div className="lg:col-span-2">
            <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                disabled={
                  salvando
                }
                onClick={
                  limpar
                }
                className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 py-3 text-xs font-semibold text-[#EDEDE3]/45 disabled:opacity-50"
              >
                Limpar formulário
              </button>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/relatorios"
                  className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/[0.08] px-5 text-xs font-semibold text-[#EDEDE3]/55"
                >
                  Cancelar
                </Link>

                <button
                  type="submit"
                  disabled={
                    salvando
                  }
                  className="inline-flex min-h-[46px] min-w-[160px] items-center justify-center rounded-xl bg-[#E3A144] px-6 text-xs font-bold text-[#07130F] disabled:opacity-50"
                >
                  {salvando
                    ? 'Salvando...'
                    : 'Salvar relatório'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
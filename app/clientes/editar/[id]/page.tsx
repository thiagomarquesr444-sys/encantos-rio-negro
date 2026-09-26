'use client';

import React, {
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';

import {
  useParams,
  useRouter,
} from 'next/navigation';

import { supabase } from '@/lib/supabase';

type ClienteForm = {
  nome: string;
  documento: string;
  telefone: string;
  email: string;
  cidade: string;
  nacionalidade: string;
  situacao: string;
  observacoes: string;
};

export default function EditarClientePage() {
  const router = useRouter();
  const params = useParams();

  const id = params?.id;

  const [loading, setLoading] =
    useState(true);

  const [salvando, setSalvando] =
    useState(false);

  const [
    mensagemSucesso,
    setMensagemSucesso,
  ] = useState('');

  const [
    mensagemErro,
    setMensagemErro,
  ] = useState('');

  const [form, setForm] =
    useState<ClienteForm>({
      nome: '',
      documento: '',
      telefone: '',
      email: '',
      cidade: '',
      nacionalidade: '',
      situacao: 'Ativo',
      observacoes: '',
    });

  /*
    ============================================================
    CARREGAMENTO
    ============================================================
  */

  useEffect(() => {
    if (!id) return;

    async function carregar() {
      try {
        const { data, error } =
          await supabase
            .from('clientes')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
          throw error;
        }

        if (data) {
          setForm({
            nome:
              data.nome || '',
            documento:
              data.documento || '',
            telefone:
              data.telefone || '',
            email:
              data.email || '',
            cidade:
              data.cidade || '',
            nacionalidade:
              data.nacionalidade || '',
            situacao:
              data.situacao ||
              data.situação ||
              'Ativo',
            observacoes:
              data.observacoes || '',
          });
        }
      } catch (error) {
        console.error(
          'Erro ao buscar cliente:',
          error
        );

        setMensagemErro(
          'Não foi possível carregar os dados do cliente.'
        );
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, [id]);

  /*
    ============================================================
    FORM
    ============================================================
  */

  const handleChange = (
    event: React.ChangeEvent<
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
    >
  ) => {
    const { name, value } =
      event.target;

    setForm((atual) => ({
      ...atual,
      [name]: value,
    }));
  };

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setMensagemErro('');
    setMensagemSucesso('');

    if (!form.nome.trim()) {
      setMensagemErro(
        'O nome do cliente é obrigatório.'
      );

      return;
    }

    setSalvando(true);

    try {
      const { error } =
        await supabase
          .from('clientes')
          .update({
            nome: form.nome,
            documento:
              form.documento,
            telefone:
              form.telefone,
            email: form.email,
            cidade: form.cidade,
            nacionalidade:
              form.nacionalidade,
            situacao:
              form.situacao,
            observacoes:
              form.observacoes,
          })
          .eq('id', id);

      if (error) {
        throw error;
      }

      setMensagemSucesso(
        'Cliente atualizado com sucesso.'
      );

      setTimeout(() => {
        router.push('/clientes');
      }, 1200);
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : 'Erro desconhecido';

      setMensagemErro(
        'Erro ao atualizar cliente: ' +
          mensagem
      );
    } finally {
      setSalvando(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm text-[#EDEDE3] outline-none transition placeholder:text-[#EDEDE3]/20 focus:border-[#E3A144]/40';

  const labelClass =
    'mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/34';

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-82px)] items-center justify-center bg-[#07110E] text-[#EDEDE3]">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-white/[0.08] border-t-[#E3A144]" />

          <p className="mt-4 text-xs text-[#EDEDE3]/35">
            Carregando cliente...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      {/* =======================================================
          CABEÇALHO
      ======================================================== */}

      <section className="border-b border-white/[0.07] bg-[#091510]">
        <div className="mx-auto max-w-[1180px] px-5 py-10 md:px-8 md:py-12">
          <Link
            href="/clientes"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#EDEDE3]/38 transition hover:text-[#E3A144]"
          >
            <span>←</span>
            Clientes
          </Link>

          <div className="mt-7">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
              Operação • Edição
            </p>

            <h1
              className="mt-3 text-4xl tracking-[-0.035em] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Editar cliente
            </h1>

            <p className="mt-4 max-w-[620px] text-sm leading-7 text-[#EDEDE3]/40">
              Atualize informações de
              contato, situação e contexto
              operacional do viajante.
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 md:py-10">
        {mensagemSucesso && (
          <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] px-5 py-4 text-xs text-emerald-300">
            {mensagemSucesso}
          </div>
        )}

        {mensagemErro && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-5 py-4 text-xs text-red-300">
            {mensagemErro}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"
        >
          {/* DADOS */}

          <section className="rounded-[26px] border border-white/[0.075] bg-[#0A1713] p-5 md:p-7">
            <div className="border-b border-white/[0.065] pb-5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                Dados cadastrais
              </p>

              <h2
                className="mt-2 text-2xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Informações do cliente
              </h2>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label className={labelClass}>
                  Nome completo *
                </label>

                <input
                  type="text"
                  name="nome"
                  required
                  value={form.nome}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className={
                      labelClass
                    }
                  >
                    Documento / CPF
                  </label>

                  <input
                    type="text"
                    name="documento"
                    value={
                      form.documento
                    }
                    onChange={
                      handleChange
                    }
                    className={`${inputClass} font-mono`}
                  />
                </div>

                <div>
                  <label
                    className={
                      labelClass
                    }
                  >
                    Telefone / WhatsApp
                  </label>

                  <input
                    type="text"
                    name="telefone"
                    value={
                      form.telefone
                    }
                    onChange={
                      handleChange
                    }
                    className={
                      inputClass
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className={
                      labelClass
                    }
                  >
                    E-mail
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={
                      handleChange
                    }
                    className={
                      inputClass
                    }
                  />
                </div>

                <div>
                  <label
                    className={
                      labelClass
                    }
                  >
                    Cidade
                  </label>

                  <input
                    type="text"
                    name="cidade"
                    value={
                      form.cidade
                    }
                    onChange={
                      handleChange
                    }
                    className={
                      inputClass
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className={
                      labelClass
                    }
                  >
                    Nacionalidade
                  </label>

                  <input
                    type="text"
                    name="nacionalidade"
                    value={
                      form.nacionalidade
                    }
                    onChange={
                      handleChange
                    }
                    className={
                      inputClass
                    }
                  />
                </div>

                <div>
                  <label
                    className={
                      labelClass
                    }
                  >
                    Situação
                  </label>

                  <select
                    name="situacao"
                    value={
                      form.situacao
                    }
                    onChange={
                      handleChange
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="Ativo">
                      Ativo
                    </option>

                    <option value="Inativo">
                      Inativo
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* OBSERVAÇÕES */}

          <section className="rounded-[26px] border border-white/[0.075] bg-[#0A1713] p-5 md:p-6">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
              Contexto operacional
            </p>

            <h2
              className="mt-2 text-2xl text-[#F0F0E8]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Observações e histórico
            </h2>

            <p className="mt-4 text-xs leading-6 text-[#EDEDE3]/35">
              Registre preferências,
              restrições e outras
              informações úteis para o
              atendimento.
            </p>

            <textarea
              name="observacoes"
              rows={12}
              value={
                form.observacoes
              }
              onChange={
                handleChange
              }
              placeholder="Informações adicionais..."
              className={`${inputClass} mt-5 resize-none leading-6`}
            />
          </section>

          {/* AÇÕES */}

          <div className="lg:col-span-2">
            <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-6 sm:flex-row sm:justify-end">
              <Link
                href="/clientes"
                className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 text-xs font-semibold text-[#EDEDE3]/55 transition hover:bg-white/[0.05]"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={salvando}
                className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-[#E3A144] px-6 text-xs font-bold text-[#07130F] transition hover:bg-[#F0B35C] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {salvando
                  ? 'Salvando...'
                  : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
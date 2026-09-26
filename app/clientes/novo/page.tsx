'use client';

import React, {
  useState,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

interface ClienteForm {
  nome: string;
  documento: string;
  telefone: string;
  email: string;
  cidade: string;
  nacionalidade: string;
  observacoes: string;
  situacao: string;
}

export default function NovoClientePage() {
  const router = useRouter();

  const initialFormState: ClienteForm =
    {
      nome: '',
      documento: '',
      telefone: '',
      email: '',
      cidade: '',
      nacionalidade: '',
      observacoes: '',
      situacao: 'Ativo',
    };

  const [formData, setFormData] =
    useState<ClienteForm>(
      initialFormState
    );

  const [salvando, setSalvando] =
    useState(false);

  const [
    mensagemStatus,
    setMensagemStatus,
  ] = useState<{
    tipo: 'sucesso' | 'erro';
    texto: string;
  } | null>(null);

  /*
    ============================================================
    MÁSCARAS
    ============================================================
  */

  const aplicarMascaraDocumento = (
    valor: string
  ) => {
    const apenasNumeros =
      valor.replace(/\D/g, '');

    if (
      apenasNumeros.length <= 11
    ) {
      return apenasNumeros
        .replace(
          /(\d{3})(\d)/,
          '$1.$2'
        )
        .replace(
          /(\d{3})(\d)/,
          '$1.$2'
        )
        .replace(
          /(\d{3})(\d{1,2})$/,
          '$1-$2'
        );
    }

    return valor;
  };

  const aplicarMascaraTelefone = (
    valor: string
  ) => {
    const apenasNumeros =
      valor.replace(/\D/g, '');

    return apenasNumeros
      .replace(
        /^(\d{2})(\d)/g,
        '($1) $2'
      )
      .replace(
        /(\d{5})(\d)/,
        '$1-$2'
      )
      .slice(0, 15);
  };

  const handleChange = (
    event: React.ChangeEvent<
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
    >
  ) => {
    const { name, value } =
      event.target;

    let valorFormatado =
      value;

    if (name === 'documento') {
      valorFormatado =
        aplicarMascaraDocumento(
          value
        );
    }

    if (name === 'telefone') {
      valorFormatado =
        aplicarMascaraTelefone(
          value
        );
    }

    setFormData((atual) => ({
      ...atual,
      [name]: valorFormatado,
    }));
  };

  const handleLimpar = () => {
    setFormData(initialFormState);
    setMensagemStatus(null);
  };

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setMensagemStatus(null);

    if (
      !formData.nome.trim() ||
      !formData.documento.trim() ||
      !formData.email.trim() ||
      !formData.telefone.trim() ||
      !formData.cidade.trim()
    ) {
      setMensagemStatus({
        tipo: 'erro',
        texto:
          'Preencha os campos obrigatórios: nome, documento, e-mail, telefone e cidade.',
      });

      return;
    }

    setSalvando(true);

    try {
      const payload = {
        nome: formData.nome.trim(),
        documento:
          formData.documento.trim() ||
          null,
        telefone:
          formData.telefone.trim() ||
          null,
        email:
          formData.email.trim() ||
          null,
        cidade:
          formData.cidade.trim() ||
          null,
        nacionalidade:
          formData.nacionalidade.trim() ||
          null,
        observacoes:
          formData.observacoes.trim() ||
          null,
        situacao:
          formData.situacao ||
          'Ativo',
      };

      const { error } =
        await supabase
          .from('clientes')
          .insert([payload]);

      if (error) {
        throw error;
      }

      setMensagemStatus({
        tipo: 'sucesso',
        texto:
          'Cliente cadastrado com sucesso.',
      });

      setTimeout(() => {
        router.push('/clientes');
      }, 1200);
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : 'Erro ao salvar o cliente.';

      setMensagemStatus({
        tipo: 'erro',
        texto:
          'Falha ao salvar: ' +
          mensagem,
      });
    } finally {
      setSalvando(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm text-[#EDEDE3] outline-none transition placeholder:text-[#EDEDE3]/20 focus:border-[#E3A144]/40';

  const labelClass =
    'mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/34';

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

          <div className="mt-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                Operação • Cadastro
              </p>

              <h1
                className="mt-3 text-4xl tracking-[-0.035em] text-[#F0F0E8] md:text-5xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Novo cliente
              </h1>

              <p className="mt-4 max-w-[620px] text-sm leading-7 text-[#EDEDE3]/40">
                Cadastre as informações
                essenciais para atendimento,
                reservas e operação.
              </p>
            </div>

            <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[9px] uppercase tracking-[0.15em] text-[#EDEDE3]/28">
              ERN Gestão
            </span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 md:py-10">
        {mensagemStatus && (
          <div
            className={`mb-6 rounded-2xl border px-5 py-4 text-xs ${
              mensagemStatus.tipo ===
              'sucesso'
                ? 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300'
                : 'border-red-500/20 bg-red-500/[0.07] text-red-300'
            }`}
          >
            {mensagemStatus.texto}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"
        >
          {/* ===================================================
              DADOS
          ==================================================== */}

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
                Informações do viajante
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
                  value={formData.nome}
                  onChange={handleChange}
                  placeholder="Nome do cliente"
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
                    CPF / Documento *
                  </label>

                  <input
                    type="text"
                    name="documento"
                    required
                    value={
                      formData.documento
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="000.000.000-00"
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
                    Telefone / WhatsApp *
                  </label>

                  <input
                    type="text"
                    name="telefone"
                    required
                    value={
                      formData.telefone
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="(92) 99999-9999"
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
                    E-mail *
                  </label>

                  <input
                    type="email"
                    name="email"
                    required
                    value={
                      formData.email
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="cliente@email.com"
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
                    Cidade / UF *
                  </label>

                  <input
                    type="text"
                    name="cidade"
                    required
                    value={
                      formData.cidade
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Manaus / AM"
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
                      formData.nacionalidade
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Brasileira"
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
                      formData.situacao
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

          {/* ===================================================
              CONTEXTO
          ==================================================== */}

          <div className="space-y-6">
            <section className="rounded-[26px] border border-white/[0.075] bg-[#0A1713] p-5 md:p-6">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                Cadastro completo
              </p>

              <h2
                className="mt-2 text-2xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Dados que ajudam a
                operação
              </h2>

              <p className="mt-4 text-xs leading-6 text-[#EDEDE3]/35">
                Informações completas
                facilitam atendimento,
                reservas, vouchers e
                comunicação com o
                viajante.
              </p>

              <div className="mt-5 space-y-2">
                {[
                  'Nome completo',
                  'Documento',
                  'Telefone / WhatsApp',
                  'E-mail',
                  'Cidade / origem',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.055] bg-white/[0.018] px-3 py-2.5"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#E3A144]" />

                    <span className="text-[11px] text-[#EDEDE3]/48">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[26px] border border-white/[0.075] bg-[#0A1713] p-5 md:p-6">
              <label className={labelClass}>
                Observações / Histórico
              </label>

              <textarea
                name="observacoes"
                rows={7}
                value={
                  formData.observacoes
                }
                onChange={
                  handleChange
                }
                placeholder="Preferências, restrições, informações de viagem ou observações operacionais..."
                className={`${inputClass} resize-none leading-6`}
              />
            </section>
          </div>

          {/* ===================================================
              AÇÕES
          ==================================================== */}

          <div className="lg:col-span-2">
            <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleLimpar}
                disabled={salvando}
                className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 py-3 text-xs font-semibold text-[#EDEDE3]/45 transition hover:bg-white/[0.05]"
              >
                Limpar formulário
              </button>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/clientes"
                  className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 text-xs font-semibold text-[#EDEDE3]/55 transition hover:bg-white/[0.05]"
                >
                  Cancelar
                </Link>

                <button
                  type="submit"
                  disabled={salvando}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#E3A144] px-6 text-xs font-bold text-[#07130F] transition hover:bg-[#F0B35C] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {salvando
                    ? 'Salvando...'
                    : 'Salvar cliente'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
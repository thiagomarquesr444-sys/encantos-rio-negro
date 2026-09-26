'use client';

import React, {
  useState,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

type StatusGuia =
  | 'Ativo'
  | 'Em Tour'
  | 'Férias'
  | 'Inativo';

interface GuiaForm {
  nome: string;
  cpf: string;
  telefone: string;
  idiomas: string;
  cadastur: string;
  status: StatusGuia;
}

const estadoInicial: GuiaForm = {
  nome: '',
  cpf: '',
  telefone: '',
  idiomas: 'Português',
  cadastur: '',
  status: 'Ativo',
};

function somenteNumeros(
  valor: string
) {
  return valor.replace(
    /\D/g,
    ''
  );
}

function formatarCPF(
  valor: string
) {
  const numeros =
    somenteNumeros(
      valor
    ).slice(0, 11);

  return numeros
    .replace(
      /^(\d{3})(\d)/,
      '$1.$2'
    )
    .replace(
      /^(\d{3})\.(\d{3})(\d)/,
      '$1.$2.$3'
    )
    .replace(
      /\.(\d{3})(\d)/,
      '.$1-$2'
    );
}

function formatarTelefone(
  valor: string
) {
  const numeros =
    somenteNumeros(
      valor
    ).slice(0, 11);

  if (
    numeros.length <= 10
  ) {
    return numeros
      .replace(
        /^(\d{2})(\d)/,
        '($1) $2'
      )
      .replace(
        /(\d{4})(\d)/,
        '$1-$2'
      );
  }

  return numeros
    .replace(
      /^(\d{2})(\d)/,
      '($1) $2'
    )
    .replace(
      /(\d{5})(\d)/,
      '$1-$2'
    );
}

export default function NovoGuiaPage() {
  const router = useRouter();

  const [
    formData,
    setFormData,
  ] =
    useState<GuiaForm>(
      estadoInicial
    );

  const [
    salvando,
    setSalvando,
  ] = useState(false);

  const [
    mensagem,
    setMensagem,
  ] = useState<{
    tipo: 'sucesso' | 'erro';
    texto: string;
  } | null>(null);

  const inputClass =
    'w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm text-[#EDEDE3] outline-none transition placeholder:text-[#EDEDE3]/20 focus:border-[#E3A144]/40';

  const labelClass =
    'mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/34';

  function handleChange(
    event: React.ChangeEvent<
      | HTMLInputElement
      | HTMLSelectElement
    >
  ) {
    const {
      name,
      value,
    } = event.target;

    if (name === 'cpf') {
      setFormData(
        (atual) => ({
          ...atual,

          cpf:
            formatarCPF(
              value
            ),
        })
      );

      return;
    }

    if (
      name === 'telefone'
    ) {
      setFormData(
        (atual) => ({
          ...atual,

          telefone:
            formatarTelefone(
              value
            ),
        })
      );

      return;
    }

    setFormData(
      (atual) => ({
        ...atual,

        [name]: value,
      })
    );
  }

  function handleLimpar() {
    setFormData(
      estadoInicial
    );

    setMensagem(null);
  }

  /*
    ============================================================
    SALVAR
    ============================================================
  */

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setMensagem(null);

    if (
      !formData.nome.trim() ||
      !formData.cpf.trim() ||
      !formData.telefone.trim() ||
      !formData.cadastur.trim()
    ) {
      setMensagem({
        tipo: 'erro',
        texto:
          'Preencha os campos obrigatórios: nome, CPF, telefone e CADASTUR.',
      });

      return;
    }

    if (
      somenteNumeros(
        formData.cpf
      ).length !== 11
    ) {
      setMensagem({
        tipo: 'erro',
        texto:
          'Informe um CPF com 11 dígitos.',
      });

      return;
    }

    if (
      somenteNumeros(
        formData.telefone
      ).length < 10
    ) {
      setMensagem({
        tipo: 'erro',
        texto:
          'Informe um telefone válido.',
      });

      return;
    }

    setSalvando(true);

    try {
      const payload = {
        nome:
          formData.nome.trim(),

        cpf:
          formData.cpf.trim(),

        telefone:
          formData.telefone.trim(),

        idiomas:
          formData.idiomas.trim() ||
          'Português',

        cadastur:
          formData.cadastur.trim(),

        status:
          formData.status,
      };

      const { error } =
        await supabase
          .from('guias')
          .insert([payload]);

      if (error) {
        throw error;
      }

      setMensagem({
        tipo: 'sucesso',
        texto:
          'Guia cadastrado com sucesso.',
      });

      setTimeout(() => {
        router.push(
          '/guias'
        );

        router.refresh();
      }, 1200);
    } catch (err) {
      console.error(
        'Erro ao cadastrar guia:',
        err
      );

      setMensagem({
        tipo: 'erro',
        texto:
          err instanceof Error
            ? `Erro ao cadastrar guia: ${err.message}`
            : 'Não foi possível cadastrar o guia.',
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <section className="border-b border-white/[0.07] bg-[#091510]">
        <div className="mx-auto max-w-[1180px] px-5 py-10 md:px-8 md:py-12">
          <Link
            href="/guias"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#EDEDE3]/38 transition hover:text-[#E3A144]"
          >
            <span>←</span>

            Guias
          </Link>

          <div className="mt-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                Estrutura • Equipe
              </p>

              <h1
                className="mt-3 text-4xl tracking-[-0.035em] text-[#F0F0E8] md:text-5xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Novo guia
              </h1>

              <p className="mt-4 max-w-[680px] text-sm leading-7 text-[#EDEDE3]/40">
                Cadastre profissionais
                da operação, contatos,
                idiomas, CADASTUR e
                disponibilidade.
              </p>
            </div>

            <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[9px] uppercase tracking-[0.15em] text-[#EDEDE3]/28">
              ERN Gestão
            </span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 md:py-10">
        {mensagem && (
          <div
            className={`mb-6 rounded-2xl border px-5 py-4 text-xs ${
              mensagem.tipo ===
              'sucesso'
                ? 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300'
                : 'border-red-500/20 bg-red-500/[0.07] text-red-300'
            }`}
          >
            {mensagem.texto}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"
        >
          {/* =================================================
              PROFISSIONAL
          ================================================== */}

          <section className="rounded-[26px] border border-white/[0.075] bg-[#0A1713] p-5 md:p-7">
            <div className="border-b border-white/[0.065] pb-5">
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
                Dados do profissional
              </h2>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label
                  className={
                    labelClass
                  }
                >
                  Nome completo *
                </label>

                <input
                  type="text"
                  name="nome"
                  required
                  value={
                    formData.nome
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Nome completo do guia"
                  className={
                    inputClass
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className={
                      labelClass
                    }
                  >
                    CPF *
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    name="cpf"
                    required
                    maxLength={14}
                    value={
                      formData.cpf
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
                    inputMode="tel"
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

              <div>
                <label
                  className={
                    labelClass
                  }
                >
                  Idiomas
                </label>

                <input
                  type="text"
                  name="idiomas"
                  value={
                    formData.idiomas
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Ex.: Português, Inglês, Espanhol"
                  className={
                    inputClass
                  }
                />

                <p className="mt-2 text-[9px] leading-4 text-[#EDEDE3]/24">
                  Separe mais de um
                  idioma por vírgula.
                </p>
              </div>

              <div>
                <label
                  className={
                    labelClass
                  }
                >
                  Registro CADASTUR *
                </label>

                <input
                  type="text"
                  name="cadastur"
                  required
                  value={
                    formData.cadastur
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Número do registro"
                  className={
                    inputClass
                  }
                />
              </div>
            </div>
          </section>

          {/* =================================================
              OPERAÇÃO
          ================================================== */}

          <div className="space-y-6">
            <section className="rounded-[26px] border border-white/[0.075] bg-[#0A1713] p-5 md:p-6">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                Operação
              </p>

              <h2
                className="mt-2 text-2xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Disponibilidade
              </h2>

              <p className="mt-4 text-xs leading-6 text-[#EDEDE3]/35">
                O status informa se o
                guia está disponível,
                em uma operação,
                afastado temporariamente
                ou inativo.
              </p>

              <div className="mt-6">
                <label
                  className={
                    labelClass
                  }
                >
                  Status
                </label>

                <select
                  name="status"
                  value={
                    formData.status
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

                  <option value="Em Tour">
                    Em Tour
                  </option>

                  <option value="Férias">
                    Férias
                  </option>

                  <option value="Inativo">
                    Inativo
                  </option>
                </select>
              </div>
            </section>

            <section className="rounded-[26px] border border-white/[0.075] bg-[#0A1713] p-5 md:p-6">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                Cadastro profissional
              </p>

              <div className="mt-5 space-y-2">
                {[
                  'Identificação',
                  'Contato',
                  'Idiomas',
                  'CADASTUR',
                  'Disponibilidade',
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
          </div>

          {/* =================================================
              AÇÕES
          ================================================== */}

          <div className="lg:col-span-2">
            <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={
                  handleLimpar
                }
                disabled={
                  salvando
                }
                className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 py-3 text-xs font-semibold text-[#EDEDE3]/45 transition hover:bg-white/[0.05] disabled:opacity-50"
              >
                Limpar formulário
              </button>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/guias"
                  className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 text-xs font-semibold text-[#EDEDE3]/55 transition hover:bg-white/[0.05]"
                >
                  Cancelar
                </Link>

                <button
                  type="submit"
                  disabled={
                    salvando
                  }
                  className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-[#E3A144] px-6 text-xs font-bold text-[#07130F] transition hover:bg-[#F0B35C] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {salvando
                    ? 'Salvando...'
                    : 'Cadastrar guia'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
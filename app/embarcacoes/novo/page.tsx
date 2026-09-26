'use client';

import React, {
  useState,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

type StatusEmbarcacao =
  | 'Disponível'
  | 'Reservada'
  | 'Manutenção'
  | 'Inativa';

interface EmbarcacaoForm {
  nome: string;
  tipo: string;
  capacidade: string;
  marinheiro: string;
  motor: string;
  situacao: string;
  status: StatusEmbarcacao;
}

const estadoInicial: EmbarcacaoForm = {
  nome: '',
  tipo: 'Barco Regional',
  capacidade: '',
  marinheiro: '',
  motor: '',
  situacao: '',
  status: 'Disponível',
};

export default function NovaEmbarcacaoPage() {
  const router = useRouter();

  const [
    formData,
    setFormData,
  ] =
    useState<EmbarcacaoForm>(
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
      !formData.capacidade
        .toString()
        .trim() ||
      !formData.marinheiro.trim()
    ) {
      setMensagem({
        tipo: 'erro',
        texto:
          'Preencha os campos obrigatórios: nome, capacidade e marinheiro/responsável.',
      });

      return;
    }

    const capacidade =
      Number(
        formData.capacidade
      );

    if (
      !Number.isInteger(
        capacidade
      ) ||
      capacidade <= 0
    ) {
      setMensagem({
        tipo: 'erro',
        texto:
          'Informe uma capacidade válida e maior que zero.',
      });

      return;
    }

    setSalvando(true);

    try {
      const payload = {
        nome:
          formData.nome.trim(),

        tipo:
          formData.tipo.trim() ||
          null,

        capacidade,

        marinheiro:
          formData.marinheiro.trim(),

        motor:
          formData.motor.trim() ||
          null,

        situacao:
          formData.situacao.trim() ||
          null,

        /*
          O cadastro antigo usava
          "Ativo".

          A partir daqui usamos
          status operacional real.
        */

        status:
          formData.status,
      };

      const { error } =
        await supabase
          .from('embarcacoes')
          .insert([payload]);

      if (error) {
        throw error;
      }

      setMensagem({
        tipo: 'sucesso',
        texto:
          'Embarcação cadastrada com sucesso.',
      });

      setTimeout(() => {
        router.push(
          '/embarcacoes'
        );

        router.refresh();
      }, 1200);
    } catch (err) {
      console.error(
        'Erro ao cadastrar embarcação:',
        err
      );

      setMensagem({
        tipo: 'erro',
        texto:
          err instanceof Error
            ? `Erro ao cadastrar embarcação: ${err.message}`
            : 'Não foi possível cadastrar a embarcação.',
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
            href="/embarcacoes"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#EDEDE3]/38 transition hover:text-[#E3A144]"
          >
            <span>←</span>

            Embarcações
          </Link>

          <div className="mt-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                Estrutura • Frota
              </p>

              <h1
                className="mt-3 text-4xl tracking-[-0.035em] text-[#F0F0E8] md:text-5xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Nova embarcação
              </h1>

              <p className="mt-4 max-w-[680px] text-sm leading-7 text-[#EDEDE3]/40">
                Cadastre uma embarcação
                e organize capacidade,
                responsável, motor e
                situação operacional.
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
              IDENTIFICAÇÃO
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
                Dados da embarcação
              </h2>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label
                  className={
                    labelClass
                  }
                >
                  Nome da embarcação *
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
                  placeholder="Nome ou identificação da embarcação"
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
                    Tipo de embarcação
                  </label>

                  <select
                    name="tipo"
                    value={
                      formData.tipo
                    }
                    onChange={
                      handleChange
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="Barco Regional">
                      Barco Regional
                    </option>

                    <option value="Lancha Rápida">
                      Lancha Rápida
                    </option>

                    <option value="Iate / Catamarã">
                      Iate / Catamarã
                    </option>

                    <option value="Canoa Motorizada">
                      Canoa Motorizada
                    </option>

                    <option value="Catamarã">
                      Catamarã
                    </option>

                    <option value="Lancha">
                      Lancha
                    </option>

                    <option value="Canoa">
                      Canoa
                    </option>

                    <option value="Barco">
                      Barco
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    className={
                      labelClass
                    }
                  >
                    Capacidade *
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    name="capacidade"
                    required
                    value={
                      formData.capacidade
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Ex.: 12"
                    className={
                      inputClass
                    }
                  />

                  <p className="mt-2 text-[9px] text-[#EDEDE3]/24">
                    Número máximo de
                    passageiros.
                  </p>
                </div>
              </div>

              <div>
                <label
                  className={
                    labelClass
                  }
                >
                  Marinheiro / Responsável *
                </label>

                <input
                  type="text"
                  name="marinheiro"
                  required
                  value={
                    formData.marinheiro
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Nome do responsável pela embarcação"
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
                    Motor
                  </label>

                  <input
                    type="text"
                    name="motor"
                    value={
                      formData.motor
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Ex.: Yamaha 90 HP"
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

                  <input
                    type="text"
                    name="situacao"
                    value={
                      formData.situacao
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Ex.: Regular"
                    className={
                      inputClass
                    }
                  />
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              STATUS
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
                Status operacional
              </h2>

              <p className="mt-4 text-xs leading-6 text-[#EDEDE3]/35">
                Informe a condição
                atual da embarcação
                dentro da frota.
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
                  <option value="Disponível">
                    Disponível
                  </option>

                  <option value="Reservada">
                    Reservada
                  </option>

                  <option value="Manutenção">
                    Manutenção
                  </option>

                  <option value="Inativa">
                    Inativa
                  </option>
                </select>
              </div>
            </section>

            <section className="rounded-[26px] border border-white/[0.075] bg-[#0A1713] p-5 md:p-6">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                Controle da frota
              </p>

              <h3
                className="mt-2 text-xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Cadastro operacional
              </h3>

              <div className="mt-5 space-y-2">
                {[
                  'Identificação',
                  'Tipo de embarcação',
                  'Capacidade',
                  'Responsável',
                  'Motor',
                  'Condição operacional',
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
                  href="/embarcacoes"
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
                    : 'Cadastrar embarcação'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
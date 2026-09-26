'use client';

import React, {
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

interface DespesaForm {
  descricao: string;
  valor: string;
  categoria: string;
  data_vencimento: string;
  status:
    | 'Pago'
    | 'Pendente';
}

function dataLocalHoje() {
  const hoje = new Date();

  const ano =
    hoje.getFullYear();

  const mes = String(
    hoje.getMonth() + 1
  ).padStart(2, '0');

  const dia = String(
    hoje.getDate()
  ).padStart(2, '0');

  return `${ano}-${mes}-${dia}`;
}

function converterValor(
  entrada: string
): number {
  let valor = entrada
    .trim()
    .replace(/R\$/gi, '')
    .replace(/\s/g, '');

  if (!valor) {
    return 0;
  }

  if (
    valor.includes('.') &&
    valor.includes(',')
  ) {
    valor = valor
      .replace(/\./g, '')
      .replace(',', '.');
  } else if (
    /^\d{1,3}(\.\d{3})+$/.test(
      valor
    )
  ) {
    valor = valor.replace(
      /\./g,
      ''
    );
  } else if (
    valor.includes(',')
  ) {
    valor = valor.replace(
      ',',
      '.'
    );
  }

  const numero =
    Number(valor);

  return Number.isFinite(numero)
    ? numero
    : NaN;
}

export default function NovaDespesaPage() {
  const router = useRouter();

  const [
    formData,
    setFormData,
  ] =
    useState<DespesaForm>({
      descricao: '',
      valor: '',
      categoria:
        'Manutenção / Operacional',
      data_vencimento: '',
      status: 'Pago',
    });

  const [
    salvando,
    setSalvando,
  ] = useState(false);

  const [
    mensagemSucesso,
    setMensagemSucesso,
  ] = useState('');

  const [
    mensagemErro,
    setMensagemErro,
  ] = useState('');

  useEffect(() => {
    setFormData(
      (atual) => ({
        ...atual,

        data_vencimento:
          dataLocalHoje(),
      })
    );
  }, []);

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

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (salvando) {
      return;
    }

    setMensagemErro('');
    setMensagemSucesso('');

    const descricao =
      formData.descricao.trim();

    if (!descricao) {
      setMensagemErro(
        'Informe a descrição da despesa.'
      );

      return;
    }

    if (
      !formData.data_vencimento
    ) {
      setMensagemErro(
        'Informe a data da despesa.'
      );

      return;
    }

    const valor =
      converterValor(
        formData.valor
      );

    if (
      !Number.isFinite(valor) ||
      valor <= 0
    ) {
      setMensagemErro(
        'Informe um valor válido maior que zero.'
      );

      return;
    }

    setSalvando(true);

    try {
      const {
        data: userData,
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !userData.user
      ) {
        setMensagemErro(
          'Usuário não autenticado. Faça login novamente.'
        );

        return;
      }

      const { error } =
        await supabase
          .from('financeiro')
          .insert([
            {
              descricao,

              tipo: 'despesa',

              valor,

              categoria:
                formData.categoria,

              data_vencimento:
                formData.data_vencimento,

              status:
                formData.status,

              user_id:
                userData.user.id,
            },
          ]);

      if (error) {
        throw error;
      }

      setMensagemSucesso(
        'Despesa cadastrada com sucesso.'
      );

      setTimeout(() => {
        router.push(
          '/financeiro'
        );

        router.refresh();
      }, 1200);
    } catch (err) {
      console.error(
        'Erro ao cadastrar despesa:',
        err
      );

      setMensagemErro(
        err instanceof Error
          ? `Erro ao cadastrar despesa: ${err.message}`
          : 'Não foi possível cadastrar a despesa.'
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      <section className="border-b border-white/[0.07] bg-[#091510]">
        <div className="mx-auto max-w-[1180px] px-5 py-10 md:px-8 md:py-12">
          <Link
            href="/financeiro"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#EDEDE3]/38 transition hover:text-[#E3A144]"
          >
            ← Financeiro
          </Link>

          <div className="mt-7">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-red-300">
              Financeiro • Saída
            </p>

            <h1
              className="mt-3 text-4xl tracking-[-0.035em] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Nova despesa
            </h1>

            <p className="mt-4 max-w-[650px] text-sm leading-7 text-[#EDEDE3]/40">
              Registre custos,
              pagamentos e despesas
              operacionais sem
              misturar valores pagos
              com obrigações pendentes.
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 md:py-10">
        {mensagemErro && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-5 py-4 text-xs text-red-300">
            {mensagemErro}
          </div>
        )}

        {mensagemSucesso && (
          <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] px-5 py-4 text-xs text-emerald-300">
            {mensagemSucesso}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"
        >
          <section className="rounded-[26px] border border-white/[0.075] bg-[#0A1713] p-5 md:p-7">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
              Despesa
            </p>

            <h2
              className="mt-2 text-2xl text-[#F0F0E8]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Dados do lançamento
            </h2>

            <div className="mt-6 space-y-5">
              <div>
                <label
                  className={
                    labelClass
                  }
                >
                  Descrição *
                </label>

                <input
                  type="text"
                  name="descricao"
                  required
                  value={
                    formData.descricao
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Ex.: Combustível da expedição"
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
                    Valor (R$) *
                  </label>

                  <input
                    type="text"
                    inputMode="decimal"
                    name="valor"
                    required
                    value={
                      formData.valor
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Ex.: 1.500"
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
                    Data *
                  </label>

                  <input
                    type="date"
                    name="data_vencimento"
                    required
                    value={
                      formData.data_vencimento
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

              <div>
                <label
                  className={
                    labelClass
                  }
                >
                  Categoria
                </label>

                <select
                  name="categoria"
                  value={
                    formData.categoria
                  }
                  onChange={
                    handleChange
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="Manutenção / Operacional">
                    Manutenção / Operacional
                  </option>

                  <option value="Combustível">
                    Combustível
                  </option>

                  <option value="Alimentação / Insumos">
                    Alimentação / Insumos
                  </option>

                  <option value="Salários / Guias">
                    Salários / Guias
                  </option>

                  <option value="Outras Despesas">
                    Outras Despesas
                  </option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-[26px] border border-white/[0.075] bg-[#0A1713] p-5 md:p-6">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-red-300">
              Liquidação
            </p>

            <h2
              className="mt-2 text-2xl text-[#F0F0E8]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Situação da despesa
            </h2>

            <p className="mt-4 text-xs leading-6 text-[#EDEDE3]/35">
              Marque como Pago apenas
              quando o desembolso já
              tiver ocorrido.
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
                <option value="Pago">
                  Pago
                </option>

                <option value="Pendente">
                  Pendente
                </option>
              </select>
            </div>
          </section>

          <div className="lg:col-span-2">
            <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-6 sm:flex-row sm:justify-end">
              <Link
                href="/financeiro"
                className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 text-xs font-semibold text-[#EDEDE3]/55"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={salvando}
                className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-red-500/20 bg-red-500/[0.12] px-6 text-xs font-bold text-red-200 transition hover:bg-red-500/[0.17] disabled:opacity-50"
              >
                {salvando
                  ? 'Salvando...'
                  : 'Salvar despesa'}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
'use client';

import React, {
  useState,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

type StatusReserva =
  | 'Pendente'
  | 'Confirmada'
  | 'Cancelada';

interface ReservaForm {
  cliente: string;
  pacote: string;
  data_reserva: string;
  agencia: string;
  guia: string;
  valor: string;
  status: StatusReserva;
  observacoes: string;
}

const estadoInicial: ReservaForm = {
  cliente: '',
  pacote: '',
  data_reserva: '',
  agencia: '',
  guia: '',
  valor: '',
  status: 'Pendente',
  observacoes: '',
};

/*
  ============================================================
  CONVERSÃO MONETÁRIA INTELIGENTE
  ============================================================

  Exemplos aceitos:

  3500       -> 3500
  3.500      -> 3500
  3,500      -> 3500
  3500,50    -> 3500.50
  3.500,50   -> 3500.50
  3,500.50   -> 3500.50
  50,00      -> 50
*/

function converterValorMonetario(
  valor: string
): number {
  let bruto = valor
    .trim()
    .replace(/\s/g, '')
    .replace(/R\$/gi, '');

  if (!bruto) {
    return 0;
  }

  /*
    Mantemos somente números,
    pontos e vírgulas.
  */

  bruto = bruto.replace(
    /[^0-9.,]/g,
    ''
  );

  if (!bruto) {
    return NaN;
  }

  const temVirgula =
    bruto.includes(',');

  const temPonto =
    bruto.includes('.');

  let normalizado = bruto;

  /*
    CASO 1:
    Possui ponto e vírgula.

    O separador que aparece por último
    é considerado decimal.

    3.500,50 -> 3500.50
    3,500.50 -> 3500.50
  */

  if (temVirgula && temPonto) {
    const ultimaVirgula =
      bruto.lastIndexOf(',');

    const ultimoPonto =
      bruto.lastIndexOf('.');

    if (
      ultimaVirgula >
      ultimoPonto
    ) {
      normalizado = bruto
        .replace(/\./g, '')
        .replace(',', '.');
    } else {
      normalizado =
        bruto.replace(
          /,/g,
          ''
        );
    }
  }

  /*
    CASO 2:
    Somente vírgula.

    3,500    -> milhar
    12,500   -> milhar
    3,50     -> decimal
    3500,50  -> decimal
  */

  else if (temVirgula) {
    if (
      /^\d{1,3}(,\d{3})+$/.test(
        bruto
      )
    ) {
      normalizado =
        bruto.replace(
          /,/g,
          ''
        );
    } else {
      const partes =
        bruto.split(',');

      const decimal =
        partes.pop() || '';

      const inteiro =
        partes.join('');

      normalizado =
        `${inteiro}.${decimal}`;
    }
  }

  /*
    CASO 3:
    Somente ponto.

    3.500    -> milhar
    12.500   -> milhar
    3500.50  -> decimal
    50.00    -> decimal
  */

  else if (temPonto) {
    if (
      /^\d{1,3}(\.\d{3})+$/.test(
        bruto
      )
    ) {
      normalizado =
        bruto.replace(
          /\./g,
          ''
        );
    } else {
      const partes =
        bruto.split('.');

      const decimal =
        partes.pop() || '';

      const inteiro =
        partes.join('');

      normalizado =
        `${inteiro}.${decimal}`;
    }
  }

  const numero =
    Number(normalizado);

  return Number.isFinite(numero)
    ? numero
    : NaN;
}

/*
  ============================================================
  FORMATAÇÃO BRASILEIRA
  ============================================================
*/

function formatarValorCampo(
  numero: number
): string {
  return numero.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

export default function NovaReservaPage() {
  const router = useRouter();

  const [
    formData,
    setFormData,
  ] =
    useState<ReservaForm>(
      estadoInicial
    );

  const [
    salvando,
    setSalvando,
  ] = useState(false);

  const [
    feedback,
    setFeedback,
  ] = useState<{
    tipo: 'sucesso' | 'erro';
    mensagem: string;
  } | null>(null);

  const inputClass =
    'w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm text-[#EDEDE3] outline-none transition placeholder:text-[#EDEDE3]/20 focus:border-[#E3A144]/40';

  const labelClass =
    'mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/34';

  /*
    ============================================================
    ALTERAÇÃO DOS CAMPOS
    ============================================================
  */

  function handleChange(
    event: React.ChangeEvent<
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
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

  /*
    Quando o usuário sai do campo,
    mostramos o valor no padrão
    brasileiro.

    Exemplo:
    3,500 -> 3.500,00
  */

  function formatarValorAoSair() {
    if (
      !formData.valor.trim()
    ) {
      return;
    }

    const numero =
      converterValorMonetario(
        formData.valor
      );

    if (
      !Number.isFinite(numero)
    ) {
      return;
    }

    setFormData(
      (atual) => ({
        ...atual,
        valor:
          formatarValorCampo(
            numero
          ),
      })
    );
  }

  function handleLimpar() {
    setFormData(
      estadoInicial
    );

    setFeedback(null);
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

    setFeedback(null);

    if (
      !formData.cliente.trim() ||
      !formData.pacote.trim() ||
      !formData.data_reserva.trim() ||
      !formData.valor.trim()
    ) {
      setFeedback({
        tipo: 'erro',
        mensagem:
          'Preencha os campos obrigatórios: cliente, passeio, data do passeio e valor total.',
      });

      return;
    }

    const valorTratado =
      converterValorMonetario(
        formData.valor
      );

    if (
      !Number.isFinite(
        valorTratado
      ) ||
      valorTratado < 0
    ) {
      setFeedback({
        tipo: 'erro',
        mensagem:
          'Informe um valor válido para a reserva.',
      });

      return;
    }

    setSalvando(true);

    try {
      /*
        Enquanto o banco possuir
        valor e valor_total,
        os dois permanecem
        sincronizados.
      */

      const payload = {
        cliente:
          formData.cliente.trim(),

        pacote:
          formData.pacote.trim(),

        data_reserva:
          formData.data_reserva,

        agencia:
          formData.agencia.trim() ||
          null,

        guia:
          formData.guia.trim() ||
          null,

        valor:
          valorTratado,

        valor_total:
          valorTratado,

        status:
          formData.status,

        observacoes:
          formData.observacoes.trim() ||
          null,
      };

      const { error } =
        await supabase
          .from('reservas')
          .insert([payload]);

      if (error) {
        throw error;
      }

      setFeedback({
        tipo: 'sucesso',
        mensagem:
          'Reserva cadastrada com sucesso.',
      });

      setTimeout(() => {
        router.push(
          '/reservas'
        );

        router.refresh();
      }, 1200);
    } catch (error) {
      console.error(
        'Erro ao cadastrar reserva:',
        error
      );

      setFeedback({
        tipo: 'erro',
        mensagem:
          error instanceof Error
            ? `Erro ao salvar reserva: ${error.message}`
            : 'Erro ao salvar reserva.',
      });

      setSalvando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      {/* CABEÇALHO */}

      <section className="border-b border-white/[0.07] bg-[#091510]">
        <div className="mx-auto max-w-[1180px] px-5 py-10 md:px-8 md:py-12">
          <Link
            href="/reservas"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#EDEDE3]/38 transition hover:text-[#E3A144]"
          >
            <span>←</span>
            Reservas
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
                Nova reserva
              </h1>

              <p className="mt-4 max-w-[650px] text-sm leading-7 text-[#EDEDE3]/40">
                Registre o atendimento,
                passeio, período, valor
                e responsáveis pela
                operação.
              </p>
            </div>

            <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[9px] uppercase tracking-[0.15em] text-[#EDEDE3]/28">
              ERN Gestão
            </span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 md:py-10">
        {feedback && (
          <div
            className={`mb-6 rounded-2xl border px-5 py-4 text-xs ${
              feedback.tipo ===
              'sucesso'
                ? 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300'
                : 'border-red-500/20 bg-red-500/[0.07] text-red-300'
            }`}
          >
            {feedback.mensagem}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"
        >
          {/* DADOS PRINCIPAIS */}

          <section className="rounded-[26px] border border-white/[0.075] bg-[#0A1713] p-5 md:p-7">
            <div className="border-b border-white/[0.065] pb-5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                Dados principais
              </p>

              <h2
                className="mt-2 text-2xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Atendimento e passeio
              </h2>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label
                  className={
                    labelClass
                  }
                >
                  Cliente *
                </label>

                <input
                  type="text"
                  name="cliente"
                  required
                  value={
                    formData.cliente
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Nome do cliente"
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
                  Pacote / Passeio *
                </label>

                <input
                  type="text"
                  name="pacote"
                  required
                  value={
                    formData.pacote
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Ex.: Expedição de pesca"
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
                    Data do passeio *
                  </label>

                  <input
                    type="date"
                    name="data_reserva"
                    required
                    value={
                      formData.data_reserva
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
                    Valor total (R$) *
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
                    onBlur={
                      formatarValorAoSair
                    }
                    placeholder="Ex.: 3.500,00"
                    className={
                      inputClass
                    }
                  />

                  <p className="mt-2 text-[9px] leading-4 text-[#EDEDE3]/24">
                    Exemplos aceitos:
                    3500, 3.500,
                    3,500 ou
                    3.500,00.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* OPERAÇÃO */}

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
              Responsáveis e status
            </h2>

            <div className="mt-6 space-y-5">
              <div>
                <label
                  className={
                    labelClass
                  }
                >
                  Agência / Parceiro
                </label>

                <input
                  type="text"
                  name="agencia"
                  value={
                    formData.agencia
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Particular ou nome da agência"
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
                  Guia responsável
                </label>

                <input
                  type="text"
                  name="guia"
                  value={
                    formData.guia
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Nome do guia"
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
                  <option value="Pendente">
                    Pendente
                  </option>

                  <option value="Confirmada">
                    Confirmada
                  </option>

                  <option value="Cancelada">
                    Cancelada
                  </option>
                </select>
              </div>
            </div>
          </section>

          {/* OBSERVAÇÕES */}

          <section className="rounded-[26px] border border-white/[0.075] bg-[#0A1713] p-5 md:p-6 lg:col-span-2">
            <label
              className={
                labelClass
              }
            >
              Observações
            </label>

            <textarea
              name="observacoes"
              rows={5}
              value={
                formData.observacoes
              }
              onChange={
                handleChange
              }
              placeholder="Informações de logística, preferências do cliente, horários, restrições ou detalhes importantes da operação..."
              className={`${inputClass} resize-none leading-6`}
            />
          </section>

          {/* AÇÕES */}

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
                  href="/reservas"
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
                    : 'Salvar reserva'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
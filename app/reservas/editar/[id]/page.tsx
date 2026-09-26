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

type StatusReserva =
  | 'Pendente'
  | 'Confirmada'
  | 'Cancelada';

interface ReservaForm {
  cliente: string;
  pacote: string;
  dataReserva: string;
  agencia: string;
  guia: string;
  valor: string;
  status: StatusReserva;
  observacoes: string;
}

interface ReservaBanco {
  cliente?: string | null;
  nome_cliente?: string | null;

  pacote?: string | null;
  passeio?: string | null;

  data_reserva?: string | null;
  data?: string | null;

  agencia?: string | null;
  parceiro?: string | null;

  guia?: string | null;

  valor?: number | string | null;
  valor_total?: number | string | null;

  status?: string | null;
  Status?: string | null;

  observacoes?: string | null;
}

function normalizarStatus(
  status?: string | null
): StatusReserva {
  const valor = (
    status || ''
  )
    .trim()
    .toLowerCase();

  if (
    valor.includes(
      'confirmad'
    )
  ) {
    return 'Confirmada';
  }

  if (
    valor.includes(
      'cancelad'
    )
  ) {
    return 'Cancelada';
  }

  return 'Pendente';
}

/*
  ============================================================
  CONVERSÃO MONETÁRIA
  ============================================================
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
    3.500,50
    3,500.50
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
    3,500 -> 3500
    3,50  -> 3.50
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
    3.500 -> 3500
    3.50  -> 3.50
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

function valorBancoParaCampo(
  valor: unknown
): string {
  const numero =
    Number(valor);

  if (
    !Number.isFinite(numero)
  ) {
    return '';
  }

  return formatarValorCampo(
    numero
  );
}

export default function EditarReservaPage() {
  const router = useRouter();

  const params =
    useParams();

  const id =
    params?.id;

  const [
    loading,
    setLoading,
  ] = useState(true);

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

  const [
    form,
    setForm,
  ] =
    useState<ReservaForm>({
      cliente: '',
      pacote: '',
      dataReserva: '',
      agencia: '',
      guia: '',
      valor: '',
      status: 'Pendente',
      observacoes: '',
    });

  const inputClass =
    'w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm text-[#EDEDE3] outline-none transition placeholder:text-[#EDEDE3]/20 focus:border-[#E3A144]/40';

  const labelClass =
    'mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/34';

  /*
    ============================================================
    CARREGAR RESERVA
    ============================================================
  */

  useEffect(() => {
    if (!id) {
      return;
    }

    async function carregar() {
      setLoading(true);

      try {
        const {
          data,
          error,
        } = await supabase
          .from('reservas')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          throw error;
        }

        const reserva =
          data as ReservaBanco;

        const valorBruto =
          reserva.valor_total !==
            undefined &&
          reserva.valor_total !==
            null
            ? reserva.valor_total
            : reserva.valor;

        const dataBruta =
          reserva.data_reserva ||
          reserva.data ||
          '';

        setForm({
          cliente:
            reserva.cliente ||
            reserva.nome_cliente ||
            '',

          pacote:
            reserva.pacote ||
            reserva.passeio ||
            '',

          dataReserva:
            dataBruta
              ? dataBruta.split(
                  'T'
                )[0]
              : '',

          agencia:
            reserva.agencia ||
            reserva.parceiro ||
            '',

          guia:
            reserva.guia ||
            '',

          valor:
            valorBancoParaCampo(
              valorBruto
            ),

          status:
            normalizarStatus(
              reserva.status ||
                reserva.Status
            ),

          observacoes:
            reserva.observacoes ||
            '',
        });
      } catch (error) {
        console.error(
          'Erro ao carregar reserva:',
          error
        );

        setFeedback({
          tipo: 'erro',
          mensagem:
            'Não foi possível carregar os dados da reserva.',
        });
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, [id]);

  /*
    ============================================================
    ALTERAÇÃO DE CAMPOS
    ============================================================
  */

  function alterarCampo(
    campo: keyof ReservaForm,
    valor: string
  ) {
    setForm(
      (atual) => ({
        ...atual,
        [campo]: valor,
      })
    );
  }

  function formatarValorAoSair() {
    if (
      !form.valor.trim()
    ) {
      return;
    }

    const numero =
      converterValorMonetario(
        form.valor
      );

    if (
      !Number.isFinite(numero)
    ) {
      return;
    }

    alterarCampo(
      'valor',
      formatarValorCampo(
        numero
      )
    );
  }

  /*
    ============================================================
    ATUALIZAÇÃO
    ============================================================
  */

  async function handleAtualizar(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!id) {
      return;
    }

    setFeedback(null);

    if (
      !form.cliente.trim() ||
      !form.pacote.trim() ||
      !form.dataReserva ||
      !form.valor.trim()
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
        form.valor
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
        Mantemos valor e
        valor_total sincronizados.
      */

      const payload = {
        cliente:
          form.cliente.trim(),

        pacote:
          form.pacote.trim(),

        data_reserva:
          form.dataReserva,

        agencia:
          form.agencia.trim() ||
          null,

        guia:
          form.guia.trim() ||
          null,

        valor:
          valorTratado,

        valor_total:
          valorTratado,

        status:
          form.status,

        observacoes:
          form.observacoes.trim() ||
          null,
      };

      const { error } =
        await supabase
          .from('reservas')
          .update(payload)
          .eq('id', id);

      if (error) {
        throw error;
      }

      setFeedback({
        tipo: 'sucesso',
        mensagem:
          'Reserva atualizada com sucesso.',
      });

      setTimeout(() => {
        router.push(
          '/reservas'
        );

        router.refresh();
      }, 1200);
    } catch (error) {
      console.error(
        'Erro ao atualizar reserva:',
        error
      );

      setFeedback({
        tipo: 'erro',
        mensagem:
          error instanceof Error
            ? `Erro ao atualizar reserva: ${error.message}`
            : 'Erro ao atualizar reserva.',
      });
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-82px)] items-center justify-center bg-[#07110E] text-[#EDEDE3]">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-white/[0.08] border-t-[#E3A144]" />

          <p className="mt-4 text-xs text-[#EDEDE3]/35">
            Carregando reserva...
          </p>
        </div>
      </div>
    );
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
              Editar reserva
            </h1>

            <p className="mt-4 max-w-[650px] text-sm leading-7 text-[#EDEDE3]/40">
              Atualize os dados
              comerciais e
              operacionais da reserva
              mantendo valores e
              status consistentes.
            </p>
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
          onSubmit={
            handleAtualizar
          }
          className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"
        >
          {/* DADOS */}

          <section className="rounded-[26px] border border-white/[0.075] bg-[#0A1713] p-5 md:p-7">
            <div className="border-b border-white/[0.065] pb-5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                Dados da reserva
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
                  required
                  value={
                    form.cliente
                  }
                  onChange={(
                    event
                  ) =>
                    alterarCampo(
                      'cliente',
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
                  className={
                    labelClass
                  }
                >
                  Pacote / Passeio *
                </label>

                <input
                  type="text"
                  required
                  value={
                    form.pacote
                  }
                  onChange={(
                    event
                  ) =>
                    alterarCampo(
                      'pacote',
                      event.target
                        .value
                    )
                  }
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
                    required
                    value={
                      form.dataReserva
                    }
                    onChange={(
                      event
                    ) =>
                      alterarCampo(
                        'dataReserva',
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
                    className={
                      labelClass
                    }
                  >
                    Valor total (R$) *
                  </label>

                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={
                      form.valor
                    }
                    onChange={(
                      event
                    ) =>
                      alterarCampo(
                        'valor',
                        event.target
                          .value
                      )
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
                  value={
                    form.agencia
                  }
                  onChange={(
                    event
                  ) =>
                    alterarCampo(
                      'agencia',
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
                  className={
                    labelClass
                  }
                >
                  Guia responsável
                </label>

                <input
                  type="text"
                  value={
                    form.guia
                  }
                  onChange={(
                    event
                  ) =>
                    alterarCampo(
                      'guia',
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
                  className={
                    labelClass
                  }
                >
                  Status
                </label>

                <select
                  value={
                    form.status
                  }
                  onChange={(
                    event
                  ) =>
                    alterarCampo(
                      'status',
                      event.target
                        .value as StatusReserva
                    )
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
              rows={5}
              value={
                form.observacoes
              }
              onChange={(
                event
              ) =>
                alterarCampo(
                  'observacoes',
                  event.target
                    .value
                )
              }
              placeholder="Informações adicionais sobre atendimento e operação..."
              className={`${inputClass} resize-none leading-6`}
            />
          </section>

          {/* AÇÕES */}

          <div className="lg:col-span-2">
            <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-6 sm:flex-row sm:justify-end">
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
                  : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
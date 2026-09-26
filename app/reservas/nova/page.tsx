'use client';

import React, {
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

type Feedback = {
  tipo: 'sucesso' | 'erro';
  mensagem: string;
};

type UsoReservas = {
  plano_codigo: string;
  plano_nome: string;
  total_reservas_mes: number;
  limite_reservas_mes: number | null;
  ilimitado: boolean;
  percentual_uso: number | null;
  inicio_periodo: string;
  fim_periodo: string;
};

type FormReserva = {
  cliente: string;
  pacote: string;
  data_reserva: string;
  agencia: string;
  guia: string;
  valor: string;
  status: string;
  observacoes: string;
};

function converterValor(valor: string) {
  let texto = valor.trim();

  if (!texto) {
    return 0;
  }

  texto = texto.replace(/[^\d,.-]/g, '');

  if (
    texto.includes('.') &&
    texto.includes(',')
  ) {
    texto = texto
      .replace(/\./g, '')
      .replace(',', '.');
  } else if (texto.includes(',')) {
    texto = texto.replace(',', '.');
  } else {
    const partes =
      texto.split('.');

    if (
      partes.length > 2 ||
      (
        partes.length === 2 &&
        partes[1].length === 3
      )
    ) {
      texto = texto.replace(/\./g, '');
    }
  }

  const numero =
    Number.parseFloat(texto);

  return Number.isFinite(numero)
    ? numero
    : 0;
}

function formatarData(
  data: string | null | undefined
) {
  if (!data) {
    return '—';
  }

  const partes =
    data.split('-');

  if (partes.length !== 3) {
    return data;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

export default function NovaReservaPage() {
  const router = useRouter();

  const estadoInicial: FormReserva = {
    cliente: '',
    pacote: '',
    data_reserva: '',
    agencia: '',
    guia: '',
    valor: '',
    status: 'Pendente',
    observacoes: '',
  };

  const [formData, setFormData] =
    useState<FormReserva>(
      estadoInicial
    );

  const [loading, setLoading] =
    useState(false);

  const [
    carregandoUso,
    setCarregandoUso,
  ] = useState(true);

  const [uso, setUso] =
    useState<UsoReservas | null>(
      null
    );

  const [feedback, setFeedback] =
    useState<Feedback | null>(
      null
    );

  /*
    ============================================================
    USO MENSAL DO PLANO
    ============================================================
  */

  useEffect(() => {
    carregarUsoReservas();
  }, []);

  async function carregarUsoReservas() {
    setCarregandoUso(true);

    try {
      const { data, error } =
        await supabase.rpc(
          'get_meu_uso_reservas_mes'
        );

      if (error) {
        throw error;
      }

      const resultado =
        Array.isArray(data)
          ? data[0]
          : data;

      if (!resultado) {
        setUso(null);

        return;
      }

      setUso({
        plano_codigo:
          resultado.plano_codigo,

        plano_nome:
          resultado.plano_nome,

        total_reservas_mes:
          Number(
            resultado.total_reservas_mes ||
              0
          ),

        limite_reservas_mes:
          resultado.limite_reservas_mes ===
          null
            ? null
            : Number(
                resultado.limite_reservas_mes
              ),

        ilimitado: Boolean(
          resultado.ilimitado
        ),

        percentual_uso:
          resultado.percentual_uso ===
          null
            ? null
            : Number(
                resultado.percentual_uso
              ),

        inicio_periodo:
          resultado.inicio_periodo,

        fim_periodo:
          resultado.fim_periodo,
      });
    } catch (error) {
      console.error(
        'Erro ao consultar uso mensal de reservas:',
        error
      );

      setFeedback({
        tipo: 'erro',
        mensagem:
          'Não foi possível consultar o limite mensal da assinatura.',
      });
    } finally {
      setCarregandoUso(false);
    }
  }

  /*
    ============================================================
    LIMITE
    ============================================================
  */

  const limiteAtingido =
    !!uso &&
    !uso.ilimitado &&
    uso.limite_reservas_mes !==
      null &&
    uso.total_reservas_mes >=
      uso.limite_reservas_mes;

  const percentualVisual =
    uso?.percentual_uso === null ||
    uso?.percentual_uso ===
      undefined
      ? 0
      : Math.min(
          100,
          Math.max(
            0,
            uso.percentual_uso
          )
        );

  /*
    ============================================================
    FORMULÁRIO
    ============================================================
  */

  const handleChange = (
    e: React.ChangeEvent<
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
    >
  ) => {
    const { name, value } =
      e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLimpar = () => {
    setFormData(estadoInicial);
    setFeedback(null);
  };

  /*
    ============================================================
    SALVAR
    ============================================================
  */

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setFeedback(null);

    if (limiteAtingido) {
      setFeedback({
        tipo: 'erro',
        mensagem:
          'O limite mensal de reservas do seu plano foi atingido.',
      });

      return;
    }

    if (
      !formData.cliente.trim() ||
      !formData.pacote.trim() ||
      !formData.data_reserva.trim() ||
      !formData.valor.trim()
    ) {
      setFeedback({
        tipo: 'erro',
        mensagem:
          'Preencha todos os campos obrigatórios: Cliente, Pacote/Passeio, Data do Passeio e Valor Total.',
      });

      return;
    }

    const valorTratado =
      converterValor(
        formData.valor
      );

    if (valorTratado < 0) {
      setFeedback({
        tipo: 'erro',
        mensagem:
          'Informe um valor válido para a reserva.',
      });

      return;
    }

    setLoading(true);

    try {
      const { error } =
        await supabase
          .from('reservas')
          .insert([
            {
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
            },
          ]);

      if (error) {
        throw error;
      }

      await carregarUsoReservas();

      setFeedback({
        tipo: 'sucesso',
        mensagem:
          'Reserva cadastrada com sucesso. Redirecionando...',
      });

      setTimeout(() => {
        router.push('/reservas');
        router.refresh();
      }, 1200);
    } catch (err: any) {
      console.error(
        'Erro ao cadastrar reserva:',
        err
      );

      const mensagem =
        String(
          err?.message || ''
        );

      if (
        mensagem.includes(
          'ERN_LIMITE_RESERVAS_MES_ATINGIDO'
        )
      ) {
        setFeedback({
          tipo: 'erro',
          mensagem:
            'O limite mensal de reservas do seu plano foi atingido. Para continuar cadastrando reservas neste mês, será necessário ampliar o plano.',
        });

        await carregarUsoReservas();

        return;
      }

      if (
        mensagem.includes(
          'ERN_ASSINATURA_NAO_ENCONTRADA'
        )
      ) {
        setFeedback({
          tipo: 'erro',
          mensagem:
            'Não foi encontrada uma assinatura ativa para esta empresa.',
        });

        return;
      }

      if (
        mensagem.includes(
          'ERN_USUARIO_SEM_EMPRESA'
        )
      ) {
        setFeedback({
          tipo: 'erro',
          mensagem:
            'Seu usuário não possui uma empresa vinculada.',
        });

        return;
      }

      setFeedback({
        tipo: 'erro',
        mensagem:
          err?.message ||
          'Não foi possível salvar a reserva.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07110E] pb-16 text-[#EDEDE3]">
      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <section className="border-b border-white/[0.07] bg-[#091510] px-5 py-10 md:px-8 md:py-12">
        <div className="mx-auto max-w-[1180px]">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-[#E3A144]" />

                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                  Reservas
                </span>
              </div>

              <h1
                className="mt-4 text-3xl text-[#F0F0E8] md:text-4xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Nova reserva
              </h1>

              <p className="mt-3 max-w-[620px] text-sm leading-6 text-[#EDEDE3]/42">
                Registre uma nova operação,
                experiência ou atendimento
                turístico.
              </p>
            </div>

            <Link
              href="/reservas"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.025] px-5 text-sm font-semibold text-[#EDEDE3]/65 transition hover:bg-white/[0.05]"
            >
              ← Voltar para reservas
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 md:py-10">
        {/* ===================================================
            USO DO PLANO
        ==================================================== */}

        <section className="mb-6 rounded-[22px] border border-white/[0.075] bg-[#0A1713] p-5 md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  Uso mensal do plano
                </p>

                {!carregandoUso &&
                  uso && (
                    <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#EDEDE3]/38">
                      {uso.plano_nome}
                    </span>
                  )}
              </div>

              <h2
                className="mt-3 text-2xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {carregandoUso
                  ? 'Consultando limite...'
                  : uso?.ilimitado
                    ? `${uso.total_reservas_mes} reservas neste mês`
                    : `${uso?.total_reservas_mes ?? 0} de ${uso?.limite_reservas_mes ?? 0} reservas`}
              </h2>

              <p className="mt-2 text-xs leading-5 text-[#EDEDE3]/32">
                {uso
                  ? `Período: ${formatarData(
                      uso.inicio_periodo
                    )} — ${formatarData(
                      uso.fim_periodo
                    )}`
                  : 'A franquia é reiniciada automaticamente a cada mês.'}
              </p>
            </div>

            {!carregandoUso &&
              uso &&
              !uso.ilimitado && (
                <div className="w-full max-w-[300px]">
                  <div className="flex items-center justify-between text-[10px] text-[#EDEDE3]/35">
                    <span>
                      {
                        uso.total_reservas_mes
                      }
                    </span>

                    <span>
                      {
                        uso.limite_reservas_mes
                      }
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.055]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        limiteAtingido
                          ? 'bg-red-400'
                          : percentualVisual >=
                              80
                            ? 'bg-[#E3A144]'
                            : 'bg-emerald-400'
                      }`}
                      style={{
                        width: `${percentualVisual}%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-right text-[10px] text-[#EDEDE3]/25">
                    {percentualVisual.toFixed(
                      1
                    )}
                    % utilizado
                  </p>
                </div>
              )}
          </div>
        </section>

        {/* ===================================================
            LIMITE ATINGIDO
        ==================================================== */}

        {limiteAtingido && (
          <div className="mb-6 rounded-[20px] border border-[#E3A144]/20 bg-[#E3A144]/[0.055] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#F4C77E]">
              Limite mensal atingido
            </p>

            <h2
              className="mt-2 text-xl text-[#F0F0E8]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Novas reservas estão bloqueadas
              neste período.
            </h2>

            <p className="mt-2 text-xs leading-6 text-[#EDEDE3]/40">
              As reservas existentes continuam
              disponíveis normalmente. A
              franquia será renovada no próximo
              mês ou poderá ser ampliada com
              outro plano.
            </p>
          </div>
        )}

        {/* ===================================================
            FEEDBACK
        ==================================================== */}

        {feedback && (
          <div
            className={`mb-6 rounded-[18px] border px-5 py-4 text-sm ${
              feedback.tipo === 'sucesso'
                ? 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200'
                : 'border-red-400/20 bg-red-400/[0.07] text-red-200'
            }`}
          >
            {feedback.mensagem}
          </div>
        )}

        {/* ===================================================
            FORMULÁRIO
        ==================================================== */}

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-[26px] border border-white/[0.075] bg-[#0A1713]"
        >
          <div className="border-b border-white/[0.06] px-5 py-5 md:px-6">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
              Operação
            </p>

            <h2
              className="mt-2 text-2xl text-[#F0F0E8]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Dados da reserva
            </h2>
          </div>

          <div className="grid gap-6 p-5 md:grid-cols-2 md:p-6">
            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                Cliente *
              </label>

              <input
                type="text"
                name="cliente"
                required
                value={formData.cliente}
                onChange={handleChange}
                disabled={
                  loading ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition focus:border-[#E3A144]/45 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                Pacote / Passeio *
              </label>

              <input
                type="text"
                name="pacote"
                required
                value={formData.pacote}
                onChange={handleChange}
                disabled={
                  loading ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition focus:border-[#E3A144]/45 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                Data do passeio *
              </label>

              <input
                type="date"
                name="data_reserva"
                required
                value={
                  formData.data_reserva
                }
                onChange={handleChange}
                disabled={
                  loading ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition focus:border-[#E3A144]/45 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                Valor total (R$) *
              </label>

              <input
                type="text"
                inputMode="decimal"
                name="valor"
                required
                placeholder="Ex.: 3500 ou 3.500,00"
                value={formData.valor}
                onChange={handleChange}
                disabled={
                  loading ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                Agência / Parceiro
              </label>

              <input
                type="text"
                name="agencia"
                value={
                  formData.agencia
                }
                onChange={handleChange}
                disabled={
                  loading ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition focus:border-[#E3A144]/45 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                Guia responsável
              </label>

              <input
                type="text"
                name="guia"
                value={formData.guia}
                onChange={handleChange}
                disabled={
                  loading ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition focus:border-[#E3A144]/45 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                Status da reserva
              </label>

              <select
                name="status"
                value={
                  formData.status
                }
                onChange={handleChange}
                disabled={
                  loading ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition focus:border-[#E3A144]/45 disabled:cursor-not-allowed disabled:opacity-45"
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

            <div className="md:col-span-2">
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                Observações
              </label>

              <textarea
                name="observacoes"
                rows={4}
                value={
                  formData.observacoes
                }
                onChange={handleChange}
                disabled={
                  loading ||
                  limiteAtingido
                }
                placeholder="Informações logísticas, solicitações ou observações da operação..."
                className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm leading-6 text-[#F0F0E8] outline-none transition placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-white/[0.06] px-5 py-5 sm:flex-row sm:justify-end md:px-6">
            <button
              type="button"
              onClick={() =>
                router.push('/reservas')
              }
              disabled={loading}
              className="min-h-[46px] rounded-xl border border-white/[0.09] bg-white/[0.02] px-5 text-sm font-semibold text-[#EDEDE3]/55 transition hover:bg-white/[0.045] disabled:opacity-40"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleLimpar}
              disabled={
                loading ||
                limiteAtingido
              }
              className="min-h-[46px] rounded-xl border border-white/[0.09] bg-white/[0.02] px-5 text-sm font-semibold text-[#EDEDE3]/55 transition hover:bg-white/[0.045] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Limpar
            </button>

            <button
              type="submit"
              disabled={
                loading ||
                carregandoUso ||
                limiteAtingido
              }
              className="min-h-[46px] rounded-xl bg-[#E3A144] px-6 text-sm font-bold text-[#07130F] transition hover:bg-[#F0B35C] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {loading
                ? 'Salvando...'
                : limiteAtingido
                  ? 'Limite mensal atingido'
                  : 'Salvar reserva'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
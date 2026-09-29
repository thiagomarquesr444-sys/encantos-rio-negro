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

const ESTADO_INICIAL: FormReserva = {
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
  VALOR MONETÁRIO
  ============================================================

  Exemplos:

  3500        -> 3500
  3500,00     -> 3500
  3.500       -> 3500
  3.500,00    -> 3500
  3500.00     -> 3500

  Entrada inválida retorna null.
*/
function converterValor(
  valor: string
): number | null {
  let texto = valor
    .trim()
    .replace(/[^\d,.-]/g, '');

  if (!texto) {
    return null;
  }

  if (
    texto.includes('.') &&
    texto.includes(',')
  ) {
    texto = texto
      .replace(/\./g, '')
      .replace(',', '.');
  } else if (
    texto.includes(',')
  ) {
    texto = texto.replace(
      ',',
      '.'
    );
  } else if (
    texto.includes('.')
  ) {
    const partes =
      texto.split('.');

    /*
      3.500 -> separador de milhar
      12.500 -> separador de milhar

      3500.00 -> decimal
      149.90 -> decimal
    */
    if (
      partes.length > 2 ||
      (
        partes.length === 2 &&
        partes[1].length === 3
      )
    ) {
      texto = texto.replace(
        /\./g,
        ''
      );
    }
  }

  const numero =
    Number.parseFloat(
      texto
    );

  if (
    !Number.isFinite(
      numero
    )
  ) {
    return null;
  }

  return numero;
}

function formatarData(
  data: string | null | undefined
) {
  if (!data) {
    return '—';
  }

  const partes =
    data.split('-');

  if (
    partes.length !== 3
  ) {
    return data;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function dataISOValida(
  data: string
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      data
    )
  ) {
    return false;
  }

  const [
    ano,
    mes,
    dia,
  ] = data
    .split('-')
    .map(Number);

  const verificacao =
    new Date(
      Date.UTC(
        ano,
        mes - 1,
        dia
      )
    );

  return (
    verificacao.getUTCFullYear() ===
      ano &&
    verificacao.getUTCMonth() ===
      mes - 1 &&
    verificacao.getUTCDate() ===
      dia
  );
}

export default function NovaReservaPage() {
  const router = useRouter();

  const [
    formData,
    setFormData,
  ] =
    useState<FormReserva>(
      ESTADO_INICIAL
    );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    carregandoUso,
    setCarregandoUso,
  ] = useState(true);

  const [
    uso,
    setUso,
  ] =
    useState<UsoReservas | null>(
      null
    );

  const [
    erroUso,
    setErroUso,
  ] =
    useState<string | null>(
      null
    );

  const [
    feedback,
    setFeedback,
  ] =
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
    setErroUso(null);

    try {
      const {
        data,
        error,
      } =
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

        setErroUso(
          'Não foi possível identificar o uso mensal de reservas desta assinatura.'
        );

        return;
      }

      setUso({
        plano_codigo:
          resultado.plano_codigo,

        plano_nome:
          resultado.plano_nome,

        total_reservas_mes:
          Number(
            resultado.total_reservas_mes ??
              0
          ),

        limite_reservas_mes:
          resultado.limite_reservas_mes ===
          null
            ? null
            : Number(
                resultado.limite_reservas_mes
              ),

        ilimitado:
          Boolean(
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

      setUso(null);

      setErroUso(
        'Não foi possível consultar o limite mensal de reservas neste momento.'
      );
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
    Boolean(uso) &&
    !uso?.ilimitado &&
    uso?.limite_reservas_mes !==
      null &&
    uso?.limite_reservas_mes !==
      undefined &&
    uso.total_reservas_mes >=
      uso.limite_reservas_mes;

  const percentualVisual =
    uso?.percentual_uso ===
      null ||
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

  const restantes =
    uso &&
    !uso.ilimitado &&
    uso.limite_reservas_mes !==
      null
      ? Math.max(
          uso.limite_reservas_mes -
            uso.total_reservas_mes,
          0
        )
      : null;

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
    const {
      name,
      value,
    } = e.target;

    setFormData(
      (prev) => ({
        ...prev,
        [name]:
          value,
      })
    );
  };

  const handleLimpar =
    () => {
      setFormData(
        ESTADO_INICIAL
      );

      setFeedback(null);
    };

  const handleCancelar =
    () => {
      router.push(
        '/reservas'
      );
    };

  /*
    ============================================================
    SALVAR
    ============================================================
  */

  const handleSubmit =
    async (
      e: React.FormEvent
    ) => {
      e.preventDefault();

      setFeedback(null);

      /*
        --------------------------------------------------------
        LIMITE VISUAL
        --------------------------------------------------------
      */

      if (
        limiteAtingido
      ) {
        setFeedback({
          tipo:
            'erro',

          mensagem:
            'O limite mensal de reservas do seu plano foi atingido.',
        });

        return;
      }

      /*
        --------------------------------------------------------
        CAMPOS OBRIGATÓRIOS
        --------------------------------------------------------
      */

      if (
        !formData.cliente.trim() ||
        !formData.pacote.trim() ||
        !formData.data_reserva.trim() ||
        !formData.valor.trim()
      ) {
        setFeedback({
          tipo:
            'erro',

          mensagem:
            'Preencha todos os campos obrigatórios: Cliente, Pacote/Passeio, Data do Passeio e Valor Total.',
        });

        return;
      }

      /*
        --------------------------------------------------------
        DATA
        --------------------------------------------------------
      */

      if (
        !dataISOValida(
          formData.data_reserva
        )
      ) {
        setFeedback({
          tipo:
            'erro',

          mensagem:
            'Informe uma data válida para o passeio.',
        });

        return;
      }

      /*
        --------------------------------------------------------
        VALOR
        --------------------------------------------------------
      */

      const valorTratado =
        converterValor(
          formData.valor
        );

      if (
        valorTratado ===
          null ||
        valorTratado < 0
      ) {
        setFeedback({
          tipo:
            'erro',

          mensagem:
            'Informe um valor válido para a reserva.',
        });

        return;
      }

      setLoading(true);

      try {
        const {
          error,
        } =
          await supabase
            .from(
              'reservas'
            )
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

                /*
                  Compatibilidade atual.

                  valor e valor_total
                  recebem exatamente
                  o mesmo número.
                */
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
          tipo:
            'sucesso',

          mensagem:
            'Reserva cadastrada com sucesso. Redirecionando...',
        });

        setTimeout(
          () => {
            router.push(
              '/reservas'
            );

            router.refresh();
          },
          1200
        );
      } catch (
        err: any
      ) {
        console.error(
          'Erro ao cadastrar reserva:',
          err
        );

        const mensagem =
          String(
            err?.message ||
              ''
          );

        if (
          mensagem.includes(
            'ERN_LIMITE_RESERVAS_MES_ATINGIDO'
          )
        ) {
          setFeedback({
            tipo:
              'erro',

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
            tipo:
              'erro',

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
            tipo:
              'erro',

            mensagem:
              'Seu usuário não possui uma empresa vinculada.',
          });

          return;
        }

        setFeedback({
          tipo:
            'erro',

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

      <section className="border-b border-white/[0.07] bg-[#091510] px-5 py-9 md:px-8 md:py-11">
        <div className="mx-auto max-w-[1180px]">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-[#E3A144]" />

                <span className="text-[10px] font-semibold uppercase tracking-[0.21em] text-[#E3A144]">
                  Reservas
                </span>
              </div>

              <h1
                className="mt-4 text-3xl tracking-[-0.025em] text-[#F0F0E8] md:text-4xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Nova reserva
              </h1>

              <p className="mt-3 max-w-[650px] text-sm leading-6 text-[#EDEDE3]/42">
                Registre uma nova operação turística,
                vinculando cliente, experiência, data,
                equipe e valor da reserva.
              </p>
            </div>

            <Link
              href="/reservas"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.025] px-5 text-sm font-semibold text-[#EDEDE3]/65 transition hover:border-white/[0.15] hover:bg-white/[0.05] hover:text-[#EDEDE3]/85"
            >
              <span>←</span>
              Voltar para reservas
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 md:py-10">
        {/* =====================================================
            USO MENSAL
        ====================================================== */}

        <section className="mb-6 overflow-hidden rounded-[22px] border border-white/[0.075] bg-[#0A1713]">
          <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-px w-7 bg-[#E3A144]" />

                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#E3A144]">
                    Uso mensal do plano
                  </p>
                </div>

                {!carregandoUso &&
                  uso && (
                    <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#EDEDE3]/42">
                      {
                        uso.plano_nome
                      }
                    </span>
                  )}
              </div>

              <h2
                className="mt-3 text-2xl tracking-[-0.015em] text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {carregandoUso
                  ? 'Consultando limite...'
                  : uso?.ilimitado
                    ? `${uso.total_reservas_mes} reservas neste mês`
                    : uso
                      ? `${uso.total_reservas_mes} de ${uso.limite_reservas_mes ?? 0} reservas`
                      : 'Uso indisponível'}
              </h2>

              <p className="mt-2 text-xs leading-5 text-[#EDEDE3]/32">
                {carregandoUso
                  ? 'Carregando os dados da assinatura.'
                  : uso
                    ? `Período: ${formatarData(
                        uso.inicio_periodo
                      )} — ${formatarData(
                        uso.fim_periodo
                      )}`
                    : 'A franquia mensal continua protegida pelo servidor.'}
              </p>

              {!carregandoUso &&
                uso &&
                !uso.ilimitado &&
                !limiteAtingido && (
                  <p className="mt-1 text-[10px] text-[#EDEDE3]/24">
                    {restantes} reserva
                    {restantes ===
                    1
                      ? ''
                      : 's'}{' '}
                    restante
                    {restantes ===
                    1
                      ? ''
                      : 's'}{' '}
                    neste período.
                  </p>
                )}
            </div>

            {!carregandoUso &&
              uso &&
              !uso.ilimitado && (
                <div className="w-full max-w-[310px] rounded-[17px] border border-white/[0.06] bg-white/[0.018] p-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-[#EDEDE3]/25">
                        Consumo
                      </p>

                      <strong className="mt-1 block text-xl text-[#F0F0E8]">
                        {
                          uso.total_reservas_mes
                        }

                        <span className="text-sm font-normal text-[#EDEDE3]/28">
                          {' '}
                          /{' '}
                          {
                            uso.limite_reservas_mes
                          }
                        </span>
                      </strong>
                    </div>

                    <span
                      className={`text-xs font-bold ${
                        limiteAtingido ||
                        percentualVisual >=
                          80
                          ? 'text-[#F4C77E]'
                          : 'text-emerald-300'
                      }`}
                    >
                      {percentualVisual.toFixed(
                        1
                      )}
                      %
                    </span>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.055]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        limiteAtingido ||
                        percentualVisual >=
                          80
                          ? 'bg-[#E3A144]'
                          : 'bg-emerald-400'
                      }`}
                      style={{
                        width:
                          `${percentualVisual}%`,
                      }}
                    />
                  </div>
                </div>
              )}
          </div>

          {erroUso && (
            <div className="border-t border-white/[0.055] px-5 py-3 text-[10px] text-[#EDEDE3]/30 md:px-6">
              {erroUso}
            </div>
          )}
        </section>

        {/* =====================================================
            LIMITE ATINGIDO
        ====================================================== */}

        {limiteAtingido && (
          <section className="mb-6 overflow-hidden rounded-[20px] border border-[#E3A144]/20 bg-[#E3A144]/[0.05]">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.19em] text-[#F4C77E]">
                  Limite mensal atingido
                </p>

                <h2
                  className="mt-2 text-xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Novas reservas estão temporariamente bloqueadas.
                </h2>

                <p className="mt-2 max-w-[720px] text-xs leading-6 text-[#EDEDE3]/40">
                  As reservas existentes permanecem
                  disponíveis normalmente. A franquia é
                  renovada no próximo período mensal ou pode
                  ser ampliada com outro plano.
                </p>
              </div>

              <Link
                href="/planos"
                className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#E3A144] px-5 text-xs font-bold text-[#07130F] transition hover:bg-[#F0B35C]"
              >
                Ver planos
                <span>→</span>
              </Link>
            </div>
          </section>
        )}

        {/* =====================================================
            FEEDBACK
        ====================================================== */}

        {feedback && (
          <div
            className={`mb-6 rounded-[18px] border px-5 py-4 text-sm ${
              feedback.tipo ===
              'sucesso'
                ? 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200'
                : 'border-red-400/20 bg-red-400/[0.07] text-red-200'
            }`}
          >
            {
              feedback.mensagem
            }
          </div>
        )}

        {/* =====================================================
            FORMULÁRIO
        ====================================================== */}

        <form
          onSubmit={
            handleSubmit
          }
          className="overflow-hidden rounded-[26px] border border-white/[0.075] bg-[#0A1713]"
        >
          <div className="border-b border-white/[0.06] px-5 py-5 md:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
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

              <p className="text-[10px] text-[#EDEDE3]/25">
                * Campos obrigatórios
              </p>
            </div>
          </div>

          <div className="grid gap-6 p-5 md:grid-cols-2 md:p-6">
            {/* CLIENTE */}

            <div>
              <label
                htmlFor="cliente"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42"
              >
                Cliente *
              </label>

              <input
                id="cliente"
                type="text"
                name="cliente"
                required
                value={
                  formData.cliente
                }
                onChange={
                  handleChange
                }
                disabled={
                  loading ||
                  limiteAtingido
                }
                placeholder="Nome do cliente"
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            {/* PASSEIO */}

            <div>
              <label
                htmlFor="pacote"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42"
              >
                Pacote / Passeio *
              </label>

              <input
                id="pacote"
                type="text"
                name="pacote"
                required
                value={
                  formData.pacote
                }
                onChange={
                  handleChange
                }
                disabled={
                  loading ||
                  limiteAtingido
                }
                placeholder="Experiência ou pacote contratado"
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            {/* DATA */}

            <div>
              <label
                htmlFor="data_reserva"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42"
              >
                Data do passeio *
              </label>

              <input
                id="data_reserva"
                type="date"
                name="data_reserva"
                required
                value={
                  formData.data_reserva
                }
                onChange={
                  handleChange
                }
                disabled={
                  loading ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
              />

              <p className="mt-1.5 text-[9px] text-[#EDEDE3]/22">
                Data programada para realização da operação.
              </p>
            </div>

            {/* VALOR */}

            <div>
              <label
                htmlFor="valor"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42"
              >
                Valor total (R$) *
              </label>

              <input
                id="valor"
                type="text"
                inputMode="decimal"
                name="valor"
                required
                placeholder="Ex.: 3500 ou 3.500,00"
                value={
                  formData.valor
                }
                onChange={
                  handleChange
                }
                disabled={
                  loading ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
              />

              <p className="mt-1.5 text-[9px] text-[#EDEDE3]/22">
                Aceita formatos como 3500, 3.500, 3500,00 ou 3.500,00.
              </p>
            </div>

            {/* AGÊNCIA */}

            <div>
              <label
                htmlFor="agencia"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42"
              >
                Agência / Parceiro
              </label>

              <input
                id="agencia"
                type="text"
                name="agencia"
                value={
                  formData.agencia
                }
                onChange={
                  handleChange
                }
                disabled={
                  loading ||
                  limiteAtingido
                }
                placeholder="Opcional"
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            {/* GUIA */}

            <div>
              <label
                htmlFor="guia"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42"
              >
                Guia responsável
              </label>

              <input
                id="guia"
                type="text"
                name="guia"
                value={
                  formData.guia
                }
                onChange={
                  handleChange
                }
                disabled={
                  loading ||
                  limiteAtingido
                }
                placeholder="Opcional"
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            {/* STATUS */}

            <div className="md:col-span-2">
              <label
                htmlFor="status"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42"
              >
                Status da reserva
              </label>

              <select
                id="status"
                name="status"
                value={
                  formData.status
                }
                onChange={
                  handleChange
                }
                disabled={
                  loading ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
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

            {/* OBSERVAÇÕES */}

            <div className="md:col-span-2">
              <label
                htmlFor="observacoes"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42"
              >
                Observações
              </label>

              <textarea
                id="observacoes"
                name="observacoes"
                rows={4}
                value={
                  formData.observacoes
                }
                onChange={
                  handleChange
                }
                disabled={
                  loading ||
                  limiteAtingido
                }
                placeholder="Informações logísticas, solicitações especiais ou observações da operação..."
                className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm leading-6 text-[#F0F0E8] outline-none transition placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>
          </div>

          {/* =================================================
              AÇÕES
          ================================================== */}

          <div className="flex flex-col-reverse gap-3 border-t border-white/[0.06] bg-white/[0.008] px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-6">
            <p className="hidden max-w-[500px] text-[10px] leading-5 text-[#EDEDE3]/22 sm:block">
              A reserva será vinculada automaticamente à empresa autenticada e contabilizada na franquia mensal.
            </p>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={
                  handleCancelar
                }
                disabled={
                  loading
                }
                className="min-h-[46px] rounded-xl border border-white/[0.09] bg-white/[0.02] px-5 text-sm font-semibold text-[#EDEDE3]/55 transition hover:bg-white/[0.045] disabled:opacity-40"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={
                  handleLimpar
                }
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
                className="min-h-[46px] min-w-[160px] rounded-xl bg-[#E3A144] px-6 text-sm font-bold text-[#07130F] shadow-[0_8px_22px_rgba(227,161,68,0.12)] transition hover:bg-[#F0B35C] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {loading
                  ? 'Salvando...'
                  : limiteAtingido
                    ? 'Limite mensal atingido'
                    : carregandoUso
                      ? 'Verificando plano...'
                      : 'Salvar reserva'}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
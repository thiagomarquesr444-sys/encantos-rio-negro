'use client';

import React, {
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

type Mensagem = {
  tipo: 'sucesso' | 'erro';
  texto: string;
};

type UsoPasseios = {
  plano_codigo: string;
  plano_nome: string;
  total_passeios: number;
  limite_passeios: number | null;
  ilimitado: boolean;
  percentual_uso: number | null;
};

type PasseioForm = {
  nome: string;
  descricao: string;
  cidade: string;
  duracao: string;
  valor: string;
  vagas: string;
  categoria: string;
  foto_url: string;
  destaque: boolean;
  situacao: string;
};

const ESTADO_INICIAL: PasseioForm = {
  nome: '',
  descricao: '',
  cidade: 'Barcelos - AM',
  duracao: '',
  valor: '',
  vagas: '',
  categoria: 'Ecoturismo',
  foto_url: '',
  destaque: false,
  situacao: 'Ativo',
};

/*
  ============================================================
  VALOR MONETÁRIO
  ============================================================

  Exemplos aceitos:

  3500        -> 3500
  3500,00     -> 3500
  3.500       -> 3500
  3.500,00    -> 3500
  3500.00     -> 3500
  R$ 3.500,00 -> 3500
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
    /*
      Formato brasileiro:
      3.500,00
    */
    texto = texto
      .replace(/\./g, '')
      .replace(',', '.');
  } else if (
    texto.includes(',')
  ) {
    /*
      3500,00
    */
    texto = texto.replace(
      ',',
      '.'
    );
  } else if (
    texto.includes('.')
  ) {
    /*
      Diferencia:

      3.500  -> milhar
      12.500 -> milhar
      3500.00 -> decimal
      149.90 -> decimal
    */
    const partes =
      texto.split('.');

    if (
      partes.length > 2 ||
      (
        partes.length === 2 &&
        partes[1].length === 3
      )
    ) {
      texto =
        texto.replace(
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

export default function NovoPasseioPage() {
  const router = useRouter();

  const [
    formData,
    setFormData,
  ] =
    useState<PasseioForm>(
      ESTADO_INICIAL
    );

  const [
    salvando,
    setSalvando,
  ] = useState(false);

  const [
    carregandoUso,
    setCarregandoUso,
  ] = useState(true);

  const [
    uso,
    setUso,
  ] =
    useState<UsoPasseios | null>(
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
    mensagem,
    setMensagem,
  ] =
    useState<Mensagem | null>(
      null
    );

  /*
    ============================================================
    USO DO PLANO
    ============================================================
  */

  useEffect(() => {
    carregarUsoPasseios();
  }, []);

  async function carregarUsoPasseios() {
    setCarregandoUso(true);
    setErroUso(null);

    try {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          'get_meu_uso_passeios'
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
          'Não foi possível identificar o uso de passeios desta assinatura.'
        );

        return;
      }

      setUso({
        plano_codigo:
          resultado.plano_codigo,

        plano_nome:
          resultado.plano_nome,

        total_passeios:
          Number(
            resultado.total_passeios ??
              0
          ),

        limite_passeios:
          resultado.limite_passeios ===
          null
            ? null
            : Number(
                resultado.limite_passeios
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
      });
    } catch (error) {
      console.error(
        'Erro ao consultar uso de passeios:',
        error
      );

      setUso(null);

      setErroUso(
        'Não foi possível consultar o limite de passeios neste momento.'
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
    uso?.limite_passeios !==
      null &&
    uso?.limite_passeios !==
      undefined &&
    uso.total_passeios >=
      uso.limite_passeios;

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
    uso.limite_passeios !==
      null
      ? Math.max(
          uso.limite_passeios -
            uso.total_passeios,
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
      | HTMLTextAreaElement
      | HTMLSelectElement
    >
  ) => {
    const {
      name,
      value,
      type,
    } = e.target;

    if (
      type ===
      'checkbox'
    ) {
      const {
        checked,
      } =
        e.target as HTMLInputElement;

      setFormData(
        (prev) => ({
          ...prev,
          [name]:
            checked,
        })
      );

      return;
    }

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

      setMensagem(null);
    };

  const handleCancelar =
    () => {
      router.push(
        '/passeios'
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

      setMensagem(null);

      /*
        --------------------------------------------------------
        LIMITE VISUAL
        --------------------------------------------------------
      */

      if (
        limiteAtingido
      ) {
        setMensagem({
          tipo:
            'erro',

          texto:
            'O limite de passeios do seu plano foi atingido.',
        });

        return;
      }

      /*
        --------------------------------------------------------
        CAMPOS OBRIGATÓRIOS
        --------------------------------------------------------
      */

      if (
        !formData.nome.trim() ||
        !formData.duracao.trim() ||
        !formData.valor.trim() ||
        !formData.descricao.trim() ||
        !formData.cidade.trim()
      ) {
        setMensagem({
          tipo:
            'erro',

          texto:
            'Preencha os campos obrigatórios: Nome, Cidade, Duração, Valor e Descrição.',
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
        setMensagem({
          tipo:
            'erro',

          texto:
            'Informe um valor válido para o passeio.',
        });

        return;
      }

      /*
        --------------------------------------------------------
        VAGAS
        --------------------------------------------------------
      */

      let vagasTratadas =
        0;

      if (
        formData.vagas.trim()
      ) {
        const vagasNumero =
          Number(
            formData.vagas
          );

        if (
          !Number.isFinite(
            vagasNumero
          ) ||
          !Number.isInteger(
            vagasNumero
          ) ||
          vagasNumero < 0
        ) {
          setMensagem({
            tipo:
              'erro',

            texto:
              'Informe uma quantidade inteira e válida de vagas.',
          });

          return;
        }

        vagasTratadas =
          vagasNumero;
      }

      setSalvando(true);

      try {
        const {
          error,
        } =
          await supabase
            .from(
              'passeios'
            )
            .insert([
              {
                nome:
                  formData.nome.trim(),

                descricao:
                  formData.descricao.trim(),

                cidade:
                  formData.cidade.trim(),

                duracao:
                  formData.duracao.trim(),

                /*
                  Compatibilidade atual.

                  O banco ainda possui
                  valor e preco.

                  Enquanto essa estrutura
                  não for unificada,
                  as duas colunas recebem
                  exatamente o mesmo valor.
                */
                valor:
                  valorTratado,

                preco:
                  valorTratado,

                vagas:
                  vagasTratadas,

                categoria:
                  formData.categoria,

                foto_url:
                  formData.foto_url.trim() ||
                  null,

                destaque:
                  formData.destaque,

                situacao:
                  formData.situacao,
              },
            ]);

        if (error) {
          throw error;
        }

        await carregarUsoPasseios();

        setMensagem({
          tipo:
            'sucesso',

          texto:
            'Passeio cadastrado com sucesso. Redirecionando...',
        });

        setTimeout(
          () => {
            router.push(
              '/passeios'
            );

            router.refresh();
          },
          1200
        );
      } catch (
        err: any
      ) {
        console.error(
          'Erro ao cadastrar passeio:',
          err
        );

        const mensagemErro =
          String(
            err?.message ||
              ''
          );

        if (
          mensagemErro.includes(
            'ERN_LIMITE_PASSEIOS_ATINGIDO'
          )
        ) {
          setMensagem({
            tipo:
              'erro',

            texto:
              'O limite de passeios do seu plano foi atingido. Para cadastrar uma nova experiência, será necessário ampliar o plano.',
          });

          await carregarUsoPasseios();

          return;
        }

        if (
          mensagemErro.includes(
            'ERN_ASSINATURA_NAO_ENCONTRADA'
          )
        ) {
          setMensagem({
            tipo:
              'erro',

            texto:
              'Não foi encontrada uma assinatura ativa para esta empresa.',
          });

          return;
        }

        if (
          mensagemErro.includes(
            'ERN_USUARIO_SEM_EMPRESA'
          )
        ) {
          setMensagem({
            tipo:
              'erro',

            texto:
              'Seu usuário não possui uma empresa vinculada.',
          });

          return;
        }

        setMensagem({
          tipo:
            'erro',

          texto:
            err?.message ||
            'Não foi possível cadastrar o passeio.',
        });
      } finally {
        setSalvando(false);
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
                  Passeios
                </span>
              </div>

              <h1
                className="mt-4 text-3xl tracking-[-0.025em] text-[#F0F0E8] md:text-4xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Novo passeio
              </h1>

              <p className="mt-3 max-w-[650px] text-sm leading-6 text-[#EDEDE3]/42">
                Cadastre experiências, roteiros e
                operações que poderão compor as reservas
                e o catálogo da sua empresa.
              </p>
            </div>

            <Link
              href="/passeios"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.025] px-5 text-sm font-semibold text-[#EDEDE3]/65 transition hover:border-white/[0.15] hover:bg-white/[0.05] hover:text-[#EDEDE3]/85"
            >
              <span>←</span>
              Voltar para passeios
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 md:py-10">
        {/* =====================================================
            USO DO PLANO
        ====================================================== */}

        <section className="mb-6 overflow-hidden rounded-[22px] border border-white/[0.075] bg-[#0A1713]">
          <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-px w-7 bg-[#E3A144]" />

                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#E3A144]">
                    Uso do plano
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
                    ? `${uso.total_passeios} passeios cadastrados`
                    : uso
                      ? `${uso.total_passeios} de ${uso.limite_passeios ?? 0} passeios`
                      : 'Uso indisponível'}
              </h2>

              <p className="mt-2 text-xs leading-5 text-[#EDEDE3]/32">
                {carregandoUso
                  ? 'Carregando os dados da assinatura.'
                  : uso?.ilimitado
                    ? 'Seu plano não possui limite numérico de passeios.'
                    : limiteAtingido
                      ? 'O limite de experiências do plano atual foi atingido.'
                      : uso
                        ? `Você ainda pode cadastrar ${restantes ?? 0} passeio${restantes === 1 ? '' : 's'} neste plano.`
                        : 'O limite continua protegido pelo servidor.'}
              </p>
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
                          uso.total_passeios
                        }

                        <span className="text-sm font-normal text-[#EDEDE3]/28">
                          {' '}
                          /{' '}
                          {
                            uso.limite_passeios
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
                  Limite atingido
                </p>

                <h2
                  className="mt-2 text-xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Novos passeios estão temporariamente bloqueados.
                </h2>

                <p className="mt-2 max-w-[720px] text-xs leading-6 text-[#EDEDE3]/40">
                  Os passeios existentes permanecem
                  disponíveis normalmente. Para cadastrar
                  novas experiências, será necessário
                  reduzir o uso ou ampliar o plano da
                  empresa.
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

        {mensagem && (
          <div
            className={`mb-6 rounded-[18px] border px-5 py-4 text-sm ${
              mensagem.tipo ===
              'sucesso'
                ? 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200'
                : 'border-red-400/20 bg-red-400/[0.07] text-red-200'
            }`}
          >
            {
              mensagem.texto
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
                  Catálogo
                </p>

                <h2
                  className="mt-2 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Dados da experiência
                </h2>
              </div>

              <p className="text-[10px] text-[#EDEDE3]/25">
                * Campos obrigatórios
              </p>
            </div>
          </div>

          <div className="grid gap-6 p-5 md:grid-cols-2 md:p-6">
            {/* NOME */}

            <div>
              <label
                htmlFor="nome"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42"
              >
                Nome do passeio *
              </label>

              <input
                id="nome"
                type="text"
                name="nome"
                value={
                  formData.nome
                }
                onChange={
                  handleChange
                }
                disabled={
                  salvando ||
                  limiteAtingido
                }
                placeholder="Ex.: Expedição Rio Negro"
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            {/* CATEGORIA */}

            <div>
              <label
                htmlFor="categoria"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42"
              >
                Categoria *
              </label>

              <select
                id="categoria"
                name="categoria"
                value={
                  formData.categoria
                }
                onChange={
                  handleChange
                }
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <option value="Ecoturismo">
                  Ecoturismo
                </option>

                <option value="Passeios Fluviais">
                  Passeios Fluviais
                </option>

                <option value="Pesca Esportiva">
                  Pesca Esportiva
                </option>

                <option value="Imersão Cultural">
                  Imersão Cultural
                </option>
              </select>
            </div>

            {/* CIDADE */}

            <div>
              <label
                htmlFor="cidade"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42"
              >
                Cidade / Destino *
              </label>

              <input
                id="cidade"
                type="text"
                name="cidade"
                value={
                  formData.cidade
                }
                onChange={
                  handleChange
                }
                disabled={
                  salvando ||
                  limiteAtingido
                }
                placeholder="Ex.: Barcelos - AM"
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            {/* DURAÇÃO */}

            <div>
              <label
                htmlFor="duracao"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42"
              >
                Duração *
              </label>

              <input
                id="duracao"
                type="text"
                name="duracao"
                value={
                  formData.duracao
                }
                onChange={
                  handleChange
                }
                placeholder="Ex.: 4 horas, 1 dia, 3 dias"
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            {/* PREÇO */}

            <div>
              <label
                htmlFor="valor"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42"
              >
                Preço (R$) *
              </label>

              <input
                id="valor"
                type="text"
                inputMode="decimal"
                name="valor"
                value={
                  formData.valor
                }
                onChange={
                  handleChange
                }
                placeholder="Ex.: 3500 ou 3.500,00"
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
              />

              <p className="mt-1.5 text-[9px] leading-4 text-[#EDEDE3]/22">
                Aceita formatos como 3500, 3.500, 3500,00 ou 3.500,00.
              </p>
            </div>

            {/* VAGAS */}

            <div>
              <label
                htmlFor="vagas"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42"
              >
                Vagas
              </label>

              <input
                id="vagas"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                name="vagas"
                value={
                  formData.vagas
                }
                onChange={
                  handleChange
                }
                placeholder="0"
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            {/* SITUAÇÃO */}

            <div>
              <label
                htmlFor="situacao"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42"
              >
                Situação
              </label>

              <select
                id="situacao"
                name="situacao"
                value={
                  formData.situacao
                }
                onChange={
                  handleChange
                }
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <option value="Ativo">
                  Ativo
                </option>

                <option value="Inativo">
                  Inativo
                </option>

                <option value="Em Breve">
                  Em Breve
                </option>
              </select>
            </div>

            {/* DESTAQUE */}

            <div>
              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                Visibilidade
              </span>

              <label
                htmlFor="destaque"
                className={`flex min-h-[48px] cursor-pointer items-center justify-between rounded-xl border px-4 transition ${
                  formData.destaque
                    ? 'border-[#E3A144]/28 bg-[#E3A144]/[0.055]'
                    : 'border-white/[0.08] bg-[#07110E] hover:border-white/[0.14]'
                } ${
                  salvando ||
                  limiteAtingido
                    ? 'cursor-not-allowed opacity-45'
                    : ''
                }`}
              >
                <div>
                  <span className="block text-sm font-medium text-[#EDEDE3]/70">
                    Marcar como destaque
                  </span>

                  <span className="mt-0.5 block text-[9px] text-[#EDEDE3]/22">
                    Identifica a experiência como prioritária.
                  </span>
                </div>

                <input
                  id="destaque"
                  type="checkbox"
                  name="destaque"
                  checked={
                    formData.destaque
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    salvando ||
                    limiteAtingido
                  }
                  className="h-4 w-4 accent-[#E3A144]"
                />
              </label>
            </div>

            {/* FOTO */}

            <div className="md:col-span-2">
              <label
                htmlFor="foto_url"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42"
              >
                URL da foto
              </label>

              <input
                id="foto_url"
                type="url"
                name="foto_url"
                value={
                  formData.foto_url
                }
                onChange={
                  handleChange
                }
                placeholder="https://..."
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
              />

              <p className="mt-1.5 text-[9px] leading-4 text-[#EDEDE3]/22">
                Opcional. Use uma imagem real da experiência ou deixe o campo vazio.
              </p>
            </div>

            {/* DESCRIÇÃO */}

            <div className="md:col-span-2">
              <label
                htmlFor="descricao"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42"
              >
                Descrição *
              </label>

              <textarea
                id="descricao"
                name="descricao"
                rows={4}
                value={
                  formData.descricao
                }
                onChange={
                  handleChange
                }
                disabled={
                  salvando ||
                  limiteAtingido
                }
                placeholder="Descrição completa da experiência, operação e principais características..."
                className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm leading-6 text-[#F0F0E8] outline-none transition placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>
          </div>

          {/* =================================================
              AÇÕES
          ================================================== */}

          <div className="flex flex-col-reverse gap-3 border-t border-white/[0.06] bg-white/[0.008] px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-6">
            <p className="hidden max-w-[480px] text-[10px] leading-5 text-[#EDEDE3]/22 sm:block">
              O passeio será vinculado automaticamente à empresa autenticada.
            </p>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={
                  handleCancelar
                }
                disabled={
                  salvando
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
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[46px] rounded-xl border border-white/[0.09] bg-white/[0.02] px-5 text-sm font-semibold text-[#EDEDE3]/55 transition hover:bg-white/[0.045] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Limpar
              </button>

              <button
                type="submit"
                disabled={
                  salvando ||
                  carregandoUso ||
                  limiteAtingido
                }
                className="min-h-[46px] min-w-[170px] rounded-xl bg-[#E3A144] px-6 text-sm font-bold text-[#07130F] shadow-[0_8px_22px_rgba(227,161,68,0.12)] transition hover:bg-[#F0B35C] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {salvando
                  ? 'Salvando...'
                  : limiteAtingido
                    ? 'Limite atingido'
                    : carregandoUso
                      ? 'Verificando plano...'
                      : 'Cadastrar passeio'}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
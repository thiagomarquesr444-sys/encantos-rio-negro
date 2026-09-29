'use client';

import React, {
  useEffect,
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

type UsoClientes = {
  plano_codigo: string;
  plano_nome: string;
  total_clientes: number;
  limite_clientes: number | null;
  ilimitado: boolean;
  percentual_uso: number | null;
};

type MensagemStatus = {
  tipo: 'sucesso' | 'erro';
  texto: string;
};

const INITIAL_FORM_STATE: ClienteForm = {
  nome: '',
  documento: '',
  telefone: '',
  email: '',
  cidade: '',
  nacionalidade: '',
  observacoes: '',
  situacao: 'Ativo',
};

export default function NovoClientePage() {
  const router = useRouter();

  const [
    formData,
    setFormData,
  ] = useState<ClienteForm>(
    INITIAL_FORM_STATE
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
  ] = useState<UsoClientes | null>(
    null
  );

  const [
    erroUso,
    setErroUso,
  ] = useState<string | null>(
    null
  );

  const [
    mensagemStatus,
    setMensagemStatus,
  ] =
    useState<MensagemStatus | null>(
      null
    );

  /*
    ============================================================
    USO DO PLANO
    ============================================================
  */

  useEffect(() => {
    carregarUsoClientes();
  }, []);

  async function carregarUsoClientes() {
    setCarregandoUso(true);
    setErroUso(null);

    try {
      const { data, error } =
        await supabase.rpc(
          'get_meu_uso_clientes'
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
          'Não foi possível identificar o uso de clientes desta assinatura.'
        );

        return;
      }

      setUso({
        plano_codigo:
          resultado.plano_codigo,

        plano_nome:
          resultado.plano_nome,

        total_clientes:
          Number(
            resultado.total_clientes ??
              0
          ),

        limite_clientes:
          resultado.limite_clientes ===
          null
            ? null
            : Number(
                resultado.limite_clientes
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
        'Erro ao consultar uso do plano:',
        error
      );

      setUso(null);

      setErroUso(
        'Não foi possível consultar o limite de clientes neste momento.'
      );
    } finally {
      setCarregandoUso(false);
    }
  }

  /*
    ============================================================
    LIMITES
    ============================================================
  */

  const limiteAtingido =
    Boolean(uso) &&
    !uso?.ilimitado &&
    uso?.limite_clientes !== null &&
    uso?.limite_clientes !== undefined &&
    uso.total_clientes >=
      uso.limite_clientes;

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

  const restantes =
    uso &&
    !uso.ilimitado &&
    uso.limite_clientes !== null
      ? Math.max(
          uso.limite_clientes -
            uso.total_clientes,
          0
        )
      : null;

  /*
    ============================================================
    DOCUMENTO
    ============================================================

    Regra:
    - Somente números e até 11 dígitos:
      aplica visual de CPF.
    - Letras ou outros formatos:
      preserva como documento internacional/passaporte.
    ============================================================
  */

  function aplicarMascaraDocumento(
    valor: string
  ) {
    const entrada =
      valor
        .toUpperCase()
        .slice(0, 30);

    const possuiLetras =
      /[A-Z]/.test(entrada);

    if (possuiLetras) {
      return entrada.replace(
        /[^A-Z0-9./-]/g,
        ''
      );
    }

    const apenasNumeros =
      entrada.replace(/\D/g, '');

    if (
      apenasNumeros.length <= 11
    ) {
      return apenasNumeros
        .slice(0, 11)
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

    /*
      Documento numérico estrangeiro ou
      outro identificador maior que CPF.
    */
    return apenasNumeros.slice(
      0,
      30
    );
  }

  /*
    ============================================================
    TELEFONE
    ============================================================

    Regra:
    - + = telefone internacional.
    - Até 11 dígitos sem + = máscara brasileira.
    - Mais de 11 dígitos = preserva número internacional.
    ============================================================
  */

  function aplicarMascaraTelefone(
    valor: string
  ) {
    const possuiPrefixoInternacional =
      valor.trim().startsWith('+');

    const apenasNumeros =
      valor
        .replace(/\D/g, '')
        .slice(0, 15);

    if (
      possuiPrefixoInternacional
    ) {
      return `+${apenasNumeros}`;
    }

    if (
      apenasNumeros.length > 11
    ) {
      return apenasNumeros;
    }

    if (
      apenasNumeros.length <= 10
    ) {
      return apenasNumeros
        .replace(
          /^(\d{2})(\d)/,
          '($1) $2'
        )
        .replace(
          /(\d{4})(\d)/,
          '$1-$2'
        )
        .slice(0, 14);
    }

    return apenasNumeros
      .replace(
        /^(\d{2})(\d)/,
        '($1) $2'
      )
      .replace(
        /(\d{5})(\d)/,
        '$1-$2'
      )
      .slice(0, 15);
  }

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
    } = e.target;

    let valorFormatado =
      value;

    if (
      name === 'documento'
    ) {
      valorFormatado =
        aplicarMascaraDocumento(
          value
        );
    }

    if (
      name === 'telefone'
    ) {
      valorFormatado =
        aplicarMascaraTelefone(
          value
        );
    }

    setFormData(
      (prev) => ({
        ...prev,
        [name]:
          valorFormatado,
      })
    );
  };

  const handleLimpar =
    () => {
      setFormData(
        INITIAL_FORM_STATE
      );

      setMensagemStatus(
        null
      );
    };

  const handleCancelar =
    () => {
      router.push(
        '/clientes'
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

      setMensagemStatus(
        null
      );

      /*
        ----------------------------------------------------------
        BLOQUEIO VISUAL
        ----------------------------------------------------------
      */

      if (
        limiteAtingido
      ) {
        setMensagemStatus({
          tipo:
            'erro',

          texto:
            'O limite de clientes do seu plano foi atingido.',
        });

        return;
      }

      /*
        ----------------------------------------------------------
        VALIDAÇÃO
        ----------------------------------------------------------
      */

      if (
        !formData.nome.trim() ||
        !formData.documento.trim() ||
        !formData.email.trim() ||
        !formData.telefone.trim() ||
        !formData.cidade.trim()
      ) {
        setMensagemStatus({
          tipo:
            'erro',

          texto:
            'Preencha todos os campos obrigatórios: Nome, CPF/Documento, E-mail, Telefone e Cidade.',
        });

        return;
      }

      setSalvando(true);

      try {
        const payload = {
          nome:
            formData.nome.trim(),

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

        const {
          error,
        } =
          await supabase
            .from(
              'clientes'
            )
            .insert([
              payload,
            ]);

        if (error) {
          throw error;
        }

        await carregarUsoClientes();

        setMensagemStatus({
          tipo:
            'sucesso',

          texto:
            'Cliente cadastrado com sucesso. Redirecionando...',
        });

        setTimeout(
          () => {
            router.push(
              '/clientes'
            );

            router.refresh();
          },
          1200
        );
      } catch (
        error: any
      ) {
        console.error(
          'Erro ao cadastrar cliente:',
          error
        );

        const mensagem =
          String(
            error?.message ||
              ''
          );

        if (
          mensagem.includes(
            'ERN_LIMITE_CLIENTES_ATINGIDO'
          )
        ) {
          setMensagemStatus({
            tipo:
              'erro',

            texto:
              'O limite de clientes do seu plano foi atingido. Para continuar cadastrando clientes, será necessário ampliar seu plano.',
          });

          await carregarUsoClientes();

          return;
        }

        if (
          mensagem.includes(
            'ERN_ASSINATURA_NAO_ENCONTRADA'
          )
        ) {
          setMensagemStatus({
            tipo:
              'erro',

            texto:
              'Não foi encontrada uma assinatura ativa para esta empresa.',
          });

          return;
        }

        if (
          mensagem.includes(
            'ERN_USUARIO_SEM_EMPRESA'
          )
        ) {
          setMensagemStatus({
            tipo:
              'erro',

            texto:
              'Seu usuário não possui uma empresa vinculada.',
          });

          return;
        }

        setMensagemStatus({
          tipo:
            'erro',

          texto:
            error?.message ||
            'Não foi possível salvar o cliente.',
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
                  Clientes
                </span>
              </div>

              <h1
                className="mt-4 text-3xl tracking-[-0.025em] text-[#F0F0E8] md:text-4xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Novo cliente
              </h1>

              <p className="mt-3 max-w-[620px] text-sm leading-6 text-[#EDEDE3]/42">
                Cadastre as informações essenciais do
                viajante para utilização na operação.
              </p>
            </div>

            <Link
              href="/clientes"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.025] px-5 text-sm font-semibold text-[#EDEDE3]/65 transition hover:border-white/[0.15] hover:bg-white/[0.05] hover:text-[#EDEDE3]/85"
            >
              <span>←</span>
              Voltar para clientes
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
                    ? `${uso.total_clientes} clientes cadastrados`
                    : uso
                      ? `${uso.total_clientes} de ${uso.limite_clientes ?? 0} clientes`
                      : 'Uso indisponível'}
              </h2>

              <p className="mt-2 text-xs leading-5 text-[#EDEDE3]/32">
                {carregandoUso
                  ? 'Carregando os dados da assinatura.'
                  : uso?.ilimitado
                    ? 'Seu plano não possui limite numérico de clientes.'
                    : limiteAtingido
                      ? 'Você atingiu o limite disponível no plano atual.'
                      : uso
                        ? `Você ainda pode cadastrar ${restantes ?? 0} cliente${restantes === 1 ? '' : 's'} neste plano.`
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
                          uso.total_clientes
                        }
                        <span className="text-sm font-normal text-[#EDEDE3]/28">
                          {' '}
                          /{' '}
                          {
                            uso.limite_clientes
                          }
                        </span>
                      </strong>
                    </div>

                    <span
                      className={`text-xs font-bold ${
                        limiteAtingido
                          ? 'text-[#F4C77E]'
                          : percentualVisual >=
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
                        limiteAtingido
                          ? 'bg-[#E3A144]'
                          : percentualVisual >=
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
                  Novos clientes estão temporariamente bloqueados.
                </h2>

                <p className="mt-2 max-w-[720px] text-xs leading-6 text-[#EDEDE3]/40">
                  Os clientes existentes permanecem
                  disponíveis normalmente. Para cadastrar
                  novos registros, será necessário reduzir o
                  uso ou ampliar o plano da empresa.
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

        {mensagemStatus && (
          <div
            className={`mb-6 rounded-[18px] border px-5 py-4 text-sm ${
              mensagemStatus.tipo ===
              'sucesso'
                ? 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200'
                : 'border-red-400/20 bg-red-400/[0.07] text-red-200'
            }`}
          >
            {
              mensagemStatus.texto
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
                  Cadastro
                </p>

                <h2
                  className="mt-2 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Dados do viajante
                </h2>
              </div>

              <p className="text-[10px] text-[#EDEDE3]/25">
                * Campos obrigatórios
              </p>
            </div>
          </div>

          <div className="grid gap-6 p-5 md:grid-cols-2 md:p-6">
            {/* NOME */}

            <div className="md:col-span-2">
              <label
                htmlFor="nome"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42"
              >
                Nome completo *
              </label>

              <input
                id="nome"
                type="text"
                name="nome"
                autoComplete="name"
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
                placeholder="Nome completo do viajante"
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            {/* DOCUMENTO */}

            <div>
              <label
                htmlFor="documento"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42"
              >
                CPF / Documento *
              </label>

              <input
                id="documento"
                type="text"
                name="documento"
                value={
                  formData.documento
                }
                onChange={
                  handleChange
                }
                disabled={
                  salvando ||
                  limiteAtingido
                }
                placeholder="CPF, passaporte ou documento"
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
              />

              <p className="mt-1.5 text-[9px] leading-4 text-[#EDEDE3]/22">
                Aceita CPF e documentos internacionais alfanuméricos.
              </p>
            </div>

            {/* TELEFONE */}

            <div>
              <label
                htmlFor="telefone"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42"
              >
                Telefone / WhatsApp *
              </label>

              <input
                id="telefone"
                type="tel"
                name="telefone"
                autoComplete="tel"
                value={
                  formData.telefone
                }
                onChange={
                  handleChange
                }
                disabled={
                  salvando ||
                  limiteAtingido
                }
                placeholder="(92) 99999-9999 ou +código do país"
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            {/* EMAIL */}

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42"
              >
                E-mail *
              </label>

              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                value={
                  formData.email
                }
                onChange={
                  handleChange
                }
                disabled={
                  salvando ||
                  limiteAtingido
                }
                placeholder="cliente@exemplo.com"
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            {/* CIDADE */}

            <div>
              <label
                htmlFor="cidade"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42"
              >
                Cidade / UF *
              </label>

              <input
                id="cidade"
                type="text"
                name="cidade"
                autoComplete="address-level2"
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
                placeholder="Cidade de origem"
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            {/* NACIONALIDADE */}

            <div>
              <label
                htmlFor="nacionalidade"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42"
              >
                Nacionalidade
              </label>

              <input
                id="nacionalidade"
                type="text"
                name="nacionalidade"
                value={
                  formData.nacionalidade
                }
                onChange={
                  handleChange
                }
                disabled={
                  salvando ||
                  limiteAtingido
                }
                placeholder="Ex.: Brasileira"
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
                  salvando ||
                  limiteAtingido
                }
                placeholder="Preferências, restrições, informações de viagem ou observações relevantes..."
                className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm leading-6 text-[#F0F0E8] outline-none transition placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>
          </div>

          {/* =================================================
              AÇÕES
          ================================================== */}

          <div className="flex flex-col-reverse gap-3 border-t border-white/[0.06] bg-white/[0.008] px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-6">
            <p className="hidden text-[10px] text-[#EDEDE3]/22 sm:block">
              Os dados serão vinculados à empresa autenticada.
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
                  limiteAtingido ||
                  carregandoUso
                }
                className="min-h-[46px] min-w-[150px] rounded-xl bg-[#E3A144] px-6 text-sm font-bold text-[#07130F] shadow-[0_8px_22px_rgba(227,161,68,0.12)] transition hover:bg-[#F0B35C] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {salvando
                  ? 'Salvando...'
                  : limiteAtingido
                    ? 'Limite atingido'
                    : carregandoUso
                      ? 'Verificando plano...'
                      : 'Salvar cliente'}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
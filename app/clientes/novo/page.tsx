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

export default function NovoClientePage() {
  const router = useRouter();

  const initialFormState: ClienteForm = {
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

  const [carregandoUso, setCarregandoUso] =
    useState(true);

  const [uso, setUso] =
    useState<UsoClientes | null>(null);

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

    try {
      const { data, error } =
        await supabase.rpc(
          'get_meu_uso_clientes'
        );

      if (error) {
        throw error;
      }

      const resultado = Array.isArray(data)
        ? data[0]
        : data;

      if (resultado) {
        setUso({
          plano_codigo:
            resultado.plano_codigo,
          plano_nome:
            resultado.plano_nome,
          total_clientes: Number(
            resultado.total_clientes || 0
          ),
          limite_clientes:
            resultado.limite_clientes ===
            null
              ? null
              : Number(
                  resultado.limite_clientes
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
        });
      }
    } catch (error) {
      console.error(
        'Erro ao consultar uso do plano:',
        error
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
    !!uso &&
    !uso.ilimitado &&
    uso.limite_clientes !== null &&
    uso.total_clientes >=
      uso.limite_clientes;

  const percentualVisual =
    uso?.percentual_uso === null ||
    uso?.percentual_uso === undefined
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
    MÁSCARAS
    ============================================================
  */

  const aplicarMascaraDocumento = (
    valor: string
  ) => {
    const apenasNumeros =
      valor.replace(/\D/g, '');

    if (apenasNumeros.length <= 11) {
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
    const { name, value } =
      e.target;

    let valorFormatado = value;

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

    setFormData((prev) => ({
      ...prev,
      [name]: valorFormatado,
    }));
  };

  const handleLimpar = () => {
    setFormData(
      initialFormState
    );

    setMensagemStatus(null);
  };

  const handleCancelar = () => {
    router.push('/clientes');
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

    setMensagemStatus(null);

    /*
      ----------------------------------------------------------
      BLOQUEIO VISUAL
      ----------------------------------------------------------
    */

    if (limiteAtingido) {
      setMensagemStatus({
        tipo: 'erro',
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
        tipo: 'erro',
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

      const { error } =
        await supabase
          .from('clientes')
          .insert([payload]);

      if (error) {
        throw error;
      }

      await carregarUsoClientes();

      setMensagemStatus({
        tipo: 'sucesso',
        texto:
          'Cliente cadastrado com sucesso. Redirecionando...',
      });

      setTimeout(() => {
        router.push('/clientes');
        router.refresh();
      }, 1200);
    } catch (error: any) {
      console.error(
        'Erro ao cadastrar cliente:',
        error
      );

      const mensagem =
        String(
          error?.message || ''
        );

      if (
        mensagem.includes(
          'ERN_LIMITE_CLIENTES_ATINGIDO'
        )
      ) {
        setMensagemStatus({
          tipo: 'erro',
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
          tipo: 'erro',
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
          tipo: 'erro',
          texto:
            'Seu usuário não possui uma empresa vinculada.',
        });

        return;
      }

      setMensagemStatus({
        tipo: 'erro',
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

      <section className="border-b border-white/[0.07] bg-[#091510] px-5 py-10 md:px-8 md:py-12">
        <div className="mx-auto max-w-[1180px]">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-[#E3A144]" />

                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                  Clientes
                </span>
              </div>

              <h1
                className="mt-4 text-3xl text-[#F0F0E8] md:text-4xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Novo cliente
              </h1>

              <p className="mt-3 max-w-[620px] text-sm leading-6 text-[#EDEDE3]/42">
                Cadastre as informações
                essenciais do viajante para
                utilização na operação.
              </p>
            </div>

            <Link
              href="/clientes"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.025] px-5 text-sm font-semibold text-[#EDEDE3]/65 transition hover:bg-white/[0.05]"
            >
              ← Voltar para clientes
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
                  Uso do plano
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
                    ? `${uso.total_clientes} clientes cadastrados`
                    : `${uso?.total_clientes ?? 0} de ${uso?.limite_clientes ?? 0} clientes`}
              </h2>

              <p className="mt-2 text-xs leading-5 text-[#EDEDE3]/32">
                {uso?.ilimitado
                  ? 'Seu plano não possui limite numérico de clientes.'
                  : limiteAtingido
                    ? 'Você atingiu o limite disponível no plano atual.'
                    : 'O cadastro utiliza o limite contratado pela empresa.'}
              </p>
            </div>

            {!carregandoUso &&
              uso &&
              !uso.ilimitado && (
                <div className="w-full max-w-[300px]">
                  <div className="flex items-center justify-between text-[10px] text-[#EDEDE3]/35">
                    <span>
                      {uso.total_clientes}
                    </span>

                    <span>
                      {uso.limite_clientes}
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
              Limite atingido
            </p>

            <h2
              className="mt-2 text-xl text-[#F0F0E8]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              O plano atual não permite
              novos clientes.
            </h2>

            <p className="mt-2 text-xs leading-6 text-[#EDEDE3]/40">
              Os clientes existentes continuam
              disponíveis normalmente. Para
              cadastrar novos registros será
              necessário ampliar o limite da
              assinatura.
            </p>
          </div>
        )}

        {/* ===================================================
            FEEDBACK
        ==================================================== */}

        {mensagemStatus && (
          <div
            className={`mb-6 rounded-[18px] border px-5 py-4 text-sm ${
              mensagemStatus.tipo ===
              'sucesso'
                ? 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200'
                : 'border-red-400/20 bg-red-400/[0.07] text-red-200'
            }`}
          >
            {mensagemStatus.texto}
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

          <div className="grid gap-6 p-5 md:grid-cols-2 md:p-6">
            {/* NOME */}

            <div className="md:col-span-2">
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                Nome completo *
              </label>

              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition focus:border-[#E3A144]/45 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            {/* DOCUMENTO */}

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                CPF / Documento *
              </label>

              <input
                type="text"
                name="documento"
                value={
                  formData.documento
                }
                onChange={handleChange}
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition focus:border-[#E3A144]/45 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            {/* TELEFONE */}

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                Telefone / WhatsApp *
              </label>

              <input
                type="text"
                name="telefone"
                value={
                  formData.telefone
                }
                onChange={handleChange}
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition focus:border-[#E3A144]/45 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            {/* EMAIL */}

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                E-mail *
              </label>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition focus:border-[#E3A144]/45 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            {/* CIDADE */}

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                Cidade / UF *
              </label>

              <input
                type="text"
                name="cidade"
                value={
                  formData.cidade
                }
                onChange={handleChange}
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition focus:border-[#E3A144]/45 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            {/* NACIONALIDADE */}

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                Nacionalidade
              </label>

              <input
                type="text"
                name="nacionalidade"
                value={
                  formData.nacionalidade
                }
                onChange={handleChange}
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition focus:border-[#E3A144]/45 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            {/* SITUAÇÃO */}

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                Situação
              </label>

              <select
                name="situacao"
                value={
                  formData.situacao
                }
                onChange={handleChange}
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition focus:border-[#E3A144]/45 disabled:cursor-not-allowed disabled:opacity-45"
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
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                Observações
              </label>

              <textarea
                name="observacoes"
                rows={5}
                value={
                  formData.observacoes
                }
                onChange={handleChange}
                disabled={
                  salvando ||
                  limiteAtingido
                }
                placeholder="Preferências, restrições, informações de viagem ou observações relevantes..."
                className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm leading-6 text-[#F0F0E8] outline-none transition placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>
          </div>

          {/* =================================================
              AÇÕES
          ================================================== */}

          <div className="flex flex-col-reverse gap-3 border-t border-white/[0.06] px-5 py-5 sm:flex-row sm:justify-end md:px-6">
            <button
              type="button"
              onClick={handleCancelar}
              disabled={salvando}
              className="min-h-[46px] rounded-xl border border-white/[0.09] bg-white/[0.02] px-5 text-sm font-semibold text-[#EDEDE3]/55 transition hover:bg-white/[0.045] disabled:opacity-40"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleLimpar}
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
              className="min-h-[46px] rounded-xl bg-[#E3A144] px-6 text-sm font-bold text-[#07130F] transition hover:bg-[#F0B35C] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {salvando
                ? 'Salvando...'
                : limiteAtingido
                  ? 'Limite atingido'
                  : 'Salvar cliente'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
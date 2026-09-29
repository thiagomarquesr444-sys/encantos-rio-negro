'use client';

import React, {
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

type StatusVoucher =
  | 'Ativo'
  | 'Utilizado'
  | 'Cancelado';

interface Cliente {
  id: string;
  nome?: string | null;
  nome_completo?: string | null;
}

interface Passeio {
  id: string;
  nome?: string | null;
  titulo?: string | null;
}

interface VoucherForm {
  codigo: string;
  clienteId: string;
  passeioId: string;
  valor: string;
  status: StatusVoucher;
  validade: string;
}

const estadoInicial: VoucherForm = {
  codigo: '',
  clienteId: '',
  passeioId: '',
  valor: '',
  status: 'Ativo',
  validade: '',
};

/*
  ============================================================
  CONVERSÃO MONETÁRIA
  ============================================================

  Aceita:

  3500
  3500,00
  3.500
  3.500,00
  3500.00
  3,500.00
  R$ 3.500,00

  Nenhuma multiplicação artificial é aplicada.
*/

function converterValor(
  entrada: string
): number {
  let valor = entrada
    .trim()
    .replace(/\s/g, '')
    .replace(/R\$/gi, '')
    .replace(
      /[^0-9.,-]/g,
      ''
    );

  if (!valor) {
    return Number.NaN;
  }

  const temVirgula =
    valor.includes(',');

  const temPonto =
    valor.includes('.');

  /*
    ----------------------------------------------------------
    DUAS MARCAÇÕES
    ----------------------------------------------------------

    3.500,50 -> brasileiro
    3,500.50 -> internacional
  */

  if (
    temVirgula &&
    temPonto
  ) {
    const ultimaVirgula =
      valor.lastIndexOf(',');

    const ultimoPonto =
      valor.lastIndexOf('.');

    if (
      ultimaVirgula >
      ultimoPonto
    ) {
      valor = valor
        .replace(
          /\./g,
          ''
        )
        .replace(
          ',',
          '.'
        );
    } else {
      valor =
        valor.replace(
          /,/g,
          ''
        );
    }
  }

  /*
    ----------------------------------------------------------
    SOMENTE VÍRGULA
    ----------------------------------------------------------

    3,500 -> 3500
    3,50  -> 3.50
  */

  else if (
    temVirgula
  ) {
    if (
      /^\d{1,3}(,\d{3})+$/.test(
        valor
      )
    ) {
      valor =
        valor.replace(
          /,/g,
          ''
        );
    } else {
      valor =
        valor.replace(
          ',',
          '.'
        );
    }
  }

  /*
    ----------------------------------------------------------
    SOMENTE PONTO
    ----------------------------------------------------------

    3.500 -> 3500
    3.50  -> 3.50
  */

  else if (
    temPonto
  ) {
    if (
      /^\d{1,3}(\.\d{3})+$/.test(
        valor
      )
    ) {
      valor =
        valor.replace(
          /\./g,
          ''
        );
    }
  }

  const numero =
    Number(valor);

  return Number.isFinite(
    numero
  )
    ? numero
    : Number.NaN;
}

function formatarValorCampo(
  numero: number
) {
  return numero.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    }
  );
}

export default function NovoVoucherPage() {
  const router =
    useRouter();

  const [
    formData,
    setFormData,
  ] =
    useState<VoucherForm>(
      estadoInicial
    );

  const [
    clientes,
    setClientes,
  ] =
    useState<Cliente[]>(
      []
    );

  const [
    passeios,
    setPasseios,
  ] =
    useState<Passeio[]>(
      []
    );

  const [
    carregandoRelacionados,
    setCarregandoRelacionados,
  ] =
    useState(true);

  const [
    salvando,
    setSalvando,
  ] =
    useState(false);

  const [
    erro,
    setErro,
  ] =
    useState<string | null>(
      null
    );

  const [
    sucesso,
    setSucesso,
  ] =
    useState<string | null>(
      null
    );

  const inputClass =
    'w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm text-[#EDEDE3] outline-none transition placeholder:text-[#EDEDE3]/20 focus:border-[#E3A144]/40 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-50';

  const labelClass =
    'mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/34';

  /*
    ============================================================
    CLIENTES E PASSEIOS
    ============================================================
  */

  async function carregarRelacionados() {
    setCarregandoRelacionados(
      true
    );

    setErro(null);

    try {
      const [
        clientesResultado,
        passeiosResultado,
      ] =
        await Promise.all([
          supabase
            .from(
              'clientes'
            )
            .select(
              'id, nome'
            )
            .order(
              'nome',
              {
                ascending:
                  true,
              }
            ),

          supabase
            .from(
              'passeios'
            )
            .select(
              'id, nome'
            )
            .order(
              'created_at',
              {
                ascending:
                  false,
              }
            ),
        ]);

      if (
        clientesResultado.error
      ) {
        throw clientesResultado.error;
      }

      if (
        passeiosResultado.error
      ) {
        throw passeiosResultado.error;
      }

      setClientes(
        (
          clientesResultado.data ||
          []
        ) as Cliente[]
      );

      setPasseios(
        (
          passeiosResultado.data ||
          []
        ) as Passeio[]
      );
    } catch (err) {
      console.error(
        'Erro ao carregar dados relacionados:',
        err
      );

      setClientes([]);
      setPasseios([]);

      setErro(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar clientes e passeios.'
      );
    } finally {
      setCarregandoRelacionados(
        false
      );
    }
  }

  useEffect(() => {
    carregarRelacionados();
  }, []);

  /*
    ============================================================
    CAMPOS
    ============================================================
  */

  function alterarCampo<
    K extends keyof VoucherForm,
  >(
    campo: K,
    valor: VoucherForm[K]
  ) {
    setFormData(
      (
        atual
      ) => ({
        ...atual,

        [campo]:
          valor,
      })
    );
  }

  function handleLimpar() {
    if (
      salvando
    ) {
      return;
    }

    setFormData(
      estadoInicial
    );

    setErro(null);
    setSucesso(null);
  }

  function formatarValorAoSair() {
    if (
      !formData.valor.trim()
    ) {
      return;
    }

    const valor =
      converterValor(
        formData.valor
      );

    if (
      !Number.isFinite(
        valor
      )
    ) {
      return;
    }

    alterarCampo(
      'valor',
      formatarValorCampo(
        valor
      )
    );
  }

  /*
    ============================================================
    SALVAR
    ============================================================
  */

  async function handleSubmit(
    event:
      React.FormEvent
  ) {
    event.preventDefault();

    if (
      salvando
    ) {
      return;
    }

    setErro(null);
    setSucesso(null);

    const codigo =
      formData.codigo
        .trim();

    if (!codigo) {
      setErro(
        'Informe o código do voucher.'
      );

      return;
    }

    if (
      !formData.clienteId
    ) {
      setErro(
        'Selecione o cliente.'
      );

      return;
    }

    if (
      !formData.passeioId
    ) {
      setErro(
        'Selecione o passeio ou roteiro.'
      );

      return;
    }

    if (
      !formData.valor.trim()
    ) {
      setErro(
        'Informe o valor do voucher.'
      );

      return;
    }

    const valor =
      converterValor(
        formData.valor
      );

    if (
      !Number.isFinite(
        valor
      ) ||
      valor <= 0
    ) {
      setErro(
        'Informe um valor válido maior que zero.'
      );

      return;
    }

    setSalvando(true);

    try {
      const {
        error:
          insertError,
      } =
        await supabase
          .from(
            'vouchers'
          )
          .insert([
            {
              codigo,

              cliente_id:
                formData.clienteId,

              passeio_id:
                formData.passeioId,

              valor,

              status:
                formData.status,

              validade:
                formData.validade ||
                null,
            },
          ]);

      if (
        insertError
      ) {
        throw insertError;
      }

      setSucesso(
        'Voucher cadastrado com sucesso.'
      );

      window.setTimeout(
        () => {
          router.push(
            '/vouchers'
          );

          router.refresh();
        },
        1000
      );
    } catch (err) {
      console.error(
        'Erro ao salvar voucher:',
        err
      );

      const mensagem =
        String(
          err instanceof Error
            ? err.message
            : ''
        );

      if (
        mensagem.includes(
          'ERN_USUARIO_SEM_EMPRESA'
        )
      ) {
        setErro(
          'Seu usuário não possui uma empresa vinculada.'
        );

        return;
      }

      setErro(
        err instanceof Error
          ? err.message
          : 'Não foi possível cadastrar o voucher.'
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#07110E] pb-16 text-[#EDEDE3]">
      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <section className="border-b border-white/[0.07] bg-[#091510]">
        <div className="mx-auto max-w-[1180px] px-5 py-10 md:px-8 md:py-12">
          <Link
            href="/vouchers"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#EDEDE3]/38 transition hover:text-[#E3A144]"
          >
            <span>←</span>
            Vouchers
          </Link>

          <div className="mt-7">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-[#E3A144]" />

              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                Operação • Emissão
              </p>
            </div>

            <h1
              className="mt-4 text-4xl tracking-[-0.035em] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Novo voucher
            </h1>

            <p className="mt-4 max-w-[680px] text-sm leading-7 text-[#EDEDE3]/40">
              Vincule o comprovante ao cliente e à
              experiência, informe valor, validade e
              situação operacional.
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 md:py-10">
        {/* ===================================================
            FEEDBACK
        ==================================================== */}

        {erro && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-5 py-4 text-xs text-red-300">
            <span>
              {erro}
            </span>

            <button
              type="button"
              onClick={() =>
                setErro(
                  null
                )
              }
              className="text-red-300/60 transition hover:text-red-200"
            >
              ✕
            </button>
          </div>
        )}

        {sucesso && (
          <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] px-5 py-4 text-xs text-emerald-300">
            {sucesso}
          </div>
        )}

        <form
          onSubmit={
            handleSubmit
          }
          className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"
        >
          {/* =================================================
              DADOS
          ================================================== */}

          <section className="rounded-[26px] border border-white/[0.075] bg-[#0A1713] p-5 md:p-7">
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
              Dados do voucher
            </h2>

            <div className="mt-6 space-y-5">
              {/* CÓDIGO */}

              <div>
                <label
                  htmlFor="codigo"
                  className={
                    labelClass
                  }
                >
                  Código do voucher *
                </label>

                <input
                  id="codigo"
                  type="text"
                  required
                  disabled={
                    salvando
                  }
                  value={
                    formData.codigo
                  }
                  onChange={(
                    event
                  ) =>
                    alterarCampo(
                      'codigo',
                      event.target
                        .value
                    )
                  }
                  placeholder="Ex.: ERN-2026-001"
                  className={
                    inputClass
                  }
                />
              </div>

              {/* CLIENTE */}

              <div>
                <label
                  htmlFor="cliente"
                  className={
                    labelClass
                  }
                >
                  Cliente *
                </label>

                <select
                  id="cliente"
                  required
                  disabled={
                    carregandoRelacionados ||
                    salvando
                  }
                  value={
                    formData.clienteId
                  }
                  onChange={(
                    event
                  ) =>
                    alterarCampo(
                      'clienteId',
                      event.target
                        .value
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    {carregandoRelacionados
                      ? 'Carregando clientes...'
                      : clientes.length ===
                          0
                        ? 'Nenhum cliente disponível'
                        : 'Selecione um cliente'}
                  </option>

                  {clientes.map(
                    (
                      cliente
                    ) => (
                      <option
                        key={
                          cliente.id
                        }
                        value={
                          cliente.id
                        }
                      >
                        {cliente.nome ||
                          cliente.nome_completo ||
                          `Cliente ${cliente.id}`}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* PASSEIO */}

              <div>
                <label
                  htmlFor="passeio"
                  className={
                    labelClass
                  }
                >
                  Passeio / roteiro *
                </label>

                <select
                  id="passeio"
                  required
                  disabled={
                    carregandoRelacionados ||
                    salvando
                  }
                  value={
                    formData.passeioId
                  }
                  onChange={(
                    event
                  ) =>
                    alterarCampo(
                      'passeioId',
                      event.target
                        .value
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    {carregandoRelacionados
                      ? 'Carregando passeios...'
                      : passeios.length ===
                          0
                        ? 'Nenhum passeio disponível'
                        : 'Selecione um passeio'}
                  </option>

                  {passeios.map(
                    (
                      passeio
                    ) => (
                      <option
                        key={
                          passeio.id
                        }
                        value={
                          passeio.id
                        }
                      >
                        {passeio.nome ||
                          passeio.titulo ||
                          `Passeio ${passeio.id}`}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* VALOR */}

                <div>
                  <label
                    htmlFor="valor"
                    className={
                      labelClass
                    }
                  >
                    Valor (R$) *
                  </label>

                  <input
                    id="valor"
                    type="text"
                    inputMode="decimal"
                    required
                    disabled={
                      salvando
                    }
                    value={
                      formData.valor
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
                    Aceita 3500, 3.500, 3500,00 ou 3.500,00.
                  </p>
                </div>

                {/* VALIDADE */}

                <div>
                  <label
                    htmlFor="validade"
                    className={
                      labelClass
                    }
                  >
                    Data de validade
                  </label>

                  <input
                    id="validade"
                    type="date"
                    disabled={
                      salvando
                    }
                    value={
                      formData.validade
                    }
                    onChange={(
                      event
                    ) =>
                      alterarCampo(
                        'validade',
                        event.target
                          .value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              LATERAL
          ================================================== */}

          <div className="space-y-6">
            {/* STATUS */}

            <section className="rounded-[26px] border border-white/[0.075] bg-[#0A1713] p-5 md:p-6">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                Situação
              </p>

              <h2
                className="mt-2 text-2xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Status do voucher
              </h2>

              <p className="mt-4 text-xs leading-6 text-[#EDEDE3]/35">
                Um novo voucher normalmente é emitido
                como ativo. Depois ele pode ser marcado
                como utilizado ou cancelado conforme a
                operação.
              </p>

              <div className="mt-6">
                <label
                  htmlFor="status"
                  className={
                    labelClass
                  }
                >
                  Status inicial
                </label>

                <select
                  id="status"
                  disabled={
                    salvando
                  }
                  value={
                    formData.status
                  }
                  onChange={(
                    event
                  ) =>
                    alterarCampo(
                      'status',
                      event.target
                        .value as StatusVoucher
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="Ativo">
                    Ativo
                  </option>

                  <option value="Utilizado">
                    Utilizado
                  </option>

                  <option value="Cancelado">
                    Cancelado
                  </option>
                </select>
              </div>
            </section>

            {/* VÍNCULOS */}

            <section className="rounded-[26px] border border-white/[0.075] bg-[#0A1713] p-5 md:p-6">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                Estrutura do registro
              </p>

              <h2
                className="mt-2 text-lg text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Informações vinculadas
              </h2>

              <div className="mt-5 space-y-2">
                {[
                  'Código do voucher',
                  'Cliente',
                  'Passeio / roteiro',
                  'Valor',
                  'Validade',
                  'Status operacional',
                ].map(
                  (
                    item
                  ) => (
                    <div
                      key={
                        item
                      }
                      className="flex items-center gap-3 rounded-xl border border-white/[0.055] bg-white/[0.018] px-3 py-2.5"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#E3A144]" />

                      <span className="text-[11px] text-[#EDEDE3]/48">
                        {item}
                      </span>
                    </div>
                  )
                )}
              </div>
            </section>

            {/* PROTEÇÃO */}

            <section className="rounded-[20px] border border-emerald-500/10 bg-emerald-500/[0.025] p-5">
              <div className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />

                <p className="text-[10px] leading-5 text-[#EDEDE3]/32">
                  O voucher será vinculado automaticamente
                  à empresa autenticada pela proteção do
                  servidor.
                </p>
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
                disabled={
                  salvando
                }
                onClick={
                  handleLimpar
                }
                className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 py-3 text-xs font-semibold text-[#EDEDE3]/45 transition hover:bg-white/[0.045] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Limpar formulário
              </button>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/vouchers"
                  className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 text-xs font-semibold text-[#EDEDE3]/55 transition hover:bg-white/[0.045]"
                >
                  Cancelar
                </Link>

                <button
                  type="submit"
                  disabled={
                    salvando ||
                    carregandoRelacionados ||
                    clientes.length ===
                      0 ||
                    passeios.length ===
                      0
                  }
                  className="inline-flex min-h-[46px] min-w-[170px] items-center justify-center rounded-xl bg-[#E3A144] px-6 text-xs font-bold text-[#07130F] shadow-[0_8px_22px_rgba(227,161,68,0.12)] transition hover:bg-[#F0B35C] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {salvando
                    ? 'Salvando...'
                    : carregandoRelacionados
                      ? 'Carregando dados...'
                      : 'Cadastrar voucher'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
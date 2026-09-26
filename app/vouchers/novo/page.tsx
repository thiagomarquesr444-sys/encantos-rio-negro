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

export default function NovoVoucherPage() {
  const router = useRouter();

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
    useState<Cliente[]>([]);

  const [
    passeios,
    setPasseios,
  ] =
    useState<Passeio[]>([]);

  const [
    carregandoRelacionados,
    setCarregandoRelacionados,
  ] = useState(true);

  const [
    salvando,
    setSalvando,
  ] = useState(false);

  const [
    erro,
    setErro,
  ] = useState<string | null>(
    null
  );

  const [
    sucesso,
    setSucesso,
  ] = useState<string | null>(
    null
  );

  const inputClass =
    'w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm text-[#EDEDE3] outline-none transition placeholder:text-[#EDEDE3]/20 focus:border-[#E3A144]/40';

  const labelClass =
    'mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/34';

  /*
    ============================================================
    RELACIONAMENTOS
    ============================================================
  */

  async function carregarRelacionados() {
    setCarregandoRelacionados(
      true
    );

    try {
      const [
        clientesResultado,
        passeiosResultado,
      ] =
        await Promise.all([
          supabase
            .from('clientes')
            .select('*')
            .order('nome', {
              ascending: true,
            }),

          supabase
            .from('passeios')
            .select('*')
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
        (clientesResultado.data ||
          []) as Cliente[]
      );

      setPasseios(
        (passeiosResultado.data ||
          []) as Passeio[]
      );
    } catch (err) {
      console.error(
        'Erro ao carregar dados relacionados:',
        err
      );

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

  function alterarCampo(
    campo:
      keyof VoucherForm,
    valor: string
  ) {
    setFormData(
      (atual) => ({
        ...atual,
        [campo]: valor,
      })
    );
  }

  function handleLimpar() {
    setFormData(
      estadoInicial
    );

    setErro(null);
    setSucesso(null);
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

    if (salvando) {
      return;
    }

    setErro(null);
    setSucesso(null);

    const codigo =
      formData.codigo.trim();

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

    const valor =
      converterValor(
        formData.valor
      );

    if (
      !Number.isFinite(valor) ||
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
        error: insertError,
      } = await supabase
        .from('vouchers')
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

      if (insertError) {
        throw insertError;
      }

      setSucesso(
        'Voucher cadastrado com sucesso.'
      );

      setTimeout(() => {
        router.push(
          '/vouchers'
        );

        router.refresh();
      }, 1200);
    } catch (err) {
      console.error(
        'Erro ao salvar voucher:',
        err
      );

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
    <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      {/* HEADER */}

      <section className="border-b border-white/[0.07] bg-[#091510]">
        <div className="mx-auto max-w-[1180px] px-5 py-10 md:px-8 md:py-12">
          <Link
            href="/vouchers"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#EDEDE3]/38 transition hover:text-[#E3A144]"
          >
            ← Vouchers
          </Link>

          <div className="mt-7">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
              Operação • Emissão
            </p>

            <h1
              className="mt-3 text-4xl tracking-[-0.035em] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Novo voucher
            </h1>

            <p className="mt-4 max-w-[680px] text-sm leading-7 text-[#EDEDE3]/40">
              Vincule o comprovante ao
              cliente e ao passeio,
              informe valor, validade e
              situação operacional.
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 md:py-10">
        {erro && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-5 py-4 text-xs text-red-300">
            {erro}
          </div>
        )}

        {sucesso && (
          <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] px-5 py-4 text-xs text-emerald-300">
            {sucesso}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"
        >
          {/* DADOS */}

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
              <div>
                <label
                  className={
                    labelClass
                  }
                >
                  Código do voucher *
                </label>

                <input
                  type="text"
                  required
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

              <div>
                <label
                  className={
                    labelClass
                  }
                >
                  Cliente *
                </label>

                <select
                  required
                  disabled={
                    carregandoRelacionados
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
                      : 'Selecione um cliente'}
                  </option>

                  {clientes.map(
                    (cliente) => (
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

              <div>
                <label
                  className={
                    labelClass
                  }
                >
                  Passeio / roteiro *
                </label>

                <select
                  required
                  disabled={
                    carregandoRelacionados
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
                      : 'Selecione um passeio'}
                  </option>

                  {passeios.map(
                    (passeio) => (
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
                    required
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
                    placeholder="Ex.: 3.500"
                    className={
                      inputClass
                    }
                  />

                  <p className="mt-2 text-[9px] text-[#EDEDE3]/24">
                    Ex.: 3500 ou 3.500.
                  </p>
                </div>

                <div>
                  <label
                    className={
                      labelClass
                    }
                  >
                    Data de validade
                  </label>

                  <input
                    type="date"
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

          {/* STATUS */}

          <div className="space-y-6">
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
                Novos vouchers
                normalmente começam
                como ativos e podem
                depois ser marcados como
                utilizados ou
                cancelados.
              </p>

              <div className="mt-6">
                <label
                  className={
                    labelClass
                  }
                >
                  Status inicial
                </label>

                <select
                  value={
                    formData.status
                  }
                  onChange={(
                    event
                  ) =>
                    alterarCampo(
                      'status',
                      event.target
                        .value
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

            <section className="rounded-[26px] border border-white/[0.075] bg-[#0A1713] p-5 md:p-6">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                Vínculos
              </p>

              <div className="mt-5 space-y-2">
                {[
                  'Código do voucher',
                  'Cliente',
                  'Passeio / roteiro',
                  'Valor',
                  'Validade',
                  'Status operacional',
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

          {/* AÇÕES */}

          <div className="lg:col-span-2">
            <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                disabled={salvando}
                onClick={
                  handleLimpar
                }
                className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 py-3 text-xs font-semibold text-[#EDEDE3]/45 disabled:opacity-50"
              >
                Limpar formulário
              </button>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/vouchers"
                  className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 text-xs font-semibold text-[#EDEDE3]/55"
                >
                  Cancelar
                </Link>

                <button
                  type="submit"
                  disabled={
                    salvando ||
                    carregandoRelacionados
                  }
                  className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-[#E3A144] px-6 text-xs font-bold text-[#07130F] transition hover:bg-[#F0B35C] disabled:opacity-50"
                >
                  {salvando
                    ? 'Salvando...'
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
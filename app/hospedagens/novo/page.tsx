'use client';

import React, {
  useState,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

type StatusHospedagem =
  | 'Disponível'
  | 'Reservada'
  | 'Ocupada';

interface HospedagemForm {
  nome: string;
  tipo: string;
  endereco: string;
  telefone: string;
  valorDiaria: string;
  status: StatusHospedagem;
}

const estadoInicial: HospedagemForm = {
  nome: '',
  tipo: '',
  endereco: '',
  telefone: '',
  valorDiaria: '',
  status: 'Disponível',
};

/*
  ============================================================
  CONVERSÃO DA DIÁRIA
  ============================================================

  Exemplos:

  350      -> 350
  1500     -> 1500
  1.500    -> 1500
  1.500,50 -> 1500.50
*/


function converterValor(entrada: unknown): number {
  let numero: number;

  if (typeof entrada === 'number') {
    numero = entrada;
  } else if (typeof entrada === 'string') {
    let valor = entrada.trim().replace(/^R\$\s*/i, '');

    if (!valor) return Number.NaN;

    if (valor.includes(',')) {
      if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(valor)) {
        return Number.NaN;
      }
      valor = valor.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(?:\.\d{3})+$/.test(valor)) {
      valor = valor.replace(/\./g, '');
    } else if (!/^\d+(?:\.\d{1,2})?$/.test(valor)) {
      return Number.NaN;
    }

    numero = Number(valor);
  } else {
    return Number.NaN;
  }

  const centavos = Math.round(numero * 100);

  if (
    !Number.isFinite(numero) ||
    numero < 0 ||
    numero > 99999999.99 ||
    !Number.isSafeInteger(centavos) ||
    Math.abs(numero * 100 - centavos) > 0.000001
  ) {
    return Number.NaN;
  }

  return centavos / 100;
}


export default function NovaHospedagemPage() {
  const router = useRouter();
  const envioHospedagemERN = React.useRef(false);
  const gravadoHospedagemERN = React.useRef(false);
  const idHospedagemERN = React.useRef<string | null>(null);
  const contextoEnvioERN = React.useRef<{
    usuarioId: string;
    empresaId: string;
  } | null>(null);

  const [
    form,
    setForm,
  ] =
    useState<HospedagemForm>(
      estadoInicial
    );

  const [
    carregando,
    setCarregando,
  ] = useState(false);

  const [
    mensagem,
    setMensagem,
  ] = useState<{
    tipo: 'sucesso' | 'erro';
    texto: string;
  } | null>(null);

  const inputClass =
    'w-full rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 py-3 text-sm text-[var(--ern-texto)] outline-none transition placeholder:text-[var(--ern-secundario)] focus:border-[var(--ern-destaque)]';

  const labelClass =
    'mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--ern-secundario)]';

  function alterarCampo(
    campo: keyof HospedagemForm,
    valor: string
  ) {
    setForm(
      (atual) => ({
        ...atual,
        [campo]: valor,
      })
    );
  }

  function handleLimpar() {
    if (envioHospedagemERN.current || gravadoHospedagemERN.current) return;
    setForm(
      estadoInicial
    );

    setMensagem(null);
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
    if (envioHospedagemERN.current || gravadoHospedagemERN.current) return;

    setMensagem(null);

    if (
      !form.nome.trim() ||
      !form.valorDiaria.trim()
    ) {
      setMensagem({
        tipo: 'erro',
        texto:
          'Preencha os campos obrigatórios: nome da hospedagem e valor da diária.',
      });

      return;
    }

    const diaria =
      converterValor(
        form.valorDiaria
      );

    if (
      !Number.isFinite(
        diaria
      ) ||
      diaria < 0
    ) {
      setMensagem({
        tipo: 'erro',
        texto:
          'Informe um valor válido para a diária.',
      });

      return;
    }

    envioHospedagemERN.current = true;
    setCarregando(true);

    try {
      const payloadBase = {
        nome:
          form.nome.trim(),

        tipo:
          form.tipo.trim() ||
          null,

        endereco:
          form.endereco.trim() ||
          null,

        telefone:
          form.telefone.trim() ||
          null,

        valor_diaria:
          diaria,
      };

      /*
        O cadastro antigo usa
        "status" minúsculo.

        Mantemos isso como primeira
        tentativa.

        Caso a tabela instalada use
        "Status" com maiúscula,
        fazemos a tentativa de
        compatibilidade.
      */

      const { data: auth, error: erroAuth } =
        await supabase.auth.getUser();

      if (erroAuth || !auth.user) {
        throw new Error('Entre novamente para cadastrar a hospedagem.');
      }

      const { data: perfil, error: erroPerfil } = await supabase
        .from('perfis')
        .select('empresa_id')
        .eq('id', auth.user.id)
        .single();

      if (erroPerfil || !perfil?.empresa_id) {
        throw new Error('Nao foi possivel identificar sua empresa.');
      }

      const empresa = String(perfil.empresa_id);
      const anterior = contextoEnvioERN.current;

      if (
        anterior &&
        (anterior.usuarioId !== auth.user.id || anterior.empresaId !== empresa)
      ) {
        throw new Error('Sua conta mudou. Reabra o formulario.');
      }

      contextoEnvioERN.current = {
        usuarioId: auth.user.id,
        empresaId: empresa,
      };
      idHospedagemERN.current ??= crypto.randomUUID();

      const resultado = await supabase
        .from('hospedagens')
        .insert([{
          ...payloadBase,
          id: idHospedagemERN.current,
          empresa_id: empresa,
          status: form.status,
        }])
        .select('id')
        .single();

      if (resultado.error) {
        if (resultado.error.code === '23505') {
          throw new Error(
            'Este envio pode ja ter sido registrado. Confira a listagem antes de cadastrar novamente.'
          );
        }
        throw resultado.error;
      }

      if (resultado.data?.id !== idHospedagemERN.current) {
        throw new Error('Nao foi possivel confirmar o cadastro.');
      }

      gravadoHospedagemERN.current = true;

      setMensagem({
        tipo: 'sucesso',
        texto:
          'Hospedagem cadastrada com sucesso.',
      });

      setTimeout(() => {
        router.push(
          '/hospedagens'
        );

        router.refresh();
      }, 1200);
    } catch (err) {
      console.error(
        'Erro ao cadastrar hospedagem:',
        err
      );

      setMensagem({
        tipo: 'erro',
        texto:
          err instanceof Error
            ? `Erro ao cadastrar hospedagem: ${err.message}`
            : 'Não foi possível cadastrar a hospedagem.',
      });
    } finally {
      if (!gravadoHospedagemERN.current) {
        envioHospedagemERN.current = false;
        setCarregando(false);
      }
    }
  }

  return (
    <div className="min-h-screen bg-[var(--ern-fundo)] text-[var(--ern-texto)]">
      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <section className="border-b border-[var(--ern-borda)] bg-[var(--ern-painel)]">
        <div className="mx-auto max-w-[1180px] px-5 py-10 md:px-8 md:py-12">
          <Link
            href="/hospedagens"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--ern-secundario)] transition hover:text-[var(--ern-destaque)]"
          >
            <span>←</span>

            Hospedagens
          </Link>

          <div className="mt-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--ern-destaque)]">
                Estrutura • Cadastro
              </p>

              <h1
                className="mt-3 text-4xl tracking-[-0.035em] text-[var(--ern-texto)] md:text-5xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Nova hospedagem
              </h1>

              <p className="mt-4 max-w-[650px] text-sm leading-7 text-[var(--ern-secundario)]">
                Cadastre uma unidade
                de hospedagem utilizada
                ou oferecida pela
                operação turística.
              </p>
            </div>

            <span className="rounded-full border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-3 py-1.5 text-[9px] uppercase tracking-[0.15em] text-[var(--ern-secundario)]">
              ERN Gestão
            </span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 md:py-10">
        {mensagem && (
          <div
            className={`mb-6 rounded-2xl border px-5 py-4 text-xs ${
              mensagem.tipo ===
              'sucesso'
                ? 'border-emerald-500/20 bg-emerald-500/[0.07] text-[var(--ern-sucesso)]'
                : 'border-red-500/20 bg-red-500/[0.07] text-[var(--ern-erro)]'
            }`}
          >
            {mensagem.texto}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"
        >
          {/* =================================================
              IDENTIFICAÇÃO
          ================================================== */}

          <section className="rounded-[26px] border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-5 md:p-7">
            <div className="border-b border-[var(--ern-borda)] pb-5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--ern-secundario)]">
                Identificação
              </p>

              <h2
                className="mt-2 text-2xl text-[var(--ern-texto)]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Dados da hospedagem
              </h2>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label
                  className={
                    labelClass
                  }
                >
                  Nome da hospedagem *
                </label>

                <input
                  type="text"
                  required
                  value={form.nome}
                  onChange={(
                    event
                  ) =>
                    alterarCampo(
                      'nome',
                      event.target
                        .value
                    )
                  }
                  placeholder="Ex.: Pousada Rio Negro"
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
                    Tipo
                  </label>

                  <input
                    type="text"
                    value={form.tipo}
                    onChange={(
                      event
                    ) =>
                      alterarCampo(
                        'tipo',
                        event.target
                          .value
                      )
                    }
                    placeholder="Ex.: Pousada, hotel, barco-hotel"
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
                    Valor da diária (R$) *
                  </label>

                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={
                      form.valorDiaria
                    }
                    onChange={(
                      event
                    ) =>
                      alterarCampo(
                        'valorDiaria',
                        event.target
                          .value
                      )
                    }
                    placeholder="Ex.: 350 ou 1.500"
                    className={
                      inputClass
                    }
                  />

                  <p className="mt-2 text-[9px] leading-4 text-[var(--ern-secundario)]">
                    Use ponto para
                    separação de milhar,
                    quando necessário.
                  </p>
                </div>
              </div>

              <div>
                <label
                  className={
                    labelClass
                  }
                >
                  Localização / Endereço
                </label>

                <input
                  type="text"
                  value={
                    form.endereco
                  }
                  onChange={(
                    event
                  ) =>
                    alterarCampo(
                      'endereco',
                      event.target
                        .value
                    )
                  }
                  placeholder="Endereço ou localização da unidade"
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
                  Telefone
                </label>

                <input
                  type="text"
                  value={
                    form.telefone
                  }
                  onChange={(
                    event
                  ) =>
                    alterarCampo(
                      'telefone',
                      event.target
                        .value
                    )
                  }
                  placeholder="Telefone ou WhatsApp"
                  className={
                    inputClass
                  }
                />
              </div>
            </div>
          </section>

          {/* =================================================
              DISPONIBILIDADE
          ================================================== */}

          <div className="space-y-6">
            <section className="rounded-[26px] border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-5 md:p-6">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--ern-destaque)]">
                Operação
              </p>

              <h2
                className="mt-2 text-2xl text-[var(--ern-texto)]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Disponibilidade
              </h2>

              <p className="mt-4 text-xs leading-6 text-[var(--ern-secundario)]">
                Defina a situação
                operacional atual da
                hospedagem.
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
                    form.status
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
                  <option value="Disponível">
                    Disponível
                  </option>

                  <option value="Reservada">
                    Reservada
                  </option>

                  <option value="Ocupada">
                    Ocupada
                  </option>
                </select>
              </div>
            </section>

            <section className="rounded-[26px] border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-5 md:p-6">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--ern-secundario)]">
                Organização
              </p>

              <h3
                className="mt-2 text-xl text-[var(--ern-texto)]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Cadastro operacional
              </h3>

              <div className="mt-5 space-y-2">
                {[
                  'Nome da unidade',
                  'Tipo de hospedagem',
                  'Valor da diária',
                  'Localização',
                  'Contato',
                  'Status operacional',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-3 py-2.5"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--ern-botao)]" />

                    <span className="text-[11px] text-[var(--ern-secundario)]">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* =================================================
              AÇÕES
          ================================================== */}

          <div className="lg:col-span-2">
            <div className="flex flex-col-reverse gap-3 border-t border-[var(--ern-borda)] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={
                  handleLimpar
                }
                disabled={
                  carregando
                }
                className="rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-5 py-3 text-xs font-semibold text-[var(--ern-secundario)] transition hover:bg-[var(--ern-suave)] disabled:opacity-50"
              >
                Limpar formulário
              </button>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/hospedagens"
                  className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-5 text-xs font-semibold text-[var(--ern-secundario)] transition hover:bg-[var(--ern-suave)]"
                >
                  Cancelar
                </Link>

                <button
                  type="submit"
                  disabled={
                    carregando
                  }
                  className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-[var(--ern-botao)] px-6 text-xs font-bold text-[var(--ern-sobre-botao)] transition hover:bg-[var(--ern-botao)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {carregando
                    ? 'Salvando...'
                    : 'Cadastrar hospedagem'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
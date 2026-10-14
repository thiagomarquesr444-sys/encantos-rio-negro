'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

type StatusDespesa = 'Pago' | 'Pendente';

interface DespesaForm {
  descricao: string;
  valor: string;
  categoria: string;
  data_vencimento: string;
  data_liquidacao: string;
  status: StatusDespesa;
}

const CATEGORIAS = [
  'Manutenção / Operacional',
  'Combustível',
  'Alimentação / Insumos',
  'Salários / Guias',
  'Outras Despesas',
];

function hojeManaus(): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Manaus',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const obter = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';

  return `${obter('year')}-${obter('month')}-${obter('day')}`;
}

function dataValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;

  const data = new Date(`${valor}T12:00:00Z`);

  return (
    Number.isFinite(data.getTime()) &&
    data.toISOString().slice(0, 10) === valor
  );
}

function converterValor(entrada: string): number {
  const texto = entrada
    .trim()
    .replace(/^R\$\s*/i, '')
    .replace(/\s/g, '');

  let normalizado: string;

  if (texto.includes(',')) {
    if (
      !/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(texto)
    ) {
      return NaN;
    }

    normalizado = texto.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(texto)) {
    normalizado = texto.replace(/\./g, '');
  } else if (/^\d+(?:\.\d{1,2})?$/.test(texto)) {
    normalizado = texto;
  } else {
    return NaN;
  }

  const [inteiros, decimais = ''] = normalizado.split('.');
  const centavos =
    Number(inteiros) * 100 +
    Number(decimais.padEnd(2, '0'));

  return Number.isSafeInteger(centavos) && centavos > 0
    ? centavos / 100
    : NaN;
}

export default function NovaDespesaPage() {
  const router = useRouter();
  const envioEmAndamento = useRef(false);

  const [formData, setFormData] = useState<DespesaForm>({
    descricao: '',
    valor: '',
    categoria: 'Manutenção / Operacional',
    data_vencimento: '',
    data_liquidacao: '',
    status: 'Pago',
  });

  const [salvando, setSalvando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  const inputClass =
    'block min-h-12 w-full min-w-0 rounded-xl border ' +
    'border-white/20 bg-[#07110E] px-4 py-3 text-base ' +
    'text-[#EDEDE3] outline-none placeholder:text-[#B4C8BB]/60 ' +
    'focus:border-[#E3A144] focus:ring-2 focus:ring-[#E3A144]/20';

  const labelClass =
    'mb-2 block text-sm font-medium text-[#EDEDE3]/85';

  function alterar(
    campo: Exclude<keyof DespesaForm, 'status'>,
    valor: string,
  ) {
    setFormData((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function alterarStatus(status: StatusDespesa) {
    setFormData((atual) => ({
      ...atual,
      status,
      data_liquidacao:
        status === 'Pendente' ? '' : atual.data_liquidacao,
    }));
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (envioEmAndamento.current) return;

    setMensagemErro('');
    setMensagemSucesso('');

    const descricao = formData.descricao.trim();
    const valor = converterValor(formData.valor);

    if (!descricao) {
      setMensagemErro('Informe a descrição da despesa.');
      return;
    }

    if (!Number.isFinite(valor)) {
      setMensagemErro(
        'Informe um valor maior que zero, com até duas casas decimais.',
      );
      return;
    }

    if (!dataValida(formData.data_vencimento)) {
      setMensagemErro('Informe uma data de vencimento válida.');
      return;
    }

    if (formData.status === 'Pago') {
      if (!dataValida(formData.data_liquidacao)) {
        setMensagemErro('Informe a data efetiva do pagamento.');
        return;
      }

      if (formData.data_liquidacao > hojeManaus()) {
        setMensagemErro(
          'Uma despesa paga não pode ter data de pagamento futura.',
        );
        return;
      }
    }

    envioEmAndamento.current = true;
    setSalvando(true);

    try {
      const { data: autenticacao, error: erroAutenticacao } =
        await supabase.auth.getUser();

      if (erroAutenticacao || !autenticacao.user) {
        throw new Error(
          'Sua sessão não está disponível. Entre novamente para continuar.',
        );
      }

      const { data: perfil, error: erroPerfil } = await supabase
        .from('perfis')
        .select('empresa_id')
        .eq('id', autenticacao.user.id)
        .single();

      if (erroPerfil || !perfil?.empresa_id) {
        throw new Error(
          'Não foi possível identificar a empresa vinculada à sua conta.',
        );
      }

      const { data: registro, error: erroCadastro } = await supabase
        .from('financeiro')
        .insert({
          descricao,
          tipo: 'despesa',
          valor,
          categoria: formData.categoria,
          data_vencimento: formData.data_vencimento,
          data_liquidacao:
            formData.status === 'Pago'
              ? formData.data_liquidacao
              : null,
          status: formData.status,
          user_id: autenticacao.user.id,
          empresa_id: perfil.empresa_id,
        })
        .select('id')
        .single();

      if (erroCadastro || !registro?.id) {
        throw new Error(
          'Não foi possível confirmar o cadastro. Confira sua permissão e o plano da empresa. Se houve falha de conexão, consulte a lista antes de tentar novamente.',
        );
      }

      setMensagemSucesso('Despesa cadastrada com sucesso.');
      router.push('/financeiro');
      router.refresh();
    } catch (error) {
      setMensagemErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível cadastrar a despesa.',
      );

      envioEmAndamento.current = false;
      setSalvando(false);
    }
  }

  return (
    <div className="min-h-screen min-w-0 bg-[#07110E] text-[#EDEDE3]">
      <header className="border-b border-white/10 bg-[#091510]">
        <div className="mx-auto max-w-[1180px] px-4 py-7 sm:px-6 md:px-8 md:py-10">
          <Link
            href="/financeiro"
            className="inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-[#F4C77E] focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            ← Financeiro
          </Link>

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-rose-300">
            Financeiro • Saída
          </p>

          <h1
            className="mt-3 text-3xl text-[#F0F0E8] sm:text-4xl"
            style={{ fontFamily: 'var(--font-fraunces), serif' }}
          >
            Nova despesa
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#B4C8BB]">
            Registre os custos da operação e mantenha os
            pagamentos realizados separados das obrigações pendentes.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 md:px-8 md:py-8">
        {mensagemErro && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200"
          >
            {mensagemErro}
          </div>
        )}

        {mensagemSucesso && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"
          >
            {mensagemSucesso}
          </div>
        )}

        <form onSubmit={salvar} aria-busy={salvando}>
          <fieldset
            disabled={salvando}
            className="grid min-w-0 gap-5 disabled:opacity-70 lg:grid-cols-[1.15fr_0.85fr]"
          >
            <legend className="sr-only">
              Cadastro de despesa financeira
            </legend>

            <section className="min-w-0 rounded-2xl border border-white/10 bg-[#0A1713] p-5 sm:rounded-[26px] sm:p-7">
              <h2 className="text-xl font-semibold">
                Dados do lançamento
              </h2>

              <div className="mt-6 space-y-5">
                <div>
                  <label
                    htmlFor="despesa-descricao"
                    className={labelClass}
                  >
                    Descrição *
                  </label>
                  <input
                    id="despesa-descricao"
                    name="descricao"
                    required
                    value={formData.descricao}
                    onChange={(event) =>
                      alterar('descricao', event.target.value)
                    }
                    placeholder="Ex.: Combustível da expedição"
                    className={inputClass}
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="despesa-valor"
                      className={labelClass}
                    >
                      Valor (R$) *
                    </label>
                    <input
                      id="despesa-valor"
                      name="valor"
                      type="text"
                      inputMode="decimal"
                      required
                      value={formData.valor}
                      onChange={(event) =>
                        alterar('valor', event.target.value)
                      }
                      placeholder="Ex.: 1.500,00"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="despesa-vencimento"
                      className={labelClass}
                    >
                      Data de vencimento *
                    </label>
                    <input
                      id="despesa-vencimento"
                      name="data_vencimento"
                      type="date"
                      required
                      value={formData.data_vencimento}
                      onChange={(event) =>
                        alterar('data_vencimento', event.target.value)
                      }
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="despesa-categoria"
                    className={labelClass}
                  >
                    Categoria
                  </label>
                  <select
                    id="despesa-categoria"
                    name="categoria"
                    value={formData.categoria}
                    onChange={(event) =>
                      alterar('categoria', event.target.value)
                    }
                    className={inputClass}
                  >
                    {CATEGORIAS.map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="min-w-0 rounded-2xl border border-white/10 bg-[#0A1713] p-5 sm:rounded-[26px] sm:p-7">
              <h2 className="text-xl font-semibold">
                Situação da despesa
              </h2>

              <p className="mt-3 text-sm leading-7 text-[#B4C8BB]">
                Selecione Pago somente quando o dinheiro
                tiver efetivamente saído.
              </p>

              <div className="mt-5">
                <label
                  htmlFor="despesa-status"
                  className={labelClass}
                >
                  Status
                </label>
                <select
                  id="despesa-status"
                  name="status"
                  value={formData.status}
                  onChange={(event) =>
                    alterarStatus(
                      event.target.value === 'Pago'
                        ? 'Pago'
                        : 'Pendente',
                    )
                  }
                  className={inputClass}
                >
                  <option value="Pago">Pago</option>
                  <option value="Pendente">Pendente</option>
                </select>
              </div>

              {formData.status === 'Pago' ? (
                <div className="mt-5">
                  <label
                    htmlFor="despesa-liquidacao"
                    className={labelClass}
                  >
                    Data do pagamento *
                  </label>
                  <input
                    id="despesa-liquidacao"
                    name="data_liquidacao"
                    type="date"
                    required
                    value={formData.data_liquidacao}
                    onChange={(event) =>
                      alterar('data_liquidacao', event.target.value)
                    }
                    aria-describedby="despesa-liquidacao-ajuda"
                    className={inputClass}
                  />
                  <p
                    id="despesa-liquidacao-ajuda"
                    className="mt-2 text-xs leading-6 text-[#B4C8BB]"
                  >
                    Informe a data real da saída do dinheiro.
                    Ela pode ser diferente do vencimento.
                  </p>
                </div>
              ) : (
                <p className="mt-5 rounded-xl border border-[#E3A144]/20 bg-[#E3A144]/5 p-4 text-sm leading-6 text-[#F4C77E]">
                  Esta despesa ficará a pagar e não será somada
                  aos pagamentos realizados.
                </p>
              )}
            </section>

            <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end lg:col-span-2">
              {salvando ? (
                <button
                  type="button"
                  disabled
                  className="min-h-12 rounded-xl border border-white/20 px-5 text-sm text-[#B4C8BB]"
                >
                  Cancelar
                </button>
              ) : (
                <Link
                  href="/financeiro"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 px-5 text-sm font-semibold text-[#EDEDE3] focus-visible:outline-2 focus-visible:outline-offset-4"
                >
                  Cancelar
                </Link>
              )}

              <button
                type="submit"
                disabled={salvando}
                className="min-h-12 rounded-xl border border-rose-400/30 bg-rose-500/15 px-6 text-sm font-bold text-rose-200 hover:bg-rose-500/25 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-300 disabled:cursor-wait disabled:opacity-60"
              >
                {salvando ? 'Salvando...' : 'Salvar despesa'}
              </button>
            </div>
          </fieldset>
        </form>
      </main>
    </div>
  );
}
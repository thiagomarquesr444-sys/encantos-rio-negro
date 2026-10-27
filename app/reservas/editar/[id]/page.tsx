'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import VinculosReserva from '@/app/components/VinculosReserva';
import LogisticaReserva from '@/app/components/LogisticaReserva';
import PeriodoReservaERN, { validarPeriodoReservaERN } from '@/app/components/PeriodoReservaERN';

import {
  normalizarStatusReservaERN,
  reservaEncerradaERN,
  type StatusReservaERN as StatusReserva,
} from '@/lib/reservasStatusERN';

interface ReservaForm {
  cliente_id: string;
  passeio_id: string;
  horario: string;
  data_fim_prevista: string;
  horario_fim_previsto: string;
  embarcacao_id: string;
  quantidade_pessoas: string;
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
  id: string;
  empresa_id: string | null;
  quantidade_pessoas?: number | null;
  cliente_id?: string | null;
  passeio_id?: string | null;
  horario?: string | null;
  data_fim_prevista?: string | null;
  horario_fim_previsto?: string | null;
  embarcacao_id?: string | null;
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

type Feedback = {
  tipo: 'sucesso' | 'erro';
  mensagem: string;
} | null;

const inputClass =
  'min-h-12 w-full min-w-0 max-w-full rounded-xl border border-white/15 bg-[#07110E] px-4 py-3 text-base text-[#EDEDE3] outline-none transition placeholder:text-[#B4C8BB]/60 focus:border-[#E3A144] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm';

const labelClass =
  'mb-2 block text-sm font-medium text-[#C5D4CA]';

const buttonClass =
  'inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-[#D6E2D9] transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50';

const headingStyle = {
  fontFamily: 'var(--font-fraunces), serif',
};

const formInicial: ReservaForm = {
  cliente_id: '',
  passeio_id: '',
  horario: '',
  data_fim_prevista: '',
  horario_fim_previsto: '',
  embarcacao_id: '',
  quantidade_pessoas: '',
  cliente: '',
  pacote: '',
  dataReserva: '',
  agencia: '',
  guia: '',
  valor: '',
  status: 'Pendente',
  observacoes: '',
};

const normalizarStatus = normalizarStatusReservaERN;

function converterValorMonetario(valor: string): number {
  let texto = valor.trim().replace(/^R\$\s*/i, '');

  if (!texto) return NaN;

  if (texto.includes(',')) {
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(texto)) {
      return NaN;
    }
    texto = texto.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(texto)) {
    texto = texto.replace(/\./g, '');
  } else if (!/^\d+(?:\.\d{1,2})?$/.test(texto)) {
    return NaN;
  }

  const [inteiro, decimal = ''] = texto.split('.');
  const centavos =
    Number(inteiro) * 100 + Number(decimal.padEnd(2, '0'));

  return Number.isSafeInteger(centavos) && centavos >= 0
    ? centavos / 100
    : NaN;
}

function formatarValorCampo(numero: number): string {
  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function valorBancoParaCampo(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '';

  const numero = Number(valor);
  return Number.isFinite(numero) ? formatarValorCampo(numero) : '';
}

function dataISOValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;

  const data = new Date(`${valor}T12:00:00Z`);

  return (
    Number.isFinite(data.getTime()) &&
    data.toISOString().slice(0, 10) === valor
  );
}

function quantidadePessoasValida(valor: string): boolean {
  if (!/^[0-9]+$/.test(valor)) return false;

  const quantidade = Number(valor);

  return (
    Number.isInteger(quantidade) &&
    quantidade >= 1 &&
    quantidade <= 2147483647
  );
}

function mensagemDoErro(erro: unknown, padrao: string): string {
  if (erro instanceof Error) return erro.message;

  if (
    typeof erro === 'object' &&
    erro !== null &&
    'message' in erro &&
    typeof erro.message === 'string'
  ) {
    return erro.message;
  }

  return padrao;
}

async function obterEmpresa(): Promise<string> {
  const { data: auth, error: erroAuth } = await supabase.auth.getUser();

  if (erroAuth || !auth.user) {
    throw new Error('Sua sessão não está disponível. Entre novamente.');
  }

  const { data: perfil, error: erroPerfil } = await supabase
    .from('perfis')
    .select('empresa_id')
    .eq('id', auth.user.id)
    .single();

  if (erroPerfil || !perfil?.empresa_id) {
    throw new Error('Não foi possível identificar sua empresa.');
  }

  return String(perfil.empresa_id);
}

export default function EditarReservaPage() {
  const params = useParams();
  const parametro = params?.id;
  const id = Array.isArray(parametro) ? parametro[0] : parametro;

  return <EditarReservaConteudo key={id ?? 'sem-id'} id={id} />;
}

function EditarReservaConteudo({ id }: { id?: string }) {
  const router = useRouter();

  const [form, setForm] = useState<ReservaForm>(formInicial);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [gravada, setGravada] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [tentativa, setTentativa] = useState(0);
  const [reservaCarregadaId, setReservaCarregadaId] =
    useState<string | null>(null);
  const [empresaCarregada, setEmpresaCarregada] =
    useState<string | null>(null);
  const [statusOriginal, setStatusOriginal] =
    useState<StatusReserva>('Pendente');

  const envioReserva = useRef(false);
  const montado = useRef(true);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const somenteConsultaERN =
    reservaEncerradaERN(statusOriginal) ||
    statusOriginal === 'Desconhecido';

  const bloqueado = loading || salvando || gravada || somenteConsultaERN;

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    if (feedback?.tipo === 'erro') {
      feedbackRef.current?.focus();
      feedbackRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [feedback]);

  useEffect(() => {
    if (!gravada) return;

    const timer = window.setTimeout(() => {
      router.push('/reservas');
      router.refresh();
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [gravada, router]);

  useEffect(() => {
    let ativo = true;

    setReservaCarregadaId(null);
    setEmpresaCarregada(null);
    setFeedback(null);
    setLoading(true);

    if (!id) {
      setLoading(false);
      setFeedback({
        tipo: 'erro',
        mensagem: 'Identificador da reserva não encontrado.',
      });
      return;
    }

    const reservaId = id;

    async function carregar() {
      try {
        const empresaId = await obterEmpresa();

        const { data, error } = await supabase
          .from('reservas')
          .select('*')
          .eq('id', reservaId)
          .eq('empresa_id', empresaId)
          .single();

        if (error) throw error;
        if (!data) {
          throw new Error('Reserva não encontrada ou sem permissão de acesso.');
        }

        if (!ativo) return;

        const reserva = data as ReservaBanco;
        const status = normalizarStatus(reserva.status || reserva.Status);
        const dataBruta = reserva.data_reserva || reserva.data || '';

        setForm({
          cliente_id: reserva.cliente_id ?? '',
          passeio_id: reserva.passeio_id ?? '',
          horario: reserva.horario?.slice(0, 5) ?? '',
          data_fim_prevista: reserva.data_fim_prevista ?? '',
          horario_fim_previsto: reserva.horario_fim_previsto?.slice(0, 5) ?? '',
          embarcacao_id: reserva.embarcacao_id ?? '',
          quantidade_pessoas: reserva.quantidade_pessoas == null
            ? ''
            : String(reserva.quantidade_pessoas),
          cliente: reserva.cliente || reserva.nome_cliente || '',
          pacote: reserva.pacote || reserva.passeio || '',
          dataReserva: dataBruta.split('T')[0],
          agencia: reserva.agencia || reserva.parceiro || '',
          guia: reserva.guia || '',
          valor: valorBancoParaCampo(reserva.valor_total ?? reserva.valor),
          status,
          observacoes: reserva.observacoes || '',
        });

        setStatusOriginal(status);
        setEmpresaCarregada(empresaId);
        setReservaCarregadaId(reservaId);
      } catch (erro) {
        if (!ativo) return;

        setFeedback({
          tipo: 'erro',
          mensagem: mensagemDoErro(
            erro,
            'Não foi possível carregar os dados da reserva.'
          ),
        });
      } finally {
        if (ativo) setLoading(false);
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, [id, tentativa]);

  function alterarCampo(campo: keyof ReservaForm, valor: string) {
    if (envioReserva.current) return;

    setForm((atual) => ({
      ...atual,
      [campo]: valor,
      ...(campo === 'cliente' ? { cliente_id: '' } : {}),
      ...(campo === 'pacote' ? { passeio_id: '' } : {}),
    }));
  }

  function formatarValorAoSair() {
    const numero = converterValorMonetario(form.valor);

    if (Number.isFinite(numero)) {
      alterarCampo('valor', formatarValorCampo(numero));
    }
  }

  async function handleAtualizar(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      envioReserva.current ||
      somenteConsultaERN ||
      loading ||
      gravada ||
      !id ||
      reservaCarregadaId !== id ||
      !empresaCarregada
    ) {
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
          'Preencha cliente, passeio, data do passeio e valor total.',
      });
      return;
    }

    if (!quantidadePessoasValida(form.quantidade_pessoas)) {
      setFeedback({
        tipo: 'erro',
        mensagem: 'Informe uma quantidade inteira de pessoas, maior que zero.',
      });
      return;
    }

    if (!dataISOValida(form.dataReserva)) {
      setFeedback({
        tipo: 'erro',
        mensagem: 'Informe uma data válida para o passeio.',
      });
      return;
    }

    const erroPeriodoERN = validarPeriodoReservaERN(
      form.dataReserva,
      form.horario,
      form.data_fim_prevista,
      form.horario_fim_previsto
    );

    if (erroPeriodoERN) {
      setFeedback({ tipo: 'erro', mensagem: erroPeriodoERN });
      return;
    }

    const valorTratado = converterValorMonetario(form.valor);

    if (!Number.isFinite(valorTratado) || valorTratado < 0) {
      setFeedback({
        tipo: 'erro',
        mensagem: 'Informe um valor válido, com até duas casas decimais.',
      });
      return;
    }

    if (
      form.horario &&
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.horario)
    ) {
      setFeedback({
        tipo: 'erro',
        mensagem: 'Informe um horário válido entre 00:00 e 23:59.',
      });
      return;
    }

    if (!['Pendente', 'Confirmada', 'Cancelada'].includes(form.status)) {
      setFeedback({
        tipo: 'erro',
        mensagem: 'Selecione um status válido.',
      });
      return;
    }

    envioReserva.current = true;
    setSalvando(true);

    let concluido = false;

    try {
      const empresaAtual = await obterEmpresa();

      if (empresaAtual !== empresaCarregada) {
        throw new Error(
          'A empresa da sessão mudou. Reabra a reserva antes de salvar.'
        );
      }

      const payload = {
        quantidade_pessoas: Number(form.quantidade_pessoas),
        cliente_id: form.cliente_id || null,
        passeio_id: form.passeio_id || null,
        horario: form.horario.trim() || null,
        data_fim_prevista: form.data_fim_prevista || null,
        horario_fim_previsto: form.horario_fim_previsto || null,
        embarcacao_id: form.embarcacao_id || null,
        cliente: form.cliente.trim(),
        pacote: form.pacote.trim(),
        data_reserva: form.dataReserva,
        agencia: form.agencia.trim() || null,
        guia: form.guia.trim() || null,
        valor: valorTratado,
        valor_total: valorTratado,
        status: form.status,
        observacoes: form.observacoes.trim() || null,
      };

      const { data, error } = await supabase
        .from('reservas')
        .update(payload)
        .eq('id', id)
        .eq('empresa_id', empresaAtual)
        .select('id')
        .single();

      if (error) throw error;
      if (!data?.id) {
        throw new Error(
          'Não foi possível confirmar a atualização. Reabra a reserva antes de tentar novamente.'
        );
      }

      concluido = true;

      if (!montado.current) return;

      setFeedback({
        tipo: 'sucesso',
        mensagem: form.status === 'Cancelada'
          ? 'Reserva salva como Cancelada. Revise separadamente os vouchers e os lançamentos financeiros vinculados.'
          : 'Reserva atualizada com sucesso.',
      });
      setGravada(true);
    } catch (erro) {
      if (!montado.current) return;

      setFeedback({
        tipo: 'erro',
        mensagem: mensagemDoErro(
          erro,
          'Não foi possível atualizar a reserva.'
        ),
      });
    } finally {
      if (!concluido) {
        envioReserva.current = false;
        if (montado.current) setSalvando(false);
      }
    }
  }

  if (loading) {
    return (
      <div
        role="status"
        className="flex min-h-[60dvh] items-center justify-center bg-[#07110E] px-4 text-sm text-[#C5D4CA]"
      >
        Carregando reserva…
      </div>
    );
  }

  if (!id || reservaCarregadaId !== id || !empresaCarregada) {
    return (
      <main className="min-h-screen bg-[#07110E] px-4 py-8 text-[#EDEDE3]">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-400/25 bg-[#0A1713] p-5">
          <h1 className="text-2xl" style={headingStyle}>
            Não foi possível abrir a reserva
          </h1>
          <p role="alert" className="mt-4 break-words text-sm leading-7 text-red-200">
            {feedback?.mensagem || 'Reserva indisponível.'}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setTentativa((atual) => atual + 1)}
              className={buttonClass}
            >
              Tentar novamente
            </button>
            <Link href="/reservas" className={buttonClass}>
              Voltar às reservas
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const idURL = encodeURIComponent(id);

  return (
    <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      <header className="border-b border-white/10 bg-[#091510]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
              Operação · Reservas
            </p>
            <h1 className="mt-3 text-3xl sm:text-4xl" style={headingStyle}>
              {somenteConsultaERN ? 'Consultar reserva' : 'Editar reserva'}
            </h1>
            <p className="mt-4 max-w-2xl break-words text-sm leading-7 text-[#B4C8BB]">
              Atualize os dados do atendimento, a logística e o status da reserva.
            </p>
          </div>

          {!loading && !salvando && !gravada && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href={`/vouchers?reserva_id=${idURL}`} className={buttonClass}>
                Consultar vouchers
              </Link>
              <Link href={`/financeiro?reserva_id=${idURL}`} className={buttonClass}>
                Consultar financeiro
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
        {feedback && (
          <div
            ref={feedbackRef}
            tabIndex={-1}
            role={feedback.tipo === 'erro' ? 'alert' : 'status'}
            className={`mb-5 rounded-2xl border p-4 text-sm leading-7 outline-none ${
              feedback.tipo === 'sucesso'
                ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
                : 'border-red-400/25 bg-red-400/10 text-red-200'
            }`}
          >
            {feedback.mensagem}
          </div>
        )}

        {somenteConsultaERN && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-sky-400/25 bg-sky-400/10 p-4 text-sm leading-7 text-sky-100"
          >
            {statusOriginal === 'Desconhecido'
              ? 'Status não reconhecido. A edição foi bloqueada para preservar o registro até sua revisão.'
              : `Reserva ${statusOriginal.toLocaleLowerCase('pt-BR')}. Os dados estão disponíveis somente para consulta. O encerramento não comprova pagamento.`}
          </div>
        )}

        <form onSubmit={handleAtualizar} aria-busy={salvando}>
          <fieldset
            disabled={bloqueado}
            className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
          >
            <section className="min-w-0 rounded-2xl border border-white/10 bg-[#0A1713] p-4 sm:p-6">
              <h2 className="text-2xl" style={headingStyle}>
                Atendimento e passeio
              </h2>

              <div className="mt-5 min-w-0 space-y-5">
                <div className="min-w-0">
                  <VinculosReserva
                    clienteId={form.cliente_id}
                    passeioId={form.passeio_id}
                    clienteNome={form.cliente}
                    passeioNome={form.pacote}
                    bloqueado={bloqueado}
                    onChange={(campos) => {
                      if (envioReserva.current) return;
                      setForm((atual) => ({ ...atual, ...campos }));
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="reserva-cliente" className={labelClass}>
                    Cliente *
                  </label>
                  <input
                    id="reserva-cliente"
                    type="text"
                    required
                    value={form.cliente}
                    onChange={(event) => alterarCampo('cliente', event.target.value)}
                    className={inputClass}
                  />
                  {form.cliente_id && (
                    <p className="mt-2 text-xs leading-6 text-[#B4C8BB]">
                      Cliente vinculado ao cadastro. Alterar este nome manualmente remove o vínculo.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="reserva-pacote" className={labelClass}>
                    Pacote / Passeio *
                  </label>
                  <input
                    id="reserva-pacote"
                    type="text"
                    required
                    value={form.pacote}
                    onChange={(event) => alterarCampo('pacote', event.target.value)}
                    className={inputClass}
                  />
                  {form.passeio_id && (
                    <p className="mt-2 text-xs leading-6 text-[#B4C8BB]">
                      Passeio vinculado ao cadastro. Alterar este nome manualmente remove o vínculo.
                    </p>
                  )}
                </div>

                <div className="grid min-w-0 gap-5 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label htmlFor="reserva-data" className={labelClass}>
                      Data do passeio *
                    </label>
                    <input
                      id="reserva-data"
                      type="date"
                      required
                      value={form.dataReserva}
                      onChange={(event) => alterarCampo('dataReserva', event.target.value)}
                      className={`${inputClass} [color-scheme:dark]`}
                    />
                  </div>

                  <div className="min-w-0">
                    <label htmlFor="reserva-pessoas" className={labelClass}>
                      Quantidade de pessoas *
                    </label>
                    <input
                      id="reserva-pessoas"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={2147483647}
                      step={1}
                      required
                      value={form.quantidade_pessoas}
                      onChange={(event) => alterarCampo('quantidade_pessoas', event.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div className="min-w-0 sm:col-span-2">
                    <label htmlFor="reserva-valor" className={labelClass}>
                      Valor comercial total (R$) *
                    </label>
                    <input
                      id="reserva-valor"
                      type="text"
                      inputMode="decimal"
                      required
                      value={form.valor}
                      onChange={(event) => alterarCampo('valor', event.target.value)}
                      onBlur={formatarValorAoSair}
                      placeholder="Ex.: 1.500,00"
                      className={inputClass}
                    />
                    <p className="mt-2 text-xs leading-6 text-[#B4C8BB]">
                      Total da reserva, sem multiplicação automática pela quantidade
                      de pessoas. Este valor não confirma recebimento.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="min-w-0 rounded-2xl border border-white/10 bg-[#0A1713] p-4 sm:p-6">
              <h2 className="text-2xl" style={headingStyle}>
                Operação e status
              </h2>

              <div className="mt-5 min-w-0 space-y-5">
                <div className="min-w-0">
                  <PeriodoReservaERN
                    inicio={form.dataReserva}
                    horarioInicio={form.horario}
                    fim={form.data_fim_prevista}
                    horarioFim={form.horario_fim_previsto}
                    status={form.status}
                    bloqueado={bloqueado}
                    onChange={(campos) => {
                      if (envioReserva.current) return;
                      setForm((atual) => ({ ...atual, ...campos }));
                    }}
                  />
                  <LogisticaReserva
                    horario={form.horario}
                    embarcacaoId={form.embarcacao_id}
                    bloqueado={bloqueado}
                    onChange={(campos) => {
                      if (envioReserva.current) return;
                      setForm((atual) => ({ ...atual, ...campos }));
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="reserva-agencia" className={labelClass}>
                    Agência / Parceiro
                  </label>
                  <input
                    id="reserva-agencia"
                    value={form.agencia}
                    onChange={(event) => alterarCampo('agencia', event.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="reserva-guia" className={labelClass}>
                    Guia responsável
                  </label>
                  <input
                    id="reserva-guia"
                    value={form.guia}
                    onChange={(event) => alterarCampo('guia', event.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="reserva-status" className={labelClass}>
                    Status da reserva
                  </label>
                  <select
                    id="reserva-status"
                    value={form.status}
                    onChange={(event) => alterarCampo('status', event.target.value)}
                    className={inputClass}
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Confirmada">Confirmada</option>
                    <option value="Cancelada">Cancelada</option>
                    {somenteConsultaERN && (
                      <option value={form.status}>{form.status}</option>
                    )}
                  </select>
                </div>

                {form.status === 'Cancelada' && (
                  <div
                    role="status"
                    className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm leading-7 text-amber-200"
                  >
                    {statusOriginal === 'Cancelada'
                      ? 'Esta reserva está cancelada.'
                      : 'Ao salvar, esta reserva ficará cancelada.'}
                    {' '}O histórico será preservado. Revise separadamente os
                    vouchers, as receitas e as despesas vinculadas.
                  </div>
                )}

                {statusOriginal === 'Cancelada' && form.status !== 'Cancelada' && (
                  <p
                    role="status"
                    className="rounded-xl border border-amber-400/25 p-4 text-sm leading-7 text-amber-200"
                  >
                    Você está reativando uma reserva cancelada. Confira a
                    disponibilidade operacional e os registros vinculados antes
                    de salvar.
                  </p>
                )}
              </div>
            </section>

            <section className="min-w-0 rounded-2xl border border-white/10 bg-[#0A1713] p-4 sm:p-6 lg:col-span-2">
              <label htmlFor="reserva-observacoes" className={labelClass}>
                Observações
              </label>
              <textarea
                id="reserva-observacoes"
                rows={5}
                value={form.observacoes}
                onChange={(event) => alterarCampo('observacoes', event.target.value)}
                placeholder="Informações adicionais sobre atendimento, operação ou cancelamento…"
                className={`${inputClass} resize-y leading-7`}
              />
            </section>

            <div className="min-w-0 border-t border-white/10 pt-5 lg:col-span-2">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={bloqueado}
                  onClick={() => router.push('/reservas')}
                  className={buttonClass}
                >
                  Voltar sem salvar
                </button>
                <button
                  type="submit"
                  disabled={bloqueado}
                  className={`${buttonClass} border-[#E3A144] bg-[#E3A144] font-bold text-[#07130F] hover:bg-[#F0B35C]`}
                >
                  {gravada
                    ? 'Salvo · voltando…'
                    : salvando
                      ? 'Salvando…'
                      : form.status === 'Cancelada' && statusOriginal !== 'Cancelada'
                        ? 'Salvar reserva como cancelada'
                        : 'Salvar alterações'}
                </button>
              </div>
            </div>
          </fieldset>
        </form>
      </main>
    </div>
  );
}
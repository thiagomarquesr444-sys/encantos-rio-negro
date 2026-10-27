'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import VinculosReserva from '@/app/components/VinculosReserva';
import LogisticaReserva from '@/app/components/LogisticaReserva';
import PeriodoReservaERN, { validarPeriodoReservaERN } from '@/app/components/PeriodoReservaERN';

type StatusReserva = 'Pendente' | 'Confirmada' | 'Cancelada';

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
  cliente_id: string;
  passeio_id: string;
  horario: string;
  data_fim_prevista: string;
  horario_fim_previsto: string;
  embarcacao_id: string;
  quantidade_pessoas: string;
  cliente: string;
  pacote: string;
  data_reserva: string;
  agencia: string;
  guia: string;
  valor: string;
  status: StatusReserva;
  observacoes: string;
};

const ESTADO_INICIAL: FormReserva = {
  cliente_id: '',
  passeio_id: '',
  horario: '',
  data_fim_prevista: '',
  horario_fim_previsto: '',
  embarcacao_id: '',
  quantidade_pessoas: '1',
  cliente: '',
  pacote: '',
  data_reserva: '',
  agencia: '',
  guia: '',
  valor: '',
  status: 'Pendente',
  observacoes: '',
};

const inputClass =
  'min-h-12 w-full min-w-0 max-w-full rounded-xl border border-white/15 bg-[#07110E] px-4 py-3 text-base text-[#EDEDE3] outline-none transition placeholder:text-[#B4C8BB]/60 focus:border-[#E3A144] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm';

const labelClass =
  'mb-2 block text-sm font-medium text-[#C5D4CA]';

const buttonClass =
  'inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-[#D6E2D9] transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50';

const headingStyle = {
  fontFamily: 'var(--font-fraunces), serif',
};

function converterValor(valor: string): number | null {
  let texto = valor.trim().replace(/^R\$\s*/i, '');

  if (!texto) return null;

  if (texto.includes(',')) {
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(texto)) {
      return null;
    }
    texto = texto.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(texto)) {
    texto = texto.replace(/\./g, '');
  } else if (!/^\d+(?:\.\d{1,2})?$/.test(texto)) {
    return null;
  }

  const [inteiro, decimal = ''] = texto.split('.');
  const centavos =
    Number(inteiro) * 100 + Number(decimal.padEnd(2, '0'));

  return Number.isSafeInteger(centavos) && centavos >= 0
    ? centavos / 100
    : null;
}

function formatarValorCampo(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatarData(valor?: string | null): string {
  if (!valor) return '—';

  const partes = valor.split('T')[0].split('-');
  return partes.length === 3
    ? `${partes[2]}/${partes[1]}/${partes[0]}`
    : valor;
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

export default function NovaReservaPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormReserva>(ESTADO_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [gravada, setGravada] = useState(false);
  const [carregandoUso, setCarregandoUso] = useState(true);
  const [uso, setUso] = useState<UsoReservas | null>(null);
  const [erroUso, setErroUso] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const envioReserva = useRef(false);
  const montado = useRef(true);
  const empresaDoUso = useRef<string | null>(null);
  const versaoUso = useRef(0);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    montado.current = true;

    return () => {
      montado.current = false;
      versaoUso.current += 1;
    };
  }, []);

  const carregarUsoReservas = useCallback(async () => {
    const versao = ++versaoUso.current;

    setCarregandoUso(true);
    setErroUso(null);
    setUso(null);
    empresaDoUso.current = null;

    try {
      const empresaId = await obterEmpresa();

      const { data, error } = await supabase.rpc(
        'get_meu_uso_reservas_mes'
      );

      if (error) throw error;

      const resultado = Array.isArray(data) ? data[0] : data;

      if (!resultado) {
        throw new Error(
          'Não foi possível identificar o uso mensal desta assinatura.'
        );
      }

      const total = Number(resultado.total_reservas_mes ?? 0);
      const limite = resultado.limite_reservas_mes == null
        ? null
        : Number(resultado.limite_reservas_mes);
      const percentual = resultado.percentual_uso == null
        ? null
        : Number(resultado.percentual_uso);

      if (
        !Number.isSafeInteger(total) ||
        total < 0 ||
        (limite !== null &&
          (!Number.isSafeInteger(limite) || limite < 0)) ||
        (percentual !== null && !Number.isFinite(percentual))
      ) {
        throw new Error('A consulta retornou dados de uso inválidos.');
      }

      if (!montado.current || versao !== versaoUso.current) return;

      empresaDoUso.current = empresaId;

      setUso({
        plano_codigo: String(resultado.plano_codigo ?? ''),
        plano_nome: String(resultado.plano_nome ?? 'Plano atual'),
        total_reservas_mes: total,
        limite_reservas_mes: limite,
        ilimitado: Boolean(resultado.ilimitado),
        percentual_uso: percentual,
        inicio_periodo: String(resultado.inicio_periodo ?? ''),
        fim_periodo: String(resultado.fim_periodo ?? ''),
      });
    } catch (erro) {
      if (!montado.current || versao !== versaoUso.current) return;

      setUso(null);
      setErroUso(
        mensagemDoErro(
          erro,
          'Não foi possível consultar o limite mensal neste momento.'
        )
      );
    } finally {
      if (montado.current && versao === versaoUso.current) {
        setCarregandoUso(false);
      }
    }
  }, []);

  useEffect(() => {
    void carregarUsoReservas();
  }, [carregarUsoReservas]);

  useEffect(() => {
    if (feedback?.tipo !== 'erro') return;

    feedbackRef.current?.focus();
    feedbackRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [feedback]);

  useEffect(() => {
    if (!gravada) return;

    const timer = window.setTimeout(() => {
      router.push('/reservas');
      router.refresh();
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [gravada, router]);

  const limiteAtingido = Boolean(
    uso &&
    !uso.ilimitado &&
    uso.limite_reservas_mes !== null &&
    uso.total_reservas_mes >= uso.limite_reservas_mes
  );

  const percentualVisual = Math.min(
    100,
    Math.max(0, uso?.percentual_uso ?? 0)
  );

  const restantes =
    uso && !uso.ilimitado && uso.limite_reservas_mes !== null
      ? Math.max(uso.limite_reservas_mes - uso.total_reservas_mes, 0)
      : null;

  const bloqueado = salvando || gravada || limiteAtingido;
  const bloqueadoSalvar = bloqueado || carregandoUso;

  function alterarCampo(campo: keyof FormReserva, valor: string) {
    if (envioReserva.current) return;

    setForm((atual) => ({
      ...atual,
      [campo]: valor,
      ...(campo === 'cliente' ? { cliente_id: '' } : {}),
      ...(campo === 'pacote' ? { passeio_id: '' } : {}),
    }));
  }

  function limpar() {
    if (envioReserva.current) return;
    setForm({ ...ESTADO_INICIAL });
    setFeedback(null);
  }

  function formatarValorAoSair() {
    const numero = converterValor(form.valor);

    if (numero !== null) {
      alterarCampo('valor', formatarValorCampo(numero));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (envioReserva.current || gravada || carregandoUso) return;

    setFeedback(null);

    if (limiteAtingido) {
      setFeedback({
        tipo: 'erro',
        mensagem: 'O limite mensal de reservas do seu plano foi atingido.',
      });
      return;
    }

    if (
      !form.cliente.trim() ||
      !form.pacote.trim() ||
      !form.data_reserva ||
      !form.valor.trim()
    ) {
      setFeedback({
        tipo: 'erro',
        mensagem: 'Preencha cliente, passeio, data do passeio e valor total.',
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

    if (!dataISOValida(form.data_reserva)) {
      setFeedback({
        tipo: 'erro',
        mensagem: 'Informe uma data válida para o passeio.',
      });
      return;
    }

    const erroPeriodoERN = validarPeriodoReservaERN(
      form.data_reserva,
      form.horario,
      form.data_fim_prevista,
      form.horario_fim_previsto
    );

    if (erroPeriodoERN) {
      setFeedback({ tipo: 'erro', mensagem: erroPeriodoERN });
      return;
    }

    const valorTratado = converterValor(form.valor);

    if (valorTratado === null || valorTratado < 0) {
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
      const empresaId = await obterEmpresa();

      if (
        empresaDoUso.current &&
        empresaDoUso.current !== empresaId
      ) {
        throw new Error(
          'A empresa da sessão mudou. Reabra o cadastro antes de salvar.'
        );
      }

      const { data, error } = await supabase
        .from('reservas')
        .insert({
          empresa_id: empresaId,
          cliente_id: form.cliente_id || null,
          passeio_id: form.passeio_id || null,
          horario: form.horario.trim() || null,
        data_fim_prevista: form.data_fim_prevista || null,
        horario_fim_previsto: form.horario_fim_previsto || null,
          embarcacao_id: form.embarcacao_id || null,
          cliente: form.cliente.trim(),
          pacote: form.pacote.trim(),
          quantidade_pessoas: Number(form.quantidade_pessoas),
          data_reserva: form.data_reserva,
          agencia: form.agencia.trim() || null,
          guia: form.guia.trim() || null,
          valor: valorTratado,
          valor_total: valorTratado,
          status: form.status,
          observacoes: form.observacoes.trim() || null,
        })
        .select('id')
        .single();

      if (error) throw error;

      if (!data?.id) {
        throw new Error(
          'Não foi possível confirmar a criação. Confira a listagem antes de tentar novamente.'
        );
      }

      concluido = true;

      if (!montado.current) return;

      setGravada(true);
      setFeedback({
        tipo: 'sucesso',
        mensagem: 'Reserva cadastrada com sucesso. Voltando à listagem…',
      });
    } catch (erro) {
      if (!montado.current) return;

      const mensagem = mensagemDoErro(
        erro,
        'Não foi possível salvar a reserva.'
      );

      if (mensagem.includes('ERN_LIMITE_RESERVAS_MES_ATINGIDO')) {
        setFeedback({
          tipo: 'erro',
          mensagem:
            'O limite mensal de reservas do seu plano foi atingido. Consulte os planos para ampliar a franquia.',
        });
        await carregarUsoReservas();
      } else if (mensagem.includes('ERN_ASSINATURA_NAO_ENCONTRADA')) {
        setFeedback({
          tipo: 'erro',
          mensagem: 'Não foi encontrada uma assinatura ativa para esta empresa.',
        });
      } else if (mensagem.includes('ERN_USUARIO_SEM_EMPRESA')) {
        setFeedback({
          tipo: 'erro',
          mensagem: 'Seu usuário não possui uma empresa vinculada.',
        });
      } else {
        setFeedback({ tipo: 'erro', mensagem });
      }
    } finally {
      if (!concluido) {
        envioReserva.current = false;
        if (montado.current) setSalvando(false);
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      <header className="border-b border-white/10 bg-[#091510]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
              Operação · Reservas
            </p>
            <h1 className="mt-3 text-3xl sm:text-4xl" style={headingStyle}>
              Nova reserva
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#B4C8BB]">
              Registre cliente, passeio, participantes, logística e valor
              comercial da operação.
            </p>
          </div>
          <button
            type="button"
            disabled={salvando || gravada}
            onClick={() => router.push('/reservas')}
            className={buttonClass}
          >
            Voltar às reservas
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-5 min-w-0 rounded-2xl border border-white/10 bg-[#0A1713] p-4 sm:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#E3A144]">
                Uso mensal do plano
              </p>
              <h2 className="mt-3 break-words text-2xl" style={headingStyle}>
                {carregandoUso
                  ? 'Consultando limite…'
                  : uso?.ilimitado
                    ? `${uso.total_reservas_mes} reservas neste mês`
                    : uso && uso.limite_reservas_mes !== null
                      ? `${uso.total_reservas_mes} de ${uso.limite_reservas_mes} reservas`
                      : uso
                        ? `${uso.total_reservas_mes} reservas · limite não informado`
                        : 'Uso indisponível'}
              </h2>

              {uso && (
                <>
                  <p className="mt-2 break-words text-sm text-[#C5D4CA]">
                    {uso.plano_nome}
                    {uso.ilimitado ? ' · Sem limite mensal de reservas' : ''}
                  </p>
                  <p className="mt-2 text-xs leading-6 text-[#B4C8BB]">
                    Período: {formatarData(uso.inicio_periodo)} até{' '}
                    {formatarData(uso.fim_periodo)}
                  </p>
                  {restantes !== null && (
                    <p className="mt-1 text-xs leading-6 text-[#B4C8BB]">
                      {restantes} reserva(s) restante(s) neste período.
                    </p>
                  )}
                </>
              )}
            </div>

            {uso && !uso.ilimitado && uso.limite_reservas_mes !== null && (
              <div className="w-full min-w-0 rounded-xl border border-white/10 p-4 md:max-w-xs">
                <div className="flex flex-wrap justify-between gap-3 text-sm">
                  <span className="text-[#B4C8BB]">Consumo mensal</span>
                  <strong className="text-[#F4C77E]">
                    {percentualVisual.toFixed(1)}%
                  </strong>
                </div>
                <div
                  role="progressbar"
                  aria-label="Consumo da franquia mensal de reservas"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percentualVisual}
                  className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"
                >
                  <div
                    className="h-full rounded-full bg-[#E3A144] transition-all"
                    style={{ width: `${percentualVisual}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {erroUso && (
            <div role="status" className="mt-4 rounded-xl border border-amber-400/25 p-4 text-sm leading-7 text-amber-200">
              <p>{erroUso}</p>
              <p className="mt-2">
                A consulta de uso está indisponível. A tentativa de cadastro
                continuará sujeita às regras do servidor.
              </p>
            </div>
          )}

          {!gravada && (
            <button
              type="button"
              disabled={carregandoUso || salvando}
              onClick={() => void carregarUsoReservas()}
              className={`${buttonClass} mt-4`}
            >
              {carregandoUso ? 'Consultando…' : 'Atualizar uso do plano'}
            </button>
          )}
        </section>

        {limiteAtingido && (
          <section className="mb-5 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 sm:p-5">
            <h2 className="text-xl text-[#F4C77E]" style={headingStyle}>
              Limite mensal atingido
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#C5D4CA]">
              O cadastro de novas reservas está bloqueado para este período.
              As reservas existentes continuam disponíveis.
            </p>
            <button
              type="button"
              disabled={salvando}
              onClick={() => router.push('/planos')}
              className={`${buttonClass} mt-4`}
            >
              Consultar planos
            </button>
          </section>
        )}

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

        <form onSubmit={handleSubmit} aria-busy={salvando}>
          <fieldset
            disabled={bloqueado}
            className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
          >
            <section className="min-w-0 rounded-2xl border border-white/10 bg-[#0A1713] p-4 sm:p-6">
              <h2 className="text-2xl" style={headingStyle}>
                Atendimento e passeio
              </h2>
              <p className="mt-2 text-xs text-[#B4C8BB]">
                * Campos obrigatórios
              </p>

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
                  <label htmlFor="nova-cliente" className={labelClass}>
                    Cliente *
                  </label>
                  <input
                    id="nova-cliente"
                    required
                    value={form.cliente}
                    onChange={(event) => alterarCampo('cliente', event.target.value)}
                    placeholder="Nome do cliente"
                    className={inputClass}
                  />
                  {form.cliente_id && (
                    <p className="mt-2 text-xs leading-6 text-[#B4C8BB]">
                      Cliente vinculado ao cadastro. Alterar o nome manualmente
                      remove esse vínculo.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="nova-pacote" className={labelClass}>
                    Pacote / Passeio *
                  </label>
                  <input
                    id="nova-pacote"
                    required
                    value={form.pacote}
                    onChange={(event) => alterarCampo('pacote', event.target.value)}
                    placeholder="Experiência ou pacote contratado"
                    className={inputClass}
                  />
                  {form.passeio_id && (
                    <p className="mt-2 text-xs leading-6 text-[#B4C8BB]">
                      Passeio vinculado ao cadastro. Alterar o nome manualmente
                      remove esse vínculo.
                    </p>
                  )}
                </div>

                <div className="grid min-w-0 gap-5 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label htmlFor="nova-data" className={labelClass}>
                      Data do passeio *
                    </label>
                    <input
                      id="nova-data"
                      type="date"
                      required
                      value={form.data_reserva}
                      onChange={(event) => alterarCampo('data_reserva', event.target.value)}
                      className={`${inputClass} [color-scheme:dark]`}
                    />
                  </div>

                  <div className="min-w-0">
                    <label htmlFor="nova-pessoas" className={labelClass}>
                      Quantidade de pessoas *
                    </label>
                    <input
                      id="nova-pessoas"
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
                    <label htmlFor="nova-valor" className={labelClass}>
                      Valor comercial total (R$) *
                    </label>
                    <input
                      id="nova-valor"
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
                      Total da reserva, sem multiplicação automática pela
                      quantidade de pessoas. Não confirma recebimento.
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
                    inicio={form.data_reserva}
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
                  <label htmlFor="nova-agencia" className={labelClass}>
                    Agência / Parceiro
                  </label>
                  <input
                    id="nova-agencia"
                    value={form.agencia}
                    onChange={(event) => alterarCampo('agencia', event.target.value)}
                    placeholder="Opcional"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="nova-guia" className={labelClass}>
                    Guia responsável
                  </label>
                  <input
                    id="nova-guia"
                    value={form.guia}
                    onChange={(event) => alterarCampo('guia', event.target.value)}
                    placeholder="Opcional"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="nova-status" className={labelClass}>
                    Status da reserva
                  </label>
                  <select
                    id="nova-status"
                    value={form.status}
                    onChange={(event) => alterarCampo('status', event.target.value)}
                    className={inputClass}
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Confirmada">Confirmada</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </div>

                {form.status === 'Cancelada' && (
                  <p
                    role="status"
                    className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm leading-7 text-amber-200"
                  >
                    A reserva será cadastrada com status Cancelada.
                    Se você quer apenas sair do formulário, use Voltar sem salvar.
                  </p>
                )}
              </div>
            </section>

            <section className="min-w-0 rounded-2xl border border-white/10 bg-[#0A1713] p-4 sm:p-6 lg:col-span-2">
              <label htmlFor="nova-observacoes" className={labelClass}>
                Observações
              </label>
              <textarea
                id="nova-observacoes"
                rows={5}
                value={form.observacoes}
                onChange={(event) => alterarCampo('observacoes', event.target.value)}
                placeholder="Informações logísticas, solicitações especiais ou observações…"
                className={`${inputClass} resize-y leading-7`}
              />
            </section>

            <div className="min-w-0 border-t border-white/10 pt-5 lg:col-span-2">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={salvando || gravada}
                  onClick={() => router.push('/reservas')}
                  className={buttonClass}
                >
                  Voltar sem salvar
                </button>

                <button
                  type="button"
                  disabled={bloqueado}
                  onClick={limpar}
                  className={buttonClass}
                >
                  Limpar formulário
                </button>

                <button
                  type="submit"
                  disabled={bloqueadoSalvar}
                  className={`${buttonClass} border-[#E3A144] bg-[#E3A144] font-bold text-[#07130F] hover:bg-[#F0B35C]`}
                >
                  {gravada
                    ? 'Salvo · voltando…'
                    : salvando
                      ? 'Salvando…'
                      : limiteAtingido
                        ? 'Limite mensal atingido'
                        : carregandoUso
                          ? 'Verificando plano…'
                          : 'Salvar reserva'}
                </button>
              </div>
            </div>
          </fieldset>
        </form>
      </main>
    </div>
  );
}
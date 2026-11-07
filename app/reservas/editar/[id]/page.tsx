'use client';
import '../../reservas-premium.css';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import VinculosReserva from '@/app/components/VinculosReserva';
import SeletorSaidaEDA from '@/app/components/SeletorSaidaEDA';
import ParticipantesReservaEDA from '@/app/components/ParticipantesReservaEDA';
import HospedagemReservaEDA from '@/app/components/HospedagemReservaEDA';
import { AlertaRecursosReservaEDA } from '@/app/components/AgendaRecursoEDA';
import { ParceiroReservaEDA } from '@/app/components/ParceirosComissaoEDA';
import { FinanceiroReservaEDA } from '@/app/components/FinanceiroConectadoEDA';
import { mensagemSaidaEDA } from '@/lib/saidasGestaoEDA';
import LogisticaReserva from '@/app/components/LogisticaReserva';
import PeriodoReservaERN, { validarPeriodoReservaERN } from '@/app/components/PeriodoReservaERN';
import { CabecalhoEDA, PaginaEDA, PillEDA, type TomEDA } from '@/app/components/PadraoPaginaEDA';
import { FormChegadaEDA } from '@/app/components/ChegadaReservaEDA';
import type { PoliticaCriancasEDA } from '@/lib/opcoesEDA';

import {
  normalizarStatusReservaERN,
  reservaEncerradaERN,
  type StatusReservaERN as StatusReserva,
} from '@/lib/reservasStatusERN';

interface ReservaForm {
  cliente_id: string;
  passeio_id: string;
  saida_id: string;
  horario: string;
  data_fim_prevista: string;
  horario_fim_previsto: string;
  embarcacao_id: string;
  quantidade_pessoas: string;
  qtd_criancas: string;
  qtd_colo: string;
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
  qtd_criancas?: number | null;
  qtd_colo?: number | null;
  cliente_id?: string | null;
  passeio_id?: string | null;
  saida_id?: string | null;
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

// ERN_PADRAO_FORMULARIOS_EDA_V1: campos e botões no padrão da gestão.
const inputClass = 'eda-pg-input w-full min-w-0 px-4 py-3';
const labelClass = 'mb-2 block';
const buttonClass = 'eda-pg-bt';

const TOM_STATUS: Record<StatusReserva, TomEDA> = {
  Pendente: 'at',
  Confirmada: 'ok',
  Cancelada: 'er',
  Concluída: 'info',
  'Não compareceu': 'at',
  Desconhecido: 'nt',
};

const formInicial: ReservaForm = {
  cliente_id: '',
  passeio_id: '',
  saida_id: '',
  horario: '',
  data_fim_prevista: '',
  horario_fim_previsto: '',
  embarcacao_id: '',
  quantidade_pessoas: '',
  qtd_criancas: '0',
  qtd_colo: '0',
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
  // EDA_FAMILIA_RESERVA_V1: política de crianças do passeio vinculado.
  const [politicaEdicao, setPoliticaEdicao] = useState<PoliticaCriancasEDA | null>(null);
  useEffect(() => {
    let ativo = true;
    setPoliticaEdicao(null);
    if (!form.passeio_id) return;
    supabase.from('passeios').select('preco_modalidade,crianca_idade_max,crianca_percentual,colo_idade_max').eq('id', form.passeio_id).maybeSingle()
      .then(({ data }) => {
        if (!ativo || !data || data.preco_modalidade !== 'por_pessoa') return;
        if (data.crianca_idade_max != null || data.colo_idade_max != null) setPoliticaEdicao(data as PoliticaCriancasEDA);
      });
    return () => { ativo = false; };
  }, [form.passeio_id]);
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
          saida_id: reserva.saida_id ?? '',
          horario: reserva.horario?.slice(0, 5) ?? '',
          data_fim_prevista: reserva.data_fim_prevista ?? '',
          horario_fim_previsto: reserva.horario_fim_previsto?.slice(0, 5) ?? '',
          embarcacao_id: reserva.embarcacao_id ?? '',
          quantidade_pessoas: reserva.quantidade_pessoas == null
            ? ''
            : String(reserva.quantidade_pessoas),
          qtd_criancas: String(reserva.qtd_criancas ?? 0),
          qtd_colo: String(reserva.qtd_colo ?? 0),
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
      ...(campo === 'pacote' ? { passeio_id: '', saida_id: '' } : {}),
      ...(campo === 'dataReserva' || campo === 'horario' ? { saida_id: '' } : {}),
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

    if ((Number(form.qtd_criancas) || 0) + (Number(form.qtd_colo) || 0) > (Number(form.quantidade_pessoas) || 0)) {
      setFeedback({ tipo: 'erro', mensagem: 'Crianças e colo não podem passar do total de pessoas.' });
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
        qtd_criancas: Math.max(0, Number(form.qtd_criancas) || 0),
        qtd_colo: Math.max(0, Number(form.qtd_colo) || 0),
        cliente_id: form.cliente_id || null,
        passeio_id: form.passeio_id || null,
        saida_id: (form.passeio_id && form.saida_id) || null,
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
        mensagem: mensagemSaidaEDA(mensagemDoErro(erro, '')) ?? mensagemDoErro(
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
      <PaginaEDA className="eda-pg-auto">
        <div className="eda-pg-miolo">
          <p role="status" className="eda-pg-estado">Carregando reserva…</p>
        </div>
      </PaginaEDA>
    );
  }

  if (!id || reservaCarregadaId !== id || !empresaCarregada) {
    return (
      <PaginaEDA className="eda-pg-auto">
        <div className="eda-pg-miolo" style={{ maxWidth: 720 }}>
          <Link href="/reservas" className="eda-pg-voltar">← Reservas</Link>
          <section className="eda-pg-secao">
            <h2>Não foi possível abrir a reserva</h2>
            <p role="alert" className="eda-pg-aviso eda-pg-aviso-er">{feedback?.mensagem || 'Reserva indisponível.'}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              <button type="button" onClick={() => setTentativa((atual) => atual + 1)} className="eda-pg-bt">Tentar novamente</button>
              <Link href="/reservas" className="eda-pg-bt">Voltar às reservas</Link>
            </div>
          </section>
        </div>
      </PaginaEDA>
    );
  }

  const idURL = encodeURIComponent(id);

  return (
    <PaginaEDA className="eda-pg-auto">
      <div className="eda-pg-miolo" style={{ maxWidth: 1200 }}>
        <Link href="/reservas" className="eda-pg-voltar">← Reservas</Link>

        <CabecalhoEDA
          capa
          etiqueta={`Reserva · ${form.dataReserva ? form.dataReserva.split('-').reverse().join('/') : 'sem data'}`}
          titulo={somenteConsultaERN ? 'Consultar reserva' : 'Editar reserva'}
          resumo={<>
            <b>{form.cliente || 'Cliente não informado'}</b> · {form.pacote || 'Passeio não informado'}
            {' '}<span style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: 6 }}><PillEDA tom={TOM_STATUS[statusOriginal]}>{statusOriginal}</PillEDA></span>
          </>}
          acoes={!salvando && !gravada ? (
            <>
              <Link href={`/vouchers?reserva_id=${idURL}`} className="eda-pg-bt">Vouchers</Link>
              <Link href={`/financeiro?reserva_id=${idURL}`} className="eda-pg-bt">Financeiro</Link>
            </>
          ) : undefined}
        />

        {feedback && (
          <div
            ref={feedbackRef}
            tabIndex={-1}
            role={feedback.tipo === 'erro' ? 'alert' : 'status'}
            className={`eda-pg-aviso ${feedback.tipo === 'erro' ? 'eda-pg-aviso-er' : ''}`}
            style={feedback.tipo === 'sucesso' ? { color: 'var(--p-verde)', outline: 'none' } : { outline: 'none' }}
          >
            {feedback.mensagem}
          </div>
        )}

        {somenteConsultaERN && (
          <div role="status" className="eda-pg-aviso" style={{ color: 'var(--p-azul)' }}>
            {statusOriginal === 'Desconhecido'
              ? 'Status não reconhecido. A edição foi bloqueada para preservar o registro até sua revisão.'
              : `Reserva ${statusOriginal.toLocaleLowerCase('pt-BR')}. Os dados estão disponíveis somente para consulta. O encerramento não comprova pagamento.`}
          </div>
        )}

        <form onSubmit={handleAtualizar} aria-busy={salvando}>
          <fieldset disabled={bloqueado} style={{ margin: 0, padding: 0, border: 0, minWidth: 0 }}>
            <div className="eda-pg-grade-form">
              <section className="eda-pg-secao">
                <p className="eda-pg-secao-eb">Atendimento</p>
                <h2>Cliente e passeio</h2>
                <p className="eda-pg-secao-txt">Vincule ao cadastro ou escreva o nome. Campos com * são obrigatórios.</p>

                <div style={{ display: 'grid', gap: 18 }}>
                  <VinculosReserva
                    clienteId={form.cliente_id}
                    passeioId={form.passeio_id}
                    clienteNome={form.cliente}
                    passeioNome={form.pacote}
                    guiaNome={form.guia}
                    bloqueado={bloqueado}
                    onChange={(campos) => {
                      if (envioReserva.current) return;
                      setForm((atual) => ({
                        ...atual,
                        ...campos,
                        ...('passeio_id' in campos && campos.passeio_id !== atual.passeio_id ? { saida_id: '' } : {}),
                      }));
                    }}
                  />

                <AlertaRecursosReservaEDA reservaId={id} embarcacaoId={form.embarcacao_id || undefined} />
                <SeletorSaidaEDA
                  passeioId={form.passeio_id}
                  saidaId={form.saida_id}
                  pessoas={Number(form.quantidade_pessoas) || 1}
                  reservaId={id}
                  bloqueado={bloqueado}
                  onEscolher={(saida) => {
                    if (envioReserva.current) return;
                    setForm((atual) => saida
                      ? {
                          ...atual,
                          saida_id: saida.id,
                          dataReserva: saida.data_inicio,
                          horario: saida.horario?.slice(0, 5) ?? atual.horario,
                          data_fim_prevista: saida.data_fim ?? atual.data_fim_prevista,
                        }
                      : { ...atual, saida_id: '' });
                  }}
                />

                  <div>
                    <label htmlFor="reserva-cliente" className={labelClass}>Cliente *</label>
                    <input id="reserva-cliente" type="text" required value={form.cliente} onChange={(event) => alterarCampo('cliente', event.target.value)} className={inputClass} />
                    {form.cliente_id && <p className="eda-pg-nota">Cliente vinculado ao cadastro. Alterar este nome manualmente remove o vínculo.</p>}
                  </div>

                  <div>
                    <label htmlFor="reserva-pacote" className={labelClass}>Pacote / Passeio *</label>
                    <input id="reserva-pacote" type="text" required value={form.pacote} onChange={(event) => alterarCampo('pacote', event.target.value)} className={inputClass} />
                    {form.passeio_id && <p className="eda-pg-nota">Passeio vinculado ao cadastro. Alterar este nome manualmente remove o vínculo.</p>}
                  </div>

                  <div className="eda-pg-form-2">
                    <div>
                      <label htmlFor="reserva-data" className={labelClass}>Data do passeio *</label>
                      <input id="reserva-data" type="date" required value={form.dataReserva} readOnly={!!form.saida_id} onChange={(event) => alterarCampo('dataReserva', event.target.value)} className={`${inputClass} ${form.saida_id ? 'opacity-70' : ''}`} />
                      {form.saida_id && <p className="mt-2 text-xs leading-6 text-[#B4C8BB]">Definida pela saída escolhida.</p>}
                    </div>
                    <div>
                      <label htmlFor="reserva-pessoas" className={labelClass}>Quantidade de pessoas *</label>
                      <input id="reserva-pessoas" type="number" inputMode="numeric" min={1} max={2147483647} step={1} required value={form.quantidade_pessoas} onChange={(event) => alterarCampo('quantidade_pessoas', event.target.value)} className={inputClass} />
                      {politicaEdicao && (
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          {politicaEdicao.crianca_idade_max != null && (
                            <label className="text-xs text-[#B4C8BB]">Crianças (até {politicaEdicao.crianca_idade_max} anos, {Number(politicaEdicao.crianca_percentual)}%)
                              <input type="number" min={0} value={form.qtd_criancas} onChange={(event) => alterarCampo('qtd_criancas', event.target.value)} className={`${inputClass} mt-1`} />
                            </label>
                          )}
                          {politicaEdicao.colo_idade_max != null && (
                            <label className="text-xs text-[#B4C8BB]">De colo (até {politicaEdicao.colo_idade_max} anos, sem custo)
                              <input type="number" min={0} value={form.qtd_colo} onChange={(event) => alterarCampo('qtd_colo', event.target.value)} className={`${inputClass} mt-1`} />
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reserva-valor" className={labelClass}>Valor comercial total (R$) *</label>
                    <input id="reserva-valor" type="text" inputMode="decimal" required value={form.valor} onChange={(event) => alterarCampo('valor', event.target.value)} onBlur={formatarValorAoSair} placeholder="Ex.: 1.500,00" className={inputClass} />
                    <p className="eda-pg-nota">Total da reserva, sem multiplicação automática pela quantidade de pessoas. Este valor não confirma recebimento.</p>
                  </div>
                </div>
              </section>

              <section className="eda-pg-secao">
                <p className="eda-pg-secao-eb">Operação</p>
                <h2>Período, logística e status</h2>
                <p className="eda-pg-secao-txt">Horários de saída e retorno, embarcação e situação da reserva.</p>

                <div style={{ display: 'grid', gap: 18 }}>
                  <div>
                    <PeriodoReservaERN
                      inicio={form.dataReserva}
                      horarioInicio={form.horario}
                      fim={form.data_fim_prevista}
                      horarioFim={form.horario_fim_previsto}
                      status={form.status}
                      bloqueado={bloqueado || !!form.saida_id}
                      onChange={(campos) => {
                        if (envioReserva.current) return;
                        setForm((atual) => ({ ...atual, ...campos }));
                      }}
                    />
                    <LogisticaReserva
                      horario={form.horario}
                      horarioDaSaida={!!form.saida_id}
                      embarcacaoId={form.embarcacao_id}
                      bloqueado={bloqueado}
                      onChange={(campos) => {
                        if (envioReserva.current) return;
                        setForm((atual) => ({ ...atual, ...campos }));
                      }}
                    />
                  </div>

                  <div>
                    <label htmlFor="reserva-agencia" className={labelClass}>Agência / Parceiro</label>
                    <input id="reserva-agencia" value={form.agencia} onChange={(event) => alterarCampo('agencia', event.target.value)} className={inputClass} />
                  </div>

                  <div>
                    <label htmlFor="reserva-status" className={labelClass}>Status da reserva</label>
                    <select id="reserva-status" value={form.status} onChange={(event) => alterarCampo('status', event.target.value)} className={inputClass}>
                      <option value="Pendente">Pendente</option>
                      <option value="Confirmada">Confirmada</option>
                      <option value="Cancelada">Cancelada</option>
                      {somenteConsultaERN && <option value={form.status}>{form.status}</option>}
                    </select>
                  </div>

                  {form.status === 'Cancelada' && (
                    <div role="status" className="eda-pg-aviso eda-pg-aviso-at" style={{ margin: 0 }}>
                      {statusOriginal === 'Cancelada' ? 'Esta reserva está cancelada.' : 'Ao salvar, esta reserva ficará cancelada.'}
                      {' '}O histórico será preservado. Revise separadamente os vouchers, as receitas e as despesas vinculadas.
                    </div>
                  )}

                  {statusOriginal === 'Cancelada' && form.status !== 'Cancelada' && (
                    <p role="status" className="eda-pg-aviso eda-pg-aviso-at" style={{ margin: 0 }}>
                      Você está reativando uma reserva cancelada. Confira a disponibilidade operacional e os registros vinculados antes de salvar.
                    </p>
                  )}
                </div>
              </section>

              <section className="eda-pg-secao eda-pg-largo">
                <p className="eda-pg-secao-eb">Anotações</p>
                <label htmlFor="reserva-observacoes" className={labelClass}>Observações</label>
                <textarea
                  id="reserva-observacoes"
                  rows={5}
                  value={form.observacoes}
                  onChange={(event) => alterarCampo('observacoes', event.target.value)}
                  placeholder="Informações adicionais sobre atendimento, operação ou cancelamento…"
                  className={`${inputClass} resize-y`}
                />
              </section>
            </div>

          </fieldset>
          <div className="eda-pg-barra">
            <p>{somenteConsultaERN ? 'Somente consulta.' : 'As alterações só valem depois de salvar.'}</p>
            <div>
              <button type="button" disabled={salvando || gravada} onClick={() => router.push('/reservas')} className="eda-pg-bt">
                {somenteConsultaERN ? 'Voltar' : 'Voltar sem salvar'}
              </button>
              {!somenteConsultaERN && (
                <button type="submit" disabled={bloqueado} className="eda-pg-bt eda-pg-bt-ouro">
                  {gravada
                    ? 'Salvo · voltando…'
                    : salvando
                      ? 'Salvando…'
                      : form.status === 'Cancelada' && statusOriginal !== 'Cancelada'
                        ? 'Salvar como cancelada'
                        : 'Salvar alterações'}
                </button>
              )}
            </div>
          </div>
        </form>

        {/* ERN_RESERVA_CHEGADAS_V1: chegada e transfer, salvos à parte da reserva. */}
        <div className="eda-pg-grade-form" style={{ marginTop: 16 }}>
          <FormChegadaEDA reservaId={id} bloqueado={somenteConsultaERN || salvando || gravada} pessoas={form.quantidade_pessoas} />
        </div>

        {/* EDA_FICHA_SAUDE_V1: participantes e ficha de saúde, salvos à parte. */}
        <div className="eda-pg-grade-form" style={{ marginTop: 16 }}>
          <ParticipantesReservaEDA reservaId={id} bloqueado={somenteConsultaERN || salvando || gravada} pessoas={form.quantidade_pessoas} />
        </div>

        {/* EDA_HOSPEDAGENS_PREMIUM_V1: noites reservadas, salvas à parte. */}
        <div className="eda-pg-grade-form" style={{ marginTop: 16 }}>
          <HospedagemReservaEDA reservaId={id} bloqueado={somenteConsultaERN || salvando || gravada}
            pessoas={form.quantidade_pessoas} dataInicio={form.dataReserva} dataFim={form.data_fim_prevista} />
        </div>

        {/* EDA_VOUCHERS_PARCEIROS_V1: parceiro e comissão, salvos à parte. */}
        <div className="eda-pg-grade-form" style={{ marginTop: 16 }}>
          <ParceiroReservaEDA reservaId={id} bloqueado={somenteConsultaERN || salvando || gravada} />
        </div>

        {/* EDA_FINANCEIRO_CONECTADO_V1: pagamentos da reserva. */}
        <div className="eda-pg-grade-form" style={{ marginTop: 16 }}>
          <FinanceiroReservaEDA reservaId={id} bloqueado={somenteConsultaERN || salvando || gravada} />
        </div>
      </div>
    </PaginaEDA>
  );
}

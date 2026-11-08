'use client';

// ERN_INICIO_OPERADORA_PREMIUM_V1
// Página inicial do painel da operadora (Encantos Gestão): resumo do dia,
// números principais, agenda do rio, pendências com ação, financeiro,
// demandas, Rede EDA, cadastros e plano. As cores vêm do tema da empresa
// (Noite ou Claro) por variáveis próprias em inicio-operadora-premium.css.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { possuiRecurso, type PlanoAtual, type SituacaoLimite } from '@/lib/plano';
import { consultarFinanceiroERN, type RegistroFinanceiroERN } from '@/lib/financeiroConsultaERN';
import { analisarGraficosFinanceirosERN, periodoRecenteERN } from '@/lib/financeiroGraficosERN';
import { analisarPendenciasDashboardERN } from '@/lib/financeiroDashboardERN';
import { normalizarStatusReservaERN, reservaOperacionalERN } from '@/lib/reservasStatusERN';
import ArcoFlechaERN from './ArcoFlechaERN';
import { BarrasAgrupadasEDA, TendenciaEDA } from './GraficosEDA';
import { listarChegadas, temTransfer, MODOS_CHEGADA, VEICULOS_TRANSFER, type ChegadaPainel } from '@/lib/chegadasERN';
import './inicio-operadora-premium.css';
import './capa-eda.css';
import CartaoMagneticoEDA from './CartaoMagneticoEDA';
import DigitacaoEDA, { type TrechoDigitado } from './DigitacaoEDA';
import { conflitosEDA, lotacaoEDA, type ConflitoEDA, type LotacaoEDA } from '@/lib/recursosEDA';
import { alertasViagem, type ViagemAoVivoEDA } from '@/lib/operacaoAoVivoEDA';

export type ReservaInicioERN = {
  id: string;
  data_reserva: string;
  horario: string | null;
  quantidade_pessoas: number | null;
  valor_total: number | null;
  status: string | null;
  cliente: string | null;
  pacote: string | null;
  guia: string | null;
  embarcacao_id: string | null;
};

export type DemandaInicioERN = {
  id: string;
  titulo: string;
  categoria: string;
  localidade: string;
  data_inicio: string | null;
  quantidade: number;
  unidade: string;
  status: string;
};

type Props = {
  hoje: string;
  reservas: ReservaInicioERN[];
  demandas: DemandaInicioERN[];
  stats: { clientes: number; reservas: number; roteiros: number; embarcacoes: number };
  plano: PlanoAtual | null;
  carregandoPlano: boolean;
  uso: Record<string, SituacaoLimite> | null;
  carregando: boolean;
  erro: string | null;
};

type AlertaViagemEDA = { data_inicio: string; passeio: string | null; saida_id: string | null; reserva_id: string | null; pessoas: number; graves: number; atencao: number; pendentes: number };
type Rede = { slug: string | null; publicado: boolean; verificado: boolean; publicadas: number; rascunhos: number } | null;

// ---------- utilidades ----------
const ICONES: Record<string, ReactNode> = {
  barco: <><path d="M3 15l2 4h14l2-4H3z" /><path d="M12 3v12M12 4l6 8h-6" /></>,
  calendario: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
  dinheiro: <><rect x="3" y="6" width="18" height="12" rx="3" /><circle cx="12" cy="12" r="2.5" /></>,
  relogio: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  alerta: <><path d="M12 3l9.5 17h-19L12 3z" /><path d="M12 10v4M12 17.5v.5" /></>,
  lista: <><path d="M9 6h12M9 12h12M9 18h12" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>,
  documento: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>,
  guia: <><circle cx="12" cy="6" r="3" /><path d="M12 9v6M8 21l4-6 4 6M7 12h10" /></>,
  equipe: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.4" /><path d="M16 14.2c2.9.3 5 2.6 5 5.8" /></>,
  local: <><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  mais: <path d="M12 5v14M5 12h14" />,
  seta: <path d="M5 12h14M13 6l6 6-6 6" />,
  ok: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.7 2.7L16 10" /></>,
};

function Icone({ nome, tamanho = 18 }: { nome: keyof typeof ICONES; tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONES[nome]}
    </svg>
  );
}

const moedaCentavos = (n: number) => (n / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function moedaCurta(centavos: number): string {
  const reais = centavos / 100;
  if (reais >= 1_000_000) return `R$ ${(reais / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (reais >= 10_000) return `R$ ${(reais / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return reais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function somarDias(dataISO: string, dias: number): string {
  const d = new Date(`${dataISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function rotuloDia(dataISO: string, hoje: string): string {
  if (dataISO === hoje) return 'HOJE';
  if (dataISO === somarDias(hoje, 1)) return 'AMANHÃ';
  const d = new Date(`${dataISO}T12:00:00Z`);
  const semana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' }).format(d).replace('.', '').toUpperCase();
  return `${semana} ${d.getUTCDate()}`;
}

function centavosValor(valor: unknown): number | null {
  if (typeof valor !== 'number' && typeof valor !== 'string') return null;
  const texto = String(valor).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(texto)) return null;
  const [reais, decimal = ''] = texto.split('.');
  const n = Number(reais) * 100 + Number(decimal.padEnd(2, '0'));
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function saudacao(): string {
  const hora = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Manaus' }).format(new Date())) % 24;
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

function dataExtenso(hoje: string): string {
  if (!hoje) return '';
  const d = new Date(`${hoje}T12:00:00Z`);
  const texto = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(d);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

type Tom = 'ok' | 'at' | 'er' | 'nt';

// ---------- componente ----------
export default function InicioOperadoraPremiumERN({
  hoje, reservas, demandas, stats, plano, carregandoPlano, uso, carregando, erro,
}: Props) {
  const financeiroLiberado = possuiRecurso(plano, 'financeiro');
  const empresaId = plano?.empresa_id ?? '';

  const [nome, setNome] = useState('');
  const [barcos, setBarcos] = useState<Record<string, string>>({});
  const [guias, setGuias] = useState<number | null>(null);
  const [rede, setRede] = useState<Rede>(null);
  const [financeiro, setFinanceiro] = useState<RegistroFinanceiroERN[] | null>(null);
  const [erroFinanceiro, setErroFinanceiro] = useState('');
  const [janela, setJanela] = useState<'hoje' | '7' | '30'>('7');
  const [chegadas, setChegadas] = useState<ChegadaPainel[] | null>(null);
  // EDA_FICHA_SAUDE_V1: alertas de saúde/segurança das próximas viagens (só contagens).
  const [saude, setSaude] = useState<AlertaViagemEDA[] | null>(null);
  // EDA_RECURSOS_AGENDA_V1: barco/guia em duas viagens e barco acima da lotação.
  const [conflitos, setConflitos] = useState<ConflitoEDA[]>([]);
  const [lotacao, setLotacao] = useState<LotacaoEDA[]>([]);
  useEffect(() => {
    let ativo = true;
    Promise.all([conflitosEDA(undefined, 7), lotacaoEDA(7)])
      .then(([c, l]) => { if (ativo) { setConflitos(c); setLotacao(l); } })
      .catch(() => { /* sem permissão */ });
    return () => { ativo = false; };
  }, []);
  // EDA_OPERACAO_AO_VIVO_V1: alertas críticos das viagens em curso entram nas pendências.
  const [aoVivo, setAoVivo] = useState<ViagemAoVivoEDA[]>([]);
  useEffect(() => {
    let ativo = true;
    supabase.rpc('operacao_ao_vivo_eda').then(({ data, error }) => { if (ativo && !error) setAoVivo((data ?? []) as ViagemAoVivoEDA[]); });
    return () => { ativo = false; };
  }, []);
  useEffect(() => {
    let ativo = true;
    supabase.rpc('alertas_proximas_viagens_eda', { p_dias: 7 })
      .then(({ data, error }) => { if (ativo) setSaude(error ? [] : (data ?? []) as AlertaViagemEDA[]); });
    return () => { ativo = false; };
  }, []);

  // ERN_RESERVA_CHEGADAS_V1: chegadas dos próximos 7 dias (a partir de agora menos 6 horas).
  useEffect(() => {
    let ativo = true;
    const inicio = new Date(Date.now() - 6 * 3600_000).toISOString();
    const fim = new Date(Date.now() + 7 * 24 * 3600_000).toISOString();
    listarChegadas(inicio, fim).then(l => { if (ativo) setChegadas(l); }).catch(() => { if (ativo) setChegadas([]); });
    return () => { ativo = false; };
  }, []);

  // Nome do usuário, embarcações, guias e vitrine na Rede.
  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user || !ativo) return;
        const [perfil, embarcacoes, totalGuias] = await Promise.all([
          supabase.from('perfis').select('nome').eq('id', auth.user.id).maybeSingle(),
          supabase.from('embarcacoes').select('id,nome').limit(200),
          supabase.from('guias').select('id', { count: 'exact', head: true }),
        ]);
        if (!ativo) return;
        const primeiro = String(perfil.data?.nome ?? '').trim().split(/\s+/)[0] ?? '';
        setNome(primeiro);
        setBarcos(Object.fromEntries((embarcacoes.data ?? []).map(b => [String(b.id), String(b.nome ?? '')])));
        setGuias(totalGuias.error ? null : totalGuias.count ?? 0);
      } catch {
        // Complementos opcionais: o painel segue sem eles.
      }
    })();
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    if (!empresaId) return;
    let ativo = true;
    void (async () => {
      try {
        const { data: perfil } = await supabase
          .from('perfis_publicos')
          .select('id,slug,publicado,verificado')
          .eq('empresa_id', empresaId)
          .eq('origem_tipo', 'empresa')
          .eq('categoria', 'operadora')
          .maybeSingle();
        if (!ativo) return;
        if (!perfil) { setRede({ slug: null, publicado: false, verificado: false, publicadas: 0, rascunhos: 0 }); return; }
        const [pub, ras] = await Promise.all([
          supabase.from('publicacoes').select('id', { count: 'exact', head: true }).eq('autor_perfil_id', perfil.id).eq('status', 'publicado'),
          supabase.from('publicacoes').select('id', { count: 'exact', head: true }).eq('autor_perfil_id', perfil.id).eq('status', 'rascunho'),
        ]);
        if (!ativo) return;
        setRede({ slug: perfil.slug ?? null, publicado: !!perfil.publicado, verificado: !!perfil.verificado, publicadas: pub.count ?? 0, rascunhos: ras.count ?? 0 });
      } catch {
        if (ativo) setRede(null);
      }
    })();
    return () => { ativo = false; };
  }, [empresaId]);

  useEffect(() => {
    if (carregandoPlano || !financeiroLiberado || !empresaId) return;
    let ativo = true;
    setErroFinanceiro('');
    consultarFinanceiroERN()
      .then(registros => {
        if (registros.some(r => r.empresa_id !== empresaId)) throw new Error('A empresa da consulta diverge do plano.');
        if (ativo) setFinanceiro(registros);
      })
      .catch(() => { if (ativo) setErroFinanceiro('Não foi possível carregar o financeiro agora.'); });
    return () => { ativo = false; };
  }, [carregandoPlano, financeiroLiberado, empresaId]);

  // ---------- cálculos ----------
  const operacionais = useMemo(() => reservas.filter(r => reservaOperacionalERN(r.status)), [reservas]);
  const dia7 = hoje ? somarDias(hoje, 6) : '';

  const pagamentoPorReserva = useMemo(() => {
    const mapa = new Map<string, { pendente: number; recebido: number }>();
    for (const item of financeiro ?? []) {
      if (!item.reserva_id || (item.tipo ?? '').trim().toLowerCase() !== 'receita') continue;
      const valor = centavosValor(item.valor ?? item.Valor);
      if (valor === null) continue;
      const atual = mapa.get(item.reserva_id) ?? { pendente: 0, recebido: 0 };
      const status = String(item.status ?? item.Status ?? '').trim().toLowerCase();
      if (status === 'recebido') atual.recebido += valor; else if (status === 'pendente') atual.pendente += valor;
      mapa.set(item.reserva_id, atual);
    }
    return mapa;
  }, [financeiro]);

  const resumo = useMemo(() => {
    const hojeLista = operacionais.filter(r => r.data_reserva === hoje);
    const semana = operacionais.filter(r => r.data_reserva >= hoje && r.data_reserva <= dia7);
    return {
      hoje: hojeLista,
      semana,
      pessoasSemana: semana.reduce((t, r) => t + Number(r.quantidade_pessoas ?? 0), 0),
      semGuia: semana.filter(r => !r.guia?.trim()),
      semBarco: semana.filter(r => !r.embarcacao_id),
      semHorario: semana.filter(r => !r.horario),
      pendentes: semana.filter(r => normalizarStatusReservaERN(r.status) === 'Pendente'),
    };
  }, [operacionais, hoje, dia7]);

  const fin = useMemo(() => {
    if (!financeiro || !hoje) return null;
    try {
      const graficos = analisarGraficosFinanceirosERN(financeiro, periodoRecenteERN(hoje, 6), hoje);
      const pend = analisarPendenciasDashboardERN(financeiro, hoje);
      const mesAtual = graficos.meses[graficos.meses.length - 1];
      return { graficos, pend, mesAtual };
    } catch {
      return null;
    }
  }, [financeiro, hoje]);

  const agenda = useMemo(() => {
    const fim = janela === 'hoje' ? hoje : janela === '7' ? dia7 : somarDias(hoje, 29);
    return operacionais.filter(r => r.data_reserva >= hoje && r.data_reserva <= fim).slice(0, 6);
  }, [operacionais, janela, hoje, dia7]);

  type Pendencia = { tom: Tom; icone: keyof typeof ICONES; titulo: string; detalhe: string; acao: string; href: string; peso: number };
  const pendencias = useMemo<Pendencia[]>(() => {
    const lista: Pendencia[] = [];
    const intervalo = `inicio=${hoje}&fim=${dia7}`;
    if (fin && fin.pend.faixas[0].qtdReceber > 0) {
      lista.push({ tom: 'er', icone: 'dinheiro', titulo: `${plural(fin.pend.faixas[0].qtdReceber, 'recebimento vencido', 'recebimentos vencidos')}`, detalhe: `${moedaCentavos(fin.pend.faixas[0].receber)} a receber`, acao: 'Cobrar', href: '/financeiro?periodo=pendentes', peso: 100 });
    }
    if (resumo.semGuia.length) {
      const r = resumo.semGuia[0];
      lista.push({ tom: 'er', icone: 'guia', titulo: resumo.semGuia.length === 1 ? 'Saída sem guia' : `${resumo.semGuia.length} saídas sem guia`, detalhe: `${r.pacote || 'Reserva'} · ${rotuloDia(r.data_reserva, hoje).toLowerCase()}`, acao: 'Escalar guia', href: `/reservas?alerta=sem_guia&${intervalo}`, peso: 90 });
    }
    if (resumo.semBarco.length) {
      lista.push({ tom: 'at', icone: 'barco', titulo: resumo.semBarco.length === 1 ? 'Saída sem embarcação' : `${resumo.semBarco.length} saídas sem embarcação`, detalhe: 'nos próximos 7 dias', acao: 'Vincular barco', href: `/reservas?alerta=sem_embarcacao&${intervalo}`, peso: 80 });
    }
    if (resumo.pendentes.length) {
      lista.push({ tom: 'at', icone: 'calendario', titulo: `${plural(resumo.pendentes.length, 'reserva aguardando', 'reservas aguardando')} confirmação`, detalhe: 'nos próximos 7 dias', acao: 'Confirmar', href: `/reservas?alerta=pendentes&${intervalo}`, peso: 70 });
    }
    if (fin && fin.pend.faixas[0].qtdPagar > 0) {
      lista.push({ tom: 'at', icone: 'documento', titulo: `${plural(fin.pend.faixas[0].qtdPagar, 'conta vencida', 'contas vencidas')} a pagar`, detalhe: moedaCentavos(fin.pend.faixas[0].pagar), acao: 'Ver contas', href: '/financeiro?periodo=pendentes', peso: 65 });
    }
    if (resumo.semHorario.length) {
      lista.push({ tom: 'nt', icone: 'relogio', titulo: `${plural(resumo.semHorario.length, 'saída', 'saídas')} sem horário`, detalhe: 'informe o horário de embarque', acao: 'Ajustar', href: `/reservas?alerta=sem_horario&${intervalo}`, peso: 50 });
    }
    const semTransfer = (chegadas ?? []).filter(c => !temTransfer(c));
    if (semTransfer.length) {
      const c = semTransfer[0];
      lista.push({ tom: 'er', icone: 'equipe', titulo: semTransfer.length === 1 ? 'Chegada sem transfer' : `${semTransfer.length} chegadas sem transfer`, detalhe: `${c.reserva?.cliente || 'Cliente'} · ${c.chegada_em ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Manaus', weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(c.chegada_em)) : 'data a definir'}`, acao: 'Combinar transfer', href: `/reservas/editar/${c.reserva_id}#chegada`, peso: 95 });
    }
    const aConfirmar = (chegadas ?? []).filter(c => c.situacao_horario === 'a_confirmar' && c.chegada_em && new Date(c.chegada_em).getTime() - Date.now() < 48 * 3600_000);
    if (aConfirmar.length) {
      lista.push({ tom: 'at', icone: 'relogio', titulo: `${plural(aConfirmar.length, 'chegada', 'chegadas')} com horário a confirmar`, detalhe: 'nas próximas 48 horas', acao: 'Confirmar', href: `/reservas/editar/${aConfirmar[0].reserva_id}#chegada`, peso: 75 });
    }
    if (conflitos.length) {
      const c = conflitos[0];
      lista.push({ tom: 'er', icone: c.recurso === 'guia' ? 'guia' : 'barco', titulo: conflitos.length === 1 ? `${c.recurso === 'guia' ? 'Guia' : 'Embarcação'} em duas viagens` : `${conflitos.length} conflitos de barco/guia`, detalhe: `${c.recurso_nome} · ${rotuloDia(c.inicio, hoje).toLowerCase()}`, acao: 'Resolver', href: `/reservas/editar/${c.reserva_id}`, peso: 97 });
    }
    if (lotacao.length) {
      const l = lotacao[0];
      lista.push({ tom: 'er', icone: 'barco', titulo: 'Embarcação acima da lotação', detalhe: `${l.nome} · ${l.pessoas}/${l.capacidade} · ${rotuloDia(l.dia, hoje).toLowerCase()}`, acao: 'Ver agenda', href: '/embarcacoes', peso: 96 });
    }
    for (const v of aoVivo) {
      const critico = alertasViagem(v).find(a => a.tom === 'er');
      if (critico) lista.push({ tom: 'er', icone: 'barco', titulo: `${v.passeio || 'Viagem'}: alerta na operação`, detalhe: critico.texto.length > 70 ? `${critico.texto.slice(0, 68)}…` : critico.texto, acao: 'Acompanhar ao vivo', href: '/reservas/ao-vivo', peso: 99 });
    }
    for (const v of saude ?? []) {
      if (!v.graves && !v.pendentes) continue;
      const quando = `${v.passeio || 'Viagem'} · ${rotuloDia(v.data_inicio, hoje).toLowerCase()}`;
      // Sempre a reserva: é lá que ficam o card Participantes e saúde e o link da ficha.
      const href = v.reserva_id ? `/reservas/editar/${v.reserva_id}#participantes` : '/reservas';
      if (v.graves) lista.push({ tom: 'er', icone: 'equipe', titulo: `${plural(v.graves, 'alerta grave', 'alertas graves')} de saúde`, detalhe: quando, acao: 'Ver resumo de segurança', href, peso: 98 });
      if (v.pendentes) lista.push({ tom: 'at', icone: 'equipe', titulo: `${plural(v.pendentes, 'ficha de saúde pendente', 'fichas de saúde pendentes')}`, detalhe: quando, acao: 'Enviar link ao turista', href, peso: 85 });
    }
    const rascunhos = demandas.filter(d => d.status === 'rascunho').length;
    if (rascunhos) {
      lista.push({ tom: 'nt', icone: 'lista', titulo: `${plural(rascunhos, 'demanda em rascunho', 'demandas em rascunho')}`, detalhe: 'ainda não abertas', acao: 'Ver demandas', href: '/demandas?status=rascunho', peso: 40 });
    }
    return lista.sort((a, b) => b.peso - a.peso);
  }, [fin, resumo, demandas, hoje, dia7, chegadas, saude, conflitos, lotacao, aoVivo]);

  const demandasDestaque = useMemo(() => [...demandas]
    .sort((a, b) => (a.status === 'aberta' ? -1 : 0) - (b.status === 'aberta' ? -1 : 0) || (a.data_inicio ?? '9999').localeCompare(b.data_inicio ?? '9999'))
    .slice(0, 4), [demandas]);

  // ERN_DIGITACAO_V1: a plataforma "conversa" com a operadora ao abrir o dia.
  const [tempoEsgotado, setTempoEsgotado] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setTempoEsgotado(true), 3500);
    return () => window.clearTimeout(t);
  }, []);
  const pronto = !carregando && !carregandoPlano
    && (!financeiroLiberado || financeiro !== null || Boolean(erroFinanceiro) || tempoEsgotado)
    && (saude !== null || tempoEsgotado);
  const [saudacaoPronta, setSaudacaoPronta] = useState(false);
  const [resumoAberto, setResumoAberto] = useState(false);

  const trechosSaudacao = useMemo<TrechoDigitado[]>(
    () => [{ texto: `${saudacao()}${nome ? `, ${nome}` : ''}.` }],
    [nome],
  );

  // ERN_BRIEFING_DIA_V1: resumo completo do dia, em conversa, um parágrafo por assunto.
  const trechosConversa = useMemo<TrechoDigitado[]>(() => {
    if (!pronto) return [];
    const t: TrechoDigitado[] = [];
    const add = (texto: string, forte = false) => t.push({ texto, forte });
    const linha = () => { if (t.length) add('\n'); };
    const hora = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Manaus' }).format(new Date())) % 24;
    const diaMes = Number((hoje || '').slice(8, 10)) || 0;
    const dataCurta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

    // 1. Agenda do rio
    const qtdHoje = resumo.hoje.length;
    const primeira = resumo.hoje.find(r => r.horario);
    if (qtdHoje === 0) {
      add(['Hoje o rio está tranquilo: ', 'Dia calmo por aqui: ', 'Nenhuma correria hoje: '][diaMes % 3]);
      add('nenhuma saída marcada', true);
      add('.');
    } else {
      add('Hoje vocês têm ');
      add(plural(qtdHoje, 'saída', 'saídas'), true);
      add(' no rio');
      if (primeira?.horario) { add(', a primeira às '); add(primeira.horario.slice(0, 5), true); }
      add('.');
    }
    const futuras = resumo.semana.length - qtdHoje;
    if (futuras > 0) {
      add(' Nos próximos 7 dias são mais ');
      add(plural(futuras, 'saída', 'saídas'), true);
      add(' com ');
      add(plural(resumo.pessoasSemana, 'pessoa', 'pessoas'), true);
      add(' para viver a Amazônia com vocês.');
    } else {
      add(' A semana também está livre — um bom momento para divulgar seus passeios.');
    }

    // 2. Caixa
    if (financeiroLiberado && fin) {
      linha();
      add('No caixa: ');
      add(moedaCentavos(fin.mesAtual?.recebido ?? 0), true);
      add(' recebidos e ');
      add(moedaCentavos(fin.mesAtual?.pago ?? 0), true);
      add(' pagos neste mês.');
      const vencidos = fin.pend.faixas[0].qtdReceber;
      if (vencidos > 0) {
        add(' Há ');
        add(plural(vencidos, 'recebimento vencido', 'recebimentos vencidos'), true);
        add(` (${moedaCentavos(fin.pend.faixas[0].receber)}) esperando cobrança.`);
      } else if (fin.pend.totais.receber > 0) {
        add(' Ainda faltam ');
        add(moedaCentavos(fin.pend.totais.receber), true);
        add(' a receber, nada vencido.');
      } else {
        add(' Nada pendente para receber.');
      }
      if (fin.pend.faixas[0].qtdPagar > 0) {
        add(' Atenção: ');
        add(plural(fin.pend.faixas[0].qtdPagar, 'conta vencida', 'contas vencidas'), true);
        add(' a pagar.');
      }
    } else if (!financeiroLiberado) {
      linha();
      add('O financeiro completo fica disponível no plano profissional — é só me chamar em ');
      add('Planos', true);
      add('.');
    }

    // 3. Demandas
    const abertas = demandas.filter(d => d.status === 'aberta');
    const rascunhos = demandas.filter(d => d.status === 'rascunho').length;
    if (abertas.length || rascunhos) {
      linha();
      add('Nas demandas: ');
      if (abertas.length) {
        add(plural(abertas.length, 'aberta', 'abertas'), true);
        const proximaDem = [...abertas].filter(d => d.data_inicio && d.data_inicio >= hoje)
          .sort((x, y) => (x.data_inicio ?? '').localeCompare(y.data_inicio ?? ''))[0];
        if (proximaDem?.data_inicio) {
          add(', a próxima começa em ');
          add(dataCurta(proximaDem.data_inicio), true);
          add(proximaDem.localidade ? ` (${proximaDem.titulo}, ${proximaDem.localidade})` : ` (${proximaDem.titulo})`);
        }
      }
      if (rascunhos) {
        add(abertas.length ? ' e ' : '');
        add(plural(rascunhos, 'rascunho', 'rascunhos'), true);
        add(' esperando você abrir');
      }
      add('.');
    }

    // 4. Pendências
    linha();
    if (pendencias.length) {
      add('Separei ');
      add(plural(pendencias.length, 'pendência', 'pendências'), true);
      add(' em “O que fazer agora”. A mais importante: ');
      add(pendencias[0].titulo.charAt(0).toLowerCase() + pendencias[0].titulo.slice(1), true);
      add('.');
    } else {
      add('Nenhuma pendência — a operação está em dia.');
    }

    // 5. Plano
    if (uso) {
      const perto = ([['clientes', uso.clientes], ['reservas do mês', uso.reservas_mes], ['passeios', uso.passeios], ['usuários', uso.usuarios]] as const)
        .find(([, sit]) => sit && sit.dados_validos && !sit.ilimitado && sit.limite && sit.usado / sit.limite >= 0.8);
      if (perto) {
        const [rotulo, sit] = perto;
        add(' Seu plano já usa ');
        add(`${sit.usado} de ${sit.limite} ${rotulo}`, true);
        add('.');
      }
    }

    // 5b. Saúde e segurança dos viajantes (EDA_FICHA_SAUDE_V1)
    const graves = (saude ?? []).reduce((n, v) => n + v.graves, 0);
    const pendFichas = (saude ?? []).reduce((n, v) => n + v.pendentes, 0);
    if (graves || pendFichas) {
      linha();
      if (graves) {
        add('Atenção à segurança: ');
        add(plural(graves, 'viajante com alerta grave', 'viajantes com alerta grave'), true);
        add(' nas viagens dos próximos 7 dias — alergia grave, condição de saúde ou quem não sabe nadar.');
      }
      if (pendFichas) {
        add(graves ? ' Ainda faltam ' : 'Faltam ');
        add(plural(pendFichas, 'ficha de saúde', 'fichas de saúde'), true);
        add(' para fechar a preparação. Envie o link ao turista pela reserva.');
      }
    }

    // 5c. Barcos e guias (EDA_RECURSOS_AGENDA_V1)
    if (conflitos.length || lotacao.length) {
      linha();
      add('Logística: ');
      if (conflitos.length) add(plural(conflitos.length, 'conflito de barco ou guia', 'conflitos de barco ou guia'), true);
      if (conflitos.length && lotacao.length) add(' e ');
      if (lotacao.length) add(`${lotacao[0].nome} acima da lotação`, true);
      add(' nos próximos 7 dias. Vale ajustar antes de confirmar com os clientes.');
    }

    // 6. Fecho
    const fechos = hora < 12
      ? ['Bora começar?', 'Vamos juntos neste dia.', 'Estou aqui com você desde cedo.']
      : hora < 18
        ? ['Sigo acompanhando com você.', 'Qualquer novidade, eu aviso.', 'A tarde está nas suas mãos — e eu ajudo.']
        : ['Amanhã eu te lembro do que vier.', 'Bom descanso quando der.', 'Deixo tudo organizado para amanhã.'];
    add(' ' + fechos[diaMes % fechos.length]);
    return t;
  }, [pronto, resumo, fin, hoje, demandas, pendencias, uso, financeiroLiberado, saude, conflitos, lotacao]);

  const proxima = resumo.hoje.find(r => r.horario) ?? resumo.semana[0];

  // Gráfico de 6 meses (centavos).
  const meses = fin?.graficos.meses ?? [];
  const maiorMes = Math.max(1, ...meses.flatMap(m => [m.recebido, m.pago]));
  const spark = meses.map(m => m.recebido);
  const maiorSpark = Math.max(1, ...spark);
  const nomeEmpresa = plano?.empresa_nome?.trim();

  return (
    <div className="eda-inicio">
      <CartaoMagneticoEDA as="header" forca={4} className="eda-cabeca eda-capa">
        <div>
          <p className="eda-eb"><i className="eda-capa-traco" aria-hidden="true" />{dataExtenso(hoje)}{nomeEmpresa ? ` · ${nomeEmpresa}` : ''}</p>
          <h1><DigitacaoEDA trechos={trechosSaudacao} iniciar={pronto} velocidade={42} atraso={250} cursorEspera aoTerminar={() => setSaudacaoPronta(true)} /></h1>
          {/* ERN_FLUTUANTES_CELULAR_V1: no celular o resumo abre recolhido */}
          <div id="eda-resumo-dia" className={`eda-frase-caixa${resumoAberto ? ' eda-frase-aberta' : ''}`}>
            <p className="eda-frase" aria-live="off">
              <DigitacaoEDA trechos={trechosConversa} iniciar={pronto && saudacaoPronta} velocidade={13} atraso={380} cursorFinal pularAoClicar />
            </p>
          </div>
          {pronto && (
            <button type="button" className="eda-frase-mais" aria-expanded={resumoAberto} aria-controls="eda-resumo-dia" onClick={() => setResumoAberto(v => !v)}>
              {resumoAberto ? 'Recolher resumo' : 'Ver resumo completo'}
            </button>
          )}
        </div>
        <nav aria-label="Ações rápidas" className="eda-acoes">
          <Link href="/reservas/ao-vivo" className="eda-bt eda-bt-sec"><Icone nome="barco" tamanho={16} />Operação ao vivo</Link>
          <Link href="/demandas/nova" className="eda-bt eda-bt-sec"><Icone nome="lista" tamanho={16} />Nova demanda</Link>
          {financeiroLiberado && <Link href="/financeiro/receita/novo" className="eda-bt eda-bt-sec"><Icone nome="dinheiro" tamanho={16} />Lançar receita</Link>}
          <Link href="/reservas/nova" className="eda-bt eda-bt-ouro"><Icone nome="mais" tamanho={16} />Nova reserva</Link>
        </nav>
      </CartaoMagneticoEDA>

      {erro && <p role="alert" className="eda-aviso">Alguns dados não foram carregados. {erro}</p>}

      <section className="eda-kpis" aria-label="Números principais">
        <Kpi rotulo="Saídas hoje" icone="barco" valor={carregando ? '—' : String(resumo.hoje.length)}
          etiqueta={proxima?.horario && proxima.data_reserva === hoje ? `Próxima às ${proxima.horario.slice(0, 5)}` : resumo.hoje.length ? 'Sem horário definido' : 'Nenhuma saída hoje'}
          tom={resumo.hoje.length ? 'ok' : 'nt'} href={`/reservas?inicio=${hoje}&fim=${hoje}`} />
        <Kpi rotulo="Próximos 7 dias" icone="calendario" valor={carregando ? '—' : String(resumo.semana.length)}
          etiqueta={plural(resumo.pessoasSemana, 'pessoa', 'pessoas')} tom="ok" href={`/reservas?inicio=${hoje}&fim=${dia7}`} />
        <Kpi rotulo="Recebido no mês" icone="dinheiro"
          valor={!financeiroLiberado ? '—' : fin ? moedaCurta(fin.mesAtual?.recebido ?? 0) : '…'}
          etiqueta={!financeiroLiberado ? 'Recurso do plano' : fin ? `Pago no mês ${moedaCurta(fin.mesAtual?.pago ?? 0)}` : 'Carregando'}
          tom="nt" href="/financeiro"
          extra={spark.length > 1 && <TendenciaEDA valores={spark} className="eda-spark" />} />
        <Kpi rotulo="A receber" icone="relogio"
          valor={!financeiroLiberado ? '—' : fin ? moedaCurta(fin.pend.totais.receber) : '…'}
          etiqueta={!financeiroLiberado ? 'Recurso do plano' : fin ? (fin.pend.faixas[0].qtdReceber ? `${moedaCurta(fin.pend.faixas[0].receber)} vencido` : `${moedaCurta(fin.pend.proximos.receber)} em 7 dias`) : 'Carregando'}
          tom={fin && fin.pend.faixas[0].qtdReceber ? 'at' : 'nt'} href="/financeiro?periodo=pendentes" />
      </section>

      <div className="eda-linha eda-linha-a">
        <section className="eda-card" aria-labelledby="eda-agenda">
          <div className="eda-ct">
            <span><p className="eda-eb eda-eb-p">Agenda do rio</p><h2 id="eda-agenda">Próximas saídas</h2></span>
            <div className="eda-chips" role="group" aria-label="Período da agenda">
              {([['hoje', 'Hoje'], ['7', '7 dias'], ['30', '30 dias']] as const).map(([v, r]) => (
                <button key={v} type="button" aria-pressed={janela === v} onClick={() => setJanela(v)} className="eda-chip">{r}</button>
              ))}
            </div>
          </div>
          {carregando ? <p className="eda-vazio">Carregando agenda…</p> : agenda.length === 0 ? (
            <div className="eda-vazio"><Icone nome="calendario" tamanho={22} /><span>Nenhuma saída neste período.</span><Link href="/reservas/nova" className="eda-lk">Registrar reserva <Icone nome="seta" tamanho={13} /></Link></div>
          ) : (
            <ul className="eda-lista">
              {agenda.map(r => {
                const pg = pagamentoPorReserva.get(r.id);
                const st = normalizarStatusReservaERN(r.status);
                const [tom, texto]: [Tom, string] = !r.guia?.trim() ? ['er', 'Sem guia']
                  : pg && pg.pendente > 0 ? ['at', 'Falta pagamento']
                  : st === 'Pendente' ? ['at', 'A confirmar'] : ['ok', 'Confirmada'];
                const barco = r.embarcacao_id ? barcos[r.embarcacao_id] : '';
                return (
                  <li key={r.id}>
                    <Link href={`/reservas/editar/${r.id}`} className="eda-item eda-item-agenda">
                      <span className="eda-hora"><b>{r.horario ? r.horario.slice(0, 5) : '--:--'}</b><small>{rotuloDia(r.data_reserva, hoje)}</small></span>
                      <span className="eda-txt"><b>{r.pacote || 'Reserva'}</b><small>{[r.cliente, r.quantidade_pessoas ? plural(Number(r.quantidade_pessoas), 'pessoa', 'pessoas') : '', barco, r.guia ? `Guia ${r.guia}` : ''].filter(Boolean).join(' · ')}</small></span>
                      <span className={`eda-pill eda-${tom}`}><i />{texto}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <Link href="/reservas" className="eda-lk eda-rodape">Ver todas as reservas <Icone nome="seta" tamanho={13} /></Link>
        </section>

        <section className="eda-card eda-card-ouro" aria-labelledby="eda-pend">
          <div className="eda-ct">
            <span><p className="eda-eb eda-eb-p">O que fazer agora</p><h2 id="eda-pend">{carregando ? 'Pendências' : pendencias.length ? plural(pendencias.length, 'pendência', 'pendências') : 'Tudo em dia'}</h2></span>
          </div>
          {!carregando && pendencias.length === 0 ? (
            <div className="eda-vazio"><span className="eda-pill eda-ok eda-ic"><Icone nome="ok" tamanho={16} /></span><span>Nenhuma pendência na operação dos próximos 7 dias.</span></div>
          ) : (
            <ul className="eda-lista">
              {pendencias.slice(0, 5).map(p => (
                <li key={p.titulo}>
                  <Link href={p.href} className="eda-item eda-item-pend">
                    <span className={`eda-pill eda-${p.tom} eda-ic`}><Icone nome={p.icone} tamanho={16} /></span>
                    <span className="eda-txt"><b>{p.titulo}</b><small>{p.detalhe}</small></span>
                    <span className="eda-lk">{p.acao} <Icone nome="seta" tamanho={13} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {chegadas && chegadas.length > 0 && (
        <section className="eda-card eda-chegadas" aria-labelledby="eda-chg" style={{ marginTop: 16 }}>
          <div className="eda-ct">
            <span><p className="eda-eb eda-eb-p">Logística</p><h2 id="eda-chg">Chegadas e transfers · próximos 7 dias</h2></span>
            <Link href="/reservas" className="eda-lk">Ver reservas <Icone nome="seta" tamanho={13} /></Link>
          </div>
          <ul className="eda-lista">
            {chegadas.slice(0, 5).map(c => {
              const quando = c.chegada_em ? new Date(c.chegada_em) : null;
              const hora = quando ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Manaus', hour: '2-digit', minute: '2-digit' }).format(quando) : '--:--';
              const dia = quando ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Manaus', weekday: 'short', day: 'numeric' }).format(quando).replace('.', '').toUpperCase() : '';
              const [tom, texto]: [Tom, string] = !temTransfer(c) ? ['er', 'Sem transfer'] : c.situacao_horario === 'a_confirmar' ? ['at', 'Horário a confirmar'] : ['ok', 'Transfer combinado'];
              return (
                <li key={c.reserva_id}>
                  <Link href={`/reservas/editar/${c.reserva_id}#chegada`} className="eda-item eda-item-agenda">
                    <span className="eda-hora"><b>{hora}</b><small>{dia}</small></span>
                    <span className="eda-txt">
                      <b>{c.reserva?.cliente || 'Cliente'}{c.passageiros ? ` · ${plural(c.passageiros, 'pessoa', 'pessoas')}` : ''}</b>
                      <small>{[MODOS_CHEGADA[c.modo], [c.companhia, c.numero].filter(Boolean).join(' '), [c.origem, c.destino].filter(Boolean).join(' → ')].filter(Boolean).join(' · ')}{temTransfer(c) ? ` · busca: ${c.transfer_responsavel}${c.transfer_veiculo ? ` (${VEICULOS_TRANSFER[c.transfer_veiculo]})` : ''}` : ''}</small>
                    </span>
                    <span className={`eda-pill eda-${tom}`}><i />{texto}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="eda-linha eda-linha-a">
        <section className="eda-card" aria-labelledby="eda-fin">
          <div className="eda-ct">
            <span><p className="eda-eb eda-eb-p">Financeiro</p><h2 id="eda-fin">Recebido e pago · 6 meses</h2></span>
          </div>
          {!financeiroLiberado ? (
            <div className="eda-vazio"><Icone nome="dinheiro" tamanho={22} /><span>O financeiro faz parte dos planos com o recurso Financeiro.</span><Link href="/planos" className="eda-lk">Ver planos <Icone nome="seta" tamanho={13} /></Link></div>
          ) : erroFinanceiro ? <p className="eda-vazio" role="alert">{erroFinanceiro}</p> : !fin ? <p className="eda-vazio">Carregando lançamentos…</p> : (
            <>
              <BarrasAgrupadasEDA
                categorias={meses.map(m => m.nome.replace('.', '').split(' ')[0])}
                series={[
                  { nome: 'Recebido', c: 's1', valores: meses.map(m => m.recebido) },
                  { nome: 'Pago', c: 's4', valores: meses.map(m => m.pago) },
                ]}
                formatar={moedaCurta}
                formatarEixo={v => moedaCurta(v).replace('R$ ', '')}
                rotulo="Recebido e pago nos últimos 6 meses"
                altura={210}
              />
              <div className="eda-mini">
                <div><small>Resultado do mês</small><b>{moedaCurta((fin.mesAtual?.recebido ?? 0) - (fin.mesAtual?.pago ?? 0))}</b></div>
                <div><small>A receber · 7 dias</small><b>{moedaCurta(fin.pend.proximos.receber)}</b></div>
                <div><small>A pagar · 7 dias</small><b>{moedaCurta(fin.pend.proximos.pagar)}</b></div>
              </div>
            </>
          )}
        </section>

        <section className="eda-card" aria-labelledby="eda-dem">
          <div className="eda-ct">
            <span><p className="eda-eb eda-eb-p">Necessidades</p><h2 id="eda-dem">Demandas da operação</h2></span>
            <Link href="/demandas" className="eda-lk">Abrir <Icone nome="seta" tamanho={13} /></Link>
          </div>
          {demandasDestaque.length === 0 ? (
            <div className="eda-vazio"><Icone nome="lista" tamanho={22} /><span>Nenhuma demanda aberta.</span><Link href="/demandas/nova" className="eda-lk">Criar demanda <Icone nome="seta" tamanho={13} /></Link></div>
          ) : (
            <ul className="eda-lista">
              {demandasDestaque.map(d => (
                <li key={d.id}>
                  <Link href={`/demandas/editar/${d.id}`} className="eda-item eda-item-dem">
                    <span className="eda-txt"><b>{d.titulo}</b><small>{[d.localidade, d.data_inicio ? d.data_inicio.split('-').reverse().slice(0, 2).join('/') : '', d.quantidade ? `${d.quantidade} ${d.unidade}` : ''].filter(Boolean).join(' · ')}</small></span>
                    <span className={`eda-pill eda-${d.status === 'aberta' ? 'at' : 'nt'}`}><i />{d.status === 'aberta' ? 'Aberta' : 'Rascunho'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="eda-total"><small>Abertas</small><b>{demandas.filter(d => d.status === 'aberta').length}</b><small>Rascunhos</small><b>{demandas.filter(d => d.status === 'rascunho').length}</b></div>
        </section>
      </div>

      <div className="eda-linha eda-linha-b">
        <section className="eda-card eda-card-rede" aria-labelledby="eda-rede">
          <p className="eda-eb eda-eb-p">Rede EDA</p>
          <h2 id="eda-rede">Sua vitrine para visitantes</h2>
          <p className="eda-sub">{rede?.publicado ? (rede.verificado ? 'Perfil verificado · aparece em Destinos e na Rede.' : 'Perfil publicado na Rede e em Destinos.') : 'Publique seu perfil para aparecer em Destinos e na Rede.'}</p>
          <div className="eda-trio">
            <div><b>{rede ? rede.publicadas : '—'}</b><small>publicações</small></div>
            <div><b>{rede ? rede.rascunhos : '—'}</b><small>rascunhos</small></div>
            <div><b className="eda-arco"><ArcoFlechaERN tamanho={18} ativo={!!rede?.verificado} /></b><small>{rede?.verificado ? 'verificado' : 'não verificado'}</small></div>
          </div>
          <div className="eda-acoes">
            <Link href="/configuracoes/publicacoes" className="eda-bt eda-bt-ouro eda-bt-p">Nova publicação</Link>
            <Link href={rede?.publicado && rede.slug ? `/rede/perfil/${rede.slug}` : '/configuracoes/perfil-publico'} className="eda-bt eda-bt-sec eda-bt-p">{rede?.publicado ? 'Ver perfil ↗' : 'Configurar perfil'}</Link>
          </div>
        </section>

        <section className="eda-card" aria-labelledby="eda-est">
          <div className="eda-ct"><span><p className="eda-eb eda-eb-p">Estrutura</p><h2 id="eda-est">Cadastros</h2></span></div>
          <div className="eda-grade4">
            {([['Clientes', stats.clientes, 'equipe', '/clientes'], ['Passeios', stats.roteiros, 'local', '/passeios'], ['Embarcações', stats.embarcacoes, 'barco', '/embarcacoes'], ['Guias', guias, 'guia', '/guias']] as const).map(([r, n, i, h]) => (
              <Link key={r} href={h} className="eda-cad"><Icone nome={i} tamanho={16} /><b>{n ?? '—'}</b><small>{r}</small></Link>
            ))}
          </div>
        </section>

        <section className="eda-card" aria-labelledby="eda-plano">
          <div className="eda-ct">
            <span><p className="eda-eb eda-eb-p">Assinatura</p><h2 id="eda-plano">{carregandoPlano ? 'Plano' : plano?.plano_nome || 'Plano não identificado'}</h2></span>
            {plano && <span className={`eda-pill eda-${plano.assinatura_status === 'ativo' || plano.assinatura_status === 'trial' ? 'ok' : 'at'}`}><i />{plano.assinatura_status === 'trial' ? 'Teste' : plano.assinatura_status === 'ativo' ? 'Ativo' : plano.assinatura_status}</span>}
          </div>
          <ul className="eda-uso">
            {uso && ([['Usuários', uso.usuarios], ['Clientes', uso.clientes], ['Reservas no mês', uso.reservas_mes], ['Passeios', uso.passeios]] as const).map(([r, s]) => {
              if (!s) return null;
              const pct = s.ilimitado || !s.limite ? 0 : Math.min(100, (s.usado / s.limite) * 100);
              return (
                <li key={r}>
                  <span><small>{r}</small><b>{s.dados_validos ? `${s.usado}${s.ilimitado ? '' : ` / ${s.limite ?? '—'}`}` : '—'}</b></span>
                  <div className="eda-trilho"><div className={s.atingido || s.excedido ? 'eda-cheio' : ''} style={{ width: s.ilimitado ? '100%' : `${pct}%`, opacity: s.ilimitado ? 0.35 : 1 }} /></div>
                </li>
              );
            })}
          </ul>
          <Link href="/planos" className="eda-lk eda-rodape">Detalhes do plano <Icone nome="seta" tamanho={13} /></Link>
        </section>
      </div>
    </div>
  );
}

function Kpi({ rotulo, valor, etiqueta, icone, tom, href, extra }: { rotulo: string; valor: string; etiqueta: string; icone: keyof typeof ICONES; tom: Tom; href: string; extra?: ReactNode }) {
  return (
    <CartaoMagneticoEDA forca={6} className="eda-kpi-mg">
    <Link href={href} className="eda-card eda-kpi">
      <span className="eda-ct"><small>{rotulo}</small><span className="eda-kpi-ic"><Icone nome={icone} tamanho={16} /></span></span>
      <b className="eda-num">{valor}</b>
      <span className={`eda-pill eda-${tom}`}>{etiqueta}</span>
      {extra}
    </Link>
    </CartaoMagneticoEDA>
  );
}

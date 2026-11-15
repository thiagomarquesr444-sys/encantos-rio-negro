'use client';
// EDA_CALENDARIO_V1: Calendário Amazônico — centro de comando da operação no tempo.
// Visões Mês / Semana por recurso / Dia / Agenda; camadas Operação, Financeiro,
// Recursos e Amazônica; prontidão por saída, conflitos, remarcar arrastando
// (sempre com confirmação e opção de desfazer), bloqueios de agenda e EDA junto.
import '@/app/components/padrao-paginas-eda.css';
import './calendario-eda.css';

import { Fragment, useCallback, useEffect, useMemo, useState, type DragEvent } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAoVivoEDA } from '@/lib/aoVivoEDA';
import { aoMudarSinalEDA, sinalFracoEDA } from '@/lib/conexaoEDA';
import { confirmarEDA } from '@/lib/dialogoEDA';
import { copiarEDA } from '@/lib/copiarEDA';
import { possuiRecurso, type PlanoAtual } from '@/lib/plano';
import { baixarDocumentoPremiumERN } from '@/lib/pdfSobDemandaEDA';
import { useFichasMunicipios } from '@/lib/fichasMunicipiosCliente';
import { useModulosEquipeERN } from '@/app/components/ModulosEquipeERN';
import { CabecalhoEDA, DadoEDA, PaginaEDA, PainelLateralEDA, PillEDA, VazioEDA, type TomEDA } from '@/app/components/PadraoPaginaEDA';
import CartaoMagneticoEDA from '@/app/components/CartaoMagneticoEDA';
import {
  MESES_CAL, MOTIVOS_BLOQUEIO, SEMANA_CAL, avaliarClimaCal, avisoRemarcacaoCal, carregarCalendarioEDA, climaCal, dataLongaCal,
  dentroCal, detectarConflitosCal, diasEntreCal, dmCal, excluirBloqueioEDA, faseRioCal, feriadosCal, hojeCal, inicioMesCal,
  inicioSemanaCal, luaCal, moedaCal, remarcarSaidaEDA, salvarBloqueioEDA, somarDiasCal, somarMesesCal, temporadaPescaCal,
  type CamadaCal, type ClimaDiaCal, type DadosCal, type EventoCal, type RecursoCal, type TipoRecursoCal,
} from '@/lib/calendarioEDA';

type Visao = 'mes' | 'semana' | 'dia' | 'agenda';
type Painel =
  | { tipo: 'evento'; id: string }
  | { tipo: 'dia'; dia: string }
  | { tipo: 'bloqueio'; id?: string; recurso_tipo: TipoRecursoCal | 'empresa'; recurso_id: string | null; inicio: string; fim: string; motivo: string; observacao: string };
type Desfazer = { saidaId: string; inicio: string; dias: number; texto: string };

const VISOES: { valor: Visao; rotulo: string }[] = [
  { valor: 'mes', rotulo: 'Mês' }, { valor: 'semana', rotulo: 'Semana por recurso' }, { valor: 'dia', rotulo: 'Dia' }, { valor: 'agenda', rotulo: 'Agenda' },
];
const CAMADAS: { valor: CamadaCal; rotulo: string }[] = [
  { valor: 'operacao', rotulo: 'Operação' }, { valor: 'financeiro', rotulo: 'Financeiro' }, { valor: 'recursos', rotulo: 'Recursos' }, { valor: 'amazonica', rotulo: 'Amazônica' },
];
const ROTULO_TIPO: Record<EventoCal['tipo'], string> = {
  saida: 'Saída', reserva: 'Reserva', demanda: 'Demanda', financeiro: 'Financeiro', bloqueio: 'Bloqueio', hospedagem: 'Hospedagem', pedido: 'Pedido da Iara',
};
const CHAVE_PREF = 'eda.calendario.pref.v1';
const BARCELOS = { lat: -0.975, lng: -62.924 };

function lerPref(): { visao?: Visao; camadas?: CamadaCal[] } {
  try { const v = JSON.parse(localStorage.getItem(CHAVE_PREF) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}
function gravarPref(p: { visao: Visao; camadas: CamadaCal[] }) {
  try { localStorage.setItem(CHAVE_PREF, JSON.stringify(p)); } catch { /* sem armazenamento */ }
}
const hora = (h: string | null) => (h ? h.slice(0, 5) : '');
const pedirEDA = (texto: string) => window.dispatchEvent(new CustomEvent('eda:pedir', { detail: { texto } }));

function periodoDaVisao(visao: Visao, ancora: string): { de: string; ate: string } {
  if (visao === 'mes') { const de = inicioSemanaCal(inicioMesCal(ancora)); return { de, ate: somarDiasCal(de, 41) }; }
  if (visao === 'semana') { const de = inicioSemanaCal(ancora); return { de, ate: somarDiasCal(de, 6) }; }
  if (visao === 'dia') return { de: ancora, ate: ancora };
  return { de: ancora, ate: somarDiasCal(ancora, 29) };
}
function tituloPeriodo(visao: Visao, ancora: string, de: string, ate: string) {
  if (visao === 'mes') return `${MESES_CAL[Number(ancora.slice(5, 7)) - 1]} de ${ancora.slice(0, 4)}`;
  if (visao === 'dia') return dataLongaCal(ancora);
  return `${dmCal(de)} a ${dmCal(ate)}`;
}

export default function CalendarioAmazonicoPage() {
  const hoje = hojeCal();
  const [visao, setVisao] = useState<Visao>('mes');
  const [camadas, setCamadas] = useState<Set<CamadaCal>>(new Set(['operacao', 'financeiro', 'recursos', 'amazonica']));
  const [ancora, setAncora] = useState(hoje);
  const [dados, setDados] = useState<DadosCal | null>(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [desfazer, setDesfazer] = useState<Desfazer | null>(null);
  const [painel, setPainel] = useState<Painel | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvoDrop, setAlvoDrop] = useState<string | null>(null);
  const [fraco, setFraco] = useState(false);
  const [clima, setClima] = useState<ClimaDiaCal[]>([]);
  const [finPlano, setFinPlano] = useState(false);
  const [revisao, setRevisao] = useState(0);
  const { modulos } = useModulosEquipeERN();
  const fichas = useFichasMunicipios();
  const financeiroLiberado = finPlano && modulos.has('financeiro');

  // Preferências do operador + modo leve com sinal fraco (Agenda em lista).
  useEffect(() => {
    const p = lerPref();
    const f = sinalFracoEDA();
    setFraco(f);
    if (p.visao && VISOES.some((v) => v.valor === p.visao)) setVisao(p.visao);
    else if (f || window.matchMedia('(max-width: 640px)').matches) setVisao('agenda');
    if (Array.isArray(p.camadas)) setCamadas(new Set(p.camadas.filter((c) => CAMADAS.some((x) => x.valor === c))));
    return aoMudarSinalEDA(setFraco);
  }, []);
  useEffect(() => {
    let ativo = true;
    void supabase.rpc('get_meu_plano').then(({ data, error }) => {
      if (!ativo || error) return;
      const p = (Array.isArray(data) ? data[0] : data) as PlanoAtual | null;
      setFinPlano(possuiRecurso(p, 'financeiro'));
    });
    return () => { ativo = false; };
  }, []);

  const { de, ate } = useMemo(() => periodoDaVisao(visao, ancora), [visao, ancora]);

  const carregar = useCallback(async () => {
    setErro('');
    try {
      setDados(await carregarCalendarioEDA(de, ate, { financeiro: financeiroLiberado, hoje }));
    } catch (e) {
      setErro((e as Error).message || 'Não foi possível carregar o calendário.');
      setDados((d) => d ?? { eventos: [], recursos: [], conflitos: [], pedidosSemData: 0 });
    }
  }, [de, ate, financeiroLiberado, hoje]);
  useEffect(() => { void carregar(); }, [carregar, revisao]);
  useAoVivoEDA(['passeio_saidas', 'reservas', 'demandas', 'financeiro', 'calendario_bloqueios', 'vouchers', 'pedidos_visitante'], () => setRevisao((r) => r + 1));

  // Clima: só com a camada amazônica, sinal bom e período que inclui os próximos 10 dias.
  const local = useMemo(() => {
    const e = dados?.eventos.find((x) => x.tipo === 'saida' && x.lat != null && x.lng != null && x.fim >= hoje);
    return e ? { lat: e.lat as number, lng: e.lng as number } : BARCELOS;
  }, [dados, hoje]);
  useEffect(() => {
    if (!camadas.has('amazonica') || fraco || ate < hoje || de > somarDiasCal(hoje, 9)) return;
    let ativo = true;
    void climaCal(local.lat, local.lng).then((c) => { if (ativo) setClima(c); });
    return () => { ativo = false; };
  }, [camadas, fraco, de, ate, hoje, local]);
  const climaDia = useMemo(() => new Map(clima.map((c) => [c.dia, c])), [clima]);

  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(''), 6000); return () => clearTimeout(t); }, [aviso]);
  useEffect(() => { if (!desfazer) return; const t = setTimeout(() => setDesfazer(null), 20000); return () => clearTimeout(t); }, [desfazer]);

  function trocarVisao(v: Visao) { setVisao(v); gravarPref({ visao: v, camadas: Array.from(camadas) }); }
  function alternarCamada(c: CamadaCal) {
    const n = new Set(camadas); if (n.has(c)) n.delete(c); else n.add(c);
    setCamadas(n); gravarPref({ visao, camadas: Array.from(n) });
  }
  function navegar(passo: number) {
    if (visao === 'mes') setAncora((a) => somarMesesCal(a, passo));
    else if (visao === 'semana') setAncora((a) => somarDiasCal(a, 7 * passo));
    else if (visao === 'dia') setAncora((a) => somarDiasCal(a, passo));
    else setAncora((a) => somarDiasCal(a, 30 * passo));
  }

  const eventos = useMemo(() => (dados?.eventos ?? []).filter((e) => camadas.has(e.camada)), [dados, camadas]);
  const eventosDoDia = useCallback((dia: string) => eventos.filter((e) => dentroCal(e, dia)), [eventos]);
  const conflitos = dados?.conflitos ?? [];
  const conflitoDia = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of conflitos) m.set(c.dia, (m.get(c.dia) ?? 0) + (c.grave ? 2 : 1));
    return m;
  }, [conflitos]);
  const eventoAberto = painel?.tipo === 'evento' ? dados?.eventos.find((e) => e.id === painel.id) ?? null : null;
  const [novaData, setNovaData] = useState('');
  const idAberto = eventoAberto?.id ?? '';
  const inicioAberto = eventoAberto?.inicio ?? '';
  useEffect(() => { if (idAberto) setNovaData(inicioAberto); }, [idAberto, inicioAberto]);

  // ------------------------------------------------------------------ resumo
  const resumo = useMemo(() => {
    const saidas = eventos.filter((e) => e.tipo === 'saida' && e.fim >= hoje);
    const semana = saidas.filter((e) => diasEntreCal(hoje, e.inicio) <= 7 && (e.pessoas ?? 0) > 0);
    const comPend = semana.filter((e) => (e.pendencias ?? []).length);
    const pessoas = saidas.reduce((t, e) => t + (e.pessoas ?? 0), 0);
    const fin = eventos.filter((e) => e.tipo === 'financeiro');
    const receber = fin.filter((e) => e.titulo === 'A receber').reduce((t, e) => t + (e.valor ?? 0), 0);
    const pagar = fin.filter((e) => e.titulo === 'A pagar').reduce((t, e) => t + (e.valor ?? 0), 0);
    // Dias livres nos próximos 14 dias (sem saída e sem bloqueio da empresa)
    const todos = dados?.eventos ?? [];
    let livres = 0;
    for (let i = 0; i < 14; i++) {
      const d = somarDiasCal(hoje, i);
      if (d < de || d > ate) continue;
      if (!todos.some((e) => (e.tipo === 'saida' || e.tipo === 'reserva' || (e.tipo === 'bloqueio' && e.bloqueio?.recurso_tipo === 'empresa')) && dentroCal(e, d))) livres += 1;
    }
    return { saidas: saidas.length, semana: semana.length, comPend: comPend.length, pessoas, receber, pagar, livres };
  }, [eventos, dados, hoje, de, ate]);

  // ------------------------------------------------------------------ remarcar
  async function remarcar(e: EventoCal, novoInicio: string) {
    if (!e.saidaId || ocupado || novoInicio === e.inicio) return;
    if (novoInicio < hoje) { setErro('Não dá para remarcar uma saída para uma data que já passou.'); return; }
    const dias = diasEntreCal(e.inicio, e.fim);
    const novoFim = somarDiasCal(novoInicio, dias);
    // Simula a nova data e mostra só os conflitos novos desta saída.
    const simulado = (dados?.eventos ?? []).map((x) => (x.id === e.id ? { ...x, inicio: novoInicio, fim: novoFim } : x));
    const novos = detectarConflitosCal(simulado, dados?.recursos ?? [], novoInicio, novoFim)
      .filter((c) => c.eventos.includes(e.id) && !conflitos.some((o) => o.chave === c.chave));
    const linhas = [
      `"${e.titulo}" sai de ${dmCal(e.inicio)} e vai para ${dataLongaCal(novoInicio)}${dias ? ` (até ${dmCal(novoFim)})` : ''}.`,
      e.pessoas ? `${e.pessoas} pessoa(s) em ${e.clientes?.length ?? 0} reserva(s) mudam junto com a saída.` : 'A saída ainda não tem reservas.',
      'As demandas em rascunho ou abertas desta saída acompanham a nova data.',
      e.vouchers ? `${e.vouchers} voucher(s) já emitido(s) vão precisar de nova versão na reserva.` : '',
      novos.length ? `Atenção: ${novos.map((c) => c.texto).join(' ')}` : 'Não encontrei conflito de barco ou guia na nova data.',
      'Nenhuma mensagem sai para o cliente sem você mandar.',
    ].filter(Boolean);
    const ok = await confirmarEDA(linhas.join('\n\n'), { titulo: 'Remarcar saída', confirmar: 'Remarcar', perigo: novos.some((c) => c.grave) });
    if (!ok) return;
    setOcupado(true); setErro('');
    try {
      await remarcarSaidaEDA(e.saidaId, novoInicio, dias);
      setDesfazer({ saidaId: e.saidaId, inicio: e.inicio, dias, texto: `"${e.titulo}" remarcada para ${dmCal(novoInicio)}.` });
      setPainel(null);
      await carregar();
      if (e.pessoas && await confirmarEDA('Quer copiar um aviso pronto para enviar aos clientes desta saída? Você revisa e envia pelo seu WhatsApp.', { titulo: 'Avisar os clientes', confirmar: 'Copiar aviso', cancelar: 'Agora não' })) {
        await copiarEDA(avisoRemarcacaoCal(e.titulo, e.inicio, novoInicio, e.horario), 'Aviso copiado');
      }
    } catch (x) { setErro((x as Error).message); } finally { setOcupado(false); }
  }
  async function desfazerRemarcacao() {
    if (!desfazer || ocupado) return;
    setOcupado(true);
    try { await remarcarSaidaEDA(desfazer.saidaId, desfazer.inicio, desfazer.dias); setAviso('Remarcação desfeita.'); setDesfazer(null); await carregar(); }
    catch (x) { setErro((x as Error).message); } finally { setOcupado(false); }
  }

  // ------------------------------------------------------------------ arrastar (mouse)
  const podeArrastar = (e: EventoCal) => e.tipo === 'saida' && !!e.saidaId && e.fim >= hoje;
  function inicioArraste(ev: DragEvent, e: EventoCal) {
    if (!podeArrastar(e)) { ev.preventDefault(); return; }
    ev.dataTransfer.setData('text/plain', e.id); ev.dataTransfer.effectAllowed = 'move'; setArrastando(e.id);
  }
  function soltar(ev: DragEvent, dia: string) {
    ev.preventDefault(); setAlvoDrop(null);
    const id = ev.dataTransfer.getData('text/plain') || arrastando; setArrastando(null);
    const e = dados?.eventos.find((x) => x.id === id);
    if (e) void remarcar(e, dia);
  }
  const propsDrop = (dia: string) => ({
    onDragOver: (ev: DragEvent) => { if (arrastando) { ev.preventDefault(); if (alvoDrop !== dia) setAlvoDrop(dia); } },
    onDragLeave: () => setAlvoDrop((a) => (a === dia ? null : a)),
    onDrop: (ev: DragEvent) => soltar(ev, dia),
  });

  // ------------------------------------------------------------------ bloqueios
  async function salvarBloqueio() {
    if (painel?.tipo !== 'bloqueio' || ocupado) return;
    setOcupado(true); setErro('');
    try { await salvarBloqueioEDA(painel); setAviso(painel.id ? 'Bloqueio atualizado.' : 'Agenda bloqueada.'); setPainel(null); await carregar(); }
    catch (x) { setErro((x as Error).message); } finally { setOcupado(false); }
  }
  async function removerBloqueio(id: string) {
    if (ocupado || !(await confirmarEDA('Remover este bloqueio da agenda?', { titulo: 'Remover bloqueio', confirmar: 'Remover', perigo: true }))) return;
    setOcupado(true);
    try { await excluirBloqueioEDA(id); setAviso('Bloqueio removido.'); setPainel(null); await carregar(); }
    catch (x) { setErro((x as Error).message); } finally { setOcupado(false); }
  }
  const novoBloqueio = (dia = ancora, recurso_tipo: TipoRecursoCal | 'empresa' = 'embarcacao', recurso_id: string | null = null) =>
    setPainel({ tipo: 'bloqueio', recurso_tipo, recurso_id: recurso_tipo === 'empresa' ? null : recurso_id ?? dados?.recursos.find((r) => r.tipo === recurso_tipo)?.id ?? null, inicio: dia < hoje ? hoje : dia, fim: dia < hoje ? hoje : dia, motivo: recurso_tipo === 'guia' ? 'folga' : recurso_tipo === 'empresa' ? 'fechado' : 'manutencao', observacao: '' });

  // ------------------------------------------------------------------ escala (texto e PDF)
  const nomeRec = useCallback((tipo: TipoRecursoCal, id: string) => dados?.recursos.find((r) => r.tipo === tipo && r.id === id)?.nome ?? '', [dados]);
  function textoEscala(e: EventoCal) {
    const barcos = e.recursos.filter((r) => r.tipo === 'embarcacao').map((r) => nomeRec('embarcacao', r.id)).filter(Boolean);
    const guias = e.recursos.filter((r) => r.tipo === 'guia').map((r) => nomeRec('guia', r.id)).filter(Boolean);
    return [`Escala · ${e.titulo}`, `Saída: ${dataLongaCal(e.inicio)}${e.horario ? ` às ${hora(e.horario)}` : ''}${e.fim !== e.inicio ? ` · retorno ${dmCal(e.fim)}` : ''}`,
      `Pessoas: ${e.pessoas ?? 0}`, `Embarcação: ${barcos.join(', ') || 'a definir'}`, `Guia: ${guias.join(', ') || 'a definir'}`, 'Encantos da Amazônia · Encantos Gestão'].join('\n');
  }
  function pdfEscala() {
    const saidas = eventos.filter((e) => e.tipo === 'saida');
    baixarDocumentoPremiumERN({
      titulo: 'Escala da operação', subtitulo: `${dmCal(de)} a ${dmCal(ate)}`, tipo: 'Escala', nomeArquivo: `EDA-escala-${de}.pdf`,
      tabela: {
        titulo: 'Saídas do período', colunas: ['Data', 'Horário', 'Passeio', 'Pessoas', 'Embarcação', 'Guia', 'Prontidão'],
        linhas: saidas.map((e) => [dmCal(e.inicio) + (e.fim !== e.inicio ? `–${dmCal(e.fim)}` : ''), hora(e.horario) || '—', e.titulo, e.pessoas ?? 0,
          e.recursos.filter((r) => r.tipo === 'embarcacao').map((r) => nomeRec('embarcacao', r.id)).join(', ') || 'a definir',
          e.recursos.filter((r) => r.tipo === 'guia').map((r) => nomeRec('guia', r.id)).join(', ') || 'a definir',
          (e.pendencias ?? []).length ? `${(e.pendencias ?? []).length} pendência(s)` : 'Pronta']),
      },
      observacoes: ['Escala para guias e tripulação: sem dados pessoais de clientes.', 'Confira clima e nível do rio na véspera de cada saída.'],
    });
  }

  // ------------------------------------------------------------------ camada amazônica do período
  const mesRef = Number((visao === 'mes' ? ancora : de).slice(5, 7)) - 1;
  const rio = faseRioCal(mesRef);
  const pesca = temporadaPescaCal(mesRef);
  const festasMes = useMemo(() => {
    const nome = MESES_CAL[mesRef];
    const lista: string[] = [];
    for (const f of fichas) for (const fe of f.festas ?? []) {
      const q = (fe.quando ?? '').trim().toLowerCase();
      if (fe.nome && (q.startsWith(nome) || q.startsWith(nome.replace('ç', 'c')))) lista.push(`${fe.nome.replace(/\s*\(.*?\)\s*/g, ' ').trim()} · ${f.nome}`);
    }
    return lista.slice(0, 6);
  }, [fichas, mesRef]);
  function marcasDia(dia: string) {
    if (!camadas.has('amazonica')) return { lua: null, feriado: null, clima: null };
    const c = climaDia.get(dia);
    return { lua: luaCal(dia), feriado: feriadosCal(Number(dia.slice(0, 4))).get(dia) ?? null, clima: c ? avaliarClimaCal(c) : null };
  }

  // ------------------------------------------------------------------ peças
  const pilula = (e: EventoCal, compacta = false) => (
    <button
      key={e.id}
      type="button"
      className={`eda-cal-ev eda-cal-ev-${e.tipo}`}
      data-tom={e.tom}
      data-arrastando={arrastando === e.id || undefined}
      draggable={podeArrastar(e)}
      onDragStart={(ev) => inicioArraste(ev, e)}
      onDragEnd={() => { setArrastando(null); setAlvoDrop(null); }}
      onClick={(ev) => { ev.stopPropagation(); setPainel({ tipo: 'evento', id: e.id }); }}
      title={`${ROTULO_TIPO[e.tipo]} · ${e.titulo}${e.horario ? ` · ${hora(e.horario)}` : ''}${podeArrastar(e) ? ' · arraste para remarcar' : ''}`}
    >
      <i aria-hidden="true" />
      {!compacta && e.horario && <time>{hora(e.horario)}</time>}
      <span>{e.tipo === 'financeiro' ? `${e.titulo} ${moedaCal(e.valor ?? 0)}` : e.titulo}</span>
      {e.tipo === 'saida' && (e.pendencias ?? []).length > 0 && <b aria-label={`${(e.pendencias ?? []).length} pendências`}>{(e.pendencias ?? []).length}</b>}
    </button>
  );

  const marcas = (dia: string) => {
    const m = marcasDia(dia);
    return (
      <span className="eda-cal-marcas">
        {m.lua && <span className="eda-cal-lua" title={m.lua.nome} aria-label={m.lua.nome}>{m.lua.curto}</span>}
        {m.clima && m.clima.tom !== 'ok' && <span className="eda-cal-clima" data-tom={m.clima.tom} title={m.clima.texto}>{m.clima.curto}</span>}
        {m.feriado && <span className="eda-cal-feriado" title={m.feriado}>Feriado</span>}
      </span>
    );
  };

  // ------------------------------------------------------------------ visões
  function visaoMes() {
    const mes = ancora.slice(0, 7);
    const dias = Array.from({ length: 42 }, (_, i) => somarDiasCal(de, i));
    return (
      <div className="eda-cal-mes" role="grid" aria-label={`Calendário de ${tituloPeriodo('mes', ancora, de, ate)}`}>
        {SEMANA_CAL.map((s) => <div key={s} className="eda-cal-sem" role="columnheader">{s}</div>)}
        {dias.map((dia) => {
          const evs = eventosDoDia(dia);
          const saidas = evs.filter((e) => e.tipo === 'saida');
          const vagas = saidas.reduce((t, e) => t + (e.vagas ?? 0), 0);
          const ocup = saidas.reduce((t, e) => t + (e.pessoas ?? 0), 0);
          const calor = vagas ? Math.min(4, Math.ceil((ocup / vagas) * 4)) : 0;
          const bloqEmp = evs.some((e) => e.tipo === 'bloqueio' && e.bloqueio?.recurso_tipo === 'empresa');
          const conf = conflitoDia.get(dia) ?? 0;
          return (
            <div
              key={dia}
              role="gridcell"
              tabIndex={0}
              className="eda-cal-dia"
              data-fora={dia.slice(0, 7) !== mes || undefined}
              data-hoje={dia === hoje || undefined}
              data-passado={dia < hoje || undefined}
              data-calor={calor || undefined}
              data-bloqueado={bloqEmp || undefined}
              data-conflito={conf ? (conf > 1 ? 'grave' : 'leve') : undefined}
              data-alvo={alvoDrop === dia || undefined}
              onClick={() => setPainel({ tipo: 'dia', dia })}
              onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setPainel({ tipo: 'dia', dia }); } }}
              aria-label={`${dataLongaCal(dia)}: ${evs.length ? `${evs.length} item(ns)` : 'livre'}`}
              {...propsDrop(dia)}
            >
              <div className="eda-cal-dia-topo">
                <span className="eda-cal-num">{Number(dia.slice(8, 10))}</span>
                {marcas(dia)}
              </div>
              <div className="eda-cal-evs">
                {evs.slice(0, 3).map((e) => pilula(e, true))}
                {evs.length > 3 && <span className="eda-cal-mais">+{evs.length - 3}</span>}
              </div>
              {vagas > 0 && <span className="eda-cal-ocup" aria-hidden="true">{ocup}/{vagas}</span>}
            </div>
          );
        })}
      </div>
    );
  }

  function visaoSemana() {
    const dias = Array.from({ length: 7 }, (_, i) => somarDiasCal(de, i));
    const grupos: { titulo: string; tipo: TipoRecursoCal | 'empresa'; lista: (RecursoCal | null)[] }[] = [
      { titulo: 'Empresa', tipo: 'empresa', lista: [null] },
      { titulo: 'Embarcações', tipo: 'embarcacao', lista: dados?.recursos.filter((r) => r.tipo === 'embarcacao') ?? [] },
      { titulo: 'Guias', tipo: 'guia', lista: dados?.recursos.filter((r) => r.tipo === 'guia') ?? [] },
      { titulo: 'Hospedagens', tipo: 'hospedagem', lista: dados?.recursos.filter((r) => r.tipo === 'hospedagem') ?? [] },
    ];
    const doRecurso = (r: RecursoCal | null, dia: string) => eventos.filter((e) => dentroCal(e, dia) && (r
      ? e.recursos.some((x) => x.tipo === r.tipo && x.id === r.id)
      : (e.tipo === 'bloqueio' && e.bloqueio?.recurso_tipo === 'empresa') || ((e.tipo === 'saida' || e.tipo === 'reserva') && !e.recursos.length)));
    return (
      <div className="eda-cal-rec-rolagem">
        <table className="eda-cal-rec">
          <thead>
            <tr><th scope="col">Recurso</th>{dias.map((d) => (
              <th key={d} scope="col" data-hoje={d === hoje || undefined}>
                <span>{SEMANA_CAL[new Date(`${d}T12:00:00Z`).getUTCDay()]}</span> {dmCal(d)} {marcas(d)}
              </th>))}</tr>
          </thead>
          <tbody>
            {grupos.filter((g) => g.lista.length).map((g) => (
              grupo(g, dias, doRecurso)
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  function grupo(g: { titulo: string; tipo: TipoRecursoCal | 'empresa'; lista: (RecursoCal | null)[] }, dias: string[], doRecurso: (r: RecursoCal | null, dia: string) => EventoCal[]) {
    return (
      <Fragment key={g.tipo}>
        <tr className="eda-cal-rec-grupo"><th colSpan={8} scope="rowgroup">{g.titulo}</th></tr>
        {g.lista.map((r) => (
          <tr key={r?.id ?? 'empresa'}>
            <th scope="row">
              <b>{r?.nome ?? 'Sem recurso definido / empresa'}</b>
              {r && <small>{r.tipo === 'embarcacao' && r.capacidade ? `${r.capacidade} lugares · ` : ''}{r.status ?? ''}</small>}
            </th>
            {dias.map((d) => {
              const evs = doRecurso(r, d);
              const conf = r ? conflitos.find((c) => c.recursoId === r.id && c.dia <= d && evs.some((e) => c.eventos.includes(e.id))) : undefined;
              return (
                <td key={d} data-conflito={conf ? (conf.grave ? 'grave' : 'leve') : undefined} data-alvo={alvoDrop === d || undefined} title={conf?.texto} {...propsDrop(d)}>
                  {evs.map((e) => pilula(e))}
                  {!evs.length && d >= hoje && (
                    <button type="button" className="eda-cal-livre" onClick={() => novoBloqueio(d, r?.tipo ?? 'empresa', r?.id ?? null)} aria-label={`Bloquear ${r?.nome ?? 'a empresa'} em ${dmCal(d)}`}>+</button>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </Fragment>
    );
  }

  function cartaoEvento(e: EventoCal) {
    return (
      <CartaoMagneticoEDA key={e.id} as="article" forca={2} className="eda-cal-cartao" data-tom={e.tom}>
        <button type="button" className="eda-cal-cartao-bt" onClick={() => setPainel({ tipo: 'evento', id: e.id })}>
          <span className="eda-cal-cartao-hora">{e.horario ? hora(e.horario) : e.fim !== e.inicio ? `${dmCal(e.inicio)}–${dmCal(e.fim)}` : 'Dia todo'}</span>
          <span className="eda-cal-cartao-txt">
            <small>{ROTULO_TIPO[e.tipo]}</small>
            <b>{e.tipo === 'financeiro' ? `${e.titulo} · ${moedaCal(e.valor ?? 0)}` : e.titulo}</b>
            <span>{e.detalhe}</span>
          </span>
          {e.tipo === 'saida' && (e.pessoas ?? 0) > 0 && (
            <PillEDA tom={e.tom}>{(e.pendencias ?? []).length ? `${(e.pendencias ?? []).length} pendência(s)` : 'Pronta'}</PillEDA>
          )}
        </button>
      </CartaoMagneticoEDA>
    );
  }

  function visaoDia() {
    const evs = eventosDoDia(ancora);
    const c = climaDia.get(ancora);
    const cl = c ? avaliarClimaCal(c) : null;
    const m = marcasDia(ancora);
    return (
      <div className="eda-cal-diaview" {...propsDrop(ancora)}>
        {camadas.has('amazonica') && (cl || m.lua || m.feriado) && (
          <div className="eda-cal-dia-faixa">
            {cl && <PillEDA tom={cl.tom}>{cl.texto}</PillEDA>}
            {m.lua && <PillEDA tom="nt">{m.lua.nome}</PillEDA>}
            {m.feriado && <PillEDA tom="info">Feriado · {m.feriado}</PillEDA>}
          </div>
        )}
        {evs.length ? <div className="eda-cal-lista">{evs.map((e) => cartaoEvento(e))}</div>
          : <VazioEDA titulo="Dia livre" texto="Nenhuma saída, reserva ou vencimento neste dia." acao={
            ancora >= hoje ? <div className="eda-cal-acoes-linha"><Link className="eda-pg-bt eda-pg-bt-ouro" href={`/reservas/nova?data=${ancora}`}>Nova reserva neste dia</Link><button type="button" className="eda-pg-bt" onClick={() => novoBloqueio(ancora)}>Bloquear agenda</button></div> : undefined} />}
      </div>
    );
  }

  function visaoAgenda() {
    const dias = Array.from({ length: diasEntreCal(de, ate) + 1 }, (_, i) => somarDiasCal(de, i)).filter((d) => eventosDoDia(d).length);
    if (!dias.length) return <VazioEDA titulo="Agenda livre nos próximos 30 dias" texto="Abra saídas nos passeios para a Iara oferecer aos visitantes." acao={<Link className="eda-pg-bt eda-pg-bt-ouro" href="/passeios">Abrir saídas</Link>} />;
    return (
      <div className="eda-cal-agenda">
        {dias.map((d) => (
          <section key={d} className="eda-cal-agenda-dia" aria-label={dataLongaCal(d)}>
            <header data-hoje={d === hoje || undefined}>
              <b>{d === hoje ? 'Hoje' : d === somarDiasCal(hoje, 1) ? 'Amanhã' : dataLongaCal(d)}</b>
              {marcas(d)}
            </header>
            <div className="eda-cal-lista">{eventosDoDia(d).map((e) => cartaoEvento(e))}</div>
          </section>
        ))}
      </div>
    );
  }

  // ------------------------------------------------------------------ painel lateral
  function painelEvento(e: EventoCal) {
    const conf = conflitos.filter((c) => c.eventos.includes(e.id));
    const rodape = e.tipo === 'saida' ? (
      <>
        {e.fim >= hoje && <Link className="eda-pg-bt eda-pg-bt-ouro" href={`/reservas/nova?saida=${e.saidaId}`}>Nova reserva nesta saída</Link>}
        <button type="button" className="eda-pg-bt" onClick={() => { pedirEDA(`Prepare a saída "${e.titulo}" de ${dmCal(e.inicio)}. Pendências: ${(e.pendencias ?? []).map((p) => p.texto).join('; ') || 'nenhuma'}. Monte o que você pode fazer para eu autorizar e me diga o que depende só de mim.`); setPainel(null); }}>Preparar com a EDA</button>
        <button type="button" className="eda-pg-bt" onClick={() => void copiarEDA(textoEscala(e), 'Escala copiada')}>Copiar escala</button>
      </>
    ) : e.tipo === 'bloqueio' && e.bloqueio ? (
      <>
        <button type="button" className="eda-pg-bt eda-pg-bt-ouro" onClick={() => setPainel({ tipo: 'bloqueio', id: e.id.split(':')[1], recurso_tipo: e.bloqueio!.recurso_tipo, recurso_id: e.bloqueio!.recurso_id, inicio: e.inicio, fim: e.fim, motivo: e.bloqueio!.motivo, observacao: e.bloqueio!.observacao ?? '' })}>Editar</button>
        <button type="button" className="eda-pg-bt eda-pg-bt-perigo" disabled={ocupado} onClick={() => void removerBloqueio(e.id.split(':')[1])}>Remover</button>
      </>
    ) : e.href ? <Link className="eda-pg-bt eda-pg-bt-ouro" href={e.href}>{e.tipo === 'pedido' ? 'Avaliar e criar reserva' : 'Abrir'}</Link> : null;

    return (
      <PainelLateralEDA titulo={e.titulo} etiqueta={`Calendário · ${ROTULO_TIPO[e.tipo]}`} subtitulo={`${dataLongaCal(e.inicio)}${e.fim !== e.inicio ? ` até ${dataLongaCal(e.fim)}` : ''}${e.horario ? ` · ${hora(e.horario)}` : ''}`} aoFechar={() => setPainel(null)} bloqueado={ocupado} rodape={rodape}>
        <dl className="eda-pg-dados">
          <DadoEDA rotulo="Situação"><PillEDA tom={e.tom}>{e.status ?? (e.tom === 'ok' ? 'Em dia' : 'Acompanhar')}</PillEDA></DadoEDA>
          {e.tipo === 'saida' && <DadoEDA rotulo="Ocupação">{e.pessoas ?? 0} de {e.vagas ?? 0} vagas</DadoEDA>}
          {e.tipo === 'financeiro' && <DadoEDA rotulo="Valor">{moedaCal(e.valor ?? 0)}</DadoEDA>}
          <DadoEDA rotulo="Detalhe" largo>{e.detalhe}</DadoEDA>
          {e.recursos.length > 0 && <DadoEDA rotulo="Recursos" largo>{e.recursos.map((r) => nomeRec(r.tipo, r.id)).filter(Boolean).join(' · ') || '—'}</DadoEDA>}
          {e.tipo === 'saida' && (e.clientes ?? []).length > 0 && <DadoEDA rotulo="Reservas" largo>{(e.clientes ?? []).join(', ')}</DadoEDA>}
        </dl>

        {e.tipo === 'saida' && e.fim >= hoje && (
          <div className="eda-pg-bloco">
            <p className="eda-pg-bloco-titulo">Prontidão</p>
            {(e.pessoas ?? 0) === 0 ? <p className="eda-pg-texto-mut">Saída aberta, ainda sem reservas.</p>
              : (e.pendencias ?? []).length ? (
                <ul className="eda-cal-pend">{(e.pendencias ?? []).map((p) => <li key={p.chave}><span>{p.texto}</span><Link href={p.href} className="eda-cal-lk">Resolver</Link></li>)}</ul>
              ) : <p className="eda-pg-texto-mut">Tudo pronto: reservas confirmadas, guia, barco e demanda em ordem.</p>}
          </div>
        )}

        {conf.length > 0 && (
          <div className="eda-pg-bloco eda-cal-bloco-conf">
            <p className="eda-pg-bloco-titulo">Conflitos</p>
            <ul className="eda-cal-pend">{conf.map((c) => <li key={c.chave}><span>{c.texto}</span></li>)}</ul>
          </div>
        )}

        {e.tipo === 'saida' && e.fim >= hoje && (
          <div className="eda-pg-bloco">
            <p className="eda-pg-bloco-titulo">Remarcar</p>
            <div className="eda-cal-remarcar">
              <label className="eda-pg-campo"><span>Nova data de saída</span><input type="date" min={hoje} value={novaData} onChange={(x) => setNovaData(x.target.value)} /></label>
              <button type="button" className="eda-pg-bt" disabled={ocupado || !novaData || novaData === e.inicio} onClick={() => void remarcar(e, novaData)}>Remarcar</button>
            </div>
            <p className="eda-pg-nota">No computador, você também pode arrastar a saída para outro dia. A EDA mostra o impacto antes e você pode desfazer.</p>
          </div>
        )}
      </PainelLateralEDA>
    );
  }

  function painelDia(dia: string) {
    const evs = eventosDoDia(dia);
    const m = marcasDia(dia);
    const c = climaDia.get(dia);
    const cl = c ? avaliarClimaCal(c) : null;
    const rodape = dia >= hoje ? (
      <>
        <Link className="eda-pg-bt eda-pg-bt-ouro" href={`/reservas/nova?data=${dia}`}>Nova reserva</Link>
        <button type="button" className="eda-pg-bt" onClick={() => novoBloqueio(dia)}>Bloquear agenda</button>
        <button type="button" className="eda-pg-bt" onClick={() => { setAncora(dia); trocarVisao('dia'); setPainel(null); }}>Ver o dia</button>
      </>
    ) : <button type="button" className="eda-pg-bt" onClick={() => { setAncora(dia); trocarVisao('dia'); setPainel(null); }}>Ver o dia</button>;
    return (
      <PainelLateralEDA titulo={dataLongaCal(dia)} etiqueta="Calendário · Dia" aoFechar={() => setPainel(null)} rodape={rodape}>
        {(cl || m.lua || m.feriado) && (
          <div className="eda-cal-dia-faixa">
            {cl && <PillEDA tom={cl.tom}>{cl.texto}</PillEDA>}
            {m.lua && <PillEDA tom="nt">{m.lua.nome}</PillEDA>}
            {m.feriado && <PillEDA tom="info">{m.feriado}</PillEDA>}
          </div>
        )}
        {evs.length ? <div className="eda-cal-lista">{evs.map((e) => cartaoEvento(e))}</div>
          : <p className="eda-pg-texto-mut">Dia livre. {dia >= hoje ? 'Que tal abrir uma saída ou pedir uma ideia de oferta à EDA?' : ''}</p>}
        {dia >= hoje && <button type="button" className="eda-cal-lk eda-cal-eda" onClick={() => { pedirEDA(`O que tenho em ${dmCal(dia)}? Confira saídas, reservas, guias, barcos e pendências desse dia e me diga o que preparar.`); setPainel(null); }}>Perguntar à EDA sobre este dia</button>}
      </PainelLateralEDA>
    );
  }

  function painelBloqueio(p: Extract<Painel, { tipo: 'bloqueio' }>) {
    const opcoes = p.recurso_tipo === 'empresa' ? [] : (dados?.recursos ?? []).filter((r) => r.tipo === p.recurso_tipo);
    const mudar = (campos: Partial<typeof p>) => setPainel({ ...p, ...campos });
    return (
      <PainelLateralEDA titulo={p.id ? 'Editar bloqueio' : 'Bloquear agenda'} etiqueta="Calendário · Recursos" subtitulo="Barco em manutenção, folga de guia, hospedagem fechada ou dia sem operação." aoFechar={() => setPainel(null)} bloqueado={ocupado}
        rodape={<><button type="button" className="eda-pg-bt eda-pg-bt-ouro" disabled={ocupado} onClick={() => void salvarBloqueio()}>{ocupado ? 'Salvando…' : 'Salvar bloqueio'}</button><button type="button" className="eda-pg-bt" onClick={() => setPainel(null)}>Cancelar</button></>}>
        <form className="eda-pg-form" onSubmit={(x) => { x.preventDefault(); void salvarBloqueio(); }}>
          <label className="eda-pg-campo"><span>O que bloquear</span>
            <select value={p.recurso_tipo} onChange={(x) => { const t = x.target.value as TipoRecursoCal | 'empresa'; mudar({ recurso_tipo: t, recurso_id: t === 'empresa' ? null : dados?.recursos.find((r) => r.tipo === t)?.id ?? null }); }}>
              <option value="embarcacao">Embarcação</option><option value="guia">Guia</option><option value="hospedagem">Hospedagem</option><option value="empresa">Empresa inteira (sem operação)</option>
            </select>
          </label>
          {p.recurso_tipo !== 'empresa' && (
            <label className="eda-pg-campo"><span>Qual</span>
              <select value={p.recurso_id ?? ''} onChange={(x) => mudar({ recurso_id: x.target.value || null })}>
                {!opcoes.length && <option value="">Nenhum cadastrado</option>}
                {opcoes.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
            </label>
          )}
          <div className="eda-pg-form-2">
            <label className="eda-pg-campo"><span>De</span><input type="date" value={p.inicio} onChange={(x) => mudar({ inicio: x.target.value, fim: x.target.value > p.fim ? x.target.value : p.fim })} required /></label>
            <label className="eda-pg-campo"><span>Até</span><input type="date" min={p.inicio} value={p.fim} onChange={(x) => mudar({ fim: x.target.value })} required /></label>
          </div>
          <label className="eda-pg-campo"><span>Motivo</span>
            <select value={p.motivo} onChange={(x) => mudar({ motivo: x.target.value })}>{MOTIVOS_BLOQUEIO.map((m) => <option key={m.valor} value={m.valor}>{m.rotulo}</option>)}</select>
          </label>
          <label className="eda-pg-campo"><span>Observação (opcional)</span><textarea rows={3} maxLength={300} value={p.observacao} onChange={(x) => mudar({ observacao: x.target.value })} placeholder="Ex.: troca do motor, volta dia 20" /></label>
          <p className="eda-pg-nota">O calendário avisa se algum passeio já usa esse recurso nas datas bloqueadas.</p>
        </form>
      </PainelLateralEDA>
    );
  }

  // ------------------------------------------------------------------ tela
  const titulo = tituloPeriodo(visao, ancora, de, ate);
  const naHoje = visao === 'mes' ? ancora.slice(0, 7) === hoje.slice(0, 7) : dentroCal({ inicio: de, fim: ate }, hoje);

  return (
    <PaginaEDA className="eda-pg-auto eda-cal">
      <div className="eda-pg-miolo" style={{ maxWidth: 1360 }}>
        <CabecalhoEDA
          capa
          etiqueta="Operação · Calendário Amazônico"
          titulo="Calendário Amazônico"
          resumo="Saídas, reservas, recursos, vencimentos e o ritmo do rio num só lugar. Resolva tudo daqui, sem sair da página."
          acoes={<>
            <button type="button" className="eda-pg-bt" onClick={() => novoBloqueio()}>Bloquear agenda</button>
            <Link className="eda-pg-bt" href="/passeios">Abrir saídas</Link>
            <button type="button" className="eda-pg-bt eda-pg-bt-ouro" onClick={() => pedirEDA(`Estou no Calendário Amazônico vendo ${titulo}. Me dê um resumo do período: saídas, pendências, conflitos de barco e guia, dias livres e o que eu devo preparar primeiro.`)}>Resumo da EDA</button>
          </>}
        />

        {camadas.has('amazonica') && (
          <CartaoMagneticoEDA as="section" forca={2} className="eda-cal-amazonia" aria-label="Ritmo amazônico do período">
            <div><small>Rio Negro · referência</small><b>{rio.nome}</b><span>{rio.texto}</span></div>
            <div><small>Pesca esportiva</small><b>{pesca.ativa ? 'Em temporada' : 'Fora da temporada'}</b><span>{pesca.texto}</span></div>
            <div><small>Festas de {MESES_CAL[mesRef]}</small><b>{festasMes.length ? `${festasMes.length} no Amazonas` : 'Sem festa cadastrada'}</b><span>{festasMes.slice(0, 3).join(' · ') || 'As fichas dos municípios alimentam esta faixa.'}</span></div>
          </CartaoMagneticoEDA>
        )}

        <div className="eda-pg-kpis eda-cal-kpis">
          <div className={`eda-pg-kpi ${resumo.comPend ? 'eda-pg-kpi-at' : 'eda-pg-kpi-ok'}`}><small>Saídas nos próximos 7 dias</small><b>{resumo.semana}</b><span>{resumo.comPend ? `${resumo.comPend} com pendência` : 'Todas em dia'}</span></div>
          <div className={`eda-pg-kpi ${conflitos.some((c) => c.grave) ? 'eda-pg-kpi-er' : ''}`}><small>Conflitos no período</small><b>{conflitos.length}</b><span>{conflitos.length ? 'Barco, guia ou bloqueio' : 'Nenhum encontrado'}</span></div>
          <div className="eda-pg-kpi"><small>Pessoas em saídas</small><b>{resumo.pessoas}</b><span>{resumo.saidas} saída(s) no período</span></div>
          {financeiroLiberado
            ? <div className="eda-pg-kpi"><small>A receber · a pagar</small><b>{moedaCal(resumo.receber)}</b><span>A pagar: {moedaCal(resumo.pagar)}</span></div>
            : <div className="eda-pg-kpi"><small>Dias livres (14 dias)</small><b>{resumo.livres}</b><span>Oportunidade de nova saída</span></div>}
        </div>

        {(resumo.livres >= 3 || (dados?.pedidosSemData ?? 0) > 0) && (
          <div className="eda-pg-aviso eda-pg-aviso-ouro eda-cal-sugestao" role="note">
            <span>
              {resumo.livres >= 3 && <>Você tem <b>{resumo.livres} dias sem saída</b> nas próximas duas semanas. </>}
              {(dados?.pedidosSemData ?? 0) > 0 && <><b>{dados?.pedidosSemData} pedido(s) da Iara</b> sem data definida aguardando você. </>}
            </span>
            <span className="eda-cal-acoes-linha">
              {resumo.livres >= 3 && <button type="button" className="eda-pg-bt eda-pg-bt-p" onClick={() => pedirEDA('Tenho dias livres nas próximas duas semanas. Sugira saídas para abrir (passeio, data, vagas) pensando na fase do rio e na temporada, e prepare para eu autorizar.')}>Pedir ideia à EDA</button>}
              {(dados?.pedidosSemData ?? 0) > 0 && <Link className="eda-pg-bt eda-pg-bt-p" href="/reservas/pedidos">Ver pedidos</Link>}
            </span>
          </div>
        )}

        <div className="eda-cal-barra">
          <div className="eda-cal-nav">
            <button type="button" className="eda-pg-bt eda-pg-bt-p" onClick={() => navegar(-1)} aria-label="Período anterior">←</button>
            <h2 className="eda-cal-titulo">{titulo}</h2>
            <button type="button" className="eda-pg-bt eda-pg-bt-p" onClick={() => navegar(1)} aria-label="Próximo período">→</button>
            {!naHoje && <button type="button" className="eda-pg-bt eda-pg-bt-p eda-pg-bt-ouro" onClick={() => setAncora(hoje)}>Hoje</button>}
            {visao === 'semana' && <button type="button" className="eda-pg-bt eda-pg-bt-p" onClick={pdfEscala}>PDF da escala</button>}
          </div>
          <div className="eda-pg-chips" role="group" aria-label="Visão">
            {VISOES.map((v) => <button key={v.valor} type="button" className="eda-pg-chip" aria-pressed={visao === v.valor} onClick={() => trocarVisao(v.valor)}>{v.rotulo}</button>)}
          </div>
          <div className="eda-pg-chips eda-cal-camadas" role="group" aria-label="Camadas">
            {CAMADAS.map((c) => <button key={c.valor} type="button" className="eda-pg-chip" data-camada={c.valor} aria-pressed={camadas.has(c.valor)} onClick={() => alternarCamada(c.valor)}><i aria-hidden="true" />{c.rotulo}</button>)}
          </div>
        </div>

        {fraco && <p className="eda-pg-nota">Sinal fraco: o calendário está no modo leve (sem previsão do tempo). Tudo continua funcionando.</p>}
        {erro && <p className="eda-pg-aviso eda-pg-aviso-er" role="alert">{erro}</p>}

        {conflitos.length > 0 && camadas.has('operacao') && (
          <section className="eda-cal-conflitos" aria-label="Conflitos">
            {conflitos.slice(0, 4).map((c) => (
              <div key={c.chave} className="eda-cal-conflito" data-grave={c.grave || undefined}>
                <span><b>{dmCal(c.dia)}</b> {c.texto}</span>
                <button type="button" className="eda-cal-lk" onClick={() => setPainel({ tipo: 'evento', id: c.eventos[0] })}>Ver</button>
              </div>
            ))}
            {conflitos.length > 4 && <button type="button" className="eda-cal-lk" onClick={() => pedirEDA(`O calendário mostra ${conflitos.length} conflitos: ${conflitos.map((c) => `${dmCal(c.dia)} ${c.texto}`).join(' | ')}. Me ajude a resolver, começando pelos mais graves.`)}>Resolver os {conflitos.length} com a EDA</button>}
          </section>
        )}

        <div className="eda-cal-corpo" aria-busy={!dados}>
          {!dados ? <div className="eda-cal-carregando" aria-label="Carregando calendário"><i /><i /><i /></div>
            : visao === 'mes' ? visaoMes() : visao === 'semana' ? visaoSemana() : visao === 'dia' ? visaoDia() : visaoAgenda()}
        </div>

        <p className="eda-cal-legenda">
          <span data-tom="ok">Pronta</span><span data-tom="at">Prepare</span><span data-tom="er">Resolva hoje</span><span data-tom="info">Agendada</span><span data-tom="nt">Bloqueio / passado</span>
          <small>Rio, pesca e lua são referências médias do Rio Negro: confirme as condições locais antes de cada saída.</small>
        </p>
      </div>

      {painel?.tipo === 'evento' && eventoAberto && painelEvento(eventoAberto)}
      {painel?.tipo === 'dia' && painelDia(painel.dia)}
      {painel?.tipo === 'bloqueio' && painelBloqueio(painel)}

      {aviso && <div role="status" className="eda-pg-toast">{aviso}</div>}
      {desfazer && (
        <div role="status" className="eda-pg-toast eda-cal-desfazer">
          <span>{desfazer.texto}</span>
          <button type="button" className="eda-cal-lk" disabled={ocupado} onClick={() => void desfazerRemarcacao()}>Desfazer</button>
        </div>
      )}
    </PaginaEDA>
  );
}

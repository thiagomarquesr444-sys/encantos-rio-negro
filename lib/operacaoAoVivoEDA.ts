// EDA_OPERACAO_AO_VIVO_V1: tipos, fila sem sinal e alertas da Operação ao vivo.

import { supabase } from '@/lib/supabase';

export type TipoEventoEDA = 'embarque' | 'partida' | 'parada' | 'chegada' | 'retorno' | 'ocorrencia' | 'suprimento' | 'emergencia' | 'nota' | 'resolvido';
export type GravidadeEDA = 'info' | 'atencao' | 'grave';

export type EventoOperacaoEDA = { id: string; tipo: TipoEventoEDA; gravidade: GravidadeEDA; texto: string | null; autor: string | null; em: string; lat: number | null; lng: number | null };
export type ViagemAoVivoEDA = {
  chave: string; saida_id: string | null; reservas: string[]; passeio: string | null;
  inicio: string; fim: string; horario: string | null; dias: number; pessoas: number;
  clientes: string | null; nao_confirmadas: number;
  embarcacao: { nome: string; capacidade: number | null; marinheiro: string | null } | null;
  guia: { nome: string; telefone: string | null; tem_conta: boolean } | null;
  posicao: { lat: number; lng: number; em: string; precisao: number | null; velocidade: number | null; bateria: number | null } | null;
  trilha: [number, number][];
  eventos: EventoOperacaoEDA[];
  saude: { graves: number; atencao: number; fichas: number; nao_nadam: number };
  suprimentos: { demandas: number; planejado_pessoas: number | null; planejado_dias: number | null; itens: number; pendentes: number; separacao: number; atendidos: number; combustivel: number; alimentacao: number; coletes: number };
};

export const ROTULO_EVENTO: Record<TipoEventoEDA, string> = {
  embarque: 'Embarque concluído', partida: 'Partiu', parada: 'Parada', chegada: 'Chegou ao destino',
  retorno: 'Retornou', ocorrencia: 'Ocorrência', suprimento: 'Suprimento', emergencia: 'EMERGÊNCIA', nota: 'Nota', resolvido: 'Situação resolvida',
};
const FASES: TipoEventoEDA[] = ['embarque', 'partida', 'parada', 'chegada', 'retorno'];

export const hojeManaus = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Manaus' }).format(new Date());

export function minutosDesde(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}
export function tempoRelativo(iso: string | null | undefined): string {
  const m = minutosDesde(iso);
  if (m === null) return 'nunca';
  if (m < 1) return 'agora';
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h${m % 60 ? ` ${m % 60} min` : ''}`;
  return `há ${Math.floor(h / 24)} dia(s)`;
}

// Fase atual da viagem pelo último registro de etapa.
export function faseViagem(v: ViagemAoVivoEDA): { rotulo: string; tom: 'ok' | 'at' | 'er' | 'info' | 'nt'; emCurso: boolean } {
  const ult = v.eventos.find((e) => FASES.includes(e.tipo));
  const hoje = hojeManaus();
  if (ult?.tipo === 'retorno') return { rotulo: 'Retornou', tom: 'ok', emCurso: false };
  if (ult) return { rotulo: ROTULO_EVENTO[ult.tipo], tom: 'info', emCurso: true };
  if (v.inicio > hoje) return { rotulo: 'Sai amanhã', tom: 'nt', emCurso: false };
  if (v.posicao) return { rotulo: 'Em operação', tom: 'info', emCurso: true };
  const agora = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Manaus', hour: '2-digit', minute: '2-digit' }).format(new Date());
  if (v.inicio < hoje || (v.horario && v.horario.slice(0, 5) <= agora)) return { rotulo: 'Deveria ter saído', tom: 'at', emCurso: true };
  return { rotulo: `Sai hoje${v.horario ? ` às ${v.horario.slice(0, 5)}` : ''}`, tom: 'nt', emCurso: false };
}

export type AlertaOperacaoEDA = { tom: 'er' | 'at' | 'nt'; area: 'sinal' | 'seguranca' | 'suprimentos' | 'equipe' | 'reserva'; texto: string };

export function alertasViagem(v: ViagemAoVivoEDA): AlertaOperacaoEDA[] {
  const a: AlertaOperacaoEDA[] = [];
  const fase = faseViagem(v);
  const s = v.suprimentos;

  // Emergência aberta (sem "resolvido" depois dela).
  const iEmerg = v.eventos.findIndex((e) => e.tipo === 'emergencia');
  const iResolv = v.eventos.findIndex((e) => e.tipo === 'resolvido');
  if (iEmerg >= 0 && (iResolv < 0 || iResolv > iEmerg)) {
    a.push({ tom: 'er', area: 'seguranca', texto: `Emergência registrada ${tempoRelativo(v.eventos[iEmerg].em)}${v.eventos[iEmerg].texto ? `: ${v.eventos[iEmerg].texto}` : ''}` });
  }

  // Sinal / localização.
  if (fase.emCurso) {
    const m = minutosDesde(v.posicao?.em);
    if (m === null) a.push({ tom: 'at', area: 'sinal', texto: 'Ninguém a bordo está transmitindo a localização.' });
    else if (m > 120) a.push({ tom: 'er', area: 'sinal', texto: `Sem localização ${tempoRelativo(v.posicao?.em)}. Tente contato com o guia.` });
    else if (m > 30) a.push({ tom: 'at', area: 'sinal', texto: `Última localização ${tempoRelativo(v.posicao?.em)} (pode ser área sem sinal).` });
  }
  if (v.posicao?.bateria != null && v.posicao.bateria <= 20 && fase.emCurso) a.push({ tom: 'at', area: 'sinal', texto: `Bateria do aparelho a bordo em ${v.posicao.bateria}%.` });

  // Ocorrências e suprimentos relatados nas últimas 24 h.
  for (const e of v.eventos) {
    if ((minutosDesde(e.em) ?? 9999) > 1440) continue;
    if (iResolv >= 0 && v.eventos.indexOf(e) > iResolv) continue;
    if (e.tipo === 'ocorrencia' || e.tipo === 'suprimento') {
      a.push({ tom: e.gravidade === 'grave' ? 'er' : 'at', area: e.tipo === 'suprimento' ? 'suprimentos' : 'seguranca', texto: `${ROTULO_EVENTO[e.tipo]} a bordo: ${e.texto || 'sem detalhes'} (${tempoRelativo(e.em)})` });
    }
  }

  // Embarcação, guia e lotação.
  if (!v.embarcacao) a.push({ tom: 'at', area: 'equipe', texto: 'Viagem sem embarcação vinculada.' });
  else if (v.embarcacao.capacidade && v.pessoas > v.embarcacao.capacidade) a.push({ tom: 'er', area: 'seguranca', texto: `Lotação: ${v.pessoas} pessoas para ${v.embarcacao.capacidade} lugares em ${v.embarcacao.nome}.` });
  if (!v.guia) a.push({ tom: 'at', area: 'equipe', texto: 'Viagem sem guia escalado.' });
  else if (!v.guia.tem_conta) a.push({ tom: 'nt', area: 'equipe', texto: `${v.guia.nome} não tem conta na EDA: a localização precisa ser enviada por alguém da equipe a bordo.` });

  // Saúde (só contagens).
  if (v.saude.graves) a.push({ tom: 'at', area: 'seguranca', texto: `${v.saude.graves} alerta(s) grave(s) de saúde a bordo — confira o resumo de segurança.` });
  if (v.saude.nao_nadam) a.push({ tom: 'at', area: 'seguranca', texto: `${v.saude.nao_nadam} pessoa(s) não sabem nadar: colete obrigatório.` });
  if (v.saude.fichas < v.pessoas) a.push({ tom: 'nt', area: 'seguranca', texto: `${v.pessoas - v.saude.fichas} ficha(s) de saúde não preenchida(s).` });

  // Suprimentos: a demanda cobre quem viaja e por quantos dias?
  if (!v.saida_id) {
    a.push({ tom: 'nt', area: 'suprimentos', texto: 'Reserva sem saída: ligue a uma saída para conferir os suprimentos.' });
  } else if (!s.demandas) {
    a.push({ tom: v.dias > 1 ? 'er' : 'at', area: 'suprimentos', texto: 'Nenhuma demanda de suprimentos ligada a esta saída.' });
  } else {
    if (s.planejado_pessoas && s.planejado_pessoas < v.pessoas) a.push({ tom: 'er', area: 'suprimentos', texto: `Suprimentos planejados para ${s.planejado_pessoas} pessoa(s), mas viajam ${v.pessoas}.` });
    if (s.planejado_dias && s.planejado_dias < v.dias) a.push({ tom: 'er', area: 'suprimentos', texto: `Suprimentos para ${s.planejado_dias} dia(s); a viagem tem ${v.dias}.` });
    if (s.pendentes + s.separacao > 0) a.push({ tom: fase.emCurso ? 'er' : 'at', area: 'suprimentos', texto: `${s.pendentes + s.separacao} item(ns) ainda não atendido(s) na lista de suprimentos.` });
    if (s.itens && s.coletes < v.pessoas) a.push({ tom: 'er', area: 'suprimentos', texto: `Coletes na lista: ${s.coletes} para ${v.pessoas} pessoa(s).` });
    if (s.itens && !s.combustivel && v.embarcacao) a.push({ tom: 'at', area: 'suprimentos', texto: 'Lista sem combustível.' });
    if (s.itens && !s.alimentacao && v.dias > 1) a.push({ tom: 'at', area: 'suprimentos', texto: 'Lista sem alimentação/bebidas para viagem de mais de um dia.' });
  }
  if (v.nao_confirmadas) a.push({ tom: 'at', area: 'reserva', texto: `${v.nao_confirmadas} reserva(s) desta viagem ainda não confirmada(s).` });

  const peso = { er: 0, at: 1, nt: 2 };
  return a.sort((x, y) => peso[x.tom] - peso[y.tom]);
}

// ---------------------------------------------------------------------------
// Fila sem sinal: posições e registros ficam no aparelho até a conexão voltar.
// ---------------------------------------------------------------------------
export type PontoFila = { lat: number; lng: number; precisao?: number; velocidade?: number; rumo?: number; bateria?: number; em: string };
type EventoFila = { tipo: TipoEventoEDA; texto?: string; gravidade?: GravidadeEDA; lat?: number; lng?: number; em: string };
type Fila = { pontos: PontoFila[]; eventos: EventoFila[] };

const chave = (reservaId: string) => `eda.bordo.fila.${reservaId}`;
function lerFila(reservaId: string): Fila {
  try { const f = JSON.parse(localStorage.getItem(chave(reservaId)) || ''); return { pontos: f.pontos ?? [], eventos: f.eventos ?? [] }; }
  catch { return { pontos: [], eventos: [] }; }
}
function gravarFila(reservaId: string, f: Fila) {
  try { localStorage.setItem(chave(reservaId), JSON.stringify({ pontos: f.pontos.slice(-1500), eventos: f.eventos.slice(-200) })); } catch { /* armazenamento cheio */ }
}
export function tamanhoFila(reservaId: string) { const f = lerFila(reservaId); return f.pontos.length + f.eventos.length; }

export function enfileirarPonto(reservaId: string, p: PontoFila) { const f = lerFila(reservaId); f.pontos.push(p); gravarFila(reservaId, f); }
export function enfileirarEvento(reservaId: string, e: EventoFila) { const f = lerFila(reservaId); f.eventos.push(e); gravarFila(reservaId, f); }

let enviando = false;
// Envia o que estiver na fila; devolve quantos itens ainda faltam.
export async function enviarFila(reservaId: string): Promise<{ restam: number; erro?: string }> {
  if (enviando) return { restam: tamanhoFila(reservaId) };
  enviando = true;
  try {
    let f = lerFila(reservaId);
    while (f.eventos.length) {
      const e = f.eventos[0];
      const { error } = await supabase.rpc('registrar_evento_operacao_eda', {
        p_reserva_id: reservaId, p_tipo: e.tipo, p_texto: e.texto ?? null, p_gravidade: e.gravidade ?? null,
        p_lat: e.lat ?? null, p_lng: e.lng ?? null, p_em: e.em,
      });
      if (error) return { restam: f.pontos.length + f.eventos.length, erro: traduzirErro(error.message) };
      f = lerFila(reservaId); f.eventos.shift(); gravarFila(reservaId, f);
    }
    while (f.pontos.length) {
      const lote = f.pontos.slice(0, 300);
      const { error } = await supabase.rpc('registrar_posicoes_operacao_eda', { p_reserva_id: reservaId, p_pontos: lote });
      if (error) return { restam: f.pontos.length, erro: traduzirErro(error.message) };
      f = lerFila(reservaId); f.pontos.splice(0, lote.length); gravarFila(reservaId, f);
    }
    return { restam: 0 };
  } catch {
    return { restam: tamanhoFila(reservaId), erro: 'Sem conexão. Os dados ficam guardados e são enviados quando o sinal voltar.' };
  } finally { enviando = false; }
}

export function traduzirErro(m: string): string {
  if (m.includes('EDA_FORA_DA_VIAGEM')) return 'Fora das datas da viagem: a localização só é enviada durante a viagem.';
  if (m.includes('EDA_SEM_PERMISSAO')) return 'Sem permissão para esta viagem.';
  if (/fetch|network|Failed/i.test(m)) return 'Sem conexão. Os dados ficam guardados e são enviados quando o sinal voltar.';
  return 'Não foi possível enviar agora. Tentaremos de novo.';
}

// Distância em metros (haversine).
export function distanciaM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

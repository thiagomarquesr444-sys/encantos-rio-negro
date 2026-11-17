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
  // EDA_ROTA_PASSEIO_V1
  passeio_id?: string | null;
  rota?: RotaEDA | null;
  destino?: { lat: number; lng: number; nome: string | null } | null;
  embarque?: string | null;
  embarque_pos?: { lat: number; lng: number } | null; // EDA_LOGISTICA_PASSEIO_V1
  recentes?: [number, number, string][];
};

export type ParadaRotaEDA = { lat: number; lng: number; nome: string; minutos?: number };
export type RotaEDA = { pontos: [number, number][]; paradas?: ParadaRotaEDA[]; velocidade_kmh?: number };

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

export type AlertaOperacaoEDA = { tom: 'er' | 'at' | 'nt'; area: 'sinal' | 'rota' | 'seguranca' | 'suprimentos' | 'equipe' | 'reserva'; texto: string };

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
  // EDA_ROTA_PASSEIO_V1: percurso planejado, embarcação parada e desvio de rota.
  const r = analisarRota(v);
  const fresca = (minutosDesde(v.posicao?.em) ?? 9999) <= 30;
  if (!r.temRota && (fase.emCurso || v.inicio <= hojeManaus())) {
    a.push({ tom: 'at', area: 'rota', texto: 'Percurso não marcado no passeio: abra o passeio e marque, em Logística da viagem, o caminho pelo rio até o destino para a EDA acompanhar a embarcação.' });
  }
  if (fase.emCurso && fresca && r.paradoMin !== null && r.paradoMin >= 15) {
    if (r.paradaPrevista) {
      const lim = (r.paradaPrevista.minutos ?? 60) + 20;
      if (r.paradoMin > lim) a.push({ tom: 'at', area: 'rota', texto: `Parada em ${r.paradaPrevista.nome} já dura ${duracao(r.paradoMin)} (previsto ${duracao(r.paradaPrevista.minutos ?? 60)}).` });
    } else if (!r.noDestino && !r.noEmbarque) {
      a.push({ tom: 'er', area: 'rota', texto: `Embarcação parada há ${duracao(r.paradoMin)} fora das paradas previstas. Pode ter ocorrido alguma coisa: tente contato com o guia.` });
    }
  }
  if (fase.emCurso && fresca && r.foraDaRota && r.distanciaRotaM !== null) {
    a.push({ tom: 'er', area: 'rota', texto: `Embarcação fora do percurso planejado (${formatarDistancia(r.distanciaRotaM)} do caminho).` });
  }
  if (fase.emCurso && r.atrasoMin !== null && r.atrasoMin >= 30) {
    a.push({ tom: 'at', area: 'rota', texto: `Chegada ao destino atrasada em ${duracao(r.atrasoMin)} em relação ao previsto.` });
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
  a.push(...alertasDestino(v));
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

// ---------------------------------------------------------------------------
// EDA_ROTA_PASSEIO_V1: análise da posição em relação ao percurso planejado.
// ---------------------------------------------------------------------------
const RAIO_PARADO_M = 150;     // movimentos menores que isso contam como "parado"
const RAIO_PARADA_M = 400;     // perto de uma parada prevista
const RAIO_PONTA_M = 500;      // perto do embarque ou do destino
const LIMITE_DESVIO_M = 500;   // distância máxima do caminho antes do alerta

export function duracao(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return `${h} h${m ? ` ${m} min` : ''}`;
}
export function formatarDistancia(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0).replace('.', ',')} km`;
}

// Ponto mais próximo de um segmento (projeção local, precisa para distâncias de rio).
function projetar(p: { lat: number; lng: number }, a: [number, number], b: [number, number]) {
  const k = Math.cos((p.lat * Math.PI) / 180);
  const ax = a[1] * k, ay = a[0], bx = b[1] * k, by = b[0], px = p.lng * k, py = p.lat;
  const dx = bx - ax, dy = by - ay;
  const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
  const q = { lat: a[0] + (b[0] - a[0]) * t, lng: a[1] + (b[1] - a[1]) * t };
  return { t, distancia: distanciaM(p, q) };
}

export type AnaliseRotaEDA = {
  temRota: boolean; totalM: number; percorridoM: number | null; restanteM: number | null;
  distanciaRotaM: number | null; foraDaRota: boolean;
  paradoMin: number | null; paradaPrevista: ParadaRotaEDA | null; noDestino: boolean; noEmbarque: boolean;
  chegadaPrevista: string | null; atrasoMin: number | null;
};

export function analisarRota(v: ViagemAoVivoEDA): AnaliseRotaEDA {
  const pts = (v.rota?.pontos ?? []).filter((p) => Array.isArray(p) && p.length === 2);
  const temRota = pts.length >= 2;
  const seg: number[] = [];
  for (let i = 1; i < pts.length; i++) seg.push(distanciaM({ lat: pts[i - 1][0], lng: pts[i - 1][1] }, { lat: pts[i][0], lng: pts[i][1] }));
  const totalM = seg.reduce((t, d) => t + d, 0);
  const pos = v.posicao;
  const fim = v.destino ?? (temRota ? { lat: pts[pts.length - 1][0], lng: pts[pts.length - 1][1], nome: null } : null);
  const inicio = v.embarque_pos ?? (temRota ? { lat: pts[0][0], lng: pts[0][1] } : null);

  let percorridoM: number | null = null, distanciaRotaM: number | null = null;
  if (pos && temRota) {
    let melhor = Infinity, acumulado = 0;
    for (let i = 1; i < pts.length; i++) {
      const pr = projetar(pos, pts[i - 1], pts[i]);
      if (pr.distancia < melhor) { melhor = pr.distancia; percorridoM = acumulado + seg[i - 1] * pr.t; }
      acumulado += seg[i - 1];
    }
    distanciaRotaM = melhor;
  }
  const folga = Math.max(LIMITE_DESVIO_M, (pos?.precisao ?? 0) * 1.5);
  const foraDaRota = distanciaRotaM !== null && distanciaRotaM > folga;

  // Parado: posições recentes todas dentro de um raio pequeno em volta da última.
  let paradoMin: number | null = null;
  const rec = (v.recentes ?? []).filter((x) => Array.isArray(x) && x.length === 3);
  if (rec.length >= 2) {
    const ult = { lat: rec[rec.length - 1][0], lng: rec[rec.length - 1][1] };
    let desde = rec[rec.length - 1][2];
    for (let i = rec.length - 2; i >= 0; i--) {
      if (distanciaM(ult, { lat: rec[i][0], lng: rec[i][1] }) > RAIO_PARADO_M) break;
      desde = rec[i][2];
    }
    const m = Math.round((Date.parse(rec[rec.length - 1][2]) - Date.parse(desde)) / 60000);
    paradoMin = m > 0 ? m + (minutosDesde(rec[rec.length - 1][2]) ?? 0) : null;
  }
  const paradaPrevista = pos ? (v.rota?.paradas ?? []).find((p) => distanciaM(pos, p) <= RAIO_PARADA_M) ?? null : null;
  const noDestino = !!(pos && fim && distanciaM(pos, fim) <= RAIO_PONTA_M);
  const noEmbarque = !!(pos && inicio && distanciaM(pos, inicio) <= RAIO_PONTA_M);
  const restanteM = percorridoM !== null ? Math.max(0, totalM - percorridoM) : null;

  // Chegada prevista: partida (registro de etapa ou horário) + distância / velocidade + paradas.
  let chegadaPrevista: string | null = null, atrasoMin: number | null = null;
  if (temRota) {
    const vel = Math.max(3, v.rota?.velocidade_kmh ?? 20);
    const partida = [...v.eventos].reverse().find((e) => e.tipo === 'partida')?.em
      ?? (v.horario ? new Date(`${v.inicio}T${v.horario.slice(0, 5)}:00-04:00`).toISOString() : null);
    if (partida) {
      const paradas = (v.rota?.paradas ?? []).reduce((t, p) => t + (p.minutos ?? 0), 0);
      const previsto = Date.parse(partida) + ((totalM / 1000 / vel) * 60 + paradas) * 60000;
      chegadaPrevista = new Date(previsto).toISOString();
      const chegou = v.eventos.some((e) => e.tipo === 'chegada' || e.tipo === 'retorno');
      if (!chegou && !noDestino && v.dias <= 1) {
        const m = Math.round((Date.now() - previsto) / 60000);
        atrasoMin = m > 0 ? m : null;
      }
    }
  }
  return { temRota, totalM, percorridoM, restanteM, distanciaRotaM, foraDaRota, paradoMin, paradaPrevista, noDestino, noEmbarque, chegadaPrevista, atrasoMin };
}

// ---------------------------------------------------------------------------
// EDA_OPERACAO_AO_VIVO_V2: rumo do barco, etapas, registros agrupados e destino.
// ---------------------------------------------------------------------------

// Rumo (graus, 0 = norte) pelos últimos pontos da trilha que realmente se moveram.
export function rumoTrilha(trilha: [number, number][]): number | null {
  if (trilha.length < 2) return null;
  const b = trilha[trilha.length - 1];
  for (let i = trilha.length - 2; i >= 0; i--) {
    const a = trilha[i];
    if (distanciaM({ lat: a[0], lng: a[1] }, { lat: b[0], lng: b[1] }) < 25) continue;
    const r = Math.PI / 180;
    const y = Math.sin((b[1] - a[1]) * r) * Math.cos(b[0] * r);
    const x = Math.cos(a[0] * r) * Math.sin(b[0] * r) - Math.sin(a[0] * r) * Math.cos(b[0] * r) * Math.cos((b[1] - a[1]) * r);
    return Math.round(((Math.atan2(y, x) / r) + 360) % 360);
  }
  return null;
}

// Destino efetivo: o do passeio ou, sem ele, o fim do percurso traçado.
export function destinoViagem(v: ViagemAoVivoEDA): { lat: number; lng: number; nome: string | null } | null {
  if (v.destino) return v.destino;
  const p = v.rota?.pontos ?? [];
  return p.length >= 2 ? { lat: p[p.length - 1][0], lng: p[p.length - 1][1], nome: null } : null;
}

export type EtapaEDA = { tipo: TipoEventoEDA; rotulo: string; em: string | null; estado: 'feita' | 'atual' | 'proxima' };
const ROTULO_ETAPA: Partial<Record<TipoEventoEDA, string>> = { embarque: 'Embarque', partida: 'Partida', chegada: 'No destino', retorno: 'Retorno' };

export function etapasViagem(v: ViagemAoVivoEDA): EtapaEDA[] {
  const ordem: TipoEventoEDA[] = ['embarque', 'partida', 'chegada', 'retorno'];
  const quando = (t: TipoEventoEDA) => [...v.eventos].reverse().find((e) => e.tipo === t)?.em ?? null;
  let ultima = -1;
  ordem.forEach((t, i) => { if (quando(t)) ultima = i; });
  return ordem.map((t, i) => ({
    tipo: t, rotulo: ROTULO_ETAPA[t] ?? ROTULO_EVENTO[t], em: quando(t),
    estado: i <= ultima ? 'feita' : i === ultima + 1 ? 'atual' : 'proxima',
  }));
}

// Registros repetidos em sequência (ex.: dois toques no mesmo botão) viram um só, com contagem.
export function agruparEventos(eventos: EventoOperacaoEDA[]): (EventoOperacaoEDA & { vezes: number })[] {
  const out: (EventoOperacaoEDA & { vezes: number })[] = [];
  for (const e of eventos) {
    const ant = out[out.length - 1];
    if (ant && ant.tipo === e.tipo && (ant.texto ?? '') === (e.texto ?? '')
        && Math.abs(Date.parse(ant.em) - Date.parse(e.em)) <= 10 * 60000) { ant.vezes++; continue; }
    out.push({ ...e, vezes: 1 });
  }
  return out;
}

// Alertas extras de destino: sem destino cadastrado e "chegou" registrado longe do destino.
export function alertasDestino(v: ViagemAoVivoEDA): AlertaOperacaoEDA[] {
  const a: AlertaOperacaoEDA[] = [];
  const fim = destinoViagem(v);
  if (!fim) {
    a.push({ tom: 'at', area: 'rota', texto: 'Passeio sem destino marcado: abra o passeio e marque o destino em Logística da viagem.' });
    return a;
  }
  const ch = v.eventos.find((e) => e.tipo === 'chegada');
  if (ch && ch.lat != null && ch.lng != null) {
    const d = distanciaM({ lat: ch.lat, lng: ch.lng }, fim);
    if (d > 1500) a.push({ tom: 'at', area: 'rota', texto: `“Chegou ao destino” foi registrado a ${formatarDistancia(d)} do destino planejado. Confirme com o guia onde a embarcação está.` });
  }
  return a;
}

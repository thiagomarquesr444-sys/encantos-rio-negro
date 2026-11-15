// EDA_CALENDARIO_V1: dados do Calendário Amazônico da operadora.
// Junta, num período, o que já existe na gestão (saídas, reservas, demandas,
// hospedagens, financeiro) + bloqueios de agenda, calcula prontidão e conflitos
// e acrescenta a camada amazônica (rio, pesca, lua, feriados).
// Só lê com as RLS de cada tabela: nada de outra empresa chega aqui.
import { supabase } from '@/lib/supabase';
import type { TomEDA } from '@/app/components/PadraoPaginaEDA';

export type TipoRecursoCal = 'embarcacao' | 'guia' | 'hospedagem';
export type TipoEventoCal = 'saida' | 'reserva' | 'demanda' | 'financeiro' | 'bloqueio' | 'hospedagem' | 'pedido';
export type CamadaCal = 'operacao' | 'financeiro' | 'recursos' | 'amazonica';

export type RecursoCal = { tipo: TipoRecursoCal; id: string; nome: string; capacidade: number | null; status: string | null };
export type PendenciaCal = { chave: string; texto: string; href: string };

export type EventoCal = {
  id: string;
  tipo: TipoEventoCal;
  camada: CamadaCal;
  titulo: string;
  detalhe: string;
  inicio: string;
  fim: string;
  horario: string | null;
  tom: TomEDA;
  href: string;
  recursos: { tipo: TipoRecursoCal; id: string }[];
  pessoas?: number;
  vagas?: number | null;
  valor?: number;
  status?: string | null;
  saidaId?: string;
  passeioId?: string | null;
  bloqueio?: { recurso_tipo: TipoRecursoCal | 'empresa'; recurso_id: string | null; motivo: string; observacao: string | null };
  pendencias?: PendenciaCal[];
  vouchers?: number;
  clientes?: string[];
  lat?: number | null;
  lng?: number | null;
};

export type ConflitoCal = {
  chave: string;
  recurso: TipoRecursoCal;
  recursoId: string;
  recursoNome: string;
  dia: string;
  texto: string;
  grave: boolean;
  eventos: string[];
};

export type DadosCal = { eventos: EventoCal[]; recursos: RecursoCal[]; conflitos: ConflitoCal[]; pedidosSemData: number };

export const MOTIVOS_BLOQUEIO: { valor: string; rotulo: string }[] = [
  { valor: 'manutencao', rotulo: 'Manutenção' },
  { valor: 'folga', rotulo: 'Folga' },
  { valor: 'ferias', rotulo: 'Férias' },
  { valor: 'fechado', rotulo: 'Fechado / sem operação' },
  { valor: 'evento', rotulo: 'Evento / compromisso' },
  { valor: 'outro', rotulo: 'Outro' },
];
export const rotuloMotivo = (m: string) => MOTIVOS_BLOQUEIO.find((x) => x.valor === m)?.rotulo ?? 'Bloqueio';

const NENHUM = '00000000-0000-0000-0000-000000000000';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Datas (sempre ISO yyyy-mm-dd, sem fuso: o dia da operação é o de Manaus)
// ---------------------------------------------------------------------------
export function hojeCal() { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Manaus' }); }
export function somarDiasCal(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
export function diasEntreCal(de: string, ate: string) {
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000);
}
export function diaSemanaCal(iso: string) { return new Date(`${iso}T12:00:00Z`).getUTCDay(); }
export function inicioSemanaCal(iso: string) { return somarDiasCal(iso, -diaSemanaCal(iso)); }
export function inicioMesCal(iso: string) { return `${iso.slice(0, 7)}-01`; }
export function somarMesesCal(iso: string, n: number) {
  const d = new Date(`${iso.slice(0, 7)}-01T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10);
}
export function dentroCal(e: { inicio: string; fim: string }, dia: string) { return e.inicio <= dia && dia <= e.fim; }
export const dmCal = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
export const MESES_CAL = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const SEMANA_CAL = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export function dataLongaCal(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}
export const moedaCal = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ---------------------------------------------------------------------------
// Carregamento
// ---------------------------------------------------------------------------
type Saida = { id: string; passeio_id: string; data_inicio: string; data_fim: string | null; horario: string | null; vagas_total: number; status: string };
type Periodo = { id: string; cliente: string | null; status: string | null; saida_id: string | null; embarcacao_id: string | null; guia_id: string | null; pessoas: number; passeio: string | null; inicio: string; fim: string; horario: string | null; horario_fim_previsto: string | null };
type Demanda = { id: string; titulo: string; categoria: string | null; status: string | null; data_inicio: string | null; data_fim: string | null; horario: string | null; saida_id: string | null; pessoas_estimadas: number | null };
type Fin = { id: string; descricao: string; tipo: string | null; valor: number | null; data_vencimento: string; status: string | null; reserva_id: string | null };
type Bloq = { id: string; recurso_tipo: TipoRecursoCal | 'empresa'; recurso_id: string | null; inicio: string; fim: string; motivo: string; observacao: string | null };
type Hosp = { id: string; reserva_id: string; acomodacao_id: string; checkin: string; checkout: string; hospedes: number };

const cancelada = (s: string | null | undefined) => /cancel/i.test(s ?? '');
const pago = (s: string | null | undefined) => /receb|pago|quitad|liquid/i.test(s ?? '');

export async function carregarCalendarioEDA(de: string, ate: string, opcoes: { financeiro: boolean; hoje: string }): Promise<DadosCal> {
  const { hoje } = opcoes;
  const [sd, rs, dm, bq, eb, gs, hs] = await Promise.all([
    supabase.from('passeio_saidas').select('id,passeio_id,data_inicio,data_fim,horario,vagas_total,status')
      .lte('data_inicio', ate).gte('data_inicio', somarDiasCal(de, -60)).order('data_inicio').limit(800),
    supabase.from('eda_reservas_periodo').select('id,cliente,status,saida_id,embarcacao_id,guia_id,pessoas,passeio,inicio,fim,horario,horario_fim_previsto')
      .lte('inicio', ate).gte('fim', de).limit(1500),
    supabase.from('demandas').select('id,titulo,categoria,status,data_inicio,data_fim,horario,saida_id,pessoas_estimadas')
      .lte('data_inicio', ate).gte('data_inicio', somarDiasCal(de, -60)).limit(800),
    supabase.from('calendario_bloqueios').select('id,recurso_tipo,recurso_id,inicio,fim,motivo,observacao')
      .lte('inicio', ate).gte('fim', de).limit(500),
    supabase.from('embarcacoes').select('id,nome,capacidade,status').order('nome').limit(200),
    supabase.from('guias').select('id,nome,status').order('nome').limit(300),
    supabase.from('hospedagens').select('id,nome,status').order('nome').limit(200),
  ]);
  if (sd.error && rs.error) throw new Error('Não foi possível carregar o calendário. Confira a conexão e tente de novo.');

  const saidas = ((sd.data ?? []) as Saida[]).filter((s) => (s.data_fim ?? s.data_inicio) >= de && s.status !== 'cancelada');
  const periodos = (rs.data ?? []) as Periodo[];
  const demandas = ((dm.data ?? []) as Demanda[]).filter((d) => !cancelada(d.status) && d.data_inicio && (d.data_fim ?? d.data_inicio) >= de);
  const bloqueios = (bq.error ? [] : (bq.data ?? [])) as Bloq[];

  const recursos: RecursoCal[] = [
    ...((eb.data ?? []) as { id: string; nome: string; capacidade: number | null; status: string | null }[]).map((b) => ({ tipo: 'embarcacao' as const, id: b.id, nome: b.nome, capacidade: b.capacidade, status: b.status })),
    ...((gs.data ?? []) as { id: string; nome: string; status: string | null }[]).map((g) => ({ tipo: 'guia' as const, id: g.id, nome: g.nome, capacidade: null, status: g.status })),
    ...((hs.data ?? []) as { id: string; nome: string; status: string | null }[]).map((h) => ({ tipo: 'hospedagem' as const, id: h.id, nome: h.nome, capacidade: null, status: h.status })),
  ];
  const nomeRecurso = new Map(recursos.map((r) => [`${r.tipo}:${r.id}`, r.nome]));

  const passeioIds = Array.from(new Set(saidas.map((s) => s.passeio_id)));
  const reservaIds = periodos.map((p) => p.id);
  const [ps, vc, fn, rh, pv] = await Promise.all([
    supabase.from('passeios').select('id,nome,latitude,longitude').in('id', passeioIds.length ? passeioIds : [NENHUM]),
    supabase.from('vouchers').select('reserva_id,status').in('reserva_id', reservaIds.length ? reservaIds.slice(0, 500) : [NENHUM]),
    opcoes.financeiro
      ? supabase.from('financeiro').select('id,descricao,tipo,valor,data_vencimento,status,reserva_id').gte('data_vencimento', de).lte('data_vencimento', ate).limit(800)
      : Promise.resolve({ data: [] as Fin[], error: null }),
    supabase.from('reserva_hospedagens').select('id,reserva_id,acomodacao_id,checkin,checkout,hospedes').lte('checkin', ate).gt('checkout', de).limit(500),
    supabase.from('pedidos_visitante').select('id,passeio_nome,adultos,criancas,periodo,status').in('status', ['novo', 'em_contato']).order('created_at', { ascending: false }).limit(60),
  ]);
  const passeios = new Map(((ps.data ?? []) as { id: string; nome: string; latitude: number | null; longitude: number | null }[]).map((p) => [p.id, p]));
  const vouchersAtivos = new Set(((vc.data ?? []) as { reserva_id: string; status: string | null }[]).filter((v) => /ativo|utiliz|valido/i.test(v.status ?? '')).map((v) => v.reserva_id));
  const financeiro = (fn.error ? [] : (fn.data ?? [])) as Fin[];
  const recebidas = new Set(financeiro.filter((f) => /receita/i.test(f.tipo ?? '') && pago(f.status) && f.reserva_id).map((f) => f.reserva_id as string));

  // Hospedagem: acomodação → hospedagem.
  const hosp = (rh.error ? [] : (rh.data ?? [])) as Hosp[];
  const acomIds = Array.from(new Set(hosp.map((h) => h.acomodacao_id)));
  const acom = new Map<string, { hospedagem_id: string; nome: string }>();
  if (acomIds.length) {
    const { data } = await supabase.from('hospedagem_acomodacoes').select('id,hospedagem_id,nome').in('id', acomIds);
    for (const a of (data ?? []) as { id: string; hospedagem_id: string; nome: string }[]) acom.set(a.id, a);
  }

  const eventos: EventoCal[] = [];

  // 1. Saídas (agrupam as reservas que viajam juntas) + prontidão
  for (const s of saidas) {
    const rsv = periodos.filter((p) => p.saida_id === s.id);
    const dms = demandas.filter((d) => d.saida_id === s.id);
    const pessoas = rsv.reduce((t, r) => t + (r.pessoas || 1), 0);
    const p = passeios.get(s.passeio_id);
    const fim = s.data_fim ?? s.data_inicio;
    const pend: PendenciaCal[] = [];
    if (rsv.length) {
      const editar = (r?: Periodo) => (r ? `/reservas/editar/${r.id}` : '/reservas');
      const aConfirmar = rsv.filter((r) => /pend/i.test(r.status ?? ''));
      if (aConfirmar.length) pend.push({ chave: 'confirmar', texto: `${aConfirmar.length} reserva(s) a confirmar`, href: editar(aConfirmar[0]) });
      const semGuia = rsv.filter((r) => !r.guia_id);
      if (semGuia.length) pend.push({ chave: 'guia', texto: `${semGuia.length} reserva(s) sem guia`, href: editar(semGuia[0]) });
      const semBarco = rsv.filter((r) => !r.embarcacao_id);
      if (semBarco.length) pend.push({ chave: 'barco', texto: `${semBarco.length} reserva(s) sem embarcação`, href: editar(semBarco[0]) });
      if (!dms.length) pend.push({ chave: 'demanda', texto: 'Sem demanda de suprimentos', href: '/demandas/nova' });
      else if (dms.every((d) => /rascunho/i.test(d.status ?? ''))) pend.push({ chave: 'demanda', texto: 'Demanda ainda em rascunho', href: `/demandas/editar/${dms[0].id}` });
      if (opcoes.financeiro) {
        const semPg = rsv.filter((r) => !recebidas.has(r.id));
        if (semPg.length) pend.push({ chave: 'pagamento', texto: `${semPg.length} reserva(s) sem pagamento registrado`, href: editar(semPg[0]) });
        const semV = rsv.filter((r) => !/pend/i.test(r.status ?? '') && !vouchersAtivos.has(r.id));
        if (semV.length) pend.push({ chave: 'voucher', texto: `${semV.length} voucher(s) a emitir`, href: editar(semV[0]) });
      }
    }
    const dias = diasEntreCal(hoje, s.data_inicio);
    const passada = fim < hoje;
    const tom: TomEDA = passada ? 'nt' : !rsv.length ? 'info' : !pend.length ? 'ok' : dias <= 1 ? 'er' : dias <= 3 ? 'at' : 'info';
    const recursosSaida = new Map<string, { tipo: TipoRecursoCal; id: string }>();
    for (const r of rsv) {
      if (r.embarcacao_id) recursosSaida.set(`e${r.embarcacao_id}`, { tipo: 'embarcacao', id: r.embarcacao_id });
      if (r.guia_id) recursosSaida.set(`g${r.guia_id}`, { tipo: 'guia', id: r.guia_id });
    }
    eventos.push({
      id: `saida:${s.id}`, tipo: 'saida', camada: 'operacao', saidaId: s.id, passeioId: s.passeio_id,
      titulo: p?.nome ?? 'Saída', inicio: s.data_inicio, fim, horario: s.horario,
      detalhe: rsv.length ? `${pessoas} de ${s.vagas_total} vagas` : `${s.vagas_total} vagas abertas`,
      tom, href: `/passeios?saida=${s.id}`, recursos: Array.from(recursosSaida.values()),
      pessoas, vagas: s.vagas_total, status: s.status, pendencias: passada ? [] : pend,
      vouchers: rsv.filter((r) => vouchersAtivos.has(r.id)).length,
      clientes: rsv.map((r) => r.cliente ?? 'Cliente').slice(0, 12),
      lat: p?.latitude ?? null, lng: p?.longitude ?? null,
    });
  }

  // 2. Reservas sem saída (avulsas)
  for (const r of periodos.filter((x) => !x.saida_id)) {
    const recs: { tipo: TipoRecursoCal; id: string }[] = [];
    if (r.embarcacao_id) recs.push({ tipo: 'embarcacao', id: r.embarcacao_id });
    if (r.guia_id) recs.push({ tipo: 'guia', id: r.guia_id });
    const pend = /pend/i.test(r.status ?? '');
    eventos.push({
      id: `reserva:${r.id}`, tipo: 'reserva', camada: 'operacao', titulo: r.passeio ?? 'Reserva',
      detalhe: `${r.cliente ?? 'Cliente'} · ${r.pessoas} pessoa(s)`, inicio: r.inicio, fim: r.fim, horario: r.horario,
      tom: r.fim < hoje ? 'nt' : pend ? 'at' : 'ok', href: `/reservas/editar/${r.id}`, recursos: recs,
      pessoas: r.pessoas, status: r.status, clientes: [r.cliente ?? 'Cliente'],
    });
  }

  // 3. Demandas sem saída (as da saída aparecem na prontidão dela)
  for (const d of demandas.filter((x) => !x.saida_id)) {
    eventos.push({
      id: `demanda:${d.id}`, tipo: 'demanda', camada: 'operacao', titulo: d.titulo,
      detalhe: `Demanda · ${d.status ?? 'rascunho'}`, inicio: d.data_inicio as string, fim: d.data_fim ?? (d.data_inicio as string),
      horario: d.horario, tom: /rascunho/i.test(d.status ?? '') ? 'at' : 'info', href: `/demandas/editar/${d.id}`, recursos: [], status: d.status,
    });
  }

  // 4. Hospedagem (noites: check-in até a véspera do check-out)
  for (const h of hosp) {
    const a = acom.get(h.acomodacao_id);
    if (!a) continue;
    eventos.push({
      id: `hospedagem:${h.id}`, tipo: 'hospedagem', camada: 'recursos', titulo: nomeRecurso.get(`hospedagem:${a.hospedagem_id}`) ?? 'Hospedagem',
      detalhe: `${a.nome} · ${h.hospedes} hóspede(s)`, inicio: h.checkin, fim: somarDiasCal(h.checkout, -1), horario: null,
      tom: 'info', href: `/reservas/editar/${h.reserva_id}`, recursos: [{ tipo: 'hospedagem', id: a.hospedagem_id }],
    });
  }

  // 5. Financeiro: vencimentos ainda abertos
  for (const f of financeiro.filter((x) => !pago(x.status) && !cancelada(x.status))) {
    const receita = /receita/i.test(f.tipo ?? '');
    const atrasado = f.data_vencimento < hoje;
    eventos.push({
      id: `fin:${f.id}`, tipo: 'financeiro', camada: 'financeiro', titulo: receita ? 'A receber' : 'A pagar',
      detalhe: f.descricao, inicio: f.data_vencimento, fim: f.data_vencimento, horario: null,
      tom: atrasado ? 'er' : receita ? 'ok' : 'at', href: '/financeiro?periodo=pendentes', recursos: [],
      valor: Number(f.valor ?? 0), status: f.status,
    });
  }

  // 6. Bloqueios
  for (const b of bloqueios) {
    const nome = b.recurso_tipo === 'empresa' ? 'Empresa' : nomeRecurso.get(`${b.recurso_tipo}:${b.recurso_id}`) ?? 'Recurso';
    eventos.push({
      id: `bloqueio:${b.id}`, tipo: 'bloqueio', camada: 'recursos', titulo: `${rotuloMotivo(b.motivo)} · ${nome}`,
      detalhe: b.observacao ?? 'Agenda bloqueada', inicio: b.inicio, fim: b.fim, horario: null, tom: 'nt', href: '',
      recursos: b.recurso_tipo === 'empresa' || !b.recurso_id ? [] : [{ tipo: b.recurso_tipo, id: b.recurso_id }],
      bloqueio: { recurso_tipo: b.recurso_tipo, recurso_id: b.recurso_id, motivo: b.motivo, observacao: b.observacao },
    });
  }

  // 7. Pedidos abertos da Iara: aparecem "fantasma" na data pedida, até o operador aceitar.
  let pedidosSemData = 0;
  for (const p of (pv.error ? [] : (pv.data ?? [])) as { id: string; passeio_nome: string | null; adultos: number; criancas: number; periodo: string | null }[]) {
    const dia = dataDoPeriodoCal(p.periodo, hoje);
    if (!dia) { pedidosSemData += 1; continue; }
    if (dia < de || dia > ate) continue;
    eventos.push({
      id: `pedido:${p.id}`, tipo: 'pedido', camada: 'operacao', titulo: p.passeio_nome ? `Pedido · ${p.passeio_nome}` : 'Pedido do portal',
      detalhe: `${Number(p.adultos ?? 1) + Number(p.criancas ?? 0)} pessoa(s) · aguardando seu aval`, inicio: dia, fim: dia, horario: null,
      tom: 'info', href: `/reservas/nova?pedido=${p.id}`, recursos: [],
    });
  }

  eventos.sort((a, b) => a.inicio.localeCompare(b.inicio) || (a.horario ?? '99').localeCompare(b.horario ?? '99'));
  return { eventos, recursos, conflitos: detectarConflitosCal(eventos, recursos, de, ate), pedidosSemData };
}

// "12/12", "12/12/2026", "2026-12-12" ou "12 de dezembro" → data ISO (a próxima, se sem ano).
export function dataDoPeriodoCal(periodo: string | null, hoje: string): string | null {
  const t = (periodo ?? '').toLowerCase();
  let m = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  let dia = 0, mes = 0, ano = 0;
  m = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (m) { dia = Number(m[1]); mes = Number(m[2]); ano = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : 0; }
  else {
    m = t.match(/\b(\d{1,2})\s+de\s+([a-zç]+)(?:\s+de\s+(\d{4}))?/);
    if (!m) return null;
    dia = Number(m[1]); mes = MESES_CAL.findIndex((x) => x === m![2] || x.replace('ç', 'c') === m![2]) + 1; ano = m[3] ? Number(m[3]) : 0;
  }
  if (!dia || dia > 31 || mes < 1 || mes > 12) return null;
  const montar = (a: number) => `${a}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  if (ano) return montar(ano);
  const a = Number(hoje.slice(0, 4));
  return montar(montar(a) >= hoje ? a : a + 1);
}

// ---------------------------------------------------------------------------
// Conflitos: dupla alocação, bloqueio, manutenção, lotação e folga de navegação
// ---------------------------------------------------------------------------
export function detectarConflitosCal(eventos: EventoCal[], recursos: RecursoCal[], de: string, ate: string): ConflitoCal[] {
  const lista: ConflitoCal[] = [];
  const vistos = new Set<string>();
  const add = (c: ConflitoCal) => { if (!vistos.has(c.chave)) { vistos.add(c.chave); lista.push(c); } };
  const ativos = eventos.filter((e) => e.tipo === 'saida' || e.tipo === 'reserva');

  for (const r of recursos.filter((x) => x.tipo !== 'hospedagem')) {
    const uso = ativos.filter((e) => e.recursos.some((x) => x.tipo === r.tipo && x.id === r.id) && e.fim >= de && e.inicio <= ate);
    const bloq = eventos.filter((e) => e.tipo === 'bloqueio' && (e.recursos.some((x) => x.tipo === r.tipo && x.id === r.id) || e.bloqueio?.recurso_tipo === 'empresa'));
    const rotulo = r.tipo === 'embarcacao' ? 'Embarcação' : 'Guia';

    // Duas saídas/reservas diferentes no mesmo período
    for (let i = 0; i < uso.length; i++) {
      for (let j = i + 1; j < uso.length; j++) {
        const a = uso[i]; const b = uso[j];
        if (a.inicio <= b.fim && b.inicio <= a.fim) {
          const mesmoDiaSemCruzar = a.inicio === a.fim && b.inicio === b.fim && a.horario && b.horario && a.horario !== b.horario && a.inicio === b.inicio;
          if (mesmoDiaSemCruzar) {
            add({ chave: `apertado:${r.id}:${a.id}:${b.id}`, recurso: r.tipo, recursoId: r.id, recursoNome: r.nome, dia: a.inicio, grave: false, eventos: [a.id, b.id],
              texto: `${rotulo} ${r.nome} tem duas saídas no mesmo dia (${a.horario?.slice(0, 5)} e ${b.horario?.slice(0, 5)}). Confira o horário de retorno.` });
          } else {
            add({ chave: `duplo:${r.id}:${a.id}:${b.id}`, recurso: r.tipo, recursoId: r.id, recursoNome: r.nome, dia: a.inicio > b.inicio ? a.inicio : b.inicio, grave: true, eventos: [a.id, b.id],
              texto: `${rotulo} ${r.nome} está em "${a.titulo}" e "${b.titulo}" ao mesmo tempo.` });
          }
        } else {
          // Folga de navegação: expedição de vários dias termina e a próxima sai logo no dia seguinte (ou no mesmo dia do retorno).
          const [ant, prox] = a.fim < b.inicio ? [a, b] : [b, a];
          const intervalo = diasEntreCal(ant.fim, prox.inicio);
          if (r.tipo === 'embarcacao' && ant.fim !== ant.inicio && intervalo <= 1) {
            add({ chave: `folga:${r.id}:${ant.id}:${prox.id}`, recurso: r.tipo, recursoId: r.id, recursoNome: r.nome, dia: prox.inicio, grave: false, eventos: [ant.id, prox.id],
              texto: `${r.nome} volta de "${ant.titulo}" em ${dmCal(ant.fim)} e já sai para "${prox.titulo}" em ${dmCal(prox.inicio)}. Confira tempo de navegação, abastecimento e descanso da tripulação.` });
          }
        }
      }
      // Escalado num dia bloqueado
      for (const b of bloq) {
        const a = uso[i];
        if (a.inicio <= b.fim && b.inicio <= a.fim) {
          add({ chave: `bloq:${r.id}:${a.id}:${b.id}`, recurso: r.tipo, recursoId: r.id, recursoNome: r.nome, dia: a.inicio > b.inicio ? a.inicio : b.inicio, grave: true, eventos: [a.id, b.id],
            texto: `${rotulo} ${r.nome} está escalado em "${a.titulo}", mas a agenda está bloqueada (${b.titulo.split(' · ')[0].toLowerCase()}).` });
        }
      }
      // Barco fora de operação
      if (r.tipo === 'embarcacao' && /manuten|inativ/i.test(r.status ?? '') && uso[i].fim >= hojeCal()) {
        add({ chave: `status:${r.id}:${uso[i].id}`, recurso: r.tipo, recursoId: r.id, recursoNome: r.nome, dia: uso[i].inicio, grave: true, eventos: [uso[i].id],
          texto: `${r.nome} está com status "${String(r.status).toLowerCase()}" e tem saída marcada em ${dmCal(uso[i].inicio)}.` });
      }
      // Lotação (só soma pessoas da mesma saída; saídas diferentes já são conflito acima)
      const e = uso[i];
      if (r.tipo === 'embarcacao' && r.capacidade && e.tipo === 'saida' && (e.pessoas ?? 0) > r.capacidade) {
        add({ chave: `lot:${r.id}:${e.id}`, recurso: r.tipo, recursoId: r.id, recursoNome: r.nome, dia: e.inicio, grave: true, eventos: [e.id],
          texto: `${r.nome} levaria ${e.pessoas} pessoas em "${e.titulo}", acima da capacidade (${r.capacidade}).` });
      }
    }
  }
  return lista.sort((a, b) => Number(b.grave) - Number(a.grave) || a.dia.localeCompare(b.dia));
}

// ---------------------------------------------------------------------------
// Ações (sempre com confirmação na tela; RLS e gatilhos do banco validam)
// ---------------------------------------------------------------------------
export async function remarcarSaidaEDA(saidaId: string, novoInicio: string, duracaoDias: number) {
  if (!UUID.test(saidaId) || !/^\d{4}-\d{2}-\d{2}$/.test(novoInicio)) throw new Error('Dados inválidos.');
  const novoFim = duracaoDias > 0 ? somarDiasCal(novoInicio, duracaoDias) : null;
  const { error } = await supabase.from('passeio_saidas').update({ data_inicio: novoInicio, data_fim: novoFim }).eq('id', saidaId);
  if (error) throw new Error('Não foi possível remarcar a saída. Confira se você tem acesso a passeios.');
}

export async function salvarBloqueioEDA(b: { id?: string; recurso_tipo: TipoRecursoCal | 'empresa'; recurso_id: string | null; inicio: string; fim: string; motivo: string; observacao: string }) {
  if (b.fim < b.inicio) throw new Error('A data final não pode ser antes da inicial.');
  if (diasEntreCal(b.inicio, b.fim) > 366) throw new Error('O bloqueio pode ter no máximo 1 ano.');
  if (b.recurso_tipo !== 'empresa' && (!b.recurso_id || !UUID.test(b.recurso_id))) throw new Error('Escolha o recurso.');
  const linha = {
    recurso_tipo: b.recurso_tipo, recurso_id: b.recurso_tipo === 'empresa' ? null : b.recurso_id,
    inicio: b.inicio, fim: b.fim, motivo: MOTIVOS_BLOQUEIO.some((m) => m.valor === b.motivo) ? b.motivo : 'outro',
    observacao: b.observacao.trim().slice(0, 300) || null,
  };
  const r = b.id
    ? await supabase.from('calendario_bloqueios').update(linha).eq('id', b.id)
    : await supabase.from('calendario_bloqueios').insert(linha);
  if (r.error) throw new Error('Não foi possível salvar o bloqueio. Confira se você tem acesso a reservas.');
}

export async function excluirBloqueioEDA(id: string) {
  if (!UUID.test(id)) throw new Error('Bloqueio inválido.');
  const { error } = await supabase.from('calendario_bloqueios').delete().eq('id', id);
  if (error) throw new Error('Não foi possível remover o bloqueio.');
}

// ---------------------------------------------------------------------------
// Camada amazônica (referências; não substitui a conferência local)
// ---------------------------------------------------------------------------
export type MarcaAmazonica = { tipo: 'lua' | 'feriado' | 'clima'; texto: string; curto: string; tom?: TomEDA };

// Ciclo médio do Rio Negro (referência do médio/baixo Rio Negro; varia a cada ano).
const RIO: { meses: number[]; nome: string; texto: string }[] = [
  { meses: [11, 0, 1, 2, 3, 4], nome: 'Enchente', texto: 'Rio subindo: praias e bancos de areia vão sumindo; igarapés e igapós abrem caminho.' },
  { meses: [5, 6], nome: 'Cheia', texto: 'Rio no alto: floresta alagada (igapó) navegável; praias encobertas.' },
  { meses: [7, 8], nome: 'Vazante', texto: 'Rio descendo: praias voltam a aparecer; atenção a pedras e bancos novos.' },
  { meses: [9, 10], nome: 'Seca', texto: 'Rio baixo: praias de areia branca; canais rasos e trajetos mais longos para barcos maiores.' },
];
export function faseRioCal(mes: number) { return RIO.find((r) => r.meses.includes(mes)) ?? RIO[0]; }
export function temporadaPescaCal(mes: number) {
  return [8, 9, 10, 11, 0, 1, 2].includes(mes)
    ? { ativa: true, texto: 'Temporada de pesca esportiva (águas baixas) — referência do médio Rio Negro.' }
    : { ativa: false, texto: 'Fora da temporada principal de pesca esportiva (rio alto). Confira regras de defeso e licenças.' };
}

// Fase da lua (aproximação astronômica; precisão de ~1 dia, suficiente para planejar pesca e navegação noturna).
const LUA_NOVA_REF = Date.UTC(2000, 0, 6, 18, 14);
const SINODICO = 29.530588853;
export function luaCal(iso: string): { nome: string; curto: string } | null {
  const idade = (d: string) => {
    const dias = (Date.parse(`${d}T12:00:00Z`) - LUA_NOVA_REF) / 86_400_000;
    return ((dias % SINODICO) + SINODICO) % SINODICO;
  };
  const alvos = [[0, 'Lua nova', '●'], [SINODICO / 4, 'Quarto crescente', '◐'], [SINODICO / 2, 'Lua cheia', '○'], [(3 * SINODICO) / 4, 'Quarto minguante', '◑']] as const;
  const hoje = idade(iso); const ontem = idade(somarDiasCal(iso, -1));
  for (const [alvo, nome, curto] of alvos) {
    // o dia em que a idade cruza o alvo
    const cruzou = alvo === 0 ? ontem > hoje : ontem < alvo && hoje >= alvo;
    if (cruzou) return { nome, curto };
  }
  return null;
}

// Feriados nacionais + data magna do Amazonas (5/9). Municipais ficam com a operadora.
function pascoa(ano: number) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}
const cacheFeriados = new Map<number, Map<string, string>>();
export function feriadosCal(ano: number) {
  const pronto = cacheFeriados.get(ano);
  if (pronto) return pronto;
  const p = pascoa(ano);
  const m = new Map<string, string>([
    [`${ano}-01-01`, 'Confraternização Universal'], [somarDiasCal(p, -48), 'Carnaval'], [somarDiasCal(p, -47), 'Carnaval'],
    [somarDiasCal(p, -2), 'Sexta-feira Santa'], [`${ano}-04-21`, 'Tiradentes'], [`${ano}-05-01`, 'Dia do Trabalho'],
    [somarDiasCal(p, 60), 'Corpus Christi'], [`${ano}-09-05`, 'Elevação do Amazonas a província'], [`${ano}-09-07`, 'Independência'],
    [`${ano}-10-12`, 'Nossa Senhora Aparecida'], [`${ano}-11-02`, 'Finados'], [`${ano}-11-15`, 'Proclamação da República'],
    [`${ano}-11-20`, 'Consciência Negra'], [`${ano}-12-25`, 'Natal'],
  ]);
  cacheFeriados.set(ano, m);
  return m;
}

// Clima dos próximos dias (Open-Meteo, grátis e sem chave), guardado por 1h no aparelho.
export type ClimaDiaCal = { dia: string; chuva: number; codigo: number; rajada: number; max: number | null };
export async function climaCal(lat: number, lng: number): Promise<ClimaDiaCal[]> {
  const chave = `eda.cal.clima.${lat.toFixed(2)}.${lng.toFixed(2)}`;
  try {
    const c = JSON.parse(sessionStorage.getItem(chave) || 'null') as { t: number; d: ClimaDiaCal[] } | null;
    if (c && Date.now() - c.t < 3_600_000 && Array.isArray(c.d)) return c.d;
  } catch { /* sem cache */ }
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}&daily=precipitation_sum,weather_code,wind_gusts_10m_max,temperature_2m_max&forecast_days=10&timezone=America%2FManaus`;
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return [];
    const j = await r.json() as { daily?: { time: string[]; precipitation_sum: number[]; weather_code: number[]; wind_gusts_10m_max: number[]; temperature_2m_max: number[] } };
    const d = j.daily;
    if (!d || !Array.isArray(d.time)) return [];
    const lista = d.time.map((dia, i) => ({ dia, chuva: Number(d.precipitation_sum?.[i] ?? 0), codigo: Number(d.weather_code?.[i] ?? 0), rajada: Number(d.wind_gusts_10m_max?.[i] ?? 0), max: d.temperature_2m_max?.[i] ?? null }));
    try { sessionStorage.setItem(chave, JSON.stringify({ t: Date.now(), d: lista })); } catch { /* cheio */ }
    return lista;
  } catch { return []; }
}
export function avaliarClimaCal(c: ClimaDiaCal): { tom: TomEDA; texto: string; curto: string } {
  if (c.codigo >= 95) return { tom: 'er', texto: `Trovoadas previstas (${Math.round(c.chuva)} mm)`, curto: 'Trovoada' };
  if (c.chuva >= 40 || c.rajada >= 60) return { tom: 'er', texto: `Chuva muito forte ou vento forte (${Math.round(c.chuva)} mm, rajadas ${Math.round(c.rajada)} km/h)`, curto: 'Tempo severo' };
  if (c.chuva >= 20 || c.rajada >= 45) return { tom: 'at', texto: `Chuva forte (${Math.round(c.chuva)} mm, rajadas ${Math.round(c.rajada)} km/h)`, curto: 'Chuva forte' };
  if (c.chuva >= 5) return { tom: 'info', texto: `Pancadas de chuva (${Math.round(c.chuva)} mm)`, curto: 'Chuva' };
  return { tom: 'ok', texto: `Tempo firme${c.max != null ? `, máx. ${Math.round(c.max)}°C` : ''}`, curto: 'Firme' };
}

// Texto do aviso de remarcação para o operador revisar e enviar (nunca sai sozinho).
export function avisoRemarcacaoCal(passeio: string, de: string, para: string, horario: string | null) {
  return `Olá! Aqui é da operadora do passeio "${passeio}". Precisamos remarcar a saída de ${dmCal(de)} para ${dataLongaCal(para)}${horario ? `, às ${horario.slice(0, 5)}` : ''}. Sua reserva continua garantida na nova data. Se a nova data não for boa para você, responda esta mensagem que a gente encontra a melhor solução. Obrigado!`;
}

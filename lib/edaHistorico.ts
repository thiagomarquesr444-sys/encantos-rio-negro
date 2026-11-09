// EDA_HISTORICO_V1: memória da operação para a EDA da gestão.
// - Resumo mês a mês (últimos 12 meses) via função eda_resumo_mensal (RLS do usuário).
// - Diário recente (tabela eda_diario, alimentada por gatilhos, sem dados pessoais).
// - Busca sob demanda: se a pergunta cita um período, traz só os registros dele.
// Sempre usa o cliente com o token do próprio usuário: a RLS continua valendo.
import type { SupabaseClient } from '@supabase/supabase-js';

type Periodo = { ini: string; fim: string; rotulo: string };

const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const dataUTC = (a: number, m: number, d: number) => new Date(Date.UTC(a, m, d));
const fimMes = (a: number, m: number) => iso(dataUTC(a, m + 1, 0));
const brl = (v: unknown) => `R$ ${Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dm = (s: unknown) => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s) ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '—');
const limpar = (s: unknown, n = 80) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

function semAcento(t: string) {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function detectarPeriodo(consulta: string, hoje: string): Periodo | null {
  const t = semAcento(consulta);
  const [a, m, d] = hoje.split('-').map(Number);
  const mesIdx = m - 1;

  if (/\bontem\b/.test(t)) { const x = iso(dataUTC(a, mesIdx, d - 1)); return { ini: x, fim: x, rotulo: 'ontem' }; }
  if (/\bsemana passada\b/.test(t)) return { ini: iso(dataUTC(a, mesIdx, d - 13)), fim: iso(dataUTC(a, mesIdx, d - 7)), rotulo: 'semana passada' };
  if (/\b(mes passado|ultimo mes)\b/.test(t)) return { ini: iso(dataUTC(a, mesIdx - 1, 1)), fim: fimMes(a, mesIdx - 1), rotulo: 'mês passado' };
  if (/\b(este|esse|neste|nesse) mes\b/.test(t)) return { ini: iso(dataUTC(a, mesIdx, 1)), fim: fimMes(a, mesIdx), rotulo: 'este mês' };
  if (/\bano passado\b/.test(t)) return { ini: `${a - 1}-01-01`, fim: `${a - 1}-12-31`, rotulo: `ano de ${a - 1}` };
  if (/\b(este|esse|neste|nesse) ano\b/.test(t)) return { ini: `${a}-01-01`, fim: hoje, rotulo: `ano de ${a}` };

  const ult = /\bultim[oa]s (\d{1,3}) (dias|semanas|meses)\b/.exec(t);
  if (ult) {
    const n = Math.min(Number(ult[1]), ult[2] === 'dias' ? 730 : ult[2] === 'semanas' ? 104 : 24);
    const ini = ult[2] === 'meses' ? dataUTC(a, mesIdx - n, d) : dataUTC(a, mesIdx, d - n * (ult[2] === 'semanas' ? 7 : 1));
    return { ini: iso(ini), fim: hoje, rotulo: `últimos ${n} ${ult[2]}` };
  }

  // dd/mm ou dd/mm/aaaa
  const data = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/.exec(t);
  if (data) {
    const dd = Number(data[1]); const mm = Number(data[2]) - 1;
    let aa = data[3] ? Number(data[3].length === 2 ? `20${data[3]}` : data[3]) : a;
    if (!data[3] && dataUTC(aa, mm, dd) > dataUTC(a, mesIdx, d + 30)) aa -= 1;
    if (dd >= 1 && dd <= 31 && mm >= 0 && mm <= 11) { const x = iso(dataUTC(aa, mm, dd)); return { ini: x, fim: x, rotulo: dm(x) }; }
  }

  // nome do mês (com ou sem ano)
  for (let i = 0; i < 12; i++) {
    // Nome completo do mês, ou abreviação só quando vem com ano ("jul/2026", "jul 2026").
    const r = new RegExp(`\\b${MESES[i]}\\b(?:\\s+(?:de\\s+)?(\\d{4}))?`).exec(t)
      ?? new RegExp(`\\b${MESES_CURTOS[i]}[/ ](\\d{4})\\b`).exec(t);
    if (!r) continue;
    const aa = r[1] ? Number(r[1]) : (i > mesIdx ? a - 1 : a);
    return { ini: iso(dataUTC(aa, i, 1)), fim: fimMes(aa, i), rotulo: `${MESES[i].replace('marco', 'março')} de ${aa}` };
  }

  const ano = /\bem (20\d{2})\b/.exec(t);
  if (ano) return { ini: `${ano[1]}-01-01`, fim: `${ano[1]}-12-31`, rotulo: `ano de ${ano[1]}` };
  return null;
}

type LinhaMes = { mes: string; reservas: number; pessoas: number; canceladas: number; valor_reservas: number; recebido: number; pago: number; a_receber: number; a_pagar: number };

export async function contextoHistorico(db: SupabaseClient, empresaId: string, hoje: string, consulta: string): Promise<string> {
  const [a, m] = hoje.split('-').map(Number);
  const iniAno = iso(dataUTC(a, m - 12, 1));
  const periodo = detectarPeriodo(consulta, hoje);

  const [resumo, diario] = await Promise.all([
    db.rpc('eda_resumo_mensal', { p_inicio: periodo && periodo.ini < iniAno ? periodo.ini : iniAno, p_fim: hoje }),
    db.from('eda_diario').select('modulo,acao,resumo,criado_em').eq('empresa_id', empresaId).order('criado_em', { ascending: false }).limit(25),
  ]);

  const partes: string[] = [];
  const meses = (Array.isArray(resumo.data) ? resumo.data : []) as LinhaMes[];
  const comMovimento = meses.filter(x => Number(x.reservas) || Number(x.canceladas) || Number(x.recebido) || Number(x.pago) || Number(x.a_receber) || Number(x.a_pagar));
  partes.push(`HISTÓRICO MÊS A MÊS (calculado pelo sistema; meses sem linha = sem movimento):\n${comMovimento.length
    ? comMovimento.map(x => `- ${x.mes.slice(5, 7)}/${x.mes.slice(0, 4)}: ${x.reservas} reservas (${x.pessoas} pessoas${Number(x.canceladas) ? `, ${x.canceladas} canceladas` : ''}, ${brl(x.valor_reservas)}); recebido ${brl(x.recebido)}, pago ${brl(x.pago)}${Number(x.a_receber) ? `, a receber ${brl(x.a_receber)}` : ''}${Number(x.a_pagar) ? `, a pagar ${brl(x.a_pagar)}` : ''}`).join('\n')
    : '(nenhum movimento registrado)'}`);

  const eventos = Array.isArray(diario.data) ? diario.data : [];
  partes.push(`DIÁRIO DA OPERAÇÃO (o que aconteceu por último na plataforma, mais recente primeiro):\n${eventos.length
    ? eventos.map(e => `- ${dm(String(e.criado_em))} ${String(e.criado_em).slice(11, 16)} UTC · ${limpar(e.modulo, 20)} · ${limpar(e.acao, 40)}: ${limpar(e.resumo, 200)}`).join('\n')
    : '(o diário começou agora; acontecimentos antigos estão no histórico mês a mês e nos cadastros)'}`);

  if (periodo) {
    const [res, fin, dem, dia] = await Promise.all([
      db.from('reservas').select('data_reserva,horario,pacote,quantidade_pessoas,valor_total,status,guia').eq('empresa_id', empresaId)
        .gte('data_reserva', periodo.ini).lte('data_reserva', periodo.fim).order('data_reserva').limit(80),
      db.from('financeiro').select('tipo,categoria,valor,status,data_vencimento,data_liquidacao').eq('empresa_id', empresaId)
        .gte('data_vencimento', periodo.ini).lte('data_vencimento', periodo.fim).order('data_vencimento').limit(150),
      db.from('demandas').select('titulo,localidade,data_inicio,data_fim,status').eq('empresa_id', empresaId)
        .lte('data_inicio', periodo.fim).or(`data_fim.gte.${periodo.ini},data_fim.is.null`).gte('data_inicio', iso(dataUTC(Number(periodo.ini.slice(0, 4)), Number(periodo.ini.slice(5, 7)) - 3, 1))).limit(40),
      db.from('eda_diario').select('modulo,acao,resumo,criado_em').eq('empresa_id', empresaId)
        .gte('criado_em', `${periodo.ini}T00:00:00-04:00`).lte('criado_em', `${periodo.fim}T23:59:59-04:00`).order('criado_em').limit(60),
    ]);
    const r = res.data ?? []; const f = fin.data ?? []; const dd = dem.data ?? []; const di = dia.data ?? [];
    partes.push(`BUSCA NO PERÍODO PEDIDO (${periodo.rotulo}: ${dm(periodo.ini)} a ${dm(periodo.fim)}):
Reservas (${r.length}${r.length === 80 ? '+, lista cortada' : ''}): ${r.length ? r.map(x => `${dm(x.data_reserva)}${x.horario ? ` ${String(x.horario).slice(0, 5)}` : ''} "${limpar(x.pacote, 50) || 'passeio'}" ${x.quantidade_pessoas ?? '?'}p ${brl(x.valor_total)} [${limpar(x.status, 15)}]${x.guia ? ` guia ${limpar(x.guia, 30)}` : ''}`).join('; ') : 'nenhuma'}
Financeiro (${f.length}${f.length === 150 ? '+, lista cortada' : ''}): ${f.length ? f.map(x => `${limpar(x.tipo, 10)} ${limpar(x.categoria, 30) || 'sem categoria'} ${brl(x.valor)} venc ${dm(x.data_vencimento)} [${limpar(x.status, 12)}${x.data_liquidacao ? ` em ${dm(x.data_liquidacao)}` : ''}]`).join('; ') : 'nenhum lançamento'}
Demandas: ${dd.length ? dd.map(x => `"${limpar(x.titulo, 60)}"${x.localidade ? ` (${limpar(x.localidade, 40)})` : ''} ${dm(x.data_inicio)}${x.data_fim ? `–${dm(x.data_fim)}` : ''} [${limpar(x.status, 12)}]`).join('; ') : 'nenhuma'}
Diário do período: ${di.length ? di.map(e => `${dm(String(e.criado_em))} ${limpar(e.modulo, 20)} ${limpar(e.acao, 40)}: ${limpar(e.resumo, 160)}`).join('; ') : 'sem registros (o diário só existe a partir de 09/11/2026)'}`);
  }

  return partes.join('\n\n');
}

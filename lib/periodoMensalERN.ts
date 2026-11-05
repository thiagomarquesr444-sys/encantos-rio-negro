// ERN_PERIODO_MENSAL_V1
// Regra comum das páginas de gestão: ao entrar, mostrar o mês atual
// (fuso America/Manaus); o histórico (todos os meses) fica a um clique.

/** 'AAAA-MM' de um mês específico, ou 'historico' para todos os registros. */
export type PeriodoMensalERN = string;
export const HISTORICO_ERN = 'historico';

const FUSO = 'America/Manaus';

function partesManaus(agora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(agora);
  const p = (t: string) => partes.find((x) => x.type === t)?.value ?? '';
  return { ano: p('year'), mes: p('month'), dia: p('day') };
}

/** Hoje em Manaus no formato AAAA-MM-DD. */
export function hojeManausERN(agora = new Date()): string {
  const { ano, mes, dia } = partesManaus(agora);
  return `${ano}-${mes}-${dia}`;
}

/** Mês atual em Manaus no formato AAAA-MM. */
export function mesAtualERN(agora = new Date()): string {
  const { ano, mes } = partesManaus(agora);
  return `${ano}-${mes}`;
}

export function mesValidoERN(valor: string | null | undefined): valor is string {
  if (!valor || !/^\d{4}-(0[1-9]|1[0-2])$/.test(valor)) return false;
  const ano = Number(valor.slice(0, 4));
  return ano >= 2000 && ano <= 2100;
}

/** Lê o período da URL (?mes=AAAA-MM ou ?mes=historico); padrão = mês atual. */
export function periodoDaURLERN(valor: string | null | undefined): PeriodoMensalERN {
  if (valor === HISTORICO_ERN) return HISTORICO_ERN;
  return mesValidoERN(valor) ? valor : mesAtualERN();
}

export function deslocarMesERN(mes: string, passos: number): string {
  const base = mesValidoERN(mes) ? mes : mesAtualERN();
  const total = Number(base.slice(0, 4)) * 12 + (Number(base.slice(5, 7)) - 1) + passos;
  const ano = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return `${ano}-${String(m).padStart(2, '0')}`;
}

/** Primeiro e último dia (AAAA-MM-DD) do mês. */
export function limitesMesERN(mes: string): { inicio: string; fim: string } {
  const ano = Number(mes.slice(0, 4));
  const m = Number(mes.slice(5, 7));
  const ultimo = new Date(Date.UTC(ano, m, 0)).getUTCDate();
  return { inicio: `${mes}-01`, fim: `${mes}-${String(ultimo).padStart(2, '0')}` };
}

const NOMES_MES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function rotuloMesERN(periodo: PeriodoMensalERN): string {
  if (!mesValidoERN(periodo)) return 'Histórico completo';
  return `${NOMES_MES[Number(periodo.slice(5, 7)) - 1]} de ${periodo.slice(0, 4)}`;
}

/**
 * Data (AAAA-MM-DD ou timestamp ISO) pertence ao período?
 * Timestamps com hora são convertidos para o dia em Manaus.
 */
export function dataNoPeriodoERN(
  data: string | null | undefined,
  periodo: PeriodoMensalERN,
): boolean {
  if (periodo === HISTORICO_ERN || !mesValidoERN(periodo)) return true;
  const dia = diaManausERN(data);
  return dia ? dia.slice(0, 7) === periodo : false;
}

/** Normaliza data/timestamp para AAAA-MM-DD no fuso de Manaus. */
export function diaManausERN(data: string | null | undefined): string {
  if (!data) return '';
  const texto = String(data).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
  if (/^\d{4}-\d{2}-\d{2}T/.test(texto) || /^\d{4}-\d{2}-\d{2} \d/.test(texto)) {
    const quando = new Date(texto.replace(' ', 'T'));
    if (!Number.isNaN(quando.getTime())) return hojeManausERN(quando);
    return texto.slice(0, 10);
  }
  return '';
}

/** Data de expiração já passou? (expira no fim do dia indicado) */
export function expiradoERN(
  dataExpiracao: string | null | undefined,
  hoje = hojeManausERN(),
): boolean {
  const dia = diaManausERN(dataExpiracao);
  return Boolean(dia) && dia < hoje;
}

/** Dias até expirar (negativo = já expirou; null = sem data). */
export function diasParaExpirarERN(
  dataExpiracao: string | null | undefined,
  hoje = hojeManausERN(),
): number | null {
  const dia = diaManausERN(dataExpiracao);
  if (!dia) return null;
  const a = Date.UTC(Number(dia.slice(0, 4)), Number(dia.slice(5, 7)) - 1, Number(dia.slice(8, 10)));
  const b = Date.UTC(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)) - 1, Number(hoje.slice(8, 10)));
  return Math.round((a - b) / 86400000);
}

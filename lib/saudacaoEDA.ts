'use client';

// EDA_SAUDACAO_V3: a saudação da EDA muda a cada visita.
// - Primeira entrada no período (manhã/tarde/noite/madrugada): cumprimento do período, com variações.
// - Recarregou ou voltou no mesmo período: no lugar do "Bom dia", uma fala curta de Tupã sobre o momento.
// A mesma frase vale para o painel e para a abertura da conversa (calculada uma vez por carregamento).

export type PeriodoEDA = 'madrugada' | 'manha' | 'tarde' | 'noite';

export function periodoEDA(): PeriodoEDA {
  const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Manaus' }).format(new Date())) % 24;
  return h < 5 ? 'madrugada' : h < 12 ? 'manha' : h < 18 ? 'tarde' : 'noite';
}

// 1ª entrada no período: o cumprimento clássico. Depois dele, a EDA puxa conversa do jeito do momento.
// EDA_TUPA_V1: as saudações têm a voz de Tupã, o trovão que guarda o céu da operação.
const PRIMEIRA: Record<PeriodoEDA, ((n: string) => string)[]> = {
  manha: [n => `Bom dia${n ? `, ${n}` : ''}. O céu abriu sobre o rio.`, n => `Bom dia${n ? `, ${n}` : ''}. O sol já subiu sobre o Rio Negro.`],
  tarde: [n => `Boa tarde${n ? `, ${n}` : ''}. O vento segue sobre o rio.`, n => `Boa tarde${n ? `, ${n}` : ''}. O céu segue de vigia.`],
  noite: [n => `Boa noite${n ? `, ${n}` : ''}. O céu escureceu sobre o rio.`, n => `Boa noite${n ? `, ${n}` : ''}. As estrelas já cobrem o rio.`],
  madrugada: [n => `Boa madrugada${n ? `, ${n}` : ''}. O rio dorme, eu velo.`],
};

const v = (n: string) => (n ? `, ${n}` : '');
const RETORNO: Record<PeriodoEDA, ((n: string) => string)[]> = {
  manha: [
    n => `Voltou${v(n)}. A manhã segue clara?`,
    n => `O dia mal nasceu e você já está aqui${v(n)}.`,
    n => `De novo sob o meu céu${v(n)}. A manhã rende?`,
  ],
  tarde: [
    n => `Voltou${v(n)}. Como corre a tarde no rio?`,
    n => `O sol ainda está alto${v(n)}. O que mais pede o dia?`,
    n => `De volta sob o meu céu${v(n)}. A tarde vai bem?`,
  ],
  noite: [
    n => `Como foi o dia${v(n)}?`,
    n => `O dia se recolhe${v(n)}. Fechamos juntos?`,
    n => `Voltou${v(n)}. A noite está calma por aqui.`,
  ],
  madrugada: [
    n => `Ainda acordado${v(n)}? Eu velo com você.`,
    n => `A madrugada é longa${v(n)}. Estou aqui.`,
  ],
};

let cache: { chave: string; fn: (n: string) => string; retorno: boolean } | null = null;

/** EDA_SAUDACAO_V4: o painel chama ao montar — cada volta ao painel é uma visita nova
 *  (antes o cache só mudava ao recarregar a página). */
export function novaVisitaSaudacaoEDA() { cache = null; }

/** Saudação desta visita. Chamar com o primeiro nome (ou ''). Mesmo resultado no painel e na conversa. */
export function saudacaoEDA(nome: string): { texto: string; retorno: boolean } {
  if (typeof window === 'undefined') return { texto: '', retorno: false };
  const p = periodoEDA();
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Manaus' }).format(new Date());
  const chave = `${dia}|${p}`;
  if (cache?.chave !== chave) {
    let retorno = false;
    let indice = Math.floor(Math.random() * 100);
    try {
      const salvo = JSON.parse(localStorage.getItem('eda.saudacao') ?? 'null') as { dia?: string; p?: string; i?: number } | null;
      retorno = salvo?.dia === dia && salvo?.p === p;
      indice = (Number(salvo?.i) || 0) + 1 + Math.floor(Math.random() * 2);
      localStorage.setItem('eda.saudacao', JSON.stringify({ dia, p, i: indice }));
    } catch { /* sem armazenamento: segue aleatório */ }
    const lista = (retorno ? RETORNO : PRIMEIRA)[p];
    cache = { chave, fn: lista[indice % lista.length], retorno };
  }
  return { texto: cache.fn(nome), retorno: cache.retorno };
}

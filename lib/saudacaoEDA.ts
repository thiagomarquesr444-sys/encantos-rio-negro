'use client';

// EDA_SAUDACAO_V3: a saudação da EDA muda a cada visita.
// - Primeira entrada no período (manhã/tarde/noite/madrugada): cumprimento do período, com variações.
// - Recarregou ou voltou no mesmo período: nada de repetir "Boa tarde" — a EDA fala como quem já viu a pessoa hoje.
// A mesma frase vale para o painel e para a abertura da conversa (calculada uma vez por carregamento).

export type PeriodoEDA = 'madrugada' | 'manha' | 'tarde' | 'noite';

export function periodoEDA(): PeriodoEDA {
  const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Manaus' }).format(new Date())) % 24;
  return h < 5 ? 'madrugada' : h < 12 ? 'manha' : h < 18 ? 'tarde' : 'noite';
}

const PRIMEIRA: Record<PeriodoEDA, ((n: string) => string)[]> = {
  manha: [
    n => `Bom dia${n ? `, ${n}` : ''}.`,
    n => `Bom dia${n ? `, ${n}` : ''}! Café tomado?`,
    n => `Bom dia por aqui${n ? `, ${n}` : ''}.`,
    n => `Manhã bonita no Rio Negro${n ? `, ${n}` : ''}. Bom dia!`,
    n => `Bom dia${n ? `, ${n}` : ''}. Bora começar?`,
  ],
  tarde: [
    n => `Boa tarde${n ? `, ${n}` : ''}.`,
    n => `Boa tarde${n ? `, ${n}` : ''}! Como vai o dia?`,
    n => `Boa tarde por aqui${n ? `, ${n}` : ''}.`,
    n => `Tarde chegando no Rio Negro${n ? `, ${n}` : ''}. Boa tarde!`,
    n => `Opa, boa tarde${n ? `, ${n}` : ''}!`,
  ],
  noite: [
    n => `Boa noite${n ? `, ${n}` : ''}.`,
    n => `Boa noite${n ? `, ${n}` : ''}! Fechando o dia?`,
    n => `Noite chegou no Rio Negro${n ? `, ${n}` : ''}. Boa noite!`,
    n => `Boa noite por aqui${n ? `, ${n}` : ''}.`,
  ],
  madrugada: [
    n => `Boa noite${n ? `, ${n}` : ''}. Madrugada de trabalho?`,
    n => `Ainda acordado${n ? `, ${n}` : ''}? Boa noite!`,
    n => `O rio está quieto${n ? `, ${n}` : ''}. Boa noite.`,
  ],
};

const RETORNO: Record<PeriodoEDA, ((n: string) => string)[]> = {
  manha: [
    n => `De volta${n ? `, ${n}` : ''}.`,
    n => `Olha tu aí de novo${n ? `, ${n}` : ''}!`,
    n => `Tô por aqui${n ? `, ${n}` : ''}.`,
    n => `Voltou${n ? `, ${n}` : ''}? Pode falar.`,
  ],
  tarde: [
    n => `De volta${n ? `, ${n}` : ''}.`,
    n => `Olha tu aí de novo${n ? `, ${n}` : ''}!`,
    n => `Seguimos${n ? `, ${n}` : ''}.`,
    n => `Tô de olho em tudo${n ? `, ${n}` : ''}.`,
  ],
  noite: [
    n => `De volta${n ? `, ${n}` : ''}.`,
    n => `Ainda por aqui${n ? `, ${n}` : ''}?`,
    n => `Seguimos firmes${n ? `, ${n}` : ''}.`,
  ],
  madrugada: [
    n => `Ainda acordado${n ? `, ${n}` : ''}?`,
    n => `Tô de vigia contigo${n ? `, ${n}` : ''}.`,
  ],
};

let cache: { chave: string; fn: (n: string) => string; retorno: boolean } | null = null;

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

'use client';

// EDA_SAUDACAO_V3: a saudação da EDA muda a cada visita.
// - Primeira entrada no período (manhã/tarde/noite/madrugada): cumprimento do período, com variações.
// - Recarregou ou voltou no mesmo período: no lugar do "Bom dia", uma interação descontraída do período (café, almoço, jantar, sono).
// A mesma frase vale para o painel e para a abertura da conversa (calculada uma vez por carregamento).

export type PeriodoEDA = 'madrugada' | 'manha' | 'tarde' | 'noite';

export function periodoEDA(): PeriodoEDA {
  const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Manaus' }).format(new Date())) % 24;
  return h < 5 ? 'madrugada' : h < 12 ? 'manha' : h < 18 ? 'tarde' : 'noite';
}

// 1ª entrada no período: o cumprimento clássico. Depois dele, a EDA puxa conversa do jeito do momento.
const PRIMEIRA: Record<PeriodoEDA, ((n: string) => string)[]> = {
  manha: [n => `Bom dia${n ? `, ${n}` : ''}.`],
  tarde: [n => `Boa tarde${n ? `, ${n}` : ''}.`],
  noite: [n => `Boa noite${n ? `, ${n}` : ''}.`],
  madrugada: [n => `Boa madrugada${n ? `, ${n}` : ''}.`],
};

const v = (n: string) => (n ? `, ${n}` : '');
const RETORNO: Record<PeriodoEDA, ((n: string) => string)[]> = {
  manha: [
    n => `Como foi o café hoje${v(n)}?`,
    n => `Já tomou aquele cafezinho${v(n)}?`,
    n => `E aí${v(n)}, a manhã tá rendendo?`,
    n => `Dormiu bem${v(n)}?`,
    n => `Café com tapioca ou com pão hoje${v(n)}?`,
  ],
  tarde: [
    n => `E o almoço, foi de quê hoje${v(n)}?`,
    n => `Já merendou${v(n)}?`,
    n => `Bateu a leseira depois do almoço${v(n)}?`,
    n => `Como tá a tarde por aí${v(n)}?`,
    n => `Teve peixinho no almoço${v(n)}?`,
  ],
  noite: [
    n => `Como foi o dia${v(n)}?`,
    n => `Já jantou${v(n)}?`,
    n => `Dia puxado hoje${v(n)}?`,
    n => `Bora fechar o dia${v(n)}?`,
  ],
  madrugada: [
    n => `Perdeu o sono${v(n)}?`,
    n => `Madrugada adentro, hein${v(n)}?`,
    n => `Tá sem sono${v(n)}? Fico contigo.`,
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

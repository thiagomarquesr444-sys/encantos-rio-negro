// IARA_DESTINOS_V1
// A Iara reconhece quando o visitante cita um destino do Amazonas e oferece
// a "viagem" no mapa de Destinos (zoom até o território já aberto).
// Usado no servidor (rota da IA) e no navegador (mapa e conversa).
// Cidades-base e lugares têm curadoria própria; os demais municípios entram
// pelos 62 municípios do IBGE.

import { MUNICIPIOS_AMAZONAS } from './municipiosAmazonasERN';

export type TipoDestinoIara = 'cidade' | 'lugar' | 'municipio';
export type DestinoIara = { tipo: TipoDestinoIara; id: string; nome: string };

// Cidades-base do explorador (ids iguais aos do ExploradorDestinosERN).
const CIDADES: { id: string; nome: string; apelidos: string[] }[] = [
  { id: 'manaus', nome: 'Manaus', apelidos: ['manaus', 'manaos'] },
  { id: 'novo-airao', nome: 'Novo Airão', apelidos: ['novo airao'] },
  { id: 'barcelos', nome: 'Barcelos', apelidos: ['barcelos'] },
  { id: 'santa-isabel', nome: 'Santa Isabel do Rio Negro', apelidos: ['santa isabel do rio negro', 'santa isabel'] },
  { id: 'sao-gabriel', nome: 'São Gabriel da Cachoeira', apelidos: ['sao gabriel da cachoeira', 'sao gabriel'] },
  { id: 'parintins', nome: 'Parintins', apelidos: ['parintins'] },
];

// Lugares com página própria no explorador (ids das cenas).
const LUGARES: { id: string; nome: string; apelidos: string[] }[] = [
  { id: 'mariua', nome: 'Arquipélago de Mariuá', apelidos: ['arquipelago de mariua', 'mariua'] },
  { id: 'anavilhanas', nome: 'Anavilhanas', apelidos: ['anavilhanas'] },
  { id: 'serra-do-araca', nome: 'Serra do Aracá', apelidos: ['serra do araca', 'araca'] },
  { id: 'cachoeira-eldorado', nome: 'Cachoeira do Eldorado', apelidos: ['cachoeira do eldorado', 'eldorado'] },
  { id: 'encontro-das-aguas', nome: 'Encontro das Águas', apelidos: ['encontro das aguas', 'meeting of the waters', 'encuentro de las aguas'] },
  { id: 'jau', nome: 'Parque Nacional do Jaú', apelidos: ['parque nacional do jau', 'parna do jau', 'parque do jau', 'jau'] },
];

export const normalizarDestino = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type Candidato = { termo: string; destino: DestinoIara };
let candidatos: Candidato[] | null = null;
function lista(): Candidato[] {
  if (candidatos) return candidatos;
  const todos: Candidato[] = [];
  CIDADES.forEach(c => c.apelidos.forEach(termo => todos.push({ termo, destino: { tipo: 'cidade', id: c.id, nome: c.nome } })));
  LUGARES.forEach(l => l.apelidos.forEach(termo => todos.push({ termo, destino: { tipo: 'lugar', id: l.id, nome: l.nome } })));
  MUNICIPIOS_AMAZONAS.forEach(m => {
    const termo = normalizarDestino(m.nome);
    if (todos.some(c => c.termo === termo)) return;
    todos.push({ termo, destino: { tipo: 'municipio', id: m.ibge, nome: m.nome } });
  });
  // IARA_DESTINOS_V2: jeitos curtos de dizer o município ("Figueiredo", "Olivença", "Airão").
  Object.entries(APELIDOS_MUNICIPIOS).forEach(([apelido, nome]) => {
    const m = MUNICIPIOS_AMAZONAS.find(x => normalizarDestino(x.nome) === nome);
    if (!m || todos.some(c => c.termo === apelido)) return;
    const jaTem = todos.find(c => c.termo === nome);
    todos.push({ termo: apelido, destino: jaTem?.destino ?? { tipo: 'municipio', id: m.ibge, nome: m.nome } });
  });
  // O nome mais longo vence ("Careiro da Várzea" antes de "Careiro").
  candidatos = todos.sort((a, b) => b.termo.length - a.termo.length);
  return candidatos;
}

// Apelido (sem acento) → nome oficial do município (sem acento). Só formas que não se confundem.
const APELIDOS_MUNICIPIOS: Record<string, string> = {
  'airao': 'novo airao',
  'figueiredo': 'presidente figueiredo',
  'pres figueiredo': 'presidente figueiredo',
  'atalaia': 'atalaia do norte',
  'olivenca': 'sao paulo de olivenca',
  'uatuma': 'sao sebastiao do uatuma',
  'nova olinda': 'nova olinda do norte',
  'aripuana': 'novo aripuana',
  'sta isabel': 'santa isabel do rio negro',
  'sao gabriel': 'sao gabriel da cachoeira',
};

function distancia(a: string, b: string, limite: number): number {
  if (Math.abs(a.length - b.length) > limite) return limite + 1;
  let ant = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    for (let j = 1; j <= b.length; j++) {
      atual[j] = Math.min(ant[j] + 1, atual[j - 1] + 1, ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    ant = atual;
  }
  return ant[b.length];
}

/**
 * Primeiro destino citado no texto (nome inteiro, sem pegar pedaço de palavra).
 * Com `aproximado`, aceita erro de digitação em nomes longos ("Parintis", "Manacapurú", "Barcelo")
 * — usado só quando a pessoa pediu claramente para ser levada a um lugar.
 */
export function acharDestinoIara(texto: string, opcoes?: { aproximado?: boolean }): DestinoIara | null {
  const limpo = normalizarDestino(texto).replace(/[^a-z0-9]+/g, ' ').trim();
  const n = ` ${limpo} `;
  for (const c of lista()) {
    if (n.includes(` ${c.termo} `)) return c.destino;
  }
  if (!opcoes?.aproximado) return null;
  const palavras = limpo.split(' ').filter(Boolean);
  let melhor: { destino: DestinoIara; nota: number } | null = null;
  for (const c of lista()) {
    // Nome curto exige grafia exata: "Maués" não pode casar com "mares".
    if (c.termo.length < 7) continue;
    const limite = c.termo.length >= 11 ? 2 : 1;
    const tamanho = c.termo.split(' ').length;
    for (let i = 0; i + tamanho <= palavras.length; i++) {
      const trecho = palavras.slice(i, i + tamanho).join(' ');
      if (trecho[0] !== c.termo[0]) continue;
      const d = distancia(trecho, c.termo, limite);
      if (d <= limite && (!melhor || d < melhor.nota)) melhor = { destino: c.destino, nota: d };
    }
  }
  return melhor ? melhor.destino : null;
}

/** Valida um destino vindo de fora (URL, evento ou resposta do servidor). */
export function destinoIaraValido(v: unknown): DestinoIara | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.tipo !== 'string' || typeof o.id !== 'string') return null;
  const achado = lista().find(c => c.destino.tipo === o.tipo && c.destino.id === o.id);
  return achado ? achado.destino : null;
}

/** "cidade:barcelos" ⇄ destino (para o link /destinos?iara=...). */
export const destinoParaParametro = (d: DestinoIara) => `${d.tipo}:${d.id}`;
export function destinoDoParametro(p: string | null): DestinoIara | null {
  if (!p) return null;
  const [tipo, id] = p.split(':');
  return destinoIaraValido({ tipo, id });
}

/** Todos os municípios que aparecem no mapa (para a base de conhecimento da Iara). */
export const NOMES_MUNICIPIOS_IARA = MUNICIPIOS_AMAZONAS.map(m => m.nome).join(', ');

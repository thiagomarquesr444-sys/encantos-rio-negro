// EDA_RESOLVER_V1: o "cérebro estruturado" da EDA.
// A IA só diz O QUE a pessoa quer (com códigos OU nomes, do jeito que sair);
// aqui o servidor traduz apelidos de campo, acha registros pelo nome (tolerando
// erro de digitação) e devolve os ids reais. Funções puras: testadas em scripts/treino-eda.
import { REGRAS_ACAO, type TabelaAcao } from './acoesEDA';

export type Candidato = { codigo: string; tabela: string; id: string; rotulo: string; busca?: string };

export const normalizarEDA = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9/ ]+/g, ' ').replace(/\s+/g, ' ').trim();

// Apelidos que a IA (ou a pessoa) costuma usar → campo real de cada tabela.
const APELIDOS_COMUNS: Record<string, string> = {
  barco: 'embarcacao_id', embarcacao: 'embarcacao_id', lancha: 'embarcacao_id', voadeira: 'embarcacao_id',
  guia: 'guia_id', passeio: 'passeio_id', roteiro: 'passeio_id', saida: 'saida_id',
  hora: 'horario', horario: 'horario', obs: 'observacoes', observacao: 'observacoes',
};
const APELIDOS: Partial<Record<TabelaAcao, Record<string, string>>> = {
  reservas: { pessoas: 'quantidade_pessoas', quantidade: 'quantidade_pessoas', criancas: 'qtd_criancas', colo: 'qtd_colo', valor: 'valor_total', preco: 'valor_total', data: 'data_reserva', volta: 'data_fim_prevista', pedido: 'pedido_id', nome: 'cliente', cliente_nome: 'cliente' },
  passeio_saidas: { data: 'data_inicio', ida: 'data_inicio', volta: 'data_fim', vagas: 'vagas_total', obs: 'observacao', observacoes: 'observacao' },
  demandas: { data: 'data_inicio', nome: 'titulo', local: 'localidade', obs: 'descricao', consumo: 'consumo_pessoa_dia', por_pessoa_dia: 'consumo_pessoa_dia', pessoas: 'pessoas_estimadas', dias: 'dias_estimados', margem: 'margem_percentual' },
  passeios: { valor: 'preco', portal: 'publicado_portal', publicado: 'publicado_portal', status: 'situacao' },
  hospedagens: { diaria: 'valor_diaria', valor: 'valor_diaria' },
  parceiros: { comissao: 'comissao_porcentagem' },
  embarcacoes: { situacao_uso: 'status' },
};

/** Campo real para um nome de campo vindo da IA (ou undefined). */
export function campoReal(tabela: TabelaAcao, bruto: string): string | undefined {
  const k = normalizarEDA(bruto).replace(/ /g, '_');
  const regra = REGRAS_ACAO[tabela];
  if (regra.campos[k]) return k;
  const alvo = APELIDOS[tabela]?.[k] ?? APELIDOS_COMUNS[k];
  if (!alvo) return undefined;
  // "observacoes" vira "observacao" nas tabelas que usam o singular.
  if (!regra.campos[alvo] && alvo === 'observacoes' && regra.campos.observacao) return 'observacao';
  return regra.campos[alvo] ? alvo : undefined;
}

const PALAVRAS_VAZIAS = new Set(['guia', 'barco', 'embarcacao', 'passeio', 'reserva', 'demanda', 'saida', 'cliente', 'voucher', 'pedido', 'abrir', 'abre', 'para', 'pra', 'com', 'dos', 'das', 'do', 'da', 'de', 'o', 'a', 'os', 'as', 'no', 'na', 'um', 'uma', 'e']);
const palavras = (t: string) => normalizarEDA(t).split(/[ /]+/).filter(w => w.length > 2 && !PALAVRAS_VAZIAS.has(w));

/** Nota de semelhança 0..1 entre o que foi dito e um rótulo (aceita erro de 1 letra e prefixos). */
export function semelhanca(dito: string, rotulo: string): number {
  const a = palavras(dito);
  const b = palavras(rotulo);
  if (!a.length || !b.length) return 0;
  const n = normalizarEDA(dito);
  if (normalizarEDA(rotulo) === n) return 1;
  // Palavra igual vale 1; começo de palavra ou 1 letra trocada vale 0,8 (assim "Jaguá" ≠ "Jaguatirica").
  let ok = 0;
  for (const w of b) {
    let melhor = 0;
    for (const x of a) {
      if (x === w) { melhor = 1; break; }
      if ((x.length >= 4 && (w.startsWith(x) || x.startsWith(w))) || (x.length >= 5 && distancia(x, w) <= 1)) melhor = Math.max(melhor, 0.8);
    }
    ok += melhor;
  }
  if (!ok) return 0;
  const cobertura = ok / b.length;
  const precisao = ok / a.length;
  return Math.max(cobertura, precisao * 0.9);
}

function distancia(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) m[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) for (let j = 1; j <= b.length; j += 1) {
    m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return m[a.length][b.length];
}

export type Achado = { ok: true; candidato: Candidato } | { ok: false; motivo: 'nenhum' | 'ambiguo'; opcoes: Candidato[] };

/** Acha UM registro pelo código (P1) ou pelo nome. Ambíguo = dois com a mesma nota alta. */
export function acharRegistro(valor: string, candidatos: Candidato[], tabela?: string): Achado {
  const lista = tabela ? candidatos.filter(c => c.tabela === tabela) : candidatos;
  const cod = valor.trim().toUpperCase();
  const porCodigo = lista.find(c => c.codigo === cod);
  if (porCodigo) return { ok: true, candidato: porCodigo };
  const notas = lista
    .map(c => ({ c, nota: Math.max(semelhanca(valor, c.rotulo), c.busca ? semelhanca(valor, c.busca) : 0) }))
    .filter(x => x.nota >= 0.6)
    .sort((x, y) => y.nota - x.nota);
  if (!notas.length) return { ok: false, motivo: 'nenhum', opcoes: [] };
  const topo = notas.filter(x => x.nota >= notas[0].nota - 0.05);
  // Mesmo rótulo em vários (ex.: duas reservas do mesmo passeio) = ambíguo.
  if (topo.length > 1) return { ok: false, motivo: 'ambiguo', opcoes: topo.slice(0, 4).map(x => x.c) };
  return { ok: true, candidato: notas[0].c };
}

/** Escolhe a saída: pela data pedida; sem data, a única aberta; várias = pergunta. */
export function escolherSaida<T extends { id: string; data_inicio: string; status: string }>(saidas: T[], data?: string | null):
  { ok: true; saida: T } | { ok: false; motivo: 'nenhuma' | 'varias' | 'sem_na_data'; datas: string[] } {
  const abertas = saidas.filter(s => s.status === 'aberta').sort((a, b) => a.data_inicio.localeCompare(b.data_inicio));
  if (data) {
    const naData = abertas.find(s => s.data_inicio === data);
    return naData ? { ok: true, saida: naData } : { ok: false, motivo: 'sem_na_data', datas: abertas.map(s => s.data_inicio) };
  }
  if (abertas.length === 1) return { ok: true, saida: abertas[0] };
  return { ok: false, motivo: abertas.length ? 'varias' : 'nenhuma', datas: abertas.map(s => s.data_inicio) };
}

/**
 * EDA_INTENCAO_DIRETA_V1: rede de segurança quando a IA não monta a ação para uma reserva citada
 * pelo NOME DO CLIENTE (a IA não vê nomes de clientes — LGPD; o servidor vê na busca).
 * Ex.: "confirma a reserva do Francisco", "coloca o barco Jaguá na reserva do Raimundo",
 * "troca o guia da reserva do Raimundo para o Oziel", "muda a reserva do Raimundo para 4 pessoas".
 * Devolve o alvo e os campos (ids já achados) ou um aviso; null se a frase não é desse tipo.
 */
export function intencaoReservaDireta(frase: string, candidatos: Candidato[]):
  { alvo: Candidato; campos: Record<string, string | number> } | { aviso: string } | null {
  const n = normalizarEDA(frase);
  const m = /\breservas? d[oa]s? (.+?)(?= (?:para|pra|com|no dia|amanha|hoje)\b|$)/.exec(n);
  if (!m) return null;
  const nome = m[1].trim();
  const r = acharRegistro(nome, candidatos, 'reservas');
  if (!r.ok) return r.motivo === 'ambiguo' ? { aviso: 'Achei mais de uma reserva com esse nome — me diga a data ou o passeio.' } : { aviso: `Não achei reserva de "${nome}" nos próximos dias.` };
  const campos: Record<string, string | number> = {};
  if (/\b(confirm\w*)\b/.test(n)) campos.status = 'Confirmada';
  else if (/\b(cancel\w*|desmarc\w*)\b/.test(n)) campos.status = 'Cancelada';
  else if (/\b(pendente|volta pra pendente)\b/.test(n)) campos.status = 'Pendente';
  const barco = /\b(?:barco|embarcacao|lancha|voadeira) (.+?)(?= (?:na|no|da|do|para|pra|em)\b|$)/.exec(n);
  if (barco) {
    const b = acharRegistro(barco[1], candidatos, 'embarcacoes');
    if (!b.ok) return { aviso: `Não achei o barco "${barco[1]}".` };
    campos.embarcacao_id = b.candidato.id;
  }
  const guia = /\bguia (?:da reserva d[oa]s? .+? )?(?:para|pra) (?:o |a )?(.+)$/.exec(n) ?? /\bguia (?!da reserva)(.+?)(?= (?:na|no|da|do|para|pra|em)\b|$)/.exec(n);
  if (guia) {
    const g = acharRegistro(guia[1], candidatos, 'guias');
    if (!g.ok) return { aviso: `Não achei o guia "${guia[1]}".` };
    campos.guia_id = g.candidato.id;
  }
  const pessoas = /\b(\d{1,3}) (?:pessoas|pax|passageiros)\b/.exec(n);
  if (pessoas) campos.quantidade_pessoas = Number(pessoas[1]);
  return Object.keys(campos).length ? { alvo: r.candidato, campos } : null;
}

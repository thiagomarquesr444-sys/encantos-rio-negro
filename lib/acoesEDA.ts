// EDA_EXECUTA_V1: ações que a EDA executa em qualquer página da gestão.
// A IA só PROPÕE (códigos de registro + campos); o servidor valida contra esta lista
// e o navegador valida de novo antes de gravar com a sessão da pessoa (RLS e plano valem).
// Não há exclusão por aqui: cancelar/inativar é feito pelo status.

export type TabelaAcao =
  | 'reservas' | 'passeios' | 'passeio_saidas' | 'embarcacoes' | 'guias'
  | 'hospedagens' | 'parceiros' | 'vouchers' | 'pedidos_visitante' | 'demandas';

type TipoCampo = 'texto' | 'numero' | 'inteiro' | 'data' | 'hora' | 'bool' | 'opcao' | 'ref';
export type Campo = { rotulo: string; tipo: TipoCampo; max?: number; min?: number; opcoes?: readonly string[]; ref?: TabelaAcao; soCriar?: boolean };
type Regra = { nome: string; codigo: string; criar: boolean; obrigatorios?: string[]; campos: Record<string, Campo> };

export const REGRAS_ACAO: Record<TabelaAcao, Regra> = {
  reservas: {
    nome: 'reserva', codigo: 'R', criar: false,
    campos: {
      status: { rotulo: 'status', tipo: 'opcao', opcoes: ['Pendente', 'Confirmada', 'Cancelada'] },
      data_reserva: { rotulo: 'data', tipo: 'data' },
      horario: { rotulo: 'horário', tipo: 'hora' },
      quantidade_pessoas: { rotulo: 'pessoas', tipo: 'inteiro', min: 1, max: 500 },
      valor_total: { rotulo: 'valor total', tipo: 'numero', min: 0, max: 10_000_000 },
      guia_id: { rotulo: 'guia', tipo: 'ref', ref: 'guias' },
      embarcacao_id: { rotulo: 'embarcação', tipo: 'ref', ref: 'embarcacoes' },
      observacoes: { rotulo: 'observações', tipo: 'texto', max: 500 },
    },
  },
  passeios: {
    nome: 'passeio', codigo: 'P', criar: true, obrigatorios: ['nome'],
    campos: {
      nome: { rotulo: 'nome', tipo: 'texto', min: 3, max: 120 },
      categoria: { rotulo: 'categoria', tipo: 'texto', max: 60 },
      preco: { rotulo: 'preço', tipo: 'numero', min: 0, max: 1_000_000 },
      preco_modalidade: { rotulo: 'forma de preço', tipo: 'opcao', opcoes: ['por_pessoa', 'por_grupo', 'sob_consulta'] },
      situacao: { rotulo: 'situação', tipo: 'opcao', opcoes: ['Ativo', 'Inativo', 'Em Breve'] },
      vagas: { rotulo: 'vagas', tipo: 'inteiro', min: 0, max: 1000 },
      cidade: { rotulo: 'cidade', tipo: 'texto', max: 80 },
      duracao: { rotulo: 'duração', tipo: 'texto', max: 60 },
      descricao: { rotulo: 'descrição', tipo: 'texto', max: 2000 },
      publicado_portal: { rotulo: 'no portal', tipo: 'bool' },
    },
  },
  passeio_saidas: {
    nome: 'saída', codigo: 'S', criar: true, obrigatorios: ['passeio_id', 'data_inicio', 'vagas_total'],
    campos: {
      passeio_id: { rotulo: 'passeio', tipo: 'ref', ref: 'passeios', soCriar: true },
      data_inicio: { rotulo: 'data de saída', tipo: 'data' },
      data_fim: { rotulo: 'data de volta', tipo: 'data' },
      horario: { rotulo: 'horário', tipo: 'hora' },
      vagas_total: { rotulo: 'vagas', tipo: 'inteiro', min: 1, max: 1000 },
      status: { rotulo: 'status', tipo: 'opcao', opcoes: ['aberta', 'fechada', 'cancelada'] },
      observacao: { rotulo: 'observação', tipo: 'texto', max: 500 },
    },
  },
  embarcacoes: {
    nome: 'embarcação', codigo: 'E', criar: true, obrigatorios: ['nome'],
    campos: {
      nome: { rotulo: 'nome', tipo: 'texto', min: 2, max: 120 },
      tipo: { rotulo: 'tipo', tipo: 'texto', max: 60 },
      capacidade: { rotulo: 'capacidade', tipo: 'inteiro', min: 1, max: 1000 },
      status: { rotulo: 'status', tipo: 'opcao', opcoes: ['Disponível', 'Reservada', 'Manutenção', 'Inativa'] },
      situacao: { rotulo: 'conservação', tipo: 'texto', max: 40 },
      motor: { rotulo: 'motor', tipo: 'texto', max: 80 },
    },
  },
  guias: {
    nome: 'guia', codigo: 'G', criar: true, obrigatorios: ['nome'],
    campos: {
      nome: { rotulo: 'nome', tipo: 'texto', min: 2, max: 120 },
      idiomas: { rotulo: 'idiomas', tipo: 'texto', max: 120 },
      status: { rotulo: 'status', tipo: 'opcao', opcoes: ['Ativo', 'Em Tour', 'Férias', 'Inativo'] },
    },
  },
  hospedagens: {
    nome: 'hospedagem', codigo: 'H', criar: true, obrigatorios: ['nome'],
    campos: {
      nome: { rotulo: 'nome', tipo: 'texto', min: 2, max: 120 },
      tipo: { rotulo: 'tipo', tipo: 'texto', max: 60 },
      cidade: { rotulo: 'cidade', tipo: 'texto', max: 80 },
      valor_diaria: { rotulo: 'diária', tipo: 'numero', min: 0, max: 1_000_000 },
      status: { rotulo: 'status', tipo: 'opcao', opcoes: ['Ativa', 'Inativa'] },
    },
  },
  parceiros: {
    nome: 'parceiro', codigo: 'PC', criar: true, obrigatorios: ['nome'],
    campos: {
      nome: { rotulo: 'nome', tipo: 'texto', min: 2, max: 120 },
      tipo: { rotulo: 'tipo', tipo: 'texto', max: 60 },
      cidade: { rotulo: 'cidade', tipo: 'texto', max: 80 },
      comissao_porcentagem: { rotulo: 'comissão (%)', tipo: 'numero', min: 0, max: 100 },
      status: { rotulo: 'status', tipo: 'opcao', opcoes: ['ativo', 'inativo'] },
    },
  },
  vouchers: {
    nome: 'voucher', codigo: 'V', criar: false,
    campos: {
      status: { rotulo: 'status', tipo: 'opcao', opcoes: ['Ativo', 'Utilizado', 'Cancelado'] },
      validade: { rotulo: 'validade', tipo: 'data' },
    },
  },
  pedidos_visitante: {
    nome: 'pedido do portal', codigo: 'PV', criar: false,
    campos: { status: { rotulo: 'status', tipo: 'opcao', opcoes: ['novo', 'em_contato', 'convertido', 'descartado'] } },
  },
  demandas: {
    nome: 'demanda', codigo: 'D', criar: false,
    campos: {
      status: { rotulo: 'status', tipo: 'opcao', opcoes: ['rascunho', 'aberta', 'encerrada', 'cancelada'] },
      data_inicio: { rotulo: 'início', tipo: 'data' },
      data_fim: { rotulo: 'fim', tipo: 'data' },
      horario: { rotulo: 'horário', tipo: 'hora' },
    },
  },
};

export const TABELAS_ACAO = Object.keys(REGRAS_ACAO) as TabelaAcao[];
export const UUID_EDA = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Valor = string | number | boolean | null;
export type AcaoRegistro =
  | { tipo: 'alterar'; tabela: TabelaAcao; id: string; campos: Record<string, Valor>; resumo: string }
  | { tipo: 'criar'; tabela: TabelaAcao; campos: Record<string, Valor>; resumo: string };

const sem = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Converte um valor (texto vindo da IA ou já tipado) para o tipo do campo. undefined = inválido. */
export function converterValor(c: Campo, bruto: unknown): Valor | undefined {
  if (bruto === null || (typeof bruto === 'string' && /^(vazio|nenhum|null|-)?$/i.test(bruto.trim()))) {
    return c.tipo === 'opcao' || c.tipo === 'bool' ? undefined : null;
  }
  const t = typeof bruto === 'string' ? bruto.replace(/[\u0000-\u001f<>]/g, ' ').trim() : bruto;
  switch (c.tipo) {
    case 'texto': {
      if (typeof t !== 'string') return undefined;
      const v = t.slice(0, c.max ?? 200);
      return v.length >= (c.min ?? 1) ? v : undefined;
    }
    case 'numero': case 'inteiro': {
      const n = typeof t === 'number' ? t : Number(String(t).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
      if (!Number.isFinite(n)) return undefined;
      const v = c.tipo === 'inteiro' ? Math.round(n) : Math.round(n * 100) / 100;
      if (c.min != null && v < c.min) return undefined;
      if (c.max != null && v > c.max) return undefined;
      return v;
    }
    case 'data': {
      const s = String(t);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(`${s}T12:00:00Z`))) return undefined;
      return s;
    }
    case 'hora': {
      const m = /^(\d{1,2})[:h](\d{2})?$/i.exec(String(t));
      if (!m || Number(m[1]) > 23 || Number(m[2] ?? 0) > 59) return undefined;
      return `${m[1].padStart(2, '0')}:${m[2] ?? '00'}`;
    }
    case 'bool': {
      if (typeof t === 'boolean') return t;
      const s = sem(String(t));
      return /^(sim|true|1|publicar|publicado)$/.test(s) ? true : /^(nao|false|0|despublicar|tirar)$/.test(s) ? false : undefined;
    }
    case 'opcao': {
      const s = sem(String(t)).replace(/\s+/g, '_');
      return c.opcoes?.find(o => sem(o).replace(/\s+/g, '_') === s);
    }
    case 'ref':
      return typeof t === 'string' && UUID_EDA.test(t) ? t : undefined;
  }
}

/** Revalida uma ação inteira (usado no navegador antes de gravar). */
export function acaoRegistroValida(a: unknown): a is AcaoRegistro {
  const x = a as AcaoRegistro;
  if (!x || (x.tipo !== 'alterar' && x.tipo !== 'criar') || typeof x.resumo !== 'string') return false;
  const regra = REGRAS_ACAO[x.tabela as TabelaAcao];
  if (!regra || !x.campos || typeof x.campos !== 'object') return false;
  if (x.tipo === 'alterar' && !UUID_EDA.test(String((x as { id?: string }).id ?? ''))) return false;
  if (x.tipo === 'criar' && !regra.criar) return false;
  const chaves = Object.keys(x.campos);
  if (!chaves.length || chaves.length > 10) return false;
  for (const k of chaves) {
    const c = regra.campos[k];
    if (!c || (c.soCriar && x.tipo === 'alterar')) return false;
    const v = converterValor(c, x.campos[k]);
    if (v === undefined || v !== x.campos[k]) return false;
  }
  if (x.tipo === 'criar' && (regra.obrigatorios ?? []).some(k => x.campos[k] == null)) return false;
  return true;
}

/** Texto para o prompt: o que a EDA pode criar/alterar em cada área. */
export function descreverAcoes(): string {
  return TABELAS_ACAO.map(t => {
    const r = REGRAS_ACAO[t];
    const campos = Object.entries(r.campos).map(([k, c]) =>
      `${k}${c.tipo === 'opcao' ? `(${c.opcoes?.join('/')})` : c.tipo === 'ref' ? `(código ${REGRAS_ACAO[c.ref!].codigo}#)` : c.tipo === 'data' ? '(AAAA-MM-DD)' : c.tipo === 'hora' ? '(HH:MM)' : c.tipo === 'bool' ? '(sim/não)' : ''}`).join(', ');
    return `- ${t} [códigos ${r.codigo}#]${r.criar ? ` — pode CRIAR (obrigatório: ${(r.obrigatorios ?? []).join(', ')})` : ' — só ALTERAR'}: ${campos}`;
  }).join('\n');
}

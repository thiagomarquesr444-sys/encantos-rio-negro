export type RecursoPlano =
  | 'rede_basica'
  | 'financeiro'
  | 'vouchers'
  | 'relatorios'
  | 'concierge_ia'
  | 'whatsapp'
  | 'destaque_rede';

export type RecursosPlano = Partial<
  Record<RecursoPlano, boolean>
>;

export type PlanoAtual = {
  empresa_id: string;
  empresa_nome: string;
  plano_id: string;
  plano_codigo: string;
  plano_nome: string;
  assinatura_status: string;
  limite_usuarios: number | null;
  limite_clientes: number | null;
  limite_reservas_mes: number | null;
  limite_passeios: number | null;
  recursos: RecursosPlano | null;
};

export const RECURSOS_PLANOS: Record<
  RecursoPlano,
  {
    nome: string;
    descricao: string;
    planoMinimo: 'Profissional' | 'Premium';
  }
> = {
  rede_basica: {
    nome: 'Rede ERN',
    descricao:
      'Presença básica da empresa na Rede Encantos Rio Negro.',
    planoMinimo: 'Profissional',
  },

  financeiro: {
    nome: 'Financeiro',
    descricao:
      'Controle receitas, despesas, valores a receber e movimentações da operação.',
    planoMinimo: 'Profissional',
  },

  vouchers: {
    nome: 'Vouchers',
    descricao:
      'Crie e acompanhe vouchers vinculados às experiências e reservas.',
    planoMinimo: 'Profissional',
  },

  relatorios: {
    nome: 'Relatórios',
    descricao:
      'Acompanhe indicadores e informações consolidadas da operação.',
    planoMinimo: 'Profissional',
  },

  concierge_ia: {
    nome: 'Concierge IA',
    descricao:
      'Use inteligência artificial no atendimento e planejamento das viagens.',
    planoMinimo: 'Premium',
  },

  whatsapp: {
    nome: 'WhatsApp',
    descricao:
      'Integre atendimento e automações da operação ao WhatsApp.',
    planoMinimo: 'Premium',
  },

  destaque_rede: {
    nome: 'Destaque na Rede',
    descricao:
      'Ganhe maior exposição dentro da Rede Encantos Rio Negro.',
    planoMinimo: 'Premium',
  },
};

export function possuiRecurso(
  plano: PlanoAtual | null,
  recurso: RecursoPlano
) {
  if (!plano) {
    return false;
  }

  if (plano.assinatura_status !== 'ativo') {
    return false;
  }

  return plano.recursos?.[recurso] === true;
}
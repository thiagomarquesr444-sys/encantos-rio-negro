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

export type LimitePlano =
  | 'usuarios'
  | 'clientes'
  | 'reservas_mes'
  | 'passeios';

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

export type UsoPlano = {
  usuarios: number;
  clientes: number;
  reservas_mes: number;
  passeios: number;
};

export type SituacaoLimite = {
  tipo: LimitePlano;

  /**
   * Quando false, a interface deve apresentar uso indisponível.
   * O valor normalizado de "usado" não representa uma contagem real.
   */
  dados_validos: boolean;

  usado: number;
  limite: number | null;

  ilimitado: boolean;
  atingido: boolean;
  excedido: boolean;

  restante: number | null;
  pode_criar: boolean;
};

type ConfiguracaoRecurso = {
  nome: string;
  descricao: string;
  planoMinimo: 'Grátis' | 'Profissional' | 'Premium';
};

type CampoLimitePlano =
  | 'limite_usuarios'
  | 'limite_clientes'
  | 'limite_reservas_mes'
  | 'limite_passeios';

type ConfiguracaoLimite = {
  nome: string;
  campo: CampoLimitePlano;
};

export const RECURSOS_PLANOS: Record<
  RecursoPlano,
  ConfiguracaoRecurso
> = {
  rede_basica: {
    nome: 'Rede ERN',
    descricao:
      'Presença básica da empresa na Rede Encantos Rio Negro.',
    planoMinimo: 'Grátis',
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

export const LIMITES_PLANOS: Record<
  LimitePlano,
  ConfiguracaoLimite
> = {
  usuarios: {
    nome: 'Usuários',
    campo: 'limite_usuarios',
  },

  clientes: {
    nome: 'Clientes',
    campo: 'limite_clientes',
  },

  reservas_mes: {
    nome: 'Reservas no mês',
    campo: 'limite_reservas_mes',
  },

  passeios: {
    nome: 'Passeios',
    campo: 'limite_passeios',
  },
};

function inteiroNaoNegativo(
  valor: unknown,
): valor is number {
  return (
    typeof valor === 'number' &&
    Number.isSafeInteger(valor) &&
    valor >= 0
  );
}

export function planoEstaAtivo(
  plano: PlanoAtual | null,
): boolean {
  if (!plano) {
    return false;
  }

  return (
    plano.assinatura_status === 'ativo' ||
    plano.assinatura_status === 'trial'
  );
}

export function possuiRecurso(
  plano: PlanoAtual | null,
  recurso: RecursoPlano,
): boolean {
  return (
    planoEstaAtivo(plano) &&
    plano?.recursos?.[recurso] === true
  );
}

export function obterLimitePlano(
  plano: PlanoAtual | null,
  tipo: LimitePlano,
): number | null {
  if (!plano || !planoEstaAtivo(plano)) {
    return 0;
  }

  const campo = LIMITES_PLANOS[tipo].campo;
  const valor = plano[campo];

  // null é a representação de limite ilimitado no banco.
  if (valor === null) {
    return null;
  }

  // Configuração inválida nunca deve liberar criação.
  return inteiroNaoNegativo(valor) ? valor : 0;
}

export function analisarLimite(
  plano: PlanoAtual | null,
  tipo: LimitePlano,
  usado: number,
): SituacaoLimite {
  const campo = LIMITES_PLANOS[tipo].campo;
  const valorOriginal = plano?.[campo];

  const usoValido = inteiroNaoNegativo(usado);

  const limiteValido =
    valorOriginal === null ||
    inteiroNaoNegativo(valorOriginal);

  const dadosValidos = usoValido && limiteValido;

  // Mantém o contrato numérico. A interface deve verificar
  // dados_validos antes de apresentar esse valor como contagem.
  const usoSeguro = usoValido ? usado : 0;

  const limite = obterLimitePlano(plano, tipo);
  const ilimitado = limite === null;

  const atingido =
    dadosValidos &&
    limite !== null &&
    usoSeguro >= limite;

  const excedido =
    dadosValidos &&
    limite !== null &&
    usoSeguro > limite;

  const restante =
    dadosValidos && limite !== null
      ? Math.max(limite - usoSeguro, 0)
      : null;

  const podeCriar =
    planoEstaAtivo(plano) &&
    dadosValidos &&
    (limite === null || usoSeguro < limite);

  return {
    tipo,
    dados_validos: dadosValidos,
    usado: usoSeguro,
    limite,
    ilimitado,
    atingido,
    excedido,
    restante,
    pode_criar: podeCriar,
  };
}

export function analisarUsoPlano(
  plano: PlanoAtual | null,
  uso: UsoPlano,
): Record<LimitePlano, SituacaoLimite> {
  return {
    usuarios: analisarLimite(
      plano,
      'usuarios',
      uso.usuarios,
    ),

    clientes: analisarLimite(
      plano,
      'clientes',
      uso.clientes,
    ),

    reservas_mes: analisarLimite(
      plano,
      'reservas_mes',
      uso.reservas_mes,
    ),

    passeios: analisarLimite(
      plano,
      'passeios',
      uso.passeios,
    ),
  };
}

export function podeCriarNoLimite(
  plano: PlanoAtual | null,
  tipo: LimitePlano,
  usado: number,
): boolean {
  return analisarLimite(plano, tipo, usado).pode_criar;
}

export function formatarLimite(
  limite: number | null,
): string {
  if (limite === null) {
    return 'Ilimitado';
  }

  if (!inteiroNaoNegativo(limite)) {
    return 'Indisponível';
  }

  return String(limite);
}
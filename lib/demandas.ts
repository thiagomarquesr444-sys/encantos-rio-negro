import { supabase } from '@/lib/supabase';

export const CATEGORIAS_DEMANDA = {
  alimentacao: 'Alimentação',
  bebidas: 'Bebidas',
  combustivel: 'Combustível',
  hospedagem: 'Hospedagem',
  transporte_fluvial: 'Transporte fluvial',
  guiamento: 'Guiamento',
  passeios: 'Passeios',
  outros: 'Outros',
} as const;

export const STATUS_DEMANDA = {
  rascunho: 'Rascunho',
  aberta: 'Aberta',
  encerrada: 'Encerrada',
  cancelada: 'Cancelada',
} as const;

export const METODOS_ESTIMATIVA = {
  manual: 'Quantidade manual',
  pessoa_dia: 'Consumo por pessoa/dia',
  combustivel_hora: 'Consumo de combustível',
} as const;

export const PUBLICOS_ALVO = {
  turistas: 'Turistas',
  tripulacao: 'Tripulação',
  ambos: 'Turistas e tripulação',
  operacao: 'Operação',
} as const;

export const TIPOS_COMBUSTIVEL = {
  gasolina: 'Gasolina',
  diesel: 'Diesel',
} as const;

export type CategoriaDemanda =
  keyof typeof CATEGORIAS_DEMANDA;

export type StatusDemanda =
  keyof typeof STATUS_DEMANDA;

export type MetodoEstimativa =
  keyof typeof METODOS_ESTIMATIVA;

export type PublicoAlvo =
  keyof typeof PUBLICOS_ALVO;

export type TipoCombustivel =
  keyof typeof TIPOS_COMBUSTIVEL;

export type Demanda = {
  id: string;
  empresa_id: string;
  criado_por: string | null;
  created_at: string;

  titulo: string;
  descricao: string | null;
  categoria: CategoriaDemanda;
  localidade: string;

  data_inicio: string | null;
  data_fim: string | null;

  quantidade: number;
  unidade: string;
  status: StatusDemanda;

  metodo_estimativa: MetodoEstimativa;

  publico_alvo: PublicoAlvo | null;

  pessoas_estimadas: number | null;
  dias_estimados: number | null;
  consumo_pessoa_dia: number | null;

  tipo_combustivel: TipoCombustivel | null;
  horas_motor_dia: number | null;
  consumo_litros_hora: number | null;
  margem_percentual: number;
};

export type DadosDemanda = {
  titulo: string;
  descricao: string | null;
  categoria: CategoriaDemanda;
  localidade: string;

  data_inicio: string | null;
  data_fim: string | null;

  quantidade: number;
  unidade: string;
  status: StatusDemanda;

  metodo_estimativa: MetodoEstimativa;

  publico_alvo: PublicoAlvo | null;

  pessoas_estimadas: number | null;
  dias_estimados: number | null;
  consumo_pessoa_dia: number | null;

  tipo_combustivel: TipoCombustivel | null;
  horas_motor_dia: number | null;
  consumo_litros_hora: number | null;
  margem_percentual: number;
};

export type ContextoDemandas = {
  usuario_id: string;
  empresa_id: string;
  papel: string | null;
  pode_gerenciar: boolean;
};

export type FiltrosDemandas = {
  busca?: string;
  categoria?: CategoriaDemanda | '';
  status?: StatusDemanda | '';
  pagina?: number;
};

export type PaginaDemandas = {
  registros: Demanda[];
  total: number;
  pagina: number;
  tamanho_pagina: number;
  total_paginas: number;
};

export const TAMANHO_PAGINA_DEMANDAS = 12;

const CAMPOS_DEMANDA =
  'id,empresa_id,criado_por,created_at,titulo,descricao,categoria,localidade,data_inicio,data_fim,quantidade,unidade,status,metodo_estimativa,publico_alvo,pessoas_estimadas,dias_estimados,consumo_pessoa_dia,tipo_combustivel,horas_motor_dia,consumo_litros_hora,margem_percentual';

export class ErroDemandas extends Error {
  constructor(mensagem: string) {
    super(mensagem);

    this.name = 'ErroDemandas';
  }
}

function ehObjeto(
  valor: unknown,
): valor is Record<string, unknown> {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

function ehTexto(
  valor: unknown,
): valor is string {
  return typeof valor === 'string';
}

function ehTextoOuNulo(
  valor: unknown,
): valor is string | null {
  return valor === null || ehTexto(valor);
}

function ehNumeroOuNulo(
  valor: unknown,
): valor is number | null {
  return (
    valor === null ||
    (typeof valor === 'number' &&
      Number.isFinite(valor))
  );
}

export function ehCategoriaDemanda(
  valor: unknown,
): valor is CategoriaDemanda {
  return (
    typeof valor === 'string' &&
    Object.prototype.hasOwnProperty.call(
      CATEGORIAS_DEMANDA,
      valor,
    )
  );
}

export function ehStatusDemanda(
  valor: unknown,
): valor is StatusDemanda {
  return (
    typeof valor === 'string' &&
    Object.prototype.hasOwnProperty.call(
      STATUS_DEMANDA,
      valor,
    )
  );
}

export function ehMetodoEstimativa(
  valor: unknown,
): valor is MetodoEstimativa {
  return (
    typeof valor === 'string' &&
    Object.prototype.hasOwnProperty.call(
      METODOS_ESTIMATIVA,
      valor,
    )
  );
}

export function ehPublicoAlvo(
  valor: unknown,
): valor is PublicoAlvo {
  return (
    typeof valor === 'string' &&
    Object.prototype.hasOwnProperty.call(
      PUBLICOS_ALVO,
      valor,
    )
  );
}

export function ehTipoCombustivel(
  valor: unknown,
): valor is TipoCombustivel {
  return (
    typeof valor === 'string' &&
    Object.prototype.hasOwnProperty.call(
      TIPOS_COMBUSTIVEL,
      valor,
    )
  );
}

export function metodoEstimativaDaCategoria(
  categoria: CategoriaDemanda,
): MetodoEstimativa {
  if (
    categoria === 'alimentacao' ||
    categoria === 'bebidas'
  ) {
    return 'pessoa_dia';
  }

  if (categoria === 'combustivel') {
    return 'combustivel_hora';
  }

  return 'manual';
}

function ehDemanda(
  valor: unknown,
): valor is Demanda {
  if (!ehObjeto(valor)) {
    return false;
  }

  return (
    ehTexto(valor.id) &&
    ehTexto(valor.empresa_id) &&
    ehTextoOuNulo(valor.criado_por) &&
    ehTexto(valor.created_at) &&
    ehTexto(valor.titulo) &&
    ehTextoOuNulo(valor.descricao) &&
    ehCategoriaDemanda(valor.categoria) &&
    ehTexto(valor.localidade) &&
    ehTextoOuNulo(valor.data_inicio) &&
    ehTextoOuNulo(valor.data_fim) &&
    typeof valor.quantidade === 'number' &&
    Number.isFinite(valor.quantidade) &&
    valor.quantidade > 0 &&
    ehTexto(valor.unidade) &&
    ehStatusDemanda(valor.status) &&
    ehMetodoEstimativa(
      valor.metodo_estimativa,
    ) &&
    (valor.publico_alvo === null ||
      ehPublicoAlvo(valor.publico_alvo)) &&
    ehNumeroOuNulo(
      valor.pessoas_estimadas,
    ) &&
    ehNumeroOuNulo(
      valor.dias_estimados,
    ) &&
    ehNumeroOuNulo(
      valor.consumo_pessoa_dia,
    ) &&
    (valor.tipo_combustivel === null ||
      ehTipoCombustivel(
        valor.tipo_combustivel,
      )) &&
    ehNumeroOuNulo(
      valor.horas_motor_dia,
    ) &&
    ehNumeroOuNulo(
      valor.consumo_litros_hora,
    ) &&
    typeof valor.margem_percentual ===
      'number' &&
    Number.isFinite(
      valor.margem_percentual,
    )
  );
}

function interpretarDemanda(
  valor: unknown,
): Demanda {
  if (!ehDemanda(valor)) {
    throw new ErroDemandas(
      'A demanda recebida possui dados inesperados. Atualize a página e tente novamente.',
    );
  }

  return valor;
}

function dataValida(
  valor: string,
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(valor)
  ) {
    return false;
  }

  const data = new Date(
    `${valor}T00:00:00.000Z`,
  );

  return (
    Number.isFinite(data.getTime()) &&
    data.toISOString().slice(0, 10) ===
      valor
  );
}

function tamanhoTexto(
  valor: string,
): number {
  return Array.from(valor).length;
}

function arredondarDuasCasas(
  valor: number,
): number {
  return Math.round(valor * 100) / 100;
}

function validarNumeroPositivo(
  valor: number | null,
  mensagem: string,
): number {
  if (
    valor === null ||
    !Number.isFinite(valor) ||
    valor <= 0
  ) {
    throw new ErroDemandas(mensagem);
  }

  return valor;
}

export function calcularQuantidadeEstimada(
  dados: Pick<
    DadosDemanda,
    | 'metodo_estimativa'
    | 'quantidade'
    | 'pessoas_estimadas'
    | 'dias_estimados'
    | 'consumo_pessoa_dia'
    | 'horas_motor_dia'
    | 'consumo_litros_hora'
    | 'margem_percentual'
  >,
): number {
  if (
    dados.metodo_estimativa === 'manual'
  ) {
    return arredondarDuasCasas(
      validarNumeroPositivo(
        dados.quantidade,
        'Informe uma quantidade válida.',
      ),
    );
  }

  if (
    dados.metodo_estimativa ===
    'pessoa_dia'
  ) {
    const pessoas =
      validarNumeroPositivo(
        dados.pessoas_estimadas,
        'Informe a quantidade estimada de pessoas.',
      );

    const dias =
      validarNumeroPositivo(
        dados.dias_estimados,
        'Informe a quantidade estimada de dias.',
      );

    const consumo =
      validarNumeroPositivo(
        dados.consumo_pessoa_dia,
        'Informe o consumo previsto por pessoa e por dia.',
      );

    return arredondarDuasCasas(
      pessoas * dias * consumo,
    );
  }

  const dias =
    validarNumeroPositivo(
      dados.dias_estimados,
      'Informe a quantidade estimada de dias.',
    );

  const horas =
    validarNumeroPositivo(
      dados.horas_motor_dia,
      'Informe as horas previstas de funcionamento do motor por dia.',
    );

  if (horas > 24) {
    throw new ErroDemandas(
      'As horas de motor por dia não podem ultrapassar 24.',
    );
  }

  const litrosHora =
    validarNumeroPositivo(
      dados.consumo_litros_hora,
      'Informe o consumo médio do motor em litros por hora.',
    );

  if (
    !Number.isFinite(
      dados.margem_percentual,
    ) ||
    dados.margem_percentual < 0 ||
    dados.margem_percentual > 100
  ) {
    throw new ErroDemandas(
      'A margem de segurança deve ficar entre 0% e 100%.',
    );
  }

  const base =
    dias * horas * litrosHora;

  return arredondarDuasCasas(
    base *
      (1 +
        dados.margem_percentual /
          100),
  );
}

export function validarDadosDemanda(
  dados: DadosDemanda,
): DadosDemanda {
  const titulo = dados.titulo.trim();

  const descricao =
    dados.descricao?.trim() || null;

  const localidade =
    dados.localidade.trim();

  const unidade = dados.unidade.trim();

  const inicio =
    dados.data_inicio?.trim() || null;

  const fim =
    dados.data_fim?.trim() || null;

  if (
    tamanhoTexto(titulo) < 3 ||
    tamanhoTexto(titulo) > 160
  ) {
    throw new ErroDemandas(
      'O título deve ter entre 3 e 160 caracteres.',
    );
  }

  if (
    descricao &&
    tamanhoTexto(descricao) > 5000
  ) {
    throw new ErroDemandas(
      'A descrição deve ter até 5.000 caracteres.',
    );
  }

  if (
    !ehCategoriaDemanda(
      dados.categoria,
    )
  ) {
    throw new ErroDemandas(
      'Selecione uma categoria válida.',
    );
  }

  if (
    !ehStatusDemanda(dados.status)
  ) {
    throw new ErroDemandas(
      'Selecione uma situação válida.',
    );
  }

  if (
    !ehMetodoEstimativa(
      dados.metodo_estimativa,
    )
  ) {
    throw new ErroDemandas(
      'O método de estimativa informado é inválido.',
    );
  }

  if (
    tamanhoTexto(localidade) < 2 ||
    tamanhoTexto(localidade) > 200
  ) {
    throw new ErroDemandas(
      'A localidade deve ter entre 2 e 200 caracteres.',
    );
  }

  if (
    tamanhoTexto(unidade) < 1 ||
    tamanhoTexto(unidade) > 40
  ) {
    throw new ErroDemandas(
      'A unidade deve ter entre 1 e 40 caracteres.',
    );
  }

  if (
    (inicio === null) !==
    (fim === null)
  ) {
    throw new ErroDemandas(
      'Informe as duas datas do período ou deixe ambas vazias.',
    );
  }

  if (
    inicio !== null &&
    fim !== null
  ) {
    if (
      !dataValida(inicio) ||
      !dataValida(fim)
    ) {
      throw new ErroDemandas(
        'Informe datas válidas.',
      );
    }

    if (fim < inicio) {
      throw new ErroDemandas(
        'A data final não pode ser anterior à data inicial.',
      );
    }
  }

  const metodoEsperado =
    metodoEstimativaDaCategoria(
      dados.categoria,
    );

  if (
    dados.metodo_estimativa !==
    metodoEsperado
  ) {
    throw new ErroDemandas(
      'O método de estimativa não corresponde à categoria selecionada.',
    );
  }

  let publicoAlvo:
    | PublicoAlvo
    | null = null;

  let pessoasEstimadas:
    | number
    | null = null;

  let diasEstimados:
    | number
    | null = null;

  let consumoPessoaDia:
    | number
    | null = null;

  let tipoCombustivel:
    | TipoCombustivel
    | null = null;

  let horasMotorDia:
    | number
    | null = null;

  let consumoLitrosHora:
    | number
    | null = null;

  let margemPercentual = 0;

  if (
    metodoEsperado ===
    'pessoa_dia'
  ) {
    if (
      dados.publico_alvo === null ||
      !ehPublicoAlvo(
        dados.publico_alvo,
      ) ||
      dados.publico_alvo ===
        'operacao'
    ) {
      throw new ErroDemandas(
        'Selecione quem será atendido por esta demanda.',
      );
    }

    publicoAlvo =
      dados.publico_alvo;

    pessoasEstimadas =
      validarNumeroPositivo(
        dados.pessoas_estimadas,
        'Informe a quantidade estimada de pessoas.',
      );

    diasEstimados =
      validarNumeroPositivo(
        dados.dias_estimados,
        'Informe a quantidade estimada de dias.',
      );

    consumoPessoaDia =
      validarNumeroPositivo(
        dados.consumo_pessoa_dia,
        'Informe o consumo previsto por pessoa e por dia.',
      );
  }

  if (
    metodoEsperado ===
    'combustivel_hora'
  ) {
    if (
      dados.tipo_combustivel ===
        null ||
      !ehTipoCombustivel(
        dados.tipo_combustivel,
      )
    ) {
      throw new ErroDemandas(
        'Selecione o tipo de combustível.',
      );
    }

    publicoAlvo = 'operacao';

    tipoCombustivel =
      dados.tipo_combustivel;

    diasEstimados =
      validarNumeroPositivo(
        dados.dias_estimados,
        'Informe a quantidade estimada de dias.',
      );

    horasMotorDia =
      validarNumeroPositivo(
        dados.horas_motor_dia,
        'Informe as horas de funcionamento do motor por dia.',
      );

    if (horasMotorDia > 24) {
      throw new ErroDemandas(
        'As horas de motor por dia não podem ultrapassar 24.',
      );
    }

    consumoLitrosHora =
      validarNumeroPositivo(
        dados.consumo_litros_hora,
        'Informe o consumo médio do motor em litros por hora.',
      );

    if (
      !Number.isFinite(
        dados.margem_percentual,
      ) ||
      dados.margem_percentual <
        0 ||
      dados.margem_percentual >
        100
    ) {
      throw new ErroDemandas(
        'A margem de segurança deve ficar entre 0% e 100%.',
      );
    }

    margemPercentual =
      dados.margem_percentual;
  }

  const quantidade =
    calcularQuantidadeEstimada({
      ...dados,
      pessoas_estimadas:
        pessoasEstimadas,
      dias_estimados:
        diasEstimados,
      consumo_pessoa_dia:
        consumoPessoaDia,
      horas_motor_dia:
        horasMotorDia,
      consumo_litros_hora:
        consumoLitrosHora,
      margem_percentual:
        margemPercentual,
    });

  if (
    !Number.isFinite(quantidade) ||
    quantidade <= 0 ||
    quantidade >
      9_999_999_999.99
  ) {
    throw new ErroDemandas(
      'A quantidade estimada ultrapassa o limite permitido.',
    );
  }

  return {
    titulo,
    descricao,
    categoria: dados.categoria,
    localidade,

    data_inicio: inicio,
    data_fim: fim,

    quantidade,
    unidade,
    status: dados.status,

    metodo_estimativa:
      metodoEsperado,

    publico_alvo:
      publicoAlvo,

    pessoas_estimadas:
      pessoasEstimadas,

    dias_estimados:
      diasEstimados,

    consumo_pessoa_dia:
      consumoPessoaDia,

    tipo_combustivel:
      tipoCombustivel,

    horas_motor_dia:
      horasMotorDia,

    consumo_litros_hora:
      consumoLitrosHora,

    margem_percentual:
      margemPercentual,
  };
}

function exigirGerenciamento(
  contexto: ContextoDemandas,
): void {
  if (
    !contexto.empresa_id ||
    !contexto.usuario_id ||
    !contexto.pode_gerenciar
  ) {
    throw new ErroDemandas(
      'Seu perfil não possui permissão para gerenciar demandas.',
    );
  }
}

function podeTransicionarStatus(
  atual: StatusDemanda,
  proximo: StatusDemanda,
): boolean {
  if (atual === proximo) {
    return true;
  }

  if (atual === 'rascunho') {
    return (
      proximo === 'aberta' ||
      proximo === 'cancelada'
    );
  }

  if (atual === 'aberta') {
    return (
      proximo === 'encerrada' ||
      proximo === 'cancelada'
    );
  }

  return false;
}

export async function obterContextoDemandas(
  signal?: AbortSignal,
): Promise<ContextoDemandas> {
  const {
    data: { user },
    error: erroUsuario,
  } = await supabase.auth.getUser();

  if (erroUsuario) {
    throw erroUsuario;
  }

  if (!user) {
    throw new ErroDemandas(
      'Sua sessão não está disponível. Entre novamente.',
    );
  }

  let consulta = supabase
    .from('perfis')
    .select('id,empresa_id,role')
    .eq('id', user.id);

  if (signal) {
    consulta =
      consulta.abortSignal(signal);
  }

  const { data, error } =
    await consulta.maybeSingle();

  if (error) {
    throw error;
  }

  const perfil: unknown = data;

  if (
    !ehObjeto(perfil) ||
    perfil.id !== user.id ||
    !ehTexto(perfil.empresa_id) ||
    !perfil.empresa_id ||
    !ehTextoOuNulo(perfil.role)
  ) {
    throw new ErroDemandas(
      'Não foi possível identificar seu vínculo com uma empresa.',
    );
  }

  return {
    usuario_id: user.id,
    empresa_id: perfil.empresa_id,
    papel: perfil.role,
    pode_gerenciar:
      perfil.role ===
        'admin_empresa' ||
      perfil.role ===
        'operador_empresa',
  };
}

export async function listarDemandas(
  contexto: ContextoDemandas,
  filtros: FiltrosDemandas = {},
  signal?: AbortSignal,
): Promise<PaginaDemandas> {
  const pagina = filtros.pagina ?? 0;

  if (
    !Number.isSafeInteger(pagina) ||
    pagina < 0 ||
    !Number.isSafeInteger(
      (pagina + 1) *
        TAMANHO_PAGINA_DEMANDAS,
    )
  ) {
    throw new ErroDemandas(
      'Página inválida.',
    );
  }

  if (!contexto.empresa_id) {
    throw new ErroDemandas(
      'Empresa não identificada.',
    );
  }

  if (
    filtros.categoria &&
    !ehCategoriaDemanda(
      filtros.categoria,
    )
  ) {
    throw new ErroDemandas(
      'Categoria de pesquisa inválida.',
    );
  }

  if (
    filtros.status &&
    !ehStatusDemanda(
      filtros.status,
    )
  ) {
    throw new ErroDemandas(
      'Situação de pesquisa inválida.',
    );
  }

  const inicio =
    pagina *
    TAMANHO_PAGINA_DEMANDAS;

  const fim =
    inicio +
    TAMANHO_PAGINA_DEMANDAS -
    1;

  let consulta = supabase
    .from('demandas')
    .select(CAMPOS_DEMANDA, {
      count: 'exact',
    })
    .eq(
      'empresa_id',
      contexto.empresa_id,
    )
    .order('created_at', {
      ascending: false,
    })
    .order('id', {
      ascending: false,
    });

  const busca =
    filtros.busca?.trim();

  if (busca) {
    if (
      tamanhoTexto(busca) > 160
    ) {
      throw new ErroDemandas(
        'A pesquisa deve ter até 160 caracteres.',
      );
    }

    const termo = busca.replace(
      /[\\%_]/g,
      '\\$&',
    );

    consulta = consulta.ilike(
      'titulo',
      `%${termo}%`,
    );
  }

  if (filtros.categoria) {
    consulta = consulta.eq(
      'categoria',
      filtros.categoria,
    );
  }

  if (filtros.status) {
    consulta = consulta.eq(
      'status',
      filtros.status,
    );
  }

  consulta =
    consulta.range(inicio, fim);

  if (signal) {
    consulta =
      consulta.abortSignal(signal);
  }

  const {
    data,
    error,
    count,
  } = await consulta;

  if (error) {
    throw error;
  }

  const resposta: unknown = data;

  if (
    !Array.isArray(resposta) ||
    typeof count !== 'number' ||
    !Number.isSafeInteger(count) ||
    count < 0
  ) {
    throw new ErroDemandas(
      'Não foi possível interpretar a listagem de demandas.',
    );
  }

  const registros =
    resposta.map(
      interpretarDemanda,
    );

  if (
    registros.some(
      (demanda) =>
        demanda.empresa_id !==
        contexto.empresa_id,
    )
  ) {
    throw new ErroDemandas(
      'A resposta não corresponde à empresa consultada.',
    );
  }

  return {
    registros,
    total: count,
    pagina,
    tamanho_pagina:
      TAMANHO_PAGINA_DEMANDAS,
    total_paginas: Math.ceil(
      count /
        TAMANHO_PAGINA_DEMANDAS,
    ),
  };
}

export async function obterDemandaPorId(
  contexto: ContextoDemandas,
  id: string,
  signal?: AbortSignal,
): Promise<Demanda> {
  if (!id.trim()) {
    throw new ErroDemandas(
      'Demanda não identificada.',
    );
  }

  if (!contexto.empresa_id) {
    throw new ErroDemandas(
      'Empresa não identificada.',
    );
  }

  let consulta = supabase
    .from('demandas')
    .select(CAMPOS_DEMANDA)
    .eq('id', id)
    .eq(
      'empresa_id',
      contexto.empresa_id,
    );

  if (signal) {
    consulta =
      consulta.abortSignal(signal);
  }

  const {
    data,
    error,
  } = await consulta.maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new ErroDemandas(
      'A demanda não foi encontrada ou não pertence à sua empresa.',
    );
  }

  return interpretarDemanda(data);
}

export async function criarDemanda(
  contexto: ContextoDemandas,
  dados: DadosDemanda,
): Promise<Demanda> {
  exigirGerenciamento(contexto);

  const campos =
    validarDadosDemanda(dados);

  const {
    data,
    error,
  } = await supabase
    .from('demandas')
    .insert({
      ...campos,
      empresa_id:
        contexto.empresa_id,
    })
    .select(CAMPOS_DEMANDA)
    .single();

  if (error) {
    throw error;
  }

  return interpretarDemanda(data);
}

export async function atualizarDemanda(
  contexto: ContextoDemandas,
  id: string,
  dados: DadosDemanda,
): Promise<Demanda> {
  exigirGerenciamento(contexto);

  if (!id.trim()) {
    throw new ErroDemandas(
      'Demanda não identificada.',
    );
  }

  const atual =
    await obterDemandaPorId(
      contexto,
      id,
    );

  if (
    !podeTransicionarStatus(
      atual.status,
      dados.status,
    )
  ) {
    throw new ErroDemandas(
      `Não é permitido alterar uma demanda ${STATUS_DEMANDA[atual.status].toLowerCase()} para ${STATUS_DEMANDA[dados.status].toLowerCase()}.`,
    );
  }

  const campos =
    validarDadosDemanda(dados);

  const {
    data,
    error,
  } = await supabase
    .from('demandas')
    .update(campos)
    .eq('id', id)
    .eq(
      'empresa_id',
      contexto.empresa_id,
    )
    .select(CAMPOS_DEMANDA)
    .single();

  if (error) {
    throw error;
  }

  return interpretarDemanda(data);
}

export async function excluirDemanda(
  contexto: ContextoDemandas,
  id: string,
): Promise<void> {
  exigirGerenciamento(contexto);

  if (!id.trim()) {
    throw new ErroDemandas(
      'Demanda não identificada.',
    );
  }

  const atual =
    await obterDemandaPorId(
      contexto,
      id,
    );

  if (
    atual.status !== 'rascunho' &&
    atual.status !== 'cancelada'
  ) {
    throw new ErroDemandas(
      'Somente demandas em rascunho ou canceladas podem ser excluídas. Demandas abertas ou encerradas devem permanecer no histórico da operação.',
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from('demandas')
    .delete()
    .eq('id', id)
    .eq(
      'empresa_id',
      contexto.empresa_id,
    )
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  const resultado: unknown = data;

  if (
    !ehObjeto(resultado) ||
    resultado.id !== id
  ) {
    throw new ErroDemandas(
      'Não foi possível confirmar a exclusão da demanda.',
    );
  }
}

export function mensagemErroDemandas(
  erro: unknown,
): string {
  if (
    erro instanceof ErroDemandas
  ) {
    return erro.message;
  }

  if (ehObjeto(erro)) {
    switch (erro.code) {
      case '42501':
        return 'Seu acesso não permite esta operação. Atualize a página para verificar suas permissões.';

      case 'PGRST116':
        return 'O registro não está disponível. Ele pode ter sido removido ou seu acesso pode ter mudado.';

      case '23514':
      case '23502':
      case '22003':
      case '22007':
      case '22008':
        return 'Revise os campos informados e tente novamente.';

      case '23503':
        return 'Não foi possível concluir a operação por causa de um vínculo entre registros.';
    }
  }

  return 'Não foi possível concluir a solicitação. Confira sua conexão e tente novamente.';
}
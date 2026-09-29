import { supabase } from '@/lib/supabase';

export const CATEGORIAS_DEMANDA = {
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

export type CategoriaDemanda = keyof typeof CATEGORIAS_DEMANDA;
export type StatusDemanda = keyof typeof STATUS_DEMANDA;

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
};

export type DadosDemanda = Pick<
  Demanda,
  | 'titulo'
  | 'descricao'
  | 'categoria'
  | 'localidade'
  | 'data_inicio'
  | 'data_fim'
  | 'quantidade'
  | 'unidade'
  | 'status'
>;

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

const CAMPOS_DEMANDA = [
  'id',
  'empresa_id',
  'criado_por',
  'created_at',
  'titulo',
  'descricao',
  'categoria',
  'localidade',
  'data_inicio',
  'data_fim',
  'quantidade',
  'unidade',
  'status',
].join(',');

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

function ehTexto(valor: unknown): valor is string {
  return typeof valor === 'string';
}

function ehTextoOuNulo(
  valor: unknown,
): valor is string | null {
  return valor === null || ehTexto(valor);
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

function ehDemanda(valor: unknown): valor is Demanda {
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
    ehStatusDemanda(valor.status)
  );
}

function interpretarDemanda(valor: unknown): Demanda {
  if (!ehDemanda(valor)) {
    throw new ErroDemandas(
      'A demanda recebida possui dados inesperados. Atualize a página e tente novamente.',
    );
  }

  return valor;
}

function dataValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }

  const data = new Date(`${valor}T00:00:00.000Z`);

  return (
    Number.isFinite(data.getTime()) &&
    data.toISOString().slice(0, 10) === valor
  );
}

function tamanhoTexto(valor: string): number {
  return Array.from(valor).length;
}

export function validarDadosDemanda(
  dados: DadosDemanda,
): DadosDemanda {
  const titulo = dados.titulo.trim();
  const descricao = dados.descricao?.trim() || null;
  const localidade = dados.localidade.trim();
  const unidade = dados.unidade.trim();

  const inicio = dados.data_inicio?.trim() || null;
  const fim = dados.data_fim?.trim() || null;

  if (
    tamanhoTexto(titulo) < 3 ||
    tamanhoTexto(titulo) > 160
  ) {
    throw new ErroDemandas(
      'O título deve ter entre 3 e 160 caracteres.',
    );
  }

  if (descricao && tamanhoTexto(descricao) > 5000) {
    throw new ErroDemandas(
      'A descrição deve ter até 5.000 caracteres.',
    );
  }

  if (!ehCategoriaDemanda(dados.categoria)) {
    throw new ErroDemandas('Selecione uma categoria válida.');
  }

  if (!ehStatusDemanda(dados.status)) {
    throw new ErroDemandas('Selecione uma situação válida.');
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
    typeof dados.quantidade !== 'number' ||
    !Number.isFinite(dados.quantidade) ||
    dados.quantidade <= 0 ||
    dados.quantidade > 9_999_999_999.99 ||
    Math.round(dados.quantidade * 100) / 100 !==
      dados.quantidade
  ) {
    throw new ErroDemandas(
      'Informe uma quantidade positiva, com até duas casas decimais e no máximo 9.999.999.999,99.',
    );
  }

  if ((inicio === null) !== (fim === null)) {
    throw new ErroDemandas(
      'Informe as duas datas do período ou deixe ambas vazias.',
    );
  }

  if (inicio !== null && fim !== null) {
    if (!dataValida(inicio) || !dataValida(fim)) {
      throw new ErroDemandas('Informe datas válidas.');
    }

    if (fim < inicio) {
      throw new ErroDemandas(
        'A data final não pode ser anterior à data inicial.',
      );
    }
  }

  // Envia somente os campos editáveis.
  return {
    titulo,
    descricao,
    categoria: dados.categoria,
    localidade,
    data_inicio: inicio,
    data_fim: fim,
    quantidade: dados.quantidade,
    unidade,
    status: dados.status,
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

  // Aplica o sinal antes de finalizar com maybeSingle().
  if (signal) {
    consulta = consulta.abortSignal(signal);
  }

  const { data, error } = await consulta.maybeSingle();

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
      perfil.role === 'admin_empresa' ||
      perfil.role === 'operador_empresa',
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
      (pagina + 1) * TAMANHO_PAGINA_DEMANDAS,
    )
  ) {
    throw new ErroDemandas('Página inválida.');
  }

  if (!contexto.empresa_id) {
    throw new ErroDemandas('Empresa não identificada.');
  }

  if (
    filtros.categoria &&
    !ehCategoriaDemanda(filtros.categoria)
  ) {
    throw new ErroDemandas(
      'Categoria de pesquisa inválida.',
    );
  }

  if (
    filtros.status &&
    !ehStatusDemanda(filtros.status)
  ) {
    throw new ErroDemandas(
      'Situação de pesquisa inválida.',
    );
  }

  const inicio = pagina * TAMANHO_PAGINA_DEMANDAS;
  const fim = inicio + TAMANHO_PAGINA_DEMANDAS - 1;

  let consulta = supabase
    .from('demandas')
    .select(CAMPOS_DEMANDA, { count: 'exact' })
    .eq('empresa_id', contexto.empresa_id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  const busca = filtros.busca?.trim();

  if (busca) {
    if (tamanhoTexto(busca) > 160) {
      throw new ErroDemandas(
        'A pesquisa deve ter até 160 caracteres.',
      );
    }

    // Escapa barra invertida, percentual e sublinhado.
    const termo = busca.replace(/[\\%_]/g, '\\$&');

    consulta = consulta.ilike('titulo', `%${termo}%`);
  }

  if (filtros.categoria) {
    consulta = consulta.eq(
      'categoria',
      filtros.categoria,
    );
  }

  if (filtros.status) {
    consulta = consulta.eq('status', filtros.status);
  }

  consulta = consulta.range(inicio, fim);

  if (signal) {
    consulta = consulta.abortSignal(signal);
  }

  const { data, error, count } = await consulta;

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

  const registros = resposta.map(interpretarDemanda);

  if (
    registros.some(
      (demanda) =>
        demanda.empresa_id !== contexto.empresa_id,
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
    tamanho_pagina: TAMANHO_PAGINA_DEMANDAS,
    total_paginas: Math.ceil(
      count / TAMANHO_PAGINA_DEMANDAS,
    ),
  };
}

export async function criarDemanda(
  contexto: ContextoDemandas,
  dados: DadosDemanda,
): Promise<Demanda> {
  exigirGerenciamento(contexto);

  const campos = validarDadosDemanda(dados);

  const { data, error } = await supabase
    .from('demandas')
    .insert({
      ...campos,
      empresa_id: contexto.empresa_id,
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
    throw new ErroDemandas('Demanda não identificada.');
  }

  const campos = validarDadosDemanda(dados);

  const { data, error } = await supabase
    .from('demandas')
    .update(campos)
    .eq('id', id)
    .eq('empresa_id', contexto.empresa_id)
    .select(CAMPOS_DEMANDA)
    .single();

  if (error) {
    throw error;
  }

  // Zero linhas afetadas não será tratado como sucesso.
  return interpretarDemanda(data);
}

export async function excluirDemanda(
  contexto: ContextoDemandas,
  id: string,
): Promise<void> {
  exigirGerenciamento(contexto);

  if (!id.trim()) {
    throw new ErroDemandas('Demanda não identificada.');
  }

  const { data, error } = await supabase
    .from('demandas')
    .delete()
    .eq('id', id)
    .eq('empresa_id', contexto.empresa_id)
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  const resultado: unknown = data;

  if (!ehObjeto(resultado) || resultado.id !== id) {
    throw new ErroDemandas(
      'Não foi possível confirmar a exclusão da demanda.',
    );
  }
}

export function mensagemErroDemandas(
  erro: unknown,
): string {
  if (erro instanceof ErroDemandas) {
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
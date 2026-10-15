import { supabase } from '@/lib/supabase';

export const CATEGORIAS_ITEM = {
  alimentacao: 'Alimentação',
  bebidas: 'Bebidas e gelo',
  limpeza: 'Limpeza e higiene',
  combustivel: 'Combustível',
  equipamentos: 'Equipamentos e materiais',
  outros: 'Outros',
} as const;

export const SITUACOES_ITEM = {
  pendente: 'Pendente',
  em_separacao: 'Em separação',
  atendido: 'Atendido',
} as const;

export type CategoriaItem = keyof typeof CATEGORIAS_ITEM;
export type SituacaoItem = keyof typeof SITUACOES_ITEM;

export type ItemDemanda = {
  descricao: string;
  categoria: CategoriaItem;
  quantidade: string;
  unidade: string;
  preco_unitario_estimado: string;
  situacao: SituacaoItem;
  observacoes: string;
};

type ItemBanco = {
  descricao: string;
  categoria: CategoriaItem;
  quantidade: number | string;
  unidade: string;
  preco_unitario_estimado: number | string | null;
  situacao: SituacaoItem;
  observacoes: string | null;
  ordem: number;
};

export function novoItemDemanda(): ItemDemanda {
  return {
    descricao: '',
    categoria: 'outros',
    quantidade: '1',
    unidade: 'unidade',
    preco_unitario_estimado: '',
    situacao: 'pendente',
    observacoes: '',
  };
}

export function numeroItem(
  texto: string,
  casas: number,
): number | null {
  const valor = texto.trim().replace(',', '.');
  const padrao = new RegExp(`^\\d+(?:\\.\\d{1,${casas}})?$`);

  if (!padrao.test(valor)) return null;

  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function prepararItem(item: ItemDemanda, indice: number) {
  const prefixo = `Item ${indice + 1}`;
  const descricao = item.descricao.trim();
  const unidade = item.unidade.trim();
  const quantidade = numeroItem(item.quantidade, 3);
  const precoTexto = item.preco_unitario_estimado.trim();
  const preco = precoTexto ? numeroItem(precoTexto, 2) : null;

  if (descricao.length < 2 || descricao.length > 200) {
    throw new Error(`${prefixo}: a descrição deve ter de 2 a 200 caracteres.`);
  }

  if (!Object.prototype.hasOwnProperty.call(CATEGORIAS_ITEM, item.categoria)) {
    throw new Error(`${prefixo}: escolha uma categoria válida.`);
  }

  if (!unidade || unidade.length > 40) {
    throw new Error(`${prefixo}: informe uma unidade com até 40 caracteres.`);
  }

  if (
    quantidade === null ||
    quantidade <= 0 ||
    quantidade > 999999999.999
  ) {
    throw new Error(`${prefixo}: informe uma quantidade positiva com até 3 casas decimais.`);
  }

  if (
    precoTexto &&
    (preco === null || preco < 0 || preco > 9999999999.99)
  ) {
    throw new Error(`${prefixo}: informe um preço válido, sem separador de milhar e com até 2 casas decimais.`);
  }

  if (!Object.prototype.hasOwnProperty.call(SITUACOES_ITEM, item.situacao)) {
    throw new Error(`${prefixo}: escolha uma situação válida.`);
  }

  if (item.observacoes.length > 2000) {
    throw new Error(`${prefixo}: as observações permitem até 2.000 caracteres.`);
  }

  return {
    descricao,
    categoria: item.categoria,
    quantidade,
    unidade,
    preco_unitario_estimado: preco,
    situacao: item.situacao,
    observacoes: item.observacoes.trim() || null,
  };
}

export async function carregarItensDemanda(
  demandaId: string,
  signal?: AbortSignal,
): Promise<{ versao: number; itens: ItemDemanda[] }> {
  // Uma consulta obtém a versão e os itens do mesmo recorte do banco.
  let consulta = supabase
    .from('demandas')
    .select(
      'id,itens_versao,demanda_itens(descricao,categoria,quantidade,unidade,preco_unitario_estimado,situacao,observacoes,ordem)',
    )
    .eq('id', demandaId);

  if (signal) consulta = consulta.abortSignal(signal);

  const { data, error } = await consulta.single();

  if (error || !data) {
    throw new Error('Não foi possível carregar a lista. Confira sua conexão e seu acesso.');
  }

  if (!Number.isInteger(data.itens_versao) || data.itens_versao < 0) {
    throw new Error('A versão da lista é inválida. Atualize a página.');
  }

  if (!Array.isArray(data.demanda_itens)) {
    throw new Error('A consulta retornou uma lista inválida.');
  }

  const registros = data.demanda_itens as unknown as ItemBanco[];

  if (registros.length > 200) {
    throw new Error('Esta lista excede o limite de 200 itens.');
  }

  return {
    versao: data.itens_versao,
    itens: [...registros]
      .sort((a, b) => a.ordem - b.ordem)
      .map((item) => ({
        descricao: item.descricao,
        categoria: item.categoria,
        quantidade: String(item.quantidade),
        unidade: item.unidade,
        preco_unitario_estimado:
          item.preco_unitario_estimado === null
            ? ''
            : String(item.preco_unitario_estimado),
        situacao: item.situacao,
        observacoes: item.observacoes ?? '',
      })),
  };
}

export async function salvarItensDemanda(
  demandaId: string,
  versao: number,
  itens: ItemDemanda[],
): Promise<number> {
  if (!Number.isInteger(versao) || versao < 0) {
    throw new Error('Recarregue a lista antes de salvar.');
  }

  if (itens.length > 200) {
    throw new Error('Cada demanda permite até 200 itens.');
  }

  const preparados = itens.map(prepararItem);

  const { data, error } = await supabase.rpc(
    'ern_salvar_demanda_itens',
    {
      p_demanda_id: demandaId,
      p_versao: versao,
      p_itens: preparados,
    },
  );

  if (error) {
    if (error.message.includes('alterada por outro acesso')) {
      throw new Error(
        'Outro acesso alterou esta lista. Preserve suas anotações e recarregue antes de salvar novamente.',
      );
    }

    if (error.message.includes('encerradas ou canceladas')) {
      throw new Error('A demanda foi encerrada ou cancelada. A lista não pode ser alterada.');
    }

    throw new Error(
      'Não foi possível confirmar o salvamento. Confira sua conexão e recarregue a lista antes de tentar novamente.',
    );
  }

  if (!Number.isInteger(data) || data !== versao + 1) {
    throw new Error('O salvamento retornou uma versão inesperada. Recarregue a lista.');
  }

  return data;
}
import { supabase } from '@/lib/supabase';
import {
  validarDadosDemanda,
  type ContextoDemandas,
  type DadosDemanda,
} from '@/lib/demandas';
import {
  prepararItem,
  type ItemDemanda,
} from '@/lib/itensDemanda';

export async function criarDemandaComItens(
  contexto: ContextoDemandas,
  dados: DadosDemanda,
  itens: ItemDemanda[],
): Promise<{ id: string }> {
  if (!contexto.pode_gerenciar) {
    throw new Error('Seu perfil não permite criar demandas.');
  }

  if (itens.length > 200) {
    throw new Error('Cada demanda permite até 200 itens.');
  }

  const campos = validarDadosDemanda(dados);
  const materiais = itens.map(prepararItem);

  const { data, error } = await supabase.rpc(
    'ern_criar_demanda_com_itens',
    {
      p_dados: campos,
      p_itens: materiais,
    },
  );

  if (error) {
    throw new Error(
      'Não foi possível confirmar a criação da demanda. ' +
      'Confira sua conexão e verifique a listagem antes de tentar novamente.',
    );
  }

  if (
    !data ||
    typeof data !== 'object' ||
    typeof data.id !== 'string'
  ) {
    throw new Error(
      'A criação retornou uma resposta inesperada. Confira a listagem antes de tentar novamente.',
    );
  }

  return { id: data.id };
}
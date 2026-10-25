import { supabase } from '@/lib/supabase';

type LinhaERN = Record<string, unknown>;
type FinalidadeERN = 'referencias' | 'analise';

export type ReferenciaReservaFinanceiroERN = {
  id: string;
  cliente: string | null;
  pacote: string | null;
  data_reserva: string;
  status: string | null;
  valor_total: string | number | null;
};

export type ReservaAnaliseFinanceiroERN = {
  id: string;
  empresa_id: string;
  data_reserva: string | null;
  data: string | null;
  valor_total: string | number | null;
  valor: string | number | null;
  quantidade_pessoas: number | null;
  status: string | null;
};

function objetoERN(valor: unknown): valor is LinhaERN {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

function textoERN(linha: LinhaERN, campo: string): string | null {
  const valor = linha[campo];
  if (valor === null || typeof valor === 'string') return valor;
  throw new Error('A consulta retornou um campo de texto inválido.');
}

function identificadorERN(valor: unknown): string {
  if (
    typeof valor !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor)
  ) {
    throw new Error('A consulta retornou uma identificação inválida.');
  }
  return valor;
}

function valorERN(linha: LinhaERN, campo: string): string | number | null {
  const valor = linha[campo];
  if (
    valor === null ||
    typeof valor === 'string' ||
    (typeof valor === 'number' && Number.isFinite(valor))
  ) return valor;
  throw new Error('A consulta retornou um valor inválido.');
}

async function consultarERN(
  empresaEsperada: string,
  finalidade: FinalidadeERN,
  reservaId: string | null = null,
): Promise<LinhaERN[]> {
  identificadorERN(empresaEsperada);
  if (reservaId !== null) identificadorERN(reservaId);

  const { data, error } = await supabase.rpc('ern_reservas_financeiro', {
    p_finalidade: finalidade,
    p_reserva_id: reservaId,
  });

  if (error) {
    if (error.code === '42501') {
      throw new Error('Seu perfil ou plano não permite esta consulta.');
    }
    if (error.code === '22023') {
      throw new Error('O volume de reservas exige filtros no servidor. Nenhum total parcial será apresentado.');
    }
    throw new Error('Não foi possível consultar as referências de reservas. Tente novamente.');
  }

  const resposta: unknown = data;
  if (
    !objetoERN(resposta) ||
    resposta.empresa_id !== empresaEsperada ||
    resposta.finalidade !== finalidade ||
    typeof resposta.total !== 'number' ||
    !Number.isSafeInteger(resposta.total) ||
    resposta.total < 0 ||
    resposta.total > 10000 ||
    !Array.isArray(resposta.registros) ||
    resposta.registros.length !== resposta.total
  ) {
    throw new Error('A consulta retornou dados inconsistentes. Recarregue a página para confirmar seu vínculo.');
  }

  const registros: LinhaERN[] = [];
  const ids = new Set<string>();

  for (const linha of resposta.registros) {
    if (!objetoERN(linha)) throw new Error('Referência de reserva inválida.');
    const id = identificadorERN(linha.id);
    if (ids.has(id) || (reservaId !== null && id !== reservaId)) {
      throw new Error('A consulta retornou referências inconsistentes.');
    }
    if (finalidade === 'analise' && linha.empresa_id !== empresaEsperada) {
      throw new Error('A consulta retornou uma reserva de outra empresa.');
    }
    ids.add(id);
    registros.push(linha);
  }

  return registros;
}

export async function consultarReferenciasReservasFinanceiroERN(
  empresaId: string,
  reservaId: string | null = null,
): Promise<ReferenciaReservaFinanceiroERN[]> {
  const registros = await consultarERN(empresaId, 'referencias', reservaId);
  return registros.map((linha) => ({
    id: identificadorERN(linha.id),
    cliente: textoERN(linha, 'cliente'),
    pacote: textoERN(linha, 'pacote'),
    data_reserva: textoERN(linha, 'data_reserva') ?? '',
    status: textoERN(linha, 'status'),
    valor_total: valorERN(linha, 'valor_total'),
  }));
}

export async function consultarReservasAnaliseFinanceiroERN(
  empresaId: string,
): Promise<ReservaAnaliseFinanceiroERN[]> {
  const registros = await consultarERN(empresaId, 'analise');
  return registros.map((linha) => {
    const pessoas = linha.quantidade_pessoas;
    if (pessoas !== null && (typeof pessoas !== 'number' || !Number.isFinite(pessoas))) {
      throw new Error('A consulta retornou uma quantidade de pessoas inválida.');
    }
    return {
      id: identificadorERN(linha.id),
      empresa_id: identificadorERN(linha.empresa_id),
      data_reserva: textoERN(linha, 'data_reserva'),
      data: textoERN(linha, 'data'),
      valor_total: valorERN(linha, 'valor_total'),
      valor: valorERN(linha, 'valor'),
      quantidade_pessoas: pessoas,
      status: textoERN(linha, 'status'),
    };
  });
}
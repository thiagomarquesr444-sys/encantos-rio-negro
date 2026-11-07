// EDA_PASSEIOS_PREMIUM_V2: agenda de saídas vista pela operadora (gestão).
// Fonte única para a página de passeios e para o cadastro/edição de reservas.
import { supabase } from '@/lib/supabase';

export type SaidaGestaoEDA = {
  id: string;
  passeio_id: string;
  data_inicio: string;
  data_fim: string | null;
  horario: string | null;
  vagas_total: number;
  status: 'aberta' | 'fechada' | 'cancelada';
  ocupadas: number;
  restantes: number;
};

export function hojeManausEDA() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Manaus' });
}

// ignorarReservaId: na edição, a própria reserva não conta como ocupação.
// incluirId: garante que a saída já vinculada apareça mesmo se passada/fechada.
export async function listarSaidasGestaoEDA(
  passeioId: string,
  opcoes: { ignorarReservaId?: string; incluirId?: string } = {},
) {
  let consulta = supabase
    .from('passeio_saidas')
    .select('id,passeio_id,data_inicio,data_fim,horario,vagas_total,status')
    .eq('passeio_id', passeioId)
    .order('data_inicio')
    .limit(60);

  consulta = opcoes.incluirId
    ? consulta.or(`data_inicio.gte.${hojeManausEDA()},id.eq.${opcoes.incluirId}`)
    : consulta.gte('data_inicio', hojeManausEDA());

  const { data: lista, error } = await consulta;
  if (error) throw new Error('Não foi possível carregar a agenda de saídas.');

  const ids = (lista ?? []).map((s) => s.id);
  const ocupacao = new Map<string, number>();

  if (ids.length) {
    const { data: reservas, error: erroRes } = await supabase
      .from('reservas')
      .select('id,saida_id,quantidade_pessoas,status')
      .in('saida_id', ids);
    if (erroRes) throw new Error('Não foi possível calcular a ocupação das saídas.');

    for (const r of reservas ?? []) {
      if (!r.saida_id || r.id === opcoes.ignorarReservaId) continue;
      if ((r.status ?? '').toLowerCase() === 'cancelada') continue;
      ocupacao.set(r.saida_id, (ocupacao.get(r.saida_id) ?? 0) + Math.max(r.quantidade_pessoas ?? 1, 1));
    }
  }

  return (lista ?? []).map((s) => {
    const ocupadas = ocupacao.get(s.id) ?? 0;
    return { ...s, ocupadas, restantes: Math.max(s.vagas_total - ocupadas, 0) } as SaidaGestaoEDA;
  });
}

// Traduz os bloqueios do banco para a operadora.
export function mensagemSaidaEDA(mensagem: string): string | null {
  const lotada = mensagem.match(/EDA_SAIDA_LOTADA: restam (\d+)/);
  if (lotada) {
    const n = Number(lotada[1]);
    return n > 0
      ? `Esta saída só tem ${n} vaga${n === 1 ? '' : 's'}. Reduza as pessoas ou escolha outra data.`
      : 'Esta saída está lotada. Escolha outra data ou abra uma nova saída no passeio.';
  }
  if (mensagem.includes('não está aberta para novas reservas')) {
    return 'Esta saída foi fechada ou cancelada. Escolha outra data.';
  }
  if (mensagem.includes('é de outro passeio')) {
    return 'A saída escolhida não pertence ao passeio selecionado.';
  }
  return null;
}

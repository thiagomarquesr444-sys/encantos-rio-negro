// EDA_RECURSOS_AGENDA_V1: agenda, conflitos e lotação de embarcações e guias.
import { supabase } from '@/lib/supabase';

export type TipoRecursoEDA = 'embarcacao' | 'guia';

export type ConflitoEDA = {
  recurso: TipoRecursoEDA; recurso_id: string; recurso_nome: string;
  reserva_id: string; reserva_cliente: string | null;
  outra_reserva_id: string; outra_cliente: string | null; outra_passeio: string | null;
  inicio: string; fim: string;
};

export type LotacaoEDA = { embarcacao_id: string; nome: string; capacidade: number; dia: string; pessoas: number };

export type AgendaRecursoEDA = {
  em_uso_hoje: boolean;
  itens: { reserva_id: string; cliente: string | null; passeio: string | null; inicio: string; fim: string;
    horario: string | null; pessoas: number; saida_id: string | null; status: string | null }[];
};

export type UsoHojeEDA = { recurso: TipoRecursoEDA; recurso_id: string; em_uso_hoje: boolean; proxima: string | null };

export async function conflitosEDA(reservaId?: string, dias = 30) {
  const { data, error } = await supabase.rpc('conflitos_recursos_eda', { p_reserva_id: reservaId ?? null, p_dias: dias });
  if (error) throw error;
  return (data ?? []) as ConflitoEDA[];
}

export async function lotacaoEDA(dias = 30) {
  const { data, error } = await supabase.rpc('lotacao_embarcacoes_eda', { p_dias: dias });
  if (error) throw error;
  return (data ?? []) as LotacaoEDA[];
}

export async function agendaRecursoEDA(tipo: TipoRecursoEDA, id: string, dias = 60) {
  const { data, error } = await supabase.rpc('agenda_recurso_eda', { p_tipo: tipo, p_id: id, p_dias: dias });
  if (error) throw error;
  return data as AgendaRecursoEDA;
}

export async function usoRecursosHojeEDA() {
  const { data, error } = await supabase.rpc('uso_recursos_hoje_eda');
  if (error) throw error;
  return (data ?? []) as UsoHojeEDA[];
}

// Agrupa dias seguidos de lotação em faixas legíveis.
export function faixasLotacao(lista: LotacaoEDA[]) {
  const faixas: { embarcacao_id: string; nome: string; capacidade: number; de: string; ate: string; pico: number }[] = [];
  for (const l of [...lista].sort((a, b) => a.embarcacao_id.localeCompare(b.embarcacao_id) || a.dia.localeCompare(b.dia))) {
    const ult = faixas[faixas.length - 1];
    const seguinte = ult && ult.embarcacao_id === l.embarcacao_id &&
      Date.parse(l.dia) - Date.parse(ult.ate) === 86_400_000;
    if (seguinte) { ult.ate = l.dia; ult.pico = Math.max(ult.pico, l.pessoas); }
    else faixas.push({ embarcacao_id: l.embarcacao_id, nome: l.nome, capacidade: l.capacidade, de: l.dia, ate: l.dia, pico: l.pessoas });
  }
  return faixas;
}

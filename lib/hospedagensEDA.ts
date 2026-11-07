// EDA_HOSPEDAGENS_PREMIUM_V1: acomodações, ocupação real e estadias da reserva.
import { supabase } from '@/lib/supabase';

export const TIPOS_ACOMODACAO = [
  ['quarto', 'Quarto'], ['suite', 'Suíte'], ['chale', 'Chalé'], ['cabine', 'Cabine (barco)'],
  ['redario', 'Redário'], ['dormitorio', 'Dormitório'], ['casa', 'Casa inteira'], ['barraca', 'Barraca/camping'],
] as const;

export type AcomodacaoEDA = {
  id: string; hospedagem_id: string; nome: string; tipo: string; capacidade: number;
  quantidade: number; valor_diaria: number | null; status: 'ativa' | 'manutencao' | 'inativa';
};

export type DisponibilidadeAcomodacaoEDA = {
  acomodacao_id: string; nome: string; tipo: string; capacidade: number; quantidade: number;
  valor_diaria: number | null; status: string; livres: number;
};

export type OcupacaoHospedagemEDA = {
  hospedagem_id: string; unidades: number; ocupadas: number; hospedes: number; proxima_entrada: string | null;
};

export type MapaHospedagemEDA = {
  noites: string[];
  acomodacoes: { id: string; nome: string; quantidade: number; status: string; ocupacao: number[] }[];
  estadias: { id: string; reserva_id: string; cliente: string | null; acomodacao: string; checkin: string; checkout: string; unidades: number; hospedes: number; status: string | null }[];
};

export type EstadiaReservaEDA = {
  id: string; acomodacao_id: string; checkin: string; checkout: string; unidades: number; hospedes: number;
  observacao: string | null;
  hospedagem_acomodacoes: { nome: string; hospedagens: { id: string; nome: string } | null } | null;
};

export function rotuloTipoAcomodacao(t: string) {
  return (TIPOS_ACOMODACAO.find(([v]) => v === t)?.[1]) ?? t;
}

export function somarDiasISO(iso: string, dias: number) {
  const [a, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d + dias));
  return dt.toISOString().slice(0, 10);
}

export function mensagemHospedagemEDA(erro: unknown): string {
  const m = (erro as { message?: string })?.message ?? '';
  const lotada = m.match(/EDA_HOSPEDAGEM_LOTADA: em (\S+) restam (\d+)/);
  if (lotada) return `Sem vaga suficiente: em ${lotada[1]} restam ${lotada[2]} unidade(s). Ajuste as datas ou escolha outra acomodação.`;
  const cap = m.match(/EDA_CAPACIDADE_ACOMODACAO: (.+)/);
  if (cap) return `Capacidade excedida: ${cap[1]} Aumente as unidades ou escolha uma acomodação maior.`;
  if (m.includes('manutenção ou inativa')) return 'Esta acomodação está em manutenção ou inativa.';
  if (m.includes('reserva_hosp_datas_check')) return 'O check-out precisa ser depois do check-in (até 90 noites).';
  if (m.includes('violates foreign key') || m.includes('foreign key')) return 'Esta acomodação tem estadias registradas. Inative-a em vez de excluir.';
  return 'Não foi possível concluir. Verifique a conexão e tente novamente.';
}

export async function listarOcupacaoHospedagensEDA() {
  const { data, error } = await supabase.rpc('ocupacao_hospedagens_eda', { p_data: null });
  if (error) throw error;
  return (data ?? []) as OcupacaoHospedagemEDA[];
}

export async function mapaHospedagemEDA(hospedagemId: string, de: string, dias = 14) {
  const { data, error } = await supabase.rpc('mapa_hospedagem_eda', { p_hospedagem_id: hospedagemId, p_de: de, p_dias: dias });
  if (error) throw error;
  return data as MapaHospedagemEDA;
}

export async function disponibilidadeHospedagemEDA(hospedagemId: string, checkin: string, checkout: string, ignorar?: string) {
  const { data, error } = await supabase.rpc('disponibilidade_hospedagem_eda', {
    p_hospedagem_id: hospedagemId, p_checkin: checkin, p_checkout: checkout, p_ignorar: ignorar ?? null,
  });
  if (error) throw error;
  return (data ?? []) as DisponibilidadeAcomodacaoEDA[];
}

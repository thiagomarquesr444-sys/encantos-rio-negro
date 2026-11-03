import { supabase } from '@/lib/supabase';

// ERN_RESERVA_CHEGADAS_V1
// Chegadas e transfers ligados à reserva (tabela public.reserva_chegadas).
// A empresa é definida pelo banco a partir da reserva; o navegador nunca envia empresa_id.

export type ModoChegada = 'voo_regular' | 'fretado' | 'barco' | 'carro' | 'outro';
export type SituacaoHorario = 'a_confirmar' | 'confirmado_cliente' | 'confirmado_companhia';
export type VeiculoTransfer = 'carro' | 'van' | 'caminhonete' | 'onibus' | 'barco' | 'outro';

export type ChegadaERN = {
  id?: string;
  reserva_id: string;
  modo: ModoChegada;
  companhia: string | null;
  numero: string | null;
  origem: string | null;
  destino: string | null;
  chegada_em: string | null;
  situacao_horario: SituacaoHorario;
  passageiros: number | null;
  transfer_veiculo: VeiculoTransfer | null;
  transfer_responsavel: string | null;
  transfer_contato: string | null;
  transfer_detalhe: string | null;
  transfer_encontro: string | null;
  transfer_destino: string | null;
  observacoes: string | null;
};

export const MODOS_CHEGADA: Record<ModoChegada, string> = {
  voo_regular: 'Voo regular',
  fretado: 'Fretado / táxi aéreo',
  barco: 'Barco',
  carro: 'Carro',
  outro: 'Outro',
};

export const SITUACOES_HORARIO: Record<SituacaoHorario, string> = {
  a_confirmar: 'Horário a confirmar',
  confirmado_cliente: 'Confirmado pelo cliente',
  confirmado_companhia: 'Confirmado com a companhia',
};

export const VEICULOS_TRANSFER: Record<VeiculoTransfer, string> = {
  van: 'Van',
  carro: 'Carro',
  caminhonete: 'Caminhonete',
  onibus: 'Ônibus / micro-ônibus',
  barco: 'Barco',
  outro: 'Outro',
};

// Rotas mais usadas para chegar a Barcelos. O horário é sempre informado pela operadora.
export const ROTAS_SUGERIDAS: { rotulo: string; modo: ModoChegada; origem: string; destino: string; companhia?: string; veiculo: VeiculoTransfer; encontro: string }[] = [
  { rotulo: 'Voo Manaus (MAO) → Barcelos (BAZ)', modo: 'voo_regular', origem: 'Manaus (MAO)', destino: 'Barcelos (BAZ)', companhia: 'Azul', veiculo: 'van', encontro: 'Saída do aeroporto de Barcelos' },
  { rotulo: 'Fretado Manaus → Barcelos', modo: 'fretado', origem: 'Manaus', destino: 'Barcelos (BAZ)', veiculo: 'van', encontro: 'Saída do aeroporto de Barcelos' },
  { rotulo: 'Barco Manaus → Barcelos', modo: 'barco', origem: 'Manaus (porto)', destino: 'Barcelos (orla)', veiculo: 'carro', encontro: 'Orla de Barcelos' },
];

export const CAMPOS_CHEGADA =
  'id,reserva_id,modo,companhia,numero,origem,destino,chegada_em,situacao_horario,passageiros,transfer_veiculo,transfer_responsavel,transfer_contato,transfer_detalhe,transfer_encontro,transfer_destino,observacoes';

export function chegadaVazia(reservaId: string): ChegadaERN {
  return {
    reserva_id: reservaId,
    modo: 'voo_regular',
    companhia: null,
    numero: null,
    origem: null,
    destino: null,
    chegada_em: null,
    situacao_horario: 'a_confirmar',
    passageiros: null,
    transfer_veiculo: 'van',
    transfer_responsavel: null,
    transfer_contato: null,
    transfer_detalhe: null,
    transfer_encontro: null,
    transfer_destino: null,
    observacoes: null,
  };
}

export function temTransfer(c: Pick<ChegadaERN, 'transfer_responsavel' | 'transfer_veiculo'>): boolean {
  return Boolean(c.transfer_responsavel?.trim());
}

export function formatarChegada(iso: string | null): string {
  if (!iso) return 'Data a definir';
  const data = new Date(iso);
  if (!Number.isFinite(data.getTime())) return 'Data a definir';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Manaus', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(data).replace('.', '');
}

// Converte "AAAA-MM-DDTHH:MM" (horário de Manaus, UTC-4) para ISO com fuso.
export function localManausParaISO(valor: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) return null;
  const iso = `${valor}:00-04:00`;
  return Number.isFinite(new Date(iso).getTime()) ? new Date(iso).toISOString() : null;
}

export function isoParaLocalManaus(iso: string | null): string {
  if (!iso) return '';
  const data = new Date(iso);
  if (!Number.isFinite(data.getTime())) return '';
  const partes = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Manaus', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(data).map(p => [p.type, p.value]));
  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}`;
}

export async function carregarChegadaDaReserva(reservaId: string): Promise<ChegadaERN | null> {
  const { data, error } = await supabase
    .from('reserva_chegadas')
    .select(CAMPOS_CHEGADA)
    .eq('reserva_id', reservaId)
    .maybeSingle();
  if (error) throw new Error('Não foi possível consultar a chegada desta reserva.');
  return (data as ChegadaERN | null) ?? null;
}

export type ChegadaPainel = ChegadaERN & { reserva?: { cliente: string | null; pacote: string | null; data_reserva: string | null; horario: string | null } | null };

export async function listarChegadas(inicioISO: string, fimISO: string): Promise<ChegadaPainel[]> {
  const { data, error } = await supabase
    .from('reserva_chegadas')
    .select(`${CAMPOS_CHEGADA},reserva:reservas(cliente,pacote,data_reserva,horario)`)
    .gte('chegada_em', inicioISO)
    .lte('chegada_em', fimISO)
    .order('chegada_em', { ascending: true })
    .limit(100);
  if (error) throw new Error('Não foi possível consultar as chegadas.');
  return (data ?? []) as unknown as ChegadaPainel[];
}

function limpar(valor: string | null | undefined, max: number): string | null {
  const t = (valor ?? '').trim();
  return t ? t.slice(0, max) : null;
}

export async function salvarChegada(c: ChegadaERN): Promise<ChegadaERN> {
  const passageiros = c.passageiros === null || c.passageiros === undefined ? null : Math.trunc(Number(c.passageiros));
  if (passageiros !== null && (!Number.isFinite(passageiros) || passageiros < 1 || passageiros > 999)) {
    throw new Error('Informe de 1 a 999 passageiros.');
  }
  const registro = {
    reserva_id: c.reserva_id,
    modo: c.modo,
    companhia: limpar(c.companhia, 80),
    numero: limpar(c.numero, 30),
    origem: limpar(c.origem, 80),
    destino: limpar(c.destino, 80),
    chegada_em: c.chegada_em,
    situacao_horario: c.situacao_horario,
    passageiros,
    transfer_veiculo: c.transfer_veiculo,
    transfer_responsavel: limpar(c.transfer_responsavel, 120),
    transfer_contato: limpar(c.transfer_contato, 40),
    transfer_detalhe: limpar(c.transfer_detalhe, 120),
    transfer_encontro: limpar(c.transfer_encontro, 160),
    transfer_destino: limpar(c.transfer_destino, 160),
    observacoes: limpar(c.observacoes, 1000),
  };
  const { data, error } = await supabase
    .from('reserva_chegadas')
    .upsert(registro, { onConflict: 'reserva_id' })
    .select(CAMPOS_CHEGADA)
    .single();
  if (error || !data) throw new Error('Não foi possível salvar a chegada. Confira os campos e tente novamente.');
  return data as ChegadaERN;
}

export async function excluirChegada(reservaId: string): Promise<void> {
  const { error } = await supabase.from('reserva_chegadas').delete().eq('reserva_id', reservaId);
  if (error) throw new Error('Não foi possível remover a chegada.');
}

export function textoChegadaVoucher(c: ChegadaERN): string {
  const meio = [MODOS_CHEGADA[c.modo], [c.companhia, c.numero].filter(Boolean).join(' '), [c.origem, c.destino].filter(Boolean).join(' → ')].filter(Boolean).join(' · ');
  return `${meio}${c.chegada_em ? ` · ${formatarChegada(c.chegada_em)}` : ''}${c.situacao_horario === 'a_confirmar' ? ' (horário a confirmar)' : ''}`;
}

export function textoTransferVoucher(c: ChegadaERN): string {
  if (!temTransfer(c)) return 'A combinar com a operadora';
  return [
    c.transfer_responsavel,
    c.transfer_veiculo ? VEICULOS_TRANSFER[c.transfer_veiculo] : null,
    c.transfer_detalhe,
    c.transfer_encontro ? `encontro: ${c.transfer_encontro}` : null,
    c.transfer_destino ? `destino: ${c.transfer_destino}` : null,
  ].filter(Boolean).join(' · ');
}

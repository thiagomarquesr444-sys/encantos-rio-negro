// EDA_VOUCHER_TURISTA_V1: emissão do voucher sempre a partir da reserva.
import { supabase } from '@/lib/supabase';

export type VoucherEmitido = { id: string; codigo: string; token: string; versao: number };

const MENSAGENS: [string, string][] = [
  ['EDA_VOUCHER_RESERVA_NAO_CONFIRMADA', 'Confirme a reserva antes de emitir o voucher.'],
  ['EDA_VOUCHER_SEM_PAGAMENTO', 'Registre o sinal ou o pagamento da reserva (receita como Recebido) antes de emitir o voucher.'],
  ['EDA_VOUCHER_SEM_VALOR', 'Informe o valor total da reserva antes de emitir o voucher.'],
  ['EDA_VOUCHER_JA_EMITIDO', 'Esta reserva já tem um voucher ativo.'],
  ['EDA_VOUCHER_PLANO', 'Vouchers estão disponíveis a partir do plano Pro.'],
  ['EDA_VOUCHER_MFA', 'Confirme a verificação em duas etapas para emitir vouchers.'],
  ['EDA_VOUCHER_SEM_PERMISSAO', 'Somente o administrador ou operador da empresa pode emitir vouchers e fazer check-in.'],
  ['EDA_VOUCHER_RESERVA_NAO_ENCONTRADA', 'Reserva não encontrada para sua empresa.'],
  ['Complete cliente, passeio e quantidade', 'Complete cliente, passeio e quantidade de pessoas na reserva antes de emitir.'],
];

export function mensagemVoucherEDA(erro: unknown, padrao = 'Não foi possível emitir o voucher.'): string {
  const texto = erro && typeof erro === 'object' && 'message' in erro ? String((erro as { message: unknown }).message) : '';
  return MENSAGENS.find(([codigo]) => texto.includes(codigo))?.[1] ?? padrao;
}

export const voucherJaEmitido = (erro: unknown) =>
  !!erro && typeof erro === 'object' && 'message' in erro && String((erro as { message: unknown }).message).includes('EDA_VOUCHER_JA_EMITIDO');

export async function emitirVoucherReservaEDA(reservaId: string, substituir = false): Promise<VoucherEmitido> {
  const { data, error } = await supabase.rpc('emitir_voucher_reserva_eda', { p_reserva_id: reservaId, p_substituir: substituir });
  if (error) throw error;
  if (!data?.id) throw new Error('Não foi possível confirmar a emissão.');
  return data as VoucherEmitido;
}

/** Fluxo completo com confirmações: emite ou, se já houver ativo, oferece nova versão. */
export async function emitirComConfirmacaoEDA(reservaId: string): Promise<VoucherEmitido | null> {
  if (!window.confirm('Emitir o voucher desta reserva? Os dados da reserva, dos passageiros e do pagamento serão congelados no voucher.')) return null;
  try {
    return await emitirVoucherReservaEDA(reservaId);
  } catch (erro) {
    if (!voucherJaEmitido(erro)) throw erro;
    if (!window.confirm('Esta reserva já tem um voucher ativo. Emitir uma nova versão com os dados atuais? O voucher anterior ficará como Substituído e deixará de valer.')) return null;
    return await emitirVoucherReservaEDA(reservaId, true);
  }
}

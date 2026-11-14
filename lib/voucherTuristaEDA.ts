// EDA_VOUCHER_NA_RESERVA_V1: tudo do voucher do turista em um só lugar —
// usado pela reserva (emitir, PDF, WhatsApp, check-in, cancelar) e pela
// página "Embarques do dia" (check-in no porto).
import { supabase } from '@/lib/supabase';
import { baixarDocumentoPremiumERN } from '@/lib/pdfSobDemandaEDA'; // EDA_PDF_SOB_DEMANDA_V1
import { enfileirarCheckinEDA, erroDeRedeEDA } from '@/lib/filaOfflineEDA';
import { sinalFracoEDA } from '@/lib/conexaoEDA';
import { consultarIdentificacaoEmpresaERN } from '@/lib/identificacaoEmpresaERN';
import { carregarChegadaDaReserva, textoChegadaVoucher, textoTransferVoucher } from '@/lib/chegadasERN';
import { confirmarEDA, perguntarEDA } from '@/lib/dialogoEDA';

export type SnapshotVoucherEDA = {
  operadora?: { nome?: string | null; cnpj?: string | null; telefone?: string | null; email?: string | null; cidade?: string | null; endereco?: string | null; whatsapp?: string | null };
  titular?: { nome?: string | null; telefone?: string | null };
  passageiros?: { nome: string; relacao: string | null; titular: boolean; nascimento: string | null }[];
  quantidades?: { total: number | null; criancas: number; colo: number };
  passeio?: { nome?: string | null; inicio?: string | null; horario?: string | null; fim?: string | null; horario_fim?: string | null; ponto_embarque?: string | null; inclui?: string[] | null; nao_inclui?: string[] | null; duracao?: string | null; guia?: string | null; embarcacao?: string | null };
  financeiro?: { total: number; pago: number; saldo: number };
  fichas?: { participantes: number; preenchidas: number };
};

export type VoucherEDA = {
  id: string; empresa_id: string | null; created_at: string | null; data_emissao: string | null;
  codigo: string; reserva_id: string | null; status: string | null;
  cliente_nome: string | null; passeio_nome: string | null; quantidade_pessoas: number | null;
  data_passeio: string | null; horario_passeio: string | null; valor: number | string | null; validade: string | null;
  token_verificacao: string | null; utilizado_em: string | null;
  versao: number | null; snapshot: SnapshotVoucherEDA | null; enviado_em: string | null;
  reserva_alterada_em: string | null; cancelado_em: string | null; motivo_cancelamento: string | null;
};

export const CAMPOS_VOUCHER_EDA = 'id,empresa_id,created_at,data_emissao,codigo,reserva_id,status,cliente_nome,passeio_nome,quantidade_pessoas,data_passeio,horario_passeio,valor,validade,token_verificacao,utilizado_em,versao,snapshot,enviado_em,reserva_alterada_em,cancelado_em,motivo_cancelamento';

export type SituacaoVoucherEDA = 'Ativo' | 'Utilizado' | 'Cancelado' | 'Substituído' | 'Expirado';

const sem = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

export function hojeManausEDA(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Manaus', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function situacaoVoucherEDA(v: VoucherEDA, hoje = hojeManausEDA()): SituacaoVoucherEDA {
  const s = sem(v.status ?? '');
  if (s === 'cancelado') return 'Cancelado';
  if (s === 'substituido') return 'Substituído';
  if (s === 'utilizado' || v.utilizado_em) return 'Utilizado';
  if (v.validade && v.validade.slice(0, 10) < hoje) return 'Expirado';
  return 'Ativo';
}

export const dataBR = (d?: string | null) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '—');
export const moedaBR = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataHoraBR = (v?: string | null) => (v ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Manaus', dateStyle: 'short', timeStyle: 'short' }).format(new Date(v)) : '—');
export const linkVerificacaoEDA = (v: VoucherEDA) => (v.token_verificacao ? `${window.location.origin}/voucher/${v.token_verificacao}` : '');

const MENSAGENS: [string, string][] = [
  ['EDA_VOUCHER_RESERVA_NAO_CONFIRMADA', 'Confirme a reserva antes de emitir o voucher.'],
  ['EDA_VOUCHER_SEM_PAGAMENTO', 'Registre o sinal ou o pagamento desta reserva (em Pagamentos) antes de emitir o voucher.'],
  ['EDA_VOUCHER_SEM_VALOR', 'Informe o valor total da reserva antes de emitir o voucher.'],
  ['EDA_VOUCHER_JA_EMITIDO', 'Esta reserva já tem um voucher ativo.'],
  ['EDA_VOUCHER_PLANO', 'Vouchers estão disponíveis a partir do plano Pro.'],
  ['EDA_VOUCHER_MFA', 'Confirme a verificação em duas etapas para operar vouchers.'],
  ['EDA_VOUCHER_SEM_PERMISSAO', 'Somente o administrador ou operador da empresa opera vouchers e faz check-in.'],
  ['EDA_VOUCHER_RESERVA_NAO_ENCONTRADA', 'Reserva não encontrada para sua empresa.'],
  ['EDA_VOUCHER_JA_UTILIZADO', 'Este voucher já teve check-in.'],
  ['EDA_VOUCHER_CANCELADO', 'Voucher cancelado não pode ser utilizado.'],
  ['EDA_VOUCHER_SUBSTITUIDO', 'Este voucher foi substituído por uma nova versão.'],
  ['EDA_VOUCHER_FINALIZADO', 'Este voucher já foi encerrado.'],
  ['Complete cliente, passeio e quantidade', 'Complete cliente, passeio e quantidade de pessoas na reserva antes de emitir.'],
];

export function mensagemVoucherEDA(erro: unknown, padrao = 'Não foi possível concluir a ação do voucher.'): string {
  const texto = erro && typeof erro === 'object' && 'message' in erro ? String((erro as { message: unknown }).message) : '';
  return MENSAGENS.find(([c]) => texto.includes(c))?.[1] ?? padrao;
}

export async function listarVouchersReservaEDA(reservaId: string): Promise<VoucherEDA[]> {
  const { data, error } = await supabase.from('vouchers').select(CAMPOS_VOUCHER_EDA)
    .eq('reserva_id', reservaId).order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as VoucherEDA[];
}

export async function emitirVoucherEDA(reservaId: string, novaVersao = false): Promise<{ id: string; codigo: string; versao: number }> {
  const { data, error } = await supabase.rpc('emitir_voucher_reserva_eda', { p_reserva_id: reservaId, p_substituir: novaVersao });
  if (error) throw error;
  if (!data?.id) throw new Error('Não foi possível confirmar a emissão.');
  return data as { id: string; codigo: string; versao: number };
}

// EDA_FILA_OFFLINE_V1: sem internet no porto, o check-in fica guardado no
// aparelho (com o horário real) e sobe sozinho quando o sinal voltar.
// Com internet normal, segue direto como sempre. Retorna 'fila' quando guardou.
export async function checkinVoucherEDA(v: VoucherEDA): Promise<boolean | 'fila'> {
  if (!(await confirmarEDA(`Voucher ${v.codigo} · ${v.cliente_nome ?? 'titular'}\nConfira o documento com foto do titular. Depois do check-in o voucher não pode ser usado de novo.`, { titulo: 'Fazer o check-in?', confirmar: 'Confirmar embarque' }))) return false;
  const guardar = async () => { await enfileirarCheckinEDA(v.id, v.codigo); return 'fila' as const; };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return guardar();
  try {
    // Sinal fraco: se o servidor não responder em 15 s, guarda e segue o embarque.
    // (Se o check-in tiver chegado mesmo assim, o reenvio reconhece e não duplica.)
    let pedido = supabase.rpc('marcar_voucher_utilizado_eda', { p_voucher_id: v.id });
    if (sinalFracoEDA() && typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
      pedido = pedido.abortSignal(AbortSignal.timeout(15_000));
    }
    const { error } = await pedido;
    if (error) {
      if (erroDeRedeEDA(error)) return guardar();
      throw error;
    }
  } catch (erro) {
    if (erroDeRedeEDA(erro)) return guardar();
    throw erro;
  }
  return true;
}

export async function cancelarVoucherEDA(v: VoucherEDA): Promise<boolean> {
  const motivo = await perguntarEDA(`O turista deixa de poder usar o voucher ${v.codigo}. O motivo fica registrado no histórico.`, {
    titulo: 'Cancelar o voucher?', confirmar: 'Cancelar voucher', cancelar: 'Voltar', perigo: true,
    campo: { rotulo: 'Motivo do cancelamento', placeholder: 'Ex.: turista desistiu da viagem', minimo: 3, maximo: 300 },
  });
  if (motivo === null) return false;
  const { error } = await supabase.from('vouchers')
    .update({ status: 'Cancelado', motivo_cancelamento: motivo.trim().slice(0, 300) }).eq('id', v.id);
  if (error) throw error;
  return true;
}

/** Abre o WhatsApp do titular com texto pronto e marca o voucher como enviado. */
export async function enviarWhatsAppVoucherEDA(v: VoucherEDA): Promise<void> {
  const tel = (v.snapshot?.titular?.telefone ?? '').replace(/\D/g, '');
  const numero = tel.length >= 10 && tel.length <= 11 ? `55${tel}` : tel;
  const nome = (v.snapshot?.titular?.nome || v.cliente_nome || '').split(' ')[0];
  const p = v.snapshot?.passeio;
  const f = v.snapshot?.financeiro;
  const horario = (p?.horario || v.horario_passeio || '').slice(0, 5);
  const link = linkVerificacaoEDA(v);
  const texto = [
    `Olá${nome ? `, ${nome}` : ''}! Aqui é da ${v.snapshot?.operadora?.nome || 'operadora'}.`,
    `Seu voucher ${v.codigo} está emitido e sua viagem está garantida:`,
    `• ${p?.nome || v.passeio_nome || 'Passeio'}: ${dataBR(p?.inicio || v.data_passeio)}${horario ? ` às ${horario}` : ''}`,
    p?.ponto_embarque ? `• Embarque: ${p.ponto_embarque}` : '',
    f && f.saldo > 0 ? `• Saldo a pagar no embarque: ${moedaBR(f.saldo)}` : '• Pagamento: quitado',
    link ? `Confira a autenticidade: ${link}` : '',
    'Apresente o voucher (PDF ou link) e um documento com foto no embarque. Boa viagem pelas águas da Amazônia!',
  ].filter(Boolean).join('\n');
  window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
  if (!v.enviado_em) await supabase.from('vouchers').update({ enviado_em: new Date().toISOString() }).eq('id', v.id);
}

type DetalheVoucher = {
  token: string; saida_inicio: string | null; saida_fim: string | null; ponto_embarque: string | null;
  inclui: string[] | null; nao_inclui: string[] | null; guia: string | null; embarcacao: string | null;
  participantes: { nome: string; titular: boolean; nascimento: string | null }[];
  hospedagens: { hospedagem: string; acomodacao: string; checkin: string; checkout: string; check_in_hora: string | null; check_out_hora: string | null; endereco: string | null }[];
};

const RELACAO: Record<string, string> = { titular: 'Titular', conjuge: 'Cônjuge', filho: 'Filho(a)', pai: 'Pai', mae: 'Mãe', outro: 'Dependente' };

/** PDF Premium do voucher (dados congelados na emissão). */
export async function baixarPDFVoucherEDA(v: VoucherEDA): Promise<void> {
  const empresa = await consultarIdentificacaoEmpresaERN();
  if (!v.empresa_id || v.empresa_id !== empresa.id) throw new Error('Este voucher não pertence à empresa autenticada.');
  let det: DetalheVoucher | null = null;
  try { const { data } = await supabase.rpc('detalhes_voucher_eda', { p_voucher_id: v.id }); det = (data ?? null) as DetalheVoucher | null; } catch { det = null; }
  let chegada: Awaited<ReturnType<typeof carregarChegadaDaReserva>> = null;
  if (v.reserva_id) { try { chegada = await carregarChegadaDaReserva(v.reserva_id); } catch { chegada = null; } }

  const snap = v.snapshot ?? null;
  const op = snap?.operadora;
  const p = snap?.passeio;
  const fin = snap?.financeiro;
  const situacao = situacaoVoucherEDA(v);
  const link = linkVerificacaoEDA(v);
  const passageiros = snap?.passageiros?.length
    ? snap.passageiros.map((x) => [x.nome, x.titular ? 'Titular' : (RELACAO[x.relacao ?? ''] ?? (x.relacao || 'Dependente')), dataBR(x.nascimento)])
    : (det?.participantes ?? []).map((x) => [x.nome, x.titular ? 'Titular' : 'Dependente', dataBR(x.nascimento)]);
  const inicio = p?.inicio || det?.saida_inicio || v.data_passeio;
  const fim = p?.fim || det?.saida_fim;
  const ponto = p?.ponto_embarque || det?.ponto_embarque;
  const inclui = p?.inclui ?? det?.inclui;
  const naoInclui = p?.nao_inclui ?? det?.nao_inclui;

  baixarDocumentoPremiumERN({
    titulo: 'Voucher do Turista',
    subtitulo: 'Comprovante de compra e documento de embarque',
    tipo: 'Voucher',
    empresa: op?.nome || empresa.nome,
    identificador: v.codigo,
    // Nome do arquivo = nome do turista (titular) + data do embarque.
    nomeArquivo: `Voucher-${(snap?.titular?.nome || v.cliente_nome || v.codigo).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, '-')}-${dataBR(inicio).replace(/\//g, '-')}.pdf`,
    status: situacao === 'Ativo' ? 'Válido para embarque' : situacao,
    tabela: passageiros.length ? { titulo: 'Passageiros (titular e dependentes)', colunas: ['Nome', 'Vínculo', 'Nascimento'], linhas: passageiros } : undefined,
    destaque: chegada ? {
      titulo: 'Chegada e transfer',
      linhas: [
        { rotulo: 'Sua chegada', texto: textoChegadaVoucher(chegada) },
        { rotulo: 'Quem busca', texto: textoTransferVoucher(chegada) + (chegada.transfer_contato ? ` · contato ${chegada.transfer_contato}` : '') },
      ],
    } : undefined,
    dados: [
      { campo: 'Operadora', valor: op?.nome || empresa.nome },
      { campo: 'CNPJ', valor: op?.cnpj || empresa.cnpj || 'Não cadastrado' },
      { campo: 'Contato', valor: [op?.whatsapp, op?.telefone || empresa.telefone, op?.email || empresa.email].filter(Boolean).join(' · ') || 'Não cadastrado' },
      { campo: 'Titular', valor: snap?.titular?.nome || v.cliente_nome || '—' },
      { campo: 'Passeio', valor: p?.nome || v.passeio_nome || '—' },
      { campo: 'Período', valor: fim && fim !== inicio ? `${dataBR(inicio)} a ${dataBR(fim)}` : dataBR(inicio) },
      { campo: 'Horário de saída', valor: (p?.horario || v.horario_passeio || '').slice(0, 5) || 'A confirmar' },
      ...(p?.horario_fim ? [{ campo: 'Horário de retorno', valor: p.horario_fim.slice(0, 5) }] : []),
      ...(ponto ? [{ campo: 'Ponto de embarque', valor: ponto }] : []),
      ...((p?.embarcacao || det?.embarcacao) ? [{ campo: 'Embarcação', valor: String(p?.embarcacao || det?.embarcacao) }] : []),
      ...((p?.guia || det?.guia) ? [{ campo: 'Guia', valor: String(p?.guia || det?.guia) }] : []),
      { campo: 'Pessoas', valor: String(snap?.quantidades?.total ?? v.quantidade_pessoas ?? '—') },
      ...(inclui?.length ? [{ campo: 'Inclui', valor: inclui.join(' · ') }] : []),
      ...(naoInclui?.length ? [{ campo: 'Não inclui', valor: naoInclui.join(' · ') }] : []),
      ...(det?.hospedagens ?? []).map((h) => ({
        campo: 'Hospedagem',
        valor: `${h.hospedagem} · ${h.acomodacao} · check-in ${dataBR(h.checkin)}${h.check_in_hora ? ` ${h.check_in_hora.slice(0, 5)}` : ''} · check-out ${dataBR(h.checkout)}${h.check_out_hora ? ` ${h.check_out_hora.slice(0, 5)}` : ''}${h.endereco ? ` · ${h.endereco}` : ''}`,
      })),
      ...(fin ? [
        { campo: 'Valor total da compra', valor: moedaBR(fin.total) },
        { campo: 'Pago até a emissão', valor: moedaBR(fin.pago) },
        { campo: 'Saldo a pagar no embarque', valor: Number(fin.saldo) > 0 ? moedaBR(fin.saldo) : 'Quitado' },
      ] : [{ campo: 'Valor', valor: moedaBR(v.valor) }]),
      ...(snap?.fichas && snap.fichas.participantes > 0 ? [{ campo: 'Fichas de saúde', valor: snap.fichas.preenchidas >= snap.fichas.participantes ? 'Todas preenchidas ✓' : `${snap.fichas.preenchidas} de ${snap.fichas.participantes} preenchidas` }] : []),
      { campo: 'Emitido em', valor: dataHoraBR(v.data_emissao || v.created_at) },
      ...((v.versao ?? 1) > 1 ? [{ campo: 'Versão', valor: `${v.versao} (substitui a anterior)` }] : []),
      { campo: 'Válido até', valor: dataBR(v.validade) },
      ...(v.utilizado_em ? [{ campo: 'Check-in em', valor: dataHoraBR(v.utilizado_em) }] : []),
      ...(link ? [{ campo: 'Verificar autenticidade', valor: link }] : []),
    ],
    observacoes: [
      'Comprovante de compra emitido diretamente pela operadora ao turista.',
      'Apresente este voucher (PDF ou link) e um documento com foto do titular no embarque.',
      'Os dados do passeio, dos passageiros e do pagamento são os registrados na emissão; alterações geram nova versão, e a anterior deixa de valer.',
      'Cancelamentos e remarcações seguem a política combinada com a operadora.',
      'Este documento não constitui nota fiscal.',
    ],
  });
}

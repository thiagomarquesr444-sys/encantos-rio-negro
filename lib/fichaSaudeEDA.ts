// EDA_FICHA_SAUDE_V1: participantes da reserva e ficha de saúde e segurança.
// Dado sensível (LGPD art. 11): leitura e gravação só pelas funções do banco,
// que checam a função do usuário e registram o acesso.
import { supabase } from '@/lib/supabase';

export const RESTRICOES = [
  ['lactose', 'Sem lactose'], ['gluten', 'Sem glúten'], ['frutos_do_mar', 'Sem frutos do mar'],
  ['peixe', 'Sem peixe'], ['amendoim_castanhas', 'Sem amendoim/castanhas'], ['ovo', 'Sem ovo'],
  ['soja', 'Sem soja'], ['vegetariano', 'Vegetariano'], ['vegano', 'Vegano'],
  ['sem_carne_porco', 'Sem carne de porco'], ['outra', 'Outra'],
] as const;

export const ALERGIAS = [
  ['alimento', 'Alimento'], ['medicamento', 'Medicamento'], ['picada_inseto', 'Picada de inseto'],
  ['latex', 'Látex'], ['outra', 'Outra'],
] as const;

export const CONDICOES = [
  ['diabetes', 'Diabetes'], ['cardiaca', 'Cardíaca'], ['hipertensao', 'Hipertensão'],
  ['respiratoria', 'Respiratória/asma'], ['epilepsia', 'Epilepsia'], ['gestante', 'Gestante'],
  ['mobilidade_reduzida', 'Mobilidade reduzida'], ['outra', 'Outra'],
] as const;

export type FichaEDA = {
  sem_restricoes: boolean;
  restricoes_alimentares: string[];
  alergias: string[];
  alergia_gravidade: '' | 'leve' | 'moderada' | 'grave';
  alergias_detalhe: string;
  condicoes: string[];
  condicoes_detalhe: string;
  medicacao_continua: string;
  sabe_nadar: boolean | null;
  contato_emergencia_nome: string;
  contato_emergencia_telefone: string;
  plano_saude: string;
  observacoes: string;
};

export const FICHA_VAZIA: FichaEDA = {
  sem_restricoes: false, restricoes_alimentares: [], alergias: [], alergia_gravidade: '',
  alergias_detalhe: '', condicoes: [], condicoes_detalhe: '', medicacao_continua: '',
  sabe_nadar: null, contato_emergencia_nome: '', contato_emergencia_telefone: '',
  plano_saude: '', observacoes: '',
};

export type NivelEDA = 'grave' | 'atencao' | 'ok' | 'pendente';

export type ParticipanteEDA = {
  participante_id: string;
  nome: string;
  data_nascimento: string | null;
  documento: string | null;
  titular: boolean;
  cliente_id: string | null;
  ficha: (Partial<FichaEDA> & { preenchido_por?: string; atualizado_em?: string }) | null;
  nivel: NivelEDA;
  alertas: string[];
  expira_em: string | null;
  quantidade_pessoas: number;
};

export type LinhaResumoEDA = {
  reserva_id: string;
  reserva_cliente: string | null;
  participante_id: string | null;
  participante_nome: string | null;
  nivel: NivelEDA;
  alertas: string[];
};

export function fichaDeBanco(f: ParticipanteEDA['ficha']): FichaEDA {
  if (!f) return { ...FICHA_VAZIA };
  return {
    ...FICHA_VAZIA,
    ...Object.fromEntries(Object.entries(f).filter(([, v]) => v !== null)),
    alergia_gravidade: (f.alergia_gravidade ?? '') as FichaEDA['alergia_gravidade'],
    sabe_nadar: f.sabe_nadar ?? null,
  } as FichaEDA;
}

export function mensagemFichaEDA(erro: unknown): string {
  const m = (erro as { message?: string })?.message ?? '';
  if (m.includes('EDA_SEM_PERMISSAO_SAUDE')) return 'Sua função não tem acesso às fichas de saúde.';
  if (m.includes('EDA_CONSENTIMENTO_OBRIGATORIO')) return 'Confirme o consentimento para salvar a ficha.';
  if (m.includes('EDA_PARTICIPANTES_EXCEDEM')) return 'Todos os participantes da reserva já foram cadastrados. Aumente a quantidade de pessoas para incluir mais.';
  if (m.includes('EDA_CONVITE_INVALIDO')) return 'Este link expirou ou não é válido. Peça um novo à operadora.';
  if (m.includes('reserva_participantes_nome_check')) return 'Informe o nome completo (mínimo 2 letras).';
  return 'Não foi possível concluir. Verifique a conexão e tente novamente.';
}

export async function listarFichasReservaEDA(reservaId: string) {
  const { data, error } = await supabase.rpc('fichas_reserva_eda', { p_reserva_id: reservaId });
  if (error) throw error;
  return (data ?? []) as ParticipanteEDA[];
}

export async function salvarFichaEDA(participanteId: string, ficha: FichaEDA, consentimento: boolean) {
  const { error } = await supabase.rpc('salvar_ficha_eda', {
    p_participante_id: participanteId,
    p_dados: { ...ficha, consentimento },
  });
  if (error) throw error;
}

export async function gerarLinkFichaEDA(reservaId: string) {
  const { data, error } = await supabase.rpc('gerar_convite_ficha_eda', { p_reserva_id: reservaId });
  if (error) throw error;
  return `${window.location.origin}/ficha/${data as string}`;
}

export async function resumoSegurancaEDA(alvo: { saidaId?: string; reservaId?: string }) {
  const { data, error } = await supabase.rpc('resumo_seguranca_eda', {
    p_saida_id: alvo.saidaId ?? null,
    p_reserva_id: alvo.reservaId ?? null,
  });
  if (error) throw error;
  const ordem: Record<NivelEDA, number> = { grave: 0, pendente: 1, atencao: 2, ok: 3 };
  return ((data ?? []) as LinhaResumoEDA[]).sort((a, b) => ordem[a.nivel] - ordem[b.nivel]);
}

// Turista (link pré-viagem)
export type ConviteEDA = {
  passeio: string;
  data_inicio: string;
  data_fim: string | null;
  operadora: string;
  pessoas: number;
  exclusao_em: string;
  participantes: { id: string; nome: string; enviada: boolean }[];
};

export async function abrirConviteEDA(token: string) {
  const { data, error } = await supabase.rpc('convite_ficha_eda', { p_token: token });
  if (error) throw error;
  return (data ?? null) as ConviteEDA | null;
}

export async function enviarFichaTuristaEDA(token: string, alvo: { participanteId?: string; nome?: string; nascimento?: string }, ficha: FichaEDA) {
  const { error } = await supabase.rpc('enviar_ficha_convite_eda', {
    p_token: token,
    p_participante_id: alvo.participanteId ?? null,
    p_nome: alvo.nome ?? null,
    p_data_nascimento: alvo.nascimento || null,
    p_dados: { ...ficha, consentimento: true },
  });
  if (error) throw error;
}

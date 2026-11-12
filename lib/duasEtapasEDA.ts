'use client';

// EDA_DUAS_ETAPAS_V1: verificação em duas etapas por aplicativo autenticador (TOTP).
// Funciona sem sinal de operadora: o código é gerado no próprio celular (Google Authenticator,
// Microsoft Authenticator, Authy etc.), sem SMS.
import { supabase } from '@/lib/supabase';

export async function precisaSegundaEtapaEDA(): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return false;
  return data.nextLevel === 'aal2' && data.currentLevel !== 'aal2';
}

export async function fatorAtivoEDA(): Promise<{ id: string; nome: string | null; criadoEm: string } | null> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return null;
  const f = data.totp.find((x) => x.status === 'verified');
  return f ? { id: f.id, nome: f.friendly_name ?? null, criadoEm: f.created_at } : null;
}

export async function confirmarCodigoEDA(codigo: string): Promise<string | null> {
  const limpo = codigo.replace(/\D/g, '');
  if (limpo.length !== 6) return 'Digite os 6 números do aplicativo.';
  const fator = await fatorAtivoEDA();
  if (!fator) return 'Nenhum autenticador ativo nesta conta.';
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: fator.id, code: limpo });
  if (!error) return null;
  if (error.code === 'mfa_verification_failed' || /invalid/i.test(error.message)) return 'Código incorreto ou vencido. Confira a hora do celular e use o código atual.';
  if (error.code === 'over_request_rate_limit') return 'Muitas tentativas. Aguarde alguns minutos.';
  return 'Não foi possível confirmar agora. Tente novamente.';
}

import { supabase } from '@/lib/supabase';

export interface ContextoGuias {
  usuario_id: string;
  empresa_id: string;
  papel: string | null;
  pode_gerenciar: boolean;
}

export async function obterContextoGuias(): Promise<ContextoGuias> {
  const { data: auth, error: authError } =
    await supabase.auth.getUser();

  if (authError || !auth.user) {
    throw new Error(
      'Entre novamente para acessar os guias da operadora.'
    );
  }

  const { data: perfil, error } = await supabase
    .from('perfis')
    .select('empresa_id,role')
    .eq('id', auth.user.id)
    .single();

  if (error || !perfil?.empresa_id) {
    throw new Error(
      'Sua conta não possui vínculo com uma operadora.'
    );
  }

  return {
    usuario_id: auth.user.id,
    empresa_id: perfil.empresa_id,
    papel: perfil.role,
    pode_gerenciar: [
      'admin_empresa',
      'operador_empresa',
    ].includes(perfil.role ?? ''),
  };
}

// Confere novamente a conta e a empresa antes de gravar.
// A autorização definitiva é aplicada pelas políticas RLS.
export async function validarContextoGuias(
  esperado: ContextoGuias
): Promise<ContextoGuias> {
  const atual = await obterContextoGuias();

  if (
    atual.usuario_id !== esperado.usuario_id ||
    atual.empresa_id !== esperado.empresa_id
  ) {
    throw new Error(
      'A conta ou a empresa mudou. Recarregue a página antes de continuar.'
    );
  }

  if (!atual.pode_gerenciar) {
    throw new Error(
      'Seu perfil não permite gerenciar os guias da operadora.'
    );
  }

  return atual;
}
import { supabase } from '@/lib/supabase';

export type TipoAcesso =
  | 'operadora'
  | 'guia'
  | 'fornecedor';

export type TipoAcessoProfissional =
  | 'guia'
  | 'fornecedor';

export interface AcessosConta {
  usuario_id: string;
  email: string | null;
  empresa_id: string | null;
  papel_empresa: string | null;
  acessos: TipoAcesso[];
}

const PAPEIS_EMPRESA = [
  'admin_empresa',
  'operador_empresa',
  'financeiro',
  'guia',
  'admin_plataforma',
] as const;

function papelEmpresarialValido(
  papel: string | null
): boolean {
  return PAPEIS_EMPRESA.some((item) => item === papel);
}

// A escolha na URL indica apenas a intenção de acesso.
// Ela não concede permissões à conta.
export function interpretarTipoAcesso(
  valor: string | null | undefined
): TipoAcesso | null {
  if (
    valor === 'operadora' ||
    valor === 'guia' ||
    valor === 'fornecedor'
  ) {
    return valor;
  }

  return null;
}

export function contaPossuiAcesso(
  conta: AcessosConta,
  tipo: TipoAcesso
): boolean {
  return conta.acessos.includes(tipo);
}

// Obtém os vínculos existentes no banco.
// Não cria perfil, empresa ou adesão automaticamente.
export async function carregarAcessosConta(): Promise<AcessosConta> {
  const {
    data: { user },
    error: erroUsuario,
  } = await supabase.auth.getUser();

  if (erroUsuario || !user) {
    throw new Error(
      'Sua sessão não está disponível. Entre novamente.'
    );
  }

  const [resultadoPerfil, resultadoProfissionais] =
    await Promise.all([
      supabase
        .from('perfis')
        .select('empresa_id,role')
        .eq('id', user.id)
        .maybeSingle(),

      supabase
        .from('acessos_profissionais')
        .select('tipo')
        .eq('usuario_id', user.id),
    ]);

  if (resultadoPerfil.error) {
    throw new Error(
      'Não foi possível consultar seu vínculo empresarial. Tente novamente.'
    );
  }

  if (resultadoProfissionais.error) {
    throw new Error(
      'Não foi possível consultar seus acessos profissionais. Tente novamente.'
    );
  }

  const empresaId: string | null =
    resultadoPerfil.data?.empresa_id ?? null;

  const papelEmpresa: string | null =
    resultadoPerfil.data?.role ?? null;

  const acessos: TipoAcesso[] = [];

  if (
    empresaId &&
    papelEmpresarialValido(papelEmpresa)
  ) {
    acessos.push('operadora');
  }

  for (const registro of resultadoProfissionais.data ?? []) {
    if (
      registro.tipo === 'guia' ||
      registro.tipo === 'fornecedor'
    ) {
      if (!acessos.includes(registro.tipo)) {
        acessos.push(registro.tipo);
      }
    }
  }

  return {
    usuario_id: user.id,
    email: user.email ?? null,
    empresa_id: empresaId,
    papel_empresa: papelEmpresa,
    acessos,
  };
}

// Só escolhe automaticamente quando não há ambiguidade.
// Uma escolha solicitada sem vínculo não é substituída
// silenciosamente por outro acesso.
export function escolherAcessoDisponivel(
  conta: AcessosConta,
  solicitado: TipoAcesso | null
): TipoAcesso | null {
  if (solicitado) {
    return contaPossuiAcesso(conta, solicitado)
      ? solicitado
      : null;
  }

  if (conta.acessos.length === 1) {
    return conta.acessos[0];
  }

  return null;
}
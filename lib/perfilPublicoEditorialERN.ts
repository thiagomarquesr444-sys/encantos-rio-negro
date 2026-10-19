import { supabase } from '@/lib/supabase';

const PERFIL = '6d2be2c2-31f7-4f5a-b62b-db262177bdd3';
const PASTA = `editorial/${PERFIL}`;

export type ContextoPerfilPublicoERN = {
  usuarioId: string;
  pastaMidias: string;
};

export async function contextoPerfilPublicoERN(): Promise<ContextoPerfilPublicoERN> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user || data.user.is_anonymous) {
    throw new Error('Entre novamente para administrar o editorial.');
  }

  const { data: permitido, error: falha } =
    await supabase.rpc('tem_acesso_editorial_ern');

  if (falha || permitido !== true) {
    throw new Error('Sua conta nao possui autorizacao editorial.');
  }

  return { usuarioId: data.user.id, pastaMidias: PASTA };
}

export async function carregarPerfilPublicoEditorialERN(
  esperado: ContextoPerfilPublicoERN,
) {
  const atual = await contextoPerfilPublicoERN();

  if (
    atual.usuarioId !== esperado.usuarioId ||
    esperado.pastaMidias !== PASTA
  ) {
    throw new Error('A conta mudou. Recarregue a pagina.');
  }

  const { data, error } = await supabase
    .from('perfis_publicos')
    .select('id,nome_publico,publicado')
    .eq('id', PERFIL)
    .eq('origem_tipo', 'editorial')
    .eq('categoria', 'ern_editorial')
    .single();

  if (error) throw error;

  const depois = await contextoPerfilPublicoERN();

  if (depois.usuarioId !== esperado.usuarioId) {
    throw new Error('A conta mudou. Recarregue a pagina.');
  }

  return data;
}

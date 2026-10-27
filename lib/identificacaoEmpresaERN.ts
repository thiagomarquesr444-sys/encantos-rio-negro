import { supabase } from "@/lib/supabase";

export type IdentificacaoEmpresaERN = {
  id: string;
  nome: string;
  cnpj: string | null;
  cidade: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
};

function campoOpcional(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const normalizado = valor.trim();
  return normalizado || null;
}

function campoObrigatorio(
  valor: unknown,
  campo: string
): string {
  const resultado = campoOpcional(valor);

  if (!resultado) {
    throw new Error(
      `A identificação empresarial está incompleta: ${campo}.`
    );
  }

  return resultado;
}

export async function consultarIdentificacaoEmpresaERN():
  Promise<IdentificacaoEmpresaERN> {
  const { data: autenticacao, error: erroAutenticacao } =
    await supabase.auth.getUser();

  if (erroAutenticacao || !autenticacao.user) {
    throw new Error(
      "Sua sessão expirou. Entre novamente para gerar o documento."
    );
  }

  const usuarioId = autenticacao.user.id;

  const { data: perfil, error: erroPerfil } = await supabase
    .from("perfis")
    .select("empresa_id")
    .eq("id", usuarioId)
    .single();

  if (erroPerfil || !perfil?.empresa_id) {
    throw new Error(
      "Não foi possível identificar a empresa vinculada à sua conta."
    );
  }

  const empresaId = String(perfil.empresa_id);

  const { data: empresa, error: erroEmpresa } = await supabase
    .from("empresa")
    .select("id,nome,cnpj,cidade,endereco,telefone,email")
    .eq("id", empresaId)
    .single();

  if (erroEmpresa || !empresa) {
    throw new Error(
      "Os dados empresariais estão indisponíveis ou você não possui permissão para consultá-los."
    );
  }

  if (String(empresa.id) !== empresaId) {
    throw new Error(
      "Inconsistência na identificação da empresa. Documento não gerado."
    );
  }

  return {
    id: empresaId,
    nome: campoObrigatorio(empresa.nome, "nome"),
    cnpj: campoOpcional(empresa.cnpj),
    cidade: campoOpcional(empresa.cidade),
    endereco: campoOpcional(empresa.endereco),
    telefone: campoOpcional(empresa.telefone),
    email: campoOpcional(empresa.email),
  };
}
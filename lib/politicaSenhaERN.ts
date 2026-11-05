export const MINIMO_SENHA_ERN = 12;
export const MAXIMO_BYTES_SENHA_ERN = 72;
// Mesmo conjunto de simbolos aceito pela politica padrao forte do Supabase.
export const SIMBOLOS_SENHA_ERN = "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~";
export const MENSAGEM_SENHA_ERN = 'Use pelo menos 12 caracteres, com uma letra maiúscula (A–Z), uma minúscula (a–z), um número e um símbolo, como ! @ #. Prefira uma senha longa e exclusiva.';
export function requisitosSenhaERN(senha: string) {
  return [
    { id: 'tamanho', texto: '12 caracteres ou mais', ok: Array.from(senha).length >= MINIMO_SENHA_ERN },
    { id: 'maiuscula', texto: 'Uma letra maiúscula (A–Z)', ok: /[A-Z]/.test(senha) },
    { id: 'minuscula', texto: 'Uma letra minúscula (a–z)', ok: /[a-z]/.test(senha) },
    { id: 'numero', texto: 'Um número (0–9)', ok: /[0-9]/.test(senha) },
    { id: 'simbolo', texto: 'Um símbolo, como ! @ #', ok: Array.from(senha).some(c => SIMBOLOS_SENHA_ERN.includes(c)) },
  ];
}
export function validarSenhaERN(senha: string): string | null {
  if (new TextEncoder().encode(senha).length > MAXIMO_BYTES_SENHA_ERN) {
    return 'A senha excede 72 bytes. Letras acentuadas e emojis podem ocupar mais de um byte.';
  }
  if (requisitosSenhaERN(senha).some(r => !r.ok)) return MENSAGEM_SENHA_ERN;
  return null;
}

// ERN_SENHA_VAZADA_V1: consulta Have I Been Pwned por k-anonimato.
// Só os 5 primeiros caracteres do hash SHA-1 saem do navegador; a senha
// nunca é enviada. Falha de rede não bloqueia (retorna null).
export async function senhaVazadaERN(senha: string): Promise<boolean | null> {
  try {
    if (!globalThis.crypto?.subtle) return null;
    const bytes = new TextEncoder().encode(senha);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1', bytes)))
      .map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const prefixo = hash.slice(0, 5);
    const sufixo = hash.slice(5);
    const controle = new AbortController();
    const tempo = setTimeout(() => controle.abort(), 5000);
    const resposta = await fetch(`https://api.pwnedpasswords.com/range/${prefixo}`, {
      headers: { 'Add-Padding': 'true' },
      signal: controle.signal,
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    }).finally(() => clearTimeout(tempo));
    if (!resposta.ok) return null;
    const texto = await resposta.text();
    return texto.split('\n').some((linha) => {
      const [suf, qtd] = linha.trim().split(':');
      return suf === sufixo && Number(qtd) > 0;
    });
  } catch {
    return null;
  }
}

export const MENSAGEM_SENHA_VAZADA_ERN =
  'Esta senha já apareceu em vazamentos de dados na internet. Escolha outra senha, exclusiva para a EDA.';

/** Política completa + verificação de vazamento. */
export async function validarSenhaCompletaERN(senha: string): Promise<string | null> {
  const basico = validarSenhaERN(senha);
  if (basico) return basico;
  return (await senhaVazadaERN(senha)) === true ? MENSAGEM_SENHA_VAZADA_ERN : null;
}

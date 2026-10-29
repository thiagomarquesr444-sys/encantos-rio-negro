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

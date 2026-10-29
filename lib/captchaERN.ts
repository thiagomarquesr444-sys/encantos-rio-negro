export type TokenCaptchaERN = { valor: string; recebidoEm: number };

export function validarCaptchaERN(
  habilitado: boolean,
  sitekey: string,
  token: TokenCaptchaERN | null,
  agora = Date.now(),
): string | null {
  if (!habilitado) return null;
  if (!sitekey.trim()) return 'A verificação de segurança está indisponível. Tente novamente mais tarde.';
  if (!token?.valor || agora < token.recebidoEm || agora - token.recebidoEm >= 290_000) {
    return 'Conclua a verificação de segurança antes de continuar. Se ela expirou, aguarde uma nova verificação.';
  }
  return null;
}

// ERN_ESTILO_PAINEL_V1
// Preferência visual de cada pessoa, neste aparelho (não afeta a empresa):
// "encantos" = capa Encontro das Águas, grafismo e cartões magnéticos;
// "sobrio"   = mesmos dados, cartões limpos, sem grafismo nem movimento.

export type EstiloPainelERN = 'encantos' | 'sobrio';

export const CHAVE_ESTILO_PAINEL = 'ern-estilo-painel-v1';
export const EVENTO_ESTILO_PAINEL = 'ern:estilo-painel';

export function lerEstiloPainel(): EstiloPainelERN {
  try {
    return localStorage.getItem(CHAVE_ESTILO_PAINEL) === 'sobrio' ? 'sobrio' : 'encantos';
  } catch {
    return 'encantos';
  }
}

export function salvarEstiloPainel(estilo: EstiloPainelERN): void {
  try {
    localStorage.setItem(CHAVE_ESTILO_PAINEL, estilo);
  } catch {
    // Sem armazenamento: vale só até recarregar a página.
  }
  window.dispatchEvent(new CustomEvent(EVENTO_ESTILO_PAINEL, { detail: estilo }));
}

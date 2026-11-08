// EDA_AVISO_COPIA_V1: copiar qualquer texto/link da operadora mostra o aviso
// "Copiado" com a marca EDA (AvisoCopiaEDA, montado no layout).

export const EVENTO_COPIA_EDA = 'eda:copiado';
export type DetalheCopiaEDA = { mensagem: string; ok: boolean };

function avisar(mensagem: string, ok: boolean) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<DetalheCopiaEDA>(EVENTO_COPIA_EDA, { detail: { mensagem, ok } }));
}

// Copia com fallback (celular antigo / http) e devolve se deu certo.
export async function copiarEDA(texto: string, mensagem = 'Link copiado'): Promise<boolean> {
  let ok = false;
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(texto); ok = true; }
  } catch { /* tenta o método antigo */ }
  if (!ok) {
    try {
      const area = document.createElement('textarea');
      area.value = texto;
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(area);
      area.select();
      ok = document.execCommand('copy');
      area.remove();
    } catch { ok = false; }
  }
  avisar(ok ? mensagem : 'Não foi possível copiar. Toque e segure no campo para copiar.', ok);
  return ok;
}

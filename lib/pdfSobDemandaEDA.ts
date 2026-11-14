import type { DocumentoPremiumERN } from '@/lib/documentosPremiumERN';
import { avisarEDA } from '@/lib/dialogoEDA';
import { sinalFracoEDA } from '@/lib/conexaoEDA';

// EDA_PDF_SOB_DEMANDA_V1
// O gerador de PDF (jsPDF, ~350 KB) não vai mais junto na abertura das páginas.
// - Sinal normal: baixa "nos bastidores" logo depois que a página fica pronta,
//   então o botão de PDF responde na hora, como antes.
// - Sinal fraco: só baixa quando o operador pedir um PDF.

type ModuloPDF = typeof import('@/lib/documentosPremiumERN');

let modulo: ModuloPDF | null = null;
let carregando: Promise<ModuloPDF> | null = null;

function carregar(): Promise<ModuloPDF> {
  if (modulo) return Promise.resolve(modulo);
  carregando ??= import('@/lib/documentosPremiumERN').then(m => (modulo = m)).catch(erro => {
    carregando = null;
    throw erro;
  });
  return carregando;
}

if (typeof window !== 'undefined') {
  const preparar = () => {
    if (!sinalFracoEDA()) void carregar().catch(() => undefined);
  };
  const ocioso = (window as Window & { requestIdleCallback?: (fn: () => void) => void }).requestIdleCallback;
  if (document.readyState === 'complete') window.setTimeout(() => (ocioso ? ocioso(preparar) : preparar()), 2000);
  else window.addEventListener('load', () => window.setTimeout(() => (ocioso ? ocioso(preparar) : preparar()), 2000), { once: true });
}

export function baixarDocumentoPremiumERN(dados: DocumentoPremiumERN): void {
  if (modulo) {
    modulo.baixarDocumentoPremiumERN(dados);
    return;
  }

  void carregar()
    .then(m => m.baixarDocumentoPremiumERN(dados))
    .catch(() => {
      void avisarEDA('Não consegui preparar o PDF agora. Confira a conexão e tente de novo.');
    });
}

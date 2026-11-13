// EDA_DIALOGO_V1: confirmações, perguntas e avisos com a marca EDA no lugar
// das caixas do navegador ("site.vercel.app diz…"). O DialogoEDA fica no layout.

export const EVENTO_DIALOGO_EDA = 'eda:dialogo';

export type PedidoDialogoEDA = {
  tipo: 'confirmar' | 'perguntar' | 'avisar';
  titulo?: string;
  mensagem: string;
  confirmar?: string;
  cancelar?: string;
  perigo?: boolean;
  campo?: { rotulo?: string; placeholder?: string; minimo?: number; maximo?: number; valor?: string };
  responder: (valor: boolean | string | null) => void;
};

type Opcoes = Omit<PedidoDialogoEDA, 'tipo' | 'mensagem' | 'responder'>;

function abrir(pedido: Omit<PedidoDialogoEDA, 'responder'>): Promise<boolean | string | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') { resolve(null); return; }
    window.dispatchEvent(new CustomEvent<PedidoDialogoEDA>(EVENTO_DIALOGO_EDA, { detail: { ...pedido, responder: resolve } }));
  });
}

/** Pergunta sim/não. Resolve true só quando o usuário confirma. */
export async function confirmarEDA(mensagem: string, opcoes: Opcoes = {}): Promise<boolean> {
  return (await abrir({ tipo: 'confirmar', mensagem, ...opcoes })) === true;
}

/** Pede um texto (ex.: motivo). Resolve null se cancelar. */
export async function perguntarEDA(mensagem: string, opcoes: Opcoes = {}): Promise<string | null> {
  const r = await abrir({ tipo: 'perguntar', mensagem, ...opcoes });
  return typeof r === 'string' ? r : null;
}

/** Aviso simples com um botão. */
export async function avisarEDA(mensagem: string, opcoes: Opcoes = {}): Promise<void> {
  await abrir({ tipo: 'avisar', mensagem, ...opcoes });
}

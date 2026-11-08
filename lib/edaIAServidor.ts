
// EDA_IA_CONVERSA_V1
// Chamada aos modelos de IA na camada gratuita (Groq e Gemini), só no servidor.
// As chaves ficam nas variáveis de ambiente da Vercel e nunca vão ao navegador.
// Ordem padrão: Groq (não usa os dados para treino) e Gemini como reserva.

export type MensagemIA = { papel: 'usuario' | 'eda'; texto: string };

const TEMPO_LIMITE_MS = 20_000;
const MAX_SAIDA = 700;

function comTempo(): AbortSignal {
  return AbortSignal.timeout(TEMPO_LIMITE_MS);
}

async function chamarGroq(sistema: string, mensagens: MensagemIA[]): Promise<string | null> {
  const chave = process.env.GROQ_API_KEY?.trim();
  if (!chave) return null;
  const modelo = process.env.GROQ_MODELO?.trim() || 'llama-3.3-70b-versatile';

  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    signal: comTempo(),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chave}` },
    body: JSON.stringify({
      model: modelo,
      temperature: 0.6,
      max_tokens: MAX_SAIDA,
      messages: [
        { role: 'system', content: sistema },
        ...mensagens.map(m => ({ role: m.papel === 'usuario' ? 'user' : 'assistant', content: m.texto })),
      ],
    }),
  });
  if (!r.ok) throw new Error(`groq ${r.status}`);
  const dados = await r.json() as { choices?: { message?: { content?: string } }[] };
  const texto = dados.choices?.[0]?.message?.content?.trim();
  return texto || null;
}

async function chamarGemini(sistema: string, mensagens: MensagemIA[]): Promise<string | null> {
  const chave = process.env.GEMINI_API_KEY?.trim();
  if (!chave) return null;
  const modelo = process.env.GEMINI_MODELO?.trim() || 'gemini-2.5-flash';
  if (!/^[a-z0-9.\-]+$/i.test(modelo)) throw new Error('modelo inválido');

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: 'POST',
    signal: comTempo(),
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sistema }] },
      contents: mensagens.map(m => ({ role: m.papel === 'usuario' ? 'user' : 'model', parts: [{ text: m.texto }] })),
      generationConfig: { temperature: 0.6, maxOutputTokens: MAX_SAIDA, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });
  if (!r.ok) throw new Error(`gemini ${r.status}`);
  const dados = await r.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const texto = dados.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('').trim();
  return texto || null;
}

/** Tenta os provedores na ordem configurada; devolve null se nenhum responder. */
export async function responderComIA(sistema: string, mensagens: MensagemIA[]): Promise<string | null> {
  const ordem = (process.env.EDA_IA_ORDEM?.trim() || 'groq,gemini').split(',').map(s => s.trim());
  for (const nome of ordem) {
    try {
      const texto = nome === 'groq' ? await chamarGroq(sistema, mensagens)
        : nome === 'gemini' ? await chamarGemini(sistema, mensagens)
        : null;
      if (texto) return texto.slice(0, 4000);
    } catch {
      // Tenta o próximo provedor.
    }
  }
  return null;
}

export function horaManaus(data = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Manaus' }).format(data)) % 24;
}

export function hojeManaus(data = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Manaus' }).format(data);
}

export function periodoDoDia(hora: number): 'madrugada' | 'manha' | 'tarde' | 'noite' {
  if (hora < 5) return 'madrugada';
  if (hora < 12) return 'manha';
  if (hora < 18) return 'tarde';
  return 'noite';
}

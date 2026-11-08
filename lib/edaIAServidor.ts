
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

// Descoberta automática do modelo (os provedores trocam nomes com frequência).
const cacheModelo: { groq?: string; gemini?: string } = {};
export const modelosEmUso = cacheModelo;

async function modeloGroq(chave: string): Promise<string | undefined> {
  if (cacheModelo.groq) return cacheModelo.groq;
  const r = await fetch('https://api.groq.com/openai/v1/models', { signal: comTempo(), headers: { Authorization: `Bearer ${chave}` } });
  if (!r.ok) throw new Error(`groq lista-${r.status}`);
  const ids = ((await r.json()) as { data?: { id: string; active?: boolean }[] }).data
    ?.filter(m => m.active !== false).map(m => m.id)
    .filter(id => !/whisper|guard|tts|playai|orpheus|prompt|compound|distil/i.test(id)) ?? [];
  const pref = [/llama.*70b.*versatile/i, /gpt-oss-120b/i, /llama.*70b/i, /llama-4.*maverick/i, /llama-4/i, /gpt-oss/i, /qwen/i, /llama/i];
  cacheModelo.groq = pref.map(re => ids.find(id => re.test(id))).find(Boolean) ?? ids[0];
  return cacheModelo.groq;
}

async function modeloGemini(chave: string): Promise<string | undefined> {
  if (cacheModelo.gemini) return cacheModelo.gemini;
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { signal: comTempo(), headers: { 'x-goog-api-key': chave } });
  if (!r.ok) throw new Error(`gemini lista-${r.status}`);
  const nomes = ((await r.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] }).models
    ?.filter(m => m.supportedGenerationMethods?.includes('generateContent'))
    .map(m => m.name.replace(/^models\//, ''))
    .filter(n => /^gemini/i.test(n) && !/image|tts|audio|live|embedding|vision|exp|computer|robotics/i.test(n)) ?? [];
  const versao = (n: string) => Number(/gemini-(\d+(?:\.\d+)?)/.exec(n)?.[1] ?? 0);
  const flash = nomes.filter(n => /flash/i.test(n) && !/preview/i.test(n)).sort((a, b) => versao(b) - versao(a) || a.length - b.length);
  cacheModelo.gemini = nomes.find(n => n === 'gemini-flash-latest') ?? flash.find(n => !/lite/i.test(n)) ?? flash[0] ?? nomes[0];
  return cacheModelo.gemini;
}

async function chamarGroq(sistema: string, mensagens: MensagemIA[]): Promise<string | null> {
  const chave = process.env.GROQ_API_KEY?.trim();
  if (!chave) return null;
  const modelo = process.env.GROQ_MODELO?.trim() || await modeloGroq(chave);
  if (!modelo) throw new Error('groq sem-modelo');

  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    signal: comTempo(),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chave}` },
    body: JSON.stringify({
      model: modelo,
      temperature: 0.4,
      max_tokens: MAX_SAIDA,
      messages: [
        { role: 'system', content: sistema },
        ...mensagens.map(m => ({ role: m.papel === 'usuario' ? 'user' : 'assistant', content: m.texto })),
      ],
    }),
  });
  if (r.status === 404) cacheModelo.groq = undefined;
  if (!r.ok) throw new Error(`groq ${r.status}: ${(await r.text()).slice(0, 160)}`);
  const dados = await r.json() as { choices?: { message?: { content?: string } }[] };
  const texto = dados.choices?.[0]?.message?.content?.trim();
  return texto || null;
}

async function chamarGemini(sistema: string, mensagens: MensagemIA[]): Promise<string | null> {
  const chave = process.env.GEMINI_API_KEY?.trim();
  if (!chave) return null;
  const modelo = process.env.GEMINI_MODELO?.trim() || await modeloGemini(chave);
  if (!modelo) throw new Error('gemini sem-modelo');
  if (!/^[a-z0-9.\-]+$/i.test(modelo)) throw new Error('gemini modelo-invalido');

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: 'POST',
    signal: comTempo(),
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sistema }] },
      contents: mensagens.map(m => ({ role: m.papel === 'usuario' ? 'user' : 'model', parts: [{ text: m.texto }] })),
      generationConfig: { temperature: 0.4, maxOutputTokens: MAX_SAIDA * 3 },
    }),
  });
  if (r.status === 404) cacheModelo.gemini = undefined;
  if (!r.ok) throw new Error(`gemini ${r.status}: ${(await r.text()).slice(0, 160)}`);
  const dados = await r.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const texto = dados.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('').trim();
  return texto || null;
}

export const falhasIA: string[] = [];

/** Tenta os provedores na ordem configurada; devolve null se nenhum responder. */
export async function responderComIA(sistema: string, mensagens: MensagemIA[]): Promise<string | null> {
  falhasIA.length = 0;
  const ordem = (process.env.EDA_IA_ORDEM?.trim() || 'groq,gemini').split(',').map(s => s.trim());
  for (const nome of ordem) {
    try {
      const texto = nome === 'groq' ? await chamarGroq(sistema, mensagens)
        : nome === 'gemini' ? await chamarGemini(sistema, mensagens)
        : null;
      if (texto) return texto.slice(0, 4000);
    } catch (e) {
      // Tenta o próximo provedor; a causa fica no log da Vercel.
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[eda-ia]', msg);
      falhasIA.push(msg.replace(/(gsk_|AIza)[\w-]+/g, '***'));
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


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

// Descoberta automática dos modelos (os provedores trocam nomes com frequência).
// Guardamos uma lista ordenada: se um modelo estoura a cota (429) ou demora,
// tentamos o próximo da lista.
const cacheModelo: { groq?: string[]; gemini?: string[] } = {};
export const modelosEmUso = cacheModelo;

async function modelosGroq(chave: string): Promise<string[]> {
  if (cacheModelo.groq?.length) return cacheModelo.groq;
  const r = await fetch('https://api.groq.com/openai/v1/models', { signal: comTempo(), headers: { Authorization: `Bearer ${chave}` } });
  if (!r.ok) throw new Error(`groq lista-${r.status}`);
  const ids = ((await r.json()) as { data?: { id: string; active?: boolean }[] }).data
    ?.filter(m => m.active !== false).map(m => m.id)
    .filter(id => !/whisper|guard|tts|playai|orpheus|prompt|compound|distil/i.test(id)) ?? [];
  const pref = [/llama.*70b.*versatile/i, /gpt-oss-120b/i, /llama-4.*maverick/i, /llama-4.*scout/i, /qwen/i, /gpt-oss-20b/i, /llama.*8b.*instant/i];
  const lista: string[] = [];
  for (const re of pref) for (const id of ids) if (re.test(id) && !lista.includes(id)) lista.push(id);
  cacheModelo.groq = lista.length ? lista : ids;
  return cacheModelo.groq;
}

async function modelosGemini(chave: string): Promise<string[]> {
  if (cacheModelo.gemini?.length) return cacheModelo.gemini;
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { signal: comTempo(), headers: { 'x-goog-api-key': chave } });
  if (!r.ok) throw new Error(`gemini lista-${r.status}`);
  const nomes = ((await r.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] }).models
    ?.filter(m => m.supportedGenerationMethods?.includes('generateContent'))
    .map(m => m.name.replace(/^models\//, ''))
    .filter(n => /^gemini/i.test(n) && /flash/i.test(n) && !/image|tts|audio|live|embedding|vision|exp|computer|robotics|preview|thinking/i.test(n)) ?? [];
  const versao = (n: string) => Number(/gemini-(\d+(?:\.\d+)?)/.exec(n)?.[1] ?? 0);
  const ordenar = (l: string[]) => l.sort((a, b) => versao(b) - versao(a) || a.length - b.length);
  const cheios = ordenar(nomes.filter(n => !/lite/i.test(n) && /\d/.test(n)));
  const lites = ordenar(nomes.filter(n => /lite/i.test(n) && /\d/.test(n)));
  const alias = nomes.filter(n => /latest/.test(n));
  cacheModelo.gemini = [...new Set([...cheios.slice(0, 2), ...lites.slice(0, 1), ...alias])].slice(0, 4);
  return cacheModelo.gemini;
}

async function chamarGroq(sistema: string, mensagens: MensagemIA[]): Promise<string | null> {
  const chave = process.env.GROQ_API_KEY?.trim();
  if (!chave) return null;
  const lista = process.env.GROQ_MODELO?.trim() ? [process.env.GROQ_MODELO.trim()] : await modelosGroq(chave);
  if (!lista.length) throw new Error('groq sem-modelo');
  let ultimo = '';
  for (const modelo of lista.slice(0, 3)) {
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
    if (r.ok) {
      const dados = await r.json() as { choices?: { message?: { content?: string } }[] };
      const texto = dados.choices?.[0]?.message?.content?.trim();
      if (texto) return texto;
      ultimo = `groq vazio ${modelo}`;
      continue;
    }
    if (r.status === 404) cacheModelo.groq = undefined;
    ultimo = `groq ${r.status} ${modelo}: ${(await r.text()).slice(0, 120)}`;
    if (r.status !== 429 && r.status !== 404 && r.status !== 413) break;
  }
  throw new Error(ultimo || 'groq falhou');
}

async function chamarGemini(sistema: string, mensagens: MensagemIA[]): Promise<string | null> {
  const chave = process.env.GEMINI_API_KEY?.trim();
  if (!chave) return null;
  const lista = process.env.GEMINI_MODELO?.trim() ? [process.env.GEMINI_MODELO.trim()] : await modelosGemini(chave);
  if (!lista.length) throw new Error('gemini sem-modelo');
  let ultimo = '';
  for (const modelo of lista.slice(0, 3)) {
    if (!/^[a-z0-9.\-]+$/i.test(modelo)) continue;
    // Raciocínio desligado/baixo: respostas rápidas para conversa.
    const pensamento = /2\.5/.test(modelo) ? { thinkingBudget: 0 } : /^gemini-[3-9]/.test(modelo) ? { thinkingLevel: 'low' } : null;
    for (const comPensamento of pensamento ? [true, false] : [false]) {
      let r: Response;
      try {
        r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
          method: 'POST',
          signal: AbortSignal.timeout(25_000),
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: sistema }] },
            contents: mensagens.map(m => ({ role: m.papel === 'usuario' ? 'user' : 'model', parts: [{ text: m.texto }] })),
            generationConfig: { temperature: 0.5, maxOutputTokens: MAX_SAIDA * 3, ...(comPensamento && pensamento ? { thinkingConfig: pensamento } : {}) },
          }),
        });
      } catch (e) {
        ultimo = `gemini tempo ${modelo}: ${e instanceof Error ? e.message : ''}`;
        break; // tenta o próximo modelo
      }
      if (r.ok) {
        const dados = await r.json() as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
        const texto = dados.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p => p.text ?? '').join('').trim();
        if (texto) return texto;
        ultimo = `gemini vazio ${modelo}`;
        break;
      }
      ultimo = `gemini ${r.status} ${modelo}: ${(await r.text()).slice(0, 120)}`;
      if (r.status === 400 && comPensamento) continue; // tenta sem a configuração de raciocínio
      if (r.status === 404) cacheModelo.gemini = undefined;
      break;
    }
  }
  throw new Error(ultimo || 'gemini falhou');
}

export const falhasIA: string[] = [];

/** Tenta os provedores na ordem configurada; devolve null se nenhum responder. */
export async function responderComIA(sistema: string, mensagens: MensagemIA[], ordemPreferida?: string): Promise<string | null> {
  falhasIA.length = 0;
  const ordem = (ordemPreferida || process.env.EDA_IA_ORDEM?.trim() || 'groq,gemini').split(',').map(s => s.trim());
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

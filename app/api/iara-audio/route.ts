// EDA_IARA_AUDIO_V1: transcrição do áudio que o visitante grava para a Iara.
// - Só aceita chamadas do próprio site (Origin), arquivo de áudio até 3 MB (~60 s).
// - Cota diária por IP (mesmo contador da IA, chave separada) para proteger a camada grátis.
// - LGPD: o áudio NÃO é gravado em lugar nenhum; vai direto ao Whisper (Groq) e é descartado.
//   O texto devolvido passa pela mesma máscara de dados pessoais da conversa.
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 30;

const LIMITE_AUDIO = 3 * 1024 * 1024;
const IDIOMAS: Record<string, string> = { PT: 'pt', EN: 'en', ES: 'es' };
const EXTENSOES: Record<string, string> = { webm: 'webm', ogg: 'ogg', mp4: 'm4a', 'x-m4a': 'm4a', aac: 'm4a', mpeg: 'mp3', wav: 'wav' };

function resposta(status: number, dados: Record<string, unknown>) {
  return NextResponse.json(dados, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}

function mascararDados(t: string) {
  return t
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[e-mail oculto]')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF oculto]')
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[CNPJ oculto]')
    .replace(/\b(?:\d[ -]?){13,19}\b/g, '[número oculto]')
    .replace(/(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/g, '[telefone oculto]');
}

function numeroEnv(nome: string, padrao: number) {
  const n = Number(process.env[nome]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : padrao;
}

export async function POST(req: NextRequest) {
  try {
    const origem = req.headers.get('origin');
    if (!origem || origem !== req.nextUrl.origin) return resposta(403, { erro: 'Origem não permitida.' });

    const chave = process.env.GROQ_API_KEY?.trim();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const servico = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!chave || !url || !servico) return resposta(503, { erro: 'O áudio ainda não está disponível. Pode escrever?' });

    const tamanho = Number(req.headers.get('content-length') ?? 0);
    if (tamanho > LIMITE_AUDIO + 64 * 1024) return resposta(413, { erro: 'Áudio muito longo. Tente até 1 minuto.' });

    let ip = 'desenvolvimento-local';
    if (process.env.VERCEL === '1') {
      const recebido = req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
      if (!recebido || !isIP(recebido)) return resposta(503, { erro: 'Não foi possível validar o envio.' });
      ip = recebido;
    }
    const admin = createClient(url, servico, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const id = createHmac('sha256', servico).update('eda-ia-v1:').update(`audio-ip:${ip}`).digest('hex');
    const { data: liberado, error } = await admin.rpc('eda_ia_consumir_v1', { p_identificador: id, p_limite: numeroEnv('EDA_IA_LIMITE_AUDIO_DIA', 30) });
    if (error) return resposta(503, { erro: 'A Iara está indisponível agora.' });
    if (liberado !== true) return resposta(429, { erro: 'Muitos áudios por hoje! Pode me escrever que eu continuo te ajudando.' });

    const form = await req.formData().catch(() => null);
    const arquivo = form?.get('audio');
    if (!(arquivo instanceof Blob) || arquivo.size < 800) return resposta(400, { erro: 'Não consegui ouvir o áudio. Tenta de novo?' });
    if (arquivo.size > LIMITE_AUDIO) return resposta(413, { erro: 'Áudio muito longo. Tente até 1 minuto.' });
    const tipo = (arquivo.type || '').split(';')[0].trim().toLowerCase();
    const sub = /^audio\/([a-z0-9.+-]+)$/.exec(tipo)?.[1] ?? (tipo === 'video/webm' ? 'webm' : tipo === 'video/mp4' ? 'mp4' : '');
    const ext = EXTENSOES[sub];
    if (!ext) return resposta(415, { erro: 'Formato de áudio não suportado.' });
    const idiomaBruto = form?.get('idioma');
    const idioma = typeof idiomaBruto === 'string' ? IDIOMAS[idiomaBruto] ?? 'pt' : 'pt';

    const envio = new FormData();
    envio.append('file', arquivo, `audio.${ext}`);
    envio.append('model', process.env.GROQ_MODELO_AUDIO?.trim() || 'whisper-large-v3-turbo');
    envio.append('language', idioma);
    envio.append('temperature', '0');
    envio.append('response_format', 'json');
    // Ajuda o Whisper com nomes regionais.
    envio.append('prompt', 'Barcelos, Rio Negro, Amazonas, Manaus, Parintins, Novo Airão, Ilha do Aracá, tucunaré, igapó, Iara, Encantos da Amazônia.');

    const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}` },
      body: envio,
      signal: AbortSignal.timeout(25_000),
    });
    if (!r.ok) return resposta(502, { erro: 'Não consegui entender o áudio agora. Pode escrever?' });
    const dados = await r.json() as { text?: string };
    const texto = mascararDados((dados.text ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 300);
    if (!texto) return resposta(422, { erro: 'Não ouvi nada no áudio. Tenta falar mais perto do microfone?' });
    return resposta(200, { texto });
  } catch {
    return resposta(500, { erro: 'Não consegui processar o áudio. Pode escrever?' });
  }
}

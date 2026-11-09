import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// EDA_FASE_B_V1
// Grava o pedido do visitante feito pela Iara. Regras (LGPD):
// - só com consentimento explícito (texto do aceite fica registrado);
// - só os dados necessários: nome, um contato, pessoas, período e mensagem;
// - a operadora é definida pelo SERVIDOR a partir do passeio publicado
//   (o navegador nunca escolhe para quem o pedido vai);
// - limite de 5 pedidos por dia por endereço; apagado em 90 dias.

export const runtime = 'nodejs';

const CONSENTIMENTO: Record<string, string> = {
  PT: 'Aceito que a Encantos da Amazônia e a operadora do passeio usem estes dados para entrar em contato sobre este pedido. Os dados são apagados em até 90 dias.',
  EN: 'I agree that Encantos da Amazônia and the tour operator may use this data to contact me about this request. Data is deleted within 90 days.',
  ES: 'Acepto que Encantos da Amazônia y la operadora del paseo usen estos datos para contactarme sobre este pedido. Los datos se eliminan en hasta 90 días.',
};

class Falha extends Error { constructor(public status: number, m: string) { super(m); } }

const resposta = (status: number, dados: Record<string, unknown>) =>
  NextResponse.json(dados, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });

function texto(v: unknown, min: number, max: number, obrigatorio = false): string | null {
  if (v === undefined || v === null || v === '') { if (obrigatorio) throw new Falha(400, 'Preencha os campos obrigatórios.'); return null; }
  if (typeof v !== 'string') throw new Falha(400, 'Dados inválidos.');
  const t = v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  if (t.length < min || t.length > max) throw new Falha(400, 'Confira o tamanho dos campos.');
  return t;
}

function inteiro(v: unknown, min: number, max: number, padrao: number) {
  const n = Number(v ?? padrao);
  if (!Number.isInteger(n) || n < min || n > max) throw new Falha(400, 'Confira o número de pessoas.');
  return n;
}

export async function POST(req: NextRequest) {
  try {
    const origem = req.headers.get('origin');
    if (!origem || origem !== req.nextUrl.origin) throw new Falha(403, 'Origem não permitida.');
    if (req.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new Falha(415, 'Envie em JSON.');

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    const servico = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !anon || !servico) throw new Falha(503, 'Indisponível agora.');

    const bruto = await req.text();
    if (bruto.length > 8 * 1024) throw new Falha(413, 'Pedido muito longo.');
    let d: Record<string, unknown>;
    try { d = JSON.parse(bruto); } catch { throw new Falha(400, 'Dados inválidos.'); }
    if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Falha(400, 'Dados inválidos.');

    const permitidos = new Set(['nome', 'whatsapp', 'email', 'idioma', 'periodo', 'adultos', 'criancas', 'mensagem', 'passeio_slug', 'consentimento', 'sessao']);
    if (Object.keys(d).some(k => !permitidos.has(k))) throw new Falha(400, 'Campos desconhecidos.');
    if (d.consentimento !== true) throw new Falha(400, 'É preciso aceitar o uso dos dados para enviar.');

    const idioma = d.idioma === 'EN' || d.idioma === 'ES' ? d.idioma : 'PT';
    const nome = texto(d.nome, 2, 80, true)!;
    const zapBruto = texto(d.whatsapp, 8, 25);
    const whatsapp = zapBruto ? zapBruto.replace(/[^\d+]/g, '') : null;
    if (whatsapp && !/^\+?\d{10,15}$/.test(whatsapp)) throw new Falha(400, 'Confira o número de WhatsApp.');
    const email = texto(d.email, 5, 254);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Falha(400, 'Confira o e-mail.');
    if (!whatsapp && !email) throw new Falha(400, 'Informe um WhatsApp ou e-mail para contato.');
    const periodo = texto(d.periodo, 1, 60);
    const mensagem = texto(d.mensagem, 1, 800);
    const adultos = inteiro(d.adultos, 1, 99, 1);
    const criancas = inteiro(d.criancas, 0, 99, 0);
    const slug = texto(d.passeio_slug, 1, 160);
    if (slug && !/^[a-z0-9-]+$/.test(slug)) throw new Falha(400, 'Passeio inválido.');

    const opcoes = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
    const admin = createClient(url, servico, opcoes);

    let ip = 'desenvolvimento-local';
    if (process.env.VERCEL === '1') {
      const recebido = req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
      if (!recebido || !isIP(recebido)) throw new Falha(503, 'Não foi possível validar o envio.');
      ip = recebido;
    }
    const id = createHmac('sha256', servico).update('eda-pedido-v1:').update(ip).digest('hex');
    const { data: liberado, error: erroCota } = await admin.rpc('eda_ia_consumir_v1', { p_identificador: id, p_limite: 5 });
    if (erroCota) throw new Falha(503, 'Indisponível agora.');
    if (liberado !== true) throw new Falha(429, 'Você já enviou vários pedidos hoje. Tente amanhã.');

    // A operadora vem do passeio PUBLICADO, consultado no servidor.
    let empresaId: string | null = null;
    let passeioId: string | null = null;
    let passeioNome: string | null = null;
    if (slug) {
      const { data: pub } = await createClient(url, anon, opcoes).rpc('passeios_publicos_eda', { p_slug: slug });
      const item = Array.isArray(pub) ? (pub[0] as { id?: string; nome?: string } | undefined) : undefined;
      if (item?.id) {
        const { data: ps } = await admin.from('passeios').select('id,nome,empresa_id,publicado_portal').eq('id', item.id).maybeSingle();
        if (ps?.publicado_portal) { empresaId = ps.empresa_id; passeioId = ps.id; passeioNome = ps.nome; }
      }
    }

    await admin.rpc('limpar_pedidos_visitante_vencidos');
    const { error } = await admin.from('pedidos_visitante').insert({
      empresa_id: empresaId, passeio_id: passeioId, passeio_nome: passeioNome,
      nome, contato_whatsapp: whatsapp, contato_email: email, idioma, periodo,
      adultos, criancas, mensagem,
      consentimento_em: new Date().toISOString(), consentimento_texto: CONSENTIMENTO[idioma],
    });
    if (error) throw new Falha(503, 'Não foi possível registrar o pedido. Tente de novo.');

    // Métrica do funil da Iara (sem dados pessoais).
    if (typeof d.sessao === 'string' && /^[a-z0-9-]{16,64}$/i.test(d.sessao)) {
      const sessao = createHmac('sha256', servico).update('eda-ia-v1:').update(`iara:${d.sessao}`).digest('hex');
      await admin.from('iara_eventos').upsert(
        ['conversa', 'fechamento', 'pedido'].map(etapa => ({ sessao, etapa, empresa_id: empresaId, passeio_id: passeioId, idioma })),
        { onConflict: 'sessao,etapa', ignoreDuplicates: true },
      );
    }

    return resposta(201, { ok: true, operadora: !!empresaId });
  } catch (e) {
    if (e instanceof Falha) return resposta(e.status, { ok: false, erro: e.message });
    return resposta(503, { ok: false, erro: 'Indisponível agora.' });
  }
}

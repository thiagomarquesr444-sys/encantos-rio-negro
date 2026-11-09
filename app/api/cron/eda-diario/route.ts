// EDA_AUTOMACAO_V1: rotina diária da EDA (Vercel Cron, 06h de Manaus).
// 1) avisos do banco: véspera, recebimentos atrasados, fichas pendentes,
//    pedido de avaliação e (às segundas) relatório semanal;
// 2) alerta de clima por saída dos próximos 3 dias (Open-Meteo, grátis e sem chave).
import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BARCELOS = { lat: -0.975, lng: -62.924 };

function autorizado(req: NextRequest): boolean {
  const segredo = (process.env.CRON_SECRET ?? process.env.ERN_CRON_SECRET)?.trim();
  const recebido = req.headers.get('authorization') ?? '';
  if (!segredo) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(`Bearer ${segredo}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Saida = { empresa_id: string; reserva_id: string; data_reserva: string; passeio: string; latitude: number | null; longitude: number | null };
type Previsao = { time: string[]; precipitation_sum: number[]; weather_code: number[]; wind_gusts_10m_max: number[] };

async function previsao(lat: number, lng: number): Promise<Previsao | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}&daily=precipitation_sum,weather_code,wind_gusts_10m_max&forecast_days=5&timezone=America%2FManaus`;
    const r = await fetch(url, { signal: AbortSignal.timeout(6000), cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json() as { daily?: Previsao };
    return j.daily && Array.isArray(j.daily.time) ? j.daily : null;
  } catch { return null; }
}

function avaliar(chuva: number, codigo: number, rajada: number) {
  const motivos: string[] = [];
  let gravidade: 'atencao' | 'urgente' = 'atencao';
  if (codigo >= 95) { motivos.push('trovoadas'); gravidade = 'urgente'; }
  if (chuva >= 40) { motivos.push(`chuva muito forte (~${Math.round(chuva)} mm)`); gravidade = 'urgente'; }
  else if (chuva >= 20) motivos.push(`chuva forte (~${Math.round(chuva)} mm)`);
  if (rajada >= 60) { motivos.push(`rajadas de vento de até ${Math.round(rajada)} km/h`); gravidade = 'urgente'; }
  else if (rajada >= 45) motivos.push(`rajadas de vento de até ${Math.round(rajada)} km/h`);
  return motivos.length ? { motivos, gravidade } : null;
}

async function executar(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const servico = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !servico) return NextResponse.json({ erro: 'Configuração ausente.' }, { status: 503 });
  const admin = createClient(url, servico, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

  const { data: gerados, error } = await admin.rpc('eda_gerar_avisos_v1');
  if (error) return NextResponse.json({ erro: 'Falha ao gerar avisos.' }, { status: 500 });

  // Clima por saída: agrupa por ponto (arredondado) para gastar poucas consultas.
  let clima = 0;
  const { data: saidas } = await admin.rpc('eda_saidas_proximas_v1', { p_dias: 3 });
  const lista = (Array.isArray(saidas) ? saidas : []) as Saida[];
  const cache = new Map<string, Previsao | null>();
  for (const s of lista.slice(0, 200)) {
    const lat = typeof s.latitude === 'number' ? s.latitude : BARCELOS.lat;
    const lng = typeof s.longitude === 'number' ? s.longitude : BARCELOS.lng;
    const chave = `${lat.toFixed(1)},${lng.toFixed(1)}`;
    if (!cache.has(chave)) { if (cache.size >= 25) continue; cache.set(chave, await previsao(lat, lng)); }
    const p = cache.get(chave);
    if (!p) continue;
    const i = p.time.indexOf(s.data_reserva);
    if (i < 0) continue;
    const alerta = avaliar(Number(p.precipitation_sum[i] ?? 0), Number(p.weather_code[i] ?? 0), Number(p.wind_gusts_10m_max[i] ?? 0));
    if (!alerta) continue;
    const dia = `${s.data_reserva.slice(8, 10)}/${s.data_reserva.slice(5, 7)}`;
    const { error: e2 } = await admin.from('eda_avisos').upsert({
      empresa_id: s.empresa_id,
      tipo: 'clima',
      chave: `clima:${s.reserva_id}:${s.data_reserva}`,
      titulo: `Tempo na saída de ${dia}`,
      texto: `Previsão para "${s.passeio}" em ${dia}: ${alerta.motivos.join(', ')}. Avalie horário, rota e segurança da embarcação e avise os clientes se precisar mudar.`,
      link: '/reservas',
      gravidade: alerta.gravidade,
    }, { onConflict: 'empresa_id,chave', ignoreDuplicates: true });
    if (!e2) clima += 1;
  }

  return NextResponse.json({ ok: true, avisos: gerados ?? 0, clima, saidas: lista.length });
}

export async function GET(req: NextRequest) { return executar(req); }
export async function POST(req: NextRequest) { return executar(req); }

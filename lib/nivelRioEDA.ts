// EDA_NIVEL_RIO_V1: cota do Rio Negro em Barcelos pela telemetria pública da ANA
// (Agência Nacional de Águas). Grátis, sem chave. Só servidor (rotina diária).
// Nada é inventado: sem resposta da ANA, nada é gravado e os agentes não falam do rio.
import type { SupabaseClient } from '@supabase/supabase-js';

const BASES = ['https://telemetriaws1.ana.gov.br/ServiceANA.asmx', 'http://telemetriaws1.ana.gov.br/ServiceANA.asmx'];

async function pedir(metodo: string, params: Record<string, string>): Promise<string | null> {
  const q = new URLSearchParams(params).toString();
  for (const base of BASES) {
    try {
      const r = await fetch(`${base}/${metodo}?${q}`, { signal: AbortSignal.timeout(20_000), cache: 'no-store' });
      if (r.ok) return await r.text();
    } catch { /* tenta a próxima */ }
  }
  return null;
}

// Lê blocos <Tag>…</Tag> como objetos simples (o XML da ANA é plano).
function blocos(xml: string, tag: string): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const o: Record<string, string> = {};
    const campo = /<([A-Za-z0-9_]+)[^>]*>([^<]*)<\/\1>/g;
    let c: RegExpExecArray | null;
    while ((c = campo.exec(m[1]))) o[c[1]] = c[2].trim();
    out.push(o);
  }
  return out;
}

const br = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
const num = (s?: string) => { const n = Number(String(s ?? '').replace(',', '.')); return Number.isFinite(n) && s?.trim() ? n : null; };

// Acha a estação fluviométrica do Rio Negro em Barcelos no inventário da ANA.
async function descobrirEstacao(admin: SupabaseClient): Promise<string | null> {
  const { data: atual } = await admin.from('eda_estacoes_rio').select('codigo').eq('ativa', true).limit(1).maybeSingle();
  if (atual?.codigo) return String(atual.codigo);
  const xml = await pedir('HidroInventario', {
    codEstDE: '', codEstATE: '', tpEst: '1', nmEst: '', nmRio: '', codSubBacia: '', codBacia: '',
    nmMunicipio: 'BARCELOS', nmEstado: 'AMAZONAS', sgResp: '', sgOper: '', telemetrica: '',
  });
  if (!xml) return null;
  const est = blocos(xml, 'Table')
    .filter((t) => /NEGRO/i.test(t.RioNome ?? t.nmRio ?? '') && /BARCELOS/i.test(t.Nome ?? ''))
    .sort((a, b) => Number(b.TipoEstacaoTelemetrica === '1') - Number(a.TipoEstacaoTelemetrica === '1'))[0];
  const codigo = est?.Codigo?.trim();
  if (!codigo || !/^\d{8}$/.test(codigo)) return null;
  await admin.from('eda_estacoes_rio').upsert({
    codigo, nome: est.Nome || 'Barcelos', rio: est.RioNome || 'Rio Negro', municipio: est.nmMunicipio || 'Barcelos',
    latitude: num(est.Latitude), longitude: num(est.Longitude), ativa: true, atualizado_em: new Date().toISOString(),
  });
  return codigo;
}

// Série histórica diária (cotas, cm) — carregada uma vez, para comparar com "o normal da época".
async function carregarHistorico(admin: SupabaseClient, codigo: string): Promise<number> {
  const { count } = await admin.from('eda_nivel_rio').select('data', { count: 'exact', head: true }).eq('estacao', codigo).lt('data', `${new Date().getUTCFullYear()}-01-01`);
  if ((count ?? 0) > 365 * 3) return 0;
  const hoje = new Date();
  const ini = new Date(Date.UTC(hoje.getUTCFullYear() - 15, 0, 1));
  const xml = await pedir('HidroSerieHistorica', { codEstacao: codigo, dataInicio: br(ini), dataFim: br(hoje), tipoDados: '1', nivelConsistencia: '' });
  if (!xml) return 0;
  const dias = new Map<string, { cota: number; consistido: boolean }>();
  for (const m of blocos(xml, 'SerieHistorica')) {
    const base = (m.DataHora ?? '').slice(0, 7); // AAAA-MM
    if (!/^\d{4}-\d{2}$/.test(base)) continue;
    const consistido = m.NivelConsistencia === '2';
    for (let d = 1; d <= 31; d++) {
      const v = num(m[`Cota${String(d).padStart(2, '0')}`]);
      if (v === null) continue;
      const data = `${base}-${String(d).padStart(2, '0')}`;
      const dt = new Date(`${data}T12:00:00Z`);
      if (Number.isNaN(dt.getTime()) || dt.toISOString().slice(0, 10) !== data) continue;
      const ant = dias.get(data);
      if (!ant || (consistido && !ant.consistido)) dias.set(data, { cota: v, consistido });
    }
  }
  const linhas = [...dias].map(([data, x]) => ({ estacao: codigo, data, cota_cm: x.cota, consistido: x.consistido }));
  for (let i = 0; i < linhas.length; i += 1000) await admin.from('eda_nivel_rio').upsert(linhas.slice(i, i + 1000), { onConflict: 'estacao,data' });
  return linhas.length;
}

// Telemetria dos últimos 15 dias: média diária do nível.
async function atualizarRecentes(admin: SupabaseClient, codigo: string): Promise<number> {
  const hoje = new Date();
  const ini = new Date(hoje.getTime() - 15 * 86_400_000);
  const xml = await pedir('DadosHidrometeorologicos', { codEstacao: codigo, dataInicio: br(ini), dataFim: br(hoje) });
  if (!xml) return 0;
  const soma = new Map<string, { t: number; n: number }>();
  for (const r of blocos(xml, 'DadosHidrometereologicos')) {
    const v = num(r.Nivel);
    const data = (r.DataHora ?? '').slice(0, 10);
    if (v === null || !/^\d{4}-\d{2}-\d{2}$/.test(data)) continue;
    const s = soma.get(data) ?? { t: 0, n: 0 };
    s.t += v; s.n += 1; soma.set(data, s);
  }
  const linhas = [...soma].map(([data, s]) => ({ estacao: codigo, data, cota_cm: Math.round(s.t / s.n), consistido: false, coletado_em: new Date().toISOString() }));
  if (linhas.length) await admin.from('eda_nivel_rio').upsert(linhas, { onConflict: 'estacao,data' });
  return linhas.length;
}

export async function atualizarNivelRio(admin: SupabaseClient): Promise<{ estacao: string | null; historico: number; recentes: number }> {
  try {
    const codigo = await descobrirEstacao(admin);
    if (!codigo) return { estacao: null, historico: 0, recentes: 0 };
    const historico = await carregarHistorico(admin, codigo);
    const recentes = await atualizarRecentes(admin, codigo);
    return { estacao: codigo, historico, recentes };
  } catch {
    return { estacao: null, historico: 0, recentes: 0 };
  }
}

export type SituacaoRioEDA = {
  estacao: string; codigo: string; rio: string | null; fonte: string; data: string; cota_cm: number;
  variacao_7d_cm: number | null; tendencia: string | null; anos_comparados: number;
  normal_p50_cm: number | null; comparacao: string | null; dias_desde_medicao: number;
};

// Linha de contexto para os agentes: só o que foi medido, com fonte e data.
export function linhaRioAgentes(s: SituacaoRioEDA | null): string {
  if (!s || s.dias_desde_medicao > 5) return '';
  const d = `${s.data.slice(8, 10)}/${s.data.slice(5, 7)}`;
  const partes = [`cota ${s.cota_cm} cm em ${d}`];
  if (s.tendencia) partes.push(`${s.tendencia}${s.variacao_7d_cm !== null ? ` (${s.variacao_7d_cm > 0 ? '+' : ''}${s.variacao_7d_cm} cm em 7 dias)` : ''}`);
  if (s.comparacao) partes.push(`${s.comparacao} (comparado a ${s.anos_comparados} anos)`);
  return `\nRIO NEGRO EM BARCELOS (dado oficial medido — fonte ${s.fonte}, estação ${s.estacao}): ${partes.join('; ')}. `
    + 'Use só como contexto geral do rio; não é previsão nem garantia de navegação. Cada trecho tem condições próprias: oriente confirmar com o guia/prático.';
}

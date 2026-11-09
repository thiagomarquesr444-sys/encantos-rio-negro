import { supabase } from '@/lib/supabase';

// EDA_REACOES_V1: reações amazônicas (uma por pessoa por publicação).
// Busca em lote: vários cards pedindo ao mesmo tempo viram 2 consultas só.

export const REACOES = ['quero_ir', 'lindeza', 'encantei', 'pai_degua', 'cultura'] as const;
export type Reacao = (typeof REACOES)[number];
export type EstadoReacoes = { minha: Reacao | null; contagens: Record<Reacao, number> };

const vazio = (): Record<Reacao, number> => ({ quero_ir: 0, lindeza: 0, encantei: 0, pai_degua: 0, cultura: 0 });
const ehReacao = (v: unknown): v is Reacao => typeof v === 'string' && (REACOES as readonly string[]).includes(v);

let fila: { id: string; resolver: (e: EstadoReacoes) => void }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

async function processar() {
  const lote = fila; fila = []; timer = null;
  const ids = [...new Set(lote.map(x => x.id))].slice(0, 200);
  const estados = new Map<string, EstadoReacoes>(ids.map(id => [id, { minha: null, contagens: vazio() }]));
  try {
    const [{ data: totais }, { data: sessao }] = await Promise.all([
      supabase.rpc('contagem_reacoes_eda', { p_ids: ids }),
      supabase.auth.getSession(),
    ]);
    for (const t of (Array.isArray(totais) ? totais : []) as { publicacao_id: string; reacao: string; total: number }[]) {
      const e = estados.get(t.publicacao_id);
      if (e && ehReacao(t.reacao)) e.contagens[t.reacao] = Number(t.total) || 0;
    }
    if (sessao.session) {
      const { data: minhas } = await supabase.from('reacoes_publicacoes').select('publicacao_id,reacao').in('publicacao_id', ids);
      for (const m of (minhas ?? []) as { publicacao_id: string; reacao: string }[]) {
        const e = estados.get(m.publicacao_id);
        if (e && ehReacao(m.reacao)) e.minha = m.reacao;
      }
    }
  } catch { /* sem rede: mostra zerado */ }
  for (const item of lote) item.resolver(estados.get(item.id) ?? { minha: null, contagens: vazio() });
}

export function carregarReacoes(publicacaoId: string): Promise<EstadoReacoes> {
  return new Promise(resolver => {
    fila.push({ id: publicacaoId, resolver });
    if (!timer) timer = setTimeout(() => void processar(), 40);
  });
}

export class ReacaoSemLogin extends Error {}

/** Define (ou remove, com null) a reação do usuário na publicação. */
export async function definirReacao(publicacaoId: string, reacao: Reacao | null) {
  const { data } = await supabase.auth.getSession();
  const usuario = data.session?.user;
  if (!usuario) throw new ReacaoSemLogin('Entre para reagir.');
  if (reacao === null) {
    const { error } = await supabase.from('reacoes_publicacoes').delete().eq('usuario_id', usuario.id).eq('publicacao_id', publicacaoId);
    if (error) throw error;
    return;
  }
  if (!ehReacao(reacao)) throw new Error('Reação inválida.');
  const { error } = await supabase.from('reacoes_publicacoes')
    .upsert({ usuario_id: usuario.id, publicacao_id: publicacaoId, reacao, created_at: new Date().toISOString() }, { onConflict: 'usuario_id,publicacao_id' });
  if (error) throw error;
}

'use client';
import '@/app/components/padrao-paginas-eda.css';

// EDA_FEEDBACKS_PAINEL_V1: feedbacks dos usuários para administradores da plataforma.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Item = {
  id: string; criado_em: string; estado: string; origem: string; categoria: string; caminho: string;
  mensagem: string; contato_email: string | null; nota: number | null; empresa: string; autor: string;
};
type Painel = {
  resumo: { total: number; novos: number; nota_media: number | null; por_categoria: Record<string, number> };
  por_pagina: { caminho: string; n: number; nota_media: number | null }[];
  itens: Item[];
};

const ESTADOS: [string, string][] = [['novo', 'Novo'], ['em_analise', 'Em análise'], ['resolvido', 'Resolvido'], ['arquivado', 'Arquivado']];
const CATEGORIA: Record<string, string> = { problema: 'Problema', sugestao: 'Sugestão', experiencia: 'Experiência' };
const NOTA = ['', 'Ruim', 'Razoável', 'Boa', 'Ótima'];

// A mensagem chega como "[pergunta] … [resposta] … [detalhe] … [pagina] …".
function partes(msg: string) {
  const pega = (k: string) => msg.match(new RegExp(`\\[${k}\\] ([^\\n]*)`))?.[1]?.trim() ?? '';
  const pergunta = pega('pergunta').replace(/^geral:\s*/, '');
  const detalhe = pega('detalhe');
  return { pergunta, detalhe: detalhe === '-' ? '' : detalhe, livre: pergunta ? '' : msg };
}
const quando = (d: string) => new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Manaus', dateStyle: 'short', timeStyle: 'short' });

export default function FeedbacksPage() {
  const [estado, setEstado] = useState<string>('');
  const [dias, setDias] = useState(90);
  const [dados, setDados] = useState<Painel | null>(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc('feedbacks_plataforma_eda', { p_estado: estado || null, p_dias: dias });
    if (error) { setErro(error.message.includes('SEM_PERMISSAO') ? 'Área exclusiva da administração da plataforma.' : 'Não foi possível carregar os feedbacks.'); return; }
    setErro(''); setDados(data as Painel);
  }, [estado, dias]);
  useEffect(() => { void carregar(); }, [carregar]);

  async function mudar(id: string, novo: string) {
    const { error } = await supabase.rpc('atualizar_feedback_eda', { p_id: id, p_estado: novo });
    if (error) { setErro('Não foi possível atualizar.'); return; }
    void carregar();
  }

  const r = dados?.resumo;
  return (
    <main className="eda-pg eda-pg-auto eda-pg-legado min-h-screen px-4 py-8 sm:px-8"><div className="mx-auto max-w-5xl space-y-6">
      <Link href="/comando/publicacoes" className="inline-flex min-h-11 items-center text-sm text-[var(--ern-destaque)]">← Comando EDA</Link>
      <header>
        <p className="text-xs uppercase tracking-[.2em] text-[var(--ern-destaque)]">Comando EDA</p>
        <h1 className="mt-2 text-3xl">Feedbacks dos usuários</h1>
        <p className="mt-2 text-sm text-[var(--ern-secundario)]">Respostas enviadas pelo botão de feedback da plataforma e do portal.</p>
      </header>

      {erro && <p role="alert" className="text-sm text-[var(--ern-erro)]">{erro}</p>}

      {r && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Total', String(r.total)],
            ['Novos', String(r.novos)],
            ['Nota média', r.nota_media != null ? `${r.nota_media}/4` : '—'],
            ['Problemas', String(r.por_categoria.problema ?? 0)],
          ].map(([t, v]) => (
            <div key={t} className="rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-4">
              <p className="text-xs text-[var(--ern-secundario)]">{t}</p><p className="mt-1 text-2xl font-semibold">{v}</p>
            </div>
          ))}
        </div>
      )}

      {dados && dados.por_pagina.length > 0 && (
        <section className="rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--ern-destaque)]">Por página</p>
          <ul className="mt-2 divide-y divide-[var(--ern-borda)] text-sm">
            {dados.por_pagina.map((p) => (
              <li key={p.caminho} className="flex justify-between gap-3 py-2">
                <Link href={p.caminho} className="underline">{p.caminho}</Link>
                <span>{p.n} resposta(s){p.nota_media != null ? ` · nota ${p.nota_media}/4` : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {[['', 'Todos'], ...ESTADOS].map(([v, t]) => (
          <button key={v} type="button" aria-pressed={estado === v} onClick={() => setEstado(v)}
            className={`min-h-10 rounded-full border px-4 text-xs ${estado === v ? 'border-[var(--ern-destaque)] bg-[var(--ern-destaque)] font-bold text-[#10140f]' : 'border-[var(--ern-borda)]'}`}>{t}</button>
        ))}
        <select aria-label="Período" value={dias} onChange={(e) => setDias(Number(e.target.value))}
          className="ml-auto min-h-10 rounded-xl border border-[var(--ern-borda)] bg-transparent px-3 text-sm">
          <option value={30}>Últimos 30 dias</option><option value={90}>Últimos 90 dias</option><option value={365}>Último ano</option>
        </select>
      </div>

      {!dados && !erro && <p role="status" className="text-sm">Carregando…</p>}
      {dados && dados.itens.length === 0 && <p className="text-sm text-[var(--ern-secundario)]">Nenhum feedback neste filtro.</p>}

      <ul className="space-y-3">
        {dados?.itens.map((f) => {
          const m = partes(f.mensagem);
          return (
            <li key={f.id} className="rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-[var(--ern-secundario)]">
                    {quando(f.criado_em)} · {CATEGORIA[f.categoria] ?? f.categoria} · {f.origem === 'portal' ? 'Portal' : 'Operadora'} · <Link href={f.caminho} className="underline">{f.caminho}</Link>
                  </p>
                  {f.nota != null && <p className="mt-1 text-lg font-semibold">{f.nota}/4 · {NOTA[f.nota] ?? ''}</p>}
                  {m.pergunta && <p className="text-sm text-[var(--ern-secundario)]">{m.pergunta}</p>}
                  {(m.detalhe || m.livre) && <p className="mt-2 whitespace-pre-wrap text-sm">{m.detalhe || m.livre}</p>}
                  <p className="mt-2 text-xs text-[var(--ern-secundario)]">
                    {[f.autor, f.empresa].filter(Boolean).join(' · ') || 'Visitante'}
                    {f.contato_email && <> · <a href={`mailto:${f.contato_email}`} className="underline">{f.contato_email}</a></>}
                  </p>
                </div>
                <select aria-label="Situação" value={f.estado} onChange={(e) => void mudar(f.id, e.target.value)}
                  className="min-h-10 rounded-xl border border-[var(--ern-borda)] bg-transparent px-3 text-sm">
                  {ESTADOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
              </div>
            </li>
          );
        })}
      </ul>
    </div></main>
  );
}

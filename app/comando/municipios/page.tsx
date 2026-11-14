'use client';
import '@/app/components/padrao-paginas-eda.css';

// IARA_FICHAS_PAINEL_V1: o CEO revisa e aprova as fichas dos municípios que a
// Iara usa como fonte. Leitura pública; gravar exige acesso editorial (RPC).

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Festa = { nome: string; quando?: string; detalhe?: string };
type Ficha = {
  ibge: string; nome: string; regiao: string; resumo: string; festas: Festa[];
  culinaria: string[]; artesanato: string[]; pontos: string[]; natureza: string[]; lendas: string[];
  cuidados: string; fontes: string[]; status: 'rascunho' | 'verificada'; atualizado_em: string;
};

const LISTAS: [keyof Ficha, string][] = [
  ['culinaria', 'Culinária'], ['artesanato', 'Artesanato'], ['pontos', 'Pontos turísticos'],
  ['natureza', 'Floresta e áreas protegidas'], ['lendas', 'Lendas'],
];
const linhas = (v: string[]) => v.join('\n');
const deLinhas = (t: string) => t.split('\n').map(s => s.trim()).filter(Boolean);
const festasTexto = (f: Festa[]) => f.map(x => [x.nome, x.quando ?? '', x.detalhe ?? ''].join(' | ')).join('\n');
const deFestas = (t: string): Festa[] => deLinhas(t).map(l => {
  const [nome, quando, detalhe] = l.split('|').map(s => s.trim());
  return { nome, ...(quando ? { quando } : {}), ...(detalhe ? { detalhe } : {}) };
}).filter(f => f.nome);

export default function FichasMunicipiosPage() {
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [sel, setSel] = useState<string>('');
  const [form, setForm] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [filtro, setFiltro] = useState<'todas' | 'rascunho' | 'verificada'>('todas');

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('municipios_conhecimento').select('*').order('nome');
    if (error) { setMsg('Não foi possível carregar as fichas.'); return; }
    setFichas((data ?? []) as Ficha[]);
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  const atual = fichas.find(f => f.ibge === sel) ?? null;
  useEffect(() => {
    if (!atual) return;
    setMsg('');
    setForm({
      resumo: atual.resumo, festas: festasTexto(atual.festas ?? []), cuidados: atual.cuidados,
      ...Object.fromEntries(LISTAS.map(([k]) => [k, linhas((atual[k] as string[]) ?? [])])),
    });
  }, [atual]);

  const visiveis = useMemo(() => fichas.filter(f => filtro === 'todas' || f.status === filtro), [fichas, filtro]);
  const verificadas = fichas.filter(f => f.status === 'verificada').length;

  async function salvar(status: 'rascunho' | 'verificada') {
    if (!atual) return;
    setSalvando(true); setMsg('');
    const dados = {
      resumo: form.resumo ?? '', cuidados: form.cuidados ?? '', festas: deFestas(form.festas ?? ''), status,
      ...Object.fromEntries(LISTAS.map(([k]) => [k, deLinhas(form[k as string] ?? '')])),
    };
    const { error } = await supabase.rpc('salvar_ficha_municipio_eda', { p_ibge: atual.ibge, p_dados: dados });
    setSalvando(false);
    if (error) { setMsg(error.message.includes('SEM_PERMISSAO') ? 'Área exclusiva da administração da plataforma.' : 'Não foi possível salvar.'); return; }
    setMsg(status === 'verificada' ? 'Ficha aprovada. A Iara já usa esta versão.' : 'Rascunho salvo.');
    void carregar();
  }

  const campo = 'w-full rounded-xl border border-[var(--ern-borda)] bg-transparent p-3 text-sm leading-6';

  return (
    <main className="eda-pg eda-pg-auto eda-pg-legado min-h-screen px-4 py-8 sm:px-8"><div className="mx-auto max-w-6xl space-y-6">
      <Link href="/comando/publicacoes" className="inline-flex min-h-11 items-center text-sm text-[var(--ern-destaque)]">← Comando EDA</Link>
      <header>
        <p className="text-xs uppercase tracking-[.2em] text-[var(--ern-destaque)]">Comando EDA · Iara</p>
        <h1 className="mt-2 text-3xl">Fichas dos municípios</h1>
        <p className="mt-2 text-sm text-[var(--ern-secundario)]">
          A Iara só afirma o que está aqui. {verificadas} de {fichas.length} fichas aprovadas · 62 municípios no Amazonas.
        </p>
      </header>

      {msg && <p role="status" className="text-sm text-[var(--ern-destaque)]">{msg}</p>}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="flex gap-2">
            {(['todas', 'rascunho', 'verificada'] as const).map(v => (
              <button key={v} type="button" aria-pressed={filtro === v} onClick={() => setFiltro(v)}
                className={`min-h-9 rounded-full border px-3 text-xs ${filtro === v ? 'border-[var(--ern-destaque)] bg-[var(--ern-destaque)] font-bold text-[#10140f]' : 'border-[var(--ern-borda)]'}`}>
                {v === 'todas' ? 'Todas' : v === 'rascunho' ? 'Rascunho' : 'Aprovadas'}
              </button>
            ))}
          </div>
          <ul className="max-h-[70vh] space-y-1 overflow-auto rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-2">
            {visiveis.map(f => (
              <li key={f.ibge}>
                <button type="button" onClick={() => setSel(f.ibge)} aria-current={sel === f.ibge}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm ${sel === f.ibge ? 'bg-[var(--ern-destaque)]/15' : 'hover:bg-white/5'}`}>
                  <span><b className="block">{f.nome}</b><small className="text-[var(--ern-secundario)]">{f.regiao}</small></span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${f.status === 'verificada' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {f.status === 'verificada' ? 'Aprovada' : 'Rascunho'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {!atual ? (
          <p className="rounded-2xl border border-dashed border-[var(--ern-borda)] p-8 text-sm text-[var(--ern-secundario)]">Escolha um município para revisar a ficha.</p>
        ) : (
          <section className="space-y-4 rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-5">
            <h2 className="text-2xl">{atual.nome}</h2>
            <label className="block space-y-1 text-sm"><span>Resumo</span>
              <textarea rows={3} className={campo} value={form.resumo ?? ''} onChange={e => setForm(f => ({ ...f, resumo: e.target.value }))} />
            </label>
            <label className="block space-y-1 text-sm"><span>Festas — uma por linha: <i>nome | quando | detalhe</i></span>
              <textarea rows={4} className={campo} value={form.festas ?? ''} onChange={e => setForm(f => ({ ...f, festas: e.target.value }))} />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              {LISTAS.map(([k, rotulo]) => (
                <label key={k} className="block space-y-1 text-sm"><span>{rotulo} — um por linha</span>
                  <textarea rows={4} className={campo} value={form[k as string] ?? ''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                </label>
              ))}
            </div>
            <label className="block space-y-1 text-sm"><span>Cuidados</span>
              <textarea rows={2} className={campo} value={form.cuidados ?? ''} onChange={e => setForm(f => ({ ...f, cuidados: e.target.value }))} />
            </label>
            {atual.fontes?.length > 0 && (
              <div className="text-xs text-[var(--ern-secundario)]">
                <p className="font-semibold">Fontes da pesquisa</p>
                <ul className="mt-1 list-disc pl-5">{atual.fontes.map(u => <li key={u} className="break-all">{/^https?:/.test(u) ? <a href={u} target="_blank" rel="noopener noreferrer" className="underline">{u}</a> : u}</li>)}</ul>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <button type="button" disabled={salvando} onClick={() => void salvar('rascunho')}
                className="min-h-11 rounded-full border border-[var(--ern-borda)] px-5 text-sm">Salvar rascunho</button>
              <button type="button" disabled={salvando} onClick={() => void salvar('verificada')}
                className="min-h-11 rounded-full bg-[var(--ern-destaque)] px-5 text-sm font-bold text-[#10140f]">Aprovar ficha</button>
            </div>
          </section>
        )}
      </div>
    </div></main>
  );
}

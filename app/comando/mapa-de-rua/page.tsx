'use client';
import '@/app/components/padrao-paginas-eda.css';

// IARA_PASSEIO_RUAS_V1: Comando EDA → Mapa de rua. O CEO cadastra os pontos
// turísticos e as paradas pelo caminho que a Iara usa no "passeio pelas ruas".
// Leitura dos rascunhos e gravação exigem acesso editorial (RLS + RPC).

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { MUNICIPIOS_AMAZONAS } from '@/lib/municipiosAmazonasERN';
import { chaveEmbedGoogle } from '@/app/components/SateliteCidadeERN';
import { urlRuaEmbed, type ParadaRua, type PontoRua } from '@/lib/pontosRuaIara';
import { confirmarEDA } from '@/lib/dialogoEDA';

type Form = { municipio_ibge: string; nome: string; apelidos: string; lat: string; lng: string; heading: string; fala: string; paradas: string };
const VAZIO: Form = { municipio_ibge: '', nome: '', apelidos: '', lat: '', lng: '', heading: '0', fala: '', paradas: '' };

const paradasTexto = (ps: ParadaRua[]) => ps.map((p) => `${p.nome} | ${p.lat}, ${p.lng} | ${p.heading ?? 0} | ${p.fala ?? ''}`).join('\n');
function deParadas(t: string): { paradas: ParadaRua[]; erro: string } {
  const paradas: ParadaRua[] = [];
  const linhas = t.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const [n, l] of linhas.entries()) {
    const [nome, coords, dir, ...resto] = l.split('|').map((x) => x.trim());
    const [lat, lng] = (coords ?? '').split(',').map((x) => Number(x.trim()));
    if (!nome || !Number.isFinite(lat) || !Number.isFinite(lng)) return { paradas, erro: `Parada ${n + 1}: use "nome | lat, lng | direção | fala".` };
    paradas.push({ nome, lat, lng, heading: Math.max(0, Math.min(359, Number(dir) || 0)), fala: resto.join('|').trim() });
  }
  return { paradas, erro: linhas.length > 8 ? 'No máximo 8 paradas.' : '' };
}

export default function MapaDeRuaComandoPage() {
  const [pontos, setPontos] = useState<PontoRua[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(VAZIO);
  const [previa, setPrevia] = useState(0);
  const [msg, setMsg] = useState('');
  const [salvando, setSalvando] = useState(false);
  const chave = chaveEmbedGoogle();

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('iara_pontos_rua').select('*').order('municipio').order('nome');
    if (error) { setMsg('Não foi possível carregar os pontos.'); return; }
    setPontos((data ?? []) as PontoRua[]);
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  function abrir(p: PontoRua | null) {
    setSel(p?.id ?? null); setPrevia(0); setMsg('');
    setForm(p ? {
      municipio_ibge: p.municipio_ibge, nome: p.nome, apelidos: p.apelidos.join(', '), lat: String(p.lat), lng: String(p.lng),
      heading: String(p.heading), fala: p.fala, paradas: paradasTexto(Array.isArray(p.paradas) ? p.paradas : []),
    } : VAZIO);
  }

  const { paradas, erro: erroParadas } = useMemo(() => deParadas(form.paradas), [form.paradas]);
  const final: ParadaRua | null = Number.isFinite(Number(form.lat)) && Number.isFinite(Number(form.lng)) && form.lat && form.lng
    ? { nome: form.nome || 'Ponto final', lat: Number(form.lat), lng: Number(form.lng), heading: Number(form.heading) || 0, fala: form.fala }
    : null;
  const roteiro = [...paradas, ...(final ? [final] : [])];
  const paradaPrevia = roteiro[Math.min(previa, roteiro.length - 1)] ?? null;
  const municipio = MUNICIPIOS_AMAZONAS.find((m) => m.ibge === form.municipio_ibge);

  async function salvar(status: 'rascunho' | 'publicado') {
    if (!municipio) { setMsg('Escolha o município.'); return; }
    if (!final || form.nome.trim().length < 2) { setMsg('Informe o nome e as coordenadas do ponto final.'); return; }
    if (erroParadas) { setMsg(erroParadas); return; }
    setSalvando(true); setMsg('');
    const { data, error } = await supabase.rpc('salvar_ponto_rua_eda', {
      p_id: sel,
      p_dados: {
        municipio_ibge: municipio.ibge, municipio: municipio.nome, nome: form.nome.trim(),
        apelidos: form.apelidos.split(',').map((a) => a.trim()).filter(Boolean),
        lat: final.lat, lng: final.lng, heading: final.heading, fala: form.fala.trim(), paradas, status,
      },
    });
    setSalvando(false);
    if (error) { setMsg(error.message.includes('SEM_PERMISSAO') ? 'Área exclusiva da administração da plataforma.' : error.message || 'Não foi possível salvar.'); return; }
    setSel(String(data));
    setMsg(status === 'publicado' ? 'Publicado. A Iara já leva os visitantes até aqui.' : 'Rascunho salvo (a Iara ainda não usa).');
    void carregar();
  }

  async function excluir() {
    if (!sel || !(await confirmarEDA('O ponto sai do passeio da Iara. Esta ação não pode ser desfeita.', { titulo: 'Excluir este ponto?', confirmar: 'Excluir', cancelar: 'Voltar', perigo: true }))) return;
    const { error } = await supabase.rpc('excluir_ponto_rua_eda', { p_id: sel });
    if (error) { setMsg('Não foi possível excluir.'); return; }
    abrir(null); void carregar();
  }

  const campo = 'w-full rounded-xl border border-[var(--ern-borda)] bg-transparent p-3 text-sm';
  const atualizar = (k: keyof Form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <main className="eda-pg eda-pg-auto eda-pg-legado min-h-screen px-4 py-8 sm:px-8"><div className="mx-auto max-w-6xl space-y-6">
      <Link href="/comando" className="inline-flex min-h-11 items-center text-sm text-[var(--ern-destaque)]">← Comando EDA</Link>
      <header>
        <p className="text-xs uppercase tracking-[.2em] text-[var(--ern-destaque)]">Comando EDA · Iara</p>
        <h1 className="mt-2 text-3xl">Mapa de rua</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--ern-secundario)]">
          Pontos turísticos para o passeio pelas ruas: o visitante pede “quero ver o Bumbódromo” e a Iara voa até a cidade e segue pelas paradas até o ponto.
          Só os pontos <b>publicados</b> são usados. Confira cada parada na prévia antes de publicar (onde não há imagem de rua, o visitante pode trocar para satélite).
        </p>
      </header>

      {msg && <p role="status" className="text-sm text-[var(--ern-destaque)]">{msg}</p>}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <button type="button" onClick={() => abrir(null)} className="min-h-11 w-full rounded-full bg-[var(--ern-destaque)] px-4 text-sm font-bold text-[#10140f]">+ Novo ponto</button>
          <ul className="max-h-[70vh] space-y-1 overflow-auto rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-2">
            {pontos.length === 0 && <li className="p-3 text-xs text-[var(--ern-secundario)]">Nenhum ponto ainda.</li>}
            {pontos.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => abrir(p)} aria-current={sel === p.id}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm ${sel === p.id ? 'bg-[var(--ern-destaque)]/15' : 'hover:bg-white/5'}`}>
                  <span><b className="block">{p.nome}</b><small className="text-[var(--ern-secundario)]">{p.municipio} · {(p.paradas?.length ?? 0) + 1} parada(s)</small></span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.status === 'publicado' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {p.status === 'publicado' ? 'Publicado' : 'Rascunho'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="space-y-4 rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1 text-sm"><span>Nome do ponto turístico</span>
              <input className={campo} value={form.nome} onChange={atualizar('nome')} placeholder="Bumbódromo de Parintins" />
            </label>
            <label className="block space-y-1 text-sm"><span>Município</span>
              <select className={campo} value={form.municipio_ibge} onChange={atualizar('municipio_ibge')}>
                <option value="">Escolha…</option>
                {MUNICIPIOS_AMAZONAS.map((m) => <option key={m.ibge} value={m.ibge}>{m.nome}</option>)}
              </select>
            </label>
          </div>
          <label className="block space-y-1 text-sm"><span>Como o visitante pode chamar (separe por vírgula)</span>
            <input className={campo} value={form.apelidos} onChange={atualizar('apelidos')} placeholder="bumbodromo, arena dos bois" />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block space-y-1 text-sm"><span>Latitude</span><input className={campo} inputMode="decimal" value={form.lat} onChange={atualizar('lat')} placeholder="-2.6340" /></label>
            <label className="block space-y-1 text-sm"><span>Longitude</span><input className={campo} inputMode="decimal" value={form.lng} onChange={atualizar('lng')} placeholder="-56.7380" /></label>
            <label className="block space-y-1 text-sm"><span>Direção da câmera (0–359°)</span><input className={campo} type="number" min={0} max={359} value={form.heading} onChange={atualizar('heading')} /></label>
          </div>
          <p className="text-xs text-[var(--ern-secundario)]">Dica: no Google Maps, clique com o botão direito no lugar e copie as coordenadas. Direção: 0 = norte, 90 = leste, 180 = sul, 270 = oeste.</p>
          <label className="block space-y-1 text-sm"><span>Fala da Iara ao chegar</span>
            <textarea rows={2} className={campo} value={form.fala} onChange={atualizar('fala')} maxLength={400} />
          </label>
          <label className="block space-y-1 text-sm"><span>Paradas pelo caminho (até 8) — uma por linha: <i>nome | lat, lng | direção | fala</i></span>
            <textarea rows={4} className={`${campo} font-mono text-xs`} value={form.paradas} onChange={atualizar('paradas')} placeholder="Orla de Parintins | -2.6270, -56.7360 | 180 | Saímos da orla, onde chegam os barcos." />
          </label>
          {erroParadas && <p className="text-xs text-red-400">{erroParadas}</p>}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <b>Prévia:</b>
              {roteiro.map((p, k) => (
                <button key={`${p.nome}-${k}`} type="button" aria-pressed={previa === k} onClick={() => setPrevia(k)}
                  className={`min-h-8 rounded-full border px-3 ${previa === k ? 'border-[var(--ern-destaque)] bg-[var(--ern-destaque)] font-bold text-[#10140f]' : 'border-[var(--ern-borda)]'}`}>
                  {k + 1}. {p.nome}
                </button>
              ))}
            </div>
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-[var(--ern-borda)] bg-[#05100c]">
              {chave && paradaPrevia
                ? <iframe key={`${paradaPrevia.lat},${paradaPrevia.lng},${paradaPrevia.heading}`} title="Prévia da Vista da rua" src={urlRuaEmbed(chave, paradaPrevia, 'rua')} className="absolute inset-0 h-full w-full border-0" loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
                : <p className="grid h-full place-items-center p-6 text-center text-sm text-[var(--ern-secundario)]">{chave ? 'Informe as coordenadas para ver a prévia.' : 'Chave do Google Maps Embed não configurada.'}</p>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" disabled={salvando} onClick={() => void salvar('rascunho')} className="min-h-11 rounded-full border border-[var(--ern-borda)] px-5 text-sm">Salvar rascunho</button>
            <button type="button" disabled={salvando} onClick={() => void salvar('publicado')} className="min-h-11 rounded-full bg-[var(--ern-destaque)] px-5 text-sm font-bold text-[#10140f]">Publicar para a Iara</button>
            {sel && <button type="button" disabled={salvando} onClick={() => void excluir()} className="min-h-11 rounded-full border border-red-500/50 px-5 text-sm text-red-400">Excluir</button>}
          </div>
        </section>
      </div>
    </div></main>
  );
}

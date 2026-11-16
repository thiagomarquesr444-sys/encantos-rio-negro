'use client';

// EDA_OPERACAO_AO_VIVO_V1: central de comando da operação contratada.
// O dono/gestor acompanha, mesmo longe da viagem: onde a embarcação está,
// etapas, ocorrências, saúde (contagens), equipe e se os suprimentos cobrem
// quem viaja e por quantos dias. Atualiza sozinha a cada 30 segundos.

import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { Map as Mapa, LayerGroup } from 'leaflet';
import { supabase } from '@/lib/supabase';
import { CabecalhoEDA, PaginaEDA, PillEDA, VazioEDA, type TomEDA } from '@/app/components/PadraoPaginaEDA';
import BordoEDA from '@/app/components/BordoEDA';
import { copiarEDA } from '@/lib/copiarEDA';
import {
  alertasViagem, faseViagem, ROTULO_EVENTO, tempoRelativo, minutosDesde,
  analisarRota, formatarDistancia, duracao,
  type ViagemAoVivoEDA, type AlertaOperacaoEDA, type RotaEDA, type ParadaRotaEDA,
} from '@/lib/operacaoAoVivoEDA';

const BARCELOS: [number, number] = [-0.975, -62.924];
const dt = (d: string) => d.split('-').reverse().slice(0, 2).join('/');
const hora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Manaus', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const COR: Record<'er' | 'at' | 'ok' | 'nt' | 'info', string> = { er: '#ef4444', at: '#f2c86b', ok: '#5cc49a', nt: '#93a79d', info: '#8cc3f2' };

function tomGeral(alertas: AlertaOperacaoEDA[]): TomEDA {
  if (alertas.some((a) => a.tom === 'er')) return 'er';
  if (alertas.some((a) => a.tom === 'at')) return 'at';
  return 'ok';
}

export default function OperacaoAoVivoPage() {
  const [viagens, setViagens] = useState<ViagemAoVivoEDA[] | null>(null);
  const [erro, setErro] = useState('');
  const [atualizado, setAtualizado] = useState<string | null>(null);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [bordo, setBordo] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc('operacao_ao_vivo_eda');
    if (error) {
      setErro(error.message.includes('PERMISSAO') ? 'Seu acesso não inclui Reservas. Peça ao administrador da empresa.' : 'Não foi possível atualizar agora. Tentando de novo em instantes.');
      setViagens((v) => v ?? []);
      return;
    }
    setErro('');
    setViagens((data ?? []) as ViagemAoVivoEDA[]);
    setAtualizado(new Date().toISOString());
  }, []);

  useEffect(() => {
    const primeira = window.setTimeout(() => void carregar(), 0);
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') void carregar(); }, 30_000);
    const relogio = window.setInterval(() => setTick((n) => n + 1), 30_000);
    const voltar = () => { if (document.visibilityState === 'visible') void carregar(); };
    document.addEventListener('visibilitychange', voltar);
    return () => { window.clearTimeout(primeira); window.clearInterval(t); window.clearInterval(relogio); document.removeEventListener('visibilitychange', voltar); };
  }, [carregar]);

  const lista = useMemo(() => (viagens ?? []).map((v) => {
    const alertas = alertasViagem(v);
    return { v, alertas, fase: faseViagem(v), tom: tomGeral(alertas) };
  }), [viagens]);

  const pontosMapa = useMemo(() => lista.map((x) => ({ v: x.v, tom: x.tom })), [lista]);
  const atual = lista.find((x) => x.v.chave === selecionada) ?? lista[0] ?? null;
  const emCurso = lista.filter((x) => x.fase.emCurso).length;
  const criticos = lista.filter((x) => x.tom === 'er').length;
  const pessoas = lista.filter((x) => x.fase.emCurso).reduce((n, x) => n + x.v.pessoas, 0);

  return (
    <PaginaEDA>
      <div className="eda-pg-miolo">
        <CabecalhoEDA
          capa
          etiqueta="Operação"
          titulo="Operação ao vivo"
          resumo={viagens === null ? 'Carregando a operação…' : (
            <><b>{emCurso}</b> viagem(ns) em curso · <b>{pessoas}</b> pessoa(s) na água · {criticos ? <b style={{ color: '#ef4444' }}>{criticos} com alerta crítico</b> : 'nenhum alerta crítico'}
              {atualizado && <> · atualizado {tempoRelativo(atualizado)}</>}</>
          )}
          acoes={<>
            <button type="button" className="eda-pg-bt" onClick={() => void carregar()}>Atualizar</button>
            <Link href="/reservas" className="eda-pg-bt">Reservas</Link>
          </>}
        />

        {erro && <div role="alert" className="eda-pg-aviso eda-pg-aviso-at" style={{ marginTop: 16 }}><p style={{ margin: 0 }}>{erro}</p></div>}

        {viagens !== null && lista.length === 0 && !erro && (
          <div style={{ marginTop: 20 }}>
            <VazioEDA titulo="Nenhuma viagem hoje nem amanhã"
              texto="Quando houver viagem em andamento ou saindo até amanhã, ela aparece aqui com localização, etapas, saúde e suprimentos." />
          </div>
        )}

        {lista.length > 0 && (
          <div className="av-grade">
            <section className="av-lista" aria-label="Viagens">
              {lista.map(({ v, alertas, fase, tom }) => (
                <button key={v.chave} type="button" className={`av-item ${atual?.v.chave === v.chave ? 'av-item-sel' : ''}`}
                  onClick={() => setSelecionada(v.chave)} style={{ borderLeftColor: COR[tom] }}>
                  <span className="av-item-topo"><b>{v.passeio || 'Viagem'}</b><PillEDA tom={fase.tom}>{fase.rotulo}</PillEDA></span>
                  <small>{v.inicio === v.fim ? dt(v.inicio) : `${dt(v.inicio)} a ${dt(v.fim)}`}{v.horario ? ` · ${v.horario.slice(0, 5)}` : ''} · {v.pessoas} pessoa(s){v.embarcacao ? ` · ${v.embarcacao.nome}` : ''}</small>
                  <small>{v.posicao ? `Posição ${tempoRelativo(v.posicao.em)}` : 'Sem localização'}{alertas.length ? ` · ${alertas.filter((a) => a.tom !== 'nt').length} alerta(s)` : ' · tudo certo'}</small>
                </button>
              ))}
            </section>

            <MapaAoVivo lista={pontosMapa} selecionada={atual?.v.chave ?? null} aoSelecionar={setSelecionada} aoSalvarRota={carregar} />
          </div>
        )}

        {atual && <Detalhe key={atual.v.chave} v={atual.v} alertas={atual.alertas} bordoAberto={bordo === atual.v.chave} aoBordo={() => setBordo(bordo === atual.v.chave ? null : atual.v.chave)} />}
      </div>

      <style jsx global>{`
        .av-grade { display: grid; grid-template-columns: minmax(260px, 360px) 1fr; gap: 14px; margin-top: 18px; }
        @media (max-width: 860px) { .av-grade { grid-template-columns: 1fr; } }
        .av-lista { display: grid; gap: 8px; align-content: start; max-height: 460px; overflow: auto; }
        .av-item { display: grid; gap: 4px; text-align: left; padding: 12px 14px; border-radius: 14px; border: 1px solid var(--p-borda); border-left-width: 4px; background: var(--p-painel); color: var(--p-texto); cursor: pointer; }
        .av-item-sel { background: var(--p-elev); outline: 1px solid var(--p-ouro); }
        .av-item-topo { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
        .av-item small { font-size: 12px; color: var(--p-sec); }
        .av-mapa { min-height: 460px; border-radius: 18px; overflow: hidden; border: 1px solid var(--p-borda); background: var(--p-painel); position: relative; }
        .av-mapa > div { position: absolute; inset: 0; }
        .av-pino { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; border: 3px solid #fff; color: #07110e; font-size: 16px; box-shadow: 0 4px 14px rgba(0,0,0,.4); }
        .av-det { margin-top: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }
        .av-card { padding: 16px; border-radius: 18px; border: 1px solid var(--p-borda); background: var(--p-painel); display: grid; gap: 10px; align-content: start; }
        .av-card h2 { font-size: 15px; } .av-card p { margin: 0; }
        .av-alertas { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
        .av-alertas li { display: flex; gap: 8px; font-size: 13px; line-height: 1.4; }
        .av-alertas i { flex: none; width: 8px; height: 8px; margin-top: 6px; border-radius: 50%; }
        .av-kv { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-size: 13px; }
        .av-kv span { color: var(--p-sec); }
        .av-tl { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; max-height: 340px; overflow: auto; }
        .av-tl li { display: grid; gap: 2px; padding-left: 12px; border-left: 3px solid var(--p-borda); font-size: 13px; }
        .av-tl small { color: var(--p-sec); font-size: 11px; }
        .av-barra { height: 8px; border-radius: 8px; background: var(--p-suave); overflow: hidden; display: flex; }
        .av-barra b { display: block; height: 100%; }
        .av-acoes { display: flex; flex-wrap: wrap; gap: 8px; }
        .av-largo { grid-column: 1 / -1; }
        .av-mapa-barra { position: absolute; z-index: 500; top: 10px; right: 10px; display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; max-width: calc(100% - 70px); }
        .av-mapa-barra button { font: inherit; font-size: 12px; font-weight: 600; padding: 7px 11px; border-radius: 999px; border: 1px solid rgba(255,255,255,.25); background: rgba(7,17,14,.82); color: #f4ead6; cursor: pointer; backdrop-filter: blur(6px); }
        .av-mapa-barra button[aria-pressed="true"], .av-mapa-barra .av-ouro { background: #e3a144; color: #07110e; border-color: #e3a144; }
        .av-editor { position: absolute; z-index: 500; left: 10px; bottom: 10px; width: min(320px, calc(100% - 20px)); max-height: 60%; overflow: auto; padding: 12px; border-radius: 14px; background: rgba(7,17,14,.9); color: #f4ead6; border: 1px solid rgba(227,161,68,.5); display: grid; gap: 8px; font-size: 12px; backdrop-filter: blur(8px); }
        .av-editor b { font-size: 13px; }
        .av-editor input { font: inherit; font-size: 12px; padding: 5px 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.06); color: inherit; min-width: 0; }
        .av-editor .av-par { display: grid; grid-template-columns: 1fr 64px auto; gap: 6px; align-items: center; }
        .av-editor .av-par button, .av-editor .av-ed-acoes button { font: inherit; font-size: 12px; padding: 6px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,.25); background: transparent; color: inherit; cursor: pointer; }
        .av-editor .av-ed-acoes { display: flex; flex-wrap: wrap; gap: 6px; }
        .av-editor .av-ed-acoes .av-ouro { background: #e3a144; color: #07110e; border-color: #e3a144; }
        .av-marco { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; border: 2px solid #fff; font-size: 11px; font-weight: 700; color: #07110e; box-shadow: 0 2px 8px rgba(0,0,0,.45); }
        .av-rota-info { display: grid; gap: 6px; }
        .av-rota-prog { height: 8px; border-radius: 8px; background: var(--p-suave); overflow: hidden; }
        .av-rota-prog b { display: block; height: 100%; background: #e3a144; }
      `}</style>
    </PaginaEDA>
  );
}

function MapaAoVivo({ lista, selecionada, aoSelecionar, aoSalvarRota }: { lista: { v: ViagemAoVivoEDA; tom: TomEDA }[]; selecionada: string | null; aoSelecionar: (c: string) => void; aoSalvarRota: () => Promise<void> | void }) {
  const caixa = useRef<HTMLDivElement | null>(null);
  const mapa = useRef<Mapa | null>(null);
  const camada = useRef<LayerGroup | null>(null);
  const L = useRef<typeof import('leaflet') | null>(null);
  const bases = useRef<{ satelite: import('leaflet').TileLayer; rotulos: import('leaflet').TileLayer; ruas: import('leaflet').TileLayer } | null>(null);
  const [pronto, setPronto] = useState(false);
  const [satelite, setSatelite] = useState(true);
  const enquadrado = useRef('');
  const centro = useRef('');
  // EDA_ROTA_PASSEIO_V1: editor do percurso (cliques no mapa marcam o caminho e as paradas).
  const [editando, setEditando] = useState<null | { pontos: [number, number][]; paradas: ParadaRotaEDA[]; modo: 'caminho' | 'parada'; velocidade: number }>(null);
  const [salvando, setSalvando] = useState(false);
  const [avisoRota, setAvisoRota] = useState('');
  const sel = lista.find((x) => x.v.chave === selecionada)?.v ?? null;

  useEffect(() => {
    let fim = false;
    void import('leaflet').then((lib) => {
      if (fim || !caixa.current || mapa.current) return;
      L.current = lib;
      const m = lib.map(caixa.current, { zoomControl: true, minZoom: 4, maxZoom: 18 }).setView(BARCELOS, 8);
      const satelite = lib.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Imagens &copy; Esri, Maxar, Earthstar Geographics', maxZoom: 18,
      });
      const rotulos = lib.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18, opacity: 0.9 });
      const ruas = lib.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19,
      });
      satelite.addTo(m); rotulos.addTo(m);
      bases.current = { satelite, rotulos, ruas };
      camada.current = lib.layerGroup().addTo(m);
      mapa.current = m;
      setPronto(true);
    });
    return () => { fim = true; mapa.current?.remove(); mapa.current = null; };
  }, []);

  useEffect(() => {
    const m = mapa.current, b = bases.current;
    if (!pronto || !m || !b) return;
    if (satelite) { m.removeLayer(b.ruas); b.satelite.addTo(m); b.rotulos.addTo(m); }
    else { m.removeLayer(b.satelite); m.removeLayer(b.rotulos); b.ruas.addTo(m); }
  }, [pronto, satelite]);

  // Cliques no mapa enquanto edita o percurso.
  useEffect(() => {
    const m = mapa.current;
    if (!pronto || !m || !editando) return;
    const clique = (e: import('leaflet').LeafletMouseEvent) => {
      const p: [number, number] = [Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))];
      setEditando((ed) => {
        if (!ed) return ed;
        if (ed.modo === 'parada') {
          if (ed.paradas.length >= 40) return ed;
          return { ...ed, modo: 'caminho', paradas: [...ed.paradas, { lat: p[0], lng: p[1], nome: `Parada ${ed.paradas.length + 1}`, minutos: 30 }] };
        }
        if (ed.pontos.length >= 600) return ed;
        return { ...ed, pontos: [...ed.pontos, p] };
      });
    };
    m.on('click', clique);
    m.getContainer().style.cursor = 'crosshair';
    return () => { m.off('click', clique); m.getContainer().style.cursor = ''; };
  }, [pronto, editando]);

  useEffect(() => {
    const lib = L.current, m = mapa.current, c = camada.current;
    if (!pronto || !lib || !m || !c) return;
    c.clearLayers();
    const pts: [number, number][] = [];
    const marco = (p: [number, number], cor: string, texto: string, titulo: string) => {
      const ic = lib.divIcon({ className: '', iconSize: [22, 22], iconAnchor: [11, 11], html: `<span class="av-marco" style="background:${cor}">${texto}</span>` });
      lib.marker(p, { icon: ic, title: titulo, interactive: true }).bindTooltip(titulo.replace(/</g, '&lt;')).addTo(c);
    };
    for (const { v, tom } of lista) {
      const ehSel = v.chave === selecionada;
      // Percurso planejado (tracejado): completo na viagem escolhida, discreto nas demais.
      const rota = ehSel && editando ? { pontos: editando.pontos, paradas: editando.paradas } : v.rota;
      if (rota && rota.pontos.length > 1) {
        lib.polyline(rota.pontos, { color: '#000', weight: ehSel ? 7 : 4, opacity: ehSel ? 0.35 : 0.15 }).addTo(c);
        lib.polyline(rota.pontos, { color: '#f2c86b', weight: ehSel ? 4 : 2, opacity: ehSel ? 0.95 : 0.45, dashArray: '8 8' }).addTo(c);
        if (ehSel) pts.push(...rota.pontos);
      }
      if (ehSel && rota) {
        if (rota.pontos.length) marco(rota.pontos[0], '#5cc49a', 'S', 'Saída / embarque');
        if (rota.pontos.length > 1) marco(rota.pontos[rota.pontos.length - 1], '#e3a144', 'D', `Destino${v.destino?.nome ? `: ${v.destino.nome}` : ''}`);
        (rota.paradas ?? []).forEach((pa, i) => marco([pa.lat, pa.lng], '#8cc3f2', String(i + 1), `${pa.nome}${pa.minutos ? ` · ${pa.minutos} min` : ''}`));
      }
      if (ehSel && v.destino && !(rota && rota.pontos.length > 1)) { marco([v.destino.lat, v.destino.lng], '#e3a144', 'D', `Destino: ${v.destino.nome ?? ''}`); pts.push([v.destino.lat, v.destino.lng]); }
      // Caminho feito (sólido).
      if (ehSel && v.trilha.length > 1) lib.polyline(v.trilha, { color: '#5cc49a', weight: 4, opacity: 0.95 }).addTo(c);
      if (!v.posicao) continue;
      const p: [number, number] = [v.posicao.lat, v.posicao.lng];
      pts.push(p);
      const velho = (minutosDesde(v.posicao.em) ?? 0) > 30;
      const icone = lib.divIcon({
        className: '', iconSize: [34, 34], iconAnchor: [17, 17],
        html: `<span class="av-pino" style="background:${COR[tom as keyof typeof COR] ?? '#5cc49a'};opacity:${velho ? 0.6 : 1};${ehSel ? 'transform:scale(1.2)' : ''}">⛵</span>`,
      });
      const mk = lib.marker(p, { icon: icone, title: v.passeio ?? 'Viagem' }).addTo(c);
      mk.bindTooltip(`${(v.passeio ?? 'Viagem').replace(/</g, '&lt;')} · ${tempoRelativo(v.posicao.em)}`);
      mk.on('click', () => { if (!editando) aoSelecionar(v.chave); });
      if (v.posicao.precisao && v.posicao.precisao > 50 && ehSel) lib.circle(p, { radius: v.posicao.precisao, color: '#8cc3f2', weight: 1, fillOpacity: 0.08 }).addTo(c);
    }
    if (editando) return;
    // Enquadra o percurso completo ao trocar de viagem; depois só acompanha posição nova.
    const s = sel?.posicao;
    const marca = s ? `${selecionada}|${s.em}` : '';
    if (selecionada && enquadrado.current !== selecionada && pts.length) {
      enquadrado.current = selecionada; centro.current = marca;
      if (pts.length > 1) m.fitBounds(lib.latLngBounds(pts), { padding: [50, 50], maxZoom: 14 }); else m.setView(pts[0], 13);
    } else if (s && marca !== centro.current) {
      centro.current = marca;
      if (!m.getBounds().contains([s.lat, s.lng])) m.panTo([s.lat, s.lng], { animate: true });
    }
  }, [pronto, lista, selecionada, aoSelecionar, editando, sel]);

  const comecar = () => {
    if (!sel) return;
    setAvisoRota('');
    const r = sel.rota;
    const inicio: [number, number][] = r?.pontos?.length ? r.pontos : [];
    setEditando({ pontos: inicio, paradas: r?.paradas ?? [], modo: 'caminho', velocidade: r?.velocidade_kmh ?? 20 });
  };
  const salvar = async () => {
    if (!sel?.passeio_id || !editando) return;
    if (editando.pontos.length < 2) { setAvisoRota('Marque pelo menos a saída e o destino.'); return; }
    setSalvando(true); setAvisoRota('');
    const rota: RotaEDA = {
      pontos: editando.pontos,
      paradas: editando.paradas.map((p) => ({ lat: p.lat, lng: p.lng, nome: (p.nome || 'Parada').trim().slice(0, 80), minutos: Math.max(0, Math.min(1440, Math.round(Number(p.minutos) || 0))) })),
      velocidade_kmh: Math.max(3, Math.min(120, Math.round(editando.velocidade) || 20)),
    };
    const { error } = await supabase.from('passeios').update({ rota }).eq('id', sel.passeio_id);
    setSalvando(false);
    if (error) { setAvisoRota('Não foi possível salvar o percurso. Confira sua conexão e tente de novo.'); return; }
    setEditando(null);
    enquadrado.current = '';
    await aoSalvarRota();
  };
  const total = editando ? editando.pontos.reduce((t, p, i, a) => i ? t + distancia(a[i - 1], p) : 0, 0) : 0;

  return (
    <div className="av-mapa" aria-label="Mapa das embarcações">
      <div ref={caixa} />
      <div className="av-mapa-barra">
        <button type="button" aria-pressed={satelite} onClick={() => setSatelite(true)}>Satélite</button>
        <button type="button" aria-pressed={!satelite} onClick={() => setSatelite(false)}>Mapa</button>
        {sel?.passeio_id && !editando && (
          <button type="button" className="av-ouro" onClick={comecar}>{sel.rota?.pontos?.length ? 'Editar percurso' : 'Traçar percurso'}</button>
        )}
      </div>
      {editando && (
        <div className="av-editor" role="dialog" aria-label="Traçar percurso do passeio">
          <b>Percurso de {sel?.passeio || 'passeio'}</b>
          <span>{editando.modo === 'parada' ? 'Toque no mapa onde fica a parada prevista.' : 'Toque no mapa seguindo o rio, da saída até o destino.'}</span>
          <span>{editando.pontos.length} ponto(s) · {formatarDistancia(total)}{editando.pontos.length > 1 ? ` · cerca de ${duracao(Math.round((total / 1000 / Math.max(3, editando.velocidade)) * 60))} de navegação` : ''}</span>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>Velocidade média
            <input type="number" min={3} max={120} value={editando.velocidade} onChange={(e) => setEditando({ ...editando, velocidade: Number(e.target.value) })} style={{ width: 64 }} /> km/h
          </label>
          {editando.paradas.map((p, i) => (
            <div key={i} className="av-par">
              <input value={p.nome} maxLength={80} aria-label={`Nome da parada ${i + 1}`} onChange={(e) => setEditando({ ...editando, paradas: editando.paradas.map((x, j) => j === i ? { ...x, nome: e.target.value } : x) })} />
              <input type="number" min={0} max={1440} value={p.minutos ?? 0} aria-label={`Minutos na parada ${i + 1}`} onChange={(e) => setEditando({ ...editando, paradas: editando.paradas.map((x, j) => j === i ? { ...x, minutos: Number(e.target.value) } : x) })} />
              <button type="button" aria-label={`Remover parada ${i + 1}`} onClick={() => setEditando({ ...editando, paradas: editando.paradas.filter((_, j) => j !== i) })}>×</button>
            </div>
          ))}
          {editando.paradas.length > 0 && <small style={{ opacity: 0.75 }}>Nome da parada e minutos previstos (sem alerta de parada nesses pontos).</small>}
          <div className="av-ed-acoes">
            <button type="button" onClick={() => setEditando({ ...editando, pontos: editando.pontos.slice(0, -1) })} disabled={!editando.pontos.length}>Desfazer ponto</button>
            <button type="button" onClick={() => setEditando({ ...editando, modo: editando.modo === 'parada' ? 'caminho' : 'parada' })}>{editando.modo === 'parada' ? 'Voltar ao caminho' : 'Marcar parada'}</button>
            <button type="button" onClick={() => setEditando({ ...editando, pontos: [], paradas: [] })}>Limpar</button>
          </div>
          {avisoRota && <span role="alert" style={{ color: '#f2c86b' }}>{avisoRota}</span>}
          <div className="av-ed-acoes">
            <button type="button" className="av-ouro" onClick={() => void salvar()} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar percurso'}</button>
            <button type="button" onClick={() => { setEditando(null); setAvisoRota(''); }}>Cancelar</button>
          </div>
          <small style={{ opacity: 0.75 }}>O percurso fica salvo no passeio e vale para todas as saídas dele.</small>
        </div>
      )}
    </div>
  );
}

function distancia(a: [number, number], b: [number, number]) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r, dLng = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function PercursoEDA({ v }: { v: ViagemAoVivoEDA }) {
  const r = analisarRota(v);
  if (!r.temRota) return <p style={{ fontSize: 13, color: 'var(--p-sec)' }}>Percurso ainda não traçado. Use <b>Traçar percurso</b> no mapa para marcar o caminho pelo rio até o destino e as paradas previstas.</p>;
  const pct = r.percorridoM !== null && r.totalM ? Math.min(100, Math.round((r.percorridoM / r.totalM) * 100)) : null;
  const situacao = r.foraDaRota ? 'Fora do percurso' : r.noDestino ? 'No destino' : r.paradaPrevista ? `Em parada prevista: ${r.paradaPrevista.nome}` : r.paradoMin !== null && r.paradoMin >= 15 ? `Parada há ${duracao(r.paradoMin)}` : v.posicao ? 'No percurso' : 'Aguardando localização';
  return (
    <div className="av-rota-info">
      <div className="av-kv">
        <span>Percurso</span><b>{formatarDistancia(r.totalM)}{(v.rota?.paradas?.length ?? 0) ? ` · ${v.rota?.paradas?.length} parada(s) prevista(s)` : ''}</b>
        <span>Situação</span><b>{situacao}</b>
        {r.restanteM !== null && <><span>Falta</span><b>{formatarDistancia(r.restanteM)}</b></>}
        {r.chegadaPrevista && <><span>Chegada prevista</span><b>{hora(r.chegadaPrevista)}{r.atrasoMin ? ` · atraso de ${duracao(r.atrasoMin)}` : ''}</b></>}
      </div>
      {pct !== null && <div className="av-rota-prog" aria-label={`${pct}% do percurso`}><b style={{ width: `${pct}%` }} /></div>}
    </div>
  );
}

function Detalhe({ v, alertas, bordoAberto, aoBordo }: { v: ViagemAoVivoEDA; alertas: AlertaOperacaoEDA[]; bordoAberto: boolean; aoBordo: () => void }) {
  const s = v.suprimentos;
  const totalItens = Math.max(s.itens, 1);
  const tel = (v.guia?.telefone ?? '').replace(/\D/g, '');
  const telInt = tel ? (tel.length <= 11 ? `55${tel}` : tel) : '';
  const linkMapa = v.posicao ? `https://www.google.com/maps?q=${v.posicao.lat},${v.posicao.lng}` : '';
  const reserva = v.reservas[0];

  return (
    <div className="av-det">
      <section className="av-card">
        <p className="eda-pg-eb">Alertas da viagem</p>
        <h2>{v.passeio || 'Viagem'}</h2>
        {alertas.length === 0 ? <p style={{ color: 'var(--p-verde)', fontSize: 13 }}>Tudo certo: equipe, segurança e suprimentos conferidos.</p> : (
          <ul className="av-alertas">
            {alertas.map((a, i) => <li key={i}><i style={{ background: COR[a.tom] }} aria-hidden="true" />{a.texto}</li>)}
          </ul>
        )}
      </section>

      <section className="av-card">
        <p className="eda-pg-eb">Percurso planejado</p>
        <PercursoEDA v={v} />
      </section>

      <section className="av-card">
        <p className="eda-pg-eb">Localização e equipe</p>
        <div className="av-kv">
          <span>Última posição</span><b>{v.posicao ? `${tempoRelativo(v.posicao.em)} (${hora(v.posicao.em)})` : 'nenhuma ainda'}</b>
          {v.posicao?.velocidade != null && <><span>Velocidade</span><b>{v.posicao.velocidade.toFixed(1)} km/h</b></>}
          {v.posicao?.bateria != null && <><span>Bateria</span><b>{v.posicao.bateria}%</b></>}
          <span>Embarcação</span><b>{v.embarcacao ? `${v.embarcacao.nome}${v.embarcacao.capacidade ? ` · ${v.pessoas}/${v.embarcacao.capacidade} lugares` : ''}${v.embarcacao.marinheiro ? ` · ${v.embarcacao.marinheiro}` : ''}` : '—'}</b>
          <span>Guia</span><b>{v.guia ? v.guia.nome : '—'}</b>
          <span>Clientes</span><b>{v.clientes || '—'}</b>
        </div>
        <div className="av-acoes">
          {telInt && <a className="eda-pg-bt" href={`https://wa.me/${telInt}`} target="_blank" rel="noopener noreferrer">WhatsApp do guia</a>}
          {tel && <a className="eda-pg-bt" href={`tel:+${telInt}`}>Ligar</a>}
          {linkMapa && <a className="eda-pg-bt" href={linkMapa} target="_blank" rel="noopener noreferrer">Abrir no Google Maps</a>}
          {linkMapa && <button type="button" className="eda-pg-bt" onClick={() => void copiarEDA(linkMapa, 'Localização copiada')}>Copiar localização</button>}
        </div>
      </section>

      <section className="av-card">
        <p className="eda-pg-eb">Suprimentos</p>
        {!v.saida_id ? <p style={{ fontSize: 13, color: 'var(--p-sec)' }}>Esta reserva não está ligada a uma saída. Ligue-a a uma saída e crie a demanda pela saída para a EDA conferir os suprimentos.</p>
          : !s.demandas ? <p style={{ fontSize: 13 }}>Nenhuma demanda ligada a esta saída.</p> : (
            <>
              <div className="av-barra" aria-label={`${s.atendidos} de ${s.itens} itens atendidos`}>
                <b style={{ width: `${(s.atendidos / totalItens) * 100}%`, background: '#5cc49a' }} />
                <b style={{ width: `${(s.separacao / totalItens) * 100}%`, background: '#f2c86b' }} />
                <b style={{ width: `${(s.pendentes / totalItens) * 100}%`, background: '#ef4444' }} />
              </div>
              <div className="av-kv">
                <span>Itens</span><b>{s.atendidos} atendidos · {s.separacao} em separação · {s.pendentes} pendentes</b>
                <span>Planejado</span><b>{s.planejado_pessoas ?? '?'} pessoa(s) × {s.planejado_dias ?? '?'} dia(s)</b>
                <span>Viagem real</span><b>{v.pessoas} pessoa(s) × {v.dias} dia(s)</b>
                <span>Coletes</span><b>{s.coletes} para {v.pessoas}</b>
              </div>
            </>
          )}
        <div className="av-acoes">
          <Link className="eda-pg-bt" href={v.saida_id ? '/demandas' : `/reservas/editar/${reserva}`}>{v.saida_id ? 'Ver demandas' : 'Ligar a uma saída'}</Link>
        </div>
      </section>

      <section className="av-card">
        <p className="eda-pg-eb">Segurança</p>
        <div className="av-kv">
          <span>Fichas de saúde</span><b>{v.saude.fichas} de {v.pessoas}</b>
          <span>Alertas graves</span><b style={{ color: v.saude.graves ? '#ef4444' : undefined }}>{v.saude.graves}</b>
          <span>Atenção</span><b>{v.saude.atencao}</b>
          <span>Não sabem nadar</span><b>{v.saude.nao_nadam}</b>
        </div>
        <div className="av-acoes">
          {v.reservas.slice(0, 3).map((id, i) => (
            <Link key={id} className="eda-pg-bt" href={`/reservas/editar/${id}#participantes`}>{v.reservas.length > 1 ? `Reserva ${i + 1}` : 'Gerenciar reserva'}</Link>
          ))}
        </div>
      </section>

      <section className="av-card av-largo">
        <p className="eda-pg-eb">Linha do tempo a bordo</p>
        {v.eventos.length === 0 ? <p style={{ fontSize: 13, color: 'var(--p-sec)' }}>Nenhum registro ainda. O guia registra pelo Painel do Guia; a equipe a bordo pode usar “Estou a bordo” abaixo.</p> : (
          <ul className="av-tl">
            {v.eventos.map((e) => (
              <li key={e.id} style={{ borderLeftColor: e.gravidade === 'grave' ? '#ef4444' : e.gravidade === 'atencao' ? '#f2c86b' : undefined }}>
                <b>{ROTULO_EVENTO[e.tipo]}{e.texto ? ` — ${e.texto}` : ''}</b>
                <small>{hora(e.em)} · {e.autor || 'Equipe'}{e.lat != null && e.lng != null ? ` · ${e.lat.toFixed(4)}, ${e.lng.toFixed(4)}` : ''}</small>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="av-card av-largo">
        <div className="av-acoes" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div><p className="eda-pg-eb">Estou a bordo</p><p style={{ fontSize: 13, color: 'var(--p-sec)' }}>Use este aparelho para transmitir a localização e registrar a viagem (quando o guia não tem conta na EDA).</p></div>
          <button type="button" className="eda-pg-bt" onClick={aoBordo}>{bordoAberto ? 'Fechar painel de bordo' : 'Abrir painel de bordo'}</button>
        </div>
        {bordoAberto && reserva && <BordoEDA reservaId={reserva} titulo={`A bordo: ${v.passeio || 'viagem'}`} />}
      </section>
    </div>
  );
}

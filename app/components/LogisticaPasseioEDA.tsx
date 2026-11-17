'use client';

// EDA_LOGISTICA_PASSEIO_V1: embarque, destino e percurso pelo rio ficam no cadastro do passeio.
// A Operação ao vivo e a EDA leem daqui: o barco já sai com o caminho marcado e a EDA
// avisa quando a embarcação para fora do previsto, sai do caminho ou atrasa.
// Um só mapa: busca do embarque e do destino (com filtro no mapa), pins arrastáveis,
// traçado do caminho tocando no rio e paradas previstas.

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import type { Map as MapaL, LayerGroup, TileLayer } from 'leaflet';
import CampoLocalEDA from '@/app/components/CampoLocalEDA';
import { distanciaM, duracao, formatarDistancia, type ParadaRotaEDA, type RotaEDA } from '@/lib/operacaoAoVivoEDA';

export type LogisticaPasseioEDA = {
  ponto_embarque: string | null;
  embarque_lat: number | null;
  embarque_lng: number | null;
  destino_nome: string | null;
  latitude: number | null;
  longitude: number | null;
  rota: RotaEDA | null;
};

export const LOGISTICA_VAZIA: LogisticaPasseioEDA = {
  ponto_embarque: null, embarque_lat: null, embarque_lng: null, destino_nome: null, latitude: null, longitude: null, rota: null,
};

// Lê os campos do passeio (linha do banco) para o formulário.
export function logisticaDoPasseio(p: Partial<Record<keyof LogisticaPasseioEDA, unknown>>): LogisticaPasseioEDA {
  const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
  const t = (x: unknown) => (typeof x === 'string' && x.trim() ? x : null);
  const r = p.rota as RotaEDA | null | undefined;
  return {
    ponto_embarque: t(p.ponto_embarque), embarque_lat: n(p.embarque_lat), embarque_lng: n(p.embarque_lng),
    destino_nome: t(p.destino_nome), latitude: n(p.latitude), longitude: n(p.longitude),
    rota: r && Array.isArray(r.pontos) ? r : null,
  };
}

// Campos prontos para gravar no passeio (limites iguais aos do banco).
export function logisticaParaGravar(l: LogisticaPasseioEDA) {
  const rota: RotaEDA | null = l.rota && l.rota.pontos.length >= 2 ? {
    pontos: l.rota.pontos.slice(0, 600),
    paradas: (l.rota.paradas ?? []).slice(0, 40).map((p) => ({
      lat: p.lat, lng: p.lng, nome: (p.nome || 'Parada').trim().slice(0, 80),
      minutos: Math.max(0, Math.min(1440, Math.round(Number(p.minutos) || 0))),
    })),
    velocidade_kmh: Math.max(3, Math.min(120, Math.round(Number(l.rota.velocidade_kmh) || 20))),
  } : null;
  return {
    ponto_embarque: l.ponto_embarque?.trim().slice(0, 200) || null,
    embarque_lat: l.embarque_lat, embarque_lng: l.embarque_lng,
    destino_nome: l.destino_nome?.trim().slice(0, 120) || null,
    latitude: l.latitude, longitude: l.longitude,
    rota,
  };
}

type Ferramenta = 'caminho' | 'parada' | 'embarque' | 'destino';
const BARCELOS: [number, number] = [-0.975, -62.924];
const fx = (n: number) => Number(n.toFixed(6));

export default function LogisticaPasseioEDA({ valor, onChange, disabled }: { valor: LogisticaPasseioEDA; onChange: (v: LogisticaPasseioEDA) => void; disabled?: boolean }) {
  const caixa = useRef<HTMLDivElement | null>(null);
  const mapa = useRef<MapaL | null>(null);
  const camada = useRef<LayerGroup | null>(null);
  const L = useRef<typeof import('leaflet') | null>(null);
  const bases = useRef<{ sat: TileLayer; rot: TileLayer; ruas: TileLayer } | null>(null);
  const [pronto, setPronto] = useState(false);
  const [satelite, setSatelite] = useState(true);
  const [ferramenta, setFerramenta] = useState<Ferramenta>('caminho');
  const atual = useRef(valor);
  const aoMudar = useRef(onChange);
  useEffect(() => { atual.current = valor; aoMudar.current = onChange; }, [valor, onChange]);
  const enquadrou = useRef(false);

  const emb: [number, number] | null = valor.embarque_lat != null && valor.embarque_lng != null ? [valor.embarque_lat, valor.embarque_lng] : null;
  const dest: [number, number] | null = valor.latitude != null && valor.longitude != null ? [valor.latitude, valor.longitude] : null;
  const pontos = valor.rota?.pontos ?? [];
  const paradas = valor.rota?.paradas ?? [];
  const vel = valor.rota?.velocidade_kmh ?? 20;
  const total = pontos.reduce((t, p, i, a) => (i ? t + distanciaM({ lat: a[i - 1][0], lng: a[i - 1][1] }, { lat: p[0], lng: p[1] }) : 0), 0);
  const ult = pontos[pontos.length - 1];
  const ligadoDestino = !!(dest && ult && distanciaM({ lat: ult[0], lng: ult[1] }, { lat: dest[0], lng: dest[1] }) <= 300);
  const saiDoEmbarque = !!(emb && pontos[0] && distanciaM({ lat: pontos[0][0], lng: pontos[0][1] }, { lat: emb[0], lng: emb[1] }) <= 300);

  const mudarRota = (r: Partial<RotaEDA>) => {
    const base = atual.current.rota ?? { pontos: [], paradas: [], velocidade_kmh: 20 };
    aoMudar.current({ ...atual.current, rota: { ...base, ...r } });
  };

  useEffect(() => {
    let fim = false;
    void import('leaflet').then((lib) => {
      if (fim || !caixa.current || mapa.current) return;
      L.current = lib;
      const m = lib.map(caixa.current, { zoomControl: false, minZoom: 4, maxZoom: 18 }).setView(BARCELOS, 11);
      lib.control.zoom({ position: 'bottomright' }).addTo(m);
      const sat = lib.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Imagens &copy; Esri, Maxar', maxZoom: 18 });
      const rot = lib.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18, opacity: 0.9 });
      const ruas = lib.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 });
      sat.addTo(m); rot.addTo(m);
      bases.current = { sat, rot, ruas };
      camada.current = lib.layerGroup().addTo(m);
      mapa.current = m;
      const ro = new ResizeObserver(() => m.invalidateSize());
      ro.observe(caixa.current);
      m.once('unload', () => ro.disconnect());
      setPronto(true);
    });
    return () => { fim = true; mapa.current?.remove(); mapa.current = null; };
  }, []);

  useEffect(() => {
    const m = mapa.current, b = bases.current;
    if (!pronto || !m || !b) return;
    if (satelite) { m.removeLayer(b.ruas); b.sat.addTo(m); b.rot.addTo(m); } else { m.removeLayer(b.sat); m.removeLayer(b.rot); b.ruas.addTo(m); }
  }, [pronto, satelite]);

  // Toque no mapa conforme a ferramenta escolhida.
  useEffect(() => {
    const m = mapa.current;
    if (!pronto || !m || disabled) return;
    const clique = (e: import('leaflet').LeafletMouseEvent) => {
      const p: [number, number] = [fx(e.latlng.lat), fx(e.latlng.lng)];
      const v = atual.current;
      if (ferramenta === 'embarque') { aoMudar.current({ ...v, embarque_lat: p[0], embarque_lng: p[1] }); setFerramenta('caminho'); return; }
      if (ferramenta === 'destino') { aoMudar.current({ ...v, latitude: p[0], longitude: p[1] }); setFerramenta('caminho'); return; }
      const r = v.rota ?? { pontos: [], paradas: [], velocidade_kmh: 20 };
      if (ferramenta === 'parada') {
        if ((r.paradas ?? []).length >= 40) return;
        aoMudar.current({ ...v, rota: { ...r, paradas: [...(r.paradas ?? []), { lat: p[0], lng: p[1], nome: `Parada ${(r.paradas ?? []).length + 1}`, minutos: 30 }] } });
        setFerramenta('caminho');
        return;
      }
      if (r.pontos.length >= 600) return;
      // Primeiro toque do caminho: começa no embarque, se ele estiver marcado.
      const inicio: [number, number][] = !r.pontos.length && v.embarque_lat != null && v.embarque_lng != null ? [[v.embarque_lat, v.embarque_lng]] : [];
      aoMudar.current({ ...v, rota: { ...r, pontos: [...r.pontos, ...inicio, p] } });
    };
    m.on('click', clique);
    m.getContainer().style.cursor = 'crosshair';
    return () => { m.off('click', clique); m.getContainer().style.cursor = ''; };
  }, [pronto, ferramenta, disabled]);

  // Desenho: caminho, embarque, destino e paradas (pins arrastáveis).
  useEffect(() => {
    const lib = L.current, m = mapa.current, c = camada.current;
    if (!pronto || !lib || !m || !c) return;
    c.clearLayers();
    const icone = (cor: string, texto: string, tam = 26) => lib.divIcon({ className: '', iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2], html: `<span class="lg-marco" style="background:${cor}">${texto}</span>` });
    if (pontos.length > 1) {
      lib.polyline(pontos, { color: '#07110e', weight: 8, opacity: 0.45, interactive: false }).addTo(c);
      lib.polyline(pontos, { color: '#f2c86b', weight: 4, opacity: 1, dashArray: '10 9', interactive: false }).addTo(c);
    }
    pontos.forEach((p, i) => {
      if ((i === 0 && saiDoEmbarque) || (i === pontos.length - 1 && ligadoDestino)) return;
      lib.circleMarker(p, { radius: i === pontos.length - 1 ? 6 : 4, color: '#07110e', weight: 2, fillColor: '#f2c86b', fillOpacity: 1, interactive: false }).addTo(c);
    });
    const arrastavel = (pos: [number, number], ic: import('leaflet').DivIcon, titulo: string, solto: (p: [number, number]) => void) => {
      const mk = lib.marker(pos, { icon: ic, draggable: !disabled, title: titulo, keyboard: false }).addTo(c);
      mk.bindTooltip(titulo.replace(/</g, '&lt;'), { direction: 'top', offset: [0, -14], className: 'lg-dica' });
      mk.on('dragend', () => { const ll = mk.getLatLng(); solto([fx(ll.lat), fx(ll.lng)]); });
    };
    if (emb) arrastavel(emb, icone('#5cc49a', 'S', 30), `Embarque${valor.ponto_embarque ? `: ${valor.ponto_embarque}` : ''}`, (p) => {
      const v = atual.current, r = v.rota;
      // Se o caminho saía do embarque antigo, o primeiro ponto acompanha.
      const pts = r?.pontos?.length && v.embarque_lat != null && v.embarque_lng != null && distanciaM({ lat: r.pontos[0][0], lng: r.pontos[0][1] }, { lat: v.embarque_lat, lng: v.embarque_lng }) <= 300 ? [p, ...r.pontos.slice(1)] : r?.pontos;
      aoMudar.current({ ...v, embarque_lat: p[0], embarque_lng: p[1], rota: r && pts ? { ...r, pontos: pts } : r });
    });
    if (dest) {
      lib.circle(dest, { radius: 500, color: '#e3a144', weight: 1.5, fillColor: '#e3a144', fillOpacity: 0.08, dashArray: '4 6', interactive: false }).addTo(c);
      arrastavel(dest, icone('#e3a144', 'D', 30), `Destino${valor.destino_nome ? `: ${valor.destino_nome}` : ''}`, (p) => {
        const v = atual.current, r = v.rota;
        const pts = r?.pontos?.length && v.latitude != null && v.longitude != null && distanciaM({ lat: r.pontos[r.pontos.length - 1][0], lng: r.pontos[r.pontos.length - 1][1] }, { lat: v.latitude, lng: v.longitude }) <= 300 ? [...r.pontos.slice(0, -1), p] : r?.pontos;
        aoMudar.current({ ...v, latitude: p[0], longitude: p[1], rota: r && pts ? { ...r, pontos: pts } : r });
      });
    }
    paradas.forEach((pa, i) => arrastavel([pa.lat, pa.lng], icone('#8cc3f2', String(i + 1), 24), `${pa.nome}${pa.minutos ? ` · ${pa.minutos} min` : ''}`, (p) => {
      const r = atual.current.rota;
      if (r) mudarRota({ paradas: (r.paradas ?? []).map((x, j) => (j === i ? { ...x, lat: p[0], lng: p[1] } : x)) });
    }));
    // Enquadra uma vez ao abrir (ou quando aparece o primeiro ponto).
    const todos: [number, number][] = [...pontos, ...(emb ? [emb] : []), ...(dest ? [dest] : []), ...paradas.map((p) => [p.lat, p.lng] as [number, number])];
    if (!enquadrou.current && todos.length) {
      enquadrou.current = true;
      if (todos.length > 1) m.fitBounds(lib.latLngBounds(todos), { padding: [40, 40], maxZoom: 15 }); else m.setView(todos[0], 14);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronto, valor, disabled]);

  const voar = (p: [number, number] | null) => { if (p) mapa.current?.flyTo(p, 15, { duration: 0.8 }); };
  const verTudo = () => {
    const lib = L.current, m = mapa.current;
    const todos: [number, number][] = [...pontos, ...(emb ? [emb] : []), ...(dest ? [dest] : [])];
    if (lib && m && todos.length > 1) m.fitBounds(lib.latLngBounds(todos), { padding: [40, 40], maxZoom: 15 }); else voar(todos[0] ?? null);
  };

  const dicas: Record<Ferramenta, string> = {
    caminho: pontos.length ? 'Toque no mapa seguindo o rio até o destino.' : emb ? 'Toque no rio: o caminho começa no embarque.' : 'Toque no mapa onde a viagem começa.',
    parada: 'Toque no mapa onde fica a parada prevista.',
    embarque: 'Toque no mapa para marcar o ponto de embarque.',
    destino: 'Toque no mapa para marcar o destino.',
  };
  const pend: string[] = [];
  if (!emb) pend.push('marcar o embarque');
  if (!dest) pend.push('marcar o destino');
  if (pontos.length < 2) pend.push('traçar o caminho pelo rio');
  else if (dest && !ligadoDestino) pend.push('ligar o caminho ao destino');

  return (
    <div className="lg">
      <div className="lg-campos">
        <div>
          <label className="lg-rot">Ponto de embarque</label>
          <CampoLocalEDA modo="endereco" mapa={false} disabled={disabled} placeholder="Ex.: Porto de Barcelos, Orla…"
            valor={{ texto: valor.ponto_embarque ?? '', lat: valor.embarque_lat, lng: valor.embarque_lng }}
            className="lg-input"
            onChange={(l) => { const antes = atual.current; onChange({ ...antes, ponto_embarque: l.texto || null, ...(l.lat != null && l.lng != null ? { embarque_lat: fx(l.lat), embarque_lng: fx(l.lng) } : {}) }); if (l.lat != null && l.lng != null && (fx(l.lat) !== antes.embarque_lat || fx(l.lng) !== antes.embarque_lng)) voar([l.lat, l.lng]); }} />
        </div>
        <div>
          <label className="lg-rot">Destino do passeio</label>
          <CampoLocalEDA modo="endereco" mapa={false} disabled={disabled} placeholder="Ex.: Ilha do Aracá, praia, comunidade…"
            valor={{ texto: valor.destino_nome ?? '', lat: valor.latitude, lng: valor.longitude }}
            className="lg-input"
            onChange={(l) => { const mudou = l.lat != null && l.lng != null && (fx(l.lat) !== atual.current.latitude || fx(l.lng) !== atual.current.longitude); onChange({ ...atual.current, destino_nome: l.texto || null, ...(l.lat != null && l.lng != null ? { latitude: fx(l.lat), longitude: fx(l.lng) } : {}) }); if (mudou) voar([l.lat!, l.lng!]); }} />
        </div>
      </div>

      <div className="lg-mapa-caixa">
        <div ref={caixa} className="lg-mapa" role="application" aria-label="Mapa da viagem: embarque, caminho, paradas e destino" />
        <div className="lg-barra">
          <span className="lg-seg" role="group" aria-label="Tipo de mapa">
            <button type="button" aria-pressed={satelite} onClick={() => setSatelite(true)}>Satélite</button>
            <button type="button" aria-pressed={!satelite} onClick={() => setSatelite(false)}>Mapa</button>
          </span>
          <button type="button" onClick={verTudo}>Ver tudo</button>
        </div>
        <div className="lg-painel">
          <div className="lg-ferr" role="radiogroup" aria-label="O que marcar no mapa">
            {(['caminho', 'parada', 'embarque', 'destino'] as Ferramenta[]).map((f) => (
              <button key={f} type="button" role="radio" aria-checked={ferramenta === f} disabled={disabled} onClick={() => setFerramenta(f)}>
                {{ caminho: 'Caminho', parada: 'Parada', embarque: 'Embarque', destino: 'Destino' }[f]}
              </button>
            ))}
          </div>
          <p className="lg-dica-txt">{dicas[ferramenta]}</p>
          <div className="lg-num">
            <span><b>{formatarDistancia(total)}</b> de rio</span>
            {pontos.length > 1 && <span>≈ <b>{duracao(Math.round((total / 1000 / Math.max(3, vel)) * 60 + paradas.reduce((t, p) => t + (p.minutos ?? 0), 0)))}</b></span>}
            <span><b>{paradas.length}</b> parada(s)</span>
          </div>
          <div className="lg-acoes">
            {dest && pontos.length > 0 && !ligadoDestino && (
              <button type="button" className="lg-ouro" disabled={disabled} onClick={() => mudarRota({ pontos: [...pontos, dest] })}>Ligar ao destino</button>
            )}
            <button type="button" disabled={disabled || !pontos.length} onClick={() => mudarRota({ pontos: pontos.slice(0, -1) })}>Desfazer</button>
            <button type="button" disabled={disabled || (!pontos.length && !paradas.length)} onClick={() => onChange({ ...atual.current, rota: null })}>Limpar caminho</button>
          </div>
        </div>
      </div>

      <div className="lg-rodape">
        <label className="lg-vel">Velocidade média do barco
          <input type="number" min={3} max={120} value={vel} disabled={disabled} onChange={(e) => mudarRota({ velocidade_kmh: Number(e.target.value) })} /> km/h
        </label>
        {pend.length > 0
          ? <p className="lg-pend">Para a EDA acompanhar a viagem ao vivo, falta {pend.join(', ')}.</p>
          : <p className="lg-ok">Pronto: a viagem sai com embarque, caminho e destino marcados.</p>}
      </div>

      {paradas.length > 0 && (
        <div className="lg-paradas">
          {paradas.map((p: ParadaRotaEDA, i) => (
            <div key={i} className="lg-par">
              <span className="lg-par-n">{i + 1}</span>
              <input value={p.nome} maxLength={80} disabled={disabled} aria-label={`Nome da parada ${i + 1}`} onChange={(e) => mudarRota({ paradas: paradas.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)) })} />
              <input type="number" min={0} max={1440} value={p.minutos ?? 0} disabled={disabled} aria-label={`Minutos na parada ${i + 1}`} onChange={(e) => mudarRota({ paradas: paradas.map((x, j) => (j === i ? { ...x, minutos: Number(e.target.value) } : x)) })} />
              <small>min</small>
              <button type="button" disabled={disabled} aria-label={`Remover parada ${i + 1}`} onClick={() => mudarRota({ paradas: paradas.filter((_, j) => j !== i) })}>×</button>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .lg { display: grid; gap: 14px; min-width: 0; }
        .lg-campos { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 720px) { .lg-campos { grid-template-columns: 1fr; } }
        .lg-rot { display: block; margin-bottom: 8px; font-size: 10px; font-weight: 600; letter-spacing: .13em; text-transform: uppercase; color: var(--ern-secundario); }
        .lg :global(.lg-input) { width: 100%; min-height: 48px; border-radius: 12px; border: 1px solid var(--ern-borda); background: var(--ern-fundo); padding: 0 16px; font-size: 14px; color: var(--ern-texto); outline: none; }
        .lg-mapa-caixa { position: relative; isolation: isolate; border-radius: 18px; overflow: hidden; border: 1px solid var(--ern-borda); }
        .lg-mapa { height: 440px; background: #0b1512; z-index: 0; }
        .lg-barra { position: absolute; z-index: 600; top: 10px; right: 10px; display: flex; gap: 6px; }
        .lg-barra button, .lg-seg { font: inherit; font-size: 12px; font-weight: 600; height: 32px; padding: 0 12px; border-radius: 999px; border: 1px solid rgb(255 255 255 / 18%); background: rgb(7 17 14 / 86%); color: #f4ead6; cursor: pointer; backdrop-filter: blur(8px); }
        .lg-seg { display: inline-flex; padding: 3px; gap: 2px; }
        .lg-seg button { height: 24px; border: 0; background: transparent; padding: 0 10px; }
        .lg-barra button[aria-pressed='true'] { background: #e3a144; color: #07110e; }
        .lg-painel { position: absolute; z-index: 600; left: 10px; top: 10px; width: min(300px, calc(100% - 140px)); padding: 12px; border-radius: 16px; background: rgb(7 17 14 / 90%); color: #f4ead6; border: 1px solid rgb(227 161 68 / 40%); backdrop-filter: blur(10px); display: grid; gap: 9px; font-size: 12px; box-shadow: 0 14px 34px rgb(0 0 0 / 45%); }
        .lg-ferr { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; padding: 3px; border-radius: 12px; background: rgb(255 255 255 / 6%); }
        .lg-ferr button { font: inherit; font-size: 11.5px; font-weight: 600; height: 30px; border: 0; border-radius: 9px; background: transparent; color: #c9c2ae; cursor: pointer; }
        .lg-ferr button[aria-checked='true'] { background: #e3a144; color: #07110e; }
        .lg-dica-txt { margin: 0; color: #c9c2ae; }
        .lg-num { display: flex; flex-wrap: wrap; gap: 4px 12px; } .lg-num b { color: #f2c86b; }
        .lg-acoes { display: flex; flex-wrap: wrap; gap: 6px; }
        .lg-acoes button { font: inherit; font-size: 11.5px; font-weight: 600; min-height: 30px; padding: 0 11px; border-radius: 999px; border: 1px solid rgb(255 255 255 / 22%); background: transparent; color: inherit; cursor: pointer; }
        .lg-acoes .lg-ouro { background: #e3a144; color: #07110e; border-color: #e3a144; }
        .lg button:disabled { opacity: .45; cursor: default; }
        @media (max-width: 640px) {
          .lg-mapa { height: 420px; }
          .lg-painel { top: auto; bottom: 8px; left: 8px; right: 52px; width: auto; }
        }
        .lg-rodape { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; }
        .lg-vel { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ern-secundario); }
        .lg-vel input, .lg-par input { min-height: 40px; border-radius: 10px; border: 1px solid var(--ern-borda); background: var(--ern-fundo); color: var(--ern-texto); padding: 0 10px; font-size: 14px; }
        .lg-vel input { width: 80px; }
        .lg-pend { margin: 0; font-size: 12.5px; color: #e3a144; }
        .lg-ok { margin: 0; font-size: 12.5px; color: #5cc49a; font-weight: 600; }
        .lg-paradas { display: grid; gap: 8px; }
        .lg-par { display: grid; grid-template-columns: 26px 1fr 80px auto 36px; gap: 8px; align-items: center; }
        .lg-par-n { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: #8cc3f2; color: #07110e; font-size: 11px; font-weight: 800; }
        .lg-par small { color: var(--ern-secundario); }
        .lg-par button { height: 36px; border-radius: 999px; border: 1px solid var(--ern-borda); background: transparent; color: var(--ern-texto); cursor: pointer; font-size: 16px; }
        .lg :global(.lg-marco) { display: grid; place-items: center; width: 100%; height: 100%; border-radius: 50%; border: 3px solid #fff; font-size: 12px; font-weight: 800; color: #07110e; box-shadow: 0 3px 12px rgb(0 0 0 / 50%); cursor: grab; }
        .lg :global(.lg-dica) { background: rgb(7 17 14 / 92%); color: #f4ead6; border: 1px solid rgb(227 161 68 / 55%); border-radius: 10px; font-size: 12px; font-weight: 600; }
        .lg :global(.lg-dica::before) { display: none; }
        .lg :global(.leaflet-control-zoom a) { background: rgb(7 17 14 / 88%); color: #f4ead6; }
      `}</style>
    </div>
  );
}

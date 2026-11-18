'use client';

// EDA_LOCAL_MAPA_V2: busca de localização com mapa vivo.
// - O mapa já abre com a região e acompanha o que o operador digita
//   (prévia da sugestão destacada; escolher fixa o pin).
// - Fontes em cascata: 62 municípios do AM (local, sem internet) →
//   OpenStreetMap/Photon (grátis) → Google Places (entra sozinho quando o
//   faturamento do Google estiver ativo).
// - Origem do turista: Amazonas / Outro estado / Outro país (prop `origens`).
// - Clicar no mapa ou arrastar o pin ajusta o ponto exato (comunidades e
//   praias de rio sem endereço formal).

/* eslint-disable @typescript-eslint/no-explicit-any */

import 'leaflet/dist/leaflet.css';
import { useEffect, useId, useRef, useState } from 'react';
import type { Map as MapaL, Marker, TileLayer } from 'leaflet';
import { MUNICIPIOS_AMAZONAS } from '@/lib/municipiosAmazonasERN';
import { carregarGoogle, chaveGoogleMapas } from '@/app/components/motorMapaERN';
import {
  buscarLivre, CAIXA_AMAZONAS, CAIXA_BRASIL, semAcento, siglaUF, zoomDoTipo,
  type OrigemLocal, type ResultadoLivre,
} from '@/lib/geocodificacaoLivreEDA';

export type LocalEDA = {
  texto: string;
  cidade?: string | null;
  lat?: number | null;
  lng?: number | null;
  uf?: string | null;
  pais?: string | null;
};

type Sugestao = {
  id: string;
  principal: string;
  secundario: string;
  fonte: 'municipio' | 'livre' | 'google';
  tipo: string;
  pred?: any;
  coords?: [number, number];
  livre?: ResultadoLivre;
};

type Props = {
  id?: string;
  valor: LocalEDA;
  onChange: (local: LocalEDA) => void;
  modo?: 'endereco' | 'cidade';
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  mapa?: boolean;
  /** Mostra a escolha Amazonas / Outro estado / Outro país (origem do turista). */
  origens?: boolean;
};

const AMAZONAS_GOOGLE = { south: -9.82, west: -73.8, north: 2.25, east: -56.1 };
const ORIGENS: { valor: OrigemLocal; rotulo: string }[] = [
  { valor: 'amazonas', rotulo: 'Amazonas' },
  { valor: 'estado', rotulo: 'Outro estado' },
  { valor: 'pais', rotulo: 'Outro país' },
];

const cacheLivre = new Map<string, ResultadoLivre[]>();

function caixaParaLimites(c: [number, number, number, number]): [[number, number], [number, number]] {
  return [[c[1], c[0]], [c[3], c[2]]];
}

function origemInicial(v: LocalEDA): OrigemLocal {
  if (v.pais && semAcento(v.pais) !== 'brasil') return 'pais';
  if (v.uf && v.uf !== 'AM') return 'estado';
  const m = /-\s*([A-Z]{2})$/.exec(v.texto?.trim() ?? '');
  if (m && m[1] !== 'AM') return 'estado';
  return 'amazonas';
}

export default function CampoLocalEDA({
  id, valor, onChange, modo = 'endereco', placeholder, className, disabled, required,
  mapa = modo === 'endereco', origens = false,
}: Props) {
  const idLista = useId();
  const [texto, setTexto] = useState(valor.texto);
  const [origem, setOrigem] = useState<OrigemLocal>(() => (origens ? origemInicial(valor) : 'amazonas'));
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const [buscando, setBuscando] = useState(false);
  const [google, setGoogle] = useState<any>(null);
  const [camada, setCamada] = useState<'satelite' | 'ruas'>('satelite');
  const [mapaPronto, setMapaPronto] = useState(false);
  const sessao = useRef<any>(null);
  const caixaMapa = useRef<HTMLDivElement>(null);
  const L = useRef<typeof import('leaflet') | null>(null);
  const objMapa = useRef<{ mapa: MapaL; pin: Marker | null; previa: Marker | null; sat: TileLayer; rot: TileLayer; ruas: TileLayer } | null>(null);
  const ultimaPrevia = useRef('');
  const pedido = useRef(0);
  const valorRef = useRef(valor);
  valorRef.current = valor;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Sincroniza quando o formulário é limpo/recarregado.
  useEffect(() => { setTexto(valor.texto); }, [valor.texto]);

  // Google é opcional: só soma sugestões quando o Places estiver liberado.
  useEffect(() => {
    const chave = chaveGoogleMapas();
    if (!chave) return;
    let vivo = true;
    carregarGoogle(chave, () => { if (vivo) setGoogle(null); })
      .then(async (g) => { await g.maps.importLibrary('places'); if (vivo) setGoogle(g); })
      .catch(() => { /* segue com as fontes gratuitas */ });
    return () => { vivo = false; };
  }, []);

  // ---------- Sugestões enquanto digita ----------
  useEffect(() => {
    const termo = texto.trim();
    if (!aberto || termo.length < 2) { setSugestoes([]); setBuscando(false); return; }
    const n = semAcento(termo);
    const municipios: Sugestao[] = origem !== 'amazonas' ? [] : MUNICIPIOS_AMAZONAS
      .filter((m) => semAcento(m.nome).includes(n) || n.includes(semAcento(m.nome)))
      .sort((a, b) => Number(!semAcento(a.nome).startsWith(n)) - Number(!semAcento(b.nome).startsWith(n)))
      .slice(0, modo === 'cidade' ? 8 : 3)
      .map((m) => ({ id: m.ibge, principal: m.nome, secundario: 'Amazonas · município', fonte: 'municipio', tipo: 'municipio', coords: m.coords }));
    setSugestoes(municipios);
    setAtivo(municipios.length ? 0 : -1);
    if (termo.length < 3) return;

    const meu = ++pedido.current;
    const controle = new AbortController();
    setBuscando(true);
    const t = window.setTimeout(async () => {
      const chaveCache = `${origem}|${modo}|${semAcento(termo)}`;
      const [livres, daGoogle] = await Promise.all([
        (async () => {
          if (cacheLivre.has(chaveCache)) return cacheLivre.get(chaveCache)!;
          try {
            const r = await buscarLivre(termo, { origem, modo, sinal: controle.signal });
            cacheLivre.set(chaveCache, r);
            if (cacheLivre.size > 80) cacheLivre.delete(cacheLivre.keys().next().value as string);
            return r;
          } catch { return [] as ResultadoLivre[]; }
        })(),
        (async () => {
          if (!google) return [] as Sugestao[];
          try {
            const { AutocompleteSuggestion, AutocompleteSessionToken } = google.maps.places;
            sessao.current ??= new AutocompleteSessionToken();
            const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
              input: termo, sessionToken: sessao.current, language: 'pt-BR',
              ...(origem === 'amazonas' ? { locationBias: AMAZONAS_GOOGLE, region: 'br' } : {}),
              ...(origem === 'estado' ? { includedRegionCodes: ['br'] } : {}),
              ...(modo === 'cidade' ? { includedPrimaryTypes: ['locality', 'administrative_area_level_2'] } : {}),
            });
            return (suggestions ?? []).map((s: any) => s.placePrediction).filter(Boolean).map((p: any) => ({
              id: p.placeId, principal: p.mainText?.toString() ?? p.text.toString(),
              secundario: p.secondaryText?.toString() ?? '', fonte: 'google' as const, tipo: 'google', pred: p,
            }));
          } catch { return [] as Sugestao[]; }
        })(),
      ]);
      if (meu !== pedido.current) return;
      const nomes = new Set(municipios.map((m) => semAcento(m.principal)));
      const deLivre: Sugestao[] = livres
        .filter((r) => !(r.tipo === 'city' && r.uf === 'AM' && nomes.has(semAcento(r.principal))))
        .map((r) => ({ id: r.id, principal: r.principal, secundario: r.secundario, fonte: 'livre', tipo: r.tipo, coords: r.coords, livre: r }));
      // Google primeiro quando existir (mais completo em ruas); OSM completa.
      const juntas = [...municipios, ...daGoogle, ...deLivre];
      const vistas = new Set<string>();
      const finais = juntas.filter((s) => {
        const k = semAcento(`${s.principal}|${s.secundario.split(' · ')[0] ?? ''}`);
        if (vistas.has(k)) return false;
        vistas.add(k); return true;
      }).slice(0, 8);
      setSugestoes(finais);
      setAtivo((a) => (a >= 0 && a < finais.length ? a : finais.length ? 0 : -1));
      setBuscando(false);
    }, 350);
    return () => { window.clearTimeout(t); controle.abort(); };
  }, [texto, aberto, google, modo, origem]);

  // ---------- Mapa vivo (Leaflet, gratuito) ----------
  useEffect(() => {
    if (!mapa || !caixaMapa.current) return;
    let vivo = true;
    let observador: ResizeObserver | null = null;
    void import('leaflet').then((lib) => {
      if (!vivo || !caixaMapa.current || objMapa.current) return;
      L.current = lib;
      const m = lib.map(caixaMapa.current, { zoomControl: false, scrollWheelZoom: false, attributionControl: true, minZoom: 2, maxZoom: 19 });
      lib.control.zoom({ position: 'bottomright' }).addTo(m);
      const sat = lib.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Imagens &copy; Esri, Maxar', maxZoom: 19, maxNativeZoom: 16,
      });
      const rot = lib.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, maxNativeZoom: 16, opacity: 0.9 });
      const ruas = lib.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19,
      });
      sat.addTo(m); rot.addTo(m);
      objMapa.current = { mapa: m, pin: null, previa: null, sat, rot, ruas };
      const v = valorRef.current;
      if (v.lat != null && v.lng != null) m.setView([v.lat, v.lng], 15);
      else m.fitBounds(caixaParaLimites(origem === 'amazonas' ? CAIXA_AMAZONAS : CAIXA_BRASIL), { padding: [10, 10] });
      m.on('click', (e: any) => fixarPin(e.latlng.lat, e.latlng.lng, true));
      observador = new ResizeObserver(() => m.invalidateSize({ pan: false }));
      observador.observe(caixaMapa.current);
      setMapaPronto(true);
    });
    return () => {
      vivo = false;
      observador?.disconnect();
      objMapa.current?.mapa.remove();
      objMapa.current = null;
      setMapaPronto(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapa]);

  // Troca satélite / ruas.
  useEffect(() => {
    const o = objMapa.current;
    if (!o) return;
    if (camada === 'ruas') { o.mapa.removeLayer(o.sat); o.mapa.removeLayer(o.rot); o.ruas.addTo(o.mapa); }
    else { o.mapa.removeLayer(o.ruas); o.sat.addTo(o.mapa); o.rot.addTo(o.mapa); }
  }, [camada, mapaPronto]);

  // Ao trocar a origem, o mapa enquadra a região.
  useEffect(() => {
    const o = objMapa.current;
    if (!o || valorRef.current.lat != null) return;
    if (origem === 'pais') o.mapa.setView([10, -30], 2);
    else o.mapa.flyToBounds(caixaParaLimites(origem === 'amazonas' ? CAIXA_AMAZONAS : CAIXA_BRASIL), { padding: [10, 10], duration: 1 });
  }, [origem, mapaPronto]);

  function iconePin(previa: boolean) {
    return L.current!.divIcon({
      className: previa ? 'cl-pin cl-pin--previa' : 'cl-pin',
      html: '<span></span>',
      iconSize: [28, 28],
      iconAnchor: [14, 26],
    });
  }

  function fixarPin(lat: number, lng: number, avisar: boolean) {
    const o = objMapa.current;
    if (!o || !L.current) return;
    if (o.previa) { o.mapa.removeLayer(o.previa); o.previa = null; }
    if (!o.pin) {
      o.pin = L.current.marker([lat, lng], { draggable: true, icon: iconePin(false), title: 'Arraste para ajustar', keyboard: true }).addTo(o.mapa);
      o.pin.on('dragend', () => {
        const p = o.pin!.getLatLng();
        onChangeRef.current({ ...valorRef.current, lat: p.lat, lng: p.lng });
      });
    } else {
      o.pin.setLatLng([lat, lng]);
    }
    if (avisar) onChangeRef.current({ ...valorRef.current, lat, lng });
  }

  // Coordenadas vindas de fora (edição) posicionam o pin.
  useEffect(() => {
    const o = objMapa.current;
    if (!o || valor.lat == null || valor.lng == null) return;
    const atual = o.pin?.getLatLng();
    if (atual && Math.abs(atual.lat - valor.lat) < 1e-7 && Math.abs(atual.lng - valor.lng) < 1e-7) return;
    fixarPin(valor.lat, valor.lng, false);
    if (!aberto) o.mapa.setView([valor.lat, valor.lng], Math.max(o.mapa.getZoom(), 15));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor.lat, valor.lng, mapaPronto]);

  // Prévia: o mapa acompanha a sugestão destacada enquanto digita.
  useEffect(() => {
    const o = objMapa.current;
    if (!o || !L.current || !aberto) return;
    const s = sugestoes[ativo];
    if (!s?.coords) return;
    const chave = `${s.fonte}${s.id}`;
    if (chave === ultimaPrevia.current) return;
    ultimaPrevia.current = chave;
    const lim = s.livre?.limites;
    if (lim && s.tipo !== 'house' && s.tipo !== 'street') o.mapa.flyToBounds(lim, { padding: [16, 16], duration: 0.9, maxZoom: zoomDoTipo(s.tipo) });
    else o.mapa.flyTo(s.coords, zoomDoTipo(s.tipo), { duration: 0.9 });
    if (!o.previa) o.previa = L.current.marker(s.coords, { icon: iconePin(true), interactive: false, keyboard: false }).addTo(o.mapa);
    else o.previa.setLatLng(s.coords);
  }, [sugestoes, ativo, aberto]);

  // Fechou a lista sem escolher: some a prévia e volta ao pin fixado.
  useEffect(() => {
    if (aberto) return;
    ultimaPrevia.current = '';
    const o = objMapa.current;
    if (o?.previa) { o.mapa.removeLayer(o.previa); o.previa = null; }
  }, [aberto]);

  function aplicar(local: LocalEDA, zoom: number) {
    setTexto(local.texto);
    onChangeRef.current(local);
    if (local.lat != null && local.lng != null) {
      fixarPin(local.lat, local.lng, false);
      objMapa.current?.mapa.flyTo([local.lat, local.lng], zoom, { duration: 0.8 });
    }
  }

  async function escolher(s: Sugestao) {
    setAberto(false);
    setSugestoes([]);
    if (s.fonte === 'municipio' && s.coords) {
      const t = `${s.principal} - AM`;
      aplicar({ texto: t, cidade: s.principal, uf: 'AM', pais: 'Brasil', lat: s.coords[0], lng: s.coords[1] }, 13);
      return;
    }
    if (s.fonte === 'livre' && s.livre) {
      const r = s.livre;
      const cidade = r.cidade ?? r.principal;
      const t = modo === 'cidade'
        ? (r.codigoPais === 'BR' ? `${cidade}${r.uf ? ` - ${r.uf}` : ''}` : [r.tipo === 'country' ? null : cidade, r.pais].filter(Boolean).join(', '))
        : [r.principal, r.secundario].filter(Boolean).join(', ').replace(/ · /g, ', ');
      aplicar({ texto: t, cidade: r.tipo === 'country' ? null : cidade, uf: r.uf, pais: r.pais, lat: r.coords[0], lng: r.coords[1] }, zoomDoTipo(r.tipo));
      return;
    }
    try {
      const place = s.pred.toPlace();
      await place.fetchFields({ fields: ['formattedAddress', 'location', 'addressComponents', 'displayName'] });
      sessao.current = null; // encerra a sessão de busca (cobrança por sessão)
      const comp = (tipo: string) => place.addressComponents?.find((c: any) => c.types.includes(tipo));
      const cidade = comp('locality')?.longText ?? comp('administrative_area_level_2')?.longText ?? null;
      const pais = comp('country')?.longText ?? null;
      const ehBR = comp('country')?.shortText === 'BR';
      const uf = ehBR ? (comp('administrative_area_level_1')?.shortText ?? siglaUF(comp('administrative_area_level_1')?.longText)) : null;
      const t = modo === 'cidade'
        ? (ehBR ? [cidade ?? s.principal, uf].filter(Boolean).join(' - ') : [cidade ?? s.principal, pais].filter(Boolean).join(', '))
        : place.formattedAddress ?? `${s.principal}, ${s.secundario}`;
      aplicar({ texto: t, cidade, uf, pais, lat: place.location?.lat() ?? null, lng: place.location?.lng() ?? null }, modo === 'cidade' ? 12 : 17);
    } catch {
      const t = [s.principal, s.secundario].filter(Boolean).join(', ');
      setTexto(t);
      onChangeRef.current({ texto: t, cidade: null, lat: null, lng: null });
    }
  }

  const fontes = new Set(sugestoes.map((s) => s.fonte));

  return (
    <div className="cl">
      {origens && (
        <div className="cl-origens" role="radiogroup" aria-label="Origem">
          {ORIGENS.map((o) => (
            <button key={o.valor} type="button" role="radio" aria-checked={origem === o.valor} disabled={disabled}
              onClick={() => { setOrigem(o.valor); setSugestoes([]); if (texto.trim().length >= 2) setAberto(true); }}>
              {o.rotulo}
            </button>
          ))}
        </div>
      )}
      <div className="cl-campo">
        <input
          id={id}
          className={className}
          value={texto}
          disabled={disabled}
          required={required}
          autoComplete="off"
          role="combobox"
          aria-expanded={aberto && sugestoes.length > 0}
          aria-controls={idLista}
          aria-autocomplete="list"
          aria-busy={buscando}
          placeholder={placeholder ?? (modo === 'cidade'
            ? (origem === 'pais' ? 'Digite a cidade e o país (ex.: Lisboa)' : origem === 'estado' ? 'Digite a cidade (ex.: Recife)' : 'Digite a cidade (ex.: Barcelos)')
            : 'Digite o endereço, comunidade ou ponto de referência')}
          onChange={(e) => {
            setTexto(e.target.value);
            setAberto(true);
            // texto livre continua valendo; coordenadas só ao escolher ou tocar no mapa
            onChangeRef.current({ ...valorRef.current, texto: e.target.value });
          }}
          onFocus={() => setAberto(true)}
          onBlur={() => window.setTimeout(() => setAberto(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && aberto) { e.stopPropagation(); setAberto(false); return; }
            if (!sugestoes.length) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); setAtivo((a) => (a + 1) % sugestoes.length); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((a) => (a - 1 + sugestoes.length) % sugestoes.length); }
            else if (e.key === 'Enter' && ativo >= 0) { e.preventDefault(); void escolher(sugestoes[ativo]); }
          }}
        />
        {buscando && <span className="cl-busca" aria-hidden="true" />}
        {aberto && sugestoes.length > 0 && (
          <ul id={idLista} role="listbox" className="cl-lista">
            {sugestoes.map((s, i) => (
              <li key={s.fonte + s.id} role="option" aria-selected={i === ativo}
                onMouseDown={(e) => { e.preventDefault(); void escolher(s); }}
                onMouseEnter={() => setAtivo(i)}>
                <span aria-hidden="true">{s.fonte === 'municipio' ? '◆' : '⌖'}</span>
                <div><strong>{s.principal}</strong><small>{s.secundario}</small></div>
              </li>
            ))}
            <li className="cl-fonte" aria-hidden="true">
              {[fontes.has('google') && 'Google', fontes.has('livre') && '© OpenStreetMap'].filter(Boolean).join(' · ')}
            </li>
          </ul>
        )}
      </div>
      {mapa && (
        <div className="cl-mapa-caixa">
          <div ref={caixaMapa} className="cl-mapa" role="application" aria-label="Mapa do local: toque para marcar o ponto" />
          <button type="button" className="cl-camada" onClick={() => setCamada((c) => (c === 'satelite' ? 'ruas' : 'satelite'))}>
            {camada === 'satelite' ? 'Ruas' : 'Satélite'}
          </button>
        </div>
      )}
      {mapa && <small className="cl-aviso">O mapa acompanha o que você digita. Toque no mapa ou arraste o pin para marcar o ponto exato.</small>}

      <style jsx>{`
        .cl { display: grid; gap: 8px; min-width: 0; }
        .cl-origens { display: flex; flex-wrap: wrap; gap: 6px; }
        .cl-origens button { min-height: 32px; padding: 0 12px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer;
          border: 1px solid var(--ern-borda, rgb(237 237 227 / 18%)); background: transparent; color: var(--ern-secundario, #a9bdb2); }
        .cl-origens button[aria-checked='true'] { border-color: var(--ern-destaque, #e3a144); color: var(--ern-destaque, #e3a144); background: rgb(227 161 68 / 10%); }
        .cl-campo { position: relative; }
        .cl-busca { position: absolute; right: 12px; top: 50%; width: 14px; height: 14px; margin-top: -7px; border-radius: 50%;
          border: 2px solid rgb(227 161 68 / 25%); border-top-color: var(--ern-destaque, #e3a144); animation: cl-gira .8s linear infinite; pointer-events: none; }
        @keyframes cl-gira { to { transform: rotate(360deg); } }
        .cl-lista { position: absolute; z-index: 1000; left: 0; right: 0; top: calc(100% + 6px); margin: 0; padding: 6px; list-style: none;
          border-radius: 16px; border: 1px solid var(--ern-borda, rgb(237 237 227 / 18%)); background: var(--ern-painel, #0e1c17);
          box-shadow: 0 18px 40px rgb(0 0 0 / 45%); max-height: 320px; overflow: auto; }
        .cl-lista li { display: flex; gap: 10px; align-items: center; padding: 10px 12px; border-radius: 12px; cursor: pointer; color: var(--ern-texto, #edede3); }
        .cl-lista li[aria-selected='true'] { background: rgb(227 161 68 / 14%); }
        .cl-lista li > span { color: var(--ern-destaque, #e3a144); width: 16px; text-align: center; flex: none; }
        .cl-lista strong { display: block; font-size: 14px; }
        .cl-lista small { display: block; font-size: 12px; color: var(--ern-secundario, #a9bdb2); }
        .cl-lista .cl-fonte { cursor: default; justify-content: flex-end; font-size: 10px; color: var(--ern-secundario, #a9bdb2); padding: 4px 8px; }
        .cl-mapa-caixa { position: relative; }
        .cl-mapa { height: 220px; border-radius: 16px; overflow: hidden; border: 1px solid var(--ern-borda, rgb(237 237 227 / 18%)); background: #0b1512; z-index: 0; }
        .cl-camada { position: absolute; top: 10px; right: 10px; z-index: 500; min-height: 32px; padding: 0 12px; border-radius: 999px; font-size: 12px; font-weight: 700;
          border: 1px solid rgb(255 255 255 / 25%); background: rgb(7 17 14 / 82%); color: #edede3; cursor: pointer; }
        .cl-aviso { font-size: 11px; color: var(--ern-secundario, #a9bdb2); }
        .cl :global(.cl-pin span) { display: block; width: 22px; height: 22px; margin: 2px 3px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg);
          background: var(--ern-destaque, #e3a144); border: 2px solid #fff; box-shadow: 0 4px 12px rgb(0 0 0 / 45%); }
        .cl :global(.cl-pin--previa span) { background: transparent; border: 2px dashed #f4c77e; box-shadow: none; animation: cl-pulsa 1.2s ease-in-out infinite; }
        @keyframes cl-pulsa { 50% { opacity: .45; } }
        .cl :global(.leaflet-control-attribution) { font-size: 9px; }
        @media (max-width: 640px) { .cl-mapa { height: 190px; } }
        @media (prefers-reduced-motion: reduce) { .cl-busca, .cl :global(.cl-pin--previa span) { animation: none; } }
      `}</style>
    </div>
  );
}

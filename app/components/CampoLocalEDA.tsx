'use client';

// EDA_LOCAL_MAPA_V1: busca de localização que filtra enquanto o operador digita.
// - Sugestões do Google (Places API New) com prioridade para o Amazonas.
// - Os 62 municípios do Amazonas sempre aparecem primeiro (funciona offline
//   ou sem chave do Google).
// - Mapa com o pin escolhido; clicar ou arrastar ajusta o ponto exato
//   (comunidades e praias de rio sem endereço formal).

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useId, useRef, useState } from 'react';
import { MUNICIPIOS_AMAZONAS } from '@/lib/municipiosAmazonasERN';
import { carregarGoogle, chaveGoogleMapas } from '@/app/components/motorMapaERN';

export type LocalEDA = { texto: string; cidade?: string | null; lat?: number | null; lng?: number | null };

type Sugestao = { id: string; principal: string; secundario: string; fonte: 'municipio' | 'google'; pred?: any; coords?: [number, number] };

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
};

const AMAZONAS = { south: -9.82, west: -73.8, north: 2.25, east: -56.1 };

function semAcento(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export default function CampoLocalEDA({
  id, valor, onChange, modo = 'endereco', placeholder, className, disabled, required, mapa = modo === 'endereco',
}: Props) {
  const idLista = useId();
  const [texto, setTexto] = useState(valor.texto);
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const [google, setGoogle] = useState<any>(null);
  const [aviso, setAviso] = useState('');
  const sessao = useRef<any>(null);
  const caixaMapa = useRef<HTMLDivElement>(null);
  const objMapa = useRef<{ mapa: any; pin: any } | null>(null);
  const ultimo = useRef(0);
  const valorRef = useRef(valor);
  valorRef.current = valor;

  // Sincroniza quando o formulário é limpo/recarregado.
  useEffect(() => { setTexto(valor.texto); }, [valor.texto]);

  // Google é opcional: sem chave ou sem Places, ficam os municípios do AM.
  useEffect(() => {
    const chave = chaveGoogleMapas();
    if (!chave) return;
    let vivo = true;
    carregarGoogle(chave, () => { if (vivo) { setGoogle(null); setAviso('Mapa indisponível agora; use a lista de municípios.'); } })
      .then(async (g) => {
        await g.maps.importLibrary('places');
        if (vivo) setGoogle(g);
      })
      .catch(() => { /* segue com municípios */ });
    return () => { vivo = false; };
  }, []);

  // Sugestões enquanto digita (debounce).
  useEffect(() => {
    const termo = texto.trim();
    if (!aberto || termo.length < 2) { setSugestoes([]); return; }
    const n = semAcento(termo);
    const municipios: Sugestao[] = MUNICIPIOS_AMAZONAS
      .filter((m) => semAcento(m.nome).includes(n))
      .slice(0, modo === 'cidade' ? 8 : 3)
      .map((m) => ({ id: m.ibge, principal: m.nome, secundario: 'Amazonas · município', fonte: 'municipio', coords: m.coords }));
    setSugestoes(municipios);
    setAtivo(municipios.length ? 0 : -1);
    if (!google || termo.length < 3) return;

    const pedido = ++ultimo.current;
    const t = window.setTimeout(async () => {
      try {
        const { AutocompleteSuggestion, AutocompleteSessionToken } = google.maps.places;
        sessao.current ??= new AutocompleteSessionToken();
        const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: termo,
          sessionToken: sessao.current,
          language: 'pt-BR',
          region: 'br',
          locationBias: AMAZONAS,
          ...(modo === 'cidade' ? { includedPrimaryTypes: ['locality', 'administrative_area_level_2'] } : {}),
        });
        if (pedido !== ultimo.current) return;
        const nomes = new Set(municipios.map((m) => semAcento(m.principal)));
        const daGoogle: Sugestao[] = (suggestions ?? [])
          .map((s: any) => s.placePrediction)
          .filter(Boolean)
          .map((p: any) => ({
            id: p.placeId,
            principal: p.mainText?.toString() ?? p.text.toString(),
            secundario: p.secondaryText?.toString() ?? '',
            fonte: 'google' as const,
            pred: p,
          }))
          .filter((s: Sugestao) => !(modo === 'cidade' && nomes.has(semAcento(s.principal))));
        setSugestoes([...municipios, ...daGoogle].slice(0, 8));
      } catch {
        // Places desativado na chave: segue só com municípios.
      }
    }, 280);
    return () => window.clearTimeout(t);
  }, [texto, aberto, google, modo]);

  // Mapa com pin ajustável.
  useEffect(() => {
    if (!mapa || !google || !caixaMapa.current || valor.lat == null || valor.lng == null) return;
    let vivo = true;
    (async () => {
      const { Map } = await google.maps.importLibrary('maps');
      const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');
      if (!vivo || !caixaMapa.current) return;
      const pos = { lat: valor.lat as number, lng: valor.lng as number };
      if (!objMapa.current) {
        const m = new Map(caixaMapa.current, {
          center: pos, zoom: 15, mapId: 'DEMO_MAP_ID', mapTypeId: 'hybrid',
          streetViewControl: false, fullscreenControl: false, mapTypeControl: false, clickableIcons: false,
        });
        const pin = new AdvancedMarkerElement({ map: m, position: pos, gmpDraggable: true, title: 'Arraste para ajustar' });
        const mover = (lat: number, lng: number) => {
          pin.position = { lat, lng };
          onChange({ ...valorRef.current, lat, lng });
        };
        pin.addListener('dragend', () => { const p = pin.position; mover(p.lat, p.lng); });
        m.addListener('click', (e: any) => e.latLng && mover(e.latLng.lat(), e.latLng.lng()));
        objMapa.current = { mapa: m, pin };
      } else {
        objMapa.current.pin.position = pos;
        objMapa.current.mapa.panTo(pos);
      }
    })().catch(() => { /* sem mapa */ });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [google, mapa, valor.lat, valor.lng]);

  async function escolher(s: Sugestao) {
    setAberto(false);
    setSugestoes([]);
    if (s.fonte === 'municipio' && s.coords) {
      const t = modo === 'cidade' ? `${s.principal} - AM` : s.principal + ' - AM';
      setTexto(t);
      onChange({ texto: t, cidade: s.principal, lat: s.coords[0], lng: s.coords[1] });
      return;
    }
    try {
      const place = s.pred.toPlace();
      await place.fetchFields({ fields: ['formattedAddress', 'location', 'addressComponents', 'displayName'] });
      sessao.current = null; // encerra a sessão de busca (cobrança por sessão)
      const comp = (tipo: string) => place.addressComponents?.find((c: any) => c.types.includes(tipo));
      const cidade = comp('locality')?.longText ?? comp('administrative_area_level_2')?.longText ?? null;
      const uf = comp('administrative_area_level_1')?.shortText;
      const t = modo === 'cidade'
        ? [cidade ?? s.principal, uf].filter(Boolean).join(' - ')
        : place.formattedAddress ?? `${s.principal}, ${s.secundario}`;
      setTexto(t);
      onChange({ texto: t, cidade, lat: place.location?.lat() ?? null, lng: place.location?.lng() ?? null });
    } catch {
      const t = [s.principal, s.secundario].filter(Boolean).join(', ');
      setTexto(t);
      onChange({ texto: t, cidade: null, lat: null, lng: null });
    }
  }

  return (
    <div className="cl">
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
          placeholder={placeholder ?? (modo === 'cidade' ? 'Digite a cidade (ex.: Barcelos)' : 'Digite o endereço, comunidade ou ponto de referência')}
          onChange={(e) => {
            setTexto(e.target.value);
            setAberto(true);
            // texto livre continua valendo; coordenadas só ao escolher
            onChange({ texto: e.target.value, cidade: valor.cidade ?? null, lat: valor.lat ?? null, lng: valor.lng ?? null });
          }}
          onFocus={() => setAberto(true)}
          onBlur={() => window.setTimeout(() => setAberto(false), 150)}
          onKeyDown={(e) => {
            if (!sugestoes.length) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); setAtivo((a) => (a + 1) % sugestoes.length); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((a) => (a - 1 + sugestoes.length) % sugestoes.length); }
            else if (e.key === 'Enter' && ativo >= 0) { e.preventDefault(); void escolher(sugestoes[ativo]); }
            else if (e.key === 'Escape') setAberto(false);
          }}
        />
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
            {google && <li className="cl-google" aria-hidden="true">Sugestões do Google</li>}
          </ul>
        )}
      </div>
      {aviso && <small className="cl-aviso">{aviso}</small>}
      {mapa && google && valor.lat != null && valor.lng != null && (
        <>
          <div ref={caixaMapa} className="cl-mapa" />
          <small className="cl-aviso">Toque no mapa ou arraste o pin para ajustar o ponto exato.</small>
        </>
      )}

      <style jsx>{`
        .cl { display: grid; gap: 8px; }
        .cl-campo { position: relative; }
        .cl-lista { position: absolute; z-index: 40; left: 0; right: 0; top: calc(100% + 6px); margin: 0; padding: 6px; list-style: none;
          border-radius: 16px; border: 1px solid var(--ern-borda, rgb(237 237 227 / 18%)); background: var(--ern-painel, #0e1c17);
          box-shadow: 0 18px 40px rgb(0 0 0 / 45%); max-height: 320px; overflow: auto; }
        .cl-lista li { display: flex; gap: 10px; align-items: center; padding: 10px 12px; border-radius: 12px; cursor: pointer; color: var(--ern-texto, #edede3); }
        .cl-lista li[aria-selected='true'] { background: rgb(227 161 68 / 14%); }
        .cl-lista li > span { color: var(--ern-destaque, #e3a144); width: 16px; text-align: center; }
        .cl-lista strong { display: block; font-size: 14px; }
        .cl-lista small { display: block; font-size: 12px; color: var(--ern-secundario, #a9bdb2); }
        .cl-lista .cl-google { cursor: default; justify-content: flex-end; font-size: 10px; color: var(--ern-secundario, #a9bdb2); padding: 4px 8px; }
        .cl-mapa { height: 220px; border-radius: 16px; overflow: hidden; border: 1px solid var(--ern-borda, rgb(237 237 227 / 18%)); }
        .cl-aviso { font-size: 11px; color: var(--ern-secundario, #a9bdb2); }
      `}</style>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { Map as LeafletMap, CircleMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';

type DemandaMapa = {
  id: string;
  titulo: string;
  localidade: string;
  status: string;
};
type Props = { demandas?: DemandaMapa[]; carregando?: boolean };
type Localidade = {
  id: string;
  nome: string;
  coordenadas: [number, number];
};

// Referências aproximadas das sedes municipais, não endereços de parceiros.
const LOCALIDADES: Localidade[] = [
  { id: 'manaus', nome: 'Manaus', coordenadas: [-3.119, -60.022] },
  { id: 'novo-airao', nome: 'Novo Airão', coordenadas: [-2.621, -60.944] },
  { id: 'barcelos', nome: 'Barcelos', coordenadas: [-0.975, -62.924] },
  { id: 'santa-isabel', nome: 'Santa Isabel do Rio Negro', coordenadas: [-0.414, -65.019] },
  { id: 'sao-gabriel', nome: 'São Gabriel da Cachoeira', coordenadas: [-0.13, -67.089] },
];
const LIMITES: [[number, number], [number, number]] = [[-3.6, -67.7], [0.5, -59.5]];
const BOTAO = 'min-h-11 rounded-xl border px-3 py-2 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3A144]';
const VAZIAS: DemandaMapa[] = [];
function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}
function localizar(texto: string) {
  // Aceita o município isolado e a indicação explícita de AM.
  // Comunidades e textos livres precisam de localização própria, sem inferência.
  const nome = normalizar(texto).replace(/\s*(?:\/\s*am|[-–,]\s*am|\(am\))\s*$/, '').trim();
  return LOCALIDADES.find((local) => normalizar(local.nome) === nome);
}

export default function MapaTerritorioERN({ demandas = VAZIAS, carregando = false }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapa = useRef<LeafletMap | null>(null);
  const marcadores = useRef<Record<string, CircleMarker>>({});
  const [selecionada, setSelecionada] = useState('barcelos');
  const [busca, setBusca] = useState('');
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'erro'>('carregando');
  const [falhaBase, setFalhaBase] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [somenteComDemandas, setSomenteComDemandas] = useState(false);
  const resumo = useMemo(() => {
    const porCidade: Record<string, DemandaMapa[]> = Object.fromEntries(LOCALIDADES.map((local) => [local.id, []]));
    let semLocalizacao = 0;
    for (const demanda of demandas) {
      const local = localizar(demanda.localidade);
      if (local) porCidade[local.id].push(demanda);
      else semLocalizacao += 1;
    }
    return { porCidade, semLocalizacao };
  }, [demandas]);
  const visiveis = LOCALIDADES.filter((local) =>
    normalizar(local.nome).includes(normalizar(busca)) &&
    (!somenteComDemandas || resumo.porCidade[local.id].length > 0),
  );
  const local = LOCALIDADES.find((item) => item.id === selecionada) ?? LOCALIDADES[2];
  const itens = resumo.porCidade[local.id];

  useEffect(() => {
    let cancelado = false;
    let instancia: LeafletMap | null = null;
    let observador: ResizeObserver | null = null;
    setEstado('carregando');
    setFalhaBase(false);
    async function iniciar() {
      try {
        const L = await import('leaflet');
        if (cancelado || !container.current) return;
        instancia = L.map(container.current, { scrollWheelZoom: false, minZoom: 3, maxZoom: 16, zoomControl: false });
        mapa.current = instancia;
        L.control.zoom({ position: 'topright' }).addTo(instancia);
        L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(instancia);
        const base = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
          maxZoom: 19,
        });
        base.on('tileerror', () => { if (!cancelado) setFalhaBase(true); });
        base.addTo(instancia);
        for (const cidade of LOCALIDADES) {
          const marcador = L.circleMarker(cidade.coordenadas, {
            radius: 8, color: '#183c2e', weight: 2, fillColor: '#E3A144', fillOpacity: 1,
          }).addTo(instancia);
          const rotulo = document.createElement('span');
          rotulo.textContent = cidade.nome;
          marcador.bindTooltip(rotulo, { direction: 'top', offset: [0, -8] });
          marcador.on('click', () => setSelecionada(cidade.id));
          marcadores.current[cidade.id] = marcador;
        }
        instancia.fitBounds(LIMITES, { padding: [20, 20], animate: false });
        const alvo = instancia;
        observador = new ResizeObserver(() => alvo.invalidateSize({ pan: false }));
        observador.observe(container.current);
        setEstado('pronto');
      } catch (erro) {
        console.error('Não foi possível iniciar o mapa ERN.', erro);
        if (!cancelado) setEstado('erro');
      }
    }
    void iniciar();
    return () => {
      cancelado = true;
      observador?.disconnect();
      instancia?.remove();
      mapa.current = null;
      marcadores.current = {};
    };
  }, [tentativa]);

  useEffect(() => {
    if (estado !== 'pronto') return;
    for (const cidade of LOCALIDADES) {
      const visivel = normalizar(cidade.nome).includes(normalizar(busca)) &&
        (!somenteComDemandas || resumo.porCidade[cidade.id].length > 0);
      marcadores.current[cidade.id]?.setStyle({
        opacity: visivel ? 1 : 0, fillOpacity: visivel ? 1 : 0,
        fillColor: cidade.id === selecionada ? '#E3A144' : '#376b55',
      }).setRadius(cidade.id === selecionada ? 11 : 8);
      const elemento = marcadores.current[cidade.id]?.getElement();
      if (elemento instanceof SVGElement || elemento instanceof HTMLElement) {
        elemento.style.pointerEvents = visivel ? 'auto' : 'none';
      }
    }
  }, [estado, selecionada, busca, somenteComDemandas, resumo]);

  function selecionar(cidade: Localidade) {
    setSelecionada(cidade.id);
    mapa.current?.setView(cidade.coordenadas, 10, { animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches });
  }

  return (
    <section aria-labelledby="titulo-mapa-ern" className="mt-7 min-w-0 overflow-hidden rounded-2xl border border-[#E3A144]/20 bg-[#0A1713] text-[#EDEDE3] sm:rounded-[26px]">
      <div className="border-b border-white/10 p-4 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">Território ERN · visão da operadora</p>
        <h2 id="titulo-mapa-ern" className="mt-2 text-2xl sm:text-3xl" style={{ fontFamily: 'var(--font-fraunces), serif' }}>Alto e Baixo Rio Negro</h2>
        <p className="mt-2 max-w-3xl text-xs leading-6 text-[#EDEDE3]/65">Explore as localidades da rede e consulte as demandas abertas e em rascunho carregadas no painel da sua empresa.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="min-w-0 flex-1 sm:max-w-xs">
            <span className="sr-only">Buscar município</span>
            <input value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Buscar município…" className="min-h-11 w-full rounded-xl border border-white/20 bg-[#07110E] px-3 text-sm outline-none focus:border-[#E3A144]" />
          </label>
          <button type="button" aria-pressed={somenteComDemandas} onClick={() => setSomenteComDemandas((valor) => !valor)} className={`${BOTAO} ${somenteComDemandas ? 'border-[#E3A144] text-[#F4C77E]' : 'border-white/20'}`}>Com demandas</button>
          <button type="button" onClick={() => { setBusca(''); setSomenteComDemandas(false); mapa.current?.fitBounds(LIMITES, { padding: [20, 20], animate: false }); }} className={`${BOTAO} border-white/20`}>Ver toda a região</button>
        </div>
      </div>
      <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_310px]">
        <div className="min-w-0">
          <div className="relative isolate z-0 bg-[#d5dfd4]">
            <div ref={container} aria-label="Mapa interativo dos municípios do Rio Negro. Use também a lista de municípios abaixo." className="h-[350px] w-full sm:h-[460px] lg:h-[520px]" />
            {estado === 'carregando' && <div role="status" className="absolute inset-0 z-[1000] flex items-center justify-center bg-[#0A1713] text-sm">Carregando mapa…</div>}
            {estado === 'erro' && <div role="alert" className="absolute inset-0 z-[1000] flex flex-col items-center justify-center gap-4 bg-[#0A1713] p-6 text-center text-sm"><p>Não foi possível abrir o mapa. A lista de municípios continua disponível.</p><button type="button" onClick={() => setTentativa((valor) => valor + 1)} className={`${BOTAO} border-[#E3A144]`}>Tentar novamente</button></div>}
          </div>
          {falhaBase && estado === 'pronto' && <p role="status" className="border-t border-white/10 p-3 text-xs text-amber-200">Parte da base cartográfica não carregou. Confira a conexão. <button type="button" className="min-h-11 underline" onClick={() => setTentativa((valor) => valor + 1)}>Recarregar mapa</button></p>}
          <div className="flex flex-wrap gap-2 border-t border-white/10 p-3" aria-label="Selecionar município">
            {visiveis.map((cidade) => <button key={cidade.id} type="button" aria-pressed={cidade.id === selecionada} onClick={() => selecionar(cidade)} className={`${BOTAO} ${cidade.id === selecionada ? 'border-[#E3A144]/70 bg-[#E3A144]/10 text-[#F4C77E]' : 'border-white/15 text-[#EDEDE3]/80'}`}>{cidade.nome}{!carregando && ` · ${resumo.porCidade[cidade.id].length}`}</button>)}
            {visiveis.length === 0 && <p role="status" className="p-2 text-xs text-[#EDEDE3]/65">Nenhum município corresponde aos filtros.</p>}
          </div>
        </div>
        <aside className="min-w-0 border-t border-white/10 p-4 lg:border-l lg:border-t-0 sm:p-5">
          <p className="text-[10px] uppercase tracking-widest text-[#7C9C87]">Município selecionado</p>
          <h3 className="mt-2 text-xl text-[#F4C77E]">{local.nome}</h3>
          <p className="mt-2 text-xs leading-6 text-[#EDEDE3]/65">Marcador aproximado da sede municipal. Não representa a posição de uma demanda, embarcação ou parceiro.</p>
          <div className="mt-4 rounded-xl border border-white/10 p-3" aria-live="polite">
            <p className="text-sm">{carregando ? 'Consultando demandas…' : `${itens.length} demanda${itens.length === 1 ? '' : 's'} neste município`}</p>
            {!carregando && itens.length === 0 && <p className="mt-2 text-xs leading-5 text-[#EDEDE3]/60">Nenhuma demanda aberta ou em rascunho foi associada a este município.</p>}
            {!carregando && itens.length > 0 && <ul className="mt-3 max-h-52 space-y-3 overflow-y-auto">{itens.map((demanda) => <li key={demanda.id} className="border-t border-white/10 pt-2"><p className="break-words text-xs leading-5">{demanda.titulo}</p><span className="text-[10px] text-[#E3A144]">{demanda.status === 'aberta' ? 'Aberta' : 'Rascunho'}</span></li>)}</ul>}
          </div>
          <Link href="/demandas" className={`${BOTAO} mt-4 flex items-center justify-center border-[#E3A144]/40 text-[#F4C77E]`}>Gerenciar demandas →</Link>
          <p className="mt-2 text-[10px] leading-5 text-[#EDEDE3]/60">Abre a lista completa de demandas da empresa.</p>
          {!carregando && resumo.semLocalizacao > 0 && <p className="mt-4 rounded-xl border border-[#E3A144]/25 p-3 text-xs leading-5 text-[#F4C77E]">{resumo.semLocalizacao} demanda(s) sem associação a estes municípios. Permanecem disponíveis na lista de demandas.</p>}
        </aside>
      </div>
      <p className="border-t border-white/10 px-4 py-3 text-[11px] leading-5 text-[#EDEDE3]/65">Base territorial inicial · Os números representam demandas, não quantidades de produtos. Sem rastreamento em tempo real ou indicação de rotas navegáveis.</p>
    </section>
  );
}

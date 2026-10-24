'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import VideoDestinoERN from './VideoDestinoERN';
import BarcelosDestinoERN from './BarcelosDestinoERN';
import type { Map as LeafletMap, LayerGroup } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from './LanguageProvider';
import { destinosTranslations } from '@/lib/i18n/destinos';
import './DestinosVisitanteERN.css';

const copy = {
  PT: {
    eyebrow: 'DESTINOS · ENCANTOS RIO NEGRO', title: 'Um mapa. Muitas viagens possíveis.',
    intro: 'Toque em um lugar e descubra o que você quer viver.', search: 'Qual lugar desperta sua curiosidade?',
    all: 'Todo o Rio Negro', interests: ['Tudo', 'Águas e praias', 'Natureza e expedição', 'Cultura viva'],
    overview: 'Ver o território', locate: 'Minha localização', locating: 'Localizando…', selection: 'Minha seleção',
    discover: 'Conhecer este lugar', save: 'Quero conhecer', saved: 'Na minha seleção', close: 'Fechar',
    related: 'Lugares para começar a explorar', regional: 'Referência regional', exact: 'Referência do lugar',
    mapNote: 'O mapa mostra bases regionais. Praias e acessos mudam com as águas.',
    baseNote: 'O mapa está na base regional, não no ponto exato deste atrativo. Combine o acesso com quem conhece o lugar.',
    exactNote: 'Referência da Ilha da Praia Grande. A posição não indica desembarque nem o limite atual da areia.',
    context: 'Imagem de contexto · acervo ERN', collection: 'Acervo ERN',
    galleryTitle: 'Deixe uma paisagem escolher você.', galleryIntro: 'Lugares, celebrações e diferentes formas de viver o Rio Negro.',
    details: 'O que torna esse lugar especial', plan: 'Planejar minha viagem', network: 'Conhecer a rede ERN',
    share: 'Compartilhar lugar', copied: 'Link copiado.', copyLink: 'Copie o link do lugar',
    selectionEmpty: 'Sua viagem começa com uma curiosidade. Toque no coração dos lugares que você quer conhecer.',
    selectionNote: 'Sua seleção fica nesta página durante a visita. Não é uma reserva nem um trajeto de navegação.',
    noResults: 'Não encontramos esse lugar nesta seleção. Experimente outro nome ou explore todo o território.',
    clear: 'Explorar todos os lugares', loading: 'Abrindo os caminhos do Rio Negro…',
    mapError: 'O mapa não abriu. Você pode continuar descobrindo os lugares pelas imagens.', retry: 'Tentar abrir o mapa',
    tilesError: 'Algumas partes do mapa não carregaram. As imagens e os lugares continuam disponíveis.',
    geoError: 'Não foi possível localizar este aparelho. Confira a permissão do navegador.',
    geoNote: 'Posição deste aparelho, consultada uma vez. Precisão aproximada:', removeGeo: 'Remover posição',
    source: 'Informações sobre o lugar', regionalIntro: 'Explore esta região do Rio Negro e converse sobre as possibilidades da sua viagem.',
    waterNote: 'Confirme condições do rio, acesso e disponibilidade antes de viajar.',
    privacy: 'Privacidade', terms: 'Termos de uso', photoMissing: 'Imagem indisponível',
  },
  EN: {
    eyebrow: 'DESTINATIONS · ENCANTOS RIO NEGRO', title: 'One map. Many possible journeys.',
    intro: 'Choose a place and discover what you want to experience.', search: 'Which place sparks your curiosity?',
    all: 'The whole Rio Negro', interests: ['All', 'Water and beaches', 'Nature and expeditions', 'Living culture'],
    overview: 'See the territory', locate: 'My location', locating: 'Locating…', selection: 'My selection',
    discover: 'Discover this place', save: 'I want to visit', saved: 'In my selection', close: 'Close',
    related: 'Places to start exploring', regional: 'Regional reference', exact: 'Place reference',
    mapNote: 'The map shows regional bases. Beaches and access change with river levels.',
    baseNote: 'The map shows the regional base, not the exact attraction. Arrange access with local people who know the place.',
    exactNote: 'Reference for Ilha da Praia Grande. It does not identify a landing point or the current shoreline.',
    context: 'Context image · ERN collection', collection: 'ERN collection',
    galleryTitle: 'Let a landscape choose you.', galleryIntro: 'Places, celebrations and different ways to experience the Rio Negro.',
    details: 'What makes this place special', plan: 'Plan my trip', network: 'Explore the ERN network',
    share: 'Share this place', copied: 'Link copied.', copyLink: 'Copy the place link',
    selectionEmpty: 'Your journey starts with curiosity. Tap the heart on places you want to visit.',
    selectionNote: 'Your selection stays on this page during your visit. It is neither a booking nor a navigation route.',
    noResults: 'No place matches this selection. Try another name or explore the whole territory.',
    clear: 'Explore all places', loading: 'Opening the paths of the Rio Negro…',
    mapError: 'The map could not open. You can still explore the places through their images.', retry: 'Try opening the map',
    tilesError: 'Some map areas could not load. Images and places are still available.',
    geoError: 'This device could not be located. Check your browser permission.',
    geoNote: 'Device position requested once. Approximate accuracy:', removeGeo: 'Remove position',
    source: 'Information about this place', regionalIntro: 'Explore this region of the Rio Negro and discuss the possibilities for your trip.',
    waterNote: 'Confirm river conditions, access and availability before travelling.',
    privacy: 'Privacy', terms: 'Terms of use', photoMissing: 'Image unavailable',
  },
  ES: {
    eyebrow: 'DESTINOS · ENCANTOS RIO NEGRO', title: 'Un mapa. Muchos viajes posibles.',
    intro: 'Elige un lugar y descubre lo que quieres vivir.', search: '¿Qué lugar despierta tu curiosidad?',
    all: 'Todo el Río Negro', interests: ['Todo', 'Aguas y playas', 'Naturaleza y expedición', 'Cultura viva'],
    overview: 'Ver el territorio', locate: 'Mi ubicación', locating: 'Localizando…', selection: 'Mi selección',
    discover: 'Conocer este lugar', save: 'Quiero conocer', saved: 'En mi selección', close: 'Cerrar',
    related: 'Lugares para empezar a explorar', regional: 'Referencia regional', exact: 'Referencia del lugar',
    mapNote: 'El mapa muestra bases regionales. Las playas y los accesos cambian con las aguas.',
    baseNote: 'El mapa muestra la base regional, no el punto exacto del atractivo. Organiza el acceso con quienes conocen el lugar.',
    exactNote: 'Referencia de Ilha da Praia Grande. No indica desembarque ni el límite actual de la arena.',
    context: 'Imagen de contexto · acervo ERN', collection: 'Acervo ERN',
    galleryTitle: 'Deja que un paisaje te elija.', galleryIntro: 'Lugares, celebraciones y diferentes formas de vivir el Río Negro.',
    details: 'Lo que hace especial este lugar', plan: 'Planear mi viaje', network: 'Conocer la red ERN',
    share: 'Compartir lugar', copied: 'Enlace copiado.', copyLink: 'Copia el enlace del lugar',
    selectionEmpty: 'Tu viaje comienza con curiosidad. Toca el corazón de los lugares que quieres conocer.',
    selectionNote: 'Tu selección permanece en esta página durante la visita. No es una reserva ni una ruta de navegación.',
    noResults: 'No encontramos un lugar en esta selección. Prueba otro nombre o explora todo el territorio.',
    clear: 'Explorar todos los lugares', loading: 'Abriendo los caminos del Río Negro…',
    mapError: 'El mapa no se pudo abrir. Puedes seguir explorando los lugares a través de sus imágenes.', retry: 'Intentar abrir el mapa',
    tilesError: 'Algunas partes del mapa no se cargaron. Las imágenes y los lugares siguen disponibles.',
    geoError: 'No se pudo localizar este dispositivo. Revisa el permiso del navegador.',
    geoNote: 'Posición del dispositivo consultada una vez. Precisión aproximada:', removeGeo: 'Quitar posición',
    source: 'Información sobre el lugar', regionalIntro: 'Explora esta región del Río Negro y conversa sobre las posibilidades de tu viaje.',
    waterNote: 'Confirma las condiciones del río, el acceso y la disponibilidad antes de viajar.',
    privacy: 'Privacidad', terms: 'Términos de uso', photoMissing: 'Imagen no disponible',
  },
};

type DestinationId = keyof typeof destinosTranslations.PT.destinations;
type Interest = 'all' | 'waters' | 'nature' | 'culture' | 'fishing';
type CityId = 'manaus' | 'novo-airao' | 'barcelos' | 'santa-isabel' | 'sao-gabriel';
type Scene = {
  id: DestinationId; city: CityId; image: string; context?: boolean;
  interests: Interest[]; source: string; coords?: [number, number];
};
const municipalSource = 'https://www.amazonastur.am.gov.br/municipios/';
const barcelosSource = 'https://turismo.barcelos.am.gov.br/atrativo/';
const icmbio = 'https://www.gov.br/icmbio/pt-br/assuntos/biodiversidade/unidade-de-conservacao/unidades-de-biomas/amazonia/lista-de-ucs/';
const cities: { id: CityId; name: string; coords: [number, number]; image?: string }[] = [
  { id: 'manaus', name: 'Manaus', coords: [-3.119, -60.022] },
  { id: 'novo-airao', name: 'Novo Airão', coords: [-2.621, -60.944] },
  { id: 'barcelos', name: 'Barcelos', coords: [-0.975, -62.924], image: '/images/regiao/barceloscapital.jpg.jpeg' },
  { id: 'santa-isabel', name: 'Santa Isabel do Rio Negro', coords: [-0.414, -65.019] },
  { id: 'sao-gabriel', name: 'São Gabriel da Cachoeira', coords: [-0.13, -67.089] },
];
const scenes: Scene[] = [
  { id: 'cachoeira-eldorado', city: 'barcelos', image: '/images/destinos/eldorado-card.png', interests: ['nature'], source: `${barcelosSource}serra-do-araca/` },
  { id: 'barcelos', city: 'barcelos', image: '/images/regiao/matriz.png.jpeg', interests: ['waters', 'nature', 'culture', 'fishing'], source: municipalSource },
  { id: 'praia-grande', city: 'barcelos', image: '/images/regiao/barcelospraia.png.jpeg', context: true, interests: ['waters'], source: `${barcelosSource}praia-grande/`, coords: [-0.96058, -62.92789] },
  { id: 'mariua', city: 'barcelos', image: '/images/destinos/mariua-capa.jpg', interests: ['waters', 'nature', 'fishing'], source: `${barcelosSource}arquipelago-de-mariua/` },
  { id: 'serra-do-araca', city: 'barcelos', image: '/images/destinos/serra-araca-card.jpeg', interests: ['nature'], source: `${barcelosSource}serra-do-araca/` },
  { id: 'festival-peixe-ornamental', city: 'barcelos', image: '/images/cultura/barcelosfestival.jpg', interests: ['culture'], source: municipalSource },
  { id: 'novo-airao', city: 'novo-airao', image: '/images/cultura/festivaldopeixeboi.jpg', context: true, interests: ['waters', 'nature', 'culture'], source: municipalSource },
  { id: 'anavilhanas', city: 'novo-airao', image: '/images/regiao/ern-amazonia-paisagem.png', context: true, interests: ['waters', 'nature'], source: `${icmbio}parna-de-anavilhanas/parna-de-anavilhanas` },
  { id: 'jau', city: 'novo-airao', image: '/images/regiao/ern-amazonia.jpg', context: true, interests: ['nature'], source: `${icmbio}parna-do-jau/informacoes-sobre-visitacao-2013-parna-do-jau` },
  { id: 'festival-peixe-boi', city: 'novo-airao', image: '/images/cultura/festivaldopeixeboi.jpg', interests: ['culture'], source: municipalSource },
];
// ERN_PESCA_MAPA_V1
const fishingCopy = {
  PT: {
    filter: 'Pesca esportiva',
    title: 'Barcelos · pesca esportiva',
    legend: 'Tucunaré · referência regional de pesca esportiva',
    description: 'Descubra possibilidades de pesca esportiva no Rio Negro, seus afluentes e no território de Mariuá.',
    note: 'O marcador está na base regional de Barcelos. Não indica um pesqueiro exato, autorização de acesso ou garantia de captura.',
    care: 'Confirme condições das águas, regras, autorizações e práticas de captura e soltura com os profissionais responsáveis.',
    button: 'Conhecer a pesca esportiva',
    source: 'Turismo de Barcelos',
  },
  EN: {
    filter: 'Sport fishing',
    title: 'Barcelos · sport fishing',
    legend: 'Peacock bass · regional sport fishing reference',
    description: 'Discover sport fishing possibilities in the Rio Negro, its tributaries and the Mariuá region.',
    note: 'The marker shows the regional base of Barcelos. It is not an exact fishing spot, access permission or a catch guarantee.',
    care: 'Confirm river conditions, rules, permissions and catch-and-release practices with the professionals responsible.',
    button: 'Discover sport fishing',
    source: 'Barcelos Tourism',
  },
  ES: {
    filter: 'Pesca deportiva',
    title: 'Barcelos · pesca deportiva',
    legend: 'Tucunaré · referencia regional de pesca deportiva',
    description: 'Descubra posibilidades de pesca deportiva en el Río Negro, sus afluentes y el territorio de Mariuá.',
    note: 'El marcador está en la base regional de Barcelos. No indica un punto exacto de pesca, permiso de acceso ni garantía de captura.',
    care: 'Confirme condiciones del río, reglas, permisos y prácticas de captura y suelta con los profesionales responsables.',
    button: 'Conocer la pesca deportiva',
    source: 'Turismo de Barcelos',
  },
};

const fishingSource = 'https://turismo.barcelos.am.gov.br/atrativo/pesca-esportiva/';

const fishingSvg = `<span class="ern-tucunare-nado" aria-hidden="true"></span>`;

const interests: Interest[] = ['all', 'waters', 'nature', 'culture', 'fishing'];
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function SceneImage({ src, alt, eager = false }: { src: string; alt: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (failed) return <div className="ern-v-image-fallback" role="img" aria-label={alt}>ERN · Rio Negro</div>;
  // Acervo local: sem serviço externo de imagens.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />;
}

export default function ExploradorDestinosERN() {
  const { idioma } = useLanguage();
  const lang = idioma === 'EN' || idioma === 'ES' ? idioma : 'PT';
  const u = copy[lang];
  const fishing = fishingCopy[lang];
  const t = destinosTranslations[lang];
  const eldoradoImagemLabel = lang === 'EN'
    ? 'Illustration restored with AI'
    : lang === 'ES'
      ? 'Ilustración restaurada con IA'
      : 'Ilustração restaurada com IA';
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<CityId | 'all'>('all');
  const [interest, setInterest] = useState<Interest>('all');
  const [activeId, setActiveId] = useState<DestinationId | null>(null);
  const [cityId, setCityId] = useState<CityId>('barcelos');
  const [drawer, setDrawer] = useState<'place' | 'saved' | null>(null);
  const [saved, setSaved] = useState<DestinationId[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [tileError, setTileError] = useState(false);
  const [zoom, setZoom] = useState(6);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const [position, setPosition] = useState<{ coords: [number, number]; accuracy: number } | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [message, setMessage] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const Lref = useRef<typeof import('leaflet') | null>(null);
  const pins = useRef<LayerGroup | null>(null);
  const gps = useRef<LayerGroup | null>(null);
  const requestId = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLElement | null>(null);

  const active = scenes.find(scene => scene.id === activeId);
  const city = cities.find(item => item.id === (active?.city ?? cityId))!;
  const content = active ? t.destinations[active.id] : null;
  const filtered = useMemo(() => scenes.filter(scene => {
    const text = t.destinations[scene.id];
    return (region === 'all' || scene.city === region) &&
      (interest === 'all' || scene.interests.includes(interest)) &&
      (!normalize(query) || normalize(`${text.titulo} ${text.local} ${text.descricao} ${cities.find(c => c.id === scene.city)?.name}`).includes(normalize(query)));
  }), [region, interest, query, t]);

  function rememberTrigger() {
    if (document.activeElement instanceof HTMLElement) trigger.current = document.activeElement;
  }
  function closeDrawer() {
    setDrawer(null); setShareUrl(''); setMessage(''); trigger.current?.focus({ preventScroll: true });
  }
  function choose(scene: Scene) {
    rememberTrigger(); setActiveId(scene.id); setCityId(scene.city); setDrawer('place'); setShareUrl(''); setMessage('');
    setRegion(scene.city); setQuery('');
    if (interest !== 'all' && !scene.interests.includes(interest)) setInterest('all');
    const base = cities.find(item => item.id === scene.city)!;
    map.current?.setView(scene.coords ?? base.coords, scene.coords ? 13 : 9, { animate: false });
    document.getElementById('ern-v-explorar')?.scrollIntoView({ block: 'start' });
  }
  function chooseCity(id: CityId) {
    rememberTrigger(); setCityId(id); setRegion(id); setQuery(''); setInterest('all');
    setActiveId(null); setDrawer('place'); setShareUrl(''); setMessage('');
    map.current?.setView(cities.find(item => item.id === id)!.coords, 9, { animate: false });
    document.getElementById('ern-v-explorar')?.scrollIntoView({ block: 'start' });
  }
  function overview() {
    setRegion('all'); setQuery(''); setInterest('all'); setActiveId(null); setDrawer(null);
    const L = Lref.current;
    if (L && map.current) map.current.fitBounds(L.latLngBounds(cities.map(item => item.coords)), { padding: [65, 65], animate: false });
  }
  function toggleSaved(id: DestinationId) {
    setSaved(items => items.includes(id) ? items.filter(item => item !== id) : [...items, id]);
  }
  async function share() {
    if (!active) return;
    const url = new URL(window.location.href);
    url.searchParams.set('lugar', active.id); url.hash = '';
    setShareUrl(url.toString()); setMessage('');
    try { await navigator.clipboard.writeText(url.toString()); setMessage(u.copied); } catch { /* O campo permite copiar manualmente. */ }
  }
  function locate() {
    if (!navigator.geolocation) { setGeoError(true); return; }
    const current = ++requestId.current;
    setGeoBusy(true); setGeoError(false); setDrawer(null);
    navigator.geolocation.getCurrentPosition(result => {
      if (current !== requestId.current) return;
      setGeoBusy(false); setPosition({ coords: [result.coords.latitude, result.coords.longitude], accuracy: result.coords.accuracy });
    }, () => {
      if (current === requestId.current) { setGeoBusy(false); setGeoError(true); }
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 0 });
  }

  useEffect(() => {
    const id = new URL(window.location.href).searchParams.get('lugar');
    const found = scenes.find(scene => scene.id === id);
    if (found) { setActiveId(found.id); setCityId(found.city); setDrawer('place'); }
    return () => { requestId.current += 1; };
  }, []);

  useEffect(() => {
    if (!drawer) return;
    heading.current?.focus({ preventScroll: true });
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') closeDrawer(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
    // A restauração de foco usa a referência do elemento que abriu o painel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawer, activeId, cityId]);

  useEffect(() => {
    let disposed = false;
    let instance: LeafletMap | null = null;
    let observer: ResizeObserver | undefined;
    setStatus('loading'); setTileError(false);
    void (async () => {
      try {
        const L = await import('leaflet');
        if (disposed || !container.current) return;
        Lref.current = L;
        instance = L.map(container.current, { zoomControl: false, scrollWheelZoom: false, minZoom: 3, maxZoom: 18 });
        map.current = instance;
        L.control.zoom({ position: 'bottomright' }).addTo(instance);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19, keepBuffer: 1, updateWhenIdle: true,
        }).on('tileerror', () => { if (!disposed) setTileError(true); }).addTo(instance);
        pins.current = L.layerGroup().addTo(instance);
        gps.current = L.layerGroup().addTo(instance);
        // A primeira vista cobre as bases com conteúdo fotográfico publicado.
        instance.fitBounds([[-3.3, -63.4], [-0.55, -60.0]], { padding: [45, 45], animate: false });
        const deepLink = scenes.find(scene => scene.id === new URL(window.location.href).searchParams.get('lugar'));
        if (deepLink) instance.setView(deepLink.coords ?? cities.find(c => c.id === deepLink.city)!.coords, deepLink.coords ? 13 : 9);
        const target = instance;
        setZoom(target.getZoom());
        target.on('zoomend', () => { if (!disposed) setZoom(target.getZoom()); });
        observer = new ResizeObserver(() => target.invalidateSize({ pan: false }));
        observer.observe(container.current); setStatus('ready');
      } catch { if (!disposed) setStatus('error'); }
    })();
    return () => {
      disposed = true; observer?.disconnect(); instance?.remove();
      map.current = null; Lref.current = null; pins.current = null; gps.current = null;
    };
  }, [attempt]);

  useEffect(() => {
    const L = Lref.current;
    if (status !== 'ready' || !L || !pins.current) return;
    pins.current.clearLayers();
    cities.filter(c => (region === 'all' || c.id === region) && (interest !== 'fishing' || c.id === 'barcelos')).forEach(c => {
      if (c.id === 'barcelos' && (interest === 'all' || interest === 'fishing')) {
        const marker = L.marker(c.coords, {
          title: fishing.legend,
          alt: fishing.legend,
          keyboard: true,
          zIndexOffset: 300,
          icon: L.divIcon({
            className: 'ern-v-fishing-marker',
            iconSize: [64, 48],
            iconAnchor: [32, 42],
            html: `<div style="display:grid;place-items:center;width:64px;height:42px;padding:2px;box-sizing:border-box;border:0;background:transparent">${fishingSvg}</div>`,
          }),
        });
        const label = document.createElement('span');
        label.textContent = fishing.legend;
        marker.bindTooltip(label, { direction: 'top', offset: [0, -38] });
        marker.on('click', () => {
          choose(scenes.find(scene => scene.id === 'barcelos')!);
          setInterest('fishing');
        });
        marker.addTo(pins.current!);
        return;
      }
      const face = c.image ? `<img src="${c.image}" alt="" style="width:100%;height:100%;object-fit:cover"/>` : `<span>${c.name.slice(0, 1)}</span>`;
      const el = L.divIcon({ className: 'ern-v-pin', iconSize: [56, 66], iconAnchor: [28, 60],
        html: `<div class="ern-v-pin-face ${c.id === city.id && drawer === 'place' ? 'ern-v-pin-active' : ''}">${face}</div>` });
      const marker = L.marker(c.coords, { icon: el, title: c.name, alt: c.name, keyboard: true });
      const label = document.createElement('span'); label.textContent = `${c.name} · ${u.regional}`;
      marker.bindTooltip(label, { direction: 'top', offset: [0, -54] });
      marker.on('click', () => chooseCity(c.id)); marker.addTo(pins.current!);
    });
    const beach = scenes.find(scene => scene.id === 'praia-grande')!;
    if (zoom >= 9 && beach.coords && filtered.some(scene => scene.id === beach.id)) {
      const marker = L.marker(beach.coords, { title: t.destinations[beach.id].titulo, alt: t.destinations[beach.id].titulo,
        icon: L.divIcon({ className: 'ern-v-beach-pin', iconSize: [30, 30], iconAnchor: [15, 15], html: '<span>≈</span>' }) });
      const label = document.createElement('span'); label.textContent = t.destinations[beach.id].titulo;
      marker.bindTooltip(label); marker.on('click', () => choose(beach)); marker.addTo(pins.current);
    }
    // Callbacks usam apenas setters e referências estáveis do mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, region, filtered, city.id, drawer, t, u.regional, zoom, interest, fishing]);

  useEffect(() => {
    const L = Lref.current;
    if (status !== 'ready' || !L || !gps.current) return;
    gps.current.clearLayers();
    if (!position) return;
    L.circle(position.coords, { radius: position.accuracy, color: '#2563eb', weight: 1, fillOpacity: .08 }).addTo(gps.current);
    L.circleMarker(position.coords, { radius: 7, color: '#fff', fillColor: '#2563eb', fillOpacity: 1, weight: 2 }).addTo(gps.current);
    map.current?.setView(position.coords, 12, { animate: false });
  }, [position, status]);

  function sceneCard(scene: Scene, compact: boolean) {
    const d = t.destinations[scene.id];
    return <article key={scene.id} className={`ern-v-card ${compact ? 'ern-v-card-compact' : ''}`}>
      <button type="button" className="ern-v-card-open" onClick={() => choose(scene)} aria-label={`${u.discover}: ${d.titulo}`}>
        <div className="ern-v-card-photo"><SceneImage src={scene.image} alt={`${d.titulo} · ${scene.id === 'cachoeira-eldorado' ? eldoradoImagemLabel : scene.context ? u.context : u.collection}`} />
          {(scene.context || scene.id === 'cachoeira-eldorado') && <span className="ern-v-photo-tag">{scene.id === 'cachoeira-eldorado' ? eldoradoImagemLabel : u.context}</span>}
        </div>
        <div className="ern-v-card-copy"><span className="ern-v-kicker">{d.local}</span><h3>{d.titulo}</h3>
          {(scene.id === 'barcelos' || scene.id === 'cachoeira-eldorado' || scene.id === 'serra-do-araca' || scene.id === 'praia-grande' || scene.id === 'mariua' || scene.id === 'festival-peixe-ornamental') && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              marginTop: '8px',
              color: '#805600',
              fontSize: '11px',
              fontWeight: 600,
            }}>
              <span aria-hidden="true">▶</span>
              {lang === 'EN' ? 'Watch the adventure' : lang === 'ES' ? 'Ver la aventura' : 'Ver a aventura'}
            </span>
          )}{!compact && <p>{d.descricao}</p>}<span className="ern-v-card-link">{u.discover} <span aria-hidden="true">↗</span></span></div>
      </button>
      <button type="button" className="ern-v-heart" aria-pressed={saved.includes(scene.id)} aria-label={`${saved.includes(scene.id) ? u.saved : u.save}: ${d.titulo}`} onClick={() => toggleSaved(scene.id)}>{saved.includes(scene.id) ? '♥' : '♡'}</button>
    </article>;
  }

  return <div className="ern-v-root">
    <section id="ern-v-explorar" className="ern-v-stage" aria-labelledby="ern-v-title">
      <div className="ern-v-map" ref={container} aria-label={u.overview} />
      <div className="ern-v-intro">
        <p className="ern-v-kicker">{u.eyebrow}</p><h1 id="ern-v-title">{u.title}</h1><p>{u.intro}</p>
        <label className="ern-v-search"><span aria-hidden="true">⌕</span><input type="search" aria-label={u.search} placeholder={u.search} value={query} onChange={e => setQuery(e.target.value)} /></label>
        <div className="ern-v-interests" aria-label={t.discovery.title}>{interests.map((value, i) => <button type="button" key={value} aria-pressed={interest === value} onClick={() => {
          setInterest(value);
          if (value === 'fishing') {
            setRegion('all');
            setQuery('');
            setActiveId(null);
            setDrawer(null);
            map.current?.setView(
              cities.find(item => item.id === 'barcelos')!.coords,
              8,
              { animate: false }
            );
          }
        }}>{value === 'fishing' ? fishing.filter : u.interests[i]}</button>)}</div>
      </div>
      <div className="ern-v-tools">
        <button type="button" onClick={overview}>{u.overview}</button>
        <button type="button" disabled={status !== 'ready' || geoBusy} onClick={locate}>{geoBusy ? u.locating : u.locate}</button>
        <button type="button" aria-expanded={drawer === 'saved'} onClick={() => { rememberTrigger(); setDrawer('saved'); }}><span aria-hidden="true">♡</span> {u.selection} {saved.length > 0 && `(${saved.length})`}</button>
      </div>
      {status !== 'ready' && <div className="ern-v-map-status" role={status === 'error' ? 'alert' : 'status'}><p>{status === 'loading' ? u.loading : u.mapError}</p>{status === 'error' && <button type="button" className="ern-v-button" onClick={() => setAttempt(n => n + 1)}>{u.retry}</button>}</div>}
      {(tileError || geoError || position) && <div className="ern-v-notice" role="status">{tileError && <p>{u.tilesError}</p>}{geoError && <p>{u.geoError}</p>}{position && <p>{u.geoNote} {Math.round(position.accuracy)} m. <button type="button" onClick={() => { requestId.current += 1; setPosition(null); setGeoBusy(false); }}>{u.removeGeo}</button></p>}</div>}
      {drawer && <aside className="ern-v-drawer" aria-labelledby="ern-v-detail-title">
        <button type="button" className="ern-v-close" onClick={closeDrawer} aria-label={u.close}>×</button>
        {drawer === 'saved' ? <div className="ern-v-detail-copy"><h2 ref={heading} tabIndex={-1} id="ern-v-detail-title">{u.selection}</h2><p>{u.selectionNote}</p>{saved.length ? saved.map(id => sceneCard(scenes.find(scene => scene.id === id)!, true)) : <p>{u.selectionEmpty}</p>}<Link className="ern-v-button" href="/#concierge">{u.plan} ↗</Link></div> : <>
          {active && <div className="ern-v-detail-photo"><SceneImage src={active.id === 'cachoeira-eldorado' ? '/images/destinos/eldorado-detalhe.png' : active.image} alt={`${content!.titulo} · ${active.id === 'cachoeira-eldorado' ? eldoradoImagemLabel : active.context ? u.context : u.collection}`} eager /><span className="ern-v-photo-tag">{active.id === 'cachoeira-eldorado' ? eldoradoImagemLabel : active.context ? u.context : u.collection}</span></div>}
          <div className="ern-v-detail-copy"><p className="ern-v-kicker">{active ? content!.local : u.regional}</p><h2 ref={heading} tabIndex={-1} id="ern-v-detail-title">{interest === 'fishing' && active?.id === 'barcelos' ? fishing.title : content?.titulo ?? city.name}</h2><p>{content?.descricao ?? u.regionalIntro}</p>
            {/* ERN_BARCELOS_VIDEO_V1 */}
            {active?.id === 'barcelos' && <BarcelosDestinoERN />}
            {/* ERN_PRAIA_GRANDE_VIDEO_V1 */}
            {active?.id === 'praia-grande' && (
              <VideoDestinoERN
                key={active.id}
                title={content!.titulo}
                poster={active.image}
                videos={['/videos%20destinos/praiagrande.MP4']}
              />
            )}
            {/* ERN_MARIUA_VIDEO_V1 */}
            {active?.id === 'mariua' && (
              <section
                aria-label={
                  lang === 'EN'
                    ? 'Discover the Mariuá Archipelago'
                    : lang === 'ES'
                    ? 'Descubre el archipiélago de Mariuá'
                    : 'Conheça o Arquipélago de Mariuá'
                }
              >
                <VideoDestinoERN
                  key={active.id}
                  title={content!.titulo}
                  poster={active.image}
                  videos={['/videos%20destinos/arquipelagodemariua.MP4']}
                />

                <h3 style={{
                  margin: '24px 0 12px',
                  color: '#183e35',
                  fontFamily: 'var(--font-fraunces), Georgia, serif',
                  fontSize: '24px',
                  lineHeight: 1.3,
                }}>
                  {lang === 'EN'
                    ? 'A new horizon around every island'
                    : lang === 'ES'
                    ? 'Un nuevo horizonte detrás de cada isla'
                    : 'Um novo horizonte a cada ilha'}
                </h3>

                <p>
                  {lang === 'EN'
                    ? 'Imagine travelling along the dark waters of the Rio Negro, with forested islands opening new passages ahead. In the Barcelos region, the Mariuá Archipelago brings together more than 1,400 islands: an invitation to slow down, take in the scenery and discover the Amazon from the river.'
                    : lang === 'ES'
                    ? 'Imagina navegar por las aguas oscuras del río Negro mientras las islas cubiertas de bosque abren nuevos caminos. En la región de Barcelos, el archipiélago de Mariuá reúne más de 1.400 islas: una invitación a bajar el ritmo, contemplar el paisaje y descubrir la Amazonía desde el río.'
                    : 'Imagine navegar pelas águas escuras do Rio Negro enquanto ilhas cobertas de floresta abrem novos caminhos à sua frente. Na região de Barcelos, o Arquipélago de Mariuá reúne mais de 1.400 ilhas: um convite para diminuir o ritmo, contemplar a paisagem e conhecer a Amazônia a partir do rio.'}
                </p>

                <h3 style={{
                  margin: '24px 0 12px',
                  color: '#183e35',
                  fontFamily: 'var(--font-fraunces), Georgia, serif',
                  fontSize: '22px',
                  lineHeight: 1.3,
                }}>
                  {lang === 'EN'
                    ? 'Your next adventure begins on the water'
                    : lang === 'ES'
                    ? 'Tu próxima aventura comienza en el agua'
                    : 'Sua próxima aventura começa na água'}
                </h3>

                <p>
                  {lang === 'EN'
                    ? 'Mariuá is also part of the sport fishing landscape around Barcelos. Whether your interest is fishing, photography or exploring by boat, plan the route with a local professional who can explain the conditions and possibilities for your visit.'
                    : lang === 'ES'
                    ? 'Mariuá también forma parte de los escenarios de pesca deportiva de Barcelos. Si buscas pescar, fotografiar o explorar en barco, organiza la ruta con un profesional local que pueda explicar las condiciones y posibilidades de tu visita.'
                    : 'Mariuá também faz parte dos cenários de pesca esportiva de Barcelos. Seja para pescar, fotografar ou explorar de barco, planeje o percurso com um profissional local que possa orientar sobre as condições e possibilidades da sua visita.'}
                </p>

                <p style={{
                  padding: '14px 16px',
                  background: '#f5eddd',
                  borderLeft: '3px solid #b98a3e',
                  borderRadius: '0 12px 12px 0',
                  fontSize: '13px',
                  lineHeight: 1.8,
                }}>
                  {lang === 'EN'
                    ? 'Before travelling, confirm river levels, navigation conditions, access permissions and the rules for your chosen activity. Fishing results and wildlife sightings cannot be guaranteed.'
                    : lang === 'ES'
                    ? 'Antes de viajar, confirma el nivel del río, las condiciones de navegación, los permisos de acceso y las reglas de la actividad elegida. Las capturas y los avistamientos de fauna no están garantizados.'
                    : 'Antes de viajar, confirme o nível do rio, as condições de navegação, as autorizações de acesso e as regras da atividade escolhida. Capturas e avistamentos de animais não são garantidos.'}
                </p>

                <a
                  href="https://turismo.barcelos.am.gov.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    padding: '12px 0',
                    color: '#275541',
                    fontSize: '12px',
                    textUnderlineOffset: '3px',
                  }}
                >
                  {lang === 'EN'
                    ? 'Learn more at Barcelos Tourism'
                    : lang === 'ES'
                    ? 'Más información en Turismo de Barcelos'
                    : 'Saiba mais no Turismo de Barcelos'} ↗
                </a>
              </section>
            )}
            {/* ERN_FESTIVAL_VIDEOS_V1 */}
            {active?.id === 'festival-peixe-ornamental' && (
              <section
                aria-label={
                  lang === 'EN'
                    ? 'Discover the Ornamental Fish Festival'
                    : lang === 'ES'
                    ? 'Descubre el Festival del Pez Ornamental'
                    : 'Conheça o Festival do Peixe Ornamental'
                }
              >
                <h3 style={{
                  margin: '24px 0 12px',
                  color: '#183e35',
                  fontFamily: 'var(--font-fraunces), Georgia, serif',
                  fontSize: '24px',
                  lineHeight: 1.3,
                }}>
                  {lang === 'EN'
                    ? 'Cardinal and Acará-Disco: feel the spirit of Barcelos'
                    : lang === 'ES'
                    ? 'Cardinal y Acará-Disco: siente el alma de Barcelos'
                    : 'Cardinal e Acará-Disco: sinta a alma de Barcelos'}
                </h3>

                <p>
                  {lang === 'EN'
                    ? 'Imagine arriving in Barcelos and finding the town celebrating its river, its people and its ornamental fish. At the festival, Cardinal and Acará-Disco bring together music, performances and passionate supporters. Which side will win your heart?'
                    : lang === 'ES'
                    ? 'Imagina llegar a Barcelos y encontrar una ciudad celebrando su río, su gente y sus peces ornamentales. En el festival, Cardinal y Acará-Disco reúnen música, presentaciones y una afición apasionada. ¿Cuál conquistará tu corazón?'
                    : 'Imagine chegar a Barcelos e encontrar uma cidade celebrando seu rio, sua gente e seus peixes ornamentais. No festival, Cardinal e Acará-Disco reúnem música, apresentações e torcidas apaixonadas. Qual deles vai conquistar você?'}
                </p>

                <VideoDestinoERN
                  key={active.id}
                  title={content!.titulo}
                  poster={active.image}
                  videos={[
                    '/videos%20destinos/festivaldopeixeornamental.MP4',
                    '/videos%20destinos/festivaldopeixeornamental1.1.MP4',
                  ]}
                />

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))',
                  gap: '12px',
                  margin: '24px 0',
                }}>
                  <div style={{
                    padding: '18px',
                    border: '1px solid #c7d8df',
                    borderRadius: '14px',
                    background: '#edf4f6',
                  }}>
                    <h4 style={{
                      margin: '0 0 10px',
                      color: '#173e54',
                      fontSize: '18px',
                    }}>
                      Cardinal
                    </h4>
                    <p style={{ margin: 0, lineHeight: 1.8 }}>
                      {lang === 'EN'
                        ? 'Follow the performances and feel the energy of the Cardinal supporters. Discover one of the two great expressions of the festival.'
                        : lang === 'ES'
                        ? 'Sigue las presentaciones y siente la energía de la afición del Cardinal. Descubre una de las dos grandes expresiones del festival.'
                        : 'Acompanhe as apresentações e sinta a energia da torcida do Cardinal. Conheça uma das duas grandes expressões do festival.'}
                    </p>
                  </div>

                  <div style={{
                    padding: '18px',
                    border: '1px solid #dccba9',
                    borderRadius: '14px',
                    background: '#f7f0e3',
                  }}>
                    <h4 style={{
                      margin: '0 0 10px',
                      color: '#624417',
                      fontSize: '18px',
                    }}>
                      Acará-Disco
                    </h4>
                    <p style={{ margin: 0, lineHeight: 1.8 }}>
                      {lang === 'EN'
                        ? 'Discover the performances and enthusiasm of the Acará-Disco supporters. Another invitation to experience the creativity and pride of Barcelos.'
                        : lang === 'ES'
                        ? 'Descubre las presentaciones y el entusiasmo de la afición del Acará-Disco. Otra invitación a vivir la creatividad y el orgullo de Barcelos.'
                        : 'Descubra as apresentações e o entusiasmo da torcida do Acará-Disco. Outro convite para viver a criatividade e o orgulho de Barcelos.'}
                    </p>
                  </div>
                </div>

                <h3 style={{
                  margin: '24px 0 12px',
                  color: '#183e35',
                  fontFamily: 'var(--font-fraunces), Georgia, serif',
                  fontSize: '22px',
                  lineHeight: 1.3,
                }}>
                  {lang === 'EN'
                    ? 'Behind the celebration, the story of the piabeiros'
                    : lang === 'ES'
                    ? 'Detrás de la fiesta, la historia de los piabeiros'
                    : 'Por trás da festa, a história dos piabeiros'}
                </h3>

                <p>
                  {lang === 'EN'
                    ? 'The festival honours the piabeiros, whose work collecting ornamental fish is part of Barcelos’s history. Experiencing the celebration is also a chance to understand the connection between the river, local livelihoods and cultural identity.'
                    : lang === 'ES'
                    ? 'El festival homenajea a los piabeiros, cuyo trabajo en la recolección de peces ornamentales forma parte de la historia de Barcelos. Vivir esta celebración también permite conocer la relación entre el río, el trabajo local y la identidad cultural.'
                    : 'O festival homenageia os piabeiros, cujo trabalho na coleta de peixes ornamentais faz parte da história de Barcelos. Viver essa celebração também é conhecer a relação entre o rio, o trabalho das famílias e a identidade cultural da cidade.'}
                </p>

                <p style={{
                  padding: '14px 16px',
                  background: '#f5eddd',
                  borderLeft: '3px solid #b98a3e',
                  borderRadius: '0 12px 12px 0',
                  fontSize: '13px',
                  lineHeight: 1.8,
                }}>
                  {lang === 'EN'
                    ? 'Planning to experience the festival? Confirm the official dates and programme before booking transport and accommodation.'
                    : lang === 'ES'
                    ? '¿Quieres vivir el festival? Confirma las fechas y la programación oficial antes de reservar transporte y alojamiento.'
                    : 'Quer viver o festival? Confirme as datas e a programação oficial antes de reservar transporte e hospedagem.'}
                </p>
              </section>
            )}
            {/* ERN_SERRA_VIDEO_V1 */}
            {active?.id === 'serra-do-araca' && (
              <VideoDestinoERN
                key={active.id}
                title={content!.titulo}
                poster="/images/destinos/serra-araca-card.jpeg"
                videos={['/videos%20destinos/serradoaraca.MP4']}
              />
            )}
            {active?.id === 'cachoeira-eldorado' && (
              <section aria-label={t.destinations['cachoeira-eldorado'].titulo}>
                <VideoDestinoERN
                  key={active.id}
                  title={t.destinations['cachoeira-eldorado'].titulo}
                  poster="/images/destinos/eldorado-card.png"
                  videos={['/videos%20destinos/serradoaraca1.1.MP4']}
                />
                <details style={{ marginTop: '12px', fontSize: '11px', lineHeight: 1.6 }}>
                  <summary style={{ cursor: 'pointer', padding: '8px 0' }}>
                    {lang === 'EN' ? 'Image credits' : lang === 'ES' ? 'Créditos de la imagen' : 'Créditos da imagem'}
                  </summary>
                  <p className="ern-v-detail-note">
                    {t.destinations['cachoeira-eldorado'].imagemNota}
                  </p>
                </details>
                <h3
                  style={{
                    marginTop: '22px',
                    fontFamily: 'var(--font-fraunces), serif',
                    fontSize: '24px',
                    lineHeight: 1.25,
                  }}
                >
                  {t.destinations['cachoeira-eldorado'].historiaTitulo}
                </h3>
                <p>{t.destinations['cachoeira-eldorado'].historia}</p>
                <p className="ern-v-detail-note">
                  {t.destinations['cachoeira-eldorado'].preparacao}
                </p>
              </section>
            )}
            {interest === 'fishing' && active?.interests.includes('fishing') && (
              <section
                aria-label={fishing.filter}
                style={{
                  margin: '18px 0',
                  padding: '16px',
                  border: '1px solid #d5bf81',
                  borderRadius: '14px',
                  background: '#fff3cf',
                  color: '#30260d',
                }}
              >
                <p><strong>{fishing.legend}</strong></p>
                <p>{fishing.description}</p>
                <p>{fishing.note}</p>
                <p>{fishing.care}</p>
                <Link className="ern-v-button" href="/pesca-esportiva">
                  {fishing.button} ↗
                </Link>
                <div className="ern-v-detail-actions">
                  <a href={fishingSource} target="_blank" rel="noopener noreferrer">
                    {fishing.source} ↗
                  </a>
                </div>
              </section>
            )}
            {active ? <><p className="ern-v-detail-note">{active.coords ? u.exactNote : u.baseNote}</p><button type="button" className="ern-v-button ern-v-button-soft" aria-pressed={saved.includes(active.id)} onClick={() => toggleSaved(active.id)}>{saved.includes(active.id) ? '♥' : '♡'} {saved.includes(active.id) ? u.saved : u.save}</button><div className="ern-v-detail-actions"><button type="button" onClick={() => void share()}>{u.share} ↗</button><a href={active.source} target="_blank" rel="noopener noreferrer">{u.source} ↗</a></div>{active.coords && <a className="ern-v-coordinate-source" href="https://www.geonames.org/12965878/ilha-da-praia-grande.html" target="_blank" rel="noopener noreferrer">GeoNames · CC BY 4.0 ↗</a>}</> : <div className="ern-v-regional-links">{scenes.filter(scene => scene.city === city.id).map(scene => <button type="button" key={scene.id} onClick={() => choose(scene)}>{t.destinations[scene.id].titulo} ↗</button>)}<a href={municipalSource} target="_blank" rel="noopener noreferrer">Amazonastur ↗</a></div>}
            {shareUrl && <label className="ern-v-share-field">{u.copyLink}<input readOnly value={shareUrl} onFocus={event => event.currentTarget.select()} /></label>}<p role="status" className="ern-v-copy-status">{message}</p>
            <Link className="ern-v-button" href="/#concierge">{u.plan} ↗</Link><Link className="ern-v-network-link" href={`/rede?local=${encodeURIComponent(city.name)}`}>{u.network} ↗</Link>
          </div>
        </>}
      </aside>}
      <div className="ern-v-film"><div className="ern-v-film-title"><span>{u.related}</span><a href="#ern-v-galeria">{u.clear} ↓</a></div><div className="ern-v-film-scroll">{filtered.length ? filtered.map(scene => sceneCard(scene, true)) : <div className="ern-v-empty"><p>{u.noResults}</p><button type="button" onClick={overview}>{u.clear}</button></div>}</div></div>
    </section>
    <div className="ern-v-map-caption">
      <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          aria-hidden="true"
          style={{ display: 'inline-flex', flexShrink: 0, width: '36px', height: '24px' }}
          dangerouslySetInnerHTML={{ __html: fishingSvg }}
        />
        <span>{fishing.legend}</span>
      </p>
      <p>{u.mapNote}</p><nav aria-label={u.overview}><button type="button" aria-pressed={region === 'all'} onClick={overview}>{u.all}</button>{cities.map(c => <button type="button" key={c.id} aria-pressed={region === c.id} onClick={() => { chooseCity(c.id); }}>{c.name}</button>)}</nav></div>
    <section id="ern-v-galeria" className="ern-v-gallery" aria-labelledby="ern-v-gallery-title"><p className="ern-v-kicker">{t.discovery.title}</p><h2 id="ern-v-gallery-title">{interest === 'fishing' ? fishing.filter : u.galleryTitle}</h2><p className="ern-v-section-intro">{u.galleryIntro}</p><div className="ern-v-gallery-grid">{filtered.length ? filtered.map(scene => sceneCard(scene, false)) : <div className="ern-v-empty"><p>{u.noResults}</p><button type="button" className="ern-v-button" onClick={overview}>{u.clear}</button></div>}</div></section>
    <section className="ern-v-waters" aria-labelledby="ern-v-waters-title"><div className="ern-v-waters-image"><SceneImage src="/images/regiao/viagembarco.png.jpeg" alt={`${t.waters.eyebrow} · ${u.context}`} /><span className="ern-v-photo-tag">{u.context}</span></div><div className="ern-v-waters-copy"><p className="ern-v-kicker">{t.waters.eyebrow}</p><h2 id="ern-v-waters-title">{t.waters.title}</h2><p>{t.waters.description}</p><div><h3>{t.waters.highLabel}</h3><p>{t.waters.highDescription}</p><h3>{t.waters.lowLabel}</h3><p>{t.waters.lowDescription}</p></div><p className="ern-v-detail-note">{u.waterNote}</p></div></section>
    <section className="ern-v-plan"><p className="ern-v-kicker">ERN CONCIERGE</p><h2>{t.planning.title}</h2><p>{t.planning.description}</p><Link className="ern-v-button" href="/#concierge">{u.plan} ↗</Link><Link className="ern-v-network-link" href="/rede">{u.network} ↗</Link></section>
    <footer className="ern-v-footer"><span>Encantos Rio Negro</span><Link href="/privacidade">{u.privacy}</Link><Link href="/termos">{u.terms}</Link></footer>
  </div>;
}

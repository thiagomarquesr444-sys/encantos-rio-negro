'use client';
import { ListaVivenciasERN } from './VivenciasERN';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import VideoDestinoERN from './VideoDestinoERN';
import AnavilhanasDestinoERN from './AnavilhanasDestinoERN';
import NovoAiraoDestinoERN from './NovoAiraoDestinoERN';
import BarcelosDestinoERN from './BarcelosDestinoERN';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from './LanguageProvider';
import { destinosTranslations } from '@/lib/i18n/destinos';
import { HISTORIAS_MUNICIPIOS } from '@/lib/historiasMunicipiosERN';
import { MUNICIPIOS_AMAZONAS, type MunicipioAM } from '@/lib/municipiosAmazonasERN';
import ArcoFlechaERN from './ArcoFlechaERN';
import SateliteCidadeERN, { chaveEmbedGoogle } from './SateliteCidadeERN';
import { chaveGoogleMapas, criarMotorGoogle, criarMotorLeaflet, type MotorMapa, type PinMapa } from './motorMapaERN';
import {
  HISTORIA_DA_CIDADE, ROTULOS_ZONA, ZONA_DA_CIDADE, fatosDaCidade,
  type CidadeBaseERN, type ZonaERN,
} from '@/lib/fatosDestinosERN';
import './DestinosVisitanteERN.css';

const copy = {
  PT: {
    eyebrow: 'DESTINOS · ENCANTOS DA AMAZÔNIA', title: 'Explore a Amazônia no mapa.',
    intro: 'Toque em um lugar e descubra o que você quer viver.', search: 'Qual lugar desperta sua curiosidade?',
    all: 'Todo o Rio Negro', interests: ['Tudo', 'Águas e praias', 'Natureza e expedição', 'Cultura viva'],
    overview: 'Ver o território', locate: 'Minha localização', locating: 'Localizando…', selection: 'Minha seleção',
    discover: 'Conhecer este lugar', save: 'Quero conhecer', saved: 'Na minha seleção', close: 'Fechar',
    related: 'Lugares para começar a explorar', regional: 'Referência regional', exact: 'Referência do lugar',
    mapNote: 'O mapa mostra bases regionais. Praias e acessos mudam com as águas.',
    baseNote: 'O mapa está na base regional, não no ponto exato deste atrativo. Combine o acesso com quem conhece o lugar.',
    exactNote: 'Referência da Ilha da Praia Grande. A posição não indica desembarque nem o limite atual da areia.',
    context: 'Imagem de contexto · acervo EDA', collection: 'Acervo EDA',
    galleryTitle: 'Deixe uma paisagem escolher você.', galleryIntro: 'Lugares, celebrações e diferentes formas de viver o Rio Negro.',
    details: 'O que torna esse lugar especial', plan: 'Planejar minha viagem', network: 'Conhecer a rede EDA',
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
    eyebrow: 'DESTINATIONS · ENCANTOS DA AMAZÔNIA', title: 'Explore the Amazon on the map.',
    intro: 'Choose a place and discover what you want to experience.', search: 'Which place sparks your curiosity?',
    all: 'The whole Rio Negro', interests: ['All', 'Water and beaches', 'Nature and expeditions', 'Living culture'],
    overview: 'See the territory', locate: 'My location', locating: 'Locating…', selection: 'My selection',
    discover: 'Discover this place', save: 'I want to visit', saved: 'In my selection', close: 'Close',
    related: 'Places to start exploring', regional: 'Regional reference', exact: 'Place reference',
    mapNote: 'The map shows regional bases. Beaches and access change with river levels.',
    baseNote: 'The map shows the regional base, not the exact attraction. Arrange access with local people who know the place.',
    exactNote: 'Reference for Ilha da Praia Grande. It does not identify a landing point or the current shoreline.',
    context: 'Context image · EDA collection', collection: 'EDA collection',
    galleryTitle: 'Let a landscape choose you.', galleryIntro: 'Places, celebrations and different ways to experience the Rio Negro.',
    details: 'What makes this place special', plan: 'Plan my trip', network: 'Explore the EDA network',
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
    eyebrow: 'DESTINOS · ENCANTOS DA AMAZÔNIA', title: 'Explora la Amazonía en el mapa.',
    intro: 'Elige un lugar y descubre lo que quieres vivir.', search: '¿Qué lugar despierta tu curiosidad?',
    all: 'Todo el Río Negro', interests: ['Todo', 'Aguas y playas', 'Naturaleza y expedición', 'Cultura viva'],
    overview: 'Ver el territorio', locate: 'Mi ubicación', locating: 'Localizando…', selection: 'Mi selección',
    discover: 'Conocer este lugar', save: 'Quiero conocer', saved: 'En mi selección', close: 'Cerrar',
    related: 'Lugares para empezar a explorar', regional: 'Referencia regional', exact: 'Referencia del lugar',
    mapNote: 'El mapa muestra bases regionales. Las playas y los accesos cambian con las aguas.',
    baseNote: 'El mapa muestra la base regional, no el punto exacto del atractivo. Organiza el acceso con quienes conocen el lugar.',
    exactNote: 'Referencia de Ilha da Praia Grande. No indica desembarque ni el límite actual de la arena.',
    context: 'Imagen de contexto · acervo EDA', collection: 'Acervo EDA',
    galleryTitle: 'Deja que un paisaje te elija.', galleryIntro: 'Lugares, celebraciones y diferentes formas de vivir el Río Negro.',
    details: 'Lo que hace especial este lugar', plan: 'Planear mi viaje', network: 'Conocer la red EDA',
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

// ERN_DESTINOS_PREMIUM_V1
// Explorador estilo "lista + mapa": painel com busca, regiões e lista
// sincronizada; mapa amplo; gaveta do destino com abas.
const premium = {
  PT: {
    titulo: ['Explore a', 'Amazônia', 'no mapa.'],
    intro: 'Do Alto Rio Negro a Parintins: escolha uma região, toque em um lugar e descubra o que viver.',
    regioes: 'Regiões', contagem: (n: number) => `${n} ${n === 1 ? 'destino' : 'destinos'}`,
    abas: ['Visão geral', 'História', 'Na Rede', 'Como chegar'],
    semHistoria: 'A história deste lugar está sendo reunida com pesquisadores e moradores da região.',
    redeTitulo: 'Histórias da Rede neste lugar',
    redeTexto: 'Fotos, vídeos e relatos de operadores, guias e visitantes sobre este destino.',
    redeBotao: 'Ver na Rede',
    opsTitulo: 'Fale com quem opera',
    opsTexto: 'Operadores verificados da Rede EDA e o Concierge ajudam a montar sua viagem.',
    opsConcierge: 'Planejar com o Concierge', opsRede: 'Ver operadores na Rede',
    fatosNota: 'Orientações gerais. Confirme voos, barcos e o nível do rio antes de viajar.',
    verTodos: 'Ver todos', ativo: 'Selecionado no mapa',
    cidadesTitulo: 'Todas as cidades do Amazonas', cidadesEncontradas: 'Cidades',
    muniKicker: 'Município do Amazonas',
    muniTexto: 'Navegue pela cidade inteira por satélite e alterne para pontos turísticos ou vista da rua no topo do mapa.',
    verSatelite: 'Ver a cidade por satélite', muniRede: 'Ver histórias na Rede', muniGoogle: 'Abrir no Google Maps', muniFechar: 'Fechar cidade',
  },
  EN: {
    titulo: ['Explore the', 'Amazon', 'on the map.'],
    intro: 'From the Upper Rio Negro to Parintins: choose a region, tap a place and discover what to experience.',
    regioes: 'Regions', contagem: (n: number) => `${n} ${n === 1 ? 'destination' : 'destinations'}`,
    abas: ['Overview', 'History', 'On the Network', 'Getting there'],
    semHistoria: 'The history of this place is being gathered with local researchers and residents.',
    redeTitulo: 'Network stories from this place',
    redeTexto: 'Photos, videos and accounts from operators, guides and visitors about this destination.',
    redeBotao: 'See on the Network',
    opsTitulo: 'Talk to local operators',
    opsTexto: 'Verified EDA Network operators and the Concierge help you plan your trip.',
    opsConcierge: 'Plan with the Concierge', opsRede: 'See operators on the Network',
    fatosNota: 'General guidance. Confirm flights, boats and river levels before travelling.',
    verTodos: 'See all', ativo: 'Selected on the map',
    cidadesTitulo: 'All cities in Amazonas', cidadesEncontradas: 'Cities',
    muniKicker: 'Municipality of Amazonas',
    muniTexto: 'Explore the whole city by satellite and switch to sights or street view at the top of the map.',
    verSatelite: 'See the city by satellite', muniRede: 'See stories on the Network', muniGoogle: 'Open in Google Maps', muniFechar: 'Close city',
  },
  ES: {
    titulo: ['Explora la', 'Amazonía', 'en el mapa.'],
    intro: 'Del Alto Río Negro a Parintins: elige una región, toca un lugar y descubre qué vivir.',
    regioes: 'Regiones', contagem: (n: number) => `${n} ${n === 1 ? 'destino' : 'destinos'}`,
    abas: ['Visión general', 'Historia', 'En la Red', 'Cómo llegar'],
    semHistoria: 'La historia de este lugar se está reuniendo con investigadores y habitantes de la región.',
    redeTitulo: 'Historias de la Red en este lugar',
    redeTexto: 'Fotos, videos y relatos de operadores, guías y visitantes sobre este destino.',
    redeBotao: 'Ver en la Red',
    opsTitulo: 'Habla con quien opera',
    opsTexto: 'Operadores verificados de la Red EDA y el Concierge te ayudan a armar tu viaje.',
    opsConcierge: 'Planear con el Concierge', opsRede: 'Ver operadores en la Red',
    fatosNota: 'Orientaciones generales. Confirma vuelos, barcos y el nivel del río antes de viajar.',
    verTodos: 'Ver todos', ativo: 'Seleccionado en el mapa',
    cidadesTitulo: 'Todas las ciudades de Amazonas', cidadesEncontradas: 'Ciudades',
    muniKicker: 'Municipio de Amazonas',
    muniTexto: 'Recorre toda la ciudad por satélite y cambia a puntos turísticos o vista de la calle arriba del mapa.',
    verSatelite: 'Ver la ciudad por satélite', muniRede: 'Ver historias en la Red', muniGoogle: 'Abrir en Google Maps', muniFechar: 'Cerrar ciudad',
  },
};
type Aba = 'geral' | 'historia' | 'rede' | 'chegar';
const ABAS: Aba[] = ['geral', 'historia', 'rede', 'chegar'];
const zonas: ZonaERN[] = ['all', 'alto', 'medio', 'baixo', 'amazonas'];

type DestinationId = keyof typeof destinosTranslations.PT.destinations;
type Interest = 'all' | 'waters' | 'nature' | 'culture' | 'fishing';
type CityId = CidadeBaseERN;
type Scene = {
  id: DestinationId; city: CityId; image: string; context?: boolean;
  interests: Interest[]; source: string; coords?: [number, number];
};
const municipalSource = 'https://www.amazonastur.am.gov.br/municipios/';
const barcelosSource = 'https://turismo.barcelos.am.gov.br/atrativo/';
const icmbio = 'https://www.gov.br/icmbio/pt-br/assuntos/biodiversidade/unidade-de-conservacao/unidades-de-biomas/amazonia/lista-de-ucs/';
const cities: { id: CityId; name: string; coords: [number, number]; image?: string }[] = [
  { id: 'manaus', name: 'Manaus', coords: [-3.119, -60.022], image: '/images/fundo/encontro-das-aguas-celular.jpg' },
  { id: 'novo-airao', name: 'Novo Airão', coords: [-2.621, -60.944] },
  { id: 'barcelos', name: 'Barcelos', coords: [-0.975, -62.924], image: '/images/regiao/barceloscapital.jpg.jpeg' },
  { id: 'santa-isabel', name: 'Santa Isabel do Rio Negro', coords: [-0.414, -65.019] },
  { id: 'sao-gabriel', name: 'São Gabriel da Cachoeira', coords: [-0.13, -67.089] },
  { id: 'parintins', name: 'Parintins', coords: [-2.628, -56.736], image: '/images/cultura/festribal.jpg' },
];
const scenes: Scene[] = [
  { id: 'cachoeira-eldorado', city: 'barcelos', image: '/images/destinos/eldorado-card.png', interests: ['nature'], source: `${barcelosSource}serra-do-araca/` },
  { id: 'barcelos', city: 'barcelos', image: '/images/regiao/matriz.png.jpeg', interests: ['waters', 'nature', 'culture', 'fishing'], source: municipalSource },
  { id: 'praia-grande', city: 'barcelos', image: '/images/regiao/barcelospraia.png.jpeg', context: true, interests: ['waters'], source: `${barcelosSource}praia-grande/`, coords: [-0.96058, -62.92789] },
  { id: 'mariua', city: 'barcelos', image: '/images/destinos/mariua-capa.jpg', interests: ['waters', 'nature', 'fishing'], source: `${barcelosSource}arquipelago-de-mariua/` },
  { id: 'serra-do-araca', city: 'barcelos', image: '/images/destinos/serra-araca-card.jpeg', interests: ['nature'], source: `${barcelosSource}serra-do-araca/` },
  { id: 'festival-peixe-ornamental', city: 'barcelos', image: '/images/cultura/barcelosfestival.jpg', interests: ['culture'], source: municipalSource },
  { id: 'novo-airao', city: 'novo-airao', image: '/images/destinos/novo-airao/capa.jpg', interests: ['waters', 'nature', 'culture'], source: municipalSource },
  { id: 'anavilhanas', city: 'novo-airao', image: '/images/destinos/anavilhanas/capa.jpg', interests: ['waters', 'nature'], source: `${icmbio}parna-de-anavilhanas/parna-de-anavilhanas` },
  { id: 'jau', city: 'novo-airao', image: '/images/regiao/ern-amazonia.jpg', context: true, interests: ['nature'], source: `${icmbio}parna-do-jau/informacoes-sobre-visitacao-2013-parna-do-jau` },
  { id: 'festival-peixe-boi', city: 'novo-airao', image: '/images/cultura/festivaldopeixeboi.jpg', interests: ['culture'], source: municipalSource },
  // ERN_ALTO_RIO_NEGRO_V1
  { id: 'santa-isabel-do-rio-negro', city: 'santa-isabel', image: '/images/destinos/santa-isabel/santa-isabel-aerea.jpg', interests: ['waters', 'culture'], source: municipalSource },
  { id: 'sao-gabriel-da-cachoeira', city: 'sao-gabriel', image: '/images/destinos/sao-gabriel/sao-gabriel-aerea.jpg', interests: ['waters', 'nature', 'culture'], source: municipalSource },
  // ERN_DESTINOS_AMAZONAS_V1
  { id: 'encontro-das-aguas', city: 'manaus', image: '/images/fundo/encontro-das-aguas-celular.jpg', interests: ['waters', 'nature'], source: municipalSource, coords: [-3.136, -59.905] },
  { id: 'parintins', city: 'parintins', image: '/images/cultura/festribal.jpg', context: true, interests: ['culture'], source: municipalSource },
];

// ERN_MARCOS_ALTO_RIO_NEGRO_V1
// Marcos visuais das cidades do Alto Rio Negro, no mesmo padrão do
// tucunaré de Barcelos e do boto de Novo Airão.
const marcosCidade: Partial<Record<CityId, { scene: DestinationId; imagem: string; largura: number; legenda: Record<'PT' | 'EN' | 'ES', string> }>> = {
  'sao-gabriel': {
    scene: 'sao-gabriel-da-cachoeira',
    imagem: '/images/marcos/flecha-sao-gabriel.svg',
    largura: 64,
    legenda: {
      PT: 'São Gabriel da Cachoeira · flecha · referência regional',
      EN: 'São Gabriel da Cachoeira · arrow · regional reference',
      ES: 'São Gabriel da Cachoeira · flecha · referencia regional',
    },
  },
  'santa-isabel': {
    scene: 'santa-isabel-do-rio-negro',
    imagem: '/images/marcos/quadrilha-santa-isabel.svg',
    largura: 56,
    legenda: {
      PT: 'Santa Isabel do Rio Negro · quadrilhas juninas · referência regional',
      EN: 'Santa Isabel do Rio Negro · June quadrilhas · regional reference',
      ES: 'Santa Isabel do Rio Negro · cuadrillas juninas · referencia regional',
    },
  },
};
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
  if (failed) return <div className="ern-v-image-fallback" role="img" aria-label={alt}>EDA · Rio Negro</div>;
  // Acervo local: sem serviço externo de imagens.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />;
}

export default function ExploradorDestinosERN() {
  const { idioma } = useLanguage();
  const lang = idioma === 'EN' || idioma === 'ES' ? idioma : 'PT';
  const u = copy[lang];
  const fishing = fishingCopy[lang];
  const p = premium[lang];
  const t = destinosTranslations[lang];
  const eldoradoImagemLabel = lang === 'EN'
    ? 'Illustration restored with AI'
    : lang === 'ES'
      ? 'Ilustración restaurada con IA'
      : 'Ilustração restaurada com IA';
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<CityId | 'all'>('all');
  const [zona, setZona] = useState<ZonaERN>('all');
  const [aba, setAba] = useState<Aba>('geral');
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
  const map = useRef<MotorMapa | null>(null);
  const [motorTipo, setMotorTipo] = useState<'google' | 'leaflet' | null>(null);
  const [municipio, setMunicipio] = useState<MunicipioAM | null>(null);
  // ERN_SATELITE_CIDADE_V1: vista de satélite (Google Maps Embed) da cidade escolhida.
  const [satelite, setSatelite] = useState<{ nome: string; coords: [number, number]; zoom: number } | null>(null);
  const abrirSatelite = (nome: string, coords: [number, number], zoom = 14) => {
    if (chaveEmbedGoogle()) setSatelite({ nome, coords, zoom });
  };
  // Zoom de cidade e de lugar: o Google chega ao nível das ruas.
  const zoomCidade = () => (map.current?.tipo === 'google' ? 14 : 9);
  const zoomLugar = () => (map.current?.tipo === 'google' ? 15 : 13);
  const requestId = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLElement | null>(null);

  const active = scenes.find(scene => scene.id === activeId);
  const city = cities.find(item => item.id === (active?.city ?? cityId))!;
  const content = active ? t.destinations[active.id] : null;
  const filtered = useMemo(() => scenes.filter(scene => {
    const text = t.destinations[scene.id];
    return (region === 'all' || scene.city === region) &&
      (zona === 'all' || ZONA_DA_CIDADE[scene.city] === zona) &&
      (interest === 'all' || scene.interests.includes(interest)) &&
      (!normalize(query) || normalize(`${text.titulo} ${text.local} ${text.descricao} ${cities.find(c => c.id === scene.city)?.name}`).includes(normalize(query)));
  }), [region, zona, interest, query, t]);

  function rememberTrigger() {
    if (document.activeElement instanceof HTMLElement) trigger.current = document.activeElement;
  }
  function closeDrawer() {
    setDrawer(null); setShareUrl(''); setMessage(''); trigger.current?.focus({ preventScroll: true });
  }
  function choose(scene: Scene) {
    rememberTrigger(); setActiveId(scene.id); setCityId(scene.city); setDrawer('place'); setShareUrl(''); setMessage('');
    setAba('geral');
    if (zona !== 'all' && ZONA_DA_CIDADE[scene.city] !== zona) setZona(ZONA_DA_CIDADE[scene.city]);
    if (region !== 'all' && region !== scene.city) setRegion('all');
    if (interest !== 'all' && !scene.interests.includes(interest)) setInterest('all');
    const base = cities.find(item => item.id === scene.city)!;
    setMunicipio(null);
    // Todo destino abre a vista de satélite: no ponto exato ou no centro da cidade-base.
    if (scene.coords) abrirSatelite(t.destinations[scene.id].titulo, scene.coords, 15);
    else abrirSatelite(base.name, base.coords);
    map.current?.setView(scene.coords ?? base.coords, scene.coords ? zoomLugar() : zoomCidade());
    document.getElementById('ern-v-explorar')?.scrollIntoView({ block: 'start' });
    document.getElementById(`ern-v-item-${scene.id}`)?.scrollIntoView({ block: 'nearest' });
  }
  function chooseCity(id: CityId) {
    rememberTrigger(); setCityId(id); setRegion(id); setQuery(''); setInterest('all');
    setActiveId(null); setDrawer('place'); setShareUrl(''); setMessage(''); setAba('geral');
    setZona(ZONA_DA_CIDADE[id]);
    setMunicipio(null);
    const baseCidade = cities.find(item => item.id === id)!;
    abrirSatelite(baseCidade.name, baseCidade.coords);
    map.current?.setView(baseCidade.coords, zoomCidade());
    document.getElementById('ern-v-explorar')?.scrollIntoView({ block: 'start' });
  }
  // ERN_NAVEGACAO_BUSCA_V3
  useEffect(() => {
    if (status !== 'ready') return;

    const preparar = (valor: string) => valor.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim().replace(/\s+/g, ' ');

    const termo = preparar(query);
    if (!termo) return;

    const encontrada = cities.find(c => preparar(c.name) === termo);
    const outraCidade = MUNICIPIOS_AMAZONAS.find(m => preparar(m.nome) === termo);
    if (!encontrada && !outraCidade) return;

    const tarefa = window.setTimeout(() => {
      if (encontrada) chooseCity(encontrada.id);
      else if (outraCidade) irMunicipio(outraCidade);
    }, 650);

    return () => window.clearTimeout(tarefa);
  }, [query, status]);

  function overview() {
    setRegion('all'); setZona('all'); setQuery(''); setInterest('all'); setActiveId(null); setDrawer(null); setMunicipio(null); setSatelite(null);
    map.current?.fitBounds(cities.map(item => item.coords), 65);
  }
  // ERN_MUNICIPIOS_AMAZONAS_V1: visão geral de qualquer cidade do Amazonas.
  function irMunicipio(m: MunicipioAM) {
    const base = cities.find(c => normalize(c.name) === normalize(m.nome));
    if (base) { chooseCity(base.id); return; }
    setActiveId(null); setDrawer(null); setRegion('all'); setZona('all'); setInterest('all');
    setMunicipio(m);
    abrirSatelite(m.nome, m.coords);
    map.current?.setView(m.coords, zoomCidade());
    document.getElementById('ern-v-explorar')?.scrollIntoView({ block: 'start' });
  }
  function chooseZona(value: ZonaERN) {
    setZona(value); setRegion('all'); setActiveId(null); setDrawer(null); setMunicipio(null); setSatelite(null);
    const alvo = cities.filter(c => value === 'all' || ZONA_DA_CIDADE[c.id] === value);
    if (alvo.length) map.current?.fitBounds(alvo.map(item => item.coords), 90, 9);
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

  // ERN_MOTOR_MAPA_V1: Google Maps quando há chave; satélite Leaflet como reserva.
  useEffect(() => {
    let disposed = false;
    let motor: MotorMapa | null = null;
    setStatus('loading'); setTileError(false);
    const inicio = cities.map(item => item.coords);
    const posicionar = (instancia: MotorMapa) => {
      const deepLink = scenes.find(scene => scene.id === new URL(window.location.href).searchParams.get('lugar'));
      if (deepLink) {
        const z = instancia.tipo === 'google' ? (deepLink.coords ? 15 : 14) : (deepLink.coords ? 13 : 9);
        instancia.setView(deepLink.coords ?? cities.find(c => c.id === deepLink.city)!.coords, z);
      }
      setZoom(instancia.getZoom());
      instancia.aoMudarZoom(valor => { if (!disposed) setZoom(valor); });
    };
    const usarLeaflet = async () => {
      if (disposed || !container.current) return;
      motor?.destruir();
      motor = await criarMotorLeaflet(container.current, inicio, () => { if (!disposed) setTileError(true); });
      if (disposed) { motor.destruir(); return; }
      map.current = motor; setMotorTipo('leaflet'); posicionar(motor); setStatus('ready');
    };
    void (async () => {
      try {
        const chave = chaveGoogleMapas();
        if (chave && container.current) {
          try {
            motor = await criarMotorGoogle(container.current, chave, inicio, () => {
              // Chave recusada pelo Google: volta para o mapa de reserva.
              if (!disposed) void usarLeaflet();
            });
            if (disposed) { motor.destruir(); return; }
            map.current = motor; setMotorTipo('google'); posicionar(motor); setStatus('ready');
            return;
          } catch { /* Segue para o mapa de reserva. */ }
        }
        await usarLeaflet();
      } catch { if (!disposed) setStatus('error'); }
    })();
    return () => { disposed = true; motor?.destruir(); map.current = null; };
  }, [attempt]);

  useEffect(() => {
    const motor = map.current;
    if (status !== 'ready' || !motor) return;
    motor.limparPins();
    const pin = (dados: Omit<PinMapa, 'html' | 'classe' | 'largura' | 'altura' | 'ancoraX' | 'ancoraY'> & Partial<PinMapa>) => motor.adicionarPin({
      classe: 'ern-v-marco-marker', largura: 64, altura: 48, ancoraX: 32, ancoraY: 42, html: '', ...dados,
    } as PinMapa);
    cities.filter(c => (region === 'all' || c.id === region) && (zona === 'all' || ZONA_DA_CIDADE[c.id] === zona) && (interest !== 'fishing' || c.id === 'barcelos')).forEach(c => {
      if (c.id === 'barcelos' && (interest === 'all' || interest === 'fishing')) {
        pin({
          coords: c.coords, titulo: fishing.legend, rotulo: c.name, z: 30, classe: 'ern-v-fishing-marker',
          html: `<div style="display:grid;place-items:center;width:64px;height:42px;padding:2px;box-sizing:border-box;border:0;background:transparent">${fishingSvg}</div>`,
          aoClicar: () => { choose(scenes.find(scene => scene.id === 'barcelos')!); setInterest('fishing'); },
        });
        return;
      }
      // ERN_BOTO_NOVO_AIRAO_V1
      if (c.id === 'novo-airao') {
        const descricaoBoto = lang === 'EN'
          ? 'Novo Airão · pink river dolphin · regional reference'
          : lang === 'ES'
          ? 'Novo Airão · delfín rosado · referencia regional'
          : 'Novo Airão · boto-cor-de-rosa · referência regional';
        pin({
          coords: c.coords, titulo: descricaoBoto, rotulo: c.name, z: 30, classe: 'ern-v-boto-marker',
          html: '<span class="ern-v-boto-visual" style="display:grid!important;place-items:center!important;width:64px!important;height:42px!important;max-width:64px!important;max-height:42px!important;padding:2px!important;box-sizing:border-box!important;overflow:hidden!important"><img src="/images/fauna/boto-ern.png" alt="" width="60" height="38" draggable="false" style="display:block!important;width:60px!important;height:38px!important;min-width:0!important;min-height:0!important;max-width:60px!important;max-height:38px!important;object-fit:contain!important;position:static!important;pointer-events:none!important" /></span>',
          aoClicar: () => { const destino = scenes.find(scene => scene.id === 'novo-airao'); if (destino) choose(destino); },
        });
        return;
      }
      const marco = marcosCidade[c.id];
      if (marco) {
        pin({
          coords: c.coords, titulo: marco.legenda[lang], rotulo: c.name, z: 30,
          html: `<span class="ern-v-marco-visual"><img src="${marco.imagem}" alt="" width="${marco.largura}" height="42" draggable="false" /></span>`,
          aoClicar: () => { const destino = scenes.find(scene => scene.id === marco.scene); if (destino) choose(destino); },
        });
        return;
      }
      const face = c.image ? `<img src="${c.image}" alt="" style="width:100%;height:100%;object-fit:cover"/>` : `<span>${c.name.slice(0, 1)}</span>`;
      pin({
        coords: c.coords, titulo: c.name, rotulo: c.name, z: 20, classe: 'ern-v-pin', largura: 56, altura: 66, ancoraX: 28, ancoraY: 60,
        html: `<div class="ern-v-pin-face ${c.id === city.id && drawer === 'place' ? 'ern-v-pin-active' : ''}">${face}</div>`,
        aoClicar: () => chooseCity(c.id),
      });
    });
    // Lugares com coordenada própria (praia, Encontro das Águas) ao aproximar.
    scenes.filter(scene => scene.coords && filtered.some(item => item.id === scene.id)).forEach(scene => {
      if (zoom < 9) return;
      pin({
        coords: scene.coords!, titulo: t.destinations[scene.id].titulo, rotulo: zoom >= 11 ? t.destinations[scene.id].titulo : undefined,
        z: 25, classe: 'ern-v-beach-pin', largura: 30, altura: 30, ancoraX: 15, ancoraY: 15, html: '<span>≈</span>',
        aoClicar: () => choose(scene),
      });
    });
    // ERN_MUNICIPIOS_AMAZONAS_V1: as demais sedes municipais como pontos dourados.
    if (zona === 'all' && region === 'all' && interest === 'all') {
      MUNICIPIOS_AMAZONAS.filter(m => !cities.some(c => normalize(c.name) === normalize(m.nome))).forEach(m => {
        pin({
          coords: m.coords, titulo: m.nome, rotulo: zoom >= 7 || municipio?.ibge === m.ibge ? m.nome : undefined,
          z: municipio?.ibge === m.ibge ? 40 : 5, classe: `ern-v-muni${municipio?.ibge === m.ibge ? ' ern-v-muni-ativo' : ''}`,
          largura: 16, altura: 16, ancoraX: 8, ancoraY: 8, html: '<span class="ern-v-muni-ponto"></span>',
          aoClicar: () => irMunicipio(m),
        });
      });
    }
    // Callbacks usam apenas setters e referências estáveis do mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, motorTipo, region, zona, filtered, city.id, drawer, t, u.regional, zoom, interest, fishing, municipio]);

  useEffect(() => {
    if (status !== 'ready' || !map.current) return;
    map.current.definirPosicao(position);
  }, [position, status, motorTipo]);

  function sceneCard(scene: Scene, compact: boolean) {
    const d = t.destinations[scene.id];
    return <article key={scene.id} className={`ern-v-card ${compact ? 'ern-v-card-compact' : ''}`}>
      <button type="button" className="ern-v-card-open" onClick={() => choose(scene)} aria-label={`${u.discover}: ${d.titulo}`}>
        <div className="ern-v-card-photo"><SceneImage src={scene.image} alt={`${d.titulo} · ${scene.id === 'cachoeira-eldorado' ? eldoradoImagemLabel : scene.context ? u.context : u.collection}`} />
          {(scene.context || scene.id === 'cachoeira-eldorado') && <span className="ern-v-photo-tag">{scene.id === 'cachoeira-eldorado' ? eldoradoImagemLabel : u.context}</span>}
        </div>
        <div className="ern-v-card-copy"><span className="ern-v-kicker">{d.local}</span><h3>{d.titulo}</h3>
          {(scene.id === 'barcelos' || scene.id === 'cachoeira-eldorado' || scene.id === 'serra-do-araca' || scene.id === 'praia-grande' || scene.id === 'mariua' || scene.id === 'festival-peixe-ornamental' || scene.id === 'novo-airao' || scene.id === 'anavilhanas') && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              marginTop: '8px',
              color: '#8a4b12',
              fontSize: '11px',
              fontWeight: 600,
            }}>
              <span aria-hidden="true">▶</span>
              {lang === 'EN' ? 'Watch the adventure' : lang === 'ES' ? 'Ver la aventura' : 'Ver a aventura'}
            </span>
          )}{!compact && <p>{d.descricao}</p>}<span className="ern-v-card-link">{u.discover} <span aria-hidden="true">↗</span></span></div>
      </button>
      <button type="button" className="ern-v-heart" aria-pressed={saved.includes(scene.id)} aria-label={`${saved.includes(scene.id) ? u.saved : u.save}: ${d.titulo}`} onClick={() => toggleSaved(scene.id)}><ArcoFlechaERN ativo={saved.includes(scene.id)} /></button>
    </article>;
  }

  return <div className="ern-v-root">
    <section id="ern-v-explorar" className="ern-v-stage" aria-labelledby="ern-v-title">
      <aside className="ern-v-panel" aria-label={u.overview}>
        <div className="ern-v-intro">
          <p className="ern-v-kicker">{u.eyebrow}</p>
          <h1 id="ern-v-title">{p.titulo[0]} <span className="ern-v-ouro">{p.titulo[1]}</span> {p.titulo[2]}</h1>
          <p>{p.intro}</p>
          <label className="ern-v-search"><span aria-hidden="true">⌕</span><input type="search" aria-label={u.search} placeholder={u.search} value={query} onChange={e => setQuery(e.target.value)} /></label>
          <div className="ern-v-zonas" role="group" aria-label={p.regioes}>
            {zonas.map(value => <button type="button" key={value} aria-pressed={zona === value && region === 'all'} onClick={() => chooseZona(value)}>{ROTULOS_ZONA[lang][value]}</button>)}
          </div>
          <div className="ern-v-interests" aria-label={t.discovery.title}>{interests.map((value, i) => <button type="button" key={value} aria-pressed={interest === value} onClick={() => {
            setInterest(value);
            if (value === 'fishing') {
              setRegion('all');
              setZona('all');
              setQuery('');
              setActiveId(null);
              setDrawer(null);
              setMunicipio(null);
              map.current?.setView(
                cities.find(item => item.id === 'barcelos')!.coords,
                map.current.tipo === 'google' ? 9 : 8,
              );
            }
          }}>{value === 'fishing' ? fishing.filter : u.interests[i]}</button>)}</div>
        </div>
        <div className="ern-v-list-head">
          <span>{p.contagem(filtered.length)}{region !== 'all' && <> · {cities.find(c => c.id === region)?.name}</>}</span>
          {(zona !== 'all' || region !== 'all' || interest !== 'all' || query) && <button type="button" onClick={overview}>{p.verTodos}</button>}
        </div>
        <ul className="ern-v-list">
          {filtered.length ? filtered.map(scene => {
            const d = t.destinations[scene.id];
            const ativo = activeId === scene.id && drawer === 'place';
            return <li key={scene.id} id={`ern-v-item-${scene.id}`} className="ern-v-item" data-ativo={ativo || undefined}>
              <button type="button" className="ern-v-item-open" onClick={() => choose(scene)} aria-current={ativo ? 'true' : undefined} aria-label={`${u.discover}: ${d.titulo}`}>
                <span className="ern-v-item-foto"><SceneImage src={scene.image} alt="" /></span>
                <span className="ern-v-item-texto">
                  <span className="ern-v-item-local">{d.local}</span>
                  <span className="ern-v-item-titulo">{d.titulo}</span>
                  <span className="ern-v-item-destaque">{d.destaque}</span>
                </span>
              </button>
              <button type="button" className="ern-v-item-coracao" aria-pressed={saved.includes(scene.id)} aria-label={`${saved.includes(scene.id) ? u.saved : u.save}: ${d.titulo}`} onClick={() => toggleSaved(scene.id)}><ArcoFlechaERN ativo={saved.includes(scene.id)} /></button>
            </li>;
          }) : <li className="ern-v-empty"><p>{u.noResults}</p><button type="button" onClick={overview}>{u.clear}</button></li>}
        </ul>
        {normalize(query) && (() => {
          const achadas = MUNICIPIOS_AMAZONAS.filter(m => normalize(m.nome).includes(normalize(query))).slice(0, 8);
          return achadas.length ? <div className="ern-v-cidades-achadas"><span>{p.cidadesEncontradas}</span>{achadas.map(m => <button type="button" key={m.ibge} onClick={() => irMunicipio(m)}>{m.nome} ↗</button>)}</div> : null;
        })()}
        <details className="ern-v-cidades">
          <summary>{p.cidadesTitulo} <span>{MUNICIPIOS_AMAZONAS.length}</span></summary>
          <div>{MUNICIPIOS_AMAZONAS.map(m => <button type="button" key={m.ibge} aria-pressed={municipio?.ibge === m.ibge} onClick={() => irMunicipio(m)}>{m.nome}</button>)}</div>
        </details>
        <p className="ern-v-panel-note">{u.mapNote}</p>
      </aside>
      <div className="ern-v-mapwrap">
      <div className="ern-v-map" ref={container} aria-label={u.overview} />
      {satelite && <SateliteCidadeERN key={`${satelite.nome}-${satelite.coords.join(',')}`} nome={satelite.nome} coords={satelite.coords} zoom={satelite.zoom} idioma={lang} aoVoltar={() => setSatelite(null)} />}
      <div className="ern-v-tools">
        <button type="button" onClick={overview}>{u.overview}</button>
        <button type="button" disabled={status !== 'ready' || geoBusy} onClick={locate}>{geoBusy ? u.locating : u.locate}</button>
        <button type="button" aria-expanded={drawer === 'saved'} onClick={() => { rememberTrigger(); setDrawer('saved'); }}><ArcoFlechaERN tamanho={18} /> {u.selection} {saved.length > 0 && `(${saved.length})`}</button>
      </div>
      {status !== 'ready' && <div className="ern-v-map-status" role={status === 'error' ? 'alert' : 'status'}><p>{status === 'loading' ? u.loading : u.mapError}</p>{status === 'error' && <button type="button" className="ern-v-button" onClick={() => setAttempt(n => n + 1)}>{u.retry}</button>}</div>}
      {(tileError || geoError || position) && <div className="ern-v-notice" role="status">{tileError && <p>{u.tilesError}</p>}{geoError && <p>{u.geoError}</p>}{position && <p>{u.geoNote} {Math.round(position.accuracy)} m. <button type="button" onClick={() => { requestId.current += 1; setPosition(null); setGeoBusy(false); }}>{u.removeGeo}</button></p>}</div>}
      {municipio && !drawer && <aside className="ern-v-muni-card" aria-labelledby="ern-v-muni-titulo">
        <button type="button" className="ern-v-close" onClick={() => setMunicipio(null)} aria-label={p.muniFechar}>×</button>
        <p className="ern-v-kicker">{p.muniKicker}</p>
        <h2 id="ern-v-muni-titulo">{municipio.nome}</h2>
        <p>{p.muniTexto}</p>
        <div className="ern-v-muni-acoes">
          <Link className="ern-v-ouro-botao" href="/#concierge">✦ {p.opsConcierge}</Link>
          {!satelite && chaveEmbedGoogle() && <button type="button" className="ern-v-network-link" onClick={() => abrirSatelite(municipio.nome, municipio.coords)}>🛰 {p.verSatelite}</button>}
          <Link className="ern-v-network-link" href={`/rede?local=${encodeURIComponent(municipio.nome)}`}>{p.muniRede} ↗</Link>
          <a className="ern-v-network-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${municipio.nome}, Amazonas, Brasil`)}`} target="_blank" rel="noopener noreferrer">{p.muniGoogle} ↗</a>
        </div>
      </aside>}
      {drawer && <aside className="ern-v-drawer" aria-labelledby="ern-v-detail-title">
        <button type="button" className="ern-v-close" onClick={closeDrawer} aria-label={u.close}>×</button>
        {drawer === 'saved' ? <div className="ern-v-detail-copy"><h2 ref={heading} tabIndex={-1} id="ern-v-detail-title">{u.selection}</h2><p>{u.selectionNote}</p>{saved.length ? saved.map(id => sceneCard(scenes.find(scene => scene.id === id)!, true)) : <p>{u.selectionEmpty}</p>}<Link className="ern-v-button" href="/#concierge">{u.plan} ↗</Link></div> : <>
          {active && <div className="ern-v-detail-photo"><SceneImage src={active.id === 'cachoeira-eldorado' ? '/images/destinos/eldorado-detalhe.png' : active.image} alt={`${content!.titulo} · ${active.id === 'cachoeira-eldorado' ? eldoradoImagemLabel : active.context ? u.context : u.collection}`} eager /><span className="ern-v-photo-tag">{active.id === 'cachoeira-eldorado' ? eldoradoImagemLabel : active.context ? u.context : u.collection}</span></div>}
          <div className="ern-v-detail-copy"><p className="ern-v-kicker">{active ? content!.local : u.regional}</p><h2 ref={heading} tabIndex={-1} id="ern-v-detail-title">{interest === 'fishing' && active?.id === 'barcelos' ? fishing.title : content?.titulo ?? city.name}</h2>
            <div className="ern-v-abas" role="tablist" aria-label={content?.titulo ?? city.name}>
              {ABAS.map((valor, i) => <button type="button" role="tab" key={valor} id={`ern-v-aba-${valor}`} aria-selected={aba === valor} aria-controls="ern-v-aba-painel" onClick={() => setAba(valor)}>{p.abas[i]}</button>)}
            </div>
            <div id="ern-v-aba-painel" role="tabpanel" aria-labelledby={`ern-v-aba-${aba}`}>
            {aba === 'historia' && (() => {
              const historia = HISTORIAS_MUNICIPIOS.find(item => item.id === HISTORIA_DA_CIDADE[city.id]);
              if (!historia) return <p>{p.semHistoria}</p>;
              const texto = historia.textos[lang];
              return <section className="ern-v-historia">
                <h3>{texto.titulo}</h3>
                <p>{texto.texto}</p>
                <ul>{texto.fatos.map(fato => <li key={fato}>{fato}</li>)}</ul>
              </section>;
            })()}
            {aba === 'rede' && <section className="ern-v-na-rede">
              <h3>{p.redeTitulo}</h3>
              <p>{p.redeTexto}</p>
              {active && <ListaVivenciasERN key={'rede-' + active.id} destino={active.id} somenteVideos={false} />}
              <Link className="ern-v-button" href={`/rede?local=${encodeURIComponent(city.name)}`}>{p.redeBotao} ↗</Link>
            </section>}
            {aba === 'chegar' && <section className="ern-v-chegar">
              <div className="ern-v-fatos">{fatosDaCidade(city.id, lang).map(fato => <div key={fato.rotulo}><span aria-hidden="true">{fato.icone}</span><b>{fato.rotulo}</b><span>{fato.valor}</span></div>)}</div>
              <p className="ern-v-detail-note">{p.fatosNota}</p>
            </section>}
            {aba === 'geral' && <>
            <p>{content?.descricao ?? u.regionalIntro}</p>
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
            {/* ERN_NOVO_AIRAO_CARD_V1 */}
            {active?.id === 'novo-airao' && (
              <NovoAiraoDestinoERN
                onExplorar={id => {
                  const destinoRelacionado = scenes.find(
                    scene => scene.id === id,
                  );
                  if (destinoRelacionado) choose(destinoRelacionado);
                }}
              />
            )}
            {/* ERN_ANAVILHANAS_CARD_V1 */}
{active?.id === 'anavilhanas' && (
  <AnavilhanasDestinoERN />
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
                  color: '#0f1c17',
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
            {active && (
              <ListaVivenciasERN
                key={'vivencias-' + active.id}
                destino={active.id}
                somenteVideos={false}
              />
            )}
            {active ? <><p className="ern-v-detail-note">{active.coords ? u.exactNote : u.baseNote}</p><button type="button" className="ern-v-button ern-v-button-soft" aria-pressed={saved.includes(active.id)} onClick={() => toggleSaved(active.id)}><ArcoFlechaERN ativo={saved.includes(active.id)} /> {saved.includes(active.id) ? u.saved : u.save}</button><div className="ern-v-detail-actions"><button type="button" onClick={() => void share()}>{u.share} ↗</button><a href={active.source} target="_blank" rel="noopener noreferrer">{u.source} ↗</a></div>{active.coords && <a className="ern-v-coordinate-source" href="https://www.geonames.org/12965878/ilha-da-praia-grande.html" target="_blank" rel="noopener noreferrer">GeoNames · CC BY 4.0 ↗</a>}</> : <div className="ern-v-regional-links">{scenes.filter(scene => scene.city === city.id).map(scene => <button type="button" key={scene.id} onClick={() => choose(scene)}>{t.destinations[scene.id].titulo} ↗</button>)}<a href={municipalSource} target="_blank" rel="noopener noreferrer">Amazonastur ↗</a></div>}
            {shareUrl && <label className="ern-v-share-field">{u.copyLink}<input readOnly value={shareUrl} onFocus={event => event.currentTarget.select()} /></label>}<p role="status" className="ern-v-copy-status">{message}</p>
            </>}
            </div>
            <section className="ern-v-ops" aria-labelledby="ern-v-ops-titulo">
              <p className="ern-v-kicker">EDA CONCIERGE</p>
              <h3 id="ern-v-ops-titulo">{p.opsTitulo}</h3>
              <p>{p.opsTexto}</p>
              <Link className="ern-v-ouro-botao" href="/#concierge">✦ {p.opsConcierge}</Link>
              {!satelite && chaveEmbedGoogle() && <button type="button" className="ern-v-network-link" onClick={() => abrirSatelite(city.name, city.coords)}>🛰 {p.verSatelite}</button>}
              <Link className="ern-v-network-link" href={`/rede?local=${encodeURIComponent(city.name)}`}>{p.opsRede} ↗</Link>
            </section>
          </div>
        </>}
      </aside>}
      </div>
    </section>
    <section id="ern-v-galeria" className="ern-v-gallery" aria-labelledby="ern-v-gallery-title"><p className="ern-v-kicker">{t.discovery.title}</p><h2 id="ern-v-gallery-title">{interest === 'fishing' ? fishing.filter : u.galleryTitle}</h2><p className="ern-v-section-intro">{u.galleryIntro}</p><div className="ern-v-gallery-grid">{filtered.length ? filtered.map(scene => sceneCard(scene, false)) : <div className="ern-v-empty"><p>{u.noResults}</p><button type="button" className="ern-v-button" onClick={overview}>{u.clear}</button></div>}</div></section>
    <section className="ern-v-waters" aria-labelledby="ern-v-waters-title"><div className="ern-v-waters-image"><SceneImage src="/images/regiao/viagembarco.png.jpeg" alt={`${t.waters.eyebrow} · ${u.context}`} /><span className="ern-v-photo-tag">{u.context}</span></div><div className="ern-v-waters-copy"><p className="ern-v-kicker">{t.waters.eyebrow}</p><h2 id="ern-v-waters-title">{t.waters.title}</h2><p>{t.waters.description}</p><div><h3>{t.waters.highLabel}</h3><p>{t.waters.highDescription}</p><h3>{t.waters.lowLabel}</h3><p>{t.waters.lowDescription}</p></div><p className="ern-v-detail-note">{u.waterNote}</p></div></section>
    <section className="ern-v-plan"><p className="ern-v-kicker">EDA CONCIERGE</p><h2>{t.planning.title}</h2><p>{t.planning.description}</p><Link className="ern-v-button" href="/#concierge">{u.plan} ↗</Link><Link className="ern-v-network-link" href="/rede">{u.network} ↗</Link></section>
    <footer className="ern-v-footer"><span>Encantos da Amazônia</span><Link href="/privacidade">{u.privacy}</Link><Link href="/termos">{u.terms}</Link></footer>
  </div>;
}

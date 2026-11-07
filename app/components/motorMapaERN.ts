'use client';

// ERN_MOTOR_MAPA_V1
// Uma única interface de mapa para o explorador de Destinos.
// - Google Maps (ruas, satélite, Street View e pontos do Google) quando há
//   chave em NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (ou na chave Embed já usada).
// - Leaflet com imagem de satélite como reserva automática, se a chave
//   faltar ou o Google recusar a autenticação.
// Os pinos são HTML próprios (fotos, tucunaré, boto, flecha, quadrilha).

/* eslint-disable @typescript-eslint/no-explicit-any */

export type Coord = [number, number];

export type PinMapa = {
  coords: Coord;
  html: string;
  classe: string;
  largura: number;
  altura: number;
  ancoraX: number;
  ancoraY: number;
  titulo: string;
  rotulo?: string;
  z?: number;
  aoClicar: () => void;
};

export interface MotorMapa {
  tipo: 'google' | 'leaflet';
  setView(coords: Coord, zoom: number): void;
  fitBounds(pontos: Coord[], margem: number, zoomMaximo?: number): void;
  getZoom(): number;
  aoMudarZoom(callback: (zoom: number) => void): void;
  limparPins(): void;
  adicionarPin(pin: PinMapa): void;
  definirPosicao(posicao: { coords: Coord; accuracy: number } | null): void;
  destruir(): void;
}

export function chaveGoogleMapas(): string {
  // Só a chave com Maps JavaScript API ativada. A chave Embed é usada na
  // vista de satélite das cidades (SateliteCidadeERN).
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || '';
}

// Estilo verde-noite do Rio Negro, mantendo ruas e pontos turísticos legíveis.
const ESTILO_RIO_NEGRO = [
  { elementType: 'geometry', stylers: [{ color: '#13221d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#c9d6cf' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b1512' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a2533' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#7fa9bd' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#163026' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1a3329' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#f0c98a' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#17392b' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d4038' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1b2a25' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#a9bbb1' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#6a5531' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#3b5249' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];

let carregamentoGoogle: Promise<any> | null = null;

export function carregarGoogle(chave: string, aoFalharAutenticacao: () => void): Promise<any> {
  const janela = window as any;
  janela.gm_authFailure = aoFalharAutenticacao;
  if (janela.google?.maps?.importLibrary) return Promise.resolve(janela.google);
  if (carregamentoGoogle) return carregamentoGoogle;
  carregamentoGoogle = new Promise((resolver, rejeitar) => {
    const nomeCallback = '__ernGoogleMapsPronto';
    janela[nomeCallback] = () => resolver(janela.google);
    const script = document.createElement('script');
    const parametros = new URLSearchParams({
      key: chave, v: 'weekly', language: 'pt-BR', region: 'BR',
      loading: 'async', callback: nomeCallback,
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${parametros.toString()}`;
    script.async = true;
    script.onerror = () => { carregamentoGoogle = null; rejeitar(new Error('google-maps')); };
    document.head.appendChild(script);
  });
  return carregamentoGoogle;
}

// Cada mapa ganha um contêiner próprio: duas montagens seguidas (modo
// estrito do React) nunca apagam o mapa uma da outra.
function conteinerProprio(elemento: HTMLElement): HTMLDivElement {
  const alvo = document.createElement('div');
  alvo.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
  elemento.appendChild(alvo);
  return alvo;
}

function elementoPin(pin: PinMapa): HTMLDivElement {
  const raiz = document.createElement('div');
  raiz.className = `ern-v-pin-g ${pin.classe}`;
  raiz.style.position = 'absolute';
  raiz.style.width = `${pin.largura}px`;
  raiz.style.height = `${pin.altura}px`;
  raiz.style.zIndex = String(500 + (pin.z ?? 0));
  raiz.setAttribute('role', 'button');
  raiz.setAttribute('tabindex', '0');
  raiz.setAttribute('aria-label', pin.titulo);
  raiz.title = pin.titulo;
  raiz.innerHTML = pin.html;
  if (pin.rotulo) {
    const rotulo = document.createElement('span');
    rotulo.className = 'ern-v-pin-rotulo-g';
    rotulo.textContent = pin.rotulo;
    raiz.appendChild(rotulo);
  }
  const ativar = (evento: Event) => { evento.stopPropagation(); pin.aoClicar(); };
  raiz.addEventListener('click', ativar);
  raiz.addEventListener('keydown', evento => {
    if (evento.key === 'Enter' || evento.key === ' ') { evento.preventDefault(); ativar(evento); }
  });
  return raiz;
}

export async function criarMotorGoogle(
  elemento: HTMLElement,
  chave: string,
  inicio: Coord[],
  aoFalharAutenticacao: () => void,
): Promise<MotorMapa> {
  const google = await carregarGoogle(chave, aoFalharAutenticacao);
  const { Map: MapaGoogle } = await google.maps.importLibrary('maps');
  const alvo = conteinerProprio(elemento);
  const mapa = new MapaGoogle(alvo, {
    center: { lat: -3.4, lng: -62 },
    zoom: 6,
    minZoom: 4,
    styles: ESTILO_RIO_NEGRO,
    backgroundColor: '#0b1512',
    clickableIcons: true,
    gestureHandling: 'cooperative',
    mapTypeControl: true,
    mapTypeControlOptions: {
      position: google.maps.ControlPosition.LEFT_BOTTOM,
      mapTypeIds: ['roadmap', 'hybrid'],
    },
    streetViewControl: true,
    streetViewControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
    zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
    fullscreenControl: true,
    fullscreenControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
  });

  class PinHtml extends google.maps.OverlayView {
    pin: PinMapa;
    div: HTMLDivElement | null = null;
    constructor(pin: PinMapa) { super(); this.pin = pin; }
    onAdd() {
      this.div = elementoPin(this.pin);
      this.getPanes().overlayMouseTarget.appendChild(this.div);
    }
    draw() {
      if (!this.div) return;
      const ponto = this.getProjection().fromLatLngToDivPixel(
        new google.maps.LatLng(this.pin.coords[0], this.pin.coords[1]),
      );
      if (!ponto) return;
      this.div.style.left = `${ponto.x - this.pin.ancoraX}px`;
      this.div.style.top = `${ponto.y - this.pin.ancoraY}px`;
    }
    onRemove() { this.div?.remove(); this.div = null; }
  }

  let pins: any[] = [];
  let camadasPosicao: any[] = [];

  const motor: MotorMapa = {
    tipo: 'google',
    setView(coords, zoom) { mapa.setZoom(zoom); mapa.panTo({ lat: coords[0], lng: coords[1] }); },
    fitBounds(pontos, margem, zoomMaximo) {
      if (!pontos.length) return;
      const limites = new google.maps.LatLngBounds();
      pontos.forEach(([lat, lng]) => limites.extend({ lat, lng }));
      mapa.fitBounds(limites, margem);
      if (zoomMaximo) {
        google.maps.event.addListenerOnce(mapa, 'idle', () => {
          if (mapa.getZoom() > zoomMaximo) mapa.setZoom(zoomMaximo);
        });
      }
    },
    getZoom() { return mapa.getZoom() ?? 6; },
    aoMudarZoom(callback) { mapa.addListener('zoom_changed', () => callback(mapa.getZoom() ?? 6)); },
    limparPins() { pins.forEach(pin => pin.setMap(null)); pins = []; },
    adicionarPin(pin) { const overlay = new PinHtml(pin); overlay.setMap(mapa); pins.push(overlay); },
    definirPosicao(posicao) {
      camadasPosicao.forEach(camada => camada.setMap(null));
      camadasPosicao = [];
      if (!posicao) return;
      const centro = { lat: posicao.coords[0], lng: posicao.coords[1] };
      camadasPosicao.push(new google.maps.Circle({
        map: mapa, center: centro, radius: posicao.accuracy,
        strokeColor: '#4f9cff', strokeWeight: 1, fillColor: '#4f9cff', fillOpacity: .1,
      }));
      camadasPosicao.push(new google.maps.Circle({
        map: mapa, center: centro, radius: Math.max(12, posicao.accuracy / 25),
        strokeColor: '#ffffff', strokeWeight: 2, fillColor: '#2563eb', fillOpacity: 1,
      }));
      mapa.setZoom(14); mapa.panTo(centro);
    },
    destruir() {
      motor.limparPins();
      camadasPosicao.forEach(camada => camada.setMap(null));
      google.maps.event.clearInstanceListeners(mapa);
      alvo.remove();
    },
  };
  motor.fitBounds(inicio, 70);
  return motor;
}

export async function criarMotorLeaflet(
  elemento: HTMLElement,
  inicio: Coord[],
  aoErroDeBlocos: () => void,
): Promise<MotorMapa> {
  const L = await import('leaflet');
  const alvo = conteinerProprio(elemento);
  const mapa = L.map(alvo, { zoomControl: false, scrollWheelZoom: false, minZoom: 3, maxZoom: 18 });
  L.control.zoom({ position: 'bottomright' }).addTo(mapa);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Imagens &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics',
    maxZoom: 18, keepBuffer: 2, updateWhenIdle: true,
  }).on('tileerror', aoErroDeBlocos).addTo(mapa);
  const camadaPins = L.layerGroup().addTo(mapa);
  const camadaPosicao = L.layerGroup().addTo(mapa);
  const observador = new ResizeObserver(() => mapa.invalidateSize({ pan: false }));
  observador.observe(alvo);

  const motor: MotorMapa = {
    tipo: 'leaflet',
    setView(coords, zoom) { mapa.setView(coords, zoom, { animate: false }); },
    fitBounds(pontos, margem, zoomMaximo) {
      if (!pontos.length) return;
      mapa.fitBounds(L.latLngBounds(pontos), { padding: [margem, margem], maxZoom: zoomMaximo, animate: false });
    },
    getZoom() { return mapa.getZoom(); },
    aoMudarZoom(callback) { mapa.on('zoomend', () => callback(mapa.getZoom())); },
    limparPins() { camadaPins.clearLayers(); },
    adicionarPin(pin) {
      const marcador = L.marker(pin.coords, {
        title: pin.titulo, alt: pin.titulo, keyboard: true, zIndexOffset: (pin.z ?? 0) * 10,
        icon: L.divIcon({
          className: pin.classe, html: pin.html,
          iconSize: [pin.largura, pin.altura], iconAnchor: [pin.ancoraX, pin.ancoraY],
        }),
      });
      if (pin.rotulo) {
        const rotulo = document.createElement('span');
        rotulo.className = 'ern-v-pin-name';
        rotulo.textContent = pin.rotulo;
        marcador.bindTooltip(rotulo, { permanent: true, direction: 'bottom', offset: [0, 4], className: 'ern-v-pin-label' });
      }
      marcador.on('click', pin.aoClicar);
      marcador.addTo(camadaPins);
    },
    definirPosicao(posicao) {
      camadaPosicao.clearLayers();
      if (!posicao) return;
      L.circle(posicao.coords, { radius: posicao.accuracy, color: '#2563eb', weight: 1, fillOpacity: .08 }).addTo(camadaPosicao);
      L.circleMarker(posicao.coords, { radius: 7, color: '#fff', fillColor: '#2563eb', fillOpacity: 1, weight: 2 }).addTo(camadaPosicao);
      mapa.setView(posicao.coords, 12, { animate: false });
    },
    destruir() { observador.disconnect(); mapa.remove(); alvo.remove(); },
  };
  motor.fitBounds(inicio, 70);
  return motor;
}

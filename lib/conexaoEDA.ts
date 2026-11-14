// EDA_SINAL_FRACO_V1
// Detecta quando a internet está fraca (comunidade, Starlink oscilando, 3G).
// Regra da plataforma: com sinal normal, NADA muda — tudo funciona como foi
// desenvolvido. O "modo leve" só liga quando o sinal está fraco (ou se o
// próprio usuário ligar manualmente).
//
// Como mede:
// - Android/Chrome: usa navigator.connection (tipo de rede, velocidade, economia de dados).
// - iPhone/Safari (não tem navigator.connection): mede o tempo real de resposta
//   e a velocidade dos arquivos que o próprio site já baixou.
// - Sem internet: considera fraco.
// Tem "folga" (histerese) para não ficar ligando e desligando à toa.

export type PreferenciaModoLeve = 'auto' | 'ligado' | 'desligado';

const CHAVE_PREFERENCIA = 'eda-modo-leve-v1';
const EVENTO = 'eda-sinal-mudou';

type ConexaoNavegador = {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener?: (tipo: string, fn: () => void) => void;
};

let fraco = false;
let iniciado = false;

function conexao(): ConexaoNavegador | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as Navigator & { connection?: ConexaoNavegador }).connection;
}

export function lerPreferenciaModoLeve(): PreferenciaModoLeve {
  try {
    const valor = localStorage.getItem(CHAVE_PREFERENCIA);
    if (valor === 'ligado' || valor === 'desligado') return valor;
  } catch {
    // Navegador sem armazenamento (modo privado antigo): segue no automático.
  }
  return 'auto';
}

export function salvarPreferenciaModoLeve(valor: PreferenciaModoLeve) {
  try {
    if (valor === 'auto') localStorage.removeItem(CHAVE_PREFERENCIA);
    else localStorage.setItem(CHAVE_PREFERENCIA, valor);
  } catch {
    // Sem armazenamento: vale só nesta visita.
  }
  avaliar();
}

// Velocidade estimada (kbit/s) e tempo de resposta (ms) a partir dos arquivos
// do próprio site baixados nos últimos 2 minutos (funciona também no iPhone).
function medirPeloSite(): { kbps: number | null; rtt: number | null } {
  if (typeof performance === 'undefined' || !performance.getEntriesByType) {
    return { kbps: null, rtt: null };
  }

  const agora = performance.now();
  const recursos = (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
    .filter(r =>
      r.name.startsWith(location.origin) &&
      r.transferSize > 2048 && // só o que veio da rede de verdade (não do cache)
      r.responseEnd > 0 &&
      agora - r.responseEnd < 120_000,
    );

  let bytes = 0;
  let tempo = 0;
  const rtts: number[] = [];

  for (const r of recursos) {
    const download = r.responseEnd - r.responseStart;
    if (download > 0) {
      bytes += r.transferSize;
      tempo += download;
    }
    if (r.responseStart > 0 && r.requestStart > 0) rtts.push(r.responseStart - r.requestStart);
  }

  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (nav && nav.responseStart > 0 && nav.requestStart > 0 && agora - nav.responseEnd < 120_000) {
    rtts.push(nav.responseStart - nav.requestStart);
  }

  const kbps = bytes >= 50_000 && tempo > 0 ? (bytes * 8) / tempo : null; // bytes*8/ms = kbit/s
  rtts.sort((a, b) => a - b);
  const rtt = rtts.length ? rtts[Math.floor(rtts.length / 2)] : null;
  return { kbps, rtt };
}

function calcularFraco(): boolean {
  const preferencia = lerPreferenciaModoLeve();
  if (preferencia === 'ligado') return true;
  if (preferencia === 'desligado') return false;

  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;

  const c = conexao();
  if (c) {
    if (c.saveData) return true;
    if (c.effectiveType && ['slow-2g', '2g', '3g'].includes(c.effectiveType)) return true;
    if (typeof c.downlink === 'number' && c.downlink > 0) {
      // Folga: liga abaixo de 1,2 Mbit/s, só desliga acima de 2 Mbit/s.
      if (c.downlink < 1.2) return true;
      if (c.downlink > 2) return false;
      return fraco;
    }
  }

  const { kbps, rtt } = medirPeloSite();
  if (kbps === null && rtt === null) return fraco;

  const lento = (kbps !== null && kbps < 1200) || (rtt !== null && rtt > 1200);
  const bom = (kbps === null || kbps > 2000) && (rtt === null || rtt < 700);
  if (lento) return true;
  if (bom) return false;
  return fraco;
}

function avaliar() {
  const novo = calcularFraco();
  if (novo === fraco && iniciado) return;
  fraco = novo;
  if (typeof document !== 'undefined') {
    if (fraco) document.documentElement.setAttribute('data-eda-sinal', 'fraco');
    else document.documentElement.removeAttribute('data-eda-sinal');
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: { fraco } }));
  }
}

export function iniciarMonitorSinalEDA() {
  if (iniciado || typeof window === 'undefined') return;
  avaliar();
  iniciado = true;

  window.addEventListener('online', avaliar);
  window.addEventListener('offline', avaliar);
  conexao()?.addEventListener?.('change', avaliar);
  window.addEventListener('load', () => window.setTimeout(avaliar, 1500));
  window.setInterval(() => {
    if (document.visibilityState === 'visible') avaliar();
  }, 45_000);
}

export function sinalFracoEDA(): boolean {
  if (!iniciado) iniciarMonitorSinalEDA();
  return fraco;
}

export function aoMudarSinalEDA(fn: (fraco: boolean) => void): () => void {
  const ouvinte = (e: Event) => fn(Boolean((e as CustomEvent<{ fraco: boolean }>).detail?.fraco));
  window.addEventListener(EVENTO, ouvinte);
  return () => window.removeEventListener(EVENTO, ouvinte);
}

// EDA_MODO_LEVE_V1: versão leve (480p) de um vídeo do site, usada só com sinal fraco.
// '/videos destinos/praiagrande.MP4' -> '/videos/leve/praiagrande.mp4'
export function videoLeveEDA(src: string): string {
  if (!src.startsWith('/videos')) return src; // vídeos de operadoras (Supabase) ficam como estão
  const nome = decodeURIComponent(src.split('/').pop() ?? '').replace(/\.[^.]+$/, '');
  const slug = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9.-]/g, '-');
  return `/videos/leve/${slug}.mp4`;
}

// EDA_MODO_LEVE_V1: foto enviada pela operadora (Supabase) em versão reduzida,
// pelo otimizador de imagens da Vercel — só usada com sinal fraco.
const PREFIXO_FOTOS = 'https://leltgfdonsbmsstyprss.supabase.co/storage/v1/object/public/';
export function fotoLeveEDA(url: string, fraco: boolean, largura: 640 | 828 = 828): string {
  if (!fraco || !url || !url.startsWith(PREFIXO_FOTOS)) return url;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${largura}&q=60`;
}

'use strict';

// EDA_PWA_V3 — app instalável e leve para internet de comunidade/Starlink.
// Regra: com sinal normal o site funciona igual (sempre busca na rede primeiro).
// O cache só entra quando a rede falha ou demora demais (sinal fraco).
//
// Segurança (LGPD): só guarda arquivos do próprio site (código, imagens, ícones,
// fontes) e as páginas PÚBLICAS do portal. Nunca guarda páginas da gestão,
// /api, /auth, links com token (voucher, ficha, avaliação), vídeos nem nada
// do Supabase (dados de clientes, financeiro, fichas de saúde).

const VERSAO = 'v3';
const CACHE_OFFLINE = 'ern-offline-base-' + VERSAO;
const CACHE_ESTATICO = 'eda-estatico-' + VERSAO;
const CACHE_MIDIA = 'eda-midia-' + VERSAO;
const CACHE_PAGINAS = 'eda-paginas-' + VERSAO;
const PAGINA_OFFLINE = '/ern-offline.html';

const LIMITE_ESTATICO = 300;
const LIMITE_MIDIA = 160;
const LIMITE_PAGINAS = 40;
const ESPERA_REDE_MS = 6000; // só com sinal fraco a resposta demora isso

const PAGINAS_PUBLICAS = [
  /^\/$/,
  /^\/destinos\/?$/,
  /^\/rede\/?$/,
  /^\/rede\/(perfil|publicacao)\/[^/]+\/?$/,
  /^\/rede\/vivencias\/?$/,
  /^\/experiencias(\/[^/]+)?\/?$/,
  /^\/(precos|operadores|contato|termos|privacidade|reembolso|pesca-esportiva)\/?$/,
];

function paginaPublica(url) {
  return PAGINAS_PUBLICAS.some(r => r.test(url.pathname)) && !url.search;
}

function proibido(url) {
  return (
    url.pathname === '/api' || url.pathname.startsWith('/api/') ||
    url.pathname === '/auth' || url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/videos') ||
    url.pathname.endsWith('.mp4') || url.pathname.endsWith('.MP4')
  );
}

function podeGuardar(resposta) {
  if (!resposta || resposta.status !== 200 || resposta.type !== 'basic') return false;
  const cc = (resposta.headers.get('cache-control') || '').toLowerCase();
  return !cc.includes('no-store') && !cc.includes('private');
}

async function aparar(nome, limite) {
  const cache = await caches.open(nome);
  const chaves = await cache.keys();
  for (let i = 0; i < chaves.length - limite; i += 1) await cache.delete(chaves[i]);
}

async function guardar(nome, pedido, resposta, limite) {
  if (!podeGuardar(resposta)) return;
  const cache = await caches.open(nome);
  await cache.put(pedido, resposta);
  await aparar(nome, limite);
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const resposta = await fetch(PAGINA_OFFLINE, { cache: 'reload' });
    if (
      !resposta.ok || resposta.redirected ||
      !(resposta.headers.get('content-type') || '').includes('text/html')
    ) {
      throw new Error('A tela offline EDA nao foi carregada.');
    }
    const cache = await caches.open(CACHE_OFFLINE);
    await cache.put(PAGINA_OFFLINE, resposta);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const atuais = [CACHE_OFFLINE, CACHE_ESTATICO, CACHE_MIDIA, CACHE_PAGINAS];
    const nomes = await caches.keys();
    await Promise.all(
      nomes
        .filter(n => (n.startsWith('ern-offline-base-') || n.startsWith('eda-')) && !atuais.includes(n))
        .map(n => caches.delete(n)),
    );
    await self.clients.claim();
  })());
});

// Ao sair da conta, a página pede para limpar tudo deste aparelho.
self.addEventListener('message', event => {
  if (event.data && event.data.tipo === 'eda-limpar-cache') {
    event.waitUntil((async () => {
      await caches.delete(CACHE_PAGINAS);
      await caches.delete(CACHE_MIDIA);
    })());
  }
});

async function telaOffline() {
  const cache = await caches.open(CACHE_OFFLINE);
  const pagina = await cache.match(PAGINA_OFFLINE);
  if (pagina) {
    return new Response(await pagina.arrayBuffer(), {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
  return new Response('Encantos da Amazonia: sem conexao. Tente novamente.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

// Páginas públicas: rede primeiro. Se a rede cair ou passar de 6 s,
// mostra a última versão guardada e atualiza por trás.
async function paginaRedePrimeiro(event) {
  const pedido = event.request;
  const cache = await caches.open(CACHE_PAGINAS);
  const daRede = fetch(pedido).then(async resposta => {
    await guardar(CACHE_PAGINAS, pedido, resposta.clone(), LIMITE_PAGINAS);
    return resposta;
  });
  event.waitUntil(daRede.catch(() => undefined));

  const guardada = await cache.match(pedido);
  if (!guardada) {
    try { return await daRede; } catch { return telaOffline(); }
  }

  const tempo = new Promise(ok => setTimeout(() => ok(null), ESPERA_REDE_MS));
  try {
    const primeira = await Promise.race([daRede, tempo]);
    return primeira || guardada;
  } catch {
    return guardada;
  }
}

// Código com nome versionado (/_next/static): nunca muda, pode vir do aparelho.
async function estaticoDoAparelho(pedido) {
  const cache = await caches.open(CACHE_ESTATICO);
  const guardado = await cache.match(pedido);
  if (guardado) return guardado;
  const resposta = await fetch(pedido);
  await guardar(CACHE_ESTATICO, pedido, resposta.clone(), LIMITE_ESTATICO);
  return resposta;
}

// Imagens/ícones/fontes: rede primeiro; sem rede, usa a cópia do aparelho.
async function midiaRedePrimeiro(pedido) {
  try {
    const resposta = await fetch(pedido);
    await guardar(CACHE_MIDIA, pedido, resposta.clone(), LIMITE_MIDIA);
    return resposta;
  } catch (erro) {
    const cache = await caches.open(CACHE_MIDIA);
    const guardado = await cache.match(pedido);
    if (guardado) return guardado;
    throw erro;
  }
}

self.addEventListener('fetch', event => {
  const pedido = event.request;
  if (pedido.method !== 'GET') return;

  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin || proibido(url)) return;
  if (pedido.headers.has('range')) return;

  if (pedido.mode === 'navigate') {
    if (paginaPublica(url)) {
      event.respondWith(paginaRedePrimeiro(event));
    } else {
      // Gestão e links com token: sempre da rede; sem rede, tela offline EDA.
      event.respondWith(fetch(pedido).catch(() => telaOffline()));
    }
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(estaticoDoAparelho(pedido));
    return;
  }

  if (
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(woff2?|svg|png|jpe?g|webp|avif|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(midiaRedePrimeiro(pedido));
  }
});

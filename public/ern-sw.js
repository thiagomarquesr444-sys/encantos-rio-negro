'use strict';

const CACHE_ERN = 'ern-offline-base-v1';
const PAGINA_ERN = '/ern-offline.html';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const resposta = await fetch(PAGINA_ERN, { cache: 'reload' });

    if (
      !resposta.ok ||
      resposta.redirected ||
      !(resposta.headers.get('content-type') || '').includes('text/html')
    ) {
      throw new Error('A tela offline ERN nao foi carregada.');
    }

    const cache = await caches.open(CACHE_ERN);
    await cache.put(PAGINA_ERN, resposta);
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const nomes = await caches.keys();

    await Promise.all(
      nomes
        .filter(nome =>
          nome.startsWith('ern-offline-base-') && nome !== CACHE_ERN
        )
        .map(nome => caches.delete(nome))
    );

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const pedido = event.request;
  const url = new URL(pedido.url);

  if (
    pedido.method !== 'GET' ||
    pedido.mode !== 'navigate' ||
    url.origin !== self.location.origin ||
    url.pathname === '/api' ||
    url.pathname.startsWith('/api/') ||
    url.pathname === '/auth' ||
    url.pathname.startsWith('/auth/')
  ) {
    return;
  }

  event.respondWith((async () => {
    try {
      return await fetch(pedido);
    } catch {
      const cache = await caches.open(CACHE_ERN);
      const pagina = await cache.match(PAGINA_ERN);

      if (pagina) {
        return new Response(await pagina.arrayBuffer(), {
          status: 503,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
          },
        });
      }

      return new Response('ERN: conexao indisponivel. Tente novamente.', {
        status: 503,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }
  })());
});
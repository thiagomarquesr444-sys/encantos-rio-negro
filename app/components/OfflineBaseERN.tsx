'use client';

import { useEffect } from 'react';

export default function OfflineBaseERN() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' ||
      !window.isSecureContext ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }

    let ativo = true;

    async function registrar() {
      try {
        const atual = await navigator.serviceWorker.getRegistration('/');

        if (!ativo) return;

        const trabalhadores = [
          atual?.active,
          atual?.waiting,
          atual?.installing,
        ].filter(Boolean);

        const conflito = trabalhadores.some(trabalhador =>
          trabalhador &&
          new URL(trabalhador.scriptURL).pathname !== '/ern-sw.js'
        );

        if (conflito) {
          console.error('Ja existe outro service worker neste escopo.');
          return;
        }

        await navigator.serviceWorker.register('/ern-sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });
      } catch (erro) {
        console.error('Nao foi possivel preparar a tela offline ERN.', erro);
      }
    }

    void registrar();

    return () => {
      ativo = false;
    };
  }, []);

  return null;
}
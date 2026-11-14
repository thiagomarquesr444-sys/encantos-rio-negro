'use client';

import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { aoMudarSinalEDA, iniciarMonitorSinalEDA, sinalFracoEDA } from '@/lib/conexaoEDA';
import { limparDadosOfflineEDA } from '@/lib/filaOfflineEDA';

// iPhone/iPad (inclui iPad que se apresenta como Mac).
function ehIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

// EDA_SINAL_FRACO_V1 + EDA_IOS_V1 + EDA_PWA_V3: liga uma vez, no layout.
export default function MonitorSinalEDA() {
  useEffect(() => {
    iniciarMonitorSinalEDA();

    // iPhone dá zoom sozinho ao tocar em campos com letra menor que 16px.
    // Travamos só esse zoom automático no iOS (o gesto de pinça continua
    // funcionando no iPhone). Android e computador ficam como estão.
    if (ehIOS()) {
      const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
      if (meta && !/maximum-scale/.test(meta.content)) {
        meta.content = `${meta.content}, maximum-scale=1`;
      }
      document.documentElement.setAttribute('data-eda-ios', '');
    }

    // LGPD: ao sair da conta, apaga as páginas e imagens guardadas no aparelho.
    const { data } = supabase.auth.onAuthStateChange(evento => {
      if (evento !== 'SIGNED_OUT') return;
      navigator.serviceWorker?.controller?.postMessage({ tipo: 'eda-limpar-cache' });
      void limparDadosOfflineEDA();
      try { localStorage.removeItem('eda-plano-offline-v1'); } catch { /* nada */ }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return null;
}

// Para componentes que precisam trocar algo só com sinal fraco.
// Começa sempre em "false" (sinal normal) para a página nascer igual à versão normal.
export function useSinalFracoEDA(): boolean {
  const [fraco, setFraco] = useState(false);

  useEffect(() => {
    setFraco(sinalFracoEDA());
    return aoMudarSinalEDA(setFraco);
  }, []);

  return fraco;
}

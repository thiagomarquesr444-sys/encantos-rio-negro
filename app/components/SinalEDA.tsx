'use client';

import { useEffect, useState } from 'react';

import { aoMudarSinalEDA, iniciarMonitorSinalEDA, sinalFracoEDA } from '@/lib/conexaoEDA';

// EDA_SINAL_FRACO_V1: liga o monitor de sinal uma vez, no layout.
export default function MonitorSinalEDA() {
  useEffect(() => {
    iniciarMonitorSinalEDA();
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

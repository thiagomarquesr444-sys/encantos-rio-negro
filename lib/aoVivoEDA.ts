'use client';

// EDA_AO_VIVO_V1: as telas se atualizam sozinhas quando algo muda na empresa
// (por você em outra aba, por outra pessoa da equipe ou pela própria EDA).
// O realtime só avisa "a tabela X mudou"; os dados são reconsultados com as regras de acesso normais.
import { useEffect, useRef } from 'react';

export const EVENTO_AO_VIVO_EDA = 'eda:dados';

export function useAoVivoEDA(tabelas: readonly string[], recarregar: () => void) {
  const fn = useRef(recarregar);
  fn.current = recarregar;
  const chave = tabelas.join(',');

  useEffect(() => {
    const alvo = new Set(chave.split(','));
    let tarefa: ReturnType<typeof setTimeout> | undefined;
    let pendente = false;

    const disparar = () => {
      clearTimeout(tarefa);
      tarefa = setTimeout(() => {
        if (document.hidden) { pendente = true; return; }
        pendente = false;
        fn.current();
      }, 700);
    };
    const aoMudar = (e: Event) => {
      const tabela = (e as CustomEvent<{ tabela?: string }>).detail?.tabela;
      if (tabela && alvo.has(tabela)) disparar();
    };
    const aoVoltar = () => { if (!document.hidden && pendente) disparar(); };

    window.addEventListener(EVENTO_AO_VIVO_EDA, aoMudar);
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      clearTimeout(tarefa);
      window.removeEventListener(EVENTO_AO_VIVO_EDA, aoMudar);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [chave]);
}

'use client';

// EDA_ABRIR_V1: a EDA leva a pessoa direto ao registro pedido ("abre o passeio X").
// - Vindo de outra página: chega com ?abrir=<id> e a página abre o registro assim que a lista carrega.
// - Já estando na página: a EDA dispara o evento e o registro abre sem recarregar.
import { useEffect, useRef } from 'react';

export const EVENTO_ABRIR_REGISTRO_EDA = 'eda:abrir-registro';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useAbrirRegistroEDA<T extends { id?: string | null }>(lista: T[], abrir: (item: T) => void) {
  const pendente = useRef<string | null>(null);
  const fn = useRef(abrir);
  fn.current = abrir;

  // Lê ?abrir= uma vez e limpa a URL (voltar não reabre).
  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get('abrir');
    if (id && UUID.test(id)) pendente.current = id;
    try {
      const guardado = sessionStorage.getItem('eda.abrir');
      sessionStorage.removeItem('eda.abrir');
      if (!pendente.current && guardado && UUID.test(guardado)) pendente.current = guardado;
    } catch { /* sem armazenamento */ }
    if (id) { url.searchParams.delete('abrir'); window.history.replaceState(window.history.state, '', url.toString()); }
    const ouvir = (e: Event) => {
      const alvo = (e as CustomEvent<{ id?: string }>).detail?.id;
      if (typeof alvo === 'string' && UUID.test(alvo)) { pendente.current = alvo; window.dispatchEvent(new Event('eda:abrir-registro-tentar')); }
    };
    window.addEventListener(EVENTO_ABRIR_REGISTRO_EDA, ouvir);
    return () => window.removeEventListener(EVENTO_ABRIR_REGISTRO_EDA, ouvir);
  }, []);

  const listaRef = useRef(lista);
  listaRef.current = lista;
  useEffect(() => {
    const tentar = () => {
      const id = pendente.current;
      if (!id) return;
      const item = listaRef.current.find(x => x.id === id);
      if (!item) return;
      pendente.current = null;
      fn.current(item);
    };
    tentar();
    window.addEventListener('eda:abrir-registro-tentar', tentar);
    return () => window.removeEventListener('eda:abrir-registro-tentar', tentar);
  }, [lista]);
}

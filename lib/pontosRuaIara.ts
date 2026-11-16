'use client';

// IARA_PASSEIO_RUAS_V1: pontos turísticos com Vista da rua (tabela iara_pontos_rua).
// O visitante pede "quero ver o Bumbódromo" e a Iara leva pelas ruas até lá,
// parada por parada (Google Maps Embed, sem custo por uso).

import { supabase } from '@/lib/supabase';

export type ParadaRua = { nome: string; lat: number; lng: number; heading?: number; fala?: string };
export type PontoRua = {
  id: string; municipio_ibge: string; municipio: string; nome: string; apelidos: string[];
  lat: number; lng: number; heading: number; fala: string; paradas: ParadaRua[]; status: 'rascunho' | 'publicado';
};

const CAMPOS = 'id,municipio_ibge,municipio,nome,apelidos,lat,lng,heading,fala,paradas,status';
let cache: { em: number; pontos: Promise<PontoRua[]> } | null = null;

/** Pontos publicados (cache de 10 min). */
export function listarPontosRua(): Promise<PontoRua[]> {
  if (cache && Date.now() - cache.em < 600_000) return cache.pontos;
  const pontos = (async () => {
    const { data, error } = await supabase.from('iara_pontos_rua').select(CAMPOS).eq('status', 'publicado');
    if (error) throw error;
    return (data ?? []) as PontoRua[];
  })();
  cache = { em: Date.now(), pontos };
  pontos.catch(() => { cache = null; });
  return pontos;
}

export async function buscarPontoRua(id: string): Promise<PontoRua | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await supabase.from('iara_pontos_rua').select(CAMPOS).eq('id', id).maybeSingle();
  return (data as PontoRua | null) ?? null;
}

const norm = (t: string) => ` ${t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;

/** Só dispara quando o visitante quer VER/IR ao lugar (não em qualquer menção). */
const INTENCAO = /\b(ver|veja|conhecer|mostra|mostre|mostrar|leva|leve|levar|ir ate|ir ao|ir para|passear|passeio|visitar|olhar|como e|rua|ruas|street|show me|take me|see|llevame|quiero ver)\b/;

export function acharPontoRua(texto: string, pontos: PontoRua[]): PontoRua | null {
  const n = norm(texto);
  if (!INTENCAO.test(n)) return null;
  let melhor: { p: PontoRua; tam: number } | null = null;
  for (const p of pontos) {
    for (const termo of [p.nome, ...p.apelidos]) {
      const t = norm(termo).trim();
      if (t.length >= 4 && n.includes(` ${t} `) && (!melhor || t.length > melhor.tam)) melhor = { p, tam: t.length };
    }
  }
  return melhor?.p ?? null;
}

/** Sequência do passeio: paradas pelo caminho + o ponto pedido no fim. */
export function roteiroPontoRua(p: PontoRua): ParadaRua[] {
  const paradas = Array.isArray(p.paradas) ? p.paradas.filter((x) => Number.isFinite(x?.lat) && Number.isFinite(x?.lng)) : [];
  return [...paradas, { nome: p.nome, lat: p.lat, lng: p.lng, heading: p.heading, fala: p.fala }];
}

export function urlRuaEmbed(chave: string, parada: ParadaRua, modo: 'rua' | 'satelite', idioma = 'pt-BR') {
  const q = new URLSearchParams({ key: chave, language: idioma, region: 'BR' });
  if (modo === 'satelite') {
    q.set('center', `${parada.lat},${parada.lng}`); q.set('zoom', '18'); q.set('maptype', 'satellite');
    return `https://www.google.com/maps/embed/v1/view?${q.toString()}`;
  }
  q.set('location', `${parada.lat},${parada.lng}`);
  q.set('heading', String(Math.round(parada.heading ?? 0) % 360));
  q.set('pitch', '0'); q.set('fov', '85');
  return `https://www.google.com/maps/embed/v1/streetview?${q.toString()}`;
}

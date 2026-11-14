'use client';

// IARA_FICHAS_NAS_TELAS_V1: o mesmo conhecimento que a Iara usa na conversa
// (tabela municipios_conhecimento, leitura pública) alimenta a barra de
// pesquisa, o balão de recepção e a vitrine da Descubra. Cache de 30 min.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type FestaCliente = { nome: string; quando?: string; detalhe?: string };
export type FichaCliente = {
  ibge: string; nome: string; regiao: string; resumo: string;
  festas: FestaCliente[]; culinaria: string[]; pontos: string[];
};

const CHAVE = 'eda.fichas.v1';
const VALIDADE = 30 * 60 * 1000;
let memoria: FichaCliente[] | null = null;
let pedido: Promise<FichaCliente[]> | null = null;

async function buscar(): Promise<FichaCliente[]> {
  if (memoria) return memoria;
  try {
    const bruto = sessionStorage.getItem(CHAVE);
    if (bruto) {
      const c = JSON.parse(bruto) as { t: number; f: FichaCliente[] };
      if (Date.now() - c.t < VALIDADE && Array.isArray(c.f)) { memoria = c.f; return c.f; }
    }
  } catch { /* sem cache */ }
  pedido ??= (async () => {
    const { data } = await supabase.from('municipios_conhecimento')
      .select('ibge,nome,regiao,resumo,festas,culinaria,pontos');
    const f = (Array.isArray(data) ? data : []) as FichaCliente[];
    memoria = f;
    try { sessionStorage.setItem(CHAVE, JSON.stringify({ t: Date.now(), f })); } catch { /* cheio */ }
    return f;
  })().catch(() => []);
  return pedido;
}

export function useFichasMunicipios(): FichaCliente[] {
  const [fichas, setFichas] = useState<FichaCliente[]>(memoria ?? []);
  useEffect(() => {
    let ativo = true;
    void buscar().then(f => { if (ativo) setFichas(f); });
    return () => { ativo = false; };
  }, []);
  return fichas;
}

export function fichaPorNome(fichas: FichaCliente[], nome: string): FichaCliente | null {
  const n = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return fichas.find(f => n(f.nome) === n(nome)) ?? null;
}

const sorteia = <T,>(l: T[], qtd: number) => [...l].sort(() => Math.random() - 0.5).slice(0, qtd);
const curta = (t: string) => t.replace(/\s*\(.*?\)\s*/g, ' ').split('—')[0].trim();

/** Curiosidades curtas, sempre com o município certo ao lado da festa ou do prato. */
export function curiosidadesFichas(fichas: FichaCliente[], qtd = 4): { fala: string; pedido: string; municipio: string }[] {
  const itens: { fala: string; pedido: string; municipio: string }[] = [];
  for (const f of fichas) {
    const festa = f.festas?.[0];
    if (festa?.nome && festa.quando && !/confirmar|móvel/i.test(festa.quando)) {
      itens.push({
        fala: `Em ${f.nome}, ${festa.quando}: ${curta(festa.nome)}. Bora?`,
        pedido: `Me fala do ${curta(festa.nome)} de ${f.nome}`,
        municipio: f.nome,
      });
    } else if (f.culinaria?.[0]) {
      itens.push({
        fala: `Já provou ${curta(f.culinaria[0])}? Tem em ${f.nome}.`,
        pedido: `Me fala da culinária de ${f.nome}`,
        municipio: f.nome,
      });
    }
  }
  return sorteia(itens.filter(i => i.fala.length <= 90), qtd);
}

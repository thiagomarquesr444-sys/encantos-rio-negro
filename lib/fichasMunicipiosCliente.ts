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

// IARA_AGENDA_V1: festas que estão chegando (este mês e os 3 seguintes), da mais próxima para a mais distante.
// A barra de busca anuncia essas primeiro: quem entra em novembro já ouve do festival de janeiro.
const MESES_FICHA = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export function proximasFestasFichas(fichas: FichaCliente[], qtd = 2, agora = new Date()): { fala: string; pedido: string; municipio: string }[] {
  const mesAtual = agora.getMonth();
  const itens: { fala: string; pedido: string; municipio: string; falta: number }[] = [];
  for (const f of fichas) {
    for (const festa of f.festas ?? []) {
      if (!festa?.nome || !festa.quando) continue;
      const inicio = festa.quando.trim().toLowerCase();
      const mes = MESES_FICHA.findIndex(m => inicio.startsWith(m) || inicio.startsWith(m.replace('ç', 'c')));
      if (mes < 0) continue;
      const falta = (mes - mesAtual + 12) % 12;
      if (falta > 3) continue;
      const nome = curta(festa.nome);
      const fala = falta === 0 ? `É agora em ${MESES_FICHA[mes]}: ${nome}, em ${f.nome}. Bora?`
        : falta === 1 ? `Mês que vem tem ${nome}, em ${f.nome}. Bora?`
          : `Vem aí em ${MESES_FICHA[mes]}: ${nome}, em ${f.nome}. Bora?`;
      if (fala.length > 96) continue;
      itens.push({ fala, pedido: `Me fala do ${nome} de ${f.nome}`, municipio: f.nome, falta });
    }
  }
  // Empate no mês: Barcelos (casa da plataforma) primeiro, depois ordem alfabética.
  itens.sort((a, b) => a.falta - b.falta || Number(b.municipio === 'Barcelos') - Number(a.municipio === 'Barcelos') || a.municipio.localeCompare(b.municipio));
  const vistos = new Set<string>();
  return itens.filter(i => (vistos.has(i.municipio) ? false : (vistos.add(i.municipio), true))).slice(0, qtd)
    .map(({ fala, pedido, municipio }) => ({ fala, pedido, municipio }));
}

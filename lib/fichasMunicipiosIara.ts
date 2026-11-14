// IARA_FICHAS_MUNICIPIOS_V1
// Ficha de curadoria por município (tabela municipios_conhecimento). A Iara
// recebe SÓ a ficha do município citado e um verificador impede que ela
// atribua festas e lugares de um município a outro (ex.: Peixe Ornamental,
// que é de Barcelos, em Novo Airão).

import type { DestinoIara } from './iaraDestinosERN';

export type FestaFicha = { nome: string; quando?: string; detalhe?: string };
export type FichaMunicipio = {
  ibge: string; nome: string; regiao: string; resumo: string;
  festas: FestaFicha[]; culinaria: string[]; artesanato: string[]; pontos: string[];
  natureza: string[]; lendas: string[]; cuidados: string; status: string;
};

// Lugares e cidades-base do mapa → município a que pertencem.
const MUNICIPIO_DO_DESTINO: Record<string, string> = {
  'cidade:manaus': 'Manaus', 'cidade:novo-airao': 'Novo Airão', 'cidade:barcelos': 'Barcelos',
  'cidade:santa-isabel': 'Santa Isabel do Rio Negro', 'cidade:sao-gabriel': 'São Gabriel da Cachoeira', 'cidade:parintins': 'Parintins',
  'lugar:mariua': 'Barcelos', 'lugar:serra-do-araca': 'Barcelos', 'lugar:cachoeira-eldorado': 'Barcelos',
  'lugar:anavilhanas': 'Novo Airão', 'lugar:jau': 'Novo Airão', 'lugar:encontro-das-aguas': 'Manaus',
};

export function municipioDoDestino(d: DestinoIara): string {
  return d.tipo === 'municipio' ? d.nome : MUNICIPIO_DO_DESTINO[`${d.tipo}:${d.id}`] ?? d.nome;
}

type Leitor = { from: (t: string) => { select: (c: string) => PromiseLike<{ data: unknown; error: unknown }> } };

let cache: { quando: number; fichas: FichaMunicipio[] } | null = null;

/** Todas as fichas (tabela pequena), com cache de 10 minutos no servidor. */
export async function carregarFichas(cliente: unknown): Promise<FichaMunicipio[]> {
  const db = cliente as Leitor;
  if (cache && Date.now() - cache.quando < 600_000) return cache.fichas;
  try {
    const { data } = await db.from('municipios_conhecimento')
      .select('ibge,nome,regiao,resumo,festas,culinaria,artesanato,pontos,natureza,lendas,cuidados,status');
    const fichas = Array.isArray(data) ? (data as FichaMunicipio[]) : [];
    cache = { quando: Date.now(), fichas };
    return fichas;
  } catch {
    return cache?.fichas ?? [];
  }
}

const n = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function fichaDe(fichas: FichaMunicipio[], municipio: string): FichaMunicipio | null {
  return fichas.find(f => n(f.nome) === n(municipio)) ?? null;
}

/** Texto da ficha para o prompt da Iara. */
export function textoFicha(f: FichaMunicipio): string {
  const l = (rotulo: string, itens: string[]) => (itens?.length ? `${rotulo}: ${itens.join('; ')}.` : `${rotulo}: (sem dados confirmados — não invente).`);
  const festas = f.festas?.length
    ? f.festas.map(x => `${x.nome}${x.quando ? ` (${x.quando})` : ''}${x.detalhe ? ` — ${x.detalhe}` : ''}`).join('; ')
    : '(nenhuma festa confirmada na curadoria — diga que ainda está sendo levantada)';
  return [
    `FICHA OFICIAL DE ${f.nome.toUpperCase()} (${f.regiao}): ${f.resumo}`,
    `Festas e festivais DE ${f.nome}: ${festas}.`,
    l('Culinária', f.culinaria), l('Artesanato', f.artesanato), l('Pontos turísticos', f.pontos),
    l('Floresta e áreas protegidas', f.natureza), l('Lendas', f.lendas),
    f.cuidados ? `Cuidados: ${f.cuidados}` : '',
  ].filter(Boolean).join('\n');
}

export const REGRA_FICHA = `REGRA DE OURO DOS MUNICÍPIOS: fale de festas, artesanato, culinária e pontos turísticos SOMENTE com o que está na FICHA OFICIAL do município perguntado. Cada festa pertence a um único município (ex.: Festival do Peixe Ornamental = Barcelos; Eco-Festival do Peixe-Boi = Novo Airão; Festival de Cirandas = Manacapuru; Festival Folclórico = Parintins). Nunca atribua a um município algo de outro. Se a ficha não tiver o dado, diga com simpatia que a curadoria daquele município ainda está chegando e ofereça o mapa.`;

/**
 * Verificador: a resposta cita festa de OUTRO município como se fosse do
 * município perguntado? Devolve o nome da festa intrusa (ou null).
 */
export function festaIntrusa(resposta: string, municipio: string, fichas: FichaMunicipio[]): string | null {
  const r = n(resposta);
  const alvo = n(municipio);
  const chave = (nome: string) => n(nome.replace(/\(.*?\)/g, '').split('—')[0]).trim();
  const propria = fichas.find(f => n(f.nome) === alvo);
  // Citou a festa certa do município? Então pode comparar com outras à vontade.
  if (propria?.festas?.some(x => r.includes(chave(x.nome)))) return null;
  for (const f of fichas) {
    if (n(f.nome) === alvo) continue;
    for (const festa of f.festas ?? []) {
      const k = chave(festa.nome);
      if (k.length >= 12 && r.includes(k)) return festa.nome;
    }
  }
  return null;
}

/** Resposta segura montada só com a ficha (último recurso do verificador). */
export function respostaDaFicha(f: FichaMunicipio): string {
  if (f.festas?.length) {
    const x = f.festas[0];
    return `Em ${f.nome}, a festa mais conhecida é o ${x.nome}${x.quando ? `, em ${x.quando}` : ''}${x.detalhe ? ` — ${x.detalhe}` : ''}. Quer que eu te leve até ${f.nome} no mapa?`;
  }
  return `A curadoria das festas de ${f.nome} ainda está chegando. ${f.resumo} Quer conhecer ${f.nome} no mapa?`;
}

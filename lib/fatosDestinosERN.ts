// ERN_FATOS_DESTINOS_V1
// Regiões do explorador e fatos rápidos por cidade-base (como chegar,
// melhor época, perfil e tempo sugerido). São orientações gerais para
// inspirar o planejamento: condições do rio, voos e barcos mudam e devem
// ser confirmados com operadores locais.

export type ZonaERN = 'all' | 'alto' | 'medio' | 'baixo' | 'amazonas';
export type CidadeBaseERN =
  | 'manaus' | 'novo-airao' | 'barcelos' | 'santa-isabel' | 'sao-gabriel' | 'parintins';

type L = 'PT' | 'EN' | 'ES';

export const ZONA_DA_CIDADE: Record<CidadeBaseERN, Exclude<ZonaERN, 'all'>> = {
  'sao-gabriel': 'alto',
  'santa-isabel': 'alto',
  barcelos: 'medio',
  'novo-airao': 'baixo',
  manaus: 'amazonas',
  parintins: 'amazonas',
};

export const ROTULOS_ZONA: Record<L, Record<ZonaERN, string>> = {
  PT: { all: 'Todos', alto: 'Alto', medio: 'Médio', baixo: 'Baixo', amazonas: 'Manaus e Parintins' },
  EN: { all: 'All', alto: 'Upper', medio: 'Middle', baixo: 'Lower', amazonas: 'Manaus & Parintins' },
  ES: { all: 'Todos', alto: 'Alto', medio: 'Medio', baixo: 'Bajo', amazonas: 'Manaos y Parintins' },
};

export type FatoRapido = { icone: string; rotulo: string; valor: string };

const ROTULOS_FATOS: Record<L, [string, string, string, string]> = {
  PT: ['Como chegar', 'Melhor época', 'Ideal para', 'Tempo sugerido'],
  EN: ['Getting there', 'Best season', 'Ideal for', 'Suggested stay'],
  ES: ['Cómo llegar', 'Mejor época', 'Ideal para', 'Tiempo sugerido'],
};

const VALORES: Record<CidadeBaseERN, Record<L, [string, string, string, string]>> = {
  manaus: {
    PT: ['Aeroporto internacional', 'O ano todo', 'Rios e cultura', '2 a 3 dias'],
    EN: ['International airport', 'All year round', 'Rivers and culture', '2 to 3 days'],
    ES: ['Aeropuerto internacional', 'Todo el año', 'Ríos y cultura', '2 a 3 días'],
  },
  'novo-airao': {
    PT: ['Estrada desde Manaus', 'O ano todo', 'Ilhas e botos', '2 a 3 dias'],
    EN: ['Road from Manaus', 'All year round', 'Islands and dolphins', '2 to 3 days'],
    ES: ['Carretera desde Manaos', 'Todo el año', 'Islas y botos', '2 a 3 días'],
  },
  barcelos: {
    PT: ['Voo regional ou barco', 'Vazante · set. a mar.', 'Pesca e natureza', '4 a 7 dias'],
    EN: ['Regional flight or boat', 'Low water · Sep to Mar', 'Fishing and nature', '4 to 7 days'],
    ES: ['Vuelo regional o barco', 'Estiaje · sep. a mar.', 'Pesca y naturaleza', '4 a 7 días'],
  },
  'santa-isabel': {
    PT: ['Barco ou voo regional', 'Vazante · praias', 'Rio e cultura', '3 a 5 dias'],
    EN: ['Boat or regional flight', 'Low water · beaches', 'River and culture', '3 to 5 days'],
    ES: ['Barco o vuelo regional', 'Estiaje · playas', 'Río y cultura', '3 a 5 días'],
  },
  'sao-gabriel': {
    PT: ['Voo regional desde Manaus', 'Seca · serras e praias', 'Serras e povos', '4 a 6 dias'],
    EN: ['Regional flight from Manaus', 'Dry season · peaks', 'Mountains and peoples', '4 to 6 days'],
    ES: ['Vuelo regional desde Manaos', 'Seca · sierras y playas', 'Sierras y pueblos', '4 a 6 días'],
  },
  parintins: {
    PT: ['Voo ou barco desde Manaus', 'Festival · fim de junho', 'Cultura e festa', '3 a 4 dias'],
    EN: ['Flight or boat from Manaus', 'Festival · late June', 'Culture and celebration', '3 to 4 days'],
    ES: ['Vuelo o barco desde Manaos', 'Festival · fin de junio', 'Cultura y fiesta', '3 a 4 días'],
  },
};

const ICONES = ['✈', '☀', '◎', '⏱'];

export function fatosDaCidade(cidade: CidadeBaseERN, idioma: L): FatoRapido[] {
  return ROTULOS_FATOS[idioma].map((rotulo, i) => ({
    icone: ICONES[i],
    rotulo,
    valor: VALORES[cidade][idioma][i],
  }));
}

// Liga a cidade-base ao texto de história em lib/historiasMunicipiosERN.ts.
export const HISTORIA_DA_CIDADE: Partial<Record<CidadeBaseERN, string>> = {
  'sao-gabriel': 'sao-gabriel-da-cachoeira',
  'santa-isabel': 'santa-isabel-do-rio-negro',
  barcelos: 'barcelos',
  'novo-airao': 'novo-airao',
  manaus: 'manaus',
};

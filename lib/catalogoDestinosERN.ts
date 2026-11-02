import type { Idioma } from '@/lib/i18n/types';
import {
  destinosTranslations,
  type DestinosTranslation,
} from '@/lib/i18n/destinos';

// ERN_CATALOGO_DESTINOS_V1
// Catálogo único dos destinos exibidos no portal público.
// Os destinos já existentes reaproveitam os textos traduzidos de
// lib/i18n/destinos.ts e abrem no mapa (/destinos?lugar=<id>).
// Os destinos "em curadoria" ainda não têm fotos e textos próprios
// aprovados: aparecem com selo e sem promessa de roteiro.

export type RegiaoERN = 'medio' | 'baixo' | 'alto';
export type InteresseERN = 'aguas' | 'natureza' | 'cultura' | 'pesca';

type DestinoExistenteId =
  keyof DestinosTranslation['destinations'];

type TextoDestino = {
  titulo: string;
  local: string;
  descricao: string;
};

type DestinoBase = {
  id: string;
  regiao: RegiaoERN;
  interesses: InteresseERN[];
  imagem: string | null;
};

type DestinoMapeado = DestinoBase & {
  tipo: 'mapa';
  id: DestinoExistenteId;
};

type DestinoCuradoria = DestinoBase & {
  tipo: 'curadoria';
  textos: Record<Idioma, TextoDestino>;
};

export type DestinoCatalogo = DestinoMapeado | DestinoCuradoria;

export type DestinoExibicao = TextoDestino & {
  id: string;
  regiao: RegiaoERN;
  interesses: InteresseERN[];
  imagem: string | null;
  curadoria: boolean;
  href: string;
};

export const CATALOGO_DESTINOS_ERN: DestinoCatalogo[] = [
  // Médio Rio Negro — Barcelos
  { tipo: 'mapa', id: 'barcelos', regiao: 'medio', interesses: ['aguas', 'cultura', 'pesca'], imagem: '/images/regiao/matriz.png.jpeg' },
  { tipo: 'mapa', id: 'mariua', regiao: 'medio', interesses: ['aguas', 'natureza', 'pesca'], imagem: '/images/destinos/mariua-capa.jpg' },
  { tipo: 'mapa', id: 'serra-do-araca', regiao: 'medio', interesses: ['natureza'], imagem: '/images/regiao/serra.png.jpeg' },
  { tipo: 'mapa', id: 'cachoeira-eldorado', regiao: 'medio', interesses: ['natureza'], imagem: '/images/destinos/serra-araca-card.jpeg' },
  { tipo: 'mapa', id: 'praia-grande', regiao: 'medio', interesses: ['aguas'], imagem: '/images/regiao/barcelospraia.png.jpeg' },
  { tipo: 'mapa', id: 'festival-peixe-ornamental', regiao: 'medio', interesses: ['cultura'], imagem: '/images/cultura/barcelosfestival.jpg' },

  // Baixo Rio Negro — Novo Airão e Manaus
  { tipo: 'mapa', id: 'anavilhanas', regiao: 'baixo', interesses: ['aguas', 'natureza'], imagem: '/images/destinos/anavilhanas/capa.jpg' },
  { tipo: 'mapa', id: 'novo-airao', regiao: 'baixo', interesses: ['aguas', 'natureza', 'cultura'], imagem: '/images/destinos/novo-airao/capa.jpg' },
  { tipo: 'mapa', id: 'jau', regiao: 'baixo', interesses: ['natureza'], imagem: '/images/regiao/ern-amazonia.jpg' },
  { tipo: 'mapa', id: 'festival-peixe-boi', regiao: 'baixo', interesses: ['cultura'], imagem: '/images/cultura/festivaldopeixeboi.jpg' },
  {
    tipo: 'curadoria',
    id: 'encontro-das-aguas',
    regiao: 'baixo',
    interesses: ['aguas'],
    imagem: null,
    textos: {
      PT: { titulo: 'Encontro das Águas', local: 'Manaus', descricao: 'Onde o Rio Negro encontra o Solimões e as duas águas correm lado a lado antes de se misturar.' },
      EN: { titulo: 'Meeting of the Waters', local: 'Manaus', descricao: 'Where the Rio Negro meets the Solimões and the two waters run side by side before mixing.' },
      ES: { titulo: 'Encuentro de las Aguas', local: 'Manaos', descricao: 'Donde el Río Negro se encuentra con el Solimões y las dos aguas corren lado a lado antes de mezclarse.' },
    },
  },

  // Alto Rio Negro
  {
    tipo: 'curadoria',
    id: 'santa-isabel-do-rio-negro',
    regiao: 'alto',
    interesses: ['aguas', 'cultura'],
    imagem: null,
    textos: {
      PT: { titulo: 'Santa Isabel do Rio Negro', local: 'Alto Rio Negro', descricao: 'Entre Barcelos e São Gabriel: praias de vazante, comunidades ribeirinhas e o ritmo do rio.' },
      EN: { titulo: 'Santa Isabel do Rio Negro', local: 'Upper Rio Negro', descricao: 'Between Barcelos and São Gabriel: dry-season beaches, riverside communities and the rhythm of the river.' },
      ES: { titulo: 'Santa Isabel do Rio Negro', local: 'Alto Río Negro', descricao: 'Entre Barcelos y São Gabriel: playas de estiaje, comunidades ribereñas y el ritmo del río.' },
    },
  },
  {
    tipo: 'curadoria',
    id: 'sao-gabriel-da-cachoeira',
    regiao: 'alto',
    interesses: ['natureza', 'cultura'],
    imagem: null,
    textos: {
      PT: { titulo: 'São Gabriel da Cachoeira', local: 'Alto Rio Negro', descricao: 'Corredeiras, serras e a cultura de muitos povos indígenas no extremo noroeste do Amazonas.' },
      EN: { titulo: 'São Gabriel da Cachoeira', local: 'Upper Rio Negro', descricao: 'Rapids, mountains and the culture of many Indigenous peoples in the far northwest of Amazonas.' },
      ES: { titulo: 'São Gabriel da Cachoeira', local: 'Alto Río Negro', descricao: 'Rápidos, sierras y la cultura de muchos pueblos indígenas en el extremo noroeste de Amazonas.' },
    },
  },
  {
    tipo: 'curadoria',
    id: 'pico-da-neblina',
    regiao: 'alto',
    interesses: ['natureza'],
    imagem: null,
    textos: {
      PT: { titulo: 'Pico da Neblina', local: 'São Gabriel da Cachoeira', descricao: 'O ponto mais alto do Brasil, em território indígena, com visitação organizada junto às comunidades.' },
      EN: { titulo: 'Pico da Neblina', local: 'São Gabriel da Cachoeira', descricao: 'The highest point in Brazil, on Indigenous land, with visits organized together with local communities.' },
      ES: { titulo: 'Pico da Neblina', local: 'São Gabriel da Cachoeira', descricao: 'El punto más alto de Brasil, en territorio indígena, con visitas organizadas junto a las comunidades.' },
    },
  },
];

export function destinosParaExibicao(idioma: Idioma): DestinoExibicao[] {
  const traducoes =
    destinosTranslations[idioma] as DestinosTranslation;

  return CATALOGO_DESTINOS_ERN.map((destino) => {
    if (destino.tipo === 'mapa') {
      const texto = traducoes.destinations[destino.id];

      return {
        id: destino.id,
        regiao: destino.regiao,
        interesses: destino.interesses,
        imagem: destino.imagem,
        curadoria: false,
        titulo: texto.titulo,
        local: texto.local,
        descricao: texto.descricao,
        href: `/destinos?lugar=${encodeURIComponent(destino.id)}`,
      };
    }

    const texto = destino.textos[idioma];

    return {
      id: destino.id,
      regiao: destino.regiao,
      interesses: destino.interesses,
      imagem: destino.imagem,
      curadoria: true,
      titulo: texto.titulo,
      local: texto.local,
      descricao: texto.descricao,
      href: '/destinos',
    };
  });
}

export function normalizarBuscaERN(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

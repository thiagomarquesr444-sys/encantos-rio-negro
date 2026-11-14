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

// EDA_DESCUBRA_AMAZONAS_V1: o catálogo cobre o Amazonas inteiro. As bases do
// nicho são cultura e artesanato, culinária, crendices e floresta preservada.
export type RegiaoERN = 'medio' | 'baixo' | 'alto' | 'solimoes' | 'baixo-amazonas' | 'metropolitana' | 'estado';
export type MacroRegiaoERN = 'rionegro' | 'solimoes' | 'baixo-amazonas' | 'metropolitana';
export type InteresseERN = 'aguas' | 'natureza' | 'cultura' | 'culinaria' | 'lendas' | 'pesca';

export function macroRegiaoERN(r: RegiaoERN): MacroRegiaoERN | null {
  if (r === 'medio' || r === 'baixo' || r === 'alto') return 'rionegro';
  if (r === 'estado') return null;
  return r;
}

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
  /** Nome do município (IBGE) para o filtro; vazio = vale para o estado todo. */
  municipio: string;
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
  /** Parâmetro do mapa (tipo:id, ver iaraDestinosERN) quando já dá para abrir no mapa. */
  mapa?: string;
};

export type DestinoCatalogo = DestinoMapeado | DestinoCuradoria;

export type DestinoExibicao = TextoDestino & {
  id: string;
  regiao: RegiaoERN;
  municipio: string;
  interesses: InteresseERN[];
  imagem: string | null;
  curadoria: boolean;
  href: string;
};

export const CATALOGO_DESTINOS_ERN: DestinoCatalogo[] = [
  // Médio Rio Negro — Barcelos
  { tipo: 'mapa', id: 'barcelos', municipio: 'Barcelos', regiao: 'medio', interesses: ['aguas', 'cultura', 'pesca'], imagem: '/images/regiao/matriz.png.jpeg' },
  { tipo: 'mapa', id: 'mariua', municipio: 'Barcelos', regiao: 'medio', interesses: ['aguas', 'natureza', 'pesca'], imagem: '/images/destinos/mariua-capa.jpg' },
  { tipo: 'mapa', id: 'serra-do-araca', municipio: 'Barcelos', regiao: 'medio', interesses: ['natureza'], imagem: '/images/regiao/serra.png.jpeg' },
  { tipo: 'mapa', id: 'cachoeira-eldorado', municipio: 'Barcelos', regiao: 'medio', interesses: ['natureza'], imagem: '/images/destinos/serra-araca-card.jpeg' },
  { tipo: 'mapa', id: 'praia-grande', municipio: 'Barcelos', regiao: 'medio', interesses: ['aguas'], imagem: '/images/regiao/barcelospraia.png.jpeg' },
  { tipo: 'mapa', id: 'festival-peixe-ornamental', municipio: 'Barcelos', regiao: 'medio', interesses: ['cultura'], imagem: '/images/cultura/barcelosfestival.jpg' },

  // Baixo Rio Negro — Novo Airão e Manaus
  { tipo: 'mapa', id: 'anavilhanas', municipio: 'Novo Airão', regiao: 'baixo', interesses: ['aguas', 'natureza'], imagem: '/images/destinos/anavilhanas/capa.jpg' },
  { tipo: 'mapa', id: 'novo-airao', municipio: 'Novo Airão', regiao: 'baixo', interesses: ['aguas', 'natureza', 'cultura'], imagem: '/images/destinos/novo-airao/capa.jpg' },
  { tipo: 'mapa', id: 'jau', municipio: 'Novo Airão', regiao: 'baixo', interesses: ['natureza'], imagem: '/images/regiao/ern-amazonia.jpg' },
  { tipo: 'mapa', id: 'festival-peixe-boi', municipio: 'Novo Airão', regiao: 'baixo', interesses: ['cultura'], imagem: '/images/cultura/festivaldopeixeboi.jpg' },
  { tipo: 'mapa', id: 'encontro-das-aguas', municipio: 'Manaus', regiao: 'metropolitana', interesses: ['aguas'], imagem: '/images/fundo/encontro-das-aguas-celular.jpg' },

  // Alto Rio Negro
  { tipo: 'mapa', id: 'santa-isabel-do-rio-negro', municipio: 'Santa Isabel do Rio Negro', regiao: 'alto', interesses: ['aguas', 'cultura'], imagem: '/images/destinos/santa-isabel/santa-isabel-praca.jpg' },
  { tipo: 'mapa', id: 'sao-gabriel-da-cachoeira', municipio: 'São Gabriel da Cachoeira', regiao: 'alto', interesses: ['aguas', 'natureza', 'cultura', 'lendas'], imagem: '/images/destinos/sao-gabriel/sao-gabriel-por-do-sol.jpg' },
  {
    tipo: 'curadoria',
    id: 'pico-da-neblina',
    municipio: 'São Gabriel da Cachoeira',
    regiao: 'alto',
    interesses: ['natureza'],
    imagem: null,
    textos: {
      PT: { titulo: 'Pico da Neblina', local: 'São Gabriel da Cachoeira', descricao: 'O ponto mais alto do Brasil, em território indígena, com visitação organizada junto às comunidades.' },
      EN: { titulo: 'Pico da Neblina', local: 'São Gabriel da Cachoeira', descricao: 'The highest point in Brazil, on Indigenous land, with visits organized together with local communities.' },
      ES: { titulo: 'Pico da Neblina', local: 'São Gabriel da Cachoeira', descricao: 'El punto más alto de Brasil, en territorio indígena, con visitas organizadas junto a las comunidades.' },
    },
  },
  // EDA_DESCUBRA_AMAZONAS_V1 — o restante do Amazonas (textos curtos, a revisar
  // com pesquisa local antes de ganhar página própria no mapa).
  {
    tipo: 'curadoria', id: 'piacava-barcelos', municipio: 'Barcelos', regiao: 'medio', interesses: ['cultura'], imagem: '/images/regiao/viagembarco.png.jpeg', mapa: 'cidade:barcelos',
    textos: {
      PT: { titulo: 'A fibra da piaçava', local: 'Barcelos', descricao: 'Colhida nos igarapés do Médio Rio Negro, a piaçava vira vassoura, cesto e artesanato nas mãos dos piaçabeiros.' },
      EN: { titulo: 'Piassava fiber', local: 'Barcelos', descricao: 'Harvested along the streams of the Middle Rio Negro, piassava becomes brooms, baskets and handicrafts.' },
      ES: { titulo: 'La fibra de piasava', local: 'Barcelos', descricao: 'Cosechada en los arroyos del Medio Río Negro, la piasava se convierte en escobas, cestos y artesanía.' },
    },
  },
  {
    tipo: 'curadoria', id: 'lendas-da-amazonia', municipio: '', regiao: 'estado', interesses: ['lendas', 'cultura'], imagem: '/images/fauna/boto-ern.png',
    textos: {
      PT: { titulo: 'Crendices e lendas', local: 'Todo o Amazonas', descricao: 'Boto, Iara, Curupira, Mapinguari e Cobra Grande: as histórias que os mais velhos contam na beira do rio. Peça para a Iara contar uma.' },
      EN: { titulo: 'Beliefs and legends', local: 'All of Amazonas', descricao: 'The pink river dolphin, Iara, Curupira, Mapinguari and the Great Snake: stories elders tell on the riverbank. Ask Iara to tell you one.' },
      ES: { titulo: 'Creencias y leyendas', local: 'Todo Amazonas', descricao: 'Boto, Iara, Curupira, Mapinguari y la Cobra Grande: historias que cuentan los mayores a orillas del río. Pídele a Iara que te cuente una.' },
    },
  },
  {
    tipo: 'curadoria', id: 'sabores-de-manaus', municipio: 'Manaus', regiao: 'metropolitana', interesses: ['culinaria', 'cultura'], imagem: '/images/regiao/cafedaamazonia.png.jpeg', mapa: 'cidade:manaus',
    textos: {
      PT: { titulo: 'Sabores de Manaus', local: 'Manaus', descricao: 'Tacacá no fim da tarde, x-caboquinho com tucumã, tambaqui na brasa e o Mercado Adolpho Lisboa à beira do Rio Negro.' },
      EN: { titulo: 'Flavors of Manaus', local: 'Manaus', descricao: 'Tacacá in the late afternoon, x-caboquinho with tucumã, grilled tambaqui and the Adolpho Lisboa Market by the Rio Negro.' },
      ES: { titulo: 'Sabores de Manaos', local: 'Manaos', descricao: 'Tacacá al final de la tarde, x-caboquinho con tucumã, tambaquí a la brasa y el Mercado Adolpho Lisboa a orillas del Río Negro.' },
    },
  },
  {
    tipo: 'curadoria', id: 'cirandas-manacapuru', municipio: 'Manacapuru', regiao: 'metropolitana', interesses: ['cultura'], imagem: '/images/cultura/cirandasmanacapuru.jpg', mapa: 'municipio:1302504',
    textos: {
      PT: { titulo: 'Festival de Cirandas', local: 'Manacapuru', descricao: 'Flor Matizada, Guerreiros Mura e Tradicional disputam com coreografia, figurino e toadas no festival mais animado do Solimões.' },
      EN: { titulo: 'Ciranda Festival', local: 'Manacapuru', descricao: 'Flor Matizada, Guerreiros Mura and Tradicional compete with choreography, costumes and songs on the Solimões.' },
      ES: { titulo: 'Festival de Cirandas', local: 'Manacapuru', descricao: 'Flor Matizada, Guerreiros Mura y Tradicional compiten con coreografía, vestuario y canciones en el Solimões.' },
    },
  },
  {
    tipo: 'curadoria', id: 'presidente-figueiredo', municipio: 'Presidente Figueiredo', regiao: 'metropolitana', interesses: ['natureza', 'aguas'], imagem: '/images/regiao/ern-amazonia.jpg', mapa: 'municipio:1303536',
    textos: {
      PT: { titulo: 'Terra das cachoeiras', local: 'Presidente Figueiredo', descricao: 'Mais de cem cachoeiras, cavernas e trilhas de floresta preservada, a pouco mais de 100 km de Manaus.' },
      EN: { titulo: 'Land of waterfalls', local: 'Presidente Figueiredo', descricao: 'Over a hundred waterfalls, caves and trails in preserved forest, just over 100 km from Manaus.' },
      ES: { titulo: 'Tierra de cascadas', local: 'Presidente Figueiredo', descricao: 'Más de cien cascadas, cuevas y senderos en selva preservada, a poco más de 100 km de Manaos.' },
    },
  },
  {
    tipo: 'curadoria', id: 'festival-parintins', municipio: 'Parintins', regiao: 'baixo-amazonas', interesses: ['cultura', 'lendas'], imagem: null, mapa: 'cidade:parintins',
    textos: {
      PT: { titulo: 'Festival de Parintins', local: 'Parintins', descricao: 'Garantido e Caprichoso no Bumbódromo, em junho: toadas, alegorias gigantes e as lendas da floresta contadas pelos bois.' },
      EN: { titulo: 'Parintins Festival', local: 'Parintins', descricao: 'Garantido and Caprichoso at the Bumbódromo in June: songs, giant floats and forest legends told by the bulls.' },
      ES: { titulo: 'Festival de Parintins', local: 'Parintins', descricao: 'Garantido y Caprichoso en el Bumbódromo, en junio: canciones, alegorías gigantes y leyendas de la selva.' },
    },
  },
  {
    tipo: 'curadoria', id: 'guarana-maues', municipio: 'Maués', regiao: 'baixo-amazonas', interesses: ['culinaria', 'cultura'], imagem: null, mapa: 'municipio:1302900',
    textos: {
      PT: { titulo: 'Terra do guaraná', local: 'Maués', descricao: 'Berço do guaraná, domesticado pelo povo Sateré-Mawé, com praias de rio e a tradicional Festa do Guaraná.' },
      EN: { titulo: 'Land of guaraná', local: 'Maués', descricao: 'Birthplace of guaraná, domesticated by the Sateré-Mawé people, with river beaches and the Guaraná Festival.' },
      ES: { titulo: 'Tierra del guaraná', local: 'Maués', descricao: 'Cuna del guaraná, domesticado por el pueblo Sateré-Mawé, con playas de río y la Fiesta del Guaraná.' },
    },
  },
  {
    tipo: 'curadoria', id: 'mamiraua', municipio: 'Tefé', regiao: 'solimoes', interesses: ['natureza', 'aguas'], imagem: '/images/regiao/arara.jpg.jpeg', mapa: 'municipio:1304203',
    textos: {
      PT: { titulo: 'Reserva Mamirauá', local: 'Tefé · Médio Solimões', descricao: 'Floresta de várzea que alaga meses por ano, macaco-uacari-branco, botos e o manejo comunitário do pirarucu.' },
      EN: { titulo: 'Mamirauá Reserve', local: 'Tefé · Middle Solimões', descricao: 'Flooded várzea forest, the white uakari monkey, river dolphins and community-managed pirarucu fishing.' },
      ES: { titulo: 'Reserva Mamirauá', local: 'Tefé · Medio Solimões', descricao: 'Bosque de várzea inundado, el mono uacarí blanco, delfines de río y el manejo comunitario del pirarucú.' },
    },
  },
  {
    tipo: 'curadoria', id: 'farinha-uarini', municipio: 'Uarini', regiao: 'solimoes', interesses: ['culinaria'], imagem: null, mapa: 'municipio:1304260',
    textos: {
      PT: { titulo: 'Farinha de Uarini', local: 'Uarini', descricao: 'A farinha ovinha, amarela e crocante, que acompanha o peixe frito e viaja na bagagem de quem passa pelo Solimões.' },
      EN: { titulo: 'Uarini flour', local: 'Uarini', descricao: 'The crunchy, golden "ovinha" cassava flour served with fried fish and carried home by every Solimões traveler.' },
      ES: { titulo: 'Harina de Uarini', local: 'Uarini', descricao: 'La harina de yuca "ovinha", dorada y crujiente, que acompaña el pescado frito en el Solimões.' },
    },
  },
  {
    tipo: 'curadoria', id: 'triplice-fronteira', municipio: 'Tabatinga', regiao: 'solimoes', interesses: ['cultura', 'aguas'], imagem: null, mapa: 'municipio:1304062',
    textos: {
      PT: { titulo: 'Tríplice fronteira', local: 'Tabatinga · Alto Solimões', descricao: 'Brasil, Colômbia e Peru se encontram no Alto Solimões, terra do povo Ticuna, de sua tecelagem e de suas máscaras rituais.' },
      EN: { titulo: 'Triple border', local: 'Tabatinga · Upper Solimões', descricao: 'Brazil, Colombia and Peru meet on the Upper Solimões, land of the Ticuna people, their weaving and ritual masks.' },
      ES: { titulo: 'Triple frontera', local: 'Tabatinga · Alto Solimões', descricao: 'Brasil, Colombia y Perú se encuentran en el Alto Solimões, tierra del pueblo Ticuna, su tejido y sus máscaras rituales.' },
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
        municipio: destino.municipio,
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
      municipio: destino.municipio,
      interesses: destino.interesses,
      imagem: destino.imagem,
      curadoria: !destino.mapa,
      titulo: texto.titulo,
      local: texto.local,
      descricao: texto.descricao,
      href: destino.mapa ? `/destinos?iara=${encodeURIComponent(destino.mapa)}` : '/destinos',
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

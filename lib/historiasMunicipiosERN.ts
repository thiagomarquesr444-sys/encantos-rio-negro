import type { Idioma } from '@/lib/i18n/types';

// ERN_HISTORIAS_MUNICIPIOS_V1
// Histórias dos municípios do Rio Negro para a página Experiências.
// Fontes consultadas (nov/2026): Portal Amazônia (Amazônia de A a Z,
// com base nas prefeituras), IBGE Cidades/Biblioteca e legislação municipal
// de São Gabriel da Cachoeira (2002). Revisar com pesquisas locais antes de
// ampliar o texto.

export type RegiaoHistoria = 'alto' | 'medio' | 'baixo';

type Texto = { titulo: string; texto: string; fatos: string[] };

export type HistoriaMunicipio = {
  id: string;
  nome: string;
  regiao: RegiaoHistoria;
  imagem: string;
  textos: Record<Idioma, Texto>;
};

export const HISTORIAS_MUNICIPIOS: HistoriaMunicipio[] = [
  {
    id: 'sao-gabriel-da-cachoeira',
    nome: 'São Gabriel da Cachoeira',
    regiao: 'alto',
    imagem: '/images/destinos/sao-gabriel/sao-gabriel-aerea.jpg',
    textos: {
      PT: {
        titulo: 'A cidade mais indígena do Brasil',
        texto: 'A povoação nasceu em torno do Forte de São Gabriel, erguido por volta de 1760 nas cachoeiras do alto Rio Negro. Hoje cerca de 23 povos vivem no município, que tem o nheengatu, o tukano e o baniwa como línguas cooficiais desde 2002.',
        fatos: ['Forte de São Gabriel · c. 1760', 'Cerca de 23 povos indígenas', 'Pico da Neblina · 2.994 m'],
      },
      EN: {
        titulo: 'Brazil’s most Indigenous city',
        texto: 'The town grew around the São Gabriel Fort, built around 1760 by the rapids of the upper Rio Negro. Today about 23 peoples live in the municipality, where Nheengatu, Tukano and Baniwa have been co-official languages since 2002.',
        fatos: ['São Gabriel Fort · c. 1760', 'About 23 Indigenous peoples', 'Pico da Neblina · 2,994 m'],
      },
      ES: {
        titulo: 'La ciudad más indígena de Brasil',
        texto: 'El pueblo nació alrededor del Fuerte de São Gabriel, levantado hacia 1760 junto a los rápidos del alto Río Negro. Hoy unos 23 pueblos viven en el municipio, donde el nheengatu, el tukano y el baniwa son lenguas cooficiales desde 2002.',
        fatos: ['Fuerte de São Gabriel · c. 1760', 'Unos 23 pueblos indígenas', 'Pico da Neblina · 2.994 m'],
      },
    },
  },
  {
    id: 'santa-isabel-do-rio-negro',
    nome: 'Santa Isabel do Rio Negro',
    regiao: 'alto',
    imagem: '/images/destinos/santa-isabel/santa-isabel-aerea.jpg',
    textos: {
      PT: {
        titulo: 'Entre Barcelos e São Gabriel',
        texto: 'A antiga povoação da Ilha Grande, na margem direita do Rio Negro, recebeu o nome de Santa Isabel de Portugal. O município foi criado em 1956 e guarda em seu território parte do Pico da Neblina, o ponto mais alto do Brasil.',
        fatos: ['Município desde 1956', 'Parte do Pico da Neblina', 'Festival de quadrilhas juninas'],
      },
      EN: {
        titulo: 'Between Barcelos and São Gabriel',
        texto: 'The old Ilha Grande settlement, on the right bank of the Rio Negro, was named after Saint Elizabeth of Portugal. The municipality was created in 1956 and includes part of Pico da Neblina, Brazil’s highest point.',
        fatos: ['Municipality since 1956', 'Part of Pico da Neblina', 'June quadrilha festival'],
      },
      ES: {
        titulo: 'Entre Barcelos y São Gabriel',
        texto: 'La antigua población de Ilha Grande, en la margen derecha del Río Negro, recibió el nombre de Santa Isabel de Portugal. El municipio fue creado en 1956 y conserva parte del Pico da Neblina, el punto más alto de Brasil.',
        fatos: ['Municipio desde 1956', 'Parte del Pico da Neblina', 'Festival de cuadrillas juninas'],
      },
    },
  },
  {
    id: 'barcelos',
    nome: 'Barcelos',
    regiao: 'medio',
    imagem: '/images/regiao/barceloscapital.jpg.jpeg',
    textos: {
      PT: {
        titulo: 'A primeira capital do Amazonas',
        texto: 'Nasceu em 1728 como a Missão de Mariuá, fundada pelo frei carmelita Matias de São Boaventura em aldeia do povo Manau. Em 1758 virou a Vila de Barcelos e sede da Capitania de São José do Rio Negro, até a transferência definitiva para Manaus em 1808.',
        fatos: ['Missão de Mariuá · 1728', 'Capital da capitania · 1758', 'Arquipélago de Mariuá'],
      },
      EN: {
        titulo: 'The first capital of Amazonas',
        texto: 'It began in 1728 as the Mariuá Mission, founded by Carmelite friar Matias de São Boaventura in a village of the Manau people. In 1758 it became the town of Barcelos and seat of the Captaincy of São José do Rio Negro, until the seat moved to Manaus for good in 1808.',
        fatos: ['Mariuá Mission · 1728', 'Captaincy capital · 1758', 'Mariuá archipelago'],
      },
      ES: {
        titulo: 'La primera capital de Amazonas',
        texto: 'Nació en 1728 como la Misión de Mariuá, fundada por el fraile carmelita Matias de São Boaventura en una aldea del pueblo Manau. En 1758 se convirtió en la Villa de Barcelos y sede de la Capitanía de São José do Rio Negro, hasta el traslado definitivo a Manaos en 1808.',
        fatos: ['Misión de Mariuá · 1728', 'Capital de la capitanía · 1758', 'Archipiélago de Mariuá'],
      },
    },
  },
  {
    id: 'novo-airao',
    nome: 'Novo Airão',
    regiao: 'baixo',
    imagem: '/images/destinos/novo-airao/capa.jpg',
    textos: {
      PT: {
        titulo: 'Das ruínas de Airão Velho às Anavilhanas',
        texto: 'Sua origem está nas missões do século XVII no rio Jaú, como Santo Elias do Jaú, um dos primeiros núcleos coloniais do atual Amazonas. A antiga sede, Airão Velho, hoje é uma cidade fantasma. A nova cidade fica diante das Anavilhanas e é conhecida pelos botos e pela fabricação de barcos.',
        fatos: ['Missões do século XVII', 'Airão Velho, cidade fantasma', 'Parques Anavilhanas e Jaú'],
      },
      EN: {
        titulo: 'From the ruins of Velho Airão to Anavilhanas',
        texto: 'Its origins lie in 17th-century missions on the Jaú River, such as Santo Elias do Jaú, one of the first colonial settlements in today’s Amazonas. The old seat, Velho Airão, is now a ghost town. The new town faces the Anavilhanas and is known for river dolphins and boatbuilding.',
        fatos: ['17th-century missions', 'Velho Airão ghost town', 'Anavilhanas and Jaú parks'],
      },
      ES: {
        titulo: 'De las ruinas de Airão Velho a Anavilhanas',
        texto: 'Su origen está en las misiones del siglo XVII en el río Jaú, como Santo Elias do Jaú, uno de los primeros núcleos coloniales del actual Amazonas. La antigua sede, Airão Velho, hoy es un pueblo fantasma. La nueva ciudad está frente a Anavilhanas y es conocida por los botos y la construcción de barcos.',
        fatos: ['Misiones del siglo XVII', 'Airão Velho, pueblo fantasma', 'Parques Anavilhanas y Jaú'],
      },
    },
  },
  {
    id: 'manaus',
    nome: 'Manaus',
    regiao: 'baixo',
    imagem: '/images/fundo/encontro-das-aguas-celular.jpg',
    textos: {
      PT: {
        titulo: 'Onde o Rio Negro encontra o Solimões',
        texto: 'Nasceu em 1669 ao redor do Forte de São José da Barra do Rio Negro e, em 1808, tornou-se a sede definitiva da capitania. No ciclo da borracha ganhou o Teatro Amazonas e hoje é a porta de entrada para todo o Rio Negro, do Encontro das Águas a São Gabriel.',
        fatos: ['Forte da Barra · 1669', 'Teatro Amazonas · 1896', 'Encontro das Águas'],
      },
      EN: {
        titulo: 'Where the Rio Negro meets the Solimões',
        texto: 'It was born in 1669 around the São José da Barra do Rio Negro Fort and in 1808 became the permanent seat of the captaincy. The rubber boom gave it the Amazon Theatre, and today it is the gateway to the whole Rio Negro, from the Meeting of the Waters to São Gabriel.',
        fatos: ['Barra Fort · 1669', 'Amazon Theatre · 1896', 'Meeting of the Waters'],
      },
      ES: {
        titulo: 'Donde el Río Negro encuentra al Solimões',
        texto: 'Nació en 1669 alrededor del Fuerte de São José da Barra do Rio Negro y en 1808 se convirtió en la sede definitiva de la capitanía. El ciclo del caucho le dio el Teatro Amazonas y hoy es la puerta de entrada a todo el Río Negro, del Encuentro de las Aguas a São Gabriel.',
        fatos: ['Fuerte da Barra · 1669', 'Teatro Amazonas · 1896', 'Encuentro de las Aguas'],
      },
    },
  },
];

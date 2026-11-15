import type { Idioma } from '@/lib/i18n/types';

// ERN_HISTORIAS_MUNICIPIOS_V1 → EDA_HISTORIAS_AMAZONAS_V2
// Histórias dos municípios, do Rio Negro ao Solimões e ao Baixo Amazonas,
// para a página Experiências (e para a Iara/EDA).
// V2 (15/11/2026): Manacapuru, Tefé, Uarini, Tabatinga, Parintins e Maués,
// conferidos no IBGE (histórico dos municípios), Portal Amazônia e INPI.
// Fontes consultadas (nov/2026): Portal Amazônia (Amazônia de A a Z,
// com base nas prefeituras), IBGE Cidades/Biblioteca e legislação municipal
// de São Gabriel da Cachoeira (2002). Revisar com pesquisas locais antes de
// ampliar o texto.

export type RegiaoHistoria = 'alto' | 'medio' | 'baixo' | 'solimoes' | 'baixo-amazonas';

type Texto = { titulo: string; texto: string; fatos: string[] };

export type HistoriaMunicipio = {
  id: string;
  nome: string;
  regiao: RegiaoHistoria;
  imagem: string;
  /** Trecho curto e mudo para o cartão (opcional). */
  video?: string;
  /** Marco no tempo exibido em destaque (ano ou século). */
  marco: string;
  textos: Record<Idioma, Texto>;
};

export const HISTORIAS_MUNICIPIOS: HistoriaMunicipio[] = [
  {
    id: 'sao-gabriel-da-cachoeira',
    nome: 'São Gabriel da Cachoeira',
    regiao: 'alto',
    imagem: '/images/destinos/sao-gabriel/sao-gabriel-aerea.jpg',
    marco: 'c. 1760',
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
    marco: '1956',
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
    marco: '1728',
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
    marco: 'Séc. XVII',
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
    marco: '1669',
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
  {
    id: 'manacapuru',
    nome: 'Manacapuru',
    regiao: 'solimoes',
    imagem: '/images/cultura/cirandasmanacapuru.jpg',
    marco: '1894',
    textos: {
      PT: {
        titulo: 'A Princesinha do Solimões',
        texto: 'As terras eram dos Mura, aldeados no século XVIII na margem esquerda do Solimões. O município foi criado em 1894, desmembrado de Manaus. Das escolas da cidade nasceram as cirandas, que desde 1997 enchem o Festival de Cirandas no fim de agosto.',
        fatos: ['Município desde 1894', 'Povo Mura', 'Festival de Cirandas · 1997'],
      },
      EN: {
        titulo: 'The Little Princess of the Solimões',
        texto: 'These were Mura lands, settled in the 18th century on the left bank of the Solimões. The municipality was created in 1894 from Manaus. The cirandas were born in the town’s schools and, since 1997, fill the Ciranda Festival at the end of August.',
        fatos: ['Municipality since 1894', 'Mura people', 'Ciranda Festival · 1997'],
      },
      ES: {
        titulo: 'La Princesita del Solimões',
        texto: 'Eran tierras de los Mura, asentados en el siglo XVIII en la margen izquierda del Solimões. El municipio se creó en 1894, separado de Manaos. Las cirandas nacieron en las escuelas de la ciudad y desde 1997 llenan el Festival de Cirandas a fines de agosto.',
        fatos: ['Municipio desde 1894', 'Pueblo Mura', 'Festival de Cirandas · 1997'],
      },
    },
  },
  {
    id: 'tefe',
    nome: 'Tefé',
    regiao: 'solimoes',
    imagem: '/images/regiao/arara.jpg.jpeg',
    marco: '1688',
    textos: {
      PT: {
        titulo: 'Da Vila de Ega a Mamirauá',
        texto: 'Nasceu da Missão de Santa Teresa d’Ávila, fundada pelo jesuíta Samuel Fritz em 1688 na barra do rio Tefé. Em 1759 virou a Vila de Ega, centro do Médio Solimões. Hoje é a porta de entrada da Reserva Mamirauá, das várzeas, do pirarucu manejado e do uacari-branco.',
        fatos: ['Missão de Samuel Fritz · 1688', 'Vila de Ega · 1759', 'Porta da Reserva Mamirauá'],
      },
      EN: {
        titulo: 'From the town of Ega to Mamirauá',
        texto: 'It grew from the Santa Teresa d’Ávila Mission, founded by Jesuit Samuel Fritz in 1688 at the mouth of the Tefé River. In 1759 it became the town of Ega, hub of the Middle Solimões. Today it is the gateway to the Mamirauá Reserve, its flooded forests, managed pirarucu and white uakari.',
        fatos: ['Samuel Fritz mission · 1688', 'Town of Ega · 1759', 'Gateway to Mamirauá'],
      },
      ES: {
        titulo: 'De la Villa de Ega a Mamirauá',
        texto: 'Nació de la Misión de Santa Teresa de Ávila, fundada por el jesuita Samuel Fritz en 1688 en la boca del río Tefé. En 1759 pasó a ser la Villa de Ega, centro del Medio Solimões. Hoy es la puerta de entrada a la Reserva Mamirauá, sus várzeas, el pirarucú manejado y el uacarí blanco.',
        fatos: ['Misión de Samuel Fritz · 1688', 'Villa de Ega · 1759', 'Puerta de Mamirauá'],
      },
    },
  },
  {
    id: 'uarini',
    nome: 'Uarini',
    regiao: 'solimoes',
    imagem: '/images/destinos/curadoria/farinha-uarini.jpg',
    video: '/videos/curadoria/farinha-uarini.mp4',
    marco: '1981',
    textos: {
      PT: {
        titulo: 'A terra da farinha ovinha',
        texto: 'Sua história é ligada à de Tefé, de onde se emancipou em 1981. A farinha de mandioca em bolinhas, amarela e crocante, ganhou fama em todo o Norte e, em 2019, o selo de Indicação Geográfica do INPI — o terceiro do Amazonas, depois dos peixes ornamentais do Rio Negro e do guaraná de Maués.',
        fatos: ['Município desde 1981', 'Indicação Geográfica · 2019', 'Festa da Farinha'],
      },
      EN: {
        titulo: 'Home of the “ovinha” flour',
        texto: 'Its history is tied to Tefé, from which it became independent in 1981. Its crunchy, golden pearl-shaped cassava flour is famous across the North and in 2019 earned an INPI Geographical Indication — the third in Amazonas, after the Rio Negro ornamental fish and Maués guaraná.',
        fatos: ['Municipality since 1981', 'Geographical Indication · 2019', 'Flour Festival'],
      },
      ES: {
        titulo: 'La tierra de la harina “ovinha”',
        texto: 'Su historia está ligada a Tefé, del que se emancipó en 1981. Su harina de yuca en bolitas, dorada y crujiente, es famosa en todo el Norte y en 2019 recibió la Indicación Geográfica del INPI — la tercera de Amazonas, tras los peces ornamentales del Río Negro y el guaraná de Maués.',
        fatos: ['Municipio desde 1981', 'Indicación Geográfica · 2019', 'Fiesta de la Harina'],
      },
    },
  },
  {
    id: 'tabatinga',
    nome: 'Tabatinga',
    regiao: 'solimoes',
    imagem: '/images/destinos/curadoria/triplice-fronteira.jpg',
    video: '/videos/curadoria/triplice-fronteira.mp4',
    marco: '1766',
    textos: {
      PT: {
        titulo: 'Onde o Brasil encontra Colômbia e Peru',
        texto: 'Nasceu em 1766 com o Forte de São Francisco Xavier de Tabatinga, que guardava a fronteira portuguesa no Alto Solimões — suas ruínas reaparecem nas grandes secas. Foi distrito de Benjamin Constant até virar município em 1981. É terra do povo Ticuna e vizinha de Letícia, na Colômbia.',
        fatos: ['Forte São Francisco Xavier · 1766', 'Município desde 1981', 'Tríplice fronteira'],
      },
      EN: {
        titulo: 'Where Brazil meets Colombia and Peru',
        texto: 'It began in 1766 with the São Francisco Xavier de Tabatinga Fort, guarding the Portuguese border on the Upper Solimões — its ruins reappear in severe droughts. It was a district of Benjamin Constant until becoming a municipality in 1981. It is Ticuna land and neighbors Leticia, Colombia.',
        fatos: ['São Francisco Xavier Fort · 1766', 'Municipality since 1981', 'Triple border'],
      },
      ES: {
        titulo: 'Donde Brasil se encuentra con Colombia y Perú',
        texto: 'Nació en 1766 con el Fuerte de São Francisco Xavier de Tabatinga, que vigilaba la frontera portuguesa en el Alto Solimões — sus ruinas reaparecen en las grandes sequías. Fue distrito de Benjamin Constant hasta volverse municipio en 1981. Es tierra del pueblo Ticuna y vecina de Leticia, en Colombia.',
        fatos: ['Fuerte São Francisco Xavier · 1766', 'Municipio desde 1981', 'Triple frontera'],
      },
    },
  },
  {
    id: 'parintins',
    nome: 'Parintins',
    regiao: 'baixo-amazonas',
    imagem: '/images/destinos/curadoria/festival-parintins.jpg',
    video: '/videos/curadoria/festival-parintins.mp4',
    marco: '1803',
    textos: {
      PT: {
        titulo: 'A ilha dos bois-bumbás',
        texto: 'Na Ilha Tupinambarana, terra dos Tupinambá, nasceu em 1803 a missão de Vila Nova da Rainha. Virou Vila Bela da Imperatriz em 1848 e, em 1880, cidade com o nome dos Parintintin. Garantido (1913) e Caprichoso dividem a ilha em vermelho e azul e fazem, no Bumbódromo, o Festival de Parintins em junho.',
        fatos: ['Missão Vila Nova da Rainha · 1803', 'Cidade de Parintins · 1880', 'Garantido e Caprichoso'],
      },
      EN: {
        titulo: 'The island of the bois-bumbás',
        texto: 'On Tupinambarana Island, land of the Tupinambá, the Vila Nova da Rainha mission began in 1803. It became Vila Bela da Imperatriz in 1848 and, in 1880, a city named after the Parintintin people. Garantido (1913) and Caprichoso split the island into red and blue and stage the Parintins Festival at the Bumbódromo every June.',
        fatos: ['Vila Nova da Rainha mission · 1803', 'City of Parintins · 1880', 'Garantido and Caprichoso'],
      },
      ES: {
        titulo: 'La isla de los bois-bumbás',
        texto: 'En la Isla Tupinambarana, tierra de los Tupinambá, nació en 1803 la misión de Vila Nova da Rainha. Pasó a ser Vila Bela da Imperatriz en 1848 y, en 1880, ciudad con el nombre de los Parintintin. Garantido (1913) y Caprichoso dividen la isla en rojo y azul y hacen, en el Bumbódromo, el Festival de Parintins en junio.',
        fatos: ['Misión Vila Nova da Rainha · 1803', 'Ciudad de Parintins · 1880', 'Garantido y Caprichoso'],
      },
    },
  },
  {
    id: 'maues',
    nome: 'Maués',
    regiao: 'baixo-amazonas',
    imagem: '/images/destinos/curadoria/guarana-maues.jpg',
    video: '/videos/curadoria/guarana-maues.mp4',
    marco: '1833',
    textos: {
      PT: {
        titulo: 'O berço do guaraná',
        texto: 'Era a aldeia de Luséa, fundada em 1795 entre os Sateré-Mawé e os Mundurucu, elevada a vila em 25 de junho de 1833. Ganhou o nome de Maués em 1892, em homenagem aos Sateré-Mawé, o povo que domesticou o guaraná. Às margens do Maués-Açu, tem praias de rio e a tradicional Festa do Guaraná.',
        fatos: ['Vila de Luséa · 1833', 'Nome Maués · 1892', 'Povo Sateré-Mawé'],
      },
      EN: {
        titulo: 'The cradle of guaraná',
        texto: 'It was the village of Luséa, founded in 1795 among the Sateré-Mawé and Munduruku, and became a town on June 25, 1833. It was renamed Maués in 1892 to honor the Sateré-Mawé, the people who domesticated guaraná. On the Maués-Açu River, it has river beaches and the traditional Guaraná Festival.',
        fatos: ['Town of Luséa · 1833', 'Named Maués · 1892', 'Sateré-Mawé people'],
      },
      ES: {
        titulo: 'La cuna del guaraná',
        texto: 'Era la aldea de Luséa, fundada en 1795 entre los Sateré-Mawé y los Mundurukú, elevada a villa el 25 de junio de 1833. Recibió el nombre de Maués en 1892 en homenaje a los Sateré-Mawé, el pueblo que domesticó el guaraná. A orillas del Maués-Açu, tiene playas de río y la tradicional Fiesta del Guaraná.',
        fatos: ['Villa de Luséa · 1833', 'Nombre Maués · 1892', 'Pueblo Sateré-Mawé'],
      },
    },
  },
];

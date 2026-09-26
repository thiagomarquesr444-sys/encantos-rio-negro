import type { Idioma } from '@/lib/i18n/types';

export const destinosTranslations = {
  PT: {
    hero: {
      eyebrow: 'Destinos ERN',
      title:
        'O Rio Negro não é um destino. É um território inteiro para descobrir.',
      description:
        'Rios, arquipélagos, florestas, praias, cidades, festivais e comunidades conectados por uma das paisagens mais singulares da Amazônia.',
      explore: 'Explorar destinos',
      plan: 'Planejar com o Concierge',
      region: 'Do Baixo ao Médio Rio Negro',
      sideTitle:
        'Escolha menos pelo mapa e mais pelo tipo de experiência que você quer viver.',
      sideDescription:
        'A ERN organiza o território para transformar inspiração em planejamento e planejamento em conexão com operadores locais.',
    },

    discovery: {
      title: 'Explore por território ou interesse',
    },

    categories: {
      todos: 'Todos',
      barcelos: 'Barcelos',
      'novo-airao': 'Novo Airão',
      natureza: 'Natureza',
      cultura: 'Cultura',
    },

    intro: {
      eyebrow: 'Explore com contexto',
      title: 'Não queremos mostrar apenas onde ir.',
      paragraph1:
        'Cada lugar muda com as águas, com a época do ano e com a forma de chegar. Por isso, a ERN combina território, cultura, experiências e operação local em uma mesma jornada.',
      paragraph2:
        'Antes de escolher um roteiro, o visitante pode entender o destino, descobrir o que faz sentido para seu perfil e conversar com o Concierge para avançar no planejamento.',
    },

    explore: 'Explorar',
    empty: 'Nenhum destino encontrado.',

    experienceSection: {
      eyebrow: 'O que você quer viver?',
      title:
        'Um mesmo território. Muitas maneiras de conhecer.',
    },

    experiences: [
      {
        numero: '01',
        titulo: 'Águas e arquipélagos',
        descricao:
          'Navegação por canais, lagos, ilhas, praias e florestas inundadas.',
      },
      {
        numero: '02',
        titulo: 'Floresta e vida selvagem',
        descricao:
          'Experiências guiadas para entender a biodiversidade e os ambientes amazônicos.',
      },
      {
        numero: '03',
        titulo: 'Cultura viva',
        descricao:
          'Festivais, comunidades, tradições, gastronomia e histórias construídas no território.',
      },
      {
        numero: '04',
        titulo: 'Expedições',
        descricao:
          'Roteiros mais longos, navegação, pesca esportiva e destinos remotos.',
      },
    ],

    bases: {
      eyebrow: 'Duas portas para grandes experiências',
      title:
        'Barcelos e Novo Airão conectam experiências diferentes do Rio Negro.',

      barcelosRegion: 'Médio Rio Negro',
      barcelosDescription:
        'Pesca esportiva, Mariuá, praias sazonais, Serra do Aracá, cultura dos peixes ornamentais e acesso a grandes áreas do Rio Negro.',
      barcelosButton: 'Explorar Barcelos',

      novoAiraoRegion: 'Baixo Rio Negro',
      novoAiraoDescription:
        'Anavilhanas, acesso ao Jaú, navegação, floresta, cultura regional e experiências ligadas ao Baixo Rio Negro.',
      novoAiraoButton: 'Explorar Novo Airão',
    },

    waters: {
      eyebrow: 'O território muda',
      title: 'Cheia e seca criam viagens diferentes.',
      description:
        'Na Amazônia, a água redefine caminhos, praias, florestas inundadas e acessos. O planejamento precisa considerar a época da viagem e o destino escolhido.',

      highLabel: 'Águas altas',
      highTitle: 'A floresta se torna caminho.',
      highDescription:
        'Igapós e ambientes inundados ganham protagonismo e criam experiências de navegação diferentes.',

      lowLabel: 'Águas baixas',
      lowTitle: 'Praias e paisagens reaparecem.',
      lowDescription:
        'Bancos de areia, praias e outros ambientes ficam mais evidentes durante o período de seca.',
    },

    planning: {
      eyebrow: 'ERN Concierge',
      title: 'Você não precisa conhecer o mapa para começar.',
      description:
        'Diga quando pretende viajar, quantas pessoas vão, o que gosta de fazer e quanto tempo deseja permanecer. A ERN ajuda a organizar as possibilidades antes da confirmação com os operadores.',
      button: 'Começar planejamento',
      questionsTitle: 'O Concierge pode começar por',
      questions: [
        'Quando você quer viajar?',
        'Quantas pessoas estarão no grupo?',
        'Você procura pesca, natureza ou cultura?',
        'Prefere uma viagem curta ou uma expedição?',
        'Quer conhecer mais de um destino?',
      ],
    },

    operators: {
      eyebrow: 'Você trabalha com turismo?',
      title:
        'Sua operação também pode fazer parte dessa jornada.',
      button: 'Conhecer ERN Gestão',
    },

    destinations: {
      barcelos: {
        titulo: 'Barcelos',
        local: 'Médio Rio Negro',
        descricao:
          'Uma cidade moldada pelas águas negras, pela pesca esportiva, pelas praias sazonais, pelo comércio de peixes ornamentais e por uma cultura que acompanha o ritmo do rio.',
        destaque:
          'Cidade-base para viver o Alto e Médio Rio Negro',
        etiqueta: 'PORTA DE ENTRADA',
      },

      'serra-do-araca': {
        titulo: 'Serra do Aracá',
        local: 'Barcelos',
        descricao:
          'Território de expedição, formações montanhosas, floresta e grandes paisagens para quem procura uma Amazônia remota e monumental.',
        destaque:
          'Expedição • Natureza • Aventura',
        etiqueta: 'EXPEDIÇÃO',
      },

      mariua: {
        titulo: 'Arquipélago de Mariuá',
        local: 'Barcelos',
        descricao:
          'Ilhas, lagos, canais e praias que mudam com o ciclo das águas e criam uma das paisagens mais características da região de Barcelos.',
        destaque:
          'Ilhas • Navegação • Paisagem',
        etiqueta: 'ÁGUAS NEGRAS',
      },

      'praia-grande': {
        titulo: 'Praia Grande',
        local: 'Barcelos',
        descricao:
          'Em frente à sede do município, surge com mais força durante a seca e combina praia, convivência local, gastronomia e grandes eventos.',
        destaque:
          'Praia sazonal • Cultura • Gastronomia',
        etiqueta: 'PRAIA',
      },

      'festival-peixe-ornamental': {
        titulo: 'Festival do Peixe Ornamental',
        local: 'Barcelos',
        descricao:
          'Uma das maiores expressões culturais de Barcelos, ligada à história dos piabeiros, aos peixes ornamentais e à identidade popular do município.',
        destaque:
          'Tradição • Espetáculo • Identidade',
        etiqueta: 'CULTURA',
      },

      'novo-airao': {
        titulo: 'Novo Airão',
        local: 'Baixo Rio Negro',
        descricao:
          'Uma base estratégica para acessar áreas naturais do Baixo Rio Negro, experiências fluviais e manifestações culturais próprias da região.',
        destaque:
          'Natureza • Cultura • Navegação',
        etiqueta: 'DESTINO',
      },

      anavilhanas: {
        titulo: 'Anavilhanas',
        local: 'Novo Airão',
        descricao:
          'Um universo de ilhas, canais, floresta de igapó e navegação no Rio Negro, com paisagens que mudam profundamente entre cheia e seca.',
        destaque:
          'Ilhas • Igapó • Navegação',
        etiqueta: 'PARQUE NACIONAL',
      },

      jau: {
        titulo: 'Parque Nacional do Jaú',
        local: 'Novo Airão • Barcelos',
        descricao:
          'Uma extensa área protegida de floresta amazônica e rios de águas pretas, com praias, igapós, sítios arqueológicos e experiências embarcadas.',
        destaque:
          'Conservação • Expedição • Biodiversidade',
        etiqueta: 'PARQUE NACIONAL',
      },

      'festival-peixe-boi': {
        titulo: 'Eco Festival do Peixe-Boi',
        local: 'Novo Airão',
        descricao:
          'Uma grande celebração de Novo Airão que une apresentações culturais, identidade regional, economia criativa e turismo.',
        destaque:
          'Cultura • Festival • Comunidade',
        etiqueta: 'CULTURA',
      },
    },
  },

  EN: {
    hero: {
      eyebrow: 'ERN Destinations',
      title:
        'The Rio Negro is not just a destination. It is an entire territory to discover.',
      description:
        'Rivers, archipelagos, forests, beaches, towns, festivals and communities connected by one of the most distinctive landscapes in the Amazon.',
      explore: 'Explore destinations',
      plan: 'Plan with the Concierge',
      region: 'From the Lower to the Middle Rio Negro',
      sideTitle:
        'Choose less by the map and more by the kind of experience you want to live.',
      sideDescription:
        'ERN organizes the territory to turn inspiration into planning, and planning into connections with local operators.',
    },

    discovery: {
      title: 'Explore by territory or interest',
    },

    categories: {
      todos: 'All',
      barcelos: 'Barcelos',
      'novo-airao': 'Novo Airão',
      natureza: 'Nature',
      cultura: 'Culture',
    },

    intro: {
      eyebrow: 'Explore with context',
      title:
        'We do not want to show you only where to go.',
      paragraph1:
        'Every place changes with the waters, the season and the way you get there. That is why ERN combines territory, culture, experiences and local operations into one journey.',
      paragraph2:
        'Before choosing an itinerary, visitors can understand the destination, discover what best fits their profile and talk to the Concierge to move forward with planning.',
    },

    explore: 'Explore',
    empty: 'No destinations found.',

    experienceSection: {
      eyebrow: 'What do you want to experience?',
      title:
        'One territory. Many ways to discover it.',
    },

    experiences: [
      {
        numero: '01',
        titulo: 'Waters and archipelagos',
        descricao:
          'Navigation through channels, lakes, islands, beaches and flooded forests.',
      },
      {
        numero: '02',
        titulo: 'Forest and wildlife',
        descricao:
          'Guided experiences to understand Amazonian biodiversity and environments.',
      },
      {
        numero: '03',
        titulo: 'Living culture',
        descricao:
          'Festivals, communities, traditions, gastronomy and stories shaped by the territory.',
      },
      {
        numero: '04',
        titulo: 'Expeditions',
        descricao:
          'Longer journeys, navigation, sport fishing and remote destinations.',
      },
    ],

    bases: {
      eyebrow: 'Two gateways to great experiences',
      title:
        'Barcelos and Novo Airão connect different experiences across the Rio Negro.',

      barcelosRegion: 'Middle Rio Negro',
      barcelosDescription:
        'Sport fishing, Mariuá, seasonal beaches, Serra do Aracá, ornamental fish culture and access to vast areas of the Rio Negro.',
      barcelosButton: 'Explore Barcelos',

      novoAiraoRegion: 'Lower Rio Negro',
      novoAiraoDescription:
        'Anavilhanas, access to Jaú, navigation, forest, regional culture and experiences connected to the Lower Rio Negro.',
      novoAiraoButton: 'Explore Novo Airão',
    },

    waters: {
      eyebrow: 'The territory changes',
      title:
        'High and low waters create different journeys.',
      description:
        'In the Amazon, water reshapes routes, beaches, flooded forests and access. Planning needs to consider both the season and the chosen destination.',

      highLabel: 'High waters',
      highTitle: 'The forest becomes the path.',
      highDescription:
        'Flooded forests and aquatic environments take center stage and create different navigation experiences.',

      lowLabel: 'Low waters',
      lowTitle: 'Beaches and landscapes return.',
      lowDescription:
        'Sandbanks, beaches and other environments become more visible during the low-water season.',
    },

    planning: {
      eyebrow: 'ERN Concierge',
      title:
        'You do not need to know the map to get started.',
      description:
        'Tell us when you want to travel, how many people are going, what you enjoy doing and how long you want to stay. ERN helps organize the possibilities before confirmation with local operators.',
      button: 'Start planning',
      questionsTitle:
        'The Concierge can start by asking',
      questions: [
        'When would you like to travel?',
        'How many people are in your group?',
        'Are you looking for fishing, nature or culture?',
        'Would you prefer a short trip or an expedition?',
        'Would you like to visit more than one destination?',
      ],
    },

    operators: {
      eyebrow: 'Do you work in tourism?',
      title:
        'Your operation can also become part of this journey.',
      button: 'Discover ERN Management',
    },

    destinations: {
      barcelos: {
        titulo: 'Barcelos',
        local: 'Middle Rio Negro',
        descricao:
          'A town shaped by black waters, sport fishing, seasonal beaches, the ornamental fish trade and a culture that follows the rhythm of the river.',
        destaque:
          'A gateway for experiencing the Upper and Middle Rio Negro',
        etiqueta: 'GATEWAY',
      },

      'serra-do-araca': {
        titulo: 'Serra do Aracá',
        local: 'Barcelos',
        descricao:
          'Expedition territory with mountain formations, forest and vast landscapes for travelers seeking a remote and monumental Amazon.',
        destaque:
          'Expedition • Nature • Adventure',
        etiqueta: 'EXPEDITION',
      },

      mariua: {
        titulo: 'Mariuá Archipelago',
        local: 'Barcelos',
        descricao:
          'Islands, lakes, channels and beaches that change with the water cycle and create one of the most characteristic landscapes around Barcelos.',
        destaque:
          'Islands • Navigation • Landscape',
        etiqueta: 'BLACK WATERS',
      },

      'praia-grande': {
        titulo: 'Praia Grande',
        local: 'Barcelos',
        descricao:
          'Located opposite the town, it becomes more prominent during the dry season and combines beach life, local interaction, gastronomy and major events.',
        destaque:
          'Seasonal beach • Culture • Gastronomy',
        etiqueta: 'BEACH',
      },

      'festival-peixe-ornamental': {
        titulo: 'Ornamental Fish Festival',
        local: 'Barcelos',
        descricao:
          'One of the major cultural expressions of Barcelos, connected to the history of ornamental fish collectors and the popular identity of the town.',
        destaque:
          'Tradition • Performance • Identity',
        etiqueta: 'CULTURE',
      },

      'novo-airao': {
        titulo: 'Novo Airão',
        local: 'Lower Rio Negro',
        descricao:
          'A strategic base for accessing natural areas of the Lower Rio Negro, river experiences and regional cultural expressions.',
        destaque:
          'Nature • Culture • Navigation',
        etiqueta: 'DESTINATION',
      },

      anavilhanas: {
        titulo: 'Anavilhanas',
        local: 'Novo Airão',
        descricao:
          'A world of islands, channels, flooded forests and navigation on the Rio Negro, with landscapes that change dramatically between high and low water.',
        destaque:
          'Islands • Flooded forest • Navigation',
        etiqueta: 'NATIONAL PARK',
      },

      jau: {
        titulo: 'Jaú National Park',
        local: 'Novo Airão • Barcelos',
        descricao:
          'A vast protected area of Amazon rainforest and blackwater rivers, with beaches, flooded forests, archaeological sites and boat-based experiences.',
        destaque:
          'Conservation • Expedition • Biodiversity',
        etiqueta: 'NATIONAL PARK',
      },

      'festival-peixe-boi': {
        titulo: 'Peixe-Boi Eco Festival',
        local: 'Novo Airão',
        descricao:
          'A major celebration in Novo Airão combining cultural performances, regional identity, creative economy and tourism.',
        destaque:
          'Culture • Festival • Community',
        etiqueta: 'CULTURE',
      },
    },
  },

  ES: {
    hero: {
      eyebrow: 'Destinos ERN',
      title:
        'El Río Negro no es solo un destino. Es un territorio entero por descubrir.',
      description:
        'Ríos, archipiélagos, bosques, playas, ciudades, festivales y comunidades conectados por uno de los paisajes más singulares de la Amazonía.',
      explore: 'Explorar destinos',
      plan: 'Planificar con el Concierge',
      region: 'Del Bajo al Medio Río Negro',
      sideTitle:
        'Elige menos por el mapa y más por el tipo de experiencia que quieres vivir.',
      sideDescription:
        'ERN organiza el territorio para transformar inspiración en planificación y planificación en conexión con operadores locales.',
    },

    discovery: {
      title: 'Explora por territorio o interés',
    },

    categories: {
      todos: 'Todos',
      barcelos: 'Barcelos',
      'novo-airao': 'Novo Airão',
      natureza: 'Naturaleza',
      cultura: 'Cultura',
    },

    intro: {
      eyebrow: 'Explora con contexto',
      title:
        'No queremos mostrar solamente dónde ir.',
      paragraph1:
        'Cada lugar cambia con las aguas, la época del año y la forma de llegar. Por eso, ERN combina territorio, cultura, experiencias y operación local en un mismo recorrido.',
      paragraph2:
        'Antes de elegir un itinerario, el visitante puede comprender el destino, descubrir qué encaja mejor con su perfil y conversar con el Concierge para avanzar en la planificación.',
    },

    explore: 'Explorar',
    empty: 'No se encontraron destinos.',

    experienceSection: {
      eyebrow: '¿Qué quieres vivir?',
      title:
        'Un mismo territorio. Muchas formas de conocerlo.',
    },

    experiences: [
      {
        numero: '01',
        titulo: 'Aguas y archipiélagos',
        descricao:
          'Navegación por canales, lagos, islas, playas y bosques inundados.',
      },
      {
        numero: '02',
        titulo: 'Bosque y vida silvestre',
        descricao:
          'Experiencias guiadas para comprender la biodiversidad y los ambientes amazónicos.',
      },
      {
        numero: '03',
        titulo: 'Cultura viva',
        descricao:
          'Festivales, comunidades, tradiciones, gastronomía e historias construidas en el territorio.',
      },
      {
        numero: '04',
        titulo: 'Expediciones',
        descricao:
          'Rutas más largas, navegación, pesca deportiva y destinos remotos.',
      },
    ],

    bases: {
      eyebrow: 'Dos puertas para grandes experiencias',
      title:
        'Barcelos y Novo Airão conectan experiencias diferentes del Río Negro.',

      barcelosRegion: 'Medio Río Negro',
      barcelosDescription:
        'Pesca deportiva, Mariuá, playas estacionales, Serra do Aracá, cultura de los peces ornamentales y acceso a grandes áreas del Río Negro.',
      barcelosButton: 'Explorar Barcelos',

      novoAiraoRegion: 'Bajo Río Negro',
      novoAiraoDescription:
        'Anavilhanas, acceso al Jaú, navegación, bosque, cultura regional y experiencias vinculadas al Bajo Río Negro.',
      novoAiraoButton: 'Explorar Novo Airão',
    },

    waters: {
      eyebrow: 'El territorio cambia',
      title:
        'Las aguas altas y bajas crean viajes diferentes.',
      description:
        'En la Amazonía, el agua redefine caminos, playas, bosques inundados y accesos. La planificación debe considerar la época del viaje y el destino elegido.',

      highLabel: 'Aguas altas',
      highTitle: 'El bosque se convierte en camino.',
      highDescription:
        'Los bosques inundados y los ambientes acuáticos ganan protagonismo y crean experiencias diferentes de navegación.',

      lowLabel: 'Aguas bajas',
      lowTitle: 'Las playas y los paisajes reaparecen.',
      lowDescription:
        'Los bancos de arena, las playas y otros ambientes se hacen más visibles durante la temporada de aguas bajas.',
    },

    planning: {
      eyebrow: 'ERN Concierge',
      title:
        'No necesitas conocer el mapa para empezar.',
      description:
        'Dinos cuándo quieres viajar, cuántas personas van, qué te gusta hacer y cuánto tiempo deseas permanecer. ERN ayuda a organizar las posibilidades antes de la confirmación con los operadores.',
      button: 'Comenzar planificación',
      questionsTitle:
        'El Concierge puede comenzar preguntando',
      questions: [
        '¿Cuándo quieres viajar?',
        '¿Cuántas personas estarán en el grupo?',
        '¿Buscas pesca, naturaleza o cultura?',
        '¿Prefieres un viaje corto o una expedición?',
        '¿Quieres conocer más de un destino?',
      ],
    },

    operators: {
      eyebrow: '¿Trabajas con turismo?',
      title:
        'Tu operación también puede formar parte de este recorrido.',
      button: 'Conocer ERN Gestión',
    },

    destinations: {
      barcelos: {
        titulo: 'Barcelos',
        local: 'Medio Río Negro',
        descricao:
          'Una ciudad moldeada por las aguas negras, la pesca deportiva, las playas estacionales, el comercio de peces ornamentales y una cultura que acompaña el ritmo del río.',
        destaque:
          'Ciudad base para vivir el Alto y Medio Río Negro',
        etiqueta: 'PUERTA DE ENTRADA',
      },

      'serra-do-araca': {
        titulo: 'Serra do Aracá',
        local: 'Barcelos',
        descricao:
          'Territorio de expedición, formaciones montañosas, bosque y grandes paisajes para quienes buscan una Amazonía remota y monumental.',
        destaque:
          'Expedición • Naturaleza • Aventura',
        etiqueta: 'EXPEDICIÓN',
      },

      mariua: {
        titulo: 'Archipiélago de Mariuá',
        local: 'Barcelos',
        descricao:
          'Islas, lagos, canales y playas que cambian con el ciclo de las aguas y crean uno de los paisajes más característicos de la región de Barcelos.',
        destaque:
          'Islas • Navegación • Paisaje',
        etiqueta: 'AGUAS NEGRAS',
      },

      'praia-grande': {
        titulo: 'Praia Grande',
        local: 'Barcelos',
        descricao:
          'Frente a la sede del municipio, aparece con mayor fuerza durante la temporada seca y combina playa, convivencia local, gastronomía y grandes eventos.',
        destaque:
          'Playa estacional • Cultura • Gastronomía',
        etiqueta: 'PLAYA',
      },

      'festival-peixe-ornamental': {
        titulo: 'Festival del Pez Ornamental',
        local: 'Barcelos',
        descricao:
          'Una de las mayores expresiones culturales de Barcelos, vinculada a la historia de los recolectores de peces ornamentales y a la identidad popular del municipio.',
        destaque:
          'Tradición • Espectáculo • Identidad',
        etiqueta: 'CULTURA',
      },

      'novo-airao': {
        titulo: 'Novo Airão',
        local: 'Bajo Río Negro',
        descricao:
          'Una base estratégica para acceder a áreas naturales del Bajo Río Negro, experiencias fluviales y manifestaciones culturales propias de la región.',
        destaque:
          'Naturaleza • Cultura • Navegación',
        etiqueta: 'DESTINO',
      },

      anavilhanas: {
        titulo: 'Anavilhanas',
        local: 'Novo Airão',
        descricao:
          'Un universo de islas, canales, bosques inundados y navegación en el Río Negro, con paisajes que cambian profundamente entre aguas altas y bajas.',
        destaque:
          'Islas • Bosque inundado • Navegación',
        etiqueta: 'PARQUE NACIONAL',
      },

      jau: {
        titulo: 'Parque Nacional del Jaú',
        local: 'Novo Airão • Barcelos',
        descricao:
          'Una extensa área protegida de bosque amazónico y ríos de aguas negras, con playas, bosques inundados, sitios arqueológicos y experiencias embarcadas.',
        destaque:
          'Conservación • Expedición • Biodiversidad',
        etiqueta: 'PARQUE NACIONAL',
      },

      'festival-peixe-boi': {
        titulo: 'Eco Festival del Peixe-Boi',
        local: 'Novo Airão',
        descricao:
          'Una gran celebración de Novo Airão que reúne presentaciones culturales, identidad regional, economía creativa y turismo.',
        destaque:
          'Cultura • Festival • Comunidad',
        etiqueta: 'CULTURA',
      },
    },
  },
} satisfies Record<Idioma, unknown>;

export type DestinosTranslation =
  (typeof destinosTranslations)['PT'];

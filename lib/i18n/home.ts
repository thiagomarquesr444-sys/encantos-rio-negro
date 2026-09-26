import type { Idioma } from '@/lib/i18n/types';

export const homeTranslations = {
  PT: {
    hero: {
      location: 'Rio Negro • Barcelos • Amazonas',
      title:
        'O Rio Negro tem um jeito novo de ser vivido.',
      description:
        'Experiências, hospedagens e roteiros pelo Rio Negro, organizados com tecnologia e conhecimento local.',
      description2:
        'A ERN aproxima visitantes de operadores locais e oferece a tecnologia que ajuda quem trabalha com turismo a organizar clientes, reservas, experiências e operação em um só lugar.',
      plan: 'Planejar minha viagem',
      explore: 'Explorar o Rio Negro',
      localService: 'Atendimento local',
      personalized: 'Planejamento personalizado',
      connectedOperators: 'Operadores conectados',
      discover: 'Descubra',
    },

    concierge: {
      title: 'Concierge Encantos',
      status: 'Planejamento inteligente',
      question:
        'Como você imagina sua viagem pelo Rio Negro?',
      description:
        'Escolha um interesse ou conte rapidamente o que procura.',
      placeholder:
        'Ex.: Quero conhecer Barcelos em outubro...',
      button: 'Começar planejamento',
      disclaimer:
        'Disponibilidade e valores são confirmados com operadores locais.',
    },

    interests: [
      {
        id: 'pesca',
        label: 'Pesca esportiva',
        emoji: '🎣',
      },
      {
        id: 'natureza',
        label: 'Natureza',
        emoji: '🌿',
      },
      {
        id: 'cultura',
        label: 'Cultura e comunidades',
        emoji: '🛶',
      },
      {
        id: 'hospedagem',
        label: 'Hospedagem',
        emoji: '🏨',
      },
      {
        id: 'descobrir',
        label: 'Ainda não sei',
        emoji: '✦',
      },
    ],

    discovery: {
      eyebrow: 'Descubra o território',
      title:
        'Uma Amazônia que não cabe em um catálogo.',
      description:
        'Barcelos é porta de entrada para rios, ilhas, praias, pesca, comunidades e paisagens que mudam com o ciclo das águas. A ERN nasce para aproximar o visitante desse território sem transformar a experiência em turismo genérico.',
    },

    territory: {
      eyebrow: 'Viva o Rio Negro por inteiro',
      title:
        'Natureza, cultura e histórias que atravessam o território.',
      description:
        'O Rio Negro vai além de um único destino. A ERN conecta paisagens, festas, comunidades, rios, arquipélagos e experiências que ajudam a contar a identidade de Barcelos, Novo Airão e de toda essa região amazônica.',
      unsure: 'Não sabe por onde começar?',
      unsureDescription:
        'Conte ao Concierge o tipo de experiência que você procura e a ERN ajuda a organizar possibilidades pelo território.',
      conciergeButton: 'Planejar com o Concierge',
    },

    territories: [
      {
        id: 'serra-araca',
        local: 'Barcelos',
        titulo: 'Serra do Aracá',
        descricao:
          'Expedições, paisagens monumentais e uma das experiências naturais mais marcantes do território do Rio Negro.',
        imagem: '/images/serra-araca.jpg',
        acao: 'Descobrir',
      },
      {
        id: 'mariua',
        local: 'Barcelos',
        titulo: 'Arquipélago de Mariuá',
        descricao:
          'Ilhas, canais e águas negras formam uma paisagem singular na região de Barcelos.',
        imagem: '/images/mariua.jpg',
        acao: 'Descobrir',
      },
      {
        id: 'jau',
        local: 'Rio Negro',
        titulo: 'Parque Nacional do Jaú',
        descricao:
          'Floresta, rios e biodiversidade em uma das grandes áreas naturais protegidas conectadas à região.',
        imagem: '/images/jau.jpg',
        acao: 'Descobrir',
      },
      {
        id: 'anavilhanas',
        local: 'Novo Airão',
        titulo: 'Anavilhanas',
        descricao:
          'Ilhas, canais e paisagens que transformam a navegação pelo Rio Negro em uma experiência de descoberta.',
        imagem: '/images/anavilhanas.jpg',
        acao: 'Descobrir',
      },
      {
        id: 'festival-peixe-ornamental',
        local: 'Cultura • Barcelos',
        titulo: 'Festival do Peixe Ornamental',
        descricao:
          'Uma celebração popular que conecta tradição, identidade cultural e turismo em Barcelos.',
        imagem:
          '/images/festival-peixe-ornamental.jpg',
        acao: 'Conhecer a história',
      },
      {
        id: 'festival-peixe-boi',
        local: 'Cultura • Novo Airão',
        titulo: 'Festival do Peixe-Boi',
        descricao:
          'Um evento cultural popular de Novo Airão que reúne festa, identidade regional e turismo no Rio Negro.',
        imagem: '/images/festival-peixe-boi.jpg',
        acao: 'Conhecer a história',
      },
    ],

    experiences: {
      eyebrow: 'Experiências',
      title: 'Experiências do Rio Negro',
      description:
        'Pesca esportiva, natureza, cultura ribeirinha, passeios e hospedagens formarão a vitrine de experiências da ERN.',
    },

    network: {
      eyebrow: 'Rede Encantos',
      title:
        'Construído com quem vive o território.',
      description:
        'Guias, pousadas, embarcações, agências e operadores locais conectados a uma experiência de turismo mais organizada, transparente e próxima de quem visita o Rio Negro.',
    },

    management: {
      eyebrow: 'ERN para operadores',
      title:
        'A experiência do turista na frente. A operação organizada por trás.',
      description:
        'A ERN também é uma plataforma de gestão para quem trabalha com turismo: clientes, reservas, passeios, embarcações, hospedagens, guias, vouchers, financeiro e relacionamento com parceiros.',
      button: 'Conhecer a ERN Gestão',
      modules: [
        'Clientes',
        'Reservas',
        'Passeios',
        'Hospedagens',
        'Embarcações',
        'Guias',
        'Financeiro',
        'Vouchers',
      ],
    },

    footer: {
      left: 'ERN Concierge — Barcelos, Amazonas.',
      right: 'Encantos Rio Negro',
    },
  },

  EN: {
    hero: {
      location: 'Rio Negro • Barcelos • Amazonas',
      title:
        'There is a new way to experience the Rio Negro.',
      description:
        'Experiences, accommodation and itineraries across the Rio Negro, organized with technology and local knowledge.',
      description2:
        'ERN connects visitors with local operators and provides technology that helps tourism professionals organize clients, reservations, experiences and operations in one place.',
      plan: 'Plan my trip',
      explore: 'Explore the Rio Negro',
      localService: 'Local support',
      personalized: 'Personalized planning',
      connectedOperators: 'Connected operators',
      discover: 'Discover',
    },

    concierge: {
      title: 'Encantos Concierge',
      status: 'Smart planning',
      question:
        'How do you imagine your journey through the Rio Negro?',
      description:
        'Choose an interest or briefly tell us what you are looking for.',
      placeholder:
        'Example: I want to visit Barcelos in October...',
      button: 'Start planning',
      disclaimer:
        'Availability and prices are confirmed with local operators.',
    },

    interests: [
      {
        id: 'pesca',
        label: 'Sport fishing',
        emoji: '🎣',
      },
      {
        id: 'natureza',
        label: 'Nature',
        emoji: '🌿',
      },
      {
        id: 'cultura',
        label: 'Culture and communities',
        emoji: '🛶',
      },
      {
        id: 'hospedagem',
        label: 'Accommodation',
        emoji: '🏨',
      },
      {
        id: 'descobrir',
        label: 'I am not sure yet',
        emoji: '✦',
      },
    ],

    discovery: {
      eyebrow: 'Discover the territory',
      title:
        'An Amazon that cannot fit into a catalog.',
      description:
        'Barcelos is a gateway to rivers, islands, beaches, fishing, communities and landscapes that change with the water cycle. ERN was created to bring visitors closer to this territory without turning the experience into generic tourism.',
    },

    territory: {
      eyebrow: 'Experience the entire Rio Negro',
      title:
        'Nature, culture and stories across the territory.',
      description:
        'The Rio Negro goes far beyond a single destination. ERN connects landscapes, festivals, communities, rivers, archipelagos and experiences that help tell the identity of Barcelos, Novo Airão and this entire Amazonian region.',
      unsure: 'Not sure where to begin?',
      unsureDescription:
        'Tell the Concierge what kind of experience you are looking for and ERN can help organize possibilities across the territory.',
      conciergeButton: 'Plan with the Concierge',
    },

    territories: [
      {
        id: 'serra-araca',
        local: 'Barcelos',
        titulo: 'Serra do Aracá',
        descricao:
          'Expeditions, monumental landscapes and one of the most remarkable natural experiences in the Rio Negro territory.',
        imagem: '/images/serra-araca.jpg',
        acao: 'Discover',
      },
      {
        id: 'mariua',
        local: 'Barcelos',
        titulo: 'Mariuá Archipelago',
        descricao:
          'Islands, channels and black waters create a unique landscape in the Barcelos region.',
        imagem: '/images/mariua.jpg',
        acao: 'Discover',
      },
      {
        id: 'jau',
        local: 'Rio Negro',
        titulo: 'Jaú National Park',
        descricao:
          'Forest, rivers and biodiversity within one of the great protected natural areas connected to the region.',
        imagem: '/images/jau.jpg',
        acao: 'Discover',
      },
      {
        id: 'anavilhanas',
        local: 'Novo Airão',
        titulo: 'Anavilhanas',
        descricao:
          'Islands, channels and landscapes that turn navigation on the Rio Negro into an experience of discovery.',
        imagem: '/images/anavilhanas.jpg',
        acao: 'Discover',
      },
      {
        id: 'festival-peixe-ornamental',
        local: 'Culture • Barcelos',
        titulo: 'Ornamental Fish Festival',
        descricao:
          'A popular celebration connecting tradition, cultural identity and tourism in Barcelos.',
        imagem:
          '/images/festival-peixe-ornamental.jpg',
        acao: 'Discover the story',
      },
      {
        id: 'festival-peixe-boi',
        local: 'Culture • Novo Airão',
        titulo: 'Peixe-Boi Festival',
        descricao:
          'A popular cultural event in Novo Airão bringing together celebration, regional identity and tourism on the Rio Negro.',
        imagem: '/images/festival-peixe-boi.jpg',
        acao: 'Discover the story',
      },
    ],

    experiences: {
      eyebrow: 'Experiences',
      title: 'Rio Negro experiences',
      description:
        'Sport fishing, nature, riverside culture, tours and accommodation will form ERN’s showcase of experiences.',
    },

    network: {
      eyebrow: 'Encantos Network',
      title:
        'Built with the people who live the territory.',
      description:
        'Guides, inns, boats, agencies and local operators connected to a tourism experience that is more organized, transparent and closer to those visiting the Rio Negro.',
    },

    management: {
      eyebrow: 'ERN for operators',
      title:
        'The visitor experience in front. Organized operations behind it.',
      description:
        'ERN is also a management platform for tourism professionals: clients, reservations, tours, boats, accommodation, guides, vouchers, finance and partner relationships.',
      button: 'Discover ERN Management',
      modules: [
        'Clients',
        'Reservations',
        'Tours',
        'Accommodation',
        'Boats',
        'Guides',
        'Finance',
        'Vouchers',
      ],
    },

    footer: {
      left: 'ERN Concierge — Barcelos, Amazonas.',
      right: 'Encantos Rio Negro',
    },
  },

  ES: {
    hero: {
      location: 'Río Negro • Barcelos • Amazonas',
      title:
        'Hay una nueva manera de vivir el Río Negro.',
      description:
        'Experiencias, hospedajes e itinerarios por el Río Negro, organizados con tecnología y conocimiento local.',
      description2:
        'ERN conecta a los visitantes con operadores locales y ofrece tecnología para ayudar a quienes trabajan con turismo a organizar clientes, reservas, experiencias y operaciones en un solo lugar.',
      plan: 'Planificar mi viaje',
      explore: 'Explorar el Río Negro',
      localService: 'Atención local',
      personalized: 'Planificación personalizada',
      connectedOperators: 'Operadores conectados',
      discover: 'Descubre',
    },

    concierge: {
      title: 'Concierge Encantos',
      status: 'Planificación inteligente',
      question:
        '¿Cómo imaginas tu viaje por el Río Negro?',
      description:
        'Elige un interés o cuéntanos brevemente qué buscas.',
      placeholder:
        'Ej.: Quiero conocer Barcelos en octubre...',
      button: 'Comenzar planificación',
      disclaimer:
        'La disponibilidad y los valores se confirman con operadores locales.',
    },

    interests: [
      {
        id: 'pesca',
        label: 'Pesca deportiva',
        emoji: '🎣',
      },
      {
        id: 'natureza',
        label: 'Naturaleza',
        emoji: '🌿',
      },
      {
        id: 'cultura',
        label: 'Cultura y comunidades',
        emoji: '🛶',
      },
      {
        id: 'hospedagem',
        label: 'Hospedaje',
        emoji: '🏨',
      },
      {
        id: 'descobrir',
        label: 'Todavía no lo sé',
        emoji: '✦',
      },
    ],

    discovery: {
      eyebrow: 'Descubre el territorio',
      title:
        'Una Amazonía que no cabe en un catálogo.',
      description:
        'Barcelos es una puerta de entrada a ríos, islas, playas, pesca, comunidades y paisajes que cambian con el ciclo de las aguas. ERN nace para acercar al visitante a este territorio sin transformar la experiencia en turismo genérico.',
    },

    territory: {
      eyebrow: 'Vive el Río Negro por completo',
      title:
        'Naturaleza, cultura e historias que atraviesan el territorio.',
      description:
        'El Río Negro va mucho más allá de un único destino. ERN conecta paisajes, fiestas, comunidades, ríos, archipiélagos y experiencias que ayudan a contar la identidad de Barcelos, Novo Airão y toda esta región amazónica.',
      unsure: '¿No sabes por dónde empezar?',
      unsureDescription:
        'Cuéntale al Concierge qué tipo de experiencia buscas y ERN te ayuda a organizar posibilidades por el territorio.',
      conciergeButton: 'Planificar con el Concierge',
    },

    territories: [
      {
        id: 'serra-araca',
        local: 'Barcelos',
        titulo: 'Serra do Aracá',
        descricao:
          'Expediciones, paisajes monumentales y una de las experiencias naturales más destacadas del territorio del Río Negro.',
        imagem: '/images/serra-araca.jpg',
        acao: 'Descubrir',
      },
      {
        id: 'mariua',
        local: 'Barcelos',
        titulo: 'Archipiélago de Mariuá',
        descricao:
          'Islas, canales y aguas negras forman un paisaje singular en la región de Barcelos.',
        imagem: '/images/mariua.jpg',
        acao: 'Descubrir',
      },
      {
        id: 'jau',
        local: 'Río Negro',
        titulo: 'Parque Nacional del Jaú',
        descricao:
          'Bosque, ríos y biodiversidad en una de las grandes áreas naturales protegidas conectadas con la región.',
        imagem: '/images/jau.jpg',
        acao: 'Descubrir',
      },
      {
        id: 'anavilhanas',
        local: 'Novo Airão',
        titulo: 'Anavilhanas',
        descricao:
          'Islas, canales y paisajes que transforman la navegación por el Río Negro en una experiencia de descubrimiento.',
        imagem: '/images/anavilhanas.jpg',
        acao: 'Descubrir',
      },
      {
        id: 'festival-peixe-ornamental',
        local: 'Cultura • Barcelos',
        titulo: 'Festival del Pez Ornamental',
        descricao:
          'Una celebración popular que conecta tradición, identidad cultural y turismo en Barcelos.',
        imagem:
          '/images/festival-peixe-ornamental.jpg',
        acao: 'Conocer la historia',
      },
      {
        id: 'festival-peixe-boi',
        local: 'Cultura • Novo Airão',
        titulo: 'Festival del Peixe-Boi',
        descricao:
          'Un evento cultural popular de Novo Airão que reúne fiesta, identidad regional y turismo en el Río Negro.',
        imagem: '/images/festival-peixe-boi.jpg',
        acao: 'Conocer la historia',
      },
    ],

    experiences: {
      eyebrow: 'Experiencias',
      title: 'Experiencias del Río Negro',
      description:
        'Pesca deportiva, naturaleza, cultura ribereña, paseos y hospedajes formarán la vitrina de experiencias de ERN.',
    },

    network: {
      eyebrow: 'Red Encantos',
      title:
        'Construida con quienes viven el territorio.',
      description:
        'Guías, posadas, embarcaciones, agencias y operadores locales conectados a una experiencia turística más organizada, transparente y cercana a quienes visitan el Río Negro.',
    },

    management: {
      eyebrow: 'ERN para operadores',
      title:
        'La experiencia del visitante al frente. La operación organizada por detrás.',
      description:
        'ERN también es una plataforma de gestión para quienes trabajan con turismo: clientes, reservas, paseos, embarcaciones, hospedajes, guías, vouchers, finanzas y relación con socios.',
      button: 'Conocer ERN Gestión',
      modules: [
        'Clientes',
        'Reservas',
        'Paseos',
        'Hospedajes',
        'Embarcaciones',
        'Guías',
        'Finanzas',
        'Vouchers',
      ],
    },

    footer: {
      left: 'ERN Concierge — Barcelos, Amazonas.',
      right: 'Encantos Rio Negro',
    },
  },
} satisfies Record<Idioma, unknown>;

export type HomeTranslation =
  (typeof homeTranslations)['PT'];
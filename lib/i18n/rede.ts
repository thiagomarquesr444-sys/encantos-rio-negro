import type { Idioma } from '@/lib/i18n/types';

export const redeTranslations = {
  PT: {
    hero: {
      eyebrow: 'Rede Encantos',
      title:
        'Quem vive o território também faz parte da experiência.',
      description:
        'A Rede Encantos conecta visitantes a operadores, guias, hospedagens, embarcações, agências e experiências ligadas ao Rio Negro.',
      explore: 'Explorar a rede',
      join: 'Fazer parte da ERN',
      sideEyebrow: 'Rede antes de marketplace',
      sideTitle:
        'A ERN não precisa inventar oferta. Ela precisa organizar quem realmente faz o turismo acontecer.',
      sideDescription:
        'As empresas e profissionais aparecerão conforme forem cadastrados, validados e integrados à plataforma.',
    },

    intro: {
      eyebrow: 'Uma rede operacional',
      title:
        'Não é apenas uma lista de empresas.',
      paragraph1:
        'O objetivo da Rede Encantos é aproximar descoberta, atendimento e operação. Quando o visitante demonstra interesse, a plataforma pode identificar quem possui relação com aquela necessidade.',
      paragraph2:
        'Conforme a plataforma evoluir, cada perfil poderá apresentar informações reais, serviços disponíveis e caminhos de contato ou atendimento.',
    },

    flow: {
      eyebrow: 'Como a rede se conecta',
      title:
        'Do interesse do visitante à operação real.',

      items: [
        {
          numero: '01',
          titulo: 'Descoberta',
          descricao:
            'O visitante conhece destinos, experiências e possibilidades da região.',
        },
        {
          numero: '02',
          titulo: 'Contexto',
          descricao:
            'O Concierge ajuda a entender perfil, período, interesse e necessidade.',
        },
        {
          numero: '03',
          titulo: 'Conexão',
          descricao:
            'A ERN aproxima o visitante de quem realmente pode atender aquela demanda.',
        },
        {
          numero: '04',
          titulo: 'Operação',
          descricao:
            'O atendimento pode seguir para reserva e gestão dentro da estrutura da ERN.',
        },
      ],
    },

    explore: {
      eyebrow: 'Explore a rede',
      title:
        'Encontre a estrutura por trás da viagem.',
      description:
        'Nesta fase, mostramos as categorias que formarão a rede. Os perfis reais serão integrados posteriormente, sem inventar operadores ou disponibilidade.',
      searchPlaceholder:
        'Buscar na Rede Encantos...',
      resultSingular: 'categoria encontrada',
      resultPlural: 'categorias encontradas',
      emptyTitle: 'Nenhum resultado encontrado.',
      emptyDescription:
        'Tente outra categoria ou termo de busca.',
      clear: 'Limpar filtros',
      forming: 'Rede em formação',
      realProfiles:
        'Perfis reais serão adicionados',
      soon: 'Em breve',
    },

    categories: {
      todos: 'Toda a rede',
      operadores: 'Operadores',
      guias: 'Guias',
      hospedagens: 'Hospedagens',
      embarcacoes: 'Embarcações',
      agencias: 'Agências',
      experiencias: 'Experiências',
    },

    members: {
      operadores: {
        nome: 'Operadores locais',
        local: 'Rio Negro',
        descricao:
          'Empresas responsáveis por transformar interesse em operação real, organizando logística, atendimento e experiências.',
      },

      guias: {
        nome: 'Guias do território',
        local: 'Rio Negro',
        descricao:
          'Profissionais com conhecimento local que ajudam o visitante a compreender e viver o território com contexto.',
      },

      hospedagens: {
        nome: 'Hospedagens',
        local: 'Barcelos • Novo Airão',
        descricao:
          'Pousadas, hotéis e outras estruturas que poderão ser integradas ao planejamento da viagem.',
      },

      embarcacoes: {
        nome: 'Embarcações',
        local: 'Rio Negro',
        descricao:
          'Barcos e estruturas fluviais fundamentais para deslocamentos, passeios e expedições.',
      },

      agencias: {
        nome: 'Agências de turismo',
        local: 'Amazonas',
        descricao:
          'Empresas que poderão utilizar a ERN para atendimento, organização de clientes e operação turística.',
      },

      experiencias: {
        nome: 'Experiências locais',
        local: 'Rio Negro',
        descricao:
          'Pesca, navegação, natureza, cultura, gastronomia e outras atividades conectadas ao território.',
      },
    },

    join: {
      eyebrow: 'Faça parte',
      title:
        'A rede cresce junto com quem opera o território.',
      description:
        'A ERN não precisa começar com milhares de empresas. Precisa começar com operações reais e informações confiáveis.',

      profiles: [
        {
          titulo: 'Agências e operadores',
          descricao:
            'Organize clientes, reservas, experiências, hospedagens, embarcações e operação.',
        },
        {
          titulo: 'Pousadas e hotéis',
          descricao:
            'Faça parte da descoberta do visitante e integre sua hospedagem às viagens organizadas pela rede.',
        },
        {
          titulo: 'Guias',
          descricao:
            'Apresente experiência, conhecimento local, idiomas e disponibilidade para futuras conexões.',
        },
        {
          titulo: 'Embarcações',
          descricao:
            'Integre barcos e serviços fluviais às operações que dependem da navegação pelo território.',
        },
      ],
    },

    difference: {
      eyebrow: 'O diferencial da ERN',
      title:
        'Rede pública na frente. Gestão integrada por trás.',
      description:
        'A mesma plataforma que ajuda o visitante a descobrir possibilidades também poderá organizar clientes, reservas, passeios, hospedagens, embarcações, guias, parceiros e financeiro na operação privada.',
      button: 'Conhecer a ERN Gestão',

      publicLabel: 'Face pública',
      publicTitle: 'Descobrir e planejar.',
      publicDescription:
        'Destinos, experiências, rede e Concierge.',

      managementLabel: 'Face de gestão',
      managementTitle: 'Atender e operar.',
      managementDescription:
        'Clientes, reservas, operação e financeiro.',
    },

    finalCta: {
      eyebrow: 'Planeje com contexto',
      title:
        'Não encontrou uma empresa ainda? Comece pela experiência que procura.',
      description:
        'O Concierge pode ajudar a organizar sua intenção de viagem antes de qualquer confirmação com operadores.',
      button: 'Planejar viagem',
    },
  },

  EN: {
    hero: {
      eyebrow: 'Encantos Network',
      title:
        'The people who live the territory are also part of the experience.',
      description:
        'The Encantos Network connects visitors with operators, guides, accommodation, boats, agencies and experiences linked to the Rio Negro.',
      explore: 'Explore the network',
      join: 'Join ERN',
      sideEyebrow: 'Network before marketplace',
      sideTitle:
        'ERN does not need to invent supply. It needs to organize the people who actually make tourism happen.',
      sideDescription:
        'Companies and professionals will appear as they are registered, validated and integrated into the platform.',
    },

    intro: {
      eyebrow: 'An operational network',
      title:
        'It is more than a list of companies.',
      paragraph1:
        'The purpose of the Encantos Network is to connect discovery, service and operation. When visitors show interest, the platform can identify who is related to that specific need.',
      paragraph2:
        'As the platform evolves, each profile will be able to present real information, available services and contact or service options.',
    },

    flow: {
      eyebrow: 'How the network connects',
      title:
        'From visitor interest to real operation.',

      items: [
        {
          numero: '01',
          titulo: 'Discovery',
          descricao:
            'Visitors discover destinations, experiences and possibilities across the region.',
        },
        {
          numero: '02',
          titulo: 'Context',
          descricao:
            'The Concierge helps understand profile, travel period, interests and needs.',
        },
        {
          numero: '03',
          titulo: 'Connection',
          descricao:
            'ERN connects visitors with the people who can actually meet that demand.',
        },
        {
          numero: '04',
          titulo: 'Operation',
          descricao:
            'Service can continue into reservation and management within the ERN structure.',
        },
      ],
    },

    explore: {
      eyebrow: 'Explore the network',
      title:
        'Discover the structure behind the journey.',
      description:
        'At this stage, we show the categories that will form the network. Real profiles will be integrated later without inventing operators or availability.',
      searchPlaceholder:
        'Search the Encantos Network...',
      resultSingular: 'category found',
      resultPlural: 'categories found',
      emptyTitle: 'No results found.',
      emptyDescription:
        'Try another category or search term.',
      clear: 'Clear filters',
      forming: 'Network forming',
      realProfiles:
        'Real profiles will be added',
      soon: 'Coming soon',
    },

    categories: {
      todos: 'Entire network',
      operadores: 'Operators',
      guias: 'Guides',
      hospedagens: 'Accommodation',
      embarcacoes: 'Boats',
      agencias: 'Agencies',
      experiencias: 'Experiences',
    },

    members: {
      operadores: {
        nome: 'Local operators',
        local: 'Rio Negro',
        descricao:
          'Companies responsible for turning visitor interest into real operations by organizing logistics, service and experiences.',
      },

      guias: {
        nome: 'Local guides',
        local: 'Rio Negro',
        descricao:
          'Professionals with local knowledge who help visitors understand and experience the territory with context.',
      },

      hospedagens: {
        nome: 'Accommodation',
        local: 'Barcelos • Novo Airão',
        descricao:
          'Inns, hotels and other structures that can become part of complete travel planning.',
      },

      embarcacoes: {
        nome: 'Boats',
        local: 'Rio Negro',
        descricao:
          'Boats and river structures essential for transportation, tours and expeditions.',
      },

      agencias: {
        nome: 'Travel agencies',
        local: 'Amazonas',
        descricao:
          'Companies that can use ERN for customer service, client organization and tourism operations.',
      },

      experiencias: {
        nome: 'Local experiences',
        local: 'Rio Negro',
        descricao:
          'Fishing, navigation, nature, culture, gastronomy and other activities connected to the territory.',
      },
    },

    join: {
      eyebrow: 'Join the network',
      title:
        'The network grows together with the people who operate in the territory.',
      description:
        'ERN does not need to begin with thousands of companies. It needs to begin with real operations and reliable information.',

      profiles: [
        {
          titulo: 'Agencies and operators',
          descricao:
            'Organize clients, reservations, experiences, accommodation, boats and operations.',
        },
        {
          titulo: 'Inns and hotels',
          descricao:
            'Become part of the visitor discovery journey and integrate your accommodation into trips organized through the network.',
        },
        {
          titulo: 'Guides',
          descricao:
            'Present experience, local knowledge, languages and availability for future connections.',
        },
        {
          titulo: 'Boats',
          descricao:
            'Connect boats and river services to operations that depend on navigation through the territory.',
        },
      ],
    },

    difference: {
      eyebrow: 'What makes ERN different',
      title:
        'Public network in front. Integrated management behind it.',
      description:
        'The same platform that helps visitors discover possibilities can also organize clients, reservations, tours, accommodation, boats, guides, partners and finance within the private operation.',
      button: 'Discover ERN Management',

      publicLabel: 'Public side',
      publicTitle: 'Discover and plan.',
      publicDescription:
        'Destinations, experiences, network and Concierge.',

      managementLabel: 'Management side',
      managementTitle: 'Serve and operate.',
      managementDescription:
        'Clients, reservations, operations and finance.',
    },

    finalCta: {
      eyebrow: 'Plan with context',
      title:
        'Have you not found a company yet? Start with the experience you are looking for.',
      description:
        'The Concierge can help organize your travel intention before any confirmation with operators.',
      button: 'Plan my trip',
    },
  },

  ES: {
    hero: {
      eyebrow: 'Red Encantos',
      title:
        'Quienes viven el territorio también forman parte de la experiencia.',
      description:
        'La Red Encantos conecta visitantes con operadores, guías, hospedajes, embarcaciones, agencias y experiencias vinculadas al Río Negro.',
      explore: 'Explorar la red',
      join: 'Formar parte de ERN',
      sideEyebrow: 'Red antes que marketplace',
      sideTitle:
        'ERN no necesita inventar oferta. Necesita organizar a quienes realmente hacen que el turismo suceda.',
      sideDescription:
        'Las empresas y profesionales aparecerán a medida que sean registrados, validados e integrados a la plataforma.',
    },

    intro: {
      eyebrow: 'Una red operativa',
      title:
        'No es solamente una lista de empresas.',
      paragraph1:
        'El objetivo de la Red Encantos es acercar descubrimiento, atención y operación. Cuando el visitante demuestra interés, la plataforma puede identificar quién está relacionado con esa necesidad.',
      paragraph2:
        'A medida que la plataforma evolucione, cada perfil podrá presentar información real, servicios disponibles y opciones de contacto o atención.',
    },

    flow: {
      eyebrow: 'Cómo se conecta la red',
      title:
        'Del interés del visitante a la operación real.',

      items: [
        {
          numero: '01',
          titulo: 'Descubrimiento',
          descricao:
            'El visitante conoce destinos, experiencias y posibilidades de la región.',
        },
        {
          numero: '02',
          titulo: 'Contexto',
          descricao:
            'El Concierge ayuda a comprender el perfil, período, interés y necesidad.',
        },
        {
          numero: '03',
          titulo: 'Conexión',
          descricao:
            'ERN acerca al visitante a quienes realmente pueden atender esa demanda.',
        },
        {
          numero: '04',
          titulo: 'Operación',
          descricao:
            'La atención puede continuar hacia la reserva y gestión dentro de la estructura ERN.',
        },
      ],
    },

    explore: {
      eyebrow: 'Explora la red',
      title:
        'Descubre la estructura detrás del viaje.',
      description:
        'En esta fase mostramos las categorías que formarán la red. Los perfiles reales se integrarán posteriormente, sin inventar operadores ni disponibilidad.',
      searchPlaceholder:
        'Buscar en la Red Encantos...',
      resultSingular: 'categoría encontrada',
      resultPlural: 'categorías encontradas',
      emptyTitle:
        'No se encontraron resultados.',
      emptyDescription:
        'Prueba otra categoría o término de búsqueda.',
      clear: 'Limpiar filtros',
      forming: 'Red en formación',
      realProfiles:
        'Se añadirán perfiles reales',
      soon: 'Próximamente',
    },

    categories: {
      todos: 'Toda la red',
      operadores: 'Operadores',
      guias: 'Guías',
      hospedagens: 'Hospedajes',
      embarcacoes: 'Embarcaciones',
      agencias: 'Agencias',
      experiencias: 'Experiencias',
    },

    members: {
      operadores: {
        nome: 'Operadores locales',
        local: 'Río Negro',
        descricao:
          'Empresas responsables de transformar el interés en una operación real, organizando logística, atención y experiencias.',
      },

      guias: {
        nome: 'Guías del territorio',
        local: 'Río Negro',
        descricao:
          'Profesionales con conocimiento local que ayudan al visitante a comprender y vivir el territorio con contexto.',
      },

      hospedagens: {
        nome: 'Hospedajes',
        local: 'Barcelos • Novo Airão',
        descricao:
          'Posadas, hoteles y otras estructuras que podrán integrarse a la planificación del viaje.',
      },

      embarcacoes: {
        nome: 'Embarcaciones',
        local: 'Río Negro',
        descricao:
          'Barcos y estructuras fluviales fundamentales para desplazamientos, paseos y expediciones.',
      },

      agencias: {
        nome: 'Agencias de turismo',
        local: 'Amazonas',
        descricao:
          'Empresas que podrán utilizar ERN para atención, organización de clientes y operación turística.',
      },

      experiencias: {
        nome: 'Experiencias locales',
        local: 'Río Negro',
        descricao:
          'Pesca, navegación, naturaleza, cultura, gastronomía y otras actividades conectadas con el territorio.',
      },
    },

    join: {
      eyebrow: 'Forma parte',
      title:
        'La red crece junto con quienes operan el territorio.',
      description:
        'ERN no necesita comenzar con miles de empresas. Necesita comenzar con operaciones reales e información confiable.',

      profiles: [
        {
          titulo: 'Agencias y operadores',
          descricao:
            'Organiza clientes, reservas, experiencias, hospedajes, embarcaciones y operación.',
        },
        {
          titulo: 'Posadas y hoteles',
          descricao:
            'Forma parte del descubrimiento del visitante e integra tu hospedaje a los viajes organizados por la red.',
        },
        {
          titulo: 'Guías',
          descricao:
            'Presenta experiencia, conocimiento local, idiomas y disponibilidad para futuras conexiones.',
        },
        {
          titulo: 'Embarcaciones',
          descricao:
            'Integra barcos y servicios fluviales a operaciones que dependen de la navegación por el territorio.',
        },
      ],
    },

    difference: {
      eyebrow: 'El diferencial de ERN',
      title:
        'Red pública al frente. Gestión integrada por detrás.',
      description:
        'La misma plataforma que ayuda al visitante a descubrir posibilidades también podrá organizar clientes, reservas, paseos, hospedajes, embarcaciones, guías, socios y finanzas dentro de la operación privada.',
      button: 'Conocer ERN Gestión',

      publicLabel: 'Cara pública',
      publicTitle: 'Descubrir y planificar.',
      publicDescription:
        'Destinos, experiencias, red y Concierge.',

      managementLabel: 'Cara de gestión',
      managementTitle: 'Atender y operar.',
      managementDescription:
        'Clientes, reservas, operación y finanzas.',
    },

    finalCta: {
      eyebrow: 'Planifica con contexto',
      title:
        '¿Todavía no encontraste una empresa? Comienza por la experiencia que buscas.',
      description:
        'El Concierge puede ayudar a organizar tu intención de viaje antes de cualquier confirmación con operadores.',
      button: 'Planificar viaje',
    },
  },
} satisfies Record<Idioma, unknown>;

export type RedeTranslation =
  (typeof redeTranslations)['PT'];
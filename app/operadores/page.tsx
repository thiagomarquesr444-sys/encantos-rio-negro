'use client';

import Link from 'next/link';

import PublicHeader from '@/app/components/PublicHeader';

import {
  useLanguage,
  type Idioma,
} from '@/app/components/LanguageProvider';

const textos = {
  PT: {
    hero: {
      eyebrow: 'ERN Gestão',
      title:
        'Você cuida da experiência. A ERN ajuda a organizar a operação.',
      description:
        'Uma plataforma de gestão criada para aproximar operadores, agências, pousadas, guias e embarcações de uma operação mais organizada — conectada à experiência do turista no Rio Negro.',
      description2:
        'A ERN une uma vitrine pública para o visitante com uma estrutura privada de gestão para quem faz o turismo acontecer.',
      login: 'Entrar na plataforma',
      how: 'Entender como funciona',
      tags: [
        'Clientes',
        'Reservas',
        'Passeios',
        'Hospedagens',
        'Financeiro',
        'Parceiros',
      ],
    },

    preview: {
      eyebrow: 'Plataforma ERN',
      title: 'Gestão em um só ambiente.',
      previewTitle: 'Preview da nova ERN Gestão',
      previewDescription:
        'Este espaço receberá a imagem real da nova interface depois da remodelação da Face 2.',
      tabs: [
        'Dashboard',
        'Reservas',
        'Financeiro',
        'Operação',
      ],
    },

    positioning: {
      eyebrow: 'Mais que um portal turístico',
      title:
        'O diferencial está na conexão entre quem visita e quem opera.',
      paragraph1:
        'A ERN foi pensada para criar uma jornada contínua. O visitante pode descobrir destinos e experiências, conversar com o Concierge e, quando houver uma operação disponível, ser conectado ao operador certo.',
      paragraph2:
        'Do outro lado, a empresa utiliza uma plataforma de gestão para organizar os dados que sustentam essa experiência.',
    },

    flowSection: {
      eyebrow: 'Da descoberta à operação',
      title:
        'Uma jornada pensada para os dois lados do turismo.',
    },

    flow: [
      {
        etapa: 'Descoberta',
        texto:
          'O visitante conhece destinos, cultura, experiências e serviços da região.',
      },
      {
        etapa: 'Interesse',
        texto:
          'O Concierge identifica preferências, período, perfil da viagem e intenção.',
      },
      {
        etapa: 'Conexão',
        texto:
          'A demanda pode ser direcionada para quem realmente opera aquela experiência.',
      },
      {
        etapa: 'Gestão',
        texto:
          'A empresa organiza cliente, reserva, operação e movimentações dentro da ERN.',
      },
    ],

    modulesSection: {
      eyebrow: 'ERN Gestão',
      title:
        'Uma estrutura para organizar a operação turística.',
      description:
        'Os módulos são integrados à mesma base operacional e continuarão evoluindo conforme a ERN amadurece e novas demandas reais forem incorporadas.',
    },

    modules: [
      {
        titulo: 'Clientes',
        descricao:
          'Centralize contatos, histórico, observações e informações essenciais dos viajantes.',
      },
      {
        titulo: 'Reservas',
        descricao:
          'Acompanhe solicitações, confirmações, status, valores e detalhes operacionais.',
      },
      {
        titulo: 'Passeios',
        descricao:
          'Organize roteiros, experiências, categorias, valores e disponibilidade.',
      },
      {
        titulo: 'Hospedagens',
        descricao:
          'Gerencie hotéis, pousadas e opções vinculadas à operação turística.',
      },
      {
        titulo: 'Embarcações',
        descricao:
          'Cadastre barcos, capacidade, situação operacional e uso em reservas.',
      },
      {
        titulo: 'Guias',
        descricao:
          'Organize profissionais, contatos, idiomas, documentação e disponibilidade.',
      },
      {
        titulo: 'Financeiro',
        descricao:
          'Tenha uma visão organizada de receitas, despesas e movimentações.',
      },
      {
        titulo: 'Vouchers',
        descricao:
          'Gere documentos e comprovantes ligados às reservas e experiências.',
      },
      {
        titulo: 'Parceiros',
        descricao:
          'Estruture relações com pousadas, guias, fornecedores e operadores locais.',
      },
    ],

    screensSection: {
      eyebrow: 'Por dentro da plataforma',
      title:
        'A nova interface da ERN Gestão será apresentada aqui.',
      description:
        'Os espaços abaixo já estão preparados para receber capturas reais da Face 2 assim que a nova experiência de gestão estiver pronta.',
      futureImage: 'Imagem futura',
    },

    screens: [
      {
        id: 'dashboard',
        titulo: 'Visão geral da operação',
        descricao:
          'Dashboard com indicadores e acompanhamento da operação.',
        imagem:
          '/images/gestao/gestao-dashboard.jpg',
      },
      {
        id: 'reservas',
        titulo: 'Reservas organizadas',
        descricao:
          'Acompanhamento de reservas, status e informações do atendimento.',
        imagem:
          '/images/gestao/gestao-reservas.jpg',
      },
      {
        id: 'financeiro',
        titulo: 'Controle financeiro',
        descricao:
          'Receitas, despesas e visão financeira da operação.',
        imagem:
          '/images/gestao/gestao-financeiro.jpg',
      },
      {
        id: 'operacao',
        titulo: 'Operação integrada',
        descricao:
          'Clientes, hospedagens, embarcações, guias e demais módulos conectados.',
        imagem:
          '/images/gestao/gestao-operacao.jpg',
      },
    ],

    differencesSection: {
      eyebrow: 'O que torna a ERN diferente',
      title:
        'Tecnologia pensada a partir da realidade de quem trabalha no território.',
    },

    differences: [
      {
        numero: '01',
        titulo:
          'Gestão conectada à experiência do turista',
        descricao:
          'A ERN aproxima a descoberta pública da operação real. O visitante conhece o território, manifesta interesse e pode ser conectado a quem realmente oferece aquela experiência.',
      },
      {
        numero: '02',
        titulo:
          'Plataforma pensada para turismo local',
        descricao:
          'A estrutura nasce da realidade de agências, pousadas, guias, embarcações e operadores que atuam diretamente no Rio Negro.',
      },
      {
        numero: '03',
        titulo: 'Concierge como ponte',
        descricao:
          'O atendimento inteligente ajuda a organizar o contexto inicial do turista antes da confirmação final de disponibilidade, valores e reservas.',
      },
      {
        numero: '04',
        titulo: 'Operação centralizada',
        descricao:
          'Clientes, reservas, passeios, hospedagens, financeiro e parceiros deixam de ficar espalhados em várias ferramentas.',
      },
    ],

    concierge: {
      eyebrow: 'Concierge inteligente',
      title:
        'Atendimento antes da reserva. Contexto antes da venda.',
      description:
        'O Concierge ajuda a identificar interesse, período, perfil da viagem e necessidades iniciais. A confirmação final continua dependendo da operação real e da disponibilidade de cada prestador.',
      items: [
        'Entender o interesse do visitante',
        'Organizar informações iniciais da viagem',
        'Reduzir atendimento repetitivo',
        'Encaminhar oportunidades para a operação',
        'Atender em diferentes idiomas',
      ],
    },

    finalCta: {
      eyebrow: 'Encantos Rio Negro',
      title:
        'O turismo acontece no território. A gestão não precisa ficar espalhada.',
      description:
        'Entre na plataforma e acompanhe a evolução da ERN Gestão.',
      login: 'Entrar na plataforma',
      tourist: 'Ver experiência do turista',
    },

    footer: {
      left: 'ERN Gestão — Encantos Rio Negro.',
      right: 'Barcelos • Amazonas',
    },
  },

  EN: {
    hero: {
      eyebrow: 'ERN Management',
      title:
        'You take care of the experience. ERN helps organize the operation.',
      description:
        'A management platform designed to bring operators, agencies, inns, guides and boats into a more organized operation — connected to the visitor experience on the Rio Negro.',
      description2:
        'ERN combines a public showcase for visitors with a private management structure for the people who make tourism happen.',
      login: 'Access the platform',
      how: 'See how it works',
      tags: [
        'Clients',
        'Reservations',
        'Tours',
        'Accommodation',
        'Finance',
        'Partners',
      ],
    },

    preview: {
      eyebrow: 'ERN Platform',
      title: 'Management in one environment.',
      previewTitle:
        'Preview of the new ERN Management',
      previewDescription:
        'This space will receive a real image of the new interface after the redesign of the management side.',
      tabs: [
        'Dashboard',
        'Reservations',
        'Finance',
        'Operation',
      ],
    },

    positioning: {
      eyebrow: 'More than a tourism portal',
      title:
        'The difference lies in connecting visitors with the people who operate.',
      paragraph1:
        'ERN was designed to create a continuous journey. Visitors can discover destinations and experiences, talk to the Concierge and, when an operation is available, be connected to the right operator.',
      paragraph2:
        'On the other side, the company uses a management platform to organize the data that supports that experience.',
    },

    flowSection: {
      eyebrow: 'From discovery to operation',
      title:
        'A journey designed for both sides of tourism.',
    },

    flow: [
      {
        etapa: 'Discovery',
        texto:
          'Visitors discover destinations, culture, experiences and services in the region.',
      },
      {
        etapa: 'Interest',
        texto:
          'The Concierge identifies preferences, travel period, profile and intent.',
      },
      {
        etapa: 'Connection',
        texto:
          'Demand can be directed to the people who actually operate that experience.',
      },
      {
        etapa: 'Management',
        texto:
          'The company organizes clients, reservations, operations and transactions within ERN.',
      },
    ],

    modulesSection: {
      eyebrow: 'ERN Management',
      title:
        'A structure designed to organize tourism operations.',
      description:
        'The modules are integrated into the same operational base and will continue to evolve as ERN matures and real new demands are incorporated.',
    },

    modules: [
      {
        titulo: 'Clients',
        descricao:
          'Centralize contacts, history, notes and essential traveler information.',
      },
      {
        titulo: 'Reservations',
        descricao:
          'Track requests, confirmations, status, values and operational details.',
      },
      {
        titulo: 'Tours',
        descricao:
          'Organize itineraries, experiences, categories, prices and availability.',
      },
      {
        titulo: 'Accommodation',
        descricao:
          'Manage hotels, inns and accommodation options connected to tourism operations.',
      },
      {
        titulo: 'Boats',
        descricao:
          'Register boats, capacity, operational status and their use in reservations.',
      },
      {
        titulo: 'Guides',
        descricao:
          'Organize professionals, contacts, languages, documents and availability.',
      },
      {
        titulo: 'Finance',
        descricao:
          'Keep an organized view of revenue, expenses and financial activity.',
      },
      {
        titulo: 'Vouchers',
        descricao:
          'Generate documents and confirmations linked to reservations and experiences.',
      },
      {
        titulo: 'Partners',
        descricao:
          'Structure relationships with inns, guides, suppliers and local operators.',
      },
    ],

    screensSection: {
      eyebrow: 'Inside the platform',
      title:
        'The new ERN Management interface will be presented here.',
      description:
        'The spaces below are already prepared to receive real screenshots of the management side once the new experience is ready.',
      futureImage: 'Future image',
    },

    screens: [
      {
        id: 'dashboard',
        titulo: 'Operation overview',
        descricao:
          'Dashboard with indicators and operational monitoring.',
        imagem:
          '/images/gestao/gestao-dashboard.jpg',
      },
      {
        id: 'reservas',
        titulo: 'Organized reservations',
        descricao:
          'Track reservations, status and service information.',
        imagem:
          '/images/gestao/gestao-reservas.jpg',
      },
      {
        id: 'financeiro',
        titulo: 'Financial control',
        descricao:
          'Revenue, expenses and financial overview of the operation.',
        imagem:
          '/images/gestao/gestao-financeiro.jpg',
      },
      {
        id: 'operacao',
        titulo: 'Integrated operation',
        descricao:
          'Clients, accommodation, boats, guides and other connected modules.',
        imagem:
          '/images/gestao/gestao-operacao.jpg',
      },
    ],

    differencesSection: {
      eyebrow: 'What makes ERN different',
      title:
        'Technology designed around the reality of the people who work in the territory.',
    },

    differences: [
      {
        numero: '01',
        titulo:
          'Management connected to the visitor experience',
        descricao:
          'ERN brings public discovery closer to real operations. Visitors discover the territory, express interest and can be connected to the people who actually offer that experience.',
      },
      {
        numero: '02',
        titulo:
          'A platform designed for local tourism',
        descricao:
          'The structure is based on the reality of agencies, inns, guides, boats and operators working directly on the Rio Negro.',
      },
      {
        numero: '03',
        titulo: 'Concierge as a bridge',
        descricao:
          'Intelligent service helps organize the visitor’s initial context before final confirmation of availability, prices and reservations.',
      },
      {
        numero: '04',
        titulo: 'Centralized operation',
        descricao:
          'Clients, reservations, tours, accommodation, finance and partners no longer need to be scattered across different tools.',
      },
    ],

    concierge: {
      eyebrow: 'Intelligent Concierge',
      title:
        'Service before reservation. Context before the sale.',
      description:
        'The Concierge helps identify interests, travel period, profile and initial needs. Final confirmation still depends on the real operation and each provider’s availability.',
      items: [
        'Understand visitor interests',
        'Organize initial travel information',
        'Reduce repetitive service',
        'Route opportunities to operations',
        'Serve visitors in different languages',
      ],
    },

    finalCta: {
      eyebrow: 'Encantos Rio Negro',
      title:
        'Tourism happens in the territory. Management does not need to be scattered.',
      description:
        'Access the platform and follow the evolution of ERN Management.',
      login: 'Access the platform',
      tourist: 'See the visitor experience',
    },

    footer: {
      left: 'ERN Management — Encantos Rio Negro.',
      right: 'Barcelos • Amazonas',
    },
  },

  ES: {
    hero: {
      eyebrow: 'ERN Gestión',
      title:
        'Tú cuidas la experiencia. ERN ayuda a organizar la operación.',
      description:
        'Una plataforma de gestión creada para acercar operadores, agencias, posadas, guías y embarcaciones a una operación más organizada, conectada con la experiencia del visitante en el Río Negro.',
      description2:
        'ERN combina una vitrina pública para el visitante con una estructura privada de gestión para quienes hacen que el turismo suceda.',
      login: 'Entrar a la plataforma',
      how: 'Entender cómo funciona',
      tags: [
        'Clientes',
        'Reservas',
        'Paseos',
        'Hospedajes',
        'Finanzas',
        'Socios',
      ],
    },

    preview: {
      eyebrow: 'Plataforma ERN',
      title: 'Gestión en un solo entorno.',
      previewTitle:
        'Vista previa de la nueva ERN Gestión',
      previewDescription:
        'Este espacio recibirá la imagen real de la nueva interfaz después de la remodelación de la cara de gestión.',
      tabs: [
        'Dashboard',
        'Reservas',
        'Finanzas',
        'Operación',
      ],
    },

    positioning: {
      eyebrow: 'Más que un portal turístico',
      title:
        'La diferencia está en la conexión entre quien visita y quien opera.',
      paragraph1:
        'ERN fue pensada para crear un recorrido continuo. El visitante puede descubrir destinos y experiencias, conversar con el Concierge y, cuando exista una operación disponible, conectarse con el operador adecuado.',
      paragraph2:
        'Del otro lado, la empresa utiliza una plataforma de gestión para organizar los datos que sostienen esa experiencia.',
    },

    flowSection: {
      eyebrow:
        'Del descubrimiento a la operación',
      title:
        'Un recorrido pensado para ambos lados del turismo.',
    },

    flow: [
      {
        etapa: 'Descubrimiento',
        texto:
          'El visitante conoce destinos, cultura, experiencias y servicios de la región.',
      },
      {
        etapa: 'Interés',
        texto:
          'El Concierge identifica preferencias, período, perfil del viaje e intención.',
      },
      {
        etapa: 'Conexión',
        texto:
          'La demanda puede dirigirse a quienes realmente operan esa experiencia.',
      },
      {
        etapa: 'Gestión',
        texto:
          'La empresa organiza cliente, reserva, operación y movimientos dentro de ERN.',
      },
    ],

    modulesSection: {
      eyebrow: 'ERN Gestión',
      title:
        'Una estructura para organizar la operación turística.',
      description:
        'Los módulos están integrados a la misma base operativa y seguirán evolucionando a medida que ERN madure e incorpore nuevas demandas reales.',
    },

    modules: [
      {
        titulo: 'Clientes',
        descricao:
          'Centraliza contactos, historial, observaciones e información esencial de los viajeros.',
      },
      {
        titulo: 'Reservas',
        descricao:
          'Acompaña solicitudes, confirmaciones, estados, valores y detalles operativos.',
      },
      {
        titulo: 'Paseos',
        descricao:
          'Organiza itinerarios, experiencias, categorías, valores y disponibilidad.',
      },
      {
        titulo: 'Hospedajes',
        descricao:
          'Gestiona hoteles, posadas y opciones vinculadas a la operación turística.',
      },
      {
        titulo: 'Embarcaciones',
        descricao:
          'Registra barcos, capacidad, situación operativa y uso en reservas.',
      },
      {
        titulo: 'Guías',
        descricao:
          'Organiza profesionales, contactos, idiomas, documentación y disponibilidad.',
      },
      {
        titulo: 'Finanzas',
        descricao:
          'Mantén una visión organizada de ingresos, gastos y movimientos.',
      },
      {
        titulo: 'Vouchers',
        descricao:
          'Genera documentos y comprobantes vinculados a reservas y experiencias.',
      },
      {
        titulo: 'Socios',
        descricao:
          'Estructura relaciones con posadas, guías, proveedores y operadores locales.',
      },
    ],

    screensSection: {
      eyebrow: 'Dentro de la plataforma',
      title:
        'La nueva interfaz de ERN Gestión será presentada aquí.',
      description:
        'Los espacios de abajo ya están preparados para recibir capturas reales de la cara de gestión cuando la nueva experiencia esté lista.',
      futureImage: 'Imagen futura',
    },

    screens: [
      {
        id: 'dashboard',
        titulo: 'Visión general de la operación',
        descricao:
          'Dashboard con indicadores y seguimiento de la operación.',
        imagem:
          '/images/gestao/gestao-dashboard.jpg',
      },
      {
        id: 'reservas',
        titulo: 'Reservas organizadas',
        descricao:
          'Seguimiento de reservas, estados e información de atención.',
        imagem:
          '/images/gestao/gestao-reservas.jpg',
      },
      {
        id: 'financeiro',
        titulo: 'Control financiero',
        descricao:
          'Ingresos, gastos y visión financiera de la operación.',
        imagem:
          '/images/gestao/gestao-financeiro.jpg',
      },
      {
        id: 'operacao',
        titulo: 'Operación integrada',
        descricao:
          'Clientes, hospedajes, embarcaciones, guías y demás módulos conectados.',
        imagem:
          '/images/gestao/gestao-operacao.jpg',
      },
    ],

    differencesSection: {
      eyebrow: 'Lo que hace diferente a ERN',
      title:
        'Tecnología pensada a partir de la realidad de quienes trabajan en el territorio.',
    },

    differences: [
      {
        numero: '01',
        titulo:
          'Gestión conectada a la experiencia del visitante',
        descricao:
          'ERN acerca el descubrimiento público a la operación real. El visitante conoce el territorio, demuestra interés y puede ser conectado con quienes realmente ofrecen esa experiencia.',
      },
      {
        numero: '02',
        titulo:
          'Plataforma pensada para turismo local',
        descricao:
          'La estructura nace de la realidad de agencias, posadas, guías, embarcaciones y operadores que trabajan directamente en el Río Negro.',
      },
      {
        numero: '03',
        titulo: 'Concierge como puente',
        descricao:
          'La atención inteligente ayuda a organizar el contexto inicial del visitante antes de la confirmación final de disponibilidad, valores y reservas.',
      },
      {
        numero: '04',
        titulo: 'Operación centralizada',
        descricao:
          'Clientes, reservas, paseos, hospedajes, finanzas y socios dejan de estar dispersos en varias herramientas.',
      },
    ],

    concierge: {
      eyebrow: 'Concierge inteligente',
      title:
        'Atención antes de la reserva. Contexto antes de la venta.',
      description:
        'El Concierge ayuda a identificar interés, período, perfil del viaje y necesidades iniciales. La confirmación final continúa dependiendo de la operación real y de la disponibilidad de cada prestador.',
      items: [
        'Comprender el interés del visitante',
        'Organizar información inicial del viaje',
        'Reducir atención repetitiva',
        'Dirigir oportunidades hacia la operación',
        'Atender en diferentes idiomas',
      ],
    },

    finalCta: {
      eyebrow: 'Encantos Rio Negro',
      title:
        'El turismo sucede en el territorio. La gestión no necesita estar dispersa.',
      description:
        'Entra a la plataforma y acompaña la evolución de ERN Gestión.',
      login: 'Entrar a la plataforma',
      tourist: 'Ver la experiencia del visitante',
    },

    footer: {
      left: 'ERN Gestión — Encantos Rio Negro.',
      right: 'Barcelos • Amazonas',
    },
  },
} satisfies Record<Idioma, unknown>;

export default function OperadoresPage() {
  const { idioma } = useLanguage();

  const t = textos[idioma] as typeof textos.PT;

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[#0B1512] text-[#EDEDE3]"
      style={{
        fontFamily:
          'var(--font-work-sans), sans-serif',
      }}
    >
      <PublicHeader />

      {/* =========================================================
          HERO B2B
      ========================================================== */}

      <section className="relative overflow-hidden border-b border-white/[0.07] bg-[#091510] px-5 pb-24 pt-36 md:px-8 md:pb-32 md:pt-44">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(227,161,68,0.10),transparent_30%),radial-gradient(circle_at_20%_75%,rgba(124,156,135,0.10),transparent_32%)]" />

        <div className="pointer-events-none absolute -right-40 top-20 h-[520px] w-[520px] rounded-full border border-[#E3A144]/10" />

        <div className="pointer-events-none absolute -right-24 top-36 h-[390px] w-[390px] rounded-full border border-[#E3A144]/10" />

        <div className="relative mx-auto grid max-w-[1180px] gap-14 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-9 bg-[#E3A144]" />

              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E3A144]">
                {t.hero.eyebrow}
              </span>
            </div>

            <h1
              className="mt-7 max-w-[760px] text-[clamp(3rem,6vw,5.8rem)] font-medium leading-[0.96] tracking-[-0.04em] text-[#F0F0E8]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              {t.hero.title}
            </h1>

            <p className="mt-8 max-w-[680px] text-base leading-8 text-[#EDEDE3]/65 md:text-lg">
              {t.hero.description}
            </p>

            <p className="mt-4 max-w-[660px] text-sm leading-7 text-[#EDEDE3]/45">
              {t.hero.description2}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-[#E3A144] px-7 text-sm font-bold text-[#07130F] transition hover:-translate-y-0.5 hover:bg-[#F0B35C]"
              >
                {t.hero.login}
              </Link>

              <a
                href="#como-funciona"
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-7 text-sm font-semibold text-[#EDEDE3]/78 transition hover:bg-white/[0.06]"
              >
                {t.hero.how}
                <span>→</span>
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-xs text-[#EDEDE3]/45">
              {t.hero.tags.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>

          {/* =====================================================
              PREVIEW FACE 2
          ====================================================== */}

          <div className="relative mx-auto w-full max-w-[560px] lg:ml-auto">
            <div className="absolute -inset-10 rounded-full bg-[#E3A144]/5 blur-3xl" />

            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0D1B16] shadow-2xl">
              <div className="border-b border-white/[0.07] px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                      {t.preview.eyebrow}
                    </p>

                    <p
                      className="mt-1.5 text-xl text-[#F0F0E8]"
                      style={{
                        fontFamily:
                          'var(--font-fraunces), serif',
                      }}
                    >
                      {t.preview.title}
                    </p>
                  </div>

                  <span className="rounded-full border border-emerald-500/20 bg-emerald-400/10 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                    ERN
                  </span>
                </div>
              </div>

              <div className="relative aspect-[16/10] overflow-hidden bg-[#07110E]">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "url('/images/gestao/gestao-dashboard.jpg')",
                  }}
                />

                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#14261E] via-[#0D1B16] to-[#07110E]">
                  <div className="max-w-[340px] px-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#E3A144]/25 bg-[#E3A144]/10 text-[#E3A144]">
                      ✦
                    </div>

                    <p
                      className="mt-5 text-2xl text-[#F0F0E8]"
                      style={{
                        fontFamily:
                          'var(--font-fraunces), serif',
                      }}
                    >
                      {t.preview.previewTitle}
                    </p>

                    <p className="mt-3 text-sm leading-6 text-[#EDEDE3]/45">
                      {t.preview.previewDescription}
                    </p>
                  </div>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-[#07110E]/55 via-transparent to-transparent" />
              </div>

              <div className="grid grid-cols-4 gap-px border-t border-white/[0.07] bg-white/[0.07]">
                {t.preview.tabs.map((item) => (
                  <div
                    key={item}
                    className="bg-[#0D1B16] px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[#EDEDE3]/40"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          POSICIONAMENTO
      ========================================================== */}

      <section className="border-b border-white/[0.07] bg-[#0B1512] px-5 py-24 md:px-8 md:py-32">
        <div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7C9C87]">
              {t.positioning.eyebrow}
            </span>

            <h2
              className="mt-5 max-w-[480px] text-4xl leading-[1.06] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              {t.positioning.title}
            </h2>
          </div>

          <div className="flex items-end">
            <div className="max-w-[650px]">
              <p className="text-base leading-8 text-[#EDEDE3]/60 md:text-lg">
                {t.positioning.paragraph1}
              </p>

              <p className="mt-5 text-base leading-8 text-[#EDEDE3]/45">
                {t.positioning.paragraph2}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          COMO FUNCIONA
      ========================================================== */}

      <section
        id="como-funciona"
        className="scroll-mt-20 border-b border-white/[0.07] bg-[#0E1A15] px-5 py-24 md:px-8 md:py-32"
      >
        <div className="mx-auto max-w-[1180px]">
          <div className="max-w-[720px]">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
              {t.flowSection.eyebrow}
            </span>

            <h2
              className="mt-5 text-4xl leading-[1.06] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              {t.flowSection.title}
            </h2>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {t.flow.map((item, index) => (
              <article
                key={item.etapa}
                className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0A1713] p-6"
              >
                <span className="absolute right-5 top-4 text-5xl font-semibold text-white/[0.025]">
                  {String(index + 1).padStart(
                    2,
                    '0'
                  )}
                </span>

                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E3A144]/20 bg-[#E3A144]/8 text-xs font-semibold text-[#E3A144]">
                  {String(index + 1).padStart(
                    2,
                    '0'
                  )}
                </div>

                <h3
                  className="mt-7 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  {item.etapa}
                </h3>

                <p className="mt-4 text-sm leading-7 text-[#EDEDE3]/55">
                  {item.texto}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          MÓDULOS
      ========================================================== */}

      <section className="border-b border-white/[0.07] bg-[#0B1512] px-5 py-24 md:px-8 md:py-32">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7C9C87]">
                {t.modulesSection.eyebrow}
              </span>

              <h2
                className="mt-5 max-w-[480px] text-4xl leading-[1.06] text-[#F0F0E8] md:text-5xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {t.modulesSection.title}
              </h2>

              <p className="mt-6 max-w-[500px] text-sm leading-7 text-[#EDEDE3]/50">
                {t.modulesSection.description}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {t.modules.map((modulo) => (
                <article
                  key={modulo.titulo}
                  className="rounded-[22px] border border-white/[0.08] bg-[#0D1B16] p-5 transition hover:-translate-y-0.5 hover:border-[#E3A144]/20"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E3A144]/20 bg-[#E3A144]/8 text-[10px] text-[#E3A144]">
                      ✦
                    </span>

                    <h3 className="text-sm font-semibold text-[#F0F0E8]">
                      {modulo.titulo}
                    </h3>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-[#EDEDE3]/48">
                    {modulo.descricao}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          FUTURAS TELAS REAIS
      ========================================================== */}

      <section className="border-b border-white/[0.07] bg-[#0E1A15] px-5 py-24 md:px-8 md:py-32">
        <div className="mx-auto max-w-[1180px]">
          <div className="max-w-[760px]">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
              {t.screensSection.eyebrow}
            </span>

            <h2
              className="mt-5 text-4xl leading-[1.06] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              {t.screensSection.title}
            </h2>

            <p className="mt-6 max-w-[680px] text-base leading-8 text-[#EDEDE3]/55">
              {t.screensSection.description}
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {t.screens.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0A1713]"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[#07110E]">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: `url('${item.imagem}')`,
                    }}
                  />

                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#14261E] via-[#0D1B16] to-[#07110E]">
                    <div className="px-6 text-center">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#E3A144]/20 bg-[#E3A144]/10 text-[#E3A144]">
                        ✦
                      </div>

                      <p className="mt-4 text-xs uppercase tracking-[0.16em] text-[#EDEDE3]/30">
                        {t.screensSection.futureImage}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <h3
                    className="text-2xl text-[#F0F0E8]"
                    style={{
                      fontFamily:
                        'var(--font-fraunces), serif',
                    }}
                  >
                    {item.titulo}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-[#EDEDE3]/50">
                    {item.descricao}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          DIFERENCIAIS
      ========================================================== */}

      <section className="border-b border-white/[0.07] bg-[#101D17] px-5 py-24 md:px-8 md:py-32">
        <div className="mx-auto max-w-[1180px]">
          <div className="max-w-[720px]">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
              {t.differencesSection.eyebrow}
            </span>

            <h2
              className="mt-5 text-4xl leading-[1.06] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              {t.differencesSection.title}
            </h2>
          </div>

          <div className="mt-14 divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {t.differences.map((item) => (
              <article
                key={item.numero}
                className="grid gap-5 py-7 md:grid-cols-[80px_0.8fr_1.2fr] md:items-start md:gap-8"
              >
                <span className="text-xs font-semibold text-[#E3A144]">
                  {item.numero}
                </span>

                <h3
                  className="text-2xl leading-tight text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  {item.titulo}
                </h3>

                <p className="text-sm leading-7 text-[#EDEDE3]/52">
                  {item.descricao}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          CONCIERGE
      ========================================================== */}

      <section className="border-b border-white/[0.07] bg-[#0B1512] px-5 py-24 md:px-8 md:py-32">
        <div className="mx-auto max-w-[1180px] overflow-hidden rounded-[30px] border border-[#E3A144]/18 bg-[#0E1B16]">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div className="p-7 md:p-10 lg:p-12">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                {t.concierge.eyebrow}
              </span>

              <h2
                className="mt-5 max-w-[580px] text-4xl leading-[1.06] text-[#F0F0E8] md:text-5xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {t.concierge.title}
              </h2>

              <p className="mt-6 max-w-[590px] text-base leading-8 text-[#EDEDE3]/58">
                {t.concierge.description}
              </p>
            </div>

            <div className="border-t border-white/[0.07] bg-[#08130F] p-7 md:p-10 lg:border-l lg:border-t-0">
              <div className="space-y-3">
                {t.concierge.items.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5"
                  >
                    <span className="text-[#E3A144]">
                      ✦
                    </span>

                    <span className="text-sm text-[#EDEDE3]/65">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          CTA FINAL
      ========================================================== */}

      <section className="bg-[#091510] px-5 py-24 md:px-8 md:py-32">
        <div className="mx-auto max-w-[900px] text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E3A144]">
            {t.finalCta.eyebrow}
          </span>

          <h2
            className="mt-6 text-4xl leading-[1.04] text-[#F0F0E8] md:text-6xl"
            style={{
              fontFamily:
                'var(--font-fraunces), serif',
            }}
          >
            {t.finalCta.title}
          </h2>

          <p className="mx-auto mt-7 max-w-[650px] text-base leading-8 text-[#EDEDE3]/55">
            {t.finalCta.description}
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-[#E3A144] px-8 text-sm font-bold text-[#07130F] transition hover:-translate-y-0.5 hover:bg-[#F0B35C]"
            >
              {t.finalCta.login}
            </Link>

            <Link
              href="/"
              className="inline-flex min-h-[52px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.025] px-8 text-sm font-semibold text-[#EDEDE3]/70 transition hover:bg-white/[0.05]"
            >
              {t.finalCta.tourist}
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================
          FOOTER
      ========================================================== */}

      <footer className="border-t border-white/[0.07] bg-[#07100D] px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-3 text-xs text-[#EDEDE3]/35 sm:flex-row sm:items-center sm:justify-between">
          <span>{t.footer.left}</span>
          <span>{t.footer.right}</span>
        </div>
      </footer>
    </div>
  );
}
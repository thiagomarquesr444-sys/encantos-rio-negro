'use client';

import Link from 'next/link';
import PublicHeader from '@/app/components/PublicHeader';
import AcessosProfissionais from '@/app/components/AcessosProfissionais';
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
        'Uma plataforma criada para aproximar operadores, agências, pousadas, guias, fornecedores e embarcações de uma operação mais organizada — conectada à experiência do turista no Rio Negro.',
      description2:
        'A ERN une um portal público para o visitante com acessos profissionais conforme a atuação de quem faz o turismo acontecer.',
      login: 'Escolher meu acesso',
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
      previewTitle: 'ERN Gestão',
      previewDescription:
        'Uma visão da gestão de clientes, reservas e atividades da sua operadora.',
      tabs: ['Dashboard', 'Reservas', 'Financeiro', 'Operação'],
    },
    positioning: {
      eyebrow: 'Mais que um portal turístico',
      title:
        'O diferencial está na conexão entre quem visita e quem opera.',
      paragraph1:
        'A ERN foi pensada para criar uma jornada contínua. O visitante pode descobrir destinos e experiências e encontrar os profissionais que fazem o turismo acontecer no Rio Negro.',
      paragraph2:
        'A operadora organiza sua gestão empresarial. O guia possui uma identidade profissional própria. O fornecedor participa conforme sua atividade. O turista continua explorando o portal público.',
    },
    flowSection: {
      eyebrow: 'Da descoberta à operação',
      title: 'Uma jornada pensada para os dois lados do turismo.',
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
          'Preferências, período e necessidades ajudam a entender a experiência que o visitante procura.',
      },
      {
        etapa: 'Conexão',
        texto:
          'A proposta da rede é aproximar esse interesse de operadores, guias e fornecedores da região.',
      },
      {
        etapa: 'Gestão',
        texto:
          'A empresa organiza cliente, reserva, operação e movimentações dentro da ERN.',
      },
    ],
    modulesSection: {
      eyebrow: 'Gestão das operadoras',
      title: 'Uma estrutura para organizar a operação turística.',
      description:
        'Estes módulos compõem a gestão das operadoras. O acesso individual do guia e o acesso do fornecedor terão funcionalidades relacionadas à sua própria atividade.',
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
        titulo: 'Guias da operadora',
        descricao:
          'Organize os profissionais utilizados pela empresa, seus contatos, idiomas e disponibilidade.',
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
      title: 'Conheça as áreas da ERN Gestão.',
      description:
        'Uma estrutura para acompanhar as informações e as atividades da sua operadora.',
      futureImage: 'Área da plataforma',
    },
    screens: [
      {
        id: 'dashboard',
        titulo: 'Visão geral da operação',
        descricao:
          'Dashboard com indicadores e acompanhamento da operação.',
      },
      {
        id: 'reservas',
        titulo: 'Reservas organizadas',
        descricao:
          'Acompanhamento de reservas, status e informações do atendimento.',
      },
      {
        id: 'financeiro',
        titulo: 'Controle financeiro',
        descricao:
          'Receitas, despesas e visão financeira da operação.',
      },
      {
        id: 'operacao',
        titulo: 'Operação integrada',
        descricao:
          'Clientes, hospedagens, embarcações, guias e demais módulos da gestão.',
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
        titulo: 'Gestão conectada à experiência do turista',
        descricao:
          'A ERN aproxima a descoberta pública da operação real. O visitante conhece o território e encontra caminhos para planejar sua experiência.',
      },
      {
        numero: '02',
        titulo: 'Plataforma pensada para turismo local',
        descricao:
          'A estrutura nasce da realidade de agências, pousadas, guias, fornecedores, embarcações e operadores que atuam diretamente no Rio Negro.',
      },
      {
        numero: '03',
        titulo: 'Cada profissional com seu espaço',
        descricao:
          'A gestão empresarial, o cadastro individual do guia e a atuação do fornecedor têm necessidades diferentes e acessos próprios.',
      },
      {
        numero: '04',
        titulo: 'Operação centralizada',
        descricao:
          'Clientes, reservas, passeios, hospedagens, financeiro e parceiros podem ser organizados em um mesmo ambiente.',
      },
    ],
    concierge: {
      eyebrow: 'Evolução da ERN',
      title: 'Atendimento antes da reserva. Contexto antes da venda.',
      description:
        'O Concierge faz parte da evolução planejada da ERN: ajudar a identificar interesse, período, perfil da viagem e necessidades iniciais. A confirmação final depende da operação real e da disponibilidade de cada prestador.',
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
        'Escolha o acesso relacionado à sua atuação ou continue explorando o Rio Negro pelo portal público.',
      login: 'Escolher meu acesso',
      tourist: 'Explorar o portal público',
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
        'A platform designed to bring operators, agencies, inns, guides, suppliers and boats into a more organized operation — connected to the visitor experience on the Rio Negro.',
      description2:
        'ERN combines a public portal for visitors with professional access tailored to the people who make tourism happen.',
      login: 'Choose your access',
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
      previewTitle: 'ERN Management',
      previewDescription:
        'An overview of client, reservation and activity management for your operation.',
      tabs: ['Dashboard', 'Reservations', 'Finance', 'Operation'],
    },
    positioning: {
      eyebrow: 'More than a tourism portal',
      title:
        'The difference lies in connecting visitors with the people who operate.',
      paragraph1:
        'ERN was designed to create a continuous journey. Visitors can discover destinations and experiences and find the professionals who make tourism happen on the Rio Negro.',
      paragraph2:
        'Operators manage their businesses. Guides have their own professional identities. Suppliers participate according to their activities. Visitors continue exploring the public portal.',
    },
    flowSection: {
      eyebrow: 'From discovery to operation',
      title: 'A journey designed for both sides of tourism.',
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
          'Preferences, travel dates and needs help clarify the experience each visitor is looking for.',
      },
      {
        etapa: 'Connection',
        texto:
          'The network aims to connect that interest with operators, guides and suppliers in the region.',
      },
      {
        etapa: 'Management',
        texto:
          'The company organizes clients, reservations, operations and transactions within ERN.',
      },
    ],
    modulesSection: {
      eyebrow: 'Operator management',
      title: 'A structure designed to organize tourism operations.',
      description:
        'These modules support tour operator management. Individual guide and supplier access will provide features related to their own activities.',
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
        titulo: 'Operator guides',
        descricao:
          'Organize the professionals used by your company, their contacts, languages and availability.',
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
      title: 'Explore the areas of ERN Management.',
      description:
        'A structure for tracking your operation’s information and activities.',
      futureImage: 'Platform area',
    },
    screens: [
      {
        id: 'dashboard',
        titulo: 'Operation overview',
        descricao:
          'Dashboard with indicators and operational monitoring.',
      },
      {
        id: 'reservas',
        titulo: 'Organized reservations',
        descricao:
          'Track reservations, status and service information.',
      },
      {
        id: 'financeiro',
        titulo: 'Financial control',
        descricao:
          'Revenue, expenses and financial overview of the operation.',
      },
      {
        id: 'operacao',
        titulo: 'Integrated operation',
        descricao:
          'Clients, accommodation, boats, guides and other management modules.',
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
        titulo: 'Management connected to the visitor experience',
        descricao:
          'ERN brings public discovery closer to real operations. Visitors discover the territory and find ways to plan their experience.',
      },
      {
        numero: '02',
        titulo: 'A platform designed for local tourism',
        descricao:
          'The structure is based on the reality of agencies, inns, guides, suppliers, boats and operators working directly on the Rio Negro.',
      },
      {
        numero: '03',
        titulo: 'A place for each professional',
        descricao:
          'Business management, individual guide profiles and supplier activities have different needs and their own access paths.',
      },
      {
        numero: '04',
        titulo: 'Centralized operation',
        descricao:
          'Clients, reservations, tours, accommodation, finance and partners can be organized in one environment.',
      },
    ],
    concierge: {
      eyebrow: 'ERN development',
      title: 'Service before reservation. Context before the sale.',
      description:
        'The Concierge is part of ERN’s planned development: helping identify interests, travel dates, traveler profiles and initial needs. Final confirmation depends on real operations and each provider’s availability.',
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
        'Choose the access related to your activity or continue exploring the Rio Negro through the public portal.',
      login: 'Choose your access',
      tourist: 'Explore the public portal',
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
        'Una plataforma creada para acercar operadores, agencias, posadas, guías, proveedores y embarcaciones a una operación más organizada, conectada con la experiencia del visitante en el Río Negro.',
      description2:
        'ERN combina un portal público para el visitante con accesos profesionales según la actividad de quienes hacen que el turismo suceda.',
      login: 'Elegir mi acceso',
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
      previewTitle: 'ERN Gestión',
      previewDescription:
        'Una visión de la gestión de clientes, reservas y actividades de tu operación.',
      tabs: ['Dashboard', 'Reservas', 'Finanzas', 'Operación'],
    },
    positioning: {
      eyebrow: 'Más que un portal turístico',
      title:
        'La diferencia está en la conexión entre quien visita y quien opera.',
      paragraph1:
        'ERN fue pensada para crear un recorrido continuo. El visitante puede descubrir destinos y experiencias y encontrar a los profesionales que hacen que el turismo suceda en el Río Negro.',
      paragraph2:
        'El operador organiza su gestión empresarial. El guía tiene su propia identidad profesional. El proveedor participa según su actividad. El visitante continúa explorando el portal público.',
    },
    flowSection: {
      eyebrow: 'Del descubrimiento a la operación',
      title: 'Un recorrido pensado para ambos lados del turismo.',
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
          'Las preferencias, las fechas y las necesidades ayudan a comprender la experiencia que busca el visitante.',
      },
      {
        etapa: 'Conexión',
        texto:
          'La propuesta de la red es acercar ese interés a operadores, guías y proveedores de la región.',
      },
      {
        etapa: 'Gestión',
        texto:
          'La empresa organiza cliente, reserva, operación y movimientos dentro de ERN.',
      },
    ],
    modulesSection: {
      eyebrow: 'Gestión de operadores',
      title: 'Una estructura para organizar la operación turística.',
      description:
        'Estos módulos forman parte de la gestión de operadores. El acceso individual del guía y el acceso del proveedor tendrán funciones relacionadas con su propia actividad.',
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
        titulo: 'Guías del operador',
        descricao:
          'Organiza los profesionales utilizados por la empresa, sus contactos, idiomas y disponibilidad.',
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
      title: 'Conoce las áreas de ERN Gestión.',
      description:
        'Una estructura para seguir la información y las actividades de tu operación.',
      futureImage: 'Área de la plataforma',
    },
    screens: [
      {
        id: 'dashboard',
        titulo: 'Visión general de la operación',
        descricao:
          'Dashboard con indicadores y seguimiento de la operación.',
      },
      {
        id: 'reservas',
        titulo: 'Reservas organizadas',
        descricao:
          'Seguimiento de reservas, estados e información de atención.',
      },
      {
        id: 'financeiro',
        titulo: 'Control financiero',
        descricao:
          'Ingresos, gastos y visión financiera de la operación.',
      },
      {
        id: 'operacao',
        titulo: 'Operación integrada',
        descricao:
          'Clientes, hospedajes, embarcaciones, guías y demás módulos de gestión.',
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
        titulo: 'Gestión conectada a la experiencia del visitante',
        descricao:
          'ERN acerca el descubrimiento público a la operación real. El visitante conoce el territorio y encuentra formas de planear su experiencia.',
      },
      {
        numero: '02',
        titulo: 'Plataforma pensada para turismo local',
        descricao:
          'La estructura nace de la realidad de agencias, posadas, guías, proveedores, embarcaciones y operadores que trabajan directamente en el Río Negro.',
      },
      {
        numero: '03',
        titulo: 'Un espacio para cada profesional',
        descricao:
          'La gestión empresarial, el perfil individual del guía y la actividad del proveedor tienen necesidades diferentes y accesos propios.',
      },
      {
        numero: '04',
        titulo: 'Operación centralizada',
        descricao:
          'Clientes, reservas, paseos, hospedajes, finanzas y socios pueden organizarse en un mismo entorno.',
      },
    ],
    concierge: {
      eyebrow: 'Evolución de ERN',
      title: 'Atención antes de la reserva. Contexto antes de la venta.',
      description:
        'El Concierge forma parte de la evolución prevista de ERN: ayudar a identificar intereses, fechas, perfil del viaje y necesidades iniciales. La confirmación final depende de la operación real y de la disponibilidad de cada prestador.',
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
        'Elige el acceso relacionado con tu actividad o continúa explorando el Río Negro desde el portal público.',
      login: 'Elegir mi acceso',
      tourist: 'Explorar el portal público',
    },
    footer: {
      left: 'ERN Gestión — Encantos Rio Negro.',
      right: 'Barcelos • Amazonas',
    },
  },
} satisfies Record<Idioma, unknown>;

const fonteTitulo = {
  fontFamily: 'var(--font-fraunces), serif',
};

export default function OperadoresPage() {
  const { idioma } = useLanguage();
  const t = textos[idioma];

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[#0B1512] text-[#EDEDE3]"
      style={{
        fontFamily: 'var(--font-work-sans), sans-serif',
      }}
    >
      <PublicHeader />

      <main>
        {/* Apresentação */}
        <section className="relative overflow-hidden border-b border-white/[0.07] bg-[#091510] px-5 pb-16 pt-32 md:px-8 md:pb-24 md:pt-44">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(227,161,68,0.10),transparent_30%),radial-gradient(circle_at_20%_75%,rgba(124,156,135,0.10),transparent_32%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-40 top-20 h-[520px] w-[520px] rounded-full border border-[#E3A144]/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 top-36 h-[390px] w-[390px] rounded-full border border-[#E3A144]/10"
          />

          <div className="relative mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-14">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="h-px w-9 bg-[#E3A144]" />
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E3A144]">
                  {t.hero.eyebrow}
                </span>
              </div>

              <h1
                className="mt-6 max-w-[760px] text-[clamp(2.3rem,6vw,5.8rem)] font-medium leading-[1.02] tracking-[-0.04em] text-[#F0F0E8]"
                style={fonteTitulo}
              >
                {t.hero.title}
              </h1>

              <p className="mt-6 max-w-[680px] text-sm leading-7 text-[#EDEDE3]/65 md:text-lg md:leading-8">
                {t.hero.description}
              </p>

              <p className="mt-4 max-w-[660px] text-sm leading-7 text-[#EDEDE3]/45">
                {t.hero.description2}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#acessos-profissionais"
                  className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-[#E3A144] px-7 text-sm font-bold text-[#07130F] transition hover:-translate-y-0.5 hover:bg-[#F0B35C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C77E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#091510]"
                >
                  {t.hero.login}
                </a>

                <a
                  href="#como-funciona"
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-7 text-sm font-semibold text-[#EDEDE3]/78 transition hover:bg-white/[0.06]"
                >
                  {t.hero.how}
                  <span aria-hidden="true">→</span>
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs text-[#EDEDE3]/45">
                {t.hero.tags.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full min-w-0 max-w-[560px] lg:ml-auto">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-10 rounded-full bg-[#E3A144]/5 blur-3xl"
              />

              <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0D1B16] shadow-2xl">
                <div className="border-b border-white/[0.07] px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                        {t.preview.eyebrow}
                      </p>
                      <p
                        className="mt-1.5 text-xl text-[#F0F0E8]"
                        style={fonteTitulo}
                      >
                        {t.preview.title}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-400/10 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                      ERN
                    </span>
                  </div>
                </div>

                <div className="flex min-h-[230px] items-center justify-center bg-gradient-to-br from-[#14261E] via-[#0D1B16] to-[#07110E] px-6 py-8 md:min-h-[300px]">
                  <div className="max-w-[340px] text-center">
                    <div
                      aria-hidden="true"
                      className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#E3A144]/25 bg-[#E3A144]/10 text-[#E3A144]"
                    >
                      ✦
                    </div>

                    <p
                      className="mt-5 text-2xl text-[#F0F0E8]"
                      style={fonteTitulo}
                    >
                      {t.preview.previewTitle}
                    </p>

                    <p className="mt-3 text-sm leading-6 text-[#EDEDE3]/45">
                      {t.preview.previewDescription}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-px border-t border-white/[0.07] bg-white/[0.07] sm:grid-cols-4">
                  {t.preview.tabs.map((item) => (
                    <div
                      key={item}
                      className="min-w-0 bg-[#0D1B16] px-2 py-3 text-center text-[9px] font-semibold uppercase tracking-[0.08em] text-[#EDEDE3]/40"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Entradas profissionais */}
        <AcessosProfissionais />

        {/* Posicionamento */}
        <section className="border-b border-white/[0.07] bg-[#0B1512] px-5 py-16 md:px-8 md:py-24">
          <div className="mx-auto grid max-w-[1180px] gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7C9C87]">
                {t.positioning.eyebrow}
              </span>
              <h2
                className="mt-5 max-w-[480px] text-3xl leading-[1.08] text-[#F0F0E8] md:text-5xl"
                style={fonteTitulo}
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

        {/* Como funciona */}
        <section
          id="como-funciona"
          className="scroll-mt-24 border-b border-white/[0.07] bg-[#0E1A15] px-5 py-16 md:px-8 md:py-24"
        >
          <div className="mx-auto max-w-[1180px]">
            <div className="max-w-[720px]">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                {t.flowSection.eyebrow}
              </span>
              <h2
                className="mt-5 text-3xl leading-[1.08] text-[#F0F0E8] md:text-5xl"
                style={fonteTitulo}
              >
                {t.flowSection.title}
              </h2>
            </div>

            <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {t.flow.map((item, index) => (
                <article
                  key={item.etapa}
                  className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0A1713] p-6"
                >
                  <span
                    aria-hidden="true"
                    className="absolute right-5 top-4 text-5xl font-semibold text-white/[0.025]"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E3A144]/20 bg-[#E3A144]/8 text-xs font-semibold text-[#E3A144]">
                    {String(index + 1).padStart(2, '0')}
                  </div>

                  <h3
                    className="mt-6 text-2xl text-[#F0F0E8]"
                    style={fonteTitulo}
                  >
                    {item.etapa}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[#EDEDE3]/55">
                    {item.texto}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Módulos das operadoras */}
        <section className="border-b border-white/[0.07] bg-[#0B1512] px-5 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-[1180px]">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7C9C87]">
                  {t.modulesSection.eyebrow}
                </span>
                <h2
                  className="mt-5 max-w-[480px] text-3xl leading-[1.08] text-[#F0F0E8] md:text-5xl"
                  style={fonteTitulo}
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
                      <span
                        aria-hidden="true"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E3A144]/20 bg-[#E3A144]/8 text-[10px] text-[#E3A144]"
                      >
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

        {/* Áreas da plataforma */}
        <section className="border-b border-white/[0.07] bg-[#0E1A15] px-5 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-[1180px]">
            <div className="max-w-[760px]">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                {t.screensSection.eyebrow}
              </span>
              <h2
                className="mt-5 text-3xl leading-[1.08] text-[#F0F0E8] md:text-5xl"
                style={fonteTitulo}
              >
                {t.screensSection.title}
              </h2>
              <p className="mt-6 max-w-[680px] text-base leading-8 text-[#EDEDE3]/55">
                {t.screensSection.description}
              </p>
            </div>

            <div className="mt-9 grid gap-5 md:grid-cols-2">
              {t.screens.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0A1713]"
                >
                  <div className="flex min-h-[130px] items-center justify-center bg-gradient-to-br from-[#14261E] via-[#0D1B16] to-[#07110E] px-6 py-6">
                    <div className="text-center">
                      <div
                        aria-hidden="true"
                        className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#E3A144]/20 bg-[#E3A144]/10 text-[#E3A144]"
                      >
                        ✦
                      </div>
                      <p className="mt-4 text-xs uppercase tracking-[0.16em] text-[#EDEDE3]/30">
                        {t.screensSection.futureImage}
                      </p>
                    </div>
                  </div>

                  <div className="p-5">
                    <h3
                      className="text-2xl text-[#F0F0E8]"
                      style={fonteTitulo}
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

        {/* Diferenciais */}
        <section className="border-b border-white/[0.07] bg-[#101D17] px-5 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-[1180px]">
            <div className="max-w-[720px]">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                {t.differencesSection.eyebrow}
              </span>
              <h2
                className="mt-5 text-3xl leading-[1.08] text-[#F0F0E8] md:text-5xl"
                style={fonteTitulo}
              >
                {t.differencesSection.title}
              </h2>
            </div>

            <div className="mt-9 divide-y divide-white/[0.08] border-y border-white/[0.08]">
              {t.differences.map((item) => (
                <article
                  key={item.numero}
                  className="grid gap-4 py-7 md:grid-cols-[80px_0.8fr_1.2fr] md:items-start md:gap-8"
                >
                  <span className="text-xs font-semibold text-[#E3A144]">
                    {item.numero}
                  </span>
                  <h3
                    className="text-2xl leading-tight text-[#F0F0E8]"
                    style={fonteTitulo}
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

        {/* Concierge */}
        <section className="border-b border-white/[0.07] bg-[#0B1512] px-5 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-[1180px] overflow-hidden rounded-[30px] border border-[#E3A144]/18 bg-[#0E1B16]">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
              <div className="p-6 md:p-10 lg:p-12">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                  {t.concierge.eyebrow}
                </span>
                <h2
                  className="mt-5 max-w-[580px] text-3xl leading-[1.08] text-[#F0F0E8] md:text-5xl"
                  style={fonteTitulo}
                >
                  {t.concierge.title}
                </h2>
                <p className="mt-6 max-w-[590px] text-base leading-8 text-[#EDEDE3]/58">
                  {t.concierge.description}
                </p>
              </div>

              <div className="border-t border-white/[0.07] bg-[#08130F] p-6 md:p-10 lg:border-l lg:border-t-0">
                <div className="space-y-3">
                  {t.concierge.items.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5"
                    >
                      <span
                        aria-hidden="true"
                        className="text-[#E3A144]"
                      >
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

        {/* Acesso final */}
        <section className="bg-[#091510] px-5 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-[900px] text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E3A144]">
              {t.finalCta.eyebrow}
            </span>
            <h2
              className="mt-6 text-3xl leading-[1.06] text-[#F0F0E8] md:text-6xl"
              style={fonteTitulo}
            >
              {t.finalCta.title}
            </h2>
            <p className="mx-auto mt-7 max-w-[650px] text-base leading-8 text-[#EDEDE3]/55">
              {t.finalCta.description}
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href="#acessos-profissionais"
                className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-[#E3A144] px-8 text-sm font-bold text-[#07130F] transition hover:-translate-y-0.5 hover:bg-[#F0B35C]"
              >
                {t.finalCta.login}
              </a>

              <Link
                href="/"
                className="inline-flex min-h-[52px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.025] px-8 text-sm font-semibold text-[#EDEDE3]/70 transition hover:bg-white/[0.05]"
              >
                {t.finalCta.tourist}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.07] bg-[#07100D] px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-3 text-xs text-[#EDEDE3]/35 sm:flex-row sm:items-center sm:justify-between">
          <span>{t.footer.left}</span>
          <span>{t.footer.right}</span>
        </div>
      </footer>
    </div>
  );
}
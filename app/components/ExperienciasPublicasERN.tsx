'use client';

import Image from 'next/image';
import Link from 'next/link';
import PublicHeader from '@/app/components/PublicHeader';
import BotaoCopaPescaERN from '@/app/components/BotaoCopaPescaERN';
import ConciergePublicoERN from '@/app/components/ConciergePublicoERN';
import HeroExperienciasERN from '@/app/components/HeroExperienciasERN';
import FeedDescubraERN from '@/app/components/FeedDescubraERN';
import { useLanguage } from '@/app/components/LanguageProvider';

const textos = {
  PT: {
    skip: 'Ir para o conteúdo',
    eyebrow: 'Experiências · Rio Negro, Amazonas',
    title: 'O Rio Negro se vive de perto.',
    intro: 'Há quem chegue pela primeira vez. Há quem encontre aqui a própria história. Entre rios, encontros e paisagens, descubra outros jeitos de viver o território.',
    explore: 'Encontre sua inspiração',
    destinations: 'Explorar destinos',
    heroAlt: 'Grupo na varanda de uma construção sobre a água, com pessoas acenando e um jacaré no rio abaixo',
    heroCaption: 'Encontros e paisagens fazem parte das histórias de quem vive e visita a região.',
    interestsLabel: 'Escolha um interesse',
    interestsEyebrow: 'O que desperta sua curiosidade?',
    interestsTitle: 'Cada interesse abre um caminho.',
    interestsIntro: 'Comece pelo que combina com você. Estas são inspirações para explorar o Rio Negro; os serviços e as condições de visita devem ser confirmados com cada prestador.',
    interests: [
      {
        id: 'rios',
        name: 'Rios e navegação',
        title: 'O caminho também faz parte da experiência.',
        text: 'Observe as margens, acompanhe a paisagem e descubra lugares por outros pontos de vista. A navegação pode ser parte da viagem e do encontro com o território.',
        link: 'Conhecer os destinos',
        href: '/destinos',
      },
      {
        id: 'natureza',
        name: 'Natureza',
        title: 'Tempo para olhar com atenção.',
        text: 'Água, floresta e vida ao redor. Explore possibilidades de observação da natureza com orientação local e respeito às regras de cada lugar.',
        link: 'Explorar histórias da Rede',
        href: '/rede',
      },
      {
        id: 'cultura',
        name: 'Cultura e sabores',
        title: 'Um território contado por quem vive nele.',
        text: 'Histórias, celebrações, saberes e sabores ajudam a conhecer a região. Busque encontros que respeitem as pessoas, seus espaços e suas formas de compartilhar a cultura.',
        link: 'Conhecer publicações locais',
        href: '/rede',
      },
      {
        id: 'pesca',
        name: 'Pesca esportiva',
        title: 'Uma experiência para planejar com cuidado.',
        text: 'Conheça o tema e converse com profissionais sobre roteiro, equipamentos, condições de operação e regras aplicáveis antes de organizar a viagem.',
        link: 'Explorar pesca esportiva',
        href: '/pesca-esportiva',
      },
    ],
    encounterEyebrow: 'Viver o território',
    encounterTitle: 'Mais do que passar por um lugar. Perceber o que acontece ao redor.',
    encounterText: 'Uma paisagem muda quando alguém compartilha uma história sobre ela. Quem conhece a região ajuda a transformar curiosidade em contexto e a preparar uma experiência com mais sentido.',
    encounterNote: 'Observe a fauna sem tocar, alimentar ou provocar os animais. Siga as orientações locais e mantenha uma distância segura.',
    encounterAlt: 'Pessoas observam da varanda um jacaré na água, com vegetação na margem ao fundo',
    encounterCaption: 'A observação da natureza pede atenção, distância e respeito.',
    network: 'Conhecer quem participa da Rede',
    territoryEyebrow: 'Alto e Baixo Rio Negro',
    territoryTitle: 'Amplie o olhar sobre o Rio Negro.',
    territoryText: 'Explore localidades, histórias e possibilidades de viagem. Use a página de destinos para começar e a Rede para conhecer as apresentações dos profissionais e negócios da região.',
    territoryNames: ['Manaus', 'Novo Airão', 'Barcelos', 'Santa Isabel do Rio Negro', 'São Gabriel da Cachoeira'],
    territoryNote: 'Os nomes são pontos de partida para descoberta, não um roteiro pronto nem uma indicação de disponibilidade.',
    peopleEyebrow: 'Pessoas que fazem acontecer',
    peopleTitle: 'Da inspiração à conversa certa.',
    peopleText: 'Na Rede ERN, você pode explorar publicações e acessar os perfis dos autores. Confira os canais disponibilizados por cada prestador para perguntar sobre a experiência que procura.',
    peopleGroups: ['Operadoras e agências', 'Guias', 'Fornecedores e serviços'],
    peopleButton: 'Explorar a Rede ERN',
    business: 'Você trabalha com turismo?',
    businessLink: 'Conheça a ERN Gestão',
    planningEyebrow: 'Antes de planejar',
    planningTitle: 'Boas perguntas fazem parte da viagem.',
    planning: [
      ['Lugar e período', 'Confirme as condições de acesso, o nível dos rios e as possibilidades para o período desejado.'],
      ['Deslocamento e estrutura', 'Pergunte sobre trajeto, duração, embarcação, hospedagem e o que está incluído no atendimento.'],
      ['Orientação e respeito', 'Confira regras de visitação, autorizações e cuidados com pessoas, comunidades e natureza.'],
    ],
    planningNote: 'As imagens e os conteúdos desta página são de apresentação editorial. Reservas, preços e disponibilidade dependem de confirmação com o prestador.',
    legalLabel: 'Informações e atendimento',
    footer: [
      ['Contato', '/contato'],
      ['Privacidade', '/privacidade'],
      ['Termos', '/termos'],
      ['Reembolso', '/reembolso'],
    ],
  },
  EN: {
    skip: 'Skip to content',
    eyebrow: 'Experiences · Rio Negro, Amazonas',
    title: 'Experience the Rio Negro up close.',
    intro: 'Some arrive for the first time. Others find their own story here. Between rivers, encounters and landscapes, discover different ways to experience the region.',
    explore: 'Find your inspiration',
    destinations: 'Explore destinations',
    heroAlt: 'A group on the veranda of a building over the water, with people waving and a caiman in the river below',
    heroCaption: 'Encounters and landscapes are part of the stories of residents and visitors.',
    interestsLabel: 'Choose an interest',
    interestsEyebrow: 'What sparks your curiosity?',
    interestsTitle: 'Every interest opens a path.',
    interestsIntro: 'Start with what interests you. These are ideas for exploring the Rio Negro; confirm services and visiting conditions with each provider.',
    interests: [
      {
        id: 'rios', name: 'Rivers and navigation',
        title: 'The journey is part of the experience.',
        text: 'Watch the riverbanks and discover places from different perspectives. Navigation can be part of the trip and your encounter with the region.',
        link: 'Explore destinations', href: '/destinos',
      },
      {
        id: 'natureza', name: 'Nature',
        title: 'Time to look more closely.',
        text: 'Water, forest and the life around them. Explore nature observation with local guidance and respect for the rules of each place.',
        link: 'Explore network stories', href: '/rede',
      },
      {
        id: 'cultura', name: 'Culture and food',
        title: 'A region told by its people.',
        text: 'Stories, celebrations, knowledge and food offer ways to discover the region. Seek encounters that respect people, their spaces and how they choose to share their culture.',
        link: 'Explore local posts', href: '/rede',
      },
      {
        id: 'pesca', name: 'Sport fishing',
        title: 'An experience to plan carefully.',
        text: 'Explore the topic and speak with professionals about itineraries, equipment, operating conditions and applicable rules before arranging your trip.',
        link: 'Explore sport fishing', href: '/pesca-esportiva',
      },
    ],
    encounterEyebrow: 'Experience the region',
    encounterTitle: 'More than passing through a place. Notice what happens around you.',
    encounterText: 'A landscape changes when someone shares its story. Local knowledge can turn curiosity into context and help prepare a more meaningful experience.',
    encounterNote: 'Observe wildlife without touching, feeding or disturbing animals. Follow local guidance and keep a safe distance.',
    encounterAlt: 'People watch a caiman in the water from a veranda, with vegetation on the bank behind it',
    encounterCaption: 'Observing nature calls for attention, distance and respect.',
    network: 'Discover people on the network',
    territoryEyebrow: 'Upper and Lower Rio Negro',
    territoryTitle: 'See more of the Rio Negro.',
    territoryText: 'Explore places, stories and travel possibilities. Start with destinations and visit the network to discover profiles of local professionals and businesses.',
    territoryNames: ['Manaus', 'Novo Airão', 'Barcelos', 'Santa Isabel do Rio Negro', 'São Gabriel da Cachoeira'],
    territoryNote: 'These places are starting points for discovery, not a ready-made itinerary or a statement of availability.',
    peopleEyebrow: 'People who make it happen',
    peopleTitle: 'From inspiration to the right conversation.',
    peopleText: 'On Rede ERN, explore posts and visit author profiles. Use the contact channels provided by each business to ask about the experience you are looking for.',
    peopleGroups: ['Operators and agencies', 'Guides', 'Suppliers and services'],
    peopleButton: 'Explore Rede ERN',
    business: 'Do you work in tourism?',
    businessLink: 'Explore ERN Management',
    planningEyebrow: 'Before you plan',
    planningTitle: 'Good questions are part of the trip.',
    planning: [
      ['Place and timing', 'Confirm access conditions, river levels and options for your intended travel period.'],
      ['Transport and facilities', 'Ask about the route, duration, boat, accommodation and what the service includes.'],
      ['Guidance and respect', 'Check visiting rules, permissions and care for people, communities and nature.'],
    ],
    planningNote: 'The images and content on this page are editorial presentations. Reservations, prices and availability require confirmation with the provider.',
    legalLabel: 'Information and support',
    footer: [['Contact', '/contato'], ['Privacy', '/privacidade'], ['Terms', '/termos'], ['Refunds', '/reembolso']],
  },
  ES: {
    skip: 'Ir al contenido',
    eyebrow: 'Experiencias · Río Negro, Amazonas',
    title: 'El Río Negro se vive de cerca.',
    intro: 'Hay quienes llegan por primera vez. Otros encuentran aquí su propia historia. Entre ríos, encuentros y paisajes, descubra otras maneras de vivir el territorio.',
    explore: 'Encuentre su inspiración',
    destinations: 'Explorar destinos',
    heroAlt: 'Grupo en la terraza de una construcción sobre el agua, con personas saludando y un caimán en el río debajo',
    heroCaption: 'Encuentros y paisajes forman parte de las historias de residentes y visitantes.',
    interestsLabel: 'Elija un interés',
    interestsEyebrow: '¿Qué despierta su curiosidad?',
    interestsTitle: 'Cada interés abre un camino.',
    interestsIntro: 'Empiece por lo que le interesa. Estas son ideas para explorar el Río Negro; confirme los servicios y condiciones de visita con cada prestador.',
    interests: [
      {
        id: 'rios', name: 'Ríos y navegación',
        title: 'El camino también es parte de la experiencia.',
        text: 'Observe las orillas y descubra lugares desde otros puntos de vista. La navegación puede formar parte del viaje y del encuentro con el territorio.',
        link: 'Conocer destinos', href: '/destinos',
      },
      {
        id: 'natureza', name: 'Naturaleza',
        title: 'Tiempo para mirar con atención.',
        text: 'Agua, bosque y vida alrededor. Explore posibilidades de observación con orientación local y respeto por las reglas de cada lugar.',
        link: 'Explorar historias de la red', href: '/rede',
      },
      {
        id: 'cultura', name: 'Cultura y sabores',
        title: 'Un territorio contado por su gente.',
        text: 'Historias, celebraciones, saberes y sabores ayudan a conocer la región. Busque encuentros que respeten a las personas, sus espacios y sus formas de compartir la cultura.',
        link: 'Conocer publicaciones locales', href: '/rede',
      },
      {
        id: 'pesca', name: 'Pesca deportiva',
        title: 'Una experiencia para planificar con cuidado.',
        text: 'Conozca el tema y converse con profesionales sobre itinerarios, equipos, condiciones de operación y reglas aplicables antes de organizar el viaje.',
        link: 'Explorar pesca deportiva', href: '/pesca-esportiva',
      },
    ],
    encounterEyebrow: 'Vivir el territorio',
    encounterTitle: 'Más que pasar por un lugar. Percibir lo que sucede alrededor.',
    encounterText: 'Un paisaje cambia cuando alguien comparte su historia. El conocimiento local ayuda a transformar la curiosidad en contexto y a preparar una experiencia con más sentido.',
    encounterNote: 'Observe la fauna sin tocar, alimentar ni molestar a los animales. Siga la orientación local y mantenga una distancia segura.',
    encounterAlt: 'Personas observan un caimán en el agua desde una terraza, con vegetación en la orilla al fondo',
    encounterCaption: 'La observación de la naturaleza requiere atención, distancia y respeto.',
    network: 'Conocer a quienes participan en la red',
    territoryEyebrow: 'Alto y Bajo Río Negro',
    territoryTitle: 'Amplíe su mirada sobre el Río Negro.',
    territoryText: 'Explore localidades, historias y posibilidades de viaje. Empiece por destinos y visite la red para conocer los perfiles de profesionales y negocios de la región.',
    territoryNames: ['Manaus', 'Novo Airão', 'Barcelos', 'Santa Isabel do Rio Negro', 'São Gabriel da Cachoeira'],
    territoryNote: 'Los nombres son puntos de partida para descubrir, no un itinerario listo ni una indicación de disponibilidad.',
    peopleEyebrow: 'Personas que lo hacen posible',
    peopleTitle: 'De la inspiración a la conversación adecuada.',
    peopleText: 'En Rede ERN puede explorar publicaciones y visitar los perfiles de sus autores. Consulte los canales que ofrece cada prestador para preguntar por la experiencia que busca.',
    peopleGroups: ['Operadores y agencias', 'Guías', 'Proveedores y servicios'],
    peopleButton: 'Explorar Rede ERN',
    business: '¿Trabaja con turismo?',
    businessLink: 'Conozca ERN Gestión',
    planningEyebrow: 'Antes de planificar',
    planningTitle: 'Las buenas preguntas son parte del viaje.',
    planning: [
      ['Lugar y período', 'Confirme las condiciones de acceso, el nivel de los ríos y las posibilidades para el período deseado.'],
      ['Traslado y estructura', 'Pregunte por el trayecto, duración, embarcación, hospedaje y qué incluye el servicio.'],
      ['Orientación y respeto', 'Consulte reglas de visita, permisos y cuidados con personas, comunidades y naturaleza.'],
    ],
    planningNote: 'Las imágenes y contenidos de esta página son presentaciones editoriales. Las reservas, precios y disponibilidad requieren confirmación con el prestador.',
    legalLabel: 'Información y atención',
    footer: [['Contacto', '/contato'], ['Privacidad', '/privacidade'], ['Términos', '/termos'], ['Reembolsos', '/reembolso']],
  },
};

export default function ExperienciasPublicasERN() {
  const { idioma } = useLanguage();
  const t = textos[idioma];

  return (
    <div className="experiencias-ern">
      <a className="pular" href="#conteudo-experiencias">{t.skip}</a>
      <PublicHeader />

      {/* ERN_EXPERIENCIAS_CONCIERGE_COPA_V1 */}
      <div className="ern-concierge-experiencias">
        <ConciergePublicoERN />
      </div>

      <main id="conteudo-experiencias" tabIndex={-1}>
        <HeroExperienciasERN
          eyebrow={t.eyebrow}
          title={t.title}
          intro={t.intro}
          explore={t.explore}
          destinations={t.destinations}
          imageAlt={t.heroAlt}
        />

        <section id="explorar" className="bloco explorar">
          <div className="limite">
            <header className="cabecalho">
              <p className="chamada">{t.interestsEyebrow}</p>
              <h2>{t.interestsTitle}</h2>
              <p>{t.interestsIntro}</p>
            </header>

            <nav className="interesses" aria-label={t.interestsLabel}>
              {t.interests.map(item => (
                <a key={item.id} href={`#experiencia-${item.id}`}>
                  {item.name}<span aria-hidden="true">↓</span>
                </a>
              ))}
            </nav>

            <div className="possibilidades">
              {t.interests.map(item => (
                <article id={`experiencia-${item.id}`} key={item.id}>
                  <p className="chamada">{item.name}</p>
                  <h3>{item.title}</h3>
                  <p className="descricao">{item.text}</p>
                  <Link href={item.href} className="texto-link">
                    {item.link}<span aria-hidden="true">→</span>
                  </Link>

                  {item.id === 'pesca' && (
                    <BotaoCopaPescaERN idioma={idioma} />
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bloco encontro">
          <div className="limite encontro-grid">
            <figure>
              <Image
                src="/images/experiencias/experiencias..jpeg"
                alt={t.encounterAlt}
                width={720}
                height={775}
                sizes="(max-width: 767px) 92vw, (max-width: 1200px) 45vw, 540px"
                quality={75}
                className="foto-encontro"
              />
              <figcaption>{t.encounterCaption}</figcaption>
            </figure>
            <div className="encontro-texto">
              <p className="chamada">{t.encounterEyebrow}</p>
              <h2>{t.encounterTitle}</h2>
              <p className="descricao">{t.encounterText}</p>
              <p className="orientacao">{t.encounterNote}</p>
              <Link href="/rede" className="texto-link">
                {t.network}<span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="bloco territorio">
          <div className="limite territorio-grid">
            <header className="cabecalho">
              <p className="chamada">{t.territoryEyebrow}</p>
              <h2>{t.territoryTitle}</h2>
              <p>{t.territoryText}</p>
              <Link href="/destinos" className="texto-link">
                {t.destinations}<span aria-hidden="true">→</span>
              </Link>
            </header>
            <div>
              <ul className="localidades">
                {t.territoryNames.map(nome => <li key={nome}>{nome}</li>)}
              </ul>
              <p className="nota">{t.territoryNote}</p>
            </div>
          </div>
        </section>

        <FeedDescubraERN />

        <section className="bloco pessoas">
          <div className="limite pessoas-grid">
            <div>
              <p className="chamada">{t.peopleEyebrow}</p>
              <h2>{t.peopleTitle}</h2>
              <p className="descricao">{t.peopleText}</p>
              <Link href="/rede" className="principal">
                {t.peopleButton}<span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="rede-caminhos">
              <ul>
                {t.peopleGroups.map(grupo => <li key={grupo}>{grupo}</li>)}
              </ul>
              <p className="nota">{t.business}</p>
              <Link href="/operadores" className="texto-link">
                {t.businessLink}<span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="bloco planejamento">
          <div className="limite">
            <header className="cabecalho">
              <p className="chamada">{t.planningEyebrow}</p>
              <h2>{t.planningTitle}</h2>
            </header>
            <div className="perguntas">
              {t.planning.map(([titulo, descricao]) => (
                <article key={titulo}>
                  <h3>{titulo}</h3>
                  <p className="descricao">{descricao}</p>
                </article>
              ))}
            </div>
            <p className="nota">{t.planningNote}</p>
          </div>
        </section>
      </main>

      <footer className="rodape">
        <div className="limite rodape-grid">
          <p>Encantos Rio Negro · Amazonas</p>
          <nav aria-label={t.legalLabel}>
            {t.footer.map(([rotulo, href]) => (
              <Link href={href} key={href}>{rotulo}</Link>
            ))}
          </nav>
        </div>
      </footer>

      <style jsx>{`
        .ern-concierge-experiencias {
          display: contents;
        }

        .ern-concierge-experiencias :global(.ern-chat-compacto) {
          display: contents;
        }

        .ern-concierge-experiencias :global(.ern-chat-compacto::before),
        .ern-concierge-experiencias :global(.ern-chat-compacto::after),
        .ern-concierge-experiencias :global(.cartao-topo),
        .ern-concierge-experiencias :global(.cartao-corpo) {
          display: none;
        }
        .experiencias-ern{background:#fff7db;color:#30260d;font-family:var(--font-work-sans),sans-serif}
        .limite{width:100%;max-width:1180px;margin:0 auto;min-width:0}
        h1,h2,h3{font-family:var(--font-fraunces),serif;overflow-wrap:anywhere}
        p,li{overflow-wrap:anywhere}
        .chamada{color:#805600;font-size:11px;font-weight:700;line-height:1.8;letter-spacing:.16em;text-transform:uppercase}
        .hero{padding:128px 24px 64px;border-bottom:1px solid #cdba7a}
        .hero-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:64px;align-items:center}
        .hero-texto{min-width:0}
        h1{font-size:clamp(42px,5.7vw,78px);line-height:1.03;letter-spacing:-.04em;margin-top:24px;max-width:680px}
        .introducao{max-width:600px;margin-top:26px;font-size:18px;line-height:1.9;color:#695727}
        .acoes{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px}
        .acoes a,:global(.experiencias-ern a.principal){display:inline-flex;align-items:center;justify-content:center;gap:16px;min-height:52px;padding:12px 22px;border-radius:12px;font-size:14px;font-weight:700;text-align:center;text-decoration:none}
        .principal,:global(.experiencias-ern a.principal){background:#805600;color:#fff;border:1px solid #805600}
        .principal:hover,:global(.experiencias-ern a.principal:hover){background:#644300}
        :global(.experiencias-ern a.secundario){border:1px solid #a58b48;color:#30260d}
        :global(.experiencias-ern a.secundario:hover){background:#f0e4bb}
        figure{min-width:0;margin:0}
        .hero-foto{width:100%;max-width:460px;justify-self:end}
        .hero-foto :global(.foto-principal){display:block;width:100%;height:auto;border-radius:16px}
        figcaption{padding-top:12px;color:#695727;font-size:12px;line-height:1.8}
        .bloco{padding:72px 24px}
        .cabecalho{max-width:780px}
        h2{font-size:clamp(32px,4vw,48px);line-height:1.12;letter-spacing:-.025em;margin-top:16px}
        .cabecalho>p:last-of-type:not(.chamada){margin-top:22px;color:#695727;line-height:1.9}
        .explorar{scroll-margin-top:100px}
        .interesses{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px}
        .interesses a{display:inline-flex;align-items:center;justify-content:space-between;gap:20px;min-height:48px;padding:10px 18px;border:1px solid #a58b48;border-radius:999px;font-size:13px;font-weight:600;color:#805600;text-decoration:none}
        .interesses a:hover{background:#f0e4bb}
        .possibilidades{display:grid;grid-template-columns:1fr 1fr;gap:40px 48px;margin-top:44px}
        .possibilidades article{min-width:0;border-top:1px solid #cdba7a;padding-top:24px;scroll-margin-top:110px}
        h3{font-size:27px;line-height:1.2;margin-top:14px}
        .descricao{color:#695727;line-height:1.9;font-size:16px;margin-top:20px}
        :global(.experiencias-ern a.texto-link){display:inline-flex;align-items:center;gap:16px;min-height:48px;margin-top:18px;color:#805600;font-size:14px;font-weight:700;text-decoration:underline;text-underline-offset:5px}
        .encontro{background:#fffcf0;border-block:1px solid #cdba7a}
        .encontro-grid{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center}
        .encontro-grid :global(.foto-encontro){display:block;width:100%;height:auto;border-radius:16px}
        .orientacao{margin-top:24px;padding-left:18px;border-left:2px solid #805600;color:#695727;font-size:14px;line-height:1.9}
        .territorio-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:64px;align-items:start}
        .localidades{padding:0;list-style:none;border-top:1px solid #cdba7a}
        .localidades li{padding:16px 0;border-bottom:1px solid #cdba7a;font-family:var(--font-fraunces),serif;font-size:24px}
        .nota{max-width:900px;margin-top:24px;font-size:13px;color:#695727;line-height:1.9}
        .pessoas{border-top:1px solid #cdba7a}
        .pessoas-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:64px;align-items:center}
        .pessoas :global(a.principal){margin-top:26px}
        .rede-caminhos{padding:28px;border:1px solid #cdba7a;border-radius:16px;background:#fffcf0}
        .rede-caminhos ul{padding:0;list-style:none}
        .rede-caminhos li{padding:14px 0;border-bottom:1px solid #cdba7a;font-size:17px;font-weight:600}
        .planejamento{background:#f0e4bb;border-top:1px solid #cdba7a}
        .perguntas{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px;margin-top:28px}
        .perguntas h3{font-size:25px}
        .perguntas .descricao{font-size:14px}
        .rodape{padding:28px 24px;border-top:1px solid #cdba7a}
        .rodape-grid{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px}
        .rodape p{font-size:12px;color:#695727}
        .rodape nav{display:flex;flex-wrap:wrap;gap:4px 20px}
        .rodape nav :global(a){display:inline-flex;align-items:center;min-height:44px;color:#695727;font-size:12px;text-decoration:underline;text-underline-offset:4px}
        .pular{position:fixed;top:12px;left:16px;z-index:1000;transform:translateY(-200%);padding:14px 20px;background:#fff7db;color:#30260d;border:2px solid #805600;border-radius:8px}
        .pular:focus{transform:translateY(0)}
        .pular:focus-visible,.acoes :global(a:focus-visible),
        .interesses a:focus-visible,
        :global(.experiencias-ern a.texto-link:focus-visible),
        :global(.experiencias-ern a.principal:focus-visible),
        .rodape nav :global(a:focus-visible){outline:3px solid #805600;outline-offset:4px}
        @media(max-width:1023px){
          .hero-grid,.encontro-grid,.territorio-grid,.pessoas-grid{gap:32px}
          h1{font-size:clamp(42px,6vw,64px)}
          .introducao{font-size:16px}
        }
        @media(max-width:767px){
          .hero{padding:112px 16px 48px}
          .hero-grid,.encontro-grid,.territorio-grid,.pessoas-grid{grid-template-columns:1fr}
          .hero-foto{max-width:460px;justify-self:center;margin-top:8px}
          .hero-texto{max-width:640px}
          h1{font-size:clamp(40px,9vw,60px)}
          .bloco{padding:48px 16px}
          .possibilidades{grid-template-columns:1fr;gap:28px}
          .perguntas{grid-template-columns:1fr;gap:18px}
          .encontro-grid figure{width:100%;max-width:540px;justify-self:center}
          .interesses{gap:8px}
          .interesses a{font-size:12px;padding:10px 14px}
          .rede-caminhos{padding:22px}
          .rodape{padding:24px 16px}
        }
        @media(max-width:399px){
          .acoes{flex-direction:column}
          .acoes :global(a){width:100%}
        }
      `}</style>
    </div>
  );
}
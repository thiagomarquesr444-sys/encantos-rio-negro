'use client';

import DemonstracaoOperadoresERN from '@/app/components/DemonstracaoOperadoresERN';
import Link from 'next/link';
import PublicHeader from '@/app/components/PublicHeader';
import AcessosProfissionais from '@/app/components/AcessosProfissionais';
import VitrineGestaoERN from '@/app/components/VitrineGestaoERN';
import { useLanguage } from '@/app/components/LanguageProvider';

const textos = {
  PT: {
    skip: 'Ir para o conteúdo',
    eyebrow: 'ERN Gestão · turismo no Rio Negro',
    title: 'Sua operação organizada. Sua experiência conectada ao mundo.',
    intro: 'Clientes, reservas, logística e financeiro em um ambiente de gestão. Uma página pública para apresentar sua operadora e compartilhar experiências na Rede ERN.',
    access: 'Acessar a ERN',
    screens: 'Ver a plataforma por dentro',
    caption: 'Tela da ERN Gestão. Os recursos disponíveis dependem do plano e do tipo de acesso.',
    image: 'Dashboard da ERN Gestão com indicadores e informações da operação',
    pillars: ['Gestão da operadora', 'Presença pública', 'Conexões no território'],
    workEyebrow: 'Da rotina à divulgação',
    workTitle: 'Organize por dentro. Apresente por fora.',
    workIntro: 'A ERN reúne duas frentes que se complementam: o trabalho da sua equipe e a apresentação pública da sua operação.',
    managementTitle: 'Um lugar para acompanhar a operação',
    managementText: 'Organize os registros da empresa e acompanhe as etapas de cada atendimento.',
    managementItems: [
      'Clientes e informações necessárias ao atendimento',
      'Reservas, passeios e vínculos com a operação',
      'Hospedagens, embarcações, guias e parceiros',
      'Receitas, despesas, vouchers e relatórios conforme o plano',
    ],
    publicTitle: 'Uma presença para ser descoberta',
    publicText: 'Apresente sua identidade profissional e publique conteúdos para quem explora o Rio Negro.',
    publicItems: [
      'Perfil público com apresentação e canais de contato',
      'Publicações com imagens, roteiros e experiências',
      'Conteúdo acessível aos visitantes da Rede ERN',
      'Contato com o prestador pelos canais que ele disponibilizar',
    ],
    network: 'Conhecer a Rede pública',
    networkEyebrow: 'Uma rede, diferentes atuações',
    networkTitle: 'Quem faz o turismo acontecer também precisa se encontrar.',
    networkIntro: 'Operadoras, guias e fornecedores têm papéis diferentes. A ERN oferece caminhos de acesso próprios e uma vitrine pública para aproximar o visitante do território.',
    roles: [
      ['Operadoras', 'Gestão da empresa e apresentação de experiências para o público.'],
      ['Guias', 'Cadastro profissional próprio, com identidade independente das operadoras.'],
      ['Fornecedores', 'Participação conforme seus produtos, serviços e sua atividade.'],
    ],
    networkNote: 'A presença na Rede não garante vendas, reservas ou disponibilidade. As condições de cada experiência devem ser confirmadas com o prestador.',
    journeyEyebrow: 'Um caminho claro',
    journeyTitle: 'Da organização à presença pública.',
    steps: [
      ['Escolha seu acesso', 'Entre pelo caminho correspondente à sua atuação no turismo.'],
      ['Prepare sua operação', 'Organize seus registros e preencha as informações do perfil público.'],
      ['Revise e publique', 'Confira o texto e as imagens antes de disponibilizar o conteúdo na Rede.'],
    ],
    futureEyebrow: 'Próximos passos do produto',
    futureTitle: 'Uma base que continua evoluindo.',
    futureText: 'Concierge e agentes de atendimento fazem parte da evolução planejada da ERN. Não são apresentados aqui como recursos disponíveis para uso imediato.',
    futureNote: 'A confirmação de uma viagem depende das condições, da disponibilidade e do atendimento de cada prestador.',
    finalEyebrow: 'Comece pela sua atuação',
    finalTitle: 'Conheça a estrutura. Escolha seu acesso.',
    finalText: 'Explore as telas e entre pelo perfil adequado. A disponibilidade de módulos e benefícios deve ser conferida nas condições do plano.',
    contact: 'Falar com a ERN',
    legal: 'Informações e atendimento',
    footer: [
      ['Contato', '/contato'],
      ['Privacidade', '/privacidade'],
      ['Termos de serviço', '/termos'],
      ['Reembolso', '/reembolso'],
    ],
  },
  EN: {
    skip: 'Skip to content',
    eyebrow: 'ERN Management · Rio Negro tourism',
    title: 'Organize your operation. Connect your experiences with the world.',
    intro: 'Clients, reservations, logistics and finance in a management environment. A public page to introduce your business and share experiences on Rede ERN.',
    access: 'Access ERN',
    screens: 'Explore the platform',
    caption: 'ERN Management screen. Available features depend on the plan and access type.',
    image: 'ERN Management dashboard showing indicators and operational information',
    pillars: ['Operator management', 'Public presence', 'Regional connections'],
    workEyebrow: 'From daily work to public presence',
    workTitle: 'Organize your business. Present your experiences.',
    workIntro: 'ERN brings together two complementary areas: your team’s work and the public presentation of your business.',
    managementTitle: 'A place to follow your operation',
    managementText: 'Organize company records and follow the stages of each service.',
    managementItems: [
      'Clients and information needed to provide the service',
      'Reservations, tours and operational links',
      'Accommodation, boats, guides and partners',
      'Income, expenses, vouchers and reports according to the plan',
    ],
    publicTitle: 'A presence visitors can discover',
    publicText: 'Present your professional identity and publish content for people exploring the Rio Negro.',
    publicItems: [
      'Public profile with an introduction and contact channels',
      'Posts featuring images, itineraries and experiences',
      'Content available to visitors on Rede ERN',
      'Direct contact through the channels provided by each business',
    ],
    network: 'Explore the public network',
    networkEyebrow: 'One network, different roles',
    networkTitle: 'The people behind tourism need ways to connect.',
    networkIntro: 'Operators, guides and suppliers have different roles. ERN provides dedicated access paths and a public showcase that brings visitors closer to the region.',
    roles: [
      ['Operators', 'Business management and public presentation of experiences.'],
      ['Guides', 'An individual professional profile, independent of tour operators.'],
      ['Suppliers', 'Participation according to their products, services and activities.'],
    ],
    networkNote: 'A presence on the network does not guarantee sales, reservations or availability. Confirm the terms of each experience with the provider.',
    journeyEyebrow: 'A clear path',
    journeyTitle: 'From organization to public presence.',
    steps: [
      ['Choose your access', 'Use the access path that matches your role in tourism.'],
      ['Prepare your operation', 'Organize your records and complete your public profile information.'],
      ['Review and publish', 'Check the text and images before making content available on the network.'],
    ],
    futureEyebrow: 'Product development',
    futureTitle: 'A foundation that keeps evolving.',
    futureText: 'Concierge and service agents are part of ERN’s planned development. They are not presented here as features available for immediate use.',
    futureNote: 'Trip confirmation depends on each provider’s terms, availability and service.',
    finalEyebrow: 'Start with your role',
    finalTitle: 'Explore the platform. Choose your access.',
    finalText: 'Explore the screens and select the right profile. Check the plan terms for module and benefit availability.',
    contact: 'Contact ERN',
    legal: 'Information and support',
    footer: [
      ['Contact', '/contato'],
      ['Privacy', '/privacidade'],
      ['Terms of service', '/termos'],
      ['Refunds', '/reembolso'],
    ],
  },
  ES: {
    skip: 'Ir al contenido',
    eyebrow: 'ERN Gestión · turismo en el Río Negro',
    title: 'Su operación organizada. Sus experiencias conectadas con el mundo.',
    intro: 'Clientes, reservas, logística y finanzas en un entorno de gestión. Una página pública para presentar su empresa y compartir experiencias en Rede ERN.',
    access: 'Acceder a ERN',
    screens: 'Explorar la plataforma',
    caption: 'Pantalla de ERN Gestión. Las funciones disponibles dependen del plan y del tipo de acceso.',
    image: 'Panel de ERN Gestión con indicadores e información de la operación',
    pillars: ['Gestión del operador', 'Presencia pública', 'Conexiones regionales'],
    workEyebrow: 'De la rutina a la divulgación',
    workTitle: 'Organice su empresa. Presente sus experiencias.',
    workIntro: 'ERN reúne dos áreas complementarias: el trabajo de su equipo y la presentación pública de su empresa.',
    managementTitle: 'Un lugar para seguir su operación',
    managementText: 'Organice los registros de la empresa y acompañe las etapas de cada atención.',
    managementItems: [
      'Clientes e información necesaria para la atención',
      'Reservas, paseos y vínculos con la operación',
      'Hospedajes, embarcaciones, guías y socios',
      'Ingresos, gastos, vouchers e informes según el plan',
    ],
    publicTitle: 'Una presencia para ser descubierta',
    publicText: 'Presente su identidad profesional y publique contenido para quienes exploran el Río Negro.',
    publicItems: [
      'Perfil público con presentación y canales de contacto',
      'Publicaciones con imágenes, itinerarios y experiencias',
      'Contenido disponible para los visitantes de Rede ERN',
      'Contacto a través de los canales que cada prestador ofrece',
    ],
    network: 'Conocer la red pública',
    networkEyebrow: 'Una red, diferentes actividades',
    networkTitle: 'Quienes hacen posible el turismo necesitan encontrarse.',
    networkIntro: 'Operadores, guías y proveedores tienen funciones diferentes. ERN ofrece accesos propios y una vitrina pública para acercar al visitante al territorio.',
    roles: [
      ['Operadores', 'Gestión de la empresa y presentación pública de experiencias.'],
      ['Guías', 'Registro profesional propio, independiente de los operadores.'],
      ['Proveedores', 'Participación según sus productos, servicios y actividades.'],
    ],
    networkNote: 'La presencia en la red no garantiza ventas, reservas ni disponibilidad. Confirme las condiciones de cada experiencia con el prestador.',
    journeyEyebrow: 'Un camino claro',
    journeyTitle: 'De la organización a la presencia pública.',
    steps: [
      ['Elija su acceso', 'Entre por el acceso correspondiente a su actividad turística.'],
      ['Prepare su operación', 'Organice sus registros y complete la información del perfil público.'],
      ['Revise y publique', 'Revise el texto y las imágenes antes de publicar el contenido en la red.'],
    ],
    futureEyebrow: 'Evolución del producto',
    futureTitle: 'Una base que sigue evolucionando.',
    futureText: 'El Concierge y los agentes de atención forman parte de la evolución prevista de ERN. No se presentan aquí como funciones disponibles para uso inmediato.',
    futureNote: 'La confirmación de un viaje depende de las condiciones, disponibilidad y atención de cada prestador.',
    finalEyebrow: 'Empiece por su actividad',
    finalTitle: 'Conozca la estructura. Elija su acceso.',
    finalText: 'Explore las pantallas y seleccione el perfil adecuado. Consulte las condiciones del plan para conocer los módulos y beneficios disponibles.',
    contact: 'Contactar con ERN',
    legal: 'Información y atención',
    footer: [
      ['Contacto', '/contato'],
      ['Privacidad', '/privacidade'],
      ['Términos del servicio', '/termos'],
      ['Reembolsos', '/reembolso'],
    ],
  },
};

export default function OperadoresPage() {
  const { idioma } = useLanguage();
  const t = textos[idioma];

  return (
    <div className="comercial-ern">
      <a className="pular" href="#conteudo-operadores">{t.skip}</a>
      <PublicHeader />

      <main id="conteudo-operadores" tabIndex={-1}>
        <section className="abertura">
          <div className="limite abertura-grid">
            <div className="abertura-texto">
              <p className="chamada">{t.eyebrow}</p>
              <h1>{t.title}</h1>
              <p className="introducao">{t.intro}</p>
              <div className="acoes">
                <a href="#acessos-profissionais" className="principal">{t.access}</a>
                <a href="#vitrine-gestao" className="secundario">{t.screens}</a>
              </div>
              <ul className="pilares">
                {t.pillars.map(item => <li key={item}>{item}</li>)}
              </ul>
            </div>

            <DemonstracaoOperadoresERN />
          </div>
        </section>

        <section className="bloco">
          <div className="limite">
            <header className="cabecalho">
              <p className="chamada">{t.workEyebrow}</p>
              <h2>{t.workTitle}</h2>
              <p>{t.workIntro}</p>
            </header>

            <div className="dupla">
              <article className="frente">
                <h3>{t.managementTitle}</h3>
                <p>{t.managementText}</p>
                <ul className="lista">
                  {t.managementItems.map(item => <li key={item}>{item}</li>)}
                </ul>
              </article>
              <article className="frente">
                <h3>{t.publicTitle}</h3>
                <p>{t.publicText}</p>
                <ul className="lista">
                  {t.publicItems.map(item => <li key={item}>{item}</li>)}
                </ul>
                <Link href="/rede" className="texto-link">
                  {t.network} <span aria-hidden="true">→</span>
                </Link>
              </article>
            </div>
          </div>
        </section>

        <VitrineGestaoERN
          destino="#acessos-profissionais"
          textoBotao={t.access}
        />

        <section className="bloco rede">
          <div className="limite">
            <header className="cabecalho">
              <p className="chamada">{t.networkEyebrow}</p>
              <h2>{t.networkTitle}</h2>
              <p>{t.networkIntro}</p>
            </header>

            <div className="tres">
              {t.roles.map(([titulo, descricao]) => (
                <article className="papel" key={titulo}>
                  <h3>{titulo}</h3>
                  <p>{descricao}</p>
                </article>
              ))}
            </div>
            <p className="nota">{t.networkNote}</p>
          </div>
        </section>

        <section className="bloco">
          <div className="limite">
            <header className="cabecalho">
              <p className="chamada">{t.journeyEyebrow}</p>
              <h2>{t.journeyTitle}</h2>
            </header>
            <ol className="tres etapas">
              {t.steps.map(([titulo, descricao], indice) => (
                <li key={titulo}>
                  <span className="numero" aria-hidden="true">{indice + 1}</span>
                  <h3>{titulo}</h3>
                  <p>{descricao}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="evolucao">
          <div className="limite evolucao-grid">
            <div>
              <p className="chamada">{t.futureEyebrow}</p>
              <h2>{t.futureTitle}</h2>
            </div>
            <div>
              <p>{t.futureText}</p>
              <p className="nota">{t.futureNote}</p>
            </div>
          </div>
        </section>

        <section className="bloco escolha">
          <div className="limite">
            <p className="chamada">{t.finalEyebrow}</p>
            <h2>{t.finalTitle}</h2>
            <p>{t.finalText}</p>
            <Link href="/contato" className="texto-link">
              {t.contact} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <AcessosProfissionais />
      </main>

      <footer className="rodape">
        <div className="limite rodape-interior">
          <p>Encantos Rio Negro · Barcelos, Amazonas</p>
          <nav aria-label={t.legal}>
            {t.footer.map(([rotulo, href]) => (
              <Link href={href} key={href}>{rotulo}</Link>
            ))}
          </nav>
        </div>
      </footer>

      <style jsx>{`
        .comercial-ern {
          background:#fff7db;
          color:#30260d;
          font-family:var(--font-work-sans),sans-serif;
        }
        .limite { width:100%; max-width:1240px; margin:0 auto; min-width:0; }
        .abertura { padding:144px 24px 72px; border-bottom:1px solid #cdba7a; }
        .abertura-grid { display:grid; grid-template-columns:.95fr 1.05fr; gap:48px; align-items:center; }
        .abertura-texto { min-width:0; }
        .chamada { color:#805600; font-size:11px; line-height:1.7; font-weight:700; text-transform:uppercase; letter-spacing:.16em; }
        h1,h2,h3 { font-family:var(--font-fraunces),serif; overflow-wrap:anywhere; }
        h1 { font-size:clamp(36px,4.5vw,66px); line-height:1.06; letter-spacing:-.04em; margin:20px 0 0; }
        h2 { font-size:clamp(30px,3.8vw,48px); line-height:1.12; letter-spacing:-.025em; margin:16px 0 0; }
        h3 { font-size:26px; line-height:1.2; }
        p { overflow-wrap:anywhere; }
        .introducao { margin-top:24px; font-size:17px; line-height:1.9; color:#695727; }
        .acoes { display:flex; flex-wrap:wrap; gap:12px; margin-top:28px; }
        .acoes a { display:inline-flex; align-items:center; justify-content:center; min-height:52px; padding:12px 20px; border-radius:12px; font-size:14px; font-weight:700; text-align:center; text-decoration:none; }
        .principal { background:#805600; color:#fff; border:1px solid #805600; }
        .principal:hover { background:#644300; }
        .secundario { border:1px solid #a58b48; color:#30260d; }
        .secundario:hover { background:#f0e4bb; }
        .pilares { display:flex; flex-wrap:wrap; gap:8px 18px; margin-top:26px; padding:0; list-style:none; color:#695727; font-size:12px; line-height:1.8; }
        .pilares li { border-bottom:1px solid #cdba7a; padding-bottom:4px; }
        .hero-captura { min-width:0; margin:0; padding:12px; background:#fffcf0; border:1px solid #cdba7a; border-radius:18px; box-shadow:0 18px 45px #30260d12; }
        .hero-captura :global(a) { display:block; border-radius:8px; }
        .hero-captura :global(.captura) { display:block; width:100%; height:auto; border-radius:8px; }
        figcaption { padding:12px 4px 2px; color:#695727; font-size:12px; line-height:1.7; }
        .bloco { padding:80px 24px; }
        .cabecalho { max-width:800px; }
        .cabecalho>p:last-child:not(.chamada) { margin-top:22px; color:#695727; font-size:16px; line-height:1.9; }
        .dupla { display:grid; grid-template-columns:1fr 1fr; gap:48px; margin-top:40px; }
        .frente { min-width:0; border-top:2px solid #805600; padding-top:24px; }
        .frente>p { margin-top:16px; color:#695727; line-height:1.8; }
        .lista { padding-left:20px; margin-top:20px; list-style:disc; }
        .lista li { padding:6px 0; color:#695727; line-height:1.75; font-size:14px; overflow-wrap:anywhere; }
        :global(.comercial-ern .texto-link) { display:inline-flex; align-items:center; gap:16px; min-height:48px; margin-top:20px; color:#805600; font-weight:700; text-decoration:underline; text-underline-offset:5px; }
        .rede { background:#fffcf0; border-top:1px solid #cdba7a; border-bottom:1px solid #cdba7a; }
        .tres { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:32px; margin-top:36px; }
        .papel { border-top:1px solid #cdba7a; padding-top:22px; }
        .papel p,.etapas p { margin-top:14px; color:#695727; font-size:15px; line-height:1.85; }
        .nota { max-width:860px; margin-top:28px; color:#695727; font-size:13px; line-height:1.85; }
        .etapas { list-style:none; padding:0; }
        .etapas li { min-width:0; }
        .numero { display:flex; align-items:center; justify-content:center; width:40px; height:40px; border:1px solid #a58b48; border-radius:50%; color:#805600; font-size:14px; font-weight:700; margin-bottom:20px; }
        .evolucao { padding:48px 24px; background:#f0e4bb; border-block:1px solid #cdba7a; }
        .evolucao-grid { display:grid; grid-template-columns:1fr 1fr; gap:48px; align-items:start; }
        .evolucao-grid>div>p:not(.chamada) { color:#695727; line-height:1.9; }
        .evolucao h2 { font-size:clamp(28px,3vw,38px); }
        .escolha { padding-bottom:28px; }
        .escolha .limite { max-width:840px; text-align:center; }
        .escolha .limite>p:not(.chamada) { margin-top:22px; color:#695727; line-height:1.9; }
        .rodape { padding:30px 24px; border-top:1px solid #cdba7a; }
        .rodape-interior { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:20px; }
        .rodape p { color:#695727; font-size:12px; line-height:1.8; }
        .rodape nav { display:flex; flex-wrap:wrap; gap:4px 20px; }
        .rodape nav :global(a) { display:inline-flex; align-items:center; min-height:44px; color:#695727; font-size:12px; text-decoration:underline; text-underline-offset:4px; }
        .pular { position:fixed; left:16px; top:12px; z-index:1000; transform:translateY(-200%); padding:14px 20px; background:#fff7db; color:#30260d; border:2px solid #805600; border-radius:8px; }
        .pular:focus { transform:translateY(0); }
        .acoes a:focus-visible,.pular:focus-visible,
        .hero-captura :global(a:focus-visible),
        :global(.comercial-ern .texto-link:focus-visible),
        .rodape nav :global(a:focus-visible) { outline:3px solid #805600; outline-offset:4px; }
        @media(max-width:1023px) {
          .abertura-grid { grid-template-columns:1fr; gap:32px; }
          .abertura-texto { max-width:780px; }
          .hero-captura { width:100%; max-width:900px; }
          h1 { max-width:800px; font-size:clamp(36px,6vw,60px); }
        }
        @media(max-width:639px) {
          .abertura { padding:112px 16px 48px; }
          .bloco { padding:52px 16px; }
          .dupla,.tres,.evolucao-grid { grid-template-columns:1fr; gap:28px; }
          .dupla { margin-top:28px; }
          .introducao { font-size:16px; line-height:1.8; }
          .acoes { flex-direction:column; }
          .acoes a { width:100%; }
          .hero-captura { padding:7px; border-radius:12px; }
          .evolucao { padding:36px 16px; }
          .escolha { padding-bottom:12px; }
          .rodape { padding:24px 16px; }
        }
      `}</style>
    </div>
  );
}
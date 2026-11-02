'use client';

// ERN_OPERADORES_PREMIUM_V1
// Página "Para operadores" no padrão Encantos da Amazônia: abertura escura
// com painel desenhado (números de exemplo), o caminho do clique à reserva,
// recursos em grade, um acesso para cada atuação e fechamento com planos.

import Link from 'next/link';
import PublicHeader from '@/app/components/PublicHeader';
import LogoERN from '@/app/components/LogoERN';
import ArcoFlechaERN from '@/app/components/ArcoFlechaERN';
import { useLanguage } from '@/app/components/LanguageProvider';

type Texto = {
  skip: string; eyebrow: string; title: [string, string, string]; intro: string;
  start: string; plans: string; checks: string[];
  panelLabel: string; panelHello: string; panelExample: string; kpis: [string, string][];
  revenue: string; next: string; trips: string[]; menu: string[];
  flowEyebrow: string; flowTitle: string; step: string; flow: [string, string, string][];
  featEyebrow: string; featTitle: string; fishingTag: string; fishingTitle: string; fishingText: string;
  feats: [string, string, string][]; mapTitle: string; mapText: string; profileTitle: string; profileText: string;
  rolesTitle: string; roles: [string, string, string, string, string][];
  finalTitle: [string, string, string]; finalText: string; contact: string; note: string;
  footer: [string, string][];
};

const textos: Record<'PT' | 'EN' | 'ES', Texto> = {
  PT: {
    skip: 'Ir para o conteúdo',
    eyebrow: 'Encantos Gestão · para quem faz o turismo no Amazonas',
    title: ['Sua operação organizada.', 'Seus passeios vistos', 'pelo mundo.'],
    intro: 'Reservas, clientes, financeiro e vouchers num só lugar. E uma vitrine na Rede EDA e no mapa de Destinos, onde visitantes chamam você direto no WhatsApp.',
    start: 'Começar agora', plans: 'Ver planos e preços',
    checks: ['Português, inglês e espanhol', 'Funciona no celular', 'Feito no Rio Negro'],
    panelLabel: 'Encantos Gestão · Painel', panelHello: 'Bom dia, equipe', panelExample: 'Exemplo',
    kpis: [['12', 'reservas no mês'], ['R$ 48 mil', 'a receber'], ['86', 'flechadas na Rede'], ['23', 'chamadas no WhatsApp']],
    revenue: 'Receita · últimos 6 meses', next: 'Próximas saídas',
    trips: ['🎣 Mariuá · 5 dias · 4 pax', '🛶 Anavilhanas · 2 pax', '⛰ Serra do Aracá · 6 pax'],
    menu: ['Painel', 'Reservas', 'Clientes', 'Passeios', 'Financeiro', 'Vouchers', 'Rede EDA'],
    flowEyebrow: 'Do clique à reserva', flowTitle: 'O visitante descobre. Você fecha a viagem.', step: 'Passo',
    flow: [
      ['🗺', 'Descobre no mapa', 'Seu passeio aparece no Destinos, na cidade e na vista de satélite.'],
      ['🏹', 'Flecha na Rede', 'Suas fotos e vídeos recebem reações, salvamentos e comentários.'],
      ['💬', 'Chama no WhatsApp', 'Um botão leva o visitante direto para a sua conversa.'],
      ['✅', 'Reserva no Gestão', 'Cliente, voucher, pagamento e agenda organizados.'],
    ],
    featEyebrow: 'Tudo que a operação precisa', featTitle: 'Organize por dentro. Apareça por fora.',
    fishingTag: 'Pesca esportiva', fishingTitle: 'Temporada, barcos-hotel e grupos',
    fishingText: 'Saídas, pescadores, embarcações e guias organizados por expedição.',
    feats: [
      ['📅', 'Reservas e agenda', 'Saídas, lotação e status de cada viagem.'],
      ['👥', 'Clientes', 'Histórico, documentos e preferências.'],
      ['💰', 'Financeiro e NFS-e', 'Receitas, despesas e nota fiscal conforme o plano.'],
      ['🎫', 'Vouchers em PDF', 'Em três idiomas, com a sua marca.'],
    ],
    mapTitle: 'Mapa operacional por satélite', mapText: 'Embarques, praias e pontos da sua operação vistos de cima.',
    profileTitle: 'Perfil público + Rede EDA', profileText: 'Página com selo verificado, publicações e botão de WhatsApp para os visitantes.',
    rolesTitle: 'Como você atua no turismo?',
    roles: [
      ['operadora', '/images/regiao/barceloscapital.jpg.jpeg', 'Operadora ou agência', 'Gestão completa da empresa e da equipe.', 'Acessar como operadora'],
      ['guia', '/images/regiao/guias.png.jpeg', 'Guia de turismo', 'Perfil profissional próprio, independente das operadoras.', 'Acessar como guia'],
      ['fornecedor', '/images/regiao/viagembarco.png.jpeg', 'Fornecedor', 'Barcos, hospedagens, transporte e serviços.', 'Acessar como fornecedor'],
    ],
    finalTitle: ['Leve sua operação para a vitrine da', 'Amazônia', '.'],
    finalText: 'Escolha o plano, crie a conta e publique seu primeiro roteiro.',
    contact: 'Falar com a EDA',
    note: 'Os números do painel são ilustrativos. Os recursos disponíveis dependem do plano e do tipo de acesso. A presença na Rede não garante vendas ou reservas.',
    footer: [['Contato', '/contato'], ['Privacidade', '/privacidade'], ['Termos de serviço', '/termos'], ['Reembolso', '/reembolso']],
  },
  EN: {
    skip: 'Skip to content',
    eyebrow: 'Encantos Gestão · for tourism businesses in Amazonas',
    title: ['Your operation organized.', 'Your tours seen', 'around the world.'],
    intro: 'Bookings, clients, finance and vouchers in one place. Plus a showcase on the EDA Network and the Destinations map, where visitors message you directly on WhatsApp.',
    start: 'Get started', plans: 'See plans and pricing',
    checks: ['Portuguese, English and Spanish', 'Works on mobile', 'Made on the Rio Negro'],
    panelLabel: 'Encantos Gestão · Dashboard', panelHello: 'Good morning, team', panelExample: 'Example',
    kpis: [['12', 'bookings this month'], ['R$ 48k', 'receivable'], ['86', 'arrows on the Network'], ['23', 'WhatsApp contacts']],
    revenue: 'Revenue · last 6 months', next: 'Upcoming departures',
    trips: ['🎣 Mariuá · 5 days · 4 pax', '🛶 Anavilhanas · 2 pax', '⛰ Serra do Aracá · 6 pax'],
    menu: ['Dashboard', 'Bookings', 'Clients', 'Tours', 'Finance', 'Vouchers', 'EDA Network'],
    flowEyebrow: 'From click to booking', flowTitle: 'Visitors discover. You close the trip.', step: 'Step',
    flow: [
      ['🗺', 'Discover on the map', 'Your tour appears on Destinations, in the city and in satellite view.'],
      ['🏹', 'Arrow on the Network', 'Your photos and videos get reactions, saves and comments.'],
      ['💬', 'Message on WhatsApp', 'One button takes the visitor straight to your chat.'],
      ['✅', 'Book in Gestão', 'Client, voucher, payment and schedule organized.'],
    ],
    featEyebrow: 'Everything your operation needs', featTitle: 'Organized inside. Visible outside.',
    fishingTag: 'Sport fishing', fishingTitle: 'Seasons, boat hotels and groups',
    fishingText: 'Departures, anglers, boats and guides organized by expedition.',
    feats: [
      ['📅', 'Bookings and schedule', 'Departures, capacity and status of each trip.'],
      ['👥', 'Clients', 'History, documents and preferences.'],
      ['💰', 'Finance and invoices', 'Income, expenses and service invoices depending on the plan.'],
      ['🎫', 'PDF vouchers', 'In three languages, with your brand.'],
    ],
    mapTitle: 'Satellite operations map', mapText: 'Boarding points, beaches and spots of your operation seen from above.',
    profileTitle: 'Public profile + EDA Network', profileText: 'A verified page with posts and a WhatsApp button for visitors.',
    rolesTitle: 'How do you work in tourism?',
    roles: [
      ['operadora', '/images/regiao/barceloscapital.jpg.jpeg', 'Tour operator or agency', 'Full management of your company and team.', 'Sign in as operator'],
      ['guia', '/images/regiao/guias.png.jpeg', 'Tour guide', 'Your own professional profile, independent of operators.', 'Sign in as guide'],
      ['fornecedor', '/images/regiao/viagembarco.png.jpeg', 'Supplier', 'Boats, lodging, transport and services.', 'Sign in as supplier'],
    ],
    finalTitle: ['Bring your operation to the showcase of the', 'Amazon', '.'],
    finalText: 'Choose a plan, create your account and publish your first itinerary.',
    contact: 'Talk to EDA',
    note: 'Dashboard figures are illustrative. Available features depend on the plan and access type. A Network presence does not guarantee sales or bookings.',
    footer: [['Contact', '/contato'], ['Privacy', '/privacidade'], ['Terms of service', '/termos'], ['Refunds', '/reembolso']],
  },
  ES: {
    skip: 'Ir al contenido',
    eyebrow: 'Encantos Gestão · para quien hace el turismo en Amazonas',
    title: ['Tu operación organizada.', 'Tus paseos vistos', 'por el mundo.'],
    intro: 'Reservas, clientes, finanzas y vouchers en un solo lugar. Y una vitrina en la Red EDA y en el mapa de Destinos, donde los visitantes te escriben directo por WhatsApp.',
    start: 'Empezar ahora', plans: 'Ver planes y precios',
    checks: ['Portugués, inglés y español', 'Funciona en el celular', 'Hecho en el Río Negro'],
    panelLabel: 'Encantos Gestão · Panel', panelHello: 'Buenos días, equipo', panelExample: 'Ejemplo',
    kpis: [['12', 'reservas del mes'], ['R$ 48 mil', 'por cobrar'], ['86', 'flechazos en la Red'], ['23', 'contactos por WhatsApp']],
    revenue: 'Ingresos · últimos 6 meses', next: 'Próximas salidas',
    trips: ['🎣 Mariuá · 5 días · 4 pax', '🛶 Anavilhanas · 2 pax', '⛰ Serra do Aracá · 6 pax'],
    menu: ['Panel', 'Reservas', 'Clientes', 'Paseos', 'Finanzas', 'Vouchers', 'Red EDA'],
    flowEyebrow: 'Del clic a la reserva', flowTitle: 'El visitante descubre. Tú cierras el viaje.', step: 'Paso',
    flow: [
      ['🗺', 'Descubre en el mapa', 'Tu paseo aparece en Destinos, en la ciudad y en la vista satelital.'],
      ['🏹', 'Flecha en la Red', 'Tus fotos y videos reciben reacciones, guardados y comentarios.'],
      ['💬', 'Escribe por WhatsApp', 'Un botón lleva al visitante directo a tu conversación.'],
      ['✅', 'Reserva en Gestão', 'Cliente, voucher, pago y agenda organizados.'],
    ],
    featEyebrow: 'Todo lo que la operación necesita', featTitle: 'Organiza por dentro. Aparece por fuera.',
    fishingTag: 'Pesca deportiva', fishingTitle: 'Temporada, barcos-hotel y grupos',
    fishingText: 'Salidas, pescadores, embarcaciones y guías organizados por expedición.',
    feats: [
      ['📅', 'Reservas y agenda', 'Salidas, cupos y estado de cada viaje.'],
      ['👥', 'Clientes', 'Historial, documentos y preferencias.'],
      ['💰', 'Finanzas y facturas', 'Ingresos, gastos y factura según el plan.'],
      ['🎫', 'Vouchers en PDF', 'En tres idiomas, con tu marca.'],
    ],
    mapTitle: 'Mapa operativo satelital', mapText: 'Embarques, playas y puntos de tu operación vistos desde arriba.',
    profileTitle: 'Perfil público + Red EDA', profileText: 'Página con sello verificado, publicaciones y botón de WhatsApp para los visitantes.',
    rolesTitle: '¿Cómo trabajas en el turismo?',
    roles: [
      ['operadora', '/images/regiao/barceloscapital.jpg.jpeg', 'Operadora o agencia', 'Gestión completa de la empresa y del equipo.', 'Entrar como operadora'],
      ['guia', '/images/regiao/guias.png.jpeg', 'Guía de turismo', 'Perfil profesional propio, independiente de las operadoras.', 'Entrar como guía'],
      ['fornecedor', '/images/regiao/viagembarco.png.jpeg', 'Proveedor', 'Barcos, hospedajes, transporte y servicios.', 'Entrar como proveedor'],
    ],
    finalTitle: ['Lleva tu operación a la vitrina de la', 'Amazonía', '.'],
    finalText: 'Elige el plan, crea la cuenta y publica tu primer itinerario.',
    contact: 'Hablar con EDA',
    note: 'Las cifras del panel son ilustrativas. Los recursos dependen del plan y del tipo de acceso. La presencia en la Red no garantiza ventas ni reservas.',
    footer: [['Contacto', '/contato'], ['Privacidad', '/privacidade'], ['Términos de servicio', '/termos'], ['Reembolso', '/reembolso']],
  },
};

const TITULO = 'font-[family-name:var(--font-inter)] font-semibold tracking-[-0.035em] text-[#F5F3EA]';
const DOURADO = 'bg-gradient-to-r from-[#E3A144] via-[#FBE3AE] to-[#E3A144] bg-clip-text text-transparent';
const OURO = 'inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#F7D595] to-[#E3A144] px-7 text-[15px] font-bold text-[#07110E] shadow-[0_12px_28px_rgb(227_161_68/28%),inset_0_1px_0_rgb(255_255_255/55%)] transition hover:brightness-105';
const VIDRO = 'inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 text-[15px] font-semibold text-[#F0F0E8] transition hover:border-[#F4C77E]/60';
const FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F4C77E]';
const EYEBROW = 'text-[11.5px] font-semibold uppercase tracking-[0.2em] text-[#F4C77E]';
const CARTAO = 'rounded-[22px] border border-white/[0.08] bg-[#0A1713] p-6';

function PainelExemplo({ t }: { t: Texto }) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-[#F4C77E]/30 bg-[#08130F] shadow-[0_40px_90px_rgb(0_0_0/55%)]" role="img" aria-label={`${t.panelLabel} · ${t.panelExample}`}>
      <div className="flex items-center gap-2 border-b border-white/[0.08] px-4 py-3" aria-hidden="true">
        <span className="size-2.5 rounded-full bg-[#3A5047]" /><span className="size-2.5 rounded-full bg-[#3A5047]" /><span className="size-2.5 rounded-full bg-[#3A5047]" />
        <span className="ml-2 text-xs text-[#8FA39A]">{t.panelLabel}</span>
        <span className="ml-auto rounded-full border border-[#F4C77E]/40 px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#F4C77E]">{t.panelExample}</span>
      </div>
      <div className="grid grid-cols-[150px_minmax(0,1fr)] max-sm:grid-cols-1" aria-hidden="true">
        <div className="grid content-start gap-1 border-r border-white/[0.06] p-3 max-sm:hidden">
          {t.menu.map((item, i) => <span key={item} className={`rounded-[10px] px-3 py-2 text-xs ${i === 0 ? 'bg-gradient-to-b from-[#F7D595] to-[#E3A144] font-bold text-[#07110E]' : 'text-[#CDD8D2]'}`}>{item}</span>)}
        </div>
        <div className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F4C77E]">Barcelos · AM</p>
          <b className="mt-1 block text-lg text-[#F5F3EA]">{t.panelHello} 👋</b>
          <div className="mt-3 grid grid-cols-4 gap-2 max-sm:grid-cols-2">
            {t.kpis.map(([valor, rotulo]) => <div key={rotulo} className="rounded-[14px] border border-white/[0.08] bg-[#0D1C17] p-3"><b className="block text-xl text-[#F5F3EA]">{valor}</b><span className="text-[11px] leading-tight text-[#8FA39A]">{rotulo}</span></div>)}
          </div>
          <div className="mt-2 grid grid-cols-[1.4fr_1fr] gap-2 max-sm:grid-cols-1">
            <div className="rounded-[14px] border border-white/[0.08] bg-[#0D1C17] p-3">
              <span className="text-[11px] text-[#8FA39A]">{t.revenue}</span>
              <svg viewBox="0 0 300 80" className="mt-1 h-20 w-full"><path d="M0 70 L50 58 L100 62 L150 40 L200 34 L250 18 L300 10 L300 80 L0 80Z" fill="rgb(227 161 68 / 12%)" /><path d="M0 70 L50 58 L100 62 L150 40 L200 34 L250 18 L300 10" fill="none" stroke="#E3A144" strokeWidth="3" /></svg>
            </div>
            <div className="rounded-[14px] border border-white/[0.08] bg-[#0D1C17] p-3">
              <span className="text-[11px] text-[#8FA39A]">{t.next}</span>
              {t.trips.map(viagem => <span key={viagem} className="mt-2 block text-xs text-[#DBE3DE]">{viagem}</span>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OperadoresPage() {
  const { idioma } = useLanguage();
  const t = textos[idioma === 'EN' || idioma === 'ES' ? idioma : 'PT'];

  return (
    <div className="ern-publico-hero min-h-dvh bg-[#07110E] font-[family-name:var(--font-work-sans)] text-[#EDEDE3]">
      <a href="#conteudo-operadores" className={`fixed left-3 top-24 z-[200] -translate-x-[150%] rounded-lg bg-[#E3A144] px-4 py-2 text-sm font-bold text-[#07110E] focus:translate-x-0 ${FOCO}`}>{t.skip}</a>
      <PublicHeader />
      <main id="conteudo-operadores">
        <section className="bg-[radial-gradient(80%_90%_at_85%_20%,rgb(227_161_68/12%),transparent_60%)] px-5 pb-20 pt-32 sm:px-8 lg:pt-36">
          <div className="mx-auto grid max-w-[1280px] items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
            <div>
              <p className={EYEBROW}>{t.eyebrow}</p>
              <h1 className={`${TITULO} mt-4 text-[clamp(2.4rem,5vw,3.75rem)] leading-[1.04]`}>{t.title[0]}<br />{t.title[1]} <span className={DOURADO}>{t.title[2]}</span></h1>
              <p className="mt-5 max-w-[540px] text-[17px] leading-7 text-[#B8C9BF]">{t.intro}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/login?acesso=operadora" className={`${OURO} ${FOCO}`}>{t.start} <span aria-hidden="true">→</span></Link>
                <Link href="/planos" className={`${VIDRO} ${FOCO}`}>{t.plans}</Link>
              </div>
              <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-[#8FA39A]">{t.checks.map(item => <li key={item}>✓ {item}</li>)}</ul>
            </div>
            <PainelExemplo t={t} />
          </div>
        </section>

        <section className="border-y border-white/[0.06] bg-[#08130F] px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-[1280px]">
            <p className={EYEBROW}>{t.flowEyebrow}</p>
            <h2 className={`${TITULO} mt-3 text-[clamp(1.9rem,3.4vw,2.6rem)] leading-tight`}>{t.flowTitle}</h2>
            <ol className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {t.flow.map(([icone, titulo, texto], i) => (
                <li key={titulo} className={`${CARTAO} ern-revela-rolagem`}>
                  <span className="grid size-11 place-items-center rounded-xl bg-[#E3A144]/15 text-xl text-[#F4C77E]" aria-hidden="true">{i === 1 ? <ArcoFlechaERN tamanho={24} /> : icone}</span>
                  <span className="mt-4 block text-[11px] font-bold uppercase tracking-[0.16em] text-[#F4C77E]">{t.step} {i + 1}</span>
                  <h3 className="mt-2 text-lg font-semibold text-[#F5F3EA]">{titulo}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-[#B8C9BF]">{texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-[1280px]">
            <p className={EYEBROW}>{t.featEyebrow}</p>
            <h2 className={`${TITULO} mt-3 text-[clamp(1.9rem,3.4vw,2.6rem)] leading-tight`}>{t.featTitle}</h2>
            <div className="mt-9 grid auto-rows-[minmax(190px,auto)] gap-4 md:grid-cols-2 lg:grid-cols-4">
              <article className="relative min-h-[320px] overflow-hidden rounded-[22px] border border-white/[0.08] md:col-span-2 lg:row-span-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/regiao/mulhertucunare.png.jpeg" alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#07110E]/30 to-[#07110E]/95" />
                <div className="absolute inset-x-6 bottom-6">
                  <span className="inline-flex rounded-full bg-gradient-to-b from-[#F7D595] to-[#E3A144] px-3 py-1 text-xs font-bold text-[#07110E]">{t.fishingTag}</span>
                  <h3 className="mt-3 text-2xl font-semibold text-[#F5F3EA]">{t.fishingTitle}</h3>
                  <p className="mt-1.5 max-w-md text-sm leading-6 text-[#DBE3DE]">{t.fishingText}</p>
                </div>
              </article>
              {t.feats.map(([icone, titulo, texto]) => (
                <article key={titulo} className={`${CARTAO} ern-revela-rolagem`}>
                  <span className="grid size-11 place-items-center rounded-xl bg-[#E3A144]/15 text-xl" aria-hidden="true">{icone}</span>
                  <h3 className="mt-3 text-lg font-semibold text-[#F5F3EA]">{titulo}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-[#B8C9BF]">{texto}</p>
                </article>
              ))}
              <article className={`${CARTAO} md:col-span-2`}>
                <span className="grid size-11 place-items-center rounded-xl bg-[#E3A144]/15 text-xl" aria-hidden="true">🛰</span>
                <h3 className="mt-3 text-lg font-semibold text-[#F5F3EA]">{t.mapTitle}</h3>
                <p className="mt-1.5 text-sm leading-6 text-[#B8C9BF]">{t.mapText}</p>
              </article>
              <article className="rounded-[22px] border border-[#F4C77E]/30 bg-gradient-to-b from-[#14352A] to-[#0A1713] p-6 md:col-span-2">
                <span className="grid size-11 place-items-center rounded-xl bg-[#E3A144]/15 text-[#F4C77E]" aria-hidden="true"><ArcoFlechaERN tamanho={24} /></span>
                <h3 className="mt-3 text-lg font-semibold text-[#F5F3EA]">{t.profileTitle}</h3>
                <p className="mt-1.5 text-sm leading-6 text-[#B8C9BF]">{t.profileText}</p>
              </article>
            </div>
          </div>
        </section>

        <section className="border-y border-white/[0.06] bg-[#08130F] px-5 py-20 sm:px-8" aria-labelledby="operadores-atuacao">
          <div className="mx-auto max-w-[1280px]">
            <h2 id="operadores-atuacao" className={`${TITULO} text-[clamp(1.8rem,3vw,2.3rem)]`}>{t.rolesTitle}</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {t.roles.map(([id, imagem, titulo, texto, cta], i) => (
                <article key={id} className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#0A1713]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagem} alt="" className="h-40 w-full object-cover" loading="lazy" />
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-[#F5F3EA]">{titulo}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-[#B8C9BF]">{texto}</p>
                    <Link href={`/login?acesso=${id}`} className={`${i === 0 ? OURO : VIDRO} ${FOCO} mt-5 min-h-11 px-5 text-sm`}>{cta} <span aria-hidden="true">→</span></Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[radial-gradient(60%_80%_at_50%_0%,rgb(227_161_68/14%),transparent_70%)] px-5 py-24 text-center sm:px-8">
          <div className="mx-auto flex max-w-[820px] flex-col items-center">
            <LogoERN tamanho={56} />
            <h2 className={`${TITULO} mt-5 text-[clamp(2rem,4vw,2.75rem)] leading-[1.1]`}>{t.finalTitle[0]} <span className={DOURADO}>{t.finalTitle[1]}</span>{t.finalTitle[2]}</h2>
            <p className="mt-4 max-w-[560px] text-base leading-7 text-[#B8C9BF]">{t.finalText}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/login?acesso=operadora" className={`${OURO} ${FOCO}`}>{t.start} <span aria-hidden="true">→</span></Link>
              <Link href="/planos" className={`${VIDRO} ${FOCO}`}>{t.plans}</Link>
              <Link href="/contato" className={`${VIDRO} ${FOCO}`}>{t.contact}</Link>
            </div>
            <p className="mt-8 max-w-[640px] text-xs leading-5 text-[#8FA39A]">{t.note}</p>
          </div>
        </section>
      </main>
      <footer className="border-t border-white/10 px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3"><LogoERN tamanho={40} /><span className="leading-tight"><span className="block text-lg font-semibold text-[#F0F0E8]">Encantos Gestão</span><span className="block text-xs text-[#8FA39A]">Encantos da Amazônia · do Rio Negro a Parintins</span></span></div>
          <nav aria-label="Informações e atendimento" className="flex flex-wrap gap-x-5 gap-y-1">
            {t.footer.map(([nome, href]) => <Link key={href} href={href} className={`inline-flex min-h-11 items-center text-sm font-semibold text-[#EDEDE3] hover:text-[#F4C77E] ${FOCO}`}>{nome}</Link>)}
          </nav>
        </div>
      </footer>
    </div>
  );
}

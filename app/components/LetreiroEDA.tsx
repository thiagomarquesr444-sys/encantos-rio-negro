'use client';
// EDA_LETREIRO_PREMIUM_V3: "Por que a Encantos da Amazônia" em mosaico premium.
// Cinco frentes, cada uma ligada a um nicho/programa onde a EDA pode se encaixar
// (economia criativa, pesca esportiva sustentável, turismo de base comunitária,
// turismo fluvial e inovação), com referência aos ODS da ONU.
// Fotos em WebP leve (≤100 KB) e carregamento preguiçoso para o interior.
import { useLanguage } from '@/app/components/LanguageProvider';
import './letreiro-eda.css';

type Item = { foto: string; selo: string; titulo: string; texto: string; alt: string };
type Bloco = { olho: string; titulo: string; sub: string; lista: string; itens: Item[] };

const F = '/images/letreiro/';

const conteudo: Record<'PT' | 'EN' | 'ES', Bloco> = {
  PT: {
    olho: 'Turismo · Cultura · Conservação',
    titulo: 'Por que a Encantos da Amazônia',
    sub: 'Cinco frentes que transformam o território em experiência, renda local e conservação, alinhadas aos Objetivos de Desenvolvimento Sustentável da ONU.',
    lista: 'Motivos, deslize para ver todos',
    itens: [
      { foto: 'festivais.webp', selo: 'Economia criativa · ODS 11', titulo: 'Festivais que movem o Amazonas',
        texto: 'Parintins, as Cirandas de Manacapuru, o Festival do Peixe Ornamental de Barcelos e tantos outros viram roteiro: a EDA leva o calendário de festas ao visitante e a renda às cidades, o ano inteiro.',
        alt: 'Dançarinos com fantasias indígenas de penas verdes e laranja se apresentando à noite em um festival amazônico' },
      { foto: 'pesca-esportiva.webp', selo: 'Pesque e solte · ODS 15', titulo: 'Pesca esportiva sustentável',
        texto: 'O tucunaré atrai pescadores do mundo todo. A EDA conecta operações de pesque e solte a quem cuida do rio, e dá espaço às mulheres na pesca.',
        alt: 'Pescadora segurando um grande tucunaré dentro do rio, com a floresta ao fundo' },
      { foto: 'base-comunitaria.webp', selo: 'Base comunitária · ODS 8', titulo: 'Renda para quem vive aqui',
        texto: 'Guias, barqueiros, cozinheiras e artesãos ganham vitrine própria e recebem o contato do visitante direto, sem intermediário.',
        alt: 'Guia local mostrando um tucunaré-açu no rio ao entardecer' },
      { foto: 'turismo-fluvial.webp', selo: 'Roteiros integrados', titulo: 'Do Rio Negro ao Solimões',
        texto: 'Barcos-hotel, expedições e passeios de vários municípios reunidos num só mapa, com reserva e voucher organizados.',
        alt: 'Convés de um barco navegando no rio ao pôr do sol' },
      { foto: 'inovacao-territorio.webp', selo: 'Inovação · ODS 9', titulo: 'Tecnologia feita para o interior',
        texto: 'Plataforma leve, em três idiomas, que funciona com sinal fraco: pronta para editais de inovação e turismo sustentável.',
        alt: 'Vista aérea de bancos de areia e ilhas no Rio Negro' },
    ],
  },
  EN: {
    olho: 'Tourism · Culture · Conservation',
    titulo: 'Why Encantos da Amazônia',
    sub: 'Five fronts that turn the region into experiences, local income and conservation, aligned with the UN Sustainable Development Goals.',
    lista: 'Reasons, swipe to see all',
    itens: [
      { foto: 'festivais.webp', selo: 'Creative economy · SDG 11', titulo: 'Festivals that move Amazonas',
        texto: 'Parintins, the Manacapuru Cirandas, the Barcelos Ornamental Fish Festival and many more become itineraries: EDA brings the festival calendar to visitors and income to the towns, all year long.',
        alt: 'Dancers in green and orange feathered Indigenous costumes performing at night at an Amazonian festival' },
      { foto: 'pesca-esportiva.webp', selo: 'Catch & release · SDG 15', titulo: 'Sustainable sport fishing',
        texto: 'Peacock bass draw anglers from around the world. EDA connects catch-and-release operations with people who care for the river, and makes room for women in fishing.',
        alt: 'Woman angler holding a large peacock bass in the river, with the forest behind' },
      { foto: 'base-comunitaria.webp', selo: 'Community-based · SDG 8', titulo: 'Income for local people',
        texto: 'Guides, boat captains, cooks and artisans get their own showcase and receive visitor contacts directly, with no middleman.',
        alt: 'Local guide showing a peacock bass on the river at sunset' },
      { foto: 'turismo-fluvial.webp', selo: 'Integrated routes', titulo: 'From Rio Negro to Solimões',
        texto: 'Riverboat hotels, expeditions and tours from many towns on a single map, with bookings and vouchers organized.',
        alt: 'Deck of a boat sailing on the river at sunset' },
      { foto: 'inovacao-territorio.webp', selo: 'Innovation · SDG 9', titulo: 'Technology built for the interior',
        texto: 'A light platform in three languages that works on weak signal: ready for innovation and sustainable tourism programs.',
        alt: 'Aerial view of sandbanks and islands on the Rio Negro' },
    ],
  },
  ES: {
    olho: 'Turismo · Cultura · Conservación',
    titulo: 'Por qué Encantos da Amazônia',
    sub: 'Cinco frentes que convierten el territorio en experiencias, ingresos locales y conservación, alineadas con los Objetivos de Desarrollo Sostenible de la ONU.',
    lista: 'Motivos, desliza para ver todos',
    itens: [
      { foto: 'festivais.webp', selo: 'Economía creativa · ODS 11', titulo: 'Festivales que mueven Amazonas',
        texto: 'Parintins, las Cirandas de Manacapuru, el Festival del Pez Ornamental de Barcelos y muchos más se vuelven itinerarios: EDA lleva el calendario de fiestas al visitante y los ingresos a las ciudades, todo el año.',
        alt: 'Bailarines con trajes indígenas de plumas verdes y naranjas actuando de noche en un festival amazónico' },
      { foto: 'pesca-esportiva.webp', selo: 'Pesca y suelta · ODS 15', titulo: 'Pesca deportiva sostenible',
        texto: 'El tucunaré atrae pescadores de todo el mundo. EDA conecta operaciones de pesca y suelta con quienes cuidan el río, y abre espacio a las mujeres en la pesca.',
        alt: 'Pescadora sosteniendo un gran tucunaré dentro del río, con la selva al fondo' },
      { foto: 'base-comunitaria.webp', selo: 'Base comunitaria · ODS 8', titulo: 'Ingresos para quien vive aquí',
        texto: 'Guías, barqueros, cocineras y artesanos tienen su propia vitrina y reciben el contacto del visitante directo, sin intermediarios.',
        alt: 'Guía local mostrando un tucunaré en el río al atardecer' },
      { foto: 'turismo-fluvial.webp', selo: 'Rutas integradas', titulo: 'Del Río Negro al Solimões',
        texto: 'Barcos hotel, expediciones y paseos de varios municipios en un solo mapa, con reservas y vouchers organizados.',
        alt: 'Cubierta de un barco navegando por el río al atardecer' },
      { foto: 'inovacao-territorio.webp', selo: 'Innovación · ODS 9', titulo: 'Tecnología hecha para el interior',
        texto: 'Plataforma ligera, en tres idiomas, que funciona con señal débil: lista para convocatorias de innovación y turismo sostenible.',
        alt: 'Vista aérea de bancos de arena e islas en el Río Negro' },
    ],
  },
};

export default function LetreiroEDA() {
  const { idioma } = useLanguage();
  const c = conteudo[idioma === 'EN' || idioma === 'ES' ? idioma : 'PT'];

  return (
    <section className="eda-letreiro ern-publico-hero" aria-labelledby="titulo-letreiro-eda">
      <div className="eda-letreiro-miolo">
        <p className="eda-letreiro-olho">{c.olho}</p>
        <h2 id="titulo-letreiro-eda" className="eda-letreiro-titulo">{c.titulo}</h2>
        <span className="eda-letreiro-veio" aria-hidden="true" />
        <p className="eda-letreiro-sub">{c.sub}</p>
        <ol className="eda-letreiro-grade" tabIndex={0} aria-label={c.lista}>
          {c.itens.map((item, i) => (
            <li key={item.foto} className={`eda-letreiro-cartao${i === 0 ? ' eda-letreiro-destaque' : ''}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={F + item.foto}
                alt={item.alt}
                loading="lazy"
                decoding="async"
                width={i === 0 ? 1280 : 800}
                height={i === 0 ? 720 : 450}
                className="eda-letreiro-img"
              />
              <span className="eda-letreiro-numero" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <div className="eda-letreiro-corpo">
                <span className="eda-letreiro-selo">{item.selo}</span>
                <h3 className="eda-letreiro-nome">{item.titulo}</h3>
                <p>{item.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

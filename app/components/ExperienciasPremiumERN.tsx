'use client';

import { useState } from 'react';
import Link from 'next/link';
import PublicHeader from '@/app/components/PublicHeader';
import BotaoCopaPescaERN from '@/app/components/BotaoCopaPescaERN';
import ConciergePublicoERN from '@/app/components/ConciergePublicoERN';
import FeedDescubraERN from '@/app/components/FeedDescubraERN';
import RodapePublicoEDA from '@/app/components/RodapePublicoEDA';
import { useLanguage } from '@/app/components/LanguageProvider';
import { HISTORIAS_MUNICIPIOS, type RegiaoHistoria } from '@/lib/historiasMunicipiosERN';

// ERN_EXPERIENCIAS_PREMIUM_V1
// Página Experiências no padrão Encantos da Amazônia: abertura escura,
// interesses em mosaico, como funciona, histórias dos municípios do Rio Negro,
// destaque da pesca esportiva, histórias da Rede, perguntas e chamada final.
// A versão anterior continua em ExperienciasPublicasERN.tsx.

const FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3A144]';

const textos = {
  PT: {
    garantias: ['Do Rio Negro a Parintins', 'Operadores da Rede EDA', 'Atendimento em PT, EN e ES'],
    legendaFoto: 'Casa flutuante · Rio Negro',
    selo: 'Experiências · Amazonas',
    titulo: ['Experiências que só a', 'Amazônia', 'oferece.'],
    intro: 'Pesca esportiva, rios, floresta, festivais e sabores, do Rio Negro a Parintins, com quem conhece o território.',
    encontrar: 'Encontrar minha experiência',
    concierge: 'Conversar com o Concierge',
    interessesEyebrow: 'O que desperta sua curiosidade?',
    interessesTitulo: 'Escolha por onde começar.',
    interessesIntro: 'Cada interesse abre um caminho. Serviços, valores e condições são confirmados com cada prestador da Rede.',
    destaque: 'Destaque',
    experiencia: 'Experiência',
    interesses: [
      { id: 'pesca', nome: 'Pesca esportiva', texto: 'Tucunaré-açu no Rio Negro e afluentes', href: '/pesca-esportiva', imagem: '/images/regiao/mulhertucunare.png.jpeg', alt: 'Pescadora segurando um tucunaré-açu no Rio Negro' },
      { id: 'rios', nome: 'Rios e navegação', texto: 'Barcos-hotel, travessias e pôr do sol', href: '/destinos', imagem: '/images/regiao/viagembarco.png.jpeg', alt: 'Convés de barco no Rio Negro ao pôr do sol' },
      { id: 'natureza', nome: 'Natureza e fauna', texto: 'Araras, botos, igapós e floresta', href: '/destinos?lugar=anavilhanas', imagem: '/images/regiao/arara.jpg.jpeg', alt: 'Arara-canindé comendo um fruto' },
      { id: 'cultura', nome: 'Cultura e festivais', texto: 'De Parintins ao Festival de Barcelos', href: '/rede', imagem: '/images/cultura/festribal.jpg', alt: 'Arena iluminada de festival folclórico' },
      { id: 'praias', nome: 'Praias de rio', texto: 'Areia branca na vazante', href: '/destinos?lugar=praia-grande', imagem: '/images/regiao/barcelospraia.png.jpeg', alt: 'Praia de areia branca no Rio Negro vista de cima' },
      { id: 'sabores', nome: 'Sabores da Amazônia', texto: 'Peixes, frutas e cozinha regional', href: '/rede', imagem: '/images/regiao/cafedaamazonia.png.jpeg', alt: 'Mesa servida no convés de um barco' },
    ],
    passosEyebrow: 'Da inspiração à viagem',
    passosTitulo: 'Planejar fica simples.',
    passos: [
      ['Escolha seu interesse', 'Pesca, natureza, cultura ou um roteiro completo pelo Amazonas.'],
      ['Converse com o Concierge', 'Conte datas, pessoas e estilo de viagem. Ele organiza as possibilidades.'],
      ['Fale com quem opera', 'Guias, operadoras e pousadas da Rede EDA confirmam valores e disponibilidade.'],
    ],
    historiasEyebrow: 'Memória do território',
    historiasTitulo: 'A história de cada município do Rio Negro.',
    historiasIntro: 'Missões, fortes, povos e festas que formaram a região, do Alto ao Baixo Rio Negro.',
    regioes: { todos: 'Todos', alto: 'Alto Rio Negro', medio: 'Médio Rio Negro', baixo: 'Baixo Rio Negro' },
    fonte: 'Fontes: Portal Amazônia, IBGE e legislação municipal. Textos em revisão com pesquisas locais.',
    pescaEyebrow: 'Pesca esportiva',
    pescaTitulo: 'O Rio Negro é um dos grandes destinos do tucunaré-açu.',
    pescaTexto: 'Converse com guias e operadoras sobre temporada, equipamentos, regras e captura e soltura antes de fechar a viagem.',
    pescaBotao: 'Explorar pesca esportiva',
    pescaAlt: 'Pescador segurando um tucunaré no rio',
    faqEyebrow: 'Antes de viajar',
    faqTitulo: 'Perguntas que ajudam a planejar.',
    faqIntro: 'Respostas curtas, sem promessa de preço ou disponibilidade.',
    faq: [
      ['Qual a melhor época para visitar?', 'Depende do que você procura. Na vazante, aproximadamente de setembro a fevereiro, surgem as praias de areia branca e é a temporada mais procurada para a pesca esportiva. Na cheia, os igapós ficam navegáveis. Confirme com o operador as condições do ano.'],
      ['Como chego a Barcelos, Novo Airão ou Parintins?', 'Manaus é a porta de entrada, com aeroporto internacional. Novo Airão fica a cerca de 190 km por estrada. Barcelos, Santa Isabel, São Gabriel e Parintins são acessados por voos regionais ou por barco a partir de Manaus.'],
      ['Preciso de autorização para pescar?', 'Sim. A pesca amadora exige licença, emitida online pelo governo federal, e há regras próprias em terras indígenas e unidades de conservação. O operador deve orientar sobre a captura e soltura e as normas locais.'],
      ['Como sei se um operador é confiável?', 'Na Rede EDA, perfis verificados exibem o selo ✓. Peça o cadastro no Cadastur ou o CNPJ, confirme valores por escrito e prefira pagamentos rastreáveis.'],
    ],
    finalTitulo: ['Pronto para viver a', 'Amazônia', '?'],
    finalTexto: 'O Concierge ajuda a montar sua viagem em poucos minutos.',
    verDestinos: 'Ver destinos',
    rodape: 'Nascida em Barcelos, no Rio Negro.',
    links: [['Atendimento', '/contato'], ['Privacidade', '/privacidade'], ['Termos', '/termos']],
  },
  EN: {
    garantias: ['From the Rio Negro to Parintins', 'EDA Network operators', 'Support in PT, EN and ES'],
    legendaFoto: 'Floating house · Rio Negro',
    selo: 'Experiences · Amazonas',
    titulo: ['Experiences only the', 'Amazon', 'can offer.'],
    intro: 'Sport fishing, rivers, forest, festivals and flavors, from the Rio Negro to Parintins, with people who know the region.',
    encontrar: 'Find my experience',
    concierge: 'Talk to the Concierge',
    interessesEyebrow: 'What sparks your curiosity?',
    interessesTitulo: 'Choose where to begin.',
    interessesIntro: 'Each interest opens a path. Services, prices and conditions are confirmed with each provider on the Network.',
    destaque: 'Featured',
    experiencia: 'Experience',
    interesses: [
      { id: 'pesca', nome: 'Sport fishing', texto: 'Peacock bass on the Rio Negro and tributaries', href: '/pesca-esportiva', imagem: '/images/regiao/mulhertucunare.png.jpeg', alt: 'Angler holding a peacock bass on the Rio Negro' },
      { id: 'rios', nome: 'Rivers and boating', texto: 'Riverboats, crossings and sunsets', href: '/destinos', imagem: '/images/regiao/viagembarco.png.jpeg', alt: 'Boat deck on the Rio Negro at sunset' },
      { id: 'natureza', nome: 'Nature and wildlife', texto: 'Macaws, river dolphins, flooded forest', href: '/destinos?lugar=anavilhanas', imagem: '/images/regiao/arara.jpg.jpeg', alt: 'Blue-and-yellow macaw eating a fruit' },
      { id: 'cultura', nome: 'Culture and festivals', texto: 'From Parintins to the Barcelos Festival', href: '/rede', imagem: '/images/cultura/festribal.jpg', alt: 'Lit arena of a folk festival' },
      { id: 'praias', nome: 'River beaches', texto: 'White sand in the dry season', href: '/destinos?lugar=praia-grande', imagem: '/images/regiao/barcelospraia.png.jpeg', alt: 'White sand beach on the Rio Negro from above' },
      { id: 'sabores', nome: 'Amazon flavors', texto: 'Fish, fruit and regional cooking', href: '/rede', imagem: '/images/regiao/cafedaamazonia.png.jpeg', alt: 'Table set on a boat deck' },
    ],
    passosEyebrow: 'From inspiration to travel',
    passosTitulo: 'Planning made simple.',
    passos: [
      ['Choose your interest', 'Fishing, nature, culture or a full itinerary across Amazonas.'],
      ['Talk to the Concierge', 'Share dates, group size and travel style. It organizes the options.'],
      ['Talk to the operators', 'Guides, operators and lodges on the EDA Network confirm prices and availability.'],
    ],
    historiasEyebrow: 'Memory of the region',
    historiasTitulo: 'The story of each Rio Negro town.',
    historiasIntro: 'Missions, forts, peoples and festivals that shaped the region, from the Upper to the Lower Rio Negro.',
    regioes: { todos: 'All', alto: 'Upper Rio Negro', medio: 'Middle Rio Negro', baixo: 'Lower Rio Negro' },
    fonte: 'Sources: Portal Amazônia, IBGE and municipal law. Texts under review with local research.',
    pescaEyebrow: 'Sport fishing',
    pescaTitulo: 'The Rio Negro is one of the great peacock bass destinations.',
    pescaTexto: 'Talk to guides and operators about the season, gear, rules and catch-and-release before booking.',
    pescaBotao: 'Explore sport fishing',
    pescaAlt: 'Angler holding a peacock bass on the river',
    faqEyebrow: 'Before you travel',
    faqTitulo: 'Questions that help you plan.',
    faqIntro: 'Short answers, with no promises on price or availability.',
    faq: [
      ['When is the best time to visit?', 'It depends on what you want. In the dry season, roughly September to February, white sand beaches appear and it is the most sought-after sport fishing season. In the high-water season the flooded forest becomes navigable. Confirm the year’s conditions with the operator.'],
      ['How do I get to Barcelos, Novo Airão or Parintins?', 'Manaus is the gateway, with an international airport. Novo Airão is about 190 km by road. Barcelos, Santa Isabel, São Gabriel and Parintins are reached by regional flights or by boat from Manaus.'],
      ['Do I need a fishing license?', 'Yes. Recreational fishing requires a license issued online by the Brazilian federal government, and Indigenous lands and protected areas have their own rules. Your operator should explain catch-and-release and local regulations.'],
      ['How do I know an operator is reliable?', 'On the EDA Network, verified profiles show a ✓ badge. Ask for their Cadastur registration or company number, confirm prices in writing and prefer traceable payments.'],
    ],
    finalTitulo: ['Ready to experience the', 'Amazon', '?'],
    finalTexto: 'The Concierge helps you plan your trip in minutes.',
    verDestinos: 'See destinations',
    rodape: 'Born in Barcelos, on the Rio Negro.',
    links: [['Support', '/contato'], ['Privacy', '/privacidade'], ['Terms', '/termos']],
  },
  ES: {
    garantias: ['Del Río Negro a Parintins', 'Operadores de la Red EDA', 'Atención en PT, EN y ES'],
    legendaFoto: 'Casa flotante · Río Negro',
    selo: 'Experiencias · Amazonas',
    titulo: ['Experiencias que solo la', 'Amazonía', 'ofrece.'],
    intro: 'Pesca deportiva, ríos, selva, festivales y sabores, del Río Negro a Parintins, con quienes conocen el territorio.',
    encontrar: 'Encontrar mi experiencia',
    concierge: 'Hablar con el Concierge',
    interessesEyebrow: '¿Qué despierta tu curiosidad?',
    interessesTitulo: 'Elige por dónde empezar.',
    interessesIntro: 'Cada interés abre un camino. Servicios, precios y condiciones se confirman con cada proveedor de la Red.',
    destaque: 'Destacado',
    experiencia: 'Experiencia',
    interesses: [
      { id: 'pesca', nome: 'Pesca deportiva', texto: 'Tucunaré en el Río Negro y afluentes', href: '/pesca-esportiva', imagem: '/images/regiao/mulhertucunare.png.jpeg', alt: 'Pescadora sosteniendo un tucunaré en el Río Negro' },
      { id: 'rios', nome: 'Ríos y navegación', texto: 'Barcos-hotel, travesías y atardeceres', href: '/destinos', imagem: '/images/regiao/viagembarco.png.jpeg', alt: 'Cubierta de barco en el Río Negro al atardecer' },
      { id: 'natureza', nome: 'Naturaleza y fauna', texto: 'Guacamayos, botos, igapós y selva', href: '/destinos?lugar=anavilhanas', imagem: '/images/regiao/arara.jpg.jpeg', alt: 'Guacamayo azul y amarillo comiendo un fruto' },
      { id: 'cultura', nome: 'Cultura y festivales', texto: 'De Parintins al Festival de Barcelos', href: '/rede', imagem: '/images/cultura/festribal.jpg', alt: 'Arena iluminada de un festival folclórico' },
      { id: 'praias', nome: 'Playas de río', texto: 'Arena blanca en la época seca', href: '/destinos?lugar=praia-grande', imagem: '/images/regiao/barcelospraia.png.jpeg', alt: 'Playa de arena blanca en el Río Negro vista desde arriba' },
      { id: 'sabores', nome: 'Sabores de la Amazonía', texto: 'Pescados, frutas y cocina regional', href: '/rede', imagem: '/images/regiao/cafedaamazonia.png.jpeg', alt: 'Mesa servida en la cubierta de un barco' },
    ],
    passosEyebrow: 'De la inspiración al viaje',
    passosTitulo: 'Planificar es simple.',
    passos: [
      ['Elige tu interés', 'Pesca, naturaleza, cultura o un recorrido completo por Amazonas.'],
      ['Habla con el Concierge', 'Cuenta fechas, personas y estilo de viaje. Él organiza las posibilidades.'],
      ['Habla con quien opera', 'Guías, operadores y posadas de la Red EDA confirman precios y disponibilidad.'],
    ],
    historiasEyebrow: 'Memoria del territorio',
    historiasTitulo: 'La historia de cada municipio del Río Negro.',
    historiasIntro: 'Misiones, fuertes, pueblos y fiestas que formaron la región, del Alto al Bajo Río Negro.',
    regioes: { todos: 'Todos', alto: 'Alto Río Negro', medio: 'Medio Río Negro', baixo: 'Bajo Río Negro' },
    fonte: 'Fuentes: Portal Amazônia, IBGE y legislación municipal. Textos en revisión con investigaciones locales.',
    pescaEyebrow: 'Pesca deportiva',
    pescaTitulo: 'El Río Negro es uno de los grandes destinos del tucunaré.',
    pescaTexto: 'Habla con guías y operadores sobre temporada, equipos, reglas y captura y suelta antes de cerrar el viaje.',
    pescaBotao: 'Explorar pesca deportiva',
    pescaAlt: 'Pescador sosteniendo un tucunaré en el río',
    faqEyebrow: 'Antes de viajar',
    faqTitulo: 'Preguntas que ayudan a planificar.',
    faqIntro: 'Respuestas cortas, sin promesas de precio o disponibilidad.',
    faq: [
      ['¿Cuál es la mejor época para visitar?', 'Depende de lo que busques. En la época seca, aproximadamente de septiembre a febrero, aparecen las playas de arena blanca y es la temporada más buscada para la pesca deportiva. En la crecida, los igapós se vuelven navegables. Confirma con el operador las condiciones del año.'],
      ['¿Cómo llego a Barcelos, Novo Airão o Parintins?', 'Manaos es la puerta de entrada, con aeropuerto internacional. Novo Airão está a unos 190 km por carretera. Barcelos, Santa Isabel, São Gabriel y Parintins se alcanzan en vuelos regionales o en barco desde Manaos.'],
      ['¿Necesito licencia para pescar?', 'Sí. La pesca recreativa exige licencia, emitida en línea por el gobierno federal de Brasil, y las tierras indígenas y áreas protegidas tienen reglas propias. El operador debe orientar sobre captura y suelta y normas locales.'],
      ['¿Cómo sé si un operador es confiable?', 'En la Red EDA, los perfiles verificados muestran el sello ✓. Pide el registro en Cadastur o el CNPJ, confirma precios por escrito y prefiere pagos rastreables.'],
    ],
    finalTitulo: ['¿Listo para vivir la', 'Amazonía', '?'],
    finalTexto: 'El Concierge te ayuda a organizar tu viaje en pocos minutos.',
    verDestinos: 'Ver destinos',
    rodape: 'Nacida en Barcelos, en el Río Negro.',
    links: [['Atención', '/contato'], ['Privacidad', '/privacidade'], ['Términos', '/termos']],
  },
};

const BOTAO_OURO = `inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#F7D595] to-[#E3A144] px-6 text-sm font-bold text-[#07110E] shadow-[0_12px_28px_rgb(227_161_68/32%),inset_0_1px_0_rgb(255_255_255/55%)] transition hover:brightness-105 ${FOCO}`;
const BOTAO_VIDRO = `inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-6 text-sm font-semibold text-[#F0F0E8] backdrop-blur-md transition hover:border-[#F4C77E]/60 ${FOCO}`;

// Letreiro com entrada palavra por palavra; a palavra central fica dourada
// com brilho lento (classes .ern-palavra e .ern-dourado em globals.css).
function LetreiroAnimado({ partes }: { partes: string[] }) {
  const pecas: { texto: string; dourado: boolean }[] = [];
  partes.forEach((parte, indice) => {
    if (indice === 1) {
      pecas.push({ texto: parte, dourado: true });
    } else {
      parte.split(' ').filter(Boolean).forEach((palavra) => pecas.push({ texto: palavra, dourado: false }));
    }
  });
  return (
    <span aria-hidden="true">
      {pecas.map((peca, indice) => {
        const colado = /^[?!.,]/.test(peca.texto);
        return (
          <span key={`${peca.texto}-${indice}`}>
            {indice > 0 && !colado ? ' ' : ''}
            <span className={`ern-palavra ${peca.dourado ? 'ern-dourado' : ''}`} style={{ animationDelay: `${200 + indice * 90}ms` }}>
              {peca.texto}
            </span>
          </span>
        );
      })}
    </span>
  );
}

function Dourado({ children }: { children: string }) {
  return (
    <span className="bg-gradient-to-r from-[#E3A144] via-[#FBE3AE] to-[#E3A144] bg-clip-text text-transparent">
      {children}
    </span>
  );
}

export default function ExperienciasPremiumERN() {
  const { idioma } = useLanguage();
  const t = textos[idioma];
  const [regiao, setRegiao] = useState<'todos' | RegiaoHistoria>('todos');
  const historias = HISTORIAS_MUNICIPIOS.filter((h) => regiao === 'todos' || h.regiao === regiao);

  return (
    <div className="min-h-screen bg-[#f3f1ec] text-[#0f1c17]">
      <PublicHeader />
      <ConciergePublicoERN />

      <main id="conteudo-experiencias">
        {/* 1. Abertura — ERN_EXPERIENCIAS_ABERTURA_EDITORIAL_V1
            Letreiro alinhado à esquerda (diferente da Descubra, que é
            centralizada), sobre a água; a casa flutuante fica visível à direita.
            Mesma animação palavra por palavra do padrão do portal. */}
        <section className="ern-publico-hero relative flex min-h-[640px] items-end overflow-hidden bg-[#07110E] md:min-h-[86vh] md:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/experiencias/experiencias-hero.jpg"
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            decoding="async"
            className="ern-fundo-respira absolute inset-0 h-full w-full object-cover object-[78%_18%] md:object-[62%_50%]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: 'linear-gradient(90deg, rgb(3 16 11 / 88%) 0%, rgb(3 16 11 / 66%) 34%, rgb(3 16 11 / 18%) 62%, rgb(3 16 11 / 0%) 78%), linear-gradient(180deg, rgb(3 16 11 / 45%) 0%, rgb(3 16 11 / 0%) 26%, rgb(3 16 11 / 0%) 70%, #07110E 100%)' }}
          />

          {/* No celular: casa flutuante em cima, letreiro embaixo sobre degradê escuro. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 md:hidden"
            style={{ background: 'linear-gradient(180deg, rgb(3 16 11 / 0%) 0%, rgb(3 16 11 / 0%) 26%, rgb(3 16 11 / 78%) 46%, #07110E 72%)' }}
          />
          <div className="relative z-10 mx-auto w-full max-w-[1180px] px-5 pb-14 pt-[44svh] md:px-8 md:pb-24 md:pt-36">
            <div className="max-w-[640px] text-left">
              <p className="ern-revela inline-flex items-center gap-2.5 rounded-full border border-[#F4C77E]/25 bg-[#07110E]/55 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#F4C77E] backdrop-blur-md sm:text-xs">
                <span aria-hidden="true" className="h-1.5 w-1.5 rotate-45 bg-gradient-to-b from-[#F7D595] to-[#E3A144]" />
                {t.selo}
              </p>

              <h1
                aria-label={t.titulo.join(' ').replace(' ?', '?')}
                className="ern-titulo-animado mt-7 border-l-2 border-[#E3A144]/70 pl-5 text-[clamp(2.4rem,5.6vw,4.5rem)] leading-[1.03] tracking-[-0.045em] text-[#F5F3EA] md:pl-7"
              >
                <LetreiroAnimado partes={t.titulo} />
              </h1>

              <p className="ern-revela mt-6 max-w-[560px] text-base leading-7 text-[#DBE3DE] [animation-delay:900ms] md:text-lg md:leading-8">
                {t.intro}
              </p>

              <div className="ern-revela mt-9 flex flex-wrap gap-3 [animation-delay:1100ms]">
                <a href="#interesses" className={BOTAO_OURO}>{t.encontrar} <span aria-hidden="true">↓</span></a>
                <a href="#concierge" className={BOTAO_VIDRO}><span aria-hidden="true" className="text-[#F4C77E]">✦</span> {t.concierge}</a>
              </div>

              <ul className="ern-revela mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#C9D4CD] [animation-delay:1300ms]">
                {t.garantias.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rotate-45 bg-[#E3A144]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="ern-revela absolute bottom-6 right-6 z-10 hidden items-center gap-2 rounded-full border border-white/15 bg-[#07110E]/55 px-4 py-2 text-xs font-medium text-[#EDEDE3] backdrop-blur-md [animation-delay:1500ms] md:inline-flex">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F4C77E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
            {t.legendaFoto}
          </p>
        </section>

        {/* 2. Interesses em mosaico */}
        <section id="interesses" className="mx-auto max-w-[1180px] scroll-mt-24 px-5 py-20 md:px-8 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a4b12]">{t.interessesEyebrow}</p>
          <h2 className="mt-3 text-[clamp(2rem,4vw,3rem)] leading-[1.08] tracking-[-0.035em]">{t.interessesTitulo}</h2>
          <p className="mt-4 max-w-[640px] text-base leading-7 text-[#4b5a53] md:text-lg">{t.interessesIntro}</p>
          <ul className="mt-10 grid auto-rows-[220px] grid-flow-dense gap-4 sm:grid-cols-2 md:auto-rows-[250px] lg:grid-cols-4">
            {t.interesses.map((item, indice) => {
              const grande = indice === 0;
              return (
                <li key={item.id} className={`ern-revela-rolagem ${grande ? 'sm:col-span-2 sm:row-span-2' : ''}`}>
                  <Link href={item.href} className={`group relative block h-full overflow-hidden rounded-[24px] ${FOCO}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.imagem} alt={item.alt} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.05] motion-reduce:transition-none" />
                    <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#05100C]/90 via-[#05100C]/30 to-transparent" />
                    <span className="ern-publico-hero absolute inset-x-3.5 top-3.5 flex items-start justify-between">
                      <span className="rounded-full bg-[#07110E]/70 px-3 py-1 text-xs font-semibold text-[#F4C77E] backdrop-blur-md">{grande ? t.destaque : t.experiencia}</span>
                      <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-[#F0F0E8] backdrop-blur-md transition group-hover:bg-[#E3A144] group-hover:text-[#07110E]">↗</span>
                    </span>
                    <span className="ern-publico-hero absolute inset-x-5 bottom-5">
                      <span className={`block font-semibold tracking-[-0.02em] text-[#F5F3EA] ${grande ? 'text-3xl md:text-4xl' : 'text-xl'}`}>{item.nome}</span>
                      <span className="mt-1.5 block text-sm text-[#D6DFD9]">{item.texto}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 3. Como funciona */}
        <section className="mx-auto max-w-[1180px] px-5 pb-20 md:px-8 md:pb-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a4b12]">{t.passosEyebrow}</p>
          <h2 className="mt-3 text-[clamp(2rem,4vw,3rem)] leading-[1.08] tracking-[-0.035em]">{t.passosTitulo}</h2>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {t.passos.map(([titulo, texto], indice) => (
              <li key={titulo} className="ern-revela-rolagem rounded-[22px] border border-[#e3dfd6] bg-white p-7 shadow-[0_12px_32px_rgb(15_28_23/5%)]">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-b from-[#F7D595] to-[#E3A144] text-lg font-bold text-[#07110E]">{indice + 1}</span>
                <h3 className="mt-5 text-xl font-semibold tracking-[-0.02em]">{titulo}</h3>
                <p className="mt-2 text-[15px] leading-6 text-[#4b5a53]">{texto}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 4. Histórias dos municípios */}
        <section className="ern-publico-hero bg-[#07110E] py-20 text-[#EDEDE3] md:py-24">
          <div className="mx-auto max-w-[1180px] px-5 md:px-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="max-w-[680px]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F4C77E]">{t.historiasEyebrow}</p>
                <h2 className="mt-3 text-[clamp(2rem,4vw,3rem)] leading-[1.08] tracking-[-0.035em] text-[#F5F3EA]">{t.historiasTitulo}</h2>
                <p className="mt-4 text-base leading-7 text-[#B8C9BF] md:text-lg">{t.historiasIntro}</p>
              </div>
              <div role="group" aria-label={t.historiasEyebrow} className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {(['todos', 'alto', 'medio', 'baixo'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={regiao === item}
                    onClick={() => setRegiao(item)}
                    className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition ${FOCO} ${
                      regiao === item ? 'border-transparent bg-gradient-to-b from-[#F7D595] to-[#E3A144] text-[#07110E]' : 'border-white/15 text-[#EDEDE3] hover:border-[#F4C77E]/60'
                    }`}
                  >
                    {t.regioes[item]}
                  </button>
                ))}
              </div>
            </div>

            <ul className="mt-10 grid gap-5 md:grid-cols-2">
              {historias.map((historia) => {
                const h = historia.textos[idioma];
                return (
                  <li key={historia.id} className="ern-revela-rolagem flex flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[#0A1713] sm:flex-row">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={historia.imagem} alt={historia.nome} loading="lazy" decoding="async" className="h-48 w-full object-cover sm:h-auto sm:w-[42%]" />
                    <div className="flex flex-1 flex-col p-6">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#F4C77E]">{historia.nome} · {t.regioes[historia.regiao]}</p>
                      <h3 className="mt-2 text-xl font-semibold leading-snug tracking-[-0.02em] text-[#F5F3EA]">{h.titulo}</h3>
                      <p className="mt-3 text-sm leading-6 text-[#B8C9BF]">{h.texto}</p>
                      <ul className="mt-4 flex flex-wrap gap-2">
                        {h.fatos.map((fato) => (
                          <li key={fato} className="rounded-full border border-[#F4C77E]/25 px-3 py-1 text-xs text-[#EDEDE3]">{fato}</li>
                        ))}
                      </ul>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-6 text-xs text-[#8FA39A]">{t.fonte}</p>
          </div>
        </section>

        {/* 5. Destaque da pesca esportiva */}
        <section className="mx-auto max-w-[1180px] px-5 py-20 md:px-8 md:py-24">
          <div className="ern-publico-hero grid overflow-hidden rounded-[28px] bg-[#07110E] lg:grid-cols-[1.1fr_1fr]">
            <div className="p-8 md:p-14">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F4C77E]">{t.pescaEyebrow}</p>
              <h2 className="mt-3 text-[clamp(1.8rem,3.4vw,2.6rem)] leading-[1.1] tracking-[-0.035em] text-[#F5F3EA]">{t.pescaTitulo}</h2>
              <p className="mt-4 text-base leading-7 text-[#B8C9BF]">{t.pescaTexto}</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/pesca-esportiva" className={BOTAO_OURO}>{t.pescaBotao} <span aria-hidden="true">→</span></Link>
                <BotaoCopaPescaERN idioma={idioma} />
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/regiao/guias.png.jpeg" alt={t.pescaAlt} loading="lazy" decoding="async" className="h-72 w-full object-cover lg:h-full" />
          </div>
        </section>

        {/* 6. Histórias da Rede */}
        <FeedDescubraERN />

        {/* 7. Perguntas frequentes */}
        <section className="mx-auto grid max-w-[1180px] gap-10 px-5 py-20 md:px-8 md:py-24 lg:grid-cols-[400px_1fr] lg:gap-14">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a4b12]">{t.faqEyebrow}</p>
            <h2 className="mt-3 text-[clamp(2rem,4vw,3rem)] leading-[1.08] tracking-[-0.035em]">{t.faqTitulo}</h2>
            <p className="mt-4 text-base leading-7 text-[#4b5a53]">{t.faqIntro}</p>
          </div>
          <div className="grid content-start gap-3">
            {t.faq.map(([pergunta, resposta]) => (
              <details key={pergunta} className="group rounded-[18px] border border-[#e3dfd6] bg-white px-6 py-1 shadow-[0_6px_18px_rgb(15_28_23/4%)] open:border-[#E3A144]/60">
                <summary className={`flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold [&::-webkit-details-marker]:hidden ${FOCO}`}>
                  {pergunta}
                  <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#E3A144] text-[#8a4b12] transition group-open:rotate-45">+</span>
                </summary>
                <p className="pb-5 text-base leading-7 text-[#4b5a53]">{resposta}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 8. Chamada final */}
        <section className="ern-publico-hero bg-[#07110E]">
          <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-5 py-16 md:flex-row md:items-center md:justify-between md:px-8">
            <div>
              <h2 className="text-[clamp(1.8rem,3.4vw,2.5rem)] leading-tight tracking-[-0.035em] text-[#F5F3EA]">
                {t.finalTitulo[0]} <Dourado>{t.finalTitulo[1]}</Dourado>{t.finalTitulo[2]}
              </h2>
              <p className="mt-2 text-base text-[#B8C9BF]">{t.finalTexto}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="#concierge" className={BOTAO_OURO}><span aria-hidden="true">✦</span> {t.concierge}</a>
              <Link href="/destinos" className={BOTAO_VIDRO}>{t.verDestinos}</Link>
            </div>
          </div>
        </section>
      </main>

      <RodapePublicoEDA />
    </div>
  );
}

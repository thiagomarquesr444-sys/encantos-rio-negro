'use client';

// DESCUBRA_FAM_V1: os pilares da Encantos da Amazônia AI na Descubra
// (operadoras, artesãos, localidade, fauna e flora, comida e Iara) em mosaico
// de fotos, e o "Verão barcelense" com o vídeo do tracajá voltando para a água.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import IconeIara from '@/app/components/IconeIara';
import RevelarTextoEDA from '@/app/components/RevelarTextoEDA';
import { useLanguage } from '@/app/components/LanguageProvider';

type Pilar = { id: string; titulo: string; texto: string; img: string; alt: string; href?: string; pedido?: string; acao: string };

const TEXTOS = {
  PT: {
    rotulo: 'Encantos da Amazônia AI',
    titulo: 'O que move o turismo no Rio Negro',
    intro: 'Quem opera o rio, quem faz com as mãos, quem vive no lugar e tudo o que a floresta guarda. Passe por cada foto para conhecer.',
    pilares: [
      { id: 'operadoras', titulo: 'Operadoras', texto: 'Passeios e pesca esportiva publicados por quem opera o rio.', img: 'pilar-operadoras', alt: 'Pescador segurando um tucunaré no barco', href: '/experiencias', acao: 'Ver passeios' },
      { id: 'artesaos', titulo: 'Artesãos', texto: 'Cestaria, sementes e madeira, direto com quem faz.', img: 'pilar-artesaos', alt: 'Mãos tecendo um cesto de fibra', href: '/artesanato', acao: 'Ver artesanato' },
      { id: 'localidade', titulo: 'Localidade', texto: 'Comunidades, cidades e o jeito de viver do interior.', img: 'pilar-localidade', alt: 'Casas de palafita na beira do rio', href: '#destinos', acao: 'Ver destinos' },
      { id: 'fauna', titulo: 'Fauna e flora', texto: 'Onças, botos, tracajás e a mata alagada do Rio Negro.', img: 'pilar-fauna', alt: 'Onça-pintada deitada na mata', href: '#verao-barcelense', acao: 'Conhecer' },
      { id: 'comida', titulo: 'Comida', texto: 'Farinha, beiju, peixe e os frutos da floresta.', img: 'pilar-comida', alt: 'Farinha de mandioca torrando no forno', pedido: 'Quero conhecer a culinária amazonense', acao: 'Perguntar à Iara' },
      { id: 'iara', titulo: 'Iara', texto: 'A mãe das águas conhece os 62 municípios e monta sua viagem.', img: 'pilar-iara', alt: 'Cachoeira no meio da floresta', pedido: '', acao: 'Falar com a Iara' },
    ] as Pilar[],
    verao: {
      rotulo: 'Verão barcelense',
      titulo: 'Quando o rio baixa, a praia vira berçário',
      texto: 'Na vazante do Rio Negro, surgem praias de areia branca em Barcelos. É nelas que os tracajás desovam, e é para a água que eles voltam, como neste registro feito na região.',
      video: 'Vídeo: tracajá voltando para a água numa praia de Barcelos',
      tocar: 'Ver o vídeo',
      fotos: ['Tracajás tomando sol no tronco', 'Tucano no açaizeiro', 'Açaizeiro carregado', 'Jabuti na mata'],
      acao: 'Planejar o verão com a Iara',
      pedido: 'Quero conhecer o verão de Barcelos e as praias do Rio Negro',
    },
  },
  EN: {
    rotulo: 'Encantos da Amazônia AI',
    titulo: 'What moves tourism on the Rio Negro',
    intro: 'Those who run the river, those who make things by hand, those who live here and everything the forest holds. Hover over each photo.',
    pilares: [
      { id: 'operadoras', titulo: 'Operators', texto: 'Tours and sport fishing published by those who run the river.', img: 'pilar-operadoras', alt: 'Angler holding a peacock bass on a boat', href: '/experiencias', acao: 'See tours' },
      { id: 'artesaos', titulo: 'Artisans', texto: 'Basketry, seeds and wood, straight from the maker.', img: 'pilar-artesaos', alt: 'Hands weaving a fiber basket', href: '/artesanato', acao: 'See crafts' },
      { id: 'localidade', titulo: 'Places', texto: 'Communities, towns and the riverside way of life.', img: 'pilar-localidade', alt: 'Stilt houses on the riverbank', href: '#destinos', acao: 'See destinations' },
      { id: 'fauna', titulo: 'Wildlife', texto: 'Jaguars, river dolphins, turtles and the flooded forest.', img: 'pilar-fauna', alt: 'Jaguar resting in the forest', href: '#verao-barcelense', acao: 'Discover' },
      { id: 'comida', titulo: 'Food', texto: 'Cassava flour, beiju, fish and forest fruits.', img: 'pilar-comida', alt: 'Cassava flour toasting in the oven', pedido: 'I want to learn about Amazonian food', acao: 'Ask Iara' },
      { id: 'iara', titulo: 'Iara', texto: 'The mother of the waters knows all 62 towns and plans your trip.', img: 'pilar-iara', alt: 'Waterfall in the forest', pedido: '', acao: 'Talk to Iara' },
    ] as Pilar[],
    verao: {
      rotulo: 'Barcelos summer',
      titulo: 'When the river drops, the beach becomes a nursery',
      texto: 'As the Rio Negro recedes, white sand beaches appear in Barcelos. Turtles lay their eggs there and then head back to the water, as in this local recording.',
      video: 'Video: a river turtle returning to the water on a Barcelos beach',
      tocar: 'Play video',
      fotos: ['River turtles sunbathing', 'Toucan on an açaí palm', 'Açaí palm with fruit', 'Tortoise in the forest'],
      acao: 'Plan the summer with Iara',
      pedido: 'I want to visit Barcelos in the dry season and the Rio Negro beaches',
    },
  },
  ES: {
    rotulo: 'Encantos da Amazônia AI',
    titulo: 'Lo que mueve el turismo en el Río Negro',
    intro: 'Quien opera el río, quien hace con las manos, quien vive en el lugar y todo lo que guarda la selva. Pasa por cada foto.',
    pilares: [
      { id: 'operadoras', titulo: 'Operadoras', texto: 'Paseos y pesca deportiva publicados por quien opera el río.', img: 'pilar-operadoras', alt: 'Pescador con un tucunaré en el barco', href: '/experiencias', acao: 'Ver paseos' },
      { id: 'artesaos', titulo: 'Artesanos', texto: 'Cestería, semillas y madera, directo con quien hace.', img: 'pilar-artesaos', alt: 'Manos tejiendo una cesta de fibra', href: '/artesanato', acao: 'Ver artesanía' },
      { id: 'localidade', titulo: 'Lugares', texto: 'Comunidades, ciudades y la vida ribereña.', img: 'pilar-localidade', alt: 'Casas sobre pilotes a orillas del río', href: '#destinos', acao: 'Ver destinos' },
      { id: 'fauna', titulo: 'Fauna y flora', texto: 'Jaguares, botos, tortugas y el bosque inundado.', img: 'pilar-fauna', alt: 'Jaguar descansando en la selva', href: '#verao-barcelense', acao: 'Conocer' },
      { id: 'comida', titulo: 'Comida', texto: 'Fariña, beiju, pescado y frutos de la selva.', img: 'pilar-comida', alt: 'Fariña de yuca tostándose en el horno', pedido: 'Quiero conocer la cocina amazónica', acao: 'Preguntar a Iara' },
      { id: 'iara', titulo: 'Iara', texto: 'La madre de las aguas conoce los 62 municipios y arma tu viaje.', img: 'pilar-iara', alt: 'Cascada en la selva', pedido: '', acao: 'Hablar con Iara' },
    ] as Pilar[],
    verao: {
      rotulo: 'Verano de Barcelos',
      titulo: 'Cuando el río baja, la playa se vuelve cuna',
      texto: 'Con la bajante del Río Negro aparecen playas de arena blanca en Barcelos. Allí desovan las tortugas tracajá, que luego vuelven al agua, como en este registro de la región.',
      video: 'Video: tortuga volviendo al agua en una playa de Barcelos',
      tocar: 'Ver el video',
      fotos: ['Tortugas tomando sol', 'Tucán en una palmera de açaí', 'Palmera de açaí con frutos', 'Tortuga terrestre en la selva'],
      acao: 'Planear el verano con Iara',
      pedido: 'Quiero conocer el verano de Barcelos y las playas del Río Negro',
    },
  },
};

const FOTOS_VERAO = ['verao-tracajas', 'verao-tucano', 'verao-acai', 'verao-jabuti'];

function abrirIara(pedido?: string) {
  window.dispatchEvent(new CustomEvent('iara:abrir', { detail: pedido ? { texto: pedido, origem: 'busca' } : {} }));
}

function sinalFraco() {
  return document.documentElement.dataset.edaSinal === 'fraco'
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function VideoVerao({ rotulo, tocar }: { rotulo: string; tocar: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [parado, setParado] = useState(true);

  useEffect(() => {
    const v = ref.current;
    if (!v || typeof IntersectionObserver === 'undefined') return;
    // Toca sozinho (sem som) só com sinal bom; com sinal fraco espera o toque.
    const obs = new IntersectionObserver(([e]) => {
      if (sinalFraco()) return;
      if (e.isIntersecting) { v.play().then(() => setParado(false)).catch(() => setParado(true)); }
      else { v.pause(); }
    }, { threshold: 0.35 });
    obs.observe(v);
    return () => obs.disconnect();
  }, []);

  return (
    <figure className="eda-verao-video">
      <video
        ref={ref}
        src="/videos/verao-barcelense.mp4"
        poster="/images/descubra/verao-barcelense-capa.webp"
        muted
        loop
        playsInline
        preload="none"
        aria-label={rotulo}
        onPlay={() => setParado(false)}
        onPause={() => setParado(true)}
      />
      {parado && (
        <button type="button" className="eda-botao eda-verao-play" onClick={() => ref.current?.play()}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" /></svg>
          {tocar}
        </button>
      )}
    </figure>
  );
}

export default function PilaresDescubraEDA() {
  const { idioma } = useLanguage();
  const t = TEXTOS[idioma === 'EN' || idioma === 'ES' ? idioma : 'PT'];

  return (
    <>
      <section className="eda-pilares" aria-label={t.titulo}>
        <div className="eda-pilares-cab">
          <p className="eda-pilares-rotulo">{t.rotulo}</p>
          <RevelarTextoEDA como="h2" texto={t.titulo} className="eda-pilares-h2" />
          <p className="eda-pilares-intro">{t.intro}</p>
        </div>

        <div className="eda-mosaico">
          {t.pilares.map((p) => {
            const conteudo = (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/images/descubra/${p.img}.webp`} alt={p.alt} loading="lazy" decoding="async" />
                <span className="eda-mosaico-leg">
                  {p.id === 'iara' && <span className="eda-mosaico-selo" aria-hidden="true"><IconeIara /></span>}
                  <span className="eda-mosaico-titulo">{p.titulo}</span>
                  <span className="eda-mosaico-mais">
                    <span className="eda-mosaico-texto">{p.texto}</span>
                    <span className="eda-botao eda-mosaico-bt">{p.acao}</span>
                  </span>
                </span>
              </>
            );
            return p.href ? (
              p.href.startsWith('#')
                ? <a key={p.id} href={p.href} className="eda-mosaico-item">{conteudo}</a>
                : <Link key={p.id} href={p.href} className="eda-mosaico-item">{conteudo}</Link>
            ) : (
              <button key={p.id} type="button" className="eda-mosaico-item" onClick={() => abrirIara(p.pedido)}>{conteudo}</button>
            );
          })}
        </div>
      </section>

      <section id="verao-barcelense" className="eda-verao" aria-label={t.verao.rotulo}>
        <VideoVerao rotulo={t.verao.video} tocar={t.verao.tocar} />
        <div className="eda-verao-txt">
          <p className="eda-pilares-rotulo">{t.verao.rotulo}</p>
          <RevelarTextoEDA como="h2" texto={t.verao.titulo} className="eda-pilares-h2" />
          <p className="eda-verao-p">{t.verao.texto}</p>
          <ul className="eda-verao-fotos">
            {FOTOS_VERAO.map((f, i) => (
              <li key={f}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/images/descubra/${f}.webp`} alt={t.verao.fotos[i]} loading="lazy" decoding="async" />
                <span>{t.verao.fotos[i]}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="eda-botao eda-verao-bt" onClick={() => abrirIara(t.verao.pedido)}>{t.verao.acao}</button>
        </div>
      </section>
    </>
  );
}

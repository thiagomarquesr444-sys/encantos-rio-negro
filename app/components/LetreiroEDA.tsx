'use client';
// EDA_LETREIRO_ESCURO_V2 (premium + carrossel no celular): seção escura no estilo letreiro (título condensado em
// maiúsculas + 4 cartões numerados sobre foto). Os textos aqui são a primeira
// versão e podem ser ajustados sem mexer no layout.
import { useLanguage } from '@/app/components/LanguageProvider';
import './letreiro-eda.css';

const conteudo = {
  PT: {
    titulo: 'Por que a Encantos da Amazônia',
    lista: 'Motivos, deslize para ver todos',
    itens: [
      { foto: '/images/destinos/serra-araca-card.jpeg', texto: 'Divulgar o potencial turístico do Amazonas, do Rio Negro ao Solimões, reunindo destinos, experiências e quem trabalha com turismo no território.' },
      { foto: '/images/pesca/tucunare-nado.webp', texto: 'Apoiar a pesca esportiva e a conservação dos rios, incentivando a prática de pesque e solte e o cuidado com a natureza.' },
      { foto: '/images/cultura/festribal.jpg', texto: 'Valorizar a cultura amazônica: festivais, tradições e histórias contadas por quem vive nas comunidades.' },
      { foto: '/images/fundo/encontro-das-aguas-1920.jpg', texto: 'Dar visibilidade à mão de obra local, com guias, barqueiros e operadoras de cada município aparecendo para quem procura o território.' },
    ],
  },
  EN: {
    titulo: 'Why Encantos da Amazônia',
    lista: 'Reasons, swipe to see all',
    itens: [
      { foto: '/images/destinos/serra-araca-card.jpeg', texto: 'Promote the tourism potential of Amazonas, from the Rio Negro to the Solimões, bringing together destinations, experiences and local tourism professionals.' },
      { foto: '/images/pesca/tucunare-nado.webp', texto: 'Support sport fishing and river conservation, encouraging catch-and-release and care for nature.' },
      { foto: '/images/cultura/festribal.jpg', texto: 'Celebrate Amazonian culture: festivals, traditions and stories told by the people who live in the communities.' },
      { foto: '/images/fundo/encontro-das-aguas-1920.jpg', texto: 'Give visibility to local people: guides, boat captains and operators from each municipality, found by those looking for the region.' },
    ],
  },
  ES: {
    titulo: 'Por qué Encantos da Amazônia',
    lista: 'Motivos, desliza para ver todos',
    itens: [
      { foto: '/images/destinos/serra-araca-card.jpeg', texto: 'Dar a conocer el potencial turístico de Amazonas, del Río Negro al Solimões, reuniendo destinos, experiencias y profesionales locales.' },
      { foto: '/images/pesca/tucunare-nado.webp', texto: 'Apoyar la pesca deportiva y la conservación de los ríos, fomentando la pesca y suelta y el cuidado de la naturaleza.' },
      { foto: '/images/cultura/festribal.jpg', texto: 'Valorar la cultura amazónica: festivales, tradiciones e historias contadas por quienes viven en las comunidades.' },
      { foto: '/images/fundo/encontro-das-aguas-1920.jpg', texto: 'Dar visibilidad a la gente local: guías, barqueros y operadoras de cada municipio, para quienes buscan el territorio.' },
    ],
  },
} as const;

export default function LetreiroEDA() {
  const { idioma } = useLanguage();
  const c = conteudo[idioma];

  return (
    <section className="eda-letreiro ern-publico-hero" aria-labelledby="titulo-letreiro-eda">
      <div className="eda-letreiro-miolo">
        <h2 id="titulo-letreiro-eda" className="eda-letreiro-titulo">{c.titulo}</h2>
        <span className="eda-letreiro-veio" aria-hidden="true" />
        <ol className="eda-letreiro-grade" tabIndex={0} aria-label={c.lista}>
          {c.itens.map((item, i) => (
            <li key={item.foto} className="eda-letreiro-cartao">
              <div className="eda-letreiro-foto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.foto} alt="" loading="lazy" decoding="async" />
                <span className="eda-letreiro-numero" aria-hidden="true">{i + 1}</span>
              </div>
              <p>{item.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

'use client';

import { useState } from 'react';
import VideoDestinoERN from './VideoDestinoERN';
import { useLanguage } from './LanguageProvider';

type RelatedDestination =
  | 'anavilhanas'
  | 'jau'
  | 'festival-peixe-boi';

type Props = {
  onExplorar: (id: RelatedDestination) => void;
};

const photos = [
  '/images/destinos/novo-airao/dinossauro.jpg',
  '/images/destinos/novo-airao/cidade-01.jpg',
  '/images/destinos/novo-airao/cidade-02.jpg',
];

const videos = [
  '/videos destinos/novoairão1.1.MP4',
].map(path => encodeURI(path));

const copy = {
  PT: {
    eyebrow: 'Baixo Rio Negro · cidade, memória e natureza',
    title: 'Novo Airão: a descoberta começa na cidade',
    intro:
      'Antes de partir pelos caminhos do Rio Negro, conheça a cidade que recebe você. A vista da praça convida a caminhar, observar seus monumentos e descobrir histórias que também merecem fazer parte da viagem.',
    historyTitle: 'Entre Velho Airão e uma nova história',
    history:
      'A trajetória de Novo Airão está ligada ao antigo povoado de Airão, hoje conhecido como Velho Airão. Com a mudança de moradores para Tauapessaçu, formou-se a sede atual. Conhecer essa memória acrescenta outra dimensão à paisagem.',
    dinoTitle: 'Um dinossauro no caminho: que história é essa?',
    dino:
      'A escultura desperta a curiosidade de quem passa pela praça. Em entrevista ao Amazônia Incrível, o artista Ercules Alves relata que criou a obra em 2007, inspirado pelo interesse das crianças por uma representação de dinossauro. É uma história da arte local que vale descobrir durante a caminhada.',
    photoAlts: [
      'Escultura de dinossauro e fontes na praça de Novo Airão ao entardecer',
      'Registro fotográfico de Novo Airão',
      'Outro registro fotográfico de Novo Airão',
    ],
    gallery: 'Olhares sobre Novo Airão',
    photo: 'Foto',
    videoTitle: 'Novo Airão em movimento',
    nextTitle: 'Da cidade, continue a descoberta',
    next:
      'Depois de conhecer a praça e suas histórias, explore as apresentações dos lugares e celebrações relacionados a Novo Airão.',
    related: ['Anavilhanas', 'Parque Nacional do Jaú', 'Eco Festival do Peixe-Boi'],
    sources: 'Fontes da história',
    historySource: 'História de Novo Airão · Associação Amazonense de Municípios',
    dinoSource: 'Origem da escultura · entrevista com o artista',
  },
  EN: {
    eyebrow: 'Lower Rio Negro · town, memory and nature',
    title: 'Novo Airão: discovery begins in town',
    intro:
      'Before setting out along the Rio Negro, get to know the town welcoming you. The view of the square invites you to walk, explore its monuments and discover stories that deserve a place in your journey.',
    historyTitle: 'From Velho Airão to a new chapter',
    history:
      'Novo Airão’s story is linked to the former settlement of Airão, now known as Velho Airão. Residents moved to Tauapessaçu, where today’s town developed. Discovering this history adds another dimension to the scenery.',
    dinoTitle: 'A dinosaur in the square: what is its story?',
    dino:
      'The sculpture catches the attention of people walking through the square. In an interview with Amazônia Incrível, artist Ercules Alves says he created it in 2007, inspired by children’s interest in a dinosaur depiction. It is a story of local art to discover on your walk.',
    photoAlts: [
      'Dinosaur sculpture and fountains in a Novo Airão square at dusk',
      'Photograph of Novo Airão',
      'Another photograph of Novo Airão',
    ],
    gallery: 'Views of Novo Airão',
    photo: 'Photo',
    videoTitle: 'Novo Airão in motion',
    nextTitle: 'Continue exploring beyond town',
    next:
      'After discovering the square and its stories, explore our introductions to places and celebrations associated with Novo Airão.',
    related: ['Anavilhanas', 'Jaú National Park', 'Manatee Eco Festival'],
    sources: 'Historical sources',
    historySource: 'History of Novo Airão · Amazonas Municipalities Association',
    dinoSource: 'The sculpture’s origins · artist interview',
  },
  ES: {
    eyebrow: 'Bajo Río Negro · ciudad, memoria y naturaleza',
    title: 'Novo Airão: el descubrimiento comienza en la ciudad',
    intro:
      'Antes de recorrer los caminos del río Negro, conoce la ciudad que te recibe. La vista de la plaza invita a caminar, observar sus monumentos y descubrir historias que también merecen formar parte del viaje.',
    historyTitle: 'De Velho Airão a una nueva historia',
    history:
      'La trayectoria de Novo Airão está ligada al antiguo poblado de Airão, hoy conocido como Velho Airão. Con el traslado de habitantes a Tauapessaçu se formó la sede actual. Conocer esta memoria añade otra dimensión al paisaje.',
    dinoTitle: 'Un dinosaurio en la plaza: ¿cuál es su historia?',
    dino:
      'La escultura despierta la curiosidad de quienes recorren la plaza. En una entrevista con Amazônia Incrível, el artista Ercules Alves cuenta que creó la obra en 2007, inspirado por el interés de los niños en una representación de dinosaurio. Una historia del arte local para descubrir durante el paseo.',
    photoAlts: [
      'Escultura de dinosaurio y fuentes en una plaza de Novo Airão al atardecer',
      'Fotografía de Novo Airão',
      'Otra fotografía de Novo Airão',
    ],
    gallery: 'Miradas sobre Novo Airão',
    photo: 'Foto',
    videoTitle: 'Novo Airão en movimiento',
    nextTitle: 'Continúa descubriendo más allá de la ciudad',
    next:
      'Después de conocer la plaza y sus historias, explora nuestras presentaciones de lugares y celebraciones relacionados con Novo Airão.',
    related: ['Anavilhanas', 'Parque Nacional de Jaú', 'Eco Festival del Manatí'],
    sources: 'Fuentes históricas',
    historySource: 'Historia de Novo Airão · Asociación Amazonense de Municipios',
    dinoSource: 'Origen de la escultura · entrevista con el artista',
  },
};

export default function NovoAiraoDestinoERN({ onExplorar }: Props) {
  const { idioma } = useLanguage();
  const t = copy[idioma];
  const [photo, setPhoto] = useState(0);
  const related: RelatedDestination[] = [
    'anavilhanas', 'jau', 'festival-peixe-boi',
  ];

  return (
    <section className="novo-airao-ern" aria-label={t.title}>
      <p className="eyebrow">{t.eyebrow}</p>
      <h3>{t.title}</h3>
      <p>{t.intro}</p>

      <h3>{t.historyTitle}</h3>
      <p>{t.history}</p>

      <h3>{t.dinoTitle}</h3>
      <p>{t.dino}</p>

      <div className="gallery" aria-label={t.gallery}>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[photo]}
            alt={t.photoAlts[photo]}
            loading="lazy"
            decoding="async"
          />
          <figcaption>{t.photoAlts[photo]}</figcaption>
        </figure>

        <div className="photo-options" role="group" aria-label={t.gallery}>
          {photos.map((src, index) => (
            <button
              key={src}
              type="button"
              aria-pressed={photo === index}
              aria-label={`${t.photo} ${index + 1}: ${t.photoAlts[index]}`}
              onClick={() => setPhoto(index)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" decoding="async" />
              <span>{t.photo} {index + 1}</span>
            </button>
          ))}
        </div>
      </div>

      <VideoDestinoERN
        title={t.videoTitle}
        poster="/images/destinos/novo-airao/capa.jpg"
        videos={videos}
      />

      <h3>{t.nextTitle}</h3>
      <p>{t.next}</p>

      <div className="related">
        {related.map((id, index) => (
          <button key={id} type="button" onClick={() => onExplorar(id)}>
            {t.related[index]} <span aria-hidden="true">↗</span>
          </button>
        ))}
      </div>

      <details>
        <summary>{t.sources}</summary>
        <a
          href="https://aam.org.br/novo-airao/"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.historySource} ↗
        </a>
        <a
          href="https://amazoniaincrivel.ncnews.com.br/2024/10/16/dinossauro-e-atracao-em-praca-no-amazonas-conheca-o-lugar-2/"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.dinoSource} ↗
        </a>
      </details>

      <style jsx>{`
        .novo-airao-ern {
          min-width: 0;
          margin-top: 24px;
          color: #263c35;
        }
        .eyebrow {
          color: #806024;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
        }
        h3 {
          margin: 26px 0 12px;
          color: #183e35;
          font-family: var(--font-fraunces), Georgia, serif;
          font-size: clamp(22px, 3vw, 28px);
          line-height: 1.3;
          overflow-wrap: anywhere;
        }
        p {
          margin: 0 0 16px;
          font-size: 14px;
          line-height: 1.85;
        }
        .gallery {
          margin: 22px 0;
        }
        figure {
          margin: 0;
        }
        figure img {
          display: block;
          width: 100%;
          max-height: 380px;
          object-fit: contain;
          border-radius: 14px;
          background: #ede7d9;
        }
        figcaption {
          margin-top: 8px;
          color: #526259;
          font-size: 12px;
          line-height: 1.6;
        }
        .photo-options {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-top: 14px;
        }
        .photo-options button {
          min-width: 0;
          padding: 4px;
          border: 2px solid transparent;
          border-radius: 10px;
          background: #f5eddd;
          color: #28483c;
          cursor: pointer;
        }
        .photo-options button[aria-pressed='true'] {
          border-color: #8b641f;
        }
        .photo-options img {
          display: block;
          width: 100%;
          height: 64px;
          object-fit: cover;
          border-radius: 6px;
        }
        .photo-options span {
          display: block;
          padding: 7px 2px;
          font-size: 11px;
        }
        .related {
          display: grid;
          gap: 8px;
        }
        .related button {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          min-height: 46px;
          padding: 12px 14px;
          border: 1px solid #c8b78f;
          border-radius: 12px;
          background: #fffaf0;
          color: #28483c;
          font: inherit;
          font-size: 13px;
          text-align: left;
          cursor: pointer;
        }
        button:focus-visible,
        summary:focus-visible,
        a:focus-visible {
          outline: 3px solid #b88026;
          outline-offset: 4px;
        }
        details {
          margin-top: 22px;
          padding-top: 12px;
          border-top: 1px solid #ded5c4;
          font-size: 12px;
        }
        summary {
          width: fit-content;
          padding: 10px 0;
          cursor: pointer;
        }
        details a {
          display: block;
          padding: 10px 0;
          color: #275541;
          line-height: 1.7;
          text-underline-offset: 3px;
          overflow-wrap: anywhere;
        }
      `}</style>
    </section>
  );
}
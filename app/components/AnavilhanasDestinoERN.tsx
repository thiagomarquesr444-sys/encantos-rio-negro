'use client';

import { useState } from 'react';
import VideoDestinoERN from './VideoDestinoERN';
import { useLanguage } from './LanguageProvider';

const textos = {
  PT: {
    eyebrow: 'Novo Airão · Rio Negro',
    title: 'Anavilhanas: a cada curva, uma nova Amazônia',
    intro:
      'De longe, as ilhas desenham um mosaico sobre o Rio Negro. Pelos canais, a floresta se aproxima e cada passagem desperta a vontade de descobrir o que existe adiante.',
    riverTitle: 'O rio transforma o caminho',
    river:
      'Anavilhanas reúne cerca de 400 ilhas em uma paisagem que acompanha o pulso das águas. A cheia abre caminhos entre árvores do igapó; quando as águas recuam, praias sazonais podem revelar outra face do arquipélago. A experiência muda com o nível do rio e as condições de cada passeio.',
    historyTitle: 'Uma paisagem para conhecer e conservar',
    history:
      'Protegida como estação ecológica desde 1981, a área tornou-se Parque Nacional em 2008. Sua história aproxima a descoberta da Amazônia do cuidado com a floresta: navegar por esse território também é aprender a observar seus ritmos.',
    invitationTitle: 'Qual Anavilhanas você quer descobrir?',
    invitation:
      'Os canais, a floresta e a perspectiva de quem navega revelam detalhes que uma única fotografia não conta. Explore os registros e continue sua descoberta de Novo Airão pela ERN.',
    practical:
      'Planeje a visita com profissionais locais e confirme as condições do rio, o percurso e as orientações do parque. Praias e encontros com animais dependem das condições naturais.',
    gallery: 'Olhares de Anavilhanas',
    photo: 'Fotografia',
    alt: 'Registro de Anavilhanas fornecido à Encantos Rio Negro',
    video: 'Anavilhanas em movimento',
    sources: 'Conheça as fontes',
  },
  EN: {
    eyebrow: 'Novo Airão · Rio Negro',
    title: 'Anavilhanas: a new Amazon around every bend',
    intro:
      'From afar, the islands form a mosaic across the Rio Negro. Along the channels, the forest draws closer and every passage invites you to discover what lies ahead.',
    riverTitle: 'The river reshapes the journey',
    river:
      'Anavilhanas brings together around 400 islands in a landscape shaped by the rhythm of the water. High water opens passages among flooded forest trees; as the river recedes, seasonal beaches may reveal another side of the archipelago. Each experience depends on river levels and trip conditions.',
    historyTitle: 'A landscape to discover and protect',
    history:
      'Protected as an ecological station since 1981, the area became a National Park in 2008. Its history connects discovery with forest conservation: travelling through this territory also means learning to observe its rhythms.',
    invitationTitle: 'Which Anavilhanas will you discover?',
    invitation:
      'The channels, the forest and the view from the water reveal details no single photograph can tell. Explore these records and continue discovering Novo Airão with ERN.',
    practical:
      'Plan your visit with local professionals and confirm river conditions, routes and park guidance. Beaches and wildlife encounters depend on natural conditions.',
    gallery: 'Views of Anavilhanas',
    photo: 'Photograph',
    alt: 'Photograph of Anavilhanas provided to Encantos Rio Negro',
    video: 'Anavilhanas in motion',
    sources: 'Explore the sources',
  },
  ES: {
    eyebrow: 'Novo Airão · Río Negro',
    title: 'Anavilhanas: una nueva Amazonía en cada curva',
    intro:
      'Desde lejos, las islas dibujan un mosaico sobre el Río Negro. Entre los canales, la selva se acerca y cada paso despierta el deseo de descubrir lo que viene después.',
    riverTitle: 'El río transforma el recorrido',
    river:
      'Anavilhanas reúne unas 400 islas en un paisaje que sigue el pulso del agua. La crecida abre caminos entre los árboles del bosque inundado; cuando el agua baja, las playas estacionales pueden mostrar otra cara del archipiélago. La experiencia cambia con el nivel del río y las condiciones del paseo.',
    historyTitle: 'Un paisaje para conocer y conservar',
    history:
      'Protegida como estación ecológica desde 1981, el área se convirtió en Parque Nacional en 2008. Su historia une el descubrimiento de la Amazonía con el cuidado de la selva: recorrer este territorio también significa aprender a observar sus ritmos.',
    invitationTitle: '¿Qué Anavilhanas quieres descubrir?',
    invitation:
      'Los canales, la selva y la mirada desde el agua revelan detalles que una sola fotografía no cuenta. Explora estos registros y sigue descubriendo Novo Airão con ERN.',
    practical:
      'Planifica la visita con profesionales locales y confirma las condiciones del río, el recorrido y las indicaciones del parque. Las playas y los encuentros con animales dependen de las condiciones naturales.',
    gallery: 'Miradas de Anavilhanas',
    photo: 'Fotografía',
    alt: 'Fotografía de Anavilhanas proporcionada a Encantos Rio Negro',
    video: 'Anavilhanas en movimiento',
    sources: 'Consulta las fuentes',
  },
};

const fotos = [
  '/images/destinos/anavilhanas/capa.jpg',
  '/images/destinos/anavilhanas/detalhe.jpg',
];

const videos = [
  '/videos destinos/anavilhanas1.1.MP4',
].map(path => encodeURI(path));

export default function AnavilhanasDestinoERN() {
  const { idioma: lang } = useLanguage();
  const t = textos[lang === 'EN' ? 'EN' : lang === 'ES' ? 'ES' : 'PT'];
  const [foto, setFoto] = useState(0);

  return (
    <section className="anavilhanas-ern" aria-labelledby="anavilhanas-historia">
      <header>
        <p className="eyebrow">{t.eyebrow}</p>
        <h3 id="anavilhanas-historia">{t.title}</h3>
        <p className="intro">{t.intro}</p>
      </header>

      <div className="galeria" role="group" aria-label={t.gallery}>
        {/* Fotografias locais mantidas em sua proporção original. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="foto-principal"
          src={fotos[foto]}
          alt={`${t.alt} — ${foto + 1}`}
          loading="lazy"
          decoding="async"
        />
        <div className="miniaturas">
          {fotos.map((src, index) => (
            <button
              key={src}
              type="button"
              aria-label={`${t.photo} ${index + 1}`}
              aria-pressed={foto === index}
              onClick={() => setFoto(index)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" decoding="async" />
              <span>{t.photo} {index + 1}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="historia">
        <div>
          <h4>{t.riverTitle}</h4>
          <p>{t.river}</p>
        </div>
        <div>
          <h4>{t.historyTitle}</h4>
          <p>{t.history}</p>
        </div>
      </div>

      <VideoDestinoERN
        title={t.video}
        poster={fotos[0]}
        videos={videos}
      />

      <div className="convite">
        <h4>{t.invitationTitle}</h4>
        <p>{t.invitation}</p>
      </div>

      <p className="orientacao">{t.practical}</p>

      <details>
        <summary>{t.sources}</summary>
        <a
          href="https://ppbio.inpa.gov.br/sitios/anavilhanas"
          target="_blank"
          rel="noopener noreferrer"
        >
          INPA · Anavilhanas
        </a>
        <a
          href="https://www.gov.br/icmbio/pt-br/assuntos/unidade-de-conservacao/unidades-de-biomas/amazonia/lista-de-ucs/parna-de-anavilhanas"
          target="_blank"
          rel="noopener noreferrer"
        >
          ICMBio · Parque Nacional de Anavilhanas
        </a>
      </details>

      <style jsx>{`
        .anavilhanas-ern {
          min-width: 0;
          margin-top: 22px;
          padding: 22px;
          border: 1px solid #d8cfb9;
          border-radius: 18px;
          background: #faf7ee;
          color: #173b35;
          overflow-wrap: anywhere;
        }
        .eyebrow {
          margin: 0 0 10px;
          color: #665322;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
        }
        h3 {
          margin: 0;
          font-family: var(--font-fraunces), Georgia, serif;
          font-size: clamp(23px, 3vw, 32px);
          line-height: 1.2;
          color: #173b35;
        }
        p {
          margin: 10px 0 0;
          font-size: 14px;
          line-height: 1.8;
        }
        .intro { margin-top: 14px; }
        .galeria { margin: 20px 0; }
        .foto-principal {
          display: block;
          width: 100%;
          height: auto;
          max-height: 360px;
          object-fit: contain;
          border-radius: 12px;
          background: #102e2b;
        }
        .miniaturas {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 10px;
        }
        button {
          min-width: 0;
          padding: 5px;
          border: 2px solid transparent;
          border-radius: 10px;
          background: #eee8d9;
          color: #173b35;
          cursor: pointer;
          font: inherit;
        }
        button[aria-pressed='true'] { border-color: #8b6b2b; }
        button img {
          display: block;
          width: 100%;
          height: 70px;
          object-fit: cover;
          border-radius: 6px;
        }
        button span {
          display: block;
          padding: 6px 2px 2px;
          font-size: 12px;
        }
        h4 {
          margin: 0;
          color: #173b35;
          font-size: 17px;
          line-height: 1.4;
        }
        .historia {
          display: grid;
          gap: 20px;
          margin-bottom: 22px;
        }
        .convite {
          margin-top: 22px;
          padding: 16px;
          border-left: 3px solid #b58b43;
          border-radius: 0 10px 10px 0;
          background: #f0eadb;
        }
        .orientacao {
          margin-top: 18px;
          font-size: 12px;
          color: #4e6055;
        }
        details {
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid #d8cfb9;
          font-size: 12px;
        }
        summary {
          cursor: pointer;
          min-height: 32px;
          font-weight: 700;
        }
        details a {
          display: block;
          padding: 7px 0;
          color: #245e50;
          text-decoration: underline;
        }
        button:focus-visible,
        summary:focus-visible,
        a:focus-visible {
          outline: 3px solid #8b6b2b;
          outline-offset: 3px;
        }
        @media (max-width: 600px) {
          .anavilhanas-ern { padding: 16px; border-radius: 14px; }
          .foto-principal { max-height: 270px; }
          p { font-size: 13px; }
        }
      `}</style>
    </section>
  );
}
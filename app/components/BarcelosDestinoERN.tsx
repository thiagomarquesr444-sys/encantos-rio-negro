'use client';



import { useLanguage } from './LanguageProvider';
import VideoDestinoERN from './VideoDestinoERN';

const media = [
  {
    id: 'cidade',
    src: '/videos%20destinos/barceloscidade.MP4',
    poster: '/images/regiao/matriz.png.jpeg',
  },
] as const;

const translations = {
  PT: {
    eyebrow: 'História, rio e cultura viva',
    title: 'Barcelos, primeira capital do Amazonas',
    intro:
      'Na orla, os barcos anunciam encontros e partidas. À frente, o Rio Negro abre o horizonte. Barcelos convida você a conhecer uma cidade em que a vida do rio, a memória e a cultura caminham juntas.',
    mediaLabel: 'Escolha o que conhecer em Barcelos',
    options: ['Pela cidade', 'Viva o festival', 'História do festival'],
    videoTitles: [
      'Barcelos às margens do Rio Negro',
      'Festival do Peixe Ornamental de Barcelos',
      'A história do Festival do Peixe Ornamental',
    ],
    historyTitle: 'Uma cidade para conhecer além da paisagem',
    history:
      'A antiga Mariuá tornou-se Vila de Barcelos em 1758 e foi sede da Capitania de São José do Rio Negro. Essa trajetória sustenta o orgulho de ser conhecida como a primeira capital do Amazonas. Conhecer Barcelos é também se aproximar das histórias de quem vive às margens do rio.',
    festivalTitle: 'Quando a cidade se transforma em celebração',
    festival:
      'No Festival do Peixe Ornamental, Acará-Disco e Cardinal dão forma a uma disputa de cores, música e torcida. A festa homenageia os piabeiros e aproxima o visitante de uma identidade construída com o rio e seus peixes ornamentais.',
    invitation:
      'Imagine conhecer a orla, ouvir histórias da cidade e viver a energia do festival. Cada experiência revela uma maneira de sentir Barcelos.',
    planning:
      'A programação do festival e a disponibilidade de passeios precisam ser confirmadas para a data da sua viagem.',
    sources: 'Conheça as fontes',
    tourism: 'Turismo de Barcelos',
    archive: 'Arquivo Nacional — história da Capitania',
  },
  EN: {
    eyebrow: 'History, river and living culture',
    title: 'Barcelos, the first capital of Amazonas',
    intro:
      'Along the waterfront, boats mark arrivals and departures. Beyond them, the Rio Negro opens onto the horizon. Barcelos invites you to discover a town where river life, memory and culture come together.',
    mediaLabel: 'Choose what to discover in Barcelos',
    options: ['Around town', 'Experience the festival', 'Festival history'],
    videoTitles: [
      'Barcelos on the banks of the Rio Negro',
      'The Barcelos Ornamental Fish Festival',
      'The history of the Ornamental Fish Festival',
    ],
    historyTitle: 'Discover the stories beyond the scenery',
    history:
      'The former settlement of Mariuá became Vila de Barcelos in 1758 and served as the seat of the Captaincy of São José do Rio Negro. This heritage underpins its proud reputation as the first capital of Amazonas. Visiting Barcelos also means discovering the stories of the people who live along the river.',
    festivalTitle: 'When the town becomes a celebration',
    festival:
      'At the Ornamental Fish Festival, Acará-Disco and Cardinal inspire a rivalry filled with colour, music and cheering crowds. The celebration honours the piabeiros, ornamental fish collectors, and introduces visitors to an identity shaped by the river.',
    invitation:
      'Imagine exploring the waterfront, listening to local stories and experiencing the festival’s energy. Each encounter reveals another side of Barcelos.',
    planning:
      'Confirm the festival programme and tour availability for your travel dates.',
    sources: 'Explore the sources',
    tourism: 'Barcelos Tourism',
    archive: 'National Archives — Captaincy history',
  },
  ES: {
    eyebrow: 'Historia, río y cultura viva',
    title: 'Barcelos, primera capital de Amazonas',
    intro:
      'En la orilla, los barcos anuncian encuentros y partidas. Al frente, el río Negro abre el horizonte. Barcelos te invita a conocer una ciudad donde la vida del río, la memoria y la cultura caminan juntas.',
    mediaLabel: 'Elige qué descubrir en Barcelos',
    options: ['Por la ciudad', 'Vive el festival', 'Historia del festival'],
    videoTitles: [
      'Barcelos a orillas del río Negro',
      'Festival del Pez Ornamental de Barcelos',
      'La historia del Festival del Pez Ornamental',
    ],
    historyTitle: 'Una ciudad para descubrir más allá del paisaje',
    history:
      'La antigua Mariuá se convirtió en Vila de Barcelos en 1758 y fue sede de la Capitanía de São José do Rio Negro. Esta trayectoria sostiene el orgullo de ser conocida como la primera capital de Amazonas. Conocer Barcelos también significa acercarse a las historias de quienes viven a orillas del río.',
    festivalTitle: 'Cuando la ciudad se convierte en celebración',
    festival:
      'En el Festival del Pez Ornamental, Acará-Disco y Cardinal dan forma a una rivalidad llena de colores, música y afición. La fiesta homenajea a los piabeiros, recolectores de peces ornamentales, y acerca al visitante a una identidad construida junto al río.',
    invitation:
      'Imagina recorrer la orilla, escuchar historias locales y vivir la energía del festival. Cada experiencia revela otra manera de sentir Barcelos.',
    planning:
      'Confirma la programación del festival y la disponibilidad de paseos para las fechas de tu viaje.',
    sources: 'Conoce las fuentes',
    tourism: 'Turismo de Barcelos',
    archive: 'Archivo Nacional — historia de la Capitanía',
  },
};

export default function BarcelosDestinoERN() {
  const { idioma } = useLanguage();
  const t = translations[idioma];
  const current = media[0];

  return (
    <section className="barcelos-ern" aria-label={t.title}>
      <header>
        <p className="eyebrow">{t.eyebrow}</p>
        <h3>{t.title}</h3>
        <p>{t.intro}</p>
      </header>



      <VideoDestinoERN
        key={current.id}
        title={t.videoTitles[0]}
        poster={current.poster}
        videos={[current.src]}
      />

      <div className="story">
        <h3>{t.historyTitle}</h3>
        <p>{t.history}</p>

        <h3>{t.festivalTitle}</h3>
        <p>{t.festival}</p>

        <p className="invitation">{t.invitation}</p>
        <p className="planning">{t.planning}</p>
      </div>

      <details className="sources">
        <summary>{t.sources}</summary>
        <a
          href="https://turismo.barcelos.am.gov.br/"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.tourism} ↗
        </a>
        <a
          href="https://historialuso.an.gov.br/glossario/index.php/verbetes-glossario/27-verbetes-inicados-em-r/538-rio-negro-capitania-de-sao-jose-do"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.archive} ↗
        </a>
      </details>

      <style jsx>{`
        .barcelos-ern {
          margin-top: 24px;
          min-width: 0;
          color: #263c35;
        }

        .eyebrow {
          margin: 0 0 10px;
          color: #806024;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        h3 {
          margin: 0 0 12px;
          color: #183e35;
          font-family: var(--font-fraunces), Georgia, serif;
          font-size: clamp(22px, 3vw, 28px);
          line-height: 1.25;
          overflow-wrap: anywhere;
        }

        p {
          margin: 0 0 16px;
          font-size: 14px;
          line-height: 1.85;
        }

        .choices {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 22px 0 14px;
        }

        .choices button {
          flex: 1 1 130px;
          min-width: 0;
          min-height: 44px;
          padding: 10px 12px;
          border: 1px solid #c8b78f;
          border-radius: 12px;
          background: #fffaf0;
          color: #28483c;
          font: inherit;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.4;
          cursor: pointer;
        }

        .choices button[aria-pressed='true'] {
          border-color: #214d3d;
          background: #214d3d;
          color: #fffaf0;
        }

        .choices button:hover {
          border-color: #214d3d;
        }

        button:focus-visible,
        summary:focus-visible,
        a:focus-visible {
          outline: 3px solid #b88026;
          outline-offset: 4px;
        }

        .story {
          margin-top: 26px;
        }

        .story h3:not(:first-child) {
          margin-top: 26px;
        }

        .invitation {
          padding: 16px;
          border-left: 3px solid #b98a3e;
          border-radius: 0 12px 12px 0;
          background: #f5eddd;
        }

        .planning {
          color: #526259;
          font-size: 12px;
        }

        .sources {
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid #ded5c4;
          font-size: 12px;
        }

        summary {
          width: fit-content;
          padding: 8px 0;
          font-weight: 600;
          cursor: pointer;
        }

        .sources a {
          display: block;
          width: fit-content;
          padding: 10px 0;
          color: #275541;
          line-height: 1.6;
          text-underline-offset: 3px;
          overflow-wrap: anywhere;
        }
      `}</style>
    </section>
  );
}
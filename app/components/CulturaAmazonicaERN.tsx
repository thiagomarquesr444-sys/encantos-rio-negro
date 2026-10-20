'use client';

import { useRef, useState } from 'react';
import { useLanguage } from '@/app/components/LanguageProvider';

const colecoes = [
  {
    "id": "barcelos",
    "municipio": "Barcelos",
    "videos": [
      {
        "arquivo": "barcelosfestival.MP4",
        "capa": "barcelosfestival.jpg",
        "largura": 854,
        "altura": 480,
        "titulo": "Festival do Peixe Ornamental",
        "descricao": "Em Barcelos, no Amazonas, o Festival do Peixe Ornamental valoriza a identidade local e a história dos piabeiros. Conheça uma celebração ligada aos peixes e à vida no Rio Negro."
      },
      {
        "arquivo": "acaradisco.MP4",
        "capa": "acaradisco.jpg",
        "largura": 480,
        "altura": 854,
        "titulo": "Acará-Disco em cena",
        "descricao": "Um registro da participação do Acará-Disco na festa de Barcelos. A apresentação aproxima o visitante das cores e da expressão cultural do festival."
      },
      {
        "arquivo": "bailadoacara.MP4",
        "capa": "bailadoacara.jpg",
        "largura": 480,
        "altura": 854,
        "titulo": "O bailado do Acará",
        "descricao": "Movimento e apresentação cultural em Barcelos, Amazonas. Este registro destaca o bailado e convida a observar os detalhes da participação do Acará-Disco."
      },
      {
        "arquivo": "torcidacardinal.MP4",
        "capa": "torcidacardinal.jpg",
        "largura": 480,
        "altura": 854,
        "titulo": "A energia da torcida Cardinal",
        "descricao": "A festa também acontece nas arquibancadas. Em Barcelos, o registro da torcida Cardinal revela a participação do público na experiência do Festival do Peixe Ornamental."
      },
      {
        "arquivo": "historiadofestivaldebarcelos-web.mp4",
        "capa": "historiadofestivaldebarcelos-web.jpg",
        "largura": 640,
        "altura": 480,
        "titulo": "Memórias do festival de Barcelos",
        "descricao": "Um olhar audiovisual sobre a história do festival e sua relação com Barcelos, no Amazonas. Um convite para conhecer o contexto da celebração para além do espetáculo."
      }
    ]
  },
  {
    "id": "novo-airao",
    "municipio": "Novo Airão",
    "videos": [
      {
        "arquivo": "festivaldopeixeboi.MP4",
        "capa": "festivaldopeixeboi.jpg",
        "largura": 854,
        "altura": 480,
        "titulo": "Ecofestival do Peixe-Boi",
        "descricao": "Em Novo Airão, no Amazonas, o Ecofestival do Peixe-Boi integra o repertório cultural do Rio Negro. Conheça um registro dessa celebração e da expressão artística do município."
      }
    ]
  },
  {
    "id": "sao-gabriel",
    "municipio": "São Gabriel da Cachoeira",
    "videos": [
      {
        "arquivo": "festribal.MP4",
        "capa": "festribal.jpg",
        "largura": 854,
        "altura": 480,
        "titulo": "Festribal: cultura do Alto Rio Negro",
        "descricao": "O Festribal faz parte da vida cultural de São Gabriel da Cachoeira, no Amazonas. A celebração abre caminhos para conhecer a diversidade cultural dos povos indígenas do Alto Rio Negro."
      },
      {
        "arquivo": "festribal2.MP4",
        "capa": "festribal2.jpg",
        "largura": 854,
        "altura": 480,
        "titulo": "Outro olhar sobre o Festribal",
        "descricao": "Mais um registro das apresentações em São Gabriel da Cachoeira. Cada povo possui suas próprias referências: este recorte apresenta o evento sem resumir a diversidade da região a uma única tradição."
      }
    ]
  },
  {
    "id": "santa-isabel",
    "municipio": "Santa Isabel do Rio Negro",
    "videos": [
      {
        "arquivo": "santaisabel.MP4",
        "capa": "santaisabel.jpg",
        "largura": 768,
        "altura": 432,
        "titulo": "Quadrilhas em Santa Isabel",
        "descricao": "Em Santa Isabel do Rio Negro, no Amazonas, este registro apresenta a participação das quadrilhas na vida cultural local. Dança e encontro aproximam o visitante da celebração do município."
      }
    ]
  },
  {
    "id": "manacapuru",
    "municipio": "Manacapuru",
    "videos": [
      {
        "arquivo": "cirandasmanacapuru.MP4",
        "capa": "cirandasmanacapuru.jpg",
        "largura": 854,
        "altura": 480,
        "titulo": "Cirandas de Manacapuru",
        "descricao": "Nossa viagem cultural segue pelo Amazonas até Manacapuru. As cirandas fazem parte da identidade do município e reúnem arte, dança e participação coletiva em sua celebração."
      }
    ]
  }
];

type VideoCultural = (typeof colecoes)[number]['videos'][number];

const textos = {
  PT: {
    eyebrow: 'Cultura viva',
    title: 'A Amazônia acontece aqui.',
    description: 'Percorra os municípios, conheça suas celebrações e encontre novas razões para viajar.',
    watch: 'Assistir ao vídeo',
    error: 'Não foi possível abrir o vídeo. Tente novamente.',
    retry: 'Tentar novamente',
    choose: 'Escolher município',
  },
  EN: {
    eyebrow: 'Living culture',
    title: 'The Amazon comes alive here.',
    description: 'Explore towns and their celebrations, and discover new reasons to travel. Editorial descriptions are presented in Portuguese.',
    watch: 'Watch video',
    error: 'The video could not be opened. Please try again.',
    retry: 'Try again',
    choose: 'Choose a town',
  },
  ES: {
    eyebrow: 'Cultura viva',
    title: 'La Amazonía vive aquí.',
    description: 'Explora los municipios y sus celebraciones. Las descripciones editoriales se presentan en portugués.',
    watch: 'Ver video',
    error: 'No se pudo abrir el video. Inténtalo de nuevo.',
    retry: 'Intentar de nuevo',
    choose: 'Elegir municipio',
  },
};

function VideoCulturaERN({
  item,
  assistir,
  erroTexto,
  repetir,
}: {
  item: VideoCultural;
  assistir: string;
  erroTexto: string;
  repetir: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState(false);
  const vertical = item.altura > item.largura;
  const poster = '/images/cultura/' + item.capa;

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-[#171811] ${vertical ? 'mx-auto w-full max-w-[320px]' : 'w-full'}`}
      style={{ aspectRatio: item.largura + ' / ' + item.altura }}
    >
      {erro ? (
        <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-5 text-center text-white">
          <p className="text-sm">{erroTexto}</p>
          <button
            type="button"
            onClick={() => { setErro(false); setAberto(false); }}
            className="min-h-12 rounded-lg border border-white/50 px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {repetir}
          </button>
        </div>
      ) : aberto ? (
        <video
          controls
          autoPlay
          playsInline
          preload="none"
          poster={poster}
          aria-label={item.titulo}
          onError={() => setErro(true)}
          className="absolute inset-0 h-full w-full object-contain"
        >
          <source src={'/videos/' + item.arquivo} type="video/mp4" />
        </video>
      ) : (
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-label={assistir + ': ' + item.titulo}
          className="group absolute inset-0 h-full w-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#e3b567]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={poster}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-contain"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/20">
            <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full border border-white/70 bg-black/45 text-2xl text-white">
              ▶
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

export default function CulturaAmazonicaERN() {
  const { idioma } = useLanguage();
  const t = textos[idioma];
  const [selecionado, setSelecionado] = useState('barcelos');
  const recipiente = useRef<HTMLElement>(null);
  const colecao = colecoes.find(item => item.id === selecionado) ?? colecoes[0];

  return (
    <section
      ref={recipiente}
      id="cultura-amazonica"
      aria-labelledby="cultura-amazonica-titulo"
      onPlayCapture={event => {
        const atual = event.target;
        if (!(atual instanceof HTMLVideoElement)) return;
        recipiente.current?.querySelectorAll('video').forEach(video => {
          if (video !== atual) video.pause();
        });
      }}
      className="border-t border-[#cdba7a]/60 bg-[#fffcf0] px-5 py-16 text-[#30260d] md:px-8 md:py-24"
    >
      <div className="mx-auto max-w-[1180px]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#805600]">
          {t.eyebrow}
        </p>

        <h2
          id="cultura-amazonica-titulo"
          className="mt-4 max-w-3xl text-4xl leading-[1.08] tracking-[-0.035em] md:text-6xl"
          style={{ fontFamily: 'var(--font-fraunces), serif' }}
        >
          {t.title}
        </h2>

        <p className="mt-5 max-w-2xl text-sm leading-7 text-[#695727]">
          {t.description}
        </p>

        <div aria-label={t.choose} role="group" className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-b border-[#cdba7a]/70">
          {colecoes.map(item => (
            <button
              key={item.id}
              type="button"
              aria-pressed={selecionado === item.id}
              aria-controls="cultura-colecao"
              onClick={() => setSelecionado(item.id)}
              className={`min-h-12 border-b-2 pb-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#805600] ${selecionado === item.id ? 'border-[#805600] text-[#805600]' : 'border-transparent text-[#695727] hover:border-[#cdba7a]'}`}
            >
              {item.municipio}
            </button>
          ))}
        </div>

        <div
          id="cultura-colecao"
          key={colecao.id}
          className="cultura-entrada mt-10 grid items-start gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3"
        >
          {colecao.videos.map(item => {
            const vertical = item.altura > item.largura;

            return (
              <article
                key={item.arquivo}
                lang="pt-BR"
                className={`min-w-0 ${vertical ? '' : 'md:col-span-2'}`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#805600]">
                  {colecao.municipio} · Amazonas
                </p>

                <h3
                  className="mt-3 break-words text-2xl leading-tight sm:text-3xl"
                  style={{ fontFamily: 'var(--font-fraunces), serif' }}
                >
                  {item.titulo}
                </h3>

                <p className="mb-5 mt-4 max-w-2xl text-sm leading-7 text-[#695727]">
                  {item.descricao}
                </p>

                <VideoCulturaERN
                  item={item}
                  assistir={t.watch}
                  erroTexto={t.error}
                  repetir={t.retry}
                />
              </article>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .cultura-entrada {
          animation: ernCulturaEntrada 450ms ease-out both;
        }
        @keyframes ernCulturaEntrada {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cultura-entrada { animation: none; }
        }
      `}</style>
    </section>
  );
}

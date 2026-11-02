'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useLanguage } from '@/app/components/LanguageProvider';
import { homeTranslations, type HomeTranslation } from '@/lib/i18n/home';

// ERN_HERO_IMERSIVO_V1
// Abertura do portal: título centralizado, busca de destinos e destaques.
// A paisagem de fundo é aplicada pela página (envolve também o Concierge).

const textos = {
  PT: {
    placeholder: 'Para onde você quer ir no Rio Negro?',
    rotulo: 'Buscar destino',
    buscar: 'Buscar',
    sugestoes: 'Populares:',
    destaques: [
      { titulo: 'Atendimento local', texto: 'Quem conhece o rio ajuda você a planejar.' },
      { titulo: 'Operadores conectados', texto: 'Agências, guias e barqueiros da região na Rede ERN.' },
      { titulo: 'Planejamento personalizado', texto: 'Roteiros pensados para o seu tempo e interesse.' },
      { titulo: 'Leve no interior', texto: 'Pensado para Starlink e internet de comunidade.' },
    ],
  },
  EN: {
    placeholder: 'Where do you want to go on the Rio Negro?',
    rotulo: 'Search destination',
    buscar: 'Search',
    sugestoes: 'Popular:',
    destaques: [
      { titulo: 'Local support', texto: 'People who know the river help you plan.' },
      { titulo: 'Connected operators', texto: 'Agencies, guides and boat operators on the ERN Network.' },
      { titulo: 'Personal planning', texto: 'Itineraries shaped around your time and interests.' },
      { titulo: 'Light in remote areas', texto: 'Designed for Starlink and community internet.' },
    ],
  },
  ES: {
    placeholder: '¿A dónde quieres ir en el Río Negro?',
    rotulo: 'Buscar destino',
    buscar: 'Buscar',
    sugestoes: 'Populares:',
    destaques: [
      { titulo: 'Atención local', texto: 'Quien conoce el río te ayuda a planificar.' },
      { titulo: 'Operadores conectados', texto: 'Agencias, guías y barqueros de la región en la Red ERN.' },
      { titulo: 'Planificación personalizada', texto: 'Rutas pensadas para tu tiempo e interés.' },
      { titulo: 'Liviano en el interior', texto: 'Pensado para Starlink e internet comunitaria.' },
    ],
  },
};

const SUGESTOES = ['Barcelos', 'Mariuá', 'Serra do Aracá', 'Anavilhanas'];

const FOCO =
  'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F4C77E]';

function Icone({ indice }: { indice: number }) {
  const caminhos: ReactNode[] = [
    <path key="a" d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />,
    <path key="b" d="M7 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M17 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M2 20c0-3 2.2-5 5-5s5 2 5 5 M12 20c0-3 2.2-5 5-5s5 2 5 5" />,
    <path key="c" d="M4 6h16 M4 12h10 M4 18h7 M17 15l2 2 3-4" />,
    <path key="d" d="M2 9a15 15 0 0 1 20 0 M5.5 12.5a10 10 0 0 1 13 0 M9 16a5 5 0 0 1 6 0 M12 20h.01" />,
  ];

  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {caminhos[indice]}
    </svg>
  );
}

export default function HeroImersivoERN({
  onBuscar,
}: {
  onBuscar: (texto: string) => void;
}) {
  const { idioma } = useLanguage();
  const h = (homeTranslations[idioma] as HomeTranslation).hero;
  const t = textos[idioma];
  const [termo, setTermo] = useState('');

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    onBuscar(termo);
  }

  return (
    <div className="relative z-10 mx-auto flex max-w-[1180px] flex-col items-center px-5 pb-16 pt-32 text-center md:px-8 md:pb-20 md:pt-40">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#F4C77E]">
        {h.location}
      </p>

      <h1
        className="mt-6 max-w-[880px] text-[clamp(2.25rem,6vw,4.5rem)] font-normal leading-[1.04] tracking-[-0.035em] text-[#F0F0E8]"
        style={{ fontFamily: 'var(--font-fraunces), serif' }}
      >
        {h.title}
      </h1>

      <p className="mt-6 max-w-[620px] text-base leading-7 text-[#E2E8E4] md:text-lg md:leading-8">
        {h.description}
      </p>

      <form
        role="search"
        onSubmit={enviar}
        className="mt-10 flex w-full max-w-[640px] items-stretch gap-2 rounded-2xl border border-white/15 bg-[#07110E]/80 p-2 backdrop-blur-md"
      >
        <label htmlFor="ern-busca-destino" className="sr-only">
          {t.rotulo}
        </label>
        <input
          id="ern-busca-destino"
          type="search"
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          placeholder={t.placeholder}
          autoComplete="off"
          className="min-h-[52px] min-w-0 flex-1 rounded-xl bg-transparent px-4 text-base text-[#F0F0E8] placeholder:text-[#B8C9BF] focus-visible:outline-none"
        />
        <button
          type="submit"
          className={`inline-flex min-h-[52px] shrink-0 items-center gap-2 rounded-xl bg-[#E3A144] px-5 text-sm font-semibold text-[#07110E] transition hover:bg-[#F4C77E] ${FOCO}`}
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M21 21l-4.3-4.3" />
          </svg>
          <span className="hidden sm:inline">{t.buscar}</span>
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-[#D6DFD9]">
        <span>{t.sugestoes}</span>
        {SUGESTOES.map((sugestao) => (
          <button
            key={sugestao}
            type="button"
            onClick={() => {
              setTermo(sugestao);
              onBuscar(sugestao);
            }}
            className={`min-h-[36px] rounded-full border border-white/20 px-3 text-sm text-[#F0F0E8] transition hover:border-[#F4C77E] hover:text-[#F4C77E] ${FOCO}`}
          >
            {sugestao}
          </button>
        ))}
      </div>

      <ul className="mt-16 grid w-full gap-8 text-left sm:grid-cols-2 lg:grid-cols-4">
        {t.destaques.map((destaque, indice) => (
          <li key={destaque.titulo} className="flex flex-col gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#F4C77E]/30 bg-[#07110E]/60 text-[#F4C77E]">
              <Icone indice={indice} />
            </span>
            <span className="text-base font-semibold text-[#F0F0E8]">
              {destaque.titulo}
            </span>
            <span className="text-sm leading-6 text-[#D6DFD9]">
              {destaque.texto}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

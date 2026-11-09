'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useLanguage } from '@/app/components/LanguageProvider';
import IconeIara from '@/app/components/IconeIara';
import { homeTranslations, type HomeTranslation } from '@/lib/i18n/home';

// ERN_HERO_IMERSIVO_V1
// Abertura do portal: título centralizado, busca atendida pela Iara e destaques.
// A paisagem de fundo é aplicada pela página (envolve também o Concierge).

const textos = {
  PT: {
    placeholder: 'Pergunte à Iara: para onde você quer ir?',
    rotulo: 'Buscar com a Iara',
    buscar: 'Buscar',
    dica: 'Busca com a Iara · destinos, passeios, comidas e lendas da Amazônia',
    sugestoes: 'Populares:',
    destaques: [
      { titulo: 'Atendimento local', texto: 'Quem conhece o rio ajuda você a planejar.' },
      { titulo: 'Operadores conectados', texto: 'Agências, guias e barqueiros da região na Rede EDA.' },
      { titulo: 'Planejamento personalizado', texto: 'Roteiros pensados para o seu tempo e interesse.' },
      { titulo: 'Leve no interior', texto: 'Pensado para Starlink e internet de comunidade.' },
    ],
  },
  EN: {
    placeholder: 'Ask Iara: where do you want to go?',
    rotulo: 'Search with Iara',
    buscar: 'Search',
    dica: 'Search with Iara · destinations, tours, food and legends of the Amazon',
    sugestoes: 'Popular:',
    destaques: [
      { titulo: 'Local support', texto: 'People who know the river help you plan.' },
      { titulo: 'Connected operators', texto: 'Agencies, guides and boat operators on the EDA Network.' },
      { titulo: 'Personal planning', texto: 'Itineraries shaped around your time and interests.' },
      { titulo: 'Light in remote areas', texto: 'Designed for Starlink and community internet.' },
    ],
  },
  ES: {
    placeholder: 'Pregúntale a Iara: ¿a dónde quieres ir?',
    rotulo: 'Buscar con Iara',
    buscar: 'Buscar',
    dica: 'Búsqueda con Iara · destinos, paseos, comidas y leyendas de la Amazonía',
    sugestoes: 'Populares:',
    destaques: [
      { titulo: 'Atención local', texto: 'Quien conoce el río te ayuda a planificar.' },
      { titulo: 'Operadores conectados', texto: 'Agencias, guías y barqueros de la región en la Red EDA.' },
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

// ERN_LETREIRO_ANIMADO_V1
// As palavras sobem e ganham foco uma a uma; "Amazônia" (ou "Rio Negro")
// fica em dourado com um brilho lento. Leitores de tela leem o título inteiro.
const DESTAQUE = /^(Rio|Río)$/;
const DESTAQUE_UNICO = /^(Amazônia|Amazon|Amazonía)[.,]?$/;

function TituloAnimado({ texto }: { texto: string }) {
  const palavras = texto.split(' ');
  const pecas: { texto: string; dourado: boolean }[] = [];
  for (let i = 0; i < palavras.length; i += 1) {
    const atual = palavras[i];
    const proxima = palavras[i + 1] ?? '';
    if (DESTAQUE.test(atual) && proxima.startsWith('Negro')) {
      pecas.push({ texto: `${atual} ${proxima}`, dourado: true });
      i += 1;
    } else {
      pecas.push({ texto: atual, dourado: DESTAQUE_UNICO.test(atual) });
    }
  }
  return (
    <span aria-hidden="true">
      {pecas.map((peca, indice) => (
        <span key={`${peca.texto}-${indice}`}>
          <span
            className={`ern-palavra ${peca.dourado ? 'ern-dourado' : ''}`}
            style={{ animationDelay: `${200 + indice * 90}ms` }}
          >
            {peca.texto}
          </span>
          {indice < pecas.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  );
}

export default function HeroImersivoERN({
  onBuscar,
  onFiltrar,
}: {
  onBuscar: (texto: string) => void;
  onFiltrar?: (texto: string) => void;
}) {
  const { idioma } = useLanguage();
  const h = (homeTranslations[idioma] as HomeTranslation).hero;
  const t = textos[idioma];
  const [termo, setTermo] = useState('');

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    // EDA_IARA_PONTE_V1: a busca principal é atendida pela Iara. A vitrine de
    // destinos é filtrada em silêncio para quem continuar rolando a página.
    const texto = termo.trim();
    onFiltrar?.(texto);
    window.dispatchEvent(new CustomEvent('iara:abrir', { detail: texto ? { texto, origem: 'busca' } : {} }));
  }

  return (
    <div className="relative z-10 mx-auto flex max-w-[1180px] flex-col items-center px-5 pb-16 pt-32 text-center md:px-8 md:pb-20 md:pt-40">
      {/* ERN_SELO_LUGARES_V1: lugares do Amazonas rolando devagar dentro da cápsula. */}
      <p
        aria-label={h.location.replace(/ • /g, ', ')}
        className="ern-revela ern-selo-lugares relative w-full max-w-[560px] overflow-hidden rounded-full border border-[#F4C77E]/25 bg-[#07110E]/55 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#F4C77E] backdrop-blur-md sm:text-xs"
      >
        <span aria-hidden="true" className="ern-selo-trilho flex w-max">
          {[0, 1].map((copia) => (
            <span key={copia} className="flex shrink-0 items-center">
              {h.location.split(' • ').map((lugar) => (
                <span key={`${copia}-${lugar}`} className="flex items-center gap-3 whitespace-nowrap pl-3">
                  <span className="h-1.5 w-1.5 rotate-45 bg-gradient-to-b from-[#F7D595] to-[#E3A144]" />
                  {lugar}
                </span>
              ))}
            </span>
          ))}
        </span>
      </p>

      <h1
        aria-label={h.title}
        className="ern-titulo-animado mt-7 max-w-[980px] text-[clamp(2.4rem,6.4vw,5rem)] leading-[1.02] tracking-[-0.045em] text-[#F5F3EA]"
      >
        <TituloAnimado texto={h.title} />
      </h1>

      <p className="ern-revela mt-7 max-w-[640px] text-base leading-7 text-[#DBE3DE] [animation-delay:900ms] md:text-lg md:leading-8">
        {h.description}
      </p>

      <form
        role="search"
        onSubmit={enviar}
        className="ern-revela ern-busca-iara mt-10 flex w-full max-w-[680px] items-center gap-2 rounded-[22px] border border-[#F4C77E]/25 bg-[#07110E]/78 p-2 shadow-[0_30px_70px_rgb(0_0_0/40%),inset_0_1px_0_rgb(255_255_255/8%)] backdrop-blur-xl transition focus-within:border-[#F4C77E]/70 focus-within:shadow-[0_30px_70px_rgb(0_0_0/40%),0_0_0_4px_rgb(244_199_126/16%),inset_0_1px_0_rgb(255_255_255/8%)] [animation-delay:1100ms]"
      >
        <span aria-hidden="true" className="ml-1.5 hidden h-10 w-10 shrink-0 overflow-hidden rounded-full shadow-[0_6px_16px_rgb(0_0_0/40%)] sm:block">
          <IconeIara />
        </span>
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
          maxLength={300}
          enterKeyHint="search"
          className="min-h-[52px] min-w-0 flex-1 rounded-xl bg-transparent px-3 text-base text-[#F0F0E8] placeholder:text-[#B8C9BF] focus-visible:outline-none"
        />
        <button
          type="submit"
          className={`inline-flex min-h-[52px] shrink-0 items-center gap-2 rounded-[14px] bg-gradient-to-b from-[#F7D595] to-[#E3A144] px-6 text-sm font-bold text-[#07110E] shadow-[inset_0_1px_0_rgb(255_255_255/55%)] transition hover:brightness-105 ${FOCO}`}
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M21 21l-4.3-4.3" />
          </svg>
          <span className="hidden sm:inline">{t.buscar}</span>
        </button>
      </form>

      <p className="ern-revela mt-3 flex items-center justify-center gap-2 text-xs tracking-[0.04em] text-[#C9D5CE] [animation-delay:1180ms]">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#3FBF7F] shadow-[0_0_0_3px_rgb(63_191_127/22%)]" />
        {t.dica}
      </p>

      <div className="ern-revela mt-5 flex flex-wrap items-center justify-center gap-2 text-sm text-[#D6DFD9] [animation-delay:1250ms]">
        <span>{t.sugestoes}</span>
        {SUGESTOES.map((sugestao) => (
          <button
            key={sugestao}
            type="button"
            onClick={() => {
              setTermo(sugestao);
              onBuscar(sugestao);
            }}
            className={`min-h-[36px] rounded-full border border-white/20 bg-white/[0.04] px-3.5 text-sm text-[#F0F0E8] backdrop-blur-md transition hover:border-[#F4C77E] hover:text-[#F4C77E] ${FOCO}`}
          >
            {sugestao}
          </button>
        ))}
      </div>

      <ul className="ern-revela mt-16 grid w-full gap-8 text-left [animation-delay:1400ms] sm:grid-cols-2 lg:grid-cols-4">
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

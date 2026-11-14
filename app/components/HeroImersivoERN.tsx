'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { periodoEDA } from '@/lib/saudacaoEDA';
import { useLanguage } from '@/app/components/LanguageProvider';
import IconeIara from '@/app/components/IconeIara';
import { homeTranslations, type HomeTranslation } from '@/lib/i18n/home';
import { MUNICIPIOS_AMAZONAS } from '@/lib/municipiosAmazonasERN';

const NOMES_FAIXA = [...MUNICIPIOS_AMAZONAS].map((m) => m.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'));
// Municípios que já têm roteiro, festa ou página na plataforma.
const DESTAQUES_FAIXA = new Set(['Barcelos', 'Manaus', 'Novo Airão', 'Parintins', 'Santa Isabel do Rio Negro', 'São Gabriel da Cachoeira', 'Presidente Figueiredo', 'Manacapuru', 'Maués', 'Tefé', 'Tabatinga', 'Uarini']);

// ERN_HERO_IMERSIVO_V1
// Abertura do portal: título centralizado, busca atendida pela Iara e destaques.
// A paisagem de fundo é aplicada pela página (envolve também o Concierge).

const textos = {
  PT: {
    placeholder: 'Pergunte à Iara: para onde você quer ir?',
    rotulo: 'Buscar com a Iara',
    buscar: 'Buscar',
    audio: 'Falar com a Iara (áudio)',
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
    audio: 'Talk to Iara (voice)',
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
    audio: 'Hablar con Iara (audio)',
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

// IARA_BUSCA_VIVA_V1: a Iara "conversa" dentro da barra de busca — saúda o
// visitante conforme o período e vai oferecendo caminhos, letra por letra
// (como a recepção do painel da operadora). Buscar com o campo vazio aceita
// a oferta que está na tela.
type FalaBusca = { fala: string; pedido?: string };
function falasBusca(idioma: 'PT' | 'EN' | 'ES'): FalaBusca[] {
  const p = periodoEDA();
  if (idioma === 'EN') return [
    { fala: `${p === 'manha' ? 'Good morning' : p === 'tarde' ? 'Good afternoon' : 'Good evening'}! I am Iara 🌊 Where shall we go?` },
    { fala: 'Name a town in Amazonas and I will fly you there on the map', pedido: 'Show me the towns of Amazonas on the map' },
    { fala: 'Fancy seeing the Meeting of the Waters up close?', pedido: 'Take me to the Meeting of the Waters' },
    { fala: 'Peacock bass fishing in Barcelos, maybe?', pedido: 'I want to fish peacock bass in Barcelos' },
    { fala: 'Shall I tell you the legend of the pink river dolphin?', pedido: 'Tell me the legend of the pink river dolphin' },
  ];
  if (idioma === 'ES') return [
    { fala: `${p === 'manha' ? '¡Buenos días' : p === 'tarde' ? '¡Buenas tardes' : '¡Buenas noches'}! Soy Iara 🌊 ¿A dónde vamos?` },
    { fala: 'Dime una ciudad de Amazonas y te llevo volando en el mapa', pedido: 'Muéstrame las ciudades de Amazonas en el mapa' },
    { fala: '¿Ver el Encuentro de las Aguas de cerca?', pedido: 'Llévame al Encuentro de las Aguas' },
    { fala: '¿Pescar tucunaré en Barcelos?', pedido: 'Quiero pescar tucunaré en Barcelos' },
    { fala: '¿Te cuento la leyenda del boto?', pedido: 'Cuéntame la leyenda del boto' },
  ];
  return [
    { fala: `${p === 'manha' ? 'Bom dia' : p === 'tarde' ? 'Boa tarde' : p === 'noite' ? 'Boa noite' : 'Boa madrugada'}! Eu sou a Iara, a recepcionista da Encantos 🌊` },
    { fala: 'Me conta: o que te trouxe até a Amazônia hoje?', pedido: 'Quero ideias para conhecer a Amazônia' },
    { fala: 'Me diz uma das 62 cidades do Amazonas que eu te levo lá no mapa', pedido: 'Quero conhecer as cidades do Amazonas no mapa' },
    { fala: 'Já provou tacacá, tambaqui na brasa ou x-caboquinho?', pedido: 'Me fala da culinária amazonense' },
    { fala: 'Quer ouvir a lenda do boto que encanta as moças na beira do rio?', pedido: 'Me conta a lenda do boto' },
    { fala: 'Bora ver o Encontro das Águas de pertinho?', pedido: 'Me leva para o Encontro das Águas' },
    { fala: 'Garantido ou Caprichoso? Te conto tudo do Festival de Parintins', pedido: 'Me fala do Festival de Parintins' },
    { fala: 'Pescar tucunaré-açu em Barcelos é sonho de muito pescador…', pedido: 'Quero pescar tucunaré em Barcelos' },
    { fala: 'Artesanato baniwa, piaçava, cerâmica: quer conhecer quem faz?', pedido: 'Quero conhecer o artesanato do Amazonas' },
    { fala: 'Tem operadora de turismo? Te mostro como a plataforma trabalha sozinha por ti', pedido: 'Trabalho com turismo, como a plataforma funciona?' },
  ];
}

// IARA_BUSCA_CALMA_V2: ritmo de recepcionista — cada fala é escrita devagar,
// fica na tela tempo de sobra para ser lida e sai num esmaecer suave (sem
// "apagar" letra por letra). Assim o visitante lê, pensa e responde.
const MS_POR_LETRA = 62;
const PAUSA_PONTUACAO = 420;
const TEMPO_LEITURA = 6200;
const TEMPO_ESMAECER = 700;

function useBuscaViva(falas: FalaBusca[], parado: boolean, padrao: string) {
  const [texto, setTexto] = useState(padrao);
  const [visivel, setVisivel] = useState(true);
  const atual = useRef<FalaBusca | null>(null);
  useEffect(() => {
    if (parado || typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      atual.current = null; setTexto(padrao); setVisivel(true); return;
    }
    let ativo = true;
    let tarefa = 0;
    let i = 0;
    const espera = (ms: number, fn: () => void) => { tarefa = window.setTimeout(() => { if (ativo) fn(); }, ms); };
    function escrever(k: number) {
      const f = falas[i % falas.length];
      atual.current = f;
      setVisivel(true);
      setTexto(f.fala.slice(0, k));
      if (k < f.fala.length) espera(/[.!?,]/.test(f.fala[k - 1] ?? '') ? PAUSA_PONTUACAO : MS_POR_LETRA, () => escrever(k + 1));
      else espera(TEMPO_LEITURA + f.fala.length * 25, esmaecer);
    }
    function esmaecer() {
      setVisivel(false);
      espera(TEMPO_ESMAECER, () => { i += 1; setTexto(''); espera(450, () => escrever(1)); });
    }
    espera(1800, () => escrever(1));
    return () => { ativo = false; window.clearTimeout(tarefa); };
  }, [falas, parado, padrao]);
  return { texto: texto || ' ', visivel, atual };
}

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

// HERO_RIO_NEGRO_SOLIMOES_V1: "do Rio Negro ao Solimões" em dourado, ecoando
// o Encontro das Águas que está ao fundo da Descubra.
function destacarDescricao(texto: string): ReactNode {
  const m = texto.match(/(d[eo]l? R[ií]o Negro a[lo]? Solimões|from the Rio Negro to the Solimões)/);
  if (!m || m.index === undefined) return texto;
  return (
    <>
      {texto.slice(0, m.index)}
      <span className="font-semibold text-[#F4C77E]">{m[0]}</span>
      {texto.slice(m.index + m[0].length)}
    </>
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
  const [focado, setFocado] = useState(false);
  const [temTexto, setTemTexto] = useState(false);
  const [compondo, setCompondo] = useState(false);
  useEffect(() => { if (!termo && !compondo) setTemTexto(false); }, [termo, compondo]);
  const falas = useMemo(() => falasBusca(idioma === 'EN' || idioma === 'ES' ? idioma : 'PT'), [idioma]);
  const busca = useBuscaViva(falas, focado || !!termo || temTexto, t.placeholder);
  const [temMicrofone, setTemMicrofone] = useState(false);
  useEffect(() => {
    setTemMicrofone(typeof window.MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia);
  }, []);

  // IARA_BUSCA_AUDIO_V1: o microfone abre a Iara já gravando (toque = gesto do usuário).
  function falarComIara() {
    window.dispatchEvent(new CustomEvent('iara:abrir', { detail: { audio: true } }));
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    // EDA_IARA_PONTE_V1: a busca principal é atendida pela Iara. A vitrine de
    // destinos é filtrada em silêncio para quem continuar rolando a página.
    // Campo vazio: aceita a oferta que a Iara está mostrando na barra.
    const texto = termo.trim() || busca.atual.current?.pedido || '';
    onFiltrar?.(termo.trim());
    window.dispatchEvent(new CustomEvent('iara:abrir', { detail: texto ? { texto, origem: 'busca' } : {} }));
  }

  return (
    <div className="relative z-10 mx-auto flex max-w-[1180px] flex-col items-center px-5 pb-16 pt-32 text-center md:px-8 md:pb-20 md:pt-40">
      {/* EDA_FAIXA_62_MUNICIPIOS_V1: os 62 municípios do Amazonas rolando devagar
          numa faixa premium — selo fixo à esquerda, nomes em serifa, cidades com
          roteiro na plataforma em dourado. Pausa ao passar o mouse. */}
      <div className="ern-revela eda-faixa-municipios relative w-full max-w-[820px]">
        <p className="sr-only">{`${MUNICIPIOS_AMAZONAS.length} municípios do Amazonas: ${NOMES_FAIXA.join(', ')}`}</p>
        <div aria-hidden="true" className="eda-faixa-moldura">
          <span className="eda-faixa-selo">
            <b>62</b>
            <small>{idioma === 'EN' ? 'towns' : idioma === 'ES' ? 'municipios' : 'municípios'}</small>
          </span>
          <span className="eda-faixa-janela">
            <span className="eda-faixa-trilho">
              {[0, 1].map((copia) => (
                <span key={copia} className="flex shrink-0 items-center">
                  {NOMES_FAIXA.map((nome) => (
                    <span key={`${copia}-${nome}`} className={`eda-faixa-nome ${DESTAQUES_FAIXA.has(nome) ? 'eda-faixa-ouro' : ''}`}>
                      <i className="eda-faixa-losango" />
                      {nome}
                    </span>
                  ))}
                </span>
              ))}
            </span>
          </span>
        </div>
      </div>

      <h1
        aria-label={h.title}
        className="ern-titulo-animado mt-7 max-w-[980px] text-[clamp(2.4rem,6.4vw,5rem)] leading-[1.02] tracking-[-0.045em] text-[#F5F3EA]"
      >
        <TituloAnimado texto={h.title} />
      </h1>

      <p className="ern-revela mt-7 max-w-[640px] text-base leading-7 text-[#DBE3DE] [animation-delay:900ms] md:text-lg md:leading-8">
        {destacarDescricao(h.description)}
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
        {/* IARA_BUSCA_MOBILE_V1 / IARA_BUSCA_SEM_SOMBRA_V2: a fala da Iara fica numa
            camada própria (até 2 linhas no celular). O campo não tem placeholder
            nativo — era ele que deixava uma "sombra" da frase por trás das letras
            digitadas — e a camada some no primeiro toque de tecla, inclusive
            durante a composição do teclado do celular (autocorretor/acentos). */}
        <div className="relative min-w-0 flex-1">
          <input
            id="ern-busca-destino"
            type="text"
            inputMode="search"
            value={termo}
            onChange={(evento) => setTermo(evento.target.value)}
            onInput={(evento) => setTemTexto(evento.currentTarget.value.length > 0)}
            onCompositionStart={() => setCompondo(true)}
            onCompositionEnd={(evento) => { setCompondo(false); setTemTexto(evento.currentTarget.value.length > 0); }}
            onFocus={() => setFocado(true)}
            onBlur={() => setFocado(false)}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={300}
            enterKeyHint="search"
            className="relative z-[1] min-h-[52px] w-full rounded-xl bg-transparent px-3 text-base text-[#F0F0E8] caret-[#F4C77E] focus-visible:outline-none"
          />
          {!termo && !temTexto && !compondo && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 flex items-center px-3 text-left text-[14px] leading-[1.3] text-[#B8C9BF] sm:text-base"
            >
              <span
                className="line-clamp-2 break-words transition-opacity duration-700 ease-out"
                style={{ opacity: focado ? 0.55 : busca.visivel ? 1 : 0 }}
              >
                {focado ? t.placeholder : busca.texto}
              </span>
            </span>
          )}
        </div>
        {temMicrofone && (
          <button
            type="button"
            onClick={falarComIara}
            aria-label={t.audio}
            title={t.audio}
            className={`inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full border border-[#F4C77E]/35 bg-white/[0.04] text-[#F4C77E] transition hover:border-[#F4C77E] hover:bg-[#F4C77E]/10 ${FOCO}`}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        )}
        <button
          type="submit"
          className={`inline-flex min-h-[52px] shrink-0 items-center gap-2 rounded-[14px] bg-gradient-to-b from-[#F7D595] to-[#E3A144] px-4 text-sm sm:px-6 font-bold text-[#07110E] shadow-[inset_0_1px_0_rgb(255_255_255/55%)] transition hover:brightness-105 ${FOCO}`}
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

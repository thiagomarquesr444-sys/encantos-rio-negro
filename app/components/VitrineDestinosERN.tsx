'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/app/components/LanguageProvider';
import {
  destinosParaExibicao,
  normalizarBuscaERN,
  type InteresseERN,
  type RegiaoERN,
} from '@/lib/catalogoDestinosERN';

// ERN_VITRINE_DESTINOS_V1
// Vitrine de destinos da home: abas por região, busca e cartões.
// A classe ern-publico-hero mantém a vitrine escura e imersiva dentro
// do tema claro do portal (ver regras .ern-publico em globals.css).

type Aba = 'todos' | RegiaoERN;

const textos = {
  PT: {
    eyebrow: 'Descubra o território',
    titulo: 'Uma Amazônia que não cabe em um catálogo.',
    descricao: 'Do Baixo ao Alto Rio Negro: rios, arquipélagos, serras, praias, festas e comunidades. Escolha uma região e veja no mapa.',
    abas: { todos: 'Todos', medio: 'Médio Rio Negro', baixo: 'Baixo Rio Negro', alto: 'Alto Rio Negro' },
    interesses: { aguas: 'Águas', natureza: 'Natureza', cultura: 'Cultura', pesca: 'Pesca' },
    verMapa: 'Ver no mapa',
    curadoria: 'Em curadoria',
    semFoto: 'Fotos em curadoria',
    buscaPor: 'Resultados para',
    limpar: 'Limpar busca',
    vazio: 'Nenhum destino encontrado. Tente outro nome ou outra região.',
    explorar: 'Abrir o mapa completo',
    rotuloInteresses: 'Interesses',
    regiaoNomes: { medio: 'Médio Rio Negro', baixo: 'Baixo Rio Negro', alto: 'Alto Rio Negro' },
  },
  EN: {
    eyebrow: 'Discover the territory',
    titulo: 'An Amazon that does not fit in a catalog.',
    descricao: 'From the Lower to the Upper Rio Negro: rivers, archipelagos, mountains, beaches, festivals and communities. Pick a region and see it on the map.',
    abas: { todos: 'All', medio: 'Middle Rio Negro', baixo: 'Lower Rio Negro', alto: 'Upper Rio Negro' },
    interesses: { aguas: 'Waters', natureza: 'Nature', cultura: 'Culture', pesca: 'Fishing' },
    verMapa: 'See on the map',
    curadoria: 'In curation',
    semFoto: 'Photos in curation',
    buscaPor: 'Results for',
    limpar: 'Clear search',
    vazio: 'No destination found. Try another name or region.',
    explorar: 'Open the full map',
    rotuloInteresses: 'Interests',
    regiaoNomes: { medio: 'Middle Rio Negro', baixo: 'Lower Rio Negro', alto: 'Upper Rio Negro' },
  },
  ES: {
    eyebrow: 'Descubre el territorio',
    titulo: 'Una Amazonía que no cabe en un catálogo.',
    descricao: 'Del Bajo al Alto Río Negro: ríos, archipiélagos, sierras, playas, fiestas y comunidades. Elige una región y mírala en el mapa.',
    abas: { todos: 'Todos', medio: 'Medio Río Negro', baixo: 'Bajo Río Negro', alto: 'Alto Río Negro' },
    interesses: { aguas: 'Aguas', natureza: 'Naturaleza', cultura: 'Cultura', pesca: 'Pesca' },
    verMapa: 'Ver en el mapa',
    curadoria: 'En curaduría',
    semFoto: 'Fotos en curaduría',
    buscaPor: 'Resultados para',
    limpar: 'Limpiar búsqueda',
    vazio: 'No se encontró ningún destino. Prueba otro nombre u otra región.',
    explorar: 'Abrir el mapa completo',
    rotuloInteresses: 'Intereses',
    regiaoNomes: { medio: 'Medio Río Negro', baixo: 'Bajo Río Negro', alto: 'Alto Río Negro' },
  },
};

const ABAS: Aba[] = ['todos', 'medio', 'baixo', 'alto'];

const FOCO =
  'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F4C77E]';

export default function VitrineDestinosERN({
  busca,
  onLimparBusca,
}: {
  busca: string;
  onLimparBusca: () => void;
}) {
  const { idioma } = useLanguage();
  const t = textos[idioma];
  const [aba, setAba] = useState<Aba>('todos');

  const destinos = useMemo(() => destinosParaExibicao(idioma), [idioma]);
  const termo = normalizarBuscaERN(busca);

  const contagem = useMemo(() => {
    const total: Record<Aba, number> = { todos: destinos.length, medio: 0, baixo: 0, alto: 0 };
    for (const destino of destinos) total[destino.regiao] += 1;
    return total;
  }, [destinos]);

  const visiveis = destinos.filter((destino) => {
    if (aba !== 'todos' && destino.regiao !== aba) return false;
    if (!termo) return true;
    return normalizarBuscaERN(
      `${destino.titulo} ${destino.local} ${destino.descricao}`,
    ).includes(termo);
  });

  return (
    <section
      id="destinos"
      aria-labelledby="ern-vitrine-destinos-titulo"
      className="ern-publico-hero scroll-mt-24 bg-[#07110E] px-5 py-20 text-[#EDEDE3] md:px-8 md:py-28"
    >
      <div className="mx-auto max-w-[1180px]">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-[640px]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F4C77E]">
              {t.eyebrow}
            </p>
            <h2
              id="ern-vitrine-destinos-titulo"
              className="mt-5 text-[clamp(2rem,4vw,3.25rem)] leading-[1.08] tracking-[-0.035em] text-[#F0F0E8]"
              style={{ fontFamily: 'var(--font-fraunces), serif' }}
            >
              {t.titulo}
            </h2>
          </div>
          <p className="max-w-[440px] text-base leading-7 text-[#B8C9BF]">
            {t.descricao}
          </p>
        </div>

        <div
          role="group"
          aria-label={t.eyebrow}
          className="mt-12 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {ABAS.map((item) => {
            const ativa = item === aba;
            return (
              <button
                key={item}
                type="button"
                aria-pressed={ativa}
                onClick={() => setAba(item)}
                className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition ${FOCO} ${
                  ativa
                    ? 'border-[#E3A144] bg-[#E3A144] text-[#07110E]'
                    : 'border-[#355043] text-[#EDEDE3] hover:border-[#F4C77E]'
                }`}
              >
                {t.abas[item]}
                <span className={ativa ? 'text-[#07110E]/70' : 'text-[#B8C9BF]'}>
                  {contagem[item]}
                </span>
              </button>
            );
          })}
        </div>

        {termo && (
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-[#B8C9BF]" role="status">
            <span>
              {t.buscaPor} <strong className="font-semibold text-[#F0F0E8]">“{busca.trim()}”</strong>
            </span>
            <button
              type="button"
              onClick={onLimparBusca}
              className={`min-h-[36px] rounded-full border border-[#355043] px-3 font-semibold text-[#F4C77E] ${FOCO}`}
            >
              {t.limpar}
            </button>
          </div>
        )}

        {visiveis.length === 0 ? (
          <p className="mt-10 border-t border-[#355043] py-8 text-base text-[#B8C9BF]" role="status">
            {t.vazio}
          </p>
        ) : (
          // ERN_VITRINE_BENTO_V1: grade em mosaico; o primeiro destino ganha destaque.
          <ul className="mt-10 grid auto-rows-[240px] grid-flow-dense gap-4 sm:grid-cols-2 md:auto-rows-[260px] lg:grid-cols-4">
            {visiveis.map((destino, indice) => {
              const destaque = indice === 0;
              const conteudo = (
                <>
                  {destino.imagem ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={destino.imagem}
                      alt={destino.titulo}
                      loading={destaque ? 'eager' : 'lazy'}
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#10231B] text-[#B8C9BF]">
                      <svg aria-hidden="true" width="64" height="32" viewBox="0 0 64 32" fill="none" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M2 12c6-6 10 6 16 0s10 6 16 0 10 6 16 0 10 6 12 2" />
                        <path d="M2 24c6-6 10 6 16 0s10 6 16 0 10 6 16 0 10 6 12 2" stroke="#E3A144" />
                      </svg>
                      <span className="text-xs font-semibold uppercase tracking-[0.14em]">{t.semFoto}</span>
                    </div>
                  )}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-[#05100C] via-[#05100C]/45 to-transparent"
                  />
                  <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                    <span className="rounded-full bg-[#07110E]/70 px-3 py-1 text-xs font-semibold text-[#F4C77E] backdrop-blur-md">
                      {t.regiaoNomes[destino.regiao]}
                    </span>
                    {destino.curadoria ? (
                      <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-[#EDEDE3] backdrop-blur-md">
                        {t.curadoria}
                      </span>
                    ) : (
                      <span
                        aria-hidden="true"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-[#F0F0E8] backdrop-blur-md transition group-hover:bg-[#E3A144] group-hover:text-[#07110E]"
                      >
                        ↗
                      </span>
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#B8C9BF]">{destino.local}</p>
                    <h3
                      className={`mt-1 font-semibold leading-tight tracking-[-0.02em] text-[#F0F0E8] ${destaque ? 'text-3xl md:text-4xl' : 'text-xl'}`}
                    >
                      {destino.titulo}
                    </h3>
                    {destaque && (
                      <p className="mt-2 line-clamp-2 max-w-[460px] text-sm leading-6 text-[#D6DFD9]">
                        {destino.descricao}
                      </p>
                    )}
                    <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={t.rotuloInteresses}>
                      {destino.interesses.map((interesse: InteresseERN) => (
                        <li
                          key={interesse}
                          className="rounded-full border border-white/20 px-2.5 py-0.5 text-[11px] text-[#EDEDE3]"
                        >
                          {t.interesses[interesse]}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              );

              return (
                <li
                  key={destino.id}
                  className={`group relative min-w-0 overflow-hidden rounded-[22px] bg-[#0A1713] ring-1 ring-white/10 transition hover:ring-[#F4C77E]/50 ${
                    destaque ? 'sm:col-span-2 sm:row-span-2' : ''
                  }`}
                >
                  {destino.curadoria ? (
                    <div className="absolute inset-0">{conteudo}</div>
                  ) : (
                    <Link
                      href={destino.href}
                      aria-label={`${t.verMapa}: ${destino.titulo}`}
                      className={`absolute inset-0 block rounded-[22px] ${FOCO}`}
                    >
                      {conteudo}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-12 flex justify-center">
          <Link
            href="/destinos"
            className={`inline-flex min-h-[50px] items-center gap-2 rounded-xl border border-[#E3A144]/50 px-6 text-sm font-semibold text-[#F4C77E] transition hover:bg-[#E3A144]/10 ${FOCO}`}
          >
            {t.explorar} <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

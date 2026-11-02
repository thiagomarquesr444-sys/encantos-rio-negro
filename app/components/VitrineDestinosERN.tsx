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
          className="mt-12 flex gap-2 overflow-x-auto pb-2"
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
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visiveis.map((destino) => (
              <li
                key={destino.id}
                className="group flex min-w-0 flex-col overflow-hidden rounded-[18px] border border-[#355043] bg-[#0A1713] transition hover:border-[#F4C77E]/60"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[#10231B]">
                  {destino.imagem ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={destino.imagem}
                      alt={destino.titulo}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-[#B8C9BF]">
                      <svg aria-hidden="true" width="64" height="32" viewBox="0 0 64 32" fill="none" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M2 12c6-6 10 6 16 0s10 6 16 0 10 6 16 0 10 6 12 2" />
                        <path d="M2 24c6-6 10 6 16 0s10 6 16 0 10 6 16 0 10 6 12 2" stroke="#E3A144" />
                      </svg>
                      <span className="text-xs font-semibold uppercase tracking-[0.14em]">{t.semFoto}</span>
                    </div>
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-[#07110E]/85 px-3 py-1 text-xs font-semibold text-[#F4C77E]">
                    {t.regiaoNomes[destino.regiao]}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div>
                    <h3
                      className="text-2xl leading-tight text-[#F0F0E8]"
                      style={{ fontFamily: 'var(--font-fraunces), serif' }}
                    >
                      {destino.titulo}
                    </h3>
                    <p className="mt-1 text-sm text-[#B8C9BF]">{destino.local}</p>
                  </div>
                  <p className="line-clamp-3 text-sm leading-6 text-[#D6DFD9]">
                    {destino.descricao}
                  </p>
                  <ul className="flex flex-wrap gap-2" aria-label={t.rotuloInteresses}>
                    {destino.interesses.map((interesse: InteresseERN) => (
                      <li
                        key={interesse}
                        className="rounded-full border border-[#355043] px-2.5 py-0.5 text-xs text-[#D6DFD9]"
                      >
                        {t.interesses[interesse]}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-2">
                    {destino.curadoria ? (
                      <span className="inline-flex min-h-[40px] items-center rounded-full bg-[#10231B] px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#B8C9BF]">
                        {t.curadoria}
                      </span>
                    ) : (
                      <Link
                        href={destino.href}
                        className={`inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-[#F4C77E] hover:underline hover:underline-offset-4 ${FOCO}`}
                      >
                        {t.verMapa} <span aria-hidden="true">→</span>
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
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

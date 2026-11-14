'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/app/components/LanguageProvider';
import {
  destinosParaExibicao,
  macroRegiaoERN,
  normalizarBuscaERN,
  type InteresseERN,
  type MacroRegiaoERN,
  type RegiaoERN,
} from '@/lib/catalogoDestinosERN';
import { MUNICIPIOS_AMAZONAS } from '@/lib/municipiosAmazonasERN';
import { acharDestinoIara, destinoParaParametro } from '@/lib/iaraDestinosERN';

// ERN_VITRINE_DESTINOS_V1 → EDA_DESCUBRA_AMAZONAS_V1
// "Descubra o território" agora cobre o Amazonas inteiro. Três filtros
// combináveis: região, as bases do nicho (cultura e artesanato, culinária,
// crendices, floresta preservada, águas e pesca) e os 62 municípios.
// Município sem cartão próprio ganha um cartão "Conhecer com a Iara".

type Aba = 'todos' | MacroRegiaoERN;
type Base = 'todas' | InteresseERN;

const textos = {
  PT: {
    eyebrow: 'Descubra o território',
    titulo: 'Uma Amazônia que não cabe em um catálogo.',
    descricao: 'Dos 62 municípios do Amazonas: cultura e artesanato, culinária, crendices e a floresta preservada que faz o visitante se apaixonar. Filtre por região, tema ou município.',
    abas: { todos: 'Todo o Amazonas', rionegro: 'Rio Negro', solimoes: 'Solimões', 'baixo-amazonas': 'Baixo Amazonas', metropolitana: 'Manaus e entorno' },
    bases: { todas: 'Tudo', cultura: 'Cultura e artesanato', culinaria: 'Culinária', lendas: 'Crendices e lendas', natureza: 'Floresta preservada', aguas: 'Águas', pesca: 'Pesca esportiva' },
    rotuloBases: 'O que você quer sentir',
    rotuloRegioes: 'Regiões do Amazonas',
    municipio: 'Município',
    todosMunicipios: 'Todos os 62 municípios',
    verMapa: 'Ver no mapa',
    curadoria: 'Em curadoria',
    perguntar: 'Perguntar à Iara',
    semFoto: 'Fotos em curadoria',
    buscaPor: 'Resultados para',
    limpar: 'Limpar filtros',
    vazio: 'Ainda não temos cartões com esse filtro — mas a Iara conhece o caminho.',
    explorar: 'Abrir o mapa completo',
    rotuloInteresses: 'Temas',
    conhecer: (m: string) => `Conhecer ${m}`,
    conhecerTexto: (m: string) => `A Iara te leva até ${m} no mapa e conta o que tem de bom por lá: comida, festa, lenda e natureza.`,
    pedido: (m: string) => `Quero conhecer ${m}`,
    resultado: (n: number) => (n === 1 ? '1 experiência' : `${n} experiências`),
    regiaoNomes: { medio: 'Médio Rio Negro', baixo: 'Baixo Rio Negro', alto: 'Alto Rio Negro', solimoes: 'Solimões', 'baixo-amazonas': 'Baixo Amazonas', metropolitana: 'Manaus e entorno', estado: 'Todo o Amazonas' } as Record<RegiaoERN, string>,
  },
  EN: {
    eyebrow: 'Discover the territory',
    titulo: 'An Amazon that does not fit in a catalog.',
    descricao: 'Across the 62 towns of Amazonas: culture and crafts, food, beliefs and the preserved forest that makes visitors fall in love. Filter by region, theme or town.',
    abas: { todos: 'All of Amazonas', rionegro: 'Rio Negro', solimoes: 'Solimões', 'baixo-amazonas': 'Lower Amazon', metropolitana: 'Manaus area' },
    bases: { todas: 'Everything', cultura: 'Culture and crafts', culinaria: 'Food', lendas: 'Beliefs and legends', natureza: 'Preserved forest', aguas: 'Waters', pesca: 'Sport fishing' },
    rotuloBases: 'What do you want to feel',
    rotuloRegioes: 'Regions of Amazonas',
    municipio: 'Town',
    todosMunicipios: 'All 62 towns',
    verMapa: 'See on the map',
    curadoria: 'In curation',
    perguntar: 'Ask Iara',
    semFoto: 'Photos in curation',
    buscaPor: 'Results for',
    limpar: 'Clear filters',
    vazio: 'No cards for this filter yet — but Iara knows the way.',
    explorar: 'Open the full map',
    rotuloInteresses: 'Themes',
    conhecer: (m: string) => `Discover ${m}`,
    conhecerTexto: (m: string) => `Iara flies you to ${m} on the map and tells you what is good there: food, festivals, legends and nature.`,
    pedido: (m: string) => `I want to discover ${m}`,
    resultado: (n: number) => (n === 1 ? '1 experience' : `${n} experiences`),
    regiaoNomes: { medio: 'Middle Rio Negro', baixo: 'Lower Rio Negro', alto: 'Upper Rio Negro', solimoes: 'Solimões', 'baixo-amazonas': 'Lower Amazon', metropolitana: 'Manaus area', estado: 'All of Amazonas' } as Record<RegiaoERN, string>,
  },
  ES: {
    eyebrow: 'Descubre el territorio',
    titulo: 'Una Amazonía que no cabe en un catálogo.',
    descricao: 'De los 62 municipios de Amazonas: cultura y artesanía, culinaria, creencias y la selva preservada que enamora al visitante. Filtra por región, tema o municipio.',
    abas: { todos: 'Todo Amazonas', rionegro: 'Río Negro', solimoes: 'Solimões', 'baixo-amazonas': 'Bajo Amazonas', metropolitana: 'Manaos y alrededores' },
    bases: { todas: 'Todo', cultura: 'Cultura y artesanía', culinaria: 'Culinaria', lendas: 'Creencias y leyendas', natureza: 'Selva preservada', aguas: 'Aguas', pesca: 'Pesca deportiva' },
    rotuloBases: 'Qué quieres sentir',
    rotuloRegioes: 'Regiones de Amazonas',
    municipio: 'Municipio',
    todosMunicipios: 'Los 62 municipios',
    verMapa: 'Ver en el mapa',
    curadoria: 'En curaduría',
    perguntar: 'Preguntar a Iara',
    semFoto: 'Fotos en curaduría',
    buscaPor: 'Resultados para',
    limpar: 'Limpiar filtros',
    vazio: 'Aún no hay tarjetas con este filtro, pero Iara conoce el camino.',
    explorar: 'Abrir el mapa completo',
    rotuloInteresses: 'Temas',
    conhecer: (m: string) => `Conocer ${m}`,
    conhecerTexto: (m: string) => `Iara te lleva a ${m} en el mapa y te cuenta lo mejor de allí: comida, fiestas, leyendas y naturaleza.`,
    pedido: (m: string) => `Quiero conocer ${m}`,
    resultado: (n: number) => (n === 1 ? '1 experiencia' : `${n} experiencias`),
    regiaoNomes: { medio: 'Medio Río Negro', baixo: 'Bajo Río Negro', alto: 'Alto Río Negro', solimoes: 'Solimões', 'baixo-amazonas': 'Bajo Amazonas', metropolitana: 'Manaos y alrededores', estado: 'Todo Amazonas' } as Record<RegiaoERN, string>,
  },
};

const ABAS: Aba[] = ['todos', 'rionegro', 'solimoes', 'baixo-amazonas', 'metropolitana'];
const BASES: Base[] = ['todas', 'cultura', 'culinaria', 'lendas', 'natureza', 'aguas', 'pesca'];

// Ícones de linha das bases (mesmo traço dos marcos regionais).
const ICONES: Record<Base, string> = {
  todas: 'M4 12h16M12 4v16',
  cultura: 'M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.6 7.1 18.2 8 12.7 4 8.8l5.5-.8z',
  culinaria: 'M4 13h16a8 8 0 0 1-16 0zM8 9c0-2 1-2 1-4M12 9c0-2 1-2 1-4M16 9c0-2 1-2 1-4',
  lendas: 'M3 14c3-4 6 4 9 0s6 4 9 0M12 3a4 4 0 0 1 0 8 4 4 0 0 1 0-8z',
  natureza: 'M12 21V11M12 11l-5 5M12 13l5-4M7 8a5 5 0 0 1 10 0c0 3-2 5-5 5s-5-2-5-5z',
  aguas: 'M2 10c3-3 5 3 8 0s5 3 8 0 3 0 4 0M2 16c3-3 5 3 8 0s5 3 8 0 3 0 4 0',
  pesca: 'M3 12c4-5 10-5 14 0-4 5-10 5-14 0zM17 12l4-3v6zM8 11.5h.01',
};

function IconeBase({ base }: { base: Base }) {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONES[base]} />
    </svg>
  );
}

const FOCO =
  'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F4C77E]';

function chamarIara(texto: string) {
  window.dispatchEvent(new CustomEvent('iara:abrir', { detail: { texto } }));
}

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
  const [base, setBase] = useState<Base>('todas');
  const [municipio, setMunicipio] = useState('');

  const destinos = useMemo(() => destinosParaExibicao(idioma), [idioma]);
  const termo = normalizarBuscaERN(busca);
  const municipios = useMemo(
    () => [...MUNICIPIOS_AMAZONAS].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [],
  );

  const contagem = useMemo(() => {
    const total: Record<Aba, number> = { todos: destinos.length, rionegro: 0, solimoes: 0, 'baixo-amazonas': 0, metropolitana: 0 };
    for (const d of destinos) {
      const macro = macroRegiaoERN(d.regiao);
      if (macro) total[macro] += 1;
    }
    return total;
  }, [destinos]);

  const visiveis = destinos.filter((d) => {
    const macro = macroRegiaoERN(d.regiao);
    if (aba !== 'todos' && macro !== aba && d.regiao !== 'estado') return false;
    if (base !== 'todas' && !d.interesses.includes(base)) return false;
    if (municipio && d.municipio && d.municipio !== municipio) return false;
    if (municipio && !d.municipio && base === 'todas') return false;
    if (!termo) return true;
    return normalizarBuscaERN(`${d.titulo} ${d.local} ${d.descricao} ${d.municipio}`).includes(termo);
  });

  const destinoMunicipio = municipio ? acharDestinoIara(municipio) : null;
  const filtrando = aba !== 'todos' || base !== 'todas' || !!municipio || !!termo;
  const limparTudo = () => { setAba('todos'); setBase('todas'); setMunicipio(''); onLimparBusca(); };

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
          <p className="max-w-[460px] text-base leading-7 text-[#B8C9BF]">
            {t.descricao}
          </p>
        </div>

        {/* Painel de filtros — vidro escuro com borda dourada, padrão EDA. */}
        <div className="mt-12 rounded-[26px] border border-[#F4C77E]/20 bg-[linear-gradient(180deg,rgb(16_35_27/70%),rgb(7_17_14/70%))] p-4 shadow-[0_24px_60px_rgb(0_0_0/30%),inset_0_1px_0_rgb(255_255_255/6%)] backdrop-blur-md sm:p-5">
          <div role="group" aria-label={t.rotuloRegioes} className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                      ? 'border-[#E3A144] bg-gradient-to-b from-[#F7D595] to-[#E3A144] text-[#07110E] shadow-[0_8px_20px_rgb(227_161_68/25%)]'
                      : 'border-[#355043] text-[#EDEDE3] hover:border-[#F4C77E]'
                  }`}
                >
                  {t.abas[item]}
                  <span className={ativa ? 'text-[#07110E]/70' : 'text-[#B8C9BF]'}>{contagem[item]}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col gap-4 border-t border-white/10 pt-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B8C9BF]">{t.rotuloBases}</p>
              <div role="group" aria-label={t.rotuloBases} className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-wrap">
                {BASES.map((item) => {
                  const ativa = item === base;
                  return (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={ativa}
                      onClick={() => setBase(item)}
                      className={`inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-full border px-4 text-[13px] font-semibold transition ${FOCO} ${
                        ativa
                          ? 'border-[#F4C77E] bg-[#F4C77E]/15 text-[#F7D595]'
                          : 'border-white/12 bg-white/[0.03] text-[#D6DFD9] hover:border-[#F4C77E]/60 hover:text-[#F7D595]'
                      }`}
                    >
                      <IconeBase base={item} />
                      {t.bases[item]}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex shrink-0 flex-col gap-2 lg:w-[280px]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B8C9BF]">{t.municipio}</span>
              <span className="relative">
                <select
                  value={municipio}
                  onChange={(e) => setMunicipio(e.target.value)}
                  className={`min-h-[44px] w-full appearance-none rounded-full border border-[#355043] bg-[#0A1713] pl-4 pr-10 text-sm font-semibold text-[#F0F0E8] transition hover:border-[#F4C77E] ${FOCO}`}
                >
                  <option value="">{t.todosMunicipios}</option>
                  {municipios.map((m) => (
                    <option key={m.ibge} value={m.nome}>{m.nome}</option>
                  ))}
                </select>
                <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#F4C77E]">▾</span>
              </span>
            </label>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-[#B8C9BF]" role="status">
          <span>{t.resultado(visiveis.length)}</span>
          {termo && (
            <span>
              · {t.buscaPor} <strong className="font-semibold text-[#F0F0E8]">“{busca.trim()}”</strong>
            </span>
          )}
          {filtrando && (
            <button
              type="button"
              onClick={limparTudo}
              className={`min-h-[36px] rounded-full border border-[#355043] px-3 font-semibold text-[#F4C77E] ${FOCO}`}
            >
              {t.limpar}
            </button>
          )}
        </div>

        {/* ERN_VITRINE_BENTO_V1: grade em mosaico; o primeiro cartão ganha destaque. */}
        <ul className="mt-6 grid auto-rows-[240px] grid-flow-dense gap-4 sm:grid-cols-2 md:auto-rows-[260px] lg:grid-cols-4">
          {municipio && (
            <li className="ern-revela-rolagem group relative min-w-0 overflow-hidden rounded-[22px] bg-[radial-gradient(ellipse_at_30%_20%,rgb(244_199_126/22%),transparent_60%),linear-gradient(160deg,#10231B,#07110E)] ring-1 ring-[#F4C77E]/40 sm:col-span-2">
              <button
                type="button"
                onClick={() => chamarIara(t.pedido(municipio))}
                className={`absolute inset-0 flex flex-col justify-end rounded-[22px] p-6 text-left ${FOCO}`}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#F4C77E]">Iara · {t.municipio}</span>
                <span className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.02em] text-[#F0F0E8]" style={{ fontFamily: 'var(--font-fraunces), serif' }}>{t.conhecer(municipio)}</span>
                <span className="mt-2 max-w-[460px] text-sm leading-6 text-[#D6DFD9]">{t.conhecerTexto(municipio)}</span>
                <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-b from-[#F7D595] to-[#E3A144] px-4 py-2 text-sm font-bold text-[#07110E]">
                  {destinoMunicipio ? t.verMapa : t.perguntar} <span aria-hidden="true">→</span>
                </span>
              </button>
              {destinoMunicipio && (
                <Link
                  href={`/destinos?iara=${encodeURIComponent(destinoParaParametro(destinoMunicipio))}`}
                  className={`absolute right-4 top-4 inline-flex h-10 items-center rounded-full bg-white/10 px-4 text-xs font-semibold text-[#F0F0E8] backdrop-blur-md hover:bg-[#E3A144] hover:text-[#07110E] ${FOCO}`}
                >
                  {t.verMapa} ↗
                </Link>
              )}
            </li>
          )}

          {visiveis.map((destino, indice) => {
            const destaque = indice === 0 && !municipio;
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
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[radial-gradient(ellipse_at_50%_30%,rgb(227_161_68/18%),transparent_65%),#10231B] text-[#B8C9BF]">
                    <span className="grid h-14 w-14 place-items-center rounded-full border border-[#F4C77E]/40 text-[#F4C77E]">
                      <IconeBase base={destino.interesses[0] ?? 'todas'} />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em]">{t.semFoto}</span>
                  </div>
                )}
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#05100C] via-[#05100C]/45 to-transparent" />
                <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                  <span className="rounded-full bg-[#07110E]/70 px-3 py-1 text-xs font-semibold text-[#F4C77E] backdrop-blur-md">
                    {t.regiaoNomes[destino.regiao]}
                  </span>
                  {destino.curadoria ? (
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-[#EDEDE3] backdrop-blur-md">
                      {t.perguntar}
                    </span>
                  ) : (
                    <span aria-hidden="true" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-[#F0F0E8] backdrop-blur-md transition group-hover:bg-[#E3A144] group-hover:text-[#07110E]">
                      ↗
                    </span>
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5 text-left">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#B8C9BF]">{destino.local}</p>
                  <h3 className={`mt-1 font-semibold leading-tight tracking-[-0.02em] text-[#F0F0E8] ${destaque ? 'text-3xl md:text-4xl' : 'text-xl'}`}>
                    {destino.titulo}
                  </h3>
                  <p className={`mt-2 max-w-[460px] text-sm leading-6 text-[#D6DFD9] ${destaque ? 'line-clamp-2' : 'line-clamp-2 transition lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100'}`}>
                    {destino.descricao}
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={t.rotuloInteresses}>
                    {destino.interesses.map((interesse: InteresseERN) => (
                      <li key={interesse} className="rounded-full border border-white/20 px-2.5 py-0.5 text-[11px] text-[#EDEDE3]">
                        {t.bases[interesse]}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            );

            return (
              <li
                key={destino.id}
                className={`ern-revela-rolagem group relative min-w-0 overflow-hidden rounded-[22px] bg-[#0A1713] ring-1 ring-white/10 transition hover:ring-[#F4C77E]/50 ${
                  destaque ? 'sm:col-span-2 sm:row-span-2' : ''
                }`}
              >
                {destino.curadoria ? (
                  <button
                    type="button"
                    onClick={() => chamarIara(`${t.pedido(destino.titulo)} (${destino.local})`)}
                    aria-label={`${t.perguntar}: ${destino.titulo}`}
                    className={`absolute inset-0 block rounded-[22px] ${FOCO}`}
                  >
                    {conteudo}
                  </button>
                ) : (
                  <Link href={destino.href} aria-label={`${t.verMapa}: ${destino.titulo}`} className={`absolute inset-0 block rounded-[22px] ${FOCO}`}>
                    {conteudo}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        {visiveis.length === 0 && !municipio && (
          <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-[#355043] py-8 text-base text-[#B8C9BF]" role="status">
            <span>{t.vazio}</span>
            <button
              type="button"
              onClick={() => chamarIara(base !== 'todas' ? t.bases[base] : t.abas[aba])}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-full bg-gradient-to-b from-[#F7D595] to-[#E3A144] px-4 text-sm font-bold text-[#07110E] ${FOCO}`}
            >
              {t.perguntar} →
            </button>
          </div>
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

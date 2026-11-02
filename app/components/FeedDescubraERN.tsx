'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/app/components/LanguageProvider';
import {
  listarCategoriasPublicas,
  listarFeedPublico,
  type CategoriaPublicacao,
  type PublicacaoPublica,
} from '@/lib/redePublica';

const textos = {
  PT: {
    eyebrow: 'A vida no Rio Negro',
    title: 'Histórias de quem vive a Amazônia.',
    description: 'Conheça experiências, novidades e roteiros compartilhados pela Rede EDA.',
    all: 'Explorar a Rede',
    read: 'Ver publicação',
    loading: 'Carregando publicações...',
    empty: 'Novas histórias chegarão em breve.',
    error: 'Não foi possível carregar as publicações.',
    retry: 'Tentar novamente',
    todas: 'Todas',
    verificado: 'Perfil verificado',
    filtro: 'Filtrar por categoria',
  },
  EN: {
    eyebrow: 'Life on the Rio Negro',
    title: 'Stories from those who live in the Amazon.',
    description: 'Discover experiences, news and itineraries shared on the EDA Network.',
    all: 'Explore the network',
    read: 'View post',
    loading: 'Loading posts...',
    empty: 'New stories are coming soon.',
    error: 'Posts could not be loaded.',
    retry: 'Try again',
    todas: 'All',
    verificado: 'Verified profile',
    filtro: 'Filter by category',
  },
  ES: {
    eyebrow: 'La vida en Rio Negro',
    title: 'Historias de quienes viven la Amazonía.',
    description: 'Descubre experiencias, novedades y rutas compartidas en la Red EDA.',
    all: 'Explorar la red',
    read: 'Ver publicación',
    loading: 'Cargando publicaciones...',
    empty: 'Pronto llegarán nuevas historias.',
    error: 'No se pudieron cargar las publicaciones.',
    retry: 'Intentar de nuevo',
    todas: 'Todas',
    verificado: 'Perfil verificado',
    filtro: 'Filtrar por categoría',
  },
};

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro' }
  | { tipo: 'pronto'; itens: PublicacaoPublica[] };

const foco = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a4b12] focus-visible:ring-offset-4';

export default function FeedDescubraERN() {
  const { idioma } = useLanguage();
  const t = textos[idioma];
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  const [tentativa, setTentativa] = useState(0);
  const [categorias, setCategorias] = useState<CategoriaPublicacao[]>([]);
  const [categoriaId, setCategoriaId] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    listarCategoriasPublicas()
      .then(itens => { if (ativo) setCategorias(itens); })
      .catch(() => { if (ativo) setCategorias([]); });
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    let ativo = true;
    setEstado({ tipo: 'carregando' });

    listarFeedPublico(idioma, { limite: 6, categoriaId: categoriaId ?? undefined })
      .then(itens => {
        if (ativo) setEstado({ tipo: 'pronto', itens });
      })
      .catch(() => {
        if (ativo) setEstado({ tipo: 'erro' });
      });

    return () => { ativo = false; };
  }, [idioma, tentativa, categoriaId]);

  return (
    <section
      id="rede"
      aria-labelledby="feed-descubra-titulo"
      className="scroll-mt-28 border-y border-[#d6d2c8]/60 bg-[#f3f1ec] px-5 py-16 text-[#0f1c17] md:px-8 md:py-24"
    >
      <div className="mx-auto max-w-[1180px]">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a4b12]">
              {t.eyebrow}
            </p>
            <h2
              id="feed-descubra-titulo"
              className="mt-4 text-4xl leading-[1.08] tracking-[-0.03em] md:text-5xl"
              style={{ fontFamily: 'var(--font-fraunces), serif' }}
            >
              {t.title}
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#4b5a53]">
              {t.description}
            </p>
          </div>
          <Link href="/rede" className={`inline-flex min-h-12 shrink-0 items-center gap-3 self-start border-b border-[#8a4b12]/40 text-sm font-semibold text-[#8a4b12] ${foco}`}>
            {t.all} <span aria-hidden="true">↗</span>
          </Link>
        </div>

        {categorias.length > 0 && (
          <div role="group" aria-label={t.filtro} className="mt-8 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[{ id: null as string | null, nome: t.todas }, ...categorias.map(c => ({ id: c.id as string | null, nome: c.nome }))].map(opcao => {
              const ativa = opcao.id === categoriaId;
              return (
                <button
                  key={opcao.id ?? 'todas'}
                  type="button"
                  aria-pressed={ativa}
                  onClick={() => setCategoriaId(opcao.id)}
                  className={`min-h-[40px] shrink-0 rounded-full border px-4 text-sm font-semibold transition ${foco} ${ativa ? 'border-[#8a4b12] bg-[#8a4b12] text-[#ffffff]' : 'border-[#d6d2c8] text-[#0f1c17] hover:border-[#8a4b12]'}`}
                >
                  {opcao.nome}
                </button>
              );
            })}
          </div>
        )}

        {estado.tipo === 'carregando' && (
          <p role="status" className="mt-10 text-sm text-[#4b5a53]">{t.loading}</p>
        )}

        {estado.tipo === 'erro' && (
          <div role="alert" className="mt-10 border-t border-[#d6d2c8] py-6">
            <p className="text-sm text-[#4b5a53]">{t.error}</p>
            <button
              type="button"
              onClick={() => setTentativa(valor => valor + 1)}
              className={`mt-4 min-h-11 text-sm font-semibold underline underline-offset-4 ${foco}`}
            >
              {t.retry}
            </button>
          </div>
        )}

        {estado.tipo === 'pronto' && estado.itens.length === 0 && (
          <p role="status" className="mt-10 border-t border-[#d6d2c8] py-6 text-sm text-[#4b5a53]">
            {t.empty}
          </p>
        )}

        {estado.tipo === 'pronto' && estado.itens.length > 0 && (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {estado.itens.map((item, indice) => {
              const midia = item.midias.find(m => m.tipo === 'imagem')
                ?? item.midias.find(m => m.tipo === 'video' && m.thumbnail_url);
              const imagem = midia?.tipo === 'imagem' ? midia.url : midia?.thumbnail_url;
              const href = `/rede/publicacao/${encodeURIComponent(item.slug)}`;

              return (
                <article
                  key={item.id}
                  className="ern-historia ern-revela-rolagem group flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-[#d6d2c8] bg-[#ffffff] shadow-[0_1px_2px_rgb(15_28_23/6%)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgb(15_28_23/12%)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  style={{ animationDelay: `${indice * 55}ms` }}
                >
                  {imagem && (
                    <Link href={href} tabIndex={-1} aria-hidden="true" className="block overflow-hidden bg-[#e8e5dd]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagem}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      />
                    </Link>
                  )}

                  <div className="flex flex-1 flex-col px-5 pb-5">
                  <Link
                    href={`/rede/perfil/${encodeURIComponent(item.autor.slug)}`}
                    className={`mt-4 inline-flex min-h-11 max-w-full items-center text-sm font-semibold hover:underline ${foco}`}
                  >
                    <span className="break-words">{item.autor.nome_publico}</span>
                    {item.autor.verificado && (
                      <span title={t.verificado} aria-label={t.verificado} className="ml-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#13342A] text-[11px] text-[#ffffff]">✓</span>
                    )}
                  </Link>

                  <h3 className="mt-1 break-words text-xl font-semibold leading-snug tracking-[-0.02em]">
                    <Link href={href} className={`hover:underline hover:underline-offset-4 ${foco}`}>
                      {item.titulo}
                    </Link>
                  </h3>

                  {item.resumo && (
                    <p className="mt-4 line-clamp-3 break-words text-sm leading-7 text-[#4b5a53]">
                      {item.resumo}
                    </p>
                  )}

                  <Link href={href} className={`mt-auto inline-flex min-h-11 items-center gap-2 pt-3 text-xs font-semibold text-[#8a4b12] ${foco}`}>
                    {t.read} <span aria-hidden="true">→</span>
                  </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .ern-historia {
          animation: ernHistoriaEntrada 480ms ease-out both;
        }
        @keyframes ernHistoriaEntrada {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ern-historia { animation: none; }
        }
      `}</style>
    </section>
  );
}

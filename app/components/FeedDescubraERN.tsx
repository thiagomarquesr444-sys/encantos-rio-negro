'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/app/components/LanguageProvider';
import {
  listarFeedPublico,
  type PublicacaoPublica,
} from '@/lib/redePublica';

const textos = {
  PT: {
    eyebrow: 'A vida no Rio Negro',
    title: 'Histórias de quem vive a Amazônia.',
    description: 'Conheça experiências, novidades e roteiros compartilhados pela Rede ERN.',
    all: 'Explorar a Rede',
    read: 'Ver publicação',
    loading: 'Carregando publicações...',
    empty: 'Novas histórias chegarão em breve.',
    error: 'Não foi possível carregar as publicações.',
    retry: 'Tentar novamente',
  },
  EN: {
    eyebrow: 'Life on the Rio Negro',
    title: 'Stories from those who live in the Amazon.',
    description: 'Discover experiences, news and itineraries shared on the ERN Network.',
    all: 'Explore the network',
    read: 'View post',
    loading: 'Loading posts...',
    empty: 'New stories are coming soon.',
    error: 'Posts could not be loaded.',
    retry: 'Try again',
  },
  ES: {
    eyebrow: 'La vida en Rio Negro',
    title: 'Historias de quienes viven la Amazonía.',
    description: 'Descubre experiencias, novedades y rutas compartidas en la Red ERN.',
    all: 'Explorar la red',
    read: 'Ver publicación',
    loading: 'Cargando publicaciones...',
    empty: 'Pronto llegarán nuevas historias.',
    error: 'No se pudieron cargar las publicaciones.',
    retry: 'Intentar de nuevo',
  },
};

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro' }
  | { tipo: 'pronto'; itens: PublicacaoPublica[] };

const foco = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#805600] focus-visible:ring-offset-4';

export default function FeedDescubraERN() {
  const { idioma } = useLanguage();
  const t = textos[idioma];
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    setEstado({ tipo: 'carregando' });

    listarFeedPublico(idioma, { limite: 6 })
      .then(itens => {
        if (ativo) setEstado({ tipo: 'pronto', itens });
      })
      .catch(() => {
        if (ativo) setEstado({ tipo: 'erro' });
      });

    return () => { ativo = false; };
  }, [idioma, tentativa]);

  return (
    <section
      id="rede"
      aria-labelledby="feed-descubra-titulo"
      className="scroll-mt-28 border-y border-[#cdba7a]/60 bg-[#fff7db] px-5 py-16 text-[#30260d] md:px-8 md:py-24"
    >
      <div className="mx-auto max-w-[1180px]">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#805600]">
              {t.eyebrow}
            </p>
            <h2
              id="feed-descubra-titulo"
              className="mt-4 text-4xl leading-[1.08] tracking-[-0.03em] md:text-5xl"
              style={{ fontFamily: 'var(--font-fraunces), serif' }}
            >
              {t.title}
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#695727]">
              {t.description}
            </p>
          </div>
          <Link href="/rede" className={`inline-flex min-h-12 shrink-0 items-center gap-3 self-start border-b border-[#805600]/40 text-sm font-semibold text-[#805600] ${foco}`}>
            {t.all} <span aria-hidden="true">↗</span>
          </Link>
        </div>

        {estado.tipo === 'carregando' && (
          <p role="status" className="mt-10 text-sm text-[#695727]">{t.loading}</p>
        )}

        {estado.tipo === 'erro' && (
          <div role="alert" className="mt-10 border-t border-[#cdba7a] py-6">
            <p className="text-sm text-[#695727]">{t.error}</p>
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
          <p role="status" className="mt-10 border-t border-[#cdba7a] py-6 text-sm text-[#695727]">
            {t.empty}
          </p>
        )}

        {estado.tipo === 'pronto' && estado.itens.length > 0 && (
          <div className="mt-10 grid gap-x-7 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
            {estado.itens.map((item, indice) => {
              const midia = item.midias.find(m => m.tipo === 'imagem')
                ?? item.midias.find(m => m.tipo === 'video' && m.thumbnail_url);
              const imagem = midia?.tipo === 'imagem' ? midia.url : midia?.thumbnail_url;
              const href = `/rede#${encodeURIComponent(item.slug)}`;

              return (
                <article
                  key={item.id}
                  className="ern-historia min-w-0 border-b border-[#cdba7a]/70 pb-7"
                  style={{ animationDelay: `${indice * 55}ms` }}
                >
                  {imagem && (
                    <Link href={href} tabIndex={-1} aria-hidden="true" className="block overflow-hidden rounded-lg bg-[#fffcf0]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagem}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="aspect-[4/3] w-full object-contain"
                      />
                    </Link>
                  )}

                  <Link
                    href={`/rede/perfil/${encodeURIComponent(item.autor.slug)}`}
                    className={`mt-5 inline-flex min-h-11 max-w-full items-center text-sm font-semibold hover:underline ${foco}`}
                  >
                    <span className="break-words">{item.autor.nome_publico}</span>
                  </Link>

                  <h3
                    className="mt-2 break-words text-2xl leading-tight"
                    style={{ fontFamily: 'var(--font-fraunces), serif' }}
                  >
                    <Link href={href} className={`hover:underline hover:underline-offset-4 ${foco}`}>
                      {item.titulo}
                    </Link>
                  </h3>

                  {item.resumo && (
                    <p className="mt-4 line-clamp-3 break-words text-sm leading-7 text-[#695727]">
                      {item.resumo}
                    </p>
                  )}

                  <Link href={href} className={`mt-4 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[#805600] ${foco}`}>
                    {t.read} <span aria-hidden="true">→</span>
                  </Link>
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

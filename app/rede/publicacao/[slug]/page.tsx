'use client';
import { MidiaVivenciaERN, CompartilharVivenciaERN } from '@/app/components/VivenciasERN';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import PublicHeader from '@/app/components/PublicHeader';
import { useLanguage } from '@/app/components/LanguageProvider';
import {
  listarFeedPublico,
  type PublicacaoPublica,
} from '@/lib/redePublica';

const textos = {
  PT: {
    back: 'Explorar a Rede',
    loading: 'Carregando publicação...',
    missing: 'Publicação indisponível',
    missingText: 'Este conteúdo não está disponível publicamente.',
    error: 'Não foi possível carregar a publicação.',
    retry: 'Tentar novamente',
    author: 'Conhecer o perfil',
    gallery: 'Imagens da publicação',
    credit: 'Crédito',
    locale: 'pt-BR',
  },
  EN: {
    back: 'Explore the network',
    loading: 'Loading post...',
    missing: 'Post unavailable',
    missingText: 'This content is not publicly available.',
    error: 'The post could not be loaded.',
    retry: 'Try again',
    author: 'View profile',
    gallery: 'Post images',
    credit: 'Credit',
    locale: 'en-US',
  },
  ES: {
    back: 'Explorar la red',
    loading: 'Cargando publicación...',
    missing: 'Publicación no disponible',
    missingText: 'Este contenido no está disponible públicamente.',
    error: 'No se pudo cargar la publicación.',
    retry: 'Intentar de nuevo',
    author: 'Conocer el perfil',
    gallery: 'Imágenes de la publicación',
    credit: 'Crédito',
    locale: 'es-ES',
  },
};

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro' }
  | { tipo: 'ausente' }
  | { tipo: 'pronto'; item: PublicacaoPublica };

const foco = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#805600] focus-visible:ring-offset-4';

export default function PublicacaoRedePage() {
  const { slug } = useParams<{ slug: string }>();
  const { idioma } = useLanguage();
  const t = textos[idioma];
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    setEstado({ tipo: 'carregando' });

    if (
      typeof slug !== 'string' ||
      slug.length > 180 ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    ) {
      setEstado({ tipo: 'ausente' });
      return;
    }

    listarFeedPublico(idioma, { slug, limite: 1 })
      .then(itens => {
        if (!ativo) return;
        setEstado(itens[0]
          ? { tipo: 'pronto', item: itens[0] }
          : { tipo: 'ausente' });
      })
      .catch(() => {
        if (ativo) setEstado({ tipo: 'erro' });
      });

    return () => { ativo = false; };
  }, [slug, idioma, tentativa]);

  const item = estado.tipo === 'pronto' ? estado.item : null;
  const data = item ? new Date(item.publicado_em) : null;
  const imagens = item?.midias ?? [];

  return (
    <div className="min-h-screen bg-[#fff7db] text-[#30260d]">
      <PublicHeader />

      <main className="mx-auto max-w-5xl px-5 pb-16 pt-28 sm:px-8">
        <Link href="/rede" className={`inline-flex min-h-12 items-center gap-3 text-sm font-semibold text-[#805600] ${foco}`}>
          <span aria-hidden="true">←</span> {t.back}
        </Link>

        {estado.tipo === 'carregando' && (
          <p role="status" className="py-16">{t.loading}</p>
        )}

        {estado.tipo === 'erro' && (
          <div role="alert" className="py-16">
            <h1 className="text-2xl font-semibold">{t.error}</h1>
            <button
              type="button"
              onClick={() => setTentativa(valor => valor + 1)}
              className={`mt-6 min-h-12 rounded-xl bg-[#805600] px-5 font-semibold text-white ${foco}`}
            >
              {t.retry}
            </button>
          </div>
        )}

        {estado.tipo === 'ausente' && (
          <section className="py-16">
            <h1 className="text-3xl">{t.missing}</h1>
            <p className="mt-4 text-sm leading-7 text-[#695727]">{t.missingText}</p>
          </section>
        )}

        {item && (
          <article className="pt-8">
            <header className="border-b border-[#cdba7a] pb-8">
              <Link
                href={`/rede/perfil/${encodeURIComponent(item.autor.slug)}`}
                className={`inline-flex min-h-11 items-center text-sm font-semibold text-[#805600] hover:underline ${foco}`}
              >
                {item.autor.nome_publico}
              </Link>

              <h1
                className="mt-4 break-words text-4xl leading-[1.08] tracking-[-0.035em] sm:text-6xl"
                style={{ fontFamily: 'var(--font-fraunces), serif' }}
              >
                {item.titulo}
              </h1>

              {item.resumo && (
                <p className="mt-6 whitespace-pre-wrap break-words text-lg leading-8 text-[#695727]">
                  {item.resumo}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#695727]">
                {item.localidade_texto && <span>{item.localidade_texto}</span>}
                {data && Number.isFinite(data.getTime()) && (
                  <time dateTime={item.publicado_em}>
                    {new Intl.DateTimeFormat(t.locale, {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'America/Manaus',
                    }).format(data)}
                  </time>
                )}
              </div>
            </header>

            {imagens.length > 0 && (
              <section aria-label={t.gallery} className="mt-8 space-y-8">
                {imagens.map((midia, indice) => (
                  <figure key={midia.id}>
                    <MidiaVivenciaERN midia={midia} />
                    {midia.credito && (
                      <figcaption className="mt-3 text-xs leading-6 text-[#695727]">
                        {t.credit}: {midia.credito}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </section>
            )}

            <CompartilharVivenciaERN post={item} />
            {item.destino_slug && (
              <Link
                className="inline-flex min-h-12 items-center rounded-xl border border-[#cdba7a] px-4 py-3"
                href={`/destinos?lugar=${encodeURIComponent(item.destino_slug)}&publicacao=${encodeURIComponent(item.slug)}`}
              >
                {idioma === 'EN' ? 'View on map' : idioma === 'ES' ? 'Ver en el mapa' : 'Ver no mapa'} ↗
              </Link>
            )}
            {item.conteudo && (
              <div className="mx-auto mt-10 max-w-3xl whitespace-pre-wrap break-words text-base leading-8 text-[#30260d] sm:text-lg sm:leading-9">
                {item.conteudo}
              </div>
            )}

            <footer className="mt-12 flex flex-wrap items-center justify-between gap-5 border-t border-[#cdba7a] pt-7">
              <p className="break-words font-semibold">{item.autor.nome_publico}</p>
              <Link
                href={`/rede/perfil/${encodeURIComponent(item.autor.slug)}`}
                className={`inline-flex min-h-12 items-center gap-3 text-sm font-semibold text-[#805600] ${foco}`}
              >
                {t.author} <span aria-hidden="true">↗</span>
              </Link>
            </footer>
          </article>
        )}
      </main>
    </div>
  );
}

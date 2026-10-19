'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/app/components/LanguageProvider';
import {
  listarFeedPublico,
  type PublicacaoPublica,
} from '@/lib/redePublica';

const TAMANHO = 12;
const textos = {
  PT: {
    title: 'Publicações',
    loading: 'Carregando publicações...',
    empty: 'Este perfil ainda não possui publicações disponíveis.',
    error: 'Não foi possível carregar as publicações.',
    retry: 'Tentar novamente',
    more: 'Carregar mais',
    read: 'Ver publicação',
  },
  EN: {
    title: 'Posts',
    loading: 'Loading posts...',
    empty: 'This profile has no available posts yet.',
    error: 'Posts could not be loaded.',
    retry: 'Try again',
    more: 'Load more',
    read: 'View post',
  },
  ES: {
    title: 'Publicaciones',
    loading: 'Cargando publicaciones...',
    empty: 'Este perfil aún no tiene publicaciones disponibles.',
    error: 'No se pudieron cargar las publicaciones.',
    retry: 'Intentar de nuevo',
    more: 'Cargar más',
    read: 'Ver publicación',
  },
};

const foco = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#805600] focus-visible:ring-offset-4';

export default function PublicacoesPerfilERN({
  perfilId,
}: {
  perfilId: string;
}) {
  const { idioma } = useLanguage();
  const t = textos[idioma];
  const [pagina, setPagina] = useState(0);
  const [tentativa, setTentativa] = useState(0);
  const [itens, setItens] = useState<PublicacaoPublica[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [temMais, setTemMais] = useState(false);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(false);

    listarFeedPublico(idioma, {
      autorPerfilId: perfilId,
      deslocamento: pagina * TAMANHO,
      limite: TAMANHO + 1,
    })
      .then(resultado => {
        if (!ativo) return;

        const novos = resultado.slice(0, TAMANHO);

        setItens(anteriores => {
          const base = pagina === 0 ? [] : anteriores;
          const mapa = new Map(base.map(item => [item.id, item]));
          novos.forEach(item => mapa.set(item.id, item));
          return [...mapa.values()];
        });

        setTemMais(resultado.length > TAMANHO);
      })
      .catch(() => {
        if (ativo) setErro(true);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => { ativo = false; };
  }, [perfilId, idioma, pagina, tentativa]);

  return (
    <section
      aria-labelledby="publicacoes-perfil-titulo"
      aria-busy={carregando}
      className="mx-auto mt-12 max-w-6xl px-4 sm:px-6"
    >
      <div className="border-t border-[#cdba7a] pt-8">
        <h2
          id="publicacoes-perfil-titulo"
          className="text-3xl sm:text-4xl"
          style={{ fontFamily: 'var(--font-fraunces), serif' }}
        >
          {t.title}
        </h2>

        {itens.length > 0 && (
          <div className="mt-8 grid gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {itens.map(item => {
              const midia = item.midias.find(m => m.tipo === 'imagem')
                ?? item.midias.find(m => m.thumbnail_url);
              const imagem = midia?.tipo === 'imagem'
                ? midia.url
                : midia?.thumbnail_url;
              const href = `/rede/publicacao/${encodeURIComponent(item.slug)}`;

              return (
                <article key={item.id} className="min-w-0 border-b border-[#cdba7a]/60 pb-6">
                  {imagem && (
                    <div className="overflow-hidden rounded-lg bg-[#fffcf0]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagem}
                        alt={midia?.alt_text ?? ''}
                        loading="lazy"
                        decoding="async"
                        className="aspect-[4/3] w-full object-contain"
                      />
                    </div>
                  )}

                  <h3
                    className="mt-5 break-words text-2xl leading-tight"
                    style={{ fontFamily: 'var(--font-fraunces), serif' }}
                  >
                    <Link href={href} className={`hover:underline ${foco}`}>
                      {item.titulo}
                    </Link>
                  </h3>

                  {item.resumo && (
                    <p className="mt-3 line-clamp-3 break-words text-sm leading-7 text-[#695727]">
                      {item.resumo}
                    </p>
                  )}

                  <Link href={href} className={`mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#805600] ${foco}`}>
                    {t.read} <span aria-hidden="true">→</span>
                  </Link>
                </article>
              );
            })}
          </div>
        )}

        {carregando && (
          <p role="status" className="mt-6 text-sm text-[#695727]">{t.loading}</p>
        )}

        {!carregando && !erro && itens.length === 0 && (
          <p className="mt-6 text-sm leading-7 text-[#695727]">{t.empty}</p>
        )}

        {erro && (
          <div role="alert" className="mt-6">
            <p className="text-sm text-[#695727]">{t.error}</p>
            <button
              type="button"
              disabled={carregando}
              onClick={() => {
                setCarregando(true);
                setTentativa(valor => valor + 1);
              }}
              className={`mt-3 min-h-11 text-sm font-semibold underline ${foco}`}
            >
              {t.retry}
            </button>
          </div>
        )}

        {temMais && !erro && (
          <button
            type="button"
            disabled={carregando}
            onClick={() => {
              setCarregando(true);
              setPagina(valor => valor + 1);
            }}
            className={`mt-8 min-h-12 rounded-xl border border-[#cdba7a] px-6 text-sm font-semibold disabled:opacity-50 ${foco}`}
          >
            {t.more}
          </button>
        )}
      </div>
    </section>
  );
}

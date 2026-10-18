'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import PublicHeader from '@/app/components/PublicHeader';
import { useLanguage } from '@/app/components/LanguageProvider';
import { supabase } from '@/lib/supabase';

type Perfil = {
  id: string;
  slug: string;
  categoria: string;
  nome_publico: string;
  cidade: string;
  uf: string;
  descricao_curta: string | null;
  descricao_completa: string | null;
  logo_url: string | null;
  capa_url: string | null;
  whatsapp: string | null;
  instagram: string | null;
  site: string | null;
  idiomas: string[];
  especialidades: string[];
};

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro' }
  | { tipo: 'ausente' }
  | { tipo: 'pronto'; perfil: Perfil };

const textos = {
  PT: {
    back: 'Explorar a Rede',
    loading: 'Carregando perfil…',
    unavailable: 'Perfil indisponível',
    unavailableText:
      'Este perfil ainda não foi publicado ou não está disponível.',
    error: 'Não foi possível carregar o perfil.',
    retry: 'Tentar novamente',
    operator: 'Operadora de turismo',
    profile: 'Perfil na Rede ERN',
    about: 'Conheça',
    specialties: 'Experiências e especialidades',
    languages: 'Idiomas de atendimento',
    contact: 'Sua próxima experiência começa com uma conversa',
    contactText:
      'Combine roteiro, datas, transporte e condições diretamente com o responsável por este perfil.',
    whatsapp: 'Conversar no WhatsApp',
    website: 'Visitar site',
    instagram: 'Instagram',
    direct:
      'O atendimento e a contratação são realizados diretamente com o anunciante.',
    join: 'Sua operadora também pode fazer parte desta rede.',
    joinLink: 'Conhecer a ERN',
    message:
      'Olá! Encontrei seu perfil na Rede ERN e gostaria de informações sobre suas experiências.',
  },
  EN: {
    back: 'Explore the network',
    loading: 'Loading profile…',
    unavailable: 'Profile unavailable',
    unavailableText:
      'This profile has not been published or is currently unavailable.',
    error: 'The profile could not be loaded.',
    retry: 'Try again',
    operator: 'Tour operator',
    profile: 'ERN Network profile',
    about: 'About',
    specialties: 'Experiences and specialties',
    languages: 'Service languages',
    contact: 'Your next experience starts with a conversation',
    contactText:
      'Discuss itineraries, dates, transport and conditions directly with this profile’s representative.',
    whatsapp: 'Chat on WhatsApp',
    website: 'Visit website',
    instagram: 'Instagram',
    direct:
      'Service and bookings are handled directly by the advertiser.',
    join: 'Your tour company can also be part of this network.',
    joinLink: 'Discover ERN',
    message:
      'Hello! I found your profile on the ERN Network and would like information about your experiences.',
  },
  ES: {
    back: 'Explorar la red',
    loading: 'Cargando perfil…',
    unavailable: 'Perfil no disponible',
    unavailableText:
      'Este perfil aún no se ha publicado o no está disponible.',
    error: 'No se pudo cargar el perfil.',
    retry: 'Intentar de nuevo',
    operator: 'Operadora de turismo',
    profile: 'Perfil en la Red ERN',
    about: 'Conoce',
    specialties: 'Experiencias y especialidades',
    languages: 'Idiomas de atención',
    contact: 'Tu próxima experiencia comienza con una conversación',
    contactText:
      'Consulta itinerarios, fechas, transporte y condiciones directamente con el responsable de este perfil.',
    whatsapp: 'Conversar por WhatsApp',
    website: 'Visitar sitio',
    instagram: 'Instagram',
    direct:
      'La atención y la contratación se realizan directamente con el anunciante.',
    join: 'Tu operadora también puede formar parte de esta red.',
    joinLink: 'Conocer ERN',
    message:
      '¡Hola! Encontré su perfil en la Red ERN y quisiera información sobre sus experiencias.',
  },
};

const FOCO =
  'focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-[#987027] focus-visible:ring-offset-2';

function urlSegura(valor: string | null): string | null {
  if (!valor) return null;

  try {
    const url = new URL(valor);

    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

function ImagemPerfil({
  url,
  alt,
  className,
}: {
  url: string;
  alt: string;
  className: string;
}) {
  const [falhou, setFalhou] = useState(false);

  if (falhou) return null;

  return (
    // URLs públicas do Storage, sem dependência de configuração de domínio.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className={className}
      decoding="async"
      onError={() => setFalhou(true)}
    />
  );
}

export default function PerfilRedePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { idioma } = useLanguage();
  const t = textos[idioma];

  const [estado, setEstado] = useState<Estado>({
    tipo: 'carregando',
  });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    const controller = new AbortController();

    async function carregar() {
      setEstado({ tipo: 'carregando' });

      if (
        typeof slug !== 'string' ||
        slug.length > 180 ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
      ) {
        setEstado({ tipo: 'ausente' });
        return;
      }

      try {
        const { data, error } = await supabase
          .from('perfis_publicos')
          .select(
            'id,slug,categoria,nome_publico,cidade,uf,descricao_curta,descricao_completa,logo_url,capa_url,whatsapp,instagram,site,idiomas,especialidades',
          )
          .eq('slug', slug)
          .eq('publicado', true)
          .abortSignal(controller.signal)
          .maybeSingle();

        if (!ativo) return;
        if (error) throw error;

        setEstado(
          data
            ? { tipo: 'pronto', perfil: data as Perfil }
            : { tipo: 'ausente' },
        );
      } catch {
        if (ativo) setEstado({ tipo: 'erro' });
      }
    }

    void carregar();

    return () => {
      ativo = false;
      controller.abort();
    };
  }, [slug, tentativa]);

  const perfil = estado.tipo === 'pronto' ? estado.perfil : null;
  const capa = urlSegura(perfil?.capa_url ?? null);
  const logo = urlSegura(perfil?.logo_url ?? null);
  const site = urlSegura(perfil?.site ?? null);
  const instagram = urlSegura(perfil?.instagram ?? null);

  const numero = (perfil?.whatsapp ?? '').replace(/\D/g, '');
  const whatsapp = /^[1-9]\d{7,14}$/.test(numero)
    ? `https://wa.me/${numero}?text=${encodeURIComponent(
        `${t.message} (${perfil?.nome_publico ?? ''})`,
      )}`
    : null;

  return (
    <div className="min-h-screen bg-[#F6F5F0] text-[#18352C]">
      <PublicHeader />

      <main className="pb-12 pt-[76px]">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <Link
            href="/rede"
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold ${FOCO}`}
          >
            <span aria-hidden="true">←</span>
            {t.back}
          </Link>
        </div>

        {estado.tipo !== 'pronto' ? (
          <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <div className="rounded-3xl border border-[#18352C]/15 bg-white p-6 sm:p-10">
              {estado.tipo === 'carregando' ? (
                <p role="status">{t.loading}</p>
              ) : estado.tipo === 'erro' ? (
                <div role="alert">
                  <h1 className="text-2xl font-semibold">{t.error}</h1>
                  <button
                    type="button"
                    onClick={() => setTentativa((atual) => atual + 1)}
                    className={`mt-5 min-h-12 rounded-xl bg-[#18352C] px-5 font-semibold text-white ${FOCO}`}
                  >
                    {t.retry}
                  </button>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-semibold">
                    {t.unavailable}
                  </h1>
                  <p className="mt-3 leading-7 text-[#53685F]">
                    {t.unavailableText}
                  </p>
                </>
              )}
            </div>
          </section>
        ) : (
          <>
            <section className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="relative h-52 overflow-hidden rounded-3xl bg-gradient-to-br from-[#163E37] via-[#326B66] to-[#B99A58] sm:h-72 lg:h-96">
                {capa && (
                  <ImagemPerfil
                    key={capa}
                    url={capa}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
              </div>

              <div className="relative px-2 sm:px-7">
                <div className="-mt-10 flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border-4 border-[#F6F5F0] bg-white shadow-lg sm:-mt-14 sm:h-32 sm:w-32">
                  <span aria-hidden="true" className="text-3xl font-semibold text-[#18352C]">
                    {estado.perfil.nome_publico.trim().slice(0, 1)}
                  </span>
                  {logo && (
                    <ImagemPerfil
                      key={logo}
                      url={logo}
                      alt=""
                      className="absolute h-[88px] w-[88px] rounded-[20px] bg-white object-contain sm:h-[120px] sm:w-[120px]"
                    />
                  )}
                </div>

                <div className="mt-5 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#76602D]">
                      {estado.perfil.categoria === 'operadora'
                        ? t.operator
                        : t.profile}
                    </p>
                    <h1
                      className="mt-2 break-words text-3xl leading-tight sm:text-5xl"
                      style={{ fontFamily: 'var(--font-fraunces), serif' }}
                    >
                      {estado.perfil.nome_publico}
                    </h1>
                    <p className="mt-3 text-sm text-[#53685F]">
                      {[estado.perfil.cidade, estado.perfil.uf]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>

                  {whatsapp && (
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex min-h-12 shrink-0 items-center justify-center rounded-2xl bg-[#185943] px-5 text-sm font-bold text-white transition-colors hover:bg-[#114432] ${FOCO}`}
                    >
                      {t.whatsapp} ↗
                    </a>
                  )}
                </div>

                {estado.perfil.descricao_curta && (
                  <p className="mt-5 max-w-3xl whitespace-pre-wrap break-words text-base leading-8 text-[#53685F] sm:text-lg">
                    {estado.perfil.descricao_curta}
                  </p>
                )}
              </div>
            </section>

            <div className="mx-auto mt-8 grid max-w-6xl gap-5 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <section className="min-w-0 rounded-3xl border border-[#18352C]/10 bg-white p-5 sm:p-8">
                <h2
                  className="text-2xl"
                  style={{ fontFamily: 'var(--font-fraunces), serif' }}
                >
                  {t.about} {estado.perfil.nome_publico}
                </h2>

                {(estado.perfil.descricao_completa ||
                  estado.perfil.descricao_curta) && (
                  <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-8 text-[#53685F] sm:text-base">
                    {estado.perfil.descricao_completa ||
                      estado.perfil.descricao_curta}
                  </p>
                )}

                {estado.perfil.especialidades?.length > 0 && (
                  <div className="mt-7 border-t border-[#18352C]/10 pt-6">
                    <h3 className="text-sm font-bold">{t.specialties}</h3>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {estado.perfil.especialidades.map((item, indice) => (
                        <li
                          key={`${item}-${indice}`}
                          className="max-w-full break-words rounded-xl bg-[#EDF3EF] px-3 py-2 text-sm text-[#285343]"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {estado.perfil.idiomas?.length > 0 && (
                  <div className="mt-7 border-t border-[#18352C]/10 pt-6">
                    <h3 className="text-sm font-bold">{t.languages}</h3>
                    <p className="mt-3 break-words text-sm leading-7 text-[#53685F]">
                      {estado.perfil.idiomas.join(' · ')}
                    </p>
                  </div>
                )}
              </section>

              <aside className="min-w-0 self-start rounded-3xl border border-[#18352C]/10 bg-[#EAF0E9] p-5 sm:p-7">
                <h2 className="text-xl font-semibold leading-8">
                  {t.contact}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#53685F]">
                  {t.contactText}
                </p>

                <div className="mt-5 grid gap-3">
                  {whatsapp && (
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex min-h-12 items-center justify-center rounded-xl bg-[#185943] px-4 text-center text-sm font-bold text-white ${FOCO}`}
                    >
                      {t.whatsapp} ↗
                    </a>
                  )}

                  {site && (
                    <a
                      href={site}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex min-h-12 items-center justify-center rounded-xl border border-[#18352C]/20 px-4 text-sm font-semibold ${FOCO}`}
                    >
                      {t.website} ↗
                    </a>
                  )}

                  {instagram && (
                    <a
                      href={instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex min-h-12 items-center justify-center rounded-xl border border-[#18352C]/20 px-4 text-sm font-semibold ${FOCO}`}
                    >
                      {t.instagram} ↗
                    </a>
                  )}
                </div>

                <p className="mt-5 text-xs leading-6 text-[#53685F]">
                  {t.direct}
                </p>
              </aside>
            </div>

            <section className="mx-auto mt-8 max-w-6xl px-4 sm:px-6">
              <div className="flex flex-col justify-between gap-4 rounded-3xl bg-[#18352C] p-6 text-white sm:flex-row sm:items-center sm:p-8">
                <p className="max-w-xl text-lg leading-8">{t.join}</p>
                <Link
                  href="/operadores"
                  className={`inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-[#E3B567] px-5 text-sm font-bold text-[#18352C] ${FOCO}`}
                >
                  {t.joinLink} →
                </Link>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
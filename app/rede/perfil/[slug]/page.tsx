'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import PublicHeader from '@/app/components/PublicHeader';
import LogoERN from '@/app/components/LogoERN';
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

const TEXTOS_EDITORIAL = {
  "PT": {
    "profile": "Editorial oficial ERN",
    "about": "Sobre",
    "specialties": "Temas do editorial",
    "languages": "Idiomas do portal",
    "contact": "Converse com a equipe ERN",
    "contactText": "Fale sobre a plataforma, participação na rede, parcerias ou sugestões de conteúdo.",
    "whatsapp": "Falar com a ERN",
    "website": "Explorar o portal",
    "direct": "Para consultar passeios, valores e reservas, fale diretamente com a operadora responsável na Rede ERN.",
    "join": "Sua operadora merece ser descoberta no Rio Negro.",
    "joinLink": "Conhecer a plataforma",
    "message": "Olá! Encontrei o perfil editorial da ERN e gostaria de falar com a equipe sobre a plataforma."
  },
  "EN": {
    "profile": "Official ERN editorial",
    "about": "About",
    "specialties": "Editorial topics",
    "languages": "Portal languages",
    "contact": "Contact the ERN team",
    "contactText": "Talk to us about the platform, joining the network, partnerships or content suggestions.",
    "whatsapp": "Contact ERN",
    "website": "Explore the portal",
    "direct": "For tours, prices and bookings, contact the responsible tour operator directly on the ERN Network.",
    "join": "Help travelers discover your Rio Negro tour company.",
    "joinLink": "Discover the platform",
    "message": "Hello! I found the ERN editorial profile and would like to contact the team about the platform."
  },
  "ES": {
    "profile": "Editorial oficial ERN",
    "about": "Sobre",
    "specialties": "Temas del editorial",
    "languages": "Idiomas del portal",
    "contact": "Habla con el equipo ERN",
    "contactText": "Consulta sobre la plataforma, la participación en la red, alianzas o sugerencias de contenido.",
    "whatsapp": "Contactar con ERN",
    "website": "Explorar el portal",
    "direct": "Para excursiones, precios y reservas, contacta directamente con la operadora responsable en la Red ERN.",
    "join": "Tu operadora merece ser descubierta en Rio Negro.",
    "joinLink": "Conocer la plataforma",
    "message": "¡Hola! Encontré el perfil editorial de ERN y quisiera hablar con el equipo sobre la plataforma."
  }
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
  const editorialOficial =
    perfil?.id === '6d2be2c2-31f7-4f5a-b62b-db262177bdd3' &&
    perfil.categoria === 'ern_editorial';

  const t = editorialOficial
    ? { ...textos[idioma], ...TEXTOS_EDITORIAL[idioma] }
    : textos[idioma];

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
    <div className="ern-perfil-publico min-h-screen bg-[#F6F5F0] text-[#18352C]">
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
              <div className="relative h-60 overflow-hidden rounded-[10px] bg-gradient-to-br from-[#163E37] via-[#326B66] to-[#B99A58] sm:h-80 lg:h-[440px]">
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
                <div
                  className={`relative -mt-10 flex h-24 w-24 items-center justify-center overflow-hidden border-4 border-[#F6F5F0] bg-white shadow-lg sm:-mt-14 sm:h-32 sm:w-32 ${
                    editorialOficial ? 'rounded-full' : 'rounded-3xl'
                  }`}
                >
                  {editorialOficial ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="flex shrink-0 scale-[0.733333] sm:scale-100">
                        <LogoERN tamanho={120} />
                      </span>
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>

                <div className="ern-perfil-apresentacao mt-6 flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#76602D]">
                      {estado.perfil.categoria === 'operadora'
                        ? t.operator
                        : t.profile}
                    </p>
                    <h1
                      className="mt-3 max-w-3xl break-words text-4xl leading-[1.08] tracking-[-0.035em] sm:text-5xl lg:text-6xl"
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

            <div className="mx-auto mt-12 grid max-w-6xl gap-10 px-4 sm:px-6 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
              <section className="min-w-0 border-t border-[#18352C]/15 py-7 sm:py-9">
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
                          className="max-w-full break-words border-b border-[#987027]/35 px-1 py-2 text-sm text-[#285343]"
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

              <aside className="min-w-0 self-start border-t border-[#18352C]/15 py-7 sm:py-9 lg:border-l lg:border-t-0 lg:pl-8">
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

            <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6">
              <div className="flex flex-col justify-between gap-6 border-y border-[#987027]/30 py-8 text-[#18352C] sm:flex-row sm:items-center sm:py-10">
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

      <style jsx global>{`
        .ern-perfil-publico .ern-perfil-apresentacao {
          animation: ernPerfilApresentacao 550ms ease-out both;
        }

        .ern-perfil-publico .ern-perfil-apresentacao > a {
          animation: ernPerfilAcao 600ms 100ms ease-out both;
        }

        .ern-perfil-publico aside a {
          animation: ernPerfilAcao 500ms ease-out both;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }

        .ern-perfil-publico aside a:nth-child(2) {
          animation-delay: 80ms;
        }

        .ern-perfil-publico aside a:nth-child(3) {
          animation-delay: 160ms;
        }

        @media (hover: hover) and (prefers-reduced-motion: no-preference) {
          .ern-perfil-publico aside a:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgb(24 53 44 / 10%);
          }
        }

        @keyframes ernPerfilApresentacao {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes ernPerfilAcao {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .ern-perfil-publico .ern-perfil-apresentacao,
          .ern-perfil-publico .ern-perfil-apresentacao > a,
          .ern-perfil-publico aside a {
            animation: none;
            transition: none;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
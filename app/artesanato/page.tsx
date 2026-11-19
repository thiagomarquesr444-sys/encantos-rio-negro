'use client';

/*
  EDA_VITRINE_V2 — "Feito na Amazônia": artesanato e produtos de quem vive
  no território. Turismo → Economia criativa → Artesanato → Comunidades → Renda.
  Sem intermediação: conversa no WhatsApp e Pix direto para quem fez.
  O turista escolhe receber pelos Correios ou durante o passeio, por uma operadora.
*/
import '@/app/fablepremium.css';
import '@/app/precos/precos-premium-eda.css';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PublicHeader from '@/app/components/PublicHeader';
import RodapePublicoEDA from '@/app/components/RodapePublicoEDA';
import { useLanguage } from '@/app/components/LanguageProvider';
import { supabase } from '@/lib/supabase';
import RevelarTextoEDA from '@/app/components/RevelarTextoEDA';

type ItemVitrine = {
  id: string;
  titulo: string;
  descricao: string | null;
  preco: number | null;
  foto_url: string;
  maior_18: boolean;
  envia_correios: boolean;
  entrega_passeio: boolean;
  fornecedor: string;
  cidade: string | null;
  atividade: string | null;
  whatsapp: string;
  verificado: boolean;
  pix_titular: string | null;
};

type Filtro = 'todos' | 'Artesanato' | 'Alimentação / refeições' | 'Bebidas / distribuidora';

const TEXTOS = {
  PT: {
    eb: 'Feito na Amazônia',
    titulo: 'Artesanato e sabores de quem vive aqui',
    sub: 'Peças publicadas por artesãos e produtores do Amazonas. Você conversa e paga direto a quem fez: a renda fica inteira na comunidade.',
    cadeia: ['Turismo', 'Economia criativa', 'Artesanato', 'Comunidades', 'Renda'],
    filtros: { todos: 'Tudo', Artesanato: 'Artesanato', 'Alimentação / refeições': 'Alimentos', 'Bebidas / distribuidora': 'Bebidas' },
    cidade: 'Todas as cidades',
    falar: 'Falar com quem fez',
    verMais: 'Ver mais',
    verMenos: 'Ver menos',
    correios: 'Envia pelos Correios',
    passeio: 'Entrega no passeio',
    verificado: 'Artesão verificado',
    pix: 'Pix em nome de',
    maior: 'Venda proibida para menores de 18 anos',
    vazio: 'Ainda não há peças aqui. Volte em breve.',
    erro: 'Não foi possível carregar a vitrine agora.',
    comoTitulo: 'Como comprar',
    como: [
      ['Escolha a peça', 'Toque em "Falar com quem fez" e combine valor e entrega pelo WhatsApp do artesão.'],
      ['Pague direto', 'O Pix vai direto para o artesão. Confira se o nome do recebedor é o que aparece no card.'],
      ['Receba do seu jeito', 'Pelos Correios, em qualquer lugar do Brasil, ou durante o passeio, entregue pela operadora que vai te receber.'],
    ],
    golpe: 'Segurança: pague só ao nome de Pix mostrado na vitrine e fale só pelo WhatsApp do card. Desconfie de outro número ou de outro recebedor. Prazos dos Correios podem variar na seca dos rios.',
    direto: 'A Encantos da Amazônia não vende nem recebe pagamentos: valores, envio e pagamento são combinados direto com quem fez.',
    convite: 'Você é artesão ou produtor? Publique suas peças de graça.',
    cadastrar: 'Quero publicar',
    msg: (t: string, passeio: boolean) =>
      `Olá! Vi "${t}" na Encantos da Amazônia. Ainda está disponível?${passeio ? ' Posso receber durante o meu passeio?' : ''}`,
  },
  EN: {
    eb: 'Made in the Amazon',
    titulo: 'Crafts and flavors from the people who live here',
    sub: 'Pieces published by artisans and producers from Amazonas. You talk and pay the maker directly: all income stays in the community.',
    cadeia: ['Tourism', 'Creative economy', 'Crafts', 'Communities', 'Income'],
    filtros: { todos: 'All', Artesanato: 'Crafts', 'Alimentação / refeições': 'Food', 'Bebidas / distribuidora': 'Drinks' },
    cidade: 'All cities',
    falar: 'Talk to the maker',
    verMais: 'See more',
    verMenos: 'See less',
    correios: 'Ships via Brazilian Post',
    passeio: 'Delivered on your tour',
    verificado: 'Verified artisan',
    pix: 'Pix holder',
    maior: 'Sale prohibited to anyone under 18',
    vazio: 'No pieces here yet. Come back soon.',
    erro: 'Could not load the showcase right now.',
    comoTitulo: 'How to buy',
    como: [
      ['Pick a piece', 'Tap "Talk to the maker" and agree on price and delivery on the artisan\'s WhatsApp.'],
      ['Pay directly', 'Pix goes straight to the artisan. Check that the receiver name matches the one on the card.'],
      ['Receive your way', 'By Brazilian Post anywhere in Brazil, or during your tour, handed over by your tour operator.'],
    ],
    golpe: 'Safety: only pay the Pix holder shown here and only talk through the WhatsApp on the card. Distrust any other number or receiver. Post deadlines may vary during the dry season.',
    direto: 'Encantos da Amazônia does not sell or receive payments: price, shipping and payment are agreed directly with the maker.',
    convite: 'Are you an artisan or producer? Publish your pieces for free.',
    cadastrar: 'I want to publish',
    msg: (t: string, passeio: boolean) =>
      `Hello! I saw "${t}" on Encantos da Amazônia. Is it still available?${passeio ? ' Can I receive it during my tour?' : ''}`,
  },
  ES: {
    eb: 'Hecho en la Amazonía',
    titulo: 'Artesanía y sabores de quien vive aquí',
    sub: 'Piezas publicadas por artesanos y productores de Amazonas. Hablas y pagas directo a quien lo hizo: el ingreso queda en la comunidad.',
    cadeia: ['Turismo', 'Economía creativa', 'Artesanía', 'Comunidades', 'Ingresos'],
    filtros: { todos: 'Todo', Artesanato: 'Artesanía', 'Alimentação / refeições': 'Alimentos', 'Bebidas / distribuidora': 'Bebidas' },
    cidade: 'Todas las ciudades',
    falar: 'Hablar con quien lo hizo',
    verMais: 'Ver más',
    verMenos: 'Ver menos',
    correios: 'Envía por Correos',
    passeio: 'Entrega en el paseo',
    verificado: 'Artesano verificado',
    pix: 'Pix a nombre de',
    maior: 'Venta prohibida a menores de 18 años',
    vazio: 'Aún no hay piezas aquí. Vuelve pronto.',
    erro: 'No fue posible cargar la vitrina ahora.',
    comoTitulo: 'Cómo comprar',
    como: [
      ['Elige la pieza', 'Toca "Hablar con quien lo hizo" y acuerda precio y entrega por el WhatsApp del artesano.'],
      ['Paga directo', 'El Pix va directo al artesano. Verifica que el nombre del receptor sea el del card.'],
      ['Recibe a tu manera', 'Por Correos a todo Brasil, o durante el paseo, entregado por la operadora que te recibe.'],
    ],
    golpe: 'Seguridad: paga solo al titular de Pix mostrado aquí y habla solo por el WhatsApp del card. Desconfía de otro número o receptor. Los plazos de Correos pueden variar en la sequía de los ríos.',
    direto: 'Encantos da Amazônia no vende ni recibe pagos: precio, envío y pago se acuerdan directamente con quien lo hizo.',
    convite: '¿Eres artesano o productor? Publica tus piezas gratis.',
    cadastrar: 'Quiero publicar',
    msg: (t: string, passeio: boolean) =>
      `¡Hola! Vi "${t}" en Encantos da Amazônia. ¿Sigue disponible?${passeio ? ' ¿Puedo recibirlo durante mi paseo?' : ''}`,
  },
} as const;

const PILULA =
  'inline-flex min-h-[40px] items-center justify-center rounded-full border border-white/35 bg-transparent px-4 text-xs font-semibold text-white transition hover:border-white/70';

function IconeSelo() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5 shrink-0">
      <path d="M10 1.8 12.3 3.4l2.8-.1.9 2.6 2.2 1.7-.9 2.6.9 2.6-2.2 1.7-.9 2.6-2.8-.1L10 18.2l-2.3-1.6-2.8.1-.9-2.6-2.2-1.7.9-2.6-.9-2.6 2.2-1.7.9-2.6 2.8.1Z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="m6.8 10.2 2.2 2.1 4.2-4.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ArtesanatoPage() {
  const { idioma } = useLanguage();
  const t = TEXTOS[(idioma === 'EN' || idioma === 'ES' ? idioma : 'PT') as 'PT' | 'EN' | 'ES'];
  const [itens, setItens] = useState<ItemVitrine[] | null>(null);
  const [erro, setErro] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [cidade, setCidade] = useState('');
  const [destaque, setDestaque] = useState('');
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set());

  function alternarDescricao(id: string) {
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  useEffect(() => {
    // Links da Iara: /artesanato?cidade=Barcelos ou /artesanato?peca=<id>
    const q = new URLSearchParams(window.location.search);
    const c = q.get('cidade');
    if (c && c.length <= 60) setCidade(c);
    const p = q.get('peca');
    if (p && /^[0-9a-f-]{36}$/i.test(p)) setDestaque(p);
    let ativo = true;
    supabase.rpc('vitrine_publica_eda', { p_atividade: null, p_limite: 120 }).then(({ data, error }) => {
      if (!ativo) return;
      if (error) setErro(true);
      else setItens((data ?? []) as ItemVitrine[]);
    });
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!destaque || !itens) return;
    document.getElementById(`peca-${destaque}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [destaque, itens]);

  const cidades = useMemo(
    () =>
      Array.from(new Set<string>((itens ?? []).map((i) => (i.cidade ?? '').trim()).filter(Boolean))).sort((a: string, b: string) =>
        a.localeCompare(b, 'pt-BR')
      ),
    [itens]
  );

  const visiveis = useMemo(
    () =>
      (itens ?? []).filter(
        (i) =>
          (filtro === 'todos' || i.atividade === filtro) &&
          (!cidade || (i.cidade ?? '').localeCompare(cidade, 'pt-BR', { sensitivity: 'base' }) === 0)
      ),
    [itens, filtro, cidade]
  );

  function linkWhatsApp(item: ItemVitrine) {
    const digitos = item.whatsapp.replace(/\D/g, '');
    const numero = digitos.length >= 10 && digitos.length <= 11 ? `55${digitos}` : digitos;
    if (numero.length < 12 || numero.length > 13) return null;
    return `https://wa.me/${numero}?text=${encodeURIComponent(t.msg(item.titulo, item.entrega_passeio))}`;
  }

  return (
    <div data-fable="portal" className="min-h-dvh bg-[#07110E] text-[#EDEDE3]">
      <PublicHeader />
      <main className="mx-auto max-w-[1180px] px-3 pb-24 pt-28 sm:px-5 md:px-8 md:pt-40">
        <div className="mx-auto max-w-[760px] text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F4C77E]">{t.eb}</p>
          <h1 className="pr-eda-titulo mt-5 text-[#F0F0E8]"><RevelarTextoEDA texto={t.titulo} /></h1>
          <p className="mt-6 text-base leading-7 text-[#B8C9BF] md:text-lg md:leading-8">{t.sub}</p>
          <ol aria-label={t.eb} className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B8C9BF]">
            {t.cadeia.map((e, i) => (
              <li key={e} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden="true" className="h-px w-4 bg-[#355043]" />}
                <span className={i === t.cadeia.length - 1 ? 'text-[#F0F0E8]' : ''}>{e}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mx-auto mt-10 flex flex-wrap items-center justify-center gap-2">
          {(Object.keys(t.filtros) as Filtro[]).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filtro === f}
              onClick={() => setFiltro(f)}
              className={`${PILULA} ${filtro === f ? 'border-white/80' : 'text-white/70'}`}
            >
              {t.filtros[f]}
            </button>
          ))}
          {cidades.length > 0 && (
            <select
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              aria-label={t.cidade}
              className="min-h-[40px] rounded-full border border-white/35 bg-[#07110E] px-4 text-xs font-semibold text-white"
            >
              <option value="">{t.cidade}</option>
              {cidades.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>

        {erro && <p className="mt-10 text-center text-sm text-red-300">{t.erro}</p>}
        {itens && !visiveis.length && !erro && <p className="mt-10 text-center text-sm text-[#B8C9BF]">{t.vazio}</p>}

        {/* EDA_VITRINE_V3: mesmo padrão dos cards do catálogo de Passeios
            (3 colunas no desktop, 2 no celular, foto 4:3 / 1:1, textos com corte). */}
        <ul className="mx-auto mt-8 grid max-w-[1100px] grid-cols-2 gap-2.5 sm:mt-10 sm:gap-[22px] lg:grid-cols-3">
          {visiveis.map((item) => {
            const wa = linkWhatsApp(item);
            const local = [item.fornecedor, item.cidade].filter(Boolean).join(' · ');
            return (
              <li
                key={item.id}
                id={`peca-${item.id}`}
                className={`group flex scroll-mt-28 flex-col overflow-hidden rounded-[16px] border bg-gradient-to-b from-[#10221b] to-[#0b1813] shadow-[inset_0_1px_0_rgb(255_255_255/5%)] transition duration-300 sm:rounded-[22px] sm:hover:-translate-y-1 sm:hover:border-[#E3A144]/45 sm:hover:shadow-[0_22px_44px_rgb(0_0_0/35%)] motion-reduce:transition-none ${destaque === item.id ? 'border-[#F4C77E]/70' : 'border-[#355043]'}`}
              >
                <div className="relative aspect-square overflow-hidden bg-[#07110E] sm:aspect-[4/3]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.foto_url}
                    alt={item.titulo}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover object-[center_30%] transition duration-700 group-hover:scale-[1.045] motion-reduce:transition-none"
                  />
                  <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[70px] bg-gradient-to-b from-[#040A08]/55 to-transparent" />
                  {item.atividade && (
                    <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm sm:left-3 sm:top-3 sm:text-[11px]">
                      {t.filtros[item.atividade as Filtro] ?? item.atividade}
                    </span>
                  )}
                  {local && (
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-b from-transparent to-[#040A08]/80 px-2.5 pb-2 pt-7 text-[10px] font-semibold tracking-[0.02em] text-white sm:px-3.5 sm:pb-2.5 sm:text-xs">
                      {local}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col px-2.5 pb-2.5 pt-2 sm:px-4 sm:pb-4 sm:pt-3.5">
                  {item.verificado && (
                    <p className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-200">
                      <IconeSelo /> {t.verificado}
                    </p>
                  )}
                  <h2 className="line-clamp-2 min-h-[2.5em] text-[13.5px] font-bold leading-[1.25] text-[#F0F0E8] sm:text-lg">{item.titulo}</h2>
                  {item.descricao && (
                    <>
                      <p
                        id={`desc-${item.id}`}
                        className={`mt-1.5 whitespace-pre-line text-xs leading-[1.55] text-[#B8C9BF] sm:text-sm ${abertos.has(item.id) ? 'block' : 'hidden min-h-[3.1em] sm:line-clamp-2'}`}
                      >
                        {item.descricao}
                      </p>
                      <button
                        type="button"
                        aria-expanded={abertos.has(item.id)}
                        aria-controls={`desc-${item.id}`}
                        onClick={() => alternarDescricao(item.id)}
                        className="mt-1 self-start text-[11px] font-semibold text-[#F4C77E] underline-offset-4 hover:underline sm:text-xs"
                      >
                        {abertos.has(item.id) ? t.verMenos : t.verMais}
                      </button>
                    </>
                  )}
                  <div className="mt-auto pt-2.5 sm:pt-3.5">
                    <p className="text-[15px] font-bold text-[#F4C77E] sm:text-[19px]">
                      {item.preco !== null
                        ? Number(item.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : '—'}
                    </p>
                    {item.pix_titular && (
                      <p className="mt-0.5 truncate text-[10px] leading-4 text-[#B8C9BF]" title={item.pix_titular}>
                        {t.pix}: <span className="text-[#EDEDE3]">{item.pix_titular}</span>
                      </p>
                    )}
                    {(item.envia_correios || item.entrega_passeio || item.maior_18) && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.envia_correios && (
                          <span className="rounded-full border border-[#355043] px-2 py-0.5 text-[10px] text-[#B8C9BF]">{t.correios}</span>
                        )}
                        {item.entrega_passeio && (
                          <span className="rounded-full border border-[#355043] px-2 py-0.5 text-[10px] text-[#B8C9BF]">{t.passeio}</span>
                        )}
                        {item.maior_18 && (
                          <span className="rounded-full border border-red-400/40 px-2 py-0.5 text-[10px] text-red-300" title={t.maior} aria-label={t.maior}>18+</span>
                        )}
                      </div>
                    )}
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer" className={`${PILULA} mt-2.5 w-full !min-h-[36px] !px-2 text-[11px] sm:mt-3 sm:!min-h-[40px] sm:text-xs`}>
                        {t.falar}
                      </a>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <section aria-labelledby="como-comprar" className="mx-auto mt-14 max-w-[980px]">
          <h2 id="como-comprar" className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#F4C77E]">{t.comoTitulo}</h2>
          <ol className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-4">
            {t.como.map(([titulo, texto], i) => (
              <li key={titulo} className="rounded-[18px] border border-[#355043] bg-[#0A1713] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B8C9BF]">{String(i + 1).padStart(2, '0')}</p>
                <p className="mt-1 text-sm font-semibold text-[#F0F0E8]">{titulo}</p>
                <p className="mt-1 text-xs leading-5 text-[#B8C9BF]">{texto}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-[14px] border border-[#355043] px-4 py-3 text-xs leading-5 text-[#B8C9BF]">{t.golpe}</p>
        </section>

        <p className="mx-auto mt-10 max-w-[640px] text-center text-xs leading-6 text-[#B8C9BF]">{t.direto}</p>
        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-[#EDEDE3]">{t.convite}</p>
          <Link href="/acesso?acesso=fornecedor" className={PILULA}>
            {t.cadastrar}
          </Link>
        </div>
      </main>
      <RodapePublicoEDA />
    </div>
  );
}

'use client';

/*
  EDA_VITRINE_V1 — "Feito na Amazônia": artesanato e produtos de quem vive
  no território. Sem intermediação: o contato e a compra são direto com quem fez.
*/
import '@/app/fablepremium.css';
import '@/app/precos/precos-premium-eda.css';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PublicHeader from '@/app/components/PublicHeader';
import RodapePublicoEDA from '@/app/components/RodapePublicoEDA';
import { useLanguage } from '@/app/components/LanguageProvider';
import { supabase } from '@/lib/supabase';

type ItemVitrine = {
  id: string;
  titulo: string;
  descricao: string | null;
  preco: number | null;
  foto_url: string;
  maior_18: boolean;
  envia_correios: boolean;
  fornecedor: string;
  cidade: string | null;
  atividade: string | null;
  whatsapp: string;
};

type Filtro = 'todos' | 'Artesanato' | 'Alimentação / refeições' | 'Bebidas / distribuidora';

const TEXTOS = {
  PT: {
    eb: 'Feito na Amazônia',
    titulo: 'Artesanato e sabores de quem vive aqui',
    sub: 'Peças e produtos publicados por artesãos e fornecedores do Amazonas. A compra é direta com quem fez: a renda fica inteira na comunidade.',
    filtros: { todos: 'Tudo', Artesanato: 'Artesanato', 'Alimentação / refeições': 'Alimentos', 'Bebidas / distribuidora': 'Bebidas' },
    falar: 'Falar com quem fez',
    correios: 'Envia pelos Correios',
    maior: 'Venda proibida para menores de 18 anos',
    vazio: 'Ainda não há peças nesta categoria. Volte em breve.',
    erro: 'Não foi possível carregar a vitrine agora.',
    direto: 'A Encantos da Amazônia não vende nem recebe pagamentos: valores, envio e pagamento são combinados direto com o fornecedor.',
    convite: 'Você é artesão ou fornecedor? Publique suas peças de graça.',
    cadastrar: 'Quero publicar',
    msg: (t: string) => `Olá! Vi "${t}" na Encantos da Amazônia. Ainda está disponível?`,
  },
  EN: {
    eb: 'Made in the Amazon',
    titulo: 'Crafts and flavors from the people who live here',
    sub: 'Pieces and products published by artisans and suppliers from Amazonas. You buy directly from the maker: all income stays in the community.',
    filtros: { todos: 'All', Artesanato: 'Crafts', 'Alimentação / refeições': 'Food', 'Bebidas / distribuidora': 'Drinks' },
    falar: 'Talk to the maker',
    correios: 'Ships via Brazilian Post',
    maior: 'Sale prohibited to anyone under 18',
    vazio: 'No pieces in this category yet. Come back soon.',
    erro: 'Could not load the showcase right now.',
    direto: 'Encantos da Amazônia does not sell or receive payments: price, shipping and payment are agreed directly with the supplier.',
    convite: 'Are you an artisan or supplier? Publish your pieces for free.',
    cadastrar: 'I want to publish',
    msg: (t: string) => `Hello! I saw "${t}" on Encantos da Amazônia. Is it still available?`,
  },
  ES: {
    eb: 'Hecho en la Amazonía',
    titulo: 'Artesanía y sabores de quien vive aquí',
    sub: 'Piezas y productos publicados por artesanos y proveedores de Amazonas. La compra es directa con quien lo hizo: el ingreso queda en la comunidad.',
    filtros: { todos: 'Todo', Artesanato: 'Artesanía', 'Alimentação / refeições': 'Alimentos', 'Bebidas / distribuidora': 'Bebidas' },
    falar: 'Hablar con quien lo hizo',
    correios: 'Envía por Correos',
    maior: 'Venta prohibida a menores de 18 años',
    vazio: 'Aún no hay piezas en esta categoría. Vuelve pronto.',
    erro: 'No fue posible cargar la vitrina ahora.',
    direto: 'Encantos da Amazônia no vende ni recibe pagos: precio, envío y pago se acuerdan directamente con el proveedor.',
    convite: '¿Eres artesano o proveedor? Publica tus piezas gratis.',
    cadastrar: 'Quiero publicar',
    msg: (t: string) => `¡Hola! Vi "${t}" en Encantos da Amazônia. ¿Sigue disponible?`,
  },
} as const;

export default function ArtesanatoPage() {
  const { idioma } = useLanguage();
  const t = TEXTOS[(idioma === 'EN' || idioma === 'ES' ? idioma : 'PT') as 'PT' | 'EN' | 'ES'];
  const [itens, setItens] = useState<ItemVitrine[] | null>(null);
  const [erro, setErro] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('todos');

  useEffect(() => {
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

  const visiveis = useMemo(
    () => (itens ?? []).filter((i) => filtro === 'todos' || i.atividade === filtro),
    [itens, filtro]
  );

  function linkWhatsApp(item: ItemVitrine) {
    const numero = item.whatsapp.length >= 10 && item.whatsapp.length <= 11 ? `55${item.whatsapp}` : item.whatsapp;
    if (numero.length < 12) return null;
    return `https://wa.me/${numero}?text=${encodeURIComponent(t.msg(item.titulo))}`;
  }

  return (
    <div data-fable="portal" className="min-h-dvh bg-[#07110E] text-[#EDEDE3]">
      <PublicHeader />
      <main className="mx-auto max-w-[1180px] px-3 pb-24 pt-28 sm:px-5 md:px-8 md:pt-40">
        <div className="mx-auto max-w-[760px] text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F4C77E]">{t.eb}</p>
          <h1 className="pr-eda-titulo mt-5 text-[#F0F0E8]">{t.titulo}</h1>
          <p className="mt-6 text-base leading-7 text-[#B8C9BF] md:text-lg md:leading-8">{t.sub}</p>
        </div>

        <div role="group" aria-label={t.eb} className="mx-auto mt-10 flex w-fit flex-wrap justify-center gap-1 rounded-full border border-[#355043] bg-[#0A1713] p-1">
          {(Object.keys(t.filtros) as Filtro[]).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filtro === f}
              onClick={() => setFiltro(f)}
              className={`min-h-[40px] rounded-full px-4 text-sm font-semibold transition ${filtro === f ? 'bg-[#E3A144] text-[#07110E]' : 'text-[#B8C9BF] hover:text-[#F0F0E8]'}`}
            >
              {t.filtros[f]}
            </button>
          ))}
        </div>

        {erro && <p className="mt-10 text-center text-sm text-red-300">{t.erro}</p>}
        {itens && !visiveis.length && !erro && <p className="mt-10 text-center text-sm text-[#B8C9BF]">{t.vazio}</p>}

        <ul className="mt-8 grid grid-cols-2 gap-2.5 sm:mt-10 sm:gap-5 lg:grid-cols-4">
          {visiveis.map((item) => {
            const wa = linkWhatsApp(item);
            return (
              <li key={item.id} className="pr-eda-card flex flex-col overflow-hidden rounded-[18px] border border-[#355043] bg-[#0A1713]">
                <img src={item.foto_url} alt={item.titulo} loading="lazy" className="aspect-square w-full object-cover" />
                <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F4C77E]">
                    {[item.fornecedor, item.cidade].filter(Boolean).join(' · ')}
                  </p>
                  <h2 className="text-sm font-semibold leading-snug text-[#F0F0E8] sm:text-base">{item.titulo}</h2>
                  {item.preco !== null && (
                    <p className="text-sm text-[#EDEDE3]">
                      {Number(item.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  )}
                  {item.descricao && <p className="hidden line-clamp-2 text-xs leading-5 text-[#B8C9BF] sm:block">{item.descricao}</p>}
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {item.envia_correios && (
                      <span className="rounded-full border border-[#355043] px-2 py-0.5 text-[10px] text-[#B8C9BF]">{t.correios}</span>
                    )}
                    {item.maior_18 && (
                      <span className="rounded-full border border-red-400/40 px-2 py-0.5 text-[10px] text-red-300">{t.maior}</span>
                    )}
                  </div>
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto inline-flex min-h-[40px] items-center justify-center rounded-xl bg-[#185943] px-3 pt-0 text-xs font-bold text-white hover:bg-[#114432]"
                    >
                      {t.falar} ↗
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mx-auto mt-10 max-w-[640px] text-center text-xs leading-6 text-[#B8C9BF]">{t.direto}</p>
        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-[#EDEDE3]">{t.convite}</p>
          <Link href="/acesso?acesso=fornecedor" className="inline-flex min-h-[44px] items-center rounded-xl border border-[#E3A144]/60 px-5 text-sm font-semibold text-[#F4C77E] hover:bg-[#E3A144]/10">
            {t.cadastrar} →
          </Link>
        </div>
      </main>
      <RodapePublicoEDA />
    </div>
  );
}

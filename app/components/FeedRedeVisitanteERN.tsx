'use client';

// ERN_REDE_VISITANTE_V1

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useLanguage } from './LanguageProvider';
import { redeTranslations, type RedeTranslation } from '@/lib/i18n/rede';
import { supabase } from '@/lib/supabase';
import {
  alternarInteracaoPublicacao, alternarSeguirPerfil, listarCategoriasPublicas,
  listarFeedPublico, listarTerritoriosPublicos, mensagemErroRedePublica, obterEstadoSocialRede,
  type CategoriaPublicacao, type EstadoSocialRede, type PublicacaoPublica,
  type TerritorioPublico, type TipoInteracaoPublicacao,
} from '@/lib/redePublica';
import './FeedRedeVisitanteERN.css';

const PAGE = 12;
const copy = {
  PT: {
    title: 'O Rio Negro acontece aqui.', sub: 'Lugares, histórias e quem faz parte deles.',
    feed: 'Explorar a rede', map: 'Explorar no mapa', experiences: 'Conhecer experiências',
    search: 'Buscar histórias, lugares e experiências', searchButton: 'Buscar', filters: 'Filtrar',
    territory: 'Território', allTerritories: 'Todos os territórios', profiles: 'Quem compartilha na rede',
    more: 'Carregar mais publicações', loading: 'Buscando novas histórias…', end: 'Você chegou às publicações disponíveis nesta busca.',
    auto: 'Carregar ao rolar', read: 'Ver publicação completa', expand: 'Ler mais', collapse: 'Mostrar menos',
    media: 'Mídias da publicação', previous: 'Mídia anterior', next: 'Próxima mídia', credit: 'Crédito',
    mediaError: 'Não foi possível abrir esta mídia.', retryImage: 'Tentar novamente',
    location: 'Explorar este território', plan: 'Planejar uma viagem', join: 'Fazer parte da ERN',
    joinText: 'Você atua na região? Conheça os acessos da rede.', operator: 'Operadora', guide: 'Guia', supplier: 'Fornecedor',
    mapTitle: 'Uma história pode virar viagem.', mapText: 'Continue a descoberta pelos lugares do Rio Negro.',
    emptyTitle: 'Novas conexões começam com uma história.', emptyText: 'Ainda não há publicações disponíveis nesta seleção.',
    selection: 'Sua busca', clear: 'Limpar filtros', refresh: 'Atualizar publicações',
    socialUnavailable: 'As publicações estão disponíveis, mas não foi possível consultar suas interações. Atualize para tentar novamente.',
    metadataUnavailable: 'Os filtros não carregaram por completo. Você pode continuar pelo feed.',
    shareLink: 'Link da publicação', close: 'Fechar aviso', keyboard: 'Navegação por teclado',
    keyboardHelp: 'No feed: Page Down e Page Up alternam publicações. Ctrl + Home volta ao início; Ctrl + End vai aos controles após o feed.',
    privacy: 'Privacidade', terms: 'Termos', footer: 'Encantos Rio Negro · Rede pública',
    newPosts: 'publicações adicionadas', scrollTop: 'Voltar ao início', filterActive: 'Filtros ativos',
  },
  EN: {
    title: 'The Rio Negro happens here.', sub: 'Places, stories and the people behind them.',
    feed: 'Explore the network', map: 'Explore the map', experiences: 'Discover experiences',
    search: 'Search stories, places and experiences', searchButton: 'Search', filters: 'Filter',
    territory: 'Territory', allTerritories: 'All territories', profiles: 'People sharing on the network',
    more: 'Load more posts', loading: 'Finding new stories…', end: 'You have reached the available posts for this search.',
    auto: 'Load while scrolling', read: 'Read full post', expand: 'Read more', collapse: 'Show less',
    media: 'Post media', previous: 'Previous media', next: 'Next media', credit: 'Credit',
    mediaError: 'This media could not be opened.', retryImage: 'Try again',
    location: 'Explore this territory', plan: 'Plan a trip', join: 'Join ERN',
    joinText: 'Do you work in the region? Explore the network access options.', operator: 'Tour operator', guide: 'Guide', supplier: 'Supplier',
    mapTitle: 'A story can become a journey.', mapText: 'Continue discovering the places of the Rio Negro.',
    emptyTitle: 'New connections begin with a story.', emptyText: 'No posts are available for this selection yet.',
    selection: 'Your search', clear: 'Clear filters', refresh: 'Refresh posts',
    socialUnavailable: 'Posts are available, but your interactions could not be checked. Refresh to try again.',
    metadataUnavailable: 'Some filters could not load. You can continue browsing the feed.',
    shareLink: 'Post link', close: 'Close notice', keyboard: 'Keyboard navigation',
    keyboardHelp: 'In the feed: Page Down and Page Up move between posts. Ctrl + Home returns to the beginning; Ctrl + End moves to the controls after the feed.',
    privacy: 'Privacy', terms: 'Terms', footer: 'Encantos Rio Negro · Public network',
    newPosts: 'posts added', scrollTop: 'Back to the beginning', filterActive: 'Active filters',
  },
  ES: {
    title: 'El Río Negro sucede aquí.', sub: 'Lugares, historias y las personas que los hacen posibles.',
    feed: 'Explorar la red', map: 'Explorar el mapa', experiences: 'Conocer experiencias',
    search: 'Buscar historias, lugares y experiencias', searchButton: 'Buscar', filters: 'Filtrar',
    territory: 'Territorio', allTerritories: 'Todos los territorios', profiles: 'Quienes comparten en la red',
    more: 'Cargar más publicaciones', loading: 'Buscando nuevas historias…', end: 'Llegaste a las publicaciones disponibles para esta búsqueda.',
    auto: 'Cargar al desplazarse', read: 'Ver publicación completa', expand: 'Leer más', collapse: 'Mostrar menos',
    media: 'Contenido multimedia', previous: 'Anterior', next: 'Siguiente', credit: 'Crédito',
    mediaError: 'No se pudo abrir este contenido.', retryImage: 'Intentar de nuevo',
    location: 'Explorar este territorio', plan: 'Planear un viaje', join: 'Ser parte de ERN',
    joinText: '¿Trabajas en la región? Conoce los accesos de la red.', operator: 'Operadora', guide: 'Guía', supplier: 'Proveedor',
    mapTitle: 'Una historia puede convertirse en un viaje.', mapText: 'Sigue descubriendo los lugares del Río Negro.',
    emptyTitle: 'Las nuevas conexiones comienzan con una historia.', emptyText: 'Todavía no hay publicaciones disponibles para esta selección.',
    selection: 'Tu búsqueda', clear: 'Limpiar filtros', refresh: 'Actualizar publicaciones',
    socialUnavailable: 'Las publicaciones están disponibles, pero no se pudieron consultar tus interacciones. Actualiza para intentarlo de nuevo.',
    metadataUnavailable: 'Algunos filtros no se cargaron. Puedes seguir explorando el feed.',
    shareLink: 'Enlace de la publicación', close: 'Cerrar aviso', keyboard: 'Navegación por teclado',
    keyboardHelp: 'En el feed: Page Down y Page Up alternan publicaciones. Ctrl + Home vuelve al inicio; Ctrl + End pasa a los controles después del feed.',
    privacy: 'Privacidad', terms: 'Términos', footer: 'Encantos Rio Negro · Red pública',
    newPosts: 'publicaciones añadidas', scrollTop: 'Volver al inicio', filterActive: 'Filtros activos',
  },
};
type Ui = typeof copy.PT;
type IconName = 'heart' | 'save' | 'share' | 'map' | 'compass' | 'search' | 'arrow' | 'filter' | 'go';
const paths: Record<IconName, string> = {
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  save: 'M6 3h12v18l-6-4-6 4V3Z', share: 'M12 16V3m-5 5 5-5 5 5M5 13v8h14v-8',
  map: 'm3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15',
  compass: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-5-4-3 5-5 3 3-5 5-3Z',
  search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6',
  arrow: 'M5 12h14m-6-6 6 6-6 6', filter: 'M4 6h16M7 12h10m-7 6h4',
  go: 'M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12Zm0-15v6m-3-3h6',
};
function Icon({ name, filled = false }: { name: IconName; filled?: boolean }) {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
function emptySocial(): EstadoSocialRede { return { autenticado: false, perfisSeguidos: new Set<string>(), interacoes: {} }; }
const emptyInteraction = { curtida: false, salvo: false, quero_ir: false };
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const postHref = (p: PublicacaoPublica) => `/rede/publicacao/${encodeURIComponent(p.slug)}`;
const profileHref = (p: PublicacaoPublica['autor']) => `/rede/perfil/${encodeURIComponent(p.slug)}`;
function placeName(p: PublicacaoPublica) { return p.localidade_texto || p.territorio?.nome || [p.autor.cidade, p.autor.uf].filter(Boolean).join(' · ') || 'Rio Negro'; }
function mapHref(p: PublicacaoPublica) {
  const local = normalize([p.localidade_texto, p.territorio?.nome, p.autor.cidade].filter(Boolean).join(' '));
  const scene = local.includes('novo airao') ? 'novo-airao' : local.includes('barcelos') ? 'barcelos' : null;
  return scene ? `/destinos?lugar=${scene}` : '/destinos';
}
function publicationDate(value: string, lang: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(lang === 'EN' ? 'en-US' : lang === 'ES' ? 'es-ES' : 'pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Manaus' }).format(date) : '';
}
function Photo({ src, alt, className = '', eager = false, errorText = '' }: { src: string; alt: string; className?: string; eager?: boolean; errorText?: string }) {
  const [error, setError] = useState(false);
  useEffect(() => setError(false), [src]);
  if (error) return <div className={`ern-r-photo-fallback ${className}`} role="img" aria-label={alt}>{errorText || 'ERN'}</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setError(true)} />;
}
function Avatar({ author }: { author: PublicacaoPublica['autor'] }) {
  const words = author.nome_publico.trim().split(/\s+/).filter(Boolean);
  const initials = words.length > 1 ? `${words[0][0]}${words[words.length - 1][0]}` : author.nome_publico.slice(0, 2);
  return <span className="ern-r-avatar">{author.logo_url ? <Photo src={author.logo_url} alt="" errorText={initials.toUpperCase()} /> : initials.toUpperCase()}</span>;
}
function MediaGallery({ post, ui, eager }: { post: PublicacaoPublica; ui: Ui; eager: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [videoErrors, setVideoErrors] = useState<Set<string>>(new Set());
  useEffect(() => {
    const videos = track.current?.querySelectorAll('video');
    if (!videos?.length) return;
    const pause = () => { if (document.hidden) videos.forEach(video => video.pause()); };
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.intersectionRatio < .35) (entry.target as HTMLVideoElement).pause(); });
    }, { threshold: [.35] });
    videos.forEach(video => observer?.observe(video));
    document.addEventListener('visibilitychange', pause);
    return () => { observer?.disconnect(); document.removeEventListener('visibilitychange', pause); videos.forEach(video => video.pause()); };
  }, [post.id, post.midias]);
  if (!post.midias.length) return null;
  const move = (step: number) => {
    const node = track.current;
    if (!node) return;
    const next = Math.max(0, Math.min(post.midias.length - 1, index + step));
    node.scrollTo({ left: node.clientWidth * next, behavior: 'auto' });
  };
  return <div className="ern-r-gallery" role="group" aria-label={`${ui.media}: ${post.titulo}`}>
    <div ref={track} className="ern-r-media-track" onScroll={event => {
      const node = event.currentTarget;
      if (node.clientWidth) setIndex(Math.round(node.scrollLeft / node.clientWidth));
    }}>
      {post.midias.map((media, i) => <figure key={media.id} className="ern-r-media-frame">
        {media.tipo === 'video' ? videoErrors.has(media.id) ? <div role="status" className="ern-r-photo-fallback">{ui.mediaError}</div> : <video controls playsInline preload="none" poster={media.thumbnail_url || undefined} aria-label={media.alt_text?.trim() || post.titulo} onError={() => setVideoErrors(previous => new Set([...previous, media.id]))}><source src={media.url} /></video> : <Photo src={media.url} alt={media.alt_text?.trim() || `${post.titulo} · ${i + 1}`} eager={eager && i === 0} errorText={ui.mediaError} />}
        {media.credito && <figcaption>{ui.credit}: {media.credito}</figcaption>}
      </figure>)}
    </div>
    {post.midias.length > 1 && <><span className="ern-r-media-count" aria-live="off">{index + 1}/{post.midias.length}</span><button type="button" className="ern-r-media-prev" aria-label={ui.previous} disabled={index === 0} onClick={() => move(-1)}>‹</button><button type="button" className="ern-r-media-next" aria-label={ui.next} disabled={index >= post.midias.length - 1} onClick={() => move(1)}>›</button><div className="ern-r-media-dots" aria-hidden="true">{post.midias.map((media, i) => <span key={media.id} data-active={index === i} />)}</div></>}
  </div>;
}
type Ready = { kind: 'ready'; posts: PublicacaoPublica[]; social: EstadoSocialRede; known: Set<string>; offset: number; hasMore: boolean; key: string };
type FeedState = { kind: 'loading' } | { kind: 'error'; message: string } | Ready;
type Notice = { text: string; login?: boolean } | null;

function PostCard({ post, order, total, state, busy, ui, tr, lang, onFollow, onInteract, onShare, shared }: {
  post: PublicacaoPublica; order: number; total: number; state: Ready; busy: Set<string>; ui: Ui; tr: RedeTranslation; lang: string;
  onFollow: (id: string) => Promise<void>; onInteract: (id: string, type: TipoInteracaoPublicacao) => Promise<void>;
  onShare: (post: PublicacaoPublica) => Promise<void>; shared: { id: string; url: string; copied: boolean } | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const interaction = state.social.interacoes[post.id] ?? emptyInteraction;
  const following = state.social.perfisSeguidos.has(post.autor.id);
  const known = state.known.has(post.id);
  const caption = post.resumo?.trim() || post.conteudo?.trim() || '';
  const date = publicationDate(post.publicado_em, lang);
  const category = post.categoria ? (tr.categories as Record<string, string>)[post.categoria.slug] ?? post.categoria.nome : null;
  return <article className="ern-r-post" data-ern-post={post.id} tabIndex={-1} aria-labelledby={`ern-r-title-${post.id}`} aria-describedby={caption ? `ern-r-caption-${post.id}` : undefined} aria-posinset={order + 1} aria-setsize={total}>
    <header className="ern-r-post-header"><Link className="ern-r-author" href={profileHref(post.autor)}><Avatar author={post.autor} /><span className="ern-r-author-name"><strong>{post.autor.nome_publico} {post.autor.verificado && <span className="ern-r-verified" title={tr.feed.verified} aria-label={tr.feed.verified}>✓</span>}</strong><span>{post.autor.categoria === 'ern_editorial' ? tr.feed.editorial : placeName(post)}{date && <> · <time dateTime={post.publicado_em}>{date}</time></>}</span></span></Link>
      {post.autor.categoria !== 'ern_editorial' && <button type="button" className="ern-r-follow" aria-pressed={following} disabled={!known || busy.has(`follow:${post.autor.id}`)} onClick={() => void onFollow(post.autor.id)}>{following ? tr.feed.following : tr.feed.follow}</button>}
    </header>
    <MediaGallery post={post} ui={ui} eager={order === 0} />
    <div className="ern-r-post-body"><div className="ern-r-post-tags">{category && <span>{category}</span>}{post.destaque && <span>{tr.feed.featured}</span>}<Link href={mapHref(post)} aria-label={`${ui.location}: ${placeName(post)}`}><Icon name="go" />{placeName(post)}</Link></div>
      <h2 id={`ern-r-title-${post.id}`}><Link href={postHref(post)}>{post.titulo}</Link></h2>
      {caption && <><p id={`ern-r-caption-${post.id}`} className={expanded ? 'ern-r-caption' : 'ern-r-caption ern-r-clamp'}>{caption}</p>{caption.length > 220 && <button type="button" className="ern-r-read-more" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? ui.collapse : ui.expand}</button>}</>}
      <Link className="ern-r-read-post" href={postHref(post)}>{ui.read} <Icon name="arrow" /></Link>
    </div>
    <footer className="ern-r-post-actions">
      {([{ type: 'curtida', icon: 'heart', label: tr.feed.like }, { type: 'quero_ir', icon: 'go', label: tr.feed.wantGo }, { type: 'salvo', icon: 'save', label: tr.feed.save }] as const).map(action => <button type="button" key={action.type} aria-pressed={interaction[action.type]} disabled={!post.permitir_interacoes || !known || busy.has(`post:${post.id}:${action.type}`)} onClick={() => void onInteract(post.id, action.type)}><Icon name={action.icon} filled={interaction[action.type] && action.type !== 'quero_ir'} /><span>{action.label}</span></button>)}
      <button type="button" className="ern-r-share" onClick={() => void onShare(post)}><Icon name="share" /><span>{shared?.id === post.id && shared.copied ? tr.feed.shared : tr.feed.share}</span></button>
    </footer>
    {shared?.id === post.id && <label className="ern-r-share-field">{ui.shareLink}<input readOnly value={shared.url} onFocus={event => event.currentTarget.select()} /></label>}
  </article>;
}

export default function FeedRedeVisitanteERN() {
  const { idioma } = useLanguage();
  const ui = copy[idioma];
  const tr = redeTranslations[idioma] as RedeTranslation;
  const [state, setState] = useState<FeedState>({ kind: 'loading' });
  const [categories, setCategories] = useState<CategoriaPublicacao[]>([]);
  const [territories, setTerritories] = useState<TerritorioPublico[]>([]);
  const [booted, setBooted] = useState(false);
  const [metadataError, setMetadataError] = useState(false);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [territory, setTerritory] = useState('');
  const [revision, setRevision] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [automatic, setAutomatic] = useState(true);
  const [moreBusy, setMoreBusy] = useState(false);
  const [moreError, setMoreError] = useState('');
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<Notice>(null);
  const [shared, setShared] = useState<{ id: string; url: string; copied: boolean } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const generation = useRef(0);
  const moreLock = useRef<number | null>(null);
  const socialLocks = useRef<Map<string, number>>(new Map());
  const sentinel = useRef<HTMLDivElement>(null);
  const feed = useRef<HTMLDivElement>(null);
  const beforeFeed = useRef<HTMLHeadingElement>(null);
  const afterFeed = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<number | null>(null);
  const authIdentity = useRef<string | null | undefined>(undefined);
  const key = JSON.stringify([idioma, search, category, territory, revision]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [cats, places] = await Promise.allSettled([listarCategoriasPublicas(), listarTerritoriosPublicos()]);
      if (!alive) return;
      const list = places.status === 'fulfilled' ? places.value : [];
      if (cats.status === 'fulfilled') setCategories(cats.value);
      setTerritories(list); setMetadataError(cats.status === 'rejected' || places.status === 'rejected');
      const local = new URL(window.location.href).searchParams.get('local')?.trim().slice(0, 120);
      if (local) {
        const match = list.find(item => normalize(item.nome) === normalize(local));
        if (match) setTerritory(match.id);
        else { setQuery(local); setSearch(local); }
      }
      setBooted(true);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const identity = session?.user.id ?? null;
      if (event === 'INITIAL_SESSION') { authIdentity.current = identity; return; }
      if ((event === 'SIGNED_IN' || event === 'SIGNED_OUT') && identity !== authIdentity.current) {
        authIdentity.current = identity;
        generation.current += 1;
        setRevision(value => value + 1);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!booted) return;
    const gen = ++generation.current;
    moreLock.current = null; socialLocks.current.clear(); pendingFocus.current = null;
    setState({ kind: 'loading' }); setMoreBusy(false); setMoreError(''); setBusy(new Set()); setNotice(null); setShared(null); setAnnouncement('');
    void (async () => {
      try {
        const result = await listarFeedPublico(idioma, { busca: search, categoriaId: category || undefined, territorioId: territory || undefined, limite: PAGE + 1, deslocamento: 0 });
        if (gen !== generation.current) return;
        const posts = [...new Map(result.slice(0, PAGE).map(item => [item.id, item])).values()];
        let social: EstadoSocialRede | null = null;
        try { social = posts.length ? await obterEstadoSocialRede(posts.map(item => item.id)) : emptySocial(); } catch { /* Falha social não oculta conteúdo público. */ }
        if (gen !== generation.current) return;
        setState({ kind: 'ready', posts, social: social ?? emptySocial(), known: new Set(social ? posts.map(item => item.id) : []), offset: PAGE, hasMore: result.length > PAGE, key });
      } catch (error) {
        if (gen === generation.current) setState({ kind: 'error', message: mensagemErroRedePublica(error) });
      }
    })();
    return () => { generation.current += 1; };
  }, [booted, idioma, search, category, territory, revision, key]);

  const loadMore = useCallback(async () => {
    if (state.kind !== 'ready' || !state.hasMore || state.key !== key || moreLock.current !== null) return;
    const gen = generation.current;
    const offset = state.offset;
    moreLock.current = gen; setMoreBusy(true); setMoreError('');
    try {
      const result = await listarFeedPublico(idioma, { busca: search, categoriaId: category || undefined, territorioId: territory || undefined, limite: PAGE + 1, deslocamento: offset });
      if (gen !== generation.current) return;
      const posts = [...new Map(result.slice(0, PAGE).map(item => [item.id, item])).values()];
      let social: EstadoSocialRede | null = null;
      try { if (posts.length) social = await obterEstadoSocialRede(posts.map(item => item.id)); } catch { /* Mantém publicações e sinaliza ações indisponíveis. */ }
      if (gen !== generation.current) return;
      const oldIds = new Set(state.posts.map(item => item.id));
      const added = posts.filter(item => !oldIds.has(item.id)).length;
      setState(previous => {
        if (previous.kind !== 'ready' || previous.key !== key) return previous;
        const merged = new Map(previous.posts.map(item => [item.id, item]));
        posts.forEach(item => merged.set(item.id, item));
        const follows = new Set(previous.social.perfisSeguidos);
        const knownAuthors = new Set(previous.posts.map(item => item.autor.id));
        social?.perfisSeguidos.forEach(id => { if (!knownAuthors.has(id)) follows.add(id); });
        return { ...previous, posts: [...merged.values()], offset: offset + PAGE, hasMore: result.length > PAGE,
          known: new Set([...previous.known, ...(social ? posts.map(item => item.id) : [])]),
          social: social ? { ...previous.social, autenticado: social.autenticado, perfisSeguidos: follows, interacoes: { ...social.interacoes, ...previous.social.interacoes } } : previous.social };
      });
      if (added) setAnnouncement(`${added} ${ui.newPosts}`);
      if (!added && posts.length) setAutomatic(false);
    } catch (error) {
      if (gen === generation.current) { setMoreError(mensagemErroRedePublica(error)); pendingFocus.current = null; }
    } finally {
      if (moreLock.current === gen) moreLock.current = null;
      if (gen === generation.current) setMoreBusy(false);
    }
  }, [state, key, idioma, search, category, territory, ui.newPosts]);

  useEffect(() => {
    if (!automatic || moreBusy || moreError || state.kind !== 'ready' || !state.hasMore || !sentinel.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) void loadMore(); }, { rootMargin: '500px 0px' });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [automatic, moreBusy, moreError, state, loadMore]);

  useEffect(() => {
    if (pendingFocus.current === null || state.kind !== 'ready') return;
    const articles = feed.current?.querySelectorAll<HTMLElement>('[data-ern-post]');
    const target = articles?.[pendingFocus.current];
    if (target) { target.focus(); pendingFocus.current = null; }
    else if (!state.hasMore) { afterFeed.current?.focus(); pendingFocus.current = null; }
  }, [state]);

  const posts = state.kind === 'ready' ? state.posts : [];
  const authors = useMemo(() => [...new Map(posts.map(item => [item.autor.id, item.autor])).values()].slice(0, 10), [posts]);
  const socialMissing = state.kind === 'ready' && state.posts.some(item => !state.known.has(item.id));
  const filtered = Boolean(search || category || territory);

  async function socialAction(lock: string, run: () => Promise<void>) {
    if (socialLocks.current.has(lock)) return;
    const gen = generation.current;
    socialLocks.current.set(lock, gen); setBusy(previous => new Set([...previous, lock])); setNotice(null);
    try { await run(); }
    catch (error) {
      if (gen !== generation.current) return;
      const text = mensagemErroRedePublica(error);
      const followLogin = text === 'Entre na ERN para seguir perfis.';
      const interactionLogin = text === 'Entre na ERN para interagir com publicações.';
      setNotice({ text: followLogin ? tr.feed.followRequired : interactionLogin ? tr.feed.interactionRequired : text, login: followLogin || interactionLogin });
    } finally {
      if (socialLocks.current.get(lock) === gen) socialLocks.current.delete(lock);
      if (gen === generation.current) setBusy(previous => { const next = new Set(previous); next.delete(lock); return next; });
    }
  }
  async function follow(id: string) {
    if (state.kind !== 'ready' || state.key !== key) return;
    const gen = generation.current;
    await socialAction(`follow:${id}`, async () => {
      const next = await alternarSeguirPerfil(id, state.social.perfisSeguidos.has(id));
      if (gen !== generation.current) return;
      setState(previous => {
        if (previous.kind !== 'ready' || previous.key !== key) return previous;
        const follows = new Set(previous.social.perfisSeguidos);
        if (next) follows.add(id); else follows.delete(id);
        return { ...previous, social: { ...previous.social, autenticado: true, perfisSeguidos: follows } };
      });
    });
  }
  async function interact(id: string, type: TipoInteracaoPublicacao) {
    if (state.kind !== 'ready' || state.key !== key) return;
    const post = state.posts.find(item => item.id === id);
    if (!post?.permitir_interacoes || !state.known.has(id)) return;
    const gen = generation.current;
    await socialAction(`post:${id}:${type}`, async () => {
      const next = await alternarInteracaoPublicacao(id, type, (state.social.interacoes[id] ?? emptyInteraction)[type]);
      if (gen !== generation.current) return;
      setState(previous => previous.kind !== 'ready' || previous.key !== key ? previous : { ...previous, social: { ...previous.social, autenticado: true, interacoes: { ...previous.social.interacoes, [id]: { ...(previous.social.interacoes[id] ?? emptyInteraction), [type]: next } } } });
    });
  }
  async function share(post: PublicacaoPublica) {
    const url = `${window.location.origin}${postHref(post)}`;
    const gen = generation.current;
    if (navigator.share) {
      try { await navigator.share({ title: post.titulo, text: post.resumo || undefined, url }); return; }
      catch (error) { if (error instanceof Error && error.name === 'AbortError') return; }
    }
    let copied = false;
    try { await navigator.clipboard.writeText(url); copied = true; } catch { /* Campo permite cópia manual. */ }
    if (gen === generation.current) setShared({ id: post.id, url, copied });
  }
  function clear() {
    setQuery(''); setSearch(''); setCategory(''); setTerritory('');
    const url = new URL(window.location.href);
    if (url.searchParams.has('local')) { url.searchParams.delete('local'); window.history.replaceState(null, '', url); }
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSearch(query.trim()); }
  function feedKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest('input,textarea,select,video,[contenteditable="true"]')) return;
    if (event.ctrlKey && event.key === 'Home') { event.preventDefault(); beforeFeed.current?.focus(); return; }
    if (event.ctrlKey && event.key === 'End') { event.preventDefault(); afterFeed.current?.focus(); return; }
    if (event.ctrlKey || event.altKey || !['PageDown', 'PageUp'].includes(event.key)) return;
    const nodes = [...(feed.current?.querySelectorAll<HTMLElement>('[data-ern-post]') ?? [])];
    const current = target.closest('[data-ern-post]');
    const index = nodes.findIndex(node => node === current);
    if (index < 0) return;
    event.preventDefault();
    const next = index + (event.key === 'PageDown' ? 1 : -1);
    if (nodes[next]) nodes[next].focus();
    else if (next >= nodes.length && state.kind === 'ready' && state.hasMore) { pendingFocus.current = next; void loadMore(); }
    else if (next < 0) beforeFeed.current?.focus();
    else afterFeed.current?.focus();
  }

  return <div className="ern-r-root">
    <a className="ern-r-skip" href="#ern-r-feed-title">{ui.feed}</a>
    <div className="ern-r-layout">
      <aside className="ern-r-left" aria-label="ERN"><div className="ern-r-sticky"><Link className="ern-r-brand" href="/rede"><span className="ern-r-brand-mark"><Icon name="compass" /></span><span>Rede ERN<small>Encantos Rio Negro</small></span></Link><nav className="ern-r-nav"><button type="button" aria-current={!filtered ? 'page' : undefined} onClick={() => { clear(); beforeFeed.current?.focus(); }}><Icon name="compass" />{ui.feed}</button><Link href="/destinos"><Icon name="map" />{ui.map}</Link><Link href="/experiencias"><Icon name="go" />{ui.experiences}</Link></nav><div className="ern-r-left-note"><p>{ui.joinText}</p><Link href="/acesso?acesso=operadora">{ui.operator} ↗</Link><Link href="/acesso?acesso=guia">{ui.guide} ↗</Link><Link href="/acesso?acesso=fornecedor">{ui.supplier} ↗</Link></div><div className="ern-r-legal"><Link href="/privacidade">{ui.privacy}</Link><Link href="/termos">{ui.terms}</Link></div></div></aside>
      <div className="ern-r-main">
        <header className="ern-r-intro"><p>REDE ERN</p><h1 ref={beforeFeed} tabIndex={-1} id="ern-r-feed-title">{ui.title}</h1><span>{ui.sub}</span><nav className="ern-r-mobile-nav"><Link href="/destinos"><Icon name="map" />{ui.map}</Link><Link href="/experiencias">{ui.experiences} ↗</Link></nav></header>
        <div className="ern-r-controls"><form className="ern-r-search" onSubmit={submit}><Icon name="search" /><input type="search" maxLength={120} value={query} onChange={event => setQuery(event.target.value)} placeholder={ui.search} aria-label={ui.search} /><button type="submit" aria-label={ui.searchButton}><Icon name="arrow" /></button></form><button type="button" className="ern-r-filter-button" aria-expanded={showFilters} aria-controls="ern-r-filter-panel" onClick={() => setShowFilters(value => !value)}><Icon name="filter" /><span>{ui.filters}</span>{filtered && <span className="ern-r-filter-dot" aria-label={ui.filterActive} />}</button></div>
        <div id="ern-r-filter-panel" className="ern-r-filter-panel" hidden={!showFilters}><label>{ui.territory}<select value={territory} onChange={event => setTerritory(event.target.value)}><option value="">{ui.allTerritories}</option>{territories.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label><label className="ern-r-auto"><input type="checkbox" checked={automatic} onChange={event => setAutomatic(event.target.checked)} />{ui.auto}</label><button type="button" onClick={() => setRevision(value => value + 1)}>{ui.refresh} ↻</button></div>
        <div className="ern-r-category-strip" aria-label={tr.feed.allCategories}><button type="button" aria-pressed={!category} onClick={() => setCategory('')}>{tr.feed.allCategories}</button>{categories.map(item => <button type="button" key={item.id} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{(tr.categories as Record<string, string>)[item.slug] ?? item.nome}</button>)}</div>
        {filtered && <div className="ern-r-filter-summary"><span>{ui.selection}: {[search, territories.find(item => item.id === territory)?.nome, categories.find(item => item.id === category)?.nome].filter(Boolean).join(' · ')}</span><button type="button" onClick={clear}>{ui.clear} ×</button></div>}
        {metadataError && <p role="status" className="ern-r-inline-notice">{ui.metadataUnavailable}</p>}
        {authors.length > 0 && <section className="ern-r-authors" aria-label={ui.profiles}><div className="ern-r-authors-label">{ui.profiles}</div><div className="ern-r-author-strip">{authors.map(author => <Link key={author.id} href={profileHref(author)}><Avatar author={author} /><span>{author.nome_publico}</span></Link>)}</div></section>}
        {socialMissing && <div role="status" className="ern-r-inline-notice">{ui.socialUnavailable} <button type="button" onClick={() => setRevision(value => value + 1)}>{ui.refresh}</button></div>}
        {state.kind === 'loading' && <div className="ern-r-loading" role="status"><span className="ern-r-loading-mark" aria-hidden="true">≈</span>{ui.loading}</div>}
        {state.kind === 'error' && <section className="ern-r-empty" role="alert"><h2>{tr.feed.errorTitle}</h2><p>{state.message}</p><button type="button" className="ern-r-button" onClick={() => setRevision(value => value + 1)}>{tr.feed.retry}</button></section>}
        {state.kind === 'ready' && !state.posts.length && <section className="ern-r-empty"><h2>{ui.emptyTitle}</h2><p>{ui.emptyText}</p>{filtered && <button type="button" className="ern-r-button" onClick={clear}>{ui.clear}</button>}<Link href="/destinos">{ui.map} ↗</Link></section>}
        <div ref={feed} role="feed" aria-labelledby="ern-r-feed-title" aria-busy={state.kind === 'loading' || moreBusy} className="ern-r-feed" onKeyDown={feedKeyboard}>
          {state.kind === 'ready' && state.posts.map((post, i) => <PostCard key={post.id} post={post} order={i} total={state.hasMore ? -1 : state.posts.length} state={state} busy={busy} ui={ui} tr={tr} lang={idioma} onFollow={follow} onInteract={interact} onShare={share} shared={shared} />)}
        </div>
        <div ref={sentinel} className="ern-r-sentinel" aria-hidden="true" />
        <div ref={afterFeed} tabIndex={-1} className="ern-r-after-feed">
          <span role="status" className="ern-r-sr-only">{announcement}</span>
          {moreError && <p role="alert">{moreError}</p>}
          {moreBusy && <p role="status">{ui.loading}</p>}
          {state.kind === 'ready' && state.hasMore && <button type="button" className="ern-r-button" disabled={moreBusy || state.key !== key} onClick={() => void loadMore()}>{moreError ? tr.feed.retry : ui.more}</button>}
          {state.kind === 'ready' && state.posts.length > 0 && !state.hasMore && <p>{ui.end}</p>}
          <label className="ern-r-auto"><input type="checkbox" checked={automatic} onChange={event => setAutomatic(event.target.checked)} />{ui.auto}</label><details><summary>{ui.keyboard}</summary><p>{ui.keyboardHelp}</p></details><button type="button" className="ern-r-back-top" onClick={() => beforeFeed.current?.focus()}>{ui.scrollTop} ↑</button>
        </div>
      </div>
      <aside className="ern-r-right"><div className="ern-r-sticky"><Link className="ern-r-map-card" href="/destinos"><div><Photo src="/images/regiao/barceloscapital.jpg.jpeg" alt="Barcelos · acervo ERN" /></div><span className="ern-r-kicker">ENCANTOS RIO NEGRO</span><h2>{ui.mapTitle}</h2><p>{ui.mapText}</p><strong>{ui.map} <Icon name="arrow" /></strong></Link><section className="ern-r-plan-card"><Icon name="compass" /><h2>ERN Concierge</h2><p>{ui.sub}</p><Link href="/#concierge">{ui.plan} ↗</Link></section><p className="ern-r-right-footer">{ui.footer}</p></div></aside>
    </div>
    {notice && <div className="ern-r-toast" role="status"><p>{notice.text}</p>{notice.login && <Link href="/acesso">{ui.join} ↗</Link>}<button type="button" onClick={() => setNotice(null)} aria-label={ui.close}>×</button></div>}
  </div>;
}

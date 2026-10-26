'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  listarFeedPublico,
  type PublicacaoPublica,
  type MidiaPublicacao,
} from '@/lib/redePublica';
import { destinosTranslations } from '@/lib/i18n/destinos';
import { useLanguage } from './LanguageProvider';

const button: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minHeight: 44, padding: '10px 16px', borderRadius: 12,
  border: '1px solid var(--ern-borda, #b7a276)', background: 'var(--ern-painel, #fff8e8)',
  color: 'var(--ern-texto, #244c3c)', fontSize: 14, fontWeight: 600,
  textDecoration: 'none', cursor: 'pointer',
};
const panel: CSSProperties = {
  padding: 18, border: '1px solid var(--ern-borda, #d5c6a4)',
  borderRadius: 16, marginTop: 20, minWidth: 0,
};
const input: CSSProperties = {
  display: 'block', width: '100%', minHeight: 44, padding: 10,
  marginTop: 8, borderRadius: 10, border: '1px solid var(--ern-borda, #b7a276)',
  background: 'var(--ern-painel, #fffaf0)', color: 'var(--ern-texto, #263e34)', fontSize: 16,
};

function pauseOthers(current: HTMLVideoElement) {
  document.querySelectorAll('video').forEach(video => {
    if (video !== current) video.pause();
  });
}

function destinationName(slug: string | null | undefined, idioma: 'PT' | 'EN' | 'ES') {
  if (!slug) return '';
  const items = destinosTranslations[idioma].destinations;
  return items[slug as keyof typeof items]?.titulo || slug;
}

export function MidiaVivenciaERN({ midia }: { midia: MidiaPublicacao }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const hidden = () => { if (document.hidden) video.pause(); };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) video.pause();
    });
    observer.observe(video);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', hidden);
      video.pause();
    };
  }, [midia.url]);

  if (midia.tipo === 'video') {
    return (
      <div style={{ position: 'relative', background: '#071c17', borderRadius: 14, overflow: 'hidden' }}>
        <video
          ref={ref}
          src={midia.url}
          poster={midia.thumbnail_url || undefined}
          controls playsInline preload="none"
          aria-label={midia.alt_text || 'Vídeo · Vivências ERN'}
          onPlay={event => pauseOthers(event.currentTarget)}
          style={{ display: 'block', width: '100%', maxHeight: '66svh', minHeight: 180, objectFit: 'contain' }}
        />
        <span aria-hidden="true" style={{
          position: 'absolute', top: 12, right: 12, padding: '5px 9px',
          borderRadius: 8, background: '#102e25dd', color: '#ffdc93',
          fontSize: 12, fontWeight: 700, pointerEvents: 'none',
        }}>ERN</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={midia.url} alt={midia.alt_text || 'Fotografia da publicação'} loading="lazy"
      style={{ display: 'block', width: '100%', maxHeight: '66svh', objectFit: 'contain', borderRadius: 14, background: 'var(--ern-painel, #f3ecdd)' }} />
  );
}

export function ConfigurarVivenciaERN({
  publicacaoId, bloqueado, midias, onOcupado, onAtualizar,
}: {
  publicacaoId: string;
  bloqueado: boolean;
  midias: MidiaPublicacao[];
  onOcupado: (value: boolean) => void;
  onAtualizar: () => void;
}) {
  const [destino, setDestino] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [videoId, setVideoId] = useState('');
  const [capa, setCapa] = useState<File | null>(null);
  const [autorizado, setAutorizado] = useState(false);
  const [aviso, setAviso] = useState('');
  const lock = useRef(false);
  const entrada = useRef<HTMLInputElement>(null);
  const videos = midias.filter(item => item.tipo === 'video');
  const disabled = bloqueado || carregando || ocupado;

  useEffect(() => {
    let active = true;
    setCarregando(true);
    void (async () => {
      try {
        const { data, error } = await supabase.from('publicacoes')
          .select('destino_slug').eq('id', publicacaoId).single();
        if (error) throw error;
        if (active) setDestino(data.destino_slug || '');
      } catch {
        if (active) setAviso('Não foi possível carregar o destino. Atualize a página.');
      } finally {
        if (active) setCarregando(false);
      }
    })();
    return () => { active = false; };
  }, [publicacaoId]);

  async function salvar(tipo: 'destino' | 'capa') {
    if (disabled || lock.current) return;
    lock.current = true;
    setOcupado(true);
    onOcupado(true);
    setAviso('');

    try {
      const { data: post, error: postError } = await supabase.from('publicacoes')
        .select('id,status').eq('id', publicacaoId).single();
      if (postError) throw postError;
      if (post.status !== 'rascunho') {
        throw new Error('Volte a publicação para rascunho antes de editar.');
      }

      if (tipo === 'destino') {
        const { data, error } = await supabase.from('publicacoes')
          .update({ destino_slug: destino || null })
          .eq('id', publicacaoId).eq('status', 'rascunho').select('id').single();
        if (error) throw error;
        if (!data) throw new Error('Não foi possível confirmar o destino.');
        setAviso('Destino salvo. A ligação com o mapa aparecerá após publicar.');
      } else {
        if (!videoId || !videos.some(video => video.id === videoId)) {
          throw new Error('Selecione o vídeo que receberá a capa.');
        }
        if (!capa || !autorizado) {
          throw new Error('Selecione a capa e confirme a autorização.');
        }

        const formats: Record<string, string> = {
          'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
        };
        const extension = formats[capa.type];
        if (!extension || !capa.size || capa.size > 5 * 1024 * 1024) {
          throw new Error('A capa deve ser JPEG, PNG ou WebP de até 5 MB.');
        }

        const path = `publicacoes/${publicacaoId}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from('vivencias-ern')
          .upload(path, capa, { upsert: false, contentType: capa.type });
        if (uploadError) throw uploadError;

        const { data: check, error: checkError } = await supabase.from('publicacoes')
          .select('status').eq('id', publicacaoId).single();
        if (checkError || check?.status !== 'rascunho') {
          throw new Error('A capa foi enviada, mas a publicação mudou. Atualize a galeria.');
        }

        const { data, error } = await supabase.from('publicacao_midias')
          .update({ thumbnail_url: 'vivencias-ern/' + path })
          .eq('id', videoId).eq('publicacao_id', publicacaoId)
          .eq('tipo', 'video').select('id').single();
        if (error || !data) {
          throw new Error('A capa foi enviada, mas o vínculo não foi confirmado. Atualize a galeria antes de repetir.');
        }

        setCapa(null);
        setAutorizado(false);
        if (entrada.current) entrada.current.value = '';
        setAviso('Capa salva.');
        onAtualizar();
      }
    } catch (error) {
      setAviso(error instanceof Error ? error.message : 'Não foi possível salvar. Atualize a galeria antes de repetir.');
    } finally {
      lock.current = false;
      setOcupado(false);
      onOcupado(false);
    }
  }

  return (
    <section style={panel} aria-label="Destino e capa da vivência">
      <h4 style={{ margin: '0 0 14px', fontSize: 18 }}>Destino e capa · Vivências ERN</h4>
      <fieldset disabled={disabled} style={{ border: 0, padding: 0, minWidth: 0 }}>
        <label>
          Onde esta experiência aconteceu?
          <select style={input} value={destino} onChange={event => setDestino(event.target.value)}>
            <option value="">Sem destino vinculado</option>
            {Object.entries(destinosTranslations.PT.destinations).map(([id, item]) => (
              <option key={id} value={id}>{item.titulo}</option>
            ))}
          </select>
        </label>
        <p style={{ fontSize: 12, lineHeight: 1.7 }}>
          Selecione o local da experiência. Sua localização atual não será usada como local da gravação.
        </p>
        <button type="button" style={button} onClick={() => void salvar('destino')}>Salvar destino</button>

        {videos.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <label>
              Vídeo que receberá a capa
              <select style={input} value={videoId} onChange={event => setVideoId(event.target.value)}>
                <option value="">Selecione um vídeo</option>
                {videos.map((video, index) => (
                  <option key={video.id} value={video.id}>{index + 1} · {video.alt_text || 'Vídeo'}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'block', marginTop: 14 }}>
              Capa · JPEG, PNG ou WebP · até 5 MB
              <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp"
                style={input} onChange={event => setCapa(event.target.files?.[0] || null)} />
            </label>
            <label style={{ display: 'flex', gap: 10, margin: '14px 0', lineHeight: 1.7 }}>
              <input type="checkbox" checked={autorizado} onChange={event => setAutorizado(event.target.checked)} />
              Tenho autorização para divulgar a capa e as pessoas identificáveis nela.
            </label>
            <button type="button" style={button} onClick={() => void salvar('capa')}>Salvar capa do vídeo</button>
          </div>
        )}
      </fieldset>
      {(aviso || ocupado) && <p role="status" style={{ fontSize: 13, lineHeight: 1.7 }}>{ocupado ? 'Salvando…' : aviso}</p>}
    </section>
  );
}

export function CompartilharVivenciaERN({ post }: { post: PublicacaoPublica }) {
  const { idioma } = useLanguage();
  const tr = (pt: string, en: string, es: string) => idioma === 'EN' ? en : idioma === 'ES' ? es : pt;
  const [aberto, setAberto] = useState(false);
  const [aviso, setAviso] = useState('');
  const [base, setBase] = useState('');
  const [gerando, setGerando] = useState(false);
  useEffect(() => { setBase(window.location.origin); }, []);
  const url = base + '/rede/publicacao/' + encodeURIComponent(post.slug);
  const texto = `${post.titulo}\n${post.autor.nome_publico} · Vivências ERN\n${url}`;

  async function compartilhar() {
    try {
      if (navigator.share) {
        await navigator.share({ title: post.titulo, text: `${post.autor.nome_publico} · Vivências ERN`, url });
      } else {
        await navigator.clipboard.writeText(texto);
        setAviso(tr('Link copiado.', 'Link copied.', 'Enlace copiado.'));
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        setAviso(tr('Copie o link no campo abaixo.', 'Copy the link below.', 'Copia el enlace de abajo.'));
      }
    }
  }

  async function cartao() {
    if (gerando || !base) return;
    setGerando(true);
    setAviso('');

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas indisponível.');

      const gradient = ctx.createLinearGradient(0, 0, 1080, 1350);
      gradient.addColorStop(0, '#183e35');
      gradient.addColorStop(1, '#061b17');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1080, 1350);
      ctx.strokeStyle = '#cba562';
      ctx.lineWidth = 3;
      ctx.strokeRect(48, 48, 984, 1254);
      ctx.fillStyle = '#f4c77e';
      ctx.font = 'bold 90px sans-serif';
      ctx.fillText('ERN', 90, 180);
      ctx.font = '28px sans-serif';
      ctx.fillText('ENCANTOS RIO NEGRO', 90, 235);
      ctx.fillStyle = '#fff7e7';
      ctx.font = 'bold 38px sans-serif';
      ctx.fillText('Vivências ERN', 90, 360);

      function linhas(text: string, y: number, font: string, height: number, max: number) {
        ctx!.font = font;
        const rows: string[] = [];
        let row = '';
        for (const word of text.split(/\s+/)) {
          const next = row ? row + ' ' + word : word;
          if (ctx!.measureText(next).width > 870 && row) {
            rows.push(row);
            row = word;
          } else row = next;
        }
        if (row) rows.push(row);
        rows.slice(0, max).forEach((value, index) => {
          const clipped = rows.length > max && index === max - 1;
          ctx!.fillText(clipped ? value.slice(0, -3) + '…' : value, 90, y + index * height, 870);
        });
      }

      linhas(post.titulo, 490, 'bold 58px sans-serif', 76, 5);
      ctx.fillStyle = '#f4c77e';
      linhas(post.autor.nome_publico, 960, '32px sans-serif', 44, 2);
      linhas(destinationName(post.destino_slug, idioma), 1080, '28px sans-serif', 38, 2);
      ctx.fillStyle = '#fff7e7';
      ctx.font = '24px sans-serif';
      ctx.fillText(base.replace(/^https?:\/\//, ''), 90, 1230, 870);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(value => value ? resolve(value) : reject(new Error('Falha ao gerar cartão.')), 'image/png');
      });
      const file = new File([blob], 'vivencia-ern.png', { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: post.titulo, text: texto });
          return;
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return;
        }
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setAviso(tr('Cartão baixado. Copie também o link.', 'Card downloaded. Copy the link too.', 'Tarjeta descargada. Copia también el enlace.'));
    } catch {
      setAviso(tr('Não foi possível gerar o cartão.', 'Could not create the card.', 'No se pudo crear la tarjeta.'));
    } finally {
      setGerando(false);
    }
  }

  return (
    <div style={{ margin: '14px 0' }}>
      <button type="button" style={button} aria-expanded={aberto} onClick={() => setAberto(value => !value)}>
        {tr('Compartilhar · ERN', 'Share · ERN', 'Compartir · ERN')}
      </button>
      {aberto && (
        <div style={panel}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {base && <>
              <a style={button} href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              <a style={button} href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">Facebook</a>
            </>}
            <button type="button" style={button} onClick={() => void compartilhar()}>
              {tr('Compartilhar link', 'Share link', 'Compartir enlace')}
            </button>
            <button type="button" style={button} disabled={gerando || !base} onClick={() => void cartao()}>
              {gerando ? '…' : tr('Cartão ERN / Instagram', 'ERN card / Instagram', 'Tarjeta ERN / Instagram')}
            </button>
          </div>
          <label style={{ display: 'block', marginTop: 12 }}>
            Link
            <input style={input} value={base ? url : ''} readOnly onFocus={event => event.currentTarget.select()} />
          </label>
          <p style={{ fontSize: 12, lineHeight: 1.7 }}>
            {tr(
              'Compartilhe pelo celular ou baixe o cartão para publicar no Instagram. O cartão não altera o vídeo original.',
              'Share from your phone or download the card for Instagram. The original video stays unchanged.',
              'Comparte desde el teléfono o descarga la tarjeta para Instagram. El vídeo original se conserva.'
            )}
          </p>
          {aviso && <p role="status">{aviso}</p>}
        </div>
      )}
    </div>
  );
}

export function ListaVivenciasERN({
  destino, somenteVideos = true,
}: { destino?: string; somenteVideos?: boolean }) {
  const { idioma } = useLanguage();
  const tr = (pt: string, en: string, es: string) => idioma === 'EN' ? en : idioma === 'ES' ? es : pt;
  const [itens, setItens] = useState<PublicacaoPublica[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mais, setMais] = useState(false);
  const [erro, setErro] = useState('');
  const [revisao, setRevisao] = useState(0);
  const offset = useRef(0);
  const lock = useRef(false);
  const generation = useRef(0);

  useEffect(() => {
    const current = ++generation.current;
    let active = true;
    lock.current = true;
    offset.current = 0;
    setCarregando(true);
    setErro('');
    setItens([]);
    const slug = new URL(window.location.href).searchParams.get('publicacao');

    void (async () => {
      try {
        const [posts, destaque] = await Promise.all([
          listarFeedPublico(idioma, { destinoSlug: destino, somenteVideos, limite: 13, deslocamento: 0 }),
          slug
            ? listarFeedPublico(idioma, { slug, destinoSlug: destino, somenteVideos, limite: 1 })
            : Promise.resolve([]),
        ]);

        if (!active) return;
        const page = posts.slice(0, 12);
        const all = [...destaque, ...page];
        setItens(all.filter((post, index) => all.findIndex(item => item.id === post.id) === index));
        offset.current = page.length;
        setMais(posts.length > 12);
      } catch {
        if (active) setErro(idioma === 'EN' ? 'Could not load experiences.' : idioma === 'ES' ? 'No se pudieron cargar las vivencias.' : 'Não foi possível carregar as vivências.');
      } finally {
        if (active && generation.current === current) {
          lock.current = false;
          setCarregando(false);
        }
      }
    })();

    const timer = setTimeout(() => {
      if (active) setRevisao(value => value + 1);
    }, 45 * 60 * 1000);

    return () => {
      active = false;
      generation.current++;
      clearTimeout(timer);
    };
  }, [idioma, destino, somenteVideos, revisao]);

  async function carregarMais() {
    if (lock.current) return;
    const current = generation.current;
    lock.current = true;
    setCarregando(true);
    setErro('');

    try {
      const posts = await listarFeedPublico(idioma, {
        destinoSlug: destino, somenteVideos, limite: 13, deslocamento: offset.current,
      });
      if (current !== generation.current) return;
      const page = posts.slice(0, 12);
      offset.current += page.length;
      setItens(previous => {
        const all = [...previous, ...page];
        return all.filter((post, index) => all.findIndex(item => item.id === post.id) === index);
      });
      setMais(posts.length > 12);
    } catch {
      if (current === generation.current) setErro(idioma === 'EN' ? 'Could not load more.' : idioma === 'ES' ? 'No se pudo cargar más.' : 'Falha ao carregar mais vivências.');
    } finally {
      if (current === generation.current) {
        lock.current = false;
        setCarregando(false);
      }
    }
  }

  return (
    <section style={{ marginTop: 26, minWidth: 0 }} aria-label="Vivências ERN">
      <h2 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 28 }}>
        {destino ? tr('Vivências neste lugar', 'Experiences here', 'Vivencias en este lugar') : 'Vivências ERN'}
      </h2>
      <p>{tr('O Rio Negro em movimento, pelas pessoas que fazem parte dele.', 'The Rio Negro in motion, through its people.', 'El río Negro en movimiento, a través de su gente.')}</p>
      {erro && <p role="alert">{erro}</p>}
      {!carregando && !erro && !itens.length && (
        <p>{tr('As primeiras vivências deste espaço ainda estão por vir.', 'The first experiences here are still to come.', 'Las primeras vivencias de este espacio están por llegar.')}</p>
      )}
      {itens.map(post => (
        <article key={post.id} style={{ ...panel, marginBottom: 24, background: 'var(--ern-painel, #fffaf0)' }}>
          <Link href={`/rede/perfil/${encodeURIComponent(post.autor.slug)}`} style={{ color: 'var(--ern-texto, #24523e)', fontWeight: 700 }}>
            {post.autor.nome_publico}
          </Link>
          <h3 style={{ fontSize: 22, lineHeight: 1.4 }}>{post.titulo}</h3>
          {post.resumo && <p style={{ lineHeight: 1.8 }}>{post.resumo}</p>}
          {post.midias.filter(item => !somenteVideos || item.tipo === 'video').map(midia => (
            <figure key={midia.id} style={{ margin: '16px 0' }}>
              <MidiaVivenciaERN midia={midia} />
              {(midia.alt_text || midia.credito) && (
                <figcaption style={{ fontSize: 12, marginTop: 8, lineHeight: 1.7 }}>
                  {midia.alt_text}
                  {midia.credito && <span style={{ display: 'block' }}>© {midia.credito}</span>}
                </figcaption>
              )}
            </figure>
          ))}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Link style={button} href={`/rede/publicacao/${encodeURIComponent(post.slug)}`}>
              {tr('Ver publicação', 'View post', 'Ver publicación')}
            </Link>
            {post.destino_slug && (
              <Link style={button} href={`/destinos?lugar=${encodeURIComponent(post.destino_slug)}&publicacao=${encodeURIComponent(post.slug)}`}>
                {tr('Ver no mapa', 'View on map', 'Ver en el mapa')} · {destinationName(post.destino_slug, idioma)}
              </Link>
            )}
          </div>
          <CompartilharVivenciaERN post={post} />
        </article>
      ))}
      {carregando && <p role="status">{tr('Carregando…', 'Loading…', 'Cargando…')}</p>}
      {!carregando && mais && (
        <button type="button" style={button} onClick={() => void carregarMais()}>{tr('Carregar mais', 'Load more', 'Cargar más')}</button>
      )}
      {!carregando && erro && (
        <button type="button" style={button} onClick={() => setRevisao(value => value + 1)}>{tr('Tentar novamente', 'Try again', 'Intentar de nuevo')}</button>
      )}
    </section>
  );
}
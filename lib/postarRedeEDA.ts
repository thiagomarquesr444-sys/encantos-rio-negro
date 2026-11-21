// EDA_POSTAR_REDE_V1 — publicação rápida na Rede EDA (operadora, Comando EDA e Guia/Prático).
// Envio retomável (continua de onde parou se o sinal cair), vídeo reduzido no aparelho,
// capa automática e rascunho salvo sozinho. Permissão sempre garantida pelo banco (RLS).
import { supabase } from '@/lib/supabase';
import {
  contextoPerfilPublicoERN as contextoOperadora,
  carregarPerfilPublicoOperadoraERN,
} from '@/lib/perfilPublicoOperadoraERN';
import {
  contextoPerfilPublicoERN as contextoEditorial,
  carregarPerfilPublicoEditorialERN,
} from '@/lib/perfilPublicoEditorialERN';

export type ModoAutorEDA = 'operadora' | 'editorial' | 'guia';

export type AutorRedeEDA = {
  id: string;
  nome: string;
  publicado: boolean;
  empresaId: string | null;
};

export const VIDEO_MAX_SEGUNDOS = 90;
const BUCKET = 'vivencias-ern';
const LIMITE_VIDEO = 50 * 1024 * 1024;
const LIMITE_FOTO = 5 * 1024 * 1024;
const PEDACO = 6 * 1024 * 1024; // tamanho exigido pelo envio retomável do Supabase
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export async function carregarAutorRedeEDA(modo: ModoAutorEDA): Promise<AutorRedeEDA> {
  if (modo === 'guia') {
    const { data, error } = await supabase.rpc('garantir_perfil_rede_guia_eda');
    if (error) throw new Error(limparErroEDA(error.message));
    const r = data as { id: string; nome: string };
    return { id: r.id, nome: r.nome, publicado: true, empresaId: null };
  }
  if (modo === 'editorial') {
    const ctx = await contextoEditorial();
    const perfil = await carregarPerfilPublicoEditorialERN(ctx);
    if (!perfil) throw new Error('Salve o perfil público do Comando EDA primeiro.');
    return { id: perfil.id, nome: perfil.nome_publico, publicado: perfil.publicado, empresaId: null };
  }
  const ctx = await contextoOperadora();
  const perfil = await carregarPerfilPublicoOperadoraERN(ctx);
  if (!perfil) throw new Error('Salve o perfil público da operadora primeiro.');
  return { id: perfil.id, nome: perfil.nome_publico, publicado: perfil.publicado, empresaId: ctx.empresaId };
}

export function limparErroEDA(msg: string): string {
  return msg.replace(/^EDA_[A-Z_]+:\s*/, '').trim() || 'Não foi possível concluir. Tente de novo.';
}

export function erroPostarEDA(falha: unknown): string {
  if (falha instanceof Error) return limparErroEDA(falha.message);
  if (typeof falha === 'object' && falha !== null) {
    const f = falha as { code?: string; message?: string };
    if (f.code === '42501') return 'Sua conta não tem permissão para esta publicação.';
    if (f.message) return limparErroEDA(f.message);
  }
  return 'Não foi possível concluir. Tente de novo.';
}

// ---------- Rascunho ----------

export type TextoPostagemEDA = {
  legenda: string;
  tipo: 'conteudo' | 'dica' | 'aviso' | 'evento' | 'oferta' | 'disponibilidade';
  localidade: string;
  passeioId: string | null;
  inicio: string | null; // AAAA-MM-DD
  fim: string | null;
};

function montarCampos(t: TextoPostagemEDA) {
  const legenda = t.legenda.trim().slice(0, 4000);
  const primeira = legenda.split('\n').find(l => l.trim())?.trim() ?? '';
  const padrao = t.tipo === 'disponibilidade' ? 'Disponível para guiar' : 'Momento na Amazônia';
  let titulo = primeira.length >= 3 ? primeira : padrao;
  if (titulo.length > 90) titulo = titulo.slice(0, 87).trimEnd() + '…';
  return {
    titulo,
    resumo: legenda ? legenda.slice(0, 600) : null,
    conteudo: legenda.length > 600 ? legenda : null,
    tipo: t.tipo,
    localidade_texto: t.localidade.trim().slice(0, 300) || null,
    passeio_id: t.tipo === 'oferta' ? t.passeioId : null,
    data_evento_inicio: t.tipo === 'disponibilidade' && t.inicio ? `${t.inicio}T00:00:00-04:00` : null,
    data_evento_fim: t.tipo === 'disponibilidade' && t.fim ? `${t.fim}T23:59:00-04:00` : null,
  };
}

export async function salvarRascunhoRedeEDA(
  autorId: string, id: string, existe: boolean, t: TextoPostagemEDA,
): Promise<void> {
  if (!UUID.test(id) || !UUID.test(autorId)) throw new Error('Identificador inválido.');
  const campos = { ...montarCampos(t), idioma_original: 'pt', permitir_interacoes: true, status: 'rascunho' };
  const { error } = existe
    ? await supabase.from('publicacoes').update(campos).eq('id', id).eq('autor_perfil_id', autorId).eq('status', 'rascunho')
    : await supabase.from('publicacoes').insert({ ...campos, id, autor_perfil_id: autorId, slug: `publicacao-${id}` });
  if (error) throw error;
}

export async function publicarRedeEDA(autorId: string, id: string, t: TextoPostagemEDA, nomeAutor: string) {
  await salvarRascunhoRedeEDA(autorId, id, true, t);
  // Fotos recebem a legenda como descrição (acessibilidade) e o autor como crédito.
  const alt = (t.legenda.trim().split('\n')[0] || `Foto de ${nomeAutor}`).slice(0, 300);
  const { error: e1 } = await supabase.from('publicacao_midias')
    .update({ alt_text: alt, credito: nomeAutor.slice(0, 300), consentimento_confirmado: true })
    .eq('publicacao_id', id).eq('tipo', 'imagem');
  if (e1) throw e1;
  const { error: e2 } = await supabase.from('publicacao_midias')
    .update({ alt_text: alt, credito: nomeAutor.slice(0, 300), consentimento_confirmado: true })
    .eq('publicacao_id', id).eq('tipo', 'video');
  if (e2) throw e2;
  const { data: pub, error: e3 } = await supabase.from('publicacoes')
    .select('updated_at,slug').eq('id', id).eq('autor_perfil_id', autorId).single();
  if (e3 || !pub) throw e3 ?? new Error('Rascunho não encontrado.');
  const { error: e4 } = await supabase.rpc('alterar_status_publicacao_ern', {
    publicacao_id: id, acao: 'publicar', versao_esperada: pub.updated_at,
  });
  if (e4) throw new Error(traduzirErroPublicar(e4.message));
  return pub.slug as string;
}

function traduzirErroPublicar(m: string) {
  const mapa: Record<string, string> = {
    'Publique primeiro o seu perfil publico.': 'Publique primeiro o seu perfil público.',
    'Escreva uma legenda antes de publicar.': 'Escreva uma legenda antes de publicar.',
    'Adicione pelo menos uma foto ou um video.': 'Adicione pelo menos uma foto ou um vídeo.',
  };
  return mapa[m] ?? limparErroEDA(m);
}

export async function removerMidiaRedeEDA(midiaId: string, caminhos: string[]) {
  const { error } = await supabase.from('publicacao_midias').delete().eq('id', midiaId);
  if (error) throw error;
  const validos = caminhos.filter(Boolean);
  if (validos.length) await supabase.storage.from(BUCKET).remove(validos);
}

export async function midiasRascunhoRedeEDA(id: string) {
  const { data, error } = await supabase.from('publicacao_midias')
    .select('id,tipo,url,thumbnail_url').eq('publicacao_id', id).order('ordem').limit(20);
  if (error) throw error;
  return (data ?? []) as { id: string; tipo: 'imagem' | 'video'; url: string; thumbnail_url: string | null }[];
}

// ---------- Arquivos ----------

export function duracaoVideoEDA(arquivo: File): Promise<number> {
  return new Promise(resolve => {
    const v = document.createElement('video');
    const url = URL.createObjectURL(arquivo);
    const fim = (d: number) => { URL.revokeObjectURL(url); resolve(d); };
    v.preload = 'metadata';
    v.onloadedmetadata = () => fim(Number.isFinite(v.duration) ? v.duration : 0);
    v.onerror = () => fim(0);
    v.src = url;
  });
}

function carregarVideo(arquivo: File) {
  return new Promise<{ v: HTMLVideoElement; url: string }>((resolve, reject) => {
    const v = document.createElement('video');
    const url = URL.createObjectURL(arquivo);
    v.preload = 'auto';
    v.playsInline = true;
    v.onloadeddata = () => resolve({ v, url });
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Vídeo ilegível neste aparelho.')); };
    v.src = url;
  });
}

// Capa automática: um quadro do vídeo (JPEG leve).
export async function capaDoVideoEDA(arquivo: File): Promise<Blob | null> {
  try {
    const { v, url } = await carregarVideo(arquivo);
    v.muted = true;
    const alvo = Math.min(1, (v.duration || 3) / 3);
    await new Promise<void>(r => { v.onseeked = () => r(); v.currentTime = alvo; setTimeout(r, 4000); });
    const escala = Math.min(1, 960 / Math.max(v.videoWidth || 1, v.videoHeight || 1));
    const c = document.createElement('canvas');
    c.width = Math.max(2, Math.round((v.videoWidth || 640) * escala));
    c.height = Math.max(2, Math.round((v.videoHeight || 360) * escala));
    c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    return await new Promise(r => c.toBlob(b => r(b), 'image/jpeg', 0.82));
  } catch {
    return null;
  }
}

// Foto acima de 4,5 MB é reduzida (maior lado 2048 px) — também tira o GPS da câmera.
export async function prepararFotoRedeEDA(arquivo: File): Promise<File> {
  if (arquivo.size <= 4.5 * 1024 * 1024 && ['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type)) return arquivo;
  const url = URL.createObjectURL(arquivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const escala = Math.min(1, 2048 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * escala);
    c.height = Math.round(img.naturalHeight * escala);
    c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>(r => c.toBlob(b => r(b), 'image/jpeg', 0.85));
    if (!blob) throw new Error('Não foi possível preparar a foto.');
    return new File([blob], (arquivo.name.replace(/\.[^.]+$/, '') || 'foto') + '.jpg', { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Vídeo acima de 20 MB é regravado em 720p no próprio aparelho (leva o tempo do vídeo).
// Se o aparelho não suportar, devolve null e o original sobe (até 50 MB).
export async function comprimirVideoEDA(
  arquivo: File, onProgresso: (p: number) => void, sinal?: AbortSignal,
): Promise<File | null> {
  if (arquivo.size <= 20 * 1024 * 1024) return null;
  if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement.prototype.captureStream !== 'function') return null;
  const mime = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4',
    'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm',
  ].find(t => MediaRecorder.isTypeSupported(t));
  if (!mime) return null;

  let carregado: { v: HTMLVideoElement; url: string };
  try { carregado = await carregarVideo(arquivo); } catch { return null; }
  const { v, url } = carregado;
  let actx: AudioContext | null = null;
  try {
    const escala = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement('canvas');
    c.width = Math.round((v.videoWidth * escala) / 2) * 2;
    c.height = Math.round((v.videoHeight * escala) / 2) * 2;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    const stream = c.captureStream(30);
    try {
      actx = new AudioContext();
      const fonte = actx.createMediaElementSource(v);
      const destino = actx.createMediaStreamDestination();
      fonte.connect(destino); // não vai para o alto-falante
      destino.stream.getAudioTracks().forEach(t => stream.addTrack(t));
      await actx.resume();
    } catch { /* sem áudio separado: segue só o vídeo */ }

    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1_500_000, audioBitsPerSecond: 96_000 });
    const partes: Blob[] = [];
    rec.ondataavailable = e => { if (e.data.size) partes.push(e.data); };

    let rodando = true;
    const desenhar = () => {
      if (!rodando) return;
      ctx.drawImage(v, 0, 0, c.width, c.height);
      onProgresso(Math.min(99, Math.round((v.currentTime / (v.duration || 1)) * 100)));
      if ('requestVideoFrameCallback' in v) (v as HTMLVideoElement & { requestVideoFrameCallback: (cb: () => void) => void }).requestVideoFrameCallback(desenhar);
      else requestAnimationFrame(desenhar);
    };

    const terminou = new Promise<boolean>(resolve => {
      v.onended = () => resolve(true);
      v.onerror = () => resolve(false);
      sinal?.addEventListener('abort', () => resolve(false));
      setTimeout(() => resolve(false), (v.duration || VIDEO_MAX_SEGUNDOS) * 2000 + 20000);
    });

    rec.start(1000);
    try {
      await v.play(); // precisa do toque do usuário; se o navegador bloquear, sobe o original
    } catch {
      rodando = false;
      rec.stop();
      return null;
    }
    desenhar();
    const ok = await terminou;
    rodando = false;
    await new Promise<void>(r => { rec.onstop = () => r(); if (rec.state !== 'inactive') rec.stop(); else r(); });
    if (!ok) return null;
    const tipo = mime.startsWith('video/mp4') ? 'video/mp4' : 'video/webm';
    const blob = new Blob(partes, { type: tipo });
    if (!blob.size || blob.size >= arquivo.size) return null;
    onProgresso(100);
    return new File([blob], (arquivo.name.replace(/\.[^.]+$/, '') || 'video') + (tipo === 'video/mp4' ? '.mp4' : '.webm'), { type: tipo });
  } catch {
    return null;
  } finally {
    v.pause();
    URL.revokeObjectURL(url);
    void actx?.close().catch(() => undefined);
  }
}

// ---------- Envio retomável (protocolo TUS do Supabase Storage) ----------

function b64(texto: string) {
  return btoa(unescape(encodeURIComponent(texto)));
}

function esperar(ms: number, sinal?: AbortSignal) {
  return new Promise<void>((r, j) => {
    const t = setTimeout(r, ms);
    sinal?.addEventListener('abort', () => { clearTimeout(t); j(new Error('Envio cancelado.')); });
  });
}

function enviarPedaco(
  local: string, token: string, anon: string, offset: number, pedaco: Blob,
  onBytes: (n: number) => void, sinal?: AbortSignal,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PATCH', local);
    xhr.setRequestHeader('authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', anon);
    xhr.setRequestHeader('tus-resumable', '1.0.0');
    xhr.setRequestHeader('upload-offset', String(offset));
    xhr.setRequestHeader('content-type', 'application/offset+octet-stream');
    xhr.upload.onprogress = e => onBytes(e.loaded);
    xhr.onload = () => {
      if (xhr.status === 204 || xhr.status === 200) resolve(Number(xhr.getResponseHeader('upload-offset') ?? offset + pedaco.size));
      else reject(new Error(`Falha no envio (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error('Conexão caiu.'));
    sinal?.addEventListener('abort', () => xhr.abort());
    xhr.send(pedaco);
  });
}

export async function enviarArquivoRedeEDA(
  caminho: string, arquivo: Blob, tipo: string,
  onProgresso: (p: number) => void, sinal?: AbortSignal,
): Promise<void> {
  const limite = tipo.startsWith('video/') ? LIMITE_VIDEO : LIMITE_FOTO;
  if (arquivo.size <= 0 || arquivo.size > limite) {
    throw new Error(tipo.startsWith('video/') ? 'Vídeo acima de 50 MB.' : 'Foto acima de 5 MB.');
  }

  // Arquivo pequeno: envio direto.
  if (arquivo.size <= PEDACO) {
    onProgresso(5);
    const { error } = await supabase.storage.from(BUCKET).upload(caminho, arquivo, { upsert: false, contentType: tipo, cacheControl: '3600' });
    if (error) throw error;
    onProgresso(100);
    return;
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
  const token = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error('Entre novamente para publicar.');
    return data.session.access_token;
  };

  const criar = await fetch(`${base}/storage/v1/upload/resumable`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${await token()}`,
      apikey: anon,
      'tus-resumable': '1.0.0',
      'upload-length': String(arquivo.size),
      'x-upsert': 'false',
      'upload-metadata': [
        `bucketName ${b64(BUCKET)}`, `objectName ${b64(caminho)}`,
        `contentType ${b64(tipo)}`, `cacheControl ${b64('3600')}`,
      ].join(','),
    },
    signal: sinal,
  });
  const local = criar.headers.get('location');
  if (criar.status !== 201 || !local) {
    throw new Error(criar.status === 403 ? 'Sem permissão para enviar este arquivo.' : `Não foi possível iniciar o envio (${criar.status}).`);
  }

  let offset = 0;
  let falhas = 0;
  while (offset < arquivo.size) {
    if (sinal?.aborted) throw new Error('Envio cancelado.');
    try {
      const pedaco = arquivo.slice(offset, offset + PEDACO);
      const inicio = offset;
      offset = await enviarPedaco(local, await token(), anon, offset, pedaco,
        n => onProgresso(Math.min(99, Math.round(((inicio + n) / arquivo.size) * 100))), sinal);
      falhas = 0;
    } catch (e) {
      if (sinal?.aborted) throw e;
      falhas += 1;
      if (falhas > 8) throw new Error('A internet caiu várias vezes. Toque em Tentar de novo.');
      // Espera o sinal voltar e pergunta ao servidor de onde continuar.
      if (!navigator.onLine) {
        await new Promise<void>(r => window.addEventListener('online', () => r(), { once: true }));
      }
      await esperar(Math.min(15000, 1000 * 2 ** falhas), sinal);
      try {
        const h = await fetch(local, { method: 'HEAD', headers: { authorization: `Bearer ${await token()}`, apikey: anon, 'tus-resumable': '1.0.0' } });
        const o = Number(h.headers.get('upload-offset'));
        if (Number.isFinite(o) && o >= 0) offset = o;
      } catch { /* tenta de novo no próximo ciclo */ }
    }
  }
  onProgresso(100);
}

export async function registrarMidiaRedeEDA(p: {
  publicacaoId: string; midiaId: string; tipo: 'imagem' | 'video';
  caminho: string; capa: string | null; ordem: number; autor: string;
}) {
  const { error } = await supabase.from('publicacao_midias').insert({
    id: p.midiaId,
    publicacao_id: p.publicacaoId,
    tipo: p.tipo,
    url: `${BUCKET}/${p.caminho}`,
    thumbnail_url: p.capa ? `${BUCKET}/${p.capa}` : null,
    alt_text: `Foto de ${p.autor}`.slice(0, 300),
    credito: p.autor.slice(0, 300),
    consentimento_confirmado: false, // vira true ao publicar, com a confirmação de direitos
    ordem: p.ordem,
  });
  if (error) throw error;
}

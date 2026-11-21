'use client';

/*
  EDA_POSTAR_REDE_V1 — "Postar" em uma tela só (operadora, Comando EDA e Guia/Prático).
  Escolhe várias fotos/vídeos → o envio começa na hora (retomável) enquanto a pessoa
  escreve a legenda → Publicar. Rascunho salvo sozinho; vídeo até 90 s, reduzido no
  aparelho; capa automática; uma confirmação de direitos só.
*/
import './postar-rede-eda.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import CampoLocalEDA from '@/app/components/CampoLocalEDA';
import { supabase } from '@/lib/supabase';
import { resolverMidiasPrivadasERN } from '@/lib/midiasPrivadasERN';
import {
  VIDEO_MAX_SEGUNDOS, capaDoVideoEDA, carregarAutorRedeEDA, comprimirVideoEDA, duracaoVideoEDA,
  enviarArquivoRedeEDA, erroPostarEDA, midiasRascunhoRedeEDA, prepararFotoRedeEDA, publicarRedeEDA,
  registrarMidiaRedeEDA, removerMidiaRedeEDA, salvarRascunhoRedeEDA,
  type AutorRedeEDA, type ModoAutorEDA, type TextoPostagemEDA,
} from '@/lib/postarRedeEDA';

type Fase = 'fila' | 'reduzindo' | 'enviando' | 'pronto' | 'erro';
type Item = {
  chave: string;
  tipo: 'imagem' | 'video';
  arquivo: File | null;
  previa: string;
  fase: Fase;
  progresso: number;
  erro?: string;
  midiaId?: string;
  caminho?: string;
  capa?: string;
};

const TIPOS: Record<ModoAutorEDA, { valor: TextoPostagemEDA['tipo']; rotulo: string }[]> = {
  operadora: [
    { valor: 'conteudo', rotulo: 'Momento' }, { valor: 'oferta', rotulo: 'Passeio' },
    { valor: 'dica', rotulo: 'Dica' }, { valor: 'evento', rotulo: 'Evento' }, { valor: 'aviso', rotulo: 'Aviso' },
  ],
  editorial: [
    { valor: 'conteudo', rotulo: 'Momento' }, { valor: 'dica', rotulo: 'Dica' },
    { valor: 'evento', rotulo: 'Evento' }, { valor: 'aviso', rotulo: 'Aviso' },
  ],
  guia: [
    { valor: 'conteudo', rotulo: 'Momento' }, { valor: 'disponibilidade', rotulo: 'Minha agenda livre' },
    { valor: 'dica', rotulo: 'Dica' }, { valor: 'aviso', rotulo: 'Aviso' },
  ],
};

const TEXTO_INICIAL: TextoPostagemEDA = {
  legenda: '', tipo: 'conteudo', localidade: '', passeioId: null, inicio: null, fim: null,
};

const hojeManaus = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Manaus' }).format(new Date());
const dataBR = (d: string) => d.split('-').reverse().slice(0, 2).join('/');

type Reconhecimento = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null; start: () => void; stop: () => void;
};

export default function PostarRedeEDA({
  modo, onPublicado, abrir,
}: { modo: ModoAutorEDA; onPublicado?: () => void; abrir?: { id: string; n: number } | null }) {
  const [autor, setAutor] = useState<AutorRedeEDA | null>(null);
  const [erroAutor, setErroAutor] = useState('');
  const [texto, setTexto] = useState<TextoPostagemEDA>(TEXTO_INICIAL);
  const [itens, setItens] = useState<Item[]>([]);
  const [direitos, setDireitos] = useState(false);
  const [passeios, setPasseios] = useState<{ id: string; nome: string }[]>([]);
  const [publicando, setPublicando] = useState(false);
  const [erro, setErro] = useState('');
  const [salvo, setSalvo] = useState<'' | 'salvando' | 'salvo'>('');
  const [publicado, setPublicado] = useState<string | null>(null);
  const [ouvindo, setOuvindo] = useState(false);

  const idRef = useRef<string>('');
  const existeRef = useRef(false);
  const textoRef = useRef(texto);
  const itensRef = useRef<Item[]>([]);
  const trabalhando = useRef(false);
  const abortos = useRef(new Map<string, AbortController>());
  const entrada = useRef<HTMLInputElement>(null);
  const voz = useRef<Reconhecimento | null>(null);
  const chaveLocal = autor ? `eda-postar-${modo}-${autor.id}` : '';

  textoRef.current = texto;
  itensRef.current = itens;

  const alterarItem = useCallback((chave: string, mudanca: Partial<Item>) => {
    setItens(lista => lista.map(i => (i.chave === chave ? { ...i, ...mudanca } : i)));
  }, []);

  // Abre um rascunho existente (pendente ou tocado na galeria) já preenchido.
  async function abrirRascunho(autorId: string, id: string, vivo: () => boolean = () => true) {
    const { data: pub } = await supabase.from('publicacoes')
      .select('id,status,tipo,resumo,conteudo,localidade_texto,passeio_id,data_evento_inicio,data_evento_fim')
      .eq('id', id).eq('autor_perfil_id', autorId).maybeSingle();
    if (!vivo() || !pub || pub.status !== 'rascunho') return false;
    idRef.current = pub.id;
    existeRef.current = true;
    setPublicado(null);
    setDireitos(false);
    setTexto({
      legenda: (pub.conteudo || pub.resumo || '') as string,
      tipo: pub.tipo as TextoPostagemEDA['tipo'],
      localidade: (pub.localidade_texto || '') as string,
      passeioId: pub.passeio_id as string | null,
      inicio: pub.data_evento_inicio ? String(pub.data_evento_inicio).slice(0, 10) : null,
      fim: pub.data_evento_fim ? String(pub.data_evento_fim).slice(0, 10) : null,
    });
    const midias = await resolverMidiasPrivadasERN(await midiasRascunhoRedeEDA(pub.id));
    if (!vivo()) return false;
    setItens(midias.map(m => ({
      chave: m.id, tipo: m.tipo, arquivo: null, previa: m.tipo === 'video' ? (m.thumbnail_url || '') : m.url,
      fase: 'pronto' as Fase, progresso: 100, midiaId: m.id,
      caminho: m.caminho, capa: m.capaCaminho ?? undefined,
    })));
    try { localStorage.setItem(`eda-postar-${modo}-${autorId}`, pub.id); } catch { /* ok */ }
    return true;
  }

  useEffect(() => {
    if (!autor || !abrir) return;
    if (itensRef.current.some(i => i.fase !== 'pronto' && i.fase !== 'erro')) {
      setErro('Espere o envio atual terminar para abrir outro rascunho.');
      return;
    }
    void abrirRascunho(autor.id, abrir.id).then(() => {
      document.getElementById('postar-rede-eda')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrir, autor]);

  // Autor + rascunho pendente (se a internet caiu no meio, continua de onde parou).
  useEffect(() => {
    let vivo = true;
    void (async () => {
      try {
        const a = await carregarAutorRedeEDA(modo);
        if (!vivo) return;
        setAutor(a);
        if (a.empresaId) {
          const { data } = await supabase.from('passeios').select('id,nome')
            .eq('empresa_id', a.empresaId).eq('publicado_portal', true).order('nome').limit(100);
          if (vivo) setPasseios((data ?? []) as { id: string; nome: string }[]);
        }
        const guardado = (() => { try { return localStorage.getItem(`eda-postar-${modo}-${a.id}`); } catch { return null; } })();
        if (guardado && vivo) await abrirRascunho(a.id, guardado, () => vivo);
      } catch (e) {
        if (vivo) setErroAutor(erroPostarEDA(e));
      } finally {
        if (vivo && !idRef.current) idRef.current = crypto.randomUUID();
      }
    })();
    return () => { vivo = false; };
  }, [modo]);

  const criando = useRef<Promise<void> | null>(null);
  const garantirRascunho = useCallback(async () => {
    if (!autor) throw new Error('Carregando seu perfil…');
    if (existeRef.current) return;
    // Uma criação só, mesmo que o texto e o primeiro arquivo cheguem juntos.
    criando.current ??= (async () => {
      await salvarRascunhoRedeEDA(autor.id, idRef.current, false, textoRef.current);
      existeRef.current = true;
      try { localStorage.setItem(`eda-postar-${modo}-${autor.id}`, idRef.current); } catch { /* sem armazenamento */ }
    })().finally(() => { criando.current = null; });
    await criando.current;
  }, [autor, modo]);

  // Salva o texto sozinho (1,2 s depois de parar de digitar).
  useEffect(() => {
    if (!autor || publicado) return;
    if (!existeRef.current && !texto.legenda.trim()) return;
    setSalvo('salvando');
    const t = setTimeout(async () => {
      try {
        if (existeRef.current) await salvarRascunhoRedeEDA(autor.id, idRef.current, true, texto);
        else await garantirRascunho();
        setSalvo('salvo');
      } catch { setSalvo(''); }
    }, 1200);
    return () => clearTimeout(t);
  }, [texto, autor, garantirRascunho, publicado]);

  // Fila de envio: um arquivo por vez (a internet da comunidade agradece).
  const processarFila = useCallback(async () => {
    if (trabalhando.current) return;
    trabalhando.current = true;
    try {
      for (;;) {
        const item = itensRef.current.find(i => i.fase === 'fila');
        if (!item || !item.arquivo || !autor) break;
        const ctrl = new AbortController();
        abortos.current.set(item.chave, ctrl);
        try {
          await garantirRascunho();
          const pubId = idRef.current;
          let arquivo = item.arquivo;
          let capa: string | undefined;

          if (item.tipo === 'video') {
            alterarItem(item.chave, { fase: 'reduzindo', progresso: 0 });
            if (arquivo.type === 'video/quicktime') {
              // iPhone (.mov): mesmo vídeo H.264, enviado como MP4.
              arquivo = new File([arquivo], (arquivo.name.replace(/\.[^.]+$/, '') || 'video') + '.mp4', { type: 'video/mp4' });
            }
            const menor = await comprimirVideoEDA(arquivo, p => alterarItem(item.chave, { progresso: p }), ctrl.signal);
            if (ctrl.signal.aborted) throw new Error('Envio cancelado.');
            if (menor) arquivo = menor;
            if (arquivo.size > 50 * 1024 * 1024) {
              throw new Error('Vídeo pesado demais (acima de 50 MB). Grave em 720p ou toque em Tentar de novo.');
            }
            const quadro = await capaDoVideoEDA(arquivo);
            if (quadro) {
              capa = `publicacoes/${pubId}/${crypto.randomUUID()}.jpg`;
              await enviarArquivoRedeEDA(capa, quadro, 'image/jpeg', () => undefined, ctrl.signal);
              alterarItem(item.chave, { previa: URL.createObjectURL(quadro) });
            }
          } else {
            arquivo = await prepararFotoRedeEDA(arquivo);
          }

          const midiaId = crypto.randomUUID();
          const ext = arquivo.type === 'video/webm' ? 'webm' : arquivo.type === 'video/mp4' ? 'mp4'
            : arquivo.type === 'image/png' ? 'png' : arquivo.type === 'image/webp' ? 'webp' : 'jpg';
          const caminho = `publicacoes/${pubId}/${midiaId}.${ext}`;
          alterarItem(item.chave, { fase: 'enviando', progresso: 0 });
          await enviarArquivoRedeEDA(caminho, arquivo, arquivo.type, p => alterarItem(item.chave, { progresso: p }), ctrl.signal);
          await registrarMidiaRedeEDA({
            publicacaoId: pubId, midiaId, tipo: item.tipo, caminho, capa: capa ?? null,
            ordem: itensRef.current.findIndex(i => i.chave === item.chave), autor: autor.nome,
          });
          alterarItem(item.chave, { fase: 'pronto', progresso: 100, midiaId, caminho, capa, arquivo: null });
        } catch (e) {
          if (ctrl.signal.aborted) {
            setItens(lista => lista.filter(i => i.chave !== item.chave));
          } else {
            alterarItem(item.chave, { fase: 'erro', erro: erroPostarEDA(e) });
          }
        } finally {
          abortos.current.delete(item.chave);
        }
      }
    } finally {
      trabalhando.current = false;
    }
  }, [autor, garantirRascunho, alterarItem]);

  useEffect(() => {
    if (itens.some(i => i.fase === 'fila')) void processarFila();
  }, [itens, processarFila]);

  const ocupado = itens.some(i => i.fase === 'fila' || i.fase === 'reduzindo' || i.fase === 'enviando');

  useEffect(() => {
    if (!ocupado) return;
    const avisar = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [ocupado]);

  async function escolher(lista: FileList | null) {
    setErro('');
    if (!lista?.length) return;
    const novos: Item[] = [];
    const avisos: string[] = [];
    for (const arquivo of Array.from(lista)) {
      if (itensRef.current.length + novos.length >= 10) { avisos.push('Até 10 fotos ou vídeos por publicação.'); break; }
      const ehVideo = arquivo.type.startsWith('video/');
      const ehFoto = arquivo.type.startsWith('image/');
      if (!ehVideo && !ehFoto) { avisos.push(`${arquivo.name}: formato não aceito.`); continue; }
      if (ehVideo) {
        if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(arquivo.type)) { avisos.push(`${arquivo.name}: use vídeo MP4.`); continue; }
        const d = await duracaoVideoEDA(arquivo);
        if (d > VIDEO_MAX_SEGUNDOS + 0.5) { avisos.push(`Vídeo com ${Math.round(d)} s: o limite é ${VIDEO_MAX_SEGUNDOS} s. Corte no celular e escolha de novo.`); continue; }
      }
      novos.push({
        chave: crypto.randomUUID(), tipo: ehVideo ? 'video' : 'imagem', arquivo,
        previa: ehFoto ? URL.createObjectURL(arquivo) : '', fase: 'fila', progresso: 0,
      });
    }
    if (avisos.length) setErro(avisos.join(' '));
    if (novos.length) setItens(atual => [...atual, ...novos]);
    if (entrada.current) entrada.current.value = '';
  }

  async function remover(item: Item) {
    abortos.current.get(item.chave)?.abort();
    if (item.midiaId) {
      try {
        await removerMidiaRedeEDA(item.midiaId, [item.caminho ?? '', item.capa ?? '']);
      } catch (e) { setErro(erroPostarEDA(e)); return; }
    }
    setItens(lista => lista.filter(i => i.chave !== item.chave));
  }

  function tentarDeNovo(item: Item) {
    if (!item.arquivo) { void remover(item); return; }
    alterarItem(item.chave, { fase: 'fila', progresso: 0, erro: undefined });
  }

  function mudarTipo(tipo: TextoPostagemEDA['tipo']) {
    setTexto(t => ({ ...t, tipo, passeioId: tipo === 'oferta' ? t.passeioId : null }));
  }

  function mudarData(campo: 'inicio' | 'fim', valor: string) {
    setTexto(t => {
      const novo = { ...t, [campo]: valor || null };
      if (novo.inicio && novo.fim && !t.legenda.trim()) {
        const onde = novo.localidade.trim() ? ` em ${novo.localidade.trim()}` : '';
        novo.legenda = `Estou com agenda livre para guiar de ${dataBR(novo.inicio)} a ${dataBR(novo.fim)}${onde}. Fale comigo pela Rede EDA.`;
      }
      return novo;
    });
  }

  function ditar() {
    const W = window as unknown as { SpeechRecognition?: new () => Reconhecimento; webkitSpeechRecognition?: new () => Reconhecimento };
    const Classe = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Classe) { setErro('Este navegador não aceita ditado. Use o microfone do teclado do celular.'); return; }
    if (ouvindo) { voz.current?.stop(); return; }
    const r = new Classe();
    r.lang = 'pt-BR'; r.interimResults = false; r.continuous = false;
    r.onresult = e => {
      const falado = Array.from(e.results).map(x => x[0]?.transcript ?? '').join(' ').trim();
      if (falado) setTexto(t => ({ ...t, legenda: (t.legenda ? t.legenda.trimEnd() + ' ' : '') + falado }));
    };
    r.onend = () => setOuvindo(false);
    voz.current = r;
    setOuvindo(true);
    r.start();
  }

  const prontos = itens.filter(i => i.fase === 'pronto').length;
  const faltas: string[] = [];
  if (!prontos) faltas.push('uma foto ou vídeo');
  if (!texto.legenda.trim()) faltas.push('a legenda');
  if (texto.tipo === 'disponibilidade' && (!texto.inicio || !texto.fim)) faltas.push('as datas livres');
  if (texto.tipo === 'oferta' && !texto.passeioId) faltas.push('o passeio');
  if (!direitos) faltas.push('a confirmação de direitos');
  const podePublicar = !!autor && !ocupado && !publicando && !faltas.length && itens.every(i => i.fase === 'pronto');

  async function publicar() {
    if (!autor || !podePublicar) return;
    setPublicando(true);
    setErro('');
    try {
      const slug = await publicarRedeEDA(autor.id, idRef.current, textoRef.current, autor.nome);
      try { localStorage.removeItem(chaveLocal); } catch { /* ok */ }
      setPublicado(slug);
      onPublicado?.();
    } catch (e) {
      setErro(erroPostarEDA(e));
    } finally {
      setPublicando(false);
    }
  }

  function novaPublicacao() {
    itens.forEach(i => { if (i.previa.startsWith('blob:')) URL.revokeObjectURL(i.previa); });
    idRef.current = crypto.randomUUID();
    existeRef.current = false;
    setItens([]);
    setTexto(TEXTO_INICIAL);
    setDireitos(false);
    setPublicado(null);
    setSalvo('');
  }

  if (erroAutor) {
    return (
      <section className="pr-eda eda-card" aria-label="Publicar na Rede EDA">
        <p className="pr-aviso" role="alert">{erroAutor}</p>
        {modo === 'guia' && <Link className="eda-botao" href="/guia/perfil">Completar meu perfil</Link>}
      </section>
    );
  }

  if (publicado) {
    return (
      <section className="pr-eda eda-card" aria-live="polite">
        <p className="pr-ok">Publicado na Rede EDA.</p>
        <div className="pr-acoes">
          <Link className="eda-botao" href={`/rede/publicacao/${encodeURIComponent(publicado)}`} target="_blank">Ver na Rede</Link>
          <button type="button" className="eda-botao" onClick={novaPublicacao}>Nova publicação</button>
        </div>
      </section>
    );
  }

  const tipos = TIPOS[modo];

  return (
    <section id="postar-rede-eda" className="pr-eda eda-card" aria-label="Publicar na Rede EDA">
      <header className="pr-topo">
        <span className="pr-avatar" aria-hidden="true">{(autor?.nome || 'E').slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0">
          <b className="pr-nome">{autor?.nome ?? 'Carregando…'}</b>
          <small className="pr-sub">
            Publicar na Rede EDA
            {salvo === 'salvando' && ' · salvando…'}
            {salvo === 'salvo' && ' · rascunho salvo'}
          </small>
        </div>
      </header>

      {autor && !autor.publicado && (
        <p className="pr-aviso">Seu perfil público ainda não está publicado. Publique o perfil para a postagem aparecer na Rede.</p>
      )}

      <div className="pr-tipos" role="radiogroup" aria-label="Tipo de publicação">
        {tipos.map(t => (
          <button key={t.valor} type="button" role="radio" aria-checked={texto.tipo === t.valor}
            className={texto.tipo === t.valor ? 'eda-botao-ativo' : 'eda-botao'} onClick={() => mudarTipo(t.valor)}>
            {t.rotulo}
          </button>
        ))}
      </div>

      {texto.tipo === 'disponibilidade' && (
        <div className="pr-datas">
          <label>De
            <input type="date" min={hojeManaus()} value={texto.inicio ?? ''} onChange={e => mudarData('inicio', e.target.value)} />
          </label>
          <label>Até
            <input type="date" min={texto.inicio ?? hojeManaus()} value={texto.fim ?? ''} onChange={e => mudarData('fim', e.target.value)} />
          </label>
          <small>Operadoras e visitantes veem que você está livre. Dias em que você já está escalado não podem entrar.</small>
        </div>
      )}

      {texto.tipo === 'oferta' && (
        <label className="pr-campo">Passeio
          <select value={texto.passeioId ?? ''} onChange={e => setTexto(t => ({ ...t, passeioId: e.target.value || null }))}>
            <option value="">Escolha o passeio publicado</option>
            {passeios.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </label>
      )}

      <div className="pr-grade">
        {itens.map(item => (
          <figure key={item.chave} className="pr-midia" data-fase={item.fase}>
            {item.previa
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={item.previa} alt="" />
              : <span className="pr-midia-vazio">Vídeo</span>}
            {item.tipo === 'video' && <span className="pr-selo">Vídeo</span>}
            {item.fase !== 'pronto' && (
              <figcaption className="pr-estado">
                {item.fase === 'fila' && 'Na fila'}
                {item.fase === 'reduzindo' && `Preparando vídeo ${item.progresso}%`}
                {item.fase === 'enviando' && `Enviando ${item.progresso}%`}
                {item.fase === 'erro' && (
                  <>
                    <span>{item.erro}</span>
                    <button type="button" className="eda-botao" onClick={() => tentarDeNovo(item)}>Tentar de novo</button>
                  </>
                )}
                {(item.fase === 'reduzindo' || item.fase === 'enviando') && (
                  <span className="pr-barra"><i style={{ width: `${item.progresso}%` }} /></span>
                )}
              </figcaption>
            )}
            <button type="button" className="pr-remover" aria-label="Remover" onClick={() => void remover(item)}>×</button>
          </figure>
        ))}
        {itens.length < 10 && (
          <label className="pr-adicionar">
            <input ref={entrada} type="file" multiple
              accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/webm,video/quicktime"
              onChange={e => void escolher(e.target.files)} disabled={!autor} />
            <span>{itens.length ? 'Adicionar' : 'Fotos e vídeos'}</span>
            <small>Vídeo até {VIDEO_MAX_SEGUNDOS} s</small>
          </label>
        )}
      </div>

      <label className="pr-campo">Legenda
        <span className="pr-legenda">
          <textarea rows={3} maxLength={4000} value={texto.legenda}
            placeholder={texto.tipo === 'disponibilidade' ? 'Escolha as datas: eu escrevo a legenda para você.' : 'Conte o que está acontecendo…'}
            onChange={e => setTexto(t => ({ ...t, legenda: e.target.value }))} />
          <button type="button" className={ouvindo ? 'eda-botao-ativo' : 'eda-botao'} onClick={ditar} aria-pressed={ouvindo}>
            {ouvindo ? 'Ouvindo…' : 'Falar'}
          </button>
        </span>
      </label>

      <label className="pr-campo">Local (opcional)
        <CampoLocalEDA modo="cidade" valor={{ texto: texto.localidade }} placeholder="Ex.: Barcelos, Rio Negro — AM"
          onChange={l => setTexto(t => ({ ...t, localidade: l.texto }))} />
      </label>

      <label className="pr-direitos">
        <input type="checkbox" checked={direitos} onChange={e => setDireitos(e.target.checked)} />
        Confirmo que tenho os direitos das fotos e vídeos e a autorização das pessoas que aparecem.
      </label>

      {erro && <p className="pr-aviso" role="alert">{erro}</p>}

      <div className="pr-acoes">
        <button type="button" className="eda-botao" disabled={!podePublicar} onClick={() => void publicar()}>
          {publicando ? 'Publicando…' : ocupado ? 'Aguardando envio…' : 'Publicar agora'}
        </button>
        {!podePublicar && !ocupado && !publicando && faltas.length > 0 && (
          <small className="pr-falta">Falta: {faltas.join(', ')}.</small>
        )}
      </div>
    </section>
  );
}

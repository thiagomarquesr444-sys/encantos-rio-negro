'use client';

// EDA_IA_CONVERSA_V1 (V2: sem chips/perguntas sugeridas — a própria EDA conduz a conversa)
// "Pergunte à EDA": conversa com IA real (texto livre) dentro da gestão,
// nas páginas Painel, Passeios, Reservas, Demandas e Financeiro.
// Botão discreto flutuante + painel compacto; não altera o layout das páginas.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TextoDigitadoIA from './TextoDigitadoIA';
import IconeEDA from './IconeEDA';
import './conversa-eda.css';

type LinkEDA = { href: string; rotulo: string };
type Msg = { papel: 'usuario' | 'eda'; texto: string; links?: LinkEDA[] };

// Só caminhos internos da plataforma.
const linkSeguro = (l: LinkEDA) => typeof l?.href === 'string' && /^\/[a-z]/.test(l.href) && !l.href.startsWith('//') && typeof l.rotulo === 'string';

const PAGINAS: [string, string][] = [
  ['/dashboard', 'painel'], ['/passeios', 'passeios'], ['/reservas', 'reservas'],
  ['/demandas', 'demandas'], ['/financeiro', 'financeiro'], ['/clientes', 'clientes'],
  ['/hospedagens', 'hospedagens'], ['/configuracoes', 'configuracoes'], ['/embarcacoes', 'embarcacoes'],
  ['/guias', 'guias'], ['/parceiros', 'parceiros'], ['/relatorios', 'relatorios'],
  ['/vouchers', 'vouchers'], ['/documentos', 'documentos'], ['/fiscal', 'fiscal'], ['/planos', 'planos'],
];

export function periodoManaus(): 'madrugada' | 'manha' | 'tarde' | 'noite' {
  const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Manaus' }).format(new Date())) % 24;
  return h < 5 ? 'madrugada' : h < 12 ? 'manha' : h < 18 ? 'tarde' : 'noite';
}

function boasVindas(): string {
  const p = periodoManaus();
  if (p === 'madrugada') {
    const op = [
      'Boa noite! O rio está quieto a esta hora, mas eu sigo de vigia por aqui. 🌙 Quer que eu confira o que fica pronto para amanhã?',
      'Madrugada de trabalho, hein? Fico com você. Me pergunte qualquer coisa da operação que eu busco rapidinho.',
      'Boa noite! Enquanto Barcelos dorme, posso adiantar o essencial: saídas de amanhã, pendências ou o caixa. Por onde começamos?',
    ];
    return op[new Date().getDate() % op.length];
  }
  const s = p === 'manha' ? 'Bom dia' : p === 'tarde' ? 'Boa tarde' : 'Boa noite';
  const op = [
    `${s}! Aqui é a EDA, sua parceira na operação. Pode perguntar do seu jeito — eu olho os dados da sua operadora e te respondo rapidinho.`,
    `${s}! EDA na área. Quer saber como está o dia, o caixa ou alguma reserva? É só me chamar.`,
    `${s}! Que bom te ver por aqui. Me diz o que você precisa que eu procuro na plataforma para você.`,
  ];
  return op[new Date().getMinutes() % op.length];
}

// Negrito simples (**texto**) sem HTML: o React escapa todo o conteúdo.
function formatar(texto: string): ReactNode[] {
  return texto.split('\n').map((linha, i) => (
    <span key={i} className="cv-eda-linha">
      {linha.split(/(\*\*[^*]+\*\*)/g).map((parte, j) =>
        parte.startsWith('**') && parte.endsWith('**') ? <b key={j}>{parte.slice(2, -2)}</b> : parte.replace(/^\s*[*-]\s+/, '• '),
      )}
    </span>
  ));
}

export default function ConversaEDA() {
  const pathname = usePathname() ?? '';
  const pagina = PAGINAS.find(([r]) => pathname === r || pathname.startsWith(`${r}/`))?.[1];
  const [aberto, setAberto] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [entrada, setEntrada] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [animando, setAnimando] = useState<number | null>(null);
  const [estilo, setEstilo] = useState<'regional' | 'formal'>('regional');
  useEffect(() => { try { if (localStorage.getItem('eda.estilo') === 'formal') setEstilo('formal'); } catch {} }, []);
  const fimRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (aberto && !msgs.length) setMsgs([{ papel: 'eda', texto: boasVindas() }]); }, [aberto, msgs.length]);
  useEffect(() => { fimRef.current?.scrollIntoView({ block: 'end' }); }, [msgs, enviando]);
  useEffect(() => {
    if (!aberto) return;
    campoRef.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [aberto]);

  // EDA_RECEPCAO_V2: o painel chama a EDA já com a recepção como primeira fala.
  useEffect(() => {
    const abrir = (e: Event) => {
      const texto = (e as CustomEvent<{ texto?: string }>).detail?.texto;
      setMsgs(m => (m.length ? m : [{ papel: 'eda', texto: typeof texto === 'string' && texto.trim() ? texto.trim().slice(0, 400) : boasVindas() }]));
      setAberto(true);
    };
    window.addEventListener('eda:abrir', abrir);
    return () => window.removeEventListener('eda:abrir', abrir);
  }, []);

  // EDA_AUDIO_V1: grava áudio (até 60 s); o servidor transcreve (Whisper/Groq, sem guardar
  // o áudio) e o texto vai para a EDA como se tivesse sido escrito.
  const [gravando, setGravando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [erroAudio, setErroAudio] = useState<string | null>(null);
  const [audioOk, setAudioOk] = useState(false);
  const gravadorRef = useRef<MediaRecorder | null>(null);
  const fluxoRef = useRef<MediaStream | null>(null);
  const pedacosRef = useRef<Blob[]>([]);
  const cancelarRef = useRef(false);
  const relogioRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enviarRef = useRef<(v: string) => void>(() => undefined);
  useEffect(() => {
    setAudioOk(typeof window.MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia);
    return () => liberarMic();
  }, []);
  useEffect(() => { if (!aberto && gravadorRef.current?.state === 'recording') pararAudio(true); }, [aberto]);

  function liberarMic() {
    if (relogioRef.current) { clearInterval(relogioRef.current); relogioRef.current = null; }
    fluxoRef.current?.getTracks().forEach(f => f.stop());
    fluxoRef.current = null;
  }

  async function iniciarAudio() {
    if (gravando || transcrevendo || enviando) return;
    setErroAudio(null);
    try {
      const fluxo = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      fluxoRef.current = fluxo;
      const tipo = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(x => MediaRecorder.isTypeSupported?.(x));
      const g = new MediaRecorder(fluxo, tipo ? { mimeType: tipo, audioBitsPerSecond: 32000 } : undefined);
      pedacosRef.current = [];
      cancelarRef.current = false;
      g.ondataavailable = e => { if (e.data.size) pedacosRef.current.push(e.data); };
      g.onstop = () => {
        liberarMic();
        setGravando(false);
        const blob = new Blob(pedacosRef.current, { type: g.mimeType || tipo || 'audio/webm' });
        pedacosRef.current = [];
        if (cancelarRef.current || blob.size < 800) return;
        void transcrever(blob);
      };
      gravadorRef.current = g;
      g.start(250);
      setSegundos(0);
      setGravando(true);
      if (navigator.vibrate) navigator.vibrate(30);
      let n = 0;
      relogioRef.current = setInterval(() => { n += 1; setSegundos(n); if (n >= 60) pararAudio(false); }, 1000);
    } catch {
      liberarMic();
      setErroAudio('Não consegui acessar o microfone. Confira a permissão no navegador.');
    }
  }

  function pararAudio(cancelar: boolean) {
    cancelarRef.current = cancelar;
    const g = gravadorRef.current;
    if (g && g.state !== 'inactive') g.stop();
    else { liberarMic(); setGravando(false); }
  }

  async function transcrever(blob: Blob) {
    setTranscrevendo(true);
    try {
      const corpo = new FormData();
      corpo.append('audio', blob, 'audio');
      corpo.append('idioma', 'PT');
      const r = await fetch('/api/iara-audio', { method: 'POST', body: corpo });
      const j = await r.json().catch(() => ({})) as { texto?: string; erro?: string };
      if (!r.ok || !j.texto) { setErroAudio(j.erro || 'Não consegui entender o áudio. Pode escrever?'); return; }
      enviarRef.current(j.texto);
    } catch {
      setErroAudio('Não consegui entender o áudio. Pode escrever?');
    } finally {
      setTranscrevendo(false);
    }
  }

  if (!pagina) return null;

  async function enviar(valor: string) {
    const texto = valor.trim().slice(0, 1000);
    if (!texto || enviando) return;
    const historico: Msg[] = [...msgs, { papel: 'usuario', texto }];
    setMsgs(historico);
    setEntrada('');
    setEnviando(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
      const r = await fetch('/api/eda-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ modo: 'operadora', pagina, estilo, mensagens: historico.slice(-12).map(({ papel, texto }) => ({ papel, texto })) }),
      });
      const j = await r.json().catch(() => ({})) as { resposta?: string; erro?: string; links?: LinkEDA[] };
      const links = Array.isArray(j.links) ? j.links.filter(linkSeguro).slice(0, 3) : [];
      setAnimando(historico.length);
      setMsgs(m => [...m, { papel: 'eda', texto: j.resposta || j.erro || 'Não consegui responder agora. Tente de novo em instantes.', links }]);
    } catch (e) {
      setMsgs(m => [...m, { papel: 'eda', texto: e instanceof Error && e.message.includes('sessão') ? e.message : 'Sem conexão com a EDA agora. Confira a internet e tente de novo.' }]);
    } finally {
      setEnviando(false);
    }
  }

  enviarRef.current = (v: string) => { void enviar(v); };

  return (
    <div className="cv-eda" data-aberto={aberto || undefined}>
      {aberto && (
        <section className="cv-eda-painel" role="dialog" aria-label="Conversa com a EDA">
          <header className="cv-eda-topo">
            <span className="cv-eda-avatar" aria-hidden="true"><IconeEDA /></span>
            <div>
              <p className="cv-eda-nome">EDA</p>
              <p className="cv-eda-status">{periodoManaus() === 'madrugada' ? 'De vigia na madrugada' : 'Lendo os dados da sua operadora'}</p>
            </div>
            <button
              type="button"
              className="cv-eda-estilo"
              aria-pressed={estilo === 'formal'}
              title="Alternar entre jeito regional e linguagem formal"
              onClick={() => setEstilo(e => { const n = e === 'regional' ? 'formal' : 'regional'; try { localStorage.setItem('eda.estilo', n); } catch {} return n; })}
            >{estilo === 'regional' ? 'Jeito regional' : 'Formal'}</button>
            <button type="button" className="cv-eda-x" onClick={() => setAberto(false)} aria-label="Fechar conversa">×</button>
          </header>

          <div className="cv-eda-lista" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`cv-eda-bloco cv-eda-bloco-${m.papel}`}>
                <p className={`cv-eda-msg cv-eda-${m.papel}`}>
                  {m.papel === 'eda'
                    ? <TextoDigitadoIA texto={m.texto} animar={animando === i} render={formatar} aoTerminar={() => setAnimando(a => (a === i ? null : a))} />
                    : formatar(m.texto)}
                </p>
                {animando !== i && !!m.links?.length && (
                  <div className="cv-eda-links">
                    {m.links.map(l => <Link key={l.href} href={l.href} onClick={() => setAberto(false)}>{l.rotulo} →</Link>)}
                  </div>
                )}
              </div>
            ))}
            {enviando && <p className="cv-eda-msg cv-eda-eda cv-eda-pensando" aria-label="EDA pensando"><i /><i /><i /></p>}
            <div ref={fimRef} />
          </div>

          {erroAudio && <p className="cv-eda-erro" role="alert">{erroAudio}</p>}
          <form className="cv-eda-form" onSubmit={e => { e.preventDefault(); void enviar(entrada); }}>
            {gravando ? (
              <>
                <button type="button" className="cv-eda-cancelar" onClick={() => pararAudio(true)} aria-label="Cancelar gravação" title="Cancelar gravação">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 7h12M9.5 7V5h5v2M8 7l.8 12h6.4L16 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <div className="cv-eda-audio" role="status" aria-live="polite">
                  <span className="cv-eda-rec" aria-hidden="true" />
                  <span>Gravando…</span>
                  <span className="cv-eda-tempo">{`0:${String(segundos).padStart(2, '0')}`}</span>
                  <span className="cv-eda-onda" aria-hidden="true"><i /><i /><i /><i /><i /></span>
                </div>
                <button type="button" onClick={() => pararAudio(false)} aria-label="Parar e enviar" title="Parar e enviar">➤</button>
              </>
            ) : transcrevendo ? (
              <div className="cv-eda-audio" role="status" aria-live="polite">
                <span className="cv-eda-onda" aria-hidden="true"><i /><i /><i /><i /><i /></span>
                <span>Ouvindo seu áudio…</span>
              </div>
            ) : (
              <>
                <textarea
                  ref={campoRef}
                  rows={1}
                  value={entrada}
                  maxLength={1000}
                  placeholder="Pergunte à EDA…"
                  aria-label="Mensagem para a EDA"
                  onChange={e => { setEntrada(e.target.value); if (erroAudio) setErroAudio(null); }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void enviar(entrada); } }}
                />
                {audioOk && !entrada.trim() ? (
                  <button type="button" onClick={() => void iniciarAudio()} disabled={enviando} aria-label="Gravar áudio" title="Gravar áudio">
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                  </button>
                ) : (
                  <button type="submit" disabled={enviando || !entrada.trim()} aria-label="Enviar">➤</button>
                )}
              </>
            )}
          </form>
          <p className="cv-eda-nota">A EDA lê só dados da sua operadora. Dados pessoais de clientes (nome, CPF, contato, saúde) não saem da plataforma — LGPD.</p>
        </section>
      )}

      {/* EDA_LANCADOR_V2: botão redondo igual ao da Iara, canto superior direito. */}
      <button
        type="button"
        className="cv-eda-botao"
        onClick={() => setAberto(v => !v)}
        aria-expanded={aberto}
        aria-label={aberto ? 'Fechar conversa com a EDA' : 'Pergunte à EDA'}
        title="Pergunte à EDA"
      >
        <IconeEDA />
      </button>
    </div>
  );
}

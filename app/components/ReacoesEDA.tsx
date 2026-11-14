'use client';

// EDA_REACOES_V1 — Reações amazônicas do feed.
// Toque rápido = "Quero ir!" (o arco dispara a flecha). Segurar / passar o
// mouse / botão ▾ abre as outras: arco (Que lindeza), boto (Me encantei),
// tucunaré (Pai d'égua!) e maracá (Cultura viva).
// São apenas reações: medem interesse e destacam os passeios mais procurados.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { REACOES, ReacaoSemLogin, carregarReacoes, definirReacao, type EstadoReacoes, type Reacao } from '@/lib/reacoesEDA';
import './reacoes-eda.css';

type Idioma = 'PT' | 'EN' | 'ES';
const ROTULOS: Record<Idioma, Record<Reacao, string> & { mais: string; nota: string; entrar: string; erro: string }> = {
  PT: { quero_ir: 'Quero ir!', lindeza: 'Que lindeza', encantei: 'Me encantei', pai_degua: "Pai d'égua!", cultura: 'Cultura viva', mais: 'Mais reações', nota: 'Reações mostram interesse — não são reservas.', entrar: 'Entre para reagir', erro: 'Não deu certo agora.' },
  EN: { quero_ir: 'I want to go!', lindeza: 'So lovely', encantei: 'Enchanted', pai_degua: "Pai d'égua! (awesome)", cultura: 'Living culture', mais: 'More reactions', nota: 'Reactions show interest — they are not bookings.', entrar: 'Sign in to react', erro: 'Something went wrong.' },
  ES: { quero_ir: '¡Quiero ir!', lindeza: 'Qué belleza', encantei: 'Me encanté', pai_degua: "¡Pai d'égua! (genial)", cultura: 'Cultura viva', mais: 'Más reacciones', nota: 'Las reacciones muestran interés — no son reservas.', entrar: 'Inicia sesión para reaccionar', erro: 'No funcionó ahora.' },
};

/** EDA_REACAO_ARCO_V1 — "Quero ir!": o arco dispara a flecha (anima quando ativo). */
export function ArcoLancaEDA({ ativo, tamanho = 30 }: { ativo: boolean; tamanho?: number }) {
  return (
    <svg className={`eda-arco-lanca${ativo ? ' eda-arco-lanca-ativo' : ''}`} width={tamanho} height={tamanho} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="eda-arco-madeira" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c58a46" /><stop offset="1" stopColor="#7a4515" /></linearGradient>
      </defs>
      {/* arco */}
      <path d="M14 6 Q 32 24 14 42" fill="none" stroke="#3b230d" strokeWidth="4" strokeLinecap="round" />
      <path d="M14 6 Q 32 24 14 42" fill="none" stroke="url(#eda-arco-madeira)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="21.6" cy="24" r="1.6" fill="#e3a144" />
      {/* corda (estica e solta) */}
      <path className="eda-arco-corda" d="M14 6 L 14 42" fill="none" stroke="#f5f3ea" strokeWidth="1" />
      {/* flecha */}
      <g className="eda-arco-flecha">
        <line x1="8" y1="24" x2="40" y2="24" stroke="#d7b98a" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M40 24 l-5 -3.2 v6.4 Z" fill="#e3a144" stroke="#7a4515" strokeWidth=".6" />
        <path d="M8 24 l-3 -3 M8 24 l-3 3 M11 24 l-3 -3 M11 24 l-3 3" stroke="#c8402f" strokeWidth="1.4" strokeLinecap="round" />
      </g>
      {/* rastro */}
      <g className="eda-arco-rastro" stroke="#f4c77e" strokeWidth="1.2" strokeLinecap="round">
        <line x1="22" y1="20" x2="30" y2="20" /><line x1="20" y1="28" x2="28" y2="28" />
      </g>
    </svg>
  );
}

export function IconeReacao({ r, ativo }: { r: Reacao; ativo: boolean }) {
  if (r === 'quero_ir') return <ArcoLancaEDA ativo={ativo} />;
  if (r === 'pai_degua') return <span className={`eda-reacao-tucunare${ativo ? ' eda-reacao-pulo' : ''}`} aria-hidden="true" />;
  const src = r === 'lindeza' ? '/images/marcos/arco-sao-gabriel.svg' : r === 'encantei' ? '/images/fauna/boto-reacao.webp' : '/images/marcos/maraca-reacao.svg';
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={`eda-reacao-img${ativo ? ' eda-reacao-pulo' : ''}`} src={src} alt="" width={30} height={22} draggable={false} />;
}

export default function ReacoesEDA({ publicacaoId, idioma = 'PT', desativado = false }: { publicacaoId: string; idioma?: Idioma; desativado?: boolean }) {
  const t = ROTULOS[idioma];
  const [estado, setEstado] = useState<EstadoReacoes | null>(null);
  const [aberto, setAberto] = useState(false);
  const [aviso, setAviso] = useState<'login' | 'erro' | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const pressao = useRef<ReturnType<typeof setTimeout> | null>(null);
  const segurou = useRef(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => { let ativo = true; void carregarReacoes(publicacaoId).then(e => { if (ativo) setEstado(e); }); return () => { ativo = false; }; }, [publicacaoId]);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => { if (!caixa.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('pointerdown', fora); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', fora); document.removeEventListener('keydown', esc); };
  }, [aberto]);

  async function reagir(r: Reacao | null) {
    if (!estado || ocupado || desativado) return;
    const anterior = estado;
    const contagens = { ...estado.contagens };
    if (estado.minha) contagens[estado.minha] = Math.max(0, contagens[estado.minha] - 1);
    if (r) contagens[r] += 1;
    setEstado({ minha: r, contagens });
    setAberto(false); setAviso(null); setOcupado(true);
    try { await definirReacao(publicacaoId, r); }
    catch (e) { setEstado(anterior); setAviso(e instanceof ReacaoSemLogin ? 'login' : 'erro'); }
    finally { setOcupado(false); }
  }

  // Toque rápido: "Quero ir!" (ou desfaz a reação atual).
  const toquePrincipal = () => { if (segurou.current) { segurou.current = false; return; } void reagir(estado?.minha ? null : 'quero_ir'); };
  const iniciarPressao = () => { segurou.current = false; pressao.current = setTimeout(() => { segurou.current = true; setAberto(true); }, 450); };
  const cancelarPressao = () => { if (pressao.current) clearTimeout(pressao.current); pressao.current = null; };

  const minha = estado?.minha ?? null;
  const total = estado ? REACOES.reduce((s, r) => s + estado.contagens[r], 0) : 0;
  const top = estado ? REACOES.filter(r => estado.contagens[r] > 0).sort((a, b) => estado.contagens[b] - estado.contagens[a]).slice(0, 3) : [];

  return (
    <div className="eda-reacoes" ref={caixa} onMouseLeave={() => setAberto(false)}>
      <button
        type="button"
        className="eda-reacoes-principal"
        aria-pressed={!!minha}
        disabled={desativado || !estado || ocupado}
        title={t.nota}
        onClick={toquePrincipal}
        onPointerDown={iniciarPressao}
        onPointerUp={cancelarPressao}
        onPointerLeave={cancelarPressao}
        onContextMenu={e => e.preventDefault()}
      >
        <IconeReacao r={minha ?? 'quero_ir'} ativo={!!minha} />
        <span>{t[minha ?? 'quero_ir']}</span>
      </button>
      <button type="button" className="eda-reacoes-mais" aria-label={t.mais} aria-expanded={aberto} disabled={desativado || !estado} onClick={() => setAberto(v => !v)} onMouseEnter={() => setAberto(true)}>▾</button>

      {total > 0 && (
        <span className="eda-reacoes-resumo" aria-label={REACOES.filter(r => estado!.contagens[r]).map(r => `${t[r]}: ${estado!.contagens[r]}`).join(', ')}>
          {top.map(r => <span key={r} className="eda-reacoes-mini"><IconeReacao r={r} ativo={false} /></span>)}
          <b>{total}</b>
        </span>
      )}

      {aberto && (
        <div className="eda-reacoes-menu" role="menu" aria-label={t.mais}>
          <div className="eda-reacoes-opcoes">
            {REACOES.map(r => (
              <button key={r} type="button" role="menuitemradio" aria-checked={minha === r} className="eda-reacoes-opcao" onClick={() => void reagir(minha === r ? null : r)}>
                <IconeReacao r={r} ativo={minha === r} />
                <span>{t[r]}</span>
                {!!estado?.contagens[r] && <small>{estado.contagens[r]}</small>}
              </button>
            ))}
          </div>
          <p className="eda-reacoes-nota">{t.nota}</p>
        </div>
      )}
      {aviso === 'login' && <Link className="eda-reacoes-aviso" href="/login">{t.entrar} →</Link>}
      {aviso === 'erro' && <span className="eda-reacoes-aviso" role="alert">{t.erro}</span>}
    </div>
  );
}

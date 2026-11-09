'use client';

// EDA_REACOES_V1 — Reações amazônicas do feed.
// Toque rápido = "Quero ir!" (o anzol fisga o tucunaré). Segurar / passar o
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

/** "Quero ir!": anzol que fisga o tucunaré (anima quando ativo). */
export function FisgarEDA({ ativo, tamanho = 30 }: { ativo: boolean; tamanho?: number }) {
  return (
    <svg className={`eda-fisgar${ativo ? ' eda-fisgar-ativo' : ''}`} width={tamanho} height={tamanho} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="eda-vara" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c58a46" /><stop offset="1" stop-color="#7a4515" /></linearGradient>
        <linearGradient id="eda-tucunare" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa63a" /><stop offset=".55" stop-color="#e3b23c" /><stop offset="1" stop-color="#f3d27a" /></linearGradient>
      </defs>
      {/* água */}
      <path className="eda-fisgar-agua" d="M2 40 q5 -3 10 0 t10 0 t10 0 t10 0 t6 0" fill="none" stroke="#4fa3b8" strokeWidth="2" strokeLinecap="round" />
      {/* vara e linha */}
      <path d="M4 4 Q 22 2 34 12" fill="none" stroke="#3b230d" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M4 4 Q 22 2 34 12" fill="none" stroke="url(#eda-vara)" strokeWidth="2.2" strokeLinecap="round" />
      <g className="eda-fisgar-linha-anzol">
        <line className="eda-fisgar-linha" x1="34" y1="12" x2="34" y2="30" stroke="#f5f3ea" strokeWidth="1" />
        <path className="eda-fisgar-anzol" d="M34 30 v3 a2.5 2.5 0 0 1 -5 0" fill="none" stroke="#e3a144" strokeWidth="1.6" strokeLinecap="round" />
      </g>
      {/* tucunaré */}
      <g className="eda-fisgar-peixe">
        <path d="M22 37 q8 -6 16 0 q-8 6 -16 0 Z" fill="url(#eda-tucunare)" stroke="#3b3a0d" strokeWidth="1" />
        <path d="M22 37 l-5 -4 v8 Z" fill="#c8402f" stroke="#5a1d13" strokeWidth=".8" />
        <path d="M27 33.6 v6.8 M31 33 v8 M35 34 v6" stroke="#2a2a0b" strokeWidth="1.1" />
        <circle cx="36" cy="36" r="1" fill="#1a1205" />
        <circle cx="24.5" cy="37" r="1.3" fill="#2a2a0b" stroke="#e3a144" strokeWidth=".6" />
      </g>
      {/* respingos */}
      <g className="eda-fisgar-respingo" fill="#7cc4d4">
        <circle cx="26" cy="38" r="1.2" /><circle cx="40" cy="37" r="1" /><circle cx="33" cy="41" r="1.1" />
      </g>
    </svg>
  );
}

function IconeReacao({ r, ativo }: { r: Reacao; ativo: boolean }) {
  if (r === 'quero_ir') return <FisgarEDA ativo={ativo} />;
  if (r === 'pai_degua') return <span className={`eda-reacao-tucunare${ativo ? ' eda-reacao-pulo' : ''}`} aria-hidden="true" />;
  const src = r === 'lindeza' ? '/images/marcos/arco-sao-gabriel.svg' : r === 'encantei' ? '/images/fauna/boto-ern.png' : '/images/marcos/maraca-reacao.svg';
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

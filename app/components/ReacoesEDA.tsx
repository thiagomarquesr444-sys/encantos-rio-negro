'use client';

// EDA_REACOES_V1 → EDA_REACAO_UNICA_V1 — reação do feed público.
// Única reação: "Quero ir!" (o arco dispara a flecha). É só interesse:
// destaca os passeios mais procurados, não é reserva.
// IconeReacao continua exportado para o painel da operadora (histórico).

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ReacaoSemLogin, carregarReacoes, definirReacao, type EstadoReacoes, type Reacao } from '@/lib/reacoesEDA';
import './reacoes-eda.css';

type Idioma = 'PT' | 'EN' | 'ES';
const ROTULOS: Record<Idioma, Record<Reacao, string> & { mais: string; nota: string; entrar: string; erro: string }> = {
  PT: { quero_ir: 'Quero ir!', lindeza: 'Que lindeza', encantei: 'Me encantei', pai_degua: "Pai d'égua!", cultura: 'Cultura viva', mais: 'Mais reações', nota: '"Quero ir!" mostra interesse — não é reserva.', entrar: 'Entre para reagir', erro: 'Não deu certo agora.' },
  EN: { quero_ir: 'I want to go!', lindeza: 'So lovely', encantei: 'Enchanted', pai_degua: "Pai d'égua! (awesome)", cultura: 'Living culture', mais: 'More reactions', nota: '"I want to go!" shows interest — it is not a booking.', entrar: 'Sign in to react', erro: 'Something went wrong.' },
  ES: { quero_ir: '¡Quiero ir!', lindeza: 'Qué belleza', encantei: 'Me encanté', pai_degua: "¡Pai d'égua! (genial)", cultura: 'Cultura viva', mais: 'Más reacciones', nota: '"¡Quiero ir!" muestra interés — no es una reserva.', entrar: 'Inicia sesión para reaccionar', erro: 'No funcionó ahora.' },
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

// EDA_REACAO_UNICA_V1 (15/11/2026) — na rede pública só existe uma reação:
// o arco. Tocar em "Quero ir!" solta a flecha; tocar de novo desfaz.
// As demais reações (lindeza, boto, tucunaré, maracá) saíram do público;
// registros antigos continuam no banco e no painel da operadora.
export default function ReacoesEDA({ publicacaoId, idioma = 'PT', desativado = false }: { publicacaoId: string; idioma?: Idioma; desativado?: boolean }) {
  const t = ROTULOS[idioma];
  const [estado, setEstado] = useState<EstadoReacoes | null>(null);
  const [aviso, setAviso] = useState<'login' | 'erro' | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [voo, setVoo] = useState(0);
  const tempoVoo = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { let ativo = true; void carregarReacoes(publicacaoId).then(e => { if (ativo) setEstado(e); }); return () => { ativo = false; }; }, [publicacaoId]);
  useEffect(() => () => { if (tempoVoo.current) clearTimeout(tempoVoo.current); }, []);

  const marcado = estado?.minha === 'quero_ir';

  async function alternar() {
    if (!estado || ocupado || desativado) return;
    const anterior = estado;
    const proxima: Reacao | null = marcado ? null : 'quero_ir';
    const contagens = { ...estado.contagens };
    if (estado.minha) contagens[estado.minha] = Math.max(0, contagens[estado.minha] - 1);
    if (proxima) contagens[proxima] += 1;
    setEstado({ minha: proxima, contagens });
    setAviso(null); setOcupado(true);
    if (proxima) {
      // dispara a flecha (a key reinicia a animação a cada toque)
      setVoo(v => v + 1);
      if (tempoVoo.current) clearTimeout(tempoVoo.current);
      tempoVoo.current = setTimeout(() => setVoo(0), 1100);
    }
    try { await definirReacao(publicacaoId, proxima); }
    catch (e) { setEstado(anterior); setVoo(0); setAviso(e instanceof ReacaoSemLogin ? 'login' : 'erro'); }
    finally { setOcupado(false); }
  }

  const total = estado?.contagens.quero_ir ?? 0;

  return (
    <div className="eda-reacoes">
      <button
        type="button"
        className="eda-reacoes-principal"
        aria-pressed={marcado}
        disabled={desativado || !estado || ocupado}
        title={t.nota}
        onClick={() => void alternar()}
      >
        <ArcoLancaEDA key={voo} ativo={voo > 0} />
        <span>{t.quero_ir}</span>
        {total > 0 && <b className="eda-reacoes-total" aria-label={`${t.quero_ir}: ${total}`}>{total}</b>}
      </button>
      {aviso === 'login' && <Link className="eda-reacoes-aviso" href="/login">{t.entrar} →</Link>}
      {aviso === 'erro' && <span className="eda-reacoes-aviso" role="alert">{t.erro}</span>}
    </div>
  );
}

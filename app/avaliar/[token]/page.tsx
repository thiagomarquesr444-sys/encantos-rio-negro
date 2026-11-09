'use client';

// EDA_AVALIACAO_V1: o turista avalia a experiência pelo link que a operadora enviou.
// Sem conta, sem dado pessoal obrigatório; o link vale 30 dias e só uma resposta.

import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Info = { passeio: string; operadora: string; respondida: boolean; expirada: boolean };
const ROTULOS = ['', 'Não gostei', 'Poderia ser melhor', 'Foi bom', 'Muito bom', 'Inesquecível!'];

export default function AvaliarPage() {
  const params = useParams();
  const bruto = params?.token;
  const token = String((Array.isArray(bruto) ? bruto[0] : bruto) ?? '');
  const [info, setInfo] = useState<Info | null | undefined>(undefined);
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const [nome, setNome] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState<'form' | 'ok' | 'erro'>('form');

  useEffect(() => {
    if (!/^[0-9a-f]{36}$/.test(token)) { setInfo(null); return; }
    void supabase.rpc('avaliacao_por_token_eda', { p_token: token }).then(({ data }) => {
      const linha = Array.isArray(data) ? data[0] : null;
      setInfo(linha ? (linha as Info) : null);
    });
  }, [token]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nota || enviando) return;
    setEnviando(true);
    const { data, error } = await supabase.rpc('enviar_avaliacao_eda', { p_token: token, p_nota: nota, p_comentario: comentario, p_nome: nome });
    setEnviando(false);
    setEstado(!error && data === true ? 'ok' : 'erro');
  }

  if (info === undefined) return <main className="av"><p>Carregando…</p><Estilo /></main>;
  if (!info || info.expirada) return <main className="av"><h1>Link indisponível</h1><p>Este link expirou ou não é válido.</p><Estilo /></main>;
  if (info.respondida || estado === 'ok') {
    return (
      <main className="av">
        <p className="av-sobre">{info.operadora} · Encantos da Amazônia</p>
        <h1>Obrigado pela avaliação!</h1>
        <p>Sua opinião ajuda a {info.operadora} a cuidar ainda melhor de cada viagem pelo Rio Negro. Volte sempre. 🌿</p>
        <Estilo />
      </main>
    );
  }

  return (
    <main className="av">
      <p className="av-sobre">{info.operadora} · Encantos da Amazônia</p>
      <h1>Como foi sua experiência?</h1>
      <p className="av-passeio">{info.passeio}</p>
      <form onSubmit={enviar}>
        <fieldset className="av-notas" disabled={enviando}>
          <legend>Sua nota</legend>
          <div role="radiogroup" aria-label="Nota de 1 a 5">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" role="radio" aria-checked={nota === n} aria-label={`${n} de 5 — ${ROTULOS[n]}`}
                className={n <= nota ? 'on' : ''} onClick={() => setNota(n)}>★</button>
            ))}
          </div>
          <p className="av-rotulo" aria-live="polite">{nota ? ROTULOS[nota] : 'Toque nas estrelas'}</p>
        </fieldset>
        <label>Conte um pouco (opcional)
          <textarea maxLength={1000} rows={4} value={comentario} onChange={e => setComentario(e.target.value)} placeholder="O que mais marcou: o rio, o guia, a comida, a pescaria…" />
        </label>
        <label>Como quer aparecer (opcional)
          <input maxLength={60} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Ana, de São Paulo" />
        </label>
        <p className="av-nota">Sua avaliação pode ser exibida no portal Encantos da Amazônia, só com o nome que você escrever acima. Não coloque telefone, e-mail ou documentos.</p>
        {estado === 'erro' && <p role="alert" className="av-erro">Não consegui enviar. Tente de novo em instantes.</p>}
        <button type="submit" className="av-enviar" disabled={!nota || enviando}>{enviando ? 'Enviando…' : 'Enviar avaliação'}</button>
      </form>
      <Estilo />
    </main>
  );
}

function Estilo() {
  return (
    <style jsx global>{`
      .av { max-width: 560px; margin: 0 auto; padding: 40px 18px 64px; min-height: 100dvh; color: #edede3; background: #0b1713; font-size: 15px; line-height: 1.6; font-family: system-ui, sans-serif; }
      .av h1 { margin: 6px 0 4px; font-size: 26px; line-height: 1.2; }
      .av-sobre { margin: 0; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: #e3a144; font-weight: 700; }
      .av-passeio { margin: 0 0 22px; color: #a9bdb2; font-weight: 600; }
      .av form { display: flex; flex-direction: column; gap: 16px; }
      .av fieldset { border: 0; padding: 0; margin: 0; }
      .av legend { font-size: 13px; color: #a9bdb2; margin-bottom: 6px; }
      .av-notas [role="radiogroup"] { display: flex; gap: 6px; }
      .av-notas button { width: 52px; height: 52px; font-size: 30px; line-height: 1; border-radius: 14px; border: 1px solid rgb(237 237 227 / 16%); background: rgb(255 255 255 / 4%); color: rgb(237 237 227 / 30%); cursor: pointer; transition: transform .12s ease; }
      .av-notas button.on { color: #f4c77e; border-color: #e3a144; background: rgb(227 161 68 / 12%); }
      .av-notas button:hover { transform: scale(1.06); }
      .av-notas button:focus-visible, .av-enviar:focus-visible { outline: 2px solid #f4c77e; outline-offset: 2px; }
      .av-rotulo { margin: 6px 0 0; font-size: 13px; color: #f4c77e; min-height: 1.4em; }
      .av label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #a9bdb2; }
      .av textarea, .av input { font: inherit; font-size: 15px; color: #edede3; background: rgb(0 0 0 / 22%); border: 1px solid rgb(237 237 227 / 16%); border-radius: 12px; padding: 10px 12px; }
      .av textarea:focus, .av input:focus { outline: none; border-color: #e3a144; }
      .av-nota { margin: 0; font-size: 12px; color: #8ea398; }
      .av-erro { margin: 0; color: #f0a08c; font-size: 13px; }
      .av-enviar { padding: 13px 18px; border-radius: 999px; border: 0; font: inherit; font-weight: 700; color: #1a1205; background: linear-gradient(180deg, #f7d595, #e3a144); cursor: pointer; }
      .av-enviar:disabled { opacity: .5; cursor: default; }
      @media (prefers-reduced-motion: reduce) { .av-notas button { transition: none; } }
    `}</style>
  );
}

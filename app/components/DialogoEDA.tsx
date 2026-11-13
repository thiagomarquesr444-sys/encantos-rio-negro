'use client';

// EDA_DIALOGO_V1: caixa de confirmação/pergunta/aviso com o monograma EDA.
// Fila: um diálogo por vez. Esc cancela, Enter confirma.

import { useEffect, useRef, useState } from 'react';
import { EVENTO_DIALOGO_EDA, type PedidoDialogoEDA } from '@/lib/dialogoEDA';

export default function DialogoEDA() {
  const [fila, setFila] = useState<PedidoDialogoEDA[]>([]);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const botaoOk = useRef<HTMLButtonElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const atual = fila[0];

  useEffect(() => {
    const ouvir = (e: Event) => {
      const d = (e as CustomEvent<PedidoDialogoEDA>).detail;
      if (d) setFila((f) => [...f, d]);
    };
    window.addEventListener(EVENTO_DIALOGO_EDA, ouvir);
    return () => window.removeEventListener(EVENTO_DIALOGO_EDA, ouvir);
  }, []);

  useEffect(() => {
    if (!atual) return;
    setTexto(atual.campo?.valor ?? ''); setErro('');
    const t = window.setTimeout(() => (atual.tipo === 'perguntar' ? campo.current : botaoOk.current)?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [atual]);

  if (!atual) return null;

  const fechar = (valor: boolean | string | null) => {
    atual.responder(valor);
    setFila((f) => f.slice(1));
  };
  const confirmar = () => {
    if (atual.tipo === 'perguntar') {
      const v = texto.trim();
      const min = atual.campo?.minimo ?? 0;
      if (v.length < min) { setErro(min > 1 ? `Escreva pelo menos ${min} caracteres.` : 'Preencha o campo.'); campo.current?.focus(); return; }
      fechar(v.slice(0, atual.campo?.maximo ?? 500));
    } else fechar(true);
  };
  const cancelar = () => fechar(atual.tipo === 'perguntar' ? null : atual.tipo === 'avisar' ? true : false);

  const titulo = atual.titulo ?? (atual.tipo === 'avisar' ? 'Aviso' : atual.tipo === 'perguntar' ? 'Precisamos de uma informação' : 'Confirmar ação');

  return (
    <div className="eda-dlg-fundo" onMouseDown={(e) => { if (e.target === e.currentTarget) cancelar(); }}>
      <div className={`eda-dlg ${atual.perigo ? 'eda-dlg-perigo' : ''}`} role="alertdialog" aria-modal="true" aria-labelledby="eda-dlg-t" aria-describedby="eda-dlg-m"
        onKeyDown={(e) => {
          if (e.key === 'Escape') { e.preventDefault(); cancelar(); }
          if (e.key === 'Enter' && !e.shiftKey && atual.tipo !== 'perguntar' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); confirmar(); }
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && atual.tipo === 'perguntar') { e.preventDefault(); confirmar(); }
        }}>
        <div className="eda-dlg-topo">
          <span className="eda-dlg-marca" aria-hidden="true">E</span>
          <span className="eda-dlg-eb">Encantos da Amazônia</span>
        </div>
        <h2 id="eda-dlg-t">{titulo}</h2>
        <p id="eda-dlg-m">{atual.mensagem}</p>
        {atual.tipo === 'perguntar' && (
          <label className="eda-dlg-campo">
            {atual.campo?.rotulo && <span>{atual.campo.rotulo}</span>}
            <textarea ref={campo} rows={3} value={texto} maxLength={atual.campo?.maximo ?? 500}
              placeholder={atual.campo?.placeholder} onChange={(e) => { setTexto(e.target.value); setErro(''); }} />
            {erro && <small role="alert">{erro}</small>}
          </label>
        )}
        <div className="eda-dlg-acoes">
          {atual.tipo !== 'avisar' && <button type="button" className="eda-dlg-bt" onClick={cancelar}>{atual.cancelar ?? 'Cancelar'}</button>}
          <button ref={botaoOk} type="button" className="eda-dlg-bt eda-dlg-ok" onClick={confirmar}>
            {atual.confirmar ?? (atual.tipo === 'avisar' ? 'Entendi' : 'Confirmar')}
          </button>
        </div>
      </div>
      <style>{`
        .eda-dlg-fundo{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:18px;
          background:rgba(4,10,8,.55);backdrop-filter:blur(4px);animation:eda-dlg-f .18s ease both}
        .eda-dlg{width:min(460px,100%);padding:20px 20px 16px;border-radius:22px;background:rgba(7,17,14,.97);color:#edede3;
          border:1px solid rgba(227,161,68,.55);box-shadow:0 24px 70px rgba(0,0,0,.45);font-family:var(--font-geist),system-ui,sans-serif;
          animation:eda-dlg-in .26s cubic-bezier(.2,.9,.3,1.15) both}
        .eda-dlg-perigo{border-color:rgba(248,113,113,.7)}
        .eda-dlg-topo{display:flex;align-items:center;gap:10px}
        .eda-dlg-marca{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;flex:none;
          background:linear-gradient(135deg,#e3a144,#b5762a);color:#07110e;font-weight:800;font-family:var(--font-fraunces),Georgia,serif;font-size:17px}
        .eda-dlg-eb{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#e3a144;font-weight:700}
        .eda-dlg h2{margin:14px 0 6px;font-size:19px;line-height:1.25;font-family:var(--font-fraunces),Georgia,serif;font-weight:700}
        .eda-dlg p{margin:0;font-size:14px;line-height:1.55;color:#c9d6cd;white-space:pre-line}
        .eda-dlg-campo{display:grid;gap:6px;margin-top:14px;font-size:12.5px;color:#a9bdb2}
        .eda-dlg-campo textarea{width:100%;resize:vertical;min-height:72px;padding:10px 12px;border-radius:12px;font:inherit;font-size:14px;
          color:#edede3;background:#0c1d17;border:1px solid rgba(237,237,227,.18);outline:none}
        .eda-dlg-campo textarea:focus{border-color:#e3a144;box-shadow:0 0 0 3px rgba(227,161,68,.2)}
        .eda-dlg-campo small{color:#f87171}
        .eda-dlg-acoes{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px;margin-top:18px}
        .eda-dlg-bt{min-height:42px;padding:0 18px;border-radius:999px;font:inherit;font-size:14px;font-weight:600;cursor:pointer;
          color:#edede3;background:transparent;border:1px solid rgba(237,237,227,.22)}
        .eda-dlg-bt:hover{background:rgba(237,237,227,.07)}
        .eda-dlg-bt:focus-visible{outline:2px solid #e3a144;outline-offset:2px}
        .eda-dlg-ok{color:#07110e;border-color:transparent;background:linear-gradient(180deg,#f7d595,#e3a144);box-shadow:0 6px 18px rgba(227,161,68,.26)}
        .eda-dlg-ok:hover{background:linear-gradient(180deg,#f9dca6,#e8a94f)}
        .eda-dlg-perigo .eda-dlg-ok{color:#fff;background:linear-gradient(180deg,#f87171,#dc2626);box-shadow:0 6px 18px rgba(220,38,38,.25)}
        @keyframes eda-dlg-f{from{opacity:0}}
        @keyframes eda-dlg-in{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:none}}
        @media (prefers-reduced-motion:reduce){.eda-dlg,.eda-dlg-fundo{animation:none}}
      `}</style>
    </div>
  );
}

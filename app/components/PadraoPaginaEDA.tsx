'use client';

// ERN_PADRAO_PAGINAS_EDA_V1
// Peças comuns das páginas de lista do painel da operadora: cabeçalho único,
// busca e filtros em pílula, status com cor e texto, painel lateral de
// detalhes e estado vazio. Cores por tema em padrao-paginas-eda.css.

import { useEffect, useId, useRef, type ReactNode } from 'react';
import './padrao-paginas-eda.css';
import './padrao-formularios-eda.css';
import './capa-eda.css';
import CartaoMagneticoEDA from './CartaoMagneticoEDA';

export type TomEDA = 'ok' | 'at' | 'er' | 'info' | 'nt';

export function PaginaEDA({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`eda-pg ${className}`}>{children}</div>;
}

// ERN_CAPA_EDA_V1: com `capa`, o cabeçalho vira a capa Encantos da Amazônia
// (grafismo + cartão magnético). No estilo Sóbrio volta a ser um cabeçalho simples.
export function CabecalhoEDA({ etiqueta, titulo, resumo, acoes, capa = false }: { etiqueta: string; titulo: string; resumo?: ReactNode; acoes?: ReactNode; capa?: boolean }) {
  const conteudo = (
    <>
      <div className="eda-pg-cabeca-txt">
        <p className="eda-pg-eb">{capa ? <><i className="eda-capa-traco" aria-hidden="true" />Encantos da Amazônia · {etiqueta}</> : etiqueta}</p>
        <h1>{titulo}</h1>
        {resumo && <p className="eda-pg-resumo">{resumo}</p>}
      </div>
      {acoes && <div className="eda-pg-acoes">{acoes}</div>}
    </>
  );
  if (capa) {
    return <CartaoMagneticoEDA as="header" forca={4} className="eda-pg-cabeca eda-capa">{conteudo}</CartaoMagneticoEDA>;
  }
  return <header className="eda-pg-cabeca">{conteudo}</header>;
}

export function PillEDA({ tom, children, ponto = true }: { tom: TomEDA; children: ReactNode; ponto?: boolean }) {
  return <span className={`eda-pg-pill eda-pg-${tom}`}>{ponto && <i aria-hidden="true" />}{children}</span>;
}

export function BuscaEDA({ id, valor, aoMudar, placeholder, rotulo }: { id: string; valor: string; aoMudar: (v: string) => void; placeholder: string; rotulo: string }) {
  return (
    <label htmlFor={id} className="eda-pg-busca">
      <span className="eda-pg-sr">{rotulo}</span>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
      <input id={id} type="search" value={valor} onChange={e => aoMudar(e.target.value)} placeholder={placeholder} autoComplete="off" />
    </label>
  );
}

export type OpcaoChipEDA<T extends string> = { valor: T; rotulo: string; qtd?: number };

export function ChipsEDA<T extends string>({ opcoes, valor, aoMudar, rotulo }: { opcoes: OpcaoChipEDA<T>[]; valor: T; aoMudar: (v: T) => void; rotulo: string }) {
  return (
    <div className="eda-pg-chips" role="group" aria-label={rotulo}>
      {opcoes.map(o => (
        <button key={o.valor} type="button" className="eda-pg-chip" aria-pressed={valor === o.valor} onClick={() => aoMudar(o.valor)}>
          {o.rotulo}{typeof o.qtd === 'number' && <span>{o.qtd}</span>}
        </button>
      ))}
    </div>
  );
}

export function VazioEDA({ titulo, texto, acao }: { titulo: string; texto?: string; acao?: ReactNode }) {
  return (
    <div className="eda-pg-vazio">
      <b>{titulo}</b>
      {texto && <p>{texto}</p>}
      {acao}
    </div>
  );
}

export function DadoEDA({ rotulo, children, largo = false }: { rotulo: string; children: ReactNode; largo?: boolean }) {
  return (
    <div className={`eda-pg-dado${largo ? ' eda-pg-dado-largo' : ''}`}>
      <dt>{rotulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

// Painel lateral de detalhes: abre à direita sem sair da lista.
export function PainelLateralEDA({
  titulo, etiqueta, subtitulo, aoFechar, bloqueado = false, children, rodape,
}: {
  titulo: string;
  etiqueta?: string;
  subtitulo?: ReactNode;
  aoFechar: () => void;
  bloqueado?: boolean;
  children: ReactNode;
  rodape?: ReactNode;
}) {
  const tituloId = useId();
  const caixa = useRef<HTMLDivElement>(null);
  const fechar = useRef(aoFechar);
  const travado = useRef(bloqueado);
  fechar.current = aoFechar;
  travado.current = bloqueado;

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    caixa.current?.focus();

    function teclado(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        if (!travado.current) fechar.current();
        return;
      }
      if (evento.key !== 'Tab' || !caixa.current) return;
      const lista: NodeListOf<HTMLElement> = caixa.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
      );
      const focaveis: HTMLElement[] = [];
      lista.forEach(el => { if (el.getClientRects().length > 0) focaveis.push(el); });
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (!primeiro || !ultimo) { evento.preventDefault(); return; }
      if (evento.shiftKey && (document.activeElement === primeiro || document.activeElement === caixa.current)) {
        evento.preventDefault(); ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault(); primeiro.focus();
      }
    }

    document.addEventListener('keydown', teclado);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', teclado);
      anterior?.focus();
    };
  }, []);

  return (
    <div className="eda-pg-lateral-fundo" onMouseDown={e => { if (e.target === e.currentTarget && !travado.current) fechar.current(); }}>
      <div ref={caixa} role="dialog" aria-modal="true" aria-labelledby={tituloId} aria-busy={bloqueado} tabIndex={-1} className="eda-pg-lateral">
        <div className="eda-pg-lateral-topo">
          <div className="eda-pg-lateral-titulo">
            {etiqueta && <p className="eda-pg-eb">{etiqueta}</p>}
            <h2 id={tituloId}>{titulo}</h2>
            {subtitulo && <p className="eda-pg-resumo">{subtitulo}</p>}
          </div>
          <button type="button" aria-label="Fechar detalhes" disabled={bloqueado} onClick={aoFechar} className="eda-pg-fechar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="eda-pg-lateral-corpo">{children}</div>
        {rodape && <div className="eda-pg-lateral-rodape">{rodape}</div>}
      </div>
    </div>
  );
}

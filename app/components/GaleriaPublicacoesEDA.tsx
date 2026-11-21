'use client';

/*
  EDA_GALERIA_PUBLICACOES_V1 — galeria das publicações (operadora, Comando EDA e Guia/Prático).
  Abas com contagem, cards com capa (2 colunas no celular), menu ⋯, desfazer no arquivar,
  busca, ordem por flechas, selo "esquecido" e limpeza de rascunhos parados há 30 dias.
*/
import './galeria-publicacoes-eda.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DIAS_APAGAR, DIAS_ESQUECIDO, carregarAutorRedeEDA, diasParado, duplicarRedeEDA, erroPostarEDA,
  excluirRascunhoRedeEDA, limparRascunhosEsquecidosEDA, listarGaleriaRedeEDA, mudarStatusRedeEDA, restaurarRedeEDA,
  type CardGaleriaEDA, type ModoAutorEDA,
} from '@/lib/postarRedeEDA';

type Aba = 'publicado' | 'rascunho' | 'arquivado';
const ABAS: { valor: Aba; rotulo: string }[] = [
  { valor: 'publicado', rotulo: 'Na Rede' },
  { valor: 'rascunho', rotulo: 'Rascunhos' },
  { valor: 'arquivado', rotulo: 'Arquivadas' },
];
const TIPO: Record<string, string> = {
  conteudo: 'Momento', oferta: 'Passeio', dica: 'Dica', evento: 'Evento', aviso: 'Aviso',
  roteiro: 'Roteiro', disponibilidade: 'Agenda livre',
};
const data = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Manaus', day: '2-digit', month: 'short' }).replace('.', '') : '';

type Aviso = { texto: string; desfazer?: () => Promise<void> } | null;

export default function GaleriaPublicacoesEDA({
  modo, atualizar = 0, onAbrir,
}: { modo: ModoAutorEDA; atualizar?: number; onAbrir: (id: string) => void }) {
  const [autorId, setAutorId] = useState('');
  const [cards, setCards] = useState<CardGaleriaEDA[]>([]);
  const [aba, setAba] = useState<Aba>('publicado');
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState<'recentes' | 'flechas'>('recentes');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [menu, setMenu] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);
  const limpou = useRef(false);

  const carregar = useCallback(async () => {
    setErro('');
    try {
      const autor = await carregarAutorRedeEDA(modo);
      setAutorId(autor.id);
      let lista = await listarGaleriaRedeEDA(autor.id);
      if (!limpou.current) {
        limpou.current = true;
        if (await limparRascunhosEsquecidosEDA(lista)) lista = await listarGaleriaRedeEDA(autor.id);
      }
      setCards(lista);
    } catch (e) {
      setErro(erroPostarEDA(e));
    } finally {
      setCarregando(false);
    }
  }, [modo]);

  useEffect(() => { void carregar(); }, [carregar, atualizar]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 7000);
    return () => clearTimeout(t);
  }, [aviso]);

  useEffect(() => {
    if (!menu) return;
    const fechar = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
      if (e instanceof MouseEvent && (e.target as HTMLElement).closest('.gp-menu, .gp-mais')) return;
      setMenu(null);
    };
    document.addEventListener('click', fechar);
    document.addEventListener('keydown', fechar);
    return () => { document.removeEventListener('click', fechar); document.removeEventListener('keydown', fechar); };
  }, [menu]);

  const contagem = useMemo(() => {
    const c: Record<Aba, number> = { publicado: 0, rascunho: 0, arquivado: 0 };
    cards.forEach(x => { if (x.status in c) c[x.status as Aba] += 1; });
    return c;
  }, [cards]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return cards
      .filter(c => c.status === aba)
      .filter(c => !termo || c.titulo.toLocaleLowerCase('pt-BR').includes(termo))
      .sort((a, b) => (ordem === 'flechas' && b.flechas !== a.flechas
        ? b.flechas - a.flechas
        : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
  }, [cards, aba, busca, ordem]);

  async function executar(card: CardGaleriaEDA, acao: () => Promise<void>, texto?: string, desfazer?: () => Promise<void>) {
    setMenu(null);
    setOcupado(card.id);
    setErro('');
    try {
      await acao();
      if (texto) setAviso({ texto, desfazer });
      await carregar();
    } catch (e) {
      setErro(erroPostarEDA(e));
    } finally {
      setOcupado(null);
    }
  }

  function abrir(card: CardGaleriaEDA) {
    if (card.status === 'rascunho') onAbrir(card.id);
    else setMenu(m => (m === card.id ? null : card.id));
  }

  return (
    <section className="gp-eda" aria-labelledby="gp-titulo">
      <div className="gp-cabeca">
        <h2 id="gp-titulo">Minhas publicações</h2>
        <div className="gp-filtros">
          <input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar pelo título" aria-label="Buscar pelo título" />
          <select value={ordem} onChange={e => setOrdem(e.target.value as 'recentes' | 'flechas')} aria-label="Ordem">
            <option value="recentes">Mais recentes</option>
            <option value="flechas">Mais flechas</option>
          </select>
        </div>
      </div>

      <div className="gp-abas" role="tablist">
        {ABAS.map(a => (
          <button key={a.valor} type="button" role="tab" aria-selected={aba === a.valor}
            className={aba === a.valor ? 'eda-botao-ativo' : 'eda-botao'} onClick={() => setAba(a.valor)}>
            {a.rotulo} <span className="gp-num">{contagem[a.valor]}</span>
          </button>
        ))}
      </div>

      {erro && <p className="gp-erro" role="alert">{erro}</p>}

      {carregando ? (
        <div className="gp-grade" aria-busy="true">
          {[0, 1, 2, 3].map(i => <div key={i} className="gp-card gp-esqueleto" />)}
        </div>
      ) : !visiveis.length ? (
        <p className="gp-vazio">
          {busca ? 'Nada encontrado com essa busca.'
            : aba === 'publicado' ? 'Nada na Rede ainda. Use o Postar acima.'
              : aba === 'rascunho' ? 'Sem rascunhos. Tudo em dia.' : 'Nenhuma publicação arquivada.'}
        </p>
      ) : (
        <ul className="gp-grade">
          {visiveis.map(card => {
            const parado = card.status === 'rascunho' ? diasParado(card) : 0;
            return (
              <li key={card.id} className="gp-card" data-ocupado={ocupado === card.id || undefined}>
                <button type="button" className="gp-capa" onClick={() => abrir(card)}
                  aria-label={card.status === 'rascunho' ? `Continuar "${card.titulo}"` : `Opções de "${card.titulo}"`}>
                  {card.capa
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={card.capa} alt="" loading="lazy" decoding="async" />
                    : <span className="gp-sem-foto">Sem foto ainda</span>}
                  <span className="gp-selos">
                    {card.videos > 0 && <span className="gp-selo">Vídeo</span>}
                    {card.fotos > 1 && <span className="gp-selo">{card.fotos} fotos</span>}
                    {parado >= DIAS_ESQUECIDO && (
                      <span className="gp-selo gp-selo-alerta">Esquecido · apaga em {Math.max(1, DIAS_APAGAR - parado)} d</span>
                    )}
                  </span>
                  <span className="gp-faixa">
                    <small>
                      {TIPO[card.tipo] ?? 'Publicação'} · {data(card.status === 'publicado' ? card.publicado_em : card.updated_at)}
                      {card.tipo === 'disponibilidade' && card.data_evento_inicio && ` · ${data(card.data_evento_inicio)}–${data(card.data_evento_fim)}`}
                    </small>
                    <b>{card.titulo}</b>
                    {card.status === 'publicado' && (
                      <small className="gp-flechas" title="Flechas “Quero ir!” recebidas">{card.flechas} {card.flechas === 1 ? 'flecha' : 'flechas'}</small>
                    )}
                  </span>
                </button>

                <button type="button" className="gp-mais" aria-label="Mais opções" aria-expanded={menu === card.id}
                  onClick={() => setMenu(m => (m === card.id ? null : card.id))}>⋯</button>

                {menu === card.id && (
                  <div className="gp-menu" role="menu">
                    {card.status === 'publicado' && (
                      <>
                        <a role="menuitem" href={`/rede/publicacao/${encodeURIComponent(card.slug)}`} target="_blank" rel="noopener">Ver na Rede</a>
                        <button role="menuitem" type="button" onClick={() => void executar(card, async () => {
                          await mudarStatusRedeEDA(card.id, 'rascunho');
                          onAbrir(card.id);
                        })}>Editar (sai da Rede)</button>
                        <button role="menuitem" type="button" onClick={() => void executar(card,
                          () => mudarStatusRedeEDA(card.id, 'arquivar'), 'Arquivada.',
                          () => restaurarRedeEDA(card.id))}>Arquivar</button>
                      </>
                    )}
                    {card.status === 'rascunho' && (
                      <>
                        <button role="menuitem" type="button" onClick={() => { setMenu(null); onAbrir(card.id); }}>Continuar e publicar</button>
                        <button role="menuitem" type="button" className="gp-perigo" onClick={() => void executar(card,
                          () => excluirRascunhoRedeEDA(card.id), 'Rascunho apagado.')}>Apagar rascunho</button>
                      </>
                    )}
                    {card.status === 'arquivado' && (
                      <button role="menuitem" type="button" onClick={() => void executar(card,
                        () => restaurarRedeEDA(card.id), 'De volta na Rede.',
                        () => mudarStatusRedeEDA(card.id, 'arquivar'))}>Restaurar na Rede</button>
                    )}
                    <button role="menuitem" type="button" onClick={() => void executar(card, async () => {
                      const novo = await duplicarRedeEDA(autorId, card.id);
                      setAba('rascunho');
                      onAbrir(novo);
                    }, 'Cópia criada nos rascunhos.')}>Duplicar</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {aviso && (
        <div className="gp-aviso" role="status">
          <span>{aviso.texto}</span>
          {aviso.desfazer && (
            <button type="button" onClick={() => {
              const d = aviso.desfazer!;
              setAviso(null);
              void (async () => {
                try { await d(); await carregar(); } catch (e) { setErro(erroPostarEDA(e)); }
              })();
            }}>Desfazer</button>
          )}
        </div>
      )}
    </section>
  );
}

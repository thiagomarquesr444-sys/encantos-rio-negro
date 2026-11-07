'use client';

// EDA_PASSEIOS_PORTAL_V1: vitrine pública dos passeios publicados pelas operadoras.

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  dataCurtaEDA,
  listarPasseiosPublicosEDA,
  passeioCombinaInteresseEDA,
  listarSaidasPasseioEDA,
  precoPasseioEDA,
  rotuloModalidadeEDA,
  whatsappPasseioEDA,
  type PasseioPublicoEDA,
  type SaidaPublicaEDA,
} from '@/lib/passeiosPublicosEDA';

type Props = {
  // EDA_EXPERIENCIAS_CONECTADAS_V1: filtro vindo dos cards de interesse.
  interesse?: string | null;
  rotuloInteresse?: string;
  onLimparInteresse?: () => void;
  slug?: string;
  titulo?: string;
  subtitulo?: string;
  compacta?: boolean;
  limite?: number;
  ocultarOperadora?: boolean;
  onVerTodos?: () => void;
};

// EDA_PASSEIOS_PREMIUM_V2: agenda real + pedido estruturado para a operadora.
function Agenda({ passeio }: { passeio: PasseioPublicoEDA }) {
  const [saidas, setSaidas] = useState<SaidaPublicaEDA[] | null>(null);
  const [erro, setErro] = useState(false);
  const [escolhida, setEscolhida] = useState<string>('');
  const [pessoas, setPessoas] = useState(Math.max(passeio.capacidade_minima || 1, 1));

  useEffect(() => {
    let ativo = true;
    setSaidas(null); setErro(false); setEscolhida('');
    listarSaidasPasseioEDA(passeio.id)
      .then((lista) => { if (ativo) setSaidas(lista); })
      .catch(() => { if (ativo) setErro(true); });
    return () => { ativo = false; };
  }, [passeio.id]);

  const saida = saidas?.find((s) => s.saida_id === escolhida) ?? null;
  const maximo = saida ? saida.vagas_restantes : 50;
  const qtd = Math.min(Math.max(pessoas, 1), Math.max(maximo, 1));
  const zap = whatsappPasseioEDA(passeio, saida, qtd);
  const lotadas = saidas?.length ? saidas.every((s) => s.vagas_restantes <= 0) : false;

  return (
    <div className="vp-agenda">
      <p className="vp-agenda-tit">Próximas saídas</p>
      {erro && <span className="vp-nota">Não foi possível carregar a agenda agora.</span>}
      {!saidas && !erro && <span className="vp-nota">Consultando agenda…</span>}
      {saidas && saidas.length === 0 && (
        <span className="vp-nota">A operadora informa as datas sob consulta. Envie seu pedido e ela responde com as opções.</span>
      )}
      {saidas && saidas.length > 0 && (
        <div className="vp-saidas" role="radiogroup" aria-label="Escolha a data">
          {saidas.map((s) => {
            const esgotada = s.vagas_restantes <= 0;
            return (
              <button key={s.saida_id} type="button" role="radio" aria-checked={escolhida === s.saida_id}
                disabled={esgotada} onClick={() => setEscolhida(escolhida === s.saida_id ? '' : s.saida_id)}>
                <strong>{dataCurtaEDA(s.data_inicio)}{s.data_fim && s.data_fim !== s.data_inicio ? ` – ${dataCurtaEDA(s.data_fim)}` : ''}</strong>
                <small>{esgotada ? 'Esgotada' : `${s.vagas_restantes} vaga${s.vagas_restantes === 1 ? '' : 's'}`}{s.horario ? ` · ${s.horario.slice(0, 5)}` : ''}</small>
              </button>
            );
          })}
        </div>
      )}
      {!lotadas && (
        <label className="vp-pessoas">
          Pessoas
          <input type="number" min={1} max={maximo} value={qtd}
            onChange={(e) => setPessoas(Number(e.target.value) || 1)} />
        </label>
      )}
      <div className="vp-acoes">
        {zap && !lotadas && (
          <a className="vp-zap" href={zap} target="_blank" rel="noopener noreferrer">
            {saida ? 'Solicitar esta data no WhatsApp' : 'Consultar datas no WhatsApp'}
          </a>
        )}
        {lotadas && <span className="vp-nota">Todas as saídas abertas estão esgotadas.</span>}
        <Link className="vp-perfil" href={`/rede/perfil/${passeio.operadora_slug}`}>Ver {passeio.operadora_nome}</Link>
      </div>
    </div>
  );
}

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro' }
  | { tipo: 'pronto'; itens: PasseioPublicoEDA[] };

function Fotos({ passeio, grande }: { passeio: PasseioPublicoEDA; grande?: boolean }) {
  const trilho = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);
  const fotos = passeio.fotos;

  function rolou() {
    const el = trilho.current;
    if (el) setAtual(Math.round(el.scrollLeft / el.clientWidth));
  }

  function ir(direcao: number) {
    const el = trilho.current;
    if (el) el.scrollBy({ left: direcao * el.clientWidth, behavior: 'smooth' });
  }

  if (!fotos.length) {
    return <div className="vp-foto vp-sem-foto" data-grande={grande || undefined}><span>✦</span></div>;
  }

  return (
    <div className="vp-foto" data-grande={grande || undefined}>
      <div ref={trilho} className="vp-trilho" onScroll={rolou}>
        {fotos.map((url, i) => (
          <div key={url} className="vp-slide">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="vp-fundo" src={url} alt="" aria-hidden="true" loading="lazy" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="vp-img" src={url} alt={i === 0 ? passeio.nome : ''} loading={i === 0 ? 'eager' : 'lazy'} />
          </div>
        ))}
      </div>
      {fotos.length > 1 && (
        <>
          <button type="button" className="vp-seta vp-esq" aria-label="Foto anterior" onClick={(e) => { e.stopPropagation(); ir(-1); }} hidden={atual === 0}>‹</button>
          <button type="button" className="vp-seta vp-dir" aria-label="Próxima foto" onClick={(e) => { e.stopPropagation(); ir(1); }} hidden={atual >= fotos.length - 1}>›</button>
          <span className="vp-pontos" aria-hidden="true">{fotos.map((u, i) => <i key={u} data-ativa={i === atual || undefined} />)}</span>
        </>
      )}
    </div>
  );
}

export default function VitrinePasseiosEDA({
  slug, titulo = 'Passeios das operadoras', subtitulo, compacta, limite, ocultarOperadora, onVerTodos,
  interesse, rotuloInteresse, onLimparInteresse,
}: Props) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  const [categoria, setCategoria] = useState('');
  const [aberto, setAberto] = useState<PasseioPublicoEDA | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let ativo = true;
    setEstado({ tipo: 'carregando' });
    listarPasseiosPublicosEDA(slug)
      .then((itens) => { if (ativo) setEstado({ tipo: 'pronto', itens }); })
      .catch(() => { if (ativo) setEstado({ tipo: 'erro' }); });
    return () => { ativo = false; };
  }, [slug, tentativa]);

  useEffect(() => {
    if (aberto) dialogo.current?.showModal();
    else dialogo.current?.close();
  }, [aberto]);

  const itens = estado.tipo === 'pronto' ? estado.itens : [];
  const categorias = useMemo(
    () => [...new Set(itens.map((p) => p.categoria).filter(Boolean) as string[])],
    [itens],
  );
  const visiveis = itens
    .filter((p) => !categoria || p.categoria === categoria)
    .filter((p) => !interesse || passeioCombinaInteresseEDA(p, interesse))
    .slice(0, limite ?? itens.length);

  if (estado.tipo === 'pronto' && !itens.length && (slug || compacta)) return null;

  return (
    <section className="vp" data-compacta={compacta || undefined} aria-labelledby={`vp-titulo-${slug ?? 'geral'}`}>
      <header className="vp-cabeca">
        <div>
          <p className="vp-sobre">Passeios EDA</p>
          <h2 id={`vp-titulo-${slug ?? 'geral'}`}>{titulo}</h2>
          {subtitulo && <span>{subtitulo}</span>}
        </div>
        {compacta && itens.length > (limite ?? 0) && (onVerTodos
          ? <button type="button" className="vp-ver" onClick={onVerTodos}>Ver todos →</button>
          : <Link className="vp-ver" href="/rede?aba=passeios">Ver todos →</Link>)}
      </header>

      {interesse && (
        <p className="vp-interesse" role="status">
          Mostrando: <strong>{rotuloInteresse ?? interesse}</strong> ({visiveis.length})
          {onLimparInteresse && <button type="button" onClick={onLimparInteresse}>Ver todos</button>}
        </p>
      )}
      {!compacta && categorias.length > 1 && (
        <div className="vp-filtros" role="group" aria-label="Filtrar por categoria">
          <button type="button" aria-pressed={!categoria} onClick={() => setCategoria('')}>Todos</button>
          {categorias.map((c) => (
            <button key={c} type="button" aria-pressed={categoria === c} onClick={() => setCategoria(c)}>{c}</button>
          ))}
        </div>
      )}

      {estado.tipo === 'carregando' && (
        <div className="vp-grade">{[0, 1, 2].map((i) => <div key={i} className="vp-card vp-esqueleto" />)}</div>
      )}

      {estado.tipo === 'erro' && (
        <p className="vp-aviso" role="alert">
          Não foi possível carregar os passeios.{' '}
          <button type="button" onClick={() => setTentativa((v) => v + 1)}>Tentar novamente</button>
        </p>
      )}

      {estado.tipo === 'pronto' && !itens.length && (
        <div className="vp-vazio">
          <span aria-hidden="true">✦</span>
          <p>As operadoras da Rede EDA estão preparando seus passeios. Volte em breve.</p>
          <Link href="/acesso?acesso=operadora">Sou operadora e quero publicar →</Link>
        </div>
      )}

      {visiveis.length > 0 && (
        <div className="vp-grade">
          {visiveis.map((p) => {
            const preco = precoPasseioEDA(p.preco);
            return (
              <article key={p.id} className="vp-card">
                <button type="button" className="vp-abrir" onClick={() => setAberto(p)} aria-label={`Ver detalhes: ${p.nome}`} />
                <Fotos passeio={p} />
                {p.categoria && <span className="vp-selo">{p.categoria}</span>}
                {p.destaque && <span className="vp-destaque">✦ Destaque</span>}
                <div className="vp-corpo">
                  <small>{[p.cidade, p.duracao].filter(Boolean).join(' · ')}</small>
                  <h3>{p.nome}</h3>
                  {!compacta && p.descricao && <p>{p.descricao}</p>}
                  <div className="vp-rodape">
                    <span>{preco ? <><small>a partir de</small><strong>{preco}</strong> <small>{rotuloModalidadeEDA(p.preco_modalidade)}</small></> : <strong>Consultar valor</strong>}</span>
                    {p.situacao === 'Em Breve'
                      ? <em>Em breve</em>
                      : p.proxima_saida
                        ? <em title="Próxima saída com vagas">{dataCurtaEDA(p.proxima_saida)} · {p.proxima_saida_vagas} vaga{p.proxima_saida_vagas === 1 ? '' : 's'}</em>
                        : null}
                  </div>
                  {!ocultarOperadora && (
                    <Link className="vp-oper" href={`/rede/perfil/${p.operadora_slug}`}>
                      {p.operadora_logo
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={p.operadora_logo} alt="" />
                        : <span aria-hidden="true">{p.operadora_nome.charAt(0)}</span>}
                      {p.operadora_nome}{p.operadora_verificada && <b title="Verificada"> ✓</b>}
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <dialog ref={dialogo} className="vp-dialogo" onClose={() => setAberto(null)} onClick={(e) => { if (e.target === dialogo.current) setAberto(null); }}>
        {aberto && (() => {
          const preco = precoPasseioEDA(aberto.preco);
          return (
            <div className="vp-detalhe">
              <button type="button" className="vp-fechar" onClick={() => setAberto(null)} aria-label="Fechar">×</button>
              <Fotos passeio={aberto} grande />
              <div className="vp-detalhe-corpo">
                <small>{[aberto.categoria, aberto.cidade, aberto.duracao].filter(Boolean).join(' · ')}</small>
                <h3>{aberto.nome}</h3>
                {aberto.descricao && <p>{aberto.descricao}</p>}
                <dl>
                  <div><dt>Valor</dt><dd>{preco ? `${preco} ${rotuloModalidadeEDA(aberto.preco_modalidade)}` : 'Consultar'}</dd></div>
                  {aberto.duracao && <div><dt>Duração</dt><dd>{aberto.duracao}</dd></div>}
                  {aberto.capacidade_minima > 1 && <div><dt>Mínimo</dt><dd>{aberto.capacidade_minima} pessoas</dd></div>}
                  {aberto.idiomas?.length > 0 && <div><dt>Idiomas</dt><dd>{aberto.idiomas.map((i) => i.toUpperCase()).join(' · ')}</dd></div>}
                  {aberto.ponto_embarque && <div><dt>Embarque</dt><dd>{aberto.ponto_embarque}</dd></div>}
                </dl>
                {(aberto.inclui?.length > 0 || aberto.nao_inclui?.length > 0) && (
                  <div className="vp-inclui">
                    {aberto.inclui?.length > 0 && <ul aria-label="Inclui">{aberto.inclui.map((i) => <li key={i}>✓ {i}</li>)}</ul>}
                    {aberto.nao_inclui?.length > 0 && <ul aria-label="Não inclui" data-nao>{aberto.nao_inclui.map((i) => <li key={i}>× {i}</li>)}</ul>}
                  </div>
                )}
                {aberto.situacao === 'Em Breve'
                  ? <span className="vp-nota">Passeio em preparação — em breve com datas abertas.</span>
                  : <Agenda passeio={aberto} />}
                <span className="vp-nota">A reserva e o pagamento são combinados diretamente com a operadora.</span>
              </div>
            </div>
          );
        })()}
      </dialog>

      <style jsx global>{`
        .vp { --vp-ouro: #e3a144; --vp-texto: #edede3; --vp-sec: #a9bdb2; --vp-borda: rgb(237 237 227 / 12%); --vp-painel: #0e1c17; color: inherit; }
        .vp-card, .vp-dialogo, .vp-vazio { color: var(--vp-texto); }
        .vp-cabeca { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
        .vp-sobre { margin: 0; font-size: 11px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--vp-ouro); }
        .vp-cabeca h2 { color: inherit; margin: 4px 0 0; font-size: clamp(20px, 3vw, 28px); font-weight: 700; }
        .vp-cabeca span { display: block; margin-top: 4px; font-size: 14px; color: inherit; opacity: .72; }
        .vp-ver { flex: none; background: none; border: 0; cursor: pointer; font-size: 13px; font-weight: 600; color: var(--vp-ouro); }
        .vp-interesse { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 12px; font-size: 14px; }
        .vp-interesse button { min-height: 34px; padding: 0 12px; border-radius: 999px; border: 1px solid currentColor; background: transparent; color: inherit; font-size: 12px; cursor: pointer; }
        .vp-filtros { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; margin-bottom: 14px; scrollbar-width: none; }
        .vp-filtros button { flex: none; min-height: 38px; padding: 0 14px; border-radius: 999px; border: 1px solid currentColor; background: transparent; color: inherit; font-size: 13px; cursor: pointer; }
        .vp-filtros button[aria-pressed='true'] { background: var(--vp-ouro); border-color: var(--vp-ouro); color: #10140f; font-weight: 700; }
        .vp-grade { display: grid; gap: 18px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); }
        .vp[data-compacta] .vp-grade { grid-template-columns: 1fr; gap: 12px; }
        .vp-card { position: relative; overflow: hidden; border-radius: 22px; border: 1px solid var(--vp-borda); background: var(--vp-painel); transition: transform .25s ease, box-shadow .25s ease, border-color .25s; }
        .vp-card:hover { transform: translateY(-4px); border-color: rgb(227 161 68 / 45%); box-shadow: 0 22px 44px rgb(0 0 0 / 35%); }
        .vp-abrir { position: absolute; inset: 0; z-index: 1; border: 0; background: transparent; cursor: pointer; }
        .vp-abrir:focus-visible { outline: 3px solid var(--vp-ouro); outline-offset: -3px; border-radius: 22px; }
        .vp-foto { position: relative; aspect-ratio: 4 / 3; background: #07110e; overflow: hidden; }
        .vp[data-compacta] .vp-foto { aspect-ratio: 16 / 9; }
        .vp-foto[data-grande] { aspect-ratio: 4 / 3; max-height: 62vh; width: 100%; }
        .vp-sem-foto { display: grid; place-items: center; font-size: 34px; color: var(--vp-ouro); background: radial-gradient(circle at 30% 25%, #1f5a52, #07110e); }
        .vp-trilho { display: flex; height: 100%; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; position: relative; z-index: 2; }
        .vp-card .vp-trilho { z-index: 0; }
        .vp-trilho::-webkit-scrollbar { display: none; }
        .vp-slide { position: relative; flex: 0 0 100%; height: 100%; scroll-snap-align: start; overflow: hidden; }
        .vp-fundo { position: absolute; inset: -20px; width: calc(100% + 40px); height: calc(100% + 40px); object-fit: cover; filter: blur(22px) brightness(.5); }
        .vp-img { position: relative; width: 100%; height: 100%; object-fit: contain; }
        .vp-seta { position: absolute; top: 50%; z-index: 3; width: 34px; height: 34px; margin-top: -17px; border: 0; border-radius: 50%; background: rgb(0 0 0 / 55%); color: #fff; font-size: 22px; line-height: 1; cursor: pointer; opacity: 0; transition: opacity .2s; }
        .vp-foto:hover .vp-seta, .vp-seta:focus-visible { opacity: 1; }
        .vp-esq { left: 8px; } .vp-dir { right: 8px; }
        .vp-pontos { position: absolute; z-index: 3; bottom: 10px; left: 0; right: 0; display: flex; justify-content: center; gap: 5px; pointer-events: none; }
        .vp-pontos i { width: 6px; height: 6px; border-radius: 50%; background: rgb(255 255 255 / 45%); }
        .vp-pontos i[data-ativa] { background: #fff; }
        .vp-selo, .vp-destaque { position: absolute; z-index: 2; top: 12px; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; backdrop-filter: blur(6px); pointer-events: none; }
        .vp-selo { left: 12px; background: rgb(0 0 0 / 55%); color: #fff; }
        .vp-destaque { right: 12px; background: var(--vp-ouro); color: #10140f; }
        .vp-corpo { padding: 14px 16px 16px; }
        .vp-corpo > small { font-size: 12px; color: var(--vp-sec); }
        .vp-corpo h3 { margin: 4px 0 6px; font-size: 18px; line-height: 1.25; font-weight: 700; overflow-wrap: anywhere; }
        .vp-corpo p { margin: 0; font-size: 14px; line-height: 1.55; color: var(--vp-sec); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .vp-rodape { display: flex; align-items: flex-end; justify-content: space-between; margin-top: 12px; }
        .vp-rodape small { display: block; font-size: 11px; color: var(--vp-sec); }
        .vp-rodape strong { font-size: 19px; color: var(--vp-ouro); }
        .vp-rodape em { font-style: normal; font-size: 11px; padding: 3px 9px; border-radius: 999px; border: 1px solid var(--vp-ouro); color: var(--vp-ouro); }
        .vp-oper { position: relative; z-index: 2; display: inline-flex; align-items: center; gap: 8px; margin-top: 12px; font-size: 13px; color: var(--vp-texto); }
        .vp-oper img, .vp-oper > span { width: 26px; height: 26px; border-radius: 50%; object-fit: cover; display: grid; place-items: center; background: #1f5a52; font-size: 12px; font-weight: 700; }
        .vp-oper b { color: var(--vp-ouro); }
        .vp-esqueleto { min-height: 340px; background: linear-gradient(100deg, var(--vp-painel) 30%, #15281f 50%, var(--vp-painel) 70%); background-size: 300% 100%; animation: vp-brilho 1.4s linear infinite; }
        @keyframes vp-brilho { to { background-position: -150% 0; } }
        .vp-aviso { color: var(--vp-sec); } .vp-aviso button { color: var(--vp-ouro); background: none; border: 0; text-decoration: underline; cursor: pointer; }
        .vp-vazio { display: grid; justify-items: center; gap: 8px; padding: 34px 18px; border: 1px dashed var(--vp-borda); border-radius: 22px; text-align: center; color: var(--vp-sec); }
        .vp-vazio span { font-size: 26px; color: var(--vp-ouro); } .vp-vazio a { color: var(--vp-ouro); font-weight: 600; }
        .vp-dialogo { width: min(720px, calc(100vw - 24px)); max-height: calc(100dvh - 24px); padding: 0; border: 1px solid var(--vp-borda); border-radius: 24px; background: var(--vp-painel); color: var(--vp-texto); overflow: auto; }
        .vp-dialogo::backdrop { background: rgb(3 8 6 / 78%); backdrop-filter: blur(4px); }
        .vp-detalhe { position: relative; }
        .vp-fechar { position: absolute; z-index: 5; top: 12px; right: 12px; width: 38px; height: 38px; border: 0; border-radius: 50%; background: rgb(0 0 0 / 60%); color: #fff; font-size: 22px; cursor: pointer; }
        .vp-detalhe .vp-seta { opacity: 1; }
        .vp-detalhe-corpo { padding: 20px 22px 24px; }
        .vp-detalhe-corpo > small { font-size: 12px; color: var(--vp-sec); }
        .vp-detalhe-corpo h3 { margin: 6px 0 10px; font-size: 24px; font-weight: 700; }
        .vp-detalhe-corpo p { margin: 0; font-size: 15px; line-height: 1.65; color: var(--vp-sec); white-space: pre-line; }
        .vp-detalhe-corpo dl { display: flex; flex-wrap: wrap; gap: 10px; margin: 18px 0; }
        .vp-detalhe-corpo dl div { padding: 10px 14px; border-radius: 14px; border: 1px solid var(--vp-borda); }
        .vp-detalhe-corpo dt { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--vp-sec); }
        .vp-detalhe-corpo dd { margin: 2px 0 0; font-size: 15px; font-weight: 700; color: var(--vp-ouro); }
        .vp-acoes { display: flex; flex-wrap: wrap; gap: 10px; }
        .vp-zap, .vp-perfil { display: inline-flex; align-items: center; min-height: 46px; padding: 0 20px; border-radius: 999px; font-size: 14px; font-weight: 700; }
        .vp-zap { background: #1f9d55; color: #fff; } .vp-perfil { border: 1px solid var(--vp-borda); color: var(--vp-texto); }
        .vp-nota { display: block; margin-top: 12px; font-size: 12px; color: var(--vp-sec); }
        .vp-agenda { margin-top: 4px; }
        .vp-agenda-tit { margin: 0 0 8px; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--vp-sec); }
        .vp-saidas { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; scrollbar-width: none; }
        .vp-saidas button { flex: none; display: grid; gap: 2px; min-width: 104px; padding: 10px 12px; border-radius: 14px; border: 1px solid var(--vp-borda); background: transparent; color: var(--vp-texto); text-align: left; cursor: pointer; }
        .vp-saidas button strong { font-size: 14px; } .vp-saidas button small { font-size: 11px; color: var(--vp-sec); }
        .vp-saidas button[aria-checked='true'] { border-color: var(--vp-ouro); background: rgb(227 161 68 / 12%); }
        .vp-saidas button:disabled { opacity: .45; cursor: not-allowed; }
        .vp-pessoas { display: inline-flex; align-items: center; gap: 10px; margin: 12px 0; font-size: 13px; color: var(--vp-sec); }
        .vp-pessoas input { width: 72px; min-height: 40px; padding: 0 10px; border-radius: 12px; border: 1px solid var(--vp-borda); background: transparent; color: var(--vp-texto); font-size: 15px; }
        .vp-inclui { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin: 0 0 18px; }
        .vp-inclui ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 4px; font-size: 14px; color: var(--vp-texto); }
        .vp-inclui ul[data-nao] { color: var(--vp-sec); }
        @media (prefers-reduced-motion: reduce) { .vp-card, .vp-esqueleto { transition: none; animation: none; } }
      `}</style>
    </section>
  );
}

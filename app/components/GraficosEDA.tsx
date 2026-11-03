'use client';

// ERN_GRAFICOS_EDA_V1
// Conjunto de gráficos da Encantos Gestão: barras agrupadas, área, barras
// horizontais empilhadas, rosca de situação e linha de tendência. Desenhados
// em SVG, sem biblioteca externa. Cores da marca validadas para daltonismo e
// contraste nos temas Noite e Claro (graficos-eda.css). Cada gráfico tem
// dica ao passar o mouse/tocar/focar e, quando faz sentido, tabela com os números.

import { useId, useRef, useState, type ReactNode } from 'react';
import './graficos-eda.css';

export type CorSerieEDA = 's1' | 's2' | 's3' | 's4' | 'mudo';
export type TomGraficoEDA = 'ok' | 'at' | 'er' | 'info' | 'nt';

const cor = (c: CorSerieEDA | TomGraficoEDA) => `var(--g-${c})`;

type Dica = { x: number; y: number; conteudo: ReactNode } | null;

function useDica() {
  const caixa = useRef<HTMLDivElement>(null);
  const [dica, setDica] = useState<Dica>(null);
  function mostrar(evento: { clientX?: number; clientY?: number; currentTarget: Element }, conteudo: ReactNode) {
    const area = caixa.current?.getBoundingClientRect();
    if (!area) return;
    let x: number; let y: number;
    if (evento.clientX) { x = evento.clientX - area.left; y = (evento.clientY ?? 0) - area.top; }
    else { const alvo = evento.currentTarget.getBoundingClientRect(); x = alvo.left + alvo.width / 2 - area.left; y = alvo.top - area.top; }
    setDica({ x, y, conteudo });
  }
  return { caixa, dica, mostrar, esconder: () => setDica(null) };
}

function CaixaDica({ dica, largura }: { dica: Dica; largura: number }) {
  if (!dica) return null;
  const esquerda = Math.min(Math.max(8, dica.x - 85), Math.max(8, largura - 178));
  return <div className="eda-g-dica" style={{ left: esquerda, top: Math.max(4, dica.y - 12) }} role="status">{dica.conteudo}</div>;
}

export function LinhaDicaEDA({ c, nome, valor }: { c?: CorSerieEDA | TomGraficoEDA; nome: string; valor: ReactNode }) {
  return <span className="eda-g-dica-linha"><span>{c && <i style={{ background: cor(c) }} />}{nome}</span><b>{valor}</b></span>;
}

export function LegendaEDA({ itens }: { itens: { nome: string; c: CorSerieEDA | TomGraficoEDA }[] }) {
  return (
    <div className="eda-g-legenda">
      {itens.map(i => <span key={i.nome}><i style={{ background: cor(i.c) }} />{i.nome}</span>)}
    </div>
  );
}

export function TabelaNumerosEDA({ cabecalho, linhas }: { cabecalho: string[]; linhas: (string | number)[][] }) {
  return (
    <details className="eda-g-tabela">
      <summary>Ver os números</summary>
      <div className="eda-g-tabela-rolagem">
        <table>
          <thead><tr>{cabecalho.map(c => <th key={c} scope="col">{c}</th>)}</tr></thead>
          <tbody>{linhas.map((l, i) => <tr key={i}>{l.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </details>
  );
}

function marcasEixo(maximo: number): number[] {
  if (maximo <= 0) return [0, 1];
  const bruto = maximo / 4;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map(m => m * potencia).find(p => p >= bruto) ?? bruto;
  const topo = Math.ceil(maximo / passo) * passo;
  const lista: number[] = [];
  for (let v = 0; v <= topo + passo / 2; v += passo) lista.push(Number(v.toFixed(6)));
  return lista;
}

// Barra vertical: ponta arredondada (4px) e base reta na linha de base.
function caminhoBarra(x: number, y: number, w: number, h: number) {
  if (h <= 0) return '';
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

// ---------- Barras agrupadas ----------
export function BarrasAgrupadasEDA({
  categorias, series, formatar, formatarEixo, rotulo, destacarMaior = true, altura = 230,
}: {
  categorias: string[];
  series: { nome: string; c: CorSerieEDA; valores: number[] }[];
  formatar: (v: number) => string;
  formatarEixo?: (v: number) => string;
  rotulo: string;
  destacarMaior?: boolean;
  altura?: number;
}) {
  const { caixa, dica, mostrar, esconder } = useDica();
  const W = 560, H = altura, L = 52, B = 26, T = 18;
  const maximo = Math.max(0, ...series.flatMap(s => s.valores));
  const eixo = marcasEixo(maximo);
  const topo = eixo[eixo.length - 1] || 1;
  const y = (v: number) => T + (H - B - T) * (1 - v / topo);
  const passo = (W - L) / Math.max(1, categorias.length);
  const bw = Math.max(6, Math.min(16, (passo - 18) / series.length - 2));
  const primeira = series[0];
  const iMaior = primeira ? primeira.valores.indexOf(Math.max(...primeira.valores)) : -1;
  const fmtEixo = formatarEixo ?? formatar;

  return (
    <div className="eda-g" ref={caixa} onPointerLeave={esconder}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={rotulo}>
        {eixo.map(v => (
          <g key={v}>
            <line x1={L} x2={W} y1={y(v)} y2={y(v)} className="eda-g-grade" />
            <text x={L - 8} y={y(v) + 4} textAnchor="end">{v === 0 ? '0' : fmtEixo(v)}</text>
          </g>
        ))}
        {categorias.map((cat, i) => {
          const cx = L + passo * i + passo / 2;
          const inicio = cx - (series.length * (bw + 2)) / 2;
          return (
            <g key={cat}>
              {series.map((s, k) => {
                const v = s.valores[i] ?? 0;
                return <path key={s.nome} d={caminhoBarra(inicio + k * (bw + 2), y(v), bw, y(0) - y(v))} fill={cor(s.c)} />;
              })}
              <text x={cx} y={H - 6} textAnchor="middle">{cat}</text>
              {destacarMaior && i === iMaior && primeira && primeira.valores[i] > 0 && (
                <text x={inicio + bw / 2} y={y(primeira.valores[i]) - 6} textAnchor="middle" className="eda-g-valor">{formatar(primeira.valores[i])}</text>
              )}
              <rect
                x={cx - passo / 2} y={T} width={passo} height={H - B - T} className="eda-g-alvo" tabIndex={0}
                aria-label={`${cat}: ${series.map(s => `${s.nome} ${formatar(s.valores[i] ?? 0)}`).join(', ')}`}
                onPointerMove={e => mostrar(e, <><b>{cat}</b>{series.map(s => <LinhaDicaEDA key={s.nome} c={s.c} nome={s.nome} valor={formatar(s.valores[i] ?? 0)} />)}</>)}
                onFocus={e => mostrar(e, <><b>{cat}</b>{series.map(s => <LinhaDicaEDA key={s.nome} c={s.c} nome={s.nome} valor={formatar(s.valores[i] ?? 0)} />)}</>)}
                onBlur={esconder}
              />
            </g>
          );
        })}
      </svg>
      <CaixaDica dica={dica} largura={caixa.current?.clientWidth ?? W} />
      {series.length > 1 && <LegendaEDA itens={series.map(s => ({ nome: s.nome, c: s.c }))} />}
    </div>
  );
}

// ---------- Área (evolução) ----------
export function AreaEDA({
  categorias, valores, nome, c = 's2', formatar, formatarEixo, rotulo, altura = 220,
}: {
  categorias: string[];
  valores: number[];
  nome: string;
  c?: CorSerieEDA;
  formatar: (v: number) => string;
  formatarEixo?: (v: number) => string;
  rotulo: string;
  altura?: number;
}) {
  const { caixa, dica, mostrar, esconder } = useDica();
  const [ativo, setAtivo] = useState<number | null>(null);
  const id = useId().replace(/:/g, '');
  const W = 560, H = altura, L = 52, B = 26, T = 18, R = 70;
  const minimo = Math.min(0, ...valores);
  const eixoPos = marcasEixo(Math.max(0, ...valores));
  const topo = eixoPos[eixoPos.length - 1] || 1;
  const base = minimo < 0 ? -marcasEixo(-minimo).slice(-1)[0] : 0;
  const y = (v: number) => T + (H - B - T) * (1 - (v - base) / (topo - base || 1));
  const n = Math.max(1, valores.length - 1);
  const x = (i: number) => L + (W - L - R) * i / n;
  const pontos = valores.map((v, i) => `${x(i)},${y(v)}`).join(' L');
  const ultimo = valores.length - 1;
  const linhas = [...(base < 0 ? [base] : []), ...eixoPos];
  const fmtEixo = formatarEixo ?? formatar;
  const passo = (W - L - R) / n;

  return (
    <div className="eda-g" ref={caixa} onPointerLeave={() => { esconder(); setAtivo(null); }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={rotulo}>
        <defs>
          <linearGradient id={`a${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={cor(c)} stopOpacity="0.28" />
            <stop offset="1" stopColor={cor(c)} stopOpacity="0" />
          </linearGradient>
        </defs>
        {linhas.map(v => (
          <g key={v}>
            <line x1={L} x2={W - R + 12} y1={y(v)} y2={y(v)} className={v === 0 ? 'eda-g-base' : 'eda-g-grade'} />
            <text x={L - 8} y={y(v) + 4} textAnchor="end">{v === 0 ? '0' : fmtEixo(v)}</text>
          </g>
        ))}
        {valores.length > 1 && <>
          <path d={`M${pontos} L${x(ultimo)},${y(Math.max(base, 0))} L${x(0)},${y(Math.max(base, 0))} Z`} fill={`url(#a${id})`} />
          <path d={`M${pontos}`} fill="none" stroke={cor(c)} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        </>}
        {categorias.map((cat, i) => <text key={cat} x={x(i)} y={H - 6} textAnchor="middle">{cat}</text>)}
        {ultimo >= 0 && <>
          <circle cx={x(ultimo)} cy={y(valores[ultimo])} r={5} fill={cor(c)} stroke="var(--g-painel)" strokeWidth={2} />
          <text x={x(ultimo) + 10} y={y(valores[ultimo]) + 4} className="eda-g-valor">{formatar(valores[ultimo])}</text>
        </>}
        {ativo !== null && <>
          <line x1={x(ativo)} x2={x(ativo)} y1={T} y2={H - B} className="eda-g-guia" />
          <circle cx={x(ativo)} cy={y(valores[ativo])} r={4} fill={cor(c)} stroke="var(--g-painel)" strokeWidth={2} />
        </>}
        {categorias.map((cat, i) => {
          const conteudo = <><b>{cat}</b><LinhaDicaEDA c={c} nome={nome} valor={formatar(valores[i] ?? 0)} /></>;
          return (
            <rect
              key={cat} x={x(i) - passo / 2} y={T} width={passo} height={H - B - T} className="eda-g-alvo" tabIndex={0}
              aria-label={`${cat}: ${nome} ${formatar(valores[i] ?? 0)}`}
              onPointerMove={e => { setAtivo(i); mostrar(e, conteudo); }}
              onFocus={e => { setAtivo(i); mostrar(e, conteudo); }}
              onBlur={() => { esconder(); setAtivo(null); }}
            />
          );
        })}
      </svg>
      <CaixaDica dica={dica} largura={caixa.current?.clientWidth ?? W} />
    </div>
  );
}

// ---------- Barras horizontais (empilhadas) ----------
export function BarrasHorizontaisEDA({
  linhas, series, formatar, rotulo, largRotulo = 110,
}: {
  linhas: { rotulo: string; valores: number[]; alerta?: boolean }[];
  series: { nome: string; c: CorSerieEDA }[];
  formatar: (v: number) => string;
  rotulo: string;
  largRotulo?: number;
}) {
  const { caixa, dica, mostrar, esconder } = useDica();
  const W = 560, alturaLinha = 34, L = largRotulo, R = 84, H = linhas.length * alturaLinha + 8;
  const maximo = Math.max(1, ...linhas.map(l => l.valores.reduce((a, b) => a + b, 0)));
  const x = (v: number) => (W - L - R) * v / maximo;

  return (
    <div className="eda-g" ref={caixa} onPointerLeave={esconder}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={rotulo}>
        {linhas.map((l, i) => {
          const yy = 6 + i * alturaLinha;
          let acumulado = 0;
          const total = l.valores.reduce((a, b) => a + b, 0);
          const conteudo = <><b>{l.rotulo}</b>{series.map((s, k) => <LinhaDicaEDA key={s.nome} c={s.c} nome={s.nome} valor={formatar(l.valores[k] ?? 0)} />)}</>;
          return (
            <g key={l.rotulo}>
              <text x={L - 10} y={yy + 15} textAnchor="end" className={l.alerta ? 'eda-g-alerta' : ''}>{l.rotulo}</text>
              <rect x={L} y={yy + 4} width={W - L - R} height={16} rx={4} className="eda-g-trilho" />
              {l.valores.map((v, k) => {
                if (v <= 0) return null;
                const inicio = L + x(acumulado) + (acumulado > 0 ? 2 : 0);
                acumulado += v;
                return <rect key={k} x={inicio} y={yy + 4} width={Math.max(2, x(v) - (k > 0 ? 2 : 0))} height={16} rx={4} fill={cor(series[k]?.c ?? 'mudo')} />;
              })}
              <text x={L + x(total) + 10} y={yy + 16} className="eda-g-valor">{formatar(total)}</text>
              <rect
                x={0} y={yy} width={W} height={alturaLinha} className="eda-g-alvo" tabIndex={0}
                aria-label={`${l.rotulo}: ${series.map((s, k) => `${s.nome} ${formatar(l.valores[k] ?? 0)}`).join(', ')}`}
                onPointerMove={e => mostrar(e, conteudo)} onFocus={e => mostrar(e, conteudo)} onBlur={esconder}
              />
            </g>
          );
        })}
      </svg>
      <CaixaDica dica={dica} largura={caixa.current?.clientWidth ?? W} />
      {series.length > 1 && <LegendaEDA itens={series.map(s => ({ nome: s.nome, c: s.c }))} />}
    </div>
  );
}

// ---------- Rosca de situação ----------
export function RoscaEDA({
  itens, centro, sub, rotulo,
}: {
  itens: { nome: string; valor: number; tom: TomGraficoEDA | CorSerieEDA }[];
  centro: string;
  sub: string;
  rotulo: string;
}) {
  const { caixa, dica, mostrar, esconder } = useDica();
  const total = itens.reduce((t, i) => t + i.valor, 0);
  const r = 70, esp = 18, C = 2 * Math.PI * r;
  let deslocamento = 0;
  const pct = (v: number) => total ? `${Math.round((v / total) * 100)}%` : '0%';

  return (
    <div className="eda-g eda-g-rosca" ref={caixa} onPointerLeave={esconder}>
      <svg viewBox="0 0 180 180" role="img" aria-label={rotulo} className="eda-g-rosca-svg">
        <circle cx={90} cy={90} r={r} fill="none" className="eda-g-trilho-traco" strokeWidth={esp} />
        {total > 0 && itens.map(i => {
          const comp = Math.max(0, (C * i.valor) / total - (itens.filter(x => x.valor > 0).length > 1 ? 3 : 0));
          const el = (
            <circle
              key={i.nome} cx={90} cy={90} r={r} fill="none" stroke={cor(i.tom)} strokeWidth={esp}
              strokeDasharray={`${comp} ${C}`} strokeDashoffset={-deslocamento} transform="rotate(-90 90 90)"
              className="eda-g-arco" tabIndex={i.valor > 0 ? 0 : -1} aria-label={`${i.nome}: ${i.valor} (${pct(i.valor)})`}
              onPointerMove={e => mostrar(e, <><b>{i.nome}</b><LinhaDicaEDA c={i.tom} nome="Quantidade" valor={`${i.valor} · ${pct(i.valor)}`} /></>)}
              onFocus={e => mostrar(e, <><b>{i.nome}</b><LinhaDicaEDA c={i.tom} nome="Quantidade" valor={`${i.valor} · ${pct(i.valor)}`} /></>)}
              onBlur={esconder}
            />
          );
          deslocamento += (C * i.valor) / total;
          return el;
        })}
        <text x={90} y={92} textAnchor="middle" className="eda-g-centro">{centro}</text>
        <text x={90} y={112} textAnchor="middle">{sub}</text>
      </svg>
      <ul className="eda-g-rosca-lista">
        {itens.map(i => (
          <li key={i.nome}><span><i style={{ background: cor(i.tom) }} />{i.nome}</span><b>{i.valor} · {pct(i.valor)}</b></li>
        ))}
      </ul>
      <CaixaDica dica={dica} largura={caixa.current?.clientWidth ?? 360} />
    </div>
  );
}

// ---------- Linha de tendência (números do topo) ----------
export function TendenciaEDA({ valores, c = 's1', className = '' }: { valores: number[]; c?: CorSerieEDA; className?: string }) {
  if (valores.length < 2) return null;
  const max = Math.max(...valores), min = Math.min(...valores);
  const x = (i: number) => 2 + 92 * i / (valores.length - 1);
  const y = (v: number) => 28 - 24 * (v - min) / ((max - min) || 1);
  return (
    <svg viewBox="0 0 96 32" aria-hidden="true" className={`eda-g-tendencia ${className}`}>
      <path d={'M' + valores.map((v, i) => `${x(i)},${y(v)}`).join(' L')} fill="none" stroke={cor(c)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(valores.length - 1)} cy={y(valores[valores.length - 1])} r={3} fill={cor(c)} />
    </svg>
  );
}

// ---------- Cartão de gráfico ----------
export function CartaoGraficoEDA({ etiqueta, titulo, sub, acoes, children, className = '' }: { etiqueta?: string; titulo: string; sub?: ReactNode; acoes?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`eda-g-cartao ${className}`}>
      <div className="eda-g-cartao-topo">
        <div>
          {etiqueta && <p className="eda-g-eb">{etiqueta}</p>}
          <h3>{titulo}</h3>
          {sub && <p className="eda-g-sub">{sub}</p>}
        </div>
        {acoes}
      </div>
      {children}
    </section>
  );
}

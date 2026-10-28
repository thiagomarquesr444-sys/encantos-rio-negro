"use client";
import '../financeiro/financeiro-premium.css';
import { useEffect, useMemo, useState } from "react";
import { consultarFinanceiroERN, type RegistroFinanceiroERN } from "@/lib/financeiroConsultaERN";
import { analisarGraficosFinanceirosERN, hojeGraficoManaus, periodoGraficoValido, periodoRecenteERN, type PeriodoGraficoERN, type MesFinanceiroERN } from "@/lib/financeiroGraficosERN";
type Props={registros?:RegistroFinanceiroERN[];carregando?:boolean;erro?:string;aoAtualizar?:()=>void|Promise<void>};
const moeda=(n:number)=>(n/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const CORES=["#E3A144","#34d399","#60a5fa","#f472b6","#a78bfa","#94a3b8"];
const painel="min-w-0 rounded-2xl border border-white/10 bg-[#0A1713] p-4 sm:p-5";
const botao="min-h-11 rounded-xl border px-3 text-xs font-semibold disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4C77E]";
function Rosca({categorias,total}:{categorias:[string,number][];total:number}) {
  const [ativa,setAtiva] = useState<number|null>(null);
  const fatias = useMemo(() => categorias.length<=6 ? categorias : [...categorias.slice(0,5),["Demais categorias", categorias.slice(5).reduce((s,c)=>s+c[1],0)] as [string,number]], [categorias]);
  const indice = ativa!==null && ativa<fatias.length ? ativa : null;
  const foco = indice===null ? null : fatias[indice];
  const raio=73, circ=2*Math.PI*raio;
  let acumulado=0;
  return <div className="ern-fin-rosca mt-5 grid min-w-0 items-center gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
    <div className="relative mx-auto w-full max-w-[250px]">
      <svg viewBox="0 0 240 240" className="h-auto w-full" role="img" aria-label={total>0?`Despesas por categoria. Total: ${moeda(total)}. Valores detalhados na lista ao lado.`:"Sem despesas neste recorte."}>
        <circle cx="120" cy="120" r={raio} stroke="#263031" strokeWidth="27" fill="none" />
        {total>0 && fatias.map(([nome,valor],i)=>{
          const tamanho=(valor/total)*circ;
          const pos=-acumulado;
          acumulado+=tamanho;
          return <circle key={`${nome}-${i}`} cx="120" cy="120" r={raio} stroke={CORES[i]} strokeWidth={indice===i?32:27} strokeDasharray={`${Math.max(0,tamanho)} ${circ}`} strokeDashoffset={pos} transform="rotate(-90 120 120)" strokeLinecap="butt" fill="none" className="transition-[stroke-width] duration-150" onMouseEnter={()=>setAtiva(i)} onMouseLeave={()=>setAtiva(null)}><title>{nome}: {moeda(valor)}</title></circle>;
        })}
        <text x="120" y="108" textAnchor="middle" fill="#aec2b6" fontSize="11">{foco?"Categoria em foco":"Total analisado"}</text>
        <text x="120" y="130" textAnchor="middle" fill="#f4c77e" fontSize={foco?"16":"19"} fontWeight="700">{moeda(foco?.[1]??total)}</text>
        <text x="120" y="148" textAnchor="middle" fill="#aec2b6" fontSize="10">{foco?`${((foco[1]/Math.max(1,total))*100).toFixed(1)}% do total`:(total===0?"Sem despesas":`${fatias.length} categorias`)}</text>
      </svg>
    </div>
    <div className="min-w-0">
      {total===0 ? <p className="rounded-xl border border-white/10 bg-[#1d2526] p-4 text-sm leading-6 text-[#c3d0c6]">Nenhuma despesa nesta situação e período. Altere o período ou a situação para comparar categorias.</p> :
        <ul className="max-h-[300px] space-y-2 overflow-y-auto pr-1">{fatias.map(([nome,valor],i)=><li key={`${nome}-${i}`}><button type="button" onMouseEnter={()=>setAtiva(i)} onMouseLeave={()=>setAtiva(null)} onFocus={()=>setAtiva(i)} onBlur={()=>setAtiva(null)} onClick={()=>setAtiva(ativa===i?null:i)} aria-pressed={ativa===i} className="w-full rounded-xl border border-white/10 bg-[#1d2526] px-3 py-3 text-left transition hover:border-[#e3a144]/50 focus-visible:outline-2 focus-visible:outline-[#e3a144]"><span className="flex items-start gap-2.5"><span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{backgroundColor:CORES[i]}}/><span className="min-w-0 flex-1"><span className="block break-words text-sm font-medium text-[#e8eee9]">{nome}</span><span className="mt-1 block text-xs text-[#adbdb4]">{moeda(valor)} · {(valor/total*100).toLocaleString("pt-BR",{maximumFractionDigits:1})}%</span><span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full" style={{width:`${valor/total*100}%`,backgroundColor:CORES[i]}}/></span></span></span></button></li>)}</ul>}
    </div>
  </div>;
}

function Colunas({meses,pendente}:{meses:MesFinanceiroERN[];pendente:boolean}) {
  const [selecionado,setSelecionado]=useState<string|null>(null);
  const entrada=pendente?"receber":"recebido";
  const saida=pendente?"pagar":"pago";
  const escala=Math.max(1,...meses.flatMap(m=>[m[entrada],m[saida]]));
  const foco=meses.find(m=>m.chave===selecionado);
  return <div className="ern-fin-colunas mt-5 min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#bbcac1]"><div className="flex flex-wrap gap-4"><span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-emerald-400"/>{pendente?"A receber":"Recebido"}</span><span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{backgroundColor:pendente?"#E3A144":"#fb7185"}}/>{pendente?"A pagar":"Pago"}</span></div><span>Maior valor: {moeda(escala===1?0:escala)}</span></div>
    {foco && <p role="status" className="mt-3 rounded-xl border border-[#e3a144]/20 bg-[#e3a144]/5 px-3 py-2 text-xs text-[#f4c77e]">{foco.nome}: {pendente?"a receber":"recebido"} {moeda(foco[entrada])} · {pendente?"a pagar":"pago"} {moeda(foco[saida])}</p>}
    {meses.length===0 ? <p className="mt-5 text-sm text-[#bbcac1]">Nenhum mês disponível neste recorte.</p> : <>
      <div className="relative mt-5 h-[270px] rounded-xl border border-white/5 bg-[#111718] px-2 pt-4 pb-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-3 top-4 bottom-8 flex flex-col justify-between">{[0,1,2,3,4].map(n=><span key={n} className="border-t border-dashed border-white/10"/>)}</div>
        <div className="relative flex h-full items-end justify-around gap-3">{meses.map(m=><button key={m.chave} type="button" aria-pressed={selecionado===m.chave} aria-label={`${m.nome}: ${pendente?"a receber":"recebido"} ${moeda(m[entrada])}; ${pendente?"a pagar":"pago"} ${moeda(m[saida])}`} title={`${m.nome}: ${moeda(m[entrada])} / ${moeda(m[saida])}`} onClick={()=>setSelecionado(atual=>atual===m.chave?null:m.chave)} className="group flex h-full min-w-0 flex-1 items-end justify-center gap-2 rounded-t-lg focus-visible:outline-2 focus-visible:outline-[#e3a144]">{[{nome:"entrada",valor:m[entrada],cor:"#34d399"},{nome:"saida",valor:m[saida],cor:pendente?"#e3a144":"#fb7185"}].map(s=><span key={s.nome} className="relative block h-full w-full max-w-[34px]"><span className="absolute inset-x-0 bottom-0 block min-h-[2px] rounded-t-md transition-all duration-200 group-hover:brightness-125" style={{height:`${s.valor===0?0:Math.max(1.5,s.valor/escala*100)}%`,backgroundColor:s.cor}}/></span>)}</button>)}</div>
        <div className="absolute inset-x-2 bottom-2 flex justify-around gap-3 text-center text-[10px] text-[#b8c8be]">{meses.map(m=><span key={m.chave} className="min-w-0 flex-1 truncate">{m.nome}</span>)}</div>
      </div>
      <details className="mt-3 text-xs"><summary className="min-h-11 cursor-pointer py-3 font-semibold text-[#f4c77e]">Consultar valores mensais exatos</summary><div className="overflow-x-auto"><table className="w-full min-w-[380px] text-left"><thead><tr>{["Mês",pendente?"A receber":"Recebido",pendente?"A pagar":"Pago"].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{meses.map(m=><tr key={m.chave} className="border-t border-white/10"><td className="p-2">{m.nome}</td><td className="p-2">{moeda(m[entrada])}</td><td className="p-2">{moeda(m[saida])}</td></tr>)}</tbody></table></div></details>
    </>}
  </div>;
}

function TendenciaLiquidaERN({ meses }: { meses: MesFinanceiroERN[] }) {
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const valores = meses.map((m) => m.recebido - m.pago);
  const minimo = Math.min(0, ...valores);
  const maximo = Math.max(0, ...valores);
  const alcance = Math.max(1, maximo - minimo);
  const largura = Math.max(700, meses.length * 62);
  const altura = 250;
  const esquerda = 38;
  const direita = 35;
  const topo = 24;
  const base = 30;
  const x = (indice: number) => esquerda + indice * (largura - esquerda - direita) / Math.max(1, meses.length - 1);
  const y = (valor: number) => topo + (maximo - valor) / alcance * (altura - topo - base);
  const pontos = valores.map((valor, indice) => `${x(indice)},${y(valor)}`).join(' ');
  const soma = valores.reduce((total, valor) => total + valor, 0);
  const positivos = valores.filter((n) => n > 0).length;
  const negativos = valores.filter((n) => n < 0).length;
  const foco = selecionado ? meses.find((m) => m.chave === selecionado) : null;
  return <article className="ern-fin-tendencia min-w-0 rounded-3xl border border-white/10 bg-[#151a1b] p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-[10px] font-bold uppercase tracking-[.19em] text-[#E3A144]">Evolução do período inteiro</p><h3 className="mt-2 text-xl font-semibold text-[#F5EFE6]">Movimento líquido mensal</h3><p className="mt-2 max-w-2xl text-xs leading-6 text-[#B4C8BB]">Recebido menos pago em cada mês. Não representa saldo acumulado.</p></div>
      <div className="rounded-xl border border-[#E3A144]/30 bg-[#E3A144]/10 p-4"><p className="text-xs text-[#B4C8BB]">Total do período</p><p className="mt-1 break-all text-xl font-bold text-[#F4C77E]">{moeda(soma)}</p></div>
    </div>
    <div className="mt-5 grid grid-cols-3 gap-2 text-center">
      <div className="ern-fin-mini"><span>Meses positivos</span><strong>{positivos}</strong></div><div className="ern-fin-mini"><span>Meses negativos</span><strong>{negativos}</strong></div><div className="ern-fin-mini"><span>Meses analisados</span><strong>{meses.length}</strong></div>
    </div>
    {foco && <p role="status" className="mt-4 rounded-xl border border-[#E3A144]/25 bg-[#E3A144]/5 px-4 py-3 text-xs text-[#F4C77E]">{foco.nome}: recebido {moeda(foco.recebido)} Â· pago {moeda(foco.pago)} Â· movimento {moeda(foco.recebido-foco.pago)}</p>}
    {meses.length > 0 ? <>
      <div className="mt-5 overflow-x-auto pb-2" tabIndex={0} aria-label="Gráfico horizontal rolável do movimento líquido">
        <svg viewBox={`0 0 ${largura} ${altura + 35}`} className="block h-[290px] w-full min-w-[700px]" role="img" aria-label="Gráfico de linha do movimento líquido mensal; tabela de valores exatos abaixo">
          {[0,.25,.5,.75,1].map((fra) => { const v=minimo+(maximo-minimo)*fra; return <line key={fra} x1={esquerda} x2={largura-direita} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,.11)" strokeDasharray="4 7"/>; })}
          <line x1={esquerda} x2={largura-direita} y1={y(0)} y2={y(0)} stroke="rgba(227,161,68,.45)" strokeWidth={1.5}/>
          <polyline points={pontos} fill="none" stroke="#E3A144" strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round"/>
          {meses.map((m,i) => <g key={m.chave}><circle cx={x(i)} cy={y(valores[i])} r={selecionado===m.chave?7:5} fill={valores[i]<0?'#fb7185':'#f4c77e'} stroke="#151a1b" strokeWidth={2}><title>{m.nome}: {moeda(valores[i])}</title></circle><text x={x(i)} y={altura+20} fill="#B4C8BB" textAnchor="middle" fontSize={meses.length>12?10:12}>{m.nome}</text></g>)}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-2" aria-label="Selecionar mês para detalhar">{meses.map((m) => <button key={m.chave} type="button" aria-pressed={selecionado===m.chave} className="min-h-9 rounded-lg border border-white/10 px-3 text-xs text-[#B4C8BB] hover:border-[#E3A144]/50 aria-pressed:border-[#E3A144] aria-pressed:text-[#F4C77E]" onClick={() => setSelecionado(atual => atual===m.chave?null:m.chave)}>{m.nome}</button>)}</div>
      <details className="mt-3 text-xs"><summary className="min-h-11 cursor-pointer py-3 text-[#F4C77E]">Conferir valores mensais exatos</summary><div className="overflow-x-auto"><table className="w-full min-w-[500px] text-left"><thead><tr>{['Mês','Recebido','Pago','Movimento líquido'].map((h)=><th key={h} className="px-3 py-3">{h}</th>)}</tr></thead><tbody>{meses.map((m)=><tr key={m.chave} className="border-t border-white/10"><td className="px-3 py-3">{m.nome}</td><td className="px-3 py-3">{moeda(m.recebido)}</td><td className="px-3 py-3">{moeda(m.pago)}</td><td className="px-3 py-3">{moeda(m.recebido-m.pago)}</td></tr>)}</tbody></table></div></details>
    </> : <p className="mt-5 text-sm text-[#B4C8BB]">Nenhum mês válido para exibir.</p>}
    <p className="mt-4 text-[11px] leading-5 text-[#B4C8BB]">Valores negativos: despesas pagas maiores que receitas recebidas no mês. Não equivale a lucro nem saldo bancário. O período pode incluir até 24 meses.</p>
  </article>;
}
export default function GraficosFinanceiros(props:Props={}){
  const [locais,setLocais]=useState<RegistroFinanceiroERN[]>([]);
  const [carregandoLocal,setCarregandoLocal]=useState(true);
  const [erroLocal,setErroLocal]=useState("");
  const [tentativa,setTentativa]=useState(0);
  const [periodo,setPeriodo]=useState<PeriodoGraficoERN>({inicio:"",fim:""});
  const [pendente,setPendente]=useState(true);
  const [roscaPendente,setRoscaPendente]=useState(true);
  const [pagina,setPagina]=useState(0);
  const controlado=props.registros!==undefined;
  useEffect(()=>{setPeriodo(periodoRecenteERN(hojeGraficoManaus()));},[]);
  useEffect(()=>{
    if(controlado)return;let ativo=true;setCarregandoLocal(true);setErroLocal("");
    void consultarFinanceiroERN().then(dados=>{if(ativo)setLocais(dados);}).catch(falha=>{if(ativo)setErroLocal(falha instanceof Error?falha.message:"Não foi possível carregar a análise.");}).finally(()=>{if(ativo)setCarregandoLocal(false);});
    return()=>{ativo=false;};
  },[controlado,tentativa]);
  const registros=props.registros??locais;
  const carregando=controlado?!!props.carregando:carregandoLocal;
  const erro=controlado?props.erro??"":erroLocal;
  const resultado=useMemo(()=>{try{return {analise:analisarGraficosFinanceirosERN(registros,periodo),erro:""};}catch(falha){return {analise:null,erro:falha instanceof Error?falha.message:"Não foi possível calcular os gráficos."};}},[registros,periodo]);
  const analise=resultado.analise;
  const valido=periodoGraficoValido(periodo);
  const paginas=Math.max(1,Math.ceil((analise?.meses.length??0)/6));
  const atual=Math.min(pagina,paginas-1);
  const meses=analise?.meses.slice(atual*6,atual*6+6)??[];
  useEffect(()=>{setPagina(Math.max(0,Math.ceil((analise?.meses.length??0)/6)-1));},[periodo.inicio,periodo.fim,analise?.meses.length]);
  const alternar=(ativo:boolean)=>`${botao} ${ativo?"border-[#E3A144]/50 bg-[#E3A144]/10 text-[#F4C77E]":"border-white/15 text-[#B4C8BB]"}`;
  return <section aria-labelledby="titulo-analise-financeira" className="ern-financeiro-graficos mb-6 space-y-4 text-[#EDEDE3]">
    <div className={painel}><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[.2em] text-[#E3A144]">Inteligência financeira</p><h2 id="titulo-analise-financeira" className="mt-2 text-2xl" style={{fontFamily:"var(--font-fraunces), serif"}}>Sua operação em números</h2><p className="mt-2 max-w-3xl text-xs leading-6 text-[#B4C8BB]">Realizados pela liquidação; pendentes pelo vencimento. Este painel usa o período abaixo, independente dos filtros da listagem. Padrão: seis meses, incluindo todo o mês atual.</p></div><button type="button" disabled={carregando} className={alternar(false)} onClick={()=>{if(props.aoAtualizar)void props.aoAtualizar();else setTentativa(t=>t+1);}}>Atualizar análise</button></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><label className="text-xs text-[#B4C8BB]">Início<input aria-label="Início do período dos gráficos" type="date" value={periodo.inicio} onChange={e=>setPeriodo(p=>({...p,inicio:e.target.value}))} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-[#07110E] px-3 text-sm text-[#EDEDE3] [color-scheme:dark]"/></label><label className="text-xs text-[#B4C8BB]">Fim<input aria-label="Fim do período dos gráficos" type="date" value={periodo.fim} onChange={e=>setPeriodo(p=>({...p,fim:e.target.value}))} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-[#07110E] px-3 text-sm text-[#EDEDE3] [color-scheme:dark]"/></label><button type="button" onClick={()=>setPeriodo(periodoRecenteERN(hojeGraficoManaus()))} className={alternar(false)+" self-end"}>Últimos 6 meses</button></div>
    </div>
    {carregando?<p role="status" className={painel}>Consultando lançamentos…</p>:erro||resultado.erro?<p role="alert" className={painel+" text-rose-300"}>{erro||resultado.erro}</p>:!valido?<p role="alert" className={painel}>Informe um período válido de até 24 meses.</p>:analise&&<>
      {(analise.semLiquidacao+analise.semVencimento+analise.inconsistentes>0)&&<details className={painel+" text-xs text-amber-200"}><summary className="min-h-11 cursor-pointer py-3">{analise.semLiquidacao+analise.semVencimento+analise.inconsistentes} registro(s) precisam de revisão no histórico</summary><p className="leading-6">Sem liquidação válida: {analise.semLiquidacao}. Sem vencimento válido: {analise.semVencimento}. Valor, tipo, status ou liquidação inconsistente: {analise.inconsistentes}. Esses registros ficam fora dos gráficos.</p></details>}
      <TendenciaLiquidaERN meses={analise.meses}/><div className="grid gap-4 xl:grid-cols-2"><article className={painel}><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-base font-semibold">Despesas por categoria</h3><div className="flex gap-2"><button type="button" aria-pressed={!roscaPendente} className={alternar(!roscaPendente)} onClick={()=>setRoscaPendente(false)}>Pagas</button><button type="button" aria-pressed={roscaPendente} className={alternar(roscaPendente)} onClick={()=>setRoscaPendente(true)}>A pagar</button></div></div><p className="mt-2 text-xs text-[#B4C8BB]">{roscaPendente?"Pendentes, pela data de vencimento.":"Pagas, pela data efetiva de pagamento."}</p><Rosca categorias={roscaPendente?analise.categoriasPendentes:analise.categoriasPagas} total={roscaPendente?analise.totais.pagar:analise.totais.pago}/></article>
      <article className={painel}><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-base font-semibold">Entradas e saídas por mês</h3><div className="flex gap-2"><button type="button" aria-pressed={!pendente} className={alternar(!pendente)} onClick={()=>setPendente(false)}>Realizados</button><button type="button" aria-pressed={pendente} className={alternar(pendente)} onClick={()=>setPendente(true)}>Pendentes</button></div></div><Colunas meses={meses} pendente={pendente}/>{paginas>1&&<div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs"><button type="button" disabled={atual===0} className={alternar(false)} onClick={()=>setPagina(p=>Math.max(0,p-1))}>← Meses anteriores</button><span>{atual*6+1}–{Math.min((atual+1)*6,analise.meses.length)} de {analise.meses.length} meses</span><button type="button" disabled={atual===paginas-1} className={alternar(false)} onClick={()=>setPagina(p=>Math.min(paginas-1,p+1))}>Próximos meses →</button></div>}</article></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{[{nome:"Recebido",valor:analise.totais.recebido},{nome:"Pago",valor:analise.totais.pago},{nome:"A receber",valor:analise.totais.receber},{nome:"A pagar",valor:analise.totais.pagar},{nome:"Movimento líquido",valor:analise.totais.recebido-analise.totais.pago}].map(c=><div key={c.nome} className="min-w-0 rounded-xl border border-white/10 p-3"><p className="text-[11px] text-[#B4C8BB]">{c.nome} · período inteiro</p><p className="mt-2 break-words text-base font-semibold tabular-nums text-[#F4C77E]">{moeda(c.valor)}</p></div>)}</div><p className="text-[11px] leading-5 text-[#B4C8BB]">Movimento líquido é recebido menos pago no período, a partir de zero. Não representa saldo bancário nem lucro. A rosca mostra o período inteiro; as colunas mostram até seis meses por janela.</p>
    </>}
  </section>;
}

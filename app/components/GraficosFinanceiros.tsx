"use client";
import { useEffect, useMemo, useState } from "react";
import { consultarFinanceiroERN, type RegistroFinanceiroERN } from "@/lib/financeiroConsultaERN";
import { analisarGraficosFinanceirosERN, hojeGraficoManaus, periodoGraficoValido, periodoRecenteERN, type PeriodoGraficoERN, type MesFinanceiroERN } from "@/lib/financeiroGraficosERN";
type Props={registros?:RegistroFinanceiroERN[];carregando?:boolean;erro?:string;aoAtualizar?:()=>void|Promise<void>};
const moeda=(n:number)=>(n/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const CORES=["#E3A144","#34d399","#60a5fa","#f472b6","#a78bfa","#94a3b8"];
const painel="min-w-0 rounded-2xl border border-white/10 bg-[#0A1713] p-4 sm:p-5";
const botao="min-h-11 rounded-xl border px-3 text-xs font-semibold disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4C77E]";
function Rosca({categorias,total}:{categorias:[string,number][];total:number}){
  const [ativa,setAtiva]=useState<number|null>(null);
  const fatias=useMemo(()=>categorias.length<=6?categorias:[...categorias.slice(0,5),["Demais categorias",categorias.slice(5).reduce((s,c)=>s+c[1],0)] as [string,number]], [categorias]);
  const escolhida=ativa===null?null:fatias[ativa];
  const raio=76,circunferencia=2*Math.PI*raio;let acumulado=0;
  return <div className="mt-3 grid min-w-0 items-center gap-3 min-[480px]:grid-cols-[200px_1fr] xl:grid-cols-[210px_1fr]">
    <svg viewBox="0 0 220 220" className="mx-auto h-[210px] w-[210px] max-w-full" role="img" aria-label={total>0?`Distribuição de despesas: ${moeda(total)}`:"Sem despesas nesta situação e período"}>
      <circle cx="110" cy="110" r={raio} fill="none" stroke="#ffffff0d" strokeWidth="28"/>
      {total>0&&fatias.map(([nome,valor],i)=>{const trecho=valor/total*circunferencia;const deslocamento=-acumulado;acumulado+=trecho;return <circle key={nome} cx="110" cy="110" r={raio} fill="none" stroke={CORES[i]} strokeWidth={ativa===i?32:28} strokeDasharray={`${trecho} ${circunferencia-trecho}`} strokeDashoffset={deslocamento} transform="rotate(-90 110 110)" onMouseEnter={()=>setAtiva(i)} onMouseLeave={()=>setAtiva(null)}><title>{nome}: {moeda(valor)} · {(valor/total*100).toFixed(1)}%</title></circle>;})}
      <text x="110" y="101" textAnchor="middle" fill="#B4C8BB" fontSize="10">{escolhida?"Categoria selecionada":"Total no período"}</text>
      <text x="110" y="124" textAnchor="middle" fill="#F0F0E8" fontSize="15" fontWeight="700">{moeda(escolhida?.[1]??total)}</text>
      {!total&&<text x="110" y="143" textAnchor="middle" fill="#B4C8BB" fontSize="9">Sem despesas</text>}
    </svg>
    {total>0?<ul className="max-h-[210px] min-w-0 space-y-1 overflow-y-auto">{fatias.map(([nome,valor],i)=><li key={nome}><button type="button" className="flex min-h-11 w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#F4C77E]" onMouseEnter={()=>setAtiva(i)} onMouseLeave={()=>setAtiva(null)} onFocus={()=>setAtiva(i)} onBlur={()=>setAtiva(null)} onClick={()=>setAtiva(ativa===i?null:i)}><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{background:CORES[i]}}/><span className="min-w-0 flex-1"><span className="block break-words text-[#EDEDE3]">{nome}</span><span className="mt-1 block text-[#B4C8BB]">{moeda(valor)} · {(valor/total*100).toLocaleString("pt-BR",{maximumFractionDigits:1})}%</span></span></button></li>)}</ul>:<p className="text-sm leading-6 text-[#B4C8BB]">Nenhuma despesa dessa situação nas datas selecionadas. Experimente outra situação ou período.</p>}
  </div>;
}
function Colunas({meses,pendente}:{meses:MesFinanceiroERN[];pendente:boolean}){
  const entrada=pendente?"receber":"recebido",saida=pendente?"pagar":"pago";
  const maiorValor=Math.max(0,...meses.flatMap(m=>[m[entrada],m[saida]]));
  const maximo=Math.max(1,maiorValor);
  return <div className="mt-3">
    <div className="flex flex-wrap gap-4 text-xs text-[#B4C8BB]"><span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-400"/>{pendente?"A receber":"Recebido"}</span><span><span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{background:pendente?"#E3A144":"#fb7185"}}/>{pendente?"A pagar":"Pago"}</span><span>Escala desta janela: {moeda(maiorValor)}</span></div>
    <div className="relative mt-4 h-[210px] border-b border-white/20" role="img" aria-label={`Comparação mensal de ${pendente?"pendências":"valores realizados"}. Valores exatos disponíveis abaixo.`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-0">{[0,1,2,3].map(n=><span key={n} className="block border-t border-dashed border-white/[0.07]"/>)}</div>
      <div className="relative grid h-full gap-2 px-1" style={{gridTemplateColumns:`repeat(${Math.max(1,meses.length)}, minmax(0, 1fr))`}}>{meses.map(m=><div key={m.chave} className="flex h-full min-w-0 items-end justify-center gap-1.5">{[{nome:pendente?"A receber":"Recebido",valor:m[entrada],cor:"#34d399"},{nome:pendente?"A pagar":"Pago",valor:m[saida],cor:pendente?"#E3A144":"#fb7185"}].map(s=><div key={s.nome} className="w-full max-w-7 rounded-t-md" title={`${m.nome} · ${s.nome}: ${moeda(s.valor)}`} style={{height:`${s.valor/maximo*100}%`,background:s.cor}}/>)}</div>)}</div>
    </div>
    <div className="mt-2 grid gap-2 px-1 text-center text-[10px] text-[#B4C8BB]" style={{gridTemplateColumns:`repeat(${Math.max(1,meses.length)}, minmax(0, 1fr))`}}>{meses.map(m=><span key={m.chave}>{m.nome}</span>)}</div>
    <details className="mt-3 text-xs"><summary className="min-h-11 cursor-pointer py-3 text-[#F4C77E]">Ver valores exatos destes meses</summary><div className="max-h-48 overflow-auto"><table className="w-full text-left"><thead><tr><th className="py-2">Mês</th><th>{pendente?"A receber":"Recebido"}</th><th>{pendente?"A pagar":"Pago"}</th></tr></thead><tbody>{meses.map(m=><tr key={m.chave} className="border-t border-white/10"><td className="py-2">{m.nome}</td><td>{moeda(m[entrada])}</td><td>{moeda(m[saida])}</td></tr>)}</tbody></table></div></details>
  </div>;
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
  return <section aria-labelledby="titulo-analise-financeira" className="mb-6 space-y-4 text-[#EDEDE3]">
    <div className={painel}><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[.2em] text-[#E3A144]">Inteligência financeira</p><h2 id="titulo-analise-financeira" className="mt-2 text-2xl" style={{fontFamily:"var(--font-fraunces), serif"}}>Sua operação em números</h2><p className="mt-2 max-w-3xl text-xs leading-6 text-[#B4C8BB]">Realizados pela liquidação; pendentes pelo vencimento. Este painel usa o período abaixo, independente dos filtros da listagem. Padrão: seis meses, incluindo todo o mês atual.</p></div><button type="button" disabled={carregando} className={alternar(false)} onClick={()=>{if(props.aoAtualizar)void props.aoAtualizar();else setTentativa(t=>t+1);}}>Atualizar análise</button></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><label className="text-xs text-[#B4C8BB]">Início<input aria-label="Início do período dos gráficos" type="date" value={periodo.inicio} onChange={e=>setPeriodo(p=>({...p,inicio:e.target.value}))} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-[#07110E] px-3 text-sm text-[#EDEDE3] [color-scheme:dark]"/></label><label className="text-xs text-[#B4C8BB]">Fim<input aria-label="Fim do período dos gráficos" type="date" value={periodo.fim} onChange={e=>setPeriodo(p=>({...p,fim:e.target.value}))} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-[#07110E] px-3 text-sm text-[#EDEDE3] [color-scheme:dark]"/></label><button type="button" onClick={()=>setPeriodo(periodoRecenteERN(hojeGraficoManaus()))} className={alternar(false)+" self-end"}>Últimos 6 meses</button></div>
    </div>
    {carregando?<p role="status" className={painel}>Consultando lançamentos…</p>:erro||resultado.erro?<p role="alert" className={painel+" text-rose-300"}>{erro||resultado.erro}</p>:!valido?<p role="alert" className={painel}>Informe um período válido de até 24 meses.</p>:analise&&<>
      {(analise.semLiquidacao+analise.semVencimento+analise.inconsistentes>0)&&<details className={painel+" text-xs text-amber-200"}><summary className="min-h-11 cursor-pointer py-3">{analise.semLiquidacao+analise.semVencimento+analise.inconsistentes} registro(s) precisam de revisão no histórico</summary><p className="leading-6">Sem liquidação válida: {analise.semLiquidacao}. Sem vencimento válido: {analise.semVencimento}. Valor, tipo, status ou liquidação inconsistente: {analise.inconsistentes}. Esses registros ficam fora dos gráficos.</p></details>}
      <div className="grid gap-4 xl:grid-cols-2"><article className={painel}><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-base font-semibold">Despesas por categoria</h3><div className="flex gap-2"><button type="button" aria-pressed={!roscaPendente} className={alternar(!roscaPendente)} onClick={()=>setRoscaPendente(false)}>Pagas</button><button type="button" aria-pressed={roscaPendente} className={alternar(roscaPendente)} onClick={()=>setRoscaPendente(true)}>A pagar</button></div></div><p className="mt-2 text-xs text-[#B4C8BB]">{roscaPendente?"Pendentes, pela data de vencimento.":"Pagas, pela data efetiva de pagamento."}</p><Rosca categorias={roscaPendente?analise.categoriasPendentes:analise.categoriasPagas} total={roscaPendente?analise.totais.pagar:analise.totais.pago}/></article>
      <article className={painel}><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-base font-semibold">Entradas e saídas por mês</h3><div className="flex gap-2"><button type="button" aria-pressed={!pendente} className={alternar(!pendente)} onClick={()=>setPendente(false)}>Realizados</button><button type="button" aria-pressed={pendente} className={alternar(pendente)} onClick={()=>setPendente(true)}>Pendentes</button></div></div><Colunas meses={meses} pendente={pendente}/>{paginas>1&&<div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs"><button type="button" disabled={atual===0} className={alternar(false)} onClick={()=>setPagina(p=>Math.max(0,p-1))}>← Meses anteriores</button><span>{atual*6+1}–{Math.min((atual+1)*6,analise.meses.length)} de {analise.meses.length} meses</span><button type="button" disabled={atual===paginas-1} className={alternar(false)} onClick={()=>setPagina(p=>Math.min(paginas-1,p+1))}>Próximos meses →</button></div>}</article></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{[{nome:"Recebido",valor:analise.totais.recebido},{nome:"Pago",valor:analise.totais.pago},{nome:"A receber",valor:analise.totais.receber},{nome:"A pagar",valor:analise.totais.pagar},{nome:"Movimento líquido",valor:analise.totais.recebido-analise.totais.pago}].map(c=><div key={c.nome} className="min-w-0 rounded-xl border border-white/10 p-3"><p className="text-[11px] text-[#B4C8BB]">{c.nome} · período inteiro</p><p className="mt-2 break-words text-base font-semibold tabular-nums text-[#F4C77E]">{moeda(c.valor)}</p></div>)}</div><p className="text-[11px] leading-5 text-[#B4C8BB]">Movimento líquido é recebido menos pago no período, a partir de zero. Não representa saldo bancário nem lucro. A rosca mostra o período inteiro; as colunas mostram até seis meses por janela.</p>
    </>}
  </section>;
}

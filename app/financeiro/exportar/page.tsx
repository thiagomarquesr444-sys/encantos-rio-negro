"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { consultarFinanceiroERN, filtrarFinanceiroERN, periodoFinanceiroERN, statusFinanceiroERN, type RegistroFinanceiroERN, type FiltroPeriodoFinanceiroERN } from "@/lib/financeiroConsultaERN";
const PERIODOS: {valor:FiltroPeriodoFinanceiroERN;nome:string}[]=[{valor:"todos",nome:"Histórico"},{valor:"mes_atual",nome:"Mês atual — vencimentos"},{valor:"receitas",nome:"Receitas"},{valor:"despesas",nome:"Despesas"},{valor:"pendentes",nome:"Pendentes"},{valor:"com_reserva",nome:"Com reserva"}];
function protegerCSV(entrada: unknown): string {
  let valor=String(entrada??"");
  if(/^[\s\u0000-\u001f]*[=+\-@]/.test(valor))valor=`'${valor}`;
  return `"${valor.replace(/"/g,'""')}"`;
}
function valorRegistro(item: RegistroFinanceiroERN): number {
  const numero=Number(item.valor !== undefined ? item.valor : item.Valor);
  return Number.isFinite(numero)?numero:0;
}
const moeda=(valor:number)=>valor.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const data=(valor?:string|null)=>valor?.slice(0,10).split("-").reverse().join("/")??"";
export default function ExportarRelatorioPage(){
  const [dados,setDados]=useState<RegistroFinanceiroERN[]>([]);
  const [carregando,setCarregando]=useState(true);
  const [erro,setErro]=useState("");
  const [periodo,setPeriodo]=useState<FiltroPeriodoFinanceiroERN>("todos");
  const [busca,setBusca]=useState("");
  const [reserva,setReserva]=useState("");
  const [tentativa,setTentativa]=useState(0);
  useEffect(()=>{
    const parametros=new URLSearchParams(window.location.search);
    setPeriodo(periodoFinanceiroERN(parametros.get("periodo")));
    setBusca(parametros.get("busca")??"");setReserva(parametros.get("reserva_id")??"");
  },[]);
  useEffect(()=>{
    let ativo=true;setCarregando(true);setErro("");setDados([]);
    void consultarFinanceiroERN<RegistroFinanceiroERN>().then(lista=>{if(ativo)setDados(lista);}).catch(falha=>{if(ativo)setErro(falha&&typeof falha==="object"&&"message"in falha?String(falha.message):"Não foi possível carregar a exportação.");}).finally(()=>{if(ativo)setCarregando(false);});
    return()=>{ativo=false;};
  },[tentativa]);
  const filtrados=useMemo(()=>filtrarFinanceiroERN(dados,periodo,busca,reserva.trim()),[dados,periodo,busca,reserva]);
  const totais=useMemo(()=>filtrados.reduce((s,item)=>{const tipo=(item.tipo??"").toLowerCase().trim();if(tipo==="receita")s.receitas+=valorRegistro(item);if(tipo==="despesa")s.despesas+=valorRegistro(item);return s;},{receitas:0,despesas:0}),[filtrados]);
  function baixarCSV(){
    if(carregando||erro||!filtrados.length)return;
    const cabecalho=["ID","Reserva ID","Data de vencimento","Data efetiva de recebimento/pagamento","Tipo","Descrição","Categoria","Valor (R$)","Status"];
    const linhas=filtrados.map(item=>[item.id??"",item.reserva_id??"",data(item.data_vencimento),data(item.data_liquidacao),item.tipo??"",item.descricao||item.descrição||"",item.categoria??"",valorRegistro(item).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}),statusFinanceiroERN(item)]);
    const conteudo=[cabecalho,...linhas].map(linha=>linha.map(protegerCSV).join(";")).join("\r\n");
    const blob=new Blob(["\uFEFF",conteudo],{type:"text/csv;charset=utf-8;"});const url=URL.createObjectURL(blob);
    const link=document.createElement("a");link.href=url;link.download=`ERN-financeiro-${new Intl.DateTimeFormat("en-CA",{timeZone:"America/Manaus",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()).replace(/[^0-9-]/g,"-")}.csv`;
    document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
  }
  const campo="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-white/20 bg-[#07110E] px-3 py-2 text-sm text-[#EDEDE3]";
  const botao="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 px-4 text-sm disabled:opacity-50";
  const volta=new URLSearchParams({periodo,busca});if(reserva.trim())volta.set("reserva_id",reserva.trim());
  return <main className="min-h-screen min-w-0 bg-[#07110E] px-4 py-8 text-[#EDEDE3] sm:px-6">
    <div className="mx-auto max-w-7xl"><Link href={`/financeiro?${volta.toString()}`} className={botao}>← Financeiro</Link>
      <p className="mt-6 text-xs uppercase tracking-[.18em] text-[#E3A144]">Financeiro · Relatório</p>
      <h1 className="mt-3 text-3xl sm:text-4xl" style={{fontFamily:"var(--font-fraunces), serif"}}>Exportar financeiro</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[#B4C8BB]">A exportação recebe os filtros da listagem e inclui a reserva vinculada e as datas de vencimento e liquidação. Os dados respeitam o acesso da sua conta.</p>
      <section className="mt-6 rounded-2xl border border-white/10 bg-[#0A1713] p-4 sm:p-6"><h2 className="text-lg text-[#F4C77E]">Filtros da exportação</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3"><label className="text-sm">Exibir<select aria-label="Filtro da exportação" className={campo} value={periodo} onChange={e=>setPeriodo(periodoFinanceiroERN(e.target.value))}>{PERIODOS.map(p=><option key={p.valor} value={p.valor}>{p.nome}</option>)}</select></label><label className="text-sm">Buscar lançamento<input aria-label="Busca da exportação" className={campo} value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Descrição, categoria, status ou reserva"/></label><label className="text-sm">ID exato da reserva (opcional)<input aria-label="Reserva da exportação" className={campo} value={reserva} onChange={e=>setReserva(e.target.value)} placeholder="Sem preenchimento: todas"/></label></div>
        <p className="mt-3 text-xs leading-6 text-[#B4C8BB]">Mês atual usa a data de vencimento no calendário de Manaus. Receitas e despesas lançadas incluem pendências; esses totais não representam recebimentos ou pagamentos realizados.</p>
      </section>
      {erro&&<div role="alert" className="mt-5 rounded-xl border border-red-400/30 p-4 text-sm text-red-200"><p>{erro}</p><button type="button" className={botao+" mt-3"} onClick={()=>setTentativa(t=>t+1)}>Tentar carregar novamente</button></div>}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">{[{nome:"Lançamentos filtrados",valor:String(filtrados.length)},{nome:"Receitas lançadas",valor:moeda(totais.receitas)},{nome:"Despesas lançadas",valor:moeda(totais.despesas)}].map(c=><div key={c.nome} className="rounded-2xl border border-white/10 p-5"><p className="text-xs text-[#B4C8BB]">{c.nome}</p><p className="mt-3 text-2xl text-[#F4C77E]">{carregando||erro?"—":c.valor}</p></div>)}</div>
      <section className="mt-5 overflow-hidden rounded-2xl border border-white/10"><div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-6"><div><h2 className="text-xl">Pré-visualização</h2><p role="status" className="mt-2 text-xs text-[#B4C8BB]">{carregando?"Carregando lançamentos…":`${filtrados.length} de ${dados.length} registros acessíveis. A pré-visualização mostra até 100; o CSV inclui todos os filtrados.`}</p></div><button type="button" onClick={baixarCSV} disabled={carregando||!!erro||filtrados.length===0} className={botao+" bg-[#E3A144] font-semibold text-[#07110E]"}>Exportar CSV</button></div>
        {!carregando&&!erro&&!filtrados.length&&<p className="p-6 text-sm">Nenhum lançamento corresponde aos filtros.</p>}
        {!carregando&&!erro&&!!filtrados.length&&<div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-xs"><thead className="border-y border-white/10 text-[#B4C8BB]"><tr>{["Vencimento","Liquidação","Tipo","Descrição","Reserva","Valor","Status"].map(c=><th key={c} className="p-4">{c}</th>)}</tr></thead><tbody>{filtrados.slice(0,100).map(item=><tr key={item.id} className="border-b border-white/10"><td className="p-4">{data(item.data_vencimento)||"—"}</td><td className="p-4">{data(item.data_liquidacao)||"—"}</td><td className="p-4">{item.tipo}</td><td className="p-4">{item.descricao||item.descrição||"—"}</td><td className="p-4 font-mono">{item.reserva_id||"Avulso"}</td><td className="p-4">{moeda(valorRegistro(item))}</td><td className="p-4">{statusFinanceiroERN(item)}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  </main>;
}

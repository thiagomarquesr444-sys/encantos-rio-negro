"use client";
import { useMemo, useState } from "react";
import { CATEGORIAS_DEMANDA, STATUS_DEMANDA, type Demanda } from "@/lib/demandas";

type Props = { registros: Demanda[]; totalConsulta: number; pagina: number; totalPaginas: number };
const statusCores: Record<string,string> = { aberta: "#5fd5ad", rascunho: "#94a3b8", encerrada: "#67b7e8", cancelada: "#f58f94" };
const cores = ["#e8ac58", "#68b9e7", "#6bd4b0", "#b6a4f5", "#f18f91", "#9caaba", "#d5ca82"];

export default function DemandasInsightsPremium({ registros, totalConsulta, pagina, totalPaginas }: Props) {
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const analise = useMemo(() => {
    const estados = Object.entries(STATUS_DEMANDA).map(([id, nome]) => ({ id, nome, quantidade: registros.filter(r => r.status === id).length }));
    const categorias = Object.entries(CATEGORIAS_DEMANDA).map(([id, nome]) => ({ id, nome, quantidade: registros.filter(r => r.categoria === id).length })).filter(c => c.quantidade > 0).sort((a,b) => b.quantidade - a.quantidade);
    return { estados, categorias, quantidade: registros.length, abertas: estados.find(s => s.id === "aberta")?.quantidade ?? 0 };
  }, [registros]);
  const total = analise.quantidade;
  let acumulado = 0;
  const segmentos = analise.estados.map(item => {
    const inicio = acumulado;
    acumulado += total > 0 ? item.quantidade / total * 100 : 0;
    return `${statusCores[item.id] ?? "#e8ac58"} ${inicio}% ${acumulado}%`;
  });
  const fundoRosca = total > 0 ? `conic-gradient(${segmentos.join(", ")})` : "conic-gradient(#394345 0% 100%)";
  const maior = Math.max(1, ...analise.categorias.map(c => c.quantidade));
  return (
    <section className="ern-dem-inteligencia" aria-labelledby="ern-demandas-inteligencia">
      <div className="ern-dem-inteligencia-head">
        <div><span className="ern-dem-sobretitulo">CENTRO DE INTELIGENCIA OPERACIONAL</span>
          <h2 id="ern-demandas-inteligencia">Panorama das demandas</h2>
          <p>Distribuicao da pagina consultada, sem estimativas ou dados simulados.</p>
        </div>
        <span className="ern-dem-escopo">Pagina {pagina + 1} de {Math.max(1,totalPaginas)} · {totalConsulta} resultado(s) na consulta</span>
      </div>
      <div className="ern-dem-metricas">
        <div className="ern-dem-metrica ern-dem-metrica-principal"><span>Demandas nesta pagina</span><strong>{total}</strong><small>Total da consulta: {totalConsulta}</small></div>
        <div className="ern-dem-metrica"><span>Abertas nesta pagina</span><strong>{analise.abertas}</strong><small>Disponiveis para acompanhamento</small></div>
        <div className="ern-dem-metrica"><span>Categorias presentes</span><strong>{analise.categorias.length}</strong><small>Tipos de necessidade exibidos</small></div>
      </div>
      <div className="ern-dem-visual-grid">
        <article className="ern-dem-grafico">
          <div className="ern-dem-grafico-head"><h3>Situacao operacional</h3><span>Distribuicao por status</span></div>
          <div className="ern-dem-rosca-layout">
            <div role="img" aria-label={`Distribuicao de status dos ${total} registros desta pagina`} className="ern-dem-rosca" style={{background: fundoRosca}}>
              <div className="ern-dem-rosca-centro"><small>Demandas</small><strong>{total}</strong><small>na pagina</small></div>
            </div>
            <div className="ern-dem-legenda">{analise.estados.map(s => <div key={s.id} className="ern-dem-legenda-linha"><span className="ern-dem-ponto" style={{background:statusCores[s.id] ?? "#e8ac58"}}/><span>{s.nome}</span><strong>{s.quantidade}</strong><small>{total ? (s.quantidade/total*100).toLocaleString("pt-BR",{maximumFractionDigits:1}) : "0"}%</small></div>)}</div>
          </div>
        </article>
        <article className="ern-dem-grafico">
          <div className="ern-dem-grafico-head"><h3>Mapa de categorias</h3><span>Frequencia por demanda</span></div>
          {analise.categorias.length ? <div className="ern-dem-barras">{analise.categorias.map((c,i) => <button key={c.id} type="button" aria-pressed={categoriaAtiva===c.id} className="ern-dem-barra-linha" onClick={()=>setCategoriaAtiva(categoriaAtiva===c.id ? null : c.id)}>
            <span className="ern-dem-barra-topo"><span>{c.nome}</span><strong>{c.quantidade} · {total ? (c.quantidade/total*100).toLocaleString("pt-BR",{maximumFractionDigits:1}) : "0"}%</strong></span>
            <span className="ern-dem-barra-trilho"><span style={{width:`${100*c.quantidade/maior}%`,background:cores[i%cores.length]}}/></span>
          </button>)}</div> : <p className="ern-dem-vazio">Sem categorias nos registros desta pagina.</p>}
          <p className="ern-dem-grafico-nota">Selecione uma barra para destaca-la. As quantidades sao contagens, nao valores financeiros.</p>
        </article>
      </div>
      <p className="ern-dem-aviso">A listagem usa paginacao no servidor. Graficos e indicadores descrevem somente os {total} registros carregados nesta pagina; nao representam a distribuicao de todas as {totalConsulta} demandas encontradas.</p>
    </section>
  );
}

"use client";
// ERN_GRAFICOS_EDA_V1: panorama das demandas no conjunto premium.
import { useMemo } from "react";
import { CATEGORIAS_DEMANDA, STATUS_DEMANDA, type Demanda } from "@/lib/demandas";
import { BarrasHorizontaisEDA, CartaoGraficoEDA, RoscaEDA, type TomGraficoEDA } from "@/app/components/GraficosEDA";

type Props = { registros: Demanda[]; totalConsulta: number; pagina: number; totalPaginas: number };
const TOM_STATUS: Record<string, TomGraficoEDA> = { aberta: "at", rascunho: "nt", encerrada: "ok", cancelada: "er" };

export default function DemandasInsightsPremium({ registros, totalConsulta, pagina, totalPaginas }: Props) {
  const analise = useMemo(() => {
    const estados = Object.entries(STATUS_DEMANDA).map(([id, nome]) => ({ id, nome, quantidade: registros.filter(r => r.status === id).length }));
    const categorias = Object.entries(CATEGORIAS_DEMANDA)
      .map(([id, nome]) => ({ id, nome, quantidade: registros.filter(r => r.categoria === id).length }))
      .filter(c => c.quantidade > 0)
      .sort((a, b) => b.quantidade - a.quantidade);
    return { estados, categorias, quantidade: registros.length, abertas: estados.find(s => s.id === "aberta")?.quantidade ?? 0 };
  }, [registros]);
  const total = analise.quantidade;
  const inteiro = (v: number) => v.toLocaleString("pt-BR");

  return (
    <section aria-labelledby="ern-demandas-inteligencia" style={{ display: "grid", gap: 16, minWidth: 0 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
        <div>
          <p className="eda-g-eb">Inteligência operacional</p>
          <h2 id="ern-demandas-inteligencia" className="eda-sec-titulo" style={{ margin: "4px 0 0" }}>Panorama das demandas</h2>
        </div>
        <span className="eda-pg-mut" style={{ fontSize: 12.5 }}>Página {pagina + 1} de {Math.max(1, totalPaginas)} · {totalConsulta} resultado(s)</span>
      </div>

      <section className="eda-pg-kpis" aria-label="Resumo da página" style={{ marginTop: 0, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <div className="eda-pg-kpi"><small>Demandas nesta página</small><b>{total}</b><span>Total da consulta: {totalConsulta}</span></div>
        <div className={`eda-pg-kpi ${analise.abertas ? "eda-pg-kpi-at" : ""}`}><small>Abertas nesta página</small><b>{analise.abertas}</b><span>Disponíveis para acompanhamento</span></div>
        <div className="eda-pg-kpi"><small>Categorias presentes</small><b>{analise.categorias.length}</b><span>Tipos de necessidade exibidos</span></div>
      </section>

      <div className="eda-g-grade-cartoes">
        <CartaoGraficoEDA etiqueta="Situação" titulo="Demandas por situação" sub="Distribuição dos registros desta página.">
          {total === 0 ? <p className="eda-pg-texto-mut">Nenhuma demanda nesta página.</p> : (
            <RoscaEDA
              itens={analise.estados.map(s => ({ nome: s.nome, valor: s.quantidade, tom: TOM_STATUS[s.id] ?? "nt" }))}
              centro={String(total)}
              sub={total === 1 ? "demanda" : "demandas"}
              rotulo={`Distribuição de status dos ${total} registros desta página`}
            />
          )}
        </CartaoGraficoEDA>
        <CartaoGraficoEDA etiqueta="Categorias" titulo="Demandas por categoria" sub="Contagem de demandas, não valores financeiros.">
          {analise.categorias.length === 0 ? <p className="eda-pg-texto-mut">Sem categorias nos registros desta página.</p> : (
            <BarrasHorizontaisEDA
              linhas={analise.categorias.map(c => ({ rotulo: c.nome, valores: [c.quantidade] }))}
              series={[{ nome: "Demandas", c: "s1" }]}
              formatar={inteiro}
              rotulo="Demandas por categoria"
              largRotulo={130}
            />
          )}
        </CartaoGraficoEDA>
      </div>

      <p className="eda-pg-nota">A listagem usa paginação no servidor. Estes gráficos descrevem só os {total} registros desta página, não todas as {totalConsulta} demandas encontradas.</p>
    </section>
  );
}

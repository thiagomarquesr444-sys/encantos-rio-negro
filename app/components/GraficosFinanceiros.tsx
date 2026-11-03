"use client";
// ERN_GRAFICOS_EDA_V1: gráficos do Financeiro no conjunto premium (GraficosEDA).
import { useEffect, useMemo, useState } from "react";
import { consultarFinanceiroERN, type RegistroFinanceiroERN } from "@/lib/financeiroConsultaERN";
import { analisarGraficosFinanceirosERN, hojeGraficoManaus, periodoGraficoValido, periodoRecenteERN, type PeriodoGraficoERN } from "@/lib/financeiroGraficosERN";
import { AreaEDA, BarrasAgrupadasEDA, BarrasHorizontaisEDA, CartaoGraficoEDA, TabelaNumerosEDA } from "@/app/components/GraficosEDA";

type Props = { registros?: RegistroFinanceiroERN[]; carregando?: boolean; erro?: string; aoAtualizar?: () => void | Promise<void> };

const moeda = (n: number) => (n / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const curto = (n: number) => {
  const reais = n / 100;
  const abs = Math.abs(reais);
  if (abs >= 1000) return `R$ ${(reais / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
};
const eixo = (n: number) => {
  const reais = n / 100;
  return Math.abs(reais) >= 1000 ? `${(reais / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : reais.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
};
const nomeMes = (nome: string) => nome.replace(".", "").replace(" de ", " ");

function Alternar({ opcoes, valor, aoMudar, rotulo }: { opcoes: [boolean, string][]; valor: boolean; aoMudar: (v: boolean) => void; rotulo: string }) {
  return (
    <div className="eda-pg-chips" role="group" aria-label={rotulo}>
      {opcoes.map(([v, r]) => <button key={r} type="button" className="eda-pg-chip" aria-pressed={valor === v} onClick={() => aoMudar(v)}>{r}</button>)}
    </div>
  );
}

export default function GraficosFinanceiros(props: Props = {}) {
  const [locais, setLocais] = useState<RegistroFinanceiroERN[]>([]);
  const [carregandoLocal, setCarregandoLocal] = useState(true);
  const [erroLocal, setErroLocal] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [periodo, setPeriodo] = useState<PeriodoGraficoERN>({ inicio: "", fim: "" });
  const [pendente, setPendente] = useState(false);
  const [categoriasPendentes, setCategoriasPendentes] = useState(false);
  const [pagina, setPagina] = useState(0);
  const controlado = props.registros !== undefined;

  useEffect(() => { setPeriodo(periodoRecenteERN(hojeGraficoManaus())); }, []);
  useEffect(() => {
    if (controlado) return;
    let ativo = true;
    setCarregandoLocal(true);
    setErroLocal("");
    void consultarFinanceiroERN()
      .then(dados => { if (ativo) setLocais(dados); })
      .catch(falha => { if (ativo) setErroLocal(falha instanceof Error ? falha.message : "Não foi possível carregar a análise."); })
      .finally(() => { if (ativo) setCarregandoLocal(false); });
    return () => { ativo = false; };
  }, [controlado, tentativa]);

  const registros = props.registros ?? locais;
  const carregando = controlado ? !!props.carregando : carregandoLocal;
  const erro = controlado ? props.erro ?? "" : erroLocal;
  const resultado = useMemo(() => {
    try { return { analise: analisarGraficosFinanceirosERN(registros, periodo), erro: "" }; }
    catch (falha) { return { analise: null, erro: falha instanceof Error ? falha.message : "Não foi possível calcular os gráficos." }; }
  }, [registros, periodo]);
  const analise = resultado.analise;
  const valido = periodoGraficoValido(periodo);
  const paginas = Math.max(1, Math.ceil((analise?.meses.length ?? 0) / 6));
  const atual = Math.min(pagina, paginas - 1);
  const meses = analise?.meses.slice(atual * 6, atual * 6 + 6) ?? [];
  useEffect(() => { setPagina(Math.max(0, Math.ceil((analise?.meses.length ?? 0) / 6) - 1)); }, [periodo.inicio, periodo.fim, analise?.meses.length]);

  const categorias = useMemo(() => {
    const lista = (categoriasPendentes ? analise?.categoriasPendentes : analise?.categoriasPagas) ?? [];
    if (lista.length <= 6) return lista;
    return [...lista.slice(0, 5), ["Demais categorias", lista.slice(5).reduce((t, c) => t + c[1], 0)] as [string, number]];
  }, [analise, categoriasPendentes]);

  const pendencias = analise ? analise.semLiquidacao + analise.semVencimento + analise.inconsistentes : 0;

  return (
    <section aria-labelledby="titulo-analise-financeira" className="eda-g-bloco" style={{ display: "grid", gap: 16 }}>
      <CartaoGraficoEDA
        etiqueta="Inteligência financeira"
        titulo="Sua operação em números"
        sub="Realizados pela data de recebimento ou pagamento; pendentes pelo vencimento. Este período vale só para os gráficos."
        acoes={
          <button type="button" disabled={carregando} className="eda-pg-bt eda-pg-bt-p" onClick={() => { if (props.aoAtualizar) void props.aoAtualizar(); else setTentativa(t => t + 1); }}>
            Atualizar análise
          </button>
        }
      >
        <div className="eda-pg-form-2" style={{ alignItems: "end", gridTemplateColumns: "repeat(2, minmax(0, 1fr)) auto" }}>
          <label className="eda-pg-campo" htmlFor="graf-fin-inicio"><span>Início</span>
            <input id="graf-fin-inicio" type="date" value={periodo.inicio} onChange={e => setPeriodo(p => ({ ...p, inicio: e.target.value }))} />
          </label>
          <label className="eda-pg-campo" htmlFor="graf-fin-fim"><span>Fim</span>
            <input id="graf-fin-fim" type="date" value={periodo.fim} onChange={e => setPeriodo(p => ({ ...p, fim: e.target.value }))} />
          </label>
          <button type="button" className="eda-pg-bt" onClick={() => setPeriodo(periodoRecenteERN(hojeGraficoManaus()))}>Últimos 6 meses</button>
        </div>
      </CartaoGraficoEDA>

      {carregando ? (
        <p role="status" className="eda-pg-estado">Consultando lançamentos…</p>
      ) : erro || resultado.erro ? (
        <p role="alert" className="eda-pg-aviso eda-pg-aviso-er">{erro || resultado.erro}</p>
      ) : !valido ? (
        <p role="alert" className="eda-pg-aviso eda-pg-aviso-at">Informe um período válido de até 24 meses.</p>
      ) : analise && (
        <>
          {pendencias > 0 && (
            <details className="eda-pg-aviso eda-pg-aviso-at">
              <summary style={{ cursor: "pointer" }}>{pendencias} registro(s) precisam de revisão e ficaram fora dos gráficos</summary>
              <p style={{ margin: "8px 0 0" }}>Sem data de liquidação válida: {analise.semLiquidacao}. Sem vencimento válido: {analise.semVencimento}. Valor, tipo, status ou liquidação inconsistente: {analise.inconsistentes}.</p>
            </details>
          )}

          <section className="eda-pg-kpis" aria-label="Totais do período" style={{ marginTop: 0 }}>
            {[
              { nome: "Recebido", valor: analise.totais.recebido },
              { nome: "Pago", valor: analise.totais.pago },
              { nome: "A receber", valor: analise.totais.receber },
              { nome: "Movimento líquido", valor: analise.totais.recebido - analise.totais.pago },
            ].map(c => (
              <div key={c.nome} className={`eda-pg-kpi ${c.nome === "Movimento líquido" ? (c.valor >= 0 ? "eda-pg-kpi-ok" : "eda-pg-kpi-er") : ""}`}>
                <small>{c.nome}</small><b>{moeda(c.valor)}</b><span>no período dos gráficos</span>
              </div>
            ))}
          </section>

          <CartaoGraficoEDA etiqueta="Evolução" titulo="Movimento líquido mensal" sub="Recebido menos pago em cada mês. Não é saldo bancário nem lucro.">
            {analise.meses.length === 0 ? <p className="eda-pg-texto-mut">Nenhum mês válido para exibir.</p> : (
              <>
                <AreaEDA
                  categorias={analise.meses.map(m => nomeMes(m.nome))}
                  valores={analise.meses.map(m => m.recebido - m.pago)}
                  nome="Movimento líquido"
                  c="s2"
                  formatar={curto}
                  formatarEixo={eixo}
                  rotulo="Movimento líquido mensal no período"
                />
                <TabelaNumerosEDA cabecalho={["Mês", "Recebido", "Pago", "Movimento"]} linhas={analise.meses.map(m => [nomeMes(m.nome), moeda(m.recebido), moeda(m.pago), moeda(m.recebido - m.pago)])} />
              </>
            )}
          </CartaoGraficoEDA>

          <div className="eda-g-grade-cartoes">
            <CartaoGraficoEDA
              etiqueta="Fluxo"
              titulo={pendente ? "A receber e a pagar por mês" : "Recebido e pago por mês"}
              sub={pendente ? "Pendentes, pela data de vencimento." : "Realizados, pela data em que o dinheiro entrou ou saiu."}
              acoes={<Alternar rotulo="Tipo de valor" valor={pendente} aoMudar={setPendente} opcoes={[[false, "Realizados"], [true, "Pendentes"]]} />}
            >
              {meses.length === 0 ? <p className="eda-pg-texto-mut">Nenhum mês disponível neste período.</p> : (
                <>
                  <BarrasAgrupadasEDA
                    categorias={meses.map(m => nomeMes(m.nome))}
                    series={[
                      { nome: pendente ? "A receber" : "Recebido", c: "s1", valores: meses.map(m => pendente ? m.receber : m.recebido) },
                      { nome: pendente ? "A pagar" : "Pago", c: "s4", valores: meses.map(m => pendente ? m.pagar : m.pago) },
                    ]}
                    formatar={curto}
                    formatarEixo={eixo}
                    rotulo={pendente ? "A receber e a pagar por mês" : "Recebido e pago por mês"}
                  />
                  {paginas > 1 && (
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 10, fontSize: 12 }}>
                      <button type="button" disabled={atual === 0} className="eda-pg-bt eda-pg-bt-p" onClick={() => setPagina(p => Math.max(0, p - 1))}>← Anteriores</button>
                      <span className="eda-pg-mut">{atual * 6 + 1}–{Math.min((atual + 1) * 6, analise.meses.length)} de {analise.meses.length} meses</span>
                      <button type="button" disabled={atual === paginas - 1} className="eda-pg-bt eda-pg-bt-p" onClick={() => setPagina(p => Math.min(paginas - 1, p + 1))}>Próximos →</button>
                    </div>
                  )}
                  <TabelaNumerosEDA
                    cabecalho={["Mês", pendente ? "A receber" : "Recebido", pendente ? "A pagar" : "Pago"]}
                    linhas={meses.map(m => [nomeMes(m.nome), moeda(pendente ? m.receber : m.recebido), moeda(pendente ? m.pagar : m.pago)])}
                  />
                </>
              )}
            </CartaoGraficoEDA>

            <CartaoGraficoEDA
              etiqueta="Despesas"
              titulo="Despesas por categoria"
              sub={categoriasPendentes ? "A pagar, pela data de vencimento." : "Pagas, pela data efetiva de pagamento."}
              acoes={<Alternar rotulo="Situação das despesas" valor={categoriasPendentes} aoMudar={setCategoriasPendentes} opcoes={[[false, "Pagas"], [true, "A pagar"]]} />}
            >
              {categorias.length === 0 ? (
                <p className="eda-pg-texto-mut">Nenhuma despesa nesta situação e período.</p>
              ) : (
                <>
                  <BarrasHorizontaisEDA
                    linhas={categorias.map(([nome, valor]) => ({ rotulo: nome.length > 18 ? `${nome.slice(0, 17)}…` : nome, valores: [valor] }))}
                    series={[{ nome: categoriasPendentes ? "A pagar" : "Pago", c: "s3" }]}
                    formatar={curto}
                    rotulo="Despesas por categoria"
                    largRotulo={128}
                  />
                  <TabelaNumerosEDA cabecalho={["Categoria", "Valor"]} linhas={categorias.map(([n, v]) => [n, moeda(v)])} />
                </>
              )}
            </CartaoGraficoEDA>
          </div>
        </>
      )}
    </section>
  );
}

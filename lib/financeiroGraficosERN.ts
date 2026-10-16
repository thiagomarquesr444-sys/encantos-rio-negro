import type { RegistroFinanceiroERN } from "./financeiroConsultaERN";
export type PeriodoGraficoERN = { inicio: string; fim: string };
export type MesFinanceiroERN = { chave: string; nome: string; recebido: number; pago: number; receber: number; pagar: number };
export function hojeGraficoManaus(agora = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA",{timeZone:"America/Manaus",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(agora);
  const obter=(tipo:string)=>partes.find(p=>p.type===tipo)?.value??"";
  return `${obter("year")}-${obter("month")}-${obter("day")}`;
}
export function dataGraficoValida(valor: unknown): valor is string {
  if(typeof valor!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(valor))return false;
  const data=new Date(`${valor}T12:00:00Z`);
  return Number.isFinite(data.getTime())&&data.toISOString().slice(0,10)===valor;
}
export function periodoGraficoValido(p: PeriodoGraficoERN): boolean {
  return dataGraficoValida(p.inicio)&&dataGraficoValida(p.fim)&&p.inicio<=p.fim&&Number(p.fim.slice(0,4))*12+Number(p.fim.slice(5,7))-(Number(p.inicio.slice(0,4))*12+Number(p.inicio.slice(5,7)))<24;
}
export function periodoRecenteERN(hoje: string, quantidade = 6): PeriodoGraficoERN {
  const ano=Number(hoje.slice(0,4)),mes=Number(hoje.slice(5,7));
  return {inicio:new Date(Date.UTC(ano,mes-quantidade,1)).toISOString().slice(0,10),fim:new Date(Date.UTC(ano,mes,0)).toISOString().slice(0,10)};
}
function centavos(valor: unknown): number | null {
  if(typeof valor!=="number"&&typeof valor!=="string")return null;
  const texto=String(valor).trim();
  if(!/^\d+(?:\.\d{1,2})?$/.test(texto))return null;
  const [reais,decimal=""]=texto.split(".");
  const n=Number(reais)*100+Number(decimal.padEnd(2,"0"));
  return Number.isSafeInteger(n)&&n>0?n:null;
}
function somar(a:number,b:number): number { const soma=a+b;if(!Number.isSafeInteger(soma))throw new Error("O total excede a precisão suportada pela análise. Revise os valores.");return soma; }
export function analisarGraficosFinanceirosERN(registros: RegistroFinanceiroERN[],periodo: PeriodoGraficoERN,hoje = hojeGraficoManaus()) {
  const meses: MesFinanceiroERN[]=[];
  if(periodoGraficoValido(periodo)){
    const inicio=new Date(`${periodo.inicio.slice(0,7)}-01T12:00:00Z`);
    for(let i=0;i<24;i++){
      const data=new Date(Date.UTC(inicio.getUTCFullYear(),inicio.getUTCMonth()+i,15));
      const chave=data.toISOString().slice(0,7);if(chave>periodo.fim.slice(0,7))break;
      meses.push({chave,nome:new Intl.DateTimeFormat("pt-BR",{month:"short",year:"2-digit",timeZone:"UTC"}).format(data),recebido:0,pago:0,receber:0,pagar:0});
    }
  }
  const pagas=new Map<string,number>(),pendentes=new Map<string,number>();
  let semLiquidacao=0,semVencimento=0,inconsistentes=0;
  for(const item of registros){
    const tipo=(item.tipo??"").trim().toLowerCase();
    const status=(item.status !== undefined ? item.status ?? "" : item.Status ?? "").trim().toLowerCase();
    const valor=centavos(item.valor !== undefined ? item.valor : item.Valor);
    const liquidado=(tipo==="receita"&&status==="recebido")||(tipo==="despesa"&&status==="pago");
    if(!["receita","despesa"].includes(tipo)||(!liquidado&&status!=="pendente")||valor===null){inconsistentes++;continue;}
    const data=liquidado?item.data_liquidacao:item.data_vencimento;
    if(!dataGraficoValida(data)){if(liquidado)semLiquidacao++;else semVencimento++;continue;}
    if(liquidado&&data>hoje){inconsistentes++;continue;}
    if(data<periodo.inicio||data>periodo.fim)continue;
    const mes=meses.find(m=>m.chave===data.slice(0,7));if(!mes)continue;
    const chave=liquidado?(tipo==="receita"?"recebido":"pago"):(tipo==="receita"?"receber":"pagar");
    mes[chave]=somar(mes[chave],valor);
    if(tipo==="despesa"){
      const mapa=liquidado?pagas:pendentes;const categoria=item.categoria?.trim()||"Sem categoria";mapa.set(categoria,somar(mapa.get(categoria)??0,valor));
    }
  }
  const totais=meses.reduce((t,m)=>({recebido:somar(t.recebido,m.recebido),pago:somar(t.pago,m.pago),receber:somar(t.receber,m.receber),pagar:somar(t.pagar,m.pagar)}),{recebido:0,pago:0,receber:0,pagar:0});
  return {meses,totais,categoriasPagas:[...pagas.entries()].sort((a,b)=>b[1]-a[1]),categoriasPendentes:[...pendentes.entries()].sort((a,b)=>b[1]-a[1]),semLiquidacao,semVencimento,inconsistentes};
}

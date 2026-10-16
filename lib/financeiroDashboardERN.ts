import type { RegistroFinanceiroERN } from '@/lib/financeiroConsultaERN';
import { dataGraficoValida } from '@/lib/financeiroGraficosERN';
export function adicionarDiasFinanceiroERN(hoje:string,dias:number) { const d=new Date(`${hoje}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+dias);return d.toISOString().slice(0,10); }
function valorCentavosERN(valor:unknown):number|null {
  if(typeof valor!=='string'&&typeof valor!=='number')return null;
  const s=String(valor).trim();if(!/^\d+(?:\.\d{1,2})?$/.test(s))return null;
  const [r,c='']=s.split('.');const n=Number(r)*100+Number(c.padEnd(2,'0'));return Number.isSafeInteger(n)&&n>0?n:null;
}
function somar(a:number,b:number){const n=a+b;if(!Number.isSafeInteger(n))throw new Error('Os totais excedem a precisão suportada. Revise os valores.');return n;}
export function analisarPendenciasDashboardERN(registros:RegistroFinanceiroERN[],hoje:string){
  if(!dataGraficoValida(hoje))throw new Error('Não foi possível determinar a data de referência.');
  const dia7=adicionarDiasFinanceiroERN(hoje,7),dia30=adicionarDiasFinanceiroERN(hoje,30);
  const faixas=['Vencidas','Hoje','1–7 dias','8–30 dias','Após 30 dias'].map(nome=>({nome,receber:0,pagar:0,qtdReceber:0,qtdPagar:0}));
  const totais={receber:0,pagar:0};const proximos={receber:0,pagar:0,qtdReceber:0,qtdPagar:0};let semData=0,semValor=0,situacaoDesconhecida=0;
  for(const r of registros){
    const tipo=(r.tipo??'').trim().toLowerCase();const status=(r.status!==undefined?r.status??'':r.Status??'').trim().toLowerCase();
    if((tipo==='receita'&&status==='recebido')||(tipo==='despesa'&&status==='pago'))continue;
    if(!['receita','despesa'].includes(tipo)||status!=='pendente'){situacaoDesconhecida++;continue;}
    const valor=valorCentavosERN(r.valor!==undefined?r.valor:r.Valor);if(valor===null){semValor++;continue;}
    const data=r.data_vencimento;if(!dataGraficoValida(data)){semData++;continue;}
    const indice=data<hoje?0:data===hoje?1:data<=dia7?2:data<=dia30?3:4;
    const chave=tipo==='receita'?'receber':'pagar',quantidade=tipo==='receita'?'qtdReceber':'qtdPagar';
    faixas[indice][chave]=somar(faixas[indice][chave],valor);faixas[indice][quantidade]++;
    totais[chave]=somar(totais[chave],valor);
    if(data>=hoje&&data<=dia7){proximos[chave]=somar(proximos[chave],valor);proximos[quantidade]++;}
  }
  return{hoje,dia7,dia30,faixas,totais,proximos,semData,semValor,situacaoDesconhecida};
}

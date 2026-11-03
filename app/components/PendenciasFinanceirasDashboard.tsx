'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { possuiRecurso, type PlanoAtual } from '@/lib/plano';
import { consultarFinanceiroERN, type RegistroFinanceiroERN } from '@/lib/financeiroConsultaERN';
import { hojeGraficoManaus } from '@/lib/financeiroGraficosERN';
import { analisarPendenciasDashboardERN } from '@/lib/financeiroDashboardERN';
import { BarrasHorizontaisEDA, CartaoGraficoEDA, TabelaNumerosEDA } from '@/app/components/GraficosEDA';
// ERN_GRAFICOS_EDA_V1: pendências financeiras no conjunto premium.
const caixa='min-w-0 rounded-2xl border border-white/10 bg-[#0A1713] p-4 sm:p-5';
const botao='inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-3 text-xs font-semibold text-[#F4C77E] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4C77E]';
const moeda=(n:number)=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const data=(s:string)=>s.split('-').reverse().join('/');
const CORES=['#fb7185','#E3A144','#34d399','#60a5fa','#a78bfa'];
type Props={plano:PlanoAtual|null;carregandoPlano:boolean};
export default function PendenciasFinanceirasDashboard({plano,carregandoPlano}:Props){
  const liberado=possuiRecurso(plano,'financeiro');const empresa=plano?.empresa_id??'';
  const [fonte,setFonte]=useState<{empresa:string;registros:RegistroFinanceiroERN[];instante:string}|null>(null);
  const [carregando,setCarregando]=useState(false),[erro,setErro]=useState(''),[tentativa,setTentativa]=useState(0);
  const [hoje,setHoje]=useState(''),[serie,setSerie]=useState<'receber'|'pagar'>('receber');
  useEffect(()=>{const atualizar=()=>setHoje(hojeGraficoManaus());atualizar();const id=window.setInterval(atualizar,60000);window.addEventListener('focus',atualizar);return()=>{window.clearInterval(id);window.removeEventListener('focus',atualizar);};},[]);
  useEffect(()=>{
    if(carregandoPlano||!liberado||!empresa)return;
    let ativo=true;setFonte(null);setCarregando(true);setErro('');
    void consultarFinanceiroERN().then(registros=>{
      if(registros.some(r=>r.empresa_id!==empresa))throw new Error('A empresa da consulta diverge do plano. Atualize sua sessão.');
      if(ativo)setFonte({empresa,registros,instante:new Date().toISOString()});
    }).catch(falha=>{if(ativo)setErro(falha&&typeof falha==='object'&&'message'in falha?String(falha.message):'Não foi possível consultar as pendências financeiras.');}).finally(()=>{if(ativo)setCarregando(false);});
    return()=>{ativo=false;};
  },[carregandoPlano,liberado,empresa,tentativa]);
  const resultado=useMemo(()=>{if(!hoje||!fonte||fonte.empresa!==empresa)return{dados:null,erro:''};try{return{dados:analisarPendenciasDashboardERN(fonte.registros,hoje),erro:''};}catch(e){return{dados:null,erro:e instanceof Error?e.message:'Não foi possível calcular as pendências.'};}},[fonte,empresa,hoje]);
  const curto=(n:number)=>{const r=n/100;return Math.abs(r)>=1000?`R$ ${(r/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})} mil`:moeda(n);};
  if(carregandoPlano)return <p role="status" className="eda-pg-estado">Conferindo acesso aos indicadores financeiros…</p>;
  if(!liberado||!empresa)return <CartaoGraficoEDA etiqueta="Financeiro" titulo="Pendências financeiras" sub="Os gráficos financeiros dependem de uma assinatura ativa com o recurso Financeiro liberado."><Link href="/planos" className="eda-pg-bt eda-pg-bt-p">Consultar plano</Link></CartaoGraficoEDA>;
  const falha=erro||resultado.erro,dados=resultado.dados;
  const atualizar=()=>{setFonte(null);setErro('');setCarregando(true);setTentativa(n=>n+1);setHoje(hojeGraficoManaus());};
  const carregandoDados=carregando||(!dados&&!falha);
  return <section aria-labelledby="titulo-pendencias-dashboard" style={{display:'grid',gap:16,minWidth:0}}>
    <div style={{display:'flex',flexWrap:'wrap',alignItems:'flex-end',justifyContent:'space-between',gap:12}}>
      <div><p className="eda-g-eb">Financeiro</p><h3 id="titulo-pendencias-dashboard" className="eda-sec-titulo" style={{margin:'4px 0 0'}}>Pendências financeiras da operação</h3><p className="eda-pg-texto-mut">Lançamentos pendentes pelo vencimento · referência de Manaus: {hoje?data(hoje):'…'}.</p></div>
      <div style={{display:'flex',flexWrap:'wrap',gap:8}}><button type="button" className="eda-pg-bt eda-pg-bt-p" disabled={carregandoDados} onClick={atualizar}>Atualizar financeiro</button><Link href="/financeiro?periodo=pendentes" className="eda-pg-bt eda-pg-bt-p">Consultar pendências →</Link></div>
    </div>
    {carregandoDados?<p role="status" className="eda-pg-estado">Consultando lançamentos financeiros…</p>:falha?<p role="alert" className="eda-pg-aviso eda-pg-aviso-er">{falha} Use Atualizar financeiro para tentar novamente.</p>:dados&&<>
      {dados.semData+dados.semValor+dados.situacaoDesconhecida>0&&<details className="eda-pg-aviso eda-pg-aviso-at"><summary style={{cursor:'pointer'}}>Existem registros fora dos gráficos que precisam de revisão</summary><p style={{margin:'8px 0 0'}}>Pendentes sem valor válido: {dados.semValor}. Pendentes sem vencimento válido: {dados.semData}. Tipo ou situação não reconhecidos: {dados.situacaoDesconhecida}.</p></details>}
      <section className="eda-pg-kpis" aria-label="Resumo das pendências" style={{marginTop:0}}>{[
        {nome:'A receber vencido',valor:dados.faixas[0].receber,qtd:dados.faixas[0].qtdReceber,detalhe:'vencimento anterior a hoje',alerta:dados.faixas[0].qtdReceber>0},
        {nome:'A pagar vencido',valor:dados.faixas[0].pagar,qtd:dados.faixas[0].qtdPagar,detalhe:'vencimento anterior a hoje',alerta:dados.faixas[0].qtdPagar>0},
        {nome:'A receber · 7 dias',valor:dados.proximos.receber,qtd:dados.proximos.qtdReceber,detalhe:`${data(dados.hoje)} a ${data(dados.dia7)}`,alerta:false},
        {nome:'A pagar · 7 dias',valor:dados.proximos.pagar,qtd:dados.proximos.qtdPagar,detalhe:`${data(dados.hoje)} a ${data(dados.dia7)}`,alerta:false},
      ].map(c=><div key={c.nome} className={`eda-pg-kpi ${c.alerta?'eda-pg-kpi-er':''}`}><small>{c.nome}</small><b>{moeda(c.valor)}</b><span>{c.qtd} lançamento(s) · {c.detalhe}</span></div>)}</section>
      <div className="eda-g-grade-cartoes">
        <CartaoGraficoEDA etiqueta="Vencimentos" titulo="A receber e a pagar por vencimento" sub="Agrupado pela data de vencimento dos lançamentos pendentes.">
          {dados.totais.receber+dados.totais.pagar===0?<p className="eda-pg-texto-mut">Nenhum vencimento com valor válido para comparar.</p>:<>
            <BarrasHorizontaisEDA
              linhas={dados.faixas.map((f,i)=>({rotulo:f.nome,valores:[f.receber,f.pagar],alerta:i===0&&(f.receber+f.pagar)>0}))}
              series={[{nome:'A receber',c:'s2'},{nome:'A pagar',c:'s3'}]}
              formatar={curto}
              rotulo="A receber e a pagar por faixa de vencimento"
              largRotulo={100}
            />
            <TabelaNumerosEDA cabecalho={['Vencimento','A receber','Qtd.','A pagar','Qtd.']} linhas={dados.faixas.map(f=>[f.nome,moeda(f.receber),f.qtdReceber,moeda(f.pagar),f.qtdPagar])}/>
          </>}
        </CartaoGraficoEDA>
        <CartaoGraficoEDA etiqueta="Próximos 7 dias" titulo="Agenda financeira da semana" sub="Compromissos a receber e a pagar, incluindo hoje. Não representa saldo em conta." acoes={<Link href="/financeiro" className="eda-pg-bt eda-pg-bt-p">Abrir financeiro</Link>}>
          <BarrasHorizontaisEDA
            linhas={[{rotulo:'A receber',valores:[dados.proximos.receber]},{rotulo:'A pagar',valores:[0,dados.proximos.pagar]}]}
            series={[{nome:'A receber',c:'s2'},{nome:'A pagar',c:'s3'}]}
            formatar={curto}
            rotulo="A receber e a pagar nos próximos 7 dias"
            largRotulo={84}
          />
          <p className="eda-pg-texto-mut" style={{marginTop:8}}>{dados.proximos.receber===0&&dados.proximos.pagar===0
            ?'Nenhum compromisso pendente com vencimento válido nos próximos 7 dias.'
            :dados.proximos.pagar>dados.proximos.receber
              ?'Os compromissos a pagar superam o previsto a receber nesta semana. Confira vencimentos e caixa antes de assumir novas despesas.'
              :'O previsto a receber cobre os compromissos a pagar nesta semana, mas recebimento futuro não é saldo disponível.'}</p>
        </CartaoGraficoEDA>
      </div>
      <p className="eda-pg-nota">{fonte&&`Consulta: ${new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Manaus',dateStyle:'short',timeStyle:'short'}).format(new Date(fonte.instante))} · Manaus. `}Valores pendentes não são dinheiro recebido ou pago, saldo bancário nem lucro.</p>
    </>}
  </section>;
}

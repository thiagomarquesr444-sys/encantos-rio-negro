'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { possuiRecurso, type PlanoAtual } from '@/lib/plano';
import { consultarFinanceiroERN, type RegistroFinanceiroERN } from '@/lib/financeiroConsultaERN';
import { hojeGraficoManaus } from '@/lib/financeiroGraficosERN';
import { analisarPendenciasDashboardERN } from '@/lib/financeiroDashboardERN';
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
  if(carregandoPlano)return <div className={caixa+' mt-4'} role="status">Conferindo acesso aos indicadores financeiros…</div>;
  if(!liberado||!empresa)return <div className={caixa+' mt-4'}><h3 className="text-base font-semibold">Pendências financeiras</h3><p className="mt-2 text-xs leading-6 text-[#B4C8BB]">Os gráficos financeiros dependem de uma assinatura ativa com o recurso Financeiro liberado.</p><Link href="/planos" className={botao+' mt-3'}>Consultar plano</Link></div>;
  const falha=erro||resultado.erro,dados=resultado.dados;
  const atualizar=()=>{setFonte(null);setErro('');setCarregando(true);setTentativa(n=>n+1);setHoje(hojeGraficoManaus());};
  const carregandoDados=carregando||(!dados&&!falha);
  const maximo=Math.max(0,...(dados?.faixas.flatMap(f=>[f.receber,f.pagar])??[])),escala=Math.max(1,maximo);
  const raio=68,circunferencia=2*Math.PI*raio;let deslocamento=0;
  return <section aria-labelledby="titulo-pendencias-dashboard" className="ern-premium-financeiro mt-7 space-y-4">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><h3 id="titulo-pendencias-dashboard" className="text-xl text-[#F0F0E8]">Pendências financeiras da operação</h3><p className="mt-2 text-xs leading-6 text-[#B4C8BB]">Lançamentos pendentes pelo vencimento · referência de Manaus: {hoje?data(hoje):'…'}. Registros acessíveis à sua conta.</p></div><div className="flex flex-wrap gap-2"><button type="button" className={botao} disabled={carregandoDados} onClick={atualizar}>Atualizar financeiro</button><Link href="/financeiro?periodo=pendentes" className={botao}>Consultar pendências →</Link></div></header>
    {carregandoDados?<p role="status" className={caixa}>Consultando lançamentos financeiros…</p>:falha?<p role="alert" className={caixa+' text-sm text-red-300'}>{falha} Use Atualizar financeiro para tentar novamente.</p>:dados&&<>
      {dados.semData+dados.semValor+dados.situacaoDesconhecida>0&&<details className={caixa+' text-xs text-amber-200'}><summary className="min-h-11 cursor-pointer py-2">Existem registros fora dos gráficos que precisam de revisão</summary><p className="leading-6">Pendentes sem valor válido: {dados.semValor}. Pendentes sem vencimento válido: {dados.semData}. Tipo ou situação não reconhecidos: {dados.situacaoDesconhecida}. Esses registros não são somados; os avisos abrangem todo o histórico acessível.</p></details>}
      <div className="ern-premium-financeiro-kpis grid grid-cols-2 gap-3 xl:grid-cols-12">{[
        {nome:'A receber vencido',valor:dados.faixas[0].receber,qtd:dados.faixas[0].qtdReceber,detalhe:'Vencimento anterior a hoje'},
        {nome:'A pagar vencido',valor:dados.faixas[0].pagar,qtd:dados.faixas[0].qtdPagar,detalhe:'Vencimento anterior a hoje'},
        {nome:'A receber · hoje + 7 dias',valor:dados.proximos.receber,qtd:dados.proximos.qtdReceber,detalhe:`${data(dados.hoje)} a ${data(dados.dia7)}`},
        {nome:'A pagar · hoje + 7 dias',valor:dados.proximos.pagar,qtd:dados.proximos.qtdPagar,detalhe:`${data(dados.hoje)} a ${data(dados.dia7)}`},
      ].map(c=><div key={c.nome} className={caixa}><p className="text-[11px] text-[#B4C8BB]">{c.nome}</p><p className="mt-3 break-words text-lg font-semibold tabular-nums text-[#F4C77E]">{moeda(c.valor)}</p><p className="mt-2 text-[10px] leading-5 text-[#B4C8BB]">{c.qtd} lançamento(s) · {c.detalhe}</p></div>)}</div>
      {/* ERN_FINANCEIRO_REDESIGN_V445: leitura de compromissos, nao saldo. */}
      <div className="rounded-2xl border border-[#E3A144]/20 bg-[#0D1213] p-4 sm:p-5" aria-label="Leitura executiva dos proximos sete dias">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h4 className="text-base font-semibold text-[#F1F4EF]">Agenda financeira dos proximos 7 dias</h4>
          <p className="mt-1 text-xs leading-5 text-[#B4C8BB]">Compromissos a receber e a pagar, incluindo hoje. Nao representa saldo em conta.</p></div>
          <Link href="/financeiro" className={botao}>Abrir financeiro</Link>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {([
            { titulo: 'A receber', valor: dados.proximos.receber, cor: '#34d399' },
            { titulo: 'A pagar', valor: dados.proximos.pagar, cor: '#E3A144' },
          ]).map(faixa => {
            const maior = Math.max(1, dados.proximos.receber, dados.proximos.pagar);
            return <div key={faixa.titulo} className="min-w-0 rounded-xl bg-white/[0.025] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="text-[#B4C8BB]">{faixa.titulo}</span><strong className="text-[#F1F4EF]">{moeda(faixa.valor)}</strong></div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${faixa.titulo}: ${moeda(faixa.valor)}`}>
                <div className="h-full rounded-full" style={{width:`${faixa.valor / maior * 100}%`,backgroundColor:faixa.cor}} />
              </div>
            </div>;
          })}
        </div>
        <p className="mt-4 text-xs leading-5 text-[#B4C8BB]">{dados.proximos.receber === 0 && dados.proximos.pagar === 0
          ? 'Nenhum compromisso pendente com vencimento valido nos proximos 7 dias.'
          : dados.proximos.pagar > dados.proximos.receber
            ? 'Os compromissos a pagar superam os valores previstos a receber neste horizonte. Confira vencimentos e disponibilidade de caixa antes de assumir novas despesas.'
            : 'Os valores previstos a receber cobrem numericamente os compromissos a pagar neste horizonte, mas recebimento futuro nao e saldo disponivel.'}</p>
      </div>
      <div className="ern-premium-financeiro-analise grid min-w-0 gap-4 xl:grid-cols-12"><article className={caixa}><div className="flex flex-wrap items-center justify-between gap-3"><h4 className="text-base font-semibold">Composição das pendências</h4><div className="flex gap-2">{(['receber','pagar'] as const).map(s=><button key={s} type="button" aria-pressed={serie===s} onClick={()=>setSerie(s)} className={botao+(serie===s?' border-[#E3A144]/60 bg-[#E3A144]/10':'')}>{s==='receber'?'A receber':'A pagar'}</button>)}</div></div>
      <div className="mt-4 grid items-center gap-3 min-[480px]:grid-cols-[190px_1fr]"><svg viewBox="0 0 200 200" role="img" aria-label={`Pendências ${serie==='receber'?'a receber':'a pagar'} com vencimento válido: ${moeda(dados.totais[serie])}`} className="mx-auto h-[190px] w-[190px] max-w-full"><circle cx="100" cy="100" r={raio} stroke="#ffffff0d" strokeWidth="25" fill="none"/>{dados.totais[serie]>0&&dados.faixas.map((f,i)=>{const trecho=f[serie]/dados.totais[serie]*circunferencia,offset=-deslocamento;deslocamento+=trecho;return <circle key={f.nome} cx="100" cy="100" r={raio} fill="none" stroke={CORES[i]} strokeWidth="25" strokeDasharray={`${trecho} ${circunferencia-trecho}`} strokeDashoffset={offset} transform="rotate(-90 100 100)"><title>{f.nome}: {moeda(f[serie])}</title></circle>;})}<text x="100" y="93" textAnchor="middle" fill="#B4C8BB" fontSize="10">Total pendente</text><text x="100" y="116" textAnchor="middle" fill="#F4C77E" fontSize="14" fontWeight="700">{moeda(dados.totais[serie])}</text></svg><ul className="space-y-3 text-xs">{dados.faixas.map((f,i)=><li key={f.nome} className="flex flex-wrap justify-between gap-2"><span className="text-[#B4C8BB]"><span aria-hidden="true" className="mr-2 inline-block h-2 w-2 rounded-full" style={{background:CORES[i]}}/>{f.nome}</span><strong className="tabular-nums">{moeda(f[serie])}</strong></li>)}</ul></div>{dados.totais[serie]===0&&<p className="mt-3 text-xs text-[#B4C8BB]">Nenhuma pendência com valor e vencimento válidos nesta série.</p>}</article>
      <article className={caixa}><h4 className="text-base font-semibold">A receber × a pagar por vencimento</h4><div className="mt-3 flex flex-wrap gap-4 text-xs text-[#B4C8BB]"><span><span aria-hidden="true" className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400"/>A receber</span><span><span aria-hidden="true" className="mr-2 inline-block h-2 w-2 rounded-full bg-[#E3A144]"/>A pagar</span><span>Escala: {moeda(maximo)}</span></div>{maximo === 0 ? <div className="mt-5 flex min-h-40 items-center justify-center rounded-xl border border-dashed border-white/15 bg-[#0D1213] p-5 text-center text-sm text-[#B4C8BB]">Nenhum vencimento com valor valido para comparar.</div> : <div className="mt-5 grid grid-cols-5 gap-2" role="img" aria-label="Comparação das pendências por vencimento. Valores exatos na tabela abaixo.">{dados.faixas.map(f=><div key={f.nome} className="min-w-0"><div className="flex h-[180px] items-end justify-center gap-1 rounded-lg border-b border-white/20 bg-white/[0.025] px-1">{(['receber','pagar'] as const).map(s=><div key={s} title={`${f.nome} · ${s==='receber'?'A receber':'A pagar'}: ${moeda(f[s])}`} className="w-full max-w-6 rounded-t-md" style={{height:`${f[s]/escala*100}%`,background:s==='receber'?'#34d399':'#E3A144'}}/>)}</div><span className="mt-2 block text-center text-[9px] leading-4 text-[#B4C8BB] sm:text-[10px]">{f.nome}</span></div>)}</div>}<p className="mt-4 text-xs leading-5 text-[#B4C8BB]">Vencidas: antes de hoje. As demais faixas são contadas a partir de hoje, sem sobreposição. Após 30 dias inclui todos os vencimentos posteriores.</p></article></div>
      <details className={caixa+' text-xs'}><summary className="min-h-11 cursor-pointer py-2 text-[#F4C77E]">Conferir valores e quantidades dos gráficos</summary><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr>{['Vencimento','A receber','Qtd.','A pagar','Qtd.'].map((s,i)=><th key={i} className="p-2">{s}</th>)}</tr></thead><tbody>{dados.faixas.map(f=><tr key={f.nome} className="border-t border-white/10"><td className="p-2">{f.nome}</td><td className="whitespace-nowrap p-2">{moeda(f.receber)}</td><td className="p-2">{f.qtdReceber}</td><td className="whitespace-nowrap p-2">{moeda(f.pagar)}</td><td className="p-2">{f.qtdPagar}</td></tr>)}</tbody></table></div></details>
      <p className="text-[11px] leading-6 text-[#B4C8BB]">{fonte&&`Consulta: ${new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Manaus',dateStyle:'short',timeStyle:'short'}).format(new Date(fonte.instante))} · Manaus. `}Valores pendentes não são dinheiro recebido ou pago, saldo bancário nem lucro. Os gráficos usam todo o histórico acessível e não dependem das datas das reservas acima. Use Atualizar financeiro após alterar lançamentos.</p>
    </>}
  </section>;
}

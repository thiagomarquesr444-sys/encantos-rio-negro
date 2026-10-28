import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { supabase } from '@/lib/supabase';
import { carregarItensDemanda, CATEGORIAS_ITEM, SITUACOES_ITEM } from '@/lib/itensDemanda';
import { subtotal, moeda } from '@/lib/calculosMateriaisDemanda';

const dataBR = (data: string | null | undefined) =>
  data && /^\d{4}-\d{2}-\d{2}$/.test(data)
    ? data.split('-').reverse().join('/')
    : 'Não informado';

const VERDE: [number,number,number] = [18,58,47];
const DOURADO: [number,number,number] = [178,128,53];
const ESCURO: [number,number,number] = [30,38,35];
const CINZA: [number,number,number] = [95,105,100];

function salvarNomeSeguro(id:string,versao:number):string {
  return `ERN-checklist-compras-${id.replace(/[^a-zA-Z0-9-]/g,'').slice(0,8)}-v${versao}.pdf`;
}

/** V41D: PDF para uso no comercio, sempre a partir da lista salva e da versao conferida. */
export async function exportarChecklistDemandaERN(
  demandaId: string,
  versaoEsperada: number,
): Promise<void> {
  if (!demandaId || !Number.isInteger(versaoEsperada) || versaoEsperada < 0) {
    throw new Error('Atualize a lista antes de gerar o checklist.');
  }
  const { data: autenticacao, error: erroAuth } = await supabase.auth.getUser();
  if (erroAuth || !autenticacao.user) {
    throw new Error('Sua sessão expirou. Entre novamente para gerar o PDF.');
  }
  const [lista, demandaResposta] = await Promise.all([
    carregarItensDemanda(demandaId),
    supabase.from('demandas')
      .select('id,titulo,localidade,data_inicio,data_fim,status')
      .eq('id', demandaId).single(),
  ]);
  if (lista.versao !== versaoEsperada) {
    throw new Error('A lista foi alterada por outro acesso. Recarregue antes de gerar o PDF.');
  }
  if (demandaResposta.error || !demandaResposta.data) {
    throw new Error('Não foi possível obter a identificação da demanda. Confira seu acesso.');
  }
  if (!lista.itens.length) {
    throw new Error('Cadastre e salve pelo menos um material antes de gerar o checklist.');
  }
  const demanda = demandaResposta.data;
  const prioridade = { pendente: 0, em_separacao: 1, atendido: 2 } as const;
  const itens = lista.itens.map((item,indice)=>({item,indice}))
    .sort((a,b)=>prioridade[a.item.situacao]-prioridade[b.item.situacao] ||
      a.item.categoria.localeCompare(b.item.categoria) || a.indice-b.indice);
  const atendidos = lista.itens.filter(i=>i.situacao==='atendido').length;
  const semPreco = lista.itens.filter(i=>subtotal(i)===null).length;
  let total = BigInt(0);
  for (const item of lista.itens) {
    const valor=subtotal(item);
    if (valor!==null) total+=valor;
  }
  const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
  const largura=pdf.internal.pageSize.getWidth();
  const altura=pdf.internal.pageSize.getHeight();
  const margem=13;
  const direita=largura-margem;
  let y=19;

  pdf.setFillColor(...VERDE);
  pdf.rect(0,0,largura,5,'F');
  pdf.setFont('helvetica','bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...VERDE);
  pdf.text('ENCANTOS RIO NEGRO',margem,y);
  pdf.setFontSize(7);
  pdf.setFont('helvetica','normal');
  pdf.setTextColor(...CINZA);
  pdf.text('GESTÃO OPERACIONAL  /  CHECKLIST PARA COMPRAS',direita,y,{align:'right'});
  y+=8;
  pdf.setDrawColor(220,225,221);
  pdf.line(margem,y,direita,y);
  y+=9;
  pdf.setFont('helvetica','bold');
  pdf.setFontSize(17);
  pdf.setTextColor(...ESCURO);
  pdf.text('Checklist de Compras da Viagem',margem,y);
  y+=7;
  pdf.setFont('helvetica','normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...CINZA);
  pdf.text('Marque cada item somente após conferir a compra ou a separação.',margem,y);
  y+=10;

  // Identificacao compacta, mantendo mais area util para itens.
  const resumo: Array<[string,string]> = [
    ['DEMANDA',String(demanda.titulo ?? 'Não informado')],
    ['LOCALIDADE',String(demanda.localidade ?? 'Não informado')],
    ['PERÍODO',`${dataBR(demanda.data_inicio)} a ${dataBR(demanda.data_fim)}`],
    ['VERSÃO SALVA',String(lista.versao)],
  ];
  const coluna=(largura-margem*2-8)/2;
  for(let i=0;i<resumo.length;i+=2){
    const pares=resumo.slice(i,i+2);
    const alturaLinha=Math.max(...pares.map(([,v])=>
      (pdf.splitTextToSize(v,coluna-2) as string[]).length*4.2+7));
    for(let j=0;j<pares.length;j++){
      const [rotulo,valor]=pares[j];
      const x=margem+j*(coluna+8);
      pdf.setFont('helvetica','bold');
      pdf.setFontSize(7);
      pdf.setTextColor(...CINZA);
      pdf.text(rotulo,x,y);
      pdf.setFont('helvetica','normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...ESCURO);
      pdf.text(pdf.splitTextToSize(valor,coluna-2) as string[],x,y+5);
    }
    y+=alturaLinha+3;
  }

  pdf.setFillColor(245,247,245);
  pdf.roundedRect(margem,y,direita-margem,18,2.5,2.5,'F');
  const resumoNumerico=[
    `${lista.itens.length} materiais`,
    `${lista.itens.length-atendidos} não atendidos`,
    `${semPreco} sem preço`,
    lista.itens.length>semPreco?moeda(total):'Estimativa indisponível',
  ];
  resumoNumerico.forEach((valor,i)=>{
    const larguraItem=(direita-margem)/4;
    const x=margem+larguraItem*i+larguraItem/2;
    pdf.setFont('helvetica','bold');
    pdf.setFontSize(i===3?8:10);
    pdf.setTextColor(...VERDE);
    pdf.text(pdf.splitTextToSize(valor,larguraItem-5) as string[],x,y+8,{align:'center'});
    pdf.setFont('helvetica','normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(...CINZA);
    pdf.text(['NA LISTA','A CONFERIR','SEM VALOR','TOTAL ESTIMADO'][i],x,y+14,{align:'center'});
  });
  y+=25;
  pdf.setFont('helvetica','bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...ESCURO);
  pdf.text('MATERIAIS — PENDENTES E EM SEPARAÇÃO PRIMEIRO',margem,y);
  y+=4;

  const linhas=itens.map(({item},i)=>{
    const valor=subtotal(item);
    const obs=item.observacoes.trim();
    return [
      '',
      `${i+1}. ${item.descricao}${obs?'\nOBS.: '+obs:''}`,
      CATEGORIAS_ITEM[item.categoria],
      `${item.quantidade} ${item.unidade}`,
      SITUACOES_ITEM[item.situacao],
      valor===null?'Não informado':moeda(valor),
    ];
  });

  autoTable(pdf,{
    startY:y,
    margin:{left:margem,right:margem,top:20,bottom:30},
    head:[['OK','PRODUTO / OBSERVAÇÕES','CATEGORIA','QUANTIDADE','SITUAÇÃO','ESTIMATIVA']],
    body:linhas,
    theme:'grid',
    showHead:'everyPage',
    rowPageBreak:'avoid',
    styles:{font:'helvetica',fontSize:8.4,textColor:ESCURO,cellPadding:{top:3.8,right:2,bottom:3.8,left:2},overflow:'linebreak',valign:'middle',lineColor:[215,222,218],lineWidth:0.12,minCellHeight:13},
    headStyles:{fillColor:VERDE,textColor:[255,255,255],fontStyle:'bold',fontSize:7.3,cellPadding:2.5},
    alternateRowStyles:{fillColor:[246,248,246]},
    columnStyles:{
      0:{cellWidth:13,halign:'center'},
      1:{cellWidth:61},
      2:{cellWidth:27},
      3:{cellWidth:27},
      4:{cellWidth:29},
      5:{cellWidth:27,halign:'right'},
    },
    didDrawCell:(context)=>{
      if(context.section!=='body'||context.column.index!==0)return;
      const x=context.cell.x+(context.cell.width-6)/2;
      const cy=context.cell.y+(context.cell.height-6)/2;
      pdf.setDrawColor(...VERDE);
      pdf.setLineWidth(0.35);
      pdf.rect(x,cy,6,6);
    },
  });

  const resultado=pdf as jsPDF & {lastAutoTable?:{finalY:number}};
  let pos=resultado.lastAutoTable?.finalY ?? y;
  if(pos>altura-100){pdf.addPage();pos=23;}
  pos+=12;
  pdf.setFont('helvetica','bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...DOURADO);
  pdf.text('FECHAMENTO DA COMPRA',margem,pos);
  pos+=10;
  pdf.setFont('helvetica','normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...ESCURO);
  const campos=[
    'Responsável: ______________________________________    Data: ____/____/________',
    'Comércio / fornecedor: _____________________________________________________',
    'Assinatura / conferência: __________________________________________________',
    'Itens não encontrados, substituições ou pendências:',
  ];
  for(const linha of campos){pdf.text(linha,margem,pos);pos+=8;}
  for(let i=0;i<3;i++){
    pdf.setDrawColor(185,194,189);
    pdf.line(margem,pos,direita,pos);
    pos+=8;
  }
  pdf.setFontSize(7.5);
  pdf.setTextColor(...CINZA);
  const avisos=[
    'A situação apresentada é a do cadastro salvo. Marcar este papel não altera o sistema.',
    semPreco>0?`${semPreco} material(is) sem preço válido. O valor exibido é parcial.`:'Valores são estimativas cadastradas, não comprovantes de pagamento.',
  ];
  for(const aviso of avisos){
    const textos=pdf.splitTextToSize(aviso,direita-margem) as string[];
    if(pos+textos.length*4>altura-26){pdf.addPage();pos=23;}
    pdf.text(textos,margem,pos);pos+=textos.length*4+2;
  }

  const paginas=pdf.getNumberOfPages();
  const dataGeracao=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Manaus',dateStyle:'short',timeStyle:'short'}).format(new Date());
  for(let n=1;n<=paginas;n++){
    pdf.setPage(n);
    pdf.setDrawColor(215,220,216);
    pdf.line(margem,altura-21,direita,altura-21);
    pdf.setFont('helvetica','normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...CINZA);
    pdf.text(`Encantos Rio Negro  |  Lista salva v${lista.versao}  |  ${dataGeracao}`,margem,altura-15);
    pdf.text(`Página ${n} de ${paginas}`,direita,altura-15,{align:'right'});
  }
  pdf.save(salvarNomeSeguro(demandaId,lista.versao));
}

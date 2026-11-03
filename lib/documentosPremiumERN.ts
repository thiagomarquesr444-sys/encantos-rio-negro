import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { CORES_PDF, cabecalhoPDF, rodapesPDF, seloPDF, tomDaSituacaoPDF } from "@/lib/pdfMarcaEDA";

// ERN_PDF_MARCA_EDA_V1: documentos com a identidade Encantos Gestão (lib/pdfMarcaEDA).

export type LinhaDocumentoERN = {
  campo: string;
  valor: string | number | null | undefined;
};

export type TabelaDocumentoERN = {
  titulo?: string;
  colunas: string[];
  linhas: Array<Array<string | number | null | undefined>>;
};

export type DocumentoPremiumERN = {
  titulo: string;
  subtitulo?: string;
  identificador?: string;
  status?: string;
  empresa?: string;
  dados?: LinhaDocumentoERN[];
  tabela?: TabelaDocumentoERN;
  observacoes?: string[];
  nomeArquivo: string;
  dataGeracao?: Date;
  /** Tipo exibido no canto do cabeçalho (ex.: Voucher, Relatório financeiro). */
  tipo?: string;
};

type CorERN = [number, number, number];
const VERDE: CorERN = CORES_PDF.noite;
const PRETO: CorERN = CORES_PDF.texto;
const CINZA: CorERN = CORES_PDF.secundario;
const DOURADO: CorERN = CORES_PDF.ouro;
const MARGEM = 18;
const TOPO = 16;
const LIMITE_RODAPE = 271;

function texto(valor: unknown): string {
  return valor === null || valor === undefined
    ? "Não informado"
    : String(valor).trim() || "Não informado";
}

function dataManaus(valor: Date): string {
  if (!Number.isFinite(valor.getTime())) {
    throw new Error("Data de geração inválida.");
  }
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Manaus",
    dateStyle: "short",
    timeStyle: "short",
  }).format(valor);
}

function nomeSeguro(nome: string): string {
  const limpo = nome
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+/, "")
    .slice(0, 100);
  if (!limpo) throw new Error("Nome de documento inválido.");
  return limpo.toLowerCase().endsWith(".pdf") ? limpo : `${limpo}.pdf`;
}

export function criarDocumentoPremiumERN(dados: DocumentoPremiumERN): jsPDF {
  if (!dados.titulo.trim()) throw new Error("O documento precisa de um título.");

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const largura = pdf.internal.pageSize.getWidth();
  const altura = pdf.internal.pageSize.getHeight();
  const area = largura - 2 * MARGEM;
  const limite = Math.min(LIMITE_RODAPE, altura - 26);
  let y = TOPO;

  function novaPagina(): void {
    pdf.addPage();
    y = TOPO;
  }

  function garantir(necessario: number): void {
    if (y + necessario > limite) novaPagina();
  }

  function quebrar(conteudo: string, larguraTexto: number, tamanho: number, negrito = false): string[] {
    pdf.setFont("helvetica", negrito ? "bold" : "normal");
    pdf.setFontSize(tamanho);
    return pdf.splitTextToSize(conteudo, larguraTexto) as string[];
  }

  function escreverLinhas(linhas: string[], x: number, passo: number, tamanho: number, cor: CorERN, negrito = false): void {
    pdf.setFont("helvetica", negrito ? "bold" : "normal");
    pdf.setFontSize(tamanho);
    pdf.setTextColor(...cor);
    for (const linha of linhas) {
      pdf.text(linha, x, y);
      y += passo;
    }
  }

  const geradoEm = dataManaus(dados.dataGeracao ?? new Date());

  // Cabeçalho com a marca Encantos Gestão (faixa escura + linha dourada).
  y = cabecalhoPDF(pdf, { tipo: dados.tipo ?? "Documento", detalhe: geradoEm, margem: MARGEM });

  const titulos = quebrar(dados.titulo, area, 18, true);
  garantir(titulos.length * 8 + 5);
  escreverLinhas(titulos, MARGEM, 8, 18, PRETO, true);

  if (dados.subtitulo) {
    const linhas = quebrar(dados.subtitulo, area, 9);
    garantir(linhas.length * 5 + 2);
    escreverLinhas(linhas, MARGEM, 5, 9, CINZA);
  }
  y += 4;

  if (dados.status) {
    garantir(10);
    y += 2;
    seloPDF(pdf, texto(dados.status).slice(0, 60), MARGEM, y, tomDaSituacaoPDF(texto(dados.status)));
    y += 8;
  }

  const identificacao: LinhaDocumentoERN[] = [
    ...(dados.empresa ? [{ campo: "Empresa", valor: dados.empresa }] : []),
    ...(dados.identificador ? [{ campo: "Identificação", valor: dados.identificador }] : []),
    { campo: "Gerado em", valor: geradoEm },
    ...(dados.dados ?? []),
  ];

  const gap = 9;
  const larguraColuna = (area - gap) / 2;
  for (let i = 0; i < identificacao.length; i += 2) {
    const celulas = identificacao.slice(i, i + 2).map(item => {
      const rotulo = quebrar(item.campo.toUpperCase(), larguraColuna - 9, 7.5, true);
      const valor = quebrar(texto(item.valor), larguraColuna - 9, 9);
      return { rotulo, valor };
    });
    const alturaLinha = Math.max(...celulas.map(c => c.rotulo.length * 3.7 + c.valor.length * 4.5 + 2));
    garantir(alturaLinha + 9);
    y += 4;
    const inicioLinha = y;
    celulas.forEach((celula, indice) => {
      const x = MARGEM + indice * (larguraColuna + gap) + 4;
      pdf.setFillColor(...CORES_PDF.creme);
      pdf.roundedRect(x - 4, inicioLinha - 5, larguraColuna, alturaLinha + 4.5, 2.5, 2.5, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor(...CINZA);
      let pos = inicioLinha;
      for (const linha of celula.rotulo) {
        pdf.text(linha, x, pos);
        pos += 3.7;
      }
      pos += 1.5;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(...PRETO);
      for (const linha of celula.valor) {
        pdf.text(linha, x, pos);
        pos += 4.5;
      }
    });
    y = inicioLinha + alturaLinha + 3;
  }
  y += 3;

  if (dados.tabela) {
    const tabela = dados.tabela;
    garantir(tabela.titulo ? 20 : 13);
    if (tabela.titulo) {
      const titulosTabela = quebrar(tabela.titulo, area, 11, true);
      garantir(titulosTabela.length * 6 + 10);
      escreverLinhas(titulosTabela, MARGEM, 6, 11, PRETO, true);
      y += 2;
    }
    if (!tabela.colunas.length) {
      throw new Error("A tabela do documento precisa de colunas.");
    }
    if (tabela.linhas.some(linha => linha.length !== tabela.colunas.length)) {
      throw new Error("A tabela contém linhas com quantidade incorreta de colunas.");
    }
    autoTable(pdf, {
      startY: y,
      margin: { left: MARGEM, right: MARGEM, top: TOPO, bottom: altura - limite + 3 },
      head: [tabela.colunas],
      body: tabela.linhas.map(linha => linha.map(texto)),
      theme: "plain",
      styles: {
        font: "helvetica",
        fontSize: 8.2,
        cellPadding: { top: 2.6, bottom: 2.6, left: 2.6, right: 2.6 },
        overflow: "linebreak",
        textColor: PRETO,
        lineColor: CORES_PDF.borda,
        lineWidth: { bottom: 0.2, top: 0, left: 0, right: 0 },
      },
      headStyles: { fillColor: VERDE, textColor: CORES_PDF.ouroClaro, fontStyle: "bold", fontSize: 7.4, lineWidth: 0 },
      alternateRowStyles: { fillColor: CORES_PDF.creme },
    });
    const resultado = pdf as jsPDF & { lastAutoTable?: { finalY: number } };
    const ultima = pdf.getNumberOfPages();
    pdf.setPage(ultima);
    const finalY = resultado.lastAutoTable?.finalY;
    if (typeof finalY !== "number" || !Number.isFinite(finalY) || finalY < 0 || finalY > altura) {
      throw new Error("Não foi possível determinar o término da tabela PDF.");
    }
    y = finalY + 7;
  }

  if (dados.observacoes?.length) {
    const larguraNota = (area - gap) / 2;
    const notas = dados.observacoes.map(nota => quebrar(nota, larguraNota - 2, 8));
    const grupos: string[][][] = [];
    for (let i = 0; i < notas.length; i += 2) grupos.push(notas.slice(i, i + 2));
    const alturaGrupo = (grupo: string[][]) => Math.max(...grupo.map(linhas => linhas.length * 4.2 + 3));
    // Aproveita o espaço restante da página atual sempre que
    // houver espaço para o título e o primeiro grupo de notas.
    // Os grupos seguintes continuam protegidos individualmente.
    if (y + 11 + alturaGrupo(grupos[0]) > limite) novaPagina();

    function tituloNotas(): void {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(...DOURADO);
      pdf.text("OBSERVAÇÕES", MARGEM, y);
      y += 10;
    }
    tituloNotas();
    for (const grupo of grupos) {
      const h = alturaGrupo(grupo);
      if (y + h > limite) {
        novaPagina();
        tituloNotas();
      }
      const inicio = y;
      grupo.forEach((linhas, indice) => {
        const x = MARGEM + indice * (larguraNota + gap);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(...CINZA);
        linhas.forEach((linha, j) => pdf.text(linha, x, inicio + j * 4.2));
      });
      y = inicio + h;
    }
  }

  rodapesPDF(pdf, { margem: MARGEM, complemento: `Gerado em ${geradoEm} (horário de Manaus)` });
  return pdf;
}

export function baixarDocumentoPremiumERN(dados: DocumentoPremiumERN): void {
  criarDocumentoPremiumERN(dados).save(nomeSeguro(dados.nomeArquivo));
}

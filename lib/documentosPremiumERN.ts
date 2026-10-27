import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

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
};

type CorERN = [number, number, number];
const VERDE: CorERN = [18, 58, 47];
const PRETO: CorERN = [30, 38, 35];
const CINZA: CorERN = [106, 116, 111];
const DOURADO: CorERN = [178, 128, 53];
const MARGEM = 18;
const TOPO = 20;
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

  // Cabeçalho compacto, com altura contabilizada antes de desenhar.
  pdf.setFillColor(...VERDE);
  pdf.rect(0, 0, largura, 5, "F");
  escreverLinhas(["ENCANTOS RIO NEGRO"], MARGEM, 6, 13, VERDE, true);
  escreverLinhas(["Plataforma de turismo e gestão"], MARGEM, 6, 8, CINZA);
  pdf.setDrawColor(224, 228, 225);
  pdf.line(MARGEM, y, largura - MARGEM, y);
  y += 9;

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
    const linhas = quebrar(`SITUAÇÃO: ${texto(dados.status)}`, area, 9, true);
    garantir(linhas.length * 5 + 4);
    escreverLinhas(linhas, MARGEM, 5, 9, VERDE, true);
    y += 4;
  }

  const identificacao: LinhaDocumentoERN[] = [
    ...(dados.empresa ? [{ campo: "Empresa", valor: dados.empresa }] : []),
    ...(dados.identificador ? [{ campo: "Identificação", valor: dados.identificador }] : []),
    { campo: "Gerado em", valor: dataManaus(dados.dataGeracao ?? new Date()) },
    ...(dados.dados ?? []),
  ];

  const gap = 9;
  const larguraColuna = (area - gap) / 2;
  for (let i = 0; i < identificacao.length; i += 2) {
    const celulas = identificacao.slice(i, i + 2).map(item => {
      const rotulo = quebrar(item.campo.toUpperCase(), larguraColuna - 2, 7.5, true);
      const valor = quebrar(texto(item.valor), larguraColuna - 2, 9);
      return { rotulo, valor };
    });
    const alturaLinha = Math.max(...celulas.map(c => c.rotulo.length * 3.7 + c.valor.length * 4.5 + 2));
    garantir(alturaLinha + 3);
    const inicioLinha = y;
    celulas.forEach((celula, indice) => {
      const x = MARGEM + indice * (larguraColuna + gap);
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
      theme: "striped",
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 2.1,
        overflow: "linebreak",
        textColor: PRETO,
      },
      headStyles: { fillColor: VERDE, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [246, 248, 246] },
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

  const paginas = pdf.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina++) {
    pdf.setPage(pagina);
    pdf.setDrawColor(224, 228, 225);
    pdf.line(MARGEM, altura - 23, largura - MARGEM, altura - 23);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...CINZA);
    pdf.text("Encantos Rio Negro", MARGEM, altura - 16);
    pdf.text(`Página ${pagina} de ${paginas}`, largura - MARGEM, altura - 16, { align: "right" });
  }
  return pdf;
}

export function baixarDocumentoPremiumERN(dados: DocumentoPremiumERN): void {
  criarDocumentoPremiumERN(dados).save(nomeSeguro(dados.nomeArquivo));
}

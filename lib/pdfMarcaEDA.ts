import type { jsPDF } from "jspdf";

// ERN_PDF_MARCA_EDA_V1
// Identidade única dos PDFs da Encantos Gestão (Encantos da Amazônia):
// faixa escura com a marca desenhada em vetor, linha dourada, cores e
// rodapé. Usada por todos os documentos para não haver duas versões da marca.
// Não usa imagens externas nem chaves: tudo é desenhado no próprio PDF.

export type CorPDF = [number, number, number];

export const CORES_PDF = {
  noite: [7, 17, 14] as CorPDF,
  floresta: [20, 63, 49] as CorPDF,
  texto: [19, 36, 29] as CorPDF,
  secundario: [95, 112, 104] as CorPDF,
  mudo: [138, 151, 143] as CorPDF,
  borda: [226, 222, 211] as CorPDF,
  creme: [247, 244, 236] as CorPDF,
  ouro: [196, 130, 47] as CorPDF,
  ouroClaro: [244, 199, 126] as CorPDF,
  ouroSuave: [251, 241, 221] as CorPDF,
  verde: [35, 122, 87] as CorPDF,
  verdeSuave: [226, 242, 234] as CorPDF,
  ambar: [148, 105, 10] as CorPDF,
  ambarSuave: [250, 240, 214] as CorPDF,
  vermelho: [181, 60, 60] as CorPDF,
  vermelhoSuave: [248, 228, 226] as CorPDF,
  branco: [255, 255, 255] as CorPDF,
};

export const MARCA_PDF = {
  nome: "Encantos Gestão",
  linha: "ENCANTOS DA AMAZÔNIA  ·  GESTÃO DA OPERADORA",
  rodape: "Encantos Gestão · Encantos da Amazônia",
};

// Marca "E" de três rios (sol, Solimões e floresta), desenhada em vetor.
export function desenharMarcaPDF(pdf: jsPDF, x: number, y: number, tamanho: number): void {
  const s = tamanho / 120;
  pdf.setFillColor(...CORES_PDF.floresta);
  pdf.roundedRect(x + 4 * s, y + 4 * s, 112 * s, 112 * s, 30 * s, 30 * s, "F");
  pdf.setLineCap("round");
  pdf.setLineWidth(10 * s);
  const curva = (cor: CorPDF, x0: number, y0: number, c1x: number, c1y: number, c2x: number, c2y: number, x1: number, y1: number) => {
    pdf.setDrawColor(...cor);
    pdf.lines([[(c1x - x0) * s, (c1y - y0) * s, (c2x - x0) * s, (c2y - y0) * s, (x1 - x0) * s, (y1 - y0) * s]], x + x0 * s, y + y0 * s, [1, 1], "S", false);
  };
  curva([244, 199, 126], 34, 32, 54, 24, 66, 40, 88, 31);
  curva([210, 135, 63], 34, 60, 50, 53, 62, 67, 80, 59);
  curva([71, 176, 135], 34, 88, 54, 80, 66, 96, 88, 87);
  pdf.setDrawColor(240, 240, 232);
  pdf.line(x + 34 * s, y + 32 * s, x + 34 * s, y + 88 * s);
  pdf.setLineCap("butt");
  pdf.setLineWidth(0.2);
}

// Cabeçalho da primeira página. Devolve a posição Y onde o conteúdo começa.
export function cabecalhoPDF(pdf: jsPDF, opcoes: { tipo: string; detalhe?: string; margem: number }): number {
  const largura = pdf.internal.pageSize.getWidth();
  const { margem } = opcoes;
  const alturaFaixa = 30;

  pdf.setFillColor(...CORES_PDF.noite);
  pdf.rect(0, 0, largura, alturaFaixa, "F");
  pdf.setFillColor(...CORES_PDF.ouro);
  pdf.rect(0, alturaFaixa, largura, 0.9, "F");

  desenharMarcaPDF(pdf, margem, 7, 16);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13.5);
  pdf.setTextColor(...CORES_PDF.branco);
  pdf.text(MARCA_PDF.nome, margem + 21, 14.2);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6.4);
  pdf.setTextColor(...CORES_PDF.ouroClaro);
  pdf.setCharSpace(0.35);
  pdf.text(MARCA_PDF.linha, margem + 21, 19.6);
  pdf.setCharSpace(0);

  const direita = largura - margem;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(...CORES_PDF.ouroClaro);
  pdf.setCharSpace(0.3);
  pdf.text(opcoes.tipo.toUpperCase(), direita, 13.6, { align: "right" });
  pdf.setCharSpace(0);
  if (opcoes.detalhe) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(200, 210, 204);
    pdf.text(opcoes.detalhe, direita, 19.4, { align: "right" });
  }
  return alturaFaixa + 13;
}

// Faixa fina no topo das páginas seguintes.
export function faixaContinuacaoPDF(pdf: jsPDF): void {
  const largura = pdf.internal.pageSize.getWidth();
  pdf.setFillColor(...CORES_PDF.noite);
  pdf.rect(0, 0, largura, 3.2, "F");
  pdf.setFillColor(...CORES_PDF.ouro);
  pdf.rect(0, 3.2, largura, 0.5, "F");
}

// Selo arredondado (situação) — cor de fundo suave, texto forte.
export function seloPDF(pdf: jsPDF, texto: string, x: number, y: number, tom: "ok" | "at" | "er" | "nt" = "nt"): number {
  const mapa = {
    ok: [CORES_PDF.verdeSuave, CORES_PDF.verde],
    at: [CORES_PDF.ambarSuave, CORES_PDF.ambar],
    er: [CORES_PDF.vermelhoSuave, CORES_PDF.vermelho],
    nt: [CORES_PDF.ouroSuave, [154, 93, 20] as CorPDF],
  } as const;
  const [fundo, cor] = mapa[tom];
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  const largura = pdf.getTextWidth(texto) + 8;
  pdf.setFillColor(...fundo);
  pdf.roundedRect(x, y - 4.2, largura, 6, 3, 3, "F");
  pdf.setFillColor(...cor);
  pdf.circle(x + 3, y - 1.2, 0.8, "F");
  pdf.setTextColor(...cor);
  pdf.text(texto, x + 5, y);
  return largura;
}

export function tomDaSituacaoPDF(situacao: string): "ok" | "at" | "er" | "nt" {
  const s = situacao.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/(confirm|pago|recebid|emitid|ativo|concluid|utilizad|encerrad)/.test(s)) return "ok";
  if (/(cancel|vencid|expirad|recusad|erro)/.test(s)) return "er";
  if (/(pendent|rascunho|aguard|analise|aberto|aberta)/.test(s)) return "at";
  return "nt";
}

// Rodapé de todas as páginas.
export function rodapesPDF(pdf: jsPDF, opcoes: { margem: number; complemento?: string }): void {
  const largura = pdf.internal.pageSize.getWidth();
  const altura = pdf.internal.pageSize.getHeight();
  const paginas = pdf.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina++) {
    pdf.setPage(pagina);
    if (pagina > 1) faixaContinuacaoPDF(pdf);
    pdf.setDrawColor(...CORES_PDF.borda);
    pdf.setLineWidth(0.3);
    pdf.line(opcoes.margem, altura - 20, largura - opcoes.margem, altura - 20);
    pdf.setFillColor(...CORES_PDF.ouro);
    pdf.rect(opcoes.margem, altura - 20.25, 14, 0.5, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...CORES_PDF.texto);
    pdf.text(MARCA_PDF.rodape, opcoes.margem, altura - 14);
    if (opcoes.complemento) {
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...CORES_PDF.secundario);
      pdf.text(opcoes.complemento, opcoes.margem, altura - 10);
    }
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...CORES_PDF.secundario);
    pdf.text(`Página ${pagina} de ${paginas}`, largura - opcoes.margem, altura - 14, { align: "right" });
  }
}

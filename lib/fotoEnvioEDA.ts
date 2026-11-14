import { sinalFracoEDA } from '@/lib/conexaoEDA';

// EDA_FOTO_LEVE_V1
// Com sinal normal: a foto sobe exatamente como foi escolhida (regra atual).
// Com sinal fraco: a foto é reduzida no próprio aparelho antes de enviar
// (ex.: 5 MB -> ~300 KB), maior lado 1600 px, JPEG 82%. Isso também remove
// os dados ocultos da câmera (como a localização GPS da foto).
// Vídeos nunca passam por aqui.

const LADO_MAXIMO = 1600;
const QUALIDADE = 0.82;

function nomeJpeg(nome: string) {
  return (nome.replace(/\.[^.]+$/, '') || 'foto') + '.jpg';
}

async function decodificar(arquivo: File): Promise<{ largura: number; altura: number; desenhar: (ctx: CanvasRenderingContext2D, l: number, a: number) => void; liberar: () => void }> {
  // <img> respeita a rotação da câmera (EXIF) no iPhone e no Android.
  const url = URL.createObjectURL(arquivo);
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  await img.decode();
  return {
    largura: img.naturalWidth,
    altura: img.naturalHeight,
    desenhar: (ctx, l, a) => ctx.drawImage(img, 0, 0, l, a),
    liberar: () => URL.revokeObjectURL(url),
  };
}

export async function prepararFotoEnvioEDA(arquivo: File): Promise<File> {
  // Só fotos JPEG (câmera do celular). PNG/WebP podem ter transparência (logos): ficam intactos.
  if (arquivo.type !== 'image/jpeg') return arquivo;
  if (!sinalFracoEDA()) return arquivo;
  if (arquivo.size <= 350 * 1024) return arquivo;

  try {
    const fonte = await decodificar(arquivo);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(fonte.largura, fonte.altura));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(fonte.largura * escala));
    canvas.height = Math.max(1, Math.round(fonte.altura * escala));
    const ctx = canvas.getContext('2d');
    if (!ctx) { fonte.liberar(); return arquivo; }

    fonte.desenhar(ctx, canvas.width, canvas.height);
    fonte.liberar();

    const blob = await new Promise<Blob | null>(ok => canvas.toBlob(ok, 'image/jpeg', QUALIDADE));
    canvas.width = canvas.height = 0; // libera memória (importante no iPhone)

    if (!blob || blob.size >= arquivo.size) return arquivo;
    return new File([blob], nomeJpeg(arquivo.name), { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return arquivo; // Qualquer falha: envia a original, sem travar o operador.
  }
}

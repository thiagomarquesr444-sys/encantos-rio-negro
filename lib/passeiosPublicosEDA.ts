// EDA_PASSEIOS_PORTAL_V1: passeios das operadoras expostos no portal público.
import { supabase } from '@/lib/supabase';

export type PasseioPublicoEDA = {
  id: string;
  nome: string;
  categoria: string | null;
  cidade: string | null;
  duracao: string | null;
  preco: number | null;
  vagas: number | null;
  descricao: string | null;
  fotos: string[];
  destaque: boolean;
  situacao: string;
  criado_em: string;
  operadora_slug: string;
  operadora_nome: string;
  operadora_logo: string | null;
  operadora_whatsapp: string | null;
  operadora_verificada: boolean;
};

export async function listarPasseiosPublicosEDA(slug?: string) {
  const { data, error } = await supabase.rpc('passeios_publicos_eda', {
    p_slug: slug ?? null,
  });
  if (error) throw error;
  return (data ?? []) as PasseioPublicoEDA[];
}

export function precoPasseioEDA(valor: number | null) {
  if (!valor || valor <= 0) return null;
  return Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function whatsappPasseioEDA(passeio: PasseioPublicoEDA) {
  let numero = (passeio.operadora_whatsapp ?? '').replace(/\D/g, '');
  if (!numero) return null;
  if (numero.length <= 11) numero = `55${numero}`;
  const texto =
    `Olá! Vi o passeio "${passeio.nome}" no portal Encantos da Amazônia ` +
    'e gostaria de saber datas e disponibilidade.';
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

const FORMATOS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const LIMITE_BYTES = 5 * 1024 * 1024;

// Mantém a foto como foi postada; só reduz se passar de 5 MB.
async function prepararFoto(arquivo: File): Promise<Blob> {
  if (FORMATOS[arquivo.type] && arquivo.size <= LIMITE_BYTES) return arquivo;

  const bitmap = await createImageBitmap(arquivo);
  let escala = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));

  for (let tentativa = 0; tentativa < 4; tentativa += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) =>
      canvas.toBlob(ok, 'image/jpeg', 0.86),
    );
    if (blob && blob.size <= LIMITE_BYTES) return blob;
    escala *= 0.75;
  }

  throw new Error('Não foi possível preparar uma das fotos. Tente outra imagem.');
}

export async function enviarFotosPasseioEDA(empresaId: string, arquivos: File[]) {
  const urls: string[] = [];

  for (const arquivo of arquivos) {
    const blob = await prepararFoto(arquivo);
    const tipo = blob.type && FORMATOS[blob.type] ? blob.type : 'image/jpeg';
    const caminho = `${empresaId}/passeios/${crypto.randomUUID()}.${FORMATOS[tipo]}`;

    const { error } = await supabase.storage
      .from('rede-publica')
      .upload(caminho, blob, {
        upsert: false,
        contentType: tipo,
        cacheControl: '31536000',
      });

    if (error) throw new Error('Falha ao enviar a foto. Verifique a conexão e tente novamente.');

    urls.push(supabase.storage.from('rede-publica').getPublicUrl(caminho).data.publicUrl);
  }

  return urls;
}

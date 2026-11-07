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
  // EDA_PASSEIOS_PREMIUM_V2: contrato estruturado + disponibilidade real
  slug: string;
  preco_modalidade: 'por_pessoa' | 'por_grupo' | 'sob_consulta';
  capacidade_minima: number;
  duracao_dias: number | null;
  duracao_horas: number | null;
  idiomas: string[];
  inclui: string[];
  nao_inclui: string[];
  ponto_embarque: string | null;
  proxima_saida: string | null;
  proxima_saida_vagas: number | null;
  saidas_abertas: number;
};

export type SaidaPublicaEDA = {
  saida_id: string;
  data_inicio: string;
  data_fim: string | null;
  horario: string | null;
  vagas_total: number;
  vagas_restantes: number;
};

// Agenda real cadastrada pela operadora. Portal e Concierge usam a mesma fonte:
// nada de disponibilidade inventada.
export async function listarSaidasPasseioEDA(passeioId: string) {
  const { data, error } = await supabase.rpc('disponibilidade_passeio_eda', {
    p_passeio_id: passeioId,
  });
  if (error) throw error;
  return (data ?? []) as SaidaPublicaEDA[];
}

export function dataCurtaEDA(iso: string | null) {
  if (!iso) return '';
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}

export function rotuloModalidadeEDA(m: PasseioPublicoEDA['preco_modalidade']) {
  return m === 'por_grupo' ? 'por grupo' : m === 'sob_consulta' ? '' : 'por pessoa';
}

// Cache curto (60s) por slug: Vitrine, Destinos e Experiências reutilizam a mesma consulta.
const cachePublico = new Map<string, { em: number; p: Promise<PasseioPublicoEDA[]> }>();
export async function listarPasseiosPublicosEDA(slug?: string) {
  const chave = slug ?? '';
  const atual = cachePublico.get(chave);
  if (atual && Date.now() - atual.em < 60_000) return atual.p;
  const p = (async () => {
    const { data, error } = await supabase.rpc('passeios_publicos_eda', { p_slug: slug ?? null });
    if (error) throw error;
    return (data ?? []) as PasseioPublicoEDA[];
  })();
  cachePublico.set(chave, { em: Date.now(), p });
  p.catch(() => cachePublico.delete(chave));
  return p;
}

// EDA_EXPERIENCIAS_CONECTADAS_V1: interesse do portal -> passeios que combinam.
const INTERESSES_PASSEIO: Record<string, RegExp> = {
  pesca: /pesca|tucunar/,
  rios: /barco|naveg|cruzeiro|travessia|rio|expedi/,
  natureza: /ecoturismo|natureza|trilha|fauna|floresta|anavilhanas|igapo|boto|observa/,
  cultura: /cultura|festival|comunidade|indigena|artesanato|historia/,
  praias: /praia/,
  sabores: /gastronom|culinari|sabor|comida|almoco|jantar/,
};
export function passeioCombinaInteresseEDA(p: PasseioPublicoEDA, interesse: string) {
  const re = INTERESSES_PASSEIO[interesse];
  if (!re) return false;
  const texto = `${p.categoria ?? ''} ${p.nome} ${p.descricao ?? ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return re.test(texto);
}

export function precoPasseioEDA(valor: number | null) {
  if (!valor || valor <= 0) return null;
  return Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function whatsappPasseioEDA(
  passeio: PasseioPublicoEDA,
  saida?: SaidaPublicaEDA | null,
  pessoas?: number,
) {
  let numero = (passeio.operadora_whatsapp ?? '').replace(/\D/g, '');
  if (!numero) return null;
  if (numero.length <= 11) numero = `55${numero}`;
  // Mensagem já estruturada: a operadora (ou o Concierge) recebe o pedido pronto.
  const partes = [`Olá! Vi o passeio "${passeio.nome}" no portal Encantos da Amazônia.`];
  if (saida) {
    partes.push(`Tenho interesse na saída de ${dataCurtaEDA(saida.data_inicio)}` +
      (saida.data_fim && saida.data_fim !== saida.data_inicio ? ` a ${dataCurtaEDA(saida.data_fim)}` : '') + '.');
  } else {
    partes.push('Gostaria de saber as próximas datas disponíveis.');
  }
  if (pessoas && pessoas > 0) partes.push(`Somos ${pessoas} pessoa(s).`);
  partes.push(`Ref.: ${passeio.slug ?? passeio.id}`);
  const texto = partes.join(' ');
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

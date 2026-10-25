import { supabase } from '@/lib/supabase';

const PREFIXO = 'vivencias-ern/';

type MidiaComEndereco = {
  url: string;
  thumbnail_url: string | null;
};

export async function resolverMidiasPrivadasERN<
  T extends MidiaComEndereco
>(itens: T[]): Promise<T[]> {
  const caminhos = [...new Set(
    itens.flatMap(item => [item.url, item.thumbnail_url])
      .filter((url): url is string =>
        typeof url === 'string' && url.startsWith(PREFIXO)
      )
      .map(url => url.slice(PREFIXO.length))
  )];

  if (!caminhos.length) return itens;

  const enderecos = new Map<string, string>();

  for (let inicio = 0; inicio < caminhos.length; inicio += 50) {
    const lote = caminhos.slice(inicio, inicio + 50);
    const { data, error } = await supabase.storage
      .from('vivencias-ern')
      .createSignedUrls(lote, 3600);

    if (error) throw error;

    for (const item of data ?? []) {
      if (!item.path || !item.signedUrl || item.error) {
        throw new Error(
          'Não foi possível abrir uma mídia. Atualize a galeria ou a página.'
        );
      }

      enderecos.set(item.path, item.signedUrl);
    }
  }

  function resolver(url: string): string {
    if (!url.startsWith(PREFIXO)) return url;
    const endereco = enderecos.get(url.slice(PREFIXO.length));

    if (!endereco) {
      throw new Error('Mídia indisponível. Atualize a página.');
    }

    return endereco;
  }

  return itens.map(item => ({
    ...item,
    url: resolver(item.url),
    thumbnail_url: item.thumbnail_url
      ? resolver(item.thumbnail_url)
      : null,
  }));
}
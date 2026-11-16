'use client';

/*
  EDA_VITRINE_V1 — o fornecedor/artesão cadastra suas peças com foto.
  A venda é direta: o comprador fala com ele pelo WhatsApp do perfil.
  A Encantos não recebe dinheiro nem intermedia a entrega.
*/
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { prepararFotoEnvioEDA } from '@/lib/fotoEnvioEDA';
import { confirmarEDA } from '@/lib/dialogoEDA';

type Item = {
  id: string;
  titulo: string;
  descricao: string | null;
  preco: number | null;
  foto_url: string;
  maior_18: boolean;
  envia_correios: boolean;
  publicado: boolean;
};

const BUCKET = 'rede-publica';
const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
const INPUT =
  'mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-[#07110E] px-3 text-base text-[#EDEDE3] outline-none focus-visible:ring-2 focus-visible:ring-[#F4C77E]';

function caminhoDaUrl(url: string) {
  const marca = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marca);
  return i >= 0 ? decodeURIComponent(url.slice(i + marca.length)) : null;
}

export default function VitrineFornecedorEDA({ usuarioId, atividade }: { usuarioId: string; atividade: string }) {
  const [itens, setItens] = useState<Item[]>([]);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [enviaCorreios, setEnviaCorreios] = useState(false);
  const [maior18, setMaior18] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const bebidas = /bebida/i.test(atividade);
  const artesanato = /artesanato/i.test(atividade);

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from('vitrine_itens')
      .select('id,titulo,descricao,preco,foto_url,maior_18,envia_correios,publicado')
      .eq('usuario_id', usuarioId)
      .order('criado_em', { ascending: false });
    setItens((data ?? []) as Item[]);
  }, [usuarioId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function adicionar() {
    setAviso(null);
    if (titulo.trim().length < 2) return setAviso({ tipo: 'erro', texto: 'Dê um nome à peça.' });
    if (!foto) return setAviso({ tipo: 'erro', texto: 'Escolha uma foto da peça.' });
    if (!TIPOS.includes(foto.type)) return setAviso({ tipo: 'erro', texto: 'Use foto JPG, PNG ou WebP.' });
    if (foto.size > 8 * 1024 * 1024) return setAviso({ tipo: 'erro', texto: 'A foto passa de 8 MB.' });
    const valor = preco.trim() ? Number(preco.replace(',', '.')) : null;
    if (valor !== null && (!Number.isFinite(valor) || valor < 0)) {
      return setAviso({ tipo: 'erro', texto: 'Preço inválido.' });
    }

    setOcupado(true);
    try {
      const arquivo = await prepararFotoEnvioEDA(foto);
      const ext = arquivo.type === 'image/png' ? 'png' : arquivo.type === 'image/webp' ? 'webp' : 'jpg';
      const caminho = `vitrine/${usuarioId}/${crypto.randomUUID()}.${ext}`;
      const { error: erroFoto } = await supabase.storage
        .from(BUCKET)
        .upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
      if (erroFoto) throw new Error('Não foi possível enviar a foto.');
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(caminho);

      const { error } = await supabase.from('vitrine_itens').insert({
        usuario_id: usuarioId,
        titulo: titulo.trim().slice(0, 90),
        descricao: descricao.trim().slice(0, 600) || null,
        preco: valor,
        foto_url: pub.publicUrl,
        envia_correios: enviaCorreios,
        maior_18: bebidas || maior18,
      });
      if (error) {
        await supabase.storage.from(BUCKET).remove([caminho]);
        throw new Error(
          error.message.includes('EDA_VITRINE_LIMITE')
            ? 'Sua vitrine já tem 30 peças. Remova alguma para incluir outra.'
            : 'Não foi possível salvar a peça.'
        );
      }
      setTitulo('');
      setDescricao('');
      setPreco('');
      setFoto(null);
      setAviso({ tipo: 'ok', texto: 'Peça publicada no Portal da Encantos da Amazônia.' });
      await carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    } finally {
      setOcupado(false);
    }
  }

  async function alternar(item: Item) {
    await supabase.from('vitrine_itens').update({ publicado: !item.publicado }).eq('id', item.id);
    await carregar();
  }

  async function remover(item: Item) {
    if (!(await confirmarEDA(`Remover "${item.titulo}" da vitrine?`))) return;
    const { error } = await supabase.from('vitrine_itens').delete().eq('id', item.id);
    if (!error) {
      const caminho = caminhoDaUrl(item.foto_url);
      if (caminho?.startsWith(`vitrine/${usuarioId}/`)) await supabase.storage.from(BUCKET).remove([caminho]);
    }
    await carregar();
  }

  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-[#0D1B16] p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#F4C77E]">Minha vitrine</p>
      <h2 className="mt-2 text-2xl font-semibold text-[#F0F0E8]">
        {artesanato ? 'Mostre seu artesanato para o Brasil' : 'Mostre seus produtos'}
      </h2>
      <p className="mt-2 text-sm leading-7 text-[#EDEDE3]/65">
        Suas peças aparecem no Portal Público da Encantos da Amazônia. Quem se interessar fala direto com você
        pelo WhatsApp do seu perfil. A venda e o dinheiro são só seus.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-[#EDEDE3]">
          Nome da peça ou produto
          <input value={titulo} maxLength={90} onChange={(e) => setTitulo(e.target.value)} className={INPUT}
            placeholder={artesanato ? 'Ex.: Boto esculpido em madeira' : 'Ex.: Caixa de água mineral'} />
        </label>
        <label className="text-sm text-[#EDEDE3]">
          Preço (opcional)
          <input value={preco} inputMode="decimal" onChange={(e) => setPreco(e.target.value)} className={INPUT}
            placeholder="Ex.: 80,00" />
        </label>
        <label className="text-sm text-[#EDEDE3] sm:col-span-2">
          Descrição (opcional)
          <textarea value={descricao} maxLength={600} rows={3} onChange={(e) => setDescricao(e.target.value)}
            className={`${INPUT} py-3`} placeholder="Material, tamanho, quem fez, a história da peça…" />
        </label>
        <label className="text-sm text-[#EDEDE3] sm:col-span-2">
          Foto
          <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment"
            onChange={(e) => setFoto(e.target.files?.[0] ?? null)} className={`${INPUT} py-2.5`} />
        </label>
        <label className="flex min-h-12 items-center gap-3 text-sm text-[#EDEDE3]">
          <input type="checkbox" checked={enviaCorreios} onChange={(e) => setEnviaCorreios(e.target.checked)} />
          Envio para outros estados pelos Correios
        </label>
        {!bebidas && (
          <label className="flex min-h-12 items-center gap-3 text-sm text-[#EDEDE3]">
            <input type="checkbox" checked={maior18} onChange={(e) => setMaior18(e.target.checked)} />
            Venda só para maiores de 18 anos
          </label>
        )}
      </div>

      {bebidas && (
        <p className="mt-3 text-xs text-[#F4C77E]">
          Bebidas aparecem com o aviso &quot;Venda proibida para menores de 18 anos&quot;.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void adicionar()} disabled={ocupado}
          className="inline-flex min-h-12 items-center rounded-xl bg-[#E3A144] px-5 text-sm font-bold text-[#07110E] disabled:opacity-50">
          {ocupado ? 'Publicando…' : 'Publicar na vitrine'}
        </button>
        {aviso && (
          <span className={`text-sm ${aviso.tipo === 'ok' ? 'text-emerald-300' : 'text-red-300'}`}>{aviso.texto}</span>
        )}
      </div>

      {enviaCorreios && (
        <details className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-[#EDEDE3]/75">
          <summary className="cursor-pointer font-semibold text-[#F4C77E]">Como enviar pelos Correios, passo a passo</summary>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 leading-6">
            <li>Combine com o comprador pelo WhatsApp: valor da peça, frete e forma de pagamento (Pix direto para você).</li>
            <li>Peça o nome completo, o endereço com CEP e o telefone de quem vai receber.</li>
            <li>Embale bem: papel ou jornal em volta e caixa firme. Escreva &quot;FRÁGIL&quot; se for o caso.</li>
            <li>Leve à agência dos Correios da sua cidade. O atendente calcula o frete pelo peso e pelo CEP.</li>
            <li>Guarde o comprovante e mande o <b>código de rastreio</b> ao comprador pelo WhatsApp.</li>
          </ol>
        </details>
      )}

      {itens.length > 0 && (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {itens.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#07110E]">
              <img src={item.foto_url} alt={item.titulo} loading="lazy" className="aspect-square w-full object-cover" />
              <div className="p-3">
                <p className="text-sm font-semibold text-[#F0F0E8]">{item.titulo}</p>
                {item.preco !== null && (
                  <p className="text-xs text-[#F4C77E]">
                    {Number(item.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                )}
                <div className="mt-2 flex gap-2 text-xs">
                  <button type="button" onClick={() => void alternar(item)} className="rounded-lg border border-white/10 px-2 py-1 text-[#EDEDE3]/75">
                    {item.publicado ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button type="button" onClick={() => void remover(item)} className="rounded-lg border border-red-400/30 px-2 py-1 text-red-300">
                    Remover
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

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
  entrega_passeio: boolean;
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
  const [maior18, setMaior18] = useState(() => /bebida/i.test(atividade));
  const [entregaPasseio, setEntregaPasseio] = useState(false);
  // EDA_ARTESANATO_V2: nome do titular do Pix, mostrado na vitrine para o turista conferir.
  const [pixTitular, setPixTitular] = useState('');
  const [pixSalvo, setPixSalvo] = useState('');
  const [verificado, setVerificado] = useState(false);
  const [avisoPix, setAvisoPix] = useState('');
  const [ocupado, setOcupado] = useState(false);
  // EDA_VITRINE_EDITAR_V1: peça em edição (null = nova peça).
  const [editando, setEditando] = useState<Item | null>(null);
  const [chaveFoto, setChaveFoto] = useState(0);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  // EDA_VITRINE_18_V1: o aviso +18 só existe para bebidas alcoólicas (atividade Bebidas).
  const bebidas = /bebida/i.test(atividade);
  const artesanato = /artesanato/i.test(atividade);

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from('vitrine_itens')
      .select('id,titulo,descricao,preco,foto_url,maior_18,envia_correios,entrega_passeio,publicado')
      .eq('usuario_id', usuarioId)
      .order('criado_em', { ascending: false });
    setItens((data ?? []) as Item[]);
    const { data: perfil } = await supabase
      .from('perfis_profissionais')
      .select('pix_titular,verificado_em')
      .eq('usuario_id', usuarioId)
      .eq('tipo', 'fornecedor')
      .maybeSingle();
    setPixTitular(perfil?.pix_titular ?? '');
    setPixSalvo(perfil?.pix_titular ?? '');
    setVerificado(Boolean(perfil?.verificado_em));
  }, [usuarioId]);

  async function salvarPix() {
    const nome = pixTitular.trim().replace(/\s+/g, ' ');
    if (nome && (nome.length < 3 || nome.length > 120)) return setAvisoPix('Escreva o nome completo do titular do Pix.');
    if (verificado && !(await confirmarEDA('Trocar o titular do Pix tira o selo de verificado até a nova conferência. Continuar?'))) return;
    const { error } = await supabase
      .from('perfis_profissionais')
      .update({ pix_titular: nome || null })
      .eq('usuario_id', usuarioId)
      .eq('tipo', 'fornecedor');
    setAvisoPix(error ? 'Não foi possível salvar agora.' : 'Salvo.');
    if (!error) await carregar();
  }

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function adicionar() {
    setAviso(null);
    if (titulo.trim().length < 2) return setAviso({ tipo: 'erro', texto: 'Dê um nome à peça.' });
    if (!foto && !editando) return setAviso({ tipo: 'erro', texto: 'Escolha uma foto da peça.' });
    if (foto && !TIPOS.includes(foto.type)) return setAviso({ tipo: 'erro', texto: 'Use foto JPG, PNG ou WebP.' });
    if (foto && foto.size > 8 * 1024 * 1024) return setAviso({ tipo: 'erro', texto: 'A foto passa de 8 MB.' });
    const valor = preco.trim() ? Number(preco.replace(',', '.')) : null;
    if (valor !== null && (!Number.isFinite(valor) || valor < 0)) {
      return setAviso({ tipo: 'erro', texto: 'Preço inválido.' });
    }

    setOcupado(true);
    if (editando) {
      await salvarEdicao(editando, valor);
      return;
    }
    try {
      if (!foto) throw new Error('Escolha uma foto da peça.');
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
        entrega_passeio: entregaPasseio,
        maior_18: bebidas && maior18,
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

  function limparFormulario() {
    setTitulo('');
    setDescricao('');
    setPreco('');
    setFoto(null);
    setEnviaCorreios(false);
    setEntregaPasseio(false);
    setMaior18(bebidas);
    setEditando(null);
    setChaveFoto((k) => k + 1);
  }

  function editar(item: Item) {
    setAviso(null);
    setEditando(item);
    setTitulo(item.titulo);
    setDescricao(item.descricao ?? '');
    setPreco(item.preco !== null ? String(item.preco).replace('.', ',') : '');
    setFoto(null);
    setEnviaCorreios(item.envia_correios);
    setEntregaPasseio(item.entrega_passeio);
    setMaior18(bebidas && item.maior_18);
    setChaveFoto((k) => k + 1);
    document.getElementById('vitrine-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function salvarEdicao(item: Item, valor: number | null) {
    let novoCaminho: string | null = null;
    try {
      let fotoUrl = item.foto_url;
      if (foto) {
        const arquivo = await prepararFotoEnvioEDA(foto);
        const ext = arquivo.type === 'image/png' ? 'png' : arquivo.type === 'image/webp' ? 'webp' : 'jpg';
        novoCaminho = `vitrine/${usuarioId}/${crypto.randomUUID()}.${ext}`;
        const { error: erroFoto } = await supabase.storage
          .from(BUCKET)
          .upload(novoCaminho, arquivo, { contentType: arquivo.type, upsert: false });
        if (erroFoto) { novoCaminho = null; throw new Error('Não foi possível enviar a foto.'); }
        fotoUrl = supabase.storage.from(BUCKET).getPublicUrl(novoCaminho).data.publicUrl;
      }
      const { error } = await supabase
        .from('vitrine_itens')
        .update({
          titulo: titulo.trim().slice(0, 90),
          descricao: descricao.trim().slice(0, 600) || null,
          preco: valor,
          foto_url: fotoUrl,
          envia_correios: enviaCorreios,
          entrega_passeio: entregaPasseio,
          maior_18: bebidas && maior18,
        })
        .eq('id', item.id)
        .eq('usuario_id', usuarioId);
      if (error) throw new Error('Não foi possível salvar as alterações.');
      // Foto trocada: apaga a antiga (só se for da pasta do próprio artesão).
      if (novoCaminho) {
        const antigo = caminhoDaUrl(item.foto_url);
        if (antigo?.startsWith(`vitrine/${usuarioId}/`)) await supabase.storage.from(BUCKET).remove([antigo]);
        novoCaminho = null;
      }
      limparFormulario();
      setAviso({ tipo: 'ok', texto: 'Alterações salvas na vitrine.' });
      await carregar();
    } catch (e) {
      if (novoCaminho) await supabase.storage.from(BUCKET).remove([novoCaminho]);
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
    if (!error && editando?.id === item.id) limparFormulario();
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

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-sm font-semibold text-[#F0F0E8]">
          Recebimento por Pix {verificado ? <span className="ml-1 text-xs font-semibold text-emerald-300">· Artesão verificado</span> : null}
        </p>
        <p className="mt-1 text-xs leading-5 text-[#EDEDE3]/65">
          O nome do titular da sua chave Pix aparece na vitrine para o turista conferir antes de pagar. Isso evita golpe
          com o seu nome. Com nome, WhatsApp e titular do Pix completos, a Encantos confere e coloca o selo de verificado.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input value={pixTitular} maxLength={120} onChange={(e) => setPixTitular(e.target.value)} className={`${INPUT} mt-0`}
            placeholder="Nome completo do titular do Pix" aria-label="Nome do titular do Pix" />
          <button type="button" onClick={() => void salvarPix()} disabled={pixTitular.trim() === pixSalvo.trim()}
            className="min-h-12 shrink-0 rounded-full border border-white/35 px-5 text-sm font-semibold text-white disabled:opacity-40">
            Salvar
          </button>
        </div>
        {avisoPix && <p className="mt-2 text-xs text-[#F4C77E]">{avisoPix}</p>}
      </div>

      {editando && (
        <p className="mt-6 text-sm font-semibold text-[#F4C77E]">Editando: {editando.titulo}</p>
      )}
      <div id="vitrine-form" className="mt-6 grid scroll-mt-24 gap-4 sm:grid-cols-2">
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
          {editando ? 'Trocar foto (opcional)' : 'Foto'}
          <input key={chaveFoto} type="file" accept="image/jpeg,image/png,image/webp" capture="environment"
            onChange={(e) => setFoto(e.target.files?.[0] ?? null)} className={`${INPUT} py-2.5`} />
        </label>
        <label className="flex min-h-12 items-center gap-3 text-sm text-[#EDEDE3]">
          <input type="checkbox" checked={enviaCorreios} onChange={(e) => setEnviaCorreios(e.target.checked)} />
          Envio para outros estados pelos Correios
        </label>
        <label className="flex min-h-12 items-center gap-3 text-sm text-[#EDEDE3]">
          <input type="checkbox" checked={entregaPasseio} onChange={(e) => setEntregaPasseio(e.target.checked)} />
          Posso entregar ao turista durante o passeio, por uma operadora
        </label>
        {bebidas && (
          <label className="flex min-h-12 items-center gap-3 text-sm text-[#EDEDE3]">
            <input type="checkbox" checked={maior18} onChange={(e) => setMaior18(e.target.checked)} />
            É bebida alcoólica (venda proibida para menores de 18 anos)
          </label>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void adicionar()} disabled={ocupado}
          className="inline-flex min-h-12 items-center rounded-xl bg-[#E3A144] px-5 text-sm font-bold text-[#07110E] disabled:opacity-50">
          {ocupado ? 'Salvando…' : editando ? 'Salvar alterações' : 'Publicar na vitrine'}
        </button>
        {editando && (
          <button type="button" onClick={limparFormulario} disabled={ocupado}
            className="inline-flex min-h-12 items-center rounded-full border border-white/20 px-5 text-sm text-[#EDEDE3]/75">
            Cancelar edição
          </button>
        )}
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
                {item.entrega_passeio && <p className="text-[10px] text-[#EDEDE3]/60">Entrega no passeio</p>}
                {item.preco !== null && (
                  <p className="text-xs text-[#F4C77E]">
                    {Number(item.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                )}
                <div className="mt-2 flex gap-2 text-xs">
                  <button type="button" onClick={() => editar(item)} className="rounded-lg border border-white/10 px-2 py-1 text-[#EDEDE3]/75">
                    Editar
                  </button>
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

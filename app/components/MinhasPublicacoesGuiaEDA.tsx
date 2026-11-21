'use client';

// EDA_POSTAR_REDE_V1 — Guia/Prático: postar na Rede + lista das próprias publicações.
import '@/app/components/padrao-paginas-eda.css';
import '@/app/fablepremium.css';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import PostarRedeEDA from '@/app/components/PostarRedeEDA';
import { supabase } from '@/lib/supabase';
import { confirmarERN } from '@/lib/confirmarERN';
import { erroPostarEDA } from '@/lib/postarRedeEDA';

type Pub = {
  id: string; slug: string; titulo: string; tipo: string; status: string;
  updated_at: string; publicado_em: string | null; data_evento_inicio: string | null; data_evento_fim: string | null;
};

const SITUACAO: Record<string, string> = { rascunho: 'Rascunho', publicado: 'Na Rede', arquivado: 'Arquivada' };
const dia = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Manaus', day: '2-digit', month: '2-digit' }) : '');

export default function MinhasPublicacoesGuiaEDA() {
  const [lista, setLista] = useState<Pub[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Entre novamente.');
      const { data: perfil } = await supabase.from('perfis_publicos').select('id')
        .eq('usuario_id', auth.user.id).eq('origem_tipo', 'profissional').eq('categoria', 'guia').maybeSingle();
      if (!perfil) { setLista([]); return; }
      const { data, error } = await supabase.from('publicacoes')
        .select('id,slug,titulo,tipo,status,updated_at,publicado_em,data_evento_inicio,data_evento_fim')
        .eq('autor_perfil_id', perfil.id).order('created_at', { ascending: false }).limit(30);
      if (error) throw error;
      setLista((data ?? []) as Pub[]);
    } catch (e) {
      setErro(erroPostarEDA(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function arquivar(p: Pub) {
    const ok = await confirmarERN(`Tirar "${p.titulo}" da Rede? O conteúdo fica guardado.`, {
      titulo: 'Arquivar publicação', confirmar: 'Arquivar', destrutiva: false,
    });
    if (!ok) return;
    const { error } = await supabase.rpc('alterar_status_publicacao_ern', {
      publicacao_id: p.id, acao: 'arquivar', versao_esperada: p.updated_at,
    });
    if (error) setErro(erroPostarEDA(error));
    void carregar();
  }

  return (
    <main data-fable="portal" className="mx-auto w-full max-w-5xl px-4 py-6">
      <Link href="/guia" className="text-sm text-[var(--ern-secundario)]">Voltar</Link>
      <h1 className="mt-3 text-2xl font-semibold" style={{ textWrap: 'balance' }}>Publicar na Rede EDA</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ern-secundario)]" style={{ textWrap: 'pretty' }}>
        Suas publicações saem com o seu nome, independentes das operadoras. Mostre seu trabalho ou
        avise as datas em que está livre para guiar.
      </p>

      <div className="mt-6 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <PostarRedeEDA modo="guia" onPublicado={() => void carregar()} />

        <section aria-labelledby="minhas-pubs" className="min-w-0">
          <h2 id="minhas-pubs" className="text-lg font-semibold">Minhas publicações</h2>
          {erro && <p role="alert" className="mt-3 text-sm text-[var(--ern-alerta)]">{erro}</p>}
          {carregando ? (
            <p role="status" className="mt-3 text-sm">Carregando…</p>
          ) : !lista.length ? (
            <p className="mt-3 text-sm text-[var(--ern-secundario)]">Você ainda não publicou na Rede.</p>
          ) : (
            <ul className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-1">
              {lista.map(p => (
                <li key={p.id} className="eda-card min-w-0 rounded-xl border border-[var(--ern-borda)] p-3">
                  <small className="text-xs text-[var(--ern-secundario)]">
                    {SITUACAO[p.status] ?? p.status}
                    {p.tipo === 'disponibilidade' && p.data_evento_inicio && ` · livre ${dia(p.data_evento_inicio)}–${dia(p.data_evento_fim)}`}
                  </small>
                  <p className="mt-1 line-clamp-2 break-words text-sm font-semibold">{p.titulo}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {p.status === 'publicado' && (
                      <>
                        <Link className="eda-botao px-3 py-1 text-xs" href={`/rede/publicacao/${encodeURIComponent(p.slug)}`} target="_blank">Ver</Link>
                        <button type="button" className="eda-botao px-3 py-1 text-xs" onClick={() => void arquivar(p)}>Arquivar</button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

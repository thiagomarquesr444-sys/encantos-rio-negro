'use client';
import '@/app/components/padrao-paginas-eda.css';

// EDA_ARTESANATO_V2: o CEO confere o artesão (WhatsApp + titular do Pix) e dá o selo.
// Se o artesão trocar nome, WhatsApp ou titular do Pix, o banco tira o selo sozinho.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { confirmarEDA } from '@/lib/dialogoEDA';

type Artesao = {
  usuario_id: string; nome: string | null; cidade: string | null; categoria: string | null; whatsapp: string;
  pix_titular: string | null; verificado_em: string | null; pecas: number; criado_em: string;
};

export default function ArtesaosComandoPage() {
  const [lista, setLista] = useState<Artesao[] | null>(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc('artesaos_verificacao_eda');
    if (error) { setErro(error.message.includes('SEM_PERMISSAO') ? 'Área exclusiva da administração da plataforma.' : 'Não foi possível carregar.'); return; }
    setErro(''); setLista((data ?? []) as Artesao[]);
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  async function marcar(a: Artesao, verificar: boolean) {
    const texto = verificar
      ? `Confirma que conferiu ${a.nome ?? 'o artesão'} pelo WhatsApp e que o Pix está em nome de "${a.pix_titular}"?`
      : `Retirar o selo de ${a.nome ?? 'o artesão'}?`;
    if (!(await confirmarEDA(texto))) return;
    const { error } = await supabase.rpc('verificar_artesao_eda', { p_usuario: a.usuario_id, p_verificar: verificar });
    if (error) setErro(error.message.includes('INCOMPLETA') ? 'Falta WhatsApp com DDD ou titular do Pix no cadastro.' : 'Não foi possível atualizar.');
    void carregar();
  }

  return (
    <main className="eda-pg eda-pg-auto eda-pg-legado min-h-screen px-4 py-8 sm:px-8"><div className="mx-auto max-w-5xl space-y-6">
      <Link href="/comando" className="inline-flex min-h-11 items-center text-sm text-[var(--ern-destaque)]">← Comando EDA</Link>
      <header>
        <p className="text-xs uppercase tracking-[.2em] text-[var(--ern-destaque)]">Comando EDA</p>
        <h1 className="mt-2 text-3xl">Artesãos e produtores</h1>
        <p className="mt-2 text-sm text-[var(--ern-secundario)]">
          Para dar o selo: chame no WhatsApp do cadastro, confirme quem é e peça o comprovante de uma chave Pix no nome mostrado aqui.
        </p>
      </header>
      {erro && <p className="text-sm text-red-300">{erro}</p>}
      {lista && !lista.length && <p className="text-sm text-[var(--ern-secundario)]">Nenhum fornecedor cadastrado ainda.</p>}
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {(lista ?? []).map((a) => (
          <li key={a.usuario_id} className="rounded-2xl border border-white/10 p-4 text-sm">
            <p className="font-semibold">{a.nome ?? 'Sem nome'}</p>
            <p className="text-xs text-[var(--ern-secundario)]">{[a.categoria, a.cidade].filter(Boolean).join(' · ')}</p>
            <p className="mt-2 text-xs">WhatsApp: {a.whatsapp || '—'}</p>
            <p className="text-xs">Pix em nome de: {a.pix_titular ?? '—'}</p>
            <p className="text-xs">Peças: {a.pecas}</p>
            <p className={`mt-2 text-xs font-semibold ${a.verificado_em ? 'text-emerald-300' : 'text-[var(--ern-destaque)]'}`}>
              {a.verificado_em ? `Verificado em ${new Date(a.verificado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Manaus' })}` : 'Aguardando verificação'}
            </p>
            <button type="button" onClick={() => void marcar(a, !a.verificado_em)}
              className="mt-3 min-h-10 rounded-full border border-white/35 bg-transparent px-4 text-xs font-semibold">
              {a.verificado_em ? 'Retirar selo' : 'Dar selo de verificado'}
            </button>
          </li>
        ))}
      </ul>
    </div></main>
  );
}

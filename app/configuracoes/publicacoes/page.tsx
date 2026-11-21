'use client';

// EDA_GALERIA_PUBLICACOES_V1 — Postar (topo) + galeria de publicações (largura toda).
import '@/app/components/padrao-paginas-eda.css';
import '@/app/components/padrao-formularios-eda.css';
import { useState } from 'react';
import Link from 'next/link';
import PostarRedeEDA from '@/app/components/PostarRedeEDA';
import GaleriaPublicacoesEDA from '@/app/components/GaleriaPublicacoesEDA';

export default function PublicacoesPage() {
  const [versao, setVersao] = useState(0);
  const [abrir, setAbrir] = useState<{ id: string; n: number } | null>(null);

  return (
    <main className="eda-pg eda-pg-auto eda-pg-legado min-h-screen px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/configuracoes/perfil-publico" className="inline-flex min-h-11 items-center text-sm text-[var(--ern-secundario)]">
          ← Perfil público
        </Link>

        <header className="mt-4 border-b border-[var(--ern-borda)] pb-6 eda-capa eda-capa-auto eda-mg" data-eda-mg="">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--ern-secundario)]">Sua operadora na Rede EDA</p>
          <h1 className="mt-3 text-3xl sm:text-4xl" style={{ textWrap: 'balance' }}>Histórias, roteiros e experiências</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ern-secundario)]" style={{ textWrap: 'pretty' }}>
            Escolha fotos e vídeos, escreva a legenda e publique. O rascunho é salvo sozinho.
          </p>
        </header>

        <div className="mt-6 max-w-3xl">
          <PostarRedeEDA modo="operadora" abrir={abrir} onPublicado={() => setVersao(v => v + 1)} />
        </div>

        <div className="mt-10">
          <GaleriaPublicacoesEDA modo="operadora" atualizar={versao}
            onAbrir={id => setAbrir(a => ({ id, n: (a?.n ?? 0) + 1 }))} />
        </div>
      </div>
    </main>
  );
}

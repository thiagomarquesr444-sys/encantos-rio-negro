'use client';

// EDA_POSTAR_REDE_V1 + EDA_GALERIA_PUBLICACOES_V1 — Guia/Prático: postar na Rede + galeria das próprias publicações.
import '@/app/components/padrao-paginas-eda.css';
import '@/app/fablepremium.css';
import { useState } from 'react';
import Link from 'next/link';
import PostarRedeEDA from '@/app/components/PostarRedeEDA';
import GaleriaPublicacoesEDA from '@/app/components/GaleriaPublicacoesEDA';

export default function MinhasPublicacoesGuiaEDA() {
  const [versao, setVersao] = useState(0);
  const [abrir, setAbrir] = useState<{ id: string; n: number } | null>(null);

  return (
    <main data-fable="portal" className="mx-auto w-full max-w-6xl px-4 py-6">
      <Link href="/guia" className="text-sm text-[var(--ern-secundario)]">← Voltar</Link>
      <h1 className="mt-3 text-2xl font-semibold" style={{ textWrap: 'balance' }}>Publicar na Rede EDA</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ern-secundario)]" style={{ textWrap: 'pretty' }}>
        Suas publicações saem com o seu nome, independentes das operadoras. Mostre seu trabalho ou
        avise as datas em que está livre para guiar.
      </p>
      <div className="mt-6 max-w-3xl">
        <PostarRedeEDA modo="guia" abrir={abrir} onPublicado={() => setVersao(v => v + 1)} />
      </div>
      <div className="mt-10">
        <GaleriaPublicacoesEDA modo="guia" atualizar={versao}
          onAbrir={id => setAbrir(a => ({ id, n: (a?.n ?? 0) + 1 }))} />
      </div>
    </main>
  );
}

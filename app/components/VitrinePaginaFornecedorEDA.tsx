'use client';

/* EDA_FORNECEDOR_VITRINE_V1 — página própria da vitrine, com capa no padrão Encantos. */
import './inicio-fornecedor-eda.css';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import VitrineFornecedorEDA from '@/app/components/VitrineFornecedorEDA';

export default function VitrinePaginaFornecedorEDA() {
  const [ctx, setCtx] = useState<{ usuarioId: string; atividade: string; temPerfil: boolean } | null>(null);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: perfil } = await supabase
        .from('perfis_profissionais')
        .select('categoria')
        .eq('usuario_id', auth.user.id)
        .eq('tipo', 'fornecedor')
        .maybeSingle();
      if (vivo) setCtx({ usuarioId: auth.user.id, atividade: perfil?.categoria ?? '', temPerfil: Boolean(perfil) });
    })();
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <div data-fable="portal" className="fi-eda">
      <header className="fi-capa" style={{ backgroundImage: "url('/images/fornecedor/serra-araca-hero.webp')", minHeight: 260 }}>
        <div className="fi-capa-veu" />
        <div className="fi-capa-txt">
          <p className="fi-eb">Encantos da Amazônia · Minha vitrine</p>
          <h1 className="fi-letreiro">Feito na Amazônia</h1>
          <p className="fi-sub">Cada peça publicada aqui aparece no Portal Público, com o seu WhatsApp para contato direto.</p>
        </div>
      </header>

      {!ctx && <p className="mt-6 text-sm text-[#B4C8BB]" role="status">Carregando sua vitrine…</p>}

      {ctx && !ctx.temPerfil && (
        <section className="fi-eda-guia">
          <span className="fi-eda-selo" aria-hidden="true">EDA</span>
          <p className="fi-eda-fala">
            Antes de publicar, complete seu perfil com nome, cidade, atividade e WhatsApp.{' '}
            <Link href="/fornecedor/perfil" className="font-semibold text-[#F4C77E]">Completar perfil →</Link>
          </p>
        </section>
      )}

      {ctx?.temPerfil && <VitrineFornecedorEDA usuarioId={ctx.usuarioId} atividade={ctx.atividade} />}
    </div>
  );
}

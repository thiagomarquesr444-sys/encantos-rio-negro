'use client';

// EDA_PERFIL_PUBLICO_V1: força do perfil público — o que o visitante encontra
// e o que falta para o perfil vender (inclui dados reais da operação).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { hojeManausEDA } from '@/lib/saidasGestaoEDA';

type Dados = {
  logo_url?: string | null; capa_url?: string | null; descricao_curta?: string | null; descricao_completa?: string | null;
  whatsapp?: string | null; instagram?: string | null; site?: string | null; publicado?: boolean;
};

export default function ForcaPerfilEDA({ dados, idiomas, especialidades }: { dados: Dados; idiomas: string; especialidades: string }) {
  const [op, setOp] = useState<{ passeios: number; comFoto: number; saidas: number; publicacoes: number } | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const [p, s, pub] = await Promise.all([
        supabase.from('passeios').select('id,fotos').eq('publicado_portal', true),
        supabase.from('passeio_saidas').select('id', { count: 'exact', head: true }).eq('status', 'aberta').gte('data_inicio', hojeManausEDA()),
        supabase.from('publicacoes').select('id', { count: 'exact', head: true }).eq('status', 'publicado'),
      ]);
      if (!vivo) return;
      const lista = (p.data ?? []) as { fotos: string[] | null }[];
      setOp({ passeios: lista.length, comFoto: lista.filter((x) => (x.fotos ?? []).length > 0).length, saidas: s.count ?? 0, publicacoes: pub.count ?? 0 });
    })().catch(() => { if (vivo) setOp({ passeios: 0, comFoto: 0, saidas: 0, publicacoes: 0 }); });
    return () => { vivo = false; };
  }, []);

  const n = (t: string) => t.split(',').map((x) => x.trim()).filter(Boolean).length;
  const itens: { ok: boolean; texto: string; href?: string }[] = [
    { ok: Boolean(dados.publicado), texto: 'Perfil publicado no portal' },
    { ok: Boolean(dados.logo_url), texto: 'Logo enviado' },
    { ok: Boolean(dados.capa_url), texto: 'Imagem de capa' },
    { ok: (dados.descricao_curta ?? '').trim().length >= 60, texto: 'Apresentação curta (60+ caracteres)' },
    { ok: (dados.descricao_completa ?? '').trim().length >= 300, texto: 'História completa (300+ caracteres)' },
    { ok: Boolean(dados.whatsapp), texto: 'WhatsApp para o visitante chamar' },
    { ok: Boolean(dados.instagram || dados.site), texto: 'Instagram ou site' },
    { ok: n(idiomas) >= 2, texto: 'Pelo menos 2 idiomas de atendimento' },
    { ok: n(especialidades) >= 2, texto: 'Pelo menos 2 especialidades' },
    { ok: (op?.passeios ?? 0) > 0, texto: `Passeios publicados no portal (${op?.passeios ?? '…'})`, href: '/passeios' },
    { ok: op ? op.passeios > 0 && op.comFoto === op.passeios : false, texto: 'Todos os passeios publicados com foto', href: '/passeios' },
    { ok: (op?.saidas ?? 0) > 0, texto: `Saídas futuras abertas (${op?.saidas ?? '…'}) — o visitante vê datas e vagas`, href: '/passeios' },
    { ok: (op?.publicacoes ?? 0) > 0, texto: `Publicações na Rede (${op?.publicacoes ?? '…'})`, href: '/configuracoes/publicacoes' },
  ];
  const feitos = itens.filter((i) => i.ok).length;
  const pct = Math.round((feitos / itens.length) * 100);
  const nivel = pct >= 85 ? 'Perfil forte' : pct >= 60 ? 'Bom caminho' : 'Precisa de atenção';

  return (
    <section className="fp">
      <div className="fp-topo">
        <div>
          <p className="fp-eb">Força do perfil</p>
          <h2>{nivel}</h2>
        </div>
        <b className="fp-pct">{pct}%</b>
      </div>
      <i className="fp-barra" aria-hidden="true"><b style={{ width: `${pct}%` }} /></i>
      <ul>
        {itens.map((i) => (
          <li key={i.texto} data-ok={i.ok || undefined}>
            <span aria-hidden="true">{i.ok ? '✓' : '○'}</span>
            {i.href && !i.ok ? <Link href={i.href}>{i.texto}</Link> : i.texto}
          </li>
        ))}
      </ul>
      <style jsx>{`
        .fp { border-radius: 16px; border: 1px solid var(--ern-borda); background: var(--ern-painel); padding: 20px; display: grid; gap: 10px; }
        .fp-topo { display: flex; justify-content: space-between; align-items: flex-end; }
        .fp-eb { margin: 0; font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--ern-destaque); }
        h2 { margin: 4px 0 0; font-size: 18px; }
        .fp-pct { font-size: 28px; color: var(--ern-destaque); }
        .fp-barra { display: block; height: 6px; border-radius: 6px; background: var(--ern-borda); overflow: hidden; }
        .fp-barra b { display: block; height: 100%; background: var(--ern-destaque); }
        ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; font-size: 13px; }
        li { display: flex; gap: 8px; color: var(--ern-secundario); }
        li[data-ok] { color: var(--ern-texto); }
        li span { width: 16px; color: var(--ern-secundario); } li[data-ok] span { color: #4ade80; }
        li :global(a) { color: var(--ern-destaque); text-decoration: underline; }
      `}</style>
    </section>
  );
}

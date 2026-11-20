'use client';

// EDA_GUIA_PRATICO_V1: a operadora liga a conta do guia ou do prático (Rede EDA) ao seu cadastro
// pelo código EDA-XXXXXX que o profissional vê no espaço dele. Com o vínculo, ele recebe as viagens
// em que for escalado e manda a localização/etapas pelo painel de bordo.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Alvo = 'guia' | 'embarcacao';

export default function VinculoContaEDA({ alvo, id }: { alvo: Alvo; id: string }) {
  const [vinculo, setVinculo] = useState<{ nome: string; atuacao: string | null } | null | undefined>(undefined);
  const [codigo, setCodigo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'er'; texto: string } | null>(null);

  useEffect(() => {
    let vivo = true;
    supabase.rpc('contas_vinculadas_eda').then(({ data }) => {
      if (!vivo) return;
      const v = ((data ?? []) as { alvo: Alvo; id: string; nome: string; atuacao: string | null }[]).find((x) => x.alvo === alvo && x.id === id);
      setVinculo(v ? { nome: v.nome, atuacao: v.atuacao } : null);
    });
    return () => { vivo = false; };
  }, [alvo, id]);

  async function enviar(cod: string | null) {
    setOcupado(true); setAviso(null);
    const { data, error } = await supabase.rpc('vincular_conta_profissional_eda', { p_alvo: alvo, p_id: id, p_codigo: cod });
    setOcupado(false);
    if (error) {
      setAviso({ tom: 'er', texto: error.message.includes('EDA_CODIGO_INVALIDO') ? 'Código não encontrado. Confira com o profissional (formato EDA-XXXXXX).' : 'Não foi possível salvar o vínculo. Só administrador ou operador da empresa pode vincular.' });
      return;
    }
    const r = data as { nome: string | null; atuacao: string | null } | null;
    if (cod && r?.nome) { setVinculo({ nome: r.nome, atuacao: r.atuacao }); setCodigo(''); setAviso({ tom: 'ok', texto: `Conta de ${r.nome} vinculada. As viagens aparecem no espaço dele.` }); }
    else { setVinculo(null); setAviso({ tom: 'ok', texto: 'Vínculo removido.' }); }
  }

  const papel = alvo === 'embarcacao' ? 'prático' : 'guia';
  return (
    <section className="vc">
      <p className="vc-eb">{alvo === 'embarcacao' ? 'Prático com conta na EDA' : 'Conta do guia na EDA'}</p>
      {vinculo === undefined ? <p className="vc-txt">Carregando…</p> : vinculo ? (
        <div className="vc-linha">
          <p className="vc-txt"><b>{vinculo.nome}</b>{vinculo.atuacao ? ` · ${vinculo.atuacao}` : ''}<br />
            Recebe as viagens {alvo === 'embarcacao' ? 'desta embarcação' : 'em que for escalado'} e manda a localização e as etapas pelo painel de bordo.</p>
          <button type="button" className="vc-bt eda-botao" disabled={ocupado} onClick={() => void enviar(null)}>Remover vínculo</button>
        </div>
      ) : (
        <>
          <p className="vc-txt">Peça ao {papel} o <b>código EDA</b> que aparece no espaço dele (acesso “Guia / Prático”). Com o vínculo, ele recebe as viagens e manda a localização {alvo === 'embarcacao' ? 'do barco' : 'do barco ou do bote'}.</p>
          <form className="vc-linha" onSubmit={(e) => { e.preventDefault(); if (codigo.trim()) void enviar(codigo); }}>
            <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="EDA-XXXXXX" maxLength={12} aria-label={`Código EDA do ${papel}`} autoComplete="off" />
            <button type="submit" className="vc-bt eda-botao" disabled={ocupado || codigo.trim().length < 6}>{ocupado ? 'Vinculando…' : 'Vincular'}</button>
          </form>
        </>
      )}
      {aviso && <p role="status" className={`vc-aviso vc-${aviso.tom}`}>{aviso.texto}</p>}
      <style jsx>{`
        .vc { margin-top: 14px; display: grid; gap: 8px; padding: 14px 16px; border-radius: 18px; border: 1px solid color-mix(in srgb, var(--ern-destaque, #e3a144) 40%, transparent); background: var(--ern-suave); }
        .vc-eb { margin: 0; font-size: 9px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--ern-destaque, #e3a144); }
        .vc-txt { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--ern-secundario); } .vc-txt b { color: var(--ern-texto); }
        .vc-linha { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between; }
        .vc-linha input { flex: 1 1 160px; min-height: 42px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--ern-borda); background: var(--ern-fundo); color: var(--ern-texto); font-size: 15px; letter-spacing: .1em; }
        .vc-bt { min-height: 42px; padding: 0 16px; border-radius: 999px; border: 1px solid var(--ern-borda); background: transparent; color: var(--ern-texto); font-size: 13px; font-weight: 600; cursor: pointer; }
        .vc-bt:disabled { opacity: .5; cursor: default; }
        .vc-aviso { margin: 0; font-size: 12.5px; font-weight: 600; } .vc-ok { color: #5cc49a; } .vc-er { color: #ef6b6b; }
      `}</style>
    </section>
  );
}

'use client';

// ERN_TEMA_NOITE_CLARO_V1
// Atalho de tema no menu lateral: Noite e Claro (EDA_TEMAS_V3).
// Salva em configuracoes.tema da empresa, como antes. As demais cores
// continuam disponíveis em Configurações para quem já as usa.

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { TemaERN } from '@/app/components/SeletorTemaERN';

type Vinculo = { id: string; empresaId: string; tema: string };

const NOITE: TemaERN = 'verde';
const CLARO: TemaERN = 'branco';

export default function TemaRapidoOperadoraERN() {
  const pathname = usePathname();
  const [vinculo, setVinculo] = useState<Vinculo | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const trava = useRef(false);

  useEffect(() => {
    let ativo = true;
    setMensagem('');

    async function carregar() {
      try {
        const { data: auth, error: erroAuth } = await supabase.auth.getUser();
        if (erroAuth || !auth.user) return;

        const { data: perfil, error: erroPerfil } = await supabase
          .from('perfis')
          .select('empresa_id,role')
          .eq('id', auth.user.id)
          .single();

        if (erroPerfil || !perfil?.empresa_id ||
          !['admin_empresa', 'admin_plataforma'].includes(perfil.role)) return;

        const { data: config, error } = await supabase
          .from('configuracoes')
          .select('id,tema')
          .eq('empresa_id', perfil.empresa_id)
          .maybeSingle();

        if (error || !config || !ativo) return;
        setVinculo({ id: config.id, empresaId: perfil.empresa_id, tema: String(config.tema ?? NOITE) });
      } catch {
        // O atalho é opcional; Configurações mantém o fluxo principal.
      }
    }

    void carregar();
    // EDA_TEMAS_V3: acompanha a troca feita em Configurações.
    function aoSalvarTema(e: Event) {
      const tema = (e as CustomEvent<{ tema?: string }>).detail?.tema;
      if (tema === NOITE || tema === CLARO) setVinculo(v => (v ? { ...v, tema } : v));
    }
    window.addEventListener('ern:tema-salvo', aoSalvarTema);
    return () => { ativo = false; window.removeEventListener('ern:tema-salvo', aoSalvarTema); };
  }, [pathname]);

  async function salvar(tema: TemaERN) {
    if (!vinculo || trava.current || tema === (vinculo.tema === CLARO ? CLARO : NOITE)) return;
    trava.current = true;
    setSalvando(true);
    setMensagem('');

    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .update({ tema, updated_at: new Date().toISOString() })
        .eq('id', vinculo.id)
        .eq('empresa_id', vinculo.empresaId)
        .select('id,tema')
        .single();

      if (error || !data || data.tema !== tema) throw new Error('tema');

      setVinculo({ ...vinculo, tema });
      window.dispatchEvent(new CustomEvent('ern:tema-salvo', {
        detail: { empresaId: vinculo.empresaId, tema },
      }));
    } catch {
      setMensagem('Não foi possível salvar o tema.');
    } finally {
      trava.current = false;
      setSalvando(false);
    }
  }

  if (!vinculo) return null;
  const atual: TemaERN = vinculo.tema === CLARO ? CLARO : NOITE;

  return (
    <div className="ern-tema-lateral">
      <div role="group" aria-label="Tema do painel" className="flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
        {([[NOITE, 'Noite', atual === NOITE], [CLARO, 'Claro', atual === CLARO]] as const).map(([valor, rotulo, ativo]) => (
          <button
            key={valor}
            type="button"
            aria-pressed={ativo}
            disabled={salvando}
            onClick={() => void salvar(valor)}
            className={`min-h-9 flex-1 rounded-full text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E3A144] disabled:cursor-wait ${ativo ? 'bg-gradient-to-b from-[#F7D595] to-[#E3A144] text-[#07110E]' : 'text-[#CDD8D2] hover:text-white'}`}
          >
            {rotulo}
          </button>
        ))}
      </div>
      {(mensagem || salvando) && <p role="status" className="mt-1 px-2 text-[11px] text-[#F4C77E]">{salvando ? 'Salvando tema…' : mensagem}</p>}
    </div>
  );
}

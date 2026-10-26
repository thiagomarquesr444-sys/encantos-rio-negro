'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import SeletorTemaERN, {
  OPCOES_TEMA_ERN,
  type TemaERN,
} from '@/app/components/SeletorTemaERN';

type Vinculo = { id: string; empresaId: string; tema: TemaERN };

export default function TemaRapidoOperadoraERN() {
  const pathname = usePathname();
  const [vinculo, setVinculo] = useState<Vinculo | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const trava = useRef(false);

  useEffect(() => {
    let ativo = true;
    setVinculo(null);
    setMensagem('');

    if (pathname === '/configuracoes') return;

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

        const tema = OPCOES_TEMA_ERN.find(item => item.valor === config.tema)?.valor
          ?? 'verde';

        setVinculo({ id: config.id, empresaId: perfil.empresa_id, tema });
      } catch {
        // O atalho é opcional; Configurações mantém o fluxo principal.
      }
    }

    void carregar();
    return () => { ativo = false; };
  }, [pathname]);

  async function salvar(tema: TemaERN) {
    if (!vinculo || trava.current || tema === vinculo.tema) return;
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

      if (error || !data || data.tema !== tema) {
        throw new Error('Não foi possível salvar o tema. Tente novamente.');
      }

      setVinculo({ ...vinculo, tema });
      window.dispatchEvent(new CustomEvent('ern:tema-salvo', {
        detail: { empresaId: vinculo.empresaId, tema },
      }));
      setMensagem('Tema salvo.');
    } catch {
      setMensagem('Não foi possível salvar o tema. Confira em Configurações.');
    } finally {
      trava.current = false;
      setSalvando(false);
    }
  }

  if (!vinculo || pathname === '/configuracoes') return null;

  return (
    <div className="ern-tema-rapido">
      {(mensagem || salvando) && (
        <p className="ern-tema-rapido-status" role="status">
          {salvando ? 'Salvando tema…' : mensagem}
        </p>
      )}
      <SeletorTemaERN valor={vinculo.tema}
        onEscolher={salvar} bloqueado={salvando} />
    </div>
  );
}
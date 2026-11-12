'use client';

// EDA_AO_VIVO_V1: uma única conexão por aba escuta os sinais da empresa e avisa as telas.
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { EVENTO_AO_VIVO_EDA } from '@/lib/aoVivoEDA';

export default function AoVivoEDA() {
  useEffect(() => {
    let ativo = true;
    let canal: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!ativo || !auth.user || auth.user.is_anonymous) return;
      const { data: perfil } = await supabase.from('perfis').select('empresa_id').eq('id', auth.user.id).maybeSingle();
      const empresa = perfil?.empresa_id as string | undefined;
      if (!ativo || !empresa) return;
      const { data: sessao } = await supabase.auth.getSession();
      if (sessao.session?.access_token) supabase.realtime.setAuth(sessao.session.access_token);

      canal = supabase
        .channel(`eda-sinais-${empresa}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'eda_sinais', filter: `empresa_id=eq.${empresa}` }, (msg) => {
          const linha = (msg.new ?? msg.old) as { tabela?: string } | null;
          if (linha?.tabela) window.dispatchEvent(new CustomEvent(EVENTO_AO_VIVO_EDA, { detail: { tabela: linha.tabela } }));
        })
        .subscribe();
    })().catch(() => undefined);

    return () => {
      ativo = false;
      if (canal) void supabase.removeChannel(canal);
    };
  }, []);

  return null;
}

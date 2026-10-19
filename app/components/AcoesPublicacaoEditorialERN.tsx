'use client';

import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { confirmarERN } from '@/lib/confirmarERN';
import {
  carregarPerfilPublicoEditorialERN,
  type ContextoPerfilPublicoERN,
} from '@/lib/perfilPublicoEditorialERN';
import {
  erroPublicacaoERN,
  type PublicacaoEditorialERN,
} from '@/lib/publicacoesEditorialERN';

type Acao = 'publicar' | 'arquivar' | 'rascunho';

type Props = {
  contexto: ContextoPerfilPublicoERN;
  item: PublicacaoEditorialERN;
  bloqueado: boolean;
  onOcupado: (valor: boolean) => void;
  onAtualizar: () => void;
};

export default function AcoesPublicacaoEditorialERN({
  contexto,
  item,
  bloqueado,
  onOcupado,
  onAtualizar,
}: Props) {
  const [erro, setErro] = useState('');
  const [executando, setExecutando] = useState(false);
  const trava = useRef(false);

  async function executar(acao: Acao) {
    if (trava.current || bloqueado) return;

    trava.current = true;
    setExecutando(true);
    onOcupado(true);
    setErro('');

    try {
      const mensagens: Record<Acao, string> = {
        publicar:
          `Publicar "${item.titulo}" na Rede ERN? ` +
          'O texto e as imagens ficarão visíveis aos visitantes.',
        arquivar:
          `Arquivar "${item.titulo}"? ` +
          'A publicação sairá do feed. O conteúdo será preservado.',
        rascunho:
          `Voltar "${item.titulo}" para rascunho? ` +
          'Ela ficará fora do feed enquanto você edita.',
      };

      const confirmou = await confirmarERN(mensagens[acao], {
        titulo: 'Visibilidade da publicação',
        confirmar: acao === 'publicar'
          ? 'Publicar agora'
          : acao === 'arquivar'
            ? 'Arquivar'
            : 'Voltar para rascunho',
        destrutiva: false,
      });

      if (!confirmou) return;

      const perfil = await carregarPerfilPublicoEditorialERN(contexto);

      if (!perfil || perfil.id !== item.autor_perfil_id) {
        throw new Error('A conta ou o perfil mudou. Atualize a página.');
      }

      const { data, error } = await supabase.rpc(
        'alterar_status_publicacao_ern',
        {
          publicacao_id: item.id,
          acao,
          versao_esperada: item.updated_at,
        },
      );

      if (error) {
        throw new Error(
          error.code === '42501'
            ? 'Sua conta não pode alterar esta publicação.'
            : error.code === 'P0001'
              ? error.message
              : 'Não foi possível confirmar a alteração. Atualize a listagem antes de repetir.',
        );
      }

      if (data !== item.id) {
        throw new Error(
          'Resposta não confirmada. Atualize a listagem antes de repetir.',
        );
      }

      onAtualizar();
    } catch (falha) {
      setErro(erroPublicacaoERN(falha));
    } finally {
      trava.current = false;
      setExecutando(false);
      onOcupado(false);
    }
  }

  if (!['rascunho', 'publicado', 'arquivado'].includes(item.status)) {
    return null;
  }

  const classe =
    'min-h-11 rounded-xl border border-[var(--ern-borda)] px-4 text-sm font-semibold disabled:opacity-50';

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {item.status === 'rascunho' && (
          <button
            type="button"
            disabled={bloqueado || executando}
            onClick={() => void executar('publicar')}
            className="min-h-11 rounded-xl bg-[var(--ern-botao)] px-4 text-sm font-semibold text-[var(--ern-sobre-botao)] disabled:opacity-50"
          >
            Publicar na Rede
          </button>
        )}

        {item.status !== 'rascunho' && (
          <button
            type="button"
            disabled={bloqueado || executando}
            onClick={() => void executar('rascunho')}
            className={classe}
          >
            Voltar para rascunho
          </button>
        )}

        {item.status !== 'arquivado' && (
          <button
            type="button"
            disabled={bloqueado || executando}
            onClick={() => void executar('arquivar')}
            className={classe}
          >
            Arquivar
          </button>
        )}
      </div>

      {executando && (
        <p role="status" className="mt-2 text-xs">Aguarde a confirmação…</p>
      )}
      {erro && (
        <p role="alert" className="mt-2 text-sm">{erro}</p>
      )}
    </div>
  );
}
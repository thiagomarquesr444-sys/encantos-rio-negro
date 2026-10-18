'use client';

import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  carregarPerfilPublicoOperadoraERN,
  type ContextoPerfilPublicoERN,
} from '@/lib/perfilPublicoOperadoraERN';
import {
  listarMidiasPublicacaoERN,
  type MidiaPublicacaoERN,
} from '@/lib/midiasPublicacaoERN';
import { erroPublicacaoERN } from '@/lib/publicacoesOperadoraERN';

type Props = {
  contexto: ContextoPerfilPublicoERN;
  publicacaoId: string;
  bloqueado: boolean;
};

type Previa = {
  operadora: string;
  titulo: string;
  resumo: string | null;
  conteudo: string | null;
  localidade: string | null;
  midias: MidiaPublicacaoERN[];
};

export default function PreviaPublicacaoERN({
  contexto,
  publicacaoId,
  bloqueado,
}: Props) {
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const trava = useRef(false);

  async function abrir() {
    if (trava.current || bloqueado) return;

    trava.current = true;
    setCarregando(true);
    setErro('');
    setPrevia(null);

    try {
      const perfil = await carregarPerfilPublicoOperadoraERN(contexto);
      if (!perfil) throw new Error('Perfil da operadora não encontrado.');

      const [consulta, midias] = await Promise.all([
        supabase
          .from('publicacoes')
          .select('titulo,resumo,conteudo,localidade_texto')
          .eq('id', publicacaoId)
          .eq('autor_perfil_id', perfil.id)
          .single(),
        listarMidiasPublicacaoERN(contexto, publicacaoId),
      ]);

      if (consulta.error) throw consulta.error;
      if (!consulta.data) throw new Error('Publicação não encontrada.');

      await carregarPerfilPublicoOperadoraERN(contexto);

      setPrevia({
        operadora: perfil.nome_publico,
        titulo: consulta.data.titulo,
        resumo: consulta.data.resumo,
        conteudo: consulta.data.conteudo,
        localidade: consulta.data.localidade_texto,
        midias,
      });
    } catch (falha) {
      setErro(erroPublicacaoERN(falha));
    } finally {
      trava.current = false;
      setCarregando(false);
    }
  }

  return (
    <section
      aria-label="Prévia do conteúdo salvo"
      className="mt-8 border-t border-[var(--ern-borda)] pt-6"
    >
      <h3 className="text-xl font-semibold">Revise antes de publicar</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--ern-secundario)]">
        A prévia reúne o texto e as imagens já salvos.
        Abrir esta prévia não publica o conteúdo.
      </p>

      <button
        type="button"
        disabled={bloqueado || carregando}
        onClick={() => void abrir()}
        className="mt-4 min-h-12 rounded-xl border border-[var(--ern-borda)] px-5 text-sm font-semibold disabled:opacity-50"
      >
        {carregando ? 'Carregando prévia…' : 'Abrir / atualizar prévia'}
      </button>

      {erro && <p role="alert" className="mt-4 text-sm">{erro}</p>}

      {previa && (
        <article className="mt-6 overflow-hidden rounded-2xl bg-[#FAF9F5] text-[#18352C]">
          <header className="px-5 py-5">
            <p className="text-sm font-semibold">{previa.operadora}</p>
            {previa.localidade && (
              <p className="mt-1 text-xs">{previa.localidade}</p>
            )}
            <p className="mt-3 text-xs font-semibold uppercase tracking-widest">
              Prévia privada · conteúdo salvo
            </p>
          </header>

          {previa.midias.map(midia => (
            <figure key={midia.id} className="mb-4">
              {midia.tipo === 'imagem' && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={midia.url}
                  alt={midia.alt_text || 'Imagem da experiência'}
                  loading="lazy"
                  className="max-h-[65dvh] w-full object-contain"
                />
              )}
              {midia.credito && (
                <figcaption className="px-5 pt-2 text-xs">
                  Foto: {midia.credito}
                </figcaption>
              )}
            </figure>
          ))}

          <div className="space-y-4 px-5 pb-6">
            <h4
              className="break-words text-2xl sm:text-3xl"
              style={{ fontFamily: 'var(--font-fraunces), serif' }}
            >
              {previa.titulo}
            </h4>
            {previa.resumo && (
              <p className="whitespace-pre-wrap break-words text-base leading-7">
                {previa.resumo}
              </p>
            )}
            {previa.conteudo && (
              <p className="whitespace-pre-wrap break-words text-sm leading-7">
                {previa.conteudo}
              </p>
            )}
          </div>
        </article>
      )}
    </section>
  );
}
'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ContextoPerfilPublicoERN } from '@/lib/perfilPublicoEditorialERN';
import {
  enviarImagemPublicacaoERN,
  listarMidiasPublicacaoEditorialERN,
  type MidiaPublicacaoERN,
} from '@/lib/midiasPublicacaoEditorialERN';
import { erroPublicacaoERN } from '@/lib/publicacoesEditorialERN';

type Props = {
  contexto: ContextoPerfilPublicoERN;
  publicacaoId: string;
  bloqueado: boolean;
  onOcupado: (valor: boolean) => void;
};

const campo =
  'mt-2 min-h-12 w-full min-w-0 rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-3 py-3 text-base text-[var(--ern-texto)] disabled:opacity-50';

export default function MidiasPublicacaoEditorialERN({
  contexto,
  publicacaoId,
  bloqueado,
  onOcupado,
}: Props) {
  const [midias, setMidias] = useState<MidiaPublicacaoERN[]>([]);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [descricao, setDescricao] = useState('');
  const [credito, setCredito] = useState('');
  const [consentimento, setConsentimento] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [tentativa, setTentativa] = useState(0);

  const trava = useRef(false);
  const montado = useRef(false);
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    montado.current = true;
    return () => { montado.current = false; };
  }, []);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErro('');

      try {
        const lista = await listarMidiasPublicacaoEditorialERN(contexto, publicacaoId);
        if (ativo) setMidias(lista);
      } catch (falha) {
        if (ativo) setErro(erroPublicacaoERN(falha));
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();
    return () => { ativo = false; };
  }, [contexto, publicacaoId, tentativa]);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trava.current || bloqueado || carregando) return;

    if (!arquivo) {
      setErro('Selecione uma imagem.');
      return;
    }

    trava.current = true;
    setEnviando(true);
    onOcupado(true);
    setErro('');
    setAviso('');

    try {
      await enviarImagemPublicacaoERN(
        contexto,
        publicacaoId,
        arquivo,
        descricao,
        credito,
        consentimento,
      );

      if (!montado.current) return;

      setArquivo(null);
      setDescricao('');
      setCredito('');
      setConsentimento(false);
      if (entrada.current) entrada.current.value = '';
      setAviso('Imagem adicionada ao rascunho.');
    } catch (falha) {
      if (montado.current) setErro(erroPublicacaoERN(falha));
    } finally {
      trava.current = false;

      if (montado.current) {
        setEnviando(false);
        onOcupado(false);
        setTentativa(atual => atual + 1);
      }
    }
  }

  return (
    <section
      aria-label="Imagens do rascunho"
      className="mt-8 border-t border-[var(--ern-borda)] pt-6"
    >
      <h3 className="text-xl font-semibold">Imagens da publicação</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--ern-secundario)]">
        Use fotos destinadas à divulgação. Os arquivos possuem endereço
        público desde o envio, mesmo enquanto a publicação está em rascunho.
      </p>

      {erro && <p role="alert" className="mt-4 text-sm">{erro}</p>}
      {aviso && <p role="status" className="mt-4 text-sm">{aviso}</p>}

      {carregando ? (
        <p role="status" className="mt-4 text-sm">Carregando galeria…</p>
      ) : (
        <>
          <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
            {midias.map(midia => (
              <figure key={midia.id} className="min-w-0">
                {midia.tipo === 'imagem' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={midia.url}
                    alt={midia.alt_text || 'Imagem da publicação'}
                    loading="lazy"
                    className="aspect-[4/3] w-full rounded-xl bg-[var(--ern-painel)] object-contain"
                  />
                ) : (
                  <p className="text-sm">Vídeo já vinculado à publicação.</p>
                )}
                <figcaption className="mt-2 break-words text-xs leading-5 text-[var(--ern-secundario)]">
                  {midia.alt_text}
                  {midia.credito && <span className="block">Foto: {midia.credito}</span>}
                </figcaption>
              </figure>
            ))}
          </div>
          {!midias.length && (
            <p className="mt-4 text-sm text-[var(--ern-secundario)]">
              Este rascunho ainda não possui imagens.
            </p>
          )}
        </>
      )}

      <button
        type="button"
        disabled={enviando || carregando || bloqueado}
        onClick={() => setTentativa(atual => atual + 1)}
        className="mt-4 min-h-11 rounded-xl border border-[var(--ern-borda)] px-4 text-sm disabled:opacity-50"
      >
        Atualizar galeria
      </button>

      <form onSubmit={enviar} className="mt-5">
        <fieldset
          disabled={bloqueado || enviando || carregando}
          className="min-w-0 space-y-4"
        >
          <legend className="sr-only">Adicionar imagem</legend>

          <label className="block text-sm">
            Foto · JPEG, PNG ou WebP · até 5 MB
            <input
              ref={entrada}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              onChange={e => setArquivo(e.target.files?.[0] ?? null)}
              className={campo}
            />
          </label>

          <label className="block text-sm">
            Descrição da imagem
            <input
              required
              maxLength={500}
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Ex.: Embarcação no Rio Negro ao pôr do sol"
              className={campo}
            />
          </label>

          <label className="block text-sm">
            Créditos da fotografia
            <input
              maxLength={300}
              value={credito}
              onChange={e => setCredito(e.target.value)}
              className={campo}
            />
          </label>

          <label className="flex min-h-12 items-start gap-3 text-sm leading-6">
            <input
              type="checkbox"
              required
              checked={consentimento}
              onChange={e => setConsentimento(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0"
            />
            Possuo autorização para divulgar esta imagem e as pessoas
            identificáveis nela.
          </label>

          <button
            type="submit"
            className="min-h-12 rounded-xl bg-[var(--ern-botao)] px-5 text-sm font-semibold text-[var(--ern-sobre-botao)] disabled:opacity-50"
          >
            {enviando ? 'Enviando imagem…' : 'Adicionar imagem'}
          </button>
        </fieldset>
      </form>
    </section>
  );
}
'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { supabase } from '@/lib/supabase';
import LogoERN from '@/app/components/LogoERN';

const PERFIL = '6d2be2c2-31f7-4f5a-b62b-db262177bdd3';

type Resultado = {
  logo_url: string | null;
  capa_url: string | null;
  updated_at: string;
};

type Props = Resultado & {
  usuarioId: string;
  bloqueado: boolean;
  onOcupado: (ocupado: boolean) => void;
  onAtualizado: (dados: Resultado) => void;
};

async function conferirAcesso(usuarioEsperado: string) {
  const { data, error } = await supabase.auth.getUser();

  if (
    error ||
    !data.user ||
    data.user.is_anonymous ||
    data.user.id !== usuarioEsperado
  ) {
    throw new Error('A conta mudou. Recarregue a página antes de continuar.');
  }

  const { data: permitido, error: falha } =
    await supabase.rpc('tem_acesso_editorial_ern');

  if (falha || permitido !== true) {
    throw new Error('Não foi possível confirmar sua autorização editorial.');
  }
}

export default function ImagensEditorialERN({
  logo_url,
  capa_url,
  updated_at,
  usuarioId,
  bloqueado,
  onOcupado,
  onAtualizado,
}: Props) {
  const trava = useRef(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  async function enviar(
    event: ChangeEvent<HTMLInputElement>,
    finalidade: 'logo' | 'capa',
  ) {
    const arquivo = event.currentTarget.files?.[0];
    event.currentTarget.value = '';

    if (!arquivo || trava.current || bloqueado) return;

    trava.current = true;
    setEnviando(true);
    onOcupado(true);
    setErro('');
    setAviso('');

    let uploadConcluido = false;

    try {
      const formatos: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
      };

      const extensao = formatos[arquivo.type];

      if (!extensao || arquivo.size === 0 || arquivo.size > 5 * 1024 * 1024) {
        throw new Error('Escolha uma imagem JPEG, PNG ou WebP de até 5 MB.');
      }

      await conferirAcesso(usuarioId);

      const caminho =
        `editorial/${PERFIL}/${finalidade}-${crypto.randomUUID()}.${extensao}`;

      const { error: erroUpload } = await supabase.storage
        .from('rede-publica')
        .upload(caminho, arquivo, {
          upsert: false,
          contentType: arquivo.type,
          cacheControl: '3600',
        });

      if (erroUpload) throw erroUpload;

      uploadConcluido = true;
      await conferirAcesso(usuarioId);

      const { data: endereco } = supabase.storage
        .from('rede-publica')
        .getPublicUrl(caminho);

      const alteracao = finalidade === 'logo'
        ? { logo_url: endereco.publicUrl }
        : { capa_url: endereco.publicUrl };

      const { data, error: erroGravacao } = await supabase
        .from('perfis_publicos')
        .update(alteracao)
        .eq('id', PERFIL)
        .eq('origem_tipo', 'editorial')
        .eq('categoria', 'ern_editorial')
        .eq('updated_at', updated_at)
        .select('logo_url,capa_url,updated_at')
        .maybeSingle();

      if (erroGravacao) throw erroGravacao;

      if (!data) {
        throw new Error('O perfil mudou em outra sessão. Recarregue a página.');
      }

      await conferirAcesso(usuarioId);
      onAtualizado(data as Resultado);
      setAviso(
        finalidade === 'logo'
          ? 'Logo salva no perfil editorial.'
          : 'Capa salva no perfil editorial.',
      );
    } catch (falha) {
      const mensagem = falha instanceof Error
        ? falha.message
        : 'Não foi possível concluir o envio.';

      setErro(
        uploadConcluido
          ? `${mensagem} O arquivo foi enviado, mas a atualização do perfil não foi confirmada. Recarregue antes de repetir.`
          : mensagem,
      );
    } finally {
      trava.current = false;
      setEnviando(false);
      onOcupado(false);
    }
  }

  return (
    <section
      aria-labelledby="imagens-editorial"
      className="mt-8 border-t border-[#cdba7a] pt-6"
    >
      <h2 id="imagens-editorial" className="text-xl font-semibold">
        Identidade visual
      </h2>

      <p className="mt-2 text-sm leading-6 text-[#695727]">
        As imagens são salvas assim que o envio termina.
        Use arquivos JPEG, PNG ou WebP de até 5 MB.
      </p>

      {bloqueado && !enviando && (
        <p className="mt-3 text-sm text-[#805600]">
          Salve as alterações do formulário antes de enviar imagens.
        </p>
      )}

      {erro && (
        <p role="alert" className="mt-4 text-sm text-red-800">{erro}</p>
      )}

      {aviso && (
        <p role="status" className="mt-4 text-sm text-green-800">{aviso}</p>
      )}

      {enviando && (
        <p role="status" className="mt-4 text-sm">Enviando e salvando imagem…</p>
      )}

      <div className="mt-5 grid gap-6 sm:grid-cols-[180px_minmax(0,1fr)]">
        {(['logo', 'capa'] as const).map(finalidade => {
          const url = finalidade === 'logo' ? logo_url : capa_url;

          return (
            <div key={finalidade} className="min-w-0">
              <div
                className={
                  finalidade === 'logo'
                    ? 'flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border border-[#cdba7a] bg-[#fffcf0]'
                    : 'flex aspect-[16/7] items-center justify-center overflow-hidden rounded-xl border border-[#cdba7a] bg-[#fffcf0]'
                }
              >
                {finalidade === 'logo' ? (
                  <LogoERN tamanho={160} />
                ) : url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt={'Capa editorial da ERN'}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="px-4 text-center text-sm text-[#695727]">
                    {'Sem capa'}
                  </span>
                )}
              </div>

              {finalidade === 'capa' ? (
              <label className="mt-4 block text-sm font-semibold">
                {'Escolher capa'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={bloqueado || enviando}
                  onChange={event => void enviar(event, finalidade)}
                  className="mt-2 block min-h-12 w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-[#805600] file:px-3 file:py-3 file:text-white disabled:opacity-50"
                />
              </label>
              ) : (
                <p className="mt-4 text-sm leading-6 text-[#695727]">
                  Logo oficial 3D
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
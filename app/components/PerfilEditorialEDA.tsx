'use client';

import '@/app/components/padrao-paginas-eda.css';
import '@/app/components/padrao-formularios-eda.css';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import ImagensEditorialERN from '@/app/components/ImagensEditorialERN';
import { supabase } from '@/lib/supabase';
import { normalizarWhatsAppERN } from '@/lib/perfilPublicoOperadoraERN';

const PERFIL_EDITORIAL = '6d2be2c2-31f7-4f5a-b62b-db262177bdd3';

const COLUNAS =
  'id,slug,nome_publico,cidade,uf,descricao_curta,descricao_completa,whatsapp,instagram,site,publicado,logo_url,capa_url,updated_at';

type Perfil = {
  id: string;
  slug: string;
  nome_publico: string;
  cidade: string;
  uf: string;
  descricao_curta: string | null;
  descricao_completa: string | null;
  whatsapp: string | null;
  instagram: string | null;
  site: string | null;
  publicado: boolean;
  logo_url: string | null;
  capa_url: string | null;
  updated_at: string;
};

const campo =
  'mt-2 min-h-12 w-full rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-elevado)] px-3 py-3 text-sm text-[var(--ern-texto)] outline-none focus:ring-2 focus:ring-[var(--ern-destaque)] disabled:opacity-60';

function mensagemErro(erro: unknown): string {
  if (erro instanceof Error) return erro.message;

  if (typeof erro === 'object' && erro !== null) {
    const falha = erro as { code?: string };

    if (falha.code === '42501') {
      return 'Sua conta não possui autorização editorial.';
    }
  }

  return 'Não foi possível concluir a operação. Atualize antes de tentar novamente.';
}

function validarUrl(valor: string | null, nome: string): string | null {
  const texto = (valor ?? '').trim();
  if (!texto) return null;

  let url: URL;

  try {
    url = new URL(texto);
  } catch {
    throw new Error(`${nome}: informe um endereço completo com https://.`);
  }

  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    texto.length > 2000
  ) {
    throw new Error(`${nome}: informe um endereço HTTPS válido.`);
  }

  return url.href;
}

async function verificarAcesso(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user || data.user.is_anonymous) {
    throw new Error('Entre novamente com sua conta de administração editorial.');
  }

  const { data: autorizado, error: erroAcesso } =
    await supabase.rpc('tem_acesso_editorial_ern');

  if (erroAcesso) {
    throw new Error('Não foi possível verificar sua autorização editorial.');
  }

  if (autorizado !== true) {
    throw new Error('Sua conta não possui autorização editorial.');
  }

  return data.user.id;
}

// ERN_PERFIL_EDITORIAL_PREMIUM_V1 — usado em /comando e embutido no Perfil público.
// Acesso garantido no servidor: RPC tem_acesso_editorial_ern + RLS de perfis_publicos.
export default function PerfilEditorialEDA({ abas, voltar = true }: { abas?: ReactNode; voltar?: boolean }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [alterado, setAlterado] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [tentativa, setTentativa] = useState(0);

  const usuario = useRef('');
  const trava = useRef(false);
  const montado = useRef(false);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErro('');

      try {
        const usuarioId = await verificarAcesso();

        const { data, error } = await supabase
          .from('perfis_publicos')
          .select(COLUNAS)
          .eq('id', PERFIL_EDITORIAL)
          .eq('origem_tipo', 'editorial')
          .eq('categoria', 'ern_editorial')
          .single();

        if (error) throw error;

        const usuarioAtual = await verificarAcesso();

        if (usuarioAtual !== usuarioId) {
          throw new Error('A conta mudou. Recarregue a página.');
        }

        if (ativo) {
          usuario.current = usuarioId;
          setPerfil(data as Perfil);
          setAlterado(false);
        }
      } catch (falha) {
        if (ativo) setErro(mensagemErro(falha));
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, [tentativa]);

  useEffect(() => {
    if (!alterado) return;

    function avisar(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [alterado]);

  function editar<K extends keyof Perfil>(chave: K, valor: Perfil[K]) {
    if (trava.current || enviandoImagem) return;
    setPerfil(atual => atual ? { ...atual, [chave]: valor } : atual);
    setAlterado(true);
    setAviso('');
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!perfil || trava.current || enviandoImagem) return;

    trava.current = true;
    setSalvando(true);
    setErro('');
    setAviso('');

    try {
      const usuarioAtual = await verificarAcesso();

      if (usuarioAtual !== usuario.current) {
        throw new Error('A conta mudou. Recarregue a página antes de salvar.');
      }

      const nome = perfil.nome_publico.trim();
      const cidade = perfil.cidade.trim();
      const uf = perfil.uf.trim().toUpperCase();

      if (nome.length < 2 || nome.length > 150) {
        throw new Error('Nome público: use de 2 a 150 caracteres.');
      }

      if (cidade.length < 2 || cidade.length > 120) {
        throw new Error('Cidade ou região: use de 2 a 120 caracteres.');
      }

      if (!/^[A-Z]{2}$/.test(uf)) {
        throw new Error('Informe a UF com duas letras.');
      }

      const curta = (perfil.descricao_curta ?? '').trim();
      const completa = (perfil.descricao_completa ?? '').trim();

      if (curta.length > 300 || completa.length > 5000) {
        throw new Error('Revise o tamanho das apresentações.');
      }

      const { data, error } = await supabase
        .from('perfis_publicos')
        .update({
          nome_publico: nome,
          cidade,
          uf,
          descricao_curta: curta || null,
          descricao_completa: completa || null,
          whatsapp: normalizarWhatsAppERN(perfil.whatsapp),
          instagram: validarUrl(perfil.instagram, 'Instagram'),
          site: validarUrl(perfil.site, 'Site'),
          publicado: perfil.publicado,
        })
        .eq('id', PERFIL_EDITORIAL)
        .eq('origem_tipo', 'editorial')
        .eq('categoria', 'ern_editorial')
        .eq('updated_at', perfil.updated_at)
        .select(COLUNAS)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error(
          'O perfil foi alterado em outra sessão ou seu acesso mudou. Recarregue antes de continuar.',
        );
      }

      const usuarioDepois = await verificarAcesso();

      if (usuarioDepois !== usuario.current) {
        throw new Error(
          'A conta mudou após o envio. Recarregue para conferir o resultado.',
        );
      }

      if (montado.current) {
        setPerfil(data as Perfil);
        setAlterado(false);
        setAviso('Perfil editorial salvo com sucesso.');
      }
    } catch (falha) {
      if (montado.current) setErro(mensagemErro(falha));
    } finally {
      trava.current = false;
      if (montado.current) setSalvando(false);
    }
  }

  return (
    <main className="eda-pg eda-pg-auto eda-pg-legado min-h-screen px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {voltar && (
          <Link href="/configuracoes" className="inline-flex min-h-11 items-center text-sm text-[var(--ern-destaque)]">
            ← Configurações
          </Link>
        )}

        <header className="mb-5 mt-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--ern-destaque)]">
            Comando EDA · exclusivo da conta EDA
          </p>
          <h1 className="mt-3 text-3xl sm:text-4xl">Perfil editorial</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ern-secundario)]">
            Administre a voz oficial da Encantos da Amazônia na rede pública.
          </p>
        </header>

        {abas}

        <nav aria-label="Atalhos do comando" className="mt-1 flex flex-wrap gap-4 text-sm text-[var(--ern-destaque)]">
          {!alterado && !salvando && !enviandoImagem && (
            <>
              <Link href="/comando/publicacoes" className="min-h-11 py-3 underline">
                Publicações editoriais
              </Link>
              <Link href="/comando/feedbacks" className="min-h-11 py-3 underline">
                Feedbacks dos usuários
              </Link>
              <Link href="/comando/iara" className="min-h-11 py-3 underline">
                Funil da Iara (plataforma)
              </Link>
              <Link href="/dashboard" className="min-h-11 py-3 underline">
                Abrir operadora
              </Link>
              <Link href="/rede" className="min-h-11 py-3 underline">
                Abrir Rede EDA
              </Link>
              {perfil?.publicado && (
                <Link
                  href={`/rede/perfil/${encodeURIComponent(perfil.slug)}`}
                  className="min-h-11 py-3 underline"
                >
                  Ver perfil editorial
                </Link>
              )}
            </>
          )}
        </nav>

        {erro && (
          <p role="alert" className="mt-5 rounded-xl border border-[var(--ern-erro)] p-4 text-sm text-[var(--ern-erro)]">
            {erro}
          </p>
        )}

        {aviso && (
          <p role="status" className="mt-5 rounded-xl border border-[var(--ern-sucesso)] p-4 text-sm text-[var(--ern-sucesso)]">
            {aviso}
          </p>
        )}

        {carregando ? (
          <p role="status" className="mt-6">Verificando acesso editorial…</p>
        ) : !perfil ? (
          <button
            type="button"
            onClick={() => setTentativa(valor => valor + 1)}
            className="mt-6 min-h-12 rounded-xl bg-[var(--ern-botao)] px-5 text-sm font-semibold text-[var(--ern-sobre-botao)]"
          >
            Tentar novamente
          </button>
        ) : (
          <form onSubmit={salvar} className="mt-6">
            <fieldset
              disabled={salvando || enviandoImagem}
              className="min-w-0 space-y-5 rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-4 sm:p-6"
            >
              <legend className="px-2 text-sm font-semibold text-[var(--ern-destaque)]">
                Apresentação oficial
              </legend>

              <label className="block text-sm">
                Nome público
                <input
                  required
                  minLength={2}
                  maxLength={150}
                  value={perfil.nome_publico}
                  onChange={e => editar('nome_publico', e.target.value)}
                  className={campo}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-[1fr_100px]">
                <label className="block text-sm">
                  Cidade ou região
                  <input
                    required
                    minLength={2}
                    maxLength={120}
                    value={perfil.cidade}
                    onChange={e => editar('cidade', e.target.value)}
                    className={campo}
                  />
                </label>

                <label className="block text-sm">
                  UF
                  <input
                    required
                    maxLength={2}
                    value={perfil.uf}
                    onChange={e => editar('uf', e.target.value)}
                    className={campo}
                  />
                </label>
              </div>

              <label className="block text-sm">
                Apresentação curta
                <textarea
                  rows={3}
                  maxLength={300}
                  value={perfil.descricao_curta ?? ''}
                  onChange={e => editar('descricao_curta', e.target.value)}
                  className={campo}
                />
              </label>

              <label className="block text-sm">
                Apresentação completa
                <textarea
                  rows={7}
                  maxLength={5000}
                  value={perfil.descricao_completa ?? ''}
                  onChange={e => editar('descricao_completa', e.target.value)}
                  className={campo}
                />
              </label>

              <label className="block text-sm">
                WhatsApp oficial da plataforma
                <input
                  type="tel"
                  maxLength={30}
                  placeholder="5592999999999"
                  value={perfil.whatsapp ?? ''}
                  onChange={e => editar('whatsapp', e.target.value)}
                  className={campo}
                />
                <span className="mt-2 block text-xs leading-5 text-[var(--ern-secundario)]">
                  Opcional. Use o contato da EDA para atendimento institucional.
                </span>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  Instagram
                  <input
                    type="url"
                    maxLength={2000}
                    placeholder="https://www.instagram.com/..."
                    value={perfil.instagram ?? ''}
                    onChange={e => editar('instagram', e.target.value)}
                    className={campo}
                  />
                </label>

                <label className="block text-sm">
                  Site
                  <input
                    type="url"
                    maxLength={2000}
                    placeholder="https://..."
                    value={perfil.site ?? ''}
                    onChange={e => editar('site', e.target.value)}
                    className={campo}
                  />
                </label>
              </div>

              <label className="flex min-h-12 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={perfil.publicado}
                  onChange={e => editar('publicado', e.target.checked)}
                  className="h-5 w-5 accent-[var(--ern-destaque)]"
                />
                Manter o perfil editorial visível ao público
              </label>

              <div className="flex flex-wrap items-center gap-4 border-t border-[var(--ern-borda)] pt-5">
                <button
                  type="submit"
                  disabled={!alterado || salvando || enviandoImagem}
                  className="min-h-12 rounded-xl bg-[var(--ern-botao)] px-5 text-sm font-semibold text-[var(--ern-sobre-botao)] disabled:opacity-50"
                >
                  {salvando ? 'Salvando…' : 'Salvar perfil editorial'}
                </button>

                <p className="text-xs text-[var(--ern-secundario)]">
                  {alterado ? 'Existem alterações não salvas.' : 'Dados carregados do perfil oficial.'}
                </p>
              </div>
            </fieldset>
          </form>
        )}

        {perfil && !carregando && (
          <ImagensEditorialERN
            logo_url={perfil.logo_url}
            capa_url={perfil.capa_url}
            updated_at={perfil.updated_at}
            usuarioId={usuario.current}
            bloqueado={alterado || salvando}
            onOcupado={setEnviandoImagem}
            onAtualizado={dados => {
              setPerfil(atual => atual ? { ...atual, ...dados } : atual);
            }}
          />
        )}
      </div>
    </main>
  );
}
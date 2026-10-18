'use client';

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';

import {
  carregarPerfilPublicoOperadoraERN,
  contextoPerfilPublicoERN,
  enviarImagemPerfilPublicoERN,
  erroPerfilPublicoERN,
  linkWhatsAppPerfilERN,
  salvarPerfilPublicoOperadoraERN,
  type ContextoPerfilPublicoERN,
  type DadosPerfilPublicoERN,
  type PerfilPublicoOperadoraERN,
} from '@/lib/perfilPublicoOperadoraERN';

const INICIAL: DadosPerfilPublicoERN = {
  slug: '',
  nome_publico: '',
  cidade: '',
  uf: 'AM',
  descricao_curta: '',
  descricao_completa: '',
  logo_url: null,
  capa_url: null,
  whatsapp: '',
  instagram: '',
  site: '',
  idiomas: [],
  especialidades: [],
  publicado: false,
  territorio_id: null,
};

const CAMPO =
  'min-h-12 w-full min-w-0 rounded-xl border border-[var(--ern-borda)] ' +
  'bg-[var(--ern-fundo)] px-3 py-3 text-base text-[var(--ern-texto)] ' +
  'outline-none focus:ring-2 focus:ring-[var(--ern-destaque)] ' +
  'disabled:opacity-50 sm:text-sm';

const PAINEL =
  'min-w-0 rounded-2xl border border-[var(--ern-borda)] ' +
  'bg-[var(--ern-painel)] p-4 sm:p-6';

function Campo({
  titulo,
  ajuda,
  children,
}: {
  titulo: string;
  ajuda?: string;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0 space-y-2">
      <span className="block text-sm font-medium">{titulo}</span>
      {children}
      {ajuda && (
        <span className="block text-xs leading-5 text-[var(--ern-secundario)]">
          {ajuda}
        </span>
      )}
    </label>
  );
}

function dadosDoPerfil(
  perfil: PerfilPublicoOperadoraERN,
): DadosPerfilPublicoERN {
  return {
    slug: perfil.slug,
    nome_publico: perfil.nome_publico,
    cidade: perfil.cidade,
    uf: perfil.uf,
    descricao_curta: perfil.descricao_curta,
    descricao_completa: perfil.descricao_completa,
    logo_url: perfil.logo_url,
    capa_url: perfil.capa_url,
    whatsapp: perfil.whatsapp,
    instagram: perfil.instagram,
    site: perfil.site,
    idiomas: perfil.idiomas ?? [],
    especialidades: perfil.especialidades ?? [],
    publicado: perfil.publicado,
    territorio_id: perfil.territorio_id,
  };
}

function lista(texto: string): string[] {
  return texto
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

export default function PerfilPublicoPage() {
  const [formulario, setFormulario] = useState(INICIAL);
  const [contexto, setContexto] = useState<ContextoPerfilPublicoERN | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState<'logo' | 'capa' | null>(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [idiomas, setIdiomas] = useState('');
  const [especialidades, setEspecialidades] = useState('');
  const [alterado, setAlterado] = useState(false);

  const trava = useRef(false);
  const identificador = useRef('');
  const existente = useRef(false);
  const montado = useRef(false);

  useEffect(() => {
    let ativo = true;
    montado.current = true;

    async function carregar() {
      try {
        const atual = await contextoPerfilPublicoERN();
        const perfil = await carregarPerfilPublicoOperadoraERN(atual);

        if (!ativo) return;

        identificador.current = perfil?.id ?? crypto.randomUUID();
        existente.current = Boolean(perfil);

        if (perfil) {
          setFormulario(dadosDoPerfil(perfil));
          setIdiomas((perfil.idiomas ?? []).join(', '));
          setEspecialidades((perfil.especialidades ?? []).join(', '));
        }

        setContexto(atual);
      } catch (falha) {
        if (ativo) setErro(erroPerfilPublicoERN(falha));
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();

    return () => {
      ativo = false;
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    if (!alterado) return;

    function avisar(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [alterado]);

  const ocupado = salvando || enviando !== null;
  const bloqueado = carregando || !contexto || ocupado;

  function atualizar<K extends keyof DadosPerfilPublicoERN>(
    campo: K,
    valor: DadosPerfilPublicoERN[K],
  ) {
    if (trava.current) return;

    setFormulario(anterior => ({ ...anterior, [campo]: valor }));
    setAlterado(true);
    setAviso('');
  }

  async function enviar(
    arquivo: File | undefined,
    finalidade: 'logo' | 'capa',
  ) {
    if (!arquivo || !contexto || trava.current) return;

    trava.current = true;
    setEnviando(finalidade);
    setErro('');
    setAviso('');

    try {
      const url = await enviarImagemPerfilPublicoERN(
        contexto,
        arquivo,
        finalidade,
      );

      if (!montado.current) return;

      setFormulario(anterior => ({
        ...anterior,
        [finalidade === 'logo' ? 'logo_url' : 'capa_url']: url,
      }));

      setAlterado(true);
      setAviso('Imagem enviada. Salve o perfil para aplicar a alteração.');
    } catch (falha) {
      if (montado.current) setErro(erroPerfilPublicoERN(falha));
    } finally {
      trava.current = false;
      if (montado.current) setEnviando(null);
    }
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!contexto || trava.current || carregando) return;

    trava.current = true;
    setSalvando(true);
    setErro('');
    setAviso('');

    try {
      const perfil = await salvarPerfilPublicoOperadoraERN(
        contexto,
        identificador.current,
        existente.current,
        {
          ...formulario,
          idiomas: lista(idiomas),
          especialidades: lista(especialidades),
        },
      );

      if (!montado.current) return;

      existente.current = true;
      setFormulario(dadosDoPerfil(perfil));
      setIdiomas((perfil.idiomas ?? []).join(', '));
      setEspecialidades((perfil.especialidades ?? []).join(', '));
      setAlterado(false);
      setAviso('Perfil salvo com sucesso.');
    } catch (falha) {
      if (montado.current) setErro(erroPerfilPublicoERN(falha));
    } finally {
      trava.current = false;
      if (montado.current) setSalvando(false);
    }
  }

  let whatsapp: string | null = null;

  try {
    whatsapp = linkWhatsAppPerfilERN(
      formulario.whatsapp,
      formulario.nome_publico || 'operadora',
    );
  } catch {
    whatsapp = null;
  }

  return (
    <main className="min-h-screen bg-[var(--ern-fundo)] px-4 py-7 text-[var(--ern-texto)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/configuracoes"
          className="inline-flex min-h-11 items-center text-sm text-[var(--ern-destaque)]"
        >
          ← Configurações
        </Link>

        <header className="mb-7 mt-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--ern-destaque)]">
            Sua operadora na Rede ERN
          </p>
          <h1
            className="mt-3 text-3xl sm:text-4xl"
            style={{ fontFamily: 'var(--font-fraunces), serif' }}
          >
            Perfil público
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ern-secundario)]">
            Apresente sua empresa, valorize suas experiências e facilite
            o contato de quem deseja conhecer o Rio Negro.
          </p>
        </header>

        {erro && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-[var(--ern-erro)] p-4 text-sm text-[var(--ern-erro)]"
          >
            {erro}
          </div>
        )}

        {aviso && (
          <p
            role="status"
            className="mb-5 rounded-xl border border-[var(--ern-borda)] p-4 text-sm text-[var(--ern-sucesso)]"
          >
            {aviso}
          </p>
        )}

        {carregando ? (
          <p role="status" className={PAINEL}>
            Carregando perfil da operadora…
          </p>
        ) : !contexto ? (
          <div className={PAINEL}>
            <p className="text-sm">
              Não foi possível abrir o editor do perfil.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 min-h-12 rounded-xl border border-[var(--ern-borda)] px-4 text-sm"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <form onSubmit={salvar}>
            <fieldset
              disabled={bloqueado}
              className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]"
            >
              <div className="min-w-0 space-y-5">
                <section className={PAINEL}>
                  <h2 className="text-lg font-semibold">Identidade da operadora</h2>

                  <div className="mt-5 grid min-w-0 gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Campo titulo="Nome público">
                        <input
                          required
                          minLength={2}
                          maxLength={150}
                          autoComplete="organization"
                          value={formulario.nome_publico}
                          onChange={e => atualizar('nome_publico', e.target.value)}
                          className={CAMPO}
                        />
                      </Campo>
                    </div>

                    <div className="sm:col-span-2">
                      <Campo
                        titulo="Endereço do perfil"
                        ajuda="Use letras sem acentos, números e hífens. Ex.: encantos-rio-negro."
                      >
                        <input
                          required
                          minLength={3}
                          maxLength={100}
                          pattern="[a-z0-9]+(-[a-z0-9]+)*"
                          autoCapitalize="none"
                          autoComplete="off"
                          spellCheck={false}
                          value={formulario.slug}
                          onChange={e => atualizar('slug', e.target.value.toLowerCase())}
                          className={CAMPO}
                        />
                      </Campo>
                    </div>

                    <Campo titulo="Cidade de origem">
                      <input
                        required
                        maxLength={120}
                        autoComplete="address-level2"
                        value={formulario.cidade}
                        onChange={e => atualizar('cidade', e.target.value)}
                        className={CAMPO}
                      />
                    </Campo>

                    <Campo titulo="UF">
                      <input
                        required
                        minLength={2}
                        maxLength={2}
                        pattern="[A-Z]{2}"
                        autoComplete="address-level1"
                        value={formulario.uf}
                        onChange={e => atualizar('uf', e.target.value.toUpperCase())}
                        className={CAMPO}
                      />
                    </Campo>
                  </div>
                </section>

                <section className={PAINEL}>
                  <h2 className="text-lg font-semibold">Apresentação</h2>

                  <div className="mt-5 space-y-5">
                    <Campo titulo="Apresentação curta">
                      <textarea
                        maxLength={300}
                        rows={3}
                        value={formulario.descricao_curta ?? ''}
                        onChange={e => atualizar('descricao_curta', e.target.value)}
                        className={`${CAMPO} resize-y`}
                      />
                    </Campo>

                    <Campo
                      titulo="Sobre a operadora"
                      ajuda="Conte sua história, os destinos atendidos e o que torna suas experiências especiais."
                    >
                      <textarea
                        maxLength={5000}
                        rows={7}
                        value={formulario.descricao_completa ?? ''}
                        onChange={e => atualizar('descricao_completa', e.target.value)}
                        className={`${CAMPO} resize-y`}
                      />
                    </Campo>

                    <Campo
                      titulo="Idiomas de atendimento"
                      ajuda="Separe por vírgulas. Ex.: Português, Inglês, Espanhol."
                    >
                      <input
                        value={idiomas}
                        maxLength={2000}
                        onChange={e => {
                          setIdiomas(e.target.value);
                          setAlterado(true);
                          setAviso('');
                        }}
                        className={CAMPO}
                      />
                    </Campo>

                    <Campo
                      titulo="Especialidades"
                      ajuda="Separe por vírgulas. Ex.: Pesca esportiva, Passeios fluviais, Gastronomia regional."
                    >
                      <input
                        value={especialidades}
                        maxLength={2000}
                        onChange={e => {
                          setEspecialidades(e.target.value);
                          setAlterado(true);
                          setAviso('');
                        }}
                        className={CAMPO}
                      />
                    </Campo>
                  </div>
                </section>

                <section className={PAINEL}>
                  <h2 className="text-lg font-semibold">Contatos públicos</h2>

                  <div className="mt-5 space-y-5">
                    <Campo
                      titulo="WhatsApp comercial"
                      ajuda="Inclua DDI e DDD. Para o Brasil, comece com 55. Este número será divulgado ao público."
                    >
                      <input
                        type="tel"
                        autoComplete="tel"
                        maxLength={30}
                        placeholder="+55 92 99999-9999"
                        value={formulario.whatsapp ?? ''}
                        onChange={e => atualizar('whatsapp', e.target.value)}
                        className={CAMPO}
                      />
                    </Campo>

                    <Campo titulo="Instagram da operadora">
                      <input
                        type="url"
                        maxLength={2000}
                        placeholder="https://www.instagram.com/suaoperadora"
                        value={formulario.instagram ?? ''}
                        onChange={e => atualizar('instagram', e.target.value)}
                        className={CAMPO}
                      />
                    </Campo>

                    <Campo titulo="Site da operadora">
                      <input
                        type="url"
                        maxLength={2000}
                        placeholder="https://"
                        value={formulario.site ?? ''}
                        onChange={e => atualizar('site', e.target.value)}
                        className={CAMPO}
                      />
                    </Campo>
                  </div>
                </section>
              </div>

              <div className="min-w-0 space-y-5">
                <section className={PAINEL}>
                  <h2 className="text-lg font-semibold">Imagens da empresa</h2>
                  <p className="mt-2 text-xs leading-5 text-[var(--ern-secundario)]">
                    Use imagens autorizadas para divulgação pública.
                    JPEG, PNG ou WebP, com até 5 MB por arquivo.
                  </p>

                  <div className="mt-5 space-y-5">
                    <Campo titulo="Foto de capa">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={e => {
                          const arquivo = e.target.files?.[0];
                          e.target.value = '';
                          void enviar(arquivo, 'capa');
                        }}
                        className={`${CAMPO} text-sm`}
                      />
                    </Campo>

                    <Campo titulo="Logo da operadora">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={e => {
                          const arquivo = e.target.files?.[0];
                          e.target.value = '';
                          void enviar(arquivo, 'logo');
                        }}
                        className={`${CAMPO} text-sm`}
                      />
                    </Campo>

                    {enviando && (
                      <p role="status" className="text-sm">
                        Enviando {enviando === 'logo' ? 'logo' : 'capa'}…
                      </p>
                    )}
                  </div>
                </section>

                <section className={PAINEL}>
                  <h2 className="text-lg font-semibold">Prévia da apresentação</h2>

                  <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--ern-borda)]">
                    <div className="relative aspect-[16/9] bg-[var(--ern-suave)]">
                      {formulario.capa_url ? (
                        <img
                          src={formulario.capa_url}
                          alt="Capa da operadora"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-4 text-center text-sm text-[var(--ern-secundario)]">
                          Sua imagem de capa aparecerá aqui
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {formulario.logo_url ? (
                          <img
                            src={formulario.logo_url}
                            alt="Logo da operadora"
                            className="h-16 w-16 shrink-0 rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] object-contain p-1"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--ern-suave)] text-xl font-semibold text-[var(--ern-destaque)]"
                          >
                            {(formulario.nome_publico || 'OP').slice(0, 2).toUpperCase()}
                          </span>
                        )}

                        <div className="min-w-0">
                          <h3 className="break-words text-lg font-semibold">
                            {formulario.nome_publico || 'Nome da sua operadora'}
                          </h3>
                          <p className="mt-1 text-xs text-[var(--ern-secundario)]">
                            {[formulario.cidade, formulario.uf].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--ern-secundario)]">
                        {formulario.descricao_curta || 'Sua apresentação curta aparecerá aqui.'}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {lista(especialidades).slice(0, 6).map((item, indice) => (
                          <span
                            key={`${item}-${indice}`}
                            className="max-w-full break-words rounded-full bg-[var(--ern-suave)] px-3 py-1 text-xs"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {whatsapp && (
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[var(--ern-borda)] px-4 text-sm font-semibold"
                    >
                      Conferir destino do WhatsApp ↗
                    </a>
                  )}
                </section>

                <div className={PAINEL}>
                  <p className="text-sm font-semibold">
                    {formulario.publicado ? 'Perfil publicado' : 'Perfil em rascunho'}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[var(--ern-secundario)]">
                    {alterado
                      ? 'Você possui alterações ainda não salvas.'
                      : 'Mantenha apresentação e contatos atualizados.'}
                  </p>

                  <button
                    type="submit"
                    className="mt-4 min-h-12 w-full rounded-xl bg-[var(--ern-botao)] px-5 text-sm font-semibold text-[var(--ern-sobre-botao)] disabled:opacity-50"
                  >
                    {salvando ? 'Salvando…' : 'Salvar perfil'}
                  </button>
                </div>
              </div>
            </fieldset>
          </form>
        )}
      </div>
    </main>
  );
}
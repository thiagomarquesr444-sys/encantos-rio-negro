'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import AcoesPublicacaoEditorialERN from '@/app/components/AcoesPublicacaoEditorialERN';
import MidiasPublicacaoEditorialERN from '@/app/components/MidiasPublicacaoEditorialERN';
import PreviaPublicacaoEditorialERN from '@/app/components/PreviaPublicacaoEditorialERN';
import {
  contextoPerfilPublicoERN,
  type ContextoPerfilPublicoERN,
} from '@/lib/perfilPublicoEditorialERN';
import {
  listarPublicacoesEditorialERN,
  salvarRascunhoEditorialERN,
  erroPublicacaoERN,
  type DadosPublicacaoEditorialERN,
  type PublicacaoEditorialERN,
} from '@/lib/publicacoesEditorialERN';

const INICIAL: DadosPublicacaoEditorialERN = {
  titulo: '',
  resumo: '',
  conteudo: '',
  tipo: 'conteudo',
  idioma_original: 'pt',
  localidade_texto: '',
  permitir_interacoes: true,
};

const campo =
  'mt-2 min-h-12 w-full min-w-0 rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-3 text-base text-[var(--ern-texto)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ern-destaque)] disabled:opacity-50';

const botao =
  'inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--ern-borda)] px-4 text-sm font-semibold disabled:opacity-50';

const TIPOS = [
  ['conteudo', 'Experiência e conteúdo'],
  ['oferta', 'Oferta'],
  ['roteiro', 'Roteiro'],
  ['evento', 'Evento'],
  ['aviso', 'Aviso'],
  ['dica', 'Dica de viagem'],
] as const;

const SITUACOES: Record<string, string> = {
  rascunho: 'Rascunho',
  publicado: 'Publicada',
  arquivado: 'Arquivada',
  em_revisao: 'Em revisão',
  rejeitado: 'Não aprovada',
};

export default function PublicacoesEditorialPage() {
  const [contexto, setContexto] =
    useState<ContextoPerfilPublicoERN | null>(null);
  const [itens, setItens] = useState<PublicacaoEditorialERN[]>([]);
  const [formulario, setFormulario] = useState({ ...INICIAL });
  const [editando, setEditando] = useState<string | null>(null);
  const [pagina, setPagina] = useState(0);
  const [temProxima, setTemProxima] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviandoMidia, setEnviandoMidia] = useState(false);
  const [alterandoStatus, setAlterandoStatus] = useState(false);
  const [alterado, setAlterado] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [tentativa, setTentativa] = useState(0);

  const trava = useRef(false);
  const identificador = useRef('');
  const montado = useRef(false);
  const revisao = useRef(0);

  useEffect(() => {
    montado.current = true;

    return () => {
      montado.current = false;
      revisao.current += 1;
    };
  }, []);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErro('');

      try {
        const atual = await contextoPerfilPublicoERN();
        const resultado = await listarPublicacoesEditorialERN(atual, pagina);

        if (!ativo) return;

        setContexto(atual);
        setItens(resultado.itens);
        setTemProxima(resultado.temProxima);
      } catch (falha) {
        if (!ativo) return;

        setContexto(null);
        setItens([]);
        setTemProxima(false);
        setErro(erroPublicacaoERN(falha));
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, [pagina, tentativa]);

  useEffect(() => {
    if (!alterado) return;

    function avisar(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [alterado]);

  function atualizar<K extends keyof DadosPublicacaoEditorialERN>(
    chave: K,
    valor: DadosPublicacaoEditorialERN[K],
  ) {
    if (trava.current) return;

    setFormulario(atual => ({ ...atual, [chave]: valor }));
    setAlterado(true);
    setAviso('');
  }

  function editar(item: PublicacaoEditorialERN) {
    if (trava.current || alterado || item.status !== 'rascunho') return;

    identificador.current = item.id;
    setEditando(item.id);
    setFormulario({
      titulo: item.titulo,
      resumo: item.resumo ?? '',
      conteudo: item.conteudo ?? '',
      tipo: item.tipo,
      idioma_original: item.idioma_original,
      localidade_texto: item.localidade_texto ?? '',
      permitir_interacoes: item.permitir_interacoes,
    });
    setErro('');
    setAviso('');
    document.getElementById('titulo-publicacao')?.focus();
  }

  function novo() {
    if (trava.current || alterado) return;

    identificador.current = '';
    setEditando(null);
    setFormulario({ ...INICIAL });
    setErro('');
    setAviso('');
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (trava.current || !contexto || carregando) return;

    trava.current = true;
    setSalvando(true);
    setErro('');
    setAviso('');

    if (!identificador.current) {
      identificador.current = crypto.randomUUID();
    }

    const operacao = ++revisao.current;
    const id = identificador.current;

    try {
      const registro = await salvarRascunhoEditorialERN(
        contexto,
        id,
        editando !== null,
        formulario,
      );

      if (!montado.current || operacao !== revisao.current) return;

      setEditando(registro.id);
      setAlterado(false);
      setAviso('Rascunho salvo. Ele ainda não aparece no feed público.');
      setTentativa(atual => atual + 1);
    } catch (falha) {
      if (!montado.current || operacao !== revisao.current) return;

      setErro(erroPublicacaoERN(falha));
    } finally {
      trava.current = false;

      if (montado.current && operacao === revisao.current) {
        setSalvando(false);
      }
    }
  }

  const bloqueado = carregando || salvando || enviandoMidia || alterandoStatus || !contexto;

  return (
    <main data-ern-tema="amarelo" className="ern-gestao min-h-screen bg-[var(--ern-fundo)] px-4 py-6 text-[var(--ern-texto)] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/comando"
          className="inline-flex min-h-11 items-center text-sm text-[var(--ern-destaque)]"
        >
          ← Perfil público
        </Link>

        <header className="mt-4 border-b border-[var(--ern-borda)] pb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--ern-destaque)]">
            Editorial oficial da Rede ERN
          </p>
          <h1
            className="mt-3 text-3xl sm:text-4xl"
            style={{ fontFamily: 'var(--font-fraunces), serif' }}
          >
            Histórias, roteiros e experiências
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ern-secundario)]">
            Prepare conteúdos oficiais sobre cultura, natureza e destinos do Rio Negro.
            Salve o rascunho, adicione imagens, revise a prévia e publique na Rede.
          </p>
        </header>

        {erro && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-[var(--ern-borda)] p-4 text-sm"
          >
            <p>{erro}</p>
            <button
              type="button"
              disabled={salvando || carregando}
              onClick={() => setTentativa(atual => atual + 1)}
              className={`${botao} mt-3`}
            >
              Atualizar listagem
            </button>
          </div>
        )}

        {aviso && (
          <p role="status" className="mt-5 text-sm text-[var(--ern-destaque)]">
            {aviso}
          </p>
        )}

        <div className="mt-8 grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <section aria-labelledby="editor-publicacao" className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="editor-publicacao" className="text-xl font-semibold">
                {editando ? 'Editar rascunho' : 'Novo rascunho'}
              </h2>
              {editando && (
                <button
                  type="button"
                  disabled={bloqueado || alterado}
                  onClick={novo}
                  className={botao}
                >
                  Novo texto
                </button>
              )}
            </div>

            <form onSubmit={salvar} className="mt-5">
              <fieldset disabled={bloqueado} className="min-w-0 space-y-5">
                <legend className="sr-only">Conteúdo da publicação</legend>

                <label className="block text-sm">
                  Título
                  <input
                    id="titulo-publicacao"
                    required
                    minLength={3}
                    maxLength={220}
                    value={formulario.titulo}
                    onChange={e => atualizar('titulo', e.target.value)}
                    className={campo}
                    placeholder="Ex.: Três dias entre praias e igapós"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block min-w-0 text-sm">
                    Tipo
                    <select
                      value={formulario.tipo}
                      onChange={e =>
                        atualizar(
                          'tipo',
                          e.target.value as DadosPublicacaoEditorialERN['tipo'],
                        )
                      }
                      className={campo}
                    >
                      {TIPOS.map(([valor, nome]) => (
                        <option key={valor} value={valor}>{nome}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block min-w-0 text-sm">
                    Idioma do texto
                    <select
                      value={formulario.idioma_original}
                      onChange={e =>
                        atualizar(
                          'idioma_original',
                          e.target.value as DadosPublicacaoEditorialERN['idioma_original'],
                        )
                      }
                      className={campo}
                    >
                      <option value="pt">Português</option>
                      <option value="en">English</option>
                      <option value="es">Español</option>
                    </select>
                  </label>
                </div>

                <label className="block text-sm">
                  Localidade
                  <input
                    maxLength={300}
                    value={formulario.localidade_texto}
                    onChange={e => atualizar('localidade_texto', e.target.value)}
                    className={campo}
                    placeholder="Ex.: Barcelos, Rio Negro — AM"
                  />
                </label>

                <label className="block text-sm">
                  Apresentação curta
                  <textarea
                    maxLength={600}
                    rows={3}
                    value={formulario.resumo}
                    onChange={e => atualizar('resumo', e.target.value)}
                    className={`${campo} py-3`}
                  />
                </label>

                <label className="block text-sm">
                  Texto da publicação
                  <textarea
                    maxLength={50000}
                    rows={9}
                    value={formulario.conteudo}
                    onChange={e => atualizar('conteudo', e.target.value)}
                    className={`${campo} py-3`}
                    placeholder="Conte a experiência, os diferenciais e as orientações para o visitante."
                  />
                </label>

                <label className="flex min-h-12 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={formulario.permitir_interacoes}
                    onChange={e =>
                      atualizar('permitir_interacoes', e.target.checked)
                    }
                    className="h-5 w-5 shrink-0"
                  />
                  Permitir interações quando a publicação estiver no ar
                </label>

                {alterado && (
                  <p className="text-xs text-[var(--ern-secundario)]">
                    Há alterações não salvas. Salve antes de trocar de rascunho.
                  </p>
                )}

                <button
                  type="submit"
                  className="min-h-12 w-full rounded-xl bg-[var(--ern-botao)] px-5 text-sm font-semibold text-[var(--ern-sobre-botao)] disabled:opacity-50 sm:w-auto"
                >
                  {salvando ? 'Salvando…' : 'Salvar rascunho'}
                </button>
              </fieldset>
            </form>

            {contexto && editando && (
              <MidiasPublicacaoEditorialERN
                key={'midias-' + editando}
                contexto={contexto}
                publicacaoId={editando}
                bloqueado={carregando || salvando || alterado}
                onOcupado={setEnviandoMidia}
              />
            )}

            {contexto && editando && (
              <PreviaPublicacaoEditorialERN
                key={'previa-' + editando}
                contexto={contexto}
                publicacaoId={editando}
                bloqueado={bloqueado || alterado}
              />
            )}
          </section>

          <section aria-labelledby="lista-publicacoes" className="min-w-0">
            <h2 id="lista-publicacoes" className="text-xl font-semibold">
              Publicações do editorial
            </h2>

            {carregando ? (
              <p role="status" className="mt-5 text-sm">
                Carregando publicações…
              </p>
            ) : !contexto ? (
              <p className="mt-5 text-sm text-[var(--ern-secundario)]">
                Resolva o aviso acima para consultar suas publicações.
              </p>
            ) : itens.length === 0 ? (
              <p className="mt-5 text-sm text-[var(--ern-secundario)]">
                Nenhuma publicação nesta página.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-[var(--ern-borda)]">
                {itens.map(item => (
                  <li key={item.id} className="py-5">
                    <p className="text-xs font-semibold text-[var(--ern-destaque)]">
                      {SITUACOES[item.status] ?? item.status}
                    </p>
                    <h3 className="mt-2 break-words text-lg font-semibold">
                      {item.titulo}
                    </h3>
                    {item.resumo && (
                      <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-[var(--ern-secundario)]">
                        {item.resumo}
                      </p>
                    )}
                    {contexto && (
                      <AcoesPublicacaoEditorialERN
                        contexto={contexto}
                        item={item}
                        bloqueado={bloqueado || alterado}
                        onOcupado={setAlterandoStatus}
                        onAtualizar={() => {
                          if (editando === item.id) {
                            setEditando(null);
                            identificador.current = '';
                            setFormulario({ ...INICIAL });
                          }
                          setTentativa(atual => atual + 1);
                        }}
                      />
                    )}
                    {item.status === 'rascunho' && (
                      <button
                        type="button"
                        disabled={bloqueado || alterado}
                        onClick={() => editar(item)}
                        className={`${botao} mt-3`}
                      >
                        {editando === item.id ? 'Rascunho selecionado' : 'Editar texto'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <nav
              aria-label="Páginas de publicações"
              className="mt-5 flex flex-wrap items-center gap-3"
            >
              <button
                type="button"
                disabled={bloqueado || pagina === 0}
                onClick={() => setPagina(atual => atual - 1)}
                className={botao}
              >
                Anterior
              </button>
              <span className="text-sm">Página {pagina + 1}</span>
              <button
                type="button"
                disabled={bloqueado || !temProxima}
                onClick={() => setPagina(atual => atual + 1)}
                className={botao}
              >
                Próxima
              </button>
            </nav>
          </section>
        </div>
      </div>
    </main>
  );
}
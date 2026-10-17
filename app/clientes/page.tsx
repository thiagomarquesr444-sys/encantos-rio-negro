'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Cliente = {
  id: string;
  empresa_id: string;
  nome: string;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  nacionalidade: string | null;
  situacao: string | null;
  observacoes: string | null;
  created_at: string | null;
};

type Contexto = {
  usuarioId: string;
  empresaId: string;
};

const normalizar = (valor: string) =>
  valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase();

const painel =
  'min-w-0 rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-4 sm:p-6';

const botao =
  'inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--ern-borda)] px-4 text-sm font-semibold transition hover:bg-[var(--ern-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ern-destaque)] disabled:cursor-not-allowed disabled:opacity-50';

const campo =
  'min-h-12 w-full min-w-0 rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-3 text-base text-[var(--ern-texto)] outline-none focus:ring-2 focus:ring-[var(--ern-destaque)]';

async function consultarContexto(): Promise<Contexto> {
  const { data: auth, error: authError } =
    await supabase.auth.getUser();

  if (authError || !auth.user) {
    throw new Error('Sua sessão expirou. Entre novamente.');
  }

  const { data: perfil, error: perfilError } = await supabase
    .from('perfis')
    .select('empresa_id')
    .eq('id', auth.user.id)
    .single();

  if (perfilError || !perfil?.empresa_id) {
    throw new Error('Não foi possível identificar sua empresa.');
  }

  return {
    usuarioId: auth.user.id,
    empresaId: String(perfil.empresa_id),
  };
}

function situacaoCliente(cliente: Cliente) {
  const valor = normalizar(cliente.situacao ?? '');
  if (!valor || valor === 'ativo') return 'Ativo';
  if (valor === 'inativo') return 'Inativo';
  return cliente.situacao?.trim() || 'Não informada';
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [contexto, setContexto] = useState<Contexto | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [feedback, setFeedback] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState('');
  const [selecionado, setSelecionado] = useState<Cliente | null>(null);
  const [modo, setModo] = useState<'detalhes' | 'excluir'>('detalhes');
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState('');

  const dialogo = useRef<HTMLDialogElement>(null);
  const travaExclusao = useRef(false);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErro('');
      setClientes([]);
      setContexto(null);

      try {
        const atual = await consultarContexto();
        const lista: Cliente[] = [];
        let esperado: number | null = null;

        for (let inicio = 0; inicio < 10000; inicio += 200) {
          if (!ativo) return;

          const { data, count, error } = await supabase
            .from('clientes')
            .select(
              'id,empresa_id,nome,documento,telefone,email,cidade,nacionalidade,situacao,observacoes,created_at',
              { count: 'exact' },
            )
            .eq('empresa_id', atual.empresaId)
            .order('created_at', {
              ascending: false,
              nullsFirst: false,
            })
            .order('id', { ascending: true })
            .range(inicio, inicio + 199);

          if (error) {
            throw new Error('Não foi possível consultar os clientes.');
          }

          if (count === null || count > 10000) {
            throw new Error(
              'Este volume exige busca no servidor. A consulta foi interrompida para evitar totais parciais.',
            );
          }

          if (esperado !== null && esperado !== count) {
            throw new Error(
              'Os cadastros mudaram durante a consulta. Atualize os dados.',
            );
          }

          esperado = count;
          lista.push(...((data ?? []) as Cliente[]));

          if (lista.length >= count) break;

          if (!data?.length) {
            throw new Error('A consulta ficou incompleta. Tente novamente.');
          }
        }

        if (
          lista.length !== esperado ||
          lista.some((item) =>
            !item.id || item.empresa_id !== atual.empresaId
          ) ||
          new Set(lista.map((item) => item.id)).size !== lista.length
        ) {
          throw new Error('Não foi possível obter uma listagem consistente.');
        }

        const confirmado = await consultarContexto();

        if (
          confirmado.usuarioId !== atual.usuarioId ||
          confirmado.empresaId !== atual.empresaId
        ) {
          throw new Error('A sessão mudou. Atualize a página.');
        }

        if (ativo) {
          setClientes(lista);
          setContexto(atual);
        }
      } catch (falha) {
        if (ativo) {
          setErro(
            falha instanceof Error
              ? falha.message
              : 'Não foi possível carregar os clientes.',
          );
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();
    return () => { ativo = false; };
  }, [tentativa]);

  useEffect(() => {
    if (selecionado && !dialogo.current?.open) {
      dialogo.current?.showModal();
    }
  }, [selecionado]);

  const filtrados = useMemo(() => {
    const termo = normalizar(busca);

    return clientes.filter((cliente) => {
      if (situacao && situacaoCliente(cliente) !== situacao) {
        return false;
      }

      return !termo || normalizar([
        cliente.nome,
        cliente.documento,
        cliente.telefone,
        cliente.email,
        cliente.cidade,
        cliente.nacionalidade,
        situacaoCliente(cliente),
      ].filter(Boolean).join(' ')).includes(termo);
    });
  }, [clientes, busca, situacao]);

  const ativos = clientes.filter(
    (item) => situacaoCliente(item) === 'Ativo',
  ).length;

  const inativos = clientes.filter(
    (item) => situacaoCliente(item) === 'Inativo',
  ).length;

  function abrir(cliente: Cliente, proximoModo: typeof modo) {
    setErroExclusao('');
    setModo(proximoModo);
    setSelecionado(cliente);
  }

  function fechar() {
    if (travaExclusao.current) return;
    dialogo.current?.close();
    setSelecionado(null);
    setErroExclusao('');
  }

  async function excluir() {
    if (!selecionado || !contexto || travaExclusao.current) return;

    travaExclusao.current = true;
    setExcluindo(true);
    setErroExclusao('');

    try {
      const atual = await consultarContexto();

      if (
        atual.usuarioId !== contexto.usuarioId ||
        atual.empresaId !== contexto.empresaId ||
        selecionado.empresa_id !== atual.empresaId
      ) {
        throw new Error('A sessão mudou. Feche esta janela e atualize a página.');
      }

      const { data, error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', selecionado.id)
        .eq('empresa_id', atual.empresaId)
        .select('id');

      if (error) {
        if (error.code === '23503') {
          throw new Error(
            'Este cliente possui vínculos que impedem a exclusão. Considere inativar o cadastro.',
          );
        }

        throw new Error(
          'A exclusão não foi confirmada. Feche esta janela e atualize a listagem antes de tentar novamente.',
        );
      }

      if (
        data?.length !== 1 ||
        data[0].id !== selecionado.id
      ) {
        throw new Error(
          'Nenhum registro foi confirmado como excluído. Atualize a listagem para conferir suas permissões e o cadastro.',
        );
      }

      setClientes((atuais) =>
        atuais.filter((item) => item.id !== selecionado.id),
      );
      setFeedback('Cliente excluído. As reservas existentes foram preservadas.');
      dialogo.current?.close();
      setSelecionado(null);
    } catch (falha) {
      setErroExclusao(
        falha instanceof Error
          ? falha.message
          : 'Não foi possível confirmar a exclusão. Atualize a listagem.',
      );
    } finally {
      travaExclusao.current = false;
      setExcluindo(false);
    }
  }

  function acoes(cliente: Cliente) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={botao}
          aria-label={`Visualizar ${cliente.nome}`}
          onClick={() => abrir(cliente, 'detalhes')}
        >
          Visualizar
        </button>
        <Link
          href={`/clientes/editar/${cliente.id}`}
          className={botao}
          aria-label={`Editar ${cliente.nome}`}
        >
          Editar
        </Link>
        <button
          type="button"
          className={`${botao} text-[var(--ern-erro)]`}
          aria-label={`Excluir ${cliente.nome}`}
          onClick={() => abrir(cliente, 'excluir')}
        >
          Excluir
        </button>
      </div>
    );
  }

  function detalhes(cliente: Cliente) {
    return [
      ['Documento', cliente.documento],
      ['Telefone / WhatsApp', cliente.telefone],
      ['E-mail', cliente.email],
      ['Cidade', cliente.cidade],
      ['Nacionalidade', cliente.nacionalidade],
      ['Situação', situacaoCliente(cliente)],
    ];
  }

  return (
    <div className="min-h-screen min-w-0 bg-[var(--ern-fundo)] text-[var(--ern-texto)]">
      <main className="mx-auto max-w-[1360px] space-y-6 px-4 py-7 sm:px-6 sm:py-10">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--ern-destaque)]">
              Operação · Clientes
            </p>
            <h1
              className="mt-2 text-4xl sm:text-5xl"
              style={{ fontFamily: 'var(--font-fraunces), serif' }}
            >
              Clientes
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ern-secundario)]">
              Organize os viajantes e mantenha os dados da sua operação atualizados.
            </p>
          </div>
          <Link
            href="/clientes/novo"
            className={`${botao} bg-[var(--ern-botao)] text-[var(--ern-sobre-botao)]`}
          >
            + Novo cliente
          </Link>
        </header>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[
            { nome: 'Todos', valor: clientes.length, filtro: '' },
            { nome: 'Ativos', valor: ativos, filtro: 'Ativo' },
            { nome: 'Inativos', valor: inativos, filtro: 'Inativo' },
          ].map((item) => (
            <button
              key={item.nome}
              type="button"
              disabled={carregando || Boolean(erro)}
              aria-pressed={situacao === item.filtro}
              onClick={() =>
                setSituacao((atual) =>
                  atual === item.filtro ? '' : item.filtro
                )
              }
              className={`${painel} text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ern-destaque)] ${
                situacao === item.filtro
                  ? 'ring-2 ring-[var(--ern-destaque)]'
                  : ''
              }`}
            >
              <span className="text-xs sm:text-sm">{item.nome}</span>
              <strong className="mt-2 block text-3xl">
                {carregando || erro ? '—' : item.valor}
              </strong>
            </button>
          ))}
        </div>

        {feedback && (
          <p role="status" className={`${painel} text-[var(--ern-sucesso)]`}>
            {feedback}
          </p>
        )}

        <section className={painel} aria-labelledby="carteira-clientes">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="carteira-clientes" className="text-xl font-semibold">
              Carteira de clientes
            </h2>
            <button
              type="button"
              disabled={carregando}
              className={botao}
              onClick={() => {
                setFeedback('');
                setTentativa((atual) => atual + 1);
              }}
            >
              Atualizar clientes
            </button>
          </div>

          <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
            <label className="min-w-0 space-y-2 text-sm">
              <span className="block">Buscar cliente</span>
              <input
                type="search"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Nome, documento, telefone, e-mail ou cidade"
                className={campo}
              />
            </label>
            <label className="min-w-0 space-y-2 text-sm">
              <span className="block">Situação</span>
              <select
                value={situacao}
                onChange={(event) => setSituacao(event.target.value)}
                className={campo}
              >
                <option value="">Todas as situações</option>
                <option value="Ativo">Ativos</option>
                <option value="Inativo">Inativos</option>
              </select>
            </label>
          </div>

          {carregando ? (
            <p role="status" className="py-10">
              Carregando clientes…
            </p>
          ) : erro ? (
            <div role="alert" className="mt-5 space-y-3">
              <p className="text-[var(--ern-erro)]">{erro}</p>
              <button
                type="button"
                className={botao}
                onClick={() => setTentativa((atual) => atual + 1)}
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <>
              <p role="status" className="mt-4 text-sm text-[var(--ern-secundario)]">
                {filtrados.length} de {clientes.length} cliente(s).
              </p>

              {filtrados.length === 0 ? (
                <div className="py-10 text-center">
                  <h3 className="text-lg font-semibold">
                    Nenhum cliente encontrado
                  </h3>
                  <p className="mt-2 text-sm text-[var(--ern-secundario)]">
                    {clientes.length
                      ? 'Ajuste a busca ou a situação selecionada.'
                      : 'Cadastre o primeiro cliente da sua empresa.'}
                  </p>
                  {(busca || situacao) && (
                    <button
                      type="button"
                      className={`${botao} mt-4`}
                      onClick={() => { setBusca(''); setSituacao(''); }}
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="mt-5 grid gap-4 lg:hidden">
                    {filtrados.map((cliente) => (
                      <article key={cliente.id} className={painel}>
                        <h3 className="break-words text-lg font-semibold">
                          {cliente.nome}
                        </h3>
                        <dl className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
                          {detalhes(cliente).map(([nome, valor]) => (
                            <div key={nome} className="min-w-0">
                              <dt className="text-xs text-[var(--ern-secundario)]">
                                {nome}
                              </dt>
                              <dd className="mt-1 text-sm [overflow-wrap:anywhere]">
                                {valor || 'Não informado'}
                              </dd>
                            </div>
                          ))}
                        </dl>
                        <div className="mt-5">{acoes(cliente)}</div>
                      </article>
                    ))}
                  </div>

                  <div className="mt-5 hidden overflow-x-auto lg:block">
                    <table className="w-full min-w-[1050px] text-left text-sm">
                      <caption className="sr-only">
                        Clientes da empresa autenticada
                      </caption>
                      <thead>
                        <tr className="border-b border-[var(--ern-borda)]">
                          {[
                            'Cliente', 'Documento', 'Telefone',
                            'E-mail', 'Cidade', 'Situação', 'Ações',
                          ].map((nome) => (
                            <th key={nome} scope="col" className="px-3 py-4">
                              {nome}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtrados.map((cliente) => (
                          <tr
                            key={cliente.id}
                            className="border-b border-[var(--ern-borda)] align-top hover:bg-[var(--ern-hover)]"
                          >
                            <th scope="row" className="max-w-60 break-words px-3 py-4 font-semibold">
                              {cliente.nome}
                              {cliente.nacionalidade && (
                                <span className="mt-1 block text-xs font-normal text-[var(--ern-secundario)]">
                                  {cliente.nacionalidade}
                                </span>
                              )}
                            </th>
                            {[
                              cliente.documento,
                              cliente.telefone,
                              cliente.email,
                              cliente.cidade,
                              situacaoCliente(cliente),
                            ].map((valor, indice) => (
                              <td
                                key={indice}
                                className="max-w-60 px-3 py-4 [overflow-wrap:anywhere]"
                              >
                                {valor || '—'}
                              </td>
                            ))}
                            <td className="px-3 py-4">{acoes(cliente)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </main>

      <dialog
        ref={dialogo}
        aria-labelledby="titulo-cliente"
        onCancel={(event) => {
          if (travaExclusao.current) event.preventDefault();
        }}
        onClose={() => {
          setSelecionado(null);
          setErroExclusao('');
        }}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-5 text-[var(--ern-texto)] shadow-2xl backdrop:bg-black/70 sm:p-6"
      >
        {selecionado && (
          <>
            <div className="flex items-start justify-between gap-3">
              <h2 id="titulo-cliente" className="min-w-0 break-words text-2xl font-semibold">
                {modo === 'excluir' ? 'Excluir cliente?' : selecionado.nome}
              </h2>
              <button
                type="button"
                className={botao}
                disabled={excluindo}
                aria-label="Fechar janela"
                onClick={fechar}
              >
                ×
              </button>
            </div>

            {modo === 'detalhes' ? (
              <>
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  {detalhes(selecionado).map(([nome, valor]) => (
                    <div key={nome} className="min-w-0">
                      <dt className="text-xs text-[var(--ern-secundario)]">{nome}</dt>
                      <dd className="mt-1 text-sm [overflow-wrap:anywhere]">
                        {valor || 'Não informado'}
                      </dd>
                    </div>
                  ))}
                </dl>
                <h3 className="mt-5 font-semibold">Observações</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 [overflow-wrap:anywhere]">
                  {selecionado.observacoes || 'Nenhuma observação registrada.'}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={`/clientes/editar/${selecionado.id}`} className={botao}>
                    Editar cliente
                  </Link>
                  <button type="button" className={botao} onClick={fechar}>
                    Fechar
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-4 break-words font-semibold">
                  {selecionado.nome}
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--ern-secundario)]">
                  O cadastro será removido permanentemente. As reservas existentes
                  serão mantidas, mas perderão o vínculo com este cliente.
                  Para preservar o cadastro e seus vínculos, você pode editar
                  a situação para Inativo.
                </p>
                {erroExclusao && (
                  <p role="alert" className="mt-4 text-sm text-[var(--ern-erro)]">
                    {erroExclusao}
                  </p>
                )}
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    className={botao}
                    disabled={excluindo}
                    onClick={fechar}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={`${botao} text-[var(--ern-erro)]`}
                    disabled={excluindo}
                    onClick={() => void excluir()}
                  >
                    {excluindo ? 'Excluindo…' : 'Confirmar exclusão'}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </dialog>
    </div>
  );
}
'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Formulario = {
  nome: string;
  documento: string;
  telefone: string;
  email: string;
  cidade: string;
  nacionalidade: string;
  situacao: string;
  observacoes: string;
};

type Contexto = {
  usuarioId: string;
  empresaId: string;
  clienteId: string;
};

const inicial: Formulario = {
  nome: '',
  documento: '',
  telefone: '',
  email: '',
  cidade: '',
  nacionalidade: '',
  situacao: 'Ativo',
  observacoes: '',
};

const painel =
  'min-w-0 rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-4 sm:p-6';

const botao =
  'inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--ern-borda)] px-4 text-sm font-semibold hover:bg-[var(--ern-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ern-destaque)] disabled:cursor-not-allowed disabled:opacity-50';

const campo =
  'min-h-12 w-full min-w-0 rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-3 text-base text-[var(--ern-texto)] outline-none focus:ring-2 focus:ring-[var(--ern-destaque)] disabled:opacity-50';

async function consultarConta() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error('Sua sessão expirou. Entre novamente.');
  }

  const { data: perfil, error: perfilError } = await supabase
    .from('perfis')
    .select('empresa_id')
    .eq('id', data.user.id)
    .single();

  if (perfilError || !perfil?.empresa_id) {
    throw new Error('Não foi possível identificar sua empresa.');
  }

  return {
    usuarioId: data.user.id,
    empresaId: String(perfil.empresa_id),
  };
}

function normalizarSituacao(valor: string | null) {
  const texto = valor?.trim() || '';
  if (!texto || texto.toLowerCase() === 'ativo') return 'Ativo';
  if (texto.toLowerCase() === 'inativo') return 'Inativo';
  return texto;
}

export default function EditarClientePage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [form, setForm] = useState<Formulario>(inicial);
  const [contexto, setContexto] = useState<Contexto | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [resultadoIncerto, setResultadoIncerto] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  const trava = useRef(false);
  const rotaAtual = useRef(id);
  rotaAtual.current = id;

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErroCarga('');
      setErro('');
      setSucesso(false);
      setResultadoIncerto(false);
      setContexto(null);
      setForm({ ...inicial });

      try {
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        ) {
          throw new Error('O endereço deste cadastro não é válido.');
        }

        const conta = await consultarConta();

        const { data, error } = await supabase
          .from('clientes')
          .select(
            'id,empresa_id,nome,documento,telefone,email,cidade,nacionalidade,situacao,observacoes',
          )
          .eq('id', id)
          .eq('empresa_id', conta.empresaId)
          .maybeSingle();

        if (error) {
          throw new Error('Não foi possível consultar este cliente.');
        }

        if (!data || data.empresa_id !== conta.empresaId) {
          throw new Error(
            'Cliente não encontrado ou indisponível para sua conta.',
          );
        }

        const confirmado = await consultarConta();

        if (
          confirmado.usuarioId !== conta.usuarioId ||
          confirmado.empresaId !== conta.empresaId
        ) {
          throw new Error('A sessão mudou. Atualize a página.');
        }

        if (ativo) {
          setForm({
            nome: data.nome ?? '',
            documento: data.documento ?? '',
            telefone: data.telefone ?? '',
            email: data.email ?? '',
            cidade: data.cidade ?? '',
            nacionalidade: data.nacionalidade ?? '',
            situacao: normalizarSituacao(data.situacao),
            observacoes: data.observacoes ?? '',
          });

          setContexto({ ...conta, clienteId: id });
        }
      } catch (falha) {
        if (ativo) {
          setErroCarga(
            falha instanceof Error
              ? falha.message
              : 'Não foi possível carregar o cliente.',
          );
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();
    return () => { ativo = false; };
  }, [id, tentativa]);

  const bloqueado =
    carregando ||
    !contexto ||
    contexto.clienteId !== id ||
    Boolean(erroCarga) ||
    salvando ||
    sucesso ||
    resultadoIncerto;

  function alterar(chave: keyof Formulario, valor: string) {
    if (bloqueado) return;
    setForm((atual) => ({ ...atual, [chave]: valor }));
    setErro('');
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (trava.current || bloqueado || !contexto) return;

    setErro('');

    if (form.nome.trim().length < 3) {
      setErro('Informe um nome com pelo menos 3 caracteres.');
      return;
    }

    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      setErro('Informe um e-mail válido ou deixe o campo vazio.');
      return;
    }

    if (!['Ativo', 'Inativo'].includes(form.situacao)) {
      setErro('Selecione Ativo ou Inativo para a situação do cliente.');
      return;
    }

    trava.current = true;
    setSalvando(true);
    let gravacaoIniciada = false;
    const clienteId = contexto.clienteId;

    try {
      const conta = await consultarConta();

      if (
        conta.usuarioId !== contexto.usuarioId ||
        conta.empresaId !== contexto.empresaId ||
        rotaAtual.current !== clienteId
      ) {
        throw new Error('A sessão ou o cadastro mudou. Atualize a página.');
      }

      const payload = {
        nome: form.nome.trim(),
        documento: form.documento.trim() || null,
        telefone: form.telefone.trim() || null,
        email: form.email.trim().toLowerCase() || null,
        cidade: form.cidade.trim() || null,
        nacionalidade: form.nacionalidade.trim() || null,
        situacao: form.situacao,
        observacoes: form.observacoes.trim() || null,
      };

      gravacaoIniciada = true;

      const { data, error } = await supabase
        .from('clientes')
        .update(payload)
        .eq('id', clienteId)
        .eq('empresa_id', conta.empresaId)
        .select(
          'id,empresa_id,nome,documento,telefone,email,cidade,nacionalidade,situacao,observacoes',
        )
        .maybeSingle();

      if (error) {
        throw new Error('A atualização não foi confirmada pelo serviço.');
      }

      if (!data) {
        gravacaoIniciada = false;
        throw new Error(
          'Nenhum cadastro foi atualizado. O cliente pode ter sido removido ou seu acesso pode ter mudado.',
        );
      }

      const campos = Object.keys(payload) as Array<keyof typeof payload>;

      if (
        data.id !== clienteId ||
        data.empresa_id !== conta.empresaId ||
        campos.some((chave) => data[chave] !== payload[chave])
      ) {
        throw new Error(
          'Os dados retornados não confirmam todas as alterações.',
        );
      }

      if (rotaAtual.current !== clienteId) return;

      setSucesso(true);
      router.replace('/clientes');
      router.refresh();
    } catch (falha) {
      if (rotaAtual.current !== clienteId) return;

      if (gravacaoIniciada) {
        setResultadoIncerto(true);
        setErro(
          'Não foi possível confirmar a atualização. Confira o cliente na listagem antes de editar novamente.',
        );
      } else {
        setErro(
          falha instanceof Error
            ? falha.message
            : 'Não foi possível salvar as alterações.',
        );
      }
    } finally {
      trava.current = false;
      setSalvando(false);
    }
  }

  const campos: Array<{
    chave: keyof Formulario;
    titulo: string;
    tipo: string;
    autocomplete?: string;
  }> = [
    {
      chave: 'nome',
      titulo: 'Nome completo *',
      tipo: 'text',
      autocomplete: 'name',
    },
    { chave: 'documento', titulo: 'CPF / Documento', tipo: 'text' },
    {
      chave: 'telefone',
      titulo: 'Telefone / WhatsApp',
      tipo: 'tel',
      autocomplete: 'tel',
    },
    {
      chave: 'email',
      titulo: 'E-mail',
      tipo: 'email',
      autocomplete: 'email',
    },
    {
      chave: 'cidade',
      titulo: 'Cidade / UF',
      tipo: 'text',
      autocomplete: 'address-level2',
    },
    { chave: 'nacionalidade', titulo: 'Nacionalidade', tipo: 'text' },
  ];

  return (
    <main className="min-h-screen min-w-0 bg-[var(--ern-fundo)] px-4 py-7 text-[var(--ern-texto)] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--ern-destaque)]">
              Clientes · Edição
            </p>
            <h1
              className="mt-2 text-4xl"
              style={{ fontFamily: 'var(--font-fraunces), serif' }}
            >
              Editar cliente
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--ern-secundario)]">
              Atualize os dados de contato e as informações para o atendimento.
            </p>
          </div>
          {!salvando && (
            <Link href="/clientes" className={botao}>
              Voltar para clientes
            </Link>
          )}
        </header>

        {carregando ? (
          <p role="status" className={painel}>Carregando cliente…</p>
        ) : erroCarga ? (
          <section role="alert" className={painel}>
            <p className="text-[var(--ern-erro)]">{erroCarga}</p>
            <button
              type="button"
              className={`${botao} mt-4`}
              onClick={() => setTentativa((atual) => atual + 1)}
            >
              Tentar novamente
            </button>
          </section>
        ) : (
          <>
            {erro && (
              <div role="alert" className={painel}>
                <p className="text-[var(--ern-erro)]">{erro}</p>
                {resultadoIncerto && (
                  <Link href="/clientes" className={`${botao} mt-4`}>
                    Conferir cliente na listagem
                  </Link>
                )}
              </div>
            )}

            {sucesso && (
              <p role="status" className={`${painel} text-[var(--ern-sucesso)]`}>
                Cliente atualizado. Abrindo a listagem…
              </p>
            )}

            <form onSubmit={salvar} className={painel}>
              <h2 className="text-xl font-semibold">Dados do viajante</h2>
              <p className="mt-2 text-sm text-[var(--ern-secundario)]">
                O nome é obrigatório. Os demais dados podem ser complementados.
              </p>

              <fieldset disabled={bloqueado} className="mt-6 min-w-0">
                <legend className="sr-only">Informações do cliente</legend>
                <div className="grid min-w-0 gap-5 sm:grid-cols-2">
                  {campos.map((item) => (
                    <div
                      key={item.chave}
                      className={`min-w-0 ${item.chave === 'nome' ? 'sm:col-span-2' : ''}`}
                    >
                      <label
                        htmlFor={item.chave}
                        className="mb-2 block text-sm"
                      >
                        {item.titulo}
                      </label>
                      <input
                        id={item.chave}
                        name={item.chave}
                        type={item.tipo}
                        autoComplete={item.autocomplete}
                        required={item.chave === 'nome'}
                        minLength={item.chave === 'nome' ? 3 : undefined}
                        value={form[item.chave]}
                        onChange={(event) =>
                          alterar(item.chave, event.target.value)
                        }
                        className={campo}
                      />
                    </div>
                  ))}

                  <div className="min-w-0">
                    <label htmlFor="situacao" className="mb-2 block text-sm">
                      Situação
                    </label>
                    <select
                      id="situacao"
                      value={form.situacao}
                      onChange={(event) =>
                        alterar('situacao', event.target.value)
                      }
                      className={campo}
                    >
                      {!['Ativo', 'Inativo'].includes(form.situacao) && (
                        <option value={form.situacao}>
                          {form.situacao} — selecione uma situação
                        </option>
                      )}
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                    <p className="mt-2 text-xs leading-5 text-[var(--ern-secundario)]">
                      Inativar preserva o cadastro e seus vínculos com reservas.
                    </p>
                  </div>

                  <div className="min-w-0 sm:col-span-2">
                    <label
                      htmlFor="observacoes"
                      className="mb-2 block text-sm"
                    >
                      Observações
                    </label>
                    <textarea
                      id="observacoes"
                      rows={6}
                      value={form.observacoes}
                      onChange={(event) =>
                        alterar('observacoes', event.target.value)
                      }
                      className={`${campo} py-3 leading-6`}
                    />
                  </div>
                </div>
              </fieldset>

              <div className="mt-6 flex flex-col gap-3 border-t border-[var(--ern-borda)] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={salvando || sucesso}
                  className={botao}
                  onClick={() => router.push('/clientes')}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={bloqueado}
                  className={`${botao} bg-[var(--ern-botao)] text-[var(--ern-sobre-botao)]`}
                >
                  {salvando ? 'Salvando…' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
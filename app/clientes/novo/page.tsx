'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
};

type Uso = {
  plano: string;
  total: number;
  limite: number | null;
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

async function consultarContexto(): Promise<Contexto> {
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

async function consultarUso(): Promise<Uso> {
  const { data, error } = await supabase.rpc('get_meu_uso_clientes');

  if (error) {
    throw new Error('Não foi possível consultar o limite de clientes.');
  }

  const registro: unknown = Array.isArray(data)
    ? data.length === 1 ? data[0] : null
    : data;

  if (!registro || typeof registro !== 'object') {
    throw new Error('Não foi possível identificar uma assinatura ativa.');
  }

  const item = registro as Record<string, unknown>;
  const total = Number(item.total_clientes);
  const limite = item.limite_clientes === null
    ? null
    : Number(item.limite_clientes);

  if (
    typeof item.plano_nome !== 'string' ||
    item.total_clientes === null ||
    item.total_clientes === undefined ||
    !Number.isSafeInteger(total) ||
    total < 0 ||
    (
      limite !== null &&
      (
        item.limite_clientes === undefined ||
        !Number.isSafeInteger(limite) ||
        limite < 0
      )
    )
  ) {
    throw new Error('O serviço retornou informações inválidas do plano.');
  }

  return { plano: item.plano_nome, total, limite };
}

function formatarDocumento(valor: string) {
  const entrada = valor.toUpperCase().slice(0, 30);

  if (/[A-Z]/.test(entrada)) {
    return entrada.replace(/[^A-Z0-9./-]/g, '');
  }

  const numeros = entrada.replace(/\D/g, '');

  if (numeros.length > 11) return numeros;

  return numeros
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function formatarTelefone(valor: string) {
  const numeros = valor.replace(/\D/g, '').slice(0, 15);

  if (valor.trim().startsWith('+')) return `+${numeros}`;
  if (numeros.length > 11) return numeros;

  return numeros
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(
      numeros.length <= 10 ? /(\d{4})(\d)/ : /(\d{5})(\d)/,
      '$1-$2',
    );
}

export default function NovoClientePage() {
  const router = useRouter();
  const [form, setForm] = useState<Formulario>(inicial);
  const [contexto, setContexto] = useState<Contexto | null>(null);
  const [uso, setUso] = useState<Uso | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroConsulta, setErroConsulta] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [resultadoIncerto, setResultadoIncerto] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  const trava = useRef(false);
  const idCadastro = useRef<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErroConsulta('');
      setContexto(null);
      setUso(null);

      try {
        const atual = await consultarContexto();
        const consumo = await consultarUso();
        const confirmado = await consultarContexto();

        if (
          atual.usuarioId !== confirmado.usuarioId ||
          atual.empresaId !== confirmado.empresaId
        ) {
          throw new Error('A sessão mudou. Atualize a página.');
        }

        if (ativo) {
          setContexto(atual);
          setUso(consumo);
        }
      } catch (falha) {
        if (ativo) {
          setErroConsulta(
            falha instanceof Error
              ? falha.message
              : 'Não foi possível consultar o plano.',
          );
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();
    return () => { ativo = false; };
  }, [tentativa]);

  const limiteAtingido =
    uso !== null &&
    uso.limite !== null &&
    uso.total >= uso.limite;

  const bloqueado =
    carregando ||
    !contexto ||
    !uso ||
    Boolean(erroConsulta) ||
    salvando ||
    sucesso ||
    resultadoIncerto ||
    limiteAtingido;

  function alterar(chave: keyof Formulario, valor: string) {
    if (bloqueado) return;

    const ajustado = chave === 'documento'
      ? formatarDocumento(valor)
      : chave === 'telefone'
        ? formatarTelefone(valor)
        : valor;

    setForm((atual) => ({ ...atual, [chave]: ajustado }));
    setErro('');
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (trava.current || bloqueado || !contexto) return;

    setErro('');

    if (
      form.nome.trim().length < 3 ||
      !form.documento.trim() ||
      !form.telefone.trim() ||
      !form.email.trim() ||
      !form.cidade.trim()
    ) {
      setErro('Preencha os campos obrigatórios. O nome precisa ter pelo menos 3 caracteres.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setErro('Informe um e-mail válido.');
      return;
    }

    const digitos = form.telefone.replace(/\D/g, '');
    const minimo = form.telefone.startsWith('+') ? 7 : 10;

    if (digitos.length < minimo || digitos.length > 15) {
      setErro('Confira o telefone. Para números internacionais, utilize + e o código do país.');
      return;
    }

    if (!['Ativo', 'Inativo'].includes(form.situacao)) {
      setErro('Selecione uma situação válida.');
      return;
    }

    trava.current = true;
    setSalvando(true);
    let gravacaoIniciada = false;

    try {
      const atual = await consultarContexto();

      if (
        atual.usuarioId !== contexto.usuarioId ||
        atual.empresaId !== contexto.empresaId
      ) {
        throw new Error('A sessão mudou. Atualize a página antes de cadastrar.');
      }

      const consumo = await consultarUso();
      setUso(consumo);

      if (consumo.limite !== null && consumo.total >= consumo.limite) {
        throw new Error('O limite de clientes do plano foi atingido.');
      }

      const confirmado = await consultarContexto();

      if (
        confirmado.usuarioId !== atual.usuarioId ||
        confirmado.empresaId !== atual.empresaId
      ) {
        throw new Error('A sessão mudou. Atualize a página.');
      }

      idCadastro.current ??= crypto.randomUUID();

      const payload = {
        id: idCadastro.current,
        empresa_id: atual.empresaId,
        nome: form.nome.trim(),
        documento: form.documento.trim(),
        telefone: form.telefone.trim(),
        email: form.email.trim().toLowerCase(),
        cidade: form.cidade.trim(),
        nacionalidade: form.nacionalidade.trim() || null,
        situacao: form.situacao,
        observacoes: form.observacoes.trim() || null,
      };

      gravacaoIniciada = true;

      const { data, error } = await supabase
        .from('clientes')
        .insert(payload)
        .select('id,empresa_id')
        .single();

      if (error) {
        const mensagem = error.message ?? '';

        if (
          mensagem.includes('ERN_LIMITE_CLIENTES_ATINGIDO') ||
          mensagem.includes('ERN_ASSINATURA_NAO_ENCONTRADA') ||
          mensagem.includes('ERN_USUARIO_SEM_EMPRESA')
        ) {
          gravacaoIniciada = false;
          throw new Error(
            mensagem.includes('ERN_LIMITE_CLIENTES_ATINGIDO')
              ? 'O limite foi atingido durante o cadastro. Atualize a consulta do plano.'
              : 'Não foi possível validar sua empresa ou assinatura. Atualize a página.',
          );
        }

        throw new Error('Não foi possível confirmar o cadastro.');
      }

      if (
        data?.id !== payload.id ||
        data.empresa_id !== atual.empresaId
      ) {
        throw new Error('Não foi possível confirmar o vínculo do cadastro.');
      }

      setSucesso(true);
      router.replace('/clientes');
      router.refresh();
    } catch (falha) {
      if (gravacaoIniciada) {
        setResultadoIncerto(true);
        setErro(
          'O cadastro não foi confirmado. Para evitar duplicação, confira a listagem antes de iniciar outro cadastro.',
        );
      } else {
        setErro(
          falha instanceof Error
            ? falha.message
            : 'Não foi possível salvar o cliente.',
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
    obrigatorio: boolean;
    maximo: number;
    autocomplete?: string;
  }> = [
    {
      chave: 'nome', titulo: 'Nome completo', tipo: 'text',
      obrigatorio: true, maximo: 150, autocomplete: 'name',
    },
    {
      chave: 'documento', titulo: 'CPF / Documento', tipo: 'text',
      obrigatorio: true, maximo: 30,
    },
    {
      chave: 'telefone', titulo: 'Telefone / WhatsApp', tipo: 'tel',
      obrigatorio: true, maximo: 25, autocomplete: 'tel',
    },
    {
      chave: 'email', titulo: 'E-mail', tipo: 'email',
      obrigatorio: true, maximo: 254, autocomplete: 'email',
    },
    {
      chave: 'cidade', titulo: 'Cidade / UF', tipo: 'text',
      obrigatorio: true, maximo: 120, autocomplete: 'address-level2',
    },
    {
      chave: 'nacionalidade', titulo: 'Nacionalidade', tipo: 'text',
      obrigatorio: false, maximo: 100,
    },
  ];

  return (
    <main className="min-h-screen min-w-0 bg-[var(--ern-fundo)] px-4 py-7 text-[var(--ern-texto)] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--ern-destaque)]">
              Clientes · Cadastro
            </p>
            <h1
              className="mt-2 text-4xl"
              style={{ fontFamily: 'var(--font-fraunces), serif' }}
            >
              Novo cliente
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--ern-secundario)]">
              Cadastre os dados do viajante para utilização na operação.
            </p>
          </div>
          {!salvando && (
            <Link href="/clientes" className={botao}>
              Voltar para clientes
            </Link>
          )}
        </header>

        <section className={painel} aria-label="Uso do plano">
          {carregando ? (
            <p role="status">Consultando o plano…</p>
          ) : erroConsulta ? (
            <div role="alert" className="space-y-3">
              <p className="text-[var(--ern-erro)]">{erroConsulta}</p>
              <button
                type="button"
                className={botao}
                onClick={() => setTentativa((atual) => atual + 1)}
              >
                Tentar novamente
              </button>
            </div>
          ) : uso ? (
            <>
              <h2 className="text-lg font-semibold">{uso.plano}</h2>
              <p className="mt-2 text-sm text-[var(--ern-secundario)]">
                {uso.total} cliente(s) cadastrado(s)
                {uso.limite === null
                  ? ' · sem limite de clientes no plano.'
                  : ` · limite de ${uso.limite} · ${Math.max(uso.limite - uso.total, 0)} vaga(s).`}
              </p>
              {uso.limite !== null && (
                <progress
                  aria-label="Utilização do limite de clientes"
                  value={Math.min(uso.total, Math.max(uso.limite, 1))}
                  max={Math.max(uso.limite, 1)}
                  className="mt-4 h-3 w-full accent-[var(--ern-destaque)]"
                />
              )}
              {limiteAtingido && (
                <p role="status" className="mt-3 text-sm text-[var(--ern-alerta)]">
                  Limite atingido. Os clientes existentes continuam disponíveis.
                  {' '}<Link href="/planos" className="underline">Consultar planos</Link>
                </p>
              )}
              <button
                type="button"
                className={`${botao} mt-4`}
                disabled={salvando || sucesso || resultadoIncerto}
                onClick={() => setTentativa((atual) => atual + 1)}
              >
                Atualizar consulta do plano
              </button>
            </>
          ) : null}
        </section>

        {erro && (
          <div role="alert" className={`${painel} text-[var(--ern-erro)]`}>
            <p>{erro}</p>
            {resultadoIncerto && (
              <Link href="/clientes" className={`${botao} mt-4`}>
                Conferir clientes
              </Link>
            )}
          </div>
        )}

        {sucesso && (
          <p role="status" className={`${painel} text-[var(--ern-sucesso)]`}>
            Cliente cadastrado. Abrindo a listagem…
          </p>
        )}

        <form onSubmit={salvar} className={painel}>
          <h2 className="text-xl font-semibold">Dados do viajante</h2>
          <p className="mt-2 text-sm text-[var(--ern-secundario)]">
            Os campos marcados com * são obrigatórios.
          </p>

          <fieldset disabled={bloqueado} className="mt-6 min-w-0">
            <legend className="sr-only">Informações do cliente</legend>
            <div className="grid min-w-0 gap-5 sm:grid-cols-2">
              {campos.map((item) => (
                <div
                  key={item.chave}
                  className={`min-w-0 ${item.chave === 'nome' ? 'sm:col-span-2' : ''}`}
                >
                  <label htmlFor={item.chave} className="mb-2 block text-sm">
                    {item.titulo}{item.obrigatorio ? ' *' : ''}
                  </label>
                  <input
                    id={item.chave}
                    name={item.chave}
                    type={item.tipo}
                    required={item.obrigatorio}
                    minLength={item.chave === 'nome' ? 3 : undefined}
                    maxLength={item.maximo}
                    autoComplete={item.autocomplete}
                    value={form[item.chave]}
                    onChange={(event) => alterar(item.chave, event.target.value)}
                    className={campo}
                  />
                  {item.chave === 'documento' && (
                    <p className="mt-2 text-xs leading-5 text-[var(--ern-secundario)]">
                      Aceita CPF, passaporte e documentos internacionais.
                      A máscara não valida a autenticidade do documento.
                    </p>
                  )}
                  {item.chave === 'telefone' && (
                    <p className="mt-2 text-xs leading-5 text-[var(--ern-secundario)]">
                      Para números internacionais, comece com + e o código do país.
                    </p>
                  )}
                </div>
              ))}

              <div className="min-w-0">
                <label htmlFor="situacao" className="mb-2 block text-sm">
                  Situação
                </label>
                <select
                  id="situacao"
                  value={form.situacao}
                  onChange={(event) => alterar('situacao', event.target.value)}
                  className={campo}
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>

              <div className="min-w-0 sm:col-span-2">
                <label htmlFor="observacoes" className="mb-2 block text-sm">
                  Observações
                </label>
                <textarea
                  id="observacoes"
                  rows={4}
                  maxLength={2000}
                  value={form.observacoes}
                  onChange={(event) => alterar('observacoes', event.target.value)}
                  className={`${campo} py-3`}
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
              type="button"
              disabled={bloqueado}
              className={botao}
              onClick={() => {
                setForm({ ...inicial });
                setErro('');
                idCadastro.current = null;
              }}
            >
              Limpar
            </button>
            <button
              type="submit"
              disabled={bloqueado}
              className={`${botao} bg-[var(--ern-botao)] text-[var(--ern-sobre-botao)]`}
            >
              {salvando
                ? 'Salvando…'
                : carregando
                  ? 'Verificando plano…'
                  : 'Salvar cliente'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
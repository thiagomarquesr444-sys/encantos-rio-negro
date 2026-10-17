'use client';

import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { supabase } from '@/lib/supabase';

type Role =
  | 'admin_empresa'
  | 'operador_empresa'
  | 'financeiro'
  | 'guia';

type Membro = {
  id: string;
  nome: string | null;
  email: string | null;
  role: string | null;
  created_at: string;
};

type DadosEquipe = {
  ok: true;
  plano: {
    codigo: string;
    nome: string;
    limite_usuarios: number | null;
  };
  uso: {
    total_usuarios: number;
    ilimitado: boolean;
    restante: number | null;
    limite_atingido: boolean;
  };
  membros: Membro[];
};

const PERFIS: Record<Role, string> = {
  admin_empresa: 'Administrador',
  operador_empresa: 'Operador',
  financeiro: 'Financeiro',
  guia: 'Guia da empresa',
};

function objeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

function inteiro(valor: unknown): valor is number {
  return (
    typeof valor === 'number' &&
    Number.isSafeInteger(valor) &&
    valor >= 0
  );
}

function dadosValidos(valor: unknown): valor is DadosEquipe {
  if (
    !objeto(valor) ||
    valor.ok !== true ||
    !objeto(valor.plano) ||
    !objeto(valor.uso) ||
    !Array.isArray(valor.membros)
  ) {
    return false;
  }

  const { plano, uso, membros } = valor;

  return (
    typeof plano.codigo === 'string' &&
    typeof plano.nome === 'string' &&
    (plano.limite_usuarios === null || inteiro(plano.limite_usuarios)) &&
    inteiro(uso.total_usuarios) &&
    typeof uso.ilimitado === 'boolean' &&
    (uso.restante === null || inteiro(uso.restante)) &&
    typeof uso.limite_atingido === 'boolean' &&
    membros.every(
      (membro) =>
        objeto(membro) &&
        typeof membro.id === 'string' &&
        (membro.nome === null || typeof membro.nome === 'string') &&
        (membro.email === null || typeof membro.email === 'string') &&
        (membro.role === null || typeof membro.role === 'string') &&
        typeof membro.created_at === 'string',
    ) &&
    new Set(membros.map((membro) => membro.id)).size === membros.length
  );
}

function erroResposta(valor: unknown, padrao: string) {
  return objeto(valor) && typeof valor.erro === 'string'
    ? valor.erro
    : padrao;
}

function explicarFalha(falha: unknown, padrao: string) {
  return falha instanceof Error ? falha.message : padrao;
}

function normalizar(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function nomePerfil(valor: string | null) {
  return valor && Object.prototype.hasOwnProperty.call(PERFIS, valor)
    ? PERFIS[valor as Role]
    : 'Perfil não identificado';
}

function formatarData(valor: string) {
  const data = new Date(valor);

  return Number.isFinite(data.getTime())
    ? data.toLocaleDateString('pt-BR', {
        timeZone: 'America/Manaus',
      })
    : 'Data não disponível';
}

async function obterToken() {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    throw new Error('Sua sessão não está disponível. Entre novamente.');
  }

  return data.session.access_token;
}

export default function EquipePage() {
  const [dados, setDados] = useState<DadosEquipe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  const [atualizacao, setAtualizacao] = useState(0);
  const [busca, setBusca] = useState('');

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('operador_empresa');
  const [salvando, setSalvando] = useState(false);

  const [feedback, setFeedback] = useState<{
    tipo: 'erro' | 'sucesso';
    texto: string;
  } | null>(null);

  const trava = useRef(false);
  const aviso = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const controlador = new AbortController();
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErroCarga('');
      setDados(null);

      try {
        const token = await obterToken();

        if (!ativo) return;

        const resposta = await fetch('/api/equipe', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
          signal: controlador.signal,
        });

        const json: unknown = await resposta.json().catch(() => null);

        if (!resposta.ok) {
          throw new Error(
            erroResposta(json, 'Não foi possível carregar a equipe.'),
          );
        }

        if (!dadosValidos(json)) {
          throw new Error(
            'A resposta da equipe está incompleta. Atualize os dados.',
          );
        }

        if (ativo) setDados(json);
      } catch (falha) {
        if (ativo) {
          setErroCarga(
            explicarFalha(falha, 'Não foi possível carregar a equipe.'),
          );
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();

    return () => {
      ativo = false;
      controlador.abort();
    };
  }, [atualizacao]);

  useEffect(() => {
    if (feedback) aviso.current?.focus();
  }, [feedback]);

  const membrosFiltrados = useMemo(() => {
    const termo = normalizar(busca);

    return (dados?.membros ?? []).filter(
      (membro) =>
        !termo ||
        normalizar(
          `${membro.nome ?? ''} ${membro.email ?? ''} ${nomePerfil(membro.role)}`,
        ).includes(termo),
    );
  }, [dados, busca]);

  async function convidar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      trava.current ||
      carregando ||
      !dados ||
      dados.uso.limite_atingido
    ) {
      return;
    }

    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim().toLowerCase();

    if (nomeLimpo.length < 3 || nomeLimpo.length > 100) {
      setFeedback({
        tipo: 'erro',
        texto: 'Informe um nome entre 3 e 100 caracteres.',
      });
      return;
    }

    if (
      emailLimpo.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)
    ) {
      setFeedback({
        tipo: 'erro',
        texto: 'Informe um e-mail válido.',
      });
      return;
    }

    if (!Object.prototype.hasOwnProperty.call(PERFIS, role)) return;

    trava.current = true;
    setSalvando(true);
    setFeedback(null);

    try {
      const token = await obterToken();

      const resposta = await fetch('/api/equipe', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: nomeLimpo,
          email: emailLimpo,
          role,
        }),
      });

      const json: unknown = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        throw new Error(
          erroResposta(json, 'Não foi possível concluir o convite.'),
        );
      }

      if (!objeto(json) || json.ok !== true) {
        throw new Error(
          'Não foi possível confirmar o resultado. Atualize a equipe antes de repetir o convite.',
        );
      }

      setNome('');
      setEmail('');
      setRole('operador_empresa');
      setFeedback({
        tipo: 'sucesso',
        texto:
          'O serviço de autenticação aceitou o convite. A entrega depende do serviço de e-mail; confira com o destinatário.',
      });

      setAtualizacao((valor) => valor + 1);
    } catch (falha) {
      setFeedback({
        tipo: 'erro',
        texto: explicarFalha(
          falha,
          'Não foi possível confirmar o convite. Atualize a equipe antes de tentar novamente.',
        ),
      });
    } finally {
      trava.current = false;
      setSalvando(false);
    }
  }

  const painel =
    'min-w-0 rounded-2xl border border-[var(--ern-borda)] ' +
    'bg-[var(--ern-painel)] p-4 sm:p-6';

  const campo =
    'mt-2 min-h-12 w-full min-w-0 rounded-xl border ' +
    'border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-3 ' +
    'text-base text-[var(--ern-texto)] outline-none ' +
    'focus-visible:ring-2 focus-visible:ring-[var(--ern-destaque)] ' +
    'disabled:opacity-60';

  const botao =
    'inline-flex min-h-12 items-center justify-center rounded-xl ' +
    'border border-[var(--ern-borda)] px-4 text-sm font-semibold ' +
    'focus-visible:outline-none focus-visible:ring-2 ' +
    'focus-visible:ring-[var(--ern-destaque)] disabled:opacity-60';

  const bloqueado =
    carregando || salvando || !dados || dados.uso.limite_atingido;

  return (
    <main className="min-h-screen min-w-0 bg-[var(--ern-fundo)] text-[var(--ern-texto)]">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--ern-destaque)]">
              Configurações
            </p>
            <h1
              className="mt-2 text-3xl sm:text-4xl"
              style={{ fontFamily: 'var(--font-fraunces), serif' }}
            >
              Equipe da empresa
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--ern-secundario)]">
              Organize os acessos da sua operadora. Cada pessoa utiliza
              sua própria conta.
            </p>
          </div>

          <Link href="/configuracoes" className={botao}>
            Voltar às configurações
          </Link>
        </header>

        {carregando && (
          <p role="status" className={painel}>
            Consultando equipe e limites do plano…
          </p>
        )}

        {erroCarga && (
          <section role="alert" className={painel}>
            <h2 className="font-semibold">Equipe indisponível</h2>
            <p className="mt-2 text-sm leading-6">{erroCarga}</p>
            <button
              type="button"
              disabled={salvando}
              onClick={() => setAtualizacao((valor) => valor + 1)}
              className={`${botao} mt-4`}
            >
              Tentar novamente
            </button>
          </section>
        )}

        {dados && !carregando && (
          <>
            <section
              aria-label="Plano e ocupação da equipe"
              className="grid min-w-0 gap-4 sm:grid-cols-3"
            >
              <div className={painel}>
                <p className="text-sm text-[var(--ern-secundario)]">
                  Plano atual
                </p>
                <p className="mt-2 break-words text-xl font-semibold">
                  {dados.plano.nome}
                </p>
              </div>

              <div className={painel}>
                <p className="text-sm text-[var(--ern-secundario)]">
                  Usuários vinculados
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {dados.uso.total_usuarios}
                </p>
              </div>

              <div className={painel}>
                <p className="text-sm text-[var(--ern-secundario)]">
                  Vagas disponíveis
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {dados.uso.ilimitado
                    ? 'Sem limite'
                    : dados.uso.restante}
                </p>
              </div>
            </section>

            <section className={painel} aria-labelledby="titulo-membros">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 id="titulo-membros" className="text-lg font-semibold">
                  Pessoas da empresa
                </h2>
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => setAtualizacao((valor) => valor + 1)}
                  className={botao}
                >
                  Atualizar equipe
                </button>
              </div>

              <label className="mt-4 block text-sm">
                Buscar por nome, e-mail ou perfil
                <input
                  name="busca_equipe"
                  type="search"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  className={campo}
                />
              </label>

              <p className="mt-3 text-xs text-[var(--ern-secundario)]">
                {membrosFiltrados.length} pessoa(s) nesta listagem.
              </p>

              <ul className="mt-4 grid min-w-0 gap-3 lg:grid-cols-2">
                {membrosFiltrados.map((membro) => (
                  <li
                    key={membro.id}
                    className="min-w-0 rounded-xl border border-[var(--ern-borda)] p-4"
                  >
                    <p className="break-words font-semibold">
                      {membro.nome || 'Nome não informado'}
                    </p>
                    <p className="mt-2 break-all text-sm text-[var(--ern-secundario)]">
                      {membro.email || 'E-mail não disponível'}
                    </p>
                    <p className="mt-3 text-sm font-medium">
                      {nomePerfil(membro.role)}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[var(--ern-secundario)]">
                      Cadastro do perfil: {formatarData(membro.created_at)}
                    </p>
                  </li>
                ))}
              </ul>

              {membrosFiltrados.length === 0 && (
                <p className="mt-4 text-sm leading-6">
                  {busca.trim()
                    ? 'Nenhuma pessoa corresponde à busca.'
                    : 'Nenhum membro retornado pela consulta.'}
                </p>
              )}
            </section>

            <section className={painel} aria-labelledby="titulo-convite">
              <h2 id="titulo-convite" className="text-lg font-semibold">
                Convidar pessoa
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--ern-secundario)]">
                Confira o endereço antes de enviar. O convite solicita
                um acesso vinculado à sua empresa.
              </p>

              {dados.uso.limite_atingido ? (
                <div className="mt-4 space-y-3">
                  <p className="text-sm leading-6">
                    O limite de usuários do plano foi atingido.
                  </p>
                  <Link href="/planos" className={botao}>
                    Consultar planos
                  </Link>
                </div>
              ) : (
                <form
                  onSubmit={convidar}
                  aria-busy={salvando}
                  className="mt-5 space-y-4"
                >
                  <fieldset
                    disabled={bloqueado}
                    className="grid min-w-0 gap-4 sm:grid-cols-2"
                  >
                    <legend className="sr-only">
                      Dados da pessoa convidada
                    </legend>

                    <label className="min-w-0 text-sm">
                      Nome
                      <input
                        name="nome_membro"
                        autoComplete="name"
                        required
                        minLength={3}
                        maxLength={100}
                        value={nome}
                        onChange={(event) => setNome(event.target.value)}
                        className={campo}
                      />
                    </label>

                    <label className="min-w-0 text-sm">
                      E-mail
                      <input
                        name="email_membro"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck={false}
                        required
                        maxLength={254}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className={campo}
                      />
                    </label>

                    <label className="min-w-0 text-sm sm:col-span-2">
                      Perfil solicitado
                      <select
                        name="perfil_membro"
                        value={role}
                        onChange={(event) =>
                          setRole(event.target.value as Role)
                        }
                        className={campo}
                      >
                        {(Object.keys(PERFIS) as Role[]).map((perfil) => (
                          <option key={perfil} value={perfil}>
                            {PERFIS[perfil]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </fieldset>

                  <p className="text-xs leading-6 text-[var(--ern-secundario)]">
                    {role === 'admin_empresa'
                      ? 'Administrador pode gerenciar configurações e equipe. Conceda esse perfil apenas a uma pessoa de confiança.'
                      : role === 'guia'
                        ? 'Este perfil pertence à equipe da operadora. É diferente do cadastro independente de Guia ERN.'
                        : 'Selecione o perfil correspondente à função da pessoa na empresa.'}
                  </p>

                  <button
                    type="submit"
                    disabled={bloqueado}
                    className={`${botao} w-full sm:w-auto`}
                  >
                    {salvando ? 'Enviando convite…' : 'Enviar convite'}
                  </button>
                </form>
              )}
            </section>
          </>
        )}

        {feedback && (
          <p
            ref={aviso}
            tabIndex={-1}
            role={feedback.tipo === 'erro' ? 'alert' : 'status'}
            className={`${painel} text-sm leading-6 outline-none`}
          >
            {feedback.texto}
          </p>
        )}
      </div>
    </main>
  );
}
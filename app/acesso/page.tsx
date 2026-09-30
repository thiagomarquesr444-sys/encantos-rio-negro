'use client';

import {
  Suspense,
  useEffect,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import LogoERN from '@/app/components/LogoERN';
import { supabase } from '@/lib/supabase';
import {
  carregarAcessosConta,
  contaPossuiAcesso,
  interpretarTipoAcesso,
  type AcessosConta,
  type TipoAcesso,
  type TipoAcessoProfissional,
} from '@/lib/acessos';

const destinos: Record<TipoAcesso, string> = {
  operadora: '/dashboard',
  guia: '/guia',
  fornecedor: '/fornecedor',
};

const titulos: Record<TipoAcesso, string> = {
  operadora: 'Gestão da operadora',
  guia: 'Meu espaço de guia',
  fornecedor: 'Meu espaço de fornecedor',
};

const descricoes: Record<TipoAcesso, string> = {
  operadora:
    'Acesse a operação da sua empresa conforme as permissões do seu usuário.',
  guia:
    'Mantenha seu cadastro individual de guia na Encantos Rio Negro.',
  fornecedor:
    'Mantenha o cadastro profissional dos produtos e serviços da sua atividade.',
};

function acessosIndependentes(
  conta: AcessosConta,
): TipoAcessoProfissional[] {
  const tipos: TipoAcessoProfissional[] = [
    'guia',
    'fornecedor',
  ];

  return tipos.filter((tipo) =>
    contaPossuiAcesso(conta, tipo),
  );
}

function possuiVinculoEmpresarial(
  conta: AcessosConta,
): boolean {
  return Boolean(conta.empresa_id);
}

function mensagemErro(
  erro: unknown,
  alternativa: string,
): string {
  return erro instanceof Error
    ? erro.message
    : alternativa;
}

function ConteudoAcesso() {
  const searchParams = useSearchParams();
  const solicitado = interpretarTipoAcesso(
    searchParams.get('acesso'),
  );

  const [conta, setConta] =
    useState<AcessosConta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState<
    'entrar' | 'ativar' | 'sair' | null
  >(null);
  const [erro, setErro] = useState('');

  const ocupado = useRef(false);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const atual = await carregarAcessosConta();

        if (!ativo) return;

        setConta(atual);

        if (contaPossuiAcesso(atual, 'operadora')) {
          ocupado.current = true;
          setProcessando('entrar');
          window.location.replace(destinos.operadora);
        }
      } catch (error) {
        if (!ativo) return;

        ocupado.current = false;
        setProcessando(null);
        setErro(
          mensagemErro(
            error,
            'Não foi possível consultar sua conta.',
          ),
        );
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, []);

  const empresarial = conta
    ? possuiVinculoEmpresarial(conta)
    : false;

  const independentes = conta
    ? acessosIndependentes(conta)
    : [];

  const conflito =
    !empresarial && independentes.length > 1;

  const existente: TipoAcesso | null = conta
    ? contaPossuiAcesso(conta, 'operadora')
      ? 'operadora'
      : !empresarial && independentes.length === 1
        ? independentes[0]
        : null
    : null;

  const novoTipo: TipoAcessoProfissional | null =
    conta &&
    !empresarial &&
    independentes.length === 0 &&
    (solicitado === 'guia' ||
      solicitado === 'fornecedor')
      ? solicitado
      : null;

  const tipoExibido = existente ?? novoTipo;
  const bloqueado = processando !== null;

  // Uma conta empresarial sempre retorna à entrada da operadora.
  const tipoLogin = empresarial
    ? 'operadora'
    : existente ?? solicitado;

  const linkLogin = tipoLogin
    ? `/login?acesso=${tipoLogin}`
    : '/login';

  async function conferirContaAtual() {
    if (!conta) {
      throw new Error('Entre novamente para continuar.');
    }

    const atual = await carregarAcessosConta();

    if (atual.usuario_id !== conta.usuario_id) {
      throw new Error(
        'A conta conectada mudou. Recarregue a página.',
      );
    }

    return atual;
  }

  async function entrar() {
    if (ocupado.current || !conta) return;

    ocupado.current = true;
    setProcessando('entrar');
    setErro('');

    let navegando = false;

    try {
      const atual = await conferirContaAtual();
      setConta(atual);

      let destino: string;

      if (contaPossuiAcesso(atual, 'operadora')) {
        destino = destinos.operadora;
      } else {
        if (possuiVinculoEmpresarial(atual)) {
          throw new Error(
            'Seu usuário está vinculado a uma empresa, mas o acesso operacional não está habilitado. Procure o administrador da empresa.',
          );
        }

        const acessos = acessosIndependentes(atual);

        if (acessos.length !== 1) {
          throw new Error(
            'Não foi possível determinar seu espaço profissional. Seu cadastro precisa ser revisado.',
          );
        }

        destino = destinos[acessos[0]];
      }

      window.location.replace(destino);
      navegando = true;
    } catch (error) {
      setErro(
        mensagemErro(
          error,
          'Não foi possível abrir seu espaço.',
        ),
      );
    } finally {
      if (!navegando) {
        ocupado.current = false;
        setProcessando(null);
      }
    }
  }

  async function iniciarCadastro() {
    if (
      ocupado.current ||
      !conta ||
      !novoTipo
    ) {
      return;
    }

    const tipo = novoTipo;

    ocupado.current = true;
    setProcessando('ativar');
    setErro('');

    let navegando = false;

    try {
      const atual = await conferirContaAtual();
      setConta(atual);

      if (
        possuiVinculoEmpresarial(atual) ||
        contaPossuiAcesso(atual, 'operadora')
      ) {
        throw new Error(
          'Esta conta pertence à equipe de uma operadora. Utilize o acesso da empresa.',
        );
      }

      const acessos = acessosIndependentes(atual);

      if (acessos.some((acesso) => acesso !== tipo)) {
        throw new Error(
          'Esta conta já possui outra modalidade profissional. Não é possível ativar uma modalidade adicional por esta página.',
        );
      }

      if (!acessos.includes(tipo)) {
        const { error } = await supabase
          .from('acessos_profissionais')
          .insert({ tipo });

        if (error && error.code !== '23505') {
          throw new Error(
            'Não foi possível iniciar seu cadastro profissional. Tente novamente.',
          );
        }
      }

      const confirmada = await conferirContaAtual();
      setConta(confirmada);

      const confirmados =
        acessosIndependentes(confirmada);

      if (
        possuiVinculoEmpresarial(confirmada) ||
        contaPossuiAcesso(confirmada, 'operadora') ||
        confirmados.length !== 1 ||
        confirmados[0] !== tipo
      ) {
        throw new Error(
          'O cadastro precisa ser revisado antes de continuar. Recarregue a página para consultar sua situação.',
        );
      }

      window.location.replace(destinos[tipo]);
      navegando = true;
    } catch (error) {
      setErro(
        mensagemErro(
          error,
          'Não foi possível concluir esta etapa.',
        ),
      );
    } finally {
      if (!navegando) {
        ocupado.current = false;
        setProcessando(null);
      }
    }
  }

  async function sair() {
    if (ocupado.current) return;

    ocupado.current = true;
    setProcessando('sair');
    setErro('');

    let navegando = false;

    try {
      const { error } = await supabase.auth.signOut({
        scope: 'local',
      });

      if (error) {
        throw new Error(
          'Não foi possível sair. Tente novamente.',
        );
      }

      setConta(null);
      window.location.replace(linkLogin);
      navegando = true;
    } catch (error) {
      setErro(
        mensagemErro(
          error,
          'Não foi possível encerrar a sessão.',
        ),
      );
    } finally {
      if (!navegando) {
        ocupado.current = false;
        setProcessando(null);
      }
    }
  }

  return (
    <main className="min-h-screen bg-[#07110E] px-4 py-6 text-[#EDEDE3] sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="Encantos Rio Negro — portal público"
            className="inline-flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3A144]"
          >
            <LogoERN tamanho={56} prioridade />

            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[#F0F0E8] sm:text-base">
                Encantos Rio Negro
              </span>
              <span className="mt-1 block text-xs text-[#EDEDE3]/55">
                Voltar ao portal
              </span>
            </span>
          </Link>

          {conta && (
            <button
              type="button"
              disabled={bloqueado}
              onClick={() => void sair()}
              className="min-h-11 rounded-xl border border-white/15 px-4 text-sm transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processando === 'sair'
                ? 'Saindo...'
                : 'Sair da conta'}
            </button>
          )}
        </header>

        <section className="mt-8 rounded-3xl border border-white/10 bg-[#0D1B16] p-5 sm:mt-12 sm:p-8">
          <h1
            className="text-2xl leading-tight text-[#F0F0E8] sm:text-3xl"
            style={{
              fontFamily: 'var(--font-fraunces), serif',
            }}
          >
            {carregando
              ? 'Preparando seu acesso'
              : conflito
                ? 'Revisão do cadastro'
                : tipoExibido
                  ? titulos[tipoExibido]
                  : empresarial
                    ? 'Acesso da empresa'
                    : 'Concluir seu acesso'}
          </h1>

          {conta?.email && (
            <p className="mt-3 break-all text-xs leading-6 text-[#EDEDE3]/55">
              Conta conectada: {conta.email}
            </p>
          )}

          {erro && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200"
            >
              {erro}
            </div>
          )}

          {carregando ? (
            <p
              role="status"
              className="mt-6 text-sm text-[#EDEDE3]/70"
            >
              Verificando sua conta...
            </p>
          ) : !conta ? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={linkLogin}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#E3A144] px-5 text-sm font-bold text-[#07130F]"
              >
                Ir para o login
              </Link>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="min-h-12 rounded-xl border border-white/15 px-5 text-sm"
              >
                Tentar novamente
              </button>
            </div>
          ) : conflito ? (
            <p className="mt-6 text-sm leading-7 text-[#EDEDE3]/75">
              Sua conta possui mais de uma modalidade
              profissional cadastrada. É necessário revisar
              esse vínculo com a administração da ERN antes
              de continuar.
            </p>
          ) : tipoExibido ? (
            <>
              <p className="mt-5 text-sm leading-7 text-[#EDEDE3]/75">
                {descricoes[tipoExibido]}
              </p>

              {existente === 'operadora' && (
                <p className="mt-4 text-sm leading-7 text-[#EDEDE3]/60">
                  Os acessos da equipe são usuários vinculados
                  à mesma empresa e seguem o limite do plano
                  contratado.
                </p>
              )}

              {novoTipo && (
                <p className="mt-4 text-sm leading-7 text-[#EDEDE3]/60">
                  Você está iniciando um cadastro independente
                  de {novoTipo === 'guia' ? 'guia' : 'fornecedor'}.
                  Seus dados não serão publicados automaticamente.
                </p>
              )}

              <button
                type="button"
                disabled={bloqueado}
                onClick={() => {
                  if (existente) {
                    void entrar();
                  } else {
                    void iniciarCadastro();
                  }
                }}
                className="mt-7 min-h-12 w-full rounded-xl bg-[#E3A144] px-5 py-3 text-sm font-bold text-[#07130F] transition hover:bg-[#F0B35C] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {processando === 'entrar'
                  ? 'Abrindo seu espaço...'
                  : processando === 'ativar'
                    ? 'Iniciando cadastro...'
                    : existente
                      ? 'Entrar no meu espaço'
                      : 'Continuar meu cadastro'}
              </button>
            </>
          ) : empresarial || solicitado === 'operadora' ? (
            <p className="mt-6 text-sm leading-7 text-[#EDEDE3]/75">
              {empresarial
                ? 'Sua conta está vinculada a uma empresa, mas o acesso operacional não está habilitado. Solicite a revisão ao administrador da empresa.'
                : 'Sua conta ainda não está vinculada a uma operadora. Se você integra uma empresa já cadastrada, solicite um convite ao administrador.'}
            </p>
          ) : (
            <>
              <p className="mt-6 text-sm leading-7 text-[#EDEDE3]/75">
                Sua conta ainda não possui um vínculo
                profissional. Volte à página de acessos e
                selecione a entrada correspondente à sua
                atividade.
              </p>

              <Link
                href="/operadores#acessos-profissionais"
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[#E3A144]/40 px-5 text-sm font-semibold text-[#F4C77E]"
              >
                Ir para a entrada profissional
              </Link>
            </>
          )}
        </section>

        <p className="mt-6 text-center text-xs leading-6 text-[#EDEDE3]/50">
          Experiências, encontros e oportunidades no Rio Negro.
        </p>
      </div>
    </main>
  );
}

export default function AcessoPage() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          className="flex min-h-screen items-center justify-center bg-[#07110E] px-5 text-sm text-[#EDEDE3]/70"
        >
          Preparando seu acesso...
        </div>
      }
    >
      <ConteudoAcesso />
    </Suspense>
  );
}
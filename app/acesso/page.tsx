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

const nomes: Record<TipoAcesso, string> = {
  operadora: 'operadora de turismo',
  guia: 'guia autônomo da Rede ERN',
  fornecedor: 'fornecedor da Rede ERN',
};

const descricoes: Record<TipoAcesso, string> = {
  operadora:
    'Acesse a operação da sua empresa conforme as permissões do seu usuário.',
  guia:
    'Acesse seu espaço independente e mantenha seu cadastro de guia na Rede ERN.',
  fornecedor:
    'Acesse seu espaço independente e mantenha seu cadastro de comerciante ou prestador de serviços na Rede ERN.',
};

function analisarConta(conta: AcessosConta) {
  const empresarial = Boolean(conta.empresa_id);
  const acessoEmpresa = contaPossuiAcesso(
    conta,
    'operadora',
  );

  const tipos: TipoAcessoProfissional[] = [
    'guia',
    'fornecedor',
  ];

  const independentes = tipos.filter((tipo) =>
    contaPossuiAcesso(conta, tipo),
  );

  const modalidadeDesconhecida = conta.acessos.some(
    (tipo) =>
      tipo !== 'operadora' &&
      tipo !== 'guia' &&
      tipo !== 'fornecedor',
  );

  const conflito =
    modalidadeDesconhecida ||
    independentes.length > 1 ||
    (empresarial && independentes.length > 0) ||
    (!empresarial && acessoEmpresa);

  const modalidade: TipoAcesso | null = conflito
    ? null
    : empresarial
      ? 'operadora'
      : independentes.length === 1
        ? independentes[0]
        : null;

  const existente: TipoAcesso | null = conflito
    ? null
    : empresarial
      ? acessoEmpresa
        ? 'operadora'
        : null
      : modalidade;

  return {
    empresarial,
    conflito,
    modalidade,
    existente,
  };
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

        // Consultar a conta não deve abrir outro painel
        // automaticamente.
        setConta(atual);
      } catch {
        if (!ativo) return;

        setErro(
          'Não foi possível consultar sua conta. Tente novamente ou retorne ao login.',
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

  const situacao = conta ? analisarConta(conta) : null;
  const empresarial = situacao?.empresarial ?? false;
  const conflito = situacao?.conflito ?? false;
  const modalidade = situacao?.modalidade ?? null;
  const existente = situacao?.existente ?? null;

  const incompativel = Boolean(
    solicitado &&
      modalidade &&
      solicitado !== modalidade,
  );

  const novoTipo: TipoAcessoProfissional | null =
    conta &&
    !conflito &&
    !empresarial &&
    !modalidade &&
    (solicitado === 'guia' ||
      solicitado === 'fornecedor')
      ? solicitado
      : null;

  const tipoExibido = existente ?? novoTipo;
  const bloqueado = carregando || processando !== null;

  // Ao trocar de conta, mantém a modalidade que a pessoa
  // tentou acessar, em vez de trocar para a operadora.
  const tipoLogin = solicitado ?? modalidade;
  const linkLogin = tipoLogin
    ? `/login?acesso=${tipoLogin}`
    : '/login';

  const focoClass =
    'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3A144]';

  const botaoPrincipal =
    `inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#E3A144] px-5 py-3 text-base font-bold text-[#07130F] transition hover:bg-[#F0B35C] disabled:cursor-not-allowed disabled:opacity-60 ${focoClass}`;

  async function conferirContaAtual() {
    if (!conta) {
      throw new Error('Entre novamente para continuar.');
    }

    const atual = await carregarAcessosConta();

    if (atual.usuario_id !== conta.usuario_id) {
      setConta(null);

      throw new Error(
        'A conta conectada mudou. Recarregue a página antes de continuar.',
      );
    }

    return atual;
  }

  async function entrar() {
    if (
      ocupado.current ||
      !conta ||
      !existente ||
      conflito ||
      incompativel
    ) {
      return;
    }

    const tipoEsperado = existente;

    ocupado.current = true;
    setProcessando('entrar');
    setErro('');

    let navegando = false;

    try {
      const atual = await conferirContaAtual();
      setConta(atual);

      const verificada = analisarConta(atual);

      if (verificada.conflito) {
        throw new Error(
          'Os vínculos desta conta precisam ser revisados pela equipe ERN.',
        );
      }

      if (
        solicitado &&
        verificada.modalidade &&
        solicitado !== verificada.modalidade
      ) {
        throw new Error(
          'Esta conta não pertence à modalidade solicitada. Saia e entre com a conta correta.',
        );
      }

      if (
        !verificada.existente ||
        verificada.existente !== tipoEsperado
      ) {
        throw new Error(
          'O vínculo da sua conta mudou ou não está habilitado. Recarregue a página para consultar sua situação.',
        );
      }

      window.location.replace(
        destinos[verificada.existente],
      );
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
      !novoTipo ||
      conflito ||
      incompativel
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

      const verificada = analisarConta(atual);

      if (verificada.conflito) {
        throw new Error(
          'Os vínculos desta conta precisam ser revisados antes de iniciar o cadastro.',
        );
      }

      if (verificada.empresarial) {
        throw new Error(
          'Esta conta pertence a uma operadora. Para se cadastrar na Rede ERN como profissional independente, utilize uma conta própria dessa modalidade.',
        );
      }

      if (
        verificada.modalidade &&
        verificada.modalidade !== tipo
      ) {
        throw new Error(
          'Esta conta já pertence a outra modalidade. Não é possível adicionar uma segunda modalidade.',
        );
      }

      if (!verificada.modalidade) {
        // O usuário é definido pelo banco através de auth.uid().
        // Não cria empresa nem concede permissões empresariais.
        const { error } = await supabase
          .from('acessos_profissionais')
          .insert({ tipo });

        if (error && error.code !== '23505') {
          throw new Error(
            'Não foi possível iniciar seu cadastro profissional. Tente novamente.',
          );
        }
      }

      // Confirma o vínculo inclusive quando outra aba
      // já realizou o cadastro.
      const confirmada = await conferirContaAtual();
      setConta(confirmada);

      const resultado = analisarConta(confirmada);

      if (
        resultado.conflito ||
        resultado.empresarial ||
        resultado.existente !== tipo
      ) {
        throw new Error(
          'Não foi possível confirmar esta modalidade para sua conta. Recarregue a página para consultar seu vínculo.',
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
          'Não foi possível encerrar a sessão. Tente novamente.',
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

  const titulo = carregando
    ? 'Preparando seu acesso'
    : conflito
      ? 'Revisão do cadastro'
      : incompativel
        ? 'Conta de outra modalidade'
        : tipoExibido
          ? titulos[tipoExibido]
          : empresarial
            ? 'Acesso da empresa'
            : 'Concluir seu acesso';

  return (
    <main
      className="min-h-dvh bg-[#07110E] text-[#EDEDE3]"
      style={{
        paddingTop:
          'max(1.5rem, env(safe-area-inset-top, 0px))',
        paddingRight:
          'max(1rem, env(safe-area-inset-right, 0px))',
        paddingBottom:
          'max(1.5rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft:
          'max(1rem, env(safe-area-inset-left, 0px))',
      }}
    >
      <div className="mx-auto w-full min-w-0 max-w-2xl sm:py-4">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="Encantos Rio Negro — portal público"
            className={`inline-flex min-w-0 items-center gap-3 rounded-xl ${focoClass}`}
          >
            <span className="shrink-0">
              <LogoERN tamanho={56} prioridade />
            </span>

            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[#F0F0E8] sm:text-base">
                Encantos Rio Negro
              </span>
              <span className="mt-1 block text-xs text-[#EDEDE3]/60">
                Voltar ao portal
              </span>
            </span>
          </Link>

          {conta && (
            <button
              type="button"
              disabled={bloqueado}
              onClick={() => void sair()}
              className={`min-h-12 rounded-xl border border-white/15 px-4 text-sm transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50 ${focoClass}`}
            >
              {processando === 'sair'
                ? 'Saindo...'
                : 'Sair da conta'}
            </button>
          )}
        </header>

        <section
          aria-labelledby="acesso-titulo"
          aria-busy={bloqueado}
          className="mt-8 min-w-0 rounded-3xl border border-white/10 bg-[#0D1B16] p-5 sm:mt-12 sm:p-8"
        >
          <h1
            id="acesso-titulo"
            className="break-words text-2xl leading-tight text-[#F0F0E8] sm:text-3xl"
            style={{
              fontFamily: 'var(--font-fraunces), serif',
            }}
          >
            {titulo}
          </h1>

          {conta?.email && (
            <p className="mt-3 break-all text-sm leading-6 text-[#EDEDE3]/65">
              Conta conectada: {conta.email}
            </p>
          )}

          {erro && (
            <div
              role="alert"
              className="mt-5 break-words rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200"
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
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href={linkLogin}
                className={botaoPrincipal}
              >
                Ir para o login
              </Link>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className={`min-h-12 rounded-xl border border-white/15 px-5 text-sm ${focoClass}`}
              >
                Tentar novamente
              </button>
            </div>
          ) : conflito ? (
            <p className="mt-6 text-sm leading-7 text-[#EDEDE3]/75">
              Foram encontrados vínculos incompatíveis nesta
              conta. Solicite a revisão à equipe ERN antes
              de continuar. Nenhuma modalidade será alterada
              automaticamente.
            </p>
          ) : incompativel && solicitado && modalidade ? (
            <>
              <div
                role="alert"
                className="mt-6 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm leading-7 text-amber-100"
              >
                Esta conta pertence à modalidade de{' '}
                <strong>{nomes[modalidade]}</strong>.
                Você solicitou o acesso de{' '}
                <strong>{nomes[solicitado]}</strong>.
                A entrada nesse espaço não está autorizada
                para esta conta.
              </div>

              <p className="mt-4 text-sm leading-7 text-[#EDEDE3]/75">
                Saia e entre com uma conta da modalidade
                escolhida. Para utilizar sua conta atual,
                volte à entrada profissional e selecione
                o acesso correspondente.
              </p>

              <button
                type="button"
                disabled={bloqueado}
                onClick={() => void sair()}
                className={`mt-6 ${botaoPrincipal}`}
              >
                {processando === 'sair'
                  ? 'Saindo...'
                  : 'Sair e entrar com outra conta'}
              </button>

              <Link
                href="/operadores#acessos-profissionais"
                className={`mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-white/15 px-4 py-3 text-center text-sm ${focoClass}`}
              >
                Voltar à entrada profissional
              </Link>
            </>
          ) : tipoExibido ? (
            <>
              <p className="mt-5 text-sm leading-7 text-[#EDEDE3]/75">
                {descricoes[tipoExibido]}
              </p>

              {existente === 'operadora' && (
                <p className="mt-4 text-sm leading-7 text-[#EDEDE3]/65">
                  Cada integrante da equipe utiliza seu
                  próprio usuário vinculado à empresa,
                  conforme as permissões e o limite do plano.
                </p>
              )}

              {(tipoExibido === 'guia' ||
                tipoExibido === 'fornecedor') && (
                <p className="mt-4 text-sm leading-7 text-[#EDEDE3]/65">
                  Este espaço pertence à Rede ERN e não
                  concede acesso à gestão das operadoras.
                </p>
              )}

              {novoTipo && (
                <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-[#EDEDE3]/75">
                  Ao continuar, esta conta será vinculada
                  à modalidade de{' '}
                  <strong>{nomes[novoTipo]}</strong>.
                  Depois você preencherá seu perfil.
                  Seus dados não serão publicados
                  automaticamente.
                </div>
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
                className={`mt-7 ${botaoPrincipal}`}
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
                Sua conta ainda não possui vínculo
                profissional. Selecione a entrada
                correspondente à sua atividade para
                continuar o cadastro.
              </p>

              <Link
                href="/operadores#acessos-profissionais"
                className={`mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[#E3A144]/40 px-5 py-3 text-center text-sm font-semibold text-[#F4C77E] ${focoClass}`}
              >
                Ir para a entrada profissional
              </Link>
            </>
          )}
        </section>

        <p className="mt-6 text-center text-xs leading-6 text-[#EDEDE3]/55">
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
          className="flex min-h-dvh items-center justify-center bg-[#07110E] px-5 text-sm text-[#EDEDE3]/70"
        >
          Preparando seu acesso...
        </div>
      }
    >
      <ConteudoAcesso />
    </Suspense>
  );
}
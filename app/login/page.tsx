'use client';

import {
  Suspense,
  useRef,
  useState,
  type FormEvent,
} from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import LogoERN from '@/app/components/LogoERN';
import { supabase } from '@/lib/supabase';
import {
  interpretarTipoAcesso,
  type TipoAcesso,
} from '@/lib/acessos';

type Modo =
  | 'login'
  | 'cadastro'
  | 'recuperacao';

const apresentacoes = {
  operadora: {
    etiqueta: 'Operadora de turismo',
    titulo: 'Acesso da operadora',
    cadastro: 'Crie seu usuário da operadora',
    descricao:
      'Entre com seu usuário vinculado à empresa de turismo.',
  },

  guia: {
    etiqueta: 'Rede ERN • Guia autônomo',
    titulo: 'Acesso do guia',
    cadastro: 'Cadastre-se como guia',
    descricao:
      'Acesse seu espaço independente de guia na Rede ERN.',
  },

  fornecedor: {
    etiqueta: 'Rede ERN • Fornecedor',
    titulo: 'Acesso do fornecedor',
    cadastro: 'Cadastre-se como fornecedor',
    descricao:
      'Acesse seu espaço independente de comerciante ou prestador de serviços na Rede ERN.',
  },
};

function mensagemDoErro(
  error: unknown,
  alternativa: string,
): string {
  const codigo =
    typeof error === 'object' &&
    error !== null &&
    'code' in error
      ? String(error.code)
      : '';

  switch (codigo) {
    case 'invalid_credentials':
      return 'E-mail ou senha inválidos. Confira os dados e tente novamente.';

    case 'email_not_confirmed':
      return 'Confirme seu e-mail antes de entrar. Confira também a pasta de spam.';

    case 'weak_password':
      return 'A senha não atende aos requisitos de segurança. Escolha uma senha mais forte.';

    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Limite temporário de tentativas atingido. Aguarde alguns minutos e tente novamente.';

    case 'signup_disabled':
      return 'O cadastro de novas contas está indisponível no momento.';

    case 'email_address_invalid':
    case 'validation_failed':
      return 'Confira o e-mail e os dados informados.';

    case 'user_already_exists':
      return 'Não foi possível criar a conta. Tente entrar ou recuperar sua senha.';

    default:
      return alternativa;
  }
}

function FormularioLogin() {
  const searchParams = useSearchParams();

  const acesso = interpretarTipoAcesso(
    searchParams.get('acesso'),
  );

  const apresentacao = acesso
    ? apresentacoes[acesso]
    : {
        etiqueta: 'Acesso profissional ERN',
        titulo: 'Acesse sua conta',
        cadastro: 'Crie sua conta ERN',
        descricao:
          'Entre para acessar o espaço vinculado à sua conta.',
      };

  const destinoAcesso = acesso
    ? `/acesso?acesso=${acesso}`
    : '/acesso';

  const [modo, setModo] =
    useState<Modo>('login');

  const [email, setEmail] =
    useState('');

  const [senha, setSenha] =
    useState('');

  const [
    confirmacaoSenha,
    setConfirmacaoSenha,
  ] = useState('');

  const [
    mostrarSenha,
    setMostrarSenha,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [
    redirecionando,
    setRedirecionando,
  ] = useState(false);

  const [erro, setErro] =
    useState('');

  const [sucesso, setSucesso] =
    useState('');

  const emProcessamento =
    useRef(false);

  const bloqueado =
    loading || redirecionando;

  /*
   * Google fica disponível quando a entrada
   * possui uma modalidade profissional definida.
   *
   * O Google apenas autentica a identidade.
   * A modalidade real continua sendo validada
   * e criada pela própria ERN.
   */
  const googleDisponivel =
    acesso !== null &&
    modo !== 'recuperacao';

  function alterarModo(
    proximo: Modo,
  ) {
    if (
      emProcessamento.current ||
      redirecionando
    ) {
      return;
    }

    setModo(proximo);
    setSenha('');
    setConfirmacaoSenha('');
    setMostrarSenha(false);
    setErro('');
    setSucesso('');
  }

  function criarUrlRetorno(
    destino: string,
  ) {
    const url = new URL(
      '/auth/callback',
      window.location.origin,
    );

    url.searchParams.set(
      'next',
      destino,
    );

    return url.toString();
  }

  function dadosCadastro(
    tipo: TipoAcesso | null,
  ) {
    if (!tipo) {
      return undefined;
    }

    /*
     * Metadata registra apenas a intenção
     * apresentada no cadastro.
     *
     * Ela NÃO concede acesso nem substitui
     * perfis, empresa_id ou
     * acessos_profissionais.
     */
    return {
      tipo_cadastro: tipo,
    };
  }

  async function recusarEntrada(
    mensagem: string,
  ) {
    setSenha('');
    setConfirmacaoSenha('');
    setMostrarSenha(false);
    setSucesso('');
    setRedirecionando(false);

    try {
      const { error } =
        await supabase.auth.signOut({
          scope: 'local',
        });

      if (error) {
        setErro(
          `${mensagem} Não foi possível encerrar a sessão deste navegador. Tente novamente antes de trocar de conta.`,
        );

        return;
      }

      setErro(mensagem);
    } catch {
      setErro(
        `${mensagem} Não foi possível confirmar o encerramento da sessão. Confira sua conexão e tente novamente.`,
      );
    }
  }

  async function validarEContinuar(
    usuarioEsperado: string,
  ) {
    try {
      /*
       * Confirma a identidade real junto
       * ao Supabase antes de consultar
       * qualquer vínculo da aplicação.
       */
      const {
        data: { user },
        error: erroUsuario,
      } =
        await supabase.auth.getUser();

      if (
        erroUsuario ||
        !user ||
        user.is_anonymous ||
        user.id !== usuarioEsperado
      ) {
        await recusarEntrada(
          'Não foi possível confirmar sua sessão. Entre novamente.',
        );

        return;
      }

      const [
        resultadoPerfil,
        resultadoAcessos,
      ] = await Promise.all([
        supabase
          .from('perfis')
          .select('empresa_id,role')
          .eq('id', user.id)
          .maybeSingle(),

        supabase
          .from(
            'acessos_profissionais',
          )
          .select('tipo')
          .eq(
            'usuario_id',
            user.id,
          )
          .limit(2),
      ]);

      if (
        resultadoPerfil.error ||
        resultadoAcessos.error
      ) {
        await recusarEntrada(
          'Não foi possível verificar a modalidade da sua conta. Tente novamente em alguns instantes.',
        );

        return;
      }

      const possuiEmpresa =
        Boolean(
          resultadoPerfil.data
            ?.empresa_id,
        );

      const modalidades =
        resultadoAcessos.data ??
        [];

      const modalidadeInvalida =
        modalidades.some(
          (item) =>
            item.tipo !== 'guia' &&
            item.tipo !==
              'fornecedor',
        );

      /*
       * Situações inconsistentes não
       * são corrigidas silenciosamente.
       */
      if (
        modalidadeInvalida ||
        modalidades.length > 1 ||
        (
          possuiEmpresa &&
          modalidades.length > 0
        )
      ) {
        await recusarEntrada(
          'Os vínculos desta conta precisam ser revisados pela equipe ERN. Não foi possível liberar a entrada.',
        );

        return;
      }

      const modalidadeAtual =
        possuiEmpresa
          ? 'operadora'
          : modalidades[0]
              ?.tipo ?? null;

      /*
       * Uma identidade já vinculada
       * não pode atravessar para outra
       * modalidade pela URL.
       */
      if (
        acesso &&
        modalidadeAtual &&
        modalidadeAtual !== acesso
      ) {
        const origem =
          modalidadeAtual ===
          'operadora'
            ? 'uma operadora de turismo'
            : modalidadeAtual ===
                'guia'
              ? 'um guia autônomo da Rede ERN'
              : 'um fornecedor da Rede ERN';

        const destino =
          acesso === 'operadora'
            ? 'da operadora'
            : acesso === 'guia'
              ? 'do guia'
              : 'do fornecedor';

        await recusarEntrada(
          `Esta conta pertence a ${origem} e não possui acesso ao painel ${destino}. Use uma conta da modalidade escolhida ou volte aos acessos para entrar no espaço correto.`,
        );

        return;
      }

      /*
       * Conta autenticada e válida.
       *
       * Se já possui modalidade, /acesso
       * permitirá a entrada.
       *
       * Se ainda não possui modalidade,
       * /acesso executará o onboarding
       * correspondente.
       */
      setSenha('');
      setConfirmacaoSenha('');
      setMostrarSenha(false);
      setRedirecionando(true);

      window.location.assign(
        destinoAcesso,
      );
    } catch {
      await recusarEntrada(
        'Não foi possível verificar seu acesso. Confira sua conexão e tente novamente.',
      );
    }
  }

  async function entrarComGoogle() {
    if (
      !googleDisponivel ||
      emProcessamento.current ||
      redirecionando
    ) {
      return;
    }

    setErro('');
    setSucesso('');

    emProcessamento.current =
      true;

    setLoading(true);
    setRedirecionando(true);

    try {
      const { error } =
        await supabase.auth
          .signInWithOAuth({
            provider: 'google',

            options: {
              redirectTo:
                criarUrlRetorno(
                  destinoAcesso,
                ),
            },
          });

      if (error) {
        setRedirecionando(
          false,
        );

        setErro(
          mensagemDoErro(
            error,
            'Não foi possível continuar com o Google. Tente novamente.',
          ),
        );

        return;
      }

      /*
       * Em caso de sucesso, o navegador
       * será encaminhado pelo Supabase
       * ao Google.
       */
    } catch {
      setRedirecionando(false);

      setErro(
        'Não foi possível iniciar o acesso com o Google. Confira sua conexão e tente novamente.',
      );
    } finally {
      emProcessamento.current =
        false;

      setLoading(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      emProcessamento.current ||
      redirecionando
    ) {
      return;
    }

    setErro('');
    setSucesso('');

    const emailInformado =
      email.trim();

    if (!emailInformado) {
      setErro(
        'Informe seu e-mail.',
      );

      return;
    }

    if (modo === 'cadastro') {
      if (senha.length < 8) {
        setErro(
          'Use uma senha com pelo menos 8 caracteres.',
        );

        return;
      }

      if (
        senha !==
        confirmacaoSenha
      ) {
        setErro(
          'As senhas não coincidem.',
        );

        return;
      }
    }

    emProcessamento.current =
      true;

    setLoading(true);

    try {
      /*
       * RECUPERAÇÃO DE SENHA
       */
      if (
        modo ===
        'recuperacao'
      ) {
        const { error } =
          await supabase.auth
            .resetPasswordForEmail(
              emailInformado,
              {
                redirectTo:
                  criarUrlRetorno(
                    '/auth/nova-senha',
                  ),
              },
            );

        if (error) {
          setErro(
            mensagemDoErro(
              error,
              'Não foi possível solicitar a recuperação. Tente novamente.',
            ),
          );

          return;
        }

        setSucesso(
          'Se houver uma conta apta à recuperação com esse e-mail, você receberá as instruções. Confira também a pasta de spam.',
        );

        return;
      }

      /*
       * CADASTRO POR E-MAIL
       */
      if (
        modo === 'cadastro'
      ) {
        const {
          data,
          error,
        } =
          await supabase.auth
            .signUp({
              email:
                emailInformado,

              password: senha,

              options: {
                emailRedirectTo:
                  criarUrlRetorno(
                    destinoAcesso,
                  ),

                data:
                  dadosCadastro(
                    acesso,
                  ),
              },
            });

        if (error) {
          setErro(
            mensagemDoErro(
              error,
              'Não foi possível concluir o cadastro. Confira os dados ou tente entrar com sua conta.',
            ),
          );

          return;
        }

        setSenha('');
        setConfirmacaoSenha('');
        setMostrarSenha(false);

        /*
         * Se a confirmação de e-mail
         * estiver desabilitada no projeto,
         * o Supabase pode devolver sessão
         * imediatamente.
         */
        if (data.session) {
          await validarEContinuar(
            data.session.user.id,
          );

          return;
        }

        /*
         * Com confirmação obrigatória,
         * auth.users pode existir enquanto
         * session permanece null.
         */
        setModo('login');

        setSucesso(
          'Confira seu e-mail para concluir o cadastro. Depois da confirmação, você continuará no acesso correspondente à modalidade escolhida.',
        );

        return;
      }

      /*
       * LOGIN POR E-MAIL E SENHA
       */
      const {
        data,
        error,
      } =
        await supabase.auth
          .signInWithPassword({
            email:
              emailInformado,

            password: senha,
          });

      if (error) {
        setErro(
          mensagemDoErro(
            error,
            'Não foi possível entrar. Confira sua conexão e tente novamente.',
          ),
        );

        return;
      }

      if (!data.session) {
        setErro(
          'Não foi possível iniciar a sessão. Tente novamente.',
        );

        return;
      }

      await validarEContinuar(
        data.session.user.id,
      );
    } catch {
      setRedirecionando(false);

      setErro(
        'Não foi possível concluir a solicitação. Confira sua conexão e tente novamente.',
      );
    } finally {
      emProcessamento.current =
        false;

      setLoading(false);
    }
  }

  const titulo =
    modo === 'recuperacao'
      ? 'Recuperar senha'
      : modo === 'cadastro'
        ? apresentacao.cadastro
        : apresentacao.titulo;

  const descricao =
    modo === 'recuperacao'
      ? 'Informe seu e-mail para receber as instruções de recuperação.'
      : modo === 'cadastro'
        ? acesso ===
          'operadora'
          ? 'Crie suas credenciais. O vínculo com a empresa precisa ser autorizado.'
          : acesso ===
              'guia'
            ? 'Crie sua conta de guia independente na Rede ERN. Depois você concluirá seu perfil profissional.'
            : acesso ===
                'fornecedor'
              ? 'Crie sua conta de fornecedor independente na Rede ERN. Depois você concluirá seu perfil profissional.'
              : 'Crie suas credenciais para continuar o cadastro na ERN.'
        : apresentacao.descricao;

  const textoBotao =
    redirecionando
      ? 'Continuando...'
      : loading
        ? 'Processando...'
        : modo === 'cadastro'
          ? 'Criar conta'
          : modo ===
              'recuperacao'
            ? 'Enviar instruções'
            : 'Entrar';

  const textoGoogle =
    redirecionando
      ? 'Abrindo Google...'
      : modo === 'cadastro' &&
          (
            acesso === 'guia' ||
            acesso ===
              'fornecedor'
          )
        ? 'Cadastrar com Google'
        : 'Continuar com Google';

  const focoClass =
    'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3A144]';

  const inputClass =
    'block min-h-[52px] w-full min-w-0 scroll-mt-6 rounded-xl border border-white/20 bg-[#07110E] px-4 py-3 text-base leading-6 text-[#F0F0E8] outline-none transition-colors placeholder:text-[#EDEDE3]/45 focus:border-[#E3A144] focus:ring-2 focus:ring-[#E3A144]/20 disabled:cursor-not-allowed disabled:opacity-60';

  const labelClass =
    'mb-2 block text-sm font-medium text-[#EDEDE3]/85';

  return (
    <main
      className="flex min-h-dvh w-full flex-col bg-[#07110E] text-[#EDEDE3]"
      style={{
        paddingTop:
          'max(1rem, env(safe-area-inset-top, 0px))',

        paddingRight:
          'max(1rem, env(safe-area-inset-right, 0px))',

        paddingBottom:
          'max(1.5rem, env(safe-area-inset-bottom, 0px))',

        paddingLeft:
          'max(1rem, env(safe-area-inset-left, 0px))',
      }}
    >
      <div className="mx-auto my-auto w-full min-w-0 max-w-[460px] py-2 sm:py-6">
        <Link
          href="/operadores#acessos-profissionais"
          className={`mb-3 inline-flex min-h-12 items-center gap-2 rounded-lg px-1 text-sm text-[#EDEDE3]/75 transition-colors hover:text-[#F4C77E] sm:mb-5 ${focoClass}`}
        >
          <span aria-hidden="true">
            ←
          </span>

          Voltar aos acessos
        </Link>

        <section
          aria-labelledby="login-titulo"
          className="min-w-0 rounded-3xl border border-white/10 bg-[#0D1B16] p-5 shadow-xl sm:p-8"
        >
          <header className="text-center">
            <Link
              href="/"
              aria-label="Ir ao portal Encantos Rio Negro"
              className={`inline-flex rounded-full align-middle ${focoClass}`}
            >
              <LogoERN
                tamanho={76}
                prioridade
              />
            </Link>

            <p className="mt-3 text-sm font-semibold text-[#F4C77E]">
              Encantos Rio Negro
            </p>

            <p className="mt-2 text-xs font-medium text-[#EDEDE3]/65">
              {
                apresentacao.etiqueta
              }
            </p>

            <h1
              id="login-titulo"
              className="mt-4 break-words text-2xl leading-tight text-[#F0F0E8] sm:text-3xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              {titulo}
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#EDEDE3]/75">
              {descricao}
            </p>
          </header>

          {erro && (
            <div
              id="login-erro"
              role="alert"
              className="mt-5 break-words rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200"
            >
              {erro}
            </div>
          )}

          {sucesso && (
            <div
              id="login-sucesso"
              role="status"
              className="mt-5 break-words rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-200"
            >
              {sucesso}
            </div>
          )}

          {googleDisponivel && (
            <div className="mt-6">
              <button
                type="button"
                disabled={
                  bloqueado
                }
                onClick={() =>
                  void entrarComGoogle()
                }
                className={`flex min-h-[52px] w-full items-center justify-center gap-3 rounded-xl border border-[#DADCE0] bg-white px-4 py-3 text-base font-semibold text-[#202124] transition-colors hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-60 ${focoClass}`}
              >
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  className="shrink-0"
                >
                  <path
                    fill="#4285F4"
                    d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.39a4.61 4.61 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.97-4.33 2.97-7.41Z"
                  />

                  <path
                    fill="#34A853"
                    d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z"
                  />

                  <path
                    fill="#FBBC05"
                    d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.46H3.04A10 10 0 0 0 2 12c0 1.61.39 3.13 1.04 4.54l3.35-2.61Z"
                  />

                  <path
                    fill="#EA4335"
                    d="M12 5.94c1.47 0 2.79.51 3.83 1.5l2.87-2.87C16.97 2.96 14.7 2 12 2a10 10 0 0 0-8.96 5.46l3.35 2.61C7.18 7.7 9.39 5.94 12 5.94Z"
                  />
                </svg>

                <span>
                  {textoGoogle}
                </span>
              </button>

              <div
                aria-hidden="true"
                className="my-5 flex items-center gap-3"
              >
                <span className="h-px flex-1 bg-white/10" />

                <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#EDEDE3]/45">
                  ou
                </span>

                <span className="h-px flex-1 bg-white/10" />
              </div>
            </div>
          )}

          <form
            onSubmit={
              handleSubmit
            }
            aria-busy={
              bloqueado
            }
            aria-describedby={
              erro
                ? 'login-erro'
                : sucesso
                  ? 'login-sucesso'
                  : undefined
            }
            className={
              googleDisponivel
                ? 'space-y-5'
                : 'mt-6 space-y-5'
            }
          >
            <div>
              <label
                htmlFor="login-email"
                className={
                  labelClass
                }
              >
                E-mail
              </label>

              <input
                id="login-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={
                  false
                }
                required
                disabled={
                  bloqueado
                }
                value={email}
                onChange={(
                  event,
                ) =>
                  setEmail(
                    event.target
                      .value,
                  )
                }
                placeholder="seu.email@exemplo.com"
                className={
                  inputClass
                }
              />
            </div>

            {modo !==
              'recuperacao' && (
              <div>
                <label
                  htmlFor="login-senha"
                  className={
                    labelClass
                  }
                >
                  Senha
                </label>

                <input
                  id="login-senha"
                  name="password"
                  type={
                    mostrarSenha
                      ? 'text'
                      : 'password'
                  }
                  autoComplete={
                    modo ===
                    'cadastro'
                      ? 'new-password'
                      : 'current-password'
                  }
                  autoCapitalize="none"
                  spellCheck={
                    false
                  }
                  minLength={
                    modo ===
                    'cadastro'
                      ? 8
                      : undefined
                  }
                  required
                  disabled={
                    bloqueado
                  }
                  value={senha}
                  onChange={(
                    event,
                  ) =>
                    setSenha(
                      event.target
                        .value,
                    )
                  }
                  placeholder={
                    modo ===
                    'cadastro'
                      ? 'Pelo menos 8 caracteres'
                      : 'Sua senha'
                  }
                  className={
                    inputClass
                  }
                />

                <button
                  type="button"
                  disabled={
                    bloqueado
                  }
                  aria-pressed={
                    mostrarSenha
                  }
                  aria-controls={
                    modo ===
                    'cadastro'
                      ? 'login-senha login-confirmacao'
                      : 'login-senha'
                  }
                  onClick={() =>
                    setMostrarSenha(
                      (
                        atual,
                      ) =>
                        !atual,
                    )
                  }
                  className={`mt-1 inline-flex min-h-12 items-center rounded-lg px-1 text-sm font-medium text-[#F4C77E] hover:underline disabled:opacity-50 ${focoClass}`}
                >
                  {mostrarSenha
                    ? 'Ocultar senha'
                    : 'Mostrar senha'}
                </button>
              </div>
            )}

            {modo ===
              'cadastro' && (
              <div>
                <label
                  htmlFor="login-confirmacao"
                  className={
                    labelClass
                  }
                >
                  Confirme a senha
                </label>

                <input
                  id="login-confirmacao"
                  name="password-confirmation"
                  type={
                    mostrarSenha
                      ? 'text'
                      : 'password'
                  }
                  autoComplete="new-password"
                  autoCapitalize="none"
                  spellCheck={
                    false
                  }
                  minLength={8}
                  required
                  disabled={
                    bloqueado
                  }
                  value={
                    confirmacaoSenha
                  }
                  onChange={(
                    event,
                  ) =>
                    setConfirmacaoSenha(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Repita a senha"
                  className={
                    inputClass
                  }
                />
              </div>
            )}

            {modo ===
              'cadastro' &&
              acesso ===
                'operadora' && (
                <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm leading-6 text-[#EDEDE3]/75">
                  Esta etapa
                  cria apenas seu
                  usuário. Para
                  integrar uma
                  operadora
                  existente,
                  solicite um
                  convite ao
                  administrador.
                  Cada colaborador
                  utiliza seu
                  próprio login.
                </p>
              )}

            {modo ===
              'cadastro' &&
              (
                acesso ===
                  'guia' ||
                acesso ===
                  'fornecedor'
              ) && (
                <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm leading-6 text-[#EDEDE3]/75">
                  Este cadastro
                  pertence à Rede
                  ERN. Depois da
                  autenticação,
                  você confirmará
                  sua modalidade e
                  preencherá seu
                  perfil
                  profissional.
                  Ele não cria
                  vínculo com uma
                  operadora.
                </p>
              )}

            <button
              type="submit"
              disabled={
                bloqueado
              }
              className={`flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#E3A144] px-4 py-3 text-base font-bold text-[#07130F] transition-colors hover:bg-[#F0B35C] disabled:cursor-not-allowed disabled:opacity-60 ${focoClass}`}
            >
              {
                textoBotao
              }
            </button>
          </form>

          <div className="mt-4 flex flex-col gap-1">
            {modo ===
            'login' ? (
              <>
                <button
                  type="button"
                  disabled={
                    bloqueado
                  }
                  onClick={() =>
                    alterarModo(
                      'cadastro',
                    )
                  }
                  className={`min-h-12 w-full rounded-xl px-3 py-2 text-sm font-medium text-[#F4C77E] hover:bg-white/[0.03] disabled:opacity-50 ${focoClass}`}
                >
                  Não tem conta?
                  Cadastre-se
                </button>

                <button
                  type="button"
                  disabled={
                    bloqueado
                  }
                  onClick={() =>
                    alterarModo(
                      'recuperacao',
                    )
                  }
                  className={`min-h-12 w-full rounded-xl px-3 py-2 text-sm text-[#EDEDE3]/75 hover:bg-white/[0.03] disabled:opacity-50 ${focoClass}`}
                >
                  Esqueci minha
                  senha
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={
                  bloqueado
                }
                onClick={() =>
                  alterarModo(
                    'login',
                  )
                }
                className={`min-h-12 w-full rounded-xl px-3 py-2 text-sm font-medium text-[#F4C77E] hover:bg-white/[0.03] disabled:opacity-50 ${focoClass}`}
              >
                Voltar para
                entrar
              </button>
            )}
          </div>

          <footer className="mt-5 border-t border-white/10 pt-3 text-center">
            <Link
              href="/"
              className={`inline-flex min-h-12 items-center justify-center rounded-lg px-2 text-sm text-[#EDEDE3]/70 transition-colors hover:text-[#F4C77E] ${focoClass}`}
            >
              Explorar o portal
              sem entrar
            </Link>
          </footer>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          className="flex min-h-dvh items-center justify-center bg-[#07110E] px-5 text-sm text-[#EDEDE3]/75"
        >
          Carregando acesso...
        </div>
      }
    >
      <FormularioLogin />
    </Suspense>
  );
}
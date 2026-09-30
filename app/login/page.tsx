'use client';

import {
  Suspense,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { supabase } from '@/lib/supabase';
import { interpretarTipoAcesso } from '@/lib/acessos';

type Modo = 'login' | 'cadastro' | 'recuperacao';

const apresentacoes = {
  operadora: {
    titulo: 'Acesso da operadora',
    descricao:
      'Entre para acessar a gestão da empresa à qual sua conta está vinculada.',
  },
  guia: {
    titulo: 'Acesso do guia',
    descricao:
      'Entre ou crie sua conta para iniciar seu cadastro individual de guia na ERN.',
  },
  fornecedor: {
    titulo: 'Acesso do fornecedor',
    descricao:
      'Entre ou crie sua conta para iniciar seu cadastro de fornecedor na ERN.',
  },
};

function mensagemDoErro(
  error: unknown,
  alternativa: string
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
    searchParams.get('acesso')
  );

  const apresentacao = acesso
    ? apresentacoes[acesso]
    : {
        titulo: 'Acesse sua conta ERN',
        descricao:
          'Entre para consultar seus acessos ou crie sua conta.',
      };

  const destinoAcesso = acesso
    ? `/acesso?acesso=${acesso}`
    : '/acesso';

  const [modo, setModo] = useState<Modo>('login');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] =
    useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const [loading, setLoading] = useState(false);
  const [redirecionando, setRedirecionando] =
    useState(false);

  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const emProcessamento = useRef(false);
  const bloqueado = loading || redirecionando;

  function alterarModo(proximo: Modo) {
    if (emProcessamento.current || redirecionando) return;

    setModo(proximo);
    setSenha('');
    setConfirmacaoSenha('');
    setMostrarSenha(false);
    setErro('');
    setSucesso('');
  }

  function criarUrlRetorno(destino: string) {
    const url = new URL(
      '/auth/callback',
      window.location.origin
    );

    url.searchParams.set('next', destino);

    return url.toString();
  }

  function continuar() {
    setRedirecionando(true);
    window.location.assign(destinoAcesso);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (emProcessamento.current || redirecionando) return;

    setErro('');
    setSucesso('');

    const emailInformado = email.trim();

    if (!emailInformado) {
      setErro('Informe seu e-mail.');
      return;
    }

    if (modo === 'cadastro') {
      if (senha.length < 8) {
        setErro('Use uma senha com pelo menos 8 caracteres.');
        return;
      }

      if (senha !== confirmacaoSenha) {
        setErro('As senhas não coincidem.');
        return;
      }
    }

    emProcessamento.current = true;
    setLoading(true);

    try {
      if (modo === 'recuperacao') {
        const { error } =
          await supabase.auth.resetPasswordForEmail(
            emailInformado,
            {
              redirectTo: criarUrlRetorno(
                '/auth/nova-senha'
              ),
            }
          );

        if (error) {
          setErro(
            mensagemDoErro(
              error,
              'Não foi possível solicitar a recuperação. Tente novamente.'
            )
          );
          return;
        }

        setSucesso(
          'Se houver uma conta apta à recuperação com esse e-mail, você receberá as instruções. Confira também a pasta de spam.'
        );
        return;
      }

      if (modo === 'cadastro') {
        const { data, error } = await supabase.auth.signUp({
          email: emailInformado,
          password: senha,
          options: {
            emailRedirectTo: criarUrlRetorno(
              destinoAcesso
            ),
          },
        });

        if (error) {
          setErro(
            mensagemDoErro(
              error,
              'Não foi possível concluir o cadastro. Confira os dados ou tente entrar com sua conta.'
            )
          );
          return;
        }

        setSenha('');
        setConfirmacaoSenha('');

        if (data.session) {
          continuar();
          return;
        }

        setModo('login');
        setSucesso(
          'Confira seu e-mail para concluir o cadastro. Se sua conta já existe, entre normalmente ou recupere a senha.'
        );
        return;
      }

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: emailInformado,
          password: senha,
        });

      if (error) {
        setErro(
          mensagemDoErro(
            error,
            'Não foi possível entrar. Confira sua conexão e tente novamente.'
          )
        );
        return;
      }

      if (!data.session) {
        setErro(
          'Não foi possível iniciar a sessão. Tente novamente.'
        );
        return;
      }

      setSenha('');
      continuar();
    } catch {
      setErro(
        'Não foi possível concluir a solicitação. Confira sua conexão e tente novamente.'
      );
    } finally {
      emProcessamento.current = false;
      setLoading(false);
    }
  }

  const titulo =
    modo === 'recuperacao'
      ? 'Recuperar senha'
      : modo === 'cadastro'
        ? 'Crie sua conta ERN'
        : apresentacao.titulo;

  const descricao =
    modo === 'recuperacao'
      ? 'Informe o e-mail da sua conta para receber as instruções de recuperação.'
      : modo === 'cadastro'
        ? 'Use seu e-mail e escolha uma senha. A conclusão do cadastro profissional acontece após a autenticação.'
        : apresentacao.descricao;

  const textoBotao = redirecionando
    ? 'Continuando...'
    : loading
      ? 'Processando...'
      : modo === 'cadastro'
        ? 'Criar conta'
        : modo === 'recuperacao'
          ? 'Enviar instruções'
          : 'Entrar';

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-[#07110E] px-4 py-3.5 text-sm text-[#EDEDE3] outline-none transition placeholder:text-[#EDEDE3]/30 focus:border-[#E3A144]/60 disabled:opacity-50';

  const labelClass =
    'mb-2 block text-xs font-semibold text-[#EDEDE3]/70';

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07110E] px-4 py-10 text-[#EDEDE3] sm:px-6">
      <div className="w-full max-w-md">
        <Link
          href="/operadores#acessos-profissionais"
          className="mb-6 inline-flex min-h-[44px] items-center gap-2 text-sm text-[#EDEDE3]/60 transition hover:text-[#E3A144]"
        >
          <span aria-hidden="true">←</span>
          Voltar aos acessos
        </Link>

        <div className="rounded-[28px] border border-white/[0.08] bg-[#0D1B16] p-6 shadow-2xl sm:p-8">
          <div className="text-center">
            <Link
              href="/"
              aria-label="Ir ao portal Encantos Rio Negro"
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#E3A144]/25 bg-[#E3A144]/10 text-xl font-bold tracking-wider text-[#E3A144]"
            >
              ERN
            </Link>

            <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
              Encantos Rio Negro
            </p>

            <h1
              className="mt-3 text-3xl leading-tight text-[#F0F0E8]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              {titulo}
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#EDEDE3]/55">
              {descricao}
            </p>
          </div>

          {erro && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-500/25 bg-red-500/[0.08] p-4 text-sm text-red-300"
            >
              {erro}
            </div>
          )}

          {sucesso && (
            <div
              role="status"
              className="mt-6 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] p-4 text-sm text-emerald-300"
            >
              {sucesso}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-7 space-y-5"
          >
            <div>
              <label
                htmlFor="login-email"
                className={labelClass}
              >
                E-mail
              </label>

              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                disabled={bloqueado}
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="seu.email@exemplo.com"
                className={inputClass}
              />
            </div>

            {modo !== 'recuperacao' && (
              <div>
                <label
                  htmlFor="login-senha"
                  className={labelClass}
                >
                  Senha
                </label>

                <input
                  id="login-senha"
                  name="password"
                  type={mostrarSenha ? 'text' : 'password'}
                  autoComplete={
                    modo === 'cadastro'
                      ? 'new-password'
                      : 'current-password'
                  }
                  minLength={
                    modo === 'cadastro' ? 8 : undefined
                  }
                  required
                  disabled={bloqueado}
                  value={senha}
                  onChange={(event) =>
                    setSenha(event.target.value)
                  }
                  placeholder={
                    modo === 'cadastro'
                      ? 'Pelo menos 8 caracteres'
                      : 'Sua senha'
                  }
                  className={inputClass}
                />

                <button
                  type="button"
                  disabled={bloqueado}
                  aria-pressed={mostrarSenha}
                  onClick={() =>
                    setMostrarSenha((atual) => !atual)
                  }
                  className="mt-2 min-h-[36px] text-xs font-semibold text-[#E3A144] hover:underline disabled:opacity-50"
                >
                  {mostrarSenha
                    ? 'Ocultar senha'
                    : 'Mostrar senha'}
                </button>
              </div>
            )}

            {modo === 'cadastro' && (
              <div>
                <label
                  htmlFor="login-confirmacao"
                  className={labelClass}
                >
                  Confirme a senha
                </label>

                <input
                  id="login-confirmacao"
                  name="password-confirmation"
                  type={mostrarSenha ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  disabled={bloqueado}
                  value={confirmacaoSenha}
                  onChange={(event) =>
                    setConfirmacaoSenha(
                      event.target.value
                    )
                  }
                  placeholder="Repita a senha"
                  className={inputClass}
                />
              </div>
            )}

            {modo === 'cadastro' &&
              acesso === 'operadora' && (
                <p className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-xs leading-5 text-[#EDEDE3]/55">
                  Criar uma conta não cria uma empresa nem
                  concede acesso a uma operadora existente.
                  O acesso empresarial depende de um vínculo
                  autorizado.
                </p>
              )}

            <button
              type="submit"
              disabled={bloqueado}
              className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#E3A144] px-5 py-3 text-sm font-bold text-[#07130F] transition hover:bg-[#F0B35C] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {textoBotao}
            </button>
          </form>

          <div className="mt-5 flex flex-col gap-2 text-sm">
            {modo === 'login' ? (
              <>
                <button
                  type="button"
                  disabled={bloqueado}
                  onClick={() => alterarModo('cadastro')}
                  className="min-h-[44px] text-[#E3A144] hover:underline disabled:opacity-50"
                >
                  Não tem conta? Cadastre-se
                </button>

                <button
                  type="button"
                  disabled={bloqueado}
                  onClick={() =>
                    alterarModo('recuperacao')
                  }
                  className="min-h-[44px] text-[#EDEDE3]/60 hover:underline disabled:opacity-50"
                >
                  Esqueci minha senha
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={bloqueado}
                onClick={() => alterarModo('login')}
                className="min-h-[44px] text-[#E3A144] hover:underline disabled:opacity-50"
              >
                Voltar para entrar
              </button>
            )}
          </div>

          <div className="mt-6 border-t border-white/[0.07] pt-5 text-center">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center text-xs text-[#EDEDE3]/50 transition hover:text-[#E3A144]"
            >
              Explorar o portal sem entrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          className="flex min-h-screen items-center justify-center bg-[#07110E] px-5 text-sm text-[#EDEDE3]/60"
        >
          Carregando acesso...
        </div>
      }
    >
      <FormularioLogin />
    </Suspense>
  );
}
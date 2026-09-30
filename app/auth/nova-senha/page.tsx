'use client';

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import Link from 'next/link';

import LogoERN from '@/app/components/LogoERN';
import { supabase } from '@/lib/supabase';

interface ContaSenha {
  id: string;
  email: string | null;
}

const FOCO =
  'focus-visible:outline-2 focus-visible:outline-offset-4 ' +
  'focus-visible:outline-[#E3A144]';

const INPUT =
  'block min-h-[52px] w-full min-w-0 scroll-mt-6 rounded-xl ' +
  'border border-white/20 bg-[#07110E] px-4 py-3 text-base ' +
  'leading-6 text-[#F0F0E8] outline-none transition-colors ' +
  'placeholder:text-[#EDEDE3]/45 focus:border-[#E3A144] ' +
  'focus:ring-2 focus:ring-[#E3A144]/20 disabled:opacity-60';

function mensagemErroSenha(codigo?: string): string {
  switch (codigo) {
    case 'same_password':
      return 'Escolha uma senha diferente da atual.';

    case 'weak_password':
      return 'A senha não atende aos requisitos de segurança. Escolha uma senha mais forte.';

    case 'reauthentication_needed':
    case 'reauthentication_not_valid':
      return 'É necessário confirmar sua identidade novamente. Solicite um novo link de recuperação pelo login.';

    case 'session_not_found':
    case 'refresh_token_not_found':
    case 'refresh_token_already_used':
      return 'Sua sessão não está disponível. Entre novamente ou solicite um novo link de recuperação.';

    case 'over_request_rate_limit':
      return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';

    default:
      return 'Não foi possível confirmar a alteração da senha. Confira sua conexão e tente novamente.';
  }
}

export default function NovaSenhaPage() {
  const [conta, setConta] = useState<ContaSenha | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');

  const ocupado = useRef(false);
  const avisoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ativo = true;

    async function verificarSessao() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (!ativo) return;

        if (error || !user || user.is_anonymous) {
          setErro(
            'Não foi possível validar sua sessão. Abra um link válido de convite ou recuperação, ou entre novamente.',
          );
          return;
        }

        setConta({
          id: user.id,
          email: user.email ?? null,
        });
      } catch {
        if (ativo) {
          setErro(
            'Não foi possível verificar sua sessão. Confira a conexão e atualize a página.',
          );
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void verificarSessao();

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (erro || concluido) {
      avisoRef.current?.scrollIntoView({
        block: 'nearest',
        behavior: 'auto',
      });
    }
  }, [erro, concluido]);

  async function salvarSenha(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (ocupado.current || concluido || !conta) return;

    setErro('');

    if (senha.length < 8) {
      setErro('Use uma senha com pelo menos 8 caracteres.');
      return;
    }

    if (senha !== confirmacao) {
      setErro('As senhas não coincidem.');
      return;
    }

    ocupado.current = true;
    setSalvando(true);

    try {
      const {
        data: { user },
        error: erroSessao,
      } = await supabase.auth.getUser();

      if (erroSessao || !user || user.is_anonymous) {
        setConta(null);
        setSenha('');
        setConfirmacao('');
        setErro(
          'Sua sessão não está disponível. Entre novamente ou solicite um novo link de recuperação.',
        );
        return;
      }

      if (user.id !== conta.id) {
        setConta(null);
        setSenha('');
        setConfirmacao('');
        setErro(
          'A conta conectada mudou. Recarregue a página e confira o e-mail antes de continuar.',
        );
        return;
      }

      const { data, error } =
        await supabase.auth.updateUser({
          password: senha,
        });

      if (error) {
        setErro(mensagemErroSenha(error.code));
        return;
      }

      if (!data.user || data.user.id !== conta.id) {
        setErro(
          'Não foi possível confirmar a alteração para esta conta. Confira seu acesso antes de tentar novamente.',
        );
        return;
      }

      setSenha('');
      setConfirmacao('');
      setMostrarSenha(false);
      setConcluido(true);
    } catch {
      setErro(
        'Não foi possível confirmar a alteração. Confira sua conexão. Se necessário, tente entrar com a nova senha ou solicite outro link de recuperação.',
      );
    } finally {
      ocupado.current = false;
      setSalvando(false);
    }
  }

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
      <div className="mx-auto my-auto w-full min-w-0 max-w-[460px] py-4">
        <section
          aria-labelledby="senha-titulo"
          className="rounded-3xl border border-white/10 bg-[#0D1B16] p-5 shadow-xl sm:p-8"
        >
          <header className="text-center">
            <Link
              href="/"
              aria-label="Ir ao portal Encantos Rio Negro"
              className={`inline-flex rounded-full align-middle ${FOCO}`}
            >
              <LogoERN tamanho={76} prioridade />
            </Link>

            <p className="mt-3 text-sm font-semibold text-[#F4C77E]">
              Encantos Rio Negro
            </p>

            <h1
              id="senha-titulo"
              className="mt-4 text-2xl leading-tight text-[#F0F0E8] sm:text-3xl"
              style={{
                fontFamily: 'var(--font-fraunces), serif',
              }}
            >
              {concluido
                ? 'Senha atualizada'
                : 'Defina sua senha'}
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#EDEDE3]/75">
              {concluido
                ? 'Sua nova senha foi salva com sucesso.'
                : 'Escolha uma senha que você não utiliza em outros serviços.'}
            </p>

            {conta?.email && (
              <p className="mt-4 break-all rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm leading-6 text-[#EDEDE3]/80">
                Conta: {conta.email}
              </p>
            )}
          </header>

          <div ref={avisoRef} className="scroll-mt-6">
            {erro && (
              <div
                role="alert"
                className="mt-5 break-words rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200"
              >
                {erro}
              </div>
            )}

            {concluido && (
              <div
                role="status"
                className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-200"
              >
                Você já pode continuar para o espaço da sua conta.
              </div>
            )}
          </div>

          {carregando ? (
            <p
              role="status"
              className="mt-6 text-center text-sm text-[#EDEDE3]/75"
            >
              Verificando sua sessão...
            </p>
          ) : concluido ? (
            <Link
              href="/acesso"
              className={`mt-6 flex min-h-[52px] items-center justify-center rounded-xl bg-[#E3A144] px-5 py-3 text-base font-bold text-[#07130F] hover:bg-[#F0B35C] ${FOCO}`}
            >
              Continuar
            </Link>
          ) : !conta ? (
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className={`min-h-12 w-full rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold hover:bg-white/5 ${FOCO}`}
              >
                Verificar novamente
              </button>

              <Link
                href="/login"
                className={`flex min-h-[52px] items-center justify-center rounded-xl bg-[#E3A144] px-5 py-3 text-base font-bold text-[#07130F] hover:bg-[#F0B35C] ${FOCO}`}
              >
                Ir para o login
              </Link>

              <p className="text-center text-sm leading-6 text-[#EDEDE3]/70">
                No login, use “Esqueci minha senha” para
                solicitar outro link.
              </p>
            </div>
          ) : (
            <form
              onSubmit={salvarSenha}
              aria-busy={salvando}
              className="mt-6 space-y-5"
            >
              <div>
                <label
                  htmlFor="nova-senha"
                  className="mb-2 block text-sm font-medium text-[#EDEDE3]/85"
                >
                  Nova senha
                </label>

                <input
                  id="nova-senha"
                  name="password"
                  type={mostrarSenha ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  spellCheck={false}
                  minLength={8}
                  required
                  disabled={salvando}
                  value={senha}
                  onChange={(event) =>
                    setSenha(event.target.value)
                  }
                  placeholder="Pelo menos 8 caracteres"
                  className={INPUT}
                />
              </div>

              <div>
                <label
                  htmlFor="confirmar-nova-senha"
                  className="mb-2 block text-sm font-medium text-[#EDEDE3]/85"
                >
                  Confirme a nova senha
                </label>

                <input
                  id="confirmar-nova-senha"
                  name="password-confirmation"
                  type={mostrarSenha ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  spellCheck={false}
                  minLength={8}
                  required
                  disabled={salvando}
                  value={confirmacao}
                  onChange={(event) =>
                    setConfirmacao(event.target.value)
                  }
                  placeholder="Repita a nova senha"
                  className={INPUT}
                />
              </div>

              <button
                type="button"
                disabled={salvando}
                aria-pressed={mostrarSenha}
                aria-controls="nova-senha confirmar-nova-senha"
                onClick={() =>
                  setMostrarSenha((atual) => !atual)
                }
                className={`min-h-12 rounded-lg px-1 text-sm font-medium text-[#F4C77E] hover:underline disabled:opacity-50 ${FOCO}`}
              >
                {mostrarSenha
                  ? 'Ocultar senhas'
                  : 'Mostrar senhas'}
              </button>

              <button
                type="submit"
                disabled={salvando}
                className={`flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#E3A144] px-5 py-3 text-base font-bold text-[#07130F] hover:bg-[#F0B35C] disabled:cursor-not-allowed disabled:opacity-60 ${FOCO}`}
              >
                {salvando
                  ? 'Salvando...'
                  : 'Salvar nova senha'}
              </button>
            </form>
          )}

          <footer className="mt-6 border-t border-white/10 pt-3 text-center">
            <Link
              href="/"
              className={`inline-flex min-h-12 items-center justify-center rounded-lg px-2 text-sm text-[#EDEDE3]/70 hover:text-[#F4C77E] ${FOCO}`}
            >
              Voltar ao portal público
            </Link>
          </footer>
        </section>
      </div>
    </main>
  );
}
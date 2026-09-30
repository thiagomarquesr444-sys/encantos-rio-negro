'use client';

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface ContaSenha {
  id: string;
  email: string | null;
}

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
  const [conta, setConta] = useState<ContaSenha | null>(
    null
  );
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');

  const ocupado = useRef(false);

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
            'Não foi possível validar sua sessão. Abra um link válido de convite ou recuperação, ou entre novamente.'
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
            'Não foi possível verificar sua sessão. Confira a conexão e atualize a página.'
          );
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    void verificarSessao();

    return () => {
      ativo = false;
    };
  }, []);

  async function salvarSenha(
    event: FormEvent<HTMLFormElement>
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
        setErro(
          'Sua sessão não está disponível. Entre novamente ou solicite um novo link de recuperação.'
        );
        return;
      }

      if (user.id !== conta.id) {
        setConta(null);
        setSenha('');
        setConfirmacao('');
        setErro(
          'A conta conectada mudou. Recarregue a página e confira o e-mail antes de continuar.'
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
          'Não foi possível confirmar a alteração para esta conta. Confira seu acesso antes de tentar novamente.'
        );
        return;
      }

      setSenha('');
      setConfirmacao('');
      setMostrarSenha(false);
      setConcluido(true);
    } catch {
      setErro(
        'Não foi possível confirmar a alteração. Confira sua conexão. Se necessário, tente entrar com a nova senha ou solicite outro link de recuperação.'
      );
    } finally {
      ocupado.current = false;
      setSalvando(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-[#07110E] px-4 py-3.5 text-sm text-[#EDEDE3] outline-none transition placeholder:text-[#EDEDE3]/30 focus:border-[#E3A144]/60 disabled:opacity-50';

  const labelClass =
    'mb-2 block text-xs font-semibold text-[#EDEDE3]/70';

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07110E] px-4 py-10 text-[#EDEDE3] sm:px-6">
      <div className="w-full max-w-md rounded-[28px] border border-white/[0.08] bg-[#0D1B16] p-6 shadow-2xl sm:p-8">
        <header className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
            Encantos Rio Negro
          </p>

          <h1
            className="mt-4 text-3xl leading-tight text-[#F0F0E8]"
            style={{
              fontFamily:
                'var(--font-fraunces), serif',
            }}
          >
            {concluido
              ? 'Senha atualizada'
              : 'Defina sua senha'}
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#EDEDE3]/55">
            {concluido
              ? 'Sua nova senha foi salva com sucesso.'
              : 'Escolha uma senha que você não utiliza em outros serviços.'}
          </p>

          {conta?.email && (
            <p className="mt-4 break-all rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-xs text-[#EDEDE3]/65">
              Conta: {conta.email}
            </p>
          )}
        </header>

        {erro && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-500/25 bg-red-500/[0.08] p-4 text-sm leading-6 text-red-300"
          >
            {erro}
          </div>
        )}

        {carregando ? (
          <p
            role="status"
            className="mt-7 text-center text-sm text-[#EDEDE3]/55"
          >
            Verificando sua sessão...
          </p>
        ) : concluido ? (
          <div className="mt-7">
            <div
              role="status"
              className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] p-4 text-sm text-emerald-300"
            >
              Você já pode continuar para seus acessos.
            </div>

            <Link
              href="/acesso"
              className="mt-5 flex min-h-[48px] items-center justify-center rounded-xl bg-[#E3A144] px-5 py-3 text-sm font-bold text-[#07130F] transition hover:bg-[#F0B35C]"
            >
              Continuar
            </Link>
          </div>
        ) : !conta ? (
          <div className="mt-7 space-y-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[48px] w-full rounded-xl border border-white/10 px-5 text-sm font-semibold text-[#EDEDE3]/70 transition hover:bg-white/[0.04]"
            >
              Verificar novamente
            </button>

            <Link
              href="/login"
              className="flex min-h-[48px] items-center justify-center rounded-xl bg-[#E3A144] px-5 py-3 text-sm font-bold text-[#07130F] transition hover:bg-[#F0B35C]"
            >
              Ir para o login
            </Link>

            <p className="text-center text-xs leading-6 text-[#EDEDE3]/45">
              No login, use “Esqueci minha senha” para
              solicitar outro link.
            </p>
          </div>
        ) : (
          <form
            onSubmit={salvarSenha}
            className="mt-7 space-y-5"
          >
            <div>
              <label
                htmlFor="nova-senha"
                className={labelClass}
              >
                Nova senha
              </label>

              <input
                id="nova-senha"
                name="password"
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={8}
                required
                disabled={salvando}
                value={senha}
                onChange={(event) =>
                  setSenha(event.target.value)
                }
                placeholder="Pelo menos 8 caracteres"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="confirmar-nova-senha"
                className={labelClass}
              >
                Confirme a nova senha
              </label>

              <input
                id="confirmar-nova-senha"
                name="password-confirmation"
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={8}
                required
                disabled={salvando}
                value={confirmacao}
                onChange={(event) =>
                  setConfirmacao(event.target.value)
                }
                placeholder="Repita a nova senha"
                className={inputClass}
              />
            </div>

            <button
              type="button"
              disabled={salvando}
              aria-pressed={mostrarSenha}
              onClick={() =>
                setMostrarSenha((atual) => !atual)
              }
              className="min-h-[36px] text-xs font-semibold text-[#E3A144] hover:underline disabled:opacity-50"
            >
              {mostrarSenha
                ? 'Ocultar senhas'
                : 'Mostrar senhas'}
            </button>

            <button
              type="submit"
              disabled={salvando}
              className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#E3A144] px-5 py-3 text-sm font-bold text-[#07130F] transition hover:bg-[#F0B35C] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {salvando
                ? 'Salvando...'
                : 'Salvar nova senha'}
            </button>
          </form>
        )}

        <footer className="mt-7 border-t border-white/[0.07] pt-4 text-center">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center text-xs text-[#EDEDE3]/50 transition hover:text-[#E3A144]"
          >
            Voltar ao portal público
          </Link>
        </footer>
      </div>
    </div>
  );
}
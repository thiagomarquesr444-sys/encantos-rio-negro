'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';

type Conta = {
  id: string;
  email: string;
};

type Feedback = {
  tipo: 'erro' | 'sucesso';
  texto: string;
};

function explicarErro(codigo?: string) {
  switch (codigo) {
    case 'same_password':
      return 'Escolha uma senha diferente da atual.';
    case 'weak_password':
      return 'A senha não atende aos requisitos de segurança da conta.';
    case 'reauthentication_needed':
    case 'reauthentication_not_valid':
      return 'Confirme seu acesso entrando novamente antes de alterar a senha.';
    case 'session_not_found':
    case 'refresh_token_not_found':
      return 'Sua sessão expirou. Entre novamente.';
    case 'over_request_rate_limit':
      return 'Aguarde alguns minutos antes de tentar novamente.';
    default:
      return 'Não foi possível confirmar a alteração. Confira sua conexão antes de tentar novamente.';
  }
}

export default function SegurancaContaERN() {
  const [conta, setConta] = useState<Conta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [tentativa, setTentativa] = useState(0);
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const trava = useRef(false);
  const aviso = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setConta(null);
      setFeedback(null);

      try {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user || data.user.is_anonymous) {
          throw new Error('Sessão indisponível.');
        }

        if (ativo) {
          setConta({
            id: data.user.id,
            email: data.user.email ?? '',
          });
        }
      } catch {
        if (ativo) {
          setFeedback({
            tipo: 'erro',
            texto: 'Não foi possível verificar sua conta. Tente novamente ou entre novamente.',
          });
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, [tentativa]);

  useEffect(() => {
    if (feedback) aviso.current?.focus();
  }, [feedback]);

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (trava.current || !conta) return;

    if (senha.length < 8 || senha !== confirmacao) {
      setFeedback({
        tipo: 'erro',
        texto:
          senha.length < 8
            ? 'Use pelo menos 8 caracteres.'
            : 'As senhas não coincidem.',
      });
      return;
    }

    trava.current = true;
    setSalvando(true);
    setFeedback(null);

    try {
      const { data: identidade, error: erroIdentidade } =
        await supabase.auth.getUser();

      if (
        erroIdentidade ||
        !identidade.user ||
        identidade.user.is_anonymous ||
        identidade.user.id !== conta.id
      ) {
        setConta(null);
        setSenha('');
        setConfirmacao('');
        setMostrar(false);
        setFeedback({
          tipo: 'erro',
          texto: 'A sessão expirou ou a conta mudou. Entre novamente antes de continuar.',
        });
        return;
      }

      const { data, error } = await supabase.auth.updateUser({
        password: senha,
      });

      if (error) {
        setFeedback({
          tipo: 'erro',
          texto: explicarErro(error.code),
        });
        return;
      }

      if (!data.user || data.user.id !== conta.id) {
        setFeedback({
          tipo: 'erro',
          texto: 'Não foi possível confirmar a alteração para esta conta. Confira seu acesso.',
        });
        return;
      }

      setSenha('');
      setConfirmacao('');
      setMostrar(false);
      setFeedback({
        tipo: 'sucesso',
        texto: 'Sua senha foi atualizada com sucesso.',
      });
    } catch {
      setFeedback({
        tipo: 'erro',
        texto: 'A conexão falhou e não foi possível confirmar o resultado. Confira seu acesso antes de repetir.',
      });
    } finally {
      trava.current = false;
      setSalvando(false);
    }
  }

  const campo =
    'mt-2 min-h-12 w-full min-w-0 rounded-xl border ' +
    'border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-3 ' +
    'text-base text-[var(--ern-texto)] focus-visible:outline-none ' +
    'focus-visible:ring-2 focus-visible:ring-[var(--ern-destaque)] ' +
    'disabled:opacity-60';

  const botao =
    'min-h-12 rounded-xl border border-[var(--ern-borda)] ' +
    'px-4 text-sm font-semibold focus-visible:outline-none ' +
    'focus-visible:ring-2 focus-visible:ring-[var(--ern-destaque)] ' +
    'disabled:opacity-60';

  return (
    <section
      aria-labelledby="seguranca-conta-ern"
      className="min-w-0 rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-4 text-[var(--ern-texto)] sm:p-6"
    >
      <h2 id="seguranca-conta-ern" className="text-lg font-semibold">
        Segurança da sua conta
      </h2>

      <p className="mt-2 text-sm leading-6">
        A senha pertence ao seu usuário. Alterá-la afeta apenas seu acesso
        pessoal.
      </p>

      {carregando ? (
        <p role="status" className="mt-4 text-sm">
          Verificando sua conta…
        </p>
      ) : conta ? (
        <form
          onSubmit={salvar}
          aria-busy={salvando}
          className="mt-5 space-y-4"
        >
          {conta.email && (
            <p className="break-all text-sm">
              Conta conectada: <strong>{conta.email}</strong>
            </p>
          )}

          <fieldset
            disabled={salvando}
            className="grid min-w-0 gap-4 sm:grid-cols-2"
          >
            <legend className="sr-only">Definir nova senha</legend>

            <label className="min-w-0 text-sm">
              Nova senha
              <input
                id="ern-nova-senha"
                name="nova_senha"
                type={mostrar ? 'text' : 'password'}
                autoComplete="new-password"
                autoCapitalize="none"
                spellCheck={false}
                minLength={8}
                required
                value={senha}
                onChange={(event) => {
                  setSenha(event.target.value);
                  setFeedback(null);
                }}
                aria-describedby="ern-ajuda-senha"
                className={campo}
              />
            </label>

            <label className="min-w-0 text-sm">
              Confirmar nova senha
              <input
                id="ern-confirmar-senha"
                name="confirmacao_senha"
                type={mostrar ? 'text' : 'password'}
                autoComplete="new-password"
                autoCapitalize="none"
                spellCheck={false}
                minLength={8}
                required
                value={confirmacao}
                onChange={(event) => {
                  setConfirmacao(event.target.value);
                  setFeedback(null);
                }}
                className={campo}
              />
            </label>
          </fieldset>

          <p id="ern-ajuda-senha" className="text-xs leading-6">
            Use pelo menos 8 caracteres. Prefira uma senha longa e exclusiva
            para a ERN.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={salvando}
              aria-pressed={mostrar}
              aria-controls="ern-nova-senha ern-confirmar-senha"
              onClick={() => setMostrar((atual) => !atual)}
              className={botao}
            >
              {mostrar ? 'Ocultar senhas' : 'Mostrar senhas'}
            </button>

            <button
              type="submit"
              disabled={salvando}
              className={botao}
            >
              {salvando ? 'Atualizando…' : 'Atualizar minha senha'}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setTentativa((atual) => atual + 1)}
          className={`${botao} mt-4`}
        >
          Verificar conta novamente
        </button>
      )}

      {feedback && (
        <p
          ref={aviso}
          tabIndex={-1}
          role={feedback.tipo === 'erro' ? 'alert' : 'status'}
          className="mt-4 rounded-xl border border-[var(--ern-borda)] p-4 text-sm leading-6 outline-none"
        >
          {feedback.texto}
        </p>
      )}
    </section>
  );
}
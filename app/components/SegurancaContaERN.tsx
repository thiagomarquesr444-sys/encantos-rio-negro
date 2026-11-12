'use client';

// EDA_SEGURANCA_CONTA_V2: troca de senha moderna.
// - confirma a senha atual antes de aceitar a nova (impede troca em aparelho esquecido aberto);
// - mesma política forte do cadastro (12+ caracteres, maiúscula, minúscula, número, símbolo);
// - medidor de força ao vivo; opção de encerrar a sessão nos outros aparelhos;
// - mostra o último acesso da conta.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { requisitosSenhaERN, validarSenhaERN } from '@/lib/politicaSenhaERN';

type Conta = { id: string; email: string; ultimoAcesso: string | null };
type Feedback = { tipo: 'erro' | 'sucesso'; texto: string };

function explicarErro(codigo?: string) {
  switch (codigo) {
    case 'same_password': return 'A nova senha precisa ser diferente da atual.';
    case 'weak_password': return 'A senha não atende aos requisitos de segurança da conta.';
    case 'reauthentication_needed':
    case 'reauthentication_not_valid': return 'Confirme sua senha atual e tente de novo.';
    case 'session_not_found':
    case 'refresh_token_not_found': return 'Sua sessão expirou. Entre novamente.';
    case 'over_request_rate_limit': return 'Muitas tentativas. Aguarde alguns minutos.';
    default: return 'Não foi possível confirmar a alteração. Confira sua conexão e tente novamente.';
  }
}

function forca(senha: string) {
  if (!senha) return { nivel: 0, rotulo: '' };
  const ok = requisitosSenhaERN(senha).filter(r => r.ok).length;
  const extra = Array.from(senha).length >= 16 ? 1 : 0;
  const nivel = Math.min(4, Math.max(1, ok - 1 + extra));
  return { nivel, rotulo: ['', 'Fraca', 'Razoável', 'Boa', 'Forte'][nivel] };
}

const dataHora = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Manaus' }).format(new Date(iso)) : null;

export default function SegurancaContaERN() {
  const [conta, setConta] = useState<Conta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [tentativa, setTentativa] = useState(0);
  const [atual, setAtual] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [sairOutros, setSairOutros] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const trava = useRef(false);
  const aviso = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setCarregando(true); setConta(null); setFeedback(null);
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user || data.user.is_anonymous) throw new Error('sessao');
        if (ativo) setConta({ id: data.user.id, email: data.user.email ?? '', ultimoAcesso: data.user.last_sign_in_at ?? null });
      } catch {
        if (ativo) setFeedback({ tipo: 'erro', texto: 'Não foi possível verificar sua conta. Tente novamente ou entre de novo.' });
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, [tentativa]);

  useEffect(() => { if (feedback) aviso.current?.focus(); }, [feedback]);

  function limpar() { setAtual(''); setSenha(''); setConfirmacao(''); setMostrar(false); }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trava.current || !conta) return;
    if (!atual) { setFeedback({ tipo: 'erro', texto: 'Informe sua senha atual.' }); return; }
    const invalida = validarSenhaERN(senha);
    if (invalida) { setFeedback({ tipo: 'erro', texto: invalida }); return; }
    if (senha !== confirmacao) { setFeedback({ tipo: 'erro', texto: 'A confirmação não é igual à nova senha.' }); return; }
    if (senha === atual) { setFeedback({ tipo: 'erro', texto: 'A nova senha precisa ser diferente da atual.' }); return; }

    trava.current = true; setSalvando(true); setFeedback(null);
    try {
      const { data: identidade } = await supabase.auth.getUser();
      if (!identidade.user || identidade.user.is_anonymous || identidade.user.id !== conta.id || !conta.email) {
        setConta(null); limpar();
        setFeedback({ tipo: 'erro', texto: 'A sessão expirou ou a conta mudou. Entre novamente antes de continuar.' });
        return;
      }

      // Confirma que quem está no aparelho conhece a senha atual.
      const { data: reauth, error: erroReauth } = await supabase.auth.signInWithPassword({ email: conta.email, password: atual });
      if (erroReauth || reauth.user?.id !== conta.id) {
        setFeedback({ tipo: 'erro', texto: erroReauth?.code === 'over_request_rate_limit' ? explicarErro(erroReauth.code) : 'A senha atual não confere.' });
        return;
      }

      const { data, error } = await supabase.auth.updateUser({ password: senha });
      if (error) { setFeedback({ tipo: 'erro', texto: explicarErro(error.code) }); return; }
      if (!data.user || data.user.id !== conta.id) {
        setFeedback({ tipo: 'erro', texto: 'Não foi possível confirmar a alteração para esta conta.' });
        return;
      }

      let outros = '';
      if (sairOutros) {
        const { error: erroSair } = await supabase.auth.signOut({ scope: 'others' });
        outros = erroSair ? ' Não consegui encerrar os outros aparelhos agora; tente de novo mais tarde.' : ' Os outros aparelhos foram desconectados.';
      }
      limpar();
      setFeedback({ tipo: 'sucesso', texto: `Senha atualizada.${outros}` });
    } catch {
      setFeedback({ tipo: 'erro', texto: 'A conexão falhou e não foi possível confirmar o resultado. Confira antes de repetir.' });
    } finally {
      trava.current = false; setSalvando(false);
    }
  }

  const campo =
    'mt-2 min-h-12 w-full min-w-0 rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-3 ' +
    'text-base text-[var(--ern-texto)] focus-visible:outline-none focus-visible:ring-2 ' +
    'focus-visible:ring-[var(--ern-destaque)] disabled:opacity-60';
  const botao =
    'min-h-12 rounded-xl border border-[var(--ern-borda)] px-4 text-sm font-semibold ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ern-destaque)] disabled:opacity-60';
  const tipo = mostrar ? 'text' : 'password';
  const medidor = forca(senha);
  const requisitos = requisitosSenhaERN(senha);
  const cores = ['transparent', '#ef4444', '#E3A144', '#9BC53D', '#2FA36B'];

  return (
    <section aria-labelledby="seguranca-conta-ern"
      className="min-w-0 rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-4 text-[var(--ern-texto)] sm:p-6">
      <h2 id="seguranca-conta-ern" className="text-lg font-semibold">Segurança da sua conta</h2>
      <p className="mt-2 text-sm leading-6">A senha é do seu usuário. Trocar aqui muda só o seu acesso.</p>

      {carregando ? (
        <p role="status" className="mt-4 text-sm">Verificando sua conta…</p>
      ) : conta ? (
        <form onSubmit={salvar} aria-busy={salvando} className="mt-5 space-y-4">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {conta.email && <p className="break-all">Conta: <strong>{conta.email}</strong></p>}
            {dataHora(conta.ultimoAcesso) && <p>Último acesso: <strong>{dataHora(conta.ultimoAcesso)}</strong></p>}
          </div>

          <fieldset disabled={salvando} className="grid min-w-0 gap-4 sm:grid-cols-3">
            <legend className="sr-only">Trocar senha</legend>
            <label className="min-w-0 text-sm">
              Senha atual
              <input name="senha_atual" type={tipo} autoComplete="current-password" autoCapitalize="none" spellCheck={false}
                required value={atual} onChange={e => { setAtual(e.target.value); setFeedback(null); }} className={campo} />
            </label>
            <label className="min-w-0 text-sm">
              Nova senha
              <input id="ern-nova-senha" name="nova_senha" type={tipo} autoComplete="new-password" autoCapitalize="none" spellCheck={false}
                required value={senha} onChange={e => { setSenha(e.target.value); setFeedback(null); }}
                aria-describedby="ern-forca-senha" className={campo} />
            </label>
            <label className="min-w-0 text-sm">
              Confirmar nova senha
              <input id="ern-confirmar-senha" name="confirmacao_senha" type={tipo} autoComplete="new-password" autoCapitalize="none" spellCheck={false}
                required value={confirmacao} onChange={e => { setConfirmacao(e.target.value); setFeedback(null); }} className={campo} />
              {confirmacao && <span className="mt-1 block text-xs" aria-live="polite">{confirmacao === senha ? '✓ Confere' : 'Ainda não confere'}</span>}
            </label>
          </fieldset>

          <div id="ern-forca-senha" aria-live="polite">
            <div className="flex gap-1" aria-hidden="true">
              {[1, 2, 3, 4].map(n => (
                <span key={n} className="h-1.5 flex-1 rounded-full bg-[var(--ern-borda)]"
                  style={n <= medidor.nivel ? { background: cores[medidor.nivel] } : undefined} />
              ))}
            </div>
            <p className="mt-2 text-xs">{medidor.rotulo ? `Força: ${medidor.rotulo}` : 'Crie uma senha longa e só sua.'}</p>
            <ul className="mt-2 grid gap-1 text-xs sm:grid-cols-3">
              {requisitos.map(r => (
                <li key={r.id} className={r.ok ? '' : 'opacity-70'}>
                  <span aria-hidden="true">{r.ok ? '✓' : '○'} </span>
                  <span className="sr-only">{r.ok ? 'Atendido: ' : 'Pendente: '}</span>{r.texto}
                </li>
              ))}
            </ul>
          </div>

          <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" checked={sairOutros} disabled={salvando} onChange={e => setSairOutros(e.target.checked)}
              className="h-5 w-5 shrink-0 accent-[var(--ern-destaque)]" />
            Desconectar os outros aparelhos depois de trocar
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" disabled={salvando} aria-pressed={mostrar} onClick={() => setMostrar(m => !m)} className={botao}>
              {mostrar ? 'Ocultar senhas' : 'Mostrar senhas'}
            </button>
            <button type="submit" disabled={salvando} className={botao}>
              {salvando ? 'Confirmando…' : 'Trocar minha senha'}
            </button>
          </div>
          <p className="text-xs leading-6">Esqueceu a senha atual? Saia da conta e use “Esqueci minha senha” na tela de entrada.</p>
        </form>
      ) : (
        <button type="button" onClick={() => setTentativa(t => t + 1)} className={`${botao} mt-4`}>Verificar conta novamente</button>
      )}

      {feedback && (
        <p ref={aviso} tabIndex={-1} role={feedback.tipo === 'erro' ? 'alert' : 'status'}
          className="mt-4 rounded-xl border border-[var(--ern-borda)] p-4 text-sm leading-6 outline-none">
          {feedback.texto}
        </p>
      )}
    </section>
  );
}

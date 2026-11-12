'use client';

// EDA_DUAS_ETAPAS_V1: ativar e desativar a verificação em duas etapas nas Configurações.
import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { fatorAtivoEDA } from '@/lib/duasEtapasEDA';

type Cadastro = { id: string; qr: string; segredo: string };

export default function DuasEtapasContaEDA() {
  const [fator, setFator] = useState<{ id: string; criadoEm: string } | null | undefined>(undefined);
  const [cadastro, setCadastro] = useState<Cadastro | null>(null);
  const [codigo, setCodigo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);
  const [confirmarDesligar, setConfirmarDesligar] = useState(false);

  async function atualizar() { setFator(await fatorAtivoEDA()); }
  useEffect(() => { void atualizar(); }, []);

  async function iniciar() {
    setOcupado(true); setMsg(null);
    try {
      // Remove cadastros que ficaram pela metade antes de começar um novo.
      const { data: lista } = await supabase.auth.mfa.listFactors();
      for (const f of lista?.all ?? []) if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `EDA ${new Date().toISOString().slice(0, 10)}` });
      if (error || !data) throw error;
      setCadastro({ id: data.id, qr: data.totp.qr_code, segredo: data.totp.secret });
    } catch {
      setMsg({ tipo: 'erro', texto: 'Não foi possível iniciar agora. Tente novamente.' });
    } finally { setOcupado(false); }
  }

  async function confirmar(e: FormEvent) {
    e.preventDefault();
    if (!cadastro) return;
    const limpo = codigo.replace(/\D/g, '');
    if (limpo.length !== 6) { setMsg({ tipo: 'erro', texto: 'Digite os 6 números do aplicativo.' }); return; }
    setOcupado(true); setMsg(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: cadastro.id, code: limpo });
    setOcupado(false);
    if (error) { setMsg({ tipo: 'erro', texto: 'Código incorreto. Confira a hora do celular e digite o código atual.' }); return; }
    setCadastro(null); setCodigo('');
    setMsg({ tipo: 'ok', texto: 'Verificação em duas etapas ativada. A partir de agora, a EDA pede o código ao entrar.' });
    await atualizar();
  }

  async function cancelar() {
    if (cadastro) await supabase.auth.mfa.unenroll({ factorId: cadastro.id });
    setCadastro(null); setCodigo(''); setMsg(null);
  }

  async function desligar() {
    if (!fator) return;
    setOcupado(true); setMsg(null);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: fator.id });
    setOcupado(false); setConfirmarDesligar(false);
    if (error) { setMsg({ tipo: 'erro', texto: 'Para desativar, saia e entre de novo com o código do aplicativo.' }); return; }
    await supabase.auth.refreshSession();
    setMsg({ tipo: 'ok', texto: 'Verificação em duas etapas desativada.' });
    await atualizar();
  }

  const botao = 'min-h-12 rounded-xl border border-[var(--ern-borda)] px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ern-destaque)] disabled:opacity-60';
  const campo = 'mt-2 min-h-12 w-full max-w-[220px] rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-3 text-center text-xl tracking-[0.4em] text-[var(--ern-texto)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ern-destaque)]';

  return (
    <section aria-labelledby="duas-etapas-eda" className="min-w-0 rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-4 text-[var(--ern-texto)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="duas-etapas-eda" className="text-lg font-semibold">Verificação em duas etapas</h2>
        {fator !== undefined && (
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${fator ? 'border-emerald-500 text-emerald-400' : 'border-[var(--ern-borda)]'}`}>
            {fator ? 'Ativada' : 'Desativada'}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm leading-6">
        Além da senha, a EDA pede um código de 6 números gerado no seu celular. Funciona sem sinal de operadora:
        use um aplicativo autenticador (Google Authenticator, Microsoft Authenticator ou Authy).
      </p>

      {fator === undefined && <p role="status" className="mt-4 text-sm">Verificando…</p>}

      {fator === null && !cadastro && (
        <button type="button" disabled={ocupado} onClick={() => void iniciar()} className={`${botao} mt-4`}>
          {ocupado ? 'Preparando…' : 'Ativar verificação em duas etapas'}
        </button>
      )}

      {cadastro && (
        <form onSubmit={confirmar} className="mt-5 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
          <div className="rounded-xl bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cadastro.qr} alt="QR code para o aplicativo autenticador" width={180} height={180} />
          </div>
          <div className="min-w-0 text-sm leading-6">
            <ol className="list-decimal space-y-1 pl-5">
              <li>Abra o aplicativo autenticador no celular.</li>
              <li>Toque em adicionar e leia o QR code ao lado.</li>
              <li>Digite abaixo o código de 6 números que aparecer.</li>
            </ol>
            <p className="mt-3 break-all text-xs">Sem câmera? Digite esta chave no aplicativo: <code className="font-semibold">{cadastro.segredo}</code></p>
            <label className="mt-3 block">Código do aplicativo
              <input inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={codigo}
                onChange={(e) => setCodigo(e.target.value)} className={campo} aria-label="Código de 6 números" />
            </label>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="submit" disabled={ocupado} className={botao}>{ocupado ? 'Confirmando…' : 'Confirmar e ativar'}</button>
              <button type="button" disabled={ocupado} onClick={() => void cancelar()} className={botao}>Cancelar</button>
            </div>
          </div>
        </form>
      )}

      {fator && (
        <div className="mt-4 text-sm leading-6">
          <p>Ativada em {new Date(fator.criadoEm).toLocaleDateString('pt-BR')}. Guarde bem o celular com o aplicativo: sem ele não dá para entrar.</p>
          {!confirmarDesligar ? (
            <button type="button" disabled={ocupado} onClick={() => setConfirmarDesligar(true)} className={`${botao} mt-3`}>Desativar</button>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span>Desativar deixa a conta protegida só pela senha.</span>
              <button type="button" disabled={ocupado} onClick={() => void desligar()} className={botao}>Confirmar desativação</button>
              <button type="button" disabled={ocupado} onClick={() => setConfirmarDesligar(false)} className={botao}>Manter ativada</button>
            </div>
          )}
        </div>
      )}

      {msg && <p role={msg.tipo === 'erro' ? 'alert' : 'status'} className="mt-4 rounded-xl border border-[var(--ern-borda)] p-3 text-sm">{msg.texto}</p>}
    </section>
  );
}

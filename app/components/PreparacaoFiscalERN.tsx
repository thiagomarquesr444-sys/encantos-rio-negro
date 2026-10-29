'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import PreviaDPSERN from '@/app/components/PreviaDPSERN';

type ReservaFiscal = {
  id: string;
  cliente_id: string | null;
  status: string | null;
  valor_total: number | string | null;
};

type Resultado = { tipo: 'sucesso' | 'aviso' | 'erro'; mensagem: string };

const moeda = (valor: number) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL',
}).format(valor);

function motivo(reserva: ReservaFiscal): string | null {
  if (String(reserva.status ?? '').toLowerCase().includes('cancelad')) return 'Reserva cancelada';
  if (!reserva.cliente_id) return 'Cliente não vinculado';
  const valor = Number(reserva.valor_total);
  if (reserva.valor_total === null || !Number.isFinite(valor) || valor <= 0) {
    return 'Valor comercial inválido';
  }
  return null;
}

export default function PreparacaoFiscalERN({ aoAtualizar }: { aoAtualizar: () => void }) {
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [reservas, setReservas] = useState<ReservaFiscal[]>([]);
  const [selecionada, setSelecionada] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [aviso, setAviso] = useState<Resultado | null>(null);
  const [parcial, setParcial] = useState(false);
  const ambienteDev = process.env.NODE_ENV === 'development';

  const carregar = useCallback(async () => {
    setCarregando(true);
    setAviso(null);
    try {
      const { data: auth, error: authErro } = await supabase.auth.getUser();
      if (authErro || !auth.user) throw new Error('Sessão empresarial indisponível.');
      const { data: perfil, error: perfilErro } = await supabase.from('perfis')
        .select('empresa_id,role').eq('id', auth.user.id).maybeSingle();
      if (perfilErro || !perfil?.empresa_id ||
          !['admin_empresa', 'admin_plataforma', 'financeiro'].includes(perfil.role)) {
        throw new Error('Perfil sem autorização para preparar solicitações fiscais.');
      }
      const permissoes = await Promise.all([
        supabase.rpc('ern_pode_acessar_modulo', { p_modulo: 'financeiro' }),
        supabase.rpc('ern_pode_acessar_modulo', { p_modulo: 'relatorios' }),
      ]);
      if (permissoes.some(p => p.error) || !permissoes.some(p => p.data === true)) {
        throw new Error('Módulo Financeiro ou Relatórios indisponível.');
      }
      const empresa = String(perfil.empresa_id);
      const { data, error } = await supabase.from('reservas')
        .select('id,cliente_id,status,valor_total')
        .eq('empresa_id', empresa)
        .order('id', { ascending: true }).limit(101);
      if (error || !data) throw new Error('Não foi possível consultar as reservas desta operadora.');
      setEmpresaId(empresa);
      setParcial(data.length > 100);
      setReservas((data as ReservaFiscal[]).slice(0, 100));
    } catch (e) {
      setEmpresaId(null);
      setReservas([]);
      setAviso({ tipo: 'erro', mensagem: e instanceof Error ? e.message : 'Consulta indisponível.' });
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const reserva = reservas.find(r => r.id === selecionada);
  const impedimento = reserva ? motivo(reserva) : null;
  const elegiveis = reservas.filter(r => !motivo(r)).length;

  async function simular() {
    if (!ambienteDev || processando || !confirmado || !empresaId || !reserva || impedimento) return;
    setProcessando(true);
    setAviso(null);
    try {
      const { data: auth, error: erroAuth } = await supabase.auth.getUser();
      if (erroAuth || !auth.user) throw new Error('Sessão expirada.');
      const { data: perfil, error: erroPerfil } = await supabase.from('perfis')
        .select('empresa_id,role').eq('id', auth.user.id).maybeSingle();
      if (erroPerfil || perfil?.empresa_id !== empresaId || perfil.role !== 'admin_empresa') {
        throw new Error('A simulação exige administrador da mesma empresa.');
      }
      const { data: cliente, error: erroCliente } = await supabase.from('clientes')
        .select('id').eq('empresa_id', empresaId).eq('id', reserva.cliente_id!).maybeSingle();
      if (erroCliente || !cliente) throw new Error('Cliente não pertence à empresa autenticada.');
      const { count: antes, error: erroAntes } = await supabase.from('nfse_solicitacoes')
        .select('id', { head: true, count: 'exact' })
        .eq('empresa_id', empresaId).eq('reserva_id', reserva.id);
      if (erroAntes || antes === null) throw new Error('Não foi possível conferir solicitações anteriores.');
      if (!window.confirm(`Registrar ou reutilizar SIMULAÇÃO da reserva ${reserva.id.slice(0, 8)}?\nValor comercial: ${moeda(Number(reserva.valor_total))}\nNenhuma NFS-e será emitida.`)) return;
      const { data: sessao } = await supabase.auth.getSession();
      if (!sessao.session?.access_token) throw new Error('Token da sessão indisponível.');
      const resposta = await fetch('/api/fiscal/nfse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessao.session.access_token}` },
        body: JSON.stringify({ reserva_id: reserva.id }),
        cache: 'no-store',
      });
      const dados: unknown = await resposta.json();
      const retorno = dados && typeof dados === 'object' ? dados as Record<string, unknown> : null;
      if (!resposta.ok || retorno?.ok !== true || retorno.simulacao !== true || retorno.valor_fiscal !== false) {
        setAviso({ tipo: 'erro', mensagem: `Simulação não confirmada (HTTP ${resposta.status}). Confira o histórico antes de repetir.` });
        aoAtualizar();
        return;
      }
      const solicitacao = retorno.solicitacao as Record<string, unknown> | undefined;
      if (!solicitacao || typeof solicitacao.id !== 'string') throw new Error('Retorno sem identificador verificável.');
      const { data: registro, error: erroRegistro } = await supabase.from('nfse_solicitacoes')
        .select('id,empresa_id,reserva_id,status,ambiente,valor_servico')
        .eq('id', solicitacao.id).eq('empresa_id', empresaId).maybeSingle();
      if (erroRegistro || !registro || registro.reserva_id !== reserva.id ||
          registro.status !== 'simulada' || registro.ambiente !== 'simulacao') {
        throw new Error('Registro não confirmado pela RLS. Não repita a operação.');
      }
      const { count: depois, error: erroDepois } = await supabase.from('nfse_solicitacoes')
        .select('id', { head: true, count: 'exact' })
        .eq('empresa_id', empresaId).eq('reserva_id', reserva.id);
      if (erroDepois || depois === null) throw new Error('Não foi possível verificar duplicidades.');
      const suspeito = depois > Math.max(antes, 1) || (antes > 0 && retorno.reutilizada !== true);
      setAviso(suspeito ? {
        tipo: 'aviso',
        mensagem: `Revisar idempotência: antes ${antes}, depois ${depois}, reutilizada=${String(retorno.reutilizada)}. Não repetir.`,
      } : {
        tipo: 'sucesso',
        mensagem: `Simulação verificada. Registros desta reserva: ${depois}. Reutilizada: ${String(retorno.reutilizada)}. Sem emissão oficial.`,
      });
      setConfirmado(false);
      aoAtualizar();
    } catch (e) {
      setAviso({ tipo: 'erro', mensagem: `${e instanceof Error ? e.message : 'Falha inesperada.'} Confira o histórico antes de repetir.` });
    } finally {
      setProcessando(false);
    }
  }

  return (
    <section aria-label="Preparação fiscal" className="rounded-2xl border border-white/[0.08] bg-[#151A1B] p-4 shadow-[0_10px_35px_rgba(0,0,0,0.12)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#E3A144]">Central fiscal · Operadora</p>
          <h2 className="mt-2 text-lg font-semibold">Preparar solicitação a partir de uma reserva</h2>
          <p className="mt-1 text-xs text-[#94A5A1]">Conferência operacional. O valor comercial não é automaticamente a base tributável da NFS-e.</p>
        </div>
        <button type="button" onClick={() => void carregar()} disabled={carregando || processando} className="min-h-10 rounded-lg border border-white/15 px-3 text-xs hover:bg-white/5 disabled:opacity-50">Atualizar reservas</button>
      </div>
      {carregando ? <p role="status" className="mt-4 text-sm text-[#94A5A1]">Consultando reservas autorizadas…</p> : empresaId ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,1fr)]">
          <div className="space-y-2">
            <p className="text-xs text-[#94A5A1]">{reservas.length} reservas analisadas · {elegiveis} potencialmente elegíveis</p>
            {parcial && <p className="text-xs text-amber-300">Amostra limitada a 100 reservas. Refine a seleção em uma próxima versão.</p>}
            <label htmlFor="ern-reserva-fiscal" className="block text-xs font-medium">Selecione a reserva</label>
            <select id="ern-reserva-fiscal" value={selecionada} onChange={e => { setSelecionada(e.target.value); setConfirmado(false); setAviso(null); }} className="min-h-11 w-full rounded-lg border border-white/20 bg-[#202728] px-3 text-sm text-white">
              <option value="">Escolha uma reserva</option>
              {reservas.map(r => <option key={r.id} value={r.id}>{r.id.slice(0,8)} · {r.status ?? 'sem status'} · {moeda(Number(r.valor_total ?? 0))}{motivo(r) ? ' · PENDENTE' : ''}</option>)}
            </select>
            {reserva && <div className="rounded-xl border border-white/10 bg-[#101616] p-3 text-xs">
              <p>Reserva <strong>{reserva.id.slice(0,8)}</strong> · {reserva.status ?? 'sem status'}</p>
              <p className="mt-1">Valor comercial: {moeda(Number(reserva.valor_total ?? 0))}</p>
              <p className={`mt-2 ${impedimento ? 'text-amber-300' : 'text-emerald-300'}`}>{impedimento ?? 'Potencialmente elegível — sujeita às validações fiscais do servidor'}</p>
            </div>}
          </div>
          <div className="rounded-xl border border-[#E3A144]/20 bg-[#E3A144]/[0.04] p-4">
            <p className="text-xs font-semibold text-[#E9B76B]">{ambienteDev ? 'Simulação local controlada' : 'Preparação consultiva — produção'}</p>
            <p className="mt-2 text-xs leading-5 text-[#A6B4AE]">{ambienteDev ? 'Apenas administradores podem executar a simulação. Um registro de teste será armazenado no Supabase.' : 'A conferência de reservas está disponível. A transmissão e a simulação pela API permanecem desativadas em produção.'}</p>
            {ambienteDev && <>
              <label className="mt-4 flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5" checked={confirmado} onChange={e => setConfirmado(e.target.checked)} /> Confirmo que esta reserva é de teste e autorizo registrar ou reutilizar uma simulação.</label>
              <button type="button" disabled={!reserva || !!impedimento || !confirmado || processando} onClick={() => void simular()} className="mt-3 min-h-11 w-full rounded-lg bg-[#E3A144] px-3 text-sm font-semibold text-[#101415] disabled:cursor-not-allowed disabled:opacity-40">{processando ? 'Validando…' : 'Simular reserva selecionada'}</button>
            </>}
            {!ambienteDev && <p className="mt-4 text-xs font-medium text-[#E9B76B]">Emissão oficial de NFS-e: não habilitada</p>}
          </div>
        </div>
      ) : null}
      <PreviaDPSERN reservaId={selecionada} />
      {aviso && <p role="status" className={`mt-4 rounded-lg border p-3 text-xs ${aviso.tipo === 'sucesso' ? 'border-emerald-500/40 text-emerald-300' : aviso.tipo === 'aviso' ? 'border-amber-500/40 text-amber-300' : 'border-rose-500/40 text-rose-300'}`}>{aviso.mensagem}</p>}
    </section>
  );
}

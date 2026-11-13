'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import PreviaDPSERN from '@/app/components/PreviaDPSERN';
import { pendenciasEmitenteERN, type EmitenteFiscalERN } from '@/lib/fiscalERN';
import { confirmarEDA } from '@/lib/dialogoEDA';

type ReservaFiscal = {
  id: string;
  cliente_id: string | null;
  status: string | null;
  valor_total: number | string | null;
  cliente?: string | null;
  passeio?: string | null;
  inicio?: string | null;
  recebido?: number | string | null;
  tem_solicitacao?: boolean;
};
// EDA_PAINEL_FISCAL_V1: reservas do período vindas de painel_fiscal_eda.
export type ReservaFiscalEDA = ReservaFiscal;

const dataBR = (d?: string | null) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '');
function rotuloReserva(r: ReservaFiscal) {
  const partes = [dataBR(r.inicio), r.cliente, r.passeio].filter(Boolean);
  return partes.length ? partes.join(' · ') : `Reserva ${r.id.slice(0, 8)}`;
}

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

export default function PreparacaoFiscalERN({
  aoAtualizar,
  aoSelecionarReserva,
  reservasPeriodo = null,
}: {
  aoAtualizar: () => void;
  aoSelecionarReserva: (reservaId: string) => void;
  reservasPeriodo?: ReservaFiscal[] | null;
}) {
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [reservas, setReservas] = useState<ReservaFiscal[]>([]);
  const [selecionada, setSelecionada] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [aviso, setAviso] = useState<Resultado | null>(null);
  const [parcial, setParcial] = useState(false);
  // ERN_FISCAL_EMITENTE_V1: emitente = CNPJ da própria operadora.
  const [emitente, setEmitente] = useState<EmitenteFiscalERN | null>(null);
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
      let data: ReservaFiscal[];
      if (reservasPeriodo) {
        data = reservasPeriodo;
      } else {
        const consulta = await supabase.from('reservas')
          .select('id,cliente_id,status,valor_total,cliente,pacote,data_reserva')
          .eq('empresa_id', empresa)
          .order('data_reserva', { ascending: false }).limit(101);
        if (consulta.error || !consulta.data) throw new Error('Não foi possível consultar as reservas desta operadora.');
        data = (consulta.data as (ReservaFiscal & { pacote?: string | null; data_reserva?: string | null })[])
          .map(r => ({ ...r, passeio: r.pacote ?? null, inicio: r.data_reserva ?? null }));
      }
      const { data: fiscal } = await supabase.from('empresa_fiscal_ern')
        .select('razao_social,cnpj,inscricao_municipal,codigo_municipio_ibge')
        .eq('empresa_id', empresa).maybeSingle();
      setEmitente(fiscal ? {
        razao_social: String(fiscal.razao_social ?? ''),
        cnpj: String(fiscal.cnpj ?? ''),
        inscricao_municipal: String(fiscal.inscricao_municipal ?? ''),
        codigo_municipio_ibge: String(fiscal.codigo_municipio_ibge ?? ''),
      } : null);
      setEmpresaId(empresa);
      setParcial(!reservasPeriodo && data.length > 100);
      const lista = (data as ReservaFiscal[]).slice(0, 100);
      setReservas(lista);
      // A URL guarda apenas a referencia; o banco valida a posse da reserva.
      const url = new URL(window.location.href);
      const solicitada = url.searchParams.get('reserva') ?? '';
      const autorizada = lista.some(item => item.id === solicitada) ? solicitada : '';
      setSelecionada(autorizada);
      aoSelecionarReserva(autorizada);
      if (solicitada && !autorizada) {
        url.searchParams.delete('reserva');
        window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
      }
    } catch (e) {
      setEmpresaId(null);
      setEmitente(null);
      setReservas([]);
      setSelecionada('');
      aoSelecionarReserva('');
      setAviso({ tipo: 'erro', mensagem: e instanceof Error ? e.message : 'Consulta indisponível.' });
    } finally {
      setCarregando(false);
    }
  }, [aoSelecionarReserva, reservasPeriodo]);

  useEffect(() => { void carregar(); }, [carregar]);

  const reserva = reservas.find(r => r.id === selecionada);
  const impedimento = reserva ? motivo(reserva) : null;
  const elegiveis = reservas.filter(r => !motivo(r)).length;
  const pendenciasEmitente = pendenciasEmitenteERN(emitente);
  const cnpjEmitente = (emitente?.cnpj ?? '').replace(/\D/g, '');

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
      if (!(await confirmarEDA(`Reserva ${reserva.id.slice(0, 8)}\nValor comercial: ${moeda(Number(reserva.valor_total))}\nNenhuma NFS-e será emitida.`, { titulo: 'Registrar simulação fiscal?' }))) return;
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
        <>
        <div aria-label="Emitente da nota fiscal" className={`mt-4 rounded-xl border p-4 text-xs ${pendenciasEmitente.length ? 'border-amber-500/30 bg-amber-500/[0.05]' : 'border-emerald-500/30 bg-emerald-500/[0.05]'}`}>
          <p className="font-semibold text-[#F1F4EF]">Emitente da nota: sua empresa</p>
          <p className="mt-1 text-[#A6B4AE]">
            {emitente?.razao_social.trim() || 'Razão social não informada'} · {cnpjEmitente.length === 14 ? `CNPJ ••${cnpjEmitente.slice(-4)}` : 'CNPJ não informado'}
          </p>
          <p className="mt-2 leading-5 text-[#A6B4AE]">A NFS-e do passeio sai no CNPJ da sua operadora. A plataforma EDA apenas prepara e envia; ela não é a emitente.</p>
          {pendenciasEmitente.length ? (
            <p className="mt-2 text-amber-300">Simulação permitida. Para emissão real faltam: {pendenciasEmitente.join(', ')}. Complete no cadastro fiscal acima.</p>
          ) : (
            <p className="mt-2 text-emerald-300">Cadastro do emitente completo. A emissão real ainda depende do certificado digital A1 e da integração oficial.</p>
          )}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,1fr)]">
          <div className="space-y-2">
            <p className="text-xs text-[#94A5A1]">{reservas.length} reservas {reservasPeriodo ? 'no período' : 'analisadas'} · {elegiveis} potencialmente elegíveis</p>
            {parcial && <p className="text-xs text-amber-300">Amostra limitada a 100 reservas. Refine a seleção em uma próxima versão.</p>}
            <label htmlFor="ern-reserva-fiscal" className="block text-xs font-medium">Selecione a reserva</label>
            <select id="ern-reserva-fiscal" disabled={processando || carregando} value={selecionada} onChange={e => {
              const id = e.target.value;
              if (id && !reservas.some(item => item.id === id)) return;
              setSelecionada(id);
              aoSelecionarReserva(id);
              setConfirmado(false);
              setAviso(null);
              const url = new URL(window.location.href);
              if (id) url.searchParams.set('reserva', id);
              else url.searchParams.delete('reserva');
              window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
            }} className="min-h-11 w-full rounded-lg border border-white/20 bg-[#202728] px-3 text-sm text-white">
              <option value="">Escolha uma reserva</option>
              {reservas.map(r => <option key={r.id} value={r.id}>{rotuloReserva(r)} · {moeda(Number(r.valor_total ?? 0))}{r.tem_solicitacao ? ' · já solicitada' : Number(r.recebido ?? 0) > 0 ? ' · RECEBIDA SEM NOTA' : ''}{motivo(r) ? ' · PENDENTE' : ''}</option>)}
            </select>
            {reserva && <div className="rounded-xl border border-white/10 bg-[#101616] p-3 text-xs">
              <p><strong>{rotuloReserva(reserva)}</strong> · {reserva.status ?? 'sem status'}</p>
              <p className="mt-1">Valor comercial: {moeda(Number(reserva.valor_total ?? 0))}{reserva.recebido !== undefined ? ` · Recebido: ${moeda(Number(reserva.recebido ?? 0))}` : ''}</p>
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
            {!ambienteDev && <p className="mt-4 text-xs font-medium text-[#E9B76B]">Emissão oficial de NFS-e: não habilitada (exige CNPJ válido da operadora e certificado A1)</p>}
          </div>
        </div>
        </>
      ) : null}
      <PreviaDPSERN reservaId={selecionada} />
      {aviso && <p role="status" className={`mt-4 rounded-lg border p-3 text-xs ${aviso.tipo === 'sucesso' ? 'border-emerald-500/40 text-emerald-300' : aviso.tipo === 'aviso' ? 'border-amber-500/40 text-amber-300' : 'border-rose-500/40 text-rose-300'}`}>{aviso.mensagem}</p>}
    </section>
  );
}

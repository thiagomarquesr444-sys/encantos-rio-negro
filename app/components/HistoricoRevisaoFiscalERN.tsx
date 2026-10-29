'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';

type Estado = 'em_preparacao' | 'com_pendencias' | 'revisado_internamente';
type Reserva = { id: string; status: string | null; valor_total: number | string | null };
type Revisao = { id: string; reserva_id: string; estado: Estado; observacoes: string; updated_at: string; updated_by: string };
const rotulos: Record<Estado, string> = {
  em_preparacao: 'Em preparação', com_pendencias: 'Com pendências', revisado_internamente: 'Revisado internamente',
};
const caixa = 'min-w-0 rounded-2xl border border-white/[0.08] bg-[#151A1B] p-4 text-[#F1F4EF] sm:p-5';
const campo = 'mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-[#101616] px-3 py-2 text-sm text-[#F1F4EF] focus-visible:outline-2 focus-visible:outline-[#E3A144] disabled:opacity-50';

export default function HistoricoRevisaoFiscalERN() {
  const [empresaId, setEmpresaId] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [editor, setEditor] = useState(false);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [historico, setHistorico] = useState<Revisao[]>([]);
  const [reservaId, setReservaId] = useState('');
  const [estado, setEstado] = useState<Estado>('em_preparacao');
  const [observacoes, setObservacoes] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [versao, setVersao] = useState(0);
  const trava = useRef(false);
  const atualizar = useCallback(() => setVersao(n => n + 1), []);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregando(true); setErro('');
      try {
        const { data: auth, error: erroAuth } = await supabase.auth.getUser();
        if (erroAuth || !auth.user) throw new Error('Sessão indisponível.');
        const { data: perfil, error: erroPerfil } = await supabase.from('perfis')
          .select('empresa_id,role').eq('id', auth.user.id).maybeSingle();
        if (erroPerfil || !perfil?.empresa_id || !['admin_empresa', 'financeiro', 'admin_plataforma'].includes(String(perfil.role)))
          throw new Error('Perfil sem acesso à revisão fiscal.');
        const [fin, rel] = await Promise.all([
          supabase.rpc('ern_pode_acessar_modulo', { p_modulo: 'financeiro' }),
          supabase.rpc('ern_pode_acessar_modulo', { p_modulo: 'relatorios' }),
        ]);
        if (fin.error || rel.error || (fin.data !== true && rel.data !== true))
          throw new Error('Módulo fiscal não autorizado.');
        const id = String(perfil.empresa_id);
        const [rr, hr] = await Promise.all([
          supabase.from('reservas').select('id,status,valor_total').eq('empresa_id', id).order('id').limit(100),
          supabase.from('ern_revisoes_fiscais').select('id,reserva_id,estado,observacoes,updated_at,updated_by')
            .eq('empresa_id', id).order('updated_at', { ascending: false }).limit(50),
        ]);
        if (rr.error || !rr.data) throw new Error('Não foi possível consultar as reservas da operadora.');
        if (hr.error || !hr.data) throw new Error('Histórico indisponível. Verifique se a migração V48.6 foi aplicada.');
        if (!ativo) return;
        setEmpresaId(id); setUsuarioId(auth.user.id); setEditor(perfil.role === 'admin_empresa');
        setReservas(rr.data as Reserva[]); setHistorico(hr.data as Revisao[]);
      } catch (e) {
        if (ativo) { setErro(e instanceof Error ? e.message : 'Consulta indisponível.'); setEmpresaId(''); }
      } finally { if (ativo) setCarregando(false); }
    }
    void carregar();
    return () => { ativo = false; };
  }, [versao]);

  function selecionar(id: string) {
    setReservaId(id); setErro(''); setAviso('');
    const existente = historico.find(r => r.reserva_id === id);
    setEstado(existente?.estado ?? 'em_preparacao');
    setObservacoes(existente?.observacoes ?? '');
  }

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editor || !empresaId || !usuarioId || !reservaId || trava.current) return;
    if (observacoes.length > 1200) { setErro('Observações acima de 1.200 caracteres.'); return; }
    if (!reservas.some(r => r.id === reservaId)) { setErro('Selecione uma reserva válida.'); return; }
    if (estado === 'revisado_internamente' && !window.confirm('Confirmar apenas a revisão INTERNA? Isto não autoriza nem emite NFS-e.')) return;
    trava.current = true; setSalvando(true); setErro(''); setAviso('');
    try {
      const existente = historico.find(r => r.reserva_id === reservaId);
      const agora = new Date().toISOString();
      if (existente) {
        const { data, error } = await supabase.from('ern_revisoes_fiscais')
          .update({ estado, observacoes: observacoes.trim(), updated_at: agora, updated_by: usuarioId })
          .eq('id', existente.id).eq('empresa_id', empresaId).eq('reserva_id', reservaId).select('id').single();
        if (error || !data) throw new Error('Atualização não confirmada. Verifique permissões e tente novamente.');
      } else {
        const { data, error } = await supabase.from('ern_revisoes_fiscais')
          .insert({ empresa_id: empresaId, reserva_id: reservaId, estado, observacoes: observacoes.trim(),
            created_by: usuarioId, updated_by: usuarioId })
          .select('id').single();
        if (error || !data) throw new Error('Registro não confirmado. Confira se já existe revisão para esta reserva antes de tentar novamente.');
      }
      setAviso('Revisão interna salva. Nenhuma DPS ou NFS-e foi emitida.');
      atualizar();
    } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao salvar revisão.'); }
    finally { trava.current = false; setSalvando(false); }
  }

  return (
    <section aria-label="Histórico de revisão fiscal" className={caixa}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#E3A144]">ERN / RASTREABILIDADE INTERNA</p>
          <h2 className="mt-2 text-lg font-semibold">Histórico de revisão fiscal</h2>
          <p className="mt-1 text-xs leading-5 text-[#94A5A1]">Acompanhamento por reserva. Revisão interna não equivale a homologação, DPS transmitida ou NFS-e autorizada.</p>
        </div>
        <button type="button" disabled={carregando || salvando} onClick={atualizar} className="min-h-10 rounded-lg border border-white/15 px-3 text-xs hover:bg-white/5 disabled:opacity-50">Atualizar histórico</button>
      </div>
      {carregando && <p role="status" className="mt-4 text-sm text-[#94A5A1]">Carregando histórico autorizado…</p>}
      {erro && <p role="alert" className="mt-3 rounded-lg border border-rose-400/30 p-3 text-sm text-rose-200">{erro}</p>}
      {aviso && <p role="status" className="mt-3 rounded-lg border border-emerald-400/30 p-3 text-sm text-emerald-200">{aviso}</p>}
      {empresaId && !carregando && <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
        <form onSubmit={salvar} className="min-w-0 space-y-3 rounded-xl border border-white/10 bg-[#101616] p-4">
          <label className="block text-xs font-semibold">Reserva
            <select className={campo} value={reservaId} onChange={e => selecionar(e.target.value)} disabled={salvando}>
              <option value="">Selecione uma reserva</option>
              {reservas.map(r => <option key={r.id} value={r.id}>{r.id.slice(0,8)} · {r.status ?? 'sem status'}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold">Etapa de revisão
            <select className={campo} value={estado} onChange={e => setEstado(e.target.value as Estado)} disabled={!editor || salvando}>
              {Object.entries(rotulos).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold">Observações internas (até 1.200 caracteres)
            <textarea className={`${campo} min-h-28 resize-y`} maxLength={1200} rows={4} value={observacoes}
              onChange={e => setObservacoes(e.target.value)} disabled={!editor || salvando} placeholder="Registre as pendências e próximos passos; evite dados pessoais desnecessários." />
          </label>
          <p className="text-[11px] text-[#94A5A1]">Somente o administrador da operadora pode registrar alterações. A emissão continua bloqueada.</p>
          {editor && <button type="submit" disabled={!reservaId || salvando} className="min-h-11 rounded-xl bg-[#E3A144] px-5 text-sm font-semibold text-[#101415] disabled:opacity-50">{salvando ? 'Salvando…' : 'Salvar revisão interna'}</button>}
        </form>
        <div className="min-w-0 rounded-xl border border-white/10 bg-[#101616] p-4">
          <h3 className="text-sm font-semibold">Últimas revisões</h3>
          <p className="mt-1 text-[11px] text-[#94A5A1]">Até 50 registros da sua operadora.</p>
          {historico.length === 0 ? <p className="mt-4 text-xs text-[#94A5A1]">Nenhuma revisão registrada.</p> :
            <ul className="mt-3 space-y-2">{historico.map(r =>
              <li key={r.id} className="rounded-lg border border-white/[0.07] p-3">
                <div className="flex flex-wrap justify-between gap-2 text-xs"><strong>Reserva {r.reserva_id.slice(0,8)}</strong><span className="text-[#E9B76B]">{rotulos[r.estado] ?? 'Estado desconhecido'}</span></div>
                <p className="mt-1 text-[11px] text-[#94A5A1]">Atualizado em {new Date(r.updated_at).toLocaleString('pt-BR', { timeZone:'America/Manaus' })}</p>
                {r.observacoes && <p className="mt-2 whitespace-pre-wrap break-words text-xs text-[#C2CFC8]">{r.observacoes}</p>}
              </li>)}</ul>}
        </div>
      </div>}
    </section>
  );
}

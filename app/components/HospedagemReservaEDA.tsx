'use client';

// EDA_HOSPEDAGENS_PREMIUM_V1: onde o grupo da reserva dorme.
// Disponibilidade real por noite; o banco bloqueia lotação e capacidade.
// Os hóspedes usam a mesma ficha de saúde dos participantes da reserva.

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { dataCurtaEDA } from '@/lib/passeiosPublicosEDA';
import {
  disponibilidadeHospedagemEDA, mensagemHospedagemEDA, rotuloTipoAcomodacao, somarDiasISO,
  type DisponibilidadeAcomodacaoEDA, type EstadiaReservaEDA,
} from '@/lib/hospedagensEDA';
import { confirmarEDA } from '@/lib/dialogoEDA';

type Props = { reservaId?: string; bloqueado: boolean; pessoas: string; dataInicio: string; dataFim: string };

export default function HospedagemReservaEDA({ reservaId, bloqueado, pessoas, dataInicio, dataFim }: Props) {
  const [estadias, setEstadias] = useState<EstadiaReservaEDA[] | null>(null);
  const [hospedagens, setHospedagens] = useState<{ id: string; nome: string }[]>([]);
  const [hospedagemId, setHospedagemId] = useState('');
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [disp, setDisp] = useState<DisponibilidadeAcomodacaoEDA[] | null>(null);
  const [acomodacaoId, setAcomodacaoId] = useState('');
  const [unidades, setUnidades] = useState('1');
  const [hospedes, setHospedes] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [aberto, setAberto] = useState(false);

  const carregar = useCallback(async () => {
    if (!reservaId) return;
    const [est, hs] = await Promise.all([
      supabase.from('reserva_hospedagens')
        .select('id,acomodacao_id,checkin,checkout,unidades,hospedes,observacao,hospedagem_acomodacoes(nome,hospedagens(id,nome))')
        .eq('reserva_id', reservaId).order('checkin'),
      supabase.from('hospedagens').select('id,nome').eq('status', 'Ativa').order('nome').limit(200),
    ]);
    if (est.error) { setErro(mensagemHospedagemEDA(est.error)); setEstadias([]); return; }
    setEstadias((est.data ?? []) as unknown as EstadiaReservaEDA[]);
    setHospedagens((hs.data ?? []) as { id: string; nome: string }[]);
  }, [reservaId]);

  useEffect(() => { void carregar(); }, [carregar]);

  // Datas sugeridas a partir da reserva (check-out = dia seguinte ao fim).
  useEffect(() => {
    if (!aberto) return;
    if (!checkin && dataInicio) setCheckin(dataInicio);
    if (!checkout && (dataFim || dataInicio)) setCheckout(somarDiasISO(dataFim || dataInicio, 1));
    if (!hospedes) setHospedes(String(Math.max(Number(pessoas) || 1, 1)));
  }, [aberto, dataInicio, dataFim, pessoas, checkin, checkout, hospedes]);

  useEffect(() => {
    let ativo = true;
    setDisp(null); setAcomodacaoId('');
    if (!hospedagemId || !checkin || !checkout || checkout <= checkin) return;
    disponibilidadeHospedagemEDA(hospedagemId, checkin, checkout)
      .then((d) => { if (ativo) setDisp(d); })
      .catch((e) => { if (ativo) { setErro(mensagemHospedagemEDA(e)); setDisp([]); } });
    return () => { ativo = false; };
  }, [hospedagemId, checkin, checkout]);

  if (!reservaId) return null;

  const escolhida = disp?.find((d) => d.acomodacao_id === acomodacaoId);
  const noites = checkin && checkout && checkout > checkin
    ? Math.round((Date.parse(checkout) - Date.parse(checkin)) / 86_400_000) : 0;

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    if (!escolhida) { setErro('Escolha uma acomodação com vaga.'); return; }
    setSalvando(true); setErro('');
    const { data: r } = await supabase.from('reservas').select('empresa_id').eq('id', reservaId).single();
    const { error } = await supabase.from('reserva_hospedagens').insert({
      reserva_id: reservaId, empresa_id: r?.empresa_id, acomodacao_id: escolhida.acomodacao_id,
      checkin, checkout, unidades: Number(unidades) || 1, hospedes: Number(hospedes) || 1,
    });
    setSalvando(false);
    if (error) { setErro(mensagemHospedagemEDA(error)); return; }
    setAberto(false); setHospedagemId(''); setDisp(null);
    void carregar();
  }

  async function remover(id: string) {
    if (!(await confirmarEDA('As noites voltam a ficar livres para outras reservas.', { titulo: 'Remover esta estadia?', confirmar: 'Remover', perigo: true }))) return;
    const { error } = await supabase.from('reserva_hospedagens').delete().eq('id', id);
    if (error) { setErro(mensagemHospedagemEDA(error)); return; }
    void carregar();
  }

  return (
    <section className="eda-pg-secao eda-pg-largo hr">
      <p className="eda-pg-secao-eb">Hospedagem</p>
      <h2>Onde o grupo vai dormir</h2>
      <p className="eda-pg-secao-txt">Noites reservadas com disponibilidade real. Os hóspedes usam a ficha de saúde dos participantes desta reserva.</p>

      {erro && <p role="alert" className="hr-erro">{erro}</p>}

      {estadias && estadias.length > 0 && (
        <ul className="hr-lista">
          {estadias.map((e) => (
            <li key={e.id}>
              <div>
                <strong>{e.hospedagem_acomodacoes?.hospedagens?.nome ?? 'Hospedagem'} · {e.hospedagem_acomodacoes?.nome}</strong>
                <small>{dataCurtaEDA(e.checkin)} → {dataCurtaEDA(e.checkout)} · {e.unidades} unid. · {e.hospedes} hóspede(s)</small>
              </div>
              <button type="button" className="eda-pg-bt" disabled={bloqueado} onClick={() => remover(e.id)} aria-label="Remover estadia">×</button>
            </li>
          ))}
        </ul>
      )}
      {estadias && estadias.length === 0 && !aberto && <p className="hr-nota">Nenhuma hospedagem vinculada.</p>}

      {!aberto ? (
        <button type="button" className="eda-pg-bt" disabled={bloqueado || !hospedagens.length} onClick={() => setAberto(true)}>
          {hospedagens.length ? '+ Adicionar hospedagem' : 'Cadastre uma hospedagem ativa primeiro'}
        </button>
      ) : (
        <form className="hr-form" onSubmit={adicionar}>
          <select required value={hospedagemId} onChange={(e) => setHospedagemId(e.target.value)} aria-label="Hospedagem">
            <option value="">Escolha a hospedagem</option>
            {hospedagens.map((h) => <option key={h.id} value={h.id}>{h.nome}</option>)}
          </select>
          <label>Check-in<input type="date" required value={checkin} onChange={(e) => setCheckin(e.target.value)} /></label>
          <label>Check-out<input type="date" required min={checkin} value={checkout} onChange={(e) => setCheckout(e.target.value)} /></label>
          {noites > 0 && <span className="hr-nota">{noites} noite(s)</span>}

          {disp && (
            disp.length === 0
              ? <p className="hr-nota">Esta hospedagem não tem acomodações cadastradas.</p>
              : (
                <div className="hr-opcoes" role="radiogroup" aria-label="Acomodação">
                  {disp.map((d) => (
                    <button key={d.acomodacao_id} type="button" role="radio" aria-checked={acomodacaoId === d.acomodacao_id}
                      disabled={d.livres <= 0} onClick={() => setAcomodacaoId(d.acomodacao_id)}>
                      <strong>{d.nome}</strong>
                      <small>{rotuloTipoAcomodacao(d.tipo)} · até {d.capacidade} pess. · {d.livres > 0 ? `${d.livres} livre(s)` : d.status !== 'ativa' ? 'indisponível' : 'lotada'}</small>
                    </button>
                  ))}
                </div>
              )
          )}

          {escolhida && (
            <>
              <label>Unidades<input type="number" min={1} max={escolhida.livres} value={unidades} onChange={(e) => setUnidades(e.target.value)} /></label>
              <label>Hóspedes<input type="number" min={1} max={escolhida.capacidade * (Number(unidades) || 1)} value={hospedes} onChange={(e) => setHospedes(e.target.value)} /></label>
              {escolhida.valor_diaria != null && noites > 0 && (
                <span className="hr-nota">
                  Estimativa: {(Number(escolhida.valor_diaria) * noites * (Number(unidades) || 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  {' '}({noites} noite(s) × {Number(unidades) || 1} unid.)
                </span>
              )}
            </>
          )}

          <div className="hr-acoes">
            <button type="button" className="eda-pg-bt" onClick={() => setAberto(false)}>Cancelar</button>
            <button type="submit" className="eda-pg-bt eda-pg-bt-ouro" disabled={bloqueado || salvando || !escolhida}>{salvando ? 'Salvando…' : 'Reservar noites'}</button>
          </div>
        </form>
      )}

      <style jsx>{`
        .hr h2 { margin: 4px 0; }
        .hr-erro { color: var(--ern-erro, #f87171); font-size: 13px; }
        .hr-nota { display: block; font-size: 12px; color: var(--ern-secundario, #b4c8bb); }
        .hr-lista { list-style: none; margin: 12px 0; padding: 0; display: grid; gap: 8px; }
        .hr-lista li { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 14px; border: 1px solid var(--ern-borda); }
        .hr-lista strong { display: block; font-size: 14px; } .hr-lista small { font-size: 12px; color: var(--ern-secundario, #b4c8bb); }
        .hr-form { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; margin-top: 12px; }
        .hr-form label { display: grid; gap: 4px; font-size: 11px; color: var(--ern-secundario, #b4c8bb); }
        .hr-form select, .hr-form input { min-height: 40px; padding: 0 10px; border-radius: 12px; border: 1px solid var(--ern-borda); background: transparent; color: inherit; }
        .hr-form > select { flex: 1 1 240px; }
        .hr-form input[type='number'] { width: 90px; }
        .hr-opcoes { flex-basis: 100%; display: flex; gap: 8px; overflow-x: auto; }
        .hr-opcoes button { flex: none; display: grid; gap: 2px; min-width: 150px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--ern-borda); background: transparent; color: inherit; text-align: left; cursor: pointer; }
        .hr-opcoes button[aria-checked='true'] { border-color: var(--ern-destaque, #e3a144); background: rgb(227 161 68 / 12%); }
        .hr-opcoes button:disabled { opacity: .45; cursor: not-allowed; }
        .hr-opcoes small { font-size: 11px; color: var(--ern-secundario, #b4c8bb); }
        .hr-acoes { flex-basis: 100%; display: flex; justify-content: flex-end; gap: 8px; }
      `}</style>
    </section>
  );
}

'use client';

// EDA_HOSPEDAGENS_PREMIUM_V1: acomodações da hospedagem + mapa de ocupação real.
// A ocupação vem das estadias das reservas — ninguém marca "ocupada" à mão.

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { dataCurtaEDA } from '@/lib/passeiosPublicosEDA';
import { hojeManausEDA } from '@/lib/saidasGestaoEDA';
import {
  TIPOS_ACOMODACAO, mapaHospedagemEDA, mensagemHospedagemEDA, rotuloTipoAcomodacao,
  type AcomodacaoEDA, type MapaHospedagemEDA,
} from '@/lib/hospedagensEDA';

export default function AcomodacoesHospedagemEDA({ hospedagemId, bloqueado }: { hospedagemId: string; bloqueado?: boolean }) {
  const [lista, setLista] = useState<AcomodacaoEDA[] | null>(null);
  const [mapa, setMapa] = useState<MapaHospedagemEDA | null>(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [novo, setNovo] = useState({ nome: '', tipo: 'quarto', capacidade: '2', quantidade: '1', valor: '' });

  const carregar = useCallback(async () => {
    setErro('');
    const { data, error } = await supabase.from('hospedagem_acomodacoes')
      .select('id,hospedagem_id,nome,tipo,capacidade,quantidade,valor_diaria,status')
      .eq('hospedagem_id', hospedagemId).order('nome');
    if (error) { setErro(mensagemHospedagemEDA(error)); setLista([]); return; }
    setLista((data ?? []) as AcomodacaoEDA[]);
    try { setMapa(await mapaHospedagemEDA(hospedagemId, hojeManausEDA(), 14)); } catch { setMapa(null); }
  }, [hospedagemId]);

  useEffect(() => { void carregar(); }, [carregar]);

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    const capacidade = Number(novo.capacidade), quantidade = Number(novo.quantidade);
    const valor = novo.valor.trim() ? Number(novo.valor.replace(/\./g, '').replace(',', '.')) : null;
    if (!Number.isInteger(capacidade) || capacidade < 1 || capacidade > 50) { setErro('Capacidade: 1 a 50 pessoas.'); return; }
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 200) { setErro('Quantidade: 1 a 200 unidades.'); return; }
    if (valor !== null && (!Number.isFinite(valor) || valor < 0)) { setErro('Diária inválida.'); return; }
    setSalvando(true); setErro('');
    const { data: h } = await supabase.from('hospedagens').select('empresa_id').eq('id', hospedagemId).single();
    const { error } = await supabase.from('hospedagem_acomodacoes').insert({
      hospedagem_id: hospedagemId, empresa_id: h?.empresa_id, nome: novo.nome.trim(), tipo: novo.tipo,
      capacidade, quantidade, valor_diaria: valor,
    });
    setSalvando(false);
    if (error) { setErro(mensagemHospedagemEDA(error)); return; }
    setNovo({ nome: '', tipo: novo.tipo, capacidade: novo.capacidade, quantidade: '1', valor: '' });
    void carregar();
  }

  async function status(a: AcomodacaoEDA, s: AcomodacaoEDA['status']) {
    const { error } = await supabase.from('hospedagem_acomodacoes').update({ status: s }).eq('id', a.id);
    if (error) { setErro(mensagemHospedagemEDA(error)); return; }
    void carregar();
  }

  async function excluir(a: AcomodacaoEDA) {
    if (!window.confirm(`Excluir "${a.nome}"?`)) return;
    const { error } = await supabase.from('hospedagem_acomodacoes').delete().eq('id', a.id);
    if (error) { setErro(mensagemHospedagemEDA(error)); return; }
    void carregar();
  }

  const totalUnidades = (lista ?? []).filter((a) => a.status === 'ativa').reduce((n, a) => n + a.quantidade, 0);
  const totalLeitos = (lista ?? []).filter((a) => a.status === 'ativa').reduce((n, a) => n + a.quantidade * a.capacidade, 0);

  return (
    <section className="ah">
      <header>
        <p className="ah-eb">Acomodações e ocupação</p>
        <span>{totalUnidades} unidade(s) ativa(s) · até {totalLeitos} hóspede(s) por noite. A ocupação vem das reservas.</span>
      </header>

      {erro && <p role="alert" className="ah-erro">{erro}</p>}

      {lista === null ? <p className="ah-nota">Carregando…</p> : lista.length === 0 ? (
        <p className="ah-nota">Cadastre as acomodações (quartos, suítes, cabines, redário…) para controlar a disponibilidade real.</p>
      ) : (
        <ul className="ah-lista">
          {lista.map((a) => (
            <li key={a.id} data-status={a.status}>
              <div>
                <strong>{a.nome}</strong>
                <small>{rotuloTipoAcomodacao(a.tipo)} · {a.quantidade} unid. · até {a.capacidade} pessoa(s) cada
                  {a.valor_diaria != null ? ` · ${Number(a.valor_diaria).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/noite` : ''}
                  {a.status !== 'ativa' ? ` · ${a.status === 'manutencao' ? 'em manutenção' : 'inativa'}` : ''}</small>
              </div>
              <div className="ah-acoes">
                {a.status === 'ativa'
                  ? <button type="button" disabled={bloqueado} onClick={() => status(a, 'manutencao')}>Manutenção</button>
                  : <button type="button" disabled={bloqueado} onClick={() => status(a, 'ativa')}>Reativar</button>}
                <button type="button" disabled={bloqueado} onClick={() => excluir(a)} aria-label={`Excluir ${a.nome}`}>×</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form className="ah-novo" onSubmit={adicionar}>
        <input required minLength={2} maxLength={80} placeholder="Nome (ex.: Suíte Tucunaré)" value={novo.nome}
          onChange={(e) => setNovo({ ...novo, nome: e.target.value })} disabled={bloqueado || salvando} />
        <select value={novo.tipo} onChange={(e) => setNovo({ ...novo, tipo: e.target.value })} disabled={bloqueado || salvando} aria-label="Tipo">
          {TIPOS_ACOMODACAO.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
        <label>Pessoas<input type="number" min={1} max={50} value={novo.capacidade} onChange={(e) => setNovo({ ...novo, capacidade: e.target.value })} disabled={bloqueado || salvando} /></label>
        <label>Unidades<input type="number" min={1} max={200} value={novo.quantidade} onChange={(e) => setNovo({ ...novo, quantidade: e.target.value })} disabled={bloqueado || salvando} /></label>
        <label>Diária (opcional)<input inputMode="decimal" placeholder="padrão" value={novo.valor} onChange={(e) => setNovo({ ...novo, valor: e.target.value })} disabled={bloqueado || salvando} /></label>
        <button type="submit" className="ah-ouro" disabled={bloqueado || salvando}>{salvando ? 'Salvando…' : '+ Acomodação'}</button>
      </form>

      {mapa && mapa.acomodacoes.length > 0 && (
        <div className="ah-mapa">
          <p className="ah-eb">Próximos 14 dias</p>
          <div className="ah-grade" style={{ gridTemplateColumns: `minmax(120px, 1.4fr) repeat(${mapa.noites.length}, minmax(30px, 1fr))` }}>
            <span />
            {mapa.noites.map((n) => <span key={n} className="ah-dia">{dataCurtaEDA(n).replace(' ', '\n')}</span>)}
            {mapa.acomodacoes.map((a) => (
              <div key={a.id} style={{ display: 'contents' }}>
                <span className="ah-nome">{a.nome}</span>
                {a.ocupacao.map((o, i) => {
                  const pct = a.status !== 'ativa' ? -1 : o / a.quantidade;
                  return (
                    <span key={i} className="ah-cel" title={`${o}/${a.quantidade} ocupada(s)`}
                      data-n={pct < 0 ? 'off' : pct >= 1 ? 'cheio' : pct > 0 ? 'parcial' : 'livre'}>
                      {a.status === 'ativa' ? `${o}/${a.quantidade}` : '—'}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
          {mapa.estadias.length > 0 && (
            <ul className="ah-estadias">
              {mapa.estadias.map((e) => (
                <li key={e.id}>
                  <Link href={`/reservas/editar/${e.reserva_id}`}>{e.cliente || 'Reserva'}</Link>
                  <span>{e.acomodacao} · {dataCurtaEDA(e.checkin)} → {dataCurtaEDA(e.checkout)} · {e.hospedes} hóspede(s)</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <style jsx>{`
        .ah { margin: 16px 24px 0; padding: 16px; border-radius: 18px; border: 1px solid var(--ern-borda); background: var(--ern-suave); color: var(--ern-texto); display: grid; gap: 12px; }
        .ah-eb { margin: 0; font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--ern-destaque); }
        header span, .ah-nota { display: block; margin-top: 4px; font-size: 12px; color: var(--ern-secundario); }
        .ah-erro { margin: 0; font-size: 13px; color: var(--ern-erro); }
        .ah-lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
        .ah-lista li { display: flex; justify-content: space-between; gap: 10px; align-items: center; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--ern-borda); background: var(--ern-painel); }
        .ah-lista li[data-status='manutencao'], .ah-lista li[data-status='inativa'] { opacity: .6; }
        .ah-lista strong { display: block; font-size: 14px; } .ah-lista small { font-size: 12px; color: var(--ern-secundario); }
        .ah-acoes { display: flex; gap: 6px; }
        button { min-height: 34px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--ern-borda); background: transparent; color: var(--ern-texto); font-size: 12px; cursor: pointer; }
        .ah-novo { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end; }
        .ah-novo label { display: grid; gap: 4px; font-size: 11px; color: var(--ern-secundario); }
        .ah-novo input, .ah-novo select { min-height: 38px; padding: 0 10px; border-radius: 10px; border: 1px solid var(--ern-borda); background: var(--ern-painel); color: var(--ern-texto); font-size: 14px; }
        .ah-novo > input { flex: 1 1 200px; }
        .ah-novo input[type='number'] { width: 76px; } .ah-novo label:nth-of-type(3) input { width: 110px; }
        .ah-ouro { min-height: 38px; background: var(--ern-destaque); border-color: var(--ern-destaque); color: #10140f; font-weight: 700; }
        .ah-mapa { display: grid; gap: 8px; overflow-x: auto; }
        .ah-grade { display: grid; gap: 3px; min-width: 560px; font-size: 11px; }
        .ah-dia { text-align: center; white-space: pre-line; color: var(--ern-secundario); }
        .ah-nome { align-self: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ah-cel { text-align: center; padding: 6px 0; border-radius: 6px; background: var(--ern-painel); border: 1px solid var(--ern-borda); }
        .ah-cel[data-n='parcial'] { background: rgb(227 161 68 / 22%); }
        .ah-cel[data-n='cheio'] { background: rgb(239 68 68 / 28%); }
        .ah-cel[data-n='off'] { opacity: .35; }
        .ah-estadias { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; font-size: 12px; }
        .ah-estadias li { display: flex; flex-wrap: wrap; gap: 8px; }
        .ah-estadias :global(a) { color: var(--ern-destaque); font-weight: 600; }
        .ah-estadias span { color: var(--ern-secundario); }
      `}</style>
    </section>
  );
}

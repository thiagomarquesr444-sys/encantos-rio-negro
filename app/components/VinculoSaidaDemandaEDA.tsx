'use client';

// EDA_DEMANDA_SAIDA_V1: a demanda nasce da saída real.
// Pessoas, dias e necessidades vêm das reservas e fichas — sempre em contagens,
// sem nomes nem diagnósticos (os detalhes ficam no resumo de segurança).

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { dataCurtaEDA } from '@/lib/passeiosPublicosEDA';
import { mensagemFichaEDA, RESTRICOES } from '@/lib/fichaSaudeEDA';
import { CATEGORIAS_ITEM, type ItemDemanda } from '@/lib/itensDemanda';
import { analisarMateriaisEDA, type AlertaAnaliseEDA, type AnaliseMateriaisEDA } from '@/lib/analiseMateriaisEDA';

export type SaidaDemandaEDA = {
  saida_id: string; passeio: string; data_inicio: string; data_fim: string | null;
  horario: string | null; pessoas: number; status: string;
};

export type NecessidadesEDA = {
  passeio: string; data_inicio: string; data_fim: string; dias: number; pessoas: number; fichas: number;
  restricoes: Record<string, number>; alergias_graves: number; alergias: number; alergia_alimentar: number;
  nao_nadam: number; natacao_nao_informada: number; condicoes: number; medicacao: number;
  alergias_tipo?: Record<string, number>; condicoes_tipo?: Record<string, number>; sem_contato_emergencia?: number;
};

const ROTULO = Object.fromEntries(RESTRICOES) as Record<string, string>;

// EDA_ANALISE_MATERIAIS_V1: a sugestão vem da análise completa (quantidade, unidade, preço, categoria e saúde).
export function itensDasNecessidades(n: NecessidadesEDA): ItemDemanda[] {
  return analisarMateriaisEDA(n).itens;
}

const TOM_ALERTA: Record<AlertaAnaliseEDA['nivel'], string> = { grave: 'grave', atencao: 'atencao', pendente: 'pendente', info: 'ok' };
const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type Props = {
  demandaId?: string;
  bloqueado: boolean;
  onSaida?: (saida: SaidaDemandaEDA | null, necessidades: NecessidadesEDA | null) => void;
  onAcrescentar: (itens: ItemDemanda[]) => void;
};

export default function VinculoSaidaDemandaEDA({ demandaId, bloqueado, onSaida, onAcrescentar }: Props) {
  const [saidas, setSaidas] = useState<SaidaDemandaEDA[] | null>(null);
  const [saidaId, setSaidaId] = useState('');
  const [nec, setNec] = useState<NecessidadesEDA | null>(null);
  const [erro, setErro] = useState('');
  const [semPermissao, setSemPermissao] = useState(false);
  const [analise, setAnalise] = useState<AnaliseMateriaisEDA | null>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data, error } = await supabase.rpc('saidas_para_demanda_eda');
      if (!ativo) return;
      if (error) { if (mensagemFichaEDA(error).startsWith('Sua função')) setSemPermissao(true); else setErro(mensagemFichaEDA(error)); setSaidas([]); return; }
      const lista = (data ?? []) as SaidaDemandaEDA[];
      setSaidas(lista);
      if (demandaId) {
        const { data: d } = await supabase.from('demandas').select('saida_id').eq('id', demandaId).maybeSingle();
        if (ativo && d?.saida_id) { setSaidaId(d.saida_id); void carregarNec(d.saida_id, true, lista); }
        else if (ativo) onSaida?.(null, null);
      }
    })();
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demandaId]);

  async function carregarNec(id: string, avisar: boolean, lista = saidas) {
    setNec(null); setErro(''); setAnalise(null);
    if (!id) { if (avisar) onSaida?.(null, null); return; }
    const { data, error } = await supabase.rpc('necessidades_saida_eda', { p_saida_id: id });
    if (error) { setErro(mensagemFichaEDA(error)); return; }
    const n = data as NecessidadesEDA;
    setNec(n);
    if (avisar) onSaida?.(lista?.find((s) => s.saida_id === id) ?? null, n);
  }

  async function escolher(id: string) {
    setSaidaId(id);
    if (demandaId) {
      const { error } = await supabase.rpc('vincular_demanda_saida_eda', { p_demanda_id: demandaId, p_saida_id: id || null });
      if (error) { setErro('Não foi possível vincular a saída.'); return; }
    }
    void carregarNec(id, true);
  }

  if (semPermissao) return null;

  const pendentes = nec ? Math.max(nec.pessoas - nec.fichas, 0) : 0;
  const restricoes = nec ? Object.entries(nec.restricoes) : [];

  return (
    <section className="rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-5 md:p-7 vsd">
      <p className="vsd-eb">Passeio vinculado</p>
      <h2 className="text-2xl">Qual passeio esta demanda prepara?</h2>
      <p className="vsd-txt">Datas e horário vêm do passeio e se atualizam sozinhos. O tempo para preparar a logística é o mesmo de preparar o cliente.</p>

      <select value={saidaId} disabled={bloqueado || saidas === null} onChange={(e) => escolher(e.target.value)}
        className="min-h-12 w-full rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-3 text-[var(--ern-texto)]">
        <option value="">{saidas === null ? 'Carregando passeios…' : saidas.length ? 'Escolha o passeio e a data' : 'Nenhuma saída programada — programe em Passeios'}</option>
        {saidas?.map((s) => (
          <option key={s.saida_id} value={s.saida_id}>
            {s.passeio} · {dataCurtaEDA(s.data_inicio)}{s.data_fim && s.data_fim !== s.data_inicio ? ` – ${dataCurtaEDA(s.data_fim)}` : ''}{s.horario ? ` · ${s.horario.slice(0, 5)}` : ''} · {s.pessoas} pessoa(s){s.status === 'fechada' ? ' · fechada' : ''}
          </option>
        ))}
      </select>

      {erro && <p role="alert" className="vsd-erro">{erro}</p>}

      {nec && (
        <div className="vsd-painel">
          <p className="vsd-linha"><b>{nec.pessoas}</b> pessoa(s) · <b>{nec.dias}</b> dia(s) · <b>{nec.fichas}</b> ficha(s) preenchida(s)</p>
          <ul>
            {nec.alergias_graves > 0 && <li data-n="grave">{nec.alergias_graves} pessoa(s) com ALERGIA GRAVE — ver resumo de segurança antes de montar o cardápio</li>}
            {restricoes.map(([c, q]) => <li key={c} data-n="atencao">{q} pessoa(s): {ROTULO[c]?.toLowerCase() ?? c}</li>)}
            {nec.nao_nadam > 0 && <li data-n="grave">{nec.nao_nadam} pessoa(s) não sabem nadar — colete obrigatório</li>}
            {nec.condicoes > 0 && <li data-n="atencao">{nec.condicoes} pessoa(s) com condição de saúde informada</li>}
            {nec.medicacao > 0 && <li data-n="atencao">{nec.medicacao} pessoa(s) com medicação contínua</li>}
            {pendentes > 0 && <li data-n="pendente">{pendentes} pessoa(s) ainda sem ficha — a demanda pode estar incompleta</li>}
            {!nec.alergias_graves && !restricoes.length && !nec.nao_nadam && !nec.condicoes && !pendentes && <li data-n="ok">Nenhuma necessidade especial nas fichas</li>}
          </ul>
          {nec.pessoas > 0 && !analise && (
            <button type="button" disabled={bloqueado} className="vsd-bt" onClick={() => setAnalise(analisarMateriaisEDA(nec))}>
              Analisar e sugerir materiais
            </button>
          )}
          {analise && (
            <div className="vsd-analise" aria-live="polite">
              <p className="vsd-eb">Análise da EDA para esta saída</p>
              <ul className="vsd-alertas">
                {analise.alertas.map((a, i) => (
                  <li key={i} data-n={TOM_ALERTA[a.nivel]}><b>{a.titulo}.</b> {a.texto}</li>
                ))}
              </ul>
              <div className="vsd-tabela" role="table" aria-label="Materiais sugeridos">
                <div role="row" className="vsd-cab"><span role="columnheader">Item</span><span role="columnheader">Qtd.</span><span role="columnheader">Categoria</span><span role="columnheader">Estimativa</span></div>
                {analise.itens.map((it, i) => {
                  const total = (Number(it.preco_unitario_estimado) || 0) * (Number(it.quantidade) || 0);
                  return (
                    <div role="row" key={i} data-saude={it.categoria === 'saude' || undefined}>
                      <span role="cell"><b>{it.descricao}</b><small>{it.observacoes}</small></span>
                      <span role="cell">{it.quantidade} {it.unidade}</span>
                      <span role="cell">{CATEGORIAS_ITEM[it.categoria]}</span>
                      <span role="cell">{total ? moeda(total) : '—'}</span>
                    </div>
                  );
                })}
              </div>
              <p className="vsd-total">Estimativa total: <b>{moeda(analise.totalEstimado)}</b> · preços de referência da região; ajuste ao valor do dia antes de comprar.</p>
              <div className="vsd-acoes">
                <button type="button" disabled={bloqueado} className="vsd-bt" onClick={() => { onAcrescentar(analise.itens); setAnalise(null); }}>
                  Adicionar {analise.itens.length} itens aos materiais
                </button>
                <button type="button" className="vsd-bt vsd-bt-sec" onClick={() => setAnalise(null)}>Fechar análise</button>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .vsd { display: grid; gap: 10px; }
        .vsd-eb { margin: 0; font-size: 11px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--ern-destaque); }
        .vsd-txt { margin: 0; font-size: 14px; color: var(--ern-secundario); }
        .vsd-erro { color: var(--ern-erro, #f87171); font-size: 13px; }
        .vsd-painel { display: grid; gap: 10px; padding: 14px; border-radius: 14px; border: 1px solid var(--ern-borda); }
        .vsd-linha { margin: 0; font-size: 14px; }
        .vsd-painel ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
        .vsd-painel li { padding: 6px 10px; border-left: 3px solid var(--ern-borda); font-size: 13px; }
        .vsd-painel li[data-n='grave'] { border-left-color: #ef4444; }
        .vsd-painel li[data-n='atencao'] { border-left-color: var(--ern-destaque); }
        .vsd-painel li[data-n='ok'] { border-left-color: #22c55e; }
        .vsd-painel li[data-n='pendente'] { border-left-style: dashed; }
        .vsd-bt { justify-self: start; min-height: 40px; padding: 0 16px; border-radius: 999px; border: 1px solid var(--ern-destaque); background: var(--ern-destaque); color: #10140f; font-weight: 700; cursor: pointer; }
        .vsd-bt:disabled { opacity: .5; }
        .vsd-bt-sec { background: transparent; color: var(--ern-texto); border-color: var(--ern-borda); }
        .vsd-analise { display: grid; gap: 10px; padding-top: 6px; border-top: 1px dashed var(--ern-borda); }
        .vsd-alertas { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
        .vsd-alertas li { padding: 8px 10px; border-left: 3px solid var(--ern-borda); font-size: 13px; line-height: 1.5; }
        .vsd-alertas li[data-n='grave'] { border-left-color: #ef4444; }
        .vsd-alertas li[data-n='atencao'] { border-left-color: var(--ern-destaque); }
        .vsd-alertas li[data-n='pendente'] { border-left-style: dashed; }
        .vsd-alertas li[data-n='ok'] { border-left-color: #22c55e; opacity: .85; }
        .vsd-tabela { display: grid; gap: 4px; font-size: 13px; }
        .vsd-tabela > div { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 1fr); gap: 8px; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--ern-borda); }
        .vsd-tabela > div[data-saude] { border-left: 3px solid #ef4444; }
        .vsd-cab { border: 0 !important; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--ern-secundario); }
        .vsd-tabela small { display: block; margin-top: 2px; color: var(--ern-secundario); font-size: 12px; line-height: 1.45; }
        .vsd-total { margin: 0; font-size: 13px; color: var(--ern-secundario); }
        .vsd-acoes { display: flex; flex-wrap: wrap; gap: 8px; }
        @media (max-width: 640px) { .vsd-tabela > div { grid-template-columns: 1fr 1fr; } .vsd-cab { display: none !important; } }
      `}</style>
    </section>
  );
}

'use client';

// EDA_DEMANDA_SAIDA_V1: a demanda nasce da saída real.
// Pessoas, dias e necessidades vêm das reservas e fichas — sempre em contagens,
// sem nomes nem diagnósticos (os detalhes ficam no resumo de segurança).

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { dataCurtaEDA } from '@/lib/passeiosPublicosEDA';
import { mensagemFichaEDA, RESTRICOES } from '@/lib/fichaSaudeEDA';
import { novoItemDemanda, type ItemDemanda } from '@/lib/itensDemanda';

export type SaidaDemandaEDA = {
  saida_id: string; passeio: string; data_inicio: string; data_fim: string | null;
  horario: string | null; pessoas: number; status: string;
};

export type NecessidadesEDA = {
  passeio: string; data_inicio: string; data_fim: string; dias: number; pessoas: number; fichas: number;
  restricoes: Record<string, number>; alergias_graves: number; alergias: number; alergia_alimentar: number;
  nao_nadam: number; natacao_nao_informada: number; condicoes: number; medicacao: number;
};

const ROTULO = Object.fromEntries(RESTRICOES) as Record<string, string>;

// Itens sugeridos a partir das necessidades (o operador revisa antes de salvar).
export function itensDasNecessidades(n: NecessidadesEDA): ItemDemanda[] {
  const itens: ItemDemanda[] = [];
  for (const [codigo, qtd] of Object.entries(n.restricoes)) {
    itens.push({
      ...novoItemDemanda(),
      descricao: `Refeições ${ROTULO[codigo]?.toLowerCase() ?? codigo} — ${qtd} pessoa(s)`,
      categoria: 'alimentacao',
      quantidade: String(qtd * n.dias * 3),
      unidade: 'unidade',
      observacoes: `${qtd} pessoa(s) × ${n.dias} dia(s) × 3 refeições. Separar no preparo e identificar.`,
    });
  }
  if (n.alergia_alimentar > 0) {
    itens.push({
      ...novoItemDemanda(),
      descricao: 'Conferência de cardápio — alergia alimentar',
      categoria: 'outros',
      quantidade: '1',
      unidade: 'serviço',
      observacoes: `${n.alergia_alimentar} pessoa(s) com alergia alimentar${n.alergias_graves ? `, ${n.alergias_graves} grave(s)` : ''}. Ver detalhes no resumo de segurança da saída.`,
    });
  }
  if (n.pessoas > 0) {
    itens.push({
      ...novoItemDemanda(),
      descricao: 'Colete salva-vidas',
      categoria: 'equipamentos',
      quantidade: String(n.pessoas),
      unidade: 'unidade',
      observacoes: n.nao_nadam > 0
        ? `${n.nao_nadam} pessoa(s) não sabem nadar: uso obrigatório e acompanhamento.`
        : 'Um por pessoa a bordo.',
    });
  }
  if (n.alergias_graves > 0 || n.condicoes > 0 || n.medicacao > 0) {
    itens.push({
      ...novoItemDemanda(),
      descricao: 'Kit de primeiros socorros revisado',
      categoria: 'equipamentos',
      quantidade: '1',
      unidade: 'kit',
      observacoes: 'Há participantes com alergia grave, condição de saúde ou medicação contínua. Confirmar com cada um se leva a própria medicação prescrita.',
    });
  }
  return itens;
}

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

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data, error } = await supabase.rpc('saidas_para_demanda_eda');
      if (!ativo) return;
      if (error) { if (mensagemFichaEDA(error).startsWith('Sua função')) setSemPermissao(true); else setErro(mensagemFichaEDA(error)); setSaidas([]); return; }
      setSaidas((data ?? []) as SaidaDemandaEDA[]);
      if (demandaId) {
        const { data: d } = await supabase.from('demandas').select('saida_id').eq('id', demandaId).maybeSingle();
        if (ativo && d?.saida_id) { setSaidaId(d.saida_id); void carregarNec(d.saida_id, false); }
      }
    })();
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demandaId]);

  async function carregarNec(id: string, avisar: boolean) {
    setNec(null); setErro('');
    if (!id) { if (avisar) onSaida?.(null, null); return; }
    const { data, error } = await supabase.rpc('necessidades_saida_eda', { p_saida_id: id });
    if (error) { setErro(mensagemFichaEDA(error)); return; }
    const n = data as NecessidadesEDA;
    setNec(n);
    if (avisar) onSaida?.(saidas?.find((s) => s.saida_id === id) ?? null, n);
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
      <p className="vsd-eb">Saída do passeio</p>
      <h2 className="text-2xl">Para qual viagem é esta demanda?</h2>
      <p className="vsd-txt">Vincule a uma saída para usar pessoas, dias e necessidades reais das fichas dos participantes.</p>

      <select value={saidaId} disabled={bloqueado || saidas === null} onChange={(e) => escolher(e.target.value)}
        className="min-h-12 w-full rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-3 text-[var(--ern-texto)]">
        <option value="">{saidas === null ? 'Carregando saídas…' : 'Sem vínculo com saída'}</option>
        {saidas?.map((s) => (
          <option key={s.saida_id} value={s.saida_id}>
            {s.passeio} · {dataCurtaEDA(s.data_inicio)}{s.data_fim && s.data_fim !== s.data_inicio ? ` – ${dataCurtaEDA(s.data_fim)}` : ''} · {s.pessoas} pessoa(s){s.status === 'fechada' ? ' · fechada' : ''}
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
          {nec.pessoas > 0 && (
            <button type="button" disabled={bloqueado} className="vsd-bt" onClick={() => onAcrescentar(itensDasNecessidades(nec))}>
              Adicionar itens sugeridos aos materiais
            </button>
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
      `}</style>
    </section>
  );
}

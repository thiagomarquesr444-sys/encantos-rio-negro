'use client';

// EDA_DOCUMENTOS_OPERACAO_V1: documentação legal da operação com validade,
// cruzada com as viagens dos próximos 30 dias. Abre no mês atual.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { hojeManausEDA } from '@/lib/saidasGestaoEDA';
import { confirmarEDA } from '@/lib/dialogoEDA';

export const CATEGORIAS_DOCUMENTO = [
  ['cadastur_empresa', 'Cadastur da operadora'],
  ['cadastur_guia', 'Cadastur do guia'],
  ['tie_embarcacao', 'TIE da embarcação (Marinha)'],
  ['vistoria_marinha', 'Vistoria / certificado de segurança'],
  ['habilitacao_arrais', 'Habilitação de arrais / piloto'],
  ['seguro_passageiros', 'Seguro de passageiros'],
  ['alvara_funcionamento', 'Alvará de funcionamento'],
  ['licenca_ambiental', 'Licença ambiental / autorização de área'],
  ['licenca_pesca', 'Licença de pesca'],
  ['contrato_parceiro', 'Contrato com parceiro'],
  ['outro', 'Outro'],
] as const;
type Categoria = (typeof CATEGORIAS_DOCUMENTO)[number][0];
const VINCULO: Partial<Record<Categoria, 'embarcacao' | 'guia' | 'parceiro'>> = {
  cadastur_guia: 'guia', habilitacao_arrais: 'guia',
  tie_embarcacao: 'embarcacao', vistoria_marinha: 'embarcacao',
  contrato_parceiro: 'parceiro',
};

type Doc = {
  id: string; categoria: Categoria; titulo: string; numero: string | null; orgao_emissor: string | null;
  emissao: string | null; validade: string | null; observacao: string | null;
  situacao: 'vencido' | 'vencendo' | 'em_dia' | 'sem_validade';
  embarcacao_id: string | null; guia_id: string | null; parceiro_id: string | null; vinculo: string | null;
};
type Painel = {
  documentos: Doc[];
  resumo: { vencidos: number; vencendo: number; em_dia: number; vouchers_mes: number; reservas_sem_voucher: number; receber_mes: number | null };
  riscos: { reserva_id: string; dia: string; cliente: string | null; passeio: string | null; documento: string; validade: string; recurso: string | null }[];
};
type Opcao = { id: string; nome: string };

const vazio = { id: '', categoria: 'tie_embarcacao' as Categoria, titulo: '', numero: '', orgao_emissor: '', emissao: '', validade: '', observacao: '', vinculo_id: '' };
const dataBR = (d: string | null) => (d ? d.split('-').reverse().join('/') : '—');
const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const ROTULO_SITUACAO = { vencido: 'Vencido', vencendo: 'Vence em até 30 dias', em_dia: 'Em dia', sem_validade: 'Sem validade' };

function erroAmigavel(m?: string) {
  if (!m) return 'Não foi possível salvar.';
  if (m.includes('documentos_operacao_datas')) return 'A validade não pode ser anterior à emissão.';
  if (m.includes('VINCULO')) return 'O vínculo escolhido não pertence à sua operadora.';
  if (m.includes('row-level') || m.includes('SEM_PERMISSAO')) return 'Seu perfil não pode alterar documentos.';
  return 'Não foi possível salvar. Confira os campos.';
}

export default function DocumentosOperacaoEDA() {
  const [mes, setMes] = useState(hojeManausEDA().slice(0, 7));
  const [painel, setPainel] = useState<Painel | null>(null);
  const [erro, setErro] = useState('');
  const [form, setForm] = useState<typeof vazio | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [opcoes, setOpcoes] = useState<Record<'embarcacao' | 'guia' | 'parceiro', Opcao[]>>({ embarcacao: [], guia: [], parceiro: [] });

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc('painel_documentos_eda', { p_mes: `${mes}-01` });
    if (error) { setErro('Não foi possível carregar a situação documental.'); return; }
    setPainel(data as Painel); setErro('');
  }, [mes]);
  useEffect(() => { void carregar(); }, [carregar]);

  const formAberto = form !== null;
  useEffect(() => {
    if (!formAberto) return;
    // Listas para vínculo (RLS já limita à operadora).
    Promise.all([
      supabase.from('embarcacoes').select('id,nome').order('nome'),
      supabase.from('guias').select('id,nome').order('nome'),
      supabase.from('parceiros').select('id,nome').order('nome'),
    ]).then(([e, g, p]) => setOpcoes({
      embarcacao: (e.data ?? []) as Opcao[], guia: (g.data ?? []) as Opcao[], parceiro: (p.data ?? []) as Opcao[],
    }));
  }, [formAberto]);

  const tipoVinculo = form ? VINCULO[form.categoria] : undefined;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (form.titulo.trim().length < 2) { setErro('Dê um nome ao documento.'); return; }
    if (tipoVinculo && !form.vinculo_id) { setErro('Escolha a quem este documento pertence.'); return; }
    setSalvando(true); setErro('');
    const payload = {
      categoria: form.categoria, titulo: form.titulo.trim(), numero: form.numero || null, orgao_emissor: form.orgao_emissor || null,
      emissao: form.emissao || null, validade: form.validade || null, observacao: form.observacao || null,
      embarcacao_id: tipoVinculo === 'embarcacao' ? form.vinculo_id : null,
      guia_id: tipoVinculo === 'guia' ? form.vinculo_id : null,
      parceiro_id: tipoVinculo === 'parceiro' ? form.vinculo_id : null,
    };
    const q = form.id
      ? supabase.from('documentos_operacao').update(payload).eq('id', form.id).select('id').single()
      : supabase.from('documentos_operacao').insert(payload).select('id').single();
    const { error } = await q;
    setSalvando(false);
    if (error) { setErro(erroAmigavel(error.message)); return; }
    setForm(null); void carregar();
  }

  async function excluir(d: Doc) {
    if (!(await confirmarEDA(`Excluir "${d.titulo}"? Isso não pode ser desfeito.`, { titulo: 'Excluir documento', confirmar: 'Excluir', perigo: true }))) return;
    const { error } = await supabase.from('documentos_operacao').delete().eq('id', d.id);
    if (error) { setErro(erroAmigavel(error.message)); return; }
    void carregar();
  }

  const r = painel?.resumo;
  return (
    <section className="dop" aria-label="Documentação da operação">
      <div className="dop-topo">
        <div>
          <span className="eda-pg-eb">SITUAÇÃO DOCUMENTAL</span>
          <h2>Documentos da operação</h2>
        </div>
        <label className="dop-mes">Mês
          <input type="month" value={mes} onChange={(e) => e.target.value && setMes(e.target.value)} />
        </label>
      </div>

      {r && (
        <div className="dop-kpis">
          <div className={r.vencidos ? 'k-alerta' : ''}><b>{r.vencidos}</b><span>vencidos</span></div>
          <div className={r.vencendo ? 'k-aviso' : ''}><b>{r.vencendo}</b><span>vencem em 30 dias</span></div>
          <div><b>{r.em_dia}</b><span>em dia</span></div>
          <div><b>{r.vouchers_mes}</b><span>vouchers emitidos no mês</span></div>
          <Link href="/reservas" className={r.reservas_sem_voucher ? 'k-aviso' : ''}><b>{r.reservas_sem_voucher}</b><span>viagens em 30 dias sem voucher</span></Link>
          {r.receber_mes !== null && <Link href="/financeiro"><b>{moeda(Number(r.receber_mes))}</b><span>a receber no mês</span></Link>}
        </div>
      )}

      {painel && painel.riscos.length > 0 && (
        <div className="dop-riscos" role="alert">
          <strong>Viagens com documento vencido na data</strong>
          <ul>
            {painel.riscos.map((x, i) => (
              <li key={`${x.reserva_id}-${i}`}>
                <Link href={`/reservas/editar/${x.reserva_id}`}>{dataBR(x.dia)} · {x.passeio ?? 'Reserva'}{x.cliente ? ` · ${x.cliente}` : ''}</Link>
                {' — '}{x.documento}{x.recurso ? ` (${x.recurso})` : ''} vence {dataBR(x.validade)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {erro && <p role="alert" className="dop-erro">{erro}</p>}

      {form ? (
        <form className="dop-form" onSubmit={salvar}>
          <label>Tipo
            <select value={form.categoria} onChange={(e) => {
              const c = e.target.value as Categoria;
              const rot = CATEGORIAS_DOCUMENTO.find(([v]) => v === c)?.[1] ?? '';
              setForm({ ...form, categoria: c, vinculo_id: '', titulo: form.titulo || (c === 'outro' ? '' : rot) });
            }}>
              {CATEGORIAS_DOCUMENTO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label>Nome do documento
            <input value={form.titulo} maxLength={120} required onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </label>
          {tipoVinculo && (
            <label>{tipoVinculo === 'embarcacao' ? 'Embarcação' : tipoVinculo === 'guia' ? 'Guia / piloto' : 'Parceiro'}
              <select value={form.vinculo_id} required onChange={(e) => setForm({ ...form, vinculo_id: e.target.value })}>
                <option value="">Selecione</option>
                {opcoes[tipoVinculo].map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </label>
          )}
          <label>Número
            <input value={form.numero} maxLength={80} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
          </label>
          <label>Órgão emissor
            <input value={form.orgao_emissor} maxLength={80} placeholder="Ex.: Marinha, MTur, IPAAM" onChange={(e) => setForm({ ...form, orgao_emissor: e.target.value })} />
          </label>
          <label>Emissão
            <input type="date" value={form.emissao} onChange={(e) => setForm({ ...form, emissao: e.target.value })} />
          </label>
          <label>Validade
            <input type="date" value={form.validade} min={form.emissao || undefined} onChange={(e) => setForm({ ...form, validade: e.target.value })} />
          </label>
          <label className="dop-largo">Observação
            <textarea rows={2} maxLength={500} value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
          </label>
          <div className="dop-acoes">
            <button type="submit" className="eda-pg-bt eda-pg-bt-ouro" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar documento'}</button>
            <button type="button" className="eda-pg-bt" onClick={() => { setForm(null); setErro(''); }}>Cancelar</button>
          </div>
        </form>
      ) : (
        <button type="button" className="eda-pg-bt eda-pg-bt-ouro dop-novo" onClick={() => setForm({ ...vazio, titulo: 'TIE da embarcação (Marinha)' })}>
          Adicionar documento
        </button>
      )}

      {painel && (painel.documentos.length === 0 ? (
        <p className="dop-vazio">Nenhum documento cadastrado. Comece pelo Cadastur da operadora, TIE das embarcações e seguro de passageiros.</p>
      ) : (
        <ul className="dop-lista">
          {painel.documentos.map((d) => (
            <li key={d.id} className={`s-${d.situacao}`}>
              <div>
                <strong>{d.titulo}</strong>
                <span>{[d.vinculo, d.numero && `nº ${d.numero}`, d.orgao_emissor].filter(Boolean).join(' · ') || CATEGORIAS_DOCUMENTO.find(([v]) => v === d.categoria)?.[1]}</span>
              </div>
              <div className="dop-val">
                <em>{ROTULO_SITUACAO[d.situacao]}</em>
                <span>Validade {dataBR(d.validade)}</span>
              </div>
              <div className="dop-bts">
                <button type="button" className="eda-pg-bt" onClick={() => setForm({
                  id: d.id, categoria: d.categoria, titulo: d.titulo, numero: d.numero ?? '', orgao_emissor: d.orgao_emissor ?? '',
                  emissao: d.emissao ?? '', validade: d.validade ?? '', observacao: d.observacao ?? '',
                  vinculo_id: d.embarcacao_id ?? d.guia_id ?? d.parceiro_id ?? '',
                })}>Editar</button>
                <button type="button" className="eda-pg-bt" onClick={() => void excluir(d)}>Excluir</button>
              </div>
            </li>
          ))}
        </ul>
      ))}

      <style jsx>{`
        .dop { display: grid; gap: 16px; padding: 22px; border-radius: 20px; border: 1px solid var(--p-borda, var(--ern-borda)); background: var(--p-painel, var(--ern-painel)); }
        .dop-topo { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 12px; }
        .dop-topo h2 { margin-top: 8px; font-size: 20px; font-weight: 650; }
        .dop-mes { display: grid; gap: 4px; font-size: 12px; }
        .dop-kpis { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
        .dop-kpis > :global(*) { display: grid; gap: 2px; padding: 12px; border-radius: 14px; border: 1px solid var(--p-borda, var(--ern-borda)); text-decoration: none; color: inherit; }
        .dop-kpis b { font-size: 20px; }
        .dop-kpis span { font-size: 12px; color: var(--p-sec, var(--ern-secundario)); }
        .dop-kpis :global(.k-alerta) { border-color: #f87171; }
        .dop-kpis :global(.k-aviso) { border-color: #e3a144; }
        .dop-riscos { padding: 12px 14px; border-radius: 14px; border: 1px solid #f87171; font-size: 13px; }
        .dop-riscos ul { margin-top: 6px; display: grid; gap: 4px; padding-left: 18px; list-style: disc; }
        .dop-riscos :global(a) { text-decoration: underline; }
        .dop-erro { color: #f87171; font-size: 13px; }
        .dop-novo { justify-self: start; }
        .dop-form { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
        .dop-form label { display: grid; gap: 4px; font-size: 12px; }
        .dop-form :is(input, select, textarea) { min-height: 42px; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--p-borda, var(--ern-borda)); background: transparent; color: inherit; font-size: 14px; }
        .dop-form option { color: #111; }
        .dop-largo { grid-column: 1 / -1; }
        .dop-acoes { grid-column: 1 / -1; display: flex; gap: 8px; flex-wrap: wrap; }
        .dop-vazio { font-size: 13px; color: var(--p-sec, var(--ern-secundario)); }
        .dop-lista { display: grid; gap: 8px; }
        .dop-lista li { display: grid; grid-template-columns: 1fr auto auto; gap: 12px; align-items: center; padding: 12px 14px; border-radius: 14px; border: 1px solid var(--p-borda, var(--ern-borda)); border-left-width: 4px; }
        .dop-lista li > div:first-child { display: grid; gap: 2px; min-width: 0; }
        .dop-lista li span { font-size: 12px; color: var(--p-sec, var(--ern-secundario)); overflow-wrap: anywhere; }
        .dop-val { display: grid; text-align: right; }
        .dop-val em { font-style: normal; font-size: 12px; font-weight: 700; }
        .dop-bts { display: flex; gap: 6px; }
        .s-vencido { border-left-color: #f87171 !important; } .s-vencido em { color: #f87171; }
        .s-vencendo { border-left-color: #e3a144 !important; } .s-vencendo em { color: #e3a144; }
        .s-em_dia { border-left-color: #22c55e !important; } .s-em_dia em { color: #22c55e; }
        @media (max-width: 640px) { .dop-lista li { grid-template-columns: 1fr; } .dop-val { text-align: left; } }
      `}</style>
    </section>
  );
}

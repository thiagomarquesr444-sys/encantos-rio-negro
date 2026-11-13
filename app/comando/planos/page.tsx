'use client';
import '@/app/components/padrao-paginas-eda.css';

// EDA_PAINEL_CEO_PLANOS_V1: painel geral de planos e cobranças, exclusivo do CEO da EDA.
// O banco recusa (SEM_PERMISSAO) qualquer conta que não seja a do CEO.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { confirmarEDA } from '@/lib/dialogoEDA';

type Empresa = {
  id: string; nome: string; cidade: string | null; tem_documento: boolean;
  plano: string; plano_codigo: string; status: string; ciclo: string | null;
  trial_ate: string | null; inadimplente_desde: string | null;
  pagante: boolean; teste_usado: boolean; criada_em: string;
};
type Cobranca = { empresa: string; valor: number; status: string; vencimento: string | null; pago_em: string | null; ciclo: string | null };
type Painel = {
  resumo: { empresas: number; pagantes: number; em_teste: number; em_carencia: number; mrr: number; recebido_30d: number };
  empresas: Empresa[];
  cobrancas: Cobranca[];
};

const CARENCIA_DIAS = 5;
const brl = (v: number) => Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const data = (d: string | null) => d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Manaus' }) : '—';
const STATUS_COBRANCA: Record<string, string> = {
  PENDING: 'Aguardando', RECEIVED: 'Recebida', CONFIRMED: 'Confirmada', OVERDUE: 'Vencida',
  REFUNDED: 'Estornada', DELETED: 'Removida', RECEIVED_IN_CASH: 'Recebida',
};
const ERROS: Record<string, string> = {
  ERN_DIAS_INVALIDOS: 'O teste pode ter de 1 a 8 dias.',
  ERN_PLANO_INVALIDO: 'Escolha Pro ou Plus.',
  ERN_SEM_DOCUMENTO: 'A empresa precisa ter CNPJ ou CPF cadastrado.',
  ERN_TESTE_JA_USADO: 'Esta empresa (ou este CNPJ/CPF) já usou o teste grátis.',
  ERN_EMPRESA_NAO_ELEGIVEL: 'Só empresas no plano Grátis, sem contratação em andamento, podem receber teste.',
  ERN_SEM_TESTE_ATIVO: 'Esta empresa não está em teste.',
};

function situacao(e: Empresa) {
  if (e.status === 'trial') return `Em teste até ${data(e.trial_ate)}`;
  if (e.inadimplente_desde) {
    const fim = new Date(new Date(e.inadimplente_desde).getTime() + CARENCIA_DIAS * 864e5);
    return `Pagamento vencido · volta ao Grátis em ${data(fim.toISOString())}`;
  }
  if (e.pagante) return `Pagante · ${e.ciclo ?? ''}`;
  return 'Grátis';
}

export default function PainelCeoPlanos() {
  const [dados, setDados] = useState<Painel | null>(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [teste, setTeste] = useState<{ empresa: Empresa; plano: string; dias: number } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    const { data: r, error } = await supabase.rpc('ern_comando_painel_planos_v1');
    if (error) {
      setErro(error.message.includes('SEM_PERMISSAO') ? 'Área exclusiva do CEO da Encantos da Amazônia.' : 'Não foi possível carregar o painel.');
      return;
    }
    setErro(''); setDados(r as Painel);
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  async function conceder() {
    if (!teste) return;
    setEnviando(true); setAviso('');
    const { data: r, error } = await supabase.rpc('ern_comando_conceder_teste_v1', {
      p_empresa_id: teste.empresa.id, p_plano_codigo: teste.plano, p_dias: teste.dias,
    });
    setEnviando(false);
    if (error || r?.ok !== true) { setAviso(ERROS[r?.codigo] ?? 'Não foi possível conceder o teste.'); return; }
    setAviso(`Teste concedido para ${teste.empresa.nome} até ${data(r.fim_em)}.`);
    setTeste(null); void carregar();
  }

  async function encerrar(e: Empresa) {
    if (!(await confirmarEDA(`A empresa ${e.nome} volta ao plano Grátis agora.`, { titulo: 'Encerrar o teste?', confirmar: 'Encerrar', perigo: true }))) return;
    const { data: r, error } = await supabase.rpc('ern_comando_encerrar_teste_v1', { p_empresa_id: e.id });
    setAviso(error || r?.ok !== true ? (ERROS[r?.codigo] ?? 'Não foi possível encerrar.') : `Teste de ${e.nome} encerrado.`);
    void carregar();
  }

  const r = dados?.resumo;
  return (
    <main className="eda-pg eda-pg-auto eda-pg-legado min-h-screen px-4 py-8 sm:px-8"><div className="mx-auto max-w-5xl space-y-6">
      <Link href="/comando/publicacoes" className="inline-flex min-h-11 items-center text-sm text-[var(--ern-destaque)]">← Comando EDA</Link>
      <header>
        <p className="text-xs uppercase tracking-[.2em] text-[var(--ern-destaque)]">Comando EDA · CEO</p>
        <h1 className="mt-2 text-3xl">Planos e cobranças da plataforma</h1>
        <p className="mt-2 text-sm text-[var(--ern-secundario)]">Visão geral exclusiva: empresas, pagantes, testes grátis e carência de {CARENCIA_DIAS} dias.</p>
      </header>

      {erro && <p role="alert" className="text-sm text-[var(--ern-erro)]">{erro}</p>}
      {aviso && <p role="status" className="text-sm text-[var(--ern-destaque)]">{aviso}</p>}
      {!dados && !erro && <p role="status" className="text-sm">Carregando…</p>}

      {r && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            ['Empresas', String(r.empresas)], ['Pagantes', String(r.pagantes)],
            ['Receita mensal recorrente', brl(r.mrr)], ['Recebido em 30 dias', brl(r.recebido_30d)],
            ['Em teste grátis', String(r.em_teste)], ['Em carência', String(r.em_carencia)],
          ].map(([t, v]) => (
            <div key={t} className="rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-4">
              <p className="text-xs text-[var(--ern-secundario)]">{t}</p><p className="mt-1 text-2xl font-semibold">{v}</p>
            </div>
          ))}
        </div>
      )}

      {teste && (
        <section className="rounded-2xl border border-[var(--ern-destaque)] bg-[var(--ern-painel)] p-4">
          <p className="font-semibold">Conceder teste grátis · {teste.empresa.nome}</p>
          <p className="mt-1 text-xs text-[var(--ern-secundario)]">Uma única vez por empresa e por CNPJ/CPF. Ao terminar, volta ao Grátis sozinho.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select aria-label="Plano do teste" value={teste.plano} onChange={(e) => setTeste({ ...teste, plano: e.target.value })}
              className="min-h-10 rounded-xl border border-[var(--ern-borda)] bg-transparent px-3 text-sm">
              <option value="pro">Pro</option><option value="premium">Plus</option>
            </select>
            <select aria-label="Dias de teste" value={teste.dias} onChange={(e) => setTeste({ ...teste, dias: Number(e.target.value) })}
              className="min-h-10 rounded-xl border border-[var(--ern-borda)] bg-transparent px-3 text-sm">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((d) => <option key={d} value={d}>{d} dia{d > 1 ? 's' : ''}</option>)}
            </select>
            <button type="button" disabled={enviando} onClick={() => void conceder()}
              className="min-h-10 rounded-full bg-[var(--ern-destaque)] px-4 text-xs font-bold text-[#10140f] disabled:opacity-60">Confirmar teste</button>
            <button type="button" onClick={() => setTeste(null)} className="min-h-10 rounded-full border border-[var(--ern-borda)] px-4 text-xs">Cancelar</button>
          </div>
        </section>
      )}

      {dados && (
        <section className="rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--ern-destaque)]">Empresas</p>
          <ul className="mt-2 divide-y divide-[var(--ern-borda)] text-sm">
            {dados.empresas.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{e.nome} <span className="font-normal text-[var(--ern-secundario)]">· {e.plano}</span></p>
                  <p className={`text-xs ${e.inadimplente_desde ? 'text-[var(--ern-erro)]' : 'text-[var(--ern-secundario)]'}`}>
                    {situacao(e)}{e.cidade ? ` · ${e.cidade}` : ''}{!e.tem_documento ? ' · sem CNPJ/CPF' : ''}
                  </p>
                </div>
                {e.status === 'trial'
                  ? <button type="button" onClick={() => void encerrar(e)} className="min-h-10 rounded-full border border-[var(--ern-borda)] px-4 text-xs">Encerrar teste</button>
                  : (e.plano_codigo === 'free' && !e.teste_usado && e.tem_documento)
                    ? <button type="button" onClick={() => setTeste({ empresa: e, plano: 'pro', dias: 8 })} className="min-h-10 rounded-full border border-[var(--ern-destaque)] px-4 text-xs">Dar teste grátis</button>
                    : e.teste_usado ? <span className="text-xs text-[var(--ern-secundario)]">Teste já usado</span> : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {dados && dados.cobrancas.length > 0 && (
        <section className="rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--ern-destaque)]">Últimas cobranças</p>
          <ul className="mt-2 divide-y divide-[var(--ern-borda)] text-sm">
            {dados.cobrancas.map((c, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-3 py-2">
                <span>{c.empresa} · {c.ciclo ?? ''}</span>
                <span>{brl(c.valor)} · {STATUS_COBRANCA[c.status] ?? c.status} · venc. {data(c.vencimento)}{c.pago_em ? ` · pago ${data(c.pago_em)}` : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div></main>
  );
}

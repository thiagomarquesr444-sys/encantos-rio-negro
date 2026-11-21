'use client';

// EDA_NOTAS_ASSINATURA_V1: NFS-e da Encantos sobre as assinaturas Pro/Plus.
// CEO (Comando EDA): Tupã pede o aval de cada nota antes da emissão.
// Operadora: vê as notas autorizadas da própria assinatura (somente leitura).

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { avisarEDA, confirmarEDA } from '@/lib/dialogoEDA';
import { ROTULO_STATUS_NOTA_EDA, type StatusNotaAssinaturaEDA } from '@/lib/notasAssinaturaEDA';

type NotaEDA = {
  id: string;
  valor: number;
  descricao: string;
  status: StatusNotaAssinaturaEDA;
  numero: string | null;
  pdf_url: string | null;
  erro_mensagem: string | null;
  created_at: string;
  empresa: { nome: string | null } | null;
};

const moeda = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
const data = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Manaus' }).format(new Date(iso));
const doMesAtual = (iso: string) => {
  const f = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', timeZone: 'America/Manaus' });
  return f.format(new Date(iso)) === f.format(new Date());
};

const painel =
  'eda-card min-w-0 overflow-hidden rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-3 sm:p-4';
const legenda = 'text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--ern-destaque)]';

function corStatus(s: StatusNotaAssinaturaEDA): string {
  if (s === 'autorizada') return 'text-[var(--ern-sucesso)]';
  if (s === 'erro') return 'text-[var(--ern-erro)]';
  if (s === 'aguardando_aval' || s === 'enviando' || s === 'agendada') return 'text-[var(--ern-alerta)]';
  return 'text-[var(--ern-secundario)]';
}

export default function NotasAssinaturaEDA() {
  const [ceo, setCeo] = useState<boolean | null>(null);
  const [notas, setNotas] = useState<NotaEDA[]>([]);
  const [ocupada, setOcupada] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const { data: ehCeo } = await supabase.rpc('ern_eh_ceo_v1');
    const souCeo = ehCeo === true;
    // O RLS já limita: CEO vê todas; operadora só as autorizadas da própria empresa.
    const { data: linhas } = await supabase
      .from('eda_notas_assinatura_v1')
      .select('id, valor, descricao, status, numero, pdf_url, erro_mensagem, created_at, empresa:empresa_id(nome)')
      .order('created_at', { ascending: false })
      .limit(60);
    setCeo(souCeo);
    setNotas((linhas as unknown as NotaEDA[]) ?? []);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function decidir(nota: NotaEDA, acao: 'emitir' | 'recusar') {
    const ok = await confirmarEDA(
      acao === 'emitir'
        ? `Posso emitir a nota de ${moeda(nota.valor)} para ${nota.empresa?.nome ?? 'esta operadora'}? A emissão é oficial e só pode ser desfeita por cancelamento.`
        : `Marcar a nota de ${moeda(nota.valor)} como não emitida?`,
      { titulo: 'Tupã', confirmar: acao === 'emitir' ? 'Emitir nota' : 'Não emitir', perigo: acao === 'recusar' }
    );
    if (!ok) return;

    setOcupada(nota.id);
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const token = sessao.session?.access_token;
      if (!token) throw new Error('Sua sessão expirou. Entre de novo.');
      const r = await fetch('/api/fiscal/notas-assinatura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nota_id: nota.id, acao }),
      });
      const corpo = (await r.json().catch(() => null)) as { erro?: string } | null;
      if (!r.ok) throw new Error(corpo?.erro ?? 'Não foi possível concluir.');
    } catch (e) {
      await avisarEDA(e instanceof Error ? e.message : 'Não foi possível concluir.', { titulo: 'Tupã' });
    } finally {
      setOcupada(null);
      void carregar();
    }
  }

  if (ceo === null) return null;
  if (!ceo && notas.length === 0) return null;

  const pendentes = notas.filter((n) => n.status === 'aguardando_aval' || n.status === 'erro');
  const doMes = notas.filter((n) => n.status === 'autorizada' && doMesAtual(n.created_at));
  const indicadores = ceo
    ? [
        { rotulo: 'Aguardando aval', valor: String(pendentes.length) },
        { rotulo: 'Autorizadas no mês', valor: String(doMes.length) },
        { rotulo: 'Faturado no mês', valor: moeda(doMes.reduce((s, n) => s + Number(n.valor), 0)) },
        { rotulo: 'Em emissão', valor: String(notas.filter((n) => n.status === 'agendada' || n.status === 'enviando').length) },
      ]
    : [];

  return (
    <section aria-label="Notas da assinatura" className="space-y-3">
      <div className={painel}>
        <span className={legenda}>{ceo ? 'Encantos / notas das assinaturas' : 'Sua assinatura'}</span>
        <h2 className="mt-2 text-lg font-semibold tracking-tight">
          {ceo ? 'Notas fiscais da Encantos' : 'Notas fiscais da sua assinatura'}
        </h2>
        {ceo && (
          <p className="mt-1 text-xs leading-5 text-[var(--ern-secundario)] [text-wrap:pretty]">
            {pendentes.length > 0
              ? `Tupã: ${pendentes.length === 1 ? 'há 1 nota esperando' : `há ${pendentes.length} notas esperando`} o seu aval. Nenhuma nota sai sem a sua confirmação.`
              : 'Tupã: tudo em dia. Quando uma assinatura for paga, eu peço o seu aval aqui.'}
          </p>
        )}
      </div>

      {ceo && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {indicadores.map((i) => (
            <div key={i.rotulo} className={painel}>
              <span className="text-[10px] font-semibold text-[var(--ern-secundario)]">{i.rotulo}</span>
              <strong className="mt-2 block text-xl font-semibold tabular-nums sm:text-2xl">{i.valor}</strong>
            </div>
          ))}
        </div>
      )}

      {notas.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {notas.map((n) => (
            <article key={n.id} className={painel}>
              <div className="flex items-start justify-between gap-2">
                <span className={`text-[10px] font-semibold ${corStatus(n.status)}`}>{ROTULO_STATUS_NOTA_EDA[n.status]}</span>
                <span className="text-[10px] tabular-nums text-[var(--ern-secundario)]">{data(n.created_at)}</span>
              </div>
              {ceo && <p className="mt-2 truncate text-xs font-medium">{n.empresa?.nome ?? 'Operadora'}</p>}
              <strong className="mt-1 block text-base font-semibold tabular-nums">{moeda(n.valor)}</strong>
              {n.numero && <p className="mt-1 text-[11px] text-[var(--ern-secundario)]">Nº {n.numero}</p>}
              {n.status === 'erro' && n.erro_mensagem && (
                <p className="mt-1 line-clamp-3 text-[11px] text-[var(--ern-erro)]">{n.erro_mensagem}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {ceo && (n.status === 'aguardando_aval' || n.status === 'erro') && (
                  <>
                    <button type="button" className="eda-botao text-xs" disabled={ocupada === n.id} onClick={() => void decidir(n, 'emitir')}>
                      {ocupada === n.id ? 'Enviando…' : n.status === 'erro' ? 'Tentar de novo' : 'Emitir'}
                    </button>
                    <button type="button" className="eda-botao text-xs" disabled={ocupada === n.id} onClick={() => void decidir(n, 'recusar')}>
                      Não emitir
                    </button>
                  </>
                )}
                {n.pdf_url && (
                  <a href={n.pdf_url} target="_blank" rel="noopener noreferrer" className="eda-botao text-xs">
                    Ver nota
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

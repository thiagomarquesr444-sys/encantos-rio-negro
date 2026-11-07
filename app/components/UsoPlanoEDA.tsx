'use client';

// EDA_USO_PLANO_V1: a página de Planos conversa com o uso real da operadora.
// Mostra consumo x limite (os limites já são travados no banco), indica o
// menor plano que comporta o uso atual e lista as cobranças da assinatura.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type PlanoResumo = {
  codigo: string; nome: string;
  limite_usuarios: number | null; limite_clientes: number | null;
  limite_reservas_mes: number | null; limite_passeios: number | null;
  precos?: Partial<Record<string, { valor: number | null }>>;
};
type Uso = { chave: keyof Omit<PlanoResumo, 'codigo' | 'nome'>; rotulo: string; total: number; limite: number | null };
type Cobranca = { id: string; status: string | null; valor: number | string | null; vencimento: string | null; pago_em: string | null; ciclo_cobranca: string | null };

const moeda = (v: unknown) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (d?: string | null) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '—');
const STATUS_COBRANCA: Record<string, string> = {
  pending: 'Aguardando', pendente: 'Aguardando', received: 'Paga', confirmed: 'Paga', pago: 'Paga', paga: 'Paga',
  overdue: 'Vencida', vencida: 'Vencida', refunded: 'Estornada', cancelada: 'Cancelada', canceled: 'Cancelada',
};

export default function UsoPlanoEDA({ planos, atual }: { planos: PlanoResumo[]; atual?: string }) {
  const [uso, setUso] = useState<Uso[] | null>(null);
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    (async () => {
      const [u, c, r, p, cob] = await Promise.all([
        supabase.rpc('get_meu_uso_usuarios'),
        supabase.rpc('get_meu_uso_clientes'),
        supabase.rpc('get_meu_uso_reservas_mes'),
        supabase.rpc('get_meu_uso_passeios'),
        supabase.from('cobrancas_assinaturas').select('id,status,valor,vencimento,pago_em,ciclo_cobranca')
          .order('vencimento', { ascending: false }).limit(12),
      ]);
      if (!ativo) return;
      if (u.error || c.error || r.error || p.error) { setErro('Não foi possível consultar o uso do plano.'); return; }
      const primeira = (x: { data: unknown }) => (Array.isArray(x.data) ? x.data[0] : x.data) as Record<string, unknown> | undefined;
      const lim = (v: unknown, ilimitado: unknown) => (ilimitado === true || v === null || v === undefined ? null : Number(v));
      const U = primeira(u), C = primeira(c), R = primeira(r), P = primeira(p);
      setUso([
        { chave: 'limite_usuarios', rotulo: 'Usuários da equipe', total: Number(U?.total_usuarios) || 0, limite: lim(U?.limite_usuarios, U?.ilimitado) },
        { chave: 'limite_clientes', rotulo: 'Clientes', total: Number(C?.total_clientes) || 0, limite: lim(C?.limite_clientes, C?.ilimitado) },
        { chave: 'limite_reservas_mes', rotulo: 'Reservas neste mês', total: Number(R?.total_reservas_mes) || 0, limite: lim(R?.limite_reservas_mes, R?.ilimitado) },
        { chave: 'limite_passeios', rotulo: 'Passeios', total: Number(P?.total_passeios) || 0, limite: lim(P?.limite_passeios, P?.ilimitado) },
      ]);
      setCobrancas(cob.error ? [] : (cob.data as Cobranca[]));
    })();
    return () => { ativo = false; };
  }, []);

  if (erro) return <p role="alert" className="mb-8 text-sm text-[var(--ern-erro)]">{erro}</p>;
  if (!uso) return <p role="status" className="mb-8 text-sm text-[var(--ern-secundario)]">Consultando o uso do plano…</p>;

  // Menor plano (na ordem do catálogo) que comporta o uso atual com 20% de folga.
  const cabe = (pl: PlanoResumo) => uso.every(x => pl[x.chave] === null || (pl[x.chave] as number) >= Math.ceil(x.total * 1.2));
  const preco = (pl: PlanoResumo) => pl.precos?.mensal?.valor ?? Number.POSITIVE_INFINITY;
  const indicado = [...planos].sort((a, b) => preco(a) - preco(b)).find(cabe);
  const perto = uso.filter(x => x.limite !== null && x.limite > 0 && x.total / x.limite >= 0.8);

  return (
    <section aria-label="Uso do plano" className="mb-9 rounded-[24px] border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-5 md:p-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--ern-destaque)]">Uso da operadora</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {uso.map(x => {
          const pct = x.limite ? Math.min(100, Math.round((x.total / x.limite) * 100)) : 0;
          const cor = x.limite === null ? '#60C7A0' : pct >= 100 ? '#EF827B' : pct >= 80 ? '#E3A144' : '#60C7A0';
          return (
            <div key={x.chave} className="rounded-xl border border-[var(--ern-borda)] p-3">
              <p className="text-[11px] text-[var(--ern-secundario)]">{x.rotulo}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{x.total}<span className="text-xs font-normal text-[var(--ern-secundario)]"> / {x.limite === null ? 'ilimitado' : x.limite}</span></p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={x.limite === null ? undefined : pct} aria-label={x.rotulo}>
                <div className="h-full rounded-full" style={{ width: x.limite === null ? '100%' : `${pct}%`, background: cor, opacity: x.limite === null ? 0.35 : 1 }} />
              </div>
            </div>
          );
        })}
      </div>

      {perto.length > 0 && (
        <p className="mt-4 rounded-xl border border-[#E3A144]/50 p-3 text-xs">
          Perto do limite: {perto.map(x => `${x.rotulo.toLowerCase()} (${x.total}/${x.limite})`).join(', ')}. Ao atingir o limite, novos cadastros são bloqueados até mudar de plano.
        </p>
      )}
      {indicado && (
        <p className="mt-3 text-xs text-[var(--ern-secundario)]">
          {indicado.codigo === atual
            ? 'Seu plano atual comporta o uso de hoje com folga.'
            : <>Pelo uso de hoje (com 20% de folga), o plano que atende é o <strong className="text-[var(--ern-texto)]">{indicado.nome}</strong>.</>}
        </p>
      )}

      {cobrancas.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold">Cobranças da assinatura</p>
          <ul className="mt-2 divide-y divide-white/[0.07] text-xs">
            {cobrancas.map(c => {
              const st = STATUS_COBRANCA[String(c.status ?? '').toLowerCase()] ?? (c.status ?? '—');
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>Vencimento {dataBR(c.vencimento)}{c.ciclo_cobranca ? ` · ${c.ciclo_cobranca}` : ''}</span>
                  <span className="tabular-nums">{moeda(c.valor)} · <strong className={st === 'Paga' ? 'text-emerald-300' : st === 'Vencida' ? 'text-rose-300' : ''}>{st}</strong>{c.pago_em ? ` em ${dataBR(c.pago_em)}` : ''}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

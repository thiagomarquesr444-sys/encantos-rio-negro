'use client';

// EDA_VOUCHERS_PARCEIROS_V1: conferência pública do voucher (embarque, hotel,
// parceiro). Mostra só o necessário: situação, passeio, data e pessoas.

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Verificacao = {
  codigo: string; situacao: 'valido' | 'vencido' | 'utilizado' | 'cancelado' | 'substituido'; versao?: number | null; titular: string | null;
  passeio: string | null; data: string | null; horario: string | null; pessoas: number | null;
  validade: string | null; utilizado_em: string | null; operadora: string | null; cancelamento?: string | null;
};

const SITUACAO = {
  valido: { titulo: 'Voucher válido', cor: '#22c55e' },
  vencido: { titulo: 'Voucher vencido', cor: '#f59e0b' },
  utilizado: { titulo: 'Voucher já utilizado', cor: '#f59e0b' },
  cancelado: { titulo: 'Voucher cancelado', cor: '#ef4444' },
  substituido: { titulo: 'Voucher substituído por nova versão', cor: '#38bdf8' },
} as const;

const data = (d?: string | null) => (d ? d.split('-').reverse().join('/') : '—');

export default function VerificarVoucherPage() {
  const params = useParams();
  const bruto = params?.token;
  const token = (Array.isArray(bruto) ? bruto[0] : bruto) ?? '';
  const [v, setV] = useState<Verificacao | null | undefined>(undefined);

  useEffect(() => {
    supabase.rpc('verificar_voucher_eda', { p_token: token })
      .then(({ data: d, error }) => setV(error ? null : ((d ?? null) as Verificacao | null)));
  }, [token]);

  const s = v ? SITUACAO[v.situacao] : null;

  return (
    <main className="vv">
      <p className="vv-eb">Encantos da Amazônia · Verificação</p>
      {v === undefined && <p>Conferindo…</p>}
      {v === null && (<><h1>Voucher não encontrado</h1><p className="vv-mut">Confira o link ou o código com a operadora.</p></>)}
      {v && s && (
        <>
          <div className="vv-selo" style={{ borderColor: s.cor, color: s.cor }}>
            <span aria-hidden="true">{v.situacao === 'valido' ? '✓' : '!'}</span>{s.titulo}
          </div>
          <dl>
            <div><dt>Passeio</dt><dd>{v.passeio || '—'}</dd></div>
            <div><dt>Data</dt><dd>{data(v.data)}{v.horario ? ` · ${v.horario.slice(0, 5)}` : ''}</dd></div>
            <div><dt>Pessoas</dt><dd>{v.pessoas ?? '—'}</dd></div>
            <div><dt>Titular</dt><dd>{v.titular || '—'}</dd></div>
            <div><dt>Validade</dt><dd>{data(v.validade)}</dd></div>
            {v.utilizado_em && <div><dt>Utilizado em</dt><dd>{new Date(v.utilizado_em).toLocaleString('pt-BR')}</dd></div>}
            <div><dt>Operadora</dt><dd>{v.operadora || '—'}</dd></div>
            <div><dt>Código</dt><dd className="vv-cod">{v.codigo}</dd></div>
          </dl>
          {v.cancelamento && <p className="vv-mut"><strong>Cancelamento:</strong> {v.cancelamento}</p>}
          <p className="vv-mut">Esta página confirma apenas a situação do voucher. Em caso de dúvida, fale com a operadora.</p>
        </>
      )}
      <style jsx global>{`
        body:has(.vv) { background: #0b1713; }
        .vv { max-width: 520px; margin: 0 auto; padding: 40px 18px; min-height: 100dvh; color: #edede3; font-size: 15px; line-height: 1.6; }
        .vv-eb { margin: 0 0 16px; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #e3a144; font-weight: 700; }
        .vv-selo { display: flex; align-items: center; gap: 12px; padding: 16px 18px; border-radius: 18px; border: 2px solid; font-size: 22px; font-weight: 800; }
        .vv-selo span { font-size: 28px; }
        .vv dl { margin: 18px 0; display: grid; gap: 8px; }
        .vv dl div { display: flex; justify-content: space-between; gap: 12px; padding: 10px 14px; border-radius: 12px; border: 1px solid rgb(237 237 227 / 14%); }
        .vv dt { color: #a9bdb2; } .vv dd { margin: 0; text-align: right; font-weight: 600; }
        .vv-cod { font-size: 11px; word-break: break-all; }
        .vv-mut { color: #a9bdb2; font-size: 13px; }
      `}</style>
    </main>
  );
}

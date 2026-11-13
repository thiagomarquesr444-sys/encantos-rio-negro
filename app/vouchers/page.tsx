'use client';
// EDA_VOUCHER_NA_RESERVA_V1: "Embarques do dia". O voucher nasce e é cuidado
// na reserva; aqui o operador só confere e faz o check-in no porto.
import '@/app/components/padrao-paginas-eda.css';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAoVivoEDA } from '@/lib/aoVivoEDA';
import { BuscaEDA, CabecalhoEDA, PaginaEDA, PillEDA, VazioEDA, type TomEDA } from '@/app/components/PadraoPaginaEDA';
import {
  CAMPOS_VOUCHER_EDA, baixarPDFVoucherEDA, checkinVoucherEDA, dataBR, hojeManausEDA, mensagemVoucherEDA, moedaBR,
  situacaoVoucherEDA, type SituacaoVoucherEDA, type VoucherEDA,
} from '@/lib/voucherTuristaEDA';

const TOM: Record<SituacaoVoucherEDA, TomEDA> = { Ativo: 'ok', Utilizado: 'info', Cancelado: 'er', Substituído: 'nt', Expirado: 'at' };
const sem = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

function somarDias(data: string, dias: number) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export default function EmbarquesDoDiaPage() {
  const [data, setData] = useState(hojeManausEDA);
  const [busca, setBusca] = useState('');
  const [lista, setLista] = useState<VoucherEDA[] | null>(null);
  const [porCodigo, setPorCodigo] = useState<VoucherEDA[] | null>(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const hoje = hojeManausEDA();

  const carregar = useCallback(async () => {
    setErro('');
    const { data: d, error } = await supabase.from('vouchers').select(CAMPOS_VOUCHER_EDA)
      .eq('data_passeio', data).in('status', ['Ativo', 'Utilizado', 'valido'])
      .order('horario_passeio', { ascending: true, nullsFirst: false }).limit(500);
    if (error) { setErro('Não foi possível carregar os embarques.'); setLista([]); return; }
    setLista((d ?? []) as unknown as VoucherEDA[]);
  }, [data]);

  useEffect(() => { setLista(null); void carregar(); }, [carregar]);
  useAoVivoEDA(['vouchers'], () => void carregar());

  // Conferência rápida pelo código (turista mostra o voucher no porto).
  useEffect(() => {
    const codigo = busca.trim().toUpperCase();
    if (!/^EDA-[0-9A-F]{4,}$/.test(codigo)) { setPorCodigo(null); return; }
    let ativo = true;
    void supabase.from('vouchers').select(CAMPOS_VOUCHER_EDA).ilike('codigo', `${codigo}%`).limit(10)
      .then(({ data: d }) => { if (ativo) setPorCodigo((d ?? []) as unknown as VoucherEDA[]); });
    return () => { ativo = false; };
  }, [busca]);

  const filtrados = useMemo(() => {
    if (porCodigo) return porCodigo;
    const t = sem(busca);
    return (lista ?? []).filter((v) => !t || sem(`${v.codigo} ${v.cliente_nome ?? ''} ${v.passeio_nome ?? ''}`).includes(t));
  }, [lista, porCodigo, busca]);

  const aEmbarcar = (lista ?? []).filter((v) => situacaoVoucherEDA(v, data) === 'Ativo');
  const feitos = (lista ?? []).filter((v) => situacaoVoucherEDA(v, data) === 'Utilizado');
  const pessoas = aEmbarcar.reduce((n, v) => n + (v.snapshot?.passageiros?.length || v.quantidade_pessoas || 0), 0);
  const saldo = aEmbarcar.reduce((n, v) => n + Number(v.snapshot?.financeiro?.saldo ?? 0), 0);

  async function acao(v: VoucherEDA, tipo: 'checkin' | 'pdf') {
    if (ocupado) return;
    setOcupado(v.id); setErro(''); setAviso('');
    try {
      if (tipo === 'pdf') await baixarPDFVoucherEDA(v);
      else if (await checkinVoucherEDA(v)) { setAviso(`Check-in de ${v.cliente_nome ?? v.codigo} registrado.`); await carregar(); }
    } catch (e) { setErro(mensagemVoucherEDA(e)); } finally { setOcupado(null); }
  }

  return (
    <PaginaEDA className="eda-pg-auto">
      <div className="eda-pg-miolo" style={{ maxWidth: 1200 }}>
        <CabecalhoEDA
          capa
          etiqueta="Operação · Embarques do dia"
          titulo="Embarques do dia"
          resumo="Confira o voucher do turista e faça o check-in no embarque. Os vouchers são emitidos e cuidados dentro de cada reserva."
          acoes={<>
            <button type="button" className="eda-pg-bt" onClick={() => setData((d) => somarDias(d, -1))}>← Dia anterior</button>
            <input type="date" aria-label="Data do embarque" className="eda-pg-bt" value={data} onChange={(e) => e.target.value && setData(e.target.value)} />
            <button type="button" className="eda-pg-bt" onClick={() => setData((d) => somarDias(d, 1))}>Próximo dia →</button>
            {data !== hoje && <button type="button" className="eda-pg-bt eda-pg-bt-ouro" onClick={() => setData(hoje)}>Hoje</button>}
          </>}
        />

        <div className="eda-pg-atalhos" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginTop: 16 }}>
          <div className="eda-pg-bloco" style={{ marginTop: 0 }}><p className="eda-pg-bloco-titulo">A embarcar</p><b style={{ fontSize: 26 }}>{aEmbarcar.length}</b></div>
          <div className="eda-pg-bloco" style={{ marginTop: 0 }}><p className="eda-pg-bloco-titulo">Passageiros</p><b style={{ fontSize: 26 }}>{pessoas}</b></div>
          <div className="eda-pg-bloco" style={{ marginTop: 0 }}><p className="eda-pg-bloco-titulo">Check-in feito</p><b style={{ fontSize: 26 }}>{feitos.length}</b></div>
          <div className="eda-pg-bloco" style={{ marginTop: 0 }}><p className="eda-pg-bloco-titulo">Saldo a receber no embarque</p><b style={{ fontSize: 26, color: saldo > 0 ? 'var(--p-amar)' : undefined }}>{moedaBR(saldo)}</b></div>
        </div>

        <div style={{ marginTop: 16 }}>
          <BuscaEDA id="busca-embarque" rotulo="Buscar" valor={busca} aoMudar={setBusca} placeholder="Nome do titular, passeio ou código do voucher (EDA-…)" />
          {porCodigo && <p className="eda-pg-texto-mut" style={{ marginTop: 6 }}>Resultado pelo código, em qualquer data.</p>}
        </div>

        {aviso && <p role="status" style={{ marginTop: 12, color: 'var(--p-verde)' }}>{aviso}</p>}
        {erro && <p role="alert" style={{ marginTop: 12, color: 'var(--p-verm)' }}>{erro}</p>}

        <section style={{ marginTop: 16, display: 'grid', gap: 12 }} aria-busy={lista === null}>
          {lista === null && <p className="eda-pg-texto-mut">Carregando embarques…</p>}
          {lista !== null && filtrados.length === 0 && (
            <VazioEDA titulo={data === hoje ? 'Nenhum embarque hoje' : `Nenhum embarque em ${dataBR(data)}`}
              texto="Os vouchers aparecem aqui na data do passeio. Para emitir, abra a reserva confirmada com sinal ou pagamento."
              acao={<Link href="/reservas" className="eda-pg-bt">Ir para Reservas</Link>} />
          )}
          {filtrados.map((v) => {
            const sit = situacaoVoucherEDA(v, data);
            const f = v.snapshot?.financeiro;
            const pax = v.snapshot?.passageiros ?? [];
            return (
              <article key={v.id} className="eda-pg-bloco" style={{ marginTop: 0 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{v.cliente_nome ?? 'Titular não informado'}</p>
                    <p className="eda-pg-texto-mut" style={{ margin: '2px 0 0' }}>
                      {v.passeio_nome ?? 'Passeio'} · {dataBR(v.data_passeio)}{v.horario_passeio ? ` · ${v.horario_passeio.slice(0, 5)}` : ''} · {v.codigo}
                    </p>
                  </div>
                  <PillEDA tom={TOM[sit]}>{sit === 'Utilizado' ? 'Check-in feito' : sit === 'Ativo' ? 'A embarcar' : sit}</PillEDA>
                </div>
                <div className="eda-pg-linha-valor" style={{ marginTop: 10 }}><span>Passageiros</span><b>{pax.length ? pax.map((p) => p.nome).join(', ') : (v.quantidade_pessoas ?? '—')}</b></div>
                {v.snapshot?.passeio?.ponto_embarque && <div className="eda-pg-linha-valor"><span>Embarque</span><b>{v.snapshot.passeio.ponto_embarque}</b></div>}
                {f && <div className="eda-pg-linha-valor"><span>Saldo no embarque</span><b style={{ color: f.saldo > 0 ? 'var(--p-amar)' : 'var(--p-verde)' }}>{f.saldo > 0 ? moedaBR(f.saldo) : 'Quitado'}</b></div>}
                {v.snapshot?.fichas && v.snapshot.fichas.participantes > v.snapshot.fichas.preenchidas && (
                  <p style={{ marginTop: 8, fontSize: 13, color: 'var(--p-amar)' }}>Fichas de saúde: {v.snapshot.fichas.preenchidas} de {v.snapshot.fichas.participantes} preenchidas.</p>
                )}
                {v.reserva_alterada_em && sit === 'Ativo' && <p style={{ marginTop: 8, fontSize: 13, color: 'var(--p-amar)' }}>A reserva mudou depois da emissão. Confira na reserva antes do embarque.</p>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {sit === 'Ativo' && <button type="button" className="eda-pg-bt eda-pg-bt-ouro" disabled={!!ocupado} onClick={() => void acao(v, 'checkin')}>{ocupado === v.id ? 'Registrando…' : 'Fazer check-in'}</button>}
                  <button type="button" className="eda-pg-bt" disabled={!!ocupado} onClick={() => void acao(v, 'pdf')}>Ver PDF</button>
                  {v.reserva_id && <Link href={`/reservas/editar/${encodeURIComponent(v.reserva_id)}`} className="eda-pg-bt">Abrir reserva</Link>}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </PaginaEDA>
  );
}

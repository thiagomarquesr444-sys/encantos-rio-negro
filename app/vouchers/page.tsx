'use client';
// EDA_VOUCHER_NA_RESERVA_V1: "Embarques do dia". O voucher nasce e é cuidado
// na reserva; aqui o operador só confere e faz o check-in no porto.
import '@/app/components/padrao-paginas-eda.css';
import './embarques-eda.css';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAoVivoEDA } from '@/lib/aoVivoEDA';
import { BuscaEDA, CabecalhoEDA, PaginaEDA, PillEDA, VazioEDA, type TomEDA } from '@/app/components/PadraoPaginaEDA';
import CartaoMagneticoEDA from '@/app/components/CartaoMagneticoEDA';
import {
  CAMPOS_VOUCHER_EDA, baixarPDFVoucherEDA, checkinVoucherEDA, dataBR, hojeManausEDA, mensagemVoucherEDA, moedaBR,
  situacaoVoucherEDA, type SituacaoVoucherEDA, type VoucherEDA,
} from '@/lib/voucherTuristaEDA';

const TOM: Record<SituacaoVoucherEDA, TomEDA> = { Ativo: 'ok', Utilizado: 'info', Cancelado: 'er', Substituído: 'nt', Expirado: 'at' };
const sem = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

// EDA_EMBARQUES_PREMIUM_V1: foto regional conforme o tipo do passeio (fotos locais do app).
const FOTOS: [RegExp, string][] = [
  [/pesca|tucunar|peixe/, '/images/regiao/mulhertucunare.png.jpeg'],
  [/praia|banho/, '/images/regiao/barcelospraia.png.jpeg'],
  [/serra|aracá|araca|trilha|cachoeira/, '/images/regiao/serra.png.jpeg'],
  [/ilha|arquip|mariu/, '/images/regiao/ilha.png.jpeg'],
  [/cultur|festival|cidade|matriz/, '/images/regiao/matriz.png.jpeg'],
  [/ave|arara|fauna|boto|bicho/, '/images/regiao/arara.jpg.jpeg'],
];
const FOTOS_PADRAO = ['/images/regiao/viagembarco.png.jpeg', '/images/regiao/aracu.png.jpeg', '/images/regiao/ern-amazonia.jpg'];
function fotoPasseio(nome: string | null | undefined, i: number, real?: string) {
  if (real) return real;
  const t = sem(nome ?? '');
  return FOTOS.find(([r]) => r.test(t))?.[1] ?? FOTOS_PADRAO[i % FOTOS_PADRAO.length];
}

const Ic = ({ d }: { d: string }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

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

  // EDA_EMBARQUES_FOTO_REAL_V1: foto real do passeio cadastrado (voucher → passeio,
  // ou reserva → passeio). Sem foto cadastrada, usa a foto regional.
  const [fotosReais, setFotosReais] = useState<Record<string, string>>({});
  const todos = useMemo(() => [...(lista ?? []), ...(porCodigo ?? [])], [lista, porCodigo]);
  const chaveFotos = todos.map((v) => v.id).sort().join(',');
  useEffect(() => {
    if (!todos.length) return;
    let ativo = true;
    void (async () => {
      try {
        const ids = todos.map((v) => v.id);
        const { data: vs } = await supabase.from('vouchers').select('id,passeio_id,reserva_id').in('id', ids);
        const linhas = (vs ?? []) as { id: string; passeio_id: string | null; reserva_id: string | null }[];
        const semPasseio = linhas.filter((l) => !l.passeio_id && l.reserva_id).map((l) => l.reserva_id as string);
        const porReserva: Record<string, string> = {};
        if (semPasseio.length) {
          const { data: rs } = await supabase.from('reservas').select('id,passeio_id').in('id', [...new Set(semPasseio)]);
          for (const r of (rs ?? []) as { id: string; passeio_id: string | null }[]) if (r.passeio_id) porReserva[r.id] = r.passeio_id;
        }
        const passeioDoVoucher: Record<string, string> = {};
        for (const l of linhas) {
          const pid = l.passeio_id ?? (l.reserva_id ? porReserva[l.reserva_id] : undefined);
          if (pid) passeioDoVoucher[l.id] = pid;
        }
        const pids = [...new Set(Object.values(passeioDoVoucher))];
        if (!pids.length || !ativo) return;
        const { data: ps } = await supabase.from('passeios').select('id,fotos,foto_url').in('id', pids);
        const fotoDoPasseio: Record<string, string> = {};
        for (const p of (ps ?? []) as { id: string; fotos: string[] | null; foto_url: string | null }[]) {
          const url = (p.fotos ?? []).find((u) => typeof u === 'string' && /^https:\/\//.test(u)) ?? (p.foto_url && /^https:\/\//.test(p.foto_url) ? p.foto_url : '');
          if (url) fotoDoPasseio[p.id] = url;
        }
        const mapa: Record<string, string> = {};
        for (const [vid, pid] of Object.entries(passeioDoVoucher)) if (fotoDoPasseio[pid]) mapa[vid] = fotoDoPasseio[pid];
        if (ativo) setFotosReais((atual) => ({ ...atual, ...mapa }));
      } catch {
        // Sem foto real: segue a foto regional.
      }
    })();
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveFotos]);

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
  const proxima = aEmbarcar.find((v) => v.horario_passeio) ?? aEmbarcar[0];
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

        <CartaoMagneticoEDA as="section" forca={3} className="eda-emb-porto" aria-label="Resumo do porto">
          <div className="eda-emb-porto-img">
            <img src="/images/regiao/viagembarco.png.jpeg" alt="" loading="eager" />
            <div className="eda-emb-porto-txt">
              <small>Porto · {data === hoje ? 'Hoje' : dataBR(data)}</small>
              <b>{aEmbarcar.length ? `${aEmbarcar.length} ${aEmbarcar.length === 1 ? 'embarque' : 'embarques'} pelas águas da Amazônia` : feitos.length ? 'Todos embarcaram. Boa viagem!' : 'Sem saídas neste dia'}</b>
            </div>
          </div>
          <div className="eda-emb-prox">
            <p className="eda-emb-rot">Próxima saída</p>
            <p className="eda-emb-hora">{proxima?.horario_passeio ? proxima.horario_passeio.slice(0, 5) : '—'}</p>
            <p className="eda-emb-sub">{proxima ? `${proxima.passeio_nome ?? 'Passeio'} · ${proxima.cliente_nome ?? proxima.codigo}` : 'Nenhum embarque pendente.'}</p>
            {proxima?.snapshot?.passeio?.ponto_embarque && <p className="eda-emb-sub">Embarque: {proxima.snapshot.passeio.ponto_embarque}</p>}
          </div>
        </CartaoMagneticoEDA>

        <div className="eda-emb-kpis">
          {([
            ['A embarcar', String(aEmbarcar.length), 'var(--p-ouro)', 'M3 18h18M5 18l2-7h10l2 7M9 11V6h6v5'],
            ['Passageiros', String(pessoas), 'var(--p-azul)', 'M16 19v-1a4 4 0 0 0-8 0v1M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6'],
            ['Check-in feito', String(feitos.length), 'var(--p-verde)', 'M5 12l4 4L19 6'],
            ['Saldo a receber no embarque', moedaBR(saldo), saldo > 0 ? 'var(--p-amar)' : 'var(--p-verde)', 'M12 3v18M16 7H10a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H8'],
          ] as const).map(([rot, val, cor, d]) => (
            <CartaoMagneticoEDA key={rot} forca={3} className="eda-emb-kpi" style={{ ['--k' as string]: cor }}>
              <span className="eda-emb-kpi-ic"><Ic d={d} /></span>
              <p>{rot}</p>
              <b style={rot.startsWith('Saldo') && saldo > 0 ? { color: 'var(--p-amar)' } : undefined}>{val}</b>
            </CartaoMagneticoEDA>
          ))}
        </div>

        <div style={{ marginTop: 16 }}>
          <BuscaEDA id="busca-embarque" rotulo="Buscar" valor={busca} aoMudar={setBusca} placeholder="Nome do titular, passeio ou código do voucher (EDA-…)" />
          {porCodigo && <p className="eda-pg-texto-mut" style={{ marginTop: 6 }}>Resultado pelo código, em qualquer data.</p>}
        </div>

        {aviso && <p role="status" style={{ marginTop: 12, color: 'var(--p-verde)' }}>{aviso}</p>}
        {erro && <p role="alert" style={{ marginTop: 12, color: 'var(--p-verm)' }}>{erro}</p>}

        <section className="eda-emb-lista" aria-busy={lista === null}>
          {lista === null && <p className="eda-pg-texto-mut">Carregando embarques…</p>}
          {lista !== null && filtrados.length === 0 && (
            <VazioEDA titulo={data === hoje ? 'Nenhum embarque hoje' : `Nenhum embarque em ${dataBR(data)}`}
              texto="Os vouchers aparecem aqui na data do passeio. Para emitir, abra a reserva confirmada com sinal ou pagamento."
              acao={<Link href="/reservas" className="eda-pg-bt">Ir para Reservas</Link>} />
          )}
          {filtrados.map((v, i) => {
            const sit = situacaoVoucherEDA(v, data);
            const f = v.snapshot?.financeiro;
            const pax = v.snapshot?.passageiros ?? [];
            return (
              <CartaoMagneticoEDA as="article" key={v.id} forca={3} className="eda-emb-card" data-feito={sit === 'Utilizado' ? '1' : undefined}>
                <div className="eda-emb-foto">
                  <img src={fotoPasseio(v.passeio_nome, i, fotosReais[v.id])} alt="" loading="lazy" referrerPolicy="no-referrer" />
                  <span className="eda-emb-foto-hora"><small>Saída</small>{v.horario_passeio ? v.horario_passeio.slice(0, 5) : 'A confirmar'}</span>
                </div>
                <div className="eda-emb-corpo">
                  <div className="eda-emb-topo">
                    <div style={{ minWidth: 0 }}>
                      <p className="eda-emb-nome">{v.cliente_nome ?? 'Titular não informado'}</p>
                      <p className="eda-emb-meta">{v.passeio_nome ?? 'Passeio'} · {dataBR(v.data_passeio)}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="eda-emb-cod">{v.codigo}</span>
                      <PillEDA tom={TOM[sit]}>{sit === 'Utilizado' ? 'Check-in feito' : sit === 'Ativo' ? 'A embarcar' : sit}</PillEDA>
                    </div>
                  </div>
                  <div className="eda-emb-dados">
                    <div className="eda-emb-dado"><span>Passageiros</span><b>{pax.length ? pax.map((p) => p.nome).join(', ') : (v.quantidade_pessoas ?? '—')}</b></div>
                    {v.snapshot?.passeio?.ponto_embarque && <div className="eda-emb-dado"><span>Embarque</span><b>{v.snapshot.passeio.ponto_embarque}</b></div>}
                    {v.snapshot?.passeio?.embarcacao && <div className="eda-emb-dado"><span>Embarcação</span><b>{v.snapshot.passeio.embarcacao}</b></div>}
                    {v.snapshot?.passeio?.guia && <div className="eda-emb-dado"><span>Guia</span><b>{v.snapshot.passeio.guia}</b></div>}
                    {f && <div className="eda-emb-dado"><span>Saldo no embarque</span><b style={{ color: f.saldo > 0 ? 'var(--p-amar)' : 'var(--p-verde)' }}>{f.saldo > 0 ? moedaBR(f.saldo) : 'Quitado'}</b></div>}
                  </div>
                  {v.snapshot?.fichas && v.snapshot.fichas.participantes > v.snapshot.fichas.preenchidas && (
                    <p className="eda-emb-alerta">Fichas de saúde: {v.snapshot.fichas.preenchidas} de {v.snapshot.fichas.participantes} preenchidas.</p>
                  )}
                  {v.reserva_alterada_em && sit === 'Ativo' && <p className="eda-emb-alerta">A reserva mudou depois da emissão. Confira na reserva antes do embarque.</p>}
                  <div className="eda-emb-acoes">
                    {sit === 'Ativo' && <button type="button" className="eda-pg-bt eda-pg-bt-ouro" disabled={!!ocupado} onClick={() => void acao(v, 'checkin')}>{ocupado === v.id ? 'Registrando…' : 'Fazer check-in'}</button>}
                    <button type="button" className="eda-pg-bt" disabled={!!ocupado} onClick={() => void acao(v, 'pdf')}>Ver PDF</button>
                    {v.reserva_id && <Link href={`/reservas/editar/${encodeURIComponent(v.reserva_id)}`} className="eda-pg-bt">Abrir reserva</Link>}
                  </div>
                </div>
              </CartaoMagneticoEDA>
            );
          })}
        </section>
      </div>
    </PaginaEDA>
  );
}

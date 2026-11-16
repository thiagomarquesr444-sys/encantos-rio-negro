'use client';

// EDA_PRONTIDAO_V1 (modo véspera): prontidão de cada saída dos próximos 7 dias.
// Confere reservas, pagamento, participantes, fichas, voucher, guia, barco,
// demanda e materiais. Quanto mais perto do dia, mais firme o aviso; na véspera
// ele fica fixo até resolver ou até a pessoa dispensar com justificativa.
// Só lê dados da própria empresa (RLS) e não mostra dado pessoal de cliente.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAoVivoEDA } from '@/lib/aoVivoEDA';
import './prontidao-eda.css';

type Saida = { id: string; passeio_id: string | null; data_inicio: string; horario: string | null; vagas_total: number | null; status: string | null };
type Reserva = { id: string; saida_id: string | null; status: string | null; quantidade_pessoas: number | null; embarcacao_id: string | null; guia_id: string | null; guia: string | null };
type Demanda = { id: string; saida_id: string | null; status: string | null; pessoas_estimadas: number | null; publico_alvo: string | null; saude_preparada_em: string | null; demanda_itens: { situacao: string | null }[] | null };
type Alerta = { saida_id: string | null; reserva_id: string | null; graves: number | null; pendentes: number | null };
type Barco = { id: string; nome: string | null; capacidade: number | null; status: string | null };
type Aberto = { chave: string; texto: string; href: string; acao: string };
type Cartao = { id: string; passeio: string; data: string; horario: string | null; dias: number; pessoas: number; vagas: number | null; total: number; abertos: Aberto[] };
type Dispensas = Record<string, { dia: string; motivo: string }>;

const CHAVE_DISPENSA = 'eda.prontidao.dispensa.v1';
const NENHUM = '00000000-0000-0000-0000-000000000000';
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const diasEntre = (de: string, ate: string) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);
const somarDias = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function lerDispensas(): Dispensas {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE_DISPENSA) || '{}') as unknown;
    return v && typeof v === 'object' ? (v as Dispensas) : {};
  } catch { return {}; }
}

export default function ProntidaoSaidasEDA({ hoje, financeiroLiberado }: { hoje: string; financeiroLiberado: boolean }) {
  const [cartoes, setCartoes] = useState<Cartao[] | null>(null);
  const [dispensas, setDispensas] = useState<Dispensas>({});
  const [justificando, setJustificando] = useState('');
  const [motivo, setMotivo] = useState('');
  const [revisao, setRevisao] = useState(0);
  useAoVivoEDA(['reservas', 'passeio_saidas', 'demandas', 'demanda_itens', 'vouchers', 'financeiro', 'reserva_participantes'], () => setRevisao((r) => r + 1));

  useEffect(() => { setDispensas(lerDispensas()); }, []);

  const carregar = useCallback(async (): Promise<Cartao[]> => {
    const { data: sd, error } = await supabase.from('passeio_saidas')
      .select('id,passeio_id,data_inicio,horario,vagas_total,status')
      .gte('data_inicio', hoje).lte('data_inicio', somarDias(hoje, 7)).order('data_inicio').limit(6);
    if (error) return [];
    let saidas = ((sd ?? []) as unknown as Saida[]).filter((s) => !/cancel|encerr/i.test(s.status ?? ''));
    if (!saidas.length) return [];
    // EDA_SAIDA_PARTIU_PAINEL_V1: depois do embarque o aviso de prontidão sai; o acompanhamento é na Operação ao vivo.
    const { data: fs } = await supabase.rpc('eda_saidas_operacao', { p_ids: saidas.map((s) => s.id) });
    const jaSaiu = new Set(((fs ?? []) as { saida_id: string; fase: string }[]).filter((f) => f.fase !== 'programada').map((f) => f.saida_id));
    saidas = saidas.filter((s) => !jaSaiu.has(s.id));
    if (!saidas.length) return [];
    const ids = saidas.map((s) => s.id);
    const passeioIds = Array.from(new Set(saidas.map((s) => s.passeio_id).filter((x): x is string => !!x)));
    const [ps, rs, ds, al] = await Promise.all([
      supabase.from('passeios').select('id,nome').in('id', passeioIds.length ? passeioIds : [NENHUM]),
      supabase.from('reservas').select('id,saida_id,status,quantidade_pessoas,embarcacao_id,guia_id,guia').in('saida_id', ids),
      supabase.from('demandas').select('id,saida_id,status,pessoas_estimadas,publico_alvo,saude_preparada_em,demanda_itens(situacao)').in('saida_id', ids),
      supabase.rpc('alertas_proximas_viagens_eda', { p_dias: 8 }),
    ]);
    const nomes = new Map(((ps.data ?? []) as unknown as { id: string; nome: string | null }[]).map((p) => [p.id, p.nome ?? 'Passeio']));
    const reservas = ((rs.data ?? []) as unknown as Reserva[]).filter((r) => !/cancel/i.test(r.status ?? ''));
    const demandas = ((ds.data ?? []) as unknown as Demanda[]).filter((d) => !/cancel/i.test(d.status ?? ''));
    const alertas = (al.error ? [] : (al.data ?? [])) as unknown as Alerta[];
    const rIds = reservas.map((r) => r.id);
    const bIds = Array.from(new Set(reservas.map((r) => r.embarcacao_id).filter((x): x is string => !!x)));

    let participantes: { reserva_id: string }[] = [];
    let vouchers: { reserva_id: string; status: string | null; enviado_em: string | null }[] = [];
    let receitas: { reserva_id: string | null; tipo: string | null; status: string | null }[] = [];
    let barcos: Barco[] = [];
    if (rIds.length) {
      const [pt, vs, fn, bs] = await Promise.all([
        supabase.from('reserva_participantes').select('reserva_id').in('reserva_id', rIds),
        supabase.from('vouchers').select('reserva_id,status,enviado_em').in('reserva_id', rIds),
        supabase.from('financeiro').select('reserva_id,tipo,status').in('reserva_id', rIds),
        supabase.from('embarcacoes').select('id,nome,capacidade,status').in('id', bIds.length ? bIds : [NENHUM]),
      ]);
      participantes = (pt.data ?? []) as unknown as typeof participantes;
      vouchers = (vs.data ?? []) as unknown as typeof vouchers;
      receitas = (fn.data ?? []) as unknown as typeof receitas;
      barcos = (bs.data ?? []) as unknown as Barco[];
    }

    return saidas.map((s) => {
      const rsv = reservas.filter((r) => r.saida_id === s.id);
      const dms = demandas.filter((d) => d.saida_id === s.id);
      const pessoas = rsv.reduce((t, r) => t + Number(r.quantidade_pessoas ?? 0), 0);
      const editar = (r?: Reserva, ancora = '') => (r ? `/reservas/editar/${r.id}${ancora}` : '/reservas');
      const abertos: Aberto[] = [];
      let total = 8;

      // 1. Reservas confirmadas
      const pend = rsv.filter((r) => /pend/i.test(r.status ?? ''));
      if (pend.length) abertos.push({ chave: 'confirmar', texto: `${plural(pend.length, 'reserva', 'reservas')} a confirmar`, href: editar(pend[0]), acao: 'Confirmar' });

      // 2. Participantes cadastrados
      const faltam = rsv.reduce((t, r) => t + Math.max(0, Number(r.quantidade_pessoas ?? 0) - participantes.filter((p) => p.reserva_id === r.id).length), 0);
      if (faltam) {
        const alvo = rsv.find((r) => Number(r.quantidade_pessoas ?? 0) > participantes.filter((p) => p.reserva_id === r.id).length);
        abertos.push({ chave: 'participantes', texto: `${plural(faltam, 'participante', 'participantes')} sem cadastro`, href: editar(alvo, '#participantes'), acao: 'Completar' });
      }

      // 3. Fichas de saúde e 4. preparo de alertas graves
      const meus = alertas.filter((a) => a.saida_id === s.id || (!!a.reserva_id && rIds.includes(a.reserva_id) && rsv.some((r) => r.id === a.reserva_id)));
      const fichasPend = meus.reduce((t, a) => t + Number(a.pendentes ?? 0), 0);
      const graves = meus.reduce((t, a) => t + Number(a.graves ?? 0), 0);
      const alvoSaude = rsv.find((r) => meus.some((a) => a.reserva_id === r.id)) ?? rsv[0];
      if (fichasPend) abertos.push({ chave: 'fichas', texto: `${plural(fichasPend, 'ficha de saúde pendente', 'fichas de saúde pendentes')}`, href: editar(alvoSaude, '#participantes'), acao: 'Enviar link' });
      if (graves && !dms.some((d) => d.saude_preparada_em)) {
        abertos.push({ chave: 'saude', texto: `${plural(graves, 'alerta grave', 'alertas graves')} de saúde sem preparo confirmado`, href: `/reservas/seguranca/${s.id}`, acao: 'Ver resumo' });
      }

      // 5. Guia
      const semGuia = rsv.filter((r) => !r.guia_id && !r.guia?.trim());
      if (semGuia.length) abertos.push({ chave: 'guia', texto: `${plural(semGuia.length, 'reserva', 'reservas')} sem guia`, href: editar(semGuia[0]), acao: 'Escalar guia' });

      // 6. Embarcação e lotação
      const semBarco = rsv.filter((r) => !r.embarcacao_id);
      if (semBarco.length) abertos.push({ chave: 'barco', texto: `${plural(semBarco.length, 'reserva', 'reservas')} sem embarcação`, href: editar(semBarco[0]), acao: 'Vincular barco' });
      else {
        for (const b of barcos) {
          const carga = rsv.filter((r) => r.embarcacao_id === b.id).reduce((t, r) => t + Number(r.quantidade_pessoas ?? 0), 0);
          if (!carga) continue;
          if (/manuten|inativ/i.test(b.status ?? '')) { abertos.push({ chave: 'barco', texto: `${b.nome ?? 'Embarcação'} está fora de operação (${String(b.status).toLowerCase()})`, href: '/embarcacoes', acao: 'Ver frota' }); break; }
          if (b.capacidade && carga > b.capacidade) { abertos.push({ chave: 'barco', texto: `${b.nome ?? 'Embarcação'} acima da lotação (${carga}/${b.capacidade})`, href: '/embarcacoes', acao: 'Ver frota' }); break; }
        }
      }

      // 7. Demanda de suprimentos
      const abertas = dms.filter((d) => !/rascunho/i.test(d.status ?? ''));
      // Demanda que inclui a tripulação tem mais gente que as reservas, e isso está certo:
      // só avisa se ela estiver calculada para MENOS pessoas do que os turistas confirmados.
      const desalinhada = abertas.find((d) => {
        const est = Number(d.pessoas_estimadas ?? 0);
        if (est <= 0 || pessoas <= 0) return false;
        if (d.publico_alvo && d.publico_alvo !== 'turistas') return est < pessoas;
        return Math.abs(est - pessoas) / pessoas > 0.25;
      });
      if (!dms.length) abertos.push({ chave: 'demanda', texto: 'Saída sem demanda de suprimentos', href: '/demandas/nova', acao: 'Criar demanda' });
      else if (!abertas.length) abertos.push({ chave: 'demanda', texto: 'Demanda ainda em rascunho', href: `/demandas/editar/${dms[0].id}`, acao: 'Abrir demanda' });
      else if (desalinhada) abertos.push({ chave: 'demanda', texto: `Demanda calculada para ${desalinhada.pessoas_estimadas} pessoas; a saída tem ${pessoas} ${pessoas === 1 ? 'turista' : 'turistas'}`, href: `/demandas/editar/${desalinhada.id}`, acao: 'Recalcular' });

      // 8. Materiais embarcados
      const naoEmbarcados = dms.reduce((t, d) => t + (d.demanda_itens ?? []).filter((i) => i.situacao !== 'atendido').length, 0);
      if (naoEmbarcados) {
        const alvo = dms.find((d) => (d.demanda_itens ?? []).some((i) => i.situacao !== 'atendido'));
        abertos.push({ chave: 'materiais', texto: `${plural(naoEmbarcados, 'material ainda não embarcado', 'materiais ainda não embarcados')}`, href: alvo ? `/demandas/editar/${alvo.id}` : '/demandas', acao: 'Conferir lista' });
      }

      // 9 e 10. Pagamento e voucher (só nos planos com financeiro e vouchers)
      if (financeiroLiberado) {
        total += 2;
        const semPagamento = rsv.filter((r) => !receitas.some((f) => f.reserva_id === r.id && /receita/i.test(f.tipo ?? '') && /receb|pago|quitad/i.test(f.status ?? '')));
        if (semPagamento.length) abertos.push({ chave: 'pagamento', texto: `${plural(semPagamento.length, 'reserva', 'reservas')} sem pagamento recebido`, href: editar(semPagamento[0]), acao: 'Registrar' });
        const semVoucher = rsv.filter((r) => !/pend/i.test(r.status ?? '') && !vouchers.some((v) => v.reserva_id === r.id && /ativo/i.test(v.status ?? '') && !!v.enviado_em));
        if (semVoucher.length) abertos.push({ chave: 'voucher', texto: `${plural(semVoucher.length, 'voucher', 'vouchers')} para emitir ou enviar ao turista`, href: editar(semVoucher[0]), acao: 'Abrir reserva' });
      }

      return { id: s.id, passeio: nomes.get(s.passeio_id ?? '') ?? 'Passeio', data: s.data_inicio, horario: s.horario, dias: diasEntre(hoje, s.data_inicio), pessoas, vagas: s.vagas_total, total, abertos };
    }).filter((c) => c.pessoas > 0);
  }, [hoje, financeiroLiberado]);

  useEffect(() => {
    if (!hoje) return;
    let ativo = true;
    carregar().then((l) => { if (ativo) setCartoes(l); }).catch(() => { if (ativo) setCartoes([]); });
    return () => { ativo = false; };
  }, [hoje, carregar, revisao]);

  function gravarDispensas(novas: Dispensas) {
    setDispensas(novas);
    try { localStorage.setItem(CHAVE_DISPENSA, JSON.stringify(novas)); } catch { /* sem armazenamento */ }
  }

  function pedirEDA(c: Cartao) {
    const texto = `Prepare a saída "${c.passeio}" de ${dm(c.data)}. Pendências: ${c.abertos.map((a) => a.texto).join('; ')}. Monte o que você pode fazer para eu autorizar e me diga o que depende só de mim.`;
    window.dispatchEvent(new CustomEvent('eda:pedir', { detail: { texto } }));
  }

  if (!cartoes || !cartoes.length) return null;

  return (
    <section className="eda-pront" aria-label="Prontidão das próximas saídas">
      {cartoes.map((c) => {
        const tom = !c.abertos.length ? 'ok' : c.dias <= 1 ? 'er' : c.dias <= 3 ? 'at' : 'nt';
        const quando = c.dias <= 0 ? 'hoje' : c.dias === 1 ? 'amanhã' : `em ${c.dias} dias`;
        const prontos = c.total - c.abertos.length;
        const dispensa = dispensas[c.id]?.dia === hoje ? dispensas[c.id] : null;
        const titulo = `${c.passeio} · ${quando}${c.horario ? ` às ${c.horario.slice(0, 5)}` : ''}`;
        if (dispensa && c.abertos.length) {
          return (
            <article key={c.id} className="eda-card eda-pront-card eda-pront-mini" data-tom="nt">
              <span className="eda-pront-txt"><b>{titulo}</b><small>Aviso dispensado hoje: {dispensa.motivo}</small></span>
              <button type="button" className="eda-lk" onClick={() => { const n = { ...dispensas }; delete n[c.id]; gravarDispensas(n); }}>Reabrir</button>
            </article>
          );
        }
        return (
          <article key={c.id} className="eda-card eda-pront-card" data-tom={tom}>
            <header className="eda-pront-topo">
              <span className="eda-pront-txt">
                <p className="eda-eb eda-eb-p">{tom === 'ok' ? 'Saída pronta' : tom === 'er' ? 'Véspera · resolva hoje' : tom === 'at' ? 'Prepare esta semana' : 'No radar'}</p>
                <b>{titulo}</b>
                <small>{plural(c.pessoas, 'pessoa', 'pessoas')}{c.vagas ? ` de ${c.vagas} vagas` : ''} · saída em {dm(c.data)}</small>
              </span>
              <span className={`eda-pill eda-${tom}`}><i />Prontidão {prontos}/{c.total}</span>
            </header>
            <div className="eda-pront-barra" role="progressbar" aria-valuemin={0} aria-valuemax={c.total} aria-valuenow={prontos} aria-label={`Prontidão ${prontos} de ${c.total}`}>
              <i style={{ width: `${Math.round((prontos / c.total) * 100)}%` }} />
            </div>
            {c.abertos.length > 0 && (
              <>
                <ul className="eda-pront-lista">
                  {c.abertos.map((a) => (
                    <li key={a.chave}>
                      <span>{a.texto}</span>
                      <Link href={a.href} className="eda-lk">{a.acao}</Link>
                    </li>
                  ))}
                </ul>
                <div className="eda-pront-acoes">
                  <button type="button" className="eda-bt eda-bt-ouro eda-bt-p" onClick={() => pedirEDA(c)}>Preparar com a EDA</button>
                  {justificando === c.id ? (
                    <form className="eda-pront-motivo" onSubmit={(e) => {
                      e.preventDefault();
                      const m = motivo.trim().slice(0, 160);
                      if (m.length < 5) return;
                      gravarDispensas({ ...dispensas, [c.id]: { dia: hoje, motivo: m } });
                      setJustificando(''); setMotivo('');
                    }}>
                      <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={160} placeholder="Por que dispensar hoje?" aria-label="Justificativa para dispensar o aviso" autoFocus />
                      <button type="submit" className="eda-bt eda-bt-sec eda-bt-p" disabled={motivo.trim().length < 5}>Dispensar</button>
                      <button type="button" className="eda-lk" onClick={() => { setJustificando(''); setMotivo(''); }}>Cancelar</button>
                    </form>
                  ) : (
                    <button type="button" className="eda-lk" onClick={() => { setJustificando(c.id); setMotivo(''); }}>Dispensar por hoje</button>
                  )}
                </div>
              </>
            )}
          </article>
        );
      })}
    </section>
  );
}

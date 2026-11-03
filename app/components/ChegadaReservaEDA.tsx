'use client';

// ERN_RESERVA_CHEGADAS_V1
// Chegada e transfer da reserva: formulário (Editar reserva) e resumo
// (painel lateral). Salva separado da reserva, na tabela reserva_chegadas.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  MODOS_CHEGADA, ROTAS_SUGERIDAS, SITUACOES_HORARIO, VEICULOS_TRANSFER,
  carregarChegadaDaReserva, chegadaVazia, excluirChegada, formatarChegada,
  isoParaLocalManaus, localManausParaISO, salvarChegada, temTransfer,
  type ChegadaERN, type ModoChegada, type SituacaoHorario, type VeiculoTransfer,
} from '@/lib/chegadasERN';
import { PillEDA, DadoEDA } from '@/app/components/PadraoPaginaEDA';

function linkWhats(contato: string | null): string | null {
  const d = (contato ?? '').replace(/\D/g, '');
  if (d.length < 10) return null;
  return `https://wa.me/${d.length <= 11 ? `55${d}` : d}`;
}

export function SeloChegadaEDA({ c }: { c: ChegadaERN }) {
  if (!temTransfer(c)) return <PillEDA tom="er">Sem transfer</PillEDA>;
  if (c.situacao_horario === 'a_confirmar') return <PillEDA tom="at">Horário a confirmar</PillEDA>;
  return <PillEDA tom="ok">Transfer combinado</PillEDA>;
}

// Resumo no painel lateral da reserva.
export function ResumoChegadaEDA({ reservaId, linkEditar }: { reservaId: string; linkEditar?: string }) {
  const [estado, setEstado] = useState<{ c: ChegadaERN | null; erro: string; carregando: boolean }>({ c: null, erro: '', carregando: true });

  useEffect(() => {
    let ativo = true;
    setEstado({ c: null, erro: '', carregando: true });
    carregarChegadaDaReserva(reservaId)
      .then(c => { if (ativo) setEstado({ c, erro: '', carregando: false }); })
      .catch(e => { if (ativo) setEstado({ c: null, erro: e instanceof Error ? e.message : 'Falha ao consultar.', carregando: false }); });
    return () => { ativo = false; };
  }, [reservaId]);

  const { c, erro, carregando } = estado;
  const whats = c ? linkWhats(c.transfer_contato) : null;

  return (
    <div className="eda-pg-bloco">
      <p className="eda-pg-bloco-titulo">Chegada e transfer</p>
      {carregando ? <p className="eda-pg-texto-mut">Consultando chegada…</p>
        : erro ? <p className="eda-pg-texto-mut">{erro}</p>
        : !c ? (
          <>
            <p className="eda-pg-texto-mut">Ainda não informado como o cliente chega a Barcelos.</p>
            {linkEditar && <Link href={`${linkEditar}#chegada`} className="eda-pg-bt eda-pg-bt-p" style={{ marginTop: 10 }}>Informar chegada</Link>}
          </>
        ) : (
          <>
            <div className="eda-chg-trecho">
              <span><b>{c.origem || 'Origem'}</b></span>
              <span className="eda-chg-rota" aria-hidden="true" />
              <span style={{ textAlign: 'right' }}><b>{c.destino || 'Destino'}</b></span>
            </div>
            <div className="eda-pg-pills"><SeloChegadaEDA c={c} /><PillEDA tom="nt" ponto={false}>{MODOS_CHEGADA[c.modo]}</PillEDA></div>
            <dl className="eda-pg-dados" style={{ marginTop: 12 }}>
              <DadoEDA rotulo="Chegada">{formatarChegada(c.chegada_em)}</DadoEDA>
              <DadoEDA rotulo={c.modo === 'barco' ? 'Embarcação' : 'Voo'}>{[c.companhia, c.numero].filter(Boolean).join(' ') || 'Não informado'}</DadoEDA>
              <DadoEDA rotulo="Passageiros">{c.passageiros ?? 'Não informado'}</DadoEDA>
              <DadoEDA rotulo="Horário">{SITUACOES_HORARIO[c.situacao_horario]}</DadoEDA>
              <DadoEDA rotulo="Quem busca">{c.transfer_responsavel || 'A definir'}</DadoEDA>
              <DadoEDA rotulo="Transporte">{[c.transfer_veiculo ? VEICULOS_TRANSFER[c.transfer_veiculo] : null, c.transfer_detalhe].filter(Boolean).join(' · ') || 'A definir'}</DadoEDA>
              <DadoEDA rotulo="Encontro" largo>{c.transfer_encontro || 'A definir'}{c.transfer_destino ? ` → ${c.transfer_destino}` : ''}</DadoEDA>
            </dl>
            <div className="eda-pg-atalhos" style={{ marginTop: 12 }}>
              {c.modo === 'voo_regular' && /azul/i.test(c.companhia ?? '') && (
                <a href="https://www.voeazul.com.br/" target="_blank" rel="noopener noreferrer" className="eda-pg-bt eda-pg-bt-p">Conferir voo na Azul ↗</a>
              )}
              {whats && <a href={whats} target="_blank" rel="noopener noreferrer" className="eda-pg-bt eda-pg-bt-p">WhatsApp de quem busca ↗</a>}
              {linkEditar && <Link href={`${linkEditar}#chegada`} className="eda-pg-bt eda-pg-bt-p">Editar chegada</Link>}
            </div>
          </>
        )}
    </div>
  );
}

// Formulário em Editar reserva.
export function FormChegadaEDA({ reservaId, bloqueado, pessoas }: { reservaId: string; bloqueado: boolean; pessoas?: string }) {
  const [c, setC] = useState<ChegadaERN>(() => chegadaVazia(reservaId));
  const [existe, setExiste] = useState(false);
  const [local, setLocal] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'er'; texto: string } | null>(null);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    carregarChegadaDaReserva(reservaId)
      .then(atual => {
        if (!ativo) return;
        if (atual) { setC(atual); setExiste(true); setLocal(isoParaLocalManaus(atual.chegada_em)); }
        else { const nova = chegadaVazia(reservaId); if (pessoas && /^\d+$/.test(pessoas)) nova.passageiros = Number(pessoas); setC(nova); }
      })
      .catch(e => { if (ativo) setMsg({ tipo: 'er', texto: e instanceof Error ? e.message : 'Falha ao consultar a chegada.' }); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [reservaId, pessoas]);

  const alterar = <K extends keyof ChegadaERN>(k: K, v: ChegadaERN[K]) => { setMsg(null); setC(atual => ({ ...atual, [k]: v })); };
  const travado = bloqueado || carregando || salvando;

  async function salvar() {
    setMsg(null);
    let chegada_em: string | null = null;
    if (local) {
      chegada_em = localManausParaISO(local);
      if (!chegada_em) { setMsg({ tipo: 'er', texto: 'Informe uma data e hora de chegada válidas.' }); return; }
    }
    setSalvando(true);
    try {
      const salvo = await salvarChegada({ ...c, chegada_em });
      setC(salvo); setExiste(true); setLocal(isoParaLocalManaus(salvo.chegada_em));
      setMsg({ tipo: 'ok', texto: 'Chegada e transfer salvos.' });
    } catch (e) {
      setMsg({ tipo: 'er', texto: e instanceof Error ? e.message : 'Não foi possível salvar.' });
    } finally {
      setSalvando(false);
    }
  }

  async function remover() {
    setSalvando(true); setMsg(null);
    try { await excluirChegada(reservaId); setC(chegadaVazia(reservaId)); setLocal(''); setExiste(false); setMsg({ tipo: 'ok', texto: 'Chegada removida.' }); }
    catch (e) { setMsg({ tipo: 'er', texto: e instanceof Error ? e.message : 'Não foi possível remover.' }); }
    finally { setSalvando(false); }
  }

  function aplicarRota(i: number) {
    const r = ROTAS_SUGERIDAS[i];
    if (!r) return;
    setMsg(null);
    setC(atual => ({ ...atual, modo: r.modo, origem: r.origem, destino: r.destino, companhia: r.companhia ?? atual.companhia, transfer_veiculo: r.veiculo, transfer_encontro: atual.transfer_encontro || r.encontro }));
  }

  return (
    <section className="eda-pg-secao eda-pg-largo" id="chegada" aria-labelledby="titulo-chegada">
      <p className="eda-pg-secao-eb">Logística</p>
      <h2 id="titulo-chegada">Chegada e transfer</h2>
      <p className="eda-pg-secao-txt">Como o cliente chega a Barcelos e quem vai buscar. Salva separado dos dados da reserva.</p>

      {carregando ? <p className="eda-pg-texto-mut">Consultando chegada…</p> : (
        <fieldset disabled={travado} style={{ margin: 0, padding: 0, border: 0, minWidth: 0, display: 'grid', gap: 16 }}>
          <div className="eda-pg-chips" role="group" aria-label="Como o cliente chega">
            {(Object.keys(MODOS_CHEGADA) as ModoChegada[]).map(m => (
              <button key={m} type="button" className="eda-pg-chip" aria-pressed={c.modo === m} onClick={() => alterar('modo', m)}>{MODOS_CHEGADA[m]}</button>
            ))}
          </div>

          <div className="eda-pg-form-2">
            <label className="eda-pg-campo" htmlFor="chg-rota"><span>Rota sugerida</span>
              <select id="chg-rota" defaultValue="" onChange={e => { aplicarRota(Number(e.target.value)); e.target.value = ''; }}>
                <option value="" disabled>Escolher uma rota comum…</option>
                {ROTAS_SUGERIDAS.map((r, i) => <option key={r.rotulo} value={i}>{r.rotulo}</option>)}
              </select>
            </label>
            <label className="eda-pg-campo" htmlFor="chg-quando"><span>Data e hora de chegada (Manaus)</span>
              <input id="chg-quando" type="datetime-local" value={local} onChange={e => { setMsg(null); setLocal(e.target.value); }} />
            </label>
            <label className="eda-pg-campo" htmlFor="chg-origem"><span>Origem</span>
              <input id="chg-origem" maxLength={80} value={c.origem ?? ''} onChange={e => alterar('origem', e.target.value)} placeholder="Ex.: Manaus (MAO)" />
            </label>
            <label className="eda-pg-campo" htmlFor="chg-destino"><span>Destino</span>
              <input id="chg-destino" maxLength={80} value={c.destino ?? ''} onChange={e => alterar('destino', e.target.value)} placeholder="Ex.: Barcelos (BAZ)" />
            </label>
            <label className="eda-pg-campo" htmlFor="chg-cia"><span>{c.modo === 'barco' ? 'Barco / empresa' : 'Companhia'}</span>
              <input id="chg-cia" maxLength={80} value={c.companhia ?? ''} onChange={e => alterar('companhia', e.target.value)} placeholder={c.modo === 'barco' ? 'Ex.: recreio' : 'Ex.: Azul'} />
            </label>
            <label className="eda-pg-campo" htmlFor="chg-numero"><span>{c.modo === 'barco' ? 'Identificação' : 'Número do voo'}</span>
              <input id="chg-numero" maxLength={30} value={c.numero ?? ''} onChange={e => alterar('numero', e.target.value)} placeholder="Opcional" />
            </label>
            <label className="eda-pg-campo" htmlFor="chg-situacao"><span>Situação do horário</span>
              <select id="chg-situacao" value={c.situacao_horario} onChange={e => alterar('situacao_horario', e.target.value as SituacaoHorario)}>
                {(Object.keys(SITUACOES_HORARIO) as SituacaoHorario[]).map(s => <option key={s} value={s}>{SITUACOES_HORARIO[s]}</option>)}
              </select>
            </label>
            <label className="eda-pg-campo" htmlFor="chg-pax"><span>Passageiros</span>
              <input id="chg-pax" type="number" min={1} max={999} inputMode="numeric" value={c.passageiros ?? ''} onChange={e => alterar('passageiros', e.target.value ? Number(e.target.value) : null)} />
            </label>
          </div>

          <p className="eda-pg-secao-eb" style={{ margin: '4px 0 0' }}>Transfer</p>
          <div className="eda-pg-form-2">
            <label className="eda-pg-campo" htmlFor="chg-veiculo"><span>Transporte</span>
              <select id="chg-veiculo" value={c.transfer_veiculo ?? ''} onChange={e => alterar('transfer_veiculo', (e.target.value || null) as VeiculoTransfer | null)}>
                {(Object.keys(VEICULOS_TRANSFER) as VeiculoTransfer[]).map(v => <option key={v} value={v}>{VEICULOS_TRANSFER[v]}</option>)}
              </select>
              {(c.modo === 'voo_regular' || c.modo === 'fretado') && <small>O aeroporto de Barcelos é em terra: o transfer costuma ser de van ou carro.</small>}
            </label>
            <label className="eda-pg-campo" htmlFor="chg-detalhe"><span>Veículo (placa ou descrição)</span>
              <input id="chg-detalhe" maxLength={120} value={c.transfer_detalhe ?? ''} onChange={e => alterar('transfer_detalhe', e.target.value)} placeholder="Ex.: Van branca · placa ABC1D23" />
            </label>
            <label className="eda-pg-campo" htmlFor="chg-resp"><span>Quem busca</span>
              <input id="chg-resp" maxLength={120} value={c.transfer_responsavel ?? ''} onChange={e => alterar('transfer_responsavel', e.target.value)} placeholder="Nome do motorista ou guia" />
            </label>
            <label className="eda-pg-campo" htmlFor="chg-contato"><span>Contato de quem busca</span>
              <input id="chg-contato" maxLength={40} inputMode="tel" value={c.transfer_contato ?? ''} onChange={e => alterar('transfer_contato', e.target.value)} placeholder="(97) 9…" />
            </label>
            <label className="eda-pg-campo" htmlFor="chg-encontro"><span>Ponto de encontro</span>
              <input id="chg-encontro" maxLength={160} value={c.transfer_encontro ?? ''} onChange={e => alterar('transfer_encontro', e.target.value)} placeholder="Ex.: Saída do aeroporto de Barcelos" />
            </label>
            <label className="eda-pg-campo" htmlFor="chg-destino-final"><span>Leva até</span>
              <input id="chg-destino-final" maxLength={160} value={c.transfer_destino ?? ''} onChange={e => alterar('transfer_destino', e.target.value)} placeholder="Ex.: Pousada, porto ou barco-hotel" />
            </label>
            <label className="eda-pg-campo eda-pg-dado-largo" htmlFor="chg-obs" style={{ gridColumn: '1 / -1' }}><span>Observações</span>
              <textarea id="chg-obs" maxLength={1000} rows={3} value={c.observacoes ?? ''} onChange={e => alterar('observacoes', e.target.value)} placeholder="Bagagem, equipamento de pesca, necessidades especiais…" />
            </label>
          </div>

          <p className="eda-pg-nota" style={{ margin: 0 }}>A plataforma não consulta horários sozinha. Confira o voo no site da companhia: datas e horários da rota Manaus–Barcelos podem mudar.</p>

          {msg && <p role={msg.tipo === 'er' ? 'alert' : 'status'} className={`eda-pg-aviso ${msg.tipo === 'er' ? 'eda-pg-aviso-er' : ''}`} style={msg.tipo === 'ok' ? { color: 'var(--p-verde)', margin: 0 } : { margin: 0 }}>{msg.texto}</p>}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" className="eda-pg-bt eda-pg-bt-ouro" onClick={() => void salvar()}>{salvando ? 'Salvando…' : 'Salvar chegada e transfer'}</button>
            {existe && <button type="button" className="eda-pg-bt eda-pg-bt-perigo" onClick={() => void remover()}>Remover chegada</button>}
          </div>
        </fieldset>
      )}
    </section>
  );
}

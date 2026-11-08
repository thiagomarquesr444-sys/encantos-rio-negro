'use client';

// EDA_OPERACAO_AO_VIVO_V1: central de comando da operação contratada.
// O dono/gestor acompanha, mesmo longe da viagem: onde a embarcação está,
// etapas, ocorrências, saúde (contagens), equipe e se os suprimentos cobrem
// quem viaja e por quantos dias. Atualiza sozinha a cada 30 segundos.

import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { Map as Mapa, LayerGroup } from 'leaflet';
import { supabase } from '@/lib/supabase';
import { CabecalhoEDA, PaginaEDA, PillEDA, VazioEDA, type TomEDA } from '@/app/components/PadraoPaginaEDA';
import BordoEDA from '@/app/components/BordoEDA';
import { copiarEDA } from '@/lib/copiarEDA';
import {
  alertasViagem, faseViagem, ROTULO_EVENTO, tempoRelativo, minutosDesde,
  type ViagemAoVivoEDA, type AlertaOperacaoEDA,
} from '@/lib/operacaoAoVivoEDA';

const BARCELOS: [number, number] = [-0.975, -62.924];
const dt = (d: string) => d.split('-').reverse().slice(0, 2).join('/');
const hora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Manaus', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const COR: Record<'er' | 'at' | 'ok' | 'nt' | 'info', string> = { er: '#ef4444', at: '#f2c86b', ok: '#5cc49a', nt: '#93a79d', info: '#8cc3f2' };

function tomGeral(alertas: AlertaOperacaoEDA[]): TomEDA {
  if (alertas.some((a) => a.tom === 'er')) return 'er';
  if (alertas.some((a) => a.tom === 'at')) return 'at';
  return 'ok';
}

export default function OperacaoAoVivoPage() {
  const [viagens, setViagens] = useState<ViagemAoVivoEDA[] | null>(null);
  const [erro, setErro] = useState('');
  const [atualizado, setAtualizado] = useState<string | null>(null);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [bordo, setBordo] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc('operacao_ao_vivo_eda');
    if (error) {
      setErro(error.message.includes('PERMISSAO') ? 'Seu acesso não inclui Reservas. Peça ao administrador da empresa.' : 'Não foi possível atualizar agora. Tentando de novo em instantes.');
      setViagens((v) => v ?? []);
      return;
    }
    setErro('');
    setViagens((data ?? []) as ViagemAoVivoEDA[]);
    setAtualizado(new Date().toISOString());
  }, []);

  useEffect(() => {
    const primeira = window.setTimeout(() => void carregar(), 0);
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') void carregar(); }, 30_000);
    const relogio = window.setInterval(() => setTick((n) => n + 1), 30_000);
    const voltar = () => { if (document.visibilityState === 'visible') void carregar(); };
    document.addEventListener('visibilitychange', voltar);
    return () => { window.clearTimeout(primeira); window.clearInterval(t); window.clearInterval(relogio); document.removeEventListener('visibilitychange', voltar); };
  }, [carregar]);

  const lista = useMemo(() => (viagens ?? []).map((v) => {
    const alertas = alertasViagem(v);
    return { v, alertas, fase: faseViagem(v), tom: tomGeral(alertas) };
  }), [viagens]);

  const pontosMapa = useMemo(() => lista.map((x) => ({ v: x.v, tom: x.tom })), [lista]);
  const atual = lista.find((x) => x.v.chave === selecionada) ?? lista[0] ?? null;
  const emCurso = lista.filter((x) => x.fase.emCurso).length;
  const criticos = lista.filter((x) => x.tom === 'er').length;
  const pessoas = lista.filter((x) => x.fase.emCurso).reduce((n, x) => n + x.v.pessoas, 0);

  return (
    <PaginaEDA>
      <div className="eda-pg-miolo">
        <CabecalhoEDA
          capa
          etiqueta="Operação"
          titulo="Operação ao vivo"
          resumo={viagens === null ? 'Carregando a operação…' : (
            <><b>{emCurso}</b> viagem(ns) em curso · <b>{pessoas}</b> pessoa(s) na água · {criticos ? <b style={{ color: '#ef4444' }}>{criticos} com alerta crítico</b> : 'nenhum alerta crítico'}
              {atualizado && <> · atualizado {tempoRelativo(atualizado)}</>}</>
          )}
          acoes={<>
            <button type="button" className="eda-pg-bt" onClick={() => void carregar()}>Atualizar</button>
            <Link href="/reservas" className="eda-pg-bt">Reservas</Link>
          </>}
        />

        {erro && <div role="alert" className="eda-pg-aviso eda-pg-aviso-at" style={{ marginTop: 16 }}><p style={{ margin: 0 }}>{erro}</p></div>}

        {viagens !== null && lista.length === 0 && !erro && (
          <div style={{ marginTop: 20 }}>
            <VazioEDA titulo="Nenhuma viagem hoje nem amanhã"
              texto="Quando houver viagem em andamento ou saindo até amanhã, ela aparece aqui com localização, etapas, saúde e suprimentos." />
          </div>
        )}

        {lista.length > 0 && (
          <div className="av-grade">
            <section className="av-lista" aria-label="Viagens">
              {lista.map(({ v, alertas, fase, tom }) => (
                <button key={v.chave} type="button" className={`av-item ${atual?.v.chave === v.chave ? 'av-item-sel' : ''}`}
                  onClick={() => setSelecionada(v.chave)} style={{ borderLeftColor: COR[tom] }}>
                  <span className="av-item-topo"><b>{v.passeio || 'Viagem'}</b><PillEDA tom={fase.tom}>{fase.rotulo}</PillEDA></span>
                  <small>{v.inicio === v.fim ? dt(v.inicio) : `${dt(v.inicio)} a ${dt(v.fim)}`}{v.horario ? ` · ${v.horario.slice(0, 5)}` : ''} · {v.pessoas} pessoa(s){v.embarcacao ? ` · ${v.embarcacao.nome}` : ''}</small>
                  <small>{v.posicao ? `📍 ${tempoRelativo(v.posicao.em)}` : '📍 sem localização'}{alertas.length ? ` · ${alertas.filter((a) => a.tom !== 'nt').length} alerta(s)` : ' · tudo certo'}</small>
                </button>
              ))}
            </section>

            <MapaAoVivo lista={pontosMapa} selecionada={atual?.v.chave ?? null} aoSelecionar={setSelecionada} />
          </div>
        )}

        {atual && <Detalhe key={atual.v.chave} v={atual.v} alertas={atual.alertas} bordoAberto={bordo === atual.v.chave} aoBordo={() => setBordo(bordo === atual.v.chave ? null : atual.v.chave)} />}
      </div>

      <style jsx global>{`
        .av-grade { display: grid; grid-template-columns: minmax(260px, 360px) 1fr; gap: 14px; margin-top: 18px; }
        @media (max-width: 860px) { .av-grade { grid-template-columns: 1fr; } }
        .av-lista { display: grid; gap: 8px; align-content: start; max-height: 460px; overflow: auto; }
        .av-item { display: grid; gap: 4px; text-align: left; padding: 12px 14px; border-radius: 14px; border: 1px solid var(--p-borda); border-left-width: 4px; background: var(--p-painel); color: var(--p-texto); cursor: pointer; }
        .av-item-sel { background: var(--p-elev); outline: 1px solid var(--p-ouro); }
        .av-item-topo { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
        .av-item small { font-size: 12px; color: var(--p-sec); }
        .av-mapa { min-height: 460px; border-radius: 18px; overflow: hidden; border: 1px solid var(--p-borda); background: var(--p-painel); position: relative; }
        .av-mapa > div { position: absolute; inset: 0; }
        .av-pino { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; border: 3px solid #fff; color: #07110e; font-size: 16px; box-shadow: 0 4px 14px rgba(0,0,0,.4); }
        .av-det { margin-top: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }
        .av-card { padding: 16px; border-radius: 18px; border: 1px solid var(--p-borda); background: var(--p-painel); display: grid; gap: 10px; align-content: start; }
        .av-card h2 { font-size: 15px; } .av-card p { margin: 0; }
        .av-alertas { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
        .av-alertas li { display: flex; gap: 8px; font-size: 13px; line-height: 1.4; }
        .av-alertas i { flex: none; width: 8px; height: 8px; margin-top: 6px; border-radius: 50%; }
        .av-kv { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-size: 13px; }
        .av-kv span { color: var(--p-sec); }
        .av-tl { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; max-height: 340px; overflow: auto; }
        .av-tl li { display: grid; gap: 2px; padding-left: 12px; border-left: 3px solid var(--p-borda); font-size: 13px; }
        .av-tl small { color: var(--p-sec); font-size: 11px; }
        .av-barra { height: 8px; border-radius: 8px; background: var(--p-suave); overflow: hidden; display: flex; }
        .av-barra b { display: block; height: 100%; }
        .av-acoes { display: flex; flex-wrap: wrap; gap: 8px; }
        .av-largo { grid-column: 1 / -1; }
      `}</style>
    </PaginaEDA>
  );
}

function MapaAoVivo({ lista, selecionada, aoSelecionar }: { lista: { v: ViagemAoVivoEDA; tom: TomEDA }[]; selecionada: string | null; aoSelecionar: (c: string) => void }) {
  const caixa = useRef<HTMLDivElement | null>(null);
  const mapa = useRef<Mapa | null>(null);
  const camada = useRef<LayerGroup | null>(null);
  const L = useRef<typeof import('leaflet') | null>(null);
  const [pronto, setPronto] = useState(false);
  const enquadrado = useRef(false);
  const centro = useRef('');

  useEffect(() => {
    let fim = false;
    void import('leaflet').then((lib) => {
      if (fim || !caixa.current || mapa.current) return;
      L.current = lib;
      const m = lib.map(caixa.current, { zoomControl: true, minZoom: 4, maxZoom: 18 }).setView(BARCELOS, 8);
      lib.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19,
      }).addTo(m);
      camada.current = lib.layerGroup().addTo(m);
      mapa.current = m;
      setPronto(true);
    });
    return () => { fim = true; mapa.current?.remove(); mapa.current = null; };
  }, []);

  useEffect(() => {
    const lib = L.current, m = mapa.current, c = camada.current;
    if (!pronto || !lib || !m || !c) return;
    c.clearLayers();
    const pts: [number, number][] = [];
    for (const { v, tom } of lista) {
      const sel = v.chave === selecionada;
      if (sel && v.trilha.length > 1) lib.polyline(v.trilha, { color: '#e3a144', weight: 3, opacity: 0.85 }).addTo(c);
      if (!v.posicao) continue;
      const p: [number, number] = [v.posicao.lat, v.posicao.lng];
      pts.push(p);
      const velho = (minutosDesde(v.posicao.em) ?? 0) > 30;
      const icone = lib.divIcon({
        className: '', iconSize: [34, 34], iconAnchor: [17, 17],
        html: `<span class="av-pino" style="background:${COR[tom as keyof typeof COR] ?? '#5cc49a'};opacity:${velho ? 0.6 : 1};${sel ? 'transform:scale(1.2)' : ''}">⛵</span>`,
      });
      const mk = lib.marker(p, { icon: icone, title: v.passeio ?? 'Viagem' }).addTo(c);
      mk.bindTooltip(`${(v.passeio ?? 'Viagem').replace(/</g, '&lt;')} · ${tempoRelativo(v.posicao.em)}`);
      mk.on('click', () => aoSelecionar(v.chave));
      if (v.posicao.precisao && v.posicao.precisao > 50 && sel) lib.circle(p, { radius: v.posicao.precisao, color: '#8cc3f2', weight: 1, fillOpacity: 0.08 }).addTo(c);
    }
    const s = lista.find((x) => x.v.chave === selecionada)?.v.posicao;
    // Só recentraliza quando muda a viagem escolhida ou chega posição nova.
    const marca = s ? `${selecionada}|${s.em}` : '';
    if (s && marca !== centro.current) { centro.current = marca; m.setView([s.lat, s.lng], Math.max(m.getZoom(), 11), { animate: true }); }
    else if (!enquadrado.current && pts.length) { m.fitBounds(lib.latLngBounds(pts), { padding: [40, 40], maxZoom: 12 }); enquadrado.current = true; }
  }, [pronto, lista, selecionada, aoSelecionar]);

  return <div className="av-mapa" aria-label="Mapa das embarcações"><div ref={caixa} /></div>;
}

function Detalhe({ v, alertas, bordoAberto, aoBordo }: { v: ViagemAoVivoEDA; alertas: AlertaOperacaoEDA[]; bordoAberto: boolean; aoBordo: () => void }) {
  const s = v.suprimentos;
  const totalItens = Math.max(s.itens, 1);
  const tel = (v.guia?.telefone ?? '').replace(/\D/g, '');
  const telInt = tel ? (tel.length <= 11 ? `55${tel}` : tel) : '';
  const linkMapa = v.posicao ? `https://www.google.com/maps?q=${v.posicao.lat},${v.posicao.lng}` : '';
  const reserva = v.reservas[0];

  return (
    <div className="av-det">
      <section className="av-card">
        <p className="eda-pg-eb">Alertas da viagem</p>
        <h2>{v.passeio || 'Viagem'}</h2>
        {alertas.length === 0 ? <p style={{ color: 'var(--p-verde)', fontSize: 13 }}>Tudo certo: equipe, segurança e suprimentos conferidos.</p> : (
          <ul className="av-alertas">
            {alertas.map((a, i) => <li key={i}><i style={{ background: COR[a.tom] }} aria-hidden="true" />{a.texto}</li>)}
          </ul>
        )}
      </section>

      <section className="av-card">
        <p className="eda-pg-eb">Localização e equipe</p>
        <div className="av-kv">
          <span>Última posição</span><b>{v.posicao ? `${tempoRelativo(v.posicao.em)} (${hora(v.posicao.em)})` : 'nenhuma ainda'}</b>
          {v.posicao?.velocidade != null && <><span>Velocidade</span><b>{v.posicao.velocidade.toFixed(1)} km/h</b></>}
          {v.posicao?.bateria != null && <><span>Bateria</span><b>{v.posicao.bateria}%</b></>}
          <span>Embarcação</span><b>{v.embarcacao ? `${v.embarcacao.nome}${v.embarcacao.capacidade ? ` · ${v.pessoas}/${v.embarcacao.capacidade} lugares` : ''}${v.embarcacao.marinheiro ? ` · ${v.embarcacao.marinheiro}` : ''}` : '—'}</b>
          <span>Guia</span><b>{v.guia ? v.guia.nome : '—'}</b>
          <span>Clientes</span><b>{v.clientes || '—'}</b>
        </div>
        <div className="av-acoes">
          {telInt && <a className="eda-pg-bt" href={`https://wa.me/${telInt}`} target="_blank" rel="noopener noreferrer">WhatsApp do guia</a>}
          {tel && <a className="eda-pg-bt" href={`tel:+${telInt}`}>Ligar</a>}
          {linkMapa && <a className="eda-pg-bt" href={linkMapa} target="_blank" rel="noopener noreferrer">Abrir no Google Maps</a>}
          {linkMapa && <button type="button" className="eda-pg-bt" onClick={() => void copiarEDA(linkMapa, 'Localização copiada')}>Copiar localização</button>}
        </div>
      </section>

      <section className="av-card">
        <p className="eda-pg-eb">Suprimentos</p>
        {!v.saida_id ? <p style={{ fontSize: 13, color: 'var(--p-sec)' }}>Esta reserva não está ligada a uma saída. Ligue-a a uma saída e crie a demanda pela saída para a EDA conferir os suprimentos.</p>
          : !s.demandas ? <p style={{ fontSize: 13 }}>Nenhuma demanda ligada a esta saída.</p> : (
            <>
              <div className="av-barra" aria-label={`${s.atendidos} de ${s.itens} itens atendidos`}>
                <b style={{ width: `${(s.atendidos / totalItens) * 100}%`, background: '#5cc49a' }} />
                <b style={{ width: `${(s.separacao / totalItens) * 100}%`, background: '#f2c86b' }} />
                <b style={{ width: `${(s.pendentes / totalItens) * 100}%`, background: '#ef4444' }} />
              </div>
              <div className="av-kv">
                <span>Itens</span><b>{s.atendidos} atendidos · {s.separacao} em separação · {s.pendentes} pendentes</b>
                <span>Planejado</span><b>{s.planejado_pessoas ?? '?'} pessoa(s) × {s.planejado_dias ?? '?'} dia(s)</b>
                <span>Viagem real</span><b>{v.pessoas} pessoa(s) × {v.dias} dia(s)</b>
                <span>Coletes</span><b>{s.coletes} para {v.pessoas}</b>
              </div>
            </>
          )}
        <div className="av-acoes">
          <Link className="eda-pg-bt" href={v.saida_id ? '/demandas' : `/reservas/editar/${reserva}`}>{v.saida_id ? 'Ver demandas' : 'Ligar a uma saída'}</Link>
        </div>
      </section>

      <section className="av-card">
        <p className="eda-pg-eb">Segurança</p>
        <div className="av-kv">
          <span>Fichas de saúde</span><b>{v.saude.fichas} de {v.pessoas}</b>
          <span>Alertas graves</span><b style={{ color: v.saude.graves ? '#ef4444' : undefined }}>{v.saude.graves}</b>
          <span>Atenção</span><b>{v.saude.atencao}</b>
          <span>Não sabem nadar</span><b>{v.saude.nao_nadam}</b>
        </div>
        <div className="av-acoes">
          {v.reservas.slice(0, 3).map((id, i) => (
            <Link key={id} className="eda-pg-bt" href={`/reservas/editar/${id}#participantes`}>{v.reservas.length > 1 ? `Reserva ${i + 1}` : 'Gerenciar reserva'}</Link>
          ))}
        </div>
      </section>

      <section className="av-card av-largo">
        <p className="eda-pg-eb">Linha do tempo a bordo</p>
        {v.eventos.length === 0 ? <p style={{ fontSize: 13, color: 'var(--p-sec)' }}>Nenhum registro ainda. O guia registra pelo Painel do Guia; a equipe a bordo pode usar “Estou a bordo” abaixo.</p> : (
          <ul className="av-tl">
            {v.eventos.map((e) => (
              <li key={e.id} style={{ borderLeftColor: e.gravidade === 'grave' ? '#ef4444' : e.gravidade === 'atencao' ? '#f2c86b' : undefined }}>
                <b>{ROTULO_EVENTO[e.tipo]}{e.texto ? ` — ${e.texto}` : ''}</b>
                <small>{hora(e.em)} · {e.autor || 'Equipe'}{e.lat != null && e.lng != null ? ` · ${e.lat.toFixed(4)}, ${e.lng.toFixed(4)}` : ''}</small>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="av-card av-largo">
        <div className="av-acoes" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div><p className="eda-pg-eb">Estou a bordo</p><p style={{ fontSize: 13, color: 'var(--p-sec)' }}>Use este aparelho para transmitir a localização e registrar a viagem (quando o guia não tem conta na EDA).</p></div>
          <button type="button" className="eda-pg-bt" onClick={aoBordo}>{bordoAberto ? 'Fechar painel de bordo' : 'Abrir painel de bordo'}</button>
        </div>
        {bordoAberto && reserva && <BordoEDA reservaId={reserva} titulo={`A bordo: ${v.passeio || 'viagem'}`} />}
      </section>
    </div>
  );
}

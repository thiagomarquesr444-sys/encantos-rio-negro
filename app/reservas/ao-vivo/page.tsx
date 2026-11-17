'use client';

// EDA_OPERACAO_AO_VIVO_V1: central de comando da operação contratada.
// O dono/gestor acompanha, mesmo longe da viagem: onde a embarcação está,
// etapas, ocorrências, saúde (contagens), equipe e se os suprimentos cobrem
// quem viaja e por quantos dias. Atualiza sozinha a cada 30 segundos.

import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import type { Map as Mapa, LayerGroup } from 'leaflet';
import { supabase } from '@/lib/supabase';
import { CabecalhoEDA, PaginaEDA, PillEDA, VazioEDA, type TomEDA } from '@/app/components/PadraoPaginaEDA';
import BordoEDA from '@/app/components/BordoEDA';
import { copiarEDA } from '@/lib/copiarEDA';
import {
  alertasViagem, faseViagem, ROTULO_EVENTO, tempoRelativo, minutosDesde,
  analisarRota, formatarDistancia, duracao, distanciaM, rumoTrilha, destinoViagem, etapasViagem, agruparEventos,
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
                  <small>{v.posicao ? `Posição ${tempoRelativo(v.posicao.em)}` : 'Sem localização'}{alertas.length ? ` · ${alertas.filter((a) => a.tom !== 'nt').length} alerta(s)` : ' · tudo certo'}</small>
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
        .av-mapa { min-height: 560px; border-radius: 20px; overflow: hidden; border: 1px solid var(--p-borda); background: #0b1512; position: relative; isolation: isolate; z-index: 0; box-shadow: 0 18px 50px rgb(0 0 0 / 22%); }
        .av-mapa-tela { position: absolute; inset: 0; z-index: 0; }
        .av-mapa-cheia { border-radius: 0; min-height: 100vh; }
        .av-mapa .leaflet-control-zoom { border: 0; box-shadow: 0 6px 18px rgb(0 0 0 / 35%); border-radius: 12px; overflow: hidden; }
        .av-mapa .leaflet-control-zoom a { background: rgb(7 17 14 / 88%); color: #f4ead6; border-color: rgb(255 255 255 / 12%); width: 34px; height: 34px; line-height: 34px; }
        .av-mapa .leaflet-control-zoom a:hover { background: #e3a144; color: #07110e; }
        .av-mapa .leaflet-control-attribution { background: rgb(7 17 14 / 70%); color: #c9c2ae; font-size: 10px; }
        .av-mapa .leaflet-control-attribution a { color: #f2c86b; }
        .av-dica { background: rgb(7 17 14 / 92%); color: #f4ead6; border: 1px solid rgb(227 161 68 / 55%); border-radius: 10px; font: 600 12px/1.35 var(--font-gestao, system-ui); padding: 5px 9px; box-shadow: 0 6px 18px rgb(0 0 0 / 35%); }
        .av-dica::before { display: none; }
        .av-barco { position: relative; display: grid; place-items: center; width: 100%; height: 100%; filter: drop-shadow(0 4px 8px rgb(0 0 0 / 55%)); }
        .av-barco svg { position: relative; z-index: 1; transition: transform .6s ease; width: 78%; height: 78%; }
        .av-barco-onda { position: absolute; inset: 0; border-radius: 50%; border: 2px solid var(--c); opacity: 0; }
        @media (prefers-reduced-motion: no-preference) { .av-barco-onda { animation: av-onda 2.2s ease-out infinite; } }
        @keyframes av-onda { 0% { transform: scale(.55); opacity: .9; } 100% { transform: scale(1.5); opacity: 0; } }
        .av-barco-velho { filter: grayscale(.7) drop-shadow(0 3px 6px rgb(0 0 0 / 45%)); opacity: .7; }
        .av-marco { display: grid; place-items: center; width: 100%; height: 100%; border-radius: 50%; border: 2px solid #fff; font-size: 11px; font-weight: 800; color: #07110e; box-shadow: 0 2px 10px rgba(0,0,0,.5); }
        .av-marco-g { border-width: 3px; box-shadow: 0 0 0 4px rgb(227 161 68 / 30%), 0 4px 12px rgba(0,0,0,.5); }
        .av-ponto-ini { display: block; width: 100%; height: 100%; border-radius: 50%; background: #5cc49a; border: 2px solid #07110e; }
        .av-mapa-barra { position: absolute; z-index: 600; top: 12px; right: 12px; left: 12px; display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; align-items: center; pointer-events: none; }
        .av-mapa-barra > * { pointer-events: auto; }
        .av-mapa-barra button:hover { border-color: #e3a144; }
        .av-seg { display: inline-flex; padding: 3px; gap: 2px; border-radius: 999px; background: rgb(7 17 14 / 86%); border: 1px solid rgb(255 255 255 / 18%); backdrop-filter: blur(8px); box-shadow: 0 4px 14px rgb(0 0 0 / 30%); }
        .av-seg button { height: 28px; border: 0; background: transparent; box-shadow: none; padding: 0 12px; backdrop-filter: none; }
        .av-mapa-barra .av-link { display: inline-flex; align-items: center; height: 34px; padding: 0 14px; border-radius: 999px; font-size: 12px; font-weight: 700; text-decoration: none; box-shadow: 0 4px 14px rgb(0 0 0 / 30%); white-space: nowrap; }
        .av-mapa-barra button[aria-pressed="true"], .av-mapa-barra .av-ouro { background: #e3a144; color: #07110e; border-color: #e3a144; }
        .av-hud { position: absolute; z-index: 600; left: 12px; bottom: 12px; width: min(330px, calc(100% - 70px)); padding: 14px 15px 12px; border-radius: 18px; background: rgb(7 17 14 / 90%); color: #f4ead6; border: 1px solid rgb(227 161 68 / 35%); border-left: 4px solid var(--c); backdrop-filter: blur(10px); box-shadow: 0 16px 40px rgb(0 0 0 / 45%); display: grid; gap: 9px; font-size: 12px; }
        .av-hud-topo { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
        .av-hud-topo b { font-size: 14px; }
        .av-hud-fase { font-size: 10.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #f2c86b; white-space: nowrap; }
        .av-hud-sit { margin: 0; display: flex; align-items: center; gap: 7px; font-weight: 600; font-size: 13px; }
        .av-hud-sit i { width: 9px; height: 9px; border-radius: 50%; flex: none; background: #93a79d; }
        .av-hud-sit-ok i { background: #5cc49a; box-shadow: 0 0 0 4px rgb(92 196 154 / 22%); }
        .av-hud-sit-at i { background: #f2c86b; box-shadow: 0 0 0 4px rgb(242 200 107 / 22%); }
        .av-hud-sit-er { color: #ff8a8a; } .av-hud-sit-er i { background: #ef4444; box-shadow: 0 0 0 4px rgb(239 68 68 / 25%); }
        .av-hud-prog { position: relative; height: 18px; border-radius: 999px; background: rgb(255 255 255 / 10%); overflow: hidden; }
        .av-hud-prog b { display: block; height: 100%; background: linear-gradient(90deg, #5cc49a, #e3a144); border-radius: 999px; transition: width .6s ease; }
        .av-hud-prog span { position: absolute; inset: 0; display: grid; place-items: center; font-size: 10.5px; font-weight: 800; color: #fff; text-shadow: 0 1px 2px rgb(0 0 0 / 70%); }
        .av-hud-kv { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; }
        .av-hud-kv div { display: grid; gap: 1px; } .av-hud-kv dt { font-size: 10px; letter-spacing: .06em; text-transform: uppercase; color: #93a79d; } .av-hud-kv dd { margin: 0; font-weight: 700; font-size: 13px; }
        .av-hud-kv em { font-style: normal; color: #ff8a8a; font-size: 11px; }
        .av-hud-velho { color: #f2c86b; }
        .av-hud-leg { display: flex; flex-wrap: wrap; gap: 4px 12px; padding-top: 8px; border-top: 1px solid rgb(255 255 255 / 10%); font-size: 10.5px; color: #c9c2ae; }
        .av-hud-leg span { display: inline-flex; align-items: center; gap: 5px; } .av-hud-leg i { display: inline-block; width: 14px; height: 4px; border-radius: 3px; }
        .av-hud-leg .av-leg-tr { background: repeating-linear-gradient(90deg, #f2c86b 0 4px, transparent 4px 7px); }
        @media (max-width: 860px) {
          .av-mapa { min-height: 520px; }
          .av-mapa-barra { justify-content: flex-start; } .av-mapa-barra button { height: 32px; font-size: 11.5px; padding: 0 10px; }
          .av-hud { left: 8px; right: 52px; bottom: 8px; width: auto; padding: 11px 12px; }
        }
        .av-etapas { grid-column: 1 / -1; margin: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; padding: 14px 16px; border-radius: 18px; border: 1px solid var(--p-borda); background: var(--p-painel); }
        .av-etapa { position: relative; display: grid; justify-items: center; gap: 4px; text-align: center; font-size: 12px; color: var(--p-sec); }
        .av-etapa::before { content: ''; position: absolute; top: 10px; left: -50%; width: 100%; height: 3px; background: var(--p-borda); z-index: 0; }
        .av-etapa:first-child::before { display: none; }
        .av-etapa i { position: relative; z-index: 1; width: 22px; height: 22px; border-radius: 50%; border: 3px solid var(--p-borda); background: var(--p-painel); }
        .av-etapa-feita { color: var(--p-texto); } .av-etapa-feita i { background: #5cc49a; border-color: #5cc49a; } .av-etapa-feita::before { background: #5cc49a; }
        .av-etapa-atual i { border-color: #e3a144; box-shadow: 0 0 0 5px rgb(227 161 68 / 22%); } .av-etapa-atual { color: var(--p-texto); }
        .av-etapa b { font-size: 12.5px; } .av-etapa small { font-size: 11px; }
        .av-vezes { display: inline-block; margin-left: 6px; padding: 1px 7px; border-radius: 999px; font-size: 10.5px; background: var(--p-suave); color: var(--p-sec); }
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
        .av-mapa-barra button { font: inherit; font-size: 12px; font-weight: 600; padding: 7px 11px; border-radius: 999px; border: 1px solid rgba(255,255,255,.25); background: rgba(7,17,14,.82); color: #f4ead6; cursor: pointer; backdrop-filter: blur(6px); }
        .av-rota-info { display: grid; gap: 6px; }
        .av-rota-prog { height: 8px; border-radius: 8px; background: var(--p-suave); overflow: hidden; }
        .av-rota-prog b { display: block; height: 100%; background: #e3a144; }
      `}</style>
    </PaginaEDA>
  );
}

// EDA_OPERACAO_AO_VIVO_V2: mapa de comando — barco com rumo, percurso planejado x feito,
// destino sempre visível, painel de situação (HUD), tela cheia e enquadramentos rápidos.
// O mapa fica isolado (isolation) para nunca cobrir a EDA nem menus da gestão.
function barcoHTML(cor: string, rumo: number | null, velho: boolean, sel: boolean) {
  return `<span class="av-barco${velho ? ' av-barco-velho' : ''}${sel ? ' av-barco-sel' : ''}" style="--c:${cor}">`
    + (velho ? '' : '<i class="av-barco-onda"></i>')
    + `<svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" style="transform:rotate(${rumo ?? 0}deg)">`
    + `<path d="M20 3C26.5 9.5 28.5 17.5 28.5 25.5V33Q20 37.5 11.5 33V25.5C11.5 17.5 13.5 9.5 20 3Z" fill="${cor}" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>`
    + `<path d="M15.5 25.5H24.5" stroke="#07110e" stroke-width="2" stroke-linecap="round" opacity=".55"/>`
    + (rumo === null ? '' : '<path d="M20 9V19" stroke="#07110e" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>')
    + '</svg></span>';
}
const marcoHTML = (cor: string, texto: string, grande = false) =>
  `<span class="av-marco${grande ? ' av-marco-g' : ''}" style="background:${cor}">${texto}</span>`;
const DESTINO_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 21V4M6 4h11l-2.5 4L17 12H6" fill="none" stroke="#07110e" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

function MapaAoVivo({ lista, selecionada, aoSelecionar }: { lista: { v: ViagemAoVivoEDA; tom: TomEDA }[]; selecionada: string | null; aoSelecionar: (c: string) => void }) {
  const moldura = useRef<HTMLDivElement | null>(null);
  const caixa = useRef<HTMLDivElement | null>(null);
  const mapa = useRef<Mapa | null>(null);
  const camada = useRef<LayerGroup | null>(null);
  const L = useRef<typeof import('leaflet') | null>(null);
  const bases = useRef<{ satelite: import('leaflet').TileLayer; rotulos: import('leaflet').TileLayer; ruas: import('leaflet').TileLayer } | null>(null);
  const [pronto, setPronto] = useState(false);
  const [satelite, setSatelite] = useState(true);
  const [cheia, setCheia] = useState(false);
  const enquadrado = useRef('');
  const centro = useRef('');
  // EDA_LOGISTICA_PASSEIO_V1: embarque, destino e percurso vêm do cadastro do passeio (só leitura aqui).
  const selItem = lista.find((x) => x.v.chave === selecionada) ?? null;
  const sel = selItem?.v ?? null;
  const fimSel = sel ? destinoViagem(sel) : null;

  useEffect(() => {
    let fim = false;
    void import('leaflet').then((lib) => {
      if (fim || !caixa.current || mapa.current) return;
      L.current = lib;
      const m = lib.map(caixa.current, { zoomControl: false, minZoom: 4, maxZoom: 18 }).setView(BARCELOS, 8);
      lib.control.zoom({ position: 'bottomright', zoomInTitle: 'Aproximar', zoomOutTitle: 'Afastar' }).addTo(m);
      const satelite = lib.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Imagens &copy; Esri, Maxar, Earthstar Geographics', maxZoom: 18,
      });
      const rotulos = lib.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18, opacity: 0.9 });
      const ruas = lib.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19,
      });
      satelite.addTo(m); rotulos.addTo(m);
      bases.current = { satelite, rotulos, ruas };
      camada.current = lib.layerGroup().addTo(m);
      mapa.current = m;
      setPronto(true);
    });
    return () => { fim = true; mapa.current?.remove(); mapa.current = null; };
  }, []);

  // Mantém o mapa no tamanho certo (tela cheia, giro do celular, sidebar).
  useEffect(() => {
    const el = moldura.current;
    if (!pronto || !el) return;
    const ro = new ResizeObserver(() => mapa.current?.invalidateSize());
    ro.observe(el);
    const fs = () => { setCheia(document.fullscreenElement === el); window.setTimeout(() => mapa.current?.invalidateSize(), 120); };
    document.addEventListener('fullscreenchange', fs);
    return () => { ro.disconnect(); document.removeEventListener('fullscreenchange', fs); };
  }, [pronto]);

  useEffect(() => {
    const m = mapa.current, b = bases.current;
    if (!pronto || !m || !b) return;
    if (satelite) { m.removeLayer(b.ruas); b.satelite.addTo(m); b.rotulos.addTo(m); }
    else { m.removeLayer(b.satelite); m.removeLayer(b.rotulos); b.ruas.addTo(m); }
  }, [pronto, satelite]);

  const pontosSel = useCallback((): [number, number][] => {
    if (!sel) return [];
    const pts: [number, number][] = [];
    if (sel.rota?.pontos?.length) pts.push(...sel.rota.pontos);
    if (sel.embarque_pos) pts.push([sel.embarque_pos.lat, sel.embarque_pos.lng]);
    if (sel.trilha.length) pts.push(...sel.trilha);
    if (fimSel) pts.push([fimSel.lat, fimSel.lng]);
    if (sel.posicao) pts.push([sel.posicao.lat, sel.posicao.lng]);
    return pts;
  }, [sel, fimSel]);

  const verTudo = useCallback(() => {
    const lib = L.current, m = mapa.current, pts = pontosSel();
    if (!lib || !m || !pts.length) return;
    if (pts.length > 1) m.fitBounds(lib.latLngBounds(pts), { padding: [60, 60], maxZoom: 15 }); else m.setView(pts[0], 14);
  }, [pontosSel]);

  useEffect(() => {
    const lib = L.current, m = mapa.current, c = camada.current;
    if (!pronto || !lib || !m || !c) return;
    c.clearLayers();
    const marco = (p: [number, number], html: string, tam: number, titulo: string, fixo = false) => {
      const ic = lib.divIcon({ className: '', iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2], html });
      const mk = lib.marker(p, { icon: ic, title: titulo, keyboard: false }).addTo(c);
      mk.bindTooltip(esc(titulo), fixo ? { permanent: true, direction: 'top', offset: [0, -tam / 2], className: 'av-dica' } : { className: 'av-dica' });
    };
    for (const { v, tom } of lista) {
      const ehSel = v.chave === selecionada;
      const fim = destinoViagem(v);
      // Percurso planejado (tracejado dourado com contorno): completo na viagem escolhida, discreto nas demais.
      const rota = v.rota;
      if (rota && rota.pontos.length > 1) {
        lib.polyline(rota.pontos, { color: '#07110e', weight: ehSel ? 8 : 4, opacity: ehSel ? 0.45 : 0.15, interactive: false }).addTo(c);
        lib.polyline(rota.pontos, { color: '#f2c86b', weight: ehSel ? 4 : 2, opacity: ehSel ? 1 : 0.45, dashArray: '10 9', interactive: false }).addTo(c);
      }
      // Caminho já feito (sólido verde com contorno).
      if (ehSel && v.trilha.length > 1) {
        lib.polyline(v.trilha, { color: '#07110e', weight: 8, opacity: 0.5, interactive: false }).addTo(c);
        lib.polyline(v.trilha, { color: '#5cc49a', weight: 4.5, opacity: 1, interactive: false }).addTo(c);
        marco(v.trilha[0], '<span class="av-ponto-ini"></span>', 12, `Primeira posição registrada`);
      }
      if (ehSel) {
        const saida: [number, number] | null = v.embarque_pos ? [v.embarque_pos.lat, v.embarque_pos.lng] : rota && rota.pontos.length ? rota.pontos[0] : null;
        if (saida) marco(saida, marcoHTML('#5cc49a', 'S'), 26, `Embarque${v.embarque ? `: ${v.embarque}` : ''}`);
        (rota?.paradas ?? []).forEach((pa, i) => marco([pa.lat, pa.lng], marcoHTML('#8cc3f2', String(i + 1)), 24, `${pa.nome}${pa.minutos ? ` · ${pa.minutos} min previstos` : ''}`));
        // Destino sempre visível, com nome fixo e raio de chegada.
        if (fim) {
          lib.circle([fim.lat, fim.lng], { radius: 500, color: '#e3a144', weight: 1.5, opacity: 0.8, fillColor: '#e3a144', fillOpacity: 0.08, dashArray: '4 6', interactive: false }).addTo(c);
          marco([fim.lat, fim.lng], marcoHTML('#e3a144', DESTINO_SVG, true), 30, `Destino${fim.nome ? `: ${fim.nome}` : ''}`, true);
          // Sem percurso traçado: linha reta tênue do barco ao destino (direção e distância).
          if (v.posicao && !(v.rota && v.rota.pontos.length > 1)) {
            lib.polyline([[v.posicao.lat, v.posicao.lng], [fim.lat, fim.lng]], { color: '#ffffff', weight: 2, opacity: 0.75, dashArray: '2 8', interactive: false }).addTo(c);
          }
        }
      }
      if (!v.posicao) continue;
      const p: [number, number] = [v.posicao.lat, v.posicao.lng];
      const velho = (minutosDesde(v.posicao.em) ?? 0) > 30;
      const tam = ehSel ? 46 : 36;
      const icone = lib.divIcon({ className: '', iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2], html: barcoHTML(COR[tom as keyof typeof COR] ?? '#5cc49a', rumoTrilha(v.trilha), velho, ehSel) });
      const mk = lib.marker(p, { icon: icone, title: v.passeio ?? 'Viagem', zIndexOffset: ehSel ? 1000 : 500 }).addTo(c);
      mk.bindTooltip(`${esc(v.passeio ?? 'Viagem')}${v.embarcacao ? ` · ${esc(v.embarcacao.nome)}` : ''} · ${tempoRelativo(v.posicao.em)}`, { className: 'av-dica', direction: 'top', offset: [0, -tam / 2] });
      mk.on('click', () => aoSelecionar(v.chave));
      if (v.posicao.precisao && v.posicao.precisao > 50 && ehSel) lib.circle(p, { radius: v.posicao.precisao, color: '#8cc3f2', weight: 1, fillOpacity: 0.08, interactive: false }).addTo(c);
    }
    // Enquadra o percurso completo ao trocar de viagem; depois só acompanha posição nova.
    const s = sel?.posicao;
    const marca = s ? `${selecionada}|${s.em}` : '';
    if (selecionada && enquadrado.current !== selecionada) {
      enquadrado.current = selecionada; centro.current = marca;
      verTudo();
    } else if (s && marca !== centro.current) {
      centro.current = marca;
      if (!m.getBounds().pad(-0.1).contains([s.lat, s.lng])) m.panTo([s.lat, s.lng], { animate: true });
    }
  }, [pronto, lista, selecionada, aoSelecionar, sel, verTudo]);

  const irPara = (lat: number, lng: number, zoom: number) => { const m = mapa.current; if (m) m.setView([lat, lng], Math.max(m.getZoom(), zoom), { animate: true }); };
  const irAoBarco = () => { if (sel?.posicao) irPara(sel.posicao.lat, sel.posicao.lng, 15); };
  const irAoDestino = () => { if (fimSel) irPara(fimSel.lat, fimSel.lng, 14); };
  const telaCheia = () => {
    const el = moldura.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void el.requestFullscreen?.().catch(() => undefined);
  };

  return (
    <div ref={moldura} className={`av-mapa${cheia ? ' av-mapa-cheia' : ''}`} aria-label="Mapa das embarcações">
      <div ref={caixa} className="av-mapa-tela" />

      <div className="av-mapa-barra" role="toolbar" aria-label="Controles do mapa">
        <span className="av-seg" role="group" aria-label="Tipo de mapa">
          <button type="button" aria-pressed={satelite} onClick={() => setSatelite(true)}>Satélite</button>
          <button type="button" aria-pressed={!satelite} onClick={() => setSatelite(false)}>Mapa</button>
        </span>
        {sel?.posicao && <button type="button" onClick={irAoBarco} title="Centralizar na embarcação">Embarcação</button>}
        {fimSel && <button type="button" onClick={irAoDestino} title="Mostrar o destino">Destino</button>}
        {sel && <button type="button" onClick={verTudo} title="Ver percurso completo">Percurso completo</button>}
        <button type="button" onClick={telaCheia} aria-pressed={cheia} title={cheia ? 'Sair da tela cheia' : 'Tela cheia'}>{cheia ? 'Sair da tela cheia' : 'Tela cheia'}</button>
        {sel?.passeio_id && (
          <Link className="av-ouro av-link" href={`/passeios?abrir=${sel.passeio_id}`} title="Embarque, destino e percurso ficam no cadastro do passeio">
            {sel.rota?.pontos?.length && fimSel ? 'Ajustar percurso no passeio' : 'Marcar percurso no passeio'}
          </Link>
        )}
      </div>

      {sel && <HudViagem v={sel} tom={selItem?.tom ?? 'ok'} />}

    </div>
  );
}

// Painel de situação sobre o mapa: onde está, quanto falta, quando chega.
function HudViagem({ v, tom }: { v: ViagemAoVivoEDA; tom: TomEDA }) {
  const r = analisarRota(v);
  const fim = destinoViagem(v);
  const fase = faseViagem(v);
  const retaM = v.posicao && fim ? distanciaM(v.posicao, fim) : null;
  const pct = r.percorridoM !== null && r.totalM ? Math.min(100, Math.round((r.percorridoM / r.totalM) * 100)) : null;
  const velho = (minutosDesde(v.posicao?.em) ?? 9999) > 30;
  const sit = situacaoRota(v, r);
  return (
    <div className="av-hud" style={{ '--c': COR[tom as keyof typeof COR] ?? '#5cc49a' } as CSSProperties}>
      <div className="av-hud-topo">
        <b>{v.passeio || 'Viagem'}</b>
        <span className="av-hud-fase">{fase.rotulo}</span>
      </div>
      <p className={`av-hud-sit av-hud-sit-${sit.tom}`}><i aria-hidden="true" />{sit.texto}</p>
      {pct !== null && (
        <div className="av-hud-prog" aria-label={`${pct}% do percurso`}>
          <b style={{ width: `${pct}%` }} /><span>{pct}%</span>
        </div>
      )}
      <dl className="av-hud-kv">
        <div><dt>Falta</dt><dd>{r.restanteM !== null ? formatarDistancia(r.restanteM) : retaM !== null ? `${formatarDistancia(retaM)} em linha reta` : '—'}</dd></div>
        <div><dt>Chegada</dt><dd>{r.chegadaPrevista ? hora(r.chegadaPrevista).split(', ').pop() : '—'}{r.atrasoMin ? <em> +{duracao(r.atrasoMin)}</em> : null}</dd></div>
        <div><dt>Velocidade</dt><dd>{v.posicao?.velocidade != null ? `${v.posicao.velocidade.toFixed(1).replace('.', ',')} km/h` : '—'}</dd></div>
        <div><dt>Sinal</dt><dd className={velho ? 'av-hud-velho' : undefined}>{v.posicao ? tempoRelativo(v.posicao.em) : 'sem posição'}</dd></div>
      </dl>
      <div className="av-hud-leg" aria-label="Legenda">
        <span><i style={{ background: '#5cc49a' }} />Feito</span>
        <span><i className="av-leg-tr" />Planejado</span>
        <span><i style={{ background: '#e3a144', borderRadius: '50%' }} />Destino</span>
        <span><i style={{ background: '#8cc3f2', borderRadius: '50%' }} />Parada</span>
      </div>
    </div>
  );
}

function situacaoRota(v: ViagemAoVivoEDA, r: ReturnType<typeof analisarRota>): { texto: string; tom: 'ok' | 'at' | 'er' | 'nt' } {
  if (!v.posicao) return { texto: 'Aguardando localização de bordo', tom: 'nt' };
  if ((minutosDesde(v.posicao.em) ?? 0) > 120) return { texto: `Sem sinal ${tempoRelativo(v.posicao.em)}`, tom: 'er' };
  if (r.foraDaRota && r.distanciaRotaM !== null) return { texto: `Fora do percurso (${formatarDistancia(r.distanciaRotaM)})`, tom: 'er' };
  if (r.noDestino) return { texto: 'No destino', tom: 'ok' };
  if (r.paradaPrevista) return { texto: `Em parada prevista: ${r.paradaPrevista.nome}`, tom: 'ok' };
  if (r.paradoMin !== null && r.paradoMin >= 15) return { texto: `Parada há ${duracao(r.paradoMin)}${r.noEmbarque ? ' no embarque' : ''}`, tom: r.noEmbarque ? 'at' : 'er' };
  if (r.noEmbarque) return { texto: 'No ponto de embarque', tom: 'nt' };
  if (!r.temRota) return { texto: 'Navegando · percurso não traçado', tom: 'at' };
  return { texto: 'Navegando no percurso', tom: 'ok' };
}

function PercursoEDA({ v }: { v: ViagemAoVivoEDA }) {
  const r = analisarRota(v);
  const fim = destinoViagem(v);
  if (!r.temRota) return (
    <div className="av-rota-info">
      {fim && <div className="av-kv">
        <span>Destino</span><b>{fim.nome || 'Local cadastrado no passeio'}</b>
        {v.posicao && <><span>Distância</span><b>{formatarDistancia(distanciaM(v.posicao, fim))} em linha reta</b></>}
      </div>}
      <p style={{ fontSize: 13, color: 'var(--p-sec)' }}>Percurso ainda não marcado no passeio. Abra o passeio e, em <b>Logística da viagem</b>, marque embarque, caminho pelo rio e destino — assim a EDA avisa se a embarcação sair do caminho ou parar fora do previsto.</p>
      {v.passeio_id && <div className="av-acoes"><Link className="eda-pg-bt" href={`/passeios?abrir=${v.passeio_id}`}>Abrir o passeio</Link></div>}
    </div>
  );
  const pct = r.percorridoM !== null && r.totalM ? Math.min(100, Math.round((r.percorridoM / r.totalM) * 100)) : null;
  const situacao = r.foraDaRota ? 'Fora do percurso' : r.noDestino ? 'No destino' : r.paradaPrevista ? `Em parada prevista: ${r.paradaPrevista.nome}` : r.paradoMin !== null && r.paradoMin >= 15 ? `Parada há ${duracao(r.paradoMin)}` : v.posicao ? 'No percurso' : 'Aguardando localização';
  return (
    <div className="av-rota-info">
      <div className="av-kv">
        {fim?.nome && <><span>Destino</span><b>{fim.nome}</b></>}
        <span>Percurso</span><b>{formatarDistancia(r.totalM)}{(v.rota?.paradas?.length ?? 0) ? ` · ${v.rota?.paradas?.length} parada(s) prevista(s)` : ''}</b>
        <span>Situação</span><b>{situacao}</b>
        {r.restanteM !== null && <><span>Falta</span><b>{formatarDistancia(r.restanteM)}</b></>}
        {r.chegadaPrevista && <><span>Chegada prevista</span><b>{hora(r.chegadaPrevista)}{r.atrasoMin ? ` · atraso de ${duracao(r.atrasoMin)}` : ''}</b></>}
      </div>
      {pct !== null && <div className="av-rota-prog" aria-label={`${pct}% do percurso`}><b style={{ width: `${pct}%` }} /></div>}
    </div>
  );
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
      <ol className="av-etapas" aria-label="Etapas da viagem">
        {etapasViagem(v).map((e) => (
          <li key={e.tipo} className={`av-etapa av-etapa-${e.estado}`} style={{ listStyle: 'none' }}>
            <i aria-hidden="true" />
            <b>{e.rotulo}</b>
            <small>{e.em ? hora(e.em) : e.estado === 'atual' ? 'próxima etapa' : '—'}</small>
          </li>
        ))}
      </ol>

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
        <p className="eda-pg-eb">Percurso planejado</p>
        <PercursoEDA v={v} />
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
            {agruparEventos(v.eventos).map((e) => (
              <li key={e.id} style={{ borderLeftColor: e.gravidade === 'grave' ? '#ef4444' : e.gravidade === 'atencao' ? '#f2c86b' : undefined }}>
                <b>{ROTULO_EVENTO[e.tipo]}{e.texto ? ` — ${e.texto}` : ''}{e.vezes > 1 && <span className="av-vezes" title="Registros repetidos em sequência">{e.vezes}×</span>}</b>
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

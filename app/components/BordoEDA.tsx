'use client';

// EDA_OPERACAO_AO_VIVO_V1: painel de bordo. Quem está na viagem (guia ou
// equipe) transmite a localização e registra embarque, partida, ocorrências,
// suprimentos e emergência. Sem sinal, tudo fica guardado no aparelho e é
// enviado sozinho quando a conexão (Starlink, wi-fi ou celular) voltar.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  distanciaM, enfileirarEvento, enfileirarPonto, enviarFila, ROTULO_EVENTO, tamanhoFila,
  type GravidadeEDA, type PontoFila, type TipoEventoEDA,
} from '@/lib/operacaoAoVivoEDA';

const INTERVALO_MS = 2 * 60_000;   // ponto a cada 2 min parado…
const DISTANCIA_M = 150;           // …ou a cada 150 m andados
const ENVIO_MS = 60_000;

type Bateria = { level: number; addEventListener?: (t: string, f: () => void) => void };
type WakeLock = { release: () => Promise<void> };

export default function BordoEDA({ reservaId, titulo, compacto = false }: { reservaId: string; titulo?: string; compacto?: boolean }) {
  const [ativo, setAtivo] = useState(false);
  const [fila, setFila] = useState(0);
  const [ultimo, setUltimo] = useState<{ em: string; precisao?: number } | null>(null);
  const [aviso, setAviso] = useState('');
  const [texto, setTexto] = useState('');
  const [tipoTexto, setTipoTexto] = useState<'ocorrencia' | 'suprimento' | 'nota' | null>(null);
  const [confirmarSos, setConfirmarSos] = useState(false);
  const watch = useRef<number | null>(null);
  const ultimoPonto = useRef<PontoFila | null>(null);
  const bateria = useRef<number | undefined>(undefined);
  const trava = useRef<WakeLock | null>(null);
  const chaveAtivo = `eda.bordo.ativo.${reservaId}`;

  const enviar = useCallback(async () => {
    const r = await enviarFila(reservaId);
    setFila(r.restam);
    if (r.erro) setAviso(r.erro); else if (r.restam === 0) setAviso('');
  }, [reservaId]);

  const manterTelaAcesa = useCallback(async () => {
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLock> } };
      if (nav.wakeLock && document.visibilityState === 'visible') trava.current = await nav.wakeLock.request('screen');
    } catch { /* não suportado */ }
  }, []);

  const parar = useCallback(() => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    void trava.current?.release().catch(() => undefined);
    trava.current = null;
    setAtivo(false);
    try { localStorage.removeItem(chaveAtivo); } catch { /* */ }
    void enviar();
  }, [chaveAtivo, enviar]);

  const iniciar = useCallback(() => {
    if (!('geolocation' in navigator)) { setAviso('Este aparelho não informa localização.'); return; }
    if (watch.current !== null) return;
    watch.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p: PontoFila = {
          lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)),
          precisao: Math.round(pos.coords.accuracy),
          velocidade: pos.coords.speed != null && pos.coords.speed >= 0 ? Number((pos.coords.speed * 3.6).toFixed(1)) : undefined,
          rumo: pos.coords.heading != null && !Number.isNaN(pos.coords.heading) ? Math.round(pos.coords.heading) : undefined,
          bateria: bateria.current, em: new Date(pos.timestamp).toISOString(),
        };
        const ant = ultimoPonto.current;
        const passou = !ant || Date.parse(p.em) - Date.parse(ant.em) >= INTERVALO_MS || distanciaM(ant, p) >= DISTANCIA_M;
        if (!passou || (p.precisao ?? 0) > 2000) return;
        ultimoPonto.current = p;
        enfileirarPonto(reservaId, p);
        setUltimo({ em: p.em, precisao: p.precisao });
        setFila(tamanhoFila(reservaId));
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setAviso('Localização bloqueada. Libere a localização para este site nas configurações do navegador.');
          parar();
        } else setAviso('Procurando sinal de GPS…');
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 60_000 },
    );
    setAtivo(true);
    try { localStorage.setItem(chaveAtivo, '1'); } catch { /* */ }
    void manterTelaAcesa();
  }, [chaveAtivo, manterTelaAcesa, parar, reservaId]);

  // Bateria (quando o navegador informa), retomada automática e envio periódico.
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<Bateria> };
    nav.getBattery?.().then((b) => {
      const ler = () => { bateria.current = Math.round(b.level * 100); };
      ler(); b.addEventListener?.('levelchange', ler);
    }).catch(() => undefined);
    setFila(tamanhoFila(reservaId));
    let retomar = false;
    try { retomar = localStorage.getItem(chaveAtivo) === '1'; } catch { /* */ }
    const t0 = retomar ? window.setTimeout(iniciar, 0) : undefined;
    const t = window.setInterval(() => { if (tamanhoFila(reservaId)) void enviar(); }, ENVIO_MS);
    const online = () => void enviar();
    const visivel = () => { if (document.visibilityState === 'visible') { void enviar(); if (watch.current !== null) void manterTelaAcesa(); } };
    window.addEventListener('online', online);
    document.addEventListener('visibilitychange', visivel);
    void enviar();
    return () => {
      window.clearTimeout(t0); window.clearInterval(t);
      window.removeEventListener('online', online); document.removeEventListener('visibilitychange', visivel);
      if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
      watch.current = null;
      void trava.current?.release().catch(() => undefined);
    };
  }, [chaveAtivo, enviar, iniciar, manterTelaAcesa, reservaId]);

  function registrar(tipo: TipoEventoEDA, detalhe?: string, gravidade?: GravidadeEDA) {
    const p = ultimoPonto.current;
    enfileirarEvento(reservaId, { tipo, texto: detalhe, gravidade, lat: p?.lat, lng: p?.lng, em: new Date().toISOString() });
    setFila(tamanhoFila(reservaId));
    setAviso(`${ROTULO_EVENTO[tipo]} registrado${navigator.onLine ? '' : ' (será enviado quando o sinal voltar)'}.`);
    void enviar();
  }

  function enviarTexto() {
    if (!tipoTexto || texto.trim().length < 2) return;
    registrar(tipoTexto, texto.trim().slice(0, 500));
    setTexto(''); setTipoTexto(null);
  }

  return (
    <div className={`bd ${compacto ? 'bd-compacto' : ''}`}>
      <div className="bd-topo">
        <span className={`bd-led ${ativo ? 'bd-led-on' : ''}`} aria-hidden="true" />
        <div className="bd-tit">
          <b>{titulo ?? 'Painel de bordo'}</b>
          <small>
            {ativo ? `Transmitindo localização${ultimo ? ` · último ponto ${new Date(ultimo.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ' · aguardando GPS'}` : 'Localização desligada'}
            {fila > 0 && ` · ${fila} aguardando envio`}
          </small>
        </div>
        {ativo
          ? <button type="button" className="eda-pg-bt" onClick={parar}>Parar</button>
          : <button type="button" className="eda-pg-bt eda-pg-bt-ouro" onClick={iniciar}>Transmitir localização</button>}
      </div>

      <div className="bd-etapas" role="group" aria-label="Etapas da viagem">
        {(['embarque', 'partida', 'parada', 'chegada', 'retorno'] as TipoEventoEDA[]).map((t) => (
          <button key={t} type="button" className="eda-pg-bt" onClick={() => registrar(t)}>{ROTULO_EVENTO[t]}</button>
        ))}
      </div>

      <div className="bd-etapas" role="group" aria-label="Registrar">
        <button type="button" className={`eda-pg-bt ${tipoTexto === 'ocorrencia' ? 'bd-sel' : ''}`} onClick={() => setTipoTexto('ocorrencia')}>Ocorrência</button>
        <button type="button" className={`eda-pg-bt ${tipoTexto === 'suprimento' ? 'bd-sel' : ''}`} onClick={() => setTipoTexto('suprimento')}>Suprimento acabando</button>
        <button type="button" className={`eda-pg-bt ${tipoTexto === 'nota' ? 'bd-sel' : ''}`} onClick={() => setTipoTexto('nota')}>Nota</button>
        <button type="button" className="eda-pg-bt" onClick={() => registrar('resolvido')}>Tudo resolvido</button>
      </div>
      {tipoTexto && (
        <div className="bd-texto">
          <input value={texto} maxLength={500} autoFocus onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') enviarTexto(); }}
            placeholder={tipoTexto === 'suprimento' ? 'Ex.: gelo acaba amanhã; faltam 20 L de gasolina' : tipoTexto === 'ocorrencia' ? 'Ex.: chuva forte, paramos na praia do Aracá' : 'Escreva a nota'} />
          <button type="button" className="eda-pg-bt eda-pg-bt-ouro" onClick={enviarTexto}>Enviar</button>
          <button type="button" className="eda-pg-bt" onClick={() => { setTipoTexto(null); setTexto(''); }}>Cancelar</button>
        </div>
      )}

      {confirmarSos ? (
        <div className="bd-sos-conf">
          <b>Confirmar emergência?</b>
          <span>A operadora é alertada na hora, com a sua última localização.</span>
          <div>
            <button type="button" className="bd-sos" onClick={() => { registrar('emergencia', texto.trim() || undefined, 'grave'); setConfirmarSos(false); if (!ativo) iniciar(); }}>Sim, é emergência</button>
            <button type="button" className="eda-pg-bt" onClick={() => setConfirmarSos(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button type="button" className="bd-sos" onClick={() => setConfirmarSos(true)}>Emergência</button>
      )}

      {aviso && <p className="bd-aviso" role="status">{aviso}</p>}
      {!compacto && (
        <p className="bd-nota">
          Mantenha esta tela aberta durante a viagem: o navegador só envia a localização com a página aberta. Sem sinal no rio, os pontos ficam guardados no aparelho e sobem sozinhos quando a conexão voltar.
        </p>
      )}

      <style jsx>{`
        .bd { display: grid; gap: 10px; padding: 14px; border-radius: 16px; border: 1px solid var(--ern-borda, rgba(255,255,255,.12)); }
        .bd-topo { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .bd-tit { display: grid; flex: 1; min-width: 160px; } .bd-tit small { font-size: 12px; color: var(--ern-secundario, #b4c8bb); }
        .bd-led { width: 12px; height: 12px; border-radius: 50%; background: #6b7280; flex: none; }
        .bd-led-on { background: #22c55e; box-shadow: 0 0 0 0 rgba(34,197,94,.6); animation: bd-pulso 1.8s infinite; }
        @keyframes bd-pulso { 70% { box-shadow: 0 0 0 10px rgba(34,197,94,0); } 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); } }
        .bd-etapas { display: flex; flex-wrap: wrap; gap: 6px; }
        .bd-sel { outline: 2px solid #e3a144; }
        .bd-texto { display: flex; flex-wrap: wrap; gap: 6px; }
        .bd-texto input { flex: 1; min-width: 200px; min-height: 40px; padding: 0 12px; border-radius: 12px; border: 1px solid var(--ern-borda); background: transparent; color: inherit; }
        .bd-sos { min-height: 44px; padding: 0 18px; border-radius: 12px; border: 0; background: #dc2626; color: #fff; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; cursor: pointer; justify-self: start; }
        .bd-sos-conf { display: grid; gap: 6px; padding: 12px; border-radius: 12px; border: 1px solid #dc2626; }
        .bd-sos-conf span { font-size: 12px; color: var(--ern-secundario, #b4c8bb); } .bd-sos-conf div { display: flex; gap: 8px; flex-wrap: wrap; }
        .bd-aviso { margin: 0; font-size: 13px; color: #f4c77e; }
        .bd-nota { margin: 0; font-size: 12px; color: var(--ern-secundario, #b4c8bb); }
        .bd-compacto { padding: 10px; }
      `}</style>
    </div>
  );
}

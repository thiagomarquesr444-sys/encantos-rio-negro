'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map as Mapa, LayerGroup, Marker, Circle } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LOCALIDADES_RIO_NEGRO } from '@/app/components/territorioRioNegroERN';
import { useModulosEquipeERN } from '@/app/components/ModulosEquipeERN';

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const locais = Array.from(new Map(
  LOCALIDADES_RIO_NEGRO
    .filter(p => Number.isFinite(p.coordenadas[0]) &&
      Number.isFinite(p.coordenadas[1]))
    .map(p => [
      `${normalizar(p.nome)}|${p.municipio}|${p.coordenadas.join(',')}`,
      p,
    ])
).values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

type Posicao = {
  lat: number;
  lng: number;
  precisao: number;
  instante: number;
};

export default function MapaPage() {
  const acesso = useModulosEquipeERN();
  if (acesso.carregando) {
    return <main className="p-6" role="status">Preparando acesso ao Mapa ERN…</main>;
  }
  if (acesso.erro || !acesso.modulos.has('mapa')) {
    return <main className="p-6" role="alert">
      {acesso.erro
        ? 'Não foi possível conferir seu acesso. Recarregue a página.'
        : 'Seu perfil não possui acesso ao mapa.'}
    </main>;
  }
  return <MapaOperacional />;
}

function MapaOperacional() {
  const recipiente = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const mapa = useRef<Mapa | null>(null);
  const biblioteca = useRef<typeof import('leaflet') | null>(null);
  const pontos = useRef<LayerGroup | null>(null);
  const marcadorGPS = useRef<Marker | null>(null);
  const areaGPS = useRef<Circle | null>(null);
  const alvo = useRef<LayerGroup | null>(null);
  const seguindo = useRef(false);

  const [topo, setTopo] = useState(82);
  const [pronto, setPronto] = useState(false);
  const [erroMapa, setErroMapa] = useState('');
  const [tentativa, setTentativa] = useState(0);
  // ERN_MAPA_REFINADO_V2
  const [busca, setBusca] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [noturno, setNoturno] = useState(true);
  const [destinoId, setDestinoId] = useState('');
  const [painel, setPainel] = useState(true);
  const [gps, setGPS] = useState(false);
  const [bordo, setBordo] = useState(false);
  const [seguir, setSeguir] = useState(false);
  const [posicao, setPosicao] = useState<Posicao | null>(null);
  const [erroGPS, setErroGPS] = useState('');
  const [agora, setAgora] = useState(Date.now());

  const destino = locais.find(p => p.id === destinoId);
  const resultados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return locais.filter(p =>
      (!municipio || p.municipio === municipio) &&
      (!termo || normalizar(`${p.nome} ${p.municipio}`).includes(termo))
    );
  }, [busca, municipio]);

  const recente = !!posicao &&
    agora - posicao.instante >= -5000 &&
    agora - posicao.instante <= 45000;
  const confiavel = recente && !!posicao &&
    posicao.precisao <= 100 && !erroGPS && gps;

  useEffect(() => {
    seguindo.current = seguir;
  }, [seguir]);

  useEffect(() => {
    const cabecalho = document.querySelector('.ern-navegacao-ilustrada');
    const medir = () => {
      setTopo(Math.max(0, cabecalho?.getBoundingClientRect().bottom ?? 82));
    };
    const observador = new ResizeObserver(medir);
    if (cabecalho) observador.observe(cabecalho);
    window.addEventListener('resize', medir);
    medir();
    return () => {
      observador.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, []);

  useEffect(() => {
    let encerrado = false;
    let instancia: Mapa | null = null;
    let tamanho: ResizeObserver | null = null;
    setPronto(false);
    setErroMapa('');

    async function iniciar() {
      try {
        const L = await import('leaflet');
        if (encerrado || !canvas.current) return;
        biblioteca.current = L;
        instancia = L.map(canvas.current, {
          preferCanvas: true,
          zoomControl: false,
          minZoom: 3,
          maxZoom: 18,
        });
        mapa.current = instancia;

        L.control.zoom({ position: 'topright' }).addTo(instancia);
        L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(instancia);

        const base = L.tileLayer(
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
            keepBuffer: 1,
            updateWhenIdle: true,
          }
        ).addTo(instancia);

        base.on('tileerror', () => {
          if (!encerrado) setErroMapa(
            'Algumas imagens do mapa não carregaram. Confira sua conexão.'
          );
        });

        pontos.current = L.layerGroup().addTo(instancia);
        alvo.current = L.layerGroup().addTo(instancia);

        for (const local of locais) {
          const texto = document.createElement('span');
          texto.textContent = `${local.nome} · ${local.municipio}`;
          L.circleMarker(local.coordenadas, {
            radius: local.categoria === 'Cidade' ? 7 : 4,
            color: '#133a31',
            weight: 1,
            fillColor: local.categoria === 'Cidade' ? '#efb655' : '#438e78',
            fillOpacity: .85,
          })
            .bindTooltip(texto)
            .on('click', () => {
              setDestinoId(local.id);
              setPainel(true);
              setSeguir(false);
            })
            .addTo(pontos.current);
        }

        instancia.fitBounds(
          L.latLngBounds(locais.map(p => p.coordenadas)),
          { padding: [30, 30], animate: false }
        );

        instancia.on('dragstart', () => {
          seguindo.current = false;
          setSeguir(false);
        });

        tamanho = new ResizeObserver(() => instancia?.invalidateSize());
        tamanho.observe(canvas.current);
        setPronto(true);
      } catch {
        if (!encerrado) setErroMapa('Não foi possível abrir o mapa.');
      }
    }

    void iniciar();
    return () => {
      encerrado = true;
      tamanho?.disconnect();
      instancia?.remove();
      mapa.current = null;
      pontos.current = null;
      alvo.current = null;
      marcadorGPS.current = null;
      areaGPS.current = null;
    };
  }, [tentativa]);

  useEffect(() => {
    const L = biblioteca.current;
    if (!pronto || !L || !alvo.current) return;
    alvo.current.clearLayers();
    if (!destino) return;
    const texto = document.createElement('span');
    texto.textContent = `Destino: ${destino.nome}`;
    L.circleMarker(destino.coordenadas, {
      radius: 13, color: '#fff4cd', weight: 3,
      fillColor: '#da951b', fillOpacity: 1,
    }).bindTooltip(texto, {
      permanent: true, direction: 'top', offset: [0, -14],
    }).addTo(alvo.current);
  }, [destino, pronto]);

  useEffect(() => {
    if (!gps) return;
    let ativo = true;
    let identificador: number | undefined;

    if (!window.isSecureContext || !navigator.geolocation) {
      setErroGPS('Localização indisponível: use HTTPS ou localhost e um aparelho compatível.');
      return;
    }

    const relogio = window.setInterval(() => setAgora(Date.now()), 1000);
    const atualizarRelogio = () => setAgora(Date.now());
    document.addEventListener('visibilitychange', atualizarRelogio);

    try {
      identificador = navigator.geolocation.watchPosition(
        leitura => {
          if (!ativo) return;
          const { latitude, longitude, accuracy } = leitura.coords;
          if (
            !Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
            !Number.isFinite(longitude) || Math.abs(longitude) > 180 ||
            !Number.isFinite(accuracy) || accuracy < 0 ||
            !Number.isFinite(leitura.timestamp)
          ) {
            setErroGPS('O aparelho retornou uma leitura inválida.');
            return;
          }
          setErroGPS('');
          setAgora(Date.now());
          setPosicao({
            lat: latitude, lng: longitude,
            precisao: accuracy, instante: leitura.timestamp,
          });
        },
        falha => {
          if (ativo) setErroGPS(
            falha.code === 1
              ? 'Permissão de localização negada. Autorize nas configurações do navegador.'
              : 'Sem uma nova localização válida. A última posição não representa acompanhamento ativo.'
          );
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    } catch {
      setErroGPS('Não foi possível iniciar a localização.');
    }

    return () => {
      ativo = false;
      if (identificador !== undefined) navigator.geolocation.clearWatch(identificador);
      window.clearInterval(relogio);
      document.removeEventListener('visibilitychange', atualizarRelogio);
    };
  }, [gps]);

  useEffect(() => {
    const L = biblioteca.current;
    const m = mapa.current;
    if (!pronto || !L || !m) return;

    if (!posicao || !gps) {
      marcadorGPS.current?.remove();
      areaGPS.current?.remove();
      marcadorGPS.current = null;
      areaGPS.current = null;
      return;
    }

    const coordenadas: [number, number] = [posicao.lat, posicao.lng];
    const simbolo = bordo
      ? '<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><path d="M5 19h22l-5 8H10z" fill="#fff"/><path d="M11 17V9h10v8M16 3v6" fill="none" stroke="#fff" stroke-width="2"/></svg>'
      : '<span aria-hidden="true">●</span>';

    const icone = L.divIcon({
      className: 'ern-posicao-icone',
      html: `<div class="ern-posicao-corpo ${bordo && confiavel ? 'ern-bordo-vivo' : ''}" style="opacity:${confiavel ? 1 : .55}">${simbolo}</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    if (!marcadorGPS.current) {
      marcadorGPS.current = L.marker(coordenadas, {
        icon: icone,
        zIndexOffset: 1500,
        title: 'Posição deste aparelho',
      }).addTo(m);
      areaGPS.current = L.circle(coordenadas, {
        radius: posicao.precisao,
        color: '#246bd7', weight: 1, fillOpacity: .08,
      }).addTo(m);
    } else {
      marcadorGPS.current.setLatLng(coordenadas).setIcon(icone);
      areaGPS.current?.setLatLng(coordenadas).setRadius(posicao.precisao);
    }

    if (seguindo.current && recente && posicao.precisao <= 2000 && !erroGPS) {
      m.panTo(coordenadas, { animate: false });
    }
  }, [posicao, gps, bordo, confiavel, pronto, seguir]);

  function iniciar(bordoEscolhido: boolean) {
    setBordo(bordoEscolhido);
    setErroGPS('');
    setSeguir(true);
    seguindo.current = true;
    setGPS(true);
  }

  // ERN_NAVEGACAO_BUSCA_V3
  useEffect(() => {
    if (!pronto) return;

    const preparar = (valor: string) => valor.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim().replace(/\s+/g, ' ');

    const termo = preparar(busca);
    if (!termo) return;

    const cidade = locais.find(p =>
      p.categoria === 'Cidade' && preparar(p.nome) === termo
    );

    if (!cidade) return;

    const tarefa = window.setTimeout(() => {
      setMunicipio(cidade.municipio);
      setDestinoId(cidade.id);
      setSeguir(false);
      seguindo.current = false;
      mapa.current?.setView(cidade.coordenadas, 12, { animate: false });
    }, 650);

    return () => window.clearTimeout(tarefa);
  }, [busca, pronto]);

  function verDestino() {
    if (!destino || !mapa.current) return;
    setSeguir(false);
    seguindo.current = false;
    mapa.current.setView(destino.coordenadas, 13, { animate: false });
  }

  async function telaCheia() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (recipiente.current?.requestFullscreen) await recipiente.current.requestFullscreen();
      else setErroMapa('Este navegador não oferece tela cheia; o mapa permanece ampliado.');
    } catch {
      setErroMapa('Não foi possível ativar a tela cheia.');
    }
  }

  return (
    <main ref={recipiente} className={`ern-mapa-operacional ${noturno ? "ern-mapa-noturno" : ""}`}
      style={{ top: topo }} aria-label="Mapa operacional ERN">
      <div ref={canvas} className="ern-cartografia" aria-label="Mapa interativo de localidades" />
      <div className="ern-barra-mapa">
        <div><strong>Mapa ERN</strong><small>Território · destino · acompanhamento</small></div>
        <button onClick={() => setPainel(!painel)} aria-expanded={painel}
          aria-controls="ern-operacao-controles">
          {painel ? 'Recolher painel' : 'Abrir painel'}
        </button>
        <button onClick={() => setNoturno(v => !v)} aria-pressed={noturno}>
          {noturno ? 'Base original' : 'Modo noturno'}
        </button>
        <button onClick={telaCheia}>Tela cheia</button>
      </div>

      {painel && <aside id="ern-operacao-controles" className="ern-painel-mapa">
        <p className="ern-selo">SUA OPERAÇÃO NO RIO NEGRO</p>
        <h1>Escolha seu destino</h1>
        <label htmlFor="ern-busca">Buscar localidade ou município</label>
        <input id="ern-busca" value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Barcelos, Moura, Novo Airão…" />
        <label htmlFor="ern-municipio">Filtrar lista por município</label>
        <select id="ern-municipio" value={municipio}
          onChange={e => setMunicipio(e.target.value)}>
          <option value="">Todos os municípios cadastrados</option>
          {Array.from(new Set(locais.map(p => p.municipio))).sort().map(nome =>
            <option key={nome} value={nome}>{nome}</option>
          )}
        </select>

        <div className="ern-lista-cabecalho">
          <strong>Localidades</strong>
          <span>{resultados.length} encontradas</span>
        </div>
        <ul className="ern-resultados-destino" aria-label="Resultados de localidades">
          {resultados.slice(0, 30).map(p => (
            <li key={p.id}>
              <button
                aria-pressed={destinoId === p.id}
                onClick={() => {
                  setDestinoId(p.id);
                  setSeguir(false);
                  seguindo.current = false;
                  mapa.current?.setView(p.coordenadas, 13, { animate: false });
                }}>
                <span className="ern-local-indicador" aria-hidden="true">↗</span>
                <span>
                  <strong>{p.nome}</strong>
                  <small>{p.municipio} · {p.categoria}</small>
                </span>
                {destinoId === p.id && <span className="ern-local-selecionado">Destino</span>}
              </button>
            </li>
          ))}
        </ul>
        {resultados.length === 0 && <p role="status">Nenhuma localidade encontrada. Ajuste a busca.</p>}
        {resultados.length > 30 && <p className="ern-ajuda-busca">
          Exibindo os primeiros 30 resultados. Digite o nome para refinar.
          As demais localidades continuam representadas no mapa.
        </p>}

        {destino && <div className="ern-destino-resumo">
          <strong>{destino.nome}</strong>
          <small>{destino.municipio} · {destino.categoria}</small>
          <small>{destino.coordenadas.map(n => n.toFixed(5)).join(', ')}</small>
          <button onClick={verDestino}>Mostrar destino</button>
        </div>}

        <div className="ern-acoes-mapa">
          <button onClick={() => iniciar(false)} aria-pressed={gps && !bordo}>
            Minha posição
          </button>
          <button className="ern-principal" onClick={() => iniciar(true)}
            aria-pressed={gps && bordo}>Estou a bordo</button>
          <button disabled={!gps || !posicao} aria-pressed={seguir}
            onClick={() => {
              setSeguir(v => !v);
              seguindo.current = !seguir;
            }}>
            {seguir ? 'Pausar seguimento' : 'Seguir embarcação / aparelho'}
          </button>
          <button disabled={!gps} onClick={() => {
            setGPS(false); setSeguir(false); setBordo(false);
            seguindo.current = false;
            setPosicao(null); setErroGPS('');
          }}>Parar localização</button>
        </div>

        <div className="ern-sinal" role="status">
          <strong>{!gps ? 'Localização desligada'
            : erroGPS ? 'Localização exige atenção'
            : !posicao ? 'Aguardando localização…'
            : !recente ? 'Última posição desatualizada'
            : !confiavel ? 'Localização com baixa precisão'
            : bordo ? 'A bordo · sinal recente' : 'Aparelho · sinal recente'}</strong>
          {erroGPS && <p>{erroGPS}</p>}
          {posicao && <>
            <small>Precisão informada: ±{Math.round(posicao.precisao)} m</small>
            <small>Última leitura: {new Date(posicao.instante).toLocaleTimeString('pt-BR')}</small>
            <small>{posicao.lat.toFixed(5)}, {posicao.lng.toFixed(5)}</small>
          </>}
        </div>

        <details>
          <summary>Fontes e alcance do mapa</summary>
          <p>Referências territoriais do IBGE nos seis municípios cadastrados.
            Os pontos não indicam atracação ou acesso autorizado.
            Não há cálculo de caminho navegável ou profundidade.</p>
          <p>A posição é deste aparelho, sem envio ao banco. Não há garantia de
            acompanhamento com a tela bloqueada ou o navegador em segundo plano.</p>
          <a href="https://turismo.barcelos.am.gov.br/" target="_blank" rel="noopener noreferrer">Turismo em Barcelos ↗</a>
          <a href="https://sgb.gov.br/sace/" target="_blank" rel="noopener noreferrer">Monitoramento hidrológico · SGB ↗</a>
          <a href="https://www.marinha.mil.br/chm/dados-do-segnav-cartas-nauticas" target="_blank" rel="noopener noreferrer">Cartas náuticas · CHM ↗</a>
          <a href="https://www.marinha.mil.br/chm/dados-do-segnav-aviso-aos-navegantes-tela" target="_blank" rel="noopener noreferrer">Avisos aos Navegantes ↗</a>
        </details>
      </aside>}

      {!pronto && !erroMapa && <div className="ern-aviso-mapa" role="status">Abrindo o território ERN…</div>}
      {erroMapa && <div className="ern-aviso-mapa" role="alert">
        {erroMapa}
        {!pronto && <button onClick={() => setTentativa(v => v + 1)}>Tentar novamente</button>}
      </div>}

      <style jsx global>{`
        .ern-mapa-operacional{position:fixed;left:0;right:0;bottom:0;z-index:20;isolation:isolate;overflow:hidden;background:#10251e;color:#fff8e9;font-family:var(--font-work-sans),sans-serif}
        .ern-mapa-operacional:fullscreen{top:0!important;height:100%;width:100%}
        .ern-cartografia{position:absolute;inset:0;z-index:0}
        .ern-barra-mapa{position:absolute;top:14px;left:14px;right:68px;z-index:1001;display:flex;align-items:center;gap:8px;pointer-events:none}
        .ern-barra-mapa>*{pointer-events:auto}
        .ern-barra-mapa>div{background:#0a211eed;border:1px solid #d9b16b66;border-radius:14px;padding:12px 16px;margin-right:auto}
        .ern-mapa-operacional small{display:block;font-size:11px;line-height:1.7;color:#c6d8ce}
        .ern-mapa-operacional button{min-height:44px;border:1px solid #d5c7a066;background:#102b26;color:#fff8e9;border-radius:10px;padding:8px 12px;font:600 12px var(--font-work-sans),sans-serif;cursor:pointer}
        .ern-mapa-operacional button:disabled{opacity:.45;cursor:default}
        .ern-mapa-operacional button.ern-principal{background:#edbb65;color:#241c0b;border-color:#edbb65}
        .ern-mapa-operacional :is(button,input,select,a,summary):focus-visible{outline:3px solid #ffd68a;outline-offset:3px}
        .ern-painel-mapa{position:absolute;z-index:1001;left:14px;top:92px;bottom:38px;width:330px;overflow:auto;overscroll-behavior:contain;border:1px solid #caa66366;border-radius:18px;background:#0a211ef5;padding:18px;box-shadow:0 15px 45px #0005}
        .ern-selo{font-size:9px;letter-spacing:.16em;color:#f2c97e}
        .ern-painel-mapa h1{font:500 25px var(--font-fraunces),serif;margin:8px 0 18px}
        .ern-painel-mapa label{display:block;font-size:11px;margin:12px 0 6px;color:#d6e3d9}
        .ern-painel-mapa :is(input,select){box-sizing:border-box;min-height:46px;width:100%;min-width:0;border:1px solid #ffffff38;border-radius:10px;padding:10px;background:#122e29;color:#fff8e9;font-size:13px}
        .ern-destino-resumo,.ern-sinal{margin-top:16px;padding:12px;border:1px solid #d4b37155;border-radius:12px;background:#18372d}
        .ern-destino-resumo strong,.ern-sinal strong{font-size:13px}
        .ern-destino-resumo button{margin-top:8px;width:100%}
        .ern-acoes-mapa{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}
        .ern-acoes-mapa button{font-size:11px}
        .ern-sinal p,.ern-painel-mapa details p{font-size:11px;line-height:1.7}
        .ern-painel-mapa details{margin-top:18px;font-size:12px}
        .ern-painel-mapa summary{min-height:36px;cursor:pointer}
        .ern-painel-mapa a{display:flex;align-items:center;min-height:44px;font-size:11px;color:#f3ce8a;text-decoration:underline}
        .ern-aviso-mapa{position:absolute;bottom:40px;right:16px;z-index:1002;max-width:min(360px,85%);padding:12px;border-radius:12px;background:#122a24;color:#fff;font-size:12px}
        .ern-posicao-icone{background:none;border:0}
        .ern-posicao-corpo{width:40px;height:40px;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#1765c1;color:white;box-sizing:border-box;box-shadow:0 2px 10px #0007}
        .ern-bordo-vivo{animation:ern-bordo-pulso 1.8s ease-out infinite}
        @keyframes ern-bordo-pulso{0%,100%{box-shadow:0 0 0 0 #268cf099}60%{box-shadow:0 0 0 17px #268cf000}}
        @media(prefers-reduced-motion:reduce){.ern-bordo-vivo{animation:none;outline:3px solid #69caff}}
        @media(max-width:767px){
          .ern-barra-mapa{top:10px;left:10px;right:56px;flex-wrap:wrap}
          .ern-barra-mapa>div{width:100%;padding:8px 12px}
          .ern-barra-mapa button{min-height:40px;padding:7px 10px;font-size:11px}
          .ern-painel-mapa{left:10px;right:10px;top:auto;bottom:32px;width:auto;max-height:43%;padding:14px;border-radius:16px}
          .ern-painel-mapa h1{font-size:22px;margin-bottom:10px}
          .ern-aviso-mapa{top:125px;bottom:auto;right:10px}
        }
        /* ERN_MAPA_REFINADO_V2 */
        .ern-mapa-operacional{background:#071d22}
        .ern-mapa-noturno .leaflet-tile-pane{
          filter:invert(1) hue-rotate(180deg) brightness(.72) saturate(.6);
        }
        .ern-mapa-operacional .leaflet-container{background:#11282d}
        .ern-barra-mapa{top:16px;left:16px;right:70px;gap:8px}
        .ern-barra-mapa>div{
          border:1px solid #d7c28b55;
          border-radius:12px;background:#081d24f5;
          box-shadow:0 8px 28px #0004;
        }
        .ern-barra-mapa strong{font-size:17px;letter-spacing:-.02em}
        .ern-barra-mapa small{font-size:10px;letter-spacing:.04em}
        .ern-mapa-operacional button{
          background:#102c34;border-color:#809d9d55;
          transition:background .15s ease,border-color .15s ease;
        }
        .ern-mapa-operacional button:hover:not(:disabled){
          background:#1a3e47;border-color:#e6c583;
        }
        .ern-painel-mapa{
          top:96px;left:16px;bottom:44px;width:310px;
          padding:17px;border-radius:16px;
          background:linear-gradient(165deg,#0b2530f7,#09241ff7);
          border-color:#c9b47b66;box-shadow:0 18px 48px #0006;
          scrollbar-width:thin;scrollbar-color:#64867c #0a252b;
        }
        .ern-painel-mapa h1{font-size:26px;line-height:1.15;margin:8px 0 15px}
        .ern-painel-mapa :is(input,select){
          background:#071e27;border-color:#75938b55;
          min-height:44px;border-radius:9px;
        }
        .ern-lista-cabecalho{
          display:flex;align-items:center;justify-content:space-between;
          gap:8px;margin:17px 0 8px;font-size:11px;
        }
        .ern-lista-cabecalho>span{color:#b7ccc4;font-size:10px}
        .ern-resultados-destino{
          list-style:none;padding:0;margin:0;max-height:190px;
          overflow:auto;scrollbar-width:thin;
        }
        .ern-resultados-destino li+li{border-top:1px solid #ffffff12}
        .ern-resultados-destino button{
          width:100%;display:flex;align-items:center;gap:10px;
          padding:10px 7px;text-align:left;border:0;border-radius:8px;
          background:transparent;
        }
        .ern-resultados-destino button[aria-pressed=true]{
          background:#d2ad5425;box-shadow:inset 2px 0 #e7bd67;
        }
        .ern-resultados-destino strong{display:block;font-size:11px;line-height:1.5}
        .ern-resultados-destino small{font-size:10px}
        .ern-local-indicador{
          flex-shrink:0;display:grid;place-items:center;
          width:27px;height:27px;border-radius:9px;
          background:#36695e55;color:#eac477;
        }
        .ern-local-selecionado{margin-left:auto;font-size:9px;color:#f2cb80}
        .ern-ajuda-busca{font-size:10px!important;color:#b6c9c3}
        .ern-destino-resumo{
          border-color:#e4bd69;background:#b9903420;
          box-shadow:inset 3px 0 #edbd63;
        }
        .ern-sinal{background:#0a202b;border-color:#759ca35c}
        .ern-acoes-mapa button.ern-principal{
          background:#e7ba69;color:#211b0e;border-color:#e7ba69;
        }
        .ern-acoes-mapa button[aria-pressed=true]{
          outline:1px solid #e7ba69;outline-offset:2px;
        }
        .ern-mapa-operacional .leaflet-control-zoom{
          border:1px solid #c8b78588;box-shadow:0 5px 20px #0005;
        }
        .ern-mapa-operacional .leaflet-control-zoom a{
          background:#102c34;color:#fff4d8;border-color:#708a8455;
        }
        .ern-mapa-operacional .leaflet-tooltip{
          background:#102c34;color:#fff5dc;border:1px solid #e7bd67;
          border-radius:9px;padding:8px 11px;font-size:11px;
        }
        .ern-mapa-operacional .leaflet-control-attribution{
          background:#09242deb;color:#dbe5dc;
        }
        .ern-mapa-operacional .leaflet-control-attribution a{color:#f3d28c}
        .ern-mapa-operacional .leaflet-control-scale-line{
          background:#09242de8;color:#fff4db;border-color:#c9bd8c;
        }
        @media(prefers-reduced-motion:reduce){
          .ern-mapa-operacional button{transition:none}
        }
        @media(max-width:767px){
          .ern-barra-mapa{top:10px;left:10px;right:56px;gap:6px}
          .ern-barra-mapa>div{padding:8px 11px}
          .ern-barra-mapa small{font-size:9px}
          .ern-painel-mapa{
            top:auto;left:10px;right:10px;bottom:32px;
            width:auto;max-height:45%;padding:14px;
          }
          .ern-resultados-destino{max-height:140px}
          .ern-painel-mapa h1{font-size:23px}
        }
      `}</style>
    </main>
  );
}
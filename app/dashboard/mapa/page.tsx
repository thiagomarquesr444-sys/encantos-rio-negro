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
      Number.isFinite(p.coordenadas[1]) && Math.abs(p.coordenadas[0]) <= 90 &&
      Math.abs(p.coordenadas[1]) <= 180)
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
  const painelConteudo = useRef<HTMLDivElement>(null);
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
  // ERN_MAPA_COMPOSICAO_V51_1
  const [aba, setAba] = useState<'territorio' | 'localizacao'>('territorio');
  const [somenteSedes, setSomenteSedes] = useState(false);
  const [busca, setBusca] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [noturno, setNoturno] = useState(true);
  const [destinoId, setDestinoId] = useState('');
  const [avisoDestino, setAvisoDestino] = useState('');
  const [painel, setPainel] = useState(true);
  const [gps, setGPS] = useState(false);
  const [bordo, setBordo] = useState(false);
  const [seguir, setSeguir] = useState(false);
  const [posicao, setPosicao] = useState<Posicao | null>(null);
  const [erroGPS, setErroGPS] = useState('');
  const [agora, setAgora] = useState(0);
  const [limite, setLimite] = useState(30);
  const [gpsPausado, setGPSPausado] = useState(false);
  const [avisoBase, setAvisoBase] = useState('');
  const [emTelaCheia, setEmTelaCheia] = useState(false);

  const destino = locais.find(p => p.id === destinoId);
  const resultados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return locais.filter(p =>
      (!somenteSedes || p.categoria === 'Cidade') &&
      (!municipio || p.municipio === municipio) &&
      (!termo || normalizar(`${p.nome} ${p.municipio}`).includes(termo))
    );
  }, [busca, municipio, somenteSedes]);

  const recente = !gpsPausado && !!posicao &&
    agora - posicao.instante >= -5000 &&
    agora - posicao.instante <= 45000;
  const confiavel = recente && !!posicao &&
    posicao.precisao <= 100 && !erroGPS && gps;

  useEffect(() => {
    setLimite(30);
  }, [busca, municipio, somenteSedes]);

  useEffect(() => {
    const atualizar = () => setEmTelaCheia(document.fullscreenElement === recipiente.current);
    document.addEventListener('fullscreenchange', atualizar);
    return () => document.removeEventListener('fullscreenchange', atualizar);
  }, []);

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
    setAvisoBase('');

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
          if (!encerrado) setAvisoBase(
            'Algumas imagens do mapa não carregaram. Confira sua conexão.'
          );
        });

        pontos.current = L.layerGroup().addTo(instancia);
        alvo.current = L.layerGroup().addTo(instancia);

        if (locais.length) instancia.fitBounds(
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
    const camada = pontos.current;
    const m = mapa.current;
    if (!pronto || !L || !camada || !m) return;
    const desenhar = () => {
      camada.clearLayers();
      const escolher = (local: typeof locais[number]) => {
        setDestinoId(local.id);
        painelConteudo.current?.scrollTo({ top: 0 });
        setPainel(true);
        setAba('territorio');
        seguindo.current = false;
        setSeguir(false);
        m.setView(local.coordenadas, Math.max(13, m.getZoom()), { animate: false });
      };
      const rotulo = (local: typeof locais[number]) => {
        const el = document.createElement('span');
        el.textContent = `${local.nome} · ${local.municipio}`;
        return el;
      };
      // Grade em pixels projetados: agrupa apenas a visualizacao, preserva o catalogo.
      const grupos = new Map<string, typeof locais>();
      for (const local of resultados) {
        if (local.categoria === 'Cidade') {
          L.circleMarker(local.coordenadas, {
            radius: 7, color: '#fff0cd', weight: 2,
            fillColor: '#e3a144', fillOpacity: 1,
          }).bindTooltip(rotulo(local), {
            permanent: m.getZoom() >= 8, direction: 'right', offset: [11, 0],
            className: 'ern-sede-rotulo',
          }).on('click', () => escolher(local)).addTo(camada);
          continue;
        }
        const pixel = m.project(local.coordenadas, m.getZoom());
        const chave = m.getZoom() <= 11
          ? `${Math.floor(pixel.x / 64)}:${Math.floor(pixel.y / 64)}` : local.id;
        const grupo = grupos.get(chave) ?? [];
        grupo.push(local);
        grupos.set(chave, grupo);
      }
      for (const grupo of grupos.values()) {
        if (grupo.length === 1) {
          const local = grupo[0];
          L.circleMarker(local.coordenadas, {
            radius: 4, color: '#0d2421', weight: 1,
            fillColor: '#75c9b0', fillOpacity: .9,
          }).bindTooltip(rotulo(local)).on('click', () => escolher(local)).addTo(camada);
        } else {
          const centro: [number, number] = [
            grupo.reduce((n, l) => n + l.coordenadas[0], 0) / grupo.length,
            grupo.reduce((n, l) => n + l.coordenadas[1], 0) / grupo.length,
          ];
          const quantidade = document.createElement('span');
          quantidade.className = 'ern-grupo-corpo';
          quantidade.textContent = String(grupo.length);
          const dica = document.createElement('span');
          dica.textContent = `${grupo.length} localidades agrupadas. Clique para ampliar.`;
          L.marker(centro, {
            icon: L.divIcon({ className: 'ern-grupo-mapa', html: quantidade,
              iconSize: [38, 38], iconAnchor: [19, 19] }),
            title: `${grupo.length} localidades agrupadas`,
          }).bindTooltip(dica).on('click', () => {
            seguindo.current = false;
            setSeguir(false);
            m.fitBounds(L.latLngBounds(grupo.map(l => l.coordenadas)), {
              padding: [55, 55], maxZoom: Math.min(14, m.getZoom() + 2), animate: false,
            });
          }).addTo(camada);
        }
      }
    };
    desenhar();
    m.on('zoomend', desenhar);
    return () => { m.off('zoomend', desenhar); camada.clearLayers(); };
  }, [resultados, pronto]);

  useEffect(() => {
    const L = biblioteca.current;
    if (!pronto || !L || !alvo.current) return;
    alvo.current.clearLayers();
    mapa.current?.closePopup();
    setAvisoDestino('');
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
    let identificador: number | null = null;
    let geracao = 0;
    const limpar = () => {
      geracao += 1;
      if (identificador !== null) navigator.geolocation.clearWatch(identificador);
      identificador = null;
    };
    const pausar = () => {
      limpar();
      setGPSPausado(true);
      setAgora(Date.now());
    };
    const iniciarLeitura = () => {
      limpar();
      if (!ativo) return;
      if (document.visibilityState === 'hidden') { pausar(); return; }
      setGPSPausado(false);
      setPosicao(null);
      setErroGPS('');
      if (!window.isSecureContext || !navigator.geolocation) {
        setErroGPS('Localização indisponível: use HTTPS ou localhost e um aparelho compatível.');
        setGPS(false);
        seguindo.current = false;
        setSeguir(false);
        return;
      }
      const atual = geracao;
      try {
        identificador = navigator.geolocation.watchPosition(leitura => {
          if (!ativo || atual !== geracao) return;
          const { latitude, longitude, accuracy } = leitura.coords;
          if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
              !Number.isFinite(longitude) || Math.abs(longitude) > 180 ||
              !Number.isFinite(accuracy) || accuracy < 0 ||
              !Number.isFinite(leitura.timestamp)) {
            setErroGPS('O aparelho retornou uma leitura inválida.');
            return;
          }
          setErroGPS('');
          setAgora(Date.now());
          setPosicao({ lat: latitude, lng: longitude,
            precisao: accuracy, instante: leitura.timestamp });
        }, falha => {
          if (!ativo || atual !== geracao) return;
          setAgora(Date.now());
          if (falha.code === 1) {
            limpar();
            setGPS(false);
            setPosicao(null);
            setSeguir(false);
            seguindo.current = false;
            setErroGPS('Permissão negada. Autorize a localização nas configurações do navegador e tente novamente.');
          } else {
            setErroGPS('Sem uma nova localização válida. A última posição é apenas uma referência.');
          }
        }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
      } catch {
        setErroGPS('Não foi possível iniciar a localização. Tente novamente.');
        setGPS(false);
        setSeguir(false);
        seguindo.current = false;
      }
    };
    const visibilidade = () => {
      if (document.visibilityState === 'hidden') pausar();
      else iniciarLeitura();
    };
    const relogio = window.setInterval(() => setAgora(Date.now()), 1000);
    document.addEventListener('visibilitychange', visibilidade);
    window.addEventListener('pagehide', pausar);
    window.addEventListener('pageshow', iniciarLeitura);
    iniciarLeitura();
    return () => {
      ativo = false;
      limpar();
      window.clearInterval(relogio);
      document.removeEventListener('visibilitychange', visibilidade);
      window.removeEventListener('pagehide', pausar);
      window.removeEventListener('pageshow', iniciarLeitura);
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
  }, [posicao, gps, bordo, confiavel, pronto, seguir, recente, erroGPS]);

  function iniciar(bordoEscolhido: boolean) {
    setBordo(bordoEscolhido);
    setErroGPS('');
    setGPSPausado(false);
    setSeguir(true);
    seguindo.current = true;
    setGPS(true);
  }

  function verRegiao() {
    setBusca('');
    setMunicipio('');
    setSomenteSedes(false);
    setDestinoId('');
    setSeguir(false);
    seguindo.current = false;
    const L = biblioteca.current;
    if (L && locais.length) mapa.current?.fitBounds(
      L.latLngBounds(locais.map(p => p.coordenadas)),
      { padding: [40, 40], animate: false }
    );
  }

  function enquadrarResultados() {
    const L = biblioteca.current;
    if (!L || !resultados.length) return;
    setSeguir(false);
    seguindo.current = false;
    mapa.current?.fitBounds(L.latLngBounds(resultados.map(p => p.coordenadas)), {
      padding: [40, 40], maxZoom: 13, animate: false,
    });
  }

  function verDestino() {
    const m = mapa.current;
    const L = biblioteca.current;
    if (!destino || !pronto || !m || !L) {
      setAvisoDestino('Aguarde o mapa carregar e selecione uma localidade.');
      return;
    }
    setSeguir(false);
    seguindo.current = false;
    m.stop();
    m.invalidateSize({ pan: false });
    m.setView(destino.coordenadas, Math.min(18, Math.max(15, m.getZoom())), {
      animate: false,
    });
    const detalhes = document.createElement('div');
    detalhes.className = 'ern-popup-destino-conteudo';
    const titulo = document.createElement('strong');
    titulo.textContent = destino.nome;
    const contexto = document.createElement('p');
    contexto.textContent = `${destino.municipio} · ${destino.categoria}`;
    const coordenadas = document.createElement('p');
    coordenadas.textContent = destino.coordenadas.map(n => n.toFixed(5)).join(', ');
    detalhes.append(titulo, contexto, coordenadas);
    // Conteudo montado com textContent: nomes do catalogo nunca viram HTML.
    L.popup({ className: 'ern-popup-destino', maxWidth: 260,
      offset: [0, -20], autoPanPadding: [24, 24] })
      .setLatLng(destino.coordenadas).setContent(detalhes).openOn(m);
    setAvisoDestino(`Destino em destaque: ${destino.nome}. Detalhes abertos no mapa.`);
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
    <main ref={recipiente} className={`ern-mapa-operacional ${noturno ? "ern-mapa-noturno" : ""} ${painel ? "ern-painel-aberto" : ""}`}
      style={{ top: topo }} aria-label="Mapa operacional ERN">
      <div ref={canvas} className="ern-cartografia" aria-label="Mapa interativo de localidades" />
      <header className="ern-barra-mapa">
        <div className="ern-mapa-titulo"><span className="ern-mapa-emblema" aria-hidden="true">◎</span>
          <div><small className="ern-mapa-kicker">ENCANTOS RIO NEGRO / OPERADORA</small>
            <h1>Centro territorial<span>Alto e Baixo Rio Negro</span></h1></div>
        </div>
        <div className="ern-mapa-metricas" aria-label="Resumo do catálogo">
          <div><strong>{locais.length}</strong><small>localidades</small></div>
          <div><strong>{new Set(locais.map(p => p.municipio)).size}</strong><small>municípios</small></div>
          <div><strong>{resultados.length}</strong><small>no filtro</small></div>
        </div>
        <nav className="ern-mapa-comandos" aria-label="Controles do mapa">
          <button onClick={() => setPainel(v => !v)} aria-expanded={painel}
            aria-controls="ern-operacao-controles">{painel ? 'Ocultar painel' : 'Abrir painel'}</button>
          <button onClick={verRegiao} disabled={!pronto}>Ver região</button>
          <button onClick={telaCheia} aria-pressed={emTelaCheia}>
            {emTelaCheia ? 'Sair da tela cheia' : 'Tela cheia'}</button>
        </nav>
      </header>

      <div className="ern-mapa-contexto">
        <div><span className="ern-ponto-sinal" /><strong>{destino ? destino.nome : municipio || 'Visão regional'}</strong>
          <small>{destino ? destino.municipio : 'Explore os agrupamentos para revelar localidades'}</small></div>
        <button onClick={() => setNoturno(v => !v)} aria-pressed={noturno}>
          {noturno ? 'Cartografia original' : 'Cartografia grafite'}</button>
      </div>

      {painel && <aside id="ern-operacao-controles" className="ern-painel-mapa">
        <div className="ern-painel-cabecalho"><p className="ern-selo">EXPLORADOR ERN</p>
          <h2>Seu próximo destino</h2>
          <p>Referências para planejar sua operação.</p></div>
        <div className="ern-mapa-abas" role="group" aria-label="Conteúdo do painel">
          <button aria-pressed={aba === 'territorio'} onClick={() => setAba('territorio')}>Território</button>
          <button aria-pressed={aba === 'localizacao'} onClick={() => setAba('localizacao')}>Localização {gps && '●'}</button>
        </div>
        <div ref={painelConteudo} className="ern-painel-conteudo">
        <div hidden={aba !== 'territorio'}>
        {destino && <div className="ern-destino-resumo">
          <strong>{destino.nome}</strong>
          <small>{destino.municipio} · {destino.categoria}</small>
          <small>{destino.coordenadas.map(n => n.toFixed(5)).join(', ')}</small>
          <button onClick={verDestino} disabled={!pronto}>Ampliar e ver destino</button>
          <p className="ern-destino-confirmacao" role="status" aria-live="polite">{avisoDestino}</p>
        </div>}
        <label htmlFor="ern-busca">Buscar localidade ou município</label>
        <input id="ern-busca" value={busca}
          onChange={e => { setBusca(e.target.value); setDestinoId(''); }}
          placeholder="Barcelos, Moura, Novo Airão…" />
        <label htmlFor="ern-municipio">Município</label>
        <select id="ern-municipio" value={municipio}
          onChange={e => { setMunicipio(e.target.value); setDestinoId(''); }}>
          <option value="">Todos os municípios cadastrados</option>
          {Array.from(new Set(locais.map(p => p.municipio))).sort().map(nome =>
            <option key={nome} value={nome}>{nome}</option>
          )}
        </select>

        <div className="ern-escopo-mapa" role="group" aria-label="Tipo de localidade">
          <button aria-pressed={!somenteSedes} onClick={() => { setSomenteSedes(false); setDestinoId(''); }}>Todas</button>
          <button aria-pressed={somenteSedes} onClick={() => { setSomenteSedes(true); setDestinoId(''); }}>Sedes municipais</button>
        </div>
        <div className="ern-lista-cabecalho">
          <strong>Localidades</strong>
          <span>{resultados.length} encontradas</span>
        </div>
        <div className="ern-ferramentas-busca">
          <button disabled={!pronto || !resultados.length} onClick={enquadrarResultados}>Enquadrar resultados</button>
          {(busca || municipio || somenteSedes) && <button onClick={verRegiao}>Limpar filtros</button>}
        </div>
        <ul className="ern-resultados-destino" aria-label="Resultados de localidades">
          {resultados.slice(0, limite).map(p => (
            <li key={p.id}>
              <button
                aria-pressed={destinoId === p.id}
                onClick={() => {
                  setDestinoId(p.id);
                  painelConteudo.current?.scrollTo({ top: 0 });
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
        {resultados.length > limite && <button className="ern-carregar-locais"
          onClick={() => setLimite(v => v + 30)}>
          Mostrar mais localidades ({Math.min(limite, resultados.length)} de {resultados.length})
        </button>}



        </div>
        <div hidden={aba !== 'localizacao'}>
        <div className="ern-gps-apresentacao"><span aria-hidden="true">⌖</span>
          <h3>Acompanhe sua posição</h3><p>Ative a localização no aparelho que está com você ou a bordo da embarcação.</p></div>
        <div className="ern-acoes-mapa">
          <button onClick={() => iniciar(false)} aria-pressed={gps && !bordo}>
            Minha posição
          </button>
          <button className="ern-principal" onClick={() => iniciar(true)}
            aria-pressed={gps && bordo}>Estou a bordo</button>
          <button disabled={!gps || !posicao || !recente || !!erroGPS || posicao.precisao > 2000} aria-pressed={seguir}
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
          <strong>{erroGPS && !gps ? 'Localização exige atenção'
            : !gps ? 'Localização desligada'
            : gpsPausado ? 'Localização pausada · aba em segundo plano'
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
        </div>
        <div className="ern-painel-rodape"><span className={gps && confiavel ? 'ern-sinal-ativo' : ''} />
          {gps ? (confiavel ? 'GPS com sinal recente' : 'GPS aguardando sinal válido') : 'GPS desligado'}
          <button onClick={() => setAba(aba === 'territorio' ? 'localizacao' : 'territorio')}>
            {aba === 'territorio' ? 'Abrir GPS ↗' : 'Ver território ↗'}</button></div>
      </aside>}

      {avisoBase && <div className="ern-aviso-base" role="status">
        {avisoBase} <button onClick={() => setTentativa(v => v + 1)}>Recarregar mapa</button>
      </div>}
      <div className="ern-legenda-mapa" aria-label="Legenda do mapa">
        <span><i className="ern-legenda-cidade" />Sede municipal</span>
        <span><i className="ern-legenda-local" />Localidade</span>
        <span><i className="ern-legenda-grupo" />Grupo · clique para ampliar</span>
        <span><i className="ern-legenda-gps" />Aparelho</span>
      </div>
      {!pronto && !erroMapa && <div className="ern-aviso-mapa" role="status">Abrindo o território ERN…</div>}
      {erroMapa && <div className="ern-aviso-mapa" role="alert">
        {erroMapa}
        {!pronto && <button onClick={() => setTentativa(v => v + 1)}>Tentar novamente</button>}
      </div>}

      <style jsx global>{`
        .ern-mapa-operacional{--ern-lateral:340px;--ern-barra:96px;position:fixed;left:0;right:0;bottom:0;z-index:20;isolation:isolate;overflow:hidden;background:#101719;color:#eaf0ed;font-family:var(--font-work-sans),sans-serif}
        .ern-mapa-operacional:fullscreen{inset:0!important;width:100%;height:100%}
        .ern-mapa-operacional *{box-sizing:border-box}
        .ern-cartografia{position:absolute;left:0;right:0;top:var(--ern-barra);bottom:0;z-index:0}
        .ern-painel-aberto .ern-cartografia{left:var(--ern-lateral)}
        .ern-mapa-operacional .leaflet-container{background:#192329}
        .ern-mapa-noturno .leaflet-tile-pane{filter:grayscale(1) invert(1) contrast(.88) brightness(.85)}
        .ern-mapa-operacional button{min-height:40px;border:1px solid #ffffff20;background:#1a2529;color:#eaf0ed;border-radius:8px;padding:9px 13px;font:500 12px var(--font-work-sans),sans-serif;cursor:pointer;transition:background .15s,border-color .15s}
        .ern-mapa-operacional button:hover:not(:disabled){background:#2b393b;border-color:#d4ac67}
        .ern-mapa-operacional button:disabled{opacity:.4;cursor:default}
        .ern-mapa-operacional :is(button,input,select,a,summary):focus-visible{outline:2px solid #edb65e;outline-offset:3px}
        .ern-mapa-operacional small{display:block;font-size:11px;line-height:1.6;color:#a3b6b1}
        .ern-barra-mapa{position:absolute;inset:0 0 auto;height:var(--ern-barra);z-index:1001;display:flex;align-items:center;gap:24px;padding:18px 26px;background:#11191b;border-bottom:1px solid #ffffff14}
        .ern-mapa-titulo{display:flex;align-items:center;gap:14px;flex-shrink:0}
        .ern-mapa-emblema{display:grid;place-items:center;width:46px;height:46px;border:1px solid #d8ac6550;border-radius:13px;font-size:32px;font-weight:300;color:#e4b86f;background:linear-gradient(145deg,#d6a45b15,transparent)}
        .ern-mapa-operacional .ern-mapa-kicker{font-size:8px;letter-spacing:.16em;color:#e3b570;font-weight:700;margin-bottom:6px}
        .ern-barra-mapa h1{font-size:23px;letter-spacing:-.04em;font-weight:600;line-height:1;margin:0;white-space:nowrap}
        .ern-barra-mapa h1 span{display:block;color:#90a5a0;font-size:10px;font-weight:400;letter-spacing:.02em;margin-top:7px}
        .ern-mapa-metricas{display:flex;align-items:center;gap:26px;margin:0 auto;padding:0 26px;border-left:1px solid #ffffff14}
        .ern-mapa-metricas strong{font-size:24px;font-weight:500;font-variant-numeric:tabular-nums;line-height:1.1;color:#f3dec0}
        .ern-mapa-metricas small{font-size:10px;margin-top:3px}
        .ern-mapa-comandos{display:flex;gap:8px}
        .ern-painel-mapa{position:absolute;z-index:1001;top:var(--ern-barra);bottom:74px;left:0;width:var(--ern-lateral);display:flex;flex-direction:column;background:#121d20;border-right:1px solid #ffffff12;overflow:hidden}
        .ern-painel-cabecalho{padding:24px 22px 18px}
        .ern-painel-mapa .ern-selo{margin:0 0 9px;font-size:8px;font-weight:700;letter-spacing:.18em;color:#d8ae6b}
        .ern-painel-mapa h2{font-size:23px;line-height:1.2;letter-spacing:-.04em;font-weight:500;margin:0 0 8px}
        .ern-painel-cabecalho>p:last-child{font-size:11px;line-height:1.6;color:#96aca5;margin:0}
        .ern-mapa-abas{display:flex;gap:0;padding:0 22px;border-bottom:1px solid #ffffff12;flex-shrink:0}
        .ern-mapa-abas button{flex:1;border:0;border-bottom:2px solid transparent;border-radius:0;background:none;min-height:45px;color:#96aca5;font-size:12px}
        .ern-mapa-abas button[aria-pressed=true]{border-bottom-color:#e4b16c;color:#f0cc96}
        .ern-painel-conteudo{padding:18px 22px 24px;overflow:auto;flex:1;min-height:0;scrollbar-width:thin;scrollbar-color:#435b56 transparent;overscroll-behavior:contain}
        .ern-painel-conteudo [hidden]{display:none!important}
        .ern-painel-mapa label{display:block;font-size:10px;font-weight:500;color:#afc0bb;margin:0 0 7px}
        .ern-painel-mapa :is(input,select){width:100%;min-width:0;min-height:44px;border:1px solid #ffffff20;border-radius:8px;background:#0c171b;color:#eaf0ed;padding:11px 12px;font-size:12px;margin:0 0 16px}
        .ern-painel-mapa input::placeholder{color:#7e9790}
        .ern-escopo-mapa{display:flex;gap:6px;margin:0 0 20px}
        .ern-escopo-mapa button{font-size:10px;min-height:32px;padding:6px 11px;border-radius:20px;background:transparent;color:#9cb2aa}
        .ern-escopo-mapa button[aria-pressed=true]{background:#d6ac651a;border-color:#d6ac6560;color:#edc387}
        .ern-lista-cabecalho{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;font-size:11px}
        .ern-lista-cabecalho strong{font-weight:500}
        .ern-lista-cabecalho>span{font-size:10px;color:#97afa6}
        .ern-ferramentas-busca{display:flex;gap:6px;margin-bottom:10px}
        .ern-ferramentas-busca button{flex:1;min-height:34px;font-size:10px;padding:7px}
        .ern-resultados-destino{padding:0;margin:0;list-style:none}
        .ern-resultados-destino li{border-bottom:1px solid #ffffff0c}
        .ern-resultados-destino button{display:flex;align-items:center;gap:11px;text-align:left;width:100%;min-height:66px;padding:12px 4px;background:none;border:0;border-radius:6px}
        .ern-resultados-destino button[aria-pressed=true]{background:#e3ae5f12;box-shadow:inset 2px 0 #e3ae5f;padding-left:9px}
        .ern-local-indicador{display:grid;place-items:center;flex-shrink:0;width:28px;height:28px;background:#719c8e12;border:1px solid #719c8e28;border-radius:50%;color:#b6d4c8;font-size:15px}
        .ern-resultados-destino button>span:nth-child(2){min-width:0;overflow-wrap:anywhere}
        .ern-resultados-destino strong{display:block;font-size:11px;font-weight:500;line-height:1.5}
        .ern-resultados-destino small{font-size:10px;color:#8ea89d}
        .ern-local-selecionado{margin-left:auto;font-size:8px;color:#e4b16c}
        .ern-carregar-locais{width:100%;margin-top:14px;font-size:10px!important}
        .ern-destino-resumo{padding:16px;margin-top:18px;background:linear-gradient(130deg,#b58d3920,#b58d3908);border:1px solid #e3ae5f50;border-radius:12px}
        .ern-destino-resumo strong{display:block;font-size:16px;font-weight:500;margin-bottom:5px}
        .ern-destino-resumo button{width:100%;margin-top:12px;background:#e4b16c;color:#231b10;border-color:#e4b16c}
        .ern-painel-rodape{display:flex;gap:7px;align-items:center;min-height:58px;padding:9px 18px;background:#10191c;border-top:1px solid #ffffff12;font-size:9px;color:#92aaa0;flex-shrink:0}
        .ern-painel-rodape>span{height:6px;width:6px;border-radius:50%;background:#647570}
        .ern-painel-rodape>span.ern-sinal-ativo{background:#70c4a6}
        .ern-painel-rodape button{margin-left:auto;border:0;background:none;font-size:9px;padding:7px 0;color:#edc387}
        .ern-mapa-contexto{position:absolute;top:calc(var(--ern-barra) + 20px);left:20px;right:66px;z-index:1000;display:flex;align-items:flex-start;gap:12px;pointer-events:none}
        .ern-painel-aberto .ern-mapa-contexto{left:calc(var(--ern-lateral) + 20px)}
        .ern-mapa-contexto>div{padding:11px 15px;border:1px solid #ffffff25;background:#101b20ed;border-radius:10px;box-shadow:0 4px 20px #0003}
        .ern-mapa-contexto strong{font-size:12px;font-weight:500}
        .ern-mapa-contexto small{font-size:9px;margin:4px 0 0 14px}
        .ern-ponto-sinal{display:inline-block;width:6px;height:6px;border-radius:50%;background:#dfb16b;margin-right:8px}
        .ern-mapa-contexto button{margin-left:auto;pointer-events:auto;background:#101b20ed;font-size:10px}
        .ern-legenda-mapa{position:absolute;bottom:24px;left:20px;z-index:1000;display:flex;gap:14px;flex-wrap:wrap;border:1px solid #ffffff20;border-radius:8px;padding:9px 12px;background:#101b20ed;font-size:9px;color:#a9beb6;pointer-events:none}
        .ern-painel-aberto .ern-legenda-mapa{left:calc(var(--ern-lateral) + 20px)}
        .ern-legenda-mapa span{display:flex;gap:5px;align-items:center}
        .ern-legenda-mapa i{display:inline-block;width:6px;height:6px;border-radius:50%}
        .ern-legenda-cidade{background:#e4b16c}.ern-legenda-local{background:#75c9b0}.ern-legenda-gps{background:#4389ed}.ern-legenda-grupo{border:1px solid #75c9b0}
        .ern-grupo-mapa{background:none;border:0}
        .ern-grupo-corpo{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:#11312cf2;color:#b6f1db;border:1px solid #85cfb988;box-shadow:0 0 0 5px #70b79c17,0 3px 15px #0006;font:600 12px var(--font-work-sans),sans-serif;font-variant-numeric:tabular-nums}
        .ern-mapa-operacional .leaflet-tooltip{background:#15242a;color:#e3eee8;border:1px solid #ffffff25;padding:8px 11px;border-radius:7px;font-size:11px;box-shadow:0 4px 12px #0003}
        .ern-mapa-operacional .leaflet-tooltip.ern-sede-rotulo{background:#101b20df;color:#f0ca8d;border-color:#d9ad6355;padding:5px 9px;font-weight:500;font-size:11px}
        .ern-mapa-operacional .leaflet-control-zoom{border:1px solid #ffffff25;box-shadow:0 4px 16px #0003;border-radius:8px;overflow:hidden;margin-top:20px;margin-right:16px}
        .ern-mapa-operacional .leaflet-control-zoom a{background:#142329;color:#e3eee8;border-color:#ffffff20}
        .ern-mapa-operacional .leaflet-control-attribution{background:#101b20ed;color:#ccd9d3;font-size:9px}
        .ern-mapa-operacional .leaflet-control-attribution a{color:#dfba7c}
        .ern-mapa-operacional .leaflet-control-scale-line{background:#101b20de;color:#c8d9d1;border-color:#809b91;font-size:9px}
        .ern-posicao-icone{background:none;border:0}
        .ern-posicao-corpo{display:grid;place-items:center;width:40px;height:40px;border:3px solid white;border-radius:50%;background:#1765c1;color:white;box-shadow:0 2px 10px #0007}
        .ern-bordo-vivo{animation:ern-bordo-pulso 1.8s ease-out infinite}
        @keyframes ern-bordo-pulso{0%,100%{box-shadow:0 0 0 0 #268cf099}60%{box-shadow:0 0 0 17px #268cf000}}
        .ern-gps-apresentacao{padding:10px 0 20px}
        .ern-gps-apresentacao>span{display:grid;place-items:center;width:52px;height:52px;border:1px solid #d8ac6540;border-radius:15px;color:#edc387;font-size:36px;background:#d8ac650c}
        .ern-gps-apresentacao h3{font-size:19px;font-weight:500;margin:18px 0 8px}
        .ern-gps-apresentacao p,.ern-sinal p,.ern-painel-mapa details p{font-size:11px;line-height:1.8;color:#a5bbb0}
        .ern-acoes-mapa{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .ern-acoes-mapa button{font-size:10px;min-height:48px}
        .ern-acoes-mapa button.ern-principal{background:#e4b16c;color:#231b10;border-color:#e4b16c}
        .ern-acoes-mapa button[aria-pressed=true]{outline:1px solid #e4b16c;outline-offset:2px}
        .ern-sinal{padding:15px;margin-top:20px;background:#0e191d;border:1px solid #ffffff18;border-radius:12px}
        .ern-sinal strong{font-size:12px;font-weight:500}
        .ern-sinal small{font-size:10px}
        .ern-painel-mapa details{margin-top:24px;padding-top:16px;border-top:1px solid #ffffff12;font-size:10px;color:#93a99f}
        .ern-painel-mapa summary{min-height:32px;cursor:pointer}
        .ern-painel-mapa a{display:flex;align-items:center;min-height:40px;font-size:10px;color:#e4bd83;text-decoration:underline}
        .ern-aviso-mapa,.ern-aviso-base{position:absolute;top:calc(var(--ern-barra) + 110px);right:24px;z-index:1002;max-width:min(340px,85%);padding:14px;border:1px solid #e4b16c70;border-radius:10px;background:#142329;color:#eaf0ed;font-size:12px;line-height:1.7}
        .ern-aviso-base button{display:block;margin-top:8px}
        @media(prefers-reduced-motion:reduce){.ern-bordo-vivo{animation:none;outline:3px solid #69caff}.ern-mapa-operacional button{transition:none}}
        @media(max-width:1100px) and (min-width:768px){.ern-mapa-operacional{--ern-lateral:300px;--ern-barra:90px}.ern-mapa-metricas{gap:14px;padding-left:18px;padding-right:0}.ern-mapa-metricas>div:last-child{display:none}.ern-barra-mapa{padding:14px 18px;gap:16px}.ern-mapa-comandos button{font-size:10px;padding:8px}.ern-mapa-titulo{gap:9px}.ern-mapa-emblema{display:none}.ern-barra-mapa h1{font-size:20px}}
        @media(max-width:767px){
          .ern-mapa-operacional{--ern-barra:114px;--ern-lateral:0px}
          .ern-barra-mapa{padding:13px 14px;gap:10px;flex-wrap:wrap;align-content:center}
          .ern-mapa-titulo{flex:1;gap:10px}.ern-mapa-emblema{width:36px;height:36px;font-size:26px;border-radius:10px}
          .ern-mapa-operacional .ern-mapa-kicker{font-size:7px;margin-bottom:5px}.ern-barra-mapa h1{font-size:19px}.ern-barra-mapa h1 span{display:none}
          .ern-mapa-metricas{padding:0;margin:0;border:0;gap:12px}.ern-mapa-metricas strong{font-size:17px}.ern-mapa-metricas small{font-size:8px}.ern-mapa-metricas>div:last-child{display:none}
          .ern-mapa-comandos{width:100%;gap:6px}.ern-mapa-comandos button{flex:1;min-height:36px;font-size:10px;padding:7px}
          .ern-painel-aberto .ern-cartografia{left:0;bottom:calc(42% + 74px)}
          .ern-painel-mapa{top:auto;bottom:74px;left:0;width:100%;height:42%;border-right:0;border-top:1px solid #e4b16c50}
          .ern-painel-cabecalho{display:none}.ern-mapa-abas{padding:0 16px}.ern-mapa-abas button{min-height:40px}
          .ern-painel-conteudo{padding:14px 16px 18px}.ern-painel-rodape{min-height:40px;padding:4px 16px}
          .ern-painel-aberto .ern-mapa-contexto,.ern-mapa-contexto{top:calc(var(--ern-barra) + 10px);left:10px;right:54px;gap:6px}
          .ern-mapa-contexto>div{padding:8px 10px}.ern-mapa-contexto strong{font-size:10px}.ern-mapa-contexto small{display:none}.ern-mapa-contexto button{font-size:8px;min-height:32px;padding:6px 8px}
          .ern-legenda-mapa{left:10px;bottom:26px;max-width:calc(100% - 20px);gap:8px;font-size:8px;padding:6px 8px}
          .ern-painel-aberto .ern-legenda-mapa{left:10px;bottom:calc(42% + 98px)}
          .ern-mapa-operacional .leaflet-control-zoom{margin:10px 8px}.ern-aviso-mapa,.ern-aviso-base{top:calc(var(--ern-barra) + 65px);right:10px;font-size:10px;max-width:75%}
        }

        @media(max-width:380px){.ern-mapa-metricas{display:none}}

        .ern-mapa-operacional .ern-destino-resumo button{background:#e4b16c;color:#231b10;border-color:#e4b16c}
        .ern-mapa-operacional .ern-destino-resumo button:hover:not(:disabled){background:#f1c482;color:#231b10;border-color:#f1c482}
        .ern-mapa-operacional .ern-destino-confirmacao{font-size:10px;line-height:1.7;color:#c7e2d5;margin:10px 0 0}
        .ern-mapa-operacional .ern-destino-confirmacao:empty{display:none}
        .ern-mapa-operacional .ern-popup-destino .leaflet-popup-content-wrapper{background:#142329;color:#edf3ef;border:1px solid #e4b16c88;border-radius:12px;box-shadow:0 8px 28px #0006}
        .ern-mapa-operacional .ern-popup-destino .leaflet-popup-tip{background:#142329}
        .ern-mapa-operacional .ern-popup-destino .leaflet-popup-content{margin:18px 24px 18px 18px;line-height:1.7}
        .ern-mapa-operacional .ern-popup-destino-conteudo strong{font:600 16px var(--font-work-sans),sans-serif;color:#f1c482}
        .ern-mapa-operacional .ern-popup-destino-conteudo p{font:400 11px var(--font-work-sans),sans-serif;color:#c4d6ce;margin:8px 0 0}
        .ern-mapa-operacional .ern-popup-destino .leaflet-popup-close-button{color:#edf3ef;width:28px;height:28px;font-size:21px}
      `}</style>
    </main>
  );
}

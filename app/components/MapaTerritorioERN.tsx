"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ImagensLocalERN from "./ImagensLocalERN";
import ReferenciaEmbarcacaoERN, {
  type ReferenciaEmbarcacao,
} from "./ReferenciaEmbarcacaoERN";
import type {
  Map as LeafletMap,
  CircleMarker,
  Circle,
  LayerGroup,
  LeafletMouseEvent,
} from "leaflet";
import "leaflet/dist/leaflet.css";

type DemandaMapa = {
  id: string;
  titulo: string;
  localidade: string;
  status: string;
};
type Props = { demandas?: DemandaMapa[]; carregando?: boolean };
type Coordenadas = [number, number];
type Categoria = "praias" | "natureza" | "cultura";
type Localidade = {
  id: string;
  nome: string;
  coordenadas: Coordenadas;
  resumo: string;
};
type Atrativo = {
  id: string;
  cidade: string;
  nome: string;
  categoria: Categoria;
  descricao: string;
  visita: string;
  fonte: string;
  coordenadas?: Coordenadas;
  referencia?: string;
  fonteCoordenadas?: string;
};
type Posicao = {
  latitude: number;
  longitude: number;
  precisao: number;
  instante: number;
};
type Modo = "turismo" | "demandas";
const LOCALIDADES: Localidade[] = [
  {
    id: "manaus",
    nome: "Manaus",
    coordenadas: [-3.119, -60.022],
    resumo:
      "Patrimônio cultural, orla e praias do Rio Negro como portas de entrada para a região.",
  },
  {
    id: "novo-airao",
    nome: "Novo Airão",
    coordenadas: [-2.621, -60.944],
    resumo:
      "Base para explorar Anavilhanas e organizar visitas ao Parque Nacional do Jaú.",
  },
  {
    id: "barcelos",
    nome: "Barcelos",
    coordenadas: [-0.975, -62.924],
    resumo:
      "Praias, ilhas de Mariuá, pesca esportiva e patrimônio cultural às margens do Rio Negro.",
  },
  {
    id: "santa-isabel",
    nome: "Santa Isabel do Rio Negro",
    coordenadas: [-0.414, -65.019],
    resumo:
      "Paisagens do Rio Negro, praias fluviais e pesca esportiva na região de Tapuruquara.",
  },
  {
    id: "sao-gabriel",
    nome: "São Gabriel da Cachoeira",
    coordenadas: [-0.13, -67.089],
    resumo:
      "Paisagens de serras e diversidade cultural dos povos do Alto Rio Negro.",
  },
];
const MUNICIPIOS_FONTE = "https://www.amazonastur.am.gov.br/municipios/";
const BARCELOS_FONTE = "https://turismo.barcelos.am.gov.br/atrativo/";
const ICM =
  "https://www.gov.br/icmbio/pt-br/assuntos/biodiversidade/unidade-de-conservacao/unidades-de-biomas/amazonia/lista-de-ucs/";
// Catálogo editorial pesquisado em 15/10/2026. Nunca inventar coordenadas:
// sem uma fonte cartográfica, o atrativo permanece no catálogo do município.
const ATRATIVOS: Atrativo[] = [
  {
    id: "praia-grande-barcelos",
    cidade: "barcelos",
    nome: "Praia Grande",
    categoria: "praias",
    descricao:
      "Praia fluvial diante da sede de Barcelos, ligada à paisagem de Mariuá e à vida de moradores e visitantes.",
    visita:
      "A Prefeitura indica setembro a março como referência de temporada. Confirme as condições atuais do rio e da travessia.",
    fonte: `${BARCELOS_FONTE}praia-grande/`,
    coordenadas: [-0.96058, -62.92789],
    referencia:
      "Referência da Ilha da Praia Grande no GeoNames. Não indica o ponto de desembarque nem o limite atual da areia.",
    fonteCoordenadas:
      "https://www.geonames.org/12965878/ilha-da-praia-grande.html",
  },
  {
    id: "mariua",
    cidade: "barcelos",
    nome: "Arquipélago de Mariuá",
    categoria: "natureza",
    descricao:
      "Paisagem de ilhas, lagos, igarapés e paranás que faz parte da identidade turística de Barcelos.",
    visita:
      "A área é extensa. Defina com a operação local quais ilhas e canais farão parte do passeio.",
    fonte: `${BARCELOS_FONTE}arquipelago-de-mariua/`,
  },
  {
    id: "matriz-barcelos",
    cidade: "barcelos",
    nome: "Igreja Matriz Nossa Senhora da Conceição",
    categoria: "cultura",
    descricao:
      "Patrimônio religioso e histórico reconhecido pelo portal de turismo de Barcelos.",
    visita: "Confirme localmente os horários para visitação e celebrações.",
    fonte: `${BARCELOS_FONTE}igreja-matriz-nossa-senhora-da-conceicao/`,
  },
  {
    id: "praca-barcelos",
    cidade: "barcelos",
    nome: "Praça Municipal Presidente Médici",
    categoria: "cultura",
    descricao:
      "Espaço de convivência na orla, com vista para o Rio Negro e praias de Mariuá.",
    visita:
      "Referência de endereço publicada: Rua Tenreiro Aranha, orla de Barcelos.",
    fonte: `${BARCELOS_FONTE}praca-municipal-presidente-medici/`,
  },
  {
    id: "serra-araca",
    cidade: "barcelos",
    nome: "Serra do Aracá",
    categoria: "natureza",
    descricao:
      "Atrativo de natureza no município de Barcelos, apresentado no portal municipal de turismo.",
    visita:
      "Expedição remota: confirme acesso, autorizações e organização da visita com os responsáveis locais.",
    fonte: `${BARCELOS_FONTE}serra-do-araca/`,
  },
  {
    id: "teatro-amazonas",
    cidade: "manaus",
    nome: "Teatro Amazonas",
    categoria: "cultura",
    descricao:
      "Patrimônio cultural no Largo de São Sebastião, no Centro Histórico de Manaus.",
    visita:
      "Consulte a instituição para programação, ingressos e horários atualizados.",
    fonte: "https://visite.museus.gov.br/instituicoes/museu-teatro-amazonas/",
    coordenadas: [-3.1302372, -60.0234312],
    referencia:
      "Coordenada publicada pela instituição no portal Visite Museus. Não representa acesso específico.",
    fonteCoordenadas:
      "https://visite.museus.gov.br/instituicoes/museu-teatro-amazonas/",
  },
  {
    id: "ponta-negra",
    cidade: "manaus",
    nome: "Complexo Turístico Ponta Negra",
    categoria: "praias",
    descricao:
      "Orla e praia urbana do Rio Negro, com espaços de lazer e contemplação.",
    visita:
      "Verifique as orientações locais de uso da praia e as condições atuais do balneário.",
    fonte:
      "https://www.manaus.am.gov.br/noticia/manaus/complexo-turistico-ponta-negra-e-o-primeiro-atrativo-da-serie-conheca-manaus/",
  },
  {
    id: "anavilhanas",
    cidade: "novo-airao",
    nome: "Parque Nacional de Anavilhanas",
    categoria: "natureza",
    descricao:
      "Unidade de conservação no Rio Negro. Novo Airão é uma referência para organizar a visita.",
    visita:
      "Consulte o ICMBio e os condutores locais. O catálogo não informa disponibilidade de passeios.",
    fonte: `${ICM}parna-de-anavilhanas/parna-de-anavilhanas`,
  },
  {
    id: "jau",
    cidade: "novo-airao",
    nome: "Parque Nacional do Jaú",
    categoria: "natureza",
    descricao:
      "Parque associado aqui à base de visitação de Novo Airão, sem limitar sua área a esse município.",
    visita:
      "Confirme as regras de visitação e autorização de entrada diretamente com o ICMBio.",
    fonte: `${ICM}parna-do-jau/informacoes-sobre-visitacao-2013-parna-do-jau`,
  },
  {
    id: "praias-santa-isabel",
    cidade: "santa-isabel",
    nome: "Praias fluviais de Santa Isabel",
    categoria: "praias",
    descricao:
      "A Amazonastur destaca as praias do Rio Negro entre os atrativos do município.",
    visita:
      "Referência regional. Os nomes, acessos e coordenadas de cada praia precisam de levantamento local.",
    fonte: MUNICIPIOS_FONTE,
  },
  {
    id: "paisagens-sao-gabriel",
    cidade: "sao-gabriel",
    nome: "Paisagens de serras do Alto Rio Negro",
    categoria: "natureza",
    descricao:
      "A Amazonastur apresenta as serras e paisagens naturais entre os destaques de São Gabriel.",
    visita:
      "Referência regional. A visita a um local específico depende de planejamento e das condições de acesso.",
    fonte: MUNICIPIOS_FONTE,
  },
  {
    id: "artesanato-sao-gabriel",
    cidade: "sao-gabriel",
    nome: "Artesanato e culturas do Alto Rio Negro",
    categoria: "cultura",
    descricao:
      "A produção artesanal dos povos da região é um dos destaques culturais apresentados pela Amazonastur.",
    visita:
      "Procure iniciativas conduzidas pelos próprios artesãos. Uma referência cultural não implica autorização de visita a comunidades.",
    fonte: MUNICIPIOS_FONTE,
  },
];
const CATEGORIAS: Record<
  Categoria,
  { nome: string; cor: string; simbolo: string }
> = {
  praias: { nome: "Praias", cor: "#E3A144", simbolo: "P" },
  natureza: { nome: "Natureza", cor: "#75b495", simbolo: "N" },
  cultura: { nome: "Cultura", cor: "#baa2e4", simbolo: "C" },
};
const LIMITES: [Coordenadas, Coordenadas] = [
  [-3.6, -67.7],
  [0.5, -59.5],
];
const BOTAO =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition disabled:cursor-wait disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3A144]";
const VAZIAS: DemandaMapa[] = [];
function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
function localizar(texto: string) {
  const nome = normalizar(texto)
    .replace(/\s*(?:\/\s*am|[-–,]\s*am|\(am\))\s*$/, "")
    .trim();
  return LOCALIDADES.find((local) => normalizar(local.nome) === nome);
}
function metrica(metros: number) {
  return metros >= 1000
    ? `${(metros / 1000).toFixed(1).replace(".", ",")} km`
    : `${Math.round(metros)} m`;
}

export default function MapaTerritorioERN({
  demandas = VAZIAS,
  carregando = false,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapa = useRef<LeafletMap | null>(null);
  const Lref = useRef<typeof import("leaflet") | null>(null);
  const cidadesRef = useRef<Record<string, CircleMarker>>({});
  const turismoRef = useRef<LayerGroup | null>(null);
  const gpsRef = useRef<{ ponto: CircleMarker; area: Circle } | null>(null);
  const seguirRef = useRef(false);
  const [cidadeId, setCidadeId] = useState("barcelos");
  const [modoEmbarcacao, setModoEmbarcacao] = useState<
    "nenhuma" | "manual" | "gps"
  >("nenhuma");
  const [marcandoEmbarcacao, setMarcandoEmbarcacao] = useState(false);
  const [posicaoManual, setPosicaoManual] =
    useState<ReferenciaEmbarcacao | null>(null);
  const [consultaEmbarcacao, setConsultaEmbarcacao] = useState<{
    referencia: ReferenciaEmbarcacao;
    termo: string;
  } | null>(null);
  const painelImagens = useRef<HTMLDivElement>(null);
  const [inspecionar, setInspecionar] = useState(false);
  const [pontoInspecao, setPontoInspecao] = useState<Coordenadas | null>(null);
  const [atrativoId, setAtrativoId] = useState<string | null>(
    "praia-grande-barcelos",
  );
  const [modo, setModo] = useState<Modo>("turismo");
  const [categoria, setCategoria] = useState<Categoria | "todas">("todas");
  const [busca, setBusca] = useState("");
  const [estado, setEstado] = useState<"carregando" | "pronto" | "erro">(
    "carregando",
  );
  const [falhaBase, setFalhaBase] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [somenteComDemandas, setSomenteComDemandas] = useState(false);
  const [geoAtivo, setGeoAtivo] = useState(false);
  const [seguir, setSeguir] = useState(false);
  const [posicao, setPosicao] = useState<Posicao | null>(null);
  const [geoMensagem, setGeoMensagem] = useState("");
  const [geoPausado, setGeoPausado] = useState(false);
  const [agora, setAgora] = useState(0);
  const cidade =
    LOCALIDADES.find((item) => item.id === cidadeId) ?? LOCALIDADES[2];
  const resumo = useMemo(() => {
    const porCidade: Record<string, DemandaMapa[]> = Object.fromEntries(
      LOCALIDADES.map((local) => [local.id, []]),
    );
    let semLocalizacao = 0;
    for (const demanda of demandas) {
      const local = localizar(demanda.localidade);
      if (local) porCidade[local.id].push(demanda);
      else semLocalizacao += 1;
    }
    return { porCidade, semLocalizacao };
  }, [demandas]);
  const itens = resumo.porCidade[cidadeId];
  const cidadesVisiveis = useMemo(
    () =>
      LOCALIDADES.filter(
        (local) =>
          (!somenteComDemandas || resumo.porCidade[local.id].length > 0) &&
          (!busca ||
            normalizar(local.nome).includes(normalizar(busca)) ||
            (modo === "turismo" &&
              ATRATIVOS.some(
                (a) =>
                  a.cidade === local.id &&
                  normalizar(a.nome).includes(normalizar(busca)),
              ))),
      ),
    [busca, modo, somenteComDemandas, resumo],
  );
  const atrativosVisiveis = useMemo(
    () =>
      ATRATIVOS.filter(
        (a) =>
          (categoria === "todas" || a.categoria === categoria) &&
          (busca
            ? normalizar(
                `${a.nome} ${LOCALIDADES.find((c) => c.id === a.cidade)?.nome}`,
              ).includes(normalizar(busca))
            : a.cidade === cidadeId),
      ),
    [busca, categoria, cidadeId],
  );
  const atrativo =
    modo === "turismo"
      ? (atrativosVisiveis.find((a) => a.id === atrativoId) ?? null)
      : null;
  const semCoordenadas = atrativosVisiveis.filter((a) => !a.coordenadas).length;
  const geoAntigo =
    !!posicao && (geoPausado || agora - posicao.instante > 45000);

  const referenciaEmbarcacao: ReferenciaEmbarcacao | null =
    modoEmbarcacao === "manual"
      ? posicaoManual
      : modoEmbarcacao === "gps" && geoAtivo && posicao
        ? {
            coordenadas: [posicao.latitude, posicao.longitude],
            origem: "gps",
            instante: posicao.instante,
            precisao: posicao.precisao,
            desatualizada: geoAntigo || !!geoMensagem,
          }
        : null;

  useEffect(() => {
    let cancelado = false;
    let instancia: LeafletMap | null = null;
    let observador: ResizeObserver | null = null;
    setEstado("carregando");
    setFalhaBase(false);
    async function iniciar() {
      try {
        const L = await import("leaflet");
        if (cancelado || !container.current) return;
        Lref.current = L;
        instancia = L.map(container.current, {
          scrollWheelZoom: false,
          minZoom: 3,
          maxZoom: 18,
          zoomControl: false,
        });
        mapa.current = instancia;
        L.control.zoom({ position: "topright" }).addTo(instancia);
        L.control
          .scale({ imperial: false, position: "bottomleft" })
          .addTo(instancia);
        const base = L.tileLayer(
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
            maxZoom: 19,
            updateWhenIdle: true,
            keepBuffer: 1,
          },
        );
        base.on("tileerror", () => {
          if (!cancelado) setFalhaBase(true);
        });
        base.addTo(instancia);
        for (const local of LOCALIDADES) {
          const marcador = L.circleMarker(local.coordenadas, {
            radius: 8,
            color: "#133326",
            weight: 2,
            fillColor: "#376b55",
            fillOpacity: 1,
          }).addTo(instancia);
          const rotulo = document.createElement("span");
          rotulo.textContent = `${local.nome} · sede municipal`;
          marcador.bindTooltip(rotulo, { direction: "top", offset: [0, -8] });
          marcador.on("click", () => {
            setCidadeId(local.id);
            setPontoInspecao(null);
            setConsultaEmbarcacao(null);
            setAtrativoId(null);
            setBusca("");
            seguirRef.current = false;
            setSeguir(false);
          });
          cidadesRef.current[local.id] = marcador;
        }
        turismoRef.current = L.layerGroup().addTo(instancia);
        instancia.setView(LOCALIDADES[2].coordenadas, 12, { animate: false });
        instancia.on("dragstart", () => {
          seguirRef.current = false;
          setSeguir(false);
        });
        const alvo = instancia;
        observador = new ResizeObserver(() =>
          alvo.invalidateSize({ pan: false }),
        );
        observador.observe(container.current);
        setEstado("pronto");
      } catch (erro) {
        console.error("Não foi possível iniciar o mapa ERN.", erro);
        if (!cancelado) setEstado("erro");
      }
    }
    void iniciar();
    return () => {
      cancelado = true;
      observador?.disconnect();
      instancia?.remove();
      mapa.current = null;
      Lref.current = null;
      cidadesRef.current = {};
      turismoRef.current = null;
      gpsRef.current = null;
    };
  }, [tentativa]);

  useEffect(() => {
    if (estado !== "pronto") return;
    for (const local of LOCALIDADES) {
      const visivel = cidadesVisiveis.some((item) => item.id === local.id);
      cidadesRef.current[local.id]
        ?.setStyle({
          opacity: visivel ? 1 : 0,
          fillOpacity: visivel ? 1 : 0,
          fillColor: local.id === cidadeId ? "#E3A144" : "#376b55",
        })
        .setRadius(local.id === cidadeId ? 10 : 8);
      const elemento = cidadesRef.current[local.id]?.getElement();
      if (elemento instanceof SVGElement || elemento instanceof HTMLElement)
        elemento.style.pointerEvents = visivel ? "auto" : "none";
    }
    const L = Lref.current;
    const camada = turismoRef.current;
    if (!L || !camada) return;
    camada.clearLayers();
    if (modo !== "turismo") return;
    for (const a of atrativosVisiveis) {
      if (!a.coordenadas) continue;
      const cat = CATEGORIAS[a.categoria];
      const marcador = L.marker(a.coordenadas, {
        title: `${a.nome} · referência cartográfica`,
        alt: a.nome,
        keyboard: true,
        icon: L.divIcon({
          className: "ern-ponto-turistico",
          iconSize: [34, 34],
          iconAnchor: [17, 17],
          html: `<span style="display:flex;width:34px;height:34px;align-items:center;justify-content:center;border:2px solid ${a.id === atrativoId ? "#fff" : "#142d22"};border-radius:12px;background:${cat.cor};color:#0A1713;font:700 13px sans-serif;box-shadow:0 3px 10px #0005">${cat.simbolo}</span>`,
        }),
      });
      const rotulo = document.createElement("span");
      rotulo.textContent = `${a.nome} · ${cat.nome}`;
      marcador.bindTooltip(rotulo, { direction: "top", offset: [0, -18] });
      marcador.on("click", () => {
        setAtrativoId(a.id);
        setCidadeId(a.cidade);
        setPontoInspecao(null);
        setConsultaEmbarcacao(null);
        seguirRef.current = false;
        setSeguir(false);
      });
      camada.addLayer(marcador);
    }
  }, [estado, cidadesVisiveis, cidadeId, modo, atrativosVisiveis, atrativoId]);

  // O usuário precisa iniciar a localização. Nenhuma coordenada vai ao Supabase.
  // Observador encerrado ao desligar, desmontar ou ocultar a página.
  useEffect(() => {
    if (!geoAtivo) return;
    let encerrado = false;
    let observacao: number | null = null;
    let geracao = 0;
    function limpar() {
      geracao += 1;
      if (observacao !== null) navigator.geolocation.clearWatch(observacao);
      observacao = null;
    }
    function iniciar() {
      limpar();
      if (document.visibilityState === "hidden") {
        setGeoPausado(true);
        return;
      }
      setGeoPausado(false);
      setGeoMensagem("Aguardando a posição do dispositivo…");
      const geracaoAtual = geracao;
      try {
        observacao = navigator.geolocation.watchPosition(
          (leitura) => {
            if (encerrado || geracaoAtual !== geracao) return;
            const { latitude, longitude, accuracy } = leitura.coords;
            if (
              ![latitude, longitude, accuracy, leitura.timestamp].every(
                Number.isFinite,
              ) ||
              Math.abs(latitude) > 90 ||
              Math.abs(longitude) > 180 ||
              accuracy < 0
            ) {
              setGeoMensagem(
                "O dispositivo retornou uma leitura inválida. Aguardando outra posição.",
              );
              return;
            }
            setPosicao({
              latitude,
              longitude,
              precisao: accuracy,
              instante: leitura.timestamp,
            });
            setAgora(Date.now());
            setGeoMensagem("");
          },
          (erro) => {
            if (encerrado || geracaoAtual !== geracao) return;
            if (erro.code === 1) {
              limpar();
              setGeoAtivo(false);
              setPosicao(null);
              seguirRef.current = false;
              setSeguir(false);
              setGeoMensagem(
                "Permissão de localização negada. Libere a localização nas configurações deste site para tentar novamente.",
              );
            } else {
              setGeoMensagem(
                erro.code === 3
                  ? "A leitura demorou. Aguardando uma nova posição; tente um local com melhor sinal."
                  : "Posição indisponível. Confira a localização do aparelho e o sinal.",
              );
            }
          },
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 },
        );
      } catch {
        setGeoAtivo(false);
        setGeoMensagem(
          "Não foi possível ativar a localização neste navegador.",
        );
      }
    }
    function visibilidade() {
      if (document.visibilityState === "hidden") {
        limpar();
        setGeoPausado(true);
      } else iniciar();
    }
    function sair() {
      limpar();
      setGeoPausado(true);
    }
    iniciar();
    document.addEventListener("visibilitychange", visibilidade);
    window.addEventListener("pagehide", sair);
    window.addEventListener("pageshow", iniciar);
    const relogio = window.setInterval(() => setAgora(Date.now()), 15000);
    return () => {
      encerrado = true;
      limpar();
      window.clearInterval(relogio);
      document.removeEventListener("visibilitychange", visibilidade);
      window.removeEventListener("pagehide", sair);
      window.removeEventListener("pageshow", iniciar);
    };
  }, [geoAtivo]);

  useEffect(() => {
    const L = Lref.current;
    const alvo = mapa.current;
    if (estado !== "pronto" || !L || !alvo) return;
    if (!geoAtivo || !posicao) {
      if (gpsRef.current) {
        alvo.removeLayer(gpsRef.current.ponto);
        alvo.removeLayer(gpsRef.current.area);
        gpsRef.current = null;
      }
      return;
    }
    const coords: Coordenadas = [posicao.latitude, posicao.longitude];
    if (!gpsRef.current) {
      const area = L.circle(coords, {
        radius: posicao.precisao,
        color: "#2563eb",
        weight: 1,
        fillOpacity: 0.1,
        interactive: false,
      }).addTo(alvo);
      const ponto = L.circleMarker(coords, {
        radius: 8,
        color: "#fff",
        weight: 3,
        fillColor: "#2563eb",
        fillOpacity: 1,
      }).addTo(alvo);
      const rotulo = document.createElement("span");
      rotulo.textContent = "Sua localização neste dispositivo";
      ponto.bindTooltip(rotulo);
      gpsRef.current = { ponto, area };
    } else {
      gpsRef.current.ponto.setLatLng(coords);
      gpsRef.current.area.setLatLng(coords).setRadius(posicao.precisao);
    }
    gpsRef.current.ponto.setStyle({
      fillOpacity: geoAntigo || geoMensagem ? 0.45 : 1,
    });
    gpsRef.current.ponto.getElement()?.classList.toggle(
      "ern-gps-a-bordo-pulsando",
      modoEmbarcacao === "gps" && !geoAntigo && !geoMensagem,
    );
    if (seguirRef.current && !geoAntigo && !geoMensagem)
      alvo.setView(
        coords,
        Math.max(alvo.getZoom(), posicao.precisao > 1000 ? 10 : 14),
        { animate: false },
      );
  }, [estado, geoAtivo, posicao, geoAntigo, geoMensagem, seguir, modoEmbarcacao]);

  useEffect(() => {
    const alvo = mapa.current;
    if (estado !== "pronto" || !alvo || (!inspecionar && !marcandoEmbarcacao))
      return;
    const aoClicar = (evento: LeafletMouseEvent) => {
      if (evento.sourceTarget !== alvo) return;
      if (marcandoEmbarcacao) {
        setPosicaoManual({
          coordenadas: [evento.latlng.lat, evento.latlng.lng],
          origem: "manual",
          instante: Date.now(),
        });
        setModoEmbarcacao("manual");
        setMarcandoEmbarcacao(false);
        setConsultaEmbarcacao(null);
      } else {
        setPontoInspecao([evento.latlng.lat, evento.latlng.lng]);
        setConsultaEmbarcacao(null);
      }
      seguirRef.current = false;
      setSeguir(false);
    };
    alvo.on("click", aoClicar);
    return () => {
      alvo.off("click", aoClicar);
    };
  }, [estado, inspecionar, marcandoEmbarcacao]);

  useEffect(() => {
    const alvo = mapa.current;
    const L = Lref.current;
    if (estado !== "pronto" || !alvo || !L || !pontoInspecao) return;
    const ponto = L.circleMarker(pontoInspecao, {
      radius: 7,
      color: "#fff",
      weight: 2,
      fillColor: "#dc6c2f",
      fillOpacity: 1,
      interactive: false,
    }).addTo(alvo);
    return () => {
      ponto.remove();
    };
  }, [estado, pontoInspecao]);

  useEffect(() => {
    const alvo = mapa.current;
    const L = Lref.current;
    if (estado !== "pronto" || !alvo || !L || !referenciaEmbarcacao) return;
    const ponto = L.circleMarker(referenciaEmbarcacao.coordenadas, {
      radius: 16,
      color: referenciaEmbarcacao.origem === "gps" ? "#3b82f6" : "#E3A144",
      weight: 3,
      fillOpacity: 0,
      interactive: false,
    }).addTo(alvo);
    const rotulo = document.createElement("span");
    rotulo.textContent =
      referenciaEmbarcacao.origem === "manual"
        ? "Embarcação · posição manual"
        : "Embarcação · aparelho a bordo";
    ponto.bindTooltip(rotulo, {
      permanent: true,
      direction: "top",
      offset: [0, -17],
    });
    return () => {
      ponto.remove();
    };
  }, [
    estado,
    referenciaEmbarcacao?.coordenadas[0],
    referenciaEmbarcacao?.coordenadas[1],
    referenciaEmbarcacao?.origem,
  ]);

  function consultarEntorno(termo: string) {
    if (!referenciaEmbarcacao) return;
    setConsultaEmbarcacao({
      referencia: {
        ...referenciaEmbarcacao,
        coordenadas: [...referenciaEmbarcacao.coordenadas],
      },
      termo,
    });
    painelImagens.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }

  function pausarSeguimento() {
    seguirRef.current = false;
    setSeguir(false);
  }
  function selecionarCidade(id: string) {
    const local = LOCALIDADES.find((c) => c.id === id);
    if (!local) return;
    setCidadeId(id);
    setPontoInspecao(null);
    setConsultaEmbarcacao(null);
    setBusca("");
    setAtrativoId(null);
    pausarSeguimento();
    mapa.current?.setView(local.coordenadas, 12, { animate: false });
  }
  function selecionarAtrativo(a: Atrativo) {
    setAtrativoId(a.id);
    setCidadeId(a.cidade);
    setPontoInspecao(null);
    setConsultaEmbarcacao(null);
    pausarSeguimento();
    const local = LOCALIDADES.find((c) => c.id === a.cidade)!;
    mapa.current?.setView(
      a.coordenadas ?? local.coordenadas,
      a.coordenadas ? 14 : 12,
      { animate: false },
    );
  }
  function alternarGeo() {
    if (geoAtivo) {
      setGeoAtivo(false);
      setPosicao(null);
      setGeoMensagem("Localização desligada.");
      pausarSeguimento();
      return;
    }
    if (!window.isSecureContext) {
      setGeoMensagem("A localização requer uma conexão HTTPS.");
      return;
    }
    if (!navigator.geolocation) {
      setGeoMensagem("Este navegador não oferece geolocalização.");
      return;
    }
    setPosicao(null);
    seguirRef.current = true;
    setSeguir(true);
    setGeoAtivo(true);
  }
  function centralizarGeo() {
    seguirRef.current = true;
    setSeguir(true);
    if (posicao)
      mapa.current?.setView(
        [posicao.latitude, posicao.longitude],
        posicao.precisao > 1000 ? 10 : 14,
        { animate: false },
      );
  }
  function verRegiao() {
    setBusca("");
    setCategoria("todas");
    setSomenteComDemandas(false);
    setPontoInspecao(null);
    setConsultaEmbarcacao(null);
    pausarSeguimento();
    mapa.current?.fitBounds(LIMITES, { padding: [24, 24], animate: false });
  }

  return (
    <section
      aria-labelledby="titulo-mapa-ern"
      className="mt-7 min-w-0 overflow-hidden rounded-2xl border border-[#E3A144]/25 bg-[#0A1713] text-[#EDEDE3] sm:rounded-[26px]"
    >
      <style>{`
        @keyframes ern-gps-a-bordo-pulso {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .ern-gps-a-bordo-pulsando {
          animation: ern-gps-a-bordo-pulso 1.8s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .ern-gps-a-bordo-pulsando { animation: none; }
        }
      `}</style>
      <div className="border-b border-white/10 bg-gradient-to-br from-[#18372a] to-[#0A1713] p-4 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
          ERN · território, turismo e operação
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2
              id="titulo-mapa-ern"
              className="text-2xl sm:text-3xl"
              style={{ fontFamily: "var(--font-fraunces), serif" }}
            >
              Explore o Rio Negro
            </h2>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-[#EDEDE3]/75">
              Praias, natureza e cultura conectadas ao território da sua
              operação.
            </p>
          </div>
          <span className="rounded-full border border-[#E3A144]/30 px-3 py-2 text-[10px] uppercase tracking-wider text-[#F4C77E]">
            Alto e Baixo Rio Negro
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Visão do mapa">
          {(["turismo", "demandas"] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={modo === item}
              onClick={() => {
                setModo(item);
                setBusca("");
              }}
              className={`${BOTAO} ${modo === item ? "border-[#E3A144] bg-[#E3A144]/10 text-[#F4C77E]" : "border-white/20"}`}
            >
              {item === "turismo" ? "Explorar turismo" : "Demandas da empresa"}
            </button>
          ))}
          <button
            type="button"
            onClick={alternarGeo}
            className={`${BOTAO} ${geoAtivo ? "border-blue-400 bg-blue-400/10 text-blue-200" : "border-white/20"}`}
          >
            {geoAtivo ? "Desligar localização" : "Ativar minha localização"}
          </button>
          <button
            type="button"
            aria-pressed={inspecionar}
            onClick={() => {
              setMarcandoEmbarcacao(false);
              setInspecionar((ativo) => !ativo);
            }}
            className={`${BOTAO} ${inspecionar ? "border-[#E3A144] text-[#F4C77E]" : "border-white/20"}`}
          >
            {inspecionar ? "Seleção de ponto ativa" : "Inspecionar um ponto"}
          </button>
          <button
            type="button"
            onClick={verRegiao}
            className={`${BOTAO} border-white/20`}
          >
            Ver toda a região
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-[11px] text-[#EDEDE3]/75">
            Município de referência
            <select
              value={cidadeId}
              onChange={(e) => selecionarCidade(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl border border-white/20 bg-[#07110E] px-3 text-sm text-[#EDEDE3]"
            >
              {LOCALIDADES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] text-[#EDEDE3]/75">
            {modo === "turismo"
              ? "Buscar na região inteira"
              : "Buscar município"}
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={
                modo === "turismo"
                  ? "Praia Grande, Mariuá, Manaus…"
                  : "Nome do município…"
              }
              className="mt-1 min-h-11 w-full rounded-xl border border-white/20 bg-[#07110E] px-3 text-sm text-[#EDEDE3] outline-none focus:border-[#E3A144]"
            />
          </label>
        </div>
      </div>
      <ReferenciaEmbarcacaoERN
        referencia={referenciaEmbarcacao}
        modo={modoEmbarcacao}
        marcando={marcandoEmbarcacao}
        localidades={LOCALIDADES}
        atrativos={ATRATIVOS.flatMap((a) =>
          a.coordenadas
            ? [
                {
                  id: a.id,
                  nome: a.nome,
                  coordenadas: a.coordenadas,
                  observacao: a.referencia,
                },
              ]
            : [],
        )}
        aoMarcar={() => {
          setInspecionar(false);
          setMarcandoEmbarcacao((valor) => !valor);
        }}
        aoUsarGPS={() => {
          setInspecionar(false);
          setMarcandoEmbarcacao(false);
          setConsultaEmbarcacao(null);
          setModoEmbarcacao("gps");
          if (!geoAtivo) alternarGeo();
          else centralizarGeo();
        }}
        aoLimpar={() => {
          if (modoEmbarcacao === "gps" && geoAtivo) alternarGeo();
          setModoEmbarcacao("nenhuma");
          setMarcandoEmbarcacao(false);
          setPosicaoManual(null);
          setConsultaEmbarcacao(null);
        }}
        aoCentralizar={() => {
          if (referenciaEmbarcacao) {
            pausarSeguimento();
            mapa.current?.setView(referenciaEmbarcacao.coordenadas, 13, {
              animate: false,
            });
          }
        }}
        aoSelecionarLocalidade={selecionarCidade}
        aoSelecionarAtrativo={(id) => {
          const a = ATRATIVOS.find((item) => item.id === id);
          if (a) {
            setModo("turismo");
            setBusca("");
            setCategoria("todas");
            selecionarAtrativo(a);
          }
        }}
        aoConsultarEntorno={consultarEntorno}
      />
      {inspecionar && (
        <p
          role="status"
          className="border-b border-white/10 px-4 py-3 text-xs leading-6 text-[#F4C77E]"
        >
          Toque no mapa operacional para escolher uma referência. O painel de
          imagens abaixo usará esse ponto; ele não identifica automaticamente o
          endereço ou o imóvel.
        </p>
      )}
      <div className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="relative isolate z-0 bg-[#d5dfd4]">
            <div
              ref={container}
              aria-label="Mapa interativo do Rio Negro. As opções abaixo também permitem selecionar municípios e atrativos."
              className="h-[380px] w-full sm:h-[510px] xl:h-[580px]"
            />
            {estado === "carregando" && (
              <div
                role="status"
                className="absolute inset-0 z-[1000] flex items-center justify-center bg-[#0A1713] text-sm"
              >
                Preparando o território ERN…
              </div>
            )}
            {estado === "erro" && (
              <div
                role="alert"
                className="absolute inset-0 z-[1000] flex flex-col items-center justify-center gap-4 bg-[#0A1713] p-6 text-center text-sm"
              >
                <p>O mapa não abriu. O catálogo continua disponível abaixo.</p>
                <button
                  type="button"
                  onClick={() => setTentativa((n) => n + 1)}
                  className={`${BOTAO} border-[#E3A144]`}
                >
                  Tentar novamente
                </button>
              </div>
            )}
          </div>
          {falhaBase && estado === "pronto" && (
            <div
              role="status"
              className="flex flex-wrap items-center gap-2 border-t border-white/10 p-3 text-xs text-amber-200"
            >
              Parte do mapa não carregou. Confira a conexão.
              <button
                type="button"
                className={`${BOTAO} border-amber-200/30`}
                onClick={() => setTentativa((n) => n + 1)}
              >
                Recarregar mapa
              </button>
            </div>
          )}
          <div
            className="flex flex-wrap gap-x-4 gap-y-2 border-t border-white/10 p-3 text-[11px] text-[#EDEDE3]/80"
            aria-label="Legenda"
          >
            <span>● Sedes municipais</span>
            {Object.values(CATEGORIAS).map((cat) => (
              <span key={cat.nome}>
                <span style={{ color: cat.cor }}>{cat.simbolo}</span> ·{" "}
                {cat.nome}
              </span>
            ))}
            <span>
              <span className="text-blue-400">●</span> Sua posição e margem de
              precisão
            </span>
          </div>
          <div className="border-t border-white/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Sua localização</h3>
              {geoAtivo && posicao && (
                <button
                  type="button"
                  aria-pressed={seguir}
                  onClick={() => {
                    if (seguir) pausarSeguimento();
                    else centralizarGeo();
                  }}
                  className={`${BOTAO} border-blue-400/40 text-blue-200`}
                >
                  {seguir ? "Parar de seguir no mapa" : "Centralizar e seguir"}
                </button>
              )}
            </div>
            <div
              role="status"
              className="mt-2 text-xs leading-6 text-[#EDEDE3]/75"
            >
              {geoAtivo && posicao && (
                <p>
                  {geoAntigo || geoMensagem
                    ? "Última posição recebida"
                    : "Posição atualizada pelo dispositivo"}{" "}
                  · margem aproximada de {metrica(posicao.precisao)} · leitura
                  às {new Date(posicao.instante).toLocaleTimeString("pt-BR")}.
                </p>
              )}
              {geoPausado && geoAtivo ? (
                <p>Atualização pausada enquanto a página está oculta.</p>
              ) : geoMensagem ? (
                <p>{geoMensagem}</p>
              ) : !geoAtivo ? (
                <p>
                  Ative para ver a posição deste aparelho. O navegador
                  solicitará sua permissão.
                </p>
              ) : null}
            </div>
            <p className="mt-2 text-[11px] leading-5 text-[#EDEDE3]/60">
              Sua posição não é salva na ERN nem compartilhada com outros
              usuários. A atualização depende do aparelho e do sinal e pode
              consumir bateria. No computador, a precisão pode ser baixa.
            </p>
          </div>
        </div>
        <aside className="min-w-0 border-t border-white/10 p-4 sm:p-5 xl:border-l xl:border-t-0">
          <p className="text-[10px] uppercase tracking-widest text-[#7C9C87]">
            {atrativo ? "Conheça o atrativo" : "Município de referência"}
          </p>
          <h3 className="mt-2 text-xl text-[#F4C77E]">
            {atrativo?.nome ?? cidade.nome}
          </h3>
          <p className="mt-3 text-xs leading-6 text-[#EDEDE3]/80">
            {atrativo?.descricao ?? cidade.resumo}
          </p>
          {atrativo && (
            <>
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7C9C87]">
                  Planeje a visita
                </p>
                <p className="mt-2 text-xs leading-6">{atrativo.visita}</p>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-[#EDEDE3]/65">
                {atrativo.coordenadas
                  ? atrativo.referencia
                  : "Coordenada do atrativo ainda não confirmada. A seleção centraliza apenas a sede municipal; não há marcador deste atrativo."}
              </p>
              <a
                href={atrativo.fonte}
                target="_blank"
                rel="noopener noreferrer"
                className={`${BOTAO} mt-3 w-full border-[#E3A144]/40 text-[#F4C77E]`}
              >
                Consultar fonte do atrativo ↗
              </a>
              {atrativo.fonteCoordenadas && (
                <a
                  href={atrativo.fonteCoordenadas}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex min-h-11 items-center text-[11px] text-[#EDEDE3]/75 underline"
                >
                  Fonte da coordenada ↗
                </a>
              )}
            </>
          )}
          {!atrativo && (
            <p className="mt-3 text-[11px] leading-5 text-[#EDEDE3]/65">
              O círculo representa a sede municipal aproximada, não a posição de
              parceiros ou demandas.
            </p>
          )}
          <div className="mt-5 rounded-xl border border-white/10 p-3">
            <h4 className="text-sm">Demandas em {cidade.nome}</h4>
            <p className="mt-2 text-xs text-[#EDEDE3]/75">
              {carregando
                ? "Consultando…"
                : `${itens.length} aberta(s) ou em rascunho`}
            </p>
            {modo === "demandas" && !carregando && itens.length > 0 && (
              <ul className="mt-3 max-h-48 space-y-3 overflow-y-auto">
                {itens.map((d) => (
                  <li key={d.id} className="border-t border-white/10 pt-2">
                    <p className="break-words text-xs leading-5">{d.titulo}</p>
                    <span className="text-[10px] text-[#E3A144]">
                      {d.status === "aberta" ? "Aberta" : "Rascunho"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/demandas"
              className="mt-2 flex min-h-11 items-center text-xs text-[#F4C77E]"
            >
              Gerenciar demandas →
            </Link>
          </div>
          {!carregando && resumo.semLocalizacao > 0 && (
            <p className="mt-3 text-[11px] leading-5 text-[#F4C77E]">
              {resumo.semLocalizacao} demanda(s) sem município reconhecido.
              Continuam disponíveis na lista completa.
            </p>
          )}
        </aside>
      </div>
      <div ref={painelImagens} className="scroll-mt-20">
        {consultaEmbarcacao ? (
          <ImagensLocalERN
            key={`embarcacao-${consultaEmbarcacao.referencia.coordenadas.join(",")}-${consultaEmbarcacao.referencia.instante}-${consultaEmbarcacao.termo}`}
            nome="Entorno da embarcação"
            municipio="Ponto de referência escolhido"
            coordenadas={consultaEmbarcacao.referencia.coordenadas}
            referencia={`Consulta baseada na posição ${consultaEmbarcacao.referencia.origem === "manual" ? "manual" : "do aparelho declarado a bordo"} de ${new Date(consultaEmbarcacao.referencia.instante).toLocaleString("pt-BR")}. A consulta não acompanha novas posições automaticamente.${consultaEmbarcacao.referencia.precisao !== undefined ? ` Margem informada pelo aparelho: ${metrica(consultaEmbarcacao.referencia.precisao)}.` : ""}`}
            consultaInicial={consultaEmbarcacao.termo}
            consultaPorCoordenadas
          />
        ) : (
          <ImagensLocalERN
            key={`${pontoInspecao?.join(",") ?? atrativo?.id ?? cidadeId}`}
            nome={
              pontoInspecao
                ? "Ponto selecionado no mapa"
                : (atrativo?.nome ?? cidade.nome)
            }
            municipio={cidade.nome}
            coordenadas={
              pontoInspecao ?? atrativo?.coordenadas ?? cidade.coordenadas
            }
            referencia={
              pontoInspecao
                ? "Ponto escolhido manualmente. O município continua sendo sua referência de consulta; confirme a localização antes de pesquisar um endereço."
                : atrativo?.coordenadas
                  ? (atrativo.referencia ??
                    "Coordenada de referência do atrativo.")
                  : atrativo
                    ? "Este atrativo ainda não tem coordenada confirmada. As imagens começam na sede municipal, não no atrativo."
                    : "As imagens começam na referência aproximada da sede municipal."
            }
          />
        )}
      </div>
      {modo === "turismo" ? (
        <div className="border-t border-white/10 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg">
                {busca ? "Resultados na região" : `Descubra ${cidade.nome}`}
              </h3>
              <p className="mt-1 text-[11px] leading-5 text-[#EDEDE3]/65">
                {atrativosVisiveis.length} referência(s) no catálogo ·{" "}
                {semCoordenadas} sem marcador, aguardando coordenadas.
              </p>
            </div>
            <div
              className="flex flex-wrap gap-2"
              aria-label="Categorias de atrativos"
            >
              {(["todas", "praias", "natureza", "cultura"] as const).map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={categoria === cat}
                    onClick={() => setCategoria(cat)}
                    className={`${BOTAO} ${categoria === cat ? "border-[#E3A144] text-[#F4C77E]" : "border-white/20"}`}
                  >
                    {cat === "todas" ? "Todos" : CATEGORIAS[cat].nome}
                  </button>
                ),
              )}
            </div>
          </div>
          <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {atrativosVisiveis.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-pressed={atrativo?.id === a.id}
                onClick={() => selecionarAtrativo(a)}
                className={`min-w-0 rounded-2xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-[#E3A144] ${atrativo?.id === a.id ? "border-[#E3A144]/70 bg-[#E3A144]/[0.07]" : "border-white/15 bg-white/[0.02] hover:border-white/30"}`}
              >
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: CATEGORIAS[a.categoria].cor }}
                >
                  {CATEGORIAS[a.categoria].nome} ·{" "}
                  {LOCALIDADES.find((c) => c.id === a.cidade)?.nome}
                </span>
                <strong className="mt-2 block text-sm text-[#F0F0E8]">
                  {a.nome}
                </strong>
                <span className="mt-2 block text-xs leading-6 text-[#EDEDE3]/75">
                  {a.descricao}
                </span>
                <span className="mt-3 block text-[11px] text-[#F4C77E]">
                  {a.coordenadas
                    ? "Ver referência no mapa →"
                    : "Ver detalhes e município →"}
                </span>
              </button>
            ))}
          </div>
          {atrativosVisiveis.length === 0 && (
            <p role="status" className="mt-4 text-sm text-[#EDEDE3]/75">
              Nenhum atrativo corresponde à busca e à categoria selecionada.
            </p>
          )}
        </div>
      ) : (
        <div className="border-t border-white/10 p-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={somenteComDemandas}
              onClick={() => setSomenteComDemandas((v) => !v)}
              className={`${BOTAO} ${somenteComDemandas ? "border-[#E3A144] text-[#F4C77E]" : "border-white/20"}`}
            >
              Somente com demandas
            </button>
            {cidadesVisiveis.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={cidadeId === c.id}
                onClick={() => selecionarCidade(c.id)}
                className={`${BOTAO} ${cidadeId === c.id ? "border-[#E3A144] text-[#F4C77E]" : "border-white/20"}`}
              >
                {c.nome}
                {!carregando && ` · ${resumo.porCidade[c.id].length}`}
              </button>
            ))}
          </div>
          {cidadesVisiveis.length === 0 && (
            <p role="status" className="mt-3 text-xs">
              Nenhum município corresponde aos filtros.
            </p>
          )}
        </div>
      )}
      <div className="border-t border-white/10 px-4 py-3 text-[11px] leading-5 text-[#EDEDE3]/65">
        <p>
          Catálogo inicial consultado em 15/10/2026. Praias e acessos variam
          conforme as condições do rio. Não há disponibilidade de passeios em
          tempo real nem rotas de navegação.
        </p>
        <p className="mt-1">
          Coordenadas da Ilha da Praia Grande:{" "}
          <a
            href="https://www.geonames.org/12965878/ilha-da-praia-grande.html"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            GeoNames
          </a>{" "}
          ·{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            CC BY 4.0
          </a>
          .{" "}
          <a
            href="https://www.openstreetmap.org/fixthemap"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Informar problema na base cartográfica ↗
          </a>
        </p>
      </div>
    </section>
  );
}

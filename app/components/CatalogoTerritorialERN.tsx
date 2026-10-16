"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import { LOCALIDADES_RIO_NEGRO, MUNICIPIOS_TERRITORIO_ERN, FONTE_TERRITORIO_ERN, type LocalidadeRioNegro } from "./territorioRioNegroERN";
import { distanciaReta, type ReferenciaEmbarcacao } from "./ReferenciaEmbarcacaoERN";
import AtrativosRegionaisERN from "./AtrativosRegionaisERN";

type Coordenadas = [number, number];
type Props = { mapa: LeafletMap | null; referencia: ReferenciaEmbarcacao | null; aoExplorar: (ponto: Coordenadas) => void };
const normalizar = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const CAMPO = "min-h-11 w-full rounded-xl border border-white/20 bg-[var(--ern-painel,#07110E)] px-3 text-sm text-[color:var(--ern-texto,#EDEDE3)]";
const BOTAO = "min-h-11 rounded-xl border border-white/20 px-3 py-2 text-left text-xs text-[color:var(--ern-texto,#EDEDE3)] hover:border-[#E3A144] disabled:opacity-50";
export default function CatalogoTerritorialERN({ mapa, referencia, aoExplorar }: Props) {
  const [busca, setBusca] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [categoria, setCategoria] = useState("");
  const [visivel, setVisivel] = useState(true);
  const [limite, setLimite] = useState(12);
  const [vista, setVista] = useState({ total: 0, exibidos: 0, zoom: 0 });
  const [selecionada, setSelecionada] = useState<LocalidadeRioNegro | null>(null);
  const callback = useRef(aoExplorar);
  callback.current = aoExplorar;
  const camada = useRef<LayerGroup | null>(null);
  const categorias = useMemo(() => [...new Set(LOCALIDADES_RIO_NEGRO.map(l => l.categoria))].sort(), []);
  const filtradas = useMemo(() => LOCALIDADES_RIO_NEGRO.filter(l =>
    (!municipio || l.municipio === municipio) && (!categoria || l.categoria === categoria) &&
    (!busca || normalizar(`${l.nome} ${l.municipio} ${l.categoria}`).includes(normalizar(busca)))
  ), [busca, municipio, categoria]);
  const proximas = useMemo(() => referencia ? LOCALIDADES_RIO_NEGRO.map(l => ({ ...l, distancia: distanciaReta(referencia.coordenadas, l.coordenadas) })).sort((a,b) => a.distancia-b.distancia).slice(0,6) : [], [referencia?.coordenadas[0], referencia?.coordenadas[1]]);
  const aoEscolher = (local: LocalidadeRioNegro) => {
    setSelecionada(local);
    callback.current(local.coordenadas);
  };
  useEffect(() => {
    if (!mapa) return;
    let ativo = true;
    let desenhar: (() => void) | undefined;
    void import("leaflet").then(L => {
      if (!ativo) return;
      const grupo = L.layerGroup().addTo(mapa);
      camada.current = grupo;
      desenhar = () => {
        grupo.clearLayers();
        const zoom = mapa.getZoom();
        const dentro = filtradas.filter(l => mapa.getBounds().contains(l.coordenadas));
        const centro = mapa.getCenter();
        const candidatos = !visivel || zoom < 9 ? [] : [...dentro].sort((a,b) => distanciaReta([centro.lat,centro.lng],a.coordenadas)-distanciaReta([centro.lat,centro.lng],b.coordenadas)).slice(0,180);
        for (const local of candidatos) {
          // As sedes já têm marcadores próprios no mapa principal.
          if (local.categoria === "Cidade") continue;
          const ponto = L.circleMarker(local.coordenadas, { radius: 5, color: "#07110E", weight: 1.5, fillColor: "#7dd3fc", fillOpacity: .85, bubblingMouseEvents: false }).addTo(grupo);
          const rotulo = document.createElement("span");
          rotulo.textContent = `${local.nome} · ${local.categoria} · ${local.municipio} · IBGE 2022`;
          ponto.bindTooltip(rotulo);
          ponto.on("click", () => { setSelecionada(local); callback.current(local.coordenadas); });
        }
        setVista({ total: dentro.length, exibidos: candidatos.filter(l => l.categoria !== "Cidade").length, zoom });
      };
      desenhar();
      mapa.on("moveend zoomend", desenhar);
    });
    return () => { ativo = false; if (desenhar) mapa.off("moveend zoomend", desenhar); camada.current?.remove(); camada.current = null; };
  }, [mapa, filtradas, visivel]);

  const origem = referencia?.coordenadas ?? selecionada?.coordenadas ?? null;
  const nomeOrigem = referencia ? (referencia.origem === "gps" ? "posição do aparelho a bordo" : "posição manual da embarcação") : selecionada ? `${selecionada.nome} · ${selecionada.municipio}` : "";
  return <section aria-labelledby="catalogo-territorial-ern" className="border-b border-white/10 bg-[var(--ern-painel,#0C211A)] p-4 sm:p-6">
    <h3 id="catalogo-territorial-ern" className="text-xl text-[color:var(--ern-destaque,#F4C77E)]">Explore o Rio Negro</h3>
    <p className="mt-2 text-xs leading-6 text-[color:var(--ern-secundario,#EDEDE3)]">{LOCALIDADES_RIO_NEGRO.length.toLocaleString("pt-BR")} referências territoriais do IBGE em Manaus, Iranduba, Novo Airão, Barcelos, Santa Isabel e São Gabriel. O recorte inclui áreas interiores e afluentes desses municípios; ainda não representa toda a bacia nem todos os atrativos.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <label className="text-xs">Buscar localidade<input aria-label="Buscar localidade regional" value={busca} onChange={e => { setBusca(e.target.value); setLimite(12); }} placeholder="Ex.: Cucuí, Paricatuba…" className={CAMPO+" mt-2"} /></label>
      <label className="text-xs">Município<select aria-label="Filtrar município regional" value={municipio} onChange={e => { setMunicipio(e.target.value); setLimite(12); }} className={CAMPO+" mt-2"}><option value="">Todos os seis municípios</option>{MUNICIPIOS_TERRITORIO_ERN.map(m => <option key={m}>{m}</option>)}</select></label>
      <label className="text-xs">Tipo de localidade<select aria-label="Filtrar tipo de localidade" value={categoria} onChange={e => { setCategoria(e.target.value); setLimite(12); }} className={CAMPO+" mt-2"}><option value="">Todas as categorias</option>{categorias.map(c => <option key={c}>{c}</option>)}</select></label>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[color:var(--ern-secundario,#EDEDE3)]">
      <button type="button" aria-pressed={visivel} onClick={() => setVisivel(v => !v)} className={BOTAO}>{visivel ? "Ocultar localidades no mapa" : "Mostrar localidades no mapa"}</button>
      <span role="status">{filtradas.length} resultados · {vista.exibidos} marcadores territoriais nesta vista.{vista.zoom < 9 && visivel ? " Aproxime o mapa para exibir os pontos." : ""}{vista.total > 180 && visivel ? " Aproxime ou filtre para ver os demais." : ""}</span>
    </div>
    <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
      {filtradas.slice(0,limite).map(l => <button type="button" key={l.id} onClick={() => aoEscolher(l)} className={BOTAO}><strong className="block text-[color:var(--ern-destaque,#F4C77E)]">{l.nome}</strong><span>{l.categoria} · {l.municipio}</span></button>)}
    </div>
    {filtradas.length === 0 && <p role="status" className="mt-3 text-sm">Nenhuma localidade corresponde aos filtros.</p>}
    {filtradas.length > limite && <button type="button" onClick={() => setLimite(l => l+24)} className={BOTAO+" mt-3"}>Mostrar mais localidades ({Math.min(limite,filtradas.length)} de {filtradas.length})</button>}
    {selecionada && <p className="mt-3 text-xs leading-6 text-[color:var(--ern-secundario,#EDEDE3)]">Selecionada: <strong>{selecionada.nome}</strong> · {selecionada.municipio} · {selecionada.categoria}. Coordenadas de referência: {selecionada.coordenadas.join(", ")}. <a className="underline" href={FONTE_TERRITORIO_ERN} target="_blank" rel="noopener noreferrer">Fonte IBGE 2022</a>.</p>}
    {referencia && <div className="mt-5"><h4 className="text-sm font-semibold text-[color:var(--ern-destaque,#F4C77E)]">Localidades mais próximas da embarcação</h4><p className="mt-1 text-xs text-[color:var(--ern-secundario,#EDEDE3)]">Entre as {LOCALIDADES_RIO_NEGRO.length} referências, independentemente dos filtros. Distância em linha reta.{referencia.desatualizada ? " Posição desatualizada: comparação pela última posição recebida." : ""}</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{proximas.map(l => <button type="button" key={l.id} className={BOTAO} onClick={() => aoEscolher(l)}><strong className="block">{l.nome} · {(l.distancia/1000).toLocaleString("pt-BR",{maximumFractionDigits:1})} km</strong>{l.categoria} · {l.municipio}</button>)}</div></div>}
    <p className="mt-4 text-xs leading-6 text-[color:var(--ern-secundario,#EDEDE3)]">Referências geográficas não indicam porto, autorização de visita, serviço ou rota navegável. Base de referência 2022, obtida em 15/10/2026. <a href="https://www.ibge.gov.br/geociencias/organizacao-do-territorio/estrutura-territorial/27385-localidades.html" target="_blank" rel="noopener noreferrer" className="underline">Localidades do Brasil — IBGE</a>.</p>
    <AtrativosRegionaisERN mapa={mapa} origem={origem} nomeOrigem={nomeOrigem} aoExplorar={aoExplorar} />
  </section>;
}

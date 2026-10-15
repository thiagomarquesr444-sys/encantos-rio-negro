"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { distanciaReta } from "./ReferenciaEmbarcacaoERN";
type Coordenadas = [number, number];
export type PontoOSM = { id: string; nome: string; categoria: string; coordenadas: Coordenadas; aproximado: boolean; fonte: string };
type Props = { mapa: LeafletMap | null; origem: Coordenadas | null; nomeOrigem: string; aoExplorar: (p: Coordenadas) => void };
export function prepararPontosOSM(dados: unknown, origem: Coordenadas): PontoOSM[] {
  if (!dados || typeof dados !== "object" || !("elements" in dados) || !Array.isArray(dados.elements)) throw new Error("Resposta cartográfica inválida.");
  if ("remark" in dados && dados.remark) throw new Error("A consulta não foi concluída pelo serviço cartográfico. Tente novamente mais tarde.");
  const nomes: Record<string,string> = { attraction:"Atrativo", museum:"Museu", viewpoint:"Mirante", gallery:"Galeria", camp_site:"Camping", hotel:"Hotel", guest_house:"Hospedagem", hostel:"Hostel", beach:"Praia" };
  const pontos: PontoOSM[] = [];
  const vistos = new Set<string>();
  for (const dado of dados.elements.slice(0,81)) {
    if (!dado || typeof dado !== "object") continue;
    const e = dado as { type?: unknown; id?: unknown; lat?: unknown; lon?: unknown; center?: {lat?:unknown;lon?:unknown}; tags?: Record<string,unknown> };
    if (!["node","way","relation"].includes(String(e.type)) || typeof e.id !== "number" || !Number.isSafeInteger(e.id) || e.id < 1) continue;
    const lat = e.type === "node" ? e.lat : e.center?.lat;
    const lon = e.type === "node" ? e.lon : e.center?.lon;
    if (typeof lat !== "number" || typeof lon !== "number" || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat)>90 || Math.abs(lon)>180) continue;
    const tipo = e.tags?.natural === "beach" ? "beach" : String(e.tags?.tourism ?? "");
    if (!nomes[tipo]) continue;
    const id = `${e.type}/${e.id}`;
    if (vistos.has(id)) continue;
    vistos.add(id);
    pontos.push({id, nome: typeof e.tags?.name === "string" ? e.tags.name : `${nomes[tipo]} sem nome no OSM`, categoria: nomes[tipo], coordenadas:[lat,lon], aproximado:e.type !== "node", fonte:`https://www.openstreetmap.org/${id}`});
  }
  return pontos.sort((a,b) => distanciaReta(origem,a.coordenadas)-distanciaReta(origem,b.coordenadas)).slice(0,80);
}
export default function AtrativosRegionaisERN({ mapa, origem, nomeOrigem, aoExplorar }: Props) {
  const [consulta, setConsulta] = useState<{nome:string; ponto:Coordenadas; instante:number; pontos:PontoOSM[]; limitado:boolean} | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [aguardando, setAguardando] = useState(false);
  const trava = useRef(false);
  const controlador = useRef<AbortController | null>(null);
  const cache = useRef(new Map<string,{pontos:PontoOSM[]; limitado:boolean; instante:number}>());
  const ativo = useRef(true);
  const callback = useRef(aoExplorar); callback.current = aoExplorar;
  useEffect(() => { ativo.current=true; return () => { ativo.current=false; controlador.current?.abort(); }; }, []);
  useEffect(() => { if (!aguardando) return; const id = window.setTimeout(() => setAguardando(false),30000); return () => window.clearTimeout(id); }, [aguardando]);
  useEffect(() => {
    if (!mapa || !consulta) return;
    let cancelado=false;
    let remover: (()=>void) | undefined;
    void import("leaflet").then(L => {
      if (cancelado) return;
      const camada=L.layerGroup().addTo(mapa);
      remover=()=>camada.remove();
      for (const p of consulta.pontos) {
        const marcador=L.circleMarker(p.coordenadas,{radius:7,color:"#07110E",weight:2,fillColor:"#f0abfc",fillOpacity:.9,bubblingMouseEvents:false}).addTo(camada);
        const rotulo=document.createElement("span");rotulo.textContent=`${p.nome} · ${p.categoria} · OpenStreetMap${p.aproximado ? " · centro aproximado da área" : ""}`;
        marcador.bindTooltip(rotulo);marcador.on("click",()=>callback.current(p.coordenadas));
      }
    });
    return ()=>{cancelado=true;remover?.();};
  },[mapa,consulta]);
  async function consultar() {
    if (!origem || trava.current || aguardando) return;
    const ponto: Coordenadas=[...origem];
    const nome=nomeOrigem;
    const chave=ponto.map(v=>v.toFixed(5)).join(",");
    const anterior=cache.current.get(chave);
    setErro("");
    if (anterior && Date.now()-anterior.instante < 900000) {setConsulta({nome,ponto,...anterior});return;}
    trava.current=true;setCarregando(true);setAguardando(true);
    const abort=new AbortController();controlador.current=abort;
    const timer=window.setTimeout(()=>abort.abort(),30000);
    try {
      const centro=ponto.join(",");
      const query=`[out:json][timeout:25];(nwr(around:15000,${centro})[tourism~"^(attraction|museum|viewpoint|gallery|camp_site|hotel|guest_house|hostel)$"];nwr(around:15000,${centro})[natural=beach];);out body center 81;`;
      const resposta=await fetch("https://overpass-api.de/api/interpreter",{method:"POST",body:new URLSearchParams({data:query}),signal:abort.signal,credentials:"omit"});
      if (!resposta.ok) throw new Error(resposta.status===429 ? "Serviço cartográfico ocupado. Aguarde antes de consultar novamente." : "Serviço cartográfico indisponível. Tente novamente mais tarde.");
      const dados:unknown=await resposta.json();
      const pontos=prepararPontosOSM(dados,ponto);
      const limitado=!!dados && typeof dados==="object" && "elements" in dados && Array.isArray(dados.elements) && dados.elements.length>=81;
      const resultado={pontos,limitado,instante:Date.now()};
      if (ativo.current) {cache.current.set(chave,resultado);if(cache.current.size>15)cache.current.delete(cache.current.keys().next().value!);setConsulta({nome,ponto,...resultado});}
    } catch(falha) {
      if(ativo.current) setErro(abort.signal.aborted ? "A consulta demorou demais. Tente novamente mais tarde." : falha instanceof Error ? falha.message : "Não foi possível consultar os atrativos.");
    } finally {window.clearTimeout(timer);if(ativo.current){trava.current=false;setCarregando(false);} }
  }
  const botao="min-h-11 rounded-xl border border-white/20 px-3 py-2 text-left text-xs hover:border-[#E3A144] disabled:opacity-50";
  return <section aria-labelledby="atrativos-regionais-ern" className="mt-5 rounded-2xl border border-white/10 p-4">
    <h4 id="atrativos-regionais-ern" className="text-sm font-semibold text-[#F4C77E]">Atrativos e hospedagens na região</h4>
    <p className="mt-2 text-xs leading-6 text-[#EDEDE3]/70">Consulte os pontos mapeados no OpenStreetMap em até 15 km da embarcação ou da localidade selecionada. A consulta envia essa coordenada ao serviço público Overpass, somente ao clicar. Os resultados não são parceiros ERN nem indicam disponibilidade ou acesso autorizado.</p>
    <button type="button" onClick={()=>void consultar()} disabled={!origem || carregando || aguardando} className={botao+" mt-3"}>{carregando ? "Consultando mapa regional…" : aguardando ? "Aguarde 30 segundos entre consultas" : "Consultar atrativos e hospedagens neste ponto"}</button>
    {!origem && <p className="mt-2 text-xs">Selecione uma localidade acima ou defina a posição da embarcação.</p>}
    {origem && <p className="mt-2 text-xs text-[#EDEDE3]/65">Referência para a próxima consulta: {nomeOrigem}.</p>}
    {erro && <p role="alert" className="mt-3 text-xs text-amber-200">{erro}{consulta ? " Os resultados anteriores permanecem identificados abaixo." : ""}</p>}
    {consulta && <><p role="status" className="mt-3 text-xs leading-6">{consulta.pontos.length} pontos · consulta em {new Date(consulta.instante).toLocaleString("pt-BR")} · referência: {consulta.nome} ({consulta.ponto.join(", ")}). A consulta não acompanha o GPS automaticamente.{consulta.limitado ? " Limite de resultados atingido: esta lista é parcial e não garante os pontos mais próximos." : ""}</p>
      {consulta.pontos.length===0 && <p className="mt-2 text-xs">Nenhum ponto dessas categorias foi retornado. Isso não significa ausência de atrativos no local.</p>}
      <div className="mt-3 grid max-h-80 gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{consulta.pontos.map(p=><article key={p.id} className="rounded-xl border border-white/10 p-3 text-xs"><strong className="block text-[#F4C77E]">{p.nome}</strong><p className="mt-1">{p.categoria}{p.aproximado ? " · centro aproximado da área" : " · ponto mapeado"}</p><button type="button" className={botao+" mt-2"} onClick={()=>aoExplorar(p.coordenadas)}>Ver no mapa</button><a className="ml-3 underline" href={p.fonte} target="_blank" rel="noopener noreferrer">Fonte OSM</a></article>)}</div>
      <button type="button" className={botao+" mt-3"} onClick={()=>setConsulta(null)}>Limpar resultados da consulta</button>
    </>}
    <p className="mt-3 text-xs leading-6 text-[#EDEDE3]/60">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">OpenStreetMap contributors — ODbL</a>. Cobertura colaborativa e parcial. Coordenadas de áreas representam seu centro, não sua entrada. Serviço público compartilhado, sujeito a indisponibilidade; sem API paga adicionada.</p>
  </section>;
}

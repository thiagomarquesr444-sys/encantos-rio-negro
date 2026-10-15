"use client";

import { useState } from "react";

type Props = {
  nome: string;
  municipio: string;
  coordenadas: [number, number];
  referencia: string;
  consultaInicial?: string;
  consultaPorCoordenadas?: boolean;
};
type Visao = "satelite" | "rua" | "consulta";
const BOTAO =
  "inline-flex min-h-11 items-center justify-center rounded-xl border px-3 py-2 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3A144]";

export default function ImagensLocalERN({
  nome,
  municipio,
  coordenadas,
  referencia,
  consultaInicial,
  consultaPorCoordenadas = false,
}: Props) {
  const [visao, setVisao] = useState<Visao>(
    consultaInicial ? "consulta" : "satelite",
  );
  const [aberto, setAberto] = useState(!!consultaInicial);
  const [termo, setTermo] = useState("");
  const [consulta, setConsulta] = useState("");
  // Chave de navegador: restringir por domínio e exclusivamente à Maps Embed API.
  // A ausência da chave mantém links oficiais, sem ativar serviços externos pagos.
  const chave = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY?.trim();
  const centro = coordenadas.join(",");
  const busca =
    consulta ||
    (consultaPorCoordenadas
      ? consultaInicial || "serviços"
      : `${nome}, ${municipio}, Amazonas, Brasil`);
  const parametros = new URLSearchParams({ language: "pt-BR", region: "BR" });
  let modo = "view";
  if (visao === "rua") {
    modo = "streetview";
    parametros.set("location", centro);
    parametros.set("radius", "50");
  } else if (visao === "consulta") {
    modo = "search";
    parametros.set("q", busca);
    parametros.set("center", centro);
    parametros.set("zoom", "16");
  } else {
    parametros.set("center", centro);
    parametros.set("zoom", "18");
    parametros.set("maptype", "satellite");
  }
  if (chave) parametros.set("key", chave);
  const origem = `https://www.google.com/maps/embed/v1/${modo}?${parametros.toString()}`;
  const externos = new URLSearchParams({ api: "1" });
  let linkExterno = "";
  if (visao === "rua") {
    externos.set("map_action", "pano");
    externos.set("viewpoint", centro);
    linkExterno = `https://www.google.com/maps/@?${externos.toString()}`;
  } else if (visao === "consulta") {
    externos.set(
      "query",
      consultaPorCoordenadas ? `${busca} perto de ${centro}` : busca,
    );
    linkExterno = `https://www.google.com/maps/search/?${externos.toString()}`;
  } else {
    externos.set("map_action", "map");
    externos.set("center", centro);
    externos.set("zoom", "18");
    externos.set("basemap", "satellite");
    linkExterno = `https://www.google.com/maps/@?${externos.toString()}`;
  }

  return (
    <section
      aria-labelledby="ern-imagens-titulo"
      className="border-t border-[#E3A144]/20 bg-[#0C1C16] p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
            Explore o local em imagens
          </p>
          <h3 id="ern-imagens-titulo" className="mt-2 text-xl text-[#F4C77E]">
            {nome}
          </h3>
          <p className="mt-1 text-xs text-[#EDEDE3]/75">
            {consultaPorCoordenadas
              ? "Consulta a partir das coordenadas selecionadas"
              : `${municipio} · Amazonas`}
          </p>
        </div>
        <button
          type="button"
          aria-expanded={aberto}
          aria-controls="ern-imagens-conteudo"
          onClick={() => setAberto((valor) => !valor)}
          className={`${BOTAO} border-[#E3A144]/50 text-[#F4C77E]`}
        >
          {aberto ? "Fechar imagens" : "Explorar imagens reais"}
        </button>
      </div>
      <p className="mt-3 text-[11px] leading-5 text-[#EDEDE3]/70">
        {referencia}
      </p>
      <p className="mt-1 text-[11px] leading-5 text-[#EDEDE3]/60">
        Ponto de referência: {coordenadas[0].toFixed(6)},{" "}
        {coordenadas[1].toFixed(6)}. Selecione um ponto no mapa operacional para
        mudar a referência.
      </p>
      {aberto && (
        <div id="ern-imagens-conteudo" className="mt-4">
          <div
            className="flex flex-wrap gap-2"
            aria-label="Tipo de consulta visual"
          >
            {(
              [
                ["satelite", "Satélite"],
                ["rua", "Vista da rua"],
                ["consulta", "Endereços e estabelecimentos"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={visao === id}
                onClick={() => setVisao(id)}
                className={`${BOTAO} ${visao === id ? "border-[#E3A144] bg-[#E3A144]/10 text-[#F4C77E]" : "border-white/20"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {visao === "consulta" && consultaPorCoordenadas && (
            <p className="mt-3 text-xs leading-6 text-[#EDEDE3]/75">
              A posição fornece a referência da busca. O Google define a
              relevância e o alcance dos resultados, que podem incluir locais
              mais distantes. Não há raio máximo garantido.
            </p>
          )}
          {visao === "consulta" && (
            <form
              className="mt-3 flex flex-wrap gap-2"
              onSubmit={(evento) => {
                evento.preventDefault();
                if (termo.trim())
                  setConsulta(
                    consultaPorCoordenadas
                      ? termo.trim()
                      : `${termo.trim()}, ${municipio}, Amazonas, Brasil`,
                  );
              }}
            >
              <label className="min-w-0 flex-1">
                <span className="sr-only">
                  Nome de estabelecimento ou endereço em {municipio}
                </span>
                <input
                  value={termo}
                  maxLength={180}
                  onChange={(evento) => setTermo(evento.target.value)}
                  placeholder="Nome da pousada, comércio ou rua…"
                  className="min-h-11 w-full rounded-xl border border-white/20 bg-[#07110E] px-3 text-sm outline-none focus:border-[#E3A144]"
                />
              </label>
              <button
                type="submit"
                className={`${BOTAO} border-[#E3A144]/40 text-[#F4C77E]`}
              >
                Consultar
              </button>
              {consulta && (
                <button
                  type="button"
                  onClick={() => {
                    setConsulta("");
                    setTermo("");
                  }}
                  className={`${BOTAO} border-white/20`}
                >
                  Limpar consulta
                </button>
              )}
            </form>
          )}
          <p className="mt-3 text-xs leading-6 text-[#EDEDE3]/75">
            {visao === "satelite"
              ? "Fotografias aéreas ou de satélite do provedor. A resolução e a data variam por local; ampliar não garante novos detalhes."
              : visao === "rua"
                ? "A vista de rua depende de panoramas existentes perto deste ponto. A imagem pode ser de outra data ou de um ponto próximo, sem mostrar o imóvel selecionado."
                : "Consulte os resultados e endereços publicados pelo Google. Um resultado próximo não confirma a identidade de uma casa ou estabelecimento, nem sua situação atual."}
          </p>
          {chave ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-white/15 bg-[#07110E]">
              <iframe
                key={origem}
                title={`Google Maps · ${visao === "satelite" ? "imagens de satélite" : visao === "rua" ? "vista de rua" : "consulta de endereços"} · ${nome}`}
                src={origem}
                width="100%"
                height="460"
                loading="lazy"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="h-[360px] min-w-[200px] w-full border-0 sm:h-[460px]"
              />
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-white/15 bg-white/[0.025] p-4">
              <p className="text-sm text-[#EDEDE3]/85">
                Consulte esta visão no Google Maps pelo botão abaixo.
              </p>
            </div>
          )}
          <a
            href={linkExterno}
            target="_blank"
            rel="noopener noreferrer"
            className={`${BOTAO} mt-3 border-[#E3A144]/40 text-[#F4C77E]`}
          >
            Abrir{" "}
            {visao === "satelite"
              ? "satélite"
              : visao === "rua"
                ? "vista da rua"
                : "consulta"}{" "}
            no Google Maps ↗
          </a>
          <p className="mt-3 text-[11px] leading-5 text-[#EDEDE3]/60">
            Imagens e resultados fornecidos pelo Google. Ao abrir a consulta, o
            local selecionado é enviado ao provedor. A posição do seu
            dispositivo não é transmitida automaticamente para este painel.
          </p>
        </div>
      )}
    </section>
  );
}

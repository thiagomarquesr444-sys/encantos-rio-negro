"use client";

type Coordenadas = [number, number];
export type ReferenciaEmbarcacao = {
  coordenadas: Coordenadas;
  origem: "manual" | "gps";
  instante: number;
  precisao?: number;
  desatualizada?: boolean;
};
type Destino = {
  id: string;
  nome: string;
  coordenadas: Coordenadas;
  observacao?: string;
};
type Props = {
  referencia: ReferenciaEmbarcacao | null;
  modo: "nenhuma" | "manual" | "gps";
  marcando: boolean;
  localidades: Destino[];
  atrativos: Destino[];
  aoMarcar: () => void;
  aoUsarGPS: () => void;
  aoLimpar: () => void;
  aoCentralizar: () => void;
  aoSelecionarLocalidade: (id: string) => void;
  aoSelecionarAtrativo: (id: string) => void;
  aoConsultarEntorno: (termo: string) => void;
};
const BOTAO =
  "inline-flex min-h-11 items-center justify-center rounded-xl border px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3A144]";

// Haversine em metros: aproximação esférica, nunca percurso de navegação.
export function distanciaReta(
  origem: Coordenadas,
  destino: Coordenadas,
): number {
  const rad = Math.PI / 180;
  const deltaLat = (destino[0] - origem[0]) * rad;
  const deltaLng = (destino[1] - origem[1]) * rad;
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(origem[0] * rad) *
      Math.cos(destino[0] * rad) *
      Math.sin(deltaLng / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}
function distanciaFormatada(metros: number) {
  return metros >= 1000
    ? `${(metros / 1000).toFixed(1).replace(".", ",")} km`
    : `${Math.round(metros)} m`;
}
export default function ReferenciaEmbarcacaoERN(props: Props) {
  const { referencia } = props;
  const ordenar = (destinos: Destino[]) =>
    referencia
      ? destinos
          .map((destino) => ({
            ...destino,
            distancia: distanciaReta(
              referencia.coordenadas,
              destino.coordenadas,
            ),
          }))
          .sort((a, b) => a.distancia - b.distancia)
          .slice(0, 3)
      : [];
  const localidades = ordenar(props.localidades);
  const atrativos = ordenar(props.atrativos);
  return (
    <section
      aria-labelledby="ern-embarcacao-titulo"
      className="border-b border-[#E3A144]/20 bg-[#0C211A] p-4 sm:p-6"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
        Planejamento territorial da operação
      </p>
      <h3 id="ern-embarcacao-titulo" className="mt-2 text-xl text-[#F4C77E]">
        Onde está sua embarcação?
      </h3>
      <p className="mt-2 max-w-3xl text-xs leading-6 text-[#EDEDE3]/80">
        Defina uma referência para explorar localidades, atrativos e serviços ao
        redor. O aparelho só representa a embarcação quando estiver a bordo.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={props.marcando}
          onClick={props.aoMarcar}
          className={`${BOTAO} ${props.marcando ? "border-[#E3A144] text-[#F4C77E]" : "border-white/20"}`}
        >
          {props.marcando
            ? "Cancelar marcação da embarcação"
            : "Marcar embarcação no mapa"}
        </button>
        <button
          type="button"
          aria-pressed={props.modo === "gps"}
          onClick={props.aoUsarGPS}
          className={`${BOTAO} ${props.modo === "gps" ? "border-blue-400 text-blue-200" : "border-white/20"}`}
        >
          Estou a bordo · usar GPS
        </button>
        {referencia && (
          <button
            type="button"
            onClick={props.aoCentralizar}
            className={`${BOTAO} border-white/20`}
          >
            Ver embarcação
          </button>
        )}
        {(props.modo !== "nenhuma" || props.marcando) && (
          <button
            type="button"
            onClick={props.aoLimpar}
            className={`${BOTAO} border-white/20`}
          >
            Limpar referência
          </button>
        )}
      </div>
      {props.marcando && (
        <p
          role="status"
          className="mt-3 rounded-xl border border-[#E3A144]/40 p-3 text-sm text-[#F4C77E]"
        >
          Toque no mapa operacional para marcar a posição informada da
          embarcação. A marcação é manual e não acompanha o deslocamento.
        </p>
      )}
      {!referencia && !props.marcando && (
        <p role="status" className="mt-3 text-xs leading-6 text-[#EDEDE3]/70">
          {props.modo === "gps"
            ? "Aguardando a localização do aparelho. Confira a permissão e a mensagem em “Sua localização”, abaixo do mapa."
            : "Escolha uma posição para consultar proximidades. Nenhum parceiro cadastrado é necessário."}
        </p>
      )}
      {referencia && (
        <>
          <div className="mt-4 rounded-xl border border-white/15 bg-white/[0.025] p-3 text-xs leading-6">
            <p className="font-semibold text-[#F4C77E]">
              {referencia.origem === "manual"
                ? "Posição informada manualmente"
                : referencia.desatualizada
                  ? "Última posição recebida do aparelho a bordo"
                  : "Posição do aparelho declarado a bordo"}
            </p>
            <p>
              Referência de{" "}
              {new Date(referencia.instante).toLocaleString("pt-BR")} ·{" "}
              {referencia.coordenadas[0].toFixed(6)},{" "}
              {referencia.coordenadas[1].toFixed(6)}
            </p>
            {referencia.precisao !== undefined && (
              <p>
                Margem aproximada do GPS:{" "}
                {distanciaFormatada(referencia.precisao)}. As distâncias também
                são afetadas por essa precisão.
              </p>
            )}
            {referencia.desatualizada && (
              <p className="text-amber-200">
                Sem leitura recente. As proximidades abaixo usam a última
                posição recebida.
              </p>
            )}
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="min-w-0 rounded-xl border border-white/10 p-3">
              <h4 className="text-sm font-semibold">
                Sedes municipais mais próximas
              </h4>
              <p className="mt-1 text-[11px] leading-5 text-[#EDEDE3]/65">
                Entre as cinco referências municipais do mapa.
              </p>
              <ul className="mt-2 divide-y divide-white/10">
                {localidades.map((local) => (
                  <li key={local.id}>
                    <button
                      type="button"
                      onClick={() => props.aoSelecionarLocalidade(local.id)}
                      className="flex min-h-12 w-full items-center justify-between gap-3 py-2 text-left text-xs focus-visible:outline-2 focus-visible:outline-[#E3A144]"
                    >
                      <span>{local.nome}</span>
                      <strong className="shrink-0 text-[#F4C77E]">
                        ≈ {distanciaFormatada(local.distancia)}
                      </strong>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="min-w-0 rounded-xl border border-white/10 p-3">
              <h4 className="text-sm font-semibold">
                Atrativos com posição conhecida
              </h4>
              <p className="mt-1 text-[11px] leading-5 text-[#EDEDE3]/65">
                Somente referências com coordenadas no catálogo inicial. A lista
                não cobre todos os atrativos da região.
              </p>
              <ul className="mt-2 divide-y divide-white/10">
                {atrativos.map((atrativo) => (
                  <li key={atrativo.id}>
                    <button
                      type="button"
                      onClick={() => props.aoSelecionarAtrativo(atrativo.id)}
                      className="flex min-h-12 w-full items-center justify-between gap-3 py-2 text-left text-xs focus-visible:outline-2 focus-visible:outline-[#E3A144]"
                    >
                      <span>{atrativo.nome}</span>
                      <strong className="shrink-0 text-[#F4C77E]">
                        ≈ {distanciaFormatada(atrativo.distancia)}
                      </strong>
                    </button>
                    {atrativo.observacao && (
                      <p className="pb-2 text-[10px] leading-5 text-[#EDEDE3]/65">
                        {atrativo.observacao}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-sm font-semibold">
              Consultar serviços no entorno
            </h4>
            <p className="mt-1 text-[11px] leading-5 text-[#EDEDE3]/70">
              A consulta usa uma cópia desta posição e abre o painel de imagens
              abaixo. Os resultados são do Google, sem vínculo automático com a
              ERN e sem confirmação de disponibilidade.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Hospedagens", "Restaurantes", "Mercados", "Combustível"].map(
                (termo) => (
                  <button
                    key={termo}
                    type="button"
                    onClick={() => props.aoConsultarEntorno(termo)}
                    className={`${BOTAO} border-[#E3A144]/40 text-[#F4C77E]`}
                  >
                    {termo}
                  </button>
                ),
              )}
            </div>
          </div>
          <p className="mt-4 text-[11px] leading-5 text-[#EDEDE3]/65">
            Todas as distâncias são em linha reta entre referências. Não indicam
            canais navegáveis, tempo de viagem ou ponto de desembarque.
          </p>
        </>
      )}
      <p className="mt-3 text-[11px] leading-5 text-[#EDEDE3]/60">
        A referência é apagada ao recarregar esta página. Ela não representa
        rastreamento independente da embarcação.
      </p>
    </section>
  );
}

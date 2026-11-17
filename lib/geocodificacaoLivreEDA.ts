// EDA_LOCAL_LIVRE_V1: busca de endereço gratuita (OpenStreetMap/Photon), sem chave.
// Usada enquanto o Google Places não está liberado e como reserva depois.
// - Só o texto digitado é enviado (nada do cadastro do cliente).
// - Debounce e cache ficam no componente; aqui só a consulta e o formato.

export type OrigemLocal = 'amazonas' | 'estado' | 'pais';

export type ResultadoLivre = {
  id: string;
  principal: string;
  secundario: string;
  coords: [number, number];
  tipo: string; // house | street | city | district | state | country | ...
  cidade: string | null;
  uf: string | null;
  pais: string | null;
  codigoPais: string | null;
  limites?: [[number, number], [number, number]];
};

// Caixas [oeste, sul, leste, norte]
export const CAIXA_AMAZONAS: [number, number, number, number] = [-73.8, -9.82, -56.1, 2.25];
export const CAIXA_BRASIL: [number, number, number, number] = [-74.0, -33.8, -34.7, 5.3];

export const UF_POR_ESTADO: Record<string, string> = {
  acre: 'AC', alagoas: 'AL', amapa: 'AP', amazonas: 'AM', bahia: 'BA', ceara: 'CE',
  'distrito federal': 'DF', 'espirito santo': 'ES', goias: 'GO', maranhao: 'MA',
  'mato grosso': 'MT', 'mato grosso do sul': 'MS', 'minas gerais': 'MG', para: 'PA',
  paraiba: 'PB', parana: 'PR', pernambuco: 'PE', piaui: 'PI', 'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN', 'rio grande do sul': 'RS', rondonia: 'RO', roraima: 'RR',
  'santa catarina': 'SC', 'sao paulo': 'SP', sergipe: 'SE', tocantins: 'TO',
};

export function semAcento(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function siglaUF(estado?: string | null): string | null {
  if (!estado) return null;
  const n = semAcento(estado).replace(/^estado d[eo] /, '');
  return UF_POR_ESTADO[n] ?? null;
}

/** Zoom adequado para cada tipo de lugar. */
export function zoomDoTipo(tipo: string): number {
  if (tipo === 'house') return 18;
  if (tipo === 'street') return 16;
  if (tipo === 'district' || tipo === 'locality' || tipo === 'other') return 14;
  if (tipo === 'city' || tipo === 'municipio') return 12;
  if (tipo === 'county') return 9;
  if (tipo === 'state') return 6;
  if (tipo === 'country') return 4;
  return 13;
}

type FeaturePhoton = {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, unknown>;
};

const txt = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

export async function buscarLivre(
  termo: string,
  opcoes: { origem: OrigemLocal; modo: 'endereco' | 'cidade'; sinal?: AbortSignal; limite?: number },
): Promise<ResultadoLivre[]> {
  const q = termo.trim().slice(0, 120);
  if (q.length < 3) return [];
  const p = new URLSearchParams({ q, limit: String(opcoes.limite ?? 7) });
  if (opcoes.origem === 'amazonas') {
    p.set('bbox', CAIXA_AMAZONAS.join(','));
    p.set('lat', '-3.1'); p.set('lon', '-60.0');
  } else if (opcoes.origem === 'estado') {
    p.set('bbox', CAIXA_BRASIL.join(','));
  }
  // Em modo cidade pedimos mais e filtramos o tipo aqui (sem depender de
  // parâmetros opcionais do servidor).
  if (opcoes.modo === 'cidade') p.set('limit', '15');
  const tiposCidade = opcoes.origem === 'pais'
    ? new Set(['city', 'county', 'state', 'country'])
    : new Set(['city', 'county', 'district', 'locality']);
  const r = await fetch(`https://photon.komoot.io/api/?${p.toString()}`, { signal: opcoes.sinal });
  if (!r.ok) return [];
  const dados = (await r.json()) as { features?: FeaturePhoton[] };
  const vistos = new Set<string>();
  const saida: ResultadoLivre[] = [];
  for (const f of dados.features ?? []) {
    const c = f.geometry?.coordinates;
    const pr = f.properties ?? {};
    if (!Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
    const codigoPais = txt(pr.countrycode)?.toUpperCase() ?? null;
    // "Outro estado" = Brasil fora do Amazonas; "Amazonas" = só AM.
    const estado = txt(pr.state);
    const uf = codigoPais === 'BR' ? siglaUF(estado) : null;
    if (opcoes.origem === 'amazonas' && uf && uf !== 'AM') continue;
    if (opcoes.origem === 'estado' && (codigoPais !== 'BR' || uf === 'AM')) continue;
    const tipo = txt(pr.type) ?? 'other';
    if (opcoes.modo === 'cidade' && !tiposCidade.has(tipo)) continue;
    const nome = txt(pr.name);
    const rua = txt(pr.street);
    const numero = txt(pr.housenumber);
    const cidade = txt(pr.city) ?? (tipo === 'city' ? nome : null) ?? txt(pr.county);
    const pais = txt(pr.country);
    const principal = tipo === 'house'
      ? [nome && nome !== rua ? nome : null, [rua, numero].filter(Boolean).join(', ')].filter(Boolean).join(' · ')
      : (nome ?? rua ?? cidade ?? '');
    if (!principal) continue;
    const local = codigoPais === 'BR' ? [uf ?? estado] : [estado, pais];
    const secundario = [
      tipo !== 'city' && cidade !== principal ? cidade : null,
      txt(pr.district) && tipo !== 'district' ? txt(pr.district) : null,
      ...local,
    ].filter((x, i, a) => x && a.indexOf(x) === i).join(' · ');
    const chave = `${semAcento(principal)}|${semAcento(secundario)}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    const ext = Array.isArray(pr.extent) && pr.extent.length === 4 ? (pr.extent as number[]) : null;
    if (saida.length >= (opcoes.limite ?? 7)) break;
    saida.push({
      id: `${txt(pr.osm_type) ?? 'x'}${String(pr.osm_id ?? saida.length)}`,
      principal, secundario,
      coords: [c[1], c[0]],
      tipo,
      cidade: tipo === 'city' ? (nome ?? cidade) : cidade,
      uf, pais, codigoPais,
      limites: ext && ext.every(Number.isFinite) ? [[ext[3], ext[0]], [ext[1], ext[2]]] : undefined,
    });
  }
  return saida;
}

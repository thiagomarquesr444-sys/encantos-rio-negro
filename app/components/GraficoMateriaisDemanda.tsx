'use client';

import {
  CATEGORIAS_ITEM,
  type CategoriaItem,
  type ItemDemanda,
} from '@/lib/itensDemanda';
import { subtotal, moeda } from '@/lib/calculosMateriaisDemanda';

type Props = {
  itens: ItemDemanda[];
  previa: boolean;
};

const cores: Record<CategoriaItem, string> = {
  alimentacao: '#53C49B',
  bebidas: '#57BFE8',
  limpeza: '#B39AF4',
  combustivel: '#F1B44C',
  equipamentos: '#ED8E83',
  outros: '#9BB6A6',
};

export default function GraficoMateriaisDemanda({ itens, previa }: Props) {
  // EDA_GRAFICO_OUTROS_V1: itens em "Outros" aparecem pelo próprio nome.
  type Grupo = { chave: string; nome: string; cor: string; valor: bigint };
  const grupos = new Map<string, Grupo>();
  const coresOutros = ['#9BB6A6', '#E7C873', '#7FA8F0', '#E59AC8', '#8FD3C7', '#C9A27E', '#A7B4C2'];
  let indiceOutros = 0;

  let semEstimativa = 0;
  let total = BigInt(0);

  for (const item of itens) {
    const valor = subtotal(item);
    const categoria = item.categoria as CategoriaItem;

    if (valor === null || !(categoria in CATEGORIAS_ITEM)) {
      semEstimativa += 1;
      continue;
    }

    let chave: string = categoria;
    let nome: string = CATEGORIAS_ITEM[categoria];
    let cor = cores[categoria];

    if (categoria === 'outros') {
      const descricao = item.descricao.trim().replace(/\s+/g, ' ');
      if (descricao) {
        chave = `outros:${descricao.toLocaleLowerCase('pt-BR')}`;
        nome = descricao.charAt(0).toLocaleUpperCase('pt-BR') + descricao.slice(1).toLocaleLowerCase('pt-BR');
      }
    }

    let grupo = grupos.get(chave);
    if (!grupo) {
      if (categoria === 'outros') {
        cor = coresOutros[indiceOutros % coresOutros.length];
        indiceOutros += 1;
      }
      grupo = { chave, nome, cor, valor: BigInt(0) };
      grupos.set(chave, grupo);
    }

    grupo.valor += valor;
    total += valor;
  }

  const positivos = [...grupos.values()]
    .filter((grupo) => grupo.valor > BigInt(0))
    .sort((a, b) => a.valor === b.valor ? 0 : a.valor > b.valor ? -1 : 1);

  let acumulado = 0;

  const fatias = positivos.map((grupo, indice) => {
    const inicio = acumulado;
    const percentual = Number(
      grupo.valor * BigInt(1000000) / total,
    ) / 10000;

    acumulado = indice === positivos.length - 1
      ? 100
      : acumulado + percentual;

    return `${grupo.cor} ${inicio}% ${acumulado}%`;
  });

  const maior = positivos[0];
  const percentualMaior = maior
    ? Number(maior.valor * BigInt(1000) / total) / 10
    : 0;

  const atendidos = itens.filter((item) => item.situacao === 'atendido').length;

  return (
    <section
      aria-label="Análise do orçamento de materiais"
      className="mt-5 rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Composição do orçamento</h3>
        <span className="rounded-full border border-[var(--ern-borda)] px-2 py-1 text-[10px] text-[var(--ern-secundario)]">
          {previa ? 'Prévia · alterações não salvas' : 'Lista salva'}
        </span>
      </div>

      {total > BigInt(0) ? (
        <div className="mt-5 grid items-center gap-5 sm:grid-cols-[180px_minmax(0,1fr)]">
          <div
            role="img"
            aria-label="Distribuição dos custos estimados por categoria. Valores detalhados na legenda."
            className="relative mx-auto h-40 w-40 shrink-0 rounded-full sm:h-44 sm:w-44"
            style={{ background: `conic-gradient(${fatias.join(',')})` }}
          >
            <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-[var(--ern-painel)] text-center">
              <span className="text-2xl font-semibold">{positivos.length}</span>
              <span className="mt-1 text-[10px] text-[var(--ern-secundario)]">
                grupos com custo
              </span>
            </div>
          </div>

          <ul className="min-w-0 space-y-3">
            {positivos.map((grupo) => {
              const percentual = Number(
                grupo.valor * BigInt(1000) / total,
              ) / 10;

              return (
                <li key={grupo.chave} className="flex items-start justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: grupo.cor }}
                    />
                    <span>{grupo.nome}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <strong className="block font-semibold">{moeda(grupo.valor)}</strong>
                    <span className="text-[var(--ern-secundario)]">
                      {percentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-[var(--ern-secundario)]">
          O gráfico aparecerá quando houver materiais com quantidade válida
          e preço maior que zero.
        </p>
      )}

      <div className="mt-5 rounded-xl border border-[var(--ern-destaque)] bg-[var(--ern-suave)] p-3">
        <p className="text-xs font-semibold text-[var(--ern-destaque)]">Leitura da operação</p>
        <p className="mt-2 text-xs leading-6 text-[var(--ern-secundario)]">
          A lista contém {itens.length} item(ns), com {atendidos} atendido(s).
          {maior && (
            <>
              {' '}Entre os custos informados, {maior.nome.toLocaleLowerCase('pt-BR')}
              {' '}representa a maior parcela: {moeda(maior.valor)}
              {' '}({percentualMaior.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%).
            </>
          )}
          {semEstimativa > 0 && (
            <>
              {' '}{semEstimativa} item(ns) não possuem estimativa válida;
              o orçamento e o gráfico são parciais.
            </>
          )}
          {' '}Os valores representam estimativas de materiais,
          sem indicar pagamento ou lançamento no Financeiro.
        </p>
      </div>
    </section>
  );
}
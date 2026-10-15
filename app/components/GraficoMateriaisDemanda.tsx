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
  const grupos = Object.entries(CATEGORIAS_ITEM).map(([chave, nome]) => ({
    chave: chave as CategoriaItem,
    nome,
    valor: BigInt(0),
  }));

  let semEstimativa = 0;
  let total = BigInt(0);

  for (const item of itens) {
    const valor = subtotal(item);
    const grupo = grupos.find((atual) => atual.chave === item.categoria);

    if (valor === null || !grupo) {
      semEstimativa += 1;
      continue;
    }

    grupo.valor += valor;
    total += valor;
  }

  const positivos = grupos
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

    return `${cores[grupo.chave]} ${inicio}% ${acumulado}%`;
  });

  const maior = positivos[0];
  const percentualMaior = maior
    ? Number(maior.valor * BigInt(1000) / total) / 10
    : 0;

  const atendidos = itens.filter((item) => item.situacao === 'atendido').length;

  return (
    <section
      aria-label="Análise do orçamento de materiais"
      className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Composição do orçamento</h3>
        <span className="rounded-full border border-white/15 px-2 py-1 text-[10px] text-[#B4C8BB]">
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
            <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-[#0A1713] text-center">
              <span className="text-2xl font-semibold">{positivos.length}</span>
              <span className="mt-1 text-[10px] text-[#B4C8BB]">
                categorias com custo
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
                      style={{ backgroundColor: cores[grupo.chave] }}
                    />
                    <span>{grupo.nome}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <strong className="block font-semibold">{moeda(grupo.valor)}</strong>
                    <span className="text-[#B4C8BB]">
                      {percentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-[#B4C8BB]">
          O gráfico aparecerá quando houver materiais com quantidade válida
          e preço maior que zero.
        </p>
      )}

      <div className="mt-5 rounded-xl border border-[#E3A144]/20 bg-[#E3A144]/5 p-3">
        <p className="text-xs font-semibold text-[#F4C77E]">Leitura da operação</p>
        <p className="mt-2 text-xs leading-6 text-[#EDEDE3]/80">
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
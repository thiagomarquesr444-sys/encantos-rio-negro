'use client';

import { useId, useMemo } from 'react';

type Item = {
  categoria?: string | null;
};

const cores = [
  '#34D399',
  '#E3A144',
  '#38BDF8',
  '#FB7185',
  '#A78BFA',
  '#2DD4BF',
];

export default function GraficoPasseios({
  passeios,
}: {
  passeios: Item[];
}) {
  const tituloId = useId();

  const grupos = useMemo(() => {
    const mapa = new Map<string, number>();

    for (const passeio of passeios) {
      const nome = passeio.categoria?.trim() || 'Sem categoria';
      mapa.set(nome, (mapa.get(nome) ?? 0) + 1);
    }

    const ordenados = [...mapa.entries()].sort(
      (a, b) =>
        b[1] - a[1] ||
        a[0].localeCompare(b[0], 'pt-BR'),
    );

    const principais = ordenados.slice(0, 5).map(
      ([nome, quantidade]) => ({
        chave: `categoria:${nome}`,
        nome,
        quantidade,
      }),
    );

    if (ordenados.length > 5) {
      principais.push({
        chave: 'agrupamento:demais',
        nome: 'Demais categorias',
        quantidade: ordenados
          .slice(5)
          .reduce((soma, grupo) => soma + grupo[1], 0),
      });
    }

    let acumulado = 0;

    return principais.map((grupo, indice) => {
      const inicio = acumulado;
      acumulado += (grupo.quantidade / passeios.length) * 100;

      return {
        ...grupo,
        cor: cores[indice % cores.length],
        inicio,
        fim: acumulado,
      };
    });
  }, [passeios]);

  const fundo = grupos.length
    ? `conic-gradient(${grupos
        .map(
          (grupo) =>
            `${grupo.cor} ${grupo.inicio}% ${grupo.fim}%`,
        )
        .join(', ')})`
    : 'var(--ern-borda)';

  return (
    <section
      aria-labelledby={tituloId}
      className="mb-6 min-w-0 rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-4 text-[var(--ern-texto)] sm:p-6"
    >
      <div className="grid min-w-0 gap-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
        <div
          aria-hidden="true"
          className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-full md:h-48 md:w-48"
          style={{ background: fundo }}
        >
          <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-[var(--ern-painel)] md:h-32 md:w-32">
            <strong className="text-3xl">
              {passeios.length}
            </strong>
            <span className="text-xs text-[var(--ern-secundario)]">
              passeios
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-[var(--ern-destaque)]">
            Composição do catálogo
          </p>

          <h2
            id={tituloId}
            className="mt-2 text-2xl"
            style={{
              fontFamily: 'var(--font-fraunces), serif',
            }}
          >
            Experiências por categoria
          </h2>

          <p className="mt-2 text-sm leading-6 text-[var(--ern-secundario)]">
            {passeios.length} passeio(s) neste recorte. A busca e o
            filtro de categoria da listagem controlam este gráfico.
            Não representa vendas ou receita.
          </p>

          {grupos.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--ern-secundario)]">
              Nenhum passeio corresponde aos filtros.
            </p>
          ) : (
            <ul className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
              {grupos.map((grupo) => (
                <li
                  key={grupo.chave}
                  className="flex min-w-0 items-start gap-2 text-sm"
                >
                  <span
                    aria-hidden="true"
                    className="mt-1 h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: grupo.cor }}
                  />

                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    {grupo.nome}

                    <span className="mt-1 block text-xs text-[var(--ern-secundario)]">
                      {grupo.quantidade} passeio(s) ·{' '}
                      {(
                        (grupo.quantidade / passeios.length) *
                        100
                      ).toLocaleString('pt-BR', {
                        maximumFractionDigits: 1,
                      })}
                      %
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
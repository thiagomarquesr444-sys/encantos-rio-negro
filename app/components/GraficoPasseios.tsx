'use client';

import { useMemo } from 'react';

type Item = { categoria?: string | null };

const cores = [
  '#34D399',
  '#E3A144',
  '#38BDF8',
  '#FB7185',
  '#A78BFA',
  '#2DD4BF',
];

export default function GraficoPasseios({ passeios }: { passeios: Item[] }) {
  const grupos = useMemo(() => {
    const mapa = new Map<string, number>();

    for (const passeio of passeios) {
      const nome = passeio.categoria?.trim() || 'Sem categoria';
      mapa.set(nome, (mapa.get(nome) ?? 0) + 1);
    }

    const ordenados = [...mapa.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'),
    );

    const principais = ordenados.slice(0, 5);

    if (ordenados.length > 5) {
      principais.push([
        'Demais categorias',
        ordenados.slice(5).reduce((soma, grupo) => soma + grupo[1], 0),
      ]);
    }

    let acumulado = 0;

    return principais.map(([nome, quantidade], indice) => {
      const inicio = acumulado;
      acumulado += (quantidade / passeios.length) * 100;

      return {
        nome,
        quantidade,
        cor: cores[indice],
        inicio,
        fim: acumulado,
      };
    });
  }, [passeios]);

  const fundo = grupos.length
    ? `conic-gradient(${grupos.map(
        (grupo) => `${grupo.cor} ${grupo.inicio}% ${grupo.fim}%`,
      ).join(', ')})`
    : '#20352D';

  return (
    <section
      aria-labelledby="grafico-catalogo"
      className="mb-6 rounded-2xl border border-white/10 bg-[#0A1713] p-4 md:p-6"
    >
      <div className="grid min-w-0 gap-5 md:grid-cols-[220px_1fr] md:items-center">
        <div
          aria-hidden="true"
          className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-full md:h-48 md:w-48"
          style={{ background: fundo }}
        >
          <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-[#0A1713] md:h-32 md:w-32">
            <strong className="text-3xl">{passeios.length}</strong>
            <span className="text-xs text-[#EDEDE3]/70">passeios</span>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-[#E3A144]">
            Composição do catálogo
          </p>
          <h2
            id="grafico-catalogo"
            className="mt-2 text-2xl"
            style={{ fontFamily: 'var(--font-fraunces), serif' }}
          >
            Experiências por categoria
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#EDEDE3]/70">
            Quantidade de passeios no catálogo. A busca e o filtro de categoria
            da listagem controlam este gráfico. Não representa vendas ou receita.
          </p>

          {grupos.length === 0 ? (
            <p className="mt-4 text-sm text-[#EDEDE3]/70">
              Nenhum passeio corresponde aos filtros.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {grupos.map((grupo) => (
                <li key={grupo.nome} className="flex items-start gap-2 text-sm">
                  <span
                    aria-hidden="true"
                    className="mt-1 h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: grupo.cor }}
                  />
                  <span className="min-w-0 break-words">
                    {grupo.nome}
                    <span className="block text-xs text-[#EDEDE3]/70">
                      {grupo.quantidade} passeio(s) ·{' '}
                      {((grupo.quantidade / passeios.length) * 100).toLocaleString(
                        'pt-BR',
                        { maximumFractionDigits: 1 },
                      )}%
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
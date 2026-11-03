'use client';

import { useId, useMemo } from 'react';
import { BarrasHorizontaisEDA, CartaoGraficoEDA } from '@/app/components/GraficosEDA';

// ERN_GRAFICOS_EDA_V1: passeios por categoria no conjunto premium.

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

  return (
    <div aria-labelledby={tituloId}>
      <CartaoGraficoEDA etiqueta="Catálogo" titulo="Passeios por categoria" sub={`${passeios.length} ${passeios.length === 1 ? 'passeio cadastrado' : 'passeios cadastrados'}`}>
        <span id={tituloId} className="eda-pg-sr">Passeios por categoria</span>
        {grupos.length === 0 ? (
          <p className="eda-pg-texto-mut">Nenhum passeio cadastrado ainda.</p>
        ) : (
          <BarrasHorizontaisEDA
            linhas={grupos.map((g) => ({ rotulo: g.nome.length > 18 ? `${g.nome.slice(0, 17)}…` : g.nome, valores: [g.quantidade] }))}
            series={[{ nome: 'Passeios', c: 's1' }]}
            formatar={(v) => v.toLocaleString('pt-BR')}
            rotulo="Passeios por categoria"
            largRotulo={130}
          />
        )}
      </CartaoGraficoEDA>
    </div>
  );
}

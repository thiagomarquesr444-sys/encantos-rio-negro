'use client';

import { useId, useMemo, useState } from 'react';
import { BarrasHorizontaisEDA, CartaoGraficoEDA, RoscaEDA, TabelaNumerosEDA, type TomGraficoEDA } from '@/app/components/GraficosEDA';

// ERN_GRAFICOS_EDA_V1: painel das reservas no conjunto premium.

type ReservaAnalise = {
  pacote: string;
  dataOriginal?: string;
  valor: number;
  status: string;
};

type GrupoPasseio = {
  chave: string;
  nome: string;
  centavos: number;
};

const moeda = (valor: number) =>
  valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const percentual = (quantidade: number, total: number) =>
  (total ? (quantidade / total) * 100 : 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

function dataValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;

  const data = new Date(`${valor}T12:00:00Z`);

  return (
    Number.isFinite(data.getTime()) &&
    data.toISOString().slice(0, 10) === valor
  );
}

function mesValido(valor: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(valor);
}

export default function GraficosReservas({
  reservas,
  carregando,
}: {
  reservas: ReservaAnalise[];
  carregando: boolean;
}) {
  const tituloId = useId();
  const mesId = useId();
  const [mes, setMes] = useState('');

  const filtroValido = !mes || mesValido(mes);

  const analise = useMemo(() => {
    let semData = 0;

    const selecionadas = reservas.filter((reserva) => {
      const data = (reserva.dataOriginal ?? '').split('T')[0];
      const valida = dataValida(data);

      if (!valida) semData += 1;
      if (!filtroValido) return false;

      return !mes || (valida && data.slice(0, 7) === mes);
    });

    const status = [
      { nome: 'Confirmada', tom: 'ok' as TomGraficoEDA },
      { nome: 'Pendente', tom: 'at' as TomGraficoEDA },
      { nome: 'Cancelada', tom: 'er' as TomGraficoEDA },
      { nome: 'Concluída', tom: 'info' as TomGraficoEDA },
      { nome: 'Não compareceu', tom: 'nt' as TomGraficoEDA },
    ].map((item) => ({
      ...item,
      quantidade: selecionadas.filter(
        (reserva) => reserva.status === item.nome
      ).length,
    }));

    const conhecidos = status.reduce(
      (total, item) => total + item.quantidade,
      0
    );

    const desconhecidos = selecionadas.length - conhecidos;
    const porPasseio = new Map<string, number>();

    let valorInvalido = 0;
    let totalCentavos = 0;
    let somaExcedida = false;

    for (const reserva of selecionadas) {
      if (reserva.status !== 'Confirmada') continue;

      const centavos = Math.round(reserva.valor * 100);

      if (!Number.isSafeInteger(centavos) || centavos < 0) {
        valorInvalido += 1;
        continue;
      }

      const nome = reserva.pacote.trim() || 'Passeio não informado';
      const novoTotal = totalCentavos + centavos;
      const novoTotalPasseio = (porPasseio.get(nome) ?? 0) + centavos;

      if (
        !Number.isSafeInteger(novoTotal) ||
        !Number.isSafeInteger(novoTotalPasseio)
      ) {
        somaExcedida = true;
        continue;
      }

      totalCentavos = novoTotal;
      porPasseio.set(nome, novoTotalPasseio);
    }

    const ordenados = [...porPasseio.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR')
    );

    const passeios: GrupoPasseio[] = ordenados
      .slice(0, 5)
      .map(([nome, centavos]) => ({
        chave: `passeio:${nome}`,
        nome,
        centavos,
      }));

    if (ordenados.length > 5) {
      passeios.push({
        chave: 'grupo:demais',
        nome: 'Demais passeios',
        centavos: ordenados
          .slice(5)
          .reduce((total, item) => total + item[1], 0),
      });
    }

    return {
      total: selecionadas.length,
      status,
      desconhecidos,
      passeios,
      totalCentavos,
      semData,
      valorInvalido,
      somaExcedida,
    };
  }, [reservas, mes, filtroValido]);

  const valorConfirmado = analise.somaExcedida
    ? 'indisponível'
    : moeda(analise.totalCentavos / 100);

  const curto = (centavos: number) => {
    const reais = centavos / 100;
    return reais >= 1000
      ? `R$ ${(reais / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
      : moeda(reais);
  };

  const itensRosca = [
    ...analise.status.map((item) => ({ nome: item.nome === 'Não compareceu' ? 'Não compareceu' : `${item.nome}s`, valor: item.quantidade, tom: item.tom })),
    ...(analise.desconhecidos > 0 ? [{ nome: 'Sem status', valor: analise.desconhecidos, tom: 'nt' as TomGraficoEDA }] : []),
  ].filter((item) => item.valor > 0 || ['Confirmadas', 'Pendentes', 'Canceladas'].includes(item.nome));

  return (
    <section aria-labelledby={tituloId} aria-busy={carregando} style={{ display: 'grid', gap: 16, minWidth: 0 }}>
      <CartaoGraficoEDA
        etiqueta="Inteligência operacional"
        titulo="Panorama das reservas"
        sub="Pela data do passeio e pelo status atual. O mês abaixo vale só para estes gráficos."
        acoes={
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 8 }}>
            <label className="eda-pg-campo" htmlFor={mesId} style={{ minWidth: 180 }}>
              <span id={tituloId}>Mês do passeio</span>
              <input id={mesId} type="month" value={mes} aria-invalid={!filtroValido} onChange={(event) => setMes(event.target.value)} />
            </label>
            <button type="button" onClick={() => setMes('')} className="eda-pg-bt">Todos os meses</button>
          </div>
        }
      >
        <p className="eda-pg-texto-mut">
          {mes && filtroValido ? `Mês selecionado: ${mes.slice(5, 7)}/${mes.slice(0, 4)}` : 'Período: todos os meses dos registros carregados.'}
        </p>
      </CartaoGraficoEDA>

      {!filtroValido ? (
        <p role="alert" className="eda-pg-aviso eda-pg-aviso-at">Selecione um mês válido ou use Todos os meses.</p>
      ) : carregando ? (
        <p role="status" className="eda-pg-estado">Carregando análise das reservas…</p>
      ) : (
        <>
          <div className="eda-g-grade-cartoes">
            <CartaoGraficoEDA etiqueta="Situação" titulo="Reservas por situação" sub={`${analise.total} ${analise.total === 1 ? 'reserva' : 'reservas'} no período`}>
              {analise.total === 0 ? (
                <p className="eda-pg-texto-mut">Nenhuma reserva no período selecionado.</p>
              ) : (
                <RoscaEDA itens={itensRosca} centro={String(analise.total)} sub={analise.total === 1 ? 'reserva' : 'reservas'} rotulo="Reservas por situação" />
              )}
            </CartaoGraficoEDA>

            <CartaoGraficoEDA etiqueta="Vendas" titulo="Valor confirmado por passeio" sub="Cinco maiores valores comerciais; não representa recebimentos.">
              {analise.somaExcedida ? (
                <p role="alert" className="eda-pg-aviso eda-pg-aviso-at" style={{ margin: 0 }}>A soma ultrapassa o limite de precisão deste painel. Os valores não serão exibidos para evitar totais incorretos.</p>
              ) : analise.passeios.length === 0 ? (
                <p className="eda-pg-texto-mut">
                  {analise.status[0].quantidade === 0 ? 'Nenhuma reserva confirmada no período.' : 'Não há valores válidos para compor este gráfico.'}
                </p>
              ) : (
                <>
                  <BarrasHorizontaisEDA
                    linhas={analise.passeios.map((item) => ({ rotulo: item.nome.length > 20 ? `${item.nome.slice(0, 19)}…` : item.nome, valores: [item.centavos] }))}
                    series={[{ nome: 'Valor confirmado', c: 's1' }]}
                    formatar={curto}
                    rotulo="Valor confirmado por passeio"
                    largRotulo={140}
                  />
                  <TabelaNumerosEDA cabecalho={['Passeio', 'Valor confirmado']} linhas={analise.passeios.map((item) => [item.nome, moeda(item.centavos / 100)])} />
                </>
              )}
            </CartaoGraficoEDA>
          </div>

          <CartaoGraficoEDA etiqueta="Leitura" titulo="Resumo do período">
            <p className="eda-pg-texto-mut" style={{ color: 'var(--g-texto)' }}>
              {analise.total} reserva(s): {analise.status[0].quantidade} confirmada(s), {analise.status[1].quantidade} pendente(s) e {analise.status[2].quantidade} cancelada(s).
              {analise.desconhecidos > 0 ? ` Há também ${analise.desconhecidos} com status não reconhecido.` : ''}
              {' '}Valor comercial confirmado: <b>{valorConfirmado}</b>.
              {analise.status[1].quantidade > 0 ? ' As reservas pendentes precisam de definição operacional.' : ' Não há reservas pendentes neste recorte.'}
            </p>
            {analise.semData > 0 && <p className="eda-pg-aviso eda-pg-aviso-at">{analise.semData} reserva(s) sem data válida ficam fora dos recortes mensais.</p>}
            {analise.valorInvalido > 0 && <p className="eda-pg-aviso eda-pg-aviso-at">{analise.valorInvalido} valor(es) de reservas confirmadas foram excluídos da soma por serem inválidos.</p>}
          </CartaoGraficoEDA>
        </>
      )}
    </section>
  );
}

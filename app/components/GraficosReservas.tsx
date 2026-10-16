'use client';

import { useId, useMemo, useState } from 'react';

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

function Barra({
  quantidade,
  total,
  cor,
}: {
  quantidade: number;
  total: number;
  cor: string;
}) {
  const largura = total > 0
    ? Math.min(100, Math.max(0, (quantidade / total) * 100))
    : 0;

  return (
    <div
      aria-hidden="true"
      className="h-3 overflow-hidden rounded-full bg-white/10"
    >
      <div
        className={`h-full rounded-full transition-all ${cor}`}
        style={{ width: `${largura}%` }}
      />
    </div>
  );
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
      { nome: 'Confirmada', cor: 'bg-emerald-400' },
      { nome: 'Pendente', cor: 'bg-[#E3A144]' },
      { nome: 'Cancelada', cor: 'bg-rose-400' },
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

  const painel =
    'min-w-0 rounded-2xl border border-white/10 bg-[#0A1713] p-4 sm:p-5';

  const valorConfirmado = analise.somaExcedida
    ? 'indisponível'
    : moeda(analise.totalCentavos / 100);

  return (
    <section
      aria-labelledby={tituloId}
      aria-busy={carregando}
      className="mb-7 min-w-0 space-y-4"
    >
      <div className={painel}>
        <p className="text-xs uppercase tracking-widest text-[#E3A144]">
          Inteligência operacional
        </p>
        <h2
          id={tituloId}
          className="mt-2 text-2xl text-[#F0F0E8]"
          style={{ fontFamily: 'var(--font-fraunces), serif' }}
        >
          Panorama das reservas
        </h2>
        <p className="mt-3 text-sm leading-7 text-[#C5D4CA]">
          Análise pela data do passeio e pelo status atual da reserva.
          O período abaixo controla somente este painel e respeita o
          recorte do dashboard, quando presente.
        </p>

        <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 sm:w-60">
            <label
              htmlFor={mesId}
              className="mb-2 block text-sm text-[#C5D4CA]"
            >
              Mês do passeio
            </label>
            <input
              id={mesId}
              type="month"
              value={mes}
              aria-invalid={!filtroValido}
              onChange={(event) => setMes(event.target.value)}
              className="min-h-12 w-full min-w-0 max-w-full rounded-xl border border-white/15 bg-[#07110E] px-3 text-base text-[#EDEDE3] outline-none focus:border-[#E3A144] [color-scheme:dark] sm:text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => setMes('')}
            className="min-h-12 rounded-xl border border-white/15 px-4 text-sm text-[#EDEDE3] transition hover:bg-white/5"
          >
            Todos os meses
          </button>
        </div>

        <p className="mt-3 text-xs leading-6 text-[#B4C8BB]">
          {mes && filtroValido
            ? `Mês selecionado: ${mes.slice(5, 7)}/${mes.slice(0, 4)}`
            : 'Período: todos os meses dos registros carregados'}
        </p>
      </div>

      {!filtroValido ? (
        <p
          role="alert"
          className={`${painel} text-sm text-amber-200`}
        >
          Selecione um mês válido ou use Todos os meses.
        </p>
      ) : carregando ? (
        <p role="status" className={`${painel} text-sm text-[#C5D4CA]`}>
          Carregando análise das reservas…
        </p>
      ) : (
        <>
          {analise.total === 0 && (
            <p role="status" className={`${painel} text-sm text-[#C5D4CA]`}>
              Nenhuma reserva no período selecionado.
            </p>
          )}

          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <article className={painel}>
              <h3 className="text-lg font-semibold text-[#EDEDE3]">
                Distribuição por status
              </h3>

              <div className="mt-5 space-y-5">
                {analise.status.map((item) => (
                  <div key={item.nome} className="min-w-0">
                    <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm text-[#C5D4CA]">
                      <span>{item.nome}</span>
                      <span className="tabular-nums">
                        {item.quantidade} · {percentual(item.quantidade, analise.total)}%
                      </span>
                    </div>
                    <Barra
                      quantidade={item.quantidade}
                      total={analise.total}
                      cor={item.cor}
                    />
                  </div>
                ))}

                {analise.desconhecidos > 0 && (
                  <div>
                    <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm text-amber-200">
                      <span>Status não reconhecido</span>
                      <span className="tabular-nums">
                        {analise.desconhecidos} · {percentual(analise.desconhecidos, analise.total)}%
                      </span>
                    </div>
                    <Barra
                      quantidade={analise.desconhecidos}
                      total={analise.total}
                      cor="bg-slate-400"
                    />
                  </div>
                )}
              </div>
            </article>

            <article className={painel}>
              <h3 className="text-lg font-semibold text-[#EDEDE3]">
                Valor confirmado por passeio
              </h3>
              <p className="mt-2 text-xs leading-6 text-[#B4C8BB]">
                Cinco maiores valores comerciais e agrupamento dos demais.
                Não representa recebimentos.
              </p>

              {analise.somaExcedida ? (
                <p role="alert" className="mt-5 text-sm leading-7 text-amber-200">
                  A soma ultrapassa o limite de precisão deste painel.
                  Os valores não serão exibidos para evitar totais incorretos.
                </p>
              ) : analise.passeios.length === 0 ? (
                <p className="mt-5 text-sm leading-7 text-[#C5D4CA]">
                  {analise.status[0].quantidade === 0
                    ? 'Nenhuma reserva confirmada no período.'
                    : 'Não há valores válidos para compor este gráfico.'}
                </p>
              ) : (
                <div className="mt-5 space-y-5">
                  {analise.passeios.map((item) => (
                    <div key={item.chave} className="min-w-0">
                      <div className="mb-2 flex min-w-0 flex-col gap-1 text-sm sm:flex-row sm:justify-between sm:gap-3">
                        <span className="min-w-0 break-words text-[#C5D4CA]">
                          {item.nome}
                        </span>
                        <span className="break-words font-semibold tabular-nums text-[#F4C77E]">
                          {moeda(item.centavos / 100)}
                        </span>
                      </div>
                      <Barra
                        quantidade={item.centavos}
                        total={analise.totalCentavos}
                        cor="bg-[#E3A144]"
                      />
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>

          <article className={painel}>
            <h3 className="text-lg font-semibold text-[#EDEDE3]">
              Leitura operacional
            </h3>
            <p className="mt-3 break-words text-sm leading-7 text-[#C5D4CA]">
              No período selecionado, há {analise.total} reserva(s):
              {' '}{analise.status[0].quantidade} confirmada(s),
              {' '}{analise.status[1].quantidade} pendente(s) e
              {' '}{analise.status[2].quantidade} cancelada(s).
              {analise.desconhecidos > 0
                ? ` Há também ${analise.desconhecidos} com status não reconhecido.`
                : ''}
              {' '}Valor comercial confirmado: {valorConfirmado}.
              {analise.status[1].quantidade > 0
                ? ' As reservas pendentes precisam de definição operacional.'
                : ' Não há reservas pendentes neste recorte.'}
            </p>

            <p className="mt-3 text-xs leading-6 text-[#B4C8BB]">
              Este resumo descreve a situação atual. Os filtros da listagem
              abaixo são independentes do mês escolhido neste painel.
            </p>

            {analise.semData > 0 && (
              <p className="mt-3 text-sm leading-7 text-amber-200">
                Há {analise.semData} reserva(s) sem data válida entre os
                registros carregados. Elas ficam fora dos recortes mensais.
              </p>
            )}

            {analise.valorInvalido > 0 && (
              <p className="mt-3 text-sm leading-7 text-amber-200">
                {analise.valorInvalido} valor(es) de reservas confirmadas
                foram excluídos da soma por serem inválidos.
                O total exibido considera apenas os valores válidos.
              </p>
            )}
          </article>
        </>
      )}
    </section>
  );
}
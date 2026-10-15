'use client';

import { useMemo, useState } from 'react';

type ReservaAnalise = {
  pacote: string;
  dataOriginal?: string;
  valor: number;
  status: string;
};

const moeda = (valor: number) =>
  valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

function dataValida(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T12:00:00Z`);
  return Number.isFinite(data.getTime()) &&
    data.toISOString().slice(0, 10) === valor;
}

export default function GraficosReservas({
  reservas,
  carregando,
}: {
  reservas: ReservaAnalise[];
  carregando: boolean;
}) {
  const [mes, setMes] = useState('');

  const analise = useMemo(() => {
    let semData = 0;
    const selecionadas = reservas.filter((reserva) => {
      const data = (reserva.dataOriginal ?? '').split('T')[0];
      if (!dataValida(data)) semData += 1;
      return !mes || (dataValida(data) && data.slice(0, 7) === mes);
    });

    const status = [
      { nome: 'Confirmada', cor: 'bg-emerald-400' },
      { nome: 'Pendente', cor: 'bg-[#E3A144]' },
      { nome: 'Cancelada', cor: 'bg-rose-400' },
    ].map((item) => ({
      ...item,
      quantidade: selecionadas.filter((reserva) => reserva.status === item.nome).length,
    }));

    const porPasseio = new Map<string, number>();
    let valorInvalido = 0;
    let totalCentavos = 0;

    for (const reserva of selecionadas) {
      if (reserva.status !== 'Confirmada') continue;
      const centavos = Math.round(reserva.valor * 100);

      if (!Number.isSafeInteger(centavos) || centavos < 0) {
        valorInvalido += 1;
        continue;
      }

      totalCentavos += centavos;
      const nome = reserva.pacote.trim() || 'Passeio não informado';
      porPasseio.set(nome, (porPasseio.get(nome) ?? 0) + centavos);
    }

    const ordenados = [...porPasseio.entries()].sort((a, b) => b[1] - a[1]);
    const passeios = ordenados.slice(0, 5);

    if (ordenados.length > 5) {
      passeios.push([
        'Demais passeios',
        ordenados.slice(5).reduce((total, item) => total + item[1], 0),
      ]);
    }

    return {
      total: selecionadas.length,
      status,
      passeios,
      totalCentavos,
      semData,
      valorInvalido,
    };
  }, [reservas, mes]);

  const painel = 'min-w-0 rounded-2xl border border-white/10 bg-[#0A1713] p-5';

  return (
    <section aria-labelledby="analise-reservas" className="mb-7 space-y-4">
      <div className={painel}>
        <p className="text-xs uppercase tracking-widest text-[#E3A144]">
          Inteligência operacional
        </p>
        <h2
          id="analise-reservas"
          className="mt-2 text-2xl text-[#F0F0E8]"
          style={{ fontFamily: 'var(--font-fraunces), serif' }}
        >
          Panorama das reservas
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#EDEDE3]/70">
          Análise pela data do passeio e pelo status atual da reserva.
          O período abaixo controla somente este painel.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="min-w-0 space-y-2 text-sm">
            <span className="block">Mês do passeio</span>
            <input
              type="month"
              value={mes}
              onChange={(event) => setMes(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-white/15 bg-[#07110E] px-3 text-[#EDEDE3] [color-scheme:dark]"
            />
          </label>
          <button
            type="button"
            onClick={() => setMes('')}
            className="min-h-12 rounded-xl border border-white/15 px-4 text-sm"
          >
            Todo o histórico
          </button>
        </div>
        <p className="mt-3 text-xs text-[#EDEDE3]/65">
          {mes ? `Mês selecionado: ${mes.slice(5, 7)}/${mes.slice(0, 4)}` : 'Período: todo o histórico'}
        </p>
      </div>

      {carregando ? (
        <p role="status" className={painel}>Carregando análise das reservas…</p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <article className={painel}>
              <h3 className="text-lg font-semibold">Distribuição por status</h3>
              <div className="mt-5 space-y-5">
                {analise.status.map((item) => (
                  <div key={item.nome}>
                    <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
                      <span>{item.nome}</span>
                      <span>
                        {item.quantidade} · {analise.total
                          ? ((item.quantidade / analise.total) * 100).toFixed(1)
                          : '0,0'}%
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-white/5">
                      <div
                        className={`h-full rounded-full ${item.cor}`}
                        style={{
                          width: `${analise.total ? (item.quantidade / analise.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className={painel}>
              <h3 className="text-lg font-semibold">Valor confirmado por passeio</h3>
              <p className="mt-2 text-xs leading-5 text-[#EDEDE3]/65">
                Cinco maiores valores comerciais e agrupamento dos demais.
                Não representa recebimentos.
              </p>
              {analise.passeios.length === 0 ? (
                <p className="mt-5 text-sm text-[#EDEDE3]/70">
                  Nenhuma reserva confirmada no período.
                </p>
              ) : (
                <div className="mt-5 space-y-4">
                  {analise.passeios.map(([nome, valor]) => (
                    <div key={nome}>
                      <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
                        <span className="break-words">{nome}</span>
                        <span>{moeda(valor / 100)}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-[#E3A144]"
                          style={{
                            width: `${analise.totalCentavos ? (valor / analise.totalCentavos) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>

          <article className={painel}>
            <h3 className="text-lg font-semibold">Leitura operacional</h3>
            <p className="mt-3 text-sm leading-7 text-[#EDEDE3]/75">
              No período selecionado, há {analise.total} reserva(s):
              {' '}{analise.status[0].quantidade} confirmada(s),
              {' '}{analise.status[1].quantidade} pendente(s) e
              {' '}{analise.status[2].quantidade} cancelada(s).
              O valor comercial confirmado soma {moeda(analise.totalCentavos / 100)}.
              {analise.status[1].quantidade > 0
                ? ' As reservas pendentes precisam de definição operacional.'
                : ' Não há reservas pendentes neste recorte.'}
            </p>
            <p className="mt-3 text-xs leading-6 text-[#EDEDE3]/60">
              Este resumo descreve a situação atual, sem inferir recebimentos,
              lucro ou causas de cancelamento. Os filtros da listagem abaixo
              são independentes.
            </p>
            {analise.semData > 0 && (
              <p className="mt-3 text-sm text-amber-200">
                Há {analise.semData} reserva(s) sem data válida no histórico.
                Elas ficam fora dos recortes mensais.
              </p>
            )}
            {analise.valorInvalido > 0 && (
              <p className="mt-3 text-sm text-amber-200">
                {analise.valorInvalido} valor(es) inválido(s) foram excluídos da soma.
              </p>
            )}
          </article>
        </>
      )}
    </section>
  );
}
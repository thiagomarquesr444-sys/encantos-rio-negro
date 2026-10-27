'use client';

import { normalizarStatusReservaERN } from '@/lib/reservasStatusERN';

import { useMemo } from 'react';

import Link from 'next/link';
import type { PlanoAtual } from '@/lib/plano';
import PendenciasFinanceirasDashboard from '@/app/components/PendenciasFinanceirasDashboard';

type ReservaGrafico = {

  data_reserva: string;

  status: string | null;

};

type Props = {
  plano?: PlanoAtual | null;
  carregandoPlano?: boolean;

  reservas: ReservaGrafico[];

  inicio: string;

  carregando: boolean;

};

const SITUACOES = [

  { chave: 'confirmada', nome: 'Confirmadas', cor: '#34D399' },

  { chave: 'pendente', nome: 'Pendentes', cor: '#E3A144' },

  { chave: 'cancelada', nome: 'Canceladas', cor: '#FB7185' },

  { chave: 'concluida', nome: 'Concluídas', cor: '#38BDF8' },
  { chave: 'nao_compareceu', nome: 'Não compareceu', cor: '#FB923C' },
  { chave: 'outras', nome: 'Outras situações', cor: '#7DD3FC' },

] as const;

function statusNormalizado(status: string | null): string {

  return normalizarStatusReservaERN(status)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_');

}

function adicionarDias(inicio: string, quantidade: number): string {

  const data = new Date(`${inicio}T12:00:00Z`);

  data.setUTCDate(data.getUTCDate() + quantidade);

  return data.toISOString().slice(0, 10);

}

function dataCurta(data: string): string {

  return `${data.slice(8, 10)}/${data.slice(5, 7)}`;

}

export default function GraficosOperadora({

  plano = null,
  carregandoPlano = false,
  reservas,

  inicio,

  carregando,

}: Props) {

  const dados = useMemo(() => {

    if (!inicio) return null;

    const fimSemana = adicionarDias(inicio, 6);

    const fimMes = adicionarDias(inicio, 29);

    const dias = Array.from({ length: 7 }, (_, indice) => ({

      data: adicionarDias(inicio, indice),

      quantidade: 0,

    }));

    const porDia = new Map(dias.map((dia) => [dia.data, dia]));

    const contagem = {

      confirmada: 0,

      pendente: 0,

      cancelada: 0,

      concluida: 0,
      nao_compareceu: 0,
      outras: 0,

    };

    for (const reserva of reservas) {

      if (

        reserva.data_reserva < inicio ||

        reserva.data_reserva > fimMes

      ) {

        continue;

      }

      const status = statusNormalizado(reserva.status);

      if (

        status === 'confirmada' ||

        status === 'pendente' ||

        (status === 'cancelada' || status === 'concluida' || status === 'nao_compareceu')

      ) {

        contagem[status] += 1;

      } else {

        contagem.outras += 1;

      }

      const dia = porDia.get(reserva.data_reserva);

      if (dia && (status === 'pendente' || status === 'confirmada')) {

        dia.quantidade += 1;

      }

    }

    const totalSemana = dias.reduce(

      (total, dia) => total + dia.quantidade,

      0,

    );

    const totalMes = Object.values(contagem).reduce(

      (total, valor) => total + valor,

      0,

    );

    return {

      dias,

      contagem,

      totalSemana,

      totalMes,

      fimSemana,

      fimMes,

      escala: Math.max(1, ...dias.map((dia) => dia.quantidade)),

    };

  }, [inicio, reservas]);

  const aguardando = carregando || !dados;

  return (

    <section

      aria-labelledby="graficos-operadora-titulo"

      aria-busy={carregando}

      className="mt-6 min-w-0"

    >

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">

        <div>

          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">

            Inteligência operacional

          </p>

          <h2

            id="graficos-operadora-titulo"

            className="mt-2 text-2xl text-[#F0F0E8] sm:text-3xl"

            style={{ fontFamily: 'var(--font-fraunces), serif' }}

          >

            Sua operação em números

          </h2>

        </div>

        <Link

          href="/reservas"

          className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-[#F4C77E] focus-visible:outline-2 focus-visible:outline-offset-4"

        >

          Gerenciar reservas →

        </Link>

      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">

        <article className="min-w-0 rounded-2xl border border-white/10 bg-[#0A1713] p-4 sm:rounded-[26px] sm:p-6">

          <div className="flex flex-wrap items-start justify-between gap-3">

            <div>

              <h3 className="text-base font-semibold text-[#F0F0E8]">

                Operações por dia

              </h3>

              <p className="mt-1 text-xs leading-5 text-[#B4C8BB]">

                Hoje e os próximos seis dias · horário de Manaus

              </p>

              {dados && (

                <p className="mt-1 text-xs text-[#B4C8BB]">

                  {dataCurta(inicio)} a {dataCurta(dados.fimSemana)}

                </p>

              )}

            </div>

            <div className="text-right">

              <strong className="text-3xl tabular-nums text-[#F4C77E]">

                {aguardando ? '—' : dados.totalSemana}

              </strong>

              <p className="mt-1 text-xs text-[#B4C8BB]">

                reservas pendentes ou confirmadas

              </p>

            </div>

          </div>

          {aguardando ? (

            <p

              role="status"

              className="flex min-h-56 items-center justify-center text-sm text-[#B4C8BB]"

            >

              Carregando operações...

            </p>

          ) : (

            <>

              <p className="mt-5 text-xs text-[#B4C8BB]">

                Escala: 0 a {dados.escala} reservas por dia

              </p>

              <ol

                aria-label="Quantidade de operações em cada dia"

                className="mt-3 grid grid-cols-7 gap-1 sm:gap-3"

              >

                {dados.dias.map((dia, indice) => (

                  <li key={dia.data} className="min-w-0 text-center">

                    <div className="relative h-40 rounded-lg border-b border-white/15 bg-white/[0.025]">

                      <div

                        aria-hidden="true"

                        className="absolute inset-x-1 bottom-0 rounded-t-md bg-gradient-to-t from-emerald-700 to-emerald-300 sm:inset-x-2"

                        style={{

                          height: `${(dia.quantidade / dados.escala) * 100}%`,

                        }}

                      />

                      <span className="absolute inset-x-0 top-2 mx-auto w-fit rounded bg-[#07110E]/90 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-[#F0F0E8]">

                        {dia.quantidade}

                      </span>

                    </div>

                    <span className="mt-2 block text-[10px] tabular-nums text-[#EDEDE3] sm:text-xs">

                      {dataCurta(dia.data)}

                    </span>

                    <span className="mt-1 block text-[10px] text-[#B4C8BB]">

                      {indice === 0 ? 'Hoje' : `+${indice}d`}

                    </span>

                  </li>

                ))}

              </ol>

              <p className="mt-4 text-xs leading-5 text-[#B4C8BB]">

                {dados.totalSemana === 0

                  ? 'Nenhuma reserva pendente ou confirmada neste período.'

                  : 'Cada reserva representa uma operação. Canceladas ficam fora desta contagem.'}

              </p>

            </>

          )}

        </article>

        <article className="min-w-0 rounded-2xl border border-white/10 bg-[#0A1713] p-4 sm:rounded-[26px] sm:p-6">

          <div className="flex flex-wrap items-start justify-between gap-3">

            <div>

              <h3 className="text-base font-semibold text-[#F0F0E8]">

                Reservas por situação

              </h3>

              <p className="mt-1 text-xs leading-5 text-[#B4C8BB]">

                Hoje e os próximos 29 dias · inclui canceladas

              </p>

              {dados && (

                <p className="mt-1 text-xs text-[#B4C8BB]">

                  {dataCurta(inicio)} a {dataCurta(dados.fimMes)}

                </p>

              )}

            </div>

            <div className="text-right">

              <strong className="text-3xl tabular-nums text-[#F0F0E8]">

                {aguardando ? '—' : dados.totalMes}

              </strong>

              <p className="mt-1 text-xs text-[#B4C8BB]">

                reservas no período

              </p>

            </div>

          </div>

          {aguardando ? (

            <p

              role="status"

              className="flex min-h-56 items-center justify-center text-sm text-[#B4C8BB]"

            >

              Carregando situações...

            </p>

          ) : (

            <>

              <div

                aria-hidden="true"

                className="mt-6 flex h-5 overflow-hidden rounded-full bg-white/5"

              >

                {SITUACOES.map((situacao) => (

                  <div

                    key={situacao.chave}

                    style={{

                      backgroundColor: situacao.cor,

                      width:

                        dados.totalMes === 0

                          ? '0%'

                          : `${(dados.contagem[situacao.chave] / dados.totalMes) * 100}%`,

                    }}

                  />

                ))}

              </div>

              <ul

                aria-label="Distribuição das reservas por situação"

                className="mt-5 space-y-4"

              >

                {SITUACOES.map((situacao) => {

                  const quantidade = dados.contagem[situacao.chave];

                  const percentual =

                    dados.totalMes === 0

                      ? 0

                      : (quantidade / dados.totalMes) * 100;

                  return (

                    <li

                      key={situacao.chave}

                      className="flex items-center justify-between gap-3"

                    >

                      <span className="flex min-w-0 items-center gap-2 text-sm text-[#EDEDE3]">

                        <span

                          aria-hidden="true"

                          className="h-2.5 w-2.5 shrink-0 rounded-full"

                          style={{ backgroundColor: situacao.cor }}

                        />

                        {situacao.nome}

                      </span>

                      <span className="shrink-0 text-sm tabular-nums text-[#B4C8BB]">

                        <strong className="mr-2 text-[#F0F0E8]">

                          {quantidade}

                        </strong>

                        {percentual.toLocaleString('pt-BR', {

                          minimumFractionDigits: 1,

                          maximumFractionDigits: 1,

                        })}

                        %

                      </span>

                    </li>

                  );

                })}

              </ul>

              <p className="mt-5 text-xs leading-5 text-[#B4C8BB]">

                {dados.totalMes === 0

                  ? 'Nenhuma reserva cadastrada para este período.'

                  : 'Outras situações incluem status não reconhecidos ou não informados. Reservas encerradas permanecem nesta distribuição histórica.'}

              </p>

            </>

          )}

        </article>

      </div>

      <PendenciasFinanceirasDashboard plano={plano} carregandoPlano={carregandoPlano} />
    </section>

  );

}


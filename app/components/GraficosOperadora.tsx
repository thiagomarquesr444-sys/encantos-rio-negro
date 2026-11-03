'use client';

import { normalizarStatusReservaERN } from '@/lib/reservasStatusERN';

import { useMemo } from 'react';

import Link from 'next/link';
import type { PlanoAtual } from '@/lib/plano';
import PendenciasFinanceirasDashboard from '@/app/components/PendenciasFinanceirasDashboard';
import { BarrasAgrupadasEDA, BarrasHorizontaisEDA, CartaoGraficoEDA, RoscaEDA, type TomGraficoEDA } from '@/app/components/GraficosEDA';

// ERN_GRAFICOS_EDA_V1: inteligência operacional do painel no conjunto premium.

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

const SITUACOES: { chave: 'confirmada' | 'pendente' | 'cancelada' | 'concluida' | 'nao_compareceu' | 'outras'; nome: string; tom: TomGraficoEDA }[] = [
  { chave: 'confirmada', nome: 'Confirmadas', tom: 'ok' },
  { chave: 'pendente', nome: 'Pendentes', tom: 'at' },
  { chave: 'cancelada', nome: 'Canceladas', tom: 'er' },
  { chave: 'concluida', nome: 'Concluídas', tom: 'info' },
  { chave: 'nao_compareceu', nome: 'Não compareceu', tom: 'nt' },
  { chave: 'outras', nome: 'Outras situações', tom: 'nt' },
];

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

  // ERN_DASHBOARD_INSIGHTS_V444: janelas distintas, sem confundir reserva com receita.
  const leituraExecutiva = useMemo(() => {
    if (!inicio) return null;
    const dia7 = adicionarDias(inicio, 6);
    const dia8 = adicionarDias(inicio, 7);
    const dia14 = adicionarDias(inicio, 13);
    const dia30 = adicionarDias(inicio, 29);
    let semanaAtual = 0;
    let semanaSeguinte = 0;
    let pendentes30 = 0;
    let canceladas30 = 0;
    for (const reserva of reservas) {
      if (reserva.data_reserva < inicio || reserva.data_reserva > dia30) continue;
      const situacao = statusNormalizado(reserva.status);
      if (situacao === 'pendente') pendentes30 += 1;
      if (situacao === 'cancelada') canceladas30 += 1;
      if (situacao !== 'pendente' && situacao !== 'confirmada') continue;
      if (reserva.data_reserva <= dia7) semanaAtual += 1;
      else if (reserva.data_reserva >= dia8 && reserva.data_reserva <= dia14) semanaSeguinte += 1;
    }
    return { semanaAtual, semanaSeguinte, pendentes30, canceladas30, dia7, dia8, dia14, dia30 };
  }, [inicio, reservas]);
  const aguardando = carregando || !dados;

  const inteiro = (v: number) => v.toLocaleString('pt-BR');

  return (
    <section aria-labelledby="graficos-operadora-titulo" aria-busy={carregando} style={{ display: 'grid', gap: 16, minWidth: 0 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <p className="eda-g-eb">Inteligência operacional</p>
          <h2 id="graficos-operadora-titulo" className="eda-sec-titulo" style={{ margin: '4px 0 0' }}>Sua operação em números</h2>
        </div>
        <Link href="/reservas" className="eda-pg-bt eda-pg-bt-p">Gerenciar reservas →</Link>
      </div>

      <section className="eda-pg-kpis" aria-label="Leitura executiva de reservas" style={{ marginTop: 0 }}>
        <div className="eda-pg-kpi">
          <small>Operações · próximos 7 dias</small>
          <b>{aguardando ? '—' : leituraExecutiva?.semanaAtual ?? 0}</b>
          <span>Pendentes e confirmadas · {inicio ? `${dataCurta(inicio)} a ${dataCurta(leituraExecutiva?.dia7 ?? inicio)}` : 'aguardando período'}</span>
        </div>
        <div className="eda-pg-kpi">
          <small>Operações · semana seguinte</small>
          <b>{aguardando ? '—' : leituraExecutiva?.semanaSeguinte ?? 0}</b>
          <span>{leituraExecutiva ? `${dataCurta(leituraExecutiva.dia8)} a ${dataCurta(leituraExecutiva.dia14)}` : 'aguardando período'}</span>
        </div>
        <div className={`eda-pg-kpi ${leituraExecutiva?.pendentes30 ? 'eda-pg-kpi-at' : ''}`}>
          <small>Reservas pendentes · 30 dias</small>
          <b>{aguardando ? '—' : leituraExecutiva?.pendentes30 ?? 0}</b>
          <span>Solicitações para acompanhamento</span>
        </div>
        <div className="eda-pg-kpi">
          <small>Canceladas · próximos 30 dias</small>
          <b>{aguardando ? '—' : leituraExecutiva?.canceladas30 ?? 0}</b>
          <span>Contagem por data da operação</span>
        </div>
      </section>

      <div className="eda-g-grade-cartoes">
        <CartaoGraficoEDA
          etiqueta="Agenda"
          titulo="Operações por dia"
          sub={dados ? `Hoje e os próximos seis dias · ${dataCurta(inicio)} a ${dataCurta(dados.fimSemana)}` : 'Hoje e os próximos seis dias'}
          acoes={<span className="eda-g-numero">{aguardando ? '—' : dados.totalSemana}<small>pendentes ou confirmadas</small></span>}
        >
          {aguardando ? (
            <p role="status" className="eda-pg-estado">Carregando operações…</p>
          ) : dados.totalSemana === 0 ? (
            <div className="eda-pg-vazio" style={{ padding: '24px 12px' }}>
              <b>Nenhuma operação nos próximos 7 dias</b>
              <p>Consulte as reservas e organize a próxima viagem.</p>
              <Link href="/reservas" className="eda-pg-bt eda-pg-bt-p">Ver reservas</Link>
            </div>
          ) : (
            <BarrasAgrupadasEDA
              categorias={dados.dias.map((dia, indice) => (indice === 0 ? 'Hoje' : dataCurta(dia.data)))}
              series={[{ nome: 'Operações', c: 's1', valores: dados.dias.map((dia) => dia.quantidade) }]}
              formatar={inteiro}
              rotulo="Operações pendentes e confirmadas em cada dia"
              altura={200}
            />
          )}
          {leituraExecutiva && !aguardando && (
            <div style={{ marginTop: 16 }}>
              <BarrasHorizontaisEDA
                linhas={[
                  { rotulo: 'Esta semana', valores: [leituraExecutiva.semanaAtual] },
                  { rotulo: 'Semana seguinte', valores: [leituraExecutiva.semanaSeguinte] },
                ]}
                series={[{ nome: 'Operações', c: 's4' }]}
                formatar={inteiro}
                rotulo="Ritmo das próximas duas semanas"
                largRotulo={118}
              />
              <p className="eda-pg-texto-mut" style={{ marginTop: 8 }}>
                {leituraExecutiva.semanaAtual + leituraExecutiva.semanaSeguinte === 0
                  ? 'Nenhuma operação ativa nos próximos 14 dias.'
                  : leituraExecutiva.semanaSeguinte > leituraExecutiva.semanaAtual
                    ? 'A semana seguinte concentra mais operações. Revise equipe, embarcações e materiais.'
                    : 'Use este comparativo para organizar equipe, passeios, embarcações e materiais.'}
              </p>
            </div>
          )}
        </CartaoGraficoEDA>

        <CartaoGraficoEDA
          etiqueta="Situação"
          titulo="Reservas por situação"
          sub={dados ? `Hoje e os próximos 29 dias · inclui canceladas · ${dataCurta(inicio)} a ${dataCurta(dados.fimMes)}` : 'Hoje e os próximos 29 dias'}
        >
          {aguardando ? (
            <p role="status" className="eda-pg-estado">Carregando situações…</p>
          ) : dados.totalMes === 0 ? (
            <p className="eda-pg-texto-mut">Nenhuma reserva cadastrada para este período.</p>
          ) : (
            <>
              <RoscaEDA
                itens={SITUACOES.filter((s) => dados.contagem[s.chave] > 0 || ['confirmada', 'pendente', 'cancelada'].includes(s.chave)).map((s) => ({ nome: s.nome, valor: dados.contagem[s.chave], tom: s.tom }))}
                centro={String(dados.totalMes)}
                sub={dados.totalMes === 1 ? 'reserva' : 'reservas'}
                rotulo="Distribuição das reservas por situação"
              />
              <p className="eda-pg-texto-mut" style={{ marginTop: 12 }}>Outras situações incluem status não reconhecidos ou não informados.</p>
            </>
          )}
        </CartaoGraficoEDA>
      </div>

      <PendenciasFinanceirasDashboard plano={plano} carregandoPlano={carregandoPlano} />
    </section>
  );
}

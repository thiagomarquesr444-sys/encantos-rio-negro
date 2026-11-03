'use client';

import {
  normalizarStatusReservaERN,
  reservaOperacionalERN,
} from '@/lib/reservasStatusERN';

import React, { useEffect, useMemo, useState } from 'react';
import './dashboard-premium.css';
import Link from 'next/link';
import GraficosOperadora from '@/app/components/GraficosOperadora';
import MapaTerritorioERN from '@/app/components/MapaTerritorioERN';

import { supabase } from '@/lib/supabase';
import BotaoCopaPescaERN from '@/app/components/BotaoCopaPescaERN';
import PainelPorFuncaoERN from '@/app/components/PainelPorFuncaoERN';
import InicioOperadoraPremiumERN from '@/app/components/InicioOperadoraPremiumERN';


import {
  analisarUsoPlano,
  RECURSOS_PLANOS,
  type PlanoAtual,
  type RecursoPlano,
  type UsoPlano,
} from '@/lib/plano';

type Stats = {
  clientes: number;
  reservas: number;
  roteiros: number;
  embarcacoes: number;
};

type ReservaOperacional = {
  id: string;
  data_reserva: string;
  horario: string | null;
  quantidade_pessoas: number | null;
  valor_total: number | null;
  status: string | null;
  cliente: string | null;
  pacote: string | null;
  guia: string | null;
  embarcacao_id: string | null;
};

type DemandaOperacional = {
  id: string;
  titulo: string;
  categoria: string;
  localidade: string;
  data_inicio: string | null;
  data_fim: string | null;
  quantidade: number;
  unidade: string;
  status: string;
};

type UsoClientesRpc = {
  plano_codigo: string;
  plano_nome: string;
  total_clientes: number | string | null;
  limite_clientes: number | string | null;
  ilimitado: boolean;
  percentual_uso: number | string | null;
};

type UsoPasseiosRpc = {
  plano_codigo: string;
  plano_nome: string;
  total_passeios: number | string | null;
  limite_passeios: number | string | null;
  ilimitado: boolean;
  percentual_uso: number | string | null;
};

type UsoReservasRpc = {
  plano_codigo: string;
  plano_nome: string;
  total_reservas_mes: number | string | null;
  limite_reservas_mes: number | string | null;
  ilimitado: boolean;
  percentual_uso: number | string | null;
  inicio_periodo: string | null;
  fim_periodo: string | null;
};

type UsoUsuariosRpc = {
  plano_codigo: string;
  plano_nome: string;
  total_usuarios: number | string | null;
  limite_usuarios: number | string | null;
  ilimitado: boolean;
  percentual_uso: number | string | null;
};

const CATEGORIAS_DEMANDA: Record<string, string> = {
  hospedagem: 'Hospedagem',
  transporte_fluvial: 'Transporte fluvial',
  guiamento: 'Guiamento',
  passeios: 'Passeios',
  outros: 'Outros',
};

function primeiroResultado<T>(data: T | T[] | null): T | null {
  if (!data) {
    return null;
  }

  if (Array.isArray(data)) {
    return data[0] ?? null;
  }

  return data;
}

function numeroSeguro(
  valor: number | string | null | undefined,
): number {
  const numero = Number(valor ?? 0);

  return Number.isFinite(numero) ? numero : 0;
}

function nomeStatusPlano(status: string): string {
  switch (status) {
    case 'ativo':
      return 'Ativo';

    case 'trial':
      return 'Período de teste';

    case 'cancelado':
      return 'Cancelado';

    case 'inativo':
      return 'Inativo';

    default:
      return status;
  }
}

function estiloStatusPlano(status: string): string {
  if (status === 'ativo' || status === 'trial') {
    return 'border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300';
  }

  return 'border-[#E3A144]/20 bg-[#E3A144]/10 text-[#F4C77E]';
}

function normalizarStatusReserva(
  status: string | null | undefined,
): string {
  return normalizarStatusReservaERN(status).toLocaleLowerCase('pt-BR');
}

function nomeStatusReserva(
  status: string | null | undefined,
): string {
  const normalizado = normalizarStatusReserva(status);

  if (normalizado === 'confirmada') {
    return 'Confirmada';
  }

  if (normalizado === 'cancelada') {
    return 'Cancelada';
  }

  if (normalizado === 'pendente') {
    return 'Pendente';
  }

  return status?.trim() || 'Sem status';
}

function estiloStatusReserva(
  status: string | null | undefined,
): string {
  const normalizado = normalizarStatusReserva(status);

  if (normalizado === 'confirmada') {
    return 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300';
  }

  if (normalizado === 'cancelada') {
    return 'border-rose-400/20 bg-rose-400/[0.08] text-rose-300';
  }

  if (normalizado === 'concluída') {
    return 'border-sky-400/20 bg-sky-400/[0.08] text-sky-300';
  }

  if (normalizado === 'não compareceu') {
    return 'border-orange-400/20 bg-orange-400/[0.08] text-orange-300';
  }

  if (normalizado === 'desconhecido') {
    return 'border-white/20 bg-white/[0.08] text-white';
  }

  return 'border-[#E3A144]/20 bg-[#E3A144]/[0.08] text-[#F4C77E]';
}

function formatarData(data: string | null | undefined): string {
  if (!data) {
    return 'Não informado';
  }

  const partes = data.split('-');

  if (partes.length !== 3) {
    return data;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarHorario(
  horario: string | null | undefined,
): string {
  if (!horario) {
    return 'Horário não informado';
  }

  return horario.slice(0, 5);
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

function dataLocalManaus(): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Manaus',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const mapa = Object.fromEntries(
    partes.map((parte) => [parte.type, parte.value]),
  );

  return `${mapa.year}-${mapa.month}-${mapa.day}`;
}

function adicionarDiasISO(
  dataISO: string,
  dias: number,
): string {
  const data = new Date(`${dataISO}T12:00:00Z`);

  data.setUTCDate(data.getUTCDate() + dias);

  return data.toISOString().slice(0, 10);
}

function diferencaDiasISO(
  inicio: string,
  fim: string,
): number {
  const dataInicio = new Date(`${inicio}T12:00:00Z`);
  const dataFim = new Date(`${fim}T12:00:00Z`);

  return Math.round(
    (dataFim.getTime() - dataInicio.getTime()) /
      (1000 * 60 * 60 * 24),
  );
}

async function carregarReservasDashboard(
  inicio: string,
  fim: string,
  estaAtivo: () => boolean,
): Promise<{
  data: ReservaOperacional[] | null;
  error: Error | null;
}> {
  const registros: ReservaOperacional[] = [];
  const identificadores = new Set<string>();
  const tamanhoPagina = 200;
  const limiteProtecao = 10000;
  let totalEsperado: number | null = null;

  try {
    while (estaAtivo()) {
      const deslocamento = registros.length;

      const { data, error, count } = await supabase
        .from('reservas')
        .select(
          'id,data_reserva,horario,quantidade_pessoas,valor_total,status,cliente,pacote,guia,embarcacao_id',
          { count: 'exact' },
        )
        .gte('data_reserva', inicio)
        .lte('data_reserva', fim)
        .order('data_reserva', { ascending: true })
        .order('horario', { ascending: true, nullsFirst: false })
        .order('id', { ascending: true })
        .range(deslocamento, deslocamento + tamanhoPagina - 1)
        .returns<ReservaOperacional[]>();

      if (!estaAtivo()) {
        return { data: null, error: null };
      }

      if (error) throw new Error(error.message);

      if (count === null) {
        throw new Error('Não foi possível conferir o total de reservas.');
      }

      if (count > limiteProtecao) {
        throw new Error(
          'O volume de reservas exige uma consulta agregada no servidor.',
        );
      }

      if (totalEsperado !== null && count !== totalEsperado) {
        throw new Error(
          'As reservas mudaram durante a consulta. Atualize o painel.',
        );
      }

      totalEsperado = count;
      const lote = data ?? [];

      for (const registro of lote) {
        if (identificadores.has(registro.id)) {
          throw new Error(
            'As reservas mudaram durante a paginação. Atualize o painel.',
          );
        }

        identificadores.add(registro.id);
        registros.push(registro);
      }

      if (registros.length === totalEsperado) {
        return { data: registros, error: null };
      }

      if (lote.length === 0 || registros.length > totalEsperado) {
        throw new Error(
          'A consulta retornou reservas incompletas. Atualize o painel.',
        );
      }
    }

    return { data: null, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error
          : new Error('Não foi possível consultar as reservas.'),
    };
  }
}

// ERN_DEMANDAS_DASHBOARD_PAGINADAS
async function carregarDemandasDashboard(): Promise<{
  data: DemandaOperacional[];
  error: Error | null;
}> {
  try {
    const registros: DemandaOperacional[] = [];
    let esperado: number | null = null;

    for (let inicio = 0; inicio < 10000; inicio += 200) {
      const { data, error, count } = await supabase
        .from('demandas')
        .select(
          'id,titulo,categoria,localidade,data_inicio,data_fim,quantidade,unidade,status',
          { count: 'exact' },
        )
        .in('status', ['rascunho', 'aberta'])
        .order('data_inicio', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: false })
        .order('id', { ascending: true })
        .range(inicio, inicio + 199);

      if (error) {
        throw new Error('Não foi possível consultar as demandas operacionais.');
      }

      if (count === null || count > 10000) {
        throw new Error(
          'O volume de demandas exige agregação no servidor. Os alertas não serão apresentados parcialmente.',
        );
      }

      if (esperado !== null && esperado !== count) {
        throw new Error(
          'As demandas mudaram durante a consulta. Atualize o dashboard.',
        );
      }

      esperado = count;
      registros.push(...((data ?? []) as DemandaOperacional[]));

      if (registros.length >= count) break;

      if (!data?.length) {
        throw new Error('A consulta das demandas ficou incompleta.');
      }
    }

    if (
      registros.length !== esperado ||
      new Set(registros.map((item) => item.id)).size !== registros.length
    ) {
      throw new Error('A consulta das demandas ficou inconsistente.');
    }

    return { data: registros, error: null };
  } catch (falha) {
    return {
      data: [],
      error: falha instanceof Error
        ? falha
        : new Error('Não foi possível carregar as demandas operacionais.'),
    };
  }
}

export default function DashboardPage() {
  return (
    <PainelPorFuncaoERN>
      <DashboardAdministrativoERN />
    </PainelPorFuncaoERN>
  );
}

function DashboardAdministrativoERN() {
  const [stats, setStats] = useState<Stats>({
    clientes: 0,
    reservas: 0,
    roteiros: 0,
    embarcacoes: 0,
  });

  const [reservasOperacionais, setReservasOperacionais] =
    useState<ReservaOperacional[]>([]);

  const [demandasOperacionais, setDemandasOperacionais] =
    useState<DemandaOperacional[]>([]);

  const [plano, setPlano] = useState<PlanoAtual | null>(null);
  const [uso, setUso] = useState<UsoPlano | null>(null);

  const [inicioPeriodo, setInicioPeriodo] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingPlano, setLoadingPlano] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [erroPlano, setErroPlano] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function fetchDashboard() {

      const hoje = dataLocalManaus();
      const horizonte = adicionarDiasISO(hoje, 29);

      try {
        const [
          resClientes,
          resReservas,
          resPasseios,
          resEmbarcacoes,
          resReservasOperacionais,
          resDemandas,
          resPlano,
          resUsoClientes,
          resUsoPasseios,
          resUsoReservas,
          resUsoUsuarios,
        ] = await Promise.all([
          supabase.from('clientes').select('id', {
            count: 'exact',
            head: true,
          }),

          supabase.from('reservas').select('id', {
            count: 'exact',
            head: true,
          }),

          supabase.from('passeios').select('id', {
            count: 'exact',
            head: true,
          }),

          supabase.from('embarcacoes').select('id', {
            count: 'exact',
            head: true,
          }),

          carregarReservasDashboard(hoje, horizonte, () => ativo),

          carregarDemandasDashboard(),

          supabase.rpc('get_meu_plano'),

          supabase.rpc('get_meu_uso_clientes'),

          supabase.rpc('get_meu_uso_passeios'),

          supabase.rpc('get_meu_uso_reservas_mes'),

          supabase.rpc('get_meu_uso_usuarios'),
        ]);

        if (!ativo) {
          return;
        }

        setInicioPeriodo(hoje);

        const errosOperacionais = [
          resClientes.error,
          resReservas.error,
          resPasseios.error,
          resEmbarcacoes.error,
          resReservasOperacionais.error,
          resDemandas.error,
        ].filter(Boolean);

        if (errosOperacionais.length > 0) {

          setError(
            'Não foi possível carregar completamente os dados operacionais.',
          );
        }

        setStats({
          clientes: resClientes.count ?? 0,
          reservas: resReservas.count ?? 0,
          roteiros: resPasseios.count ?? 0,
          embarcacoes: resEmbarcacoes.count ?? 0,
        });

        setReservasOperacionais(
          (resReservasOperacionais.data ??
            []) as ReservaOperacional[],
        );

        setDemandasOperacionais(
          (resDemandas.data ?? []) as DemandaOperacional[],
        );

        if (resPlano.error) {

          setPlano(null);
          setErroPlano('Nao foi possivel consultar o plano da empresa.');
        } else {
          const resultadoPlano = primeiroResultado(
            resPlano.data,
          );

          if (resultadoPlano) {
            setPlano(resultadoPlano as PlanoAtual);
          } else {
            setPlano(null);

            setErroPlano(
              'Nenhum plano foi encontrado para esta empresa.',
            );
          }
        }

        const errosUso = [
          resUsoClientes.error,
          resUsoPasseios.error,
          resUsoReservas.error,
          resUsoUsuarios.error,
        ].filter(Boolean);

        if (errosUso.length > 0) {

          setUso(null);

          setErroPlano(
            'Não foi possível carregar completamente o uso da assinatura.',
          );

          return;
        }

        const clientes = primeiroResultado(
          resUsoClientes.data,
        ) as UsoClientesRpc | null;

        const passeios = primeiroResultado(
          resUsoPasseios.data,
        ) as UsoPasseiosRpc | null;

        const reservas = primeiroResultado(
          resUsoReservas.data,
        ) as UsoReservasRpc | null;

        const usuarios = primeiroResultado(
          resUsoUsuarios.data,
        ) as UsoUsuariosRpc | null;

        if (
          !clientes ||
          !passeios ||
          !reservas ||
          !usuarios
        ) {
          setUso(null);

          setErroPlano(
            'Não foi possível identificar completamente o uso da assinatura.',
          );

          return;
        }

        setUso({
          usuarios: numeroSeguro(usuarios.total_usuarios),
          clientes: numeroSeguro(clientes.total_clientes),
          reservas_mes: numeroSeguro(
            reservas.total_reservas_mes,
          ),
          passeios: numeroSeguro(
            passeios.total_passeios,
          ),
        });
      } catch (err) {

        if (!ativo) {
          return;
        }

        setError(
          'Não foi possível carregar o Dashboard. Atualize a página ou tente novamente.',
        );
      } finally {
        if (ativo) {
          setLoading(false);
          setLoadingPlano(false);
        }
      }
    }

    void fetchDashboard();

    return () => {
      ativo = false;
    };
  }, []);

  const situacaoUso = useMemo(() => {
    if (!plano || !uso) {
      return null;
    }

    return analisarUsoPlano(plano, uso);
  }, [plano, uso]);

  // ERN_INICIO_OPERADORA_PREMIUM_V1: a página inicial nova concentra o dia
  // da operadora; mapa e análises completas seguem logo abaixo.
  return (
    <div className="eda-inicio-fundo min-w-0 w-full break-words">
      <InicioOperadoraPremiumERN
        hoje={inicioPeriodo || dataLocalManaus()}
        reservas={reservasOperacionais}
        demandas={demandasOperacionais}
        stats={stats}
        plano={plano}
        carregandoPlano={loadingPlano}
        uso={situacaoUso}
        carregando={loading}
        erro={error}
      />

      <div className="ern-premium-dashboard eda-analises min-w-0 w-full">
        <div className="mx-auto min-w-0 w-full max-w-[1360px] px-4 pb-12 pt-6 sm:px-5 md:px-8">
          <section aria-labelledby="eda-territorio" id="mapa-ern" className="scroll-mt-28">
            <p className="eda-sec-eb">Território</p>
            <h2 id="eda-territorio" className="eda-sec-titulo">Mapa da operação</h2>
            <MapaTerritorioERN demandas={demandasOperacionais} carregando={loading} />
          </section>

          <section aria-labelledby="eda-analises" id="ern-v446-graficos" className="mt-10 scroll-mt-28">
            <p className="eda-sec-eb">Análises</p>
            <h2 id="eda-analises" className="eda-sec-titulo">Reservas e financeiro em detalhe</h2>
            <GraficosOperadora
              plano={plano}
              carregandoPlano={loadingPlano}
              reservas={reservasOperacionais}
              inicio={inicioPeriodo}
              carregando={loading}
            />
          </section>

          <section className="eda-copa mt-10" aria-label="Copa Brasil de Pesca Esportiva">
            <div>
              <p className="eda-sec-eb">Evento</p>
              <p className="eda-copa-titulo">Copa Brasil de Pesca Esportiva</p>
            </div>
            <BotaoCopaPescaERN />
          </section>
        </div>
      </div>
    </div>
  );
}

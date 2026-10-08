'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { supabase } from '@/lib/supabase';
import { BANNER_REGIONAL } from '@/lib/bannerImagens';

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
  return (status ?? '').trim().toLocaleLowerCase('pt-BR');
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

export default function DashboardPage() {
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

  const [loading, setLoading] = useState(true);
  const [loadingPlano, setLoadingPlano] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [erroPlano, setErroPlano] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function fetchDashboard() {
      setLoading(true);
      setLoadingPlano(true);
      setError(null);
      setErroPlano(null);

      const hoje = dataLocalManaus();
      const horizonte = adicionarDiasISO(hoje, 30);

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

          supabase
            .from('reservas')
            .select(
              'id,data_reserva,horario,quantidade_pessoas,valor_total,status,cliente,pacote,guia,embarcacao_id',
            )
            .gte('data_reserva', hoje)
            .lte('data_reserva', horizonte)
            .order('data_reserva', { ascending: true })
            .order('horario', {
              ascending: true,
              nullsFirst: false,
            })
            .limit(30),

          supabase
            .from('demandas')
            .select(
              'id,titulo,categoria,localidade,data_inicio,data_fim,quantidade,unidade,status',
            )
            .in('status', ['rascunho', 'aberta'])
            .order('data_inicio', {
              ascending: true,
              nullsFirst: false,
            })
            .order('created_at', { ascending: false })
            .limit(20),

          supabase.rpc('get_meu_plano'),

          supabase.rpc('get_meu_uso_clientes'),

          supabase.rpc('get_meu_uso_passeios'),

          supabase.rpc('get_meu_uso_reservas_mes'),

          supabase.rpc('get_meu_uso_usuarios'),
        ]);

        if (!ativo) {
          return;
        }

        const errosOperacionais = [
          resClientes.error,
          resReservas.error,
          resPasseios.error,
          resEmbarcacoes.error,
          resReservasOperacionais.error,
          resDemandas.error,
        ].filter(Boolean);

        if (errosOperacionais.length > 0) {
          console.error(
            'Erros ao carregar dados operacionais:',
            errosOperacionais,
          );

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
          console.error(
            'Erro ao carregar plano:',
            resPlano.error,
          );

          setPlano(null);
          setErroPlano(resPlano.error.message);
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
          console.error(
            'Erros ao carregar uso do plano:',
            errosUso,
          );

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
        console.error(
          'Erro ao carregar dashboard:',
          err,
        );

        if (!ativo) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : 'Ocorreu um erro inesperado ao carregar o dashboard.',
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

  const resumoOperacional = useMemo(() => {
    const hoje = dataLocalManaus();
    const seteDias = adicionarDiasISO(hoje, 7);

    const reservasValidas = reservasOperacionais.filter(
      (reserva) =>
        normalizarStatusReserva(reserva.status) !== 'cancelada',
    );

    const hojeReservas = reservasValidas.filter(
      (reserva) => reserva.data_reserva === hoje,
    );

    const proximosSeteDias = reservasValidas.filter(
      (reserva) =>
        reserva.data_reserva >= hoje &&
        reserva.data_reserva <= seteDias,
    );

    const pessoasProximosSeteDias = proximosSeteDias.reduce(
      (total, reserva) =>
        total + numeroSeguro(reserva.quantidade_pessoas),
      0,
    );

    const pendentes = reservasOperacionais.filter(
      (reserva) =>
        normalizarStatusReserva(reserva.status) === 'pendente',
    );

    const valorProximosSeteDias = proximosSeteDias.reduce(
      (total, reserva) =>
        total + numeroSeguro(reserva.valor_total),
      0,
    );

    return {
      hoje: hojeReservas.length,
      proximosSeteDias: proximosSeteDias.length,
      pessoasProximosSeteDias,
      pendentes: pendentes.length,
      valorProximosSeteDias,
    };
  }, [reservasOperacionais]);

  const proximasOperacoes = useMemo(() => {
    return reservasOperacionais
      .filter(
        (reserva) =>
          normalizarStatusReserva(reserva.status) !== 'cancelada',
      )
      .slice(0, 5);
  }, [reservasOperacionais]);

  const alertas = useMemo(() => {
    const hoje = dataLocalManaus();
    const seteDias = adicionarDiasISO(hoje, 7);

    const proximas = reservasOperacionais.filter(
      (reserva) =>
        reserva.data_reserva >= hoje &&
        reserva.data_reserva <= seteDias &&
        normalizarStatusReserva(reserva.status) !== 'cancelada',
    );

    const reservasPendentes = proximas.filter(
      (reserva) =>
        normalizarStatusReserva(reserva.status) === 'pendente',
    ).length;

    const semHorario = proximas.filter(
      (reserva) => !reserva.horario,
    ).length;

    const semGuia = proximas.filter(
      (reserva) => !reserva.guia?.trim(),
    ).length;

    const semEmbarcacao = proximas.filter(
      (reserva) => !reserva.embarcacao_id,
    ).length;

    const demandasRascunho = demandasOperacionais.filter(
      (demanda) => demanda.status === 'rascunho',
    ).length;

    const demandasProximas = demandasOperacionais.filter(
      (demanda) => {
        if (
          demanda.status !== 'aberta' ||
          !demanda.data_inicio
        ) {
          return false;
        }

        const diferenca = diferencaDiasISO(
          hoje,
          demanda.data_inicio,
        );

        return diferenca >= 0 && diferenca <= 7;
      },
    ).length;

    return [
      {
        titulo: 'Reservas pendentes',
        valor: reservasPendentes,
        detalhe:
          'aguardando confirmação nos próximos 7 dias',
        href: '/reservas',
      },
      {
        titulo: 'Sem horário',
        valor: semHorario,
        detalhe:
          'operações próximas sem horário informado',
        href: '/reservas',
      },
      {
        titulo: 'Sem guia',
        valor: semGuia,
        detalhe:
          'operações próximas sem guia informado',
        href: '/reservas',
      },
      {
        titulo: 'Sem embarcação',
        valor: semEmbarcacao,
        detalhe:
          'operações próximas sem embarcação vinculada',
        href: '/reservas',
      },
      {
        titulo: 'Demandas em rascunho',
        valor: demandasRascunho,
        detalhe:
          'necessidades ainda não abertas',
        href: '/demandas',
      },
      {
        titulo: 'Demandas próximas',
        valor: demandasProximas,
        detalhe:
          'demandas abertas com início em até 7 dias',
        href: '/demandas',
      },
    ];
  }, [demandasOperacionais, reservasOperacionais]);

  const totalAlertas = useMemo(
    () =>
      alertas.reduce(
        (total, alerta) => total + alerta.valor,
        0,
      ),
    [alertas],
  );

  const demandasAbertas = demandasOperacionais.filter(
    (demanda) => demanda.status === 'aberta',
  );

  const demandasRascunho = demandasOperacionais.filter(
    (demanda) => demanda.status === 'rascunho',
  );

  const demandasDestaque = useMemo(() => {
    return [...demandasOperacionais]
      .sort((a, b) => {
        if (
          a.status === 'aberta' &&
          b.status !== 'aberta'
        ) {
          return -1;
        }

        if (
          a.status !== 'aberta' &&
          b.status === 'aberta'
        ) {
          return 1;
        }

        if (a.data_inicio && b.data_inicio) {
          return a.data_inicio.localeCompare(
            b.data_inicio,
          );
        }

        if (a.data_inicio) {
          return -1;
        }

        if (b.data_inicio) {
          return 1;
        }

        return 0;
      })
      .slice(0, 3);
  }, [demandasOperacionais]);

  const indicadores = [
    {
      titulo: 'Clientes',
      valor: stats.clientes,
      href: '/clientes',
      detalhe: 'viajantes cadastrados',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm13 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
          />
        </svg>
      ),
    },
    {
      titulo: 'Reservas',
      valor: stats.reservas,
      href: '/reservas',
      detalhe: 'registros na operação',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      titulo: 'Passeios',
      valor: stats.roteiros,
      href: '/passeios',
      detalhe: 'experiências cadastradas',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 21a9 9 0 100-18 9 9 0 000 18zm0-14l3 5-3 5-3-5 3-5z"
          />
        </svg>
      ),
    },
    {
      titulo: 'Embarcações',
      valor: stats.embarcacoes,
      href: '/embarcacoes',
      detalhe: 'unidades cadastradas',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 18l2-5h14l2 5M5 13l2-6h10l2 6M12 7V3m-6 17c1.5 1 3 1 4.5 0 1.5 1 3 1 4.5 0 1.5 1 3 1 4.5 0"
          />
        </svg>
      ),
    },
  ];

  const atalhos = [
    {
      titulo: 'Novo cliente',
      descricao: 'Cadastrar um novo viajante.',
      href: '/clientes/novo',
    },
    {
      titulo: 'Nova reserva',
      descricao: 'Registrar uma nova operação.',
      href: '/reservas/nova',
    },
    {
      titulo: 'Novo passeio',
      descricao: 'Adicionar uma experiência.',
      href: '/passeios/novo',
    },
    {
      titulo: 'Demandas',
      descricao:
        'Acompanhar necessidades da empresa.',
      href: '/demandas',
    },
  ];

  const recursos = plano?.recursos
    ? Object.entries(plano.recursos)
    : [];

  const cardsUso = situacaoUso
    ? [
        {
          chave: 'usuarios',
          label: 'Usuários',
          situacao: situacaoUso.usuarios,
        },
        {
          chave: 'clientes',
          label: 'Clientes',
          situacao: situacaoUso.clientes,
        },
        {
          chave: 'reservas_mes',
          label: 'Reservas / mês',
          situacao: situacaoUso.reservas_mes,
        },
        {
          chave: 'passeios',
          label: 'Passeios',
          situacao: situacaoUso.passeios,
        },
      ]
    : [];

  return (
    <div className="min-h-screen min-w-0 w-full break-words bg-[#07110E] text-[#EDEDE3]">
      <section className="relative overflow-hidden border-b border-white/[0.07] bg-[#091510]">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-35"
          style={{
            backgroundImage: `url('${BANNER_REGIONAL.modulos.dashboard}')`,
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#06100D] via-[#07110E]/94 to-[#07110E]/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07110E] via-transparent to-transparent" />
        <div className="pointer-events-none absolute -right-24 -top-36 h-[420px] w-[420px] rounded-full border border-[#E3A144]/10" />

        <div className="relative mx-auto max-w-[1360px] px-3 py-7 sm:px-5 sm:py-11 md:px-8 md:py-16">
          <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-[#E3A144]" />

                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#E3A144]">
                  ERN Operação
                </span>
              </div>

              <h1
                className="mt-3 max-w-[780px] text-3xl font-medium leading-[1.02] tracking-[-0.035em] text-[#F0F0E8] sm:mt-5 sm:text-4xl md:text-5xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Sua operação no Rio Negro,
                <br className="hidden sm:block" />{' '}
                sob controle.
              </h1>

              <p className="mt-3 max-w-[700px] text-sm leading-6 text-[#EDEDE3]/65 sm:mt-5 sm:leading-7 md:text-base">
                Acompanhe o que acontece hoje,
                prepare as próximas operações e
                conecte sua empresa à Rede ERN.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
              <Link
                href="/reservas/nova"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#E3A144] px-3 text-xs font-bold text-[#07130F] transition hover:-translate-y-0.5 hover:bg-[#F0B35C] sm:min-h-[50px] sm:px-6 sm:text-sm"
              >
                <span className="text-lg leading-none">
                  +
                </span>
                Nova reserva
              </Link>

              <Link
                href="/demandas"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.035] px-3 text-xs font-semibold text-[#EDEDE3]/75 backdrop-blur transition hover:bg-white/[0.07] sm:min-h-[50px] sm:px-6 sm:text-sm"
              >
                Ver demandas
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto min-w-0 w-full max-w-[1360px] px-3 py-5 sm:px-5 sm:py-8 md:px-8 md:py-10">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-5 py-4 text-sm text-red-200">
            <span className="font-semibold">
              Alguns dados não foram carregados.
            </span>

            <span className="ml-2 text-red-200/65">
              {error}
            </span>
          </div>
        )}

        <section>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                Operação agora
              </p>

              <h2
                className="mt-2 text-2xl text-[#F0F0E8] sm:text-3xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                O que precisa da sua atenção
              </h2>
            </div>

            <p className="max-w-[470px] text-xs leading-5 text-[#EDEDE3]/65">
              Dados das reservas e demandas da
              empresa, organizados para o trabalho
              diário.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-4 xl:grid-cols-4">
            {[
              {
                label: 'Hoje',
                valor: resumoOperacional.hoje,
                detalhe: 'operações programadas',
              },
              {
                label: 'Próximos 7 dias',
                valor:
                  resumoOperacional.proximosSeteDias,
                detalhe: 'operações previstas',
              },
              {
                label: 'Pessoas',
                valor:
                  resumoOperacional.pessoasProximosSeteDias,
                detalhe: 'previstas em 7 dias',
              },
              {
                label: 'Pendentes',
                valor:
                  resumoOperacional.pendentes,
                detalhe:
                  'aguardando confirmação',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="min-w-0 rounded-2xl border border-white/[0.075] bg-[#0A1713] p-3 sm:rounded-[22px] sm:p-5"
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#7C9C87]">
                  {item.label}
                </p>

                <strong
                  className="mt-3 block text-3xl font-medium tabular-nums tracking-[-0.04em] text-[#F0F0E8] sm:text-4xl"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  {loading ? '—' : item.valor}
                </strong>

                <p className="mt-1 text-[11px] text-[#EDEDE3]/50">
                  {item.detalhe}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-2xl border border-[#E3A144]/12 bg-[#E3A144]/[0.035] px-4 py-3 sm:mt-4 sm:px-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#EDEDE3]/60">
                Valor das operações previstas nos
                próximos 7 dias
              </p>

              <strong className="text-sm text-[#F4C77E]">
                {loading
                  ? '—'
                  : formatarMoeda(
                      resumoOperacional.valorProximosSeteDias,
                    )}
              </strong>
            </div>
          </div>
        </section>

        <div className="mt-6 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <section className="overflow-hidden rounded-2xl border border-white/[0.075] bg-[#0A1713] sm:rounded-[26px]">
            <div className="flex items-end justify-between gap-4 border-b border-white/[0.06] px-4 py-4 sm:px-6 sm:py-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                  Agenda operacional
                </p>

                <h2
                  className="mt-2 text-xl text-[#F0F0E8] sm:text-2xl"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Próximas operações
                </h2>
              </div>

              <Link
                href="/reservas"
                className="text-xs font-semibold text-[#F4C77E] transition hover:text-[#E3A144]"
              >
                Ver reservas →
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3 p-4 sm:p-6">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-20 animate-pulse rounded-xl bg-white/[0.035]"
                  />
                ))}
              </div>
            ) : proximasOperacoes.length === 0 ? (
              <div className="px-5 py-10 text-center sm:px-8 sm:py-14">
                <p
                  className="text-xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Nenhuma operação programada
                </p>

                <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-[#EDEDE3]/50">
                  As próximas reservas da empresa
                  aparecerão aqui automaticamente.
                </p>

                <Link
                  href="/reservas/nova"
                  className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#E3A144] px-5 text-xs font-bold text-[#07130F] transition hover:bg-[#F0B35C]"
                >
                  Cadastrar primeira reserva
                </Link>
              </div>
            ) : (
              <div>
                {proximasOperacoes.map(
                  (reserva, index) => (
                    <Link
                      key={reserva.id}
                      href="/reservas"
                      className={`group grid gap-3 px-4 py-4 transition hover:bg-white/[0.025] sm:grid-cols-[105px_minmax(0,1fr)_120px_auto] sm:items-center sm:px-6 ${
                        index !==
                        proximasOperacoes.length -
                          1
                          ? 'border-b border-white/[0.055]'
                          : ''
                      }`}
                    >
                      <div>
                        <strong className="block text-sm text-[#F0F0E8]">
                          {formatarData(
                            reserva.data_reserva,
                          )}
                        </strong>

                        <span className="mt-1 block text-[10px] text-[#EDEDE3]/45">
                          {formatarHorario(
                            reserva.horario,
                          )}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#EDEDE3]/85">
                          {reserva.cliente ||
                            'Cliente não informado'}
                        </p>

                        <p className="mt-1 truncate text-xs text-[#EDEDE3]/45">
                          {reserva.pacote ||
                            'Passeio não informado'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-[#EDEDE3]/60">
                          {numeroSeguro(
                            reserva.quantidade_pessoas,
                          )}{' '}
                          pessoa
                          {numeroSeguro(
                            reserva.quantidade_pessoas,
                          ) === 1
                            ? ''
                            : 's'}
                        </p>

                        <p className="mt-1 text-[10px] text-[#EDEDE3]/35">
                          {formatarMoeda(
                            numeroSeguro(
                              reserva.valor_total,
                            ),
                          )}
                        </p>
                      </div>

                      <span
                        className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] ${estiloStatusReserva(
                          reserva.status,
                        )}`}
                      >
                        {nomeStatusReserva(
                          reserva.status,
                        )}
                      </span>
                    </Link>
                  ),
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/[0.075] bg-[#0A1713] p-4 sm:rounded-[26px] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  Atenção operacional
                </p>

                <h2
                  className="mt-2 text-xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Pendências
                </h2>
              </div>

              <span
                className={`flex h-9 min-w-9 items-center justify-center rounded-full border px-2 text-xs font-bold ${
                  totalAlertas > 0
                    ? 'border-[#E3A144]/25 bg-[#E3A144]/10 text-[#F4C77E]'
                    : 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300'
                }`}
              >
                {loading ? '—' : totalAlertas}
              </span>
            </div>

            {!loading && totalAlertas === 0 ? (
              <div className="mt-5 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.035] p-4">
                <p className="text-sm font-semibold text-emerald-200/85">
                  Nenhuma pendência operacional.
                </p>

                <p className="mt-1 text-[11px] leading-5 text-[#EDEDE3]/45">
                  As próximas operações estão sem
                  alertas nos critérios atuais.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {alertas
                  .filter(
                    (alerta) =>
                      loading ||
                      alerta.valor > 0,
                  )
                  .map((alerta) => (
                    <Link
                      key={alerta.titulo}
                      href={alerta.href}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.018] px-3 py-3 transition hover:border-[#E3A144]/15 hover:bg-white/[0.03]"
                    >
                      <div>
                        <p className="text-xs font-semibold text-[#EDEDE3]/75">
                          {alerta.titulo}
                        </p>

                        <p className="mt-1 text-[10px] leading-4 text-[#EDEDE3]/38">
                          {alerta.detalhe}
                        </p>
                      </div>

                      <strong className="shrink-0 text-lg text-[#F4C77E]">
                        {loading
                          ? '—'
                          : alerta.valor}
                      </strong>
                    </Link>
                  ))}
              </div>
            )}
          </section>
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.075] bg-[#0A1713] sm:rounded-[26px]">
          <div className="flex flex-col gap-4 border-b border-white/[0.06] px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-5">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                Necessidades da empresa
              </p>

              <h2
                className="mt-2 text-xl text-[#F0F0E8] sm:text-2xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Demandas da operação
              </h2>
            </div>

            <Link
              href="/demandas"
              className="text-xs font-semibold text-[#F4C77E] transition hover:text-[#E3A144]"
            >
              Ver todas →
            </Link>
          </div>

          <div className="grid gap-0 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div className="grid grid-cols-2 border-b border-white/[0.06] lg:grid-cols-1 lg:border-b-0 lg:border-r">
              <div className="p-4 sm:p-5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#7C9C87]">
                  Abertas
                </p>

                <strong
                  className="mt-2 block text-3xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  {loading
                    ? '—'
                    : demandasAbertas.length}
                </strong>
              </div>

              <div className="border-l border-white/[0.055] p-4 sm:p-5 lg:border-l-0 lg:border-t">
                <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#7C9C87]">
                  Rascunhos
                </p>

                <strong
                  className="mt-2 block text-3xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  {loading
                    ? '—'
                    : demandasRascunho.length}
                </strong>
              </div>
            </div>

            <div>
              {loading ? (
                <div className="space-y-3 p-4 sm:p-6">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-16 animate-pulse rounded-xl bg-white/[0.035]"
                    />
                  ))}
                </div>
              ) : demandasDestaque.length === 0 ? (
                <div className="px-5 py-9 sm:px-8">
                  <p className="text-sm font-semibold text-[#F0F0E8]">
                    Sua empresa ainda não tem
                    demandas ativas.
                  </p>

                  <p className="mt-2 text-xs leading-5 text-[#EDEDE3]/45">
                    Quando houver necessidades de
                    contratação, elas aparecerão
                    aqui.
                  </p>
                </div>
              ) : (
                demandasDestaque.map(
                  (demanda, index) => (
                    <Link
                      href="/demandas"
                      key={demanda.id}
                      className={`grid gap-3 px-4 py-4 transition hover:bg-white/[0.025] sm:grid-cols-[150px_minmax(0,1fr)_150px] sm:items-center sm:px-6 ${
                        index !==
                        demandasDestaque.length -
                          1
                          ? 'border-b border-white/[0.055]'
                          : ''
                      }`}
                    >
                      <div>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] ${
                            demanda.status ===
                            'aberta'
                              ? 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300'
                              : 'border-white/[0.08] bg-white/[0.03] text-[#EDEDE3]/55'
                          }`}
                        >
                          {demanda.status ===
                          'aberta'
                            ? 'Aberta'
                            : 'Rascunho'}
                        </span>

                        <p className="mt-2 text-[10px] text-[#E3A144]">
                          {CATEGORIAS_DEMANDA[
                            demanda.categoria
                          ] ??
                            demanda.categoria}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#EDEDE3]/82">
                          {demanda.titulo}
                        </p>

                        <p className="mt-1 truncate text-xs text-[#EDEDE3]/45">
                          {demanda.localidade}
                        </p>
                      </div>

                      <div className="text-xs text-[#EDEDE3]/55">
                        <p>
                          {numeroSeguro(
                            demanda.quantidade,
                          )}{' '}
                          {demanda.unidade}
                        </p>

                        <p className="mt-1 text-[10px] text-[#EDEDE3]/35">
                          {demanda.data_inicio &&
                          demanda.data_fim
                            ? `${formatarData(
                                demanda.data_inicio,
                              )} — ${formatarData(
                                demanda.data_fim,
                              )}`
                            : 'Período não informado'}
                        </p>
                      </div>
                    </Link>
                  ),
                )
              )}
            </div>
          </div>
        </section>

        <section className="mt-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                Visão geral
              </p>

              <h2
                className="mt-2 text-xl text-[#F0F0E8] sm:text-2xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Estrutura cadastrada
              </h2>
            </div>

            <p className="max-w-[420px] text-xs leading-5 text-[#EDEDE3]/50">
              Indicadores gerais da empresa.
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-4 xl:grid-cols-4">
            {indicadores.map((item) => (
              <Link
                key={item.titulo}
                href={item.href}
                className="group min-w-0 rounded-2xl border border-white/[0.075] bg-[#0A1713] p-3 transition duration-300 hover:-translate-y-0.5 hover:border-[#E3A144]/20 hover:bg-[#0C1B16] sm:rounded-[22px] sm:p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#E3A144]/15 bg-[#E3A144]/7 text-[#E3A144] sm:h-10 sm:w-10">
                    {item.icon}
                  </div>

                  <span className="text-sm text-[#EDEDE3]/35 transition group-hover:translate-x-0.5 group-hover:text-[#E3A144]">
                    →
                  </span>
                </div>

                <div className="mt-3 sm:mt-8">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#EDEDE3]/45">
                    {item.titulo}
                  </p>

                  <strong
                    className="mt-1 block text-3xl font-medium tabular-nums tracking-[-0.04em] text-[#F0F0E8] sm:mt-2 sm:text-4xl"
                    style={{
                      fontFamily:
                        'var(--font-fraunces), serif',
                    }}
                  >
                    {loading
                      ? '—'
                      : item.valor}
                  </strong>

                  <p className="mt-1 text-[11px] text-[#EDEDE3]/40">
                    {item.detalhe}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-7 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-2xl border border-[#E3A144]/15 bg-[#0A1713] sm:rounded-[26px]">
            <div className="border-b border-white/[0.06] px-4 py-4 sm:px-6 sm:py-5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                Rede ERN
              </p>

              <h2
                className="mt-2 text-2xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Sua empresa dentro da rede
              </h2>

              <p className="mt-2 max-w-xl text-xs leading-5 text-[#EDEDE3]/48">
                O painel operacional será também a
                ponte entre a empresa, os
                profissionais e o futuro portal
                público Encantos Rio Negro.
              </p>
            </div>

            <div className="grid grid-cols-2">
              {[
                {
                  nome: 'Demandas',
                  descricao:
                    'Necessidades da operação',
                  href: '/demandas',
                  ativo: true,
                },
                {
                  nome: 'Guias',
                  descricao:
                    'Profissionais vinculados',
                  href: '/guias',
                  ativo: true,
                },
                {
                  nome: 'Parceiros',
                  descricao:
                    'Rede operacional',
                  href: '/parceiros',
                  ativo: true,
                },
                {
                  nome: 'Presença pública',
                  descricao:
                    'Perfil e publicações',
                  href: '',
                  ativo: false,
                },
              ].map((item, index) =>
                item.ativo ? (
                  <Link
                    href={item.href}
                    key={item.nome}
                    className={`group p-4 transition hover:bg-white/[0.025] sm:p-5 ${
                      index % 2 === 0
                        ? 'border-r border-white/[0.055]'
                        : ''
                    } ${
                      index < 2
                        ? 'border-b border-white/[0.055]'
                        : ''
                    }`}
                  >
                    <p className="text-sm font-semibold text-[#EDEDE3]/78">
                      {item.nome}
                    </p>

                    <p className="mt-1 text-[10px] leading-4 text-[#EDEDE3]/40">
                      {item.descricao}
                    </p>

                    <span className="mt-3 block text-xs text-[#E3A144]">
                      Acessar →
                    </span>
                  </Link>
                ) : (
                  <div
                    key={item.nome}
                    className={`p-4 sm:p-5 ${
                      index % 2 === 0
                        ? 'border-r border-white/[0.055]'
                        : ''
                    } ${
                      index < 2
                        ? 'border-b border-white/[0.055]'
                        : ''
                    }`}
                  >
                    <p className="text-sm font-semibold text-[#EDEDE3]/65">
                      {item.nome}
                    </p>

                    <p className="mt-1 text-[10px] leading-4 text-[#EDEDE3]/35">
                      {item.descricao}
                    </p>

                    <span className="mt-3 inline-flex rounded-full border border-[#E3A144]/15 bg-[#E3A144]/[0.05] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#F4C77E]">
                      Em preparação
                    </span>
                  </div>
                ),
              )}
            </div>
          </section>

          <section className="relative overflow-hidden rounded-2xl border border-white/[0.075] bg-[#081611] sm:rounded-[26px]">
            <div className="pointer-events-none absolute -right-28 top-8 h-72 w-72 rounded-full border border-[#E3A144]/10" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-20 -translate-x-1/2 -translate-y-1/2 rotate-[18deg] rounded-[50%] border border-[#7C9C87]/15" />

            <div className="relative border-b border-white/[0.06] px-4 py-4 sm:px-6 sm:py-5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                Território ERN
              </p>

              <h2
                className="mt-2 text-2xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Alto e Baixo Rio Negro
              </h2>

              <p className="mt-2 max-w-xl text-xs leading-5 text-[#EDEDE3]/45">
                Base territorial da rede,
                preparada para receber operações,
                parceiros, experiências e eventos.
              </p>
            </div>

            <div className="relative grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
              <div className="rounded-2xl border border-white/[0.065] bg-white/[0.018] p-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#E3A144]">
                  Baixo Rio Negro
                </p>

                <div className="mt-4 space-y-3">
                  {[
                    'Manaus',
                    'Novo Airão',
                  ].map((cidade) => (
                    <div
                      key={cidade}
                      className="flex items-center gap-3"
                    >
                      <span className="h-2 w-2 rounded-full bg-[#E3A144]" />

                      <span className="text-xs text-[#EDEDE3]/70">
                        {cidade}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.065] bg-white/[0.018] p-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#7C9C87]">
                  Alto Rio Negro
                </p>

                <div className="mt-4 space-y-3">
                  {[
                    'Barcelos',
                    'Santa Isabel do Rio Negro',
                    'São Gabriel da Cachoeira',
                  ].map((cidade) => (
                    <div
                      key={cidade}
                      className="flex items-center gap-3"
                    >
                      <span className="h-2 w-2 rounded-full bg-[#7C9C87]" />

                      <span className="text-xs text-[#EDEDE3]/70">
                        {cidade}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-7 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <section className="rounded-2xl border border-white/[0.075] bg-[#0A1713] p-4 sm:rounded-[26px] sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  Acesso rápido
                </p>

                <h2
                  className="mt-2 text-xl text-[#F0F0E8] sm:text-2xl"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Comece uma operação
                </h2>
              </div>

              <span className="hidden rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1 text-[9px] uppercase tracking-[0.15em] text-[#EDEDE3]/45 sm:block">
                ERN
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-3">
              {atalhos.map((atalho) => (
                <Link
                  key={atalho.titulo}
                  href={atalho.href}
                  className="group flex min-h-[92px] min-w-0 items-start justify-between gap-2 rounded-xl border border-white/[0.065] bg-white/[0.018] p-3 transition hover:border-white/[0.12] hover:bg-white/[0.035] sm:min-h-[110px] sm:rounded-[18px] sm:p-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#EDEDE3]/80">
                      {atalho.titulo}
                    </p>

                    <p className="mt-2 max-w-[200px] text-[11px] leading-5 text-[#EDEDE3]/40">
                      {atalho.descricao}
                    </p>
                  </div>

                  <span className="text-sm text-[#EDEDE3]/30 transition group-hover:translate-x-1 group-hover:text-[#E3A144]">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="relative overflow-hidden rounded-2xl border border-[#E3A144]/18 bg-[#0A1713] p-5 sm:rounded-[26px] sm:p-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border border-[#E3A144]/10" />

            <div className="relative">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                Pesca esportiva
              </p>

              <h2
                className="mt-3 max-w-sm text-2xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Copa Brasil de Pesca Esportiva
              </h2>

              <p className="mt-3 max-w-md text-xs leading-6 text-[#EDEDE3]/48">
                Área preparada para integrar
                informações, destinos e conteúdos
                ligados à pesca esportiva no Rio
                Negro.
              </p>

              <span className="mt-5 inline-flex min-h-10 items-center rounded-xl border border-[#E3A144]/15 bg-[#E3A144]/[0.055] px-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F4C77E]">
                Integração em preparação
              </span>
            </div>
          </section>
        </div>

        <section className="mt-7 min-w-0 overflow-hidden rounded-2xl border border-[#E3A144]/15 bg-[#0A1713] sm:rounded-[26px]">
          <div className="grid min-w-0 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
            <div className="relative min-w-0 border-b border-white/[0.065] p-4 sm:p-5 md:p-6 lg:border-b-0 lg:border-r">
              <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full border border-[#E3A144]/10" />

              <div className="relative">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                    Plano atual
                  </p>

                  {!loadingPlano && plano && (
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${estiloStatusPlano(
                        plano.assinatura_status,
                      )}`}
                    >
                      {nomeStatusPlano(
                        plano.assinatura_status,
                      )}
                    </span>
                  )}
                </div>

                <h2
                  className="mt-3 break-words text-2xl text-[#F0F0E8] sm:mt-4 sm:text-3xl"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  {loadingPlano
                    ? 'Carregando...'
                    : plano?.plano_nome ||
                      'Plano não identificado'}
                </h2>

                <p className="mt-2 max-w-[420px] break-words text-xs leading-5 text-[#EDEDE3]/50 sm:mt-3 sm:leading-6">
                  {loadingPlano
                    ? 'Consultando a assinatura da empresa.'
                    : plano
                      ? `${plano.empresa_nome} está vinculada ao plano ${plano.plano_nome}.`
                      : 'Não foi possível identificar a assinatura desta empresa.'}
                </p>

                {plano && (
                  <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 sm:mt-6">
                    <span className="h-2 w-2 rounded-full bg-[#E3A144]" />

                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#EDEDE3]/45">
                      {plano.plano_codigo}
                    </span>
                  </div>
                )}

                <div className="mt-4 sm:mt-6">
                  <Link
                    href="/planos"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E3A144]/15 bg-[#E3A144]/[0.055] px-4 text-xs font-semibold text-[#F4C77E] transition hover:bg-[#E3A144]/10"
                  >
                    Gerenciar plano
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>

                {erroPlano && (
                  <p className="mt-4 text-xs leading-5 text-red-300/75">
                    {erroPlano}
                  </p>
                )}
              </div>
            </div>

            <div className="min-w-0 p-4 sm:p-5 md:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                    Uso da assinatura
                  </p>

                  <h3
                    className="mt-2 text-xl text-[#F0F0E8]"
                    style={{
                      fontFamily:
                        'var(--font-fraunces), serif',
                    }}
                  >
                    Consumo e limites
                  </h3>
                </div>

                <p className="text-[10px] text-[#EDEDE3]/40">
                  Limites aplicados em tempo real
                </p>
              </div>

              {loadingPlano ? (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3 xl:grid-cols-4">
                  {[
                    'Usuários',
                    'Clientes',
                    'Reservas / mês',
                    'Passeios',
                  ].map((label) => (
                    <div
                      key={label}
                      className="min-w-0 rounded-xl border border-white/[0.065] bg-white/[0.018] p-3 sm:rounded-[18px] sm:p-4"
                    >
                      <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/45">
                        {label}
                      </p>

                      <strong className="mt-2 block text-xl text-[#F0F0E8] sm:text-2xl">
                        —
                      </strong>
                    </div>
                  ))}
                </div>
              ) : situacaoUso ? (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3 xl:grid-cols-4">
                  {cardsUso.map(
                    ({
                      chave,
                      label,
                      situacao,
                    }) => {
                      const percentual =
                        situacao.ilimitado ||
                        situacao.limite ===
                          null ||
                        situacao.limite === 0
                          ? 0
                          : Math.min(
                              100,
                              Math.max(
                                0,
                                (situacao.usado /
                                  situacao.limite) *
                                  100,
                              ),
                            );

                      return (
                        <div
                          key={chave}
                          className={`min-w-0 rounded-xl border p-3 sm:rounded-[18px] sm:p-4 ${
                            situacao.excedido ||
                            situacao.atingido
                              ? 'border-[#E3A144]/20 bg-[#E3A144]/[0.045]'
                              : 'border-white/[0.065] bg-white/[0.018]'
                          }`}
                        >
                          <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/45">
                            {label}
                          </p>

                          <strong
                            className="mt-2 block text-xl font-medium tabular-nums text-[#F0F0E8] sm:text-2xl"
                            style={{
                              fontFamily:
                                'var(--font-fraunces), serif',
                            }}
                          >
                            {situacao.ilimitado
                              ? `${situacao.usado}`
                              : `${situacao.usado} / ${situacao.limite}`}
                          </strong>

                          <p className="mt-1 text-[10px] text-[#EDEDE3]/38">
                            {situacao.ilimitado
                              ? 'Limite ilimitado'
                              : situacao.excedido
                                ? 'Acima do limite atual'
                                : situacao.atingido
                                  ? 'Limite atingido'
                                  : `${situacao.restante ?? 0} restante${
                                      situacao.restante ===
                                      1
                                        ? ''
                                        : 's'
                                    }`}
                          </p>

                          {!situacao.ilimitado &&
                            situacao.limite !==
                              null && (
                              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.055]">
                                <div
                                  className={`h-full rounded-full ${
                                    situacao.atingido ||
                                    percentual >= 80
                                      ? 'bg-[#E3A144]'
                                      : 'bg-emerald-400'
                                  }`}
                                  style={{
                                    width: `${percentual}%`,
                                  }}
                                />
                              </div>
                            )}
                        </div>
                      );
                    },
                  )}
                </div>
              ) : (
                <div className="mt-5 rounded-[18px] border border-white/[0.065] bg-white/[0.018] p-5 text-sm text-[#EDEDE3]/50">
                  Não foi possível carregar o uso
                  da assinatura.
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-white/[0.065] px-4 py-4 sm:px-5 sm:py-5 md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                  Recursos do plano
                </p>

                <p className="mt-1 max-w-[480px] text-xs leading-5 text-[#EDEDE3]/45">
                  Recursos incluídos na assinatura
                  da empresa.
                </p>
              </div>

              <div className="flex max-w-[760px] flex-wrap gap-2">
                {loadingPlano && (
                  <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[10px] text-[#EDEDE3]/45">
                    Carregando recursos...
                  </span>
                )}

                {!loadingPlano &&
                  recursos.map(
                    ([chave, liberado]) => {
                      const recurso =
                        chave as RecursoPlano;

                      const nome =
                        RECURSOS_PLANOS[recurso]
                          ?.nome ?? chave;

                      return (
                        <span
                          key={chave}
                          className={`inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-medium ${
                            liberado
                              ? 'border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-200/80'
                              : 'border-white/[0.07] bg-white/[0.02] text-[#EDEDE3]/40'
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] ${
                              liberado
                                ? 'bg-emerald-400/10 text-emerald-300'
                                : 'bg-white/[0.04] text-[#EDEDE3]/35'
                            }`}
                          >
                            {liberado ? '✓' : '—'}
                          </span>

                          {nome}
                        </span>
                      );
                    },
                  )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-7 overflow-hidden rounded-2xl border border-white/[0.075] bg-[#0A1713] sm:rounded-[26px]">
          <div className="border-b border-white/[0.065] px-4 py-4 sm:px-6 sm:py-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
              Estrutura da operação
            </p>

            <h2
              className="mt-2 text-xl text-[#F0F0E8] sm:text-2xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Gestão conectada
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                label: 'Hospedagens',
                href: '/hospedagens',
              },
              {
                label: 'Embarcações',
                href: '/embarcacoes',
              },
              {
                label: 'Guias',
                href: '/guias',
              },
              {
                label: 'Parceiros',
                href: '/parceiros',
              },
              {
                label: 'Financeiro',
                href: '/financeiro',
              },
            ].map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex min-h-14 items-center justify-between px-4 py-4 transition hover:bg-white/[0.025] sm:px-5 ${
                  index > 0
                    ? 'border-t border-white/[0.055] sm:border-l sm:border-t-0'
                    : ''
                }`}
              >
                <span className="text-sm font-medium text-[#EDEDE3]/58 transition group-hover:text-[#EDEDE3]">
                  {item.label}
                </span>

                <span className="text-xs text-[#EDEDE3]/20 transition group-hover:translate-x-1 group-hover:text-[#E3A144]">
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-6 flex flex-col gap-2 border-t border-white/[0.06] pt-6 text-[10px] text-[#EDEDE3]/38 sm:mt-10 sm:flex-row sm:items-center sm:justify-between">
          <span>
            ERN Gestão — Encantos Rio Negro
          </span>

          <span>
            Operação turística integrada
          </span>
        </div>
      </main>
    </div>
  );
}
'use client';
import '@/app/components/padrao-paginas-eda.css';
import '@/app/components/padrao-formularios-eda.css';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SeletorPeriodoMensalERN } from '@/app/components/PeriodoMensalERN';
import { mesAtualERN, mesValidoERN, rotuloMesERN, type PeriodoMensalERN } from '@/lib/periodoMensalERN';
import PreparacaoFiscalERN, { type ReservaFiscalEDA } from '@/app/components/PreparacaoFiscalERN';
import CadastroFiscalERN from '@/app/components/CadastroFiscalERN';
import HistoricoRevisaoFiscalERN from '@/app/components/HistoricoRevisaoFiscalERN';

type StatusFiscal =
  | 'rascunho'
  | 'validacao_pendente'
  | 'simulada'
  | 'erro_simulacao';

type Solicitacao = {
  id: string;
  reserva_id: string | null;
  ambiente: string;
  status: StatusFiscal;
  valor_servico: number | null;
  criado_em: string;
  cliente?: string | null;
  passeio?: string | null;
};

type Indicadores = {
  total: number;
  rascunho: number;
  pendentes: number;
  simuladas: number;
  erros: number;
  valor_solicitado: number;
  recebido: number;
  recebido_sem_nota: number;
  reservas_sem_nota: number;
};

const VAZIO: Indicadores = {
  total: 0,
  rascunho: 0,
  pendentes: 0,
  simuladas: 0,
  erros: 0,
  valor_solicitado: 0,
  recebido: 0,
  recebido_sem_nota: 0,
  reservas_sem_nota: 0,
};

const STATUS: Record<StatusFiscal, string> = {
  rascunho: 'Rascunho',
  validacao_pendente: 'Em validação',
  simulada: 'Simulada',
  erro_simulacao: 'Falha',
};

const CORES: Record<StatusFiscal, string> = {
  rascunho: '#78908B',
  validacao_pendente: '#E3A144',
  simulada: '#60C7A0',
  erro_simulacao: '#EF827B',
};

const painel =
  'min-w-0 overflow-hidden rounded-2xl border border-[var(--ern-borda)] ' +
  'bg-[var(--ern-painel)] shadow-[0_10px_35px_rgba(0,0,0,0.12)]';

const legenda =
  'text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--ern-destaque)]';

const secundario = 'text-[var(--ern-secundario)]';

function formatarMoeda(valor: number | null): string {
  if (valor === null || !Number.isFinite(valor)) return 'Não informado';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

function formatarData(valor: string): string {
  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) return 'Data indisponível';

  return data.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Manaus',
  });
}

function Icone({
  nome,
  tamanho = 18,
}: {
  nome: 'atividade' | 'arquivo' | 'escudo' | 'atualizar';
  tamanho?: number;
}) {
  const comum = {
    width: tamanho,
    height: tamanho,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };

  if (nome === 'atividade') {
    return (
      <svg {...comum}>
        <path d="M3 12h4l3-7 4 14 3-7h4" />
      </svg>
    );
  }

  if (nome === 'arquivo') {
    return (
      <svg {...comum}>
        <path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        <path d="M14 3v5h5M9 13h6M9 17h6" />
      </svg>
    );
  }

  if (nome === 'escudo') {
    return (
      <svg {...comum}>
        <path d="M12 2 4 6v6c0 5 3 8 8 10 5-2 8-5 8-10V6l-8-4Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

  return (
    <svg {...comum}>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M6 9a7 7 0 0 1 12-2l2 5M4 12l2 5a7 7 0 0 0 12-2" />
    </svg>
  );
}

function CartaoIndicador({
  rotulo,
  valor,
  indice,
  detalhe,
}: {
  rotulo: string;
  valor: number;
  indice: string;
  detalhe: string;
}) {
  return (
    <article className={`${painel} relative p-3.5 sm:p-4`}>
      <div className="absolute left-0 top-5 h-8 w-[2px] rounded-r bg-[var(--ern-botao)]" />

      <div className="flex items-start justify-between gap-2">
        <p className={`text-xs font-medium ${secundario}`}>{rotulo}</p>
        <span className="text-[10px] font-semibold text-[#657571]">
          {indice}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <strong className="text-3xl font-semibold leading-none tracking-tight text-[var(--ern-texto)] tabular-nums sm:text-4xl">
          {valor.toLocaleString('pt-BR')}
        </strong>
        <span className="text-[10px] text-[#71817D]">registros</span>
      </div>

      <div className="mt-3 border-t border-white/[0.07] pt-2.5">
        <p className="text-[11px] text-[#879692]">{detalhe}</p>
      </div>
    </article>
  );
}

export default function PainelFiscalERN() {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [indicadores, setIndicadores] = useState<Indicadores>(VAZIO);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [versao, setVersao] = useState(0);
  // ERN_PERIODO_MENSAL_V1: solicitações do mês atual; histórico a um clique.
  const [periodo, setPeriodo] = useState<PeriodoMensalERN>(mesAtualERN);
  const [reservaFiscalSelecionada, setReservaFiscalSelecionada] = useState('');
  const [reservasFiscais, setReservasFiscais] = useState<ReservaFiscalEDA[] | null>(null);

  const atualizar = useCallback(() => {
    setVersao(atual => atual + 1);
  }, []);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErro('');
      setIndicadores(VAZIO);
      setSolicitacoes([]);
      setReservasFiscais(null);

      try {
        const { data: autenticacao, error: erroAuth } =
          await supabase.auth.getUser();

        if (erroAuth || !autenticacao.user) {
          throw new Error('Entre na conta da operadora para consultar o painel.');
        }

        const { data: perfil, error: erroPerfil } = await supabase
          .from('perfis')
          .select('empresa_id,role')
          .eq('id', autenticacao.user.id)
          .single();

        if (erroPerfil || !perfil?.empresa_id) {
          throw new Error('Não foi possível validar seu vínculo empresarial.');
        }

        if (
          perfil.role !== 'admin_empresa' &&
          perfil.role !== 'financeiro' &&
          perfil.role !== 'admin_plataforma'
        ) {
          throw new Error('Seu perfil não possui acesso à área fiscal.');
        }

        // EDA_PAINEL_FISCAL_V1: uma consulta, já filtrada pelo mês e com permissão validada no banco.
        const { data: painelFiscal, error: erroPainel } = await supabase.rpc('painel_fiscal_eda', {
          p_mes: mesValidoERN(periodo) ? `${periodo}-01` : null,
        });

        if (erroPainel || !painelFiscal) {
          throw new Error(
            erroPainel?.message?.includes('SEM_PERMISSAO')
              ? 'Módulo fiscal indisponível para seu perfil.'
              : 'Não foi possível consultar os indicadores fiscais.',
          );
        }

        if (!ativo) return;

        const dados = painelFiscal as unknown as {
          indicadores: Indicadores;
          solicitacoes: Solicitacao[];
          reservas: ReservaFiscalEDA[];
        };
        const num = (v: unknown) => Number(v) || 0;
        setIndicadores({
          total: num(dados.indicadores.total),
          rascunho: num(dados.indicadores.rascunho),
          pendentes: num(dados.indicadores.pendentes),
          simuladas: num(dados.indicadores.simuladas),
          erros: num(dados.indicadores.erros),
          valor_solicitado: num(dados.indicadores.valor_solicitado),
          recebido: num(dados.indicadores.recebido),
          recebido_sem_nota: num(dados.indicadores.recebido_sem_nota),
          reservas_sem_nota: num(dados.indicadores.reservas_sem_nota),
        });
        setSolicitacoes(dados.solicitacoes ?? []);
        setReservasFiscais(dados.reservas ?? []);
      } catch (falha) {
        if (!ativo) return;

        setErro(
          falha instanceof Error
            ? falha.message
            : 'Não foi possível consultar o painel fiscal.',
        );
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, [versao, periodo]);

  const distribuicao: {
    nome: string;
    status: StatusFiscal;
    valor: number;
  }[] = [
    { nome: 'Simuladas', status: 'simulada', valor: indicadores.simuladas },
    {
      nome: 'Em validação',
      status: 'validacao_pendente',
      valor: indicadores.pendentes,
    },
    { nome: 'Rascunhos', status: 'rascunho', valor: indicadores.rascunho },
    { nome: 'Falhas', status: 'erro_simulacao', valor: indicadores.erros },
  ];

  const cobertura = indicadores.total > 0
    ? (indicadores.simuladas / indicadores.total) * 100
    : null;

  return (
    <main className="eda-pg eda-pg-auto eda-pg-legado min-h-screen px-3 pb-12 pt-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-3.5">
        <header className="flex flex-wrap items-start justify-between gap-4 pb-2 eda-capa eda-capa-auto eda-mg" data-eda-mg="">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={legenda}>EDA / PAINEL FISCAL</span>
              <span className="h-1 w-1 rounded-full bg-[#697B75]" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#81908B]">
                Gestão da operadora
              </span>
            </div>

            <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">
              Painel Fiscal
            </h1>

            <p className={`mt-1 text-xs leading-5 sm:text-sm ${secundario}`}>
              Inteligência operacional e acompanhamento de simulações fiscais.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[var(--ern-destaque)] bg-[var(--ern-botao)]/[0.07] px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--ern-destaque)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--ern-botao)]" />
              Simulação
            </span>

            <Link
              href="/documentos"
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[var(--ern-borda)] bg-[var(--ern-painel)] px-3 text-xs font-medium transition-colors hover:bg-[var(--ern-elevado)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E3A144]"
            >
              <Icone nome="arquivo" tamanho={15} />
              Documentos
            </Link>

            <button
              type="button"
              onClick={atualizar}
              disabled={carregando}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[var(--ern-borda)] bg-[var(--ern-painel)] px-3 text-xs font-medium transition-colors hover:bg-[var(--ern-elevado)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E3A144] disabled:opacity-50"
            >
              <Icone nome="atualizar" tamanho={15} />
              Atualizar
            </button>
          </div>
        </header>

        {erro ? (
          <section role="alert" className={`${painel} border-rose-400/30 p-5`}>
            <p className="text-sm font-semibold">Consulta indisponível</p>
            <p className="mt-2 text-xs text-[var(--ern-erro)]">{erro}</p>
          </section>
        ) : carregando ? (
          <section role="status" className={`${painel} p-6 text-sm ${secundario}`}>
            Consultando os indicadores autorizados da operadora…
          </section>
        ) : (
          <>
            <section aria-label="Indicadores fiscais" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <CartaoIndicador
                indice="01"
                rotulo="Total de simulações"
                valor={indicadores.total}
                detalhe={mesValidoERN(periodo) ? `Em ${rotuloMesERN(periodo)}` : "Histórico da operadora"}
              />
              <CartaoIndicador
                indice="02"
                rotulo="Em validação"
                valor={indicadores.pendentes}
                detalhe="Solicitações pendentes"
              />
              <CartaoIndicador
                indice="03"
                rotulo="Simuladas"
                valor={indicadores.simuladas}
                detalhe="Processadas em simulação"
              />
              <CartaoIndicador
                indice="04"
                rotulo="Falhas"
                valor={indicadores.erros}
                detalhe="Exigem revisão operacional"
              />
            </section>

            <section
              aria-label="Análise fiscal"
              className="grid gap-3 xl:grid-cols-[minmax(0,1.75fr)_minmax(300px,1fr)]"
            >
              <article className={`${painel} p-4 sm:p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={legenda}>Análise operacional</p>
                    <h2 className="mt-2 text-lg font-semibold tracking-tight">
                      Distribuição de solicitações
                    </h2>
                    <p className={`mt-1 text-xs ${secundario}`}>
                      Composição por situação · Dados consolidados
                    </p>
                  </div>
                  <span className="rounded-lg border border-[var(--ern-borda)] px-2.5 py-1.5 text-[10px] text-[#AEBDB7]">
                    Total: {indicadores.total}
                  </span>
                </div>

                <div className="mt-4 grid min-h-[200px] gap-4 sm:grid-cols-[minmax(0,1fr)_175px]">
                  <div className="flex min-w-0 flex-col justify-between">
                    <div
                      aria-label={
                        indicadores.total === 0
                          ? 'Sem registros disponíveis para o gráfico'
                          : 'Gráfico de distribuição das solicitações'
                      }
                      className="relative flex h-[150px] items-end overflow-hidden rounded-xl border border-white/[0.04] bg-[var(--ern-painel)] p-3"
                      style={{
                        backgroundImage:
                          'linear-gradient(to top, rgba(255,255,255,.055) 1px, transparent 1px)',
                        backgroundSize: '100% 25%',
                      }}
                    >
                      {indicadores.total === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
                          <Icone nome="atividade" tamanho={23} />
                          <p className="mt-3 text-xs font-medium text-[#D9E0DA]">
                            Aguardando dados reais
                          </p>
                          <p className="mt-1 text-[11px] text-[var(--ern-secundario)]">
                            Nenhuma simulação foi registrada.
                          </p>
                        </div>
                      ) : (
                        <div className="flex h-full w-full items-end justify-around gap-3">
                          {distribuicao.map(item => {
                            const percentual =
                              (item.valor / indicadores.total) * 100;

                            return (
                              <div
                                key={item.status}
                                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                              >
                                <span className="text-[10px] tabular-nums text-[#B5C1BC]">
                                  {item.valor}
                                </span>
                                <div
                                  className="w-full max-w-16 rounded-t-md"
                                  style={{
                                    height: `${Math.max(percentual, item.valor ? 5 : 0)}%`,
                                    backgroundColor: CORES[item.status],
                                    opacity: 0.9,
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-4 gap-1">
                      {distribuicao.map(item => (
                        <div key={item.status} className="min-w-0 text-center">
                          <span className="block truncate text-[10px] text-[#83948E]">
                            {item.nome}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col justify-center gap-3">
                    {distribuicao.map(item => {
                      const percentual = indicadores.total > 0
                        ? (item.valor / indicadores.total) * 100
                        : 0;

                      return (
                        <div key={item.status}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ backgroundColor: CORES[item.status] }}
                              />
                              <span className="truncate text-[11px] text-[var(--ern-secundario)]">
                                {item.nome}
                              </span>
                            </div>
                            <strong className="text-[11px] font-semibold tabular-nums">
                              {percentual.toFixed(0)}%
                            </strong>
                          </div>
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#303A39]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                backgroundColor: CORES[item.status],
                                width: `${percentual}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </article>

              <article className={`${painel} flex flex-col p-4 sm:p-5`}>
                <p className={legenda}>Indicador executivo</p>
                <h2 className="mt-2 text-lg font-semibold tracking-tight">
                  Eficiência da simulação
                </h2>
                <p className={`mt-1 text-xs ${secundario}`}>
                  Proporção de solicitações simuladas
                </p>

                <div className="flex flex-1 flex-col items-center justify-center py-5">
                  <div
                    className="relative flex h-[164px] w-[164px] items-center justify-center rounded-full"
                    style={{
                      background: cobertura === null
                        ? 'conic-gradient(#323D3B 0% 100%)'
                        : `conic-gradient(#E3A144 ${cobertura}%, #323D3B ${cobertura}% 100%)`,
                    }}
                  >
                    <div className="flex h-[132px] w-[132px] flex-col items-center justify-center rounded-full bg-[var(--ern-painel)]">
                      <span className="text-[30px] font-semibold tabular-nums tracking-tight">
                        {cobertura === null ? '—' : `${cobertura.toFixed(0)}%`}
                      </span>
                      <span className="text-[10px] text-[#8C9C96]">
                        Concluídas
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 text-center text-[11px] text-[var(--ern-secundario)]">
                    {cobertura === null
                      ? 'Sem dados suficientes para calcular'
                      : `${indicadores.simuladas} de ${indicadores.total} solicitações`}
                  </p>
                </div>
              </article>
            </section>

            <CadastroFiscalERN />

            <section aria-label="Conciliação fiscal do período" className={`${painel} p-4 sm:p-5`}>
              <p className={legenda}>Conciliação · {mesValidoERN(periodo) ? rotuloMesERN(periodo) : 'Histórico'}</p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight">Recebido x nota solicitada</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  ['Recebido no período', formatarMoeda(indicadores.recebido), 'Receitas pagas no Financeiro'],
                  ['Valor com solicitação', formatarMoeda(indicadores.valor_solicitado), 'Solicitações do período'],
                  ['Recebido sem nota', formatarMoeda(indicadores.recebido_sem_nota), 'Inclui receitas sem reserva'],
                  ['Reservas sem nota', String(indicadores.reservas_sem_nota), 'Com pagamento e sem solicitação'],
                ].map(([rotulo, valor, detalhe], i) => (
                  <div key={rotulo} className={`rounded-xl border p-3 ${i >= 2 && (i === 2 ? indicadores.recebido_sem_nota : indicadores.reservas_sem_nota) > 0 ? 'border-[#E3A144]/50' : 'border-[var(--ern-borda)]'}`}>
                    <p className="text-[11px] text-[var(--ern-secundario)]">{rotulo}</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{valor}</p>
                    <p className="mt-1 text-[10px] text-[var(--ern-secundario)]">{detalhe}</p>
                  </div>
                ))}
              </div>
            </section>

            <PreparacaoFiscalERN aoAtualizar={atualizar} aoSelecionarReserva={setReservaFiscalSelecionada} reservasPeriodo={reservasFiscais} />

            <HistoricoRevisaoFiscalERN reservaSelecionada={reservaFiscalSelecionada} />

            <section
              aria-label="Atividade e controle fiscal"
              className="grid gap-3 xl:grid-cols-[minmax(0,1.75fr)_minmax(300px,1fr)]"
            >
              <article className={`${painel} p-4 sm:p-5`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className={legenda}>Registro de atividade</p>
                    <h2 className="mt-2 text-lg font-semibold tracking-tight">
                      Solicitações recentes
                    </h2>
                  </div>
                  <span className="rounded-lg border border-[var(--ern-borda)] px-2.5 py-1.5 text-[10px] text-[var(--ern-secundario)]">
                    {mesValidoERN(periodo) ? rotuloMesERN(periodo) : 'Últimos 50 registros'}
                  </span>
                </div>
                <div className="mt-3">
                  <SeletorPeriodoMensalERN valor={periodo} aoMudar={setPeriodo} rotulo="Período das solicitações fiscais" total={solicitacoes.length} />
                </div>

                {solicitacoes.length === 0 ? (
                  <div className="mt-4 flex min-h-[138px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--ern-borda)] bg-[var(--ern-painel)] px-4 text-center">
                    <Icone nome="arquivo" tamanho={22} />
                    <p className="mt-3 text-xs font-medium text-[var(--ern-texto)]">
                      Nenhuma solicitação disponível
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--ern-secundario)]">
                      Os registros fiscais simulados serão exibidos aqui.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-1">
                    {solicitacoes.map(item => (
                      <div
                        key={item.id}
                        className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-white/[0.07] py-3 last:border-0"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: CORES[item.status] ?? '#879692' }}
                            />
                            <span className="text-xs font-semibold">
                              {STATUS[item.status] ?? 'Situação desconhecida'}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-[10px] text-[#8D9D97]">
                            {formatarData(item.criado_em)}
                            {' · '}
                            {item.reserva_id
                              ? [item.cliente, item.passeio].filter(Boolean).join(' · ') || 'Reserva vinculada'
                              : 'Sem reserva vinculada'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold tabular-nums">
                            {formatarMoeda(item.valor_servico)}
                          </p>
                          <span className="text-[10px] text-[#859790]">
                            Sem validade fiscal
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className={`${painel} p-4 sm:p-5`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={legenda}>Segurança e operação</p>
                    <h2 className="mt-2 text-lg font-semibold tracking-tight">
                      Ambiente fiscal
                    </h2>
                  </div>
                  <span className="text-[var(--ern-destaque)]">
                    <Icone nome="escudo" tamanho={23} />
                  </span>
                </div>

                <div className="mt-5 space-y-0">
                  {[
                    ['Ambiente', 'Simulação'],
                    ['Emissão de NFS-e', 'Desativada'],
                    ['Solicitações', String(indicadores.total)],
                    ['Rascunhos', String(indicadores.rascunho)],
                    ['Atividade recente', String(solicitacoes.length)],
                  ].map(([nome, valor]) => (
                    <div
                      key={nome}
                      className="flex items-center justify-between gap-3 border-b border-white/[0.07] py-3 last:border-0"
                    >
                      <span className="text-[11px] text-[var(--ern-secundario)]">{nome}</span>
                      <span className="text-[11px] font-semibold tabular-nums">
                        {valor}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-xl border border-[var(--ern-destaque)] bg-[var(--ern-botao)]/[0.05] p-3">
                  <p className="text-[11px] font-semibold text-[var(--ern-destaque)]">
                    Ambiente protegido
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[#A6B4AE]">
                    Consultas de simulação. Nenhum documento exibido
                    constitui nota fiscal autorizada.
                  </p>
                </div>
              </article>
            </section>
          </>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] pt-4 text-[10px] text-[#71837D]">
          <p>ENCANTOS GESTÃO · Inteligência fiscal</p>
          <p>Dados restritos à operadora · Sem emissão fiscal real</p>
        </footer>
      </div>
    </main>
  );
}

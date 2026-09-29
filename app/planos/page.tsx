'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';

import { supabase } from '@/lib/supabase';

type Ciclo =
  | 'mensal'
  | 'trimestral'
  | 'anual';

type CatalogoRow = {
  plano_id: string;
  codigo: string;
  nome: string;
  descricao: string | null;

  limite_usuarios: number | null;
  limite_clientes: number | null;
  limite_reservas_mes: number | null;
  limite_passeios: number | null;

  recursos:
    | Record<string, boolean>
    | null;

  ciclo_cobranca:
    | Ciclo
    | null;

  valor:
    | number
    | string
    | null;

  moeda:
    | string
    | null;
};

type PlanoAtual = {
  plano_codigo?: string;
  plano_nome?: string;
  assinatura_status?: string;
};

type PlanoAgrupado = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;

  limite_usuarios: number | null;
  limite_clientes: number | null;
  limite_reservas_mes: number | null;
  limite_passeios: number | null;

  recursos: Record<
    string,
    boolean
  >;

  precos: Partial<
    Record<
      Ciclo,
      {
        valor:
          | number
          | null;

        moeda: string;
      }
    >
  >;
};

const CICLOS: {
  codigo: Ciclo;
  nome: string;
  detalhe: string;
}[] = [
  {
    codigo: 'mensal',
    nome: 'Mensal',
    detalhe:
      'Cobrança mês a mês',
  },

  {
    codigo: 'trimestral',
    nome: 'Trimestral',
    detalhe:
      'Cobrança a cada 3 meses',
  },

  {
    codigo: 'anual',
    nome: 'Anual',
    detalhe:
      'Cobrança a cada 12 meses',
  },
];

const RECURSOS_LABELS: Record<
  string,
  string
> = {
  rede_basica:
    'Perfil na Rede Encantos',

  financeiro:
    'Gestão financeira',

  vouchers:
    'Vouchers',

  relatorios:
    'Relatórios',

  whatsapp:
    'Integração com WhatsApp',

  concierge_ia:
    'Concierge com IA',

  destaque_rede:
    'Destaque na Rede Encantos',
};

function numeroOuIlimitado(
  valor: number | null
) {
  if (valor === null) {
    return 'Ilimitado';
  }

  return valor.toLocaleString(
    'pt-BR'
  );
}

function formatarValor(
  valor: number | null,
  moeda = 'BRL'
) {
  if (valor === null) {
    return null;
  }

  return valor.toLocaleString(
    'pt-BR',
    {
      style: 'currency',
      currency: moeda,
    }
  );
}

function nomeCiclo(
  ciclo: Ciclo
) {
  return (
    CICLOS.find(
      (item) =>
        item.codigo === ciclo
    )?.nome ?? ciclo
  );
}

function nomeStatus(
  status?: string
) {
  if (status === 'ativo') {
    return 'Assinatura ativa';
  }

  if (status === 'trial') {
    return 'Período de teste';
  }

  if (status === 'cancelado') {
    return 'Cancelado';
  }

  if (status === 'inativo') {
    return 'Inativo';
  }

  return status || 'Ativo';
}

export default function PlanosPage() {
  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const [
    erro,
    setErro,
  ] = useState<string | null>(
    null
  );

  const [
    catalogo,
    setCatalogo,
  ] = useState<CatalogoRow[]>(
    []
  );

  const [
    planoAtual,
    setPlanoAtual,
  ] = useState<PlanoAtual | null>(
    null
  );

  const [
    ciclo,
    setCiclo,
  ] = useState<Ciclo>(
    'mensal'
  );

  const [
    planoSelecionadoCodigo,
    setPlanoSelecionadoCodigo,
  ] = useState<string | null>(
    null
  );

  const [
    checkoutPlano,
    setCheckoutPlano,
  ] = useState<string | null>(
    null
  );

  const [
    checkoutErro,
    setCheckoutErro,
  ] = useState<string | null>(
    null
  );

  const [
    checkoutMensagem,
    setCheckoutMensagem,
  ] = useState<string | null>(
    null
  );

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setCarregando(true);
    setErro(null);

    try {
      const [
        catalogoResponse,
        planoResponse,
      ] =
        await Promise.all([
          supabase.rpc(
            'get_catalogo_planos'
          ),

          supabase.rpc(
            'get_meu_plano'
          ),
        ]);

      if (
        catalogoResponse.error
      ) {
        throw catalogoResponse.error;
      }

      if (
        planoResponse.error
      ) {
        throw planoResponse.error;
      }

      setCatalogo(
        (
          catalogoResponse.data ??
          []
        ) as CatalogoRow[]
      );

      const plano =
        Array.isArray(
          planoResponse.data
        )
          ? planoResponse.data[0]
          : planoResponse.data;

      setPlanoAtual(
        plano ?? null
      );
    } catch (error: any) {
      console.error(
        'Erro ao carregar planos:',
        error
      );

      setErro(
        error?.message ??
          'Não foi possível carregar os planos.'
      );
    } finally {
      setCarregando(false);
    }
  }

  async function iniciarCheckout(
    planoCodigo: string
  ) {
    if (
      planoCodigo !== 'pro' &&
      planoCodigo !== 'premium'
    ) {
      return;
    }

    setCheckoutPlano(
      planoCodigo
    );

    setCheckoutErro(null);
    setCheckoutMensagem(null);

    try {
      const {
        data:
          sessionData,
        error:
          sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken =
        sessionData.session
          ?.access_token;

      if (!accessToken) {
        throw new Error(
          'Sua sessão expirou. Entre novamente para continuar.'
        );
      }

      const response =
        await fetch(
          '/api/checkout',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                `Bearer ${accessToken}`,
            },

            body:
              JSON.stringify({
                plano:
                  planoCodigo,

                ciclo,
              }),
          }
        );

      const payload =
        await response
          .json()
          .catch(
            () => null
          );

      if (!response.ok) {
        throw new Error(
          payload?.erro ??
            payload?.mensagem ??
            'Não foi possível iniciar a contratação.'
        );
      }

      setCheckoutMensagem(
        payload?.mensagem ??
          'Checkout iniciado com sucesso.'
      );

      await carregarDados();
    } catch (error: any) {
      console.error(
        'Erro ao iniciar checkout:',
        error
      );

      setCheckoutErro(
        error?.message ??
          'Não foi possível iniciar a contratação.'
      );
    } finally {
      setCheckoutPlano(null);
    }
  }

  const planos =
    useMemo(() => {
      const mapa =
        new Map<
          string,
          PlanoAgrupado
        >();

      catalogo.forEach(
        (row) => {
          if (
            !mapa.has(
              row.codigo
            )
          ) {
            mapa.set(
              row.codigo,
              {
                id:
                  row.plano_id,

                codigo:
                  row.codigo,

                nome:
                  row.nome,

                descricao:
                  row.descricao,

                limite_usuarios:
                  row.limite_usuarios,

                limite_clientes:
                  row.limite_clientes,

                limite_reservas_mes:
                  row.limite_reservas_mes,

                limite_passeios:
                  row.limite_passeios,

                recursos:
                  row.recursos ??
                  {},

                precos: {},
              }
            );
          }

          if (
            row.ciclo_cobranca
          ) {
            mapa
              .get(
                row.codigo
              )!
              .precos[
                row.ciclo_cobranca
              ] = {
              valor:
                row.valor ===
                null
                  ? null
                  : Number(
                      row.valor
                    ),

              moeda:
                row.moeda ??
                'BRL',
            };
          }
        }
      );

      return Array.from(
        mapa.values()
      );
    }, [catalogo]);

  const codigoAtual =
    planoAtual?.plano_codigo;

  useEffect(() => {
    if (
      carregando ||
      planos.length === 0 ||
      planoSelecionadoCodigo
    ) {
      return;
    }

    const existePlanoAtual =
      codigoAtual &&
      planos.some(
        (plano) =>
          plano.codigo ===
          codigoAtual
      );

    if (
      existePlanoAtual
    ) {
      setPlanoSelecionadoCodigo(
        codigoAtual
      );

      return;
    }

    setPlanoSelecionadoCodigo(
      planos[0].codigo
    );
  }, [
    carregando,
    planos,
    codigoAtual,
    planoSelecionadoCodigo,
  ]);

  const planoSelecionado =
    useMemo(
      () =>
        planos.find(
          (plano) =>
            plano.codigo ===
            planoSelecionadoCodigo
        ) ?? null,
      [
        planos,
        planoSelecionadoCodigo,
      ]
    );

  const precoSelecionado =
    planoSelecionado
      ?.precos[ciclo];

  const valorSelecionado =
    planoSelecionado
      ? planoSelecionado.codigo ===
        'free'
        ? 'R$ 0'
        : precoSelecionado
          ? formatarValor(
              precoSelecionado.valor,
              precoSelecionado.moeda
            )
          : null
      : null;

  return (
    <div className="min-h-screen bg-[#07110E] pb-20 text-[#EDEDE3]">
      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <section className="border-b border-white/[0.07] bg-[#091510] px-5 py-8 md:px-8 md:py-10">
        <div className="mx-auto max-w-[1180px]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[720px]">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-[#E3A144]" />

                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#E3A144]">
                  ERN Gestão
                </span>
              </div>

              <h1
                className="mt-4 text-3xl leading-tight tracking-[-0.025em] text-[#F0F0E8] md:text-4xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Um plano para cada etapa da operação.
              </h1>

              <p className="mt-3 max-w-[650px] text-sm leading-6 text-[#EDEDE3]/42">
                Compare capacidades, recursos e valores
                para escolher a estrutura adequada à
                evolução da sua operação.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 text-xs font-semibold text-[#EDEDE3]/60 transition hover:border-white/[0.15] hover:bg-white/[0.05] hover:text-[#EDEDE3]/80"
            >
              <span>←</span>
              Voltar ao Dashboard
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1180px] px-5 py-7 md:px-8 md:py-9">
        {/* =====================================================
            PLANO ATUAL
        ====================================================== */}

        {planoAtual && (
          <section className="mb-8 overflow-hidden rounded-[24px] border border-[#E3A144]/18 bg-[#0A1713]">
            <div className="relative flex flex-col gap-5 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
              <div className="pointer-events-none absolute -left-14 -top-20 h-40 w-40 rounded-full border border-[#E3A144]/10" />

              <div className="relative">
                <div className="flex items-center gap-3">
                  <span className="h-px w-9 bg-[#E3A144]" />

                  <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#E3A144]">
                    Plano atual
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <h2
                    className="text-[27px] leading-none tracking-[-0.02em] text-[#F6F2E9] md:text-[30px]"
                    style={{
                      fontFamily:
                        'var(--font-fraunces), serif',
                    }}
                  >
                    {planoAtual.plano_nome ??
                      'Plano atual'}
                  </h2>

                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-300">
                    {nomeStatus(
                      planoAtual.assinatura_status
                    )}
                  </span>
                </div>

                <p className="mt-2 text-xs leading-5 text-[#EDEDE3]/34">
                  Esta é a estrutura atualmente aplicada à sua empresa.
                </p>
              </div>

              <div className="relative flex items-center gap-3 rounded-[16px] border border-[#E3A144]/12 bg-[#E3A144]/[0.035] px-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E3A144]/20 bg-[#E3A144]/10 text-[10px] font-bold text-[#F4C77E]">
                  ERN
                </span>

                <div>
                  <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[#E3A144]">
                    Assinatura
                  </p>

                  <p className="mt-0.5 text-xs font-semibold text-[#F0F0E8]/70">
                    {planoAtual.plano_nome ??
                      'Plano ativo'}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =====================================================
            CICLO DE COBRANÇA
        ====================================================== */}

        <section className="mb-9">
          <div className="mx-auto max-w-[760px]">
            <div className="mb-4 text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#E3A144]">
                Ciclo de cobrança
              </p>

              <h2
                className="mt-2 text-[22px] tracking-[-0.02em] text-[#F0F0E8] md:text-2xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Escolha como deseja contratar
              </h2>

              <p className="mt-1.5 text-[11px] text-[#EDEDE3]/30">
                Os valores dos planos são atualizados
                automaticamente conforme o ciclo selecionado.
              </p>
            </div>

            <div className="rounded-[22px] border border-white/[0.075] bg-[#0A1713] p-2 shadow-[0_14px_40px_rgba(0,0,0,0.2)]">
              <div className="grid grid-cols-3 gap-2">
                {CICLOS.map(
                  (item) => {
                    const ativo =
                      ciclo ===
                      item.codigo;

                    return (
                      <button
                        key={
                          item.codigo
                        }
                        type="button"
                        onClick={() =>
                          setCiclo(
                            item.codigo
                          )
                        }
                        disabled={
                          checkoutPlano !==
                          null
                        }
                        className={`group relative min-h-[66px] rounded-[16px] border px-3 py-3 text-center transition-all duration-200 ${
                          ativo
                            ? 'border-[#E3A144]/65 bg-[#E3A144] text-[#07130F] shadow-[0_8px_25px_rgba(227,161,68,0.22)]'
                            : 'border-transparent bg-transparent text-[#EDEDE3]/42 hover:border-white/[0.065] hover:bg-white/[0.03] hover:text-[#EDEDE3]/75'
                        } ${
                          checkoutPlano
                            ? 'cursor-not-allowed opacity-60'
                            : ''
                        }`}
                      >
                        {ativo && (
                          <span className="absolute left-1/2 top-0 h-[2px] w-10 -translate-x-1/2 rounded-full bg-[#07130F]/55" />
                        )}

                        <span className="block text-[13px] font-bold">
                          {
                            item.nome
                          }
                        </span>

                        <span
                          className={`mt-1 block text-[8px] font-semibold ${
                            ativo
                              ? 'text-[#07130F]/58'
                              : 'text-[#EDEDE3]/19 group-hover:text-[#EDEDE3]/40'
                          }`}
                        >
                          {
                            item.detalhe
                          }
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            MENSAGENS
        ====================================================== */}

        {erro && (
          <div className="mb-6 rounded-[18px] border border-red-400/20 bg-red-400/[0.06] px-5 py-4 text-sm text-red-200">
            {erro}
          </div>
        )}

        {checkoutErro && (
          <div className="mb-6 rounded-[18px] border border-red-400/20 bg-red-400/[0.06] px-5 py-4 text-sm text-red-200">
            {checkoutErro}
          </div>
        )}

        {checkoutMensagem && (
          <div className="mb-6 rounded-[18px] border border-emerald-400/20 bg-emerald-400/[0.06] px-5 py-4 text-sm text-emerald-200">
            {
              checkoutMensagem
            }
          </div>
        )}

        {/* =====================================================
            CARDS DOS PLANOS
        ====================================================== */}

        {carregando ? (
          <div className="rounded-[24px] border border-white/[0.07] bg-[#0A1713] p-10 text-center text-sm text-[#EDEDE3]/35">
            Carregando planos...
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              {planos.map(
                (plano) => {
                  const atual =
                    codigoAtual ===
                    plano.codigo;

                  const selecionado =
                    planoSelecionadoCodigo ===
                    plano.codigo;

                  const preco =
                    plano.precos[
                      ciclo
                    ];

                  const valor =
                    plano.codigo ===
                    'free'
                      ? 'R$ 0'
                      : preco
                        ? formatarValor(
                            preco.valor,
                            preco.moeda
                          )
                        : null;

                  const premium =
                    plano.codigo ===
                    'premium';

                  return (
                    <article
                      key={
                        plano.codigo
                      }
                      role="button"
                      tabIndex={0}
                      aria-pressed={
                        selecionado
                      }
                      onClick={() =>
                        setPlanoSelecionadoCodigo(
                          plano.codigo
                        )
                      }
                      onKeyDown={(
                        event
                      ) => {
                        if (
                          event.key ===
                            'Enter' ||
                          event.key ===
                            ' '
                        ) {
                          event.preventDefault();

                          setPlanoSelecionadoCodigo(
                            plano.codigo
                          );
                        }
                      }}
                      className={`group relative cursor-pointer overflow-hidden rounded-[24px] border outline-none transition-all duration-300 ${
                        selecionado
                          ? 'border-[#E3A144]/75 bg-[#101912] shadow-[0_18px_48px_rgba(0,0,0,0.24)] -translate-y-0.5'
                          : premium
                            ? 'border-[#E3A144]/24 bg-[#0E1712] hover:border-[#E3A144]/42'
                            : atual
                              ? 'border-emerald-400/16 bg-[#0B1814] hover:border-emerald-400/28'
                              : 'border-white/[0.075] bg-[#0A1713] hover:border-white/[0.14]'
                      }`}
                    >
                      <div
                        className={`h-[3px] w-full transition-all duration-300 ${
                          selecionado
                            ? 'bg-[#E3A144]'
                            : atual
                              ? 'bg-emerald-400/45'
                              : 'bg-transparent'
                        }`}
                      />

                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p
                              className={`text-[9px] font-bold uppercase tracking-[0.22em] ${
                                atual
                                  ? 'text-emerald-300/75'
                                  : selecionado
                                    ? 'text-[#E3A144]'
                                    : 'text-[#8AA394]'
                              }`}
                            >
                              {atual
                                ? 'Plano atual'
                                : 'Plano'}
                            </p>

                            <h2
                              className="mt-1.5 text-[27px] leading-none tracking-[-0.02em] text-[#F4F1E9]"
                              style={{
                                fontFamily:
                                  'var(--font-fraunces), serif',
                              }}
                            >
                              {
                                plano.nome
                              }
                            </h2>
                          </div>

                          <div className="flex flex-col items-end gap-1.5">
                            {atual && (
                              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-emerald-300">
                                Ativo
                              </span>
                            )}

                            {selecionado && (
                              <span className="rounded-full border border-[#E3A144]/24 bg-[#E3A144]/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-[#F4C77E]">
                                Selecionado
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="mt-3 min-h-[40px] text-xs leading-5 text-[#EDEDE3]/38">
                          {plano.descricao ||
                            'Plano ERN Gestão.'}
                        </p>

                        <div className="mt-4 flex min-h-[70px] items-center justify-between border-y border-white/[0.055] py-3.5">
                          <div>
                            <strong
                              className="block text-[25px] leading-none tracking-[-0.02em] text-[#F4F1E9]"
                              style={{
                                fontFamily:
                                  'var(--font-fraunces), serif',
                              }}
                            >
                              {valor ??
                                'Preço a definir'}
                            </strong>

                            <span className="mt-1.5 block text-[9px] font-medium text-[#EDEDE3]/26">
                              {plano.codigo ===
                              'free'
                                ? 'Sem cobrança'
                                : nomeCiclo(
                                    ciclo
                                  )}
                            </span>
                          </div>

                          {premium && (
                            <span className="rounded-full border border-[#E3A144]/16 bg-[#E3A144]/[0.055] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-[#E3A144]">
                              Completo
                            </span>
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3.5">
                          <ResumoLimite
                            titulo="Usuários"
                            valor={numeroOuIlimitado(
                              plano.limite_usuarios
                            )}
                          />

                          <ResumoLimite
                            titulo="Clientes"
                            valor={numeroOuIlimitado(
                              plano.limite_clientes
                            )}
                          />

                          <ResumoLimite
                            titulo="Reservas / mês"
                            valor={numeroOuIlimitado(
                              plano.limite_reservas_mes
                            )}
                          />

                          <ResumoLimite
                            titulo="Passeios"
                            valor={numeroOuIlimitado(
                              plano.limite_passeios
                            )}
                          />
                        </div>

                        <div className="mt-4 border-t border-white/[0.055] pt-3.5">
                          <div className="flex items-center justify-center gap-2">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                selecionado
                                  ? 'bg-[#E3A144]'
                                  : 'bg-[#EDEDE3]/20'
                              }`}
                            />

                            <p
                              className={`text-[9px] font-semibold ${
                                selecionado
                                  ? 'text-[#F4C77E]'
                                  : 'text-[#EDEDE3]/24'
                              }`}
                            >
                              {selecionado
                                ? 'Selecionado — detalhes abaixo'
                                : 'Clique para ver detalhes'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>

            {/* =================================================
                DETALHES DO PLANO SELECIONADO
            ================================================= */}

            {planoSelecionado && (
              <section className="mt-7 overflow-hidden rounded-[24px] border border-[#E3A144]/16 bg-[#0A1713] shadow-[0_18px_55px_rgba(0,0,0,0.16)]">
                <div className="flex flex-col gap-5 border-b border-white/[0.06] p-5 md:flex-row md:items-center md:justify-between md:p-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="h-px w-7 bg-[#E3A144]" />

                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#E3A144]">
                        Detalhes do plano
                      </p>

                      {codigoAtual ===
                        planoSelecionado.codigo && (
                        <span className="rounded-full border border-emerald-400/18 bg-emerald-400/[0.07] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.11em] text-emerald-300">
                          Plano atual
                        </span>
                      )}
                    </div>

                    <h2
                      className="mt-2.5 text-[27px] leading-none tracking-[-0.02em] text-[#F4F1E9]"
                      style={{
                        fontFamily:
                          'var(--font-fraunces), serif',
                      }}
                    >
                      {
                        planoSelecionado.nome
                      }
                    </h2>

                    <p className="mt-2.5 max-w-[650px] text-xs leading-6 text-[#EDEDE3]/38">
                      {planoSelecionado.descricao ||
                        'Plano ERN Gestão.'}
                    </p>
                  </div>

                  <div className="rounded-[17px] border border-[#E3A144]/14 bg-[#E3A144]/[0.045] px-5 py-3.5 md:min-w-[205px]">
                    <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#E3A144]">
                      Valor selecionado
                    </p>

                    <strong
                      className="mt-1.5 block text-[23px] leading-none text-[#F4C77E]"
                      style={{
                        fontFamily:
                          'var(--font-fraunces), serif',
                      }}
                    >
                      {valorSelecionado ??
                        'Preço a definir'}
                    </strong>

                    <span className="mt-1.5 block text-[9px] text-[#EDEDE3]/28">
                      {planoSelecionado.codigo ===
                      'free'
                        ? 'Sem cobrança'
                        : nomeCiclo(
                            ciclo
                          )}
                    </span>
                  </div>
                </div>

                <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
                  <div className="border-b border-white/[0.06] p-5 md:p-6 lg:border-b-0 lg:border-r">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#7C9C87]">
                      Capacidade incluída
                    </p>

                    <h3
                      className="mt-1.5 text-lg text-[#F0F0E8]"
                      style={{
                        fontFamily:
                          'var(--font-fraunces), serif',
                      }}
                    >
                      Limites da operação
                    </h3>

                    <div className="mt-4 space-y-2">
                      <DetalheLimite
                        titulo="Usuários"
                        valor={numeroOuIlimitado(
                          planoSelecionado.limite_usuarios
                        )}
                      />

                      <DetalheLimite
                        titulo="Clientes"
                        valor={numeroOuIlimitado(
                          planoSelecionado.limite_clientes
                        )}
                      />

                      <DetalheLimite
                        titulo="Reservas por mês"
                        valor={numeroOuIlimitado(
                          planoSelecionado.limite_reservas_mes
                        )}
                      />

                      <DetalheLimite
                        titulo="Passeios"
                        valor={numeroOuIlimitado(
                          planoSelecionado.limite_passeios
                        )}
                      />
                    </div>
                  </div>

                  <div className="p-5 md:p-6">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#7C9C87]">
                      Recursos do plano
                    </p>

                    <h3
                      className="mt-1.5 text-lg text-[#F0F0E8]"
                      style={{
                        fontFamily:
                          'var(--font-fraunces), serif',
                      }}
                    >
                      O que está incluído
                    </h3>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {Object.entries(
                        RECURSOS_LABELS
                      ).map(
                        ([
                          chave,
                          label,
                        ]) => {
                          const liberado =
                            Boolean(
                              planoSelecionado
                                .recursos[
                                chave
                              ]
                            );

                          return (
                            <div
                              key={
                                chave
                              }
                              className={`flex min-h-[48px] items-center gap-3 rounded-[14px] border px-3 ${
                                liberado
                                  ? 'border-emerald-400/12 bg-emerald-400/[0.035]'
                                  : 'border-white/[0.055] bg-white/[0.012]'
                              }`}
                            >
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] ${
                                  liberado
                                    ? 'bg-emerald-400/[0.1] text-emerald-300'
                                    : 'bg-white/[0.04] text-[#EDEDE3]/18'
                                }`}
                              >
                                {liberado
                                  ? '✓'
                                  : '—'}
                              </span>

                              <span
                                className={`text-[11px] ${
                                  liberado
                                    ? 'text-[#EDEDE3]/62'
                                    : 'text-[#EDEDE3]/23'
                                }`}
                              >
                                {
                                  label
                                }
                              </span>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-white/[0.06] bg-white/[0.012] px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
                  <p className="max-w-[610px] text-[10px] leading-5 text-[#EDEDE3]/28">
                    Selecionar um card apenas exibe os
                    detalhes. Nenhuma cobrança ou alteração
                    de assinatura é realizada sem uma ação
                    explícita.
                  </p>

                  {codigoAtual ===
                  planoSelecionado.codigo ? (
                    <span className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-emerald-400/18 bg-emerald-400/[0.07] px-5 text-xs font-bold text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                      Plano atual
                    </span>
                  ) : planoSelecionado.codigo ===
                    'free' ? (
                    <span className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 text-xs font-semibold text-[#EDEDE3]/30">
                      Plano gratuito
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        iniciarCheckout(
                          planoSelecionado.codigo
                        )
                      }
                      disabled={
                        !precoSelecionado ||
                        precoSelecionado.valor ===
                          null ||
                        checkoutPlano !==
                          null
                      }
                      className={`inline-flex min-h-[42px] min-w-[180px] items-center justify-center rounded-xl px-5 text-xs font-bold transition ${
                        !precoSelecionado ||
                        precoSelecionado.valor ===
                          null ||
                        checkoutPlano !==
                          null
                          ? 'cursor-not-allowed border border-white/[0.07] bg-white/[0.025] text-[#EDEDE3]/25'
                          : planoSelecionado.codigo ===
                              'premium'
                            ? 'bg-[#E3A144] text-[#07130F] shadow-[0_8px_24px_rgba(227,161,68,0.18)] hover:bg-[#F0B35C]'
                            : 'bg-emerald-600 text-white shadow-[0_8px_24px_rgba(5,150,105,0.14)] hover:bg-emerald-500'
                      }`}
                    >
                      {checkoutPlano ===
                      planoSelecionado.codigo
                        ? 'Iniciando checkout...'
                        : `Escolher ${planoSelecionado.nome}`}
                    </button>
                  )}
                </div>
              </section>
            )}
          </>
        )}

        {/* =====================================================
            NOTA FINAL
        ====================================================== */}

        <section className="mt-7 rounded-[20px] border border-white/[0.065] bg-[#0A1713] p-5">
          <div className="flex items-start gap-4">
            <span className="mt-1 h-8 w-[2px] rounded-full bg-[#E3A144]/60" />

            <div>
              <h3
                className="text-lg text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Mude de plano sem perder sua operação.
              </h3>

              <p className="mt-2 max-w-[800px] text-xs leading-6 text-[#EDEDE3]/35">
                Clientes, reservas, passeios e usuários
                permanecem vinculados à empresa. A alteração
                de plano modifica os limites e recursos
                disponíveis.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function ResumoLimite({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div>
      <span className="block text-[8px] font-semibold uppercase tracking-[0.14em] text-[#EDEDE3]/24">
        {titulo}
      </span>

      <strong className="mt-1 block text-[13px] font-semibold text-[#F0F0E8]/85">
        {valor}
      </strong>
    </div>
  );
}

function DetalheLimite({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="flex items-center justify-between gap-5 rounded-[13px] border border-white/[0.055] bg-white/[0.015] px-3 py-2.5 transition hover:bg-white/[0.025]">
      <span className="text-[11px] text-[#EDEDE3]/40">
        {titulo}
      </span>

      <strong className="text-xs font-semibold text-[#F0F0E8]/88">
        {valor}
      </strong>
    </div>
  );
}
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

  limite_usuarios:
    | number
    | null;

  limite_clientes:
    | number
    | null;

  limite_reservas_mes:
    | number
    | null;

  limite_passeios:
    | number
    | null;

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
  status?: string;

  ciclo_cobranca?:
    | Ciclo
    | null;
};

type PlanoAgrupado = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;

  limite_usuarios:
    | number
    | null;

  limite_clientes:
    | number
    | null;

  limite_reservas_mes:
    | number
    | null;

  limite_passeios:
    | number
    | null;

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

export default function PlanosPage() {
  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const [
    erro,
    setErro,
  ] = useState<
    string | null
  >(null);

  const [
    catalogo,
    setCatalogo,
  ] = useState<
    CatalogoRow[]
  >([]);

  const [
    planoAtual,
    setPlanoAtual,
  ] = useState<
    PlanoAtual | null
  >(null);

  const [
    ciclo,
    setCiclo,
  ] = useState<Ciclo>(
    'mensal'
  );

  const [
    checkoutPlano,
    setCheckoutPlano,
  ] = useState<
    string | null
  >(null);

  const [
    checkoutErro,
    setCheckoutErro,
  ] = useState<
    string | null
  >(null);

  const [
    checkoutMensagem,
    setCheckoutMensagem,
  ] = useState<
    string | null
  >(null);

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

      if (
        plano?.ciclo_cobranca
      ) {
        setCiclo(
          plano.ciclo_cobranca
        );
      }
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
      planoCodigo !==
        'pro' &&
      planoCodigo !==
        'premium'
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

  return (
    <div className="min-h-screen bg-[#07110E] pb-20 text-[#EDEDE3]">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <section className="border-b border-white/[0.07] bg-[#091510] px-5 py-12 md:px-8 md:py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[720px]">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-[#E3A144]" />

                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                  ERN Gestão
                </span>
              </div>

              <h1
                className="mt-5 text-4xl leading-tight text-[#F0F0E8] md:text-5xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Um plano para cada
                etapa da operação.
              </h1>

              <p className="mt-5 max-w-[680px] text-sm leading-7 text-[#EDEDE3]/45">
                Comece com a
                estrutura essencial e
                amplie recursos,
                equipe e capacidade
                conforme a sua
                operação turística
                cresce.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.025] px-5 text-sm font-semibold text-[#EDEDE3]/60 transition hover:bg-white/[0.05]"
            >
              ← Voltar ao Dashboard
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1180px] px-5 py-10 md:px-8 md:py-14">
        {/* ===================================================
            STATUS ATUAL
        ==================================================== */}

        {planoAtual && (
          <section className="mb-8 rounded-[22px] border border-[#E3A144]/15 bg-[#E3A144]/[0.045] p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  Sua assinatura
                </p>

                <h2
                  className="mt-2 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  {planoAtual.plano_nome ??
                    'Plano atual'}
                </h2>
              </div>

              <span className="w-fit rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
                {planoAtual.status ??
                  'ativo'}
              </span>
            </div>
          </section>
        )}

        {/* ===================================================
            CICLOS
        ==================================================== */}

        <section className="mb-10">
          <div className="flex flex-wrap gap-2 rounded-[18px] border border-white/[0.07] bg-[#0A1713] p-2">
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
                    className={`min-h-[46px] flex-1 rounded-xl px-4 text-sm font-semibold transition ${
                      ativo
                        ? 'bg-[#E3A144] text-[#07130F]'
                        : 'text-[#EDEDE3]/45 hover:bg-white/[0.04]'
                    } ${
                      checkoutPlano
                        ? 'cursor-not-allowed opacity-60'
                        : ''
                    }`}
                  >
                    <span className="block">
                      {
                        item.nome
                      }
                    </span>

                    <span
                      className={`mt-0.5 block text-[9px] font-medium ${
                        ativo
                          ? 'text-[#07130F]/60'
                          : 'text-[#EDEDE3]/20'
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
        </section>

        {/* ===================================================
            MENSAGENS
        ==================================================== */}

        {erro && (
          <div className="mb-8 rounded-[18px] border border-red-400/20 bg-red-400/[0.06] px-5 py-4 text-sm text-red-200">
            {erro}
          </div>
        )}

        {checkoutErro && (
          <div className="mb-8 rounded-[18px] border border-red-400/20 bg-red-400/[0.06] px-5 py-4 text-sm text-red-200">
            {checkoutErro}
          </div>
        )}

        {checkoutMensagem && (
          <div className="mb-8 rounded-[18px] border border-emerald-400/20 bg-emerald-400/[0.06] px-5 py-4 text-sm text-emerald-200">
            {
              checkoutMensagem
            }
          </div>
        )}

        {/* ===================================================
            PLANOS
        ==================================================== */}

        {carregando ? (
          <div className="rounded-[24px] border border-white/[0.07] bg-[#0A1713] p-12 text-center text-sm text-[#EDEDE3]/35">
            Carregando planos...
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            {planos.map(
              (plano) => {
                const atual =
                  codigoAtual ===
                  plano.codigo;

                const preco =
                  plano.precos[
                    ciclo
                  ];

                const valor =
                  preco
                    ? formatarValor(
                        preco.valor,
                        preco.moeda
                      )
                    : null;

                const premium =
                  plano.codigo ===
                  'premium';

                const pro =
                  plano.codigo ===
                  'pro';

                const processando =
                  checkoutPlano ===
                  plano.codigo;

                const checkoutEmAndamento =
                  checkoutPlano !==
                  null;

                return (
                  <article
                    key={
                      plano.codigo
                    }
                    className={`relative flex flex-col overflow-hidden rounded-[26px] border ${
                      premium
                        ? 'border-[#E3A144]/30 bg-[#101912]'
                        : pro
                          ? 'border-emerald-400/15 bg-[#0B1914]'
                          : 'border-white/[0.075] bg-[#0A1713]'
                    }`}
                  >
                    {premium && (
                      <div className="border-b border-[#E3A144]/15 bg-[#E3A144]/[0.055] px-5 py-2 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-[#E3A144]">
                        Experiência
                        completa
                      </div>
                    )}

                    <div className="flex flex-1 flex-col p-6">
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                              Plano
                            </p>

                            <h2
                              className="mt-2 text-3xl text-[#F0F0E8]"
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

                          {atual && (
                            <span className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-300">
                              Atual
                            </span>
                          )}
                        </div>

                        <p className="mt-4 min-h-[54px] text-sm leading-6 text-[#EDEDE3]/38">
                          {plano.descricao ||
                            'Plano ERN Gestão.'}
                        </p>
                      </div>

                      <div className="mt-7 border-y border-white/[0.06] py-6">
                        {plano.codigo ===
                        'free' ? (
                          <>
                            <p className="text-3xl font-semibold text-[#F0F0E8]">
                              R$ 0
                            </p>

                            <p className="mt-1 text-xs text-[#EDEDE3]/28">
                              Sem cobrança
                            </p>
                          </>
                        ) : valor ? (
                          <>
                            <p className="text-3xl font-semibold text-[#F0F0E8]">
                              {
                                valor
                              }
                            </p>

                            <p className="mt-1 text-xs capitalize text-[#EDEDE3]/28">
                              {
                                ciclo
                              }
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-xl font-semibold text-[#F0F0E8]">
                              Preço a
                              definir
                            </p>

                            <p className="mt-1 text-xs text-[#EDEDE3]/28">
                              {
                                CICLOS.find(
                                  (
                                    item
                                  ) =>
                                    item.codigo ===
                                    ciclo
                                )
                                  ?.nome
                              }
                            </p>
                          </>
                        )}
                      </div>

                      {/* LIMITES */}

                      <div className="mt-6 space-y-3">
                        <ItemLimite
                          titulo="Usuários"
                          valor={numeroOuIlimitado(
                            plano.limite_usuarios
                          )}
                        />

                        <ItemLimite
                          titulo="Clientes"
                          valor={numeroOuIlimitado(
                            plano.limite_clientes
                          )}
                        />

                        <ItemLimite
                          titulo="Reservas / mês"
                          valor={numeroOuIlimitado(
                            plano.limite_reservas_mes
                          )}
                        />

                        <ItemLimite
                          titulo="Passeios"
                          valor={numeroOuIlimitado(
                            plano.limite_passeios
                          )}
                        />
                      </div>

                      {/* RECURSOS */}

                      <div className="mt-7">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-[#EDEDE3]/25">
                          Recursos
                        </p>

                        <div className="mt-4 space-y-3">
                          {Object.entries(
                            RECURSOS_LABELS
                          ).map(
                            ([
                              chave,
                              label,
                            ]) => {
                              const ativo =
                                Boolean(
                                  plano.recursos[
                                    chave
                                  ]
                                );

                              return (
                                <div
                                  key={
                                    chave
                                  }
                                  className="flex items-center gap-3"
                                >
                                  <span
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                                      ativo
                                        ? 'bg-emerald-400/[0.1] text-emerald-300'
                                        : 'bg-white/[0.035] text-[#EDEDE3]/15'
                                    }`}
                                  >
                                    {ativo
                                      ? '✓'
                                      : '—'}
                                  </span>

                                  <span
                                    className={`text-xs ${
                                      ativo
                                        ? 'text-[#EDEDE3]/55'
                                        : 'text-[#EDEDE3]/20'
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

                      {/* CTA */}

                      <div className="mt-auto pt-8">
                        {atual ? (
                          <button
                            type="button"
                            disabled
                            className="min-h-[48px] w-full cursor-default rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] px-5 text-sm font-bold text-emerald-300"
                          >
                            Plano atual
                          </button>
                        ) : plano.codigo ===
                          'free' ? (
                          <button
                            type="button"
                            disabled
                            className="min-h-[48px] w-full cursor-not-allowed rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 text-sm font-semibold text-[#EDEDE3]/25"
                          >
                            Plano
                            gratuito
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              iniciarCheckout(
                                plano.codigo
                              )
                            }
                            disabled={
                              !preco ||
                              preco.valor ===
                                null ||
                              checkoutEmAndamento
                            }
                            className={`min-h-[48px] w-full rounded-xl px-5 text-sm font-bold transition ${
                              !preco ||
                              preco.valor ===
                                null ||
                              checkoutEmAndamento
                                ? 'cursor-not-allowed border border-white/[0.07] bg-white/[0.025] text-[#EDEDE3]/25'
                                : premium
                                  ? 'bg-[#E3A144] text-[#07130F] hover:bg-[#F0B35C]'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
                            }`}
                          >
                            {!preco ||
                            preco.valor ===
                              null
                              ? 'Aguardando preço'
                              : processando
                                ? 'Iniciando checkout...'
                                : `Escolher ${plano.nome}`}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}

        {/* ===================================================
            NOTA
        ==================================================== */}

        <section className="mt-10 rounded-[22px] border border-white/[0.07] bg-[#0A1713] p-6">
          <h3
            className="text-xl text-[#F0F0E8]"
            style={{
              fontFamily:
                'var(--font-fraunces), serif',
            }}
          >
            Upgrade sem perder sua
            operação.
          </h3>

          <p className="mt-3 max-w-[800px] text-sm leading-7 text-[#EDEDE3]/38">
            A mudança de plano não
            precisa recriar clientes,
            reservas, passeios ou
            usuários. A assinatura da
            empresa muda e os novos
            limites e recursos passam a
            ser considerados pela
            plataforma.
          </p>
        </section>
      </main>
    </div>
  );
}

function ItemLimite({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/[0.045] pb-3 last:border-0 last:pb-0">
      <span className="text-xs text-[#EDEDE3]/35">
        {titulo}
      </span>

      <span className="text-xs font-semibold text-[#F0F0E8]/75">
        {valor}
      </span>
    </div>
  );
}
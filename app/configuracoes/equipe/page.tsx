'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';

import { supabase } from '@/lib/supabase';

type Role =
  | 'admin_empresa'
  | 'operador_empresa'
  | 'financeiro'
  | 'guia';

type Membro = {
  id: string;
  nome: string | null;
  email: string | null;
  role: string | null;
  created_at: string;
};

type DadosEquipe = {
  ok: boolean;

  plano: {
    codigo: string;
    nome: string;
    limite_usuarios: number | null;
  };

  uso: {
    total_usuarios: number;
    ilimitado: boolean;
    restante: number | null;
    limite_atingido: boolean;
  };

  membros: Membro[];
};

type Feedback = {
  tipo: 'sucesso' | 'erro';
  texto: string;
};

const ROLE_LABELS: Record<
  string,
  string
> = {
  admin_empresa:
    'Administrador',

  operador_empresa:
    'Operador',

  financeiro:
    'Financeiro',

  guia:
    'Guia',
};

const ROLE_DESCRICOES: Record<
  Role,
  string
> = {
  admin_empresa:
    'Perfil administrativo da empresa.',

  operador_empresa:
    'Perfil para operação cotidiana da plataforma.',

  financeiro:
    'Perfil identificado para atividades financeiras.',

  guia:
    'Perfil identificado para atuação como guia.',
};

function formatarData(
  valor: string
) {
  if (!valor) {
    return '—';
  }

  const data =
    new Date(valor);

  if (
    Number.isNaN(
      data.getTime()
    )
  ) {
    return '—';
  }

  return data.toLocaleDateString(
    'pt-BR'
  );
}

export default function EquipePage() {
  const [
    dados,
    setDados,
  ] =
    useState<DadosEquipe | null>(
      null
    );

  const [
    carregando,
    setCarregando,
  ] =
    useState(true);

  const [
    salvando,
    setSalvando,
  ] =
    useState(false);

  const [
    feedback,
    setFeedback,
  ] =
    useState<Feedback | null>(
      null
    );

  const [
    nome,
    setNome,
  ] =
    useState('');

  const [
    email,
    setEmail,
  ] =
    useState('');

  const [
    role,
    setRole,
  ] =
    useState<Role>(
      'operador_empresa'
    );

  /*
    ============================================================
    AUTENTICAÇÃO
    ============================================================
  */

  const obterToken =
    useCallback(
      async () => {
        const {
          data,
          error,
        } =
          await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        const token =
          data.session
            ?.access_token;

        if (!token) {
          throw new Error(
            'Sua sessão não foi encontrada. Entre novamente para continuar.'
          );
        }

        return token;
      },
      []
    );

  /*
    ============================================================
    CARREGAR EQUIPE
    ============================================================
  */

  const carregarEquipe =
    useCallback(
      async () => {
        setCarregando(true);

        try {
          const token =
            await obterToken();

          const response =
            await fetch(
              '/api/equipe',
              {
                method:
                  'GET',

                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },

                cache:
                  'no-store',
              }
            );

          const json =
            await response
              .json()
              .catch(
                () => null
              );

          if (
            !response.ok
          ) {
            throw new Error(
              json?.erro ??
                'Não foi possível carregar a equipe.'
            );
          }

          setDados(
            json as DadosEquipe
          );
        } catch (
          error: any
        ) {
          console.error(
            'Erro ao carregar equipe:',
            error
          );

          setDados(null);

          setFeedback({
            tipo:
              'erro',

            texto:
              error?.message ??
              'Não foi possível carregar a equipe.',
          });
        } finally {
          setCarregando(
            false
          );
        }
      },
      [obterToken]
    );

  useEffect(() => {
    carregarEquipe();
  }, [carregarEquipe]);

  /*
    ============================================================
    USO DO PLANO
    ============================================================
  */

  const percentual =
    useMemo(() => {
      if (
        !dados ||
        dados.uso.ilimitado ||
        dados.plano
          .limite_usuarios ===
          null
      ) {
        return 0;
      }

      if (
        dados.plano
          .limite_usuarios ===
        0
      ) {
        return 100;
      }

      return Math.min(
        100,
        Math.max(
          0,
          (
            dados.uso
              .total_usuarios /
            dados.plano
              .limite_usuarios
          ) * 100
        )
      );
    }, [dados]);

  const limiteAtingido =
    dados?.uso
      .limite_atingido ??
    false;

  const textoVagas =
    useMemo(() => {
      if (!dados) {
        return '';
      }

      if (
        dados.uso.ilimitado
      ) {
        return 'O plano atual não possui limite numérico de usuários.';
      }

      const restante =
        dados.uso
          .restante ?? 0;

      if (
        restante === 0
      ) {
        return 'Não há vagas disponíveis para novos usuários neste plano.';
      }

      if (
        restante === 1
      ) {
        return '1 vaga disponível para a equipe.';
      }

      return `${restante} vagas disponíveis para a equipe.`;
    }, [dados]);

  /*
    ============================================================
    ADICIONAR MEMBRO
    ============================================================
  */

  const handleAdicionar =
    async (
      e: React.FormEvent
    ) => {
      e.preventDefault();

      setFeedback(null);

      const nomeLimpo =
        nome.trim();

      const emailLimpo =
        email
          .trim()
          .toLowerCase();

      if (
        !nomeLimpo ||
        !emailLimpo
      ) {
        setFeedback({
          tipo:
            'erro',

          texto:
            'Informe nome e e-mail do novo usuário.',
        });

        return;
      }

      if (
        !emailLimpo.includes(
          '@'
        )
      ) {
        setFeedback({
          tipo:
            'erro',

          texto:
            'Informe um e-mail válido.',
        });

        return;
      }

      if (
        limiteAtingido
      ) {
        setFeedback({
          tipo:
            'erro',

          texto:
            'O limite de usuários do plano foi atingido.',
        });

        return;
      }

      setSalvando(true);

      try {
        const token =
          await obterToken();

        const response =
          await fetch(
            '/api/equipe',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify({
                  nome:
                    nomeLimpo,

                  email:
                    emailLimpo,

                  role,
                }),
            }
          );

        const json =
          await response
            .json()
            .catch(
              () => null
            );

        if (
          !response.ok
        ) {
          throw new Error(
            json?.erro ??
              'Não foi possível adicionar o usuário.'
          );
        }

        setNome('');
        setEmail('');

        setRole(
          'operador_empresa'
        );

        setFeedback({
          tipo:
            'sucesso',

          texto:
            json?.mensagem ??
            'Convite enviado com sucesso.',
        });

        await carregarEquipe();
      } catch (
        error: any
      ) {
        console.error(
          'Erro ao adicionar usuário:',
          error
        );

        setFeedback({
          tipo:
            'erro',

          texto:
            error?.message ??
            'Não foi possível adicionar o usuário.',
        });
      } finally {
        setSalvando(false);
      }
    };

  return (
    <div className="min-h-screen bg-[#07110E] pb-16 text-[#EDEDE3]">
      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <section className="border-b border-white/[0.07] bg-[#091510] px-5 py-9 md:px-8 md:py-11">
        <div className="mx-auto max-w-[1180px]">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-[#E3A144]" />

                <span className="text-[10px] font-semibold uppercase tracking-[0.21em] text-[#E3A144]">
                  Configurações
                </span>
              </div>

              <h1
                className="mt-4 text-3xl tracking-[-0.025em] text-[#F0F0E8] md:text-4xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Equipe da empresa
              </h1>

              <p className="mt-3 max-w-[680px] text-sm leading-6 text-[#EDEDE3]/42">
                Gerencie os usuários autorizados a
                acessar e operar a plataforma em nome
                da sua empresa.
              </p>
            </div>

            <Link
              href="/configuracoes"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.025] px-5 text-sm font-semibold text-[#EDEDE3]/65 transition hover:border-white/[0.15] hover:bg-white/[0.05] hover:text-[#EDEDE3]/85"
            >
              <span>←</span>
              Configurações
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1180px] space-y-6 px-5 py-8 md:px-8 md:py-10">
        {/* ===================================================
            FEEDBACK
        ==================================================== */}

        {feedback && (
          <div
            className={`rounded-[18px] border px-5 py-4 text-sm ${
              feedback.tipo ===
              'sucesso'
                ? 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200'
                : 'border-red-400/20 bg-red-400/[0.07] text-red-200'
            }`}
          >
            {feedback.texto}
          </div>
        )}

        {/* ===================================================
            USO DO PLANO
        ==================================================== */}

        <section className="overflow-hidden rounded-[22px] border border-white/[0.075] bg-[#0A1713]">
          {carregando ? (
            <div className="p-6">
              <p className="text-sm text-[#EDEDE3]/45">
                Carregando informações da equipe...
              </p>
            </div>
          ) : dados ? (
            <div className="flex flex-col gap-6 p-5 md:flex-row md:items-center md:justify-between md:p-6">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="h-px w-7 bg-[#E3A144]" />

                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#E3A144]">
                      Uso do plano
                    </span>
                  </div>

                  <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#EDEDE3]/42">
                    {
                      dados.plano
                        .nome
                    }
                  </span>
                </div>

                <h2
                  className="mt-3 text-2xl tracking-[-0.015em] text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  {dados.uso
                    .ilimitado
                    ? `${dados.uso.total_usuarios} usuários`
                    : `${dados.uso.total_usuarios} de ${dados.plano.limite_usuarios ?? 0} usuários`}
                </h2>

                <p className="mt-2 text-xs leading-5 text-[#EDEDE3]/32">
                  {textoVagas}
                </p>
              </div>

              {!dados.uso
                .ilimitado &&
                dados.plano
                  .limite_usuarios !==
                  null && (
                  <div className="w-full max-w-[310px] rounded-[17px] border border-white/[0.06] bg-white/[0.018] p-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-[#EDEDE3]/25">
                          Consumo
                        </p>

                        <strong className="mt-1 block text-xl text-[#F0F0E8]">
                          {
                            dados.uso
                              .total_usuarios
                          }

                          <span className="text-sm font-normal text-[#EDEDE3]/28">
                            {' '}
                            /{' '}
                            {
                              dados
                                .plano
                                .limite_usuarios
                            }
                          </span>
                        </strong>
                      </div>

                      <span
                        className={`text-xs font-bold ${
                          limiteAtingido ||
                          percentual >=
                            80
                            ? 'text-[#F4C77E]'
                            : 'text-emerald-300'
                        }`}
                      >
                        {percentual.toFixed(
                          1
                        )}
                        %
                      </span>
                    </div>

                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.055]">
                      <div
                        className={`h-full rounded-full transition-all ${
                          limiteAtingido ||
                          percentual >=
                            80
                            ? 'bg-[#E3A144]'
                            : 'bg-emerald-400'
                        }`}
                        style={{
                          width:
                            `${percentual}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="p-6">
              <p className="text-sm text-red-300">
                Não foi possível carregar as informações da equipe.
              </p>
            </div>
          )}
        </section>

        {/* ===================================================
            LIMITE ATINGIDO
        ==================================================== */}

        {limiteAtingido && (
          <section className="overflow-hidden rounded-[20px] border border-[#E3A144]/20 bg-[#E3A144]/[0.05]">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.19em] text-[#F4C77E]">
                  Limite atingido
                </p>

                <h2
                  className="mt-2 text-xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Novos acessos estão temporariamente bloqueados.
                </h2>

                <p className="mt-2 max-w-[720px] text-xs leading-6 text-[#EDEDE3]/40">
                  Os usuários existentes continuam
                  vinculados normalmente. Para adicionar
                  outro membro será necessário liberar
                  uma vaga ou ampliar o plano da empresa.
                </p>
              </div>

              <Link
                href="/planos"
                className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#E3A144] px-5 text-xs font-bold text-[#07130F] transition hover:bg-[#F0B35C]"
              >
                Ver planos
                <span>→</span>
              </Link>
            </div>
          </section>
        )}

        {/* ===================================================
            EQUIPE + CONVITE
        ==================================================== */}

        <div className="grid gap-6 lg:grid-cols-[1fr_0.72fr]">
          {/* MEMBROS */}

          <section className="overflow-hidden rounded-[24px] border border-white/[0.075] bg-[#0A1713]">
            <div className="border-b border-white/[0.06] px-5 py-5 md:px-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                    Usuários vinculados
                  </p>

                  <h2
                    className="mt-2 text-2xl text-[#F0F0E8]"
                    style={{
                      fontFamily:
                        'var(--font-fraunces), serif',
                    }}
                  >
                    Equipe atual
                  </h2>
                </div>

                {dados && (
                  <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[9px] font-semibold text-[#EDEDE3]/38">
                    {
                      dados.membros
                        .length
                    }{' '}
                    {dados.membros
                      .length === 1
                      ? 'usuário'
                      : 'usuários'}
                  </span>
                )}
              </div>
            </div>

            <div className="divide-y divide-white/[0.055]">
              {carregando ? (
                <div className="p-6 text-sm text-[#EDEDE3]/35">
                  Carregando...
                </div>
              ) : !dados ||
                dados.membros
                  .length === 0 ? (
                <div className="p-6 text-sm text-[#EDEDE3]/35">
                  Nenhum usuário encontrado.
                </div>
              ) : (
                dados.membros.map(
                  (
                    membro
                  ) => {
                    const label =
                      ROLE_LABELS[
                        membro.role ??
                          ''
                      ] ||
                      membro.role ||
                      'Usuário';

                    return (
                      <div
                        key={
                          membro.id
                        }
                        className="group flex flex-col gap-4 px-5 py-5 transition hover:bg-white/[0.012] sm:flex-row sm:items-center sm:justify-between md:px-6"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.025] text-xs font-bold uppercase text-[#E3A144]">
                              {(
                                membro.nome ||
                                membro.email ||
                                'U'
                              )
                                .trim()
                                .charAt(
                                  0
                                )
                                .toUpperCase()}
                            </span>

                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#F0F0E8]">
                                {membro.nome ||
                                  'Usuário'}
                              </p>

                              <p className="mt-1 truncate text-xs text-[#EDEDE3]/35">
                                {membro.email ||
                                  'E-mail não disponível'}
                              </p>
                            </div>
                          </div>

                          <p className="mt-3 pl-12 text-[9px] text-[#EDEDE3]/20">
                            Vinculado em{' '}
                            {formatarData(
                              membro.created_at
                            )}
                          </p>
                        </div>

                        <span className="w-fit shrink-0 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.11em] text-[#EDEDE3]/50">
                          {label}
                        </span>
                      </div>
                    );
                  }
                )
              )}
            </div>
          </section>

          {/* CONVITE */}

          <section className="overflow-hidden rounded-[24px] border border-white/[0.075] bg-[#0A1713]">
            <div className="border-b border-white/[0.06] px-5 py-5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                Novo acesso
              </p>

              <h2
                className="mt-2 text-xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Convidar usuário
              </h2>

              <p className="mt-2 text-[10px] leading-5 text-[#EDEDE3]/28">
                O convite será vinculado automaticamente à mesma empresa.
              </p>
            </div>

            {limiteAtingido ? (
              <div className="p-5">
                <div className="rounded-[18px] border border-[#E3A144]/20 bg-[#E3A144]/[0.055] p-4">
                  <p className="text-xs font-semibold text-[#F4C77E]">
                    Limite do plano atingido
                  </p>

                  <p className="mt-2 text-xs leading-5 text-[#EDEDE3]/40">
                    Não há vagas disponíveis para novos usuários nesta assinatura.
                  </p>

                  <Link
                    href="/planos"
                    className="mt-4 inline-flex min-h-[38px] items-center justify-center gap-2 rounded-lg border border-[#E3A144]/20 bg-[#E3A144]/10 px-4 text-[11px] font-bold text-[#F4C77E] transition hover:bg-[#E3A144]/15"
                  >
                    Conhecer planos
                    <span>→</span>
                  </Link>
                </div>
              </div>
            ) : (
              <form
                onSubmit={
                  handleAdicionar
                }
                className="space-y-5 p-5"
              >
                {/* NOME */}

                <div>
                  <label
                    htmlFor="nome-membro"
                    className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#EDEDE3]/42"
                  >
                    Nome *
                  </label>

                  <input
                    id="nome-membro"
                    type="text"
                    autoComplete="name"
                    value={
                      nome
                    }
                    onChange={(
                      e
                    ) =>
                      setNome(
                        e.target
                          .value
                      )
                    }
                    disabled={
                      salvando ||
                      carregando
                    }
                    placeholder="Nome do usuário"
                    className="min-h-[46px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
                  />
                </div>

                {/* EMAIL */}

                <div>
                  <label
                    htmlFor="email-membro"
                    className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#EDEDE3]/42"
                  >
                    E-mail *
                  </label>

                  <input
                    id="email-membro"
                    type="email"
                    autoComplete="email"
                    value={
                      email
                    }
                    onChange={(
                      e
                    ) =>
                      setEmail(
                        e.target
                          .value
                      )
                    }
                    disabled={
                      salvando ||
                      carregando
                    }
                    placeholder="usuario@empresa.com"
                    className="min-h-[46px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
                  />
                </div>

                {/* PERFIL */}

                <div>
                  <label
                    htmlFor="role-membro"
                    className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#EDEDE3]/42"
                  >
                    Perfil de acesso
                  </label>

                  <select
                    id="role-membro"
                    value={
                      role
                    }
                    onChange={(
                      e
                    ) =>
                      setRole(
                        e.target
                          .value as Role
                      )
                    }
                    disabled={
                      salvando ||
                      carregando
                    }
                    className="min-h-[46px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition focus:border-[#E3A144]/45 focus:ring-1 focus:ring-[#E3A144]/10 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <option value="operador_empresa">
                      Operador
                    </option>

                    <option value="financeiro">
                      Financeiro
                    </option>

                    <option value="guia">
                      Guia
                    </option>

                    <option value="admin_empresa">
                      Administrador
                    </option>
                  </select>

                  <div className="mt-2 rounded-xl border border-white/[0.055] bg-white/[0.015] px-3 py-2.5">
                    <p className="text-[10px] leading-5 text-[#EDEDE3]/32">
                      {
                        ROLE_DESCRICOES[
                          role
                        ]
                      }
                    </p>
                  </div>
                </div>

                {/* AVISO */}

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[11px] leading-5 text-[#EDEDE3]/35">
                    O novo membro será vinculado automaticamente à empresa e receberá um convite no e-mail informado.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={
                    salvando ||
                    carregando
                  }
                  className="min-h-[46px] w-full rounded-xl bg-[#E3A144] px-5 text-sm font-bold text-[#07130F] shadow-[0_8px_22px_rgba(227,161,68,0.12)] transition hover:bg-[#F0B35C] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {salvando
                    ? 'Enviando convite...'
                    : carregando
                      ? 'Verificando equipe...'
                      : 'Convidar usuário'}
                </button>
              </form>
            )}
          </section>
        </div>

        {/* ===================================================
            SEGURANÇA
        ==================================================== */}

        <section className="rounded-[20px] border border-white/[0.065] bg-[#0A1713] p-5">
          <div className="flex items-start gap-4">
            <span className="mt-1 h-8 w-[2px] shrink-0 rounded-full bg-[#E3A144]/60" />

            <div>
              <h3
                className="text-lg text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                A equipe pertence à empresa.
              </h3>

              <p className="mt-2 max-w-[820px] text-xs leading-6 text-[#EDEDE3]/35">
                Novos usuários são vinculados à mesma empresa do administrador responsável pelo convite. Os limites de usuários são aplicados pela assinatura atual.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
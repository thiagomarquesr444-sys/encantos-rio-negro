'use client';

import {
  type ReactNode,
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';

import { supabase } from '@/lib/supabase';

import {
  planoEstaAtivo,
  possuiRecurso,
  RECURSOS_PLANOS,
  type PlanoAtual,
  type RecursoPlano,
} from '@/lib/plano';

type PlanoGateProps = {
  recurso: RecursoPlano;
  children: ReactNode;
};

type EstadoPlano =
  | { tipo: 'carregando' }
  | { tipo: 'sem_sessao' }
  | { tipo: 'sem_vinculo' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'pronto'; plano: PlanoAtual };

const TEMPO_LIMITE_MS = 15_000;

const BOTAO_BASE =
  'inline-flex min-h-12 items-center justify-center rounded-xl ' +
  'px-5 py-3 text-sm font-semibold transition-colors duration-200 ' +
  'focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-[#E3A144] focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-[#0A1713] motion-reduce:transition-none';

const BOTAO_PRIMARIO =
  `${BOTAO_BASE} bg-[#E3A144] text-[#07130F] hover:bg-[#F0B45F]`;

const BOTAO_SECUNDARIO =
  `${BOTAO_BASE} border border-white/15 text-[#EDEDE3] ` +
  'hover:bg-white/[0.06]';

function ehObjeto(
  valor: unknown,
): valor is Record<string, unknown> {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

function ehTextoPreenchido(valor: unknown): boolean {
  return (
    typeof valor === 'string' &&
    valor.trim().length > 0
  );
}

function ehLimiteValido(valor: unknown): boolean {
  return (
    valor === null ||
    (
      typeof valor === 'number' &&
      Number.isSafeInteger(valor) &&
      valor >= 0
    )
  );
}

function ehPlanoAtual(valor: unknown): valor is PlanoAtual {
  if (!ehObjeto(valor)) {
    return false;
  }

  const camposTexto = [
    'empresa_id',
    'empresa_nome',
    'plano_id',
    'plano_codigo',
    'plano_nome',
    'assinatura_status',
  ];

  if (
    !camposTexto.every((campo) =>
      ehTextoPreenchido(valor[campo]),
    )
  ) {
    return false;
  }

  const camposLimite = [
    'limite_usuarios',
    'limite_clientes',
    'limite_reservas_mes',
    'limite_passeios',
  ];

  if (
    !camposLimite.every((campo) =>
      ehLimiteValido(valor[campo]),
    )
  ) {
    return false;
  }

  const recursos = valor.recursos;

  if (recursos === null) {
    return true;
  }

  if (!ehObjeto(recursos)) {
    return false;
  }

  return Object.keys(RECURSOS_PLANOS).every(
    (recurso) =>
      recursos[recurso] === undefined ||
      typeof recursos[recurso] === 'boolean',
  );
}

function interpretarPlano(resposta: unknown): PlanoAtual | null {
  if (resposta === null) {
    return null;
  }

  let resultado: unknown = resposta;

  if (Array.isArray(resposta)) {
    if (resposta.length === 0) {
      return null;
    }

    if (resposta.length !== 1) {
      throw new Error(
        'Resposta de plano com quantidade inesperada de registros.',
      );
    }

    resultado = resposta[0];
  }

  if (!ehPlanoAtual(resultado)) {
    throw new Error('Resposta de plano com estrutura inválida.');
  }

  return resultado;
}

function SkeletonPlano() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">
        Verificando seu plano e os recursos disponíveis.
      </span>

      <div
        aria-hidden="true"
        className="space-y-7 motion-safe:animate-pulse"
      >
        <div className="h-5 w-32 rounded bg-white/10" />
        <div className="h-10 w-4/5 rounded-lg bg-white/10" />

        <div className="space-y-3">
          <div className="h-4 w-full rounded bg-white/[0.07]" />
          <div className="h-4 w-2/3 rounded bg-white/[0.07]" />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-24 rounded-2xl bg-white/[0.05]"
            />
          ))}
        </div>

        <div className="h-12 w-44 rounded-xl bg-white/10" />
      </div>
    </div>
  );
}

export default function PlanoGate({
  recurso,
  children,
}: PlanoGateProps) {
  const [estado, setEstado] = useState<EstadoPlano>({
    tipo: 'carregando',
  });

  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    let usuarioAtual: string | null | undefined;

    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      if (!ativo || controller.signal.aborted) {
        return;
      }

      controller.abort();

      setEstado({
        tipo: 'erro',
        mensagem:
          'A verificação demorou mais que o esperado. Confira sua conexão e tente novamente.',
      });
    }, TEMPO_LIMITE_MS);

    function invalidarConsulta() {
      controller.abort();
      window.clearTimeout(timeoutId);
    }

    async function carregarPlano() {
      try {
        const { data, error } = await supabase
          .rpc('get_meu_plano')
          .abortSignal(controller.signal);

        if (!ativo || controller.signal.aborted) {
          return;
        }

        if (error) {
          throw error;
        }

        const resposta: unknown = data;
        const plano = interpretarPlano(resposta);

        setEstado(
          plano
            ? { tipo: 'pronto', plano }
            : { tipo: 'sem_vinculo' },
        );
      } catch (erro: unknown) {
        if (!ativo || controller.signal.aborted) {
          return;
        }

        console.error(
          '[PlanoGate] Falha ao consultar assinatura:',
          erro,
        );

        setEstado({
          tipo: 'erro',
          mensagem:
            'Não conseguimos verificar seu acesso agora. Tente novamente em instantes.',
        });
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (!ativo) {
        return;
      }

      const novoUsuario = sessao?.user.id ?? null;

      if (evento === 'INITIAL_SESSION') {
        usuarioAtual = novoUsuario;

        if (!novoUsuario) {
          invalidarConsulta();
          setEstado({ tipo: 'sem_sessao' });
        }

        return;
      }

      if (evento === 'SIGNED_OUT') {
        usuarioAtual = null;
        invalidarConsulta();
        setEstado({ tipo: 'sem_sessao' });
        return;
      }

      if (
        evento === 'SIGNED_IN' &&
        novoUsuario !== usuarioAtual
      ) {
        usuarioAtual = novoUsuario;
        invalidarConsulta();

        setEstado({ tipo: 'carregando' });
        setTentativa((valor) => valor + 1);
      }
    });

    void carregarPlano();

    return () => {
      ativo = false;
      invalidarConsulta();
      subscription.unsubscribe();
    };
  }, [tentativa]);

  function tentarNovamente() {
    setEstado({ tipo: 'carregando' });
    setTentativa((valor) => valor + 1);
  }

  const configuracao = RECURSOS_PLANOS[recurso];

  if (
    estado.tipo === 'pronto' &&
    possuiRecurso(estado.plano, recurso)
  ) {
    return <>{children}</>;
  }

  const plano =
    estado.tipo === 'pronto' ? estado.plano : null;

  const assinaturaInativa =
    plano !== null && !planoEstaAtivo(plano);

  let titulo = '';
  let descricao = '';

  switch (estado.tipo) {
    case 'erro':
      titulo = 'Não foi possível verificar seu acesso.';
      descricao = estado.mensagem;
      break;

    case 'sem_sessao':
      titulo = 'Entre para continuar.';
      descricao =
        'Sua sessão não está disponível. Faça login para acessar os recursos da sua empresa.';
      break;

    case 'sem_vinculo':
      titulo = 'Precisamos verificar o vínculo da sua conta.';
      descricao =
        'Não encontramos uma assinatura acessível para esta conta. Verifique o vínculo com sua empresa.';
      break;

    case 'pronto':
      titulo = assinaturaInativa
        ? 'Sua assinatura não está ativa.'
        : `${configuracao.nome} não está incluído no seu plano.`;

      descricao = assinaturaInativa
        ? 'Consulte os planos para verificar as opções de regularização do acesso.'
        : configuracao.descricao;
      break;

    case 'carregando':
      break;
  }

  return (
    <section className="min-h-[calc(100vh-82px)] bg-[#07110E] px-5 py-10 text-[#EDEDE3] md:px-8 md:py-16">
      <div className="mx-auto max-w-[980px]">
        <div
          key={estado.tipo}
          className="gate-panel relative overflow-hidden rounded-[30px] border border-white/10 bg-[#0A1713] p-6 shadow-xl md:p-10"
        >
          {estado.tipo === 'carregando' ? (
            <SkeletonPlano />
          ) : (
            <>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-[#E3A144]/10"
              />

              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#F4C77E]">
                  Acesso aos recursos
                </p>

                <div
                  role={estado.tipo === 'erro' ? 'alert' : 'status'}
                  aria-live={
                    estado.tipo === 'erro' ? 'assertive' : 'polite'
                  }
                >
                  <h1
                    className="mt-5 max-w-[740px] text-3xl leading-tight tracking-tight text-[#F0F0E8] md:text-5xl"
                    style={{
                      fontFamily: 'var(--font-fraunces), serif',
                    }}
                  >
                    {titulo}
                  </h1>

                  <p className="mt-5 max-w-[680px] text-sm leading-7 text-[#BCC9C0] md:text-base">
                    {descricao}
                  </p>
                </div>

                {plano && (
                  <dl className="mt-8 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                      <dt className="text-xs text-[#A9BCAE]">
                        Plano atual
                      </dt>
                      <dd className="mt-2 text-lg font-semibold">
                        {plano.plano_nome}
                      </dd>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                      <dt className="text-xs text-[#A9BCAE]">
                        Recurso
                      </dt>
                      <dd className="mt-2 text-lg font-semibold">
                        {configuracao.nome}
                      </dd>
                    </div>

                    <div className="rounded-2xl border border-[#E3A144]/20 bg-[#E3A144]/[0.04] p-4">
                      <dt className="text-xs text-[#E3A144]">
                        {assinaturaInativa
                          ? 'Situação do acesso'
                          : 'Plano mínimo'}
                      </dt>
                      <dd className="mt-2 text-lg font-semibold text-[#F4C77E]">
                        {assinaturaInativa
                          ? 'Assinatura inativa'
                          : configuracao.planoMinimo}
                      </dd>
                    </div>
                  </dl>
                )}

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  {estado.tipo === 'sem_sessao' ? (
                    <Link href="/login" className={BOTAO_PRIMARIO}>
                      Fazer login
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={tentarNovamente}
                      className={
                        estado.tipo === 'pronto'
                          ? BOTAO_SECUNDARIO
                          : BOTAO_PRIMARIO
                      }
                    >
                      {estado.tipo === 'pronto'
                        ? 'Atualizar acesso'
                        : 'Tentar novamente'}
                    </button>
                  )}

                  {plano && (
                    <Link href="/planos" className={BOTAO_PRIMARIO}>
                      {assinaturaInativa
                        ? 'Consultar planos'
                        : 'Conhecer planos'}
                    </Link>
                  )}

                  {estado.tipo !== 'sem_sessao' && (
                    <Link
                      href="/dashboard"
                      className={BOTAO_SECUNDARIO}
                    >
                      Voltar ao Dashboard
                    </Link>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes gate-enter {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .gate-panel {
          animation: gate-enter 220ms ease-out both;
        }

        @media (prefers-reduced-motion: reduce) {
          .gate-panel {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
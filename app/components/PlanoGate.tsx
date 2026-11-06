'use client';

import {
  type ReactNode,
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';

import LogoERN from '@/app/components/LogoERN';

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

// EDA_AVISO_PREMIUM_V1: botões e superfícies seguem os tokens --ern-* do tema da gestão.
const BOTAO_PRIMARIO = 'eda-aviso-botao eda-aviso-botao-primario';
const BOTAO_SECUNDARIO = 'eda-aviso-botao';

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
        <div className="h-5 w-32 rounded eda-aviso-esqueleto" />
        <div className="h-10 w-4/5 rounded-lg eda-aviso-esqueleto" />

        <div className="space-y-3">
          <div className="h-4 w-full rounded eda-aviso-esqueleto" />
          <div className="h-4 w-2/3 rounded eda-aviso-esqueleto" />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-24 rounded-2xl eda-aviso-esqueleto"
            />
          ))}
        </div>

        <div className="h-12 w-44 rounded-xl eda-aviso-esqueleto" />
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

  const recursoPro = estado.tipo === 'pronto' && !assinaturaInativa;
  const selo =
    estado.tipo === 'erro' ? 'Verificação de acesso'
    : estado.tipo === 'sem_sessao' ? 'Sessão encerrada'
    : estado.tipo === 'sem_vinculo' ? 'Vínculo da conta'
    : assinaturaInativa ? 'Assinatura'
    : `Recurso ${configuracao.planoMinimo}`;

  return (
    <section className="eda-aviso">
      <div className="eda-aviso-largura">
        <div
          key={estado.tipo}
          className={`eda-aviso-painel ${recursoPro ? 'eda-aviso-pro' : ''}`}
        >
          {estado.tipo === 'carregando' ? (
            <SkeletonPlano />
          ) : (
            <>
              <div aria-hidden="true" className="eda-aviso-halo" />

              <div className="relative">
                <div className="eda-aviso-topo">
                  <LogoERN tamanho={44} />
                  <div>
                    <p className="eda-aviso-kicker">Encantos da Amazônia · Gestão</p>
                    <span className={`eda-aviso-selo ${recursoPro ? 'eda-aviso-selo-pro' : ''} ${estado.tipo === 'erro' ? 'eda-aviso-selo-erro' : ''}`}>
                      {recursoPro && <span aria-hidden="true">✦</span>}
                      {selo}
                    </span>
                  </div>
                </div>

                <div
                  role={estado.tipo === 'erro' ? 'alert' : 'status'}
                  aria-live={estado.tipo === 'erro' ? 'assertive' : 'polite'}
                >
                  <h1 className="eda-aviso-titulo">{titulo}</h1>
                  <p className="eda-aviso-descricao">{descricao}</p>
                </div>

                {plano && (
                  <dl className="eda-aviso-cartoes">
                    <div className="eda-aviso-cartao">
                      <dt>Plano atual</dt>
                      <dd>{plano.plano_nome}</dd>
                    </div>
                    <div className="eda-aviso-cartao">
                      <dt>Recurso</dt>
                      <dd>{configuracao.nome}</dd>
                    </div>
                    <div className="eda-aviso-cartao eda-aviso-cartao-destaque">
                      <dt>{assinaturaInativa ? 'Situação do acesso' : 'Disponível a partir do'}</dt>
                      <dd>{assinaturaInativa ? 'Assinatura inativa' : configuracao.planoMinimo}</dd>
                    </div>
                  </dl>
                )}

                <div className="eda-aviso-acoes">
                  {estado.tipo === 'sem_sessao' ? (
                    <Link href="/login" className={BOTAO_PRIMARIO}>Fazer login</Link>
                  ) : (
                    <button
                      type="button"
                      onClick={tentarNovamente}
                      className={estado.tipo === 'pronto' ? BOTAO_SECUNDARIO : BOTAO_PRIMARIO}
                    >
                      {estado.tipo === 'pronto' ? 'Atualizar acesso' : 'Tentar novamente'}
                    </button>
                  )}

                  {plano && (
                    <Link href="/planos" className={BOTAO_PRIMARIO}>
                      {assinaturaInativa ? 'Regularizar assinatura' : `Conhecer o plano ${configuracao.planoMinimo}`}
                    </Link>
                  )}

                  {estado.tipo !== 'sem_sessao' && (
                    <Link href="/dashboard" className={BOTAO_SECUNDARIO}>Voltar ao início</Link>
                  )}
                </div>

                {recursoPro && (
                  <p className="eda-aviso-rodape">
                    Seus dados continuam salvos. Ao mudar de plano, o recurso é liberado na hora, sem perder nada do que já está cadastrado.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        /* EDA_AVISO_PREMIUM_V1 — padrão premium da gestão (Geist + tokens do tema) */
        .eda-aviso{--a-fundo:var(--ern-fundo,#07110e);--a-painel:var(--ern-painel,#0b1814);--a-elev:var(--ern-elevado,#10231b);--a-texto:var(--ern-texto,#edede3);--a-sec:var(--ern-secundario,#b8c9bf);--a-borda:var(--ern-borda,#355043);--a-ouro:var(--ern-destaque,#f4c77e);--a-botao:var(--ern-botao,#e3a144);--a-sobre:var(--ern-sobre-botao,#07110e);
          min-height:calc(100vh - 82px);display:grid;place-items:center;padding:40px 20px;background:var(--a-fundo);color:var(--a-texto);font-family:var(--font-gestao,var(--font-geist)),system-ui,sans-serif}
        .eda-aviso-largura{width:100%;max-width:880px}
        .eda-aviso-painel{position:relative;overflow:hidden;border-radius:28px;border:1px solid color-mix(in srgb,var(--a-borda) 60%,transparent);background:var(--a-painel);padding:28px;box-shadow:0 24px 60px rgb(0 0 0/22%);animation:eda-aviso-entra 240ms ease-out both}
        @media(min-width:768px){.eda-aviso-painel{padding:44px}}
        .eda-aviso-pro{border-color:color-mix(in srgb,var(--a-ouro) 35%,transparent)}
        .eda-aviso-halo{pointer-events:none;position:absolute;right:-120px;top:-120px;width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--a-ouro) 18%,transparent),transparent 65%)}
        .eda-aviso-topo{display:flex;align-items:center;gap:14px}
        .eda-aviso-kicker{margin:0 0 6px;font-size:10px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--a-sec)}
        .eda-aviso-selo{display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:999px;border:1px solid var(--a-borda);background:var(--a-elev);font-size:11px;font-weight:600;color:var(--a-texto)}
        .eda-aviso-selo-pro{border-color:transparent;background:linear-gradient(180deg,#f7d595,#e3a144);color:#07110e}
        .eda-aviso-selo-erro{border-color:var(--ern-erro,#fecaca);color:var(--ern-erro,#fecaca)}
        .eda-aviso-titulo{margin:28px 0 0;max-width:720px;font-size:clamp(28px,4.4vw,44px);line-height:1.08;font-weight:650;letter-spacing:-.03em;color:var(--a-texto)}
        .eda-aviso-descricao{margin:16px 0 0;max-width:640px;font-size:15px;line-height:1.75;color:var(--a-sec)}
        .eda-aviso-cartoes{margin:30px 0 0;display:grid;gap:12px}
        @media(min-width:640px){.eda-aviso-cartoes{grid-template-columns:repeat(3,1fr)}}
        .eda-aviso-cartao{border-radius:18px;border:1px solid color-mix(in srgb,var(--a-borda) 55%,transparent);background:var(--a-elev);padding:16px}
        .eda-aviso-cartao dt{font-size:11px;color:var(--a-sec)}
        .eda-aviso-cartao dd{margin:6px 0 0;font-size:17px;font-weight:600;color:var(--a-texto);font-variant-numeric:tabular-nums}
        .eda-aviso-cartao-destaque{border-color:color-mix(in srgb,var(--a-ouro) 40%,transparent);background:color-mix(in srgb,var(--a-ouro) 8%,var(--a-elev))}
        .eda-aviso-cartao-destaque :is(dt,dd){color:var(--a-ouro)}
        .eda-aviso-acoes{margin-top:30px;display:flex;flex-direction:column;gap:10px}
        @media(min-width:640px){.eda-aviso-acoes{flex-direction:row;flex-wrap:wrap}}
        .eda-aviso-botao{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:0 22px;border-radius:999px;border:1px solid var(--a-borda);background:var(--a-elev);color:var(--a-texto);font-size:14px;font-weight:600;font-family:inherit;cursor:pointer;transition:border-color .15s,transform .15s,filter .15s}
        .eda-aviso-botao:hover{border-color:var(--a-botao)}
        .eda-aviso-botao:focus-visible{outline:2px solid var(--a-botao);outline-offset:3px}
        .eda-aviso-botao-primario{border-color:transparent;background:var(--a-botao);color:var(--a-sobre)}
        .ern-gestao:not([data-ern-tema="amarelo"]):not([data-ern-tema="branco"]):not([data-ern-tema="azul"]) .eda-aviso-botao-primario{background:linear-gradient(180deg,#f7d595,#e3a144);color:#07110e;box-shadow:inset 0 1px 0 rgb(255 255 255/55%)}
        .eda-aviso-botao-primario:hover{filter:brightness(1.05);transform:translateY(-1px)}
        .eda-aviso-rodape{margin:24px 0 0;padding-top:18px;border-top:1px solid color-mix(in srgb,var(--a-borda) 45%,transparent);font-size:12px;line-height:1.7;color:var(--a-sec)}
        .eda-aviso-esqueleto{background:color-mix(in srgb,var(--a-texto) 9%,transparent)}
        @keyframes eda-aviso-entra{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @media(prefers-reduced-motion:reduce){.eda-aviso-painel{animation:none}.eda-aviso-botao{transition:none}.eda-aviso-botao-primario:hover{transform:none}}
      `}</style>
    </section>
  );
}

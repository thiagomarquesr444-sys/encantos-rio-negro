'use client';

import {
  Suspense,
  useEffect,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { supabase } from '@/lib/supabase';
import {
  carregarAcessosConta,
  contaPossuiAcesso,
  escolherAcessoDisponivel,
  interpretarTipoAcesso,
  type AcessosConta,
  type TipoAcesso,
  type TipoAcessoProfissional,
} from '@/lib/acessos';

const opcoes: {
  tipo: TipoAcesso;
  titulo: string;
  descricao: string;
  destino: string;
}[] = [
  {
    tipo: 'operadora',
    titulo: 'Gestão da operadora',
    descricao:
      'Clientes, reservas e operação da empresa à qual sua conta está vinculada.',
    destino: '/dashboard',
  },
  {
    tipo: 'guia',
    titulo: 'Guia ERN',
    descricao:
      'Seu espaço individual como guia, separado dos cadastros internos das operadoras.',
    destino: '/guia',
  },
  {
    tipo: 'fornecedor',
    titulo: 'Fornecedor',
    descricao:
      'Seu espaço profissional para produtos e serviços relacionados à sua atividade.',
    destino: '/fornecedor',
  },
];

function ConteudoAcesso() {
  const searchParams = useSearchParams();

  const solicitado = interpretarTipoAcesso(
    searchParams.get('acesso')
  );

  const linkLogin = solicitado
    ? `/login?acesso=${solicitado}`
    : '/login';

  const [conta, setConta] = useState<AcessosConta | null>(
    null
  );
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState<
    TipoAcesso | 'sair' | null
  >(null);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const ocupado = useRef(false);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const dados = await carregarAcessosConta();

        if (ativo) {
          setConta(dados);
        }
      } catch (error) {
        if (ativo) {
          setErro(
            error instanceof Error
              ? error.message
              : 'Não foi possível consultar seus acessos.'
          );
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, []);

  const recomendado = conta
    ? escolherAcessoDisponivel(conta, solicitado)
    : null;

  const bloqueado = processando !== null;

  async function conferirContaAtual() {
    if (!conta) {
      throw new Error('Entre novamente para continuar.');
    }

    const atual = await carregarAcessosConta();

    if (atual.usuario_id !== conta.usuario_id) {
      throw new Error(
        'A conta conectada mudou. Recarregue a página antes de continuar.'
      );
    }

    return atual;
  }

  async function entrar(tipo: TipoAcesso) {
    if (ocupado.current || !conta) return;

    ocupado.current = true;
    setProcessando(tipo);
    setErro('');
    setSucesso('');

    let navegando = false;

    try {
      const atual = await conferirContaAtual();

      setConta(atual);

      if (!contaPossuiAcesso(atual, tipo)) {
        throw new Error(
          'Esse acesso não está disponível para sua conta.'
        );
      }

      const opcao = opcoes.find(
        (item) => item.tipo === tipo
      );

      if (!opcao) {
        throw new Error('Acesso não reconhecido.');
      }

      window.location.assign(opcao.destino);
      navegando = true;
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível abrir esse acesso.'
      );
    } finally {
      if (!navegando) {
        ocupado.current = false;
        setProcessando(null);
      }
    }
  }

  async function ativar(
    tipo: TipoAcessoProfissional
  ) {
    if (ocupado.current || !conta) return;

    ocupado.current = true;
    setProcessando(tipo);
    setErro('');
    setSucesso('');

    try {
      const atual = await conferirContaAtual();

      if (!contaPossuiAcesso(atual, tipo)) {
        // O banco preenche usuario_id com auth.uid().
        // Não altera perfis, empresa ou guias.
        const { error } = await supabase
          .from('acessos_profissionais')
          .insert({ tipo });

        // Uma adesão simultânea em outra aba pode
        // produzir conflito de chave. Confirmamos
        // o resultado consultando o banco novamente.
        if (error && error.code !== '23505') {
          throw new Error(
            'Não foi possível ativar o acesso. Tente novamente.'
          );
        }
      }

      const atualizada = await conferirContaAtual();

      if (!contaPossuiAcesso(atualizada, tipo)) {
        throw new Error(
          'Não foi possível confirmar a ativação. Atualize a página para consultar seus acessos.'
        );
      }

      setConta(atualizada);

      setSucesso(
        tipo === 'guia'
          ? 'Acesso de guia ativado. Clique em “Entrar” para continuar seu cadastro profissional.'
          : 'Acesso de fornecedor ativado. Clique em “Entrar” para continuar seu cadastro profissional.'
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível concluir a ativação.'
      );
    } finally {
      ocupado.current = false;
      setProcessando(null);
    }
  }

  async function sair() {
    if (ocupado.current) return;

    ocupado.current = true;
    setProcessando('sair');
    setErro('');
    setSucesso('');

    let navegando = false;

    try {
      const { error } = await supabase.auth.signOut({
        scope: 'local',
      });

      if (error) {
        throw new Error(
          'Não foi possível sair. Tente novamente.'
        );
      }

      setConta(null);
      window.location.assign(linkLogin);
      navegando = true;
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível encerrar a sessão.'
      );
    } finally {
      if (!navegando) {
        ocupado.current = false;
        setProcessando(null);
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#07110E] px-5 py-10 text-[#EDEDE3] md:px-8 md:py-14">
      <div className="mx-auto max-w-[1100px]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-2 text-sm text-[#EDEDE3]/60 transition hover:text-[#E3A144]"
          >
            <span aria-hidden="true">←</span>
            Portal público
          </Link>

          {conta && (
            <button
              type="button"
              disabled={bloqueado}
              onClick={() => void sair()}
              className="min-h-[44px] rounded-xl border border-white/10 px-4 text-sm text-[#EDEDE3]/65 transition hover:bg-white/[0.04] disabled:opacity-50"
            >
              {processando === 'sair'
                ? 'Saindo...'
                : 'Sair da conta'}
            </button>
          )}
        </div>

        <header className="mt-9">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
            Encantos Rio Negro
          </p>

          <h1
            className="mt-4 text-3xl leading-tight text-[#F0F0E8] md:text-4xl"
            style={{
              fontFamily:
                'var(--font-fraunces), serif',
            }}
          >
            Seus acessos
          </h1>

          <p className="mt-4 max-w-[720px] text-sm leading-7 text-[#EDEDE3]/55">
            Escolha o espaço que deseja utilizar.
            Uma mesma conta pode atuar em mais de uma
            atividade.
          </p>

          {conta?.email && (
            <p className="mt-3 break-all text-xs text-[#EDEDE3]/40">
              Conta conectada: {conta.email}
            </p>
          )}
        </header>

        {erro && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-500/25 bg-red-500/[0.08] p-4 text-sm text-red-300"
          >
            {erro}
          </div>
        )}

        {sucesso && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] p-4 text-sm text-emerald-300"
          >
            {sucesso}
          </div>
        )}

        {carregando ? (
          <div
            role="status"
            className="mt-8 rounded-2xl border border-white/[0.08] bg-[#0D1B16] p-6 text-sm text-[#EDEDE3]/55"
          >
            Consultando seus acessos...
          </div>
        ) : !conta ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[48px] rounded-xl border border-white/10 px-5 text-sm font-semibold text-[#EDEDE3]/70"
            >
              Tentar novamente
            </button>

            <Link
              href={linkLogin}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#E3A144] px-5 text-sm font-bold text-[#07130F]"
            >
              Ir para o login
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {opcoes.map((opcao) => {
                const disponivel = contaPossuiAcesso(
                  conta,
                  opcao.tipo
                );

                const destaque =
                  opcao.tipo === solicitado ||
                  opcao.tipo === recomendado;

                const trabalhando =
                  processando === opcao.tipo;

                return (
                  <article
                    key={opcao.tipo}
                    className={`flex min-w-0 flex-col rounded-[24px] border bg-[#0D1B16] p-5 md:p-6 ${
                      destaque
                        ? 'border-[#E3A144]/45'
                        : 'border-white/[0.08]'
                    }`}
                  >
                    <span
                      className={`self-start rounded-full px-3 py-1 text-[10px] font-semibold ${
                        disponivel
                          ? 'bg-emerald-500/10 text-emerald-300'
                          : 'bg-white/[0.04] text-[#EDEDE3]/50'
                      }`}
                    >
                      {disponivel
                        ? 'Acesso disponível'
                        : opcao.tipo === 'operadora'
                          ? 'Vínculo necessário'
                          : 'Adesão disponível'}
                    </span>

                    <h2
                      className="mt-5 text-2xl text-[#F0F0E8]"
                      style={{
                        fontFamily:
                          'var(--font-fraunces), serif',
                      }}
                    >
                      {opcao.titulo}
                    </h2>

                    <p className="mt-3 flex-1 text-sm leading-7 text-[#EDEDE3]/55">
                      {opcao.descricao}
                    </p>

                    {disponivel ? (
                      <button
                        type="button"
                        disabled={bloqueado}
                        onClick={() =>
                          void entrar(opcao.tipo)
                        }
                        className="mt-6 min-h-[48px] rounded-xl bg-[#E3A144] px-4 py-3 text-sm font-bold text-[#07130F] transition hover:bg-[#F0B35C] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {trabalhando
                          ? 'Verificando...'
                          : 'Entrar'}
                      </button>
                    ) : opcao.tipo === 'operadora' ? (
                      <p className="mt-6 rounded-xl border border-white/[0.07] p-3 text-xs leading-6 text-[#EDEDE3]/45">
                        Sua conta ainda não tem um vínculo
                        empresarial habilitado. Se você
                        integra uma operadora existente,
                        solicite um convite ao administrador.
                      </p>
                    ) : (
                      <button
                        type="button"
                        disabled={bloqueado}
                        onClick={() => {
                          if (
                            opcao.tipo === 'guia' ||
                            opcao.tipo === 'fornecedor'
                          ) {
                            void ativar(opcao.tipo);
                          }
                        }}
                        className="mt-6 min-h-[48px] rounded-xl border border-[#E3A144]/35 bg-[#E3A144]/10 px-4 py-3 text-sm font-semibold text-[#F4C77E] transition hover:bg-[#E3A144]/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {trabalhando
                          ? 'Ativando...'
                          : 'Ativar acesso'}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>

            <p className="mt-6 max-w-[800px] text-xs leading-6 text-[#EDEDE3]/45">
              Ativar o acesso de guia ou fornecedor inicia
              sua adesão a esse espaço. Isso não publica
              seu perfil, não representa verificação
              profissional pela ERN e não concede acesso
              aos dados das operadoras.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AcessoPage() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          className="flex min-h-screen items-center justify-center bg-[#07110E] px-5 text-sm text-[#EDEDE3]/60"
        >
          Carregando seus acessos...
        </div>
      }
    >
      <ConteudoAcesso />
    </Suspense>
  );
}
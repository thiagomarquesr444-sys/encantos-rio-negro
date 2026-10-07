'use client';

import {
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';

import {
  carregarAcessosConta,
  contaPossuiAcesso,
  type TipoAcessoProfissional,
} from '@/lib/acessos';

import { supabase } from '@/lib/supabase';

type PainelProfissionalProps = {
  tipo: TipoAcessoProfissional;
};

type PerfilResumo = {
  nome: string;
  cidade: string | null;
};

type Cartao = {
  titulo: string;
  descricao: string;
  href?: string;
  status?: string;
};

const FOCO =
  'focus-visible:outline-2 focus-visible:outline-offset-4 ' +
  'focus-visible:outline-[#E3A144]';

function configuracao(
  tipo: TipoAcessoProfissional,
) {
  if (tipo === 'guia') {
    return {
      etiqueta: 'Guia independente',
      titulo: 'Painel do Guia',
      introducao:
        'Organize sua presença profissional, acompanhe oportunidades e prepare sua participação na Rede ERN.',
      perfilHref: '/guia/perfil',

      cartoes: [
        {
          titulo: 'Meu perfil',
          descricao:
            'Mantenha seus dados profissionais, idiomas, CADASTUR e região de atuação atualizados.',
          href: '/guia/perfil',
        },
        {
          titulo: 'Oportunidades',
          descricao:
            'Encontre demandas compatíveis com sua atuação e futuras oportunidades de trabalho.',
          status: 'Próximo módulo',
        },
        {
          titulo: 'Disponibilidade',
          descricao:
            'Informe períodos, regiões e tipos de atividade em que você estará disponível.',
          status: 'Próximo módulo',
        },
        {
          titulo: 'Serviços e experiências',
          descricao:
            'Organize os serviços, roteiros e experiências que você poderá oferecer dentro da rede.',
          status: 'Em preparação',
        },
        {
          titulo: 'Minhas publicações',
          descricao:
            'Gerencie viagens, experiências e conteúdos que poderão aparecer no feed público da ERN.',
          status: 'Em preparação',
        },
        {
          titulo: 'Demandas da rede',
          descricao:
            'Acompanhe necessidades publicadas por operadoras e parceiros do ecossistema.',
          status: 'Em preparação',
        },
      ] satisfies Cartao[],
    };
  }

  return {
    etiqueta: 'Fornecedor independente',
    titulo: 'Painel do Fornecedor',
    introducao:
      'Apresente seu negócio, organize sua oferta e acompanhe demandas geradas pelo turismo e pela Rede ERN.',
    perfilHref: '/fornecedor/perfil',

    cartoes: [
      {
        titulo: 'Meu perfil',
        descricao:
          'Mantenha seus dados comerciais, atividade principal e região de atendimento atualizados.',
        href: '/fornecedor/perfil',
      },
      {
        titulo: 'Demandas',
        descricao:
          'Acompanhe necessidades de operadoras, guias e futuros parceiros da Rede ERN.',
        status: 'Próximo módulo',
      },
      {
        titulo: 'Minha oferta',
        descricao:
          'Cadastre produtos, serviços, disponibilidade e capacidade de atendimento.',
        status: 'Próximo módulo',
      },
      {
        titulo: 'Produtos e serviços',
        descricao:
          'Organize o catálogo comercial que poderá ser apresentado aos parceiros da rede.',
        status: 'Em preparação',
      },
      {
        titulo: 'Minhas publicações',
        descricao:
          'Gerencie conteúdos, produtos e serviços que poderão alimentar o feed público da ERN.',
        status: 'Em preparação',
      },
      {
        titulo: 'Oportunidades',
        descricao:
          'Identifique possibilidades de negócio geradas pela atividade turística regional.',
        status: 'Em preparação',
      },
    ] satisfies Cartao[],
  };
}

export default function PainelProfissional({
  tipo,
}: PainelProfissionalProps) {
  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] =
    useState('');

  const [perfil, setPerfil] =
    useState<PerfilResumo | null>(
      null,
    );

  const dados =
    configuracao(tipo);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErro('');
      setPerfil(null);

      try {
        const conta =
          await carregarAcessosConta();

        if (
          conta.empresa_id ||
          contaPossuiAcesso(
            conta,
            'operadora',
          )
        ) {
          throw new Error(
            'Esta conta pertence a uma operadora e não pode utilizar esta área profissional independente.',
          );
        }

        const modalidades =
          conta.acessos.filter(
            (acesso) =>
              acesso === 'guia' ||
              acesso ===
                'fornecedor',
          );

        if (
          modalidades.length !== 1 ||
          modalidades[0] !== tipo
        ) {
          throw new Error(
            'Esta área não corresponde à modalidade vinculada à sua conta.',
          );
        }

        const {
          data,
          error,
        } = await supabase
          .from(
            'perfis_profissionais',
          )
          .select('nome,cidade')
          .eq(
            'usuario_id',
            conta.usuario_id,
          )
          .eq('tipo', tipo)
          .maybeSingle();

        if (error) {
          throw new Error(
            'Não foi possível carregar os dados do seu painel.',
          );
        }

        if (!ativo) {
          return;
        }

        setPerfil(data);
      } catch (error) {
        if (!ativo) {
          return;
        }

        setErro(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar seu painel.',
        );
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
  }, [tipo]);

  if (carregando) {
    return (
      <main className="min-h-[calc(100dvh-82px)] bg-[#07110E] px-4 py-8 text-[#EDEDE3] sm:px-6">
        <div className="mx-auto max-w-[1200px]">
          <div
            role="status"
            className="rounded-3xl border border-white/10 bg-[#0D1B16] p-6 text-sm text-[#EDEDE3]/75"
          >
            Carregando seu painel...
          </div>
        </div>
      </main>
    );
  }

  if (erro) {
    return (
      <main className="min-h-[calc(100dvh-82px)] bg-[#07110E] px-4 py-8 text-[#EDEDE3] sm:px-6">
        <div className="mx-auto max-w-[900px]">
          <section className="rounded-3xl border border-red-400/20 bg-[#0D1B16] p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-300">
              Acesso não liberado
            </p>

            <h1
              className="mt-3 text-2xl text-[#F0F0E8]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Não foi possível abrir esta área
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#EDEDE3]/75">
              {erro}
            </p>

            <Link
              href={`/acesso?acesso=${tipo}`}
              className={`mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#E3A144] px-5 text-sm font-bold text-[#07130F] transition-colors hover:bg-[#F0B35C] ${FOCO}`}
            >
              Conferir meu acesso
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const nome =
    perfil?.nome?.trim() ||
    (
      tipo === 'guia'
        ? 'Guia da Rede ERN'
        : 'Fornecedor da Rede ERN'
    );

  return (
    <main className="min-h-[calc(100dvh-82px)] bg-[#07110E] px-4 py-7 text-[#EDEDE3] sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[1200px]">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0D1B16]">
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  {dados.etiqueta}
                </p>

                <h1
                  className="mt-3 break-words text-3xl leading-tight text-[#F0F0E8] sm:text-4xl"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  {dados.titulo}
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-[#EDEDE3]/75 sm:text-base">
                  {dados.introducao}
                </p>
              </div>

              <Link
                href={dados.perfilHref}
                className={`inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-[#E3A144] px-5 text-sm font-bold text-[#07130F] transition-colors hover:bg-[#F0B35C] ${FOCO}`}
              >
                Editar meu perfil
              </Link>
            </div>
          </div>

          <div className="border-t border-white/10 bg-white/[0.025] px-6 py-5 sm:px-8 lg:px-10">
            <p className="text-xs uppercase tracking-[0.16em] text-[#A8BCAF]">
              Conta conectada
            </p>

            <p className="mt-2 break-words text-lg font-semibold text-[#F0F0E8]">
              {nome}
            </p>

            {perfil?.cidade && (
              <p className="mt-1 text-sm text-[#EDEDE3]/65">
                {perfil.cidade}
              </p>
            )}

            {!perfil && (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#F4C77E]">
                Seu perfil profissional ainda não foi preenchido. Complete o cadastro para preparar sua presença na Rede ERN.
              </p>
            )}
          </div>
        </section>

        <section
          aria-labelledby="painel-ferramentas"
          className="mt-8"
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2
                id="painel-ferramentas"
                className="text-2xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Sua área na Rede ERN
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-7 text-[#EDEDE3]/70">
                A estrutura será ampliada por módulos, preservando a separação entre a operação das empresas, os guias e os fornecedores.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dados.cartoes.map(
              (cartao) => {
                const conteudo = (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-lg font-semibold text-[#F0F0E8]">
                        {
                          cartao.titulo
                        }
                      </h3>

                      {cartao.status && (
                        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#A8BCAF]">
                          {
                            cartao.status
                          }
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-sm leading-7 text-[#EDEDE3]/70">
                      {
                        cartao.descricao
                      }
                    </p>

                    {cartao.href && (
                      <span className="mt-5 inline-flex text-sm font-semibold text-[#F4C77E]">
                        Abrir →
                      </span>
                    )}
                  </>
                );

                if (
                  cartao.href
                ) {
                  return (
                    <Link
                      key={
                        cartao.titulo
                      }
                      href={
                        cartao.href
                      }
                      className={`group min-w-0 rounded-2xl border border-white/10 bg-[#0D1B16] p-5 transition-colors hover:border-[#E3A144]/40 hover:bg-[#102019] ${FOCO}`}
                    >
                      {conteudo}
                    </Link>
                  );
                }

                return (
                  <article
                    key={
                      cartao.titulo
                    }
                    className="min-w-0 rounded-2xl border border-white/10 bg-[#0D1B16] p-5"
                  >
                    {conteudo}
                  </article>
                );
              },
            )}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-[#E3A144]/20 bg-[#E3A144]/[0.05] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
            Rede Encantos Rio Negro
          </p>

          <h2
            className="mt-3 text-2xl text-[#F0F0E8]"
            style={{
              fontFamily:
                'var(--font-fraunces), serif',
            }}
          >
            Negócios locais conectados ao turismo
          </h2>

          <p className="mt-3 max-w-4xl text-sm leading-7 text-[#EDEDE3]/75">
            A Rede ERN está sendo preparada para aproximar quem oferece produtos, serviços e conhecimento regional de quem precisa contratar, comprar, viajar ou estruturar uma operação turística no Alto e Baixo Rio Negro.
          </p>

          <Link
            href="/"
            className={`mt-5 inline-flex min-h-12 items-center rounded-xl border border-white/15 px-5 text-sm font-semibold text-[#EDEDE3] transition-colors hover:bg-white/5 ${FOCO}`}
          >
            Ver portal público
          </Link>
        </section>
      </div>
    </main>
  );
}
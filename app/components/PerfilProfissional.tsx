'use client';

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';

import Link from 'next/link';

import { supabase } from '@/lib/supabase';

import {
  carregarAcessosConta,
  contaPossuiAcesso,
  type AcessosConta,
  type TipoAcessoProfissional,
} from '@/lib/acessos';

interface DadosPerfil {
  nome: string;
  telefone: string;
  cidade: string;
  descricao: string;
  idiomas: string;
  cadastur: string;
  categoria: string;
}

interface RegistroPerfil {
  nome: string;
  telefone: string | null;
  cidade: string | null;
  descricao: string | null;
  idiomas: string | null;
  cadastur: string | null;
  categoria: string | null;
}

interface CampoPerfil {
  campo: Exclude<
    keyof DadosPerfil,
    'descricao'
  >;
  label: string;
  limite: number;
  placeholder?: string;
  tipo?: 'text' | 'tel';
  autoComplete?: string;
  ajuda?: string;
}

const CAMPOS =
  'nome,telefone,cidade,descricao,idiomas,cadastur,categoria';

const DADOS_INICIAIS: DadosPerfil = {
  nome: '',
  telefone: '',
  cidade: '',
  descricao: '',
  idiomas: '',
  cadastur: '',
  categoria: '',
};

const FOCO =
  'focus-visible:outline-2 focus-visible:outline-offset-4 ' +
  'focus-visible:outline-[#E3A144]';

const INPUT =
  'block min-h-[52px] w-full min-w-0 scroll-mt-6 rounded-xl ' +
  'border border-white/20 bg-[#07110E] px-4 py-3 text-base ' +
  'leading-6 text-[#F0F0E8] outline-none transition-colors ' +
  'placeholder:text-[#EDEDE3]/45 focus:border-[#E3A144] ' +
  'focus:ring-2 focus:ring-[#E3A144]/20 disabled:cursor-not-allowed ' +
  'disabled:opacity-60';

const LABEL =
  'mb-2 block text-sm font-medium text-[#EDEDE3]/85';

function normalizarPerfil(
  registro: RegistroPerfil,
): DadosPerfil {
  return {
    nome: registro.nome,
    telefone:
      registro.telefone ?? '',
    cidade:
      registro.cidade ?? '',
    descricao:
      registro.descricao ?? '',
    idiomas:
      registro.idiomas ?? '',
    cadastur:
      registro.cadastur ?? '',
    categoria:
      registro.categoria ?? '',
  };
}

function textoOpcional(
  valor: string,
): string | null {
  return valor.trim() || null;
}

function validarModalidade(
  conta: AcessosConta,
  tipo: TipoAcessoProfissional,
): void {
  if (
    conta.empresa_id ||
    contaPossuiAcesso(
      conta,
      'operadora',
    )
  ) {
    throw new Error(
      'Esta conta está vinculada a uma operadora. Utilize a área de gestão da empresa.',
    );
  }

  const modalidades =
    conta.acessos.filter(
      (acesso) =>
        acesso === 'guia' ||
        acesso === 'fornecedor',
    );

  if (
    modalidades.length !== 1 ||
    modalidades[0] !== tipo
  ) {
    throw new Error(
      'Este espaço não corresponde ao cadastro da sua conta. Confira seu acesso para continuar.',
    );
  }
}

export default function PerfilProfissional({
  tipo,
}: {
  tipo: TipoAcessoProfissional;
}) {
  const guia =
    tipo === 'guia';

  const raiz =
    guia
      ? '/guia'
      : '/fornecedor';

  const [
    dados,
    setDados,
  ] = useState<DadosPerfil>({
    ...DADOS_INICIAIS,
  });

  const [
    usuarioId,
    setUsuarioId,
  ] = useState<string | null>(
    null,
  );

  const [
    existe,
    setExiste,
  ] = useState(false);

  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const [
    salvando,
    setSalvando,
  ] = useState(false);

  const [
    erro,
    setErro,
  ] = useState('');

  const [
    sucesso,
    setSucesso,
  ] = useState('');

  const ocupado =
    useRef(false);

  const avisoRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ativo = true;

    setCarregando(true);
    setUsuarioId(null);
    setExiste(false);

    setDados({
      ...DADOS_INICIAIS,
    });

    setErro('');
    setSucesso('');

    async function carregar() {
      try {
        const conta =
          await carregarAcessosConta();

        validarModalidade(
          conta,
          tipo,
        );

        const {
          data,
          error,
        } = await supabase
          .from(
            'perfis_profissionais',
          )
          .select(CAMPOS)
          .eq(
            'usuario_id',
            conta.usuario_id,
          )
          .eq('tipo', tipo)
          .maybeSingle();

        if (error) {
          throw new Error(
            'Não foi possível carregar seu cadastro. Tente novamente.',
          );
        }

        if (!ativo) {
          return;
        }

        setUsuarioId(
          conta.usuario_id,
        );

        setExiste(
          Boolean(data),
        );

        if (data) {
          setDados(
            normalizarPerfil(
              data,
            ),
          );
        }
      } catch (error) {
        if (!ativo) {
          return;
        }

        setErro(
          error instanceof Error
            ? error.message
            : 'Não foi possível consultar seu cadastro.',
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

  useEffect(() => {
    if (
      erro ||
      sucesso
    ) {
      avisoRef.current?.scrollIntoView(
        {
          block: 'nearest',
          behavior: 'auto',
        },
      );
    }
  }, [erro, sucesso]);

  function alterar(
    campo: keyof DadosPerfil,
    valor: string,
  ) {
    setDados((atual) => ({
      ...atual,
      [campo]: valor,
    }));

    setSucesso('');
  }

  async function salvar(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      ocupado.current ||
      carregando ||
      !usuarioId
    ) {
      return;
    }

    setErro('');
    setSucesso('');

    const nome =
      dados.nome.trim();

    if (
      nome.length < 2 ||
      nome.length > 120
    ) {
      setErro(
        'Informe um nome entre 2 e 120 caracteres.',
      );

      return;
    }

    ocupado.current = true;
    setSalvando(true);

    try {
      const conta =
        await carregarAcessosConta();

      if (
        conta.usuario_id !==
        usuarioId
      ) {
        throw new Error(
          'A conta conectada mudou. Recarregue a página antes de salvar.',
        );
      }

      validarModalidade(
        conta,
        tipo,
      );

      const payload = {
        nome,

        telefone:
          textoOpcional(
            dados.telefone,
          ),

        cidade:
          textoOpcional(
            dados.cidade,
          ),

        descricao:
          textoOpcional(
            dados.descricao,
          ),

        idiomas: guia
          ? textoOpcional(
              dados.idiomas,
            )
          : null,

        cadastur: guia
          ? textoOpcional(
              dados.cadastur,
            )
          : null,

        categoria: guia
          ? null
          : textoOpcional(
              dados.categoria,
            ),
      };

      if (existe) {
        const {
          data,
          error,
        } = await supabase
          .from(
            'perfis_profissionais',
          )
          .update(payload)
          .eq(
            'usuario_id',
            usuarioId,
          )
          .eq('tipo', tipo)
          .select(CAMPOS)
          .single();

        if (
          error ||
          !data
        ) {
          throw new Error(
            'Não foi possível confirmar a atualização. Recarregue a página e confira os dados antes de tentar novamente.',
          );
        }

        setDados(
          normalizarPerfil(
            data,
          ),
        );
      } else {
        const {
          data,
          error,
        } = await supabase
          .from(
            'perfis_profissionais',
          )
          .insert({
            tipo,
            ...payload,
          })
          .select(CAMPOS)
          .single();

        if (
          error?.code ===
          '23505'
        ) {
          throw new Error(
            'Já existe um cadastro para esta modalidade. Recarregue a página para consultá-lo.',
          );
        }

        if (
          error ||
          !data
        ) {
          throw new Error(
            'Não foi possível confirmar o cadastro. Recarregue a página e confira se ele foi salvo antes de tentar novamente.',
          );
        }

        setDados(
          normalizarPerfil(
            data,
          ),
        );

        setExiste(true);
      }

      setSucesso(
        'Perfil salvo com sucesso. Seus dados continuam privados nesta etapa.',
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível confirmar o salvamento. Confira sua conexão.',
      );
    } finally {
      ocupado.current = false;
      setSalvando(false);
    }
  }

  const camposContato: CampoPerfil[] =
    [
      {
        campo: 'telefone',
        label:
          'Telefone / WhatsApp',
        limite: 30,
        tipo: 'tel',
        autoComplete: 'tel',
        placeholder:
          'Inclua o DDD',
      },
      {
        campo: 'cidade',
        label:
          'Cidade de atuação',
        limite: 120,
        placeholder:
          'Ex.: Barcelos, Amazonas',
      },
    ];

  const camposAtividade: CampoPerfil[] =
    guia
      ? [
          {
            campo: 'idiomas',
            label: 'Idiomas',
            limite: 300,
            placeholder:
              'Ex.: Português, Inglês',
          },
          {
            campo: 'cadastur',
            label:
              'Registro CADASTUR',
            limite: 100,
            placeholder:
              'Número do registro',
            ajuda:
              'O registro informado ainda não representa verificação pela ERN.',
          },
        ]
      : [
          {
            campo: 'categoria',
            label:
              'Atividade principal',
            limite: 120,
            placeholder:
              'Ex.: alimentação, transporte, comércio ou serviços',
          },
        ];

  function renderizarCampo(
    campo: CampoPerfil,
  ) {
    const id =
      `perfil-${campo.campo}`;

    return (
      <div
        key={campo.campo}
        className="min-w-0"
      >
        <label
          htmlFor={id}
          className={LABEL}
        >
          {campo.label}
        </label>

        <input
          id={id}
          name={campo.campo}
          type={
            campo.tipo ?? 'text'
          }
          inputMode={
            campo.tipo === 'tel'
              ? 'tel'
              : undefined
          }
          autoComplete={
            campo.autoComplete
          }
          maxLength={
            campo.limite
          }
          value={
            dados[campo.campo]
          }
          onChange={(event) =>
            alterar(
              campo.campo,
              event.target.value,
            )
          }
          placeholder={
            campo.placeholder
          }
          aria-describedby={
            campo.ajuda
              ? `${id}-ajuda`
              : undefined
          }
          className={INPUT}
        />

        {campo.ajuda && (
          <p
            id={`${id}-ajuda`}
            className="mt-2 text-xs leading-6 text-[#EDEDE3]/65"
          >
            {campo.ajuda}
          </p>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-[calc(100dvh-82px)] bg-[#07110E] px-4 py-7 text-[#EDEDE3] sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[1000px]">
        <header>
          <Link
            href={raiz}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-semibold text-[#F4C77E] transition-colors hover:text-[#FFD18A] ${FOCO}`}
          >
            <span aria-hidden="true">
              ←
            </span>

            Voltar ao painel
          </Link>

          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
            {guia
              ? 'Guia independente'
              : 'Fornecedor independente'}
          </p>

          <h1
            id="perfil-titulo"
            className="mt-3 text-3xl leading-tight text-[#F0F0E8] sm:text-4xl"
            style={{
              fontFamily:
                'var(--font-fraunces), serif',
            }}
          >
            Meu perfil profissional
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#EDEDE3]/75 sm:text-base">
            {guia
              ? 'Apresente sua atuação como guia, seus idiomas, sua região de atendimento e as informações profissionais que representarão você dentro da Rede ERN.'
              : 'Apresente seu negócio, sua atividade principal, seus produtos ou serviços e sua região de atendimento dentro da Rede ERN.'}
          </p>
        </header>

        <div
          ref={avisoRef}
          className="scroll-mt-28"
        >
          {erro && (
            <div
              role="alert"
              className="mt-6 break-words rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200"
            >
              {erro}
            </div>
          )}

          {sucesso && (
            <div
              role="status"
              className="mt-6 break-words rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-200"
            >
              {sucesso}
            </div>
          )}
        </div>

        {carregando ? (
          <div
            role="status"
            className="mt-6 rounded-3xl border border-white/10 bg-[#0D1B16] p-6 text-sm text-[#EDEDE3]/75"
          >
            Carregando seu perfil profissional...
          </div>
        ) : !usuarioId ? (
          <section className="mt-6 rounded-3xl border border-white/10 bg-[#0D1B16] p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-[#F0F0E8]">
              Não foi possível liberar o perfil
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#EDEDE3]/70">
              Confira sua sessão e a modalidade vinculada à sua conta antes de continuar.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  window.location.reload()
                }
                className={`min-h-12 rounded-xl border border-white/20 px-5 text-sm font-semibold text-[#EDEDE3] transition-colors hover:bg-white/5 ${FOCO}`}
              >
                Tentar novamente
              </button>

              <Link
                href={`/acesso?acesso=${tipo}`}
                className={`inline-flex min-h-12 items-center justify-center rounded-xl bg-[#E3A144] px-5 text-sm font-bold text-[#07130F] transition-colors hover:bg-[#F0B35C] ${FOCO}`}
              >
                Conferir meu acesso
              </Link>
            </div>
          </section>
        ) : (
          <form
            onSubmit={salvar}
            aria-busy={salvando}
            className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0D1B16]"
          >
            <div className="border-b border-white/10 px-5 py-5 sm:px-7">
              <h2 className="text-lg font-semibold text-[#F0F0E8]">
                Dados profissionais
              </h2>

              <p className="mt-2 text-xs leading-6 text-[#EDEDE3]/65">
                Apenas o nome é obrigatório nesta etapa.
              </p>
            </div>

            <fieldset
              disabled={salvando}
              className="min-w-0 space-y-6 p-5 sm:p-7"
            >
              <legend className="sr-only">
                Dados do perfil profissional
              </legend>

              <div>
                <label
                  htmlFor="perfil-nome"
                  className={LABEL}
                >
                  {guia
                    ? 'Nome profissional *'
                    : 'Nome profissional ou comercial *'}
                </label>

                <input
                  id="perfil-nome"
                  name="nome"
                  type="text"
                  autoComplete={
                    guia
                      ? 'name'
                      : 'organization'
                  }
                  required
                  minLength={2}
                  maxLength={120}
                  value={dados.nome}
                  onChange={(event) =>
                    alterar(
                      'nome',
                      event.target.value,
                    )
                  }
                  className={INPUT}
                />
              </div>

              <div className="grid min-w-0 gap-5 sm:grid-cols-2">
                {camposContato.map(
                  renderizarCampo,
                )}
              </div>

              <div
                className={
                  guia
                    ? 'grid min-w-0 gap-5 sm:grid-cols-2'
                    : 'min-w-0'
                }
              >
                {camposAtividade.map(
                  renderizarCampo,
                )}
              </div>

              <div>
                <label
                  htmlFor="perfil-descricao"
                  className={LABEL}
                >
                  {guia
                    ? 'Sobre sua atuação'
                    : 'Sobre seus produtos e serviços'}
                </label>

                <textarea
                  id="perfil-descricao"
                  name="descricao"
                  rows={6}
                  maxLength={2000}
                  value={
                    dados.descricao
                  }
                  onChange={(event) =>
                    alterar(
                      'descricao',
                      event.target.value,
                    )
                  }
                  placeholder={
                    guia
                      ? 'Descreva sua experiência, especialidades e regiões de atendimento.'
                      : 'Descreva seu negócio, o que você oferece e sua região de atendimento.'
                  }
                  aria-describedby="descricao-contagem"
                  className={`${INPUT} resize-y`}
                />

                <p
                  id="descricao-contagem"
                  className="mt-2 text-right text-xs text-[#EDEDE3]/65"
                >
                  {
                    dados.descricao
                      .length
                  }{' '}
                  / 2000 caracteres
                </p>
              </div>

              <div className="rounded-2xl border border-[#E3A144]/15 bg-[#E3A144]/[0.04] p-4">
                <p className="text-sm leading-7 text-[#EDEDE3]/70">
                  Salvar este perfil não publica automaticamente seus dados no portal público ou no feed da Rede ERN. A publicação será controlada por módulos próprios.
                </p>
              </div>

              <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-xs leading-6 text-[#EDEDE3]/60">
                  Você poderá atualizar estas informações sempre que necessário.
                </p>

                <button
                  type="submit"
                  disabled={salvando}
                  className={`flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#E3A144] px-6 py-3 text-base font-bold text-[#07130F] transition-colors hover:bg-[#F0B35C] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${FOCO}`}
                >
                  {salvando
                    ? 'Salvando...'
                    : existe
                      ? 'Salvar alterações'
                      : 'Salvar perfil'}
                </button>
              </div>
            </fieldset>
          </form>
        )}

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A8BCAF]">
            Privacidade
          </p>

          <p className="mt-2 text-sm leading-7 text-[#EDEDE3]/65">
            O perfil profissional continua separado da publicação pública. Quando o módulo de feed for ativado, você terá controle sobre o conteúdo que será exibido aos visitantes da Encantos Rio Negro.
          </p>
        </section>
      </div>
    </main>
  );
}
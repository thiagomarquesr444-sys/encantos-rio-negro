'use client';

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import Link from 'next/link';

import LogoERN from '@/app/components/LogoERN';
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
  campo: Exclude<keyof DadosPerfil, 'descricao'>;
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
  'focus:ring-2 focus:ring-[#E3A144]/20 disabled:opacity-60';

const LABEL =
  'mb-2 block text-sm font-medium text-[#EDEDE3]/85';

function normalizarPerfil(
  registro: RegistroPerfil,
): DadosPerfil {
  return {
    nome: registro.nome,
    telefone: registro.telefone ?? '',
    cidade: registro.cidade ?? '',
    descricao: registro.descricao ?? '',
    idiomas: registro.idiomas ?? '',
    cadastur: registro.cadastur ?? '',
    categoria: registro.categoria ?? '',
  };
}

function textoOpcional(valor: string): string | null {
  return valor.trim() || null;
}

function validarModalidade(
  conta: AcessosConta,
  tipo: TipoAcessoProfissional,
): void {
  if (
    conta.empresa_id ||
    contaPossuiAcesso(conta, 'operadora')
  ) {
    throw new Error(
      'Esta conta está vinculada a uma operadora. Utilize a área de gestão da empresa.',
    );
  }

  const modalidades = conta.acessos.filter(
    (acesso) =>
      acesso === 'guia' || acesso === 'fornecedor',
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
  const guia = tipo === 'guia';

  const [dados, setDados] =
    useState<DadosPerfil>({ ...DADOS_INICIAIS });
  const [usuarioId, setUsuarioId] =
    useState<string | null>(null);
  const [existe, setExiste] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const ocupado = useRef(false);
  const avisoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ativo = true;

    setCarregando(true);
    setUsuarioId(null);
    setExiste(false);
    setDados({ ...DADOS_INICIAIS });
    setErro('');
    setSucesso('');

    async function carregar() {
      try {
        const conta = await carregarAcessosConta();
        validarModalidade(conta, tipo);

        const { data, error } = await supabase
          .from('perfis_profissionais')
          .select(CAMPOS)
          .eq('usuario_id', conta.usuario_id)
          .eq('tipo', tipo)
          .maybeSingle();

        if (error) {
          throw new Error(
            'Não foi possível carregar seu cadastro. Tente novamente.',
          );
        }

        if (!ativo) return;

        setUsuarioId(conta.usuario_id);
        setExiste(Boolean(data));

        if (data) {
          setDados(normalizarPerfil(data));
        }
      } catch (error) {
        if (!ativo) return;

        setErro(
          error instanceof Error
            ? error.message
            : 'Não foi possível consultar seu cadastro.',
        );
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, [tipo]);

  useEffect(() => {
    if (erro || sucesso) {
      avisoRef.current?.scrollIntoView({
        block: 'nearest',
        behavior: 'auto',
      });
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

    if (ocupado.current || carregando || !usuarioId) {
      return;
    }

    setErro('');
    setSucesso('');

    const nome = dados.nome.trim();

    if (nome.length < 2 || nome.length > 120) {
      setErro('Informe um nome entre 2 e 120 caracteres.');
      return;
    }

    ocupado.current = true;
    setSalvando(true);

    try {
      const conta = await carregarAcessosConta();

      if (conta.usuario_id !== usuarioId) {
        throw new Error(
          'A conta conectada mudou. Recarregue a página antes de salvar.',
        );
      }

      validarModalidade(conta, tipo);

      const payload = {
        nome,
        telefone: textoOpcional(dados.telefone),
        cidade: textoOpcional(dados.cidade),
        descricao: textoOpcional(dados.descricao),
        idiomas: guia
          ? textoOpcional(dados.idiomas)
          : null,
        cadastur: guia
          ? textoOpcional(dados.cadastur)
          : null,
        categoria: guia
          ? null
          : textoOpcional(dados.categoria),
      };

      if (existe) {
        const { data, error } = await supabase
          .from('perfis_profissionais')
          .update(payload)
          .eq('usuario_id', usuarioId)
          .eq('tipo', tipo)
          .select(CAMPOS)
          .single();

        if (error || !data) {
          throw new Error(
            'Não foi possível confirmar a atualização. Recarregue a página e confira os dados antes de tentar novamente.',
          );
        }

        setDados(normalizarPerfil(data));
      } else {
        const { data, error } = await supabase
          .from('perfis_profissionais')
          .insert({ tipo, ...payload })
          .select(CAMPOS)
          .single();

        if (error?.code === '23505') {
          throw new Error(
            'Já existe um cadastro para esta modalidade. Recarregue a página para consultá-lo.',
          );
        }

        if (error || !data) {
          throw new Error(
            'Não foi possível confirmar o cadastro. Recarregue a página e confira se ele foi salvo antes de tentar novamente.',
          );
        }

        setDados(normalizarPerfil(data));
        setExiste(true);
      }

      setSucesso(
        'Cadastro salvo. Seus dados continuam privados nesta etapa.',
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

  const camposContato: CampoPerfil[] = [
    {
      campo: 'telefone',
      label: 'Telefone / WhatsApp',
      limite: 30,
      tipo: 'tel',
      autoComplete: 'tel',
      placeholder: 'Inclua o DDD',
    },
    {
      campo: 'cidade',
      label: 'Cidade de atuação',
      limite: 120,
      placeholder: 'Ex.: Barcelos, Amazonas',
    },
  ];

  const camposAtividade: CampoPerfil[] = guia
    ? [
        {
          campo: 'idiomas',
          label: 'Idiomas',
          limite: 300,
          placeholder: 'Ex.: Português, Inglês',
        },
        {
          campo: 'cadastur',
          label: 'Registro CADASTUR',
          limite: 100,
          placeholder: 'Número do registro',
          ajuda:
            'O registro informado ainda não representa verificação pela ERN.',
        },
      ]
    : [
        {
          campo: 'categoria',
          label: 'Atividade principal',
          limite: 120,
          placeholder: 'Ex.: alimentação ou transporte',
        },
      ];

  function renderizarCampo(campo: CampoPerfil) {
    const id = `perfil-${campo.campo}`;

    return (
      <div key={campo.campo} className="min-w-0">
        <label htmlFor={id} className={LABEL}>
          {campo.label}
        </label>

        <input
          id={id}
          name={campo.campo}
          type={campo.tipo ?? 'text'}
          inputMode={
            campo.tipo === 'tel' ? 'tel' : undefined
          }
          autoComplete={campo.autoComplete}
          maxLength={campo.limite}
          value={dados[campo.campo]}
          onChange={(event) =>
            alterar(campo.campo, event.target.value)
          }
          placeholder={campo.placeholder}
          aria-describedby={
            campo.ajuda ? `${id}-ajuda` : undefined
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
    <main
      className="min-h-dvh w-full bg-[#07110E] text-[#EDEDE3]"
      style={{
        paddingTop:
          'max(1rem, env(safe-area-inset-top, 0px))',
        paddingRight:
          'max(1rem, env(safe-area-inset-right, 0px))',
        paddingBottom:
          'max(2rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft:
          'max(1rem, env(safe-area-inset-left, 0px))',
      }}
    >
      <div className="mx-auto w-full min-w-0 max-w-[900px] sm:py-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            aria-label="Encantos Rio Negro — portal público"
            className={`inline-flex min-w-0 items-center gap-3 rounded-xl ${FOCO}`}
          >
            <LogoERN tamanho={52} prioridade />

            <span className="min-w-0">
              <span className="block text-sm font-semibold sm:text-base">
                Encantos Rio Negro
              </span>
              <span className="mt-1 block text-xs text-[#F4C77E]">
                {guia ? 'Guia independente' : 'Fornecedor independente'}
              </span>
            </span>
          </Link>

          <Link
            href={`/acesso?acesso=${tipo}`}
            className={`inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 px-4 text-sm text-[#EDEDE3]/85 hover:bg-white/5 ${FOCO}`}
          >
            Minha conta
          </Link>
        </header>

        <section aria-labelledby="perfil-titulo" className="mt-8">
          <h1
            id="perfil-titulo"
            className="text-2xl leading-tight text-[#F0F0E8] sm:text-3xl"
            style={{
              fontFamily: 'var(--font-fraunces), serif',
            }}
          >
            Meu cadastro profissional
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#EDEDE3]/75">
            {guia
              ? 'Apresente sua atuação como guia, seus idiomas e sua região de atendimento.'
              : 'Apresente sua atividade e os produtos ou serviços que você fornece.'}
          </p>

          <div ref={avisoRef} className="scroll-mt-6">
            {erro && (
              <div
                role="alert"
                className="mt-5 break-words rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200"
              >
                {erro}
              </div>
            )}

            {sucesso && (
              <div
                role="status"
                className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-200"
              >
                {sucesso}
              </div>
            )}
          </div>

          {carregando ? (
            <p
              role="status"
              className="mt-6 rounded-2xl border border-white/10 bg-[#0D1B16] p-5 text-sm text-[#EDEDE3]/75"
            >
              Carregando seu cadastro...
            </p>
          ) : !usuarioId ? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className={`min-h-12 rounded-xl border border-white/20 px-5 text-sm ${FOCO}`}
              >
                Tentar novamente
              </button>

              <Link
                href={`/acesso?acesso=${tipo}`}
                className={`inline-flex min-h-12 items-center justify-center rounded-xl bg-[#E3A144] px-5 text-sm font-bold text-[#07130F] ${FOCO}`}
              >
                Conferir meu acesso
              </Link>
            </div>
          ) : (
            <form
              onSubmit={salvar}
              aria-busy={salvando}
              className="mt-6 rounded-3xl border border-white/10 bg-[#0D1B16] p-5 sm:p-7"
            >
              <fieldset
                disabled={salvando}
                className="min-w-0 space-y-5"
              >
                <legend className="sr-only">
                  Dados do cadastro profissional
                </legend>

                <p className="text-xs leading-6 text-[#EDEDE3]/65">
                  Apenas o nome é obrigatório.
                </p>

                <div>
                  <label htmlFor="perfil-nome" className={LABEL}>
                    {guia
                      ? 'Nome profissional *'
                      : 'Nome profissional ou comercial *'}
                  </label>

                  <input
                    id="perfil-nome"
                    name="nome"
                    type="text"
                    autoComplete={guia ? 'name' : 'organization'}
                    required
                    minLength={2}
                    maxLength={120}
                    value={dados.nome}
                    onChange={(event) =>
                      alterar('nome', event.target.value)
                    }
                    className={INPUT}
                  />
                </div>

                <div className="grid min-w-0 gap-5 sm:grid-cols-2">
                  {camposContato.map(renderizarCampo)}
                </div>

                <div
                  className={
                    guia
                      ? 'grid min-w-0 gap-5 sm:grid-cols-2'
                      : 'min-w-0'
                  }
                >
                  {camposAtividade.map(renderizarCampo)}
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
                    rows={5}
                    maxLength={2000}
                    value={dados.descricao}
                    onChange={(event) =>
                      alterar('descricao', event.target.value)
                    }
                    placeholder={
                      guia
                        ? 'Descreva sua experiência, especialidades e regiões de atendimento.'
                        : 'Descreva o que você oferece e sua região de atendimento.'
                    }
                    aria-describedby="descricao-contagem"
                    className={`${INPUT} resize-y`}
                  />

                  <p
                    id="descricao-contagem"
                    className="mt-2 text-right text-xs text-[#EDEDE3]/65"
                  >
                    {dados.descricao.length} / 2000 caracteres
                  </p>
                </div>

                <div className="border-t border-white/10 pt-5">
                  <p className="text-sm leading-6 text-[#EDEDE3]/70">
                    Salvar não publica seu perfil no portal.
                    Nesta etapa, seus dados ficam disponíveis
                    somente para sua conta pela aplicação.
                  </p>

                  <button
                    type="submit"
                    disabled={salvando}
                    className={`mt-5 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#E3A144] px-6 py-3 text-base font-bold text-[#07130F] transition-colors hover:bg-[#F0B35C] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${FOCO}`}
                  >
                    {salvando
                      ? 'Salvando...'
                      : existe
                        ? 'Salvar alterações'
                        : 'Salvar cadastro'}
                  </button>
                </div>
              </fieldset>
            </form>
          )}
        </section>

        <footer className="mt-6 text-center">
          <Link
            href="/"
            className={`inline-flex min-h-12 items-center rounded-lg px-3 text-sm text-[#EDEDE3]/70 hover:text-[#F4C77E] ${FOCO}`}
          >
            Voltar ao portal público
          </Link>
        </footer>
      </div>
    </main>
  );
}
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

const CAMPOS =
  'nome,telefone,cidade,descricao,idiomas,cadastur,categoria';

const dadosIniciais: DadosPerfil = {
  nome: '',
  telefone: '',
  cidade: '',
  descricao: '',
  idiomas: '',
  cadastur: '',
  categoria: '',
};

function normalizarPerfil(
  registro: RegistroPerfil
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

export default function PerfilProfissional({
  tipo,
}: {
  tipo: TipoAcessoProfissional;
}) {
  const guia = tipo === 'guia';

  const [dados, setDados] =
    useState<DadosPerfil>({ ...dadosIniciais });

  const [usuarioId, setUsuarioId] =
    useState<string | null>(null);

  const [existe, setExiste] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const ocupado = useRef(false);

  useEffect(() => {
    let ativo = true;

    setCarregando(true);
    setUsuarioId(null);
    setExiste(false);
    setDados({ ...dadosIniciais });
    setErro('');
    setSucesso('');

    async function carregar() {
      try {
        const conta = await carregarAcessosConta();

        if (!contaPossuiAcesso(conta, tipo)) {
          throw new Error(
            'Ative este acesso na página “Seus acessos” antes de continuar.'
          );
        }

        const { data, error } = await supabase
          .from('perfis_profissionais')
          .select(CAMPOS)
          .eq('usuario_id', conta.usuario_id)
          .eq('tipo', tipo)
          .maybeSingle();

        if (error) {
          throw new Error(
            'Não foi possível carregar seu cadastro. Tente novamente.'
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
            : 'Não foi possível consultar seu perfil.'
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

  function alterar(
    campo: keyof DadosPerfil,
    valor: string
  ) {
    setDados((atual) => ({
      ...atual,
      [campo]: valor,
    }));
    setSucesso('');
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
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
          'A conta conectada mudou. Recarregue a página antes de salvar.'
        );
      }

      if (!contaPossuiAcesso(conta, tipo)) {
        throw new Error(
          'Este acesso não está mais disponível para sua conta.'
        );
      }

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
            'Não foi possível confirmar a atualização. Recarregue a página e confira os dados antes de tentar novamente.'
          );
        }

        setDados(normalizarPerfil(data));
      } else {
        // usuario_id é preenchido pelo banco com auth.uid().
        const { data, error } = await supabase
          .from('perfis_profissionais')
          .insert({
            tipo,
            ...payload,
          })
          .select(CAMPOS)
          .single();

        if (error?.code === '23505') {
          throw new Error(
            'Já existe um cadastro deste tipo para sua conta. Recarregue a página para consultá-lo.'
          );
        }

        if (error || !data) {
          throw new Error(
            'Não foi possível confirmar o cadastro. Recarregue a página e confira se ele foi salvo antes de tentar novamente.'
          );
        }

        setDados(normalizarPerfil(data));
        setExiste(true);
      }

      setSucesso(
        'Cadastro salvo. Seus dados continuam privados nesta etapa.'
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível confirmar o salvamento. Confira sua conexão e recarregue a página.'
      );
    } finally {
      ocupado.current = false;
      setSalvando(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-[#07110E] px-4 py-3 text-sm text-[#EDEDE3] outline-none transition placeholder:text-[#EDEDE3]/30 focus:border-[#E3A144]/60 disabled:opacity-50';

  const labelClass =
    'mb-2 block text-xs font-semibold text-[#EDEDE3]/70';

  return (
    <div className="min-h-screen bg-[#07110E] px-5 py-8 text-[#EDEDE3] md:px-8 md:py-12">
      <div className="mx-auto max-w-[900px]">
        <nav
          aria-label="Navegação profissional"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <Link
            href="/acesso"
            className="inline-flex min-h-[44px] items-center gap-2 text-sm text-[#EDEDE3]/60 transition hover:text-[#E3A144]"
          >
            <span aria-hidden="true">←</span>
            Meus acessos
          </Link>

          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center text-sm text-[#EDEDE3]/60 transition hover:text-[#E3A144]"
          >
            Portal público
          </Link>
        </nav>

        <header className="mt-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
            {guia ? 'Guia ERN' : 'Fornecedor ERN'}
          </p>

          <h1
            className="mt-4 text-3xl leading-tight text-[#F0F0E8] md:text-4xl"
            style={{
              fontFamily:
                'var(--font-fraunces), serif',
            }}
          >
            Meu cadastro profissional
          </h1>

          <p className="mt-4 max-w-[720px] text-sm leading-7 text-[#EDEDE3]/55">
            {guia
              ? 'Apresente sua atuação como guia, seus idiomas e sua região de atendimento.'
              : 'Apresente sua atividade e os produtos ou serviços que você fornece.'}
          </p>
        </header>

        {erro && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-500/25 bg-red-500/[0.08] p-4 text-sm leading-6 text-red-300"
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
          <p
            role="status"
            className="mt-8 rounded-2xl border border-white/[0.08] bg-[#0D1B16] p-6 text-sm text-[#EDEDE3]/55"
          >
            Carregando seu cadastro...
          </p>
        ) : !usuarioId ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[48px] rounded-xl border border-white/10 px-5 text-sm font-semibold text-[#EDEDE3]/70"
            >
              Tentar novamente
            </button>

            <Link
              href={`/acesso?acesso=${tipo}`}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#E3A144] px-5 text-sm font-bold text-[#07130F]"
            >
              Conferir meus acessos
            </Link>
          </div>
        ) : (
          <form
            onSubmit={salvar}
            className="mt-8 rounded-[24px] border border-white/[0.08] bg-[#0D1B16] p-5 md:p-7"
          >
            <fieldset
              disabled={salvando}
              className="min-w-0 space-y-5"
            >
              <legend className="sr-only">
                Dados do perfil profissional
              </legend>

              <div>
                <label
                  htmlFor="perfil-nome"
                  className={labelClass}
                >
                  {guia
                    ? 'Nome profissional *'
                    : 'Nome profissional ou comercial *'}
                </label>
                <input
                  id="perfil-nome"
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  value={dados.nome}
                  onChange={(event) =>
                    alterar('nome', event.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="perfil-telefone"
                    className={labelClass}
                  >
                    Telefone / WhatsApp
                  </label>
                  <input
                    id="perfil-telefone"
                    type="tel"
                    autoComplete="tel"
                    maxLength={30}
                    value={dados.telefone}
                    onChange={(event) =>
                      alterar(
                        'telefone',
                        event.target.value
                      )
                    }
                    placeholder="Inclua o DDD"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="perfil-cidade"
                    className={labelClass}
                  >
                    Cidade de atuação
                  </label>
                  <input
                    id="perfil-cidade"
                    type="text"
                    maxLength={120}
                    value={dados.cidade}
                    onChange={(event) =>
                      alterar('cidade', event.target.value)
                    }
                    placeholder="Ex.: Barcelos, Amazonas"
                    className={inputClass}
                  />
                </div>
              </div>

              {guia ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="perfil-idiomas"
                      className={labelClass}
                    >
                      Idiomas
                    </label>
                    <input
                      id="perfil-idiomas"
                      type="text"
                      maxLength={300}
                      value={dados.idiomas}
                      onChange={(event) =>
                        alterar(
                          'idiomas',
                          event.target.value
                        )
                      }
                      placeholder="Ex.: Português, Inglês"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="perfil-cadastur"
                      className={labelClass}
                    >
                      Registro CADASTUR
                    </label>
                    <input
                      id="perfil-cadastur"
                      type="text"
                      maxLength={100}
                      value={dados.cadastur}
                      onChange={(event) =>
                        alterar(
                          'cadastur',
                          event.target.value
                        )
                      }
                      placeholder="Número do registro"
                      className={inputClass}
                    />
                    <p className="mt-2 text-xs leading-5 text-[#EDEDE3]/40">
                      O registro informado ainda não
                      representa verificação pela ERN.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="perfil-categoria"
                    className={labelClass}
                  >
                    Atividade principal
                  </label>
                  <input
                    id="perfil-categoria"
                    type="text"
                    maxLength={120}
                    value={dados.categoria}
                    onChange={(event) =>
                      alterar(
                        'categoria',
                        event.target.value
                      )
                    }
                    placeholder="Ex.: alimentação, transporte ou equipamentos"
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="perfil-descricao"
                  className={labelClass}
                >
                  {guia
                    ? 'Sobre sua atuação'
                    : 'Sobre seus produtos e serviços'}
                </label>
                <textarea
                  id="perfil-descricao"
                  rows={5}
                  maxLength={2000}
                  value={dados.descricao}
                  onChange={(event) =>
                    alterar(
                      'descricao',
                      event.target.value
                    )
                  }
                  placeholder={
                    guia
                      ? 'Descreva sua experiência, especialidades e regiões de atendimento.'
                      : 'Descreva o que você oferece e sua região de atendimento.'
                  }
                  className={`${inputClass} resize-y`}
                />
                <p className="mt-2 text-right text-xs text-[#EDEDE3]/35">
                  {dados.descricao.length}/2000
                </p>
              </div>

              <div className="border-t border-white/[0.07] pt-5">
                <p className="text-xs leading-6 text-[#EDEDE3]/45">
                  Salvar este cadastro não publica seu
                  perfil no portal. Nesta etapa, os dados
                  ficam disponíveis somente para sua conta
                  pela aplicação.
                </p>

                <button
                  type="submit"
                  disabled={salvando}
                  className="mt-5 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#E3A144] px-6 py-3 text-sm font-bold text-[#07130F] transition hover:bg-[#F0B35C] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
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
      </div>
    </div>
  );
}
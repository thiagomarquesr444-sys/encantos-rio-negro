'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  obterContextoGuias,
  validarContextoGuias,
  type ContextoGuias,
} from '@/lib/guiasOperacionais';

type StatusGuia = 'Ativo' | 'Em Tour' | 'Férias' | 'Inativo';

interface GuiaForm {
  nome: string;
  cpf: string;
  telefone: string;
  idiomas: string;
  cadastur: string;
  status: StatusGuia;
}

interface Mensagem {
  tipo: 'sucesso' | 'erro';
  texto: string;
}

const estadoInicial: GuiaForm = {
  nome: '',
  cpf: '',
  telefone: '',
  idiomas: 'Português',
  cadastur: '',
  status: 'Ativo',
};

function somenteNumeros(valor: string) {
  return valor.replace(/\D/g, '');
}

function formatarCPF(valor: string) {
  const numeros = somenteNumeros(valor).slice(0, 11);

  return numeros
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function formatarTelefone(valor: string) {
  const numeros = somenteNumeros(valor).slice(0, 11);

  if (numeros.length <= 10) {
    return numeros
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  return numeros
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export default function NovoGuiaPage() {
  const router = useRouter();
  const envioGuiaERN = React.useRef(false);
  const gravadoGuiaERN = React.useRef(false);
  const idGuiaERN = React.useRef<string | null>(null);

  const [contexto, setContexto] = useState<ContextoGuias | null>(
    null
  );
  const [carregandoContexto, setCarregandoContexto] =
    useState(true);
  const [formData, setFormData] =
    useState<GuiaForm>(estadoInicial);
  const [salvando, setSalvando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem | null>(
    null
  );

  const bloqueado =
    carregandoContexto ||
    salvando ||
    concluido ||
    !contexto?.pode_gerenciar;

  useEffect(() => {
    let ativo = true;

    async function carregarContexto() {
      try {
        const atual = await obterContextoGuias();

        if (!ativo) return;

        setContexto(atual);

        if (!atual.pode_gerenciar) {
          setMensagem({
            tipo: 'erro',
            texto:
              'Seu perfil permite apenas consultar os guias da operadora. O cadastro está disponível para administradores e operadores.',
          });
        }
      } catch (err) {
        if (!ativo) return;

        setMensagem({
          tipo: 'erro',
          texto:
            err instanceof Error
              ? err.message
              : 'Não foi possível identificar sua empresa. Entre com uma conta da operadora.',
        });
      } finally {
        if (ativo) {
          setCarregandoContexto(false);
        }
      }
    }

    void carregarContexto();

    return () => {
      ativo = false;
    };
  }, []);

  const inputClass =
    'w-full rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 py-3 text-sm text-[var(--ern-texto)] outline-none transition placeholder:text-[var(--ern-secundario)] focus:border-[var(--ern-destaque)] disabled:cursor-not-allowed disabled:opacity-50';

  const labelClass =
    'mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--ern-secundario)]';

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) {
    const { name, value } = event.target;

    if (name === 'cpf') {
      setFormData((atual) => ({
        ...atual,
        cpf: formatarCPF(value),
      }));
      return;
    }

    if (name === 'telefone') {
      setFormData((atual) => ({
        ...atual,
        telefone: formatarTelefone(value),
      }));
      return;
    }

    if (name === 'status') {
      if (
        value === 'Ativo' ||
        value === 'Em Tour' ||
        value === 'Férias' ||
        value === 'Inativo'
      ) {
        setFormData((atual) => ({
          ...atual,
          status: value,
        }));
      }
      return;
    }

    if (
      name === 'nome' ||
      name === 'idiomas' ||
      name === 'cadastur'
    ) {
      setFormData((atual) => ({
        ...atual,
        [name]: value,
      }));
    }
  }

  function handleLimpar() {
    if (envioGuiaERN.current || gravadoGuiaERN.current) return;
    if (bloqueado) return;

    setFormData({ ...estadoInicial });
    setMensagem(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (envioGuiaERN.current || gravadoGuiaERN.current) return;

    if (bloqueado || !contexto) return;

    setMensagem(null);

    const nome = formData.nome.trim();
    const cpf = formData.cpf.trim();
    const telefone = formData.telefone.trim();
    const cadastur = formData.cadastur.trim();

    if (!nome || !cpf || !telefone || !cadastur) {
      setMensagem({
        tipo: 'erro',
        texto:
          'Preencha os campos obrigatórios: nome, CPF, telefone e CADASTUR.',
      });
      return;
    }

    if (somenteNumeros(cpf).length !== 11) {
      setMensagem({
        tipo: 'erro',
        texto: 'Informe um CPF com 11 dígitos.',
      });
      return;
    }

    if (somenteNumeros(telefone).length < 10) {
      setMensagem({
        tipo: 'erro',
        texto: 'Informe um telefone válido.',
      });
      return;
    }

    envioGuiaERN.current = true;
    setSalvando(true);

    try {
      const atual = await validarContextoGuias(contexto);

      idGuiaERN.current ??= crypto.randomUUID();
      const payload = {
        id: idGuiaERN.current,
        usuario_id: atual.usuario_id,
        empresa_id: atual.empresa_id,
        nome,
        cpf,
        telefone,
        idiomas: formData.idiomas.trim() || 'Português',
        cadastur,
        status: formData.status,
      };

      const { data: registro, error } = await supabase
        .from('guias')
        .insert([payload])
        .select('id')
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error(
            'Este envio pode ja ter sido registrado. Confira a listagem antes de cadastrar novamente.'
          );
        }
        throw error;
      }

      if (registro?.id !== idGuiaERN.current) {
        throw new Error('Nao foi possivel confirmar o cadastro.');
      }

      gravadoGuiaERN.current = true;

      setConcluido(true);
      setMensagem({
        tipo: 'sucesso',
        texto: 'Guia cadastrado com sucesso na sua operadora.',
      });

      router.replace('/guias');
      router.refresh();
    } catch (err) {
      console.error('Erro ao cadastrar guia:', err);

      setMensagem({
        tipo: 'erro',
        texto:
          err instanceof Error
            ? `Erro ao cadastrar guia: ${err.message}`
            : 'Não foi possível confirmar o cadastro. Confira a listagem antes de tentar novamente.',
      });
    } finally {
      if (!gravadoGuiaERN.current) {
        envioGuiaERN.current = false;
        setSalvando(false);
      }
    }
  }

  return (
    <div className="min-h-screen bg-[var(--ern-fundo)] text-[var(--ern-texto)]">
      <section className="border-b border-[var(--ern-borda)] bg-[var(--ern-painel)]">
        <div className="mx-auto max-w-[1180px] px-5 py-10 md:px-8 md:py-12">
          <Link
            href="/guias"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--ern-secundario)] transition hover:text-[var(--ern-destaque)]"
          >
            <span>←</span>
            Guias
          </Link>

          <div className="mt-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--ern-destaque)]">
                Estrutura • Equipe
              </p>

              <h1
                className="mt-3 text-4xl tracking-[-0.035em] text-[var(--ern-texto)] md:text-5xl"
                style={{
                  fontFamily: 'var(--font-fraunces), serif',
                }}
              >
                Novo guia
              </h1>

              <p className="mt-4 max-w-[680px] text-sm leading-7 text-[var(--ern-secundario)]">
                Cadastre profissionais da sua operadora,
                contatos, idiomas, CADASTUR e disponibilidade.
              </p>
            </div>

            <span className="self-start rounded-full border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-3 py-1.5 text-[9px] uppercase tracking-[0.15em] text-[var(--ern-secundario)]">
              ERN Gestão
            </span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 md:py-10">
        {carregandoContexto && (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-5 py-4 text-xs text-[var(--ern-secundario)]"
          >
            Verificando sua empresa e suas permissões...
          </div>
        )}

        {mensagem && (
          <div
            role={mensagem.tipo === 'erro' ? 'alert' : 'status'}
            className={`mb-6 rounded-2xl border px-5 py-4 text-xs ${
              mensagem.tipo === 'sucesso'
                ? 'border-emerald-500/20 bg-emerald-500/[0.07] text-[var(--ern-sucesso)]'
                : 'border-red-500/20 bg-red-500/[0.07] text-[var(--ern-erro)]'
            }`}
          >
            {mensagem.texto}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"
        >
          <section className="rounded-[26px] border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-5 md:p-7">
            <div className="border-b border-[var(--ern-borda)] pb-5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--ern-secundario)]">
                Identificação
              </p>

              <h2
                className="mt-2 text-2xl text-[var(--ern-texto)]"
                style={{
                  fontFamily: 'var(--font-fraunces), serif',
                }}
              >
                Dados do profissional
              </h2>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="guia-nome"
                  className={labelClass}
                >
                  Nome completo *
                </label>

                <input
                  id="guia-nome"
                  type="text"
                  name="nome"
                  required
                  disabled={bloqueado}
                  value={formData.nome}
                  onChange={handleChange}
                  placeholder="Nome completo do guia"
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="guia-cpf"
                    className={labelClass}
                  >
                    CPF *
                  </label>

                  <input
                    id="guia-cpf"
                    type="text"
                    inputMode="numeric"
                    name="cpf"
                    required
                    maxLength={14}
                    disabled={bloqueado}
                    value={formData.cpf}
                    onChange={handleChange}
                    placeholder="000.000.000-00"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="guia-telefone"
                    className={labelClass}
                  >
                    Telefone / WhatsApp *
                  </label>

                  <input
                    id="guia-telefone"
                    type="text"
                    inputMode="tel"
                    name="telefone"
                    required
                    disabled={bloqueado}
                    value={formData.telefone}
                    onChange={handleChange}
                    placeholder="(92) 99999-9999"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="guia-idiomas"
                  className={labelClass}
                >
                  Idiomas
                </label>

                <input
                  id="guia-idiomas"
                  type="text"
                  name="idiomas"
                  disabled={bloqueado}
                  value={formData.idiomas}
                  onChange={handleChange}
                  placeholder="Ex.: Português, Inglês, Espanhol"
                  className={inputClass}
                />

                <p className="mt-2 text-[9px] leading-4 text-[var(--ern-secundario)]">
                  Separe mais de um idioma por vírgula.
                </p>
              </div>

              <div>
                <label
                  htmlFor="guia-cadastur"
                  className={labelClass}
                >
                  Registro CADASTUR *
                </label>

                <input
                  id="guia-cadastur"
                  type="text"
                  name="cadastur"
                  required
                  disabled={bloqueado}
                  value={formData.cadastur}
                  onChange={handleChange}
                  placeholder="Número do registro"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-[26px] border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-5 md:p-6">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--ern-destaque)]">
                Operação
              </p>

              <h2
                className="mt-2 text-2xl text-[var(--ern-texto)]"
                style={{
                  fontFamily: 'var(--font-fraunces), serif',
                }}
              >
                Disponibilidade
              </h2>

              <p className="mt-4 text-xs leading-6 text-[var(--ern-secundario)]">
                O status informa se o guia está disponível,
                em uma operação, afastado temporariamente
                ou inativo.
              </p>

              <div className="mt-6">
                <label
                  htmlFor="guia-status"
                  className={labelClass}
                >
                  Status
                </label>

                <select
                  id="guia-status"
                  name="status"
                  disabled={bloqueado}
                  value={formData.status}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Em Tour">Em Tour</option>
                  <option value="Férias">Férias</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
            </section>

            <section className="rounded-[26px] border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-5 md:p-6">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--ern-secundario)]">
                Cadastro da operadora
              </p>

              <p className="mt-4 text-xs leading-6 text-[var(--ern-secundario)]">
                Este cadastro organiza os profissionais
                utilizados pela sua operadora. Ele não cria
                uma conta de acesso para o guia.
              </p>

              <div className="mt-5 space-y-2">
                {[
                  'Identificação',
                  'Contato',
                  'Idiomas',
                  'CADASTUR',
                  'Disponibilidade',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-3 py-2.5"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--ern-botao)]" />
                    <span className="text-[11px] text-[var(--ern-secundario)]">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="lg:col-span-2">
            <div className="flex flex-col-reverse gap-3 border-t border-[var(--ern-borda)] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleLimpar}
                disabled={bloqueado}
                className="rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-5 py-3 text-xs font-semibold text-[var(--ern-secundario)] transition hover:bg-[var(--ern-suave)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Limpar formulário
              </button>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={salvando || concluido}
                  onClick={() => router.push('/guias')}
                  className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-5 text-xs font-semibold text-[var(--ern-secundario)] transition hover:bg-[var(--ern-suave)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={bloqueado}
                  className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-[var(--ern-botao)] px-6 text-xs font-bold text-[var(--ern-sobre-botao)] transition hover:bg-[var(--ern-botao)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {carregandoContexto
                    ? 'Verificando acesso...'
                    : salvando
                      ? 'Salvando...'
                      : concluido
                        ? 'Cadastro concluído'
                        : 'Cadastrar guia'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
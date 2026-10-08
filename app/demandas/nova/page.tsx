'use client';

import {
  useEffect,
  useState,
  type FormEvent,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  CATEGORIAS_DEMANDA,
  criarDemanda,
  mensagemErroDemandas,
  obterContextoDemandas,
  type CategoriaDemanda,
  type ContextoDemandas,
  type DadosDemanda,
  type StatusDemanda,
} from '@/lib/demandas';

type FormularioDemanda = {
  titulo: string;
  descricao: string;
  categoria: CategoriaDemanda;
  localidade: string;
  data_inicio: string;
  data_fim: string;
  quantidade: string;
  unidade: string;
  status: Extract<
    StatusDemanda,
    'rascunho' | 'aberta'
  >;
};

type EstadoContexto =
  | {
      tipo: 'carregando';
    }
  | {
      tipo: 'erro';
      mensagem: string;
    }
  | {
      tipo: 'pronto';
      contexto: ContextoDemandas;
    };

const FORMULARIO_INICIAL: FormularioDemanda = {
  titulo: '',
  descricao: '',
  categoria: 'hospedagem',
  localidade: '',
  data_inicio: '',
  data_fim: '',
  quantidade: '1',
  unidade: 'unidade',
  status: 'rascunho',
};

const CAMPO =
  'min-h-12 w-full rounded-xl border border-white/10 bg-[#07110E] ' +
  'px-4 text-sm text-[#F0F0E8] outline-none transition-colors ' +
  'placeholder:text-white/30 focus:border-[#E3A144] ' +
  'focus:ring-2 focus:ring-[#E3A144]/20 disabled:cursor-not-allowed ' +
  'disabled:opacity-50 motion-reduce:transition-none';

const BOTAO =
  'inline-flex min-h-12 items-center justify-center rounded-xl ' +
  'border border-white/15 px-5 text-sm font-semibold text-[#EDEDE3] ' +
  'transition-colors hover:bg-white/5 focus-visible:outline ' +
  'focus-visible:outline-2 focus-visible:outline-offset-4 ' +
  'focus-visible:outline-[#E3A144] disabled:cursor-not-allowed ' +
  'disabled:opacity-40 motion-reduce:transition-none';

export default function NovaDemandaPage() {
  const router = useRouter();

  const [formulario, setFormulario] =
    useState<FormularioDemanda>(
      FORMULARIO_INICIAL,
    );

  const [estadoContexto, setEstadoContexto] =
    useState<EstadoContexto>({
      tipo: 'carregando',
    });

  const [salvando, setSalvando] =
    useState(false);

  const [erroFormulario, setErroFormulario] =
    useState<string | null>(null);

  useEffect(() => {
    const controller =
      new AbortController();

    let ativo = true;

    async function carregar(): Promise<void> {
      try {
        const contexto =
          await obterContextoDemandas(
            controller.signal,
          );

        if (
          !ativo ||
          controller.signal.aborted
        ) {
          return;
        }

        if (!contexto.pode_gerenciar) {
          setEstadoContexto({
            tipo: 'erro',
            mensagem:
              'Seu perfil permite consultar demandas, mas não criar ou alterar registros.',
          });

          return;
        }

        setEstadoContexto({
          tipo: 'pronto',
          contexto,
        });
      } catch (erro: unknown) {
        if (
          !ativo ||
          controller.signal.aborted
        ) {
          return;
        }

        setEstadoContexto({
          tipo: 'erro',
          mensagem:
            mensagemErroDemandas(erro),
        });
      }
    }

    void carregar();

    return () => {
      ativo = false;
      controller.abort();
    };
  }, []);

  function atualizarCampo<
    K extends keyof FormularioDemanda,
  >(
    campo: K,
    valor: FormularioDemanda[K],
  ): void {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));

    if (erroFormulario) {
      setErroFormulario(null);
    }
  }

  async function salvar(
    evento: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    evento.preventDefault();

    if (
      estadoContexto.tipo !== 'pronto'
    ) {
      return;
    }

    if (salvando) {
      return;
    }

    setErroFormulario(null);

    const quantidade = Number(
      formulario.quantidade.replace(
        ',',
        '.',
      ),
    );

    const dados: DadosDemanda = {
      titulo: formulario.titulo,
      descricao:
        formulario.descricao.trim() ||
        null,
      categoria: formulario.categoria,
      localidade:
        formulario.localidade,
      data_inicio:
        formulario.data_inicio ||
        null,
      data_fim:
        formulario.data_fim || null,
      quantidade,
      unidade: formulario.unidade,
      status: formulario.status,
    };

    setSalvando(true);

    try {
      await criarDemanda(
        estadoContexto.contexto,
        dados,
      );

      router.push('/demandas');
      router.refresh();
    } catch (erro: unknown) {
      setErroFormulario(
        mensagemErroDemandas(erro),
      );

      setSalvando(false);
    }
  }

  const bloqueado =
    salvando ||
    estadoContexto.tipo !== 'pronto';

  return (
    <main className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      <header className="border-b border-white/10 bg-[#091510]">
        <div className="mx-auto max-w-5xl px-4 py-7 sm:px-5 md:px-8 md:py-10">
          <Link
            href="/demandas"
            className="text-sm text-[#B4C8BB] transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E3A144]"
          >
            ← Voltar para demandas
          </Link>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#E3A144]">
              Operação da empresa
            </p>

            <h1
              className="mt-2 text-4xl tracking-tight md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Nova demanda
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#B4C8BB]">
              Registre uma necessidade de
              contratação para organizar a
              operação da sua empresa.
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-5 md:px-8 md:py-8">
        {estadoContexto.tipo ===
          'carregando' && (
          <div
            role="status"
            className="rounded-2xl border border-white/10 bg-[#0A1713] p-6"
          >
            <div className="h-5 w-48 animate-pulse rounded bg-white/10" />
            <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-white/5" />
          </div>
        )}

        {estadoContexto.tipo === 'erro' && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-400/20 bg-[#0A1713] p-6 md:p-8"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-300">
              Acesso indisponível
            </p>

            <h2
              className="mt-2 text-2xl text-[#F0F0E8]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Não foi possível abrir o cadastro
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[#B4C8BB]">
              {estadoContexto.mensagem}
            </p>

            <Link
              href="/demandas"
              className={`${BOTAO} mt-6`}
            >
              Voltar para demandas
            </Link>
          </div>
        )}

        {estadoContexto.tipo ===
          'pronto' && (
          <form
            onSubmit={salvar}
            className="space-y-6"
          >
            <section className="rounded-2xl border border-white/10 bg-[#0A1713] p-5 md:p-7">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  Identificação
                </p>

                <h2
                  className="mt-2 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  O que sua empresa precisa?
                </h2>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label
                    htmlFor="titulo"
                    className="mb-2 block text-sm font-medium text-[#EDEDE3]"
                  >
                    Título
                  </label>

                  <input
                    id="titulo"
                    type="text"
                    required
                    minLength={3}
                    maxLength={160}
                    value={formulario.titulo}
                    onChange={(evento) =>
                      atualizarCampo(
                        'titulo',
                        evento.target.value,
                      )
                    }
                    disabled={bloqueado}
                    placeholder="Ex.: Hospedagem para grupo de pesca"
                    className={CAMPO}
                  />

                  <p className="mt-2 text-xs text-[#B4C8BB]">
                    Use um título objetivo para
                    identificar rapidamente a
                    necessidade.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="categoria"
                    className="mb-2 block text-sm font-medium text-[#EDEDE3]"
                  >
                    Categoria
                  </label>

                  <select
                    id="categoria"
                    value={
                      formulario.categoria
                    }
                    onChange={(evento) =>
                      atualizarCampo(
                        'categoria',
                        evento.target
                          .value as CategoriaDemanda,
                      )
                    }
                    disabled={bloqueado}
                    className={CAMPO}
                  >
                    {Object.entries(
                      CATEGORIAS_DEMANDA,
                    ).map(
                      ([valor, nome]) => (
                        <option
                          key={valor}
                          value={valor}
                        >
                          {nome}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="localidade"
                    className="mb-2 block text-sm font-medium text-[#EDEDE3]"
                  >
                    Localidade
                  </label>

                  <input
                    id="localidade"
                    type="text"
                    required
                    minLength={2}
                    maxLength={200}
                    value={
                      formulario.localidade
                    }
                    onChange={(evento) =>
                      atualizarCampo(
                        'localidade',
                        evento.target.value,
                      )
                    }
                    disabled={bloqueado}
                    placeholder="Ex.: Barcelos - AM"
                    className={CAMPO}
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="descricao"
                    className="mb-2 block text-sm font-medium text-[#EDEDE3]"
                  >
                    Descrição
                  </label>

                  <textarea
                    id="descricao"
                    rows={5}
                    maxLength={5000}
                    value={
                      formulario.descricao
                    }
                    onChange={(evento) =>
                      atualizarCampo(
                        'descricao',
                        evento.target.value,
                      )
                    }
                    disabled={bloqueado}
                    placeholder="Descreva os detalhes da contratação, perfil desejado, necessidades especiais ou outras informações relevantes."
                    className={`${CAMPO} resize-y py-3`}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#0A1713] p-5 md:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                Quantidade e período
              </p>

              <h2
                className="mt-2 text-2xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Dimensione a necessidade
              </h2>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="quantidade"
                    className="mb-2 block text-sm font-medium text-[#EDEDE3]"
                  >
                    Quantidade
                  </label>

                  <input
                    id="quantidade"
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={
                      formulario.quantidade
                    }
                    onChange={(evento) =>
                      atualizarCampo(
                        'quantidade',
                        evento.target.value,
                      )
                    }
                    disabled={bloqueado}
                    className={CAMPO}
                  />
                </div>

                <div>
                  <label
                    htmlFor="unidade"
                    className="mb-2 block text-sm font-medium text-[#EDEDE3]"
                  >
                    Unidade
                  </label>

                  <input
                    id="unidade"
                    type="text"
                    required
                    minLength={1}
                    maxLength={40}
                    value={formulario.unidade}
                    onChange={(evento) =>
                      atualizarCampo(
                        'unidade',
                        evento.target.value,
                      )
                    }
                    disabled={bloqueado}
                    placeholder="Ex.: quartos, vagas, barcos"
                    className={CAMPO}
                  />
                </div>

                <div>
                  <label
                    htmlFor="data_inicio"
                    className="mb-2 block text-sm font-medium text-[#EDEDE3]"
                  >
                    Início
                  </label>

                  <input
                    id="data_inicio"
                    type="date"
                    value={
                      formulario.data_inicio
                    }
                    onChange={(evento) =>
                      atualizarCampo(
                        'data_inicio',
                        evento.target.value,
                      )
                    }
                    disabled={bloqueado}
                    className={CAMPO}
                  />
                </div>

                <div>
                  <label
                    htmlFor="data_fim"
                    className="mb-2 block text-sm font-medium text-[#EDEDE3]"
                  >
                    Final
                  </label>

                  <input
                    id="data_fim"
                    type="date"
                    value={formulario.data_fim}
                    onChange={(evento) =>
                      atualizarCampo(
                        'data_fim',
                        evento.target.value,
                      )
                    }
                    disabled={bloqueado}
                    className={CAMPO}
                  />
                </div>
              </div>

              <p className="mt-4 text-xs leading-5 text-[#B4C8BB]">
                O período é opcional. Se informar
                uma data, informe também a outra.
              </p>
            </section>

            <section className="rounded-2xl border border-[#E3A144]/15 bg-[#0A1713] p-5 md:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                Situação
              </p>

              <h2
                className="mt-2 text-2xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Como deseja salvar?
              </h2>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <label
                  className={`cursor-pointer rounded-2xl border p-4 transition ${
                    formulario.status ===
                    'rascunho'
                      ? 'border-[#E3A144]/35 bg-[#E3A144]/[0.07]'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value="rascunho"
                    checked={
                      formulario.status ===
                      'rascunho'
                    }
                    onChange={() =>
                      atualizarCampo(
                        'status',
                        'rascunho',
                      )
                    }
                    disabled={bloqueado}
                    className="sr-only"
                  />

                  <span className="block text-sm font-semibold text-[#F0F0E8]">
                    Salvar como rascunho
                  </span>

                  <span className="mt-2 block text-xs leading-5 text-[#B4C8BB]">
                    A necessidade fica registrada
                    para revisão antes de ser
                    considerada aberta.
                  </span>
                </label>

                <label
                  className={`cursor-pointer rounded-2xl border p-4 transition ${
                    formulario.status ===
                    'aberta'
                      ? 'border-emerald-400/30 bg-emerald-400/[0.06]'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value="aberta"
                    checked={
                      formulario.status ===
                      'aberta'
                    }
                    onChange={() =>
                      atualizarCampo(
                        'status',
                        'aberta',
                      )
                    }
                    disabled={bloqueado}
                    className="sr-only"
                  />

                  <span className="block text-sm font-semibold text-[#F0F0E8]">
                    Abrir demanda
                  </span>

                  <span className="mt-2 block text-xs leading-5 text-[#B4C8BB]">
                    Marca a necessidade como ativa
                    dentro da operação da empresa.
                  </span>
                </label>
              </div>

              <div className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                <p className="text-xs leading-5 text-[#B4C8BB]">
                  Mesmo uma demanda aberta
                  permanece privada nesta etapa.
                  Ela não será publicada
                  automaticamente no portal ou no
                  feed da Rede ERN.
                </p>
              </div>
            </section>

            {erroFormulario && (
              <div
                role="alert"
                className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.05] px-5 py-4"
              >
                <p className="text-sm font-semibold text-rose-200">
                  Não foi possível salvar a
                  demanda.
                </p>

                <p className="mt-2 text-sm leading-6 text-rose-100/70">
                  {erroFormulario}
                </p>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-end">
              <Link
                href="/demandas"
                className={BOTAO}
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={bloqueado}
                className={`${BOTAO} border-[#E3A144] bg-[#E3A144] text-[#07130F] hover:bg-[#F0B35C]`}
              >
                {salvando
                  ? 'Salvando...'
                  : formulario.status ===
                      'aberta'
                    ? 'Criar e abrir demanda'
                    : 'Salvar rascunho'}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
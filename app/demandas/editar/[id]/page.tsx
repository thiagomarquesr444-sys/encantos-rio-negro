'use client';

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';

import Link from 'next/link';

import {
  useParams,
  useRouter,
} from 'next/navigation';

import {
  CATEGORIAS_DEMANDA,
  PUBLICOS_ALVO,
  STATUS_DEMANDA,
  TIPOS_COMBUSTIVEL,
  atualizarDemanda,
  excluirDemanda,
  mensagemErroDemandas,
  metodoEstimativaDaCategoria,
  obterContextoDemandas,
  obterDemandaPorId,
  type CategoriaDemanda,
  type ContextoDemandas,
  type DadosDemanda,
  type Demanda,
  type PublicoAlvo,
  type StatusDemanda,
  type TipoCombustivel,
} from '@/lib/demandas';

type Formulario = {
  titulo: string;
  descricao: string;

  categoria: CategoriaDemanda;

  localidade: string;

  data_inicio: string;
  data_fim: string;

  quantidade: string;
  unidade: string;

  publico_alvo: PublicoAlvo | '';

  pessoas_estimadas: string;
  dias_estimados: string;
  consumo_pessoa_dia: string;

  tipo_combustivel:
    | TipoCombustivel
    | '';

  horas_motor_dia: string;
  consumo_litros_hora: string;

  margem_percentual: string;

  status: StatusDemanda;
};

type Estado =
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
      demanda: Demanda;
    };

const CAMPO =
  'min-h-12 w-full rounded-xl border border-white/10 bg-[#07110E] ' +
  'px-4 text-sm text-[#F0F0E8] outline-none transition-colors ' +
  'placeholder:text-white/30 focus:border-[#E3A144] ' +
  'focus:ring-2 focus:ring-[#E3A144]/20 disabled:cursor-not-allowed ' +
  'disabled:opacity-50';

const BOTAO =
  'inline-flex min-h-12 items-center justify-center rounded-xl ' +
  'border border-white/15 px-5 text-sm font-semibold text-[#EDEDE3] ' +
  'transition-colors hover:bg-white/5 disabled:cursor-not-allowed ' +
  'disabled:opacity-40';

function numeroTexto(
  valor: number | null,
): string {
  return valor === null
    ? ''
    : String(valor);
}

function numeroFormulario(
  valor: string,
): number | null {
  if (!valor.trim()) {
    return null;
  }

  const numero = Number(
    valor.replace(',', '.'),
  );

  return Number.isFinite(numero)
    ? numero
    : null;
}

function arredondar(
  valor: number,
): number {
  return Math.round(valor * 100) / 100;
}

function diasInclusivos(
  inicio: string,
  fim: string,
): number | null {
  if (
    !inicio ||
    !fim ||
    fim < inicio
  ) {
    return null;
  }

  const inicioMs = new Date(
    `${inicio}T12:00:00Z`,
  ).getTime();

  const fimMs = new Date(
    `${fim}T12:00:00Z`,
  ).getTime();

  if (
    !Number.isFinite(inicioMs) ||
    !Number.isFinite(fimMs)
  ) {
    return null;
  }

  return (
    Math.floor(
      (fimMs - inicioMs) /
        86_400_000,
    ) + 1
  );
}

function paraFormulario(
  demanda: Demanda,
): Formulario {
  return {
    titulo: demanda.titulo,

    descricao:
      demanda.descricao ?? '',

    categoria:
      demanda.categoria,

    localidade:
      demanda.localidade,

    data_inicio:
      demanda.data_inicio ?? '',

    data_fim:
      demanda.data_fim ?? '',

    quantidade:
      String(demanda.quantidade),

    unidade:
      demanda.unidade,

    publico_alvo:
      demanda.publico_alvo ?? '',

    pessoas_estimadas:
      numeroTexto(
        demanda.pessoas_estimadas,
      ),

    dias_estimados:
      numeroTexto(
        demanda.dias_estimados,
      ),

    consumo_pessoa_dia:
      numeroTexto(
        demanda.consumo_pessoa_dia,
      ),

    tipo_combustivel:
      demanda.tipo_combustivel ??
      '',

    horas_motor_dia:
      numeroTexto(
        demanda.horas_motor_dia,
      ),

    consumo_litros_hora:
      numeroTexto(
        demanda.consumo_litros_hora,
      ),

    margem_percentual:
      String(
        demanda.margem_percentual,
      ),

    status:
      demanda.status,
  };
}

export default function EditarDemandaPage() {
  const params =
    useParams<{ id: string }>();

  const router = useRouter();

  const id = params.id;

  const [estado, setEstado] =
    useState<Estado>({
      tipo: 'carregando',
    });

  const [
    formulario,
    setFormulario,
  ] = useState<Formulario | null>(
    null,
  );

  const [
    salvando,
    setSalvando,
  ] = useState(false);

  const [
    excluindo,
    setExcluindo,
  ] = useState(false);

  const [
    erroFormulario,
    setErroFormulario,
  ] = useState<string | null>(
    null,
  );

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

        if (
          !contexto.pode_gerenciar
        ) {
          setEstado({
            tipo: 'erro',
            mensagem:
              'Seu perfil não possui permissão para gerenciar demandas.',
          });

          return;
        }

        const demanda =
          await obterDemandaPorId(
            contexto,
            id,
            controller.signal,
          );

        if (
          !ativo ||
          controller.signal.aborted
        ) {
          return;
        }

        setFormulario(
          paraFormulario(demanda),
        );

        setEstado({
          tipo: 'pronto',
          contexto,
          demanda,
        });
      } catch (erro: unknown) {
        if (
          !ativo ||
          controller.signal.aborted
        ) {
          return;
        }

        setEstado({
          tipo: 'erro',
          mensagem:
            mensagemErroDemandas(
              erro,
            ),
        });
      }
    }

    void carregar();

    return () => {
      ativo = false;
      controller.abort();
    };
  }, [id]);

  const metodoEstimativa =
    formulario
      ? metodoEstimativaDaCategoria(
          formulario.categoria,
        )
      : 'manual';

  const previsao =
    useMemo(() => {
      if (!formulario) {
        return null;
      }

      if (
        metodoEstimativa ===
        'manual'
      ) {
        return numeroFormulario(
          formulario.quantidade,
        );
      }

      const dias =
        numeroFormulario(
          formulario.dias_estimados,
        );

      if (
        dias === null ||
        dias <= 0
      ) {
        return null;
      }

      if (
        metodoEstimativa ===
        'pessoa_dia'
      ) {
        const pessoas =
          numeroFormulario(
            formulario.pessoas_estimadas,
          );

        const consumo =
          numeroFormulario(
            formulario.consumo_pessoa_dia,
          );

        if (
          pessoas === null ||
          consumo === null ||
          pessoas <= 0 ||
          consumo <= 0
        ) {
          return null;
        }

        return arredondar(
          pessoas *
            dias *
            consumo,
        );
      }

      const horas =
        numeroFormulario(
          formulario.horas_motor_dia,
        );

      const consumo =
        numeroFormulario(
          formulario.consumo_litros_hora,
        );

      const margem =
        numeroFormulario(
          formulario.margem_percentual,
        ) ?? 0;

      if (
        horas === null ||
        consumo === null ||
        horas <= 0 ||
        consumo <= 0 ||
        margem < 0 ||
        margem > 100
      ) {
        return null;
      }

      return arredondar(
        dias *
          horas *
          consumo *
          (1 + margem / 100),
      );
    }, [
      formulario,
      metodoEstimativa,
    ]);

  if (!formulario) {
    if (
      estado.tipo === 'erro'
    ) {
      return (
        <main className="min-h-screen bg-[#07110E] p-5 text-[#EDEDE3] md:p-8">
          <div className="mx-auto max-w-3xl rounded-2xl border border-rose-400/20 bg-[#0A1713] p-6 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-rose-300">
              Demanda indisponível
            </p>

            <h1
              className="mt-2 text-2xl text-[#F0F0E8]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Não foi possível abrir
              a demanda
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#B4C8BB]">
              {estado.mensagem}
            </p>

            <Link
              href="/demandas"
              className={`${BOTAO} mt-6`}
            >
              Voltar para demandas
            </Link>
          </div>
        </main>
      );
    }

    return (
      <main className="min-h-screen bg-[#07110E] p-5 text-[#EDEDE3] md:p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#0A1713] p-6">
          <p className="text-sm text-[#B4C8BB]">
            Carregando demanda...
          </p>
        </div>
      </main>
    );
  }

  /*
   * Snapshot não nulo.
   *
   * O estado "formulario" é nullable durante o carregamento,
   * mas a partir deste ponto a função já retornou nos casos
   * em que ele era null.
   *
   * Usamos uma constante local para que o TypeScript também
   * preserve essa garantia dentro das funções internas.
   */
  const formularioAtual = formulario;

  function atualizarCampo<
    K extends keyof Formulario,
  >(
    campo: K,
    valor: Formulario[K],
  ): void {
    setFormulario(
      (anterior) => {
        if (!anterior) {
          return anterior;
        }

        return {
          ...anterior,
          [campo]: valor,
        };
      },
    );

    setErroFormulario(null);
  }

  function atualizarPeriodo(
    campo:
      | 'data_inicio'
      | 'data_fim',
    valor: string,
  ): void {
    setFormulario(
      (anterior) => {
        if (!anterior) {
          return anterior;
        }

        const proximo = {
          ...anterior,
          [campo]: valor,
        };

        const dias =
          diasInclusivos(
            proximo.data_inicio,
            proximo.data_fim,
          );

        if (
          dias !== null &&
          metodoEstimativaDaCategoria(
            proximo.categoria,
          ) !== 'manual'
        ) {
          proximo.dias_estimados =
            String(dias);
        }

        return proximo;
      },
    );

    setErroFormulario(null);
  }

  function alterarCategoria(
    categoria: CategoriaDemanda,
  ): void {
    setFormulario(
      (anterior) => {
        if (!anterior) {
          return anterior;
        }

        if (
          categoria ===
          'alimentacao'
        ) {
          return {
            ...anterior,
            categoria,
            unidade:
              'refeições',
            publico_alvo:
              anterior.publico_alvo &&
              anterior.publico_alvo !==
                'operacao'
                ? anterior.publico_alvo
                : 'ambos',
            tipo_combustivel:
              '',
            margem_percentual:
              '0',
          };
        }

        if (
          categoria ===
          'bebidas'
        ) {
          return {
            ...anterior,
            categoria,
            unidade: 'litros',
            publico_alvo:
              anterior.publico_alvo &&
              anterior.publico_alvo !==
                'operacao'
                ? anterior.publico_alvo
                : 'ambos',
            tipo_combustivel:
              '',
            margem_percentual:
              '0',
          };
        }

        if (
          categoria ===
          'combustivel'
        ) {
          return {
            ...anterior,
            categoria,
            unidade: 'litros',
            publico_alvo: '',
            tipo_combustivel:
              anterior.tipo_combustivel ||
              'gasolina',
            margem_percentual:
              anterior.margem_percentual &&
              Number(
                anterior.margem_percentual,
              ) > 0
                ? anterior.margem_percentual
                : '10',
          };
        }

        return {
          ...anterior,
          categoria,
          publico_alvo: '',
          tipo_combustivel: '',
          pessoas_estimadas: '',
          consumo_pessoa_dia: '',
          horas_motor_dia: '',
          consumo_litros_hora: '',
          margem_percentual: '0',
          unidade:
            anterior.unidade ||
            'unidade',
        };
      },
    );

    setErroFormulario(null);
  }

  function montarDados(
    status: StatusDemanda,
  ): DadosDemanda {
    return {
      titulo:
        formularioAtual.titulo,

      descricao:
        formularioAtual.descricao.trim()
          ? formularioAtual.descricao
          : null,

      categoria:
        formularioAtual.categoria,

      localidade:
        formularioAtual.localidade,

      data_inicio:
        formularioAtual.data_inicio ||
        null,

      data_fim:
        formularioAtual.data_fim ||
        null,

      quantidade:
        previsao ??
        numeroFormulario(
          formularioAtual.quantidade,
        ) ??
        0,

      unidade:
        formularioAtual.unidade,

      status,

      metodo_estimativa:
        metodoEstimativa,

      publico_alvo:
        formularioAtual.publico_alvo ||
        null,

      pessoas_estimadas:
        numeroFormulario(
          formularioAtual.pessoas_estimadas,
        ),

      dias_estimados:
        numeroFormulario(
          formularioAtual.dias_estimados,
        ),

      consumo_pessoa_dia:
        numeroFormulario(
          formularioAtual.consumo_pessoa_dia,
        ),

      tipo_combustivel:
        formularioAtual.tipo_combustivel ||
        null,

      horas_motor_dia:
        numeroFormulario(
          formularioAtual.horas_motor_dia,
        ),

      consumo_litros_hora:
        numeroFormulario(
          formularioAtual.consumo_litros_hora,
        ),

      margem_percentual:
        numeroFormulario(
          formularioAtual.margem_percentual,
        ) ?? 0,
    };
  }

  async function salvarComStatus(
    status: StatusDemanda,
  ): Promise<void> {
    if (
      estado.tipo !== 'pronto' ||
      salvando
    ) {
      return;
    }

    const contextoAtual =
      estado.contexto;

    setSalvando(true);
    setErroFormulario(null);

    try {
      const atualizada =
        await atualizarDemanda(
          contextoAtual,
          id,
          montarDados(status),
        );

      setFormulario(
        paraFormulario(atualizada),
      );

      setEstado({
        tipo: 'pronto',
        contexto:
          contextoAtual,
        demanda: atualizada,
      });
    } catch (erro: unknown) {
      setErroFormulario(
        mensagemErroDemandas(erro),
      );
    } finally {
      setSalvando(false);
    }
  }

  async function salvar(
    evento: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    evento.preventDefault();

    await salvarComStatus(
      formularioAtual.status,
    );
  }

  async function excluir(): Promise<void> {
    if (
      estado.tipo !== 'pronto' ||
      excluindo
    ) {
      return;
    }

    const confirmou =
      window.confirm(
        'Deseja realmente excluir esta demanda? Esta ação não poderá ser desfeita.',
      );

    if (!confirmou) {
      return;
    }

    const contextoAtual =
      estado.contexto;

    setExcluindo(true);
    setErroFormulario(null);

    try {
      await excluirDemanda(
        contextoAtual,
        id,
      );

      router.push(
        '/demandas',
      );

      router.refresh();
    } catch (erro: unknown) {
      setErroFormulario(
        mensagemErroDemandas(erro),
      );

      setExcluindo(false);
    }
  }

  const statusAtual =
    estado.tipo === 'pronto'
      ? estado.demanda.status
      : formularioAtual.status;

  const terminal =
    statusAtual ===
      'encerrada' ||
    statusAtual ===
      'cancelada';

  const podeExcluir =
    statusAtual ===
      'rascunho' ||
    statusAtual ===
      'cancelada';

  return (
    <main className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      <header className="border-b border-white/10 bg-[#091510]">
        <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
          <Link
            href="/demandas"
            className="text-sm text-[#B4C8BB] transition hover:text-white"
          >
            ← Demandas
          </Link>

          <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-[#E3A144]">
            Gerenciamento operacional
          </p>

          <h1
            className="mt-2 break-words text-4xl md:text-5xl"
            style={{
              fontFamily:
                'var(--font-fraunces), serif',
            }}
          >
            {formularioAtual.titulo}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs">
              {
                STATUS_DEMANDA[
                  statusAtual
                ]
              }
            </span>

            <span className="text-xs text-[#B4C8BB]">
              {
                CATEGORIAS_DEMANDA[
                  formularioAtual
                    .categoria
                ]
              }
            </span>
          </div>
        </div>
      </header>

      <form
        onSubmit={salvar}
        className="mx-auto max-w-5xl space-y-6 px-4 py-7 md:px-8"
      >
        <section className="rounded-2xl border border-white/10 bg-[#0A1713] p-5 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#E3A144]">
            Identificação
          </p>

          <h2
            className="mt-2 text-2xl text-[#F0F0E8]"
            style={{
              fontFamily:
                'var(--font-fraunces), serif',
            }}
          >
            Dados da demanda
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="titulo"
                className="mb-2 block text-sm"
              >
                Título
              </label>

              <input
                id="titulo"
                required
                minLength={3}
                maxLength={160}
                disabled={terminal}
                value={
                  formularioAtual.titulo
                }
                onChange={(evento) =>
                  atualizarCampo(
                    'titulo',
                    evento.target.value,
                  )
                }
                className={CAMPO}
              />
            </div>

            <div>
              <label
                htmlFor="categoria"
                className="mb-2 block text-sm"
              >
                Categoria
              </label>

              <select
                id="categoria"
                disabled={terminal}
                value={
                  formularioAtual.categoria
                }
                onChange={(evento) =>
                  alterarCategoria(
                    evento.target
                      .value as CategoriaDemanda,
                  )
                }
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
                className="mb-2 block text-sm"
              >
                Localidade
              </label>

              <input
                id="localidade"
                required
                minLength={2}
                maxLength={200}
                disabled={terminal}
                value={
                  formularioAtual.localidade
                }
                onChange={(evento) =>
                  atualizarCampo(
                    'localidade',
                    evento.target.value,
                  )
                }
                className={CAMPO}
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="descricao"
                className="mb-2 block text-sm"
              >
                Descrição
              </label>

              <textarea
                id="descricao"
                disabled={terminal}
                rows={5}
                maxLength={5000}
                value={
                  formularioAtual.descricao
                }
                onChange={(evento) =>
                  atualizarCampo(
                    'descricao',
                    evento.target.value,
                  )
                }
                className={`${CAMPO} resize-y py-3`}
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0A1713] p-5 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#7C9C87]">
            Viagem
          </p>

          <h2
            className="mt-2 text-2xl text-[#F0F0E8]"
            style={{
              fontFamily:
                'var(--font-fraunces), serif',
            }}
          >
            Período da operação
          </h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="data-inicio"
                className="mb-2 block text-sm"
              >
                Data de início
              </label>

              <input
                id="data-inicio"
                type="date"
                disabled={terminal}
                value={
                  formularioAtual.data_inicio
                }
                onChange={(evento) =>
                  atualizarPeriodo(
                    'data_inicio',
                    evento.target.value,
                  )
                }
                className={CAMPO}
              />
            </div>

            <div>
              <label
                htmlFor="data-fim"
                className="mb-2 block text-sm"
              >
                Data final
              </label>

              <input
                id="data-fim"
                type="date"
                disabled={terminal}
                value={
                  formularioAtual.data_fim
                }
                onChange={(evento) =>
                  atualizarPeriodo(
                    'data_fim',
                    evento.target.value,
                  )
                }
                className={CAMPO}
              />
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-[#B4C8BB]">
            Para demandas com cálculo
            automático, o sistema usa o
            período para atualizar a quantidade
            prevista de dias.
          </p>
        </section>

        {metodoEstimativa ===
          'pessoa_dia' && (
          <section className="rounded-2xl border border-[#E3A144]/20 bg-[#0A1713] p-5 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#E3A144]">
              Previsão automática
            </p>

            <h2
              className="mt-2 text-2xl text-[#F0F0E8]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Consumo por pessoa e
              por dia
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="publico"
                  className="mb-2 block text-sm"
                >
                  Público atendido
                </label>

                <select
                  id="publico"
                  disabled={terminal}
                  value={
                    formularioAtual.publico_alvo
                  }
                  onChange={(evento) =>
                    atualizarCampo(
                      'publico_alvo',
                      evento.target
                        .value as PublicoAlvo,
                    )
                  }
                  className={CAMPO}
                >
                  {Object.entries(
                    PUBLICOS_ALVO,
                  )
                    .filter(
                      ([valor]) =>
                        valor !==
                        'operacao',
                    )
                    .map(
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
                  htmlFor="pessoas"
                  className="mb-2 block text-sm"
                >
                  Quantidade de pessoas
                </label>

                <input
                  id="pessoas"
                  disabled={terminal}
                  type="number"
                  min="1"
                  step="1"
                  value={
                    formularioAtual.pessoas_estimadas
                  }
                  onChange={(evento) =>
                    atualizarCampo(
                      'pessoas_estimadas',
                      evento.target.value,
                    )
                  }
                  className={CAMPO}
                />
              </div>

              <div>
                <label
                  htmlFor="dias"
                  className="mb-2 block text-sm"
                >
                  Dias previstos
                </label>

                <input
                  id="dias"
                  disabled={terminal}
                  type="number"
                  min="1"
                  step="1"
                  value={
                    formularioAtual.dias_estimados
                  }
                  onChange={(evento) =>
                    atualizarCampo(
                      'dias_estimados',
                      evento.target.value,
                    )
                  }
                  className={CAMPO}
                />
              </div>

              <div>
                <label
                  htmlFor="consumo-pessoa"
                  className="mb-2 block text-sm"
                >
                  Consumo por pessoa/dia
                </label>

                <input
                  id="consumo-pessoa"
                  disabled={terminal}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={
                    formularioAtual.consumo_pessoa_dia
                  }
                  onChange={(evento) =>
                    atualizarCampo(
                      'consumo_pessoa_dia',
                      evento.target.value,
                    )
                  }
                  className={CAMPO}
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="unidade"
                  className="mb-2 block text-sm"
                >
                  Unidade
                </label>

                <input
                  id="unidade"
                  disabled={terminal}
                  required
                  maxLength={40}
                  value={
                    formularioAtual.unidade
                  }
                  onChange={(evento) =>
                    atualizarCampo(
                      'unidade',
                      evento.target.value,
                    )
                  }
                  className={CAMPO}
                />
              </div>
            </div>
          </section>
        )}

        {metodoEstimativa ===
          'combustivel_hora' && (
          <section className="rounded-2xl border border-[#E3A144]/20 bg-[#0A1713] p-5 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#E3A144]">
              Planejamento de
              combustível
            </p>

            <h2
              className="mt-2 text-2xl text-[#F0F0E8]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Previsão da embarcação
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="combustivel"
                  className="mb-2 block text-sm"
                >
                  Combustível
                </label>

                <select
                  id="combustivel"
                  disabled={terminal}
                  value={
                    formularioAtual.tipo_combustivel
                  }
                  onChange={(evento) =>
                    atualizarCampo(
                      'tipo_combustivel',
                      evento.target
                        .value as TipoCombustivel,
                    )
                  }
                  className={CAMPO}
                >
                  {Object.entries(
                    TIPOS_COMBUSTIVEL,
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
                  htmlFor="dias-combustivel"
                  className="mb-2 block text-sm"
                >
                  Dias previstos
                </label>

                <input
                  id="dias-combustivel"
                  disabled={terminal}
                  type="number"
                  min="1"
                  step="1"
                  value={
                    formularioAtual.dias_estimados
                  }
                  onChange={(evento) =>
                    atualizarCampo(
                      'dias_estimados',
                      evento.target.value,
                    )
                  }
                  className={CAMPO}
                />
              </div>

              <div>
                <label
                  htmlFor="horas-motor"
                  className="mb-2 block text-sm"
                >
                  Horas de motor por dia
                </label>

                <input
                  id="horas-motor"
                  disabled={terminal}
                  type="number"
                  min="0.01"
                  max="24"
                  step="0.01"
                  value={
                    formularioAtual.horas_motor_dia
                  }
                  onChange={(evento) =>
                    atualizarCampo(
                      'horas_motor_dia',
                      evento.target.value,
                    )
                  }
                  className={CAMPO}
                />
              </div>

              <div>
                <label
                  htmlFor="consumo-motor"
                  className="mb-2 block text-sm"
                >
                  Consumo médio (L/h)
                </label>

                <input
                  id="consumo-motor"
                  disabled={terminal}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={
                    formularioAtual.consumo_litros_hora
                  }
                  onChange={(evento) =>
                    atualizarCampo(
                      'consumo_litros_hora',
                      evento.target.value,
                    )
                  }
                  className={CAMPO}
                />
              </div>

              <div>
                <label
                  htmlFor="margem"
                  className="mb-2 block text-sm"
                >
                  Margem de segurança (%)
                </label>

                <input
                  id="margem"
                  disabled={terminal}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={
                    formularioAtual.margem_percentual
                  }
                  onChange={(evento) =>
                    atualizarCampo(
                      'margem_percentual',
                      evento.target.value,
                    )
                  }
                  className={CAMPO}
                />
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <p className="text-xs leading-5 text-[#B4C8BB]">
                A previsão considera horas
                efetivas de funcionamento do
                motor. A margem de segurança é
                adicionada ao consumo calculado
                para reduzir risco de falta de
                combustível durante a operação.
              </p>
            </div>
          </section>
        )}

        {metodoEstimativa ===
          'manual' && (
          <section className="rounded-2xl border border-white/10 bg-[#0A1713] p-5 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#7C9C87]">
              Dimensionamento
            </p>

            <h2
              className="mt-2 text-2xl text-[#F0F0E8]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Quantidade necessária
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="quantidade"
                  className="mb-2 block text-sm"
                >
                  Quantidade
                </label>

                <input
                  id="quantidade"
                  disabled={terminal}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={
                    formularioAtual.quantidade
                  }
                  onChange={(evento) =>
                    atualizarCampo(
                      'quantidade',
                      evento.target.value,
                    )
                  }
                  className={CAMPO}
                />
              </div>

              <div>
                <label
                  htmlFor="unidade-manual"
                  className="mb-2 block text-sm"
                >
                  Unidade
                </label>

                <input
                  id="unidade-manual"
                  disabled={terminal}
                  maxLength={40}
                  value={
                    formularioAtual.unidade
                  }
                  onChange={(evento) =>
                    atualizarCampo(
                      'unidade',
                      evento.target.value,
                    )
                  }
                  className={CAMPO}
                />
              </div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-[#E3A144]/20 bg-[#0A1713] p-5 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#E3A144]">
            Planejamento
          </p>

          <h2
            className="mt-2 text-2xl text-[#F0F0E8]"
            style={{
              fontFamily:
                'var(--font-fraunces), serif',
            }}
          >
            Quantidade prevista
          </h2>

          <strong
            className="mt-4 block text-4xl text-[#F0F0E8]"
            style={{
              fontFamily:
                'var(--font-fraunces), serif',
            }}
          >
            {previsao !== null
              ? `${previsao.toLocaleString(
                  'pt-BR',
                  {
                    maximumFractionDigits:
                      2,
                  },
                )} ${formularioAtual.unidade}`
              : 'Preencha os dados'}
          </strong>

          {metodoEstimativa ===
            'combustivel_hora' &&
            previsao !== null && (
              <p className="mt-3 text-sm text-[#B4C8BB]">
                Previsão total já incluindo a
                margem operacional informada.
              </p>
            )}
        </section>

        {erroFormulario && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.05] p-5"
          >
            <p className="font-semibold text-rose-200">
              Não foi possível concluir a
              operação.
            </p>

            <p className="mt-2 text-sm leading-6 text-rose-100/70">
              {erroFormulario}
            </p>
          </div>
        )}

        <section className="rounded-2xl border border-white/10 bg-[#0A1713] p-5 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#7C9C87]">
            Ciclo da demanda
          </p>

          <h2
            className="mt-2 text-2xl text-[#F0F0E8]"
            style={{
              fontFamily:
                'var(--font-fraunces), serif',
            }}
          >
            Ações
          </h2>

          <div className="mt-6 flex flex-wrap gap-3">
            {!terminal && (
              <button
                type="submit"
                disabled={salvando}
                className={`${BOTAO} border-[#E3A144]/30 bg-[#E3A144]/10 text-[#F4C77E]`}
              >
                {salvando
                  ? 'Salvando...'
                  : 'Salvar alterações'}
              </button>
            )}

            {statusAtual ===
              'rascunho' && (
              <button
                type="button"
                disabled={salvando}
                onClick={() =>
                  void salvarComStatus(
                    'aberta',
                  )
                }
                className={`${BOTAO} border-emerald-400/30 bg-emerald-400/10 text-emerald-200`}
              >
                Abrir demanda
              </button>
            )}

            {statusAtual ===
              'aberta' && (
              <>
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => {
                    if (
                      window.confirm(
                        'Confirmar encerramento desta demanda? Ela ficará preservada no histórico da operação.',
                      )
                    ) {
                      void salvarComStatus(
                        'encerrada',
                      );
                    }
                  }}
                  className={`${BOTAO} border-cyan-400/30 bg-cyan-400/10 text-cyan-200`}
                >
                  Encerrar demanda
                </button>

                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => {
                    if (
                      window.confirm(
                        'Confirmar cancelamento desta demanda?',
                      )
                    ) {
                      void salvarComStatus(
                        'cancelada',
                      );
                    }
                  }}
                  className={`${BOTAO} border-rose-400/30 bg-rose-400/10 text-rose-200`}
                >
                  Cancelar demanda
                </button>
              </>
            )}

            {statusAtual ===
              'rascunho' && (
              <button
                type="button"
                disabled={salvando}
                onClick={() => {
                  if (
                    window.confirm(
                      'Deseja cancelar este rascunho?',
                    )
                  ) {
                    void salvarComStatus(
                      'cancelada',
                    );
                  }
                }}
                className={`${BOTAO} border-rose-400/20 text-rose-200`}
              >
                Cancelar rascunho
              </button>
            )}

            {podeExcluir && (
              <button
                type="button"
                disabled={
                  excluindo ||
                  salvando
                }
                onClick={() =>
                  void excluir()
                }
                className={`${BOTAO} border-rose-500/30 text-rose-300`}
              >
                {excluindo
                  ? 'Excluindo...'
                  : 'Excluir demanda'}
              </button>
            )}
          </div>

          {terminal && (
            <div className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <p className="text-sm leading-6 text-[#B4C8BB]">
                Esta demanda está{' '}
                <strong className="text-[#EDEDE3]">
                  {STATUS_DEMANDA[
                    statusAtual
                  ].toLowerCase()}
                </strong>
                . O registro permanece preservado
                para manter o histórico da
                operação.
              </p>
            </div>
          )}
        </section>
      </form>
    </main>
  );
}
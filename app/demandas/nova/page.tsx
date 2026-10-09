'use client';

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  CATEGORIAS_DEMANDA,
  PUBLICOS_ALVO,
  TIPOS_COMBUSTIVEL,
  criarDemanda,
  mensagemErroDemandas,
  metodoEstimativaDaCategoria,
  obterContextoDemandas,
  type CategoriaDemanda,
  type ContextoDemandas,
  type DadosDemanda,
  type PublicoAlvo,
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

  publico_alvo:
    | PublicoAlvo
    | '';

  pessoas_estimadas: string;
  dias_estimados: string;
  consumo_pessoa_dia: string;

  tipo_combustivel:
    | TipoCombustivel
    | '';

  horas_motor_dia: string;

  consumo_litros_hora: string;

  margem_percentual: string;

  status:
    | 'rascunho'
    | 'aberta';
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

const FORMULARIO_INICIAL: Formulario = {
  titulo: '',
  descricao: '',

  categoria: 'alimentacao',

  localidade: '',

  data_inicio: '',
  data_fim: '',

  quantidade: '1',
  unidade: 'refeições',

  publico_alvo: 'ambos',

  pessoas_estimadas: '',
  dias_estimados: '',
  consumo_pessoa_dia: '3',

  tipo_combustivel: '',

  horas_motor_dia: '',
  consumo_litros_hora: '',
  margem_percentual: '10',

  status: 'rascunho',
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

function diasInclusivos(
  inicio: string,
  fim: string,
): number | null {
  if (!inicio || !fim || fim < inicio) {
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

function arredondar(
  valor: number,
): number {
  return Math.round(valor * 100) / 100;
}

export default function NovaDemandaPage() {
  const router = useRouter();

  const [
    formulario,
    setFormulario,
  ] = useState<Formulario>(
    FORMULARIO_INICIAL,
  );

  const [
    estadoContexto,
    setEstadoContexto,
  ] =
    useState<EstadoContexto>({
      tipo: 'carregando',
    });

  const [salvando, setSalvando] =
    useState(false);

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
          setEstadoContexto({
            tipo: 'erro',
            mensagem:
              'Seu perfil permite consultar demandas, mas não criar registros.',
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
  }, []);

  const metodoEstimativa =
    metodoEstimativaDaCategoria(
      formulario.categoria,
    );

  const previsao =
    useMemo(() => {
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

      const litrosHora =
        numeroFormulario(
          formulario.consumo_litros_hora,
        );

      const margem =
        numeroFormulario(
          formulario.margem_percentual,
        ) ?? 0;

      if (
        horas === null ||
        litrosHora === null ||
        horas <= 0 ||
        litrosHora <= 0 ||
        margem < 0
      ) {
        return null;
      }

      return arredondar(
        dias *
          horas *
          litrosHora *
          (1 + margem / 100),
      );
    }, [
      formulario,
      metodoEstimativa,
    ]);

  function atualizarCampo<
    K extends keyof Formulario,
  >(
    campo: K,
    valor: Formulario[K],
  ): void {
    setFormulario(
      (anterior) => ({
        ...anterior,
        [campo]: valor,
      }),
    );

    setErroFormulario(null);
  }

  function alterarCategoria(
    categoria: CategoriaDemanda,
  ): void {
    setFormulario(
      (anterior) => {
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
              'ambos',
            consumo_pessoa_dia:
              anterior.consumo_pessoa_dia ||
              '3',
            tipo_combustivel:
              '',
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
              'ambos',
            consumo_pessoa_dia:
              anterior.consumo_pessoa_dia ||
              '3',
            tipo_combustivel:
              '',
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
              anterior.margem_percentual ||
              '10',
          };
        }

        return {
          ...anterior,
          categoria,
          unidade: 'unidade',
          publico_alvo: '',
          tipo_combustivel: '',
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

  function montarDados(): DadosDemanda {
    return {
      titulo:
        formulario.titulo,

      descricao:
        formulario.descricao.trim()
          ? formulario.descricao
          : null,

      categoria:
        formulario.categoria,

      localidade:
        formulario.localidade,

      data_inicio:
        formulario.data_inicio ||
        null,

      data_fim:
        formulario.data_fim ||
        null,

      quantidade:
        previsao ??
        numeroFormulario(
          formulario.quantidade,
        ) ??
        0,

      unidade:
        formulario.unidade,

      status:
        formulario.status,

      metodo_estimativa:
        metodoEstimativa,

      publico_alvo:
        formulario.publico_alvo ||
        null,

      pessoas_estimadas:
        numeroFormulario(
          formulario.pessoas_estimadas,
        ),

      dias_estimados:
        numeroFormulario(
          formulario.dias_estimados,
        ),

      consumo_pessoa_dia:
        numeroFormulario(
          formulario.consumo_pessoa_dia,
        ),

      tipo_combustivel:
        formulario.tipo_combustivel ||
        null,

      horas_motor_dia:
        numeroFormulario(
          formulario.horas_motor_dia,
        ),

      consumo_litros_hora:
        numeroFormulario(
          formulario.consumo_litros_hora,
        ),

      margem_percentual:
        numeroFormulario(
          formulario.margem_percentual,
        ) ?? 0,
    };
  }

  async function salvar(
    evento: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    evento.preventDefault();

    if (
      estadoContexto.tipo !==
        'pronto' ||
      salvando
    ) {
      return;
    }

    setSalvando(true);
    setErroFormulario(null);

    try {
      await criarDemanda(
        estadoContexto.contexto,
        montarDados(),
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
    estadoContexto.tipo !==
      'pronto';

  return (
    <main className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      <header className="border-b border-white/10 bg-[#091510]">
        <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
          <Link
            href="/demandas"
            className="text-sm text-[#B4C8BB] hover:text-white"
          >
            ← Voltar para demandas
          </Link>

          <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-[#E3A144]">
            Planejamento operacional
          </p>

          <h1
            className="mt-2 text-4xl md:text-5xl"
            style={{
              fontFamily:
                'var(--font-fraunces), serif',
            }}
          >
            Nova demanda
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#B4C8BB]">
            Calcule previamente
            alimentação, bebidas,
            combustível ou registre
            outros recursos necessários
            para a viagem.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-7 md:px-8">
        {estadoContexto.tipo ===
          'erro' && (
          <div className="rounded-2xl border border-rose-400/20 bg-[#0A1713] p-6">
            {estadoContexto.mensagem}
          </div>
        )}

        {estadoContexto.tipo ===
          'carregando' && (
          <div className="rounded-2xl border border-white/10 bg-[#0A1713] p-6">
            Carregando...
          </div>
        )}

        {estadoContexto.tipo ===
          'pronto' && (
          <form
            onSubmit={salvar}
            className="space-y-6"
          >
            <section className="rounded-2xl border border-white/10 bg-[#0A1713] p-5 md:p-7">
              <h2 className="text-2xl">
                Identificação
              </h2>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm">
                    Título
                  </label>

                  <input
                    required
                    minLength={3}
                    maxLength={160}
                    value={
                      formulario.titulo
                    }
                    onChange={(
                      evento,
                    ) =>
                      atualizarCampo(
                        'titulo',
                        evento.target
                          .value,
                      )
                    }
                    className={CAMPO}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm">
                    Categoria
                  </label>

                  <select
                    value={
                      formulario.categoria
                    }
                    onChange={(
                      evento,
                    ) =>
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
                  <label className="mb-2 block text-sm">
                    Localidade
                  </label>

                  <input
                    required
                    minLength={2}
                    maxLength={200}
                    value={
                      formulario.localidade
                    }
                    onChange={(
                      evento,
                    ) =>
                      atualizarCampo(
                        'localidade',
                        evento.target
                          .value,
                      )
                    }
                    placeholder="Ex.: Barcelos - AM"
                    className={CAMPO}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm">
                    Descrição
                  </label>

                  <textarea
                    rows={5}
                    maxLength={5000}
                    value={
                      formulario.descricao
                    }
                    onChange={(
                      evento,
                    ) =>
                      atualizarCampo(
                        'descricao',
                        evento.target
                          .value,
                      )
                    }
                    className={`${CAMPO} py-3`}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#0A1713] p-5 md:p-7">
              <h2 className="text-2xl">
                Período da viagem
              </h2>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm">
                    Início
                  </label>

                  <input
                    type="date"
                    value={
                      formulario.data_inicio
                    }
                    onChange={(
                      evento,
                    ) =>
                      atualizarPeriodo(
                        'data_inicio',
                        evento.target
                          .value,
                      )
                    }
                    className={CAMPO}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm">
                    Final
                  </label>

                  <input
                    type="date"
                    value={
                      formulario.data_fim
                    }
                    onChange={(
                      evento,
                    ) =>
                      atualizarPeriodo(
                        'data_fim',
                        evento.target
                          .value,
                      )
                    }
                    className={CAMPO}
                  />
                </div>
              </div>
            </section>

            {metodoEstimativa ===
              'pessoa_dia' && (
              <section className="rounded-2xl border border-[#E3A144]/20 bg-[#0A1713] p-5 md:p-7">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#E3A144]">
                  Previsão automática
                </p>

                <h2 className="mt-2 text-2xl">
                  Consumo por pessoa
                  e por dia
                </h2>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm">
                      Público
                    </label>

                    <select
                      value={
                        formulario.publico_alvo
                      }
                      onChange={(
                        evento,
                      ) =>
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
                          ([
                            valor,
                            nome,
                          ]) => (
                            <option
                              key={
                                valor
                              }
                              value={
                                valor
                              }
                            >
                              {nome}
                            </option>
                          ),
                        )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm">
                      Pessoas
                    </label>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={
                        formulario.pessoas_estimadas
                      }
                      onChange={(
                        evento,
                      ) =>
                        atualizarCampo(
                          'pessoas_estimadas',
                          evento.target
                            .value,
                        )
                      }
                      className={CAMPO}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm">
                      Dias
                    </label>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={
                        formulario.dias_estimados
                      }
                      onChange={(
                        evento,
                      ) =>
                        atualizarCampo(
                          'dias_estimados',
                          evento.target
                            .value,
                        )
                      }
                      className={CAMPO}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm">
                      Consumo por
                      pessoa/dia
                    </label>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={
                        formulario.consumo_pessoa_dia
                      }
                      onChange={(
                        evento,
                      ) =>
                        atualizarCampo(
                          'consumo_pessoa_dia',
                          evento.target
                            .value,
                        )
                      }
                      className={CAMPO}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm">
                      Unidade
                    </label>

                    <input
                      required
                      value={
                        formulario.unidade
                      }
                      onChange={(
                        evento,
                      ) =>
                        atualizarCampo(
                          'unidade',
                          evento.target
                            .value,
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
                  Previsão de
                  combustível
                </p>

                <h2 className="mt-2 text-2xl">
                  Consumo estimado da
                  embarcação
                </h2>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm">
                      Combustível
                    </label>

                    <select
                      value={
                        formulario.tipo_combustivel
                      }
                      onChange={(
                        evento,
                      ) =>
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
                        ([
                          valor,
                          nome,
                        ]) => (
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
                    <label className="mb-2 block text-sm">
                      Dias
                    </label>

                    <input
                      required
                      type="number"
                      min="1"
                      step="1"
                      value={
                        formulario.dias_estimados
                      }
                      onChange={(
                        evento,
                      ) =>
                        atualizarCampo(
                          'dias_estimados',
                          evento.target
                            .value,
                        )
                      }
                      className={CAMPO}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm">
                      Horas de
                      motor/dia
                    </label>

                    <input
                      required
                      type="number"
                      min="0.01"
                      max="24"
                      step="0.01"
                      value={
                        formulario.horas_motor_dia
                      }
                      onChange={(
                        evento,
                      ) =>
                        atualizarCampo(
                          'horas_motor_dia',
                          evento.target
                            .value,
                        )
                      }
                      className={CAMPO}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm">
                      Consumo médio
                      (L/h)
                    </label>

                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={
                        formulario.consumo_litros_hora
                      }
                      onChange={(
                        evento,
                      ) =>
                        atualizarCampo(
                          'consumo_litros_hora',
                          evento.target
                            .value,
                        )
                      }
                      className={CAMPO}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm">
                      Margem de
                      segurança (%)
                    </label>

                    <input
                      required
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={
                        formulario.margem_percentual
                      }
                      onChange={(
                        evento,
                      ) =>
                        atualizarCampo(
                          'margem_percentual',
                          evento.target
                            .value,
                        )
                      }
                      className={CAMPO}
                    />
                  </div>
                </div>
              </section>
            )}

            {metodoEstimativa ===
              'manual' && (
              <section className="rounded-2xl border border-white/10 bg-[#0A1713] p-5 md:p-7">
                <h2 className="text-2xl">
                  Quantidade necessária
                </h2>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={
                      formulario.quantidade
                    }
                    onChange={(
                      evento,
                    ) =>
                      atualizarCampo(
                        'quantidade',
                        evento.target
                          .value,
                      )
                    }
                    className={CAMPO}
                  />

                  <input
                    required
                    value={
                      formulario.unidade
                    }
                    onChange={(
                      evento,
                    ) =>
                      atualizarCampo(
                        'unidade',
                        evento.target
                          .value,
                      )
                    }
                    className={CAMPO}
                  />
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-[#E3A144]/20 bg-[#0A1713] p-5 md:p-7">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#E3A144]">
                Quantidade prevista
              </p>

              <strong className="mt-3 block text-4xl text-[#F0F0E8]">
                {previsao !== null
                  ? `${previsao.toLocaleString(
                      'pt-BR',
                      {
                        maximumFractionDigits: 2,
                      },
                    )} ${formulario.unidade}`
                  : 'Preencha os dados'}
              </strong>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#0A1713] p-5 md:p-7">
              <h2 className="text-2xl">
                Situação
              </h2>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    valor:
                      'rascunho' as const,
                    titulo:
                      'Rascunho',
                  },
                  {
                    valor:
                      'aberta' as const,
                    titulo:
                      'Abrir demanda',
                  },
                ].map(
                  (opcao) => (
                    <label
                      key={
                        opcao.valor
                      }
                      className="cursor-pointer rounded-xl border border-white/10 p-4"
                    >
                      <input
                        type="radio"
                        className="mr-3"
                        checked={
                          formulario.status ===
                          opcao.valor
                        }
                        onChange={() =>
                          atualizarCampo(
                            'status',
                            opcao.valor,
                          )
                        }
                      />

                      {opcao.titulo}
                    </label>
                  ),
                )}
              </div>
            </section>

            {erroFormulario && (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.05] p-5 text-rose-200">
                {erroFormulario}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Link
                href="/demandas"
                className={BOTAO}
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={bloqueado}
                className={`${BOTAO} border-[#E3A144] bg-[#E3A144] text-[#07130F]`}
              >
                {salvando
                  ? 'Salvando...'
                  : 'Salvar demanda'}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
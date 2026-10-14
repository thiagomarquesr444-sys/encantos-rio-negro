'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Registro = {
  id: string;
  tipo: string | null;
  status: string | null;
  valor: number | string;
  categoria: string | null;
  data_vencimento: string | null;
  data_liquidacao: string | null;
};

type Mes = {
  chave: string;
  nome: string;
  recebido: number;
  pago: number;
  receber: number;
  pagar: number;
};

const moeda = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const normalizar = (valor: string | null) =>
  (valor ?? '').trim().toLowerCase();

function hojeManaus() {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Manaus',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const obter = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';

  return `${obter('year')}-${obter('month')}-${obter('day')}`;
}

function dataValida(valor: string | null): valor is string {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;

  const data = new Date(`${valor}T12:00:00Z`);

  return (
    Number.isFinite(data.getTime()) &&
    data.toISOString().slice(0, 10) === valor
  );
}

function centavos(valor: number | string) {
  const texto = String(valor).trim();

  // O campo numeric do banco utiliza ponto decimal.
  if (!/^\d+(?:\.\d{1,2})?$/.test(texto)) return null;

  const numero = Math.round(Number(texto) * 100);

  return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}

function mesesDoPeriodo(inicio: string, fim: string): Mes[] {
  const meses: Mes[] = [];
  let ano = Number(inicio.slice(0, 4));
  let mes = Number(inicio.slice(5, 7));

  while (
    `${ano}-${String(mes).padStart(2, '0')}` <= fim.slice(0, 7) &&
    meses.length < 24
  ) {
    const chave = `${ano}-${String(mes).padStart(2, '0')}`;

    meses.push({
      chave,
      nome: new Intl.DateTimeFormat('pt-BR', {
        month: 'short',
        year: '2-digit',
        timeZone: 'UTC',
      }).format(new Date(`${chave}-15T12:00:00Z`)),
      recebido: 0,
      pago: 0,
      receber: 0,
      pagar: 0,
    });

    mes += 1;
    if (mes === 13) {
      mes = 1;
      ano += 1;
    }
  }

  return meses;
}

const painel =
  'min-w-0 rounded-2xl border border-white/10 bg-[#0A1713] p-5';

const campo =
  'min-h-12 w-full rounded-xl border border-white/15 bg-[#07110E] px-3 text-sm text-[#EDEDE3] [color-scheme:dark]';

function Barras({
  meses,
  previsto = false,
}: {
  meses: Mes[];
  previsto?: boolean;
}) {
  const entrada = previsto ? 'receber' : 'recebido';
  const saida = previsto ? 'pagar' : 'pago';

  const maximo = Math.max(
    1,
    ...meses.flatMap((mes) => [mes[entrada], mes[saida]]),
  );

  return (
    <div className="mt-5 space-y-5">
      {meses.map((mes) => (
        <div key={mes.chave}>
          <p className="mb-2 text-xs text-white/65">{mes.nome}</p>

          {[
            {
              nome: previsto ? 'A receber' : 'Recebido',
              valor: mes[entrada],
              cor: 'bg-emerald-400',
            },
            {
              nome: previsto ? 'A pagar' : 'Pago',
              valor: mes[saida],
              cor: previsto ? 'bg-[#E3A144]' : 'bg-rose-400',
            },
          ].map((serie) => (
            <div key={serie.nome} className="mb-2">
              <div className="mb-1 flex flex-wrap justify-between gap-2 text-xs">
                <span className="text-white/65">{serie.nome}</span>
                <span className="tabular-nums">{moeda(serie.valor)}</span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full ${serie.cor}`}
                  style={{ width: `${(serie.valor / maximo) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function GraficosFinanceiros() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const [periodo, setPeriodo] = useState({ inicio: '', fim: '' });

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const hoje = hojeManaus();

        const { data: autenticacao, error: erroAuth } =
          await supabase.auth.getUser();

        if (erroAuth || !autenticacao.user) {
          throw new Error('Entre novamente para consultar o financeiro.');
        }

        const { data: perfil, error: erroPerfil } = await supabase
          .from('perfis')
          .select('empresa_id')
          .eq('id', autenticacao.user.id)
          .single();

        if (erroPerfil || !perfil?.empresa_id) {
          throw new Error('Não foi possível identificar sua empresa.');
        }

        const todos: Registro[] = [];
        let totalEsperado: number | null = null;

        for (let inicio = 0; inicio < 10000; inicio += 200) {
          const { data, error, count } = await supabase
            .from('financeiro')
            .select(
              'id,tipo,status,valor,categoria,data_vencimento,data_liquidacao',
              { count: 'exact' },
            )
            .eq('empresa_id', perfil.empresa_id)
            .order('id', { ascending: true })
            .range(inicio, inicio + 199);

          if (error) {
            throw new Error('Não foi possível consultar os dados financeiros.');
          }

          if (count === null || count > 10000) {
            throw new Error(
              'O volume de registros exige agregação no servidor. Os gráficos não serão exibidos parcialmente.',
            );
          }

          if (totalEsperado !== null && count !== totalEsperado) {
            throw new Error(
              'Os lançamentos mudaram durante a consulta. Atualize a análise.',
            );
          }

          totalEsperado = count;
          todos.push(...((data ?? []) as Registro[]));

          if (todos.length >= count) break;

          if (!data?.length) {
            throw new Error('A consulta ficou incompleta. Tente novamente.');
          }
        }

        if (
          todos.length !== totalEsperado ||
          new Set(todos.map((item) => item.id)).size !== todos.length
        ) {
          throw new Error('A consulta ficou inconsistente. Tente novamente.');
        }

        if (ativo) {
          setRegistros(todos);
          setPeriodo((atual) =>
            atual.inicio
              ? atual
              : { inicio: `${hoje.slice(0, 4)}-01-01`, fim: hoje },
          );
          setCarregando(false);
        }
      } catch (falha) {
        if (ativo) {
          setErro(
            falha instanceof Error
              ? falha.message
              : 'Não foi possível carregar a análise.',
          );
          setCarregando(false);
        }
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, [tentativa]);

  const periodoValido =
    dataValida(periodo.inicio) &&
    dataValida(periodo.fim) &&
    periodo.inicio <= periodo.fim &&
    Number(periodo.fim.slice(0, 4)) * 12 +
      Number(periodo.fim.slice(5, 7)) -
      (Number(periodo.inicio.slice(0, 4)) * 12 +
        Number(periodo.inicio.slice(5, 7))) < 24;

  const analise = useMemo(() => {
    const meses = periodoValido
      ? mesesDoPeriodo(periodo.inicio, periodo.fim)
      : [];

    const categorias = new Map<string, number>();
    let semLiquidacao = 0;
    let semVencimento = 0;
    let inconsistentes = 0;

    const noPeriodo = (data: string) =>
      data >= periodo.inicio && data <= periodo.fim;

    for (const item of registros) {
      const tipo = normalizar(item.tipo);
      const status = normalizar(item.status);
      const valor = centavos(item.valor);

      const liquidado =
        (tipo === 'receita' && status === 'recebido') ||
        (tipo === 'despesa' && status === 'pago');

      const pendente = status === 'pendente';

      if (
        !['receita', 'despesa'].includes(tipo) ||
        (!liquidado && !pendente) ||
        valor === null
      ) {
        inconsistentes += 1;
        continue;
      }

      const data = liquidado
        ? item.data_liquidacao
        : item.data_vencimento;

      if (!dataValida(data)) {
        if (liquidado) semLiquidacao += 1;
        else semVencimento += 1;
        continue;
      }

      if (liquidado && data > hojeManaus()) {
        inconsistentes += 1;
        continue;
      }

      if (!periodoValido || !noPeriodo(data)) continue;

      const mes = meses.find((entrada) => entrada.chave === data.slice(0, 7));
      if (!mes) continue;

      if (liquidado) {
        if (tipo === 'receita') mes.recebido += valor;
        else {
          mes.pago += valor;
          const categoria = item.categoria?.trim() || 'Sem categoria';
          categorias.set(categoria, (categorias.get(categoria) ?? 0) + valor);
        }
      } else if (tipo === 'receita') mes.receber += valor;
      else mes.pagar += valor;
    }

    const totais = meses.reduce(
      (total, mes) => ({
        recebido: total.recebido + mes.recebido,
        pago: total.pago + mes.pago,
        receber: total.receber + mes.receber,
        pagar: total.pagar + mes.pagar,
      }),
      { recebido: 0, pago: 0, receber: 0, pagar: 0 },
    );

    let acumulado = 0;

    const evolucao = meses.map((mes) => {
      acumulado += mes.recebido - mes.pago;
      return { ...mes, acumulado };
    });

    return {
      meses,
      totais,
      evolucao,
      categorias: [...categorias.entries()].sort((a, b) => b[1] - a[1]),
      semLiquidacao,
      semVencimento,
      inconsistentes,
    };
  }, [registros, periodo, periodoValido]);

  const escala = Math.max(
    1,
    ...analise.evolucao.map((mes) => Math.abs(mes.acumulado)),
  );

  return (
    <section
      aria-labelledby="titulo-analise-financeira"
      className="mb-8 space-y-5 text-[#EDEDE3]"
    >
      <div className={painel}>
        <p className="text-xs uppercase tracking-widest text-[#E3A144]">
          Inteligência financeira
        </p>

        <h2
          id="titulo-analise-financeira"
          className="mt-2 text-3xl"
          style={{ fontFamily: 'var(--font-fraunces), serif' }}
        >
          Sua operação em números
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">
          Realizados pela data de recebimento ou pagamento. Pendentes pela
          data de vencimento. Os filtros abaixo controlam este painel.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span>Início do período</span>
            <input
              type="date"
              className={campo}
              value={periodo.inicio}
              onChange={(event) =>
                setPeriodo({ ...periodo, inicio: event.target.value })
              }
            />
          </label>

          <label className="space-y-2 text-sm">
            <span>Fim do período</span>
            <input
              type="date"
              className={campo}
              value={periodo.fim}
              onChange={(event) =>
                setPeriodo({ ...periodo, fim: event.target.value })
              }
            />
          </label>
        </div>

        <button
          type="button"
          disabled={carregando}
          className="mt-4 min-h-12 rounded-xl border border-white/15 px-4 text-sm disabled:opacity-50"
          onClick={() => {
            setCarregando(true);
            setErro('');
            setTentativa((atual) => atual + 1);
          }}
        >
          Atualizar análise
        </button>
      </div>

      {carregando ? (
        <p role="status" className={painel}>Consultando lançamentos…</p>
      ) : erro ? (
        <p role="alert" className={`${painel} text-rose-300`}>{erro}</p>
      ) : !periodoValido ? (
        <p role="alert" className={painel}>
          Informe um período válido de até 24 meses.
        </p>
      ) : (
        <>
          {(analise.semLiquidacao > 0 ||
            analise.semVencimento > 0 ||
            analise.inconsistentes > 0) && (
            <div className={`${painel} text-sm leading-6 text-amber-200`}>
              <strong>Dados que precisam de revisão — todo o histórico:</strong>
              <ul className="mt-2 list-inside list-disc">
                {analise.semLiquidacao > 0 && (
                  <li>
                    {analise.semLiquidacao} lançamento(s) realizado(s) sem
                    data de liquidação válida.
                  </li>
                )}
                {analise.semVencimento > 0 && (
                  <li>
                    {analise.semVencimento} pendente(s) sem vencimento válido.
                  </li>
                )}
                {analise.inconsistentes > 0 && (
                  <li>
                    {analise.inconsistentes} registro(s) com valor, tipo,
                    status ou data de liquidação inconsistente.
                  </li>
                )}
              </ul>
              <p className="mt-2">
                Esses registros não entram nos gráficos. Os resultados
                representam os lançamentos com dados válidos.
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Recebido no período', analise.totais.recebido],
              ['Pago no período', analise.totais.pago],
              ['A receber no período', analise.totais.receber],
              ['A pagar no período', analise.totais.pagar],
            ].map(([titulo, valor]) => (
              <div key={String(titulo)} className={painel}>
                <p className="text-sm text-white/65">{titulo}</p>
                <p className="mt-3 break-words text-2xl font-semibold tabular-nums">
                  {moeda(Number(valor))}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <article className={painel}>
              <h3 className="text-lg font-semibold">Entradas e saídas realizadas</h3>
              <p className="mt-2 text-sm text-white/60">
                Agrupadas por mês, dentro das datas selecionadas.
              </p>
              <Barras meses={analise.meses} />
            </article>

            <article className={painel}>
              <h3 className="text-lg font-semibold">Movimento líquido acumulado</h3>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Recebido menos pago, acumulado a partir de zero no início do
                período. Não representa saldo bancário nem lucro.
              </p>

              <div className="mt-5 space-y-4">
                {analise.evolucao.map((mes) => (
                  <div key={mes.chave}>
                    <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs">
                      <span className="text-white/65">{mes.nome}</span>
                      <span className="tabular-nums">{moeda(mes.acumulado)}</span>
                    </div>

                    <div className="relative flex h-3">
                      <div className="absolute inset-y-0 left-1/2 w-px bg-white/35" />
                      <div className="flex w-1/2 justify-end">
                        {mes.acumulado < 0 && (
                          <div
                            className="h-full rounded-l bg-rose-400"
                            style={{
                              width: `${(Math.abs(mes.acumulado) / escala) * 100}%`,
                            }}
                          />
                        )}
                      </div>
                      <div className="w-1/2">
                        {mes.acumulado > 0 && (
                          <div
                            className="h-full rounded-r bg-emerald-400"
                            style={{
                              width: `${(mes.acumulado / escala) * 100}%`,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className={painel}>
              <h3 className="text-lg font-semibold">Despesas pagas por categoria</h3>

              {analise.categorias.length === 0 ? (
                <p className="mt-5 text-sm text-white/60">
                  Nenhuma despesa paga com data válida neste período.
                </p>
              ) : (
                <div className="mt-5 space-y-4">
                  {analise.categorias.map(([categoria, valor]) => (
                    <div key={categoria}>
                      <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs">
                        <span className="break-words">{categoria}</span>
                        <span className="tabular-nums">
                          {moeda(valor)} ·{' '}
                          {((valor / analise.totais.pago) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-[#E3A144]"
                          style={{
                            width: `${(valor / analise.totais.pago) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className={painel}>
              <h3 className="text-lg font-semibold">Compromissos pendentes</h3>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Situação atual dos lançamentos pendentes, agrupados pelo
                vencimento. Não inclui contas já liquidadas.
              </p>
              <Barras meses={analise.meses} previsto />
            </article>
          </div>
        </>
      )}
    </section>
  );
}
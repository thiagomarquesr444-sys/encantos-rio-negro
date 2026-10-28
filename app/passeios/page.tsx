'use client';
import './passeios-premium.css';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';
import GraficoPasseios from '@/app/components/GraficoPasseios';

type Passeio = {
  id?: string;
  nome: string;
  categoria?: string | null;
  duracao?: string | null;
  valor?: number | string | null;
  preco?: number | string | null;
  vagas?: number | string | null;
  descricao?: string | null;
  cidade?: string | null;
  foto_url?: string | null;
  destaque?: boolean | null;
  situacao?: string | null;
  created_at?: string;
};

type Feedback = {
  tipo: 'sucesso' | 'erro';
  texto: string;
};

/*
  ============================================================
  VALORES

  Aceita:
  3500
  3500,00
  3.500
  3.500,00
  3500.00
  3,500.00
  R$ 3.500,00

  Não existe multiplicação artificial.
  ============================================================
*/

function converterValor(
  valor: number | string | null | undefined
): number {
  if (typeof valor === 'number') {
    const centavos = Math.round(valor * 100);
    return Number.isFinite(valor) &&
      valor >= 0 &&
      Number.isSafeInteger(centavos) &&
      Math.abs(valor * 100 - centavos) < 0.000001
        ? centavos / 100
        : Number.NaN;
  }

  if (valor == null) return Number.NaN;

  let texto = valor.trim().replace(/^R\$\s*/i, '');
  if (!texto) return Number.NaN;

  if (texto.includes(',')) {
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(texto)) {
      return Number.NaN;
    }
    texto = texto.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(texto)) {
    texto = texto.replace(/\./g, '');
  } else if (!/^\d+(?:\.\d{1,2})?$/.test(texto)) {
    return Number.NaN;
  }

  const [inteiro, decimal = ''] = texto.split('.');
  const centavos =
    Number(inteiro) * 100 + Number(decimal.padEnd(2, '0'));

  return Number.isSafeInteger(centavos) && centavos >= 0
    ? centavos / 100
    : Number.NaN;
}
function formatarMoeda(
  valor: number | string | null | undefined
) {
  const numero = converterValor(valor);
  return Number.isFinite(numero)
    ? numero.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })
    : 'Valor a revisar';
}
function formatarValorCampo(
  valor: number | string | null | undefined
) {
  const numero = converterValor(valor);
  return Number.isFinite(numero)
    ? numero.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '';
}
/*
  valor é a fonte principal.

  preco continua somente como
  compatibilidade temporária
  para registros legados.
*/

function obterValorPasseio(
  passeio: Passeio
) {
  if (
    passeio.valor !==
      undefined &&
    passeio.valor !== null
  ) {
    return converterValor(
      passeio.valor
    );
  }

  return converterValor(
    passeio.preco
  );
}

function estiloSituacao(
  situacao?: string | null
) {
  const valor =
    (
      situacao ||
      'Ativo'
    ).toLowerCase();

  if (
    valor.includes(
      'inativo'
    )
  ) {
    return {
      bolinha:
        'bg-[var(--ern-suave)]',

      container:
        'border-[var(--ern-borda)] bg-[var(--ern-suave)] text-[var(--ern-secundario)]',
    };
  }

  if (
    valor.includes(
      'breve'
    )
  ) {
    return {
      bolinha:
        'bg-[var(--ern-botao)]',

      container:
        'border-[var(--ern-borda)] bg-[var(--ern-suave)] text-[var(--ern-destaque)]',
    };
  }

  return {
    bolinha:
      'bg-emerald-400',

    container:
      'border-emerald-500/20 bg-emerald-500/[0.07] text-[var(--ern-sucesso)]',
  };
}

export default function PasseiosPage() {
  const contextoCatalogoERN = React.useRef<{
    usuarioId: string;
    empresaId: string;
  } | null>(null);

  async function validarEmpresaCatalogoERN(id: string) {
    const esperado = contextoCatalogoERN.current;

    if (!esperado || !passeios.some((item) => item.id === id)) {
      throw new Error('Atualize o catalogo antes de continuar.');
    }

    const { data: auth, error: authError } =
      await supabase.auth.getUser();

    if (authError || !auth.user ||
        auth.user.id !== esperado.usuarioId) {
      throw new Error('A sessao mudou. Atualize a pagina.');
    }

    const { data: perfil, error: perfilError } = await supabase
      .from('perfis')
      .select('empresa_id')
      .eq('id', auth.user.id)
      .single();

    if (perfilError || !perfil?.empresa_id ||
        String(perfil.empresa_id) !== esperado.empresaId) {
      throw new Error('Nao foi possivel confirmar sua empresa. Atualize a pagina.');
    }

    return esperado.empresaId;
  }

  const router =
    useRouter();

  const [
    passeios,
    setPasseios,
  ] =
    useState<Passeio[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    busca,
    setBusca,
  ] =
    useState('');

  const [
    filtroCategoria,
    setFiltroCategoria,
  ] =
    useState('');

  const [
    feedback,
    setFeedback,
  ] =
    useState<Feedback | null>(
      null
    );

  const [
    passeioSelecionado,
    setPasseioSelecionado,
  ] =
    useState<Passeio | null>(
      null
    );

  const [
    modoEdicao,
    setModoEdicao,
  ] =
    useState(false);

  const [
    salvando,
    setSalvando,
  ] =
    useState(false);

  const [
    excluindo,
    setExcluindo,
  ] =
    useState(false);

  const [
    idParaExcluir,
    setIdParaExcluir,
  ] =
    useState<string | null>(
      null
    );

  /*
    ============================================================
    CARREGAMENTO
    ============================================================
  */

  async function fetchPasseios() {
    setLoading(true);

    try {
      // ERN_CONSULTA_PASSEIOS_COMPLETA
      const { data: auth, error: erroAuth } =
        await supabase.auth.getUser();

      if (erroAuth || !auth.user) {
        throw new Error('Entre novamente para consultar os passeios.');
      }

      const { data: perfil, error: erroPerfil } = await supabase
        .from('perfis')
        .select('empresa_id')
        .eq('id', auth.user.id)
        .single();

      if (erroPerfil || !perfil?.empresa_id) {
        throw new Error('Não foi possível identificar sua empresa.');
      }

      const registros: Passeio[] = [];
      let esperado: number | null = null;

      for (let inicio = 0; inicio < 10000; inicio += 200) {
        const { data, error, count } = await supabase
          .from('passeios')
          .select('*', { count: 'exact' })
          .eq('empresa_id', perfil.empresa_id)
          .order('created_at', { ascending: false, nullsFirst: false })
          .order('id', { ascending: false })
          .range(inicio, inicio + 199);

        if (error) throw error;

        if (count === null || count > 10000) {
          throw new Error(
            'O volume do catálogo exige consulta no servidor. A análise não será apresentada parcialmente.',
          );
        }

        if (esperado !== null && esperado !== count) {
          throw new Error('O catálogo mudou durante a consulta. Atualize a página.');
        }

        esperado = count;
        registros.push(...((data ?? []) as Passeio[]));

        if (registros.length >= count) break;

        if (!data?.length) {
          throw new Error('A consulta ficou incompleta. Atualize a página.');
        }
      }

      if (
        registros.length !== esperado ||
        registros.some((item) => !item.id) ||
        new Set(registros.map((item) => item.id)).size !== registros.length
      ) {
        throw new Error('Não foi possível obter um catálogo consistente.');
      }

      contextoCatalogoERN.current = {
        usuarioId: auth.user.id,
        empresaId: String(perfil.empresa_id),
      };
      setPasseios(registros);
    } catch (error) {
      console.error('Erro ao carregar passeios:', error);
      setPasseios([]);

      setFeedback({
        tipo:
          'erro',

        texto:
          error && typeof error === 'object' && 'message' in error ? String(error.message)
            : 'Não foi possível carregar os passeios.',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPasseios();
  }, []);

  function mostrarSucesso(
    texto: string
  ) {
    setFeedback({
      tipo:
        'sucesso',

      texto,
    });

    window.setTimeout(
      () => {
        setFeedback(
          (
            atual
          ) =>
            atual?.tipo ===
            'sucesso'
              ? null
              : atual
        );
      },
      2500
    );
  }

  /*
    ============================================================
    MÉTRICAS
    ============================================================
  */

  const totalPasseios =
    passeios.length;

  const totalVagas =
    passeios.reduce(
      (
        total,
        passeio
      ) => {
        const vagas =
          Number(
            passeio.vagas
          );

        return (
          total +
          (
            Number.isFinite(
              vagas
            )
              ? vagas
              : 0
          )
        );
      },
      0
    );

  const categoriasUnicas =
    useMemo(
      () =>
        Array.from(
          new Set(
            passeios
              .map(
                (
                  passeio
                ) =>
                  passeio.categoria?.trim()
              )
              .filter(
                (
                  categoria
                ): categoria is string =>
                  Boolean(
                    categoria
                  )
              )
          )
        ).sort(),
      [
        passeios,
      ]
    );

  const precosValidosERN = passeios
    .map(obterValorPasseio)
    .filter(valor => Number.isFinite(valor) && valor >= 0);

  const somaCentavosERN = precosValidosERN.reduce(
    (total, valor) => total + Math.round(valor * 100),
    0,
  );

  const precoMedio =
    precosValidosERN.length && Number.isSafeInteger(somaCentavosERN)
      ? Math.round(somaCentavosERN / precosValidosERN.length) / 100
      : Number.NaN;


  const ativos =
    passeios.filter(
      (
        passeio
      ) =>
        (
          passeio.situacao ||
          'Ativo'
        ).toLowerCase() ===
        'ativo'
    ).length;

  /*
    ============================================================
    FILTROS
    ============================================================
  */

  const passeiosFiltrados =
    useMemo(() => {
      const termo =
        busca
          .trim()
          .toLowerCase();

      return passeios.filter(
        (
          passeio
        ) => {
          const atendeBusca =
            !termo ||
            passeio.nome
              ?.toLowerCase()
              .includes(
                termo
              ) ||
            passeio.categoria
              ?.toLowerCase()
              .includes(
                termo
              ) ||
            passeio.cidade
              ?.toLowerCase()
              .includes(
                termo
              ) ||
            passeio.descricao
              ?.toLowerCase()
              .includes(
                termo
              );

          const atendeCategoria =
            !filtroCategoria ||
            (
              passeio.categoria ||
              ''
            ).toLowerCase() ===
              filtroCategoria.toLowerCase();

          return (
            atendeBusca &&
            atendeCategoria
          );
        }
      );
    }, [
      passeios,
      busca,
      filtroCategoria,
    ]);

  /*
    ============================================================
    VISUALIZAÇÃO
    ============================================================
  */

  function abrirVisualizacao(
    passeio: Passeio
  ) {
    setFeedback(null);

    setPasseioSelecionado({
      ...passeio,
    });

    setModoEdicao(
      false
    );
  }

  /*
    ============================================================
    EDIÇÃO
    ============================================================
  */

  function abrirEdicao(
    passeio: Passeio
  ) {
    setFeedback(null);

    setPasseioSelecionado({
      ...passeio,

      valor:
        formatarValorCampo(
          obterValorPasseio(
            passeio
          )
        ),
    });

    setModoEdicao(
      true
    );
  }

  async function handleSalvarEdicao(
    event:
      React.FormEvent
  ) {
    event.preventDefault();

    if (
      !passeioSelecionado?.id
    ) {
      return;
    }

    if (
      !passeioSelecionado.nome.trim()
    ) {
      setFeedback({
        tipo:
          'erro',

        texto:
          'Informe o nome do passeio.',
      });

      return;
    }

    const valorNumerico =
      converterValor(
        passeioSelecionado.valor
      );

    if (
      !Number.isFinite(
        valorNumerico
      ) ||
      valorNumerico < 0
    ) {
      setFeedback({
        tipo:
          'erro',

        texto:
          'Informe um valor válido para o passeio.',
      });

      return;
    }

    const vagasNumericas =
      passeioSelecionado.vagas ===
        '' ||
      passeioSelecionado.vagas ===
        null ||
      passeioSelecionado.vagas ===
        undefined
        ? 0
        : Number(
            passeioSelecionado.vagas
          );

    if (
      !Number.isFinite(
        vagasNumericas
      ) ||
      !Number.isInteger(
        vagasNumericas
      ) ||
      vagasNumericas < 0
    ) {
      setFeedback({
        tipo:
          'erro',

        texto:
          'Informe uma quantidade inteira e válida de vagas.',
      });

      return;
    }

    setSalvando(true);
    setFeedback(null);

    try {
      /*
        Enquanto valor e preco
        coexistirem no banco,
        ambos recebem exatamente
        o mesmo valor.
      */

      const payload = {
        nome:
          passeioSelecionado.nome.trim(),

        categoria:
          passeioSelecionado.categoria?.trim() ||
          null,

        duracao:
          passeioSelecionado.duracao?.trim() ||
          null,

        cidade:
          passeioSelecionado.cidade?.trim() ||
          null,

        valor:
          valorNumerico,

        preco:
          valorNumerico,

        vagas:
          vagasNumericas,

        descricao:
          passeioSelecionado.descricao?.trim() ||
          null,

        foto_url:
          passeioSelecionado.foto_url?.trim() ||
          null,

        destaque:
          Boolean(
            passeioSelecionado.destaque
          ),

        situacao:
          passeioSelecionado.situacao ||
          'Ativo',
      };

      const {
        error,
      } =
        await supabase
          .from(
            'passeios'
          )
          .update(payload)
          .eq('id', passeioSelecionado.id)
          .eq('empresa_id', await validarEmpresaCatalogoERN(passeioSelecionado.id))
          .select('id')
          .single();

      if (error) {
        throw error;
      }

      setPasseioSelecionado(
        null
      );

      setModoEdicao(
        false
      );

      mostrarSucesso(
        'Passeio atualizado com sucesso.'
      );

      await fetchPasseios();
    } catch (error) {
      console.error(
        'Erro ao atualizar passeio:',
        error
      );

      setFeedback({
        tipo:
          'erro',

        texto:
          error && typeof error === 'object' && 'message' in error ? String(error.message)
            : 'Não foi possível atualizar o passeio.',
      });
    } finally {
      setSalvando(false);
    }
  }

  /*
    ============================================================
    EXCLUSÃO
    ============================================================
  */

  async function executarExclusao() {
    if (
      !idParaExcluir ||
      excluindo
    ) {
      return;
    }

    setExcluindo(true);
    setFeedback(null);

    try {
      const {
        error,
      } =
        await supabase
          .from(
            'passeios'
          )
          .delete()
          .eq('id', idParaExcluir)
          .eq('empresa_id', await validarEmpresaCatalogoERN(idParaExcluir))
          .select('id')
          .single();

      if (error) {
        throw error;
      }

      setIdParaExcluir(
        null
      );

      mostrarSucesso(
        'Passeio excluído com sucesso.'
      );

      await fetchPasseios();
    } catch (error) {
      console.error(
        'Erro ao excluir passeio:',
        error
      );

      setFeedback({
        tipo:
          'erro',

        texto:
          error && typeof error === 'object' && 'message' in error ? String(error.message)
            : 'Não foi possível excluir o passeio.',
      });
    } finally {
      setExcluindo(false);
    }
  }

  const cards = [
    {
      titulo:
        'Passeios',

      valor:
        loading
          ? '—'
          : String(
              totalPasseios
            ),

      detalhe:
        'registros no catálogo',
    },

    {
      titulo:
        'Ativos',

      valor:
        loading
          ? '—'
          : String(
              ativos
            ),

      detalhe:
        'disponíveis na operação',
    },

    {
      titulo:
        'Capacidade',

      valor:
        loading
          ? '—'
          : String(
              totalVagas
            ),

      detalhe:
        'vagas cadastradas',
    },

    {
      titulo:
        'Preço médio',

      valor:
        loading
          ? '—'
          : (precosValidosERN.length
    ? formatarMoeda(precoMedio)
    : 'Sem valores'),

      detalhe:
        'média real do catálogo',
    },
  ];

  return (
    <div className="ern-passeios-premium ern-passeios-catalogo min-h-screen bg-[var(--ern-fundo)] text-[var(--ern-texto)]">
      {/* =====================================================
          FEEDBACK
      ====================================================== */}

      {feedback?.tipo ===
        'sucesso' && (
        <div className="fixed left-1/2 top-[100px] z-[90] -translate-x-1/2 rounded-2xl border border-emerald-500/20 bg-[#0B2119] px-5 py-3 text-xs font-semibold text-[var(--ern-sucesso)] shadow-2xl">
          {
            feedback.texto
          }
        </div>
      )}

      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <section className="border-b border-[var(--ern-borda)] bg-[var(--ern-painel)]">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-8 px-5 py-10 md:px-8 md:py-12 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-[var(--ern-botao)]" />

              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ern-destaque)]">
                Operação • Passeios
              </span>
            </div>

            <h1
              className="mt-4 text-4xl leading-none tracking-[-0.035em] text-[var(--ern-texto)] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Passeios
            </h1>

            <p className="mt-4 max-w-[700px] text-sm leading-7 text-[var(--ern-secundario)]">
              Organize experiências, preços,
              capacidade e informações operacionais
              do catálogo da empresa.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={
                fetchPasseios
              }
              disabled={
                loading
              }
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-5 text-xs font-semibold text-[var(--ern-secundario)] transition hover:bg-[var(--ern-suave)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              ↻ Atualizar
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  '/passeios/novo'
                )
              }
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[var(--ern-botao)] px-6 text-sm font-bold text-[var(--ern-sobre-botao)] transition hover:-translate-y-0.5 hover:bg-[var(--ern-botao)]"
            >
              <span className="text-lg">
                +
              </span>

              Novo passeio
            </button>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1360px] px-5 py-8 md:px-8 md:py-10">
        {!loading && feedback?.tipo !== 'erro' && (
          <GraficoPasseios passeios={passeiosFiltrados} />
        )}
        {/* ===================================================
            ERROS
        ==================================================== */}

        {feedback?.tipo ===
          'erro' && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-5 py-4 text-xs text-[var(--ern-erro)]">
            <span>
              {
                feedback.texto
              }
            </span>

            <button
              type="button"
              onClick={() =>
                setFeedback(
                  null
                )
              }
              className="text-[var(--ern-erro)] transition hover:text-[var(--ern-erro)]"
            >
              ✕
            </button>
          </div>
        )}

        {/* ===================================================
            INDICADORES
        ==================================================== */}

        <div className="ern-passeios-indicadores grid grid-cols-2 gap-3 xl:grid-cols-12">
          {cards.map(
            (
              card
            ) => (
              <div
                key={
                  card.titulo
                }
                className="rounded-[22px] border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-5"
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--ern-secundario)]">
                  {
                    card.titulo
                  }
                </p>

                <strong
                  className={`mt-5 block font-medium tracking-[-0.04em] text-[var(--ern-texto)] ${
                    card.titulo ===
                    'Preço médio'
                      ? 'text-2xl md:text-3xl'
                      : 'text-4xl'
                  }`}
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  {
                    card.valor
                  }
                </strong>

                <p className="mt-2 text-[11px] text-[var(--ern-secundario)]">
                  {
                    card.detalhe
                  }
                </p>
              </div>
            )
          )}
        </div>

        {/* ===================================================
            CATÁLOGO
        ==================================================== */}

        <section className="ern-passeios-listagem mt-6 overflow-hidden rounded-[26px] border border-[var(--ern-borda)] bg-[var(--ern-painel)]">
          <div className="border-b border-[var(--ern-borda)] p-5 md:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--ern-destaque)]">
                  Catálogo operacional
                </p>

                <h2
                  className="mt-2 text-2xl text-[var(--ern-texto)]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Experiências cadastradas
                </h2>

                <p className="mt-2 text-xs text-[var(--ern-secundario)]">
                  {
                    passeiosFiltrados.length
                  }{' '}
                  de{' '}
                  {
                    passeios.length
                  }{' '}
                  passeio
                  {passeios.length !==
                  1
                    ? 's'
                    : ''}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <svg
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ern-secundario)]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>

                  <input
                    type="text"
                    placeholder="Buscar passeio..."
                    value={
                      busca
                    }
                    onChange={(
                      event
                    ) =>
                      setBusca(
                        event.target
                          .value
                      )
                    }
                    className="h-[44px] w-full min-w-0 sm:min-w-[260px] rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] pl-10 pr-4 text-xs text-[var(--ern-texto)] outline-none placeholder:text-[var(--ern-secundario)] focus:border-[var(--ern-borda)]"
                  />
                </div>

                <select
                  value={
                    filtroCategoria
                  }
                  onChange={(
                    event
                  ) =>
                    setFiltroCategoria(
                      event.target
                        .value
                    )
                  }
                  className="h-[44px] rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 text-xs text-[var(--ern-secundario)] outline-none focus:border-[var(--ern-borda)]"
                >
                  <option value="">
                    Todas as categorias
                  </option>

                  {categoriasUnicas.map(
                    (
                      categoria
                    ) => (
                      <option
                        key={
                          categoria
                        }
                        value={
                          categoria
                        }
                      >
                        {
                          categoria
                        }
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex min-h-[330px] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--ern-borda)] border-t-[var(--ern-destaque)]" />

                  <p className="mt-4 text-xs text-[var(--ern-secundario)]">
                    Carregando passeios...
                  </p>
                </div>
              </div>
            ) : passeiosFiltrados.length ===
              0 ? (
              <div className="flex min-h-[330px] items-center justify-center px-5 text-center">
                <div>
                  <h3
                    className="text-2xl text-[var(--ern-texto)]"
                    style={{
                      fontFamily:
                        'var(--font-fraunces), serif',
                    }}
                  >
                    Nenhum passeio encontrado.
                  </h3>

                  <p className="mt-2 text-xs text-[var(--ern-secundario)]">
                    Ajuste os filtros ou cadastre uma nova experiência.
                  </p>
                </div>
              </div>
            ) : (
              <>
  {/* ERN_PASSEIOS_MOBILE */}
  <div className="grid gap-3 p-3 sm:grid-cols-2 lg:hidden">
    {passeiosFiltrados.map((passeio, indice) => (
      <article
        key={passeio.id ?? indice}
        className="min-w-0 rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] p-3"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="min-w-0 flex-1 break-words text-sm font-semibold">
            {passeio.nome}
          </h3>
          <span className="rounded-full border border-[var(--ern-borda)] px-2 py-1 text-[10px]">
            {passeio.situacao || 'Não informada'}
          </span>
        </div>

        <p className="mt-1 break-words text-xs text-[var(--ern-secundario)]">
          {passeio.categoria || 'Sem categoria'}
        </p>

        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-[var(--ern-secundario)]">Preço cadastrado</dt>
            <dd className="mt-1 font-semibold text-[var(--ern-destaque)]">
              {formatarMoeda(obterValorPasseio(passeio))}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--ern-secundario)]">Vagas cadastradas</dt>
            <dd className="mt-1">{passeio.vagas ?? 'Não informadas'}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[var(--ern-secundario)]">Cidade</dt>
            <dd className="mt-1 break-words">{passeio.cidade || 'Não informada'}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[var(--ern-secundario)]">Duração</dt>
            <dd className="mt-1 break-words">{passeio.duracao || 'Não informada'}</dd>
          </div>
        </dl>

        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--ern-borda)] pt-2">
          <button
            type="button"
            onClick={() => abrirVisualizacao(passeio)}
            className="min-h-11 rounded-xl border border-[var(--ern-borda)] text-xs"
          >
            Detalhes
          </button>
          <button
            type="button"
            disabled={!passeio.id}
            onClick={() => abrirEdicao(passeio)}
            className="min-h-11 rounded-xl border border-sky-400/25 text-xs text-[var(--ern-destaque)] disabled:opacity-50"
          >
            Editar
          </button>
          <button
            type="button"
            disabled={!passeio.id || excluindo}
            onClick={() => {
              setFeedback(null);
              setIdParaExcluir(passeio.id ?? null);
            }}
            className="min-h-11 rounded-xl border border-red-400/25 text-xs text-[var(--ern-erro)] disabled:opacity-50"
          >
            Excluir
          </button>
        </div>
      </article>
    ))}
  </div>

<table className="hidden lg:table w-full min-w-[1050px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--ern-borda)] bg-[var(--ern-suave)]">
                    {[
                      'Passeio',
                      'Categoria',
                      'Duração',
                      'Preço',
                      'Vagas',
                      'Situação',
                      'Ações',
                    ].map(
                      (
                        titulo
                      ) => (
                        <th
                          key={
                            titulo
                          }
                          className={`px-5 py-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--ern-secundario)] ${
                            titulo ===
                            'Ações'
                              ? 'text-center'
                              : ''
                          }`}
                        >
                          {
                            titulo
                          }
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-[var(--ern-borda)]">
                  {passeiosFiltrados.map(
                    (
                      passeio,
                      index
                    ) => {
                      const situacao =
                        estiloSituacao(
                          passeio.situacao
                        );

                      return (
                        <tr
                          key={
                            passeio.id ||
                            index
                          }
                          className="transition hover:bg-[var(--ern-suave)]"
                        >
                          <td className="px-5 py-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-semibold text-[var(--ern-secundario)]">
                                  {
                                    passeio.nome
                                  }
                                </p>

                                {passeio.destaque && (
                                  <span
                                    title="Destaque"
                                    className="text-[10px] text-[var(--ern-destaque)]"
                                  >
                                    ★
                                  </span>
                                )}
                              </div>

                              {passeio.cidade && (
                                <p className="mt-1 text-[9px] text-[var(--ern-secundario)]">
                                  {
                                    passeio.cidade
                                  }
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-full border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-2.5 py-1 text-[9px] text-[var(--ern-secundario)]">
                              {passeio.categoria ||
                                'Geral'}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-xs text-[var(--ern-secundario)]">
                            {passeio.duracao ||
                              '—'}
                          </td>

                          <td className="px-5 py-4 text-xs font-semibold text-[var(--ern-destaque)]">
                            {formatarMoeda(
                              obterValorPasseio(
                                passeio
                              )
                            )}
                          </td>

                          <td className="px-5 py-4 text-xs text-[var(--ern-secundario)]">
                            {Number(
                              passeio.vagas
                            ) || 0}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[9px] ${situacao.container}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${situacao.bolinha}`}
                              />

                              {passeio.situacao ||
                                'Ativo'}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                title="Visualizar"
                                onClick={() =>
                                  abrirVisualizacao(
                                    passeio
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--ern-borda)] bg-[var(--ern-suave)] text-[var(--ern-secundario)] transition hover:border-[var(--ern-borda)] hover:text-[var(--ern-destaque)]"
                              >
                                👁
                              </button>

                              <button
                                type="button"
                                title="Editar"
                                onClick={() =>
                                  abrirEdicao(
                                    passeio
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--ern-borda)] bg-[var(--ern-suave)] text-[var(--ern-secundario)] transition hover:border-sky-400/20 hover:text-[var(--ern-destaque)]"
                              >
                                ✎
                              </button>

                              <button
                                type="button"
                                title="Excluir"
                                onClick={() =>
                                  passeio.id &&
                                  setIdParaExcluir(
                                    passeio.id
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--ern-borda)] bg-[var(--ern-suave)] text-[var(--ern-secundario)] transition hover:border-red-400/20 hover:text-[var(--ern-erro)]"
                              >
                                ×
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
</>
            )}
          </div>
        </section>
      </main>

      {/* =====================================================
          MODAL: VISUALIZAÇÃO / EDIÇÃO
      ====================================================== */}

      {passeioSelecionado && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-[690px] overflow-y-auto rounded-[26px] border border-[var(--ern-borda)] bg-[var(--ern-painel)] shadow-[0_35px_100px_rgba(0,0,0,0.65)]">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--ern-borda)] px-6 py-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--ern-destaque)]">
                  {modoEdicao
                    ? 'Editar passeio'
                    : 'Detalhes do passeio'}
                </p>

                <h3
                  className="mt-2 text-2xl text-[var(--ern-texto)]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  {
                    passeioSelecionado.nome
                  }
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPasseioSelecionado(
                    null
                  );

                  setModoEdicao(
                    false
                  );
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] text-[var(--ern-secundario)] transition hover:bg-[var(--ern-suave)]"
              >
                ✕
              </button>
            </div>

            
{feedback?.tipo === 'erro' && (
  <div
    role="alert"
    className="m-4 rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] p-3 text-sm text-[var(--ern-erro)]"
  >
    {feedback.texto}
  </div>
)}

{modoEdicao ? (
              <form
                onSubmit={
                  handleSalvarEdicao
                }
                className="space-y-5 p-6"
              >
                <CampoTexto
                  label="Nome *"
                  value={
                    passeioSelecionado.nome
                  }
                  disabled={
                    salvando
                  }
                  onChange={(
                    valor
                  ) =>
                    setPasseioSelecionado({
                      ...passeioSelecionado,

                      nome:
                        valor,
                    })
                  }
                  required
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <CampoTexto
                    label="Categoria"
                    value={
                      passeioSelecionado.categoria ||
                      ''
                    }
                    disabled={
                      salvando
                    }
                    onChange={(
                      valor
                    ) =>
                      setPasseioSelecionado({
                        ...passeioSelecionado,

                        categoria:
                          valor,
                      })
                    }
                  />

                  <CampoTexto
                    label="Duração"
                    value={
                      passeioSelecionado.duracao ||
                      ''
                    }
                    disabled={
                      salvando
                    }
                    onChange={(
                      valor
                    ) =>
                      setPasseioSelecionado({
                        ...passeioSelecionado,

                        duracao:
                          valor,
                      })
                    }
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <CampoTexto
                    label="Cidade"
                    value={
                      passeioSelecionado.cidade ||
                      ''
                    }
                    disabled={
                      salvando
                    }
                    onChange={(
                      valor
                    ) =>
                      setPasseioSelecionado({
                        ...passeioSelecionado,

                        cidade:
                          valor,
                      })
                    }
                  />

                  <div>
                    <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--ern-secundario)]">
                      Situação
                    </label>

                    <select
                      disabled={
                        salvando
                      }
                      value={
                        passeioSelecionado.situacao ||
                        'Ativo'
                      }
                      onChange={(
                        event
                      ) =>
                        setPasseioSelecionado({
                          ...passeioSelecionado,

                          situacao:
                            event.target
                              .value,
                        })
                      }
                      className="w-full rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 py-3 text-sm text-[var(--ern-texto)] outline-none focus:border-[var(--ern-borda)] disabled:opacity-50"
                    >
                      <option value="Ativo">
                        Ativo
                      </option>

                      <option value="Inativo">
                        Inativo
                      </option>

                      <option value="Em Breve">
                        Em Breve
                      </option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--ern-secundario)]">
                      Valor (R$)
                    </label>

                    <input
                      type="text"
                      inputMode="decimal"
                      disabled={
                        salvando
                      }
                      value={
                        passeioSelecionado.valor ??
                        ''
                      }
                      onChange={(
                        event
                      ) =>
                        setPasseioSelecionado({
                          ...passeioSelecionado,

                          valor:
                            event.target
                              .value,
                        })
                      }
                      placeholder="Ex.: 3.500,00"
                      className="w-full rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 py-3 text-sm text-[var(--ern-texto)] outline-none focus:border-[var(--ern-borda)] disabled:opacity-50"
                    />

                    <p className="mt-2 text-[9px] text-[var(--ern-secundario)]">
                      Aceita 3500, 3.500 ou 3.500,00.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--ern-secundario)]">
                      Vagas
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      disabled={
                        salvando
                      }
                      value={
                        passeioSelecionado.vagas ??
                        ''
                      }
                      onChange={(
                        event
                      ) =>
                        setPasseioSelecionado({
                          ...passeioSelecionado,

                          vagas:
                            event.target
                              .value,
                        })
                      }
                      className="w-full rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 py-3 text-sm text-[var(--ern-texto)] outline-none focus:border-[var(--ern-borda)] disabled:opacity-50"
                    />
                  </div>
                </div>

                <CampoTexto
                  label="URL da foto"
                  value={
                    passeioSelecionado.foto_url ||
                    ''
                  }
                  disabled={
                    salvando
                  }
                  onChange={(
                    valor
                  ) =>
                    setPasseioSelecionado({
                      ...passeioSelecionado,

                      foto_url:
                        valor,
                    })
                  }
                  type="url"
                  placeholder="https://..."
                />

                <label
                  className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${
                    passeioSelecionado.destaque
                      ? 'border-[var(--ern-borda)] bg-[var(--ern-suave)]'
                      : 'border-[var(--ern-borda)] bg-[var(--ern-fundo)]'
                  }`}
                >
                  <div>
                    <p className="text-xs font-semibold text-[var(--ern-secundario)]">
                      Destaque
                    </p>

                    <p className="mt-1 text-[9px] text-[var(--ern-secundario)]">
                      Marcar esta experiência como destaque.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={
                      Boolean(
                        passeioSelecionado.destaque
                      )
                    }
                    onChange={(
                      event
                    ) =>
                      setPasseioSelecionado({
                        ...passeioSelecionado,

                        destaque:
                          event.target
                            .checked,
                      })
                    }
                    disabled={
                      salvando
                    }
                    className="h-4 w-4 accent-[var(--ern-destaque)]"
                  />
                </label>

                <div>
                  <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--ern-secundario)]">
                    Descrição
                  </label>

                  <textarea
                    rows={5}
                    disabled={
                      salvando
                    }
                    value={
                      passeioSelecionado.descricao ||
                      ''
                    }
                    onChange={(
                      event
                    ) =>
                      setPasseioSelecionado({
                        ...passeioSelecionado,

                        descricao:
                          event.target
                            .value,
                      })
                    }
                    className="w-full resize-none rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 py-3 text-sm leading-6 text-[var(--ern-texto)] outline-none focus:border-[var(--ern-borda)] disabled:opacity-50"
                  />
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-[var(--ern-borda)] pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={
                      salvando
                    }
                    onClick={() => {
                      setPasseioSelecionado(
                        null
                      );

                      setModoEdicao(
                        false
                      );
                    }}
                    className="rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-5 py-3 text-xs font-semibold text-[var(--ern-secundario)] disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={
                      salvando
                    }
                    className="rounded-xl bg-[var(--ern-botao)] px-6 py-3 text-xs font-bold text-[var(--ern-sobre-botao)] transition hover:bg-[var(--ern-botao)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {salvando
                      ? 'Salvando...'
                      : 'Salvar alterações'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Detalhe
                    label="Categoria"
                    valor={
                      passeioSelecionado.categoria ||
                      'Geral'
                    }
                  />

                  <Detalhe
                    label="Duração"
                    valor={
                      passeioSelecionado.duracao ||
                      '—'
                    }
                  />

                  <Detalhe
                    label="Preço"
                    valor={formatarMoeda(
                      obterValorPasseio(
                        passeioSelecionado
                      )
                    )}
                  />

                  <Detalhe
                    label="Vagas"
                    valor={String(
                      Number(
                        passeioSelecionado.vagas
                      ) || 0
                    )}
                  />

                  <Detalhe
                    label="Cidade"
                    valor={
                      passeioSelecionado.cidade ||
                      'Não informada'
                    }
                  />

                  <Detalhe
                    label="Situação"
                    valor={
                      passeioSelecionado.situacao ||
                      'Ativo'
                    }
                  />

                  <Detalhe
                    label="Destaque"
                    valor={
                      passeioSelecionado.destaque
                        ? 'Sim'
                        : 'Não'
                    }
                  />
                </div>

                <div className="mt-4">
                  <p className="mb-2 text-[8px] font-semibold uppercase tracking-[0.16em] text-[var(--ern-secundario)]">
                    Descrição
                  </p>

                  <div className="min-h-[100px] rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] p-4 text-xs leading-6 text-[var(--ern-secundario)]">
                    {passeioSelecionado.descricao ||
                      'Nenhuma descrição informada.'}
                  </div>
                </div>

                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      abrirEdicao(
                        passeioSelecionado
                      )
                    }
                    className="rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-5 py-3 text-xs font-semibold text-[var(--ern-secundario)] transition hover:bg-[var(--ern-suave)]"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPasseioSelecionado(
                        null
                      )
                    }
                    className="rounded-xl bg-[var(--ern-botao)] px-6 py-3 text-xs font-bold text-[var(--ern-sobre-botao)] transition hover:bg-[var(--ern-botao)]"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          EXCLUSÃO
      ====================================================== */}

      {idParaExcluir && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[430px] rounded-[26px] border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-6 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-red-500/20 bg-red-500/[0.08] text-lg text-[var(--ern-erro)]">
              !
            </div>

            <h3
              className="mt-4 text-2xl text-[var(--ern-texto)]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Excluir passeio?
            </h3>

            <p className="mt-3 text-xs leading-6 text-[var(--ern-secundario)]">
              O passeio será removido permanentemente do catálogo.
              Esta ação não pode ser desfeita.
            </p>

            
{feedback?.tipo === 'erro' && (
  <div
    role="alert"
    className="m-4 rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] p-3 text-sm text-[var(--ern-erro)]"
  >
    {feedback.texto}
  </div>
)}

<div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={
                  excluindo
                }
                onClick={() =>
                  setIdParaExcluir(
                    null
                  )
                }
                className="rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-4 py-3 text-xs font-semibold text-[var(--ern-secundario)] disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={
                  excluindo
                }
                onClick={
                  executarExclusao
                }
                className="rounded-xl border border-red-500/20 bg-red-500/[0.1] px-4 py-3 text-xs font-semibold text-[var(--ern-erro)] transition hover:bg-red-500/[0.15] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {excluindo
                  ? 'Excluindo...'
                  : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/*
  ============================================================
  COMPONENTES INTERNOS
  ============================================================
*/

function CampoTexto({
  label,
  value,
  onChange,
  disabled,
  required = false,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (
    valor: string
  ) => void;
  disabled?: boolean;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--ern-secundario)]">
        {label}
      </label>

      <input
        type={
          type
        }
        required={
          required
        }
        disabled={
          disabled
        }
        value={
          value
        }
        onChange={(
          event
        ) =>
          onChange(
            event.target
              .value
          )
        }
        placeholder={
          placeholder
        }
        className="w-full rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 py-3 text-sm text-[var(--ern-texto)] outline-none focus:border-[var(--ern-borda)] disabled:opacity-50"
      />
    </div>
  );
}

function Detalhe({
  label,
  valor,
}: {
  label: string;
  valor: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] p-4">
      <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[var(--ern-secundario)]">
        {label}
      </p>

      <p className="mt-2 text-xs font-medium text-[var(--ern-secundario)]">
        {valor}
      </p>
    </div>
  );
}
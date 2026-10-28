'use client';
import './hospedagens-premium.css';

export const dynamic = 'force-dynamic';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';

import { supabase } from '@/lib/supabase';

type StatusHospedagem =
  | 'Disponível'
  | 'Ocupada'
  | 'Reservada';

interface Hospedagem {
  id?: string;

  nome?: string | null;
  Nome?: string | null;

  tipo?: string | null;

  endereco?: string | null;
  Endereco?: string | null;

  telefone?: string | null;

  valor_diaria?:
    | number
    | string
    | null;

  status?: string | null;
  Status?: string | null;

  created_at?: string | null;
}

function removerAcentos(
  valor: string
) {
  return valor
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    );
}

function normalizarStatus(
  valor?: string | null
): StatusHospedagem {
  const status = removerAcentos(
    (valor || '')
      .trim()
      .toLowerCase()
  );

  if (
    status === 'ocupada' ||
    status === 'ocupado'
  ) {
    return 'Ocupada';
  }

  if (
    status === 'reservada' ||
    status === 'reservado'
  ) {
    return 'Reservada';
  }

  return 'Disponível';
}

function obterStatus(
  hospedagem: Hospedagem
) {
  return normalizarStatus(
    hospedagem.status ||
      hospedagem.Status
  );
}

function obterNome(
  hospedagem: Hospedagem
) {
  return (
    hospedagem.nome ||
    hospedagem.Nome ||
    ''
  );
}

function obterEndereco(
  hospedagem: Hospedagem
) {
  return (
    hospedagem.endereco ||
    hospedagem.Endereco ||
    ''
  );
}

/*
  ============================================================
  CONVERSÃO MONETÁRIA
  ============================================================

  Padrão adotado na ERN:

  3500      -> 3500
  3.500     -> 3500
  3500.50   -> 3500.50
  3.500,50  -> 3500.50
*/


function converterValor(entrada: unknown): number {
  let numero: number;

  if (typeof entrada === 'number') {
    numero = entrada;
  } else if (typeof entrada === 'string') {
    let valor = entrada.trim().replace(/^R\$\s*/i, '');

    if (!valor) return Number.NaN;

    if (valor.includes(',')) {
      if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(valor)) {
        return Number.NaN;
      }
      valor = valor.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(?:\.\d{3})+$/.test(valor)) {
      valor = valor.replace(/\./g, '');
    } else if (!/^\d+(?:\.\d{1,2})?$/.test(valor)) {
      return Number.NaN;
    }

    numero = Number(valor);
  } else {
    return Number.NaN;
  }

  const centavos = Math.round(numero * 100);

  if (
    !Number.isFinite(numero) ||
    numero < 0 ||
    numero > 99999999.99 ||
    !Number.isSafeInteger(centavos) ||
    Math.abs(numero * 100 - centavos) > 0.000001
  ) {
    return Number.NaN;
  }

  return centavos / 100;
}


function formatarMoeda(valor: unknown) {
        const numero = converterValor(valor);
        return Number.isFinite(numero)
          ? numero.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })
          : 'Valor a revisar';
      }


export default function HospedagensPage() {
  const [
    hospedagens,
    setHospedagens,
  ] = useState<Hospedagem[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  const [
    busca,
    setBusca,
  ] = useState('');

  const [
    filtroStatus,
    setFiltroStatus,
  ] = useState<
    '' | StatusHospedagem | 'indisponiveis'
  >('');

  const [
    itemVisualizar,
    setItemVisualizar,
  ] =
    useState<Hospedagem | null>(
      null
    );

  const [
    itemEditar,
    setItemEditar,
  ] =
    useState<Hospedagem | null>(
      null
    );

  const [
    valorEdicao,
    setValorEdicao,
  ] = useState('');

  const [
    statusEdicao,
    setStatusEdicao,
  ] =
    useState<StatusHospedagem>(
      'Disponível'
    );

  const [
    itemExcluir,
    setItemExcluir,
  ] =
    useState<Hospedagem | null>(
      null
    );

  const [
    salvandoEdicao,
    setSalvandoEdicao,
  ] = useState(false);

  const [
    excluindo,
    setExcluindo,
  ] = useState(false);

  const [
    mensagemSucesso,
    setMensagemSucesso,
  ] =
    useState<string | null>(
      null
    );

  /*
    ============================================================
    HELPERS DE FEEDBACK
    ============================================================
  */

  function mostrarToast(
    mensagem: string
  ) {
    setMensagemSucesso(
      mensagem
    );

    setTimeout(() => {
      setMensagemSucesso(
        null
      );
    }, 3000);
  }

  /*
    ============================================================
    CARREGAMENTO
    ============================================================
  */

  const contextoHospedagensERN = React.useRef<{
    usuarioId: string;
    empresaId: string;
  } | null>(null);
  const consultaHospedagensERN = React.useRef(0);
  const operacaoHospedagensERN = React.useRef(false);

  async function identificarEmpresaHospedagensERN() {
    const { data: auth, error: erroAuth } =
      await supabase.auth.getUser();

    if (erroAuth || !auth.user) {
      throw new Error('Entre novamente para acessar as hospedagens.');
    }

    const { data: perfil, error: erroPerfil } = await supabase
      .from('perfis')
      .select('empresa_id')
      .eq('id', auth.user.id)
      .single();

    if (erroPerfil || !perfil?.empresa_id) {
      throw new Error('Nao foi possivel identificar sua empresa.');
    }

    return {
      usuarioId: auth.user.id,
      empresaId: String(perfil.empresa_id),
    };
  }

  async function validarEmpresaHospedagensERN(id: string) {
    const esperado = contextoHospedagensERN.current;
    if (!esperado || !hospedagens.some(item => item.id === id)) {
      throw new Error('Atualize as hospedagens antes de continuar.');
    }

    const atual = await identificarEmpresaHospedagensERN();
    if (
      atual.usuarioId !== esperado.usuarioId ||
      atual.empresaId !== esperado.empresaId
    ) {
      throw new Error('Sua conta mudou. Atualize a pagina.');
    }
    return atual.empresaId;
  }

  async function fetchHospedagens() {
    const consulta = ++consultaHospedagensERN.current;
    setLoading(true);
    setError(null);
    contextoHospedagensERN.current = null;

    try {
      const contexto = await identificarEmpresaHospedagensERN();
      const lista: Hospedagem[] = [];
      let esperado: number | null = null;

      for (let inicio = 0; inicio < 10000; inicio += 200) {
        const { data, error, count } = await supabase
          .from('hospedagens')
          .select('*', { count: 'exact' })
          .eq('empresa_id', contexto.empresaId)
          .order('created_at', { ascending: false, nullsFirst: false })
          .order('id', { ascending: true })
          .range(inicio, inicio + 199);

        if (error) throw error;
        if (count === null || count > 10000) {
          throw new Error('O catalogo exige filtros no servidor.');
        }
        if (esperado !== null && esperado !== count) {
          throw new Error('Os cadastros mudaram durante a consulta. Atualize.');
        }

        esperado = count;
        lista.push(...((data ?? []) as Hospedagem[]));

        if (lista.length >= count) break;
        if (!data?.length) {
          throw new Error('A consulta ficou incompleta.');
        }
      }

      if (
        lista.length !== esperado ||
        lista.some(item => !item.id) ||
        new Set(lista.map(item => item.id)).size !== lista.length
      ) {
        throw new Error('Nao foi possivel carregar o catalogo completo.');
      }

      const atual = await identificarEmpresaHospedagensERN();
      if (
        atual.usuarioId !== contexto.usuarioId ||
        atual.empresaId !== contexto.empresaId
      ) {
        throw new Error('Sua conta mudou. Atualize a pagina.');
      }

      if (consulta !== consultaHospedagensERN.current) return;
      contextoHospedagensERN.current = contexto;
      setHospedagens(lista);
    } catch (falha) {
      if (consulta !== consultaHospedagensERN.current) return;
      setHospedagens([]);
      setError(
        falha instanceof Error
          ? falha.message
          : 'Nao foi possivel carregar as hospedagens.'
      );
    } finally {
      if (consulta === consultaHospedagensERN.current) setLoading(false);
    }
  }


  useEffect(() => {
    fetchHospedagens();
  }, []);

  /*
    ============================================================
    ABRIR EDIÇÃO
    ============================================================
  */

  function abrirEdicao(
    hospedagem: Hospedagem
  ) {
    setItemEditar({
      ...hospedagem,

      nome:
        obterNome(
          hospedagem
        ),

      endereco:
        obterEndereco(
          hospedagem
        ),
    });

    const valorAtualERN = converterValor(hospedagem.valor_diaria);
      setValorEdicao(
        Number.isFinite(valorAtualERN)
          ? valorAtualERN.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : ''
      );

    setStatusEdicao(
      obterStatus(
        hospedagem
      )
    );

    setError(null);
  }

  /*
    ============================================================
    ATUALIZAÇÃO
    ============================================================
  */

  async function salvarEdicao(
    event: React.FormEvent
  ) {
    event.preventDefault();
    if (operacaoHospedagensERN.current) return;

    if (
      !itemEditar?.id
    ) {
      return;
    }

    const nome =
      obterNome(
        itemEditar
      ).trim();

    if (!nome) {
      setError(
        'Informe o nome da hospedagem.'
      );

      return;
    }

    const diaria =
      converterValor(
        valorEdicao
      );

    if (
      !Number.isFinite(
        diaria
      ) ||
      diaria < 0
    ) {
      setError(
        'Informe um valor válido para a diária.'
      );

      return;
    }

    operacaoHospedagensERN.current = true;
    setSalvandoEdicao(true);

    setError(null);

    try {
      const payloadBase = {
        nome,

        tipo:
          itemEditar.tipo?.trim() ||
          null,

        endereco:
          obterEndereco(
            itemEditar
          ).trim() || null,

        telefone:
          itemEditar.telefone?.trim() ||
          null,

        valor_diaria:
          diaria,
      };

      /*
        Há código histórico usando
        "status" e outro usando
        "Status".

        Primeiro usamos a versão
        minúscula, que é a usada
        pelo formulário de criação.

        Se a base antiga exigir a
        coluna com maiúscula,
        tentamos a compatibilidade.
      */

      const empresa = await validarEmpresaHospedagensERN(itemEditar.id);
      const resultado = await supabase
        .from('hospedagens')
        .update({ ...payloadBase, status: statusEdicao })
        .eq('id', itemEditar.id)
        .eq('empresa_id', empresa)
        .select('id')
        .single();

      if (resultado.error) throw resultado.error;

      setItemEditar(null);

      mostrarToast(
        'Hospedagem atualizada com sucesso.'
      );

      await fetchHospedagens();
    } catch (err) {
      console.error(
        'Erro ao atualizar hospedagem:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível atualizar a hospedagem.'
      );
    } finally {
      operacaoHospedagensERN.current = false;
      setSalvandoEdicao(false);
    }
  }

  /*
    ============================================================
    EXCLUSÃO
    ============================================================
  */

  async function confirmarExclusao() {
    if (!itemExcluir?.id || operacaoHospedagensERN.current) {
      return;
    }

    operacaoHospedagensERN.current = true;
    setExcluindo(true);
    setError(null);

    try {
      const {
        error: deleteError,
      } = await supabase
        .from('hospedagens')
        .delete()
        .eq('id', itemExcluir.id)
       .eq('empresa_id', await validarEmpresaHospedagensERN(itemExcluir.id))
       .select('id')
       .single();

      if (deleteError) {
        throw deleteError;
      }

      setHospedagens(
        (atuais) =>
          atuais.filter(
            (hospedagem) =>
              hospedagem.id !==
              itemExcluir.id
          )
      );

      setItemExcluir(null);

      mostrarToast(
        'Hospedagem excluída com sucesso.'
      );
    } catch (err) {
      console.error(
        'Erro ao excluir hospedagem:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível excluir a hospedagem.'
      );
    } finally {
      operacaoHospedagensERN.current = false;
      setExcluindo(false);
    }
  }

  /*
    ============================================================
    MÉTRICAS
    ============================================================
  */

  const totalHospedagens =
    hospedagens.length;

  const disponiveis =
    hospedagens.filter(
      (hospedagem) =>
        obterStatus(
          hospedagem
        ) === 'Disponível'
    ).length;

  const ocupadas =
    hospedagens.filter(
      (hospedagem) =>
        obterStatus(
          hospedagem
        ) === 'Ocupada'
    ).length;

  const reservadas =
    hospedagens.filter(
      (hospedagem) =>
        obterStatus(
          hospedagem
        ) === 'Reservada'
    ).length;

  const indisponiveis =
    ocupadas +
    reservadas;

  const diariasValidasERN = hospedagens
        .map(item => converterValor(item.valor_diaria))
        .filter(Number.isFinite);

      const totalCentavosERN = diariasValidasERN.reduce(
        (total, valor) => total + Math.round(valor * 100),
        0,
      );

      const mediaDiaria =
        diariasValidasERN.length && Number.isSafeInteger(totalCentavosERN)
          ? Math.round(totalCentavosERN / diariasValidasERN.length) / 100
          : Number.NaN;

  /*
    ============================================================
    FILTROS
    ============================================================
  */

  const hospedagensFiltradas =
    useMemo(() => {
      const termo = busca
        .trim()
        .toLowerCase();

      return hospedagens.filter(
        (hospedagem) => {
          const nome =
            obterNome(
              hospedagem
            ).toLowerCase();

          const endereco =
            obterEndereco(
              hospedagem
            ).toLowerCase();

          const tipo =
            (
              hospedagem.tipo ||
              ''
            ).toLowerCase();

          const telefone =
            (
              hospedagem.telefone ||
              ''
            ).toLowerCase();

          const atendeBusca =
            !termo ||
            nome.includes(
              termo
            ) ||
            endereco.includes(
              termo
            ) ||
            tipo.includes(
              termo
            ) ||
            telefone.includes(
              termo
            );

          const status =
            obterStatus(
              hospedagem
            );

          let atendeStatus =
            true;

          if (
            filtroStatus ===
            'indisponiveis'
          ) {
            atendeStatus =
              status ===
                'Ocupada' ||
              status ===
                'Reservada';
          } else if (
            filtroStatus
          ) {
            atendeStatus =
              status ===
              filtroStatus;
          }

          return (
            atendeBusca &&
            atendeStatus
          );
        }
      );
    }, [
      hospedagens,
      busca,
      filtroStatus,
    ]);

  function filtrarPorStatus(
    status:
      | ''
      | StatusHospedagem
      | 'indisponiveis'
  ) {
    setFiltroStatus(
      (atual) =>
        atual === status
          ? ''
          : status
    );
  }

  const cards = [
    {
      titulo:
        'Total de unidades',
      valor: loading
        ? '—'
        : String(
            totalHospedagens
          ),
      detalhe:
        'hospedagens cadastradas',
      filtro: '' as const,
    },

    {
      titulo: 'Disponíveis',
      valor: loading
        ? '—'
        : String(disponiveis),
      detalhe:
        'disponíveis no momento',
      filtro:
        'Disponível' as const,
    },

    {
      titulo:
        'Ocupadas / Reservadas',
      valor: loading
        ? '—'
        : String(
            indisponiveis
          ),
      detalhe: `${ocupadas} ocupada${
        ocupadas === 1
          ? ''
          : 's'
      } • ${reservadas} reservada${
        reservadas === 1
          ? ''
          : 's'
      }`,
      filtro:
        'indisponiveis' as const,
    },

    {
      titulo:
        'Média da diária',
      valor: loading
        ? '—'
        : (diariasValidasERN.length ? formatarMoeda(mediaDiaria) : 'Sem valores'),
      detalhe:
        (diariasValidasERN.length < hospedagens.length
        ? 'valores ausentes ou invalidos excluidos'
        : 'media das diarias cadastradas'),
      filtro: null,
    },
  ];

  /*
    ============================================================
    STATUS VISUAL
    ============================================================
  */

  function statusClasses(
    status: StatusHospedagem
  ) {
    if (
      status ===
      'Disponível'
    ) {
      return 'border-emerald-500/20 bg-emerald-500/[0.07] text-[var(--ern-sucesso)]';
    }

    if (
      status ===
      'Reservada'
    ) {
      return 'border-sky-500/20 bg-sky-500/[0.07] text-[var(--ern-destaque)]';
    }

    return 'border-amber-500/20 bg-amber-500/[0.07] text-[var(--ern-destaque)]';
  }

  function statusDot(
    status: StatusHospedagem
  ) {
    if (
      status ===
      'Disponível'
    ) {
      return 'bg-emerald-400';
    }

    if (
      status ===
      'Reservada'
    ) {
      return 'bg-sky-400';
    }

    return 'bg-amber-400';
  }

  const inputClass =
    'w-full rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 py-3 text-sm text-[var(--ern-texto)] outline-none transition placeholder:text-[var(--ern-secundario)] focus:border-[var(--ern-destaque)]';

  const labelClass =
    'mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--ern-secundario)]';

  return (
    <div className="ern-hospedagens-premium min-h-screen bg-[var(--ern-fundo)] text-[var(--ern-texto)]">
      {/* TOAST */}

      {mensagemSucesso && (
        <div className="fixed left-1/2 top-[100px] z-[80] -translate-x-1/2 rounded-2xl border border-emerald-500/20 bg-[var(--ern-painel)] px-5 py-3 text-xs font-semibold text-[var(--ern-sucesso)] shadow-2xl">
          {mensagemSucesso}
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
                Estrutura • Hospedagens
              </span>
            </div>

            <h1
              className="mt-4 text-4xl leading-none tracking-[-0.035em] text-[var(--ern-texto)] md:text-5xl"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Hospedagens
            </h1>

            <p className="mt-4 max-w-[700px] text-sm leading-7 text-[var(--ern-secundario)]">
              Organize pousadas,
              hotéis, barcos-hotel e
              outras unidades ligadas
              à operação turística.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={
                fetchHospedagens
              }
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-5 text-xs font-semibold text-[var(--ern-secundario)] transition hover:bg-[var(--ern-suave)]"
            >
              ↻ Atualizar
            </button>

            <Link
              href="/hospedagens/novo"
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[var(--ern-botao)] px-6 text-sm font-bold text-[var(--ern-sobre-botao)] transition hover:-translate-y-0.5 hover:bg-[var(--ern-botao)]"
            >
              <span className="text-lg">
                +
              </span>

              Nova hospedagem
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1360px] px-5 py-8 md:px-8 md:py-10">
        {error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-5 py-4 text-xs text-[var(--ern-erro)]">
            <span>{error}</span>

            <button
              type="button"
              onClick={() =>
                setError(null)
              }
            >
              ✕
            </button>
          </div>
        )}

        {/* ===================================================
            INDICADORES
        ==================================================== */}

        <div className="ern-hospedagens-indicadores grid grid-cols-2 gap-3 xl:grid-cols-12">
          {cards.map(
            (card) => {
              const ativo =
                card.filtro !==
                  null &&
                filtroStatus ===
                  card.filtro;

              return (
                <button
                  key={
                    card.titulo
                  }
                  type="button"
                  onClick={() => {
                    if (
                      card.filtro !==
                      null
                    ) {
                      filtrarPorStatus(
                        card.filtro
                      );
                    }
                  }}
                  className={`min-w-0 rounded-2xl border p-3 text-left transition md:rounded-[22px] md:p-5 ${
                    card.filtro ===
                    null
                      ? 'cursor-default'
                      : 'cursor-pointer'
                  } ${
                    ativo
                      ? 'border-[var(--ern-destaque)] bg-[var(--ern-suave)]'
                      : 'border-[var(--ern-borda)] bg-[var(--ern-painel)] hover:border-[var(--ern-borda)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--ern-secundario)]">
                      {card.titulo}
                    </span>

                    {ativo && (
                      <span className="rounded-full bg-[var(--ern-suave)] px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-[var(--ern-destaque)]">
                        filtrando
                      </span>
                    )}
                  </div>

                  <strong
                    className={`mt-3 block break-words font-medium md:mt-5 tracking-[-0.04em] text-[var(--ern-texto)] ${
                      card.titulo ===
                      'Média da diária'
                        ? 'text-lg sm:text-xl md:text-3xl'
                        : 'text-2xl md:text-4xl'
                    }`}
                    style={{
                      fontFamily:
                        'var(--font-fraunces), serif',
                    }}
                  >
                    {card.valor}
                  </strong>

                  <p className="mt-2 text-[11px] text-[var(--ern-secundario)]">
                    {card.detalhe}
                  </p>
                </button>
              );
            }
          )}
        </div>

        {/* ===================================================
            TABELA
        ==================================================== */}

        <section className="ern-hospedagens-listagem mt-6 overflow-hidden rounded-[26px] border border-[var(--ern-borda)] bg-[var(--ern-painel)]">
          <div className="border-b border-[var(--ern-borda)] p-5 md:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--ern-destaque)]">
                  Estrutura operacional
                </p>

                <h2
                  className="mt-2 text-2xl text-[var(--ern-texto)]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Unidades cadastradas
                </h2>

                <p className="mt-2 text-xs text-[var(--ern-secundario)]">
                  {
                    hospedagensFiltradas.length
                  }{' '}
                  de{' '}
                  {
                    hospedagens.length
                  }{' '}
                  unidade
                  {hospedagens.length !==
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
                    value={busca}
                    onChange={(
                      event
                    ) =>
                      setBusca(
                        event.target
                          .value
                      )
                    }
                    placeholder="Buscar hospedagem..."
                    className="h-[44px] w-full min-w-0 sm:w-[270px] rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] pl-10 pr-4 text-xs text-[var(--ern-texto)] outline-none placeholder:text-[var(--ern-secundario)] focus:border-[var(--ern-destaque)]"
                  />
                </div>

                <select
                  value={
                    filtroStatus
                  }
                  onChange={(
                    event
                  ) =>
                    setFiltroStatus(
                      event.target
                        .value as
                        | ''
                        | StatusHospedagem
                        | 'indisponiveis'
                    )
                  }
                  className="h-[44px] rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 text-xs text-[var(--ern-secundario)] outline-none focus:border-[var(--ern-destaque)]"
                >
                  <option value="">
                    Todos os status
                  </option>

                  <option value="Disponível">
                    Disponíveis
                  </option>

                  <option value="Reservada">
                    Reservadas
                  </option>

                  <option value="Ocupada">
                    Ocupadas
                  </option>

                  <option value="indisponiveis">
                    Ocupadas ou reservadas
                  </option>
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
                    Carregando hospedagens...
                  </p>
                </div>
              </div>
            ) : hospedagensFiltradas.length ===
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
                    Nenhuma hospedagem encontrada.
                  </h3>

                  <p className="mt-2 text-xs text-[var(--ern-secundario)]">
                    Ajuste os filtros ou
                    cadastre uma nova
                    unidade.
                  </p>
                </div>
              </div>
            ) : (
              
<>
  <div className="grid min-w-0 gap-3 p-3 md:grid-cols-2 xl:hidden">
    {hospedagensFiltradas.map((hospedagem) => {
      const status = obterStatus(hospedagem);

      return (
        <article
          key={hospedagem.id}
          className="min-w-0 rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-4"
        >
          <h3 className="break-words text-base font-semibold text-[var(--ern-texto)]">
            {obterNome(hospedagem) || 'Hospedagem'}
          </h3>

          <span
            className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(status)}`}
          >
            {status}
          </span>

          <dl className="mt-4 grid min-w-0 grid-cols-2 gap-3 text-sm">
            {[
              ['Tipo', hospedagem.tipo || 'Nao informado'],
              ['Diaria', formatarMoeda(hospedagem.valor_diaria)],
              ['Telefone', hospedagem.telefone || 'Nao informado'],
            ].map(([rotulo, valor]) => (
              <div key={rotulo} className="min-w-0">
                <dt className="text-xs text-[var(--ern-secundario)]">
                  {rotulo}
                </dt>
                <dd className="mt-1 break-words text-[var(--ern-texto)]">
                  {valor}
                </dd>
              </div>
            ))}

            <div className="col-span-2 min-w-0">
              <dt className="text-xs text-[var(--ern-secundario)]">
                Localizacao
              </dt>
              <dd className="mt-1 break-words text-[var(--ern-texto)]">
                {obterEndereco(hospedagem) || 'Nao informada'}
              </dd>
            </div>
          </dl>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setItemVisualizar(hospedagem);
              }}
              className="min-h-11 rounded-xl border border-[var(--ern-borda)] px-2 text-xs text-[var(--ern-texto)]"
            >
              Detalhes
            </button>

            <button
              type="button"
              onClick={() => abrirEdicao(hospedagem)}
              className="min-h-11 rounded-xl border border-[var(--ern-borda)] px-2 text-xs text-[var(--ern-destaque)]"
            >
              Editar
            </button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setItemExcluir(hospedagem);
              }}
              className="min-h-11 rounded-xl border border-[var(--ern-borda)] px-2 text-xs text-[var(--ern-erro)]"
            >
              Excluir
            </button>
          </div>
        </article>
      );
    })}
  </div>

  <table className="hidden min-w-[1120px] w-full border-collapse text-left xl:table">

                <thead>
                  <tr className="border-b border-[var(--ern-borda)] bg-[var(--ern-suave)]">
                    {[
                      'Hospedagem',
                      'Endereço',
                      'Tipo',
                      'Telefone',
                      'Diária',
                      'Status',
                      'Ações',
                    ].map((titulo) => (
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
                        {titulo}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.055]">
                  {hospedagensFiltradas.map(
                    (
                      hospedagem,
                      index
                    ) => {
                      const status =
                        obterStatus(
                          hospedagem
                        );

                      return (
                        <tr
                          key={
                            hospedagem.id ||
                            index
                          }
                          className="transition hover:bg-[var(--ern-suave)]"
                        >
                          <td className="px-5 py-4">
                            <p className="text-xs font-semibold text-[var(--ern-secundario)]">
                              {obterNome(
                                hospedagem
                              ) ||
                                '—'}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-xs text-[var(--ern-secundario)]">
                            {obterEndereco(
                              hospedagem
                            ) ||
                              '—'}
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-full border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-2.5 py-1 text-[9px] text-[var(--ern-secundario)]">
                              {hospedagem.tipo ||
                                'Não informado'}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-xs text-[var(--ern-secundario)]">
                            {hospedagem.telefone ||
                              '—'}
                          </td>

                          <td className="px-5 py-4 text-xs font-semibold text-[#F4C77E]">
                            {formatarMoeda(
                              hospedagem.valor_diaria
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[9px] font-semibold ${statusClasses(
                                status
                              )}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${statusDot(
                                  status
                                )}`}
                              />

                              {status}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                title="Visualizar"
                                onClick={() =>
                                  setItemVisualizar(
                                    hospedagem
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--ern-borda)] bg-[var(--ern-suave)] text-[var(--ern-secundario)] transition hover:border-[var(--ern-destaque)] hover:text-[var(--ern-destaque)]"
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"
                                  />

                                  <circle
                                    cx="12"
                                    cy="12"
                                    r="3"
                                  />
                                </svg>
                              </button>

                              <button
                                type="button"
                                title="Editar"
                                onClick={() =>
                                  abrirEdicao(
                                    hospedagem
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--ern-borda)] bg-[var(--ern-suave)] text-[var(--ern-secundario)] transition hover:border-sky-400/20 hover:text-[var(--ern-destaque)]"
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L8 18l-4 1 1-4L16.5 3.5z"
                                  />
                                </svg>
                              </button>

                              <button
                                type="button"
                                title="Excluir"
                                onClick={() =>
                                  setItemExcluir(
                                    hospedagem
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--ern-borda)] bg-[var(--ern-suave)] text-[var(--ern-secundario)] transition hover:border-red-400/20 hover:text-[var(--ern-erro)]"
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v5m4-5v5"
                                  />
                                </svg>
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
          MODAL VISUALIZAR
      ====================================================== */}

      {itemVisualizar && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90dvh] w-full max-w-[640px] overflow-y-auto rounded-[26px] border border-[var(--ern-borda)] bg-[var(--ern-painel)] shadow-[0_35px_100px_rgba(0,0,0,0.65)]">
            <div className="flex items-start justify-between gap-5 border-b border-[var(--ern-borda)] px-6 py-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--ern-destaque)]">
                  Detalhes da hospedagem
                </p>

                <h3
                  className="mt-2 text-2xl text-[var(--ern-texto)]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  {obterNome(
                    itemVisualizar
                  ) || 'Hospedagem'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setItemVisualizar(
                    null
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] text-[var(--ern-secundario)]"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3 p-6 sm:grid-cols-2">
              {[
                {
                  label: 'Tipo',
                  valor:
                    itemVisualizar.tipo ||
                    'Não informado',
                },

                {
                  label: 'Status',
                  valor:
                    obterStatus(
                      itemVisualizar
                    ),
                },

                {
                  label:
                    'Telefone',
                  valor:
                    itemVisualizar.telefone ||
                    'Não informado',
                },

                {
                  label:
                    'Valor da diária',
                  valor:
                    formatarMoeda(
                      itemVisualizar.valor_diaria
                    ),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] p-4"
                >
                  <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[var(--ern-secundario)]">
                    {item.label}
                  </p>

                  <p className="mt-2 text-xs font-medium text-[var(--ern-secundario)]">
                    {item.valor}
                  </p>
                </div>
              ))}

              <div className="sm:col-span-2 rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] p-4">
                <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[var(--ern-secundario)]">
                  Localização / Endereço
                </p>

                <p className="mt-2 text-xs font-medium text-[var(--ern-secundario)]">
                  {obterEndereco(
                    itemVisualizar
                  ) ||
                    'Não informado'}
                </p>
              </div>
            </div>

            <div className="flex justify-end border-t border-[var(--ern-borda)] px-6 py-4">
              <button
                type="button"
                onClick={() =>
                  setItemVisualizar(
                    null
                  )
                }
                className="rounded-xl bg-[var(--ern-botao)] px-5 py-2.5 text-xs font-bold text-[var(--ern-sobre-botao)]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL EDITAR
      ====================================================== */}

      {itemEditar && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-[650px] overflow-y-auto rounded-[26px] border border-[var(--ern-borda)] bg-[var(--ern-painel)] shadow-[0_35px_100px_rgba(0,0,0,0.65)]">
            <div className="flex items-start justify-between gap-5 border-b border-[var(--ern-borda)] px-6 py-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--ern-destaque)]">
                  Estrutura • Edição
                </p>

                <h3
                  className="mt-2 text-2xl text-[var(--ern-texto)]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Editar hospedagem
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setItemEditar(null)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] text-[var(--ern-secundario)]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={salvarEdicao} className="space-y-5 p-6">
{error && (
  <p role="alert" className="rounded-xl border border-[var(--ern-borda)] p-3 text-sm text-[var(--ern-erro)]">
    {error}
  </p>
)}

              <div>
                <label
                  className={
                    labelClass
                  }
                >
                  Nome da hospedagem *
                </label>

                <input
                  type="text"
                  required
                  value={
                    itemEditar.nome ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    setItemEditar({
                      ...itemEditar,

                      nome:
                        event.target
                          .value,
                    })
                  }
                  className={
                    inputClass
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className={
                      labelClass
                    }
                  >
                    Tipo
                  </label>

                  <input
                    type="text"
                    value={
                      itemEditar.tipo ||
                      ''
                    }
                    onChange={(
                      event
                    ) =>
                      setItemEditar({
                        ...itemEditar,

                        tipo:
                          event.target
                            .value,
                      })
                    }
                    placeholder="Ex.: Pousada"
                    className={
                      inputClass
                    }
                  />
                </div>

                <div>
                  <label
                    className={
                      labelClass
                    }
                  >
                    Diária (R$) *
                  </label>

                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={
                      valorEdicao
                    }
                    onChange={(
                      event
                    ) =>
                      setValorEdicao(
                        event.target
                          .value
                      )
                    }
                    placeholder="Ex.: 350 ou 1.500"
                    className={
                      inputClass
                    }
                  />
                </div>
              </div>

              <div>
                <label
                  className={
                    labelClass
                  }
                >
                  Localização / Endereço
                </label>

                <input
                  type="text"
                  value={
                    itemEditar.endereco ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    setItemEditar({
                      ...itemEditar,

                      endereco:
                        event.target
                          .value,
                    })
                  }
                  className={
                    inputClass
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className={
                      labelClass
                    }
                  >
                    Telefone
                  </label>

                  <input
                    type="text"
                    value={
                      itemEditar.telefone ||
                      ''
                    }
                    onChange={(
                      event
                    ) =>
                      setItemEditar({
                        ...itemEditar,

                        telefone:
                          event.target
                            .value,
                      })
                    }
                    className={
                      inputClass
                    }
                  />
                </div>

                <div>
                  <label
                    className={
                      labelClass
                    }
                  >
                    Status
                  </label>

                  <select
                    value={
                      statusEdicao
                    }
                    onChange={(
                      event
                    ) =>
                      setStatusEdicao(
                        event.target
                          .value as StatusHospedagem
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="Disponível">
                      Disponível
                    </option>

                    <option value="Reservada">
                      Reservada
                    </option>

                    <option value="Ocupada">
                      Ocupada
                    </option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-[var(--ern-borda)] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setItemEditar(
                      null
                    )
                  }
                  className="rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-5 py-3 text-xs font-semibold text-[var(--ern-secundario)]"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    salvandoEdicao
                  }
                  className="rounded-xl bg-[var(--ern-botao)] px-6 py-3 text-xs font-bold text-[var(--ern-sobre-botao)] disabled:opacity-50"
                >
                  {salvandoEdicao
                    ? 'Salvando...'
                    : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL EXCLUIR
      ====================================================== */}

      {itemExcluir && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[430px] rounded-[26px] border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-6 text-center shadow-[0_35px_100px_rgba(0,0,0,0.65)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-red-500/20 bg-red-500/[0.08] text-[var(--ern-erro)]">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.3 4.3L2.8 17.3A2 2 0 004.5 20h15a2 2 0 001.7-2.7L13.7 4.3a2 2 0 00-3.4 0z"
                />
              </svg>
            </div>

            <h3
              className="mt-5 text-2xl text-[var(--ern-texto)]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Excluir hospedagem?
            </h3>

            <p className="mt-3 text-xs leading-6 text-[var(--ern-secundario)]">
              A unidade{' '}
              <strong className="text-[var(--ern-secundario)]">
                {obterNome(
                  itemExcluir
                ) ||
                  'selecionada'}
              </strong>{' '}
              será removida
              permanentemente da base.
            </p>

            
{error && (
  <p role="alert" className="rounded-xl border border-[var(--ern-borda)] p-3 text-sm text-[var(--ern-erro)]">
    {error}
  </p>
)}
<div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={
                  excluindo
                }
                onClick={() =>
                  setItemExcluir(
                    null
                  )
                }
                className="rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-4 py-3 text-xs font-semibold text-[var(--ern-secundario)]"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={
                  excluindo
                }
                onClick={
                  confirmarExclusao
                }
                className="rounded-xl border border-red-500/20 bg-red-500/[0.1] px-4 py-3 text-xs font-semibold text-[var(--ern-erro)] disabled:opacity-50"
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
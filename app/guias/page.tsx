'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  obterContextoGuias,
  validarContextoGuias,
  type ContextoGuias,
} from '@/lib/guiasOperacionais';

type StatusGuia = 'Ativo' | 'Em Tour' | 'Férias' | 'Inativo';

interface Guia {
  id?: string;
  nome?: string | null;
  cpf?: string | null;
  telefone?: string | null;
  idiomas?: string | null;
  cadastur?: string | null;
  status?: string | null;
  created_at?: string | null;
}

function removerAcentos(valor: string) {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizarStatus(valor?: string | null): StatusGuia {
  const status = removerAcentos(
    (valor || '').trim().toLowerCase()
  );

  if (status.includes('inativo')) return 'Inativo';
  if (status.includes('ferias')) return 'Férias';

  if (status.includes('tour') || status.includes('ocupado')) {
    return 'Em Tour';
  }

  return 'Ativo';
}

function somenteNumeros(valor: string) {
  return valor.replace(/\D/g, '');
}

function formatarCPF(valor?: string | null) {
  const numeros = somenteNumeros(valor || '').slice(0, 11);

  return numeros
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function formatarTelefone(valor?: string | null) {
  const numeros = somenteNumeros(valor || '').slice(0, 11);

  if (numeros.length <= 10) {
    return numeros
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  return numeros
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

function statusClasses(status: StatusGuia) {
  if (status === 'Ativo') {
    return 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300';
  }

  if (status === 'Em Tour') {
    return 'border-sky-500/20 bg-sky-500/[0.07] text-sky-300';
  }

  if (status === 'Férias') {
    return 'border-amber-500/20 bg-amber-500/[0.07] text-amber-300';
  }

  return 'border-red-500/20 bg-red-500/[0.07] text-red-300';
}

function statusDot(status: StatusGuia) {
  if (status === 'Ativo') return 'bg-emerald-400';
  if (status === 'Em Tour') return 'bg-sky-400';
  if (status === 'Férias') return 'bg-amber-400';

  return 'bg-red-400';
}

export default function GuiasPage() {
  const [contexto, setContexto] = useState<ContextoGuias | null>(
    null
  );

  const [guias, setGuias] = useState<Guia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  const [filtroStatus, setFiltroStatus] = useState<
    '' | StatusGuia
  >('');

  const [itemVisualizar, setItemVisualizar] =
    useState<Guia | null>(null);

  const [itemEditar, setItemEditar] =
    useState<Guia | null>(null);

  const [statusEdicao, setStatusEdicao] =
    useState<StatusGuia>('Ativo');

  const [itemExcluir, setItemExcluir] =
    useState<Guia | null>(null);

  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const [mensagemSucesso, setMensagemSucesso] =
    useState<string | null>(null);

  const podeGerenciar = !!contexto?.pode_gerenciar;

  function mostrarToast(mensagem: string) {
    setMensagemSucesso(mensagem);

    setTimeout(() => {
      setMensagemSucesso(null);
    }, 3000);
  }

  async function fetchGuias() {
    setLoading(true);
    setError(null);
    setGuias([]);
    setContexto(null);

    try {
      const atual = await obterContextoGuias();

      const { data, error: supabaseError } = await supabase
        .from('guias')
        .select(
          'id,nome,cpf,telefone,idiomas,cadastur,status,created_at'
        )
        .eq('empresa_id', atual.empresa_id)
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;

      const normalizados: Guia[] = (data || []).map(
        (item: Guia) => ({
          id: item.id,
          nome: item.nome || '',
          cpf: item.cpf || '',
          telefone: item.telefone || '',
          idiomas: item.idiomas || '',
          cadastur: item.cadastur || '',
          status: normalizarStatus(item.status),
          created_at: item.created_at,
        })
      );

      setGuias(normalizados);
      setContexto(atual);
    } catch (err) {
      console.error('Erro ao carregar guias:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar os guias da operadora.'
      );

      setGuias([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchGuias();
  }, []);

  function abrirEdicao(guia: Guia) {
    if (!podeGerenciar) return;

    setItemEditar({
      ...guia,
      cpf: formatarCPF(guia.cpf),
      telefone: formatarTelefone(guia.telefone),
    });

    setStatusEdicao(normalizarStatus(guia.status));
    setError(null);
  }

  async function salvarEdicao(event: React.FormEvent) {
    event.preventDefault();

    if (
      !itemEditar?.id ||
      !contexto ||
      !podeGerenciar ||
      salvandoEdicao
    ) {
      return;
    }

    const nome = itemEditar.nome?.trim() || '';
    const cpf = formatarCPF(itemEditar.cpf);
    const telefone = formatarTelefone(itemEditar.telefone);
    const cadastur = itemEditar.cadastur?.trim() || '';

    if (!nome) {
      setError('Informe o nome do guia.');
      return;
    }

    if (somenteNumeros(cpf).length !== 11) {
      setError('Informe um CPF com 11 dígitos.');
      return;
    }

    if (somenteNumeros(telefone).length < 10) {
      setError('Informe um telefone válido.');
      return;
    }

    if (!cadastur) {
      setError('Informe o registro CADASTUR.');
      return;
    }

    setSalvandoEdicao(true);
    setError(null);

    try {
      const atual = await validarContextoGuias(contexto);

      const { error: updateError } = await supabase
        .from('guias')
        .update({
          nome,
          cpf,
          telefone,
          idiomas: itemEditar.idiomas?.trim() || 'Português',
          cadastur,
          status: statusEdicao,
        })
        .eq('id', itemEditar.id)
        .eq('empresa_id', atual.empresa_id)
        .select('id')
        .single();

      if (updateError) throw updateError;

      setItemEditar(null);
      mostrarToast('Guia atualizado com sucesso.');

      await fetchGuias();
    } catch (err) {
      console.error('Erro ao atualizar guia:', err);

      setError(
        err instanceof Error
          ? `Erro ao atualizar: ${err.message}`
          : 'Não foi possível atualizar o guia. Confira sua permissão e se o registro ainda existe.'
      );
    } finally {
      setSalvandoEdicao(false);
    }
  }

  async function confirmarExclusao() {
    if (
      !itemExcluir?.id ||
      !contexto ||
      !podeGerenciar ||
      excluindo
    ) {
      return;
    }

    setExcluindo(true);
    setError(null);

    try {
      const atual = await validarContextoGuias(contexto);

      const { error: deleteError } = await supabase
        .from('guias')
        .delete()
        .eq('id', itemExcluir.id)
        .eq('empresa_id', atual.empresa_id)
        .select('id')
        .single();

      if (deleteError) throw deleteError;

      setGuias((atuais) =>
        atuais.filter((guia) => guia.id !== itemExcluir.id)
      );

      setItemExcluir(null);
      mostrarToast('Guia excluído com sucesso.');
    } catch (err) {
      console.error('Erro ao excluir guia:', err);

      setError(
        err instanceof Error
          ? `Erro ao excluir: ${err.message}`
          : 'Não foi possível excluir o guia. Confira sua permissão e se o registro ainda existe.'
      );
    } finally {
      setExcluindo(false);
    }
  }

  const totalGuias = guias.length;

  const ativos = guias.filter(
    (guia) => normalizarStatus(guia.status) === 'Ativo'
  ).length;

  const emTour = guias.filter(
    (guia) => normalizarStatus(guia.status) === 'Em Tour'
  ).length;

  const emFerias = guias.filter(
    (guia) => normalizarStatus(guia.status) === 'Férias'
  ).length;

  const inativos = guias.filter(
    (guia) => normalizarStatus(guia.status) === 'Inativo'
  ).length;

  const guiasFiltrados = useMemo(() => {
    const termo = removerAcentos(busca.trim().toLowerCase());

    return guias.filter((guia) => {
      const campos = [
        guia.nome,
        guia.cpf,
        guia.telefone,
        guia.idiomas,
        guia.cadastur,
      ];

      const atendeBusca =
        !termo ||
        campos.some((campo) =>
          removerAcentos((campo || '').toLowerCase()).includes(
            termo
          )
        );

      const atendeStatus =
        !filtroStatus ||
        normalizarStatus(guia.status) === filtroStatus;

      return atendeBusca && atendeStatus;
    });
  }, [guias, busca, filtroStatus]);

  function alternarStatus(status: StatusGuia) {
    setFiltroStatus((atual) =>
      atual === status ? '' : status
    );
  }

  const cards = [
    {
      titulo: 'Total de guias',
      valor: loading ? '—' : String(totalGuias),
      detalhe: 'profissionais cadastrados',
      filtro: null,
    },
    {
      titulo: 'Ativos',
      valor: loading ? '—' : String(ativos),
      detalhe: 'disponíveis para escala',
      filtro: 'Ativo' as StatusGuia,
    },
    {
      titulo: 'Em tour',
      valor: loading ? '—' : String(emTour),
      detalhe: 'em operação no momento',
      filtro: 'Em Tour' as StatusGuia,
    },
    {
      titulo: 'Em férias',
      valor: loading ? '—' : String(emFerias),
      detalhe: 'temporariamente indisponíveis',
      filtro: 'Férias' as StatusGuia,
    },
  ];

  const inputClass =
    'w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm text-[#EDEDE3] outline-none transition placeholder:text-[#EDEDE3]/20 focus:border-[#E3A144]/40';

  const labelClass =
    'mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/34';

  return (
    <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      {mensagemSucesso && (
        <div
          role="status"
          className="fixed left-1/2 top-[100px] z-[80] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-emerald-500/20 bg-[#0B2119] px-5 py-3 text-center text-xs font-semibold text-emerald-300 shadow-2xl"
        >
          {mensagemSucesso}
        </div>
      )}

      <section className="border-b border-white/[0.07] bg-[#091510]">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-8 px-5 py-10 md:px-8 md:py-12 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-[#E3A144]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                Estrutura • Guias
              </span>
            </div>

            <h1
              className="mt-4 text-4xl leading-none tracking-[-0.035em] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily: 'var(--font-fraunces), serif',
              }}
            >
              Guias
            </h1>

            <p className="mt-4 max-w-[720px] text-sm leading-7 text-[#EDEDE3]/42">
              Organize profissionais, contatos, idiomas,
              registros CADASTUR e disponibilidade da equipe
              da sua operadora.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void fetchGuias()}
              disabled={loading}
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.025] px-5 text-xs font-semibold text-[#EDEDE3]/55 transition hover:bg-white/[0.055] disabled:cursor-not-allowed disabled:opacity-50"
            >
              ↻ Atualizar
            </button>

            {podeGerenciar && (
              <Link
                href="/guias/novo"
                className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[#E3A144] px-6 text-sm font-bold text-[#07130F] transition hover:-translate-y-0.5 hover:bg-[#F0B35C]"
              >
                <span className="text-lg">+</span>
                Novo guia
              </Link>
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1360px] px-5 py-8 md:px-8 md:py-10">
        {error && !itemEditar && !itemExcluir && (
          <div
            role="alert"
            className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-5 py-4 text-xs text-red-300"
          >
            <span>{error}</span>
            <button
              type="button"
              aria-label="Fechar mensagem"
              onClick={() => setError(null)}
            >
              ✕
            </button>
          </div>
        )}

        {!loading && contexto && !podeGerenciar && (
          <p className="mb-5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-xs text-[#EDEDE3]/55">
            Seu perfil permite consultar os guias desta
            operadora. Alterações estão disponíveis para
            administradores e operadores.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const ativo =
              card.filtro !== null &&
              filtroStatus === card.filtro;

            return (
              <button
                key={card.titulo}
                type="button"
                onClick={() => {
                  if (card.filtro) {
                    alternarStatus(card.filtro);
                  } else {
                    setFiltroStatus('');
                  }
                }}
                className={`rounded-[22px] border p-5 text-left transition ${
                  ativo
                    ? 'border-[#E3A144]/35 bg-[#E3A144]/8'
                    : 'border-white/[0.075] bg-[#0A1713] hover:border-white/[0.13]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                    {card.titulo}
                  </span>

                  {ativo && (
                    <span className="rounded-full bg-[#E3A144]/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-[#E3A144]">
                      filtrando
                    </span>
                  )}
                </div>

                <strong
                  className="mt-5 block text-4xl font-medium tracking-[-0.04em] text-[#F0F0E8]"
                  style={{
                    fontFamily: 'var(--font-fraunces), serif',
                  }}
                >
                  {card.valor}
                </strong>

                <p className="mt-2 text-[11px] text-[#EDEDE3]/28">
                  {card.detalhe}
                </p>
              </button>
            );
          })}
        </div>

        {!loading && contexto && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => alternarStatus('Inativo')}
              className={`rounded-full border px-3 py-1.5 text-[9px] font-semibold transition ${
                filtroStatus === 'Inativo'
                  ? 'border-red-500/30 bg-red-500/[0.08] text-red-300'
                  : 'border-white/[0.07] bg-white/[0.02] text-[#EDEDE3]/35'
              }`}
            >
              {inativos} {inativos === 1 ? 'inativo' : 'inativos'}
            </button>
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-[26px] border border-white/[0.075] bg-[#0A1713]">
          <div className="border-b border-white/[0.065] p-5 md:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  Equipe operacional
                </p>

                <h2
                  className="mt-2 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily: 'var(--font-fraunces), serif',
                  }}
                >
                  Guias cadastrados
                </h2>

                <p className="mt-2 text-xs text-[#EDEDE3]/30">
                  {loading
                    ? 'Carregando...'
                    : `${guiasFiltrados.length} de ${guias.length} ${
                        guias.length === 1
                          ? 'profissional'
                          : 'profissionais'
                      }`}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="search"
                  aria-label="Buscar guias"
                  value={busca}
                  onChange={(event) =>
                    setBusca(event.target.value)
                  }
                  placeholder="Buscar nome, CPF, telefone..."
                  className={`${inputClass} sm:w-[280px]`}
                />

                <select
                  aria-label="Filtrar guias por status"
                  value={filtroStatus}
                  onChange={(event) =>
                    setFiltroStatus(
                      event.target.value as '' | StatusGuia
                    )
                  }
                  className={`${inputClass} sm:w-[180px]`}
                >
                  <option value="">Todos os status</option>
                  <option value="Ativo">Ativos</option>
                  <option value="Em Tour">Em tour</option>
                  <option value="Férias">Em férias</option>
                  <option value="Inativo">Inativos</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex min-h-[330px] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/[0.08] border-t-[#E3A144]" />
                  <p className="mt-4 text-xs text-[#EDEDE3]/35">
                    Carregando guias...
                  </p>
                </div>
              </div>
            ) : !contexto ? (
              <div className="flex min-h-[250px] items-center justify-center px-5 text-center">
                <p className="text-sm text-[#EDEDE3]/50">
                  Não foi possível carregar o cadastro da
                  operadora. Confira a mensagem acima e tente
                  atualizar.
                </p>
              </div>
            ) : guiasFiltrados.length === 0 ? (
              <div className="flex min-h-[330px] items-center justify-center px-5 text-center">
                <div>
                  <h3
                    className="text-2xl text-[#F0F0E8]"
                    style={{
                      fontFamily:
                        'var(--font-fraunces), serif',
                    }}
                  >
                    Nenhum guia encontrado.
                  </h3>
                  <p className="mt-2 text-xs text-[#EDEDE3]/30">
                    {podeGerenciar
                      ? 'Ajuste a busca ou cadastre um novo profissional.'
                      : 'Ajuste a busca ou consulte o responsável pela operadora.'}
                  </p>
                </div>
              </div>
            ) : (
              <table className="w-full min-w-[1160px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.012]">
                    {[
                      'Guia',
                      'CPF',
                      'Telefone',
                      'Idiomas',
                      'CADASTUR',
                      'Status',
                      'Ações',
                    ].map((titulo) => (
                      <th
                        key={titulo}
                        className={`px-5 py-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/28 ${
                          titulo === 'Ações'
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
                  {guiasFiltrados.map((guia, index) => {
                    const status = normalizarStatus(
                      guia.status
                    );

                    return (
                      <tr
                        key={guia.id || index}
                        className="transition hover:bg-white/[0.018]"
                      >
                        <td className="px-5 py-4">
                          <p className="text-xs font-semibold text-[#EDEDE3]/82">
                            {guia.nome || '—'}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-xs text-[#EDEDE3]/42">
                          {formatarCPF(guia.cpf) || '—'}
                        </td>

                        <td className="px-5 py-4 text-xs text-[#EDEDE3]/42">
                          {formatarTelefone(guia.telefone) ||
                            '—'}
                        </td>

                        <td className="px-5 py-4 text-xs text-[#EDEDE3]/42">
                          {guia.idiomas || '—'}
                        </td>

                        <td className="px-5 py-4 text-xs font-semibold text-[#F4C77E]">
                          {guia.cadastur || '—'}
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
                              aria-label={`Visualizar ${
                                guia.nome || 'guia'
                              }`}
                              onClick={() =>
                                setItemVisualizar(guia)
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-[#EDEDE3]/38 transition hover:border-[#E3A144]/20 hover:text-[#E3A144]"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
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

                            {podeGerenciar && (
                              <>
                                <button
                                  type="button"
                                  title="Editar"
                                  aria-label={`Editar ${
                                    guia.nome || 'guia'
                                  }`}
                                  onClick={() =>
                                    abrirEdicao(guia)
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-[#EDEDE3]/38 transition hover:border-sky-400/20 hover:text-sky-300"
                                >
                                  <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
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
                                  aria-label={`Excluir ${
                                    guia.nome || 'guia'
                                  }`}
                                  onClick={() => {
                                    setError(null);
                                    setItemExcluir(guia);
                                  }}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-[#EDEDE3]/38 transition hover:border-red-400/20 hover:text-red-300"
                                >
                                  <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v5m4-5v5"
                                    />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>

      {itemVisualizar && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-visualizar-guia"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[92vh] w-full max-w-[680px] overflow-y-auto rounded-[26px] border border-white/[0.09] bg-[#091510] shadow-[0_35px_100px_rgba(0,0,0,0.65)]">
            <div className="flex items-start justify-between gap-5 border-b border-white/[0.07] px-6 py-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  Dados profissionais
                </p>
                <h3
                  id="titulo-visualizar-guia"
                  className="mt-2 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily: 'var(--font-fraunces), serif',
                  }}
                >
                  {itemVisualizar.nome || 'Guia'}
                </h3>
              </div>

              <button
                type="button"
                aria-label="Fechar visualização"
                onClick={() => setItemVisualizar(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-[#EDEDE3]/45"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3 p-6 sm:grid-cols-2">
              {[
                {
                  label: 'CPF',
                  valor:
                    formatarCPF(itemVisualizar.cpf) ||
                    'Não informado',
                },
                {
                  label: 'Telefone / WhatsApp',
                  valor:
                    formatarTelefone(
                      itemVisualizar.telefone
                    ) || 'Não informado',
                },
                {
                  label: 'Idiomas',
                  valor:
                    itemVisualizar.idiomas ||
                    'Não informado',
                },
                {
                  label: 'CADASTUR',
                  valor:
                    itemVisualizar.cadastur ||
                    'Não informado',
                },
                {
                  label: 'Status',
                  valor: normalizarStatus(
                    itemVisualizar.status
                  ),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/[0.065] bg-white/[0.018] p-4"
                >
                  <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/28">
                    {item.label}
                  </p>
                  <p className="mt-2 break-words text-xs font-medium text-[#EDEDE3]/72">
                    {item.valor}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-end border-t border-white/[0.07] px-6 py-4">
              <button
                type="button"
                onClick={() => setItemVisualizar(null)}
                className="rounded-xl bg-[#E3A144] px-5 py-2.5 text-xs font-bold text-[#07130F]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {itemEditar && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-editar-guia"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[92vh] w-full max-w-[720px] overflow-y-auto rounded-[26px] border border-white/[0.09] bg-[#091510] shadow-[0_35px_100px_rgba(0,0,0,0.65)]">
            <div className="flex items-start justify-between gap-5 border-b border-white/[0.07] px-6 py-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  Estrutura • Edição
                </p>
                <h3
                  id="titulo-editar-guia"
                  className="mt-2 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily: 'var(--font-fraunces), serif',
                  }}
                >
                  Editar guia
                </h3>
              </div>

              <button
                type="button"
                aria-label="Fechar edição"
                disabled={salvandoEdicao}
                onClick={() => {
                  setItemEditar(null);
                  setError(null);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-[#EDEDE3]/45 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={salvarEdicao}
              className="space-y-5 p-6"
            >
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/20 bg-red-500/[0.07] p-4 text-xs text-red-300"
                >
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="guia-editar-nome"
                  className={labelClass}
                >
                  Nome completo *
                </label>
                <input
                  id="guia-editar-nome"
                  type="text"
                  required
                  value={itemEditar.nome || ''}
                  onChange={(event) =>
                    setItemEditar({
                      ...itemEditar,
                      nome: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="guia-editar-cpf"
                    className={labelClass}
                  >
                    CPF *
                  </label>
                  <input
                    id="guia-editar-cpf"
                    type="text"
                    inputMode="numeric"
                    required
                    value={itemEditar.cpf || ''}
                    onChange={(event) =>
                      setItemEditar({
                        ...itemEditar,
                        cpf: formatarCPF(event.target.value),
                      })
                    }
                    placeholder="000.000.000-00"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="guia-editar-telefone"
                    className={labelClass}
                  >
                    Telefone / WhatsApp *
                  </label>
                  <input
                    id="guia-editar-telefone"
                    type="text"
                    inputMode="tel"
                    required
                    value={itemEditar.telefone || ''}
                    onChange={(event) =>
                      setItemEditar({
                        ...itemEditar,
                        telefone: formatarTelefone(
                          event.target.value
                        ),
                      })
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="guia-editar-idiomas"
                    className={labelClass}
                  >
                    Idiomas
                  </label>
                  <input
                    id="guia-editar-idiomas"
                    type="text"
                    value={itemEditar.idiomas || ''}
                    onChange={(event) =>
                      setItemEditar({
                        ...itemEditar,
                        idiomas: event.target.value,
                      })
                    }
                    placeholder="Ex.: Português, Inglês"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="guia-editar-cadastur"
                    className={labelClass}
                  >
                    CADASTUR *
                  </label>
                  <input
                    id="guia-editar-cadastur"
                    type="text"
                    required
                    value={itemEditar.cadastur || ''}
                    onChange={(event) =>
                      setItemEditar({
                        ...itemEditar,
                        cadastur: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="guia-editar-status"
                  className={labelClass}
                >
                  Status
                </label>
                <select
                  id="guia-editar-status"
                  value={statusEdicao}
                  onChange={(event) =>
                    setStatusEdicao(
                      event.target.value as StatusGuia
                    )
                  }
                  className={inputClass}
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Em Tour">Em Tour</option>
                  <option value="Férias">Férias</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={salvandoEdicao}
                  onClick={() => {
                    setItemEditar(null);
                    setError(null);
                  }}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 py-3 text-xs font-semibold text-[#EDEDE3]/55 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={salvandoEdicao || !podeGerenciar}
                  className="rounded-xl bg-[#E3A144] px-6 py-3 text-xs font-bold text-[#07130F] disabled:cursor-not-allowed disabled:opacity-50"
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

      {itemExcluir && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-excluir-guia"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[92vh] w-full max-w-[430px] overflow-y-auto rounded-[26px] border border-white/[0.09] bg-[#091510] p-6 text-center shadow-[0_35px_100px_rgba(0,0,0,0.65)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-red-500/20 bg-red-500/[0.08] text-red-300">
              !
            </div>

            <h3
              id="titulo-excluir-guia"
              className="mt-5 text-2xl text-[#F0F0E8]"
              style={{
                fontFamily: 'var(--font-fraunces), serif',
              }}
            >
              Excluir guia?
            </h3>

            <p className="mt-3 text-xs leading-6 text-[#EDEDE3]/38">
              O profissional{' '}
              <strong className="text-[#EDEDE3]/70">
                {itemExcluir.nome || 'selecionado'}
              </strong>{' '}
              será removido permanentemente do cadastro desta
              operadora. Essa ação não exclui uma conta de
              acesso do guia.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.07] p-4 text-left text-xs text-red-300"
              >
                {error}
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={excluindo}
                onClick={() => {
                  setItemExcluir(null);
                  setError(null);
                }}
                className="rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-3 text-xs font-semibold text-[#EDEDE3]/60 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={excluindo || !podeGerenciar}
                onClick={() => void confirmarExclusao()}
                className="rounded-xl border border-red-500/20 bg-red-500/[0.1] px-4 py-3 text-xs font-semibold text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {excluindo ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
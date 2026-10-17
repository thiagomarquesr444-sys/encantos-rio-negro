'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Parceiro {
  id: string;
  created_at: string | null;
  nome: string;
  comissao_porcentagem: number | null;
  telefone: string | null;
  email: string | null;
  status: string | null;
  empresa_id: string;
  tipo: string | null;
  tipo_pessoa: string | null;
  documento: string | null;
  whatsapp: string | null;
  cidade: string | null;
  endereco: string | null;
  observacoes: string | null;
  updated_at: string | null;
}

type TipoFeedback = 'sucesso' | 'erro';

interface Feedback {
  tipo: TipoFeedback;
  texto: string;
}

const TIPOS_PARCEIRO = [
  'Agência',
  'Operador',
  'Hospedagem',
  'Transporte',
  'Fornecedor',
  'Prestador de serviço',
  'Outro',
];

function normalizarTexto(valor?: string | null) {
  return (valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatarPercentual(valor?: number | null) {
  const numero = Number(valor ?? 0);

  if (!Number.isFinite(numero)) {
    return '0%';
  }

  return `${numero.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

function formatarData(valor?: string | null) {
  if (!valor) return '—';

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return '—';
  }

  return data.toLocaleDateString('pt-BR');
}

function obterIniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);

  if (partes.length === 0) return 'ER';

  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase();
  }

  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

export default function ParceirosPage() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [visualizando, setVisualizando] = useState<Parceiro | null>(null);
  const [editando, setEditando] = useState<Parceiro | null>(null);
  const [excluindo, setExcluindo] = useState<Parceiro | null>(null);

  const [salvando, setSalvando] = useState(false);

  const contextoParceirosERN = React.useRef<{
    usuarioId: string;
    empresaId: string;
  } | null>(null);
  const consultaParceirosERN = React.useRef(0);
  const operacaoParceirosERN = React.useRef(false);

  function mensagemParceirosERN(falha: unknown, padrao: string) {
    if (
      falha && typeof falha === 'object' &&
      'message' in falha && typeof falha.message === 'string'
    ) {
      return falha.message;
    }
    return padrao;
  }

  async function identificarEmpresaParceirosERN() {
    const { data: auth, error: erroAuth } =
      await supabase.auth.getUser();

    if (erroAuth || !auth.user) {
      throw new Error('Entre novamente para acessar os parceiros.');
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

  async function validarEmpresaParceirosERN(id: string) {
    const esperado = contextoParceirosERN.current;
    const registro = parceiros.find(item => item.id === id);

    if (
      !esperado || !registro ||
      registro.empresa_id !== esperado.empresaId
    ) {
      throw new Error('Atualize os parceiros antes de continuar.');
    }

    const atual = await identificarEmpresaParceirosERN();

    if (
      atual.usuarioId !== esperado.usuarioId ||
      atual.empresaId !== esperado.empresaId
    ) {
      throw new Error('Sua conta mudou. Atualize a pagina.');
    }

    return atual.empresaId;
  }

  async function carregarParceiros() {
    const consulta = ++consultaParceirosERN.current;
    setLoading(true);
    setFeedback(atual => atual?.tipo === 'sucesso' ? atual : null);
    contextoParceirosERN.current = null;

    try {
      const contexto = await identificarEmpresaParceirosERN();
      const lista: Parceiro[] = [];
      let esperado: number | null = null;

      for (let inicio = 0; inicio < 10000; inicio += 200) {
        const { data, error, count } = await supabase
          .from('parceiros')
          .select('*', { count: 'exact' })
          .eq('empresa_id', contexto.empresaId)
          .order('nome', { ascending: true })
          .order('id', { ascending: true })
          .range(inicio, inicio + 199);

        if (error) throw error;
        if (count === null || count > 10000) {
          throw new Error('O cadastro exige filtros no servidor.');
        }
        if (esperado !== null && esperado !== count) {
          throw new Error('Os parceiros mudaram durante a consulta. Atualize.');
        }

        esperado = count;
        lista.push(...((data ?? []) as Parceiro[]));

        if (lista.length >= count) break;
        if (!data?.length) throw new Error('A consulta ficou incompleta.');
      }

      if (
        lista.length !== esperado ||
        lista.some(item => !item.id || item.empresa_id !== contexto.empresaId) ||
        new Set(lista.map(item => item.id)).size !== lista.length
      ) {
        throw new Error('Nao foi possivel carregar os parceiros completos.');
      }

      const atual = await identificarEmpresaParceirosERN();
      if (
        atual.usuarioId !== contexto.usuarioId ||
        atual.empresaId !== contexto.empresaId
      ) {
        throw new Error('Sua conta mudou. Atualize a pagina.');
      }

      if (consulta !== consultaParceirosERN.current) return;
      contextoParceirosERN.current = contexto;
      setParceiros(lista);
    } catch (falha) {
      if (consulta !== consultaParceirosERN.current) return;
      setParceiros([]);
      setFeedback({
        tipo: 'erro',
        texto: mensagemParceirosERN(falha, 'Nao foi possivel carregar os parceiros.'),
      });
    } finally {
      if (consulta === consultaParceirosERN.current) setLoading(false);
    }
  }


  useEffect(() => {
    carregarParceiros();
  }, []);

  const tiposExistentes = useMemo(() => {
    return Array.from(
      new Set(
        parceiros
          .map((parceiro) => parceiro.tipo?.trim())
          .filter((tipo): tipo is string => Boolean(tipo))
      )
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [parceiros]);

  const metricas = useMemo(() => {
    const ativos = parceiros.filter(
      (parceiro) => normalizarTexto(parceiro.status) === 'ativo'
    ).length;

    const fornecedores = parceiros.filter(
      (parceiro) => normalizarTexto(parceiro.tipo) === 'fornecedor'
    ).length;

    const cidades = new Set(
      parceiros.map((parceiro) => parceiro.cidade?.trim()).filter(Boolean)
    ).size;

    return {
      total: parceiros.length,
      ativos,
      fornecedores,
      cidades,
    };
  }, [parceiros]);

  const parceirosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);

    return parceiros.filter((parceiro) => {
      const atendeBusca =
        !termo ||
        normalizarTexto(parceiro.nome).includes(termo) ||
        normalizarTexto(parceiro.tipo).includes(termo) ||
        normalizarTexto(parceiro.cidade).includes(termo) ||
        normalizarTexto(parceiro.telefone).includes(termo) ||
        normalizarTexto(parceiro.whatsapp).includes(termo) ||
        normalizarTexto(parceiro.email).includes(termo) ||
        normalizarTexto(parceiro.documento).includes(termo);

      const atendeTipo =
        !filtroTipo ||
        normalizarTexto(parceiro.tipo) === normalizarTexto(filtroTipo);

      const atendeStatus =
        !filtroStatus ||
        normalizarTexto(parceiro.status) === normalizarTexto(filtroStatus);

      return atendeBusca && atendeTipo && atendeStatus;
    });
  }, [parceiros, busca, filtroTipo, filtroStatus]);

  async function salvarEdicao(event: React.FormEvent) {
    event.preventDefault();

    if (!editando?.id || operacaoParceirosERN.current) return;

    if (!editando.nome.trim()) {
      setFeedback({
        tipo: 'erro',
        texto: 'Informe o nome do parceiro.',
      });

      return;
    }

    const comissao = Number(editando.comissao_porcentagem ?? 0);

    if (
        !Number.isFinite(comissao) ||
        comissao < 0 ||
        comissao > 100 ||
        Math.abs(comissao * 100 - Math.round(comissao * 100)) > 0.000001
      ) {
      setFeedback({
        tipo: 'erro',
        texto: 'A comissao deve estar entre 0% e 100%, com ate duas casas decimais.',
      });

      return;
    }

    operacaoParceirosERN.current = true;
    setSalvando(true);
    setFeedback(null);

    try {
      const { error } = await supabase
        .from('parceiros')
        .update({
          nome: editando.nome.trim(),
          tipo: editando.tipo?.trim() || null,
          tipo_pessoa: editando.tipo_pessoa?.trim() || null,
          documento: editando.documento?.trim() || null,
          telefone: editando.telefone?.trim() || null,
          whatsapp: editando.whatsapp?.trim() || null,
          email: editando.email?.trim() || null,
          cidade: editando.cidade?.trim() || null,
          endereco: editando.endereco?.trim() || null,
          comissao_porcentagem: comissao,
          status: editando.status || 'ativo',
          observacoes: editando.observacoes?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editando.id)
       .eq('empresa_id', await validarEmpresaParceirosERN(editando.id))
       .select('id')
       .single();

      if (error) {
        throw error;
      }

      setEditando(null);

      setFeedback({
        tipo: 'sucesso',
        texto: 'Parceiro atualizado com sucesso.',
      });

      await carregarParceiros();
    } catch (error) {
      console.error('Erro ao atualizar parceiro:', error);

      setFeedback({
        tipo: 'erro',
        texto:
          mensagemParceirosERN(error, 'Não foi possível atualizar o parceiro.'),
      });
    } finally {
      operacaoParceirosERN.current = false;
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!excluindo?.id || operacaoParceirosERN.current) return;

    operacaoParceirosERN.current = true;
    setSalvando(true);
    setFeedback(null);

    try {
      const { error } = await supabase
        .from('parceiros')
        .delete()
        .eq('id', excluindo.id)
       .eq('empresa_id', await validarEmpresaParceirosERN(excluindo.id))
       .select('id')
       .single();

      if (error) {
        throw error;
      }

      setParceiros((atual) =>
        atual.filter((parceiro) => parceiro.id !== excluindo.id)
      );

      setExcluindo(null);

      setFeedback({
        tipo: 'sucesso',
        texto: 'Parceiro excluído com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao excluir parceiro:', error);

      setFeedback({
        tipo: 'erro',
        texto:
          mensagemParceirosERN(error, 'Não foi possível excluir o parceiro.'),
      });
    } finally {
      operacaoParceirosERN.current = false;
      setSalvando(false);
    }
  }

  function limparFiltros() {
    setBusca('');
    setFiltroTipo('');
    setFiltroStatus('');
  }

  const possuiFiltro = Boolean(busca || filtroTipo || filtroStatus);

  return (
    <div className="min-h-screen bg-[var(--ern-fundo)] text-[var(--ern-texto)]">
      <header className="border-b border-[var(--ern-borda)] bg-[var(--ern-painel)]">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-7 px-5 py-9 md:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-[var(--ern-botao)]" />

              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--ern-destaque)]">
                Rede Operacional ERN
              </span>
            </div>

            <h1
              className="mt-4 text-4xl tracking-[-0.04em] text-[var(--ern-texto)] md:text-5xl"
              style={{
                fontFamily: 'var(--font-fraunces), serif',
              }}
            >
              Parceiros
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ern-secundario)]">
              Organize parceiros, prestadores e fornecedores que participam
              da operação da sua empresa.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={carregarParceiros}
              disabled={loading}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-5 text-xs font-semibold text-[var(--ern-secundario)] transition hover:bg-[var(--ern-suave)] disabled:opacity-40"
            >
              ↻ Atualizar
            </button>

            <Link
              href="/parceiros/novo"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[var(--ern-botao)] px-6 text-sm font-bold text-[var(--ern-sobre-botao)] transition hover:bg-[var(--ern-botao)]"
            >
              <span className="text-lg">+</span>
              Novo parceiro
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1360px] space-y-6 px-5 py-8 md:px-8">
        {feedback && (
          <div
            className={`flex items-start justify-between gap-4 rounded-2xl border px-5 py-4 text-xs ${
              feedback.tipo === 'sucesso'
                ? 'border-emerald-500/20 bg-emerald-500/[0.07] text-[var(--ern-sucesso)]'
                : 'border-red-500/20 bg-red-500/[0.07] text-[var(--ern-erro)]'
            }`}
          >
            <span>{feedback.texto}</span>

            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
          <MetricCard
            titulo="Parceiros"
            valor={loading ? '—' : String(metricas.total)}
            descricao="registros da empresa"
          />

          <MetricCard
            titulo="Ativos"
            valor={loading ? '—' : String(metricas.ativos)}
            descricao="relações operacionais ativas"
          />

          <MetricCard
            titulo="Fornecedores"
            valor={loading ? '—' : String(metricas.fornecedores)}
            descricao="cadastrados atualmente"
          />

          <MetricCard
            titulo="Cidades"
            valor={loading ? '—' : String(metricas.cidades)}
            descricao="localidades representadas"
          />
        </section>

        <section className="rounded-[24px] border border-[var(--ern-destaque)] bg-[var(--ern-suave)] p-5 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--ern-destaque)]">
                Estrutura operacional
              </p>

              <h2
                className="mt-3 text-xl text-[var(--ern-texto)]"
                style={{
                  fontFamily: 'var(--font-fraunces), serif',
                }}
              >
                A base comercial que conecta a operação ERN.
              </h2>

              <p className="mt-2 max-w-3xl text-xs leading-6 text-[var(--ern-secundario)]">
                Parceiros cadastrados aqui poderão participar da cadeia de
                fornecedores, cotações, pedidos, compras e abastecimento das
                expedições.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                'Turismo',
                'Hospedagem',
                'Transporte',
                'Fornecedores',
                'Serviços',
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-3 py-1.5 text-[9px] font-semibold text-[var(--ern-secundario)]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-[var(--ern-borda)] bg-[var(--ern-painel)]">
          <div className="border-b border-[var(--ern-borda)] p-5 md:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--ern-secundario)]">
                  Diretório privado
                </p>

                <h2
                  className="mt-2 text-2xl text-[var(--ern-texto)]"
                  style={{
                    fontFamily: 'var(--font-fraunces), serif',
                  }}
                >
                  Rede da empresa
                </h2>

                <p className="mt-2 text-xs text-[var(--ern-secundario)]">
                  {parceirosFiltrados.length} de {parceiros.length}{' '}
                  {parceiros.length === 1 ? 'parceiro' : 'parceiros'}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[280px_180px_160px]">
                <input
                  type="search"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Nome, cidade, documento..."
                  className="h-[44px] rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 text-xs text-[var(--ern-texto)] outline-none placeholder:text-[var(--ern-secundario)] focus:border-[var(--ern-destaque)]"
                />

                <select
                  value={filtroTipo}
                  onChange={(event) => setFiltroTipo(event.target.value)}
                  className="h-[44px] rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 text-xs text-[var(--ern-texto)] outline-none focus:border-[var(--ern-destaque)]"
                >
                  <option value="">Todos os tipos</option>

                  {tiposExistentes.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>

                <select
                  value={filtroStatus}
                  onChange={(event) => setFiltroStatus(event.target.value)}
                  className="h-[44px] rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 text-xs text-[var(--ern-texto)] outline-none focus:border-[var(--ern-destaque)]"
                >
                  <option value="">Todos</option>
                  <option value="ativo">Ativos</option>
                  <option value="inativo">Inativos</option>
                </select>
              </div>
            </div>

            {possuiFiltro && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="text-[10px] font-semibold text-[var(--ern-destaque)] transition hover:text-[var(--ern-destaque)]"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--ern-borda)] border-t-[var(--ern-destaque)]" />

                <p className="mt-4 text-xs text-[var(--ern-secundario)]">
                  Carregando parceiros...
                </p>
              </div>
            </div>
          ) : parceirosFiltrados.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center p-6 text-center">
              <div className="max-w-md">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] text-xl text-[var(--ern-destaque)]">
                  ◇
                </div>

                <h3
                  className="mt-5 text-2xl text-[var(--ern-texto)]"
                  style={{
                    fontFamily: 'var(--font-fraunces), serif',
                  }}
                >
                  {parceiros.length === 0
                    ? 'Sua rede ainda está vazia.'
                    : 'Nenhum parceiro encontrado.'}
                </h3>

                <p className="mt-3 text-xs leading-6 text-[var(--ern-secundario)]">
                  {parceiros.length === 0
                    ? 'Cadastre o primeiro parceiro da empresa para começar a estruturar sua rede operacional.'
                    : 'Tente alterar os filtros utilizados na pesquisa.'}
                </p>

                {parceiros.length === 0 && (
                  <Link
                    href="/parceiros/novo"
                    className="mt-5 inline-flex min-h-[42px] items-center justify-center rounded-xl bg-[var(--ern-botao)] px-5 text-xs font-bold text-[var(--ern-sobre-botao)] transition hover:bg-[var(--ern-botao)]"
                  >
                    Cadastrar primeiro parceiro
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1050px] text-left">
                  <thead className="border-b border-[var(--ern-borda)] bg-[var(--ern-fundo)]">
                    <tr>
                      <TableHeader>Parceiro</TableHeader>
                      <TableHeader>Tipo</TableHeader>
                      <TableHeader>Localidade</TableHeader>
                      <TableHeader>Contato</TableHeader>
                      <TableHeader>Comissão</TableHeader>
                      <TableHeader>Status</TableHeader>
                      <TableHeader alinhamento="right">Ações</TableHeader>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/[0.055]">
                    {parceirosFiltrados.map((parceiro) => (
                      <tr
                        key={parceiro.id}
                        className="transition hover:bg-[var(--ern-suave)]"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] text-[11px] font-bold text-[var(--ern-destaque)]">
                              {obterIniciais(parceiro.nome)}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-[var(--ern-texto)]">
                                {parceiro.nome}
                              </p>

                              <p className="mt-1 text-[9px] text-[var(--ern-secundario)]">
                                {parceiro.tipo_pessoa || 'Tipo não informado'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="rounded-full border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-3 py-1 text-[9px] font-semibold text-[var(--ern-secundario)]">
                            {parceiro.tipo || 'Sem classificação'}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-[11px] text-[var(--ern-secundario)]">
                          {parceiro.cidade || '—'}
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-[11px] text-[var(--ern-secundario)]">
                            {parceiro.whatsapp ||
                              parceiro.telefone ||
                              parceiro.email ||
                              '—'}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-[11px] font-semibold text-[var(--ern-destaque)]">
                          {formatarPercentual(parceiro.comissao_porcentagem)}
                        </td>

                        <td className="px-6 py-4">
                          <StatusBadge status={parceiro.status} />
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <ActionButton
                              label="Ver"
                              onClick={() => setVisualizando(parceiro)}
                            />

                            <ActionButton
                              label="Editar"
                              onClick={() => setEditando({ ...parceiro })}
                            />

                            <ActionButton
                              label="Excluir"
                              danger
                              onClick={() => setExcluindo(parceiro)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-4 lg:hidden">
                {parceirosFiltrados.map((parceiro) => (
                  <article
                    key={parceiro.id}
                    className="rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] text-[11px] font-bold text-[var(--ern-destaque)]">
                          {obterIniciais(parceiro.nome)}
                        </div>

                        <div className="min-w-0">
                          <h3 className="break-words text-sm font-semibold text-[var(--ern-texto)]">
                            {parceiro.nome}
                          </h3>

                          <p className="mt-1 text-[10px] text-[var(--ern-secundario)]">
                            {parceiro.tipo || 'Sem classificação'}
                          </p>
                        </div>
                      </div>

                      <StatusBadge status={parceiro.status} />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <MiniInfo
                        titulo="Cidade"
                        valor={parceiro.cidade || '—'}
                      />

                      <MiniInfo
                        titulo="Comissão"
                        valor={formatarPercentual(
                          parceiro.comissao_porcentagem
                        )}
                      />

                      <MiniInfo
                        titulo="Contato"
                        valor={
                          parceiro.whatsapp ||
                          parceiro.telefone ||
                          parceiro.email ||
                          '—'
                        }
                      />

                      <MiniInfo
                        titulo="Cadastro"
                        valor={formatarData(parceiro.created_at)}
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--ern-borda)] pt-4">
                      <ActionButton
                        label="Ver"
                        full
                        onClick={() => setVisualizando(parceiro)}
                      />

                      <ActionButton
                        label="Editar"
                        full
                        onClick={() => setEditando({ ...parceiro })}
                      />
    <ActionButton
      label="Excluir"
      full
      danger
      onClick={() => {
        setFeedback(null);
        setExcluindo(parceiro);
      }}
    />
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      {visualizando && (
        <Modal onClose={() => setVisualizando(null)}>
          <ModalHeader
            titulo={visualizando.nome}
            subtitulo="Detalhes do parceiro"
            onClose={() => setVisualizando(null)}
          />

          <div className="grid gap-3 p-6 sm:grid-cols-2">
            <DetailCard titulo="Tipo" valor={visualizando.tipo || '—'} />

            <DetailCard
              titulo="Pessoa"
              valor={visualizando.tipo_pessoa || '—'}
            />

            <DetailCard
              titulo="Documento"
              valor={visualizando.documento || '—'}
            />

            <DetailCard
              titulo="Cidade"
              valor={visualizando.cidade || '—'}
            />

            <DetailCard
              titulo="Telefone"
              valor={visualizando.telefone || '—'}
            />

            <DetailCard
              titulo="WhatsApp"
              valor={visualizando.whatsapp || '—'}
            />

            <DetailCard titulo="E-mail" valor={visualizando.email || '—'} />

            <DetailCard
              titulo="Comissão"
              valor={formatarPercentual(visualizando.comissao_porcentagem)}
            />

            <DetailCard
              titulo="Endereço"
              valor={visualizando.endereco || '—'}
              span
            />

            <DetailCard
              titulo="Observações"
              valor={visualizando.observacoes || 'Nenhuma observação.'}
              span
            />
          </div>

          <div className="flex justify-end border-t border-[var(--ern-borda)] px-6 py-4">
            <button
              type="button"
              onClick={() => setVisualizando(null)}
              className="rounded-xl bg-[var(--ern-botao)] px-5 py-2.5 text-xs font-bold text-[var(--ern-sobre-botao)]"
            >
              Fechar
            </button>
          </div>
        </Modal>
      )}

      {editando && (
        <Modal onClose={() => setEditando(null)} maxWidth="760px">
          <ModalHeader
            titulo="Editar parceiro"
            subtitulo={editando.nome}
            onClose={() => setEditando(null)}
          />

          <form onSubmit={salvarEdicao}>
{feedback?.tipo === 'erro' && (
  <div
    role="alert"
    className="m-4 rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] p-3 text-sm text-[var(--ern-erro)]"
  >
    {feedback.texto}
  </div>
)}

            <div className="grid gap-5 p-6 md:grid-cols-2">
              <FormField label="Nome *" span>
                <input
                  required
                  value={editando.nome}
                  onChange={(event) =>
                    setEditando({
                      ...editando,
                      nome: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Tipo">
                <select
                  value={editando.tipo || ''}
                  onChange={(event) =>
                    setEditando({
                      ...editando,
                      tipo: event.target.value,
                    })
                  }
                  className={inputClass}
                >
                  <option value="">Selecione</option>

                  {TIPOS_PARCEIRO.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Tipo de pessoa">
                <select
                  value={editando.tipo_pessoa || ''}
                  onChange={(event) =>
                    setEditando({
                      ...editando,
                      tipo_pessoa: event.target.value,
                    })
                  }
                  className={inputClass}
                >
                  <option value="">Selecione</option>
                  <option value="Pessoa física">Pessoa física</option>
                  <option value="Pessoa jurídica">Pessoa jurídica</option>
                </select>
              </FormField>

              <FormField label="Documento">
                <input
                  value={editando.documento || ''}
                  onChange={(event) =>
                    setEditando({
                      ...editando,
                      documento: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Cidade">
                <input
                  value={editando.cidade || ''}
                  onChange={(event) =>
                    setEditando({
                      ...editando,
                      cidade: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Telefone">
                <input
                  value={editando.telefone || ''}
                  onChange={(event) =>
                    setEditando({
                      ...editando,
                      telefone: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="WhatsApp">
                <input
                  value={editando.whatsapp || ''}
                  onChange={(event) =>
                    setEditando({
                      ...editando,
                      whatsapp: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="E-mail">
                <input
                  type="email"
                  value={editando.email || ''}
                  onChange={(event) =>
                    setEditando({
                      ...editando,
                      email: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Comissão (%)">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={editando.comissao_porcentagem ?? 0}
                  onChange={(event) =>
                    setEditando({
                      ...editando,
                      comissao_porcentagem: Number(event.target.value),
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Status">
                <select
                  value={editando.status || 'ativo'}
                  onChange={(event) =>
                    setEditando({
                      ...editando,
                      status: event.target.value,
                    })
                  }
                  className={inputClass}
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </FormField>

              <FormField label="Endereço" span>
                <input
                  value={editando.endereco || ''}
                  onChange={(event) =>
                    setEditando({
                      ...editando,
                      endereco: event.target.value,
                    })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Observações" span>
                <textarea
                  rows={4}
                  value={editando.observacoes || ''}
                  onChange={(event) =>
                    setEditando({
                      ...editando,
                      observacoes: event.target.value,
                    })
                  }
                  className={`${inputClass} resize-none py-3`}
                />
              </FormField>
            </div>

            <div className="flex justify-end gap-3 border-t border-[var(--ern-borda)] px-6 py-4">
              <button
                type="button"
                onClick={() => setEditando(null)}
                className="rounded-xl border border-[var(--ern-borda)] px-5 py-2.5 text-xs font-semibold text-[var(--ern-secundario)]"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={salvando}
                className="rounded-xl bg-[var(--ern-botao)] px-5 py-2.5 text-xs font-bold text-[var(--ern-sobre-botao)] disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {excluindo && (
        <Modal onClose={() => setExcluindo(null)} maxWidth="460px">
          <div className="p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/[0.08] text-xl">
              !
            </div>

            <h3
              className="mt-5 text-2xl text-[var(--ern-texto)]"
              style={{
                fontFamily: 'var(--font-fraunces), serif',
              }}
            >
              Excluir parceiro?
            </h3>

            <p className="mt-3 text-xs leading-6 text-[var(--ern-secundario)]">
              O registro de{' '}
              <strong className="text-[var(--ern-texto)]">{excluindo.nome}</strong>{' '}
              será excluído. As reservas e os perfis publicos existentes permanecem,
   mas perdem o vinculo com este parceiro.
   Para preservar esses vinculos, prefira marcar o parceiro como Inativo.
            </p>

            
{feedback?.tipo === 'erro' && (
  <div
    role="alert"
    className="m-4 rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] p-3 text-sm text-[var(--ern-erro)]"
  >
    {feedback.texto}
  </div>
)}
<div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setExcluindo(null)}
                className="flex-1 rounded-xl border border-[var(--ern-borda)] px-4 py-3 text-xs font-semibold text-[var(--ern-secundario)]"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmarExclusao}
                disabled={salvando}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-xs font-bold text-white disabled:opacity-50"
              >
                {salvando ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const inputClass =
  'h-[44px] w-full rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 text-xs text-[var(--ern-texto)] outline-none placeholder:text-[var(--ern-secundario)] focus:border-[var(--ern-destaque)]';

function MetricCard({
  titulo,
  valor,
  descricao,
}: {
  titulo: string;
  valor: string;
  descricao: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-3 md:rounded-[22px] md:p-5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--ern-secundario)]">
        {titulo}
      </p>

      <strong
        className="mt-3 block break-words text-2xl font-medium md:mt-5 md:text-4xl tracking-[-0.04em] text-[var(--ern-texto)]"
        style={{
          fontFamily: 'var(--font-fraunces), serif',
        }}
      >
        {valor}
      </strong>

      <p className="mt-2 text-[11px] text-[var(--ern-secundario)]">{descricao}</p>
    </div>
  );
}

function TableHeader({
  children,
  alinhamento = 'left',
}: {
  children: React.ReactNode;
  alinhamento?: 'left' | 'right';
}) {
  return (
    <th
      className={`px-6 py-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--ern-secundario)] ${
        alinhamento === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const ativo = normalizarTexto(status) === 'ativo';

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-semibold ${
        ativo
          ? 'border-emerald-500/20 bg-emerald-500/[0.07] text-[var(--ern-sucesso)]'
          : 'border-[var(--ern-borda)] bg-[var(--ern-suave)] text-[var(--ern-secundario)]'
      }`}
    >
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  );
}

function ActionButton({
  label,
  onClick,
  danger = false,
  full = false,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  full?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${full ? 'flex-1' : ''} min-h-11 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
        danger
          ? 'border-red-500/15 bg-red-500/[0.04] text-[var(--ern-erro)] hover:bg-red-500/[0.08]'
          : 'border-[var(--ern-borda)] bg-[var(--ern-suave)] text-[var(--ern-secundario)] hover:border-[var(--ern-destaque)] hover:text-[var(--ern-destaque)]'
      }`}
    >
      {label}
    </button>
  );
}

function MiniInfo({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] p-3">
      <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-[var(--ern-secundario)]">
        {titulo}
      </p>

      <p className="mt-1.5 break-words text-xs text-[var(--ern-secundario)]">{valor}</p>
    </div>
  );
}

function Modal({
  children,
  onClose,
  maxWidth = '700px',
}: {
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-[26px] border border-[var(--ern-borda)] bg-[var(--ern-painel)] shadow-[0_35px_100px_rgba(0,0,0,0.65)]"
        style={{ maxWidth }}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({
  titulo,
  subtitulo,
  onClose,
}: {
  titulo: string;
  subtitulo: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--ern-borda)] px-6 py-5">
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--ern-destaque)]">
          {subtitulo}
        </p>

        <h3
          className="mt-2 text-2xl text-[var(--ern-texto)]"
          style={{
            fontFamily: 'var(--font-fraunces), serif',
          }}
        >
          {titulo}
        </h3>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] text-[var(--ern-secundario)]"
      >
        ✕
      </button>
    </div>
  );
}

function DetailCard({
  titulo,
  valor,
  span = false,
}: {
  titulo: string;
  valor: string;
  span?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] p-4 ${
        span ? 'sm:col-span-2' : ''
      }`}
    >
      <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[var(--ern-secundario)]">
        {titulo}
      </p>

      <p className="mt-2 whitespace-pre-wrap break-words text-xs font-medium leading-5 text-[var(--ern-secundario)]">
        {valor}
      </p>
    </div>
  );
}

function FormField({
  label,
  children,
  span = false,
}: {
  label: string;
  children: React.ReactNode;
  span?: boolean;
}) {
  return (
    <label className={span ? 'md:col-span-2' : ''}>
      <span className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--ern-secundario)]">
        {label}
      </span>

      {children}
    </label>
  );
}
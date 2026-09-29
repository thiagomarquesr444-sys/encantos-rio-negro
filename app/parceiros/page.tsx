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

  async function carregarParceiros() {
    setLoading(true);
    setFeedback(null);

    try {
      const { data, error } = await supabase
        .from('parceiros')
        .select(
          `
          id,
          created_at,
          nome,
          comissao_porcentagem,
          telefone,
          email,
          status,
          empresa_id,
          tipo,
          tipo_pessoa,
          documento,
          whatsapp,
          cidade,
          endereco,
          observacoes,
          updated_at
        `
        )
        .order('nome', { ascending: true });

      if (error) {
        throw error;
      }

      setParceiros((data ?? []) as Parceiro[]);
    } catch (error) {
      console.error('Erro ao carregar parceiros:', error);

      setFeedback({
        tipo: 'erro',
        texto:
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os parceiros.',
      });
    } finally {
      setLoading(false);
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

    if (!editando?.id) return;

    if (!editando.nome.trim()) {
      setFeedback({
        tipo: 'erro',
        texto: 'Informe o nome do parceiro.',
      });

      return;
    }

    const comissao = Number(editando.comissao_porcentagem ?? 0);

    if (!Number.isFinite(comissao) || comissao < 0 || comissao > 100) {
      setFeedback({
        tipo: 'erro',
        texto: 'A comissão deve estar entre 0% e 100%.',
      });

      return;
    }

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
        .eq('id', editando.id);

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
          error instanceof Error
            ? error.message
            : 'Não foi possível atualizar o parceiro.',
      });
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!excluindo?.id) return;

    setSalvando(true);
    setFeedback(null);

    try {
      const { error } = await supabase
        .from('parceiros')
        .delete()
        .eq('id', excluindo.id);

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
          error instanceof Error
            ? error.message
            : 'Não foi possível excluir o parceiro.',
      });
    } finally {
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
    <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      <header className="border-b border-white/[0.07] bg-[#091510]">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-7 px-5 py-9 md:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-[#E3A144]" />

              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#E3A144]">
                Rede Operacional ERN
              </span>
            </div>

            <h1
              className="mt-4 text-4xl tracking-[-0.04em] text-[#F0F0E8] md:text-5xl"
              style={{
                fontFamily: 'var(--font-fraunces), serif',
              }}
            >
              Parceiros
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#EDEDE3]/40">
              Organize parceiros, prestadores e fornecedores que participam
              da operação da sua empresa.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={carregarParceiros}
              disabled={loading}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 text-xs font-semibold text-[#EDEDE3]/55 transition hover:bg-white/[0.05] disabled:opacity-40"
            >
              ↻ Atualizar
            </button>

            <Link
              href="/parceiros/novo"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#E3A144] px-6 text-sm font-bold text-[#07130F] transition hover:bg-[#F0B35C]"
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
                ? 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-200'
                : 'border-red-500/20 bg-red-500/[0.07] text-red-300'
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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

        <section className="rounded-[24px] border border-[#E3A144]/15 bg-[#E3A144]/[0.035] p-5 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                Estrutura operacional
              </p>

              <h2
                className="mt-3 text-xl text-[#F0F0E8]"
                style={{
                  fontFamily: 'var(--font-fraunces), serif',
                }}
              >
                A base comercial que conecta a operação ERN.
              </h2>

              <p className="mt-2 max-w-3xl text-xs leading-6 text-[#EDEDE3]/35">
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
                  className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[9px] font-semibold text-[#EDEDE3]/38"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-white/[0.075] bg-[#0A1713]">
          <div className="border-b border-white/[0.06] p-5 md:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                  Diretório privado
                </p>

                <h2
                  className="mt-2 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily: 'var(--font-fraunces), serif',
                  }}
                >
                  Rede da empresa
                </h2>

                <p className="mt-2 text-xs text-[#EDEDE3]/28">
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
                  className="h-[44px] rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-xs text-[#EDEDE3] outline-none placeholder:text-[#EDEDE3]/20 focus:border-[#E3A144]/35"
                />

                <select
                  value={filtroTipo}
                  onChange={(event) => setFiltroTipo(event.target.value)}
                  className="h-[44px] rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-xs text-[#EDEDE3] outline-none focus:border-[#E3A144]/35"
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
                  className="h-[44px] rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-xs text-[#EDEDE3] outline-none focus:border-[#E3A144]/35"
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
                  className="text-[10px] font-semibold text-[#F4C77E] transition hover:text-[#E3A144]"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/[0.08] border-t-[#E3A144]" />

                <p className="mt-4 text-xs text-[#EDEDE3]/30">
                  Carregando parceiros...
                </p>
              </div>
            </div>
          ) : parceirosFiltrados.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center p-6 text-center">
              <div className="max-w-md">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.025] text-xl text-[#E3A144]">
                  ◇
                </div>

                <h3
                  className="mt-5 text-2xl text-[#F0F0E8]"
                  style={{
                    fontFamily: 'var(--font-fraunces), serif',
                  }}
                >
                  {parceiros.length === 0
                    ? 'Sua rede ainda está vazia.'
                    : 'Nenhum parceiro encontrado.'}
                </h3>

                <p className="mt-3 text-xs leading-6 text-[#EDEDE3]/30">
                  {parceiros.length === 0
                    ? 'Cadastre o primeiro parceiro da empresa para começar a estruturar sua rede operacional.'
                    : 'Tente alterar os filtros utilizados na pesquisa.'}
                </p>

                {parceiros.length === 0 && (
                  <Link
                    href="/parceiros/novo"
                    className="mt-5 inline-flex min-h-[42px] items-center justify-center rounded-xl bg-[#E3A144] px-5 text-xs font-bold text-[#07130F] transition hover:bg-[#F0B35C]"
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
                  <thead className="border-b border-white/[0.06] bg-[#07110E]">
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
                        className="transition hover:bg-white/[0.018]"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-[11px] font-bold text-[#E3A144]">
                              {obterIniciais(parceiro.nome)}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-[#F0F0E8]">
                                {parceiro.nome}
                              </p>

                              <p className="mt-1 text-[9px] text-[#EDEDE3]/25">
                                {parceiro.tipo_pessoa || 'Tipo não informado'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1 text-[9px] font-semibold text-[#EDEDE3]/45">
                            {parceiro.tipo || 'Sem classificação'}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-[11px] text-[#EDEDE3]/40">
                          {parceiro.cidade || '—'}
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-[11px] text-[#EDEDE3]/45">
                            {parceiro.whatsapp ||
                              parceiro.telefone ||
                              parceiro.email ||
                              '—'}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-[11px] font-semibold text-[#F4C77E]">
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
                    className="rounded-2xl border border-white/[0.065] bg-[#07110E] p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-[11px] font-bold text-[#E3A144]">
                          {obterIniciais(parceiro.nome)}
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-[#F0F0E8]">
                            {parceiro.nome}
                          </h3>

                          <p className="mt-1 text-[10px] text-[#EDEDE3]/28">
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

                    <div className="mt-5 flex gap-2 border-t border-white/[0.055] pt-4">
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

          <div className="flex justify-end border-t border-white/[0.07] px-6 py-4">
            <button
              type="button"
              onClick={() => setVisualizando(null)}
              className="rounded-xl bg-[#E3A144] px-5 py-2.5 text-xs font-bold text-[#07130F]"
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

            <div className="flex justify-end gap-3 border-t border-white/[0.07] px-6 py-4">
              <button
                type="button"
                onClick={() => setEditando(null)}
                className="rounded-xl border border-white/[0.08] px-5 py-2.5 text-xs font-semibold text-[#EDEDE3]/55"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={salvando}
                className="rounded-xl bg-[#E3A144] px-5 py-2.5 text-xs font-bold text-[#07130F] disabled:opacity-50"
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
              className="mt-5 text-2xl text-[#F0F0E8]"
              style={{
                fontFamily: 'var(--font-fraunces), serif',
              }}
            >
              Excluir parceiro?
            </h3>

            <p className="mt-3 text-xs leading-6 text-[#EDEDE3]/35">
              O registro de{' '}
              <strong className="text-[#F0F0E8]">{excluindo.nome}</strong>{' '}
              será excluído. Registros vinculados poderão impedir a operação.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setExcluindo(null)}
                className="flex-1 rounded-xl border border-white/[0.08] px-4 py-3 text-xs font-semibold text-[#EDEDE3]/55"
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
  'h-[44px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-xs text-[#EDEDE3] outline-none placeholder:text-[#EDEDE3]/20 focus:border-[#E3A144]/35';

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
    <div className="rounded-[22px] border border-white/[0.075] bg-[#0A1713] p-5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
        {titulo}
      </p>

      <strong
        className="mt-5 block text-4xl font-medium tracking-[-0.04em] text-[#F0F0E8]"
        style={{
          fontFamily: 'var(--font-fraunces), serif',
        }}
      >
        {valor}
      </strong>

      <p className="mt-2 text-[11px] text-[#EDEDE3]/28">{descricao}</p>
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
      className={`px-6 py-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#7C9C87] ${
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
          ? 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300'
          : 'border-white/[0.08] bg-white/[0.025] text-[#EDEDE3]/35'
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
      className={`${full ? 'flex-1' : ''} rounded-lg border px-3 py-2 text-[10px] font-semibold transition ${
        danger
          ? 'border-red-500/15 bg-red-500/[0.04] text-red-300 hover:bg-red-500/[0.08]'
          : 'border-white/[0.07] bg-white/[0.02] text-[#EDEDE3]/45 hover:border-[#E3A144]/20 hover:text-[#F4C77E]'
      }`}
    >
      {label}
    </button>
  );
}

function MiniInfo({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-white/[0.055] bg-white/[0.015] p-3">
      <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-[#EDEDE3]/20">
        {titulo}
      </p>

      <p className="mt-1.5 truncate text-[10px] text-[#EDEDE3]/50">{valor}</p>
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
        className="max-h-[90vh] w-full overflow-y-auto rounded-[26px] border border-white/[0.09] bg-[#091510] shadow-[0_35px_100px_rgba(0,0,0,0.65)]"
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
    <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-6 py-5">
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
          {subtitulo}
        </p>

        <h3
          className="mt-2 text-2xl text-[#F0F0E8]"
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
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-[#EDEDE3]/45"
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
      className={`rounded-2xl border border-white/[0.065] bg-white/[0.018] p-4 ${
        span ? 'sm:col-span-2' : ''
      }`}
    >
      <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/25">
        {titulo}
      </p>

      <p className="mt-2 whitespace-pre-wrap break-words text-xs font-medium leading-5 text-[#EDEDE3]/65">
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
      <span className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7C9C87]">
        {label}
      </span>

      {children}
    </label>
  );
}
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { BANNER_REGIONAL } from '@/lib/bannerImagens';

interface Reserva {
  id?: string | number;
  cliente?: string;
  pacote?: string;
  data?: string;
  agencia?: string;
  guia?: string;
  valor?: number;
  status?: string;
  observacoes?: string;
}

export default function ReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  // Estados para o Modal de Observações
  const [modalObsAberto, setModalObsAberto] = useState(false);
  const [obsSelecionada, setObsSelecionada] = useState('');

  // Estados para o Modal Customizado de Exclusão
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [idParaExcluir, setIdParaExcluir] = useState<string | number | null>(null);

  useEffect(() => {
    fetchReservas();
  }, []);

  async function fetchReservas() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.error('Erro na query do Supabase:', error);
      }

      if (data) {
        const reservasMapeadas: Reserva[] = data.map((item: any) => {
          let valBruto =
            item.valor_total !== undefined && item.valor_total !== null
              ? item.valor_total
              : item.valor !== undefined && item.valor !== null
              ? item.valor
              : 0;

          let numVal = Number(valBruto) || 0;

          if (numVal > 0 && numVal < 100) {
            numVal = numVal * 1000;
          }

          return {
            id: item.id,
            cliente: item.cliente || item.nome_cliente || 'Cliente não informado',
            pacote: item.pacote || item.passeio || 'Passeio padrão',
            data: item.data_reserva
              ? new Date(item.data_reserva).toLocaleDateString('pt-BR')
              : item.data || '—',
            agencia: item.agencia || item.parceiro || 'Particular',
            guia: item.guia || 'Não atribuído',
            valor: numVal,
            status: item.status || item.Status || 'Pendente',
            observacoes: item.observacoes || 'Nenhuma observação registrada.',
          };
        });

        setReservas(reservasMapeadas);
      }
    } catch (err) {
      console.error('Erro ao buscar reservas:', err);
    } finally {
      setLoading(false);
    }
  }

  const confirmarExclusao = (id: string | number | undefined) => {
    if (!id) return;
    setIdParaExcluir(id);
    setModalExcluirAberto(true);
  };

  const executarExclusao = async () => {
    if (!idParaExcluir) return;

    try {
      const { error } = await supabase.from('reservas').delete().eq('id', idParaExcluir);
      if (error) throw error;
      setReservas(reservas.filter((r) => r.id !== idParaExcluir));
      setModalExcluirAberto(false);
      setIdParaExcluir(null);
    } catch (err: any) {
      alert('Erro ao excluir reserva: ' + err.message);
    }
  };

  const abrirObservacoes = (observacoes: string | undefined) => {
    setObsSelecionada(observacoes || 'Nenhuma observação registrada para esta reserva.');
    setModalObsAberto(true);
  };

  const exportarRelatorio = () => {
    if (reservasFiltradas.length === 0) {
      alert('Não há dados para exportar com os filtros atuais.');
      return;
    }

    const headers = [
      'ID',
      'Cliente',
      'Pacote',
      'Data',
      'Agencia',
      'Guia',
      'Valor (R$)',
      'Status',
      'Observacoes',
    ];

    const rows = reservasFiltradas.map((r) => [
      r.id ?? '',
      `"${(r.cliente || '').replace(/"/g, '""')}"`,
      `"${(r.pacote || '').replace(/"/g, '""')}"`,
      `"${(r.data || '').replace(/"/g, '""')}"`,
      `"${(r.agencia || '').replace(/"/g, '""')}"`,
      `"${(r.guia || '').replace(/"/g, '""')}"`,
      r.valor !== undefined && r.valor !== null ? r.valor.toFixed(2) : '0.00',
      `"${(r.status || '').replace(/"/g, '""')}"`,
      `"${(r.observacoes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `relatorio_reservas_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const confirmadas = reservas.filter(
    (r) => r.status?.toLowerCase() === 'confirmada' || r.status?.toLowerCase() === 'confirmado'
  ).length;

  const pendentes = reservas.filter((r) => r.status?.toLowerCase() === 'pendente').length;

  const canceladas = reservas.filter(
    (r) => r.status?.toLowerCase() === 'cancelada' || r.status?.toLowerCase() === 'cancelado'
  ).length;

  const receitaTotal = reservas.reduce((acc, curr) => acc + (curr.valor || 0), 0);

  const handleCardClick = (statusFiltro: string) => {
    if (filtroStatus.toLowerCase() === statusFiltro.toLowerCase()) {
      setFiltroStatus('');
    } else {
      setFiltroStatus(statusFiltro);
    }
  };

  const reservasFiltradas = reservas.filter((r) => {
    const termo = busca.toLowerCase();
    const atendeBusca =
      (r.cliente || '').toLowerCase().includes(termo) ||
      (r.pacote || '').toLowerCase().includes(termo) ||
      (r.agencia || '').toLowerCase().includes(termo) ||
      (r.guia || '').toLowerCase().includes(termo) ||
      (r.status || '').toLowerCase().includes(termo);

    const statusAtual = (r.status || '').toLowerCase();
    const atendeStatus = filtroStatus ? statusAtual.includes(filtroStatus.toLowerCase()) : true;

    return atendeBusca && atendeStatus;
  });

  return (
    <div className="min-h-screen bg-[#071f1a] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white pb-16">
      {/* Hero Banner Superior */}
      <div
        className="relative h-[360px] w-full overflow-hidden bg-cover bg-center shadow-2xl"
        style={{
          backgroundImage: `linear-gradient(rgba(7, 31, 26, 0.25) 20%, rgba(7, 31, 26, 0.98) 100%), url('${BANNER_REGIONAL.modulos.viagembarco}')`,
        }}
      >
        <div className="max-w-7xl mx-auto w-full h-full flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-8 relative z-10">
          <div className="space-y-1.5 text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold tracking-widest uppercase mb-1 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Gestão Operacional • Carteira de Reservas
            </span>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-lg">
              Reservas Cadastradas
            </h1>
            <p className="text-emerald-100/95 text-sm md:text-base font-medium drop-shadow-md max-w-2xl leading-relaxed">
              Gerencie informações, status e histórico de todas as reservas operacionais em{' '}
              <span className="text-emerald-300 font-semibold">Barcelos, AM</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            {/* Botão Exportar Relatório com acabamento profissional */}
            <button
              onClick={exportarRelatorio}
              className="inline-flex items-center gap-2 bg-[#072a25] hover:bg-emerald-900/70 text-emerald-200 hover:text-white font-semibold text-sm px-5 py-3 rounded-xl transition-all border border-emerald-700/40 shadow-md backdrop-blur-sm cursor-pointer group"
            >
              <svg className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Exportar Relatório</span>
            </button>

            {/* Botão Nova Reserva Protegido */}
            <Link
              href="/reservas/nova"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-lg hover:shadow-emerald-900/50 transition-all border border-emerald-400/40 transform hover:-translate-y-0.5 cursor-pointer select-none"
              style={{ WebkitUserDrag: 'none' } as React.CSSProperties}
            >
              <span className="text-base font-bold">+</span> Nova Reserva
            </Link>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="p-8 max-w-7xl mx-auto w-full -mt-6 z-10 space-y-6 flex-1">
        {/* Cards Resumo Estilizados e Interativos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            onClick={() => handleCardClick('Confirmada')}
            className={`bg-[#041c17] rounded-2xl p-6 shadow-xl border border-emerald-900/60 border-l-4 border-l-emerald-400 transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:border-emerald-700/80 ${
              filtroStatus.toLowerCase() === 'confirmada'
                ? 'ring-2 ring-emerald-400 bg-[#062923]'
                : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400/80">
                Confirmadas
              </p>
              <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <p className="mt-4 text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              {loading ? '...' : confirmadas}
            </p>
            <p className="mt-2 text-xs font-medium underline text-emerald-300">
              {confirmadas === 1 ? 'Filtrar 1 registro' : `Filtrar ${confirmadas} registros`}
            </p>
          </div>

          <div
            onClick={() => handleCardClick('Pendente')}
            className={`bg-[#041c17] rounded-2xl p-6 shadow-xl border border-emerald-900/60 border-l-4 border-l-amber-400 transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:border-emerald-700/80 ${
              filtroStatus.toLowerCase() === 'pendente'
                ? 'ring-2 ring-amber-400 bg-[#062923]'
                : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400/80">
                Pendentes
              </p>
              <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="mt-4 text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              {loading ? '...' : pendentes}
            </p>
            <p className="mt-2 text-xs font-medium underline text-amber-300">
              {pendentes === 1 ? 'Filtrar 1 pendência' : `Filtrar ${pendentes} pendências`}
            </p>
          </div>

          <div
            onClick={() => handleCardClick('Cancelada')}
            className={`bg-[#041c17] rounded-2xl p-6 shadow-xl border border-emerald-900/60 border-l-4 border-l-rose-400 transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:border-emerald-700/80 ${
              filtroStatus.toLowerCase() === 'cancelada'
                ? 'ring-2 ring-rose-400 bg-[#062923]'
                : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-400/80">
                Canceladas
              </p>
              <div className="w-8 h-8 rounded-lg bg-rose-950/80 border border-rose-800/60 flex items-center justify-center text-rose-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <p className="mt-4 text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              {loading ? '...' : canceladas}
            </p>
            <p className="mt-2 text-xs font-medium underline text-rose-300">
              {canceladas === 1 ? 'Filtrar 1 cancelamento' : `Filtrar ${canceladas} cancelamentos`}
            </p>
          </div>

          <div className="bg-[#041c17] rounded-2xl p-6 shadow-xl border border-emerald-900/60 border-l-4 border-l-sky-400 transition-all duration-200">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-400/80">
                Receita Total
              </p>
              <div className="w-8 h-8 rounded-lg bg-sky-950/80 border border-sky-800/60 flex items-center justify-center text-sky-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="mt-4 text-2xl lg:text-3xl font-extrabold text-white tracking-tight truncate">
              {loading
                ? '...'
                : receitaTotal.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
            </p>
            <p className="mt-2 text-xs font-medium text-emerald-300/80">
              Faturamento bruto mapeado
            </p>
          </div>
        </div>

        {/* Tabela + Filtros Integrados */}
        <div className="bg-[#041c17] rounded-3xl border border-emerald-900/60 p-6 shadow-xl text-slate-100">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-emerald-900/50 pb-6">
            <div className="flex-1">
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Painel de Controladoria{' '}
                {filtroStatus && (
                  <span className="text-xs font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-700/50 px-3 py-1 rounded-full">
                    Filtrando por: {filtroStatus}
                  </span>
                )}
              </h2>
              <p className="mt-1 text-xs text-emerald-200/80">
                Pesquise por cliente, pacote, agência, guia ou status da reserva.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-full lg:w-80">
                <input
                  type="text"
                  placeholder="Pesquisar reserva..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full rounded-xl border border-emerald-900/60 bg-[#072a25] px-4 py-2.5 text-xs text-white placeholder-emerald-300/50 outline-none focus:border-emerald-500"
                />
              </div>

              {filtroStatus && (
                <button
                  onClick={() => setFiltroStatus('')}
                  className="rounded-xl bg-[#072a25] hover:bg-emerald-900/60 text-emerald-300 px-3 py-2.5 text-xs font-semibold transition border border-emerald-700/30 whitespace-nowrap cursor-pointer"
                >
                  Limpar ✕
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto min-h-[300px]">
            {loading ? (
              <div className="p-12 text-center text-emerald-400 font-medium">
                Carregando reservas do banco de dados...
              </div>
            ) : reservasFiltradas.length === 0 ? (
              <div className="p-12 text-center text-emerald-300/70 font-medium">
                Nenhuma reserva encontrada com os filtros selecionados.
              </div>
            ) : (
              <table className="min-w-[900px] w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-emerald-900/60 text-emerald-400 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 font-bold">Cliente</th>
                    <th className="px-4 py-3 font-bold">Pacote / Passeio</th>
                    <th className="px-4 py-3 font-bold">Data</th>
                    <th className="px-4 py-3 font-bold">Agência</th>
                    <th className="px-4 py-3 font-bold">Guia</th>
                    <th className="px-4 py-3 font-bold">Valor</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-950/60">
                  {reservasFiltradas.map((item, idx) => {
                    const st = (item.status || '').toLowerCase();
                    const isConfirmada = st.includes('confirmad');
                    const isPendente = st.includes('pendent');
                    const isCancelada = st.includes('cancelad');

                    return (
                      <tr
                        key={item.id || idx}
                        className="hover:bg-[#072a25]/50 transition-colors"
                      >
                        <td className="px-4 py-3.5 text-xs font-semibold text-white">
                          {item.cliente}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-emerald-200/80">
                          {item.pacote}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-emerald-200/80">
                          {item.data}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-emerald-200/80">
                          {item.agencia}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-emerald-200/80">
                          {item.guia}
                        </td>
                        <td className="px-4 py-3.5 text-xs font-bold text-emerald-400">
                          {item.valor !== undefined && item.valor !== null
                            ? item.valor.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })
                            : 'R$ 0,00'}
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              isConfirmada
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                                : isPendente
                                ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                                : isCancelada
                                ? 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                                : 'bg-slate-900 text-slate-300 border-slate-700/60'
                            }`}
                          >
                            {item.status || 'Pendente'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Visualizar Observações */}
                            <button
                              onClick={() => abrirObservacoes(item.observacoes)}
                              title="Ver Observações"
                              className="p-1.5 bg-[#072a25] hover:bg-emerald-900/60 text-emerald-300 rounded-lg transition border border-emerald-700/30 cursor-pointer"
                            >
                              👁️
                            </button>
                            {/* Editar */}
                            <Link
                              href={`/reservas/editar/${item.id}`}
                              title="Editar"
                              className="p-1.5 bg-[#072a25] hover:bg-blue-900/60 text-blue-300 rounded-lg transition border border-blue-700/30 cursor-pointer"
                            >
                              ✏️
                            </Link>
                            {/* Excluir */}
                            <button
                              onClick={() => confirmarExclusao(item.id)}
                              title="Excluir"
                              className="p-1.5 bg-[#072a25] hover:bg-rose-900/60 text-rose-300 rounded-lg transition border border-rose-700/30 cursor-pointer"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Observações */}
      {modalObsAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#041c17] p-6 shadow-2xl border border-emerald-900/80 text-slate-100 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-emerald-900/60 pb-3">
              <span>📝</span> Observações da Reserva
            </h3>
            <div className="text-xs text-emerald-100/90 bg-[#072a25] p-4 rounded-xl border border-emerald-900/60 leading-relaxed min-h-[90px]">
              {obsSelecionada}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setModalObsAberto(false)}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-2 text-xs font-semibold text-white transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {modalExcluirAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#041c17] p-6 shadow-2xl border border-emerald-900/80 text-slate-100 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-950/80 border border-rose-800/60 text-rose-400 rounded-full flex items-center justify-center mx-auto text-xl">
              ⚠️
            </div>
            <h3 className="text-base font-bold text-white">Confirmar Exclusão</h3>
            <p className="text-xs text-emerald-200/80 leading-relaxed">
              Deseja realmente excluir esta reserva do sistema? Esta ação não poderá ser desfeita.
            </p>
            <div className="flex items-center justify-center gap-3 pt-3 border-t border-emerald-900/60">
              <button
                onClick={() => setModalExcluirAberto(false)}
                className="flex-1 rounded-xl bg-[#072a25] hover:bg-[#0e433b] py-2.5 text-xs font-semibold text-emerald-200 transition border border-emerald-700/30 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={executarExclusao}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-500 py-2.5 text-xs font-semibold text-white transition shadow-lg cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
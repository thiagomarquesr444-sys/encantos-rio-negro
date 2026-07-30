'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Relatorio {
  id?: string;
  titulo?: string;
  tipo?: string;
  data_geracao?: string;
  gerado_por?: string;
  status?: string;
}

export default function RelatoriosPage() {
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Estados para modais de visualização, edição e exclusão
  const [itemVisualizar, setItemVisualizar] = useState<Relatorio | null>(null);
  const [itemEditar, setItemEditar] = useState<Relatorio | null>(null);
  const [itemExcluir, setItemExcluir] = useState<Relatorio | null>(null);
  const [salvando, setSalvando] = useState(false);

  const fetchRelatorios = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('relatorios')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRelatorios(data);
      }
    } catch (err) {
      console.error('Erro ao buscar relatórios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelatorios();
  }, []);

  const totalRelatorios = relatorios.length;
  const concluidos = relatorios.filter(
    (r) => r.status?.toLowerCase() === 'concluído' || r.status?.toLowerCase() === 'concluido' || r.status?.toLowerCase() === 'aprovado'
  ).length;
  const pendentes = relatorios.filter(
    (r) => r.status?.toLowerCase() === 'pendente' || r.status?.toLowerCase() === 'em análise'
  ).length;

  const handleCardClick = (statusFiltro: string) => {
    if (filtroStatus === statusFiltro) {
      setFiltroStatus('');
    } else {
      setFiltroStatus(statusFiltro);
    }
  };

  const exportarCSV = () => {
    if (relatorios.length === 0) return;
    const cabecalho = ['ID', 'Titulo', 'Tipo', 'Data', 'Autor', 'Status'];
    const linhas = relatorios.map((r) => [
      r.id || '',
      `"${r.titulo || ''}"`,
      `"${r.tipo || ''}"`,
      r.data_geracao || '',
      `"${r.gerado_por || ''}"`,
      r.status || 'Concluído',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [cabecalho.join(','), ...linhas.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'relatorios_operacionais.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const salvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemEditar || !itemEditar.id) return;
    setSalvando(true);

    try {
      const { error } = await supabase
        .from('relatorios')
        .update({
          titulo: itemEditar.titulo,
          tipo: itemEditar.tipo,
          gerado_por: itemEditar.gerado_por,
          status: itemEditar.status,
          data_geracao: itemEditar.data_geracao,
        })
        .eq('id', itemEditar.id);

      if (error) throw error;

      setItemEditar(null);
      setMensagemSucesso('Relatório atualizado com sucesso!');
      setTimeout(() => setMensagemSucesso(null), 4000);
      fetchRelatorios();
    } catch (err: any) {
      console.error('Erro ao atualizar:', err);
    } finally {
      setSalvando(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!itemExcluir || !itemExcluir.id) return;
    setSalvando(true);

    try {
      const { error } = await supabase.from('relatorios').delete().eq('id', itemExcluir.id);
      if (error) throw error;

      setRelatorios((prev) => prev.filter((r) => r.id !== itemExcluir.id));
      setItemExcluir(null);
      setMensagemSucesso('Relatório excluído com sucesso!');
      setTimeout(() => setMensagemSucesso(null), 4000);
    } catch (err: any) {
      console.error('Erro ao excluir:', err);
    } finally {
      setSalvando(false);
    }
  };

  const relatoriosFiltrados = relatorios.filter((r) => {
    const termo = busca.toLowerCase();
    const atendeBusca =
      (r.titulo || '').toLowerCase().includes(termo) ||
      (r.tipo || '').toLowerCase().includes(termo) ||
      (r.gerado_por || '').toLowerCase().includes(termo) ||
      (r.status || '').toLowerCase().includes(termo);

    const statusAtual = (r.status || '').toLowerCase();
    const atendeStatus = filtroStatus ? statusAtual.includes(filtroStatus.toLowerCase()) : true;

    return atendeBusca && atendeStatus;
  });

  return (
    <div className="min-h-screen bg-[#072822] text-slate-100 flex flex-col">
      <div 
        className="relative bg-cover bg-center py-12 px-8 text-white flex flex-col items-center justify-center text-center shadow-md border-b border-emerald-950/40"
        style={{
          backgroundImage: `linear-gradient(rgba(7, 40, 34, 0.85), rgba(4, 24, 20, 0.95)), url('https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1600&auto=format&fit=crop')`,
        }}
      >
        <div className="max-w-4xl space-y-3">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center justify-center gap-3 text-white">
            <span>📈</span> Relatórios Operacionais
          </h1>
          <p className="text-emerald-200/90 text-sm md:text-base font-medium">
            Painel de controle, métricas gerenciais e relatórios integrados ao banco de dados.
          </p>
          
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/relatorios/novo"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-5 py-2.5 rounded-lg shadow-lg transition-all flex items-center gap-2"
            >
              <span>+</span> Novo Relatório
            </Link>
            <button
              onClick={exportarCSV}
              className="bg-emerald-900/60 hover:bg-emerald-900/80 text-emerald-100 font-semibold text-sm px-5 py-2.5 rounded-lg shadow-lg transition-all border border-emerald-700/50 backdrop-blur-sm flex items-center gap-2"
            >
              <span>📑</span> Exportar Dados
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto w-full -mt-6 z-10 space-y-8 flex-1">
        {mensagemSucesso && (
          <div className="bg-emerald-950 border border-emerald-700 p-4 rounded-xl text-emerald-200 text-sm font-semibold shadow-md flex items-center justify-between">
            <span>✅ {mensagemSucesso}</span>
            <button onClick={() => setMensagemSucesso(null)} className="text-emerald-400 font-bold">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-[#041c17] rounded-2xl p-6 shadow-xl border border-emerald-900/60 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400/80">Total de Relatórios</span>
              <span className="text-xl">📊</span>
            </div>
            <div className="mt-4">
              <h2 className="text-4xl font-extrabold text-white">{loading ? '...' : totalRelatorios}</h2>
              <p className="text-xs font-semibold text-emerald-300/80 mt-2">
                {totalRelatorios === 1 ? '1 relatório gerado' : `${totalRelatorios} relatórios gerados`}
              </p>
            </div>
          </div>

          <div 
            onClick={() => handleCardClick('concluído')}
            className={`bg-[#041c17] rounded-2xl p-6 shadow-xl border cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between group ${
              filtroStatus.toLowerCase() === 'concluído' ? 'ring-2 ring-emerald-400 bg-emerald-950/50' : 'border-emerald-900/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400/80 group-hover:text-emerald-300 transition-colors">Concluídos / Aprovados</span>
              <span className="text-xl">✅</span>
            </div>
            <div className="mt-4">
              <h2 className="text-4xl font-extrabold text-white">{loading ? '...' : concluidos}</h2>
              <p className="text-xs font-semibold text-emerald-400 mt-2 underline">
                {concluidos === 1 ? 'Filtrar 1 concluído' : `Filtrar ${concluidos} concluídos`}
              </p>
            </div>
          </div>

          <div 
            onClick={() => handleCardClick('pendente')}
            className={`bg-[#041c17] rounded-2xl p-6 shadow-xl border cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between group ${
              filtroStatus.toLowerCase() === 'pendente' ? 'ring-2 ring-amber-400 bg-amber-950/30' : 'border-emerald-900/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400/80 group-hover:text-amber-400 transition-colors">Pendentes / Em Análise</span>
              <span className="text-xl">⏳</span>
            </div>
            <div className="mt-4">
              <h2 className="text-4xl font-extrabold text-white">{loading ? '...' : pendentes}</h2>
              <p className="text-xs font-semibold text-amber-400 mt-2 underline">
                {pendentes === 1 ? 'Filtrar 1 pendência' : `Filtrar ${pendentes} pendências`}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#041c17] px-5 py-3.5 rounded-2xl border border-emerald-800/60 shadow-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full">
            <span className="text-emerald-400 text-lg">🔍</span>
            <input
              type="text"
              placeholder="Pesquisar por título, tipo, autor ou status..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full text-sm text-slate-100 placeholder-emerald-400/60 bg-transparent focus:outline-none"
            />
          </div>
          {filtroStatus && (
            <button
              onClick={() => setFiltroStatus('')}
              className="text-xs font-semibold bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-700 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors"
            >
              Limpar Filtro ({filtroStatus}) ✕
            </button>
          )}
        </div>

        <div className="bg-[#041c17] rounded-2xl shadow-2xl border border-emerald-900/60 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-emerald-300 text-sm">Carregando dados do Supabase...</div>
          ) : relatoriosFiltrados.length === 0 ? (
            <div className="p-16 text-center text-emerald-400/70 text-sm">
              Nenhum relatório encontrado com os critérios informados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#02110e] text-emerald-200 text-xs uppercase tracking-wider border-b border-emerald-900/80">
                  <tr>
                    <th className="px-6 py-4">Título</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Autor</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/40 text-slate-200">
                  {relatoriosFiltrados.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-emerald-900/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-white">{item.titulo || '—'}</td>
                      <td className="px-6 py-4 text-emerald-300">{item.tipo || '—'}</td>
                      <td className="px-6 py-4 text-slate-400">{item.data_geracao || '—'}</td>
                      <td className="px-6 py-4 text-slate-300">{item.gerado_por || '—'}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                          {item.status || 'Concluído'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setItemVisualizar(item)}
                            title="Visualizar relatório"
                            className="p-2 rounded-lg bg-sky-950/50 hover:bg-sky-900 text-sky-300 transition-colors"
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => setItemEditar(item)}
                            title="Editar relatório"
                            className="p-2 rounded-lg bg-emerald-900/50 hover:bg-emerald-900 text-emerald-300 transition-colors"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => setItemExcluir(item)}
                            title="Excluir relatório"
                            className="p-2 rounded-lg bg-rose-950/50 hover:bg-rose-900 text-rose-300 transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Visualizar */}
      {itemVisualizar && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#041c17] border border-emerald-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-emerald-900 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>👁️</span> Detalhes do Relatório
              </h3>
              <button onClick={() => setItemVisualizar(null)} className="text-emerald-400 font-bold">✕</button>
            </div>
            
            <div className="space-y-4 text-sm">
              <div className="bg-[#072822] p-4 rounded-xl border border-emerald-800/60">
                <span className="block text-xs font-bold uppercase text-emerald-400 mb-1">Título</span>
                <p className="text-white font-medium">{itemVisualizar.titulo || '—'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#072822] p-4 rounded-xl border border-emerald-800/60">
                  <span className="block text-xs font-bold uppercase text-emerald-400 mb-1">Tipo</span>
                  <p className="text-emerald-300 font-medium">{itemVisualizar.tipo || '—'}</p>
                </div>
                <div className="bg-[#072822] p-4 rounded-xl border border-emerald-800/60">
                  <span className="block text-xs font-bold uppercase text-emerald-400 mb-1">Status</span>
                  <p className="text-emerald-200 font-medium">{itemVisualizar.status || 'Concluído'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#072822] p-4 rounded-xl border border-emerald-800/60">
                  <span className="block text-xs font-bold uppercase text-emerald-400 mb-1">Autor / Responsável</span>
                  <p className="text-slate-200 font-medium">{itemVisualizar.gerado_por || '—'}</p>
                </div>
                <div className="bg-[#072822] p-4 rounded-xl border border-emerald-800/60">
                  <span className="block text-xs font-bold uppercase text-emerald-400 mb-1">Data de Geração</span>
                  <p className="text-slate-300 font-medium">{itemVisualizar.data_geracao || '—'}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-emerald-900">
              <button
                type="button"
                onClick={() => setItemVisualizar(null)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {itemEditar && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#041c17] border border-emerald-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-emerald-900 pb-3">Editar Relatório</h3>
            <form onSubmit={salvarEdicao} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase text-emerald-400 mb-1">Título</label>
                <input
                  type="text"
                  required
                  value={itemEditar.titulo || ''}
                  onChange={(e) => setItemEditar({ ...itemEditar, titulo: e.target.value })}
                  className="w-full bg-[#072822] border border-emerald-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-emerald-400 mb-1">Tipo</label>
                  <input
                    type="text"
                    value={itemEditar.tipo || ''}
                    onChange={(e) => setItemEditar({ ...itemEditar, tipo: e.target.value })}
                    className="w-full bg-[#072822] border border-emerald-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-emerald-400 mb-1">Autor (Gerado Por)</label>
                  <input
                    type="text"
                    value={itemEditar.gerado_por || ''}
                    onChange={(e) => setItemEditar({ ...itemEditar, gerado_por: e.target.value })}
                    className="w-full bg-[#072822] border border-emerald-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-emerald-400 mb-1">Status</label>
                  <select
                    value={itemEditar.status || 'Concluído'}
                    onChange={(e) => setItemEditar({ ...itemEditar, status: e.target.value })}
                    className="w-full bg-[#072822] border border-emerald-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Concluído">Concluído</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Em Análise">Em Análise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-emerald-400 mb-1">Data</label>
                  <input
                    type="date"
                    value={itemEditar.data_geracao || ''}
                    onChange={(e) => setItemEditar({ ...itemEditar, data_geracao: e.target.value })}
                    className="w-full bg-[#072822] border border-emerald-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-emerald-900">
                <button
                  type="button"
                  onClick={() => setItemEditar(null)}
                  className="px-4 py-2 rounded-xl border border-emerald-800 text-emerald-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow"
                >
                  {salvando ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Excluir */}
      {itemExcluir && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#041c17] border border-emerald-900 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center space-y-4">
            <div className="text-3xl">⚠️</div>
            <h3 className="text-lg font-bold text-white">Confirmar Exclusão</h3>
            <p className="text-sm text-emerald-300/80">
              Deseja realmente excluir o relatório <span className="font-semibold text-white">{itemExcluir.titulo}</span>?
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setItemExcluir(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-emerald-800 text-emerald-300 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExclusao}
                disabled={salvando}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow"
              >
                {salvando ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
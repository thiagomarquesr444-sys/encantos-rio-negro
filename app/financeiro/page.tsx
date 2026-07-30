'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function FinanceiroPage() {
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [lancamentosFiltrados, setLancamentosFiltrados] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [filtroPeriodo, setFiltroPeriodo] = useState('mes_atual');

  const [totalReceitasGeral, setTotalReceitasGeral] = useState(0);
  const [totalDespesasGeral, setTotalDespesasGeral] = useState(0);
  const [lucroGeral, setLucroGeral] = useState(0);
  const [aReceberGeral, setAReceberGeral] = useState(0);

  // Estados dos Modais
  const [itemVisualizar, setItemVisualizar] = useState<any>(null);
  const [itemEditar, setItemEditar] = useState<any>(null);
  const [itemExcluir, setItemExcluir] = useState<any>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  // Mensagem de Feedback
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const mostrarToast = (mensagem: string) => {
    setMensagemSucesso(mensagem);
    setTimeout(() => setMensagemSucesso(null), 4000);
  };

  useEffect(() => {
    carregarFinanceiro();
  }, []);

  useEffect(() => {
    processarDadosEAplicarFiltros();
  }, [filtroPeriodo, lancamentos]);

  const carregarFinanceiro = async () => {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('financeiro')
        .select('*')
        .order('data_vencimento', { ascending: false });

      if (error) {
        console.error('Erro ao buscar financeiro:', error);
      } else {
        setLancamentos(data || []);
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
    } finally {
      setCarregando(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!itemExcluir) return;
    setExcluindo(true);

    try {
      const { error } = await supabase
        .from('financeiro')
        .delete()
        .eq('id', itemExcluir.id);

      if (error) {
        console.error('Erro ao excluir:', error);
        alert('Erro ao excluir o registro.');
      } else {
        setLancamentos((prev) => prev.filter((item) => item.id !== itemExcluir.id));
        setItemExcluir(null);
        mostrarToast('Lançamento excluído com sucesso!');
      }
    } catch (err) {
      console.error('Erro inesperado ao excluir:', err);
    } finally {
      setExcluindo(false);
    }
  };

  // Conversor limpo e rigoroso para o formato padrão do Supabase (Numeric)
  const converterParaNumeroSupabase = (valorInput: any) => {
    if (valorInput === null || valorInput === undefined || valorInput === '') return 0;
    if (typeof valorInput === 'number') return valorInput;

    let stringValor = String(valorInput).trim();
    stringValor = stringValor.replace('R$', '').trim();

    if (stringValor.includes('.') && stringValor.includes(',')) {
      stringValor = stringValor.replace(/\./g, '').replace(',', '.');
    } else if (stringValor.includes(',')) {
      stringValor = stringValor.replace(',', '.');
    }

    const numeroFinal = parseFloat(stringValor);
    return isNaN(numeroFinal) ? 0 : numeroFinal;
  };

  const salvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemEditar) return;
    setSalvandoEdicao(true);

    try {
      const valorBruto = itemEditar.valor !== undefined ? itemEditar.valor : itemEditar.Valor;
      const valorTratado = converterParaNumeroSupabase(valorBruto);

      const { error } = await supabase
        .from('financeiro')
        .update({
          descricao: itemEditar.descricao || itemEditar.descrição,
          valor: valorTratado,
          categoria: itemEditar.categoria,
          data_vencimento: itemEditar.data_vencimento,
          status: itemEditar.status || itemEditar.Status,
          tipo: itemEditar.tipo,
        })
        .eq('id', itemEditar.id);

      if (error) {
        console.error('Erro ao atualizar:', error);
        alert('Erro ao atualizar o registro no banco.');
      } else {
        setItemEditar(null);
        mostrarToast('Lançamento atualizado com sucesso!');
        carregarFinanceiro();
      }
    } catch (err) {
      console.error('Erro inesperado ao salvar:', err);
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const processarDadosEAplicarFiltros = () => {
    let recGeral = 0;
    let despGeral = 0;
    let pendGeral = 0;

    lancamentos.forEach((item) => {
      const val = Number(item.valor !== undefined ? item.valor : (item.Valor || 0)) || 0;
      const tipo = String(item.tipo || '').trim().toLowerCase();
      const status = String(item.status !== undefined ? item.status : (item.Status || '')).trim().toLowerCase();

      if (tipo === 'receita') {
        recGeral += val;
        if (status === 'pendente') {
          pendGeral += val;
        }
      } else if (tipo === 'despesa') {
        despGeral += val;
      }
    });

    setTotalReceitasGeral(recGeral);
    setTotalDespesasGeral(despGeral);
    setLucroGeral(recGeral - despGeral);
    setAReceberGeral(pendGeral);

    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    let listaTemp = [...lancamentos];

    if (filtroPeriodo === 'mes_atual') {
      listaTemp = lancamentos.filter((item) => {
        const dataItem = item.data_vencimento ? new Date(item.data_vencimento + 'T00:00:00') : null;
        if (!dataItem || isNaN(dataItem.getTime())) return false;
        return dataItem.getMonth() === mesAtual && dataItem.getFullYear() === anoAtual;
      });
    } else if (filtroPeriodo === 'pendentes') {
      listaTemp = lancamentos.filter((item) => {
        const status = String(item.status !== undefined ? item.status : item.Status || '').trim().toLowerCase();
        const tipo = String(item.tipo || '').trim().toLowerCase();
        return tipo === 'receita' && status === 'pendente';
      });
    }

    setLancamentosFiltrados(listaTemp);
  };

  return (
    <div className="min-h-screen bg-[#071f1a] text-slate-100 flex flex-col relative pb-16">
      {mensagemSucesso && (
        <div className="fixed top-6 right-6 z-50 animate-bounce">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-white font-medium text-sm bg-emerald-600">
            <span>✅</span>
            <span>{mensagemSucesso}</span>
          </div>
        </div>
      )}

      {/* BANNER HERO PROFISSIONAL */}
      <div className="relative w-full bg-[#051713] py-24 md:py-28 px-6 text-white shadow-lg overflow-hidden flex flex-col justify-between md:px-12 border-b border-emerald-900/45">
        <div className="absolute inset-0 opacity-85 pointer-events-none overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1920&q=80"
            alt="Banner Financeiro"
            className="w-full h-full object-cover object-center select-none pointer-events-none"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#071f1a] via-[#071f1a]/70 to-[#071f1a]/30 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto w-full z-10 pt-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-900/40 px-4 py-1.5 text-xs font-semibold text-emerald-200 backdrop-blur shadow-sm mb-2 select-none">
              💰 Operação • Gestão Financeira
            </div>
            <h1 className="text-3xl font-bold text-white drop-shadow-md md:text-4xl">Financeiro — Produção</h1>
            <p className="mt-1 text-emerald-100/80 text-sm drop-shadow-md font-medium">Painel gerencial de receitas e despesas.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 z-10">
            <Link
              href="/financeiro/receita/novo"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              className="inline-flex items-center rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition select-none no-underline cursor-pointer border border-emerald-500/40"
              style={{ WebkitUserDrag: 'none' } as any}
            >
              <span className="leading-none text-base font-bold pointer-events-none mr-1.5">+</span>
              <span className="leading-none pointer-events-none">Nova Receita</span>
            </Link>

            <Link
              href="/financeiro/despesa/novo"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              className="inline-flex items-center rounded-xl bg-rose-600 hover:bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition select-none no-underline cursor-pointer border border-rose-500/40"
              style={{ WebkitUserDrag: 'none' } as any}
            >
              <span className="leading-none text-base font-bold pointer-events-none mr-1.5">-</span>
              <span className="leading-none pointer-events-none">Nova Despesa</span>
            </Link>

            <Link
              href="/financeiro/exportar"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              className="inline-flex items-center rounded-xl bg-slate-700 hover:bg-slate-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition select-none no-underline cursor-pointer border border-slate-600/40"
              style={{ WebkitUserDrag: 'none' } as any}
            >
              <span className="leading-none text-base font-bold pointer-events-none mr-1.5">📥</span>
              <span className="leading-none pointer-events-none">Exportar Relatório</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="px-6 py-10 md:px-12 max-w-7xl mx-auto w-full flex-1 space-y-10">
        
        {/* BARRA DE FILTROS */}
        <div className="rounded-2xl border border-emerald-900/40 bg-[#0a2923]/60 backdrop-blur-md p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-200 select-none">
            <span>🔎 Filtrar Visão da Tabela:</span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
            <button
              onClick={() => setFiltroPeriodo('mes_atual')}
              className={`px-4 py-2 text-xs font-bold transition rounded-xl border select-none cursor-pointer ${
                filtroPeriodo === 'mes_atual'
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                  : 'bg-[#041411]/80 border-emerald-800/60 text-emerald-300/70 hover:text-white hover:bg-emerald-900/40'
              }`}
            >
              Mês Atual
            </button>
            <button
              onClick={() => setFiltroPeriodo('todos')}
              className={`px-4 py-2 text-xs font-bold transition rounded-xl border select-none cursor-pointer ${
                filtroPeriodo === 'todos'
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                  : 'bg-[#041411]/80 border-emerald-800/60 text-emerald-300/70 hover:text-white hover:bg-emerald-900/40'
              }`}
            >
              Histórico Geral
            </button>
            <button
              onClick={() => setFiltroPeriodo('pendentes')}
              className={`px-4 py-2 text-xs font-bold transition rounded-xl border select-none cursor-pointer ${
                filtroPeriodo === 'pendentes'
                  ? 'bg-amber-600 border-amber-500 text-white shadow-md'
                  : 'bg-[#041411]/80 border-emerald-800/60 text-emerald-300/70 hover:text-white hover:bg-emerald-900/40'
              }`}
            >
              Apenas Pendentes
            </button>
          </div>
        </div>

        {/* CARDS DE INDICADORES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-2xl border-l-4 border-l-emerald-500 bg-[#0a2923]/70 backdrop-blur-md p-6 shadow-md border border-emerald-900/30 text-emerald-100">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-200/70 select-none">Total Receitas</p>
            <h3 className="text-2xl font-extrabold text-emerald-400 mt-2">
              R$ {totalReceitasGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-emerald-200/60 mt-1">visão macro da base</p>
          </div>

          <div className="rounded-2xl border-l-4 border-l-rose-500 bg-[#0a2923]/70 backdrop-blur-md p-6 shadow-md border border-emerald-900/30 text-emerald-100">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-200/70 select-none">Total Despesas</p>
            <h3 className="text-2xl font-extrabold text-rose-400 mt-2">
              R$ {totalDespesasGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-emerald-200/60 mt-1">visão macro da base</p>
          </div>

          <div className="rounded-2xl border-l-4 border-l-sky-400 bg-[#0a2923]/70 backdrop-blur-md p-6 shadow-md border border-emerald-900/30 text-emerald-100">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-200/70 select-none">Balanço / Lucro</p>
            <h3 className={`text-2xl font-extrabold mt-2 ${lucroGeral >= 0 ? 'text-white' : 'text-rose-400'}`}>
              R$ {lucroGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-emerald-200/60 mt-1">resultado líquido geral</p>
          </div>

          <div className="rounded-2xl border-l-4 border-l-amber-400 bg-[#0a2923]/70 backdrop-blur-md p-6 shadow-md border border-emerald-900/30 text-emerald-100">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-200/70 select-none">A Receber Geral</p>
            <h3 className="text-2xl font-extrabold text-amber-400 mt-2">
              R$ {aReceberGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-emerald-200/60 mt-1">pendências acumuladas</p>
          </div>
        </div>

        {/* TABELA DE LANÇAMENTOS */}
        <div className="rounded-3xl border border-emerald-900/40 bg-[#0a2923]/60 backdrop-blur-md p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Lançamentos</h2>
            <span className="text-xs font-semibold px-3 py-1 bg-emerald-900/80 border border-emerald-700/50 text-emerald-200 rounded-full select-none">
              {lancamentosFiltrados.length} registro(s) listado(s)
            </span>
          </div>

          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-[#051713]/80 border-b border-emerald-900/60 text-emerald-200/80 font-semibold uppercase text-xs select-none">
                <tr>
                  <th className="py-3.5 px-5 rounded-tl-xl">Data</th>
                  <th className="py-3.5 px-5">Tipo</th>
                  <th className="py-3.5 px-5">Descrição</th>
                  <th className="py-3.5 px-5">Categoria</th>
                  <th className="py-3.5 px-5 text-right">Valor</th>
                  <th className="py-3.5 px-5 text-center">Status</th>
                  <th className="py-3.5 px-5 text-center rounded-tr-xl">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/30">
                {carregando ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-emerald-200/60 font-medium text-sm">Carregando dados de produção...</td>
                  </tr>
                ) : lancamentosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-emerald-200/60 font-medium text-sm">
                      Nenhum registro encontrado para este filtro.
                    </td>
                  </tr>
                ) : (
                  lancamentosFiltrados.map((item) => {
                    const tipoFormatado = String(item.tipo || '').toLowerCase();
                    const isReceita = tipoFormatado === 'receita';
                    const valorBruto = Number(item.valor !== undefined ? item.valor : (item.Valor || 0)) || 0;
                    const statusVal = item.status !== undefined ? item.status : (item.Status || '-');

                    return (
                      <tr key={item.id} className="bg-transparent hover:bg-emerald-950/30 transition">
                        <td className="py-4 px-5 text-emerald-100/80">{item.data_vencimento || '-'}</td>
                        <td className="py-4 px-5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold select-none ${
                            isReceita ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                          }`}>
                            {item.tipo || '-'}
                          </span>
                        </td>
                        <td className="py-4 px-5 font-semibold text-white">{item.descricao || item.descrição || '-'}</td>
                        <td className="py-4 px-5 text-emerald-100/80">{item.categoria || '-'}</td>
                        <td className={`py-4 px-5 text-right font-bold ${
                          isReceita ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          R$ {valorBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-5 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-900/40 border border-emerald-700/40 text-emerald-200 select-none">
                            {statusVal}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Botão Visualizar */}
                            <button
                              onClick={() => setItemVisualizar(item)}
                              title="Visualizar detalhes"
                              className="p-1.5 bg-emerald-900/40 hover:bg-emerald-900 text-emerald-200 rounded-lg transition cursor-pointer border border-emerald-700/40"
                            >
                              👁
                            </button>

                            {/* Botão Editar */}
                            <button
                              onClick={() => setItemEditar({ ...item })}
                              title="Editar lançamento"
                              className="p-1.5 bg-sky-950/40 hover:bg-sky-900 text-sky-200 rounded-lg transition cursor-pointer border border-sky-800/40"
                            >
                              ✎
                            </button>

                            {/* Botão Excluir */}
                            <button
                              onClick={() => setItemExcluir(item)}
                              title="Excluir lançamento"
                              className="p-1.5 bg-rose-950/40 hover:bg-rose-900 text-rose-200 rounded-lg transition cursor-pointer border border-rose-800/40"
                            >
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAL DE VISUALIZAÇÃO */}
      {itemVisualizar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#071f1a] border border-emerald-900/60 p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-emerald-900/50 pb-3">
              <h3 className="text-base font-bold text-white">Detalhes do Lançamento</h3>
              <button onClick={() => setItemVisualizar(null)} className="text-emerald-300/60 hover:text-white text-sm font-bold cursor-pointer">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-emerald-300/60 block text-xs font-medium">ID do Registro</span>
                <span className="text-white font-mono text-xs">{itemVisualizar.id}</span>
              </div>
              <div>
                <span className="text-emerald-300/60 block text-xs font-medium">Tipo / Natureza</span>
                <span className="font-semibold text-white capitalize">{itemVisualizar.tipo}</span>
              </div>
              <div>
                <span className="text-emerald-300/60 block text-xs font-medium">Descrição</span>
                <span className="font-bold text-white text-base">{itemVisualizar.descricao || itemVisualizar.descrição}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-emerald-300/60 block text-xs font-medium">Categoria</span>
                  <span className="text-emerald-100 font-medium">{itemVisualizar.categoria || '-'}</span>
                </div>
                <div>
                  <span className="text-emerald-300/60 block text-xs font-medium">Valor</span>
                  <span className="font-bold text-emerald-400">R$ {Number(itemVisualizar.valor || itemVisualizar.Valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-emerald-300/60 block text-xs font-medium">Data de Vencimento</span>
                  <span className="text-emerald-100 font-medium">{itemVisualizar.data_vencimento || '-'}</span>
                </div>
                <div>
                  <span className="text-emerald-300/60 block text-xs font-medium">Status</span>
                  <span className="text-emerald-300 font-bold">{itemVisualizar.status || itemVisualizar.Status || '-'}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-3">
              <button
                onClick={() => setItemVisualizar(null)}
                className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer select-none"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO */}
      {itemEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#071f1a] border border-emerald-900/60 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between border-b border-emerald-900/50 pb-3">
              <h3 className="text-base font-bold text-white">Editar Lançamento</h3>
              <button onClick={() => setItemEditar(null)} className="text-emerald-300/60 hover:text-white text-sm font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={salvarEdicao} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-emerald-200/80 mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  value={itemEditar.descricao || itemEditar.descrição || ''}
                  onChange={(e) => setItemEditar({ ...itemEditar, descricao: e.target.value })}
                  className="w-full rounded-xl border border-emerald-800 bg-[#041411] px-3 py-2 outline-none focus:border-emerald-500 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-200/80 mb-1">Valor (R$)</label>
                  <input
                    type="text"
                    required
                    value={itemEditar.valor !== undefined ? itemEditar.valor : (itemEditar.Valor || '')}
                    onChange={(e) => setItemEditar({ ...itemEditar, valor: e.target.value })}
                    className="w-full rounded-xl border border-emerald-800 bg-[#041411] px-3 py-2 outline-none focus:border-emerald-500 text-sm font-bold text-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-200/80 mb-1">Categoria</label>
                  <input
                    type="text"
                    required
                    value={itemEditar.categoria || ''}
                    onChange={(e) => setItemEditar({ ...itemEditar, categoria: e.target.value })}
                    className="w-full rounded-xl border border-emerald-800 bg-[#041411] px-3 py-2 outline-none focus:border-emerald-500 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-200/80 mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={itemEditar.data_vencimento || ''}
                    onChange={(e) => setItemEditar({ ...itemEditar, data_vencimento: e.target.value })}
                    className="w-full rounded-xl border border-emerald-800 bg-[#041411] px-3 py-2 outline-none focus:border-emerald-500 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-200/80 mb-1">Status</label>
                  <select
                    value={itemEditar.status || itemEditar.Status || 'Recebido'}
                    onChange={(e) => setItemEditar({ ...itemEditar, status: e.target.value })}
                    className="w-full rounded-xl border border-emerald-800 bg-[#041411] px-3 py-2 outline-none focus:border-emerald-500 text-sm text-white"
                  >
                    <option value="Recebido" className="bg-[#041411]">Recebido</option>
                    <option value="Pendente" className="bg-[#041411]">Pendente</option>
                    <option value="Pago" className="bg-[#041411]">Pago</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-emerald-900/50">
                <button
                  type="button"
                  onClick={() => setItemEditar(null)}
                  className="px-4 py-2 rounded-xl border border-emerald-800 text-emerald-200 hover:bg-emerald-900/40 font-semibold text-xs transition cursor-pointer select-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoEdicao}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs transition shadow-sm cursor-pointer select-none disabled:opacity-50"
                >
                  {salvandoEdicao ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EXCLUSÃO */}
      {itemExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#071f1a] border border-emerald-900/60 p-6 shadow-2xl space-y-4 text-center text-slate-100">
            <div className="w-10 h-10 bg-rose-950/60 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-800/40">
              <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Confirmação de Exclusão</h3>
              <p className="text-xs text-emerald-200/70">
                Tem certeza que deseja excluir o registro de{' '}
                <span className="font-semibold text-white">
                  {itemExcluir.descricao || itemExcluir.descrição || 'Lançamento'}
                </span>
                ? Esta ação é irreversível.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemExcluir(null)}
                className="px-4 py-2 rounded-xl border border-emerald-800 text-emerald-200 hover:bg-emerald-900/40 font-semibold text-xs transition cursor-pointer select-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={excluindo}
                onClick={confirmarExclusao}
                className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs transition shadow-sm cursor-pointer select-none disabled:opacity-50"
              >
                {excluindo ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
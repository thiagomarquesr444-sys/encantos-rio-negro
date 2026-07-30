'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ExportarRelatorioPage() {
  const [carregando, setCarregando] = useState(false);
  const [dados, setDados] = useState<any[]>([]);
  const [mensagem, setMensagem] = useState('');

  // Carrega os dados financeiros ao abrir a página
  useEffect(() => {
    buscarDadosFinanceiros();
  }, []);

  const buscarDadosFinanceiros = async () => {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('financeiro')
        .select('*')
        .order('data_vencimento', { ascending: false });

      if (error) {
        console.error('Erro ao buscar dados:', error);
        setMensagem('Erro ao carregar dados para exportação.');
      } else {
        setDados(data || []);
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
      setMensagem('Ocorreu um erro inesperado.');
    } finally {
      setCarregando(false);
    }
  };

  // Função para gerar e baixar o arquivo CSV
  const baixarCSV = () => {
    if (dados.length === 0) {
      alert('Não há dados para exportar.');
      return;
    }

    // Cabeçalho do CSV
    const cabecalho = ['ID', 'Data', 'Tipo', 'Descrição', 'Categoria', 'Valor (R$)', 'Status'];
    
    // Mapeamento das linhas
    const linhas = dados.map((item) => [
      item.id,
      item.data_vencimento || '',
      item.tipo || '',
      `"${(item.descricao || '').replace(/"/g, '""')}"`, // Protege contra aspas na descrição
      `"${(item.categoria || '').replace(/"/g, '""')}"`,
      item.valor || 0,
      item.status || '',
    ]);

    // Junta tudo em formato CSV com separador por vírgula
    const conteudoCSV = [
      cabecalho.join(','),
      ...linhas.map((e) => e.join(',')),
    ].join('\n');

    // Cria o Blob e dispara o download
    const blob = new Blob([conteudoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_financeiro_encantos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col">
      {/* Banner Superior */}
      <div 
        className="relative bg-cover bg-center py-12 px-8 text-white flex flex-col items-center justify-center text-center shadow-md"
        style={{
          backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.95)), url('https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1600&auto=format&fit=crop')`,
        }}
      >
        <div className="max-w-4xl space-y-3">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center justify-center gap-3">
            <span>📊</span> Exportar Relatório Financeiro
          </h1>
          <p className="text-slate-300 text-sm md:text-base font-medium opacity-90">
            Gere planilhas e relatórios detalhados de receitas e despesas do Encantos Rio Negro.
          </p>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="p-8 max-w-5xl mx-auto w-full -mt-6 z-10 space-y-8 flex-1">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-6">
          
          {mensagem && (
            <div className="p-4 rounded-xl text-sm font-semibold bg-rose-50 text-rose-800 border border-rose-200">
              {mensagem}
            </div>
          )}

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Resumo dos Dados Prontos</h2>
              <p className="text-sm text-slate-500">
                {carregando ? 'Carregando lançamentos...' : `${dados.length} registro(s) encontrado(s) no sistema.`}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/financeiro"
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
              >
                Voltar
              </Link>
              <button
                onClick={baixarCSV}
                disabled={carregando || dados.length === 0}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2"
              >
                <span>📥</span> Baixar Relatório (CSV)
              </button>
            </div>
          </div>

          {/* Pré-visualização rápida dos dados */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-xs">
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Descrição</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {carregando ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">Carregando registros...</td>
                  </tr>
                ) : dados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">Nenhum lançamento encontrado.</td>
                  </tr>
                ) : (
                  dados.map((item) => {
                    const tipoFormatado = String(item.tipo || '').toLowerCase();
                    const isReceita = tipoFormatado === 'receita';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 text-slate-600">{item.data_vencimento}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isReceita ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {item.tipo}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">{item.descricao}</td>
                        <td className="py-3 px-4 text-slate-600">{item.categoria}</td>
                        <td className={`py-3 px-4 text-right font-bold ${
                          isReceita ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          R$ {Number(item.valor || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-md text-xs bg-slate-100 text-slate-700 font-medium">
                            {item.status}
                          </span>
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
    </div>
  );
}
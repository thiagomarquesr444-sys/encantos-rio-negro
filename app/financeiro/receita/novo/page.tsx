'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function NovaReceitaPage() {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [mensagemErro, setMensagemErro] = useState('');

  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    categoria: 'Turismo / Pacotes',
    data_vencimento: '',
    status: 'Recebido',
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      data_vencimento: new Date().toISOString().split('T')[0],
    }));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setMensagemSucesso('');
    setMensagemErro('');

    try {
      let rawValue = formData.valor.toString().trim();
      let valorNumerico = 0;

      if (rawValue.includes(',') && rawValue.includes('.')) {
        const limpo = rawValue.replace(/\./g, '').replace(',', '.');
        valorNumerico = parseFloat(limpo) || 0;
      } else if (rawValue.includes(',')) {
        const limpo = rawValue.replace(',', '.');
        valorNumerico = parseFloat(limpo) || 0;
      } else if (rawValue.includes('.')) {
        const partes = rawValue.split('.');
        if (partes.length === 2 && partes[1].length === 3) {
          valorNumerico = parseFloat(rawValue.replace(/\./g, '')) || 0;
        } else {
          valorNumerico = parseFloat(rawValue) || 0;
        }
      } else {
        valorNumerico = parseFloat(rawValue) || 0;
      }

      const { error } = await supabase.from('financeiro').insert([
        {
          descricao: formData.descricao.trim(),
          tipo: 'receita',
          valor: valorNumerico,
          categoria: formData.categoria,
          data_vencimento: formData.data_vencimento,
          status: formData.status,
        },
      ]);

      if (error) {
        console.error('Erro ao cadastrar receita:', error);
        setMensagemErro('Erro ao registrar a receita no banco.');
      } else {
        setMensagemSucesso('Receita salva com sucesso! Redirecionando...');
        setTimeout(() => {
          router.push('/financeiro');
          router.refresh();
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      setMensagemErro('Ocorreu um erro inesperado ao salvar.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071f1a] text-slate-100 flex flex-col relative pb-16">
      
      {mensagemSucesso && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-emerald-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-emerald-400/40">
          <span className="font-semibold text-sm">{mensagemSucesso}</span>
        </div>
      )}

      {/* Banner Superior Corporativo com Imagem Temática Financeira / Contábil */}
      <div 
        className="relative bg-cover bg-center py-24 md:py-28 px-6 md:px-12 text-white shadow-lg flex flex-col justify-between border-b border-emerald-900/45 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(7, 31, 26, 0.80), rgba(7, 31, 26, 0.92)), url('https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1600&auto=format&fit=crop')`,
        }}
      >
        <div className="relative max-w-7xl mx-auto w-full flex justify-end z-10">
          <Link
            href="/financeiro"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className="inline-flex items-center rounded-xl border border-emerald-500/30 bg-emerald-900/40 px-5 py-2.5 text-sm font-semibold text-emerald-200 backdrop-blur transition hover:bg-emerald-800/60 shadow-sm cursor-pointer no-underline"
            style={{ WebkitUserDrag: 'none' } as any}
          >
            ← Voltar para Financeiro
          </Link>
        </div>

        <div className="relative max-w-7xl mx-auto w-full z-10 pt-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-900/40 px-4 py-1.5 text-xs font-semibold text-emerald-200 backdrop-blur shadow-sm mb-2 select-none">
              Gestão Financeira • Lançamentos
            </div>
            <h1 className="text-3xl font-bold text-white drop-shadow-md md:text-4xl">
              Cadastrar Nova Receita
            </h1>
            <p className="mt-1 text-emerald-100/80 text-sm drop-shadow-md font-medium">
              Registre entradas de pacotes, hospedagem e serviços do Encantos Rio Negro em Barcelos - AM.
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal com Fundo Robusto, Elevado e Acabamento Profissional */}
      <div className="px-6 py-10 md:px-12 max-w-7xl mx-auto w-full flex-1">
        <div className="rounded-3xl border border-emerald-900/40 bg-[#0a2923]/60 backdrop-blur-md p-8 shadow-xl">
          
          {mensagemErro && (
            <div className="mb-6 p-4 rounded-2xl text-sm font-semibold border bg-rose-950/80 text-rose-300 border-rose-500/40">
              {mensagemErro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                Descrição <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                name="descricao"
                required
                value={formData.descricao}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white focus:border-emerald-500 focus:outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Valor (R$) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  name="valor"
                  required
                  value={formData.valor}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white font-bold focus:border-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Categoria <span className="text-rose-400">*</span>
                </label>
                <select
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white focus:border-emerald-500 focus:outline-none transition"
                >
                  <option value="Turismo / Pacotes" className="bg-[#041411]">Turismo / Pacotes</option>
                  <option value="Hospedagem" className="bg-[#041411]">Hospedagem</option>
                  <option value="Alimentação" className="bg-[#041411]">Alimentação</option>
                  <option value="Outras Receitas" className="bg-[#041411]">Outras Receitas</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Data de Vencimento <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  name="data_vencimento"
                  required
                  value={formData.data_vencimento}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white focus:border-emerald-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                Status <span className="text-rose-400">*</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white focus:border-emerald-500 focus:outline-none transition"
              >
                <option value="Recebido" className="bg-[#041411]">Recebido</option>
                <option value="Pendente" className="bg-[#041411]">Pendente</option>
              </select>
            </div>

            {/* Botões de Ação Padronizados e Profissionais */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-8 border-t border-emerald-900/50 mt-8">
              
              <button
                type="submit"
                disabled={salvando}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold text-white shadow-lg transition cursor-pointer select-none border border-emerald-500/40 ${
                  salvando
                    ? 'bg-emerald-500/50 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                {salvando ? 'Salvando Registro...' : 'Salvar Receita'}
              </button>

              <Link
                href="/financeiro"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-600/40 transition cursor-pointer select-none no-underline"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar
              </Link>

            </div>

          </form>

        </div>
      </div>
    </div>
  );
}
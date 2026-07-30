'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function NovaEmbarcacaoPage() {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'Barco Regional',
    capacidade: '',
    marinheiro: '',
    status: 'Ativo',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLimpar = () => {
    setFormData({
      nome: '',
      tipo: 'Barco Regional',
      capacidade: '',
      marinheiro: '',
      status: 'Ativo',
    });
    setMensagem('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setMensagem('');

    if (!formData.nome.trim() || !formData.capacidade.toString().trim() || !formData.marinheiro.trim()) {
      setMensagem('Por favor, preencha todos os campos obrigatórios.');
      setSalvando(false);
      return;
    }

    try {
      const { error } = await supabase.from('embarcacoes').insert([
        {
          nome: formData.nome.trim(),
          tipo: formData.tipo,
          capacidade: parseInt(formData.capacidade) || 0,
          marinheiro: formData.marinheiro.trim(),
          status: formData.status,
        },
      ]);

      if (error) {
        console.error('Erro ao cadastrar embarcação:', error);
        setMensagem('Erro ao cadastrar a embarcação. Verifique os campos e tente novamente.');
      } else {
        setMensagem('Embarcação cadastrada com sucesso! Redirecionando...');
        setTimeout(() => {
          router.push('/embarcacoes');
        }, 1500);
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
      setMensagem('Ocorreu um erro inesperado ao salvar.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071f1a] text-slate-100 flex flex-col relative pb-16">
      
      {/* Banner Superior Padrão Corporativo com Imagem Externa da Internet (Embarcações / Rio Negro - Barcelos AM) */}
      <div className="relative w-full bg-[#051713] py-24 md:py-28 px-6 text-white shadow-lg overflow-hidden flex flex-col justify-between md:px-12 border-b border-emerald-900/45">
        <div className="absolute inset-0 opacity-85 pointer-events-none overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=1600&auto=format&fit=crop"
            alt="Banner Nova Embarcação"
            className="w-full h-full object-cover object-center select-none pointer-events-none"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#071f1a] via-[#071f1a]/70 to-[#071f1a]/30 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto w-full flex justify-end z-10">
          <Link
            href="/embarcacoes"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className="inline-flex items-center rounded-xl border border-emerald-500/30 bg-emerald-900/40 px-5 py-2.5 text-sm font-semibold text-emerald-200 backdrop-blur transition hover:bg-emerald-800/60 shadow-sm cursor-pointer no-underline"
            style={{ WebkitUserDrag: 'none' } as any}
          >
            ← Voltar para Embarcações
          </Link>
        </div>

        <div className="relative max-w-7xl mx-auto w-full z-10 pt-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-900/40 px-4 py-1.5 text-xs font-semibold text-emerald-200 backdrop-blur shadow-sm mb-2 select-none">
              Gestão Operacional • Frota
            </div>
            <h1 className="text-3xl font-bold text-white drop-shadow-md md:text-4xl">
              Cadastrar Nova Embarcação
            </h1>
            <p className="mt-1 text-emerald-100/80 text-sm drop-shadow-md font-medium">
              Adicione uma nova embarcação à frota oficial do Encantos Rio Negro.
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal com Fundo Robusto, Elevado e Acabamento Profissional */}
      <div className="px-6 py-10 md:px-12 max-w-7xl mx-auto w-full flex-1">
        <div className="rounded-3xl border border-emerald-900/40 bg-[#0a2923]/60 backdrop-blur-md p-8 shadow-xl">
          
          {mensagem && (
            <div className={`mb-6 p-4 rounded-2xl text-sm font-semibold border ${
              mensagem.includes('sucesso') 
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
            }`}>
              {mensagem}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Nome da Embarcação <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  name="nome"
                  required
                  placeholder=""
                  value={formData.nome}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Tipo de Embarcação <span className="text-rose-400">*</span>
                </label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white focus:border-emerald-500 focus:outline-none transition"
                >
                  <option value="Barco Regional" className="bg-[#041411]">Barco Regional</option>
                  <option value="Lancha Rápida" className="bg-[#041411]">Lancha Rápida (Voadora)</option>
                  <option value="Iate / Catamarã" className="bg-[#041411]">Iate / Catamarã</option>
                  <option value="Canoa Motorizada" className="bg-[#041411]">Canoa Motorizada</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Capacidade (Passageiros) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  name="capacidade"
                  required
                  placeholder=""
                  value={formData.capacidade}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Marinheiro / Responsável <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  name="marinheiro"
                  required
                  placeholder=""
                  value={formData.marinheiro}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
                />
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
                  <option value="Ativo" className="bg-[#041411]">Ativo</option>
                  <option value="Manutenção" className="bg-[#041411]">Em Manutenção</option>
                  <option value="Inativo" className="bg-[#041411]">Inativo</option>
                </select>
              </div>
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
                {salvando ? 'Salvando Registro...' : 'Cadastrar Embarcação'}
              </button>

              <button
                type="button"
                onClick={handleLimpar}
                disabled={salvando}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-600/40 transition cursor-pointer select-none"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Limpar Formulário
              </button>

              <button
                type="button"
                onClick={() => router.push('/embarcacoes')}
                disabled={salvando}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-600/40 transition cursor-pointer select-none"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar
              </button>

            </div>

          </form>

        </div>
      </div>
    </div>
  );
}
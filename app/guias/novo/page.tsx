'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function NovoGuiaPage() {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    idiomas: 'Português',
    cadastur: '',
    status: 'Ativo',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLimpar = () => {
    setFormData({
      nome: '',
      cpf: '',
      telefone: '',
      idiomas: 'Português',
      cadastur: '',
      status: 'Ativo',
    });
    setMensagem('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setMensagem('');

    if (!formData.nome.trim() || !formData.cpf.trim() || !formData.telefone.trim() || !formData.cadastur.trim()) {
      setMensagem('Por favor, preencha todos os campos obrigatórios.');
      setSalvando(false);
      return;
    }

    try {
      const { error } = await supabase.from('guias').insert([
        {
          nome: formData.nome.trim(),
          cpf: formData.cpf.trim(),
          telefone: formData.telefone.trim(),
          idiomas: formData.idiomas.trim(),
          cadastur: formData.cadastur.trim(),
          status: formData.status,
        },
      ]);

      if (error) {
        console.error('Erro ao cadastrar guia:', error);
        setMensagem('Erro ao cadastrar o guia. Verifique os campos e tente novamente.');
      } else {
        setMensagem('Guia cadastrado com sucesso! Redirecionando...');
        setTimeout(() => {
          router.push('/guias');
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
      
      {/* Banner Superior com Imagem Autêntica de Guia / Expedição na Amazônia */}
      <div 
        className="relative bg-cover bg-center py-24 md:py-28 px-6 md:px-12 text-white shadow-lg flex flex-col justify-between border-b border-emerald-900/45 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(7, 31, 26, 0.75), rgba(7, 31, 26, 0.90)), url('https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?q=80&w=1600&auto=format&fit=crop')`,
        }}
      >
        <div className="relative max-w-7xl mx-auto w-full flex justify-end z-10">
          <Link
            href="/guias"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className="inline-flex items-center rounded-xl border border-emerald-500/30 bg-emerald-900/40 px-5 py-2.5 text-sm font-semibold text-emerald-200 backdrop-blur transition hover:bg-emerald-800/60 shadow-sm cursor-pointer no-underline"
            style={{ WebkitUserDrag: 'none' } as any}
          >
            ← Voltar para Guias
          </Link>
        </div>

        <div className="relative max-w-7xl mx-auto w-full z-10 pt-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-900/40 px-4 py-1.5 text-xs font-semibold text-emerald-200 backdrop-blur shadow-sm mb-2 select-none">
              Gestão Operacional • Credenciamento de Guias
            </div>
            <h1 className="text-3xl font-bold text-white drop-shadow-md md:text-4xl">
              Cadastrar Novo Guia
            </h1>
            <p className="mt-1 text-emerald-100/80 text-sm drop-shadow-md font-medium">
              Adicione um novo guia de turismo credenciado à equipe do Encantos Rio Negro em Barcelos - AM.
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
                  Nome Completo <span className="text-rose-400">*</span>
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
                  CPF <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  name="cpf"
                  required
                  placeholder=""
                  value={formData.cpf}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Telefone / WhatsApp <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  name="telefone"
                  required
                  placeholder=""
                  value={formData.telefone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Idiomas <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  name="idiomas"
                  required
                  placeholder=""
                  value={formData.idiomas}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Registro CADASTUR <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  name="cadastur"
                  required
                  placeholder=""
                  value={formData.cadastur}
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
                  <option value="Férias" className="bg-[#041411]">Em Férias</option>
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
                {salvando ? 'Salvando Registro...' : 'Cadastrar Guia'}
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
                onClick={() => router.push('/guias')}
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
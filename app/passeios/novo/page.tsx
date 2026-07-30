'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { BANNER_REGIONAL } from '@/lib/bannerImagens';

export default function NovoPasseioPage() {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    cidade: 'Barcelos - AM',
    duracao: '',
    valor: '',
    categoria: 'Ecoturismo',
    foto_url: '',
    destaque: false,
    situacao: 'Ativo',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleLimpar = () => {
    setFormData({
      nome: '',
      descricao: '',
      cidade: 'Barcelos - AM',
      duracao: '',
      valor: '',
      categoria: 'Ecoturismo',
      foto_url: '',
      destaque: false,
      situacao: 'Ativo',
    });
    setMensagem(null);
  };

  const handleCancelar = () => {
    router.push('/passeios');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setMensagem(null);

    if (!formData.nome.trim() || !formData.duracao.trim() || !formData.valor.trim() || !formData.descricao.trim()) {
      setMensagem({
        tipo: 'erro',
        texto: 'Por favor, preencha todos os campos obrigatórios (Nome, Duração, Valor e Descrição).',
      });
      setSalvando(false);
      return;
    }

    try {
      const { error } = await supabase.from('passeios').insert([
        {
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim(),
          cidade: formData.cidade.trim() || 'Barcelos - AM',
          duracao: formData.duracao.trim(),
          valor: parseFloat(formData.valor) || 0,
          categoria: formData.categoria,
          foto_url: formData.foto_url.trim() || 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?q=80&w=1200&auto=format&fit=crop',
          destaque: formData.destaque,
          situacao: formData.situacao,
        },
      ]);

      if (error) {
        console.error('Erro ao cadastrar passeio:', error);
        setMensagem({
          tipo: 'erro',
          texto: `Erro ao cadastrar o passeio: ${error.message || 'Verifique os campos e tente novamente.'}`,
        });
      } else {
        setMensagem({
          tipo: 'sucesso',
          texto: 'Passeio cadastrado com sucesso. Redirecionando...',
        });
        setTimeout(() => {
          router.push('/passeios');
        }, 1500);
      }
    } catch (err: any) {
      console.error('Erro inesperado:', err);
      setMensagem({
        tipo: 'erro',
        texto: 'Ocorreu um erro inesperado ao salvar.',
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071f1a] text-slate-100 flex flex-col relative pb-16">
      
      {/* Banner Superior Padrão Corporativo */}
      <div className="relative w-full bg-[#051713] py-24 md:py-28 px-6 text-white shadow-lg overflow-hidden flex flex-col justify-between md:px-12 border-b border-emerald-900/45">
        <div className="absolute inset-0 opacity-85 pointer-events-none overflow-hidden">
          <img
            src={BANNER_REGIONAL.modulos.serra}
            alt="Banner Novo Passeio"
            className="w-full h-full object-cover object-center select-none pointer-events-none"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#071f1a] via-[#071f1a]/70 to-[#071f1a]/30 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto w-full flex justify-end z-10">
          <Link
            href="/passeios"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className="inline-flex items-center rounded-xl border border-emerald-500/30 bg-emerald-900/40 px-5 py-2.5 text-sm font-semibold text-emerald-200 backdrop-blur transition hover:bg-emerald-800/60 shadow-sm cursor-pointer no-underline"
            style={{ WebkitUserDrag: 'none' } as any}
          >
            ← Voltar para Passeios
          </Link>
        </div>

        <div className="relative max-w-7xl mx-auto w-full z-10 pt-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-900/40 px-4 py-1.5 text-xs font-semibold text-emerald-200 backdrop-blur shadow-sm mb-2 select-none">
              Gestão de Experiências • Catálogo
            </div>
            <h1 className="text-3xl font-bold text-white drop-shadow-md md:text-4xl">
              Cadastrar Novo Passeio
            </h1>
            <p className="mt-1 text-emerald-100/80 text-sm drop-shadow-md font-medium">
              Adicione uma nova experiência turística ao catálogo oficial do Encantos Rio Negro.
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal em Dark Mode Profissional */}
      <div className="px-6 py-10 md:px-12 max-w-7xl mx-auto w-full flex-1">
        <div className="rounded-3xl border border-emerald-900/40 bg-[#0a2923]/60 backdrop-blur-md p-8 shadow-xl">
          
          {mensagem && (
            <div
              className={`mb-6 p-4 rounded-2xl text-sm font-semibold border ${
                mensagem.tipo === 'sucesso'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
              }`}
            >
              {mensagem.texto}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Nome do Passeio <span className="text-rose-400">*</span>
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
                  Categoria <span className="text-rose-400">*</span>
                </label>
                <select
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white focus:border-emerald-500 focus:outline-none transition"
                >
                  <option value="Ecoturismo" className="bg-[#041411]">Ecoturismo</option>
                  <option value="Passeios Fluviais" className="bg-[#041411]">Passeios Fluviais</option>
                  <option value="Pesca Esportiva" className="bg-[#041411]">Pesca Esportiva</option>
                  <option value="Imersão Cultural" className="bg-[#041411]">Imersão Cultural</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Cidade / Destino <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  name="cidade"
                  required
                  value={formData.cidade}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Duração <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  name="duracao"
                  required
                  placeholder=""
                  value={formData.duracao}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Valor (R$) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="valor"
                  required
                  placeholder=""
                  value={formData.valor}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                URL da Foto de Capa (Unsplash ou Supabase Storage)
              </label>
              <input
                type="url"
                name="foto_url"
                placeholder=""
                value={formData.foto_url}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                Descrição Completa da Experiência <span className="text-rose-400">*</span>
              </label>
              <textarea
                name="descricao"
                required
                rows={4}
                placeholder=""
                value={formData.descricao}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="flex items-center gap-3 bg-[#041411] px-4 py-3 rounded-xl border border-emerald-800/80">
                <input
                  type="checkbox"
                  name="destaque"
                  id="destaque"
                  checked={formData.destaque}
                  onChange={handleChange}
                  className="w-5 h-5 text-emerald-600 bg-[#041411] border-emerald-800 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="destaque" className="text-sm font-semibold text-emerald-200 cursor-pointer select-none">
                  Destacar este passeio na página principal
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Situação <span className="text-rose-400">*</span>
                </label>
                <select
                  name="situacao"
                  value={formData.situacao}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white focus:border-emerald-500 focus:outline-none transition"
                >
                  <option value="Ativo" className="bg-[#041411]">Ativo</option>
                  <option value="Inativo" className="bg-[#041411]">Inativo</option>
                  <option value="Em Breve" className="bg-[#041411]">Em Breve</option>
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
                {salvando ? 'Salvando Registro...' : 'Cadastrar Passeio'}
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
                onClick={handleCancelar}
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
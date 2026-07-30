'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function NovoRelatorioPage() {
  const router = useRouter();
  const [loading, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState({
    titulo: '',
    tipo: 'Operacional',
    data_geracao: new Date().toISOString().split('T')[0],
    gerado_por: '',
    status: 'Concluído',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);

    try {
      const { error } = await supabase.from('relatorios').insert([
        {
          titulo: form.titulo,
          tipo: form.tipo,
          data_geracao: form.data_geracao,
          gerado_por: form.gerado_por,
          status: form.status,
        },
      ]);

      if (error) throw error;

      router.push('/relatorios');
    } catch (err: any) {
      console.error('Erro ao cadastrar relatório:', err);
      setErro(err.message || 'Erro ao salvar relatório no banco de dados.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#072822] text-slate-100 flex flex-col">
      <div 
        className="relative bg-cover bg-center py-10 px-8 text-white flex flex-col items-center justify-center text-center shadow-md border-b border-emerald-950/40"
        style={{
          backgroundImage: `linear-gradient(rgba(7, 40, 34, 0.85), rgba(4, 24, 20, 0.95)), url('https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1600&auto=format&fit=crop')`,
        }}
      >
        <div className="max-w-3xl space-y-2">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center justify-center gap-3 text-white">
            <span>📝</span> Novo Relatório Operacional
          </h1>
          <p className="text-emerald-200/90 text-sm font-medium">
            Preencha os campos abaixo para registrar um novo relatório no sistema.
          </p>
        </div>
      </div>

      <div className="p-8 max-w-2xl mx-auto w-full -mt-4 z-10 flex-1">
        <div className="bg-[#041c17] rounded-2xl shadow-2xl border border-emerald-900/60 p-6 md:p-8 space-y-6">
          {erro && (
            <div className="bg-rose-950 border border-rose-800 p-4 rounded-xl text-rose-200 text-sm font-semibold">
              ⚠️ {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase text-emerald-400 mb-1.5">
                Título do Relatório *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Fechamento de Caixa Mensal"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                className="w-full bg-[#072822] border border-emerald-800 rounded-xl px-4 py-3 text-white placeholder-emerald-500/40 focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold uppercase text-emerald-400 mb-1.5">
                  Tipo de Relatório
                </label>
                <input
                  type="text"
                  placeholder="Ex: Financeiro, Operacional"
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="w-full bg-[#072822] border border-emerald-800 rounded-xl px-4 py-3 text-white placeholder-emerald-500/40 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-emerald-400 mb-1.5">
                  Autor / Responsável
                </label>
                <input
                  type="text"
                  placeholder="Ex: Nome do colaborador"
                  value={form.gerado_por}
                  onChange={(e) => setForm({ ...form, gerado_por: e.target.value })}
                  className="w-full bg-[#072822] border border-emerald-800 rounded-xl px-4 py-3 text-white placeholder-emerald-500/40 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold uppercase text-emerald-400 mb-1.5">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full bg-[#072822] border border-emerald-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
                >
                  <option value="Concluído">Concluído</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Em Análise">Em Análise</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-emerald-400 mb-1.5">
                  Data de Geração
                </label>
                <input
                  type="date"
                  value={form.data_geracao}
                  onChange={(e) => setForm({ ...form, data_geracao: e.target.value })}
                  className="w-full bg-[#072822] border border-emerald-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-emerald-900">
              <Link
                href="/relatorios"
                className="px-5 py-3 rounded-xl border border-emerald-800 text-emerald-300 hover:bg-emerald-950 font-semibold text-sm transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg transition-all"
              >
                {loading ? 'Salvando...' : 'Salvar Relatório'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
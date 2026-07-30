'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { BANNER_REGIONAL } from '@/lib/bannerImagens';

export default function NovaReservaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; mensagem: string } | null>(null);

  const [formData, setFormData] = useState({
    cliente: '',
    pacote: '',
    data_reserva: '',
    agencia: '',
    guia: '',
    valor: '',
    status: 'Pendente',
    observacoes: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLimpar = () => {
    setFormData({
      cliente: '',
      pacote: '',
      data_reserva: '',
      agencia: '',
      guia: '',
      valor: '',
      status: 'Pendente',
      observacoes: ''
    });
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    if (!formData.cliente.trim() || !formData.pacote.trim() || !formData.data_reserva.trim() || !formData.valor.toString().trim()) {
      setFeedback({
        tipo: 'erro',
        mensagem: 'Por favor, preencha todos os campos obrigatórios (Cliente, Pacote, Data do Passeio e Valor Total).'
      });
      setLoading(false);
      return;
    }

    const valorTratado = formData.valor ? Number(formData.valor.toString().replace(',', '.')) : 0;

    try {
      const { error } = await supabase.from('reservas').insert([
        {
          cliente: formData.cliente.trim(),
          pacote: formData.pacote.trim(),
          data_reserva: formData.data_reserva.trim(),
          agencia: formData.agencia.trim() || null,
          guia: formData.guia.trim() || null,
          valor: valorTratado,
          valor_total: valorTratado,
          status: formData.status,
          observacoes: formData.observacoes.trim() || null
        }
      ]);

      if (error) throw error;

      setFeedback({ tipo: 'sucesso', mensagem: 'Reserva cadastrada com sucesso. Redirecionando...' });
      
      setTimeout(() => {
        router.push('/reservas');
        router.refresh();
      }, 1500);

    } catch (err: any) {
      console.error('Erro ao cadastrar reserva:', err);
      setFeedback({ tipo: 'erro', mensagem: 'Erro ao salvar reserva: ' + (err.message || 'Erro desconhecido') });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071f1a] text-slate-100 flex flex-col relative pb-16">
      
      {/* Banner Superior Padrão Corporativo */}
      <div className="relative w-full bg-[#051713] py-24 md:py-28 px-6 text-white shadow-lg overflow-hidden flex flex-col justify-between md:px-12 border-b border-emerald-900/45">
        <div className="absolute inset-0 opacity-85 pointer-events-none overflow-hidden">
          <img
            src={BANNER_REGIONAL.modulos.viagembarco}
            alt="Banner Nova Reserva"
            className="w-full h-full object-cover object-center select-none pointer-events-none"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#071f1a] via-[#071f1a]/70 to-[#071f1a]/30 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto w-full flex justify-end z-10">
          <Link
            href="/reservas"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className="inline-flex items-center rounded-xl border border-emerald-500/30 bg-emerald-900/40 px-5 py-2.5 text-sm font-semibold text-emerald-200 backdrop-blur transition hover:bg-emerald-800/60 shadow-sm cursor-pointer no-underline"
            style={{ WebkitUserDrag: 'none' } as any}
          >
            ← Voltar para Reservas
          </Link>
        </div>

        <div className="relative max-w-7xl mx-auto w-full z-10 pt-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-900/40 px-4 py-1.5 text-xs font-semibold text-emerald-200 backdrop-blur shadow-sm mb-2 select-none">
              Gestão Operacional • Atendimento
            </div>
            <h1 className="text-3xl font-bold text-white drop-shadow-md md:text-4xl">
              Nova Reserva
            </h1>
            <p className="mt-1 text-emerald-100/80 text-sm drop-shadow-md font-medium">
              Cadastre um novo atendimento ou pacote turístico no sistema.
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal em Dark Mode Profissional */}
      <div className="px-6 py-10 md:px-12 max-w-7xl mx-auto w-full flex-1">
        <div className="rounded-3xl border border-emerald-900/40 bg-[#0a2923]/60 backdrop-blur-md p-8 shadow-xl">
          
          {feedback && (
            <div
              className={`mb-6 p-4 rounded-2xl text-sm font-semibold border ${
                feedback.tipo === 'sucesso'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
              }`}
            >
              {feedback.mensagem}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Cliente <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  name="cliente"
                  required
                  placeholder=""
                  value={formData.cliente}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Pacote / Passeio <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  name="pacote"
                  required
                  placeholder=""
                  value={formData.pacote}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Data do Passeio <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  name="data_reserva"
                  required
                  value={formData.data_reserva}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white focus:border-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Valor Total (R$) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  name="valor"
                  required
                  placeholder=""
                  value={formData.valor}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Agência / Parceiro
                </label>
                <input
                  type="text"
                  name="agencia"
                  placeholder=""
                  value={formData.agencia}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Guia Responsável
                </label>
                <input
                  type="text"
                  name="guia"
                  placeholder=""
                  value={formData.guia}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Status da Reserva <span className="text-rose-400">*</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white focus:border-emerald-500 focus:outline-none transition"
                >
                  <option value="Pendente" className="bg-[#041411]">Pendente</option>
                  <option value="Confirmada" className="bg-[#041411]">Confirmada</option>
                  <option value="Cancelada" className="bg-[#041411]">Cancelada</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Observações
                </label>
                <textarea
                  name="observacoes"
                  rows={3}
                  placeholder=""
                  value={formData.observacoes}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition resize-none"
                />
              </div>

            </div>

            {/* Botões de Ação Padronizados e Profissionais */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-8 border-t border-emerald-900/50 mt-8">
              
              <button
                type="submit"
                disabled={loading}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold text-white shadow-lg transition cursor-pointer select-none border border-emerald-500/40 ${
                  loading
                    ? 'bg-emerald-500/50 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                {loading ? 'Salvando Registro...' : 'Salvar Reserva'}
              </button>

              <button
                type="button"
                onClick={handleLimpar}
                disabled={loading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-600/40 transition cursor-pointer select-none"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Limpar Formulário
              </button>

              <button
                type="button"
                onClick={() => router.push('/reservas')}
                disabled={loading}
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
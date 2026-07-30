'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { BANNER_REGIONAL } from '@/lib/bannerImagens';

export default function EditarClientePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  const [form, setForm] = useState({
    nome: '',
    documento: '',
    telefone: '',
    email: '',
    cidade: '',
    nacionalidade: '',
    situacao: 'Ativo',
    observacoes: ''
  });

  useEffect(() => {
    if (id) {
      fetchClientePorId(id);
    }
  }, [id]);

  async function fetchClientePorId(clienteId: string | string[]) {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single();

      if (error) throw error;
      if (data) {
        setForm({
          nome: data.nome || '',
          documento: data.documento || '',
          telefone: data.telefone || '',
          email: data.email || '',
          cidade: data.cidade || '',
          nacionalidade: data.nacionalidade || '',
          situacao: data.situacao || data.situação || 'Ativo',
          observacoes: data.observacoes || ''
        });
      }
    } catch (err: any) {
      console.error('Erro ao buscar cliente:', err.message);
      alert('Erro ao carregar dados do cliente.');
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      alert('O nome do cliente é obrigatório.');
      return;
    }

    setSalvando(true);
    try {
      const { error } = await supabase
        .from('clientes')
        .update({
          nome: form.nome,
          documento: form.documento,
          telefone: form.telefone,
          email: form.email,
          cidade: form.cidade,
          nacionalidade: form.nacionalidade,
          situacao: form.situacao,
          observacoes: form.observacoes
        })
        .eq('id', id);

      if (error) throw error;

      // Substituição do alerta nativo feio por um toast moderno no topo da tela
      setMensagemSucesso('Cliente atualizado com sucesso!');
      
      setTimeout(() => {
        router.push('/clientes');
      }, 2000);
    } catch (err: any) {
      alert('Erro ao atualizar cliente: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600">
        Carregando informações do cliente...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col">
      
      {/* TOAST FLUTUANTE MODERNO NO TOPO DA TELA */}
      {mensagemSucesso && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-emerald-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-emerald-500 animate-bounce">
          <span className="text-xl">✅</span>
          <span className="font-semibold text-sm tracking-wide">{mensagemSucesso}</span>
        </div>
      )}

      {/* Banner Superior */}
      <div 
        className="relative bg-cover bg-center py-16 px-8 md:px-12 text-white flex flex-col justify-center shadow-md"
        style={{
          backgroundImage: `linear-gradient(rgba(7, 31, 26, 0.5), rgba(7, 31, 26, 0.9)), url('${BANNER_REGIONAL.modulos.clientes}')`,
        }}
      >
        <div className="max-w-4xl mx-auto w-full space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-emerald-100">
            <span>👥</span> Gestão Operacional • Editar Cadastro
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
            Editar Cliente
          </h1>
          <p className="text-emerald-100 text-sm md:text-base font-normal opacity-90">
            Atualize as informações cadastrais e detalhes de contato do cliente.
          </p>
        </div>
      </div>

      {/* Formulário Principal */}
      <div className="p-8 max-w-4xl mx-auto w-full -mt-6 z-10 space-y-6 flex-1">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Documento / CPF
                </label>
                <input
                  type="text"
                  name="documento"
                  value={form.documento}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  name="telefone"
                  value={form.telefone}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Cidade
                </label>
                <input
                  type="text"
                  name="cidade"
                  value={form.cidade}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Nacionalidade
                </label>
                <input
                  type="text"
                  name="nacionalidade"
                  value={form.nacionalidade}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Situação do Cliente
              </label>
              <select
                name="situacao"
                value={form.situacao}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Observações / Histórico
              </label>
              <textarea
                name="observacoes"
                rows={4}
                value={form.observacoes}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
                placeholder="Insira detalhes adicionais sobre o cliente..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Link
                href="/clientes"
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm px-6 py-3 rounded-xl transition"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={salvando}
                className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm px-8 py-3 rounded-xl shadow-lg transition flex items-center gap-2"
              >
                {salvando ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
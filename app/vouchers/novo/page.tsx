'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function NovoVoucherPage() {
  const router = useRouter();
  
  // Estados do Formulário de Vouchers
  const [codigo, setCodigo] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [passeioId, setPasseioId] = useState('');
  const [valor, setValor] = useState('');
  const [status, setStatus] = useState('Ativo');
  const [validade, setValidade] = useState('');

  // Listas auxiliares para os selects relacionais
  const [clientes, setClientes] = useState<any[]>([]);
  const [passeios, setPasseios] = useState<any[]>([]);
  
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarDadosRelacionados();
  }, []);

  const carregarDadosRelacionados = async () => {
    try {
      const { data: cliData } = await supabase.from('clientes').select('*');
      if (cliData) setClientes(cliData);

      const { data: pasData } = await supabase.from('passeios').select('*');
      if (pasData) setPasseios(pasData);
    } catch (err) {
      console.error('Erro ao carregar dados relacionais:', err);
    }
  };

  const handleLimpar = () => {
    setCodigo('');
    setClienteId('');
    setPasseioId('');
    setValor('');
    setStatus('Ativo');
    setValidade('');
    setErro(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);

    if (!codigo.trim() || !clienteId || !passeioId || !valor.toString().trim()) {
      setErro('Por favor, preencha todos os campos obrigatórios (Código, Cliente, Passeio e Valor).');
      setSalvando(false);
      return;
    }

    try {
      const { error } = await supabase.from('vouchers').insert([
        {
          codigo: codigo.trim(),
          cliente_id: clienteId,
          passeio_id: passeioId,
          valor: Number(valor),
          status: status,
          validade: validade || null,
        },
      ]);

      if (error) throw error;

      router.push('/vouchers');
    } catch (err: any) {
      console.error('Erro ao salvar voucher:', err);
      setErro(err.message || 'Erro ao registrar o voucher.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071f1a] text-slate-100 flex flex-col relative pb-16">
      
      {/* Banner Superior Padrão Corporativo com Imagem Externa Contextualizada (Comprovante/Reserva Turística no Rio Negro, Barcelos - AM) */}
      <div className="relative w-full bg-[#051713] py-24 md:py-28 px-6 text-white shadow-lg overflow-hidden flex flex-col justify-between md:px-12 border-b border-emerald-900/45">
        <div className="absolute inset-0 opacity-85 pointer-events-none overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1600&auto=format&fit=crop"
            alt="Banner Novo Voucher - Comprovante e Reserva Barcelos AM"
            className="w-full h-full object-cover object-center select-none pointer-events-none"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#071f1a] via-[#071f1a]/70 to-[#071f1a]/30 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto w-full flex justify-end z-10">
          <Link
            href="/vouchers"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className="inline-flex items-center rounded-xl border border-emerald-500/30 bg-emerald-900/40 px-5 py-2.5 text-sm font-semibold text-emerald-200 backdrop-blur transition hover:bg-emerald-800/60 shadow-sm cursor-pointer no-underline"
            style={{ WebkitUserDrag: 'none' } as any}
          >
            ← Voltar para Vouchers
          </Link>
        </div>

        <div className="relative max-w-7xl mx-auto w-full z-10 pt-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-900/40 px-4 py-1.5 text-xs font-semibold text-emerald-200 backdrop-blur shadow-sm mb-2 select-none">
              Gestão Operacional • Vouchers e Comprovantes
            </div>
            <h1 className="text-3xl font-bold text-white drop-shadow-md md:text-4xl">
              Novo Voucher
            </h1>
            <p className="mt-1 text-emerald-100/80 text-sm drop-shadow-md font-medium">
              Emissão de comprovante de pagamento antecipado e garantia de reserva para roteiros em Barcelos - AM.
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal com Fundo Robusto, Elevado e Acabamento Profissional */}
      <div className="px-6 py-10 md:px-12 max-w-7xl mx-auto w-full flex-1">
        <div className="rounded-3xl border border-emerald-900/40 bg-[#0a2923]/60 backdrop-blur-md p-8 shadow-xl">
          
          {erro && (
            <div className="mb-6 p-4 rounded-2xl text-sm font-semibold border bg-rose-950/80 text-rose-300 border-rose-500/40">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Código do Voucher <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder=""
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Status Inicial <span className="text-rose-400">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white focus:border-emerald-500 focus:outline-none transition"
                >
                  <option value="Ativo" className="bg-[#041411]">Ativo</option>
                  <option value="Utilizado" className="bg-[#041411]">Utilizado</option>
                  <option value="Cancelado" className="bg-[#041411]">Cancelado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                Cliente <span className="text-rose-400">*</span>
              </label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white focus:border-emerald-500 focus:outline-none transition"
              >
                <option value="" className="bg-[#041411]">Selecione um cliente...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#041411]">
                    {c.nome || c.nome_completo || `Cliente #${c.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                Passeio / Roteiro Associado <span className="text-rose-400">*</span>
              </label>
              <select
                value={passeioId}
                onChange={(e) => setPasseioId(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white focus:border-emerald-500 focus:outline-none transition"
              >
                <option value="" className="bg-[#041411]">Selecione um passeio...</option>
                {passeios.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#041411]">
                    {p.nome || p.titulo || `Passeio #${p.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Valor (R$) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder=""
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Data de Validade
                </label>
                <input
                  type="date"
                  value={validade}
                  onChange={(e) => setValidade(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white focus:border-emerald-500 focus:outline-none transition"
                />
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
                {salvando ? 'Salvando Registro...' : 'Salvar Voucher'}
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
                onClick={() => router.push('/vouchers')}
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
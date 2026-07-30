'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function NovaHospedagemPage() {
  const router = useRouter();

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('');
  const [endereco, setEndereco] = useState('');
  const [telefone, setTelefone] = useState('');
  const [valorDiaria, setValorDiaria] = useState('');
  const [status, setStatus] = useState('Disponível');

  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const converterParaNumeroSupabase = (valorInput: string) => {
    if (!valorInput) return 0;
    let stringValor = valorInput.trim().replace('R$', '').trim();

    if (stringValor.includes('.') && stringValor.includes(',')) {
      stringValor = stringValor.replace(/\./g, '').replace(',', '.');
    } else if (stringValor.includes(',')) {
      stringValor = stringValor.replace(',', '.');
    }

    const numeroFinal = parseFloat(stringValor);
    return isNaN(numeroFinal) ? 0 : numeroFinal;
  };

  const handleLimpar = () => {
    setNome('');
    setTipo('');
    setEndereco('');
    setTelefone('');
    setValorDiaria('');
    setStatus('Disponível');
    setMensagem(null);
    setSucesso(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setMensagem(null);

    if (!nome.trim() || !valorDiaria.toString().trim()) {
      setMensagem('Por favor, preencha todos os campos obrigatórios.');
      setSucesso(false);
      setCarregando(false);
      return;
    }

    try {
      const valorTratado = converterParaNumeroSupabase(valorDiaria);

      const { error: insertError } = await supabase.from('hospedagens').insert([
        {
          nome: nome.trim(),
          tipo: tipo.trim(),
          endereco: endereco.trim(),
          telefone: telefone.trim(),
          valor_diaria: valorTratado,
          status: status,
        },
      ]);

      if (insertError) {
        console.error('Erro detalhado Supabase:', insertError);
        throw new Error(insertError.message);
      }

      setSucesso(true);
      setMensagem('Hospedagem cadastrada com sucesso! Redirecionando...');

      setTimeout(() => {
        router.push('/hospedagens');
      }, 2000);
    } catch (err: any) {
      console.error('Erro ao cadastrar hospedagem:', err);
      setMensagem('Erro ao cadastrar: ' + (err.message || 'Verifique os campos.'));
      setSucesso(false);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071f1a] text-slate-100 flex flex-col relative pb-16">
      
      {/* Banner Superior Padrão Corporativo com Imagem Externa da Internet (Hospedagens / Rio Negro - Barcelos AM) */}
      <div className="relative w-full bg-[#051713] py-24 md:py-28 px-6 text-white shadow-lg overflow-hidden flex flex-col justify-between md:px-12 border-b border-emerald-900/45">
        <div className="absolute inset-0 opacity-85 pointer-events-none overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1600&auto=format&fit=crop"
            alt="Banner Nova Hospedagem"
            className="w-full h-full object-cover object-center select-none pointer-events-none"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#071f1a] via-[#071f1a]/70 to-[#071f1a]/30 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto w-full flex justify-end z-10">
          <Link
            href="/hospedagens"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className="inline-flex items-center rounded-xl border border-emerald-500/30 bg-emerald-900/40 px-5 py-2.5 text-sm font-semibold text-emerald-200 backdrop-blur transition hover:bg-emerald-800/60 shadow-sm cursor-pointer no-underline"
            style={{ WebkitUserDrag: 'none' } as any}
          >
            ← Voltar para Hospedagens
          </Link>
        </div>

        <div className="relative max-w-7xl mx-auto w-full z-10 pt-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-900/40 px-4 py-1.5 text-xs font-semibold text-emerald-200 backdrop-blur shadow-sm mb-2 select-none">
              Gestão Operacional • Hospedagens
            </div>
            <h1 className="text-3xl font-bold text-white drop-shadow-md md:text-4xl">
              Nova Hospedagem
            </h1>
            <p className="mt-1 text-emerald-100/80 text-sm drop-shadow-md font-medium">
              Preencha os campos abaixo para registrar uma nova unidade no banco de dados.
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal com Fundo Robusto, Elevado e Acabamento Profissional */}
      <div className="px-6 py-10 md:px-12 max-w-7xl mx-auto w-full flex-1">
        <div className="rounded-3xl border border-emerald-900/40 bg-[#0a2923]/60 backdrop-blur-md p-8 shadow-xl">
          
          {mensagem && (
            <div className={`mb-6 p-4 rounded-2xl text-sm font-semibold border ${
              sucesso 
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
            }`}>
              {mensagem}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                Nome da Hospedagem <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder=""
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Tipo
                </label>
                <input
                  type="text"
                  placeholder=""
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Valor da Diária (R$) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder=""
                  value={valorDiaria}
                  onChange={(e) => setValorDiaria(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm font-bold text-emerald-400 placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                Localização / Endereço
              </label>
              <input
                type="text"
                placeholder=""
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                  Telefone
                </label>
                <input
                  type="text"
                  placeholder=""
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
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
                  <option value="Disponível" className="bg-[#041411]">Disponível</option>
                  <option value="Ocupada" className="bg-[#041411]">Ocupada</option>
                  <option value="Reservada" className="bg-[#041411]">Reservada</option>
                </select>
              </div>
            </div>

            {/* Botões de Ação Padronizados e Profissionais */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-8 border-t border-emerald-900/50 mt-8">
              
              <button
                type="submit"
                disabled={carregando}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold text-white shadow-lg transition cursor-pointer select-none border border-emerald-500/40 ${
                  carregando
                    ? 'bg-emerald-500/50 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                {carregando ? 'Salvando Registro...' : 'Cadastrar Hospedagem'}
              </button>

              <button
                type="button"
                onClick={handleLimpar}
                disabled={carregando}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-600/40 transition cursor-pointer select-none"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Limpar Formulário
              </button>

              <button
                type="button"
                onClick={() => router.push('/hospedagens')}
                disabled={carregando}
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
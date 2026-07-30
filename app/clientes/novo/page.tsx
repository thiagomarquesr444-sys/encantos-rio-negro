'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { BANNER_REGIONAL } from '@/lib/bannerImagens';

interface ClienteForm {
  nome: string;
  documento: string;
  telefone: string;
  email: string;
  cidade: string;
  nacionalidade: string;
  observacoes: string;
  situacao: string;
}

export default function NovoClientePage() {
  const router = useRouter();

  const initialFormState: ClienteForm = {
    nome: '',
    documento: '',
    telefone: '',
    email: '',
    cidade: '',
    nacionalidade: '',
    observacoes: '',
    situacao: 'Ativo',
  };

  const [formData, setFormData] = useState<ClienteForm>(initialFormState);
  const [salvando, setSalvando] = useState(false);
  const [mensagemStatus, setMensagemStatus] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Máscaras de entrada
  const aplicarMascaraDocumento = (valor: string) => {
    const apenasNumeros = valor.replace(/\D/g, '');
    if (apenasNumeros.length <= 11) {
      return apenasNumeros
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return valor;
  };

  const aplicarMascaraTelefone = (valor: string) => {
    const apenasNumeros = valor.replace(/\D/g, '');
    return apenasNumeros
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let valorFormatado = value;

    if (name === 'documento') {
      valorFormatado = aplicarMascaraDocumento(value);
    } else if (name === 'telefone') {
      valorFormatado = aplicarMascaraTelefone(value);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: valorFormatado,
    }));
  };

  const handleLimpar = () => {
    setFormData(initialFormState);
    setMensagemStatus(null);
  };

  const handleCancelar = () => {
    router.push('/clientes');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setMensagemStatus(null);

    if (
      !formData.nome.trim() ||
      !formData.documento.trim() ||
      !formData.email.trim() ||
      !formData.telefone.trim() ||
      !formData.cidade.trim()
    ) {
      setMensagemStatus({
        tipo: 'erro',
        texto: 'Por favor, preencha todos os campos obrigatórios (Nome, CPF, E-mail, Telefone e Cidade).',
      });
      setSalvando(false);
      return;
    }

    try {
      const payload = {
        nome: formData.nome.trim(),
        documento: formData.documento.trim() || null,
        telefone: formData.telefone.trim() || null,
        email: formData.email.trim() || null,
        cidade: formData.cidade.trim() || null,
        nacionalidade: formData.nacionalidade.trim() || null,
        observacoes: formData.observacoes.trim() || null,
        situacao: formData.situacao || 'Ativo',
      };

      const { error } = await supabase.from('clientes').insert([payload]);

      if (error) throw error;

      setMensagemStatus({
        tipo: 'sucesso',
        texto: 'Cliente cadastrado com sucesso. Redirecionando...',
      });

      setTimeout(() => {
        router.push('/clientes');
      }, 1500);

    } catch (error: any) {
      console.error('Erro no Supabase:', error);
      const msgErro = error?.message || 'Erro ao salvar o cliente.';
      setMensagemStatus({
        tipo: 'erro',
        texto: `Falha ao salvar no banco de dados: ${msgErro}`,
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071f1a] text-slate-100 flex flex-col relative pb-16">
      
      {/* Banner Superior */}
      <div className="relative w-full bg-[#051713] py-24 md:py-28 px-6 text-white shadow-lg overflow-hidden flex flex-col justify-between md:px-12 border-b border-emerald-900/45">
        <div className="absolute inset-0 opacity-85 pointer-events-none overflow-hidden">
          <img
            src={BANNER_REGIONAL.modulos.serra}
            alt="Banner Novo Cliente"
            className="w-full h-full object-cover object-center select-none pointer-events-none"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#071f1a] via-[#071f1a]/70 to-[#071f1a]/30 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto w-full flex justify-end z-10">
          <Link
            href="/clientes"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className="inline-flex items-center rounded-xl border border-emerald-500/30 bg-emerald-900/40 px-5 py-2.5 text-sm font-semibold text-emerald-200 backdrop-blur transition hover:bg-emerald-800/60 shadow-sm cursor-pointer no-underline"
            style={{ WebkitUserDrag: 'none' } as any}
          >
            ← Voltar para Clientes
          </Link>
        </div>

        <div className="relative max-w-7xl mx-auto w-full z-10 pt-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-900/40 px-4 py-1.5 text-xs font-semibold text-emerald-200 backdrop-blur shadow-sm mb-2 select-none">
              Gestão Operacional • Cadastro
            </div>
            <h1 className="text-3xl font-bold text-white drop-shadow-md md:text-4xl">
              Novo Cliente
            </h1>
            <p className="mt-1 text-emerald-100/80 text-sm drop-shadow-md font-medium">
              Preencha os dados cadastrais para registrar um novo perfil no sistema.
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="px-6 py-10 md:px-12 max-w-7xl mx-auto w-full flex-1">
        <div className="rounded-3xl border border-emerald-900/40 bg-[#0a2923]/60 backdrop-blur-md p-8 shadow-xl">
          
          {mensagemStatus && (
            <div
              className={`mb-6 p-4 rounded-2xl text-sm font-semibold border ${
                mensagemStatus.tipo === 'sucesso'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
              }`}
            >
              {mensagemStatus.texto}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* COLUNA 1: Formulário Principal */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 border-b border-emerald-900/50 pb-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <h3 className="text-lg font-bold text-white tracking-wide">Dados Pessoais e Cadastrais</h3>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                    Nome Completo <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="nome"
                    required
                    value={formData.nome}
                    onChange={handleChange}
                    placeholder=""
                    className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                      CPF / Documento <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="documento"
                      required
                      value={formData.documento}
                      onChange={handleChange}
                      placeholder=""
                      className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                      Telefone / WhatsApp <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="telefone"
                      required
                      value={formData.telefone}
                      onChange={handleChange}
                      placeholder=""
                      className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                      E-mail <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder=""
                      className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                      Cidade / UF <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="cidade"
                      required
                      value={formData.cidade}
                      onChange={handleChange}
                      placeholder=""
                      className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                      Nacionalidade
                    </label>
                    <input
                      type="text"
                      name="nacionalidade"
                      value={formData.nacionalidade}
                      onChange={handleChange}
                      placeholder=""
                      className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                      Situação
                    </label>
                    <select
                      name="situacao"
                      value={formData.situacao}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white focus:border-emerald-500 focus:outline-none transition"
                    >
                      <option value="Ativo" className="bg-[#041411]">Ativo</option>
                      <option value="Inativo" className="bg-[#041411]">Inativo</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* COLUNA 2: Diretrizes de Cadastro e Observações */}
              <div className="space-y-6">
                
                {/* Bloco Profissional de Requisitos de Emissão */}
                <div className="rounded-2xl border border-emerald-500/20 bg-[#061a16] p-5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase tracking-wider mb-2 select-none">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Requisitos para Emissão de Vouchers e Reservas</span>
                  </div>
                  <p className="text-xs text-emerald-100/70 leading-relaxed mb-4">
                    Para garantir a validade operacional, emissão correta de voos e consolidação da reserva do cliente, certifique-se de que as seguintes credenciais estejam totalmente preenchidas:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium text-emerald-200/90">
                    <div className="flex items-center gap-2 bg-[#04120f] px-3 py-2 rounded-lg border border-emerald-900/40 select-none">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Nome Completo</span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#04120f] px-3 py-2 rounded-lg border border-emerald-900/40 select-none">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>CPF / Documento</span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#04120f] px-3 py-2 rounded-lg border border-emerald-900/40 select-none">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>E-mail Corporativo/Pessoal</span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#04120f] px-3 py-2 rounded-lg border border-emerald-900/40 select-none">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Telefone / WhatsApp</span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#04120f] px-3 py-2 rounded-lg border border-emerald-900/40 sm:col-span-2 select-none">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Cidade / UF de Origem</span>
                    </div>
                  </div>
                </div>

                {/* Bloco de Observações Gerais */}
                <div>
                  <div className="flex items-center gap-2 border-b border-emerald-900/50 pb-2 mb-3">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <h3 className="text-lg font-bold text-white tracking-wide">Observações Gerais</h3>
                  </div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200/80 mb-2 select-none">
                    Notas Operacionais e Restrições
                  </label>
                  <textarea
                    name="observacoes"
                    rows={4}
                    value={formData.observacoes}
                    onChange={handleChange}
                    placeholder="Insira restrições alimentares, preferências de acomodação, detalhes de voos ou anotações logísticas relevantes..."
                    className="w-full px-4 py-3 rounded-xl border border-emerald-800/80 bg-[#041411] text-sm text-white placeholder-emerald-900/40 focus:border-emerald-500 focus:outline-none transition resize-none"
                  />
                </div>

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
                {salvando ? 'Salvando Registro...' : 'Salvar Cliente'}
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
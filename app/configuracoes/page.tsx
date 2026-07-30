'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ConfiguracaoApp {
  id?: string;
  created_at?: string;
  updated_at?: string;
  nome_sistema?: string;
  tema?: string;
  moeda?: string;
  fuso_horario?: string;
  permitir_reservas_mesmo_dia?: boolean;
  antecedencia_minima_horas?: number;
  porcentagem_sinal?: number;
  enviar_email_confirmacao?: boolean;
  enviar_whatsapp_confirmacao?: boolean;
  chave_api_pix?: string;
  outras_configuracoes?: any;
}

export default function ConfiguracoesAppPage() {
  const [config, setConfig] = useState<ConfiguracaoApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  // Estados específicos para a alteração de senha
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [alterandoSenha, setAlterandoSenha] = useState(false);
  const [mensagemSenha, setMensagemSenha] = useState({ texto: '', tipo: '' });

  useEffect(() => {
    async function fetchConfig() {
      try {
        const { data, error } = await supabase.from('configuracoes').select('*').limit(1).single();
        if (!error && data) {
          setConfig(data);
        } else {
          setConfig({
            nome_sistema: 'Encantos Rio Negro - Gestão',
            tema: 'Escuro',
            moeda: 'BRL',
            fuso_horario: 'America/Manaus',
            permitir_reservas_mesmo_dia: true,
            antecedencia_minima_horas: 2,
            porcentagem_sinal: 50,
            enviar_email_confirmacao: true,
            enviar_whatsapp_confirmacao: true,
            chave_api_pix: '',
          });
        }
      } catch (err) {
        console.error('Erro ao buscar configurações:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSalvando(true);
    setMensagem('');

    try {
      const payload = {
        ...config,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('configuracoes').upsert([payload]);
      if (error) {
        setMensagem('Erro ao salvar as configurações no banco de dados.');
      } else {
        setMensagem('Configurações salvas com sucesso!');
      }
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setMensagem('Erro inesperado ao salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const handleAtualizarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagemSenha({ texto: '', tipo: '' });

    if (novaSenha !== confirmarSenha) {
      setMensagemSenha({ texto: 'As senhas não coincidem. Verifique e tente novamente.', tipo: 'erro' });
      return;
    }

    if (novaSenha.length < 6) {
      setMensagemSenha({ texto: 'A nova senha deve ter pelo menos 6 caracteres.', tipo: 'erro' });
      return;
    }

    setAlterandoSenha(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: novaSenha,
      });

      if (error) {
        setMensagemSenha({ texto: 'Erro ao atualizar a senha: ' + error.message, tipo: 'erro' });
      } else {
        setMensagemSenha({ texto: 'Senha alterada com sucesso! Seu acesso está seguro.', tipo: 'sucesso' });
        setNovaSenha('');
        setConfirmarSenha('');
      }
    } catch (err) {
      setMensagemSenha({ texto: 'Ocorreu um erro inesperado ao alterar a senha.', tipo: 'erro' });
    } finally {
      setAlterandoSenha(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#072822] text-slate-100 flex flex-col">
      <div 
        className="relative bg-cover bg-center py-12 px-8 text-white flex flex-col items-center justify-center text-center shadow-md border-b border-emerald-950/40"
        style={{
          backgroundImage: `linear-gradient(rgba(7, 40, 34, 0.85), rgba(4, 24, 20, 0.95)), url('https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1600&auto=format&fit=crop')`,
        }}
      >
        <div className="max-w-4xl space-y-3">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center justify-center gap-3 text-white">
            <span>⚙️</span> Configurações do Sistema
          </h1>
          <p className="text-emerald-200/90 text-sm md:text-base font-medium">
            Painel de parâmetros operacionais, identidade visual e integrações da plataforma.
          </p>
        </div>
      </div>

      <div className="p-8 max-w-5xl mx-auto w-full -mt-6 z-10 space-y-8 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-[#041c17] rounded-2xl p-6 shadow-xl border border-emerald-900/60 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400/80">Identidade do Sistema</span>
              <span className="text-xl">🏢</span>
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-extrabold text-white truncate">
                {loading ? '...' : config?.nome_sistema || 'Encantos Rio Negro'}
              </h2>
              <p className="text-xs font-semibold text-emerald-300/80 mt-2">
                Gestão sincronizada da empresa
              </p>
            </div>
          </div>

          <div className="bg-[#041c17] rounded-2xl p-6 shadow-xl border border-emerald-900/60 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400/80">Tema & Visual</span>
              <span className="text-xl">🎨</span>
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-extrabold text-white">
                {loading ? '...' : config?.tema || 'Escuro'}
              </h2>
              <p className="text-xs font-semibold text-emerald-400 mt-2">
                Experiência visual personalizada
              </p>
            </div>
          </div>
        </div>

        {/* Bloco Principal de Configurações */}
        <div className="bg-[#041c17] rounded-2xl shadow-2xl border border-emerald-900/60 p-8">
          {loading ? (
            <div className="p-12 text-center text-emerald-300 text-sm">Carregando dados do Supabase...</div>
          ) : (
            <form onSubmit={handleSalvar} className="space-y-6">
              {mensagem && (
                <div className={`p-4 rounded-xl text-sm font-medium ${mensagem.includes('sucesso') ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' : 'bg-rose-950 text-rose-300 border border-rose-700/60'}`}>
                  {mensagem}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400/80 mb-2">
                    Nome da Gestão / Sistema
                  </label>
                  <input
                    type="text"
                    value={config?.nome_sistema || ''}
                    onChange={(e) => setConfig({ ...config, nome_sistema: e.target.value })}
                    className="w-full bg-[#02110e] border border-emerald-900/80 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400/80 mb-2">
                    Tema do Aplicativo
                  </label>
                  <select
                    value={config?.tema || 'Escuro'}
                    onChange={(e) => setConfig({ ...config, tema: e.target.value })}
                    className="w-full bg-[#02110e] border border-emerald-900/80 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Escuro">Modo Escuro (Dark)</option>
                    <option value="Claro">Modo Claro (Light)</option>
                    <option value="Personalizado">Personalizado da Empresa</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400/80 mb-2">
                    Moeda
                  </label>
                  <input
                    type="text"
                    value={config?.moeda || 'BRL'}
                    onChange={(e) => setConfig({ ...config, moeda: e.target.value })}
                    className="w-full bg-[#02110e] border border-emerald-900/80 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400/80 mb-2">
                    Fuso Horário
                  </label>
                  <input
                    type="text"
                    value={config?.fuso_horario || 'America/Manaus'}
                    onChange={(e) => setConfig({ ...config, fuso_horario: e.target.value })}
                    className="w-full bg-[#02110e] border border-emerald-900/80 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400/80 mb-2">
                    Porcentagem Sinal (%)
                  </label>
                  <input
                    type="number"
                    value={config?.porcentagem_sinal ?? 50}
                    onChange={(e) => setConfig({ ...config, porcentagem_sinal: Number(e.target.value) })}
                    className="w-full bg-[#02110e] border border-emerald-900/80 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400/80 mb-2">
                    Antecedência Mínima (Horas)
                  </label>
                  <input
                    type="number"
                    value={config?.antecedencia_minima_horas ?? 2}
                    onChange={(e) => setConfig({ ...config, antecedencia_minima_horas: Number(e.target.value) })}
                    className="w-full bg-[#02110e] border border-emerald-900/80 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400/80 mb-2">
                    Chave API Pix
                  </label>
                  <input
                    type="text"
                    placeholder="Sua chave Pix para recebimento"
                    value={config?.chave_api_pix || ''}
                    onChange={(e) => setConfig({ ...config, chave_api_pix: e.target.value })}
                    className="w-full bg-[#02110e] border border-emerald-900/80 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-emerald-900/40">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!config?.permitir_reservas_mesmo_dia}
                    onChange={(e) => setConfig({ ...config, permitir_reservas_mesmo_dia: e.target.checked })}
                    className="w-5 h-5 rounded bg-[#02110e] border-emerald-800 text-emerald-600 focus:ring-0"
                  />
                  <span className="text-sm font-medium text-slate-200">Permitir Reservas no Mesmo Dia</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!config?.enviar_email_confirmacao}
                    onChange={(e) => setConfig({ ...config, enviar_email_confirmacao: e.target.checked })}
                    className="w-5 h-5 rounded bg-[#02110e] border-emerald-800 text-emerald-600 focus:ring-0"
                  />
                  <span className="text-sm font-medium text-slate-200">Enviar E-mail de Confirmação</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!config?.enviar_whatsapp_confirmacao}
                    onChange={(e) => setConfig({ ...config, enviar_whatsapp_confirmacao: e.target.checked })}
                    className="w-5 h-5 rounded bg-[#02110e] border-emerald-800 text-emerald-600 focus:ring-0"
                  />
                  <span className="text-sm font-medium text-slate-200">Enviar WhatsApp de Confirmação</span>
                </label>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={salvando}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>💾</span> {salvando ? 'Salvando...' : 'Salvar Alterações do Sistema'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Bloco Integrado de Segurança e Alteração de Senha */}
        <div className="bg-[#041c17] rounded-2xl shadow-2xl border border-emerald-900/60 p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🔒</span> Segurança da Conta & Senha
            </h2>
            <p className="text-xs text-emerald-300/80 mt-1">
              Atualize sua senha de acesso para manter a gestão da sua agência protegida.
            </p>
          </div>

          {mensagemSenha.texto && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${
              mensagemSenha.tipo === 'sucesso' 
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' 
                : 'bg-rose-950 text-rose-300 border border-rose-700/60'
            }`}>
              {mensagemSenha.texto}
            </div>
          )}

          <form onSubmit={handleAtualizarSenha} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400/80 mb-2">
                  Nova Senha
                </label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo de 6 caracteres"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="w-full bg-[#02110e] border border-emerald-900/80 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400/80 mb-2">
                  Confirme a Nova Senha
                </label>
                <input
                  type="password"
                  required
                  placeholder="Digite a senha novamente"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="w-full bg-[#02110e] border border-emerald-900/80 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={alterandoSenha}
                className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-sm px-6 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span>🔑</span> {alterandoSenha ? 'Atualizando Senha...' : 'Atualizar Minha Senha'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
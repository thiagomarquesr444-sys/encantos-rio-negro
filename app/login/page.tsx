'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [modoCadastro, setModoCadastro] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro('');
    setSucesso('');

    try {
      if (modoCadastro) {
        // Fluxo de Cadastro de Novo Usuário e Senha
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });

        if (error) {
          setErro(error.message);
          setLoading(false);
          return;
        }

        if (data?.user) {
          setSucesso('Conta criada com sucesso! Faça o login agora com sua nova senha.');
          setModoCadastro(false);
        } else {
          setSucesso('Cadastro realizado. Verifique seu e-mail se necessário.');
        }
        setLoading(false);
      } else {
        // Fluxo de Login Normal
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: senha,
        });

        if (error) {
          setErro('E-mail ou senha inválidos. Verifique suas credenciais ou crie uma conta.');
          setLoading(false);
          return;
        }

        if (data?.session) {
          window.location.href = '/dashboard';
        } else {
          setErro('Sessão não iniciada. Tente novamente.');
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Erro na autenticação:', err);
      setErro('Ocorreu um erro inesperado ao tentar processar a solicitação.');
      setLoading(false);
    }
  };

  const handleEsqueciSenha = async () => {
    if (!email.trim()) {
      setErro('Digite seu e-mail acima para receber o link de redefinição de senha.');
      return;
    }
    setLoading(true);
    setErro('');
    setSucesso('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/dashboard`,
      });

      if (error) {
        setErro(error.message);
      } else {
        setSucesso('E-mail de redefinição enviado! Verifique sua caixa de entrada.');
      }
    } catch (err) {
      console.error('Erro ao recuperar senha:', err);
      setErro('Não foi possível enviar o e-mail de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#072822] text-slate-100 flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md bg-[#041c17] rounded-3xl shadow-2xl border border-emerald-900/60 p-8 sm:p-10 space-y-8">
        
        {/* Cabeçalho com o Logotipo Oficial da Empresa */}
        <div className="text-center space-y-3 flex flex-col items-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-b from-[#0a2923] to-[#041411] border border-cyan-500/30 flex items-center justify-center shadow-xl mb-2 relative overflow-hidden">
            <span className="text-3xl font-serif text-cyan-400 font-bold tracking-widest">ERN</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Encantos Rio Negro
          </h1>
          <p className="text-emerald-300/80 text-xs sm:text-sm font-medium">
            {modoCadastro 
              ? 'Cadastre seu e-mail e senha para acessar o sistema.' 
              : 'Faça login para acessar o sistema de gestão regional.'}
          </p>
        </div>

        {erro && (
          <div className="p-4 rounded-xl text-xs sm:text-sm font-medium bg-rose-950 text-rose-300 border border-rose-700/60 text-center">
            {erro}
          </div>
        )}

        {sucesso && (
          <div className="p-4 rounded-xl text-xs sm:text-sm font-medium bg-emerald-950 text-emerald-300 border border-emerald-700/60 text-center">
            {sucesso}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400/80">
              E-mail de Acesso
            </label>
            <input
              type="email"
              required
              placeholder="seu.email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#02110e] border border-emerald-900/80 rounded-xl px-4 py-3.5 text-slate-100 text-sm placeholder-emerald-400/40 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400/80">
              Senha
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-[#02110e] border border-emerald-900/80 rounded-xl px-4 py-3.5 text-slate-100 text-sm placeholder-emerald-400/40 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer border border-cyan-400/40"
          >
            {loading ? 'Processando...' : (modoCadastro ? 'Cadastrar Nova Conta' : 'Entrar no Aplicativo')}
          </button>
        </form>

        {/* Alternadores de Ação (Criar Conta / Esqueci a Senha) */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs pt-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setModoCadastro(!modoCadastro);
              setErro('');
              setSucesso('');
            }}
            className="text-cyan-400 hover:underline font-medium cursor-pointer"
          >
            {modoCadastro ? '← Voltar para o Login' : 'Não tem conta? Cadastre-se'}
          </button>

          {!modoCadastro && (
            <button
              type="button"
              onClick={handleEsqueciSenha}
              className="text-emerald-400/80 hover:underline font-medium cursor-pointer"
            >
              Esqueci minha senha
            </button>
          )}
        </div>

        <div className="pt-4 border-t border-emerald-900/40 text-center">
          <p className="text-xs text-emerald-400/60 font-medium">
            Ambiente seguro integrado ao Supabase • Encantos Rio Negro
          </p>
        </div>

      </div>
    </div>
  );
}
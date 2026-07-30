'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { BANNER_REGIONAL } from '@/lib/bannerImagens';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    clientes: 0,
    reservas: 0,
    roteiros: 0,
    embarcacoes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);

      try {
        const [resClientes, resReservas, resPasseios, resEmbarcacoes] = await Promise.all([
          supabase.from('clientes').select('id', { count: 'exact', head: true }),
          supabase.from('reservas').select('id', { count: 'exact', head: true }),
          supabase.from('passeios').select('id', { count: 'exact', head: true }),
          supabase.from('embarcacoes').select('id', { count: 'exact', head: true }),
        ]);

        if (resClientes.error) throw new Error(`Erro em clientes: ${resClientes.error.message}`);
        if (resReservas.error) throw new Error(`Erro em reservas: ${resReservas.error.message}`);
        if (resPasseios.error) throw new Error(`Erro em passeios: ${resPasseios.error.message}`);
        if (resEmbarcacoes.error) throw new Error(`Erro em embarcações: ${resEmbarcacoes.error.message}`);

        setStats({
          clientes: resClientes.count || 0,
          reservas: resReservas.count || 0,
          roteiros: resPasseios.count || 0,
          embarcacoes: resEmbarcacoes.count || 0,
        });
      } catch (err: any) {
        console.error('Erro ao carregar estatísticas:', err);
        setError(err.message || 'Ocorreu um erro inesperado ao carregar o dashboard.');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-[#071f1a] text-slate-800 flex flex-col selection:bg-emerald-500 selection:text-white">
      <div 
        className="relative bg-cover bg-center h-[440px] px-8 text-white flex flex-col justify-end pb-8 shadow-2xl overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(7, 31, 26, 0.15) 20%, rgba(7, 31, 26, 0.98) 100%), url('${BANNER_REGIONAL.modulos.dashboard}')`,
        }}
      >
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold tracking-widest uppercase mb-1 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Plataforma Oficial
            </span>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-lg">
              Encantos Rio Negro
            </h1>
            <p className="text-emerald-100/95 text-sm md:text-base font-medium drop-shadow-md max-w-2xl leading-relaxed">
              Gestão operacional avançada e integrada para agências de turismo em <span className="text-emerald-300 font-semibold">Barcelos, Capital do Tucunaré</span>.
            </p>
          </div>

          <div className="flex-shrink-0">
            <button
              onClick={() => router.push('/clientes/novo')}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-lg hover:shadow-emerald-900/50 transition-all border border-emerald-400/40 transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span className="text-base font-bold">+</span> Novo Cliente
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto w-full -mt-6 z-10 flex-1 space-y-6">
        {error && (
          <div className="p-4 text-red-200 bg-red-950/80 rounded-2xl border border-red-800 text-sm font-medium shadow-lg backdrop-blur-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card Clientes */}
          <Link href="/clientes" className="bg-[#041c17] text-white rounded-2xl p-6 shadow-xl border border-emerald-900/60 border-l-4 border-l-blue-400 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:border-emerald-700/80 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400/80 group-hover:text-blue-400 transition-colors">Clientes</span>
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
            </div>
            <div className="mt-6">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                {loading ? <span className="animate-pulse text-emerald-600">...</span> : stats.clientes}
              </h2>
              <p className="text-xs font-medium text-emerald-300/80 mt-2 flex items-center gap-1">
                <span className="text-blue-400 font-bold">↑</span> Ativos no banco
              </p>
            </div>
          </Link>

          {/* Card Reservas */}
          <Link href="/reservas" className="bg-[#041c17] text-white rounded-2xl p-6 shadow-xl border border-emerald-900/60 border-l-4 border-l-sky-400 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:border-emerald-700/80 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400/80 group-hover:text-sky-400 transition-colors">Reservas</span>
              <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
            </div>
            <div className="mt-6">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                {loading ? <span className="animate-pulse text-emerald-600">...</span> : stats.reservas}
              </h2>
              <p className="text-xs font-medium text-emerald-300/80 mt-2 flex items-center gap-1">
                <span className="text-sky-400 font-bold">↑</span> Pendentes / Confirmadas
              </p>
            </div>
          </Link>

          {/* Card Roteiros */}
          <Link href="/passeios" className="bg-[#041c17] text-white rounded-2xl p-6 shadow-xl border border-emerald-900/60 border-l-4 border-l-amber-400 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:border-emerald-700/80 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400/80 group-hover:text-amber-400 transition-colors">Roteiros</span>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
            <div className="mt-6">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                {loading ? <span className="animate-pulse text-emerald-600">...</span> : stats.roteiros}
              </h2>
              <p className="text-xs font-medium text-emerald-300/80 mt-2 flex items-center gap-1">
                <span className="text-amber-400 font-bold">✦</span> Ativos no catálogo
              </p>
            </div>
          </Link>

          {/* Card Embarcações */}
          <Link href="/embarcacoes" className="bg-[#041c17] text-white rounded-2xl p-6 shadow-xl border border-emerald-900/60 border-l-4 border-l-purple-400 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:border-emerald-700/80 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400/80 group-hover:text-purple-400 transition-colors">Embarcações</span>
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2zM6 10h12M6 14h12" /></svg>
              </div>
            </div>
            <div className="mt-6">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                {loading ? <span className="animate-pulse text-emerald-600">...</span> : stats.embarcacoes}
              </h2>
              <p className="text-xs font-medium text-emerald-300/80 mt-2 flex items-center gap-1">
                <span className="text-purple-400 font-bold">✦</span> Todas disponíveis
              </p>
            </div>
          </Link>

        </div>
      </div>
    </div>
  );
}
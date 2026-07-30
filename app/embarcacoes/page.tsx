'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { BANNER_REGIONAL } from "@/lib/bannerImagens";

interface Embarcacao {
  id?: string;
  nome: string;
  tipo?: string;
  capacidade?: number | string;
  marinheiro?: string;
  motor?: string;
  situacao?: string;
  status?: string;
  created_at?: string;
}

export default function EmbarcacoesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [embarcacoes, setEmbarcacoes] = useState<Embarcacao[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  const [embarcacaoVisualizando, setEmbarcacaoVisualizando] = useState<Embarcacao | null>(null);
  const [embarcacaoEditando, setEmbarcacaoEditando] = useState<Embarcacao | null>(null);
  const [embarcacaoExcluindo, setEmbarcacaoExcluindo] = useState<Embarcacao | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [excluindoItem, setExcluindoItem] = useState(false);

  const [toast, setToast] = useState<{ mensagem: string; tipo: 'sucesso' | 'erro' } | null>(null);

  const mostrarToast = (mensagem: string, tipo: 'sucesso' | 'erro') => {
    setToast({ mensagem, tipo });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchEmbarcacoes = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from("embarcacoes")
        .select("*")
        .order("created_at", { ascending: false });

      if (supabaseError) {
        throw new Error(`Falha ao carregar dados: ${supabaseError.message}`);
      }

      if (data) {
        setEmbarcacoes(data as Embarcacao[]);
      } else {
        setEmbarcacoes([]);
      }
    } catch (err: any) {
      console.error("Erro na operação:", err);
      setError(err.message || "Ocorreu um erro inesperado.");
      setEmbarcacoes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmbarcacoes();
  }, []);

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!embarcacaoEditando || !embarcacaoEditando.id) {
      mostrarToast("Erro: ID da embarcação não encontrado.", "erro");
      return;
    }

    setSalvandoEdicao(true);
    try {
      const payload = {
        nome: embarcacaoEditando.nome?.trim() || "",
        tipo: embarcacaoEditando.tipo || null,
        capacidade: embarcacaoEditando.capacidade !== "" && embarcacaoEditando.capacidade !== undefined ? Number(embarcacaoEditando.capacidade) : null,
        marinheiro: embarcacaoEditando.marinheiro || null,
        motor: embarcacaoEditando.motor || null,
        situacao: embarcacaoEditando.situacao || null,
        status: embarcacaoEditando.status && embarcacaoEditando.status !== "Ativo" ? embarcacaoEditando.status : "Disponível",
      };

      const { data, error: updateError } = await supabase
        .from("embarcacoes")
        .update(payload)
        .eq("id", embarcacaoEditando.id)
        .select();

      if (updateError) {
        throw new Error(updateError.message);
      }

      setEmbarcacaoEditando(null);
      mostrarToast("Embarcação atualizada com sucesso!", "sucesso");
      await fetchEmbarcacoes();
    } catch (err: any) {
      console.error("Erro detalhado ao atualizar:", err);
      mostrarToast(`Erro ao atualizar: ${err.message || err}`, "erro");
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const handleExcluirConfirmado = async () => {
    if (!embarcacaoExcluindo || !embarcacaoExcluindo.id) return;

    setExcluindoItem(true);
    try {
      const { error: deleteError } = await supabase
        .from("embarcacoes")
        .delete()
        .eq("id", embarcacaoExcluindo.id);

      if (deleteError) throw deleteError;

      setEmbarcacaoExcluindo(null);
      mostrarToast("Embarcação excluída com sucesso!", "sucesso");
      await fetchEmbarcacoes();
    } catch (err: any) {
      mostrarToast(`Erro ao excluir: ${err.message}`, "erro");
    } finally {
      setExcluindoItem(false);
    }
  };

  const embarcacoesFiltradas = embarcacoes.filter((item) => {
    const atendeBusca = item.nome?.toLowerCase().includes(busca.toLowerCase());
    const atendeTipo = filtroTipo ? item.tipo === filtroTipo : true;
    const atendeStatus = filtroStatus ? item.status === filtroStatus : true;
    return atendeBusca && atendeTipo && atendeStatus;
  });

  const totalEmbarcacoes = embarcacoes.length;
  const emOperacao = embarcacoes.filter((e) => e.status === "Disponível" || e.status === "Reservada").length;
  const emManutencao = embarcacoes.filter((e) => e.status === "Manutenção").length;
  const disponiveis = embarcacoes.filter((e) => e.status === "Disponível").length;

  const handleCardClick = (statusFiltro: string) => {
    if (filtroStatus === statusFiltro) {
      setFiltroStatus(""); 
    } else {
      setFiltroStatus(statusFiltro);
    }
  };

  const cards = [
    { titulo: "Total", valor: loading ? "..." : String(totalEmbarcacoes), detalhe: "Cadastradas", cor: "border-l-emerald-500 text-emerald-100", statusFiltro: "" },
    { titulo: "Em Operação", valor: loading ? "..." : String(emOperacao), detalhe: "Ativas", cor: "border-l-sky-400 text-sky-100", statusFiltro: "Disponível" },
    { titulo: "Em Manutenção", valor: loading ? "..." : String(emManutencao), detalhe: "Reparos", cor: "border-l-amber-400 text-amber-100", statusFiltro: "Manutenção" },
    { titulo: "Disponíveis", valor: loading ? "..." : String(disponiveis), detalhe: "Prontas", cor: "border-l-emerald-400 text-emerald-100", statusFiltro: "Disponível" },
  ];

  const getStatusClasses = (status?: string) => {
    switch (status) {
      case "Disponível": return "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30";
      case "Reservada": return "bg-amber-950/60 text-amber-300 border border-amber-500/30";
      case "Manutenção": return "bg-rose-950/60 text-rose-300 border border-rose-500/30";
      default: return "bg-slate-800 text-slate-300 border border-slate-700";
    }
  };

  const getStatusDotClass = (status?: string) => {
    switch (status) {
      case "Disponível": return "bg-emerald-400";
      case "Reservada": return "bg-amber-400";
      case "Manutenção": return "bg-rose-400";
      default: return "bg-slate-400";
    }
  };

  return (
    <div className="min-h-screen bg-[#071f1a] text-slate-100 flex flex-col relative pb-16">
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-bounce">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-white font-medium text-sm ${toast.tipo === 'sucesso' ? 'bg-emerald-600' : 'bg-red-600'}`}>
            <span>{toast.tipo === 'sucesso' ? '✅' : '⚠️'}</span>
            <span>{toast.mensagem}</span>
          </div>
        </div>
      )}

      {/* HEADER HERO PADRONIZADO */}
      <div className="relative w-full bg-[#051713] py-16 px-6 text-white shadow-lg overflow-hidden flex flex-col justify-between md:px-12 border-b border-emerald-900/40">
        <div className="absolute inset-0 opacity-80 pointer-events-none">
          <div className="bg-cover bg-center h-full w-full" style={{ backgroundImage: `url('${BANNER_REGIONAL.modulos.matriz}')` }} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#071f1a] via-[#071f1a]/60 to-[#071f1a]/40 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto w-full flex justify-end z-10">
          
          <Link 
            href="/embarcacoes/novo" 
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25 shadow-sm select-none no-underline cursor-pointer"
            style={{ WebkitUserDrag: 'none' } as any}
          >
            <span className="leading-none text-base font-bold pointer-events-none mr-1.5">+</span>
            <span className="leading-none pointer-events-none">Nova Embarcação</span>
          </Link>

        </div>
        <div className="relative max-w-7xl mx-auto w-full z-10 pt-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-900/40 px-4 py-1.5 text-xs font-semibold text-emerald-200 backdrop-blur shadow-sm mb-2 select-none">
              Operação • Gestão da frota
            </div>
            <h1 className="text-3xl font-bold text-white drop-shadow-md md:text-4xl">Embarcações</h1>
            <p className="mt-1 text-emerald-100/80 text-sm drop-shadow-md font-medium">Gerencie barcos, lanchas e embarcações utilizadas nas operações turísticas.</p>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-900/40 px-5 py-2.5 text-xs font-semibold text-emerald-100 backdrop-blur shadow-sm select-none">
            {loading ? "..." : `${totalEmbarcacoes} ${totalEmbarcacoes === 1 ? 'embarcação cadastrada' : 'embarcações cadastradas'}`}
          </div>
        </div>
      </div>

      <div className="px-6 py-10 md:px-12 max-w-7xl mx-auto w-full flex-1 space-y-10">
        
        {/* CARDS DE MÉTRICAS (Fundo verde translúcido) */}
        <div className="grid gap-6 md:grid-cols-4">
          {cards.map((card) => {
            const isAtivo = card.statusFiltro === "" ? filtroStatus === "" : filtroStatus === card.statusFiltro;
            return (
              <div 
                key={card.titulo} 
                onClick={() => handleCardClick(card.statusFiltro)} 
                className={`rounded-2xl border-l-4 bg-[#0a2923]/70 backdrop-blur-md p-6 shadow-md border border-emerald-900/30 ${card.cor} transition cursor-pointer hover:shadow-lg hover:-translate-y-0.5 ${isAtivo ? 'ring-2 ring-emerald-400 bg-emerald-900/50' : ''}`}
              >
                <p className="text-sm font-medium text-emerald-200/70 select-none">{card.titulo}</p>
                <p className="mt-3 text-4xl font-bold text-white">{card.valor}</p>
                <p className="mt-2 text-xs font-semibold underline text-emerald-300">{card.detalhe}</p>
              </div>
            );
          })}
        </div>

        {/* BLOCO PRINCIPAL DA FROTA */}
        <div className="rounded-3xl border border-emerald-900/40 bg-[#0a2923]/60 backdrop-blur-md p-6 shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">
                Frota operacional {filtroStatus && <span className="text-sm font-normal text-emerald-200 bg-emerald-900/80 border border-emerald-700/50 px-3 py-1 rounded-full ml-2">Filtrando por: {filtroStatus}</span>}
              </h2>
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
              <input 
                type="text" 
                placeholder="Pesquisar nome..." 
                value={busca} 
                onChange={(e) => setBusca(e.target.value)} 
                className="rounded-xl border border-emerald-800/60 bg-[#041411]/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-emerald-500 focus:bg-[#041411] transition placeholder:text-emerald-300/40" 
              />
              <select 
                value={filtroTipo} 
                onChange={(e) => setFiltroTipo(e.target.value)} 
                className="rounded-xl border border-emerald-800/60 bg-[#041411]/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-emerald-500 focus:bg-[#041411] transition"
              >
                <option value="" className="bg-[#041411]">Todos os Tipos</option>
                <option value="Catamarã" className="bg-[#041411]">Catamarã</option>
                <option value="Lancha" className="bg-[#041411]">Lancha</option>
                <option value="Canoa" className="bg-[#041411]">Canoa</option>
                <option value="Barco" className="bg-[#041411]">Barco</option>
              </select>
              <select 
                value={filtroStatus} 
                onChange={(e) => setFiltroStatus(e.target.value)} 
                className="rounded-xl border border-emerald-800/60 bg-[#041411]/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-emerald-500 focus:bg-[#041411] transition"
              >
                <option value="" className="bg-[#041411]">Todos os Status</option>
                <option value="Disponível" className="bg-[#041411]">Disponível</option>
                <option value="Reservada" className="bg-[#041411]">Reservada</option>
                <option value="Manutenção" className="bg-[#041411]">Manutenção</option>
              </select>
            </div>
          </div>

          <div className="mt-8 overflow-x-auto min-h-[300px]">
            {loading ? (
              <div className="p-12 text-center text-emerald-200/60 font-medium text-sm">Carregando frota com segurança...</div>
            ) : error ? (
              <div className="p-12 text-center text-rose-300 font-medium bg-rose-950/40 rounded-xl border border-rose-900/50 text-sm">{error}</div>
            ) : embarcacoesFiltradas.length === 0 ? (
              <div className="p-12 text-center text-emerald-200/60 font-medium text-sm">Nenhuma embarcação encontrada.</div>
            ) : (
              <table className="min-w-[1200px] w-full text-left border-collapse">
                <thead className="bg-[#051713]/80 border-b border-emerald-900/60 text-emerald-200/80 text-xs font-bold tracking-wider select-none">
                  <tr>
                    <th className="px-5 py-3.5 rounded-tl-xl">NOME</th>
                    <th className="px-5 py-3.5">TIPO</th>
                    <th className="px-5 py-3.5">CAPACIDADE</th>
                    <th className="px-5 py-3.5">MARINHEIRO</th>
                    <th className="px-5 py-3.5">MOTOR</th>
                    <th className="px-5 py-3.5">SITUAÇÃO</th>
                    <th className="px-5 py-3.5">STATUS</th>
                    <th className="px-5 py-3.5 text-center rounded-tr-xl">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/30 text-sm">
                  {embarcacoesFiltradas.map((embarcacao, idx) => {
                    const statusExibido = embarcacao.status && embarcacao.status !== "Ativo" ? embarcacao.status : "Disponível";
                    return (
                      <tr key={embarcacao.id || idx} className="bg-transparent hover:bg-emerald-950/30 transition">
                        <td className="px-5 py-4 font-semibold text-white">{embarcacao.nome}</td>
                        <td className="px-5 py-4 text-emerald-100/80">{embarcacao.tipo || '—'}</td>
                        <td className="px-5 py-4 text-emerald-100/80">{embarcacao.capacidade !== undefined && embarcacao.capacidade !== null ? `${embarcacao.capacidade} pax` : '—'}</td>
                        <td className="px-5 py-4 text-emerald-100/80">{embarcacao.marinheiro || '—'}</td>
                        <td className="px-5 py-4 text-emerald-100/80">{embarcacao.motor || '—'}</td>
                        <td className="px-5 py-4 text-emerald-100/80">{embarcacao.situacao || '—'}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold select-none ${getStatusClasses(statusExibido)}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${getStatusDotClass(statusExibido)}`} />
                            {statusExibido}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => setEmbarcacaoVisualizando(embarcacao)} className="p-1.5 bg-emerald-900/40 hover:bg-emerald-900 text-emerald-200 rounded-lg transition cursor-pointer border border-emerald-700/40" title="Visualizar">👁</button>
                            <button onClick={() => setEmbarcacaoEditando(embarcacao)} className="p-1.5 bg-sky-950/40 hover:bg-sky-900 text-sky-200 rounded-lg transition cursor-pointer border border-sky-800/40" title="Editar">✎</button>
                            <button onClick={() => setEmbarcacaoExcluindo(embarcacao)} className="p-1.5 bg-rose-950/40 hover:bg-rose-900 text-rose-200 rounded-lg transition cursor-pointer border border-rose-800/40" title="Excluir">🗑</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE VISUALIZAR */}
      {embarcacaoVisualizando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#071f1a] border border-emerald-900/60 p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-emerald-900/50 pb-3">
              <h3 className="text-base font-bold text-white">Detalhes da Embarcação</h3>
              <button onClick={() => setEmbarcacaoVisualizando(null)} className="text-emerald-300/60 hover:text-white text-sm font-bold cursor-pointer">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <span className="text-emerald-300/60 block text-xs font-medium">Nome</span>
                <span className="text-white font-bold">{embarcacaoVisualizando.nome}</span>
              </div>
              <div>
                <span className="text-emerald-300/60 block text-xs font-medium">Tipo</span>
                <span className="text-emerald-100 font-medium">{embarcacaoVisualizando.tipo || '—'}</span>
              </div>
              <div>
                <span className="text-emerald-300/60 block text-xs font-medium">Capacidade</span>
                <span className="text-emerald-100 font-medium">{embarcacaoVisualizando.capacidade ? `${embarcacaoVisualizando.capacidade} pax` : '—'}</span>
              </div>
              <div>
                <span className="text-emerald-300/60 block text-xs font-medium">Marinheiro</span>
                <span className="text-emerald-100 font-medium">{embarcacaoVisualizando.marinheiro || '—'}</span>
              </div>
              <div>
                <span className="text-emerald-300/60 block text-xs font-medium">Motor</span>
                <span className="text-emerald-100 font-medium">{embarcacaoVisualizando.motor || '—'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-emerald-300/60 block text-xs font-medium">Situação</span>
                <span className="text-emerald-100 font-medium">{embarcacaoVisualizando.situacao || '—'}</span>
              </div>
              <div className="col-span-2 pt-2 border-t border-emerald-900/50">
                <span className="text-emerald-300/60 block text-xs font-medium">Status</span>
                <span className="text-emerald-400 font-bold">{embarcacaoVisualizando.status && embarcacaoVisualizando.status !== "Ativo" ? embarcacaoVisualizando.status : 'Disponível'}</span>
              </div>
            </div>
            <div className="flex justify-end pt-3">
              <button onClick={() => setEmbarcacaoVisualizando(null)} className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer select-none">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDITAR */}
      {embarcacaoEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#071f1a] border border-emerald-900/60 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between border-b border-emerald-900/50 pb-3">
              <h3 className="text-base font-bold text-white">Editar Embarcação</h3>
              <button onClick={() => setEmbarcacaoEditando(null)} className="text-emerald-300/60 hover:text-white text-sm font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSalvarEdicao} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-emerald-200/80 mb-1">Nome</label>
                <input type="text" value={embarcacaoEditando.nome} onChange={(e) => setEmbarcacaoEditando({...embarcacaoEditando, nome: e.target.value})} className="w-full rounded-xl border border-emerald-800 bg-[#041411] px-3 py-2 outline-none focus:border-emerald-500 text-sm text-white" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-200/80 mb-1">Tipo</label>
                  <input type="text" value={embarcacaoEditando.tipo || ''} onChange={(e) => setEmbarcacaoEditando({...embarcacaoEditando, tipo: e.target.value})} className="w-full rounded-xl border border-emerald-800 bg-[#041411] px-3 py-2 outline-none focus:border-emerald-500 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-200/80 mb-1">Capacidade</label>
                  <input type="number" value={embarcacaoEditando.capacidade || ''} onChange={(e) => setEmbarcacaoEditando({...embarcacaoEditando, capacidade: e.target.value})} className="w-full rounded-xl border border-emerald-800 bg-[#041411] px-3 py-2 outline-none focus:border-emerald-500 text-sm text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-200/80 mb-1">Marinheiro</label>
                  <input type="text" value={embarcacaoEditando.marinheiro || ''} onChange={(e) => setEmbarcacaoEditando({...embarcacaoEditando, marinheiro: e.target.value})} className="w-full rounded-xl border border-emerald-800 bg-[#041411] px-3 py-2 outline-none focus:border-emerald-500 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-200/80 mb-1">Motor</label>
                  <input type="text" value={embarcacaoEditando.motor || ''} onChange={(e) => setEmbarcacaoEditando({...embarcacaoEditando, motor: e.target.value})} className="w-full rounded-xl border border-emerald-800 bg-[#041411] px-3 py-2 outline-none focus:border-emerald-500 text-sm text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-emerald-200/80 mb-1">Situação</label>
                <input type="text" value={embarcacaoEditando.situacao || ''} onChange={(e) => setEmbarcacaoEditando({...embarcacaoEditando, situacao: e.target.value})} className="w-full rounded-xl border border-emerald-800 bg-[#041411] px-3 py-2 outline-none focus:border-emerald-500 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-emerald-200/80 mb-1">Status</label>
                <select 
                  value={embarcacaoEditando.status && embarcacaoEditando.status !== "Ativo" ? embarcacaoEditando.status : 'Disponível'} 
                  onChange={(e) => setEmbarcacaoEditando({...embarcacaoEditando, status: e.target.value})} 
                  className="w-full rounded-xl border border-emerald-800 bg-[#041411] px-3 py-2 outline-none focus:border-emerald-500 text-sm text-white"
                >
                  <option value="Disponível" className="bg-[#041411]">Disponível</option>
                  <option value="Reservada" className="bg-[#041411]">Reservada</option>
                  <option value="Manutenção" className="bg-[#041411]">Manutenção</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-emerald-900/50">
                <button type="button" onClick={() => setEmbarcacaoEditando(null)} className="px-4 py-2 rounded-xl border border-emerald-800 text-emerald-200 hover:bg-emerald-900/40 font-semibold text-xs transition cursor-pointer select-none">
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoEdicao} className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs transition shadow-sm cursor-pointer select-none disabled:opacity-50">
                  {salvandoEdicao ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EXCLUIR */}
      {embarcacaoExcluindo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#071f1a] border border-emerald-900/60 p-6 shadow-2xl space-y-4 text-center text-slate-100">
            <div className="w-10 h-10 bg-rose-950/60 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-800/40">
              <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-white">Excluir Embarcação</h3>
            <p className="text-xs text-emerald-200/70">
              Tem certeza que deseja excluir a embarcação <span className="font-bold text-white">{embarcacaoExcluindo.nome}</span>? Esta ação não poderá ser desfeita.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button onClick={() => setEmbarcacaoExcluindo(null)} className="px-4 py-2 rounded-xl border border-emerald-800 text-emerald-200 hover:bg-emerald-900/40 font-semibold text-xs transition cursor-pointer select-none">
                Cancelar
              </button>
              <button onClick={handleExcluirConfirmado} disabled={excluindoItem} className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs transition shadow-sm cursor-pointer select-none disabled:opacity-50">
                {excluindoItem ? "Excluindo..." : "Sim, Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { BANNER_REGIONAL } from "@/lib/bannerImagens";

interface Cliente {
  id?: string | number;
  nome: string;
  documento?: string;
  telefone?: string;
  email?: string;
  cidade?: string;
  nacionalidade?: string;
  situacao?: string;
  situação?: string;
  created_at?: string;
  observacoes?: string;
}

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("");

  // Estados para o Modal de Visualização (Olhinho)
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);

  // Estados para o Modal Customizado de Exclusão (Lixeira)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [idParaExcluir, setIdParaExcluir] = useState<string | number | null>(null);

  const fetchClientes = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("⚠️ [Clientes]: Erro ao carregar registros:", error.message);
      } else if (data) {
        const clientesFormatados = data.map((item: any) => ({
          ...item,
          situacao: item.situacao || item.situação || "Ativo",
        }));
        setClientes(clientesFormatados);
      }
    } catch (err) {
      console.warn("⚠️ [Clientes]: Falha na requisição de rede:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const clientesFiltrados = clientes.filter((c) => {
    const termo = busca.toLowerCase();
    const atendeBusca =
      c.nome?.toLowerCase().includes(termo) ||
      c.documento?.toLowerCase().includes(termo) ||
      c.email?.toLowerCase().includes(termo) ||
      c.cidade?.toLowerCase().includes(termo);

    const situacaoAtual = c.situacao || "Ativo";
    const atendeSituacao = filtroSituacao ? situacaoAtual.toLowerCase() === filtroSituacao.toLowerCase() : true;

    return atendeBusca && atendeSituacao;
  });

  const totalClientes = clientes.length;
  const ativos = clientes.filter((c) => (c.situacao || "Ativo").toLowerCase() === "ativo").length;
  const inativos = clientes.filter((c) => (c.situacao || "").toLowerCase() === "inativo").length;

  const handleCardClick = (statusFiltro: string) => {
    if (filtroSituacao === statusFiltro) {
      setFiltroSituacao('');
    } else {
      setFiltroSituacao(statusFiltro);
    }
  };

  const abrirVisualizacao = (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    setModalVisualizarAberto(true);
  };

  const confirmarExclusao = (id: string | number | undefined) => {
    if (!id) return;
    setIdParaExcluir(id);
    setModalExcluirAberto(true);
  };

  const executarExclusao = async () => {
    if (!idParaExcluir) return;

    try {
      const { error } = await supabase.from('clientes').delete().eq('id', idParaExcluir);
      if (error) throw error;
      setClientes(clientes.filter((c) => c.id !== idParaExcluir));
      setModalExcluirAberto(false);
      setIdParaExcluir(null);
    } catch (err: any) {
      alert('Erro ao excluir cliente: ' + err.message);
    }
  };

  const cards = [
    {
      titulo: "Total de Clientes",
      valor: loading ? "..." : String(totalClientes),
      detalhe: "Cadastrados na base",
      cor: "border-l-4 border-l-blue-400 text-white",
      situacaoFiltro: "",
    },
    {
      titulo: "Clientes Ativos",
      valor: loading ? "..." : String(ativos),
      detalhe: "Com cadastro regular (Filtrar)",
      cor: "border-l-4 border-l-emerald-400 text-white",
      situacaoFiltro: "Ativo",
    },
    {
      titulo: "Inativos / Bloqueados",
      valor: loading ? "..." : String(inativos),
      detalhe: "Pendente de atenção (Filtrar)",
      cor: "border-l-4 border-l-amber-400 text-white",
      situacaoFiltro: "Inativo",
    },
  ];

  return (
    <div className="min-h-screen bg-[#071f1a] text-slate-800 flex flex-col selection:bg-emerald-500 selection:text-white">
      
      {/* Hero Banner */}
      <div 
        className="relative bg-cover bg-center h-[360px] px-8 text-white flex flex-col justify-end pb-8 shadow-2xl overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(7, 31, 26, 0.15) 20%, rgba(7, 31, 26, 0.98) 100%), url('${BANNER_REGIONAL.modulos.clientes}')`,
        }}
      >
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold tracking-widest uppercase mb-1 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Gestão Operacional • Carteira de Clientes
            </span>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-lg">
              Clientes Cadastrados
            </h1>
            <p className="text-emerald-100/95 text-sm md:text-base font-medium drop-shadow-md max-w-2xl leading-relaxed">
              Gerencie informações, contatos e histórico dos clientes da sua operação turística em <span className="text-emerald-300 font-semibold">Barcelos, Capital do Tucunaré</span>.
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
        
          {/* Cards Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {cards.map((card) => {
              const isAtivo = card.situacaoFiltro !== '' && filtroSituacao === card.situacaoFiltro;
              return (
                <div
                  key={card.titulo}
                  onClick={() => card.situacaoFiltro && handleCardClick(card.situacaoFiltro)}
                  className={`bg-[#041c17] rounded-2xl p-6 shadow-xl border border-emerald-900/60 ${card.cor} transition-all duration-200 ${
                    card.situacaoFiltro ? 'cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:border-emerald-700/80' : ''
                  } ${isAtivo ? 'ring-2 ring-emerald-400 bg-[#062923]' : ''}`}
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-400/80">{card.titulo}</p>
                  <p className="mt-4 text-3xl md:text-4xl font-extrabold text-white tracking-tight">{card.valor}</p>
                  <p className={`mt-2 text-xs font-medium ${card.situacaoFiltro ? 'underline text-emerald-300' : 'text-emerald-300/80'}`}>
                    {card.detalhe}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Tabela + Filtros */}
          <div className="bg-[#041c17] rounded-3xl border border-emerald-900/60 p-6 shadow-xl text-slate-100">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-emerald-900/50 pb-6">
              <div className="flex-1">
                <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  Base de Clientes {filtroSituacao && <span className="text-xs font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-700/50 px-3 py-1 rounded-full">Filtrando por: {filtroSituacao}</span>}
                </h2>
                <p className="mt-1 text-xs text-emerald-200/80">
                  Consulte por nome, CPF/documento, e-mail ou cidade em tempo real.
                </p>
              </div>

              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  type="text"
                  placeholder="Pesquisar cliente..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="rounded-xl border border-emerald-900/60 bg-[#072a25] px-4 py-2.5 text-xs text-white placeholder-emerald-300/50 outline-none focus:border-emerald-500"
                />

                <select
                  value={filtroSituacao}
                  onChange={(e) => setFiltroSituacao(e.target.value)}
                  className="rounded-xl border border-emerald-900/60 bg-[#072a25] px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
                >
                  <option value="">Todas as Situações</option>
                  <option value="Ativo">Ativos</option>
                  <option value="Inativo">Inativos</option>
                </select>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto min-h-[300px]">
              {loading ? (
                <div className="p-12 text-center text-emerald-400 font-medium">
                  Carregando clientes do banco de dados...
                </div>
              ) : clientesFiltrados.length === 0 ? (
                <div className="p-12 text-center text-emerald-300/70 font-medium">
                  Nenhum cliente encontrado com os filtros selecionados.
                </div>
              ) : (
                <table className="min-w-[1000px] w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-emerald-900/60 text-emerald-400 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 font-bold">Nome Completo</th>
                      <th className="px-4 py-3 font-bold">Documento</th>
                      <th className="px-4 py-3 font-bold">Telefone</th>
                      <th className="px-4 py-3 font-bold">E-mail</th>
                      <th className="px-4 py-3 font-bold">Cidade</th>
                      <th className="px-4 py-3 font-bold">Situação</th>
                      <th className="px-4 py-3 font-bold text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-950/60">
                    {clientesFiltrados.map((cliente, idx) => (
                      <tr key={cliente.id || idx} className="hover:bg-[#072a25]/50 transition-colors">
                        <td className="px-4 py-3.5 text-xs font-semibold text-white">
                          {cliente.nome}
                        </td>
                        <td className="px-4 py-3.5 text-xs font-mono text-emerald-200/80">
                          {cliente.documento || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-emerald-200/80">
                          {cliente.telefone || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-emerald-200/80">
                          {cliente.email || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-emerald-200/80">
                          {cliente.cidade || "—"}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                              (cliente.situacao || "").toLowerCase() === "inativo"
                                ? "bg-rose-950/60 text-rose-300 border border-rose-800/50"
                                : "bg-emerald-950/60 text-emerald-300 border border-emerald-800/50"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                (cliente.situacao || "").toLowerCase() === "inativo" ? "bg-rose-400" : "bg-emerald-400"
                              }`}
                            />
                            {cliente.situacao || "Ativo"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => abrirVisualizacao(cliente)}
                              title="Ver Detalhes / Observações"
                              className="p-1.5 bg-[#072a25] hover:bg-emerald-900/60 text-emerald-300 rounded-lg transition border border-emerald-700/30 cursor-pointer"
                            >
                              👁️
                            </button>
                            <Link
                              href={`/clientes/editar/${cliente.id}`}
                              title="Editar Cliente"
                              className="p-1.5 bg-[#072a25] hover:bg-blue-900/60 text-blue-300 rounded-lg transition border border-blue-700/30 cursor-pointer"
                            >
                              ✏️
                            </Link>
                            <button
                              onClick={() => confirmarExclusao(cliente.id)}
                              title="Excluir Cliente"
                              className="p-1.5 bg-[#072a25] hover:bg-rose-900/60 text-rose-300 rounded-lg transition border border-rose-700/30 cursor-pointer"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
      </div>

      {/* Modal de Visualização / Observações */}
      {modalVisualizarAberto && clienteSelecionado && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#041c17] rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-emerald-900/80 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-900/60 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>👤</span> Detalhes do Cliente
              </h3>
              <button
                onClick={() => setModalVisualizarAberto(false)}
                className="text-emerald-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-emerald-400/70 block text-[10px] font-semibold uppercase tracking-wider">Nome Completo</span>
                <span className="text-white font-medium text-sm">{clienteSelecionado.nome}</span>
              </div>
              <div>
                <span className="text-emerald-400/70 block text-[10px] font-semibold uppercase tracking-wider">Documento / CPF</span>
                <span className="text-white font-mono">{clienteSelecionado.documento || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-emerald-400/70 block text-[10px] font-semibold uppercase tracking-wider">Telefone</span>
                <span className="text-white">{clienteSelecionado.telefone || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-emerald-400/70 block text-[10px] font-semibold uppercase tracking-wider">E-mail</span>
                <span className="text-white">{clienteSelecionado.email || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-emerald-400/70 block text-[10px] font-semibold uppercase tracking-wider">Cidade</span>
                <span className="text-white">{clienteSelecionado.cidade || 'Não informada'}</span>
              </div>
              <div>
                <span className="text-emerald-400/70 block text-[10px] font-semibold uppercase tracking-wider">Situação</span>
                <span className="text-white">{clienteSelecionado.situacao || 'Ativo'}</span>
              </div>
            </div>
            <div>
              <span className="text-emerald-400/70 block text-[10px] font-semibold uppercase tracking-wider mb-1">Observações / Histórico</span>
              <p className="text-emerald-100/90 text-xs bg-[#072a25] p-3 rounded-xl border border-emerald-900/60 min-h-[60px] leading-relaxed">
                {clienteSelecionado.observacoes || 'Nenhuma observação registrada para este cliente.'}
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setModalVisualizarAberto(false)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {modalExcluirAberto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#041c17] rounded-2xl shadow-2xl max-w-md w-full p-6 border border-emerald-900/80 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-950/80 text-rose-400 border border-rose-800/50 rounded-full flex items-center justify-center mx-auto text-xl shadow-inner">
              ⚠️
            </div>
            <h3 className="text-base font-bold text-white">
              Confirmar Exclusão
            </h3>
            <p className="text-emerald-200/80 text-xs leading-relaxed">
              Deseja realmente excluir este cliente do sistema? Esta ação é definitiva e não poderá ser desfeita.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setModalExcluirAberto(false)}
                className="flex-1 bg-[#072a25] hover:bg-[#0e433b] text-emerald-200 text-xs font-semibold py-2.5 rounded-xl transition border border-emerald-700/30 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={executarExclusao}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold py-2.5 rounded-xl transition shadow-md cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
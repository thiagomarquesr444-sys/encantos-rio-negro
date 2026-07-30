'use client';

import React, { useEffect, useState, MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BANNER_REGIONAL } from "@/lib/bannerImagens";

interface Passeio {
  id?: string;
  nome: string;
  categoria?: string;
  duracao?: string;
  preco?: number | string;
  vagas?: number | string;
  descricao?: string;
  created_at?: string;
}

export default function PasseiosPage() {
  const router = useRouter();
  const [passeios, setPasseios] = useState<Passeio[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  // Estado para o modal de visualização / edição rápida
  const [passeioSelecionado, setPasseioSelecionado] = useState<Passeio | null>(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const fetchPasseios = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("passeios")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar passeios:", error.message);
      } else if (data) {
        setPasseios(data as Passeio[]);
      }
    } catch (err) {
      console.error("Erro de conexão com o Supabase:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasseios();
  }, []);

  const mostrarMensagem = (msg: string) => {
    setMensagemSucesso(msg);
    setTimeout(() => {
      setMensagemSucesso("");
    }, 3000);
  };

  const formatarPrecoExibicao = (preco?: number | string) => {
    if (preco === undefined || preco === null) return "R$ 0,00";
    let valorNum = Number(String(preco).replace(',', '.'));
    if (isNaN(valorNum)) return "R$ 0,00";

    if (valorNum > 0 && valorNum < 1000) {
      valorNum = valorNum * 1000;
    }

    return valorNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Excluir passeio
  const handleExcluir = async (id?: string) => {
    if (!id) return;
    if (!confirm("Tem certeza que deseja excluir este passeio?")) return;

    try {
      const { error } = await supabase.from("passeios").delete().eq("id", id);
      if (error) throw error;
      mostrarMensagem("Passeio excluído com sucesso!");
      fetchPasseios();
    } catch (err: any) {
      alert("Erro ao excluir: " + err.message);
    }
  };

  // Salvar edição rápida corrigindo o bug do input number travado em 0
  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passeioSelecionado?.id) return;

    setSalvando(true);
    try {
      const precoNumerico = passeioSelecionado.preco === '' || passeioSelecionado.preco === undefined ? 0 : Number(String(passeioSelecionado.preco).replace(',', '.'));
      const vagasNumericas = passeioSelecionado.vagas === '' || passeioSelecionado.vagas === undefined ? 0 : Number(passeioSelecionado.vagas);

      const { error } = await supabase
        .from("passeios")
        .update({
          nome: passeioSelecionado.nome,
          categoria: passeioSelecionado.categoria,
          duracao: passeioSelecionado.duracao,
          preco: isNaN(precoNumerico) ? 0 : precoNumerico,
          vagas: isNaN(vagasNumericas) ? 0 : vagasNumericas,
          descricao: passeioSelecionado.descricao,
        })
        .eq("id", passeioSelecionado.id);

      if (error) throw error;

      mostrarMensagem("Passeio atualizado com sucesso!");
      setPasseioSelecionado(null);
      setModoEdicao(false);
      fetchPasseios();
    } catch (err: any) {
      alert("Erro ao atualizar: " + err.message);
    } finally {
      setSalvando(false);
    }
  };

  // Filtros dinâmicos combinados com a categoria dos cards
  const passeiosFiltrados = passeios.filter((p) => {
    const termo = busca.toLowerCase();
    const atendeBusca =
      p.nome?.toLowerCase().includes(termo) ||
      p.categoria?.toLowerCase().includes(termo);

    const atendeCategoria = filtroCategoria 
      ? (p.categoria || "").toLowerCase() === filtroCategoria.toLowerCase() 
      : true;

    return atendeBusca && atendeCategoria;
  });

  // Métricas para os cards interativos
  const totalPasseios = passeios.length;
  const totalVagas = passeios.reduce((acc, curr) => acc + (Number(curr.vagas) || 0), 0);
  const categoriasUnicas = Array.from(new Set(passeios.map((p) => p.categoria).filter(Boolean)));
  
  const precoMedio = totalPasseios > 0 
    ? (passeios.reduce((acc, curr) => {
        let pVal = Number(String(curr.preco || 0).replace(',', '.'));
        if (pVal > 0 && pVal < 1000) pVal = pVal * 1000;
        return acc + pVal;
      }, 0) / totalPasseios)
    : 0;

  const handleCardClick = (tipoFiltro: string, valorFiltro: string) => {
    if (tipoFiltro === 'categoria') {
      if (filtroCategoria === valorFiltro) {
        setFiltroCategoria('');
      } else {
        setFiltroCategoria(valorFiltro);
      }
    } else {
      setFiltroCategoria('');
    }
  };

  const cards = [
    {
      titulo: "Total de Passeios",
      valor: loading ? "..." : String(totalPasseios),
      detalhe: "Clique para exibir todos",
      cor: "border-l-4 border-l-emerald-400 text-white",
      tipoFiltro: "geral",
      valorFiltro: "",
    },
    {
      titulo: "Vagas Disponíveis",
      valor: loading ? "..." : String(totalVagas),
      detalhe: "Capacidade total",
      cor: "border-l-4 border-l-teal-400 text-white",
      tipoFiltro: "geral",
      valorFiltro: "",
    },
    {
      titulo: "Preço Médio",
      valor: loading ? "..." : precoMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      detalhe: "Valor por pessoa",
      cor: "border-l-4 border-l-sky-400 text-white",
      tipoFiltro: "geral",
      valorFiltro: "",
    },
    {
      titulo: "Categorias",
      valor: loading ? "..." : String(categoriasUnicas.length),
      detalhe: "Clique para filtrar por categoria",
      cor: "border-l-4 border-l-purple-400 text-white",
      tipoFiltro: "categoria",
      valorFiltro: categoriasUnicas[0] || "",
    },
  ];

  return (
    <div className="min-h-screen bg-[#071f1a] text-slate-800 flex flex-col selection:bg-emerald-500 selection:text-white pb-16">
      
      {/* Toast Flutuante Moderno no Topo */}
      {mensagemSucesso && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-emerald-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-emerald-500 animate-bounce">
          <span className="text-xl">✅</span>
          <span className="font-semibold text-sm tracking-wide">{mensagemSucesso}</span>
        </div>
      )}

      {/* Hero Banner Superior */}
      <div 
        className="relative h-[360px] w-full overflow-hidden bg-cover bg-center shadow-2xl"
        style={{
          backgroundImage: `linear-gradient(rgba(7, 31, 26, 0.15) 20%, rgba(7, 31, 26, 0.98) 100%), url('${BANNER_REGIONAL.modulos.cafedaamazonia}')`,
        }}
      >
        <div className="max-w-7xl mx-auto w-full h-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 px-8 relative z-10">
          <div className="space-y-1.5 text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold tracking-widest uppercase mb-1 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Roteiros & Turismo • Gestão de Catálogo
            </span>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-lg">
              Passeios Cadastrados
            </h1>
            <p className="text-emerald-100/95 text-sm md:text-base font-medium drop-shadow-md max-w-2xl leading-relaxed">
              Gerencie roteiros, preços e capacidade de vagas oferecidas pela operadora em <span className="text-emerald-300 font-semibold">Barcelos, Capital do Tucunaré</span>.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={fetchPasseios}
              className="inline-flex items-center gap-2 bg-[#072a25] hover:bg-emerald-900/60 text-emerald-200 font-semibold text-sm px-5 py-3 rounded-xl transition-all border border-emerald-700/30 cursor-pointer"
            >
              🔄 Sincronizar
            </button>
            <button
              onClick={() => router.push('/passeios/novo')}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-lg hover:shadow-emerald-900/50 transition-all border border-emerald-400/40 transform hover:-translate-y-0.5 cursor-pointer select-none"
              style={{ WebkitUserDrag: 'none' } as React.CSSProperties}
            >
              <span className="text-base font-bold">+</span> Novo Passeio
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto w-full -mt-6 z-10 flex-1 space-y-6">
        
          {/* Cards Resumo Estilizados e Interativos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((card) => {
              const isAtivo = card.tipoFiltro === 'categoria' 
                ? (card.valorFiltro !== '' && filtroCategoria === card.valorFiltro)
                : false;

              return (
                <div
                  key={card.titulo}
                  onClick={() => handleCardClick(card.tipoFiltro, card.valorFiltro)}
                  className={`bg-[#041c17] rounded-2xl p-6 shadow-xl border border-emerald-900/60 ${card.cor} transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:border-emerald-700/80 ${
                    isAtivo ? 'ring-2 ring-emerald-400 bg-[#062923]' : ''
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-400/80">{card.titulo}</p>
                  <p className="mt-4 text-2xl lg:text-3xl font-extrabold text-white tracking-tight truncate">{card.valor}</p>
                  <p className="mt-2 text-xs font-medium underline text-emerald-300">
                    {card.detalhe}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Tabela + Filtros Integrados */}
          <div className="bg-[#041c17] rounded-3xl border border-emerald-900/60 p-6 shadow-xl text-slate-100">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-emerald-900/50 pb-6">
              <div className="flex-1">
                <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  Catálogo de Passeios {filtroCategoria && <span className="text-xs font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-700/50 px-3 py-1 rounded-full">Filtrando por: {filtroCategoria}</span>}
                </h2>
                <p className="mt-1 text-xs text-emerald-200/80">
                  Pesquise por nome do passeio ou categoria em tempo real.
                </p>
              </div>

              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  type="text"
                  placeholder="Pesquisar passeio..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="rounded-xl border border-emerald-900/60 bg-[#072a25] px-4 py-2.5 text-xs text-white placeholder-emerald-300/50 outline-none focus:border-emerald-500"
                />

                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="rounded-xl border border-emerald-900/60 bg-[#072a25] px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
                >
                  <option value="">Todas as Categorias</option>
                  {categoriasUnicas.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto min-h-[300px]">
              {loading ? (
                <div className="p-12 text-center text-emerald-400 font-medium">
                  Carregando passeios do banco de dados...
                </div>
              ) : passeiosFiltrados.length === 0 ? (
                <div className="p-12 text-center text-emerald-300/70 font-medium">
                  Nenhum passeio encontrado com os filtros selecionados.
                </div>
              ) : (
                <table className="min-w-[900px] w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-emerald-900/60 text-emerald-400 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 font-bold">Nome do Passeio</th>
                      <th className="px-4 py-3 font-bold">Categoria</th>
                      <th className="px-4 py-3 font-bold">Duração</th>
                      <th className="px-4 py-3 font-bold">Preço</th>
                      <th className="px-4 py-3 font-bold text-center">Vagas</th>
                      <th className="px-4 py-3 font-bold text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-950/60">
                    {passeiosFiltrados.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-[#072a25]/50 transition-colors">
                        <td className="px-4 py-3.5 text-xs font-semibold text-white">
                          {item.nome}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-emerald-200/80">
                          <span className="inline-block rounded-md bg-[#072a25] border border-emerald-700/30 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                            {item.categoria || "Geral"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-emerald-200/80">
                          {item.duracao || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-xs font-bold text-emerald-400">
                          {formatarPrecoExibicao(item.preco)}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center rounded-full bg-emerald-950/60 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 border border-emerald-800/50">
                            {item.vagas ?? 0} vagas
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Botão Visualizar */}
                            <button
                              title="Visualizar"
                              onClick={() => {
                                setPasseioSelecionado(item);
                                setModoEdicao(false);
                              }}
                              className="p-1.5 bg-[#072a25] hover:bg-emerald-900/60 text-emerald-300 rounded-lg transition border border-emerald-700/30 cursor-pointer"
                            >
                              👁️
                            </button>
                            {/* Botão Editar */}
                            <button
                              title="Editar"
                              onClick={() => {
                                setPasseioSelecionado(item);
                                setModoEdicao(true);
                              }}
                              className="p-1.5 bg-[#072a25] hover:bg-blue-900/60 text-blue-300 rounded-lg transition border border-blue-700/30 cursor-pointer"
                            >
                              ✏️
                            </button>
                            {/* Botão Excluir */}
                            <button
                              title="Excluir"
                              onClick={() => handleExcluir(item.id)}
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

      {/* Modal de Visualização / Edição Rápida */}
      {passeioSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#041c17] p-6 shadow-2xl border border-emerald-900/80 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-900/60 pb-3">
              <h3 className="text-base font-bold text-white">
                {modoEdicao ? "Editar Passeio" : "Detalhes do Passeio"}
              </h3>
              <button
                onClick={() => setPasseioSelecionado(null)}
                className="text-emerald-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {modoEdicao ? (
              <form onSubmit={handleSalvarEdicao} className="space-y-4 pt-1">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-400/70 mb-1">Nome</label>
                  <input
                    type="text"
                    value={passeioSelecionado.nome}
                    onChange={(e) => setPasseioSelecionado({ ...passeioSelecionado, nome: e.target.value })}
                    required
                    className="w-full rounded-xl border border-emerald-900/60 bg-[#072a25] px-4 py-2 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-400/70 mb-1">Categoria</label>
                    <input
                      type="text"
                      value={passeioSelecionado.categoria || ""}
                      onChange={(e) => setPasseioSelecionado({ ...passeioSelecionado, categoria: e.target.value })}
                      className="w-full rounded-xl border border-emerald-900/60 bg-[#072a25] px-4 py-2 text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-400/70 mb-1">Duração</label>
                    <input
                      type="text"
                      value={passeioSelecionado.duracao || ""}
                      onChange={(e) => setPasseioSelecionado({ ...passeioSelecionado, duracao: e.target.value })}
                      className="w-full rounded-xl border border-emerald-900/60 bg-[#072a25] px-4 py-2 text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-400/70 mb-1">Preço (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={passeioSelecionado.preco ?? ''}
                      onChange={(e) => setPasseioSelecionado({ ...passeioSelecionado, preco: e.target.value })}
                      className="w-full rounded-xl border border-emerald-900/60 bg-[#072a25] px-4 py-2 text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-400/70 mb-1">Vagas</label>
                    <input
                      type="number"
                      value={passeioSelecionado.vagas ?? ''}
                      onChange={(e) => setPasseioSelecionado({ ...passeioSelecionado, vagas: e.target.value })}
                      className="w-full rounded-xl border border-emerald-900/60 bg-[#072a25] px-4 py-2 text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-400/70 mb-1">Descrição</label>
                  <textarea
                    rows={3}
                    value={passeioSelecionado.descricao || ""}
                    onChange={(e) => setPasseioSelecionado({ ...passeioSelecionado, descricao: e.target.value })}
                    className="w-full rounded-xl border border-emerald-900/60 bg-[#072a25] px-4 py-2 text-xs text-white outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-emerald-900/60">
                  <button
                    type="button"
                    onClick={() => setPasseioSelecionado(null)}
                    className="rounded-xl bg-[#072a25] hover:bg-[#0e433b] px-5 py-2.5 text-xs font-semibold text-emerald-200 transition border border-emerald-700/30 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvando}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-2.5 text-xs font-semibold text-white shadow-lg transition disabled:opacity-50 cursor-pointer"
                  >
                    {salvando ? "Salvando..." : "Salvar Alterações"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 pt-1">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/70">Nome do Passeio</p>
                  <p className="text-sm font-bold text-white mt-0.5">{passeioSelecionado.nome}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/70">Categoria</p>
                    <p className="text-white mt-0.5 font-medium">{passeioSelecionado.categoria || "Geral"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/70">Duração</p>
                    <p className="text-white mt-0.5 font-medium">{passeioSelecionado.duracao || "—"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tag-wider text-emerald-400/70">Preço</p>
                    <p className="text-sm font-bold text-emerald-400 mt-0.5">{formatarPrecoExibicao(passeioSelecionado.preco)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/70">Vagas Disponíveis</p>
                    <p className="text-white mt-0.5 font-medium">{passeioSelecionado.vagas ?? 0} vagas</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/70">Descrição</p>
                  <p className="text-xs text-emerald-100/90 mt-1 bg-[#072a25] p-3 rounded-xl border border-emerald-900/60 leading-relaxed">{passeioSelecionado.descricao || "Nenhuma descrição informada."}</p>
                </div>
                <div className="flex justify-end pt-3 border-t border-emerald-900/60">
                  <button
                    onClick={() => setPasseioSelecionado(null)}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-2.5 text-xs font-semibold text-white transition cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
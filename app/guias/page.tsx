'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Guia {
  id?: string;
  nome?: string;
  Nome?: string;
  telefone?: string;
  idioma?: string;
  idiomas?: string;
  Idiomas?: string;
  especialidade?: string;
  Especialidade?: string;
  cadastur?: string;
  Cadastur?: string;
  status?: string;
  Status?: string;
  created_at?: string;
}

export default function GuiasPage() {
  const [guias, setGuias] = useState<Guia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  // Estados dos Modais
  const [itemVisualizar, setItemVisualizar] = useState<Guia | null>(null);
  const [itemEditar, setItemEditar] = useState<Guia | null>(null);
  const [itemExcluir, setItemExcluir] = useState<Guia | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  // Mensagem de Feedback
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const mostrarToast = (mensagem: string) => {
    setMensagemSucesso(mensagem);
    setTimeout(() => setMensagemSucesso(null), 4000);
  };

  const fetchGuias = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from('guias')
        .select('*')
        .order('created_at', { ascending: false });

      if (supabaseError) {
        throw new Error(`Falha ao carregar guias: ${supabaseError.message}`);
      }

      const dadosNormalizados = (data || []).map((item: any) => {
        const nomeFinal = item.nome || item.Nome || '';
        const telefoneFinal = item.telefone || item.Telefone || '';
        const idiomaFinal = item.idioma || item.Idiomas || item.idiomas || item.IDIOMAS || '';
        const especialidadeFinal = item.especialidade || item.Especialidade || item.cadastur || item.Cadastur || item.CADASTUR || '';
        const statusFinal = item.status || item.Status || 'Ativo';

        return {
          ...item,
          nome: nomeFinal,
          telefone: telefoneFinal,
          idioma: idiomaFinal,
          especialidade: especialidadeFinal,
          status: statusFinal,
        };
      });

      setGuias(dadosNormalizados);
    } catch (err: any) {
      console.error('Erro na operação:', err);
      setError(err.message || 'Ocorreu um erro inesperado.');
      setGuias([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuias();
  }, []);

  const salvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemEditar || !itemEditar.id) return;
    setSalvandoEdicao(true);
    setError(null);

    try {
      const nomeValor = itemEditar.nome || '';
      const telefoneValor = itemEditar.telefone || '';
      const idiomaValor = itemEditar.idioma || '';
      const especialidadeValor = itemEditar.especialidade || '';
      const statusValor = itemEditar.status || 'Ativo';

      const { error: updateError } = await supabase
        .from('guias')
        .update({
          Nome: nomeValor,
          telefone: telefoneValor,
          Idiomas: idiomaValor,
          Cadastur: especialidadeValor,
          Status: statusValor,
        })
        .eq('id', itemEditar.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setItemEditar(null);
      mostrarToast('Guia atualizado com sucesso!');
      fetchGuias();
    } catch (err: any) {
      console.error('Erro ao atualizar guia:', err);
      setError('Erro ao atualizar: ' + err.message);
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!itemExcluir || !itemExcluir.id) return;
    setExcluindo(true);

    try {
      const { error: deleteError } = await supabase
        .from('guias')
        .delete()
        .eq('id', itemExcluir.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setGuias((prev) => prev.filter((g) => g.id !== itemExcluir.id));
      setItemExcluir(null);
      mostrarToast('Guia excluído com sucesso!');
    } catch (err: any) {
      console.error('Erro ao excluir:', err);
      setError('Erro ao excluir registro: ' + err.message);
    } finally {
      setExcluindo(false);
    }
  };

  const guiasFiltrados = guias.filter((g) => {
    const termo = busca.toLowerCase();
    const nomeCompleto = g.nome || '';
    const idiomaCompleto = g.idioma || '';
    const especialidadeCompleta = g.especialidade || '';
    const statusAtual = g.status || 'Ativo';

    const atendeBusca =
      nomeCompleto.toLowerCase().includes(termo) ||
      idiomaCompleto.toLowerCase().includes(termo) ||
      especialidadeCompleta.toLowerCase().includes(termo);

    const atendeStatus = filtroStatus ? statusAtual.toLowerCase() === filtroStatus.toLowerCase() : true;

    return atendeBusca && atendeStatus;
  });

  const totalGuias = guias.length;
  const ativos = guias.filter((g) => (g.status || 'Ativo').toLowerCase() === 'ativo').length;
  const emTour = guias.filter((g) => {
    const st = (g.status || '').toLowerCase();
    return st.includes('tour') || st.includes('ocupado') || st.includes('férias');
  }).length;

  const handleCardClick = (statusFiltro: string) => {
    if (filtroStatus === statusFiltro) {
      setFiltroStatus('');
    } else {
      setFiltroStatus(statusFiltro);
    }
  };

  const getStatusClasses = (status?: string) => {
    const st = (status || 'Ativo').toLowerCase();
    switch (true) {
      case st.includes('inativo'):
        return 'bg-rose-950/60 text-rose-300 border border-rose-500/30';
      case st.includes('férias'):
        return 'bg-amber-950/60 text-amber-300 border border-amber-500/30';
      default:
        return 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30';
    }
  };

  const getStatusDotClass = (status?: string) => {
    const st = (status || 'Ativo').toLowerCase();
    switch (true) {
      case st.includes('inativo'):
        return 'bg-rose-400';
      case st.includes('férias'):
        return 'bg-amber-400';
      default:
        return 'bg-emerald-400';
    }
  };

  const cards = [
    {
      titulo: 'Total de Guias',
      valor: loading ? '...' : String(totalGuias),
      detalhe: 'Profissionais cadastrados',
      cor: 'border-l-emerald-500 text-emerald-100',
      statusFiltro: '',
    },
    {
      titulo: 'Disponíveis / Ativos',
      valor: loading ? '...' : String(ativos),
      detalhe: 'Disponíveis para escala',
      cor: 'border-l-sky-400 text-sky-100',
      statusFiltro: 'Ativo',
    },
    {
      titulo: 'Outros / Férias / Tour',
      valor: loading ? '...' : String(emTour),
      detalhe: 'Em atividade ou férias',
      cor: 'border-l-amber-400 text-amber-100',
      statusFiltro: 'Férias',
    },
  ];

  return (
    <div className="min-h-screen bg-[#071f1a] text-slate-100 flex flex-col relative pb-16">
      {mensagemSucesso && (
        <div className="fixed top-6 right-6 z-50 animate-bounce">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-white font-medium text-sm bg-emerald-600">
            <span>✅</span>
            <span>{mensagemSucesso}</span>
          </div>
        </div>
      )}

      {/* HEADER HERO COM CAMINHO CORRETO DA IMAGEM (/images/regiao/aracu.png.jpeg) */}
      <div className="relative w-full bg-[#051713] py-24 md:py-28 px-6 text-white shadow-lg overflow-hidden flex flex-col justify-between md:px-12 border-b border-emerald-900/45">
        <div className="absolute inset-0 opacity-85 pointer-events-none overflow-hidden">
          <img
            src="/images/regiao/aracu.png.jpeg"
            alt="Banner de Fundo Guias"
            className="w-full h-full object-cover object-center select-none pointer-events-none"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#071f1a] via-[#071f1a]/70 to-[#071f1a]/30 pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto w-full flex justify-end z-10">
          <Link 
            href="/guias/novo" 
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className="inline-flex items-center rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition select-none no-underline cursor-pointer border border-emerald-500/40"
            style={{ WebkitUserDrag: 'none' } as any}
          >
            <span className="leading-none text-base font-bold pointer-events-none mr-1.5">+</span>
            <span className="leading-none pointer-events-none">Novo Guia</span>
          </Link>
        </div>

        <div className="relative max-w-7xl mx-auto w-full z-10 pt-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-900/40 px-4 py-1.5 text-xs font-semibold text-emerald-200 backdrop-blur shadow-sm mb-2 select-none">
              🧭 Operação • Equipe de Guias
            </div>
            <h1 className="text-3xl font-bold text-white drop-shadow-md md:text-4xl">Guias Turísticos</h1>
            <p className="mt-1 text-emerald-100/80 text-sm drop-shadow-md font-medium">Gerencie a equipe de guias, especialidades, idiomas e escalas integradas ao banco de dados.</p>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-900/40 px-5 py-2.5 text-xs font-semibold text-emerald-100 backdrop-blur shadow-sm select-none">
            {loading ? '...' : `${totalGuias} ${totalGuias === 1 ? 'profissional cadastrado' : 'profissionais cadastrados'}`}
          </div>
        </div>
      </div>

      <div className="px-6 py-10 md:px-12 max-w-7xl mx-auto w-full flex-1 space-y-10">
        
        {/* CARDS DE MÉTRICAS */}
        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((card: { titulo: string; valor: string; detalhe: string; cor: string; statusFiltro: string }) => {
            const isAtivo = card.statusFiltro === '' ? filtroStatus === '' : filtroStatus === card.statusFiltro;
            return (
              <div 
                key={card.titulo} 
                onClick={() => card.statusFiltro && handleCardClick(card.statusFiltro)} 
                className={`rounded-2xl border-l-4 bg-[#0a2923]/70 backdrop-blur-md p-6 shadow-md border border-emerald-900/30 ${card.cor} transition ${card.statusFiltro ? 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5' : ''} ${isAtivo ? 'ring-2 ring-emerald-400 bg-emerald-900/50' : ''}`}
              >
                <p className="text-sm font-medium text-emerald-200/70 select-none">{card.titulo}</p>
                <p className="mt-3 text-4xl font-bold text-white">{card.valor}</p>
                <p className={`mt-2 text-xs font-semibold ${card.statusFiltro ? 'underline text-emerald-300' : 'text-emerald-200/60'}`}>{card.detalhe}</p>
              </div>
            );
          })}
        </div>

        {/* BLOCO PRINCIPAL */}
        <div className="rounded-3xl border border-emerald-900/40 bg-[#0a2923]/60 backdrop-blur-md p-6 shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">
                Equipe cadastrada {filtroStatus && <span className="text-sm font-normal text-emerald-200 bg-emerald-900/80 border border-emerald-700/50 px-3 py-1 rounded-full ml-2">Filtrando por: {filtroStatus}</span>}
              </h2>
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
              <input 
                type="text" 
                placeholder="Pesquisar guia..." 
                value={busca} 
                onChange={(e) => setBusca(e.target.value)} 
                className="rounded-xl border border-emerald-800/60 bg-[#041411]/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-emerald-500 focus:bg-[#041411] transition placeholder:text-emerald-300/40" 
              />
              <select 
                value={filtroStatus} 
                onChange={(e) => setFiltroStatus(e.target.value)} 
                className="rounded-xl border border-emerald-800/60 bg-[#041411]/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-emerald-500 focus:bg-[#041411] transition"
              >
                <option value="" className="bg-[#041411]">Todos os Status</option>
                <option value="Ativo" className="bg-[#041411]">Ativo</option>
                <option value="Inativo" className="bg-[#041411]">Inativo</option>
                <option value="Férias" className="bg-[#041411]">Férias</option>
                <option value="Em Tour" className="bg-[#041411]">Em Tour</option>
              </select>
            </div>
          </div>

          <div className="mt-8 overflow-x-auto min-h-[300px]">
            {loading ? (
              <div className="p-12 text-center text-emerald-200/60 font-medium text-sm">Carregando guias com segurança...</div>
            ) : error ? (
              <div className="p-12 text-center text-rose-300 font-medium bg-rose-950/40 rounded-xl border border-rose-900/50 text-sm">{error}</div>
            ) : guiasFiltrados.length === 0 ? (
              <div className="p-12 text-center text-emerald-200/60 font-medium text-sm">Nenhum guia encontrado.</div>
            ) : (
              <table className="min-w-[1000px] w-full text-left border-collapse">
                <thead className="bg-[#051713]/80 border-b border-emerald-900/60 text-emerald-200/80 text-xs font-bold tracking-wider select-none">
                  <tr>
                    <th className="px-5 py-3.5 rounded-tl-xl">NOME DO GUIA</th>
                    <th className="px-5 py-3.5">TELEFONE</th>
                    <th className="px-5 py-3.5">IDIOMA</th>
                    <th className="px-5 py-3.5">ESPECIALIDADE</th>
                    <th className="px-5 py-3.5">STATUS</th>
                    <th className="px-5 py-3.5 text-center rounded-tr-xl">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/30 text-sm">
                  {guiasFiltrados.map((item, idx) => {
                    const statusExibido = item.status || 'Ativo';
                    return (
                      <tr key={item.id || idx} className="bg-transparent hover:bg-emerald-950/30 transition">
                        <td className="px-5 py-4 font-semibold text-white">{item.nome || '—'}</td>
                        <td className="px-5 py-4 text-emerald-100/80">{item.telefone || '—'}</td>
                        <td className="px-5 py-4 text-emerald-100/80">{item.idioma || '—'}</td>
                        <td className="px-5 py-4 text-emerald-100/80">{item.especialidade || '—'}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold select-none ${getStatusClasses(statusExibido)}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${getStatusDotClass(statusExibido)}`} />
                            {statusExibido}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => setItemVisualizar(item)} className="p-1.5 bg-emerald-900/40 hover:bg-emerald-900 text-emerald-200 rounded-lg transition cursor-pointer border border-emerald-700/40" title="Visualizar">👁</button>
                            <button onClick={() => setItemEditar({ ...item })} className="p-1.5 bg-sky-950/40 hover:bg-sky-900 text-sky-200 rounded-lg transition cursor-pointer border border-sky-800/40" title="Editar">✎</button>
                            <button onClick={() => setItemExcluir(item)} className="p-1.5 bg-rose-950/40 hover:bg-rose-900 text-rose-200 rounded-lg transition cursor-pointer border border-rose-800/40" title="Excluir">🗑</button>
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
      {itemVisualizar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#071f1a] border border-emerald-900/60 p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-emerald-900/50 pb-3">
              <h3 className="text-base font-bold text-white">Detalhes do Guia</h3>
              <button onClick={() => setItemVisualizar(null)} className="text-emerald-300/60 hover:text-white text-sm font-bold cursor-pointer">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <span className="text-emerald-300/60 block text-xs font-medium">Nome do Guia</span>
                <span className="text-white font-bold text-base">{itemVisualizar.nome || '—'}</span>
              </div>
              <div>
                <span className="text-emerald-300/60 block text-xs font-medium">Telefone</span>
                <span className="text-emerald-100 font-medium">{itemVisualizar.telefone || '—'}</span>
              </div>
              <div>
                <span className="text-emerald-300/60 block text-xs font-medium">Status</span>
                <span className="text-emerald-400 font-bold">{itemVisualizar.status || 'Ativo'}</span>
              </div>
              <div>
                <span className="text-emerald-300/60 block text-xs font-medium">Idioma</span>
                <span className="text-emerald-100 font-medium">{itemVisualizar.idioma || '—'}</span>
              </div>
              <div>
                <span className="text-emerald-300/60 block text-xs font-medium">Especialidade</span>
                <span className="text-emerald-100 font-medium">{itemVisualizar.especialidade || '—'}</span>
              </div>
            </div>
            <div className="flex justify-end pt-3">
              <button onClick={() => setItemVisualizar(null)} className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer select-none">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDITAR */}
      {itemEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#071f1a] border border-emerald-900/60 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between border-b border-emerald-900/50 pb-3">
              <h3 className="text-base font-bold text-white">Editar Guia</h3>
              <button onClick={() => setItemEditar(null)} className="text-emerald-300/60 hover:text-white text-sm font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={salvarEdicao} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-emerald-200/80 mb-1">Nome do Guia</label>
                <input 
                  type="text" 
                  required
                  value={itemEditar.nome || ''} 
                  onChange={(e) => setItemEditar({...itemEditar, nome: e.target.value})} 
                  className="w-full rounded-xl border border-emerald-800 bg-[#041411] px-3 py-2 outline-none focus:border-emerald-500 text-sm text-white" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-200/80 mb-1">Telefone</label>
                  <input 
                    type="text" 
                    value={itemEditar.telefone || ''} 
                    onChange={(e) => setItemEditar({...itemEditar, telefone: e.target.value})} 
                    className="w-full rounded-xl border border-emerald-800 bg-[#041411] px-3 py-2 outline-none focus:border-emerald-500 text-sm text-white" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-200/80 mb-1">Status</label>
                  <select 
                    value={itemEditar.status || 'Ativo'} 
                    onChange={(e) => setItemEditar({...itemEditar, status: e.target.value})} 
                    className="w-full rounded-xl border border-emerald-800 bg-[#041411] px-3 py-2 outline-none focus:border-emerald-500 text-sm text-white"
                  >
                    <option value="Ativo" className="bg-[#041411]">Ativo</option>
                    <option value="Inativo" className="bg-[#041411]">Inativo</option>
                    <option value="Férias" className="bg-[#041411]">Férias</option>
                    <option value="Em Tour" className="bg-[#041411]">Em Tour</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-200/80 mb-1">Idioma</label>
                  <input 
                    type="text" 
                    value={itemEditar.idioma || ''} 
                    onChange={(e) => setItemEditar({...itemEditar, idioma: e.target.value})} 
                    className="w-full rounded-xl border border-emerald-800 bg-[#041411] px-3 py-2 outline-none focus:border-emerald-500 text-sm text-white" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-200/80 mb-1">Especialidade</label>
                  <input 
                    type="text" 
                    value={itemEditar.especialidade || ''} 
                    onChange={(e) => setItemEditar({...itemEditar, especialidade: e.target.value})} 
                    className="w-full rounded-xl border border-emerald-800 bg-[#041411] px-3 py-2 outline-none focus:border-emerald-500 text-sm text-white" 
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-emerald-900/50">
                <button type="button" onClick={() => itemEditar && setItemEditar(null)} className="px-4 py-2 rounded-xl border border-emerald-800 text-emerald-200 hover:bg-emerald-900/40 font-semibold text-xs transition cursor-pointer select-none">
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
      {itemExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#071f1a] border border-emerald-900/60 p-6 shadow-2xl space-y-4 text-center text-slate-100">
            <div className="w-10 h-10 bg-rose-950/60 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-800/40">
              <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-white">Confirmação de Exclusão</h3>
            <p className="text-xs text-emerald-200/70">
              Deseja realmente excluir o guia <span className="font-bold text-white">{itemExcluir.nome}</span>? Esta ação não poderá ser desfeita.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button onClick={() => setItemExcluir(null)} className="px-4 py-2 rounded-xl border border-emerald-800 text-emerald-200 hover:bg-emerald-900/40 font-semibold text-xs transition cursor-pointer select-none">
                Cancelar
              </button>
              <button onClick={confirmarExclusao} disabled={excluindo} className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs transition shadow-sm cursor-pointer select-none disabled:opacity-50">
                {excluindo ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
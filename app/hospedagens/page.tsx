export const dynamic = 'force-dynamic';
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Hospedagem {
  id?: string;
  nome?: string;
  Nome?: string;
  tipo?: string;
  Endereco?: string;
  endereco?: string;
  telefone?: string;
  valor_diaria?: number;
  Status?: string;
  created_at?: string;
}

export default function HospedagensPage() {
  const [hospedagens, setHospedagens] = useState<Hospedagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  const [itemVisualizar, setItemVisualizar] = useState<Hospedagem | null>(null);
  const [itemEditar, setItemEditar] = useState<Hospedagem | null>(null);
  const [itemExcluir, setItemExcluir] = useState<Hospedagem | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const mostrarToast = (mensagem: string) => {
    setMensagemSucesso(mensagem);
    setTimeout(() => setMensagemSucesso(null), 4000);
  };

  const fetchHospedagens = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from('hospedagens')
        .select('*')
        .order('created_at', { ascending: false });

      if (supabaseError) {
        throw new Error(`Falha ao carregar hospedagens: ${supabaseError.message}`);
      }

      const dadosNormalizados = (data || []).map((item: any) => ({
        ...item,
        nome: item.nome || item.Nome || '',
        Endereco: item.Endereco || item.endereco || '',
      }));

      setHospedagens(dadosNormalizados);
    } catch (err: any) {
      console.error('Erro na operação:', err);
      setError(err.message || 'Ocorreu um erro inesperado.');
      setHospedagens([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospedagens();
  }, []);

  const converterParaNumeroSupabase = (valorInput: any) => {
    if (valorInput === null || valorInput === undefined || valorInput === '') return 0;
    if (typeof valorInput === 'number') return valorInput;

    let stringValor = String(valorInput).trim().replace('R$', '').trim();

    if (stringValor.includes('.') && stringValor.includes(',')) {
      stringValor = stringValor.replace(/\./g, '').replace(',', '.');
    } else if (stringValor.includes(',')) {
      stringValor = stringValor.replace(',', '.');
    }

    const numeroFinal = parseFloat(stringValor);
    return isNaN(numeroFinal) ? 0 : numeroFinal;
  };

  const salvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemEditar || !itemEditar.id) return;
    setSalvandoEdicao(true);
    setError(null);

    try {
      const valorTratado = converterParaNumeroSupabase(itemEditar.valor_diaria);
      const nomeValor = itemEditar.nome || itemEditar.Nome || '';
      const enderecoValor = itemEditar.Endereco || itemEditar.endereco || '';

      const { error: updateError } = await supabase
        .from('hospedagens')
        .update({
          nome: nomeValor,
          tipo: itemEditar.tipo,
          endereco: enderecoValor,
          telefone: itemEditar.telefone,
          valor_diaria: valorTratado,
          Status: itemEditar.Status || 'Disponível',
        })
        .eq('id', itemEditar.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setItemEditar(null);
      mostrarToast('Hospedagem atualizada com sucesso!');
      fetchHospedagens();
    } catch (err: any) {
      console.error('Erro ao atualizar hospedagem:', err);
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
        .from('hospedagens')
        .delete()
        .eq('id', itemExcluir.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setHospedagens((prev) => prev.filter((h) => h.id !== itemExcluir.id));
      setItemExcluir(null);
      mostrarToast('Hospedagem excluída com sucesso!');
    } catch (err: any) {
      console.error('Erro ao excluir:', err);
      setError('Erro ao excluir registro: ' + err.message);
    } finally {
      setExcluindo(false);
    }
  };

  const hospedagensFiltradas = hospedagens.filter((h) => {
    const termo = busca.toLowerCase();
    const nomeCompleto = h.nome || h.Nome || '';
    const enderecoCompleto = h.Endereco || h.endereco || '';
    const atendeBusca =
      nomeCompleto.toLowerCase().includes(termo) ||
      enderecoCompleto.toLowerCase().includes(termo) ||
      (h.tipo || '').toLowerCase().includes(termo);

    const statusAtual = h.Status || 'Disponível';
    const atendeStatus = filtroStatus ? statusAtual.toLowerCase() === filtroStatus.toLowerCase() : true;

    return atendeBusca && atendeStatus;
  });

  const totalHospedagens = hospedagens.length;
  const disponiveis = hospedagens.filter(
    (h) => (h.Status || 'Disponível').toLowerCase() === 'disponível' || (h.Status || '').toLowerCase() === 'disponivel'
  ).length;
  const ocupadas = hospedagens.filter(
    (h) => (h.Status || '').toLowerCase() === 'ocupada' || (h.Status || '').toLowerCase() === 'reservada'
  ).length;

  const mediaDiaria =
    totalHospedagens > 0
      ? hospedagens.reduce((acc, curr) => acc + (Number(curr.valor_diaria) || 0), 0) / totalHospedagens
      : 0;

  const handleCardClick = (statusFiltro: string) => {
    if (filtroStatus === statusFiltro) {
      setFiltroStatus('');
    } else {
      setFiltroStatus(statusFiltro);
    }
  };

  const cards = [
    {
      titulo: 'Total de Unidades',
      valor: loading ? '...' : String(totalHospedagens),
      detalhe: 'Unidades cadastradas',
      cor: 'border-l-emerald-500 text-emerald-100',
      statusFiltro: '',
    },
    {
      titulo: 'Disponíveis',
      valor: loading ? '...' : String(disponiveis),
      detalhe: 'Disponíveis no momento',
      cor: 'border-l-sky-400 text-sky-100',
      statusFiltro: 'Disponível',
    },
    {
      titulo: 'Ocupadas / Reservadas',
      valor: loading ? '...' : String(ocupadas),
      detalhe: 'Ocupadas no momento',
      cor: 'border-l-amber-400 text-amber-100',
      statusFiltro: 'Ocupada',
    },
    {
      titulo: 'Média da Diária',
      valor: loading
        ? '...'
        : `R$ ${mediaDiaria.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      detalhe: 'Média real da base',
      cor: 'border-l-emerald-400 text-emerald-100',
      statusFiltro: '',
    },
  ];

  const getStatusClasses = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'disponível':
      case 'disponivel':
        return 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30';
      case 'ocupada':
      case 'reservada':
        return 'bg-amber-950/60 text-amber-300 border border-amber-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border border-slate-700';
    }
  };

  const getStatusDotClass = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'disponível':
      case 'disponivel':
        return 'bg-emerald-400';
      case 'ocupada':
      case 'reservada':
        return 'bg-amber-400';
      default:
        return 'bg-slate-400';
    }
  };

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

      {/* HEADER HERO COM IMAGEM GENÉRICA DE HOTEL EXTERNA */}
      <div className="relative w-full bg-[#051713] py-24 md:py-28 px-6 text-white shadow-lg overflow-hidden flex flex-col justify-between md:px-12 border-b border-emerald-900/40">
        <div className="absolute inset-0 opacity-80 pointer-events-none flex items-center justify-center">
          <div 
            className="w-full h-full bg-cover bg-center" 
            style={{ 
              backgroundImage: `url('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1920')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }} 
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#071f1a] via-[#071f1a]/70 to-[#071f1a]/40 pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto w-full flex justify-end z-10">
          <Link 
            href="/hospedagens/novo" 
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className="inline-flex items-center rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition select-none no-underline cursor-pointer border border-emerald-500/40"
            style={{ WebkitUserDrag: 'none' } as any}
          >
            <span className="leading-none text-base font-bold pointer-events-none mr-1.5">+</span>
            <span className="leading-none pointer-events-none">Nova Hospedagem</span>
          </Link>
        </div>

        <div className="relative max-w-7xl mx-auto w-full z-10 pt-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-900/40 px-4 py-1.5 text-xs font-semibold text-emerald-200 backdrop-blur shadow-sm mb-2 select-none">
              🏨 Gestão de Acomodações
            </div>
            <h1 className="text-3xl font-bold text-white drop-shadow-md md:text-4xl">Hospedagens</h1>
            <p className="mt-1 text-emerald-100/80 text-sm drop-shadow-md font-medium">Gerenciamento e controle completo de pousadas, barcos-hotel e acomodações integradas.</p>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-900/40 px-5 py-2.5 text-xs font-semibold text-emerald-100 backdrop-blur shadow-sm select-none">
            {loading ? '...' : `${totalHospedagens} ${totalHospedagens === 1 ? 'unidade cadastrada' : 'unidades cadastradas'}`}
          </div>
        </div>
      </div>

      <div className="px-6 py-10 md:px-12 max-w-7xl mx-auto w-full flex-1 space-y-10">
        
        {/* CARDS DE MÉTRICAS */}
        <div className="grid gap-6 md:grid-cols-4">
          {cards.map((card) => {
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
                Lista de Hospedagens {filtroStatus && <span className="text-sm font-normal text-emerald-200 bg-emerald-900/80 border border-emerald-700/50 px-3 py-1 rounded-full ml-2">Filtrando por: {filtroStatus}</span>}
              </h2>
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
              <input 
                type="text" 
                placeholder="Pesquisar hospedagem..." 
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
                <option value="Disponível" className="bg-[#041411]">Disponível</option>
                <option value="Ocupada" className="bg-[#041411]">Ocupada</option>
              </select>
            </div>
          </div>

          <div className="mt-8 overflow-x-auto min-h-[300px]">
            {loading ? (
              <div className="p-12 text-center text-emerald-200/60 font-medium text-sm">Carregando hospedagens com segurança...</div>
            ) : error ? (
              <div className="p-12 text-center text-rose-300 font-medium bg-rose-950/40 rounded-xl border border-rose-900/50 text-sm">{error}</div>
            ) : hospedagensFiltradas.length === 0 ? (
              <div className="p-12 text-center text-emerald-200/60 font-medium text-sm">Nenhuma hospedagem encontrada.</div>
            ) : (
              <table className="min-w-[1200px] w-full text-left border-collapse">
                <thead className="bg-[#051713]/80 border-b border-emerald-900/60 text-emerald-200/80 text-xs font-bold tracking-wider select-none">
                  <tr>
                    <th className="px-5 py-3.5 rounded-tl-xl">NOME DA HOSPEDAGEM</th>
                    <th className="px-5 py-3.5">LOCALIZAÇÃO / ENDEREÇO</th>
                    <th className="px-5 py-3.5">TIPO</th>
                    <th className="px-5 py-3.5">TELEFONE</th>
                    <th className="px-5 py-3.5">DIÁRIA</th>
                    <th className="px-5 py-3.5">STATUS</th>
                    <th className="px-5 py-3.5 text-center rounded-tr-xl">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/30 text-sm">
                  {hospedagensFiltradas.map((item, idx) => {
                    const statusExibido = item.Status || 'Disponível';
                    return (
                      <tr key={item.id || idx} className="bg-transparent hover:bg-emerald-950/30 transition">
                        <td className="px-5 py-4 font-semibold text-white">{item.nome || item.Nome || '—'}</td>
                        <td className="px-5 py-4 text-emerald-100/80">{item.Endereco || item.endereco || '—'}</td>
                        <td className="px-5 py-4 text-emerald-100/80">{item.tipo || '—'}</td>
                        <td className="px-5 py-4 text-emerald-100/80">{item.telefone || '—'}</td>
                        <td className="px-5 py-4 font-semibold text-white">
                          {item.valor_diaria !== undefined && item.valor_diaria !== null
                            ? `R$ ${Number(item.valor_diaria).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : 'R$ 0,00'}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold select-none ${getStatusClasses(statusExibido)}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${getStatusDotClass(statusExibido)}`} />
                            {statusExibido}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => setItemVisualizar(item)} className="p-1.5 bg-emerald-900/40 hover:bg-emerald-900 text-emerald-200 rounded-lg transition cursor-pointer border border-emerald-700/40" title="Visualizar">👁</button>
                            <button onClick={() => setItemEditar({ ...item, nome: item.nome || item.Nome || '', Endereco: item.Endereco || item.endereco || '' })} className="p-1.5 bg-sky-950/40 hover:bg-sky-900 text-sky-200 rounded-lg transition cursor-pointer border border-sky-800/40" title="Editar">✎</button>
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
              <h3 className="text-base font-bold text-white">Detalhes da Hospedagem</h3>
              <button onClick={() => setItemVisualizar(null)} className="text-emerald-300/60 hover:text-white text-sm font-bold cursor-pointer">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <span className="text-emerald-300/60 block text-xs font-medium">Nome da Hospedagem</span>
                <span className="text-white font-bold text-base">{itemVisualizar.nome || itemVisualizar.Nome || '—'}</span>
              </div>
              <div>
                <span className="text-emerald-300/60 block text-xs font-medium">Tipo</span>
                <span className="text-emerald-100 font-medium">{itemVisualizar.tipo || '—'}</span>
              </div>
              <div>
                <span className="text-emerald-300/60 block text-xs font-medium">Status</span>
                <span className="text-emerald-400 font-bold">{itemVisualizar.Status || 'Disponível'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-emerald-300/60 block text-xs font-medium">Localização / Endereço</span>
                <span className="text-emerald-100 font-medium">{itemVisualizar.Endereco || itemVisualizar.endereco || '—'}</span>
              </div>
              <div>
                <span className="text-emerald-300/60 block text-xs font-medium">Telefone</span>
                <span className="text-emerald-100 font-medium">{itemVisualizar.telefone || '—'}</span>
              </div>
              <div>
                <span className="text-emerald-300/60 block text-xs font-medium">Valor da Diária</span>
                <span className="text-emerald-300 font-bold">R$ {Number(itemVisualizar.valor_diaria || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
              <h3 className="text-base font-bold text-white">Editar Hospedagem</h3>
              <button onClick={() => setItemEditar(null)} className="text-emerald-300/60 hover:text-white text-sm font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={salvarEdicao} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-emerald-200/80 mb-1">Nome da Hospedagem</label>
                <input 
                  type="text" 
                  required
                  value={itemEditar.nome || itemEditar.Nome || ''} 
                  onChange={(e) => setItemEditar({...itemEditar, nome: e.target.value, Nome: e.target.value})} 
                  className="w-full rounded-xl border border-emerald-800 bg-[#041411] px-3 py-2 outline-none focus:border-emerald-500 text-sm text-white" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-200/80 mb-1">Tipo</label>
                  <input 
                    type="text" 
                    value={itemEditar.tipo || ''} 
                    onChange={(e) => setItemEditar({...itemEditar, tipo: e.target.value})} 
                    className="w-full rounded-xl border border-emerald-800 bg-[#041411] px-3 py-2 outline-none focus:border-emerald-500 text-sm text-white" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-200/80 mb-1">Valor da Diária (R$)</label>
                  <input 
                    type="text" 
                    required
                    value={itemEditar.valor_diaria !== undefined ? itemEditar.valor_diaria : ''} 
                    onChange={(e) => setItemEditar({...itemEditar, valor_diaria: e.target.value as any})} 
                    className="w-full rounded-xl border border-emerald-800 bg-[#041411] px-3 py-2 outline-none focus:border-emerald-500 text-sm text-white font-bold text-emerald-300" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-emerald-200/80 mb-1">Localização / Endereço</label>
                <input 
                  type="text" 
                  value={itemEditar.Endereco || itemEditar.endereco || ''} 
                  onChange={(e) => setItemEditar({...itemEditar, Endereco: e.target.value, endereco: e.target.value})} 
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
                    value={itemEditar.Status || 'Disponível'} 
                    onChange={(e) => setItemEditar({...itemEditar, Status: e.target.value})} 
                    className="w-full rounded-xl border border-emerald-800 bg-[#041411] px-3 py-2 outline-none focus:border-emerald-500 text-sm text-white"
                  >
                    <option value="Disponível" className="bg-[#041411]">Disponível</option>
                    <option value="Ocupada" className="bg-[#041411]">Ocupada</option>
                    <option value="Reservada" className="bg-[#041411]">Reservada</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-emerald-900/50">
                <button type="button" onClick={() => setItemEditar(null)} className="px-4 py-2 rounded-xl border border-emerald-800 text-emerald-200 hover:bg-emerald-900/40 font-semibold text-xs transition cursor-pointer select-none">
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
            <h3 className="text-base font-bold text-white">Confirmar Exclusão</h3>
            <p className="text-xs text-emerald-200/70">
              Tem certeza que deseja excluir a hospedagem <span className="font-bold text-white">{itemExcluir.nome || itemExcluir.Nome || 'Unidade'}</span>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button onClick={() => setItemExcluir(null)} className="px-4 py-2 rounded-xl border border-emerald-800 text-emerald-200 hover:bg-emerald-900/40 font-semibold text-xs transition cursor-pointer select-none">
                Cancelar
              </button>
              <button onClick={confirmarExclusao} disabled={excluindo} className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs transition shadow-sm cursor-pointer select-none disabled:opacity-50">
                {excluindo ? "Excluindo..." : "Sim, Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
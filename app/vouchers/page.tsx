'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface Voucher {
  id?: string;
  created_at?: string;
  codigo: string;
  reserva_id?: string;
  status?: string;
  data_emissao?: string;
  cliente_id?: string;
  cliente_nome?: string;
  passeio_id?: string;
  valor?: number | string;
  validade?: string;
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [voucherSelecionado, setVoucherSelecionado] = useState<Voucher | null>(null);

  const [editCodigo, setEditCodigo] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editValor, setEditValor] = useState('');
  const [editValidade, setEditValidade] = useState('');

  const parseValorNumerico = (val: any): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') {
      if (val > 0 && val < 10) return val * 1000;
      return val;
    }
    
    let stringVal = String(val).trim();
    if (!stringVal) return 0;
    stringVal = stringVal.replace(/[R$\s]/g, '');

    if (stringVal.includes('.') && stringVal.includes(',')) {
      stringVal = stringVal.replace(/\./g, '').replace(',', '.');
    } else if (stringVal.includes('.')) {
      const partes = stringVal.split('.');
      if (partes.length > 1 && partes[partes.length - 1].length === 3 && !stringVal.includes(',')) {
        stringVal = stringVal.replace(/\./g, '');
      }
    } else if (stringVal.includes(',')) {
      stringVal = stringVal.replace(',', '.');
    }

    let numero = parseFloat(stringVal);
    if (isNaN(numero)) return 0;
    if (numero > 0 && numero < 10) numero = numero * 1000;
    return numero;
  };

  const fetchVouchers = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('⚠️ [Vouchers]: Erro ao carregar registros:', error.message);
      } else if (data) {
        const { data: clientesData } = await supabase.from('clientes').select('id, nome');
        const mapaClientes = new Map();
        if (clientesData) {
          clientesData.forEach((c: any) => mapaClientes.set(c.id, c.nome));
        }

        const vouchersFormatados = data.map((item: any) => {
          const nomeDoCliente = 
            (item.cliente_id && mapaClientes.get(item.cliente_id)) || 
            item.cliente_nome || 
            item.nome_cliente || 
            'Cliente Vinculado';

          return {
            ...item,
            status: item.status || 'Ativo',
            valor: parseValorNumerico(item.valor),
            cliente_nome: nomeDoCliente,
          };
        });
        setVouchers(vouchersFormatados);
      }
    } catch (err) {
      console.warn('⚠️ [Vouchers]: Falha na requisição de rede:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const vouchersFiltrados = vouchers.filter((v) => {
    const termo = busca.toLowerCase();
    const codigoStr = String(v.codigo || '').toLowerCase();
    const statusStr = String(v.status || '').toLowerCase();
    const clienteStr = String(v.cliente_nome || '').toLowerCase();

    const atendeBusca = codigoStr.includes(termo) || statusStr.includes(termo) || clienteStr.includes(termo);
    const atendeStatus = filtroStatus ? statusStr === filtroStatus.toLowerCase() : true;

    return atendeBusca && atendeStatus;
  });

  const totalVouchers = vouchers.length;
  const ativos = vouchers.filter((v) => (v.status || '').toLowerCase() === 'ativo').length;
  const utilizados = vouchers.filter((v) => (v.status || '').toLowerCase() === 'utilizado').length;

  const handleCardClick = (statusFiltro: string) => {
    setFiltroStatus(filtroStatus === statusFiltro ? '' : statusFiltro);
  };

  const abrirVisualizacao = (voucher: Voucher) => {
    setVoucherSelecionado(voucher);
    setModalVisualizarAberto(true);
  };

  const abrirEdicao = (voucher: Voucher) => {
    setVoucherSelecionado(voucher);
    setEditCodigo(voucher.codigo || '');
    setEditStatus(voucher.status || 'Ativo');
    setEditValor(voucher.valor !== undefined ? String(voucher.valor) : '');
    setEditValidade(voucher.validade ? voucher.validade.split('T')[0] : '');
    setModalEditarAberto(true);
  };

  const abrirExclusao = (voucher: Voucher) => {
    setVoucherSelecionado(voucher);
    setModalExcluirAberto(true);
  };

  const salvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherSelecionado || !voucherSelecionado.id) return;

    try {
      const valorNumerico = parseValorNumerico(editValor);
      
      const { error } = await supabase
        .from('vouchers')
        .update({
          codigo: editCodigo,
          status: editStatus,
          valor: valorNumerico,
          validade: editValidade || null,
        })
        .eq('id', voucherSelecionado.id);

      if (error) {
        alert('Erro ao atualizar voucher: ' + error.message);
      } else {
        setModalEditarAberto(false);
        fetchVouchers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const confirmarExclusao = async () => {
    if (!voucherSelecionado || !voucherSelecionado.id) return;

    try {
      const { error } = await supabase
        .from('vouchers')
        .delete()
        .eq('id', voucherSelecionado.id);

      if (error) {
        alert('Erro ao excluir voucher: ' + error.message);
      } else {
        setModalExcluirAberto(false);
        fetchVouchers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatarMoeda = (valor: any) => {
    let num = parseValorNumerico(valor);
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const cards = [
    {
      titulo: 'TOTAL DE VOUCHERS',
      valor: loading ? '...' : String(totalVouchers),
      detalhe: `${totalVouchers} voucher${totalVouchers === 1 ? '' : 's'} gerado${totalVouchers === 1 ? '' : 's'}`,
      cor: 'border-l-sky-500 text-sky-900',
      statusFiltro: '',
    },
    {
      titulo: 'VOUCHERS ATIVOS',
      valor: loading ? '...' : String(ativos),
      detalhe: `Filtrar ${ativos} ativo${ativos === 1 ? '' : 's'}`,
      cor: 'border-l-emerald-500 text-emerald-900',
      statusFiltro: 'Ativo',
    },
    {
      titulo: 'UTILIZADOS',
      valor: loading ? '...' : String(utilizados),
      detalhe: `Filtrar ${utilizados} utilizado${utilizados === 1 ? '' : 's'}`,
      cor: 'border-l-amber-500 text-amber-800',
      statusFiltro: 'Utilizado',
    },
  ];

  return (
    <div className="min-h-screen bg-transparent pb-16">
      
      {/* HEADER HERO PADRONIZADO */}
      <div 
        className="relative bg-cover bg-center h-[380px] px-6 text-white flex flex-col justify-end pb-10 shadow-lg overflow-hidden md:px-12"
        style={{
          backgroundImage: `linear-gradient(rgba(7, 31, 26, 0.4) 20%, rgba(7, 31, 26, 0.92) 100%), url('/images/regiao/arara.jpg.jpeg')`,
          backgroundPosition: 'center 35%',
        }}
      >
        <div className="mx-auto w-full max-w-7xl relative z-10">
          <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-medium text-sky-100 backdrop-blur select-none">
            🎫 Gestão de Vouchers • Controle de Bilhetes
          </div>
          <h1 className="mt-3 text-2xl font-bold text-white tracking-tight md:text-3xl">
            Gestão de Vouchers
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-sky-100 font-normal">
            Controle de bilhetes, comprovantes e vouchers integrados ao banco de dados com segurança.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 items-center">
            
            {/* BOTÃO CORrigido: draggable=false e onDragStart prevenido para eliminar o arrasto do link */}
            <Link
              href="/vouchers/novo"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-sky-500 active:scale-[0.98] select-none no-underline cursor-pointer"
              style={{ WebkitUserDrag: 'none' } as any}
            >
              <span className="leading-none text-base font-bold pointer-events-none">+</span>
              <span className="leading-none pointer-events-none">Novo Voucher</span>
            </Link>

            <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-medium text-sky-100 backdrop-blur select-none">
              {totalVouchers} {totalVouchers === 1 ? 'registro encontrado' : 'registros encontrados'}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-6 relative z-20 md:px-12">
        <div className="mx-auto max-w-7xl space-y-6">
          
          {/* CARDS DE MÉTRICAS (Fundo translúcido/limpo, sem blocos brancos pesados) */}
          <div className="grid gap-5 md:grid-cols-3">
            {cards.map((card) => {
              const isAtivo = card.statusFiltro !== '' && filtroStatus === card.statusFiltro;
              return (
                <div
                  key={card.titulo}
                  onClick={() => card.statusFiltro && handleCardClick(card.statusFiltro)}
                  className={`rounded-2xl border-l-4 bg-slate-900/5 backdrop-blur-md p-5 shadow-sm border border-slate-200/40 ${card.cor} transition ${
                    card.statusFiltro ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
                  } ${isAtivo ? 'ring-2 ring-sky-500 bg-sky-50/20' : ''}`}
                >
                  <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase select-none">{card.titulo}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-800">{card.valor}</p>
                  <p className={`mt-2 text-xs font-medium ${card.statusFiltro ? 'text-sky-700 underline' : 'text-slate-600'}`}>
                    {card.detalhe}
                  </p>
                </div>
              );
            })}
          </div>

          {/* BARRA DE PESQUISA */}
          <div className="bg-slate-900/5 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-slate-200/40 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full max-w-xl">
              <input
                type="text"
                placeholder="Pesquisar por código, cliente ou status..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full rounded-xl border border-slate-200/80 bg-white/80 px-4 py-2.5 pl-10 text-sm text-slate-700 outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 transition"
              />
              <span className="absolute left-3.5 top-3 text-slate-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
            </div>
            {busca && (
              <span className="text-xs text-sky-700 font-medium">
                Filtrando por: &quot;{busca}&quot;
              </span>
            )}
          </div>

          {/* TABELA DE DADOS */}
          <div className="rounded-2xl border border-slate-200/40 bg-white/90 backdrop-blur-md shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-sm font-medium">
                Carregando vouchers com segurança...
              </div>
            ) : vouchersFiltrados.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm font-medium">
                Nenhum voucher encontrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/60 border-b border-slate-200/70 text-slate-600 text-xs font-bold tracking-wider select-none">
                      <th className="px-5 py-3.5">CÓDIGO</th>
                      <th className="px-5 py-3.5">CLIENTE</th>
                      <th className="px-5 py-3.5">VALIDADE</th>
                      <th className="px-5 py-3.5">VALOR</th>
                      <th className="px-5 py-3.5">STATUS</th>
                      <th className="px-5 py-3.5 text-center">AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {vouchersFiltrados.map((voucher, idx) => (
                      <tr key={voucher.id || idx} className="hover:bg-slate-50/60 transition">
                        <td className="px-5 py-4 font-mono font-bold text-slate-900">
                          {voucher.codigo}
                        </td>
                        <td className="px-5 py-4 text-slate-700 font-medium">
                          {voucher.cliente_nome || '—'}
                        </td>
                        <td className="px-5 py-4 text-slate-500 text-xs">
                          {voucher.validade ? new Date(voucher.validade).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="px-5 py-4 font-semibold text-emerald-600">
                          {formatarMoeda(voucher.valor)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold select-none ${
                              (voucher.status || '').toLowerCase() === 'utilizado'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : (voucher.status || '').toLowerCase() === 'cancelado'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                (voucher.status || '').toLowerCase() === 'utilizado' 
                                  ? 'bg-amber-500' 
                                  : (voucher.status || '').toLowerCase() === 'cancelado' 
                                  ? 'bg-rose-500' 
                                  : 'bg-emerald-500'
                              }`}
                            />
                            {voucher.status || 'Ativo'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => abrirVisualizacao(voucher)}
                              title="Ver Detalhes"
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition cursor-pointer"
                            >
                              <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => abrirEdicao(voucher)}
                              title="Editar"
                              className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-lg transition cursor-pointer"
                            >
                              <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => abrirExclusao(voucher)}
                              title="Excluir"
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                            >
                              <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE VISUALIZAÇÃO */}
      {modalVisualizarAberto && voucherSelecionado && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Detalhes do Voucher</h3>
              <button
                onClick={() => setModalVisualizarAberto(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400 block text-xs font-medium">Código</span>
                <span className="text-slate-800 font-mono font-bold">{voucherSelecionado.codigo}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs font-medium">Cliente</span>
                <span className="text-slate-800 font-medium">{voucherSelecionado.cliente_nome || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs font-medium">Status</span>
                <span className="text-slate-800 font-medium">{voucherSelecionado.status || 'Ativo'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs font-medium">Validade</span>
                <span className="text-slate-800 font-medium">
                  {voucherSelecionado.validade ? new Date(voucherSelecionado.validade).toLocaleDateString('pt-BR') : 'Não informada'}
                </span>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-100">
                <span className="text-slate-400 block text-xs font-medium">Valor Total</span>
                <span className="text-emerald-600 font-bold text-lg">{formatarMoeda(voucherSelecionado.valor)}</span>
              </div>
            </div>
            <div className="flex justify-end pt-3">
              <button
                onClick={() => setModalVisualizarAberto(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer select-none"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO */}
      {modalEditarAberto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Editar Voucher</h3>
              <button
                onClick={() => setModalEditarAberto(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={salvarEdicao} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Código</label>
                <input
                  type="text"
                  value={editCodigo}
                  onChange={(e) => setEditCodigo(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Validade</label>
                  <input
                    type="date"
                    value={editValidade}
                    onChange={(e) => setEditValidade(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Valor (R$)</label>
                  <input
                    type="text"
                    value={editValor}
                    onChange={(e) => setEditValor(e.target.value)}
                    placeholder="Ex: 1500"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-sm bg-white"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Utilizado">Utilizado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalEditarAberto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition cursor-pointer select-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition shadow-sm cursor-pointer select-none"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EXCLUSÃO */}
      {modalExcluirAberto && voucherSelecionado && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-200 space-y-4 text-center">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800">Confirmar Exclusão</h3>
            <p className="text-xs text-slate-500">
              Tem certeza que deseja excluir o voucher <span className="font-mono font-bold text-slate-700">{voucherSelecionado.codigo}</span>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setModalExcluirAberto(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition cursor-pointer select-none"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExclusao}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition shadow-sm cursor-pointer select-none"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { BANNER_REGIONAL } from '@/lib/bannerImagens';

export default function EditarReservaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Estados dos campos da reserva
  const [cliente, setCliente] = useState('');
  const [pacote, setPacote] = useState('');
  const [dataReserva, setDataReserva] = useState('');
  const [agencia, setAgencia] = useState('');
  const [guia, setGuia] = useState('');
  const [valor, setValor] = useState('');
  const [status, setStatus] = useState('Pendente');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    if (id) {
      fetchReserva(id);
    }
  }, [id]);

  async function fetchReserva(reservaId: string | string[]) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .eq('id', reservaId)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setCliente(data.cliente || data.nome_cliente || '');
        setPacote(data.pacote || data.passeio || '');
        if (data.data_reserva) {
          setDataReserva(data.data_reserva.split('T')[0]);
        } else if (data.data) {
          setDataReserva(data.data);
        }
        setAgencia(data.agencia || data.parceiro || '');
        setGuia(data.guia || '');
        
        // Correção cirúrgica do valor: lê o valor bruto do banco sem divisões incorretas
        const rawValor = data.valor_total !== undefined && data.valor_total !== null 
          ? data.valor_total 
          : (data.valor !== undefined && data.valor !== null ? data.valor : '');
        setValor(rawValor !== '' ? String(rawValor) : '');

        setStatus(data.status || data.Status || 'Pendente');
        setObservacoes(data.observacoes || '');
      }
    } catch (err: any) {
      console.error('Erro ao buscar reserva para edição:', err);
      alert('Não foi possível carregar os dados da reserva.');
      router.push('/reservas');
    } finally {
      setLoading(false);
    }
  }

  const handleAtualizar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSalvando(true);
    try {
      const dadosAtualizados: any = {
        cliente,
        pacote,
        data_reserva: dataReserva || null,
        agencia,
        guia,
        valor: valor ? parseFloat(valor) : 0,
        status,
        observacoes
      };

      const { error } = await supabase
        .from('reservas')
        .update(dadosAtualizados)
        .eq('id', id);

      if (error) throw error;

      alert('Reserva atualizada com sucesso!');
      router.push('/reservas');
    } catch (err: any) {
      console.error('Erro ao atualizar reserva:', err);
      alert('Erro ao atualizar reserva: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-600">
        Carregando informações da reserva...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col">
      {/* Banner Superior padronizado e tipografia limpa */}
      <div 
        className="relative bg-cover bg-center py-16 px-8 md:px-12 text-white flex flex-col justify-center shadow-md"
        style={{
          backgroundImage: `linear-gradient(rgba(7, 31, 26, 0.5), rgba(7, 31, 26, 0.9)), url('${BANNER_REGIONAL.modulos.viagembarco}')`,
        }}
      >
        <div className="max-w-7xl mx-w-full w-full space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-emerald-100">
            <span>✏️</span> Gestão Operacional • Edição de Reserva
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
            Editar Reserva
          </h1>
          <p className="text-emerald-100 text-sm md:text-base font-normal opacity-90 max-w-2xl leading-relaxed">
            Modifique as informações necessárias e salve para atualizar o registro no sistema.
          </p>
        </div>
      </div>

      {/* Formulário Principal */}
      <div className="p-8 max-w-7xl mx-auto w-full -mt-6 z-10 flex-1">
        <form onSubmit={handleAtualizar} className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cliente */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Cliente
              </label>
              <input
                type="text"
                required
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Nome do cliente"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
              />
            </div>

            {/* Pacote / Passeio */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Pacote / Passeio
              </label>
              <input
                type="text"
                required
                value={pacote}
                onChange={(e) => setPacote(e.target.value)}
                placeholder="Ex: Serra do Aracá"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
              />
            </div>

            {/* Data da Reserva */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Data da Reserva
              </label>
              <input
                type="date"
                value={dataReserva}
                onChange={(e) => setDataReserva(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
              />
            </div>

            {/* Agência / Parceiro */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Agência / Parceiro
              </label>
              <input
                type="text"
                value={agencia}
                onChange={(e) => setAgencia(e.target.value)}
                placeholder="Ex: Particular ou Nome da Agência"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
              />
            </div>

            {/* Guia */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Guia Atribuído
              </label>
              <input
                type="text"
                value={guia}
                onChange={(e) => setGuia(e.target.value)}
                placeholder="Nome do guia ou Não atribuído"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
              />
            </div>

            {/* Valor */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Valor (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Status da Reserva
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
            >
              <option value="Pendente">Pendente</option>
              <option value="Confirmada">Confirmada</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Observações
            </label>
            <textarea
              rows={4}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Informações adicionais sobre a reserva..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 resize-none"
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-100">
            <Link
              href="/reservas"
              className="px-6 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={salvando}
              className="px-6 py-3 rounded-xl text-sm font-semibold bg-[#072822] hover:bg-[#051e19] text-white transition shadow-md disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Parceiro {
  id?: string | number;
  nome?: string;
  cidade?: string;
  categoria?: string;
  avaliacao?: number;
  idiomas?: string;
  especialidade?: string;
  logo_url?: string;
}

export default function ParceirosPage() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  useEffect(() => {
    async function fetchParceiros() {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('parceiros').select('*');
        if (!error && data && data.length > 0) {
          setParceiros(data);
        } else {
          // Fallback robusto com dados de exemplo se a tabela do Supabase estiver vazia
          setParceiros([
            {
              id: 1,
              nome: 'Encantos Rio Negro Turismo',
              cidade: 'Barcelos - AM',
              categoria: 'Turismo Receptivo',
              avaliacao: 4.9,
              idiomas: 'Português • Inglês',
              especialidade: 'Pesca Esportiva e Ecoturismo',
            },
            {
              id: 2,
              nome: 'Rio Negro Adventure',
              cidade: 'Barcelos - AM',
              categoria: 'Embarcações',
              avaliacao: 4.8,
              idiomas: 'Português • Espanhol',
              especialidade: 'Passeios Fluviais',
            },
            {
              id: 3,
              nome: 'Expedições Amazônicas',
              cidade: 'Santa Isabel do Rio Negro - AM',
              categoria: 'Guias',
              avaliacao: 5.0,
              idiomas: 'Português • Inglês • Espanhol',
              especialidade: 'Turismo de Natureza',
            },
          ]);
        }
      } catch (err) {
        console.error('Erro ao buscar parceiros:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchParceiros();
  }, []);

  // Categorias para os cards interativos
  const categoriasCards = [
    { nome: 'Turismo Receptivo', icone: '🛶' },
    { nome: 'Embarcações', icone: '🚤' },
    { nome: 'Guias', icone: '🧭' },
    { nome: 'Hospedagens', icone: '🏨' },
  ];

  const handleCardClick = (cat: string) => {
    if (filtroCategoria === cat) {
      setFiltroCategoria('');
    } else {
      setFiltroCategoria(cat);
    }
  };

  const parceirosFiltrados = parceiros.filter((item) => {
    const termo = busca.toLowerCase();
    const atendeBusca =
      (item.nome || '').toLowerCase().includes(termo) ||
      (item.cidade || '').toLowerCase().includes(termo) ||
      (item.categoria || '').toLowerCase().includes(termo) ||
      (item.especialidade || '').toLowerCase().includes(termo);

    const atendeCategoria = filtroCategoria
      ? (item.categoria || '').toLowerCase().includes(filtroCategoria.toLowerCase())
      : true;

    return atendeBusca && atendeCategoria;
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      
      {/* Banner Superior com Fundo Temático */}
      <div 
        className="relative bg-cover bg-center py-16 px-8 text-white flex flex-col items-center justify-center text-center shadow-md"
        style={{
          backgroundImage: `linear-gradient(rgba(6, 78, 59, 0.85), rgba(4, 47, 35, 0.95)), url('https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?q=80&w=1600&auto=format&fit=crop')`,
        }}
      >
        <div className="max-w-4xl space-y-4">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight flex items-center justify-center gap-3">
            <span>🤝</span> Parceiros • Marketplace
          </h1>
          <p className="text-emerald-100 text-sm md:text-base font-medium opacity-90 max-w-3xl mx-auto">
            Encontre agências de turismo receptivo, embarcações, guias, hospedagens e serviços especializados para viver uma experiência completa na Amazônia.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/parceiros/novo"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2"
            >
              <span>➕</span> Cadastrar Parceiro
            </Link>
            <button 
              onClick={() => {
                const el = document.getElementById('diretorio-parceiros');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-white/20 hover:bg-white/30 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-lg transition-all border border-white/30 backdrop-blur-sm flex items-center gap-2"
            >
              <span>🔍</span> Explorar Parceiros
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-8 py-10 w-full flex-1 space-y-10" id="diretorio-parceiros">

        {/* Barra de Pesquisa Moderna com Indicador de Filtro Ativo */}
        <div className="bg-white px-5 py-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full">
            <span className="text-slate-400 text-lg">🔍</span>
            <input
              type="text"
              placeholder="Pesquisar agência, cidade, categoria ou especialidade..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full text-sm text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
            />
          </div>
          {filtroCategoria && (
            <button
              onClick={() => setFiltroCategoria('')}
              className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors"
            >
              Limpar Filtro ({filtroCategoria}) ✕
            </button>
          )}
        </div>

        {/* Cards de Categorias Interativos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categoriasCards.map((cat, idx) => {
            const isSelected = filtroCategoria.toLowerCase() === cat.nome.toLowerCase();
            return (
              <div
                key={idx}
                onClick={() => handleCardClick(cat.nome)}
                className={`rounded-2xl bg-white p-6 text-center shadow-lg cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl border-b-4 ${
                  isSelected ? 'border-emerald-600 ring-2 ring-emerald-500 bg-emerald-50/40' : 'border-transparent'
                }`}
              >
                <div className="text-4xl mb-2">{cat.icone}</div>
                <h2 className="text-base font-bold text-slate-800">{cat.nome}</h2>
                <p className="text-xs font-semibold text-emerald-600 mt-1 underline">
                  {isSelected ? 'Filtro ativo' : 'Filtrar categoria'}
                </p>
              </div>
            );
          })}
        </div>

        {/* Grid Moderno de Perfis */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <span>🌟</span> Agências e Prestadores Verificados
            </h2>
            {filtroCategoria && (
              <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-semibold">
                Categoria: {filtroCategoria}
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm">Carregando parceiros do Supabase...</div>
          ) : parceirosFiltrados.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-sm bg-white rounded-2xl shadow border border-slate-200">
              Nenhum parceiro encontrado com os critérios informados.
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-3">
              {parceirosFiltrados.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="rounded-2xl bg-white p-6 shadow-lg border border-slate-100 transition hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-slate-800">{item.nome || 'Parceiro'}</h2>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 whitespace-nowrap">
                        ⭐ {item.avaliacao ? item.avaliacao.toFixed(1) : '5.0'}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-500 font-medium flex items-center gap-1">
                      <span>📍</span> {item.cidade || 'Amazônia - AM'}
                    </p>

                    <p className="mt-1 text-xs font-bold text-emerald-700 uppercase tracking-wide">
                      {item.categoria || 'Parceiro Turístico'}
                    </p>

                    <div className="mt-5 space-y-2 text-sm text-slate-600 border-t border-slate-100 pt-4">
                      {item.idiomas && (
                        <p>
                          🌎 <strong>Idiomas:</strong> {item.idiomas}
                        </p>
                      )}
                      {item.especialidade && (
                        <p>
                          🎣 <strong>Especialidade:</strong> {item.especialidade}
                        </p>
                      )}
                      <p>🚐 Traslados disponíveis</p>
                      <p>🏨 Reserva de hospedagens</p>
                      <p>🚤 Passeios fluviais</p>
                      <p>✈ Apoio ao turista no destino</p>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                    <button className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition text-center">
                      Ver Perfil
                    </button>
                    <button className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition text-center">
                      Contato
                    </button>
                    <button className="w-full rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition text-center">
                      Solicitar Orçamento
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Seção Informativa: Vantagens */}
        <div className="mt-16 rounded-2xl bg-white p-8 shadow-xl border border-slate-100">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-slate-800">
            Por que contratar uma agência de turismo receptivo?
          </h2>
          <p className="mt-2 text-center text-slate-500 text-sm md:text-base">
            Quem mora no destino conhece detalhes que transformam uma viagem comum em uma experiência inesquecível.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-5 text-sm text-slate-700">
            <div className="rounded-xl bg-emerald-50/70 p-4 border border-emerald-100 font-medium">
              ✅ Conhece profundamente o destino.
            </div>
            <div className="rounded-xl bg-emerald-50/70 p-4 border border-emerald-100 font-medium">
              ✅ Planeja toda a viagem com antecedência.
            </div>
            <div className="rounded-xl bg-emerald-50/70 p-4 border border-emerald-100 font-medium">
              ✅ Economiza tempo e evita filas.
            </div>
            <div className="rounded-xl bg-emerald-50/70 p-4 border border-emerald-100 font-medium">
              ✅ Resolve imprevistos durante a viagem.
            </div>
            <div className="rounded-xl bg-emerald-50/70 p-4 border border-emerald-100 font-medium">
              ✅ Reserva hotéis, passeios e traslados.
            </div>
            <div className="rounded-xl bg-emerald-50/70 p-4 border border-emerald-100 font-medium">
              ✅ Guias especializados acompanham você.
            </div>
            <div className="rounded-xl bg-emerald-50/70 p-4 border border-emerald-100 font-medium">
              ✅ Atendimento personalizado do início ao fim.
            </div>
            <div className="rounded-xl bg-emerald-50/70 p-4 border border-emerald-100 font-medium">
              ✅ Mais segurança em todo o roteiro.
            </div>
            <div className="rounded-xl bg-emerald-50/70 p-4 border border-emerald-100 font-medium">
              ✅ Mais opções para aproveitar sua estadia.
            </div>
            <div className="rounded-xl bg-emerald-50/70 p-4 border border-emerald-100 font-medium">
              ✅ Um parceiro local sempre pronto para ajudar.
            </div>
          </div>
        </div>

        <footer className="mt-12 border-t border-slate-200 pt-8 text-center text-xs text-slate-500">
          © 2026 Encantos Rio Negro • Marketplace de Turismo Receptivo da Amazônia.
        </footer>

      </div>
    </main>
  );
}
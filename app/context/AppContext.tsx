'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ConfigContextType {
  config: {
    nome_sistema: string;
    tema: string;
    moeda: string;
    fuso_horario: string;
  };
  loading: boolean;
  atualizarConfig: () => void;
}

const AppContext = createContext<ConfigContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState({
    nome_sistema: 'Encantos Rio Negro - Gestão',
    tema: 'Escuro',
    moeda: 'BRL',
    fuso_horario: 'America/Manaus',
  });
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase.from('configuracoes').select('*').limit(1).single();
      if (!error && data) {
        setConfig({
          nome_sistema: data.nome_sistema || 'Encantos Rio Negro',
          tema: data.tema || 'Escuro',
          moeda: data.moeda || 'BRL',
          fuso_horario: data.fuso_horario || 'America/Manaus',
        });
      }
    } catch (err) {
      console.error('Erro ao carregar contexto global:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <AppContext.Provider value={{ config, loading, atualizarConfig: fetchConfig }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppConfig() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppConfig deve ser usado dentro de um AppProvider');
  return context;
}
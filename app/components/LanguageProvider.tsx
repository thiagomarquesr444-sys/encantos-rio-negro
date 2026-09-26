'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { Idioma } from '@/lib/i18n/types';

export type { Idioma } from '@/lib/i18n/types';

type LanguageContextType = {
  idioma: Idioma;
  setIdioma: (idioma: Idioma) => void;
};

const LanguageContext =
  createContext<LanguageContextType | null>(null);

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [idioma, setIdiomaState] =
    useState<Idioma>('PT');

  useEffect(() => {
    const salvo =
      window.localStorage.getItem(
        'ern-language'
      ) as Idioma | null;

    if (
      salvo === 'PT' ||
      salvo === 'EN' ||
      salvo === 'ES'
    ) {
      setIdiomaState(salvo);
    }
  }, []);

  const setIdioma = (novoIdioma: Idioma) => {
    setIdiomaState(novoIdioma);

    window.localStorage.setItem(
      'ern-language',
      novoIdioma
    );
  };

  const value = useMemo(
    () => ({
      idioma,
      setIdioma,
    }),
    [idioma]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context =
    useContext(LanguageContext);

  if (!context) {
    throw new Error(
      'useLanguage deve ser usado dentro de LanguageProvider'
    );
  }

  return context;
}
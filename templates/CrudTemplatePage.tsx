"use client";

import React from "react";

import CrudHeader from "./CrudHeader";
import CrudCards from "./CrudCards";
import CrudSearch from "./CrudSearch";
import CrudTable from "./CrudTable";
import CrudFooter from "./CrudFooter";

import {
  CrudCard,
  CrudColumn,
  CrudEntity,
} from "./types";

interface CrudTemplatePageProps<T extends CrudEntity> {
  titulo: string;
  subtitulo: string;

  cards: CrudCard[];

  dados: T[];

  colunas: CrudColumn<T>[];

  loading?: boolean;

  searchTerm: string;
  setSearchTerm: (value: string) => void;

  onNovo?: () => void;

  children?: React.ReactNode;
}

export default function CrudTemplatePage<T extends CrudEntity>({
  titulo,
  subtitulo,
  cards,
  dados,
  colunas,
  loading = false,
  searchTerm,
  setSearchTerm,
  onNovo,
  children,
}: CrudTemplatePageProps<T>) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-blue-50 p-6 md:p-12">
      <div className="mx-auto max-w-7xl">
        <CrudHeader
          titulo={titulo}
          subtitulo={subtitulo}
          onNovo={onNovo}
        />

        <CrudCards cards={cards} />

        <CrudSearch
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        >
          {children}
        </CrudSearch>

        <CrudTable
          dados={dados}
          colunas={colunas}
          loading={loading}
        />

        <CrudFooter totalRegistros={dados.length} />
      </div>
    </main>
  );
}
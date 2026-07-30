"use client";

import React from "react";

interface CrudFooterProps {
  totalRegistros: number;
}

export default function CrudFooter({
  totalRegistros,
}: CrudFooterProps) {
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

        <p className="text-sm text-emerald-700">
          ✅ Dados sincronizados com o banco de dados.
        </p>

        <p className="text-sm font-medium text-slate-600">
          Total de registros: <strong>{totalRegistros}</strong>
        </p>

      </div>

    </div>
  );
}
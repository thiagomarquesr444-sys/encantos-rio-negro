"use client";

import React from "react";

interface CrudHeaderProps {
  titulo: string;
  subtitulo: string;
  onNovo?: () => void;
}

export default function CrudHeader({
  titulo,
  subtitulo,
  onNovo,
}: CrudHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-4xl font-bold text-emerald-900">
          {titulo}
        </h1>

        <p className="mt-2 text-slate-600">
          {subtitulo}
        </p>
      </div>

      <button
        type="button"
        onClick={onNovo}
        className="rounded-xl bg-emerald-700 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-emerald-800"
      >
        ➕ Novo
      </button>
    </div>
  );
}
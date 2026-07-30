"use client";

import React from "react";

interface CrudSearchProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  children?: React.ReactNode;
}

export default function CrudSearch({
  searchTerm,
  setSearchTerm,
  children,
}: CrudSearchProps) {
  return (
    <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div className="flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar..."
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 outline-none transition focus:border-emerald-600 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {children}
        </div>

      </div>
    </div>
  );
}
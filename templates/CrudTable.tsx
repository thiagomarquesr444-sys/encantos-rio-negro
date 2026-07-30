"use client";

import React from "react";
import { CrudColumn, CrudEntity } from "./types";

interface CrudTableProps<T extends CrudEntity> {
  dados?: T[];
  colunas?: CrudColumn<T>[];
  loading?: boolean;
}

export default function CrudTable<T extends CrudEntity>({
  dados = [],
  colunas = [],
  loading = false,
}: CrudTableProps<T>) {
  // Garantia adicional de segurança para o colSpan
  const totalColunas = (colunas?.length || 0) + 1;

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-emerald-700 to-emerald-800">
            <tr>
              {colunas.map((coluna) => (
                <th
                  key={String(coluna.key)}
                  className="px-6 py-4 text-left text-sm font-semibold text-white"
                >
                  {coluna.label}
                </th>
              ))}

              <th className="px-6 py-4 text-center text-sm font-semibold text-white">
                Ações
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td
                  colSpan={totalColunas}
                  className="px-6 py-10 text-center text-slate-500"
                >
                  Carregando registros...
                </td>
              </tr>
            ) : dados.length > 0 ? (
              dados.map((item) => (
                <tr key={item.id} className="transition hover:bg-slate-50">
                  {colunas.map((coluna) => (
                    <td
                      key={String(coluna.key)}
                      className="px-6 py-4 text-sm text-slate-700"
                    >
                      {coluna.render
                        ? coluna.render(item)
                        : String(item[coluna.key] ?? "-")}
                    </td>
                  ))}

                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        className="rounded-lg bg-blue-100 p-2 text-blue-600 transition hover:bg-blue-200"
                        title="Visualizar"
                      >
                        👁️
                      </button>

                      <button
                        className="rounded-lg bg-emerald-100 p-2 text-emerald-600 transition hover:bg-emerald-200"
                        title="Editar"
                      >
                        ✏️
                      </button>

                      <button
                        className="rounded-lg bg-red-100 p-2 text-red-600 transition hover:bg-red-200"
                        title="Excluir"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={totalColunas}
                  className="px-6 py-10 text-center text-slate-500"
                >
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
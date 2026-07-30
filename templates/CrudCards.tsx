"use client";

import React from "react";

import { CrudCard } from "./types";

interface CrudCardsProps {
  cards: CrudCard[];
}

export default function CrudCards({
  cards,
}: CrudCardsProps) {
  return (
    <div className="mb-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`rounded-2xl border-l-4 bg-white p-6 shadow-lg transition hover:shadow-xl ${
            card.cor ?? "border-emerald-700 text-emerald-900"
          }`}
        >
          <p className="text-sm font-medium text-slate-600">
            {card.titulo}
          </p>

          <p className="mt-3 text-4xl font-bold">
            {card.valor}
          </p>

          {card.detalhe && (
            <p className="mt-2 text-xs text-slate-500">
              {card.detalhe}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
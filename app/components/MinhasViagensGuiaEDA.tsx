'use client';

// EDA_AGENDA_GUIA_V1: viagens em que o guia foi escalado pelas operadoras.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Viagem = { reserva_id: string; operadora: string | null; passeio: string | null; inicio: string; fim: string;
  horario: string | null; pessoas: number; ponto_embarque: string | null; embarcacao: string | null;
  alertas_graves: number; fichas_pendentes: number };

const dt = (d: string) => d.split('-').reverse().slice(0, 2).join('/');

export default function MinhasViagensGuiaEDA() {
  const [lista, setLista] = useState<Viagem[] | null>(null);
  useEffect(() => {
    supabase.rpc('minhas_viagens_guia_eda', { p_dias: 60 })
      .then(({ data, error }) => setLista(error ? [] : (data ?? []) as Viagem[]));
  }, []);

  return (
    <section className="mt-8 rounded-3xl border border-white/10 bg-[#0D1B16] p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E3A144]">Minhas viagens · próximos 60 dias</p>
      {lista === null ? <p className="mt-4 text-sm text-[#EDEDE3]/70">Carregando…</p> : lista.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-[#EDEDE3]/70">
          Nenhuma viagem escalada. Quando uma operadora vincular você a uma reserva, ela aparece aqui com data, embarque e grupo.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {lista.map((v) => (
            <li key={v.reserva_id} className="rounded-2xl border border-white/10 p-4">
              <p className="text-base font-semibold">{v.passeio || 'Viagem'} <span className="font-normal text-[#EDEDE3]/60">· {v.operadora}</span></p>
              <p className="mt-1 text-sm text-[#EDEDE3]/75">
                {v.inicio === v.fim ? dt(v.inicio) : `${dt(v.inicio)} a ${dt(v.fim)}`}{v.horario ? ` · ${v.horario.slice(0, 5)}` : ''}
                {' · '}{v.pessoas} pessoa(s){v.embarcacao ? ` · ${v.embarcacao}` : ''}{v.ponto_embarque ? ` · embarque: ${v.ponto_embarque}` : ''}
              </p>
              {(v.alertas_graves > 0 || v.fichas_pendentes > 0) && (
                <p className="mt-2 text-sm text-[#F4C77E]">
                  {v.alertas_graves > 0 && `${v.alertas_graves} participante(s) com alerta grave de saúde/segurança. `}
                  {v.fichas_pendentes > 0 && `${v.fichas_pendentes} ficha(s) pendente(s). `}
                  Confirme os detalhes com a operadora antes do embarque.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

'use client';

// EDA_AGENDA_GUIA_V1: viagens em que o guia foi escalado pelas operadoras.
// EDA_AGENDA_PROFISSIONAL_V1: uma linha por saída (não por reserva) e aceite da escala.
// Uma pessoa não fica em duas viagens ao mesmo tempo, mesmo atendendo várias operadoras.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import BordoEDA from '@/app/components/BordoEDA';
import { hojeManaus } from '@/lib/operacaoAoVivoEDA';

type Escala = 'pendente' | 'aceita' | 'recusada';
type Viagem = { reserva_id: string; chave: string; operadora: string | null; passeio: string | null; inicio: string; fim: string;
  horario: string | null; pessoas: number; reservas: number; ponto_embarque: string | null; embarcacao: string | null;
  alertas_graves: number; fichas_pendentes: number; papel?: string | null; escala: Escala; conflito: boolean };

const dt = (d: string) => d.split('-').reverse().slice(0, 2).join('/');
// EDA_OPERACAO_AO_VIVO_V1: painel de bordo liberado de um dia antes até um dia depois da viagem.
const somaDia = (d: string, n: number) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const naJanela = (v: { inicio: string; fim: string }) => { const h = hojeManaus(); return h >= somaDia(v.inicio, -1) && h <= somaDia(v.fim, 1); };

const ROTULO: Record<Escala, string> = { pendente: 'Aguardando você', aceita: 'Confirmada', recusada: 'Recusada' };

export default function MinhasViagensGuiaEDA() {
  const [lista, setLista] = useState<Viagem[] | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ chave: string; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc('minhas_viagens_guia_eda', { p_dias: 60 });
    setLista(error ? [] : (data ?? []) as Viagem[]);
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  async function responder(v: Viagem, aceitar: boolean) {
    setOcupado(v.chave); setAviso(null);
    const { error } = await supabase.rpc('responder_escala_eda', { p_chave: v.chave, p_aceitar: aceitar });
    setOcupado(null);
    if (error) {
      setAviso({ chave: v.chave, texto: error.hint === 'EDA_AGENDA_OCUPADA' ? error.message : 'Não consegui registrar sua resposta. Tente de novo quando o sinal estiver melhor.' });
      return;
    }
    await carregar();
  }

  return (
    <section className="mv mt-8 rounded-3xl border border-white/10 bg-[#0D1B16] p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E3A144]">Minhas viagens · próximos 60 dias</p>
      {lista === null ? <p className="mt-4 text-sm text-[#EDEDE3]/70">Carregando…</p> : lista.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-[#EDEDE3]/70">
          Nenhuma viagem por enquanto. Passe seu código EDA para a operadora: quando ela te escalar como guia ou te vincular à embarcação como prático, a viagem aparece aqui para você confirmar, e o painel de bordo abre no dia.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {lista.map((v) => (
            <li key={v.chave} className="rounded-2xl border border-white/10 p-4" data-escala={v.escala}>
              <p className="text-base font-semibold">
                {v.passeio || 'Viagem'} <span className="font-normal text-[#EDEDE3]/60">· {v.operadora}</span>
                {v.papel && <span className="mv-selo">{v.papel}</span>}
                <span className={`mv-selo mv-${v.escala}`}>{ROTULO[v.escala]}</span>
              </p>
              <p className="mt-1 text-sm text-[#EDEDE3]/75">
                {v.inicio === v.fim ? dt(v.inicio) : `${dt(v.inicio)} a ${dt(v.fim)}`}{v.horario ? ` · ${v.horario.slice(0, 5)}` : ''}
                {' · '}{v.pessoas} pessoa(s){v.reservas > 1 ? ` em ${v.reservas} reservas` : ''}
                {v.embarcacao ? ` · ${v.embarcacao}` : ''}{v.ponto_embarque ? ` · embarque: ${v.ponto_embarque}` : ''}
              </p>
              {(v.alertas_graves > 0 || v.fichas_pendentes > 0) && v.escala !== 'recusada' && (
                <p className="mt-2 text-sm text-[#F4C77E]">
                  {v.alertas_graves > 0 && `${v.alertas_graves} participante(s) com alerta grave de saúde/segurança. `}
                  {v.fichas_pendentes > 0 && `${v.fichas_pendentes} ficha(s) pendente(s). `}
                  Confirme os detalhes com a operadora antes do embarque.
                </p>
              )}

              {v.escala !== 'aceita' && (
                <div className="mv-resp">
                  {v.conflito ? (
                    <p className="text-sm text-[#F4C77E]">Você já confirmou outra viagem nesse período. Fale com a operadora para ela escalar outra pessoa.</p>
                  ) : (
                    <>
                      <span className="text-sm text-[#EDEDE3]/75">{v.escala === 'recusada' ? 'Você recusou esta viagem. Mudou de ideia?' : 'A operadora te escalou. Você vai?'}</span>
                      <button type="button" className="mv-bt" disabled={ocupado === v.chave} onClick={() => void responder(v, true)}>Aceitar</button>
                      {v.escala === 'pendente' && (
                        <button type="button" className="mv-bt" disabled={ocupado === v.chave} onClick={() => void responder(v, false)}>Recusar</button>
                      )}
                    </>
                  )}
                </div>
              )}
              {aviso?.chave === v.chave && <p className="mt-2 text-sm text-[#F4C77E]" role="status">{aviso.texto}</p>}

              {v.escala === 'aceita' && naJanela(v) && (
                <div className="mt-3">
                  <BordoEDA reservaId={v.reserva_id} titulo="Painel de bordo" />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <style jsx>{`
        .mv-selo { margin-left: 8px; display: inline-block; border-radius: 999px; border: 1px solid rgb(227 161 68 / 50%); padding: 1px 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: #e3a144; vertical-align: middle; }
        .mv-aceita { border-color: rgb(92 196 154 / 55%); color: #5cc49a; }
        .mv-recusada { border-color: rgb(237 237 227 / 30%); color: rgb(237 237 227 / 60%); }
        .mv-resp { margin-top: 10px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .mv-bt { min-height: 40px; padding: 0 18px; border-radius: 999px; border: 1px solid rgb(255 255 255 / 45%); background: transparent; color: #fff; font-weight: 600; cursor: pointer; }
        .mv-bt:disabled { opacity: .5; cursor: wait; }
        li[data-escala='recusada'] { opacity: .7; }
        @media (max-width: 639px) {
          .mv { padding: 14px; border-radius: 16px; }
          .mv li { padding: 12px; }
          .mv-bt { min-height: 36px; padding: 0 14px; font-size: 13px; }
        }
      `}</style>
    </section>
  );
}

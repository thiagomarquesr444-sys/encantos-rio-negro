'use client';

// EDA_RECURSOS_AGENDA_V1: agenda de um barco ou guia + conflitos e lotação.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { dataCurtaEDA } from '@/lib/passeiosPublicosEDA';
import {
  agendaRecursoEDA, conflitosEDA, faixasLotacao, lotacaoEDA,
  type AgendaRecursoEDA as Agenda, type ConflitoEDA, type TipoRecursoEDA,
} from '@/lib/recursosEDA';

function periodo(a: string, b: string) {
  return a === b ? dataCurtaEDA(a) : `${dataCurtaEDA(a)} – ${dataCurtaEDA(b)}`;
}

export default function AgendaRecursoEDA({ tipo, id, capacidade }: { tipo: TipoRecursoEDA; id: string; capacidade?: number | null }) {
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [conflitos, setConflitos] = useState<ConflitoEDA[]>([]);
  const [lotacao, setLotacao] = useState<ReturnType<typeof faixasLotacao>>([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let vivo = true;
    Promise.all([
      agendaRecursoEDA(tipo, id, 60),
      conflitosEDA(undefined, 60),
      tipo === 'embarcacao' ? lotacaoEDA(60) : Promise.resolve([]),
    ]).then(([a, c, l]) => {
      if (!vivo) return;
      setAgenda(a);
      setConflitos(c.filter((x) => x.recurso === tipo && x.recurso_id === id));
      setLotacao(faixasLotacao(l.filter((x) => x.embarcacao_id === id)));
    }).catch(() => { if (vivo) setErro('Não foi possível carregar a agenda.'); });
    return () => { vivo = false; };
  }, [tipo, id]);

  const nome = tipo === 'embarcacao' ? 'embarcação' : 'guia';

  return (
    <section className="ar">
      <header>
        <p className="ar-eb">Agenda dos próximos 60 dias</p>
        {agenda && (
          <span className="ar-selo" data-uso={agenda.em_uso_hoje || undefined}>
            {agenda.em_uso_hoje ? (tipo === 'guia' ? 'Em tour hoje' : 'Em uso hoje') : 'Livre hoje'}
          </span>
        )}
      </header>
      {erro && <p className="ar-nota">{erro}</p>}

      {conflitos.map((c) => (
        <p key={c.reserva_id + c.outra_reserva_id} className="ar-alerta" data-n="grave">
          Conflito em {periodo(c.inicio, c.fim)}: <Link href={`/reservas/editar/${c.reserva_id}`}>{c.reserva_cliente || 'reserva'}</Link>
          {' '}e <Link href={`/reservas/editar/${c.outra_reserva_id}`}>{c.outra_cliente || 'reserva'}</Link> usam a mesma {nome} em viagens diferentes.
        </p>
      ))}
      {lotacao.map((l) => (
        <p key={l.de} className="ar-alerta" data-n="atencao">
          Lotação em {periodo(l.de, l.ate)}: até {l.pico} pessoas para {l.capacidade} lugares.
        </p>
      ))}

      {agenda && agenda.itens.length === 0 && <p className="ar-nota">Nenhuma viagem marcada. Vincule {tipo === 'guia' ? 'o guia' : 'a embarcação'} na reserva.</p>}
      {agenda && agenda.itens.length > 0 && (
        <ul className="ar-lista">
          {agenda.itens.map((i) => (
            <li key={i.reserva_id}>
              <b>{periodo(i.inicio, i.fim)}{i.horario ? ` · ${i.horario.slice(0, 5)}` : ''}</b>
              <Link href={`/reservas/editar/${i.reserva_id}`}>{i.cliente || 'Reserva'}</Link>
              <span>{i.passeio || ''} · {i.pessoas} pessoa(s){capacidade ? ` / ${capacidade}` : ''}{i.status ? ` · ${i.status}` : ''}</span>
            </li>
          ))}
        </ul>
      )}

      <style jsx>{`
        .ar { margin: 16px 24px 0; padding: 16px; border-radius: 18px; border: 1px solid var(--ern-borda); background: var(--ern-suave); color: var(--ern-texto); display: grid; gap: 10px; }
        header { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .ar-eb { margin: 0; font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--ern-destaque); }
        .ar-selo { font-size: 12px; padding: 3px 10px; border-radius: 999px; border: 1px solid #22c55e; color: #4ade80; }
        .ar-selo[data-uso] { border-color: var(--ern-destaque); color: var(--ern-destaque); }
        .ar-nota { margin: 0; font-size: 12px; color: var(--ern-secundario); }
        .ar-alerta { margin: 0; padding: 8px 12px; border-radius: 12px; border-left: 4px solid var(--ern-destaque); background: var(--ern-painel); font-size: 13px; line-height: 1.5; }
        .ar-alerta[data-n='grave'] { border-left-color: #ef4444; }
        .ar-alerta :global(a), .ar-lista :global(a) { color: var(--ern-destaque); font-weight: 600; }
        .ar-lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
        .ar-lista li { display: flex; flex-wrap: wrap; gap: 4px 10px; padding: 8px 12px; border-radius: 12px; border: 1px solid var(--ern-borda); background: var(--ern-painel); font-size: 13px; }
        .ar-lista span { color: var(--ern-secundario); font-size: 12px; }
      `}</style>
    </section>
  );
}

// Alerta dentro da reserva: conflitos dela e lotação do barco nas datas.
export function AlertaRecursosReservaEDA({ reservaId, embarcacaoId }: { reservaId?: string; embarcacaoId?: string }) {
  const [conflitos, setConflitos] = useState<ConflitoEDA[]>([]);
  const [lotacao, setLotacao] = useState<ReturnType<typeof faixasLotacao>>([]);

  useEffect(() => {
    let vivo = true;
    if (!reservaId) return;
    Promise.all([conflitosEDA(reservaId), embarcacaoId ? lotacaoEDA(120) : Promise.resolve([])])
      .then(([c, l]) => {
        if (!vivo) return;
        setConflitos(c);
        setLotacao(faixasLotacao(l.filter((x) => x.embarcacao_id === embarcacaoId)));
      })
      .catch(() => { /* sem permissão: sem alerta */ });
    return () => { vivo = false; };
  }, [reservaId, embarcacaoId]);

  if (!conflitos.length && !lotacao.length) return null;
  return (
    <div role="alert" className="arr">
      {conflitos.map((c) => (
        <p key={c.recurso + c.outra_reserva_id}>
          <b>{c.recurso === 'guia' ? 'Guia' : 'Embarcação'} {c.recurso_nome}</b> também está em{' '}
          <Link href={`/reservas/editar/${c.outra_reserva_id}`}>{c.outra_cliente || 'outra reserva'}</Link>
          {c.outra_passeio ? ` (${c.outra_passeio})` : ''} em {periodo(c.inicio, c.fim)}.
        </p>
      ))}
      {lotacao.map((l) => (
        <p key={l.de}><b>{l.nome}</b> passa da lotação em {periodo(l.de, l.ate)}: {l.pico} pessoas para {l.capacidade} lugares.</p>
      ))}
      <small>Salve as alterações e confira a agenda da embarcação/guia para resolver.</small>
      <style jsx>{`
        .arr { display: grid; gap: 6px; padding: 12px 14px; border-radius: 14px; border: 1px solid #ef4444; background: rgb(239 68 68 / 10%); font-size: 13px; line-height: 1.5; }
        .arr p { margin: 0; } .arr small { color: var(--ern-secundario, #b4c8bb); }
        .arr :global(a) { color: var(--ern-destaque, #e3a144); font-weight: 600; }
      `}</style>
    </div>
  );
}

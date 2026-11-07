'use client';

// EDA_PASSEIOS_PREMIUM_V2: a reserva escolhe uma saída real do passeio.
// Ao escolher, data/horário/fim previsto vêm da saída e o banco controla as vagas.

import { useEffect, useState } from 'react';
import { dataCurtaEDA } from '@/lib/passeiosPublicosEDA';
import { listarSaidasGestaoEDA, type SaidaGestaoEDA } from '@/lib/saidasGestaoEDA';

type Props = {
  passeioId: string;
  saidaId: string;
  pessoas: number;
  reservaId?: string;
  bloqueado: boolean;
  onEscolher: (saida: SaidaGestaoEDA | null) => void;
  // Nova reserva: já escolhe a próxima saída com vagas suficientes.
  autoSelecionar?: boolean;
};

export default function SeletorSaidaEDA({ passeioId, saidaId, pessoas, reservaId, bloqueado, onEscolher, autoSelecionar = false }: Props) {
  const [saidas, setSaidas] = useState<SaidaGestaoEDA[] | null>(null);
  const [erro, setErro] = useState('');
  // EDA_RESERVA_COESA_V1: data fora da agenda só por escolha explícita (fretamento exclusivo).
  const [fretamento, setFretamento] = useState(false);

  useEffect(() => { setFretamento(false); }, [passeioId]);

  useEffect(() => {
    if (!autoSelecionar || !saidas || saidaId || fretamento || bloqueado) return;
    const proxima = saidas.find((s) => s.status === 'aberta' && s.restantes >= Math.max(1, pessoas));
    if (proxima) onEscolher(proxima);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saidas, autoSelecionar]);

  useEffect(() => {
    let ativo = true;
    setSaidas(null);
    setErro('');
    if (!passeioId) return;
    listarSaidasGestaoEDA(passeioId, { ignorarReservaId: reservaId, incluirId: saidaId || undefined })
      .then((lista) => { if (ativo) setSaidas(lista); })
      .catch((e: Error) => { if (ativo) { setErro(e.message); setSaidas([]); } });
    return () => { ativo = false; };
    // saidaId fica fora: recarregar a cada escolha só piscaria a lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passeioId, reservaId]);

  if (!passeioId) return null;

  const escolhida = saidas?.find((s) => s.id === saidaId) ?? null;
  const excede = escolhida && pessoas > escolhida.restantes;

  return (
    <section className="eda-seletor" aria-label="Saída do passeio">
      <p className="eda-seletor-tit">Saída do passeio</p>
      {erro && <span role="alert" className="eda-seletor-erro">{erro}</span>}
      {saidas === null && <span className="eda-seletor-nota">Consultando agenda…</span>}
      {saidas && saidas.length === 0 && !erro && (
        <span className="eda-seletor-nota">
          Este passeio não tem saídas abertas. Informe a data abaixo ou abra uma saída na página Passeios para controlar as vagas.
        </span>
      )}
      {saidas && saidas.length > 0 && (
        <div className="eda-seletor-lista" role="radiogroup">
          {saidas.map((s) => {
            const indisponivel = s.status !== 'aberta' || s.restantes <= 0;
            const atual = s.id === saidaId;
            return (
              <button key={s.id} type="button" role="radio" aria-checked={atual}
                disabled={bloqueado || (indisponivel && !atual)} onClick={() => onEscolher(s)}>
                <strong>
                  {dataCurtaEDA(s.data_inicio)}
                  {s.data_fim && s.data_fim !== s.data_inicio ? ` – ${dataCurtaEDA(s.data_fim)}` : ''}
                  {s.horario ? ` · ${s.horario.slice(0, 5)}` : ''}
                </strong>
                <small>
                  {s.status === 'cancelada' ? 'Cancelada' : s.status === 'fechada' ? 'Fechada'
                    : s.restantes <= 0 ? 'Lotada' : `${s.restantes} de ${s.vagas_total} livres`}
                </small>
              </button>
            );
          })}
        </div>
      )}
      {saidas && saidas.length > 0 && (
        fretamento || !saidaId ? (
          <span className="eda-seletor-aviso">
            <strong>Data fora da agenda.</strong> Use só para viagem exclusiva (fretamento): as vagas das saídas não são controladas e a data é informada abaixo.
            {' '}<button type="button" className="eda-seletor-link" disabled={bloqueado} onClick={() => { setFretamento(false); const p = saidas.find((x) => x.status === 'aberta' && x.restantes >= Math.max(1, pessoas)); if (p) onEscolher(p); }}>Voltar para a agenda</button>
          </span>
        ) : (
          <button type="button" className="eda-seletor-link" disabled={bloqueado} onClick={() => { setFretamento(true); onEscolher(null); }}>
            Data fora da agenda (fretamento exclusivo)
          </button>
        )
      )}
      {excede && (
        <span role="alert" className="eda-seletor-erro">
          Esta saída tem {escolhida.restantes} vaga{escolhida.restantes === 1 ? '' : 's'} livre{escolhida.restantes === 1 ? '' : 's'} para {pessoas} pessoa(s).
        </span>
      )}
      {escolhida && !excede && (
        <span className="eda-seletor-nota">Data e horário definidos pela saída. As vagas são reservadas ao salvar.</span>
      )}

      <style jsx>{`
        .eda-seletor { display: grid; gap: 8px; padding: 14px; border-radius: 16px; border: 1px solid var(--ern-borda, rgb(237 237 227 / 14%)); }
        .eda-seletor-tit { margin: 0; font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--ern-destaque, #e3a144); }
        .eda-seletor-nota { font-size: 12px; line-height: 1.6; color: var(--ern-secundario, #b4c8bb); }
        .eda-seletor-erro { font-size: 12px; color: var(--ern-erro, #f87171); }
        .eda-seletor-aviso { font-size: 12px; line-height: 1.6; padding: 8px 10px; border-radius: 10px; border: 1px solid rgb(227 161 68 / 45%); }
        .eda-seletor-link { all: unset; cursor: pointer; justify-self: start; font-size: 12px; text-decoration: underline; color: var(--ern-destaque, #e3a144); }
        .eda-seletor-link:disabled { opacity: .5; cursor: not-allowed; }
        .eda-seletor-lista { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: thin; }
        button { flex: none; display: grid; gap: 2px; min-width: 120px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--ern-borda, rgb(237 237 227 / 14%)); background: transparent; color: inherit; text-align: left; cursor: pointer; }
        button strong { font-size: 13px; } button small { font-size: 11px; color: var(--ern-secundario, #b4c8bb); }
        button[aria-checked='true'] { border-color: var(--ern-destaque, #e3a144); background: rgb(227 161 68 / 12%); }
        button:disabled { opacity: .45; cursor: not-allowed; }
      `}</style>
    </section>
  );
}

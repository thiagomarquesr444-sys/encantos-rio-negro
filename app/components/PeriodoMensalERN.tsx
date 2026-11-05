'use client';

// ERN_PERIODO_MENSAL_V1
// Seletor "‹ Mês ›  Mês atual  Histórico" usado em todas as listas da gestão,
// e selo de expiração padronizado.

import './periodo-mensal-eda.css';
import {
  HISTORICO_ERN,
  deslocarMesERN,
  diasParaExpirarERN,
  hojeManausERN,
  mesAtualERN,
  mesValidoERN,
  rotuloMesERN,
  type PeriodoMensalERN,
} from '@/lib/periodoMensalERN';

export function SeletorPeriodoMensalERN({
  valor,
  aoMudar,
  rotulo = 'Período',
  total,
}: {
  valor: PeriodoMensalERN;
  aoMudar: (periodo: PeriodoMensalERN) => void;
  rotulo?: string;
  total?: number;
}) {
  const historico = valor === HISTORICO_ERN;
  const mesValido = mesValidoERN(valor);
  // Qualquer outro valor = intervalo vindo do painel (ex.: atalhos do dashboard).
  const personalizado = !historico && !mesValido;
  const atual = mesAtualERN();
  const mesBase = mesValido ? valor : atual;
  const ehAtual = mesValido && valor === atual;

  return (
    <div className="ern-periodo" role="group" aria-label={rotulo}>
      <div className="ern-periodo-mes">
        <button
          type="button"
          className="ern-periodo-seta"
          aria-label="Mês anterior"
          onClick={() => aoMudar(deslocarMesERN(mesBase, -1))}
        >
          ‹
        </button>
        <label className="ern-periodo-rotulo">
          <span className="sr-only">Escolher mês</span>
          <input
            type="month"
            value={mesValido ? valor : ''}
            onChange={(e) => {
              const v = e.target.value;
              aoMudar(mesValidoERN(v) ? v : atual);
            }}
            aria-label="Escolher mês"
            onClick={(e) => {
              try {
                e.currentTarget.showPicker?.();
              } catch {
                /* navegador sem showPicker: setas continuam funcionando */
              }
            }}
          />
          <b aria-live="polite">{personalizado ? 'Período do painel' : rotuloMesERN(valor)}</b>
        </label>
        <button
          type="button"
          className="ern-periodo-seta"
          aria-label="Próximo mês"
          onClick={() => aoMudar(deslocarMesERN(mesBase, 1))}
        >
          ›
        </button>
      </div>
      <button
        type="button"
        className="ern-periodo-chip"
        aria-pressed={ehAtual}
        onClick={() => aoMudar(atual)}
      >
        Mês atual
      </button>
      <button
        type="button"
        className="ern-periodo-chip"
        aria-pressed={historico}
        onClick={() => aoMudar(HISTORICO_ERN)}
      >
        Histórico
      </button>
      {typeof total === 'number' && (
        <span className="ern-periodo-total">
          {total} {total === 1 ? 'registro' : 'registros'}
        </span>
      )}
    </div>
  );
}

function dataBR(dia: string) {
  const [a, m, d] = dia.slice(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : dia;
}

/** Selo com a data de expiração: válido, expira em breve ou expirado. */
export function SeloExpiracaoERN({
  data,
  hoje = hojeManausERN(),
  rotulo = 'Expira',
  semData = 'Sem data de expiração',
  avisoDias = 7,
}: {
  data: string | null | undefined;
  hoje?: string;
  rotulo?: string;
  semData?: string;
  avisoDias?: number;
}) {
  const dias = diasParaExpirarERN(data, hoje);
  if (dias === null || !data) {
    return <span className="ern-expira ern-expira-nt">{semData}</span>;
  }
  if (dias < 0) {
    return (
      <span className="ern-expira ern-expira-er" title={`Expirou em ${dataBR(data)}`}>
        Expirado em {dataBR(data)}
      </span>
    );
  }
  if (dias <= avisoDias) {
    return (
      <span className="ern-expira ern-expira-at">
        {dias === 0 ? `Expira hoje (${dataBR(data)})` : `${rotulo} em ${dias} ${dias === 1 ? 'dia' : 'dias'} · ${dataBR(data)}`}
      </span>
    );
  }
  return (
    <span className="ern-expira ern-expira-ok">
      {rotulo} {dataBR(data)}
    </span>
  );
}

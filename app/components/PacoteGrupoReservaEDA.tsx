'use client';

// EDA_PACOTE_GRUPO_V1: venda individual ou pacote de grupo (turistas de outros estados que fecham
// o pacote com a operadora, direto ou por agência). Uma reserva para o grupo inteiro.

import CampoOpcoesEDA from '@/app/components/CampoOpcoesEDA';
import { ORIGENS_GRUPO } from '@/lib/opcoesEDA';

export type PacoteGrupoEDA = {
  modalidade: 'individual' | 'pacote_grupo';
  grupo_nome: string;
  grupo_origem: string;
  grupo_responsavel: string;
  grupo_contato: string;
};

export const PACOTE_VAZIO: PacoteGrupoEDA = { modalidade: 'individual', grupo_nome: '', grupo_origem: '', grupo_responsavel: '', grupo_contato: '' };

export function pacoteDaReserva(r: Partial<Record<keyof PacoteGrupoEDA, unknown>>): PacoteGrupoEDA {
  const t = (x: unknown) => (typeof x === 'string' ? x : '');
  return {
    modalidade: r.modalidade === 'pacote_grupo' ? 'pacote_grupo' : 'individual',
    grupo_nome: t(r.grupo_nome), grupo_origem: t(r.grupo_origem), grupo_responsavel: t(r.grupo_responsavel), grupo_contato: t(r.grupo_contato),
  };
}

export function pacoteParaGravar(p: PacoteGrupoEDA) {
  const g = p.modalidade === 'pacote_grupo';
  const c = (x: string, n: number) => (g && x.trim() ? x.trim().slice(0, n) : null);
  return {
    modalidade: p.modalidade,
    grupo_nome: c(p.grupo_nome, 120), grupo_origem: c(p.grupo_origem, 80),
    grupo_responsavel: c(p.grupo_responsavel, 120), grupo_contato: c(p.grupo_contato, 40),
  };
}

export function erroPacote(p: PacoteGrupoEDA): string | null {
  if (p.modalidade !== 'pacote_grupo') return null;
  if (p.grupo_nome.trim().length < 2) return 'Informe o nome do grupo do pacote.';
  return null;
}

export default function PacoteGrupoReservaEDA({ valor, onChange, bloqueado, inputClass, labelClass }: {
  valor: PacoteGrupoEDA; onChange: (v: PacoteGrupoEDA) => void; bloqueado?: boolean; inputClass: string; labelClass: string;
}) {
  const grupo = valor.modalidade === 'pacote_grupo';
  const muda = (c: Partial<PacoteGrupoEDA>) => onChange({ ...valor, ...c });
  return (
    <div className="pg">
      <div className="pg-seg" role="radiogroup" aria-label="Tipo de venda">
        <button type="button" role="radio" aria-checked={!grupo} disabled={bloqueado} onClick={() => muda({ modalidade: 'individual' })}>
          <b>Individual</b><small>Cliente com família ou amigos</small>
        </button>
        <button type="button" role="radio" aria-checked={grupo} disabled={bloqueado} onClick={() => muda({ modalidade: 'pacote_grupo' })}>
          <b>Pacote de grupo</b><small>Grupo fechado, direto ou por agência</small>
        </button>
      </div>
      {grupo && (
        <div className="pg-campos">
          <div>
            <label htmlFor="pg-nome" className={labelClass}>Nome do grupo *</label>
            <input id="pg-nome" className={inputClass} value={valor.grupo_nome} maxLength={120} disabled={bloqueado}
              placeholder="Ex.: Pescadores de Campinas — jan/2027" onChange={(e) => muda({ grupo_nome: e.target.value })} />
          </div>
          <div>
            <label htmlFor="pg-origem" className={labelClass}>Origem do grupo</label>
            <CampoOpcoesEDA id="pg-origem" valor={valor.grupo_origem} opcoes={ORIGENS_GRUPO} className={inputClass}
              placeholder="Estado de onde vêm" disabled={bloqueado} onChange={(v) => muda({ grupo_origem: v })} />
          </div>
          <div>
            <label htmlFor="pg-resp" className={labelClass}>Responsável do grupo</label>
            <input id="pg-resp" className={inputClass} value={valor.grupo_responsavel} maxLength={120} disabled={bloqueado}
              placeholder="Quem fala pelo grupo" onChange={(e) => muda({ grupo_responsavel: e.target.value })} />
          </div>
          <div>
            <label htmlFor="pg-contato" className={labelClass}>WhatsApp do responsável</label>
            <input id="pg-contato" className={inputClass} value={valor.grupo_contato} maxLength={40} inputMode="tel" disabled={bloqueado}
              placeholder="(DDD) número" onChange={(e) => muda({ grupo_contato: e.target.value })} />
          </div>
          <p className="pg-nota">
            O valor da reserva é o <b>valor fechado do pacote</b>. Depois de salvar, cole a lista de turistas em <b>Participantes</b>: cada um ganha ficha de saúde, entra no voucher e conta para a saída, as demandas e a Operação ao vivo. Se veio por agência, informe-a em Agência / Parceiro.
          </p>
        </div>
      )}
      <style jsx>{`
        .pg { display: grid; gap: 14px; }
        .pg-seg { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .pg-seg button { display: grid; gap: 2px; text-align: left; padding: 12px 14px; border-radius: 16px; border: 1px solid var(--p-borda, var(--ern-borda)); background: transparent; color: var(--p-texto, var(--ern-texto)); cursor: pointer; }
        .pg-seg button small { font-size: 12px; color: var(--p-sec, var(--ern-secundario)); }
        .pg-seg button[aria-checked='true'] { border-color: #e3a144; background: rgb(227 161 68 / 12%); box-shadow: 0 0 0 1px #e3a144 inset; }
        .pg-campos { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .pg-nota { grid-column: 1 / -1; margin: 0; font-size: 12.5px; line-height: 1.6; color: var(--p-sec, var(--ern-secundario)); }
        @media (max-width: 640px) { .pg-campos { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

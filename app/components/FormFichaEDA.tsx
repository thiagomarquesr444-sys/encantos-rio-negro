'use client';

// EDA_FICHA_SAUDE_V1: formulário da ficha de saúde e segurança.
// Usado pela operadora (gestão) e pelo turista (link pré-viagem).

import { useState, type FormEvent } from 'react';
import { ALERGIAS, CONDICOES, RESTRICOES, type FichaEDA } from '@/lib/fichaSaudeEDA';

type Props = {
  inicial: FichaEDA;
  textoConsentimento: string;
  textoBotao: string;
  salvando: boolean;
  onSalvar: (ficha: FichaEDA) => void;
  onCancelar?: () => void;
  // operadora pode salvar ficha parcial (o resumo aponta o que falta).
  modo?: 'turista' | 'operadora';
};

function Opcoes({ lista, marcados, onChange, nome }: {
  lista: readonly (readonly [string, string])[]; marcados: string[]; onChange: (v: string[]) => void; nome: string;
}) {
  return (
    <div className="ff-chips" role="group" aria-label={nome}>
      {lista.map(([valor, rotulo]) => {
        const ativo = marcados.includes(valor);
        return (
          <button key={valor} type="button" aria-pressed={ativo}
            onClick={() => onChange(ativo ? marcados.filter((m) => m !== valor) : [...marcados, valor])}>
            {rotulo}
          </button>
        );
      })}
    </div>
  );
}

export default function FormFichaEDA({ inicial, textoConsentimento, textoBotao, salvando, onSalvar, onCancelar, modo = 'turista' }: Props) {
  const [f, setF] = useState<FichaEDA>(inicial);
  const [consentiu, setConsentiu] = useState(false);
  const [erro, setErro] = useState('');
  const set = <K extends keyof FichaEDA>(k: K, v: FichaEDA[K]) => setF((a) => ({ ...a, [k]: v }));

  const temAlgo = f.restricoes_alimentares.length + f.alergias.length + f.condicoes.length > 0;

  function enviar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    const turista = modo === 'turista';
    if (turista && f.sabe_nadar === null) { setErro('Informe se a pessoa sabe nadar — é essencial nos passeios de barco.'); return; }
    if (f.alergias.length > 0 && !f.alergia_gravidade) { setErro('Informe a gravidade da alergia.'); return; }
    if (turista && !temAlgo && !f.sem_restricoes) { setErro('Marque as restrições ou confirme “Nenhuma restrição ou condição”.'); return; }
    if (turista && !f.contato_emergencia_telefone.trim()) { setErro('Informe um telefone de contato de emergência.'); return; }
    if (!consentiu) { setErro('Marque o consentimento para enviar.'); return; }
    onSalvar({ ...f, sem_restricoes: temAlgo ? false : f.sem_restricoes });
  }

  return (
    <form className="ff" onSubmit={enviar}>
      <fieldset disabled={salvando}>
        <div className="ff-bloco">
          <p className="ff-tit">Alimentação</p>
          <Opcoes nome="Restrições alimentares" lista={RESTRICOES} marcados={f.restricoes_alimentares}
            onChange={(v) => { set('restricoes_alimentares', v); if (v.length) set('sem_restricoes', false); }} />
        </div>

        <div className="ff-bloco">
          <p className="ff-tit">Alergias</p>
          <Opcoes nome="Alergias" lista={ALERGIAS} marcados={f.alergias}
            onChange={(v) => { set('alergias', v); if (v.length) set('sem_restricoes', false); }} />
          {f.alergias.length > 0 && (
            <>
              <div className="ff-chips" role="radiogroup" aria-label="Gravidade">
                {(['leve', 'moderada', 'grave'] as const).map((g) => (
                  <button key={g} type="button" role="radio" aria-checked={f.alergia_gravidade === g}
                    data-grave={g === 'grave' || undefined} onClick={() => set('alergia_gravidade', g)}>
                    {g === 'grave' ? 'Grave (risco de anafilaxia)' : g[0].toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </div>
              <input maxLength={500} placeholder="A quê? Ex.: camarão, dipirona, abelha" value={f.alergias_detalhe}
                onChange={(e) => set('alergias_detalhe', e.target.value)} />
            </>
          )}
        </div>

        <div className="ff-bloco">
          <p className="ff-tit">Condições de saúde</p>
          <Opcoes nome="Condições" lista={CONDICOES} marcados={f.condicoes}
            onChange={(v) => { set('condicoes', v); if (v.length) set('sem_restricoes', false); }} />
          {f.condicoes.length > 0 && (
            <input maxLength={500} placeholder="Detalhes importantes para a equipe" value={f.condicoes_detalhe}
              onChange={(e) => set('condicoes_detalhe', e.target.value)} />
          )}
          <input maxLength={300} placeholder="Medicação de uso contínuo (se houver)" value={f.medicacao_continua}
            onChange={(e) => set('medicacao_continua', e.target.value)} />
        </div>

        {!temAlgo && (
          <label className="ff-check">
            <input type="checkbox" checked={f.sem_restricoes} onChange={(e) => set('sem_restricoes', e.target.checked)} />
            Nenhuma restrição alimentar, alergia ou condição de saúde
          </label>
        )}

        <div className="ff-bloco">
          <p className="ff-tit">Sabe nadar?</p>
          <div className="ff-chips" role="radiogroup" aria-label="Sabe nadar">
            <button type="button" role="radio" aria-checked={f.sabe_nadar === true} onClick={() => set('sabe_nadar', true)}>Sim</button>
            <button type="button" role="radio" aria-checked={f.sabe_nadar === false} data-grave onClick={() => set('sabe_nadar', false)}>Não</button>
          </div>
        </div>

        <div className="ff-bloco ff-grade">
          <p className="ff-tit">Contato de emergência</p>
          <input maxLength={120} placeholder="Nome" value={f.contato_emergencia_nome}
            onChange={(e) => set('contato_emergencia_nome', e.target.value)} />
          <input maxLength={30} inputMode="tel" placeholder={modo === 'turista' ? 'Telefone com DDD *' : 'Telefone com DDD'} value={f.contato_emergencia_telefone}
            onChange={(e) => set('contato_emergencia_telefone', e.target.value)} />
          <input maxLength={120} placeholder="Plano de saúde (opcional)" value={f.plano_saude}
            onChange={(e) => set('plano_saude', e.target.value)} />
        </div>

        <textarea maxLength={500} rows={2} placeholder="Algo mais que a equipe precise saber?" value={f.observacoes}
          onChange={(e) => set('observacoes', e.target.value)} />

        <label className="ff-check">
          <input type="checkbox" checked={consentiu} onChange={(e) => setConsentiu(e.target.checked)} />
          {textoConsentimento}
        </label>

        {erro && <p role="alert" className="ff-erro">{erro}</p>}

        <div className="ff-acoes">
          {onCancelar && <button type="button" className="ff-bt" onClick={onCancelar}>Cancelar</button>}
          <button type="submit" className="ff-bt ff-bt-ouro">{salvando ? 'Salvando…' : textoBotao}</button>
        </div>
      </fieldset>

      <style jsx>{`
        .ff fieldset { border: 0; margin: 0; padding: 0; display: grid; gap: 14px; min-width: 0; }
        .ff-bloco { display: grid; gap: 8px; }
        .ff-grade { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
        .ff-grade .ff-tit { grid-column: 1 / -1; }
        .ff-tit { margin: 0; font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--ern-destaque, #e3a144); }
        .ff-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .ff-chips button, .ff-bt { min-height: 36px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--ern-borda, rgb(237 237 227 / 18%)); background: transparent; color: inherit; font-size: 13px; cursor: pointer; }
        .ff-chips button[aria-pressed='true'], .ff-chips button[aria-checked='true'] { border-color: var(--ern-destaque, #e3a144); background: rgb(227 161 68 / 16%); font-weight: 600; }
        .ff-chips button[data-grave][aria-checked='true'] { border-color: #ef4444; background: rgb(239 68 68 / 16%); }
        input:not([type='checkbox']), textarea { width: 100%; min-height: 42px; padding: 8px 12px; border-radius: 12px; border: 1px solid var(--ern-borda, rgb(237 237 227 / 18%)); background: transparent; color: inherit; font-size: 14px; font-family: inherit; }
        .ff-check { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; line-height: 1.5; }
        .ff-check input { margin-top: 3px; width: 18px; height: 18px; flex: none; accent-color: var(--ern-destaque, #e3a144); }
        .ff-erro { margin: 0; font-size: 13px; color: #f87171; }
        .ff-acoes { display: flex; justify-content: flex-end; gap: 8px; }
        .ff-bt-ouro { background: var(--ern-destaque, #e3a144); border-color: var(--ern-destaque, #e3a144); color: #10140f; font-weight: 700; }
      `}</style>
    </form>
  );
}

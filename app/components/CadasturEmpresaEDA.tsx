'use client';

/*
  EDA_CONFORMIDADE_V1 — Cadastur da operadora (opcional).
  Fica dentro do formulário de Configurações, por isso salva com
  botão próprio (type="button") e não aninha outro <form>.
*/
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Props = {
  empresaId: string;
  painel: string;
  campo: string;
  botao: string;
};

export default function CadasturEmpresaEDA({ empresaId, painel, campo, botao }: Props) {
  const [numero, setNumero] = useState('');
  const [validade, setValidade] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    let ativo = true;
    supabase
      .from('empresa')
      .select('cadastur_numero, cadastur_validade')
      .eq('id', empresaId)
      .maybeSingle()
      .then(({ data }) => {
        if (!ativo || !data) return;
        setNumero(data.cadastur_numero ?? '');
        setValidade(data.cadastur_validade ?? '');
      });
    return () => {
      ativo = false;
    };
  }, [empresaId]);

  async function salvar() {
    setAviso(null);
    const limpo = numero.trim();
    if (limpo.length > 40) {
      setAviso({ tipo: 'erro', texto: 'O número do Cadastur tem no máximo 40 caracteres.' });
      return;
    }
    setSalvando(true);
    const { error } = await supabase
      .from('empresa')
      .update({ cadastur_numero: limpo || null, cadastur_validade: limpo && validade ? validade : null })
      .eq('id', empresaId);
    setSalvando(false);
    setAviso(
      error
        ? { tipo: 'erro', texto: 'Não foi possível salvar o Cadastur. Tente novamente.' }
        : { tipo: 'ok', texto: limpo ? 'Cadastur salvo. O selo aparece no seu perfil público.' : 'Cadastur removido.' }
    );
  }

  const vencido = validade && validade < new Date().toISOString().slice(0, 10);

  return (
    <section className={painel} aria-labelledby="titulo-cadastur">
      <h2 id="titulo-cadastur" className="text-lg font-semibold">
        Cadastur da empresa
      </h2>
      <p className="mt-1 text-xs leading-6 text-[var(--cfg-secundario)]">
        Opcional. O cadastro no Ministério do Turismo passa confiança ao turista e mostra o selo
        &quot;Cadastur informado&quot; no seu perfil público. A EDA avisa 30 dias antes de vencer.
      </p>

      <div className="mt-5 grid min-w-0 gap-5 sm:grid-cols-2">
        <label className="min-w-0 text-sm">
          Número do Cadastur
          <input
            value={numero}
            maxLength={40}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="Ex.: 12.345678.10.0001-2"
            className={campo}
          />
        </label>
        <label className="min-w-0 text-sm">
          Válido até
          <input
            type="date"
            value={validade}
            onChange={(e) => setValidade(e.target.value)}
            disabled={!numero.trim()}
            className={campo}
          />
        </label>
      </div>

      {vencido && (
        <p className="mt-3 text-xs font-semibold text-red-400">
          Este Cadastur está vencido. Renove no site do Ministério do Turismo.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={salvar} disabled={salvando} className={botao}>
          {salvando ? 'Salvando…' : 'Salvar Cadastur'}
        </button>
        {aviso && (
          <span className={`text-xs ${aviso.tipo === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
            {aviso.texto}
          </span>
        )}
      </div>
    </section>
  );
}

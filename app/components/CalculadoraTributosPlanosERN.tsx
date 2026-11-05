'use client';

// ERN_CALCULADORA_TRIBUTOS_PLANOS_V1
// Ferramenta interna da plataforma (apenas Comando EDA): estima o imposto
// que a EDA pagará sobre a venda de cada plano e o valor líquido.
// Visibilidade checada no servidor via RPC tem_acesso_editorial_ern.
// Só lê preços públicos (precos_planos, RLS: ativo = true); nada é gravado.
// Estimativa: não substitui contador.

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Preco = { nome: string; ciclo: string; valor: number };
type Regime = 'anexo3' | 'anexo5' | 'personalizado';

const REGIMES: Record<Exclude<Regime, 'personalizado'>, { rotulo: string; aliquota: number }> = {
  anexo3: { rotulo: 'Simples — Anexo III (Fator R ≥ 28%)', aliquota: 6 },
  anexo5: { rotulo: 'Simples — Anexo V (Fator R < 28%)', aliquota: 15.5 },
};
const MESES: Record<string, number> = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };

const moeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = (s: string) => {
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export default function CalculadoraTributosPlanosERN() {
  const [autorizado, setAutorizado] = useState(false);
  const [precos, setPrecos] = useState<Preco[]>([]);
  const [erro, setErro] = useState('');
  const [regime, setRegime] = useState<Regime>('anexo3');
  const [aliquotaLivre, setAliquotaLivre] = useState('6');
  const [taxaFixa, setTaxaFixa] = useState('0');
  const [taxaPercentual, setTaxaPercentual] = useState('0');

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user || auth.user.is_anonymous) return;
      const { data: ok, error } = await supabase.rpc('tem_acesso_editorial_ern');
      if (!ativo || error || ok !== true) return;
      setAutorizado(true);
      const [{ data: planos, error: e1 }, { data: lista, error: e2 }] = await Promise.all([
        supabase.from('planos').select('id,nome'),
        supabase.from('precos_planos').select('plano_id,ciclo_cobranca,valor').eq('ativo', true),
      ]);
      if (!ativo) return;
      if (e1 || e2 || !planos || !lista) {
        setErro('Não foi possível carregar os preços dos planos.');
        return;
      }
      const nomes = new Map(planos.map((p) => [String(p.id), String(p.nome)]));
      setPrecos(
        lista
          .map((p) => ({
            nome: nomes.get(String(p.plano_id)) ?? 'Plano',
            ciclo: String(p.ciclo_cobranca ?? ''),
            valor: Number(p.valor),
          }))
          .filter((p) => Number.isFinite(p.valor) && p.valor > 0)
          .sort((a, b) => a.nome.localeCompare(b.nome) || (MESES[a.ciclo] ?? 99) - (MESES[b.ciclo] ?? 99)),
      );
    })();
    return () => { ativo = false; };
  }, []);

  const aliquota = regime === 'personalizado'
    ? Math.min(numero(aliquotaLivre), 100)
    : REGIMES[regime].aliquota;

  const linhas = useMemo(() => precos.map((p) => {
    const imposto = p.valor * (aliquota / 100);
    const taxa = numero(taxaFixa) + p.valor * (Math.min(numero(taxaPercentual), 100) / 100);
    const liquido = p.valor - imposto - taxa;
    const meses = MESES[p.ciclo] ?? 1;
    return { ...p, imposto, taxa, liquido, liquidoMes: liquido / meses };
  }), [precos, aliquota, taxaFixa, taxaPercentual]);

  if (!autorizado) return null;

  const campo = 'mt-1 min-h-10 w-full rounded-lg border border-white/15 bg-[#101616] px-3 text-sm text-[#F1F4EF]';

  return (
    <section aria-label="Calculadora de tributos dos planos" className="mt-8 rounded-2xl border border-[#E3A144]/25 bg-[#151A1B] p-5 text-[#F1F4EF]">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#E9B76B]">Comando EDA · interno</p>
      <h3 className="mt-2 text-lg font-semibold">Tributos sobre a venda dos planos</h3>
      <p className="mt-1 max-w-3xl text-xs leading-5 text-[#A6B4AE]">
        Estimativa da nota que a EDA emitirá às operadoras (SaaS, CNAE 6203-1/00 como referência).
        Alíquotas da 1ª faixa do Simples (receita até R$ 180 mil/ano), já com ISS. Visível só para a conta da plataforma. Confirme com seu contador.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs">Regime
          <select className={campo} value={regime} onChange={(e) => setRegime(e.target.value as Regime)}>
            {Object.entries(REGIMES).map(([k, r]) => <option key={k} value={k}>{r.rotulo} · {r.aliquota}%</option>)}
            <option value="personalizado">Alíquota personalizada</option>
          </select>
        </label>
        {regime === 'personalizado' && (
          <label className="text-xs">Alíquota (%)
            <input className={campo} inputMode="decimal" value={aliquotaLivre} onChange={(e) => setAliquotaLivre(e.target.value)} />
          </label>
        )}
        <label className="text-xs">Taxa fixa Asaas por cobrança (R$)
          <input className={campo} inputMode="decimal" value={taxaFixa} onChange={(e) => setTaxaFixa(e.target.value)} />
        </label>
        <label className="text-xs">Taxa Asaas (%)
          <input className={campo} inputMode="decimal" value={taxaPercentual} onChange={(e) => setTaxaPercentual(e.target.value)} />
        </label>
      </div>
      <p className="mt-2 text-[11px] text-[#94A5A1]">Preencha as taxas conforme o seu contrato no Asaas (variam por meio de pagamento).</p>

      {erro && <p role="alert" className="mt-4 text-sm text-rose-300">{erro}</p>}

      {!erro && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="text-[#94A5A1]">
              <tr>{['Plano', 'Ciclo', 'Preço', `Imposto (${aliquota}%)`, 'Taxa Asaas', 'Líquido', 'Líquido/mês'].map((t) => <th key={t} scope="col" className="py-2 pr-3 font-medium">{t}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {linhas.map((l) => (
                <tr key={`${l.nome}-${l.ciclo}`}>
                  <td className="py-2 pr-3 font-medium">{l.nome}</td>
                  <td className="py-2 pr-3 capitalize">{l.ciclo}</td>
                  <td className="py-2 pr-3 tabular-nums">{moeda(l.valor)}</td>
                  <td className="py-2 pr-3 tabular-nums text-amber-300">− {moeda(l.imposto)}</td>
                  <td className="py-2 pr-3 tabular-nums text-amber-300">− {moeda(l.taxa)}</td>
                  <td className={`py-2 pr-3 font-semibold tabular-nums ${l.liquido < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{moeda(l.liquido)}</td>
                  <td className="py-2 pr-3 tabular-nums">{moeda(l.liquidoMes)}</td>
                </tr>
              ))}
              {!linhas.length && <tr><td colSpan={7} className="py-3 text-[#94A5A1]">Nenhum preço ativo encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

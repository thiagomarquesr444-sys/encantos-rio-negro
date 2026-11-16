'use client';

/*
  EDA_FORNECEDORES_OPERADORA_V1 — na demanda de suprimentos, a operadora encontra
  fornecedores da Rede (alimentos, mercado, bebidas, gelo, combustível…) e chama
  direto no WhatsApp. Sem intermediação nem comissão.
*/
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Fornecedor = {
  usuario_id: string;
  nome: string;
  cidade: string | null;
  atividade: string | null;
  whatsapp: string;
  descricao: string | null;
  itens: number;
  bebidas: boolean;
};

const SEGMENTOS: [string | null, string][] = [
  [null, 'Todos'],
  ['Alimentação / refeições', 'Alimentos'],
  ['Mercado / suprimentos', 'Mercado'],
  ['Bebidas / distribuidora', 'Bebidas'],
  ['Gelo', 'Gelo'],
  ['Combustível', 'Combustível'],
  ['Iscas e equipamentos de pesca', 'Pesca'],
];

export default function FornecedoresDemandaEDA({ dataSaida }: { dataSaida?: string | null }) {
  const [segmento, setSegmento] = useState<string | null>(null);
  const [cidade, setCidade] = useState<string | null>(null);
  const [empresa, setEmpresa] = useState('');
  const [lista, setLista] = useState<Fornecedor[] | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: perfil } = await supabase.from('perfis').select('empresa_id').eq('id', auth.user.id).maybeSingle();
      if (!perfil?.empresa_id) return;
      const { data: emp } = await supabase.from('empresa').select('nome,cidade').eq('id', perfil.empresa_id).maybeSingle();
      setCidade(emp?.cidade ?? null);
      setEmpresa(emp?.nome ?? '');
    })();
  }, []);

  useEffect(() => {
    let vivo = true;
    setLista(null);
    setErro(false);
    supabase
      .rpc('fornecedores_para_operadora_eda', { p_atividade: segmento, p_cidade: cidade })
      .then(({ data, error }) => {
        if (!vivo) return;
        if (error) setErro(true);
        else setLista((data ?? []) as Fornecedor[]);
      });
    return () => {
      vivo = false;
    };
  }, [segmento, cidade]);

  function whatsapp(f: Fornecedor) {
    const n = f.whatsapp.length <= 11 ? `55${f.whatsapp}` : f.whatsapp;
    const quando = dataSaida ? ` para uma saída em ${dataSaida.split('-').reverse().join('/')}` : '';
    const msg = `Olá, ${f.nome}! Sou${empresa ? ` da ${empresa}` : ''} e vi seu contato na Encantos da Amazônia. Preciso de suprimentos${quando}. Pode me passar valores e disponibilidade?`;
    return `https://wa.me/${n}?text=${encodeURIComponent(msg)}`;
  }

  return (
    <section className="mx-auto mt-6 max-w-5xl px-4 md:px-8" aria-labelledby="fornecedores-demanda">
      <div className="rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-4 md:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--ern-destaque)]">Rede EDA</p>
        <h2 id="fornecedores-demanda" className="mt-1 text-xl text-[var(--ern-texto)]">Fornecedores para esta saída</h2>
        <p className="mt-1 text-sm text-[var(--ern-secundario)]">
          Chame direto no WhatsApp. {cidade ? `Os de ${cidade} aparecem primeiro.` : ''} A negociação é só entre vocês.
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Segmento">
          {SEGMENTOS.map(([valor, rotulo]) => (
            <button
              key={rotulo}
              type="button"
              aria-pressed={segmento === valor}
              onClick={() => setSegmento(valor)}
              className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${
                segmento === valor
                  ? 'border-[var(--ern-destaque)] bg-[var(--ern-botao)] text-[var(--ern-painel)]'
                  : 'border-[var(--ern-borda)] text-[var(--ern-texto)]/75'
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>

        {segmento === 'Bebidas / distribuidora' && (
          <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-3 text-xs leading-5 text-[var(--ern-texto)]">
            Bebida alcoólica: venda e consumo proibidos para menores de 18 anos. O condutor da embarcação não pode
            consumir álcool durante a navegação.
          </p>
        )}

        {erro && <p className="mt-4 text-sm text-red-400">Não foi possível carregar os fornecedores agora.</p>}
        {lista && !lista.length && !erro && (
          <p className="mt-4 text-sm text-[var(--ern-secundario)]">
            Ainda não há fornecedores deste segmento na Rede. Convide os da sua cidade a se cadastrar de graça em
            encantos-rio-negro.vercel.app/acesso?acesso=fornecedor
          </p>
        )}

        <ul className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-3">
          {(lista ?? []).map((f) => (
            <li key={f.usuario_id} className="flex flex-col gap-1 rounded-xl border border-[var(--ern-borda)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ern-destaque)]">
                {[f.atividade, f.cidade].filter(Boolean).join(' · ')}
              </p>
              <p className="text-sm font-semibold text-[var(--ern-texto)]">{f.nome}</p>
              {f.descricao && <p className="hidden line-clamp-2 text-xs text-[var(--ern-secundario)] sm:block">{f.descricao}</p>}
              {f.itens > 0 && <p className="text-[11px] text-[var(--ern-secundario)]">{f.itens} produto(s) na vitrine</p>}
              {f.bebidas && <p className="text-[10px] text-amber-500">+18</p>}
              <a
                href={whatsapp(f)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto inline-flex min-h-9 items-center justify-center rounded-lg bg-[#185943] px-2 text-xs font-bold text-white"
              >
                WhatsApp ↗
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

'use client';
import '@/app/components/padrao-paginas-eda.css';
// EDA_OBSERVATORIO_V1: Observatório do Turismo — dados agregados e anônimos da Rede,
// exclusivo do CEO (o banco recusa as demais contas). Base para Sebrae e secretarias.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { baixarDocumentoPremiumERN } from '@/lib/pdfSobDemandaEDA';
import { CabecalhoEDA, PaginaEDA } from '@/app/components/PadraoPaginaEDA';
import CartaoMagneticoEDA from '@/app/components/CartaoMagneticoEDA';

type Obs = {
  periodo: { inicio: string; meses: number };
  rede: { operadoras: number; fornecedores: number; guias: number; passeios_publicados: number; pecas_vitrine: number };
  sazonalidade: { mes: string; reservas: number; pessoas: number }[];
  origem: { origem: string; clientes: number }[];
  ocupacao_media: number | null;
  roteiros: { categoria: string; reservas: number; pessoas: number }[];
  interesse: { conversas_iara: number; pedidos_visitantes: number; idiomas: { idioma: string; n: number }[]; quero_ir: number };
};

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotMes = (m: string) => `${MES[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`;

export default function ObservatorioPage() {
  const [meses, setMeses] = useState(12);
  const [d, setD] = useState<Obs | null>(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setD(null);
    const { data, error } = await supabase.rpc('ern_observatorio_turismo_v1', { p_meses: meses });
    if (error) {
      setErro(error.message.includes('SEM_PERMISSAO') ? 'Área exclusiva do CEO da Encantos da Amazônia.' : 'Não foi possível carregar o Observatório.');
      return;
    }
    setErro('');
    setD(data as Obs);
  }, [meses]);
  useEffect(() => { void carregar(); }, [carregar]);

  const maxPessoas = Math.max(1, ...(d?.sazonalidade ?? []).map((s) => s.pessoas));
  const totalPessoas = (d?.sazonalidade ?? []).reduce((n, s) => n + s.pessoas, 0);
  const totalReservas = (d?.sazonalidade ?? []).reduce((n, s) => n + s.reservas, 0);

  function pdf() {
    if (!d) return;
    baixarDocumentoPremiumERN({
      titulo: 'Observatório do Turismo · Rede Encantos da Amazônia',
      subtitulo: `Últimos ${d.periodo.meses} meses · dados agregados e anônimos`,
      tipo: 'Observatório',
      nomeArquivo: `EDA-observatorio-${new Date().toISOString().slice(0, 10)}.pdf`,
      dados: [
        { campo: 'Operadoras na Rede', valor: d.rede.operadoras },
        { campo: 'Guias independentes', valor: d.rede.guias },
        { campo: 'Fornecedores e artesãos', valor: d.rede.fornecedores },
        { campo: 'Passeios publicados', valor: d.rede.passeios_publicados },
        { campo: 'Reservas no período', valor: totalReservas },
        { campo: 'Turistas no período', valor: totalPessoas },
        { campo: 'Ocupação média das embarcações', valor: d.ocupacao_media === null ? 'Sem dados' : `${d.ocupacao_media}%` },
        { campo: 'Conversas com a Iara', valor: d.interesse.conversas_iara },
        { campo: 'Pedidos de visitantes', valor: d.interesse.pedidos_visitantes },
      ],
      tabela: { titulo: 'Sazonalidade', colunas: ['Mês', 'Reservas', 'Turistas'], linhas: d.sazonalidade.map((s) => [rotMes(s.mes), s.reservas, s.pessoas]) },
      observacoes: [
        'Dados agregados de todas as operadoras da Rede. Nenhuma empresa, cliente ou contato é identificado.',
        'Grupos com menos de 3 registros (origem, idiomas) ou com poucas operadoras (roteiros) são omitidos para proteger a privacidade (LGPD).',
        ...d.roteiros.map((r) => `Roteiro ${r.categoria}: ${r.reservas} reservas, ${r.pessoas} turistas.`),
        ...d.origem.map((o) => `Origem ${o.origem}: ${o.clientes} clientes.`),
      ],
    });
  }

  const kpis: [string, string][] = d
    ? [
        ['Operadoras', String(d.rede.operadoras)],
        ['Turistas no período', String(totalPessoas)],
        ['Ocupação média', d.ocupacao_media === null ? '—' : `${d.ocupacao_media}%`],
        ['Conversas com a Iara', String(d.interesse.conversas_iara)],
        ['Pedidos de visitantes', String(d.interesse.pedidos_visitantes)],
        ['Guias · fornecedores', `${d.rede.guias} · ${d.rede.fornecedores}`],
      ]
    : [];

  return (
    <PaginaEDA className="eda-pg-auto">
      <div className="eda-pg-miolo" style={{ maxWidth: 1200 }}>
        <CabecalhoEDA
          capa
          etiqueta="Comando EDA · Observatório"
          titulo="Observatório do Turismo"
          resumo="Sazonalidade, origem dos turistas, ocupação e demanda por roteiros, somando toda a Rede, sem identificar empresas ou pessoas."
          acoes={
            <>
              <select className="eda-pg-bt" value={meses} onChange={(e) => setMeses(Number(e.target.value))} aria-label="Período">
                <option value={3}>3 meses</option>
                <option value={6}>6 meses</option>
                <option value={12}>12 meses</option>
                <option value={24}>24 meses</option>
              </select>
              <button type="button" className="eda-pg-bt eda-pg-bt-ouro" disabled={!d} onClick={pdf}>Relatório PDF</button>
            </>
          }
        />

        {erro && <p role="alert" className="mt-6 text-sm text-red-400">{erro}</p>}
        {!d && !erro && <p role="status" className="mt-6 text-sm opacity-70">Somando os dados da Rede…</p>}

        {d && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-2.5 md:grid-cols-3">
              {kpis.map(([r, v]) => (
                <CartaoMagneticoEDA key={r} forca={3} className="rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--ern-destaque)]">{r}</p>
                  <p className="mt-1 text-2xl font-semibold text-[var(--ern-texto)]">{v}</p>
                </CartaoMagneticoEDA>
              ))}
            </div>

            <section className="mt-6 rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-4 md:p-6">
              <h2 className="text-lg text-[var(--ern-texto)]">Sazonalidade · turistas por mês da viagem</h2>
              <div className="mt-4 flex h-40 items-end gap-1.5" role="img" aria-label="Turistas por mês">
                {d.sazonalidade.map((s) => (
                  <div key={s.mes} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${rotMes(s.mes)}: ${s.pessoas} turistas, ${s.reservas} reservas`}>
                    <span className="text-[10px] text-[var(--ern-secundario)]">{s.pessoas || ''}</span>
                    <span className="w-full rounded-t-md bg-[var(--ern-botao)]" style={{ height: `${Math.max(2, (s.pessoas / maxPessoas) * 120)}px` }} />
                    <span className="text-[9px] text-[var(--ern-secundario)]">{rotMes(s.mes)}</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <section className="rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-4 md:p-6">
                <h2 className="text-lg text-[var(--ern-texto)]">Roteiros mais procurados</h2>
                {d.roteiros.length ? (
                  <ul className="mt-3 grid gap-1.5 text-sm">
                    {d.roteiros.map((r) => (
                      <li key={r.categoria} className="flex justify-between gap-3"><span>{r.categoria}</span><b>{r.reservas} · {r.pessoas} turistas</b></li>
                    ))}
                  </ul>
                ) : <p className="mt-3 text-sm text-[var(--ern-secundario)]">Ainda poucos dados para mostrar sem identificar operadoras.</p>}
              </section>
              <section className="rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-4 md:p-6">
                <h2 className="text-lg text-[var(--ern-texto)]">Origem dos turistas</h2>
                {d.origem.length ? (
                  <ul className="mt-3 grid gap-1.5 text-sm">
                    {d.origem.map((o) => (
                      <li key={o.origem} className="flex justify-between gap-3"><span>{o.origem}</span><b>{o.clientes}</b></li>
                    ))}
                  </ul>
                ) : <p className="mt-3 text-sm text-[var(--ern-secundario)]">Ainda poucos dados (mínimo de 3 por origem).</p>}
              </section>
            </div>

            <p className="mt-6 text-xs leading-6 text-[var(--ern-secundario)]">
              Privacidade: só números somados. Grupos pequenos são omitidos para que nenhuma empresa ou turista
              possa ser identificado (LGPD). Pronto para apresentar ao Sebrae e às secretarias de turismo.
            </p>
          </>
        )}
      </div>
    </PaginaEDA>
  );
}

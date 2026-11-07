'use client';
import '@/app/components/padrao-paginas-eda.css';
import '@/app/components/padrao-formularios-eda.css';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// EDA_PRONTIDAO_PESCA_V1: conferência calculada pelos dados de cada viagem
// (antes era uma lista manual que se apagava ao recarregar).

const botao = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--ern-destaque)] bg-[var(--ern-suave)] px-4 text-sm font-semibold text-[var(--ern-destaque)] transition hover:bg-[var(--ern-botao)]/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F4C77E]';

type Viagem = {
  viagem: string; saida_id: string | null; reserva_id: string | null;
  passeio: string | null; inicio: string; fim: string; reservas: number; pessoas: number;
  sem_embarcacao: number; embarcacao: string | null; sem_guia: number; guia: string | null;
  emb_doc_vencido: boolean; guia_doc_vencido: boolean;
  participantes: number; fichas: number; sem_voucher: number; saldo: number; demandas: number;
};
type Prontidao = {
  viagens: Viagem[]; passeios_pesca: number;
  licenca_operadora: { titulo: string; validade: string | null } | null;
};
type Item = { ok: boolean; rotulo: string; detalhe: string; href: string };

const dataBR = (d?: string | null) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '—');
const moeda = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function itens(v: Viagem): Item[] {
  const reserva = v.reserva_id ? `/reservas/editar/${v.reserva_id}` : '/reservas';
  const n = (x: unknown) => Number(x) || 0;
  const lista: Item[] = [
    {
      ok: n(v.sem_embarcacao) === 0 && !v.emb_doc_vencido,
      rotulo: 'Embarcação',
      detalhe: n(v.sem_embarcacao) ? `${v.sem_embarcacao} reserva(s) sem embarcação` : v.emb_doc_vencido ? `TIE/vistoria vence antes do fim (${v.embarcacao})` : v.embarcacao ?? 'Escalada',
      href: v.emb_doc_vencido ? '/documentos' : reserva,
    },
    {
      ok: n(v.sem_guia) === 0 && !v.guia_doc_vencido,
      rotulo: 'Guia / piloto',
      detalhe: n(v.sem_guia) ? `${v.sem_guia} reserva(s) sem guia` : v.guia_doc_vencido ? `Documento do guia vence antes do fim (${v.guia})` : v.guia ?? 'Escalado',
      href: v.guia_doc_vencido ? '/documentos' : reserva,
    },
    {
      ok: n(v.pessoas) > 0 && n(v.fichas) >= n(v.pessoas),
      rotulo: 'Fichas de saúde',
      detalhe: `${n(v.fichas)} de ${n(v.pessoas)} preenchidas`,
      href: reserva,
    },
    { ok: n(v.saldo) <= 0.009, rotulo: 'Pagamento', detalhe: n(v.saldo) > 0.009 ? `Saldo ${moeda(v.saldo)}` : 'Quitado', href: reserva },
    { ok: n(v.sem_voucher) === 0, rotulo: 'Voucher', detalhe: n(v.sem_voucher) ? `${v.sem_voucher} reserva(s) sem voucher` : 'Emitido', href: '/vouchers/novo' },
  ];
  if (v.saida_id) {
    lista.push({ ok: n(v.demandas) > 0, rotulo: 'Apoio (combustível, gelo, rancho)', detalhe: n(v.demandas) ? `${v.demandas} demanda(s) vinculada(s)` : 'Nenhuma demanda vinculada', href: '/demandas/nova' });
  }
  return lista;
}

export default function PescaEsportivaPage() {
  const [dias, setDias] = useState(60);
  const [dados, setDados] = useState<Prontidao | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    setDados(null);
    supabase.rpc('prontidao_pesca_eda', { p_dias: dias }).then(({ data, error }) => {
      if (!ativo) return;
      if (error) { setErro(error.message?.includes('SEM_PERMISSAO') ? 'Seu perfil não acessa reservas ou passeios.' : 'Não foi possível carregar as viagens de pesca.'); return; }
      setErro(''); setDados(data as Prontidao);
    });
    return () => { ativo = false; };
  }, [dias]);

  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Manaus' });
  const lic = dados?.licenca_operadora;
  const licOk = !!lic && (!lic.validade || lic.validade >= hoje);

  return <main className="eda-pg eda-pg-auto eda-pg-legado min-h-screen min-w-0 px-4 py-8 sm:px-8"><div className="mx-auto max-w-6xl space-y-7">
    <Link href="/dashboard" className="inline-flex min-h-11 items-center text-sm text-[var(--ern-destaque)]">← Painel da operadora</Link>
    <header className="relative overflow-hidden rounded-3xl border border-[var(--ern-destaque)] bg-[var(--ern-painel)] p-5 sm:p-9"><div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-60 w-60 rounded-full border border-[var(--ern-destaque)]"/><p className="text-xs uppercase tracking-[.2em] text-[var(--ern-destaque)]">Rio Negro · turismo e pesca</p><h1 className="mt-3 text-3xl sm:text-4xl">Central de pesca esportiva</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ern-secundario)]">Cada viagem de pesca conferida pelos dados da operação: embarcação, guia, fichas, pagamento, voucher e apoio.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/reservas/nova" className={botao}>Criar reserva</Link><Link href="/dashboard/mapa" className={botao}>Abrir mapa do Rio Negro</Link></div></header>

    <section aria-labelledby="titulo-viagens" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h2 id="titulo-viagens" className="text-2xl">Viagens de pesca</h2>
          <p className="mt-2 text-xs leading-6 text-[var(--ern-secundario)]">Passeios com categoria “Pesca” {dados ? `(${dados.passeios_pesca} cadastrados)` : ''}. Atualizado a cada abertura.</p></div>
        <label className="grid gap-1 text-xs">Período
          <select value={dias} onChange={e => setDias(Number(e.target.value))} className="min-h-11 rounded-xl border border-[var(--ern-borda)] bg-transparent px-3 text-sm">
            <option value={15}>Próximos 15 dias</option><option value={30}>Próximos 30 dias</option>
            <option value={60}>Próximos 60 dias</option><option value={120}>Próximos 120 dias</option>
          </select></label>
      </div>

      {dados && (
        <div className={`rounded-xl border p-4 text-sm ${licOk ? 'border-emerald-500/40' : 'border-[#E3A144]/60'}`}>
          <strong>Licença de pesca da operadora: </strong>
          {lic ? `${lic.titulo} · validade ${dataBR(lic.validade)}${licOk ? '' : ' (vencida)'}` : 'não cadastrada'}
          {' · '}<Link href="/documentos" className="underline">Documentos</Link>
          <p className="mt-1 text-xs text-[var(--ern-secundario)]">Confira também a licença de pesca amadora de cada pescador e as regras de captura e soltura da área antes do embarque.</p>
        </div>
      )}

      {erro && <p role="alert" className="text-sm text-[var(--ern-erro)]">{erro}</p>}
      {!dados && !erro && <p role="status" className="text-sm">Conferindo viagens…</p>}
      {dados && dados.viagens.length === 0 && (
        <p className="rounded-2xl border border-dashed border-[var(--ern-borda)] p-6 text-sm text-[var(--ern-secundario)]">
          Nenhuma viagem de pesca no período. {dados.passeios_pesca === 0 ? 'Cadastre um passeio com a categoria Pesca Esportiva.' : 'Crie uma reserva ou saída para um passeio de pesca.'}
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {dados?.viagens.map(v => {
          const lista = itens(v);
          const prontos = lista.filter(i => i.ok).length;
          return <article key={v.viagem} className="min-w-0 rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0"><h3 className="text-base font-semibold">{v.passeio ?? 'Viagem de pesca'}</h3>
                <p className="mt-1 text-xs text-[var(--ern-secundario)]">{dataBR(v.inicio)}{v.fim !== v.inicio ? ` a ${dataBR(v.fim)}` : ''} · {v.pessoas} pescador(es) · {v.reservas} reserva(s)</p></div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${prontos === lista.length ? 'border-emerald-500/50 text-emerald-300' : 'border-[#E3A144]/60 text-[var(--ern-destaque)]'}`}>{prontos}/{lista.length} pronto</span>
            </div>
            <progress aria-label="Itens prontos" max={lista.length} value={prontos} className="mt-3 h-2 w-full accent-[#E3A144]"/>
            <ul className="mt-3 space-y-1.5">
              {lista.map(i => <li key={i.rotulo} className="flex items-start justify-between gap-3 text-xs">
                <span><span aria-hidden="true" className={i.ok ? 'text-emerald-300' : 'text-[#E3A144]'}>{i.ok ? '✓' : '•'}</span> <strong>{i.rotulo}</strong><span className="block pl-4 text-[var(--ern-secundario)]">{i.detalhe}</span></span>
                {!i.ok && <Link href={i.href} className="shrink-0 text-[var(--ern-destaque)] underline">Resolver</Link>}
              </li>)}
            </ul>
          </article>;
        })}
      </div>
    </section>

    <section className="rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-5 sm:p-7"><p className="text-xs uppercase tracking-widest text-[var(--ern-destaque)]">Canais da organização</p><h2 className="mt-3 text-2xl">Copa Brasil de Pesca Esportiva</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ern-secundario)]">Veja a programação, os regulamentos e o processo de inscrição diretamente no site da organização. Confirme a edição, as datas e as condições antes de contratar serviços.</p><div className="mt-5 flex flex-wrap gap-3"><a href="https://copabrasildepescaesportiva.com.br/" target="_blank" rel="noopener noreferrer" className={botao}>Site oficial ↗<span className="sr-only"> · abre em nova aba</span></a><a href="https://copabrasildepescaesportiva.com.br/faca-sua-inscricao" target="_blank" rel="noopener noreferrer" className={botao}>Inscrições e regulamentos ↗<span className="sr-only"> · abre em nova aba</span></a></div><p className="mt-4 text-xs leading-6 text-[#AFC2B5]">A EDA organiza os serviços turísticos da operadora. Uma reserva na plataforma não inscreve o cliente no torneio. As inscrições e confirmações do evento são realizadas pela organização.</p></section>
  </div></main>;
}

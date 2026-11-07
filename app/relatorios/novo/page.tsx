'use client';
import '@/app/components/padrao-paginas-eda.css';
import '@/app/components/padrao-formularios-eda.css';
import '../relatorios-premium.css';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { hojeGraficoManaus, periodoGraficoValido } from '@/lib/financeiroGraficosERN';
import { salvarRelatorioERN, erroRelatorioERN, STATUS_RELATORIO_ERN } from '@/lib/relatoriosERN';
import CampoOpcoesEDA from '@/app/components/CampoOpcoesEDA';
import { TIPOS_RELATORIO } from '@/lib/opcoesEDA';
import { supabase } from '@/lib/supabase';

// EDA_RELATORIO_FORM_V2: título automático, atalhos de período e responsável da equipe.
const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const ultimoDia = (a: number, m: number) => new Date(Date.UTC(a, m, 0)).getUTCDate();
const iso = (a: number, m: number, d: number) => `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
function tituloAutomatico(inicio: string, fim: string) {
  if (!inicio || !fim) return '';
  const [ai, mi, di] = inicio.split('-').map(Number); const [af, mf, df] = fim.split('-').map(Number);
  if (di === 1 && ai === af && mi === mf && (df === ultimoDia(af, mf) || fim === hojeGraficoManaus())) return `Operação de ${MESES[mi - 1]}/${ai}`;
  if (mi === 9 && di === 1 && mf === 3 && af === ai + 1) return `Temporada de pesca ${ai}/${af}`;
  const br = (x: string) => x.split('-').reverse().join('/');
  return `Operação de ${br(inicio)} a ${br(fim)}`;
}
function periodoAtalho(chave: 'mes' | 'anterior' | '90' | 'temporada'): [string, string] {
  const hoje = hojeGraficoManaus(); const [a, m] = hoje.split('-').map(Number);
  if (chave === 'mes') return [iso(a, m, 1), iso(a, m, ultimoDia(a, m))];
  if (chave === 'anterior') { const pa = m === 1 ? a - 1 : a; const pm = m === 1 ? 12 : m - 1; return [iso(pa, pm, 1), iso(pa, pm, ultimoDia(pa, pm))]; }
  if (chave === '90') { const d = new Date(`${hoje}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 89); return [d.toISOString().slice(0, 10), hoje]; }
  // Temporada de pesca no Rio Negro: setembro a março.
  const ini = m >= 9 ? a : a - 1; return [iso(ini, 9, 1), iso(ini + 1, 3, 31)];
}
const campo = 'mt-2 min-h-12 w-full rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-3 text-sm text-[var(--ern-texto)] disabled:opacity-50 [color-scheme:dark]';
export default function NovoRelatorioPage() {
  const router = useRouter(); const trava = useRef(false);
  const [titulo, setTitulo] = useState(''); const [tipo, setTipo] = useState('Operacional');
  const [responsavel, setResponsavel] = useState(''); const [data, setData] = useState('');
  const [status, setStatus] = useState<string>('Pendente'); const [modo, setModo] = useState<'operacao' | 'integrado' | 'manual'>('operacao'); const integrado = modo !== 'manual'; const setIntegrado = (v: boolean) => setModo(v ? 'operacao' : 'manual');
  const [inicio, setInicio] = useState(''); const [fim, setFim] = useState('');
  const [salvando, setSalvando] = useState(false); const [erro, setErro] = useState('');
  const [tituloTocado, setTituloTocado] = useState(false);
  const [equipe, setEquipe] = useState<string[]>([]);
  useEffect(() => { const hoje = hojeGraficoManaus(); const [i, f] = periodoAtalho('mes'); setData(hoje); setInicio(i); setFim(f); }, []);
  useEffect(() => { if (!tituloTocado && modo !== 'manual') setTitulo(tituloAutomatico(inicio, fim)); }, [inicio, fim, modo, tituloTocado]);
  useEffect(() => {
    // Responsável: o próprio usuário já marcado; administradores veem a equipe toda.
    (async () => {
      const { data: auth } = await supabase.auth.getUser(); if (!auth.user) return;
      const { data: eu } = await supabase.from('perfis').select('nome').eq('id', auth.user.id).maybeSingle();
      const meu = String(eu?.nome ?? auth.user.email ?? '').trim();
      const nomes = new Set<string>(meu ? [meu] : []);
      try {
        const { data: sessao } = await supabase.auth.getSession();
        const r = await fetch('/api/equipe', { headers: { Authorization: `Bearer ${sessao.session?.access_token ?? ''}` }, cache: 'no-store' });
        if (r.ok) { const j = await r.json(); for (const m of (j?.membros ?? []) as { nome?: string | null }[]) if (m.nome?.trim()) nomes.add(m.nome.trim()); }
      } catch { /* sem permissão de equipe: fica só o próprio usuário */ }
      setEquipe([...nomes]); setResponsavel((atual) => atual || meu);
    })();
  }, []);
  function limpar() { if (trava.current) return; const hoje = hojeGraficoManaus(); setTitulo(''); setTituloTocado(false); setTipo('Operacional'); setResponsavel(equipe[0] ?? ''); setData(hoje); setStatus('Pendente'); setIntegrado(true); { const [i, f] = periodoAtalho('mes'); setInicio(i); setFim(f); } setErro(''); }
  async function salvar(event: FormEvent) {
    event.preventDefault(); if (trava.current) return; setErro('');
    if (integrado && !periodoGraficoValido({ inicio, fim })) { setErro('Informe início e fim válidos, abrangendo até 24 meses.'); return; }
    trava.current = true; setSalvando(true);
    try {
      await salvarRelatorioERN({ titulo: titulo.trim() || tituloAutomatico(inicio, fim) || 'Relatório', tipo: modo === 'operacao' ? 'Operação completa' : modo === 'integrado' ? 'Gerencial integrado' : tipo, gerado_por: responsavel, data_geracao: integrado ? hojeGraficoManaus() : data, status: integrado ? 'Concluído' : status, filtros: modo === 'operacao' ? { versao: 2, origem: 'operacao_eda', inicio, fim } : modo === 'integrado' ? { versao: 1, origem: 'gerencial_integrado', inicio, fim } : {} });
      router.push('/relatorios'); router.refresh();
    } catch (falha) { setErro(erroRelatorioERN(falha)); trava.current = false; setSalvando(false); }
  }
  return <main className="eda-pg eda-pg-auto eda-pg-legado ern-relatorios-premium min-h-screen px-4 py-8 sm:px-8"><div className="mx-auto max-w-4xl">
    <Link href="/relatorios" className="inline-flex min-h-11 items-center text-sm text-[var(--ern-destaque)]">← Relatórios</Link>
    <header className="mt-4 eda-capa eda-capa-auto eda-mg" data-eda-mg="">
    <h1 className="text-3xl">Novo relatório</h1>
    <p className="mt-3 text-sm leading-6 text-[var(--ern-secundario)]">Salve os critérios para consultar reservas e financeiro por período, ou mantenha um registro manual de acompanhamento.</p>
    </header>
    {erro && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 p-4 text-sm text-red-300">{erro}</p>}
    <form onSubmit={salvar} className="ern-relatorios-form mt-6 space-y-5"><fieldset disabled={salvando} className="min-w-0 space-y-5 rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-4 sm:p-6">
      <legend className="px-2 text-sm font-semibold text-[var(--ern-destaque)]">Identificação e critérios</legend>
      <label className="block text-sm">Título<input id="titulo" required maxLength={200} value={titulo} onChange={e => { setTitulo(e.target.value); setTituloTocado(true); }} placeholder={tituloAutomatico(inicio, fim) || 'Ex.: Operação de outubro'} className={campo} /></label>
      <label className="block text-sm">Modalidade<select aria-label="Modalidade do relatório" value={modo} onChange={e => setModo(e.target.value as 'operacao' | 'integrado' | 'manual')} className={campo}><option value="operacao">Operação completa (saídas, vendas, caixa, margem, hospedagem, clientes)</option><option value="integrado">Análise simples de reservas e financeiro</option><option value="manual">Registro manual de acompanhamento</option></select></label>
      {integrado && <div className="flex flex-wrap gap-2" role="group" aria-label="Atalhos de período">
        {([['mes', 'Mês atual'], ['anterior', 'Mês anterior'], ['90', 'Últimos 90 dias'], ['temporada', 'Temporada de pesca (set–mar)']] as const).map(([k, r]) => {
          const [a, b] = periodoAtalho(k); const ativo = a === inicio && b === fim;
          return <button key={k} type="button" aria-pressed={ativo} onClick={() => { setInicio(a); setFim(b); }}
            className={`min-h-10 rounded-full border px-4 text-xs ${ativo ? 'border-[var(--ern-destaque)] bg-[var(--ern-destaque)] font-bold text-[#10140f]' : 'border-[var(--ern-borda)]'}`}>{r}</button>;
        })}
      </div>}
      {integrado ? <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Início do período<input aria-label="Início do período" type="date" required value={inicio} onChange={e => setInicio(e.target.value)} className={campo} /></label><label className="text-sm">Fim do período<input aria-label="Fim do período" type="date" required value={fim} onChange={e => setFim(e.target.value)} className={campo} /></label></div> : <label className="block text-sm">Tipo<CampoOpcoesEDA valor={tipo} opcoes={TIPOS_RELATORIO} onChange={setTipo} className={campo} /></label>}
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Responsável<select id="responsavel" value={responsavel} onChange={e => setResponsavel(e.target.value)} className={campo}>{(equipe.length ? equipe : [responsavel || '—']).map(n => <option key={n} value={n}>{n}</option>)}</select></label>{!integrado && <label className="text-sm">Data do registro · Manaus<input type="date" value={data} onChange={e => setData(e.target.value)} className={campo} /></label>}</div>
      {!integrado && <label className="block text-sm">Situação do acompanhamento<select aria-label="Situação do acompanhamento" value={status} onChange={e => setStatus(e.target.value)} className={campo}>{STATUS_RELATORIO_ERN.map(s => <option key={s}>{s}</option>)}</select></label>}
      <p className="text-xs leading-6 text-[var(--ern-secundario)]">{integrado ? 'São salvos os critérios, não uma cópia dos valores. Na listagem, abra “Visualizar / analisar” para calcular os dados atuais acessíveis à sua conta. A análise poderá mudar se os registros de origem forem alterados.' : 'Este cadastro guarda apenas a identificação e o acompanhamento. Não contém anexo nem análise automática.'}</p>
      <p className="text-xs leading-6 text-[var(--ern-secundario)]">O acesso depende da empresa vinculada e do recurso de relatórios no plano contratado. O status acompanha o registro; não comprova auditoria dos dados.</p>
    </fieldset><div className="flex flex-wrap gap-3"><button type="submit" disabled={salvando} className="min-h-12 rounded-xl bg-[var(--ern-botao)] px-5 text-sm font-bold text-[var(--ern-sobre-botao)] disabled:opacity-50">{salvando ? 'Salvando…' : 'Salvar relatório'}</button><button type="button" disabled={salvando} onClick={limpar} className="min-h-12 rounded-xl border border-[var(--ern-borda)] px-5 text-sm disabled:opacity-50">Limpar formulário</button></div></form>
  </div></main>;
}

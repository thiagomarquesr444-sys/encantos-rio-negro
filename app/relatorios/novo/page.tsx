'use client';
import '../relatorios-premium.css';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { hojeGraficoManaus, periodoGraficoValido } from '@/lib/financeiroGraficosERN';
import { salvarRelatorioERN, erroRelatorioERN, STATUS_RELATORIO_ERN } from '@/lib/relatoriosERN';
const campo = 'mt-2 min-h-12 w-full rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-3 text-sm text-[var(--ern-texto)] disabled:opacity-50 [color-scheme:dark]';
export default function NovoRelatorioPage() {
  const router = useRouter(); const trava = useRef(false);
  const [titulo, setTitulo] = useState(''); const [tipo, setTipo] = useState('Operacional');
  const [responsavel, setResponsavel] = useState(''); const [data, setData] = useState('');
  const [status, setStatus] = useState<string>('Pendente'); const [integrado, setIntegrado] = useState(true);
  const [inicio, setInicio] = useState(''); const [fim, setFim] = useState('');
  const [salvando, setSalvando] = useState(false); const [erro, setErro] = useState('');
  useEffect(() => { const hoje = hojeGraficoManaus(); setData(hoje); setInicio(hoje.slice(0, 7) + '-01'); setFim(hoje); }, []);
  function limpar() { if (trava.current) return; const hoje = hojeGraficoManaus(); setTitulo(''); setTipo('Operacional'); setResponsavel(''); setData(hoje); setStatus('Pendente'); setIntegrado(true); setInicio(hoje.slice(0, 7) + '-01'); setFim(hoje); setErro(''); }
  async function salvar(event: FormEvent) {
    event.preventDefault(); if (trava.current) return; setErro('');
    if (integrado && !periodoGraficoValido({ inicio, fim })) { setErro('Informe início e fim válidos, abrangendo até 24 meses.'); return; }
    trava.current = true; setSalvando(true);
    try {
      await salvarRelatorioERN({ titulo, tipo: integrado ? 'Gerencial integrado' : tipo, gerado_por: responsavel, data_geracao: data, status, filtros: integrado ? { versao: 1, origem: 'gerencial_integrado', inicio, fim } : {} });
      router.push('/relatorios'); router.refresh();
    } catch (falha) { setErro(erroRelatorioERN(falha)); trava.current = false; setSalvando(false); }
  }
  return <main className="ern-relatorios-premium min-h-screen bg-[var(--ern-fundo)] px-4 py-8 text-[var(--ern-texto)] sm:px-8"><div className="mx-auto max-w-4xl">
    <Link href="/relatorios" className="inline-flex min-h-11 items-center text-sm text-[var(--ern-destaque)]">← Relatórios</Link>
    <h1 className="mt-4 text-3xl" style={{ fontFamily: 'var(--font-fraunces), serif' }}>Novo relatório</h1>
    <p className="mt-3 text-sm leading-6 text-[var(--ern-secundario)]">Salve os critérios para consultar reservas e financeiro por período, ou mantenha um registro manual de acompanhamento.</p>
    {erro && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 p-4 text-sm text-red-300">{erro}</p>}
    <form onSubmit={salvar} className="ern-relatorios-form mt-6 space-y-5"><fieldset disabled={salvando} className="min-w-0 space-y-5 rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-4 sm:p-6">
      <legend className="px-2 text-sm font-semibold text-[var(--ern-destaque)]">Identificação e critérios</legend>
      <label className="block text-sm">Título<input id="titulo" required maxLength={200} value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex.: Operação de outubro" className={campo} /></label>
      <label className="block text-sm">Modalidade<select aria-label="Modalidade do relatório" value={integrado ? 'integrado' : 'manual'} onChange={e => setIntegrado(e.target.value === 'integrado')} className={campo}><option value="integrado">Análise de reservas e financeiro</option><option value="manual">Registro manual de acompanhamento</option></select></label>
      {integrado ? <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Início do período<input aria-label="Início do período" type="date" required value={inicio} onChange={e => setInicio(e.target.value)} className={campo} /></label><label className="text-sm">Fim do período<input aria-label="Fim do período" type="date" required value={fim} onChange={e => setFim(e.target.value)} className={campo} /></label></div> : <label className="block text-sm">Tipo<input value={tipo} maxLength={120} onChange={e => setTipo(e.target.value)} className={campo} /></label>}
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Responsável<input id="responsavel" value={responsavel} maxLength={200} onChange={e => setResponsavel(e.target.value)} className={campo} /></label><label className="text-sm">Data do registro · Manaus<input type="date" value={data} onChange={e => setData(e.target.value)} className={campo} /></label></div>
      <label className="block text-sm">Situação do acompanhamento<select aria-label="Situação do acompanhamento" value={status} onChange={e => setStatus(e.target.value)} className={campo}>{STATUS_RELATORIO_ERN.map(s => <option key={s}>{s}</option>)}</select></label>
      <p className="text-xs leading-6 text-[var(--ern-secundario)]">{integrado ? 'São salvos os critérios, não uma cópia dos valores. Na listagem, abra “Visualizar / analisar” para calcular os dados atuais acessíveis à sua conta. A análise poderá mudar se os registros de origem forem alterados.' : 'Este cadastro guarda apenas a identificação e o acompanhamento. Não contém anexo nem análise automática.'}</p>
      <p className="text-xs leading-6 text-[var(--ern-secundario)]">O acesso depende da empresa vinculada e do recurso de relatórios no plano contratado. O status acompanha o registro; não comprova auditoria dos dados.</p>
    </fieldset><div className="flex flex-wrap gap-3"><button type="submit" disabled={salvando} className="min-h-12 rounded-xl bg-[var(--ern-botao)] px-5 text-sm font-bold text-[var(--ern-sobre-botao)] disabled:opacity-50">{salvando ? 'Salvando…' : 'Salvar relatório'}</button><button type="button" disabled={salvando} onClick={limpar} className="min-h-12 rounded-xl border border-[var(--ern-borda)] px-5 text-sm disabled:opacity-50">Limpar formulário</button></div></form>
  </div></main>;
}

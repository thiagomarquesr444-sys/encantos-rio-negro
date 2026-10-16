import { supabase } from '@/lib/supabase';
import { analisarGraficosFinanceirosERN, dataGraficoValida, hojeGraficoManaus, periodoGraficoValido } from '@/lib/financeiroGraficosERN';
import type { RegistroFinanceiroERN } from '@/lib/financeiroConsultaERN';

export type CriteriosRelatorioERN = { versao: 1; origem: 'gerencial_integrado'; inicio: string; fim: string };
export type RelatorioERN = { id: string; empresa_id: string; titulo: string; tipo: string | null; data_geracao: string | null; gerado_por: string | null; status: string | null; created_at?: string | null; filtros: unknown };
export type FormRelatorioERN = { titulo: string; tipo: string; data_geracao: string; gerado_por: string; status: string; filtros: unknown };
export const STATUS_RELATORIO_ERN = ['Pendente', 'Em Análise', 'Concluído'] as const;
export function statusRelatorioERN(valor: string | null | undefined): string {
  const s = (valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  return s === 'pendente' ? 'Pendente' : s === 'em analise' ? 'Em Análise' : s === 'concluido' ? 'Concluído' : 'Não informado';
}
export function criteriosRelatorioERN(valor: unknown): CriteriosRelatorioERN | null {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return null;
  const p = valor as Record<string, unknown>;
  return p.versao === 1 && p.origem === 'gerencial_integrado' && typeof p.inicio === 'string' && typeof p.fim === 'string' && periodoGraficoValido({ inicio: p.inicio, fim: p.fim }) ? { versao: 1, origem: 'gerencial_integrado', inicio: p.inicio, fim: p.fim } : null;
}
export function erroRelatorioERN(erro: unknown): string {
  const msg = erro && typeof erro === 'object' && 'message' in erro ? String(erro.message) : '';
  if (msg.includes('ERN_USUARIO_SEM_EMPRESA')) return 'Seu usuário não possui uma empresa vinculada.';
  if (/row-level security|permission denied|JSON object requested/i.test(msg)) return 'Registro indisponível ou sem permissão. Verifique sua empresa e o acesso a relatórios no plano.';
  return msg || 'Não foi possível concluir a operação.';
}
export async function empresaRelatoriosERN(): Promise<string> {
  const { data: auth, error } = await supabase.auth.getUser();
  if (error || !auth.user) throw new Error('Entre novamente para acessar os relatórios.');
  const { data: perfil, error: falha } = await supabase.from('perfis').select('empresa_id').eq('id', auth.user.id).single();
  if (falha || !perfil?.empresa_id) throw new Error('Não foi possível identificar sua empresa.');
  return String(perfil.empresa_id);
}
async function listarERN<T extends { id: string; empresa_id?: string | null }>(tabela: 'relatorios' | 'reservas' | 'financeiro', empresa: string, colunas: string): Promise<T[]> {
  const lista: T[] = []; let esperado: number | null = null;
  for (let inicio = 0; inicio < 10000; inicio += 200) {
    const { data, error, count } = await supabase.from(tabela).select(colunas, { count: 'exact' }).eq('empresa_id', empresa).order('id', { ascending: true }).range(inicio, inicio + 199);
    if (error) throw error;
    if (count === null || count > 10000) throw new Error(`O volume de ${tabela} exige filtros no servidor. Nenhum total parcial será apresentado.`);
    if (esperado !== null && esperado !== count) throw new Error('Os registros mudaram durante a consulta. Atualize a análise.');
    // A seleção dinâmica não permite ao Supabase inferir o formato das colunas.
    // Valida a identidade e a empresa antes de assumir o tipo solicitado.
    const pagina: unknown = data ?? [];
    if (!Array.isArray(pagina) || pagina.some(linha =>
      !linha || typeof linha !== 'object' || typeof linha.id !== 'string' ||
      !linha.id || linha.empresa_id !== empresa
    )) throw new Error('A consulta retornou registros inválidos ou de outra empresa.');
    esperado = count; lista.push(...(pagina as T[]));
    if (lista.length >= count) break;
    if (!pagina.length) throw new Error('A consulta ficou incompleta. Tente novamente.');
  }
  if (lista.length !== esperado || lista.some(r => !r.id || (r.empresa_id != null && r.empresa_id !== empresa)) || new Set(lista.map(r => r.id)).size !== lista.length) throw new Error('Não foi possível obter registros consistentes.');
  return lista;
}
export async function consultarRelatoriosERN(): Promise<RelatorioERN[]> {
  const empresa = await empresaRelatoriosERN();
  const dados = await listarERN<RelatorioERN>('relatorios', empresa, 'id,empresa_id,titulo,tipo,data_geracao,gerado_por,status,created_at,filtros');
  return dados.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '') || a.id.localeCompare(b.id));
}
export async function salvarRelatorioERN(form: FormRelatorioERN, id?: string): Promise<string> {
  if (!form.titulo.trim()) throw new Error('Informe o título do relatório.');
  if (!(STATUS_RELATORIO_ERN as readonly string[]).includes(form.status)) throw new Error('Selecione um status válido.');
  if (form.data_geracao && !dataGraficoValida(form.data_geracao)) throw new Error('Informe uma data de geração válida.');
  const empresa = await empresaRelatoriosERN();
  const dados = { titulo: form.titulo.trim(), tipo: form.tipo.trim() || null, gerado_por: form.gerado_por.trim() || null, data_geracao: form.data_geracao || null, status: form.status, filtros: form.filtros, empresa_id: empresa };
  const consulta = id ? supabase.from('relatorios').update(dados).eq('id', id).eq('empresa_id', empresa) : supabase.from('relatorios').insert(dados);
  const { data, error } = await consulta.select('id').single();
  if (error) throw error;
  if (!data?.id) throw new Error('O banco não confirmou o salvamento.');
  return String(data.id);
}
export async function excluirRelatorioERN(id: string): Promise<void> {
  const empresa = await empresaRelatoriosERN();
  const { data, error } = await supabase.from('relatorios').delete().eq('id', id).eq('empresa_id', empresa).select('id').single();
  if (error) throw error;
  if (!data?.id) throw new Error('O banco não confirmou a exclusão.');
}
export type ReservaRelatorioERN = { id: string; empresa_id?: string | null; data_reserva: string | null; data?: string | null; valor_total: string | number | null; valor?: string | number | null; quantidade_pessoas: number | null; status: string | null };
function centavosERN(valor: unknown): number | null {
  if (typeof valor !== 'string' && typeof valor !== 'number') return null;
  const s = String(valor).trim(); if (!/^\d+(?:\.\d{1,2})?$/.test(s)) return null;
  const [inteiro, decimal = ''] = s.split('.'); const n = Number(inteiro) * 100 + Number(decimal.padEnd(2, '0'));
  return Number.isSafeInteger(n) ? n : null;
}
function somaSeguraERN(a: number, b: number): number { const n = a + b; if (!Number.isSafeInteger(n)) throw new Error('O total excede a precisão suportada. Revise os valores.'); return n; }
export function analisarReservasRelatorioERN(reservas: ReservaRelatorioERN[], inicio: string, fim: string) {
  let ativas = 0, canceladas = 0, pessoas = 0, comercial = 0, semData = 0, semValor = 0, semPessoas = 0, semStatus = 0;
  for (const r of reservas) {
    const data = r.data_reserva || r.data;
    if (!dataGraficoValida(data)) { semData++; continue; }
    if (data < inicio || data > fim) continue;
    const status = (r.status ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    if (status === 'cancelada' || status === 'cancelado') { canceladas++; continue; }
    if (!['confirmada', 'pendente', 'concluida', 'concluido', 'em andamento'].includes(status)) { semStatus++; continue; }
    ativas++;
    const valor = centavosERN(r.valor_total ?? r.valor);
    if (valor === null) semValor++; else comercial = somaSeguraERN(comercial, valor);
    if (typeof r.quantidade_pessoas !== 'number' || !Number.isSafeInteger(r.quantidade_pessoas) || r.quantidade_pessoas <= 0) semPessoas++;
    else pessoas = somaSeguraERN(pessoas, r.quantidade_pessoas);
  }
  return { ativas, canceladas, pessoas, comercial, semData, semValor, semPessoas, semStatus };
}
export async function gerarRelatorioERN(id: string) {
  const empresa = await empresaRelatoriosERN();
  // Revalida o acesso ao relatório antes de consultar as fontes; RLS e plano continuam obrigatórios.
  const { data, error } = await supabase.from('relatorios').select('id,empresa_id,titulo,tipo,data_geracao,gerado_por,status,filtros').eq('id', id).eq('empresa_id', empresa).single();
  if (error) throw error;
  if (!data?.id) throw new Error('Relatório indisponível. Verifique sua permissão e o plano contratado.');
  const criterios = criteriosRelatorioERN(data.filtros);
  if (!criterios) throw new Error('Este cadastro não possui critérios de análise integrada válidos.');
  const [reservas, financeiro] = await Promise.all([
    listarERN<ReservaRelatorioERN>('reservas', empresa, 'id,empresa_id,data_reserva,data,valor_total,valor,quantidade_pessoas,status'),
    listarERN<RegistroFinanceiroERN & { id: string }>('financeiro', empresa, 'id,empresa_id,tipo,valor,categoria,status,data_vencimento,data_liquidacao,reserva_id'),
  ]);
  return { criterios, atualizadoEm: new Date().toISOString(), reservas: analisarReservasRelatorioERN(reservas, criterios.inicio, criterios.fim), financeiro: analisarGraficosFinanceirosERN(financeiro, criterios, hojeGraficoManaus()) };
}
export type AnaliseRelatorioERN = Awaited<ReturnType<typeof gerarRelatorioERN>>;
export function baixarCsvRelatorioERN(nome: string, linhas: unknown[][]): void {
  const csv = linhas.map(l => l.map(v => { let s = String(v ?? ''); if (/^[\s\uFEFF]*[=+@-]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; }).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

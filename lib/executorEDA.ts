'use client';

// EDA_EXECUTOR_V2: grava no navegador, com a sessão da pessoa (RLS e plano valem),
// o que ela AUTORIZOU — e registra tudo em eda_acoes_log para o "Desfazer" (arco e flecha).
import { supabase } from './supabase';
import { acaoRegistroValida, REGRAS_ACAO, type AcaoRegistro } from './acoesEDA';
import { EVENTO_AO_VIVO_EDA } from './aoVivoEDA';

export type AcaoEDA =
  | { tipo: 'lancar'; resumo: string; dados: { tipo: 'receita' | 'despesa'; valor: number; categoria: string; data: string; quitado: boolean; descricao: string } }
  | { tipo: 'baixar'; resumo: string; dados: { id: string; tipo: 'receita' | 'despesa'; data: string } }
  | { tipo: 'demanda'; resumo: string; dados: { id: string; status: 'aberta' | 'encerrada' | 'cancelada' } }
  | AcaoRegistro;

export type ResultadoEDA = { texto: string; href?: string | null; logId?: string | null };

export const JANELA_DESFAZER_MIN = 15;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const avisarTelas = (tabela: string) => window.dispatchEvent(new CustomEvent(EVENTO_AO_VIVO_EDA, { detail: { tabela } }));
const feminino = new Set(['reserva', 'saída', 'demanda', 'embarcação', 'hospedagem']);

export const acaoValidaEDA = (a: unknown): a is AcaoEDA => {
  const x = a as { tipo?: string; resumo?: unknown; dados?: unknown };
  if (!x || typeof x.resumo !== 'string') return false;
  if (x.tipo === 'alterar' || x.tipo === 'criar') return acaoRegistroValida(a);
  return !!x.dados && ['lancar', 'baixar', 'demanda'].includes(x.tipo ?? '');
};

// Regras do banco (saída lotada, conflito de barco, limite do plano) já vêm em português: mostra direto.
function mensagemBanco(e: { message?: string; code?: string } | null, padrao: string) {
  const m = e?.message ?? '';
  if (/limite/i.test(m)) return 'Seu plano chegou ao limite para esse cadastro.';
  if (e?.code === 'P0001' && m && m.length < 220) return m;
  return padrao || 'Não consegui concluir agora.';
}

async function sessao() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sua sessão expirou. Entre novamente.');
  const { data: perfil } = await supabase.from('perfis').select('empresa_id').eq('id', auth.user.id).single();
  if (!perfil?.empresa_id) throw new Error('Não encontrei a empresa da sua conta.');
  return { usuarioId: auth.user.id, empresa: String(perfil.empresa_id) };
}

async function registrar(empresa: string, tipo: string, tabela: string, registroId: string | null, resumo: string, antes: unknown, depois: unknown, extras: Record<string, unknown> = {}) {
  const { data } = await supabase.from('eda_acoes_log').insert({
    empresa_id: empresa, tipo, tabela, registro_id: registroId, resumo: resumo.slice(0, 500), antes, depois, extras,
  }).select('id').single();
  return data?.id ? String(data.id) : null;
}

async function executarRegistro(a: AcaoRegistro, usuarioId: string, empresa: string): Promise<ResultadoEDA> {
  if (!acaoRegistroValida(a)) throw new Error('Essa ação não passou na conferência de segurança.');
  const regra = REGRAS_ACAO[a.tabela];
  const dados: Record<string, unknown> = { ...a.campos };
  const extras: Record<string, unknown> = {};
  if (a.tabela === 'reservas') {
    if (typeof dados.guia_id === 'string') {
      const { data: g } = await supabase.from('guias').select('nome').eq('id', dados.guia_id).eq('empresa_id', empresa).maybeSingle();
      if (!g) throw new Error('Não encontrei esse guia na sua equipe.');
      dados.guia = g.nome;
    } else if (dados.guia_id === null) dados.guia = null;
    if (typeof dados.valor_total === 'number') dados.valor = dados.valor_total;
  }
  if (a.tabela === 'passeios' && typeof dados.preco === 'number') dados.valor = dados.preco;
  if (a.tabela === 'pedidos_visitante' || a.tabela === 'passeio_saidas') dados.atualizado_em = new Date().toISOString();

  if (a.tipo === 'criar') {
    if (a.tabela === 'guias') dados.usuario_id = usuarioId;
    if (a.tabela === 'demandas') { dados.criado_por = usuarioId; dados.metodo_estimativa = 'manual'; }
    // O pedido da Iara não é coluna da reserva: guarda para marcar como convertido depois.
    const pedidoId = typeof dados.pedido_id === 'string' && UUID.test(dados.pedido_id) ? dados.pedido_id : null;
    delete dados.pedido_id;
    if (a.tabela === 'reservas' && !dados.cliente_id) {
      const { data: novo, error: eCli } = await supabase.from('clientes').insert({ nome: dados.cliente, empresa_id: empresa }).select('id').single();
      if (eCli || !novo) throw new Error(mensagemBanco(eCli, 'Não consegui cadastrar o cliente.'));
      dados.cliente_id = novo.id;
      extras.cliente_criado = novo.id;
      avisarTelas('clientes');
    }
    const { data: criado, error } = await supabase.from(a.tabela).insert({ ...dados, empresa_id: empresa }).select('id').single();
    if (error || !criado) {
      if (extras.cliente_criado) await supabase.from('clientes').delete().eq('id', extras.cliente_criado as string).eq('empresa_id', empresa);
      throw new Error(mensagemBanco(error, `Não consegui criar ${feminino.has(regra.nome) ? 'a' : 'o'} ${regra.nome}. Confira os dados ou sua permissão.`));
    }
    if (pedidoId) {
      const { data: ped } = await supabase.from('pedidos_visitante').select('status').eq('id', pedidoId).eq('empresa_id', empresa).maybeSingle();
      if (ped) {
        await supabase.from('pedidos_visitante').update({ status: 'convertido', atualizado_em: new Date().toISOString() }).eq('id', pedidoId).eq('empresa_id', empresa);
        extras.pedido = { id: pedidoId, status_antes: ped.status };
        avisarTelas('pedidos_visitante');
      }
    }
    avisarTelas(a.tabela);
    const logId = await registrar(empresa, 'criar', a.tabela, String(criado.id), a.resumo, null, dados, extras);
    const href = a.tabela === 'reservas' ? `/reservas/editar/${criado.id}` : a.tabela === 'demandas' ? `/demandas/editar/${criado.id}` : null;
    return { texto: `${regra.nome.charAt(0).toUpperCase()}${regra.nome.slice(1)} ${feminino.has(regra.nome) ? 'criada' : 'criado'}.`, href, logId };
  }

  // Alterar: guarda como estava (só os campos mexidos) para poder desfazer.
  const colunas = Object.keys(dados).filter(k => k !== 'atualizado_em');
  const { data: antes } = await supabase.from(a.tabela).select(colunas.join(',')).eq('id', a.id).eq('empresa_id', empresa).maybeSingle();
  const { data, error } = await supabase.from(a.tabela).update(dados).eq('id', a.id).eq('empresa_id', empresa).select('id');
  if (error?.code === 'P0001') throw new Error(mensagemBanco(error, ''));
  if (error || !data?.length) throw new Error(`Não consegui alterar ${feminino.has(regra.nome) ? 'a' : 'o'} ${regra.nome}. Confira sua permissão ou os dados.`);
  avisarTelas(a.tabela);
  const logId = await registrar(empresa, 'alterar', a.tabela, a.id, a.resumo, antes ?? null, dados);
  return { texto: 'Alteração feita.', logId };
}

export async function executarAcaoEDA(a: AcaoEDA): Promise<ResultadoEDA> {
  const { usuarioId, empresa } = await sessao();
  if (a.tipo === 'alterar' || a.tipo === 'criar') return executarRegistro(a, usuarioId, empresa);
  if (a.tipo === 'lancar') {
    const d = a.dados;
    const { data, error } = await supabase.from('financeiro').insert({
      descricao: d.descricao, tipo: d.tipo, valor: d.valor, categoria: d.categoria, data_vencimento: d.data,
      data_liquidacao: d.quitado ? d.data : null,
      status: d.quitado ? (d.tipo === 'receita' ? 'Recebido' : 'Pago') : 'Pendente',
      user_id: usuarioId, empresa_id: empresa,
    }).select('id').single();
    if (error || !data) throw new Error('Não consegui lançar. Confira sua permissão no financeiro.');
    avisarTelas('financeiro');
    return { texto: 'Lançado no financeiro.', logId: await registrar(empresa, 'lancar', 'financeiro', String(data.id), a.resumo, null, d) };
  }
  if (a.tipo === 'baixar') {
    const { data: antes } = await supabase.from('financeiro').select('status,data_liquidacao').eq('id', a.dados.id).eq('empresa_id', empresa).maybeSingle();
    const { data, error } = await supabase.from('financeiro')
      .update({ status: a.dados.tipo === 'receita' ? 'Recebido' : 'Pago', data_liquidacao: a.dados.data })
      .eq('id', a.dados.id).eq('empresa_id', empresa).select('id');
    if (error || !data?.length) throw new Error('Não consegui dar baixa. Confira sua permissão no financeiro.');
    avisarTelas('financeiro');
    return { texto: 'Baixa feita.', logId: await registrar(empresa, 'baixar', 'financeiro', a.dados.id, a.resumo, antes ?? null, null) };
  }
  const { data: antes } = await supabase.from('demandas').select('status').eq('id', a.dados.id).eq('empresa_id', empresa).maybeSingle();
  const { data, error } = await supabase.from('demandas').update({ status: a.dados.status }).eq('id', a.dados.id).eq('empresa_id', empresa).select('id');
  if (error || !data?.length) throw new Error('Não consegui mudar a demanda. Confira sua permissão.');
  avisarTelas('demandas');
  return { texto: 'Demanda atualizada.', logId: await registrar(empresa, 'demanda', 'demandas', a.dados.id, a.resumo, antes ?? null, null) };
}

const TABELAS_DESFAZER = new Set([...Object.keys(REGRAS_ACAO), 'financeiro']);

/** Desfaz uma ação da EDA (até JANELA_DESFAZER_MIN minutos, só quem executou). */
export async function desfazerAcaoEDA(logId: string): Promise<string> {
  if (!UUID.test(logId)) throw new Error('Não achei essa ação.');
  const { usuarioId, empresa } = await sessao();
  const { data: log } = await supabase.from('eda_acoes_log').select('*').eq('id', logId).eq('empresa_id', empresa).maybeSingle();
  if (!log || log.usuario_id !== usuarioId) throw new Error('Só quem autorizou pode desfazer.');
  if (log.desfeito_em) throw new Error('Essa ação já foi desfeita.');
  if (Date.now() - new Date(log.criado_em).getTime() > JANELA_DESFAZER_MIN * 60_000) throw new Error(`Passou de ${JANELA_DESFAZER_MIN} minutos — agora ajuste direto na tela.`);
  const tabela = String(log.tabela);
  if (!TABELAS_DESFAZER.has(tabela) || !UUID.test(String(log.registro_id ?? ''))) throw new Error('Essa ação não pode ser desfeita por aqui.');
  const id = String(log.registro_id);

  if (log.tipo === 'criar' || log.tipo === 'lancar') {
    const { error } = await supabase.from(tabela).delete().eq('id', id).eq('empresa_id', empresa);
    if (error) {
      // Reserva tem histórico protegido: se não puder apagar, cancela.
      if (tabela !== 'reservas') throw new Error(mensagemBanco(error, 'Não consegui desfazer — ajuste direto na tela.'));
      const { error: e2 } = await supabase.from('reservas').update({ status: 'Cancelada' }).eq('id', id).eq('empresa_id', empresa);
      if (e2) throw new Error(mensagemBanco(e2, 'Não consegui desfazer a reserva.'));
    }
    const extras = (log.extras ?? {}) as { cliente_criado?: string; pedido?: { id: string; status_antes: string } };
    if (extras.pedido?.id) await supabase.from('pedidos_visitante').update({ status: extras.pedido.status_antes || 'novo' }).eq('id', extras.pedido.id).eq('empresa_id', empresa);
    if (extras.cliente_criado && !error) await supabase.from('clientes').delete().eq('id', extras.cliente_criado).eq('empresa_id', empresa);
  } else {
    const antes = log.antes as Record<string, unknown> | null;
    if (!antes || !Object.keys(antes).length) throw new Error('Não guardei como estava antes — ajuste direto na tela.');
    const { error } = await supabase.from(tabela).update(antes).eq('id', id).eq('empresa_id', empresa);
    if (error) throw new Error(mensagemBanco(error, 'Não consegui desfazer — ajuste direto na tela.'));
  }
  await supabase.from('eda_acoes_log').update({ desfeito_em: new Date().toISOString() }).eq('id', logId);
  avisarTelas(tabela);
  return 'Desfeito — voltou como estava. ↺';
}

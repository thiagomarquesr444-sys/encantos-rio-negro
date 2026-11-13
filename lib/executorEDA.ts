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
  | { tipo: 'voucher'; resumo: string; dados: { reserva_id: string } }
  | { tipo: 'avaliacao'; resumo: string; dados: { avaliacao_id: string } }
  | AcaoRegistro;

/** whatsapp: link wa.me já montado (a pessoa toca para enviar — o navegador não deixa abrir sozinho). */
export type ResultadoEDA = { texto: string; href?: string | null; logId?: string | null; whatsapp?: string | null };

export const JANELA_DESFAZER_MIN = 15;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const avisarTelas = (tabela: string) => window.dispatchEvent(new CustomEvent(EVENTO_AO_VIVO_EDA, { detail: { tabela } }));
const feminino = new Set(['reserva', 'saída', 'demanda', 'embarcação', 'hospedagem']);

export const acaoValidaEDA = (a: unknown): a is AcaoEDA => {
  const x = a as { tipo?: string; resumo?: unknown; dados?: unknown };
  if (!x || typeof x.resumo !== 'string') return false;
  if (x.tipo === 'alterar' || x.tipo === 'criar') return acaoRegistroValida(a);
  if (!x.dados || typeof x.dados !== 'object') return false;
  if (x.tipo === 'voucher') return UUID.test(String((x.dados as { reserva_id?: unknown }).reserva_id ?? ''));
  if (x.tipo === 'avaliacao') return UUID.test(String((x.dados as { avaliacao_id?: unknown }).avaliacao_id ?? ''));
  return ['lancar', 'baixar', 'demanda'].includes(x.tipo ?? '');
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
    if (a.tabela === 'demandas') { dados.criado_por = usuarioId; dados.metodo_estimativa ??= 'manual'; }
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

const MENSAGENS_VOUCHER: [string, string][] = [
  ['EDA_VOUCHER_RESERVA_NAO_CONFIRMADA', 'A reserva precisa estar Confirmada para emitir o voucher.'],
  ['EDA_VOUCHER_SEM_PAGAMENTO', 'Ainda não há pagamento recebido nessa reserva — registre o pagamento e eu emito.'],
  ['EDA_VOUCHER_SEM_VALOR', 'A reserva está sem valor — complete o valor antes do voucher.'],
  ['EDA_VOUCHER_JA_EMITIDO', 'Essa reserva já tem voucher ativo.'],
  ['EDA_VOUCHER_PLANO', 'Vouchers estão disponíveis a partir do plano Pro.'],
  ['EDA_VOUCHER_MFA', 'Confirme a verificação em duas etapas para emitir vouchers.'],
  ['EDA_VOUCHER_SEM_PERMISSAO', 'Somente o administrador ou operador da empresa emite vouchers.'],
];

/** EDA_LOTE2_V1: voucher pela regra do banco (Confirmada + paga + sem voucher ativo). */
async function emitirVoucher(reservaId: string, empresa: string, resumo: string): Promise<ResultadoEDA> {
  const { data, error } = await supabase.rpc('emitir_voucher_reserva_eda', { p_reserva_id: reservaId, p_substituir: false });
  if (error || !data?.id) {
    const m = error?.message ?? '';
    throw new Error(MENSAGENS_VOUCHER.find(([c]) => m.includes(c))?.[1] ?? 'Não consegui emitir o voucher agora.');
  }
  avisarTelas('vouchers');
  avisarTelas('reservas');
  await registrar(empresa, 'voucher', 'vouchers', String(data.id), resumo, null, { reserva_id: reservaId, codigo: data.codigo });
  // Voucher emitido não se desfaz pelo arco: é documento do turista (cancelamento só pela reserva).
  return { texto: `Voucher ${data.codigo ?? ''} emitido.`.replace('  ', ' '), href: `/reservas/editar/${reservaId}` };
}

const soDigitos = (t: string | null | undefined) => String(t ?? '').replace(/\D/g, '');

/** EDA_LOTE2_V1: pedido de avaliação pós-viagem — mensagem pronta com o link; a pessoa toca para enviar. */
async function pedirAvaliacao(avaliacaoId: string, empresa: string): Promise<ResultadoEDA> {
  const { data: av } = await supabase.from('avaliacoes').select('token,reserva_id,passeio_nome,respondido_em').eq('id', avaliacaoId).eq('empresa_id', empresa).maybeSingle();
  if (!av?.token) throw new Error('Não achei essa avaliação.');
  if (av.respondido_em) return { texto: 'O cliente já avaliou essa viagem. 🙌' };
  const [{ data: rv }, { data: emp }] = await Promise.all([
    supabase.from('reservas').select('cliente,cliente_id').eq('id', av.reserva_id).eq('empresa_id', empresa).maybeSingle(),
    supabase.from('empresa').select('nome').eq('id', empresa).maybeSingle(),
  ]);
  const { data: cli } = rv?.cliente_id ? await supabase.from('clientes').select('telefone').eq('id', rv.cliente_id).maybeSingle() : { data: null };
  const nome = String(rv?.cliente ?? '').trim().split(/\s+/)[0] || 'tudo bem';
  const link = `${window.location.origin}/avaliar/${av.token}`;
  const texto = `Olá, ${nome}! Aqui é da ${emp?.nome ?? 'nossa equipe'}. 🌿 Esperamos que ${av.passeio_nome ?? 'a experiência'} tenha sido inesquecível!\n\nConta pra gente como foi? Leva menos de 1 minuto: ${link}\n\nObrigado por viver a Amazônia com a gente! 🌊`;
  await supabase.from('posvenda_envios').upsert({ reserva_id: av.reserva_id, tipo: 'pos', empresa_id: empresa }, { onConflict: 'reserva_id,tipo', ignoreDuplicates: true });
  let tel = soDigitos(cli?.telefone);
  if (tel.length >= 10 && tel.length <= 11) tel = `55${tel}`;
  if (tel.length >= 12) return { texto: 'Mensagem pronta. Toque em "Enviar no WhatsApp" para mandar ao cliente.', whatsapp: `https://wa.me/${tel}?text=${encodeURIComponent(texto)}` };
  try { await navigator.clipboard.writeText(texto); } catch { /* sem área de transferência */ }
  return { texto: 'O cliente está sem telefone no cadastro — copiei a mensagem com o link para você enviar por onde preferir.' };
}

export async function executarAcaoEDA(a: AcaoEDA): Promise<ResultadoEDA> {
  const { usuarioId, empresa } = await sessao();
  if (a.tipo === 'alterar' || a.tipo === 'criar') return executarRegistro(a, usuarioId, empresa);
  if (a.tipo === 'voucher') return emitirVoucher(a.dados.reserva_id, empresa, a.resumo);
  if (a.tipo === 'avaliacao') return pedirAvaliacao(a.dados.avaliacao_id, empresa);
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
  if (log.tipo === 'voucher') throw new Error('Voucher emitido não se desfaz por aqui — cancele pela reserva.');
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

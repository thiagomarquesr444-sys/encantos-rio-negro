import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buscarCheckoutPendenteEDA, desistirCheckoutEDA } from '@/lib/checkoutPendenteEDA';

/*
  EDA_CHECKOUT_PENDENTE_V1
  GET  -> contratação aguardando pagamento (com link da fatura).
  POST -> { acao: 'desistir' } cancela a contratação pendente.
  Somente o administrador da empresa.
*/

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const opcoes = { auth: { persistSession: false, autoRefreshToken: false } };

function erro(mensagem: string, status: number, codigo: string) {
  return NextResponse.json({ ok: false, erro: mensagem, codigo }, { status });
}

async function contextoAdministrador(request: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Configuração do Supabase ausente.');
  }
  const authorization = request.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return null;

  const auth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, opcoes);
  const { data, error } = await auth.auth.getUser(authorization.substring(7));
  if (error || !data.user) return null;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, opcoes);
  const { data: perfil } = await admin
    .from('perfis')
    .select('empresa_id, role')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!perfil?.empresa_id || perfil.role !== 'admin_empresa') return { admin, empresaId: null };
  return { admin, empresaId: perfil.empresa_id as string };
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await contextoAdministrador(request);
    if (!ctx) return erro('Sessão inválida.', 401, 'ERN_SESSAO_INVALIDA');
    if (!ctx.empresaId) return NextResponse.json({ ok: true, pendente: null });

    const pendente = await buscarCheckoutPendenteEDA(ctx.admin, ctx.empresaId);
    if (!pendente) return NextResponse.json({ ok: true, pendente: null });

    return NextResponse.json({
      ok: true,
      pendente: {
        plano_nome: pendente.plano_nome,
        ciclo: pendente.ciclo,
        valor: pendente.valor,
        vencimento: pendente.vencimento,
        criado_em: pendente.criado_em,
        link_pagamento: pendente.link_pagamento,
      },
    });
  } catch (e) {
    console.error('[EDA CHECKOUT PENDENTE GET]', e);
    return erro('Não foi possível consultar a contratação pendente.', 500, 'ERN_FALHA_CONSULTA');
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await contextoAdministrador(request);
    if (!ctx) return erro('Sessão inválida.', 401, 'ERN_SESSAO_INVALIDA');
    if (!ctx.empresaId) {
      return erro('Somente o administrador da empresa pode alterar o plano.', 403, 'ERN_SEM_PERMISSAO');
    }

    const corpo = await request.json().catch(() => null);
    if (corpo?.acao !== 'desistir') return erro('Ação inválida.', 400, 'ERN_ACAO_INVALIDA');

    const pendente = await buscarCheckoutPendenteEDA(ctx.admin, ctx.empresaId);
    if (!pendente) return NextResponse.json({ ok: true, mensagem: 'Não há contratação pendente.' });

    const resultado = await desistirCheckoutEDA(ctx.admin, pendente);
    if (!resultado.ok) return erro(resultado.mensagem, 409, resultado.codigo);

    return NextResponse.json({
      ok: true,
      mensagem: 'Contratação cancelada. Você já pode escolher outro plano.',
    });
  } catch (e) {
    console.error('[EDA CHECKOUT PENDENTE POST]', e);
    return erro('Não foi possível cancelar a contratação. Tente novamente.', 500, 'ERN_FALHA_DESISTENCIA');
  }
}

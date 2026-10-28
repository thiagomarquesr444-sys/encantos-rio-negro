'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Registro = Record<string, unknown>;
type Situacao = { titulo: string; valor: string; concluido: boolean; detalhes: string };

const ESTILO = 'min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#151A1B] p-4 text-[#F1F4EF] shadow-[0_10px_35px_rgba(0,0,0,0.12)] sm:p-5';

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim().slice(0, 220) : '';
}
function obter(registro: Registro, nomes: string[]): string {
  for (const nome of nomes) {
    const valor = texto(registro[nome]);
    if (valor) return valor;
  }
  return '';
}
function documentosCnpj(valor: string): string {
  return valor.replace(/\D/g, '');
}

export default function CadastroFiscalERN() {
  const [empresa, setEmpresa] = useState<Registro | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [versao, setVersao] = useState(0);

  const atualizar = useCallback(() => setVersao(atual => atual + 1), []);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregando(true);
      setErro('');
      setEmpresa(null);
      try {
        const { data: auth, error: erroAuth } = await supabase.auth.getUser();
        if (erroAuth || !auth.user) throw new Error('Faça login para consultar os dados fiscais da operadora.');
        const { data: perfil, error: erroPerfil } = await supabase.from('perfis')
          .select('empresa_id,role').eq('id', auth.user.id).maybeSingle();
        if (erroPerfil || !perfil?.empresa_id || !['admin_empresa', 'financeiro', 'admin_plataforma'].includes(String(perfil.role))) {
          throw new Error('Seu perfil não tem autorização para consultar os dados empresariais.');
        }
        const [financeiro, relatorios] = await Promise.all([
          supabase.rpc('ern_pode_acessar_modulo', { p_modulo: 'financeiro' }),
          supabase.rpc('ern_pode_acessar_modulo', { p_modulo: 'relatorios' }),
        ]);
        if (financeiro.error || relatorios.error || (financeiro.data !== true && relatorios.data !== true)) {
          throw new Error('Você não possui permissão para o módulo fiscal.');
        }
        // A empresa da sessão é o único registro consultado. A RLS do Supabase permanece obrigatória.
        const { data, error } = await supabase.from('empresa').select('*')
          .eq('id', String(perfil.empresa_id)).maybeSingle();
        if (error || !data) throw new Error('Cadastro empresarial não disponível para sua conta.');
        if (ativo) setEmpresa(data as Registro);
      } catch (falha) {
        if (ativo) setErro(falha instanceof Error ? falha.message : 'Falha ao consultar o cadastro empresarial.');
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    void carregar();
    return () => { ativo = false; };
  }, [versao]);

  const dados: Situacao[] = empresa ? (() => {
    const nome = obter(empresa, ['razao_social', 'razaoSocial', 'nome_empresarial', 'nome', 'nome_fantasia']);
    const cnpj = obter(empresa, ['cnpj', 'cnpj_prestador', 'documento_cnpj']);
    const inscricao = obter(empresa, ['inscricao_municipal', 'inscricaoMunicipal', 'im']);
    const municipio = obter(empresa, ['municipio', 'cidade', 'municipio_prestacao']);
    const uf = obter(empresa, ['uf', 'estado']);
    const endereco = obter(empresa, ['endereco', 'logradouro', 'endereco_fiscal']);
    return [
      { titulo: 'Identificação empresarial', valor: nome || 'Não localizada', concluido: Boolean(nome), detalhes: 'Nome ou razão social cadastrada' },
      { titulo: 'CNPJ do prestador', valor: documentosCnpj(cnpj).length === 14 ? 'Informado no cadastro' : 'Pendente', concluido: documentosCnpj(cnpj).length === 14, detalhes: 'Verificação apenas de presença e formato; sem consulta cadastral oficial' },
      { titulo: 'Inscrição municipal', valor: inscricao ? 'Informada no cadastro' : 'Não localizada', concluido: Boolean(inscricao), detalhes: 'A exigência depende do município e do enquadramento do prestador' },
      { titulo: 'Município e UF', valor: [municipio, uf].filter(Boolean).join(' / ') || 'Não localizados', concluido: Boolean(municipio && uf), detalhes: 'Dados usados para preparação, não como validação tributária' },
      { titulo: 'Endereço fiscal', valor: endereco ? 'Informado no cadastro' : 'Não localizado', concluido: Boolean(endereco), detalhes: 'Demais elementos do endereço precisam ser confirmados antes da emissão' },
    ];
  })() : [];

  const preenchidos = dados.filter(item => item.concluido).length;

  return (
    <section aria-label="Cadastro fiscal do prestador" className={ESTILO}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#E3A144]">Preparação para NFS-e</p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight">Dados fiscais do prestador</h2>
          <p className="mt-1 text-xs leading-5 text-[#94A5A1]">Conferência do cadastro da sua operadora, sem exigir CNPJ da plataforma ERN.</p>
        </div>
        <button type="button" onClick={atualizar} disabled={carregando}
          className="min-h-10 rounded-lg border border-white/15 px-3 text-xs font-medium hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E3A144] disabled:opacity-50">
          Atualizar cadastro
        </button>
      </div>
      {carregando ? <p role="status" className="mt-4 text-xs text-[#94A5A1]">Consultando dados autorizados…</p> : null}
      {erro ? <div role="alert" className="mt-4 rounded-lg border border-rose-400/30 p-3 text-xs text-rose-200">{erro}</div> : null}
      {empresa ? (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E3A144]/20 bg-[#E3A144]/[0.05] p-3">
            <div><p className="text-xs font-semibold text-[#F0C47D]">Pré-preenchimento cadastral: {preenchidos} de {dados.length}</p>
            <p className="mt-1 text-[11px] text-[#A6B4AE]">Indicador informativo; não é homologação e não libera emissão fiscal.</p></div>
            <span className="rounded-md border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wider text-[#C4D1CA]">Emissão desativada</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {dados.map(item => (
              <div key={item.titulo} className="min-w-0 rounded-xl border border-white/[0.07] bg-[#101616] p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold">{item.titulo}</p>
                  <span className={item.concluido ? 'text-[10px] text-emerald-300' : 'text-[10px] text-amber-300'}>{item.concluido ? 'Informado' : 'Revisar'}</span>
                </div>
                <p className="mt-2 break-words text-xs text-[#E0E8E1]">{item.valor}</p>
                <p className="mt-1 text-[11px] leading-4 text-[#8FA19A]">{item.detalhes}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link href="/configuracoes" className="inline-flex min-h-10 items-center rounded-lg border border-[#E3A144]/40 bg-[#E3A144]/10 px-3 text-xs font-semibold text-[#F0C47D] hover:bg-[#E3A144]/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E3A144]">Abrir configurações da operadora</Link>
            <p className="max-w-xl text-[11px] leading-5 text-[#8FA19A]">Campos ausentes não são criados nem gravados automaticamente. Dados fiscais definitivos e autorização de emissão serão implementados em fluxo específico.</p>
          </div>
        </>
      ) : null}
    </section>
  );
}

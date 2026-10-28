'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';

type Dados = {
  razao_social: string; cnpj: string; inscricao_municipal: string;
  municipio: string; uf: string; codigo_municipio_ibge: string;
  cep: string; logradouro: string; numero: string; complemento: string;
  bairro: string; email_fiscal: string; telefone_fiscal: string;
};
type Linha = Partial<Dados> & { empresa_id: string };
const VAZIO: Dados = {
  razao_social: '', cnpj: '', inscricao_municipal: '', municipio: '', uf: '',
  codigo_municipio_ibge: '', cep: '', logradouro: '', numero: '',
  complemento: '', bairro: '', email_fiscal: '', telefone_fiscal: '',
};
const campos: { campo: keyof Dados; titulo: string; largura?: boolean; ajuda?: string }[] = [
  { campo: 'razao_social', titulo: 'Razão social do prestador', largura: true },
  { campo: 'cnpj', titulo: 'CNPJ (14 dígitos)' },
  { campo: 'inscricao_municipal', titulo: 'Inscrição municipal', ajuda: 'Se aplicável ao município e enquadramento.' },
  { campo: 'municipio', titulo: 'Município do prestador' },
  { campo: 'uf', titulo: 'UF (sigla)' },
  { campo: 'codigo_municipio_ibge', titulo: 'Código IBGE do município (7 dígitos)' },
  { campo: 'cep', titulo: 'CEP (8 dígitos)' },
  { campo: 'logradouro', titulo: 'Logradouro', largura: true },
  { campo: 'numero', titulo: 'Número' },
  { campo: 'complemento', titulo: 'Complemento' },
  { campo: 'bairro', titulo: 'Bairro' },
  { campo: 'email_fiscal', titulo: 'E-mail fiscal' },
  { campo: 'telefone_fiscal', titulo: 'Telefone fiscal' },
];
const painel = 'min-w-0 rounded-2xl border border-white/[0.08] bg-[#151A1B] p-4 text-[#F1F4EF] sm:p-5';
const input = 'mt-2 min-h-11 w-full min-w-0 rounded-xl border border-white/15 bg-[#101616] px-3 text-sm text-[#F1F4EF] outline-none focus-visible:ring-2 focus-visible:ring-[#E3A144] disabled:opacity-50';
const somenteDigitos = (s: string) => s.replace(/\D/g, '');
function cnpjValido(s: string): boolean {
  const c = somenteDigitos(s);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(c[i]) * (n === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2][i] : [6,5,4,3,2,9,8,7,6,5,4,3,2][i]);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
}
function validar(d: Dados): string {
  if (d.razao_social.trim().length < 2) return 'Informe a razão social do prestador.';
  if (d.cnpj && !cnpjValido(d.cnpj)) return 'CNPJ inválido: confira os dígitos verificadores.';
  if (d.uf && !/^[A-Z]{2}$/.test(d.uf)) return 'UF deve conter duas letras.';
  if (d.codigo_municipio_ibge && !/^\d{7}$/.test(d.codigo_municipio_ibge)) return 'Código IBGE deve conter sete dígitos.';
  if (d.cep && !/^\d{8}$/.test(d.cep)) return 'CEP deve conter oito dígitos.';
  if (d.email_fiscal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email_fiscal)) return 'E-mail fiscal inválido.';
  return '';
}
function obter(r: Record<string, unknown>, nomes: string[]): string {
  for (const nome of nomes) if (typeof r[nome] === 'string' && String(r[nome]).trim()) return String(r[nome]).trim();
  return '';
}

export default function CadastroFiscalERN() {
  const [dados, setDados] = useState<Dados>({ ...VAZIO });
  const [empresaId, setEmpresaId] = useState('');
  const [podeEditar, setPodeEditar] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [alterado, setAlterado] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [versao, setVersao] = useState(0);
  const salvandoRef = useRef(false);
  const atualizar = useCallback(() => setVersao(v => v + 1), []);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregando(true); setErro(''); setAviso(''); setEmpresaId(''); setPodeEditar(false);
      try {
        const { data: a, error: ae } = await supabase.auth.getUser();
        if (ae || !a.user) throw new Error('Faça login na conta da operadora.');
        const { data: p, error: pe } = await supabase.from('perfis').select('empresa_id,role').eq('id', a.user.id).single();
        if (pe || !p?.empresa_id || !['admin_empresa', 'financeiro', 'admin_plataforma'].includes(String(p.role))) throw new Error('Perfil empresarial sem permissão fiscal.');
        const [f, r] = await Promise.all([
          supabase.rpc('ern_pode_acessar_modulo', { p_modulo: 'financeiro' }),
          supabase.rpc('ern_pode_acessar_modulo', { p_modulo: 'relatorios' }),
        ]);
        if (f.error || r.error || (f.data !== true && r.data !== true)) throw new Error('Seu perfil não possui acesso ao módulo fiscal.');
        const id = String(p.empresa_id);
        const [{ data: empresa, error: ee }, { data: fiscal, error: fe }] = await Promise.all([
          supabase.from('empresa').select('*').eq('id', id).maybeSingle(),
          supabase.from('empresa_fiscal_ern').select('empresa_id,razao_social,cnpj,inscricao_municipal,municipio,uf,codigo_municipio_ibge,cep,logradouro,numero,complemento,bairro,email_fiscal,telefone_fiscal').eq('empresa_id', id).maybeSingle(),
        ]);
        if (ee || !empresa) throw new Error('Cadastro empresarial indisponível.');
        if (fe) throw new Error('Cadastro fiscal ainda não está disponível. Aplique a migração V47.9 no Supabase.');
        const original = empresa as Record<string, unknown>;
        const sugestoes: Dados = {
          ...VAZIO,
          razao_social: obter(original, ['razao_social', 'nome_empresarial', 'nome', 'nome_fantasia']),
          cnpj: obter(original, ['cnpj', 'cnpj_prestador']),
          inscricao_municipal: obter(original, ['inscricao_municipal']),
          municipio: obter(original, ['municipio', 'cidade']),
          uf: obter(original, ['uf', 'estado']).toUpperCase(),
          logradouro: obter(original, ['logradouro', 'endereco']),
        };
        const registro = fiscal as Linha | null;
        const preenchido = { ...sugestoes };
        if (registro) for (const chave of Object.keys(VAZIO) as (keyof Dados)[]) preenchido[chave] = registro[chave] ?? '';
        if (!ativo) return;
        setDados(preenchido); setAlterado(false); setEmpresaId(id); setPodeEditar(p.role === 'admin_empresa');
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : 'Não foi possível carregar o cadastro fiscal.');
      } finally { if (ativo) setCarregando(false); }
    }
    void carregar();
    return () => { ativo = false; };
  }, [versao]);

  function alterar(chave: keyof Dados, valor: string) {
    if (!podeEditar || salvandoRef.current) return;
    if (['cnpj','cep','codigo_municipio_ibge'].includes(chave)) valor = somenteDigitos(valor);
    if (chave === 'uf') valor = valor.toUpperCase().replace(/[^A-Z]/g, '');
    setDados(a => ({ ...a, [chave]: valor })); setAlterado(true); setAviso('');
  }
  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!empresaId || !podeEditar || salvandoRef.current) return;
    const falha = validar(dados);
    if (falha) { setErro(falha); return; }
    salvandoRef.current = true; setSalvando(true); setErro(''); setAviso('');
    try {
      // O banco valida novamente empresa_id, papel, limites e política RLS.
      const payload: Linha = { empresa_id: empresaId };
      for (const chave of Object.keys(VAZIO) as (keyof Dados)[]) payload[chave] = dados[chave].trim();
      const { data, error } = await supabase.from('empresa_fiscal_ern').upsert(payload, { onConflict: 'empresa_id' }).select('empresa_id').single();
      if (error) {
  console.error('[ERN fiscal: salvamento]', {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
  throw new Error(`Falha Supabase: ${error.code ?? 'SEM_CODIGO'}. Consulte o console do navegador.`);
}
if (!data) throw new Error('Salvamento sem confirmação do banco.');
      setAlterado(false); setAviso('Dados fiscais salvos para esta operadora. Nenhuma NFS-e foi emitida.');
    } catch (e) { setErro(e instanceof Error ? e.message : 'Erro ao salvar.'); }
    finally { salvandoRef.current = false; setSalvando(false); }
  }

  const preenchidos = Object.values(dados).filter(v => v.trim().length > 0).length;
  return (
    <section aria-label="Cadastro fiscal do prestador" className={painel}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#E3A144]">ERN / PREPARAÇÃO PARA NFS-e</p>
          <h2 className="mt-2 text-lg font-semibold">Cadastro fiscal da operadora</h2>
          <p className="mt-1 text-xs leading-5 text-[#94A5A1]">Dados privados do prestador. Não modificam o perfil público nem autorizam emissão oficial.</p></div>
        <button type="button" onClick={() => { if (alterado && !window.confirm('Descartar alterações não salvas?')) return; atualizar(); }} disabled={carregando || salvando}
          className="min-h-10 rounded-xl border border-white/15 px-3 text-xs hover:bg-white/5 disabled:opacity-50">Recarregar</button>
      </header>
      {carregando && <p role="status" className="mt-4 text-sm text-[#94A5A1]">Consultando cadastro autorizado…</p>}
      {erro && <p role="alert" className="mt-4 rounded-xl border border-rose-400/30 p-3 text-sm text-rose-200">{erro}</p>}
      {aviso && <p role="status" className="mt-4 rounded-xl border border-emerald-400/20 p-3 text-sm text-emerald-200">{aviso}</p>}
      {empresaId && !carregando && <>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E3A144]/20 bg-[#E3A144]/[0.05] p-3 text-xs">
          <span className="text-[#F0C47D]">{preenchidos} de {Object.keys(dados).length} campos com informações</span>
          <span className="text-[#C4D1CA]">Emissão oficial desativada · {podeEditar ? 'Administrador' : 'Somente leitura'}</span>
        </div>
        <form onSubmit={salvar} className="mt-4 space-y-4">
          <fieldset disabled={!podeEditar || salvando} className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {campos.map(({ campo, titulo, largura, ajuda }) => <label key={campo} className={largura ? 'min-w-0 sm:col-span-2' : 'min-w-0'}>
              <span className="text-xs font-medium text-[#DFE7E0]">{titulo}</span>
              <input className={input} value={dados[campo]} maxLength={{ razao_social:180, cnpj:14, inscricao_municipal:40, municipio:120, uf:2, codigo_municipio_ibge:7, cep:8, logradouro:180, numero:25, complemento:120, bairro:120, email_fiscal:180, telefone_fiscal:30 }[campo]}
                onChange={e => alterar(campo, e.target.value)} autoComplete="off" spellCheck={false} />
              {ajuda && <span className="mt-1 block text-[11px] text-[#94A5A1]">{ajuda}</span>}
            </label>)}
          </fieldset>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <p className="text-[11px] text-[#94A5A1]">O preenchimento não comprova situação cadastral, regularidade ou habilitação no emissor nacional.</p>
            {podeEditar && <button type="submit" disabled={salvando || !alterado} className="min-h-11 rounded-xl bg-[#E3A144] px-5 text-sm font-semibold text-[#141918] disabled:opacity-50">{salvando ? 'Salvando…' : 'Salvar dados fiscais'}</button>}
          </div>
        </form>
      </>}
    </section>
  );
}

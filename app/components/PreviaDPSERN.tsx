'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Registro = Record<string, unknown>;
type Situacao = { rotulo: string; valor: string; obrigatorio?: boolean };

const card = 'min-w-0 rounded-xl border border-white/10 bg-[#101616] p-3';
function texto(registro: Registro | null, chaves: string[]): string {
  if (!registro) return '';
  for (const chave of chaves) {
    const valor = registro[chave];
    if (typeof valor === 'string' && valor.trim()) return valor.trim().slice(0, 180);
  }
  return '';
}
function valorMonetario(valor: unknown): string {
  const numero = typeof valor === 'number' || typeof valor === 'string' ? Number(valor) : NaN;
  return Number.isFinite(numero) && numero > 0
    ? numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'Não informado';
}
function identificarTomador(registro: Registro | null): string {
  return texto(registro, ['nome', 'nome_completo', 'razao_social', 'nome_cliente', 'nome_fantasia']);
}

export default function PreviaDPSERN({ reservaId }: { reservaId: string }) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [dados, setDados] = useState<Situacao[] | null>(null);
  const [pendencias, setPendencias] = useState<string[]>([]);

  useEffect(() => {
    let ativo = true;
    setDados(null);
    setPendencias([]);
    setErro('');
    if (!reservaId) return () => { ativo = false; };

    async function consultar() {
      setCarregando(true);
      try {
        const { data: auth, error: authErro } = await supabase.auth.getUser();
        if (authErro || !auth.user) throw new Error('Sessão indisponível.');
        const { data: perfil, error: perfilErro } = await supabase.from('perfis')
          .select('empresa_id,role').eq('id', auth.user.id).single();
        if (perfilErro || !perfil?.empresa_id || !['admin_empresa','financeiro','admin_plataforma'].includes(String(perfil.role))) {
          throw new Error('Acesso fiscal não autorizado.');
        }
        const empresaId = String(perfil.empresa_id);
        const [financeiro, relatorios] = await Promise.all([
          supabase.rpc('ern_pode_acessar_modulo', { p_modulo: 'financeiro' }),
          supabase.rpc('ern_pode_acessar_modulo', { p_modulo: 'relatorios' }),
        ]);
        if (financeiro.error || relatorios.error || (financeiro.data !== true && relatorios.data !== true)) {
          throw new Error('Sem permissão para este módulo.');
        }
        const [reservaResult, fiscalResult] = await Promise.all([
          supabase.from('reservas').select('id,cliente_id,status,valor_total')
            .eq('empresa_id', empresaId).eq('id', reservaId).maybeSingle(),
          supabase.from('empresa_fiscal_ern')
            .select('razao_social,cnpj,inscricao_municipal,municipio,uf,codigo_municipio_ibge')
            .eq('empresa_id', empresaId).maybeSingle(),
        ]);
        if (reservaResult.error || !reservaResult.data) throw new Error('Reserva não disponível para a operadora.');
        if (fiscalResult.error) throw new Error('Dados fiscais não disponíveis.');
        const reserva = reservaResult.data;
        const fiscal = (fiscalResult.data ?? null) as Registro | null;
        let tomador: Registro | null = null;
        if (reserva.cliente_id) {
          const resposta = await supabase.from('clientes').select('*')
            .eq('empresa_id', empresaId).eq('id', String(reserva.cliente_id)).maybeSingle();
          if (resposta.error) throw new Error('Não foi possível consultar o tomador autorizado.');
          tomador = (resposta.data ?? null) as Registro | null;
        }
        const razao = texto(fiscal, ['razao_social']);
        const cnpj = texto(fiscal, ['cnpj']).replace(/\D/g, '');
        const municipio = texto(fiscal, ['municipio']);
        const uf = texto(fiscal, ['uf']);
        const codigo = texto(fiscal, ['codigo_municipio_ibge']);
        const clienteNome = identificarTomador(tomador);
        const docTomador = texto(tomador, ['cpf_cnpj', 'documento', 'cpf', 'cnpj']).replace(/\D/g, '');
        const itens: Situacao[] = [
          { rotulo: 'Reserva', valor: String(reserva.id).slice(0, 8) },
          { rotulo: 'Prestador', valor: razao || 'Pendente', obrigatorio: true },
          { rotulo: 'CNPJ do prestador', valor: cnpj.length === 14 ? 'Informado (não verificado oficialmente)' : 'Pendente', obrigatorio: true },
          { rotulo: 'Município / UF', valor: municipio && uf ? `${municipio} / ${uf}` : 'Pendente', obrigatorio: true },
          { rotulo: 'Código IBGE', valor: /^\d{7}$/.test(codigo) ? codigo : 'Pendente', obrigatorio: true },
          { rotulo: 'Tomador', valor: clienteNome || 'Pendente', obrigatorio: true },
          { rotulo: 'Documento do tomador', valor: [11,14].includes(docTomador.length) ? 'Informado (não verificado oficialmente)' : 'A confirmar' },
          { rotulo: 'Status da reserva', valor: String(reserva.status ?? 'Não informado') },
          { rotulo: 'Valor comercial da reserva', valor: valorMonetario(reserva.valor_total) },
          { rotulo: 'Serviço tributável e código nacional', valor: 'Pendente de classificação e revisão fiscal', obrigatorio: true },
          { rotulo: 'Competência e local de incidência', valor: 'Pendente de revisão', obrigatorio: true },
          { rotulo: 'Base de cálculo, deduções e retenções', valor: 'Pendente de revisão fiscal', obrigatorio: true },
        ];
        const faltas: string[] = [];
        if (!razao) faltas.push('Identificação do prestador');
        if (cnpj.length !== 14) faltas.push('CNPJ do prestador');
        if (!municipio || !uf || !/^\d{7}$/.test(codigo)) faltas.push('Município e código IBGE');
        if (!clienteNome || !reserva.cliente_id) faltas.push('Identificação do tomador');
        if (String(reserva.status ?? '').toLowerCase().includes('cancelad')) faltas.push('Reserva cancelada');
        if (valorMonetario(reserva.valor_total) === 'Não informado') faltas.push('Valor comercial válido');
        faltas.push('Classificação do serviço, competência e revisão tributária');
        if (ativo) { setDados(itens); setPendencias(faltas); }
      } catch (falha) {
        if (ativo) setErro(falha instanceof Error ? falha.message : 'Prévia indisponível.');
      } finally { if (ativo) setCarregando(false); }
    }
    void consultar();
    return () => { ativo = false; };
  }, [reservaId]);

  if (!reservaId) return null;
  return (
    <div aria-label="Prévia de preparação DPS" className="mt-4 rounded-xl border border-[#E3A144]/30 bg-[#0C1112] p-4 text-[#F1F4EF]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E3A144]">ERN / Conferência documental</p>
          <h3 className="mt-1 text-base font-semibold">Prévia de preparação da DPS</h3>
          <p className="mt-1 text-xs leading-5 text-[#94A5A1]">Somente leitura dos dados da operadora e da reserva. Não é uma DPS oficial, XML ou nota fiscal.</p>
        </div>
        <span className="rounded-lg border border-amber-400/30 px-2 py-1 text-[10px] font-bold uppercase text-amber-200">Não emitida</span>
      </div>
      {carregando && <p role="status" className="mt-4 text-sm text-[#94A5A1]">Conferindo dados autorizados…</p>}
      {erro && <p role="alert" className="mt-4 text-sm text-rose-300">{erro}</p>}
      {dados && !carregando && <>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {dados.map(item => <div key={item.rotulo} className={card}>
            <p className="text-[11px] text-[#94A5A1]">{item.rotulo}</p>
            <p className="mt-1 break-words text-xs font-semibold text-[#F1F4EF]">{item.valor}</p>
          </div>)}
        </div>
        <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-3">
          <p className="text-xs font-semibold text-amber-200">Pendências antes da emissão ({pendencias.length})</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-[#BAC7BE]">
            {pendencias.map(item => <li key={item}>{item}</li>)}
          </ul>
          <p className="mt-3 text-[11px] leading-5 text-[#94A5A1]">A identificação e o valor da reserva não determinam, por si só, a incidência do ISS, o enquadramento tributário, os campos obrigatórios da DPS ou a possibilidade de emissão.</p>
        </div>
      </>}
    </div>
  );
}

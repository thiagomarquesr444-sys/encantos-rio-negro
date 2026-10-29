'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Registro = Record<string, unknown>;
type Secao = 'prestador' | 'tomador' | 'reserva' | 'tributacao';
type Campo = { titulo: string; valor: string; completo: boolean; observacao?: string };
type Grupo = { id: Secao; titulo: string; descricao: string; campos: Campo[]; pendencias: string[] };
type Revisao = { grupos: Grupo[]; reserva: string };

const cartao = 'min-w-0 rounded-xl border border-white/10 bg-[#101616] p-3';
const numeros = (valor: string) => valor.replace(/\D/g, '');

function texto(registro: Registro | null, chaves: string[]): string {
  if (!registro) return '';
  for (const chave of chaves) {
    const valor = registro[chave];
    if (typeof valor === 'string' && valor.trim()) return valor.trim().slice(0, 180);
  }
  return '';
}

function dinheiro(valor: unknown): string {
  const n = typeof valor === 'number' || typeof valor === 'string' ? Number(valor) : NaN;
  return Number.isFinite(n) && n > 0
    ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'Não informado';
}

function documentoResumido(valor: string): string {
  const digitos = numeros(valor);
  if (digitos.length !== 11 && digitos.length !== 14) return 'Não informado';
  return `${digitos.length === 11 ? 'CPF' : 'CNPJ'} ·•••${digitos.slice(-4)} (não validado oficialmente)`;
}

function campo(titulo: string, valor: string, completo: boolean, observacao?: string): Campo {
  return { titulo, valor: valor || 'Não informado', completo, observacao };
}

export default function PreviaDPSERN({ reservaId }: { reservaId: string }) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [revisao, setRevisao] = useState<Revisao | null>(null);

  useEffect(() => {
    let ativo = true;
    setRevisao(null);
    setErro('');
    if (!reservaId) return () => { ativo = false; };

    async function consultar() {
      setCarregando(true);
      try {
        const { data: autenticacao, error: erroAuth } = await supabase.auth.getUser();
        if (erroAuth || !autenticacao.user) throw new Error('Sessão indisponível. Entre novamente.');
        const { data: perfil, error: erroPerfil } = await supabase.from('perfis')
          .select('empresa_id,role').eq('id', autenticacao.user.id).single();
        if (erroPerfil || !perfil?.empresa_id || !['admin_empresa', 'financeiro', 'admin_plataforma'].includes(String(perfil.role))) {
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

        const [reservaResposta, fiscalResposta] = await Promise.all([
          supabase.from('reservas').select('id,cliente_id,status,valor_total')
            .eq('empresa_id', empresaId).eq('id', reservaId).maybeSingle(),
          supabase.from('empresa_fiscal_ern')
            .select('razao_social,cnpj,inscricao_municipal,municipio,uf,codigo_municipio_ibge,cep,logradouro,numero,bairro')
            .eq('empresa_id', empresaId).maybeSingle(),
        ]);
        if (reservaResposta.error || !reservaResposta.data) throw new Error('Reserva não disponível para sua operadora.');
        if (fiscalResposta.error) throw new Error('Cadastro fiscal indisponível.');
        const reserva = reservaResposta.data;
        const fiscal = (fiscalResposta.data ?? null) as Registro | null;
        let tomador: Registro | null = null;
        if (reserva.cliente_id) {
          const resposta = await supabase.from('clientes').select('*')
            .eq('empresa_id', empresaId).eq('id', String(reserva.cliente_id)).maybeSingle();
          if (resposta.error) throw new Error('Falha ao consultar o tomador autorizado.');
          tomador = (resposta.data ?? null) as Registro | null;
        }

        const razao = texto(fiscal, ['razao_social']);
        const cnpj = numeros(texto(fiscal, ['cnpj']));
        const municipio = texto(fiscal, ['municipio']);
        const uf = texto(fiscal, ['uf']);
        const ibge = texto(fiscal, ['codigo_municipio_ibge']);
        const inscricao = texto(fiscal, ['inscricao_municipal']);
        const endereco = [texto(fiscal, ['logradouro']), texto(fiscal, ['numero']), texto(fiscal, ['bairro'])].filter(Boolean).join(', ');
        const nomeTomador = texto(tomador, ['nome', 'nome_completo', 'razao_social', 'nome_cliente', 'nome_fantasia']);
        const documentoTomador = numeros(texto(tomador, ['cpf_cnpj', 'documento', 'cpf', 'cnpj']));
        const valor = dinheiro(reserva.valor_total);
        const cancelada = String(reserva.status ?? '').toLowerCase().includes('cancelad');
        const grupos: Grupo[] = [
          {
            id: 'prestador', titulo: '01 · Prestador', descricao: 'Dados privados da operadora responsável pelo serviço',
            campos: [
              campo('Razão social', razao, Boolean(razao)),
              campo('CNPJ', documentoResumido(cnpj), cnpj.length === 14, 'Formato informado; não representa validação na Receita Federal'),
              campo('Inscrição municipal', inscricao || 'A confirmar se aplicável', Boolean(inscricao), 'Exigibilidade sujeita às regras locais'),
              campo('Município / UF', [municipio, uf].filter(Boolean).join(' / '), Boolean(municipio && /^[A-Z]{2}$/.test(uf))),
              campo('Código IBGE', ibge, /^\d{7}$/.test(ibge)),
              campo('Endereço fiscal', endereco, Boolean(endereco), 'Conferir CEP e demais elementos antes da emissão'),
            ],
            pendencias: [
              ...(!razao ? ['Informar razão social do prestador'] : []),
              ...(cnpj.length !== 14 ? ['Informar CNPJ do prestador, quando constituído'] : []),
              ...(!municipio || !/^[A-Z]{2}$/.test(uf) || !/^\d{7}$/.test(ibge) ? ['Conferir município, UF e código IBGE'] : []),
              'Validar dados cadastrais e habilitação municipal em fonte oficial',
            ],
          },
          {
            id: 'tomador', titulo: '02 · Tomador', descricao: 'Identificação do cliente vinculado à reserva',
            campos: [
              campo('Cliente', nomeTomador, Boolean(nomeTomador)),
              campo('CPF/CNPJ', documentoResumido(documentoTomador), [11, 14].includes(documentoTomador.length), 'Dígitos e situação cadastral não verificados'),
              campo('Vínculo com a reserva', reserva.cliente_id ? 'Cliente vinculado' : 'Não vinculado', Boolean(reserva.cliente_id)),
            ],
            pendencias: [
              ...(!nomeTomador ? ['Identificar o tomador vinculado à reserva'] : []),
              ...(![11, 14].includes(documentoTomador.length) ? ['Conferir documento do tomador, conforme exigência aplicável'] : []),
              'Confirmar dados e tratamento fiscal do tomador antes de emissão',
            ],
          },
          {
            id: 'reserva', titulo: '03 · Reserva e serviço', descricao: 'Referência comercial, ainda sem definição da base tributável',
            campos: [
              campo('Reserva', String(reserva.id).slice(0, 8), true),
              campo('Situação operacional', String(reserva.status ?? 'Não informado'), Boolean(reserva.status) && !cancelada),
              campo('Valor comercial', valor, valor !== 'Não informado'),
              campo('Descrição fiscal do serviço', 'A definir na revisão', false),
            ],
            pendencias: [
              ...(cancelada ? ['Reserva cancelada: operação impedida'] : []),
              ...(valor === 'Não informado' ? ['Informar valor comercial positivo'] : []),
              'Definir e revisar a descrição do serviço efetivamente prestado',
            ],
          },
          {
            id: 'tributacao', titulo: '04 · Revisão tributária', descricao: 'Classificação e parâmetros a conferir com o responsável fiscal',
            campos: [
              campo('Código nacional de serviço', 'Não classificado', false),
              campo('Competência', 'A confirmar', false),
              campo('Local de incidência / ISS', 'A confirmar', false),
              campo('Base, deduções e retenções', 'A confirmar', false),
            ],
            pendencias: [
              'Classificar o serviço pelo enquadramento adequado',
              'Confirmar competência, local de incidência e município competente',
              'Revisar base de cálculo, deduções, alíquota e retenções aplicáveis',
            ],
          },
        ];
        if (ativo) setRevisao({ grupos, reserva: String(reserva.id).slice(0, 8) });
      } catch (falha) {
        if (ativo) setErro(falha instanceof Error ? falha.message : 'Revisão indisponível.');
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    void consultar();
    return () => { ativo = false; };
  }, [reservaId]);

  if (!reservaId) return null;
  const pendencias = revisao?.grupos.reduce((soma, grupo) => soma + grupo.pendencias.length, 0) ?? 0;
  const dadosPreenchidos = revisao?.grupos.reduce((soma, grupo) => soma + grupo.campos.filter(item => item.completo).length, 0) ?? 0;
  const dadosTotais = revisao?.grupos.reduce((soma, grupo) => soma + grupo.campos.length, 0) ?? 0;

  return (
    <section aria-label="Central de revisão documental DPS" className="mt-4 min-w-0 rounded-xl border border-[#E3A144]/30 bg-[#0C1112] p-3 text-[#F1F4EF] sm:p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E3A144]">ERN / Fiscal Premium</p>
          <h3 className="mt-1 text-lg font-semibold">Central de revisão documental</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#94A5A1]">Prévia interna de preparação para DPS. Não é DPS, XML, NFS-e nem autorização de emissão.</p>
        </div>
        <span className="rounded-lg border border-amber-400/30 px-3 py-1.5 text-[10px] font-bold uppercase text-amber-200">Emissão bloqueada</span>
      </header>
      {carregando && <p role="status" className="mt-4 text-sm text-[#94A5A1]">Conferindo os dados autorizados…</p>}
      {erro && <p role="alert" className="mt-4 rounded-lg border border-rose-400/30 p-3 text-sm text-rose-200">{erro}</p>}
      {revisao && !carregando && <>
        <div className="mt-4 grid gap-2 sm:grid-cols-3" aria-label="Resumo da revisão">
          <div className={cartao}><p className="text-[11px] text-[#94A5A1]">Reserva</p><strong className="mt-1 block text-sm">{revisao.reserva}</strong></div>
          <div className={cartao}><p className="text-[11px] text-[#94A5A1]">Campos de conferência preenchidos</p><strong className="mt-1 block text-sm">{dadosPreenchidos} de {dadosTotais}</strong></div>
          <div className={cartao}><p className="text-[11px] text-[#94A5A1]">Pontos de revisão</p><strong className="mt-1 block text-sm text-amber-200">{pendencias}</strong></div>
        </div>
        <p role="status" className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/[0.04] p-3 text-xs leading-5 text-amber-100">
          Estado: conferência documental pendente. Dados preenchidos não equivalem a habilitação fiscal; classificação e tributação exigem revisão. Nenhuma etapa desta página transmite informações ao emissor.
        </p>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {revisao.grupos.map(grupo => (
            <article key={grupo.id} className="min-w-0 rounded-xl border border-white/[0.08] bg-[#151A1B] p-3 sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h4 className="text-sm font-semibold">{grupo.titulo}</h4><p className="mt-1 text-[11px] text-[#94A5A1]">{grupo.descricao}</p></div>
                <span className="rounded-md border border-amber-400/25 px-2 py-1 text-[10px] text-amber-200">{grupo.pendencias.length} a revisar</span>
              </div>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {grupo.campos.map(item => <div key={item.titulo} className={cartao}>
                  <dt className="text-[11px] text-[#94A5A1]">{item.titulo}</dt>
                  <dd className="mt-1 break-words text-xs font-semibold">{item.valor}</dd>
                  {item.observacao && <p className="mt-1 text-[10px] leading-4 text-[#879A91]">{item.observacao}</p>}
                </div>)}
              </dl>
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="text-xs font-semibold text-[#E9B76B]">Pendências e confirmações</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-5 text-[#B6C6BC]">
                  {grupo.pendencias.map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </article>
          ))}
        </div>
        <footer className="mt-3 border-t border-white/10 pt-3 text-[11px] leading-5 text-[#94A5A1]">
          A reserva representa uma referência comercial. O valor exibido não define automaticamente base tributável, incidência de ISS ou possibilidade de emissão de NFS-e. Dados do tomador são exibidos de forma minimizada.
        </footer>
      </>}
    </section>
  );
}

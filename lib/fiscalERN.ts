/**
 * Encantos da Amazônia (EDA) - Dominio Fiscal V1
 *
 * Esta versao opera exclusivamente em simulacao.
 * Nao emite notas fiscais nem acessa APIs externas.
 */

export type AmbienteFiscalERN = 'simulacao';

export type StatusSimulacaoFiscalERN =
  | 'rascunho'
  | 'validacao_pendente'
  | 'simulada'
  | 'erro_simulacao';

/**
 * Estados reservados para uma futura integracao real.
 * Nao sao aceitos pelas tabelas fiscais V1.
 */
export type StatusEmissaoRealERN =
  | 'solicitada'
  | 'em_processamento'
  | 'autorizada'
  | 'erro'
  | 'cancelamento_solicitado'
  | 'cancelada'
  | 'cancelamento_negado';

export type StatusFiscalERN =
  | StatusSimulacaoFiscalERN
  | StatusEmissaoRealERN;

export interface SolicitacaoFiscalSimulacaoERN {
  id: string;
  empresaId: string;
  reservaId: string | null;
  clienteId: string | null;
  ambiente: AmbienteFiscalERN;
  status: StatusSimulacaoFiscalERN;
  chaveIdempotencia: string;
  valorServico: number | null;
}

export const STATUS_SIMULACAO_ERN: readonly StatusSimulacaoFiscalERN[] =
  [
    'rascunho',
    'validacao_pendente',
    'simulada',
    'erro_simulacao',
  ];

export function statusSimulacaoValidoERN(
  valor: unknown
): valor is StatusSimulacaoFiscalERN {
  return (
    typeof valor === 'string' &&
    STATUS_SIMULACAO_ERN.some(status => status === valor)
  );
}

export function descricaoStatusFiscalERN(
  status: StatusFiscalERN
): string {
  const descricoes: Record<StatusFiscalERN, string> = {
    rascunho: 'Rascunho',
    validacao_pendente: 'Aguardando validacao',
    simulada: 'Simulacao concluida - sem valor fiscal',
    erro_simulacao: 'Erro na simulacao',

    solicitada: 'Solicitacao encaminhada ao emissor',
    em_processamento: 'Em processamento',
    autorizada: 'NFS-e autorizada',
    erro: 'Falha na emissao',
    cancelamento_solicitado: 'Cancelamento solicitado',
    cancelada: 'NFS-e cancelada',
    cancelamento_negado: 'Cancelamento negado',
  };

  return descricoes[status];
}

export function emissaoRealPermitidaERN(
  ambiente: AmbienteFiscalERN
): boolean {
  // V1: emissao real permanentemente desabilitada.
  void ambiente;
  return false;
}

export function notaFiscalAutorizadaERN(
  situacao: {
    ambiente: AmbienteFiscalERN;
    status: StatusFiscalERN;
  }
): boolean {
  // Nenhum documento V1 pode ser tratado como NFS-e.
  void situacao;
  return false;
}

export function prepararChaveSimulacaoERN(
  empresaId: string,
  identificadorOperacao: string
): string {
  const empresa = empresaId.trim();
  const operacao = identificadorOperacao.trim();

  if (!empresa || !operacao) {
    throw new Error(
      'Empresa e identificador da operacao sao obrigatorios.'
    );
  }

  return `simulacao:${empresa}:${operacao}`;
}
// ERN_FISCAL_EMITENTE_V1: o emitente da NFS-e é sempre a operadora
// (cadastro fiscal privado). A plataforma EDA nunca é a emitente.
export function cnpjValidoERN(valor: string | null | undefined): boolean {
  const c = String(valor ?? '').replace(/\D/g, '');
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = (n: number) => {
    const pesos = n === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(c[i]) * pesos[i];
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
}

export type EmitenteFiscalERN = {
  razao_social: string;
  cnpj: string;
  inscricao_municipal: string;
  codigo_municipio_ibge: string;
};

/** Mesmas regras da função SQL ern_fiscal_simular_reserva_v1. */
export function pendenciasEmitenteERN(e: EmitenteFiscalERN | null): string[] {
  if (!e) return ['Cadastro fiscal não preenchido'];
  const p: string[] = [];
  if (!e.razao_social.trim()) p.push('Razão social');
  if (!cnpjValidoERN(e.cnpj)) p.push('CNPJ válido (14 dígitos)');
  if (!e.inscricao_municipal.trim()) p.push('Inscrição municipal');
  if (e.codigo_municipio_ibge.replace(/\D/g, '').length !== 7) p.push('Código IBGE do município');
  return p;
}

// ERN_FISCAL_REGIME_ISS_V1: estimativa de tributos por nota (sem validade fiscal).
export type RegimeTributarioERN = '' | 'mei' | 'simples_nacional' | 'lucro_presumido' | 'lucro_real';

export const REGIMES_TRIBUTARIOS_ERN: { valor: RegimeTributarioERN; rotulo: string }[] = [
  { valor: '', rotulo: 'Não informado' },
  { valor: 'mei', rotulo: 'MEI' },
  { valor: 'simples_nacional', rotulo: 'Simples Nacional' },
  { valor: 'lucro_presumido', rotulo: 'Lucro Presumido' },
  { valor: 'lucro_real', rotulo: 'Lucro Real' },
];

export function regimeTributarioValidoERN(v: unknown): v is RegimeTributarioERN {
  return REGIMES_TRIBUTARIOS_ERN.some((r) => r.valor === v);
}

export type ParametrosTributariosERN = {
  regime: RegimeTributarioERN;
  aliquotaIss: number | null;
  aliquotaSimples: number | null;
};

export type EstimativaTributosERN = {
  linhas: { nome: string; aliquota: number; valor: number }[];
  total: number;
  informativos: { nome: string; aliquota: number; valor: number }[];
  observacoes: string[];
  completa: boolean;
};

const centavos = (n: number) => Math.round(n * 100) / 100;

/**
 * Estimativa simples por nota. Presumido usa as presunções padrão de serviços
 * (IRPJ 15% e CSLL 9% sobre 32%; PIS 0,65%; COFINS 3%), sem adicional de IRPJ.
 * IBS/CBS de 2026 aparecem só como informativos (teste, não somam ao total).
 */
export function estimarTributosERN(valor: number, p: ParametrosTributariosERN): EstimativaTributosERN {
  const base = Number.isFinite(valor) && valor > 0 ? valor : 0;
  const linha = (nome: string, aliquota: number) => ({ nome, aliquota, valor: centavos(base * aliquota / 100) });
  const obs: string[] = [];
  const linhas: EstimativaTributosERN['linhas'] = [];
  let completa = true;

  switch (p.regime) {
    case 'mei':
      obs.push('MEI paga o DAS mensal fixo: não há imposto calculado por nota. Confirme se a atividade é permitida no MEI e acompanhe o limite anual de faturamento.');
      break;
    case 'simples_nacional':
      if (p.aliquotaSimples === null) {
        completa = false;
        obs.push('Informe a alíquota efetiva do Simples (Anexo III começa em 6%).');
      } else {
        linhas.push(linha('Simples Nacional (DAS, já inclui ISS)', p.aliquotaSimples));
      }
      obs.push('No Simples, o IBS/CBS de teste de 2026 não se aplica.');
      break;
    case 'lucro_presumido':
      if (p.aliquotaIss === null) { completa = false; obs.push('Informe a alíquota de ISS do município (2% a 5%).'); }
      else linhas.push(linha('ISS', p.aliquotaIss));
      linhas.push(linha('PIS', 0.65), linha('COFINS', 3), linha('IRPJ (15% × 32%)', 4.8), linha('CSLL (9% × 32%)', 2.88));
      obs.push('Sem o adicional de 10% do IRPJ, que vale acima de R$ 20 mil de lucro presumido por mês.');
      break;
    case 'lucro_real':
      if (p.aliquotaIss === null) { completa = false; obs.push('Informe a alíquota de ISS do município (2% a 5%).'); }
      else linhas.push(linha('ISS', p.aliquotaIss));
      completa = false;
      obs.push('No Lucro Real, PIS/COFINS/IRPJ/CSLL dependem da apuração da empresa: confirme com o contador.');
      break;
    default:
      completa = false;
      obs.push('Informe o regime tributário no cadastro fiscal para estimar os impostos.');
  }

  const informativos = p.regime === 'lucro_presumido' || p.regime === 'lucro_real'
    ? [linha('CBS (teste 2026)', 0.9), linha('IBS (teste 2026)', 0.1)]
    : [];

  return {
    linhas,
    total: centavos(linhas.reduce((s, l) => s + l.valor, 0)),
    informativos,
    observacoes: obs,
    completa,
  };
}

/**
 * Encantos Rio Negro - Dominio Fiscal V1
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
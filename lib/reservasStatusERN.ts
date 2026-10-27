export type StatusReservaERN =
  | 'Pendente'
  | 'Confirmada'
  | 'Cancelada'
  | 'Concluída'
  | 'Não compareceu'
  | 'Desconhecido';

export function normalizarStatusReservaERN(
  valor?: string | null
): StatusReservaERN {
  const status = (valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

  switch (status) {
    case 'pendente':
      return 'Pendente';
    case 'confirmada':
      return 'Confirmada';
    case 'cancelada':
      return 'Cancelada';
    case 'concluida':
      return 'Concluída';
    case 'nao compareceu':
      return 'Não compareceu';
    default:
      return 'Desconhecido';
  }
}

export function reservaEncerradaERN(
  valor?: string | null
): boolean {
  const status = normalizarStatusReservaERN(valor);
  return status === 'Concluída' || status === 'Não compareceu';
}

export function reservaOperacionalERN(
  valor?: string | null
): boolean {
  const status = normalizarStatusReservaERN(valor);
  return status === 'Pendente' || status === 'Confirmada';
}
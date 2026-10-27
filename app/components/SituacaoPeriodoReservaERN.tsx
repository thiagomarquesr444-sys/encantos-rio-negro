'use client';

interface Props {
  status?: string | null;
  inicio?: string | null;
  fim?: string | null;
  horarioFim?: string | null;
  referencia: string;
  detalhado?: boolean;
}

const formatadorManaus = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Manaus',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export function referenciaManausERN(agora = new Date()): string {
  const partes = formatadorManaus.formatToParts(agora);
  const obter = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';

  return `${obter('year')}-${obter('month')}-${obter('day')}T${obter('hour')}:${obter('minute')}:${obter('second')}`;
}

function dataISO(valor?: string | null): string | null {
  const data = valor?.trim().split('T')[0] ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;

  const instante = new Date(`${data}T12:00:00Z`);
  if (!Number.isFinite(instante.getTime())) return null;
  return instante.toISOString().slice(0, 10) === data ? data : null;
}

function horaISO(valor?: string | null): string | null {
  const hora = valor?.trim() ?? '';
  if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d+)?)?$/.test(hora)) {
    return null;
  }

  return hora.length === 5 ? `${hora}:00` : hora.slice(0, 8);
}

export default function SituacaoPeriodoReservaERN({
  status,
  inicio,
  fim,
  horarioFim,
  referencia,
  detalhado = false,
}: Props) {
  if (!referencia) return null;

  const estado = (status ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  if (estado !== 'confirmada' && estado !== 'pendente') return null;

  const hoje = referencia.slice(0, 10);
  const horaAtual = referencia.slice(11, 19);
  const dataInicio = dataISO(inicio);
  const dataFim = dataISO(fim);
  const horaFim = horaISO(horarioFim);

  let rotulo = '';
  let explicacao = '';

  if (dataFim && (!dataInicio || dataFim >= dataInicio)) {
    const terminou =
      dataFim < hoje ||
      (dataFim === hoje && horaFim !== null && horaFim <= horaAtual);

    if (terminou) {
      rotulo = estado === 'confirmada'
        ? 'A finalizar'
        : 'Data passada — revisar';
      explicacao =
        'O término previsto passou. Confira o resultado da operação antes de alterar o status.';
    }
  } else if (dataInicio && dataInicio < hoje) {
    rotulo = 'Data passada — revisar';
    explicacao =
      'A data inicial passou e não há término previsto válido. Confira o período e o resultado da operação.';
  }

  if (!rotulo) return null;

  return (
    <span className="block max-w-[16rem] text-xs leading-5 text-amber-200">
      <span className="block font-semibold">{rotulo}</span>
      {detalhado && <span className="block text-[#C5D4CA]">{explicacao}</span>}
    </span>
  );
}
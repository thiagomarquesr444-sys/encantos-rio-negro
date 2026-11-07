// EDA_PIX_RECEBIMENTO_V1: Pix copia-e-cola (BR Code estático, padrão EMV do Banco Central).
// Gerado no próprio aparelho: sem intermediário e sem custo.

export type TipoChavePix = 'email' | 'telefone' | 'cpf' | 'cnpj' | 'aleatoria';

export const TIPOS_CHAVE_PIX: [TipoChavePix, string][] = [
  ['telefone', 'Celular'], ['cpf', 'CPF'], ['cnpj', 'CNPJ'], ['email', 'E-mail'], ['aleatoria', 'Chave aleatória'],
];

export function cpfValido(d: string) {
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

function cnpjValido(d: string) {
  if (!/^\d{14}$/.test(d) || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (n: number) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = pesos.reduce((s, p, i) => s + Number(d[i]) * p, 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

// Celular: DDD válido (11-99) + 9 dígitos começando por 9.
const pareceCelular = (d: string) => /^[1-9][1-9]9\d{8}$/.test(d);

// tipo: quando informado, a chave é validada nesse formato (11 dígitos podem ser CPF ou celular).
export function normalizarChavePix(bruta: string, tipo?: TipoChavePix | ''): { chave: string; tipo: TipoChavePix } | null {
  const t = bruta.trim();
  if (!t) return null;
  const d = t.replace(/\D/g, '');
  const nac = d.length >= 12 && d.startsWith('55') ? d.slice(2) : d;
  const tel = () => (nac.length === 10 || nac.length === 11) && /^[1-9][1-9]/.test(nac) ? { chave: `+55${nac}`, tipo: 'telefone' as const } : null;
  if (tipo === 'email') return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t) ? { chave: t.toLowerCase(), tipo } : null;
  if (tipo === 'aleatoria') return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t) ? { chave: t.toLowerCase(), tipo } : null;
  if (tipo === 'telefone') return tel();
  if (tipo === 'cpf') return cpfValido(d) ? { chave: d, tipo } : null;
  if (tipo === 'cnpj') return cnpjValido(d) ? { chave: d, tipo } : null;

  // Automático
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t)) return { chave: t.toLowerCase(), tipo: 'email' };
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return { chave: t.toLowerCase(), tipo: 'aleatoria' };
  if (t.startsWith('+') || /\(\d{2}\)/.test(t) || (d.length >= 12 && d.startsWith('55'))) return tel();
  if (d.length === 11) {
    // CPF só quando os dígitos verificadores batem; senão, celular.
    if (cpfValido(d) && !pareceCelular(d)) return { chave: d, tipo: 'cpf' };
    if (pareceCelular(d) && !cpfValido(d)) return tel();
    if (cpfValido(d)) return { chave: d, tipo: 'cpf' }; // ambíguo: o operador escolhe o tipo
    return null;
  }
  if (d.length === 10) return tel();
  if (d.length === 14 && cnpjValido(d)) return { chave: d, tipo: 'cnpj' };
  return null;
}

// Ambíguo = 11 dígitos que são CPF válido e também têm formato de celular.
export function chavePixAmbigua(bruta: string) {
  const d = bruta.replace(/\D/g, '');
  return !bruta.trim().startsWith('+') && d.length === 11 && cpfValido(d) && pareceCelular(d);
}

function semAcento(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().trim();
}

function campo(id: string, valor: string) {
  return id + String(valor.length).padStart(2, '0') + valor;
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function pixCopiaECola(o: { chave: string; nome: string; cidade: string; valor?: number; txid?: string; mensagem?: string }) {
  const norm = normalizarChavePix(o.chave);
  if (!norm) throw new Error('Chave Pix inválida.');
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', norm.chave)
    + (o.mensagem ? campo('02', semAcento(o.mensagem).slice(0, 40)) : '');
  const txid = (o.txid ?? '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
  let p = campo('00', '01')
    + campo('26', conta)
    + campo('52', '0000')
    + campo('53', '986')
    + (o.valor && o.valor > 0 ? campo('54', o.valor.toFixed(2)) : '')
    + campo('58', 'BR')
    + campo('59', semAcento(o.nome).slice(0, 25) || 'RECEBEDOR')
    + campo('60', semAcento(o.cidade).slice(0, 15) || 'BARCELOS')
    + campo('62', campo('05', txid))
    + '6304';
  p += crc16(p);
  return p;
}

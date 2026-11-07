// EDA_PIX_RECEBIMENTO_V1: Pix copia-e-cola (BR Code estático, padrão EMV do Banco Central).
// Gerado no próprio aparelho: sem intermediário e sem custo.

export type TipoChavePix = 'email' | 'telefone' | 'cpf' | 'cnpj' | 'aleatoria';

export function normalizarChavePix(bruta: string): { chave: string; tipo: TipoChavePix } | null {
  const t = bruta.trim();
  if (!t) return null;
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t)) return { chave: t.toLowerCase(), tipo: 'email' };
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return { chave: t.toLowerCase(), tipo: 'aleatoria' };
  const d = t.replace(/\D/g, '');
  if (t.startsWith('+') || /\(\d{2}\)/.test(t) || (d.length >= 12 && d.startsWith('55'))) {
    const nac = d.startsWith('55') ? d.slice(2) : d;
    if (nac.length === 10 || nac.length === 11) return { chave: `+55${nac}`, tipo: 'telefone' };
  }
  if (d.length === 11) return { chave: d, tipo: 'cpf' };
  if (d.length === 14) return { chave: d, tipo: 'cnpj' };
  return null;
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

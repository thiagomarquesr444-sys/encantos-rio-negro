// EDA_OPCOES_PADRAO_V1: listas padronizadas dos cadastros.
// O operador escolhe; "Outro" abre um campo para o que o cliente especificar.

export type OpcaoEDA = readonly [valor: string, rotulo: string];

export const TIPOS_HOSPEDAGEM: readonly OpcaoEDA[] = [
  ['Hotel', 'Hotel'], ['Pousada', 'Pousada'], ['Lodge de selva', 'Lodge de selva'],
  ['Barco-hotel', 'Barco-hotel'], ['Flutuante', 'Flutuante'], ['Hotel de selva', 'Hotel de selva'],
  ['Resort', 'Resort'], ['Hostel', 'Hostel'], ['Casa de temporada', 'Casa de temporada'],
  ['Casa de família / comunitária', 'Casa de família / comunitária'], ['Camping / redário', 'Camping / redário'],
];

export const CONDICAO_EMBARCACAO: readonly OpcaoEDA[] = [
  ['Excelente', 'Excelente'], ['Boa', 'Boa'], ['Regular', 'Regular'],
  ['Precisa de manutenção', 'Precisa de manutenção'],
];

export const IDIOMAS: readonly OpcaoEDA[] = [
  ['Português', 'Português'], ['Inglês', 'Inglês'], ['Espanhol', 'Espanhol'], ['Francês', 'Francês'],
  ['Italiano', 'Italiano'], ['Alemão', 'Alemão'], ['Nheengatu', 'Nheengatu'], ['Libras', 'Libras'],
];

export const NACIONALIDADES: readonly OpcaoEDA[] = [
  ['Brasileira', 'Brasileira'], ['Norte-americana', 'Norte-americana'], ['Argentina', 'Argentina'],
  ['Colombiana', 'Colombiana'], ['Venezuelana', 'Venezuelana'], ['Peruana', 'Peruana'],
  ['Chilena', 'Chilena'], ['Uruguaia', 'Uruguaia'], ['Paraguaia', 'Paraguaia'], ['Canadense', 'Canadense'],
  ['Mexicana', 'Mexicana'], ['Portuguesa', 'Portuguesa'], ['Espanhola', 'Espanhola'], ['Francesa', 'Francesa'],
  ['Italiana', 'Italiana'], ['Alemã', 'Alemã'], ['Britânica', 'Britânica'], ['Holandesa', 'Holandesa'],
  ['Suíça', 'Suíça'], ['Japonesa', 'Japonesa'], ['Chinesa', 'Chinesa'], ['Australiana', 'Australiana'],
];

// Duração do passeio: número + unidade (vira duracao_horas / duracao_dias no banco).
export const UNIDADES_DURACAO: readonly OpcaoEDA[] = [['horas', 'hora(s)'], ['dias', 'dia(s)']];

export function separarDuracao(texto: string): { numero: string; unidade: 'horas' | 'dias' } {
  const t = texto.trim().toLowerCase();
  const n = t.match(/(\d+(?:[.,]\d+)?)/)?.[1]?.replace(',', '.') ?? '';
  return { numero: n, unidade: /h|hora/.test(t) && !/dia|noite/.test(t) ? 'horas' : 'dias' };
}

export function montarDuracao(numero: string, unidade: 'horas' | 'dias'): string {
  const n = Number(numero.replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return '';
  if (unidade === 'horas') return `${String(n).replace('.', ',')}h`;
  return `${n} ${n === 1 ? 'dia' : 'dias'}`;
}

export const CATEGORIAS_PASSEIO: readonly OpcaoEDA[] = [
  ['Ecoturismo', 'Ecoturismo'], ['Passeios Fluviais', 'Passeios Fluviais'],
  ['Pesca Esportiva', 'Pesca Esportiva'], ['Imersão Cultural', 'Imersão Cultural'],
];

export const ORIGENS_CLIENTE: readonly OpcaoEDA[] = [
  ['Indicação', 'Indicação'], ['Instagram', 'Instagram'], ['Facebook', 'Facebook'], ['Google', 'Google'],
  ['Portal Encantos', 'Portal Encantos'], ['WhatsApp', 'WhatsApp'], ['Agência parceira', 'Agência parceira'],
  ['Feira / evento', 'Feira / evento'], ['Cliente que retornou', 'Cliente que retornou'],
];

export const PREFERENCIAS_CLIENTE: readonly OpcaoEDA[] = [
  ['Pesca esportiva', 'Pesca esportiva'], ['Ecoturismo', 'Ecoturismo'], ['Cultura e comunidades', 'Cultura e comunidades'],
  ['Observação de fauna', 'Observação de fauna'], ['Fotografia', 'Fotografia'], ['Aventura', 'Aventura'],
  ['Família / crianças', 'Família / crianças'], ['Conforto premium', 'Conforto premium'], ['Grupo grande', 'Grupo grande'],
];

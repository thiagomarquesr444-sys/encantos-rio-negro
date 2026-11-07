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

export const TIPOS_RELATORIO: readonly OpcaoEDA[] = [
  ['Operacional', 'Operacional'], ['Financeiro', 'Financeiro'], ['Comercial', 'Comercial'],
  ['Temporada de pesca', 'Temporada de pesca'], ['Prestação de contas', 'Prestação de contas'],
  ['Qualidade e satisfação', 'Qualidade e satisfação'], ['Segurança', 'Segurança'],
];

export const ESPECIALIDADES_OPERADORA: readonly OpcaoEDA[] = [
  ['Pesca esportiva', 'Pesca esportiva'], ['Passeios fluviais', 'Passeios fluviais'], ['Ecoturismo', 'Ecoturismo'],
  ['Turismo de base comunitária', 'Turismo de base comunitária'], ['Observação de fauna', 'Observação de fauna'],
  ['Trilhas na floresta', 'Trilhas na floresta'], ['Gastronomia regional', 'Gastronomia regional'],
  ['Hospedagem / lodge', 'Hospedagem / lodge'], ['Barco-hotel', 'Barco-hotel'], ['Fotografia de natureza', 'Fotografia de natureza'],
  ['Cultura e festivais', 'Cultura e festivais'], ['Transfer fluvial', 'Transfer fluvial'],
];

export const ATIVIDADES_FORNECEDOR: readonly OpcaoEDA[] = [
  ['Alimentação / refeições', 'Alimentação / refeições'], ['Mercado / suprimentos', 'Mercado / suprimentos'],
  ['Combustível', 'Combustível'], ['Transporte fluvial', 'Transporte fluvial'], ['Transporte terrestre', 'Transporte terrestre'],
  ['Iscas e equipamentos de pesca', 'Iscas e equipamentos de pesca'], ['Gelo', 'Gelo'], ['Artesanato', 'Artesanato'],
  ['Manutenção de barcos e motores', 'Manutenção de barcos e motores'], ['Lavanderia', 'Lavanderia'],
  ['Comunicação / internet', 'Comunicação / internet'], ['Saúde e primeiros socorros', 'Saúde e primeiros socorros'],
];

// EDA_FAMILIA_RESERVA_V1: relação do acompanhante com o titular da reserva.
export const RELACOES_PARTICIPANTE: readonly OpcaoEDA[] = [
  ['conjuge', 'Cônjuge'], ['filho', 'Filho(a)'], ['pai_mae', 'Pai / mãe'], ['irmao', 'Irmão(ã)'],
  ['parente', 'Outro parente'], ['amigo', 'Amigo(a)'], ['colega', 'Colega'], ['outro', 'Outro'],
];

export type PoliticaCriancasEDA = {
  crianca_idade_max: number | null;
  crianca_percentual: number | null;
  colo_idade_max: number | null;
};
export type FaixaEtariaEDA = 'adulto' | 'crianca' | 'colo';

// Idade completa na data da viagem (quem faz aniversário na viagem já conta a nova idade).
export function idadeNaDataEDA(nascimento: string | null | undefined, data: string | null | undefined): number | null {
  if (!nascimento || !data) return null;
  const [an, mn, dn] = nascimento.slice(0, 10).split('-').map(Number);
  const [ad, md, dd] = data.slice(0, 10).split('-').map(Number);
  if (!an || !ad) return null;
  return ad - an - (md < mn || (md === mn && dd < dn) ? 1 : 0);
}

export function faixaEtariaEDA(idade: number | null, p: PoliticaCriancasEDA | null): FaixaEtariaEDA | null {
  if (idade === null) return null;
  if (p?.colo_idade_max != null && idade <= p.colo_idade_max) return 'colo';
  if (p?.crianca_idade_max != null && idade <= p.crianca_idade_max) return 'crianca';
  return 'adulto';
}

// Total sugerido: adultos pagam cheio, crianças o percentual, colo não paga.
export function valorPorFaixasEDA(preco: number, adultos: number, criancas: number, p: PoliticaCriancasEDA | null) {
  const pct = p?.crianca_percentual != null ? Number(p.crianca_percentual) / 100 : 1;
  return Math.round((preco * adultos + preco * pct * criancas) * 100) / 100;
}

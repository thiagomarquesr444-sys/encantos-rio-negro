// EDA_MATERIAIS_CATALOGO_V1: catálogo padrão de materiais das demandas.
// O operador escolhe pelo nome (sem digitar do zero), a unidade já vem certa
// e a quantidade é sugerida por pessoas × dias. "Outro" continua possível.
import { novoItemDemanda, type CategoriaItem, type ItemDemanda } from '@/lib/itensDemanda';

export type MaterialPadrao = {
  nome: string;
  categoria: CategoriaItem;
  unidade: string;
  /** Consumo por pessoa por dia (na unidade do item). */
  porPessoaDia?: number;
  /** Quantidade por pessoa para a viagem toda. */
  porPessoa?: number;
  /** Soma fixa (ex.: coletes da tripulação). */
  extra?: number;
  /** Quantidade fixa por viagem. */
  fixo?: number;
  apelidos?: string[];
};

export const MATERIAIS_PADRAO: MaterialPadrao[] = [
  // Alimentação
  { nome: 'Arroz', categoria: 'alimentacao', unidade: 'kg', porPessoaDia: 0.15 },
  { nome: 'Feijão', categoria: 'alimentacao', unidade: 'kg', porPessoaDia: 0.08, apelidos: ['feijao'] },
  { nome: 'Farinha de mandioca', categoria: 'alimentacao', unidade: 'kg', porPessoaDia: 0.05, apelidos: ['farinha'] },
  { nome: 'Macarrão', categoria: 'alimentacao', unidade: 'kg', porPessoaDia: 0.05, apelidos: ['macarrao'] },
  { nome: 'Frango', categoria: 'alimentacao', unidade: 'kg', porPessoaDia: 0.2 },
  { nome: 'Carne bovina', categoria: 'alimentacao', unidade: 'kg', porPessoaDia: 0.2, apelidos: ['carne', 'picanha'] },
  { nome: 'Peixe', categoria: 'alimentacao', unidade: 'kg', porPessoaDia: 0.25 },
  { nome: 'Calabresa defumada', categoria: 'alimentacao', unidade: 'kg', porPessoaDia: 0.04, apelidos: ['calabresa'] },
  { nome: 'Linguiça de frango', categoria: 'alimentacao', unidade: 'kg', porPessoaDia: 0.04, apelidos: ['linguica', 'linguiça'] },
  { nome: 'Ovos', categoria: 'alimentacao', unidade: 'dúzia', porPessoaDia: 0.1, apelidos: ['ovo'] },
  { nome: 'Pão', categoria: 'alimentacao', unidade: 'unidade', porPessoaDia: 2, apelidos: ['pao'] },
  { nome: 'Café', categoria: 'alimentacao', unidade: 'kg', porPessoaDia: 0.02, apelidos: ['cafe'] },
  { nome: 'Açúcar', categoria: 'alimentacao', unidade: 'kg', porPessoaDia: 0.04, apelidos: ['acucar'] },
  { nome: 'Leite', categoria: 'alimentacao', unidade: 'litro', porPessoaDia: 0.2 },
  { nome: 'Óleo de cozinha', categoria: 'alimentacao', unidade: 'litro', porPessoaDia: 0.03, apelidos: ['oleo'] },
  { nome: 'Sal', categoria: 'alimentacao', unidade: 'kg', fixo: 1 },
  { nome: 'Temperos', categoria: 'alimentacao', unidade: 'pacote', fixo: 2, apelidos: ['tempero'] },
  { nome: 'Frutas', categoria: 'alimentacao', unidade: 'kg', porPessoaDia: 0.3, apelidos: ['fruta'] },
  { nome: 'Legumes e verduras', categoria: 'alimentacao', unidade: 'kg', porPessoaDia: 0.2, apelidos: ['legumes', 'verduras'] },
  { nome: 'Biscoitos', categoria: 'alimentacao', unidade: 'pacote', porPessoaDia: 0.3, apelidos: ['biscoito', 'bolacha'] },
  // Bebidas e gelo
  { nome: 'Água mineral', categoria: 'bebidas', unidade: 'litro', porPessoaDia: 3, apelidos: ['agua'] },
  { nome: 'Gelo', categoria: 'bebidas', unidade: 'kg', porPessoaDia: 2 },
  { nome: 'Refrigerante', categoria: 'bebidas', unidade: 'litro', porPessoaDia: 0.5 },
  { nome: 'Suco', categoria: 'bebidas', unidade: 'litro', porPessoaDia: 0.3 },
  { nome: 'Cerveja', categoria: 'bebidas', unidade: 'lata', porPessoaDia: 3 },
  // Combustível
  { nome: 'Gasolina', categoria: 'combustivel', unidade: 'litro' },
  { nome: 'Diesel', categoria: 'combustivel', unidade: 'litro', apelidos: ['oleo diesel'] },
  { nome: 'Óleo 2 tempos', categoria: 'combustivel', unidade: 'litro', apelidos: ['oleo dois tempos', 'oleo 2t'] },
  { nome: 'Gás de cozinha', categoria: 'combustivel', unidade: 'unidade', fixo: 1, apelidos: ['gas', 'botijao', 'botijão'] },
  // Limpeza e higiene
  { nome: 'Papel higiênico', categoria: 'limpeza', unidade: 'rolo', porPessoaDia: 0.25, apelidos: ['papel higienico'] },
  { nome: 'Papel toalha', categoria: 'limpeza', unidade: 'rolo', fixo: 4 },
  { nome: 'Detergente', categoria: 'limpeza', unidade: 'unidade', fixo: 2 },
  { nome: 'Sabão em pó', categoria: 'limpeza', unidade: 'kg', fixo: 1, apelidos: ['sabao'] },
  { nome: 'Sabonete', categoria: 'limpeza', unidade: 'unidade', porPessoa: 1 },
  { nome: 'Saco de lixo', categoria: 'limpeza', unidade: 'pacote', fixo: 2, apelidos: ['sacos de lixo'] },
  { nome: 'Água sanitária', categoria: 'limpeza', unidade: 'litro', fixo: 2, apelidos: ['agua sanitaria'] },
  // Equipamentos e materiais
  { nome: 'Rede de dormir', categoria: 'equipamentos', unidade: 'unidade', porPessoa: 1, apelidos: ['rede'] },
  { nome: 'Mosquiteiro', categoria: 'equipamentos', unidade: 'unidade', porPessoa: 1 },
  { nome: 'Caixa térmica', categoria: 'equipamentos', unidade: 'unidade', fixo: 2, apelidos: ['caixa termica', 'isopor'] },
  { nome: 'Lanterna', categoria: 'equipamentos', unidade: 'unidade', fixo: 2 },
  { nome: 'Lona', categoria: 'equipamentos', unidade: 'unidade', fixo: 1 },
  { nome: 'Corda', categoria: 'equipamentos', unidade: 'metro', fixo: 20 },
  { nome: 'Repelente', categoria: 'equipamentos', unidade: 'unidade', porPessoa: 0.5 },
  { nome: 'Protetor solar', categoria: 'equipamentos', unidade: 'unidade', porPessoa: 0.5 },
  // Saúde e segurança
  { nome: 'Colete salva-vidas', categoria: 'saude', unidade: 'unidade', porPessoa: 1, extra: 2, apelidos: ['colete', 'coletes'] },
  { nome: 'Kit de primeiros socorros', categoria: 'saude', unidade: 'kit', fixo: 1, apelidos: ['primeiros socorros'] },
  { nome: 'Extintor de incêndio', categoria: 'saude', unidade: 'unidade', fixo: 1, apelidos: ['extintor'] },
  { nome: 'Rádio comunicador', categoria: 'saude', unidade: 'unidade', fixo: 2, apelidos: ['radio'] },
];

export const KITS_MATERIAIS: { id: string; nome: string; itens: string[] }[] = [
  { id: 'rancho', nome: 'Rancho', itens: ['Arroz', 'Feijão', 'Farinha de mandioca', 'Macarrão', 'Frango', 'Peixe', 'Ovos', 'Pão', 'Café', 'Açúcar', 'Óleo de cozinha', 'Sal', 'Temperos', 'Frutas', 'Legumes e verduras'] },
  { id: 'bebidas', nome: 'Bebidas e gelo', itens: ['Água mineral', 'Gelo', 'Refrigerante', 'Suco'] },
  { id: 'seguranca', nome: 'Segurança', itens: ['Colete salva-vidas', 'Kit de primeiros socorros', 'Extintor de incêndio', 'Lanterna', 'Rádio comunicador'] },
  { id: 'limpeza', nome: 'Limpeza', itens: ['Papel higiênico', 'Papel toalha', 'Detergente', 'Sabonete', 'Saco de lixo'] },
];

/** Minúsculas, sem acento e sem espaços repetidos — para comparar nomes. */
export function chaveMaterial(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Acha o material do catálogo pelo nome ou apelido (aceita "ARROZ", "arroz ", "Heineken"). */
export function acharMaterial(texto: string): MaterialPadrao | null {
  const k = chaveMaterial(texto);
  if (!k) return null;
  return MATERIAIS_PADRAO.find((m) => chaveMaterial(m.nome) === k || (m.apelidos ?? []).some((a) => chaveMaterial(a) === k)) ?? null;
}

/** Sugestões enquanto o operador digita (até 6). */
export function buscarMateriais(texto: string): MaterialPadrao[] {
  const k = chaveMaterial(texto);
  if (!k) return [];
  const comeca = MATERIAIS_PADRAO.filter((m) => chaveMaterial(m.nome).startsWith(k));
  const contem = MATERIAIS_PADRAO.filter((m) => !comeca.includes(m)
    && (chaveMaterial(m.nome).includes(k) || (m.apelidos ?? []).some((a) => chaveMaterial(a).includes(k))));
  return [...comeca, ...contem].slice(0, 6);
}

/** Quantidade sugerida (com 10% de margem no que é consumo); null quando não há base. */
export function quantidadeSugerida(m: MaterialPadrao, pessoas?: number, dias?: number): number | null {
  if (m.fixo != null) return m.fixo;
  if (!pessoas || pessoas <= 0) return null;
  if (m.porPessoa != null) return Math.ceil(m.porPessoa * pessoas) + (m.extra ?? 0);
  if (m.porPessoaDia != null) {
    if (!dias || dias <= 0) return null;
    const bruto = m.porPessoaDia * pessoas * dias * 1.1;
    return bruto < 10 ? Math.ceil(bruto * 2) / 2 : Math.ceil(bruto);
  }
  return null;
}

export function itemDoCatalogo(m: MaterialPadrao, pessoas?: number, dias?: number): ItemDemanda {
  const q = quantidadeSugerida(m, pessoas, dias);
  return { ...novoItemDemanda(), descricao: m.nome, categoria: m.categoria, unidade: m.unidade, quantidade: String(q ?? 1) };
}

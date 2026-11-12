// EDA_ANALISE_MATERIAIS_V1
// Análise da saída para sugerir materiais com o cuidado de um profissional da área:
// quantidade (pessoas × dias + margem), unidade da lista padronizada, preço de referência,
// categoria e as precauções de saúde que vêm das fichas (sempre em contagens, sem nomes).
// A plataforma orienta; não substitui médico, nutricionista nem socorrista.
import { novoItemDemanda, type CategoriaItem, type ItemDemanda } from '@/lib/itensDemanda';

export type NecessidadesAnaliseEDA = {
  passeio: string; dias: number; pessoas: number; fichas: number;
  restricoes: Record<string, number>;
  alergias_tipo?: Record<string, number>;
  condicoes_tipo?: Record<string, number>;
  alergias_graves: number; alergia_alimentar: number;
  nao_nadam: number; natacao_nao_informada: number; medicacao: number;
  sem_contato_emergencia?: number;
};

export type AlertaAnaliseEDA = { nivel: 'grave' | 'atencao' | 'pendente' | 'info'; titulo: string; texto: string };
export type AnaliseMateriaisEDA = { itens: ItemDemanda[]; alertas: AlertaAnaliseEDA[]; totalEstimado: number };

// Preços de referência (R$, Barcelos/AM). São estimativas para planejar: o operador ajusta ao preço do dia.
const PRECO = {
  agua_galao_5l: 14, refeicao: 28, refeicao_especial: 32, gelo_saco: 10, kit_socorros: 160,
  repelente: 25, protetor: 45, saco_lixo_rolo: 15, capa_chuva: 12, lanterna: 35,
  luvas_nitrilicas: 45, lanche_glicemia: 8, caixa_termica: 60, saco_estanque: 40,
};

const MARGEM = 0.1; // 10% de reserva: atraso de retorno, perda, calor.
const sobe = (n: number) => Math.max(1, Math.ceil(n));

const ROTULO_RESTRICAO: Record<string, [string, string]> = {
  lactose: ['sem lactose', 'Use leite e derivados zero lactose e confira os rótulos (pães e biscoitos costumam ter leite).'],
  gluten: ['sem glúten', 'Separe utensílios, tábuas e óleo: contaminação cruzada já causa reação. Farinha de mandioca é sem glúten, mas confira a embalagem.'],
  frutos_do_mar: ['sem frutos do mar', 'Prepare à parte e não reaproveite óleo de fritura usado com camarão ou similares.'],
  peixe: ['sem peixe', 'Em viagem de pesca o peixe domina o cardápio: garanta outra proteína e não frite no mesmo óleo.'],
  amendoim_castanhas: ['sem amendoim/castanhas', 'A castanha-do-pará é comum em farofas, doces e lanches da região: retire e avise a cozinha.'],
  ovo: ['sem ovo', 'Atenção a massas, bolos, maionese e empanados.'],
  soja: ['sem soja', 'Confira temperos prontos e óleos compostos.'],
  vegetariano: ['vegetarianas', 'Garanta proteína (feijão, ovo, queijo) em todas as refeições, não só acompanhamentos.'],
  vegano: ['veganas', 'Sem nenhum produto de origem animal: proteína de feijão, grão-de-bico ou soja em todas as refeições.'],
  sem_carne_porco: ['sem carne de porco', 'Atenção a linguiça, bacon e feijão temperado com carne de porco.'],
  outra: ['com restrição especial', 'Confirme com o participante o que ele não pode comer antes de comprar.'],
};

function item(descricao: string, categoria: CategoriaItem, quantidade: number, unidade: string, preco: number | null, observacoes: string): ItemDemanda {
  return {
    ...novoItemDemanda(),
    descricao: descricao.slice(0, 200), categoria,
    quantidade: String(quantidade), unidade,
    preco_unitario_estimado: preco === null ? '' : preco.toFixed(2),
    observacoes: observacoes.slice(0, 2000),
  };
}

export function analisarMateriaisEDA(n: NecessidadesAnaliseEDA): AnaliseMateriaisEDA {
  const P = Math.max(n.pessoas, 0);
  const D = Math.max(n.dias, 1);
  const itens: ItemDemanda[] = [];
  const alertas: AlertaAnaliseEDA[] = [];
  if (P === 0) return { itens, alertas: [{ nivel: 'pendente', titulo: 'Sem pessoas na saída', texto: 'Ainda não há reservas nesta saída. A análise aparece quando houver participantes.' }], totalEstimado: 0 };

  const refeicoesDia = D === 1 ? 2 : 3; // bate-volta: almoço + lanche; viagem: café, almoço e jantar.
  const fichasFaltando = Math.max(P - n.fichas, 0);
  const cond = n.condicoes_tipo ?? {};
  const alerg = n.alergias_tipo ?? {};

  // --- Base de qualquer saída ---
  const litros = P * D * 3 * (1 + MARGEM);
  itens.push(item('Água potável (galão 5 L)', 'bebidas', sobe(litros / 5), 'galão', PRECO.agua_galao_5l,
    `3 L por pessoa/dia no calor do rio (${P} × ${D} dia(s)) + 10% de reserva. Nunca usar água do rio para beber ou preparar alimentos sem tratamento.`));

  const especiais = Object.values(n.restricoes).reduce((t, q) => t + q, 0);
  const comuns = Math.max(P - especiais, 0);
  if (comuns > 0) itens.push(item(`Refeições (${refeicoesDia} por dia)`, 'alimentacao', sobe(comuns * D * refeicoesDia * (1 + MARGEM)), 'unidade', PRECO.refeicao,
    `${comuns} pessoa(s) × ${D} dia(s) × ${refeicoesDia} refeições + 10%. Alimento perecível sempre em caixa térmica com gelo.`));

  itens.push(item('Gelo (saco 5 kg)', 'bebidas', sobe((P / 4) * D), 'saco', PRECO.gelo_saco,
    'Um saco por 4 pessoas por dia, para conservar água e alimentos. Gelo de beber separado do gelo de conservação.'));

  itens.push(item('Colete salva-vidas', n.nao_nadam > 0 ? 'saude' : 'equipamentos', P + Math.max(1, Math.ceil(P * MARGEM)), 'unidade', null,
    `Um por pessoa + reserva. Conferir tamanho (infantil para crianças), fivelas e validade.${n.nao_nadam ? ` ${n.nao_nadam} pessoa(s) não sabem nadar: colete vestido o tempo todo na embarcação e na água.` : ''}`));

  itens.push(item('Kit de primeiros socorros revisado', 'saude', 1, 'kit', PRECO.kit_socorros,
    'Curativos, gaze, esparadrapo, soro fisiológico, luvas, tesoura, manta térmica e termômetro. Medicamentos só os prescritos aos participantes: a operadora não deve medicar ninguém.'));

  itens.push(item('Repelente', 'saude', sobe((P / 2) * Math.ceil(D / 3)), 'unidade', PRECO.repelente,
    'Um frasco para cada 2 pessoas a cada 3 dias. Reaplicar ao entardecer, quando há mais mosquitos.'));

  itens.push(item('Protetor solar FPS 50', 'saude', sobe((P / 3) * Math.ceil(D / 3)), 'unidade', PRECO.protetor,
    'O reflexo da água aumenta a exposição. Reaplicar a cada 2 horas e após o banho de rio.'));

  itens.push(item('Capa de chuva', 'equipamentos', P, 'unidade', PRECO.capa_chuva, 'Uma por pessoa: chuva forte e repentina é comum no rio.'));
  itens.push(item('Sacos de lixo', 'limpeza', Math.max(1, Math.ceil(D / 3)), 'rolo', PRECO.saco_lixo_rolo, 'Todo o lixo volta com o grupo: nada fica no rio ou na praia.'));
  if (D > 1) itens.push(item('Lanterna com pilhas extras', 'equipamentos', sobe(P / 4), 'unidade', PRECO.lanterna, 'Uma para cada 4 pessoas em viagem com pernoite.'));

  // --- Restrições alimentares ---
  for (const [codigo, qtd] of Object.entries(n.restricoes)) {
    const [rotulo, cuidado] = ROTULO_RESTRICAO[codigo] ?? ROTULO_RESTRICAO.outra;
    itens.push(item(`Refeições ${rotulo} — ${qtd} pessoa(s)`, 'saude', sobe(qtd * D * refeicoesDia * (1 + MARGEM)), 'unidade', PRECO.refeicao_especial,
      `${qtd} × ${D} dia(s) × ${refeicoesDia} + 10%. ${cuidado} Identifique as marmitas com etiqueta.`));
  }

  // --- Alergias ---
  if (n.alergias_graves > 0) {
    itens.push(item('Plano de emergência para alergia grave', 'saude', 1, 'serviço', null,
      'Confirmar com cada pessoa se leva medicação de emergência prescrita (ex.: autoinjetor) na bagagem de mão; combinar com o guia o que fazer, a UBS/hospital mais próximo e o tempo de deslocamento.'));
    alertas.push({ nivel: 'grave', titulo: `${n.alergias_graves} pessoa(s) com alergia grave`,
      texto: 'Antes de comprar, leia o resumo de segurança da saída. A medicação de emergência deve ficar com a pessoa ou com o guia, nunca no porão.' });
  }
  if ((alerg.alimento ?? 0) > 0) {
    itens.push(item('Conferência de cardápio — alergia alimentar', 'saude', 1, 'serviço', null,
      `${alerg.alimento} pessoa(s) com alergia alimentar. Quem cozinha deve saber o alimento exato e evitar contaminação cruzada.`));
  }
  if ((alerg.latex ?? 0) > 0) {
    itens.push(item('Luvas nitrílicas (sem látex)', 'saude', 1, 'caixa', PRECO.luvas_nitrilicas, 'Há alergia a látex: troque todas as luvas do kit por nitrílicas.'));
  }
  if ((alerg.medicamento ?? 0) > 0) {
    alertas.push({ nivel: 'atencao', titulo: `${alerg.medicamento} pessoa(s) com alergia a medicamento`, texto: 'Anote no kit de primeiros socorros qual remédio não pode ser usado nessas pessoas.' });
  }
  if ((alerg.picada_inseto ?? 0) > 0) {
    alertas.push({ nivel: 'atencao', titulo: `${alerg.picada_inseto} pessoa(s) com alergia a picada de inseto`, texto: 'Reforce repelente e mosquiteiro no pernoite e evite trilhas com marimbondos sem avisar o guia.' });
  }

  // --- Condições de saúde ---
  if ((cond.diabetes ?? 0) > 0) {
    itens.push(item('Lanches extras e açúcar rápido (diabetes)', 'saude', sobe(cond.diabetes * D * 2), 'unidade', PRECO.lanche_glicemia,
      'Refeições em horário regular e lanche de reserva para hipoglicemia. Se usar insulina, ela precisa de refrigeração: caixa térmica própria.'));
    itens.push(item('Caixa térmica pequena para medicamentos', 'saude', 1, 'unidade', PRECO.caixa_termica, 'Separada dos alimentos, com gelo em saco fechado para o remédio não molhar.'));
  }
  const cardiacos = (cond.cardiaca ?? 0) + (cond.hipertensao ?? 0);
  if (cardiacos > 0) alertas.push({ nivel: 'atencao', titulo: `${cardiacos} pessoa(s) com condição cardíaca ou pressão alta`, texto: 'Evite esforço intenso e sol prolongado, mantenha hidratação e confirme que cada um leva a própria medicação.' });
  if ((cond.respiratoria ?? 0) > 0) alertas.push({ nivel: 'atencao', titulo: `${cond.respiratoria} pessoa(s) com asma ou condição respiratória`, texto: 'Confirme que levam a bombinha na bagagem de mão e mantenha fumaça de fogueira e motor longe delas.' });
  if ((cond.epilepsia ?? 0) > 0) alertas.push({ nivel: 'grave', titulo: `${cond.epilepsia} pessoa(s) com epilepsia`, texto: 'Nunca sozinhas na água, colete sempre, e o guia deve saber agir numa crise (proteger a cabeça, não colocar nada na boca, cronometrar).' });
  if ((cond.gestante ?? 0) > 0) alertas.push({ nivel: 'atencao', titulo: `${cond.gestante} gestante(s)`, texto: 'Confirme liberação médica para a viagem, evite trechos de banzeiro e batidas fortes da lancha, e reforce água e sombra.' });
  if ((cond.mobilidade_reduzida ?? 0) > 0) {
    itens.push(item('Apoio para embarque e desembarque', 'saude', 1, 'serviço', null, `${cond.mobilidade_reduzida} pessoa(s) com mobilidade reduzida: prancha firme, duas pessoas de apoio e lugar fixo na embarcação.`));
  }

  // --- Medicação e água ---
  if (n.medicacao > 0) {
    itens.push(item('Saco estanque para medicamentos', 'saude', sobe(n.medicacao / 2), 'unidade', PRECO.saco_estanque,
      `${n.medicacao} pessoa(s) com medicação contínua: cada uma leva o remédio para todos os dias + 2 de reserva, na bagagem de mão e protegido da água.`));
  }
  if (n.nao_nadam > 0) alertas.push({ nivel: 'grave', titulo: `${n.nao_nadam} pessoa(s) não sabem nadar`, texto: 'Colete vestido o tempo todo, banho de rio só em área rasa e com alguém de olho.' });
  if (n.natacao_nao_informada > 0) alertas.push({ nivel: 'pendente', titulo: `${n.natacao_nao_informada} ficha(s) sem informar se sabe nadar`, texto: 'Pergunte antes da saída: muda o cuidado na água.' });
  if ((n.sem_contato_emergencia ?? 0) > 0) alertas.push({ nivel: 'pendente', titulo: `${n.sem_contato_emergencia} ficha(s) sem contato de emergência`, texto: 'Peça um telefone de familiar antes de embarcar.' });
  if (fichasFaltando > 0) alertas.push({ nivel: 'pendente', titulo: `${fichasFaltando} pessoa(s) ainda sem ficha de saúde`, texto: 'A análise está incompleta: envie o convite da ficha pela reserva e refaça a sugestão depois.' });

  alertas.push({ nivel: 'info', titulo: 'Orientação, não diagnóstico', texto: 'A EDA organiza o que as fichas informam. Em qualquer dúvida de saúde, quem decide é um profissional (médico, enfermeiro, nutricionista ou socorrista).' });

  const totalEstimado = itens.reduce((t, i) => t + (Number(i.preco_unitario_estimado) || 0) * (Number(i.quantidade) || 0), 0);
  return { itens, alertas, totalEstimado };
}

// EDA_MANUAL_V1: o manual da plataforma que a EDA estuda (Claude escreve, Thiago revisa).
// GERAL entra em toda conversa; cada página entra quando a pessoa está nela.
// Regra de ouro: o que está no sistema a EDA NÃO pergunta — consulta e usa.

export const MANUAL_GERAL = `MANUAL DA PLATAFORMA (como a operação funciona):
- PASSEIO é o produto (preço por pessoa/grupo, crianças pagam um %, colo grátis). SAÍDA é a data marcada de um passeio (ida, volta, horário, vagas). Toda reserva deve nascer de uma SAÍDA aberta.
- RESERVA = cliente + saída + pessoas (+ guia e barco). Status: Pendente → Confirmada (ou Cancelada). O valor sai do preço do passeio.
- VOUCHER nasce sozinho da reserva Confirmada e paga (não existe voucher avulso).
- DEMANDA = suprimentos de uma saída (rancho, combustível, gelo…), com quantidade e unidade; rascunho → aberta → encerrada.
- PEDIDO DA IARA = visitante do portal que pediu informação/reserva (com consentimento). Vira reserva quando a pessoa mandar: CRIAR reservas com pedido=PV#.
- FROTA e GUIAS são escalados nas reservas; barco tem capacidade e não pode estar em manutenção.
- FINANCEIRO: lançamentos a receber/pagar; baixa quando o dinheiro entra/sai.
FLUXO CERTO DE UMA VENDA: pedido da Iara (ou contato direto) → reserva na saída → guia e barco → confirmação → voucher → demanda da saída → embarque → avaliação.
REGRA DE OURO: datas, horários, preços, vagas, capacidade e nomes ESTÃO NOS DADOS — use, não pergunte. Pergunte só o que só a pessoa sabe (ex.: nome do cliente novo, quantas pessoas) ou quando há duas opções reais (duas saídas abertas).`;

export const MANUAL_PAGINA: Record<string, string> = {
  painel: 'Painel: resumo do dia, pendências, pedidos da Iara e saídas. Daqui você executa qualquer coisa das outras páginas.',
  reservas: 'Reservas: criar (cliente + passeio/saída + pessoas), confirmar, cancelar, trocar data/saída, guia, barco e pessoas. Pedidos do portal ficam em Reservas › Pedidos. Ficha do cliente (documento, contato, saúde) é preenchida na própria reserva — fora da EDA (LGPD).',
  passeios: 'Passeios: produto (preço, situação, vagas, publicado no portal) e SAÍDAS do passeio (criar saída com data, horário e vagas; fechar/cancelar saída).',
  demandas: 'Demandas: suprimentos ligados à saída; categoria (alimentacao, bebidas, combustivel…), quantidade e unidade; abrir quando for comprar, encerrar depois da viagem.',
  financeiro: 'Financeiro: lançar receita/despesa, dar baixa no que foi pago/recebido, acompanhar atrasados.',
  embarcacoes: 'Frota: cadastro do barco, capacidade, status (Disponível, Reservada, Manutenção, Inativa) e agenda dos próximos dias.',
  guias: 'Guias: equipe, idiomas e status (Ativo, Em Tour, Férias, Inativo); escala pela reserva.',
  hospedagens: 'Hospedagens: pousadas/lodges/barcos-hotel com diária e situação.',
  parceiros: 'Parceiros: agências e indicadores com comissão (%).',
  vouchers: 'Embarques do dia: vouchers emitidos pela reserva; check-in no embarque. A EDA só pode cancelar voucher.',
  clientes: 'Clientes: carteira da operadora. Dados pessoais só no formulário (LGPD); a EDA cria o cliente só com o nome quando faz uma reserva.',
  relatorios: 'Relatórios: números do mês, comparações e PDFs.',
};

export function manualPara(pagina: string): string {
  return `${MANUAL_GERAL}\nNESTA PÁGINA: ${MANUAL_PAGINA[pagina] ?? MANUAL_PAGINA.painel}`;
}

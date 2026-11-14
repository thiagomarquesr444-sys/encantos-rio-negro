// EDA_EMPRESA_V1: dados oficiais da empresa, usados em atendimento,
// privacidade, termos, reembolso e rodapé. Alterar só aqui.

export const EMPRESA_EDA = {
  nomeFantasia: 'Encantos da Amazônia AI',
  marca: 'Encantos da Amazônia',
  sigla: 'EDA',
  cnpj: '70.085.271/0001-72',
  email: 'contato.encantosrionegro@gmail.com',
  regiao: 'Amazonas, Brasil',
} as const;

export const IDENTIFICACAO_EDA = `${EMPRESA_EDA.nomeFantasia} — CNPJ ${EMPRESA_EDA.cnpj}`;

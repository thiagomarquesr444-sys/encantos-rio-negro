import type { Metadata } from 'next';

import PaginaInstitucionalERN, {
  EMAIL_ATENDIMENTO_ERN,
  LinkInstitucionalERN,
  SecaoInstitucionalERN,
} from '@/app/components/PaginaInstitucionalERN';

export const metadata: Metadata = {
  title: 'Cancelamento e reembolso',
  description:
    'Informações sobre cancelamento de assinaturas e solicitações de reembolso na Encantos Rio Negro.',
  robots: {
    index: false,
    follow: true,
  },
};

const secoes = [
  {
    titulo: '1. A que esta política se refere',
    paragrafos: [
      'Esta página trata principalmente das assinaturas da plataforma ERN Gestão. Uma reserva turística é uma contratação distinta e deve identificar seu fornecedor e suas condições.',
      'Versão inicial de 21 de outubro de 2026, em revisão. Os procedimentos operacionais de reembolso e confirmação de atendimento ainda precisam ser validados.',
    ],
  },
  {
    titulo: '2. Cancelamento da renovação',
    paragrafos: [
      'O fluxo atual de cancelamento da assinatura é restrito ao administrador da empresa. Quando a operação é concluída com sucesso, a renovação automática é interrompida e a transição para o plano Grátis fica agendada para a data informada pela plataforma.',
      'Esse fluxo mantém o plano atual até a data registrada para o encerramento do período contratado. Confira o resultado apresentado na tela.',
      'Se ocorrer erro ou a confirmação não aparecer, entre em contato. Não considere concluído um cancelamento apenas por clicar no botão.',
    ],
  },
  {
    titulo: '3. Cancelamento não é reembolso',
    paragrafos: [
      'O endpoint atual de cancelamento não executa devolução automática de valores. Solicitações de reembolso são recebidas pelo atendimento e exigem análise e processamento próprios.',
      'Essa diferença técnica não elimina direitos legais de devolução, correção de cobrança ou reparação.',
    ],
  },
  {
    titulo: '4. Direito de arrependimento',
    paragrafos: [
      'Nas relações de consumo abrangidas pelo artigo 49 do Código de Defesa do Consumidor, a contratação fora do estabelecimento permite desistência em sete dias, contados da assinatura ou do recebimento do produto ou serviço, conforme o caso.',
      'Quando aplicável, o exercício desse direito implica devolução dos valores pagos, nos termos legais. O uso inicial do serviço não será tratado nesta política como renúncia automática ao direito.',
    ],
  },
  {
    titulo: '5. Cobranças incorretas e falhas',
    paragrafos: [
      'Comunique cobranças duplicadas, valores divergentes, pagamentos não reconhecidos ou problemas na prestação do serviço.',
      'A análise de um pedido não fica limitada ao prazo de arrependimento quando existir outro fundamento legal ou contratual para a solicitação.',
      'Esta versão não estabelece multa, retenção percentual ou proibição genérica de reembolso.',
    ],
  },
  {
    titulo: '6. Como solicitar atendimento',
    paragrafos: [
      'Envie uma mensagem ao contato da ERN com o e-mail da conta, a descrição do pedido e, se disponível, o identificador da cobrança ou assinatura.',
      'Não envie senha, código de autenticação ou dados completos do cartão. O pedido pode exigir verificação proporcional de identidade e conferência da transação.',
      'O prazo e o modo de processamento devem ser informados no atendimento, observados os deveres legais. Prazos bancários ou de apresentação do crédito não justificam atraso indevido na providência de restituição.',
    ],
  },
  {
    titulo: '7. Reservas e serviços turísticos',
    paragrafos: [
      'Para passeios, hospedagens, transporte e demais serviços turísticos, consulte também a oferta e o contrato do fornecedor identificado na contratação.',
      'Uma regra de cancelamento do fornecedor não pode afastar direitos legalmente assegurados. A responsabilidade da ERN depende de sua participação efetiva na oferta e na contratação.',
      'Se não conseguir identificar o responsável pelo serviço anunciado, informe o endereço da publicação ao atendimento da ERN.',
    ],
  },
  {
    titulo: '8. Conta e dados pessoais',
    paragrafos: [
      'Cancelar a renovação, pedir reembolso e solicitar exclusão de dados são procedimentos diferentes. Se desejar mais de uma providência, indique isso na mensagem.',
      'A exclusão de dados observa as hipóteses legais de conservação e não é executada automaticamente pelo cancelamento da assinatura.',
    ],
  },
];

export default function ReembolsoPage() {
  return (
    <PaginaInstitucionalERN
      titulo="Cancelamento e reembolso"
      descricao="Entenda a diferença entre cancelar a renovação, solicitar reembolso e cancelar um serviço turístico."
    >
      {secoes.map((secao) => (
        <SecaoInstitucionalERN
          key={secao.titulo}
          titulo={secao.titulo}
        >
          {secao.paragrafos.map((paragrafo) => (
            <p key={paragrafo}>{paragrafo}</p>
          ))}
        </SecaoInstitucionalERN>
      ))}

      <SecaoInstitucionalERN titulo="Enviar solicitação">
        <LinkInstitucionalERN
          href={`mailto:${EMAIL_ATENDIMENTO_ERN}?subject=${encodeURIComponent(
            'ERN — Cancelamento ou solicitação de reembolso',
          )}`}
        >
          Solicitar cancelamento ou reembolso por e-mail
        </LinkInstitucionalERN>

        <p>
          O link abre seu aplicativo de e-mail. A mensagem somente
          será enviada quando você concluir o envio nesse aplicativo.
        </p>

        <LinkInstitucionalERN href="/contato">
          Ver todos os canais de atendimento
        </LinkInstitucionalERN>
      </SecaoInstitucionalERN>
    </PaginaInstitucionalERN>
  );
}
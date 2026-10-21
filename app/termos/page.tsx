import type { Metadata } from 'next';

import PaginaInstitucionalERN, {
  LinkInstitucionalERN,
  SecaoInstitucionalERN,
} from '@/app/components/PaginaInstitucionalERN';

export const metadata: Metadata = {
  title: 'Termos de Serviço',
  description:
    'Informações sobre o uso do portal, dos espaços profissionais e da plataforma de gestão Encantos Rio Negro.',
  robots: {
    index: false,
    follow: true,
  },
};

const secoes = [
  {
    titulo: '1. Responsável pelo projeto',
    paragrafos: [
      'O projeto Encantos Rio Negro é conduzido por Thiago Rodrigues Marques, em Barcelos, Amazonas, Brasil. A pessoa jurídica do projeto ainda não foi constituída.',
      'O canal de atendimento é contato.encantosrionegro@gmail.com.',
    ],
  },
  {
    titulo: '2. Serviços e funcionalidades',
    paragrafos: [
      'A ERN reúne um portal público sobre o Rio Negro, perfis e publicações profissionais e ferramentas de gestão para empresas usuárias.',
      'Funcionalidades identificadas como prévia, em preparação ou em desenvolvimento não devem ser consideradas disponíveis para contratação. O concierge e sua estrutura de agentes ainda estão em preparação.',
      'O uso da plataforma não garante vendas, reservas, renda, aprovação cadastral ou resultados comerciais.',
    ],
  },
  {
    titulo: '3. Contas e permissões',
    paragrafos: [
      'Cada usuário deve utilizar informações corretas e proteger suas credenciais. Não compartilhe senhas ou códigos de autenticação.',
      'O acesso depende do vínculo e das permissões da conta. Um cadastro profissional independente não concede acesso aos dados ou à gestão de uma operadora.',
      'A administração de uma empresa deve conceder acesso apenas às pessoas autorizadas e revisar os vínculos de sua equipe.',
    ],
  },
  {
    titulo: '4. Conteúdos publicados',
    paragrafos: [
      'Quem publica deve apresentar informações verdadeiras e possuir os direitos e as autorizações necessários sobre o conteúdo e os dados pessoais utilizados.',
      'Não publique avaliações inventadas, qualificações não comprovadas, documentos de clientes ou conteúdo enganoso.',
      'O envio de uma publicação não transfere automaticamente sua propriedade intelectual à ERN. A apresentação de uma imagem no portal também não concede ao visitante autorização para reutilizá-la.',
      'Problemas com publicações podem ser comunicados pelo atendimento, com indicação da página e do motivo da solicitação.',
    ],
  },
  {
    titulo: '5. Serviços turísticos',
    paragrafos: [
      'Consultar uma publicação ou entrar em contato com um profissional não confirma, por si só, uma reserva.',
      'Antes de contratar um serviço turístico, confira quem é o fornecedor, o preço total, as datas, o que está incluído, as condições de segurança e as regras de cancelamento.',
      'A assinatura do software de gestão é distinta da contratação de passeios, hospedagens, transporte ou outros serviços turísticos. As responsabilidades de cada participante dependem de sua atuação na contratação e da legislação aplicável.',
    ],
  },
  {
    titulo: '6. Planos e cobrança',
    paragrafos: [
      'Quando houver contratação de assinatura, confira as funcionalidades disponíveis, os limites, o valor total do ciclo e as condições de renovação antes de concluir.',
      'A integração de cobrança utiliza Asaas. A ativação e as alterações do plano dependem da confirmação da operação e dos registros da plataforma.',
      'Recursos anunciados como futuros não integram automaticamente uma assinatura. Divergências na oferta ou cobrança devem ser encaminhadas ao atendimento.',
    ],
  },
  {
    titulo: '7. Uso adequado e segurança',
    paragrafos: [
      'Não tente acessar dados de outras empresas, explorar falhas, contornar permissões ou utilizar a plataforma para fraude, spam ou atividades ilícitas.',
      'Comunique suspeitas de acesso indevido ou falhas pelo canal de atendimento, sem enviar senhas nem expor dados de terceiros.',
      'O projeto está em desenvolvimento e seus controles permanecem sujeitos a revisão. Isso não elimina as responsabilidades legais do responsável pelo serviço.',
    ],
  },
  {
    titulo: '8. Privacidade e direitos',
    paragrafos: [
      'O tratamento de dados pessoais é apresentado na Política de Privacidade. A publicação destes termos não constitui consentimento genérico para publicidade ou tratamento desnecessário de dados.',
      'Nenhuma disposição deste documento afasta direitos assegurados pela legislação aplicável.',
    ],
  },
  {
    titulo: '9. Versão e atualização',
    paragrafos: [
      'Versão inicial de 21 de outubro de 2026, em revisão. A identificação comercial completa e os fluxos de contratação, aceite e atendimento ainda precisam de validação antes da conclusão desta etapa.',
      'Esta página não registra aceite contratual. Sua publicação, isoladamente, não implementa a contratação nem altera contratos anteriores.',
    ],
  },
];

export default function TermosPage() {
  return (
    <PaginaInstitucionalERN
      titulo="Termos de Serviço"
      descricao="Condições e informações sobre o uso do projeto Encantos Rio Negro. Versão inicial em revisão."
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

      <SecaoInstitucionalERN titulo="Documentos e atendimento">
        <div className="flex flex-col items-start gap-2">
          <LinkInstitucionalERN href="/privacidade">
            Política de Privacidade
          </LinkInstitucionalERN>

          <LinkInstitucionalERN href="/reembolso">
            Cancelamento e reembolso
          </LinkInstitucionalERN>

          <LinkInstitucionalERN href="/contato">
            Falar com o atendimento
          </LinkInstitucionalERN>
        </div>
      </SecaoInstitucionalERN>
    </PaginaInstitucionalERN>
  );
}
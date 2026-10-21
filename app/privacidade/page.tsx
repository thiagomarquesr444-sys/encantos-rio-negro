import type { Metadata } from 'next';

import PaginaInstitucionalERN, {
  EMAIL_ATENDIMENTO_ERN,
  LinkInstitucionalERN,
  SecaoInstitucionalERN,
} from '@/app/components/PaginaInstitucionalERN';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description:
    'Informações sobre o tratamento de dados pessoais no projeto Encantos Rio Negro e o canal para exercício de direitos.',
  robots: {
    index: false,
    follow: true,
  },
};

const finalidades = [
  {
    titulo: 'Conta e acesso',
    texto:
      'Identificador da conta, e-mail, nome e vínculos profissionais são utilizados para identificar o usuário e determinar os espaços e permissões de acesso. Se você optar pelo login com Google, a autenticação envolve esse fornecedor.',
  },
  {
    titulo: 'Perfis e publicações',
    texto:
      'Informações profissionais e conteúdos cadastrados podem compor perfis e publicações da Rede ERN. Antes de publicar, confira quais informações estarão visíveis. Não inclua dados de terceiros sem uma justificativa adequada.',
  },
  {
    titulo: 'Gestão das operadoras',
    texto:
      'As empresas usuárias podem cadastrar informações de clientes, reservas, serviços e contatos em seus espaços operacionais. O tratamento desses dados depende da atividade realizada e das instruções e responsabilidades de cada empresa.',
  },
  {
    titulo: 'Assinaturas da plataforma',
    texto:
      'O checkout utiliza dados cadastrais da empresa para a contratação. Ao criar um cliente no Asaas, a integração encaminha nome, CPF/CNPJ e, quando preenchidos, e-mail e telefone. Identificadores de assinatura, cobrança, valor e situação de pagamento também são registrados pela ERN.',
  },
  {
    titulo: 'Atendimento',
    texto:
      'Quando você envia uma mensagem, o endereço de e-mail, o conteúdo e os anexos enviados são utilizados para analisar e responder à solicitação. O atendimento utiliza Gmail.',
  },
];

export default function PrivacidadePage() {
  return (
    <PaginaInstitucionalERN
      titulo="Política de Privacidade"
      descricao="Informações sobre dados pessoais no projeto Encantos Rio Negro."
    >
      <SecaoInstitucionalERN titulo="Sobre esta versão">
        <p>
          Atualização: 21 de outubro de 2026.
        </p>

        <p>
          Esta é uma versão inicial em revisão. O inventário de
          integrações, os prazos de retenção e as configurações
          dos fornecedores ainda estão sendo conferidos.
          Esta publicação não representa uma certificação
          de conformidade.
        </p>
      </SecaoInstitucionalERN>

      <SecaoInstitucionalERN titulo="1. Responsável e contato">
        <p>
          O projeto Encantos Rio Negro é atualmente conduzido por
          Thiago Rodrigues Marques, em Barcelos, Amazonas, Brasil,
          e ainda não possui pessoa jurídica constituída.
        </p>

        <p>
          Para assuntos relativos aos dados tratados diretamente
          pela ERN, utilize:
        </p>

        <LinkInstitucionalERN
          href={`mailto:${EMAIL_ATENDIMENTO_ERN}?subject=${encodeURIComponent(
            'ERN — Solicitação sobre dados pessoais',
          )}`}
        >
          {EMAIL_ATENDIMENTO_ERN}
        </LinkInstitucionalERN>

        <p>
          Nos espaços de gestão das operadoras, a empresa que
          cadastra os dados de seus clientes também deve informar
          sua identidade, finalidade e canal de atendimento.
          Os papéis de controlador e operador dependem do
          tratamento efetivamente realizado.
        </p>
      </SecaoInstitucionalERN>

      <SecaoInstitucionalERN titulo="2. Dados e finalidades">
        <div className="space-y-5">
          {finalidades.map((item) => (
            <div key={item.titulo}>
              <h3
                className="font-semibold"
                style={{ color: '#30260D' }}
              >
                {item.titulo}
              </h3>

              <p className="mt-2">{item.texto}</p>
            </div>
          ))}
        </div>
      </SecaoInstitucionalERN>

      <SecaoInstitucionalERN titulo="3. Bases legais e necessidade">
        <p>
          Conforme a finalidade, o tratamento pode ser necessário
          à execução de contrato ou de procedimentos solicitados
          pelo titular, ao cumprimento de obrigação legal ou ao
          exercício de direitos. Quando o consentimento for a base
          adequada, ele deve ser específico e revogável.
        </p>

        <p>
          A leitura desta política não significa consentimento
          genérico para publicidade, compartilhamento irrestrito
          ou coleta de dados desnecessários.
        </p>
      </SecaoInstitucionalERN>

      <SecaoInstitucionalERN titulo="4. Serviços utilizados">
        <p>
          A estrutura do projeto utiliza Supabase para autenticação
          e armazenamento de dados, Vercel para hospedagem e Asaas
          na integração de assinaturas. Google participa quando
          você utiliza o login com Google ou envia mensagens
          ao atendimento pelo Gmail.
        </p>

        <p>
          O cadastro de uma integração no código não significa
          que ela esteja ativa para todos os usuários. O uso
          depende da funcionalidade utilizada e da configuração
          do ambiente.
        </p>

        <p>
          Regiões de armazenamento, suboperadores e mecanismos
          aplicáveis a eventuais transferências internacionais
          estão em revisão e serão detalhados após a conferência
          dos serviços contratados.
        </p>
      </SecaoInstitucionalERN>

      <SecaoInstitucionalERN titulo="5. Cookies e armazenamento local">
        <p>
          O acesso autenticado utiliza mecanismos de sessão.
          A interface também utiliza armazenamento local para
          recuperar a preferência visual do usuário.
        </p>

        <p>
          O inventário completo de cookies, recursos externos
          e requisições do navegador ainda está em revisão.
          Por isso, esta versão não afirma ausência total
          de rastreamento.
        </p>

        <p>
          Limpar cookies ou dados do site pode encerrar sua sessão
          e remover preferências. Isso não exclui automaticamente
          os registros mantidos no banco de dados.
        </p>
      </SecaoInstitucionalERN>

      <SecaoInstitucionalERN titulo="6. Publicações e terceiros">
        <p>
          Conteúdos publicados no portal e na Rede ERN podem ser
          acessados por visitantes e compartilhados fora da
          plataforma. Evite publicar documentos, dados de clientes,
          endereços particulares ou informações sensíveis.
        </p>

        <p>
          Links externos levam a serviços com suas próprias
          condições e práticas de privacidade.
        </p>
      </SecaoInstitucionalERN>

      <SecaoInstitucionalERN titulo="7. Conservação e exclusão">
        <p>
          Os critérios de conservação consideram a finalidade,
          a relação contratual, obrigações legais e o exercício
          de direitos. Os prazos específicos, incluindo registros
          técnicos e cópias de segurança, estão em revisão.
        </p>

        <p>
          Solicitações de exclusão serão analisadas conforme
          os dados envolvidos e as hipóteses legais de conservação.
          Cancelar uma assinatura não equivale a excluir a conta.
        </p>
      </SecaoInstitucionalERN>

      <SecaoInstitucionalERN titulo="8. Seus direitos">
        <p>
          Você pode solicitar confirmação e acesso, correção,
          informações sobre compartilhamento, anonimização,
          bloqueio ou eliminação nas hipóteses aplicáveis,
          portabilidade conforme regulamentação e revogação
          de consentimento.
        </p>

        <p>
          Poderá ser necessária uma verificação proporcional
          de identidade. Pedidos relacionados a dados cadastrados
          por uma operadora podem exigir a participação dela.
        </p>

        <LinkInstitucionalERN href="/contato">
          Acessar o canal de atendimento
        </LinkInstitucionalERN>
      </SecaoInstitucionalERN>

      <SecaoInstitucionalERN titulo="9. Segurança e informações sensíveis">
        <p>
          Não compartilhe senhas ou códigos de autenticação.
          Comunique suspeitas de acesso indevido ao atendimento.
          Os controles técnicos e as permissões da plataforma
          permanecem sujeitos à revisão de segurança.
        </p>

        <p>
          Não insira informações de saúde, origem étnica,
          biometria ou dados de crianças e adolescentes em
          campos de texto livre sem necessidade e análise
          específica do tratamento.
        </p>
      </SecaoInstitucionalERN>

      <SecaoInstitucionalERN titulo="10. Atualizações">
        <p>
          Este documento será atualizado para acompanhar
          as funcionalidades e a formalização do projeto.
          Mudanças de finalidade e tratamentos que dependam
          de consentimento exigem avaliação própria; atualizar
          o texto não substitui essa avaliação.
        </p>

        <LinkInstitucionalERN href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm">
          Consultar a Lei Geral de Proteção de Dados Pessoais
        </LinkInstitucionalERN>
      </SecaoInstitucionalERN>
    </PaginaInstitucionalERN>
  );
}
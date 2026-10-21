import type { Metadata } from 'next';

import PaginaInstitucionalERN, {
  EMAIL_ATENDIMENTO_ERN,
  LinkInstitucionalERN,
  SecaoInstitucionalERN,
} from '@/app/components/PaginaInstitucionalERN';

export const metadata: Metadata = {
  title: 'Contato e atendimento',
  description:
    'Atendimento da Encantos Rio Negro para suporte, privacidade, assinaturas e solicitações de cancelamento ou reembolso.',
};

const assuntos = [
  {
    titulo: 'Suporte e informações',
    descricao:
      'Dúvidas sobre o portal, sua conta ou o funcionamento da plataforma.',
    assunto: 'ERN — Suporte e informações',
    acao: 'Solicitar atendimento',
  },
  {
    titulo: 'Privacidade e dados pessoais',
    descricao:
      'Solicitações de acesso, correção, exclusão ou informações sobre o tratamento dos seus dados pessoais.',
    assunto: 'ERN — Solicitação sobre dados pessoais',
    acao: 'Falar sobre privacidade',
  },
  {
    titulo: 'Assinaturas e cancelamento',
    descricao:
      'Dúvidas sobre cobranças, renovação, cancelamento da assinatura ou solicitação de reembolso.',
    assunto: 'ERN — Assinatura, cancelamento ou reembolso',
    acao: 'Falar sobre assinatura',
  },
  {
    titulo: 'Conteúdo e acessibilidade',
    descricao:
      'Comunique conteúdo incorreto, problemas com publicações ou dificuldades para utilizar a plataforma.',
    assunto: 'ERN — Conteúdo ou acessibilidade',
    acao: 'Comunicar um problema',
  },
];

export default function ContatoPage() {
  return (
    <PaginaInstitucionalERN
      titulo="Contato e atendimento"
      descricao="Canal de atendimento do projeto Encantos Rio Negro."
    >
      <SecaoInstitucionalERN titulo="Fale com a ERN">
        <p>
          Responsável pelo projeto: Thiago Rodrigues Marques.
          Localidade: Barcelos, Amazonas, Brasil.
        </p>

        <LinkInstitucionalERN
          href={`mailto:${EMAIL_ATENDIMENTO_ERN}`}
        >
          {EMAIL_ATENDIMENTO_ERN}
        </LinkInstitucionalERN>

        <p>
          Os links de atendimento abrem seu aplicativo de e-mail.
          Se ele não estiver configurado, copie o endereço e envie
          a mensagem pelo serviço de e-mail que você utiliza.
        </p>
      </SecaoInstitucionalERN>

      <div className="grid gap-5 sm:grid-cols-2">
        {assuntos.map((item) => (
          <SecaoInstitucionalERN
            key={item.assunto}
            titulo={item.titulo}
          >
            <p>{item.descricao}</p>

            <LinkInstitucionalERN
              href={`mailto:${EMAIL_ATENDIMENTO_ERN}?subject=${encodeURIComponent(
                item.assunto,
              )}`}
            >
              {item.acao}
            </LinkInstitucionalERN>
          </SecaoInstitucionalERN>
        ))}
      </div>

      <SecaoInstitucionalERN titulo="O que informar">
        <p>
          Descreva sua solicitação e, se ela envolver uma conta,
          informe o e-mail utilizado no cadastro. Para cobranças,
          inclua o identificador da cobrança ou da assinatura,
          caso esteja disponível.
        </p>

        <p>
          Não envie senhas, códigos de autenticação, dados completos
          de cartão ou documentos pessoais no primeiro contato.
          Se for necessário verificar sua identidade, orientaremos
          como proceder.
        </p>

        <p>
          Esta página não envia mensagens automaticamente.
          O envio acontece quando você envia o e-mail pelo
          seu serviço de correio eletrônico.
        </p>
      </SecaoInstitucionalERN>

      <SecaoInstitucionalERN titulo="Como seus dados são utilizados">
        <p>
          Consulte as informações sobre contas, atendimento,
          publicações e dados utilizados pela plataforma.
        </p>

        <LinkInstitucionalERN href="/privacidade">
          Ler a Política de Privacidade
        </LinkInstitucionalERN>
      </SecaoInstitucionalERN>
    </PaginaInstitucionalERN>
  );
}
import Link from 'next/link';

type Props = {
  modo: 'login' | 'cadastro' | 'recuperacao';
  googleDisponivel: boolean;
};

const FOCO =
  'focus-visible:outline-2 focus-visible:outline-offset-4 ' +
  'focus-visible:outline-[#F4C77E]';

export default function AvisoPrivacidadeAcessoERN({
  modo,
  googleDisponivel,
}: Props) {
  return (
    <details className="ern-privacidade-acesso">
      <summary>Sua conta e seus dados</summary>

      <div
        className="mt-3 space-y-3 text-sm leading-6"
        style={{ color: '#C8D6CD' }}
      >
        {modo === 'cadastro' ? (
          <p>
            O cadastro por e-mail utiliza seu endereço e uma
            senha para criar as credenciais de acesso.
            Use um endereço ao qual você tenha acesso e uma
            senha exclusiva para esta conta.
          </p>
        ) : modo === 'recuperacao' ? (
          <p>
            Seu e-mail é utilizado para solicitar as instruções
            de recuperação de acesso. Não envie sua senha
            ou códigos de autenticação ao atendimento.
          </p>
        ) : (
          <p>
            Suas credenciais são utilizadas para autenticar
            a conta. O acesso aos espaços profissionais
            depende dos vínculos e das permissões
            registrados na ERN.
          </p>
        )}

        {googleDisponivel && (
          <p>
            Ao escolher Google, você será direcionado ao
            fornecedor para autenticação. Esse fluxo também
            pode criar uma nova conta. Confira as informações
            apresentadas pelo Google antes de continuar.
          </p>
        )}

        <p>
          Consulte os documentos e o canal de atendimento abaixo.
          A exibição destes links não registra aceite dos termos
          nem autorização para publicidade.
        </p>
      </div>

      <nav
        aria-label="Documentos e atendimento do acesso"
        className="mt-3 flex flex-wrap gap-x-3 gap-y-1"
      >
        {[
          {
            href: '/privacidade',
            titulo: 'Privacidade',
          },
          {
            href: '/termos',
            titulo: 'Termos de Serviço',
          },
          {
            href: '/reembolso',
            titulo: 'Cancelamento e reembolso',
          },
          {
            href: '/contato',
            titulo: 'Atendimento',
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex min-h-12 items-center rounded-lg px-1 text-sm font-semibold underline underline-offset-4 ${FOCO}`}
            style={{ color: '#F4C77E' }}
          >
            {item.titulo}
            <span className="sr-only">
              {' '}(abre em nova aba)
            </span>
          </Link>
        ))}
      </nav>
    </details>
  );
}

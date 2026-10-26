'use client';

export default function BotaoCopaPescaERN({
  idioma = 'PT',
}: {
  idioma?: string;
}) {
  const textosCopaERN = {
    PT: {
      acao: 'Acessar site oficial',
      acessibilidade:
        'Acessar o site oficial da Copa Brasil de Pesca Esportiva, abre em nova aba',
    },
    EN: {
      acao: 'Visit official website',
      acessibilidade:
        'Visit the official Copa Brasil de Pesca Esportiva website, opens in a new tab',
    },
    ES: {
      acao: 'Visitar sitio oficial',
      acessibilidade:
        'Visitar el sitio oficial de la Copa Brasil de Pesca Esportiva, se abre en una pestaña nueva',
    },
  };

  const tCopaERN = textosCopaERN[
    idioma === 'EN' ? 'EN' : idioma === 'ES' ? 'ES' : 'PT'
  ];
  return (
    <a
      href="https://copabrasildepescaesportiva.com.br/"
      target="_blank"
      rel="noopener noreferrer"
      className="ern-copa-oficial"
      aria-label={tCopaERN.acessibilidade}
    >
      <span className="copa-escudo" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/integracoes/copa-brasil-pesca-oficial.png"
          alt=""
          width={64}
          height={64}
          loading="lazy"
          decoding="async"
        />
      </span>

      <span className="copa-texto">
        <span className="copa-nome">
          Copa Brasil
          <br />
          de Pesca Esportiva
        </span>
        <span className="copa-acao">{tCopaERN.acao}</span>
      </span>

      <span className="copa-seta" aria-hidden="true">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 17 17 7M7 7h10v10" />
        </svg>
      </span>

      <style jsx>{`
        .ern-copa-oficial {
          position: relative;
          isolation: isolate;
          display: inline-flex;
          align-items: center;
          gap: 14px;
          box-sizing: border-box;
          width: 100%;
          max-width: 390px;
          min-height: 96px;
          margin-top: 22px;
          padding: 14px 16px;
          overflow: hidden;
          border: 1px solid #b7aa69;
          border-radius: 16px;
          background: linear-gradient(125deg, #102b1c, #1c452d);
          color: #fff8df;
          font-family: var(--font-work-sans), sans-serif;
          text-decoration: none;
          box-shadow: 0 5px 16px rgb(0 0 0 / 12%);
          transition:
            transform 160ms ease,
            border-color 160ms ease,
            box-shadow 160ms ease;
        }

        .ern-copa-oficial::before {
          position: absolute;
          inset: 0 0 auto;
          height: 3px;
          background: linear-gradient(
            90deg,
            #299447 0%,
            #299447 42%,
            #f2d64f 42%,
            #f2d64f 73%,
            #2856a5 73%
          );
          content: '';
        }

        .ern-copa-oficial:hover {
          transform: translateY(-2px);
          border-color: #f2d64f;
          box-shadow: 0 8px 22px rgb(0 0 0 / 20%);
        }

        .ern-copa-oficial:focus-visible {
          outline: 3px solid #f2d64f;
          outline-offset: 4px;
        }

        .copa-escudo {
          display: flex;
          flex: 0 0 64px;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
        }

        .copa-escudo img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .copa-texto {
          display: block;
          flex: 1;
          min-width: 0;
          text-align: left;
        }

        .copa-nome {
          display: block;
          color: #fff8df;
          font-size: 14px;
          font-weight: 750;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .copa-acao {
          display: block;
          margin-top: 5px;
          color: #f2d978;
          font-size: 11px;
          font-weight: 600;
          line-height: 1.5;
        }

        .copa-seta {
          display: flex;
          flex: 0 0 34px;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border: 1px solid rgb(242 214 79 / 35%);
          border-radius: 50%;
          background: rgb(255 255 255 / 5%);
          color: #f2d978;
        }

        @media (max-width: 379px) {
          .ern-copa-oficial {
            gap: 10px;
            padding: 13px 12px;
          }

          .copa-escudo {
            flex-basis: 50px;
            width: 50px;
            height: 50px;
          }

          .copa-nome {
            font-size: 12px;
          }

          .copa-seta {
            flex-basis: 30px;
            width: 30px;
            height: 30px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ern-copa-oficial {
            transition: none;
          }

          .ern-copa-oficial:hover {
            transform: none;
          }
        }
      `}</style>
    </a>
  );
}
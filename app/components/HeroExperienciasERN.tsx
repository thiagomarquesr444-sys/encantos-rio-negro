'use client';

import Image from 'next/image';
import Link from 'next/link';

type Props = {
  eyebrow: string;
  title: string;
  intro: string;
  explore: string;
  destinations: string;
  imageAlt: string;
};

export default function HeroExperienciasERN({
  eyebrow,
  title,
  intro,
  explore,
  destinations,
  imageAlt,
}: Props) {
  return (
    <section className="hero-experiencias-ern">
      <div className="midia-abertura">
        <Image
          src="/images/experiencias/experiencias-hero-horizontal.png"
          alt={imageAlt}
          fill
          sizes="100vw"
          quality={75}
          priority
          className="imagem-abertura"
        />
      </div>

      <div className="contraste-local" aria-hidden="true" />

      <div className="conteudo-abertura">
        <div className="letreiro">
          <p className="chamada">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="introducao">{intro}</p>

          <div className="botoes">
            <a
              href="#explorar"
              className="ern-portal-cta ern-portal-cta--principal"
            >
              {explore}
            </a>

            <Link
              href="/destinos"
              className="ern-portal-cta ern-portal-cta--secundario"
            >
              {destinations}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .hero-experiencias-ern {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          background: #173033;
          border-bottom: 1px solid #cdba7a;
        }

        .midia-abertura {
          position: absolute;
          inset: 0;
          z-index: 0;
        }

        .midia-abertura :global(.imagem-abertura) {
          object-fit: cover;
          object-position: 65% center;
        }

        .contraste-local {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background: linear-gradient(
            90deg,
            rgb(4 17 19 / 90%) 0%,
            rgb(4 17 19 / 76%) 32%,
            rgb(4 17 19 / 30%) 62%,
            rgb(4 17 19 / 8%) 100%
          );
        }

        .conteudo-abertura {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          box-sizing: border-box;
          width: 100%;
          max-width: 1280px;
          min-height: clamp(560px, 76svh, 760px);
          margin: 0 auto;
          padding: 112px 32px 64px;
        }

        .letreiro {
          width: 52%;
          max-width: 600px;
          min-width: 0;
          color: #fffaf0;
        }

        .chamada {
          margin: 0;
          color: #ffdc93;
          font-family: var(--font-work-sans), sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.17em;
          line-height: 1.8;
          text-transform: uppercase;
        }

        h1 {
          margin: 20px 0 0;
          color: #fffaf0;
          font-family: var(--font-fraunces), serif;
          font-size: clamp(40px, 4.2vw, 64px);
          font-weight: 500;
          line-height: 1.08;
          letter-spacing: -0.035em;
          overflow-wrap: break-word;
          text-shadow: 0 2px 14px rgb(0 0 0 / 25%);
        }

        .introducao {
          max-width: 540px;
          margin: 22px 0 0;
          color: #fffaf0;
          font-family: var(--font-work-sans), sans-serif;
          font-size: 16px;
          line-height: 1.8;
          overflow-wrap: break-word;
        }

        .botoes {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 28px;
        }

        .botoes :global(a) {
          max-width: 100%;
          box-sizing: border-box;
        }

        .botoes :global(a:focus-visible) {
          outline: 3px solid #ffdc93;
          outline-offset: 4px;
        }

        /* ERN_ENTRADA_EXPERIENCIAS_V1 */
        @keyframes ern-experiencias-entrada {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: no-preference) {
          .letreiro > .chamada,
          .letreiro > h1,
          .letreiro > .introducao,
          .letreiro > .botoes {
            animation-name: ern-experiencias-entrada;
            animation-duration: 750ms;
            animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
            animation-iteration-count: 1;
            animation-fill-mode: backwards;
          }

          .letreiro > .chamada {
            animation-delay: 80ms;
          }

          .letreiro > h1 {
            animation-delay: 180ms;
          }

          .letreiro > .introducao {
            animation-delay: 280ms;
          }

          .letreiro > .botoes {
            animation-delay: 380ms;
          }

          .letreiro > .botoes:focus-within {
            animation: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .letreiro > .chamada,
          .letreiro > h1,
          .letreiro > .introducao,
          .letreiro > .botoes {
            animation: none;
          }
        }

        @media (min-width: 768px) and (max-width: 1023px) {
          .conteudo-abertura {
            padding-inline: 24px;
          }

          .letreiro {
            width: 65%;
          }

          h1 {
            font-size: clamp(40px, 5.2vw, 54px);
          }
        }

        @media (max-width: 767px) {
          .hero-experiencias-ern {
            margin: 16px;
            border: 1px solid #cdba7a;
            border-radius: 20px;
            background: #173033;
            box-shadow: 0 8px 24px rgb(0 0 0 / 10%);
          }

          .midia-abertura {
            position: relative;
            inset: auto;
            width: 100%;
            aspect-ratio: 16 / 9;
          }

          .midia-abertura :global(.imagem-abertura) {
            object-fit: cover;
            object-position: 70% center;
          }

          .contraste-local {
            display: none;
          }

          .conteudo-abertura {
            min-height: 0;
            padding: 22px;
            background: #173033;
          }

          .letreiro {
            width: 100%;
            max-width: 600px;
          }

          .chamada {
            font-size: 10px;
            line-height: 1.6;
            letter-spacing: 0.12em;
          }

          h1 {
            margin-top: 14px;
            font-size: clamp(28px, 6.6vw, 38px);
            line-height: 1.12;
            letter-spacing: -0.025em;
          }

          .introducao {
            margin-top: 16px;
            font-size: 14px;
            line-height: 1.7;
          }

          .botoes {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 20px;
          }

          .botoes :global(a.ern-portal-cta) {
            flex: 1 1 180px;
            min-height: 46px;
            padding: 11px 14px;
            font-size: 13px;
            line-height: 1.5;
          }
        }
        @media (max-width: 399px) {
          .conteudo-abertura {
            padding-inline: 16px;
          }
        }
      `}</style>
    </section>
  );
}
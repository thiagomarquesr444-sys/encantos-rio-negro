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
      <Image
        src="/images/experiencias/experiencias-hero-horizontal.png"
        alt={imageAlt}
        fill
        sizes="100vw"
        quality={75}
        priority
        className="imagem-abertura"
      />

      <div className="contraste-local" aria-hidden="true" />

      <div className="conteudo-abertura">
        <div className="letreiro">
          <p className="chamada">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="introducao">{intro}</p>

          <div className="botoes">
            <a href="#explorar" className="ern-portal-cta ern-portal-cta--principal">{explore}</a>
            <Link href="/destinos" className="ern-portal-cta ern-portal-cta--secundario">
              {destinations}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .hero-experiencias-ern {
          position:relative;
          isolation:isolate;
          overflow:hidden;
          min-height:760px;
          min-height:clamp(700px,90svh,940px);
          background:#173033;
          border-bottom:1px solid #cdba7a;
        }
        .hero-experiencias-ern :global(.imagem-abertura) {
          z-index:-2;
          object-fit:cover;
          object-position:center center;
        }
        .contraste-local {
          position:absolute;
          inset:0;
          z-index:-1;
          pointer-events:none;
          background:linear-gradient(
            90deg,
            rgb(4 17 19 / 83%) 0%,
            rgb(4 17 19 / 68%) 28%,
            rgb(4 17 19 / 24%) 46%,
            transparent 62%
          );
        }
        .conteudo-abertura {
          display:flex;
          align-items:center;
          width:100%;
          max-width:1240px;
          min-height:inherit;
          margin:0 auto;
          padding:132px 24px 64px;
        }
        .letreiro {
          width:47%;
          max-width:570px;
          min-width:0;
          color:#fffaf0;
        }
        .chamada {
          margin:0;
          color:#ffdc93;
          font-family:var(--font-work-sans),sans-serif;
          font-size:11px;
          font-weight:700;
          letter-spacing:.17em;
          line-height:1.8;
          text-transform:uppercase;
        }
        h1 {
          margin:22px 0 0;
          color:#fffaf0;
          font-family:var(--font-fraunces),serif;
          font-size:clamp(42px,4.5vw,68px);
          font-weight:500;
          line-height:1.07;
          letter-spacing:-.035em;
          overflow-wrap:anywhere;
          text-shadow:0 2px 14px rgb(0 0 0 / 25%);
        }
        .introducao {
          margin:24px 0 0;
          color:#fffaf0;
          font-family:var(--font-work-sans),sans-serif;
          font-size:16px;
          line-height:1.9;
          overflow-wrap:anywhere;
        }
        .botoes {
          display:flex;
          flex-wrap:wrap;
          gap:12px;
          margin-top:30px;
        }
        .botoes :global(a) {
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:12px;
          min-height:52px;
          padding:12px 20px;
          border-radius:12px;
          font-family:var(--font-work-sans),sans-serif;
          font-size:13px;
          font-weight:700;
          line-height:1.5;
          text-align:center;
          text-decoration:none;
        }
        .botoes :global(a.principal) {
          background:#f4c77e;
          border:1px solid #f4c77e;
          color:#241b08;
        }
        .botoes :global(a.principal:hover) {
          background:#ffdc93;
        }
        .botoes :global(a.secundario) {
          background:#102a2c;
          border:1px solid #e9d7b4;
          color:#fffaf0;
        }
        .botoes :global(a.secundario:hover) {
          background:#1c3a3d;
        }
        .botoes :global(a:focus-visible) {
          outline:3px solid #ffdc93;
          outline-offset:4px;
        }
        @media(prefers-reduced-motion:no-preference) {
          .chamada { animation:ern-entrada .65s ease-out both; }
          h1 { animation:ern-entrada .8s ease-out .1s both; }
          .introducao { animation:ern-entrada .8s ease-out .2s both; }
          .botoes { animation:ern-entrada .8s ease-out .3s both; }
        }
        @keyframes ern-entrada {
          from { opacity:0; transform:translateY(14px); }
          to { opacity:1; transform:translateY(0); }
        }
        @media(max-width:1023px) {
          .letreiro { width:48%; }
          h1 { font-size:clamp(38px,5vw,54px); }
          .introducao { font-size:15px; }
          .botoes { flex-direction:column; align-items:flex-start; }
        }
        @media(max-width:767px) {
          .hero-experiencias-ern {
            min-height:940px;
          }
          .hero-experiencias-ern :global(.imagem-abertura) {
            object-position:72% top;
          }
          .contraste-local {
            background:linear-gradient(
              to top,
              rgb(4 17 19 / 95%) 0%,
              rgb(4 17 19 / 87%) 30%,
              rgb(4 17 19 / 40%) 48%,
              transparent 65%
            );
          }
          .conteudo-abertura {
            align-items:flex-end;
            padding:430px 20px 36px;
          }
          .letreiro { width:100%; max-width:540px; }
          h1 { font-size:clamp(38px,9vw,54px); }
          .introducao { margin-top:18px; line-height:1.8; }
          .botoes { margin-top:24px; }
        }
        @media(max-width:399px) {
          .botoes { align-items:stretch; }
          .botoes :global(a) { width:100%; }
        }
      `}</style>
    </section>
  );
}
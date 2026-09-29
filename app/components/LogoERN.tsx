'use client';

import Image from 'next/image';
import { useState } from 'react';

type LogoERNProps = {
  tamanho?: number;
  prioridade?: boolean;
};

export default function LogoERN({
  tamanho = 48,
  prioridade = false,
}: LogoERNProps) {
  const [carregado, setCarregado] = useState(false);
  const [falhou, setFalhou] = useState(false);

  return (
    <span
      className="logo-ern"
      style={{
        width: tamanho,
        height: tamanho,
      }}
    >
      <span className="logo-corpo">
        <span className="logo-fundo" aria-hidden="true" />

        <span className="logo-frente">
          {!carregado && !falhou && (
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-emerald-950 motion-safe:animate-pulse"
            />
          )}

          {falhou ? (
            <span
              role="img"
              aria-label="Encantos Rio Negro"
              className="flex h-full w-full items-center justify-center bg-[#0A2119] font-serif font-bold text-[#F4C77E]"
              style={{ fontSize: tamanho * 0.24 }}
            >
              ERN
            </span>
          ) : (
            <Image
              src="/logo.png"
              alt="Encantos Rio Negro"
              width={192}
              height={192}
              sizes={`${tamanho}px`}
              priority={prioridade}
              onLoad={() => setCarregado(true)}
              onError={() => setFalhou(true)}
              className={`h-full w-full object-contain transition-opacity duration-300 motion-reduce:transition-none ${
                carregado ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}

          <span className="logo-reflexo" aria-hidden="true" />
        </span>
      </span>

      <style jsx>{`
        .logo-ern {
          position: relative;
          display: inline-block;
          flex-shrink: 0;
          perspective: 650px;
        }

        .logo-corpo {
          position: absolute;
          inset: 0;
          display: block;
          transform-style: preserve-3d;
          transform: rotateX(5deg) rotateY(-9deg);
          transition: transform 350ms ease;
        }

        .logo-fundo {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: linear-gradient(
            135deg,
            #f4c77e,
            #93601f 55%,
            #362610
          );
          transform: translateZ(-5px) translateY(3px);
          box-shadow: 0 8px 18px rgb(0 0 0 / 35%);
        }

        .logo-frente {
          position: absolute;
          inset: 0;
          display: block;
          overflow: hidden;
          border: 1px solid rgb(244 199 126 / 55%);
          border-radius: 50%;
          background: #0d1b16;
          transform: translateZ(2px);
          box-shadow:
            inset 0 0 0 1px rgb(255 255 255 / 10%),
            0 0 18px rgb(227 161 68 / 10%);
        }

        .logo-reflexo {
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          background: linear-gradient(
            135deg,
            rgb(255 255 255 / 18%),
            transparent 45%,
            rgb(0 0 0 / 8%)
          );
        }

        @media (hover: hover) and (prefers-reduced-motion: no-preference) {
          .logo-ern:hover .logo-corpo {
            transform: rotateX(-5deg) rotateY(12deg) translateY(-2px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .logo-corpo {
            transform: none;
            transition: none;
          }
        }
      `}</style>
    </span>
  );
}
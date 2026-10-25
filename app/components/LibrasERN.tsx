'use client';

import { useEffect, useRef, useState } from 'react';

type JanelaLibrasERN = Window & {
  VLibrasWidget?: {
    initBtn?: HTMLElement;
  };
};

let carregamentoERN: Promise<HTMLElement> | null = null;

function carregarLibrasERN(): Promise<HTMLElement> {
  if (carregamentoERN) return carregamentoERN;

  carregamentoERN = new Promise<HTMLElement>((resolve, reject) => {
    let encerrado = false;
    let consulta: ReturnType<typeof setTimeout> | undefined;

    const limite = setTimeout(falhar, 25000);

    function falhar() {
      if (encerrado) return;
      encerrado = true;
      clearTimeout(limite);
      clearTimeout(consulta);
      reject(new Error('Não foi possível iniciar o VLibras.'));
    }

    function encontrarBotao() {
      if (encerrado) return;

      const botao = (window as JanelaLibrasERN).VLibrasWidget?.initBtn;

      if (botao instanceof HTMLElement) {
        encerrado = true;
        clearTimeout(limite);
        clearTimeout(consulta);

        botao.setAttribute(
          'aria-label',
          'Libras: abrir tradutor automático de português para Libras',
        );
        botao.setAttribute('title', 'Libras — tradução automática');

        resolve(botao);
        return;
      }

      consulta = setTimeout(encontrarBotao, 150);
    }

    const existente = document.getElementById('ern-vlibras-script');

    if (existente) {
      encontrarBotao();
      return;
    }

    const script = document.createElement('script');
    script.id = 'ern-vlibras-script';
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
    script.async = true;
    script.onerror = falhar;
    script.onload = encontrarBotao;
    document.body.appendChild(script);
  });

  return carregamentoERN;
}

export default function LibrasERN() {
  const [estado, setEstado] = useState<
    'inicial' | 'carregando' | 'pronto' | 'erro'
  >('inicial');

  const ocupado = useRef(false);
  const montado = useRef(false);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  async function ativar() {
    if (ocupado.current) return;
    ocupado.current = true;
    setEstado('carregando');

    try {
      const botao = await carregarLibrasERN();

      if (!montado.current) return;

      setEstado('pronto');
      botao.click();
    } catch {
      if (montado.current) setEstado('erro');
    } finally {
      ocupado.current = false;
    }
  }

  if (estado === 'pronto') return null;

  return (
    <aside className="ern-libras" aria-label="Tradução em Libras">
      <button
        type="button"
        disabled={estado === 'carregando'}
        aria-describedby="ern-libras-descricao"
        title="Tradução em Libras"
        aria-busy={estado === 'carregando'}
        onClick={() => {
          if (estado === 'erro') {
            window.location.reload();
          } else {
            void ativar();
          }
        }}
      >
        {/* ERN_LIBRAS_ICONE_V1 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/ern-libras-oficial.svg"
          alt=""
          width={48}
          height={48}
          aria-hidden="true"
          style={{ display: 'block', width: 48, height: 48 }}
        />
        <span className="sr-only" aria-live="polite">
          {estado === 'carregando'
            ? 'Carregando tradutor de Libras'
            : estado === 'erro'
              ? 'Tentar novamente: atualizar a página'
              : 'Libras: abrir tradução automática'}
        </span>
      </button>

      <span id="ern-libras-descricao" className="sr-only">
        Ativa o serviço externo VLibras para tradução automática de textos
        em português para a Língua Brasileira de Sinais.
      </span>

      {estado === 'erro' && (
        <p role="alert">
          O tradutor não carregou. Tentar novamente atualizará esta página.
          Salve alterações em andamento antes de tentar.
        </p>
      )}

      <style jsx>{`
        .ern-libras {
          position: fixed;
          right: max(12px, env(safe-area-inset-right));
          top: 50%;
          transform: translateY(-50%);
          z-index: 60;
          font-family: var(--font-work-sans), sans-serif;
        }
        button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px; min-width: 48px; height: 48px;
          min-height: 48px;
          padding: 0;
          border: 0;
          border-radius: 8px;
          background: #247bea;
          color: #fff;
          box-shadow: 0 3px 12px rgb(0 0 0 / 20%);
          font: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }
        button:hover { background: #0c3d8a; }
        button:focus-visible {
          outline: 3px solid #fff;
          outline-offset: 3px;
          box-shadow: 0 0 0 6px #1351b4;
        }
        button:disabled { cursor: wait; }
        p {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: min(240px, 75vw);
          margin: 0;
          padding: 12px;
          border: 1px solid #1351b4;
          border-radius: 10px;
          background: #fff;
          color: #14271e;
          font-size: 13px;
          line-height: 1.5;
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        @media (max-width: 640px) {
          .ern-libras {
            right: max(8px, env(safe-area-inset-right));
          }
          button {
            min-width: 48px;
            padding: 0;
            font-size: 13px;
          }
        }
      `}</style>
    </aside>
  );
}
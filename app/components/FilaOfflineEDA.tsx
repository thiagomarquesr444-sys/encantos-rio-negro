'use client';

import { useEffect, useState } from 'react';

import { avisarEDA } from '@/lib/dialogoEDA';
import { aoMudarFilaEDA, limparCopiasExpiradasEDA, listarFilaEDA, processarFilaEDA } from '@/lib/filaOfflineEDA';

// EDA_FILA_OFFLINE_V1: aviso "X ações aguardando sinal" e envio automático
// quando a internet volta. Só aparece quando há algo guardado.
export default function FilaOfflineEDA() {
  const [total, setTotal] = useState(0);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;

    const contar = async () => {
      const fila = await listarFilaEDA();
      if (ativo) setTotal(fila.length);
    };

    const enviar = async () => {
      if (!navigator.onLine) return;
      const fila = await listarFilaEDA();
      if (!fila.length) return;
      setEnviando(true);
      try {
        const { enviadas, falhas } = await processarFilaEDA();
        if (falhas.length) {
          const linhas = falhas.map(f => `• Voucher ${f.rotulo}: ${f.motivo}`).join('\n');
          void avisarEDA(`Alguns check-ins feitos sem internet não foram aceitos:\n${linhas}\nConfira esses turistas na reserva.`, { titulo: 'Check-ins sem sinal' });
        } else if (enviadas > 0) {
          void avisarEDA(`${enviadas} ${enviadas === 1 ? 'check-in feito sem internet foi enviado' : 'check-ins feitos sem internet foram enviados'}. Tudo certo.`, { titulo: 'Sinal de volta' });
        }
      } finally {
        if (ativo) setEnviando(false);
      }
    };

    void limparCopiasExpiradasEDA();
    void contar();
    void enviar();

    const parar = aoMudarFilaEDA(() => void contar());
    const aoVoltar = () => void enviar();
    window.addEventListener('online', aoVoltar);
    const relogio = window.setInterval(() => {
      if (document.visibilityState === 'visible') void enviar();
    }, 30_000);

    return () => {
      ativo = false;
      parar();
      window.removeEventListener('online', aoVoltar);
      window.clearInterval(relogio);
    };
  }, []);

  if (!total) return null;

  return (
    <aside className="eda-fila-offline" role="status" aria-live="polite">
      <span className="eda-fila-ponto" aria-hidden="true" data-enviando={enviando ? '1' : undefined} />
      {enviando
        ? 'Enviando ações guardadas…'
        : `${total} ${total === 1 ? 'ação aguardando sinal' : 'ações aguardando sinal'}`}
      <style jsx>{`
        .eda-fila-offline {
          position: fixed;
          left: 50%;
          transform: translateX(-50%);
          bottom: calc(14px + env(safe-area-inset-bottom, 0px));
          z-index: 70;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          border-radius: 999px;
          border: 1px solid rgba(227, 181, 103, 0.55);
          background: rgba(12, 20, 17, 0.94);
          color: #f1e6cf;
          font: 600 13px/1.2 var(--font-geist, system-ui), system-ui, sans-serif;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
          max-width: calc(100vw - 24px);
          white-space: nowrap;
        }
        .eda-fila-ponto {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #e3b567;
          flex: none;
        }
        .eda-fila-ponto[data-enviando] {
          animation: eda-fila-pulso 1s ease-in-out infinite;
        }
        @keyframes eda-fila-pulso {
          50% { opacity: 0.3; }
        }
        @media (prefers-reduced-motion: reduce) {
          .eda-fila-ponto[data-enviando] { animation: none; }
        }
      `}</style>
    </aside>
  );
}

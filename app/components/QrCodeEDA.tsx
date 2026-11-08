'use client';

// EDA_PIX_QRCODE_V1: QR Code do Pix para o cliente escanear, com download da
// imagem (para mandar no WhatsApp) e compartilhamento direto no celular.

import { useMemo, useState } from 'react';
import { caminhoSvgQrEDA, gerarQrEDA } from '@/lib/qrcodeEDA';

type Props = { codigo: string; titulo?: string; legenda?: string; arquivo?: string };

export default function QrCodeEDA({ codigo, titulo = 'Pix', legenda, arquivo = 'pix-encantos.png' }: Props) {
  const qr = useMemo(() => { try { return gerarQrEDA(codigo); } catch { return null; } }, [codigo]);
  const [aviso, setAviso] = useState('');
  if (!qr) return null;
  const lado = qr.tamanho + 8;
  const caminho = caminhoSvgQrEDA(qr);

  // PNG com moldura e textos, pronto para enviar ao cliente.
  async function png(): Promise<Blob | null> {
    const escala = 10, topo = 70, base = legenda ? 70 : 40, w = lado * escala + 40;
    const c = document.createElement('canvas');
    c.width = w; c.height = topo + lado * escala + base;
    const g = c.getContext('2d'); if (!g) return null;
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#07110e'; g.font = 'bold 26px system-ui, sans-serif'; g.textAlign = 'center';
    g.fillText(titulo, w / 2, 44);
    g.save(); g.translate(20, topo); g.scale(escala, escala); g.fill(new Path2D(caminho)); g.restore();
    g.font = '15px system-ui, sans-serif'; g.fillStyle = '#4b5b53';
    if (legenda) g.fillText(legenda, w / 2, topo + lado * escala + 30);
    g.fillStyle = '#b5762a'; g.font = 'bold 13px system-ui, sans-serif';
    g.fillText('ENCANTOS DA AMAZÔNIA', w / 2, c.height - 16);
    return new Promise((ok) => c.toBlob((b) => ok(b), 'image/png'));
  }

  async function baixar() {
    const b = await png(); if (!b) return;
    const url = URL.createObjectURL(b);
    const a = document.createElement('a'); a.href = url; a.download = arquivo; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setAviso('Imagem salva. Envie ao cliente junto com o código.');
  }

  async function compartilhar() {
    const b = await png(); if (!b) return;
    const f = new File([b], arquivo, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [f] })) {
      try { await nav.share({ files: [f], title: titulo, text: legenda }); } catch { /* cancelado */ }
    } else { await baixar(); }
  }

  return (
    <div className="qr-eda">
      <svg viewBox={`0 0 ${lado} ${lado}`} width="208" height="208" role="img" aria-label={`QR Code: ${titulo}`} shapeRendering="crispEdges">
        <rect width={lado} height={lado} fill="#fff" />
        <path d={caminho} fill="#07110e" />
      </svg>
      <div className="qr-eda-lado">
        <b>Escaneie para pagar</b>
        <span>No app do banco: Pix → Ler QR Code. O valor já vem preenchido.</span>
        <div className="qr-eda-bts">
          <button type="button" className="eda-pg-bt" onClick={() => void compartilhar()}>Enviar QR Code</button>
          <button type="button" className="eda-pg-bt" onClick={() => void baixar()}>Baixar imagem</button>
        </div>
        {aviso && <small role="status">{aviso}</small>}
      </div>
      <style jsx>{`
        .qr-eda { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; }
        .qr-eda svg { flex: none; border-radius: 12px; border: 1px solid var(--ern-borda); background: #fff; padding: 4px; }
        .qr-eda-lado { display: grid; gap: 6px; min-width: 180px; flex: 1; }
        .qr-eda-lado span, .qr-eda-lado small { font-size: 12px; color: var(--ern-secundario, #b4c8bb); }
        .qr-eda-bts { display: flex; flex-wrap: wrap; gap: 8px; }
      `}</style>
    </div>
  );
}

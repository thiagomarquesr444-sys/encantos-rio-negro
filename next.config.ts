import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite o IP da sua rede local e localhost
  allowedDevOrigins: ["192.168.100.11", "localhost:3000", "127.0.0.1:3000"],

  // EDA_PREVIA_LINKS_V1: fotos da Rede reduzidas pelo otimizador da Vercel
  // (o WhatsApp descarta prévias com imagem pesada).
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "leltgfdonsbmsstyprss.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },

  // EDA_PREVIA_LINKS_V2: título, descrição e foto sempre no <head>, para todos.
  // O WhatsApp de computador nem sempre se identifica como robô.
  htmlLimitedBots: /.*/,

  // ERN_CABECALHOS_SEGURANCA_V1: proteções de navegador em todas as páginas.
  // - frame-ancestors/X-Frame-Options: impede abrir o site dentro de outro site (clickjacking).
  // - nosniff: o navegador não "adivinha" o tipo de arquivo.
  // - Referrer-Policy: não envia o endereço completo da página para outros sites.
  // - Permissions-Policy: câmera desligada; microfone (áudio para a Iara) e localização só no próprio site.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(self), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

// ERN_OCULTAR_INDICADOR_DEV_V1
nextConfig.devIndicators = false;

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite o IP da sua rede local e localhost
  allowedDevOrigins: ["192.168.100.11", "localhost:3000", "127.0.0.1:3000"],

  // EDA_PREVIA_LINKS_V1: robôs de prévia (WhatsApp, redes sociais, buscadores)
  // recebem título, descrição e foto já no <head>, sem esperar a página carregar.
  htmlLimitedBots:
    /WhatsApp|facebookexternalhit|facebookcatalog|Facebot|meta-externalagent|Instagram|Twitterbot|LinkedInBot|Slackbot|Discordbot|TelegramBot|Pinterest|SkypeUriPreview|redditbot|Embedly|vkShare|Googlebot|Google-InspectionTool|bingbot|BingPreview|Applebot|DuckDuckBot|YandexBot|Baiduspider/i,

  // ERN_CABECALHOS_SEGURANCA_V1: proteções de navegador em todas as páginas.
  // - frame-ancestors/X-Frame-Options: impede abrir o site dentro de outro site (clickjacking).
  // - nosniff: o navegador não "adivinha" o tipo de arquivo.
  // - Referrer-Policy: não envia o endereço completo da página para outros sites.
  // - Permissions-Policy: câmera e microfone desligados; localização só no próprio site.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

// ERN_OCULTAR_INDICADOR_DEV_V1
nextConfig.devIndicators = false;

export default nextConfig;

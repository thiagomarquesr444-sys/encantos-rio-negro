import FeedbackERN from '@/app/components/FeedbackERN';
import type { Metadata, Viewport } from 'next';
import type { CSSProperties, ReactNode } from 'react';

import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/work-sans';

import './globals.css';

import { AppProvider } from '@/app/context/AppContext';
import AppShell from '@/app/components/AppShell';
import { LanguageProvider } from '@/app/components/LanguageProvider';
import InstalarERN from '@/app/components/InstalarERN';
import OfflineBaseERN from '@/app/components/OfflineBaseERN';
import LibrasERN from '@/app/components/LibrasERN';

const fontes = {
  '--font-inter': '"Inter Variable"',
  '--font-fraunces': '"Fraunces Variable"',
  '--font-work-sans': '"Work Sans Variable"',
} as CSSProperties;

export const viewport: Viewport = {
  themeColor: '#07110e',
};

export const metadata: Metadata = {
  applicationName: 'Encantos Rio Negro',
  appleWebApp: {
    capable: true,
    title: 'ERN',
    statusBarStyle: 'default',
  },
  icons: {
    apple: [
      {
        url: '/icons/ern-apple-180.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
  title: {
    default: 'Encantos Rio Negro',
    template: '%s • Encantos Rio Negro',
  },
  description:
    'Experiências, hospedagens, roteiros e turismo receptivo no Rio Negro, em Barcelos, Amazonas.',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        style={fontes}
        className="bg-slate-950 text-slate-100 antialiased"
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var r=document.documentElement,p=location.pathname;var publico=/^\\/(destinos|rede)(\\/|$)/.test(p);var gestao=/^\\/(dashboard|financeiro|clientes|reservas|hospedagens|passeios|configuracoes|embarcacoes|guias|parceiros|relatorios|vouchers|documentos|fiscal|planos|demandas)(\\/|$)/.test(p);var c={verde:['#07110e','#edede3'],azul:['#081525','#f0f6fc'],amarelo:['#fff7db','#30260d'],branco:['#f4f6f5','#14271e'],grafite:['#101214','#f0f1f2']};var t='grafite',n=true;try{t=localStorage.getItem('ern-tema-visual-v1')||'grafite';n=localStorage.getItem('ern.portal.tema.v1')!=='claro';}catch(e){}var cor=c.grafite;if(publico){r.setAttribute('data-ern-portal',n?'escuro':'claro');cor=n?c.grafite:c.amarelo;}else if(gestao){cor=Object.prototype.hasOwnProperty.call(c,t)?c[t]:c.grafite;}r.style.setProperty('--ern-fundo-inicial',cor[0]);r.style.setProperty('--ern-texto-inicial',cor[1]);})();`,
          }}
        />
        <OfflineBaseERN />
        <InstalarERN />
        <LibrasERN />
        <LanguageProvider>
          <AppProvider>
            <AppShell>{children}</AppShell>
            <FeedbackERN />
          </AppProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
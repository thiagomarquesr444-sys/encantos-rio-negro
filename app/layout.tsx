import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';

import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/work-sans';

import './globals.css';

import { AppProvider } from '@/app/context/AppContext';
import AppShell from '@/app/components/AppShell';
import { LanguageProvider } from '@/app/components/LanguageProvider';

const fontes = {
  '--font-inter': '"Inter Variable"',
  '--font-fraunces': '"Fraunces Variable"',
  '--font-work-sans': '"Work Sans Variable"',
} as CSSProperties;

export const metadata: Metadata = {
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
            __html: `(function(){try{var t=localStorage.getItem('ern-tema-visual-v1');var c={verde:['#07110e','#edede3'],azul:['#081525','#f0f6fc'],amarelo:['#fff7db','#30260d'],branco:['#f4f6f5','#14271e']};if(c[t]){document.documentElement.style.setProperty('--ern-fundo-inicial',c[t][0]);document.documentElement.style.setProperty('--ern-texto-inicial',c[t][1]);}}catch(e){}})();`,
          }}
        />
        <LanguageProvider>
          <AppProvider>
            <AppShell>{children}</AppShell>
          </AppProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
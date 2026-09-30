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
    <html lang="pt-BR">
      <body
        style={fontes}
        className="bg-slate-950 text-slate-100 antialiased"
      >
        <LanguageProvider>
          <AppProvider>
            <AppShell>{children}</AppShell>
          </AppProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
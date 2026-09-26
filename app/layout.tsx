import type { Metadata } from 'next';
import { Inter, Fraunces, Work_Sans } from 'next/font/google';
import './globals.css';

import { AppProvider } from '@/app/context/AppContext';
import AppShell from '@/app/components/AppShell';
import { LanguageProvider } from '@/app/components/LanguageProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
});

const workSans = Work_Sans({
  subsets: ['latin'],
  variable: '--font-work-sans',
});

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
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body
        className={`${inter.variable} ${fraunces.variable} ${workSans.variable} bg-slate-950 text-slate-100 antialiased`}
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
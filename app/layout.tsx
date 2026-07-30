import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/app/components/Sidebar';
import { AppProvider } from '@/app/context/AppContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Encantos Rio Negro • Sistema de Gestão',
  description: 'Plataforma oficial de gestão e reservas - Encantos do Rio Negro Turismo',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased`}>
        <AppProvider>
          <div className="flex min-h-screen">
            {/* Navegação / Sidebar Lateral */}
            <Sidebar />

            {/* Área Principal de Conteúdo do Aplicativo */}
            <main className="flex-1 bg-slate-900 min-h-screen overflow-y-auto">
              {children}
            </main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}